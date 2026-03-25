const mongoose = require("mongoose");

const searchHistorySchema = new mongoose.Schema({
  keyword: { type: String },
  location: { type: String },
  clinicNames: [String],
  specializations: [String],
  searchedAt: { type: Date, default: Date.now }
});

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  receivedAt: { type: Date, default: Date.now }  // optional timestamp
});


const patientSchema = new mongoose.Schema({
//   patientId: { type: mongoose.Schema.Types.ObjectId, auto: true },
  name: { type: String, required: true },
 patientUniqueId: {
  type: String,
  unique: true,
  sparse: true,
  index: true
},
  dateOfBirth: { type: Date},
  gender: { type: String, enum: ["Male", "Female", "Other"] },
  contactInformation: { type: String},
  email: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'createdByModel'}, // New field
  createdByModel: {
  type: String,
  enum: ['Doctor', 'Patient'],
  required: false,
  default: 'Doctor', // Keep old behavior if not explicitly set
},
  symptoms: {type: String},
  voiceAlert: {
    isSelected: { type: Boolean, default: false }
  },
  phoneNumber: { type: String},
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  medicalHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "MedicalRecord" }],
  createdAt: { type: Date, default: Date.now },
  emergencyDuration: {type: String},
  startTime: {type: Number},
  location: {
    lat: { type: Number, default: null },
    long: { type: Number, default: null }
  },
  deviceTokens: {
    type: [String], // array of strings
    default: [],
  },
  tokenVersion: { type: Number, default: 0 },
  patient_status: {
    type: String,
    enum: ['active', 'blocked'],
    default: 'active'
  },

  searchHistory: [searchHistorySchema], // embedded history
  notificationsForToday: [notificationSchema],  
  // timeSlot: { date: {type: String, // For date (e.g., 2025-03-26)
  //     required: true,
  //   },
  //   time: {
  //     type: String, // For time (e.g., "09:30 AM")
  //     required: true,
  //   },
  // },
});



patientSchema.index(
  { phoneNumber: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { isDeleted: false } 
  }
);

// AUTO-FILTER deleted doctors
patientSchema.pre(/^find/, function (next) {
  // 'this' refers to the query object
  this.find({ isDeleted: { $ne: true } });
  next();
});

// Prevent updates to deleted users
patientSchema.pre(/^update/, function (next) {
  if (this.getOptions().includeDeleted) {
    return next();
  }
  
  this.where({ isDeleted: { $ne: true } });
  next();
});

// Update timestamp on save
patientSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance method for soft delete
patientSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};
// Static method to find including deleted
patientSchema.statics.findIncludingDeleted = function(query) {
  return this.findOne(query).setOptions({ includeDeleted: true });
};

module.exports = mongoose.model("Patient", patientSchema);
