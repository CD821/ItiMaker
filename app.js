const STORAGE_KEY = "iceland-itinerary-studio-v1";
const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const DEFAULT_STORAGE_BUCKET = "itinerary-attachments";
const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

const zones = buildTimeZoneOptions();

const typeMeta = {
  flight: { label: "Flight", color: "#e7785f", icon: "plane" },
  stay: { label: "Stay", color: "#3988a5", icon: "bed" },
  food: { label: "Food", color: "#d59643", icon: "fork" },
  sight: { label: "Sight", color: "#5fa55b", icon: "mountain" },
  drive: { label: "Drive", color: "#087b83", icon: "car" },
  waiting: { label: "Waiting", color: "#7b6fd0", icon: "clock" },
  note: { label: "Note", color: "#29363a", icon: "note" }
};

const fallbackTrip = {
  name: "Sample Trip Preview",
  localId: "local-preview-trip",
  originZone: detectedTimeZone,
  destinationZone: detectedTimeZone,
  activeView: "timeline",
  calendarMode: "week",
  calendarRangeStart: "",
  calendarRangeEnd: "",
  timeLens: "both",
  showEndTimes: true,
  selectedId: "22222222-2222-4222-8222-222222222222",
  stops: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      title: "Flight arrival",
      type: "flight",
      startDate: "2026-06-21",
      startTime: "19:35",
      endDate: "2026-06-22",
      endTime: "05:35",
      zone: detectedTimeZone,
      notes: "Overnight flight. Keep passport, chargers, and layers easy to reach.",
      attachments: []
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      title: "Hotel check-in",
      type: "stay",
      startDate: "2026-06-22",
      startTime: "09:40",
      endDate: "2026-06-22",
      endTime: "11:10",
      zone: detectedTimeZone,
      notes: "Drop bags, reset watches to local time, coffee nearby.",
      attachments: []
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      title: "Landmark visit",
      type: "sight",
      startDate: "2026-06-22",
      startTime: "14:00",
      endDate: "2026-06-22",
      endTime: "17:00",
      zone: detectedTimeZone,
      notes: "Pre-booked entry window. Pack swimsuit in day bag.",
      attachments: []
    },
    {
      id: "44444444-4444-4444-8444-444444444444",
      title: "Scenic drive",
      type: "drive",
      startDate: "2026-06-23",
      startTime: "08:30",
      endDate: "2026-06-23",
      endTime: "16:30",
      zone: detectedTimeZone,
      notes: "Thingvellir, Geysir, Gullfoss. Leave room for weather delays.",
      attachments: []
    },
    {
      id: "55555555-5555-4555-8555-555555555555",
      title: "Dinner notes",
      type: "food",
      startDate: "2026-06-23",
      startTime: "19:15",
      endDate: "2026-06-23",
      endTime: "20:45",
      zone: detectedTimeZone,
      notes: "Try seafood or lamb. Save receipts for budget tracking.",
      attachments: []
    }
  ]
};

const initialStore = loadTripStore();
const state = {
  trips: initialStore.trips,
  activeTripKey: initialStore.activeTripKey,
  trip: initialStore.activeTrip,
  draftAttachments: [],
  editingId: null,
  activeDay: null,
  toastTimer: null,
  localAccess: readSessionFlag("itinerary-local-access"),
  cloud: {
    configured: false,
    loading: true,
    client: null,
    session: null,
    user: null,
    recoveryMode: false,
    bucket: DEFAULT_STORAGE_BUCKET,
    syncing: false,
    saveTimer: null,
    suppressSave: false,
    lastSavedAt: null,
    lastError: "",
    trips: []
  }
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
  initCloud();
});

function cacheElements() {
  [
    "tripSubtitle",
    "authGate",
    "authStatus",
    "authTitle",
    "authGateMessage",
    "authGateForm",
    "authUsername",
    "authPassword",
    "authLoginButton",
    "authSignupButton",
    "authResetButton",
    "continueLocalButton",
    "appShell",
    "newTripButton",
    "importButton",
    "exportJsonButton",
    "exportIcsButton",
    "shareButton",
    "openMapsButton",
    "printButton",
    "cloudStatus",
    "cloudHint",
    "cloudAuthForm",
    "cloudUsername",
    "cloudPassword",
    "cloudAccount",
    "cloudUserLabel",
    "syncCloudButton",
    "signOutButton",
    "joinTripForm",
    "joinTripCode",
    "shareCodeBox",
    "cloudShareCode",
    "tripSelect",
    "archiveTripButton",
    "deleteTripButton",
    "tripName",
    "timelineTimeRangeToggle",
    "openStopModalButton",
    "stopModal",
    "closeStopModalButton",
    "originZone",
    "destinationZone",
    "zoneDelta",
    "stopForm",
    "formTitle",
    "clearFormButton",
    "stopTitle",
    "stopLocation",
    "stopDate",
    "stopTime",
    "stopEndDate",
    "stopEndTime",
    "stopType",
    "stopLengthPreview",
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
  el.authGateForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.cloud.recoveryMode) {
      updateCloudPassword();
      return;
    }
    signInToCloud({ shouldCreateUser: false });
  });

  el.authSignupButton.addEventListener("click", () => {
    signInToCloud({ shouldCreateUser: true });
  });

  el.authResetButton.addEventListener("click", () => {
    sendPasswordReset();
  });

  el.continueLocalButton.addEventListener("click", () => {
    state.localAccess = true;
    writeSessionFlag("itinerary-local-access", true);
    renderAuthGate();
    showToast("Local mode unlocked for this browser.");
  });

  el.tripName.addEventListener("input", (event) => {
    state.trip.name = event.target.value.trim() || "Untitled Trip";
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

  el.timelineTimeRangeToggle.addEventListener("change", (event) => {
    state.trip.showEndTimes = event.target.checked;
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
  el.openStopModalButton.addEventListener("click", () => {
    resetForm(false);
    openStopModal();
  });
  el.closeStopModalButton.addEventListener("click", () => closeStopModal());
  el.stopModal.addEventListener("click", (event) => {
    if (event.target === el.stopModal) closeStopModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !el.stopModal.hidden) closeStopModal();
    if ((event.key === "Enter" || event.key === " ") && event.target.matches('[role="button"][data-action="select"]')) {
      event.preventDefault();
      event.target.click();
    }
  });

  el.cloudAuthForm.addEventListener("submit", (event) => {
    event.preventDefault();
    signInToCloud({ shouldCreateUser: true, source: "cloud" });
  });
  el.syncCloudButton.addEventListener("click", () => syncCloudNow());
  el.signOutButton.addEventListener("click", () => signOutOfCloud());
  el.joinTripForm.addEventListener("submit", (event) => {
    event.preventDefault();
    joinTripByCode();
  });
  el.tripSelect.addEventListener("change", () => switchTrip(el.tripSelect.value));
  el.archiveTripButton.addEventListener("click", () => archiveActiveTrip());
  el.deleteTripButton.addEventListener("click", () => deleteActiveTrip());

  el.clearFormButton.addEventListener("click", () => resetForm());
  el.stopAttachments.addEventListener("change", (event) => readFiles(event.target.files));
  ["stopDate", "stopTime"].forEach((id) => {
    el[id].addEventListener("change", ensureValidEndFromStart);
  });
  ["stopDate", "stopTime", "stopEndDate", "stopEndTime", "stopZone"].forEach((id) => {
    el[id].addEventListener("change", renderStopLengthPreview);
    el[id].addEventListener("input", renderStopLengthPreview);
  });
  el.newTripButton.addEventListener("click", newTrip);
  el.importButton.addEventListener("click", () => el.importInput.click());
  el.importInput.addEventListener("change", importTrip);
  el.exportJsonButton.addEventListener("click", exportJson);
  el.exportIcsButton.addEventListener("click", exportIcs);
  el.shareButton.addEventListener("click", shareTrip);
  el.openMapsButton.addEventListener("click", openGoogleMapsList);
  el.printButton.addEventListener("click", () => window.print());

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.trip.activeView = button.dataset.view;
      saveTrip();
      renderViews();
    });
  });

  document.addEventListener("click", (event) => {
    const calendarMode = event.target.closest("[data-calendar-mode]");
    if (calendarMode) {
      state.trip.calendarMode = calendarMode.dataset.calendarMode;
      if (state.trip.calendarMode === "range") ensureCalendarRange();
      saveTrip();
      renderCalendar();
      return;
    }

    const calendarDay = event.target.closest("[data-calendar-day]");
    if (calendarDay) {
      state.activeDay = calendarDay.dataset.calendarDay;
      state.trip.calendarMode = "day";
      saveTrip();
      render();
      return;
    }

    const action = event.target.closest("[data-action]");
    if (!action) return;
    const id = action.dataset.id;
    if (action.dataset.action === "select") selectStop(id);
    if (action.dataset.action === "edit") editStop(id);
    if (action.dataset.action === "delete") deleteStop(id);
    if (action.dataset.action === "open-maps") openGoogleMapsList();
    if (action.dataset.action === "remove-draft-attachment") removeDraftAttachment(action.dataset.index);
  });

  document.addEventListener("change", (event) => {
    if (event.target.matches("[data-calendar-range]")) {
      updateCalendarRange(event.target.dataset.calendarRange, event.target.value);
    }
  });
}

function populateZones() {
  const options = zones.map((zone) => `<option value="${zone.id}">${escapeHtml(zone.label)}</option>`).join("");
  el.originZone.innerHTML = options;
  el.destinationZone.innerHTML = options;
  el.stopZone.innerHTML = options;
}

function setInitialFormValues() {
  el.tripName.value = state.trip.name;
  el.originZone.value = state.trip.originZone;
  el.destinationZone.value = state.trip.destinationZone;
  resetForm(false);
}

