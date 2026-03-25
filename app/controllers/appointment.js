// const AppointmentService = require("../services/appointment");

// class AppointmentController {
//     static async createAppointment(req, res) {
//         try {
//             const appointmentData = req.body; // Get appointment data from request body
//             const newAppointment = await AppointmentService.createAppointment(appointmentData);
//             res.status(201).json(newAppointment);
//         } catch (error) {
//             res.status(400).json({ message: error.message });
//         }
//     }

//     static async getAppointment(req, res) {
//         try {
//             const { appointmentId } = req.params; // Get appointmentId from request parameters
//             const appointment = await AppointmentService.getAppointment(appointmentId);
//             res.status(200).json(appointment);
//         } catch (error) {
//             res.status(404).json({ message: error.message });
//         }
//     }

//     static async getAppointmentsByDoctor(req, res) {
//         try {
//             const { doctorId } = req.params; // Get doctorId from request parameters
//             const appointments = await AppointmentService.getAppointmentsByDoctor(doctorId);
//             res.status(200).json(appointments);
//         } catch (error) {
//             res.status(500).json({ message: error.message });
//         }
//     }

//         // Get appointments for the current date
//         static async getTodayAppointments(req, res) {
//             try {
//                 const { doctorId } = req.params;

//                 if (!doctorId) {
//                     return res.status(400).json({ error: "Doctor ID is required." });
//                 }

//             const todayAppointments = await AppointmentService.getTodayAppointments(doctorId);
//             res.status(200).json(todayAppointments);
//             console.log("appointments", todayAppointments);
//             } catch (error) {
//             console.error("Error fetching today's appointments:", error.message);
//             res.status(500).json({ error: error.message });
//             }
//         }

//         static async getTodaysAppointments(req, res){
//             try {
//                 const { doctorId } = req.params; // Assuming doctorId is in URL params
            
//                 if (!doctorId) {
//                   return res.status(400).json({ message: "Doctor ID is required." });
//                 }
            
//                 const { appointmentCount, appointments } = await AppointmentService.getTodaysAppointments(doctorId);
            
//                 if (appointmentCount === 0) {
//                     return res.status(404).json({ message: "No appointments found for today." });
//                   }
              
//                   res.status(200).json({ appointmentCount, appointments });
//               } catch (error) {
//                 console.error("Error in getTodayAppointmentsController:", error.message);
//                 res.status(500).json({ message: "Internal Server Error", error: error.message });
//               }
            
//         }

//         static async getTodaysActiveOrPendingAppointments(req, res){
//           try {
//               const { doctorId } = req.params; // Assuming doctorId is in URL params
          
//               if (!doctorId) {
//                 return res.status(400).json({ message: "Doctor ID is required." });
//               }
          
//               const { appointmentCount, appointments } = await AppointmentService.getTodaysActiveOrPendingAppointments(doctorId);
          
//               if (appointmentCount === 0) {
//                   return res.status(404).json({ message: "No appointments found for today." });
//                 }
            
//                 res.status(200).json({ appointmentCount, appointments });
//             } catch (error) {
//               console.error("Error in getTodayAppointmentsController:", error.message);
//               res.status(500).json({ message: "Internal Server Error", error: error.message });
//             }
          
//       }

//         static async getAvailableSlots(req, res) {
//             try {
//               const { doctorId } = req.params;
//               if (!doctorId) return res.status(400).json({ error: "Doctor ID is required." });
//                 console.log("inside controller is getVaiabke ", doctorId);
//               const slots = await AppointmentService.getAvailableSlots(doctorId);
//               console.log("slots in controller", slots);

//               return res.status(200).json({ success: true, availableSlots: slots });
//             } catch (error) {
//               console.error(" Error in getAvailableSlots:", error.message);
//               return res.status(500).json({ error: "Internal server error." });
//             }
//           }

//           static async updateAppointmentTime(req, res) {
//             try {
//                 const { doctorId, minutes } = req.body;
            
//                 if (!doctorId || !minutes) {
//                   return res.status(400).json({ message: "doctorId and minutes are required" });
//                 }
            
//                 const updatedAppointments = await AppointmentService.updateTodayAppointments(doctorId, minutes);
            
