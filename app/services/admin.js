const Admin = require("../models/Admin");
const Doctor = require("../models/doctorModel");
const Appointment = require("../models/AppointmentsModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const AppointmentService = require("./appointment");
const DoctorService = require("./doctorService");
const Patient = require("../models/patientModel");
const { Transaction } = require("firebase-admin/firestore");
const Transactions = require("../models/transactionhistory");

class AdminService {
    static async createAdmin(username, password) {
        const existingAdmin = await Admin.findOne({ username });
        if (existingAdmin) {
            throw new Error("Admin with this username already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = new Admin({ username, password: hashedPassword, role: 'Admin' });

        return await newAdmin.save();
    }

    static async login(username, password) {
        const admin = await Admin.findOne({ username });
        if (!admin) {
            throw new Error("Invalid username or password");
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            throw new Error("Invalid username or password");
        }

        const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        console.log("JWT_SECRET:", process.env.JWT_SECRET);
        return { token };
    }

    static async getPatient(){
      return await Patient.find();
    }
    static async getDoctors() {
        return await Doctor.find();
    }

    // static async getPatientsByDoctor(doctorId) {
    //     return await Appointment.find({ doctorId })
    //         .populate("patientId", "name contactInformation") // Populate patient details
    //         .select("patientId appointmentDate timeSlot status checkIn"); // Select the fields to return
    // }
    static async getPatientsByDoctor(doctorId) {
        // Fetch appointments and populate patient details
        const appointments = await Appointment.find({ doctorId })
          .populate("patientId", "name contactInformation dateOfBirth email gender phoneNumber symptoms")
          .select("patientId appointmentDate timeSlot startTime endTime status checkIn latitude longitude");

      console.log("inside getPatientsByDoctor ", appointments);

        // Reshape the output
        return appointments.map((appointment) => ({
          _id: appointment._id,
          appointmentObj: {
            appointmentDate: appointment.appointmentDate,
            timeSlot: appointment.timeSlot,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            status: appointment.status,
            checkIn: appointment.checkIn,
            latitude: appointment.latitude,
            longitude: appointment.longitude,
            patient: {
              _id: appointment.patientId?._id,
              name: appointment.patientId?.name,
              contactInformation: appointment.patientId?.contactInformation,
              dateOfBirth: appointment.patientId?.dateOfBirth,
              email: appointment.patientId?.email,
              gender: appointment.patientId?.gender,
              phoneNumber: appointment.patientId?.phoneNumber,
              symptoms: appointment.patientId?.symptoms,
            },
          },
        }));
      }

       static async getTransactionByPatient(patientId) {
        // Fetch appointments and populate patient details
        const transactions = await Transactions.find({ patientId })
          .populate("patientId", "name contactInformation gender phoneNumber patient_status")
          .select(" method status date time");

   //   console.log("inside getPatienttsByDoctor ", appointments);

        // Reshape the output
        return transactions.map((transaction) => ({
          _id: transaction._id,
          appointmentObj: {
            date: transaction.date,
            time: transaction.time,
            method: transaction.method,
            status: transaction.status,
    
            patient: {
              _id: transaction.patientId?._id,
              name: transaction.patientId?.name,
              contactInformation: transaction.patientId?.contactInformation,
              dateOfBirth: transaction.patientId?.dateOfBirth,
              gender: transaction.patientId?.gender,
              phoneNumber: transaction.patientId?.phoneNumber,
              patient_status: transaction.patientId?.patient_status,
            },
          },
        }));
      }

    static async blockPatient(patientId) {
        const patient = await Patient.findById(patientId);

        if (!patient) {
          throw new Error('Patient not found');
        }

        // Update patient status and increment tokenVersion
        patient.patient_status = 'blocked';
        patient.tokenVersion = (patient.tokenVersion || 0) + 1;


        await patient.save();

        return {
          message: 'Patient blocked successfully',
          patientId: patient._id,
          tokenVersion: patient.tokenVersion,
        };
  }


    static async updateAppointment(appointmentId, updates) {
      try {
        const allowedFields = ["startTime", "endTime", "status", "checkIn", "longitude", "latitude"];
        
        // Ensure only allowed fields are updated
        const updateData = {};
        for (const field of allowedFields) {
          if (updates[field] !== undefined) {
            updateData[field] = updates[field];
          }
        }
    
        // Fetch the appointment
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
          throw new Error("Appointment not found.");
        }
    
        // Validate new slot against doctor's sessions
        if (updates.startTime && updates.endTime) {
          const doctor = await DoctorService.getAvailability(appointment.doctorId);
    
          // Convert time (e.g., "09:00 AM") to 24-hour format for proper comparison
          const convertTo24HourTime = (timeStr) => {
            const [time, modifier] = timeStr.split(" ");
            let [hours, minutes] = time.split(":").map(Number);
    
            if (modifier === "PM" && hours !== 12) hours += 12;
            if (modifier === "AM" && hours === 12) hours = 0;
    
            return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
          };
    
          // Convert session times
          const startTime = convertTo24HourTime(updates.startTime);
          const endTime = convertTo24HourTime(updates.endTime);
    
          const morningStart = convertTo24HourTime(doctor.morningSession.start);
          const morningEnd = convertTo24HourTime(doctor.morningSession.end);
          const eveningStart = convertTo24HourTime(doctor.eveningSession.start);
          const eveningEnd = convertTo24HourTime(doctor.eveningSession.end);
    
          console.log("🚀 Checking availability with converted times:");
          console.log({ startTime, endTime, morningStart, morningEnd, eveningStart, eveningEnd });
    
          const isInSession =
            (doctor.morningSession.enabled && startTime >= morningStart && endTime <= morningEnd) ||
            (doctor.eveningSession.enabled && startTime >= eveningStart && endTime <= eveningEnd);
    
          if (!isInSession) {
            throw new Error("Selected time is outside the doctor's available sessions.");
          }
        }
    
        // Update appointment
        const updatedAppointment = await Appointment.findByIdAndUpdate(
          appointmentId,
          updateData,
          { new: true }
        );
    
        console.log("✅ Updated appointment:", updatedAppointment);
        return updatedAppointment;
      } catch (error) {
        console.error("❌ Error in updateAppointment:", error.message);
        throw error;
      }
    }
    
      
    
      
}

module.exports = AdminService;
