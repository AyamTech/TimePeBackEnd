const razorpay = require('../config/razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');
const TransactionHistory = require('../models/transactionhistory');
const querystring = require('querystring');
const Appointment = require('../models/AppointmentsModel');
const DoctorSchedule = require('../models/doctorSchedule');
const Doctor = require('../models/doctorModel');
const GoogleMaps = require("../utils/googlemaps/googlemaps");
const DoctorService = require("./doctorService");
const { DateTime } = require('luxon');
const Patient = require("../models/patientModel");
const PatientService = require("./PatientService");
const Invoice = require("../models/invoice.model");

const {isPaymentEnabled} = require("../utils/paymentToggle");
// Constantsv
const PAYMENT_TIMEOUT_MINUTES = 5;
const CRITICAL_CLEANUP_THRESHOLD_MINUTES = 1;
const SLOT_LOCK_TIMEOUT_MINUTES = 7;

// ✅ FIXED: Time normalization function
const normalizeTimeFormat = (timeString) => {
  // Convert time string to consistent format (remove leading zeros)
  return timeString.replace(/^0(\d)/, '$1');
};

// ✅ FIXED: Enhanced slot locking functions
// ✅ FIXED: Enhanced slot locking functions
// const lockSlotInDB = async (doctorId, startTime, endTime, session) => {
//   try {
//     // Normalize time formats
//     const normalizedStartTime = startTime;
//     const normalizedEndTime = endTime;
    
//     console.log("Normalized times:", { normalizedStartTime, normalizedEndTime });
    
//     // First, check if slot exists and get its current state
//     const schedule = await DoctorSchedule.findOne(
//       { 
//         doctorId,
//         "dailySlots.start": normalizedStartTime,
//         "dailySlots.end": normalizedEndTime
//       },
//       { "dailySlots.$": 1 }
//     ).session(session);
    
//     console.log("schedule in lockSlotInDB", schedule);

//     if (!schedule || !schedule.dailySlots || schedule.dailySlots.length === 0) {
//       console.log("Slot not found in schedule");
//       return false; // Slot not found
//     }

//     const slot = schedule.dailySlots[0];
//     console.log("slot in lockSlotInDB", slot);
    
//     // Check if already locked or booked
//     if (slot.isLocked || slot.isBooked) {
//       // Check if lock has expired
//       if (slot.isLocked && slot.lockExpiresAt && new Date() > slot.lockExpiresAt) {
//         console.log("Lock expired, attempting to unlock and relock");
//         // Lock expired, try to unlock and lock again
//         await unlockSlotInDB(doctorId, normalizedStartTime, normalizedEndTime, session);
//       } else {
//         console.log("Slot is currently locked or booked");
//         return false; // Still locked or booked
//       }
//     }

//     // Now try to lock the slot
//    const result = await DoctorSchedule.updateOne(
//   { doctorId },
//   {
//     $set: {
//       "dailySlots.$[slot].isLocked": true,
//       "dailySlots.$[slot].lockedAt": new Date(),
//       "dailySlots.$[slot].lockExpiresAt": new Date(Date.now() + SLOT_LOCK_TIMEOUT_MINUTES * 60 * 1000)
//     }
//   },
//   {
//     arrayFilters: [
//       {
//         "slot.start": normalizedStartTime,
//         "slot.end": normalizedEndTime,
//         "slot.isLocked": { $ne: true },
//         "slot.isBooked": { $ne: true }
//       }
//     ],
//     session
//   }
// );


//     console.log("Result of lock attempt:", result);
    
//     console.log("Lock attempt result:", { modifiedCount: result.modifiedCount });
//     return result.modifiedCount > 0;
//   } catch (error) {
//     console.error('Error locking slot in DB:', error);
//     return false;
//   }
// };

