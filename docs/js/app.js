const LANG_KEY = "kisanq_language";
const USER_KEY = "kisanq_farmer";
const ADMIN_KEY = "kisanq_admin";
const BOOK_KEY = "kisanq_bookings";
const FARMERS_KEY = "kisanq_farmers";
const NOTIFY_KEY = "kisanq_notify_log";
const PENDING_OTP_KEY = "kisanq_pending_otp";

const SLOTS = [
  "9:00 AM – 11:00 AM",
  "11:00 AM – 1:00 PM",
  "2:00 PM – 4:00 PM",
  "4:00 PM – 6:00 PM"
];

const CFG = window.KISANQ_CONFIG || {};
const CENTRES = window.KISANQ_CENTRES || [];
const LANGS = window.KISANQ_LANG || { en: {} };

let map, markers = [];
let pendingGovtId = null;
let channel;

function t(key) {
  const code = localStorage.getItem(LANG_KEY) || "en";
  const pack = LANGS[code] || LANGS.en || {};
  return pack[key] ?? LANGS.en?.[key] ?? key;
}

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });
  const sel = document.getElementById("globalLanguage");
  if (sel) sel.value = localStorage.getItem(LANG_KEY) || "en";
  document.documentElement.lang = localStorage.getItem(LANG_KEY) || "en";
}

function changeLanguage(code) {
  if (!LANGS[code]) code = "en";
  localStorage.setItem(LANG_KEY, code);
  applyI18n();
  renderSlotForecast();
  renderFarmerStatus();
  renderAdmin();
  highlightLangButtons();
}

function highlightLangButtons() {
  const current = localStorage.getItem(LANG_KEY) || "en";
  document.querySelectorAll(".language-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === current);
  });
}

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getFarmer() { return read(USER_KEY, null); }
function saveFarmer(f) { write(USER_KEY, f); }
function getAdmin() { return read(ADMIN_KEY, null); }
function getBookings() { return read(BOOK_KEY, []); }
function saveBookings(b) { write(BOOK_KEY, b); }
function getFarmers() { return read(FARMERS_KEY, []); }
function saveFarmers(f) { write(FARMERS_KEY, f); }

function today() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHTML(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function uniqueToken() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const existing = new Set(getBookings().map((b) => b.token));
  let token;
  do {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    token = "KQ-" + Array.from(bytes, (n) => alphabet[n % alphabet.length]).join("");
  } while (existing.has(token));
  return token;
}

function hideAll() {
  document.querySelectorAll("main section").forEach((s) => s.classList.add("hidden"));
}

function hideNavs() {
  document.getElementById("farmerBottomNav")?.classList.add("hidden");
  document.getElementById("adminBottomNav")?.classList.add("hidden");
  document.body.classList.remove("app-mode");
}

function showNav(id) {
  document.getElementById(id)?.classList.remove("hidden");
  document.body.classList.add("app-mode");
}

function setTab(navId, tab) {
  document.querySelectorAll(`#${navId} button`).forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
}

function goHome() {
  hideAll();
  hideNavs();
  document.getElementById("homePage")?.classList.remove("hidden");
  renderSessionBanner();
}

function renderSessionBanner() {
  const box = document.getElementById("sessionBanner");
  if (!box) return;
  const farmer = getFarmer();
  if (!farmer) {
    box.classList.add("hidden");
    return;
  }
  box.classList.remove("hidden");
  document.getElementById("sessionBannerText").textContent =
    `${t("sessionBanner")} ${farmer.name || farmer.phone}`;
}

function showFarmerLogin() {
  hideAll();
  hideNavs();
  document.getElementById("farmerAuth")?.classList.remove("hidden");
  switchAuthTab("login");
}

function showFarmerRegister() {
  hideAll();
  hideNavs();
  document.getElementById("farmerAuth")?.classList.remove("hidden");
  switchAuthTab("register");
}

function switchAuthTab(tab) {
  document.getElementById("loginPane")?.classList.toggle("hidden", tab !== "login");
  document.getElementById("registerPane")?.classList.toggle("hidden", tab !== "register");
  document.getElementById("tabLogin")?.classList.toggle("active", tab === "login");
  document.getElementById("tabRegister")?.classList.toggle("active", tab === "register");
  document.getElementById("otpStep")?.classList.add("hidden");
  document.getElementById("phoneStep")?.classList.remove("hidden");
}

