const PatientService = require("../services/PatientService");

class PatientController {
    // static async createPatient(req, res) {
    //     try {
    //         const patientData = req.body; // Get patient data from request body
    //         const newPatient = await PatientService.createPatient(patientData);
    
    //         res.status(201).json({ message: "Patient and appointment created.",  newPatient});
    //     } catch (error) {
    //         console.error("Error creating patient:", error.message);
    //         res.status(500).json({ message: 'An error occurred while processing your request.' });
    //     }
    // }

    static async createPatient(req, res, io) {
  try {
    const patientData = req.body;
    console.log("patientData in controller:", patientData);
    const newPatient = await PatientService.createPatient(io, patientData);
    if(newPatient.error && newPatient.error.message == "broadCastQueue is not a function"){
      delete newPatient.error;
    }

    res.status(201).json({ message: "Patient and appointment created.", newPatient });
  } catch (error) {
    if(error.message === "broadCastQueue is not a function"){
      delete error.message;
      return res.status(201).json({ message: "Patient and appointment created.", newPatient: error.patient });
    }
    console.error("Error creating patient:", error.message);
    res.status(500).json({ message: "An error occurred while processing your request." });
  }
}

    
    static async LoginPatient(req, res) {
        try {
          console.log("Received request to login", req.body);
    
          const { phoneNumber, deviceToken, lat, long } = req.body; // Extract phone number from request body
          const user= await PatientService.LoginPatient(phoneNumber, deviceToken, lat, long); // Call the login method from UserService
          console.log("User to be logged in is ", user);
    
          res.status(200).json(user);
        } catch (error) {
          res.status(401).json({ message: error.message });
          console.log("error", error);
        }
      }

