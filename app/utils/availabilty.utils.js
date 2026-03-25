const DoctorSchedule = require("../models/doctorSchedule");
const Appointment = require("../models/AppointmentsModel");
const AppointmentsModel = require("../models/AppointmentsModel");
// const { ObjectId } = require("mongodb");
const QRCode = require("qrcode");
const Doctor = require("../models/doctorModel");
const mongoose = require("mongoose");

 async function getAvailability(doctorId) {
        console.log("getting availability", doctorId);
        if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
            throw new Error("Invalid doctorId format");
        }

        const doctorObjectId = new mongoose.Types.ObjectId(doctorId);
       // console.log("doctorObjectId", doctorObjectId);
        const schedule = await DoctorSchedule.findOne({ doctorId: doctorObjectId });
       // console.log("schedule is", schedule);
        //if (!schedule) throw new Error("No availability found");
        return schedule;
    }

    module.exports = {
  getAvailability,
};