function loadTripStore() {
  const hashTrip = readTripFromHash();
  if (hashTrip) {
    const activeTrip = normalizeTrip(hashTrip);
    return {
      trips: [activeTrip],
      activeTripKey: activeTrip.localId,
      activeTrip
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed.trips)) {
        const trips = dedupeTripList(parsed.trips.map(normalizeTrip), {
          activeTripKey: parsed.activeTripKey,
          activeCloudId: parsed.activeCloudId
        });
        const activeTrips = trips.filter((trip) => !trip.archivedAt);
        const activeTrip =
          activeTrips.find((trip) => trip.localId === parsed.activeTripKey || trip.cloudId === parsed.activeCloudId) ||
          activeTrips[0] ||
          createBlankTrip();
        const visibleTrips = trips.some((trip) => trip.localId === activeTrip.localId)
          ? trips
          : [...trips, activeTrip];
        if (visibleTrips.length !== parsed.trips.length) {
          writeTripStore(activeTrip, visibleTrips);
        }
        return {
          trips: visibleTrips.length ? visibleTrips : [activeTrip],
          activeTripKey: activeTrip.localId,
          activeTrip
        };
      }

      const activeTrip = normalizeTrip(parsed);
      return {
        trips: [activeTrip],
        activeTripKey: activeTrip.localId,
        activeTrip
      };
    }
  } catch (error) {
    console.warn("Unable to read stored trip", error);
  }

  const activeTrip = normalizeTrip(fallbackTrip);
  return {
    trips: [activeTrip],
    activeTripKey: activeTrip.localId,
    activeTrip
  };
}

function normalizeTrip(trip) {
  const incomingLocalId = trip?.localId;
  const normalized = {
    ...fallbackTrip,
    ...trip,
    stops: Array.isArray(trip?.stops) ? trip.stops : fallbackTrip.stops
  };
  const idMap = new Map();

  normalized.localId = incomingLocalId || createId();
  normalized.cloudId = isUuid(normalized.cloudId) ? normalized.cloudId : null;
  normalized.cloudOwnerId = isUuid(normalized.cloudOwnerId) ? normalized.cloudOwnerId : null;
  normalized.shareCode = normalized.shareCode || "";
  normalized.archivedAt = normalized.archivedAt || normalized.archived_at || "";
  normalized.originZone = isKnownZone(normalized.originZone) ? normalized.originZone : detectedTimeZone;
  normalized.destinationZone = isKnownZone(normalized.destinationZone) ? normalized.destinationZone : detectedTimeZone;
  normalized.activeView = ["timeline", "calendar", "board"].includes(normalized.activeView) ? normalized.activeView : "timeline";
  normalized.calendarMode = ["month", "week", "day", "range"].includes(normalized.calendarMode) ? normalized.calendarMode : "week";
  normalized.calendarRangeStart = isIsoDate(normalized.calendarRangeStart) ? normalized.calendarRangeStart : "";
  normalized.calendarRangeEnd = isIsoDate(normalized.calendarRangeEnd) ? normalized.calendarRangeEnd : "";
  normalized.timeLens = ["both", "origin", "destination"].includes(normalized.timeLens) ? normalized.timeLens : "both";
  normalized.showEndTimes = normalized.showEndTimes !== false;

  normalized.stops = normalized.stops.map((stop) => {
    const incomingId = stop.id || "";
    const stopId = isUuid(incomingId) ? incomingId : createId();
    idMap.set(incomingId, stopId);
    const startDate = stop.startDate || stop.date || todayIso();
    const startTime = stop.startTime || stop.time || "09:00";
    const inferredEnd = inferEndDateTime(
      startDate,
      startTime,
      isKnownZone(stop.zone) ? stop.zone : normalized.destinationZone,
      Number(stop.duration || stop.durationMinutes || 90)
    );
    let endDate = stop.endDate || inferredEnd.date;
    let endTime = stop.endTime || inferredEnd.time;
    if (zonedTimeToUtc(endDate, endTime, isKnownZone(stop.zone) ? stop.zone : normalized.destinationZone) <= zonedTimeToUtc(startDate, startTime, isKnownZone(stop.zone) ? stop.zone : normalized.destinationZone)) {
      endDate = inferredEnd.date;
      endTime = inferredEnd.time;
    }
    return {
      id: stopId,
      title: stop.title || "Untitled stop",
      location: stop.location || stop.place || "",
      type: typeMeta[stop.type] ? stop.type : "note",
      startDate,
      startTime,
      endDate,
      endTime,
      date: startDate,
      time: startTime,
      zone: isKnownZone(stop.zone) ? stop.zone : normalized.destinationZone,
      notes: stop.notes || "",
      attachments: Array.isArray(stop.attachments)
        ? stop.attachments.map((attachment) => ({
            id: isUuid(attachment.id) ? attachment.id : createId(),
            name: attachment.name || "Attachment",
            type: attachment.type || attachment.mimeType || "application/octet-stream",
            size: Number(attachment.size || attachment.sizeBytes || 0),
            dataUrl: attachment.dataUrl || "",
            signedUrl: attachment.signedUrl || attachment.publicUrl || "",
            storagePath: attachment.storagePath || attachment.storage_path || ""
          }))
        : []
    };
  });

  const selectedId = idMap.get(normalized.selectedId) || normalized.selectedId;
  normalized.selectedId = normalized.stops.some((stop) => stop.id === selectedId)
    ? selectedId
    : normalized.stops[0]?.id || null;
  return normalized;
}

function dedupeTripList(trips, preferred = {}) {
  const exactOrder = [];
  const exactMap = new Map();

  trips.forEach((trip) => {
    const key = trip.cloudId ? `cloud:${trip.cloudId}` : `local:${trip.localId}`;
    const existing = exactMap.get(key);
    if (!existing) {
      exactOrder.push(key);
      exactMap.set(key, trip);
      return;
    }
    exactMap.set(key, pickDedupeTrip(existing, trip, preferred));
  });

  const contentOrder = [];
  const contentMap = new Map();
  exactOrder.map((key) => exactMap.get(key)).forEach((trip) => {
    const key = trip.cloudId ? tripContentKey(trip) : `local:${trip.localId}`;
    const existing = contentMap.get(key);
    if (!existing) {
      contentOrder.push(key);
      contentMap.set(key, trip);
      return;
    }
    contentMap.set(key, pickDedupeTrip(existing, trip, preferred));
  });

  return contentOrder.map((key) => contentMap.get(key));
}

function pickDedupeTrip(current, incoming, preferred) {
  const currentPreferred = isPreferredTrip(current, preferred);
  const incomingPreferred = isPreferredTrip(incoming, preferred);
  if (currentPreferred !== incomingPreferred) return incomingPreferred ? incoming : current;
  if (Boolean(current.archivedAt) !== Boolean(incoming.archivedAt)) return current.archivedAt ? incoming : current;

  const currentScore = tripCompletenessScore(current);
  const incomingScore = tripCompletenessScore(incoming);
  return incomingScore >= currentScore ? incoming : current;
}

function isPreferredTrip(trip, preferred) {
  return (
    (preferred.activeTripKey && trip.localId === preferred.activeTripKey) ||
    (preferred.activeCloudId && trip.cloudId === preferred.activeCloudId) ||
    (preferred.localId && trip.localId === preferred.localId) ||
    (preferred.cloudId && trip.cloudId === preferred.cloudId)
  );
}

function tripCompletenessScore(trip) {
  const attachmentCount = (trip.stops || []).reduce((total, stop) => total + (stop.attachments?.length || 0), 0);
  return (trip.stops?.length || 0) * 10 + attachmentCount + (trip.shareCode ? 2 : 0) + (trip.cloudOwnerId ? 1 : 0);
}

function tripContentKey(trip) {
  const stops = [...(trip.stops || [])]
    .sort((a, b) => {
      const aKey = `${a.startDate || a.date || ""} ${a.startTime || a.time || ""} ${a.title || ""}`;
      const bKey = `${b.startDate || b.date || ""} ${b.startTime || b.time || ""} ${b.title || ""}`;
      return aKey.localeCompare(bKey);
    })
    .map((stop) => [
      stop.title || "",
      stop.location || "",
      stop.type || "",
      stop.startDate || stop.date || "",
      stop.startTime || stop.time || "",
      stop.endDate || "",
      stop.endTime || "",
      stop.zone || ""
    ].join("|"))
    .join(";");
  return [
    "content",
    String(trip.name || "").trim().toLowerCase(),
    trip.originZone || "",
    trip.destinationZone || "",
    stops
  ].join(":");
}

function createBlankTrip(name = "New Trip") {
  return normalizeTrip({
    name,
    localId: createId(),
    originZone: detectedTimeZone,
    destinationZone: detectedTimeZone,
    activeView: "timeline",
    calendarMode: "week",
    calendarRangeStart: "",
    calendarRangeEnd: "",
    timeLens: "both",
    showEndTimes: true,
    selectedId: null,
    stops: []
  });
}

function isKnownZone(zone) {
  return zones.some((item) => item.id === zone);
}

