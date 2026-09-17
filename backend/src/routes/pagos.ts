/**
 * Venta de licencias con Mercado Pago (Checkout API / pago transparente).
 *
 * Flujo: el navegador tokeniza la tarjeta con la Public Key; aquí se crea (o se
 * reutiliza) la cuenta, se cobra con el Access Token y se activa la licencia.
 * Los pagos que no se resuelven al instante los confirma el webhook.
 *
 * Tres principios que no se negocian:
 *  - El MONTO lo decide el servidor (tabla `planes`), nunca el navegador.
 *  - El ESTADO de un pago solo se cree a la API de Mercado Pago. Una notificación
 *    dice "mira el pago X"; no dice "el pago X está aprobado".
 *  - Una licencia se activa una sola vez, aunque el checkout y el webhook
 *    lleguen a la vez.
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { crearPago, obtenerPago, verificarFirmaWebhook, type MpPago, type ResultadoFirma } from '../lib/mercadopago.js';
import { finVigencia, obtenerPlan, obtenerPlanes, type ClavePlan } from '../lib/planes.js';
import { invalidarAcceso } from '../lib/accesoLicencia.js';

const prisma = new PrismaClient();

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

/**
 * Mensaje claro para cada motivo de rechazo. Mercado Pago pide mostrarle al
 * comprador QUÉ falló: "El pago fue rechazado" a secas lo deja sin saber si
 * reintentar, llamar a su banco o usar otra tarjeta.
 */
const MOTIVOS_RECHAZO: Record<string, string> = {
  cc_rejected_bad_filled_card_number: 'Revisa el número de la tarjeta.',
  cc_rejected_bad_filled_date: 'Revisa la fecha de vencimiento de la tarjeta.',
  cc_rejected_bad_filled_other: 'Revisa los datos de la tarjeta.',
  cc_rejected_bad_filled_security_code: 'Revisa el código de seguridad (CVV).',
  cc_rejected_blacklist: 'No pudimos procesar el pago con esta tarjeta. Intenta con otra.',
  cc_rejected_call_for_authorize: 'Debes autorizar este pago con tu banco y volver a intentarlo.',
  cc_rejected_card_disabled: 'Tu tarjeta no está activa. Llama a tu banco para activarla.',
  cc_rejected_card_error: 'No pudimos procesar el pago. Intenta con otra tarjeta.',
  cc_rejected_duplicated_payment: 'Ya hiciste un pago por este mismo valor. Si necesitas pagar de nuevo, usa otra tarjeta.',
  cc_rejected_high_risk: 'El pago fue rechazado por seguridad. Intenta con otra tarjeta u otro medio.',
  cc_rejected_insufficient_amount: 'La tarjeta no tiene cupo o fondos suficientes.',
  cc_rejected_invalid_installments: 'La tarjeta no acepta ese número de cuotas.',
  cc_rejected_max_attempts: 'Llegaste al límite de intentos con esta tarjeta. Usa otra.',
  cc_rejected_other_reason: 'Tu banco rechazó el pago. Intenta con otra tarjeta.',
};
function mensajeRechazo(detalle?: string | null): string {
  return (detalle && MOTIVOS_RECHAZO[detalle]) || 'El pago fue rechazado. Verifica los datos o intenta con otra tarjeta.';
}

const DESCRIPCION: Record<ClavePlan, string> = {
  prueba: 'Codexia — Prueba 24 horas',
  individual: 'Codexia — Licencia Individual (anual)',
  escuela: 'Codexia — Licencia Escuela (anual)',
};

/** Deja constancia de lo que pasó con un pago. Nunca tumba la operación. */
async function anotarEvento(datos: {
  origen: 'webhook' | 'checkout';
  resultado: string;
  tipo?: string | null;
  paymentId?: string | number | null;
  licenciaId?: number | null;
  mpStatus?: string | null;
  firma?: ResultadoFirma | null;
  detalle?: string | null;
}): Promise<void> {
  await prisma.pagoEvento
    .create({
      data: {
        origen: datos.origen,
        resultado: datos.resultado.slice(0, 60),
        tipo: datos.tipo?.slice(0, 40) ?? null,
        paymentId: datos.paymentId != null ? String(datos.paymentId).slice(0, 60) : null,
        licenciaId: datos.licenciaId ?? null,
        mpStatus: datos.mpStatus?.slice(0, 40) ?? null,
        firma: datos.firma ?? null,
        detalle: datos.detalle?.slice(0, 300) ?? null,
      },
    })
    .catch(() => { /* el registro nunca debe impedir cobrar */ });
}

