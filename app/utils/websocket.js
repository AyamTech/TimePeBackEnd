// /**
//  * Realtime WebSocket setup for Doctor–Patient appointment tracking
//  * ---------------------------------------------------------------
//  * Features:
//  *  - Each doctor has a "queue" room (group)
//  *  - Each appointment has a private room
//  *  - Realtime patient movement updates using Google Distance Matrix
//  *  - Automatic check-in and queue reordering
//  *  - Broadcast queue updates instantly to doctor & patients
//  */

// const Appointment = require("../models/AppointmentsModel");
// const Doctor = require("../models/doctorModel");
// const { getDistanceAndTime } = require("../utils/googlemaps/googlemaps");
// const AppointmentService = require("../services/appointment");
// const moment = require("moment-timezone");/

// /* ---------- Utility Functions ---------- */

// // Haversine formula to calculate distance (in meters)
// function getDistanceMeters(lat1, lon1, lat2, lon2) {
//   const R = 6371000;
//   const toRad = (deg) => (deg * Math.PI) / 180;
//   const dLat = toRad(lat2 - lat1);
//   const dLon = toRad(lon2 - lon1);
//   const a =
//     Math.sin(dLat / 2) ** 2 +
//     Math.cos(toRad(lat1)) *
//       Math.cos(toRad(lat2)) *
//       Math.sin(dLon / 2) ** 2;
//   return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
// }

// // Broadcast the latest queue state to a doctor’s group
// async function broadcastQueue(io, doctorId) {
//   const todayDate = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
//   const { appointments } = await AppointmentService.getTodaysActiveOrPendingAppointments(doctorId);
//   io.to(`queue:${doctorId}`).emit("queue_update", { appointments, date: todayDate });
//   console.log(`📡 Queue update broadcasted for doctor ${doctorId}`);
// }

// /* ---------- Core Socket Setup ---------- */

// function setupWebSocket(io) {
//   io.on("connection", (socket) => {
//     console.log("✅ Socket connected:", socket.id);

//     const user = socket.user; // from auth middleware (server.js)
//     if (!user) {
//       console.log("❌ Socket rejected: unauthenticated");
//       socket.disconnect();
//       return;
//     }

//     /* -------------------------------------------------
//      * JOIN ROOMS
//      * ------------------------------------------------- */
//     // socket.on("join_doctor_queue", (doctorId) => {
//     //   const room = `queue:${doctorId}`;
//     //   socket.join(room);
      
//     //   console.log(`👨‍⚕️ ${user.id} joined ${room}`);
//     // });

//     socket.on("join_doctor_queue", (doctorId, callback) => {
//   const room = `queue:${doctorId}`;
//   socket.join(room);
//   console.log(`👨‍⚕️ ${socket.user.id} joined ${room}`);
//   if (callback) callback({ success: true, room });
// });


//     socket.on("join_appointment", (appointmentId) => {
//       const room = `appointment:${appointmentId}`;
//       socket.join(room);
//       console.log(`👤 ${user.id} joined ${room}`);
//     });

//     socket.on("get_queue_count", async ({ doctorId }) => {
//   try {
//     console.log(`Fetching queue count for doctor ${doctorId}...`);
//     const { appointmentCount } = await AppointmentService.getTodaysActiveOrPendingAppointments(doctorId);
//     console.log(`Queue count for doctor ${doctorId}: ${appointmentCount}`);
//     // Emit the count back to the requesting client
//     socket.emit("queue_count", { doctorId, appointmentCount });
//     console.log(`Doctor ${doctorId} has ${appointmentCount} active appointments`);

//   } catch (err) {
//     console.error("Error fetching queue count:", err.message);
//   }
// });


//     /* -------------------------------------------------
//      * LOCATION UPDATE (Patient emits this)
//      * ------------------------------------------------- */
//     // socket.on("location_update", async (data) => {
//     //   try {
//     //     const { appointmentId, lat, lng } = data;
//     //     const appointment = await Appointment.findById(appointmentId)
//     //       .populate("doctorId", "coordinates")
//     //       .populate("patientId", "name", "location");

