<template>
  <div class="store-page">
    <header class="store-header">
      <RouterLink to="/mapa" class="btn-back">← Mapa</RouterLink>
      <h1 class="store-title">🛍️ Tienda de Codexia</h1>
      <div class="balance">
        <span>🪙 {{ authStore.user?.monedas ?? 0 }}</span>
        <span>💎 {{ authStore.user?.gemas ?? 0 }}</span>
      </div>
    </header>

    <div class="store-layout">
      <!-- Preview del avatar -->
      <aside class="avatar-preview-panel">
        <h3>Mi Avatar</h3>
        <AvatarConfig
          :avatar="previewAvatar"
          :inventory="inventory"
          @avatar-changed="updatePreview"
        />
        <button class="btn-primary btn-full" :disabled="!hasChanges" @click="saveAvatar">
          Guardar cambios
        </button>
      </aside>

      <!-- Grid de items -->
      <main class="items-grid-panel">
        <!-- Filtros -->
        <div class="filter-tabs">
          <button
            v-for="cat in categories"
            :key="cat.id"
            :class="['filter-btn', { active: activeCategory === cat.id }]"
            @click="activeCategory = cat.id"
          >
            {{ cat.icon }} {{ cat.label }}
          </button>
        </div>

        <div v-if="isLoading" class="loading-state">Cargando tienda...</div>
        <div v-else class="items-grid">
          <div
            v-for="item in filteredItems"
            :key="item.id"
            :class="['item-card', {
              owned: isOwned(item.id),
              'can-afford': canAfford(item),
              exclusive: item.datos?.exclusivo,
              selected: selectedItem?.id === item.id,
            }]"
            @click="selectItem(item)"
          >
            <div class="item-preview">
              <span class="item-emoji">{{ getItemEmoji(item) }}</span>
              <span v-if="item.datos?.exclusivo" class="exclusive-ribbon">★ Especial</span>
            </div>
            <div class="item-info">
              <p class="item-name">{{ item.nombre }}</p>
              <p class="item-desc">{{ item.descripcion }}</p>
            </div>
            <div class="item-price">
              <span v-if="isOwned(item.id)" class="owned-badge">✅ Tuyo</span>
              <template v-else-if="item.datos?.exclusivo">
                <span class="unlock-hint">🔒 {{ item.datos.comoObtener || 'Gana un Mundo Especial' }}</span>
              </template>
              <template v-else>
                <span v-if="item.costoMonedas > 0" class="price-coin">🪙 {{ item.costoMonedas }}</span>
                <span v-if="item.costoGemas > 0" class="price-gem">💎 {{ item.costoGemas }}</span>
                <button
                  class="btn-buy"
                  :disabled="!canAfford(item)"
                  @click.stop="purchaseItem(item)"
                >
                  {{ canAfford(item) ? 'Comprar' : 'Sin fondos' }}
                </button>
              </template>
            </div>
          </div>
        </div>
      </main>
    </div>

    <div v-if="purchaseMessage" class="purchase-toast" :class="purchaseToastType">
      {{ purchaseMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { storeApi } from '@/api/index';
import AvatarConfig from '@/components/AvatarConfig.vue';
import type { AvatarConfig as AvatarConfigType } from '@/stores/auth';

const authStore = useAuthStore();

interface StoreItem {
  id: number;
  nombre: string;
  tipo: string;
  descripcion: string;
  costoMonedas: number;
  costoGemas: number;
  datos: any;
}

const items = ref<StoreItem[]>([]);
const inventory = ref<any[]>([]);
const isLoading = ref(false);
const activeCategory = ref('todos');
const selectedItem = ref<StoreItem | null>(null);
const purchaseMessage = ref('');
const purchaseToastType = ref<'success' | 'error'>('success');
const previewAvatar = ref<AvatarConfigType>({ ...authStore.user!.avatar_config });
const hasChanges = ref(false);

const categories = [
  { id: 'todos', label: 'Todo', icon: '🎁', tipos: null as string[] | null },
  { id: 'cabeza', label: 'Cabeza', icon: '👑', tipos: ['sombrero', 'corona'] },
  { id: 'accesorio', label: 'Accesorios', icon: '✨', tipos: ['accesorio'] },
  { id: 'color', label: 'Colores', icon: '🎨', tipos: ['color'] },
  { id: 'mascota', label: 'Mascotas', icon: '🐾', tipos: ['mascota'] },
  { id: 'pocion', label: 'Pociones', icon: '🧪', tipos: ['pocion'] },
  { id: 'superpoder', label: 'Poderes', icon: '⚡', tipos: ['superpoder'] },
  { id: 'ram', label: 'Memoria', icon: '💾', tipos: ['ram'] },
  { id: 'sticker', label: 'Stickers', icon: '⭐', tipos: ['sticker'] },
  { id: 'comida', label: 'Comidas', icon: '🍕', tipos: ['comida'] },
  { id: 'gema', label: 'Gemas', icon: '💠', tipos: ['gema'] },
];

const filteredItems = computed(() => {
  const cat = categories.find((c) => c.id === activeCategory.value);
  if (!cat || !cat.tipos) return items.value;
  return items.value.filter((i) => cat.tipos!.includes(i.tipo));
});

function getItemEmoji(item: StoreItem): string {
  if (item.datos?.emoji) return item.datos.emoji;
  const map: Record<string, string> = {
    sombrero: '🎩', corona: '👑', accesorio: '✨', color: '🎨',
    mascota: '🐾', pocion: '🧪', superpoder: '⚡', ram: '💾',
    sticker: '⭐', comida: '🍕', gema: '💠',
  };
  return map[item.tipo] ?? '🎁';
}

function isOwned(itemId: number): boolean {
  return inventory.value.some((i) => i.id === itemId);
}

function canAfford(item: StoreItem): boolean {
  const user = authStore.user;
  if (!user || item.datos?.exclusivo) return false;
  if (item.costoMonedas > 0 && user.monedas < item.costoMonedas) return false;
  if (item.costoGemas > 0 && user.gemas < item.costoGemas) return false;
  return true;
}

function selectItem(item: StoreItem) {
  selectedItem.value = item;
}

function updatePreview(newAvatar: AvatarConfigType) {
  previewAvatar.value = newAvatar;
  hasChanges.value = JSON.stringify(newAvatar) !== JSON.stringify(authStore.user?.avatar_config);
}

async function saveAvatar() {
  await authStore.updateAvatar(previewAvatar.value);
  hasChanges.value = false;
  showToast('¡Avatar guardado!', 'success');
}

async function purchaseItem(item: StoreItem) {
  try {
    const data = await storeApi.purchase(item.id);
    inventory.value.push(item);
    authStore.user!.monedas = data.balance.monedas;
    authStore.user!.gemas = data.balance.gemas;
    showToast(`¡Compraste ${item.nombre}!`, 'success');
  } catch (e: any) {
    showToast(e.error ?? e.response?.data?.error ?? 'Error al comprar', 'error');
  }
}

function showToast(msg: string, type: 'success' | 'error') {
  purchaseMessage.value = msg;
  purchaseToastType.value = type;
  setTimeout(() => { purchaseMessage.value = ''; }, 3000);
}

// Normaliza un item de la API (camelCase de Prisma) a la forma usada aquí
function normalize(it: any): StoreItem {
  return {
    id: it.id,
    nombre: it.nombre,
    tipo: it.tipo,
    descripcion: it.descripcion,
    costoMonedas: it.costoMonedas ?? it.costo_monedas ?? 0,
    costoGemas: it.costoGemas ?? it.costo_gemas ?? 0,
    datos: it.datos ?? {},
  };
}

onMounted(async () => {
  isLoading.value = true;
  try {
    const [itemsData, invData] = await Promise.all([
      storeApi.getItems(),
      storeApi.getInventory(authStore.user!.id),
    ]);
    items.value = itemsData.items.map(normalize);
    inventory.value = invData.inventory;
  } finally {
    isLoading.value = false;
  }
});
</script>

<style scoped>
.store-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
  display: flex;
  flex-direction: column;
}

.store-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: rgba(0,0,0,0.3);
  color: white;
}

