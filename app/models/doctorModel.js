const mongoose = require("mongoose");


const ratingSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true,
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Appointment",
    required: true,
  },
  experience: {
    type: Number,
    enum: [1, 2, 3, 4, 5],
    required: true,
  },
  quickFeedback: {
    type: [String],
  },
  customFeedback: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const doctorSchema = new mongoose.Schema({
    // doctorId: { type: mongoose.Schema.Types.ObjectId, auto: true },
  doctorName: { type: String, required: true },
  specialization: { type: String, required: true },
  uniqueId: { type: String, unique: true },
  contactInformation: { type: String },
  gender: { type: String, enum: ["Male", "Female", "Other"] },
  email: { type: String },
  clinicName: {type: String},
  address: {type: String, required: false},
  phoneNumber: { type: String, required: true },
  coordinates: {
    lat: { type: Number, default: null },
    long: { type: Number, default: null }
  },
  // Soft deletion fields
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deviceTokens: {
    type: [String], // array of strings
    default: [],
  },
  location: {type: String},
  symptomsTreated: {
    type: [String],
  },
  experience: {type: Number},
  consultationFee: {type: Number},
  patientCount: {type: Number},
 // Doctor model
  break: {
    isOnBreak: { type: Boolean, default: false },
    shiftDelay: { type: Number, default: 0 }, // minutes delayed
    lastBreakStart: { type: Date, default: null },
    lastBreakEnd: { type: Date, default: null },
    duration: { type: Number, default: 0 }, // minutes
    history: [
      {
        start: Date,
        end: Date,
        duration: Number, // minutes
        reason: { type: String, default: "Routine break" },
      },
    ],
},

  averageRating: {
    type: Number,
    default: 0,
  },
  reviewCount: {
    type: Number,
    default: 0,
  },
  
  ratings: [ratingSchema]
  // otpCode: { type: String },
  // otpExpiry: { type: Date },
  // isOTPUsed: { type: Boolean, default: false },
});




doctorSchema.index(
  { phoneNumber: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { isDeleted: false } 
  }
);
doctorSchema.index(
  { uniqueId: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { isDeleted: { $ne: true } },
    sparse: true 
  }
);

// AUTO-FILTER deleted doctors
doctorSchema.pre(/^find/, function (next) {
  // 'this' refers to the query object
  this.find({ isDeleted: { $ne: true } });
  next();
});

doctorSchema.pre(/^update/, function (next) {
  if (this.getOptions().includeDeleted) {
    return next();
  }
  this.where({ isDeleted: { $ne: true } });
  next();
});

doctorSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance method for soft delete
doctorSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Static method to find including deleted
doctorSchema.statics.findIncludingDeleted = function(query) {
  return this.findOne(query).setOptions({ includeDeleted: true });
};




module.exports = mongoose.model("Doctor", doctorSchema);
