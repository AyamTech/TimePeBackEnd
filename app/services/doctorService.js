console.log("→ DoctorService.js is being required");
const mongoose = require("mongoose");
const DoctorSchedule = require("../models/doctorSchedule");

const Appointment = require("../models/AppointmentsModel");
const AppointmentsModel = require("../models/AppointmentsModel");
// const { ObjectId } = require("mongodb");
const QRCode = require("qrcode");
const Doctor = require("../models/doctorModel");
const fs = require('fs');
const path = require('path');
const moment = require("moment-timezone");
const { DateTime, Duration } = require("luxon");
const GoogleMaps = require("../utils/googlemaps/googlemaps");
const { setCache, getCache, hasCache, invalidateDoctorSlots } = require("../utils/cacheManager");
const generateSlots = require("../utils/slot");
const { getAvailability } = require("../utils/availabilty.utils");

function getDistanceCacheKey(doctorId, lat, long) {
  return `${doctorId}_${lat}_${long}`;
}

// // Utility function to generate slots for a specific date and session
// function generateSlotsForDate(date, startTimeStr, endTimeStr, durationStr, sessionType, doctorId, scheduleId) {
//   const durationParts = durationStr.split(" ");
//   const slotMinutes = parseInt(durationParts[0], 10);
  
//   const startDateTime = DateTime.fromFormat(`${date.toISODate()} ${startTimeStr}`, "yyyy-MM-dd h:mm a");
//   const endDateTime = DateTime.fromFormat(`${date.toISODate()} ${endTimeStr}`, "yyyy-MM-dd h:mm a");

//   if (!startDateTime.isValid || !endDateTime.isValid) {
//     throw new Error("Invalid start or end time format.");
//   }

//   const slots = [];
//   let currentSlotStart = startDateTime;

//   while (currentSlotStart.plus({ minutes: slotMinutes }) <= endDateTime) {
//     const currentSlotEnd = currentSlotStart.plus({ minutes: slotMinutes });
//     slots.push({
//       doctorId,
//       scheduleId,
//       date: date.toJSDate(),
//       startTime: currentSlotStart.toFormat("h:mm a"),
//       endTime: currentSlotEnd.toFormat("h:mm a"),
//       sessionType,
//     });
//     currentSlotStart = currentSlotEnd;
//   }
//   return slots;
// }

class DoctorService {
    // static async setAvailability(doctorId, morningSession, eveningSession, appointmentDuration, repeatEvery, repeatPeriod, selectedDays, neverEnds = true, status = "Active") {
    //     console.log("Doctor ID received:", doctorId);
    
    //     // Validate doctorId
    //     if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
    //       console.error("Invalid doctorId format:", doctorId);
    //       throw new Error("Invalid doctorId format");
    //     }
    
    //     const doctorObjectId = new mongoose.Types.ObjectId(doctorId);
    //     let schedule = await DoctorSchedule.findOne({ doctorId: doctorObjectId });
    
    //     // Calculate endDate based on repeatEvery and repeatPeriod if neverEnds is false
    //     let endDate = null;
    //     if (!neverEnds) {
    //       const now = new Date();
    //       switch (repeatPeriod) {
    //         case "Day":
    //           endDate = new Date(now.setDate(now.getDate() + parseInt(repeatEvery)));
    //           break;
    //         case "Week":
    //           endDate = new Date(now.setDate(now.getDate() + 7 * parseInt(repeatEvery)));
    //           break;
    //         case "Month":
    //           endDate = new Date(now.setMonth(now.getMonth() + parseInt(repeatEvery)));
    //           break;
    //         default:
    //           throw new Error("Invalid repeatPeriod value");
    //       }
    //     }
    
    //     if (schedule) {
    //       schedule.morningSession = {
    //         enabled: morningSession?.enabled || false,
    //         start: morningSession?.start || "",
    //         end: morningSession?.end || "",
    //       };
    //       schedule.eveningSession = {
    //         enabled: eveningSession?.enabled || false,
    //         start: eveningSession?.start || "",
    //         end: eveningSession?.end || "",
    //       };
    //       schedule.appointmentDuration = appointmentDuration;
    //       schedule.repeatEvery = repeatEvery;
    //       schedule.repeatPeriod = repeatPeriod;
    //       schedule.selectedDays = selectedDays;
    //       schedule.neverEnds = neverEnds;
    //       schedule.endDate = endDate;
    //       schedule.status = status;
    
    //       return await schedule.save();
    //     }
    
    //     schedule = new DoctorSchedule({
    //       doctorId: doctorObjectId,
          
    //       morningSession: {
    //         enabled: morningSession?.enabled || false,
    //         start: morningSession?.start || "",
    //         end: morningSession?.end || "",
    //       },
    //       eveningSession: {
    //         enabled: eveningSession?.enabled || false,
    //         start: eveningSession?.start || "",
    //         end: eveningSession?.end || "",
    //       },
    //       appointmentDuration,
    //       repeatEvery,
    //       repeatPeriod,
    //       selectedDays,
    //       neverEnds,
    //       endDate,
    //       status,
    //     });
    
    //     return await schedule.save();
    //   }
    
    

//     static async setAvailability(doctorId, morningSession, eveningSession, appointmentDuration, repeatEvery, repeatPeriod, selectedDays, neverEnds = true, status = "Active") {
//   console.log("Doctor ID received:", doctorId);

//   // Validate doctorId
//   if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
//     console.error("Invalid doctorId format:", doctorId);
//     throw new Error("Invalid doctorId format");
//   }

//   const doctorObjectId = new mongoose.Types.ObjectId(doctorId);
//   let schedule = await DoctorSchedule.findOne({ doctorId: doctorObjectId });

//   // Calculate endDate based on repeatEvery and repeatPeriod if neverEnds is false
//   let endDate = null;
//   const now = DateTime.local();
//   if (!neverEnds) {
//     switch (repeatPeriod) {
//       case "Day":
//         endDate = now.plus({ days: parseInt(repeatEvery) });
//         break;
//       case "Week":
//         endDate = now.plus({ weeks: parseInt(repeatEvery) });
//         break;
//       case "Month":
//         endDate = now.plus({ months: parseInt(repeatEvery) });
//         break;
//       default:
//         throw new Error("Invalid repeatPeriod value");
//     }
//     endDate = endDate.toJSDate();
//   } else {
//     // If it never ends, generate for a long period, e.g., 3 months
//     endDate = now.plus({ months: 3 }).toJSDate();
//   }

//   // Find or create the schedule document
//   if (schedule) {
//     schedule.morningSession = {
//       enabled: morningSession?.enabled || false,
//       start: morningSession?.start || "",
//       end: morningSession?.end || "",
//     };
//     schedule.eveningSession = {
//       enabled: eveningSession?.enabled || false,
//       start: eveningSession?.start || "",
//       end: eveningSession?.end || "",
//     };
//     schedule.appointmentDuration = appointmentDuration;
//     schedule.repeatEvery = repeatEvery;
//     schedule.repeatPeriod = repeatPeriod;
//     schedule.selectedDays = selectedDays;
//     schedule.neverEnds = neverEnds;
//     schedule.endDate = endDate;
//     schedule.status = status;
//   } else {
//     schedule = new DoctorSchedule({
//       doctorId: doctorObjectId,
//       morningSession: {
//         enabled: morningSession?.enabled || false,
//         start: morningSession?.start || "",
//         end: morningSession?.end || "",
//       },
//       eveningSession: {
//         enabled: eveningSession?.enabled || false,
//         start: eveningSession?.start || "",
//         end: eveningSession?.end || "",
//       },
//       appointmentDuration,
//       repeatEvery,
//       repeatPeriod,
//       selectedDays,
//       neverEnds,
//       endDate,
//       status,
//     });
//   }

//   // --- Slot Generation and Storage Logic ---

//   // 1. Delete all existing slots for this doctor to avoid duplicates
//   await DoctorTimeSlot.deleteMany({ doctorId: doctorObjectId });

//   // 2. Generate all slots
//   const allSlotsToInsert = [];
//   let currentDate = now.startOf('day');
//   while (currentDate.toJSDate() <= new Date(endDate)) {
//     const dayOfWeek = currentDate.weekday % 7; // Monday = 1, Sunday = 0
//     if (selectedDays[dayOfWeek]) {
//       // Generate slots for the morning session
//       if (morningSession?.enabled) {
//         const morningSlots = generateSlotsForDate(
//           currentDate,
//           morningSession.start,
//           morningSession.end,
//           appointmentDuration,
//           "Morning",
//           doctorObjectId,
//           schedule._id
//         );
//         allSlotsToInsert.push(...morningSlots);
//       }
//       // Generate slots for the evening session
//       if (eveningSession?.enabled) {
//         const eveningSlots = generateSlotsForDate(
//           currentDate,
//           eveningSession.start,
//           eveningSession.end,
//           appointmentDuration,
//           "Evening",
//           doctorObjectId,
//           schedule._id
//         );
//         allSlotsToInsert.push(...eveningSlots);
//       }
//     }
//     currentDate = currentDate.plus({ days: 1 });
//   }

//   // 3. Insert all slots at once for efficiency
//   let insertedSlots = [];
//   if (allSlotsToInsert.length > 0) {
//     insertedSlots = await DoctorTimeSlot.insertMany(allSlotsToInsert);
//   }

//   // 4. Update the schedule document with the new slot IDs
//   schedule.slots = insertedSlots.map(slot => slot._id);
  
//   // Save the main schedule document
//   return await schedule.save();
// }


