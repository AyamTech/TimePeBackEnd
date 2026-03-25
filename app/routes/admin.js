const express = require("express");
const AdminController = require("../controllers/admin");
const router = express.Router();


router.post("/login", AdminController.login);
router.post("/create", AdminController.createAdmin);

router.get("/doctors",  AdminController.getDoctors);
router.get("/doctors/:doctorId/patients",   AdminController.getPatientsByDoctor);

router.get("/patients", AdminController.getPatients);
// Update appointment
router.put("/update/:appointmentId", AdminController.updateAppointment);

router.get("/patients/:patientId/transactions", AdminController.getTransactionsByPatient);

router.put('/block-patient/:patientId', AdminController.blockPatient);

module.exports = router;
