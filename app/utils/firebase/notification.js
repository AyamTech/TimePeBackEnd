const moment = require("moment-timezone");
const NotificationSettings = require("../../models/notificationSettings");
const Appointment = require("../../models/AppointmentsModel");
const Doctor = require("../../models/doctorModel");
const admin = require("./firebaseAdmin");
const DoctorService = require("../../services/doctorService");
const GoogleMaps = require("../googlemaps/googlemaps"); 
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const DoctorSchedule = require("../../models/doctorSchedule");
const Patient = require("../../models/patientModel");
dayjs.extend(utc);
dayjs.extend(timezone);


   const sendNotification = async (patientId, appointmentId, doctorId) => {
    const patient = await Patient.findById( patientId );
    const doctor = await Doctor.findById(doctorId);
    if(patient.deviceTokens && patient.deviceTokens.length > 0) {
      const messages = patient.deviceTokens.map(token => ({
        token,
        notification: {
          title: "Appointment Completed",
          body: `Congratulations ${patient.name}, your appointment has been successfully completed!`,
        },
        data: {
          appointmentId: appointmentId.toString(),
          type: "appointment_complete",
          doctorId: doctorId.toString(),
          doctorName: doctor.doctorName,
        }
      }));
      console.log("messages", messages);

      try {
        console.log("📬 Sending appointment reminder:", patient._id);
        await Promise.all(
          messages.map(msg => admin.messaging().send(msg))
        );
        console.log(`✅ Appointment reminder sent to Patient ${patient._id}`);
      } catch (err) {
        console.error(" Error sending notification:", err.message);
      }
    }
  }

  //notification for auto checkin to patient
   const autoCheckin = async (patientId) => {
    const patient = await Patient.findById( patientId );
 
    
    const title = "Auto Check-in Alert";


const body = `You have been automatically checked in for your appointment. Please proceed to the waiting area.`;

 // const body = `Your appointment with ${doctor.doctorName} is confirmed for Today at ${appointment.startTime} at ${doctor.clinicName}, ${doctor.location}.`;
    console.log("notification to be sent..", body);
    if(patient.deviceTokens && patient.deviceTokens.length > 0) {
      const messages = patient.deviceTokens.map(token => ({
        token,
        notification: {
          title,
          body,
        },
        data: {
          type: "check_in_auto",
        }
      }));
      console.log("messages", messages);

      try {
        console.log("📬 Sending appointment reminder:", patient._id);
          await Promise.all(
          messages.map(async (msg) => {
            try {
              await admin.messaging().send(msg);
              console.log(`✅ Notification sent to token: ${msg.token}`);
            } catch (err) {
              if (err.code === "messaging/registration-token-not-registered") {
                console.warn(`⚠️ Invalid token detected, removing: ${msg.token}`);
                await Patient.findByIdAndUpdate(patientId, {
                  $pull: { deviceTokens: msg.token } // remove the bad token
                });
              } else {
                console.error("❌ Error sending to token:", msg.token, err.message);
              }
            }
          })
        );
        
        console.log(`✅ Auto checkinn notification sent to Patient ${patient._id}`);
       

        try {
    await Patient.findByIdAndUpdate(patientId, {
      $push: {
        notificationsForToday: {
          title,
          body,
        }
      }
    });
    console.log(`📝 Notification logged in DB for patient ${patientId}`);
  } catch (err) {
    console.error("❌ Error saving notification to DB:", err.message);
  }
      } catch (err) {
        console.error(" Error sending notification:", err.message);
        console.error(" Error sending notification 2:", err);
      }
    }
  }

  //notification to patient when appointment is confirmed
  const notifyPatient = async (patientId, appointmentId, doctorId) => {
    const patient = await Patient.findById( patientId );
    const doctor = await Doctor.findById(doctorId);
    const appointment = await Appointment.findById(appointmentId);

    console.log("appointment..", appointmentId);
    
    const title = "Appointment Confirmed";

    // Build location part flexibly
let locationParts = [];
if (doctor.clinicName) locationParts.push(doctor.clinicName);
if (doctor.location) locationParts.push(doctor.location);

const locationPart = locationParts.length ? ` at ${locationParts.join(", ")}` : "";

const body = `Your appointment with ${doctor.doctorName} is confirmed for Today at ${appointment.startTime}${locationPart}.`;

 // const body = `Your appointment with ${doctor.doctorName} is confirmed for Today at ${appointment.startTime} at ${doctor.clinicName}, ${doctor.location}.`;
    console.log("notification to be sent..", body);
    if(patient.deviceTokens && patient.deviceTokens.length > 0) {
      const messages = patient.deviceTokens.map(token => ({
        token,
        notification: {
          title,
          body,
        },
        data: {
          appointmentId: appointmentId.toString(),
          type: "appointment_complete",
          doctorId: doctorId.toString(),
          doctorName: doctor.doctorName,
        }
      }));
      console.log("messages", messages);

      try {
        console.log("📬 Sending appointment reminder:", patient._id);
          await Promise.all(
          messages.map(async (msg) => {
            try {
              await admin.messaging().send(msg);
              console.log(`✅ Notification sent to token: ${msg.token}`);
            } catch (err) {
              if (err.code === "messaging/registration-token-not-registered") {
                console.warn(`⚠️ Invalid token detected, removing: ${msg.token}`);
                await Patient.findByIdAndUpdate(patientId, {
                  $pull: { deviceTokens: msg.token } // remove the bad token
                });
              } else {
                console.error("❌ Error sending to token:", msg.token, err.message);
              }
            }
          })
        );
        
        console.log(`✅ Appointment reminder sent to Patient ${patient._id}`);
       

        try {
    await Patient.findByIdAndUpdate(patientId, {
      $push: {
        notificationsForToday: {
          title,
          body,
        }
      }
    });
    console.log(`📝 Notification logged in DB for patient ${patientId}`);
  } catch (err) {
    console.error("❌ Error saving notification to DB:", err.message);
  }
      } catch (err) {
        console.error(" Error sending notification:", err.message);
        console.error(" Error sending notification 2:", err);
      }
    }
  }


  //notify patient for ccheckin prompt
  const checkInPatient = async (patientId, appointmentId, doctorId) => {
    const patient = await Patient.findById( patientId );
    const doctor = await Doctor.findById(doctorId);
    const appointment = await Appointment.findById(appointmentId);

    console.log("appointment..", appointmentId);
    
    const title = "You're Near the Clinic";

    // Build location part flexibly
let locationParts = [];
if (doctor.clinicName) locationParts.push(doctor.clinicName);
if (doctor.location) locationParts.push(doctor.location);

const locationPart = locationParts.length ? ` at ${locationParts.join(", ")}` : "";

const body = `You’re close to your clinic. Tap to check in.`;

 // const body = `Your appointment with ${doctor.doctorName} is confirmed for Today at ${appointment.startTime} at ${doctor.clinicName}, ${doctor.location}.`;
    console.log("notification to be sent..", body);
    if(patient.deviceTokens && patient.deviceTokens.length > 0) {
      const messages = patient.deviceTokens.map(token => ({
        token,
        notification: {
          title,
          body,
        },
        data: {
          appointmentId: appointmentId.toString(),
          type: "check_in_prompt",
          doctorId: doctorId.toString(),
          doctorName: doctor.doctorName,
        }
      }));
      console.log("messages", messages);

      try {
        console.log("📬 Sending checkin reminder:", patient._id);
          await Promise.all(
          messages.map(async (msg) => {
            try {
              await admin.messaging().send(msg);
              console.log(`✅ Notification sent to token: ${msg.token}`);
            } catch (err) {
              if (err.code === "messaging/registration-token-not-registered") {
                console.warn(`⚠️ Invalid token detected, removing: ${msg.token}`);
                await Patient.findByIdAndUpdate(patientId, {
                  $pull: { deviceTokens: msg.token } // remove the bad token
                });
              } else {
                console.error("❌ Error sending to token:", msg.token, err.message);
              }
            }
          })
        );
        
        console.log(`✅ checkin reminder sent to Patient ${patient._id}`);
       

        try {
    await Patient.findByIdAndUpdate(patientId, {
      $push: {
        notificationsForToday: {
          title,
          body,
        }
      }
    });
    console.log(`📝 Notification logged in DB for patient ${patientId}`);
  } catch (err) {
    console.error("❌ Error saving notification to DB:", err.message);
  }
      } catch (err) {
        console.error(" Error sending notification:", err.message);
        console.error(" Error sending notification 2:", err);
      }
    }
  }

  
    const upcomingAppointment = async (patientId) => {
    const patient = await Patient.findById( patientId );
    if(patient.deviceTokens && patient.deviceTokens.length > 0) {
      const messages = patient.deviceTokens.map(token => ({
        token,
        notification: {
          title: "Next Turn is yours",
          body: `It's your turn ${patient.name}, doctor is waiting for you!`,
        }
      }));

      try {
        console.log("📬 Sending appointment reminder:", patient._id);
        await Promise.all(
          messages.map(msg => admin.messaging().send(msg))
        );
        console.log(`✅ Appointment reminder sent to Patient ${patient._id}`);
      } catch (err) {
        console.error(" Error sending notification:", err.message);
      }
    }
  }

  //function to send notification to patient 15 mins before appointment with distance
   const calculateTimeAndNotify = async (patientId) => {
  const patient = await Patient.findById(patientId);

  if (!patient) return;

  //if (!patient.voiceAlert || !patient.voiceAlert.isSelected) return;

  const nowIST = moment().tz("Asia/Kolkata");


  const startOfDay = nowIST.clone().startOf("day");
  const endOfDay = nowIST.clone().endOf("day");

  // Fetch today's pending appointments
  const appointments = await Appointment.find({
    patientId,
    appointmentDate: { $gte: startOfDay.toDate(), $lte: endOfDay.toDate() },
    status: "Pending",
  }).sort({ startTime: 1 });


  if (!appointments.length) return;

  for (const app of appointments) {
    const appointmentDate = moment(app.appointmentDate).tz("Asia/Kolkata").format("YYYY-MM-DD");
    const fullDateTimeStr = `${appointmentDate} ${app.startTime}`;
    const appointmentMoment = moment.tz(fullDateTimeStr, "YYYY-MM-DD h:mm A", "Asia/Kolkata");

    const notifyAt = appointmentMoment.clone().subtract(15, "minutes");

    const doctor = await Doctor.findById(app.doctorId);
            const location = patient.location;
            const lat = location?.lat;
            const long = location?.long;
                    const patientLocation =  { lat, long };
                    
                    const coordinates = doctor.coordinates;
                    const doctorLat = coordinates?.lat;
                    const doctorLng = coordinates?.long;
                            
                    const doctorLocation = { lat: doctorLat, long: doctorLng };
                    const distanceData = await GoogleMaps.getDistanceAndTime(patientLocation, doctorLocation);
                    console.log("distance Data", distanceData);
                    const drivingInfo = distanceData.driving.durationText;
                    console.log("driving info..", drivingInfo);
                   // console.log("driving info in km", drivingInfo.distanceInKm);
    

    

    if (nowIST.isSame(notifyAt, "minute")) {
      console.log(`🔔 Sending alert for appointment at ${app.startTime}`);
      const title= `15 Mins Left - You're ${drivingInfo} Away`;
      // Build location part flexibly
let locationParts = [];
if (doctor.clinicName) locationParts.push(doctor.clinicName);

const locationPart = locationParts.length ? `${locationParts.join(", ")}` : "";

//const body = `Your appointment with ${doctor.doctorName} is confirmed for Today at ${appointment.startTime}${locationPart}.`;

      const body = `Your appointment with ${doctor.doctorName} is in 15 minutes. You're just ${drivingInfo} away from ${locationPart}.`;
      // ✅ Send voice alert logic here (if any)

      // ✅ Push Notification
      if (patient.deviceTokens && patient.deviceTokens.length > 0) {
        const messages = patient.deviceTokens.map(token => ({
          token,
          notification: {
            title,
            body,
          },
          data: {
            appointmentId: app._id.toString(),
            startTime: app.startTime,
          }
        }));

        try {
          console.log("📬 Sending appointment reminder:", patient._id);
          await Promise.all(messages.map(msg => admin.messaging().send(msg)));
          console.log(`✅ Appointment reminder sent to Patient ${patient._id}`);

         try {
    await Patient.findByIdAndUpdate(patientId, {
      $push: {
        notificationsForToday: {
          title,
          body,
        }
      }
    });
    console.log(`📝 Notification logged in DB for patient ${patientId}`);
  } catch (err) {
    console.error("❌ Error saving notification to DB:", err.message);
  }
        } catch (err) {
          console.error("❌ Error sending notification:", err.message);
        }
      }
    }
  }
};
  
  const voiceAlertNotify = async (patientId) => {
  const patient = await Patient.findById(patientId);

  if (!patient) return;

  if (!patient.voiceAlert || !patient.voiceAlert.isSelected) return;

  const nowIST = moment().tz("Asia/Kolkata");


  const startOfDay = nowIST.clone().startOf("day");
  const endOfDay = nowIST.clone().endOf("day");

  // Fetch today's pending appointments
  const appointments = await Appointment.find({
    patientId,
    appointmentDate: { $gte: startOfDay.toDate(), $lte: endOfDay.toDate() },
    status: "Pending",
  }).sort({ startTime: 1 });


  if (!appointments.length) return;

  for (const app of appointments) {
    const appointmentDate = moment(app.appointmentDate).tz("Asia/Kolkata").format("YYYY-MM-DD");
    const fullDateTimeStr = `${appointmentDate} ${app.startTime}`;
    const appointmentMoment = moment.tz(fullDateTimeStr, "YYYY-MM-DD h:mm A", "Asia/Kolkata");

    const notifyAt = appointmentMoment.clone().subtract(10, "minutes");

    if (nowIST.isSame(notifyAt, "minute")) {
      console.log(`🔔 Sending alert for appointment at ${app.startTime}`);

      // ✅ Send voice alert logic here (if any)

      // ✅ Push Notification
      if (patient.deviceTokens && patient.deviceTokens.length > 0) {
        const messages = patient.deviceTokens.map(token => ({
          token,
          notification: {
            title: "Upcoming Appointment",
            body: `Hello ${patient.name}, you are having appointment in 10 mins!`,
          },
          data: {
            appointmentId: app._id.toString(),
            startTime: app.startTime,
          }
        }));

        try {
          console.log("📬 Sending appointment reminder:", patient._id);
          await Promise.all(messages.map(msg => admin.messaging().send(msg)));
          console.log(`✅ Appointment reminder sent to Patient ${patient._id}`);
        } catch (err) {
          console.error("❌ Error sending notification:", err.message);
        }
      }
    }
  }
};



