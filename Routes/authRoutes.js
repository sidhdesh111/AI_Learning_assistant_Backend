import express from "express";
import { body, validationResult } from "express-validator";
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
authrouter.post("/register", upload.single("profilePicture"), validateRegister, handleValidationErrors, registerController);
authrouter.post("/login", loginValidation, handleValidationErrors, loginController);

authrouter.get("/profile", protectedMiddleware, getProfileController);
authrouter.put("/profile", protectedMiddleware, upload.single("profilePicture"), updateProfileController);
authrouter.delete("/profile", protectedMiddleware, deleteProfileController);

authrouter.put("/change-password", protectedMiddleware, changePasswordController);
authrouter.post("/refresh-token", refreshTokenController);
authrouter.post("/logout", logoutController);

export default authrouter;