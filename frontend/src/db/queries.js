// import { openDB } from './localDB';

// // ---------------- stoppages ----------------
// export const getStoppagesFromSQLite = async (db) => {
//   const [res] = await db.executeSql(
//     `
//     SELECT stop_id, name
//     FROM stoppages
//     ORDER BY name ASC
//     `
//   );
//   console.log('getStoppagesFromSQLite...........', res.rows.raw());
  
//   return res.rows.raw();
// };

// // -----------------routes -------------
// export const getRoutesFromSQLite = async () => {
//   const db = await openDB();

//   const [res] = await db.executeSql(` 
//     SELECT id, from_place, to_place, via_places, is_popular
//     FROM routesINFO
//     ORDER BY is_popular DESC, from_place ASC; 
//   `);

//   const [ress] = await db.executeSql(
//     `SELECT COUNT(*) as count FROM routesINFO`
//   );
//   // console.log("ROUTES TABLE COUNT:", ress.rows.item(0).count);

//   // await db.executeSql("DELETE FROM routesINFO");
//   // console.log("🧹 routesINFO table cleared");
//   return res.rows.raw();
// };


// // ---------------bus-list ------------
// export const getBusesByRoute = async (db, routeId) => {

//   const [res] = await db.executeSql(
//     `SELECT * FROM buses WHERE routeINFO_id = ?`,
//     [routeId]
//   );
//   const [ress] = await db.executeSql(`
//   SELECT bus_id, COUNT(*) as c
//   FROM buses
//   GROUP BY bus_id
//   HAVING c > 1
// `);

//   return res.rows.raw();
// };

// // -------------trips----------------------

// export const getBusTripsFromSQLite = async (db, busId) => {
//   const [res] = await db.executeSql(
//     `
//     SELECT trip_id, label, duration , stops_json
//     FROM bus_trips
//     WHERE bus_id = ?
//     ORDER BY trip_id
//     `,
//     [busId]
//   );
//   // console.log(res,'lets see queries');
  

//   return res.rows.raw().map(r => ({
//     trip_id: r.trip_id,
//     label: r.label,
//     duration: r.duration,
//   _stops_json: r.stops_json, // raw
//   }));
// };

import { openDB } from './localDB';

// ─── Helper ─────────────────────────────────────────────────────
// op-sqlite returns { rows: [...] } directly — no .raw() needed
// Wrapping here so every query stays clean and consistent
const exec = (db, sql, params = []) => {
  const result = db.executeSync(sql, params);
  return result.rows ?? [];
};

// ---------------- stoppages ----------------
export const getStoppagesFromSQLite = async (db) => {
  const rows = exec(db,
    `SELECT stop_id, name
     FROM stoppages
     ORDER BY name ASC`
  );
  return rows;
};

// ---------------- routes -------------------
export const getRoutesFromSQLite = async () => {
  const db = await openDB();
  const rows = exec(db,
    `SELECT id, from_place, to_place, via_places, is_popular
     FROM routesINFO
     ORDER BY is_popular DESC, from_place ASC`
  );
  console.log(rows);
  
  return rows;
};

// ---------------- bus list -----------------
export const getBusesByRoute = async (db, routeId) => {
  const rows = exec(db,
    `SELECT * FROM buses WHERE routeINFO_id = ?`,
    [routeId]
  );
  return rows;
};

// ---------------- trips --------------------
export const getBusTripsFromSQLite = async (db, busId) => {
  const rows = exec(db,
    `SELECT trip_id, label, duration, stops_json
     FROM bus_trips
     WHERE bus_id = ?
     ORDER BY trip_id`,
    [busId]
  );
  return rows.map(r => ({
    trip_id:     r.trip_id,
    label:       r.label,
    duration:    r.duration,
    _stops_json: r.stops_json,
  }));
};