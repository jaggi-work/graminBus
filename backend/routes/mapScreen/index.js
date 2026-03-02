var express = require("express");
var router = express.Router();
const db = require("../../config/db.js");




router.get('/areas', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT name, latitude, longitude FROM stoppages');
        res.json(rows);

    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching areas");
    }
});



router.get("/bus-location/:bus_id", async (req, res) => {
    try {
        const { bus_id } = req.params;
        const [rows] = await db.query(
            `SELECT latitude, longitude ,rotation , current_stop_id, upcoming_stop_id
            FROM bus_locations 
            WHERE bus_id = ?`,
            [bus_id]
        );

        if (rows.length === 0) {
            return res.json({ success: false, message: "Bus not broadcasting" });
        }

        return res.json(rows[0]);
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});



router.post("/update-location", async (req, res) => {
  const { busId, currentStopId } = req.body; // driver app can send the nearest stop id
  if (!busId || !currentStopId) return res.status(400).json({ error: "busId and currentStopId required" });

  await db.query(
    "INSERT INTO bus_locations (bus_id, current_stop_id, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE current_stop_id=VALUES(current_stop_id), updated_at=NOW()",
    [busId, currentStopId]
  );
  res.json({ success: true });
});






module.exports = router;