async function notifyFirstPatientArrival(doctor) {

  const todayIST = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
  const currentTime = moment().tz("Asia/Kolkata");
  const shiftCutoff = moment().tz("Asia/Kolkata").set({ hour: 15, minute: 30, second: 0, millisecond: 0 });

  const shift = currentTime.isBefore(shiftCutoff) ? "morning" : "evening";
  console.log(" Checking 90% full for shift:", shift);

  
  const settings = await NotificationSettings.findOne({ doctorId: doctor._id });
  if (!settings || !settings.notifyFirstPatientArrival?.isSelected) return;

  if (settings.notifyFirstPatientArrival.lastNotifiedDate?.[shift] === todayIST) return;



    // Fetch today's appointments in IST timezone

    const startOfDay = moment().tz("Asia/Kolkata").startOf("day");
    const endOfDay = moment(startOfDay).add(1, "day");
    const appointments = await Appointment.find({
        doctorId: doctor._id,
        appointmentDate: { $gte: startOfDay.toDate(), $lt: endOfDay.toDate() },
        checkIn: true,
    }).sort({ startTime: 1 });

    console.log("today,,,", today);
    console.log("tomorrow", tomorrow);
   // console.log("appointments", appointments);

    const shiftAppointments = appointments.filter(app => {
      const appointmentDate = moment(app.appointmentDate).tz("Asia/Kolkata").format("YYYY-MM-DD");
      const fullStart = moment.tz(`${appointmentDate} ${app.startTime}`, "YYYY-MM-DD h:mm A", "Asia/Kolkata");
      
      return shift === "morning"
        ? fullStart.isBefore(shiftCutoff)
        : fullStart.isSameOrAfter(shiftCutoff);
  });
    if (shiftAppointments.length === 0) return;

    const firstCheckedIn = shiftAppointments[0];

    const nowIST = moment().tz("Asia/Kolkata");

    const appointmentDate = moment(firstCheckedIn.appointmentDate).tz("Asia/Kolkata").format("YYYY-MM-DD");
    const fullDateTimeStr = `${appointmentDate} ${firstCheckedIn.startTime}`;

    // Create a valid Moment object with date + time in IST
    const notifyAt = moment.tz(fullDateTimeStr, "YYYY-MM-DD h:mm A", "Asia/Kolkata").subtract(15, "minutes");
    console.log("nowist", nowIST);
    console.log("notifyAt", notifyAt);
    if (!nowIST.isSame(notifyAt, "minute")) return;

  // Send notification

        if (doctor.deviceTokens && doctor.deviceTokens.length > 0) {
            const messages = doctor.deviceTokens.map(token => ({
                token,
                notification: {
                title: "First Appointment Alert",
                body: `Your first appointment today is scheduled at ${firstCheckedIn.startTime}.`,
            },
        }));

        try {
        console.log("📬 Sending first appointment reminder:", doctor._id);
        await Promise.all(
            messages.map(msg => admin.messaging().send(msg))
        );
        console.log(`✅ First appointment notification sent to Doctor ${doctor._id}`);
        //notifiedFirstAppointments.add(key); // Cache to avoid duplicates
        } catch (err) {
        console.error(" Error sending notification:", err.message);
        }
      // Mark as notified for today
    await NotificationSettings.updateOne(
        { doctorId: doctor._id },
        { $set: { [`notifyFirstPatientArrival.lastNotifiedDate.${shift}`]: todayIST } }
    );
    }
}