//     //     if (!appointment) return;

//     //     const doctorId = appointment.doctorId._id.toString();
//     //     const doctorRoom = `queue:${doctorId}`;

//     //     const oldLat = parseFloat(patient.location.lat);
//     //     const oldLng = parseFloat(appointment.location.long);
//     //     const moved = getDistanceMeters(lat, lng, oldLat, oldLng);

//     //     if (moved > 20) {
//     //       // Update patient's new location
//     //       appointment.latitude = lat;
//     //       appointment.longitude = lng;
//     //       appointment.matrixData.lastUpdated = new Date();

//     //       const docLat = appointment.doctorId.coordinates?.lat;
//     //       const docLng = appointment.doctorId.coordinates?.long;

//     //       if (!docLat || !docLng) return;

//     //       // Calculate direct distance (Haversine)
//     //       const dist = getDistanceMeters(lat, lng, docLat, docLng);

//     //       if (dist < 10) {
//     //         // Patient near clinic → notify to check in
//     //         io.to(`appointment:${appointmentId}`).emit("checkin_request", {
//     //           appointmentId,
//     //           message: "You are within 10m of the clinic. Please check in.",
//     //         });
//     //       } else {
//     //         // Fetch updated distance/time via Google Matrix
//     //         const matrixData = await getDistanceAndTime(
//     //           { lat, long: lng },
//     //           { lat: docLat, long: docLng }
//     //         );
//     //         appointment.matrixData = {
//     //           travelModes: matrixData,
//     //           lastUpdated: new Date(),
//     //         };
//     //       }

//     //       await appointment.save();

//     //       // Send live update to doctor & patient
//     //       io.to(`appointment:${appointmentId}`).emit("distance_update", {
//     //         appointmentId,
//     //         matrixData: appointment.matrixData,
//     //       });

//     //       io.to(doctorRoom).emit("distance_update", {
//     //         appointmentId,
//     //         patientId: appointment.patientId._id,
//     //         distanceInMeters: dist,
//     //         matrixData: appointment.matrixData,
//     //       });
//     //     }
//     //   } catch (err) {
//     //     console.error("❌ Error in location_update:", err.message);
//     //   }
//     // });


//     socket.on("location_update", async (data) => {
//   try {
//     const { appointmentId, lat, lng } = data;

//     // 1️⃣ Fetch appointment and related doctor/patient details
//     const appointment = await Appointment.findById(appointmentId)
//       .populate("doctorId", "coordinates")
//       .populate("patientId", "name location");

//     if (!appointment) {
//       console.warn(`Appointment ${appointmentId} not found`);
//       return;
//     }

//     const doctorId = appointment.doctorId._id.toString();
//     const doctorRoom = `queue:${doctorId}`;
//     const patient = appointment.patientId;

//     // 2️⃣ Get patient’s previous saved location
//     const oldLat = parseFloat(patient.location?.lat);
//     const oldLng = parseFloat(patient.location?.long);

//     // If first-time location update (no old data)
//     if (isNaN(oldLat) || isNaN(oldLng)) {
//       console.log(`First location update for patient ${patient._id}`);
//       patient.location = { lat, long: lng };
//       await patient.save();
//       return;
//     }

//     // 3️⃣ Calculate distance moved since last known point
//     const moved = getDistanceMeters(lat, lng, oldLat, oldLng);

//     if (moved > 20) {
//       console.log(`🚶‍♂️ Patient ${patient._id} moved ${moved.toFixed(2)}m`);

//       // 4️⃣ Update Patient’s current live location
//       patient.location = { lat, long: lng };
//       await patient.save();

//       // 5️⃣ Update Appointment snapshot (for tracking)
//       appointment.latitude = lat;
//       appointment.longitude = lng;
//       appointment.matrixData.lastUpdated = new Date();

//       // 6️⃣ Doctor’s clinic coordinates
//       const docLat = appointment.doctorId.coordinates?.lat;
//       const docLng = appointment.doctorId.coordinates?.long;
//       if (!docLat || !docLng) return;

