// const paymentService = require('../services/payment');
// const Appointment = require('../models/AppointmentsModel');
// const TransactionHistory = require('../models/transactionhistory');
// const crypto = require('crypto');
// const PatientService = require("../services/PatientService");

// const createOrder = async (req, res) => {
//   try {
//     console.log("logging in controller...", req.body);
//     const appointmentData = req.body;
//     console.log("logginf req body", appointmentData);
//     if (!appointmentData.patientId  || !appointmentData.startTime) {
//       return res.status(400).json({ error: 'Missing required appointment data' });
//     }
//     console.log("reached after if..");
//     console.log("priting appoitnment data..", appointmentData);
//     const { order, transaction } = await paymentService.createOrder(appointmentData);
//     res.json({
//       id: order.id,
//       currency: order.currency,
//       amount: order.amount,
//       key: process.env.RAZORPAY_KEY_ID,
//       transactionId: transaction._id,
//       appointmentData
//     });
//   } catch (error) {
//     console.log("error in controoler", error.message);
//     res.status(500).json({ error: error.message });
//   }
// };

// const verifyPaymentAndCreateAppointment = async (req, res) => {
//   try {
//     const { razorpay_order_id, razorpay_payment_id, razorpay_signature, appointmentData } = req.body;

//     const transaction = await paymentService.verifyPayment({
//       razorpay_order_id,
//       razorpay_payment_id,
//       razorpay_signature,
//       method: req.body.method // Optional: passed from frontend
//     });

//     const appointment = await PatientService.createAppointmentByPatient(appointmentData);
//    // await appointment.save();

//     transaction.appointmentId = appointment._id;
//     await transaction.save();

//     res.json({ message: 'Payment successful, appointment created', appointment });
//   } catch (error) {
//     if (error.message === 'Invalid payment signature' || error.message === 'Transaction not found') {
//       await TransactionHistory.findOneAndUpdate(
//         { razorpayOrderId: req.body.razorpay_order_id },
//         { status: 'failed', errorCode: 'INVALID_SIGNATURE', errorDescription: error.message }
//       );
//     }
//     res.status(400).json({ error: error.message });
//   }
// };

// const handleWebhook = async (req, res) => {
//   const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
//   const signature = req.headers['x-razorpay-signature'];
//   const payload = JSON.stringify(req.body);

//   const generatedSignature = crypto
//     .createHmac('sha256', webhookSecret)
//     .update(payload)
//     .digest('hex');

//   if (generatedSignature !== signature) {
//     return res.status(400).json({ error: 'Invalid webhook signature' });
//   }

//   const event = req.body.event;
//   if (event === 'payment.captured') {
//     const { order_id, payment_id, status, method } = req.body.payload.payment.entity;
//     const transaction = await TransactionHistory.findOne({ razorpayOrderId: order_id });
//     if (transaction && transaction.status !== 'paid') {
//       transaction.razorpayPaymentId = payment_id;
//       transaction.status = 'paid';
//       transaction.method = method || 'unknown';
//       if (!transaction.appointmentId) {
//         const appointment = new Appointment({
//           patientId: transaction.patientId,
//           doctorId: transaction.doctorId,
//           date: transaction.date || new Date(),
//           time: transaction.time || '00:00',
//           status: 'confirmed'
//         });
//         await appointment.save();
//         transaction.appointmentId = appointment._id;
//       }
//       await transaction.save();
//     }
//   } else if (event === 'payment.failed') {
//     const { order_id, error_code, error_description } = req.body.payload.payment.entity;
//     await TransactionHistory.findOneAndUpdate(
//       { razorpayOrderId: order_id },
//       { status: 'failed', errorCode: error_code, errorDescription: error_description }
//     );
//   }

//   res.status(200).json({ message: 'Webhook processed' });
// };

// module.exports = { createOrder, verifyPaymentAndCreateAppointment, handleWebhook };