async function notifyOnePatientRemaining(doctor) {
    const todayIST = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
    const currentTime = moment().tz("Asia/Kolkata");
    const shiftCutoff = moment().tz("Asia/Kolkata").set({ hour: 15, minute: 0, second: 0, millisecond: 0 });

    const shift = currentTime.isBefore(shiftCutoff) ? "morning" : "evening";
    console.log("shift...", shift);

    const settings = await NotificationSettings.findOne({ doctorId: doctor._id });
    if (!settings || !settings.notifyOnePatientRemaining.isSelected) return;
  
    if (settings.notifyOnePatientRemaining.lastNotified?.[shift] === todayIST) return;
  
    const startOfDay = moment().tz("Asia/Kolkata").startOf("day");
    const endOfDay = moment(startOfDay).add(1, "day");
  
    // Get all today's appointments
    const appointments = await Appointment.find({
      doctorId: doctor._id,
      appointmentDate: { $gte: startOfDay.toDate(), $lt: endOfDay.toDate() }
    }).sort({ startTime: 1 });
    

    console.log("appointments in last appointment function", appointments);
    // Get only appointments of the current shift
    const shiftAppointments = appointments.filter(app => {
        const appointmentDate = moment(app.appointmentDate).tz("Asia/Kolkata").format("YYYY-MM-DD");
        const fullStart = moment.tz(`${appointmentDate} ${app.startTime}`, "YYYY-MM-DD h:mm A", "Asia/Kolkata");
        
        return shift === "morning"
          ? fullStart.isBefore(shiftCutoff)
          : fullStart.isSameOrAfter(shiftCutoff);
    });
    //console.log(" shift appointments in last appointment function", shiftAppointments);
    
    if (shiftAppointments.length < 2) return; // Not enough appointments to trigger
  
    const checkedIn = shiftAppointments.filter(app => app.checkIn);
    if (checkedIn.length !== shiftAppointments.length - 1) return;
    
    // Trigger notification
    if (doctor.deviceTokens && doctor.deviceTokens.length > 0) {
        const messages = doctor.deviceTokens.map(token => ({
          token,
           notification: {
            title: "Almost Done!",
            body: "You have one more patient remaining for the shift."
            }
        }));
    try {
      console.log("📬 Sending one-patient-remaining alert:", doctor._id);
      await Promise.all(
        messages.map(msg => admin.messaging().send(msg))
    );
      // Update notification settings
      await NotificationSettings.updateOne(
        { doctorId: doctor._id },
        { $set: { [`notifyOnePatientRemaining.lastNotified.${shift}`]: todayIST } }
      );
  
      console.log(` One patient remaining notification sent to Doctor ${doctor._id}`);
    } catch (err) {
      console.error(" Error sending notification:", err.message);
    }
  }
}


