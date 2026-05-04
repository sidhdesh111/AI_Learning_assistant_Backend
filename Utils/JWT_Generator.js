import jwt from "jsonwebtoken";

// Token configuration
const ACCESS_TOKEN_EXPIRY = "15m"; // Short-lived access token
const REFRESH_TOKEN_EXPIRY = "7d"; // Long-lived refresh token

/**
 * Create JWT payload with token metadata
 * @param {Object} user - User object with userId and email
 * @param {string} type - Token type: "access" or "refresh"
 * @param {number} tokenVersion - Version number for token rotation
 */
const createPayload = (user, type, tokenVersion = 1) => {
    return {
        userId: user.userId,
        email: user.email,
        type,
        tokenVersion,
        iat: Math.floor(Date.now() / 1000)
    };
};

/**
 * Generate Access Token (short-lived, 15 minutes)
 * @param {Object} user - User object with userId and email
 * @param {number} tokenVersion - Token version for rotation tracking
 * @returns {string} JWT access token
 */
export const generateAccessToken = (user, tokenVersion = 1) => {
    try {
        return jwt.sign(
            createPayload(user, "access", tokenVersion),
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRY }
        );
    } catch (error) {
        throw new Error(`Failed to generate access token: ${error.message}`);
    }
};

/**
 * Generate Refresh Token (long-lived, 7 days)
 * @param {Object} user - User object with userId and email
 * @param {number} tokenVersion - Token version for rotation tracking
 * @returns {string} JWT refresh token
 */
export const generateRefreshToken = (user, tokenVersion = 1) => {
    try {
        return jwt.sign(
            createPayload(user, "refresh", tokenVersion),
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: REFRESH_TOKEN_EXPIRY }
        );
    } catch (error) {
        throw new Error(`Failed to generate refresh token: ${error.message}`);
    }
};

/**
 * Verify and decode token
 * @param {string} token - JWT token to verify
 * @param {string} type - Expected token type: "access" or "refresh"
 * @returns {Object} Decoded token payload
 */
export const verifyToken = (token, type = "access") => {
    try {
        const secret =
            type === "access"
                ? process.env.JWT_ACCESS_SECRET
                : process.env.JWT_REFRESH_SECRET;

        const decoded = jwt.verify(token, secret);

        if (decoded.type !== type) {
            throw new Error("Invalid token type");
        }

        return decoded;
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            throw new Error("Token has expired");
        } else if (error.name === "JsonWebTokenError") {
            throw new Error("Invalid token");
        } else {
            throw new Error(`Token verification failed: ${error.message}`);
        }
    }
};

/**
 * Decode token without verification (for inspection)
 * @param {string} token - JWT token to decode
 * @returns {Object} Decoded payload
 */
export const decodeToken = (token) => {
    try {
        return jwt.decode(token);
    } catch {
        throw new Error("Failed to decode token");
    }
};

/**
 * Get token expiration time
 * @param {string} token - JWT token
 * @returns {number} Expiration timestamp in seconds
 */
export const getTokenExpiration = (token) => {
    try {
        const decoded = jwt.decode(token);
        return decoded?.exp || null;
    } catch {
        return null;
    }
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if token is expired
 */
export const isTokenExpired = (token) => {
    const exp = getTokenExpiration(token);
    if (!exp) return true;
    return Math.floor(Date.now() / 1000) >= exp;
};

/**
 * Check if token is expiring soon (within 5 minutes)
 * @param {string} token - JWT token
 * @returns {boolean} True if token expires within 5 minutes
 */
export const isTokenExpiringSoon = (token) => {
    const exp = getTokenExpiration(token);
    if (!exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return (exp - now) < 300; // 5 minutes
};