//                 res.status(200).json({
//                   message: "Appointments updated successfully",
//                   updatedAppointments
//                 });
//               } catch (error) {
//                 console.error("Error in updateTodayAppointments controller:", error);
//                 res.status(500).json({ message: "Internal server error" });
//               }
//           }
//           static async shiftTodayAppointmentsBackwards(req, res) {
//             try {
//                 const { doctorId, remainingminutes } = req.body;
            
//                 if (!doctorId || !remainingminutes) {
//                   return res.status(400).json({ message: "doctorId and minutes are required" });
//                 }
            
//                 const updatedAppointments = await AppointmentService.shiftTodayAppointmentsBackwards(doctorId, remainingminutes);
            
//                 res.status(200).json({
//                   message: "Appointments updated successfully",
//                   updatedAppointments
//                 });
//               } catch (error) {
//                 console.error(" Error in shiftTodayAppointmentsBackwards controller:", error);
//                 res.status(500).json({ message: "Internal server error" });
//               }
//           }


//           static async reorderAppointments (req, res) {
//             try {
//               const { doctorId, appointmentDate, appointmentIds } = req.body;
//               console.log("appointmentIds Type:", typeof appointmentIds);         // should be 'object'
//             console.log("appointmentIds isArray:", Array.isArray(appointmentIds)); // should be true
//               if (!doctorId || !appointmentIds || !Array.isArray(appointmentIds) || !appointmentDate) {
//                 return res.status(400).json({ message: "Missing or invalid input data" });
//               }
          
//               const result = await AppointmentService.reorderAppointments(
//                 doctorId,
//                 appointmentDate,
//                 appointmentIds
//               );
          
//               return res.status(200).json(result);
//             } catch (error) {
//               console.error("Reorder Appointments Error:", error.message);
//               return res.status(500).json({ message: "Failed to reorder appointments" });
//             }
//           };
          
//            static async getTodaysAppointmentsByPatient(req, res){
//             try {
//                 const { patientId } = req.params; // Assuming doctorId is in URL params
//                 const {lat, long } = req.query;
//                 if (!patientId) {
//                   return res.status(400).json({ message: "Patient ID is required." });
//                 }
            
//                 const { appointmentCount, appointments } = await AppointmentService.getTodaysAppointmentsByPatient(patientId, lat, long );
            
//                 if (appointmentCount === 0) {
//                     return res.status(404).json({ message: "No appointments found for today." });
//                   }
              
//                   res.status(200).json({ appointmentCount, appointments });
//               } catch (error) {
//                 console.error("Error in getTodayAppointmentsController:", error.message);
//                 res.status(500).json({ message: "Internal Server Error", error: error.message });
//               }
            
//         }

 

// }

// module.exports = AppointmentController;


const AppointmentService = require("../services/appointment");

