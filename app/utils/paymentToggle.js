const PaymentSettings = require("../models/payment.settings");

async function isPaymentEnabled() {
  const cfg = await PaymentSettings.findOne();
  return cfg?.paymentEnabled ?? true;
}
module.exports = {
    isPaymentEnabled
};