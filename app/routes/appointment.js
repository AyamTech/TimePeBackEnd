// const express = require("express");
// const AppointmentController = require("../controllers/appointment");
// const router = express.Router();

// const authenticatePatient = require("../middleware/patientAuth");
// const authenticateDoctor = require("../middleware/doctorAuth");

// router.post("/", AppointmentController.createAppointment);
// router.get("/:appointmentId", AppointmentController.getAppointment);
// router.get("/doctor/:doctorId", AppointmentController.getAppointmentsByDoctor);
// router.get("/doctor/today/:doctorId", AppointmentController.getTodayAppointments);
// router.get("/doctor/todays/:doctorId", AppointmentController.getTodaysAppointments);
// router.get("/doctor/active/:doctorId", AppointmentController.getTodaysActiveOrPendingAppointments);
// router.get("/doctor/availability/:doctorId", AppointmentController.getAvailableSlots);
// router.put("/reorder/:doctorId", AppointmentController.reorderAppointments);


// router.patch("/break/updatetime", AppointmentController.updateAppointmentTime);
// router.patch("/break/decreaseTime", AppointmentController.shiftTodayAppointmentsBackwards);

// router.get("/patient/today/:patientId", authenticatePatient, AppointmentController.getTodaysAppointmentsByPatient);

// module.exports = router;

const express = require("express");
const AppointmentController = require("../controllers/appointment");
const router = express.Router();

const authenticatePatient = require("../middleware/patientAuth");
const authenticateDoctor = require("../middleware/doctorAuth");

router.post("/", (req, res) => AppointmentController.createAppointment(req, res, req.app.get("io")));
router.get("/:appointmentId", (req, res) => AppointmentController.getAppointment(req, res));
router.get("/doctor/:doctorId", (req, res) => AppointmentController.getAppointmentsByDoctor(req, res));
router.get("/doctor/today/:doctorId", (req, res) => AppointmentController.getTodayAppointments(req, res));
router.get("/doctor/todays/:doctorId", (req, res) => AppointmentController.getTodaysAppointments(req, res));
router.get("/doctor/active/:doctorId", (req, res) => AppointmentController.getTodaysActiveOrPendingAppointments(req, res));
router.get("/doctor/availability/:doctorId", (req, res) => AppointmentController.getAvailableSlots(req, res));
router.put("/reorder/:doctorId", (req, res) => AppointmentController.reorderAppointments(req, res, req.app.get("io")));
router.patch("/break/updatetime", (req, res) => AppointmentController.updateAppointmentTime(req, res, req.app.get("io")));
router.patch("/break/decreaseTime", (req, res) => AppointmentController.shiftTodayAppointmentsBackwards(req, res, req.app.get("io")));
router.post("/cancel", (req, res) => AppointmentController.cancelAppointment(req, res, req.app.get("io")));
router.get("/patient/today/:patientId", authenticatePatient, (req, res) => AppointmentController.getTodaysAppointmentsByPatient(req, res));

module.exports = (io) => {
  router.io = io;
  return router;
};