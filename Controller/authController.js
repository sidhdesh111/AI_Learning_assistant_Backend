import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { validationResult } from "express-validator";
import UserModel from "../Model/User.Model.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../Middleware/Claudinary.js";
import {
    generateAccessToken,
    generateRefreshToken,
    verifyToken
} from "../Utils/JWT_Generator.js";

/**
 * Generate token pair (access + refresh)
 * Used during login and token rotation
 */
const generateTokenPair = (user, tokenVersion = 1) => {
    const tokenData = {
        userId: user._id,
        email: user.email
    };
    return {
        accessToken: generateAccessToken(tokenData, tokenVersion),
        refreshToken: generateRefreshToken(tokenData, tokenVersion)
    };
};

/**
 * Set token cookies in response
 */
const setTokenCookies = (res, accessToken, refreshToken, remember = false) => {
    const accessMaxAge = 15 * 60 * 1000; // 15 minutes
    const refreshMaxAge = remember ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000; // 30 days or 7 days

    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // true in production (HTTPS)
        sameSite: "strict",
        maxAge: accessMaxAge
    });

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: refreshMaxAge
    });
};

/**
 * Clear token cookies
 */
const clearTokenCookies = (res) => {
    res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    });
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    });
};


export const registerController = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array(),
            statusCode: 400
        });
    }
    const { username, name, email, password } = req.body;
    const profilePicture = req.file ? req.file.path : null;

    try {

        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Email already in use",
                statusCode: 400
            });
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        // Upload profile picture to Cloudinary if it exists
        let profilePictureUrl = null;
        if (profilePicture) {
            try {
                profilePictureUrl = await uploadToCloudinary(profilePicture);
                // Delete the local temporary file after uploading to Cloudinary
                fs.unlink(profilePicture, (err) => {
                    if (err) {
                        console.error("Error deleting temporary file:", err);
                    } else {
                        console.log("Temporary file deleted successfully");
                    }
                });
            }
            catch (error) {
                console.error("Error uploading to Cloudinary:", error);
                return res.status(500).json({
                    success: false,
                    message: "Error uploading profile picture",
                    statusCode: 500
                });
            }
        }


        const newUser = new UserModel({
            username,
            email,
            name,
            profilePicture: profilePictureUrl,
            password: hashedPassword,
        });
        await newUser.save();
        res.status(201).json({
            success: true,
            message: "User registered successfully",
            statusCode: 201
        });



    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
            statusCode: 500
        });
    }
}

export const loginController = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array(),
            message: "Validation failed",
            statusCode: 400
        });
    }
    const { email, password, rememberMe } = req.body;
    try {
        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password",
                errors: [{ msg: "Invalid email or password", param: "email" }],
                statusCode: 400
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password",
                errors: [{ msg: "Invalid email or password", param: "password" }],
                statusCode: 400
            });
        }

        // Generate new token pair with fresh version
        const { accessToken, refreshToken } = generateTokenPair(user, 1);

        // Update user with new tokens and metadata
        user.accessToken = accessToken;
        user.refreshToken = refreshToken;
        user.tokenVersion = 1; // Reset token version on login
        user.lastTokenRotation = new Date();
        user.isLoggedOut = false;

        // Track login history
        user.loginHistory.push({
            timestamp: new Date(),
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        // Keep only last 10 login attempts
        if (user.loginHistory.length > 10) {
            user.loginHistory = user.loginHistory.slice(-10);
        }

        await user.save();

        // Set cookies
        setTokenCookies(res, accessToken, refreshToken, rememberMe);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                name: user.name,
                profilePicture: user.profilePicture
            },
            statusCode: 200
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            success: false,
            message: "Server Error",
            errors: [{ msg: error.message || "Server Error" }],
            statusCode: 500
        });
    }
};

/**
 * Refresh Token Controller with Token Rotation
 * Implements token rotation: invalidates old tokens and issues new ones
 */