//       // 7️⃣ Calculate direct distance from doctor
//       const dist = getDistanceMeters(lat, lng, docLat, docLng);
//         console.log(`Distance to clinic: ${dist.toFixed(2)}m`);
//       // 8️⃣ Handle distance thresholds
//       if (dist < 10) {
//         // ✅ Within 10m → Check-in prompt
//         io.to(`appointment:${appointmentId}`).emit("checkin_request", {
//           appointmentId,
//           message: "You are within 10m of the clinic. Please check in.",
//         });
//       } else {
//         // 📍 >10m → Call Google Matrix API for updated travel info
//         const matrixData = await getDistanceAndTime(
//           { lat, long: lng },
//           { lat: docLat, long: docLng }
//         );

//         appointment.matrixData = {
//           travelModes: matrixData,
//           lastUpdated: new Date(),
//         };
//       }

//       await appointment.save();

//       // 9️⃣ Emit updates to both doctor and patient
//       io.to(`appointment:${appointmentId}`).emit("distance_update", {
//         appointmentId,
//         matrixData: appointment.matrixData,
//       });

//       io.to(doctorRoom).emit("distance_update", {
//         appointmentId,
//         patientId: patient._id,
//         distanceInMeters: dist,
//         matrixData: appointment.matrixData,
//       });
//     }
//   } catch (err) {
//     console.error("❌ Error in location_update:", err.message);
//   }
// });

//     /* -------------------------------------------------
//      * CHECK-IN REQUEST (Patient → Server)
//      * ------------------------------------------------- */
//     socket.on("checkin_request", async ({ appointmentId }) => {
//       try {
//         const appointment = await Appointment.findById(appointmentId);
//         if (!appointment) return;

//         appointment.checkIn = true;
//         appointment.status = "Active";
//         await appointment.save();

//         // 🔁 Reorder queue (reuse your existing appointment logic)
//         await AppointmentService.getTodaysActiveOrPendingAppointments(appointment.doctorId);

//         // 📡 Broadcast queue update to doctor + all patients
//         await broadcastQueue(io, appointment.doctorId);

//         // ✅ Notify this patient that check-in succeeded
//         io.to(`appointment:${appointmentId}`).emit("checkin_confirmed", {
//           message: "Check-in successful!",
//           appointmentId,
//         });

//         console.log(`✅ Patient checked in: ${appointmentId}`);
//       } catch (err) {
//         console.error("❌ Error during check-in:", err.message);
//       }
//     });

//     /* -------------------------------------------------
//      * APPOINTMENT CREATED (optional)
//      * ------------------------------------------------- */
//     socket.on("appointment_created", async ({ doctorId }) => {
//       await broadcastQueue(io, doctorId);
//     });

//     /* -------------------------------------------------
//      * DISCONNECT HANDLER
//      * ------------------------------------------------- */
//     socket.on("disconnect", () => {
//       console.log(`⚠️ Socket disconnected: ${socket.id}`);
//     });
//   });
// }

// module.exports = { setupWebSocket };


// // app/utils/websocket.js
// const Appointment = require("../models/AppointmentsModel");
// const Doctor = require("../models/doctorModel");
// const Patient = require("../models/patientModel"); // ADD THIS
// const { getDistanceAndTime } = require("../utils/googlemaps/googlemaps");
// const AppointmentService = require("../services/appointment");
// const moment = require("moment-timezone");

// const THROTTLE_MS = 30000; // 30 sec max 1 Google call
// const lastCall = new Map(); // appointmentId → timestamp

// function getDistanceMeters(lat1, lon1, lat2, lon2) {
//   const R = 6371000;
//   const toRad = (deg) => (deg * Math.PI) / 180;
//   const dLat = toRad(lat2 - lat1);
//   const dLon = toRad(lon2 - lon1);
//   const a = Math.sin(dLat / 2) ** 2 +
//     Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
//   return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
// }

