<template>
  <div class="teacher-page">
    <header class="teacher-header">
      <RouterLink to="/mapa" class="btn-back">← Mapa</RouterLink>
      <h1>Panel Docente</h1>
      <div v-if="activeTab === 'grupos'" class="header-actions">
        <button class="btn-secondary" @click="abrirPhidias">🔗 Importar de Phidias</button>
        <button class="btn-primary" @click="abrirCrearGrupo">+ Nuevo Grupo</button>
      </div>
      <button v-else-if="activeTab === 'sedes'" class="btn-primary" @click="showSedeModal = true">+ Nueva Sede</button>
      <div v-else-if="activeTab === 'estudiantes'" class="header-actions">
        <button class="btn-secondary" @click="openBulkModal">⬆️ Subir masivamente</button>
        <button class="btn-primary" @click="abrirNuevoEstudiante">+ Nuevo Estudiante</button>
      </div>
      <button v-else-if="activeTab === 'profesores'" class="btn-primary" @click="showTeacherModal = true">+ Nuevo Profesor</button>
      <button v-else-if="activeTab === 'asignaciones'" class="btn-primary" @click="openAssignModal()">+ Nueva Asignación</button>
      <span v-else></span>
    </header>

    <nav class="tabs">
      <button v-for="t in tabs" :key="t.id" :class="['tab', { active: activeTab === t.id }]" @click="switchTab(t.id)">
        {{ t.icono }} {{ t.label }}
      </button>
    </nav>

    <div class="teacher-layout" v-show="activeTab === 'grupos'">
      <!-- Lista de aulas -->
      <aside class="classrooms-panel">
        <h3>Mis Aulas</h3>
        <div v-if="isLoading" class="loading">Cargando...</div>
        <div v-else class="classrooms-list">
          <div
            v-for="aula in classrooms"
            :key="aula.id"
            :class="['classroom-item', { active: selectedClassroom?.id === aula.id }]"
            @click="selectClassroom(aula)"
          >
            <div class="classroom-icon">🏫</div>
            <div>
              <p class="classroom-name">{{ aula.nombre }}</p>
              <p class="classroom-meta">{{ aula._count.inscripciones }} estudiantes · {{ aula.codigoAcceso }}</p>
            </div>
          </div>
          <div v-if="classrooms.length === 0" class="empty-state">
            No tienes aulas. ¡Crea una!
          </div>
        </div>
      </aside>

      <!-- Panel de contenido -->
      <main class="classroom-detail" v-if="selectedClassroom">
        <!-- Filtros -->
        <div class="detail-header">
          <div class="titulo-grupo">
            <h2>{{ selectedClassroom.nombre }}</h2>
            <span class="sede-chip" :title="selectedClassroom.institucion ? 'Sede del grupo' : 'Este grupo no está asignado a ninguna sede'">
              🏢 {{ selectedClassroom.institucion?.nombre ?? 'Sin sede' }}
            </span>
            <span v-if="selectedClassroom.docente && !selectedClassroom.esMio" class="sede-chip otro-docente">
              👩‍🏫 {{ selectedClassroom.docente.nombre }}
            </span>
            <template v-if="puedeAdministrar(selectedClassroom)">
              <button class="btn-mini" title="Cambiar nombre o sede" @click="abrirEditarGrupo">✏️ Editar</button>
              <button class="btn-mini peligro" title="Eliminar este grupo" @click="abrirBorrarGrupo">🗑️ Eliminar grupo</button>
            </template>
          </div>
          <div class="add-row">
            <span class="add-label">➕ Agregar estudiantes:</span>
            <button class="btn-add" @click="abrirNuevoEnGrupo">👤 Nuevo</button>
            <button class="btn-add" @click="abrirInscribirExistente">🔗 Existente</button>
            <button class="btn-add" @click="abrirMasivoEnGrupo">⬆️ Masivo</button>
          </div>

          <!-- Mundos asignados a este grupo -->
          <div class="asig-row">
            <span class="add-label">📋 Mundos de este grupo:</span>
            <button class="btn-add btn-asig" @click="abrirAsignarAGrupo">➕ Asignar mundos</button>
            <template v-if="asignacionesDelGrupo.length">
              <span v-for="a in asignacionesDelGrupo" :key="a.id" class="mundo-chip" :title="a.mundoNombre">
                🌍 {{ a.mundoNombre }}
                <button class="chip-x" @click="quitarAsignacionGrupo(a)" title="Quitar">✕</button>
              </span>
            </template>
            <span v-else class="asig-vacio">Sin mundos asignados → los estudiantes ven <b>todos</b>. Asigna para limitar qué hace este grupo.</span>
          </div>
          <div class="filter-row">
            <button class="btn-block" @click="bloquearGrupo(true)">🔒 Bloquear grupo</button>
            <button class="btn-ok-sm" @click="bloquearGrupo(false)">🔓 Desbloquear</button>
            <button class="btn-pass" @click="abrirResetPass">🔑 Cambiar contraseña</button>
            <button
              v-if="puedeAdministrar(selectedClassroom)"
              class="btn-dibujos"
              title="Acceso con dibujos para los que aún no leen"
              @click="showCredenciales = true"
            >🎨 Acceso con dibujos</button>
            <select v-model="filterWorld" class="filter-select" title="Filtra la tabla de progreso (no asigna)">
              <option value="">Filtrar: todos los mundos</option>
              <option v-for="w in worlds" :key="w.id" :value="w.id">Mundo {{ w.numero_orden }}: {{ w.nombre }}</option>
            </select>
            <select v-model="filterModality" class="filter-select">
              <option value="">Todas las modalidades</option>
              <option value="bloques">Bloques</option>
              <option value="texto">Texto</option>
            </select>
          </div>
        </div>

        <!-- Tabla de progreso -->
        <div class="table-wrapper">
          <table class="progress-table">
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Banda</th>
                <th>Modalidad preferida</th>
                <th>Niveles completados</th>
                <th>Estrellas totales</th>
                <th>Monedas</th>
                <th>Racha</th>
                <th>Transición</th>
                <th v-if="puedeAdministrar(selectedClassroom)">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="student in filteredStudents" :key="student.id">
                <td>
                  <div class="student-cell">
                    <span class="student-avatar">{{ getInitials(student.nombre) }}</span>
                    <div>
                      <p class="student-name">{{ student.nombre }}</p>
                      <p class="student-email">{{ student.email }}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="badge" :class="student.bandaEdad">{{ student.bandaEdad }}</span>
                </td>
                <td>
                  <span class="modality-badge">{{ student.modalidadPref ?? 'bloques' }}</span>
                </td>
                <td class="text-center">
                  <strong>{{ student.nivelesCompletados }}</strong>
                </td>
                <td>
                  <div class="stars-bar">
                    <div class="stars-fill" :style="{ width: starsPercent(student.totalEstrellas) + '%' }"></div>
                    <span>{{ student.totalEstrellas }} ⭐</span>
                  </div>
                </td>
                <td class="text-center">🪙 {{ student.monedas }}</td>
                <td class="text-center">🔥 {{ student.rachaDias }}</td>
                <td>
                  <div class="transition-indicator" :title="`Bloques: ${student.enviosBloques ?? 0} | Texto: ${student.enviosTexto ?? 0}`">
                    <div class="transition-bar">
                      <div
                        class="transition-fill bloques"
                        :style="{ width: bloquesPercent(student) + '%' }"
                      ></div>
                    </div>
                    <span class="transition-label">
                      🧩 {{ bloquesPercent(student) }}% / 💻 {{ 100 - bloquesPercent(student) }}%
                    </span>
                  </div>
                </td>
                <td v-if="puedeAdministrar(selectedClassroom)" class="acciones-cell">
                  <button class="btn-mini" title="Lo saca de este grupo. Conserva su cuenta y su progreso." @click="quitarDelGrupo(student)">
                    ➖ Quitar
                  </button>
                  <button class="btn-mini peligro" title="Elimina la cuenta y TODO su progreso, para siempre." @click="abrirBorrarEstudiante(student)">
                    🗑️
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Gráfico de barras de progreso por modalidad (CSS puro) -->
        <div class="modality-chart">
          <h3>Distribución de modalidad en el aula</h3>
          <div class="chart-bars">
            <div class="chart-item">
              <span class="chart-label">🧩 Bloques</span>
              <div class="chart-bar-wrap">
                <div class="chart-bar-fill bloques-color" :style="{ width: totalBloquesPercent + '%' }"></div>
              </div>
              <span class="chart-percent">{{ totalBloquesPercent }}%</span>
            </div>
            <div class="chart-item">
              <span class="chart-label">🔀 Mixto</span>
              <div class="chart-bar-wrap">
                <div class="chart-bar-fill mixto-color" :style="{ width: totalMixtoPercent + '%' }"></div>
              </div>
              <span class="chart-percent">{{ totalMixtoPercent }}%</span>
            </div>
            <div class="chart-item">
              <span class="chart-label">💻 Código</span>
              <div class="chart-bar-wrap">
                <div class="chart-bar-fill texto-color" :style="{ width: totalTextoPercent + '%' }"></div>
              </div>
              <span class="chart-percent">{{ totalTextoPercent }}%</span>
            </div>
          </div>
        </div>
      </main>

      <div v-else class="no-selection">
        <p>👈 Selecciona un grupo para ver el progreso</p>
      </div>
    </div>

    <!-- ===================== SEGUIMIENTO (matriz) ===================== -->
    <section v-show="activeTab === 'seguimiento'" class="tab-panel">
      <p class="panel-hint">Mapa de avance: cada fila es un estudiante y cada columna una actividad. El color y el % muestran cuánto ha completado.</p>

      <div class="seg-filtros">
        <div class="form-group">
          <label>Grupo</label>
          <select v-model.number="matrizAula" class="filter-select" @change="loadMatriz">
            <option v-for="a in classrooms" :key="a.id" :value="a.id">{{ a.nombre }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Materia</label>
          <select v-model="matrizCategoria" class="filter-select" @change="loadMatriz">
            <option value="">Todas las materias</option>
            <option v-for="m in materiasSeguimiento" :key="m.id" :value="m.id">{{ m.icono }} {{ m.nombre }}</option>
          </select>
        </div>
      </div>

      <div v-if="matrizCargando" class="empty-state">Cargando…</div>

      <template v-else-if="matriz">
        <!-- Tarjetas resumen -->
        <div class="seg-cards">
          <div class="seg-card"><span class="seg-card-num">{{ matriz.resumen.estudiantes }}</span><span class="seg-card-lbl">👧 Estudiantes</span></div>
          <div class="seg-card ok"><span class="seg-card-num">{{ matriz.resumen.terminaron }}</span><span class="seg-card-lbl">🏆 Terminaron todo</span></div>
          <div class="seg-card mid"><span class="seg-card-num">{{ matriz.resumen.mitad }}</span><span class="seg-card-lbl">⏳ En progreso</span></div>
          <div class="seg-card low"><span class="seg-card-num">{{ matriz.resumen.iniciando }}</span><span class="seg-card-lbl">🌱 Iniciando</span></div>
          <div class="seg-card"><span class="seg-card-num">{{ matriz.resumen.promedio }}%</span><span class="seg-card-lbl">📊 Promedio del grupo</span></div>
        </div>

        <!-- Leyenda -->
        <div class="seg-leyenda">
          <span><i class="lg c-zero"></i> 0%</span>
          <span><i class="lg c-low"></i> 1–39%</span>
          <span><i class="lg c-mid"></i> 40–69%</span>
          <span><i class="lg c-high"></i> 70–99%</span>
          <span><i class="lg c-full"></i> 100% ✓</span>
        </div>

        <!-- Matriz -->
        <div class="table-wrapper matriz-wrap">
          <table class="matriz">
            <thead>
              <tr>
                <th class="col-est">Estudiante</th>
                <th v-for="m in matriz.mundos" :key="m.key" class="col-act" :title="colNombre(m)">
                  <span class="act-ico">{{ colIcono(m) }}</span>
                  <span class="act-nom">{{ colNombre(m) }}</span>
                </th>
                <th class="col-total">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in matriz.estudiantes" :key="e.id">
                <td class="col-est">
                  <button class="student-cell student-link" @click="abrirFicha(e.id)" title="Ver ficha de seguimiento">
                    <span class="student-avatar sm">{{ getInitials(e.nombre) }}</span>
                    <span class="student-name" :class="{ inactivo: e.activo === false }">{{ e.nombre }}<span v-if="e.activo === false"> 🔒</span></span>
                    <span class="ver-ficha">🔍</span>
                  </button>
                </td>
                <td v-for="c in e.celdas" :key="c.key" class="celda">
                  <div class="celda-box" :class="pctClase(c.pct)" :title="`${c.completados}/${c.total} niveles`">
                    <span v-if="c.pct >= 100">✓</span>
                    <span v-else>{{ c.pct }}<small>%</small></span>
                  </div>
                </td>
                <td class="col-total">
                  <div class="anillo" :style="anilloEstilo(e.globalPct)">
                    <span class="anillo-in">{{ e.globalPct }}<small>%</small></span>
                  </div>
                  <span v-if="e.globalPct >= 100" class="trofeo">🏆</span>
                </td>
              </tr>
              <tr v-if="!matriz.estudiantes.length"><td :colspan="matriz.mundos.length + 2" class="empty-state">Este grupo aún no tiene estudiantes. Agrégalos en la pestaña «Grupos».</td></tr>
            </tbody>
          </table>
        </div>
      </template>

      <div v-else class="empty-state">Selecciona un grupo para ver el seguimiento.</div>
    </section>

    <!-- ===================== SEDES ===================== -->
    <section v-show="activeTab === 'admin'" class="tab-panel">
      <PanelAdmin v-if="activeTab === 'admin'" />
    </section>

    <section v-show="activeTab === 'sedes'" class="tab-panel">
      <p class="panel-hint">
        Una <b>sede</b> es un campus o jornada del colegio. Sirve para <b>agrupar grupos y estudiantes</b> cuando hay más de una:
        al crear o editar un grupo eliges su sede, y los estudiantes que crees dentro la heredan.
        Si tu colegio tiene una sola sede, puedes ignorar esta pestaña: todo funciona igual sin ella.
      </p>
      <div class="cards-grid">
        <div v-for="s in sedes" :key="s.id" class="info-card">
          <div class="info-card-icon">🏢</div>
          <div style="flex:1">
            <p class="info-card-title">{{ s.nombre }}</p>
            <p class="info-card-meta">{{ s.ciudad || 'Sin ciudad' }}</p>
            <p class="info-card-meta">
              <strong>{{ s.grupos ?? 0 }}</strong> grupo(s) · <strong>{{ s.estudiantes ?? 0 }}</strong> estudiante(s)
            </p>
            <p v-if="(s.grupos ?? 0) === 0" class="info-card-aviso">
              Sin grupos todavía. Asígnale uno desde ✏️ Editar en la pestaña Grupos.
            </p>
          </div>
          <div v-if="esAdmin" class="card-acciones">
            <button class="btn-mini" title="Cambiar nombre o ciudad" @click="abrirEditarSede(s)">✏️</button>
            <button class="btn-mini peligro" title="Eliminar sede" @click="borrarSede(s)">🗑️</button>
          </div>
        </div>
        <div v-if="sedes.length === 0" class="empty-state">
          No hay sedes. Créala solo si manejas varios campus o jornadas.
        </div>
      </div>
      <p v-if="sedeError" class="form-error">{{ sedeError }}</p>
    </section>

    <!-- ===================== ESTUDIANTES ===================== -->
    <section v-show="activeTab === 'estudiantes'" class="tab-panel">
      <input v-model="studentSearch" class="search-input" placeholder="🔍 Buscar estudiante..." @input="loadAllStudents" />
      <div class="table-wrapper">
        <table class="progress-table">
          <thead><tr><th>Estudiante</th><th>Email</th><th>Banda</th><th>Monedas</th><th>Estado</th><th>Acción</th></tr></thead>
          <tbody>
            <tr v-for="s in allStudents" :key="s.id" :class="{ 'fila-bloqueada': s.activo === false }">
              <td><div class="student-cell"><span class="student-avatar">{{ getInitials(s.nombre) }}</span><span class="student-name">{{ s.nombre }}</span></div></td>
              <td class="student-email">{{ s.email }}</td>
              <td><span class="badge" :class="s.bandaEdad">{{ s.bandaEdad }}</span></td>
              <td class="text-center">🪙 {{ s.monedas }}</td>
              <td class="text-center"><span :class="['estado-badge', s.activo === false ? 'bloq' : 'ok']">{{ s.activo === false ? '🔒 Bloqueado' : '✅ Activo' }}</span></td>
              <td class="text-center">
                <button v-if="s.activo === false" class="btn-mini btn-ok" @click="toggleBloqueoEstudiante(s, false)">🔓 Desbloquear</button>
                <button v-else class="btn-mini btn-block" @click="toggleBloqueoEstudiante(s, true)">🔒 Bloquear</button>
              </td>
            </tr>
            <tr v-if="allStudents.length === 0"><td colspan="6" class="empty-state">No hay estudiantes.</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ===================== PROFESORES ===================== -->
    <section v-show="activeTab === 'profesores'" class="tab-panel">
      <p class="panel-hint">
        Crea otros profesores. Tendrán las <b>mismas capacidades</b> que tú sobre sus grupos: crearlos, agregar estudiantes,
        asignar y ver estadísticas. Aquí se listan también los <b>administradores</b>, que además pueden con todo el colegio.
        <template v-if="esAdmin"> Para cambiar contraseñas o roles, usa la pestaña 🛡️ Administración.</template>
      </p>
      <div class="cards-grid">
        <div v-for="t in teachers" :key="t.id" class="info-card">
          <div class="info-card-icon">{{ t.rol === 'admin' ? '🛡️' : '👩‍🏫' }}</div>
          <div style="flex:1">
            <p class="info-card-title">
              {{ t.nombre }}
              <span v-if="t.rol === 'admin'" class="rol-chip">Administrador</span>
            </p>
            <p class="info-card-meta">{{ t.email }}</p>
            <p class="info-card-meta">{{ t.grupos ?? 0 }} grupo(s) a su cargo</p>
          </div>
          <span :class="['estado-badge', t.activo === false ? 'bloq' : 'ok']">{{ t.activo === false ? '🔒' : '✅' }}</span>
          <div v-if="esAdmin && t.id !== miId" class="card-acciones">
            <button class="btn-mini peligro" title="Eliminar profesor" @click="borrarProfesor(t)">🗑️</button>
          </div>
        </div>
        <div v-if="teachers.length === 0" class="empty-state">Aún no has creado profesores.</div>
      </div>
    </section>

    <!-- ===================== ASIGNACIONES ===================== -->
    <section v-show="activeTab === 'asignaciones'" class="tab-panel">
      <div class="cards-grid">
        <div v-for="a in assignments" :key="a.id" class="info-card assign-card">
          <div class="info-card-icon">📋</div>
          <div class="assign-body">
            <p class="info-card-title">{{ a.titulo || (a.mundoNombre ? `Mundo: ${a.mundoNombre}` : `Nivel: ${a.nivelNombre}`) }}</p>
            <p class="info-card-meta">
              Para: {{ a.aulaNombre ? `Grupo ${a.aulaNombre}` : `Estudiante ${a.estudianteNombre}` }}
              <span v-if="a.fechaLimite"> · 📅 {{ formatDate(a.fechaLimite) }}</span>
            </p>
            <p v-if="a.instrucciones" class="assign-instr">{{ a.instrucciones }}</p>
          </div>
          <div class="assign-acciones">
            <button class="btn-mini" @click="verProgreso(a)">📊 Progreso</button>
            <button class="btn-del" @click="deleteAssignment(a.id)">🗑️</button>
          </div>
        </div>
        <div v-if="assignments.length === 0" class="empty-state">No hay asignaciones. ¡Crea una para tus grupos o estudiantes!</div>
      </div>
    </section>

    <!-- ===================== ESTADÍSTICAS ===================== -->
    <section v-show="activeTab === 'estadisticas'" class="tab-panel">
      <div class="stat-filtros">
        <select v-model.number="stat3Aula" class="filter-select" @change="loadStats3">
          <option :value="undefined">🏫 Todos los grupos</option>
          <option v-for="a in classrooms" :key="a.id" :value="a.id">{{ a.nombre }}</option>
        </select>
        <span class="panel-hint" style="margin:0">Seguimiento gráfico del avance, tiempo y actividades.</span>
      </div>

      <template v-if="stats3">
        <!-- KPIs -->
        <div class="kpi-row">
          <div class="kpi"><span class="kpi-ico">🧑‍🎓</span><span class="kpi-num">{{ stats3.resumen.estudiantes }}</span><span class="kpi-lbl">Estudiantes</span></div>
          <div class="kpi"><span class="kpi-ico">🟢</span><span class="kpi-num">{{ stats3.resumen.activos }}</span><span class="kpi-lbl">Activos (con avance)</span></div>
          <div class="kpi"><span class="kpi-ico">✅</span><span class="kpi-num">{{ stats3.resumen.actividadesCompletadas }}</span><span class="kpi-lbl">Actividades completadas</span></div>
          <div class="kpi"><span class="kpi-ico">⭐</span><span class="kpi-num">{{ stats3.resumen.estrellas }}</span><span class="kpi-lbl">Estrellas ganadas</span></div>
          <div class="kpi"><span class="kpi-ico">⏱️</span><span class="kpi-num">{{ fmtTiempo(stats3.resumen.tiempoTotalSeg) }}</span><span class="kpi-lbl">Tiempo total</span></div>
          <div class="kpi"><span class="kpi-ico">📈</span><span class="kpi-num">{{ stats3.resumen.promedioActividades }}</span><span class="kpi-lbl">Prom. act./estudiante</span></div>
        </div>

        <div class="stats-grid2">
          <!-- Actividad por día (línea) -->
          <div class="stats-card wide">
            <h3>📅 Actividad de los últimos 14 días</h3>
            <svg v-if="maxDia > 0" class="linea-svg" viewBox="0 0 560 160" preserveAspectRatio="none" role="img" aria-label="Actividades completadas por día">
              <polyline :points="`0,150 ${lineaPuntos} 560,150`" fill="rgba(124,58,237,.12)" stroke="none" />
              <polyline :points="lineaPuntos" fill="none" stroke="#7C3AED" stroke-width="2.5" stroke-linejoin="round" />
              <g v-for="(p, i) in lineaCoords" :key="i">
                <circle :cx="p.x" :cy="p.y" r="3.5" fill="#7C3AED" />
              </g>
            </svg>
            <div v-else class="empty-state">Sin actividad registrada en los últimos días.</div>
            <div class="linea-xlabels"><span v-for="(d, i) in stats3.actividadPorDia" :key="i" v-show="i % 2 === 0">{{ d.dia.slice(8, 10) }}/{{ d.dia.slice(5, 7) }}</span></div>
          </div>

          <!-- Distribución de estrellas -->
          <div class="stats-card">
            <h3>⭐ Calidad (estrellas)</h3>
            <div class="donut-wrap">
              <div class="donut" :style="donutEstilo"></div>
              <div class="donut-leg">
                <div><i class="lg" style="background:#FDE68A"></i> 1★ <b>{{ stats3.distribucionEstrellas[1] }}</b></div>
                <div><i class="lg" style="background:#FBBF24"></i> 2★ <b>{{ stats3.distribucionEstrellas[2] }}</b></div>
                <div><i class="lg" style="background:#F59E0B"></i> 3★ <b>{{ stats3.distribucionEstrellas[3] }}</b></div>
              </div>
            </div>
          </div>

          <!-- Tiempo por grupo -->
          <div class="stats-card">
            <h3>⏱️ Tiempo por grupo</h3>
            <div v-for="g in stats3.porGrupo" :key="g.id" class="hbar-row">
              <span class="hbar-lbl" :title="g.nombre">{{ g.nombre }}</span>
              <div class="hbar"><div class="hbar-fill" :style="{ width: pctDe(g.seg, maxSegGrupo) + '%' }"></div></div>
              <span class="hbar-val">{{ fmtTiempo(g.seg) }}</span>
            </div>
            <div v-if="!stats3.porGrupo.length" class="empty-state">Sin grupos.</div>
          </div>

          <!-- Estudiantes por grupo -->
          <div class="stats-card">
            <h3>🧑‍🎓 Estudiantes por grupo</h3>
            <div v-for="g in stats3.porGrupo" :key="g.id" class="hbar-row">
              <span class="hbar-lbl" :title="g.nombre">{{ g.nombre }}</span>
              <div class="hbar"><div class="hbar-fill alt" :style="{ width: pctDe(g.estudiantes, maxEstudGrupo) + '%' }"></div></div>
              <span class="hbar-val">{{ g.estudiantes }}</span>
            </div>
            <div v-if="!stats3.porGrupo.length" class="empty-state">Sin grupos.</div>
          </div>

          <!-- Top actividades -->
          <div class="stats-card">
            <h3>🏆 Top estudiantes (actividades)</h3>
            <div v-for="(s, i) in stats3.topEstudiantes" :key="s.id" class="hbar-row">
              <span class="hbar-lbl">{{ ['🥇','🥈','🥉'][i] || (i+1)+'.' }} {{ s.nombre }}</span>
              <div class="hbar"><div class="hbar-fill" :style="{ width: pctDe(s.actividades, maxActEstud) + '%' }"></div></div>
              <span class="hbar-val">{{ s.actividades }}</span>
            </div>
            <div v-if="!stats3.topEstudiantes.length" class="empty-state">Sin datos.</div>
          </div>

          <!-- Más tiempo -->
          <div class="stats-card">
            <h3>⏱️ Más tiempo trabajando</h3>
            <div v-for="s in stats3.topTiempo" :key="s.id" class="hbar-row">
              <span class="hbar-lbl">{{ s.nombre }}</span>
              <div class="hbar"><div class="hbar-fill warm" :style="{ width: pctDe(s.seg, maxSegEstud) + '%' }"></div></div>
              <span class="hbar-val">{{ fmtTiempo(s.seg) }}</span>
            </div>
            <div v-if="!stats3.topTiempo.length" class="empty-state">Sin datos.</div>
          </div>

          <!-- Avance por materia -->
          <div class="stats-card wide">
            <h3>📚 Avance por materia</h3>
            <div v-for="m in stats3.porMateria" :key="m.categoria" class="mat-row">
              <span class="mat-nom">{{ nombreMateria(m.categoria) }}</span>
              <div class="mat-barra"><div class="mat-fill" :class="pctClase(pctMateria(m))" :style="{ width: pctMateria(m) + '%' }"></div></div>
              <span class="mat-val">{{ m.completados }} <small>({{ pctMateria(m) }}%)</small></span>
            </div>
            <div v-if="!stats3.porMateria.length" class="empty-state">Sin actividades aún.</div>
          </div>

          <!-- Mejor estudiante por mundo -->
          <div class="stats-card wide">
            <h3>🌍 Mundos y su mejor estudiante</h3>
            <div class="tabla-wrap">
              <table class="mini-tabla">
                <thead><tr><th>Mundo</th><th>Completadas</th><th>Tiempo</th><th>🏅 Mejor estudiante</th></tr></thead>
                <tbody>
                  <tr v-for="w in stats3.porMundo" :key="w.id">
                    <td>{{ w.icono }} {{ w.nombre }}</td>
                    <td class="tc"><b>{{ w.completados }}</b></td>
                    <td class="tc">{{ fmtTiempo(w.seg) }}</td>
                    <td>{{ w.mejor_nombre || '—' }} <span v-if="w.mejor_nombre" class="muted-txt">({{ w.mejor_hechos }})</span></td>
                  </tr>
                  <tr v-if="!stats3.porMundo.length"><td colspan="4" class="empty-state">Aún no hay mundos con avance.</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Actividades más completadas / más difíciles / apoyo -->
          <div class="stats-card">
            <h3>🔥 Actividades más completadas</h3>
            <ol class="lista-mini">
              <li v-for="(a, i) in stats3.actividadesTop" :key="i"><span>{{ a.icono }} {{ a.nombre }}</span><b>{{ a.c }}</b></li>
              <li v-if="!stats3.actividadesTop.length" class="empty-state">Sin datos.</li>
            </ol>
          </div>
          <div class="stats-card">
            <h3>🧗 Actividades más difíciles</h3>
            <ol class="lista-mini">
              <li v-for="(a, i) in stats3.actividadesReto" :key="i"><span>{{ a.icono }} {{ a.nombre }}</span><b class="reto">{{ a.completaron }}/{{ a.intentaron }}</b></li>
              <li v-if="!stats3.actividadesReto.length" class="empty-state">Sin datos.</li>
            </ol>
          </div>
          <div class="stats-card">
            <h3>🆘 Necesitan apoyo</h3>
            <ol class="lista-mini">
              <li v-for="s in stats3.necesitanApoyo" :key="s.id"><span>{{ s.nombre }} <span v-if="s.activo===false">🔒</span></span><b>{{ s.actividades }} act.</b></li>
              <li v-if="!stats3.necesitanApoyo.length" class="empty-state">Sin datos.</li>
            </ol>
          </div>
        </div>
      </template>
      <div v-else class="empty-state">Cargando estadísticas…</div>
    </section>

    <!-- Modal carga masiva -->
    <div v-if="showBulkModal" class="modal-overlay" @click.self="showBulkModal = false">
      <div class="modal modal-wide">
        <button class="modal-close" aria-label="Cerrar" @click="showBulkModal = false">✕</button>
        <h3>⬆️ Subir estudiantes masivamente</h3>
        <p class="modal-help">Escribe un estudiante por línea. Formato: <code>Nombre, correo, contraseña</code> (correo y contraseña son opcionales — se generan solos).</p>
        <textarea v-model="bulkText" class="bulk-text" rows="8" placeholder="Ana Pérez, ana@correo.com, clave123&#10;Luis Gómez&#10;María Torres, maria@correo.com"></textarea>
        <div class="form-row">
          <div class="form-group"><label>Inscribir en grupo</label>
            <select v-model.number="bulkAula" class="filter-select">
              <option :value="undefined">— Sin grupo —</option>
              <option v-for="a in classrooms" :key="a.id" :value="a.id">{{ a.nombre }}</option>
            </select>
          </div>
          <div class="form-group"><label>Banda de edad</label>
            <select v-model="bulkBanda" class="filter-select">
              <option value="exploradores">Exploradores (6-7)</option>
              <option value="aventureros">Aventureros (8-10)</option>
              <option value="heroes">Héroes (11-12)</option>
            </select>
          </div>
        </div>
        <div v-if="bulkResultado" class="bulk-result">
          <p>✅ {{ bulkResultado.creados.length }} procesados · ❌ {{ bulkResultado.errores.length }} errores</p>
          <div class="bulk-creds" v-if="bulkResultado.creados.length">
            <p class="bulk-creds-title">Credenciales (guárdalas):</p>
            <div v-for="c in bulkResultado.creados" :key="c.id" class="bulk-cred">{{ c.nombre }} — {{ c.email }} <span v-if="c.password">/ {{ c.password }}</span></div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showBulkModal = false">Cerrar</button>
          <button class="btn-primary" @click="enviarBulk">Subir {{ bulkLineas }} estudiante(s)</button>
        </div>
      </div>
    </div>

    <!-- Modal progreso de asignación -->
    <div v-if="showProgModal" class="modal-overlay" @click.self="showProgModal = false">
      <div class="modal modal-wide">
        <button class="modal-close" aria-label="Cerrar" @click="showProgModal = false">✕</button>
        <h3>📊 Progreso: {{ progData?.asignacion?.titulo || 'Asignación' }}</h3>
        <div class="table-wrapper" v-if="progData">
          <table class="progress-table">
            <thead><tr><th>Estudiante</th><th>Avance</th><th>Detalle</th></tr></thead>
            <tbody>
              <tr v-for="s in progData.estudiantes" :key="s.id">
                <td>{{ s.nombre }}</td>
                <td>
                  <div class="prog-mini"><div class="prog-mini-fill" :style="{ width: (s.total ? s.completados / s.total * 100 : 0) + '%' }"></div></div>
                  <span class="prog-label">{{ s.completados }}/{{ s.total }}</span>
                </td>
                <td class="prog-detalle">
                  <span v-for="d in s.detalle" :key="d.nivelId" :class="['niv-chip', { hecho: d.hecho }]" :title="d.nombre">{{ d.hecho ? '✅' : '⬜' }}</span>
                </td>
              </tr>
              <tr v-if="!progData.estudiantes.length"><td colspan="3" class="empty-state">Sin estudiantes en esta asignación.</td></tr>
            </tbody>
          </table>
        </div>
        <div class="modal-actions"><button class="btn-secondary" @click="showProgModal = false">Cerrar</button></div>
      </div>
    </div>

    <!-- Modal crear sede -->
    <div v-if="showSedeModal" class="modal-overlay" @click.self="showSedeModal = false">
      <div class="modal">
        <button class="modal-close" aria-label="Cerrar" @click="showSedeModal = false">✕</button>
        <h3>{{ sedeEditandoId ? '✏️ Editar sede' : 'Nueva Sede' }}</h3>
        <div class="form-group"><label>Nombre</label><input v-model="newSede.nombre" placeholder="Ej: Sede Central" /></div>
        <div class="form-group"><label>Ciudad</label><input v-model="newSede.ciudad" placeholder="Ej: Barranquilla" /></div>
        <p v-if="sedeError" class="form-error">{{ sedeError }}</p>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showSedeModal = false">Cancelar</button>
          <button class="btn-primary" :disabled="guardandoSede" @click="createSede">
            {{ guardandoSede ? 'Guardando…' : (sedeEditandoId ? 'Guardar' : 'Crear') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal crear estudiante -->
    <div v-if="showStudentModal" class="modal-overlay" @click.self="showStudentModal = false; studentAulaTarget = undefined">
      <div class="modal">
        <button class="modal-close" aria-label="Cerrar" @click="showStudentModal = false; studentAulaTarget = undefined">✕</button>
        <h3>Nuevo Estudiante</h3>
        <p v-if="studentAulaTarget" class="modal-help">Se inscribirá directamente en <b>{{ selectedClassroom?.nombre }}</b>.</p>
        <div class="form-group"><label>Nombre</label><input v-model="newStudent.nombre" placeholder="Nombre completo" /></div>
        <div class="form-group"><label>Email</label><input v-model="newStudent.email" type="email" placeholder="correo@ejemplo.com" /></div>
        <div class="form-group"><label>Contraseña</label><input v-model="newStudent.password" type="text" placeholder="mínimo 4 caracteres" /></div>
        <div class="form-group"><label>Banda de edad</label>
          <select v-model="newStudent.banda_edad" class="filter-select">
            <option value="exploradores">Exploradores (6-7)</option>
            <option value="aventureros">Aventureros (8-10)</option>
            <option value="heroes">Héroes (11-12)</option>
          </select>
        </div>
        <p v-if="studentError" class="form-error">{{ studentError }}</p>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showStudentModal = false">Cancelar</button>
          <button class="btn-primary" @click="createStudent">Crear</button>
        </div>
      </div>
    </div>

    <!-- Credenciales de acceso con dibujos (prelectores) -->
    <PanelCredenciales
      v-if="showCredenciales && selectedClassroom"
      :aula="{ id: selectedClassroom.id, nombre: selectedClassroom.nombre }"
      @cerrar="showCredenciales = false"
    />

    <!-- Modal editar grupo -->
    <div v-if="showEditGroupModal" class="modal-overlay" @click.self="showEditGroupModal = false">
      <div class="modal">
        <button class="modal-close" aria-label="Cerrar" @click="showEditGroupModal = false">✕</button>
        <h3>✏️ Editar grupo</h3>
        <div class="form-group"><label>Nombre</label><input v-model="editGroup.nombre" type="text" /></div>
        <div class="form-group">
          <label>Sede</label>
          <select v-model="editGroup.institucion_id" class="filter-select">
            <option :value="null">— Sin sede —</option>
            <option v-for="sd in sedes" :key="sd.id" :value="sd.id">{{ sd.nombre }}{{ sd.ciudad ? ` · ${sd.ciudad}` : '' }}</option>
          </select>
        </div>
        <p v-if="groupError" class="form-error">{{ groupError }}</p>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showEditGroupModal = false">Cancelar</button>
          <button class="btn-primary" :disabled="guardandoGrupo" @click="guardarGrupo">{{ guardandoGrupo ? 'Guardando…' : 'Guardar' }}</button>
        </div>
      </div>
    </div>

    <!-- Modal eliminar grupo -->
    <div v-if="showDeleteGroupModal" class="modal-overlay" @click.self="showDeleteGroupModal = false">
      <div class="modal">
        <button class="modal-close" aria-label="Cerrar" @click="showDeleteGroupModal = false">✕</button>
        <h3>🗑️ Eliminar grupo</h3>
        <p class="modal-help">
          Vas a eliminar <strong>{{ borrarGrupo.nombre }}</strong>.
        </p>
        <ul class="impacto-lista">
          <li><strong>{{ borrarGrupo.estudiantes }}</strong> estudiante(s) dejarán de pertenecer al grupo</li>
          <li><strong>{{ borrarGrupo.asignaciones }}</strong> asignación(es) de mundos se borrarán</li>
          <li class="ok">Sus cuentas y todo su progreso <strong>se conservan</strong></li>
        </ul>
        <p v-if="groupError" class="form-error">{{ groupError }}</p>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showDeleteGroupModal = false">Cancelar</button>
          <button class="btn-danger" :disabled="borrandoGrupo" @click="confirmarBorrarGrupo">{{ borrandoGrupo ? 'Eliminando…' : 'Sí, eliminar grupo' }}</button>
        </div>
      </div>
    </div>

    <!-- Modal eliminar estudiante -->
    <div v-if="showDeleteStudentModal" class="modal-overlay" @click.self="showDeleteStudentModal = false">
      <div class="modal">
        <button class="modal-close" aria-label="Cerrar" @click="showDeleteStudentModal = false">✕</button>
        <h3>🗑️ Eliminar cuenta</h3>
        <p class="modal-help">
          Vas a eliminar la cuenta de <strong>{{ borrarAlumno.nombre }}</strong> ({{ borrarAlumno.email }}).
          Esto <strong>no se puede deshacer</strong>.
        </p>
        <ul class="impacto-lista">
          <li class="alerta">Se borran <strong>{{ borrarAlumno.completados }}</strong> nivel(es) completados y <strong>{{ borrarAlumno.sesiones }}</strong> sesión(es) de trabajo</li>
          <li class="alerta">Se borran <strong>{{ borrarAlumno.logros }}</strong> logro(s) y su inventario</li>
          <li>Sale de <strong>{{ borrarAlumno.grupos }}</strong> grupo(s)</li>
        </ul>
        <p class="modal-help">
          ¿Solo quieres sacarlo de este grupo? Cierra esto y usa <strong>➖ Quitar</strong>: conserva la cuenta y el progreso.
        </p>
        <p v-if="studentError" class="form-error">{{ studentError }}</p>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showDeleteStudentModal = false">Cancelar</button>
          <button class="btn-danger" :disabled="borrandoAlumno" @click="confirmarBorrarEstudiante">{{ borrandoAlumno ? 'Eliminando…' : 'Sí, eliminar cuenta' }}</button>
        </div>
      </div>
    </div>

    <!-- Modal crear profesor -->
    <div v-if="showTeacherModal" class="modal-overlay" @click.self="showTeacherModal = false">
      <div class="modal">
        <button class="modal-close" aria-label="Cerrar" @click="showTeacherModal = false">✕</button>
        <h3>👩‍🏫 Nuevo Profesor</h3>
        <p class="modal-help">Podrá crear grupos, estudiantes, asignar y ver estadísticas, igual que tú.</p>
        <div class="form-group"><label>Nombre</label><input v-model="newTeacher.nombre" placeholder="Nombre completo" /></div>
        <div class="form-group"><label>Email</label><input v-model="newTeacher.email" type="email" placeholder="correo@ejemplo.com" /></div>
        <div class="form-group"><label>Contraseña</label><input v-model="newTeacher.password" type="text" placeholder="mínimo 4 caracteres" /></div>
        <p v-if="teacherError" class="form-error">{{ teacherError }}</p>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showTeacherModal = false">Cancelar</button>
          <button class="btn-primary" @click="createTeacher">Crear profesor</button>
        </div>
      </div>
    </div>

    <!-- Modal crear asignación -->
    <div v-if="showAssignModal" class="modal-overlay" @click.self="showAssignModal = false">
      <div class="modal">
        <button class="modal-close" aria-label="Cerrar" @click="showAssignModal = false">✕</button>
        <h3>Nueva Asignación</h3>
        <div class="form-group"><label>Título</label><input v-model="newAssign.titulo" placeholder="Ej: Tarea de bucles" /></div>
        <div class="form-group"><label>Asignar a</label>
          <select v-model="newAssign.tipoDestino" class="filter-select">
            <option value="grupo">Un grupo</option>
            <option value="estudiante">Un estudiante</option>
          </select>
        </div>
        <div class="form-group" v-if="newAssign.tipoDestino === 'grupo'"><label>Grupo</label>
          <select v-model.number="newAssign.aula_id" class="filter-select">
            <option :value="undefined" disabled>Selecciona...</option>
            <option v-for="a in classrooms" :key="a.id" :value="a.id">{{ a.nombre }}</option>
          </select>
        </div>
        <div class="form-group" v-else><label>Estudiante</label>
          <select v-model.number="newAssign.estudiante_id" class="filter-select">
            <option :value="undefined" disabled>Selecciona...</option>
            <option v-for="s in allStudents" :key="s.id" :value="s.id">{{ s.nombre }}</option>
          </select>
        </div>
        <div class="form-group"><label>Materia</label>
          <select v-model="assignMateria" class="filter-select" @change="loadAssignWorlds">
            <option v-for="m in MATERIAS.filter((x) => materiasConContenido.includes(x.id))" :key="m.id" :value="m.id">{{ m.icono }} {{ m.nombre }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>¿Qué mundos asignas?</label>
          <div class="niveles-check">
            <label class="check-todo"><input type="checkbox" v-model="assignTodaMateria" /> <b>📚 Toda la materia</b> ({{ assignWorlds.length }} mundos)</label>
            <div v-if="!assignTodaMateria" class="niveles-lista">
              <label v-for="w in assignWorlds" :key="w.id" class="check-niv">
                <input type="checkbox" :value="w.id" v-model="assignWorldsSel" /> {{ w.icono || '🌍' }} {{ w.nombre }}
              </label>
              <p v-if="!assignWorlds.length" class="empty-state">Esta materia no tiene mundos.</p>
            </div>
          </div>
        </div>
        <div class="form-group"><label>Fecha límite (opcional)</label><input v-model="newAssign.fecha_limite" type="date" /></div>
        <p v-if="assignError" class="form-error">{{ assignError }}</p>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showAssignModal = false">Cancelar</button>
          <button class="btn-primary" @click="createAssignment">Asignar</button>
        </div>
      </div>
    </div>

    <!-- Modal crear aula -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="cerrarCrearAula">
      <div class="modal modal-wide">
        <button class="modal-close" aria-label="Cerrar" @click="cerrarCrearAula">✕</button>
        <h3>Nueva Aula</h3>
        <div class="form-group">
          <label>Nombre del aula</label>
          <input v-model="newClassroom.nombre" type="text" placeholder="Ej: Clase 4B - Programación" />
        </div>
        <div class="form-group">
          <label>Sede <span class="opt">(opcional)</span></label>
          <select v-model="newClassroom.institucion_id" class="filter-select">
            <option :value="undefined">— Sin sede —</option>
            <option v-for="sd in sedes" :key="sd.id" :value="sd.id">{{ sd.nombre }}{{ sd.ciudad ? ` · ${sd.ciudad}` : '' }}</option>
          </select>
          <p class="modal-help">
            <template v-if="sedes.length">Agrupa el aula por campus o jornada. Los estudiantes que crees aquí heredan esta sede.</template>
            <template v-else>Todavía no hay sedes. Créalas en la pestaña 🏢 Sedes si manejas varios campus o jornadas.</template>
          </p>
        </div>
        <div class="form-group">
          <label>➕ Agregar estudiantes ahora <span class="opt">(opcional)</span></label>
          <p class="modal-help">Uno por línea. Formato: <code>Nombre, correo, contraseña</code> (correo y contraseña son opcionales — se generan solos). También podrás agregar más después.</p>
          <textarea v-model="newClassroomAlumnos" class="bulk-text" rows="6" placeholder="Ana Pérez, ana@correo.com, clave123&#10;Luis Gómez&#10;María Torres"></textarea>
        </div>
        <div class="form-group" v-if="newClassroomAlumnos.trim()">
          <label>Banda de edad de estos estudiantes</label>
          <select v-model="newClassroomBanda" class="filter-select">
            <option value="exploradores">Exploradores (6-7)</option>
            <option value="aventureros">Aventureros (8-10)</option>
            <option value="heroes">Héroes (11-12)</option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="cerrarCrearAula">Cancelar</button>
          <button class="btn-primary" :disabled="creandoAula" @click="createClassroom">{{ creandoAula ? 'Creando…' : 'Crear aula' }}</button>
        </div>
      </div>
    </div>

    <!-- Modal cambio masivo de contraseña del grupo -->
    <div v-if="showResetPass" class="modal-overlay" @click.self="showResetPass = false">
      <div class="modal">
        <button class="modal-close" aria-label="Cerrar" @click="showResetPass = false">✕</button>
        <h3>🔑 Cambiar contraseña del grupo</h3>
        <p class="modal-help">Se aplicará a <b>TODOS</b> los estudiantes de <b>{{ selectedClassroom?.nombre }}</b>. Déjala vacía para usar <code>codexia123</code>.</p>
        <div class="form-group" v-if="!resetPassResult">
          <label>Nueva contraseña</label>
          <input v-model="resetPassValue" type="text" placeholder="codexia123 (por defecto)" @keyup.enter="ejecutarResetPass" />
        </div>
        <p v-if="resetPassResult" class="bulk-result">✅ {{ resetPassResult.afectados }} estudiante(s) actualizados. Nueva contraseña: <b><code>{{ resetPassResult.password }}</code></b><br><span class="muted-txt">Compártela con los estudiantes.</span></p>
        <p v-if="resetPassError" class="form-error">{{ resetPassError }}</p>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showResetPass = false">{{ resetPassResult ? 'Cerrar' : 'Cancelar' }}</button>
          <button v-if="!resetPassResult" class="btn-primary" :disabled="resetPassLoading" @click="ejecutarResetPass">
            {{ resetPassLoading ? 'Aplicando…' : 'Cambiar a todo el grupo' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal importar Klassen desde Phidias -->
    <div v-if="showPhidiasModal" class="modal-overlay" @click.self="cerrarPhidias">
      <div class="modal modal-wide">
        <button class="modal-close" aria-label="Cerrar" @click="cerrarPhidias">✕</button>
        <h3>🔗 Importar grupos desde Phidias</h3>

        <!-- Selector de modo -->
        <div class="phidias-modos">
          <button :class="['pm-tab', { on: phidiasModo === 'klasse' }]" @click="cambiarModoPhidias('klasse')">🏫 Por Klasse</button>
          <button :class="['pm-tab', { on: phidiasModo === 'mixto' }]" @click="cambiarModoPhidias('mixto')">🧑‍🤝‍🧑 Grupo mixto</button>
        </div>

        <div v-if="phidiasCargando" class="empty-state">Consultando Phidias…</div>
        <div v-else-if="phidiasError" class="form-error">{{ phidiasError }}</div>

        <!-- MODO POR KLASSE (una Klasse = un grupo) -->
        <template v-else-if="phidiasModo === 'klasse'">
          <p class="modal-help">Selecciona las Klassen. Se crea un grupo por cada una con sus estudiantes. Contraseña: <code>{{ phidiasPassword }}</code>.</p>
          <div class="form-group">
            <input v-model="phidiasBusqueda" type="text" placeholder="Buscar Klasse (ej: K4, KINDER…)" />
          </div>
          <div class="phidias-tree">
            <div v-for="nivel in phidiasFiltrado" :key="nivel.id" class="phidias-nivel">
              <p class="phidias-nivel-nombre">{{ nivel.nombre }}</p>
              <div v-for="curso in nivel.cursos" :key="curso.id" class="phidias-curso">
                <div class="phidias-curso-head">
                  <span class="phidias-curso-nombre">{{ curso.nombre }}</span>
                  <button class="btn-link" @click="toggleCurso(curso)">
                    {{ cursoCompleto(curso) ? 'Quitar todas' : 'Seleccionar todas' }}
                  </button>
                </div>
                <label v-for="k in curso.klassen" :key="k.id" class="phidias-klasse">
                  <input type="checkbox" :value="k.id" v-model="phidiasSeleccion" />
                  <span class="phidias-klasse-nombre">{{ k.nombre }}</span>
                  <span class="phidias-klasse-meta">{{ k.totalEstudiantes }} estudiantes · {{ k.bandaSugerida }}</span>
                </label>
              </div>
            </div>
            <div v-if="phidiasFiltrado.length === 0" class="empty-state">Sin resultados.</div>
          </div>
          <div class="form-group" v-if="sedes.length">
            <label>Sede <span class="opt">(opcional)</span></label>
            <select v-model="phidiasSede" class="filter-select">
              <option :value="undefined">— Sin sede —</option>
              <option v-for="s in sedes" :key="s.id" :value="s.id">{{ s.nombre }}</option>
            </select>
          </div>
          <div class="modal-actions">
            <span class="phidias-resumen" v-if="phidiasSeleccion.length">{{ phidiasSeleccion.length }} grupo(s) · {{ phidiasTotalEstudiantes }} estudiantes</span>
            <button class="btn-secondary" @click="cerrarPhidias">Cancelar</button>
            <button class="btn-primary" :disabled="!phidiasSeleccion.length || phidiasImportando" @click="importarPhidias">{{ phidiasImportando ? 'Importando…' : 'Crear grupos' }}</button>
          </div>
        </template>

        <!-- MODO MIXTO (elige estudiantes individuales de cualquier Klasse) -->
        <template v-else>
          <p class="modal-help">Elige estudiantes individuales (de cualquier Klasse) para armar UN grupo. Ordenados por apellido. Contraseña: <code>{{ phidiasPassword }}</code>.</p>
          <div class="form-group">
            <label>Nombre del grupo</label>
            <input v-model="phidiasMixtoNombre" type="text" placeholder="Ej: Club de Programación 5°-6°" />
          </div>
          <div class="form-group">
            <input v-model="phidiasMixtoBusqueda" type="text" placeholder="Buscar por apellido, nombre o curso…" />
          </div>
          <div class="phidias-lista">
            <label v-for="e in phidiasMixtoFiltrado" :key="e.phidiasId" class="phidias-est">
              <input type="checkbox" :value="e.phidiasId" v-model="phidiasMixtoSel" />
              <span class="est-nombre"><b>{{ e.apellido }}</b>, {{ e.firstname }}</span>
              <span class="est-curso">{{ e.curso }} · {{ e.klasse }}</span>
            </label>
            <div v-if="!phidiasMixtoFiltrado.length" class="empty-state">Sin estudiantes.</div>
          </div>
          <div class="modal-actions">
            <span class="phidias-resumen" v-if="phidiasMixtoSel.length">{{ phidiasMixtoSel.length }} estudiante(s) seleccionados</span>
            <button class="btn-secondary" @click="cerrarPhidias">Cancelar</button>
            <button class="btn-primary" :disabled="!phidiasMixtoSel.length || !phidiasMixtoNombre.trim() || phidiasImportando" @click="importarPhidiasMixto">
              {{ phidiasImportando ? 'Creando…' : 'Crear grupo mixto' }}
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- Modal resultado de la importación de Phidias -->
    <div v-if="phidiasResultado" class="modal-overlay" @click.self="phidiasResultado = null">
      <div class="modal modal-wide">
        <button class="modal-close" aria-label="Cerrar" @click="phidiasResultado = null">✕</button>
        <h3>✅ Grupos importados</h3>
        <p class="modal-help">
          Contraseña de acceso para todos los estudiantes: <b><code>{{ phidiasResultado.password }}</code></b>
        </p>
        <div class="bulk-creds">
          <div v-for="g in phidiasResultado.grupos" :key="g.aula_id" class="bulk-cred">
            <b>{{ g.nombre }}</b> ({{ g.curso }}) — código {{ g.codigoAcceso }} ·
            {{ g.inscritos }} inscritos, {{ g.nuevos }} cuentas nuevas
          </div>
          <div v-for="(e, i) in phidiasResultado.errores" :key="'e' + i" class="bulk-cred form-error">
            {{ e.klasse }}: {{ e.error }}
          </div>
        </div>
        <div class="modal-actions"><button class="btn-primary" @click="phidiasResultado = null">Entendido</button></div>
      </div>
    </div>

    <!-- Modal credenciales (tras crear grupo con estudiantes) -->
    <div v-if="showCredsModal" class="modal-overlay" @click.self="showCredsModal = false">
      <div class="modal modal-wide">
        <button class="modal-close" aria-label="Cerrar" @click="showCredsModal = false">✕</button>
        <h3>✅ Grupo creado</h3>
        <p class="modal-help" v-if="credsData">{{ credsData.creados.length }} estudiante(s) inscritos · {{ credsData.errores.length }} error(es). <b>Guarda estas credenciales</b>, se muestran una sola vez.</p>
        <div class="bulk-creds" v-if="credsData">
          <div v-for="c in credsData.creados" :key="c.id" class="bulk-cred">{{ c.nombre }} — {{ c.email }} <span v-if="c.password">/ {{ c.password }}</span></div>
        </div>
        <div class="modal-actions"><button class="btn-primary" @click="showCredsModal = false">Entendido</button></div>
      </div>
    </div>

    <!-- Modal ficha de seguimiento del estudiante -->
    <div v-if="showFichaModal" class="modal-overlay" @click.self="showFichaModal = false">
      <div class="modal modal-ficha">
        <button class="modal-close" aria-label="Cerrar" @click="showFichaModal = false">✕</button>
        <div v-if="fichaCargando" class="empty-state">Cargando ficha…</div>
        <template v-else-if="ficha">
          <h3>📋 {{ ficha.estudiante.nombre }}</h3>

          <!-- Resumen: anillo global + posición + actividad actual -->
          <div class="ficha-top">
            <div class="ficha-anillo">
              <div class="anillo grande" :style="anilloEstilo(ficha.global.pct)">
                <span class="anillo-in grande">{{ ficha.global.pct }}<small>%</small></span>
              </div>
              <span class="ficha-sub">{{ ficha.global.completados }}/{{ ficha.global.total }} actividades</span>
            </div>
            <div class="ficha-info">
              <div class="ficha-chip"><b>Posición en el grupo:</b> {{ ordinal(ficha.ranking.posicion) }} de {{ ficha.ranking.de }}</div>
              <div class="ficha-chip"><b>Sus actividades:</b> {{ ficha.ranking.misActividades }} · <span class="muted-txt">promedio del grupo: {{ ficha.ranking.promedioActividades }}</span></div>
              <div class="ficha-chip actual" v-if="ficha.actual && ficha.actual.nivel">
                ▶️ <b>Va en:</b> {{ ficha.actual.icono }} {{ ficha.actual.mundo }} — actividad {{ ficha.actual.nivel.orden }}: {{ ficha.actual.nivel.nombre }}
              </div>
              <div class="ficha-chip actual done" v-else>🎉 ¡Completó todas las actividades disponibles!</div>
            </div>
          </div>

          <!-- Detalle por unidad (mundo) -->
          <div class="ficha-mundos">
            <div v-for="m in ficha.mundos" :key="m.id" class="ficha-mundo">
              <div class="fm-head">
                <span class="fm-ico">{{ m.icono }}</span>
                <span class="fm-nom">{{ m.nombre }}</span>
                <span class="fm-cont" :class="pctClase(m.pct)">{{ m.completados }}/{{ m.total }} · {{ m.pct }}%</span>
              </div>
              <div class="fm-barra"><div class="fm-fill" :style="{ width: m.pct + '%' }"></div></div>
              <div class="fm-niveles">
                <span v-for="n in m.niveles" :key="n.id"
                      class="niv-dot" :class="{ hecho: n.hecho, actual: m.actualNivel && m.actualNivel.orden === n.orden && !n.hecho }"
                      :title="`Actividad ${n.orden}: ${n.nombre}${n.hecho ? ' ✓ ' + '★'.repeat(n.estrellas) : ' (pendiente)'}`">
                  {{ n.hecho ? '✓' : n.orden }}
                </span>
              </div>
            </div>
            <p v-if="!ficha.mundos.length" class="empty-state">No hay actividades para esta materia.</p>
          </div>
        </template>
        <div class="modal-actions"><button class="btn-secondary" @click="showFichaModal = false">Cerrar</button></div>
      </div>
    </div>

    <!-- Modal inscribir estudiante existente -->
    <div v-if="showEnrollModal" class="modal-overlay" @click.self="showEnrollModal = false">
      <div class="modal">
        <button class="modal-close" aria-label="Cerrar" @click="showEnrollModal = false">✕</button>
        <h3>🔗 Inscribir estudiante existente</h3>
        <p class="modal-help">Agrega al grupo <b>{{ selectedClassroom?.nombre }}</b> estudiantes que ya tienen cuenta.</p>
        <div class="form-group">
          <input v-model="enrollSearch" placeholder="Buscar por nombre o correo…" @input="cargarCandidatos" />
        </div>
        <div class="enroll-list">
          <div v-for="s in enrollCandidatos" :key="s.id" class="enroll-item">
            <div><span class="student-avatar sm">{{ getInitials(s.nombre) }}</span> {{ s.nombre }} <span class="student-email">{{ s.email }}</span></div>
            <button class="btn-mini btn-ok" @click="inscribirExistente(s)">+ Inscribir</button>
          </div>
          <p v-if="!enrollCandidatos.length" class="empty-state">No hay estudiantes disponibles para inscribir.</p>
        </div>
        <div class="modal-actions"><button class="btn-secondary" @click="showEnrollModal = false">Cerrar</button></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { teacherApi, curriculumApi, mensajeError } from '@/api/index';
import PanelCredenciales from '@/components/PanelCredenciales.vue';
import PanelAdmin from '@/components/PanelAdmin.vue';
import { MATERIAS } from '@/data/materias';

const authStore = useAuthStore();
const classrooms = ref<any[]>([]);
const students = ref<any[]>([]);
const worlds = ref<any[]>([]);
const selectedClassroom = ref<any>(null);
const isLoading = ref(false);
const showCreateModal = ref(false);
const filterWorld = ref('');
const filterModality = ref('');
const newClassroom = ref<{ nombre: string; institucion_id?: number }>({ nombre: '' });
const newClassroomAlumnos = ref(''); // estudiantes opcionales al crear el aula (uno por línea)
const newClassroomBanda = ref('aventureros');
const createResultado = ref<any>(null);

// Pestañas
const tabs = computed(() => [
  { id: 'grupos', label: 'Grupos y Progreso', icono: '🏫' },
  { id: 'seguimiento', label: 'Seguimiento', icono: '📈' },
  { id: 'estudiantes', label: 'Estudiantes', icono: '🧑‍🎓' },
  { id: 'profesores', label: 'Profesores', icono: '👩‍🏫' },
  { id: 'sedes', label: 'Sedes', icono: '🏢' },
  { id: 'asignaciones', label: 'Asignaciones', icono: '📋' },
  { id: 'estadisticas', label: 'Estadísticas', icono: '📊' },
  // Control total de las cuentas: solo para administradores.
  ...(esAdmin.value ? [{ id: 'admin', label: 'Administración', icono: '🛡️' }] : []),
]);
const activeTab = ref('grupos');

// Sedes
const sedes = ref<any[]>([]);
const showSedeModal = ref(false);
const newSede = ref({ nombre: '', ciudad: '' });

// Estudiantes (globales)
const allStudents = ref<any[]>([]);
const studentSearch = ref('');
const showStudentModal = ref(false);
const newStudent = ref({ nombre: '', email: '', password: '', banda_edad: 'aventureros' });
const studentError = ref('');

// Asignaciones
const assignments = ref<any[]>([]);
const showAssignModal = ref(false);
const assignError = ref('');
const assignMateria = ref('programacion');
const assignWorlds = ref<any[]>([]);
const materiasConContenido = ref<string[]>(['programacion']);
const newAssign = ref<any>({ tipoDestino: 'grupo', aula_id: undefined, estudiante_id: undefined, mundo_id: undefined, titulo: '', fecha_limite: '' });
const assignWorldsSel = ref<number[]>([]);
const assignTodaMateria = ref(false);

// Profesores
const teachers = ref<any[]>([]);
const showTeacherModal = ref(false);
const newTeacher = ref({ nombre: '', email: '', password: '' });
const teacherError = ref('');
async function loadTeachers() { teachers.value = (await teacherApi.getTeachers()).teachers; }
async function createTeacher() {
  teacherError.value = '';
  try { await teacherApi.createTeacher({ ...newTeacher.value }); showTeacherModal.value = false; newTeacher.value = { nombre: '', email: '', password: '' }; await loadTeachers(); }
  catch (e) { teacherError.value = mensajeError(e, 'No se pudo crear el profesor'); }
}

// Bloqueo de acceso
async function toggleBloqueoEstudiante(s: any, bloquear: boolean) { await teacherApi.blockStudent(s.id, bloquear); s.activo = !bloquear; }
async function bloquearGrupo(bloquear: boolean) {
  if (!selectedClassroom.value) return;
  if (!confirm(bloquear ? '¿Bloquear el acceso a TODO el grupo?' : '¿Desbloquear a todo el grupo?')) return;
  const r = await teacherApi.blockClassroom(selectedClassroom.value.id, bloquear);
  alert(`${bloquear ? '🔒 Grupo bloqueado' : '🔓 Grupo desbloqueado'} (${r.afectados} estudiantes).`);
}

// Cambio masivo de contraseña del grupo
const showResetPass = ref(false);
const resetPassValue = ref('');
const resetPassLoading = ref(false);
const resetPassError = ref('');
const resetPassResult = ref<any>(null);
function abrirResetPass() {
  if (!selectedClassroom.value) return;
  resetPassValue.value = '';
  resetPassResult.value = null;
  resetPassError.value = '';
  showResetPass.value = true;
}
async function ejecutarResetPass() {
  if (!selectedClassroom.value || resetPassLoading.value) return;
  resetPassLoading.value = true;
  resetPassError.value = '';
  try {
    resetPassResult.value = await teacherApi.resetGroupPasswords(selectedClassroom.value.id, resetPassValue.value.trim() || undefined);
  } catch (e: any) {
    resetPassError.value = e?.error ?? 'No se pudo cambiar la contraseña';
  } finally {
    resetPassLoading.value = false;
  }
}

// Estadísticas avanzadas
const stats2 = ref<any>({});
const statFiltro = ref<{ aula_id?: number; categoria?: string; mundo_id?: number }>({});
const statMundos = ref<any[]>([]);
function soloDefinidos(o: any) { const r: any = {}; for (const k in o) if (o[k] !== undefined && o[k] !== '' && o[k] !== null) r[k] = o[k]; return r; }
async function loadStats2() {
  if (materiasConContenido.value.length <= 1) { try { const d = await curriculumApi.getCategorias(); materiasConContenido.value = d.categorias.filter((c: any) => c.mundos > 0).map((c: any) => c.categoria); } catch { /* noop */ } }
  if (classrooms.value.length === 0) classrooms.value = (await teacherApi.getClassrooms()).classrooms;
  stats2.value = await teacherApi.getStats2(soloDefinidos(statFiltro.value));
}
async function onFiltroMateria() { statFiltro.value.mundo_id = undefined; statMundos.value = statFiltro.value.categoria ? (await curriculumApi.getWorlds(statFiltro.value.categoria)).worlds : []; await loadStats2(); }

// ===== Dashboard gráfico (stats3) =====
const stats3 = ref<any>(null);
const stat3Aula = ref<number | undefined>(undefined);
async function loadStats3() {
  if (classrooms.value.length === 0) classrooms.value = (await teacherApi.getClassrooms()).classrooms;
  stats3.value = await teacherApi.getStats3(stat3Aula.value);
}
function fmtTiempo(seg: number): string {
  if (!seg) return '0m';
  const h = Math.floor(seg / 3600), m = Math.round((seg % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${seg}s`;
}
function pctDe(v: number, max: number): number { return max > 0 ? Math.round((v / max) * 100) : 0; }
function pctMateria(m: any): number {
  const maxPos = (m.total || 0) * (m.nalumnos || 0);
  return maxPos > 0 ? Math.min(100, Math.round((m.completados / maxPos) * 100)) : 0;
}
const maxSegGrupo = computed(() => Math.max(1, ...((stats3.value?.porGrupo || []).map((g: any) => g.seg))));
const maxEstudGrupo = computed(() => Math.max(1, ...((stats3.value?.porGrupo || []).map((g: any) => g.estudiantes))));
const maxActEstud = computed(() => Math.max(1, ...((stats3.value?.topEstudiantes || []).map((s: any) => s.actividades))));
const maxSegEstud = computed(() => Math.max(1, ...((stats3.value?.topTiempo || []).map((s: any) => s.seg))));
const maxDia = computed(() => Math.max(0, ...((stats3.value?.actividadPorDia || []).map((d: any) => d.c))));
const lineaCoords = computed(() => {
  const dias = stats3.value?.actividadPorDia || [];
  const max = Math.max(1, maxDia.value);
  return dias.map((d: any, i: number) => ({
    x: dias.length > 1 ? (i / (dias.length - 1)) * 560 : 280,
    y: 150 - (d.c / max) * 135,
  }));
});
const lineaPuntos = computed(() => lineaCoords.value.map((p: any) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));
const donutEstilo = computed(() => {
  const d = stats3.value?.distribucionEstrellas || { 1: 0, 2: 0, 3: 0 };
  const total = (d[1] || 0) + (d[2] || 0) + (d[3] || 0);
  if (!total) return 'background: #E5E7EB;';
  const a = (d[1] / total) * 360, b = a + (d[2] / total) * 360;
  return `background: conic-gradient(#FDE68A 0deg ${a}deg, #FBBF24 ${a}deg ${b}deg, #F59E0B ${b}deg 360deg);`;
});

async function switchTab(id: string) {
  activeTab.value = id;
  if (id === 'sedes' && sedes.value.length === 0) await loadSedes();
  if (id === 'estudiantes') await loadAllStudents();
  if (id === 'profesores' && teachers.value.length === 0) await loadTeachers();
  if (id === 'asignaciones') await loadAssignments();
  if (id === 'estadisticas') await loadStats3();
  if (id === 'seguimiento') await initSeguimiento();
}

// ===================== SEGUIMIENTO (matriz estudiante × mundo) =====================
const matriz = ref<any>(null);
const matrizAula = ref<number | undefined>(undefined);
const matrizCategoria = ref<string>('');
const matrizCargando = ref(false);
const materiasSeguimiento = ref<{ id: string; nombre: string; icono: string }[]>([]);

async function initSeguimiento() {
  if (classrooms.value.length === 0) classrooms.value = (await teacherApi.getClassrooms()).classrooms;
  if (!matrizAula.value && classrooms.value.length) matrizAula.value = classrooms.value[0].id;
  if (materiasSeguimiento.value.length === 0) {
    try {
      const d = await curriculumApi.getCategorias();
      const conContenido = d.categorias.filter((c: any) => c.mundos > 0).map((c: any) => c.categoria);
      materiasSeguimiento.value = MATERIAS.filter((m) => conContenido.includes(m.id)).map((m) => ({ id: m.id, nombre: m.nombre, icono: m.icono }));
    } catch { /* noop */ }
  }
  if (matrizAula.value) await loadMatriz();
}
async function loadMatriz() {
  if (!matrizAula.value) { matriz.value = null; return; }
  matrizCargando.value = true;
  try { matriz.value = await teacherApi.getMatriz(matrizAula.value, matrizCategoria.value || undefined); }
  finally { matrizCargando.value = false; }
}
// Materias de preescolar (no están en el catálogo MATERIAS general).
const PREESCOLAR_MAT: Record<string, { icono: string; nombre: string }> = {
  mate_preescolar: { icono: '🔢', nombre: 'Mate Preescolar' },
  lectoescritura: { icono: '🔤', nombre: 'Lectoescritura' },
  prog_preescolar: { icono: '🐺', nombre: 'Prog. Preescolar' },
  mundos_preescolar: { icono: '🪄', nombre: 'Mundos Mágicos' },
};
// Ícono/nombre de una columna: mundo (trae su ícono) o materia (se resuelve del catálogo).
function colIcono(col: any): string {
  if (col.icono) return col.icono;
  return MATERIAS.find((m) => m.id === col.categoria)?.icono ?? PREESCOLAR_MAT[col.categoria]?.icono ?? '📚';
}
function colNombre(col: any): string {
  if (col.icono) return col.nombre; // mundo: nombre propio
  return MATERIAS.find((m) => m.id === col.categoria)?.nombre ?? PREESCOLAR_MAT[col.categoria]?.nombre ?? col.nombre;
}
// Color según porcentaje: rojo → ámbar → verde → dorado (100%)
function pctClase(pct: number): string {
  if (pct >= 100) return 'c-full';
  if (pct >= 70) return 'c-high';
  if (pct >= 40) return 'c-mid';
  if (pct > 0) return 'c-low';
  return 'c-zero';
}
function anilloEstilo(pct: number): string {
  const color = pct >= 100 ? '#F59E0B' : pct >= 70 ? '#22C55E' : pct >= 40 ? '#EAB308' : pct > 0 ? '#F97316' : '#E5E7EB';
  return `background: conic-gradient(${color} ${pct * 3.6}deg, #E5E7EB 0deg);`;
}

// --- Ficha de seguimiento de un estudiante (nivel por nivel + ranking) ---
const showFichaModal = ref(false);
const ficha = ref<any>(null);
const fichaCargando = ref(false);
async function abrirFicha(estudianteId: number) {
  if (!matrizAula.value) return;
  showFichaModal.value = true;
  ficha.value = null;
  fichaCargando.value = true;
  try { ficha.value = await teacherApi.getFichaEstudiante(matrizAula.value, estudianteId, matrizCategoria.value || undefined); }
  finally { fichaCargando.value = false; }
}
function ordinal(n: number): string { return `${n}º`; }

// ===================== AGREGAR ESTUDIANTES A UN GRUPO =====================
const studentAulaTarget = ref<number | undefined>(undefined); // si está, createStudent inscribe aquí
const showEnrollModal = ref(false);
const enrollSearch = ref('');
const enrollCandidatos = ref<any[]>([]);
function abrirNuevoEnGrupo() {
  studentAulaTarget.value = selectedClassroom.value?.id;
  studentError.value = '';
  newStudent.value = { nombre: '', email: '', password: '', banda_edad: 'aventureros' };
  showStudentModal.value = true;
}
async function abrirInscribirExistente() {
  if (!selectedClassroom.value) return;
  showEnrollModal.value = true;
  enrollSearch.value = '';
  await cargarCandidatos();
}
async function cargarCandidatos() {
  const todos = (await teacherApi.getAllStudents(enrollSearch.value || undefined)).students;
  const inscritos = new Set(students.value.map((s) => s.id));
  enrollCandidatos.value = todos.filter((s: any) => !inscritos.has(s.id));
}
async function inscribirExistente(s: any) {
  await teacherApi.enrollStudent(selectedClassroom.value.id, s.id);
  enrollCandidatos.value = enrollCandidatos.value.filter((c) => c.id !== s.id);
  await selectClassroom(selectedClassroom.value);
}
function abrirMasivoEnGrupo() {
  openBulkModal();
  bulkAula.value = selectedClassroom.value?.id;
}

// --- Asignar mundos a ESTE grupo (desde el detalle) ---
const asignacionesDelGrupo = computed(() =>
  selectedClassroom.value ? assignments.value.filter((a) => a.aulaId === selectedClassroom.value.id && a.mundoId) : []
);
async function abrirAsignarAGrupo() {
  if (!selectedClassroom.value) return;
  showAssignModal.value = true;
  assignError.value = '';
  newAssign.value = { tipoDestino: 'grupo', aula_id: selectedClassroom.value.id, estudiante_id: undefined, mundo_id: undefined, titulo: '', fecha_limite: '' };
  // materias con contenido para el selector
  try { const d = await curriculumApi.getCategorias(); materiasConContenido.value = d.categorias.filter((c: any) => c.mundos > 0).map((c: any) => c.categoria); } catch { /* noop */ }
  await loadAssignWorlds();
}
async function quitarAsignacionGrupo(a: any) {
  if (!confirm(`¿Quitar "${a.mundoNombre}" de ${selectedClassroom.value?.nombre}? Los estudiantes dejarán de verlo.`)) return;
  await teacherApi.deleteAssignment(a.id);
  await loadAssignments();
}

// --------------- Administracion de grupos, cuentas y sedes ---------------
const esAdmin = computed(() => authStore.user?.rol === 'admin');
const miId = computed(() => authStore.user?.id);

/** Un docente administra SUS grupos; un admin, todos. */
function puedeAdministrar(aula: any): boolean {
  if (!aula) return false;
  return esAdmin.value || aula.esMio !== false;
}

/** Panel de acceso con dibujos del grupo abierto. */
const showCredenciales = ref(false);

// --- Editar grupo ---
const showEditGroupModal = ref(false);
const editGroup = ref<{ id: number | null; nombre: string; institucion_id: number | null }>({ id: null, nombre: '', institucion_id: null });
const groupError = ref('');
const guardandoGrupo = ref(false);

async function abrirEditarGrupo() {
  if (!selectedClassroom.value) return;
  if (!sedes.value.length) await loadSedes();
  groupError.value = '';
  editGroup.value = {
    id: selectedClassroom.value.id,
    nombre: selectedClassroom.value.nombre,
    institucion_id: selectedClassroom.value.institucion?.id ?? selectedClassroom.value.institucionId ?? null,
  };
  showEditGroupModal.value = true;
}

async function guardarGrupo() {
  if (!editGroup.value.id || guardandoGrupo.value) return;
  groupError.value = '';
  guardandoGrupo.value = true;
  try {
    await teacherApi.updateClassroom(editGroup.value.id, {
      nombre: editGroup.value.nombre,
      institucion_id: editGroup.value.institucion_id,
    });
    classrooms.value = (await teacherApi.getClassrooms()).classrooms;
    const actualizada = classrooms.value.find((c) => c.id === editGroup.value.id);
    if (actualizada) selectedClassroom.value = actualizada;
    await loadSedes();
    showEditGroupModal.value = false;
  } catch (e) {
    groupError.value = mensajeError(e, 'No se pudo guardar el grupo');
  } finally {
    guardandoGrupo.value = false;
  }
}

// --- Eliminar grupo ---
const showDeleteGroupModal = ref(false);
const borrarGrupo = ref({ id: 0, nombre: '', estudiantes: 0, asignaciones: 0 });
const borrandoGrupo = ref(false);

async function abrirBorrarGrupo() {
  if (!selectedClassroom.value) return;
  groupError.value = '';
  const id = selectedClassroom.value.id;
  try {
    const imp = await teacherApi.getClassroomDeleteImpact(id);
    borrarGrupo.value = { id, nombre: imp.nombre, estudiantes: imp.estudiantes, asignaciones: imp.asignaciones };
    showDeleteGroupModal.value = true;
  } catch (e) {
    alert(mensajeError(e, 'No se pudo consultar el grupo'));
  }
}

async function confirmarBorrarGrupo() {
  if (borrandoGrupo.value) return;
  groupError.value = '';
  borrandoGrupo.value = true;
  try {
    await teacherApi.deleteClassroom(borrarGrupo.value.id);
    classrooms.value = (await teacherApi.getClassrooms()).classrooms;
    const siguiente = classrooms.value[0] ?? null;
    selectedClassroom.value = siguiente;
    if (siguiente) await selectClassroom(siguiente);
    await loadSedes();
    showDeleteGroupModal.value = false;
  } catch (e) {
    groupError.value = mensajeError(e, 'No se pudo eliminar el grupo');
  } finally {
    borrandoGrupo.value = false;
  }
}

// --- Sacar del grupo (conserva la cuenta) ---
async function quitarDelGrupo(estudiante: any) {
  if (!selectedClassroom.value) return;
  const ok = confirm(
    '\u00bfSacar a ' + estudiante.nombre + ' de "' + selectedClassroom.value.nombre + '"?\n\n' +
    'Su cuenta y todo su progreso se conservan: solo deja de pertenecer a este grupo.',
  );
  if (!ok) return;
  try {
    await teacherApi.removeStudentFromClassroom(selectedClassroom.value.id, estudiante.id);
    await selectClassroom(selectedClassroom.value);
    classrooms.value = (await teacherApi.getClassrooms()).classrooms;
  } catch (e) {
    alert(mensajeError(e, 'No se pudo sacar del grupo'));
  }
}

// --- Eliminar la cuenta de un estudiante ---
const showDeleteStudentModal = ref(false);
const borrarAlumno = ref({ id: 0, nombre: '', email: '', grupos: 0, sesiones: 0, completados: 0, logros: 0 });
const borrandoAlumno = ref(false);

async function abrirBorrarEstudiante(estudiante: any) {
  studentError.value = '';
  try {
    const imp = await teacherApi.getStudentDeleteImpact(estudiante.id);
    borrarAlumno.value = { id: estudiante.id, ...imp };
    showDeleteStudentModal.value = true;
  } catch (e) {
    alert(mensajeError(e, 'No se pudo consultar el estudiante'));
  }
}

async function confirmarBorrarEstudiante() {
  if (borrandoAlumno.value) return;
  studentError.value = '';
  borrandoAlumno.value = true;
  try {
    await teacherApi.deleteStudent(borrarAlumno.value.id);
    if (selectedClassroom.value) await selectClassroom(selectedClassroom.value);
    classrooms.value = (await teacherApi.getClassrooms()).classrooms;
    if (allStudents.value.length) await loadAllStudents();
    showDeleteStudentModal.value = false;
  } catch (e) {
    studentError.value = mensajeError(e, 'No se pudo eliminar la cuenta');
  } finally {
    borrandoAlumno.value = false;
  }
}

// --- Eliminar profesor ---
async function borrarProfesor(t: any) {
  if (!confirm('\u00bfEliminar la cuenta de ' + t.nombre + '?\n\nSi todavia tiene grupos, el sistema no lo permitira.')) return;
  try {
    await teacherApi.deleteTeacher(t.id);
    await loadTeachers();
  } catch (e) {
    alert(mensajeError(e, 'No se pudo eliminar el profesor'));
  }
}

// --- Sedes ---
const sedeError = ref('');
const sedeEditandoId = ref<number | null>(null);
const guardandoSede = ref(false);

async function loadSedes() { sedes.value = (await teacherApi.getSedes()).sedes; }

function abrirEditarSede(s: any) {
  sedeError.value = '';
  sedeEditandoId.value = s.id;
  newSede.value = { nombre: s.nombre, ciudad: s.ciudad ?? '' };
  showSedeModal.value = true;
}

async function createSede() {
  if (!newSede.value.nombre || guardandoSede.value) return;
  sedeError.value = '';
  guardandoSede.value = true;
  try {
    const payload = { nombre: newSede.value.nombre, ciudad: newSede.value.ciudad || undefined };
    if (sedeEditandoId.value) await teacherApi.updateSede(sedeEditandoId.value, payload);
    else await teacherApi.createSede(payload);
    await loadSedes();
    showSedeModal.value = false;
    sedeEditandoId.value = null;
    newSede.value = { nombre: '', ciudad: '' };
  } catch (e) {
    sedeError.value = mensajeError(e, 'No se pudo guardar la sede');
  } finally {
    guardandoSede.value = false;
  }
}

async function borrarSede(s: any) {
  sedeError.value = '';
  if (!confirm('\u00bfEliminar la sede "' + s.nombre + '"?')) return;
  try {
    await teacherApi.deleteSede(s.id);
    await loadSedes();
  } catch (e: any) {
    // El backend responde 409 si la sede esta en uso: se pide confirmar el desvinculo.
    if (e?.requiereConfirmacion) {
      if (!confirm(e.error + '\n\n\u00bfContinuar? Los grupos y estudiantes NO se borran: solo quedan sin sede.')) return;
      try {
        await teacherApi.deleteSede(s.id, true);
        await loadSedes();
        classrooms.value = (await teacherApi.getClassrooms()).classrooms;
      } catch (e2) {
        sedeError.value = mensajeError(e2, 'No se pudo eliminar la sede');
      }
      return;
    }
    sedeError.value = mensajeError(e, 'No se pudo eliminar la sede');
  }
}

async function loadAllStudents() { allStudents.value = (await teacherApi.getAllStudents(studentSearch.value || undefined)).students; }
async function createStudent() {
  studentError.value = '';
  try {
    const payload: any = { ...newStudent.value };
    if (studentAulaTarget.value) payload.aula_id = studentAulaTarget.value;
    await teacherApi.createStudent(payload);
    showStudentModal.value = false;
    newStudent.value = { nombre: '', email: '', password: '', banda_edad: 'aventureros' };
    if (studentAulaTarget.value && selectedClassroom.value?.id === studentAulaTarget.value) {
      await selectClassroom(selectedClassroom.value); // refresca la lista del grupo
    }
    studentAulaTarget.value = undefined;
    if (activeTab.value === 'estudiantes') await loadAllStudents();
  } catch (e: any) {
    studentError.value = mensajeError(e, 'No se pudo crear');
  }
}

async function loadAssignments() {
  assignments.value = (await teacherApi.getAssignments()).assignments;
  if (allStudents.value.length === 0) await loadAllStudents();
  // Materias con contenido para el selector
  try {
    const data = await curriculumApi.getCategorias();
    materiasConContenido.value = data.categorias.filter((c: any) => c.mundos > 0).map((c: any) => c.categoria);
  } catch { /* noop */ }
}
async function loadAssignWorlds() {
  assignWorlds.value = (await curriculumApi.getWorlds(assignMateria.value)).worlds;
  assignWorldsSel.value = []; assignTodaMateria.value = false;
}
async function openAssignModal() {
  showAssignModal.value = true;
  assignError.value = '';
  if (classrooms.value.length === 0) classrooms.value = (await teacherApi.getClassrooms()).classrooms;
  await loadAssignWorlds();
}
async function createAssignment() {
  assignError.value = '';
  const a = newAssign.value;
  const destino: any = {};
  if (a.tipoDestino === 'grupo') destino.aula_id = a.aula_id; else destino.estudiante_id = a.estudiante_id;
  if (!destino.aula_id && !destino.estudiante_id) { assignError.value = 'Selecciona un grupo o un estudiante'; return; }
  const payload: any = { ...destino, titulo: a.titulo || undefined, fecha_limite: a.fecha_limite || undefined };
  if (assignTodaMateria.value) payload.categoria = assignMateria.value;
  else if (assignWorldsSel.value.length) payload.mundo_ids = assignWorldsSel.value;
  else { assignError.value = 'Marca al menos un mundo, o "toda la materia".'; return; }
  try {
    const res = await teacherApi.assignMulti(payload);
    showAssignModal.value = false;
    newAssign.value = { tipoDestino: 'grupo', aula_id: undefined, estudiante_id: undefined, mundo_id: undefined, titulo: '', fecha_limite: '' };
    assignWorldsSel.value = []; assignTodaMateria.value = false;
    await loadAssignments();
    alert(`✅ ${res.creadas} mundo(s) asignados correctamente.`);
  } catch (e: any) {
    assignError.value = mensajeError(e, 'No se pudo asignar');
  }
}
async function deleteAssignment(id: number) {
  await teacherApi.deleteAssignment(id);
  assignments.value = assignments.value.filter((a) => a.id !== id);
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

// --- Carga masiva ---
const showBulkModal = ref(false);
const bulkText = ref('');
const bulkAula = ref<number | undefined>(undefined);
const bulkBanda = ref('aventureros');
const bulkResultado = ref<any>(null);
const bulkLineas = computed(() => bulkText.value.split('\n').map((l) => l.trim()).filter(Boolean).length);
function openBulkModal() { showBulkModal.value = true; bulkResultado.value = null; if (classrooms.value.length === 0) teacherApi.getClassrooms().then((d) => (classrooms.value = d.classrooms)); }
async function enviarBulk() {
  const estudiantes = bulkText.value.split('\n').map((l) => l.trim()).filter(Boolean).map((linea) => {
    const [nombre, email, password] = linea.split(',').map((x) => x.trim());
    return { nombre, email: email || undefined, password: password || undefined };
  }).filter((e) => e.nombre);
  if (!estudiantes.length) return;
  bulkResultado.value = await teacherApi.bulkStudents({ aula_id: bulkAula.value, banda_edad: bulkBanda.value, estudiantes });
  if (activeTab.value === 'estudiantes') await loadAllStudents();
}

// --- Progreso de asignación ---
const showProgModal = ref(false);
const progData = ref<any>(null);
async function verProgreso(a: any) {
  showProgModal.value = true; progData.value = null;
  progData.value = await teacherApi.getAssignmentProgress(a.id);
}

// --- Estadísticas ---
const NOMBRES_MAT: Record<string, string> = { programacion: '🧑‍💻 Programación', logica: '🧠 Lógica', informatica: '💻 Informática', seguridad: '🛡️ Seguridad', ia: '🤖 IA', aritmetica: '➕ Aritmética', geometria: '📐 Geometría', fisica: '🔬 Física', lenguaje: '✍️ Lenguaje', ciencias: '🧪 Ciencias', mate_preescolar: '🔢 Mate Preescolar', lectoescritura: '🔤 Lectoescritura', prog_preescolar: '🐺 Prog. Preescolar', mundos_preescolar: '🪄 Mundos Mágicos' };
function nombreMateria(c: string) { return NOMBRES_MAT[c] ?? c; }
const maxMateria2 = computed(() => Math.max(1, ...((stats2.value.porMateria || []).map((m: any) => m.completados))));
function barWidth2(v: number) { return Math.round((v / maxMateria2.value) * 100); }

const filteredStudents = computed(() => {
  let list = students.value;
  if (filterModality.value) {
    list = list.filter((s) => s.modalidadPref === filterModality.value);
  }
  return list;
});

function getInitials(nombre: string): string {
  return nombre.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
}

function starsPercent(stars: number): number {
  const max = 30;
  return Math.min(Math.round((stars / max) * 100), 100);
}

function bloquesPercent(student: any): number {
  const total = (student.enviosBloques ?? 0) + (student.enviosTexto ?? 0);
  if (total === 0) return 100;
  return Math.round(((student.enviosBloques ?? 0) / total) * 100);
}

const totalBloquesPercent = computed(() => {
  const total = students.value.length;
  if (total === 0) return 0;
  const bloques = students.value.filter((s) => s.modalidadPref === 'bloques').length;
  return Math.round((bloques / total) * 100);
});

const totalMixtoPercent = computed(() => {
  const total = students.value.length;
  if (total === 0) return 0;
  const mixto = students.value.filter((s) => s.modalidadPref === 'bloques_texto').length;
  return Math.round((mixto / total) * 100);
});

const totalTextoPercent = computed(() => {
  return 100 - totalBloquesPercent.value - totalMixtoPercent.value;
});

async function selectClassroom(aula: any) {
  selectedClassroom.value = aula;
  isLoading.value = true;
  try {
    const data = await teacherApi.getStudents(aula.id);
    students.value = data.students;
    // Asignaciones (para mostrar los mundos asignados a este grupo)
    if (assignments.value.length === 0) { try { await loadAssignments(); } catch { /* noop */ } }
  } finally {
    isLoading.value = false;
  }
}

const creandoAula = ref(false);
const showCredsModal = ref(false);
const credsData = ref<any>(null);
/**
 * Abre el modal de crear grupo.
 *
 * Carga las sedes primero: antes solo se cargaban al visitar la pestaña Sedes,
 * así que quien iba directo a "+ Nuevo Grupo" veía el desplegable vacío y
 * parecía que no se podía asignar sede.
 */
async function abrirNuevoEstudiante() {
  showStudentModal.value = true;
  if (!sedes.value.length) await loadSedes().catch(() => { /* opcional */ });
}

async function abrirCrearGrupo() {
  showCreateModal.value = true;
  if (!sedes.value.length) await loadSedes().catch(() => { /* sin sedes se crea igual */ });
}

async function createClassroom() {
  if (!newClassroom.value.nombre || creandoAula.value) return;
  creandoAula.value = true;
  try {
    const data = await teacherApi.createClassroom({
      nombre: newClassroom.value.nombre,
      institucion_id: newClassroom.value.institucion_id,
    });

    // Si el docente escribió estudiantes, se crean e inscriben de una vez.
    let resultado: any = null;
    const lineas = newClassroomAlumnos.value.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lineas.length) {
      const estudiantes = lineas.map((linea) => {
        const [nombre, email, password] = linea.split(',').map((x) => x.trim());
        return { nombre, email: email || undefined, password: password || undefined };
      }).filter((e) => e.nombre);
      resultado = await teacherApi.bulkStudents({ aula_id: data.classroom.id, banda_edad: newClassroomBanda.value, estudiantes });
    }

    // Refresca el fondo: recarga aulas, abre el grupo nuevo y cierra el pop-up.
    classrooms.value = (await teacherApi.getClassrooms()).classrooms;
    const nueva = classrooms.value.find((c) => c.id === data.classroom.id) ?? data.classroom;
    activeTab.value = 'grupos';
    await selectClassroom(nueva);
    cerrarCrearAula();

    // Si se generaron credenciales, se muestran en un modal aparte (para no perderlas).
    if (resultado && resultado.creados?.length) {
      credsData.value = resultado;
      showCredsModal.value = true;
    }
  } finally {
    creandoAula.value = false;
  }
}
function cerrarCrearAula() {
  showCreateModal.value = false;
  newClassroom.value.nombre = '';
  newClassroomAlumnos.value = '';
  newClassroomBanda.value = 'aventureros';
  createResultado.value = null;
}

// ===================== IMPORTAR GRUPOS DESDE PHIDIAS =====================
// Phidias entrega los estudiantes matriculados agrupados por Klasse; cada Klasse se vuelve un grupo.
const showPhidiasModal = ref(false);
const phidiasNiveles = ref<any[]>([]);
const phidiasSeleccion = ref<number[]>([]);
const phidiasBusqueda = ref('');
const phidiasSede = ref<number | undefined>(undefined);
const phidiasCargando = ref(false);
const phidiasImportando = ref(false);
const phidiasError = ref('');
const phidiasResultado = ref<any>(null);
const phidiasPassword = 'codexia123';

// Modo del modal: 'klasse' (una Klasse = un grupo) o 'mixto' (elegir estudiantes individuales).
const phidiasModo = ref<'klasse' | 'mixto'>('klasse');
const phidiasEstudiantes = ref<any[]>([]);
const phidiasMixtoNombre = ref('');
const phidiasMixtoBusqueda = ref('');
const phidiasMixtoSel = ref<number[]>([]);

const phidiasMixtoFiltrado = computed(() => {
  const q = phidiasMixtoBusqueda.value.trim().toLowerCase();
  const lista = phidiasEstudiantes.value;
  if (!q) return lista;
  return lista.filter((e: any) => `${e.apellido} ${e.firstname} ${e.curso} ${e.klasse}`.toLowerCase().includes(q));
});

async function cambiarModoPhidias(modo: 'klasse' | 'mixto') {
  phidiasModo.value = modo;
  phidiasError.value = '';
  if (modo === 'mixto' && phidiasEstudiantes.value.length === 0) {
    phidiasCargando.value = true;
    try {
      phidiasEstudiantes.value = (await teacherApi.getPhidiasEstudiantes()).estudiantes;
    } catch (e: any) {
      phidiasError.value = e?.error ?? 'No se pudieron cargar los estudiantes de Phidias';
    } finally {
      phidiasCargando.value = false;
    }
  }
}

async function importarPhidiasMixto() {
  if (!phidiasMixtoSel.value.length || !phidiasMixtoNombre.value.trim() || phidiasImportando.value) return;
  phidiasImportando.value = true;
  phidiasError.value = '';
  try {
    const data = await teacherApi.importPhidiasMixto({
      nombre: phidiasMixtoNombre.value.trim(),
      phidias_ids: phidiasMixtoSel.value,
      institucion_id: phidiasSede.value,
    });
    classrooms.value = (await teacherApi.getClassrooms()).classrooms;
    const nueva = classrooms.value.find((c) => c.id === data.aula?.id);
    if (nueva) await selectClassroom(nueva);
    cerrarPhidias();
    // Reutiliza el modal de resultado mostrando el grupo mixto creado.
    phidiasResultado.value = { grupos: [{ aula_id: data.aula.id, nombre: data.aula.nombre, codigoAcceso: data.aula.codigoAcceso, totalEstudiantes: data.totalSeleccionados, nuevos: data.nuevos, inscritos: data.inscritos }], errores: [], password: data.password };
  } catch (e: any) {
    phidiasError.value = e?.error ?? 'No se pudo crear el grupo mixto';
  } finally {
    phidiasImportando.value = false;
  }
}

const phidiasFiltrado = computed(() => {
  const q = phidiasBusqueda.value.trim().toLowerCase();
  if (!q) return phidiasNiveles.value;
  return phidiasNiveles.value
    .map((nivel: any) => ({
      ...nivel,
      cursos: nivel.cursos
        .map((curso: any) => ({
          ...curso,
          klassen: curso.klassen.filter(
            (k: any) => k.nombre.toLowerCase().includes(q) || curso.nombre.toLowerCase().includes(q),
          ),
        }))
        .filter((curso: any) => curso.klassen.length > 0),
    }))
    .filter((nivel: any) => nivel.cursos.length > 0);
});

const phidiasTotalEstudiantes = computed(() => {
  const sel = new Set(phidiasSeleccion.value);
  let total = 0;
  for (const nivel of phidiasNiveles.value) {
    for (const curso of nivel.cursos) {
      for (const k of curso.klassen) if (sel.has(k.id)) total += k.totalEstudiantes;
    }
  }
  return total;
});

function cursoCompleto(curso: any): boolean {
  return curso.klassen.length > 0 && curso.klassen.every((k: any) => phidiasSeleccion.value.includes(k.id));
}

function toggleCurso(curso: any) {
  const ids = curso.klassen.map((k: any) => k.id);
  phidiasSeleccion.value = cursoCompleto(curso)
    ? phidiasSeleccion.value.filter((id) => !ids.includes(id))
    : [...new Set([...phidiasSeleccion.value, ...ids])];
}

async function abrirPhidias() {
  showPhidiasModal.value = true;
  phidiasError.value = '';
  phidiasModo.value = 'klasse';
  phidiasSeleccion.value = [];
  phidiasBusqueda.value = '';
  phidiasMixtoSel.value = [];
  phidiasMixtoNombre.value = '';
  phidiasMixtoBusqueda.value = '';
  if (sedes.value.length === 0) await loadSedes().catch(() => {});
  if (phidiasNiveles.value.length) return;
  phidiasCargando.value = true;
  try {
    phidiasNiveles.value = (await teacherApi.getPhidiasKlassen()).niveles;
  } catch (e: any) {
    phidiasError.value = e?.error ?? 'No se pudo conectar con Phidias';
  } finally {
    phidiasCargando.value = false;
  }
}

function cerrarPhidias() {
  showPhidiasModal.value = false;
  phidiasSeleccion.value = [];
  phidiasMixtoSel.value = [];
  phidiasMixtoNombre.value = '';
}

async function importarPhidias() {
  if (!phidiasSeleccion.value.length || phidiasImportando.value) return;
  if (phidiasSeleccion.value.length > 60) {
    phidiasError.value = 'Selecciona máximo 60 Klassen por importación. Divídelo en varias tandas.';
    return;
  }
  phidiasImportando.value = true;
  phidiasError.value = '';
  try {
    const data = await teacherApi.importPhidias({
      seccion_ids: phidiasSeleccion.value,
      institucion_id: phidiasSede.value,
    });
    classrooms.value = (await teacherApi.getClassrooms()).classrooms;
    const primera = classrooms.value.find((c) => c.id === data.grupos[0]?.aula_id);
    if (primera) await selectClassroom(primera);
    cerrarPhidias();
    phidiasResultado.value = data;
  } catch (e: any) {
    phidiasError.value = e?.error ?? 'No se pudo importar';
  } finally {
    phidiasImportando.value = false;
  }
}

onMounted(async () => {
  isLoading.value = true;
  try {
    const [classData, worldData] = await Promise.all([
      teacherApi.getClassrooms(),
      curriculumApi.getWorlds(),
    ]);
    classrooms.value = classData.classrooms;
    worlds.value = worldData.worlds;
    if (classrooms.value.length > 0) {
      await selectClassroom(classrooms.value[0]);
    }
  } finally {
    isLoading.value = false;
  }
});
</script>

<style scoped>
.teacher-page {
  min-height: 100vh;
  background: #F8FAFC;
  display: flex;
  flex-direction: column;
}

.teacher-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: #6B46C1;
  color: white;
}

.teacher-header h1 { font-size: 1.4rem; margin: 0; flex: 1; }

.teacher-layout {
  display: flex;
  flex: 1;
}

.classrooms-panel {
  width: 260px;
  background: white;
  border-right: 1px solid #E5E7EB;
  padding: 1rem;
  flex-shrink: 0;
}

.classrooms-panel h3 { margin: 0 0 1rem; color: #374151; }

.classrooms-list { display: flex; flex-direction: column; gap: 0.5rem; }

.classroom-item {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem;
  border-radius: 12px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.classroom-item:hover { background: #F5F3FF; }
.classroom-item.active { background: #F5F3FF; border-color: #8B5CF6; }
.classroom-icon { font-size: 1.5rem; }
.classroom-name { margin: 0; font-weight: 700; color: #374151; font-size: 0.9rem; }
.classroom-meta { margin: 0; font-size: 0.75rem; color: #6B7280; }

.empty-state { color: #9CA3AF; font-size: 0.9rem; text-align: center; padding: 1rem; }

.classroom-detail {
  flex: 1;
  padding: 1.5rem;
  overflow: auto;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.detail-header h2 { margin: 0; color: #1E293B; }

.filter-row { display: flex; gap: 0.5rem; }

.filter-select {
  padding: 0.4rem 0.75rem;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #374151;
  background: white;
}

.table-wrapper { overflow-x: auto; }

.progress-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.progress-table th {
  background: #F1F5F9;
  color: #475569;
  font-size: 0.75rem;
  text-transform: uppercase;
  padding: 0.6rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid #E2E8F0;
}

.progress-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #F1F5F9;
  color: #374151;
}

.progress-table tr:hover td { background: #F8FAFC; }

.student-cell { display: flex; gap: 0.5rem; align-items: center; }

/* ===== Agregar estudiantes al grupo ===== */
.add-row { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; margin: .25rem 0 .5rem; }
.add-label { font-weight: 600; color: #4B5563; font-size: .9rem; }
.btn-add { background: #EEF2FF; color: #4338CA; border: 1px solid #C7D2FE; border-radius: 10px; padding: .4rem .75rem; font-weight: 600; cursor: pointer; font-size: .88rem; }
.btn-add:hover { background: #E0E7FF; }
.asig-row { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; margin: .1rem 0 .5rem; }
.btn-asig { background: #ECFDF5; color: #047857; border-color: #A7F3D0; }
.btn-asig:hover { background: #D1FAE5; }
.mundo-chip { display: inline-flex; align-items: center; gap: .35rem; background: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 999px; padding: .25rem .6rem; font-size: .82rem; color: #334155; }
.chip-x { border: none; background: transparent; color: #94A3B8; cursor: pointer; font-size: .8rem; padding: 0; line-height: 1; }
.chip-x:hover { color: #DC2626; }
.asig-vacio { font-size: .82rem; color: #64748B; }
.opt { color: #9CA3AF; font-weight: 400; font-size: .85rem; }

/* ===== Inscribir existente ===== */
.enroll-list { max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: .4rem; margin: .5rem 0; }
.enroll-item { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding: .5rem .6rem; border: 1px solid #E5E7EB; border-radius: 10px; }
.student-avatar.sm { width: 28px; height: 28px; font-size: .72rem; }

/* ===== SEGUIMIENTO: matriz ===== */
.seg-filtros { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
.seg-filtros .form-group { min-width: 220px; }
.seg-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: .8rem; margin-bottom: 1rem; }
.seg-card { background: white; border: 1px solid #E5E7EB; border-radius: 14px; padding: .9rem 1rem; display: flex; flex-direction: column; gap: .2rem; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
.seg-card-num { font-size: 1.7rem; font-weight: 800; color: #111827; line-height: 1; }
.seg-card-lbl { font-size: .82rem; color: #6B7280; }
.seg-card.ok { border-color: #86EFAC; background: #F0FDF4; }
.seg-card.mid { border-color: #FDE68A; background: #FEFCE8; }
.seg-card.low { border-color: #FDBA74; background: #FFF7ED; }

.seg-leyenda { display: flex; gap: 1.1rem; flex-wrap: wrap; align-items: center; margin-bottom: .8rem; font-size: .82rem; color: #4B5563; }
.seg-leyenda i.lg { display: inline-block; width: 16px; height: 16px; border-radius: 4px; vertical-align: -3px; margin-right: .25rem; }

/* Escala de color por porcentaje */
.c-zero { background: #F3F4F6; color: #9CA3AF; }
.c-low  { background: #FEE2E2; color: #B91C1C; }
.c-mid  { background: #FEF3C7; color: #B45309; }
.c-high { background: #D1FAE5; color: #047857; }
.c-full { background: #FCD34D; color: #92400E; }

.matriz-wrap { border: 1px solid #E5E7EB; border-radius: 14px; background: white; }
table.matriz { border-collapse: separate; border-spacing: 0; width: max-content; min-width: 100%; }
table.matriz th, table.matriz td { padding: .5rem; text-align: center; }
table.matriz thead th { position: sticky; top: 0; background: #F9FAFB; z-index: 2; border-bottom: 2px solid #E5E7EB; }
.col-est { position: sticky; left: 0; z-index: 3; background: white; text-align: left !important; min-width: 190px; border-right: 2px solid #E5E7EB; }
table.matriz thead th.col-est { z-index: 4; background: #F9FAFB; }
.col-act { min-width: 74px; max-width: 90px; }
.act-ico { display: block; font-size: 1.35rem; line-height: 1; }
.act-nom { display: block; font-size: .68rem; color: #6B7280; margin-top: .2rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 84px; }
.col-total { min-width: 84px; background: #FafafA; position: sticky; right: 0; z-index: 2; border-left: 2px solid #E5E7EB; }
table.matriz thead th.col-total { z-index: 4; }

.celda-box { border-radius: 8px; padding: .45rem .2rem; font-weight: 700; font-size: .85rem; min-width: 46px; }
.celda-box small { font-weight: 600; font-size: .7rem; opacity: .8; }
.student-name.inactivo { color: #9CA3AF; text-decoration: line-through; }

.anillo { width: 46px; height: 46px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto; }
.anillo-in { width: 34px; height: 34px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: .78rem; color: #374151; }
.anillo-in small { font-size: .6rem; }
.anillo.grande { width: 92px; height: 92px; }
.anillo-in.grande { width: 70px; height: 70px; font-size: 1.35rem; color: #111827; }
.trofeo { display: block; font-size: .9rem; margin-top: .1rem; }

/* Nombre clicable en la matriz → abre ficha */
.student-link { background: none; border: none; cursor: pointer; width: 100%; padding: 0; text-align: left; }
.student-link:hover .student-name { color: #6D28D9; text-decoration: underline; }
.ver-ficha { margin-left: auto; opacity: 0; font-size: .8rem; }
.student-link:hover .ver-ficha { opacity: .7; }

/* Ficha de seguimiento del estudiante */
.modal-ficha { width: min(680px, 94vw); max-height: 88vh; overflow-y: auto; }
.ficha-top { display: flex; gap: 1.2rem; align-items: center; background: #F8FAFC; border: 1px solid #E5E7EB; border-radius: 14px; padding: 1rem; flex-wrap: wrap; }
.ficha-anillo { display: flex; flex-direction: column; align-items: center; gap: .3rem; }
.ficha-sub { font-size: .78rem; color: #6B7280; }
.ficha-info { flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: .4rem; }
.ficha-chip { font-size: .9rem; color: #374151; }
.ficha-chip .muted-txt { color: #9CA3AF; }
.ficha-chip.actual { background: #EDE9FE; color: #5B21B6; border-radius: 8px; padding: .5rem .7rem; font-weight: 500; }
.ficha-chip.actual.done { background: #DCFCE7; color: #166534; }
.ficha-mundos { display: flex; flex-direction: column; gap: .8rem; margin-top: .4rem; }
.ficha-mundo { border: 1px solid #E5E7EB; border-radius: 12px; padding: .7rem .8rem; }
.fm-head { display: flex; align-items: center; gap: .5rem; }
.fm-ico { font-size: 1.2rem; }
.fm-nom { font-weight: 600; color: #1F2937; flex: 1; }
.fm-cont { font-size: .8rem; font-weight: 700; border-radius: 6px; padding: .15rem .5rem; }
.fm-barra { height: 7px; background: #E5E7EB; border-radius: 4px; overflow: hidden; margin: .5rem 0; }
.fm-fill { height: 100%; background: linear-gradient(90deg, #7C3AED, #22D3EE); }
.fm-niveles { display: flex; flex-wrap: wrap; gap: .3rem; }
.niv-dot { width: 26px; height: 26px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: .78rem; font-weight: 700; background: #F3F4F6; color: #9CA3AF; border: 1px solid #E5E7EB; }
.niv-dot.hecho { background: #D1FAE5; color: #047857; border-color: #6EE7B7; }
.niv-dot.actual { background: #DDD6FE; color: #5B21B6; border-color: #A78BFA; box-shadow: 0 0 0 2px #C4B5FD; }

/* ===== Dashboard de estadísticas (stats3) ===== */
.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: .8rem; margin: .4rem 0 1.2rem; }
.kpi { background: white; border: 1px solid #E5E7EB; border-radius: 14px; padding: .9rem 1rem; display: flex; flex-direction: column; gap: .15rem; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
.kpi-ico { font-size: 1.1rem; }
.kpi-num { font-size: 1.6rem; font-weight: 800; color: #111827; line-height: 1.1; }
.kpi-lbl { font-size: .78rem; color: #6B7280; }

.stats-grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
@media (max-width: 900px) { .stats-grid2 { grid-template-columns: 1fr; } }
.stats-grid2 .stats-card { background: white; border: 1px solid #E5E7EB; border-radius: 14px; padding: 1rem 1.1rem; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
.stats-grid2 .stats-card h3 { margin: 0 0 .8rem; font-size: 1rem; color: #1F2937; }
.stats-grid2 .stats-card.wide { grid-column: 1 / -1; }

.linea-svg { width: 100%; height: 160px; display: block; }
.linea-xlabels { display: flex; justify-content: space-between; font-size: .68rem; color: #9CA3AF; margin-top: .2rem; }

.donut-wrap { display: flex; align-items: center; gap: 1rem; }
.donut { width: 110px; height: 110px; border-radius: 50%; flex-shrink: 0; -webkit-mask: radial-gradient(circle 34px at center, transparent 98%, #000 100%); mask: radial-gradient(circle 34px at center, transparent 98%, #000 100%); }
.donut-leg { display: flex; flex-direction: column; gap: .35rem; font-size: .88rem; color: #374151; }

.hbar-row { display: grid; grid-template-columns: 40% 1fr auto; align-items: center; gap: .5rem; margin-bottom: .45rem; }
.hbar-lbl { font-size: .82rem; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hbar { height: 10px; background: #EEF2FF; border-radius: 6px; overflow: hidden; }
.hbar-fill { height: 100%; background: #7C3AED; border-radius: 6px; }
.hbar-fill.alt { background: #06B6D4; }
.hbar-fill.warm { background: #F59E0B; }
.hbar-val { font-size: .8rem; font-weight: 700; color: #111827; min-width: 42px; text-align: right; }

.mat-row { display: grid; grid-template-columns: 160px 1fr auto; align-items: center; gap: .6rem; margin-bottom: .5rem; }
.mat-nom { font-size: .85rem; color: #374151; }
.mat-barra { height: 12px; background: #F1F5F9; border-radius: 6px; overflow: hidden; }
.mat-fill { height: 100%; border-radius: 6px; }
.mat-fill.c-zero { background: #E5E7EB; } .mat-fill.c-low { background: #F97316; } .mat-fill.c-mid { background: #EAB308; } .mat-fill.c-high { background: #22C55E; } .mat-fill.c-full { background: #F59E0B; }
.mat-val { font-size: .82rem; font-weight: 700; color: #111827; } .mat-val small { color: #9CA3AF; font-weight: 500; }

.tabla-wrap { overflow-x: auto; }
.mini-tabla { width: 100%; border-collapse: collapse; font-size: .85rem; }
.mini-tabla th { text-align: left; color: #6B7280; font-weight: 600; padding: .4rem .5rem; border-bottom: 2px solid #E5E7EB; font-size: .78rem; }
.mini-tabla td { padding: .45rem .5rem; border-bottom: 1px solid #F1F5F9; color: #374151; }
.mini-tabla td.tc { text-align: center; }

.lista-mini { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .35rem; }
.lista-mini li { display: flex; align-items: center; justify-content: space-between; gap: .5rem; font-size: .84rem; color: #374151; }
.lista-mini li span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lista-mini b.reto { color: #DC2626; }

.student-avatar {
  width: 32px;
  height: 32px;
  background: #6B46C1;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.student-name { margin: 0; font-weight: 600; font-size: 0.85rem; }
.student-email { margin: 0; font-size: 0.75rem; color: #9CA3AF; }

.badge {
  padding: 0.2rem 0.5rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  color: white;
}

.badge.exploradores { background: #16A34A; }
.badge.aventureros { background: #6B46C1; }
.badge.heroes { background: #DC2626; }

.modality-badge {
  background: #EDE9FE;
  color: #6B46C1;
  padding: 0.2rem 0.5rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
}

.text-center { text-align: center; }

.stars-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stars-bar div {
  flex: 1;
  height: 6px;
  background: #F3F4F6;
  border-radius: 3px;
  overflow: hidden;
}

.stars-fill { height: 100%; background: linear-gradient(90deg, #FBBF24, #F59E0B); border-radius: 3px; }
.stars-bar span { font-size: 0.8rem; white-space: nowrap; }

.transition-indicator { display: flex; flex-direction: column; gap: 0.2rem; }
.transition-bar { height: 6px; background: #F3F4F6; border-radius: 3px; overflow: hidden; }
.transition-fill.bloques { height: 100%; background: #6B46C1; border-radius: 3px; }
.transition-label { font-size: 0.7rem; color: #6B7280; }

.modality-chart {
  margin-top: 2rem;
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid #E5E7EB;
}

.modality-chart h3 { margin: 0 0 1rem; color: #374151; font-size: 1rem; }
.chart-bars { display: flex; flex-direction: column; gap: 0.75rem; }

.chart-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.chart-label { width: 100px; font-size: 0.85rem; color: #374151; }
.chart-bar-wrap { flex: 1; height: 16px; background: #F3F4F6; border-radius: 8px; overflow: hidden; }
.chart-bar-fill { height: 100%; border-radius: 8px; transition: width 0.5s ease; }
.bloques-color { background: #6B46C1; }
.mixto-color { background: #0EA5E9; }
.texto-color { background: #16A34A; }
.chart-percent { width: 45px; text-align: right; font-weight: 700; font-size: 0.85rem; color: #374151; }

.no-selection {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9CA3AF;
  font-size: 1.1rem;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  position: relative;
  background: white;
  border-radius: 20px;
  padding: 2rem;
  width: 380px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal h3 { margin: 0; color: #374151; padding-right: 2rem; }

/* Botón cerrar (X) arriba a la derecha */
.modal-close {
  position: absolute;
  top: 0.9rem;
  right: 0.9rem;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: #F3F4F6;
  color: #6B7280;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
  z-index: 5;
}
.modal-close:hover { background: #FEE2E2; color: #DC2626; }

.modal .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
.modal .form-group label { font-weight: 600; font-size: 0.9rem; color: #374151; }
.modal .form-group input,
.modal .form-group textarea,
.modal .form-group select {
  padding: 0.75rem;
  border: 2px solid #E5E7EB;
  border-radius: 10px;
  font-size: 1rem;
  font-family: inherit;
  color: #111827;          /* texto oscuro legible (antes heredaba blanco → invisible) */
  background: #FFFFFF;
}
.modal .form-group input::placeholder,
.modal .form-group textarea::placeholder,
.modal input::placeholder,
.bulk-text::placeholder { color: #9CA3AF; }

.modal-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }

.loading { color: #9CA3AF; text-align: center; padding: 1rem; }

/* ---- Pestañas y paneles nuevos ---- */
.tabs { display: flex; gap: 0.25rem; padding: 0 1rem; background: white; border-bottom: 1px solid #E2E8F0; }
.tab {
  padding: 0.7rem 1.1rem; border: none; background: transparent; color: #64748B;
  font-weight: 600; font-size: 0.9rem; cursor: pointer; border-bottom: 3px solid transparent; font-family: inherit;
}
.tab:hover { color: #6B46C1; }
.tab.active { color: #6B46C1; border-bottom-color: #6B46C1; }

.tab-panel { padding: 1.25rem; flex: 1; overflow-y: auto; }
.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.85rem; }
.info-card {
  display: flex; align-items: center; gap: 0.85rem; background: white;
  border: 1px solid #E2E8F0; border-radius: 14px; padding: 1rem;
}
.info-card-icon { font-size: 1.8rem; }
.info-card-title { margin: 0; font-weight: 700; color: #1E293B; }
.info-card-meta { margin: 0; font-size: 0.8rem; color: #64748B; }
.assign-card { align-items: flex-start; }
.assign-body { flex: 1; }
.assign-instr { margin: 0.4rem 0 0; font-size: 0.82rem; color: #475569; font-style: italic; }
.btn-del { background: transparent; border: none; cursor: pointer; font-size: 1.1rem; opacity: 0.7; }
.btn-del:hover { opacity: 1; }

.search-input {
  width: 100%; max-width: 360px; padding: 0.6rem 0.9rem; margin-bottom: 1rem;
  border: 1px solid #CBD5E1; border-radius: 10px; font-size: 0.9rem;
}
.form-error { color: #DC2626; font-size: 0.82rem; margin: 0.25rem 0; }

/* Header con varios botones */
.header-actions { display: flex; gap: 0.5rem; }
.assign-acciones { display: flex; flex-direction: column; gap: 0.3rem; align-items: flex-end; }
.btn-mini { background: #EEF2FF; color: #4338CA; border: 1px solid #C7D2FE; border-radius: 8px; padding: 0.25rem 0.5rem; font-size: 0.75rem; cursor: pointer; font-weight: 600; }
.btn-mini:hover { background: #E0E7FF; }
.btn-mini.btn-block { background: #FEE2E2; color: #B91C1C; border-color: #FCA5A5; }
.btn-mini.btn-ok { background: #DCFCE7; color: #15803D; border-color: #86EFAC; }
.estado-badge { font-size: 0.72rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 999px; }
.estado-badge.ok { background: #DCFCE7; color: #15803D; }
.estado-badge.bloq { background: #FEE2E2; color: #B91C1C; }
.fila-bloqueada td { opacity: 0.55; }
.panel-hint { color: #64748B; font-size: 0.85rem; margin: 0 0 0.9rem; background: #F1F5F9; padding: 0.5rem 0.8rem; border-radius: 8px; border-left: 3px solid #8B5CF6; }
.btn-block { background: #FEE2E2; color: #B91C1C; border: 1px solid #FCA5A5; border-radius: 8px; padding: 0.4rem 0.7rem; font-size: 0.8rem; font-weight: 700; cursor: pointer; font-family: inherit; }
.btn-pass { background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; border-radius: 8px; padding: 0.4rem 0.7rem; font-size: 0.8rem; font-weight: 700; cursor: pointer; font-family: inherit; }
.btn-pass:hover { background: #FDE68A; }
.btn-dibujos { background: #EDE9FE; color: #5B21B6; border: 1px solid #C4B5FD; border-radius: 8px; padding: 0.4rem 0.7rem; font-size: 0.8rem; font-weight: 700; cursor: pointer; font-family: inherit; }
.btn-dibujos:hover { background: #DDD6FE; }
.rol-chip { margin-left: 0.4rem; padding: 0.12rem 0.5rem; border-radius: 999px; background: #FEF3C7; color: #92400E; font-size: 0.68rem; font-weight: 800; vertical-align: middle; }
.btn-ok-sm { background: #DCFCE7; color: #15803D; border: 1px solid #86EFAC; border-radius: 8px; padding: 0.4rem 0.7rem; font-size: 0.8rem; font-weight: 700; cursor: pointer; font-family: inherit; }
.stat-filtros { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 1rem; }
.stat-filtros .filter-select { font-size: 0.9rem; padding: 0.5rem 0.8rem; }

/* Modales anchos y carga masiva */
.modal-wide { max-width: 600px; width: 92%; }
.modal-help { font-size: 0.82rem; color: #64748B; margin: 0 0 0.6rem; }
.modal-help code { background: #F1F5F9; padding: 1px 5px; border-radius: 4px; }
.bulk-text { width: 100%; border: 1px solid #CBD5E1; border-radius: 10px; padding: 0.6rem; font-family: monospace; font-size: 0.85rem; resize: vertical; color: #111827; background: #FFFFFF; }
.form-row { display: flex; gap: 0.75rem; margin-top: 0.5rem; } .form-row .form-group { flex: 1; }
.bulk-result { margin-top: 0.75rem; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 0.6rem; }
.bulk-creds-title { font-weight: 700; font-size: 0.8rem; margin: 0.4rem 0 0.2rem; }
.bulk-creds { max-height: 160px; overflow-y: auto; }
.bulk-cred { font-size: 0.78rem; color: #334155; font-family: monospace; padding: 1px 0; }

/* Importar Klassen desde Phidias */
.phidias-tree { max-height: 340px; overflow-y: auto; border: 1px solid #E2E8F0; border-radius: 10px; padding: 0.5rem 0.7rem; background: #F8FAFC; }
.phidias-nivel + .phidias-nivel { margin-top: 0.8rem; }
.phidias-nivel-nombre { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.05em; color: #6B46C1; text-transform: uppercase; margin: 0 0 0.3rem; }
.phidias-curso { margin: 0 0 0.5rem 0.4rem; }
.phidias-curso-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.phidias-curso-nombre { font-size: 0.82rem; font-weight: 700; color: #374151; }
.btn-link { background: none; border: none; color: #8B5CF6; font-size: 0.74rem; font-weight: 600; cursor: pointer; padding: 0; }
.btn-link:hover { text-decoration: underline; }
.phidias-klasse { display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0.35rem; border-radius: 8px; cursor: pointer; }
.phidias-klasse:hover { background: #F5F3FF; }
.phidias-klasse-nombre { font-size: 0.84rem; font-weight: 600; color: #111827; min-width: 60px; }
.phidias-klasse-meta { font-size: 0.74rem; color: #9CA3AF; }
.phidias-resumen { font-size: 0.78rem; color: #6B7280; margin-right: auto; }
.phidias-modos { display: flex; gap: 0.4rem; margin-bottom: 0.7rem; }
.pm-tab { flex: 1; padding: 0.5rem; border: 1px solid #C7D2FE; background: #EEF2FF; color: #4338CA; border-radius: 10px; font-weight: 700; cursor: pointer; font-size: 0.88rem; }
.pm-tab.on { background: #4338CA; color: #fff; border-color: #4338CA; }
.phidias-lista { max-height: 340px; overflow-y: auto; border: 1px solid #E2E8F0; border-radius: 10px; padding: 0.3rem 0.5rem; background: #F8FAFC; }
.phidias-est { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 0.6rem; padding: 0.35rem 0.4rem; border-radius: 8px; cursor: pointer; border-bottom: 1px solid #F1F5F9; }
.phidias-est:hover { background: #F5F3FF; }
.est-nombre { font-size: 0.85rem; color: #111827; }
.est-curso { font-size: 0.72rem; color: #9CA3AF; white-space: nowrap; }

/* Progreso de asignación */
.prog-mini { display: inline-block; width: 80px; height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden; vertical-align: middle; }
.prog-mini-fill { height: 100%; background: linear-gradient(90deg, #16A34A, #4ADE80); }
.prog-label { font-size: 0.8rem; color: #475569; margin-left: 0.4rem; }
.prog-detalle { display: flex; flex-wrap: wrap; gap: 2px; } .niv-chip { font-size: 0.8rem; }

/* Estadísticas */
.stats-resumen { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.85rem; margin-bottom: 1rem; }
.stat-box { background: white; border: 1px solid #E2E8F0; border-radius: 14px; padding: 1rem; text-align: center; }
.stat-num { display: block; font-size: 2rem; font-weight: 800; color: #6B46C1; }
.stat-lbl { font-size: 0.78rem; color: #64748B; }
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; }
.stats-card { background: white; border: 1px solid #E2E8F0; border-radius: 14px; padding: 1.1rem; }
.stats-card h3 { margin: 0 0 0.75rem; color: #1E293B; font-size: 1rem; }
.top5 { list-style: none; margin: 0; padding: 0; }
.top5 li { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0; border-bottom: 1px solid #F1F5F9; }
.medalla { font-size: 1.2rem; } .top-nombre { flex: 1; font-weight: 600; color: #334155; } .top-stats { font-size: 0.8rem; color: #64748B; }
.materia-row { display: flex; align-items: center; gap: 0.5rem; margin: 0.4rem 0; }
.materia-nom { width: 130px; font-size: 0.8rem; color: #334155; flex-shrink: 0; }
.materia-barra { flex: 1; height: 12px; background: #E2E8F0; border-radius: 6px; overflow: hidden; }
.materia-fill { height: 100%; background: linear-gradient(90deg, #6B46C1, #A78BFA); }
@media (max-width: 700px) { .stats-grid, .stats-resumen { grid-template-columns: 1fr; } }

.niveles-check { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 0.6rem; }
.check-todo { display: block; font-size: 0.88rem; color: #334155; margin-bottom: 0.4rem; }
.niveles-lista { max-height: 160px; overflow-y: auto; border-top: 1px solid #E2E8F0; padding-top: 0.4rem; }
.check-niv { display: block; font-size: 0.82rem; color: #475569; padding: 2px 0; cursor: pointer; }
/* Administracion de grupos, cuentas y sedes */
.titulo-grupo {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex-wrap: wrap;
}
.titulo-grupo h2 { margin: 0; }
.sede-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  background: #EDE9FE;
  color: #5B21B6;
  border: 1px solid #C4B5FD;
}
.sede-chip.otro-docente { background: #E0F2FE; color: #0369A1; border-color: #7DD3FC; }

.btn-mini {
  padding: 0.35rem 0.7rem;
  border-radius: 9px;
  border: 1px solid #CBD5E1;
  background: #F8FAFC;
  color: #334155;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s;
}
.btn-mini:hover { background: #EEF2FF; border-color: #A5B4FC; color: #3730A3; }
.btn-mini.peligro { background: #FEE2E2; color: #B91C1C; border-color: #FCA5A5; }
.btn-mini.peligro:hover { background: #FECACA; border-color: #F87171; color: #991B1B; }

.acciones-cell { display: flex; gap: 0.35rem; align-items: center; }
.card-acciones { display: flex; gap: 0.3rem; align-items: flex-start; }

.btn-danger {
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 12px;
  background: #DC2626;
  color: #fff;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.15s, transform 0.15s;
}
.btn-danger:hover:not(:disabled) { background: #B91C1C; transform: translateY(-1px); }
.btn-danger:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

.impacto-lista {
  margin: 0.9rem 0;
  padding: 0.85rem 0.9rem 0.85rem 2.1rem;
  border-radius: 12px;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  color: #334155;
  font-size: 0.88rem;
  line-height: 1.65;
}
.impacto-lista li.alerta { color: #B91C1C; }
.impacto-lista li.ok { color: #15803D; }
.info-card-aviso { margin: 0.3rem 0 0; font-size: 0.76rem; color: #B45309; }

</style>
