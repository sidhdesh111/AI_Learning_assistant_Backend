import { generateAccessToken, generateRefreshToken, verifyToken } from "./JWT_Generator.js";
import UserModel from "../Model/User.Model.js";

/**
 * Token Refresh Manager Utility
 * Provides comprehensive token management functions
 */

/**
 * Refresh user tokens with rotation
 * @param {string} userId - User ID
 * @param {number} currentTokenVersion - Current token version
 * @returns {Promise<Object>} New tokens and user data
 */
export const refreshUserTokens = async (userId, currentTokenVersion) => {
    try {
        const user = await UserModel.findById(userId);

        if (!user) {
            throw new Error("User not found");
        }

        const newTokenVersion = currentTokenVersion + 1;

        const newAccessToken = generateAccessToken(
            { userId: user._id, email: user.email },
            newTokenVersion
        );

        const newRefreshToken = generateRefreshToken(
            { userId: user._id, email: user.email },
            newTokenVersion
        );

        user.accessToken = newAccessToken;
        user.refreshToken = newRefreshToken;
        user.tokenVersion = newTokenVersion;
        user.lastRefresh = new Date();

        await user.save();

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            tokenVersion: newTokenVersion,
            expiresIn: 15 * 60, // 15 minutes in seconds
            user: {
                id: user._id,
                email: user.email,
                username: user.username
            }
        };
    } catch (error) {
        throw new Error(`Token refresh failed: ${error.message}`);
    }
};

/**
 * Validate refresh token and check for attacks
 * @param {string} refreshToken - Token to validate
 * @param {string} userId - Expected user ID
 * @returns {Promise<boolean>} True if valid
 */
export const validateRefreshToken = async (refreshToken, userId) => {
    try {
        const decoded = verifyToken(refreshToken, "refresh");

        if (decoded.userId !== userId) {
            throw new Error("Token user mismatch");
        }

        const user = await UserModel.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        if (user.refreshToken !== refreshToken) {
            // Token mismatch - possible replay attack
            console.warn(`Possible token replay attack detected for user: ${userId}`);
            
            // Invalidate all tokens
            user.tokenVersion += 1;
            user.accessToken = null;
            user.refreshToken = null;
            await user.save();

            throw new Error("Token validation failed - possible replay attack");
        }

        if (user.tokenVersion !== decoded.tokenVersion) {
            throw new Error("Token has been rotated");
        }

        return true;
    } catch (error) {
        throw new Error(`Token validation failed: ${error.message}`);
    }
};

/**
 * Invalidate all user tokens (for logout or password change)
 * @param {string} userId - User ID to logout
 * @returns {Promise<void>}
 */
export const invalidateUserTokens = async (userId) => {
    try {
        const user = await UserModel.findById(userId);

        if (user) {
            user.accessToken = null;
            user.refreshToken = null;
            user.tokenVersion += 1;
            user.isLoggedOut = true;
            await user.save();
        }
    } catch (error) {
        throw new Error(`Token invalidation failed: ${error.message}`);
    }
};

/**
 * Revoke all sessions (invalidate tokens for all logins)
 * Used when user suspects account compromise
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const revokeAllSessions = async (userId) => {
    try {
        const user = await UserModel.findById(userId);

        if (user) {
            user.accessToken = null;
            user.refreshToken = null;
            user.tokenVersion += 10; // Large increment to invalidate many tokens
            user.isLoggedOut = true;
            user.loginHistory = []; // Clear login history
            await user.save();
        }
    } catch (error) {
        throw new Error(`Session revocation failed: ${error.message}`);
    }
};

/**
 * Get token metadata (expiration, status, etc.)
 * @param {string} token - JWT token
 * @param {string} type - Token type ('access' or 'refresh')
 * @returns {Object} Token metadata
 */
