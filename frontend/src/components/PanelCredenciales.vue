<template>
  <div class="cred-overlay" @click.self="$emit('cerrar')">
    <div class="cred">
      <button class="cred-cerrar no-imprimir" aria-label="Cerrar" @click="$emit('cerrar')">✕</button>

      <header class="cred-cabecera">
        <h3>🎨 Acceso con dibujos — {{ aula.nombre }}</h3>
        <p class="cred-ayuda no-imprimir">
          Los más pequeños entran con su <strong>nombre de jugador</strong> y <strong>cuatro dibujos</strong>,
          sin escribir correo ni contraseña. Esta es la lista para imprimir y pegar en el salón.
        </p>
      </header>

      <div v-if="!puedeVerPines" class="cred-aviso no-imprimir">
        ⚠️ Este servidor no tiene configurada la clave <code>PIN_SECRET</code>, así que los dibujos ya
        asignados no se pueden volver a mostrar. Puedes asignar unos nuevos y quedarán a la vista.
      </div>

      <div v-if="cargando" class="cred-cargando">Cargando…</div>

      <template v-else>
        <!-- Asignar dibujos a todo el grupo -->
        <section class="cred-asignar no-imprimir">
          <p class="cred-titulo">Poner dibujos a todo el grupo</p>
          <div class="cred-elegidos">
            <span v-for="i in 4" :key="i" class="cred-hueco" :class="{ lleno: nuevoPin[i - 1] }">
              {{ nuevoPin[i - 1] ? EMOJI[nuevoPin[i - 1]] : '' }}
            </span>
            <button v-if="nuevoPin.length" class="btn-mini" @click="nuevoPin = []">Borrar</button>
          </div>
          <div class="cred-grilla">
            <button
              v-for="img in OPCIONES"
              :key="img"
              class="cred-img"
              :aria-label="img"
              @click="ponerImagen(img)"
            >{{ EMOJI[img] }}</button>
          </div>
          <div class="cred-botones">
            <button class="btn-primary" :disabled="nuevoPin.length !== 4 || trabajando" @click="aplicar(true)">
              El mismo para los {{ credenciales.length }}
            </button>
            <button class="btn-secondary" :disabled="trabajando" @click="aplicar(false)">
              🎲 Uno distinto al azar para cada uno
            </button>
          </div>
          <p class="cred-nota">
            El mismo para todos sirve el primer día: se dibuja en el tablero y listo.
            Uno distinto por niño cuando ya saben cuidarlo.
          </p>
        </section>

        <p v-if="error" class="cred-error no-imprimir">{{ error }}</p>

        <!-- La lista que se imprime -->
        <table class="cred-tabla">
          <thead>
            <tr>
              <th>Estudiante</th>
              <th>Nombre de jugador</th>
              <th>Sus dibujos</th>
              <th class="no-imprimir">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in credenciales" :key="c.id">
              <td>
                <strong>{{ c.nombre }}</strong>
                <span v-if="!c.activo" class="cred-bloq"> (bloqueado)</span>
              </td>
              <td><code class="cred-usuario">{{ c.usuario ?? '—' }}</code></td>
              <td>
                <span v-if="c.pin" class="cred-pin">
                  <span v-for="(img, i) in c.pin" :key="i" class="cred-pin-img">{{ EMOJI[img] ?? '?' }}</span>
                </span>
                <span v-else-if="c.usuario" class="cred-sin">no visible</span>
                <span v-else class="cred-sin">sin asignar</span>
              </td>
              <td class="no-imprimir">
                <button class="btn-mini" :disabled="trabajando" title="Dibujos nuevos al azar solo para este" @click="alAzarUno(c)">🎲</button>
                <button v-if="c.usuario" class="btn-mini peligro" :disabled="trabajando" title="Quitar el acceso con dibujos" @click="quitar(c)">✕</button>
              </td>
            </tr>
            <tr v-if="credenciales.length === 0">
              <td colspan="4" class="cred-vacio">Este grupo todavía no tiene estudiantes.</td>
            </tr>
          </tbody>
        </table>

        <div class="cred-pie no-imprimir">
          <button class="btn-secondary" @click="imprimir">🖨️ Imprimir</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Credenciales de acceso con dibujos de un grupo.
 *
 * Es la pantalla que el docente imprime y pega en la pared, por eso tiene
 * estilos de impresión propios: en papel sobran los botones y hace falta que las
 * filas no se partan entre dos hojas.
 *
 * El PIN se muestra con las mismas imágenes que ve el niño al entrar. Escribirlo
 * como "gato, sol, luna, flor" obligaría al docente a traducir cada vez.
 *
 * Cambiar los dibujos a todo el grupo es la operación normal, no la excepción:
 * se reparten el primer día y se cambian cuando alguien se los aprende de
 * memoria y entra en la cuenta de otro.
 */
