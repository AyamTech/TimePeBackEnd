const Appointment = require("../models/AppointmentsModel");
const mongoose = require("mongoose");
const Patient = require("../models/patientModel");
const { DateTime } = require("luxon");
const moment = require("moment-timezone");
const generateSlots = require("../utils/slot");
const Doctor = require("../models/doctorModel");
const DoctorSchedule = require('../models/doctorSchedule');
const GoogleMaps = require("../utils/googlemaps/googlemaps");

const { setCache, getCache, hasCache } = require("../utils/cacheManager");
const { invalidateAppointmentCache, invalidateDoctorCache } = require("../utils/cacheManager");
const { getDistanceAndTime } = require('../utils/googlemaps/googlemaps');
// const {normalizeTimeFormat} = require("../utils/time.utils")
const {broadcastQueue} = require("../utils/websocket");
function getDistanceCacheKey(doctorId, lat, long) {
  return `${doctorId}_${lat}_${long}`;
}

// Helper function to broadcast queue updates
// async function broadcastQueueUpdate(io, doctorId, todayDate) {
//   const { appointments } = await AppointmentService.getTodaysActiveOrPendingAppointments(doctorId);
//   const doctorRoom = `queue:${doctorId}:${todayDate}`;
//   io.to(doctorRoom).emit("queueUpdate", { appointments });
// }

const normalizeTime = (timeString) => {
  // Add leading zero if hour is single digit
  return timeString.replace(/^(\d):/, '0$1:');
};


class AppointmentService {
  static async createAppointment(io, appointmentData) {
  //  console.log("io in appointment service...", io);
    console.log("Appointment Data Received:", appointmentData);
    try {
      const { doctorId, patientId, appointmentDate, startTime, endTime, checkIn, symptom, status, latitude, longitude, createdBy, emergencyDuration } = appointmentData;

            if (!doctorId || !patientId ) {
                throw new Error("Doctor ID, Patient ID are required.");
            }
    
            const patient = await Patient.findById(patientId);
            if (!patient) throw new Error("Patient not found");
    
            const doctor = await Doctor.findById(doctorId);
            
             // Step 1: Convert appointment date to IST, then calculate start and end of that IST day in UTC
              const istDateTime = DateTime.fromJSDate(appointmentDate).setZone("Asia/Kolkata");
              const startOfDayIST = istDateTime.startOf("day");
              const endOfDayIST = istDateTime.endOf("day");

              const startUTC = startOfDayIST.toUTC().toJSDate();
              const endUTC = endOfDayIST.toUTC().toJSDate();

              // Step 2: Count today's appointments for this doctor to determine the index
              const todayAppointments = await Appointment.find({
                doctorId,
                appointmentDate: { $gte: startUTC, $lte: endUTC },
              });

              const appointmentIndex = todayAppointments.length + 1;

            //  Create appointment (use all appointmentData fields)
            const appointment = await Appointment.create({
                doctorId,
                patientId,
                patientUniqueId: patient.patientUniqueId,
                doctorUniqueId: doctor.uniqueId,
                patientName: patient.name,
                doctorname: doctor.doctorName,
                doctorPhone: doctor.phoneNumber,
                appointmentDate,
                startTime,
                endTime ,
                checkIn,
                symptom,
                status,
                latitude,
                currentStart: startTime,
                currentEnd: endTime,
                longitude, 
                createdBy,
                emergencyDuration
            });

            // Invalidate all cache entries related to this doctor and date
            invalidateAppointmentCache(doctorId, appointmentDate);
            
            // Also invalidate the general doctor cache for good measure
            invalidateDoctorCache(doctorId);
    
            
            await appointment.save();
            console.log("normalised start time:", normalizeTime(startTime));
            console.log("normalised end time:", normalizeTime(endTime));
            try{
                const result = await DoctorSchedule.updateOne(
                { doctorId },
                {
                  $set: {
                    "dailySlots.$[slot].isBooked": true
                  },
                },
                {
                  arrayFilters: [
                    {
                      "slot.start": normalizeTime(startTime),
                      "slot.end": normalizeTime(endTime),
                    },
                  ],
                }
              );
              console.log("Slot booking result:", result);
              console.log("modified count for slot booking:", result.modifiedCount);
            } catch(error){
              console.error("Error booking slot :", error);
              throw new Error(`Slot booking failed: ${error.message}`);
            }
            
    //          await DoctorSchedule.updateOne(
    //   { doctorId },
    //   {
    //     $set: {
    //       "dailySlots.$[slot].isBooked": true, // mark booked
    //     },
    //   },
    //   {
    //     arrayFilters: [
    //       {
    //         "slot.start": startTime,
    //         "slot.end": endTime,
    //       },
    //     ],
    //   }
    // );

            const {notifyPatient} = require("../utils/firebase/notification");
            await notifyPatient(patientId, appointment._id, doctorId);

             // Broadcast queue update
       await broadcastQueue(io, doctorId);
      
    
            return { appointment };
        } catch (error) {
            console.error(" Error in AppointmentService.createAppointment:", error.message);
            throw error;
        }
    }
    