function showAdminLogin() {
  hideAll();
  hideNavs();
  document.getElementById("adminLogin")?.classList.remove("hidden");
}

function requireFarmer() {
  if (!getFarmer()) {
    alert(t("noSession"));
    showFarmerRegister();
    return false;
  }
  return true;
}

function showFarmerHome() {
  if (!requireFarmer()) return;
  hideAll();
  document.getElementById("farmerHome")?.classList.remove("hidden");
  const f = getFarmer();
  const w = document.getElementById("farmerWelcome");
  if (w) w.textContent = f?.name || f?.phone || t("farmer");
  showNav("farmerBottomNav");
  setTab("farmerBottomNav", "home");
}

function showFarmerLanguage() {
  if (!requireFarmer()) return;
  hideAll();
  document.getElementById("farmerLanguagePage")?.classList.remove("hidden");
  showNav("farmerBottomNav");
  setTab("farmerBottomNav", "language");
  highlightLangButtons();
}

function showFarmerCentres() {
  if (!requireFarmer()) return;
  hideAll();
  document.getElementById("farmerCentresPage")?.classList.remove("hidden");
  showNav("farmerBottomNav");
  setTab("farmerBottomNav", "centres");
  setTimeout(() => map?.invalidateSize(), 200);
}

function showFarmerBooking() {
  if (!requireFarmer()) return;
  hideAll();
  document.getElementById("farmerBookingPage")?.classList.remove("hidden");
  showNav("farmerBottomNav");
  setTab("farmerBottomNav", "booking");
  const select = document.getElementById("selectedCentre");
  const saved = read("kisanq_selected_centre", null);
  if (select && saved?.name && !select.value) {
    select.innerHTML = `<option value="${escapeHTML(saved.name)}" data-pin="${escapeHTML(saved.pin)}">${escapeHTML(saved.name)}</option>`;
    select.value = saved.name;
  }
  const centre = select?.value;
  document.getElementById("noCentreMessage")?.classList.toggle("hidden", Boolean(centre));
  document.getElementById("bookingFormWrap")?.classList.toggle("hidden", !centre);
  if (centre) renderSlotForecast();
}

function showFarmerStatusPage() {
  if (!requireFarmer()) return;
  hideAll();
  document.getElementById("farmerStatusPage")?.classList.remove("hidden");
  showNav("farmerBottomNav");
  setTab("farmerBottomNav", "status");
  renderFarmerStatus();
}

function farmerLogout() {
  localStorage.removeItem(USER_KEY);
  goHome();
}

function haversine(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function nearestCentreToPin(pin) {
  const n = Number(pin);
  return CENTRES.slice().sort((a, b) => Math.abs(Number(a.pin) - n) - Math.abs(Number(b.pin) - n))[0];
}

async function lookupPincode(pin) {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = await res.json();
    if (data?.[0]?.Status === "Success" && data[0].PostOffice?.length) {
      const po = data[0].PostOffice[0];
      return { district: po.District, state: po.State, office: po.Name };
    }
  } catch {
    /* demo continues offline */
  }
  return null;
}

async function findCentres() {
  const pin = (document.getElementById("farmerPin")?.value || "").trim();
  const result = document.getElementById("centreResults");
  if (!result) return;
  if (!/^\d{6}$/.test(pin)) {
    result.innerHTML = `<div class="error">${t("invalidPin")}</div>`;
    return;
  }
  result.innerHTML = `<div>🔄 ${t("search")}</div>`;

  const postal = await lookupPincode(pin);
  const origin = nearestCentreToPin(pin);
  const prefix = pin.slice(0, 3);

  const ranked = CENTRES.map((c) => {
    let score = 0;
    if (c.pin === pin) score += 100;
    if (c.pin.slice(0, 3) === prefix) score += 45;
    if (postal?.district && c.district.toLowerCase() === postal.district.toLowerCase()) score += 50;
    if (postal?.state && c.state.toLowerCase() === postal.state.toLowerCase()) score += 12;
    const km = haversine(origin, c);
    score += Math.max(0, 40 - km / 12);
    return { ...c, km: Math.round(km), score };
  }).sort((a, b) => b.score - a.score);

  const picked = ranked.filter((c) => c.score >= 20).slice(0, 8);
  const list = picked.length ? picked : ranked.slice(0, 6);

  const loc = postal
    ? `<p class="sub">${escapeHTML(postal.office)}, ${escapeHTML(postal.district)}, ${escapeHTML(postal.state)}</p>`
    : "";

  result.innerHTML = `
    <br>
    <h3>📍 ${escapeHTML(pin)} — ${t("allIndia")}</h3>
    ${loc}
    ${picked.length ? "" : `<div class="demo">${t("noCentre")}</div>`}
    <div class="centres">
      ${list.map((c) => `
        <div class="centre-card">
          <h3>${escapeHTML(c.name)}</h3>
          <p>${escapeHTML(c.district)}, ${escapeHTML(c.state)}</p>
          <span class="badge">PIN ${escapeHTML(c.pin)}</span>
          <span class="badge">${c.km} ${t("kmAway")}</span>
          <br><br>
          <button type="button" class="primary choose-centre" data-name="${escapeHTML(c.name)}" data-pin="${escapeHTML(c.pin)}">${t("select")}</button>
        </div>
      `).join("")}
    </div>
  `;
  result.querySelectorAll(".choose-centre").forEach((btn) => {
    btn.addEventListener("click", () => selectCentre(btn.dataset.name, btn.dataset.pin));
  });
  showCentresOnMap(list);
}