function buildTimeZoneOptions() {
  const fallbackZones = [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Mexico_City",
    "America/Bogota",
    "America/Sao_Paulo",
    "Atlantic/Reykjavik",
    "Europe/London",
    "Europe/Madrid",
    "Europe/Paris",
    "Europe/Rome",
    "Asia/Tokyo",
    "Asia/Seoul",
    "Asia/Dubai",
    "Australia/Sydney",
    "Pacific/Honolulu"
  ];
  const supported = typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone")
    : fallbackZones;
  const unique = new Set([detectedTimeZone, ...supported, ...fallbackZones].filter(Boolean));
  return [...unique]
    .map((id) => ({ id, label: timeZoneOptionLabel(id) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function timeZoneOptionLabel(zoneId) {
  const city = zoneId.split("/").pop().replace(/_/g, " ");
  const region = zoneId.includes("/") ? zoneId.split("/")[0].replace(/_/g, " ") : "";
  return region ? `${city} (${region})` : city;
}

function readSessionFlag(key) {
  try {
    return sessionStorage.getItem(key) === "true";
  } catch (error) {
    return false;
  }
}

function writeSessionFlag(key, value) {
  try {
    if (value) sessionStorage.setItem(key, "true");
    else sessionStorage.removeItem(key);
  } catch (error) {
    // Session storage is optional; the UI state still works for this page load.
  }
}

function saveTrip() {
  persistLocalTrip();
  scheduleCloudSave();
}

function persistLocalTrip() {
  upsertActiveTripInStore();
  if (!writeTripStore(state.trip, state.trips)) {
    showToast("Storage is full. Export JSON before adding more attachments.");
  }
}

function writeTripStore(activeTrip, trips) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activeTripKey: activeTrip.localId,
        activeCloudId: activeTrip.cloudId || null,
        trips: trips.map(sanitizeTripForLocal)
      })
    );
    return true;
  } catch (error) {
    console.warn("Unable to write stored trip", error);
    return false;
  }
}

function upsertActiveTripInStore() {
  const index = state.trips.findIndex((trip) => trip.localId === state.trip.localId);
  if (index >= 0) {
    state.trips[index] = state.trip;
  } else {
    state.trips.push(state.trip);
  }
  state.trips = dedupeTripList(state.trips, {
    activeTripKey: state.trip.localId,
    activeCloudId: state.trip.cloudId
  });
  state.trip =
    state.trips.find((trip) => trip.localId === state.trip.localId) ||
    state.trips.find((trip) => trip.cloudId && trip.cloudId === state.trip.cloudId) ||
    state.trip;
  state.activeTripKey = state.trip.localId;
}

function render() {
  renderHeader();
  renderCloudPanel();
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
  el.tripSubtitle.textContent = `${stops.length} stops - ${range}`;
  el.workspaceTitle.textContent = state.trip.name || "Trip route, visually managed";
  el.workspaceMeta.textContent = stops.length
    ? `${range} - Timeline times use each stop's assigned time zone. Home and trip clocks stay available for reference.`
    : "Add locations, dates, times, notes, and files to start shaping the trip.";
  el.originZone.value = state.trip.originZone;
  el.destinationZone.value = state.trip.destinationZone;
  el.zoneDelta.textContent = zoneDeltaLabel();
  el.timelineTimeRangeToggle.checked = state.trip.showEndTimes !== false;
}

function renderCloudPanel() {
  if (!el.cloudStatus) return;
  const cloud = state.cloud;
  const signedIn = Boolean(cloud.user);
  const hasCloudTrip = Boolean(state.trip.cloudId);

  let label = "Local";
  if (cloud.loading) label = "Checking";
  else if (!cloud.configured) label = "Setup needed";
  else if (cloud.syncing) label = "Syncing";
  else if (cloud.lastError) label = "Error";
  else if (signedIn && hasCloudTrip) label = "Cloud saved";
  else if (signedIn) label = "Signed in";
  else label = "Sign in";

  el.cloudStatus.textContent = label;
  el.cloudHint.textContent = cloudHintText();
  renderTripSelect();
  el.cloudAuthForm.hidden = !cloud.configured || signedIn;
  el.cloudAccount.hidden = !signedIn;
  el.joinTripForm.hidden = !cloud.configured || !signedIn;
  el.shareCodeBox.hidden = !signedIn || !state.trip.shareCode;
  el.syncCloudButton.disabled = !signedIn || cloud.syncing;
  el.signOutButton.disabled = cloud.syncing;
  el.archiveTripButton.disabled = cloud.syncing;
  el.deleteTripButton.disabled = cloud.syncing;
  el.cloudUserLabel.textContent = displayUserName(cloud.user);
  el.cloudShareCode.textContent = state.trip.shareCode || "----";

  if (!cloud.configured && !cloud.loading) {
    el.cloudUserLabel.textContent = "Add Supabase env vars in Vercel";
  }
  renderAuthGate();
}

function renderAuthGate() {
  if (!el.authGate || !el.appShell) return;

  const cloud = state.cloud;
  const signedIn = Boolean(cloud.user);
  const localModeAllowed = !cloud.configured && state.localAccess;
  const allowTrips = (signedIn && !cloud.recoveryMode) || localModeAllowed;

  el.authGate.hidden = allowTrips;
  el.appShell.hidden = !allowTrips;
  if (allowTrips) return;

  let status = "Checking setup";
  let title = "Sign in to your trips";
  let message = "Checking your Supabase connection before loading the planner.";

  if (!cloud.loading && !cloud.configured) {
    status = "Setup needed";
    message = cloud.lastError || "Supabase env vars are missing in Vercel. Add them to enable login and shared trips.";
  } else if (cloud.recoveryMode) {
    status = "Password reset";
    title = "Set a new password";
    message = "Enter a new password for this email, then save it.";
  } else if (!cloud.loading && cloud.configured) {
    status = "Login required";
    message = cloud.lastError || "Use your email and password to open shared trips.";
  }

  el.authStatus.textContent = status;
  el.authTitle.textContent = title;
  el.authGateMessage.textContent = message;
  el.authGateForm.hidden = cloud.loading || !cloud.configured;
  el.continueLocalButton.hidden = cloud.loading || cloud.configured;
  el.authLoginButton.disabled = cloud.loading || !cloud.configured;
  el.authLoginButton.textContent = cloud.recoveryMode ? "Save new password" : "Log in";
  el.authSignupButton.disabled = cloud.loading || !cloud.configured;
  el.authSignupButton.hidden = cloud.recoveryMode;
  el.authResetButton.hidden = cloud.recoveryMode;
  el.authUsername.disabled = cloud.recoveryMode;
  if (cloud.recoveryMode && cloud.user?.email) el.authUsername.value = cloud.user.email;
}

function renderTripSelect() {
  const visibleLocalTrips = dedupeTripList(state.trips, {
    activeTripKey: state.trip.localId,
    activeCloudId: state.trip.cloudId
  }).filter((trip) => !trip.archivedAt);
  const localOptions = visibleLocalTrips.map((trip) => `
    <option value="local:${trip.localId}">${escapeHtml(trip.name || "Untitled trip")}</option>
  `);
  const localCloudIds = new Set(visibleLocalTrips.map((trip) => trip.cloudId).filter(Boolean));
  const localCloudNames = new Set(visibleLocalTrips.filter((trip) => trip.cloudId).map(tripNameKey));
  const cloudOptions = dedupeCloudTripSummaries(state.cloud.trips)
    .filter((trip) => !trip.archived_at && !localCloudIds.has(trip.id) && !localCloudNames.has(tripNameKey(trip)))
    .map((trip) => `
      <option value="cloud:${trip.id}">${escapeHtml(trip.name || "Cloud trip")}</option>
    `);
  el.tripSelect.innerHTML = [...localOptions, ...cloudOptions].join("");
  el.tripSelect.value = `local:${state.trip.localId}`;
}

function dedupeCloudTripSummaries(trips) {
  const seen = new Set();
  return trips.filter((trip) => {
    const key = tripNameKey(trip) || trip.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function tripNameKey(trip) {
  return String(trip?.name || "").trim().toLowerCase();
}

function cloudHintText() {
  const cloud = state.cloud;
  if (cloud.loading) return "Checking Vercel cloud configuration.";
  if (!cloud.configured) return "Add Supabase env vars in Vercel to enable shared sync.";
  if (!cloud.user) return "Sign in to sync this itinerary across devices.";
  if (cloud.syncing) return "Saving itinerary changes.";
  if (cloud.lastError) return cloud.lastError;
  if (state.trip.cloudId) return "Autosaves about 1 second after changes. Reload another device to pull the latest.";
  return "Use Sync now once; after that, changes autosave about 1 second later.";
}

async function initCloud() {
  try {
    const config = await loadCloudConfig();
    state.cloud.loading = false;
    state.cloud.configured = Boolean(config.enabled);
    state.cloud.bucket = config.storageBucket || DEFAULT_STORAGE_BUCKET;

    if (!state.cloud.configured) {
      renderCloudPanel();
      return;
    }

    const { createClient } = await import(SUPABASE_CDN);
    state.cloud.client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true
      }
    });

    const { data } = await state.cloud.client.auth.getSession();
    await handleCloudSession(data.session, Boolean(data.session));
    state.cloud.client.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        startPasswordRecovery(session);
        return;
      }
      const userChanged = session?.user?.id && session.user.id !== state.cloud.user?.id;
      const shouldLoadTrip = event === "SIGNED_IN" && (userChanged || !state.trip.cloudId);
      handleCloudSession(session, shouldLoadTrip);
    });
  } catch (error) {
    state.cloud.loading = false;
    state.cloud.configured = false;
    state.cloud.lastError = "Cloud setup unavailable";
    renderCloudPanel();
  }
}

async function loadCloudConfig() {
  const response = await fetch("/api/config", { cache: "no-store" });
  if (!response.ok) {
    return { enabled: false };
  }
  return response.json();
}

async function handleCloudSession(session, shouldLoadTrip) {
  if (session?.user?.email?.endsWith("@itinerary.local")) {
    await state.cloud.client.auth.signOut();
    state.cloud.session = null;
    state.cloud.user = null;
    state.cloud.lastError = "Old username login was retired. Sign in with your real email, like BidCraft.";
    renderCloudPanel();
    return;
  }

  state.cloud.session = session || null;
  state.cloud.user = session?.user || null;
  state.cloud.lastError = "";
  renderCloudPanel();

  if (!state.cloud.user) return;

  const joinCode = readJoinCodeFromHash();
  if (joinCode) {
    await joinTripByCode(joinCode, { silent: true });
    return;
  }

  if (shouldLoadTrip) {
    await loadCloudTrips();
  }
}