    static async getAppointment(appointmentId) {
        if (!appointmentId || !mongoose.Types.ObjectId.isValid(appointmentId)) {
            throw new Error("Invalid appointmentId format");
        }

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) throw new Error("Appointment not found");
        return appointment;
    }

    static async getAppointmentsByDoctor(doctorId) {
        return await Appointment.find({ doctorId });
    }

      // Get appointments for the current date only
  static async getTodayAppointments(doctorId) {
    try {
        const now = DateTime.local();
        const startOfDay = now.startOf("day").toJSDate(); // 00:00 of today
        const endOfDay = now.endOf("day").toJSDate();     // 23:59 of today
  
        const todayAppointments = await Appointment.find({
          doctorId,
          appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        });
  
        return todayAppointments;

    } catch (error) {
      console.error(" Error fetching today's appointments:", error.message);
      throw error;
    }
  }

  static async getTodaysAppointments(doctorId) {
    try {
      // Get the start and end of the current day
      const now = DateTime.local();
      const startOfDay = now.startOf("day").toJSDate(); // 00:00 of today
      const endOfDay = now.endOf("day").toJSDate();     // 23:59 of today
  
      // Fetch today's appointments with patient details
      const todayAppointments = await Appointment.find({
        doctorId,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      }).sort({startTime: 1})
        .populate("patientId", "name contactInformation dateOfBirth email gender phoneNumber symptoms emergencyDuration")
        .select("patientId appointmentDate startTime endTime timeSlot status checkIn latitude longitude currentStart currentEnd");
  
     // console.log("Today's Appointments: ", todayAppointments);
      const appointmentCount = todayAppointments.length;

      // Reshape the output to match the format of getPatientsByDoctor
      const formattedAppointments = todayAppointments.map((appointment) => ({
      _id: appointment._id,
      appointmentObj: {
        appointmentDate: appointment.appointmentDate,
        timeSlot: appointment.timeSlot,
        status: appointment.status,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        checkIn: appointment.checkIn,
        latitude: appointment.latitude,
        longitude: appointment.longitude,
        currentStart: appointment.currentStart,
        currentEnd: appointment.currentEnd,
        patient: {
          _id: appointment.patientId?._id,
          name: appointment.patientId?.name,
          contactInformation: appointment.patientId?.contactInformation,
          dateOfBirth: appointment.patientId?.dateOfBirth,
          email: appointment.patientId?.email,
          gender: appointment.patientId?.gender,
          phoneNumber: appointment.patientId?.phoneNumber,
          symptoms: appointment.patientId?.symptoms,
          createdAt: appointment.patientId?.createdAt,
          emergencyDuration: appointment.patientId?.emergencyDuration,
        },
      },
    }));

    return { appointmentCount, appointments: formattedAppointments };
  } catch (error) {
    console.error("Error fetching today's appointments:", error.message);
    throw error;
  }
  }
  

  static async getTodaysActiveOrPendingAppointments(doctorId) {
  try {
    // Get the start and end of the current day
    const now = DateTime.local();
    const startOfDay = now.startOf("day").toJSDate();
    const endOfDay = now.endOf("day").toJSDate();

    // Fetch today's appointments with status "active" or "pending"
    const todayAppointments = await Appointment.find({
      doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ["Active", "Pending"] }, // 👈 Status filter added
    })
      .populate(
        "patientId",
        "name contactInformation dateOfBirth email gender phoneNumber symptoms emergencyDuration"
      )
      .select(
        "patientId appointmentDate startTime endTime timeSlot status checkIn latitude symptom longitude emergencyDuration currentStart currentEnd"
      );


    // Sort appointments by startTime properly
    todayAppointments.sort((a, b) => {
      // Convert time strings to comparable format
      const timeA = a.startTime.split(':').map(num => parseInt(num));
      const timeB = b.startTime.split(':').map(num => parseInt(num));
      
      // Compare hours first, then minutes
      if (timeA[0] !== timeB[0]) {
        return timeA[0] - timeB[0];
      }
      return timeA[1] - timeB[1];
    });

    // console.log("Today's Active/Pending Appointments:", todayAppointments);

    const appointmentCount = todayAppointments.length;

    // Format output
    const formattedAppointments = todayAppointments.map((appointment) => ({
      _id: appointment._id,
      appointmentObj: {
        appointmentDate: appointment.appointmentDate,
        timeSlot: appointment.timeSlot,
        status: appointment.status,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        checkIn: appointment.checkIn,
        latitude: appointment.latitude,
        longitude: appointment.longitude,
        symptom: appointment.symptom,
        currentStart: appointment.currentStart,
        currentEnd: appointment.currentEnd,
        emergencyDuration: appointment.emergencyDuration,
        patient: {
          _id: appointment.patientId?._id,
          name: appointment.patientId?.name,
          contactInformation: appointment.patientId?.contactInformation,
          dateOfBirth: appointment.patientId?.dateOfBirth,
          email: appointment.patientId?.email,
          gender: appointment.patientId?.gender,
          phoneNumber: appointment.patientId?.phoneNumber,
          symptoms: appointment.symptom,
          createdAt: appointment.patientId?.createdAt,
          emergencyDuration: appointment.patientId?.emergencyDuration,
        },
      },
    }));

   // console.log("Formatted Appointments:", formattedAppointments);

    return { appointmentCount, appointments: formattedAppointments };
  } catch (error) {
    console.error("Error fetching active/pending appointments:", error.message);
    throw error;
  }
}


// static async getAvailableSlots(doctorId) {
//   const DoctorService = require("./doctorService");
//   try {
//     // Get doctor's availability
//     const schedule = await DoctorService.getAvailability(doctorId);
//     const now = DateTime.local();
//     const todayIndex = now.weekday % 7;

