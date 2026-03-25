const Appointment = require("../models/AppointmentsModel");
const Doctor = require("../models/doctorModel");
const Patient = require("../models/patientModel");
const {haversineDistance} = require("../utils/locationUtils");
const admin = require("../utils/firebase/firebaseAdmin"); // FCM instance

async function handleLocationUpdate(io, data) {
  const { patientId, appointmentId, lat, long } = data;

  try {
    // Fetch appointment and doctor
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return;

    const doctor = await Doctor.findById(appointment.doctorId);
    if (!doctor || !doctor.coordinates) return;
    console.log("📍 Doctor coordinates:", doctor.coordinates);
    // Calculate distance
    const distance = haversineDistance(
      lat,
      long,
      doctor.coordinates.lat,
      doctor.coordinates.long
    );
    console.log("lat and long:", lat, long);
    console.log("📍 Calculated distance (m):", distance);

    console.log(`📍 Patient ${patientId} is ${distance.toFixed(2)}m from clinic`);

    if (distance <= 10) {
      // Send WebSocket event to patient
      io.to(`patient_${patientId}`).emit("checkInPrompt", {
        appointmentId,
        message: "You are near the clinic. Do you want to check in?",
      });

      // Send FCM push notification
      const patient = await Patient.findById(patientId);
      if (patient?.deviceTokens?.length > 0) {
        const messages = patient.deviceTokens.map((token) => ({
          token,
          notification: {
            title: "Clinic Nearby",
            body: "You are near the clinic. Tap to check in.",
          },
          data: {
            appointmentId: appointmentId.toString(),
            type: "check_in_prompt",
          },
        }));

        await Promise.all(
          messages.map((msg) => admin.messaging().send(msg))
        );

        console.log(`✅ FCM notification sent to Patient ${patientId}`);
      }
    }
  } catch (err) {
    console.error("❌ Error in handleLocationUpdate:", err.message);
  }
}

module.exports = handleLocationUpdate;
