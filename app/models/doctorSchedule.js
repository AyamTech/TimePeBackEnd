// const mongoose = require('mongoose');

// const doctorScheduleSchema = new mongoose.Schema({
//   doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },

//   morningSession: {
//     enabled: { type: Boolean, default: false },
//     start: { type: String }, // Example: "08:00 AM"
//     end: { type: String },   // Example: "02:00 PM"
//   },

//   eveningSession: {
//     enabled: { type: Boolean, default: false },
//     start: { type: String }, // Example: "05:00 PM"
//     end: { type: String },   // Example: "07:00 PM"
//   },

//   appointmentDuration: { type: String, required: true }, // Example: "5 Minutes"

//   repeatEvery: { type: String, required: true }, // Example: "01"
//   repeatPeriod: { type: String, enum: ["Day", "Week", "Month"], required: true },

//   selectedDays: [{ type: Boolean, default: false }], // Array representing days of the week (Sunday to Saturday)

//   neverEnds: { type: Boolean, default: true },
//   endDate: { type: Date },

//   status: { type: String, enum: ["Active", "Inactive"], default: "Active" },

//    // New field to store pre-calculated slots for a single day
//    dailySlots: [
//     new mongoose.Schema({
//       start: { type: String, required: true },
//       end: { type: String, required: true },
//       isBooked: { type: Boolean, default: false },
//       isLocked: { type: Boolean, default: false },
//       lockedAt: { type: Date, default: null },
//       lockExpiresAt: { type: Date, default: null },
//     }, { _id: false })
//   ],
//   affectedAppointmentsDuringBreak: [
//   new mongoose.Schema({
//     appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
//     originalStart: { type: String },
//     originalEnd: { type: String },
//   }, { _id: false })
// ],

//   appointmentHistory: [
//   new mongoose.Schema({
//     appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true },
//     activeTime: { type: Date },
//     completionTime: { type: Date },
//     duration: { type: Number }, // in minutes
//   }, { _id: false })
// ],


//   createdAt: { type: Date, default: Date.now },
// });

// module.exports = mongoose.model('DoctorSchedule', doctorScheduleSchema);



const mongoose = require('mongoose');

// Sub-schema for session configuration with day selection
const sessionConfigSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  start: { type: String }, // Example: "08:00 AM"
  end: { type: String },   // Example: "02:00 PM"
  selectedDays: {
    type: [{ type: Boolean, default: false }],
    default: () => Array(7).fill(false) // Array for 7 days (Sun-Sat)
  },
}, { _id: false });

// Sub-schema for schedule sections (A, B, etc.)
const scheduleSectionSchema = new mongoose.Schema({
  sectionName: { type: String, required: true }, // "A", "B", etc.
  morningSession: sessionConfigSchema,
  eveningSession: sessionConfigSchema,
  // appointmentDuration: { type: String, required: true }, // Example: "5 Minutes"
  isActive: { type: Boolean, default: true },
  // Pre-calculated slots for this section (can be generated per day)
  dailySlots: [
    new mongoose.Schema({
      dayOfWeek: { type: Number, min: 0, max: 6 }, // 0=Sunday, 6=Saturday
      slots: [
        new mongoose.Schema({
          start: { type: String, required: true },
          end: { type: String, required: true },
          session: { type: String, enum: ["morning", "evening"], required: true },
          isBooked: { type: Boolean, default: false },
          isLocked: { type: Boolean, default: false },
          lockedAt: { type: Date, default: null },
          lockExpiresAt: { type: Date, default: null },
        }, { _id: false })
      ]
    }, { _id: false })
  ],
}, { _id: false });

const doctorScheduleSchema = new mongoose.Schema({
  doctorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Doctor", 
    required: true 
  },

  // NEW: Support for multiple schedule sections
  scheduleSections: [scheduleSectionSchema],

  // LEGACY FIELDS (for backward compatibility)
  // Keep these to support existing schedules
  morningSession: sessionConfigSchema,
  eveningSession: sessionConfigSchema,
  appointmentDuration: { type: String },
  selectedDays: {
    type: [{ type: Boolean, default: false }],
    default: () => Array(7).fill(false) // Legacy combined days
  },
  dailySlots: [
    new mongoose.Schema({
      start: { type: String, required: true },
      end: { type: String, required: true },
      session: { type: String, enum: ["morning", "evening"] }, // Track which session
      isBooked: { type: Boolean, default: false },
      isLocked: { type: Boolean, default: false },
      lockedAt: { type: Date, default: null },
      lockExpiresAt: { type: Date, default: null },
    }, { _id: false })
  ],

  // COMMON FIELDS (apply to all sections)
  repeatEvery: { type: String, required: true, default: "01" },
  repeatPeriod: { 
    type: String, 
    enum: ["Day", "Week", "Month"], 
    required: true,
    default: "Week"
  },
  neverEnds: { type: Boolean, default: true },
  endDate: { type: Date },
  status: { 
    type: String, 
    enum: ["Active", "Inactive"], 
    default: "Active" 
  },

  // Schedule metadata
  useMultipleSections: { 
    type: Boolean, 
    default: false,
    // If false, use legacy fields; if true, use scheduleSections
  },

  // Appointment tracking
  affectedAppointmentsDuringBreak: [
    new mongoose.Schema({
      appointmentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Appointment" 
      },
      originalStart: { type: String },
      originalEnd: { type: String },
      sectionName: { type: String }, // Track which section it belonged to
    }, { _id: false })
  ],

  appointmentHistory: [
    new mongoose.Schema({
      appointmentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Appointment", 
        required: true 
      },
      activeTime: { type: Date },
      completionTime: { type: Date },
      duration: { type: Number }, // in minutes
      sectionName: { type: String }, // Track which section it was from
    }, { _id: false })
  ],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Pre-save middleware to update timestamp
doctorScheduleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance method to check if using new section-based schedule
doctorScheduleSchema.methods.isUsingSections = function() {
  return this.useMultipleSections && this.scheduleSections && this.scheduleSections.length > 0;
};

// Instance method to get active sections
doctorScheduleSchema.methods.getActiveSections = function() {
  if (!this.isUsingSections()) {
    return [];
  }
  return this.scheduleSections.filter(section => section.isActive);
};

module.exports = mongoose.model('DoctorSchedule', doctorScheduleSchema);