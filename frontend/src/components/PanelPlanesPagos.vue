<template>
  <section class="pp">
    <!-- ¿Listo para cobrar? -->
    <div class="pp-bloque">
      <div class="pp-cabecera">
        <h3>🩺 ¿Listo para recibir pagos?</h3>
        <button class="btn-secondary" :disabled="revisando" @click="diagnosticar">
          {{ revisando ? 'Revisando…' : 'Revisar ahora' }}
        </button>
      </div>
      <div v-if="diagnostico" class="pp-diag" :class="diagnostico.listo ? 'ok' : 'mal'">
        <p class="pp-veredicto">
          {{ diagnostico.listo ? '✅ Todo listo: Codexia puede cobrar con Mercado Pago.' : '⚠️ Hay algo por resolver antes de cobrar.' }}
        </p>
        <ul class="pp-checks">
          <li v-for="c in diagnostico.chequeos" :key="c.id" :class="c.ok ? 'ok' : c.critico ? 'mal' : 'aviso'">
            <span class="pp-ico">{{ c.ok ? '✓' : c.critico ? '✗' : '!' }}</span>
            <span><strong>{{ c.titulo }}:</strong> {{ c.detalle }}</span>
          </li>
        </ul>
        <div v-if="diagnostico.webhookUrl" class="pp-webhook">
          <span>URL del webhook para el panel de Mercado Pago:</span>
          <code>{{ diagnostico.webhookUrl }}</code>
          <button class="btn-mini" @click="copiar(diagnostico.webhookUrl)">{{ copiado ? '¡Copiada!' : 'Copiar' }}</button>
        </div>
        <p class="pp-nota">
          Última notificación recibida de Mercado Pago:
          <strong>{{ diagnostico.ultimoWebhook ? fecha(diagnostico.ultimoWebhook.recibidoEn) + ' — ' + diagnostico.ultimoWebhook.resultado : 'ninguna todavía' }}</strong>
        </p>
      </div>
      <p v-else class="pp-nota">Pulsa "Revisar ahora": se verifican las credenciales hablando con Mercado Pago de verdad.</p>
    </div>

    <!-- Precios -->
    <div class="pp-bloque">
      <h3>💲 Precios de los planes</h3>
      <p class="pp-nota">
        El cambio se aplica al instante en la página de planes y en el checkout. Las licencias ya vendidas conservan el precio que se pagó.
        Límites de Mercado Pago: entre {{ cop(limites.minimo) }} y {{ cop(limites.maximo) }}.
      </p>
      <div class="pp-planes">
        <div v-for="p in planes" :key="p.clave" class="pp-plan" :class="{ apagado: !p.activo }">
          <p class="pp-plan-nombre">{{ p.nombre }}</p>
          <p class="pp-plan-actual">Actual: <strong>{{ cop(p.precioCop) }}</strong> <small>{{ p.clave === 'prueba' ? '/ 24 h' : '/ año' }}</small></p>
          <label class="pp-label">Precio nuevo (COP)</label>
          <input
            v-model.number="borrador[p.clave]"
            class="pp-input"
            type="number"
            :min="limites.minimo"
            :max="limites.maximo"
            step="1000"
          />
          <p class="pp-previa">{{ cop(borrador[p.clave]) }}</p>
          <div class="pp-plan-acciones">
            <button
              class="btn-primary"
              :disabled="guardando === p.clave || borrador[p.clave] === p.precioCop"
              @click="guardarPrecio(p)"
            >{{ guardando === p.clave ? 'Guardando…' : 'Guardar precio' }}</button>
            <label class="pp-switch" :title="p.activo ? 'Se puede comprar' : 'No se puede comprar'">
              <input type="checkbox" :checked="p.activo" :disabled="guardando === p.clave" @change="alternarActivo(p)" />
              {{ p.activo ? 'A la venta' : 'Oculto' }}
            </label>
          </div>
          <p v-if="p.actualizadoEn" class="pp-mini">Actualizado {{ fecha(p.actualizadoEn) }}</p>
        </div>
      </div>
      <p v-if="errorPrecio" class="form-error">{{ errorPrecio }}</p>
      <p v-if="okPrecio" class="form-ok">{{ okPrecio }}</p>
    </div>

    <!-- Pagos -->
    <div class="pp-bloque">
      <div class="pp-cabecera">
        <h3>🧾 Pagos y licencias</h3>
        <button class="btn-secondary" @click="cargarPagos">Actualizar</button>
      </div>
      <div v-if="resumen" class="pp-resumen">
        <span class="pp-chip ok">✅ {{ resumen.porEstado.activa ?? 0 }} activas</span>
        <span class="pp-chip">⏳ {{ resumen.porEstado.pendiente ?? 0 }} pendientes</span>
        <span class="pp-chip">⌛ {{ resumen.porEstado.vencida ?? 0 }} vencidas</span>
        <span class="pp-chip">✖ {{ resumen.porEstado.cancelada ?? 0 }} canceladas</span>
        <span class="pp-chip dinero">💰 {{ cop(resumen.ingresosCop) }} cobrados</span>
      </div>

      <div class="pp-tabla-wrap">
        <table class="pp-tabla">
          <thead><tr><th>Fecha</th><th>Comprador</th><th>Plan</th><th>Valor</th><th>Mercado Pago</th><th>Licencia</th><th>Vence</th></tr></thead>
          <tbody>
            <tr v-for="l in licencias" :key="l.id">
              <td>{{ fecha(l.creadoEn) }}</td>
              <td>
                <p class="pp-cel-p">{{ l.usuario?.nombre ?? '—' }}</p>
                <p class="pp-cel-s">{{ l.emailComprador }}</p>
              </td>
              <td>{{ NOMBRE_PLAN[l.tipo] ?? l.tipo }}</td>
              <td>{{ cop(l.precioCop) }}</td>
              <td>
                <span class="pp-estado" :class="l.mpStatus">{{ ESTADO_MP[l.mpStatus] ?? l.mpStatus ?? '—' }}</span>
                <p v-if="l.mpPaymentId" class="pp-cel-s">#{{ l.mpPaymentId }}</p>
              </td>
              <td><span class="pp-estado" :class="'lic-' + l.estado">{{ l.estado }}</span></td>
              <td>{{ l.finVigencia ? fecha(l.finVigencia) : '—' }}</td>
            </tr>
            <tr v-if="!licencias.length"><td colspan="7" class="pp-vacio">Aún no hay compras. El primer pago aparecerá aquí.</td></tr>
          </tbody>
        </table>
      </div>

      <details class="pp-eventos">
        <summary>Notificaciones recibidas de Mercado Pago ({{ eventos.length }})</summary>
        <table class="pp-tabla">
          <thead><tr><th>Recibida</th><th>Origen</th><th>Pago</th><th>Estado MP</th><th>Firma</th><th>Resultado</th><th>Detalle</th></tr></thead>
          <tbody>
            <tr v-for="e in eventos" :key="e.id">
              <td>{{ fecha(e.recibidoEn) }}</td>
              <td>{{ e.origen }}</td>
              <td>{{ e.paymentId ?? '—' }}</td>
              <td>{{ e.mpStatus ?? '—' }}</td>
              <td>{{ e.firma ?? '—' }}</td>
              <td><strong>{{ e.resultado }}</strong></td>
              <td class="pp-cel-s">{{ e.detalle ?? '' }}</td>
            </tr>
            <tr v-if="!eventos.length"><td colspan="7" class="pp-vacio">Ninguna todavía.</td></tr>
          </tbody>
        </table>
      </details>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * Planes y pagos: precios administrables, diagnóstico de Mercado Pago y registro
 * de lo que se ha cobrado. Pensado para confirmar el primer pago real sin tener
 * que leer logs del servidor.
 */
