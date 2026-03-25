
const generateSlots = require("../utils/slot");
const DoctorService = require("./doctorService");
const DoctorSchedule = require("../models/doctorSchedule");
const DoctorController = require("../controllers/DoctorSchedule");
const AppointmentService = require("./appointment");
const Patient = require("../models/patientModel");
const mongoose = require("mongoose");
const { DateTime } = require("luxon");
const jwt = require('jsonwebtoken');
const Appointment = require("../models/AppointmentsModel");
const Doctor = require("../models/doctorModel");
const SearchHistoryService = require("../services/searchHistory");
const fs = require('fs').promises;
const path = require('path');
const GoogleMaps = require("../utils/googlemaps/googlemaps"); 
const { setCache, getCache, hasCache } = require("../utils/cacheManager");
const { invalidateAppointmentCache, invalidateDoctorCache } = require("../utils/cacheManager");
const { getAvailability } = require("../utils/availabilty.utils");

//function for caching Doctor Distance
function getDistanceCacheKey(doctorId, lat, long) {
  return `${doctorId}_${lat}_${long}`;
}


// Utility helpers
function isInMorningSession(time, schedule) {
  const t = DateTime.fromFormat(time, "h:mm a", { zone: "Asia/Kolkata" });
  const start = DateTime.fromFormat(schedule.morningSession.start, "h:mm a", { zone: "Asia/Kolkata" });
  const end = DateTime.fromFormat(schedule.morningSession.end, "h:mm a", { zone: "Asia/Kolkata" });
  return t >= start && t < end;
}

function extendSessionBoundary(session, schedule, duration) {
  const currentEnd = DateTime.fromFormat(
    schedule[`${session}Session`].end,
    "h:mm a",
    { zone: "Asia/Kolkata" }
  );
  const newEnd = currentEnd.plus({ minutes: duration });
  schedule[`${session}Session`].end = newEnd.toFormat("h:mm a");
}


const mapExperienceToRating = {
  "Excellent": 5,
  "Good": 4,
  "Average": 3,
  "Poor": 2,
  "Terrible": 1,
};

class PatientService {

    // static async createPatient(patientData) {
    //   try {
    //     const {
    //       name,
    //       dateOfBirth,
    //       gender,
    //       contactInformation,
    //       email,
    //       phoneNumber,
    //       createdBy,
    //       symptoms,
    //       startTime: requestedStartTime, // passed from frontend
    //       emergencyDuration = 0,
    //     } = patientData;
        

    //     if (!name || !phoneNumber || !createdBy) {
    //       throw new Error("Name, phone number, and doctor ID are required.");
    //     }

    //     const existingPatient = await Patient.findOne({ phoneNumber });
    //     if (existingPatient) {
    //       throw new Error("Patient with this phone number already exists.");
    //     }


    //     // Before creating the patient, calculate startTime and endTime
    // const schedule = await DoctorService.getAvailability(createdBy);
    // const duration = Number(schedule.appointmentDuration.match(/\d+/)?.[0] || 0);
    // const now = DateTime.now().setZone("Asia/Kolkata");


    // //const emergencyDuration = body.emergencyDuration;
    // const numericDuration = Number(emergencyDuration);
    // if (isNaN(numericDuration)) {
    //   throw new Error("Invalid emergency duration: must be a number.");
    // }

    // //startTime = now.plus({ minutes: numericDuration });
    // console.log("requestedStartTime:", requestedStartTime);
    // console.log("emergencyDuration:", emergencyDuration);

    // let startTime;
    // console.log("emergencyDuration:", emergencyDuration, "type:", typeof emergencyDuration);
    // console.log("numericDuration:", numericDuration, "type:", typeof numericDuration);

    // // if (numericDuration > 0) {
    // //   const emergencyReadyTime = now.plus({ minutes: numericDuration });

    // //   const appointments = await AppointmentService.getTodayAppointments(createdBy);
    // //   appointments.sort((a, b) => {
    // //     const aStart = DateTime.fromFormat(a.startTime, "h:mm a", { zone: "Asia/Kolkata" });
    // //     const bStart = DateTime.fromFormat(b.startTime, "h:mm a", { zone: "Asia/Kolkata" });
    // //     return aStart - bStart;
    // //   });

    // //   let candidateStart = emergencyReadyTime;
    // //   for (let i = 0; i <= appointments.length; i++) {
    // //     const currentAppt = appointments[i];
    // //     const nextStart = currentAppt
    // //       ? DateTime.fromFormat(currentAppt.startTime, "h:mm a", { zone: "Asia/Kolkata" }).set({
    // //           year: now.year,
    // //           month: now.month,
    // //           day: now.day,
    // //         })
    // //       : null;

    // //     const candidateEnd = candidateStart.plus({ minutes: duration });

    // //     if (!nextStart || candidateEnd <= nextStart) {
    // //       // Found a gap before the next appointment, or we're at the end
    // //       break;
    // //     }

    // //     candidateStart = DateTime.fromFormat(currentAppt.endTime, "h:mm a", { zone: "Asia/Kolkata" }).set({
    // //       year: now.year,
    // //       month: now.month,
    // //       day: now.day,
    // //     });
    // //   }

    // //   startTime = candidateStart;
    // // } 
    // //const now = DateTime.now().setZone("Asia/Kolkata");
    // const sessionEndTime = DateTime.fromFormat(schedule.session.endTime, "h:mm a", { zone: "Asia/Kolkata" });

    // if (numericDuration > 0) {
    //   const emergencyReadyTime = now.plus({ minutes: numericDuration });

    //   const appointments = await AppointmentService.getTodayAppointments(createdBy);
    //   appointments.sort((a, b) => {
    //     const aStart = DateTime.fromFormat(a.startTime, "h:mm a", { zone: "Asia/Kolkata" });
    //     const bStart = DateTime.fromFormat(b.startTime, "h:mm a", { zone: "Asia/Kolkata" });
    //     return aStart - bStart;
    //   });

    //   let candidateStart = emergencyReadyTime;
    //   let inserted = false;

    //   for (let i = 0; i <= appointments.length; i++) {
    //     const currentAppt = appointments[i];
    //     const currentStart = currentAppt
    //       ? DateTime.fromFormat(currentAppt.startTime, "h:mm a", { zone: "Asia/Kolkata" })
    //       : null;

    //     const candidateEnd = candidateStart.plus({ minutes: duration });

    //     // If no appointment or there's enough gap before the next appointment
    //     if (!currentStart || candidateEnd <= currentStart) {
    //       inserted = true;
    //       break;
    //     }

    //     // Otherwise, shift candidateStart to after current appointment
    //     const currentEnd = DateTime.fromFormat(currentAppt.endTime, "h:mm a", { zone: "Asia/Kolkata" });
    //     candidateStart = currentEnd;
    //   }

    //   // If candidateEnd exceeds session, we may still add but mark it as overflow
    //   const candidateEnd = candidateStart.plus({ minutes: duration });
    //   if (candidateEnd > sessionEndTime) {
    //     console.log("⚠️ Emergency appointment will overflow session.");
    //   }

    //   startTime = candidateStart;
    // } else {
    //   // Check if requestedStartTime is valid for the else block.
    //   if (!requestedStartTime || typeof requestedStartTime !== "string") {
    //     throw new Error("Invalid or missing requestedStartTime.");
    //   } else {
    //     startTime = DateTime.fromFormat(requestedStartTime, "h:mm a", { zone: "Asia/Kolkata" }).set({
    //       year: now.year,
    //       month: now.month,
    //       day: now.day,
    //     });
    //   }
    // }
    // console.log("duration is...", duration);
    // let endTime = startTime.plus({ minutes: duration });
    // console.log("End Time in createPateint", endTime);
    // console.log("endTime",  endTime);
    //     const newPatient = new Patient({
    //       name,
    //       dateOfBirth,
    //       gender,
    //       contactInformation,
    //       email,
    //       phoneNumber,
    //       createdBy,
    //       symptoms,
    //       startTime,
    //       emergencyDuration,

    //     });
    //     await newPatient.save();
        


