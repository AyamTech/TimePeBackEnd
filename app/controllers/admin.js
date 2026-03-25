const AdminService = require("../services/admin");

class AdminController {
    static async getDoctors(req, res) {
        try {
            const doctors = await AdminService.getDoctors();
            res.status(200).json(doctors);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async getPatients(req, res) {
        try {
            const patients = await AdminService.getPatient();
            res.status(200).json(patients);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async blockPatient(req, res) {
      try {
        const { patientId } = req.params;

        const result = await AdminService.blockPatient(patientId);

        return res.status(200).json(result);
        } catch (error) {
        console.error('Error blocking patient:', error.message);
        return res.status(500).json({ error: error.message });
        }
  }

    static async getPatientsByDoctor(req, res) {
        try {
            const { doctorId } = req.params;
            const patients = await AdminService.getPatientsByDoctor(doctorId);
            res.status(200).json(patients);
           // console.log("inside controllers in   amdin", patients);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

      static async getTransactionsByPatient(req, res) {
        try {
            const { patientId } = req.params;
            const transactions = await AdminService.getTransactionByPatient(patientId);
            res.status(200).json(transactions);
           // console.log("inside controllers in   amdin", patients);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async login(req, res) {
        try {
            const { username, password } = req.body;
            const token = await AdminService.login(username, password);
            res.status(200).json({ token });
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    static async createAdmin(req, res) {
        try {
            const { username, password } = req.body;
            const newAdmin = await AdminService.createAdmin(username, password);
            res.status(201).json({ message: "Admin created successfully", admin: newAdmin });
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    static async updateAppointment(req, res) {
        try {
          const { appointmentId } = req.params;
          const updates = req.body;
    
          if (!appointmentId) {
            return res.status(400).json({ error: "Appointment ID is required." });
          }
    
          const updatedAppointment = await AdminService.updateAppointment(appointmentId, updates);
    
          return res.status(200).json({ success: true, data: updatedAppointment });
        } catch (error) {
          console.error("❌ Error in updateAppointment:", error.message);
          return res.status(500).json({ error: error.message });
        }
      }
}



module.exports = AdminController;
