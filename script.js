import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, push, set, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";



alert("script.js loaded");
let historyCache = [];

let currentData = {
  ph: null,
  glucose: null,
  lactose: null,
  lactose_percent: null,
  temp: null,
  timestamp: null
};

// 🔴 Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDhBOw31W8JN0uKvbX6aey0HW-S2FBmh_w",
  databaseURL: "https://lactosense-89230-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "lactosense-89230",
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// References
const latestRef = ref(db, "device1/latest");
const historyRef = ref(db, "device1/history");

// UI elements
const phEl = document.getElementById("ph");
const glucoseEl = document.getElementById("glucose");
const lactoseEl = document.getElementById("lactose");
const tempEl = document.getElementById("temp");
const statusEl = document.getElementById("status");
const recordsList = document.getElementById("records");

// State

let recordedData = null;

// --- LIVE DATA ---
// --- LIVE DATA ---
onValue(latestRef, (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  currentData = data;

  // Update live UI
  phEl.innerText = data.ph.toFixed(2);
  tempEl.innerText = data.temp ?? "--";

  // ⏱️ Check device online/offline
  const now = Date.now();
  const lastUpdate = data.timestamp;

  const statusText = document.getElementById("systemStatusText");

  if (!lastUpdate || (now - lastUpdate) > 15000) {
    // ❌ Offline
    statusText.innerText = "🔴 Device Offline";
    statusText.className = "text-red-400 font-bold";
  } else {
    // ✅ Online
    statusText.innerText = "🟢 Cloud Connected";
    statusText.className = "text-green-400 font-bold";
  }
});



// --- BUTTONS ---