    // In your DoctorSchedule model or a service file

//  static async setAvailability(
//     doctorId, 
//     morningSession, 
//     eveningSession, 
//     appointmentDuration, 
//     repeatEvery, 
//     repeatPeriod, 
//     selectedDays, // Legacy - combined days
//     neverEnds = true, 
//     status = "Active",
//     endDate = null
//   ) {
//     console.log("Setting availability for doctor:", doctorId);
//       const todayIndex = new Date().getDay(); // 0 = Sunday

//     // Validate doctor ID
//     if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
//       throw new Error("Invalid doctorId format");
//     }

//     // Validate that at least one session is enabled
//     if (!morningSession?.enabled && !eveningSession?.enabled) {
//       throw new Error("At least one session (morning or evening) must be enabled");
//     }

//     // Validate time overlaps if both sessions are enabled
//     if (morningSession?.enabled && eveningSession?.enabled) {
//       this._validateNoTimeOverlap(
//         morningSession.start,
//         morningSession.end,
//         eveningSession.start,
//         eveningSession.end
//       );
//     }

//     // Validate that enabled sessions have at least one day selected
//     if (morningSession?.enabled && morningSession.selectedDays) {
//       if (!morningSession.selectedDays.some(day => day === true)) {
//         throw new Error("Morning session must have at least one day selected");
//       }
//     }

//     if (eveningSession?.enabled && eveningSession.selectedDays) {
//       if (!eveningSession.selectedDays.some(day => day === true)) {
//         throw new Error("Evening session must have at least one day selected");
//       }
//     }

//     const doctorObjectId = new mongoose.Types.ObjectId(doctorId);
//     let schedule = await DoctorSchedule.findOne({ doctorId: doctorObjectId });

//     // Generate slots for enabled sessions
//    let dailySlots = schedule?.dailySlots || [];

// // ---------------- MORNING SESSION ----------------
// if (morningSession?.enabled) {
//   const lastEnd = schedule
//     ? this._getLastActiveSlotEnd(dailySlots, 'morning')
//     : null;

//   let morningSlots = [];

//   if (lastEnd) {
//     // 🔒 Keep all existing morning slots till last booked/locked
//     const preserved = dailySlots.filter(
//       s => s.session === 'morning' &&
//       (s.isBooked || s.isLocked ||
//        this._timeCompare(s.end, lastEnd) <= 0)
//     );

//     // Generate NEW slots only AFTER last booked slot
//     const newSlots = this._generateSlots(
//       lastEnd,
//       morningSession.end,
//       appointmentDuration
//     ).map(slot => ({ ...slot, session: 'morning' }));

//     morningSlots = preserved.concat(newSlots);
//   } else {
//     // No bookings → generate fresh
//     morningSlots = this._generateSlots(
//       morningSession.start,
//       morningSession.end,
//       appointmentDuration
//     ).map(slot => ({ ...slot, session: 'morning' }));
//   }

//   // Remove old morning slots and replace safely
//   dailySlots = dailySlots.filter(s => s.session !== 'morning');
//   dailySlots = dailySlots.concat(morningSlots);
// }

// // ---------------- EVENING SESSION ----------------
// if (eveningSession?.enabled) {
//   const lastEnd = schedule
//     ? this._getLastActiveSlotEnd(dailySlots, 'evening')
//     : null;

//   let eveningSlots = [];

//   if (lastEnd) {
//     const preserved = dailySlots.filter(
//       s => s.session === 'evening' &&
//       (s.isBooked || s.isLocked ||
//        this._timeCompare(s.end, lastEnd) <= 0)
//     );

//     const newSlots = this._generateSlots(
//       lastEnd,
//       eveningSession.end,
//       appointmentDuration
//     ).map(slot => ({ ...slot, session: 'evening' }));

//     eveningSlots = preserved.concat(newSlots);
//   } else {
//     eveningSlots = this._generateSlots(
//       eveningSession.start,
//       eveningSession.end,
//       appointmentDuration
//     ).map(slot => ({ ...slot, session: 'evening' }));
//   }

//   dailySlots = dailySlots.filter(s => s.session !== 'evening');
//   dailySlots = dailySlots.concat(eveningSlots);
// }

//     // Sort slots by start time
//     dailySlots.sort((a, b) => a.start.localeCompare(b.start));

//     // Calculate end date if not "never ends"
//     let calculatedEndDate = null;
//     if (!neverEnds && endDate) {
//       calculatedEndDate = new Date(endDate);
//     } else if (!neverEnds) {
//       const now = new Date();
//       switch (repeatPeriod) {
//         case "Day":
//           calculatedEndDate = new Date(now.setDate(now.getDate() + parseInt(repeatEvery)));
//           break;
//         case "Week":
//           calculatedEndDate = new Date(now.setDate(now.getDate() + 7 * parseInt(repeatEvery)));
//           break;
//         case "Month":
//           calculatedEndDate = new Date(now.setMonth(now.getMonth() + parseInt(repeatEvery)));
//           break;
//         default:
//           throw new Error("Invalid repeatPeriod value");
//       }
//     }

//     const newScheduleData = {
//       morningSession: {
//         enabled: morningSession?.enabled || false,
//         start: morningSession?.start || "",
//         end: morningSession?.end || "",
//         selectedDays: morningSession?.selectedDays || Array(7).fill(false),
//       },
//       eveningSession: {
//         enabled: eveningSession?.enabled || false,
//         start: eveningSession?.start || "",
//         end: eveningSession?.end || "",
//         selectedDays: eveningSession?.selectedDays || Array(7).fill(false),
//       },
//       appointmentDuration,
//       repeatEvery,
//       repeatPeriod,
//       selectedDays, // Keep legacy combined days for backward compatibility
//       neverEnds,
//       endDate: calculatedEndDate,
//       status,
//       dailySlots,
//       useMultipleSections: false,
//     };
//     console.log("Generated new schedule data:", newScheduleData);
//     if (schedule) {
//       schedule.set(newScheduleData);
//       return await schedule.save();
//     }

//     schedule = new DoctorSchedule({
//       doctorId: doctorObjectId,
//       ...newScheduleData,
//     });

//     return await schedule.save();
//     console.log("Availability set successfully for doctor:", doctorId);
//   }



// static async setAvailability(
//   doctorId,
//   morningSession,
//   eveningSession,
//   appointmentDuration,
//   repeatEvery,
//   repeatPeriod,
//   selectedDays,
//   neverEnds = true,
//   status = "Active",
//   endDate = null
// ) {
//   console.log("Setting availability for doctor:", doctorId);

//   // ---------------- VALIDATIONS ----------------
//   if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
//     throw new Error("Invalid doctorId format");
//   }

//   if (!morningSession?.enabled && !eveningSession?.enabled) {
//     throw new Error("At least one session must be enabled");
//   }

//   if (morningSession?.enabled && eveningSession?.enabled) {
//     this._validateNoTimeOverlap(
//       morningSession.start,
//       morningSession.end,
//       eveningSession.start,
//       eveningSession.end
//     );
//   }

//   if (morningSession?.enabled && !morningSession.selectedDays?.some(Boolean)) {
//     throw new Error("Morning session must have at least one day selected");
//   }

//   if (eveningSession?.enabled && !eveningSession.selectedDays?.some(Boolean)) {
//     throw new Error("Evening session must have at least one day selected");
//   }

//   // ---------------- SETUP ----------------
//   const todayIndex = new Date().getDay();
//   const doctorObjectId = new mongoose.Types.ObjectId(doctorId);
//   let schedule = await DoctorSchedule.findOne({ doctorId: doctorObjectId });

//   let dailySlots = schedule?.dailySlots || [];

//   // ---------------- MORNING SESSION ----------------
//   const morningAvailableToday =
//     morningSession?.enabled &&
//     morningSession.selectedDays?.[todayIndex] === true;

//   if (morningAvailableToday) {
//     const lastEnd = schedule
//       ? this._getLastActiveSlotEnd(dailySlots, "morning")
//       : null;

//     let morningSlots = [];

//     if (lastEnd) {
//       const preserved = dailySlots.filter(
//         s =>
//           s.session === "morning" &&
//           (s.isBooked ||
//             s.isLocked ||
//             this._timeCompare(s.end, lastEnd) <= 0)
//       );

//       const newSlots = this._generateSlots(
//         lastEnd,
//         morningSession.end,
//         appointmentDuration
//       ).map(slot => ({ ...slot, session: "morning" }));

//       morningSlots = preserved.concat(newSlots);
//     } else {
//       morningSlots = this._generateSlots(
//         morningSession.start,
//         morningSession.end,
//         appointmentDuration
//       ).map(slot => ({ ...slot, session: "morning" }));
//     }

//     dailySlots = dailySlots.filter(s => s.session !== "morning");
//     dailySlots = dailySlots.concat(morningSlots);
//   } else {
//     // ❌ Disabling morning today — check safety
//     const hasActiveMorning = dailySlots.some(
//       s => s.session === "morning" && (s.isBooked || s.isLocked)
//     );

//     if (hasActiveMorning) {
//       throw new Error(
//         "Cannot disable morning session today because appointments exist"
//       );
//     }

//     dailySlots = dailySlots.filter(s => s.session !== "morning");
//   }

//   // ---------------- EVENING SESSION ----------------
//   const eveningAvailableToday =
//     eveningSession?.enabled &&
//     eveningSession.selectedDays?.[todayIndex] === true;

//   if (eveningAvailableToday) {
//     const lastEnd = schedule
//       ? this._getLastActiveSlotEnd(dailySlots, "evening")
//       : null;

//     let eveningSlots = [];

//     if (lastEnd) {
//       const preserved = dailySlots.filter(
//         s =>
//           s.session === "evening" &&
//           (s.isBooked ||
//             s.isLocked ||
//             this._timeCompare(s.end, lastEnd) <= 0)
//       );

//       const newSlots = this._generateSlots(
//         lastEnd,
//         eveningSession.end,
//         appointmentDuration
//       ).map(slot => ({ ...slot, session: "evening" }));

//       eveningSlots = preserved.concat(newSlots);
//     } else {
//       eveningSlots = this._generateSlots(
//         eveningSession.start,
//         eveningSession.end,
//         appointmentDuration
//       ).map(slot => ({ ...slot, session: "evening" }));
//     }

//     dailySlots = dailySlots.filter(s => s.session !== "evening");
//     dailySlots = dailySlots.concat(eveningSlots);
//   } else {
//     // ❌ Disabling evening today — check safety
//     const hasActiveEvening = dailySlots.some(
//       s => s.session === "evening" && (s.isBooked || s.isLocked)
//     );

//     if (hasActiveEvening) {
//       throw new Error(
//         "Cannot disable evening session today because appointments exist"
//       );
//     }

//     dailySlots = dailySlots.filter(s => s.session !== "evening");
//   }

//   // ---------------- SORT SLOTS ----------------
//   dailySlots.sort((a, b) => a.start.localeCompare(b.start));

//   // ---------------- END DATE ----------------
//   let calculatedEndDate = null;
//   if (!neverEnds && endDate) {
//     calculatedEndDate = new Date(endDate);
//   } else if (!neverEnds) {
//     const now = new Date();
//     switch (repeatPeriod) {
//       case "Day":
//         calculatedEndDate = new Date(now.setDate(now.getDate() + +repeatEvery));
//         break;
//       case "Week":
//         calculatedEndDate = new Date(
//           now.setDate(now.getDate() + 7 * +repeatEvery)
//         );
//         break;
//       case "Month":
//         calculatedEndDate = new Date(
//           now.setMonth(now.getMonth() + +repeatEvery)
//         );
//         break;
//       default:
//         throw new Error("Invalid repeatPeriod");
//     }
//   }

//   // ---------------- SAVE ----------------
//   const newScheduleData = {
//     morningSession: {
//       enabled: morningSession.enabled,
//       start: morningSession.start,
//       end: morningSession.end,
//       selectedDays: morningSession.selectedDays
//     },
//     eveningSession: {
//       enabled: eveningSession.enabled,
//       start: eveningSession.start,
//       end: eveningSession.end,
//       selectedDays: eveningSession.selectedDays
//     },
//     appointmentDuration,
//     repeatEvery,
//     repeatPeriod,
//     selectedDays,
//     neverEnds,
//     endDate: calculatedEndDate,
//     status,
//     dailySlots,
//     useMultipleSections: false
//   };

//   if (schedule) {
//     schedule.set(newScheduleData);
//     return await schedule.save();
//   }

//   return await DoctorSchedule.create({
//     doctorId: doctorObjectId,
//     ...newScheduleData
//   });
// }
// Updated setAvailability to support both legacy and multi-section modes

static async setAvailability(payload) {
  const {
    doctorId,
    morningSession = null,
    eveningSession = null,
    appointmentDuration,
    repeatEvery,
    repeatPeriod,
    selectedDays = null,
    neverEnds,
    status = "Active",
    endDate,
    scheduleSections,
    useMultipleSections,
  } = payload;
  
  console.log("→ DoctorService.js: setAvailability called");

  console.log("Setting availability for doctor:", doctorId);

  // ---------------- VALIDATIONS ----------------
  if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
    throw new Error("Invalid doctorId format");
  }

