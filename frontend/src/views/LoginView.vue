<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-header">
        <div class="logo">🚀</div>
        <h1 class="app-title">Codexia</h1>
        <p class="app-subtitle">La tierra donde cada reto se resuelve programando.</p>
      </div>

      <div class="tab-buttons">
        <button :class="['tab-btn', { active: activeTab === 'login' }]" @click="activeTab = 'login'">
          Iniciar Sesión
        </button>
        <button :class="['tab-btn', { active: activeTab === 'ninos' }]" @click="activeTab = 'ninos'">
          🎨 Soy pequeño
        </button>
        <button :class="['tab-btn', { active: activeTab === 'register' }]" @click="activeTab = 'register'">
          Registrarse
        </button>
      </div>

      <!-- Acceso con dibujos: para quienes aún no leen ni escriben -->
      <div v-if="activeTab === 'ninos'" class="form-card form-card--ninos">
        <AccesoDibujos @entrar="onEntrarNino" />
      </div>

      <!-- Login Form -->
      <form v-else-if="activeTab === 'login'" class="form-card" @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Correo electrónico</label>
          <input v-model="loginForm.email" type="email" placeholder="tu@email.com" required />
        </div>
        <div class="form-group">
          <label>Contraseña</label>
          <input v-model="loginForm.password" type="password" placeholder="••••••••" required />
        </div>
        <p v-if="loginError" class="error-msg">{{ loginError }}</p>
        <a v-if="ofrecerRenovar" class="btn-renovar" href="/planes.html">💳 Renovar mi licencia</a>
        <button type="submit" class="btn-primary btn-full" :disabled="isLoading">
          {{ isLoading ? 'Entrando...' : '¡Entrar a Codexia! 🚀' }}
        </button>

        <!-- SSO institucional: los estudiantes del colegio entran con su cuenta Microsoft -->
        <template v-if="ssoDisponible">
          <div class="sso-sep"><span>o</span></div>
          <button type="button" class="btn-microsoft" :disabled="isLoading || ssoEntrando" @click="entrarConMicrosoft">
            <svg class="ms-logo" viewBox="0 0 23 23" aria-hidden="true">
              <rect x="1" y="1" width="10" height="10" fill="#F25022" />
              <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
              <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
              <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
            </svg>
            <span>{{ ssoEntrando ? 'Abriendo Microsoft…' : 'Entrar con mi cuenta del colegio' }}</span>
          </button>
          <p v-if="ssoDominios.length" class="sso-nota">
            Usa tu correo <strong>@{{ ssoDominios[0] }}</strong>
          </p>
        </template>

        <div class="demo-credentials">
          <p>Demo rápido:</p>
          <button type="button" class="btn-secondary btn-sm" @click="fillDemo('estudiante')">
            Estudiante demo
          </button>
          <button type="button" class="btn-secondary btn-sm" @click="fillDemo('docente')">
            Docente demo
          </button>
        </div>
      </form>

      <!-- Register Form -->
      <form v-else class="form-card" @submit.prevent="handleRegister">
        <div class="form-group">
          <label>Nombre completo</label>
          <input v-model="registerForm.nombre" type="text" placeholder="Tu nombre" required minlength="2" />
        </div>
        <div class="form-group">
          <label>Correo electrónico</label>
          <input v-model="registerForm.email" type="email" placeholder="tu@email.com" required />
        </div>
        <div class="form-group">
          <label>Contraseña</label>
          <input v-model="registerForm.password" type="password" placeholder="Mínimo 6 caracteres" required minlength="6" />
        </div>
        <div class="form-group">
          <label>Fecha de nacimiento</label>
          <input v-model="registerForm.fecha_nacimiento" type="date" required />
        </div>

        <!-- Banda de edad -->
        <div class="form-group">
          <label>¿Cuántos años tienes?</label>
          <div class="banda-selector">
            <button
              v-for="banda in bandas"
              :key="banda.id"
              type="button"
              :class="['banda-btn', { selected: registerForm.banda_edad === banda.id }]"
              @click="registerForm.banda_edad = banda.id"
            >
              <span class="banda-icon">{{ banda.icono }}</span>
              <span class="banda-nombre">{{ banda.nombre }}</span>
              <span class="banda-edad">{{ banda.edades }}</span>
            </button>
          </div>
        </div>

        <!-- Consentimiento para menores -->
        <div v-if="isMenor" class="consent-box">
          <h3>⚠️ Aviso para padres/tutores (Ley 1581 de Colombia)</h3>
          <p>Tu hijo(a) es menor de 18 años. Necesitamos el consentimiento de un adulto responsable para proteger sus datos personales.</p>
          <div class="form-group">
            <label>Nombre del tutor/padre</label>
            <input v-model="registerForm.nombre_tutor" type="text" placeholder="Nombre del adulto responsable" :required="isMenor" />
          </div>
          <div class="form-group">
            <label>Email del tutor/padre</label>
            <input v-model="registerForm.email_tutor" type="email" placeholder="email.del.adulto@example.com" :required="isMenor" />
          </div>
          <div class="consent-check">
            <input id="consent" v-model="registerForm.consentimiento" type="checkbox" :required="isMenor" />
            <label for="consent">
              Autorizo el tratamiento de los datos personales de mi hijo(a) según la
              <strong>Ley 1581 de 2012</strong> (Protección de Datos Personales en Colombia) y la
              política de privacidad de Codexia.
            </label>
          </div>
        </div>

        <p v-if="registerError" class="error-msg">{{ registerError }}</p>
        <button type="submit" class="btn-primary btn-full" :disabled="isLoading || (isMenor && !registerForm.consentimiento)">
          {{ isLoading ? 'Creando cuenta...' : '¡Crear mi cuenta! ✨' }}
        </button>
      </form>
    </div>

    <div class="login-decoration">
      <div class="floating-emoji" style="--delay: 0s">💻</div>
      <div class="floating-emoji" style="--delay: 1s">⭐</div>
      <div class="floating-emoji" style="--delay: 2s">🎮</div>
      <div class="floating-emoji" style="--delay: 0.5s">🏆</div>
      <div class="floating-emoji" style="--delay: 1.5s">🚀</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/api';
