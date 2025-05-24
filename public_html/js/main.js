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
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (storedSettings) {
      try {
        userSettings = JSON.parse(storedSettings);
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
    const storedUvData = localStorage.getItem(UV_DATA_STORAGE_KEY);
    if (!storedUvData) return false;
    try {
      const { data, ts } = JSON.parse(storedUvData);
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
  function formatTimeString(timeString) {
    const d = new Date(timeString);
    let hour12 = d.getHours();
    let ampm = hour12>=12?"PM":"AM";
    hour12 = hour12%12||12;
    return hour12 + ":" + formatTwoDigit(d.getMinutes()) + " " + ampm;
  }
  function formatDateString(dateObject) {
    return dateObject.toLocaleString([], {
      month:"short", day:"numeric", hour:"2-digit", minute:"2-digit"
    });
  }

  // Return UV data points within the 12-hour period starting at 7 AM today (or tomorrow
  // if current time is after 6 PM), sorted chronologically
  function getAllUVDataPoints() {
    if (!uvDataCache) return [];
    const allPoints = [
      ...(uvDataCache.history||[]),
      uvDataCache.now,
      ...(uvDataCache.forecast||[])
    ].sort((a, b) => new Date(a.time) - new Date(b.time));
    let start = new Date();
    // if current time is after 6 PM, start from 7 AM tomorrow
    if (start.getHours() >= 18) {
      start.setDate(start.getDate() + 1);
    }
    start.setHours(7, 0, 0, 0);
    const end = new Date(start.getTime() + 12 * 3600 * 1000);
    return allPoints.filter(p => {
      const t = new Date(p.time);
      return t >= start && t < end;
    });
  }
  function findClosestDataPointByTime(timestamp) {
    const dataPoints = getAllUVDataPoints();
    const targetTime = new Date(timestamp).getTime();
    let bestDataPoint = dataPoints[0];
    let minimumTimeDifference = Math.abs(new Date(dataPoints[0].time).getTime() - targetTime);
    for (let index = 1; index < dataPoints.length; index++) {
      const currentDifference = Math.abs(new Date(dataPoints[index].time).getTime() - targetTime);
      if (currentDifference < minimumTimeDifference) {
        minimumTimeDifference = currentDifference;
        bestDataPoint = dataPoints[index];
      }
    }
    return bestDataPoint;
  }
  function getUVRiskLevel(uvIndex) {
    if (uvIndex < 1) return { label: "No UV", color: "#1E90FF" };
    if (uvIndex < 3) return { label: "Low UV", color: "#2ed573" };
    if (uvIndex < 6) return { label: "Moderate UV", color: "#ffa502" };
    if (uvIndex < 8) return { label: "High UV", color: "#ff7f50" };
    if (uvIndex < 11) return { label: "Very High UV", color: "#ff4757" };
    return { label: "Extreme UV", color: "#9c27b0" };
  }
  function calculateSafeExposureTime(u, skin) {
    if (!u || u <= 0 || !skin || !MINIMUM_ERYTHEMA_DOSE_VALUES[skin]) return 0;
    const MED = MINIMUM_ERYTHEMA_DOSE_VALUES[skin];
    const rate = u * 0.025 * 60;
    const mins = MED / rate;
    return Math.floor(mins);
  }

  // ===== UI UPDATES =====
  function switchTabView(tab) {
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

  function displayMessage(html) {
    messageElement.innerHTML = html;
    messageElement.style.display = "block";
  }
  function clearMessage() {
    messageElement.style.display = "none";
    messageElement.innerHTML = "";
  }

  function renderHomeView() {
    if (!uvDataCache) {
      homeContentElement.style.display = "none";
      hideLoadingIndicator();
      displayMessage(`
        <div class="card">
          <div class="card-content" style="text-align:center;padding:24px">
            <p>No UV data available.</p>
            <button id="btn-fetch">Fetch UV Data</button>
          </div>
        </div>`);
      document.getElementById("btn-fetch").onclick = ()=>fetchUVData(true);
      return;
    }
    clearMessage();
    hideLoadingIndicator();
    homeContentElement.style.display = "flex";

    const uvi = uvDataCache.now.uvi;
    if (uvi <= 2) {
      const now = new Date(uvDataCache.now.time);
      const future = getAllUVDataPoints()
        .filter(p => new Date(p.time) > now && p.uvi > 2)
        .sort((a, b) => new Date(a.time) - new Date(b.time));
      let label = Math.round(calculateSafeExposureTime(uvi, userSettings.skinType)) + " min";
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
      safeTimeElement.textContent = `Safe in the sun for ${Math.round(calculateSafeExposureTime(uvi, userSettings.skinType))} minutes`;
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

    renderUVCircleWidget();
  }

  function displayLoadingIndicator() {
    loadingElement.style.display = "flex";
    homeContentElement.style.display = "none";
    clearMessage();
  }
  function hideLoadingIndicator() {
    loadingElement.style.display = "none";
  }

  function renderUVCircleWidget() {
    const dataPoints = getAllUVDataPoints();
    if (!dataPoints.length) return;
    const currentTimestamp = uvDataCache.now.time;
    selectedSegmentTimestamp = selectedSegmentTimestamp||currentTimestamp;
    const selectedDataPoint = findClosestDataPointByTime(selectedSegmentTimestamp);

    let svg = `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">`;
    const selectedHour = new Date(selectedDataPoint.time).getHours() % 12 || 12;
    for (let hr = 1; hr <= 12; hr++) {
      const pt = dataPoints.find(p => (new Date(p.time).getHours() % 12 || 12) === hr);
      const riskColor = getUVRiskLevel(pt ? pt.uvi : 0).color;
      const startAngle = (hr * 30 - 90) * Math.PI/180;
      const endAngle = ((hr % 12 + 1) * 30 - 90) * Math.PI/180;
      const x1 = 50 + Math.cos(startAngle) * 45;
      const y1 = 50 + Math.sin(startAngle) * 45;
      const x2 = 50 + Math.cos(endAngle) * 45;
      const y2 = 50 + Math.sin(endAngle) * 45;
      svg += `<path d="M${x1.toFixed(2)} ${y1.toFixed(2)} A45 45 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}" stroke="${riskColor}" stroke-width="${pt && pt.time === selectedDataPoint.time ? 12 : 8}" fill="none"/>`;
    }
    svg += `</svg>`;
    console.log("selecteddataPoint: ", selectedDataPoint);
    const risk = getUVRiskLevel(selectedDataPoint.uvi);
    const timeToBurnMin = calculateSafeExposureTime(selectedDataPoint.uvi, userSettings.skinType);
    let burnHtml = "";
    if (selectedDataPoint.uvi > 2) {
      burnHtml = `<div class="burn-time">Burn in ${timeToBurnMin}m</div>`;
    }
    const center = `
      <div class="center-info">
        <div class="time">${formatTimeString(selectedDataPoint.time)}</div>
        <div class="uvi" style="color:${risk.color}">${selectedDataPoint.uvi.toFixed(1)}</div>
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
      const ptMatch = dataPoints.find(pt => (new Date(pt.time).getHours() % 12 || 12) === hr);
      if (ptMatch) {
        selectedSegmentTimestamp = ptMatch.time;
        renderUVCircleWidget();
      }
    };
  }

  async function fetchUVData(force=false){
    if (!isSettingsReady()){
      switchTabView("settings"); return;
    }
    displayLoadingIndicator();
    if (!force && loadUvStorage()){
      renderHomeView();
      return;
    }
    try {
      const url = `https://currentuvindex.com/api/v1/uvi?latitude=${userSettings.latitude}&longitude=${userSettings.longitude}`;
      const response = await fetch(url);
      if(!response.ok) throw new Error("HTTP "+response.status);
      const data = await response.json();
      uvDataCache = data;
      saveUvStorage(data);
      renderHomeView();
    }
    catch(err){
      hideLoadingIndicator();
      displayMessage(`<div style="padding:24px; text-align:center">
        <p>Error loading UV data. Try again later.</p>
        <button onclick="fetchUVData(true)">Retry</button>
      </div>`);
      console.error(err);
    }
  }

  function initializeApp(){
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

    tabHomeButton.onclick     = ()=>switchTabView("home");
    tabSettingsButton.onclick = ()=>switchTabView("settings");

    settingsForm.onsubmit = e=>{
      e.preventDefault();
      userSettings.latitude  = inputLatitudeElement.value.trim();
      userSettings.longitude = inputLongitudeElement.value.trim();
      userSettings.skinType  = inputSkinTypeElement.value;
      saveSettings();
      fetchUVData(true);
      switchTabView("home");
    };

    refreshButton.onclick = ()=>fetchUVData(true);

    fetchUVData(false);
  }

  window.switchTabView = switchTabView;
  window.fetchUVData   = fetchUVData;
  document.addEventListener("DOMContentLoaded", initializeApp);
})();
