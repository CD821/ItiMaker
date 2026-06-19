const STORAGE_KEY = "iceland-itinerary-studio-v1";

const zones = [
  { id: "America/New_York", label: "Eastern" },
  { id: "America/Chicago", label: "Central" },
  { id: "America/Denver", label: "Mountain" },
  { id: "America/Los_Angeles", label: "Pacific" },
  { id: "America/Anchorage", label: "Alaska" },
  { id: "Atlantic/Reykjavik", label: "Iceland" }
];

const typeMeta = {
  flight: { label: "Flight", color: "#e7785f", icon: "plane" },
  stay: { label: "Stay", color: "#3988a5", icon: "bed" },
  food: { label: "Food", color: "#d59643", icon: "fork" },
  sight: { label: "Sight", color: "#5fa55b", icon: "mountain" },
  drive: { label: "Drive", color: "#087b83", icon: "car" },
  note: { label: "Note", color: "#29363a", icon: "note" }
};

const fallbackTrip = {
  name: "Iceland Ring Road Preview",
  originZone: "America/Chicago",
  destinationZone: "Atlantic/Reykjavik",
  activeView: "timeline",
  timeLens: "both",
  selectedId: "seed-2",
  stops: [
    {
      id: "seed-1",
      title: "Flight to Keflavik",
      type: "flight",
      date: "2026-06-21",
      time: "19:35",
      zone: "America/Chicago",
      duration: 420,
      notes: "Overnight flight. Keep passport, chargers, and layers easy to reach.",
      attachments: []
    },
    {
      id: "seed-2",
      title: "Reykjavik check-in",
      type: "stay",
      date: "2026-06-22",
      time: "09:40",
      zone: "Atlantic/Reykjavik",
      duration: 90,
      notes: "Drop bags, reset watches to Iceland time, coffee nearby.",
      attachments: []
    },
    {
      id: "seed-3",
      title: "Blue Lagoon",
      type: "sight",
      date: "2026-06-22",
      time: "14:00",
      zone: "Atlantic/Reykjavik",
      duration: 180,
      notes: "Pre-booked entry window. Pack swimsuit in day bag.",
      attachments: []
    },
    {
      id: "seed-4",
      title: "Golden Circle",
      type: "drive",
      date: "2026-06-23",
      time: "08:30",
      zone: "Atlantic/Reykjavik",
      duration: 480,
      notes: "Thingvellir, Geysir, Gullfoss. Leave room for weather delays.",
      attachments: []
    },
    {
      id: "seed-5",
      title: "Reykjavik dinner notes",
      type: "food",
      date: "2026-06-23",
      time: "19:15",
      zone: "Atlantic/Reykjavik",
      duration: 90,
      notes: "Try seafood or lamb. Save receipts for budget tracking.",
      attachments: []
    }
  ]
};

const state = {
  trip: loadTrip(),
  draftAttachments: [],
  editingId: null,
  activeDay: null,
  toastTimer: null
};

const el = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  populateZones();
  bindEvents();
  setInitialFormValues();
  render();
  updateClocks();
  setInterval(updateClocks, 30000);
});

function cacheElements() {
  [
    "tripSubtitle",
    "newTripButton",
    "importButton",
    "exportJsonButton",
    "exportIcsButton",
    "shareButton",
    "printButton",
    "tripName",
    "originZone",
    "destinationZone",
    "zoneDelta",
    "stopForm",
    "formTitle",
    "clearFormButton",
    "stopTitle",
    "stopDate",
    "stopTime",
    "stopType",
    "stopDuration",
    "stopZone",
    "stopNotes",
    "stopAttachments",
    "draftAttachments",
    "saveStopButton",
    "workspaceTitle",
    "workspaceMeta",
    "dayStrip",
    "quickStats",
    "timelineView",
    "calendarView",
    "boardView",
    "originClock",
    "originClockZone",
    "destinationClock",
    "destinationClockZone",
    "selectedCard",
    "paceLabel",
    "rhythmBars",
    "attachmentCount",
    "attachmentGallery",
    "timeNotes",
    "importInput",
    "toast"
  ].forEach((id) => {
    el[id] = document.getElementById(id);
  });
}