async function signInToCloud(options = {}) {
  if (!state.cloud.client) {
    showToast("Add Supabase env vars in Vercel first.");
    return;
  }

  const credentials = readLoginCredentials(options.source);
  if (!credentials) return;

  const { email, password } = credentials;
  const shouldCreateUser = options.shouldCreateUser === true;
  setLoginFields(email, password);

  const authCall = shouldCreateUser
    ? state.cloud.client.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: email }
        }
      })
    : state.cloud.client.auth.signInWithPassword({ email, password });

  const { data, error } = await authCall;

  if (error) {
    state.cloud.lastError = error.message;
    renderCloudPanel();
    showToast(shouldCreateUser && /already|registered|exists/i.test(error.message || "")
      ? "That email exists. Send a password reset instead."
      : shouldCreateUser ? "Could not create that account." : "Could not log in.");
    return;
  }

  if (data?.session) {
    await handleCloudSession(data.session, true);
    showToast(shouldCreateUser ? "Account created." : "Logged in.");
    return;
  }

  state.cloud.lastError = "Password login is waiting for email confirmation. Turn off Confirm email in Supabase Auth settings.";
  renderCloudPanel();
  showToast("Turn off email confirmation in Supabase Auth settings.");
}

async function sendPasswordReset() {
  if (!state.cloud.client) {
    showToast("Add Supabase env vars in Vercel first.");
    return;
  }

  const email = normalizeEmail(el.authUsername.value);
  if (!email) {
    showToast("Enter your email first.");
    el.authUsername.focus();
    return;
  }

  const { error } = await state.cloud.client.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${window.location.pathname}`
  });

  if (error) {
    state.cloud.lastError = error.message;
    renderAuthGate();
    showToast("Could not send reset email.");
    return;
  }

  state.cloud.lastError = `Password reset sent to ${email}. Open that email link, then set a new password here.`;
  renderAuthGate();
  showToast("Password reset email sent.");
}

function startPasswordRecovery(session) {
  state.cloud.session = session || null;
  state.cloud.user = session?.user || null;
  state.cloud.recoveryMode = true;
  state.cloud.lastError = "";
  renderCloudPanel();
  renderAuthGate();
  el.authPassword.value = "";
  el.authPassword.focus();
}

async function updateCloudPassword() {
  const password = el.authPassword.value;
  if (password.length < 6) {
    showToast("Use a password with at least 6 characters.");
    el.authPassword.focus();
    return;
  }

  const { data, error } = await state.cloud.client.auth.updateUser({ password });
  if (error) {
    state.cloud.lastError = error.message;
    renderAuthGate();
    showToast("Could not update password.");
    return;
  }

  state.cloud.recoveryMode = false;
  await handleCloudSession(data?.user ? { ...state.cloud.session, user: data.user } : state.cloud.session, true);
  showToast("Password updated.");
}

function readLoginCredentials(source = "") {
  const emailField = source === "cloud" ? el.cloudUsername : el.authUsername;
  const passwordField = source === "cloud" ? el.cloudPassword : el.authPassword;
  const email = normalizeEmail(emailField.value);
  const password = passwordField.value;

  if (!email) {
    showToast("Enter a valid email first.");
    emailField.focus();
    return null;
  }
  if (password.length < 6) {
    showToast("Use a password with at least 6 characters.");
    passwordField.focus();
    return null;
  }

  return {
    username: email,
    password,
    email
  };
}

function setLoginFields(email, password) {
  el.authUsername.value = email;
  el.cloudUsername.value = email;
  el.authPassword.value = password;
  el.cloudPassword.value = password;
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function displayUserName(user) {
  return user?.email || "Not connected";
}

async function signOutOfCloud() {
  if (!state.cloud.client) return;
  await state.cloud.client.auth.signOut();
  state.cloud.session = null;
  state.cloud.user = null;
  state.cloud.recoveryMode = false;
  renderCloudPanel();
  showToast("Signed out.");
}

async function loadCloudTrips() {
  if (!state.cloud.client || !state.cloud.user) return;

  let { data, error } = await state.cloud.client
    .from("trips")
    .select("id,name,share_code,updated_at,archived_at")
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error && /archived_at/i.test(error.message || "")) {
    state.cloud.lastError = "Run migrate-archive-trips.sql in Supabase.";
    renderCloudPanel();
    return;
  }

  if (error) {
    setCloudError(error);
    return;
  }

  state.cloud.trips = data || [];
  renderCloudPanel();

  if (!data?.length) {
    renderCloudPanel();
    showToast("Signed in. Use Sync now to save this trip to the cloud.");
    return;
  }

  const preferred = state.trip.cloudId && data.some((trip) => trip.id === state.trip.cloudId)
    ? state.trip.cloudId
    : data[0].id;
  await loadCloudTripById(preferred);
}

async function loadCloudTripById(tripId) {
  if (!state.cloud.client || !state.cloud.user) return;

  state.cloud.syncing = true;
  renderCloudPanel();
  const client = state.cloud.client;
  const tripQuery = client.from("trips").select("*").eq("id", tripId);
  const [{ data: trip, error: tripError }, { data: stops, error: stopsError }, { data: attachments, error: attachmentsError }] =
    await Promise.all([
      singleOrNull(tripQuery),
      client.from("stops").select("*").eq("trip_id", tripId).order("starts_at_utc", { ascending: true }),
      client.from("attachments").select("*").eq("trip_id", tripId)
    ]);

  if (tripError || stopsError || attachmentsError) {
    state.cloud.syncing = false;
    setCloudError(tripError || stopsError || attachmentsError);
    return;
  }

  if (!trip) {
    state.cloud.syncing = false;
    state.cloud.trips = state.cloud.trips.filter((cloudTrip) => cloudTrip.id !== tripId);
    setCloudError(new Error("That cloud trip was not found. It may have been deleted or archived."));
    return;
  }

  const signedAttachments = await withSignedAttachmentUrls(attachments || []);
  const matchingLocalTrip = state.trips.find((localTrip) => localTrip.cloudId === trip.id);
  const cloudTrip = cloudRowsToTrip(trip, stops || [], signedAttachments);
  if (matchingLocalTrip) {
    cloudTrip.localId = matchingLocalTrip.localId;
    cloudTrip.calendarMode = matchingLocalTrip.calendarMode;
  }

  state.cloud.suppressSave = true;
  state.trip = normalizeTrip(cloudTrip);
  state.activeDay = null;
  persistLocalTrip();
  state.cloud.suppressSave = false;
  state.cloud.syncing = false;
  state.cloud.lastSavedAt = new Date();
  setInitialFormValues();
  render();
  showToast("Cloud trip loaded.");
}

function cloudRowsToTrip(trip, stops, attachments) {
  const grouped = new Map();
  attachments.forEach((attachment) => {
    if (!grouped.has(attachment.stop_id)) grouped.set(attachment.stop_id, []);
    grouped.get(attachment.stop_id).push({
      id: attachment.id,
      name: attachment.name,
      type: attachment.mime_type,
      size: Number(attachment.size_bytes || 0),
      storagePath: attachment.storage_path,
      signedUrl: attachment.signedUrl || ""
    });
  });

  return {
    name: trip.name,
    cloudId: trip.id,
    cloudOwnerId: trip.owner_user_id,
    shareCode: trip.share_code,
    archivedAt: trip.archived_at || "",
    originZone: trip.origin_zone,
    destinationZone: trip.destination_zone,
    activeView: trip.active_view,
    timeLens: trip.time_lens,
    selectedId: trip.selected_stop_id,
    stops: stops.map((stop) => {
      const dateTime = stop.local_date && stop.local_time
        ? { date: stop.local_date, time: stop.local_time.slice(0, 5) }
        : formatParts(new Date(stop.starts_at_utc), stop.source_timezone);
      const endParts = stop.local_end_date && stop.local_end_time
        ? { date: stop.local_end_date, time: stop.local_end_time.slice(0, 5) }
        : stop.ends_at_utc
          ? formatParts(new Date(stop.ends_at_utc), stop.source_timezone)
          : inferEndDateTime(dateTime.date, dateTime.time, stop.source_timezone, Number(stop.duration_minutes || 90));
      return {
        id: stop.id,
        title: stop.title,
        location: stop.location || "",
        type: stop.stop_type,
        startDate: dateTime.date,
        startTime: dateTime.time,
        endDate: endParts.date,
        endTime: endParts.time,
        date: dateTime.date,
        time: dateTime.time,
        zone: stop.source_timezone,
        notes: stop.notes || "",
        attachments: grouped.get(stop.id) || []
      };
    })
  };
}

async function withSignedAttachmentUrls(attachments) {
  if (!attachments.length || !state.cloud.client) return attachments;
  const results = await Promise.all(
    attachments.map(async (attachment) => {
      const { data } = await state.cloud.client.storage
        .from(state.cloud.bucket)
        .createSignedUrl(attachment.storage_path, 60 * 60);
      return {
        ...attachment,
        signedUrl: data?.signedUrl || ""
      };
    })
  );
  return results;
}

function scheduleCloudSave() {
  if (state.cloud.suppressSave || !state.cloud.client || !state.cloud.user) return;
  clearTimeout(state.cloud.saveTimer);
  state.cloud.saveTimer = setTimeout(() => {
    saveCloudSnapshot();
  }, 900);
}

async function syncCloudNow() {
  await saveCloudSnapshot({ forceCreate: true, showDone: true });
}

async function saveCloudSnapshot(options = {}) {
  if (!state.cloud.client || !state.cloud.user || state.cloud.syncing) return;

  state.cloud.syncing = true;
  state.cloud.lastError = "";
  renderCloudPanel();

  try {
    const isNewTrip = !state.trip.cloudId || !state.trip.cloudOwnerId;
    const cloudId = state.trip.cloudId || createId();
    state.trip.cloudId = cloudId;
    if (!state.trip.shareCode) state.trip.shareCode = createShareCode();

    await upsertCloudTrip(isNewTrip);
    await syncCloudStops();
    await updateCloudSelectedStop();
    await syncCloudAttachments();

    state.cloud.lastSavedAt = new Date();
    upsertCloudTripSummary();
    persistLocalTrip();
    render();
    if (options.showDone || isNewTrip) showToast("Trip synced to cloud.");
  } catch (error) {
    setCloudError(error);
  } finally {
    state.cloud.syncing = false;
    renderCloudPanel();
  }
}

function upsertCloudTripSummary() {
  if (!state.trip.cloudId) return;
  const summary = {
    id: state.trip.cloudId,
    name: state.trip.name,
    share_code: state.trip.shareCode,
    updated_at: new Date().toISOString()
  };
  const index = state.cloud.trips.findIndex((trip) => trip.id === summary.id);
  if (index >= 0) state.cloud.trips[index] = summary;
  else state.cloud.trips.unshift(summary);
}

async function upsertCloudTrip(isNewTrip) {
  const tripFields = {
    name: state.trip.name,
    origin_zone: state.trip.originZone,
    destination_zone: state.trip.destinationZone,
    active_view: state.trip.activeView,
    time_lens: state.trip.timeLens,
    selected_stop_id: null,
    share_code: state.trip.shareCode,
    share_enabled: true
  };

  let data;
  if (isNewTrip) {
    data = await createOwnedCloudTrip(tripFields);
  } else {
    try {
      data = await createOwnedCloudTrip(tripFields);
    } catch (error) {
      if (!isCloudTripAccessError(error)) throw error;
      data = null;
    }

    if (!data) {
      const staleCloudId = state.trip.cloudId;
      const wasDifferentOwner = state.trip.cloudOwnerId && state.trip.cloudOwnerId !== state.cloud.user.id;
      state.trip.cloudId = createId();
      state.trip.cloudOwnerId = null;
      state.trip.shareCode = createShareCode();
      resetAttachmentStorageForCloudCopy(staleCloudId);
      data = await createOwnedCloudTrip({
        ...tripFields,
        share_code: state.trip.shareCode
      });
      state.cloud.trips = state.cloud.trips.filter((trip) => trip.id !== staleCloudId);
      showToast(wasDifferentOwner
        ? "Saved this local trip as a new cloud copy for this account."
        : "Reconnected this trip to cloud sync.");
    }
  }

  state.trip.cloudOwnerId = data.owner_user_id;
  state.trip.shareCode = data.share_code;

}

function resetAttachmentStorageForCloudCopy(staleCloudId) {
  if (!staleCloudId) return;
  state.trip.stops.forEach((stop) => {
    stop.attachments.forEach((attachment) => {
      if (attachment.storagePath?.includes(`/${staleCloudId}/`)) {
        attachment.storagePath = "";
      }
    });
  });
}

function isCloudTripAccessError(error) {
  const message = error?.message || "";
  return /Trip not found for this account/i.test(message) || /row-level security/i.test(message);
}

async function createOwnedCloudTrip(tripFields) {
  const { data, error } = await state.cloud.client.rpc("upsert_owned_trip", {
    p_trip_id: state.trip.cloudId,
    p_name: tripFields.name,
    p_origin_zone: tripFields.origin_zone,
    p_destination_zone: tripFields.destination_zone,
    p_active_view: tripFields.active_view,
    p_time_lens: tripFields.time_lens,
    p_share_code: tripFields.share_code
  });

  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

async function singleOrNull(query) {
  if (typeof query.maybeSingle === "function") {
    return query.maybeSingle();
  }

  const result = await query.single();
  if (isMissingSingleRowError(result.error)) {
    return { data: null, error: null };
  }
  return result;
}

function isMissingSingleRowError(error) {
  const message = error?.message || "";
  return error?.code === "PGRST116" || /Cannot coerce the result to a single JSON object/i.test(message);
}

async function updateCloudSelectedStop() {
  const selectedStopId = state.trip.stops.some((stop) => stop.id === state.trip.selectedId) && isUuid(state.trip.selectedId)
    ? state.trip.selectedId
    : null;

  const { error } = await state.cloud.client
    .from("trips")
    .update({ selected_stop_id: selectedStopId })
    .eq("id", state.trip.cloudId);

  if (error) throw error;
}

async function syncCloudStops() {
  const stops = sortedStops();
  const rows = stops.map((stop, index) => ({
    id: stop.id,
    trip_id: state.trip.cloudId,
    title: stop.title,
    location: stop.location || "",
    stop_type: stop.type,
    starts_at_utc: toUtc(stop).toISOString(),
    ends_at_utc: toEndUtc(stop).toISOString(),
    source_timezone: stop.zone,
    local_start_date: stop.startDate,
    local_start_time: stop.startTime,
    local_end_date: stop.endDate,
    local_end_time: stop.endTime,
    notes: stop.notes || "",
    position: index
  }));

  if (rows.length) {
    const { error } = await state.cloud.client.from("stops").upsert(rows);
    if (error) throw error;
  }

  const keepIds = rows.map((row) => row.id);
  let deleteQuery = state.cloud.client.from("stops").delete().eq("trip_id", state.trip.cloudId);
  if (keepIds.length) deleteQuery = deleteQuery.not("id", "in", `(${keepIds.join(",")})`);
  const { error: deleteError } = await deleteQuery;
  if (deleteError) throw deleteError;
}

async function syncCloudAttachments() {
  const attachments = [];
  for (const stop of state.trip.stops) {
    for (const attachment of stop.attachments) {
      if (!attachment.storagePath) {
        await uploadAttachmentFile(stop, attachment);
      }
      attachments.push({
        id: attachment.id,
        trip_id: state.trip.cloudId,
        stop_id: stop.id,
        created_by: state.cloud.user.id,
        name: attachment.name,
        mime_type: attachment.type || "application/octet-stream",
        size_bytes: Number(attachment.size || 0),
        storage_path: attachment.storagePath
      });
    }
  }

  if (attachments.length) {
    const { error } = await state.cloud.client.from("attachments").upsert(attachments);
    if (error) throw error;
  }

  const keepIds = attachments.map((attachment) => attachment.id);
  let deleteQuery = state.cloud.client.from("attachments").delete().eq("trip_id", state.trip.cloudId);
  if (keepIds.length) deleteQuery = deleteQuery.not("id", "in", `(${keepIds.join(",")})`);
  const { error: deleteError } = await deleteQuery;
  if (deleteError) throw deleteError;
}

async function uploadAttachmentFile(stop, attachment) {
  const source = await attachmentUploadSource(attachment);
  if (!source) {
    throw new Error(`Missing file data for ${attachment.name}`);
  }

  const path = [
    state.cloud.user.id,
    state.trip.cloudId,
    stop.id,
    `${attachment.id}-${safeFileName(attachment.name)}`
  ].join("/");

  const { error } = await state.cloud.client.storage
    .from(state.cloud.bucket)
    .upload(path, source, {
      contentType: attachment.type || "application/octet-stream",
      upsert: true
    });

  if (error) throw error;

  attachment.storagePath = path;
  attachment.dataUrl = attachment.type?.startsWith("image/") ? attachment.dataUrl : "";
  const { data } = await state.cloud.client.storage.from(state.cloud.bucket).createSignedUrl(path, 60 * 60);
  attachment.signedUrl = data?.signedUrl || "";
}

async function attachmentUploadSource(attachment) {
  if (attachment.file) return attachment.file;
  if (attachment.dataUrl) return dataUrlToBlob(attachment.dataUrl);
  if (!attachment.signedUrl) return null;

  try {
    const response = await fetch(attachment.signedUrl);
    if (!response.ok) return null;
    return response.blob();
  } catch (error) {
    console.warn("Unable to fetch signed attachment for re-upload", error);
    return null;
  }
}

async function joinTripByCode(code = el.joinTripCode.value, options = {}) {
  if (!state.cloud.client || !state.cloud.user) {
    showToast("Sign in before joining a trip.");
    return;
  }

  const shareCode = String(code || "").trim().toUpperCase();
  if (!shareCode) {
    showToast("Enter a trip code first.");
    return;
  }

  state.cloud.syncing = true;
  renderCloudPanel();
  const { data, error } = await state.cloud.client.rpc("join_trip_by_code", {
    p_share_code: shareCode
  });

  if (error) {
    state.cloud.syncing = false;
    setCloudError(error);
    showToast("That trip code did not work.");
    return;
  }

  el.joinTripCode.value = "";
  await loadCloudTripById(data);
  if (!options.silent) showToast("Joined shared trip.");
}

async function ensureCloudShare() {
  if (!state.cloud.client || !state.cloud.user) return false;
  if (!state.trip.cloudId) {
    await saveCloudSnapshot({ forceCreate: true });
  }
  if (!state.trip.shareCode) {
    state.trip.shareCode = createShareCode();
    await saveCloudSnapshot();
  }
  return Boolean(state.trip.shareCode);
}

function setCloudError(error) {
  const message = error?.message || String(error || "Cloud error");
  state.cloud.lastError = /location/i.test(message) && /stops/i.test(message)
    ? "Run migrate-stop-location.sql in Supabase."
    : message;
  state.cloud.syncing = false;
  renderCloudPanel();
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
  const busyHours = Math.round(stops.reduce((sum, stop) => sum + stopDurationMinutes(stop), 0) / 60);

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
      <div class="stop-card ${selected ? "selected" : ""}" role="button" tabindex="0" data-action="select" data-id="${stop.id}" aria-label="Select ${escapeAttribute(stop.title)}">
        <div class="stop-card-header">
          <h3>${escapeHtml(stop.title)}</h3>
          <span class="type-chip" style="background:${meta.color}">${meta.label}</span>
        </div>
        ${stop.location ? `<p class="stop-location">${escapeHtml(stop.location)}</p>` : ""}
        ${stop.notes ? `<p>${escapeHtml(stop.notes)}</p>` : ""}
        <div class="stop-card-actions">
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

  const mode = state.trip.calendarMode || "week";
  const referenceIso = calendarReferenceIso();
  const visibleDays = calendarVisibleDays(mode, referenceIso);
  const title = calendarRangeLabel(mode, referenceIso, visibleDays);
  const body = mode === "month"
    ? renderMonthCalendar(referenceIso)
    : renderCalendarTimeGrid(visibleDays);

  el.calendarView.innerHTML = `
    <div class="calendar-toolbar">
      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>${modeLabel(mode)}</span>
      </div>
      <div class="calendar-toolbar-actions">
        <div class="calendar-range-fields">
          <label>
            <span>Start</span>
            <input type="date" data-calendar-range="start" value="${escapeAttribute(rangeStartForInput(referenceIso))}" />
          </label>
          <label>
            <span>End</span>
            <input type="date" data-calendar-range="end" value="${escapeAttribute(rangeEndForInput(referenceIso))}" />
          </label>
        </div>
        <div class="segmented compact-segmented" aria-label="Calendar range">
          <button class="${mode === "month" ? "active" : ""}" type="button" data-calendar-mode="month">Month</button>
          <button class="${mode === "week" ? "active" : ""}" type="button" data-calendar-mode="week">Week</button>
          <button class="${mode === "day" ? "active" : ""}" type="button" data-calendar-mode="day">Day</button>
          <button class="${mode === "range" ? "active" : ""}" type="button" data-calendar-mode="range">Range</button>
        </div>
      </div>
    </div>
    ${body}
  `;
}

function renderCalendarTimeGrid(days) {
  const hours = calendarHours(days);
  return `
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
      ${stop.location ? `<small>${escapeHtml(stop.location)}</small>` : ""}
      <span>${formatTimeForZone(toUtc(stop), state.trip.destinationZone)}-${formatTimeForZone(toEndUtc(stop), state.trip.destinationZone)} - ${meta.label}</span>
    </button>
  `;
}

function renderMonthCalendar(referenceIso) {
  const days = monthDays(referenceIso);
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `
    <div class="month-calendar" style="--month-cells:${days.length}">
      ${weekdayLabels.map((label) => `<div class="month-weekday">${label}</div>`).join("")}
      ${days.map((day) => renderMonthCell(day)).join("")}
    </div>
  `;
}

function renderMonthCell(day) {
  if (!day) return `<div class="month-cell muted" aria-hidden="true"></div>`;
  const stops = stopsForDestinationDay(day.iso);
  return `
    <button class="month-cell ${day.iso === state.activeDay ? "active" : ""}" type="button" data-calendar-day="${day.iso}">
      <strong>${day.dayNumber}</strong>
      <span>${day.weekday}</span>
      <div class="month-events">
        ${stops.slice(0, 3).map((stop) => {
          const meta = typeMeta[stop.type];
          return `<em style="border-color:${meta.color}">${escapeHtml(stop.title)}</em>`;
        }).join("")}
        ${stops.length > 3 ? `<small>+${stops.length - 3} more</small>` : ""}
      </div>
    </button>
  `;
}

function calendarReferenceIso() {
  const days = tripDays();
  if (state.activeDay && days.some((day) => day.iso === state.activeDay)) return state.activeDay;
  return days[0]?.iso || todayIso();
}

function calendarVisibleDays(mode, referenceIso) {
  if (mode === "day") return [dayInfo(referenceIso)];
  if (mode === "range") {
    ensureCalendarRange(referenceIso);
    return dateRangeDays(state.trip.calendarRangeStart, state.trip.calendarRangeEnd);
  }
  return weekDays(referenceIso);
}

function ensureCalendarRange(referenceIso = calendarReferenceIso()) {
  if (!state.trip.calendarRangeStart) state.trip.calendarRangeStart = referenceIso;
  if (!state.trip.calendarRangeEnd) state.trip.calendarRangeEnd = addDaysIso(state.trip.calendarRangeStart, 3);
  if (state.trip.calendarRangeEnd < state.trip.calendarRangeStart) {
    state.trip.calendarRangeEnd = state.trip.calendarRangeStart;
  }
}

function updateCalendarRange(kind, value) {
  if (!isIsoDate(value)) return;
  if (kind === "start") state.trip.calendarRangeStart = value;
  if (kind === "end") state.trip.calendarRangeEnd = value;
  ensureCalendarRange(value);
  state.trip.calendarMode = "range";
  state.activeDay = state.trip.calendarRangeStart;
  saveTrip();
  render();
}

function rangeStartForInput(referenceIso) {
  return state.trip.calendarRangeStart || referenceIso;
}

function rangeEndForInput(referenceIso) {
  return state.trip.calendarRangeEnd || addDaysIso(referenceIso, 3);
}

function dateRangeDays(startIso, endIso) {
  const days = [];
  let cursor = startIso;
  let guard = 0;
  while (cursor <= endIso && guard < 31) {
    days.push(dayInfo(cursor));
    cursor = addDaysIso(cursor, 1);
    guard += 1;
  }
  return days.length ? days : [dayInfo(startIso || todayIso())];
}

function calendarRangeLabel(mode, referenceIso, visibleDays = []) {
  if (mode === "day") {
    return dayInfo(referenceIso).monthDay;
  }
  if (mode === "range") {
    const first = visibleDays[0] || dayInfo(rangeStartForInput(referenceIso));
    const last = visibleDays[visibleDays.length - 1] || first;
    return first.iso === last.iso ? first.monthDay : `${first.monthDay} - ${last.monthDay}`;
  }
  const date = isoToUtcDate(referenceIso);
  if (mode === "month") {
    return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  }
  const days = weekDays(referenceIso);
  return `${days[0].monthDay} - ${days[days.length - 1].monthDay}`;
}

function modeLabel(mode) {
  if (mode === "month") return "Month overview";
  if (mode === "day") return "Single-day schedule";
  if (mode === "range") return "Custom range";
  return "Week schedule";
}

function renderBoard() {
  const stops = sortedStops();
  if (!stops.length) {
    el.boardView.innerHTML = emptyState("No trip board yet", "Add stops to create the visual route.");
    return;
  }

  el.boardView.innerHTML = `
    <div class="board-grid">
      ${renderTripMapPanel(stops)}
      <div class="route-list-panel" aria-label="Trip places">
        <div class="board-panel-heading">
          <div>
            <h3>Timeline pins</h3>
            <p>Click a stop to select it. Addresses are used when available.</p>
          </div>
          <button class="ghost-button" type="button" data-action="open-maps">Open Google Maps list</button>
        </div>
        <ol class="place-list">
          ${stops.map((stop, index) => renderPlaceListItem(stop, index)).join("")}
        </ol>
      </div>
      <div class="board-panel">
        <h3>Daily load</h3>
        <div class="day-loads">${dayLoadRows()}</div>
      </div>
    </div>
  `;
}

function renderTripMapPanel(stops) {
  const mappedStops = stops.filter((stop) => stop.location?.trim());
  const selected = selectedStop();
  const mapStop = selected?.location ? selected : mappedStops[0];
  return `
    <div class="route-map trip-map-panel" aria-label="Trip map">
      <div class="board-panel-heading">
        <div>
          <h3>Map</h3>
          <p>${mappedStops.length ? `${mappedStops.length} pinned ${mappedStops.length === 1 ? "place" : "places"}` : "Add locations to pin places."}</p>
        </div>
        <button class="ghost-button" type="button" data-action="open-maps">Open Google Maps list</button>
      </div>
      <div class="map-schematic">${routeSvg(stops)}</div>
      ${mapStop ? `
        <iframe
          class="map-frame"
          title="Map preview for ${escapeAttribute(mapStop.title)}"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          src="${escapeAttribute(googleMapsEmbedUrl(mapStop))}">
        </iframe>
      ` : ""}
      <div class="map-pin-strip">
        ${mappedStops.length
          ? mappedStops.map((stop, index) => renderMapPin(stop, index)).join("")
          : `<span>No address pins yet</span>`}
      </div>
    </div>
  `;
}

function renderMapPin(stop, index) {
  const meta = typeMeta[stop.type];
  const selected = stop.id === state.trip.selectedId;
  return `
    <button class="map-pin ${selected ? "active" : ""}" type="button" data-action="select" data-id="${stop.id}">
      <span style="background:${meta.color}">${index + 1}</span>
      <strong>${escapeHtml(stop.title)}</strong>
    </button>
  `;
}

function renderPlaceListItem(stop, index) {
  const meta = typeMeta[stop.type];
  return `
    <li class="place-item" role="button" tabindex="0" data-action="select" data-id="${stop.id}" aria-label="Select ${escapeAttribute(stop.title)}">
      <span class="place-number" style="background:${meta.color}">${index + 1}</span>
      <div>
        <strong>${escapeHtml(stop.title)}</strong>
        ${stop.location ? `<em>${escapeHtml(stop.location)}</em>` : ""}
        <span>${formatDateTimeForZone(toUtc(stop), state.trip.destinationZone)} - ${durationLabel(stopDurationMinutes(stop))}</span>
      </div>
    </li>
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
  const stopZone = stop.zone || state.trip.destinationZone;
  el.selectedCard.innerHTML = `
    <div class="stop-card-header">
      <h2>${escapeHtml(stop.title)}</h2>
      <span class="type-chip" style="background:${meta.color}">${meta.label}</span>
    </div>
    ${stop.location ? `<p class="selected-location">${escapeHtml(stop.location)}</p>` : ""}
    <div class="selected-meta">
      <div><span>${escapeHtml(zoneLabel(stopZone))}</span><strong>${formatDateTimeForZone(toUtc(stop), stopZone)}</strong></div>
      <div><span>Length</span><strong>${durationLabel(stopDurationMinutes(stop))}</strong></div>
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
    const hours = stops.reduce((sum, stop) => sum + stopDurationMinutes(stop), 0) / 60;
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
            const kind = hit?.type === "flight" || hit?.type === "drive"
              ? "travel"
              : hit?.type === "sight"
                ? "sight"
                : hit?.type === "waiting"
                  ? "waiting"
                  : hit
                    ? "busy"
                    : "";
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
  const selectedZone = selected ? (selected.zone || state.trip.destinationZone) : state.trip.destinationZone;
  const notes = [
    `Timeline times use the time zone assigned to each stop.`,
    selected ? `${selected.title} is scheduled as ${formatDateTimeForZone(toUtc(selected), selectedZone)} in ${zoneLabel(selectedZone)}.` : `Current offset: ${delta}.`,
    firstFlight ? `Flight arrivals can land on a different calendar date than departure when time zones shift.` : `Add your flight first to anchor any date shift.`
  ];
  el.timeNotes.innerHTML = notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("");
}

function renderDraftAttachments() {
  el.draftAttachments.innerHTML = state.draftAttachments.length
    ? state.draftAttachments.map((attachment, index) => renderAttachment(attachment, true, "", index)).join("")
    : "";
}

function openStopModal() {
  el.stopModal.hidden = false;
  document.body.classList.add("modal-open");
  window.setTimeout(() => el.stopTitle.focus(), 0);
}

function closeStopModal(shouldReset = true) {
  if (shouldReset) {
    resetForm(false);
  }
  el.stopModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function renderAttachment(attachment, removable, stopTitle = "", index = null) {
  const fileUrl = attachment.dataUrl || attachment.signedUrl || attachment.publicUrl || "";
  const isImage = attachment.type?.startsWith("image/") && fileUrl;
  const thumb = isImage
    ? `<img src="${fileUrl}" alt="">`
    : `<span>${fileInitial(attachment.name)}</span>`;
  const action = removable
    ? `<button class="tiny-remove" type="button" data-action="remove-draft-attachment" data-index="${index}" aria-label="Remove ${escapeHtml(attachment.name)}">x</button>`
    : fileUrl
      ? `<a class="tiny-remove" href="${fileUrl}" download="${escapeAttribute(attachment.name)}" aria-label="Download ${escapeHtml(attachment.name)}">DL</a>`
      : "";

  return `
    <div class="${removable ? "attachment-item" : "gallery-item"}">
      <div class="${removable ? "attachment-thumb" : "gallery-thumb"}">${thumb}</div>
      <div>
        <strong>${escapeHtml(attachment.name)}</strong>
        <span>${stopTitle ? `${escapeHtml(stopTitle)} - ` : ""}${formatBytes(attachment.size || 0)}</span>
      </div>
      ${action}
    </div>
  `;
}

function saveStopFromForm() {
  const title = el.stopTitle.value.trim();
  if (!title) {
    showToast("Add a name before saving.");
    return;
  }
  const start = zonedTimeToUtc(el.stopDate.value, el.stopTime.value, el.stopZone.value);
  const end = zonedTimeToUtc(el.stopEndDate.value, el.stopEndTime.value, el.stopZone.value);
  if (end <= start) {
    showToast("End time must be after start time.");
    return;
  }

  const existing = state.editingId ? state.trip.stops.find((stop) => stop.id === state.editingId) : null;
  const stop = {
    id: existing?.id || createId(),
    title,
    location: el.stopLocation.value.trim(),
    type: el.stopType.value,
    startDate: el.stopDate.value,
    startTime: el.stopTime.value,
    endDate: el.stopEndDate.value,
    endTime: el.stopEndTime.value,
    date: el.stopDate.value,
    time: el.stopTime.value,
    zone: el.stopZone.value,
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
  closeStopModal(false);
}

function resetForm(showMessage = true) {
  state.editingId = null;
  state.draftAttachments = [];
  el.formTitle.textContent = "Add stop";
  el.saveStopButton.querySelector("span").textContent = "Save stop";
  el.stopTitle.value = "";
  el.stopLocation.value = "";
  el.stopDate.value = nextStopDate();
  el.stopTime.value = "09:00";
  const end = inferEndDateTime(el.stopDate.value, el.stopTime.value, state.trip.destinationZone, 90);
  el.stopEndDate.value = end.date;
  el.stopEndTime.value = end.time;
  el.stopType.value = "sight";
  el.stopZone.value = state.trip.destinationZone;
  el.stopNotes.value = "";
  el.stopAttachments.value = "";
  renderDraftAttachments();
  renderStopLengthPreview();
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
  el.stopLocation.value = stop.location || "";
  el.stopDate.value = stop.startDate;
  el.stopTime.value = stop.startTime;
  el.stopEndDate.value = stop.endDate;
  el.stopEndTime.value = stop.endTime;
  el.stopType.value = stop.type;
  el.stopZone.value = stop.zone;
  el.stopNotes.value = stop.notes;
  el.stopAttachments.value = "";
  renderStopLengthPreview();
  saveTrip();
  render();
  openStopModal();
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
  const name = window.prompt("Trip name", "New Trip");
  if (name === null) return;
  upsertActiveTripInStore();
  state.trip = normalizeTrip({
    name: name.trim() || "New Trip",
    originZone: state.trip.originZone,
    destinationZone: state.trip.destinationZone,
    activeView: "timeline",
    timeLens: "both",
    selectedId: null,
    stops: []
  });
  state.trips.push(state.trip);
  state.activeDay = null;
  persistLocalTrip();
  setInitialFormValues();
  render();
  showToast("New trip ready.");
}

async function switchTrip(value) {
  const [kind, id] = String(value || "").split(":");
  if (!kind || !id) return;
  upsertActiveTripInStore();

  if (kind === "cloud") {
    await loadCloudTripById(id);
    return;
  }

  const nextTrip = state.trips.find((trip) => trip.localId === id);
  if (!nextTrip) return;

  state.trip = normalizeTrip(nextTrip);
  state.activeDay = null;
  state.editingId = null;
  state.draftAttachments = [];
  persistLocalTrip();
  setInitialFormValues();
  render();
  showToast("Trip switched.");
}

async function archiveActiveTrip() {
  const ok = window.confirm(`Archive "${state.trip.name}"? It will be hidden from your active trip list.`);
  if (!ok) return;

  const archivedAt = new Date().toISOString();
  if (state.cloud.client && state.cloud.user && state.trip.cloudId) {
    state.cloud.syncing = true;
    state.cloud.lastError = "";
    renderCloudPanel();
    const { error } = await state.cloud.client
      .from("trips")
      .update({ archived_at: archivedAt, share_enabled: false })
      .eq("id", state.trip.cloudId);
    state.cloud.syncing = false;

    if (error) {
      if (/archived_at/i.test(error.message || "")) {
        state.cloud.lastError = "Run migrate-archive-trips.sql in Supabase.";
      } else {
        setCloudError(error);
      }
      renderCloudPanel();
      showToast("Trip could not be archived.");
      return;
    }

    state.cloud.trips = state.cloud.trips.filter((trip) => trip.id !== state.trip.cloudId);
  }

  const localTrip = state.trips.find((trip) => trip.localId === state.trip.localId);
  if (localTrip) localTrip.archivedAt = archivedAt;
  state.trip.archivedAt = archivedAt;
  activateNextTrip("Trip archived.");
}

async function deleteActiveTrip() {
  const ok = window.confirm(`Delete "${state.trip.name}"? This removes it from this planner${state.trip.cloudId ? " and attempts to delete the cloud trip" : ""}.`);
  if (!ok) return;

  if (state.cloud.client && state.cloud.user && state.trip.cloudId) {
    state.cloud.syncing = true;
    state.cloud.lastError = "";
    renderCloudPanel();
    const { error } = await state.cloud.client
      .from("trips")
      .delete()
      .eq("id", state.trip.cloudId);
    state.cloud.syncing = false;

    if (error) {
      setCloudError(error);
      renderCloudPanel();
      showToast("Only the owner can delete a cloud trip.");
      return;
    }

    state.cloud.trips = state.cloud.trips.filter((trip) => trip.id !== state.trip.cloudId);
  }

  state.trips = state.trips.filter((trip) => trip.localId !== state.trip.localId);
  activateNextTrip("Trip deleted.");
}

function activateNextTrip(message) {
  const nextTrip = state.trips.find((trip) => !trip.archivedAt);
  if (nextTrip) {
    state.trip = normalizeTrip(nextTrip);
  } else {
    state.trip = createBlankTrip();
    state.trips.push(state.trip);
  }
  state.activeDay = null;
  state.editingId = null;
  state.draftAttachments = [];
  persistLocalTrip();
  setInitialFormValues();
  render();
  showToast(message);
}

function readFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  const maxSize = state.cloud.user ? 25 * 1024 * 1024 : 1.8 * 1024 * 1024;
  const readers = files.map((file) => {
    if (file.size > maxSize) {
      showToast(`${file.name} is too large for ${state.cloud.user ? "cloud upload" : "browser storage"}.`);
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      const attachment = {
        id: createId(),
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        dataUrl: "",
        signedUrl: "",
        storagePath: ""
      };
      Object.defineProperty(attachment, "file", {
        value: file,
        enumerable: false
      });

      if (state.cloud.user && !file.type.startsWith("image/")) {
        resolve(attachment);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        attachment.dataUrl = reader.result;
        resolve(attachment);
      };
      reader.onerror = () => resolve(attachment);
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
    "PRODID:-//Itinerary Studio//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH"
  ];

  sortedStops().forEach((stop) => {
    const start = toUtc(stop);
    const end = toEndUtc(stop);
    lines.push(...[
      "BEGIN:VEVENT",
      `UID:${stop.id}@iceland-itinerary-studio`,
      `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${icsText(stop.title)}`,
      stop.location ? `LOCATION:${icsText(stop.location)}` : "",
      `DESCRIPTION:${icsText(`${stop.notes || ""}\\n${zoneLabel(state.trip.destinationZone)}: ${formatDateTimeForZone(start, state.trip.destinationZone)}\\n${zoneLabel(state.trip.originZone)}: ${formatDateTimeForZone(start, state.trip.originZone)}`)}`,
      "END:VEVENT"
    ].filter(Boolean));
  });

  lines.push("END:VCALENDAR");
  downloadFile(`${slugify(state.trip.name)}.ics`, lines.join("\r\n"), "text/calendar");
  showToast("Calendar downloaded.");
}

async function shareTrip() {
  if (state.cloud.client && state.cloud.user) {
    const ready = await ensureCloudShare();
    if (ready) {
      const url = `${window.location.origin}${window.location.pathname}#join=${state.trip.shareCode}`;
      copyText(url, "Cloud share link copied.");
      renderCloudPanel();
    }
    return;
  }

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

  copyText(url, "Share link copied without file data.");
}

