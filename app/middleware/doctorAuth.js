const jwt = require("jsonwebtoken");
const Doctor = require("../models/doctorModel");

const authenticateDoctor = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized. Token missing.' });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const doctor = await Doctor.findById(decoded.id);
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found.' });
        }

        req.user = doctor; // attach the authenticated user to request
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
};


module.exports = authenticateDoctor;