function bindEvents() {
  el.tripName.addEventListener("input", (event) => {
    state.trip.name = event.target.value.trim() || "Untitled Iceland Trip";
    saveTrip();
    renderHeader();
  });

  el.originZone.addEventListener("change", (event) => {
    state.trip.originZone = event.target.value;
    if (!state.editingId && el.stopType.value === "flight") {
      el.stopZone.value = event.target.value;
    }
    saveTrip();
    render();
  });

  el.destinationZone.addEventListener("change", (event) => {
    state.trip.destinationZone = event.target.value;
    if (!state.editingId && el.stopType.value !== "flight") {
      el.stopZone.value = event.target.value;
    }
    saveTrip();
    render();
  });

  el.stopType.addEventListener("change", () => {
    if (!state.editingId) {
      el.stopZone.value = el.stopType.value === "flight" ? state.trip.originZone : state.trip.destinationZone;
    }
  });

  el.stopForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveStopFromForm();
  });

  el.clearFormButton.addEventListener("click", () => resetForm());
  el.stopAttachments.addEventListener("change", (event) => readFiles(event.target.files));
  el.newTripButton.addEventListener("click", newTrip);
  el.importButton.addEventListener("click", () => el.importInput.click());
  el.importInput.addEventListener("change", importTrip);
  el.exportJsonButton.addEventListener("click", exportJson);
  el.exportIcsButton.addEventListener("click", exportIcs);
  el.shareButton.addEventListener("click", shareTrip);
  el.printButton.addEventListener("click", () => window.print());

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.trip.activeView = button.dataset.view;
      saveTrip();
      renderViews();
    });
  });

  document.querySelectorAll("[data-lens]").forEach((button) => {
    button.addEventListener("click", () => {
      state.trip.timeLens = button.dataset.lens;
      saveTrip();
      render();
    });
  });

  document.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]");
    if (!action) return;
    const id = action.dataset.id;
    if (action.dataset.action === "select") selectStop(id);
    if (action.dataset.action === "edit") editStop(id);
    if (action.dataset.action === "delete") deleteStop(id);
    if (action.dataset.action === "remove-draft-attachment") removeDraftAttachment(action.dataset.index);
  });
}

function populateZones() {
  const options = zones.map((zone) => `<option value="${zone.id}">${zone.label}</option>`).join("");
  el.originZone.innerHTML = zones
    .filter((zone) => zone.id !== "Atlantic/Reykjavik")
    .map((zone) => `<option value="${zone.id}">${zone.label}</option>`)
    .join("");
  el.destinationZone.innerHTML = options;
  el.stopZone.innerHTML = options;
}

function setInitialFormValues() {
  el.tripName.value = state.trip.name;
  el.originZone.value = state.trip.originZone;
  el.destinationZone.value = state.trip.destinationZone;
  resetForm(false);
}

function loadTrip() {
  const hashTrip = readTripFromHash();
  if (hashTrip) return normalizeTrip(hashTrip);

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return normalizeTrip(JSON.parse(stored));
  } catch (error) {
    console.warn("Unable to read stored trip", error);
  }
  return normalizeTrip(fallbackTrip);
}

function normalizeTrip(trip) {
  const normalized = {
    ...fallbackTrip,
    ...trip,
    stops: Array.isArray(trip?.stops) ? trip.stops : fallbackTrip.stops
  };

  normalized.originZone = isKnownZone(normalized.originZone) && normalized.originZone !== "Atlantic/Reykjavik"
    ? normalized.originZone
    : "America/Chicago";
  normalized.destinationZone = isKnownZone(normalized.destinationZone) ? normalized.destinationZone : "Atlantic/Reykjavik";
  normalized.activeView = ["timeline", "calendar", "board"].includes(normalized.activeView) ? normalized.activeView : "timeline";
  normalized.timeLens = ["both", "origin", "destination"].includes(normalized.timeLens) ? normalized.timeLens : "both";
  normalized.stops = normalized.stops.map((stop) => ({
    id: stop.id || createId(),
    title: stop.title || "Untitled stop",
    type: typeMeta[stop.type] ? stop.type : "note",
    date: stop.date || todayIso(),
    time: stop.time || "09:00",
    zone: isKnownZone(stop.zone) ? stop.zone : normalized.destinationZone,
    duration: Number(stop.duration) || 60,
    notes: stop.notes || "",
    attachments: Array.isArray(stop.attachments) ? stop.attachments : []
  }));
  normalized.selectedId = normalized.stops.some((stop) => stop.id === normalized.selectedId)
    ? normalized.selectedId
    : normalized.stops[0]?.id || null;
  return normalized;
}

function isKnownZone(zone) {
  return zones.some((item) => item.id === zone);
}