.store-title { font-family: 'Fredoka One', sans-serif; font-size: 1.8rem; margin: 0; flex: 1; text-align: center; }
.balance { display: flex; gap: 1rem; font-weight: 700; color: #FCD34D; }

.store-layout {
  display: flex;
  flex: 1;
  gap: 1rem;
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.avatar-preview-panel {
  width: 260px;
  background: rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex-shrink: 0;
}

.avatar-preview-panel h3 { color: white; margin: 0; text-align: center; }

.items-grid-panel { flex: 1; }

.filter-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 0.5rem 1rem;
  border: 2px solid rgba(255,255,255,0.2);
  background: transparent;
  color: rgba(255,255,255,0.7);
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.filter-btn.active { background: #6B46C1; border-color: #6B46C1; color: white; }

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
}

.item-card {
  background: rgba(255,255,255,0.08);
  border: 2px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.item-card:hover { border-color: rgba(139,92,246,0.5); transform: translateY(-2px); }
.item-card.owned { border-color: #22C55E; opacity: 0.8; }
.item-card.selected { border-color: #8B5CF6; background: rgba(139,92,246,0.2); }
.item-card.exclusive { border-color: #FCD34D; background: rgba(252,211,77,0.08); }

.item-preview {
  position: relative;
  text-align: center;
  font-size: 2.5rem;
  padding: 0.5rem;
  background: rgba(0,0,0,0.2);
  border-radius: 12px;
}

.exclusive-ribbon {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 0.6rem;
  font-weight: 700;
  color: #1e1b4b;
  background: #FCD34D;
  padding: 2px 6px;
  border-radius: 8px;
}

.item-name { color: white; font-weight: 700; font-size: 0.9rem; margin: 0; }
.item-desc { color: rgba(255,255,255,0.6); font-size: 0.75rem; margin: 0; }

.item-price {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
  margin-top: auto;
}

.price-coin { color: #FCD34D; font-weight: 700; font-size: 0.85rem; }
.price-gem { color: #A78BFA; font-weight: 700; font-size: 0.85rem; }
.owned-badge { color: #4ADE80; font-size: 0.85rem; font-weight: 700; }
.unlock-hint { color: #FCD34D; font-size: 0.72rem; font-weight: 600; line-height: 1.3; }

.btn-buy {
  padding: 0.3rem 0.75rem;
  background: #6B46C1;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s;
  margin-left: auto;
}

.btn-buy:hover:not(:disabled) { background: #7C3AED; }
.btn-buy:disabled { background: #374151; cursor: not-allowed; }

.loading-state { color: rgba(255,255,255,0.7); text-align: center; padding: 2rem; }
.btn-full { width: 100%; }

.purchase-toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  font-weight: 700;
  font-size: 1rem;
  z-index: 1000;
  animation: slideIn 0.3s ease;
}

.purchase-toast.success { background: #16A34A; color: white; }
.purchase-toast.error { background: #DC2626; color: white; }

@keyframes slideIn {
  from { transform: translateX(100px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@media (max-width: 768px) {
  .store-layout { flex-direction: column; }
  .avatar-preview-panel { width: 100%; }
}
</style>