//     if (!schedule.selectedDays[todayIndex]) {
//       throw new Error("Doctor is unavailable today.");
//     }

//     let availableSlots = [];

//     if (schedule.morningSession.enabled) {
//       availableSlots = availableSlots.concat(
//         generateSlots(schedule.morningSession.start, schedule.morningSession.end, schedule.appointmentDuration)
//       );
//     }

//     if (schedule.eveningSession.enabled) {
//       availableSlots = availableSlots.concat(
//         generateSlots(schedule.eveningSession.start, schedule.eveningSession.end, schedule.appointmentDuration)
//       );
//     }

//     if (availableSlots.length === 0) {
//       throw new Error("No available slots for this doctor.");
//     }

//     // Fetch today's booked appointments
//     const bookedAppointments = await AppointmentService.getTodayAppointments(doctorId);
//    // console.log("booked appointments....", bookedAppointments);

//     const bookedSlots = bookedAppointments.map((appointment) => `${appointment.startTime} - ${appointment.endTime}`);
//     console.log("booked slots....", bookedSlots);
//     // ❗Refined filtering logic to exclude overlapping slots
//     const refinedFreeSlots = availableSlots.filter((slot) => {
//       const slotStart = DateTime.fromFormat(slot.start, "h:mm a");
//       const slotEnd = DateTime.fromFormat(slot.end, "h:mm a");
//       console.log("slotSTart", slotStart);
//       return !bookedAppointments.some((appointment) => {
//         const appointmentStart = DateTime.fromFormat(appointment.startTime, "h:mm a");
//         const appointmentEnd = DateTime.fromFormat(appointment.endTime, "h:mm a");
        

//         // ❌ Skip if appointment overlaps with the slot
//         return appointmentStart < slotEnd && appointmentEnd > slotStart;
//       });
//     });

//     return refinedFreeSlots;
//   } catch (error) {
//     console.error("Error in getAvailableSlots:", error.message);
//     throw error;
//   }
// }

static async getAvailableSlots(doctorId) {
  const DoctorService = require("./doctorService");
  const { DateTime } = require("luxon");

  try {
    const availability = await DoctorService.getAvailability(doctorId);
    if (!availability || !Array.isArray(availability.dailySlots)) {
      return [];
    }

    const now = DateTime.local();

    const freeSlots = availability.dailySlots.filter((slot) => {
      // Exclude booked or locked slots
      if (slot.isBooked || slot.isLocked) return false;

      // Exclude past slots (only relevant for today)
      const slotStart = DateTime.fromFormat(
        `${now.toISODate()} ${slot.start}`,
        "yyyy-MM-dd h:mm a"
      );

      return slotStart > now;
    });

    return freeSlots;
  } catch (error) {
    console.error("Error in getAvailableSlots:", error);
    throw new Error("Failed to fetch available slots");
  }
}



