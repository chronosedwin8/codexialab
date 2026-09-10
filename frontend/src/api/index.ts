import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Adjuntar JWT en cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bs_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Manejar 401: logout automático solo si ya había sesión activa (no durante login)
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const hasToken = !!localStorage.getItem('bs_token');
    const isLoginEndpoint = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
    if (error.response?.status === 401 && hasToken && !isLoginEndpoint) {
      localStorage.removeItem('bs_token');
      localStorage.removeItem('bs_user');
      window.location.href = '/app';
    }
    return Promise.reject(error.response?.data ?? error);
  }
);

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  // Acceso a Preescolar sin login (niños sin correo): devuelve token de cuenta invitada
  preescolar: async () => {
    const res = await api.post('/auth/preescolar');
    return res.data;
  },
  register: async (payload: object) => {
    const res = await api.post('/auth/register', payload);
    return res.data;
  },
  me: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  refresh: async () => {
    const res = await api.post('/auth/refresh');
    return res.data;
  },
  consent: async (payload: object) => {
    const res = await api.post('/auth/consent', payload);
    return res.data;
  },
  updateAvatar: async (avatarConfig: object) => {
    const res = await api.put('/store/avatar', { avatar_config: avatarConfig });
    return res.data;
  },
};

export const curriculumApi = {
  getWorlds: async (categoria = 'programacion') => {
    const res = await api.get('/curriculum/worlds', { params: { categoria } });
    return res.data;
  },
  getCategorias: async () => {
    const res = await api.get('/curriculum/categorias');
    return res.data;
  },
  getWorldLevels: async (worldId: number) => {
    const res = await api.get(`/curriculum/worlds/${worldId}/levels`);
    return res.data;
  },
  getLevel: async (levelId: number) => {
    const res = await api.get(`/curriculum/levels/${levelId}`);
    return res.data;
  },
  getProgress: async (userId: number) => {
    const res = await api.get(`/curriculum/progress/${userId}`);
    return res.data;
  },
  // Estadísticas propias del estudiante (Mi Progreso)
  getMisEstadisticas: async () => (await api.get('/curriculum/mis-estadisticas')).data,
};

export const sessionsApi = {
  start: async (levelId: number, modalidad: string) => {
    const res = await api.post('/sessions/start', { nivel_id: levelId, modalidad });
    return res.data;
  },
  update: async (sessionId: number, payload: object) => {
    const res = await api.put(`/sessions/${sessionId}`, payload);
    return res.data;
  },
  complete: async (sessionId: number, payload: object) => {
    const res = await api.post(`/sessions/${sessionId}/complete`, payload);
    return res.data;
  },
};

export const submissionsApi = {
  create: async (payload: {
    sesion_id: number;
    nivel_id: number;
    codigo: string;
    origen: string;
    resultado: object;
    tiempo_ejecucion_ms?: number;
  }) => {
    const res = await api.post('/submissions', payload);
    return res.data;
  },
  getByLevel: async (levelId: number) => {
    const res = await api.get(`/submissions/level/${levelId}`);
    return res.data;
  },
};

export const storeApi = {
  getItems: async () => {
    const res = await api.get('/store/items');
    return res.data;
  },
  purchase: async (itemId: number) => {
    const res = await api.post('/store/purchase', { item_id: itemId });
    return res.data;
  },
  getInventory: async (userId: number) => {
    const res = await api.get(`/store/inventory/${userId}`);
    return res.data;
  },
};