  const todayIndex = new Date().getDay();
  const doctorObjectId = new mongoose.Types.ObjectId(doctorId);
  let schedule = await DoctorSchedule.findOne({ doctorId: doctorObjectId });

  // ========== MULTI-SECTION MODE ==========
  if (scheduleSections && scheduleSections.length > 0) {
    // Validate exactly 2 sections
    if (scheduleSections.length !== 2) {
      throw new Error("Exactly 2 sections required (A and Saturday-Sunday)");
    }

    const sectionA = scheduleSections.find(s => s.sectionName === 'A');
    const sectionB = scheduleSections.find(s => s.sectionName === 'Saturday-Sunday');

    const hasAnySessionEnabled = [sectionA, sectionB].some(section =>
  section.morningSession?.enabled || section.eveningSession?.enabled
);

if (!hasAnySessionEnabled) {
  throw new Error("At least one session must be enabled in any section");
}

    if (!sectionA || !sectionB) {
      throw new Error("Sections must be named 'A' and 'Saturday-Sunday'");
    }

    // Validate each section
    // for (const section of [sectionA, sectionB]) {
    //   if (!section.morningSession?.enabled && !section.eveningSession?.enabled) {
    //     throw new Error(`Section ${section.sectionName}: At least one session must be enabled`);
    //     console.log("secton", section);
    //   }

    //   // Validate overlap within section
    //   if (section.morningSession?.enabled && section.eveningSession?.enabled) {
    //     this._validateNoTimeOverlap(
    //       section.morningSession.start,
    //       section.morningSession.end,
    //       section.eveningSession.start,
    //       section.eveningSession.end
    //     );
    //   }

    //   if (section.morningSession?.enabled && !section.morningSession.selectedDays?.some(Boolean)) {
    //     throw new Error(`Section ${section.sectionName}: Morning session must have at least one day selected`);
    //   }

    //   if (section.eveningSession?.enabled && !section.eveningSession.selectedDays?.some(Boolean)) {
    //     throw new Error(`Section ${section.sectionName}: Evening session must have at least one day selected`);
    //   }
    // }
    for (const section of [sectionA, sectionB]) {

  const hasSession =
    section.morningSession?.enabled || section.eveningSession?.enabled;

  // 👉 If section has no sessions → skip it completely
  if (!hasSession) continue;

  // Validate overlap
  if (section.morningSession?.enabled && section.eveningSession?.enabled) {
    this._validateNoTimeOverlap(
      section.morningSession.start,
      section.morningSession.end,
      section.eveningSession.start,
      section.eveningSession.end
    );
  }

  if (
    section.morningSession?.enabled &&
    !section.morningSession.selectedDays?.some(Boolean)
  ) {
    throw new Error(
      `Section ${section.sectionName}: Morning session must have at least one day selected`
    );
  }

  if (
    section.eveningSession?.enabled &&
    !section.eveningSession.selectedDays?.some(Boolean)
  ) {
    throw new Error(
      `Section ${section.sectionName}: Evening session must have at least one day selected`
    );
  }
}

    // Generate today's slots for both sections
    const todaySlots = await this._generateTodaySlotsForSections(
      [sectionA, sectionB],
      todayIndex,
      schedule,
      appointmentDuration
    );

    // Compute root selectedDays (OR of all session days)
    const rootSelectedDays = this._computeRootSelectedDaysFromSections([sectionA, sectionB]);

    // Save schedule
    const scheduleData = {
      doctorId: doctorObjectId,
      useMultipleSections: true,
      scheduleSections: scheduleSections,
      // Clear legacy fields
      morningSession: { enabled: false, start: '', end: '', selectedDays: Array(7).fill(false) },
      eveningSession: { enabled: false, start: '', end: '', selectedDays: Array(7).fill(false) },
      dailySlots: todaySlots,
      appointmentDuration: appointmentDuration,
      repeatEvery,
      repeatPeriod,
      selectedDays: rootSelectedDays,
      neverEnds,
      status,
      endDate: neverEnds ? null : endDate,
    };

    if (schedule) {
      Object.assign(schedule, scheduleData);
    } else {
      schedule = new DoctorSchedule(scheduleData);
    }

    await schedule.save();
    return schedule;
  }

