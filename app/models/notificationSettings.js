const mongoose = require("mongoose");


const notificationSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Doctor",
    unique: true
  },
  notifyFirstPatientArrival: {
    isSelected: { type: Boolean, default: true },
    lastNotifiedDate: {
      morning: { type: String, default: null }, // "YYYY-MM-DD"
      evening: { type: String, default: null }, 
    },  // e.g. '2025-04-11'
  },
  notifyOnePatientRemaining: {
    isSelected: { type: Boolean, default: true },
    lastNotified: {
      morning: { type: String, default: null }, // "YYYY-MM-DD"
      evening: { type: String, default: null },
    },
  },
  
  notifyPatientMessage: {
    isSelected: { type: Boolean, default: false }
  },
  notifyShiftNinetyPercentFull: {
    isSelected: { type: Boolean, default: false },
    lastNotified: {
      morning: { type: String, default: null },
      evening: { type: String, default: null },
    },
  },
  notifyFullyBooked: {
    isSelected: { type: Boolean, default: false },
    lastNotified: {
        morning: { type: String, default: null },
        evening: { type: String, default: null },
      },
  },
   notifiedPatientAppointments: { // NEW field
    isSelected: { type: Boolean, default: true },
    type: [mongoose.Schema.Types.ObjectId],
  },
}, { timestamps: true });

module.exports = mongoose.model("NotificationSettings", notificationSchema);
