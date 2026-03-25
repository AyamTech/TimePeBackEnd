const mongoose = require("mongoose");

const medicalRecordSchema = new mongoose.Schema({
//   recordId: { type: mongoose.Schema.Types.ObjectId, auto: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  diagnosis: { type: String, required: true },
  prescription: { type: String },
  testResults: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("MedicalRecord", medicalRecordSchema);