  // // ========== LEGACY MODE (existing logic unchanged) ==========
  // if (!morningSession?.enabled && !eveningSession?.enabled) {
  //   throw new Error("At least one session must be enabled");
  // }

  if (morningSession?.enabled && eveningSession?.enabled) {
    this._validateNoTimeOverlap(
      morningSession.start,
      morningSession.end,
      eveningSession.start,
      eveningSession.end
    );
  }

  if (morningSession?.enabled && !morningSession.selectedDays?.some(Boolean)) {
    throw new Error("Morning session must have at least one day selected");
  }

  if (eveningSession?.enabled && !eveningSession.selectedDays?.some(Boolean)) {
    throw new Error("Evening session must have at least one day selected");
  }

  let dailySlots = schedule?.dailySlots || [];

  // Morning session logic (UNCHANGED from original)
  const morningAvailableToday =
    morningSession?.enabled &&
    morningSession.selectedDays?.[todayIndex] === true;

  if (morningAvailableToday) {
    const lastEnd = schedule
      ? this._getLastActiveSlotEnd(dailySlots, "morning")
      : null;

    let morningSlots = [];

    if (lastEnd) {
      const preserved = dailySlots.filter(
        s =>
          s.session === "morning" &&
          (s.isBooked ||
            s.isLocked ||
            this._timeCompare(s.end, lastEnd) <= 0)
      );

      const newSlots = this._generateSlots(
        lastEnd,
        morningSession.end,
        appointmentDuration
      ).map(slot => ({ ...slot, session: "morning" }));

      morningSlots = preserved.concat(newSlots);
    } else {
      morningSlots = this._generateSlots(
        morningSession.start,
        morningSession.end,
        appointmentDuration
      ).map(slot => ({ ...slot, session: "morning" }));
    }

    dailySlots = dailySlots.filter(s => s.session !== "morning");
    dailySlots = dailySlots.concat(morningSlots);
  } else {
    const hasActiveMorning = dailySlots.some(
      s => s.session === "morning" && (s.isBooked || s.isLocked)
    );

    if (hasActiveMorning) {
      throw new Error(
        "Cannot disable morning session today because appointments exist"
      );
    }

    dailySlots = dailySlots.filter(s => s.session !== "morning");
  }

  // Evening session logic (UNCHANGED from original)
  const eveningAvailableToday =
    eveningSession?.enabled &&
    eveningSession.selectedDays?.[todayIndex] === true;

  if (eveningAvailableToday) {
    const lastEnd = schedule
      ? this._getLastActiveSlotEnd(dailySlots, "evening")
      : null;

    let eveningSlots = [];

    if (lastEnd) {
      const preserved = dailySlots.filter(
        s =>
          s.session === "evening" &&
          (s.isBooked ||
            s.isLocked ||
            this._timeCompare(s.end, lastEnd) <= 0)
      );

      const newSlots = this._generateSlots(
        lastEnd,
        eveningSession.end,
        appointmentDuration
      ).map(slot => ({ ...slot, session: "evening" }));

      eveningSlots = preserved.concat(newSlots);
    } else {
      eveningSlots = this._generateSlots(
        eveningSession.start,
        eveningSession.end,
        appointmentDuration
      ).map(slot => ({ ...slot, session: "evening" }));
    }

    dailySlots = dailySlots.filter(s => s.session !== "evening");
    dailySlots = dailySlots.concat(eveningSlots);
  } else {
    const hasActiveEvening = dailySlots.some(
      s => s.session === "evening" && (s.isBooked || s.isLocked)
    );

    if (hasActiveEvening) {
      throw new Error(
        "Cannot disable evening session today because appointments exist"
      );
    }

    dailySlots = dailySlots.filter(s => s.session !== "evening");
  }

  // Save legacy schedule
  const scheduleData = {
    doctorId: doctorObjectId,
    useMultipleSections: false,
    morningSession,
    eveningSession,
    appointmentDuration,
    dailySlots,
    repeatEvery,
    repeatPeriod,
    selectedDays: selectedDays || this._computeLegacySelectedDays(morningSession, eveningSession),
    neverEnds,
    status,
    endDate: neverEnds ? null : endDate,
  };

  if (schedule) {
    Object.assign(schedule, scheduleData);
  } else {
    schedule = new DoctorSchedule(scheduleData);
  }

  await schedule.save();
  return schedule;
}

// 🆕 NEW HELPER: Generate today's slots for multi-section mode
static async _generateTodaySlotsForSections(sections, todayIndex, existingSchedule, globalDuration) {
  let allSlots = [];
  const existingSlots = existingSchedule?.dailySlots || [];

  for (const section of sections) {
    const sectionName = section.sectionName;

    // Morning session
    if (section.morningSession?.enabled && section.morningSession.selectedDays?.[todayIndex]) {
      const lastEnd = this._getLastActiveSlotEndForSection(existingSlots, sectionName, 'morning');

      if (lastEnd) {
        const preserved = existingSlots.filter(
          s => s.sectionName === sectionName && 
               s.session === "morning" &&
               (s.isBooked || s.isLocked || this._timeCompare(s.end, lastEnd) <= 0)
        );

        const newSlots = this._generateSlots(
          lastEnd,
          section.morningSession.end,
          globalDuration
        ).map(slot => ({ ...slot, session: "morning", sectionName }));

        allSlots.push(...preserved, ...newSlots);
      } else {
        const morningSlots = this._generateSlots(
          section.morningSession.start,
          section.morningSession.end,
          globalDuration
        ).map(slot => ({ ...slot, session: "morning", sectionName }));

        allSlots.push(...morningSlots);
      }
    } else {
      const hasActiveSlots = existingSlots.some(
        s => s.sectionName === sectionName && 
             s.session === "morning" && 
             (s.isBooked || s.isLocked)
      );

      if (hasActiveSlots) {
        throw new Error(
          `Cannot disable morning session for ${sectionName} today - active appointments exist`
        );
      }
    }

    // Evening session
    if (section.eveningSession?.enabled && section.eveningSession.selectedDays?.[todayIndex]) {
      const lastEnd = this._getLastActiveSlotEndForSection(existingSlots, sectionName, 'evening');

      if (lastEnd) {
        const preserved = existingSlots.filter(
          s => s.sectionName === sectionName && 
               s.session === "evening" &&
               (s.isBooked || s.isLocked || this._timeCompare(s.end, lastEnd) <= 0)
        );

        const newSlots = this._generateSlots(
          lastEnd,
          section.eveningSession.end,
          globalDuration
        ).map(slot => ({ ...slot, session: "evening", sectionName }));

        allSlots.push(...preserved, ...newSlots);
      } else {
        const eveningSlots = this._generateSlots(
          section.eveningSession.start,
          section.eveningSession.end,
          globalDuration
        ).map(slot => ({ ...slot, session: "evening", sectionName }));

        allSlots.push(...eveningSlots);
      }
    } else {
      const hasActiveSlots = existingSlots.some(
        s => s.sectionName === sectionName && 
             s.session === "evening" && 
             (s.isBooked || s.isLocked)
      );

      if (hasActiveSlots) {
        throw new Error(
          `Cannot disable evening session for ${sectionName} today - active appointments exist`
        );
      }
    }
  }

  return allSlots.sort((a, b) => a.start.localeCompare(b.start));
}