import { onMounted, ref, watch } from 'vue';
import { teacherApi, mensajeError } from '@/api/index';

const props = defineProps<{ aula: { id: number; nombre: string } }>();
defineEmits<{ cerrar: [] }>();

interface Credencial {
  id: number;
  nombre: string;
  usuario: string | null;
  activo: boolean;
  pin: string[] | null;
}

const EMOJI: Record<string, string> = {
  gato: '🐱', sol: '☀️', arbol: '🌳', luna: '🌙', pez: '🐟',
  flor: '🌸', nube: '☁️', tren: '🚂', pato: '🦆',
};
const OPCIONES = Object.keys(EMOJI);

const credenciales = ref<Credencial[]>([]);
const puedeVerPines = ref(true);
const cargando = ref(true);
const trabajando = ref(false);
const error = ref('');
/** Los dibujos que se van a poner a todo el grupo. */
const nuevoPin = ref<string[]>([]);

async function cargar(): Promise<void> {
  cargando.value = true;
  error.value = '';
  try {
    const d = await teacherApi.getCredenciales(props.aula.id);
    credenciales.value = d.credenciales;
    puedeVerPines.value = d.puedeVerPines;
  } catch (e) {
    error.value = mensajeError(e, 'No se pudieron cargar las credenciales');
  } finally {
    cargando.value = false;
  }
}

function ponerImagen(img: string): void {
  if (nuevoPin.value.length >= 4) nuevoPin.value = [];
  nuevoPin.value = [...nuevoPin.value, img];
}

async function aplicar(mismo: boolean): Promise<void> {
  if (trabajando.value) return;
  if (mismo && nuevoPin.value.length !== 4) return;

  const cuantos = credenciales.value.length;
  const aviso = mismo
    ? `Poner los mismos dibujos a los ${cuantos} estudiantes de ${props.aula.nombre}.`
    : `Dar dibujos distintos y al azar a cada uno de los ${cuantos} estudiantes.`;
  if (!confirm(`${aviso}\n\nLos dibujos anteriores dejarán de funcionar.`)) return;

  trabajando.value = true;
  error.value = '';
  try {
    await teacherApi.setPinesGrupo(props.aula.id, mismo ? { pin: nuevoPin.value } : {});
    nuevoPin.value = [];
    await cargar();
  } catch (e) {
    error.value = mensajeError(e, 'No se pudieron cambiar los dibujos');
  } finally {
    trabajando.value = false;
  }
}

async function alAzarUno(c: Credencial): Promise<void> {
  if (trabajando.value) return;
  if (!confirm(`Dar dibujos nuevos al azar a ${c.nombre}. Los anteriores dejarán de funcionar.`)) return;
  trabajando.value = true;
  try {
    await teacherApi.setPinEstudiante(c.id);
    await cargar();
  } catch (e) {
    error.value = mensajeError(e, 'No se pudo cambiar');
  } finally {
    trabajando.value = false;
  }
}

async function quitar(c: Credencial): Promise<void> {
  if (trabajando.value) return;
  if (!confirm(`Quitar el acceso con dibujos de ${c.nombre}.\n\nSeguirá pudiendo entrar con su correo y contraseña.`)) return;
  trabajando.value = true;
  try {
    await teacherApi.quitarPinEstudiante(c.id);
    await cargar();
  } catch (e) {
    error.value = mensajeError(e, 'No se pudo quitar');
  } finally {
    trabajando.value = false;
  }
}

/** La plantilla no ve `window`, y esto es lo único que necesita de él. */
function imprimir(): void {
  window.print();
}

watch(() => props.aula.id, () => void cargar());
onMounted(() => void cargar());
</script>