function selectCentre(name, pin) {
  write("kisanq_selected_centre", { name, pin });
  const select = document.getElementById("selectedCentre");
  if (!select) return;
  select.innerHTML = `<option value="${escapeHTML(name)}" data-pin="${escapeHTML(pin)}">${escapeHTML(name)}</option>`;
  select.value = name;
  showFarmerBooking();
}

function initMap() {
  const el = document.getElementById("map");
  if (!el || !window.L) return;
  map = L.map(el).setView([22.5, 79], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);
}

function showCentresOnMap(list) {
  if (!map) initMap();
  if (!map) return;
  markers.forEach((m) => m.remove());
  markers = [];
  const bounds = [];
  list.forEach((c) => {
    const m = L.marker([c.lat, c.lng]).addTo(map).bindPopup(`<b>${escapeHTML(c.name)}</b><br>${escapeHTML(c.pin)}`);
    markers.push(m);
    bounds.push([c.lat, c.lng]);
  });
  if (bounds.length) map.fitBounds(bounds, { padding: [30, 30] });
  setTimeout(() => map.invalidateSize(), 200);
}

function crowdLevel(count) {
  if (count > 5) return "high";
  if (count > 2) return "medium";
  return "low";
}

function slotCounts(centre, date) {
  const bookings = getBookings().filter(
    (b) => b.centre === centre && b.date === date && b.status !== "cancelled" && b.status !== "rejected"
  );
  return SLOTS.map((slot) => ({
    slot,
    count: bookings.filter((b) => b.slot === slot).length
  }));
}