    static async loginPatient(req, res) {
        try {
          console.log("Received request to login", req.body);
    
          const { phoneNumber, accessToken, deviceToken, lat, long } = req.body; // Extract phone number from request body
          const user= await PatientService.loginPatient(phoneNumber, accessToken, deviceToken, lat, long); // Call the login method from UserService
          console.log("User to be logged in is ", user);
    
          res.status(200).json(user);
        } catch (error) {
          res.status(401).json({ message: 'An error occurred while processing your request.' });
          console.log("error", error);
        }
      }
      
    
      static async checkPhone(req, res){
        try{
            console.log("Received request to login via phone", req.body);
            const {phoneNumber} = req.body;
            const user = await PatientService.checkPhone(phoneNumber);
            console.log("User to be logged in is ", user);

            res.status(200).json(user);

        } catch(error){
            res.status(401).json({ message: 'An error occurred while processing your request. Please try again later' });
            console.log("error", error);
        }
      }
      static async logout(req, res) {
        try {
          // 1. Extract token from Authorization header
          const authHeader = req.headers.authorization;
          const {deviceToken} =  req.body;
          if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Authorization token missing" });
          }
      
          const token = authHeader.split(" ")[1];
      
          // 2. Pass token to service layer to handle logout
          await PatientService.logout(token, deviceToken);
      
          return res.status(200).json({ message: "Logout successful" });
        } catch (error) {
          return res.status(400).json({ message:"Logout failed" });
        }
      }

      static async registerPatient(req, res){
        try{
      const data = req.body;
      const result = await PatientService.registerPatient(data);
      res.status(201).json({result, message: "Registration successful"});
        } catch(error){
            return res.status(400).json({ message: error.message || "Registration failed. Please try again later." } );
        }
      }

    static async getPatientByPhone(req, res){

      const {phoneNumber} = req.params;

      const result = await PatientService.getPatientByPhone(phoneNumber);
       res.status(200).json(result);
    }

    static async getPatient(req, res) {
        try {
            const { patientId } = req.params; // Get patientId from request parameters
            const patient = await PatientService.getPatient(patientId);
            res.status(200).json(patient);
        } catch (error) {
           // console.error("Error getting patient:", error.message);
            res.status(500).json({ message: 'An error occurred while processing your request. Please try again later' });
        }
    }

  
     static async searchDoctors(req, res) {
      try {
        console.log("Received search request", req.body);
        console.log("Received search request params", req.params);
        const {lat, long, filters} = req.body; // receive full search payload
        const {patientId} = req.params;
        const results = await PatientService.searchDoctors(patientId, lat, long, filters);
        res.status(200).json(results);
      } catch (err) {
        res.status(500).json({ message: 'An error occurred while processing your request. Please try again later' });
      }
    }

    static async bookAppointmentForExistingPatient(req, res){
      try {
        const { doctorId, patientId, symptom } = req.body;
    
        const appointment = await PatientService.bookAppointmentForExistingPatient({
          doctorId,
          patientId,
          symptom,
        });
    
        res.status(201).json({
          message: "Appointment booked successfully.",
          appointment,
        });
      } catch (error) {
        console.error("Error booking appointment:", error.message);
        res.status(500).json({ error: `An error occurred while processing your request. Please try again later` });
      }
    }

    static async createAppointmentByPatient(req, res){
      try{
          const {doctorId, patientId, startTime, symptom, lat, long, createdBy} = req.body;

          const appointment = await PatientService.createAppointmentByPatient({
            doctorId,
            patientId,
            startTime, 
            symptom,
            lat,
            long,
            createdBy
          });
          res.status(200).json({
            message: "Appointment booked successfully.",
            appointment,
          });

      } catch(error){
          // console.error("Error booking appointment:", error.message);
            res.status(500).json({ message: 'An error occurred while processing your request. Please try again later.' });
      }
    }
    
    static async getNotificationHistory (req, res){
      try{
        const {patientId} = req.params;
        const notifications = await PatientService.getNotificationHistory(patientId);
        res.status(200).json({
          message: "Notification history fetched successfully.",
          notifications
        });
      }
      catch(error){
        console.error("Error fetching notification history:", error.message);
        res.status(500).json({ message: `An error occurred while processing your request. Please try again later` });
      }
    }
  static async getUserSearchHistory(req, res){
    try {
    const { patientId } = req.params;
    const { limit } = req.query;

    const history = await PatientService.getUserSearchHistory(patientId, parseInt(limit) || 5);

    res.status(200).json({
      message: 'Search history fetched successfully',
      data: history,
    });
  } catch (error) {
    console.error('Error fetching search history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
    }

    static async cancelAppointment(req, res){
      try{
        const {appointmentId, patientId, doctorId} = req.body;

        const updatedAppointment = await PatientService.cancelAppointemnt({
          appointmentId,
          patientId,
          doctorId
        });

        return res.status(200).json({
          message: "Appointment Cancelled.",
          appointment: updatedAppointment
        });
      } catch(error){
        console.error("Controller error", error.message);
        return res.status(500).json({message: `An error occurred while processing your request. Please try again later` });
      }
    }
    static async updateAppointmentTime (req, res)  {
  try {
    const { appointmentId, patientId, doctorId, startTime } = req.body;

    if (!appointmentId || !patientId || !doctorId || !startTime) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    const updatedAppointment = await PatientService.updateAppointmentTime({
      appointmentId,
      patientId,
      doctorId,
      startTime
    });

    return res.status(200).json({
      message: 'Appointment time updated successfully.',
      appointment: updatedAppointment
    });
  } catch (error) {
    console.error('Controller error:', error.message);
    return res.status(500).json({ message: 'An error occurred while processing your request. Please try again later' });
  }

}

  static async pastAppointments (req, res){
    try{
      const {patientId} = req.params;
      const {lat, long} = req.query;
      const {appointments} = await PatientService.pastAppointments(patientId, lat, long);
      return res.status(200).json({
        message: "Past Appointments",
        appointments
      });
    } catch(error){
         console.error('Controller error:', error.message);
         return res.status(500).json({ message: 'An error occurred while processing your request. Please try again later' });
    }
  }

  static async updateAppointmentCheckIn(req, res) {
  try {
    const { appointmentId } = req.params;
    const updates = req.body; // { checkIn: true, longitude, latitude }

    if (!appointmentId) {
      return res.status(400).json({ error: "Appointment ID is required." });
    }

    const updatedAppointment =
      await AdminService.updateAppointmentCheckIn(appointmentId, updates);

    return res.status(200).json({
      success: true,
      message: "Check-in updated successfully.",
      data: updatedAppointment
    });

  } catch (error) {
    console.error("❌ Error updating check-in:", error.message);
    return res.status(500).json({ error: error.message });
  }
}

static async markCheckIn(req, res) {
  try {
    const { appointmentId } = req.params;

    if (!appointmentId) {
      return res.status(400).json({ error: "Appointment ID is required." });
    }

    const updatedAppointment = await PatientService.markCheckIn(appointmentId);

    return res.status(200).json({
      success: true,
      message: "Check-in marked successfully.",
      data: updatedAppointment
    });

  } catch (error) {
    console.error("❌ Error marking check-in:", error.message);
    return res.status(500).json({ error: error.message });
  }
}

  static async postRating(req, res) {
    try {
     const { doctorId} = req.params;
      const payload = req.body;
      console.log("Received payload for rating:", payload);
      const newRating = await PatientService.addDoctorRating(doctorId, payload);
      console.log("New Rating", newRating);
      res.status(201).json({
        message: "Rating submitted successfully",
        rating: newRating,
      });
    } catch (error) {
      res.status(400).json({message: 'An error occurred while submitting rating. Please try again later' });
    }
  }

    static async deleteUser(req, res) {
          try {
            const { id } = req.body; // Extract user ID from request parameters
            await PatientService.deleteUser(id); // Call the delete method from UserService
            res.status(200).json({ message: "Patient deleted successfully" });
          } catch (error) {
            res.status(404).json({ message: error.message });
          }
        }
    
  }
module.exports = PatientController;