    //     const appointments = await AppointmentService.getTodayAppointments(newPatient.createdBy);
    //     const overlapping = appointments.filter((appt) => {
    //       const apptStart = DateTime.fromFormat(appt.startTime, "h:mm a", { zone: "Asia/Kolkata" }).set({
    //         year: now.year,
    //         month: now.month,
    //         day: now.day,
    //       });
    //       const apptEnd = DateTime.fromFormat(appt.endTime, "h:mm a", { zone: "Asia/Kolkata" }).set({
    //         year: now.year,
    //         month: now.month,
    //         day: now.day,
    //       });
    //       return startTime < apptEnd && endTime > apptStart;
    //     });

    //     if (overlapping.length > 0) {
    //       const hasActive = overlapping.some((appt) => appt.status === "Active");
    //       const conflictBase = hasActive
    //         ? overlapping.find((appt) => appt.status === "Active")
    //         : overlapping[0];

    //       const conflictEnd = DateTime.fromFormat(conflictBase.endTime, "h:mm a", { zone: "Asia/Kolkata" }).set({
    //         year: now.year,
    //         month: now.month,
    //         day: now.day,
    //       });

    //       startTime = conflictEnd;
    //       endTime = startTime.plus({ minutes: duration });

    //       const affectedAppointments = appointments.filter((appt) => {
    //         const apptStart = DateTime.fromFormat(appt.startTime, "h:mm a", { zone: "Asia/Kolkata" }).set({
    //           year: now.year,
    //           month: now.month,
    //           day: now.day,
    //         });
    //         return apptStart >= startTime;
    //       }).sort((a, b) => {
    //         const aStart = DateTime.fromFormat(a.startTime, "h:mm a", { zone: "Asia/Kolkata" });
    //         const bStart = DateTime.fromFormat(b.startTime, "h:mm a", { zone: "Asia/Kolkata" });
    //         return aStart - bStart;
    //       });

    //       for (const appt of affectedAppointments) {
    //         const apptStart = DateTime.fromFormat(appt.startTime, "h:mm a", { zone: "Asia/Kolkata" }).plus({ minutes: duration });
    //         const apptEnd = apptStart.plus({ minutes: duration });

    //         const isMorning = isInMorningSession(appt.startTime, schedule);
    //         const isNowInSession = isInMorningSession(apptStart.toFormat("h:mm a"), schedule);

    //         if (isMorning && !isNowInSession) {
    //           extendSessionBoundary("morning", schedule, duration);
    //         } else if (!isMorning && !isNowInSession) {
    //           extendSessionBoundary("evening", schedule, duration);
    //         }

    //         appt.startTime = apptStart.toFormat("h:mm a");
    //         appt.endTime = apptEnd.toFormat("h:mm a");
    //         await appt.save();
    //       }
    //     }

    //     const appointmentData = {
    //       doctorId: newPatient.createdBy,
    //       patientId: newPatient._id,
    //       appointmentDate: now.toJSDate(),
    //       startTime: startTime.toFormat("h:mm a"),
    //       endTime: endTime.toFormat("h:mm a"),
    //       symptom: symptoms,
    //       latitude: "22.7196° N",
    //       longitude: "120.2963° E",
    //       status: "Pending",
    //     };

