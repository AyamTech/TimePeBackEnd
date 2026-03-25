// const express = require("express");
// const connectDB = require("./app/config/mongo");

// const dotenv = require("dotenv");
// const cors = require("cors");
// const cron = require("node-cron");

// const {appNotifier} =  require("./app/utils/firebase/notification");
// const queueManager = require("./app/services/queueManager");
// const bodyParser = require('body-parser');

// const {patientNotifier, clearAllPatientsNotifications, resetAllDoctorSlots } = require("./app/utils/firebase/notification");
// const {cleanupExpiredSlotsAndTransactions} = require("./app/services/payment");
// dotenv.config();
// connectDB();

// const app = express();
// app.use(express.json());
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.static('public')); // Serve static files from public/
// app.use(cors());


// app.use("/api/auth", require("./app/routes/auth"));
// app.use("/api/doctor", require("./app/routes/doctorRoutes"));
// app.use("/api/patient", require("./app/routes/patient"));
// app.use("/api/admin", require("./app/routes/admin"));
// app.use("/api/appointment", require("./app/routes/appointment"));
// app.use("/api/doctor/queue", require("./app/routes/queue"));
// app.use("/api/notification", require("./app/routes/notifications"));
// app.use("/api/payment", require("./app/routes/payment"));

// // // Example Cron Job: Runs every day at midnight
// // cron.schedule("* * * * *", async () => {
// //   console.log("Cron job running every minute");

// //   await patientNotifier();  
// //   console.log("below Patient notifier");
// //    await appNotifier();
// //   //   await queueManager();

// // });

// //Example Cron Job: Runs every minute
// cron.schedule("* * * * *", async () => {
//   console.log(" Cron job running every minute");

//   try {
//    await patientNotifier();  
//     console.log("patientNotifier finished");

//    await appNotifier();
//     console.log(" appNotifier finished");

//     await queueManager();
//     console.log(" queueManager finished");

//   } catch (error) {
//     console.error(" Cron job error:", error);
//   }
// });

// // Schedule job: Every night at 23:59:59 IST
// cron.schedule(
//   "59 59 23 * * *", // sec min hour day month weekday
//   () => {
//     clearAllPatientsNotifications();
//   },
//   {
//     scheduled: true,
//     timezone: "Asia/Kolkata", // IST timezone
//   }
// );

// cron.schedule(
//   "59 59 23 * * *", // sec min hour day month weekday
//   () => {
//     resetAllDoctorSlots();
//   },
//   {
//     scheduled: true,
//     timezone: "Asia/Kolkata", // IST timezone
//   }
// );

// // Run cleanup every minute
// cron.schedule('* * * * *', async () => {
//   console.log('Running slot cleanup job...');
//   await cleanupExpiredSlotsAndTransactions();
//  // await resetAllDoctorSlots();
// });


// const PORT = process.env.PORT || 4000;
// const HOST = '0.0.0.0'; // This allows external access

// app.listen(PORT, HOST, () => console.log(`Server running on http://${HOST}:${PORT}`));


// const express = require("express");
// const http = require("http");
// const { Server } = require("socket.io");
// const dotenv = require("dotenv");
// const cors = require("cors");
// const bodyParser = require("body-parser");

// const connectDB = require("./app/config/mongo");
// const setupSockets = require("./app/socket");
// const { cleanupExpiredSlotsAndTransactions } = require("./app/services/payment");
// const { clearAllPatientsNotifications, resetAllDoctorSlots } = require("./app/utils/firebase/notification");
// const cron = require("node-cron");

// const handleLocationUpdate = require("./app/sockets/locationHandler");
// const handlePatientCheckIn = require("./app/sockets/patientCheckInHandler");
// dotenv.config();
// connectDB();

// const app = express();
// app.use(express.json());
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.static("public"));
// app.use(cors());

// // Routes
// app.use("/api/auth", require("./app/routes/auth"));
// app.use("/api/doctor", require("./app/routes/doctorRoutes"));
// app.use("/api/patient", require("./app/routes/patient"));
// app.use("/api/admin", require("./app/routes/admin"));
// app.use("/api/appointment", require("./app/routes/appointment"));
// app.use("/api/doctor/queue", require("./app/routes/queue"));
// app.use("/api/notification", require("./app/routes/notifications"));
// app.use("/api/payment", require("./app/routes/payment"));

// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: "*",
//   },
// });



// // Socket connection