function renderSlotForecast() {
  const box = document.getElementById("slotForecast");
  const centre = document.getElementById("selectedCentre")?.value;
  const date = document.getElementById("bookingDate")?.value;
  const chosen = document.getElementById("bookingSlot")?.value;
  if (!box) return;
  if (!centre || !date) {
    box.innerHTML = "";
    return;
  }
  const rows = slotCounts(centre, date);
  const best = rows.slice().sort((a, b) => a.count - b.count)[0];
  box.innerHTML = `
    <div class="forecast-box">
      <h4>🤖 ${t("predicted")}</h4>
      ${rows.map((r) => {
        const level = crowdLevel(r.count);
        return `<div class="forecast-row ${r.slot === chosen ? "active" : ""}">
          <span>${r.slot}</span>
          <span class="crowd-badge crowd-${level}">${t(level)} · ${r.count}</span>
        </div>`;
      }).join("")}
      <div class="forecast-best">${t("best")} ${best.slot}</div>
    </div>
  `;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function compressId(file) {
  if (!file) return null;
  if (file.type === "application/pdf") {
    return { name: file.name, type: "pdf", dataUrl: null };
  }
  try {
    if (typeof createImageBitmap === "function") {
      const img = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const max = 720;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      return { name: file.name, type: file.type, dataUrl: canvas.toDataURL("image/jpeg", 0.55) };
    }
  } catch {
    /* fall through */
  }
  return { name: file.name, type: file.type, dataUrl: await readFileAsDataUrl(file) };
}

async function onGovtIdChange(ev) {
  const file = ev.target.files?.[0];
  pendingGovtId = await compressId(file);
  const preview = document.getElementById("idPreview");
  if (preview && pendingGovtId?.dataUrl) {
    preview.src = pendingGovtId.dataUrl;
    preview.classList.remove("hidden");
  }
}

function bookSlot() {
  const farmer = getFarmer();
  if (!farmer) {
    showFarmerRegister();
    return;
  }
  const centre = document.getElementById("selectedCentre")?.value;
  const pin = document.getElementById("selectedCentre")?.selectedOptions?.[0]?.dataset.pin || "";
  const date = document.getElementById("bookingDate")?.value;
  const slot = document.getElementById("bookingSlot")?.value;
  const crop = document.getElementById("crop")?.value;
  const quantity = document.getElementById("quantity")?.value;
  const idType = document.getElementById("govtIdType")?.value;
  const message = document.getElementById("bookingMessage");

  if (!centre || !date || !slot || !crop || !quantity) {
    message.innerHTML = `<div class="error">${t("required")}</div>`;
    return;
  }
  if (!pendingGovtId) {
    message.innerHTML = `<div class="error">${t("idRequired")}</div>`;
    return;
  }

  const rows = slotCounts(centre, date);
  const thisCrowd = crowdLevel(rows.find((r) => r.slot === slot)?.count || 0);
  const best = rows.slice().sort((a, b) => a.count - b.count)[0];
  const token = uniqueToken();

  const booking = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    token,
    phone: farmer.phone,
    name: farmer.name,
    centre,
    pin,
    date,
    slot,
    crop,
    qty: quantity,
    status: "booked",
    idType,
    idName: pendingGovtId.name,
    idPreview: pendingGovtId.dataUrl,
    crowd: thisCrowd,
    bestSlot: best.slot,
    createdAt: new Date().toISOString()
  };

  const bookings = getBookings();
  bookings.push(booking);
  saveBookings(bookings);
  pushNotify(farmer.phone, `${t("bookingSuccess")} ${token}`);
  scheduleReminder(booking);
  notifyPhone(`${t("bookingConfirm")}: ${token}`, `${centre} · ${date} · ${slot}`);

  message.innerHTML = `
    <div class="success">
      <div>${t("bookingSuccess")} <strong>${escapeHTML(token)}</strong></div>
      <p>${t("crowdNow")}: ${t(thisCrowd)}</p>
      <p>${t("suitable")}: ${escapeHTML(best.slot)}</p>
      <p>${t("reminderSet")}</p>
    </div>
    <button class="primary" onclick="showFarmerStatusPage()">${t("viewStatus")}</button>
  `;
  renderFarmerStatus();
}

function pushNotify(phone, text) {
  const logs = read(NOTIFY_KEY, []);
  logs.unshift({ phone, message: text, time: new Date().toLocaleString() });
  write(NOTIFY_KEY, logs.slice(0, 80));
}

async function enableNotifications() {
  if (!("Notification" in window)) return;
  const perm = await Notification.requestPermission();
  if (perm === "granted") {
    registerSW();
    notifyPhone("KisanQ", t("notifyOn"));
    renderFarmerStatus();
  }
}

function registerSW() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

function notifyPhone(title, body) {
  if (Notification.permission !== "granted") return;
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ title, body });
  } else {
    new Notification(title, { body });
  }
}

function slotStartDate(date, slot) {
  const start = slot.split("–")[0].trim();
  const m = start.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return null;
  let hour = Number(m[1]) % 12;
  if (/PM/i.test(m[3])) hour += 12;
  const d = new Date(`${date}T00:00:00`);
  d.setHours(hour, Number(m[2]), 0, 0);
  return d;
}

function scheduleReminder(booking) {
  const when = slotStartDate(booking.date, booking.slot);
  if (!when) return;
  const fire = when.getTime() - (CFG.REMINDER_MINUTES || 30) * 60 * 1000;
  const delay = fire - Date.now();
  if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
    setTimeout(() => {
      notifyPhone("KisanQ", `${booking.token} · ${booking.centre} · ${booking.slot}`);
      pushNotify(booking.phone, t("calledMsg"));
    }, delay);
  }
}

function restoreReminders() {
  const farmer = getFarmer();
  if (!farmer) return;
  getBookings()
    .filter((b) => b.phone === farmer.phone && b.status === "booked")
    .forEach(scheduleReminder);
}

