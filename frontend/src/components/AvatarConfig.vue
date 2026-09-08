<template>
  <div class="avatar-config" :class="{ mini }">
    <!-- Preview SVG del avatar -->
    <div class="avatar-preview" v-if="!mini">
      <svg viewBox="0 0 100 130" width="120" height="156" xmlns="http://www.w3.org/2000/svg">
        <!-- Coletas (solo niña), detrás de la cabeza -->
        <g v-if="esNina">
          <ellipse cx="26" cy="48" rx="8" ry="13" :fill="bodyColor" />
          <ellipse cx="74" cy="48" rx="8" ry="13" :fill="bodyColor" />
          <circle cx="26" cy="62" r="4" fill="#FCD34D" />
          <circle cx="74" cy="62" r="4" fill="#FCD34D" />
        </g>

        <!-- Cuerpo -->
        <rect x="30" y="60" width="40" height="45" rx="8" :fill="bodyColor" />
        <!-- Falda (solo niña) -->
        <polygon v-if="esNina" points="30,82 70,82 80,108 20,108" :fill="bodyColor" />
        <!-- Cabeza -->
        <circle cx="50" cy="45" r="22" :fill="bodyColor" />
        <!-- Flequillo (solo niña) -->
        <path v-if="esNina" d="M 28 40 Q 50 18 72 40 Q 60 30 50 32 Q 40 30 28 40 Z" :fill="darken(bodyColor)" opacity="0.55" />
        <!-- Ojos -->
        <circle cx="43" cy="42" r="4" fill="white" />
        <circle cx="57" cy="42" r="4" fill="white" />
        <circle cx="44" cy="43" r="2" fill="#1F2937" />
        <circle cx="58" cy="43" r="2" fill="#1F2937" />
        <!-- Pestañas (solo niña) -->
        <g v-if="esNina" stroke="#1F2937" stroke-width="1" stroke-linecap="round">
          <line x1="39" y1="39" x2="37" y2="37" />
          <line x1="61" y1="39" x2="63" y2="37" />
        </g>
        <!-- Boca -->
        <path d="M 44 52 Q 50 57 56 52" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" />
        <!-- Brazos -->
        <rect x="12" y="62" width="14" height="8" rx="4" :fill="bodyColor" />
        <rect x="74" y="62" width="14" height="8" rx="4" :fill="bodyColor" />
        <!-- Piernas -->
        <rect x="33" y="100" width="13" height="15" rx="4" :fill="bodyColor" />
        <rect x="54" y="100" width="13" height="15" rx="4" :fill="bodyColor" />

        <!-- Sombrero/Corona personalizado por SVG -->
        <g v-if="currentAvatar.sombrero === 'sombrero_mago'">
          <polygon points="50,10 35,32 65,32" :fill="'#4B0082'" />
          <rect x="30" y="30" width="40" height="6" rx="3" fill="#6B21A8" />
          <circle cx="50" cy="12" r="2" fill="#FCD34D" />
        </g>
        <g v-else-if="currentAvatar.sombrero === 'corona_dorada' || currentAvatar.sombrero === 'corona_real'">
          <polygon points="35,30 42,18 50,26 58,18 65,30" fill="#EAB308" />
          <rect x="33" y="29" width="34" height="5" rx="2" fill="#CA8A04" />
        </g>
        <!-- Otros sombreros/coronas: emoji sobre la cabeza -->
        <text v-else-if="currentAvatar.sombrero" x="50" y="22" font-size="22" text-anchor="middle">{{ headEmoji }}</text>

        <!-- Accesorio: gafas -->
        <g v-if="currentAvatar.accesorio === 'gafas_sol'">
          <rect x="36" y="39" width="10" height="7" rx="2" fill="rgba(0,0,0,0.5)" stroke="#FCD34D" stroke-width="1" />
          <rect x="54" y="39" width="10" height="7" rx="2" fill="rgba(0,0,0,0.5)" stroke="#FCD34D" stroke-width="1" />
          <line x1="46" y1="42.5" x2="54" y2="42.5" stroke="#FCD34D" stroke-width="1" />
        </g>
        <!-- Capa -->
        <g v-else-if="currentAvatar.accesorio === 'capa_heroe'">
          <path d="M 30 68 Q 15 90 25 105 L 75 105 Q 85 90 70 68 Z" fill="#DC2626" opacity="0.8" />
        </g>
        <!-- Otros accesorios: emoji al lado -->
        <text v-else-if="currentAvatar.accesorio" x="12" y="95" font-size="18" text-anchor="middle">{{ accesorioEmoji }}</text>

        <!-- Mascota acompañante -->
        <text v-if="currentAvatar.mascota" x="84" y="112" font-size="22" text-anchor="middle">{{ mascotaEmoji }}</text>
      </svg>
    </div>

    <!-- Mini avatar (solo cabeza) -->
    <div v-else class="avatar-mini-circle" :style="{ background: bodyColor }">
      <span style="font-size: 1.2rem">{{ avatarEmoji }}</span>
    </div>

    <!-- Selectores (solo cuando no es mini) -->
    <div v-if="!mini" class="selectors">
      <div class="selector-group">
        <label>Personaje</label>
        <div class="item-options">
          <button
            :class="['item-opt', { selected: !esNina }]"
            title="Niño"
            @click="updateForma('nino')"
          >🧒</button>
          <button
            :class="['item-opt', { selected: esNina }]"
            title="Niña"
            @click="updateForma('nina')"
          >👧</button>
        </div>
      </div>

      <div class="selector-group">
        <label>Color</label>
        <div class="color-options">
          <button
            v-for="c in colors"
            :key="c.id"
            :class="['color-dot', { selected: currentAvatar.color === c.id }]"
            :style="{ background: c.hex }"
            :title="c.nombre"
            @click="updateColor(c.id)"
          ></button>
        </div>
      </div>

      <div class="selector-group">
        <label>Sombrero y Corona</label>
        <div class="item-options">
          <button
            :class="['item-opt', { selected: !currentAvatar.sombrero }]"
            @click="updateSombrero(null)"
          >❌</button>
          <button
            v-for="item in sombreros"
            :key="item.id"
            :class="['item-opt', { selected: currentAvatar.sombrero === item.id, locked: !isUnlocked(item.id) }]"
            :title="item.nombre + (isUnlocked(item.id) ? '' : ' (bloqueado)')"
            @click="isUnlocked(item.id) && updateSombrero(item.id)"
          >{{ item.emoji }}</button>
        </div>
      </div>

      <div class="selector-group">
        <label>Accesorio</label>
        <div class="item-options">
          <button
            :class="['item-opt', { selected: !currentAvatar.accesorio }]"
            @click="updateAccesorio(null)"
          >❌</button>
          <button
            v-for="item in accesorios"
            :key="item.id"
            :class="['item-opt', { selected: currentAvatar.accesorio === item.id, locked: !isUnlocked(item.id) }]"
            :title="item.nombre + (isUnlocked(item.id) ? '' : ' (bloqueado)')"
            @click="isUnlocked(item.id) && updateAccesorio(item.id)"
          >{{ item.emoji }}</button>
        </div>
      </div>

      <div class="selector-group">
        <label>Mascota</label>
        <div class="item-options">
          <button
            :class="['item-opt', { selected: !currentAvatar.mascota }]"
            @click="updateMascota(null)"
          >❌</button>
          <button
            v-for="item in mascotas"
            :key="item.id"
            :class="['item-opt', { selected: currentAvatar.mascota === item.id, locked: !isUnlocked(item.id) }]"
            :title="item.nombre + (isUnlocked(item.id) ? '' : ' (bloqueado)')"
            @click="isUnlocked(item.id) && updateMascota(item.id)"
          >{{ item.emoji }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { AvatarConfig } from '@/stores/auth';

const props = defineProps<{
  avatar: AvatarConfig;
  mini?: boolean;
  inventory?: any[];
}>();

const emit = defineEmits<{
  'avatar-changed': [config: AvatarConfig];
}>();

const currentAvatar = ref<AvatarConfig>({ forma: 'nino', mascota: null, ...props.avatar });

const colors = [
  { id: 'azul', nombre: 'Azul', hex: '#3B82F6' },
  { id: 'rojo', nombre: 'Rojo', hex: '#EF4444' },
  { id: 'verde', nombre: 'Verde', hex: '#22C55E' },
  { id: 'dorado', nombre: 'Dorado', hex: '#EAB308' },
  { id: 'morado', nombre: 'Morado', hex: '#8B5CF6' },
  { id: 'naranja', nombre: 'Naranja', hex: '#F97316' },
  { id: 'rosa', nombre: 'Rosa', hex: '#EC4899' },
  { id: 'cyan', nombre: 'Cyan', hex: '#06B6D4' },
];

// Items que ocupan la "cabeza" (sombreros + coronas comparten slot)
const sombreros = [
  { id: 'sombrero_mago', nombre: 'Sombrero Mago', emoji: '🎩' },
  { id: 'corona_dorada', nombre: 'Corona Dorada', emoji: '👑' },
  { id: 'corona_joya', nombre: 'Corona de Joyas', emoji: '💎' },
  { id: 'corona_real', nombre: 'Corona Real', emoji: '👑' },
  { id: 'tiara_princesa', nombre: 'Tiara de Princesa', emoji: '👸' },
  { id: 'corona_campeon', nombre: 'Corona de Campeón', emoji: '🏆' },
  { id: 'gorro_fiesta', nombre: 'Gorro de Fiesta', emoji: '🥳' },
  { id: 'diadema_flor', nombre: 'Diadema de Flores', emoji: '🌸' },
];

const accesorios = [
  { id: 'gafas_sol', nombre: 'Gafas de Sol', emoji: '🕶️' },
  { id: 'capa_heroe', nombre: 'Capa Héroe', emoji: '🦸' },
  { id: 'alas_hada', nombre: 'Alas de Hada', emoji: '🧚' },
  { id: 'mochila_cohete', nombre: 'Mochila Cohete', emoji: '🚀' },
];

const mascotas = [
  { id: 'dragon_bebe', nombre: 'Dragón Bebé', emoji: '🐉' },
  { id: 'gatito_robot', nombre: 'Gatito Robot', emoji: '🐱' },
  { id: 'buho_sabio', nombre: 'Búho Sabio', emoji: '🦉' },
  { id: 'unicornio', nombre: 'Unicornio', emoji: '🦄' },
  { id: 'fenix', nombre: 'Fénix Legendario', emoji: '🔥' },
];

const esNina = computed(() => currentAvatar.value.forma === 'nina');

const bodyColor = computed(() => {
  const map: Record<string, string> = {
    azul: '#3B82F6', rojo: '#EF4444', verde: '#22C55E',
    dorado: '#EAB308', morado: '#8B5CF6', naranja: '#F97316',
    rosa: '#EC4899', cyan: '#06B6D4',
  };
  return map[currentAvatar.value.color] ?? '#3B82F6';
});

function darken(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) - 40);
  const g = Math.max(0, ((n >> 8) & 255) - 40);
  const b = Math.max(0, (n & 255) - 40);
  return `rgb(${r},${g},${b})`;
}

