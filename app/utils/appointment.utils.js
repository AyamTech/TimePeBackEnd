const { getTodayRange } = require("./date.utils");
const { compareTimeStrings } = require("./time.utils");

const getTodaysActiveOrPendingAppointments = async ({
  AppointmentModel,
  doctorId,
  statuses = ["Active", "Pending"]
}) => {
  try {
    const { startOfDay, endOfDay } = getTodayRange();

    const todayAppointments = await AppointmentModel.find({
      doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: statuses }
    })
      .populate(
        "patientId",
        "name contactInformation dateOfBirth email gender phoneNumber symptoms emergencyDuration createdAt"
      )
      .select(
        "patientId appointmentDate startTime endTime timeSlot status checkIn latitude longitude symptom currentStart currentEnd emergencyDuration"
      );

    // Sort by startTime
    todayAppointments.sort((a, b) =>
      compareTimeStrings(a.startTime, b.startTime)
    );

    const formattedAppointments = todayAppointments.map((appointment) => ({
      _id: appointment._id,
      appointmentObj: {
        appointmentDate: appointment.appointmentDate,
        timeSlot: appointment.timeSlot,
        status: appointment.status,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        checkIn: appointment.checkIn,
        latitude: appointment.latitude,
        longitude: appointment.longitude,
        symptom: appointment.symptom,
        currentStart: appointment.currentStart,
        currentEnd: appointment.currentEnd,
        emergencyDuration: appointment.emergencyDuration,
        patient: appointment.patientId
          ? {
              _id: appointment.patientId._id,
              name: appointment.patientId.name,
              contactInformation: appointment.patientId.contactInformation,
              dateOfBirth: appointment.patientId.dateOfBirth,
              email: appointment.patientId.email,
              gender: appointment.patientId.gender,
              phoneNumber: appointment.patientId.phoneNumber,
              symptoms: appointment.symptom,
              createdAt: appointment.patientId.createdAt,
              emergencyDuration: appointment.patientId.emergencyDuration
            }
          : null
      }
    }));

    return {
      appointmentCount: formattedAppointments.length,
      appointments: formattedAppointments
    };
  } catch (error) {
    console.error("Error fetching active/pending appointments:", error);
    throw error;
  }
};

module.exports = {
  getTodaysActiveOrPendingAppointments
};
