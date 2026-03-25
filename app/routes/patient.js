const express = require("express");
const PatientController = require("../controllers/Patient");
const router = express.Router();
const authenticatePatient = require("../middleware/patientAuth");

//   router.post("/add", (req, res) => PatientController.createPatient(req, res, io));
// router.post("/loginOtp", PatientController.loginPatient); 
// router.post("/login-otp", PatientController.LoginPatient); ///
// router.post("/login", PatientController.checkPhone);
// router.post("/logout", PatientController.logout);
// router.post("/search/:patientId", authenticatePatient, PatientController.searchDoctors);
// router.get("/:patientId", PatientController.getPatient);
// router.post("/createAppointment", authenticatePatient, PatientController.bookAppointmentForExistingPatient);
// router.post("/bookAppointment",authenticatePatient, PatientController.createAppointmentByPatient);
// router.get("/searchHistory/:patientId", authenticatePatient, PatientController.getUserSearchHistory);

// router.get("/notifications/:patientId", authenticatePatient, PatientController.getNotificationHistory);
// router.put("/appointments/update-time", PatientController.updateAppointmentTime);
// router.post("/register", PatientController.registerPatient);
// router.put("/appointments/cancel", authenticatePatient, PatientController.cancelAppointment);

// router.get("/past-appointments/:patientId", authenticatePatient, PatientController.pastAppointments);

// router.get("/phone/:phoneNumber", PatientController.getPatientByPhone);

// router.post("/rating-review/:doctorId", authenticatePatient, PatientController.postRating);
// // router
// module.exports = router;

// Pass io from app to controller like appointments do
module.exports = (io) => {
  router.post("/add", (req, res) => PatientController.createPatient(req, res, io));
  router.post("/loginOtp", PatientController.loginPatient);
  router.post("/login-otp", PatientController.LoginPatient);
  router.post("/login", PatientController.checkPhone);
  router.post("/logout", PatientController.logout);
  router.post("/search/:patientId", authenticatePatient, PatientController.searchDoctors);
  router.get("/:patientId", PatientController.getPatient);
  router.post("/createAppointment", authenticatePatient, PatientController.bookAppointmentForExistingPatient);
  router.post("/bookAppointment", authenticatePatient, PatientController.createAppointmentByPatient);
  router.get("/searchHistory/:patientId", authenticatePatient, PatientController.getUserSearchHistory);
  router.get("/notifications/:patientId", authenticatePatient, PatientController.getNotificationHistory);
  router.put("/appointments/update-time", PatientController.updateAppointmentTime);
  router.post("/register", PatientController.registerPatient);
  router.put("/appointments/cancel", authenticatePatient, PatientController.cancelAppointment);
  router.get("/past-appointments/:patientId", authenticatePatient, PatientController.pastAppointments);
  router.get("/phone/:phoneNumber", PatientController.getPatientByPhone);
  router.post("/rating-review/:doctorId", authenticatePatient, PatientController.postRating);
  router.put("/checkin/:appointmentId", PatientController.markCheckIn);
  router.put("/delete", PatientController.deleteUser);

  return router;
};