const procesarSchema = z.object({
  plan: z.enum(['prueba', 'individual', 'escuela']),
  cuenta: z.object({
    // Mismo criterio que el resto del sistema: sin espacios y en minúsculas.
    email: z.string().transform((e) => e.trim().toLowerCase()).pipe(z.string().email()),
    password: z.string().min(6),
    nombre: z.string().trim().min(2).max(150),
  }),
  institucion: z
    .object({ nombre: z.string().trim().min(2).max(200), ciudad: z.string().trim().max(100).optional() })
    .optional(),
  pago: z.object({
    token: z.string().min(1),
    payment_method_id: z.string().min(1),
    issuer_id: z.string().optional(),
    installments: z.number().int().positive().max(48).default(1),
    identification: z.object({ type: z.string(), number: z.string() }).optional(),
  }),
});

export const pagosRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // ─────────────────────────── Configuración pública ───────────────────────────
  // Public Key + planes con su precio vigente. Sin secretos.
  fastify.get('/config', async (_request, reply) => {
    const planes = await obtenerPlanes();
    return reply.send({
      publicKey: process.env.MP_PUBLIC_KEY ?? '',
      moneda: 'COP',
      precios: Object.fromEntries(planes.map((p) => [p.clave, p.precioCop])),
      planes: planes.map((p) => ({ clave: p.clave, nombre: p.nombre, precio: p.precioCop, disponible: p.activo })),
    });
  });

  // ─────────────────────────────── Checkout ───────────────────────────────
  fastify.post('/procesar', async (request, reply) => {
    const parsed = procesarSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Revisa los datos del formulario', details: parsed.error.flatten() });
    }
    const { plan, cuenta, institucion, pago } = parsed.data;

    const datosPlan = await obtenerPlan(plan);
    if (!datosPlan.activo) {
      return reply.code(409).send({ error: 'Este plan no está disponible en este momento.' });
    }
    if (plan === 'escuela' && !institucion) {
      return reply.code(400).send({ error: 'La licencia Escuela requiere los datos de la institución' });
    }
    const precio = datosPlan.precioCop;

    // ── ¿Cuenta nueva o renovación? ──
    const existente = await prisma.user.findUnique({
      where: { email: cuenta.email },
      select: {
        id: true, passwordHash: true, rol: true, institucionId: true,
        licencias: { select: { id: true, estado: true, mpStatus: true, creadoEn: true } },
      },
    });

    let usuarioId: number;
    let licenciaId: number;
    let institucionId: number | null = null;
    let codigoInstitucion: string | null = null;
    let codigoAula: string | null = null;
    const cuentaNueva = !existente;

    if (existente) {
      // Una cuenta del colegio (sin licencias) no se compra: la administra la institución.
      if (existente.licencias.length === 0) {
        return reply.code(409).send({
          error: 'Ese correo ya tiene una cuenta que administra tu colegio. No necesitas comprar una licencia.',
        });
      }
      // Renovar exige demostrar que la cuenta es tuya.
      if (!(await bcrypt.compare(cuenta.password, existente.passwordHash))) {
        return reply.code(409).send({
          error: 'Ese correo ya tiene una cuenta en Codexia. Para renovar, escribe la contraseña de esa cuenta.',
          codigo: 'cuenta_existente',
        });
      }
      // Un pago en revisión todavía puede aprobarse: cobrar otra vez sería un doble cobro.
      const hace72h = Date.now() - 72 * 3600_000;
      const enRevision = existente.licencias.some(
        (l) => l.estado === 'pendiente' && (l.mpStatus === 'in_process' || l.mpStatus === 'pending') && l.creadoEn.getTime() > hace72h,
      );
      if (enRevision) {
        return reply.code(409).send({
          error: 'Ya tienes un pago en revisión. Espera a que Mercado Pago lo resuelva antes de pagar de nuevo.',
        });
      }
      if (plan === 'escuela' && !(existente.rol === 'docente' && existente.institucionId)) {
        return reply.code(409).send({ error: 'Para comprar la licencia Escuela usa el correo de la cuenta de tu institución.' });
      }

      usuarioId = existente.id;
      institucionId = plan === 'escuela' ? existente.institucionId : null;
      const lic = await prisma.licencia.create({
        data: {
          tipo: plan, estado: 'pendiente', usuarioId, institucionId,
          precioCop: precio, emailComprador: cuenta.email,
        },
      });
      licenciaId = lic.id;
    } else {
      // Cuenta nueva: se crea todo en una transacción, con la licencia PENDIENTE.
      const passwordHash = await bcrypt.hash(cuenta.password, 10);
      try {
        const creado = await prisma.$transaction(async (tx) => {
          if (plan === 'escuela') {
            const codInst = await generarCodigoUnico('CDX');
            const inst = await tx.institution.create({
              data: { nombre: institucion!.nombre, ciudad: institucion!.ciudad, codigoAcceso: codInst, activa: true },
            });
            const usuario = await tx.user.create({
              data: { email: cuenta.email, passwordHash, nombre: cuenta.nombre, rol: 'docente', institucionId: inst.id },
            });
            const codAula = await generarCodigoUnico('AULA');
            await tx.classroom.create({
              data: {
                nombre: `${institucion!.nombre} — Grupo principal`,
                codigoAcceso: codAula, docenteId: usuario.id, institucionId: inst.id,
              },
            });
            const lic = await tx.licencia.create({
              data: {
                tipo: 'escuela', estado: 'pendiente', usuarioId: usuario.id, institucionId: inst.id,
                precioCop: precio, emailComprador: cuenta.email,
              },
            });
            return { usuarioId: usuario.id, licenciaId: lic.id, institucionId: inst.id, codInst, codAula };
          }
          const usuario = await tx.user.create({
            data: { email: cuenta.email, passwordHash, nombre: cuenta.nombre, rol: 'estudiante' },
          });
          const lic = await tx.licencia.create({
            data: {
              tipo: plan, estado: 'pendiente', usuarioId: usuario.id,
              precioCop: precio, emailComprador: cuenta.email,
            },
          });
          return { usuarioId: usuario.id, licenciaId: lic.id, institucionId: null, codInst: null, codAula: null };
        });
        usuarioId = creado.usuarioId;
        licenciaId = creado.licenciaId;
        institucionId = creado.institucionId;
        codigoInstitucion = creado.codInst;
        codigoAula = creado.codAula;
      } catch (err) {
        request.log.error({ err }, 'Error creando cuenta/licencia');
        return reply.code(500).send({ error: 'No se pudo crear la cuenta. Intenta de nuevo.' });
      }
    }

    // ── Cobro ──
    let mp: MpPago;
    try {
      // Mercado Pago solo acepta una notification_url pública HTTPS (rechaza localhost).
      const base = (process.env.PUBLIC_BASE_URL ?? '').replace(/\/+$/, '');
      const notifValida = base.startsWith('https://') && !base.includes('localhost');
      mp = await crearPago(
        {
          transaction_amount: precio,
          token: pago.token,
          description: DESCRIPCION[plan],
          installments: pago.installments,
          payment_method_id: pago.payment_method_id,
          issuer_id: pago.issuer_id,
          external_reference: String(licenciaId),
          notification_url: notifValida ? `${base}/api/pagos/webhook` : undefined,
          statement_descriptor: 'CODEXIA',
          payer: { email: cuenta.email, identification: pago.identification },
          metadata: { licencia_id: licenciaId, plan, cuenta_nueva: cuentaNueva },
        },
        // Estable por licencia: si la misma compra se reintenta, Mercado Pago no cobra dos veces.
        `codexia-licencia-${licenciaId}`,
      );
    } catch (err: any) {
      await descartarCompra({ licenciaId, usuarioId, institucionId, cuentaNueva });
      const detalle = err?.mp?.cause?.[0]?.description ?? err?.message ?? null;
      await anotarEvento({ origen: 'checkout', resultado: 'error_al_cobrar', licenciaId, detalle });
      request.log.warn({ mp: err?.mp, licenciaId }, 'Mercado Pago rechazó la creación del pago');
      return reply.code(402).send({ error: 'No pudimos procesar el pago. Verifica los datos de tu tarjeta e intenta de nuevo.' });
    }

    await prisma.licencia.update({
      where: { id: licenciaId },
      data: { mpPaymentId: String(mp.id), mpStatus: mp.status, mpStatusDetail: mp.status_detail },
    });

    if (mp.status === 'approved') {
      const verificacion = montoCorrecto(mp, precio);
      if (!verificacion.ok) {
        // No debería pasar nunca (el monto lo pusimos nosotros), pero si pasa no se activa a ciegas.
        await anotarEvento({ origen: 'checkout', resultado: 'monto_no_coincide', paymentId: mp.id, licenciaId, mpStatus: mp.status, detalle: verificacion.motivo });
        return reply.code(409).send({ error: 'Recibimos tu pago pero necesita una revisión manual. Te contactaremos.' });
      }
      await activarLicencia(licenciaId);
      await anotarEvento({ origen: 'checkout', resultado: 'activada', paymentId: mp.id, licenciaId, mpStatus: mp.status, detalle: `${plan} ${precio} COP` });

      const user = await prisma.user.findUnique({
        where: { id: usuarioId },
        select: { id: true, email: true, nombre: true, rol: true },
      });
      const token = fastify.jwt.sign({ id: user!.id, email: user!.email, rol: user!.rol, nombre: user!.nombre });
      return reply.send({
        status: 'approved',
        mensaje: cuentaNueva ? '¡Pago aprobado! Tu licencia está activa.' : '¡Pago aprobado! Tu licencia quedó renovada.',
        token, user, codigoInstitucion, codigoAula, renovacion: !cuentaNueva,
      });
    }

    if (mp.status === 'in_process' || mp.status === 'pending') {
      await anotarEvento({ origen: 'checkout', resultado: 'en_revision', paymentId: mp.id, licenciaId, mpStatus: mp.status, detalle: mp.status_detail });
      return reply.send({
        status: mp.status,
        mensaje: 'Tu pago está en revisión en Mercado Pago. Activaremos tu cuenta apenas se apruebe; puedes intentar entrar en unos minutos con tu correo y contraseña.',
      });
    }

    // Rechazado: una cuenta recién creada se borra para que el correo quede libre.
    await descartarCompra({ licenciaId, usuarioId, institucionId, cuentaNueva });
    await anotarEvento({ origen: 'checkout', resultado: 'rechazada', paymentId: mp.id, licenciaId, mpStatus: mp.status, detalle: mp.status_detail });
    return reply.code(402).send({ status: mp.status, error: mensajeRechazo(mp.status_detail), detalle: mp.status_detail });
  });

  // ─────────────────────────────── Webhook ───────────────────────────────
  // En un plugin aparte para darle un lector de cuerpo propio SOLO a esta ruta:
  // Mercado Pago notifica unas veces con JSON, otras con form-urlencoded y otras
  // sin cuerpo (todo va en la query). Con el lector por defecto de Fastify esas
  // llegaban como 415 o 400 ANTES de tocar nuestro código, y Mercado Pago —que
  // solo acepta 2xx— reintentaba y terminaba desactivando las notificaciones.
  await fastify.register(async (webhook) => {
    webhook.removeAllContentTypeParsers();
    webhook.addContentTypeParser('*', { parseAs: 'string' }, (_req, cuerpo, done) => {
      const texto = String(cuerpo ?? '').trim();
      if (!texto) return done(null, {});
      try {
        return done(null, JSON.parse(texto));
      } catch {
        return done(null, Object.fromEntries(new URLSearchParams(texto)));
      }
    });

    const atender = async (request: any, reply: any) => {
      const body = (request.body ?? {}) as Record<string, any>;
      const query = (request.query ?? {}) as Record<string, any>;
      const tipo: string | undefined = body.type ?? body.topic ?? query.type ?? query.topic;
      const paymentId: string | undefined = String(body?.data?.id ?? query['data.id'] ?? query.id ?? body.id ?? '') || undefined;

      const firma = verificarFirmaWebhook({
        firma: request.headers['x-signature'],
        requestId: request.headers['x-request-id'],
        dataId: query['data.id'] ?? body?.data?.id,
        secreto: process.env.MP_WEBHOOK_SECRET,
      });

      // Por qué canal llegó: qué trae la URL y el cuerpo. Sirve para diagnosticar y
      // no incluye la firma ni ningún secreto.
      const canal = [
        `q:${Object.keys(query).sort().join(',') || '-'}`,
        `b:${Object.keys(body).sort().join(',') || '-'}`,
        `sig:${request.headers['x-signature'] ? 'si' : 'no'}`,
        body.action ? `act:${body.action}` : '',
      ].filter(Boolean).join(' ');

      // Siempre 200: Mercado Pago solo necesita saber que la recibimos. Lo que se
      // hace con ella queda en pagos_eventos.
      try {
        await procesarNotificacion({ tipo, paymentId, firma, canal });
      } catch (err) {
        request.log.error({ err, tipo, paymentId }, 'Error procesando notificación de Mercado Pago');
        await anotarEvento({ origen: 'webhook', resultado: 'error', tipo, paymentId, firma, detalle: (err as Error)?.message });
      }
      return reply.code(200).send({ ok: true });
    };

    webhook.post('/webhook', atender);
    // Algunos validadores de URL prueban con GET: que no reciban un 404.
    webhook.get('/webhook', async (_req, reply) => reply.code(200).send({ ok: true, servicio: 'webhook Mercado Pago de Codexia' }));
  });
};