async function notifyShiftNearlyFull(doctor) {
    const todayIST = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
    const currentTime = moment().tz("Asia/Kolkata");
    const shiftCutoff = moment().tz("Asia/Kolkata").set({ hour: 15, minute: 30, second: 0, millisecond: 0 });

    const shift = currentTime.isBefore(shiftCutoff) ? "morning" : "evening";
    console.log("🔍 Checking 90% full for shift:", shift);
  
    
    const settings = await NotificationSettings.findOne({ doctorId: doctor._id });
    if (!settings || !settings.notifyShiftNinetyPercentFull?.isSelected) return;
  
    if (settings.notifyShiftNinetyPercentFull.lastNotified?.[shift] === todayIST) return;
  
    //  Get availability data
    const schedule = await DoctorService.getAvailability(doctor._id);
    const sessionKey = shift === "morning" ? "morningSession" : "eveningSession";
    const session = schedule?.[sessionKey];
  
    if (!session?.enabled) return;
  
    const durationInMinutes = parseInt(schedule.appointmentDuration.split(" ")[0]); // assuming "10 Minutes"
    const start = moment(session.start, "hh:mm A");
    const end = moment(session.end, "hh:mm A");
  
    const totalSlots = Math.floor(moment.duration(end.diff(start)).asMinutes() / durationInMinutes);
    if (totalSlots <= 0) return;
  
    //  Get today's appointments for this doctor and filter by shift
    const startOfDay = moment().tz("Asia/Kolkata").startOf("day");
    const endOfDay = moment(startOfDay).add(1, "day");
  
    const appointments = await Appointment.find({
      doctorId: doctor._id,
      appointmentDate: { $gte: startOfDay.toDate(), $lt: endOfDay.toDate() }
    });
  
    const shiftAppointments = appointments.filter(app => {
        const appointmentDate = moment(app.appointmentDate).tz("Asia/Kolkata").format("YYYY-MM-DD");
        const fullStart = moment.tz(`${appointmentDate} ${app.startTime}`, "YYYY-MM-DD h:mm A", "Asia/Kolkata");
        
        return shift === "morning"
          ? fullStart.isBefore(shiftCutoff)
          : fullStart.isSameOrAfter(shiftCutoff);
    });
  
    const booked = shiftAppointments.filter(app => app.patientId).length;
    const bookedPercent = (booked / totalSlots) * 100;
  
    console.log(` ${booked}/${totalSlots} slots booked (${bookedPercent.toFixed(2)}%)`);
  
    if (bookedPercent >= 90) {
    // Send notification
    if (doctor.deviceTokens && doctor.deviceTokens.length > 0) {
        const messages = doctor.deviceTokens.map(token => ({
          token,
            notification: {
          title: "Almost Full!",
          body: "Your shift is now 90% booked with patients."
        }
        }));
      try {
        console.log("📬 Sending 90% full alert:", doctor._id);
        await Promise.all(
            messages.map(msg => admin.messaging().send(msg))
        );
  
        await NotificationSettings.updateOne(
          { doctorId: doctor._id },
          { $set: { [`notifyShiftNinetyPercentFull.lastNotified.${shift}`]: todayIST } }
        );
  
        console.log(` 90% full notification sent to Doctor ${doctor._id}`);
      } catch (err) {
        console.error(" Error sending notification:", err.message);
      }
    }
  }
}

  async function notifyShiftFull(doctor) {
    const todayIST = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
    const currentTime = moment().tz("Asia/Kolkata");
    const shiftCutoff = moment().tz("Asia/Kolkata").set({ hour: 15, minute: 30, second: 0, millisecond: 0 });

    const shift = currentTime.isBefore(shiftCutoff) ? "morning" : "evening";
    console.log("🔍 Checking 100% full for shift:", shift);
  
    
    const settings = await NotificationSettings.findOne({ doctorId: doctor._id });
    if (!settings || !settings.notifyFullyBooked?.isSelected) return;
  
    if (settings.notifyFullyBooked.lastNotified?.[shift] === todayIST) return;
  
    //  Get availability data
    const schedule = await DoctorService.getAvailability(doctor._id);
    const sessionKey = shift === "morning" ? "morningSession" : "eveningSession";
    const session = schedule?.[sessionKey];
  
    if (!session?.enabled) return;
  
    const durationInMinutes = parseInt(schedule.appointmentDuration.split(" ")[0]); // assuming "10 Minutes"
    const start = moment(session.start, "hh:mm A");
    const end = moment(session.end, "hh:mm A");
  
    const totalSlots = Math.floor(moment.duration(end.diff(start)).asMinutes() / durationInMinutes);
    if (totalSlots <= 0) return;
  
    //  Get today's appointments for this doctor and filter by shift
    const startOfDay = moment().tz("Asia/Kolkata").startOf("day");
    const endOfDay = moment(startOfDay).add(1, "day");
  
    const appointments = await Appointment.find({
      doctorId: doctor._id,
      appointmentDate: { $gte: startOfDay.toDate(), $lt: endOfDay.toDate() }
    });
  
    const shiftAppointments = appointments.filter(app => {
        const appointmentDate = moment(app.appointmentDate).tz("Asia/Kolkata").format("YYYY-MM-DD");
        const fullStart = moment.tz(`${appointmentDate} ${app.startTime}`, "YYYY-MM-DD h:mm A", "Asia/Kolkata");
        
        return shift === "morning"
          ? fullStart.isBefore(shiftCutoff)
          : fullStart.isSameOrAfter(shiftCutoff);
    });
  
    const booked = shiftAppointments.filter(app => app.patientId).length;
    const bookedPercent = (booked / totalSlots) * 100;
  
    console.log(`📊 ${booked}/${totalSlots} slots booked (${bookedPercent.toFixed(2)}%)`);
  
    if (bookedPercent == 100) {
        if (doctor.deviceTokens && doctor.deviceTokens.length > 0) {
            const messages = doctor.deviceTokens.map(token => ({
              token,
              notification: {
                title: "Completely Full!",
                body: "Your shift is now 100% booked with patients."
              }
            }));
  
      try {
        console.log("📬 Sending 100% full alert:", doctor._id);
        
            await Promise.all(
                messages.map(msg => admin.messaging().send(msg))
            );
        await NotificationSettings.updateOne(
          { doctorId: doctor._id },
          { $set: { [`notifyFullyBooked.lastNotified.${shift}`]: todayIST } }
        );
  
        console.log(` 100% full notification sent to Doctor ${doctor._id}`);
      } catch (err) {
        console.error(" Error sending notification:", err.message);
      }
    }
  }
  }

  async function notifyDoctorOfPatientBookings(doctor) {
  const todayIST = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");

  // Fetch Notification settings for the doctor
  const settings = await NotificationSettings.findOne({ doctorId: doctor._id });
 // console.log("settings..", settings);
  //if (!settings || !settings.notifiedPatientAppointments?.isSelected) return;

  // Fetch today's appointments with status 'Pending' and createdBy 'Patient'
  const startOfDay = moment().tz("Asia/Kolkata").startOf("day");
  const endOfDay = moment(startOfDay).add(1, "day");

  const appointments = await Appointment.find({
    doctorId: doctor._id,
    appointmentDate: { $gte: startOfDay.toDate(), $lt: endOfDay.toDate() },
    status: "Pending",
    createdBy: "Patient",
  }).sort({ startTime: 1 });

  console.log("appointments..", appointments);
  if (!appointments.length) return;

  // Filter out appointments that were already notified
  const newAppointments = appointments.filter(
    app => !settings.notifiedPatientAppointments.includes(app._id)
  );

   // console.log("new Appointmnet", newAppointments);

  if (!newAppointments.length) return; // no new patient bookings to notify

  // Prepare notifications
 // const messages = [];
  for (const appointment of newAppointments) {
    if (doctor.deviceTokens && doctor.deviceTokens.length > 0) {
      const messageBody = `${appointment.patientName} has booked an appointment with you at ${appointment.startTime}.`;

      const messages = doctor.deviceTokens.map(token => ({
              token,
              notification: {
                title: "New Appointment Alert!",
                body: messageBody
              }
            }));

       // Send notifications
  try {
    console.log("📬 Sending new booking alert:", doctor._id);
        
            // await Promise.all(
            //     messages.map(msg => admin.messaging().send(msg))
            // );
             await Promise.all(
                messages.map(msg => admin.messaging().send(msg))
            );
            console.log("Sending message", messages);

    // Update notifiedPatientAppointments with new appointment IDs
    const updatedNotifiedAppointments = [
      ...settings.notifiedPatientAppointments,
      ...newAppointments.map(app => app._id),
    ];
    console.log("updated appointment", updatedNotifiedAppointments);

    await NotificationSettings.updateOne(
      { doctorId: doctor._id },
      { $set: { notifiedPatientAppointments: updatedNotifiedAppointments } }
    );

    console.log(`✅ Sent notifications for ${newAppointments.length} new patient bookings for doctor ${doctor._id}`);

  } catch (err) {
    console.error("Error sending patient booking notifications:", err.message);
  }
    }
  }

 
}