    //     await AppointmentService.createAppointment(appointmentData);
    //     return newPatient;
    //   } catch (error) {
    //     console.error("Error in createPatient:", error.message);
    //     throw error;
    //   }
    // }

// if (numericDuration > 0) {
//   const emergencyReadyTime = now.plus({ minutes: numericDuration });

//   const appointments = await AppointmentService.getTodayAppointments(createdBy);
//   appointments.sort((a, b) => {
//     const aStart = DateTime.fromFormat(a.startTime, "h:mm a", { zone: "Asia/Kolkata" });
//     const bStart = DateTime.fromFormat(b.startTime, "h:mm a", { zone: "Asia/Kolkata" });
//     return aStart - bStart;
//   });

//   let candidateStart = emergencyReadyTime;
//   for (let i = 0; i <= appointments.length; i++) {
//     const currentAppt = appointments[i];
//     const nextStart = currentAppt
//       ? DateTime.fromFormat(currentAppt.startTime, "h:mm a", { zone: "Asia/Kolkata" }).set({
//           year: now.year,
//           month: now.month,
//           day: now.day,
//         })
//       : null;

//     const candidateEnd = candidateStart.plus({ minutes: duration });

//     if (!nextStart || candidateEnd <= nextStart) {
//       // Found a gap before the next appointment, or we're at the end
//       break;
//     }

//     candidateStart = DateTime.fromFormat(currentAppt.endTime, "h:mm a", { zone: "Asia/Kolkata" }).set({
//       year: now.year,
//       month: now.month,
//       day: now.day,
//     });
//   }

//   startTime = candidateStart;
// } 


//would use later when firebase listener is added in frontend
// static async loginUserWithOtp(phoneNumber, deviceToken, otp) {
//   // Validate phone number
//   if (!phoneNumber) {
//       throw new Error("Phone number is required for login");
//   }

//   // Validate device token
//   if (!deviceToken) {
//       throw new Error("Device token is required for authentication");
//   }

//   // Validate OTP
//   if (!otp) {
//       throw new Error("OTP is required");
//   }

//   const STATIC_OTP = '555555';
//   if (otp !== STATIC_OTP) {
//       throw new Error("Invalid OTP");
//   }

//   // Find the user by phone number
//   const user = await Patient.findOne({ phoneNumber });
//   if (!user) {
//       throw new Error("User not found");
//   }

//   // Initialize deviceTokens array if not present
//   if (!Array.isArray(user.deviceTokens)) {
//       user.deviceTokens = [];
//   }

//   // Add new deviceToken if it's not already saved
//   if (!user.deviceTokens.includes(deviceToken)) {
//       user.deviceTokens.push(deviceToken);
//       await user.save();
//   }

//   // Generate JWT token
//   const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

//   return { token, message: "Login successful with OTP. Device token stored." };
// }

//login function for patient


// static async createPatient(patientData) {
//   try {
//     const {
//       existingId,
//       name,
//       dateOfBirth,
//       gender,
//       contactInformation,
//       email,
//       phoneNumber,
//       createdBy,
//       symptoms,
//       startTime: requestedStartTime, // passed from frontend
//       emergencyDuration = 0,
//     } = patientData;
    

//     if (!name || !phoneNumber || !createdBy) {
//       throw new Error("Name, phone number, and doctor ID are required.");
//     }

//     const existingPatient = await Patient.findOne({ phoneNumber });
//   //   if (existingPatient) {
//   //      return {
//   //       success: false,
//   //       message: "Patient with this phone number already exists.",
//   //       patient: existingPatient
//   // };
//   //   }


//     // Before creating the patient, calculate startTime and endTime
// const schedule = await DoctorService.getAvailability(createdBy);
// const duration = 

// Number(schedule.appointmentDuration.match(/\d+/)?.[0] || 0);
// const now = DateTime.now().setZone("Asia/Kolkata");


// //const emergencyDuration = body.emergencyDuration;
// const numericDuration = Number(emergencyDuration);
// if (isNaN(numericDuration)) {
//   throw new Error("Invalid emergency duration: must be a number.");
// }

// //startTime = now.plus({ minutes: numericDuration });
// console.log("requestedStartTime:", requestedStartTime);
// console.log("emergencyDuration:", emergencyDuration);

// console.log("🔥 EMERGENCY MODE:", { emergencyDuration, requestedStartTime });

// // STEP 1: Get doctor's slot duration (FIXED regex)
// // const duration = Number(schedule.appointmentDuration.replace(/\D/g, '')) || 10;
// // console.log("📅 Slot duration:", duration, "mins");

// // STEP 2: Calculate arrival time
// let candidateTime;
// if (numericDuration > 0) {
//   // 🚨 EMERGENCY: Patient arrives in X mins
//   candidateTime = now.plus({ minutes: numericDuration });
//   console.log("⏰ Will arrive by:", candidateTime.toFormat("h:mm a"));
// } else {
//   // Normal booking
//   if (!requestedStartTime || typeof requestedStartTime !== "string") {
//     throw new Error("Invalid or missing requestedStartTime.");
//   }
//   candidateTime = DateTime.fromFormat(requestedStartTime, "h:mm a", { zone: "Asia/Kolkata" })
//     .set({ year: now.year, month: now.month, day: now.day });
// }

// // STEP 3: SNAP TO NEXT CLEAN SLOT (1:00, 1:10, 1:20...)
// const minsToday = candidateTime.hour * 60 + candidateTime.minute;
// const nextSlotMinutes = Math.ceil(minsToday / duration) * duration;
// console.log("🎯 Snapping from", candidateTime.toFormat("h:mm a"), "→ slot starts at", 
//   Math.floor(nextSlotMinutes/60), ":", nextSlotMinutes%60);

// let startTime = now.startOf('day').plus({ minutes: nextSlotMinutes });
// let endTime = startTime.plus({ minutes: duration });

// console.log("✅ FINAL BOOKING:");
// console.log("   Start:", startTime.toFormat("h:mm a"));
// console.log("   End:  ", endTime.toFormat("h:mm a"));

//   if(existingId){
//        const appointmentData = {
//       doctorId: createdBy,
//       patientId: existingId,
//       appointmentDate: now.toJSDate(),
//       startTime: startTime.toFormat("h:mm a"),
//       endTime: endTime.toFormat("h:mm a"),
//       symptom: symptoms,
//       latitude: "22.7196° N",
//       longitude: "120.2963° E",
//       status: "Pending",
//     };

//    const appointment = await AppointmentService.createAppointment(appointmentData);
//    return appointment;
//   }
//     const newPatient = new Patient({
//       name,
//       dateOfBirth,
//       gender,
//       contactInformation,
//       email,
//       phoneNumber,
//       createdBy,
//       createdByModel: "Doctor",
//       symptoms,
//       startTime,
//       emergencyDuration,

//     });
//     await newPatient.save();
    


//     const appointments = await AppointmentService.getTodayAppointments(newPatient.createdBy);
//     const overlapping = appointments.filter((appt) => {
//       const apptStart = DateTime.fromFormat(appt.startTime, "h:mm a", { zone: "Asia/Kolkata" }).set({
//         year: now.year,
//         month: now.month,
//         day: now.day,
//       });
//       const apptEnd = DateTime.fromFormat(appt.endTime, "h:mm a", { zone: "Asia/Kolkata" }).set({
//         year: now.year,
//         month: now.month,
//         day: now.day,
//       });
//       return startTime < apptEnd && endTime > apptStart;
//     });

//     if (overlapping.length > 0) {
//       const hasActive = overlapping.some((appt) => appt.status === "Active");
//       const conflictBase = hasActive
//         ? overlapping.find((appt) => appt.status === "Active")
//         : overlapping[0];

//       const conflictEnd = DateTime.fromFormat(conflictBase.endTime, "h:mm a", { zone: "Asia/Kolkata" }).set({
//         year: now.year,
//         month: now.month,
//         day: now.day,
//       });

//       startTime = conflictEnd;
//       endTime = startTime.plus({ minutes: duration });

//       const affectedAppointments = appointments.filter((appt) => {
//         const apptStart = DateTime.fromFormat(appt.startTime, "h:mm a", { zone: "Asia/Kolkata" }).set({
//           year: now.year,
//           month: now.month,
//           day: now.day,
//         });
//         return apptStart >= startTime;
//       }).sort((a, b) => {
//         const aStart = DateTime.fromFormat(a.startTime, "h:mm a", { zone: "Asia/Kolkata" });
//         const bStart = DateTime.fromFormat(b.startTime, "h:mm a", { zone: "Asia/Kolkata" });
//         return aStart - bStart;
//       });

//       for (const appt of affectedAppointments) {
//         const apptStart = DateTime.fromFormat(appt.startTime, "h:mm a", { zone: "Asia/Kolkata" }).plus({ minutes: duration });
//         const apptEnd = apptStart.plus({ minutes: duration });

//         const isMorning = isInMorningSession(appt.startTime, schedule);
//         const isNowInSession = isInMorningSession(apptStart.toFormat("h:mm a"), schedule);

//         if (isMorning && !isNowInSession) {
//           extendSessionBoundary("morning", schedule, duration);
//         } else if (!isMorning && !isNowInSession) {
//           extendSessionBoundary("evening", schedule, duration);
//         }

//         appt.startTime = apptStart.toFormat("h:mm a");
//         appt.endTime = apptEnd.toFormat("h:mm a");
//         await appt.save();
//       }
//     }

//     const appointmentData = {
//       doctorId: newPatient.createdBy,
//       patientId: newPatient._id,
//       appointmentDate: now.toJSDate(),
//       startTime: startTime.toFormat("h:mm a"),
//       endTime: endTime.toFormat("h:mm a"),
//       symptom: symptoms,
//       latitude: "22.7196° N",
//       longitude: "120.2963° E",
//       status: "Pending",
//     };

//     await AppointmentService.createAppointment(appointmentData);
//     return newPatient;
//   } catch (error) {
//     console.error("Error in createPatient:", error.message);
//     throw error;
//   }
// }


static async createPatient(io, patientData) {
  try {
    const {
      existingId,
      name,
      dateOfBirth,
      gender,
      contactInformation,
      email,
      phoneNumber,
      createdBy,
      symptoms,
      startTime: requestedStartTime,
      emergencyDuration = 0,
    } = patientData;

    if (!name || !phoneNumber || !createdBy) {
      throw new Error("Name, phone number, and doctor ID are required.");
    }
    console.log("Creating patient with data:", patientData);

    const schedule = await DoctorService.getAvailability(createdBy);
    console.log("Retrieved schedule for doctor:", schedule);
  //  const schedule = await DoctorController.getAvailability(createdBy);
    const duration = Number(schedule.schedule.appointmentDuration.replace(/\D/g, '')) || 10;
    const now = DateTime.now().setZone("Asia/Kolkata");

    const numericDuration = Number(emergencyDuration);
    if (isNaN(numericDuration)) {
      throw new Error("Invalid emergency duration.");
    }

    console.log("EMERGENCY MODE:", { emergencyDuration, requestedStartTime });

    // STEP 1: Decide candidate time
    let candidateTime;
    if (numericDuration > 0) {
      candidateTime = now.plus({ minutes: numericDuration });
      console.log("Will arrive by:", candidateTime.toFormat("h:mm a"));
    } else {
      if (!requestedStartTime || typeof requestedStartTime !== "string") {
        throw new Error("Invalid requestedStartTime.");
      }
      candidateTime = DateTime.fromFormat(requestedStartTime, "h:mm a", { zone: "Asia/Kolkata" })
        .set({ year: now.year, month: now.month, day: now.day });
    }

    // STEP 2: Snap to next clean slot
//     const minsToday = candidateTime.hour * 60 + candidateTime.minute;
//     const nextSlotMins = Math.ceil(minsToday / duration) * duration;
//     let desiredStart = now.startOf('day').plus({ minutes: nextSlotMins });
//     let desiredEnd = desiredStart.plus({ minutes: duration });

//     console.log("Snapped to:", desiredStart.toFormat("h:mm a"));

//     // Helper
//     const toDT = (t) => DateTime.fromFormat(t, "h:mm a", { zone: "Asia/Kolkata" })
//       .set({ year: now.year, month: now.month, day: now.day });

//     let finalStartTime = desiredStart;
//     let finalEndTime = desiredEnd;

//     // Only for NEW patients — existing bypass conflict
//     if (!existingId) {
//       const appointments = await AppointmentService.getTodayAppointments(createdBy);

//       // Find where to INSERT emergency
//      // Find where to INSERT emergency
// const insertIdx = appointments.findIndex(appt => {
//   const apptStart = toDT(appt.startTime);
//   return apptStart >= desiredStart;
// });

// if (insertIdx !== -1) {
//   // Emergency takes the desired slot
//   finalStartTime = desiredStart;
//   finalEndTime = finalStartTime.plus({ minutes: duration });

//   console.log("EMERGENCY JUMPING to", finalStartTime.toFormat("h:mm a"));

//   // SHIFT all from insertIdx onward (except Active)
//   // Only shift appointments that START AT OR AFTER the emergency slot
//   for (let i = insertIdx; i < appointments.length; i++) {
//     const appt = appointments[i];
//     const apptStart = toDT(appt.startTime);
    
//     // Skip if this appointment starts BEFORE the emergency slot
//     if (apptStart < desiredStart) {
//       console.log(`Skipping ${appt.patientId} at ${appt.startTime} (before emergency)`);
//       continue;
//     }
    
//     if (appt.status === "Active") {
//       console.log("Active patient — NOT shifting");
//       continue;
//     }

//     const oldStart = apptStart;
//     const newStart = oldStart.plus({ minutes: duration });

//     appt.startTime = newStart.toFormat("h:mm a");
//     appt.endTime = newStart.plus({ minutes: duration }).toFormat("h:mm a");
//     await appt.save();

//     console.log(`Shifted ${appt.patientId}: ${oldStart.toFormat("h:mm a")} → ${appt.startTime}`);
//   }
// }else {
//   // No conflicts - use desired time or add after last appointment
//   if (appointments.length > 0) {
//     const last = appointments[appointments.length - 1];
//     const lastEnd = toDT(last.endTime);
    
//     // Use whichever is later: requested time or after last appointment
//     finalStartTime = desiredStart > lastEnd ? desiredStart : lastEnd;
//   } else {
//     // No appointments at all
//     finalStartTime = desiredStart;
//   }
  
//   finalEndTime = finalStartTime.plus({ minutes: duration });
//   console.log("Added at end:", finalStartTime.toFormat("h:mm a"));
// }
//     }

//     // FINAL TIMES
//     const startTime = finalStartTime;
//     const endTime = finalEndTime;

//     console.log("BOOKED:", startTime.toFormat("h:mm a"), "–", endTime.toFormat("h:mm a"));

//     // ——— CREATE PATIENT OR USE EXISTING ———
//     let patientId;

//     if (existingId) {
//       patientId = existingId;
//     } else {
//       const newPatient = new Patient({
//         name, dateOfBirth, gender, contactInformation,
//         email, phoneNumber, createdBy, createdByModel: "Doctor",
//         symptoms, startTime, emergencyDuration
//       });
//       await newPatient.save();
//       patientId = newPatient._id;
//     }

// STEP 2: Snap to next clean slot
const minsToday = candidateTime.hour * 60 + candidateTime.minute;
const nextSlotMins = Math.ceil(minsToday / duration) * duration;
let desiredStart = now.startOf('day').plus({ minutes: nextSlotMins });
let desiredEnd = desiredStart.plus({ minutes: duration });

console.log("Snapped to:", desiredStart.toFormat("h:mm a"));

// Helper
const toDT = (t) => DateTime.fromFormat(t, "h:mm a", { zone: "Asia/Kolkata" })
  .set({ year: now.year, month: now.month, day: now.day });

let finalStartTime = desiredStart;
let finalEndTime = desiredEnd;

// Get all appointments to check for conflicts
const appointments = await AppointmentService.getTodayAppointments(createdBy);

// Handle emergency appointments (both new and existing patients)
if (numericDuration > 0) {
  // Find where to INSERT emergency
  const insertIdx = appointments.findIndex(appt => {
    const apptStart = toDT(appt.startTime);
    return apptStart >= desiredStart;
  });

  if (insertIdx !== -1) {
    // Emergency takes the desired slot
    finalStartTime = desiredStart;
    finalEndTime = finalStartTime.plus({ minutes: duration });

    console.log("EMERGENCY JUMPING to", finalStartTime.toFormat("h:mm a"));

    // SHIFT all from insertIdx onward (except Active)
    for (let i = insertIdx; i < appointments.length; i++) {
      const appt = appointments[i];
      const apptStart = toDT(appt.startTime);
      
      // Skip if this appointment starts BEFORE the emergency slot
      if (apptStart < desiredStart) {
        console.log(`Skipping ${appt.patientId} at ${appt.startTime} (before emergency)`);
        continue;
      }
      
      if (appt.status === "Active") {
        console.log("Active patient — NOT shifting");
        continue;
      }

      const oldStart = apptStart;
      const newStart = oldStart.plus({ minutes: duration });

      appt.startTime = newStart.toFormat("h:mm a");
      appt.endTime = newStart.plus({ minutes: duration }).toFormat("h:mm a");
      await appt.save();

      console.log(`Shifted ${appt.patientId}: ${oldStart.toFormat("h:mm a")} → ${appt.startTime}`);
    }
  } else {
    // No conflicts - add at end or use desired time
    if (appointments.length > 0) {
      const last = appointments[appointments.length - 1];
      const lastEnd = toDT(last.endTime);
      finalStartTime = desiredStart > lastEnd ? desiredStart : lastEnd;
    } else {
      finalStartTime = desiredStart;
    }
    finalEndTime = finalStartTime.plus({ minutes: duration });
    console.log("Added at end:", finalStartTime.toFormat("h:mm a"));
  }
} else {
  // Non-emergency appointment - respect requested time
  // if (appointments.length > 0) {
  //   const last = appointments[appointments.length - 1];
  //   const lastEnd = toDT(last.endTime);
  //   finalStartTime = desiredStart > lastEnd ? desiredStart : lastEnd;
  // } else {
  //   finalStartTime = desiredStart;
  // }
  // finalEndTime = finalStartTime.plus({ minutes: duration });

   let conflict = null;

  for (const appt of appointments) {
    const apptStart = toDT(appt.startTime);
    const apptEnd = toDT(appt.endTime);

    // overlap check
    if (
      desiredStart < apptEnd &&
      desiredEnd > apptStart
    ) {
      conflict = appt;
      break;
    }
  }

  if (!conflict) {
    // Slot is free → book here
    finalStartTime = desiredStart;
    finalEndTime = desiredEnd;
    console.log("Booked at requested slot:", finalStartTime.toFormat("h:mm a"));
  } else {
    // Slot busy → push after the conflicting appointment
    const conflictEnd = toDT(conflict.endTime);
    finalStartTime = conflictEnd;
    finalEndTime = finalStartTime.plus({ minutes: duration });

    console.log(
      "Requested slot busy, moved to:",
      finalStartTime.toFormat("h:mm a")
    );
  }
}

// FINAL TIMES
const startTime = finalStartTime;
const endTime = finalEndTime;

console.log("BOOKED:", startTime.toFormat("h:mm a"), "–", endTime.toFormat("h:mm a"));

// ——— CREATE PATIENT OR USE EXISTING ———
let patientId;

if (existingId) {
  patientId = existingId;
} else {
  const newPatient = new Patient({
    name, dateOfBirth, gender, contactInformation,
    email, phoneNumber, createdBy, createdByModel: "Doctor",
    symptoms, startTime, emergencyDuration
  });
  await newPatient.save();
  patientId = newPatient._id;
}

// ... rest of appointment creation ...
    // ——— CREATE APPOINTMENT ———
    const appointmentData = {
      doctorId: createdBy,
      patientId,
      appointmentDate: now.toJSDate(),
      startTime: startTime.toFormat("h:mm a"),
      endTime: endTime.toFormat("h:mm a"),
      symptom: symptoms || "General Checkup",
      latitude: "22.7196° N",
      longitude: "120.2963° E",
      status: "Pending",
      emergencyDuration: numericDuration,
    };

      const appointment = await AppointmentService.createAppointment(io, appointmentData);
    console.log("Appointment created:", appointment._id);

    return existingId ? appointment : await Patient.findById(patientId);

  } catch (error) {
    console.error("createPatient Error:", error.message);
    throw error;
  }
}

static async checkPhone(phoneNumber) {
  try {
    //const { phoneNumber } = req.body;

    // Validate input
    if (!phoneNumber) {
      throw new Error("Phone number is required for login");
    }

    // Check if user exists
    const user = await Patient.findOne({ phoneNumber });
    if (!user) {
      throw new Error("User not found");
    }
    if(user.patient_status === "blocked"){
      throw new Error("User is blocked");
    }
    // (Optional) Simulate sending OTP here
   // console.log(`Sending OTP to ${phoneNumber}...`);

    // Respond success
    return ({ message: "OTP sent successfully." });
  } catch (error) {
    console.error("Error checking phone number:", error);
    if(error.message === "User is blocked") {
      return ({ message: "You have been blocked by Admin. Kindly contact admin for more info." });
    }
    return ({ message: "Phone Number doesn't exist." });
  }
}

