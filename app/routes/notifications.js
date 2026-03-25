// routes/notificationSettings.js

const express = require("express");
const router = express.Router();
const NotificationSettings = require("../models/notificationSettings");

const Patient = require("../models/patientModel");
const authenticatePatient = require("../middleware/patientAuth");

router.put("/settings/:doctorId", async (req, res) => {
  const { doctorId } = req.params;
  const updates = req.body;

  try {
    let settings = await NotificationSettings.findOne({ doctorId });

    if (!settings) {
      settings = new NotificationSettings({ doctorId });
    }

    // Update isSelected fields only
    Object.keys(updates).forEach((key) => {
      if (settings[key] && typeof updates[key]?.isSelected === "boolean") {
        settings[key].isSelected = updates[key].isSelected;
      }
    });

    await settings.save();
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/voice/patient/:patientId", authenticatePatient, async (req, res) => {
  const { patientId } = req.params;
  const { isSelected } = req.body;

  try {
    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Update the patient's notification settings
    if (typeof isSelected === "boolean") {
      patient.voiceAlert.isSelected = isSelected;
      await patient.save();
      res.status(200).json({ success: true, message: "Notification settings updated." });
    } else {
    console.error("Invalid request body:", req.body);
      res.status(400).json({ message: "Invalid request body." });
    }
  } catch (error) {
    console.error("Error updating patient notification settings:", error.message);
    res.status(500).json({ message: "Server error." });
  }
});

router.get('/:doctorId', async (req, res) => {
    const { doctorId } = req.params;
  
    try {
      const settings = await NotificationSettings.findOne({ doctorId });
  
      if (!settings) {
        return res.status(404).json({ message: "Notification settings not found." });
      }
  
      res.status(200).json(settings);
    } catch (error) {
      console.error("Error fetching notification settings:", error.message);
      res.status(500).json({ message: "Server error." });
    }
  });

module.exports = router;
