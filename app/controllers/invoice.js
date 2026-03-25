const { PDFDocument, rgb } = require("pdf-lib");
const { generateInvoicePDF } = require("../services/pdf");
const Invoice = require("../models/invoice.model"); // assume exists

/**
 * Download invoice (on-the-go PDF generation)
 */
exports.downloadInvoice = async (req, res) => {
  try {
    const { appointmentid } = req.params;
    console.log("Params received:", req.params);
    const userId = req.body.userId; 
    console.log("Download invoice requested for appointmentid:", appointmentid, "by userId:", userId);  
    // 1. Fetch invoice data
     const invoice = await Invoice.findOne({ appointmentId: appointmentid });
     console.log("Fetched invoice:", invoice);
    //const invoice = require("../../tests/invoice.sample.json");

    if (!invoice) {
      console.log("Invoice not found for appointmentId:", appointmentid);
      return res.status(404).json({ message: "Invoice not found" });
    }

    // 2. Authorization check
    if (invoice.userId.toString() !== userId) {
      console.log("Unauthorized access attempt by userId:", userId);
      return res.status(403).json({ message: "Unauthorized access" });
    }
    const invoiceId = invoice._id;
    // 3. Prepare template data
    const templateData = {
      customerName: invoice.customer.name,
      accountNumber: invoice.customer.accountNumber,
      customerPhone: invoice.customer.phone,

      orderNumber: invoice.orderNumber,
      bookedAt: formatDate(invoice.bookedAt),

      amount: invoice.amount.toFixed(2),
      totalPaid: invoice.total.toFixed(2),

      doctorName: invoice.appointment.doctorName,
      doctorId: invoice.appointment.doctorId,
      doctorPhone: invoice.appointment.doctorPhone,
      appointmentSlot: invoice.appointment.slot,

      signedAt: formatDate(getCurrentISTDateTime())
    };

    console.log("Template data prepared:", templateData);
    // 4. Generate base PDF from HTML
    const basePdfBuffer = await generateInvoicePDF(templateData);
    console.log(basePdfBuffer.slice(0, 10).toString());


    // 5. Add "Downloaded on" overlay
    const finalPdfBuffer = await addDownloadedOnOverlay(basePdfBuffer);
    console.log(finalPdfBuffer.slice(0, 10).toString());

    // 6. Log download (optional but recommended)
    await Invoice.updateOne(
      { _id: invoiceId },
      {
        $inc: { "download.count": 1 },
        $set: { "download.lastDownloadedAt": new Date() }
      }
    );

     // 3. Send response CORRECTLY
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${invoice.orderNumber}.pdf`
    );
    res.setHeader("Content-Length", finalPdfBuffer.length);

    res.send(Buffer.from(finalPdfBuffer));

  } catch (error) {
    console.error("Invoice download error:", error);
    res.status(500).json({ message: "Failed to download invoice" });
  }
};


async function addDownloadedOnOverlay(pdfBuffer) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();

  const downloadTime = new Date().toISOString().replace("T", " ").split(".")[0] + " UTC";

  pages.forEach((page) => {
    const { width } = page.getSize();

    page.drawText(
      `Downloaded on: ${downloadTime}`,
      {
        x: width - 260,
        y: 20,
        size: 9,
        color: rgb(0.5, 0.5, 0.5)
      }
    );
  });

  return await pdfDoc.save();
}


function getCurrentISTDateTime() {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() );
}



function formatDate(date) {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata"
  });
}