const headEmoji = computed(() => sombreros.find((s) => s.id === currentAvatar.value.sombrero)?.emoji ?? '');
const accesorioEmoji = computed(() => accesorios.find((a) => a.id === currentAvatar.value.accesorio)?.emoji ?? '');
const mascotaEmoji = computed(() => mascotas.find((m) => m.id === currentAvatar.value.mascota)?.emoji ?? '');

const avatarEmoji = computed(() => {
  if (currentAvatar.value.sombrero) return headEmoji.value;
  return esNina.value ? '👧' : '🧒';
});

function isUnlocked(itemId: string): boolean {
  if (!props.inventory) return true;
  return props.inventory.some((i) => i.datos?.id === itemId || i.datos?.slot + '_' + i.datos?.id === itemId);
}

function emitChange() {
  emit('avatar-changed', currentAvatar.value);
}

function updateForma(forma: 'nino' | 'nina') {
  currentAvatar.value = { ...currentAvatar.value, forma };
  emitChange();
}

function updateColor(color: string) {
  currentAvatar.value = { ...currentAvatar.value, color };
  emitChange();
}

function updateSombrero(sombrero: string | null) {
  currentAvatar.value = { ...currentAvatar.value, sombrero };
  emitChange();
}

function updateAccesorio(accesorio: string | null) {
  currentAvatar.value = { ...currentAvatar.value, accesorio };
  emitChange();
}

