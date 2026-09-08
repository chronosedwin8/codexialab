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
        <button :class="['tab-btn', { active: activeTab === 'register' }]" @click="activeTab = 'register'">
          Registrarse
        </button>
      </div>

      <!-- Login Form -->
      <form v-if="activeTab === 'login'" class="form-card" @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Correo electrónico</label>
          <input v-model="loginForm.email" type="email" placeholder="tu@email.com" required />
        </div>
        <div class="form-group">
          <label>Contraseña</label>
          <input v-model="loginForm.password" type="password" placeholder="••••••••" required />
        </div>
        <p v-if="loginError" class="error-msg">{{ loginError }}</p>
        <button type="submit" class="btn-primary btn-full" :disabled="isLoading">
          {{ isLoading ? 'Entrando...' : '¡Entrar a Codexia! 🚀' }}
        </button>

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
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const activeTab = ref<'login' | 'register'>('login');
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
  try {
    await authStore.login(loginForm.value.email, loginForm.value.password);
    const redirect = router.currentRoute.value.query.redirect as string;
    await router.push(redirect || '/mapa');
  } catch (e: any) {
    loginError.value = e.message ?? e.error ?? 'Error al iniciar sesión';
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