const lockSlotInDB = async (doctorId, startTime, endTime, session) => {
  try {
    const normalizedStartTime = startTime;
    const normalizedEndTime = endTime;

    // 1️⃣ Check slot existence + current state
    const schedule = await DoctorSchedule.findOne(
      {
        doctorId,
        dailySlots: {
          $elemMatch: {
            start: normalizedStartTime,
            end: normalizedEndTime
          }
        }
      },
      { "dailySlots.$": 1 }
    ).session(session);

    if (!schedule || !schedule.dailySlots?.length) {
      return false; // Slot not found
    }

    const slot = schedule.dailySlots[0];

    // 2️⃣ Handle existing lock
    if (slot.isLocked || slot.isBooked) {
      if (
        slot.isLocked &&
        slot.lockExpiresAt &&
        new Date() > slot.lockExpiresAt
      ) {
        // expired → unlock and continue
        await unlockSlotInDB(
          doctorId,
          normalizedStartTime,
          normalizedEndTime,
          session
        );
      } else {
        return false; // still locked or booked
      }
    }

    // 3️⃣ Atomic lock attempt
    const result = await DoctorSchedule.updateOne(
      { doctorId },
      {
        $set: {
          "dailySlots.$[slot].isLocked": true,
          "dailySlots.$[slot].lockedAt": new Date(),
          "dailySlots.$[slot].lockExpiresAt": new Date(
            Date.now() + SLOT_LOCK_TIMEOUT_MINUTES * 60 * 1000
          )
        }
      },
      {
        arrayFilters: [
          {
            "slot.start": normalizedStartTime,
            "slot.end": normalizedEndTime,
            "slot.isLocked": { $ne: true },
            "slot.isBooked": { $ne: true }
          }
        ],
        session
      }
    );
    console.log("Result of lock attempt:", result);
    return result.modifiedCount > 0;
    console.log("Lock attempt result:", { modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error("Error locking slot in DB:", error);
    return false;
  }
};


// const unlockSlotInDB = async (doctorId, startTime, endTime, session) => {
//   try {
//     // Normalize time formats
//     const normalizedStartTime = normalizeTimeFormat(startTime);
//     const normalizedEndTime = normalizeTimeFormat(endTime);
    
//     const result = await DoctorSchedule.updateOne(
//       { 
//         doctorId,
//         "dailySlots.start": normalizedStartTime,
//         "dailySlots.end": normalizedEndTime
//       },
//       {
//         $unset: {
//           "dailySlots.$.isLocked": "",
//           "dailySlots.$.lockedAt": "",
//           "dailySlots.$.lockExpiresAt": ""
//         }
//       },
//       { session }
//     );
    
//     return result.modifiedCount > 0;
//   } catch (error) {
//     console.error('Error unlocking slot in DB:', error);
//     return false;
//   }
// };

const unlockSlotInDB = async (doctorId, startTime, endTime, session) => {
  try {
    const normalizedStartTime = normalizeTimeFormat(startTime);
    const normalizedEndTime = normalizeTimeFormat(endTime);

    const result = await DoctorSchedule.updateOne(
      { doctorId },
      {
        $unset: {
          "dailySlots.$[slot].isLocked": "",
          "dailySlots.$[slot].lockedAt": "",
          "dailySlots.$[slot].lockExpiresAt": ""
        }
      },
      {
        arrayFilters: [
          {
            "slot.start": normalizedStartTime,
            "slot.end": normalizedEndTime
          }
        ],
        session
      }
    );

    return result.modifiedCount > 0;
  } catch (error) {
    console.error("Error unlocking slot in DB:", error);
    return false;
  }
};

const isSlotLockedInDB = async (doctorId, startTime, endTime, session) => {
  try {
    // Normalize time formats
    const normalizedStartTime = normalizeTimeFormat(startTime);
    const normalizedEndTime = normalizeTimeFormat(endTime);
    
    const schedule = await DoctorSchedule.findOne(
      { 
        doctorId,
        "dailySlots.start": normalizedStartTime,
        "dailySlots.end": normalizedEndTime
      },
      { "dailySlots.$": 1 }
    ).session(session);
    
    if (!schedule || !schedule.dailySlots || schedule.dailySlots.length === 0) {
      return false;
    }
    
    const slot = schedule.dailySlots[0];
    
    // Return true if locked and not expired
    if (slot.isLocked) {
      if (slot.lockExpiresAt && new Date() > slot.lockExpiresAt) {
        return false; // Expired lock
      }
      return true; // Valid lock
    }
    
    return false;
  } catch (error) {
    console.error('Error checking slot lock in DB:', error);
    return false;
  }
};

// ✅ FIXED: Enhanced availability check with better logging
const checkSlotAvailability = async (doctorId, startTime, appointmentDate, session) => {
  // Normalize time format
  const normalizedStartTime = startTime;
  
  console.log("Checking availability for:", { doctorId, normalizedStartTime, appointmentDate });
  
  // Check for existing appointments
  const existingAppointment = await Appointment.findOne({
    doctorId,
    startTime: normalizedStartTime,
    appointmentDate,
    status: { $in: ['Processing', 'Pending', 'Confirmed', 'Active'] }
  }).session(session);
  
  if (existingAppointment) {
    console.log("Existing appointment found:", existingAppointment);
    return false;
  }
  
  // Check if slot is booked OR locked in doctor schedule
//   const schedule = await DoctorSchedule.findOne(
//     { 
//       doctorId,
//       "dailySlots.start": normalizedStartTime,
//       $or: [
//         { "dailySlots.isBooked": true },
//         { 
//           "dailySlots.isLocked": true,
//           "dailySlots.lockExpiresAt": { $gt: new Date() } // Only consider non-expired locks
//         }
//       ]
//     }
//   ).session(session);

//   console.log("Schedule check result:", schedule);
  
//  const isAvailable = !schedule ? true : false;

//   console.log("Slot availability check result:", { isAvailable, schedule: !schedule });
//   return isAvailable; // Available if no booked/locked slot found

const schedule = await DoctorSchedule.findOne(
  { 
    doctorId,
     dailySlots: {
      $elemMatch: {
        start: normalizedStartTime,
      }
    }
  },
  { "dailySlots.$": 1 } // project only the matching slot
).session(session);

if (!schedule) {
  console.log("No schedule found at all for this doctor");
  return false; // No schedule configured → unavailable
}

const slot = schedule.dailySlots[0]; // matched slot
const isAvailable = !slot.isBooked && (!slot.isLocked || slot.lockExpiresAt <= new Date());

console.log("Slot availability check result:", { isAvailable, slot });
return isAvailable;
};

// FIXED: Enhanced createOrder with better error handling and logging
const createOrder = async (appointmentData, session) => {
  const { doctorId, startTime, patientId } = appointmentData;
  console.log("appointmentData in createOrder", appointmentData);
  const appointmentDate = DateTime.now().toJSDate();
  
  // Get appointment duration to calculate end time
  const temp_schedule = await DoctorService.getAvailability(appointmentData.doctorId);
  const schedule = temp_schedule.schedule;
  console.log("Doctor schedule in createOrder", schedule);
  console.log("temp_schedule", temp_schedule);
  console.log("duration raw:", schedule.appointmentDuration);
const duration = parseInt(
  String(schedule.appointmentDuration || '').match(/\d+/)?.[0] || 0,
  10
);

  console.log("Appointment duration in minutes:", duration);
  
  //let startTimes = DateTime.fromFormat(appointmentData.startTime, "hh:mm a");
  
    
// ✅ Parse start time and attach today’s IST date explicitly
const nowIST = DateTime.now().setZone("Asia/Kolkata");
const todayIST = nowIST.startOf("day");

let startTimes = DateTime.fromFormat(appointmentData.startTime, "hh:mm a", { zone: "Asia/Kolkata" })
  .set({
    year: todayIST.year,
    month: todayIST.month,
    day: todayIST.day
  });

  let endTime = startTimes.plus({ minutes: duration });
  
console.log("Current IST time:", nowIST.toFormat("hh:mm a"));
console.log(" ist time:", nowIST);

console.log("Current IST time:", nowIST.toFormat("hh:mm a"));
console.log("Parsed start time:", startTimes.toFormat("hh:mm a"));

  let startTimess = appointmentData.startTime;
  let endTimess = endTime.toFormat("hh:mm a");
  let chackInStatus = false;
  
  if (appointmentData.scan) {
    const next = await PatientService.findNextSlot(appointmentData.doctorId);
    startTimess = next.start;
    endTimess = next.end;
    chackInStatus = true;
  }

  // Check if the start time is already passed or within next 2 minutes
  if(!appointmentData.scan){
    if (startTimes <= nowIST.plus({ minutes: 2 })) {
  console.log("Slot too close to current time or already passed");
  throw new Error("SLOT_TOO_CLOSE_TO_CURRENT_TIME");
}
  }

  
  //  ADDED: Normalize times before processing
  // startTimess = normalizeTimeFormat(startTimess);
  // endTimess = normalizeTimeFormat(endTimess);

  console.log("Final appointment times:", { startTimess, endTimess });
  
  //  ADDED: First check if the slot actually exists in the schedule
  const doctorSchedule = await DoctorSchedule.findOne(
  {
    doctorId,
    dailySlots: {
      $elemMatch: {
        start: startTimess,
        end: endTimess
      }
    }
  }
).session(session);

  console.log("doctorSchedule in createOrder", doctorSchedule);
  if (!doctorSchedule) {
    console.log("Slot does not exist in doctor's schedule");
    throw new Error('SLOT_NOT_AVAILABLE');
  }
  
  console.log("before first lock check");
  // 1. Check if slot is already locked by another user
  if (await isSlotLockedInDB(doctorId, startTimess, endTimess, session)) {
    console.log("Slot is temporarily locked");
    throw new Error('SLOT_TEMPORARILY_LOCKED');
  }
  
  console.log("after first lock check");
  console.log("before availability check");
  // 2. Check if slot is already booked
  const isAvailable = await checkSlotAvailability(doctorId, startTimess, appointmentDate, session);
  if (!isAvailable) {
    console.log("Slot is not available");
    throw new Error('SLOT_ALREADY_BOOKED');
  }
  console.log("after availability check");
  
  // 3. Lock the slot for this user in database
  console.log("before second lock attempt");
  const lockSuccess = await lockSlotInDB(doctorId, startTimess, endTimess, session);
  if (!lockSuccess) {
    console.log("Failed to lock slot");
    throw new Error('SLOT_LOCK_FAILED');
  }
  console.log("after second lock attempt - success");
  const paymentEnabled = await isPaymentEnabled();
  console.log("Is payment enabled?", paymentEnabled);


    const doctor = await Doctor.findById(appointmentData.doctorId);
    const patient = await Patient.findById(appointmentData.patientId);
    console.log("patient in createOrder", patient);
    
    // Distance calculation (keeping your existing logic)
    const lat = appointmentData.lat;
    const long = appointmentData.long;
    const patientLocation = { lat, long };
    
    const coordinates = doctor.coordinates;
    const doctorLat = coordinates?.lat;
    const doctorLng = coordinates?.long;
    
    const doctorLocation = { lat: doctorLat, long: doctorLng };
    const distanceData = await GoogleMaps.getDistanceAndTime(patientLocation, doctorLocation);

if (!paymentEnabled) {
  // 🚀 NO PAYMENT FLOW
  console.log("Payment is disabled, creating appointment without payment");
 

    try{
  const appointment = new Appointment({
    patientId: appointmentData.patientId,
    doctorId: appointmentData.doctorId,
    status: 'Pending',           // directly confirmed
    paymentStatus: 'skipped',       // important flag
    patientUniqueId: patient.patientUniqueId,
    doctorUniqueId: doctor.uniqueId,
    patientName: patient.name,
    doctorname: doctor.doctorName,
    doctorPhone: doctor.phoneNumber,
    patientPhone: patient.phoneNumber,
    appointmentDate,
    startTime: startTimess,
    endTime: endTimess,
    checkIn: chackInStatus,
       latitude: doctorLat,
      longitude: doctorLng,
    createdBy: 'Patient',
    hasInvoice: false               // no invoice
  });

  console.log("appointment before save", appointment);
  await appointment.save({ session });

  // ✅ Book slot immediately
  await DoctorSchedule.updateOne(
    { doctorId },
    {
      $set: { "dailySlots.$[slot].isBooked": true },
      $unset: {
        "dailySlots.$[slot].isLocked": "",
        "dailySlots.$[slot].lockedAt": "",
        "dailySlots.$[slot].lockExpiresAt": ""
      }
    },
    {
      arrayFilters: [
        { "slot.start": startTimess, "slot.end": endTimess }
      ],
      session
    }
  );

  return {
  paymentRequired: false,
  appointment,
  doctor,
  distanceData,
  message: "Appointment booked successfully without payment"
  };
}
catch (error) {
    console.error("Error creating appointment without payment:", error);
    throw new Error(`Appointment creation failed: ${error.message}`);
  } 
}
  // 🚀 PAYMENT FLOW
  console.log("Creating Razorpay order");
  try {
    const options = {
      amount: 1000,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1
    };

    console.log("Razorpay options", options);

    const order = await razorpay.orders.create(options);
  

    // Create appointment with timeout timestamp
    const appointment = new Appointment({
      patientId: appointmentData.patientId,
      doctorId: appointmentData.doctorId,
      status: 'Processing',
      patientUniqueId: patient.patientUniqueId,
      doctorUniqueId: doctor.uniqueId,
      patientName: patient.name,
      doctorname: doctor.doctorName,
      doctorPhone: doctor.phoneNumber,
      patientPhone: patient.phoneNumber,
      appointmentDate,
      startTime: startTimess,
      endTime: endTimess,
      checkIn: chackInStatus,
      latitude: doctorLat,
      longitude: doctorLng,
      createdBy: 'Patient',
      paymentTimeout: new Date(Date.now() + PAYMENT_TIMEOUT_MINUTES * 60 * 1000)
    });

    console.log("appointment before save", appointment);
    await appointment.save({ session });

    const transaction = new TransactionHistory({
      appointmentId: appointment._id,
      patientId: appointmentData.patientId,
      doctorId: appointmentData.doctorId,
      razorpayOrderId: order.id,
      amount: options.amount,
      currency: options.currency,
      status: 'created',
      paymentStatus: 'pending',
      date: appointmentData.date,
      time: appointmentData.time,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + PAYMENT_TIMEOUT_MINUTES * 60 * 1000)
    });
    
    await transaction.save({ session });

    //  FIXED: Schedule cleanup job
    setTimeout(() => {
      cleanupExpiredOrder(order.id);
    }, PAYMENT_TIMEOUT_MINUTES * 60 * 1000);

    const checkoutParams = {
      key_id: process.env.RAZORPAY_KEY_ID,
      order_id: order.id,
      callback_url: `https://app.ayamtechs.com/api/payment/callback`,
      name: 'Appointment Booking',
      description: 'Platform Fee',
      amount: options.amount,
      currency: options.currency,
      prefill: {
        name: 'Aytul Shad',
        email: 'Shad@example.com',
        contact: '9999999999'
      }
    };
    console.log("checkoutParams", checkoutParams);

    const queryStringParams = querystring.stringify({
      key_id: checkoutParams.key_id,
      order_id: checkoutParams.order_id,
      callback_url: checkoutParams.callback_url,
      name: checkoutParams.name,
      description: checkoutParams.description,
      amount: checkoutParams.amount,
      currency: checkoutParams.currency,
      'prefill[name]': checkoutParams.prefill.name,
      'prefill[email]': checkoutParams.prefill.email,
      'prefill[contact]': checkoutParams.prefill.contact
    });

    const checkoutUrl = `https://api.razorpay.com/v1/checkout/embedded?${queryStringParams}`;
    const istNow = getISTDate();
    console.log("boooking time..", istNow)
  //  console.log("Generated checkout URL:", checkoutUrl);
    return { 
      paymentRequired: true,
      order, 
      transaction, 
      appointment, 
      doctor, 
      distanceData, 
      checkoutUrl,
      lockInfo: {
        lockKey: `${doctorId}_${appointmentDate}_${startTimess}`,
        expiresIn: PAYMENT_TIMEOUT_MINUTES
      }
    };
    
  } catch (error) {
    // Release slot lock on error
    console.log("Error occurred, releasing slot lock");
    await unlockSlotInDB(doctorId, startTimess, endTimess, session);
    console.error('Error creating order:', error);
    throw new Error(`Order creation failed: ${error.message}`);
  }
};

// Rest of your functions remain the same...
const cleanupExpiredOrder = async (orderId) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    
    const transaction = await TransactionHistory.findOne({ 
      razorpayOrderId: orderId,
      paymentStatus: 'pending'
    }).session(session);
    
    if (!transaction) {
      await session.commitTransaction();
      return;
    }

    const appointment = await Appointment.findOne({ 
      _id: transaction.appointmentId,
      status: 'Processing'
    }).session(session);

    if (appointment) {
      // Update transaction status
      transaction.status = 'expired';
      //transaction.paymentStatus = 'expired';
      await transaction.save({ session });

      // Delete the appointment
      await Appointment.deleteOne({ _id: appointment._id }).session(session);

      // Release slot lock in database
      await unlockSlotInDB(
        appointment.doctorId.toString(), 
        appointment.startTime, 
        appointment.endTime,
        session
      );
      
      console.log(`Cleaned up expired order: ${orderId}`);
    }
    
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error(`Error cleaning up expired order ${orderId}:`, error);
  } finally {
    session.endSession();
  }
};

