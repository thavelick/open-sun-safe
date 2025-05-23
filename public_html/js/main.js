;(function(){
  // ===== CONSTANTS =====
  const SETTINGS_KEY = "sunSafetySettings";
  const UVDATA_KEY   = "sunSafetyUvData";
  const EXPIRY       = 30*60*1000; // ms (30 minutes)
  const MED_VALUES = {
    "1":200, "2":250, "3":300,
    "4":450, "5":600, "6":1000
  };

  // ===== STATE =====
  let settings = { latitude:"", longitude:"", skinType:"1" };
  let uvData   = null;
  let lastTs   = null;
  let selectedTime = null;

  // ===== DOM REFS =====
  const tabHome       = document.getElementById("tab-home");
  const tabSettings   = document.getElementById("tab-settings");
  const viewHome      = document.getElementById("view-home");
  const viewSettings  = document.getElementById("view-settings");
  const loadingEl     = document.getElementById("loading");
  const messageEl     = document.getElementById("message");
  const homeContentEl = document.getElementById("home-content");
  const circleEl      = document.getElementById("circle-widget");
  const safeTimeEl    = document.getElementById("safe-time");
  const skinDisplayEl = document.getElementById("skin-display");
  const locInfoEl     = document.getElementById("location-info");
  const refreshBtn    = document.getElementById("refresh-btn");

  const form          = document.getElementById("settings-form");
  const inpLat        = document.getElementById("inp-lat");
  const inpLng        = document.getElementById("inp-lng");
  const inpSkin       = document.getElementById("inp-skin");

  // ===== UTILITIES =====
  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
  function loadSettings() {
    const s = localStorage.getItem(SETTINGS_KEY);
    if (s) {
      try {
        settings = JSON.parse(s);
      } catch(_){}
    }
  }
  function isSettingsReady() {
    return settings.latitude && settings.longitude && settings.skinType;
  }
  function saveUvStorage(data) {
    const payload = { data, ts:Date.now() };
    localStorage.setItem(UVDATA_KEY, JSON.stringify(payload));
    lastTs = new Date(payload.ts);
  }
  function loadUvStorage() {
    const s = localStorage.getItem(UVDATA_KEY);
    if (!s) return false;
    try {
      const { data, ts } = JSON.parse(s);
      if (Date.now() - ts < EXPIRY) {
        uvData = data;
        lastTs = new Date(ts);
        return true;
      }
    } catch(_){}
    return false;
  }
  function wrapCurrency(num){
    return (num<10? "0"+num : num);
  }
  function formatTime(str) {
    const d = new Date(str);
    let h = d.getHours();
    let ampm = h>=12?"PM":"AM";
    h = h%12||12;
    return h + ":" + wrapCurrency(d.getMinutes()) + " " + ampm;
  }
  function formatDate(d) {
    return d.toLocaleString([], {
      month:"short", day:"numeric", hour:"2-digit", minute:"2-digit"
    });
  }
  function getAllPoints() {
    if (!uvData) return [];
    return [
      ...(uvData.history||[]),
      uvData.now,
      ...(uvData.forecast||[])
    ].sort((a,b)=> new Date(a.time) - new Date(b.time));
  }
  function findClosest(tp) {
    const pts = getAllPoints();
    const tgt = new Date(tp).getTime();
    let best = pts[0], md = Math.abs(new Date(pts[0].time).getTime()-tgt);
    for(let i=1;i<pts.length;i++){
      const d = Math.abs(new Date(pts[i].time).getTime()-tgt);
      if (d<md){ md=d; best=pts[i]; }
    }
    return best;
  }
  function getRisk(u) {
    if (u < 1) return { label: "No UV", color: "#1E90FF" };
    if (u < 3) return { label: "Low UV", color: "#2ed573" };
    if (u < 6) return { label: "Moderate UV", color: "#ffa502" };
    if (u < 8) return { label: "High UV", color: "#ff7f50" };
    if (u < 11) return { label: "Very High UV", color: "#ff4757" };
    return { label: "Extreme UV", color: "#9c27b0" };
  }
  function calcSafeTime(u, skin) {
    if (!u || u <= 0 || !skin || !MED_VALUES[skin]) return 0;
    const MED = MED_VALUES[skin];
    const rate = u * 0.025 * 60;
    const mins = MED / rate;
    return Math.floor(mins);
  }

  // ===== UI UPDATES =====
  function switchTab(tab) {
    if (tab==="home") {
      tabHome.classList.add("active");
      tabSettings.classList.remove("active");
      viewHome.classList.add("active");
      viewSettings.classList.remove("active");
    } else {
      tabHome.classList.remove("active");
      tabSettings.classList.add("active");
      viewHome.classList.remove("active");
      viewSettings.classList.add("active");
    }
  }

  function showMessage(html) {
    messageEl.innerHTML = html;
    messageEl.style.display = "block";
  }
  function hideMessage() {
    messageEl.style.display = "none";
    messageEl.innerHTML = "";
  }

  function renderHome() {
    if (!uvData) {
      homeContentEl.style.display = "none";
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
    homeContentEl.style.display = "flex";

    const uvi = uvData.now.uvi;
    if (uvi <= 2) {
      const now = new Date(uvData.now.time);
      const future = getAllPoints()
        .filter(p => new Date(p.time) > now && p.uvi > 2)
        .sort((a, b) => new Date(a.time) - new Date(b.time));
      let label = Math.round(calcSafeTime(uvi, settings.skinType)) + " min";
      if (future.length) {
        const tu = new Date(future[0].time);
        const hrs = tu.getHours() % 12 || 12;
        const mins = wrapCurrency(tu.getMinutes());
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
      safeTimeEl.textContent = label;
      safeTimeEl.style.color = "var(--info-color)";
    } else {
      safeTimeEl.textContent = Math.round(calcSafeTime(uvi, settings.skinType)) + " min";
      safeTimeEl.style.color = "var(--primary-color)";
    }
    const skinMap = {
      "1":"Type I (Very fair)",
      "2":"Type II (Fair)",
      "3":"Type III (Medium)",
      "4":"Type IV (Olive)",
      "5":"Type V (Brown)",
      "6":"Type VI (Dark)"
    };
    skinDisplayEl.textContent = skinMap[settings.skinType]||"";

    let txt = `Location: ${settings.latitude}, ${settings.longitude}`;
    if (lastTs) txt += `<br>Last: ${formatDate(lastTs)}`;
    locInfoEl.innerHTML = txt;

    buildCircle();
  }

  function showLoading() {
    loadingEl.style.display = "flex";
    homeContentEl.style.display = "none";
    hideMessage();
  }
  function hideLoading() {
    loadingEl.style.display = "none";
  }

  function buildCircle() {
    const pts = getAllPoints();
    if (!pts.length) return;
    const nowT = uvData.now.time;
    selectedTime = selectedTime||nowT;
    const selPt = findClosest(selectedTime);

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
      svg += `<path d="M${x1.toFixed(2)} ${y1.toFixed(2)} A45 45 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}" stroke="${riskColor}" stroke-width="${hr === selectedHour ? 12 : 8}" fill="none"/>`;
    }
    svg += `</svg>`;

    const risk = getRisk(selPt.uvi);
    const timeToBurnMin = calcSafeTime(selPt.uvi, settings.skinType);
    let burnHtml = "";
    if (selPt.uvi > 2) {
      burnHtml = `<div class="burn-time">Burn in ${timeToBurnMin}m</div>`;
    }
    const center = `
      <div class="center-info">
        <div class="time">${formatTime(selPt.time)}</div>
        <div class="uvi">${selPt.uvi.toFixed(1)}</div>
        <div class="label">${risk.label}</div>
        ${burnHtml}
      </div>`;
    circleEl.innerHTML = svg + center;
    circleEl.onclick = (ev) => {
      const rect = circleEl.getBoundingClientRect();
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
        selectedTime = ptMatch.time;
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
      const url = `https://currentuvindex.com/api/v1/uvi?latitude=${settings.latitude}&longitude=${settings.longitude}`;
      const resp = await fetch(url);
      if(!resp.ok) throw new Error("HTTP "+resp.status);
      const data = await resp.json();
      uvData = data;
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
    if (!settings.latitude && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        settings.latitude = pos.coords.latitude.toFixed(4);
        settings.longitude = pos.coords.longitude.toFixed(4);
        saveSettings();
        inpLat.value = settings.latitude;
        inpLng.value = settings.longitude;
      }, err => {
        console.warn("Geolocation error:", err);
      });
    }
    inpLat.value = settings.latitude;
    inpLng.value = settings.longitude;
    inpSkin.value = settings.skinType;

    tabHome.onclick     = ()=>switchTab("home");
    tabSettings.onclick = ()=>switchTab("settings");

    form.onsubmit = e=>{
      e.preventDefault();
      settings.latitude  = inpLat.value.trim();
      settings.longitude = inpLng.value.trim();
      settings.skinType  = inpSkin.value;
      saveSettings();
      fetchUv(true);
      switchTab("home");
    };

    refreshBtn.onclick = ()=>fetchUv(true);

    fetchUv(false);
  }

  window.switchTab = switchTab;
  window.fetchUv   = fetchUv;
  document.addEventListener("DOMContentLoaded", init);
})();
