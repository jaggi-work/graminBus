import express from 'express';
import db from '../../config/db.js';

const router = express.Router();

// 4️⃣ Get ALL Stoppages at once
router.get('/stoppages', async (req, res) => {
    try {
        const sql = `SELECT stop_id, name FROM stoppages ORDER BY name ASC`;
        const [rows] = await db.query(sql);
        res.json(rows);
        // res.json({
        //   stoppages: rows
        // });
    } catch (err) {
        console.error("Sync Stoppages Error:", err);
        res.status(500).json({ error: "Failed to sync stoppages" });
    }
});


// 1️⃣ Get ALL Routes at once
router.get('/routes', async (req, res) => {
    try {
        const sql = `
      SELECT id, from_place, to_place, via_places, is_popular
      FROM routesINFO
    `;
        const [rows] = await db.query(sql);

        // Add a simple version number (timestamp) for client checking

        res.json({
            routes: rows
        });
    } catch (err) {
        console.error("Sync Routes Error:", err);
        res.status(500).json({ error: "Failed to sync routes" });
    }
});

// 2️⃣ Get ALL Buses at once
router.get('/buses', async (req, res) => {
    try {
        // No WHERE clause -> Gets everything
        const sql = `
      SELECT bus_id, bus_name, bus_number, routeINFO_id, 
      from_location, to_location, via 
      FROM buses
    `;
        const [rows] = await db.query(sql);

        res.json({
            // You can implement real versioning later, for now using current time
            buses: rows
        });
    } catch (err) {
        console.error("Sync Buses Error:", err);
        res.status(500).json({ error: "Failed to sync buses" });
    }
});

// 3️⃣ Get ALL Trips at once (The Big One)
router.get('/trips', async (req, res) => {
    try {
        // Identical to your /bus/:id query, but we REMOVED the "WHERE bus_id = ?"
        const sql = `
      SELECT 
        t.bus_id,  -- Added this so we know which bus owns the trip
        t.id AS trip_id, 
        t.label AS trip_label, 
        ts.stop_order, 
        ts.departure_time, 
        s.stop_id AS stoppage_id, 
        s.name AS stoppage_name
      FROM trips t
      JOIN trip_stoppages ts ON ts.trip_id = t.trip_id
      JOIN stoppages s ON s.stop_id = ts.stop_id
      ORDER BY t.bus_id, t.id, ts.stop_order;
    `;

        const [rows] = await db.query(sql);

        const tripsMap = {};

        rows.forEach(row => {
            // Use a unique key for map (Trip ID is unique)
            if (!tripsMap[row.trip_id]) {
                tripsMap[row.trip_id] = {
                    bus_id: row.bus_id, // Critical: Client needs this to link to bus
                    trip_id: row.trip_id,
                    label: row.trip_label,
                    stops: []
                };
            }

            tripsMap[row.trip_id].stops.push({
                stop_id: row.stoppage_id,
                name: row.stoppage_name,
                departure_time: row.departure_time,
                stop_order: row.stop_order
            });
        });

        res.json({
            trips: Object.values(tripsMap) // Returns a giant array of all trips
        });

    } catch (error) {
        console.error("Sync Trips Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});


router.get("/meta", async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT entity, version FROM data_versions`
        );

        const meta = {};
        rows.forEach(r => {
            meta[r.entity] = { version: r.version };
        });

        res.json({
            schema_version: 1,
            stoppages: meta.stoppages,
            routes: meta.routes,
            buses: {
                global_version: meta.buses.version
            },
            trips: {
                global_version: meta.trips.version
            },
            generated_at: Date.now()
        });
    } catch (err) {
        console.error("Meta fetch failed:", err);
        res.status(500).json({ error: "Failed to fetch meta" });
    }
});



export default router;
