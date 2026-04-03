// import { clearStoppageCache } from '../cache/stoppageCache';
// import { clearRouteCache } from '../cache/routeCache';
// import { clearBusCache } from '../cache/busCache';
// import { clearTripCache } from '../cache/tripCache';

// import { API_URL } from '../config';


// const fetchWithRetry = async (url, retries = 3) => {
//   let lastError;
//   for (let i = 0; i < retries; i++) {
//     try {
//       const res = await fetch(url);
//       if (!res.ok) throw new Error(`HTTP ${res.status}`);
//       return res.json();
//     } catch (e) {
//       lastError = e;
//       await new Promise(r => setTimeout(r, 500 * 2 ** i));
//     }
//   }
//   throw lastError;
// };

// const getLocalVersion = async (db, key) => {
//   const [res] = await db.executeSql(
//     `SELECT value FROM meta WHERE key = ?`,
//     [key]
//   );
//   return res.rows.length ? Number(res.rows.item(0).value) : null;
// };

// /* ---------------------------------------------------
//    1. SYNC stoppages (One-Shot)
// --------------------------------------------------- */

// export const syncStoppages = async (db, serverMeta) => {
//   const remoteVersion = serverMeta.stoppages.version;
//   const localVersion = await getLocalVersion(db, "stoppages_version");

//   if (localVersion === remoteVersion) return;

//   const stoppages = await fetchWithRetry(`${API_URL}/sync/stoppages`);
//   if (!Array.isArray(stoppages)) {
//     throw new Error("Invalid stoppages payload");
//   }

//   console.log('hellooooo', stoppages);

//   await new Promise((resolve, reject) => {
//     db.transaction(tx => {
//       tx.executeSql("DELETE FROM stoppages");

//       for (const s of stoppages) {
//         tx.executeSql(
//           `INSERT INTO stoppages (stop_id, name) VALUES (?, ?)`,
//           [s.stop_id, s.name]
//         );
//       }

//       tx.executeSql(
//         `INSERT OR REPLACE INTO meta (key, value)
//          VALUES ('stoppages_version', ?)`,
//         [String(remoteVersion)]
//       );
//     }, reject, resolve);
//   });

//   console.log("✅ Stoppages synced → version", remoteVersion);
//   return true; // 👈 STOPPAGES changed
// };

// /* ---------------------------------------------------
//    1. SYNC ROUTES (One-Shot)
// --------------------------------------------------- */
// export const syncRoutes = async (db, serverMeta) => {

//   const remoteVersion = serverMeta.routes.version;
//   const localVersion = await getLocalVersion(db, "routes_version");

//   if (localVersion === remoteVersion) return;
//   // 1. Fetch JSON (Wait for network)
//   const data = await fetchWithRetry(`${API_URL}/sync/routes`);

//   console.log(`✅ Received ${data.routes.length} routes. Saving...`);

//   // 2. Write to DB (Fast & Safe)
//   await new Promise((resolve, reject) => {
//     db.transaction(tx => {
//       tx.executeSql("DELETE FROM routesINFO"); // Clear old data

//       for (const r of data.routes) {
//         tx.executeSql(
//           `INSERT INTO routesINFO (id, from_place, to_place, via_places, is_popular)
//            VALUES (?, ?, ?, ?, ?)`,
//           [r.id, r.from_place, r.to_place, r.via_places, r.is_popular ? 1 : 0]
//         );
//       }

//       // Update Version
//       tx.executeSql(
//         `INSERT OR REPLACE INTO meta (key, value) VALUES ('routes_version', ?)`,
//         [String(remoteVersion)]
//       );
//     }, reject, resolve);
//   });
//   console.log("💾 Routes saved to SQLite.");
//   return true; // 👈 ROUTES changed
// };


// /* ---------------------------------------------------
//    2. SYNC BUSES (One-Shot)
// --------------------------------------------------- */
// export const syncBuses = async (db, serverMeta) => {

//   const remoteVersion = serverMeta.buses.global_version;
//   const localVersion = await getLocalVersion(db, "buses_version");

//   if (localVersion === remoteVersion) return;

//   console.log("⬇️ Downloading buses...");

//   const data = await fetchWithRetry(`${API_URL}/sync/buses`);

//   console.log(`✅ Received ${data.buses.length} buses. Saving...`);

//   await new Promise((resolve, reject) => {
//     db.transaction(tx => {
//       tx.executeSql("DELETE FROM buses");

//       for (const b of data.buses) {
//         tx.executeSql(
//           `INSERT INTO buses 
//            (bus_id, bus_name, bus_number, routeINFO_id, from_location, to_location, via)
//            VALUES (?, ?, ?, ?, ?, ?, ?)`,
//           [b.bus_id, b.bus_name, b.bus_number, b.routeINFO_id, b.from_location, b.to_location, b.via]
//         );
//       }

