// Updated midnight cron to handle both legacy and multi-section schedules

const DoctorSchedule = require('../models/doctorSchedule');
const mongoose = require('mongoose');

async function regenerateDailySlots() {
  const today = new Date();
  const dayIndex = today.getDay(); // 0 = Sunday

  const schedules = await DoctorSchedule.find({
    status: 'Active'
  });

  for (const schedule of schedules) {
    try {
      // Skip if no availability today
      if (!schedule.selectedDays[dayIndex]) {
        console.log(`⏭️ Skipping doctor ${schedule.doctorId} - no availability today`);
        continue;
      }

      const isMultiSection = schedule.useMultipleSections && 
                             schedule.scheduleSections && 
                             schedule.scheduleSections.length > 0;

      if (isMultiSection) {
        await regenerateSlotsForMultiSectionSchedule(schedule, dayIndex);
      } else {
        await regenerateSlotsForLegacySchedule(schedule, dayIndex);
      }
    } catch (err) {
      console.error(
        `❌ Slot regen failed for doctor ${schedule.doctorId}`,
        err.message
      );
    }
  }
}

// 🆕 NEW: Regenerate slots for multi-section schedules
async function regenerateSlotsForMultiSectionSchedule(schedule, dayIndex) {
  let allSlots = [];

  for (const section of schedule.scheduleSections) {
    if (!section.isActive) continue;

    const sectionName = section.sectionName;

    // Morning session
    if (section.morningSession?.enabled && section.morningSession.selectedDays?.[dayIndex]) {
      const morningSlots = generateSlots(
        section.morningSession.start,
        section.morningSession.end,
        schedule.appointmentDuration // ✅ Use GLOBAL duration
      ).map(slot => ({
        ...slot,
        session: 'morning',
        sectionName,
      }));

      allSlots.push(...morningSlots);
    }

    // Evening session
    if (section.eveningSession?.enabled && section.eveningSession.selectedDays?.[dayIndex]) {
      const eveningSlots = generateSlots(
        section.eveningSession.start,
        section.eveningSession.end,
        schedule.appointmentDuration // ✅ Use GLOBAL duration
      ).map(slot => ({
        ...slot,
        session: 'evening',
        sectionName,
      }));

      allSlots.push(...eveningSlots);
    }
  }

  allSlots.sort((a, b) => a.start.localeCompare(b.start));
  schedule.dailySlots = allSlots;
  await schedule.save();
  
  console.log(`✅ Regenerated ${allSlots.length} slots for doctor ${schedule.doctorId} (multi-section)`);
}

// Legacy schedule regeneration (UNCHANGED from original)
async function regenerateSlotsForLegacySchedule(schedule, dayIndex) {
  let dailySlots = [];

  // ---------- MORNING SESSION ----------
  if (
    schedule.morningSession?.enabled &&
    schedule.morningSession.selectedDays?.[dayIndex]
  ) {
    const morningSlots = generateSlots(
      schedule.morningSession.start,
      schedule.morningSession.end,
      schedule.appointmentDuration
    );

    dailySlots.push(
      ...morningSlots.map(slot => ({
        ...slot,
        session: 'morning'
      }))
    );
  }

  // ---------- EVENING SESSION ----------
  if (
    schedule.eveningSession?.enabled &&
    schedule.eveningSession.selectedDays?.[dayIndex]
  ) {
    const eveningSlots = generateSlots(
      schedule.eveningSession.start,
      schedule.eveningSession.end,
      schedule.appointmentDuration
    );

    dailySlots.push(
      ...eveningSlots.map(slot => ({
        ...slot,
        session: 'evening'
      }))
    );
  }

  // Sort slots
  dailySlots.sort((a, b) => a.start.localeCompare(b.start));

  // 🔥 Hard overwrite – safe at midnight
  schedule.dailySlots = dailySlots;
  await schedule.save();
  
  console.log(`✅ Regenerated ${dailySlots.length} slots for doctor ${schedule.doctorId} (legacy)`);
}

// Slot generation helper (UNCHANGED from original)
function generateSlots(startTime, endTime, duration) {
  const slots = [];
  const durationMinutes = parseInt(duration.split(' ')[0]);

  const toDate = (timeStr) => {
    const [time, period] = timeStr.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };

  const toTime = (date) => {
    let h = date.getHours();
    const m = date.getMinutes();
    const p = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${p}`;
  };

  let current = toDate(startTime);
  const end = toDate(endTime);

  while (current < end) {
    const next = new Date(current.getTime() + durationMinutes * 60000);
    if (next <= end) {
      slots.push({
        start: toTime(current),
        end: toTime(next),
        isBooked: false,
        isLocked: false,
        lockedAt: null,
        lockExpiresAt: null
      });
    }
    current = next;
  }

  return slots;
}

module.exports = {
  regenerateDailySlots
};