  static async registerPatient(data){
    try{
      const {
        phoneNumber,
        name
      } = data;
      if (!name) {
      throw new Error("Name is required.");
    }
    if (!phoneNumber) {
      throw new Error("Phone Number is required.");
    }

    const existingPatient = await Patient.findOne({ phoneNumber });
    if (existingPatient) {
      throw new Error("Patient with this phone number already exists.");
    }
     const newPatient = new Patient({
      phoneNumber,
      name,
      createdByModel: "Patient",
     })
     await newPatient.save();
     return newPatient;
         } catch (error){
        console.error("Error in registring patient", error.message);
        throw error;
    }
  }

  static async LoginPatient(phoneNumber, deviceToken, lat, long) {
  // Validate phone number
  if (!phoneNumber) {
      throw new Error("Phone number is required for login");
  }

  // Validate OTP
  // if (!otp) {
  //     throw new Error("OTP is required");
  // }

  // const STATIC_OTP = '555555';
  // if (otp !== STATIC_OTP) {
  //     throw new Error("Invalid OTP");
  // }

  // Find user by phone number
  const user = await Patient.findOne({ phoneNumber });
  if (!user) {
      throw new Error("User not found");
  }

   // Update location if provided
  if (lat !== undefined && long !== undefined) {
    user.location = { lat, long };
    //user.updatedAt = new Date(); // Optional timestamp
  }
  // Generate JWT token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

  // Initialize deviceTokens if it doesn't exist (for older records)
  if (!Array.isArray(user.deviceTokens)) {
    user.deviceTokens = [];
}
   // Add the new device token if it's not already stored
   if (!user.deviceTokens.includes(deviceToken)) {
    user.deviceTokens.push(deviceToken);
    await user.save();
}

  //await patient.save();

  return { token, message: "Login successful with OTP." };
}

// static async loginPatient(phoneNumber, accessToken, deviceToken, lat, long) {
//   // Validate inputs
//   if (!phoneNumber) {
//     throw new Error("Phone number is required for login");
//   }

//   if (!accessToken) {
//     throw new Error("Access token is required");
//   }

//   // Step 1: Verify access token using MSG91
//   const msg91Url = 'https://control.msg91.com/api/v5/widget/verifyAccessToken';
//   const msg91AuthKey = process.env.MSG91_AUTH_KEY; // store this securely in env

//   const response = await fetch(msg91Url, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       'Accept': 'application/json'
//     },
//     body: JSON.stringify({
//       authkey: msg91AuthKey,
//       'access-token': accessToken
//     })
//   });

//   console.log("MSG91 response status:", response.status);

//   const result = await response.json();
//   console.log("MSG91 response:", result);

 

//   // Step 2: Check user in database
//   const user = await Patient.findOne({ phoneNumber });
//   if (!user) {
//     throw new Error("User not found");
//   }

//   // Step 3: Update location if provided
//   if (lat !== undefined && long !== undefined) {
//     user.location = { lat, long };
//   }

//   // Step 4: Generate JWT token
//   const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '8h' });

//   // Step 5: Save device token if new
//   if (!Array.isArray(user.deviceTokens)) {
//     user.deviceTokens = [];
//   }

//   if (!user.deviceTokens.includes(deviceToken)) {
//     user.deviceTokens.push(deviceToken);
//     await user.save();
//   }

//      if (response.status === 200 ) {
//        return { token, message: "Login successful with OTP." };
//      }
  
// }

static async loginPatient(phoneNumber, accessToken, deviceToken, lat, long) {
  if (!phoneNumber) throw new Error("Phone number is required for login");
  if (!accessToken) throw new Error("Access token is required");

  const msg91Url = "https://control.msg91.com/api/v5/widget/verifyAccessToken";
  const msg91AuthKey = process.env.MSG91_AUTH_KEY;

  const response = await fetch(msg91Url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      authkey: msg91AuthKey,
      "access-token": accessToken,
    }),
  });