/** El pago cubre exactamente lo que se cobró, en pesos colombianos. */
function montoCorrecto(mp: MpPago, precioEsperado: number): { ok: boolean; motivo?: string } {
  if (mp.currency_id && mp.currency_id !== 'COP') return { ok: false, motivo: `moneda ${mp.currency_id}` };
  if (Math.round(Number(mp.transaction_amount)) < precioEsperado) {
    return { ok: false, motivo: `pagó ${mp.transaction_amount}, se esperaban ${precioEsperado}` };
  }
  return { ok: true };
}

async function procesarNotificacion(n: { tipo?: string; paymentId?: string; firma: ResultadoFirma; canal?: string }) {
  const { tipo, paymentId, firma, canal } = n;
  // Cada evento del webhook lleva al final el canal por el que llegó.
  const conCanal = (detalle?: string | null) =>
    [detalle, canal ? `[${canal}]` : null].filter(Boolean).join(' ').slice(0, 300);

  if (tipo !== 'payment' || !paymentId) {
    await anotarEvento({ origen: 'webhook', resultado: 'ignorado', tipo, paymentId, firma, detalle: conCanal('no es una notificación de pago') });
    return;
  }
  // Una firma inválida NO descarta la notificación. Verificado en producción: por el
  // mismo pago Mercado Pago envía dos avisos (el del panel de Webhooks y el de la
  // notification_url del pago) y solo uno trae una firma que coincide con la clave.
  // Descartar el otro podría perder una aprobación. No hay riesgo en procesarlo: el
  // estado nunca se toma de la notificación, se consulta a la API con nuestro token.

  // La notificación solo dice "mira este pago". Su estado real lo da la API.
  let mp: MpPago;
  try {
    mp = await obtenerPago(paymentId);
  } catch (err: any) {
    await anotarEvento({
      origen: 'webhook', resultado: err?.statusCode === 404 ? 'pago_no_existe' : 'error_consultando',
      tipo, paymentId, firma, detalle: conCanal(err?.message),
    });
    return;
  }

  const licenciaId = mp.external_reference ? parseInt(mp.external_reference, 10) : NaN;
  const lic = Number.isFinite(licenciaId)
    ? await prisma.licencia.findUnique({
        where: { id: licenciaId },
        select: { id: true, estado: true, precioCop: true, usuarioId: true, institucionId: true },
      })
    : null;
  if (!lic) {
    await anotarEvento({ origen: 'webhook', resultado: 'sin_licencia', tipo, paymentId, mpStatus: mp.status, firma, detalle: conCanal(`external_reference=${mp.external_reference ?? '-'}`) });
    return;
  }

  await prisma.licencia.update({
    where: { id: lic.id },
    data: { mpPaymentId: String(mp.id), mpStatus: mp.status, mpStatusDetail: mp.status_detail },
  });

  const base = { origen: 'webhook' as const, tipo, paymentId, licenciaId: lic.id, mpStatus: mp.status, firma };
  const anotar = (e: { resultado: string; detalle?: string | null }): Promise<void> =>
    anotarEvento({ ...base, resultado: e.resultado, detalle: conCanal(e.detalle) });

  switch (mp.status) {
    case 'approved': {
      if (lic.estado === 'activa') {
        await anotar({ resultado: 'ya_activa' });
        return;
      }
      const v = montoCorrecto(mp, lic.precioCop);
      if (!v.ok) {
        await anotar({ resultado: 'monto_no_coincide', detalle: v.motivo });
        return;
      }
      await activarLicencia(lic.id);
      await anotar({ resultado: 'activada', detalle: `${lic.precioCop} COP` });
      return;
    }
    case 'in_process':
    case 'pending':
    case 'authorized':
      if (lic.usuarioId) invalidarAcceso(lic.usuarioId);
      await anotar({ resultado: 'en_revision', detalle: mp.status_detail });
      return;

    case 'rejected':
    case 'cancelled': {
      if (lic.estado !== 'pendiente') {
        await anotar({ resultado: 'ignorado', detalle: `licencia ya ${lic.estado}` });
        return;
      }
      // Un pago en revisión que termina rechazado: si la compra creó la cuenta, se
      // borra para liberar el correo. Antes quedaba bloqueado para siempre.
      const cuentaNueva = mp.metadata?.cuenta_nueva === true || mp.metadata?.cuenta_nueva === 'true';
      if (lic.usuarioId) {
        await descartarCompra({ licenciaId: lic.id, usuarioId: lic.usuarioId, institucionId: lic.institucionId, cuentaNueva });
      }
      await anotar({ resultado: cuentaNueva ? 'rechazada_cuenta_liberada' : 'rechazada', detalle: mp.status_detail });
      return;
    }
    case 'refunded':
    case 'charged_back': {
      // Devolución o contracargo: la licencia deja de valer.
      await prisma.licencia.update({ where: { id: lic.id }, data: { estado: 'cancelada' } });
      if (lic.usuarioId) invalidarAcceso(lic.usuarioId);
      await anotar({ resultado: 'revocada', detalle: mp.status });
      return;
    }
    default:
      await anotar({ resultado: 'sin_accion', detalle: mp.status });
  }
}