function saveTrip() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.trip));
  } catch (error) {
    showToast("Storage is full. Export JSON before adding more attachments.");
  }
}

function render() {
  renderHeader();
  renderDayStrip();
  renderQuickStats();
  renderViews();
  renderInsights();
  renderDraftAttachments();
}

function renderHeader() {
  const stops = sortedStops();
  const first = stops[0];
  const last = stops[stops.length - 1];
  const range = first && last
    ? `${formatDateForZone(toUtc(first), state.trip.destinationZone, "short")} - ${formatDateForZone(toUtc(last), state.trip.destinationZone, "short")}`
    : "No dates yet";

  el.tripName.value = state.trip.name;
  el.tripSubtitle.textContent = `${stops.length} stops · ${range}`;
  el.workspaceTitle.textContent = state.trip.name || "Iceland route, visually managed";
  el.workspaceMeta.textContent = stops.length
    ? `${range} · Calendar and timeline shown in ${zoneLabel(state.trip.destinationZone)} with paired ${zoneLabel(state.trip.originZone)} conversions.`
    : "Add locations, dates, times, notes, and files to start shaping the trip.";
  el.originZone.value = state.trip.originZone;
  el.destinationZone.value = state.trip.destinationZone;
  el.zoneDelta.textContent = zoneDeltaLabel();
}

function renderDayStrip() {
  const days = tripDays();
  if (!state.activeDay || !days.some((day) => day.iso === state.activeDay)) {
    state.activeDay = days[0]?.iso || todayIso();
  }

  el.dayStrip.innerHTML = days.length
    ? days
        .map((day) => {
          const count = stopsForDestinationDay(day.iso).length;
          return `
            <button class="day-chip ${day.iso === state.activeDay ? "active" : ""}" type="button" data-day="${day.iso}">
              <strong>${day.dayNumber}</strong>
              <span>${day.weekday}</span>
              <small>${count} ${count === 1 ? "stop" : "stops"}</small>
            </button>
          `;
        })
        .join("")
    : `<div class="empty-state"><strong>No trip dates</strong><span>Add a stop to build the calendar.</span></div>`;

  el.dayStrip.querySelectorAll("[data-day]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeDay = button.dataset.day;
      render();
    });
  });
}

function renderQuickStats() {
  const stops = sortedStops();
  const days = tripDays();
  const attachments = allAttachments();
  const busyHours = Math.round(stops.reduce((sum, stop) => sum + Number(stop.duration || 0), 0) / 60);

  el.quickStats.innerHTML = [
    `<span class="stat-pill"><strong>${stops.length}</strong> stops</span>`,
    `<span class="stat-pill"><strong>${days.length}</strong> days</span>`,
    `<span class="stat-pill"><strong>${busyHours}</strong> planned hrs</span>`,
    `<span class="stat-pill"><strong>${attachments.length}</strong> files</span>`
  ].join("");
}

function renderViews() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    const active = button.dataset.view === state.trip.activeView;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  document.querySelectorAll("[data-lens]").forEach((button) => {
    button.classList.toggle("active", button.dataset.lens === state.trip.timeLens);
  });

  ["timeline", "calendar", "board"].forEach((view) => {
    document.getElementById(`${view}View`).classList.toggle("active", state.trip.activeView === view);
  });

  renderTimeline();
  renderCalendar();
  renderBoard();
}