const verifyPayment = async (paymentData, session) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, method } = paymentData;
  
  const generatedSignature = crypto
    .createHmac('sha256', razorpay.key_secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    throw new Error('Invalid payment signature');
  }

  const transaction = await TransactionHistory.findOne({ 
    razorpayOrderId: razorpay_order_id 
  }).session(session);
  
  if (!transaction) {
    throw new Error('Transaction not found');
  }

  // Check if payment has expired
  if (transaction.expiresAt && new Date() > transaction.expiresAt) {
    throw new Error('Payment timeout exceeded');
  }

  const appointment = await Appointment.findOne({ 
    _id: transaction.appointmentId 
  }).session(session);
  
  if (!appointment) {
    throw new Error('Appointment not found');
  }

  // Update transaction
  transaction.razorpayPaymentId = razorpay_payment_id;
  transaction.razorpaySignature = razorpay_signature;
  transaction.status = 'paid';
  transaction.method = method || 'unknown';
  transaction.paymentStatus = 'confirmed';
  await transaction.save({ session });

  // Update appointment
  appointment.paymentStatus = 'confirmed';
  appointment.status = 'Pending';
  appointment.hasInvoice = true;
  await appointment.save({ session });
  
  const doctorId = appointment.doctorId.toString();
  const startTime = appointment.startTime;
  const endTime = appointment.endTime;
  
