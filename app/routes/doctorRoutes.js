const express = require("express");
const { setAvailability, getAvailability, updateNextAppointment, getDoctorQRCode, getDoctorSlotsForToday } = require("../controllers/DoctorSchedule");
const router = express.Router();
const authenticatePatient = require("../middleware/patientAuth");

router.post("/set-availability", (req, res) => setAvailability(req, res));
router.get("/availability/:doctorId", (req, res) => getAvailability(req, res));
router.patch("/appointment/:doctorId", (req, res) => updateNextAppointment(req, res, req.app.get("io")));
router.get('/:doctorId/qrcode', (req, res) => getDoctorQRCode(req, res));
router.get("/details/:doctorId", (req, res) => getDoctorSlotsForToday(req, res));

module.exports = router;