function renderTimeline() {
  const days = tripDays();
  if (!days.length) {
    el.timelineView.innerHTML = emptyState("No itinerary yet", "Use Add stop to start the timeline.");
    return;
  }

  el.timelineView.innerHTML = `
    <div class="timeline">
      ${days
        .map((day) => {
          const stops = stopsForDestinationDay(day.iso);
          return `
            <section class="day-group" aria-label="${day.weekday} ${day.monthDay}">
              <div class="day-label">
                <strong>${day.dayNumber}</strong>
                <span>${day.weekday}<br>${day.monthDay}</span>
              </div>
              <div class="day-events">
                ${stops.map((stop) => renderStopRow(stop)).join("") || `<div class="stop-row"><div></div>${emptyState("Open time", "No stops on this day.")}</div>`}
              </div>
            </section>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderStopRow(stop) {
  const meta = typeMeta[stop.type];
  const selected = stop.id === state.trip.selectedId;
  return `
    <article class="stop-row">
      <span class="stop-dot" style="background:${meta.color}"></span>
      <div class="stop-time">${timePair(stop)}</div>
      <div class="stop-card ${selected ? "selected" : ""}">
        <div class="stop-card-header">
          <h3>${escapeHtml(stop.title)}</h3>
          <span class="type-chip" style="background:${meta.color}">${meta.label}</span>
        </div>
        ${stop.notes ? `<p>${escapeHtml(stop.notes)}</p>` : ""}
        <div class="stop-card-actions">
          <button class="chip-button" type="button" data-action="select" data-id="${stop.id}">Select</button>
          <button class="chip-button" type="button" data-action="edit" data-id="${stop.id}">Edit</button>
          <button class="chip-button" type="button" data-action="delete" data-id="${stop.id}">Delete</button>
          ${stop.attachments.length ? `<span class="stat-pill"><strong>${stop.attachments.length}</strong> files</span>` : ""}
        </div>
      </div>
    </article>
  `;
}

function renderCalendar() {
  const days = tripDays();
  if (!days.length) {
    el.calendarView.innerHTML = emptyState("No calendar yet", "Add a dated stop to see the calendar.");
    return;
  }

  const hours = calendarHours();
  el.calendarView.innerHTML = `
    <div class="calendar-shell">
      <div class="calendar-scroll">
        <div class="calendar-grid" style="--day-count:${days.length}">
          <div class="calendar-head"></div>
          ${days
            .map((day) => `
              <div class="calendar-head">
                <strong>${day.weekday}</strong>
                <span>${day.monthDay}</span>
              </div>
            `)
            .join("")}
          ${hours
            .map((hour) => `
              <div class="calendar-time">${hourLabel(hour)}</div>
              ${days
                .map((day) => `
                  <div class="calendar-cell">
                    ${stopsForDestinationDay(day.iso)
                      .filter((stop) => destinationHour(stop) === hour)
                      .map((stop) => renderCalendarEvent(stop))
                      .join("")}
                  </div>
                `)
                .join("")}
            `)
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function renderCalendarEvent(stop) {
  const meta = typeMeta[stop.type];
  return `
    <button class="calendar-event" type="button" data-action="select" data-id="${stop.id}" style="border-left-color:${meta.color}">
      <strong>${escapeHtml(stop.title)}</strong>
      <span>${formatTimeForZone(toUtc(stop), state.trip.destinationZone)} · ${meta.label}</span>
    </button>
  `;
}

function renderBoard() {
  const stops = sortedStops();
  if (!stops.length) {
    el.boardView.innerHTML = emptyState("No trip board yet", "Add stops to create the visual route.");
    return;
  }

  el.boardView.innerHTML = `
    <div class="board-grid">
      <div class="route-map" aria-label="Route infographic">
        ${routeSvg(stops)}
      </div>
      <div class="board-panel">
        <h3>Daily load</h3>
        <div class="day-loads">${dayLoadRows()}</div>
      </div>
    </div>
  `;
}

function renderInsights() {
  renderSelectedCard();
  renderRhythmBars();
  renderAttachmentGallery();
  renderTimeNotes();
}

function renderSelectedCard() {
  const stop = selectedStop();
  if (!stop) {
    el.selectedCard.innerHTML = `
      <div class="selected-empty">
        <img src="assets/iceland-panorama.png" alt="" />
        <strong>No stop selected</strong>
      </div>
    `;
    return;
  }

  const meta = typeMeta[stop.type];
  el.selectedCard.innerHTML = `
    <div class="stop-card-header">
      <h2>${escapeHtml(stop.title)}</h2>
      <span class="type-chip" style="background:${meta.color}">${meta.label}</span>
    </div>
    <div class="selected-meta">
      <div><span>Iceland time</span><strong>${formatDateTimeForZone(toUtc(stop), state.trip.destinationZone)}</strong></div>
      <div><span>US time</span><strong>${formatDateTimeForZone(toUtc(stop), state.trip.originZone)}</strong></div>
      <div><span>Duration</span><strong>${durationLabel(stop.duration)}</strong></div>
    </div>
    ${stop.notes ? `<p>${escapeHtml(stop.notes)}</p>` : ""}
    <div class="stop-card-actions">
      <button class="ghost-button" type="button" data-action="edit" data-id="${stop.id}">Edit</button>
    </div>
  `;
}

function renderRhythmBars() {
  const days = tripDays();
  const dayLoads = days.map((day) => {
    const stops = stopsForDestinationDay(day.iso);
    const hours = stops.reduce((sum, stop) => sum + Number(stop.duration || 0), 0) / 60;
    return hours;
  });
  const maxLoad = Math.max(...dayLoads, 0);
  el.paceLabel.textContent = maxLoad > 10 ? "Packed" : maxLoad > 6 ? "Active" : "Balanced";

  el.rhythmBars.innerHTML = days.length
    ? days
        .map((day) => {
          const stops = stopsForDestinationDay(day.iso);
          const blocks = Array.from({ length: 24 }, (_, hour) => {
            const hit = stops.find((stop) => hourIsBusy(stop, hour));
            const kind = hit?.type === "flight" || hit?.type === "drive" ? "travel" : hit?.type === "sight" ? "sight" : hit ? "busy" : "";
            return `<span class="rhythm-block ${kind}" title="${hourLabel(hour)}"></span>`;
          }).join("");
          return `
            <div class="rhythm-row">
              <span>${day.monthDayShort}</span>
              <div class="rhythm-track">${blocks}</div>
            </div>
          `;
        })
        .join("")
    : `<div class="empty-state"><strong>No rhythm</strong><span>Add a stop to see the day shape.</span></div>`;
}

function renderAttachmentGallery() {
  const attachments = allAttachments();
  el.attachmentCount.textContent = String(attachments.length);
  el.attachmentGallery.innerHTML = attachments.length
    ? attachments.map((entry) => renderAttachment(entry.attachment, false, entry.stop.title)).join("")
    : `<div class="empty-state"><strong>No files</strong><span>Attachment shelf is empty.</span></div>`;
}

function renderTimeNotes() {
  const selected = selectedStop() || sortedStops()[0];
  const delta = selected ? zoneDeltaLabel(toUtc(selected)) : zoneDeltaLabel();
  const firstFlight = sortedStops().find((stop) => stop.type === "flight");
  const notes = [
    `Destination zone: ${state.trip.destinationZone}; paired US view: ${zoneLabel(state.trip.originZone)}.`,
    selected ? `${selected.title} is shown as ${formatDateTimeForZone(toUtc(selected), state.trip.destinationZone)} in Iceland and ${formatDateTimeForZone(toUtc(selected), state.trip.originZone)} in US time.` : `Current offset: ${delta}.`,
    firstFlight ? `Flight arrival can land on a different Iceland date than the US departure.` : `Add your flight first to anchor the date shift.`
  ];
  el.timeNotes.innerHTML = notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("");
}

function renderDraftAttachments() {
  el.draftAttachments.innerHTML = state.draftAttachments.length
    ? state.draftAttachments.map((attachment, index) => renderAttachment(attachment, true, "", index)).join("")
    : "";
}

function renderAttachment(attachment, removable, stopTitle = "", index = null) {
  const isImage = attachment.type?.startsWith("image/") && attachment.dataUrl;
  const thumb = isImage
    ? `<img src="${attachment.dataUrl}" alt="">`
    : `<span>${fileInitial(attachment.name)}</span>`;
  const action = removable
    ? `<button class="tiny-remove" type="button" data-action="remove-draft-attachment" data-index="${index}" aria-label="Remove ${escapeHtml(attachment.name)}">x</button>`
    : attachment.dataUrl
      ? `<a class="tiny-remove" href="${attachment.dataUrl}" download="${escapeAttribute(attachment.name)}" aria-label="Download ${escapeHtml(attachment.name)}">↓</a>`
      : "";

  return `
    <div class="${removable ? "attachment-item" : "gallery-item"}">
      <div class="${removable ? "attachment-thumb" : "gallery-thumb"}">${thumb}</div>
      <div>
        <strong>${escapeHtml(attachment.name)}</strong>
        <span>${stopTitle ? `${escapeHtml(stopTitle)} · ` : ""}${formatBytes(attachment.size || 0)}</span>
      </div>
      ${action}
    </div>
  `;
}

function saveStopFromForm() {
  const title = el.stopTitle.value.trim();
  if (!title) {
    showToast("Add a location before saving.");
    return;
  }

  const existing = state.editingId ? state.trip.stops.find((stop) => stop.id === state.editingId) : null;
  const stop = {
    id: existing?.id || createId(),
    title,
    type: el.stopType.value,
    date: el.stopDate.value,
    time: el.stopTime.value,
    zone: el.stopZone.value,
    duration: Number(el.stopDuration.value),
    notes: el.stopNotes.value.trim(),
    attachments: [...(existing?.attachments || []), ...state.draftAttachments]
  };

  if (existing) {
    state.trip.stops = state.trip.stops.map((item) => (item.id === existing.id ? stop : item));
    showToast("Stop updated.");
  } else {
    state.trip.stops.push(stop);
    showToast("Stop added.");
  }

  state.trip.selectedId = stop.id;
  state.activeDay = destinationDateIso(stop);
  state.draftAttachments = [];
  saveTrip();
  resetForm(false);
  render();
}

function resetForm(showMessage = true) {
  state.editingId = null;
  state.draftAttachments = [];
  el.formTitle.textContent = "Add stop";
  el.saveStopButton.querySelector("span").textContent = "Save stop";
  el.stopTitle.value = "";
  el.stopDate.value = nextStopDate();
  el.stopTime.value = "09:00";
  el.stopType.value = "sight";
  el.stopDuration.value = "90";
  el.stopZone.value = state.trip.destinationZone;
  el.stopNotes.value = "";
  el.stopAttachments.value = "";
  renderDraftAttachments();
  if (showMessage) showToast("Form cleared.");
}

function editStop(id) {
  const stop = state.trip.stops.find((item) => item.id === id);
  if (!stop) return;

  state.editingId = id;
  state.trip.selectedId = id;
  state.draftAttachments = [];
  el.formTitle.textContent = "Edit stop";
  el.saveStopButton.querySelector("span").textContent = "Update stop";
  el.stopTitle.value = stop.title;
  el.stopDate.value = stop.date;
  el.stopTime.value = stop.time;
  el.stopType.value = stop.type;
  el.stopDuration.value = String(stop.duration);
  el.stopZone.value = stop.zone;
  el.stopNotes.value = stop.notes;
  el.stopAttachments.value = "";
  saveTrip();
  render();
  el.stopTitle.focus();
}

function selectStop(id) {
  if (!state.trip.stops.some((stop) => stop.id === id)) return;
  state.trip.selectedId = id;
  state.activeDay = destinationDateIso(selectedStop());
  saveTrip();
  render();
}

function deleteStop(id) {
  const stop = state.trip.stops.find((item) => item.id === id);
  if (!stop) return;
  const ok = window.confirm(`Delete "${stop.title}"?`);
  if (!ok) return;
  state.trip.stops = state.trip.stops.filter((item) => item.id !== id);
  if (state.trip.selectedId === id) {
    state.trip.selectedId = state.trip.stops[0]?.id || null;
  }
  saveTrip();
  render();
  showToast("Stop deleted.");
}

function newTrip() {
  const ok = window.confirm("Start a new blank itinerary? Export JSON first if you want to keep this one.");
  if (!ok) return;
  state.trip = normalizeTrip({
    name: "Iceland Trip",
    originZone: state.trip.originZone,
    destinationZone: "Atlantic/Reykjavik",
    activeView: "timeline",
    timeLens: "both",
    selectedId: null,
    stops: []
  });
  state.activeDay = null;
  saveTrip();
  setInitialFormValues();
  render();
  showToast("New trip ready.");
}

function readFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  const maxSize = 1.8 * 1024 * 1024;
  const readers = files.map((file) => {
    if (file.size > maxSize) {
      showToast(`${file.name} is too large for browser storage.`);
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        id: createId(),
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        dataUrl: reader.result
      });
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  });

  Promise.all(readers).then((items) => {
    state.draftAttachments.push(...items.filter(Boolean));
    renderDraftAttachments();
  });
}

function removeDraftAttachment(index) {
  state.draftAttachments.splice(Number(index), 1);
  renderDraftAttachments();
}

function importTrip(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state.trip = normalizeTrip(JSON.parse(String(reader.result)));
      state.activeDay = null;
      saveTrip();
      setInitialFormValues();
      render();
      showToast("Trip imported.");
    } catch (error) {
      showToast("That JSON file could not be imported.");
    }
    el.importInput.value = "";
  };
  reader.readAsText(file);
}

function exportJson() {
  downloadFile(`${slugify(state.trip.name)}.json`, JSON.stringify(state.trip, null, 2), "application/json");
  showToast("JSON downloaded.");
}

function exportIcs() {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Iceland Itinerary Studio//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH"
  ];

  sortedStops().forEach((stop) => {
    const start = toUtc(stop);
    const end = new Date(start.getTime() + Number(stop.duration || 60) * 60000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${stop.id}@iceland-itinerary-studio`,
      `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${icsText(stop.title)}`,
      `DESCRIPTION:${icsText(`${stop.notes || ""}\\nIceland: ${formatDateTimeForZone(start, state.trip.destinationZone)}\\nUS: ${formatDateTimeForZone(start, state.trip.originZone)}`)}`,
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");
  downloadFile(`${slugify(state.trip.name)}.ics`, lines.join("\r\n"), "text/calendar");
  showToast("Calendar downloaded.");
}

function shareTrip() {
  const sharePayload = {
    ...state.trip,
    stops: state.trip.stops.map((stop) => ({
      ...stop,
      attachments: stop.attachments.map((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        type: attachment.type,
        size: attachment.size,
        dataUrl: ""
      }))
    }))
  };
  const encoded = encodeBase64(JSON.stringify(sharePayload));
  const url = `${window.location.origin}${window.location.pathname}#trip=${encoded}`;

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(
      () => showToast("Share link copied without file data."),
      () => showSharePrompt(url)
    );
  } else {
    showSharePrompt(url);
  }
}