// const mongoose = require('mongoose');
// const paymentService = require('../services/payment');
// const Appointment = require('mongoose').model('Appointment');
// const TransactionHistory = require('../models/TransactionHistory');
// const crypto = require('crypto');

// const withRetry = async (operation, maxRetries = 3) => {
//   for (let i = 0; i < maxRetries; i++) {
//     const session = await mongoose.startSession();
//     try {
//       session.startTransaction();
//       const result = await operation(session);
//       await session.commitTransaction();
//       return result;
//     } catch (error) {
//       await session.abortTransaction();
//       if (error.name === 'TransientTransactionError' && i < maxRetries - 1) {
//         continue;
//       }
//       throw error;
//     } finally {
//       session.endSession();
//     }
//   }
// };

// const createOrder = async (req, res) => {
//   try {
//     const  appointmentData  = req.body;
//     if (!appointmentData.patientId || !appointmentData.doctorId ) {
//       return res.status(400).json({ error: 'Missing required appointment data' });
//     }

//     const result = await withRetry(async (session) => {
//       const { order, transaction } = await paymentService.createOrder(appointmentData, session);
//       return {
//         id: order.id,
//         currency: order.currency,
//         amount: order.amount,
//         key: process.env.RAZORPAY_KEY_ID,
//         transactionId: transaction._id,
//         appointmentData
//       };
//     });

//     res.json(result);
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// };

// const verifyPaymentAndCreateAppointment = async (req, res) => {
//   try {
//     console.log("Verifying payment with data:", req.body);
//     const result = await withRetry(async (session) => {
//       const { razorpay_order_id, razorpay_payment_id, razorpay_signature, appointmentData } = req.body;
//       const transaction = await paymentService.verifyPayment({
//         razorpay_order_id,
//         razorpay_payment_id,
//         razorpay_signature,
//         method: req.body.method
//       }, session);
//       return { message: 'Payment successful, appointment confirmed', appointmentId: transaction.appointmentId, transaction };
//     });

//     res.json(result);
//   } catch (error) {
//     if (error.message === 'Invalid payment signature' || error.message === 'Transaction not found' || error.message === 'Appointment not found') {
//       await withRetry(async (session) => {
//         await paymentService.reportPaymentFailure(req.body.razorpay_order_id, 'INVALID_SIGNATURE', error.message, session);
//       });
//     } else if (req.body.razorpay_payment_id) {
//       try {
//         await withRetry(async (session) => {
//           await paymentService.initiateRefund(req.body.razorpay_payment_id, 1000, 'Payment verification failed', session);
//         });
//       } catch (refundError) {
//         console.error('Refund failed:', refundError);
//       }
//     }
//     res.status(400).json({ error: error.message });
//   }
// };

// const reportPaymentFailure = async (req, res) => {
//   try {
//     const result = await withRetry(async (session) => {
//       const { razorpay_order_id, error_code, error_description } = req.body;
//       const transaction = await paymentService.reportPaymentFailure(razorpay_order_id, error_code, error_description, session);
//       return { message: 'Payment failure recorded', transaction };
//     });
//     res.json(result);
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// };

// const handleWebhook = async (req, res) => {
//   const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
//   const signature = req.headers['x-razorpay-signature'];
//   const payload = JSON.stringify(req.body);

//   const generatedSignature = crypto
//     .createHmac('sha256', webhookSecret)
//     .update(payload)
//     .digest('hex');

//   if (generatedSignature !== signature) {
//     return res.status(400).json({ error: 'Invalid webhook signature' });
//   }