// async function broadcastQueue(io, doctorId) {
//   const { appointments } = await AppointmentService.getTodaysActiveOrPendingAppointments(doctorId);
//   // SORT: Checked-in first, then by time
//   // In broadcastQueue() — around line 330
// const queue = Array.from(doctorQueue.get(doctorId) || []);

// // SAFE SORT: handle missing startTime
// queue.sort((a, b) => {
//   const timeA = a.startTime || '23:59';
//   const timeB = b.startTime || '23:59';
//   return timeA.localeCompare(timeB);
// });

// // Optional: Also sort by checkIn status (checked-in first)
// queue.sort((a, b) => {
//   if (a.checkIn && !b.checkIn) return -1;
//   if (!a.checkIn && b.checkIn) return 1;
//   const timeA = a.startTime || '23:59';
//   const timeB = b.startTime || '23:59';
//   return timeA.localeCompare(timeB);
// });
// }



// function setupWebSocket(io) {
//   io.on("connection", (socket) => {
//     const user = socket.user;
//     if (!user) return socket.disconnect();

//     console.log(`Connected: ${user.role} ${user.id}`);

//     socket.on("join_doctor_queue", (doctorId) => {
//       socket.join(`queue:${doctorId}`);
//       broadcastQueue(io, doctorId);
//        console.log(`👨‍⚕️ ${user.id} joined queue:${doctorId}`);
//     });
   

//     socket.on("join_appointment", (appointmentId) => {
//       socket.join(`appointment:${appointmentId}`);
//     });

//     socket.on("location_update", async ({ appointmentId, lat, lng }) => {
//       try {
//         const appointment = await Appointment.findById(appointmentId)
//           .populate("doctorId", "coordinates")
//           .populate("patientId", "location");

//         if (!appointment || appointment.checkIn) return;

//         const patient = appointment.patientId;
//         const docLat = appointment.doctorId.coordinates?.lat;
//         const docLng = appointment.doctorId.coordinates?.long;
//         if (!docLat || !docLng) return;

//         // Update patient live location
//         patient.location = { lat, long: lng };
//         await patient.save();

//         const dist = getDistanceMeters(lat, lng, docLat, docLng);
//         const now = Date.now();
//         const last = lastCall.get(appointmentId) || 0;

//         // THROTTLE GOOGLE CALLS
//         if (dist >= 10 && now - last > THROTTLE_MS) {
//           lastCall.set(appointmentId, now);
//           const matrixData = await getDistanceAndTime(
//             { lat, long: lng },
//             { lat: docLat, long: docLng }
//           );
//           appointment.matrixData = { travelModes: matrixData, lastUpdated: new Date() };
//           await appointment.save();
//         }

//         // SAVE SNAPSHOT
//         appointment.latitude = lat;
//         appointment.longitude = lng;
//         await appointment.save();

//         // AUTO CHECK-IN PROMPT
//         if (dist < 10) {
//           io.to(`appointment:${appointmentId}`).emit("checkin_request", {
//             appointmentId,
//             message: "You're 10m away! Check in now?",
//           });
//         }

//         // BROADCAST TO DOCTOR
//         io.to(`queue:${appointment.doctorId}`).emit("patient_moved", {
//           appointmentId,
//           patientId: patient._id,
//           distanceMeters: Math.round(dist),
//           liveETA: appointment.matrixData.travelModes?.driving?.durationText || "N/A",
//         });

//       } catch (err) {
//         console.error("Location update error:", err.message);
//       }
//     });

//     socket.on("checkin_request", async ({ appointmentId }) => {
//       const appointment = await Appointment.findById(appointmentId);
//       if (!appointment || appointment.checkIn) return;

//       appointment.checkIn = true;
//       appointment.status = "Active";
//       await appointment.save();

//       // RE-BROADCAST QUEUE (checked-in jumps up)
//       await broadcastQueue(io, appointment.doctorId.toString());

//       io.to(`appointment:${appointmentId}`).emit("checkin_confirmed", {
//         message: "Checked in! You're next.",
//       });
//     });