static async updateTodayAppointments(io, doctorId, minutes) {
  try {
    const { DateTime } = require("luxon");
    const moment = require("moment-timezone");

    const now = DateTime.now().setZone("Asia/Kolkata");
    const today = now.startOf("day");
    const tomorrow = today.plus({ days: 1 });

    // 1️⃣ Fetch schedule
    const schedule = await DoctorSchedule.findOne({ doctorId });
    if (!schedule) {
      console.log("No schedule found for doctor.");
      return [];
    }

    const format = "h:mm a";

    // ✅ Helper: normalize time format (remove leading zero)
    const normalizeTimeFormat = (timeString) => {
      if (!timeString) return timeString;
      // Convert "05:25 PM" → "5:25 PM"
      return timeString.replace(/^0+(\d)/, "$1").trim();
    };

    // 2️⃣ Determine active session
    const sessionTimeInRange = (startStr, endStr) => {
      const start = DateTime.fromFormat(normalizeTimeFormat(startStr), format, { zone: "Asia/Kolkata" });
      const end = DateTime.fromFormat(normalizeTimeFormat(endStr), format, { zone: "Asia/Kolkata" });
      return now >= start && now <= end;
    };

    let session = null;
    if (schedule.morningSession.enabled && sessionTimeInRange(schedule.morningSession.start, schedule.morningSession.end)) {
      session = schedule.morningSession;
    } else if (schedule.eveningSession.enabled && sessionTimeInRange(schedule.eveningSession.start, schedule.eveningSession.end)) {
      session = schedule.eveningSession;
    } else {
      console.log("No active session right now.");
      return [];
    }

    // 3️⃣ Get today's appointments (pending or active)
    const appointments = await Appointment.find({
      doctorId,
      appointmentDate: { $gte: today.toJSDate(), $lt: tomorrow.toJSDate() },
       status: "Pending",
    }).sort({ startTime: 1 });

    if (appointments.length === 0) {
      console.log("No appointments found for today.");
      return [];
    }

    // Appointment duration
    const slotDuration = parseInt(schedule.appointmentDuration);
    const breakStart = now;
    const breakEnd = breakStart.plus({ minutes });

    console.log(`Break started at ${breakStart.toFormat("hh:mm a")} for ${minutes} minutes`);

    let previousEnd = null;
    let shiftedAppointments = [];
    let affectedAppointments = []; // 👈 new array to store original start/end times

    // 4️⃣ Process all appointments for shift
    for (let i = 0; i < appointments.length; i++) {
      const appt = appointments[i];
      const apptStart = DateTime.fromFormat(normalizeTimeFormat(appt.startTime), format, { zone: "Asia/Kolkata" });
      const apptEnd = DateTime.fromFormat(normalizeTimeFormat(appt.endTime), format, { zone: "Asia/Kolkata" });

      let newStart = apptStart;
      let newEnd = apptEnd;
      let wasAffected = false;

      // --- Case 1: Appointment overlaps with break ---
      // if (apptStart < breakEnd && apptEnd > breakStart) {
      //   newStart = breakEnd;
      //   newEnd = breakEnd.plus({ minutes: slotDuration });
      //   previousEnd = newEnd;
      //   wasAffected = true;
      // }

      if (apptStart < breakEnd && apptEnd > breakStart) {
  // If there’s already a shifted appointment before, chain after it
  if (previousEnd && previousEnd > breakEnd) {
    newStart = previousEnd.plus({ seconds: 1 });
  } else {
    newStart = breakEnd;
  }
  newEnd = newStart.plus({ minutes: slotDuration });
  previousEnd = newEnd;
  wasAffected = true;
}


      // --- Case 2: Appointment immediately follows an affected one ---
      else if (previousEnd && apptStart <= previousEnd) {
          newStart = previousEnd.plus({ seconds: 1 });
          newEnd = newStart.plus({ minutes: slotDuration });
          previousEnd = newEnd;
          wasAffected = true;
    }


      // --- Case 3: Appointment far enough — unaffected ---
      else {
        previousEnd = apptEnd;
        continue;
      }

      // --- Update appointment in DB ---
      await Appointment.findByIdAndUpdate(appt._id, {
        $set: {
          startTime: newStart.toFormat(format),
          endTime: newEnd.toFormat(format),
        },
      });

      shiftedAppointments.push({
        id: appt._id,
        oldStart: appt.startTime,
        newStart: newStart.toFormat(format),
        oldEnd: appt.endTime,
        newEnd: newEnd.toFormat(format),
      });

      // --- Track affected appointments for restore later ---
      if (wasAffected) {
        affectedAppointments.push({
          appointmentId: appt._id,
          originalStart: appt.startTime,
          originalEnd: appt.endTime,
        });
      }
    }

    // 5️⃣ Lock slots during break and spillover
    const lastShifted = shiftedAppointments.at(-1);
    const lastShiftEnd = lastShifted
      ? DateTime.fromFormat(normalizeTimeFormat(lastShifted.newEnd), format, { zone: "Asia/Kolkata" })
      : breakEnd;

    const updatedSlots = schedule.dailySlots.map((slot) => {
      const slotStart = DateTime.fromFormat(normalizeTimeFormat(slot.start), format, { zone: "Asia/Kolkata" });
      const slotEnd = DateTime.fromFormat(normalizeTimeFormat(slot.end), format, { zone: "Asia/Kolkata" });

      const overlaps =
        (slotStart < breakEnd && slotEnd > breakStart) || // during break
        (slotStart >= breakEnd && slotStart < lastShiftEnd); // spillover

      if (overlaps) {
        slot.isLocked = true;
        slot.lockedAt = now.toJSDate();
        slot.lockExpiresAt = lastShiftEnd.toJSDate();
      }
      return slot;
    });

    // 6️⃣ Save updated schedule (slots + affected appointments)
    await DoctorSchedule.updateOne(
      { doctorId },
      {
        $set: {
          dailySlots: updatedSlots,
          affectedAppointmentsDuringBreak: affectedAppointments, // 👈 added
        },
      }
    );

    // 7️⃣ Update doctor’s break info
    await Doctor.findByIdAndUpdate(doctorId, {
      $set: {
        "break.isOnBreak": true,
        "break.lastBreakStart": breakStart.toJSDate(),
        "break.lastBreakEnd": breakEnd.toJSDate(),
        "break.shiftDelay": minutes,
        "break.duration": minutes,
      },
      $push: {
        "break.history": {
          start: breakStart.toJSDate(),
          end: breakEnd.toJSDate(),
          duration: minutes,
          createdAt: new Date(),
        },
      },
    });

    console.log("✅ Appointments updated and slots locked as per break.");
    console.table(shiftedAppointments);
     // Broadcast queue update
      const todayDate = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
      await broadcastQueue(io, doctorId);
    console.log("🩵 Stored affectedAppointmentsDuringBreak:", affectedAppointments);

    return shiftedAppointments;

  } catch (error) {
    console.error("Error in updateTodayAppointments:", error);
    throw error;
  }
}


  
  // static async shiftTodayAppointmentsBackwards(doctorId, remainingMinutes) {
  //   try {
  //     const today = moment().tz("Asia/Kolkata").startOf("day");
  //     const tomorrow = moment(today).add(1, "day");
  //     const now = moment().tz("Asia/Kolkata");
  
  //     // 1. Get Doctor Schedule
  //     const schedule = await DoctorSchedule.findOne({ doctorId });
  //     if (!schedule) {
  //       console.log("No schedule found for doctor.");
  //       return [];
  //     }
  
  //     // 2. Detect active session
  //     const { DateTime } = require("luxon");
  //     const localNow = DateTime.now().setZone("Asia/Kolkata");
  
  //     const sessionTimeInRange = (startStr, endStr) => {
  //       const format = "h:mm a"; // single h, to match 9:00 AM / 5:30 PM
  //       const start = DateTime.fromFormat(startStr, format, { zone: "Asia/Kolkata" });
  //       const end = DateTime.fromFormat(endStr, format, { zone: "Asia/Kolkata" });
      
  //       if (!start.isValid || !end.isValid) {
  //         console.error(`Invalid session time format. Start: ${startStr}, End: ${endStr}`);
  //         return false;
  //       }
      
  //       return localNow >= start && localNow <= end;
  //     };
  
  //     let session = null;
  //     if (schedule.morningSession.enabled && sessionTimeInRange(schedule.morningSession.start, schedule.morningSession.end)) {
  //       session = { start: schedule.morningSession.start, end: schedule.morningSession.end };
  //     } else if (schedule.eveningSession.enabled && sessionTimeInRange(schedule.eveningSession.start, schedule.eveningSession.end)) {
  //       session = { start: schedule.eveningSession.start, end: schedule.eveningSession.end };
  //     }
  
  //     if (!session) {
  //       console.log("No active session at this time.");
  //       return [];
  //     }
  
  //     // 3. Get all pending appointments today
  //     const appointments = await Appointment.find({
  //       doctorId: doctorId,
  //       appointmentDate: { $gte: today.toDate(), $lt: tomorrow.toDate() },
  //       status: "Pending",
  //     });
  
  //     const format = "h:mm a";
  //     const sessionStart = DateTime.fromFormat(schedule.morningSession.start, format, { zone: "Asia/Kolkata" });
  //     const sessionEnd = DateTime.fromFormat(schedule.morningSession.end, format, { zone: "Asia/Kolkata" });
      
  //     const sessionAppointments = appointments.filter((appt) => {
  //       const apptStart = DateTime.fromFormat(appt.startTime, format, { zone: "Asia/Kolkata" });
      
  //       if (!apptStart.isValid) {
  //         console.error("Invalid appointment time format:", appt.startTime);
  //         return false;
  //       }
      
  //       return apptStart >= sessionStart && apptStart <= sessionEnd;
  //     });
  
  //     if (sessionAppointments.length === 0) {
  //       console.log("No appointments found for the current session.");
  //       return [];
  //     }
  
  //     console.log(`Found ${sessionAppointments.length} appointments. Shifting backwards by ${remainingMinutes} minutes...`);
  
  //     const adjustTime = (timeStr, offset) => {
  //       const dt = DateTime.fromFormat(timeStr, "h:mm a", { zone: "Asia/Kolkata" });
  //       if (!dt.isValid) throw new Error(`Invalid time format: ${timeStr}`);
  //       return dt.minus({ minutes: offset }).toFormat("h:mm a");
  //     };
  
  //     for (const appointment of sessionAppointments) {
  //       const oldStart = appointment.startTime;
  //       const oldEnd = appointment.endTime;
  
  //       const newStartTime = adjustTime(oldStart, remainingMinutes);
  //       const newEndTime = adjustTime(oldEnd, remainingMinutes);
  
  //       console.log(`Updating appointment ${appointment._id}:`);
  //       console.log(`Old Start: ${oldStart} → New Start: ${newStartTime}`);
  //       console.log(`Old End: ${oldEnd} → New End: ${newEndTime}`);
  
  //       await Appointment.findByIdAndUpdate(
  //         appointment._id,
  //         { $set: { startTime: newStartTime, endTime: newEndTime } },
  //         { new: true }
  //       );
  //     }
  
  //     await Doctor.findByIdAndUpdate(doctorId, {
  //       $set: {
  //         "break.isOnBreak": false,
  //         "break.shiftDelay": remainingMinutes,
  //         "break.lastBreakStart": null
  //       }
  //     });
  
  //     console.log(` Successfully shifted ${sessionAppointments.length} appointments backwards.`);
  //     return sessionAppointments;
  
  //   } catch (error) {
  //     console.error("Error in shiftTodayAppointmentsBackwards:", error);
  //     throw error;
  //   }
  // }