//  console.log("MSG91 response status:", response.status);
  const result = await response.json();

  const user = await Patient.findOne({ phoneNumber });
  if (!user) throw new Error("User not found");

  // Add blocked check
  if (user.patient_status === "blocked") {
    throw new Error("User is blocked");
  }

  const newPatientId = await generatePatientUniqueId();
console.log("Generated patientUniqueId:", newPatientId);
const res = await Patient.updateOne(
  {
    _id: user._id,
    $or: [
      { patientUniqueId: { $exists: false } },
      { patientUniqueId: null },
      { patientUniqueId: "" }
    ]
  },
  {
    $set: { patientUniqueId: newPatientId }
  }
);

if (res.modifiedCount === 1) {
  console.log(
    `Generated patientUniqueId for user ${user._id}: ${newPatientId}`
  );
}

  if (lat !== undefined && long !== undefined) {
    user.location = { lat, long };
  }

  //  Include tokenVersion in the token payload
  const token = jwt.sign(
    {
      id: user._id,
      tokenVersion: user.tokenVersion,
    },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );

  if (!Array.isArray(user.deviceTokens)) user.deviceTokens = [];

  if (!user.deviceTokens.includes(deviceToken)) {
    user.deviceTokens.push(deviceToken);
    await user.save();
  }

  if (response.status === 200) {
    return { token, message: "Login successful with OTP." };
  }
}



static async logout(token, deviceToken) {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Find the patient using the JWT token payload
    const user = await Patient.findById(payload.id);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if the FCM token exists in the deviceTokens array
    const deviceIndex = user.deviceTokens.indexOf(deviceToken)
    console.log("deviceIndex", deviceIndex);
    if (deviceIndex === -1) {
      throw new Error("Invalid device or already logged out.");
    }

    // Remove the FCM token from the deviceTokens array (logging out from the device)
    user.deviceTokens.splice(deviceIndex, 1);
    await user.save();

    return { message: "Logged out successfully from this device." };
  } catch (err) {
    console.log("error", err);
    throw new Error("Invalid token or already logged out.");
  }
}

  //fetch a patient by phoneNumber
    static async getPatientByPhone(phoneNumber){

      const patient = await Patient.findOne({ phoneNumber });

      if(!patient) return null;
      return {
          
      _id: patient._id,
      name: patient.name,
      phone: patient.phoneNumber,
      };
    }
    


  static async getPatient(patientId) {
    if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
      throw new Error("Invalid patientId format");
    }
    const patient = await Patient.findById(patientId);
    if (!patient) throw new Error("Patient not found");
    return patient;
  }


  