//     socket.on("disconnect", () => console.log(`Disconnected: ${socket.id}`));
//   });
// }

// module.exports = { setupWebSocket };

// // app/utils/websocket.js
// const Appointment = require("../models/AppointmentsModel");
// const Doctor = require("../models/doctorModel");
// const Patient = require("../models/patientModel");
// const { getDistanceAndTime } = require("../utils/googlemaps/googlemaps");
// const AppointmentService = require("../services/appointment");
// const moment = require("moment-timezone");

// // GLOBAL IN-MEMORY QUEUE (Fix: was missing!)
// const doctorQueue = new Map(); // doctorId → Set of appointment objects

// const THROTTLE_MS = 30000;
// const lastCall = new Map();

// function getDistanceMeters(lat1, lon1, lat2, lon2) {
//   const R = 6371000;
//   const toRad = (deg) => (deg * Math.PI) / 180;
//   const dLat = toRad(lat2 - lat1);
//   const dLon = toRad(lon2 - lon1);
//   const a = Math.sin(dLat / 2) ** 2 +
//     Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
//   return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
// }

// async function broadcastQueue(io, doctorIdInput) {
//   try {
//     // Normalize the doctorId
//     const doctorId =
//       typeof doctorIdInput === "object" && doctorIdInput?._id
//         ? doctorIdInput._id.toString()
//         : doctorIdInput?.toString();

//     if (!doctorId || typeof doctorId !== "string") {
//       console.warn("broadcastQueue called with invalid doctorId:", doctorIdInput);
//       return;
//     }

//     const { appointments } =
//       await AppointmentService.getTodaysActiveOrPendingAppointments(doctorId);

//     const queueSet = new Set();
//     for (const appt of appointments) {
//       queueSet.add({
//         _id: appt._id.toString(),
//         startTime: appt.startTime || "23:59",
//         checkIn: !!appt.checkIn,
//         patientName: appt.patientId?.name || "Unknown",
//         liveETA: appt.matrixData?.travelModes?.driving?.durationText || "N/A",
//       });
//     }

//     doctorQueue.set(doctorId, queueSet);

//     const queue = Array.from(queueSet);
//     queue.sort((a, b) => {
//       if (a.checkIn && !b.checkIn) return -1;
//       if (!a.checkIn && b.checkIn) return 1;
//       return (a.startTime || "23:59").localeCompare(b.startTime || "23:59");
//     });

//     io.to(`queue:${doctorId}`).emit("queue_update", { queue });
//   } catch (err) {
//     console.error("broadcastQueue error:", err.message);
//   }
// }


// function setupWebSocket(io) {
//   io.on("connection", (socket) => {
//     const user = socket.user;
//     if (!user) return socket.disconnect();

//     console.log(`Connected: ${user.role} ${user.id}`);

//  socket.on("join_doctor_queue", (doctorId) => {
//   const normalizedDoctorId =
//     typeof doctorId === "object" && doctorId?._id
//       ? doctorId._id.toString()
//       : doctorId?.toString();

//   socket.join(`queue:${normalizedDoctorId}`);
//   console.log(`${user.role} ${user.id} joined queue:${normalizedDoctorId}`);
//   broadcastQueue(io, normalizedDoctorId);
// });



//     socket.on("join_appointment", (appointmentId) => {
//       socket.join(`appointment:${appointmentId}`);
//     });

//     socket.on("location_update", async ({ appointmentId, lat, lng }) => {
//       try {
//         const appointment = await Appointment.findById(appointmentId)
//           .populate("doctorId", "coordinates")
//           .populate("patientId", "location");

//         if (!appointment || appointment.checkIn) return;

//         const patient = appointment.patientId;
//         const docLat = appointment.doctorId.coordinates?.lat;
//         const docLng = appointment.doctorId.coordinates?.long;
//         if (!docLat || !docLng) return;

//         // Update live location
//         patient.location = { lat, long: lng };
//         await patient.save();