/**
 * Activa una licencia UNA sola vez. El checkout y el webhook pueden llegar casi a
 * la vez: el `updateMany` con `estado: pendiente` en el filtro hace que solo el
 * primero la active; el segundo no encuentra nada que cambiar.
 *
 * En una renovación la vigencia nueva empieza al terminar la actual, no hoy: quien
 * renueva un mes antes no pierde ese mes.
 */
async function activarLicencia(licenciaId: number): Promise<void> {
  const lic = await prisma.licencia.findUnique({
    where: { id: licenciaId },
    select: { id: true, tipo: true, usuarioId: true },
  });
  if (!lic) return;

  const ahora = new Date();
  let desde = ahora;
  if (lic.usuarioId) {
    const vigente = await prisma.licencia.findFirst({
      where: { usuarioId: lic.usuarioId, estado: 'activa', finVigencia: { gt: ahora }, NOT: { id: lic.id } },
      orderBy: { finVigencia: 'desc' },
      select: { finVigencia: true },
    });
    if (vigente?.finVigencia) desde = vigente.finVigencia;
  }

  await prisma.licencia.updateMany({
    where: { id: licenciaId, estado: 'pendiente' },
    data: { estado: 'activa', inicioVigencia: desde, finVigencia: finVigencia(lic.tipo as ClavePlan, desde) },
  });
  if (lic.usuarioId) invalidarAcceso(lic.usuarioId);
}

