const express = require("express");
const QueueController = require("../controllers/queue");
const router = express.Router();

router.post("/", QueueController.createQueueEntry); // Create a new queue entry
router.post("/update", QueueController.updateSlot); // Update slot status
router.get("/:doctorId", QueueController.getQueue); // Get queue status for a specific doctor

module.exports = router;
