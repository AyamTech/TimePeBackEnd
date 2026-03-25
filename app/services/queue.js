const Queue = require("../models/Queue");
const Appointment = require("../models/AppointmentsModel");
const SlotHistory = require("../models/slotHistory");
const AppointmentService = require("./appointment");


class QueueService {
  // ✅ Create queue and auto-generate appointment
  static async addPatientToQueue({ doctorId, timeSlot, patientId, symptom }) {
    if (!doctorId || !patientId || !timeSlot) {
      throw new Error("Doctor ID, Patient ID, and Time Slot are required.");
    }

    // Get the next queue position
    const lastQueueEntry = await Queue.findOne({ doctorId }).sort({ queuePosition: -1 });
    const nextPosition = lastQueueEntry ? lastQueueEntry.queuePosition + 1 : 1;

    // ✅ Step 1: Create the appointment
    // const appointment = await Appointment.create({
    //   doctorId,
    //   patientId,
    //   appointmentDate: new Date(),
    //   timeSlot,
    //   symptom,
    //   queuePosition, // Sync queue position
    //   status: "Scheduled",
    // });

    // ✅ Step 2: Create the queue entry linked to the appointment
    // const queueEntry = await Queue.create({
    //   doctorId,
    //   timeSlot,
    //   patientId,
    //   appointmentId: appointment._id, // Link to appointment
    //   slotStatus: "Waiting",
    //   queuePosition,
    // });

    // // ✅ Step 3: Update the appointment with queue details
    // appointment.queueId = queueEntry._id;
    // await appointment.save();

    // return { appointment, queueEntry };

    const appointmentData = {
        doctorId,
        patientId,
        appointmentDate: timeSlot.date,
        timeSlot: timeSlot.time,
        symptom,
        queuePosition: nextPosition,
        status: "Scheduled",
      };
      const {appointment} =  await AppointmentService.createAppointment(appointmentData);

    const queueEntry = await Queue.create({
        doctorId,
        timeSlot,
        patientId,
        appointmentId: appointment._id,
        slotStatus: "Waiting",
        queuePosition: nextPosition,
      });

      appointment.queueId = queueEntry._id;
      await appointment.save();

    return { appointment, queueEntry };
  }

  // ✅ Update current slot and move to the next patient
  static async updateSlotStatus(doctorId) {
    const currentSlot = await Queue.findOne({ doctorId, slotStatus: "Waiting" });
    if (!currentSlot) throw new Error("No active slots found for this doctor.");

    // Step 1: Mark the current slot as "Completed"
    currentSlot.slotStatus = "Completed";
    await currentSlot.save();

    // Step 2: Find and update the next slot to "Waiting"
    const nextSlot = await Queue.findOne({
      doctorId,
      queuePosition: currentSlot.queuePosition + 1,
    });
    if (nextSlot) {
      nextSlot.slotStatus = "Waiting";
      await nextSlot.save();
    }

    // Step 3: Log transition in SlotHistory
    await SlotHistory.create({
      doctorId,
      patientId: currentSlot.patientId,
      appointmentId: currentSlot.appointmentId,
      timeSlot: currentSlot.timeSlot,
      action: "Next",
    });

    return nextSlot || null;
  }

  // ✅ Fetch queue status
  static async getQueueStatus(doctorId) {
    return await Queue.find({ doctorId }).sort({ queuePosition: 1 });
  }
}

module.exports = QueueService;
