import express from "express";
import { verifyToken } from "../Utils/JWT_Generator.js";
import UserModel from "../Model/User.Model.js";

export const protectedMiddleware = async (req, res, next) => {
    // Skip authentication for OPTIONS (CORS preflight) requests
    if (req.method === "OPTIONS") {
        return next();
    }

    const authHeader = req.headers.authorization;
    
    // console.log("[Auth Middleware]", {
    //     method: req.method,
    //     url: req.url,
    //     hasAuthHeader: !!authHeader,
    //     headerValue: authHeader ? authHeader.substring(0, 20) + "..." : "NONE",
    // });
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.warn("[Auth Middleware] Missing or invalid Bearer token");
        return res.status(401).json({
            success: false,
            message: "Unauthorized. No token provided.",
            statusCode: 401
        });
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix
    
    try {
        const decoded = verifyToken(token, "access");
        const user = await UserModel.findById(decoded.userId);
        
        if (!user) {
            console.warn("[Auth Middleware] User not found for token");
            return res.status(401).json({
                success: false,
                message: "User not found.",
                statusCode: 401
            });
        }
        
        req.user = user;
   //     console.log("[Auth Middleware] Token verified successfully for user:", user._id);
        next(); // Continue to next middleware/route
    } catch (error) {
        console.error("[Auth Middleware] Token verification failed:", error.message);
        return res.status(401).json({
            success: false,
            message: "Invalid token",
            statusCode: 401
        });
    }
};