//         const dist = getDistanceMeters(lat, lng, docLat, docLng);
//         const now = Date.now();
//         const last = lastCall.get(appointmentId) || 0;

//         if (dist >= 10 && now - last > THROTTLE_MS) {
//           lastCall.set(appointmentId, now);
//           const matrixData = await getDistanceAndTime(
//             { lat, long: lng },
//             { lat: docLat, long: docLng }
//           );
//           appointment.matrixData = { travelModes: matrixData, lastUpdated: new Date() };
//           await appointment.save();
//         }

//         appointment.latitude = lat;
//         appointment.longitude = lng;
//         await appointment.save();

//         // AUTO CHECK-IN
//         if (dist < 10) {
//           io.to(`appointment:${appointmentId}`).emit("checkin_request", {
//             appointmentId,
//             message: "You're 10m away! Check in now?",
//           });
//         }

//         // NOTIFY DOCTOR
//         io.to(`queue:${appointment.doctorId}`).emit("patient_moved", {
//           appointmentId,
//           patientId: patient._id,
//           distanceMeters: Math.round(dist),
//           liveETA: appointment.matrixData?.travelModes?.driving?.durationText || "N/A",
//         });

//         // RE-BROADCAST QUEUE
//       broadcastQueue(io, appointment.doctorId?._id?.toString() || appointment.doctorId.toString());



//       } catch (err) {
//         console.error("Location update error:", err.message);
//       }
//     });

//     socket.on("checkin_request", async ({ appointmentId }) => {
//       try {
//         const appointment = await Appointment.findById(appointmentId);
//         if (!appointment || appointment.checkIn) return;

//         console.log(`Check-in request for appointment ${appointmentId}`);
//         appointment.checkIn = true;
//         appointment.status = "Active";
//         await appointment.save();

//         io.to(`appointment:${appointmentId}`).emit("checkin_confirmed", {
//           message: "Checked in! You're next.",
//         });

//         // RE-BROADCAST QUEUE
//    broadcastQueue(io, appointment.doctorId?._id?.toString() || appointment.doctorId.toString());

//       } catch (err) {
//         console.error("Check-in error:", err.message);
//       }
//     });

//     socket.on("disconnect", () => {
//       console.log(`Disconnected: ${socket.id}`);
//     });
//   });
// }

// module.exports = { setupWebSocket };


/*
  websocket_server.js
  Production-ready WebSocket setup for your appointment app.

  - Adds auth middleware that accepts token + clientId + role
  - Looks up Doctor or Patient model based on role and attaches socket.user
  - Maintains in-memory maps for active sockets and doctorQueue
  - Handles: join_doctor_queue, join_appointment, location_update, checkin_request, disconnect
  - Throttles Google Matrix calls and avoids repeated DB writes when checkIn is true

  USAGE: In your server entry (server.js) do:
    const { initWebsockets } = require('./websocket_server');
    initWebsockets(io);

  Notes: replace require() paths to match your project structure.
  For multi-instance deployment, replace in-memory maps with Redis and use socket.io-redis adapter.
*/

const jwt = require('jsonwebtoken');
const Appointment = require('../models/AppointmentsModel');
const Doctor = require('../models/doctorModel');
const Patient = require('../models/patientModel');
const { getDistanceAndTime } = require('../utils/googlemaps/googlemaps');

const moment = require('moment-timezone');
const {markCheckIn} = require('../utils/markcheckin.utils');

const { getTodaysActiveOrPendingAppointments } = require('../utils/appointment.utils');

// In-memory stores (use Redis for multi-server)
const doctorQueue = new Map(); // doctorId -> Set(appointment summaries)
const activeSockets = new Map(); // userId -> socket.id (last connected)

