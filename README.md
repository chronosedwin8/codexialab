# Codexia - Plataforma Educativa Gamificada de Programación

Plataforma educativa gamificada para enseñar programación a niños de 6-12 años. Combina mecánicas de videojuego (mapa-mundo, estrellas, monedas, avatares) con editores de código por bloques y texto.

## Arquitectura

```
Codexia/
├── backend/           Node.js + Fastify + TypeScript + Prisma
│   ├── prisma/        Schema de base de datos (ORM)
│   └── src/
│       ├── plugins/   Fastify plugins (JWT auth)
│       └── routes/    API REST endpoints
├── frontend/          Vue 3 + Pinia + Vite + TypeScript
│   └── src/
│       ├── api/       Cliente axios centralizado
│       ├── components/ Componentes reutilizables
│       ├── composables/ useAudio, useLevelRunner
│       ├── game/      PhaserRenderer, tipos TypeScript
│       ├── levels/    JSON de configuración de niveles
│       ├── router/    Vue Router con guards de auth
│       ├── stores/    Pinia: auth, game, curriculum
│       ├── styles/    CSS global con variables y animaciones
│       ├── views/     Páginas principales
│       └── workers/   Web Worker para ejecución segura de código
└── database/          Schema SQL de PostgreSQL
```

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + TypeScript + Fastify 4 |
| ORM | Prisma + PostgreSQL 15 |
| Auth | JWT (@fastify/jwt) + bcrypt |
| Frontend | Vue 3 + Composition API + Pinia |
| Build | Vite 5 |
| Juego | Phaser 3 (isométrico 2.5D) |
| Editor Bloques | Blockly 11 |
| Editor Texto | Monaco Editor |
| Ejecución segura | Web Worker + Function constructor + límite instrucciones |
| Voz | Web Speech API (TTS nativo) |
| Base de datos | PostgreSQL 15 con particionado de telemetría |

## Bandas de edad

| Banda | Edad | Modalidad | Descripción |
|-------|------|-----------|-------------|
| Exploradores | 6-7 años | Solo bloques con iconos | Introducción sin código |
| Aventureros | 8-10 años | Bloques + texto | Transición gradual |
| Héroes | 11-12 años | Solo texto | Programación real |

## Instalación

### Requisitos
- Node.js 18+
- PostgreSQL 15 con usuario `postgres`, contraseña `1004`
- npm 9+

### 1. Base de datos

```bash
# Crear la base de datos y cargar el schema
psql -U postgres -f database/schema.sql
```

O desde psql:
```sql
\i database/schema.sql
```

### 2. Backend

```bash
cd backend
npm install
npx prisma generate
npm run dev
```

El servidor corre en `http://localhost:3001`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

La app corre en `http://localhost:5173`

### 4. Ejecutar ambos juntos

Desde la raíz del proyecto:
```bash
npm install
npm run dev
```

## Variables de entorno

### backend/.env
```
DATABASE_URL=postgresql://postgres:1004@localhost:5432/codexia_db
JWT_SECRET=codexia_super_secret_key_2026
PORT=3001
NODE_ENV=development
```

## Credenciales de demo

| Rol | Email | Contraseña |
|-----|-------|------------|
| Docente | docente@codexia.edu.co | demo1234 |
| Estudiante | sofia@codexia.edu.co | demo1234 |
| Estudiante | miguel@codexia.edu.co | demo1234 |

## API Endpoints

### Auth
- `POST /api/auth/register` - Registro con soporte Ley 1581
- `POST /api/auth/login` - Login → JWT
- `GET /api/auth/me` - Perfil autenticado
- `POST /api/auth/consent` - Registro consentimiento tutor

### Currículo
- `GET /api/curriculum/worlds` - Mundos con progreso del usuario
- `GET /api/curriculum/worlds/:id/levels` - Niveles de un mundo
- `GET /api/curriculum/levels/:id` - Config completa de un nivel
- `GET /api/curriculum/progress/:userId` - Progreso general

### Sesiones
- `POST /api/sessions/start` - Iniciar sesión de nivel
- `PUT /api/sessions/:id` - Actualizar (tiempo, intentos)
- `POST /api/sessions/:id/complete` - Completar y recibir recompensas

### Envíos
- `POST /api/submissions` - Guardar envío de código
- `GET /api/submissions/level/:id` - Historial de envíos

### Tienda
- `GET /api/store/items` - Items disponibles
- `POST /api/store/purchase` - Comprar item
- `GET /api/store/inventory/:userId` - Inventario del usuario
- `PUT /api/store/avatar` - Actualizar avatar

### Panel Docente
- `GET /api/teacher/classrooms` - Aulas del docente
- `POST /api/teacher/classrooms` - Crear aula
- `GET /api/teacher/classrooms/:id/students` - Estudiantes con progreso
- `GET /api/teacher/classrooms/:id/progress` - Vista SQL de progreso
- `POST /api/teacher/classrooms/:id/enroll` - Inscribir estudiante

## Cumplimiento Ley 1581 (Colombia)

- Campo `consentimiento_tutor` en tabla `usuarios`
- Fecha de consentimiento registrada
- Datos del tutor (nombre + email) almacenados
- Endpoint `/api/auth/consent` para registro formal
- Validación de edad al registrar menores
- Formulario de consentimiento en el registro frontend

## Estructura de un nivel (JSON)

```json
{
  "version": 2,
  "id": "m1-n1",
  "nombre": "¡Tu primer paso!",
  "tilemap": [[1,0,0,0,1]],
  "spawn": {"x": 1, "y": 1, "dir": "derecha"},
  "comandos_permitidos": ["avanzar"],
  "objetivos": [{"id": "salida", "tipo": "alcanzar_celda", "x": 3, "y": 1}],
  "criterios_estrella": {"1": {...}, "2": {...}, "3": {...}},
  "recompensa": {"monedas": 10, "gemas": 0}
}
```

Los tiles: `0` = caminable, `1` = pared/obstáculo.