try{
    const result = await DoctorSchedule.updateOne(
    { doctorId },
    {
      $set: {
        "dailySlots.$[slot].isBooked": true
      },
      $unset: {
        "dailySlots.$[slot].isLocked": "",
        "dailySlots.$[slot].lockedAt": "",
        "dailySlots.$[slot].lockExpiresAt": ""
      }
    },
    {
      arrayFilters: [
        {
          "slot.start": startTime,
          "slot.end": endTime,
        },
      ],
      session
    }
  );
  console.log("Slot booking result:", result);
  console.log("modified count for slot booking:", result.modifiedCount);
} catch(error){
  console.error("Error booking slot after payment:", error);
  throw new Error(`Slot booking failed after payment: ${error.message}`);
}
  

 


   const istNow = getISTDate();
   

  const invoice = await Invoice.create(
    [
      {
        userId: transaction.patientId,
        transactionId: transaction._id,

        orderNumber: `TP/${istNow.getFullYear()}/${transaction._id
          .toString()
          .slice(-6)
          .toUpperCase()}`,

        customer: {
          name: appointment.patientName,
          accountNumber: appointment.patientUniqueId,
          phone: appointment.patientPhone
        },
        appointmentId: appointment._id,
        appointment: {
          doctorName: appointment.doctorname,
          doctorId: appointment.doctorUniqueId,
          doctorPhone: appointment.doctorPhone,
          slot: `${formatDateToDDMMMYYYY(appointment.appointmentDate)} | ${appointment.startTime}`
        },

        amount: (transaction.amount)/100,
        total: (transaction.amount)/100,

        bookedAt: istNow, // IST-derived

        status: "FINAL"
      }
    ],
    { session }
  );

  // Send notification
  const { notifyPatient } = require("../utils/firebase/notification");
  await notifyPatient(transaction.patientId, transaction.appointmentId, transaction.doctorId);
  
  return transaction;
};

