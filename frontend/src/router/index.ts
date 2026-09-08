import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false, transition: 'fade' },
    },
    {
      path: '/mapa',
      name: 'mapa',
      component: () => import('@/views/WorldMapView.vue'),
      meta: { requiresAuth: true, transition: 'slide' },
    },
    {
      path: '/nivel/:levelId',
      name: 'nivel',
      component: () => import('@/views/LevelView.vue'),
      meta: { requiresAuth: true, transition: 'slide' },
    },
    {
      path: '/tienda',
      name: 'tienda',
      component: () => import('@/views/StoreView.vue'),
      meta: { requiresAuth: true, transition: 'fade' },
    },
    {
      path: '/docente',
      name: 'docente',
      component: () => import('@/views/TeacherDashboard.vue'),
      meta: { requiresAuth: true, requiresRole: 'docente', transition: 'fade' },
    },
    {
      path: '/perfil',
      name: 'perfil',
      component: () => import('@/views/ProfileView.vue'),
      meta: { requiresAuth: true, transition: 'fade' },
    },
    // ───── PREESCOLAR: acceso sin login solo conociendo la ruta ─────
    {
      path: '/preescolar',
      name: 'preescolar',
      component: () => import('@/views/PreescolarHome.vue'),
      meta: { requiresAuth: false, transition: 'fade' },
    },
    {
      path: '/preescolar/:categoria',
      name: 'preescolar-mapa',
      component: () => import('@/views/PreescolarMapa.vue'),
      meta: { requiresAuth: false, transition: 'slide' },
    },
    {
      path: '/preescolar/nivel/:levelId',
      name: 'preescolar-nivel',
      component: () => import('@/views/PreescolarActivityView.vue'),
      meta: { requiresAuth: false, transition: 'slide' },
    },
    {
      path: '/juegos',
      name: 'juegos',
      component: () => import('@/views/juegos/JuegosHome.vue'),
      meta: { requiresAuth: true, transition: 'fade' },
    },
    {
      path: '/juegos/roll-ball-up',
      name: 'roll-ball-up',
      component: () => import('@/views/juegos/RollBallUp.vue'),
      meta: { requiresAuth: true, transition: 'fade' },
    },
    {
      path: '/juegos/arrow-path',
      name: 'arrow-path',
      component: () => import('@/views/juegos/ArrowPath.vue'),
      meta: { requiresAuth: true, transition: 'fade' },
    },
    {
      path: '/juegos/memo-flash',
      name: 'memo-flash',
      component: () => import('@/views/juegos/MemoFlash.vue'),
      meta: { requiresAuth: true, transition: 'fade' },
    },
    {
      path: '/juegos/mind-snake',
      name: 'mind-snake',
      component: () => import('@/views/juegos/MindSnake.vue'),
      meta: { requiresAuth: true, transition: 'fade' },
    },
    {
      path: '/juegos/memo-tablas',
      name: 'memo-tablas',
      component: () => import('@/views/juegos/MemoTablas.vue'),
      meta: { requiresAuth: true, transition: 'fade' },
    },
    {
      path: '/juegos/lee-hora',
      name: 'lee-hora',
      component: () => import('@/views/juegos/RelojHora.vue'),
      meta: { requiresAuth: true, transition: 'fade' },
    },
    {
      path: '/juegos/bloque-3d',
      name: 'bloque-3d',
      component: () => import('@/views/juegos/Bloque3D.vue'),
      meta: { requiresAuth: true, transition: 'fade' },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } });
  }

  if (!to.meta.requiresAuth && authStore.isAuthenticated && to.name === 'login') {
    return next({ name: 'mapa' });
  }

  if (to.meta.requiresRole && authStore.user?.rol !== to.meta.requiresRole && authStore.user?.rol !== 'admin') {
    return next({ name: 'mapa' });
  }

  next();
});

export default router;
