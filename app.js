// ================= ESTADO DE LA APLICACIÓN =================
let state = {
  projects: JSON.parse(localStorage.getItem("studyflow_projects")) || [
    { id: "p1", name: "Matemáticas", color: "#4C9DB0" },
    { id: "p2", name: "Programación", color: "#10b981" },
  ],
  tasks: JSON.parse(localStorage.getItem("studyflow_tasks")) || [
    {
      id: "t1",
      title: "Repasar límites",
      projectId: "p1",
      priority: "alta",
      status: "todo",
    },
    {
      id: "t2",
      title: "Crear componentes UI",
      projectId: "p2",
      priority: "media",
      status: "progress",
    },
  ],
  events: JSON.parse(localStorage.getItem("studyflow_events")) || [
    {
      id: "e1",
      title: "Examen de Cálculo",
      date: "2026-06-15",
      type: "examen",
    },
  ],
  classes: JSON.parse(localStorage.getItem("studyflow_classes")) || [
    {
      id: "c1",
      name: "Álgebra",
      day: 1,
      time: "08:00",
      room: "Aula 101",
      color: "#4C9DB0",
    },
  ],
  timetableHours: JSON.parse(localStorage.getItem("studyflow_hours")) || [
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
  ],
  currentProjectId: "all",
  calendarDate: new Date(),
};

function saveState() {
  localStorage.setItem("studyflow_projects", JSON.stringify(state.projects));
  localStorage.setItem("studyflow_tasks", JSON.stringify(state.tasks));
  localStorage.setItem("studyflow_events", JSON.stringify(state.events));
  localStorage.setItem("studyflow_classes", JSON.stringify(state.classes));
  localStorage.setItem("studyflow_hours", JSON.stringify(state.timetableHours));
}

// ================= UTILIDADES DE MODALES =================
window.openModal = function (modalId) {
  document.getElementById(modalId).classList.add("open");
};

window.closeModal = function (modalId) {
  document.getElementById(modalId).classList.remove("open");
};

document.addEventListener("DOMContentLoaded", () => {
  // Navegación entre vistas
  const navButtons = document.querySelectorAll(".nav-btn");
  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      navButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const viewId = btn.getAttribute("data-view");
      document.querySelectorAll(".view-section").forEach((section) => {
        section.classList.remove("active");
      });
      document.getElementById(viewId).classList.add("active");
    });
  });

  initKanban();
  initCalendar();
  initTimetable();
  initAuthUI();
});

// ================= 1. KANBAN Y PROYECTOS =================
function initKanban() {
  renderProjectSelectors();
  renderKanbanTasks();

  document.getElementById("projectSelect").addEventListener("change", (e) => {
    state.currentProjectId = e.target.value;
    renderKanbanTasks();
  });

  document.getElementById("btnNewTask").addEventListener("click", () => {
    populateProjectDropdowns();
    document.getElementById("taskForm").reset();
    document.getElementById("taskId").value = "";
    document.getElementById("taskModalTitle").innerText = "Nueva Tarea";
    openModal("taskModal");
  });

  document.getElementById("taskForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("taskId").value;
    const title = document.getElementById("taskTitleInput").value;
    const projectId = document.getElementById("taskProjectSelect").value;
    const priority = document.getElementById("taskPrioritySelect").value;
    const status = document.getElementById("taskStatusSelect").value;

    if (id) {
      const task = state.tasks.find((t) => t.id === id);
      if (task) {
        task.title = title;
        task.projectId = projectId;
        task.priority = priority;
        task.status = status;
      }
    } else {
      state.tasks.push({
        id: "t_" + Date.now(),
        title,
        projectId,
        priority,
        status,
      });
    }
    saveState();
    closeModal("taskModal");
    renderKanbanTasks();
  });

  document.getElementById("btnManageProjects").addEventListener("click", () => {
    renderProjectsModalList();
    openModal("projectsModal");
  });

  document.getElementById("projectForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("newProjectName").value;
    const color = document.getElementById("newProjectColor").value;
    state.projects.push({ id: "p_" + Date.now(), name, color });
    saveState();
    document.getElementById("newProjectName").value = "";
    renderProjectSelectors();
    renderProjectsModalList();
    renderKanbanTasks();
  });
}

function renderProjectSelectors() {
  const select = document.getElementById("projectSelect");
  select.innerHTML = `<option value="all">📂 Todos los Proyectos</option>`;
  state.projects.forEach((p) => {
    select.innerHTML += `<option value="${p.id}">${p.name}</option>`;
  });
  select.value = state.currentProjectId;
}

