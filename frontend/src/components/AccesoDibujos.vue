<template>
  <div class="dib">
    <template v-if="!usuario">
      <label class="dib-campo">
        <span class="dib-etiqueta">Tu nombre de jugador</span>
        <input
          v-model="usuarioBorrador"
          type="text"
          autocomplete="username"
          autocapitalize="none"
          spellcheck="false"
          placeholder="sofia.r"
          @keyup.enter="fijarUsuario"
        />
      </label>
      <p class="dib-ayuda">Te lo dice tu profe. Si no lo recuerdas, pregúntale. 🙂</p>
      <button class="dib-continuar" :disabled="usuarioBorrador.trim().length < 2" @click="fijarUsuario">
        Continuar →
      </button>
    </template>

    <template v-else>
      <p class="dib-hola">¡Hola, <strong>{{ usuario }}</strong>!</p>
      <p class="dib-instruccion">Toca tus cuatro dibujos</p>

      <!-- Huecos: se ve cuántos faltan sin necesidad de leer -->
      <div class="dib-huecos" role="status" :aria-label="`${pin.length} de ${LONGITUD} dibujos`">
        <span
          v-for="i in LONGITUD"
          :key="i"
          class="dib-hueco"
          :class="{ lleno: pin[i - 1] }"
        >{{ pin[i - 1] ? emojiDe(pin[i - 1]) : '' }}</span>
      </div>

      <div class="dib-grilla">
        <button
          v-for="d in DIBUJOS"
          :key="d.id"
          type="button"
          class="dib-boton"
          :aria-label="d.nombre"
          :disabled="enviando"
          @click="tocar(d.id)"
        >{{ d.emoji }}</button>
      </div>

      <p v-if="error" class="dib-error">{{ error }}</p>

      <div class="dib-acciones">
        <button v-if="pin.length > 0" class="dib-sec" :disabled="enviando" @click="borrarUltimo">⌫ Borrar</button>
        <button class="dib-sec" :disabled="enviando" @click="cambiarJugador">Cambiar de jugador</button>
      </div>
      <p v-if="enviando" class="dib-ayuda">Entrando…</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { authApi, mensajeError } from '@/api/index';

/**
 * Acceso para prelectores: nombre de jugador + cuatro dibujos.
 *
 * Los niños que aún no leen no pueden escribir un correo ni una contraseña, pero
 * sí reconocen y recuerdan imágenes. El PIN se envía solo al completar los
 * cuatro: así no hay que pulsar ningún botón de "entrar".
 */
const emit = defineEmits<{ entrar: [payload: { token: string; user: unknown }] }>();

const DIBUJOS = [
  { id: 'gato', emoji: '🐱', nombre: 'gato' },
  { id: 'sol', emoji: '☀️', nombre: 'sol' },
  { id: 'arbol', emoji: '🌳', nombre: 'árbol' },
  { id: 'luna', emoji: '🌙', nombre: 'luna' },
  { id: 'pez', emoji: '🐟', nombre: 'pez' },
  { id: 'flor', emoji: '🌸', nombre: 'flor' },
  { id: 'nube', emoji: '☁️', nombre: 'nube' },
  { id: 'tren', emoji: '🚂', nombre: 'tren' },
  { id: 'pato', emoji: '🦆', nombre: 'pato' },
] as const;
const LONGITUD = 4;

const usuarioBorrador = ref('');
const usuario = ref('');
const pin = ref<string[]>([]);
const enviando = ref(false);
const error = ref('');

const emojiDe = (id: string) => DIBUJOS.find((d) => d.id === id)?.emoji ?? '';

function fijarUsuario(): void {
  const u = usuarioBorrador.value.trim().toLowerCase();
  if (u.length < 2) return;
  usuario.value = u;
  error.value = '';
}

function cambiarJugador(): void {
  usuario.value = '';
  usuarioBorrador.value = '';
  pin.value = [];
  error.value = '';
}

function borrarUltimo(): void {
  pin.value = pin.value.slice(0, -1);
  error.value = '';
}

function tocar(id: string): void {
  if (enviando.value || pin.value.length >= LONGITUD) return;
  error.value = '';
  pin.value = [...pin.value, id];
  if (pin.value.length === LONGITUD) void entrar();
}

