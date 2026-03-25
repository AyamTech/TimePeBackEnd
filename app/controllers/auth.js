const AuthService = require("../services/authService");
const UserService = require("../services/authService");

class AuthController {
    static async getDoctor(req, res) {
        try {
            const { id } = req.params; // Extract doctor ID from request parameters
            const doctor = await UserService.getDoctorById(id); // Call the service method
            res.status(200).json(doctor);
        } catch (error) {
            res.status(404).json({ message: error.message });
        }
    }

  static async createUser(req, res){
    try{
      console.log("received req to create user", req.body);

      const user = await UserService.createUser(req.body);
      console.log("user to be created is ", user);
      console.log("response", res);

      res.status(201).json(user);

    }catch (error){
      if (error.code === 11000) {
      return res.status(400).json({ message: "Account with this phone already exists." });
    }
      console.log("error", error);
      res.status(500).json({message: error.message});

    }
  }

  static async loginUser(req, res) {
    try {
      console.log("Received request to login", req.body);

      const { phoneNumber, accessToken, deviceToken } = req.body; // Extract phone number from request body
      const user= await UserService.loginUser(phoneNumber, accessToken, deviceToken); // Call the login method from UserService
      console.log("User to be logged in is ", user);

      res.status(200).json(user);
    } catch (error) {
      res.status(401).json({ message: error.message });
      console.log("error", error);
    }
  }

  static async loginUserWithPhone(req, res){
    try{
        console.log("Received request to login", req.body);
      const { phoneNumber, deviceToken } = req.body; // Extract phone number from request body
      const user= await UserService.loginUserWithPhone(phoneNumber, deviceToken); // Call the login method from UserService
      console.log("User to be logged in is ", user);
      res.status(200).json(user);
    } catch (error) {
      res.status(401).json({ message: error.message });
      console.log("error", error);
    }
  }

  static async checkPhone(req, res){
          try{
              console.log("Received request to login via phone", req.body);
              const {phoneNumber} = req.body;
              const user = await UserService.checkPhone(phoneNumber);
              console.log("User to be logged in is ", user);
  
              res.status(201).json(user);
          } catch(error){
              res.status(401).json(error.message);
              console.log("error", error);
          }
        }

      
      static async deleteUser(req, res) {
        try {
          const { id } = req.body; // Extract user ID from request parameters
          await UserService.deleteUser(id); // Call the delete method from UserService
          res.status(200).json({ message: "User deleted successfully" });
        } catch (error) {
          res.status(404).json({ message: error.message });
        }
      }

};
module.exports = AuthController;
