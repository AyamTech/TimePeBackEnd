const PaymentSettings = require("./app/models/payment.settings");
const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MONGO_URI:", process.env.MONGO_URI);
    console.log("MongoDB Connected Successfully...");
  } catch (err) {
    console.error(" MongoDB Connection Error:", err);
    process.exit(1);
  }
};
connectDB();

async function isPaymentEnabled() {
    console.log("Checking payment settings...");
  const cfg = await PaymentSettings.findOne();
  console.log("Payment Settings:", cfg);
  const result = cfg?.paymentEnabled ?? true;
    console.log("Is Payment Enabled?", result);
    return result;
}

