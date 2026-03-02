import express from 'express';
import db from '../../config/db.js';
import jwt from 'jsonwebtoken';

const router = express.Router();


router.post('/auth/request-otp', async (req, res) => {
    const { mobile } = req.body;
    console.log(mobile);
    
    // 1. Check if the driver is pre-authorized
    const [driver] = await db.query("SELECT * FROM drivers WHERE mobile = ? ", [mobile]);
    console.log(driver);

    if (!driver) {
        return res.status(403).json({ message: "Access Denied: Mobile number not registered." });
    }

    // 2. If authorized, generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000);
    const expiry = new Date(Date.now() + 5 * 60000);

    // 3. Store OTP in the existing record
    await db.query("UPDATE drivers SET otp_code = ?, otp_expiry = ? WHERE mobile = ?", [otp, expiry, mobile]);

    otpStore[mobile] = { otp, expiry }; // For demo purposes only
    // 4. Send SMS (Twilio/Firebase/etc)
    console.log(`Sending OTP ${otp} to ${mobile}`); 
    res.status(200).json({ message: "OTP sent successfully" });
});

let otpStore = {}; // In-memory store for OTPs (for demo purposes only)


router.post('/auth/verify-otp', async (req, res) => {
    const { mobile, otp } = req.body;
    const JWT_SECRET = "your_super_secret_key_123"; // Keep this hidden!

    // 1. FIND THE DRIVER
    const [rows] = await db.query("SELECT * FROM drivers WHERE mobile = ?", [mobile]);
    const driver = rows[0];

    // 2. CHECK THE CODE AND TIME
    if (!driver || driver.otp_code !== otp || new Date() > driver.otp_expiry) {
        return res.status(401).json({ message: "Wrong code or code expired!" });
    }

    // 3. CREATE THE BADGE (JWT)
    // We put the Bus ID inside the badge so the app knows where to go!
    // const token = jwt.sign(
    //     { 
    //         id: driver.id, 
    //         role: driver.role, 
    //         bus_id: driver.bus_id 
    //     }, 
    //     JWT_SECRET, 
    //     { expiresIn: '24h' } // The driver stays logged in for a day
    // );

    // 4. CLEAR THE OTP: Once used, delete it from the DB for safety
    await db.query("UPDATE drivers SET otp_code = NULL, otp_expiry = NULL WHERE id = ?", [driver.id]);

    // 5. SEND EVERYTHING TO FRONTEND
    res.json({
        message: "Login Successful",
        // token: token,
        bus_id: driver.bus_id, // Front-end uses this to redirect
        driver_name: driver.driver_name
    });
});

// app.post('/auth/verify-otp', async (req, res) => {
//     const { mobile, otp } = req.body;

//     const [driver] = await db.query("SELECT * FROM drivers WHERE mobile = ?", [mobile]);

//     if (driver.otp_code !== otp || new Date() > driver.otp_expiry) {
//         return res.status(401).json({ message: "Invalid or expired OTP" });
//     }

//     // Generate token including the bus_id
//     const token = jwt.sign(
//         { 
//             id: driver.id, 
//             role: 'driver', 
//             bus_id: driver.bus_id 
//         }, 
//         process.env.JWT_SECRET
//     );

//     res.json({ 
//         token, 
//         bus_id: driver.bus_id // UI will use this to route the driver
//     });
// });

export default router;