
// export const createTables = async (db) => {
//   // STOPS
//   await db.executeSql(`
//     CREATE TABLE IF NOT EXISTS stoppages (
//       stop_id INTEGER PRIMARY KEY,
//       name TEXT NOT NULL
//     );
//   `);
//   await db.executeSql(`
//       CREATE INDEX IF NOT EXISTS idx_stoppages_name ON stoppages(name);
//   `);


//   // ROUTES
//   await db.executeSql(`
//     CREATE TABLE IF NOT EXISTS routesINFO (
//       id INTEGER PRIMARY KEY,
//       from_place TEXT,
//       to_place TEXT,
//       via_places TEXT,
//       is_popular INTEGER
//     );
//   `);

//   // BUSES
//   await db.executeSql(`
//     CREATE TABLE IF NOT EXISTS buses (
//       bus_id INTEGER PRIMARY KEY,
//       bus_name TEXT,
//       bus_number TEXT,
//       routeINFO_id INTEGER,
//       from_location TEXT,
//       to_location TEXT,
//       via TEXT
//     );
//   `);

//   await db.executeSql(`
//     CREATE INDEX IF NOT EXISTS idx_buses_route
//     ON buses(routeINFO_id);
//   `);

//   await db.executeSql(`
//     CREATE TABLE IF NOT EXISTS bus_trips (
//       bus_id INTEGER,
//       trip_id INTEGER,
//       label TEXT,
//       duration TEXT,
//       stops_json TEXT,
//       PRIMARY KEY (bus_id, trip_id)
//     );
//   `);

//   await db.executeSql(`
//     CREATE INDEX IF NOT EXISTS idx_bus_trips_bus
//     ON bus_trips(bus_id);
//   `);

//   await db.executeSql(`
//     CREATE TABLE IF NOT EXISTS meta (
//     key TEXT PRIMARY KEY,
//     value TEXT
//     );`
//   )


//   // console.log("✅ SQLite tables created correctly");
// };

export const createTables = (db) => {
  const exec = (sql) => db.executeSync(sql);

  // STOPPAGES
  exec(`
    CREATE TABLE IF NOT EXISTS stoppages (
      stop_id INTEGER PRIMARY KEY,
      name    TEXT NOT NULL
    );
  `);
  exec(`
    CREATE INDEX IF NOT EXISTS idx_stoppages_name
    ON stoppages(name);
  `);

  // ROUTES
  exec(`
    CREATE TABLE IF NOT EXISTS routesINFO (
      id         INTEGER PRIMARY KEY,
      from_place TEXT,
      to_place   TEXT,
      via_places TEXT,
      is_popular INTEGER
    );
  `);

  // BUSES
  exec(`
    CREATE TABLE IF NOT EXISTS buses (
      bus_id       INTEGER PRIMARY KEY,
      bus_name     TEXT,
      bus_number   TEXT,
      routeINFO_id INTEGER,
      from_location TEXT,
      to_location  TEXT,
      via          TEXT
    );
  `);
  exec(`
    CREATE INDEX IF NOT EXISTS idx_buses_route
    ON buses(routeINFO_id);
  `);

  // TRIPS
  exec(`
    CREATE TABLE IF NOT EXISTS bus_trips (
      bus_id    INTEGER,
      trip_id   INTEGER,
      label     TEXT,
      duration  TEXT,
      stops_json TEXT,
      PRIMARY KEY (bus_id, trip_id)
    );
  `);
  exec(`
    CREATE INDEX IF NOT EXISTS idx_bus_trips_bus
    ON bus_trips(bus_id);
  `);

  // META
  exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);
};