// Function to clear notifications for all patients
async function clearAllPatientsNotifications() {
  try {
    await Patient.updateMany({}, { $set: { notificationsForToday: [] } });
    console.log(`[${new Date().toISOString()}] Cleared notificationsForToday for all patients`);
  } catch (error) {
    console.error("Error clearing notifications in cron job:", error.message);
  }
}
  
// This function will be called from server.js or cron scheduler
const appNotifier = async () => {
  try {
    const doctors = await Doctor.find({});
    for (const doctor of doctors) {
     await notifyFirstPatientArrival(doctor);
     await notifyOnePatientRemaining(doctor);
     await notifyShiftNearlyFull(doctor); 
     await notifyShiftFull(doctor); 
     await notifyDoctorOfPatientBookings(doctor)
    }

    console.log(" Notification check complete.");
  } catch (err) {
    console.error(" Notifier failed:", err.message);
  }
};

const patientNotifier = async () => {
  console.log("Starting patient notification check...");
  try{
    const patients = await Patient.find({});
    //console.log("Found patients:", patients.length);
     await Promise.all(
    patients.map(patient => voiceAlertNotify(patient._id))
  );
   await Promise.all(
    patients.map(patient => calculateTimeAndNotify(patient._id))
  );
    console.log("Patient notification check complete.");
  } catch (err) {
    console.error(" Notifier failed:", err.message);
  }
};

