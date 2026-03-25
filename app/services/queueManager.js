const Appointment = require("../models/AppointmentsModel");
const Doctor = require("../models/doctorModel");
const DoctorSchedule = require("../models/doctorSchedule");
const moment = require("moment-timezone");
const AppointmentService = require("../services/appointment");
const GoogleMaps = require("../utils/googlemaps/googlemaps");
const Paient = require("../models/patientModel");

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);




const rescheduleAppointments = async (doctor) => {
  const now = moment().tz("Asia/Kolkata");
  const today = moment().tz("Asia/Kolkata").startOf("day");
  const tomorrow = moment(today).add(1, "day");

  console.log("Now:", now.format("YYYY-MM-DD hh:mm A"));
  console.log("Today:", today.format("YYYY-MM-DD hh:mm A"));
  console.log("Tomorrow:", tomorrow.format("YYYY-MM-DD hh:mm A"));

  const newDoctor = await Doctor.findById(doctor._id);
  const schedule = await DoctorSchedule.findOne({ doctorId: doctor._id });

  if (!newDoctor || !schedule || !schedule.appointmentDuration) {
    console.error("Doctor or schedule not found.");
    return;
  }

  const todayAppointments = await Appointment.find({
    doctorId: doctor._id,
    appointmentDate: { $gte: today.toDate(), $lt: tomorrow.toDate() },
    status: { $in: ["Active", "Pending"] },
  }).sort({ startTime: 1 });

  if (todayAppointments.length === 0) {
    console.log(`No appointments found for doctor ${doctor._id} on ${today}`);
    return;
  }

  // Log original appointments
  console.log("\nOriginal Appointments:");
  todayAppointments.forEach((appt, i) =>
    console.log(
      `#${i + 1}: Patient ${appt.patientId}, Status: ${appt.status}, CheckIn: ${appt.checkIn}, Start: ${appt.startTime}`
    )
  );

  // Step 1: Store original time slots
  const originalSlots = todayAppointments.map((appt) => ({
    startTime: appt.startTime,
    endTime: appt.endTime,
  }));

  // Step 2: Group appointments
  const checkedIn = todayAppointments.filter((appt) => appt.checkIn === true);
  const notCheckedIn = todayAppointments.filter((appt) => appt.checkIn !== true);

  // Step 3: Assign earliest slots to checked-in appointments
  for (let i = 0; i < checkedIn.length; i++) {
    const appt = checkedIn[i];
    const slot = originalSlots[i]; // Earliest available slot

    await Appointment.findByIdAndUpdate(appt._id, {
      startTime: slot.startTime,
      endTime: slot.endTime,
      appointmentIndex: i + 1,
    });

    console.log(
      `✔ Moved checked-in patient ${appt.patientId} to Start: ${slot.startTime}, End: ${slot.endTime}`
    );
  }

  // Step 4: Assign remaining slots to not-checked-in patients (preserve their positions)
  for (let j = 0; j < notCheckedIn.length; j++) {
    const appt = notCheckedIn[j];
    const slotIndex = checkedIn.length + j;
    const slot = originalSlots[slotIndex];

    await Appointment.findByIdAndUpdate(appt._id, {
      startTime: slot.startTime,
      endTime: slot.endTime,
      appointmentIndex: slotIndex + 1,
    });

    console.log(
      `⏳ Kept not-checked-in patient ${appt.patientId} at Start: ${slot.startTime}, End: ${slot.endTime}`
    );
  }

  console.log(`✅ Rescheduling complete for doctor ${doctor._id}`);
};






  const queueManager = async () => {
    try {
      const doctors = await Doctor.find({});
      for (const doctor of doctors) {
        await rescheduleAppointments(doctor);
      }
  
      console.log("✅ Notification check complete.");
    } catch (err) {
      console.error("❌ Notifier failed:", err.message);
    }
  };
  module.exports = queueManager;