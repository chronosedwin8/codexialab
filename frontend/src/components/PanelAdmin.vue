<template>
  <section class="adm">
    <p class="panel-hint">
      Control total del colegio: <strong>todas</strong> las cuentas —estudiantes, profesores y administradores—.
      Puedes buscarlas, cambiarles la contraseña, cambiarles el rol, bloquearlas y eliminarlas.
    </p>

    <!-- Resumen -->
    <div v-if="resumen" class="adm-resumen">
      <button class="adm-tarjeta" :class="{ on: filtroRol === '' }" @click="filtrar('')">
        <span class="adm-num">{{ resumen.estudiantes + resumen.docentes + resumen.admins }}</span>
        <span class="adm-lbl">Todas</span>
      </button>
      <button class="adm-tarjeta" :class="{ on: filtroRol === 'estudiante' }" @click="filtrar('estudiante')">
        <span class="adm-num">{{ resumen.estudiantes }}</span><span class="adm-lbl">🎒 Estudiantes</span>
      </button>
      <button class="adm-tarjeta" :class="{ on: filtroRol === 'docente' }" @click="filtrar('docente')">
        <span class="adm-num">{{ resumen.docentes }}</span><span class="adm-lbl">👩‍🏫 Profesores</span>
      </button>
      <button class="adm-tarjeta" :class="{ on: filtroRol === 'admin' }" @click="filtrar('admin')">
        <span class="adm-num">{{ resumen.admins }}</span><span class="adm-lbl">🛡️ Admins</span>
      </button>
      <div class="adm-tarjeta info">
        <span class="adm-num">{{ resumen.conPin }}</span><span class="adm-lbl">🎨 Con dibujos</span>
      </div>
      <div class="adm-tarjeta info" :class="{ alerta: resumen.bloqueados > 0 }">
        <span class="adm-num">{{ resumen.bloqueados }}</span><span class="adm-lbl">🔒 Bloqueadas</span>
      </div>
    </div>

    <div class="adm-barra">
      <input v-model="busqueda" class="adm-buscar" type="search" placeholder="Buscar por nombre, correo o nombre de jugador…" @input="buscarConEspera" />
      <button class="btn-primary" @click="abrirCrear">+ Nueva cuenta</button>
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>
    <div v-if="cargando" class="adm-cargando">Cargando…</div>

    <table v-else class="adm-tabla">
      <thead>
        <tr>
          <th>Cuenta</th><th>Rol</th><th>Grupos</th><th>Estado</th><th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in usuarios" :key="u.id" :class="{ inactiva: !u.activo }">
          <td>
            <p class="adm-nombre">{{ u.nombre }}</p>
            <p class="adm-email">{{ u.email }}</p>
            <p v-if="u.usuario" class="adm-jugador">🎨 {{ u.usuario }}</p>
          </td>
          <td><span class="adm-rol" :class="u.rol">{{ ETIQUETA_ROL[u.rol] }}</span></td>
          <td class="adm-centro">
            <span v-if="u.rol === 'estudiante'">{{ u.grupos }}</span>
            <span v-else :title="'Grupos que dirige'">{{ u.gruposQueDirige }}</span>
          </td>
          <td>
            <span class="adm-estado" :class="u.activo ? 'ok' : 'bloq'">{{ u.activo ? 'Activa' : 'Bloqueada' }}</span>
          </td>
          <td class="adm-acciones">
            <button class="btn-mini" title="Editar nombre, correo, rol o sede" @click="abrirEditar(u)">✏️</button>
            <button class="btn-mini" title="Cambiar la contraseña" @click="abrirPassword(u)">🔑</button>
            <button class="btn-mini" :title="u.activo ? 'Bloquear el acceso' : 'Desbloquear'" @click="alternarActiva(u)">
              {{ u.activo ? '🔒' : '🔓' }}
            </button>
            <button class="btn-mini peligro" title="Eliminar la cuenta" @click="eliminar(u)">🗑️</button>
          </td>
        </tr>
        <tr v-if="usuarios.length === 0">
          <td colspan="5" class="adm-vacio">No hay cuentas que coincidan.</td>
        </tr>
      </tbody>
    </table>

    <!-- Crear o editar -->
    <div v-if="modal" class="modal-overlay" @click.self="modal = null">
      <div class="modal">
        <button class="modal-close" aria-label="Cerrar" @click="modal = null">✕</button>
        <h3>{{ modal === 'crear' ? '➕ Nueva cuenta' : '✏️ Editar cuenta' }}</h3>
        <div class="form-group"><label>Nombre</label><input v-model="ficha.nombre" type="text" /></div>
        <div class="form-group"><label>Correo</label><input v-model="ficha.email" type="email" /></div>
        <div v-if="modal === 'crear'" class="form-group">
          <label>Contraseña</label><input v-model="ficha.password" type="text" placeholder="mínimo 4 caracteres" />
        </div>
        <div class="form-group">
          <label>Rol</label>
          <select v-model="ficha.rol" class="filter-select">
            <option value="estudiante">🎒 Estudiante</option>
            <option value="docente">👩‍🏫 Profesor</option>
            <option value="admin">🛡️ Administrador</option>
          </select>
          <p class="modal-help">Un profesor administra sus grupos. Un administrador puede hacer todo, en todo el colegio.</p>
        </div>
        <div v-if="ficha.rol === 'estudiante'" class="form-group">
          <label>Banda de edad</label>
          <select v-model="ficha.banda_edad" class="filter-select">
            <option value="exploradores">Exploradores (6-7)</option>
            <option value="aventureros">Aventureros (8-10)</option>
            <option value="heroes">Héroes (11-12)</option>
          </select>
        </div>
        <p v-if="modalError" class="form-error">{{ modalError }}</p>
        <div class="modal-actions">
          <button class="btn-secondary" @click="modal = null">Cancelar</button>
          <button class="btn-primary" :disabled="guardando" @click="guardar">{{ guardando ? 'Guardando…' : 'Guardar' }}</button>
        </div>
      </div>
    </div>

    <!-- Contraseña -->
    <div v-if="modalPass" class="modal-overlay" @click.self="modalPass = null">
      <div class="modal">
        <button class="modal-close" aria-label="Cerrar" @click="modalPass = null">✕</button>
        <h3>🔑 Cambiar contraseña</h3>
        <p class="modal-help">
          Cuenta de <strong>{{ modalPass.nombre }}</strong> ({{ ETIQUETA_ROL[modalPass.rol] }}) — {{ modalPass.email }}
        </p>
        <div class="form-group">
          <label>Contraseña nueva</label>
          <input v-model="passNueva" type="text" placeholder="mínimo 4 caracteres" />
        </div>
        <p class="modal-help">La verás aquí para poder dictársela. Queda registrada la acción, no la clave.</p>
        <p v-if="modalError" class="form-error">{{ modalError }}</p>
        <div class="modal-actions">
          <button class="btn-secondary" @click="modalPass = null">Cancelar</button>
          <button class="btn-primary" :disabled="guardando || passNueva.length < 4" @click="guardarPassword">
            {{ guardando ? 'Guardando…' : 'Cambiar' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * Panel de administración: todas las cuentas del sistema en un solo lugar.
 *
 * Nace de un problema concreto: los administradores no aparecían en la lista de
 * profesores, así que al intentar crear uno que ya existía el sistema decía "ya
 * existe" y no había forma de verlo ni de tocarlo.
 */
import { computed, onMounted, ref } from 'vue';
import { adminApi, mensajeError } from '@/api/index';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const miId = computed(() => authStore.user?.id);

const ETIQUETA_ROL: Record<string, string> = {
  estudiante: '🎒 Estudiante', docente: '👩‍🏫 Profesor', admin: '🛡️ Admin',
};

interface Cuenta {
  id: number; nombre: string; email: string; usuario: string | null;
  rol: string; bandaEdad: string | null; activo: boolean;
  grupos: number; gruposQueDirige: number; tienePin: boolean;
}

const usuarios = ref<Cuenta[]>([]);
const resumen = ref<Record<string, number> | null>(null);
const cargando = ref(true);
const error = ref('');
const busqueda = ref('');
const filtroRol = ref('');

const modal = ref<'crear' | 'editar' | null>(null);
const modalPass = ref<Cuenta | null>(null);
const modalError = ref('');
const guardando = ref(false);
const passNueva = ref('');
const ficha = ref({ id: 0, nombre: '', email: '', password: '', rol: 'docente', banda_edad: 'aventureros' });

let temporizador: ReturnType<typeof setTimeout> | null = null;

async function cargar(): Promise<void> {
  cargando.value = true;
  error.value = '';
  try {
    const [u, r] = await Promise.all([
      adminApi.getUsuarios({ q: busqueda.value || undefined, rol: filtroRol.value || undefined }),
      adminApi.getResumen(),
    ]);
    usuarios.value = u.usuarios;
    resumen.value = r;
  } catch (e) {
    error.value = mensajeError(e, 'No se pudieron cargar las cuentas');
  } finally {
    cargando.value = false;
  }
}

/** Se espera a que deje de teclear: una consulta por letra sobra. */
function buscarConEspera(): void {
  if (temporizador) clearTimeout(temporizador);
  temporizador = setTimeout(() => void cargar(), 350);
}

function filtrar(rol: string): void {
  filtroRol.value = rol;
  void cargar();
}

function abrirCrear(): void {
  modalError.value = '';
  ficha.value = { id: 0, nombre: '', email: '', password: '', rol: 'docente', banda_edad: 'aventureros' };
  modal.value = 'crear';
}

function abrirEditar(u: Cuenta): void {
  modalError.value = '';
  ficha.value = {
    id: u.id, nombre: u.nombre, email: u.email, password: '',
    rol: u.rol, banda_edad: u.bandaEdad ?? 'aventureros',
  };
  modal.value = 'editar';
}

function abrirPassword(u: Cuenta): void {
  modalError.value = '';
  passNueva.value = '';
  modalPass.value = u;
}

async function guardar(): Promise<void> {
  if (guardando.value) return;
  modalError.value = '';
  guardando.value = true;
  try {
    if (modal.value === 'crear') {
      await adminApi.crearUsuario({
        nombre: ficha.value.nombre, email: ficha.value.email, password: ficha.value.password,
        rol: ficha.value.rol,
        ...(ficha.value.rol === 'estudiante' ? { banda_edad: ficha.value.banda_edad } : {}),
      });
    } else {
      await adminApi.editarUsuario(ficha.value.id, {
        nombre: ficha.value.nombre, email: ficha.value.email, rol: ficha.value.rol,
        ...(ficha.value.rol === 'estudiante' ? { banda_edad: ficha.value.banda_edad } : {}),
      });
    }
    modal.value = null;
    await cargar();
  } catch (e) {
    modalError.value = mensajeError(e, 'No se pudo guardar');
  } finally {
    guardando.value = false;
  }
}

async function guardarPassword(): Promise<void> {
  if (!modalPass.value || guardando.value) return;
  modalError.value = '';
  guardando.value = true;
  try {
    const r = await adminApi.cambiarPassword(modalPass.value.id, passNueva.value);
    alert(`Contraseña cambiada.\n\n${r.nombre} (${r.email})\nNueva clave: ${passNueva.value}`);
    modalPass.value = null;
  } catch (e) {
    modalError.value = mensajeError(e, 'No se pudo cambiar la contraseña');
  } finally {
    guardando.value = false;
  }
}

async function alternarActiva(u: Cuenta): Promise<void> {
  if (u.id === miId.value) { error.value = 'No puedes bloquear tu propia cuenta'; return; }
  const accion = u.activo ? 'bloquear' : 'desbloquear';
  if (!confirm(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} el acceso de ${u.nombre}?`)) return;
  try {
    await adminApi.editarUsuario(u.id, { activo: !u.activo });
    await cargar();
  } catch (e) {
    error.value = mensajeError(e, `No se pudo ${accion}`);
  }
}

async function eliminar(u: Cuenta): Promise<void> {
  if (u.id === miId.value) { error.value = 'No puedes eliminar tu propia cuenta'; return; }
  const aviso = u.rol === 'estudiante'
    ? `Se borrará la cuenta de ${u.nombre} y TODO su progreso. No se puede deshacer.`
    : `Se borrará la cuenta de ${u.nombre} (${ETIQUETA_ROL[u.rol]}). No se puede deshacer.`;
  if (!confirm(aviso)) return;
  try {
    await adminApi.eliminarUsuario(u.id);
    await cargar();
  } catch (e) {
    error.value = mensajeError(e, 'No se pudo eliminar');
  }
}

onMounted(() => void cargar());
</script>

<style scoped>
.adm { display: flex; flex-direction: column; gap: 1rem; }
.panel-hint {
  color: #475569; font-size: 0.88rem; margin: 0;
  background: #F1F5F9; padding: 0.6rem 0.9rem; border-radius: 8px; border-left: 3px solid #8B5CF6;
}

.adm-resumen { display: flex; gap: 0.6rem; flex-wrap: wrap; }
.adm-tarjeta {
  display: flex; flex-direction: column; align-items: center; gap: 0.1rem;
  min-width: 108px; padding: 0.65rem 0.9rem;
  border-radius: 12px; border: 1px solid #E2E8F0; background: #fff;
  font-family: inherit; cursor: pointer; transition: border-color 0.15s, background 0.15s;
}
.adm-tarjeta:hover { border-color: #A5B4FC; background: #F8FAFC; }
.adm-tarjeta.on { border-color: #6B46C1; background: #F5F3FF; box-shadow: 0 0 0 1px #6B46C1 inset; }
.adm-tarjeta.info { cursor: default; }
.adm-tarjeta.info:hover { border-color: #E2E8F0; background: #fff; }
.adm-tarjeta.alerta { border-color: #FCA5A5; background: #FEF2F2; }
.adm-num { font-size: 1.4rem; font-weight: 800; color: #1E293B; }
.adm-lbl { font-size: 0.74rem; color: #64748B; font-weight: 600; }

.adm-barra { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; }
.adm-buscar {
  flex: 1; min-width: 240px;
  padding: 0.6rem 0.9rem; border-radius: 10px; border: 1px solid #CBD5E1;
  font-family: inherit; font-size: 0.92rem; color: #111827; background: #fff;
}
.adm-buscar:focus { outline: none; border-color: #8B5CF6; }
.adm-cargando { padding: 2rem; text-align: center; color: #64748B; }

.adm-tabla { width: 100%; border-collapse: collapse; }
.adm-tabla th {
  text-align: left; padding: 0.6rem 0.5rem; font-size: 0.72rem;
  text-transform: uppercase; letter-spacing: 0.04em; color: #64748B; border-bottom: 2px solid #E2E8F0;
}
.adm-tabla td { padding: 0.6rem 0.5rem; border-bottom: 1px solid #F1F5F9; font-size: 0.9rem; color: #1E293B; }
.adm-tabla tr.inactiva { background: #FEF2F2; }
.adm-centro { text-align: center; }
.adm-nombre { margin: 0; font-weight: 700; }
.adm-email { margin: 0.1rem 0 0; font-size: 0.8rem; color: #64748B; }
.adm-jugador { margin: 0.1rem 0 0; font-size: 0.78rem; color: #7C3AED; font-weight: 600; }

.adm-rol { padding: 0.22rem 0.6rem; border-radius: 999px; font-size: 0.76rem; font-weight: 700; white-space: nowrap; }
.adm-rol.estudiante { background: #DBEAFE; color: #1E40AF; }
.adm-rol.docente { background: #DCFCE7; color: #15803D; }
.adm-rol.admin { background: #FEF3C7; color: #92400E; }

.adm-estado { font-size: 0.8rem; font-weight: 700; }
.adm-estado.ok { color: #15803D; }
.adm-estado.bloq { color: #B91C1C; }

.adm-acciones { display: flex; gap: 0.3rem; }
.adm-vacio { text-align: center; color: #94A3B8; padding: 1.6rem; }

.btn-mini {
  padding: 0.32rem 0.6rem; border-radius: 8px; border: 1px solid #CBD5E1;
  background: #F8FAFC; color: #334155; font-family: inherit; font-size: 0.85rem;
  font-weight: 700; cursor: pointer;
}
.btn-mini:hover { background: #EEF2FF; border-color: #A5B4FC; }
.btn-mini.peligro { background: #FEE2E2; color: #B91C1C; border-color: #FCA5A5; }
.btn-mini.peligro:hover { background: #FECACA; }

.form-error {
  margin: 0; padding: 0.55rem 0.8rem; border-radius: 8px;
  background: #FEE2E2; border: 1px solid #FCA5A5; color: #B91C1C; font-size: 0.86rem;
}

/* Modales: misma forma que los del panel docente */
.modal-overlay {
  position: fixed; inset: 0; z-index: 300; display: flex; align-items: center; justify-content: center;
  padding: 1rem; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(3px);
}
.modal {
  position: relative; width: min(440px, 100%); max-height: 92vh; overflow-y: auto;
  background: #fff; border-radius: 18px; padding: 1.5rem; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35);
}
.modal h3 { margin: 0 0 0.8rem; color: #1E293B; font-size: 1.1rem; }
.modal-close {
  position: absolute; top: 0.8rem; right: 0.8rem; width: 32px; height: 32px; border-radius: 50%;
  border: 1px solid #E2E8F0; background: #F8FAFC; color: #475569; cursor: pointer;
}
.modal-close:hover { background: #E2E8F0; }
.modal-help { font-size: 0.82rem; color: #64748B; margin: 0 0 0.6rem; line-height: 1.5; }
.form-group { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.9rem; }
.form-group label { font-weight: 600; color: #374151; font-size: 0.88rem; }
.form-group input, .filter-select {
  padding: 0.6rem 0.8rem; border: 1px solid #CBD5E1; border-radius: 9px;
  font-family: inherit; font-size: 0.92rem; color: #111827; background: #fff;
}
.form-group input:focus, .filter-select:focus { outline: none; border-color: #8B5CF6; }
.modal-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem; }
.btn-primary {
  padding: 0.6rem 1.2rem; border: none; border-radius: 10px; background: #6B46C1; color: #fff;
  font-family: inherit; font-weight: 700; font-size: 0.9rem; cursor: pointer;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary {
  padding: 0.6rem 1.2rem; border: 1px solid #CBD5E1; border-radius: 10px; background: #fff;
  color: #334155; font-family: inherit; font-weight: 700; font-size: 0.9rem; cursor: pointer;
}
</style>
