const QueueService = require("../services/queue");

class QueueController {
    static async createQueueEntry(req, res) {
        try {
            const { doctorId, timeSlot } = req.body; // Get data from request body
            const newQueueEntry = await QueueService.createQueueEntry(doctorId, timeSlot);
            res.status(201).json(newQueueEntry);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async updateSlot(req, res) {
        try {
            const { doctorId } = req.body; // Get doctorId from request body
            await QueueService.updateSlotStatus(doctorId);
            res.status(200).json({ message: "Slot updated successfully" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async getQueue(req, res) {
        try {
            const { doctorId } = req.params; // Get doctorId from request parameters
            const queueStatus = await QueueService.getQueueStatus(doctorId);
            res.status(200).json(queueStatus);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = QueueController;
