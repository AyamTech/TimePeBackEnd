const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

/**
 * Generate Invoice PDF from HTML template
 * @param {Object} data - Invoice dynamic data
 * @returns {Buffer} PDF buffer
 */
async function generateInvoicePDF(data) {
  // 1. Load HTML template
  const templatePath = path.join(
    __dirname,
    "../templates/invoice.html"
  );

  let html = fs.readFileSync(templatePath, "utf-8");

  // 2. Inject dynamic values (simple & deterministic)
  html = replaceTemplateVariables(html, data);

  // 3. Launch Puppeteer
const browser = await puppeteer.launch({
  headless: "new",
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--no-zygote",
    "--single-process"
  ],
});


  try {
    const page = await browser.newPage();

    // 4. Set HTML content
    await page.setContent(html, {
      waitUntil: "networkidle0"
    });

    // 5. Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "15mm",
        bottom: "20mm",
        left: "15mm"
      }
    });

    return pdfBuffer;

  } finally {
    await browser.close();
  }
}

/**
 * Replace {{key}} placeholders in template
 */
function replaceTemplateVariables(template, data) {
  let output = template;

  for (const key in data) {
    const value = data[key] ?? "";
    const regex = new RegExp(`{{${key}}}`, "g");
    output = output.replace(regex, value);
  }

  return output;
}

module.exports = {
  generateInvoicePDF
};