class AppointmentController {
  static async createAppointment(req, res, io) {
    try {
      const appointmentData = req.body;
      const newAppointment = await AppointmentService.createAppointment(io, appointmentData);
      res.status(201).json(newAppointment);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getAppointment(req, res) {
    try {
      const { appointmentId } = req.params;
      const appointment = await AppointmentService.getAppointment(appointmentId);
      res.status(200).json(appointment);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

  static async getAppointmentsByDoctor(req, res) {
    try {
      const { doctorId } = req.params;
      const appointments = await AppointmentService.getAppointmentsByDoctor(doctorId);
      res.status(200).json(appointments);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getTodayAppointments(req, res) {
    try {
      const { doctorId } = req.params;
      if (!doctorId) {
        return res.status(400).json({ error: "Doctor ID is required." });
      }
      const todayAppointments = await AppointmentService.getTodayAppointments(doctorId);
      res.status(200).json(todayAppointments);
      console.log("appointments", todayAppointments);
    } catch (error) {
      console.error("Error fetching today's appointments:", error.message);
      res.status(500).json({ error: error.message });
    }
  }

  static async getTodaysAppointments(req, res) {
    try {
      const { doctorId } = req.params;
      if (!doctorId) {
        return res.status(400).json({ message: "Doctor ID is required." });
      }
      const { appointmentCount, appointments } = await AppointmentService.getTodaysAppointments(doctorId);
      if (appointmentCount === 0) {
        return res.status(404).json({ message: "No appointments found for today." });
      }
      res.status(200).json({ appointmentCount, appointments });
    } catch (error) {
      console.error("Error in getTodayAppointmentsController:", error.message);
      res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
  }

  static async getTodaysActiveOrPendingAppointments(req, res) {
    try {
      const { doctorId } = req.params;
      if (!doctorId) {
        return res.status(400).json({ message: "Doctor ID is required." });
      }
      const { appointmentCount, appointments } = await AppointmentService.getTodaysActiveOrPendingAppointments(doctorId);
      if (appointmentCount === 0) {
        return res.status(404).json({ message: "No appointments found for today." });
      }
      res.status(200).json({ appointmentCount, appointments });
    } catch (error) {
      console.error("Error in getTodayAppointmentsController:", error.message);
      res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
  }

  static async getAvailableSlots(req, res) {
    try {
      const { doctorId } = req.params;
      if (!doctorId) return res.status(400).json({ error: "Doctor ID is required." });
      console.log("inside controller is getVaiabke ", doctorId);
      const slots = await AppointmentService.getAvailableSlots(doctorId);
      console.log("slots in controller", slots);
      return res.status(200).json({ success: true, availableSlots: slots });
    } catch (error) {
      console.error("Error in getAvailableSlots:", error.message);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async updateAppointmentTime(req, res, io) {
    try {
      const { doctorId, minutes } = req.body;
      if (!doctorId || !minutes) {
        return res.status(400).json({ message: "doctorId and minutes are required" });
      }
      const updatedAppointments = await AppointmentService.updateTodayAppointments(io, doctorId, minutes);
      res.status(200).json({
        message: "Appointments updated successfully",
        updatedAppointments
      });
    } catch (error) {
      console.error("Error in updateTodayAppointments controller:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async shiftTodayAppointmentsBackwards(req, res, io) {
    try {
      const { doctorId, remainingminutes } = req.body;
      if (!doctorId || !remainingminutes) {
        return res.status(400).json({ message: "doctorId and minutes are required" });
      }
      const updatedAppointments = await AppointmentService.shiftTodayAppointmentsBackwards(io, doctorId, remainingminutes);
      res.status(200).json({
        message: "Appointments updated successfully",
        updatedAppointments
      });
    } catch (error) {
      console.error("Error in shiftTodayAppointmentsBackwards controller:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async reorderAppointments(req, res, io) {
    try {
      const { doctorId, appointmentDate, appointmentIds } = req.body;
      console.log("appointmentIds Type:", typeof appointmentIds);
      console.log("appointmentIds isArray:", Array.isArray(appointmentIds));
      if (!doctorId || !appointmentIds || !Array.isArray(appointmentIds) || !appointmentDate) {
        return res.status(400).json({ message: "Missing or invalid input data" });
      }
      const result = await AppointmentService.reorderAppointments(io, doctorId, appointmentDate, appointmentIds);
      return res.status(200).json(result);
    } catch (error) {
      console.error("Reorder Appointments Error:", error.message);
      return res.status(500).json({ message: "Failed to reorder appointments" });
    }
  }

  static async cancelAppointment(req, res, io) {
    try {
      const { appointmentId } = req.body;
      if (!appointmentId) {
        return res.status(400).json({ message: "appointmentId is required" });
      }
      const result = await AppointmentService.cancelAppointment(io, appointmentId);
      res.status(200).json(result);
    } catch (error) {
      console.error("Error cancelling appointment:", error.message);
      res.status(500).json({ message: error.message });
    }
  }

  static async getTodaysAppointmentsByPatient(req, res) {
    try {
      const { patientId } = req.params;
      const { lat, long } = req.query;
      if (!patientId) {
        return res.status(400).json({ message: "Patient ID is required." });
      }
      const { appointmentCount, appointments } = await AppointmentService.getTodaysAppointmentsByPatient(patientId, lat, long);
      if (appointmentCount === 0) {
        return res.status(404).json({ message: "No appointments found for today." });
      }
      res.status(200).json({ appointmentCount, appointments });
    } catch (error) {
      console.error("Error in getTodayAppointmentsController:", error.message);
      res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
  }
}

module.exports = AppointmentController;