// Updated searchDoctors function with proper today's availability check
static async searchDoctors(patientId, lat, long, filters) {
   
    
    console.log("searching doctors with filters:", filters);
    const {
      keyword,
      location,
      clinicNames,
      specialization,
      distance: maxDistance = 500000,
      startTime,
      endTime,
      isAvailableToday
    } = filters;

    const query = {};
    if (keyword) {
      const regex = new RegExp(keyword, 'i');
      query.$or = [
        { doctorName: regex },
        { specialization: regex },
        { symptoms: regex },
        { location: regex },
        { clinicNames: regex },
        { symptomsTreated: { $elemMatch: { $regex: regex } } },
      ];
    }
    if (location) query.location = new RegExp(location, 'i');
    if (clinicNames?.length) query.clinicName = { $in: clinicNames };
    if (specialization?.length) query.specialization = { $in: specialization };

    if (patientId) {
      await SearchHistoryService.saveSearch(patientId, filters);
    }

    const patient = await Patient.findById(patientId);
    const storedLocation = patient?.location;

    if ((!lat || !long) && (!storedLocation?.lat || !storedLocation?.long)) {
      throw new Error("Valid patient location not found.");
    }

    if (lat && long) {
      patient.location = { lat, long };
      await patient.save();
    }

    const patientLocation = lat && long ? { lat, long } : storedLocation;
    const doctors = await Doctor.find(query);

    const todayIndex = DateTime.now().setZone("Asia/Kolkata").weekday % 7; // Sunday = 0

    const results = await Promise.all(
      doctors.map(async (doc) => {
        try {
          const { _id, doctorName, specialization, clinicName, location } = doc.toObject();
        
          const { lat: doctorLat, long: doctorLng } = doc.coordinates || {};
          
          if (!doctorLat || !doctorLng) {
            
            console.log(`❌ Doctor ${doctorName} skipped due to missing coordinates`);
            return null;
          }

         let availabilityDoc = await getAvailability(_id);

if (!availabilityDoc) {
  console.log(`❌ Doctor ${doctorName} has no availability info`);
  return null;
}

// ✅ convert to plain JS object
let availability = availabilityDoc.toObject();
          console.log(`Doctor ${doctorName} availability:`, availability);
          if (!availability) {
           
            console.log(`❌ Doctor ${doctorName} has no availability info`);
            return null;
          }

          // 🔑 CRITICAL CHECK: Doctor must be available today
          const todayIndex = new Date().getDay(); // Sunday = 0, Saturday = 6
          
          if (!availability.selectedDays[todayIndex]) {
           
            console.log(`❌ Doctor ${doctorName} not available today (day ${todayIndex})`);
            return null;
          }

          // 🔑 CRITICAL CHECK: Must have available slots TODAY
       
          const nextSlot = getNextAvailableSlot(availability.dailySlots || [], doctorName);
          if (!nextSlot) {
          
            console.log(`❌ Doctor ${doctorName} has NO available slots remaining today`);
            return null;
          }
          
          
          console.log(`✅ Doctor ${doctorName} next available slot TODAY:`, nextSlot);

          // Additional filter: if isAvailableToday is explicitly requested
          if (filters.isAvailableToday && !availability.selectedDays[todayIndex]) {
            console.log(`❌ Doctor ${doctorName} not available today (explicit filter)`);
            return null;
          }

          // Time range filter logic
          let timeMatch = true;
          if (filters.startTime && filters.endTime) {
            const { startTime, endTime } = filters;
            
            // Use flexible parsing instead of fixed format
            const parsedStart = parseFlexibleTime(startTime);
            const parsedEnd = parseFlexibleTime(endTime);
            
            if (!parsedStart || !parsedEnd) {
              console.error("❌ Failed to parse filter time range");
              timeMatch = false;
            } else {
              const sessions = [];

              // Check morning session for overlap
              if (availability.morningSession?.enabled === true) {
                const morningStart = parseFlexibleTime(availability.morningSession.start);
                const morningEnd = parseFlexibleTime(availability.morningSession.end);

                if (morningStart && morningEnd) {
                  // OVERLAP LOGIC: Check if there's any time overlap
                  if (parsedStart < morningEnd && parsedEnd > morningStart) {
                    sessions.push("morning");
                  }
                }
              }

              // Check evening session for overlap  
              if (availability.eveningSession?.enabled === true) {
                const eveningStart = parseFlexibleTime(availability.eveningSession.start);
                const eveningEnd = parseFlexibleTime(availability.eveningSession.end);

                if (eveningStart && eveningEnd) {
                  // OVERLAP LOGIC: Check if there's any time overlap
                  if (parsedStart < eveningEnd && parsedEnd > eveningStart) {
                    sessions.push("evening");
                  }
                }
              }

              if (sessions.length === 0) {
                console.log(`⏰ Doctor ${doctorName} does not match time range - Filter: ${startTime}-${endTime}`);
                timeMatch = false;
              }
            }
          }

// Remove disabled sessions
                if (availability.morningSession?.enabled === false) {
                  delete availability.morningSession;
                }

                if (availability.eveningSession?.enabled === false) {
                  delete availability.eveningSession;
                }

          console.log("availability after time filter:", availability);

          if (!timeMatch) return null;

          // Distance calculation
          const doctorLocation = { lat: doctorLat, long: doctorLng };
          const distanceData = await GoogleMaps.getDistanceAndTime(patientLocation, doctorLocation);
          const drivingInfo = distanceData?.driving;

          if (
            drivingInfo &&
            !drivingInfo.error &&
            drivingInfo.distanceInKm !== undefined &&
            drivingInfo.distanceInKm <= maxDistance
          ) {
            return {
              doctor: {
                _id,
                doctorName,
                specialization,
                clinicName,
                location,
                distance: drivingInfo.distanceInKm,
                duration: drivingInfo.durationInMinutes,
                distanceText: drivingInfo.distanceText,
                durationText: drivingInfo.durationText,
              },
              availability,
              travelModes: distanceData,
            };
          } else {
            console.log(`❌ Doctor ${doctorName} is too far: ${drivingInfo?.distanceInKm}km`);
          }

          return null;

        } catch (err) {
      
          console.error(`❌ Error processing doctor ${doc.doctorName}:`, err.message);
          return null;
        }
      })
    );


    return results.filter(Boolean);
}

static async getNotificationHistory(patientId) {
  try{
    const  patient = await Patient.findById(patientId)
    .select('notificationsForToday');

    if (!patient)  return [];
    return patient.notificationsForToday;
    
  } catch (error){
    console.error("Error fetching notification history:", error.message);
    throw error;
  }
}

 static async getUserSearchHistory(patientId, limit = 5) {
   try {
      const patient = await Patient.findById(patientId)
      .select('searchHistory');

    if (!patient) return [];

    return patient.searchHistory;
    }
    catch (err) {
      console.error('Error fetching search history:', err);
      throw err;
    }
  }

static async bookAppointmentForExistingPatient(appointmentData) {
 // const { doctorId, patientId, symptom } = data;
  // … validate inputs …
  try{
     const {
    doctorId,
    patientId,
    symptom,
    //checkIn = true,
    latitude = "22.7196° N",
    longitude = "120.2963° E",
    status = "Pending",
  } = appointmentData;

  if (!doctorId || !patientId || !symptom) {
    throw new Error("doctorId, patientId, and symptom are required.");
  }

  // find the next free slot
  const next = await this.findNextSlot(doctorId);

  // build your appointment from that
  const appointment = {
    doctorId,
    patientId,
    appointmentDate: DateTime.now().toJSDate(),
    startTime: next.start,
    endTime:   next.end,
    symptom,
   // checkIn,
    latitude,
    longitude,
    status,
  };

   await AppointmentService.createAppointment(appointment);
   return appointment;
} catch(error){
  console.error("Error in bookAppointmentForExistingPatient:", error.message);
  throw error;
}
}

    static async findNextSlot(doctorId) {
      // 1. Get today's slots (as returned by your existing function)
    // const { availableSlots } = await AppointmentService.getAvailableSlots(doctorId);
    const result = await AppointmentService.getAvailableSlots(doctorId);
    console.log("getAvailableSlots returned:", result);
    const availableSlots = result;

      // 2. Get current IST time, formatted exactly like your slots
      const now = DateTime.now().setZone("Asia/Kolkata");
      const nowStr = now.toFormat("h:mm a"); // e.g. "3:13 PM"

      // 3. Iterate the slots to find first whose start >= now
      for (const slot of availableSlots) {
        // Parse slot.start into a DateTime on today’s date
        const slotStart = DateTime.fromFormat(slot.start, "h:mm a", { zone: "Asia/Kolkata" })
          .set({ year: now.year, month: now.month, day: now.day });

        // If slotStart is equal or comes after now, that’s your next slot
        if (slotStart >= now) {
          return slot;
        }
      }

      // 4. If none found, no more slots today
      throw new Error("No available slots remaining today");
    }

    static async createAppointmentByPatient(appointmentData){
        try{
           const {
              doctorId,
              patientId,
              symptom,
              startTime,
              // latitude = "22.7196° N",
              // longitude = "120.2963° E",
              status = "Pending",
              lat,
              long,
              createdBy = "Patient"
            } = appointmentData;

            if(!startTime){
              throw new error("Booking time is required.");
            }

            const doctor = await Doctor.findById(doctorId);

            const patientLocation =  { lat, long };
            
            const coordinates = doctor.coordinates;
            const doctorLat = coordinates?.lat;
            const doctorLng = coordinates?.long;
                    
            const doctorLocation = { lat: doctorLat, long: doctorLng };
            const distanceData = await GoogleMaps.getDistanceAndTime(patientLocation, doctorLocation);
            console.log("distance Data", distanceData);
            const drivingInfo = distanceData.driving;
            console.log("driving info..", drivingInfo);
            console.log("driving info in km", drivingInfo.distanceInKm);

             // find the next free slot
            const next = await PatientService.findNextSlot(doctorId);

            const schedule = await DoctorService.getAvailability(doctorId);
          const duration = 

          Number(schedule.appointmentDuration.match(/\d+/)?.[0] || 0);
          console.log("duration is...", duration);
          console.log("startTime", startTime);
          // Convert startTime to DateTime object
          let startTimes = DateTime.fromFormat(startTime, "hh:mm a");
          let endTime = startTimes.plus({ minutes: duration });

          console.log("End Time in createPateint", endTime);
            // build your appointment from that
            const appointment = {
              doctorId,
              patientId,
              appointmentDate: DateTime.now().toJSDate(),
              startTime,
              endTime:   endTime.toFormat("h:mm a"),
              symptom,
            // checkIn,
              latitude: doctorLat,
              longitude: doctorLng,
              status,
              createdBy,
            };
            await AppointmentService.createAppointment(appointment);
            return {
              appointment,
              doctor: doctor,
              travelModes: distanceData,
            };
        }
        catch(error){
            console.error("Error in Booking Appointment. :", error.message);
            throw error;
        }
    }
    
    static async cancelAppointemnt({appointmentId, patientId, doctorId}){
      try{
        const updatedAppointment = await Appointment.findByIdAndUpdate(
          {_id: appointmentId, patientId, doctorId},
          {
            $unset: {
              appointmentDate: "",
              startTime: "",
              endTime: "",
              symptom: "",
              checkIn: "",
              latitude: "",
              longitude: ""
            },
            status: "Cancelled",
          }, {new: true}
        );
        return updatedAppointment;
      } catch(error){
        console.error("Error in camcelling Appointment..", error.message);
        throw new error("Cancellation failed.");
      }
    }

