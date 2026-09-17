/**
 * Cliente mínimo de la API de Mercado Pago (Checkout API / pago transparente).
 * El Access Token es SECRETO y solo vive en el servidor.
 * Docs: https://www.mercadopago.com.co/developers/es/reference/payments/_payments/post
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

// MP_API_BASE solo existe para las pruebas automáticas: permite simular pagos
// aprobados, reembolsos o rechazos tardíos, que con credenciales reales no se
// pueden provocar sin mover dinero. En producción no se define.
const MP_BASE = process.env.MP_API_BASE || 'https://api.mercadopago.com';

function accessToken(): string {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new Error('MP_ACCESS_TOKEN no configurado en el entorno');
  return t;
}

export interface CrearPagoInput {
  transaction_amount: number;
  token: string;              // token de tarjeta generado en el navegador con la Public Key
  description: string;
  installments: number;
  payment_method_id: string;  // visa, master, etc.
  issuer_id?: string;
  external_reference?: string; // id de nuestra licencia
  notification_url?: string;
  statement_descriptor?: string; // lo que ve el cliente en el extracto de su tarjeta
  payer: {
    email: string;
    identification?: { type: string; number: string };
  };
  metadata?: Record<string, unknown>;
}

export interface MpPago {
  id: number;
  status: string;          // approved | in_process | pending | rejected | cancelled | refunded | charged_back
  status_detail: string;
  external_reference?: string;
  transaction_amount: number;
  currency_id?: string;
  live_mode?: boolean;
  date_approved?: string | null;
  metadata?: Record<string, unknown>;
}

/** Crea un pago. `idempotencyKey` evita cobros duplicados si se reintenta. */
export async function crearPago(input: CrearPagoInput, idempotencyKey: string): Promise<MpPago> {
  const res = await fetch(`${MP_BASE}/v1/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken()}`,
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(30_000),
  });

  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `Error MP ${res.status}`;
    const err = new Error(msg) as Error & { mp?: unknown; statusCode?: number };
    err.mp = data;
    err.statusCode = res.status;
    throw err;
  }
  return data as MpPago;
}

/** Consulta un pago por id. Es la ÚNICA fuente de verdad sobre su estado. */
export async function obtenerPago(id: string | number): Promise<MpPago> {
  const res = await fetch(`${MP_BASE}/v1/payments/${encodeURIComponent(String(id))}`, {
    headers: { Authorization: `Bearer ${accessToken()}` },
    signal: AbortSignal.timeout(20_000),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data && data.message) || `Error MP ${res.status}`) as Error & { statusCode?: number };
    err.statusCode = res.status;
    throw err;
  }
  return data as MpPago;
}

export type ResultadoFirma = 'valida' | 'invalida' | 'ausente' | 'sin_secreto';

/**
 * Verifica la firma `x-signature` de una notificación de Mercado Pago.
 *
 * Mercado Pago firma con HMAC-SHA256 el texto
 *   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 * usando la "clave secreta" que muestra el panel de Webhooks de la aplicación.
 *
 * No es la única defensa: aunque llegara una notificación falsa, el webhook no
 * cree nada de lo que dice, sino que vuelve a consultar el pago a la API de
 * Mercado Pago con nuestro Access Token. La firma sirve para descartar el ruido
 * antes de gastar esa consulta y para dejar constancia de intentos falsos.
 */
export function verificarFirmaWebhook(opciones: {
  firma?: string;
  requestId?: string;
  dataId?: string;
  secreto?: string;
}): ResultadoFirma {
  const { firma, requestId, dataId, secreto } = opciones;
  if (!secreto) return 'sin_secreto';
  if (!firma) return 'ausente';

  const partes = Object.fromEntries(
    firma.split(',').map((p) => {
      const [k, ...v] = p.trim().split('=');
      return [k, v.join('=')];
    }),
  );
  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1) return 'invalida';

  // Los ids alfanuméricos se firman en minúsculas; los numéricos quedan igual.
  let manifiesto = '';
  if (dataId) manifiesto += `id:${dataId.toLowerCase()};`;
  if (requestId) manifiesto += `request-id:${requestId};`;
  manifiesto += `ts:${ts};`;

  const esperado = createHmac('sha256', secreto).update(manifiesto).digest('hex');
  const a = Buffer.from(esperado, 'hex');
  const b = Buffer.from(v1, 'hex');
  return a.length === b.length && timingSafeEqual(a, b) ? 'valida' : 'invalida';
}