// 🆕 NEW HELPER: Get last active slot for specific section
static _getLastActiveSlotEndForSection(slots, sectionName, sessionType) {
  const activeSlots = slots.filter(
    s => s.sectionName === sectionName && 
         s.session === sessionType && 
         (s.isBooked || s.isLocked)
  );

  if (activeSlots.length === 0) return null;

  const timeToMinutes = (timeStr) => {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  let maxSlot = activeSlots[0];
  let maxMinutes = timeToMinutes(maxSlot.end);

  for (const slot of activeSlots) {
    const mins = timeToMinutes(slot.end);
    if (mins > maxMinutes) {
      maxMinutes = mins;
      maxSlot = slot;
    }
  }

  return maxSlot.end;
}

// 🆕 NEW HELPER: Compute root selectedDays from sections (OR logic)
static _computeRootSelectedDaysFromSections(sections) {
  const combined = Array(7).fill(false);

  for (const section of sections) {
    for (let i = 0; i < 7; i++) {
      if (section.morningSession?.enabled && section.morningSession.selectedDays?.[i]) {
        combined[i] = true;
      }
      if (section.eveningSession?.enabled && section.eveningSession.selectedDays?.[i]) {
        combined[i] = true;
      }
    }
  }

  return combined;
}

// Helper: Compute legacy selectedDays
static _computeLegacySelectedDays(morningSession, eveningSession) {
  const combined = Array(7).fill(false);

  for (let i = 0; i < 7; i++) {
    if (morningSession?.enabled && morningSession.selectedDays?.[i]) {
      combined[i] = true;
    }
    if (eveningSession?.enabled && eveningSession.selectedDays?.[i]) {
      combined[i] = true;
    }
  }

  return combined;
}

// Helper: Time comparison (reuse existing)
static _timeCompare(time1, time2) {
  const toMinutes = (timeStr) => {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  return toMinutes(time1) - toMinutes(time2);
}

// Note: Keep all existing helper methods unchanged:
// - _validateNoTimeOverlap (lines 462-479)
// - _generateSlots (lines 485-538)
// - _getLastActiveSlotEnd (lines 540-568)

//   static _timeCompare(t1, t2) {
//   const toMin = (timeStr) => {
//     const [time, period] = timeStr.split(' ');
//     let [h, m] = time.split(':').map(Number);
//     if (period === 'PM' && h !== 12) h += 12;
//     if (period === 'AM' && h === 12) h = 0;
//     return h * 60 + m;
//   };

//   return toMin(t1) - toMin(t2);
// }

  /**
   * Get doctor availability with complete slot information
   * This returns everything needed - no separate slot API needed
   */
  // static async getAvailability(doctorId) {
  //   console.log("Getting availability for doctor:", doctorId);
    
  //   if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
  //     throw new Error("Invalid doctorId format");
  //   }

  //   const doctorObjectId = new mongoose.Types.ObjectId(doctorId);
  //   const schedule = await DoctorSchedule.findOne({ doctorId: doctorObjectId });
    
  //   if (!schedule) {
  //     return null;
  //   }

  //   // Organize slots by day of week for easier frontend consumption
  //   const slotsByDay = this._organizeSlotsByDay(schedule);

  //   return {
  //     _id: schedule._id,
  //     doctorId: schedule.doctorId,
  //     morningSession: schedule.morningSession,
  //     eveningSession: schedule.eveningSession,
  //     appointmentDuration: schedule.appointmentDuration,
  //     repeatEvery: schedule.repeatEvery,
  //     repeatPeriod: schedule.repeatPeriod,
  //     selectedDays: schedule.selectedDays,
  //     neverEnds: schedule.neverEnds,
  //     endDate: schedule.endDate,
  //     status: schedule.status,
  //     dailySlots: schedule.dailySlots, // All slots
  //     slotsByDay, // Organized by day for convenience
  //     createdAt: schedule.createdAt,
  //     updatedAt: schedule.updatedAt,
  //   };
  // }
  // Updated getAvailability to handle both legacy and multi-section schedules

static async getAvailability(doctorId) {
  if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
    throw new Error("Invalid doctorId format");
  }

  const doctorObjectId = new mongoose.Types.ObjectId(doctorId);
  const schedule = await DoctorSchedule.findOne({ doctorId: doctorObjectId });

  if (!schedule) {
    return null;
  }

  const isMultiSection = schedule.useMultipleSections && 
                         schedule.scheduleSections && 
                         schedule.scheduleSections.length > 0;

  if (isMultiSection) {
    // 🆕 Multi-section format
    return {
      schedule: {
        doctorId: schedule.doctorId,
        useMultipleSections: true,
        scheduleSections: schedule.scheduleSections,
        repeatEvery: schedule.repeatEvery,
        repeatPeriod: schedule.repeatPeriod,
        selectedDays: schedule.selectedDays,
        neverEnds: schedule.neverEnds,
        status: schedule.status,
        endDate: schedule.endDate,
        appointmentDuration: schedule.appointmentDuration, // ✅ Global duration
      },
      dailySlots: schedule.dailySlots,
      slotsByDay: this._computeSlotsByDayMultiSection(schedule),
    };
  } else {
    // 🔄 Legacy format - Return as-is for backward compatibility
    return {
      schedule: {
        doctorId: schedule.doctorId,
        useMultipleSections: false,
        morningSession: schedule.morningSession,
        eveningSession: schedule.eveningSession,
        repeatEvery: schedule.repeatEvery,
        repeatPeriod: schedule.repeatPeriod,
        selectedDays: schedule.selectedDays,
        neverEnds: schedule.neverEnds,
        status: schedule.status,
        endDate: schedule.endDate,
        appointmentDuration: schedule.appointmentDuration,
      },
      dailySlots: schedule.dailySlots,
      slotsByDay: this._computeSlotsByDayLegacy(schedule),
    };
  }
}

// Helper: Compute slots by day for multi-section schedules
static _computeSlotsByDayMultiSection(schedule) {
  const slotsByDay = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const daySlots = [];

    for (const section of schedule.scheduleSections) {
      // Morning session for this section
      if (section.morningSession?.enabled && 
          section.morningSession.selectedDays?.[dayIndex]) {
        const morningSlots = schedule.dailySlots.filter(
          slot => slot.sectionName === section.sectionName && slot.session === 'morning'
        );
        daySlots.push(...morningSlots);
      }

      // Evening session for this section
      if (section.eveningSession?.enabled && 
          section.eveningSession.selectedDays?.[dayIndex]) {
        const eveningSlots = schedule.dailySlots.filter(
          slot => slot.sectionName === section.sectionName && slot.session === 'evening'
        );
        daySlots.push(...eveningSlots);
      }
    }

    if (daySlots.length > 0) {
      slotsByDay[dayIndex] = {
        dayName: dayNames[dayIndex],
        slots: daySlots,
        totalSlots: daySlots.length,
        availableSlots: daySlots.filter(s => !s.isBooked && !s.isLocked).length,
      };
    }
  }

  return slotsByDay;
}

