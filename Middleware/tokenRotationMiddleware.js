import { verifyToken, isTokenExpiringSoon, getTokenExpiration } from "../Utils/JWT_Generator.js";
import UserModel from "../Model/User.Model.js";

/**
 * Token Rotation Middleware
 * 
 * This middleware:
 * 1. Checks if access token is expiring soon (within 5 minutes)
 * 2. Automatically refreshes tokens before expiration
 * 3. Attaches token refresh info to response for client-side handling
 * 4. Prevents unnecessary token rotations
 * 
 * Usage: Apply to protected routes for automatic token refresh
 */
export const tokenRotationMiddleware = async (req, res, next) => {
    try {
        const accessToken = req.cookies?.accessToken || 
                           req.headers?.authorization?.replace("Bearer ", "");

        if (!accessToken) {
            return next(); // Continue without token refresh
        }

        try {
            // Check if token is expiring soon
            if (!isTokenExpiringSoon(accessToken)) {
                return next(); // Token is still valid, continue
            }

            // Token is expiring soon, attempt refresh
            const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

            if (!refreshToken) {
                // No refresh token available, let the request continue
                // Client should handle expired token and refresh manually
                req.tokenRefreshNeeded = true;
                return next();
            }

            // Verify refresh token
            let decoded;
            try {
                decoded = verifyToken(refreshToken, "refresh");
            } catch (err) {
                // Refresh token is invalid, mark for client
                req.tokenRefreshNeeded = true;
                return next();
            }

            // Fetch user
            const user = await UserModel.findById(decoded.userId);
            if (!user || user.refreshToken !== refreshToken) {
                req.tokenRefreshNeeded = true;
                return next();
            }

            // Generate new tokens
            const { generateAccessToken, generateRefreshToken } = await import("../Utils/JWT_Generator.js");
            
            const newTokenVersion = user.tokenVersion + 1;
            const newAccessToken = generateAccessToken(
                { userId: user._id, email: user.email },
                newTokenVersion
            );
            const newRefreshToken = generateRefreshToken(
                { userId: user._id, email: user.email },
                newTokenVersion
            );

            // Update user with new tokens
            user.accessToken = newAccessToken;
            user.refreshToken = newRefreshToken;
            user.tokenVersion = newTokenVersion;
            user.lastRefresh = new Date();
            await user.save();

            // Update cookies
            const accessMaxAge = 15 * 60 * 1000; // 15 minutes
            const refreshMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

            res.cookie("accessToken", newAccessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: accessMaxAge
            });

            res.cookie("refreshToken", newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: refreshMaxAge
            });

            req.tokenRefreshed = true;

            // Add token refresh info to response headers
            res.set("X-Token-Refreshed", "true");

        } catch (error) {
            // Continue even if token refresh fails
            console.error("Error in token rotation middleware:", error);
        }

        next();
    } catch (error) {
        console.error("Unexpected error in token rotation middleware:", error);
        next();
    }
};

/**
 * Check Token Expiry Middleware
 * 
 * Validates token hasn't expired and provides expiration info
 * Useful for monitoring token lifecycle
 */
export const checkTokenExpiryMiddleware = (req, res, next) => {
    try {
        const accessToken = req.cookies?.accessToken;

        if (accessToken) {
            const exp = getTokenExpiration(accessToken);
            if (exp) {
                const now = Math.floor(Date.now() / 1000);
                const expiresIn = exp - now;
                
                // Attach token expiry info to response
                res.set("X-Token-Expires-In", expiresIn.toString());
                res.set("X-Token-Expiry", new Date(exp * 1000).toISOString());
                
                req.tokenExpiresIn = expiresIn;
            }
        }

        next();
    } catch (error) {
        console.error("Error checking token expiry:", error);
        next();
    }
};

/**
 * Force Token Refresh Middleware
 * 
 * Forces token refresh if token hasn't been refreshed within specified duration
 * Useful for periodic token rotation for additional security
 */
export const forceTokenRefreshMiddleware = (maxAgeSeconds = 3600) => {
    return async (req, res, next) => {
        try {
            const user = req.user; // Assumes protectedMiddleware has run first

            if (!user || !user.lastRefresh) {
                return next();
            }

            const lastRefreshTime = new Date(user.lastRefresh).getTime();
            const currentTime = Date.now();
            const timeSinceRefresh = (currentTime - lastRefreshTime) / 1000;

            if (timeSinceRefresh > maxAgeSeconds) {
                // Force token refresh
                req.forceTokenRefresh = true;
                res.status(401).json({
                    success: false,
                    message: "Token refresh required. Please refresh your token.",
                    requiresRefresh: true,
                    statusCode: 401
                });
            } else {
                next();
            }
        } catch (error) {
            console.error("Error in force token refresh middleware:", error);
            next();
        }
    };
};

export default tokenRotationMiddleware;
