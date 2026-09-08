/**
 * Cliente mínimo de la API de Mercado Pago (Checkout API / pago transparente).
 * El Access Token es SECRETO y solo vive en el servidor.
 * Docs: https://www.mercadopago.com.co/developers/es/reference/payments/_payments/post
 */
const MP_BASE = 'https://api.mercadopago.com';

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
  payer: {
    email: string;
    identification?: { type: string; number: string };
  };
  metadata?: Record<string, unknown>;
}

export interface MpPago {
  id: number;
  status: string;          // approved | in_process | rejected | ...
  status_detail: string;
  external_reference?: string;
  transaction_amount: number;
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

/** Consulta un pago por id (para el webhook). */
export async function obtenerPago(id: string | number): Promise<MpPago> {
  const res = await fetch(`${MP_BASE}/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${accessToken()}` },
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data && data.message) || `Error MP ${res.status}`);
  return data as MpPago;
}
