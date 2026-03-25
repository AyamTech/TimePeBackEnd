const SlotHistoryService = require("../services/slotHistory");

class SlotHistoryController {
    static async logAction(req, res) {
        try {
            const { doctorId, patientId, timeSlot, action } = req.body; // Get data from request body
            await SlotHistoryService.logAction(doctorId, patientId, timeSlot, action);
            res.status(200).json({ message: "Action logged successfully" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async getHistory(req, res) {
        try {
            const { doctorId } = req.params; // Get doctorId from request parameters
            const history = await SlotHistoryService.getHistory(doctorId);
            res.status(200).json(history);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = SlotHistoryController;