function renderFarmerStatus() {
  const farmer = getFarmer();
  const box = document.getElementById("farmerStatus");
  if (!farmer || !box) return;
  const mine = getBookings()
    .filter((b) => b.phone === farmer.phone)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (!mine.length) {
    box.innerHTML = `<div class="card"><h2>${t("statusTitle")}</h2><p>${t("noBookings")}</p></div>`;
    return;
  }
  const booking = mine[0];
  const logs = read(NOTIFY_KEY, []).filter((n) => n.phone === farmer.phone);
  const permOn = typeof Notification !== "undefined" && Notification.permission === "granted";
  box.innerHTML = `
    <div class="card">
      <h2>${t("statusTitle")}</h2>
      <div class="token-box">
        <div>
          <div class="token-label">${t("tokenUnique")}</div>
          <div class="token-number">${escapeHTML(booking.token)}</div>
        </div>
        <div>
          <div class="token-label">${t("crowdNow")}</div>
          <div>${t(booking.crowd || "low")}</div>
        </div>
      </div>
      <p><strong>${t("selected")}:</strong> ${escapeHTML(booking.centre)}</p>
      <p><strong>${t("date")}:</strong> ${escapeHTML(booking.date)} | <strong>${t("slot")}:</strong> ${escapeHTML(booking.slot)}</p>
      <p><strong>${t("suitable")}:</strong> ${escapeHTML(booking.bestSlot || booking.slot)}</p>
      <p><strong>${t("crop")}:</strong> ${escapeHTML(booking.crop)} · ${escapeHTML(booking.qty)}</p>
      <p><strong>${t("govtId")}:</strong> ${escapeHTML(booking.idType)} · ${escapeHTML(booking.idName || "")}</p>
      ${booking.idPreview ? `<img class="id-preview" src="${booking.idPreview}" alt="ID">` : ""}
      <p>Status: <span class="status ${booking.status}">${escapeHTML(booking.status)}</span></p>
      ${booking.status === "paid" ? `<p><strong>${t("paid")}:</strong> ₹${escapeHTML(booking.amount || "")} · ${escapeHTML(booking.razorpay_payment_id || "")}</p>` : ""}
      <button class="${permOn ? "secondary" : "primary"}" onclick="enableNotifications()">
        ${permOn ? t("notifyOn") : t("enableNotify")}
      </button>
    </div>
    <div class="card">
      <h3>${t("sms")}</h3>
      ${logs.length ? logs.map((n) => `<div class="notification">${escapeHTML(n.message)}<br><small>${escapeHTML(n.time)}</small></div>`).join("") : `<p>${t("noNotify")}</p>`}
    </div>
  `;
}

async function sendOTP(fromRegister) {
  const prefix = fromRegister ? "reg" : "login";
  const phone = (document.getElementById(`${prefix}Phone`)?.value || "").trim();
  const message = document.getElementById("loginMessage");
  if (!/^\d{10}$/.test(phone)) {
    message.innerHTML = `<div class="error">${t("invalidPhone")}</div>`;
    return;
  }
  const name = (document.getElementById("regName")?.value || "").trim();
  const village = (document.getElementById("regVillage")?.value || "").trim();
  if (fromRegister) {
    if (!name) {
      message.innerHTML = `<div class="error">${t("required")}</div>`;
      return;
    }
    write("kisanq_reg_draft", { name, village, phone });
  }
  message.innerHTML = `<div>${t("sending")}</div>`;
  try {
    const res = await fetch(`${CFG.API_BASE}/api/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      message.innerHTML = `<div class="error">${data.message || t("server")}</div>`;
      return;
    }
  } catch {
    message.innerHTML = `<div class="error">${t("server")}</div>`;
    return;
  }
  selectedPhone = phone;
  document.getElementById("phoneStep")?.classList.add("hidden");
  document.getElementById("otpStep")?.classList.remove("hidden");
  message.innerHTML = `<div class="success">${t("otpSent")}</div>`;
}

let selectedPhone = null;

async function verifyOTP() {
  const otp = (document.getElementById("farmerOTP")?.value || "").trim();
  const message = document.getElementById("loginMessage");
  if (!/^\d{6}$/.test(otp)) {
    message.innerHTML = `<div class="error">${t("invalidOTP")}</div>`;
    return;
  }
  const phone = selectedPhone;
  if (!phone) {
    message.innerHTML = `<div class="error">${t("requestOTP")}</div>`;
    return;
  }
  const draft = read("kisanq_reg_draft", null);
  try {
    const res = await fetch(`${CFG.API_BASE}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        otp,
        name: draft?.name || "",
        village: draft?.village || "",
        language: localStorage.getItem(LANG_KEY) || "en"
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      message.innerHTML = `<div class="error">${data.message || t("expired")}</div>`;
      return;
    }
    const farmer = {
      phone: data.farmer?.phone || phone,
      name: data.farmer?.name || draft?.name || "Farmer",
      village: data.farmer?.village || draft?.village || "",
      language: localStorage.getItem(LANG_KEY) || "en"
    };
    const farmers = getFarmers().filter((f) => f.phone !== farmer.phone);
    farmers.push(farmer);
    saveFarmers(farmers);
    saveFarmer(farmer);
    localStorage.removeItem("kisanq_reg_draft");
    enableNotifications();
    showFarmerHome();
  } catch {
    message.innerHTML = `<div class="error">${t("server")}</div>`;
  }
}