function showSharePrompt(url) {
  window.prompt("Copy share link", url);
  showToast("Share link ready.");
}

function copyText(text, successMessage) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(
      () => showToast(successMessage),
      () => showSharePrompt(text)
    );
  } else {
    showSharePrompt(text);
  }
}

function openGoogleMapsList() {
  const stops = sortedStops().filter((stop) => stopMapQuery(stop));
  if (!stops.length) {
    showToast("Add locations before opening Google Maps.");
    return;
  }

  let url;
  if (stops.length === 1) {
    url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stopMapQuery(stops[0]))}`;
  } else {
    const origin = stopMapQuery(stops[0]);
    const destination = stopMapQuery(stops[stops.length - 1]);
    const waypoints = stops.slice(1, -1).slice(0, 23).map(stopMapQuery).join("|");
    const params = new URLSearchParams({
      api: "1",
      origin,
      destination,
      travelmode: "driving"
    });
    if (waypoints) params.set("waypoints", waypoints);
    url = `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  window.open(url, "_blank", "noopener,noreferrer");
  showToast("Opening places in Google Maps.");
}

function stopMapQuery(stop) {
  return String(stop.location || stop.title || "").trim();
}

function googleMapsEmbedUrl(stop) {
  return `https://www.google.com/maps?q=${encodeURIComponent(stopMapQuery(stop))}&z=11&output=embed`;
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

function readJoinCodeFromHash() {
  if (!window.location.hash.startsWith("#join=")) return "";
  return decodeURIComponent(window.location.hash.slice(6)).trim().toUpperCase();
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
  const date = isoToUtcDate(iso);
  return {
    iso,
    dayNumber: new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "UTC" }).format(date),
    weekday: new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(date),
    monthDay: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(date),
    monthDayShort: new Intl.DateTimeFormat("en-US", { month: "numeric", day: "numeric", timeZone: "UTC" }).format(date)
  };
}

function isoToUtcDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function addDaysIso(iso, offset) {
  const date = isoToUtcDate(iso);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function weekDays(referenceIso) {
  const date = isoToUtcDate(referenceIso);
  const offset = -date.getUTCDay();
  return Array.from({ length: 7 }, (_, index) => dayInfo(addDaysIso(referenceIso, offset + index)));
}

function monthDays(referenceIso) {
  const date = isoToUtcDate(referenceIso);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1, 12));
  const last = new Date(Date.UTC(year, month + 1, 0, 12));
  const leadingBlanks = first.getUTCDay();
  const totalDays = last.getUTCDate();
  const cells = Array.from({ length: leadingBlanks }, () => null);
  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(dayInfo(new Date(Date.UTC(year, month, day, 12)).toISOString().slice(0, 10)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function stopsForDestinationDay(iso) {
  return sortedStops().filter((stop) => destinationDateIso(stop) === iso);
}

function destinationDateIso(stop) {
  return formatParts(toUtc(stop), state.trip.destinationZone).date;
}

function toUtc(stop) {
  return zonedTimeToUtc(stop.startDate || stop.date, stop.startTime || stop.time, stop.zone);
}

function toEndUtc(stop) {
  return zonedTimeToUtc(stop.endDate || stop.startDate || stop.date, stop.endTime || stop.startTime || stop.time, stop.zone);
}

function stopDurationMinutes(stop) {
  const diff = Math.round((toEndUtc(stop).getTime() - toUtc(stop).getTime()) / 60000);
  return Math.max(0, diff);
}

function inferEndDateTime(dateIso, time, timeZone, minutes) {
  const start = zonedTimeToUtc(dateIso, time, timeZone);
  const end = new Date(start.getTime() + Math.max(1, Number(minutes || 90)) * 60000);
  return formatParts(end, timeZone);
}

function renderStopLengthPreview() {
  if (!el.stopLengthPreview || !el.stopDate.value || !el.stopTime.value || !el.stopEndDate.value || !el.stopEndTime.value) {
    return;
  }
  const start = zonedTimeToUtc(el.stopDate.value, el.stopTime.value, el.stopZone.value);
  const end = zonedTimeToUtc(el.stopEndDate.value, el.stopEndTime.value, el.stopZone.value);
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  el.stopLengthPreview.textContent = minutes > 0 ? durationLabel(minutes) : "Check end";
}

function ensureValidEndFromStart() {
  if (!el.stopDate.value || !el.stopTime.value) return;
  if (!el.stopEndDate.value || !el.stopEndTime.value) {
    const end = inferEndDateTime(el.stopDate.value, el.stopTime.value, el.stopZone.value, 90);
    el.stopEndDate.value = end.date;
    el.stopEndTime.value = end.time;
    return;
  }
  const start = zonedTimeToUtc(el.stopDate.value, el.stopTime.value, el.stopZone.value);
  const end = zonedTimeToUtc(el.stopEndDate.value, el.stopEndTime.value, el.stopZone.value);
  if (end <= start) {
    const nextEnd = inferEndDateTime(el.stopDate.value, el.stopTime.value, el.stopZone.value, 90);
    el.stopEndDate.value = nextEnd.date;
    el.stopEndTime.value = nextEnd.time;
  }
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
  const stopZone = stop.zone || state.trip.destinationZone;
  return `<strong>${escapeHtml(formatStopTimeForZone(stop, stopZone))}</strong><span>${escapeHtml(zoneLabel(stopZone))}</span>`;
}

function formatStopTimeForZone(stop, timeZone) {
  const start = formatTimeForZone(toUtc(stop), timeZone);
  if (state.trip.showEndTimes === false) return start;
  const end = formatTimeForZone(toEndUtc(stop), timeZone);
  return `${start}-${end}`;
}

function destinationHour(stop) {
  return Number(formatParts(toUtc(stop), state.trip.destinationZone).time.split(":")[0]);
}

function calendarHours(days = tripDays()) {
  const scopedStops = days.flatMap((day) => stopsForDestinationDay(day.iso));
  const hours = scopedStops.map(destinationHour);
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
  const endHour = Math.min(23, startHour + Math.ceil(stopDurationMinutes(stop) / 60));
  return hour >= startHour && hour < endHour;
}

function routeSvg(stops) {
  const points = stops.slice(0, 10).map((stop, index, arr) => {
    const progress = arr.length === 1 ? 0.5 : index / (arr.length - 1);
    const x = 10 + progress * 80;
    const y = 31 + Math.sin(index * 1.35) * 13 + Math.cos(progress * Math.PI) * 4;
    return { stop, x, y };
  });
  const path = points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");

  return `
    <svg class="route-art" viewBox="0 0 100 64" role="img" aria-label="Trip route infographic">
      <defs>
        <linearGradient id="seaGradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#edf8f8" />
          <stop offset="1" stop-color="#dcecee" />
        </linearGradient>
      </defs>
      <rect width="100" height="64" rx="4" fill="url(#seaGradient)" />
      <path d="M8 48 C17 31 31 26 43 35 C56 45 68 17 92 31 L92 57 L8 57 Z" fill="#ffffff" opacity="0.93" />
      <path d="M12 53 C25 45 39 48 51 40 C66 29 78 43 90 36" fill="none" stroke="#b9d2d6" stroke-width="1.4" stroke-linecap="round" />
      <path class="route-line" d="${path}" />
      ${points
        .map(({ stop, x, y }, index) => `
          <g class="route-marker">
            <circle class="route-point ${stop.type}" cx="${x}" cy="${y}" r="4.5" />
            <text class="route-number" x="${x}" y="${y}">${index + 1}</text>
          </g>
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
  return stopsForDestinationDay(iso).reduce((sum, stop) => sum + stopDurationMinutes(stop), 0) / 60;
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
  return `${zoneLabel(state.trip.destinationZone)} ${Math.abs(delta)}h ${delta > 0 ? "ahead" : "behind"}`;
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

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function createShareCode() {
  const bytes = new Uint8Array(5);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    bytes.forEach((_, index) => {
      bytes[index] = Math.floor(Math.random() * 256);
    });
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function sanitizeTripForLocal(trip) {
  return {
    ...trip,
    stops: trip.stops.map((stop) => ({
      ...stop,
      attachments: stop.attachments.map((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        type: attachment.type,
        size: attachment.size,
        dataUrl: attachment.storagePath ? "" : attachment.dataUrl || "",
        signedUrl: attachment.signedUrl || "",
        storagePath: attachment.storagePath || ""
      }))
    }))
  };
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

function dataUrlToBlob(dataUrl) {
  const [header, payload] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(header)?.[1] || "application/octet-stream";
  const binary = atob(payload || "");
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

function safeFileName(name) {
  return String(name || "attachment")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "attachment";
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