const THROTTLE_MS = 30000; // throttle Google Matrix calls per appointment
const lastCall = new Map(); // appointmentId -> timestamp

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function broadcastQueue(io, doctorIdInput) {
  // const AppointmentService = require('../services/appointment');
  try {
    // Normalize doctorId to string
    const doctorId =
      typeof doctorIdInput === 'object' && doctorIdInput?._id
        ? doctorIdInput._id.toString()
        : doctorIdInput?.toString();

    if (!doctorId || typeof doctorId !== 'string') {
      console.warn('broadcastQueue called with invalid doctorId:', doctorIdInput);
      return;
    }

    const { appointments } = await getTodaysAppointments(doctorId);

    const queueSet = new Set();
    for (const appt of appointments) {
      queueSet.add({
        _id: appt._id.toString(),
        startTime: appt.startTime || '23:59',
        checkIn: !!appt.checkIn,
        patientName: appt.patientId?.name || 'Unknown',
        liveETA: appt.matrixData?.travelModes?.driving?.durationText || 'N/A',
      });
    }

    doctorQueue.set(doctorId, queueSet);

    const queue = Array.from(queueSet);
    queue.sort((a, b) => {
      if (a.checkIn && !b.checkIn) return -1;
      if (!a.checkIn && b.checkIn) return 1;
      return (a.startTime || '23:59').localeCompare(b.startTime || '23:59');
    });

    io.to(`queue:${doctorId}`).emit('queue_update', { queue });
  } catch (err) {
    console.error('broadcastQueue error:', err.message);
  }
}

