// app/socket.js
const Patient = require("./models/patientModel");
const Appointment = require("./models/AppointmentsModel");
const Doctor = require("./models/doctorModel");
const queueManager = require("./services/queueManager");
const { haversineDistance } = require("./utils/locationUtils");

module.exports = function setupSockets(io) {
  io.on("connection", (socket) => {
    console.log("🔌 Client connected:", socket.id);

    socket.on("joinPatient", (patientId) => {
      socket.join(`patient:${patientId}`);
    });

    socket.on("joinDoctor", (doctorId) => {
      socket.join(`doctor:${doctorId}`);
    });

    socket.on("locationUpdate", async ({ patientId, appointmentId, lat, long }) => {
      try {
        await Patient.findByIdAndUpdate(patientId, {
          $set: { location: { lat, long } },
        });

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment || appointment.checkIn) return;

        const doctor = await Doctor.findById(appointment.doctorId);
        if (!doctor?.coordinates) return;

        const distance = haversineDistance(
          { lat, long },
          { lat: doctor.coordinates.lat, long: doctor.coordinates.long }
        );

        if (distance <= 10) {
          io.to(`patient:${patientId}`).emit("checkInPrompt", {
            appointmentId,
            doctorId: doctor._id,
            message: "You are near the clinic. Do you want to check in?",
          });
        }
      } catch (err) {
        console.error("locationUpdate error:", err.message);
      }
    });

    socket.on("patientCheckIn", async ({ patientId, appointmentId }) => {
      try {
        await Appointment.findByIdAndUpdate(appointmentId, { $set: { checkIn: true } });

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) return;

        await queueManager(appointment.doctorId);

        io.to(`doctor:${appointment.doctorId}`).emit("queueUpdated", {
          doctorId: appointment.doctorId,
          message: "Queue updated after patient check-in",
        });
      } catch (err) {
        console.error("patientCheckIn error:", err.message);
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });
};
