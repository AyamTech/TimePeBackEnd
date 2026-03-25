// const mongoose = require('mongoose');

// const transactionHistorySchema = new mongoose.Schema({
//   appointmentId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Appointment',
//    // required: true
//   },
//   patientId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Patient',
//     required: true
//   },
//   doctorId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Doctor',
//   },
//   razorpayOrderId: {
//     type: String,
//     required: true,
//     unique: true
//   },
//   razorpayPaymentId: {
//     type: String
//   },
//   razorpaySignature: {
//     type: String
//   },
//   amount: {
//     type: Number,
//     required: true
//   },
//   currency: {
//     type: String,
//     default: 'INR'
//   },
//   method: {
//     type: String
//   },
//   status: {
//     type: String,
//     required: true,
//     enum: ['created', 'paid', 'failed', 'refunded']
//   },
//   isRefunded: {
//     type: Boolean,
//     default: false
//   },
//   refundedAmount: {
//     type: Number,
//     default: 0
//   },
//   refundReason: {
//     type: String
//   },
//   errorCode: {
//     type: String
//   },
//   errorDescription: {
//     type: String
//   },
//   date: {
//     type: Date
//   },
//   time: {
//     type: String
//   }
// }, {
//   timestamps: true
// });

// module.exports = mongoose.model('TransactionHistory', transactionHistorySchema);

const mongoose = require('mongoose');

const transactionHistorySchema = new mongoose.Schema({
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true
  },
  razorpayPaymentId: {
    type: String
  },
  razorpaySignature: {
    type: String
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  method: {
    type: String
  },
  status: {
    type: String,
    required: true,
    enum: ['created', 'paid', 'failed', 'refunded', 'expired']
  },
  isRefunded: {
    type: Boolean,
    default: false
  },
  refundedAmount: {
    type: Number,
    default: 0
  },
  refundReason: {
    type: String
  },
  errorCode: {
    type: String
  },
  errorDescription: {
    type: String
  },
  date: {
    type: Date
  },
  time: {
    type: String
  },
  // TransactionHistory Model  
expiresAt: {
  type: Date,
  index: true // For efficient cleanup queries
},
}, {
  timestamps: true,
  indexes: [
    {
      key: { createdAt: 1 },
      expireAfterSeconds: 600, // 10 minutes TTL for 'created' status
      partialFilterExpression: { status: 'created' }
    }
  ]
});

module.exports = mongoose.model('TransactionHistory', transactionHistorySchema);