const reportPaymentFailure = async (orderId, errorCode, errorDescription, session) => {
  const transaction = await TransactionHistory.findOne({ 
    razorpayOrderId: orderId 
  }).session(session);
  
  if (!transaction) {
    throw new Error('Transaction not found');
  }

  const appointment = await Appointment.findOne({ 
    _id: transaction.appointmentId 
  }).session(session);

  transaction.status = 'failed';
  transaction.paymentStatus = 'failed';
  transaction.errorCode = errorCode || 'UNKNOWN';
  transaction.errorDescription = errorDescription || 'Payment failed';
  await transaction.save({ session });

  if (appointment) {
    await Appointment.deleteOne({ _id: transaction.appointmentId }).session(session);
    transaction.appointmentId = null;
    await transaction.save({ session });
    
    // Release slot lock in database
    await unlockSlotInDB(
      appointment.doctorId.toString(),
      appointment.startTime,
      appointment.endTime,
      session
    );
  }

  return transaction;
};

const initiateRefund = async (paymentId, amount, reason, session) => {
  try {
    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount,
      notes: { reason: reason || 'Appointment creation failed' }
    });
    
    const transaction = await TransactionHistory.findOne({ 
      razorpayPaymentId: paymentId 
    }).session(session);
    
    if (transaction) {
      const appointment = await Appointment.findOne({ 
        _id: transaction.appointmentId 
      }).session(session);
      
      transaction.isRefunded = true;
      transaction.refundedAmount = amount;
      transaction.refundReason = reason || 'Appointment creation failed';
      transaction.status = 'refunded';
      
      if (appointment) {
        await Appointment.deleteOne({ _id: transaction.appointmentId }).session(session);
        transaction.appointmentId = null;
        
        // Release slot lock in database
        await unlockSlotInDB(
          appointment.doctorId.toString(),
          appointment.startTime,
          appointment.endTime,
          session
        );
      }
      
      await transaction.save({ session });
    }
    
    return refund;
  } catch (error) {
    throw new Error(`Refund failed: ${error.message}`);
  }
};