import { onMounted, reactive, ref } from 'vue';
import { adminApi, mensajeError } from '@/api/index';

interface PlanAdmin { clave: string; nombre: string; precioCop: number; activo: boolean; actualizadoEn: string | null }

const NOMBRE_PLAN: Record<string, string> = { prueba: 'Prueba 24 h', individual: 'Individual', escuela: 'Escuela' };
const ESTADO_MP: Record<string, string> = {
  approved: 'Aprobado', in_process: 'En revisión', pending: 'Pendiente', rejected: 'Rechazado',
  cancelled: 'Cancelado', refunded: 'Reembolsado', charged_back: 'Contracargo',
};

const planes = ref<PlanAdmin[]>([]);
const limites = ref({ minimo: 1000, maximo: 50000000 });
const borrador = reactive<Record<string, number>>({});
const guardando = ref<string | null>(null);
const errorPrecio = ref('');
const okPrecio = ref('');

const diagnostico = ref<any>(null);
const revisando = ref(false);
const copiado = ref(false);

const licencias = ref<any[]>([]);
const eventos = ref<any[]>([]);
const resumen = ref<any>(null);

const cop = (n?: number | null) => (typeof n === 'number' && Number.isFinite(n) ? `$${n.toLocaleString('es-CO')} COP` : '—');
const fecha = (iso: string) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

async function cargarPlanes(): Promise<void> {
  const d = await adminApi.getPlanes();
  planes.value = d.planes;
  limites.value = d.limites;
  for (const p of d.planes) borrador[p.clave] = p.precioCop;
}