function showSharePrompt(url) {
  window.prompt("Copy share link", url);
  showToast("Share link ready.");
}

function readTripFromHash() {
  if (!window.location.hash.startsWith("#trip=")) return null;
  try {
    return JSON.parse(decodeBase64(window.location.hash.slice(6)));
  } catch (error) {
    console.warn("Unable to read trip hash", error);
    return null;
  }
}

function sortedStops() {
  return [...state.trip.stops].sort((a, b) => toUtc(a).getTime() - toUtc(b).getTime());
}

function selectedStop() {
  return state.trip.stops.find((stop) => stop.id === state.trip.selectedId) || null;
}

function tripDays() {
  const stops = sortedStops();
  if (!stops.length) return [];
  const daySet = new Set(stops.map(destinationDateIso));
  return [...daySet].sort().map((iso) => dayInfo(iso));
}

function dayInfo(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return {
    iso,
    dayNumber: new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "UTC" }).format(date),
    weekday: new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(date),
    monthDay: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(date),
    monthDayShort: new Intl.DateTimeFormat("en-US", { month: "numeric", day: "numeric", timeZone: "UTC" }).format(date)
  };
}

function stopsForDestinationDay(iso) {
  return sortedStops().filter((stop) => destinationDateIso(stop) === iso);
}