//       tx.executeSql(
//         `INSERT OR REPLACE INTO meta (key, value) VALUES ('buses_version', ?)`,
//         [String(remoteVersion)]
//       );
//     }, reject, resolve);
//   });
//   console.log("💾 Buses saved to SQLite.");
//   return true; // 👈 BUSES changed
// };


// /* ---------------------------------------------------
//    3. SYNC TRIPS (One-Shot)
// --------------------------------------------------- */
// export const syncTrips = async (db, serverMeta) => {

//   const remoteVersion = serverMeta.trips.global_version;
//   const localVersion = await getLocalVersion(db, "trips_version");

//   if (localVersion === remoteVersion) return;
//   console.log("⬇️ Downloading trips...");

//   // This might take 2-3 seconds for a big file, which is fine!
//   const data = await fetchWithRetry(`${API_URL}/sync/trips`);

//   console.log(`✅ Received ${data.trips.length} trips. Saving...`, data);

//   await new Promise((resolve, reject) => {
//     db.transaction(tx => {
//       tx.executeSql("DELETE FROM bus_trips");

//       for (const t of data.trips) {
//         // We store the 'stops' array as a JSON string inside SQLite
//         tx.executeSql(
//           `INSERT INTO bus_trips (bus_id, trip_id,label, duration, stops_json)
//            VALUES (?, ?, ?, ?, ?)`,
//           [t.bus_id, t.trip_id, t.label, t.duration, JSON.stringify(t.stops)]
//         );
//       }

//       tx.executeSql(
//         `INSERT OR REPLACE INTO meta (key, value) VALUES ('trips_version', ?)`,
//         [String(remoteVersion)]
//       );
//     }, reject, resolve);
//   });
//   console.log("💾 Trips saved to SQLite.");
//   return true; // 👈 TRIPS changed
// };


// /* ---------------------------------------------------
//    MAIN EXPORT
// --------------------------------------------------- */
// export const syncAllStaticData = async (db) => {
//   try {
//     const serverMeta = await fetchWithRetry(`${API_URL}/sync/meta`);
//     // console.log('serverMeta', serverMeta);

//     const stoppagesChanged = await syncStoppages(db, serverMeta);
//     const routesChanged = await syncRoutes(db, serverMeta);
//     const busesChanged = await syncBuses(db, serverMeta);
//     const tripsChanged = await syncTrips(db, serverMeta);

//     // 🔥 invalidate memory after DB changes
//     if (stoppagesChanged) clearStoppageCache();
//     if (routesChanged) clearRouteCache();
//     if (busesChanged) clearBusCache();
//     if (tripsChanged) {
//       clearTripCache();
//       console.log("🚌 Trip data changed - ");

//     };
//   } catch (error) {
//     console.error("❌ Sync Failed:", error);
//   }
// };

import { clearStoppageCache } from '../cache/stoppageCache';
import { clearRouteCache } from '../cache/routeCache';
import { clearBusCache } from '../cache/busCache';
import { clearTripCache } from '../cache/tripCache';
import { API_URL } from '../config';

// ─── Helpers ────────────────────────────────────────────────────
const exec = (db, sql, params = []) => {
  db.executeSync(sql, params);
};

const query = (db, sql, params = []) => {
  const result = db.executeSync(sql, params);
  return result.rows ?? [];
};

const getLocalVersion = (db, key) => {
  const rows = query(db,
    `SELECT value FROM meta WHERE key = ?`, [key]
  );
  return rows.length ? Number(rows[0].value) : null;
};

const fetchWithRetry = async (url, retries = 3) => {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (e) {
      lastError = e;
      await new Promise(r => setTimeout(r, 500 * 2 ** i));
    }
  }
  throw lastError;
};

// ─────────────────────────────────────────────────────────────────
// SYNC STOPPAGES
// ─────────────────────────────────────────────────────────────────
export const syncStoppages = async (db, serverMeta) => {
  const remoteVersion = serverMeta.stoppages.version;
  const localVersion  = getLocalVersion(db, 'stoppages_version');

  if (localVersion === remoteVersion) return;

  const stoppages = await fetchWithRetry(`${API_URL}/sync/stoppages`);
  if (!Array.isArray(stoppages)) throw new Error('Invalid stoppages payload');

  // ✅ executeBatch — all inserts in one native call, fastest possible
  exec(db, `DELETE FROM stoppages`);

  db.executeBatch(
    stoppages.map(s => ({
      query:  `INSERT INTO stoppages (stop_id, name) VALUES (?, ?)`,
      params: [s.stop_id, s.name],
    }))
  );

  exec(db,
    `INSERT OR REPLACE INTO meta (key, value) VALUES ('stoppages_version', ?)`,
    [String(remoteVersion)]
  );

  console.log('✅ Stoppages synced → version', remoteVersion);
  return true;
};