// Helper: Compute slots by day for legacy schedules (UNCHANGED)
static _computeSlotsByDayLegacy(schedule) {
  const slotsByDay = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const daySlots = [];

    if (schedule.morningSession?.enabled && 
        schedule.morningSession.selectedDays?.[dayIndex]) {
      const morningSlots = schedule.dailySlots.filter(slot => slot.session === 'morning');
      daySlots.push(...morningSlots);
    }

    if (schedule.eveningSession?.enabled && 
        schedule.eveningSession.selectedDays?.[dayIndex]) {
      const eveningSlots = schedule.dailySlots.filter(slot => slot.session === 'evening');
      daySlots.push(...eveningSlots);
    }

    if (daySlots.length > 0) {
      slotsByDay[dayIndex] = {
        dayName: dayNames[dayIndex],
        slots: daySlots,
        totalSlots: daySlots.length,
        availableSlots: daySlots.filter(s => !s.isBooked && !s.isLocked).length,
      };
    }
  }

  return slotsByDay;
}

  /**
   * Organize slots by day of week for easier consumption
   * @private
   */
  static _organizeSlotsByDay(schedule) {
    const slotsByDay = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const daySlots = [];

      // Check if morning session is available for this day
      if (schedule.morningSession?.enabled && 
          schedule.morningSession.selectedDays?.[dayIndex]) {
        const morningSlots = schedule.dailySlots.filter(slot => slot.session === 'morning');
        daySlots.push(...morningSlots);
      }

      // Check if evening session is available for this day
      if (schedule.eveningSession?.enabled && 
          schedule.eveningSession.selectedDays?.[dayIndex]) {
        const eveningSlots = schedule.dailySlots.filter(slot => slot.session === 'evening');
        daySlots.push(...eveningSlots);
      }

      if (daySlots.length > 0) {
        slotsByDay[dayIndex] = {
          dayName: dayNames[dayIndex],
          slots: daySlots,
          totalSlots: daySlots.length,
          availableSlots: daySlots.filter(s => !s.isBooked && !s.isLocked).length,
        };
      }
    }

    return slotsByDay;
  }

  /**
   * Validate that session times don't overlap
   * Throws error if overlap detected
   * @private
   */
  static _validateNoTimeOverlap(morningStart, morningEnd, eveningStart, eveningEnd) {
    const timeToMinutes = (timeStr) => {
      const [time, period] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      return hours * 60 + minutes;
    };

    const morningEndMinutes = timeToMinutes(morningEnd);
    const eveningStartMinutes = timeToMinutes(eveningStart);

    if (eveningStartMinutes <= morningEndMinutes) {
      throw new Error("Evening session must start after morning session ends. There is a time overlap.");
    }
  }

  /**
   * Generate time slots based on start, end, and duration
   * @private
   */
  static _generateSlots(startTime, endTime, duration) {
    const slots = [];
    
    // Parse duration (e.g., "15 Minutes" -> 15)
    const durationMinutes = parseInt(duration.split(' ')[0]);
    
    const timeToDate = (timeStr) => {
      const [time, period] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    };

    const dateToTime = (date) => {
      let hours = date.getHours();
      const minutes = date.getMinutes();
      const period = hours >= 12 ? 'PM' : 'AM';
      
      if (hours > 12) hours -= 12;
      if (hours === 0) hours = 12;
      
      const minutesStr = minutes.toString().padStart(2, '0');
      const hoursStr = hours.toString().padStart(2, '0');
      
      return `${hoursStr}:${minutesStr} ${period}`;
    };

    let currentSlotStart = timeToDate(startTime);
    const endDateTime = timeToDate(endTime);

    while (currentSlotStart < endDateTime) {
      const currentSlotEnd = new Date(currentSlotStart.getTime() + durationMinutes * 60000);
      
      if (currentSlotEnd <= endDateTime) {
        slots.push({
          start: dateToTime(currentSlotStart),
          end: dateToTime(currentSlotEnd),
          isBooked: false,
          isLocked: false,
          lockedAt: null,
          lockExpiresAt: null,
        });
      }
      
      currentSlotStart = currentSlotEnd;
    }

    return slots;
  }

  static _getLastActiveSlotEnd(slots, sessionType) {
  const activeSlots = slots.filter(
    s => s.session === sessionType && (s.isBooked || s.isLocked)
  );

  if (activeSlots.length === 0) return null;

  // Find latest end time
  const timeToMinutes = (timeStr) => {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  let maxSlot = activeSlots[0];
  let maxMinutes = timeToMinutes(maxSlot.end);

  for (const slot of activeSlots) {
    const mins = timeToMinutes(slot.end);
    if (mins > maxMinutes) {
      maxMinutes = mins;
      maxSlot = slot;
    }
  }

  return maxSlot.end; // return time string like "11:20 AM"
}


//   static async setAvailability(doctorId, morningSession, eveningSession, appointmentDuration, repeatEvery, repeatPeriod, selectedDays, neverEnds = true, status = "Active") {
//   console.log("Doctor ID received:", doctorId);

//   if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
//     console.error("Invalid doctorId format:", doctorId);
//     throw new Error("Invalid doctorId format");
//   }

//   const doctorObjectId = new mongoose.Types.ObjectId(doctorId);
//   let schedule = await DoctorSchedule.findOne({ doctorId: doctorObjectId });

//   // Generate slots for one day based on the new schedule
//   let dailySlots = [];
//   if (morningSession?.enabled) {
//     const morningSlots = generateSlots(morningSession.start, morningSession.end, appointmentDuration);
//     dailySlots = dailySlots.concat(morningSlots);
//   }
//   if (eveningSession?.enabled) {
//     const eveningSlots = generateSlots(eveningSession.start, eveningSession.end, appointmentDuration);
//     dailySlots = dailySlots.concat(eveningSlots);
//   }
  
//   // You might want to sort the dailySlots array by start time here to ensure order.
//   // dailySlots.sort((a, b) => a.start.localeCompare(b.start));

//   let endDate = null;
//   if (!neverEnds) {
//     const now = new Date();
//     switch (repeatPeriod) {
//       case "Day":
//         endDate = new Date(now.setDate(now.getDate() + parseInt(repeatEvery)));
//         break;
//       case "Week":
//         endDate = new Date(now.setDate(now.getDate() + 7 * parseInt(repeatEvery)));
//         break;
//       case "Month":
//         endDate = new Date(now.setMonth(now.getMonth() + parseInt(repeatEvery)));
//         break;
//       default:
//         throw new Error("Invalid repeatPeriod value");
//     }
//   }

//   const newScheduleData = {
//     morningSession: {
//       enabled: morningSession?.enabled || false,
//       start: morningSession?.start || "",
//       end: morningSession?.end || "",
//     },
//     eveningSession: {
//       enabled: eveningSession?.enabled || false,
//       start: eveningSession?.start || "",
//       end: eveningSession?.end || "",
//     },
//     appointmentDuration,
//     repeatEvery,
//     repeatPeriod,
//     selectedDays,
//     neverEnds,
//     endDate,
//     status,
//     dailySlots, // Save the generated slots
//   };

//   if (schedule) {
//     // If a schedule exists, update it
//     schedule.set(newScheduleData);
//     return await schedule.save();
//   }

//   // If no schedule exists, create a new one
//   schedule = new DoctorSchedule({
//     doctorId: doctorObjectId,
//     ...newScheduleData,
//   });

//   return await schedule.save();
// }

//     static async getAvailability(doctorId) {
//         console.log("getting availability", doctorId);
//         if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
//             throw new Error("Invalid doctorId format");
//         }

//         const doctorObjectId = new mongoose.Types.ObjectId(doctorId);
//        // console.log("doctorObjectId", doctorObjectId);
//         const schedule = await DoctorSchedule.findOne({ doctorId: doctorObjectId });
//        // console.log("schedule is", schedule);
//         //if (!schedule) throw new Error("No availability found");
//         return schedule;
//     }
    
    // static async updateNextAppointment(doctorId) {
    //   try {
    //     if (!doctorId) {
    //       throw new Error("Doctor ID is required.");
    //     }
    
    //     // Fetch today's appointments for the doctor
    //     const { appointments } = await AppointmentService.getTodaysAppointments(doctorId);
    //    // console.log(" Today's Appointments:", appointments);
    
    //     if (!appointments || appointments.length === 0) {
    //       throw new Error("No appointments found for today.");
    //     }
    
    //     // Find the index of the currently active appointment
    //     let activeIndex = appointments.findIndex(app => 
    //       app.appointmentObj &&
    //       app.appointmentObj.status &&
    //       app.appointmentObj.status.trim().toLowerCase() === "active"
    //     ); 
    //    //console.log("🔍 Active Appointment Index:", activeIndex);
    //     console.log("🔍 Active Appointment Index:", activeIndex);
    
    //     if (activeIndex !== -1) {
    //       // Mark the currently active appointment as Completed
    //       const currentActiveId = appointments[activeIndex]._id;
    //       const nextAppointemntId = appointments[activeIndex + 1]?._id;
    //       console.log(` Marking appointment ${currentActiveId} as Completed`);
    //       await Appointment.findByIdAndUpdate(currentActiveId, { 
    //         $set: { status: "Completed" } 
    //       });

    //       // Step 2: Fetch the full appointment with patientId
    //       const updatedAppointment = await Appointment.findById(currentActiveId).select('patientId doctorId');
    //       console.log("Updated Appointment:", updatedAppointment);
    //       if (!updatedAppointment || !updatedAppointment.patientId) {
    //         console.error('No patientId found for this appointment.');
    //         return;
    //       }

    //       const {sendNotification} = require("../utils/firebase/notification");


    //       const patientId = updatedAppointment.patientId;
    //       console.log(`Calling post-completion function for patient ${patientId}`);

    //       // Step 3: Call your desired function with patientId
    //       await sendNotification(patientId, currentActiveId, updatedAppointment.doctorId);

    //       //for next appointment
    //       const nextAppointemnt = await Appointment.findById(nextAppointemntId).select(`patientId`);

    //       if(appointments.length > 0 && nextAppointemnt) {
    //         const {upcomingAppointment} = require("../utils/firebase/notification");
    //         const nextPatientId = nextAppointemnt.patientId;
    //         console.log(`Calling post-completion function for next patient ${nextPatientId}`);
    //         await upcomingAppointment(nextPatientId);
    //       }
    
    //       // Find the next pending appointment (after the active one)
    //       let nextPendingIndex = appointments.findIndex((app, index) =>
    //         index > activeIndex &&
    //       app.appointmentObj &&
    //       app.appointmentObj.status &&
    //       app.appointmentObj.status.trim().toLowerCase() === "pending"
    //       );
    
    //       if (nextPendingIndex !== -1) {
    //         const nextPendingId = appointments[nextPendingIndex]._id;
    //         console.log(` Setting appointment ${nextPendingId} to Active`);
    //         await Appointment.findByIdAndUpdate(nextPendingId, { 
    //           $set: { status: "Active"} 
    //         });
    //       } else {
    //         console.log(" No further pending appointments found.");
    //       }
    //     } else {
    //       // No active appointment; mark the first pending appointment as Active
    //       let firstPendingIndex = appointments.findIndex(app => 
    //         app.appointmentObj &&
    //         app.appointmentObj.status &&
    //         app.appointmentObj.status.trim().toLowerCase() === "pending"
    //       );
    //       console.log(" First Pending Appointment Index:", firstPendingIndex);
    
    //       if (firstPendingIndex !== -1) {
    //         const firstPendingId = appointments[firstPendingIndex]._id;
    //         console.log(` Setting appointment ${firstPendingId} to Active`);
    //         await Appointment.findByIdAndUpdate(firstPendingId, { 
    //           $set: { status: "Active" } 
    //         });
    //       } else {
    //         return { message: "No pending appointments found." };
    //         console.log(" No pending appointments found.");
    //       }
    //     }
    
    //     return { message: "Appointments updated successfully for the doctor." };
    //   } catch (error) {
    //     console.error(" Error in updateNextAppointment:", error);
    //     throw error;
    //   }
    // }
  
  
    //to generate QR Code
    static async updateNextAppointment(doctorId) {
      const AppointmentService = require("./appointment");
  try {
    if (!doctorId) {
      throw new Error("Doctor ID is required.");
    }

    // Fetch today's appointments for the doctor
    const { appointments } = await AppointmentService.getTodaysActiveOrPendingAppointments(doctorId);
    if (!appointments || appointments.length === 0) {
      throw new Error("No appointments found for today.");
    }

    // Find the index of the currently active appointment
    let activeIndex = appointments.findIndex(app =>
      app.appointmentObj?.status?.trim().toLowerCase() === "active"
    );

    console.log("🔍 Active Appointment Index:", activeIndex);

    if (activeIndex !== -1) {
      // 🔹 1. CURRENT ACTIVE → COMPLETED
      const currentActiveId = appointments[activeIndex]._id;
      const nextAppointmentId = appointments[activeIndex + 1]?._id;

      const currentAppointment = await Appointment.findById(currentActiveId);

      const activeTime = currentAppointment.activeTime || new Date(); // fallback if not set
      const completionTime = new Date();
      const durationMinutes = Math.round((completionTime - activeTime) / 60000);

      // Update current appointment
      await Appointment.findByIdAndUpdate(currentActiveId, {
        $set: {
          status: "Completed",
          completionTime,
          duration: durationMinutes
        }
      });

      console.log(`✅ Marked appointment ${currentActiveId} as Completed (${durationMinutes} min)`);

      // 🔹 2. Store duration in DoctorSchedule
      const DoctorSchedule = require("../models/doctorSchedule");
      await DoctorSchedule.findOneAndUpdate(
        { doctorId },
        {
          $push: {
            appointmentHistory: {
              appointmentId: currentActiveId,
              activeTime,
              completionTime,
              duration: durationMinutes
            }
          }
        },
        { new: true, upsert: false }
      );

      // 🔹 3. Send notification to completed patient
      const { sendNotification, upcomingAppointment } = require("../utils/firebase/notification");
      const updatedAppointment = await Appointment.findById(currentActiveId).select("patientId doctorId");

      if (updatedAppointment?.patientId) {
        await sendNotification(updatedAppointment.patientId, currentActiveId, updatedAppointment.doctorId);
      }

      // 🔹 4. NEXT APPOINTMENT → ACTIVE
      if (nextAppointmentId) {
        const nextAppointment = await Appointment.findById(nextAppointmentId).select("patientId");
        await Appointment.findByIdAndUpdate(nextAppointmentId, {
          $set: { status: "Active", activeTime: new Date() }
        });

        console.log(`🟢 Activated next appointment: ${nextAppointmentId}`);

        // Send notification to next patient
        if (nextAppointment?.patientId) {
          await upcomingAppointment(nextAppointment.patientId);
        }
      } else {
        console.log("No further pending appointments found.");
      }
    } else {
      // 🔹 No active appointment → start first pending one
      let firstPendingIndex = appointments.findIndex(app =>
        app.appointmentObj?.status?.trim().toLowerCase() === "pending"
      );

      console.log("🕓 First Pending Appointment Index:", firstPendingIndex);

      if (firstPendingIndex !== -1) {
        const firstPendingId = appointments[firstPendingIndex]._id;

        await Appointment.findByIdAndUpdate(firstPendingId, {
          $set: { status: "Active", activeTime: new Date() }
        });

        console.log(`🟢 Activated first pending appointment: ${firstPendingId}`);
      } else {
        console.log("❌ No pending appointments found.");
        return { message: "No pending appointments found." };
      }
    }

    return { message: "Appointments updated successfully for the doctor." };

  } catch (error) {
    console.error("❌ Error in updateNextAppointment:", error);
    throw error;
  }
}



//to be done later
// static async updateNextAppointment(io, doctorId) {
//   const {broadcastQueue} = require("../utils/websocket");
//   const { DateTime } = require("luxon");
//   const moment = require("moment-timezone");

//   try {
//     if (!doctorId) throw new Error("Doctor ID is required");

//     const now = DateTime.now().setZone("Asia/Kolkata");

//     // 1️⃣ Fetch today’s appointments in queue order
//     const appointments = await Appointment.find({
//       doctorId,
//       appointmentDate: {
//         $gte: now.startOf("day").toJSDate(),
//         $lt: now.endOf("day").toJSDate(),
//       },
//     }).sort({ queuePosition: 1 });

//     if (!appointments.length) {
//       return { message: "No appointments for today" };
//     }

//     // 2️⃣ Find active appointment
//     const activeIndex = appointments.findIndex(
//       a => a.status?.toLowerCase() === "active"
//     );

//     // If no active → activate first pending
//     if (activeIndex === -1) {
//       const firstPending = appointments.find(a => a.status === "Pending");
//       if (!firstPending) return { message: "No pending appointments" };

//       const duration = firstPending.slotDuration;
//       await Appointment.findByIdAndUpdate(firstPending._id, {
//         status: "Active",
//         currentStart: now.toJSDate(),
//         currentEnd: now.plus({ minutes: duration }).toJSDate(),
//       });

//       await broadcastQueue(io, doctorId);
//       return { message: "First appointment activated" };
//     }

//     const activeAppt = appointments[activeIndex];

//     // 3️⃣ Complete current active appointment
//     await Appointment.findByIdAndUpdate(activeAppt._id, {
//       status: "Completed",
//       currentEnd: now.toJSDate(),
//       completionTime: now.toJSDate(),
//       duration: Math.round(
//         (now.toMillis() - DateTime.fromJSDate(activeAppt.currentStart).toMillis()) / 60000
//       ),
//     });

//     let baseTime = now;

//     // 4️⃣ Shift all remaining appointments
//     for (let i = activeIndex + 1; i < appointments.length; i++) {
//       const appt = appointments[i];
//       const duration = appt.slotDuration;

//       const newStart = baseTime;
//       const newEnd = baseTime.plus({ minutes: duration });

//       await Appointment.findByIdAndUpdate(appt._id, {
//         status: i === activeIndex + 1 ? "Active" : "Pending",
//         currentStart: newStart.toJSDate(),
//         currentEnd: newEnd.toJSDate(),
//       });

//       baseTime = newEnd;
//     }

//     // 5️⃣ Lock slots till last appointment end
//     const DoctorSchedule = require("../models/doctorSchedule");
//     const schedule = await DoctorSchedule.findOne({ doctorId });

//     if (schedule) {
//       const updatedSlots = schedule.dailySlots.map(slot => {
//         const slotStart = DateTime.fromFormat(slot.start, "h:mm a", { zone: "Asia/Kolkata" });
//         const slotEnd = DateTime.fromFormat(slot.end, "h:mm a", { zone: "Asia/Kolkata" });

//         if (slotStart < baseTime && slotEnd > now) {
//           slot.isLocked = true;
//           slot.lockedAt = now.toJSDate();
//           slot.lockExpiresAt = baseTime.toJSDate();
//         }
//         return slot;
//       });

//       await DoctorSchedule.updateOne(
//         { doctorId },
//         { $set: { dailySlots: updatedSlots } }
//       );
//     }

//     // 6️⃣ Notify & broadcast
//     await broadcastQueue(io, doctorId);

//     return { message: "Queue updated successfully" };

//   } catch (err) {
//     console.error("❌ updateNextAppointment error:", err);
//     throw err;
//   }
// }

    
    static async getDoctorQRCode(doctorId) {
      // 1. Fetch doctor
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) throw new Error("Doctor not found");
    
      // 2. Prepare data for QR code
      const dataToEncode = JSON.stringify({
        id: doctor._id,
        name: doctor.name,
        specialization: doctor.specialization,
      });
    
      // 3. Define directory and file path
      const outputDir = path.join(__dirname, 'qr-images');
      const fileName = `doctor-${doctor._id}.png`;
      const filePath = path.join(outputDir, fileName);
    
      // 4. Ensure the directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
    
      // 5. Generate and save QR code to file
      await QRCode.toFile(filePath, dataToEncode, {
        type: 'png',
        width: 300,
        errorCorrectionLevel: 'H',
      });
    
      // 6. Optional: Return the file path or URL
      return filePath;
    }
    