//     static async updateAppointmentTime({ appointmentId, patientId, doctorId, startTime }) {
//         try {
//           if (!startTime) {
//             throw new Error("New start time is required.");
//           }

//            // 1️⃣ Fetch the appointment to get the current start time
//     const existingAppointment = await Appointment.findOne({
//       _id: appointmentId,
//       patientId,
//       doctorId,
//     });

//     if (!existingAppointment) {
//       throw new Error("Appointment not found or does not belong to the patient/doctor.");
//     }

//     const previousStartTime = existingAppointment.startTime;
//     const previousEndTime = existingAppointment.endTime;
//     console.log(`🕒 Previous slot: ${previousStartTime} - ${previousEndTime}`);

//     // 2️⃣ Free up the old slot in DoctorSchedule
//     const doctorSchedule = await DoctorSchedule.findOne({ doctorId });

//     if (doctorSchedule) {
//       const slotIndex = doctorSchedule.dailySlots.findIndex(
//         (slot) => slot.start.trim() === previousStartTime.trim()
//       );

//       if (slotIndex !== -1) {
//         doctorSchedule.dailySlots[slotIndex].isBooked = false;
//         doctorSchedule.dailySlots[slotIndex].isLocked = false;
//         doctorSchedule.dailySlots[slotIndex].lockedAt = null;
//         doctorSchedule.dailySlots[slotIndex].lockExpiresAt = null;

//         await doctorSchedule.save();
//         console.log(`✅ Freed up previous slot at ${previousStartTime}`);
//       } else {
//         console.log(`⚠️ No matching slot found for ${previousStartTime} in DoctorSchedule`);
//       }
//     } else {
//       console.log(`⚠️ No DoctorSchedule found for doctorId: ${doctorId}`);
//     }

//     // Calculate new endTime based on the doctor's next slot
//     const next = await this.findNextSlot(doctorId);

//     // Find and update the appointment
//     const updatedAppointment = await Appointment.findOneAndUpdate(
//       { _id: appointmentId, patientId, doctorId },
//       {
//         startTime,
//         endTime: next.end,
//       },
//       { new: true } // to return the updated document
//     );

//     if (!updatedAppointment) {
//       throw new Error("Appointment not found or does not belong to the patient/doctor.");
//     }

//       if (doctorSchedule) {
//       const newSlotIndex = doctorSchedule.dailySlots.findIndex(
//         (slot) => slot.start.trim() === startTime.trim()
//       );

//       if (newSlotIndex !== -1) {
//         doctorSchedule.dailySlots[newSlotIndex].isBooked = true;
//         doctorSchedule.dailySlots[newSlotIndex].isLocked = true;
//         doctorSchedule.dailySlots[newSlotIndex].lockedAt = new Date();
//         doctorSchedule.dailySlots[newSlotIndex].lockExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // example 5-min lock
//         console.log(`🔒 Marked new slot at ${startTime} as booked/locked`);
//       } else {
//         console.log(`⚠️ No slot found for new time ${startTime} in doctor schedule`);
//       }

//       // Save both changes (old slot freed + new slot booked)
//       await doctorSchedule.save();
//     }

//     return updatedAppointment;
//   } catch (error) {
//     console.error("Error updating appointment time:", error.message);
//     throw error;
//   }
// }