//----Clear-----
const clearBtn = document.getElementById("clearBtn");
import { remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

clearBtn.addEventListener("click", async () => {
  if (!confirm("Are you sure you want to clear all history?")) return;

  const historyRef = ref(db, "device1/history");

  try {
    await remove(historyRef);
    document.getElementById("message").innerText = "🧹 History cleared.";
  } catch (err) {
    console.error(err);
    alert("Failed to clear history!");
  }
});

// NEW
document.getElementById("newBtn").onclick = () => {
  messageEl.innerText = "🆕 Ready for new sample. Insert sample and click Record.";
};

// RECORD
let phSamples = [];
let isRecording = false;
let stabilizeSeconds = 5; // change to 5 for faster demo if needed

const messageEl = document.getElementById("message");

document.getElementById("recordBtn").onclick = () => {

  if (isRecording) return;

  // Check if UI has at least glucose or pH
  const uiGlucose = Number(document.getElementById("glucose").innerText);
  const uiPh = Number(document.getElementById("ph").innerText);

  if (isNaN(uiGlucose) && isNaN(uiPh)) {
    alert("No data to record yet!");
    return;
  }


  isRecording = true;
  phSamples = [];

  let t = stabilizeSeconds;
  messageEl.innerText = `⏳ Stabilizing... ${t} seconds`;

  const timer = setInterval(() => {

    // Collect pH samples during countdown
    if (currentData && typeof currentData.ph === "number") {
      phSamples.push(currentData.ph);
    }

    t--;
    messageEl.innerText = `⏳ Stabilizing... ${t} seconds`;

    if (t <= 0) {
      clearInterval(timer);

      // Compute average pH
      let avgPh = currentData.ph;
      if (phSamples.length > 0) {
        let sum = 0;
        phSamples.forEach(v => sum += v);
        avgPh = sum / phSamples.length;
      }

      // Prepare final saved data
   const finalData = {
  ...currentData,
  ph: Number(avgPh.toFixed(2)),

  // 🔥 FORCE USING UI VALUES (manual override safe)
  glucose: Number(document.getElementById("glucose").innerText),
  lactose: Number(document.getElementById("lactose").innerText),
  lactose_percent: parseFloat(
    document.getElementById("lactose_percent").innerText
  ),

  savedAt: Date.now()
};

      // Save to Firebase
      const newRef = push(historyRef);
      set(newRef, finalData).then(() => {
        messageEl.innerText = "✅ Sample recorded and saved successfully!";
        isRecording = false;
      }).catch(err => {
        console.error(err);
        messageEl.innerText = "❌ Save failed!";
        isRecording = false;
      });
    }

  }, 1000);
};

const glucometerInput = document.getElementById("glucometerInput");
const applyGlucoBtn = document.getElementById("applyGlucoBtn");

applyGlucoBtn.addEventListener("click", () => {
  const glucose = parseFloat(glucometerInput.value);

  if (isNaN(glucose) || glucose <= 0) {
    alert("Please enter a valid glucometer reading!");
    return;
  }

  // --- Lactose calculation ---
  let lactose = glucose * 1.9;
  lactose = lactose * 1.02;
  lactose = lactose * 4;
  lactose = lactose * 1.26;

  const lactosePercent = (lactose / 1000).toFixed(2);

  console.log("Apply clicked:");
  console.log("Glucose:", glucose);
  console.log("Lactose:", lactose);

  // --- FORCE UPDATE UI ---
  const gEl = document.getElementById("glucose");
  const lEl = document.getElementById("lactose");
  const lpEl = document.getElementById("lactose_percent");

  console.log("Elements:", gEl, lEl, lpEl);

  gEl.innerText = glucose.toFixed(0);
  lEl.innerText = lactose.toFixed(0);
  lpEl.innerText = lactosePercent + " %";

  // --- UPDATE DATA OBJECT USED BY RECORD ---
  if (!currentData) currentData = {};

  currentData.glucose = glucose;
  currentData.lactose = parseFloat(lactose.toFixed(0));
  currentData.lactose_percent = parseFloat(lactosePercent);
  currentData.timestamp = Date.now();

  messageEl.innerText = "🧪 Glucometer value applied. Ready to record.";
  // Clear input box after applying
glucometerInput.value = "";

});




// --- SHOW SAVED RECORDS ---
onValue(historyRef, (snapshot) => {
  const data = snapshot.val();

  console.log("History data:", data); // DEBUG

  recordsList.innerHTML = "";

  if (!data) {
    recordsList.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4 text-gray-500">No records yet.</td>
      </tr>
    `;
    return;
  }

  const entries = Object.values(data).reverse();
  historyCache = entries;   // ✅ THIS IS THE FIX


  entries.forEach((rec) => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-gray-800 transition";

    const time = new Date(rec.timestamp).toLocaleString();

    tr.innerHTML = `
      <td class="py-2 px-3 whitespace-nowrap">${time}</td>
      <td class="py-2 px-3">${rec.ph}</td>
      <td class="py-2 px-3">${rec.glucose}</td>
      <td class="py-2 px-3">${rec.lactose}</td>
      <td class="py-2 px-3">${rec.lactose_percent}</td>
    `;

    recordsList.appendChild(tr);
  });
});

// ---------- EXPORT CSV ----------
document.getElementById("exportBtn").onclick = () => {
  if (!historyCache || historyCache.length === 0) {
    alert("No data to export!");
    return;
  }

  // CSV header
  let csv = "Date;Time;pH;Glucose;Lactose(mg/dL);Lactose(%)\n";

historyCache.forEach(e => {
  const d = new Date(e.savedAt || e.timestamp);

  const dateStr = d.toISOString().split("T")[0];   // YYYY-MM-DD
  const timeStr = d.toTimeString().split(" ")[0];  // HH:MM:SS

  const ph = Number(e.ph).toFixed(2);
  const glucose = Number(e.glucose).toFixed(0);
  const lactose = Number(e.lactose).toFixed(0);
  const lp = Number(e.lactose_percent).toFixed(2);

  csv += `${dateStr};${timeStr};${ph};${glucose};${lactose};${lp}\n`;
});




  // Create file
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "lactosense_data.csv";
  a.click();

  window.URL.revokeObjectURL(url);
};