import AccesoDibujos from '@/components/AccesoDibujos.vue';

const router = useRouter();
const authStore = useAuthStore();

// ── SSO Microsoft (cuentas institucionales) ──
const ssoDisponible = ref(false);
const ssoDominios = ref<string[]>([]);
const ssoEntrando = ref(false);

/** Motivos por los que una cuenta comprada no puede entrar (respuesta 402). */
const MOTIVOS_LICENCIA: Record<string, string> = {
  licencia_vencida: 'Tu licencia de Codexia venció. Renuévala para seguir aprendiendo.',
  pago_en_revision: 'Tu pago está en revisión en Mercado Pago. Podrás entrar apenas se apruebe; suele tardar unos minutos.',
  sin_licencia_activa: 'Tu cuenta no tiene una licencia activa. Completa la compra para entrar.',
};
const ofrecerRenovar = ref(false);

const SSO_ERRORES: Record<string, string> = {
  dominio: 'Esa cuenta de Microsoft no es del colegio. Entra con tu correo institucional.',
  cancelado: 'Cancelaste el inicio de sesión con Microsoft.',
  sin_cuenta: 'Tu cuenta de Microsoft es válida, pero todavía no tienes acceso a Codexia. Pídeselo a tu profesor.',
  bloqueado: 'Tu cuenta está bloqueada. Habla con tu profesor.',
  validacion: 'No pudimos validar tu identidad con Microsoft. Inténtalo de nuevo.',
  state_invalido: 'El intento de ingreso caducó. Vuelve a pulsar el botón de Microsoft.',
  respuesta_incompleta: 'Microsoft devolvió una respuesta incompleta. Inténtalo de nuevo.',
  no_configurado: 'El ingreso con Microsoft no está habilitado en este servidor.',
  microsoft: 'Microsoft rechazó el inicio de sesión. Inténtalo de nuevo.',
};

/** El niño entró con sus dibujos: se guarda la sesión y al mapa. */
async function onEntrarNino(datos: { token: string; user: unknown }): Promise<void> {
  await authStore.loginConToken(datos.token);
  router.push('/mapa');
}

function entrarConMicrosoft(): void {
  ssoEntrando.value = true;
  // Navegación completa (no fetch): el flujo OAuth ocurre en el navegador.
  window.location.href = '/api/auth/microsoft';
}

