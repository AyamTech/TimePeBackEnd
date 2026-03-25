const SlotHistory = require("../models/slotHistory");
const mongoose = require("mongoose");

class SlotHistoryService {
    static async logAction(doctorId, patientId, timeSlot, action) {
        const historyEntry = new SlotHistory({
            doctorId,
            patientId,
            timeSlot,
            action,
        });
        return await historyEntry.save();
    }

    static async getHistory(doctorId) {
        return await SlotHistory.find({ doctorId });
    }
}

module.exports = SlotHistoryService;