// static async shiftTodayAppointmentsBackwards(doctorId) {
//   try {
//     const { DateTime } = require("luxon");
//     const moment = require("moment-timezone");

//     const now = DateTime.now().setZone("Asia/Kolkata");
//     const today = now.startOf("day");
//     const tomorrow = today.plus({ days: 1 });

//     // Fetch doctor and schedule
//     const doctor = await Doctor.findById(doctorId);
//     const schedule = await DoctorSchedule.findOne({ doctorId });

//     if (!doctor || !schedule) {
//       console.log("Doctor or schedule not found.");
//       return [];
//     }

//     const breakInfo = doctor.break;
//     if (!breakInfo || !breakInfo.isOnBreak || !breakInfo.lastBreakStart) {
//       console.log("No active break found for this doctor.");
//       return [];
//     }

//     const breakStart = DateTime.fromJSDate(breakInfo.lastBreakStart).setZone("Asia/Kolkata");
//     const expectedBreakEnd = breakStart.plus({ minutes: breakInfo.shiftDelay || 0 });
//     const resumeTime = now;
//     const format = "h:mm a";
//     const slotDuration = parseInt(schedule.appointmentDuration) || 10;

//     const normalize = (timeString) => {
//       if (!timeString) return timeString;
//       return timeString.replace(/^0+(\d)/, "$1").trim();
//     };