async function resetAllDoctorSlots() {
  try {
    const result = await DoctorSchedule.updateMany(
      {},
      {
        $set: {
          "dailySlots.$[].isBooked": false,
          "dailySlots.$[].isLocked": false,
          "dailySlots.$[].lockedAt": null,
          "dailySlots.$[].lockExpiresAt": null
        }
      }
    );

    console.log(
      `[${new Date().toISOString()}] Reset slots for ${result.modifiedCount} doctor schedules`
    );
  } catch (error) {
    console.error("Error resetting doctor slots:", error.message);
  }
}

async function resetAllDoctorAppointmentHistory() {
  try {
    const result = await DoctorSchedule.updateMany(
      {},
      { $set: { affectedAppointmentsDuringBreak: [] } } // 🧹 Clear the array
    );

    console.log(
      `[${new Date().toISOString()}] Cleared affected apppointments for all doctorrs for break for ${result.modifiedCount} doctor schedules`
    );
  } catch (error) {
    console.error("Error clearing doctor appointment history:", error.message);
  }
}

async function resetAllDoctorBreakHistory() {
  try {
    const result = await DoctorSchedule.updateMany(
      {},
      { $set: { appointmentHistory: [] } } // 🧹 Clear the array
    );

    console.log(
      `[${new Date().toISOString()}] Cleared appointment history for ${result.modifiedCount} doctor schedules`
    );
  } catch (error) {
    console.error("Error clearing doctor appointment history:", error.message);
  }
}

module.exports = {
  appNotifier,
  patientNotifier,
  sendNotification,
  notifyPatient,
  upcomingAppointment,
  clearAllPatientsNotifications,
  resetAllDoctorSlots,
  checkInPatient,
  resetAllDoctorAppointmentHistory,
  resetAllDoctorBreakHistory,
  autoCheckin
};