function populateProjectDropdowns() {
  const select = document.getElementById("taskProjectSelect");
  select.innerHTML = "";
  state.projects.forEach((p) => {
    select.innerHTML += `<option value="${p.id}">${p.name}</option>`;
  });
}

function renderProjectsModalList() {
  const list = document.getElementById("projectListModal");
  list.innerHTML = "";
  if (state.projects.length === 0) {
    list.innerHTML = `<p class="empty-projects-msg">No hay proyectos creados.</p>`;
    return;
  }
  state.projects.forEach((p) => {
    const count = state.tasks.filter((t) => t.projectId === p.id).length;
    list.innerHTML += `
            <div class="project-item-row">
                <div class="project-item-info">
                    <span class="project-color-dot" style="background-color: ${p.color};"></span>
                    <span class="project-item-name">${p.name}</span>
                    <span class="project-item-tasks">(${count} tareas)</span>
                </div>
                <button class="project-delete-btn" onclick="deleteProject('${p.id}')">Eliminar</button>
            </div>
        `;
  });
}

window.deleteProject = function (id) {
  if (confirm("¿Eliminar este proyecto y sus tareas asociadas?")) {
    state.projects = state.projects.filter((p) => p.id !== id);
    state.tasks = state.tasks.filter((t) => t.projectId !== id);
    if (state.currentProjectId === id) state.currentProjectId = "all";
    saveState();
    renderProjectSelectors();
    renderProjectsModalList();
    renderKanbanTasks();
  }
};

function renderKanbanTasks() {
  const filteredTasks =
    state.currentProjectId === "all"
      ? state.tasks
      : state.tasks.filter((t) => t.projectId === state.currentProjectId);

  const lists = {
    todo: document.getElementById("listTodo"),
    progress: document.getElementById("listProgress"),
    done: document.getElementById("listDone"),
  };
  const counts = { todo: 0, progress: 0, done: 0 };

  Object.values(lists).forEach((l) => (l.innerHTML = ""));

  filteredTasks.forEach((task) => {
    counts[task.status]++;
    const project = state.projects.find((p) => p.id === task.projectId) || {
      name: "General",
      color: "#64748b",
    };

    const card = document.createElement("div");
    card.className = "kanban-card";
    card.innerHTML = `
            <span class="card-project-tag" style="background-color: ${project.color};">${project.name}</span>
            <div class="card-title">${task.title}</div>
            <div class="card-footer">
                <span class="priority-tag priority-${task.priority}">● ${task.priority}</span>
                <div class="card-actions">
                    <button class="card-btn" onclick="editTask('${task.id}')">✏️</button>
                    <button class="card-btn" onclick="deleteTask('${task.id}')">🗑️</button>
                </div>
            </div>
        `;
    lists[task.status].appendChild(card);
  });

  document.getElementById("countTodo").innerText = counts.todo;
  document.getElementById("countProgress").innerText = counts.progress;
  document.getElementById("countDone").innerText = counts.done;

  // Progreso global y de proyecto
  const total = state.tasks.length;
  const completed = state.tasks.filter((t) => t.status === "done").length;
  const globalPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  document.getElementById("globalProgressBar").style.width = globalPct + "%";
  document.getElementById("globalProgressText").innerText = globalPct + "%";
  document.getElementById("globalProgressSubtext").innerText =
    `${completed} de ${total} tareas completadas`;
}

window.deleteTask = function (id) {
  state.tasks = state.tasks.filter((t) => t.id !== id);
  saveState();
  renderKanbanTasks();
};

window.editTask = function (id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  populateProjectDropdowns();
  document.getElementById("taskId").value = task.id;
  document.getElementById("taskTitleInput").value = task.title;
  document.getElementById("taskProjectSelect").value = task.projectId;
  document.getElementById("taskPrioritySelect").value = task.priority;
  document.getElementById("taskStatusSelect").value = task.status;
  document.getElementById("taskModalTitle").innerText = "Editar Tarea";
  openModal("taskModal");
};

