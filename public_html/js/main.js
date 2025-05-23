;(function(){
  // ===== CONSTANTS =====
  const SETTINGS_STORAGE_KEY = "sunSafetySettings";
  const UV_DATA_STORAGE_KEY   = "sunSafetyUvData";
  const UV_DATA_EXPIRY_MS       = 30*60*1000; // ms (30 minutes)
  const MINIMUM_ERYTHEMA_DOSE_VALUES = {
    "1":200, "2":250, "3":300,
    "4":450, "5":600, "6":1000
  };

  // ===== STATE =====
  let userSettings = { latitude:"", longitude:"", skinType:"1" };
  let uvDataCache   = null;
  let lastFetchTimestamp   = null;
  let selectedSegmentTimestamp = null;

  // ===== DOM REFS =====
  const tabHomeButton       = document.getElementById("tab-home");
  const tabSettingsButton   = document.getElementById("tab-settings");
  const homeViewElement = document.getElementById("view-home");
  const settingsViewElement = document.getElementById("view-settings");
  const loadingElement = document.getElementById("loading");
  const messageElement = document.getElementById("message");
  const homeContentElement = document.getElementById("home-content");
  const circleWidgetElement = document.getElementById("circle-widget");
  const safeTimeElement = document.getElementById("safe-time");
  const skinTypeDisplayElement = document.getElementById("skin-display");
  const locationInfoElement = document.getElementById("location-info");
  const refreshButton = document.getElementById("refresh-btn");

  const settingsForm = document.getElementById("settings-form");
  const inputLatitudeElement = document.getElementById("inp-lat");
  const inputLongitudeElement = document.getElementById("inp-lng");
  const inputSkinTypeElement = document.getElementById("inp-skin");

  // ===== UTILITIES =====
  function saveSettings() {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(userSettings));
  }
  function loadSettings() {
    const s = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (s) {
      try {
        userSettings = JSON.parse(s);
      } catch(_){}
    }
  }
  function isSettingsReady() {
    return userSettings.latitude && userSettings.longitude && userSettings.skinType;
  }
  function saveUvStorage(data) {
    const payload = { data, ts:Date.now() };
    localStorage.setItem(UV_DATA_STORAGE_KEY, JSON.stringify(payload));
    lastFetchTimestamp = new Date(payload.ts);
  }
  function loadUvStorage() {
    const s = localStorage.getItem(UV_DATA_STORAGE_KEY);
    if (!s) return false;
    try {
      const { data, ts } = JSON.parse(s);
      if (Date.now() - ts < UV_DATA_EXPIRY_MS) {
        uvDataCache = data;
        lastFetchTimestamp = new Date(ts);
        return true;
      }
    } catch(_){}
    return false;
  }
  function formatTwoDigit(num){
    return (num<10? "0"+num : num);
  }
  function formatTimeString(str) {
    const d = new Date(str);
    let h = d.getHours();
    let ampm = h>=12?"PM":"AM";
    h = h%12||12;
    return h + ":" + formatTwoDigit(d.getMinutes()) + " " + ampm;
  }
  function formatDateString(d) {
    return d.toLocaleString([], {
      month:"short", day:"numeric", hour:"2-digit", minute:"2-digit"
    });
  }
  function getAllUVDataPoints() {
    if (!uvDataCache) return [];
    return [
      ...(uvDataCache.history||[]),
      uvDataCache.now,
      ...(uvDataCache.forecast||[])
    ].sort((a,b)=> new Date(a.time) - new Date(b.time));
  }
  function findClosestDataPointByTime(tp) {
    const pts = getAllPoints();
    const tgt = new Date(tp).getTime();
    let best = pts[0], md = Math.abs(new Date(pts[0].time).getTime()-tgt);
    for(let i=1;i<pts.length;i++){
      const d = Math.abs(new Date(pts[i].time).getTime()-tgt);
      if (d<md){ md=d; best=pts[i]; }
    }
    return best;
  }
  function getUVRiskLevel(u) {
    if (u < 1) return { label: "No UV", color: "#1E90FF" };
    if (u < 3) return { label: "Low UV", color: "#2ed573" };
    if (u < 6) return { label: "Moderate UV", color: "#ffa502" };
    if (u < 8) return { label: "High UV", color: "#ff7f50" };
    if (u < 11) return { label: "Very High UV", color: "#ff4757" };
    return { label: "Extreme UV", color: "#9c27b0" };
  }
  function calcSafeTime(u, skin) {
    if (!u || u <= 0 || !skin || !MINIMUM_ERYTHEMA_DOSE_VALUES[skin]) return 0;
    const MED = MINIMUM_ERYTHEMA_DOSE_VALUES[skin];
    const rate = u * 0.025 * 60;
    const mins = MED / rate;
    return Math.floor(mins);
  }

  // ===== UI UPDATES =====
  function switchTab(tab) {
    if (tab==="home") {
      tabHomeButton.classList.add("active");
      tabSettingsButton.classList.remove("active");
      homeViewElement.classList.add("active");
      settingsViewElement.classList.remove("active");
    } else {
      tabHomeButton.classList.remove("active");
      tabSettingsButton.classList.add("active");
      homeViewElement.classList.remove("active");
      settingsViewElement.classList.add("active");
    }
  }

  function showMessage(html) {
    messageElement.innerHTML = html;
    messageElement.style.display = "block";
  }
  function hideMessage() {
    messageElement.style.display = "none";
    messageElement.innerHTML = "";
  }

  function renderHome() {
    if (!uvDataCache) {
      homeContentElement.style.display = "none";
      hideLoading();
      showMessage(`
        <div class="card">
          <div class="card-content" style="text-align:center;padding:24px">
            <p>No UV data available.</p>
            <button id="btn-fetch">Fetch UV Data</button>
          </div>
        </div>`);
      document.getElementById("btn-fetch").onclick = ()=>fetchUv(true);
      return;
    }
    hideMessage();
    hideLoading();
    homeContentElement.style.display = "flex";

    const uvi = uvDataCache.now.uvi;
    if (uvi <= 2) {
      const now = new Date(uvDataCache.now.time);
      const future = getAllUVDataPoints()
        .filter(p => new Date(p.time) > now && p.uvi > 2)
        .sort((a, b) => new Date(a.time) - new Date(b.time));
      let label = Math.round(calcSafeTime(uvi, userSettings.skinType)) + " min";
      if (future.length) {
        const tu = new Date(future[0].time);
        const hrs = tu.getHours() % 12 || 12;
        const mins = formatTwoDigit(tu.getMinutes());
        const ampm = tu.getHours() >= 12 ? "PM" : "AM";
        const today = new Date();
        let dayLabel = "";
        if (tu.toDateString() === today.toDateString()) {
          dayLabel = "today";
        } else {
          const tm = new Date();
          tm.setDate(today.getDate() + 1);
          if (tu.toDateString() === tm.toDateString()) dayLabel = "tomorrow";
        }
        label = `Safe until ${hrs}:${mins} ${ampm}` + (dayLabel ? ` ${dayLabel}` : "");
      }
      safeTimeElement.textContent = label;
      safeTimeElement.style.color = "var(--info-color)";
    } else {
      safeTimeElement.textContent = `Safe in the sun for ${Math.round(calcSafeTime(uvi, userSettings.skinType))} minutes`;
      safeTimeElement.style.color = "var(--primary-color)";
    }
    const skinMap = {
      "1":"Type I (Very fair)",
      "2":"Type II (Fair)",
      "3":"Type III (Medium)",
      "4":"Type IV (Olive)",
      "5":"Type V (Brown)",
      "6":"Type VI (Dark)"
    };
    skinTypeDisplayElement.textContent = skinMap[userSettings.skinType]||"";

    let txt = `Location: ${userSettings.latitude}, ${userSettings.longitude}`;
    if (lastFetchTimestamp) txt += `<br>Last: ${formatDateString(lastFetchTimestamp)}`;
    locationInfoElement.innerHTML = txt;

    buildCircle();
  }

  function showLoading() {
    loadingElement.style.display = "flex";
    homeContentElement.style.display = "none";
    hideMessage();
  }
  function hideLoading() {
    loadingElement.style.display = "none";
  }

  function buildCircle() {
    const pts = getAllPoints();
    if (!pts.length) return;
    const nowT = uvDataCache.now.time;
    selectedSegmentTimestamp = selectedSegmentTimestamp||nowT;
    const selPt = findClosestDataPointByTime(selectedSegmentTimestamp);

    let svg = `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">`;
    const selectedHour = new Date(selPt.time).getHours() % 12 || 12;
    for (let hr = 1; hr <= 12; hr++) {
      const pt = pts.find(p => (new Date(p.time).getHours() % 12 || 12) === hr);
      const riskColor = getRisk(pt ? pt.uvi : 0).color;
      const startAngle = (hr * 30 - 90) * Math.PI/180;
      const endAngle = ((hr % 12 + 1) * 30 - 90) * Math.PI/180;
      const x1 = 50 + Math.cos(startAngle) * 45;
      const y1 = 50 + Math.sin(startAngle) * 45;
      const x2 = 50 + Math.cos(endAngle) * 45;
      const y2 = 50 + Math.sin(endAngle) * 45;
      svg += `<path d="M${x1.toFixed(2)} ${y1.toFixed(2)} A45 45 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}" stroke="${riskColor}" stroke-width="${pt && pt.time === selPt.time ? 12 : 8}" fill="none"/>`;
    }
    svg += `</svg>`;

    const risk = getUVRiskLevel(selPt.uvi);
    const timeToBurnMin = calcSafeTime(selPt.uvi, userSettings.skinType);
    let burnHtml = "";
    if (selPt.uvi > 2) {
      burnHtml = `<div class="burn-time">Burn in ${timeToBurnMin}m</div>`;
    }
    const center = `
      <div class="center-info">
        <div class="time">${formatTimeString(selPt.time)}</div>
        <div class="uvi" style="color:${risk.color}">${selPt.uvi.toFixed(1)}</div>
        <div class="label">${risk.label}</div>
        ${burnHtml}
      </div>`;
    circleWidgetElement.innerHTML = svg + center;
    circleWidgetElement.onclick = (ev) => {
      const rect = circleWidgetElement.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = ev.clientX - cx;
      const dy = ev.clientY - cy;
      let clickAngle = Math.atan2(dx, -dy) * (180 / Math.PI);
      if (clickAngle < 0) clickAngle += 360;

      // determine clicked segment (each 30° slice from top)
      const seg = Math.floor((clickAngle) / 30) % 12;
      const hr = seg === 0 ? 12 : seg;
      // find a data point matching that hour
      const ptMatch = pts.find(pt => (new Date(pt.time).getHours() % 12 || 12) === hr);
      if (ptMatch) {
        selectedSegmentTimestamp = ptMatch.time;
        buildCircle();
      }
    };
  }

  async function fetchUv(force=false){
    if (!isSettingsReady()){
      switchTab("settings"); return;
    }
    showLoading();
    if (!force && loadUvStorage()){
      renderHome();
      return;
    }
    try {
      const url = `https://currentuvindex.com/api/v1/uvi?latitude=${userSettings.latitude}&longitude=${userSettings.longitude}`;
      const resp = await fetch(url);
      if(!resp.ok) throw new Error("HTTP "+resp.status);
      const data = await resp.json();
      uvDataCache = data;
      saveUvStorage(data);
      renderHome();
    }
    catch(err){
      hideLoading();
      showMessage(`<div style="padding:24px; text-align:center">
        <p>Error loading UV data. Try again later.</p>
        <button onclick="fetchUv(true)">Retry</button>
      </div>`);
      console.error(err);
    }
  }

  function init(){
    loadSettings();
    if (!userSettings.latitude && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        userSettings.latitude = pos.coords.latitude.toFixed(4);
        userSettings.longitude = pos.coords.longitude.toFixed(4);
        saveSettings();
        inputLatitudeElement.value = userSettings.latitude;
        inputLongitudeElement.value = userSettings.longitude;
      }, err => {
        console.warn("Geolocation error:", err);
      });
    }
    inputLatitudeElement.value = userSettings.latitude;
    inputLongitudeElement.value = userSettings.longitude;
    inputSkinTypeElement.value = userSettings.skinType;

    tabHomeButton.onclick     = ()=>switchTab("home");
    tabSettingsButton.onclick = ()=>switchTab("settings");

    settingsForm.onsubmit = e=>{
      e.preventDefault();
      userSettings.latitude  = inputLatitudeElement.value.trim();
      userSettings.longitude = inputLongitudeElement.value.trim();
      userSettings.skinType  = inputSkinTypeElement.value;
      saveSettings();
      fetchUv(true);
      switchTab("home");
    };

    refreshButton.onclick = ()=>fetchUv(true);

    fetchUv(false);
  }

  window.switchTab = switchTab;
  window.fetchUv   = fetchUv;
  document.addEventListener("DOMContentLoaded", init);
})();
