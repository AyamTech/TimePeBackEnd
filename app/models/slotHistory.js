const mongoose = require("mongoose");

const slotHistorySchema = new mongoose.Schema({
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    timeSlot: { type: String, required: true },
    action: { type: String, enum: ["Next", "Reassigned", "Completed"], required: true },
    timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SlotHistory", slotHistorySchema);
