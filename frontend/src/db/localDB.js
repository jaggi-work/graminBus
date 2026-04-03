
// import SQLite from 'react-native-sqlite-storage';
// import { createTables } from './schema';
// import { runMigrations } from './migrations';
// SQLite.enablePromise(true);
// SQLite.DEBUG(false);

// let dbInstance = null;
// let openingPromise = null;

// export const openDB = async () => {
//   if (dbInstance) return dbInstance;

//   if (openingPromise) return openingPromise;

//   openingPromise = (async () => {
//     const db = await SQLite.openDatabase({
//       name: 'graminbus.db',
//       location: 'default',
//     });

//     await createTables(db); 
//     await runMigrations(db);
//     dbInstance = db;
//     return db;
//   })();

//   return openingPromise;
// };

import { open } from '@op-engineering/op-sqlite';
import { createTables } from './schema';
import { runMigrations } from './migrations';

let dbInstance = null;
let openingPromise = null;

export const openDB = async () => {
  if (dbInstance) return dbInstance;
  if (openingPromise) return openingPromise;

  openingPromise = (async () => {
    // ✅ op-sqlite open() is synchronous — no await needed
    // Same database file, same location — nothing to migrate
    const db = open({ name: 'graminbus.db' });

    await createTables(db);
    await runMigrations(db);
    dbInstance = db;
    return db;
  })();

  return openingPromise;
};