function backToPhone() {
  document.getElementById("otpStep")?.classList.add("hidden");
  document.getElementById("phoneStep")?.classList.remove("hidden");
}

function adminLogin() {
  const username = document.getElementById("adminUsername")?.value.trim();
  const password = document.getElementById("adminPassword")?.value;
  const message = document.getElementById("adminLoginMessage");
  if (username !== "admin" || password !== "admin123") {
    message.innerHTML = `<div class="error">Invalid username or password.</div>`;
    return;
  }
  write(ADMIN_KEY, { username, displayName: "Admin Sharma" });
  showAdminHome();
}

function showAdminHome() {
  if (!getAdmin()) {
    showAdminLogin();
    return;
  }
  hideAll();
  document.getElementById("adminHome")?.classList.remove("hidden");
  showNav("adminBottomNav");
  setTab("adminBottomNav", "home");
  renderAdmin();
}

function showAdminForecastPage() {
  hideAll();
  document.getElementById("adminForecastPage")?.classList.remove("hidden");
  showNav("adminBottomNav");
  setTab("adminBottomNav", "forecast");
  renderAdmin();
}

function showAdminQueuePage() {
  hideAll();
  document.getElementById("adminQueuePage")?.classList.remove("hidden");
  showNav("adminBottomNav");
  setTab("adminBottomNav", "list");
  renderAdmin();
}

function loadAdminCentre() {
  renderAdmin();
}

function currentAdminCentre() {
  const pin = (document.getElementById("adminCentrePin")?.value || "").trim();
  if (/^\d{6}$/.test(pin)) {
    const exact = CENTRES.filter((c) => c.pin === pin);
    if (exact.length) return exact;
    const prefix = pin.slice(0, 3);
    const near = CENTRES.filter((c) => c.pin.slice(0, 3) === prefix);
    return near.length ? near : [nearestCentreToPin(pin)];
  }
  return CENTRES;
}

