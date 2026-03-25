const mongoose = require("mongoose");

const InvoiceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true
    },

    customer: {
      name: String,
      accountNumber: String,
      phone: String
    },

    appointment: {
      doctorName: String,
      doctorId: String,
      doctorPhone: String,
      slot: String
    },

    amount: {
      type: Number,
      required: true
    },

    total: {
      type: Number,
      required: true
    },

    bookedAt: {
      type: Date,
      required: true
    },

    signedAt: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["DRAFT", "FINAL"],
      default: "FINAL"
    },

    download: {
      count: {
        type: Number,
        default: 0
      },
      lastDownloadedAt: Date
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Invoice", InvoiceSchema);
