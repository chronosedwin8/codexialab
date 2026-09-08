import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { crearPago, obtenerPago } from '../lib/mercadopago.js';

const prisma = new PrismaClient();

type Plan = 'prueba' | 'individual' | 'escuela';

const PRECIOS = {
  prueba: () => parseInt(process.env.PRECIO_PRUEBA_COP ?? '10000', 10),
  individual: () => parseInt(process.env.PRECIO_INDIVIDUAL_COP ?? '2000000', 10),
  escuela: () => parseInt(process.env.PRECIO_ESCUELA_COP ?? '12000000', 10),
};

// El precio SIEMPRE se decide en el servidor; nunca se confía en el monto del cliente.
function precioDe(plan: Plan): number {
  return PRECIOS[plan]();
}

// Vigencia de la licencia: Prueba dura 24 horas; el resto, 1 año.
function finVigencia(plan: Plan, desde: Date): Date {
  const d = new Date(desde);
  if (plan === 'prueba') d.setHours(d.getHours() + 24);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
}

// Código de acceso corto y legible: CDX-AB12CD
async function generarCodigoUnico(prefijo: string): Promise<string> {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let intento = 0; intento < 12; intento++) {
    let cuerpo = '';
    for (let i = 0; i < 6; i++) cuerpo += abc[Math.floor(Math.random() * abc.length)];
    const codigo = `${prefijo}-${cuerpo}`;
    const [inst, aula] = await Promise.all([
      prisma.institution.findUnique({ where: { codigoAcceso: codigo } }),
      prisma.classroom.findUnique({ where: { codigoAcceso: codigo } }),
    ]);
    if (!inst && !aula) return codigo;
  }
  throw new Error('No se pudo generar un código de acceso único');
}

const procesarSchema = z.object({
  plan: z.enum(['prueba', 'individual', 'escuela']),
  cuenta: z.object({
    email: z.string().email(),
    password: z.string().min(6),
    nombre: z.string().min(2).max(150),
  }),
  institucion: z
    .object({ nombre: z.string().min(2).max(200), ciudad: z.string().max(100).optional() })
    .optional(),
  pago: z.object({
    token: z.string().min(1),
    payment_method_id: z.string().min(1),
    issuer_id: z.string().optional(),
    installments: z.number().int().positive().default(1),
    identification: z.object({ type: z.string(), number: z.string() }).optional(),
  }),
});

