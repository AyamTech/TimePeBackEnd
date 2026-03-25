 const Appointment = require('../models/AppointmentsModel');
 
 const markCheckIn = async (appointmentId) => {
  try {
    // Check appointment existence
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      throw new Error("Appointment not found.");
    }

    console.log("Marking check-in for appointment:", appointmentId);

    const {autoCheckin} = require('../utils/firebase/notification');
    // Update check-in only
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        checkIn: true,
        checkInTime: new Date()  // optional but recommended
      },
      { new: true }
    );

    autoCheckin(appointment.patientId);

    console.log("✅ Check-in marked:", updatedAppointment);
    return updatedAppointment;

  } catch (error) {
    console.error("❌ Error in markCheckIn:", error.message);
    throw error;
  }
}

module.exports = { markCheckIn };