/** Quita de la barra de direcciones los parámetros del SSO. */
function limpiarUrl(): void {
  const u = new URL(window.location.href);
  u.searchParams.delete('sso_token');
  u.searchParams.delete('sso_error');
  window.history.replaceState({}, '', u.pathname + (u.search || '') + u.hash);
}

onMounted(async () => {
  const params = new URLSearchParams(window.location.search);
  const motivoLicencia = params.get('licencia');
  if (motivoLicencia) {
    loginError.value = MOTIVOS_LICENCIA[motivoLicencia] ?? MOTIVOS_LICENCIA.sin_licencia_activa;
    ofrecerRenovar.value = motivoLicencia !== 'pago_en_revision';
    const u = new URL(window.location.href);
    u.searchParams.delete('licencia');
    window.history.replaceState({}, '', u.pathname + (u.search || '') + u.hash);
  }
  const tokenSso = params.get('sso_token');
  const errorSso = params.get('sso_error');

  if (errorSso) {
    loginError.value = SSO_ERRORES[errorSso] ?? 'No se pudo iniciar sesión con Microsoft.';
    limpiarUrl();
  } else if (tokenSso) {
    // El token solo pasa por la URL una vez: se guarda y se borra del historial.
    limpiarUrl();
    isLoading.value = true;
    try {
      await authStore.loginConToken(tokenSso);
      router.push(authStore.user?.rol === 'docente' || authStore.user?.rol === 'admin' ? '/docente' : '/mapa');
      return;
    } catch {
      loginError.value = 'Tu sesión de Microsoft no pudo abrirse. Inténtalo de nuevo.';
    } finally {
      isLoading.value = false;
    }
  }

  try {
    const estado = await authApi.ssoMicrosoftEstado();
    ssoDisponible.value = estado.disponible;
    ssoDominios.value = estado.dominios ?? [];
  } catch {
    ssoDisponible.value = false; // sin SSO el login normal sigue funcionando
  }
});

const activeTab = ref<'login' | 'register' | 'ninos'>('login');
const isLoading = ref(false);
const loginError = ref('');
const registerError = ref('');

const loginForm = ref({ email: '', password: '' });
const registerForm = ref({
  nombre: '',
  email: '',
  password: '',
  fecha_nacimiento: '',
  banda_edad: '' as string,
  nombre_tutor: '',
  email_tutor: '',
  consentimiento: false,
});

const bandas = [
  { id: 'exploradores', nombre: 'Exploradores', edades: '6-7 años', icono: '🌱' },
  { id: 'aventureros', nombre: 'Aventureros', edades: '8-10 años', icono: '⚔️' },
  { id: 'heroes', nombre: 'Héroes', edades: '11-12 años', icono: '🦸' },
];