//   try {
//     const result = await withRetry(async (session) => {
//       const event = req.body.event;
//       if (event === 'payment.captured') {
//         const { order_id, payment_id, status, method } = req.body.payload.payment.entity;
//         const transaction = await TransactionHistory.findOne({ razorpayOrderId: order_id }).session(session);
//         if (transaction && transaction.status !== 'paid') {
//           const appointment = await Appointment.findOne({ _id: transaction.appointmentId }).session(session);
//           if (!appointment) {
//             await paymentService.reportPaymentFailure(order_id, 'APPOINTMENT_NOT_FOUND', 'Appointment not found', session);
//             return { message: 'Webhook processed, appointment not found' };
//           }
//           transaction.razorpayPaymentId = payment_id;
//           transaction.status = 'paid';
//           transaction.method = method || 'unknown';
//           await transaction.save({ session });
//           appointment.status = 'confirmed';
//           await appointment.save({ session });
//         }
//       } else if (event === 'payment.failed') {
//         const { order_id, error_code, error_description } = req.body.payload.payment.entity;
//         await paymentService.reportPaymentFailure(order_id, error_code, error_description, session);
//       } else if (event === 'refund.processed') {
//         const { payment_id, amount, notes } = req.body.payload.refund.entity;
//         const transaction = await TransactionHistory.findOne({ razorpayPaymentId: payment_id }).session(session);
//         if (transaction) {
//           transaction.isRefunded = true;
//           transaction.refundedAmount = amount;
//           transaction.refundReason = notes?.reason || 'Refund processed';
//           transaction.status = 'refunded';
//           if (transaction.appointmentId) {
//             await Appointment.deleteOne({ _id: transaction.appointmentId }).session(session);
//             transaction.appointmentId = null;
//           }
//           await transaction.save({ session });
//         }
//       }
//       return { message: 'Webhook processed' };
//     });
//     res.status(200).json(result);
//   } catch (error) {
//     res.status(500).json({ error: 'Webhook processing failed' });
//   }
// };

// module.exports = { createOrder, verifyPaymentAndCreateAppointment, reportPaymentFailure, handleWebhook };


// const mongoose = require('mongoose');
// const paymentService = require('../services/payment');
// const crypto = require('crypto');
// const Appointment = require('mongoose').model('Appointment');
// const TransactionHistory = require('../models/transactionhistory');

// const withRetry = async (operation, maxRetries = 3) => {
//   for (let i = 0; i < maxRetries; i++) {
//     const session = await mongoose.startSession();
//     try {
//       session.startTransaction();
//       const result = await operation(session);
//       await session.commitTransaction();
//       return result;
//     } catch (error) {
//       await session.abortTransaction();
//       if (error.name === 'TransientTransactionError' && i < maxRetries - 1) {
//         continue;
//       }
//       throw error;
//     } finally {
//       session.endSession();
//     }
//   }
// };

// const createOrder = async (req, res) => {
//   try {
//     const  appointmentData  = req.body;
//     if (!appointmentData?.patientId || !appointmentData?.doctorId) {
//       return res.status(400).json({ error: 'Missing required appointment data' });
//     }

//     const result = await withRetry(async (session) => {
//       const { order, transaction, checkoutUrl, appointment, doctor, distanceData} = await paymentService.createOrder(appointmentData, session);
//       return {
//         id: order.id,
//         currency: order.currency,
//         amount: order.amount,
//         key: process.env.RAZORPAY_KEY_ID,
//         transactionId: transaction._id,
//         appointmentData: appointment,
//          doctor: doctor, travelModes: distanceData, 
//         checkoutUrl
//       };
//     });
//     console.log("Order created successfully:", result);
//     return res.json(result);
//   } catch (error) {
//     return res.status(500).json({ error: `Order creation failed: ${error.message}` });
//   }
// };

// const verifyPayment = async (req, res) => {
//   try {
//     const { razorpay_order_id, razorpay_payment_id, razorpay_signature, method } = req.body;
//     if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
//       return res.status(400).json({ error: 'Missing required payment data' });
//     }