//     // Get affected appointments stored during break
//     const affected = schedule.affectedAppointmentsDuringBreak || [];
//     if (!affected.length) {
//       console.log("No affected appointments found for this break.");
//       return [];
//     }

//     console.log(
//       `Resuming break early at ${resumeTime.toFormat(format)} | Expected end: ${expectedBreakEnd.toFormat(format)}`
//     );

//     const updatedAppointments = [];

//     for (const item of affected) {
//       const appointment = await Appointment.findById(item.appointmentId);
//       if (!appointment) continue;

//       const originalStart = DateTime.fromFormat(normalize(item.originalStart), format, { zone: "Asia/Kolkata" });
//       const originalEnd = DateTime.fromFormat(normalize(item.originalEnd), format, { zone: "Asia/Kolkata" });
//       const shiftedStart = DateTime.fromFormat(normalize(appointment.startTime), format, { zone: "Asia/Kolkata" });

//       let newStart = shiftedStart;
//       let newEnd = DateTime.fromFormat(normalize(appointment.endTime), format, { zone: "Asia/Kolkata" });

//       // 🧩 CASE 1: Resume before the first affected original start
//       if (resumeTime < originalStart) {
//         newStart = originalStart;
//         newEnd = originalEnd;
//       }
//       // 🧩 CASE 2: Resume between original start and shifted start (partial shift)
//       else if (resumeTime >= originalStart && resumeTime < shiftedStart) {
//         const delta = shiftedStart.diff(resumeTime, "minutes").minutes;
//         newStart = shiftedStart.minus({ minutes: delta });
//         newEnd = newStart.plus({ minutes: slotDuration });
//       }
//       // 🧩 CASE 3: Resume after shifted start → no change
//       else {
//         continue;
//       }

//       // Update appointment back
//       await Appointment.findByIdAndUpdate(appointment._id, {
//         $set: {
//           startTime: newStart.toFormat(format),
//           endTime: newEnd.toFormat(format),
//         },
//       });

//       updatedAppointments.push({
//         id: appointment._id,
//         oldStart: appointment.startTime,
//         newStart: newStart.toFormat(format),
//         oldEnd: appointment.endTime,
//         newEnd: newEnd.toFormat(format),
//       });
//     }

//     // 🧹 Unlock slots that are no longer overlapping any active appointments
//     const appointmentsToday = await Appointment.find({
//       doctorId,
//       appointmentDate: { $gte: today.toJSDate(), $lt: tomorrow.toJSDate() },
//       status: { $in: ["Pending", "Active"] },
//     });

//     const updatedSlots = schedule.dailySlots.map((slot) => {
//       const slotStart = DateTime.fromFormat(normalize(slot.start), format, { zone: "Asia/Kolkata" });
//       const slotEnd = DateTime.fromFormat(normalize(slot.end), format, { zone: "Asia/Kolkata" });

//       const overlapExists = appointmentsToday.some((appt) => {
//         const aStart = DateTime.fromFormat(normalize(appt.startTime), format, { zone: "Asia/Kolkata" });
//         const aEnd = DateTime.fromFormat(normalize(appt.endTime), format, { zone: "Asia/Kolkata" });
//         return slotStart < aEnd && slotEnd > aStart;
//       });

//       if (!overlapExists) {
//         slot.isLocked = false;
//         slot.lockedAt = null;
//         slot.lockExpiresAt = null;
//       }
//       return slot;
//     });

//     await DoctorSchedule.updateOne(
//       { doctorId },
//       {
//         $set: {
//           dailySlots: updatedSlots,
//           affectedAppointmentsDuringBreak: [], // cleanup
//         },
//       }
//     );

//     // 🧩 Update doctor break info
//     await Doctor.findByIdAndUpdate(doctorId, {
//       $set: {
//         "break.isOnBreak": false,
//         "break.lastBreakEnd": now.toJSDate(),
//         "break.shiftDelay": 0,
//       },
//     });

//     console.log("✅ Break ended early. Appointments restored and slots unlocked if needed.");
//     console.table(updatedAppointments);

//     return updatedAppointments;
//   } catch (error) {
//     console.error("❌ Error in shiftTodayAppointmentsBackwards:", error);
//     throw error;
//   }
// }