static async updateAppointmentTime({ appointmentId, patientId, doctorId, startTime }) {
  try {
    if (!startTime) {
      throw new Error("New start time is required.");
    }

    // ✅ Normalize helper
    const normalizeTimeFormat = (timeString) => {
      if (!timeString) return timeString;
      // Convert "05:25 PM" → "5:25 PM"
      return timeString.replace(/^0+(\d)/, "$1").trim();
    };

    // 1️⃣ Normalize the incoming new startTime
    const normalizedNewStart = normalizeTimeFormat(startTime);

    // 2️⃣ Fetch the current appointment
    const existingAppointment = await Appointment.findOne({
      _id: appointmentId,
      patientId,
      doctorId,
    });

    if (!existingAppointment) {
      throw new Error("Appointment not found or does not belong to the patient/doctor.");
    }

    const previousStartTime = normalizeTimeFormat(existingAppointment.startTime);
    const previousEndTime = normalizeTimeFormat(existingAppointment.endTime);
    console.log(`🕒 Previous slot: ${previousStartTime} - ${previousEndTime}`);

    // 3️⃣ Free up the old slot in DoctorSchedule
    const doctorSchedule = await DoctorSchedule.findOne({ doctorId });

    if (doctorSchedule) {
      const oldSlotIndex = doctorSchedule.dailySlots.findIndex(
        (slot) => normalizeTimeFormat(slot.start) === previousStartTime
      );

      if (oldSlotIndex !== -1) {
        doctorSchedule.dailySlots[oldSlotIndex].isBooked = false;
        doctorSchedule.dailySlots[oldSlotIndex].isLocked = false;
        doctorSchedule.dailySlots[oldSlotIndex].lockedAt = null;
        doctorSchedule.dailySlots[oldSlotIndex].lockExpiresAt = null;
        console.log(`✅ Freed old slot at ${previousStartTime}`);
      } else {
        console.log(`⚠️ Old slot ${previousStartTime} not found in doctor schedule`);
      }
    } else {
      console.log(`⚠️ No schedule found for doctorId: ${doctorId}`);
    }

    // 4️⃣ Get the end time for new start time
    const nextSlot = await this.findNextSlot(doctorId);
  // 🔹 Find the slot matching the new start time
const newSlot = doctorSchedule.dailySlots.find(
  (slot) => normalizeTimeFormat(slot.start) === normalizedNewStart
);

if (!newSlot) {
  throw new Error(`No slot found for new start time: ${normalizedNewStart}`);
}

const newEndTime = normalizeTimeFormat(newSlot.end || existingAppointment.endTime);


    // 5️⃣ Update the appointment with new times
    const updatedAppointment = await Appointment.findOneAndUpdate(
      { _id: appointmentId, patientId, doctorId },
      { startTime: normalizedNewStart, endTime: newEndTime },
      { new: true }
    );

    if (!updatedAppointment) {
      throw new Error("Failed to update appointment time.");
    }

    // 6️⃣ Mark the new slot as booked + locked
    if (doctorSchedule) {
      const newSlotIndex = doctorSchedule.dailySlots.findIndex(
        (slot) => normalizeTimeFormat(slot.start) === normalizedNewStart
      );

      if (newSlotIndex !== -1) {
        doctorSchedule.dailySlots[newSlotIndex].isBooked = true;
        doctorSchedule.dailySlots[newSlotIndex].isLocked = true;
        doctorSchedule.dailySlots[newSlotIndex].lockedAt = new Date();
        doctorSchedule.dailySlots[newSlotIndex].lockExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
        console.log(`🔒 Marked new slot at ${normalizedNewStart} as booked/locked`);
      } else {
        console.log(`⚠️ No matching slot found for new time ${normalizedNewStart}`);
      }

      await doctorSchedule.save();
    }

    console.log(`✅ Appointment updated successfully for doctorId: ${doctorId}`);
    return updatedAppointment;

  } catch (error) {
    console.error("❌ Error updating appointment time:", error.message);
    throw error;
  }
}


  static async pastAppointments(patientId, lat, long) {
  try {
    const prevAppointments = await Appointment.find({
      patientId,
      status: "Completed"
    }).sort({ appointmentDate: -1 });

    if (prevAppointments.length < 1) {
      throw new Error("No past Appointment found.");
    }

    const formattedData = [];

    for (const appointment of prevAppointments) {
      const doctor = await Doctor.findById(appointment.doctorId?._id);
      const availability = getAvailability(appointment.doctorId);

      const patientLocation = { lat, long };
      const doctorLocation = {
        lat: doctor.coordinates?.lat,
        long: doctor.coordinates?.long
      };

      const distanceData =
        await GoogleMaps.getDistanceAndTime(patientLocation, doctorLocation);

      formattedData.push({
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
          hasInvoice: appointment.hasInvoice,
          distanceData,
          doctor: {
            _id: doctor._id,
            name: doctor.doctorName,
            specialization: doctor.specialization,
            phoneNumber: doctor.phoneNumber,
            clinicName: doctor.clinicName
          },
          availability
        }
      });
    }

    // 🔥 FINAL SORT
    formattedData.sort((a, b) => {
      const dateA = new Date(a.appointmentObj.appointmentDate);
      const dateB = new Date(b.appointmentObj.appointmentDate);

      if (dateA.getTime() !== dateB.getTime()) {
        return dateB - dateA;
      }

      return (
        timeToMinutes(a.appointmentObj.startTime) -
        timeToMinutes(b.appointmentObj.startTime)
      );
    });

    return { appointments: formattedData };

  } catch (error) {
    console.error("No Past Appointment.", error.message);
    throw new Error("No previous Appointment found.");
  }
}


  static async addDoctorRating(doctorId, payload) {
    try{
      const doctor = await Doctor.findById(doctorId);
    if (!doctor) throw new Error("Doctor not found");

    const experienceValue = mapExperienceToRating[payload.experience];
    if (!experienceValue) throw new Error("Invalid experience value");

    // Construct the rating object
    const newRating = {
      patientId: new mongoose.Types.ObjectId(payload.patientId),
      appointmentId: new mongoose.Types.ObjectId(payload.appointmentId),
      //doctorId: new mongoose.Types.ObjectId(payload.doctorId),
      experience: experienceValue,
      quickFeedback: payload.quickFeedback || [],
      customFeedback: payload.customFeedback || "",
    };

    // Push to ratings array
    doctor.ratings.push(newRating);

    // Update average rating and review count
    const totalRatings = doctor.ratings.length;
    const totalStars = doctor.ratings.reduce((sum, r) => sum + r.experience, 0);
    doctor.averageRating = parseFloat((totalStars / totalRatings).toFixed(2));
    doctor.reviewCount = totalRatings;

    await doctor.save();
    return newRating;
  } catch (error) {
    console.error("Error adding doctor rating:", error.message);
    throw new Error("Failed to add rating");                                
  }
  }

  static async markCheckIn(appointmentId) {
  try {
    // Check appointment existence
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      throw new Error("Appointment not found.");
    }

    console.log("Marking check-in for appointment:", appointmentId);

    const {autoCheckin} = require('../utils/firebase/notification');
    // Update check-in only
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        checkIn: true,
        checkInTime: new Date()  // optional but recommended
      },
      { new: true }
    );

    autoCheckin(appointment.patientId);

    console.log("✅ Check-in marked:", updatedAppointment);
    return updatedAppointment;

  } catch (error) {
    console.error("❌ Error in markCheckIn:", error.message);
    throw error;
  }
}
     static async deleteUser(userId) {
         try {
           const patient = await Patient.findById(userId);
           if (!patient) {
             throw new Error("Patient not found");
           }
           await patient.softDelete(); // Call the instance method to soft delete
           return { message: "Patient deleted successfully" };
         } catch (error) {
           throw new Error("Error deleting patient: " + error.message);
         }
       }

}

// SOLUTION: Flexibnle time parsing function
function parseFlexibleTime(timeString, timezone = "Asia/Kolkata") {
  // Try multiple format patterns to handle both single and double digit hours
  const formats = [
    "h:mm a",    // Single digit hour: "4:00 PM", "12:00 AM"  
    "hh:mm a",   // Double digit hour: "04:00 PM", "12:00 AM"
    "H:mm",      // 24-hour single digit: "4:00", "16:00"
    "HH:mm"      // 24-hour double digit: "04:00", "16:00"
  ];
  
  for (const format of formats) {
    const parsed = DateTime.fromFormat(timeString, format, { zone: timezone });
    if (parsed.isValid) {
      return parsed;
    }
  }
  
  // If none work, log error and return null
  console.error(`❌ Failed to parse time: "${timeString}"`);
  return null;
}


// Initialize debug log file
let debugLogPath = path.join(__dirname, 'doctor_search_debug.log');
let debugLogs = [];

function writeDebugLog(message) {
  const timestamp = new Date().toISOString();
  debugLogs.push(`[${timestamp}] ${message}`);
}

async function saveDebugLogs() {
  try {
    const logContent = debugLogs.join('\n') + '\n';
    await fs.appendFile(debugLogPath, logContent);
    debugLogs = []; // Clear the buffer after writing
  } catch (error) {
    console.error('Error saving debug logs:', error.message);
  }
}

// Updated getNextAvailableSlot function - only returns slots for TODAY and AFTER current time
function getNextAvailableSlot(dailySlots, doctorName = 'Unknown') {
  const now = DateTime.now().setZone("Asia/Kolkata");
  
  // writeDebugLog(`\n=== CHECKING SLOTS FOR DOCTOR: ${doctorName} ===`);
  // writeDebugLog(`🕐 Current time: ${now.toFormat("hh:mm a")} (${now.toISO()})`);
  // writeDebugLog(`📋 Total slots to check: ${dailySlots.length}`);

  // 🔑 Only allow slots *today* and *after current time*
  const availableSlots = dailySlots.filter(slot => {
    
    
    try {
      const slotStart = parseFlexibleTime(slot.start);
      
      if (!slotStart.isValid) {
       
        return false;
      }

      // For same-day comparison, we need to set the same date
      const todaySlotStart = slotStart.set({ 
        year: now.year, 
        month: now.month, 
        day: now.day 
      });

    
      // Must be later than current time (today only)
      if (todaySlotStart <= now) {
       
        return false;
      }

      // Must not be booked
      if (slot.isBooked) {
               return false;
      }

      // Must not be locked (or lock expired)
      if (slot.isLocked && slot.lockExpiresAt && new Date(slot.lockExpiresAt) > new Date()) {
       
        return false;
      }

     
      return true;
    } catch (error) {
      
      return false;
    }
  });

  

  

  // Sort by time and return the earliest available slot today, or null if none available today
  const sortedSlots = availableSlots.sort((a, b) => {
    const timeA = DateTime.fromFormat(a.start, "hh:mm a", { zone: "Asia/Kolkata" });
    const timeB = DateTime.fromFormat(b.start, "hh:mm a", { zone: "Asia/Kolkata" });
    return timeA - timeB;
  });

  const result = sortedSlots.length > 0 ? sortedSlots[0] : null;

  
  return result;
}

async function generatePatientUniqueId() {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `TP-PAT-${year}-${random}`;
}

async function getDoctorAvailability(doctorId) {
  const availability = getAvailability(doctorId);
  return availability;
}

module.exports = PatientService;
