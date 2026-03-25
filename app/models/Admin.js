const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
//   adminId: { type: mongoose.Schema.Types.ObjectId, auto: true },
  username: { type: String, required: true },
  email: { type: String,  unique: true },
  password: { type: String, required: true},
  role: { type: String, enum: ["Admin"]},
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Admin", adminSchema);
