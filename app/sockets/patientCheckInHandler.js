const Appointment = require("../models/AppointmentsModel");
const queueManager = require("../services/queueManager");

async function handlePatientCheckIn(io, { patientId, appointmentId }) {
  try {
    // Update DB
    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { $set: { checkIn: true} },
      { new: true }
    );

    if (!appointment) {
      console.error(`❌ Appointment not found: ${appointmentId}`);
      return;
    }

    console.log(`✅ Patient ${patientId} checked in for appointment ${appointmentId}`);

    // Run queue manager for this doctor
    await queueManager(appointment.doctorId);

    // Notify doctor via WebSocket
    io.to(`doctor_${appointment.doctorId}`).emit("queueUpdated", {
      doctorId: appointment.doctorId,
      message: "Queue updated after patient check-in",
    });
  } catch (err) {
    console.error("❌ Error in handlePatientCheckIn:", err.message);
  }
}

module.exports = handlePatientCheckIn;
