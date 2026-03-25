const jwt = require('jsonwebtoken');
const Patient = require('../models/patientModel');

const authenticatePatient = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized. Token missing.' });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const patient = await Patient.findById(decoded.id);
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found.' });
        }

        req.user = patient; // attach the authenticated user to request
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
};

// module.exports = authenticatePatient;


// const authenticatePatient = async (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;

//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return res.status(401).json({ message: "Unauthorized. Token missing." });
//     }

//     const token = authHeader.split(" ")[1];
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     const patient = await Patient.findById(decoded.id);

//     if (!patient) {
//       return res.status(404).json({ message: "Patient not found." });
//     }

//     // ✅ Check if tokenVersion matches
//     if (decoded.tokenVersion !== patient.tokenVersion) {
//       return res
//         .status(401)
//         .json({ message: "Session expired or access revoked." });
//     }

//     // ✅ Check if patient is blocked
//     if (patient.patient_status === "blocked") {
//       return res
//         .status(403)
//         .json({ message: "Account is blocked. Please contact support." });
//     }

//     req.user = patient;
//     next();
//   } catch (error) {
//     return res.status(401).json({ message: "Invalid or expired token." });
//   }
// };
module.exports = authenticatePatient;