/**
 * SSO con Microsoft Entra ID (Azure AD) para las cuentas institucionales.
 *
 * Flujo: Authorization Code de OpenID Connect con cliente CONFIDENCIAL
 * (la app tiene client secret, así que el canje del código se hace
 * servidor-a-servidor y no hace falta PKCE).
 *
 * Sobre la validación del id_token: el token NO llega por el navegador, llega
 * en la respuesta del token endpoint de Microsoft, por HTTPS, en una petición
 * que hace este servidor. En ese caso OpenID Connect Core §3.1.3.7 permite
 * omitir la verificación de firma (el canal TLS ya da la garantía de origen).
 * Por eso aquí se validan los CLAIMS (iss, aud, tid, exp, nonce) sin traer una
 * librería de JWKS. Si algún día el id_token llegara por el navegador
 * (flujo implícito), esto NO sería suficiente.
 */

export interface PerfilMicrosoft {
  oid: string;
  email: string;
  nombre: string;
  tid: string;
}

const TENANT = process.env.MS_TENANT_ID ?? '';
const CLIENT_ID = process.env.MS_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.MS_CLIENT_SECRET ?? '';

/** Dominios institucionales aceptados (coma-separados). */
const DOMINIOS = (process.env.MS_DOMINIOS_PERMITIDOS ?? 'colegioaleman.edu.co')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

/** Si un correo del dominio no tiene cuenta, ¿se le crea una de estudiante? */
export const AUTO_CREAR = (process.env.MS_AUTO_CREAR ?? 'true').toLowerCase() !== 'false';

const AUTORIDAD = () => `https://login.microsoftonline.com/${TENANT}`;

export function ssoConfigurado(): boolean {
  return Boolean(TENANT && CLIENT_ID && CLIENT_SECRET);
}

export function dominiosPermitidos(): string[] {
  return [...DOMINIOS];
}

/** La URI de retorno debe coincidir EXACTAMENTE con la registrada en Azure. */
export function redirectUri(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/api/auth/microsoft/callback`;
}

export function urlAutorizacion(opciones: { state: string; nonce: string; redirectUri: string }): string {
  const p = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: opciones.redirectUri,
    response_mode: 'query',
    // openid+profile+email basta: no pedimos permisos sobre datos del colegio.
    scope: 'openid profile email',
    state: opciones.state,
    nonce: opciones.nonce,
  });
  return `${AUTORIDAD()}/oauth2/v2.0/authorize?${p.toString()}`;
}

/** Canjea el código por tokens (servidor-a-servidor, con el client secret). */
export async function canjearCodigo(code: string, redirect: string): Promise<{ id_token: string }> {
  const res = await fetch(`${AUTORIDAD()}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirect,
      scope: 'openid profile email',
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const cuerpo = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const desc = String(cuerpo.error_description ?? cuerpo.error ?? res.status);
    throw new Error(`Microsoft rechazó el canje del código: ${desc.slice(0, 200)}`);
  }
  if (typeof cuerpo.id_token !== 'string') throw new Error('Microsoft no devolvió id_token');
  return { id_token: cuerpo.id_token };
}

function decodificarPayload(jwt: string): Record<string, unknown> {
  const partes = jwt.split('.');
  if (partes.length !== 3) throw new Error('id_token malformado');
  const json = Buffer.from(partes[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  return JSON.parse(json) as Record<string, unknown>;
}

/** Valida los claims del id_token y devuelve el perfil. Lanza si algo no cuadra. */
export function leerIdToken(idToken: string, nonceEsperado: string): PerfilMicrosoft {
  const c = decodificarPayload(idToken);

  const iss = String(c.iss ?? '');
  const esperado = `${AUTORIDAD()}/v2.0`;
  if (iss !== esperado) throw new Error('El emisor del id_token no es el tenant esperado');

  if (String(c.aud ?? '') !== CLIENT_ID) throw new Error('El id_token no fue emitido para esta aplicación');
  if (String(c.tid ?? '') !== TENANT) throw new Error('El id_token viene de otro tenant');
  if (String(c.nonce ?? '') !== nonceEsperado) throw new Error('El nonce no coincide (posible repetición de la respuesta)');

  const exp = Number(c.exp ?? 0);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now() - 60_000) throw new Error('El id_token está vencido');

  // El correo puede venir en 'email' o, más común en cuentas de organización, en
  // 'preferred_username' (el UPN). Se toma el primero que parezca un correo.
  const candidatos = [c.email, c.preferred_username, c.upn]
    .map((v) => (typeof v === 'string' ? v.trim().toLowerCase() : ''))
    .filter((v) => v.includes('@'));
  const email = candidatos[0] ?? '';
  if (!email) throw new Error('Microsoft no devolvió un correo para esta cuenta');

  const nombre = typeof c.name === 'string' && c.name.trim() ? c.name.trim() : email.split('@')[0];

  return { oid: String(c.oid ?? ''), email, nombre, tid: String(c.tid ?? '') };
}

/** ¿El correo pertenece a un dominio institucional autorizado? */
export function dominioPermitido(email: string): boolean {
  const dominio = email.split('@')[1]?.toLowerCase() ?? '';
  return DOMINIOS.some((d) => dominio === d || dominio.endsWith(`.${d}`));
}