function initWebsockets(io) {
  // Socket auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const clientId = socket.handshake.query?.clientId;
      const role = socket.handshake.query?.role; // 'doctor' or 'patient'

      console.log('Socket auth attempt:', { clientId, role });

      if (!token || !clientId || !role) return next(new Error('Authentication, clientId and role required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded || decoded.id !== clientId) return next(new Error('Client ID does not match token'));

      // Attach user object by looking up respective model
      let user;
      if (role === 'doctor') {
        const doctor = await Doctor.findById(clientId).select('_id name');
        if (!doctor) return next(new Error('Doctor not found'));
        user = { id: doctor._id.toString(), role: 'doctor', name: doctor.name };
      } else if (role === 'patient') {
        const patient = await Patient.findById(clientId).select('_id name');
        if (!patient) return next(new Error('Patient not found'));
        user = { id: patient._id.toString(), role: 'patient', name: patient.name };
      } else {
        return next(new Error('Invalid role'));
      }

      socket.user = user;
      console.log(`✅ Authenticated ${user.role}: ${user.id}`);
      next();
    } catch (err) {
      console.error('Socket auth error:', err.message);
      next(new Error('Invalid token or user'));
    }
  });

  // Core handlers
  io.on('connection', (socket) => {
    const user = socket.user; // { id, role, name }
    if (!user) {
      console.warn('Connection without user - disconnecting socket', socket.id);
      return socket.disconnect(true);
    }

    // Track active socket for user (last one wins)
    activeSockets.set(user.id, socket.id);

    console.log(`Connected: ${user.role} ${user.id} (socket: ${socket.id})`);

    // Debug helper
    socket.on('debug_ping', () => socket.emit('debug_pong', { socketId: socket.id, user }));

    socket.on('join_doctor_queue', (doctorId) => {
      const normalizedDoctorId = typeof doctorId === 'object' && doctorId?._id ? doctorId._id.toString() : doctorId?.toString();
      if (!normalizedDoctorId) return;
      socket.join(`queue:${normalizedDoctorId}`);
      console.log(`${user.role} ${user.id} joined queue:${normalizedDoctorId}`);
      broadcastQueue(io, normalizedDoctorId);
    });

    socket.on('join_appointment', (appointmentId) => {
      if (!appointmentId) return;
      socket.join(`appointment:${appointmentId}`);
      console.log(`${user.role} ${user.id} joined appointment:${appointmentId}`);
    });

    socket.on('location_update', async ({ appointmentId, lat, lng }) => {
      try {
        // Basic validation
        if (!appointmentId || typeof lat !== 'number' || typeof lng !== 'number') return;

        const appointment = await Appointment.findById(appointmentId)
          .populate('doctorId', 'coordinates')
          .populate('patientId', 'location');

        if (!appointment) {
          console.warn('location_update for missing appointment', appointmentId);
          return;
        }

        // If appointment already checked in, ignore further updates
        if (appointment.checkIn) return;

        const patient = appointment.patientId;
        const docLat = appointment.doctorId?.coordinates?.lat;
        const docLng = appointment.doctorId?.coordinates?.long;
        if (!docLat || !docLng) return; // can't compute

        // Save patient live location
        patient.location = { lat, long: lng };
        await patient.save();

        // Distance calc
       console.log(`📍 Location update received: Appointment ${appointmentId} | Lat: ${lat}, Lng: ${lng}`);

const dist = getDistanceMeters(lat, lng, docLat, docLng);
console.log(`   ↳ Distance to doctor: ${dist.toFixed(2)}m`);

        const now = Date.now();
        const last = lastCall.get(appointmentId) || 0;

        // Throttled Google Matrix call
        if (dist >= 10 && now - last > THROTTLE_MS) {
          lastCall.set(appointmentId, now);
          try {
            const matrixData = await getDistanceAndTime({ lat, long: lng }, { lat: docLat, long: docLng });
            appointment.matrixData = { travelModes: matrixData, lastUpdated: new Date() };
            await appointment.save();
          } catch (e) {
            console.error('Google matrix call failed:', e.message || e);
          }
        }

        // Keep last known coords on appointment for quick access
        appointment.latitude = lat;
        appointment.longitude = lng;
        await appointment.save();

        // Send live ETA and distance back to patient
io.to(`appointment:${appointmentId}`).emit('distance_update', {
  appointmentId,
  matrixData: appointment.matrixData,
});

console.log(`📡 Sent distance_update to patient ${patient._id}`);

    const {checkInPatient} = require('../utils/firebase/notification')

        // Auto check-in notify
        if (dist < 25) {
          io.to(`appointment:${appointmentId}`).emit('checkin_request', {
            appointmentId,
            message: "You're 10m away! Check in now?",
          });
          
          await markCheckIn(appointmentId);

          //  await checkInPatient(patient._id, appointmentId, appointment.doctorId?._id || appointment.doctorId);
          // console.log(`✅ Auto check-in prompt sent to patient ${patient._id}`);
        }
        

        // Notify doctor room
        const doctorRoom = appointment.doctorId?._id?.toString() || appointment.doctorId.toString();
        io.to(`queue:${doctorRoom}`).emit('patient_moved', {
          appointmentId,
          patientId: patient._id,
          distanceMeters: Math.round(dist),
          liveETA: appointment.matrixData?.travelModes?.driving?.durationText || 'N/A',
        });

        

        // Re-broadcast full queue
        broadcastQueue(io, doctorRoom);
      } catch (err) {
        console.error('Location update error:', err.message || err);
      }
    });

    socket.on('checkin_confirmed', async ({ appointmentId }) => {
      try {
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment || appointment.checkIn) return;

        console.log(`Check-in request for appointment ${appointmentId}`);

        appointment.checkIn = true;
        await appointment.save();

        io.to(`appointment:${appointmentId}`).emit('checkin_confirmed', {
          message: 'Checked in! You\'re next.',
        });

        const doctorRoom = appointment.doctorId?._id?.toString() || appointment.doctorId.toString();
        broadcastQueue(io, doctorRoom);
      } catch (err) {
        console.error('Check-in error:', err.message || err);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`Disconnected: ${socket.id} user:${user.id} role:${user.role} reason:${reason}`);
      // Clean up active socket map
      const existing = activeSockets.get(user.id);
      if (existing === socket.id) activeSockets.delete(user.id);
      // Optionally: broadcastQueue for doctor to refresh (if patient left unexpectedly)
      // If role is patient and we kept in-memory presence lists, remove them here.
    });
  });
}
const getTodaysAppointments = async (doctorId) => {
  return await getTodaysActiveOrPendingAppointments({
    AppointmentModel: Appointment,
    doctorId
  });
}

module.exports = { initWebsockets, broadcastQueue };


