import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/api/index';

export interface AvatarConfig {
  color: string;
  sombrero: string | null;
  accesorio: string | null;
  forma?: 'nino' | 'nina';
  mascota?: string | null;
}

export interface User {
  id: number;
  email: string;
  nombre: string;
  rol: 'estudiante' | 'docente' | 'admin';
  banda_edad: 'exploradores' | 'aventureros' | 'heroes' | null;
  modalidad_pref: 'bloques' | 'bloques_texto' | 'texto';
  avatar_config: AvatarConfig;
  monedas: number;
  gemas: number;
  racha_dias: number;
  institucion_id: number | null;
  consentimiento_tutor: boolean;
}

// El backend (Prisma) devuelve camelCase; esta función lo normaliza a la interfaz User (snake_case)
function mapUser(raw: any): User {
  return {
    id: raw.id,
    email: raw.email,
    nombre: raw.nombre,
    rol: raw.rol,
    banda_edad: raw.bandaEdad ?? raw.banda_edad ?? null,
    modalidad_pref: raw.modalidadPref ?? raw.modalidad_pref ?? 'bloques',
    avatar_config: {
      color: 'azul', sombrero: null, accesorio: null, forma: 'nino', mascota: null,
      ...(raw.avatarConfig ?? raw.avatar_config ?? {}),
    },
    monedas: raw.monedas ?? 0,
    gemas: raw.gemas ?? 0,
    racha_dias: raw.rachaDias ?? raw.racha_dias ?? 0,
    institucion_id: raw.institucionId ?? raw.institucion_id ?? null,
    consentimiento_tutor: raw.consentimientoTutor ?? raw.consentimiento_tutor ?? false,
  };
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(JSON.parse(localStorage.getItem('bs_user') ?? 'null'));
  const token = ref<string | null>(localStorage.getItem('bs_token'));

  const isAuthenticated = computed(() => !!token.value && !!user.value);

  function persistState() {
    if (token.value) localStorage.setItem('bs_token', token.value);
    else localStorage.removeItem('bs_token');

    if (user.value) localStorage.setItem('bs_user', JSON.stringify(user.value));
    else localStorage.removeItem('bs_user');
  }

  async function login(email: string, password: string) {
    const data = await authApi.login(email, password);
    token.value = data.token;
    user.value = mapUser(data.user);
    persistState();
    return data;
  }

  async function register(payload: {
    email: string;
    password: string;
    nombre: string;
    rol?: string;
    banda_edad?: string;
    fecha_nacimiento?: string;
    nombre_tutor?: string;
    email_tutor?: string;
    institucion_id?: number;
  }) {
    const data = await authApi.register(payload);
    token.value = data.token;
    user.value = mapUser(data.user);
    persistState();
    return data;
  }

  // Entra a Preescolar como invitado (sin login) si aún no hay sesión.
  async function ensurePreescolar() {
    if (token.value && user.value) return user.value;
    const data = await authApi.preescolar();
    token.value = data.token;
    user.value = mapUser(data.user);
    persistState();
    return user.value;
  }

  async function fetchMe() {
    const data = await authApi.me();
    user.value = mapUser(data.user);
    persistState();
    return user.value;
  }

  async function updateAvatar(avatarConfig: AvatarConfig) {
    await authApi.updateAvatar(avatarConfig);
    if (user.value) {
      user.value.avatar_config = avatarConfig;
      persistState();
    }
  }

  async function submitConsent(payload: {
    usuario_id: number;
    nombre_tutor: string;
    email_tutor: string;
    acepta: boolean;
  }) {
    return authApi.consent(payload);
  }

  function addCoins(amount: number) {
    if (user.value) {
      user.value.monedas += amount;
      persistState();
    }
  }

  function addGems(amount: number) {
    if (user.value) {
      user.value.gemas += amount;
      persistState();
    }
  }

  // Entrada por SSO de Microsoft: el backend ya validó la identidad y nos
  // devolvió un token de Codexia; con él se piden los datos del usuario.
  async function loginConToken(nuevoToken: string) {
    token.value = nuevoToken;
    persistState();
    try {
      await fetchMe();
    } catch (e) {
      // Token inservible: no dejar una sesión a medias.
      logout();
      throw e;
    }
    return user.value;
  }

  function logout() {
    user.value = null;
    token.value = null;
    localStorage.removeItem('bs_token');
    localStorage.removeItem('bs_user');
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    loginConToken,
    logout,
    register,
    ensurePreescolar,
    fetchMe,
    updateAvatar,
    submitConsent,
    addCoins,
    addGems,
  };
});
