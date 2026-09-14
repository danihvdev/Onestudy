/**
 * CampusFlow - Organizador Académico
 * Arquitectura modular y extensible
 */

// Estado global de la aplicación
const AppState = {
  projects: [],
  tasks: [],
  events: [],
  classes: [],
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  filterProject: "all",
};

// Datos de ejemplo para primera carga
const defaultInitialData = {
  projects: [
    { id: "proj-1", name: "Desarrollo Web", color: "#4f46e5" },
    { id: "proj-2", name: "Sistemas Operativos", color: "#0284c7" },
    { id: "proj-3", name: "Matemática Discreta", color: "#8b5cf6" },
  ],
  tasks: [
    {
      id: "task-1",
      title: "Diseñar arquitectura de base de datos",
      projectId: "proj-1",
      status: "done",
      priority: "alta",
      dueDate: "2026-09-20",
    },
    {
      id: "task-2",
      title: "Implementar interfaz con CSS grid",
      projectId: "proj-1",
      status: "in-progress",
      priority: "media",
      dueDate: "2026-09-25",
    },
    {
      id: "task-3",
      title: "Práctica de concurrencia y semáforos",
      projectId: "proj-2",
      status: "todo",
      priority: "alta",
      dueDate: "2026-10-02",
    },
    {
      id: "task-4",
      title: "Ejercicios de grafos y árboles",
      projectId: "proj-3",
      status: "todo",
      priority: "baja",
      dueDate: "2026-09-30",
    },
  ],
  events: [
    {
      id: "ev-1",
      title: "Examen Parcial SO",
      date: "2026-09-28",
      type: "examen",
    },
    {
      id: "ev-2",
      title: "Entrega Sprint 1 Web",
      date: "2026-09-25",
      type: "proyecto",
    },
  ],
  classes: [
    {
      id: "c-1",
      name: "Desarrollo Web",
      room: "Lab 3",
      day: 1,
      startTime: "09:00",
      endTime: "11:00",
      color: "#4f46e5",
    },
    {
      id: "c-2",
      name: "Sistemas Operativos",
      room: "Aula 2.1",
      day: 2,
      startTime: "11:30",
      endTime: "13:30",
      color: "#0284c7",
    },
    {
      id: "c-3",
      name: "Matemática Discreta",
      room: "Aula 1.4",
      day: 3,
      startTime: "09:00",
      endTime: "11:00",
      color: "#8b5cf6",
    },
  ],
};

// ================= PERSISTENCIA =================
function loadData() {
  const saved = localStorage.getItem("campusflow_data");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      AppState.projects = parsed.projects || [];
      AppState.tasks = parsed.tasks || [];
      AppState.events = parsed.events || [];
      AppState.classes = parsed.classes || [];
      return;
    } catch (e) {
      console.error("Error al cargar datos:", e);
    }
  }
  // Cargar valores de muestra si no hay nada guardado
  AppState.projects = defaultInitialData.projects;
  AppState.tasks = defaultInitialData.tasks;
  AppState.events = defaultInitialData.events;
  AppState.classes = defaultInitialData.classes;
  saveData();
}

function saveData() {
  localStorage.setItem(
    "campusflow_data",
    JSON.stringify({
      projects: AppState.projects,
      tasks: AppState.tasks,
      events: AppState.events,
      classes: AppState.classes,
    }),
  );
}

// ================= INICIALIZACIÓN =================
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  setupNavigation();
  setupModals();
  setupProjectFilter();
  renderAll();
});

function renderAll() {
  renderKanban();
  renderProgress();
  renderCalendar();
  renderTimetable();
}