//   static async getTodaySlots(doctorId, lat, long) {
//   try {
//     const now = DateTime.local().setZone("Asia/Kolkata");
//     const today = now.toFormat("yyyy-MM-dd");

//     // Fetch doctor and availability
//    // 🚀 Run both queries in parallel
//     const [doctor, availability] = await Promise.all([
//       Doctor.findById(doctorId)
//         .select("doctorName coordinates.lat coordinates.long contactInformation clinicName specialization consultationFee experience patientCount")
//         .lean(),
//       this.getAvailability(doctorId)
//     ]);


//    // const availability = await this.getAvailability(doctorId);

//     if (!doctor || !availability) {
//       throw new Error("Doctor or availability not found");
//     }

//     // Get precomputed daily slots
//     const dailySlots = availability.dailySlots || [];

//     // Helper: split slots into session buckets
//     const splitSlotsBySession = (session) => {
//       if (!session?.enabled) return [];

//       const startTime = moment(session.start, "hh:mm A");
//       const endTime = moment(session.end, "hh:mm A");

//       return dailySlots
//         .filter((slot) => {
//           const slotStart = moment(slot.start, "hh:mm A");
//           return slotStart.isSameOrAfter(startTime) && slotStart.isBefore(endTime);
//         })
//         .map((slot) => ({
//           startTime: moment(slot.start, "hh:mm A").format("hh:mm A"),
//           endTime: moment(slot.end, "hh:mm A").format("hh:mm A"),
//           isBooked: slot.isBooked || slot.isLocked, // 🔑 treat locked as booked
//         }));
//     };