//     const result = await withRetry(async (session) => {
//       const transaction = await paymentService.verifyPayment({
//         razorpay_order_id,
//         razorpay_payment_id,
//         razorpay_signature,
//         method
//       }, session);
//       return {
//         success: true,
//         message: 'Payment verified successfully',
//         appointmentId: transaction.appointmentId
//       };
//     });
//     console.log("Payment verified successfully:", result);
//     return res.json(result);
//   } catch (error) {
//     try {
//       if (error.message === 'Invalid payment signature' || error.message === 'Transaction not found' || error.message === 'Appointment not found') {
//         await withRetry(async (session) => {
//           await paymentService.reportPaymentFailure(req.body.razorpay_order_id, 'INVALID', error.message, session);
//         });
//       } else if (req.body.razorpay_payment_id) {
//         await withRetry(async (session) => {
//           await paymentService.initiateRefund(req.body.razorpay_payment_id, 1000, 'Payment verification failed', session);
//         });
//       }
//       return res.status(400).json({ error: `Payment verification failed: ${error.message}` });
//     } catch (fallbackError) {
//       return res.status(500).json({ error: `Payment verification failed and fallback action errored: ${fallbackError.message}` });
//     }
//   }
// };

// const reportPaymentFailure = async (req, res) => {
//   try {
//     const { razorpay_order_id, error_code, error_description } = req.body;
//     if (!razorpay_order_id) {
//       return res.status(400).json({ error: 'Missing razorpay_order_id' });
//     }

//     const result = await withRetry(async (session) => {
//       const transaction = await paymentService.reportPaymentFailure(razorpay_order_id, error_code, error_description, session);
//       return {
//         success: true,
//         message: 'Payment failure recorded',
//         transactionId: transaction._id
//       };
//     });

//     return res.json(result);
//   } catch (error) {
//     return res.status(500).json({ error: `Failed to record payment failure: ${error.message}` });
//   }
// };

// const initiateRefund = async (req, res) => {
//   try {
//     const { paymentId, amount, reason } = req.body;
//     if (!paymentId || !amount) {
//       return res.status(400).json({ error: 'Missing paymentId or amount' });
//     }

//     const result = await withRetry(async (session) => {
//       const refund = await paymentService.initiateRefund(paymentId, amount, reason, session);
//       return {
//         success: true,
//         message: 'Refund initiated successfully',
//         refundId: refund.id
//       };
//     });

//     return res.json(result);
//   } catch (error) {
//     return res.status(500).json({ error: `Refund initiation failed: ${error.message}` });
//   }
// };

// const handleCallback = async (req, res) => {
//   try {
//     const result = await withRetry(async (session) => {
//       // const callbackData = {
//       //   razorpay_order_id: req.body.razorpay_order_id,
//       //   razorpay_payment_id: req.body.razorpay_payment_id,
//       //   razorpay_signature: req.body.razorpay_signature,
//       //   error: req.body.error,
//       //   method: req.body.method
//       // };
//       const { razorpay_order_id, razorpay_payment_id, razorpay_signature, error } = req.body;
//       console.log('Processing callback with data:', req.body);
//       let method = 'unknown'; // Default value
//       if (razorpay_payment_id && !error) {
//         // Fetch payment details from Razorpay API
//         const razorpay = require('../config/razorpay');
//         const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
//         method = paymentDetails.method || 'unknown'; // Extract method (card, upi, etc.)
//       }

//       const callbackData = {
//         razorpay_order_id,
//         razorpay_payment_id,
//         razorpay_signature,
//         error,
//         method // Pass method to paymentService
//       };

//       console.log('Callback data:', callbackData); // Debug log
//       const { success, redirectUrl } = await paymentService.handleCallback(callbackData, session);
//       return { success, redirectUrl };
//     });
//     console.log('Callback processed successfully:', result);
//     return res.redirect(result.redirectUrl);
//   } catch (error) {
//     console.error('Callback error:', error);
//     return res.redirect('/failure.html');
//   }
// };

// module.exports = { createOrder, verifyPayment, reportPaymentFailure, initiateRefund, handleCallback };


const mongoose = require('mongoose');
const paymentService = require('../services/payment');
const crypto = require('crypto');
const Appointment = require('mongoose').model('Appointment');
const TransactionHistory = require('../models/transactionhistory');