// ─────────────────────────────────────────────────────────────────
// SYNC ROUTES
// ─────────────────────────────────────────────────────────────────
export const syncRoutes = async (db, serverMeta) => {
  const remoteVersion = serverMeta.routes.version;
  const localVersion  = getLocalVersion(db, 'routes_version');

  if (localVersion === remoteVersion) return;

  const data = await fetchWithRetry(`${API_URL}/sync/routes`);
  console.log(`✅ Received ${data.routes.length} routes. Saving...`);

  exec(db, `DELETE FROM routesINFO`);

  db.executeBatch(
    data.routes.map(r => ({
      query: `INSERT INTO routesINFO
                (id, from_place, to_place, via_places, is_popular)
              VALUES (?, ?, ?, ?, ?)`,
      params: [r.id, r.from_place, r.to_place, r.via_places, r.is_popular ? 1 : 0],
    }))
  );

  exec(db,
    `INSERT OR REPLACE INTO meta (key, value) VALUES ('routes_version', ?)`,
    [String(remoteVersion)]
  );

  console.log('💾 Routes saved to SQLite.');
  return true;
};

// ─────────────────────────────────────────────────────────────────
// SYNC BUSES
// ─────────────────────────────────────────────────────────────────
export const syncBuses = async (db, serverMeta) => {
  const remoteVersion = serverMeta.buses.global_version;
  const localVersion  = getLocalVersion(db, 'buses_version');

  if (localVersion === remoteVersion) return;

  console.log('⬇️ Downloading buses...');
  const data = await fetchWithRetry(`${API_URL}/sync/buses`);
  console.log(`✅ Received ${data.buses.length} buses. Saving...`);

  exec(db, `DELETE FROM buses`);

  db.executeBatch(
    data.buses.map(b => ({
      query: `INSERT INTO buses
                (bus_id, bus_name, bus_number, routeINFO_id,
                 from_location, to_location, via)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
      params: [
        b.bus_id, b.bus_name, b.bus_number, b.routeINFO_id,
        b.from_location, b.to_location, b.via,
      ],
    }))
  );

  exec(db,
    `INSERT OR REPLACE INTO meta (key, value) VALUES ('buses_version', ?)`,
    [String(remoteVersion)]
  );

  console.log('💾 Buses saved to SQLite.');
  return true;
};

// ─────────────────────────────────────────────────────────────────
// SYNC TRIPS
// ─────────────────────────────────────────────────────────────────
export const syncTrips = async (db, serverMeta) => {
  const remoteVersion = serverMeta.trips.global_version;
  const localVersion  = getLocalVersion(db, 'trips_version');

  if (localVersion === remoteVersion) return;

  console.log('⬇️ Downloading trips...');
  const data = await fetchWithRetry(`${API_URL}/sync/trips`);
  console.log(`✅ Received ${data.trips.length} trips. Saving...`);

  exec(db, `DELETE FROM bus_trips`);

  db.executeBatch(
    data.trips.map(t => ({
      query: `INSERT INTO bus_trips
                (bus_id, trip_id, label, duration, stops_json)
              VALUES (?, ?, ?, ?, ?)`,
      params: [
        t.bus_id, t.trip_id, t.label, t.duration,
        JSON.stringify(t.stops),
      ],
    }))
  );

  exec(db,
    `INSERT OR REPLACE INTO meta (key, value) VALUES ('trips_version', ?)`,
    [String(remoteVersion)]
  );

  console.log('💾 Trips saved to SQLite.');
  return true;
};

// ─────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────
export const syncAllStaticData = async (db) => {
  try {
    const serverMeta = await fetchWithRetry(`${API_URL}/sync/meta`);

    const stoppagesChanged = await syncStoppages(db, serverMeta);
    const routesChanged    = await syncRoutes(db, serverMeta);
    const busesChanged     = await syncBuses(db, serverMeta);
    const tripsChanged     = await syncTrips(db, serverMeta);

    if (stoppagesChanged) clearStoppageCache();
    if (routesChanged)    clearRouteCache();
    if (busesChanged)     clearBusCache();
    if (tripsChanged) {
      clearTripCache();
      console.log('🚌 Trip data changed');
    }
  } catch (error) {
    console.error('❌ Sync Failed:', error);
  }
};