/**
 * Deshace una compra que no se pagó.
 * Si la compra CREÓ la cuenta, se borra todo (para liberar el correo). Si era una
 * renovación de una cuenta existente, solo se cancela la licencia: la cuenta, su
 * progreso y sus licencias anteriores no se tocan.
 */
async function descartarCompra(d: {
  licenciaId: number;
  usuarioId: number;
  institucionId: number | null;
  cuentaNueva: boolean;
}): Promise<void> {
  try {
    if (!d.cuentaNueva) {
      await prisma.licencia.updateMany({ where: { id: d.licenciaId, estado: 'pendiente' }, data: { estado: 'cancelada' } });
      invalidarAcceso(d.usuarioId);
      return;
    }
    // Seguro extra: nunca se borra una cuenta que ya tenga otra licencia o progreso.
    const [otrasLicencias, sesiones] = await Promise.all([
      prisma.licencia.count({ where: { usuarioId: d.usuarioId, NOT: { id: d.licenciaId } } }),
      prisma.levelSession.count({ where: { usuarioId: d.usuarioId } }),
    ]);
    if (otrasLicencias > 0 || sesiones > 0) {
      await prisma.licencia.updateMany({ where: { id: d.licenciaId }, data: { estado: 'cancelada' } });
      invalidarAcceso(d.usuarioId);
      return;
    }

    await prisma.licencia.delete({ where: { id: d.licenciaId } }).catch(() => {});
    if (d.institucionId) await prisma.classroom.deleteMany({ where: { institucionId: d.institucionId } }).catch(() => {});
    await prisma.user.delete({ where: { id: d.usuarioId } }).catch(() => {});
    if (d.institucionId) await prisma.institution.delete({ where: { id: d.institucionId } }).catch(() => {});
    invalidarAcceso(d.usuarioId);
  } catch {
    /* limpieza best-effort */
  }
}