async function entrar(): Promise<void> {
  if (enviando.value) return;
  enviando.value = true;
  try {
    const datos = await authApi.loginNino(usuario.value, pin.value);
    emit('entrar', datos);
  } catch (e) {
    // El PIN se borra siempre tras un fallo: volver a tocar cuatro dibujos es
    // más simple para un niño que averiguar cuál se equivocó.
    pin.value = [];
    error.value = mensajeError(e, 'Ese nombre o esos dibujos no coinciden');
  } finally {
    enviando.value = false;
  }
}
</script>

<style scoped>
.dib { display: flex; flex-direction: column; align-items: center; gap: 0.9rem; }

.dib-campo { width: 100%; display: flex; flex-direction: column; gap: 0.4rem; }
.dib-etiqueta { font-weight: 600; color: #374151; font-size: 0.9rem; }
.dib-campo input {
  width: 100%;
  padding: 0.9rem 1rem;
  border-radius: 14px;
  border: 2px solid #E5E7EB;
  background: #fff;
  color: #111827;
  font-family: inherit;
  font-size: 1.15rem;
  text-align: center;
}
.dib-campo input:focus { outline: none; border-color: #8B5CF6; }

.dib-ayuda { margin: 0; font-size: 0.85rem; color: #6B7280; text-align: center; }
.dib-hola { margin: 0; font-size: 1.05rem; color: #4B5563; }
.dib-hola strong { color: #6B46C1; }
.dib-instruccion {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: #1F2937;
  text-align: center;
}

.dib-continuar {
  width: 100%;
  padding: 0.9rem;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #16A34A, #22C55E);
  color: #fff;
  font-family: inherit;
  font-size: 1.05rem;
  font-weight: 800;
  cursor: pointer;
}
.dib-continuar:disabled { opacity: 0.45; cursor: not-allowed; }

/* Huecos del PIN: se ve cuantos faltan sin necesidad de leer */
.dib-huecos { display: flex; gap: 0.6rem; }
.dib-hueco {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  border: 3px dashed #64748B;
  display: grid;
  place-items: center;
  font-size: 2rem;
  background: #F8FAFC;
  transition: all 0.2s;
}
.dib-hueco.lleno {
  border-style: solid;
  border-color: #B45309;
  background: #FEF3C7;
  animation: dibPop 0.25s cubic-bezier(0.34, 1.6, 0.64, 1);
}
@keyframes dibPop { from { transform: scale(0.6); } to { transform: scale(1); } }

/* Grilla 3x3, botones grandes para dedos pequenos */
.dib-grilla {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.7rem;
  width: 100%;
  max-width: 330px;
}
.dib-boton {
  aspect-ratio: 1;
  border-radius: 20px;
  border: 2px solid #E5E7EB;
  background: #fff;
  font-size: clamp(2rem, 9vw, 2.8rem);
  cursor: pointer;
  transition: transform 0.12s, box-shadow 0.12s, border-color 0.12s;
  display: grid;
  place-items: center;
  line-height: 1;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}
.dib-boton:hover:not(:disabled) {
  transform: translateY(-3px) scale(1.04);
  border-color: #A78BFA;
  box-shadow: 0 10px 22px rgba(107, 70, 193, 0.22);
}
.dib-boton:active:not(:disabled) { transform: scale(0.94); }
.dib-boton:disabled { opacity: 0.6; cursor: default; }

.dib-error {
  margin: 0;
  padding: 0.6rem 0.9rem;
  border-radius: 12px;
  background: #FEE2E2;
  border: 1px solid #FCA5A5;
  color: #B91C1C;
  font-size: 0.9rem;
  font-weight: 700;
  text-align: center;
}

.dib-acciones { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; }
.dib-sec {
  padding: 0.55rem 1rem;
  border-radius: 12px;
  border: 1px solid #D1D5DB;
  background: #F9FAFB;
  color: #374151;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
}
.dib-sec:hover:not(:disabled) { background: #F3F4F6; border-color: #9CA3AF; }
.dib-sec:disabled { opacity: 0.5; }

@media (max-width: 420px) {
  .dib-hueco { width: 48px; height: 48px; font-size: 1.7rem; }
}
</style>