async function guardarPrecio(p: PlanAdmin): Promise<void> {
  errorPrecio.value = '';
  okPrecio.value = '';
  const nuevo = borrador[p.clave];
  if (!Number.isInteger(nuevo) || nuevo < limites.value.minimo || nuevo > limites.value.maximo) {
    errorPrecio.value = `El precio de ${p.nombre} debe ser un número entero entre ${cop(limites.value.minimo)} y ${cop(limites.value.maximo)}.`;
    return;
  }
  if (!confirm(`¿Cambiar el precio de ${p.nombre} de ${cop(p.precioCop)} a ${cop(nuevo)}?\n\nSe aplicará de inmediato a las compras nuevas.`)) return;
  guardando.value = p.clave;
  try {
    await adminApi.editarPlan(p.clave, { precio_cop: nuevo });
    await cargarPlanes();
    okPrecio.value = `Listo: ${p.nombre} ahora cuesta ${cop(nuevo)}.`;
  } catch (e) {
    errorPrecio.value = mensajeError(e, 'No se pudo guardar el precio');
  } finally {
    guardando.value = null;
  }
}

async function alternarActivo(p: PlanAdmin): Promise<void> {
  errorPrecio.value = '';
  okPrecio.value = '';
  const accion = p.activo ? 'ocultar' : 'volver a poner a la venta';
  if (!confirm(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} el plan ${p.nombre}?`)) {
    await cargarPlanes(); // deshace el cambio visual del checkbox
    return;
  }
  guardando.value = p.clave;
  try {
    await adminApi.editarPlan(p.clave, { activo: !p.activo });
    await cargarPlanes();
    okPrecio.value = `${p.nombre}: ${p.activo ? 'oculto' : 'a la venta'}.`;
  } catch (e) {
    errorPrecio.value = mensajeError(e, 'No se pudo cambiar');
    await cargarPlanes();
  } finally {
    guardando.value = null;
  }
}

async function diagnosticar(): Promise<void> {
  revisando.value = true;
  try {
    diagnostico.value = await adminApi.getDiagnosticoPagos();
  } catch (e) {
    diagnostico.value = { listo: false, chequeos: [{ id: 'x', ok: false, critico: true, titulo: 'Diagnóstico', detalle: mensajeError(e, 'No se pudo revisar') }] };
  } finally {
    revisando.value = false;
  }
}

async function cargarPagos(): Promise<void> {
  const d = await adminApi.getPagos();
  licencias.value = d.licencias;
  eventos.value = d.eventos;
  resumen.value = d.resumen;
}

async function copiar(texto: string): Promise<void> {
  try { await navigator.clipboard.writeText(texto); copiado.value = true; setTimeout(() => (copiado.value = false), 1600); } catch { /* sin portapapeles */ }
}

onMounted(async () => {
  await Promise.all([cargarPlanes(), cargarPagos()]).catch((e) => (errorPrecio.value = mensajeError(e, 'No se pudo cargar')));
  void diagnosticar();
});
</script>

<style scoped>
.pp { display: flex; flex-direction: column; gap: 1.2rem; }
.pp-bloque { background: #fff; border: 1px solid #E2E8F0; border-radius: 14px; padding: 1.1rem 1.2rem; }
.pp-bloque h3 { margin: 0 0 .6rem; font-size: 1.05rem; color: #1E293B; }
.pp-cabecera { display: flex; justify-content: space-between; align-items: center; gap: .6rem; flex-wrap: wrap; }
.pp-nota { margin: .2rem 0 .8rem; font-size: .84rem; color: #475569; line-height: 1.5; }

.pp-diag { border-radius: 12px; padding: .9rem 1rem; margin-top: .4rem; }
.pp-diag.ok { background: #F0FDF4; border: 1px solid #86EFAC; }
.pp-diag.mal { background: #FFFBEB; border: 1px solid #FCD34D; }
.pp-veredicto { margin: 0 0 .6rem; font-weight: 800; color: #1E293B; }
.pp-checks { list-style: none; margin: 0 0 .8rem; padding: 0; display: flex; flex-direction: column; gap: .35rem; }
.pp-checks li { display: flex; gap: .5rem; font-size: .86rem; color: #334155; line-height: 1.4; }
.pp-ico { width: 1.2rem; flex-shrink: 0; font-weight: 800; text-align: center; }
.pp-checks li.ok .pp-ico { color: #15803D; }
.pp-checks li.mal .pp-ico { color: #B91C1C; }
.pp-checks li.aviso .pp-ico { color: #B45309; }
.pp-webhook { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; font-size: .86rem; color: #334155; margin-bottom: .5rem; }
.pp-webhook code { background: #fff; border: 1px solid #CBD5E1; padding: .25rem .5rem; border-radius: 6px; color: #1E293B; font-size: .85rem; word-break: break-all; }

.pp-planes { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: .8rem; }
.pp-plan { border: 1px solid #E2E8F0; border-radius: 12px; padding: .9rem; background: #F8FAFC; }
.pp-plan.apagado { opacity: .7; background: #F1F5F9; }
.pp-plan-nombre { margin: 0; font-weight: 800; color: #1E293B; }
.pp-plan-actual { margin: .2rem 0 .7rem; font-size: .88rem; color: #334155; }
.pp-plan-actual small { color: #64748B; }
.pp-label { display: block; font-size: .78rem; font-weight: 600; color: #475569; margin-bottom: .25rem; }
.pp-input { width: 100%; padding: .55rem .7rem; border: 1px solid #CBD5E1; border-radius: 9px; font-family: inherit; font-size: .95rem; color: #111827; background: #fff; box-sizing: border-box; }
.pp-input:focus { outline: none; border-color: #8B5CF6; }
.pp-previa { margin: .25rem 0 .6rem; font-size: .82rem; color: #5B21B6; font-weight: 700; }
.pp-plan-acciones { display: flex; align-items: center; justify-content: space-between; gap: .5rem; flex-wrap: wrap; }
.pp-switch { display: inline-flex; align-items: center; gap: .35rem; font-size: .82rem; color: #334155; font-weight: 600; cursor: pointer; }
.pp-mini { margin: .5rem 0 0; font-size: .74rem; color: #64748B; }

.pp-resumen { display: flex; gap: .45rem; flex-wrap: wrap; margin: .3rem 0 .8rem; }
.pp-chip { padding: .25rem .65rem; border-radius: 999px; background: #F1F5F9; color: #334155; font-size: .8rem; font-weight: 700; }
.pp-chip.ok { background: #DCFCE7; color: #166534; }
.pp-chip.dinero { background: #EDE9FE; color: #5B21B6; }

.pp-tabla-wrap { overflow-x: auto; }
.pp-tabla { width: 100%; border-collapse: collapse; }
.pp-tabla th { text-align: left; padding: .5rem .45rem; font-size: .7rem; text-transform: uppercase; letter-spacing: .04em; color: #64748B; border-bottom: 2px solid #E2E8F0; white-space: nowrap; }
.pp-tabla td { padding: .5rem .45rem; border-bottom: 1px solid #F1F5F9; font-size: .85rem; color: #1E293B; vertical-align: top; }
.pp-cel-p { margin: 0; font-weight: 700; }
.pp-cel-s { margin: .1rem 0 0; font-size: .76rem; color: #64748B; }
.pp-estado { padding: .15rem .5rem; border-radius: 999px; font-size: .74rem; font-weight: 700; background: #F1F5F9; color: #334155; white-space: nowrap; }
.pp-estado.approved, .pp-estado.lic-activa { background: #DCFCE7; color: #166534; }
.pp-estado.in_process, .pp-estado.pending, .pp-estado.lic-pendiente { background: #FEF3C7; color: #92400E; }
.pp-estado.rejected, .pp-estado.cancelled, .pp-estado.refunded, .pp-estado.charged_back, .pp-estado.lic-cancelada { background: #FEE2E2; color: #991B1B; }
.pp-estado.lic-vencida { background: #E2E8F0; color: #475569; }
.pp-vacio { text-align: center; color: #64748B; padding: 1.2rem; }
.pp-eventos { margin-top: .9rem; }
.pp-eventos summary { cursor: pointer; font-size: .86rem; font-weight: 700; color: #475569; margin-bottom: .5rem; }

.btn-primary { padding: .5rem .9rem; border: none; border-radius: 9px; background: #6B46C1; color: #fff; font-family: inherit; font-weight: 700; font-size: .84rem; cursor: pointer; }
.btn-primary:disabled { opacity: .45; cursor: not-allowed; }
.btn-secondary { padding: .5rem .9rem; border: 1px solid #CBD5E1; border-radius: 9px; background: #fff; color: #334155; font-family: inherit; font-weight: 700; font-size: .84rem; cursor: pointer; }
.btn-secondary:disabled { opacity: .5; }
.btn-mini { padding: .25rem .6rem; border-radius: 8px; border: 1px solid #CBD5E1; background: #fff; color: #334155; font-family: inherit; font-size: .8rem; font-weight: 700; cursor: pointer; }
.form-error { margin: .6rem 0 0; padding: .5rem .75rem; border-radius: 8px; background: #FEE2E2; border: 1px solid #FCA5A5; color: #B91C1C; font-size: .86rem; }
.form-ok { margin: .6rem 0 0; padding: .5rem .75rem; border-radius: 8px; background: #DCFCE7; border: 1px solid #86EFAC; color: #166534; font-size: .86rem; }
</style>