static async shiftTodayAppointmentsBackwards(io, doctorId, resumeTime = null) {
  try {
    const { DateTime } = require("luxon");

    // 🕒 Step 1: Determine current or resume time safely
    let now;
    if (resumeTime && !isNaN(new Date(resumeTime).getTime())) {
      now = DateTime.fromJSDate(new Date(resumeTime)).setZone("Asia/Kolkata");
    } else {
      now = DateTime.now().setZone("Asia/Kolkata");
    }

    if (!now.isValid) {
      console.warn("⚠️ Invalid DateTime detected, using system time.");
      now = DateTime.now().setZone("Asia/Kolkata");
    }

    const format = "h:mm a";
    const normalize = (time) =>
      time ? time.replace(/^0+(\d)/, "$1").trim() : time;

    // 🧩 Step 2: Fetch doctor schedule + affected appointments
    const schedule = await DoctorSchedule.findOne({ doctorId });
    if (!schedule || !schedule.affectedAppointmentsDuringBreak?.length) {
      console.log("No affected appointments to restore.");
      return [];
    }

    const doctor = await Doctor.findById(doctorId);
    const breakInfo = doctor?.break;
    if (!breakInfo) {
      console.log("No break info found.");
      return [];
    }

    const breakStart = DateTime.fromJSDate(breakInfo.lastBreakStart);
    const breakEndExpected = DateTime.fromJSDate(breakInfo.lastBreakEnd);
    const slotDuration = parseInt(schedule.appointmentDuration);

    console.log(
      `Resuming early at ${now.toFormat("hh:mm a")} | Originally break till ${breakEndExpected.toFormat("hh:mm a")}`
    );

    const affected = schedule.affectedAppointmentsDuringBreak;
    const updates = [];

    // 🧩 Step 3: Iterate through affected appointments
    for (const item of affected) {
      const appt = await Appointment.findById(item.appointmentId);
      if (!appt) continue;

      const originalStart = DateTime.fromFormat(normalize(item.originalStart), format, { zone: "Asia/Kolkata" });
      const originalEnd = DateTime.fromFormat(normalize(item.originalEnd), format, { zone: "Asia/Kolkata" });
      const shiftedStart = DateTime.fromFormat(normalize(appt.startTime), format, { zone: "Asia/Kolkata" });
      const shiftedEnd = DateTime.fromFormat(normalize(appt.endTime), format, { zone: "Asia/Kolkata" });

      let newStart = shiftedStart;
      let newEnd = shiftedEnd;

      // 🧩 CASE 1: Resume before original start → restore all
      if (now < originalStart) {
        newStart = originalStart;
        newEnd = originalEnd;
      }

      // 🧩 CASE 2: Resume between original and shifted start → partial shift
      else if (now >= originalStart && now < shiftedStart) {
        const delta = shiftedStart.diff(now, "minutes").minutes;
        newStart = shiftedStart.minus({ minutes: delta });
        newEnd = newStart.plus({ minutes: slotDuration });
      }

      // 🧩 CASE 3: Resume after shifted start → do nothing
      else {
        continue;
      }

      await Appointment.findByIdAndUpdate(appt._id, {
        $set: {
          startTime: newStart.toFormat(format),
          endTime: newEnd.toFormat(format),
        },
      });

      updates.push({
        id: appt._id,
        oldStart: appt.startTime,
        newStart: newStart.toFormat(format),
        oldEnd: appt.endTime,
        newEnd: newEnd.toFormat(format),
      });
    }

    // 🧩 Step 4: Unlock non-overlapping slots
    const updatedSlots = schedule.dailySlots.map((slot) => {
      const slotStart = DateTime.fromFormat(normalize(slot.start), format, { zone: "Asia/Kolkata" });
      const slotEnd = DateTime.fromFormat(normalize(slot.end), format, { zone: "Asia/Kolkata" });

      const overlaps = updates.some((u) => {
        const aStart = DateTime.fromFormat(normalize(u.newStart), format, { zone: "Asia/Kolkata" });
        const aEnd = DateTime.fromFormat(normalize(u.newEnd), format, { zone: "Asia/Kolkata" });
        return slotStart < aEnd && slotEnd > aStart;
      });

      if (!overlaps) {
        slot.isLocked = false;
        slot.lockedAt = null;
        slot.lockExpiresAt = null;
      }
      return slot;
    });

    // 🧩 Step 5: Update schedule & clear affected list
    await DoctorSchedule.updateOne(
      { doctorId },
      { $set: { dailySlots: updatedSlots, affectedAppointmentsDuringBreak: [] } }
    );

    console.log("🧹 Cleared affected appointments and updated slots.");

    // 🧩 Step 6: Update doctor break info safely
    await Doctor.findByIdAndUpdate(doctorId, {
      $set: {
        "break.isOnBreak": false,
        "break.lastBreakEnd": now.isValid ? now.toJSDate() : new Date(),
        "break.shiftDelay": 0,
      },
    });

    console.log("✅ Break ended early. Appointments restored / shifted back as needed.");
    console.table(updates);

    // Broadcast queue update

    await broadcastQueue(io, doctorId);
    return updates;

    

  } catch (error) {
    console.error("❌ Error in shiftTodayAppointmentsBackwards:", error);
    throw error;
  }
}





  static async getOriginalAppointments(doctorId) {
    try {
      const now = DateTime.local();
      const startOfDay = now.startOf("day").toJSDate();
      const endOfDay = now.endOf("day").toJSDate();
      // Fetch today's appointments with status "active" or "pending"
      const appointments = await Appointment.find({
        doctorId,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ["Active", "Pending"] }, //  Status filter added
      })
        .sort({ startTime: 1 })
        return appointments; // Already sorted by start time in the original order
    } catch (error) {
        console.error("Error fetching original appointments:", error.message);
        throw error;
    }
}