function destinationDateIso(stop) {
  return formatParts(toUtc(stop), state.trip.destinationZone).date;
}

function toUtc(stop) {
  return zonedTimeToUtc(stop.date, stop.time, stop.zone);
}

function zonedTimeToUtc(dateIso, time, timeZone) {
  const [year, month, day] = dateIso.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute || 0);
  let offset = getTimeZoneOffset(new Date(utcGuess), timeZone);
  let utc = utcGuess - offset;
  const secondOffset = getTimeZoneOffset(new Date(utc), timeZone);
  if (secondOffset !== offset) {
    utc = utcGuess - secondOffset;
  }
  return new Date(utc);
}

function getTimeZoneOffset(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = map.hour === "24" ? 0 : Number(map.hour);
  const asUtc = Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day), hour, Number(map.minute), Number(map.second));
  return asUtc - date.getTime();
}

function formatParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = map.hour === "24" ? "00" : map.hour;
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    time: `${hour}:${map.minute}`
  };
}

function formatTimeForZone(date, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function formatDateForZone(date, timeZone, style = "long") {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: style === "long" ? "short" : undefined,
    month: "short",
    day: "numeric"
  }).format(date);
}

function formatDateTimeForZone(date, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function timePair(stop) {
  const date = toUtc(stop);
  const origin = `${formatTimeForZone(date, state.trip.originZone)} US`;
  const destination = `${formatTimeForZone(date, state.trip.destinationZone)} Iceland`;
  if (state.trip.timeLens === "origin") return origin;
  if (state.trip.timeLens === "destination") return destination;
  return `${destination}<br><span>${origin}</span>`;
}

function destinationHour(stop) {
  return Number(formatParts(toUtc(stop), state.trip.destinationZone).time.split(":")[0]);
}

function calendarHours() {
  const hours = sortedStops().map(destinationHour);
  if (!hours.length) return Array.from({ length: 12 }, (_, index) => index + 8);
  const min = Math.max(0, Math.min(...hours) - 1);
  const max = Math.min(23, Math.max(...hours) + 2);
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

function hourLabel(hour) {
  const date = new Date(Date.UTC(2026, 0, 1, hour));
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", timeZone: "UTC" }).format(date);
}

function hourIsBusy(stop, hour) {
  const startHour = destinationHour(stop);
  const endHour = Math.min(23, startHour + Math.ceil(Number(stop.duration || 60) / 60));
  return hour >= startHour && hour < endHour;
}

function routeSvg(stops) {
  const points = stops.slice(0, 8).map((stop, index, arr) => {
    const x = arr.length === 1 ? 50 : 10 + (index / (arr.length - 1)) * 80;
    const y = 56 + Math.sin(index * 1.25) * 25;
    return { stop, x, y };
  });
  const path = points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");

  return `
    <svg class="route-art" viewBox="0 0 100 100" role="img" aria-label="Iceland route infographic">
      <defs>
        <linearGradient id="seaGradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#edf8f8" />
          <stop offset="1" stop-color="#dcecee" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="4" fill="url(#seaGradient)" />
      <path d="M8 70 C18 45 35 38 48 49 C60 59 72 30 92 47 L92 84 L8 84 Z" fill="#ffffff" opacity="0.92" />
      <path d="M12 78 C26 67 38 72 51 62 C68 49 78 63 90 55" fill="none" stroke="#b9d2d6" stroke-width="2" stroke-linecap="round" />
      <path class="route-line" d="${path}" />
      ${points
        .map(({ stop, x, y }, index) => `
          <circle class="route-point ${stop.type}" cx="${x}" cy="${y}" r="${index === 0 ? 4.4 : 3.8}" />
          <text x="${Math.min(88, Math.max(8, x - 5))}" y="${Math.max(13, y - 8)}">${escapeSvg(routeLabel(stop.title))}</text>
        `)
        .join("")}
    </svg>
  `;
}

function dayLoadRows() {
  const days = tripDays();
  if (!days.length) return "";
  const max = Math.max(...days.map((day) => dayLoadHours(day.iso)), 1);
  return days
    .map((day) => {
      const hours = dayLoadHours(day.iso);
      const pct = Math.min(100, Math.round((hours / max) * 100));
      return `
        <div class="load-row">
          <span>${day.monthDayShort}</span>
          <div class="load-track"><div class="load-fill" style="width:${pct}%"></div></div>
          <strong>${Math.round(hours)}h</strong>
        </div>
      `;
    })
    .join("");
}

function dayLoadHours(iso) {
  return stopsForDestinationDay(iso).reduce((sum, stop) => sum + Number(stop.duration || 0), 0) / 60;
}

function allAttachments() {
  return sortedStops().flatMap((stop) => stop.attachments.map((attachment) => ({ stop, attachment })));
}

function updateClocks() {
  if (!el.originClock) return;
  const now = new Date();
  el.originClock.textContent = formatTimeForZone(now, state.trip.originZone);
  el.destinationClock.textContent = formatTimeForZone(now, state.trip.destinationZone);
  el.originClockZone.textContent = zoneLabel(state.trip.originZone);
  el.destinationClockZone.textContent = zoneLabel(state.trip.destinationZone);
}

function zoneDeltaLabel(date = new Date()) {
  const origin = getTimeZoneOffset(date, state.trip.originZone) / 3600000;
  const destination = getTimeZoneOffset(date, state.trip.destinationZone) / 3600000;
  const delta = destination - origin;
  if (delta === 0) return "Same time";
  return `Iceland ${Math.abs(delta)}h ${delta > 0 ? "ahead" : "behind"}`;
}

function zoneLabel(zoneId) {
  return zones.find((zone) => zone.id === zoneId)?.label || zoneId;
}

function nextStopDate() {
  const stops = sortedStops();
  return stops.length ? destinationDateIso(stops[stops.length - 1]) : todayIso();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function durationLabel(minutes) {
  const value = Number(minutes || 0);
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

function fileInitial(name) {
  const extension = name.split(".").pop() || "file";
  return extension.slice(0, 3).toUpperCase();
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatBytes(bytes) {
  if (!bytes) return "file";
  const units = ["B", "KB", "MB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index ? 1 : 0)} ${units[index]}`;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function icsDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function slugify(value) {
  return String(value || "iceland-itinerary")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "iceland-itinerary";
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function routeLabel(title) {
  const parts = title.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).join(" ").slice(0, 16);
}

function emptyState(title, body) {
  return `<div class="empty-state"><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span></div></div>`;
}

function showToast(message) {
  clearTimeout(state.toastTimer);
  el.toast.textContent = message;
  el.toast.classList.add("show");
  state.toastTimer = setTimeout(() => el.toast.classList.remove("show"), 2800);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function escapeSvg(value) {
  return escapeHtml(value);
}