export const getTokenMetadata = (token, type = "access") => {
    try {
        const decoded = verifyToken(token, type);
        const now = Math.floor(Date.now() / 1000);

        return {
            userId: decoded.userId,
            email: decoded.email,
            type: decoded.type,
            tokenVersion: decoded.tokenVersion,
            issuedAt: new Date(decoded.iat * 1000),
            expiresAt: new Date(decoded.exp * 1000),
            expiresIn: decoded.exp - now,
            isExpired: decoded.exp < now,
            isExpiringSoon: (decoded.exp - now) < 300 // 5 minutes
        };
    } catch (error) {
        return {
            error: error.message,
            isValid: false
        };
    }
};

/**
 * Create response with tokens
 * Utility for consistent token response format
 * @param {Object} tokens - Token pair {accessToken, refreshToken}
 * @param {Object} user - User data
 * @returns {Object} Formatted response
 */
export const createTokenResponse = (tokens, user) => {
    return {
        success: true,
        message: "Tokens generated successfully",
        tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenType: "Bearer",
            expiresIn: 15 * 60 // 15 minutes
        },
        user: {
            id: user._id,
            email: user.email,
            username: user.username,
            name: user.name
        },
        statusCode: 200
    };
};

/**
 * Check if token requires refresh
 * @param {string} token - JWT token
 * @returns {boolean} True if token should be refreshed
 */
export const shouldRefreshToken = (token) => {
    try {
        const decoded = verifyToken(token);
        const now = Math.floor(Date.now() / 1000);
        const expiresIn = decoded.exp - now;

        // Refresh if less than 5 minutes remaining
        return expiresIn < 300;
    } catch {
        return true; // Refresh if token is invalid/expired
    }
};

/**
 * Get user login history
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of records to return
 * @returns {Promise<Array>} Login history
 */
export const getUserLoginHistory = async (userId, limit = 10) => {
    try {
        const user = await UserModel.findById(userId).select("loginHistory");
        if (!user) {
            throw new Error("User not found");
        }

        return user.loginHistory.slice(-limit).reverse();
    } catch (error) {
        throw new Error(`Failed to fetch login history: ${error.message}`);
    }
};

/**
 * Clear old login history entries
 * @param {string} userId - User ID
 * @param {number} keepLast - Number of recent entries to keep
 * @returns {Promise<void>}
 */
export const clearOldLoginHistory = async (userId, keepLast = 10) => {
    try {
        const user = await UserModel.findById(userId);
        if (user && user.loginHistory.length > keepLast) {
            user.loginHistory = user.loginHistory.slice(-keepLast);
            await user.save();
        }
    } catch (error) {
        throw new Error(`Failed to clear login history: ${error.message}`);
    }
};

/**
 * Batch refresh tokens for multiple users (admin utility)
 * @param {Array<string>} userIds - Array of user IDs
 * @returns {Promise<Object>} Results of token refresh
 */
export const batchRefreshTokens = async (userIds) => {
    const results = {
        successful: [],
        failed: []
    };

    for (const userId of userIds) {
        try {
            const user = await UserModel.findById(userId);
            if (user) {
                const newTokenVersion = (user.tokenVersion || 0) + 1;
                
                const newAccessToken = generateAccessToken(
                    { userId: user._id, email: user.email },
                    newTokenVersion
                );

                const newRefreshToken = generateRefreshToken(
                    { userId: user._id, email: user.email },
                    newTokenVersion
                );

                user.accessToken = newAccessToken;
                user.refreshToken = newRefreshToken;
                user.tokenVersion = newTokenVersion;
                await user.save();

                results.successful.push({
                    userId,
                    newTokenVersion,
                    refreshedAt: new Date()
                });
            }
        } catch (error) {
            results.failed.push({
                userId,
                error: error.message
            });
        }
    }

    return results;
};

export default {
    refreshUserTokens,
    validateRefreshToken,
    invalidateUserTokens,
    revokeAllSessions,
    getTokenMetadata,
    createTokenResponse,
    shouldRefreshToken,
    getUserLoginHistory,
    clearOldLoginHistory,
    batchRefreshTokens
};
