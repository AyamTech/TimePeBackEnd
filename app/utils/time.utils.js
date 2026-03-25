const { DateTime } = require("luxon");

const compareTimeStrings = (a, b) => {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);

  if (ah !== bh) return ah - bh;
  return am - bm;
};

const normalizeTimeFormat = (timeStr) => {
  if (!timeStr) return null;

  const formats = [
    "h:mm a",
    "hh:mm a",
    "H:mm",
    "HH:mm"
  ];

  for (const format of formats) {
    const dt = DateTime.fromFormat(timeStr.trim(), format, {
      zone: "local"
    });

    if (dt.isValid) {
    console.log(`Normalized time "${timeStr}" to "HH:mm" format: ${dt.toFormat("HH:mm")}`);
      return dt.toFormat("HH:mm");
    }
  }

  throw new Error(`Invalid time format: ${timeStr}`);
};

module.exports = { normalizeTimeFormat, compareTimeStrings };