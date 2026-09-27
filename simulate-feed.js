// simulate-feed.js
// Simulates a real GPS/telemetry feed for one train by writing to Firebase
// Realtime Database every few seconds. Swap this out later for your real
// data source (onboard GPS device -> MQTT/REST -> this same DB write).

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // see README step 4

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://train-eta-prototype-default-rtdb.asia-southeast1.firebasedatabase.app/"
});

const db = admin.database();
const trainId = "12951";

// Static route definition — distanceKm is cumulative distance from origin
const route = [
  { name: "Mumbai Central", distanceKm: 0 },
  { name: "Vadodara Jn",    distanceKm: 340 },
  { name: "Ratlam Jn",      distanceKm: 640 },
  { name: "Kota Jn",        distanceKm: 895 },
  { name: "Mathura Jn",     distanceKm: 1195 },
  { name: "New Delhi",      distanceKm: 1384 }
];

let state = {
  currentStationIndex: 1,
  progressKm: 350,
  speedKmh: 92,
  delayMin: 6,
  lastPingTimestamp: Date.now()
};

async function pushRoute() {
  await db.ref(`trains/${trainId}/route`).set(route);
  console.log("Route written.");
}

async function tick() {
  state.progressKm = Math.min(state.progressKm + (state.speedKmh / 3600) * 5, route[route.length - 1].distanceKm);
  state.speedKmh = Math.max(20, Math.min(140, state.speedKmh + (Math.random() * 20 - 10)));
  state.lastPingTimestamp = Date.now();
  if (Math.random() < 0.08) state.delayMin = Math.max(0, state.delayMin + (Math.random() < 0.5 ? 1 : -1));

  const nextIdx = state.currentStationIndex + 1;
  if (nextIdx < route.length && state.progressKm >= route[nextIdx].distanceKm) {
    state.currentStationIndex++;
    console.log(`Arrived at ${route[state.currentStationIndex].name}`);
  }

  await db.ref(`trains/${trainId}/live`).set(state);
  console.log(`Ping -> ${state.progressKm.toFixed(1)} km, ${state.speedKmh.toFixed(0)} km/h, delay ${state.delayMin} min`);
}

(async () => {
  await pushRoute();
  await tick(); // write once immediately
  setInterval(tick, 4000); // then every 4 seconds, like a real GPS ping interval
  console.log("Simulator running. Press Ctrl+C to stop.");
})();