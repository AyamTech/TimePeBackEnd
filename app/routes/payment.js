const express = require('express');
const router = express.Router();

const paymentController = require('../controllers/payment');

router.post('/create-order', paymentController.createOrder);
router.post('/verify-payment', paymentController.verifyPayment);
// router.post('/webhook', paymentController.handleWebhook);


router.post('/report-failure', paymentController.reportPaymentFailure);
router.post('/refund', paymentController.initiateRefund);
router.post('/callback', paymentController.handleCallback);


module.exports = router;