export const pagosRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Config pública para el checkout (Public Key + precios). Sin secretos.
  fastify.get('/config', async (_request, reply) => {
    return reply.send({
      publicKey: process.env.MP_PUBLIC_KEY ?? '',
      precios: { prueba: precioDe('prueba'), individual: precioDe('individual'), escuela: precioDe('escuela') },
      moneda: 'COP',
    });
  });

  // Procesa la compra: crea la cuenta/institución, cobra con Mercado Pago y activa la licencia.
  fastify.post('/procesar', async (request, reply) => {
    const parsed = procesarSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }
    const { plan, cuenta, institucion, pago } = parsed.data;

    if (plan === 'escuela' && !institucion) {
      return reply.code(400).send({ error: 'La licencia Escuela requiere los datos de la institución' });
    }

    const existing = await prisma.user.findUnique({ where: { email: cuenta.email } });
    if (existing) {
      return reply.code(409).send({ error: 'Ese email ya tiene una cuenta en Codexia' });
    }

    const precio = precioDe(plan);
    const passwordHash = await bcrypt.hash(cuenta.password, 10);

    // 1) Creamos cuenta + (institución/aula) + licencia PENDIENTE en una transacción.
    let institucionId: number | null = null;
    let usuarioId: number;
    let licenciaId: number;
    let codigoInstitucion: string | null = null;
    let codigoAula: string | null = null;

    try {
      const creado = await prisma.$transaction(async (tx) => {
        if (plan === 'escuela') {
          const codInst = await generarCodigoUnico('CDX');
          const inst = await tx.institution.create({
            data: { nombre: institucion!.nombre, ciudad: institucion!.ciudad, codigoAcceso: codInst, activa: true },
          });
          institucionId = inst.id;
          codigoInstitucion = codInst;

          const usuario = await tx.user.create({
            data: { email: cuenta.email, passwordHash, nombre: cuenta.nombre, rol: 'docente', institucionId: inst.id },
          });

          const codAula = await generarCodigoUnico('AULA');
          codigoAula = codAula;
          await tx.classroom.create({
            data: {
              nombre: `${institucion!.nombre} — Grupo principal`,
              codigoAcceso: codAula,
              docenteId: usuario.id,
              institucionId: inst.id,
            },
          });

          const lic = await tx.licencia.create({
            data: {
              tipo: 'escuela',
              estado: 'pendiente',
              usuarioId: usuario.id,
              institucionId: inst.id,
              precioCop: precio,
              emailComprador: cuenta.email,
            },
          });
          return { usuarioId: usuario.id, licenciaId: lic.id };
        } else {
          // Individual y Prueba: una sola cuenta de estudiante.
          const usuario = await tx.user.create({
            data: { email: cuenta.email, passwordHash, nombre: cuenta.nombre, rol: 'estudiante' },
          });
          const lic = await tx.licencia.create({
            data: {
              tipo: plan === 'prueba' ? 'prueba' : 'individual',
              estado: 'pendiente',
              usuarioId: usuario.id,
              precioCop: precio,
              emailComprador: cuenta.email,
            },
          });
          return { usuarioId: usuario.id, licenciaId: lic.id };
        }
      });
      usuarioId = creado.usuarioId;
      licenciaId = creado.licenciaId;
    } catch (err) {
      request.log.error({ err }, 'Error creando cuenta/licencia');
      return reply.code(500).send({ error: 'No se pudo crear la cuenta. Intenta de nuevo.' });
    }

    // 2) Cobramos con Mercado Pago.
    let mp;
    try {
      // Mercado Pago solo acepta notification_url pública HTTPS (rechaza localhost).
      // En desarrollo se omite: la respuesta síncrona ya activa la licencia.
      const base = process.env.PUBLIC_BASE_URL ?? '';
      const notifUrl = `${base}/api/pagos/webhook`;
      const notifValida = base.startsWith('https://') && !base.includes('localhost');
      mp = await crearPago(
        {
          transaction_amount: precio,
          token: pago.token,
          description:
            plan === 'escuela'
              ? 'Codexia — Licencia Escuela (anual)'
              : plan === 'prueba'
                ? 'Codexia — Prueba 24 horas'
                : 'Codexia — Licencia Individual (anual)',
          installments: pago.installments,
          payment_method_id: pago.payment_method_id,
          issuer_id: pago.issuer_id,
          external_reference: String(licenciaId),
          notification_url: notifValida ? notifUrl : undefined,
          payer: { email: cuenta.email, identification: pago.identification },
          metadata: { licencia_id: licenciaId, plan },
        },
        `lic-${licenciaId}-${randomUUID()}`,
      );
    } catch (err: any) {
      // Falló la creación del pago (tarjeta inválida, etc.): limpiamos la cuenta para permitir reintento.
      await limpiarCompra(licenciaId, usuarioId, institucionId);
      request.log.warn({ mp: err?.mp }, 'Pago rechazado por MP');
      return reply
        .code(402)
        .send({ error: err?.message ?? 'El pago no pudo procesarse', detalle: err?.mp?.cause ?? null });
    }

    // 3) Guardamos el resultado del pago.
    await prisma.licencia.update({
      where: { id: licenciaId },
      data: { mpPaymentId: String(mp.id), mpStatus: mp.status, mpStatusDetail: mp.status_detail },
    });

    if (mp.status === 'approved') {
      await activarLicencia(licenciaId, usuarioId, plan);
      const user = await prisma.user.findUnique({
        where: { id: usuarioId },
        select: { id: true, email: true, nombre: true, rol: true },
      });
      const token = fastify.jwt.sign({ id: user!.id, email: user!.email, rol: user!.rol, nombre: user!.nombre });
      return reply.send({
        status: 'approved',
        mensaje: '¡Pago aprobado! Tu licencia está activa.',
        token,
        user,
        codigoInstitucion,
        codigoAula,
      });
    }

    if (mp.status === 'in_process' || mp.status === 'pending') {
      return reply.send({
        status: mp.status,
        mensaje: 'Tu pago está en revisión. Activaremos tu cuenta apenas se apruebe.',
      });
    }

    // Rechazado: limpiamos para permitir reintento con el mismo email.
    await limpiarCompra(licenciaId, usuarioId, institucionId);
    return reply.code(402).send({ status: mp.status, error: 'El pago fue rechazado', detalle: mp.status_detail });
  });

  // Webhook de Mercado Pago: confirma pagos que se aprueban de forma asíncrona.
  fastify.post('/webhook', async (request, reply) => {
    const body = request.body as any;
    const query = request.query as any;
    const tipo = body?.type ?? query?.type ?? query?.topic;
    const paymentId = body?.data?.id ?? query?.['data.id'] ?? query?.id;

    if (tipo !== 'payment' || !paymentId) return reply.code(200).send({ ok: true });

    try {
      const mp = await obtenerPago(paymentId);
      const licenciaId = mp.external_reference ? parseInt(mp.external_reference, 10) : null;
      if (licenciaId) {
        const lic = await prisma.licencia.findUnique({ where: { id: licenciaId } });
        if (lic && lic.estado !== 'activa') {
          await prisma.licencia.update({
            where: { id: licenciaId },
            data: { mpPaymentId: String(mp.id), mpStatus: mp.status, mpStatusDetail: mp.status_detail },
          });
          if (mp.status === 'approved' && lic.usuarioId) {
            await activarLicencia(licenciaId, lic.usuarioId, lic.tipo as Plan);
          }
        }
      }
    } catch (err) {
      request.log.error({ err }, 'Error procesando webhook MP');
    }
    return reply.code(200).send({ ok: true });
  });
};

async function activarLicencia(licenciaId: number, usuarioId: number, plan: Plan) {
  const ahora = new Date();
  await prisma.$transaction([
    prisma.licencia.update({
      where: { id: licenciaId },
      data: { estado: 'activa', inicioVigencia: ahora, finVigencia: finVigencia(plan, ahora) },
    }),
    prisma.user.update({ where: { id: usuarioId }, data: { activo: true } }),
  ]);
}

async function limpiarCompra(licenciaId: number, usuarioId: number, institucionId: number | null) {
  try {
    await prisma.licencia.delete({ where: { id: licenciaId } }).catch(() => {});
    if (institucionId) {
      await prisma.classroom.deleteMany({ where: { institucionId } }).catch(() => {});
    }
    await prisma.user.delete({ where: { id: usuarioId } }).catch(() => {});
    if (institucionId) {
      await prisma.institution.delete({ where: { id: institucionId } }).catch(() => {});
    }
  } catch {
    /* limpieza best-effort */
  }
}