static async reorderAppointments(io, doctorId, appointmentDate, appointmentIds) {
  try {
    // Step 1: Fetch original appointments sorted by startTime
    const originalAppointments = await this.getOriginalAppointments(doctorId);

    // Sort the original appointments by their startTime (important!)
    originalAppointments.sort((a, b) => {
      const aTime = moment(a.startTime, "h:mm A");
      const bTime = moment(b.startTime, "h:mm A");
      return aTime - bTime;
    });

    // Step 2: Extract the original time slots in order
    const originalTimeSlots = originalAppointments.map((appointment) => ({
      startTime: appointment.startTime,
      endTime: appointment.endTime,
    }));

    // Step 3: Apply the original time slots to the reordered appointment IDs
    for (let i = 0; i < appointmentIds.length; i++) {
      const id = appointmentIds[i];
      const slot = originalTimeSlots[i];

      if (!slot) {
        throw new Error(`Missing time slot for appointment index ${i}`);
      }

      await Appointment.findByIdAndUpdate(id, {
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
    }

    // Step 4: Broadcast queue update
    await broadcastQueue(io, doctorId);

    return { success: true, message: "Appointments reordered successfully" };
  } catch (error) {
    console.error("Error reordering appointments:", error.message);
    throw error;
  }
}



static async getTodaysAppointmentsByPatient(patientId, lat, long) {
  try {
    const now = DateTime.local().setZone("Asia/Kolkata");
    const startOfDay = now.startOf("day").toJSDate();
    const endOfDay = now.endOf("day").toJSDate();

    const todayAppointments = await Appointment.find({
      patientId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      //paymentStatus: "confirmed", 
      status: "Pending"
    })
      .sort({ startTime: 1 })
      .populate("doctorId", "doctorName specialization email gender phoneNumber contactInformation clinicName coordinates createdAt")
      .select("patientId appointmentDate startTime endTime timeSlot status paymentStatus checkIn latitude longitude doctorId matrixData");

    const appointmentCount = todayAppointments.length;

    const DoctorSchedule = require("../models/doctorSchedule");
    const doctorSchedule = await DoctorSchedule.findOne({ doctorId: todayAppointments[0]?.doctorId }).lean();

    let lastPatientDuration = null;
    let todaysAverage = null;

    if (doctorSchedule?.appointmentHistory?.length > 0) {
      const todayStart = startOfDay.getTime();
      const todayEnd = endOfDay.getTime();

      const todaysRecords = doctorSchedule.appointmentHistory.filter(h =>
        h.completionTime >= todayStart && h.completionTime <= todayEnd
      );

      if (todaysRecords.length > 0) {
        const total = todaysRecords.reduce((sum, h) => sum + h.duration, 0);
        todaysAverage = Math.round(total / todaysRecords.length);
        lastPatientDuration = todaysRecords[todaysRecords.length - 1].duration;
      }
    }


    const formattedAppointments = await Promise.all(todayAppointments.map(async (appointment) => {
      const doctor = appointment.doctorId;

      const pendingAppointments = await Appointment.find({
        doctorId: doctor._id,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
       // paymentStatus: "confirmed", 
        status: "Pending"
      })      
      .sort({ startTime: 1 })
      .lean();

      const totalPending = pendingAppointments.length;
      const patientIndex = pendingAppointments.findIndex(
        appt => appt.patientId.toString() === patientId.toString()
      );
      console.log("patient index...", patientIndex);
      const positionInQueue = patientIndex !== -1 ? patientIndex : null;
      console.log("position in queue...", positionInQueue);
      // const PendingCount = positionInQueue !== null ? totalPending - positionInQueue : null;
      const PendingCount = positionInQueue;
      console.log("pending count...", PendingCount);

      const patientLocation = { lat, long };
      const doctorLocation = {
        lat: doctor.coordinates?.lat,
        long: doctor.coordinates?.long,
      };

       let distanceData = appointment.matrixData;   // existing cached data
      console.log("Existing distanceData:", distanceData);
// If NO matrix data exists → call Google API
if (!distanceData || !distanceData.lastUpdated) {
  try {
    const matrixResult = await getDistanceAndTime(patientLocation, doctorLocation);

    distanceData = {
      travelModes: matrixResult,
      lastUpdated: new Date(),
    };

    // Save it so next time no API call
   appointment.matrixData = { travelModes: matrixResult, lastUpdated: new Date() };
   console.log("Saving new distanceData:", appointment.matrixData);
   
      await appointment.save();
  } catch (error) {
    console.error("Failed to fetch distance matrix:", error.message);
  }
}

// Extract modes (after fallback)
const drivingInfo = distanceData?.travelModes?.driving || null;
const walkingInfo = distanceData?.travelModes?.walking || null;


      return {
        _id: appointment._id,
        appointmentObj: {
          appointmentDate: appointment.appointmentDate,
          timeSlot: appointment.timeSlot,
          status: appointment.status,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          checkIn: appointment.checkIn,
          latitude: doctor.coordinates?.lat,
          longitude: doctor.coordinates?.long,
          positionInQueue,
          PendingCount,
          totalPending,
          distanceData,
          drivingInfo,
          walkingInfo,
          lastPatientDuration,
          todaysAverage,
          doctor: {
            _id: doctor._id,
            name: doctor.doctorName,
            contactInformation: doctor.contactInformation,
            specialization: doctor.specialization,
            email: doctor.email,
            gender: doctor.gender,
            phoneNumber: doctor.phoneNumber,
            clinicName: doctor.clinicName,
            createdAt: doctor.createdAt,
          },
        },
      };
    }));

    return { appointmentCount, appointments: formattedAppointments };
  } catch (error) {
    console.error("Error fetching today's appointments:", error.message);
    throw error;
  }
}



}


  // Helper function to convert 'hh:mm AM/PM' to 'HH:mm'
  function convertTo24Hour(time12h) {
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
  
    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
  
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  
module.exports = AppointmentService;