const isMenor = computed(() => {
  if (!registerForm.value.fecha_nacimiento) return false;
  const birth = new Date(registerForm.value.fecha_nacimiento);
  const age = Math.floor((Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  return age < 18;
});

function fillDemo(tipo: 'estudiante' | 'docente') {
  if (tipo === 'estudiante') {
    loginForm.value = { email: 'sofia@besmart.edu.co', password: 'demo1234' };
  } else {
    loginForm.value = { email: 'docente@besmart.edu.co', password: 'demo1234' };
  }
}

async function handleLogin() {
  isLoading.value = true;
  loginError.value = '';
  ofrecerRenovar.value = false;
  try {
    await authStore.login(loginForm.value.email, loginForm.value.password);
    const redirect = router.currentRoute.value.query.redirect as string;
    await router.push(redirect || '/mapa');
  } catch (e: any) {
    loginError.value = e.error ?? e.message ?? 'Error al iniciar sesión';
    // Credenciales correctas pero sin licencia vigente: se ofrece renovar.
    if (e.motivo && e.motivo !== 'pago_en_revision') ofrecerRenovar.value = true;
  } finally {
    isLoading.value = false;
  }
}

async function handleRegister() {
  isLoading.value = true;
  registerError.value = '';
  try {
    await authStore.register({
      ...registerForm.value,
      rol: 'estudiante',
    });
    await router.push('/mapa');
  } catch (e: any) {
    registerError.value = e.message ?? e.error ?? 'Error al crear la cuenta';
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
  overflow: hidden;
}

.login-container {
  background: white;
  border-radius: 24px;
  padding: 2rem;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  position: relative;
  z-index: 2;
}

.login-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.logo {
  font-size: 3rem;
  display: block;
  margin-bottom: 0.5rem;
}

.app-title {
  font-family: 'Fredoka One', sans-serif;
  font-size: 2.5rem;
  color: #6B46C1;
  margin: 0;
}

.app-subtitle {
  color: #6B7280;
  font-size: 1rem;
  margin: 0.25rem 0 0;
}

.tab-buttons {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  background: #F3F4F6;
  border-radius: 12px;
  padding: 4px;
}

.tab-btn {
  flex: 1;
  padding: 0.6rem 1rem;
  border: none;
  background: transparent;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #6B7280;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background: white;
  color: #6B46C1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
}

.form-group input {
  padding: 0.75rem 1rem;
  border: 2px solid #E5E7EB;
  border-radius: 12px;
  font-size: 1rem;
  transition: border-color 0.2s;
  font-family: inherit;
}

.form-group input:focus {
  outline: none;
  border-color: #8B5CF6;
}

.banda-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.banda-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 0.5rem;
  border: 2px solid #E5E7EB;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  gap: 0.2rem;
}

.banda-btn.selected {
  border-color: #8B5CF6;
  background: #F5F3FF;
}

.banda-icon { font-size: 1.5rem; }
.banda-nombre { font-weight: 700; font-size: 0.8rem; color: #374151; }
.banda-edad { font-size: 0.7rem; color: #6B7280; }

.consent-box {
  background: #FFFBEB;
  border: 2px solid #FCD34D;
  border-radius: 12px;
  padding: 1rem;
}

.consent-box h3 {
  font-size: 0.9rem;
  color: #92400E;
  margin: 0 0 0.5rem;
}

.consent-box p {
  font-size: 0.85rem;
  color: #78350F;
  margin: 0 0 0.75rem;
}

.consent-check {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.consent-check input { margin-top: 3px; }
.consent-check label { font-size: 0.8rem; color: #374151; line-height: 1.4; }

.btn-full { width: 100%; padding: 1rem; font-size: 1.1rem; }

.error-msg {
  background: #FEE2E2;
  color: #991B1B;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  margin: 0;
}

.sso-sep {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.1rem 0 0.9rem;
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.8rem;
}
.sso-sep::before,
.sso-sep::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.18);
}
.btn-microsoft {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: #fff;
  color: #1f2937;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s, filter 0.15s;
}
.btn-microsoft:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.28);
}
.btn-microsoft:disabled { opacity: 0.6; cursor: not-allowed; }
.ms-logo { width: 20px; height: 20px; flex-shrink: 0; }
.sso-nota {
  margin: 0.6rem 0 0;
  text-align: center;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
}
.sso-nota strong { color: rgba(255, 255, 255, 0.85); }

.form-card--ninos { padding-top: 1.2rem; }

.btn-renovar {
  display: block;
  text-align: center;
  padding: 0.8rem 1rem;
  border-radius: 12px;
  background: linear-gradient(135deg, #16A34A, #22C55E);
  color: #fff;
  font-weight: 800;
  text-decoration: none;
}
.btn-renovar:hover { filter: brightness(1.08); }

.demo-credentials {
  text-align: center;
  border-top: 1px solid #E5E7EB;
  padding-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.demo-credentials p {
  margin: 0;
  font-size: 0.85rem;
  color: #6B7280;
}

.btn-sm { padding: 0.4rem 0.8rem; font-size: 0.8rem; }

.login-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.floating-emoji {
  position: absolute;
  font-size: 2rem;
  animation: floatEmoji 4s ease-in-out infinite;
  animation-delay: var(--delay);
  opacity: 0.4;
}

.floating-emoji:nth-child(1) { top: 10%; left: 8%; }
.floating-emoji:nth-child(2) { top: 20%; right: 6%; }
.floating-emoji:nth-child(3) { bottom: 15%; left: 5%; }
.floating-emoji:nth-child(4) { bottom: 25%; right: 8%; }
.floating-emoji:nth-child(5) { top: 60%; left: 3%; }

@keyframes floatEmoji {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(10deg); }
}
</style>