<style scoped>
.cred-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2rem 1rem;
  overflow-y: auto;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(3px);
}
.cred {
  position: relative;
  width: min(880px, 100%);
  background: #fff;
  border-radius: 20px;
  padding: 1.6rem;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35);
}
.cred-cerrar {
  position: absolute;
  top: 0.9rem;
  right: 0.9rem;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid #E2E8F0;
  background: #F8FAFC;
  color: #475569;
  font-size: 1rem;
  cursor: pointer;
}
.cred-cerrar:hover { background: #E2E8F0; }

.cred-cabecera h3 { margin: 0 0 0.4rem; color: #1E293B; font-size: 1.2rem; }
.cred-ayuda { margin: 0 0 1rem; font-size: 0.86rem; color: #64748B; line-height: 1.5; }
.cred-aviso {
  margin: 0 0 1rem;
  padding: 0.7rem 0.9rem;
  border-radius: 10px;
  background: #FEF3C7;
  border: 1px solid #FDE68A;
  color: #92400E;
  font-size: 0.85rem;
}
.cred-aviso code { background: #FDE68A; padding: 0.05rem 0.3rem; border-radius: 4px; }
.cred-cargando { padding: 2rem; text-align: center; color: #64748B; }

/* Asignar */
.cred-asignar {
  padding: 1rem;
  border-radius: 14px;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  margin-bottom: 1.2rem;
}
.cred-titulo { margin: 0 0 0.7rem; font-weight: 800; color: #334155; font-size: 0.95rem; }
.cred-elegidos { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.7rem; }
.cred-hueco {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 2px dashed #CBD5E1;
  display: grid;
  place-items: center;
  font-size: 1.5rem;
  background: #fff;
}
.cred-hueco.lleno { border-style: solid; border-color: #8B5CF6; background: #F5F3FF; }
.cred-grilla { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.8rem; }
.cred-img {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  border: 1px solid #E2E8F0;
  background: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  transition: transform 0.12s, border-color 0.12s;
}
.cred-img:hover { transform: translateY(-2px); border-color: #A78BFA; }
.cred-botones { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.cred-nota { margin: 0.6rem 0 0; font-size: 0.8rem; color: #64748B; line-height: 1.5; }

.cred-error {
  margin: 0 0 0.8rem;
  padding: 0.6rem 0.8rem;
  border-radius: 10px;
  background: #FEE2E2;
  border: 1px solid #FCA5A5;
  color: #B91C1C;
  font-size: 0.86rem;
}

/* Tabla */
.cred-tabla { width: 100%; border-collapse: collapse; }
.cred-tabla th {
  text-align: left;
  padding: 0.6rem 0.5rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748B;
  border-bottom: 2px solid #E2E8F0;
}
.cred-tabla td { padding: 0.65rem 0.5rem; border-bottom: 1px solid #F1F5F9; color: #1E293B; font-size: 0.9rem; }
.cred-usuario { background: #F1F5F9; padding: 0.15rem 0.45rem; border-radius: 6px; font-size: 0.9rem; color: #334155; }
.cred-pin { display: inline-flex; gap: 0.3rem; }
.cred-pin-img {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: #F5F3FF;
  border: 1px solid #DDD6FE;
  display: inline-grid;
  place-items: center;
  font-size: 1.15rem;
}
.cred-sin { color: #94A3B8; font-size: 0.85rem; font-style: italic; }
.cred-bloq { color: #B91C1C; font-size: 0.8rem; }
.cred-vacio { text-align: center; color: #94A3B8; padding: 1.5rem; }
.cred-pie { margin-top: 1.1rem; display: flex; justify-content: flex-end; }

.btn-mini {
  padding: 0.3rem 0.6rem;
  border-radius: 8px;
  border: 1px solid #CBD5E1;
  background: #F8FAFC;
  color: #334155;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}
.btn-mini:hover:not(:disabled) { background: #EEF2FF; border-color: #A5B4FC; }
.btn-mini.peligro { background: #FEE2E2; color: #B91C1C; border-color: #FCA5A5; }
.btn-mini:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary {
  padding: 0.6rem 1.1rem;
  border: none;
  border-radius: 10px;
  background: #6B46C1;
  color: #fff;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary {
  padding: 0.6rem 1.1rem;
  border: 1px solid #CBD5E1;
  border-radius: 10px;
  background: #fff;
  color: #334155;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
}
.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

/* En papel sobran los controles y el fondo. */
@media print {
  .cred-overlay { position: static; background: none; padding: 0; display: block; backdrop-filter: none; }
  .cred { box-shadow: none; width: 100%; padding: 0; border-radius: 0; }
  .no-imprimir { display: none !important; }
  .cred-tabla tr { break-inside: avoid; }
  .cred-pin-img { border-color: #999; }
}
</style>
