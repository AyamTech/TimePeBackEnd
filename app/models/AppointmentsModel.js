
const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
  doctorname: { type: String},
  patientName: { type: String},
  doctorUniqueId: { type: String},
  patientUniqueId: { type: String},
  doctorPhone: { type: String},
  patientPhone: { type: String},
  hasInvoice: { type: Boolean, default: false },
  appointmentDate: { type: Date, required: true },
  startTime: {
      type: String,
      required: true,
  
  },
 // timeSlot: {type: String},
  endTime: {type: String, required: true},
  currentStart: {type: String},
  currentEnd: {type: String},
  symptom: { type: String }, // Copy of patient's symptoms
 
  checkIn: { type: Boolean, default: false },
 
  status: { type: String, enum: ["Active", "Completed", "Pending", "Processing", "Cancelled"], default: "Pending" },
  paymentStatus: { type: String, enum: ["pending", "confirmed", "skipped"], default: "pending" },
  activeTime: { type: Date, default: null },
  completionTime: { type: Date, default: null },
  latitude: {type: String, required: true},
  longitude: {type: String, required: true},
  createdBy: {type: String, enum: ["Patient", "Doctor"]},
  emergencyDuration: {type: String},
  // Appointment Model
paymentTimeout: {
  type: Date,
  index: true // For efficient cleanup queries
},
 matrixData: {
    travelModes: {
      driving: {
        distanceInKm: { type: Number, default: null },
        durationInMinutes: { type: Number, default: null },
        distanceText: { type: String, default: null },
        durationText: { type: String, default: null },
        source: { type: String, default: "google" }
      },
      walking: {
        distanceInKm: { type: Number, default: null },
        durationInMinutes: { type: Number, default: null },
        distanceText: { type: String, default: null },
        durationText: { type: String, default: null },
        source: { type: String, default: "google" }
      }
    },
    lastUpdated: { type: Date, default: null }
  },
  createdAt: { type: Date},
});

module.exports = mongoose.model("Appointment", appointmentSchema);