const withRetry = async (operation, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const result = await operation(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      if (error.name === 'TransientTransactionError' && i < maxRetries - 1) {
        continue;
      }
      throw error;
    } finally {
      session.endSession();
    }
  }
};

const createOrder = async (req, res) => {
  try {
    const appointmentData = req.body;
    if (!appointmentData?.patientId || !appointmentData?.doctorId) {
      return res.status(400).json({ error: 'Missing required appointment data' });
    }

        const result = await withRetry(async (session) => {
      return await paymentService.createOrder(appointmentData, session);
    });

    /**
     * 🟢 CASE 1: PAYMENT DISABLED
     */
    if (result.paymentRequired === false) {
      return res.status(200).json({
        paymentRequired: false,
        appointment: result.appointment,
        doctor: result.doctor,
        travelModes: result.distanceData,
        message: result.message
      });
    }

    /**
     * 🟡 CASE 2: NORMAL PAYMENT FLOW
     */
    return res.status(200).json({
      paymentRequired: true,
      id: result.order.id,
      currency: result.order.currency,
      amount: result.order.amount,
      key: process.env.RAZORPAY_KEY_ID,
      transactionId: result.transaction._id,
      appointmentData: result.appointment,
      doctor: result.doctor,
      travelModes: result.distanceData,
      checkoutUrl: result.checkoutUrl,
      expiresIn: result.lockInfo.expiresIn,
      message: `Payment must be completed within ${result.lockInfo.expiresIn} minutes`
    });


    
  } catch (error) {
    // Handle specific error cases
    if (error.message === 'SLOT_ALREADY_BOOKED') {
      return res.status(409).json({ 
        error: 'SLOT_UNAVAILABLE',
        message: 'This appointment slot has already been booked by another patient. Please select a different time slot.',
        code: 'SLOT_BOOKED'
      });
    }
    
    if (error.message === 'SLOT_TEMPORARILY_LOCKED') {
      return res.status(409).json({ 
        error: 'SLOT_LOCKED',
        message: 'This appointment slot is currently being processed by another patient. Please wait a few minutes and try again, or select a different time slot.',
        code: 'SLOT_LOCKED',
        retryAfter: 300 // 5 minutes in seconds
      });
    }
    
    return res.status(500).json({ 
      error: `Order creation failed: ${error.message}`,
      code: 'ORDER_CREATION_FAILED'
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, method } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required payment data' });
    }

    const result = await withRetry(async (session) => {
      const transaction = await paymentService.verifyPayment({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        method
      }, session);
      
      return {
        success: true,
        message: 'Payment verified successfully',
        appointmentId: transaction.appointmentId
      };
    });
    
    console.log("Payment verified successfully:", result);
    return res.json(result);
    
  } catch (error) {
    try {
      // Handle timeout case
      if (error.message === 'Payment timeout exceeded') {
        await withRetry(async (session) => {
          await paymentService.reportPaymentFailure(
            req.body.razorpay_order_id, 
            'PAYMENT_TIMEOUT', 
            'Payment verification attempted after timeout period', 
            session
          );
        });
        
        return res.status(408).json({ 
          error: 'PAYMENT_TIMEOUT',
          message: 'Payment verification timeout exceeded. The appointment slot may no longer be available.',
          code: 'TIMEOUT'
        });
      }
      
      if (error.message === 'Invalid payment signature' || 
          error.message === 'Transaction not found' || 
          error.message === 'Appointment not found') {
        await withRetry(async (session) => {
          await paymentService.reportPaymentFailure(
            req.body.razorpay_order_id, 
            'INVALID', 
            error.message, 
            session
          );
        });
      } else if (req.body.razorpay_payment_id) {
        await withRetry(async (session) => {
          await paymentService.initiateRefund(
            req.body.razorpay_payment_id, 
            1000, 
            'Payment verification failed', 
            session
          );
        });
      }
      
      return res.status(400).json({ 
        error: `Payment verification failed: ${error.message}`,
        code: 'VERIFICATION_FAILED'
      });
      
    } catch (fallbackError) {
      return res.status(500).json({ 
        error: `Payment verification failed and fallback action errored: ${fallbackError.message}`,
        code: 'VERIFICATION_AND_FALLBACK_FAILED'
      });
    }
  }
};

