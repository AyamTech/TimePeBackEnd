const express = require("express");
const router = express.Router();
const invoiceController = require("../controllers/invoice");
// const auth = require("../middlewares/auth.middleware");

router.post(
  "/:appointmentid/download",
  invoiceController.downloadInvoice
);

module.exports = router;