function renderAdmin() {
  const admin = getAdmin();
  const welcome = document.getElementById("adminWelcomeName");
  if (welcome && admin) welcome.textContent = `${t("welcomeAdmin")}, ${admin.displayName || admin.username}`;

  const centres = currentAdminCentre();
  const names = new Set(centres.map((c) => c.name));
  const bookings = getBookings().filter((b) => names.has(b.centre) || centres.length === CENTRES.length);
  const scoped = centres.length === CENTRES.length ? getBookings() : getBookings().filter((b) => names.has(b.centre));

  const info = document.getElementById("adminCentreInfo");
  if (info) {
    info.innerHTML = centres.slice(0, 6).map((c) =>
      `<div class="badge">${escapeHTML(c.name)} · ${c.pin}</div>`
    ).join(" ");
  }

  const waiting = scoped.filter((b) => b.status === "booked");
  const accepted = scoped.filter((b) => b.status === "accepted" || b.status === "procured");
  const paid = scoped.filter((b) => b.status === "paid");
  const qty = scoped.reduce((s, b) => s + Number(b.qty || 0), 0);

  const stats = document.getElementById("adminStats");
  if (stats) {
    stats.innerHTML = `
      <div class="stat-card"><b>${CENTRES.length}</b>${t("allIndia")}</div>
      <div class="stat-card"><b>${scoped.length}</b>${t("allBookings")}</div>
      <div class="stat-card"><b>${waiting.length}</b>${t("waiting")}</div>
      <div class="stat-card"><b>${qty}</b> Qtl</div>
      <div class="stat-card"><b>${paid.length}</b>${t("paid")}</div>
      <div class="stat-card"><b>${accepted.length}</b>${t("accepted")}</div>
    `;
  }

  const collections = document.getElementById("adminCollections");
  if (collections) {
    const byCentre = {};
    scoped.forEach((b) => {
      byCentre[b.centre] = byCentre[b.centre] || { qty: 0, n: 0 };
      byCentre[b.centre].qty += Number(b.qty || 0);
      byCentre[b.centre].n += 1;
    });
    const rows = Object.entries(byCentre);
    collections.innerHTML = rows.length
      ? `<table><thead><tr><th>${t("selected")}</th><th>${t("allBookings")}</th><th>Qtl</th></tr></thead><tbody>
          ${rows.map(([name, v]) => `<tr><td>${escapeHTML(name)}</td><td>${v.n}</td><td>${v.qty}</td></tr>`).join("")}
        </tbody></table>`
      : `<p>${t("noBookings")}</p>`;
  }

  const waitingEl = document.getElementById("waitingCount");
  if (waitingEl) waitingEl.textContent = waiting.length;
  const now = document.getElementById("nowServing");
  if (now) now.textContent = scoped.find((b) => b.status === "called")?.token || "—";

  const forecast = document.getElementById("adminForecast");
  const date = document.getElementById("forecastDate")?.value || today();
  if (forecast) {
    const centreName = centres[0]?.name;
    const rows = centreName ? slotCounts(centreName, date) : SLOTS.map((s) => ({ slot: s, count: 0 }));
    forecast.innerHTML = rows.map((r) => {
      const level = crowdLevel(r.count);
      return `<div class="forecast-row"><span>${r.slot}</span><span class="crowd-badge crowd-${level}">${t(level)} · ${r.count}</span></div>`;
    }).join("");
  }

  const body = document.getElementById("adminTableBody");
  if (!body) return;
  if (!scoped.length) {
    body.innerHTML = `<tr><td colspan="8">${t("noBookings")}</td></tr>`;
    return;
  }
  body.innerHTML = scoped.map((b) => `
    <tr>
      <td>${escapeHTML(b.token)}</td>
      <td>${escapeHTML(b.name)}<br><small>${escapeHTML(b.phone)}</small></td>
      <td>${escapeHTML(b.crop)} / ${escapeHTML(b.qty)}</td>
      <td>${escapeHTML(b.date)}</td>
      <td>${escapeHTML(b.slot)}</td>
      <td><span class="status ${b.status}">${escapeHTML(b.status)}</span></td>
      <td>${b.idPreview ? `<img class="id-preview" src="${b.idPreview}" alt="ID">` : escapeHTML(b.idType || "")}</td>
      <td>
        ${b.status === "booked" ? `
          <button class="blue" onclick="callFarmer('${b.id}')">${t("callFarmer")}</button>
          <button class="primary" onclick="updateStatus('${b.id}','accepted')">${t("accept")}</button>
          <button class="danger" onclick="updateStatus('${b.id}','rejected')">${t("reject")}</button>
        ` : ""}
        ${b.status === "called" ? `
          <button class="primary" onclick="updateStatus('${b.id}','accepted')">${t("accept")}</button>
          <button class="danger" onclick="updateStatus('${b.id}','rejected')">${t("reject")}</button>
        ` : ""}
        ${b.status === "accepted" ? `
              <button class="primary" onclick="payFarmer('${b.id}')">${t("payRazorpay")}</button>
        ` : ""}
        ${b.status === "paid" ? `<small>₹${escapeHTML(b.amount || "")}<br>${escapeHTML(b.razorpay_payment_id || "paid")}</small>` : ""}
      </td>
    </tr>
  `).join("");
}

function callFarmer(id) {
  const bookings = getBookings();
  const b = bookings.find((x) => x.id === id);
  if (!b) return;
  b.status = "called";
  saveBookings(bookings);
  pushNotify(b.phone, t("calledMsg") + " " + b.token);
  notifyFarmerChannel(b);
  notifyPhone("KisanQ", `${b.token} ${t("calledMsg")}`);
  renderAdmin();
}

function callNext() {
  const pin = (document.getElementById("adminCentrePin")?.value || "").trim();
  const centres = currentAdminCentre();
  const names = new Set(centres.map((c) => c.name));
  const waiting = getBookings()
    .filter((b) => b.status === "booked" && (names.has(b.centre) || !pin))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  if (!waiting.length) {
    alert(t("noBookings"));
    return;
  }
  callFarmer(waiting[0].id);
}

