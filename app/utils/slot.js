// utils/slotGenerator.js
const { DateTime, Duration } = require("luxon"); // Using luxon for date/time manipulation

/**
 * Generate an array of appointment slots between start and end time.
 * @param {string} startTimeStr - e.g. "09:00 AM"
 * @param {string} endTimeStr - e.g. "03:00 PM"
 * @param {string} durationStr - e.g. "10 Minutes"
 * @returns {Array} - An array of objects with slot start and end times.
 */
function generateSlots(startTimeStr, endTimeStr, durationStr) {
  // Parse appointment duration (in minutes)
  const durationParts = durationStr.split(" ");
  const slotMinutes = parseInt(durationParts[0], 10);

  // Parse times using luxon (you can also use DateFormat from intl if you prefer)
  // Assume today's date for the calculation
  const today = DateTime.local().toISODate(); // "2025-03-17" etc.
  const startDateTime = DateTime.fromFormat(`${today} ${startTimeStr}`, "yyyy-MM-dd h:mm a");
  const endDateTime = DateTime.fromFormat(`${today} ${endTimeStr}`, "yyyy-MM-dd h:mm a");

  if (!startDateTime.isValid || !endDateTime.isValid) {
    throw new Error("Invalid start or end time format.");
  }

  const slots = [];
  let currentSlotStart = startDateTime;

  // Loop until the next slot start time would exceed the end time
  while (currentSlotStart.plus({ minutes: slotMinutes }) <= endDateTime) {
    const currentSlotEnd = currentSlotStart.plus({ minutes: slotMinutes });
    slots.push({
      start: currentSlotStart.toFormat("h:mm a"),
      end: currentSlotEnd.toFormat("h:mm a"),
    });
    currentSlotStart = currentSlotEnd;
  }
  return slots;
}

module.exports = generateSlots;