export const teacherApi = {
  getClassrooms: async () => {
    const res = await api.get('/teacher/classrooms');
    return res.data;
  },
  createClassroom: async (payload: object) => {
    const res = await api.post('/teacher/classrooms', payload);
    return res.data;
  },
  getStudents: async (classroomId: number) => {
    const res = await api.get(`/teacher/classrooms/${classroomId}/students`);
    return res.data;
  },
  getProgress: async (classroomId: number, filters?: object) => {
    const res = await api.get(`/teacher/classrooms/${classroomId}/progress`, { params: filters });
    return res.data;
  },
  // Matriz de seguimiento: estudiante × mundo con % completado
  getMatriz: async (classroomId: number, categoria?: string) =>
    (await api.get(`/teacher/classrooms/${classroomId}/matriz`, { params: { categoria } })).data,
  // Ficha de seguimiento de un estudiante: nivel por nivel + ranking en el aula
  getFichaEstudiante: async (classroomId: number, studentId: number, categoria?: string) =>
    (await api.get(`/teacher/classrooms/${classroomId}/estudiante/${studentId}/detalle`, { params: { categoria } })).data,
  enrollStudent: async (classroomId: number, studentId: number) => {
    const res = await api.post(`/teacher/classrooms/${classroomId}/enroll`, { estudiante_id: studentId });
    return res.data;
  },
  // Phidias: los estudiantes matriculados llegan agrupados por Klasse y forman los grupos de la app
  getPhidiasKlassen: async (year?: number) => (await api.get('/teacher/phidias/klassen', { params: { year } })).data,
  importPhidias: async (payload: { seccion_ids: number[]; institucion_id?: number; year?: number; password?: string }) =>
    (await api.post('/teacher/phidias/import', payload)).data,
  // Grupos mixtos: lista plana de estudiantes (ordenada por apellido) + creación por selección individual
  getPhidiasEstudiantes: async (q?: string, year?: number) => (await api.get('/teacher/phidias/estudiantes', { params: { q, year } })).data,
  importPhidiasMixto: async (payload: { nombre: string; phidias_ids: number[]; institucion_id?: number; year?: number; password?: string }) =>
    (await api.post('/teacher/phidias/import-mixto', payload)).data,
  // Sedes
  getSedes: async () => (await api.get('/teacher/sedes')).data,
  createSede: async (payload: { nombre: string; ciudad?: string }) => (await api.post('/teacher/sedes', payload)).data,
  // Estudiantes
  getAllStudents: async (q?: string) => (await api.get('/teacher/students', { params: { q } })).data,
  createStudent: async (payload: { nombre: string; email: string; password: string; banda_edad?: string; aula_id?: number }) =>
    (await api.post('/teacher/students', payload)).data,
  // Asignaciones
  getAssignments: async () => (await api.get('/teacher/assignments')).data,
  createAssignment: async (payload: object) => (await api.post('/teacher/assignments', payload)).data,
  deleteAssignment: async (id: number) => (await api.delete(`/teacher/assignments/${id}`)).data,
  getMyAssignments: async () => (await api.get('/teacher/my-assignments')).data,
  // Carga masiva, progreso de asignación y estadísticas
  bulkStudents: async (payload: { aula_id?: number; banda_edad?: string; estudiantes: Array<{ nombre: string; email?: string; password?: string }> }) =>
    (await api.post('/teacher/students/bulk', payload)).data,
  getAssignmentProgress: async (id: number) => (await api.get(`/teacher/assignments/${id}/progress`)).data,
  getStats: async (aulaId?: number) => (await api.get('/teacher/stats', { params: { aula_id: aulaId } })).data,
  // Profesores (un docente crea otros docentes que heredan sus capacidades)
  getTeachers: async () => (await api.get('/teacher/teachers')).data,
  createTeacher: async (payload: { nombre: string; email: string; password: string }) => (await api.post('/teacher/teachers', payload)).data,
  // Bloqueo de acceso
  blockStudent: async (id: number, bloquear: boolean) => (await api.post(`/teacher/students/${id}/bloqueo`, { bloquear })).data,
  blockClassroom: async (id: number, bloquear: boolean) => (await api.post(`/teacher/classrooms/${id}/bloqueo`, { bloquear })).data,
  // Cambio masivo de contraseña a todos los estudiantes de un grupo
  resetGroupPasswords: async (id: number, password?: string) => (await api.post(`/teacher/classrooms/${id}/reset-passwords`, { password })).data,
  // Asignación múltiple (mundos / materia completa / niveles)
  assignMulti: async (payload: { aula_id?: number; estudiante_id?: number; categoria?: string; mundo_ids?: number[]; nivel_ids?: number[]; titulo?: string; fecha_limite?: string }) => (await api.post('/teacher/assign-multi', payload)).data,
  // Estadísticas avanzadas con filtros (grupo/materia/mundo)
  getStats2: async (filters?: { aula_id?: number; categoria?: string; mundo_id?: number }) => (await api.get('/teacher/stats2', { params: filters })).data,
  // Dashboard gráfico (tiempo, grupos, mundos, actividades, mejor por mundo)
  getStats3: async (aulaId?: number) => (await api.get('/teacher/stats3', { params: { aula_id: aulaId } })).data,
};

// Zona de Juegos: ranking compartido + records con fecha/hora
export const juegosApi = {
  top: async (juego: string, limit = 5) => (await api.get(`/juegos/${juego}/top`, { params: { limit } })).data,
  misRecords: async (juego: string) => (await api.get(`/juegos/${juego}/mis-records`)).data,
  guardar: async (juego: string, puntos: number, mundo: number) => (await api.post('/juegos/score', { juego, puntos, mundo })).data,
};

export default api;
