import express from "express";
import { body, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";
import {
  registerController,
  loginController,
  getProfileController,
  updateProfileController,
  changePasswordController,
  deleteProfileController,
  logoutController,
  refreshTokenController
} from "../Controller/authController.js";
import { protectedMiddleware } from "../Middleware/auth.js";
import { createUpload } from "../Middleware/MulterMiddleware.js";

const authrouter = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication requests. Please try again later.",
    statusCode: 429
  }
});

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const validateRegister = [
  body("username").trim().isLength({ min: 3 }).withMessage("Username is required"),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 })
];

const loginValidation = [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty()
];


const upload = createUpload("profile-images");
// ALL Routes
authrouter.post("/register", authLimiter, upload.single("profilePicture"), validateRegister, handleValidationErrors, registerController);
authrouter.post("/login", authLimiter, loginValidation, handleValidationErrors, loginController);

authrouter.get("/profile", protectedMiddleware, getProfileController);
authrouter.put("/profile", protectedMiddleware, upload.single("profilePicture"), updateProfileController);
authrouter.delete("/profile", protectedMiddleware, deleteProfileController);

authrouter.put("/change-password", protectedMiddleware, changePasswordController);
authrouter.post("/refresh-token", authLimiter, refreshTokenController);
authrouter.post("/logout", authLimiter, logoutController);

export default authrouter;