// ================= NAVEGACIÓN =================
function setupNavigation() {
  const navBtns = document.querySelectorAll(".nav-btn");
  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      navBtns.forEach((b) => b.classList.remove("active"));
      document
        .querySelectorAll(".view-section")
        .forEach((s) => s.classList.remove("active"));

      btn.classList.add("active");
      const targetId = btn.getAttribute("data-target");
      document.getElementById(targetId).classList.add("active");
    });
  });

  // Exportar datos
  document.getElementById("btnExportData").addEventListener("click", () => {
    const jsonStr = JSON.stringify(AppState, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `organizador_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  });
}

// ================= KANBAN & PROGRESO =================
function renderKanban() {
  const todoContainer = document.getElementById("cards-todo");
  const progressContainer = document.getElementById("cards-in-progress");
  const doneContainer = document.getElementById("cards-done");

  todoContainer.innerHTML = "";
  progressContainer.innerHTML = "";
  doneContainer.innerHTML = "";

  const filteredTasks =
    AppState.filterProject === "all"
      ? AppState.tasks
      : AppState.tasks.filter((t) => t.projectId === AppState.filterProject);

  let countTodo = 0,
    countProgress = 0,
    countDone = 0;

  filteredTasks.forEach((task) => {
    const project = AppState.projects.find((p) => p.id === task.projectId) || {
      name: "General",
      color: "#64748b",
    };
    const card = document.createElement("div");
    card.className = "kanban-card";
    card.draggable = true;
    card.dataset.id = task.id;
    card.ondragstart = (e) => e.dataTransfer.setData("text/plain", task.id);

    card.innerHTML = `
      <span class="card-project-tag" style="background-color: ${project.color}">${project.name}</span>
      <h4 class="card-title">${task.title}</h4>
      <div class="card-footer">
        <span class="priority-tag priority-${task.priority}">● ${task.priority}</span>
        ${task.dueDate ? `<span>📅 ${task.dueDate}</span>` : ""}
        <div class="card-actions">
          ${task.status !== "done" ? `<button class="card-btn" title="Marcar completada" onclick="quickCompleteTask('${task.id}')">✔️</button>` : ""}
          <button class="card-btn" title="Eliminar" onclick="deleteTask('${task.id}')">🗑️</button>
        </div>
      </div>
    `;

    if (task.status === "todo") {
      todoContainer.appendChild(card);
      countTodo++;
    } else if (task.status === "in-progress") {
      progressContainer.appendChild(card);
      countProgress++;
    } else if (task.status === "done") {
      doneContainer.appendChild(card);
      countDone++;
    }
  });

  document.getElementById("count-todo").textContent = countTodo;
  document.getElementById("count-in-progress").textContent = countProgress;
  document.getElementById("count-done").textContent = countDone;
}

// Drag & Drop
window.allowDrop = function (e) {
  e.preventDefault();
};

window.handleDrop = function (e, newStatus) {
  e.preventDefault();
  const taskId = e.dataTransfer.getData("text/plain");
  const task = AppState.tasks.find((t) => t.id === taskId);
  if (task && task.status !== newStatus) {
    task.status = newStatus;
    saveData();
    renderKanban();
    renderProgress();
  }
};

window.quickCompleteTask = function (taskId) {
  const task = AppState.tasks.find((t) => t.id === taskId);
  if (task) {
    task.status = "done";
    saveData();
    renderKanban();
    renderProgress();
  }
};

window.deleteTask = function (taskId) {
  AppState.tasks = AppState.tasks.filter((t) => t.id !== taskId);
  saveData();
  renderKanban();
  renderProgress();
};

// Cálculo de la barra de progreso
function renderProgress() {
  // 1. Progreso Global
  const totalGlobal = AppState.tasks.length;
  const doneGlobal = AppState.tasks.filter((t) => t.status === "done").length;
  const globalPct =
    totalGlobal === 0 ? 0 : Math.round((doneGlobal / totalGlobal) * 100);

  document.getElementById("globalProgressBar").style.width = `${globalPct}%`;
  document.getElementById("globalProgressPercent").textContent =
    `${globalPct}%`;
  document.getElementById("globalProgressCount").textContent =
    `${doneGlobal} de ${totalGlobal} tareas hechas`;

  // 2. Progreso del Filtro Seleccionado
  const filteredTasks =
    AppState.filterProject === "all"
      ? AppState.tasks
      : AppState.tasks.filter((t) => t.projectId === AppState.filterProject);

  const totalFiltered = filteredTasks.length;
  const doneFiltered = filteredTasks.filter((t) => t.status === "done").length;
  const filteredPct =
    totalFiltered === 0 ? 0 : Math.round((doneFiltered / totalFiltered) * 100);

  document.getElementById("filteredProgressBar").style.width =
    `${filteredPct}%`;
  document.getElementById("filteredProgressText").textContent =
    `${filteredPct}%`;
}

function setupProjectFilter() {
  const select = document.getElementById("projectFilter");
  const taskProjectSelect = document.getElementById("taskProject");
  const deleteBtn = document.getElementById("btnDeleteProject");

  select.innerHTML = '<option value="all">Todos los proyectos</option>';
  taskProjectSelect.innerHTML = "";

  if (AppState.projects.length === 0) {
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "-- Primero crea un proyecto --";
    taskProjectSelect.appendChild(emptyOpt);
  } else {
    AppState.projects.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      select.appendChild(opt);

      const taskOpt = document.createElement("option");
      taskOpt.value = p.id;
      taskOpt.textContent = p.name;
      taskProjectSelect.appendChild(taskOpt);
    });
  }

  // Si el filtro actual ya no existe, restablecer a 'all'
  if (
    AppState.filterProject !== "all" &&
    !AppState.projects.some((p) => p.id === AppState.filterProject)
  ) {
    AppState.filterProject = "all";
  }

  select.value = AppState.filterProject;
  if (deleteBtn) {
    deleteBtn.style.display =
      AppState.filterProject === "all" ? "none" : "inline-flex";
  }
}

// ================= CALENDARIO =================
const monthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function renderCalendar() {
  const monthYearLabel = document.getElementById("calendarMonthYear");
  monthYearLabel.textContent = `${monthNames[AppState.currentMonth]} ${AppState.currentYear}`;

  const grid = document.getElementById("calendarDaysGrid");
  grid.innerHTML = "";

  const firstDayIndex =
    (new Date(AppState.currentYear, AppState.currentMonth, 1).getDay() + 6) % 7; // Lunes = 0
  const daysInMonth = new Date(
    AppState.currentYear,
    AppState.currentMonth + 1,
    0,
  ).getDate();
  const prevMonthDays = new Date(
    AppState.currentYear,
    AppState.currentMonth,
    0,
  ).getDate();

  // Días del mes previo
  for (let i = firstDayIndex; i > 0; i--) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "calendar-day other-month";
    dayDiv.innerHTML = `<span class="day-number">${prevMonthDays - i + 1}</span>`;
    grid.appendChild(dayDiv);
  }

  const today = new Date();

  // Días del mes actual
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "calendar-day";

    if (
      today.getDate() === day &&
      today.getMonth() === AppState.currentMonth &&
      today.getFullYear() === AppState.currentYear
    ) {
      dayDiv.classList.add("today");
    }

    const dateStr = `${AppState.currentYear}-${String(AppState.currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    dayDiv.innerHTML = `<span class="day-number">${day}</span>`;

    // Buscar eventos en esta fecha
    const dayEvents = AppState.events.filter((e) => e.date === dateStr);
    dayEvents.forEach((e) => {
      const pill = document.createElement("div");
      pill.className = `event-pill event-${e.type}`;
      pill.title = e.title;
      pill.textContent = `${e.type === "examen" ? "📝" : "📌"} ${e.title}`;
      dayDiv.appendChild(pill);
    });

    // Clic para abrir el modal de detalles del día
    dayDiv.addEventListener("click", () => {
      openDayDetailsModal(dateStr);
    });

    grid.appendChild(dayDiv);
  }
}

document.getElementById("prevMonthBtn").addEventListener("click", () => {
  AppState.currentMonth--;
  if (AppState.currentMonth < 0) {
    AppState.currentMonth = 11;
    AppState.currentYear--;
  }
  renderCalendar();
});

document.getElementById("nextMonthBtn").addEventListener("click", () => {
  AppState.currentMonth++;
  if (AppState.currentMonth > 11) {
    AppState.currentMonth = 0;
    AppState.currentYear++;
  }
  renderCalendar();
});

document.getElementById("todayBtn").addEventListener("click", () => {
  AppState.currentMonth = new Date().getMonth();
  AppState.currentYear = new Date().getFullYear();
  renderCalendar();
});

// ================= HORARIO =================
const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

function renderTimetable() {
  const grid = document.getElementById("timetableGrid");
  grid.innerHTML = "";

  // Encabezados
  const emptyCorner = document.createElement("div");
  emptyCorner.className = "time-col-header";
  emptyCorner.textContent = "Hora";
  grid.appendChild(emptyCorner);

  daysOfWeek.forEach((dayName) => {
    const colHeader = document.createElement("div");
    colHeader.className = "day-col-header";
    colHeader.textContent = dayName;
    grid.appendChild(colHeader);
  });

  // Franjas horarias principales (ej: de 8h a 15h)
  const timeSlots = [
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
  ];

  timeSlots.forEach((slotTime) => {
    // Etiqueta de la hora
    const slotLabel = document.createElement("div");
    slotLabel.className = "time-slot-label";
    slotLabel.textContent = slotTime;
    grid.appendChild(slotLabel);

    // 5 columnas para los días
    for (let day = 1; day <= 5; day++) {
      const slotCell = document.createElement("div");
      slotCell.className = "day-column-slots";

      // Clases que coinciden con este día y empiezan cerca de esta hora
      const hourVal = parseInt(slotTime.split(":")[0]);
      const matchedClasses = AppState.classes.filter((c) => {
        const classHour = parseInt(c.startTime.split(":")[0]);
        return c.day === day && classHour === hourVal;
      });

      matchedClasses.forEach((cls) => {
        const card = document.createElement("div");
        card.className = "class-card";
        card.style.backgroundColor = cls.color || "#4f46e5";
        card.innerHTML = `
          <button class="delete-btn" title="Eliminar clase" onclick="deleteClass('${cls.id}')">&times;</button>
          <strong>${cls.name}</strong>
          <span>📍 ${cls.room || "Sin aula"}</span>
          <span>⏱️ ${cls.startTime} - ${cls.endTime}</span>
        `;
        slotCell.appendChild(card);
      });

      grid.appendChild(slotCell);
    }
  });
}

window.deleteClass = function (id) {
  AppState.classes = AppState.classes.filter((c) => c.id !== id);
  saveData();
  renderTimetable();
  const activeDate = document.getElementById("dayQuickEventDate")?.value;
  if (activeDate) {
    renderDayDetailsContent(activeDate);
  }
};

window.deleteEvent = function (id) {
  const ev = AppState.events.find((e) => e.id === id);
  if (!ev) return;

  if (confirm(`¿Deseas eliminar el evento "${ev.title}"?`)) {
    const eventDate = ev.date;
    AppState.events = AppState.events.filter((e) => e.id !== id);
    saveData();
    renderCalendar();

    const activeDateInput = document.getElementById("dayQuickEventDate");
    if (activeDateInput && activeDateInput.value === eventDate) {
      renderDayDetailsContent(eventDate);
    }
  }
};

window.openDayDetailsModal = function (dateStr) {
  renderDayDetailsContent(dateStr);
  openModal("dayDetailsModal");
};

function renderDayDetailsContent(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayOfWeek = dateObj.getDay(); // 0: Dom, 1: Lun, 2: Mar, 3: Mie, 4: Jue, 5: Vie, 6: Sab

  const dayNamesLong = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];

  const dayEvents = AppState.events.filter((e) => e.date === dateStr);

  document.getElementById("dayModalDateTitle").textContent =
    `${dayNamesLong[dayOfWeek]}, ${day} de ${monthNames[month - 1]} de ${year}`;
  document.getElementById("dayModalDateSubtitle").textContent =
    `${dayEvents.length} evento(s) y entregas para este día`;
  document.getElementById("dayQuickEventDate").value = dateStr;

  // 1. Clases de ese día de la semana
  const classesContainer = document.getElementById("dayClassesList");
  const classesBadge = document.getElementById("dayClassesCountBadge");
  const dayClasses = AppState.classes
    .filter((c) => c.day === dayOfWeek)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  classesBadge.textContent = `${dayClasses.length} ${dayClasses.length === 1 ? "clase" : "clases"}`;
  classesContainer.innerHTML = "";

  if (dayClasses.length === 0) {
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    classesContainer.innerHTML = `<p class="day-empty-text">${
      isWeekend
        ? "🌴 Fin de semana — Sin clases lectivas"
        : "📖 No tienes clases registradas para este día"
    }</p>`;
  } else {
    dayClasses.forEach((c) => {
      const card = document.createElement("div");
      card.className = "day-class-card";
      card.style.borderLeftColor = c.color || "#4f46e5";
      card.innerHTML = `
        <div class="day-class-main">
          <span class="day-class-name">${c.name}</span>
          <span class="day-class-room">📍 ${c.room || "Sin aula asignada"}</span>
        </div>
        <span class="day-class-time">⏱️ ${c.startTime} - ${c.endTime}</span>
      `;
      classesContainer.appendChild(card);
    });
  }

  // 2. Eventos y entregas del día
  const eventsContainer = document.getElementById("dayEventsList");
  const eventsBadge = document.getElementById("dayEventsCountBadge");

  eventsBadge.textContent = `${dayEvents.length} ${dayEvents.length === 1 ? "evento" : "eventos"}`;
  eventsContainer.innerHTML = "";

  if (dayEvents.length === 0) {
    eventsContainer.innerHTML =
      '<p class="day-empty-text">No hay eventos ni entregas registradas para este día.</p>';
  } else {
    dayEvents.forEach((e) => {
      const typeLabel =
        e.type === "examen"
          ? "📝 Examen"
          : e.type === "proyecto"
            ? "📌 Proyecto"
            : "ℹ️ Otro";

      const row = document.createElement("div");
      row.className = "day-event-card";
      row.innerHTML = `
        <div class="day-event-info">
          <span class="day-event-badge event-${e.type}">${typeLabel}</span>
          <span class="day-event-title">${e.title}</span>
        </div>
        <button type="button" class="event-delete-btn" title="Eliminar evento" onclick="deleteEvent('${e.id}')">
          🗑️ Eliminar
        </button>
      `;
      eventsContainer.appendChild(row);
    });
  }
}

window.deleteProject = function (projectId) {
  const project = AppState.projects.find((p) => p.id === projectId);
  if (!project) return;

  const taskCount = AppState.tasks.filter((t) => t.projectId === projectId).length;
  const confirmMsg =
    taskCount > 0
      ? `¿Estás seguro de que deseas eliminar el proyecto "${project.name}"?\nSe eliminarán también las ${taskCount} tarea(s) asociadas a este proyecto.`
      : `¿Estás seguro de que deseas eliminar el proyecto "${project.name}"?`;

  if (!confirm(confirmMsg)) {
    return;
  }

  // 1. Eliminar tareas asociadas al proyecto
  AppState.tasks = AppState.tasks.filter((t) => t.projectId !== projectId);

  // 2. Eliminar el proyecto
  AppState.projects = AppState.projects.filter((p) => p.id !== projectId);

  // 3. Resetear filtro si era este proyecto
  if (AppState.filterProject === projectId) {
    AppState.filterProject = "all";
  }

  // 4. Guardar y refrescar vistas
  saveData();
  setupProjectFilter();
  renderProjectListModal();
  renderKanban();
  renderProgress();
};

function renderProjectListModal() {
  const container = document.getElementById("projectListModal");
  if (!container) return;

  container.innerHTML = "";
  if (AppState.projects.length === 0) {
    container.innerHTML = '<p class="empty-projects-msg">No hay proyectos creados.</p>';
    return;
  }

  AppState.projects.forEach((p) => {
    const taskCount = AppState.tasks.filter((t) => t.projectId === p.id).length;
    const row = document.createElement("div");
    row.className = "project-item-row";
    row.innerHTML = `
      <div class="project-item-info">
        <span class="project-color-dot" style="background-color: ${p.color}"></span>
        <span class="project-item-name">${p.name}</span>
        <span class="project-item-tasks">(${taskCount} ${taskCount === 1 ? "tarea" : "tareas"})</span>
      </div>
      <div class="project-item-actions">
        <button type="button" class="project-delete-btn" title="Eliminar proyecto" onclick="deleteProject('${p.id}')">
          🗑️ Eliminar
        </button>
      </div>
    `;
    container.appendChild(row);
  });
}

// ================= GESTIÓN DE MODALES =================
function setupModals() {
  // Filtro de proyectos y botón de eliminar proyecto seleccionado
  const projectFilterSelect = document.getElementById("projectFilter");
  if (projectFilterSelect) {
    projectFilterSelect.addEventListener("change", (e) => {
      AppState.filterProject = e.target.value;
      const deleteBtn = document.getElementById("btnDeleteProject");
      if (deleteBtn) {
        deleteBtn.style.display =
          AppState.filterProject === "all" ? "none" : "inline-flex";
      }
      renderKanban();
      renderProgress();
    });
  }

  const btnDeleteProject = document.getElementById("btnDeleteProject");
  if (btnDeleteProject) {
    btnDeleteProject.addEventListener("click", () => {
      if (AppState.filterProject !== "all") {
        deleteProject(AppState.filterProject);
      }
    });
  }

  // Modal Tarea
  document.getElementById("btnNewTask").addEventListener("click", () => {
    document.getElementById("taskForm").reset();
    document.getElementById("taskModalTitle").textContent = "Nueva Tarea";
    document.getElementById("taskId").value = "";
    openModal("taskModal");
  });

  document.getElementById("taskForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const projectId = document.getElementById("taskProject").value;
    if (!projectId) {
      alert("Por favor, crea o selecciona un proyecto antes de añadir una tarea.");
      return;
    }
    const id = document.getElementById("taskId").value || "task-" + Date.now();
    const newTask = {
      id,
      title: document.getElementById("taskTitle").value,
      projectId: projectId,
      priority: document.getElementById("taskPriority").value,
      dueDate: document.getElementById("taskDueDate").value,
      status: "todo",
    };

    AppState.tasks.push(newTask);
    saveData();
    renderKanban();
    renderProgress();
    closeModal("taskModal");
  });

  // Modal Proyecto
  document.getElementById("btnNewProject").addEventListener("click", () => {
    document.getElementById("projectForm").reset();
    renderProjectListModal();
    openModal("projectModal");
  });

  document.getElementById("projectForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("projectName").value.trim();
    if (!name) return;
    const newProj = {
      id: "proj-" + Date.now(),
      name: name,
      color: document.getElementById("projectColor").value,
    };
    AppState.projects.push(newProj);
    saveData();
    setupProjectFilter();
    renderProjectListModal();
    renderKanban();
    closeModal("projectModal");
  });

  // Modal Evento
  document.getElementById("btnNewEvent").addEventListener("click", () => {
    openEventModal(new Date().toISOString().slice(0, 10));
  });

  document.getElementById("eventForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const newEvent = {
      id: "ev-" + Date.now(),
      title: document.getElementById("eventTitle").value,
      date: document.getElementById("eventDate").value,
      type: document.getElementById("eventType").value,
    };
    AppState.events.push(newEvent);
    saveData();
    renderCalendar();
    const activeDate = document.getElementById("dayQuickEventDate")?.value;
    if (activeDate === newEvent.date) {
      renderDayDetailsContent(activeDate);
    }
    closeModal("eventModal");
  });

  // Formulario rápido de eventos en Detalles del Día
  const dayQuickEventForm = document.getElementById("dayQuickEventForm");
  if (dayQuickEventForm) {
    dayQuickEventForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const date = document.getElementById("dayQuickEventDate").value;
      const title = document.getElementById("dayQuickEventTitle").value.trim();
      const type = document.getElementById("dayQuickEventType").value;
      if (!title || !date) return;

      const newEvent = {
        id: "ev-" + Date.now(),
        title,
        date,
        type,
      };
      AppState.events.push(newEvent);
      saveData();
      renderCalendar();
      document.getElementById("dayQuickEventTitle").value = "";
      renderDayDetailsContent(date);
    });
  }

  // Modal Clase
  document.getElementById("btnNewClass").addEventListener("click", () => {
    document.getElementById("classForm").reset();
    openModal("classModal");
  });

  document.getElementById("classForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const newClass = {
      id: "c-" + Date.now(),
      name: document.getElementById("className").value,
      room: document.getElementById("classRoom").value,
      day: parseInt(document.getElementById("classDay").value),
      startTime: document.getElementById("classStartTime").value,
      endTime: document.getElementById("classEndTime").value,
      color: document.getElementById("classColor").value,
    };
    AppState.classes.push(newClass);
    saveData();
    renderTimetable();
    const activeDate = document.getElementById("dayQuickEventDate")?.value;
    if (activeDate) {
      renderDayDetailsContent(activeDate);
    }
    closeModal("classModal");
  });
}

function openEventModal(defaultDate) {
  document.getElementById("eventForm").reset();
  if (defaultDate) {
    document.getElementById("eventDate").value = defaultDate;
  }
  openModal("eventModal");
}

window.openModal = function (id) {
  document.getElementById(id).classList.add("open");
};

window.closeModal = function (id) {
  document.getElementById(id).classList.remove("open");
};