export const refreshTokenController = async (req, res) => {
    // Accept refresh token from cookies or request body
    const incomingRefreshToken = 
        req.cookies?.refreshToken || 
        req.body?.refreshToken ||
        req.headers?.authorization?.replace("Bearer ", "");

    if (!incomingRefreshToken) {
        return res.status(401).json({
            success: false,
            message: "Refresh token is required",
            statusCode: 401
        });
    }

    try {
        // Verify the refresh token
        let decoded;
        try {
            decoded = verifyToken(incomingRefreshToken, "refresh");
        } catch (err) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired refresh token",
                statusCode: 401
            });
        }

        const { userId, tokenVersion } = decoded;
        const user = await UserModel.findById(userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found",
                statusCode: 401
            });
        }

        // Check if user is logged out
        if (user.isLoggedOut) {
            return res.status(401).json({
                success: false,
                message: "User has been logged out. Please login again.",
                statusCode: 401
            });
        }

        // Verify token hasn't been tampered (check version and stored token)
        if (user.refreshToken !== incomingRefreshToken) {
            // Token mismatch - possible token reuse attack
            console.warn(`Possible token reuse attack detected for user: ${userId}`);
            
            // Invalidate all tokens by incrementing version
            user.tokenVersion += 1;
            user.refreshToken = null;
            user.accessToken = null;
            await user.save();

            return res.status(401).json({
                success: false,
                message: "Token validation failed. Please login again.",
                statusCode: 401
            });
        }

        // Check token version matches
        if (user.tokenVersion !== tokenVersion) {
            return res.status(401).json({
                success: false,
                message: "Token has been rotated. Please login again.",
                statusCode: 401
            });
        }

        // Token rotation: Generate new token pair
        const newTokenVersion = tokenVersion + 1;
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = 
            generateTokenPair(user, newTokenVersion);

        // Update user with rotated tokens
        user.accessToken = newAccessToken;
        user.refreshToken = newRefreshToken;
        user.tokenVersion = newTokenVersion;
        user.lastRefresh = new Date();

        await user.save();

        // Set new token cookies
        setTokenCookies(res, newAccessToken, newRefreshToken);

        return res.status(200).json({
            success: true,
            message: "Token refreshed successfully",
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            tokenRotation: true,
            statusCode: 200
        });

    } catch (error) {
        console.error("Token refresh error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Server Error",
            statusCode: 500
        });
    }
};

/**
 * Logout Controller
 * Invalidates tokens and clears session
 */
export const logoutController = async (req, res) => {
    try {
        const incomingRefreshToken = 
            req.cookies?.refreshToken || 
            req.body?.refreshToken;

        if (incomingRefreshToken) {
            try {
                const decoded = verifyToken(incomingRefreshToken, "refresh");
                const { userId } = decoded;
                const user = await UserModel.findById(userId);

                if (user) {
                    // Invalidate tokens
                    user.accessToken = null;
                    user.refreshToken = null;
                    user.isLoggedOut = true;
                    user.tokenVersion += 1; // Increment to invalidate any future attempts
                    await user.save();
                }
            } catch (err) {
                console.error("Error during logout token verification:", err);
                // Continue with logout even if token verification fails
            }
        }

        // Clear cookies
        clearTokenCookies(res);

        return res.status(200).json({
            success: true,
            message: "Logout successful",
            statusCode: 200
        });

    } catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({
            success: false,
            message: "Server Error",
            statusCode: 500
        });
    }
};

export const getProfileController = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
                statusCode: 404
            });
        }
        res.status(200).json({
            success: true,
            user,
            statusCode: 200
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
            statusCode: 500
        });
    }
}

export const updateProfileController = async (req, res) => {
    const { user_id } = req.params;
    const { username, name, email } = req.body;
    const profilePicture = req.file ? req.file.path : null;
    try {
        const user = await UserModel.findById(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
                statusCode: 404
            });
        }
        let profilePictureUrl = null;
        if (profilePicture) {
            try {
                // Delete old profile picture from Cloudinary if it exists
                if (user.profilePicture) {
                    await deleteFromCloudinary(user.profilePicture);
                }
                
                // Upload new profile picture to Cloudinary
                profilePictureUrl = await uploadToCloudinary(profilePicture);
                
                // Delete the local temporary file after uploading to Cloudinary
                fs.unlink(profilePicture, (err) => {
                    if (err) {
                        console.error("Error deleting temporary file:", err);
                    }
                    else {
                        console.log("Temporary file deleted successfully");
                    }
                });
            } catch (error) {
                console.error("Error uploading to Cloudinary:", error);
                return res.status(500).json({
                    success: false,
                    message: "Error uploading profile picture",
                    statusCode: 500
                });
            }
        }

        if (profilePictureUrl) {
            user.profilePicture = profilePictureUrl;
        }
        user.username = username || user.username;
        user.name = name || user.name;
        user.email = email || user.email;
        await user.save();
        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: {
                username: user.username,
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture
            },
            statusCode: 200
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
            statusCode: 500
        });
    }
}

export const deleteProfileController = async (req, res) => {
    try {
        const { user_id } = req.params;
        const user = await UserModel.findById(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
                statusCode: 404
            });
        }

        if (user.profilePicture) {
            try {
                await deleteFromCloudinary(user.profilePicture);
            } catch (error) {
                console.error("Error deleting profile picture from Cloudinary:", error);
                // Continue with deletion even if Cloudinary deletion fails
            }
        }


        await UserModel.findByIdAndDelete(user_id);
        res.status(200).json({
            success: true,
            message: "Profile deleted successfully",
            statusCode: 200
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
            statusCode: 500
        });
    }
}

export const changePasswordController = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const user = await UserModel.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
                statusCode: 404
            });
        }
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Current password is incorrect",
                statusCode: 400
            });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();
        res.status(200).json({
            success: true,
            message: "Password changed successfully",
            statusCode: 200
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
            statusCode: 500
        });
    }
}