function updateStatus(id, status) {
  const bookings = getBookings();
  const b = bookings.find((x) => x.id === id);
  if (!b) return;
  b.status = status;
  saveBookings(bookings);
  pushNotify(b.phone, `${t(status) || status}: ${b.token}`);
  notifyFarmerChannel(b);
  renderAdmin();
  renderFarmerStatus();
}

function notifyFarmerChannel(booking) {
  channel?.postMessage({ type: "booking-update", booking });
}

function payFarmer(id) {
  const bookings = getBookings();
  const b = bookings.find((x) => x.id === id);
  if (!b) return;
  const suggested = Math.max(1, Number(b.qty) || 1) * 2200;
  const modal = document.getElementById("payModal");
  document.getElementById("payModalBody").innerHTML = `
    <span class="badge">Razorpay TEST MODE</span>
    <h2>${t("payTitle")}</h2>
    <p>${escapeHTML(b.name)} · ${escapeHTML(b.token)}</p>
    <label>${t("amount")}</label>
    <input id="payAmount" type="number" min="1" value="${suggested}">
    <div class="demo">
      This is Razorpay <strong>test mode</strong>. No real bank, UPI, or card is used.
      Money is not deducted from any account.
    </div>
    <button class="primary" onclick="completeTestPay('${id}')">Pay with Razorpay test</button>
    <br><br>
    <button class="secondary" onclick="closePay()">${t("cancel")}</button>
  `;
  modal.classList.remove("hidden");
}

async function completeTestPay(id) {
  const bookings = getBookings();
  const b = bookings.find((x) => x.id === id);
  if (!b) return;
  const amount = Number(document.getElementById("payAmount")?.value) || 0;
  if (amount <= 0) {
    alert(t("required"));
    return;
  }
  const paymentId = "pay_test_" + Math.random().toString(36).slice(2, 12).toUpperCase();
  b.status = "paid";
  b.amount = amount;
  b.razorpay_payment_id = paymentId;
  b.paidAt = new Date().toISOString();
  saveBookings(bookings);
  pushNotify(b.phone, `${t("paid")}: ₹${amount} · ${paymentId}`);
  notifyFarmerChannel(b);
  try {
    await fetch(`${CFG.API_BASE}/api/payments/test-complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: id, amount, payment_id: paymentId, phone: b.phone, token: b.token })
    });
  } catch {
    /* local paid status still shows */
  }
  renderAdmin();
  renderFarmerStatus();
  closePay();
  alert(`${t("paymentDone")}\n₹${amount}\n${paymentId}`);
}

function finishPay(id) {
  completeTestPay(id);
}

function closePay() {
  document.getElementById("payModal")?.classList.add("hidden");
}

function adminLogout() {
  localStorage.removeItem(ADMIN_KEY);
  goHome();
}

function setupDates() {
  const bookingDate = document.getElementById("bookingDate");
  if (bookingDate) {
    bookingDate.min = today();
    if (!bookingDate.value) bookingDate.value = today();
  }
  const forecastDate = document.getElementById("forecastDate");
  if (forecastDate && !forecastDate.value) forecastDate.value = today();
}

document.addEventListener("DOMContentLoaded", () => {
  applyI18n();
  setupDates();
  initMap();
  registerSW();
  goHome();
  restoreReminders();
  if ("BroadcastChannel" in window) {
    channel = new BroadcastChannel("kisanq");
    channel.onmessage = (ev) => {
      if (ev.data?.type === "booking-update") {
        const farmer = getFarmer();
        if (farmer && ev.data.booking?.phone === farmer.phone) {
          notifyPhone("KisanQ", ev.data.booking.token + " — " + ev.data.booking.status);
          renderFarmerStatus();
        }
      }
    };
  }
});

Object.assign(window, {
  changeLanguage,
  goHome,
  showFarmerLogin,
  showFarmerRegister,
  switchAuthTab,
  showAdminLogin,
  showFarmerHome,
  showFarmerLanguage,
  showFarmerCentres,
  showFarmerBooking,
  showFarmerStatusPage,
  farmerLogout,
  sendOTP,
  verifyOTP,
  backToPhone,
  findCentres,
  selectCentre,
  renderSlotForecast,
  onGovtIdChange,
  bookSlot,
  enableNotifications,
  adminLogin,
  showAdminHome,
  showAdminForecastPage,
  showAdminQueuePage,
  loadAdminCentre,
  callNext,
  callFarmer,
  updateStatus,
    payFarmer,
    completeTestPay,
    finishPay,
  closePay,
  adminLogout
});
