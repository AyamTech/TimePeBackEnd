const Doctor = require("../models/doctorModel");

const jwt = require("jsonwebtoken");

class AuthService {
    static async getDoctorById(doctorId) {
        try {
            const doctor = await Doctor.findById(doctorId); // Fetch a doctor by ID
            if (!doctor) {
                throw new Error("Doctor not found");
            }
            return doctor;
        } catch (error) {
            throw new Error("Error fetching doctor: " + error.message);
        }
    }

    static async loginUser(phoneNumber, accessToken, deviceToken) {
        if (!phoneNumber) throw new Error("Phone number is required for login");
          if (!accessToken) throw new Error("Access token is required");
        
          const msg91Url = "https://control.msg91.com/api/v5/widget/verifyAccessToken";
          const msg91AuthKey = process.env.MSG91_AUTH_KEY;
        
          const response = await fetch(msg91Url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              authkey: msg91AuthKey,
              "access-token": accessToken,
            }),
          });
        
          console.log("MSG91 response status:", response.status);
          const result = await response.json();
          console.log("MSG91 response:", result);
        
          const user = await Doctor.findOne( {phoneNumber} );
          console.log("User found:", user);
          if (!user) throw new Error("User not found");
        
          // Add blocked check
        //   if (user.patient_status === "blocked") {
        //     throw new Error("User is blocked");
        //   }
        
      const newDoctorId = await generateDoctorUniqueId();
     console.log("Generated Doctor ID:", newDoctorId);
     const res = await Doctor.updateOne(
       {
         _id: user._id,
         $or: [
           { uniqueId: { $exists: false } },
           { uniqueId: null },
           { uniqueId: "" }
         ]
       },
       {
         $set: { uniqueId: newDoctorId }
       }
     );
     
     if (res.modifiedCount === 1) {
       console.log(
         `Generated patientUniqueId for user ${user._id}: ${newDoctorId}`
       );
     }
          //  Include tokenVersion in the token payload
          const token = jwt.sign(
            {
              id: user._id,
              tokenVersion: user.tokenVersion,
            },
            process.env.JWT_SECRET,
            { expiresIn: "30d" }
          );
        
          if (!Array.isArray(user.deviceTokens)) user.deviceTokens = [];
        
          if (!user.deviceTokens.includes(deviceToken)) {
            user.deviceTokens.push(deviceToken);
            await user.save();
          }
        
          if (response.status === 200) {
            return { token, message: "Login successful with OTP." };
          }
    }

    //temporary function to login user with phone number
    static async loginUserWithPhone(phoneNumber, deviceToken) {
        if (!phoneNumber) throw new Error("Phone number is required for login");

         // Check if user exists
        const user = await Doctor.findOne({ phoneNumber });
        if (!user) {
            throw new Error("Doctor not found");
        }
       
    // Initialize deviceTokens if it doesn't exist (for older records)
    if (!Array.isArray(user.deviceTokens)) {
        user.deviceTokens = [];
    }
    // Add the new device token if it's not already stored
    if (!user.deviceTokens.includes(deviceToken)) {
        user.deviceTokens.push(deviceToken);
        await user.save();
    }
        // Generate JWT token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        return { token,  message: "Login successfully."};

    }

    static async checkPhone(phoneNumber) {
      try {
        //const { phoneNumber } = req.body;
    
        // Validate input
        if (!phoneNumber) {
          throw new Error("Phone number is required for login");
        }
    
        // Check if user exists
        const user = await Doctor.findOne({ phoneNumber });
        if (!user) {
          throw new Error("User not found");
        }

        // (Optional) Simulate sending OTP here
        console.log(`Sending OTP to ${phoneNumber}...`);
    
        // Respond success
        return ({ message: "OTP sent successfully." });
      } catch (error) {
        console.error("Error checking phone number:", error);
        return ({ message: "Phone Number doesn't exist." });
      }
    }


    static async createUser(userData) {
        const { doctorName, email, phoneNumber, specialization, contactInformation, lat, long } = userData;
        if (!doctorName || !email || !phoneNumber || !specialization || !contactInformation) {
            throw new Error("Please fill all the fields for doctor");
        }
        const newUser = new Doctor({ 
          doctorName, 
          email, 
          phoneNumber, 
          specialization, 
          contactInformation,
          coordinates: {
            lat: lat || null,
            long: long || null
          },
        });
        return await newUser.save();
    }

    static async deleteUser(userId) {
        try {
          const doctor = await Doctor.findById(userId);
          if (!doctor) {
            throw new Error("Doctor not found");
          }
          await doctor.softDelete(); // Call the instance method to soft delete
          return { message: "Doctor deleted successfully" };
        } catch (error) {
          throw new Error("Error deleting doctor: " + error.message);
        }
      }
}
    

async function generateDoctorUniqueId() {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `TP-DOC-${year}-${random}`;
}


module.exports = AuthService;