const reportPaymentFailure = async (req, res) => {
  try {
    const { razorpay_order_id, error_code, error_description } = req.body;
    if (!razorpay_order_id) {
      return res.status(400).json({ error: 'Missing razorpay_order_id' });
    }

    const result = await withRetry(async (session) => {
      const transaction = await paymentService.reportPaymentFailure(
        razorpay_order_id, 
        error_code, 
        error_description, 
        session
      );
      
      return {
        success: true,
        message: 'Payment failure recorded',
        transactionId: transaction._id
      };
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ 
      error: `Failed to record payment failure: ${error.message}` 
    });
  }
};

const initiateRefund = async (req, res) => {
  try {
    const { paymentId, amount, reason } = req.body;
    if (!paymentId || !amount) {
      return res.status(400).json({ error: 'Missing paymentId or amount' });
    }

    const result = await withRetry(async (session) => {
      const refund = await paymentService.initiateRefund(paymentId, amount, reason, session);
      return {
        success: true,
        message: 'Refund initiated successfully',
        refundId: refund.id
      };
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ 
      error: `Refund initiation failed: ${error.message}` 
    });
  }
};

const handleCallback = async (req, res) => {
  try {
    const result = await withRetry(async (session) => {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, error } = req.body;
      console.log('Processing callback with data:', req.body);
      
      let method = 'unknown';
      if (razorpay_payment_id && !error) {
        try {
          const razorpay = require('../config/razorpay');
          const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
          method = paymentDetails.method || 'unknown';
        } catch (fetchError) {
          console.warn('Could not fetch payment method:', fetchError);
        }
      }

      const callbackData = {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        error,
        method
      };

      console.log('Callback data:', callbackData);
      const { success, redirectUrl } = await paymentService.handleCallback(callbackData, session);
      return { success, redirectUrl };
    });
    
    console.log('Callback processed successfully:', result);
    return res.redirect(result.redirectUrl);
    
  } catch (error) {
    console.error('Callback error:', error);
    
    // Handle specific timeout case
    if (error.message === 'Payment timeout exceeded') {
      return res.redirect('/timeout.html?reason=payment_timeout');
    }
    
    return res.redirect('/failure.html');
  }
};

// Endpoint to check slot availability before proceeding to payment
const checkSlotAvailability = async (req, res) => {
  try {
    const { doctorId, startTime, appointmentDate } = req.body;
    
    if (!doctorId || !startTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await withRetry(async (session) => {
      const existingAppointment = await Appointment.findOne({
        doctorId,
        startTime,
        appointmentDate: appointmentDate || new Date(),
        status: { $in: ['Processing', 'Pending', 'Confirmed', 'Active'] }
      }).session(session);
      
      return {
        available: !existingAppointment,
        locked: false // You can implement slot lock checking here
      };
    });
    
    return res.json(result);
    
  } catch (error) {
    return res.status(500).json({ 
      error: `Failed to check slot availability: ${error.message}` 
    });
  }
};

// Endpoint for manual cleanup of expired transactions (admin use)
const cleanupExpiredTransactions = async (req, res) => {
  try {
    await paymentService.cleanupExpiredTransactions();
    return res.json({ 
      success: true, 
      message: 'Expired transactions cleanup completed' 
    });
  } catch (error) {
    return res.status(500).json({ 
      error: `Cleanup failed: ${error.message}` 
    });
  }
};

module.exports = { 
  createOrder, 
  verifyPayment, 
  reportPaymentFailure, 
  initiateRefund, 
  handleCallback,
  checkSlotAvailability,
  cleanupExpiredTransactions
};