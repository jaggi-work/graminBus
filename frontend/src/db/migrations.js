

// export const LATEST_SCHEMA_VERSION = 2;

// const exec = (db, sql, params = []) => {
//   db.executeSync(sql, params);
// };

// const migrateToV2 = async (db) => {
//   console.log("➡ Migrating schema to v2: adding duration to bus_trips");

//   const [res] = await db.executeSql(`PRAGMA table_info(bus_trips);`);
//   const cols = res.rows.raw().map(c => c.name);

//   if (cols.includes("duration")) {
//     console.log("duration already exists — skipping");
//     return;
//   }

//   exec( db,`
//     ALTER TABLE bus_trips
//     ADD COLUMN  duration TEXT DEFAULT NULL;
//   `);
//   console.log("✅ Migration to v2 completed");
// };


// export const runMigrations = async (db) => {

//   // ensure meta exists
//   exec(db,`
//     CREATE TABLE IF NOT EXISTS meta (
//       key TEXT PRIMARY KEY,
//       value TEXT
//     );
//   `);

//   const [res] = await db.executeSql(
//     `SELECT value FROM meta WHERE key = 'schema_version'`
//   );

//   const current = res.rows.length
//     ? Number(res.rows.item(0).value)
//     : LATEST_SCHEMA_VERSION;

//   if (current >= LATEST_SCHEMA_VERSION) return;

//   console.log(`📦 DB migrate ${current} → ${LATEST_SCHEMA_VERSION}`);

//   if (current < 2) {
//     await migrateToV2(db);
//   }

//   exec( db , 
//     `INSERT OR REPLACE INTO meta (key, value)
//      VALUES ('schema_version', ?)`,
//     [String(LATEST_SCHEMA_VERSION)]
//   );
// };


export const LATEST_SCHEMA_VERSION = 2;

// ✅ Helper — consistent with queries.js
const exec = (db, sql, params = []) => {
  db.executeSync(sql, params);
};

const query = (db, sql, params = []) => {
  const result = db.executeSync(sql, params);
  return result.rows ?? [];
};

const migrateToV2 = (db) => {
  console.log("➡ Migrating schema to v2: adding duration to bus_trips");

  // ✅ op-sqlite: executeSync, rows is plain array
  const cols = query(db, `PRAGMA table_info(bus_trips);`).map(c => c.name);

  if (cols.includes("duration")) {
    console.log("duration already exists — skipping");
    return;
  }

  exec(db, `ALTER TABLE bus_trips ADD COLUMN duration TEXT DEFAULT NULL;`);
  console.log("✅ Migration to v2 completed");
};

export const runMigrations = (db) => {
  // ✅ Everything sync — no await needed with op-sqlite
  exec(db, `
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  const rows = query(db,
    `SELECT value FROM meta WHERE key = 'schema_version'`
  );

  const current = rows.length
    ? Number(rows[0].value)
    : 0;

  if (current >= LATEST_SCHEMA_VERSION) return;

  console.log(`📦 DB migrate ${current} → ${LATEST_SCHEMA_VERSION}`);

  if (current < 2) migrateToV2(db);

  exec(db,
    `INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)`,
    [String(LATEST_SCHEMA_VERSION)]
  );
};