//     const morningSlots = splitSlotsBySession(availability.morningSession);
//     const eveningSlots = splitSlotsBySession(availability.eveningSession);

//     // Distance calculation (same as before, no caching)
//     let distanceData = null;
//     if (doctor?.coordinates?.lat && doctor?.coordinates?.long && lat && long) {
//       try {
//         const controller = new AbortController();
//         const timeoutId = setTimeout(() => controller.abort(), 3000);

//         distanceData = await GoogleMaps.getDistanceAndTime(
//           { lat: parseFloat(lat), long: parseFloat(long) },
//           {
//             lat: doctor.coordinates.lat,
//             long: doctor.coordinates.long,
//           },
//           { signal: controller.signal }
//         );

//         clearTimeout(timeoutId);
//       } catch (error) {
//         console.warn("Distance calculation failed:", error.message);
//         distanceData = null;
//       }
//     }

//     // Response identical to original
//     return {
//       doctor,
//       date: today,
//       availability,
//       distanceData,
//       slots: {
//         morning: morningSlots,
//         evening: eveningSlots,
//       },
//     };
//   } catch (error) {
//     console.error("Error fetching doctor's slots for today:", error.message);
//     throw error;
//   }
// }
static async getTodaySlots(doctorId, lat, long) {
  try {
    const now = DateTime.local().setZone("Asia/Kolkata");
    const today = now.toFormat("yyyy-MM-dd");

    // 🚀 Run both queries in parallel
    const [doctor, availability] = await Promise.all([
      Doctor.findById(doctorId)
        .select(
          "doctorName coordinates.lat coordinates.long contactInformation clinicName specialization consultationFee experience patientCount"
        )
        .lean(),
      this.getAvailability(doctorId),
    ]);

    if (!doctor || !availability) {
      throw new Error("Doctor or availability not found");
    }

    // ✅ Source of truth
    const dailySlots = availability.dailySlots || [];

    // 🔑 NEW: Split slots purely by session
    const morningSlots = dailySlots
      .filter(slot => slot.session === "morning")
      .map(slot => ({
        startTime: moment(slot.start, "hh:mm A").format("hh:mm A"),
        endTime: moment(slot.end, "hh:mm A").format("hh:mm A"),
        isBooked: slot.isBooked || slot.isLocked,
      }));

    const eveningSlots = dailySlots
      .filter(slot => slot.session === "evening")
      .map(slot => ({
        startTime: moment(slot.start, "hh:mm A").format("hh:mm A"),
        endTime: moment(slot.end, "hh:mm A").format("hh:mm A"),
        isBooked: slot.isBooked || slot.isLocked,
      }));

    // 📍 Distance calculation (unchanged)
    let distanceData = null;
    if (doctor?.coordinates?.lat && doctor?.coordinates?.long && lat && long) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        distanceData = await GoogleMaps.getDistanceAndTime(
          { lat: parseFloat(lat), long: parseFloat(long) },
          {
            lat: doctor.coordinates.lat,
            long: doctor.coordinates.long,
          },
          { signal: controller.signal }
        );

        clearTimeout(timeoutId);
      } catch (error) {
        console.warn("Distance calculation failed:", error.message);
        distanceData = null;
      }
    }

    // ✅ Response shape stays IDENTICAL
    return {
      doctor,
      date: today,
      availability,
      distanceData,
      slots: {
        morning: morningSlots,
        evening: eveningSlots,
      },
    };
  } catch (error) {
    console.error("Error fetching doctor's slots for today:", error.message);
    throw error;
  }
}



  static async invalidateDoctorSlots(doctorId, appointmentDate = null) {
    invalidateDoctorCache(doctorId, appointmentDate);
  }
    
}// Pre-calculate session boundaries once
const getSessionBoundaries = (session) => {
  if (!session?.enabled) return null;
  
  const [startHour, startMinute, startPeriod] = session.start.match(/(\d+):(\d+) (AM|PM)/).slice(1);
  const [endHour, endMinute, endPeriod] = session.end.match(/(\d+):(\d+) (AM|PM)/).slice(1);
  
  return {
    startMinutes: convertToMinutes(startHour, startMinute, startPeriod),
    endMinutes: convertToMinutes(endHour, endMinute, endPeriod)
  };
};

const convertToMinutes = (hour, minute, period) => {
  let h = parseInt(hour);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + parseInt(minute);
};




module.exports = DoctorService;
console.log("→ DoctorService.js reached the BOTTOM");
console.log("→ Exporting constructor name:", module.exports.name);           // → "DoctorService"
console.log("→ Static methods visible via getOwnPropertyNames:", Object.getOwnPropertyNames(module.exports));