// io.on("connection", (socket) => {
//   console.log("⚡ Client connected:", socket.id);

//   socket.on("joinPatient", (patientId) => {
//     socket.join(`patient_${patientId}`);
//   });

//   socket.on("joinDoctor", (doctorId) => {
//     socket.join(`doctor_${doctorId}`);
//   });

//   socket.on("locationUpdate", (data) => {
//     handleLocationUpdate(io, data);
//   });

//   socket.on("patientCheckIn", (data) => {
//     handlePatientCheckIn(io, data);
//   });

//   socket.on("disconnect", () => {
//     console.log("⚡ Client disconnected:", socket.id);
//   });
// });

// // Keep only essential crons
// cron.schedule("59 59 23 * * *", () => {
//   clearAllPatientsNotifications();
//   resetAllDoctorSlots();
// }, { timezone: "Asia/Kolkata" });

// cron.schedule("* * * * *", async () => {
//   console.log("🧹 Running slot cleanup job...");
//   await cleanupExpiredSlotsAndTransactions();
// });

// const PORT = process.env.PORT || 4000;
// const HOST = "0.0.0.0";

// server.listen(PORT, HOST, () =>
//   console.log(`🚀 Server running on http://${HOST}:${PORT}`)
// );


const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./app/config/mongo");
const dotenv = require("dotenv");
const cors = require("cors");
const cron = require("node-cron");
const {appNotifier} =  require("./app/utils/firebase/notification");
const { setupWebSocket } = require("./app/utils/websocket");
const queueManager = require("./app/services/queueManager");
const jwt = require("jsonwebtoken");
const {regenerateDailySlots} = require("./app/utils/regenerate.slots");

const bodyParser = require('body-parser');

const {patientNotifier, clearAllPatientsNotifications, resetAllDoctorSlots, resetAllDoctorAppointmentHistory, resetAllDoctorBreakHistory } = require("./app/utils/firebase/notification");
const {cleanupExpiredSlotsAndTransactions} = require("./app/services/payment");
dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }, // Adjust for production
  pingTimeout: 60000
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cors());

// Set io for routes
app.set("io", io);

// Routes
app.use("/api/auth", require("./app/routes/auth"));
app.use("/api/doctor", require("./app/routes/doctorRoutes"));
// app.use("/api/patient", require("./app/routes/patient"));
app.use("/api/patient", require("./app/routes/patient")(io));

app.use("/api/admin", require("./app/routes/admin"));
app.use("/api/appointment", require("./app/routes/appointment")(io)); // Pass io
app.use("/api/doctor/queue", require("./app/routes/queue"));
app.use("/api/notification", require("./app/routes/notifications"));
app.use("/api/payment", require("./app/routes/payment"));
app.use("/api/invoice", require("./app/routes/invoice"));

const { initWebsockets } = require('./app/utils/websocket');
initWebsockets(io);


//Cron jobs
cron.schedule("* * * * *", async () => {
  console.log("Cron job running every minute");
  try {
    await patientNotifier();
    console.log("patientNotifier finished");
    await appNotifier();
    console.log("appNotifier finished");

  await queueManager();
  } catch (error) {
    console.error("Cron job error:", error);


  }
});

cron.schedule("0 0 0 * * *", () => {
  io.socketsLeave((socket) => socket.rooms.forEach(room => {
    if (room.startsWith("queue:")) socket.leave(room);
  }));
  console.log("Daily queue rooms cleared");
}, { scheduled: true, timezone: "Asia/Kolkata" });

cron.schedule("59 59 23 * * *", () => {
  clearAllPatientsNotifications();
}, { scheduled: true, timezone: "Asia/Kolkata" });
cron.schedule(
  "59 59 23 * * *", // sec min hour day month weekday
  () => {
    regenerateDailySlots();
    resetAllDoctorAppointmentHistory();
    resetAllDoctorBreakHistory();
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata", // IST timezone
  }
);

cron.schedule("59 59 23 * * *", () => {
  resetAllDoctorSlots();
}, { scheduled: true, timezone: "Asia/Kolkata" });

cron.schedule("* * * * *", async () => {
  console.log("Running slot cleanup job...");
  await cleanupExpiredSlotsAndTransactions();
});

const PORT = process.env.PORT || 4000;
const HOST = "0.0.0.0";

server.listen(PORT, HOST, () => console.log(`Server running on http://${HOST}:${PORT}`));