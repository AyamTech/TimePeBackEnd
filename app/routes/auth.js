const express = require("express");
const AuthController = require("../controllers/auth");
const router = express.Router();

// Existing routes...
router.post("/login", AuthController.loginUser);
router.post("/create", AuthController.createUser);
router.post("/login-otp", AuthController.loginUserWithPhone);
router.post("/check-phone", AuthController.checkPhone);
// New route to get a doctor by ID
router.get("/doctors/:id", AuthController.getDoctor);
router.put("/delete", AuthController.deleteUser);

module.exports = router;