function updateMascota(mascota: string | null) {
  currentAvatar.value = { ...currentAvatar.value, mascota };
  emitChange();
}
</script>

<style scoped>
.avatar-config { display: flex; flex-direction: column; align-items: center; gap: 1rem; }

.avatar-preview {
  background: rgba(0,0,0,0.2);
  border-radius: 16px;
  padding: 1rem;
  display: flex;
  justify-content: center;
}

.avatar-mini-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255,255,255,0.3);
}

.selectors { width: 100%; display: flex; flex-direction: column; gap: 0.75rem; }

.selector-group { display: flex; flex-direction: column; gap: 0.4rem; }

.selector-group label {
  font-size: 0.8rem;
  font-weight: 700;
  color: rgba(255,255,255,0.7);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.color-options { display: flex; gap: 0.4rem; flex-wrap: wrap; }

.color-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  transition: transform 0.15s;
}

.color-dot:hover { transform: scale(1.2); }
.color-dot.selected { border-color: white; transform: scale(1.15); }

.item-options { display: flex; gap: 0.4rem; flex-wrap: wrap; }

.item-opt {
  width: 38px;
  height: 38px;
  background: rgba(255,255,255,0.1);
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-opt:hover:not(.locked) { background: rgba(255,255,255,0.2); }
.item-opt.selected { border-color: #8B5CF6; background: rgba(139,92,246,0.2); }
.item-opt.locked { opacity: 0.4; cursor: not-allowed; filter: grayscale(1); }
</style>