// ================= 2. CALENDARIO =================
function initCalendar() {
  document.getElementById("btnPrevMonth").addEventListener("click", () => {
    state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById("btnNextMonth").addEventListener("click", () => {
    state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
    renderCalendar();
  });

  document.getElementById("btnNewEvent").addEventListener("click", () => {
    document.getElementById("eventForm").reset();
    openModal("eventModal");
  });

  document.getElementById("eventForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("eventTitleInput").value;
    const date = document.getElementById("eventDateInput").value;
    const type = document.getElementById("eventTypeSelect").value;
    state.events.push({ id: "e_" + Date.now(), title, date, type });
    saveState();
    closeModal("eventModal");
    renderCalendar();
  });

  document
    .getElementById("dayQuickEventForm")
    .addEventListener("submit", (e) => {
      e.preventDefault();
      const date = document.getElementById("dayQuickEventDate").value;
      const title = document.getElementById("dayQuickEventTitle").value;
      const type = document.getElementById("dayQuickEventType").value;
      state.events.push({ id: "e_" + Date.now(), title, date, type });
      saveState();
      document.getElementById("dayQuickEventTitle").value = "";
      openDayDetailModal(date);
      renderCalendar();
    });

  renderCalendar();
}

function renderCalendar() {
  const year = state.calendarDate.getFullYear();
  const month = state.calendarDate.getMonth();
  const monthsNames = [
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

  document.getElementById("currentMonthYearLabel").innerText =
    `${monthsNames[month]} ${year}`;

  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  const todayStr = new Date().toISOString().split("T")[0];

  // Días del mes anterior
  for (let i = firstDayIndex; i > 0; i--) {
    const dayNum = prevDays - i + 1;
    grid.innerHTML += `<div class="calendar-day other-month"><div class="day-number">${dayNum}</div></div>`;
  }

  // Días del mes actual
  for (let d = 1; d <= totalDays; d++) {
    const monthStr = String(month + 1).padStart(2, "0");
    const dayStr = String(d).padStart(2, "0");
    const dateStr = `${year}-${monthStr}-${dayStr}`;

    const isToday = dateStr === todayStr ? "today" : "";
    const dayEvents = state.events.filter((e) => e.date === dateStr);

    let pillsHtml = "";
    dayEvents.forEach((ev) => {
      pillsHtml += `<div class="event-pill event-${ev.type}">${ev.title}</div>`;
    });

    const cell = document.createElement("div");
    cell.className = `calendar-day ${isToday}`;
    cell.innerHTML = `<div class="day-number">${d}</div>${pillsHtml}`;
    cell.addEventListener("click", () => openDayDetailModal(dateStr));
    grid.appendChild(cell);
  }
}

function openDayDetailModal(dateStr) {
  document.getElementById("dayQuickEventDate").value = dateStr;
  const [y, m, d] = dateStr.split("-");
  document.getElementById("dayModalTitle").innerText = `${d}/${m}/${y}`;
  document.getElementById("dayModalDateSubtitle").innerText =
    `Gestión de actividades para este día`;

  // Clases del día (Días de la semana: Lunes 1 a Viernes 5)
  const dateObj = new Date(y, m - 1, d);
  let jsDay = dateObj.getDay(); // 0 Dom, 1 Lun...
  let dayIndex = jsDay === 0 ? 7 : jsDay;

  const classesList = document.getElementById("dayModalClassesList");
  classesList.innerHTML = "";
  const dayClasses = state.classes.filter((c) => Number(c.day) === dayIndex);
  if (dayClasses.length === 0) {
    classesList.innerHTML = `<div class="day-empty-text">No hay clases programadas para este día.</div>`;
  } else {
    dayClasses.forEach((c) => {
      classesList.innerHTML += `
                <div class="day-class-card" style="border-left-color: ${c.color || "#4C9DB0"};">
                    <div class="day-class-main">
                        <span class="day-class-name">${c.name}</span>
                        <span class="day-class-room">${c.room || "Sin aula"}</span>
                    </div>
                    <span class="day-class-time">${c.time}</span>
                </div>
            `;
    });
  }

  // Eventos del día
  const eventsList = document.getElementById("dayModalEventsList");
  eventsList.innerHTML = "";
  const dayEvents = state.events.filter((e) => e.date === dateStr);
  if (dayEvents.length === 0) {
    eventsList.innerHTML = `<div class="day-empty-text">No hay eventos ni exámenes este día.</div>`;
  } else {
    dayEvents.forEach((ev) => {
      eventsList.innerHTML += `
                <div class="day-event-card">
                    <div class="day-event-info">
                        <span class="day-event-badge event-${ev.type}">${ev.type}</span>
                        <span class="day-event-title">${ev.title}</span>
                    </div>
                    <button class="event-delete-btn" onclick="deleteCalendarEvent('${ev.id}', '${dateStr}')">Eliminar</button>
                </div>
            `;
    });
  }

  openModal("dayDetailModal");
}

window.deleteCalendarEvent = function (id, dateStr) {
  state.events = state.events.filter((e) => e.id !== id);
  saveState();
  openDayDetailModal(dateStr);
  renderCalendar();
};

// ================= 3. HORARIO Y FRANJAS HORARIAS EDITABLES =================
function initTimetable() {
  // Abrir modal de horas
  document.getElementById("btnOpenHoursModal").addEventListener("click", () => {
    document.getElementById("timetableHoursInput").value =
      state.timetableHours.join(", ");
    openModal("timetableHoursModal");
  });

  document
    .getElementById("timetableHoursForm")
    .addEventListener("submit", (e) => {
      e.preventDefault();
      const inputVal = document.getElementById("timetableHoursInput").value;
      // Separar por comas y limpiar espacios en blanco
      const newHours = inputVal
        .split(",")
        .map((h) => h.trim())
        .filter((h) => h.length > 0);
      if (newHours.length > 0) {
        state.timetableHours = newHours;
        saveState();
        closeModal("timetableHoursModal");
        renderTimetable();
      }
    });

  document.getElementById("btnNewClass").addEventListener("click", () => {
    populateClassTimeDropdown();
    document.getElementById("classForm").reset();
    openModal("classModal");
  });

  document.getElementById("classForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("classNameInput").value;
    const day = document.getElementById("classDaySelect").value;
    const time = document.getElementById("classTimeSelect").value;
    const room = document.getElementById("classRoomInput").value;
    const color = document.getElementById("classColorInput").value;

    state.classes.push({
      id: "c_" + Date.now(),
      name,
      day: Number(day),
      time,
      room,
      color,
    });
    saveState();
    closeModal("classModal");
    renderTimetable();
  });

  renderTimetable();
}

function populateClassTimeDropdown() {
  const select = document.getElementById("classTimeSelect");
  select.innerHTML = "";
  state.timetableHours.forEach((hour) => {
    select.innerHTML += `<option value="${hour}">${hour}</option>`;
  });
}

function renderTimetable() {
  const grid = document.getElementById("timetableGrid");
  grid.innerHTML = "";

  // Definir columnas de la rejilla dinámicamente según las horas configuradas
  grid.style.gridTemplateColumns = `80px repeat(5, minmax(130px, 1fr))`;

  // Encabezado
  grid.innerHTML += `<div class="time-col-header">Hora</div>`;
  const daysName = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
  daysName.forEach((d) => {
    grid.innerHTML += `<div class="day-col-header">${d}</div>`;
  });

  // Filas por cada hora configurada por el usuario
  state.timetableHours.forEach((hour) => {
    // Etiqueta de hora
    grid.innerHTML += `<div class="time-slot-label">${hour}</div>`;

    // Columnas de lunes a viernes (1 a 5)
    for (let d = 1; d <= 5; d++) {
      const slotContainer = document.createElement("div");
      slotContainer.className = "day-column-slots";

      const matchingClasses = state.classes.filter(
        (c) => Number(c.day) === d && c.time === hour,
      );
      matchingClasses.forEach((c) => {
        const card = document.createElement("div");
        card.className = "class-card";
        card.style.backgroundColor = c.color || "#4C9DB0";
        card.innerHTML = `
                    <div style="font-weight: 600;">${c.name}</div>
                    <div style="font-size: 0.75rem; opacity: 0.9;">${c.room || ""}</div>
                    <button class="delete-btn" onclick="deleteClass('${c.id}')">&times;</button>
                `;
        slotContainer.appendChild(card);
      });

      grid.appendChild(slotContainer);
    }
  });
}

window.deleteClass = function (id) {
  state.classes = state.classes.filter((c) => c.id !== id);
  saveState();
  renderTimetable();
};

// ================= AUTH LOCAL PLACEHOLDER =================
function initAuthUI() {
  document.getElementById("btnOpenAuthModal").addEventListener("click", () => {
    openModal("authModal");
  });
  document.getElementById("btnLoginGoogle").addEventListener("click", () => {
    // Simulación de login exitoso con Google
    document.getElementById("authLoggedOutView").style.display = "none";
    document.getElementById("authLoggedInView").style.display = "flex";
    document.getElementById("userNameLabel").innerText = "Estudiante StudyFlow";
    document.getElementById("userEmailLabel").innerText = "usuario@gmail.com";
    document.getElementById("userAvatarText").innerText = "E";
  });
  document.getElementById("btnLogout").addEventListener("click", () => {
    document.getElementById("authLoggedInView").style.display = "none";
    document.getElementById("authLoggedOutView").style.display = "flex";
  });
}
