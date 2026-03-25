const DoctorService = require("../services/doctorService");
// console.log('Required DoctorService from:', require.resolve('../services/DoctorService'));
console.log('DoctorService keys:', Object.keys(DoctorService));
console.log("DoctorService.getAvailabilty exists?", typeof DoctorService.getAvailability === 'function');
const path = require('path');

class DoctorController {
    // static async setAvailability(req, res) {
    //     try {
    //       const {
    //         doctorId,
    //         morningSession,
    //         eveningSession,
    //         appointmentDuration,
    //         repeatEvery,
    //         repeatPeriod,
    //         selectedDays,
    //         neverEnds,
    //         status,
    //       } = req.body; // Destructure the request body
    
    //       console.log("Received request to set availability:", req.body);
    
    //       const availability = await DoctorService.setAvailability(
    //         doctorId,
    //         morningSession,
    //         eveningSession,
    //         appointmentDuration,
    //         repeatEvery,
    //         repeatPeriod,
    //         selectedDays,
    //         neverEnds,
    //         status
    //       );
    
    //       res.status(200).json(availability);
    //     } catch (error) {
    //       console.error("Error setting availability:", error.message);
    //       res.status(500).json({ message: error.message });
    //     }
    //   }
    

    // static async getAvailability(req, res) {
    //     try {
    //         const { doctorId } = req.params; // Get doctorId from request parameters
    //         const availability = await DoctorService.getAvailability(doctorId);
    //         res.status(200).json(availability);
    //     } catch (error) {
    //         console.error("Error getting availability:", error.message);
    //         //res.status(500).json({ message: error.message });
    //     }
    // }
    

     static async setAvailability(req, res) {
       try {
    const payload = req.body;

    console.log("Received setAvailability request:", payload);

    // Basic validation
    if (!payload.doctorId) {
      return res.status(400).json({
        success: false,
        message: "Doctor ID is required"
      });
    }

    if (!payload.appointmentDuration) {
      return res.status(400).json({
        success: false,
        message: "Appointment duration is required"
      });
    }

    // Call service - it handles all validation internally
   const schedule = await DoctorService.setAvailability({
  doctorId: payload.doctorId,
  morningSession: payload.morningSession,
  eveningSession: payload.eveningSession,
  scheduleSections: payload.scheduleSections,        // ✅ PASS IT
  appointmentDuration: payload.appointmentDuration,
  repeatEvery: payload.repeatEvery || "1",
  repeatPeriod: payload.repeatPeriod || "Week",
  selectedDays: payload.selectedDays || Array(7).fill(false),
  neverEnds: payload.neverEnds !== undefined ? payload.neverEnds : true,
  status: payload.status || "Active",
  endDate: payload.endDate,
  useMultipleSections: true
});

 
    res.status(200).json({
      success: true,
      message: "Schedule saved successfully",
      data: schedule
    });
     console.log("Schedule saved successfully for doctor:", payload.doctorId);
    console.log("Saved schedule data:", schedule);
  } catch (error) {
    console.error("Error saving schedule:", error);
    
    // Return appropriate status code based on error type
    const statusCode = error.message.includes('Invalid') || 
                       error.message.includes('must') ||
                       error.message.includes('overlap') ? 400 : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to save schedule"
    });
    console.log("Error message:", error.message);
  }
      }
    

    static async getAvailability(req, res) {
        try {
    const { doctorId } = req.params;

    const availability = await DoctorService.getAvailability(doctorId);

    if (!availability) {
      return res.status(404).json({
        success: false,
        message: "No schedule found for this doctor"
      });
    }

    res.status(200).json({
      success: true,
      data: availability
    });

  } catch (error) {
    console.error("Error fetching schedule:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch schedule"
    });
  }
    }
    static async updateNextAppointment(req, res){
      try {
        const { doctorId } = req.params;
        const result = await DoctorService.updateNextAppointment(doctorId);
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }

    static async getDoctorQRCode(req, res) {
      try {
        const { doctorId } = req.params; // or req.body if you're sending it in POST body
    
        const filename = await DoctorService.getDoctorQRCode(doctorId);
    
        res.status(200).json({
          message: 'QR Code generated successfully',
          filePath: `/qr-images/${filename}`  // this is useful if you serve static files
        });
    
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to generate QR Code' });
      }
    
    }

    // static async getDoctorSlotsForToday(req, res){
    //   try {
    //     const {doctorId } = req.params;
    //     const {lat, long} = req.query;
    //     const slotData = await DoctorService.getDoctorSlotsForToday(doctorId, lat, long);
    //     res.json(slotData);
    //   } catch (error) {
    //     console.error('Error in getDoctorSlots:', error);
    //     res.status(500).json({ message: 'Internal server error' });
    //   }
    // }
    
    static async getDoctorSlotsForToday(req, res) {
  try {
    const { doctorId } = req.params;
    const { lat, long } = req.query;
    
    // Input validation
    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required' });
    }
    
    // Validate coordinates if provided
    if ((lat && !long) || (!lat && long)) {
      return res.status(400).json({ message: 'Both lat and long are required for distance calculation' });
    }
    
    const slotData = await DoctorService.getTodaySlots(doctorId, lat, long);
    
    // // Set cache headers for client-side caching
    // res.set({
    //   'Cache-Control': 'public, max-age=300', // 5 minutes
    //   'ETag': `"${doctorId}-${slotData.date}"`,
    // });
    
    res.json(slotData);
    
  } catch (error) {
    console.error('Error in getDoctorSlots:', error);
    
    if (error.message.includes('not found')) {
      res.status(404).json({ message: 'Doctor not found' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}

}

module.exports = DoctorController;