const handleCallback = async (callbackData, session) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, error, method } = callbackData;
  
  if (error) {
    await reportPaymentFailure(
      razorpay_order_id, 
      error.code || 'PAYMENT_FAILED', 
      error.description || 'Payment failed or cancelled', 
      session
    );
    return { success: false, redirectUrl: '/failure.html' };
  }

  try {
    const transaction = await verifyPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      method
    }, session);

    return { 
      success: true, 
      redirectUrl: '/success.html', 
      appointmentId: transaction.appointmentId 
    };
  } catch (error) {
    if (error.message === 'Payment timeout exceeded') {
      return { 
        success: false, 
        redirectUrl: '/timeout.html' 
      };
    }
    throw error;
  }
};

// Enhanced cleanup function with better error handling
const cleanupExpiredSlotsAndTransactions = async () => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    
    const now = new Date();
    console.log(`Starting cleanup at ${now}`);
    
    // 1. Find all expired transactions
    const expiredTransactions = await TransactionHistory.find({
      paymentStatus: 'pending',
      expiresAt: { $lt: now }
    }).session(session);

    console.log(`Found ${expiredTransactions.length} expired transactions`);

    // 2. Process each expired transaction
    let cleanedSlots = 0;
    let cleanedTransactions = 0;

    for (const transaction of expiredTransactions) {
      try {
        // Find related appointment
        const appointment = await Appointment.findOne({ 
          _id: transaction.appointmentId 
        }).session(session);

        if (appointment) {
          // Delete the appointment
          await Appointment.deleteOne({ _id: appointment._id }).session(session);
          
          // Unlock the slot in doctor schedule
          const unlocked = await unlockSlotInDB(
            appointment.doctorId.toString(),
            appointment.startTime,
            appointment.endTime,
            session
          );

          if (unlocked) {
            cleanedSlots++;
            console.log(`Released slot for appointment ${appointment._id}`);
          }
        }

        // Update transaction status
        transaction.status = 'expired';
        transaction.paymentStatus = 'expired';
        transaction.appointmentId = null; // Clear appointment reference
        await transaction.save({ session });
        cleanedTransactions++;

      } catch (error) {
        console.error(`Error processing expired transaction ${transaction._id}:`, error);
      }
    }

    // 3. Also cleanup orphaned locks (locks without transactions)
    const expiredLockResult = await DoctorSchedule.updateMany(
      {
        "dailySlots.isLocked": true,
        "dailySlots.lockExpiresAt": { $lt: now }
      },
      {
        $unset: {
          "dailySlots.$.isLocked": "",
          "dailySlots.$.lockedAt": "",
          "dailySlots.$.lockExpiresAt": ""
        }
      },
      { session }
    );

    const orphanedLocks = expiredLockResult.modifiedCount || 0;

    await session.commitTransaction();
    
    console.log(`Cleanup completed successfully:
      - Cleaned transactions: ${cleanedTransactions}
      - Released appointment slots: ${cleanedSlots}  
      - Released orphaned locks: ${orphanedLocks}
      - Total locks released: ${cleanedSlots + orphanedLocks}`);
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Cleanup failed:', error);
  } finally {
    session.endSession();
  }
};


// IST helper
function getISTDate() {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() );
}

function formatDateToDDMMMYYYY(date) {
  if (!date) return "";

  return new Date(date)
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata"
    })
    .replace(/ /g, "-");
}


module.exports = { 
  createOrder, 
  verifyPayment, 
  reportPaymentFailure, 
  initiateRefund, 
  handleCallback,
  cleanupExpiredSlotsAndTransactions,
  cleanupExpiredOrder,
  // Export utility functions for external use
  lockSlotInDB,
  unlockSlotInDB,
  isSlotLockedInDB,
  checkSlotAvailability,
  normalizeTimeFormat // Export the normalize function
};