const mongoose =  require("mongoose");


const paymentSettingsSchema = new mongoose.Schema({
  
  paymentEnabled: { type: Boolean, default: false },
});

module.exports = mongoose.model("PaymentSettings", paymentSettingsSchema);
