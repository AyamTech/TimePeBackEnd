// const mongoose = require("mongoose");

// const queueSchema = new mongoose.Schema({
//    queueId: { type: mongoose.Schema.Types.ObjectId, auto: true },
//    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
//    timeSlot: { type: String, required: true }, // Example: "10:00 AM - 10:15 AM"
//    slotStatus: { type: String, enum: ["Waiting", "In Progress", "Completed"], default: "Waiting" },
//    currentPatient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", default: null }, // Active patient
//    queuePosition: { type: Number, required: true }, // Position in queue
//    createdAt: { type: Date, default: Date.now },
// });

// module.exports = mongoose.model("Queue", queueSchema);

const mongoose = require("mongoose");

const queueSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  timeSlot: {
    date: {
      type: String,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
  },
  slotStatus: { type: String, enum: ["Waiting", "In Progress", "Completed"], default: "Waiting" },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true }, // Linked patient
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true }, // Linked appointment
  queuePosition: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Get next available queue position for a doctor
queueSchema.statics.getNextPosition = async function (doctorId) {
  const lastEntry = await this.findOne({ doctorId }).sort({ queuePosition: -1 });
  return lastEntry ? lastEntry.queuePosition + 1 : 1;
};

module.exports = mongoose.model("Queue", queueSchema);
