// ============================================
// EXAMPLE: How to integrate Token Rotation into server.js
// ============================================

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";

// Import middleware
import { protectedMiddleware } from "./Middleware/auth.js";
import tokenRotationMiddleware, { 
  checkTokenExpiryMiddleware,
  forceTokenRefreshMiddleware 
} from "./Middleware/tokenRotationMiddleware.js";

// Import routes
import authrouter from "./Routes/authRoutes.js";
import documentRoutes from "./Routes/documentRoutes.js";
// ... other route imports

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE SETUP
// ============================================

// Basic middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true, // Allow cookies
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ============================================
// TOKEN ROTATION MIDDLEWARE (Apply to all routes)
// ============================================

// 1. Check and auto-refresh tokens
app.use(tokenRotationMiddleware);

// 2. Add token expiry info to response headers
app.use(checkTokenExpiryMiddleware);

// ============================================
// ROUTES
// ============================================

// Public routes (no token required)
app.use("/api/auth", authrouter);

// Protected routes with automatic token refresh
app.use("/api/documents", documentRoutes);
// app.use("/api/quizzes", quizRoutes);
// app.use("/api/flashcards", flashcardRoutes);
// ... other protected routes

// ============================================
// OPTIONAL: Force token refresh for sensitive operations
// ============================================

// Force refresh every 1 hour (3600 seconds)
app.use("/api/admin", forceTokenRefreshMiddleware(3600), protectedMiddleware);

// Force refresh every 30 minutes (1800 seconds) for payment operations
app.use("/api/payments", forceTokenRefreshMiddleware(1800), protectedMiddleware);

// ============================================
// ADVANCED: Custom token refresh endpoint
// ============================================

app.post("/api/auth/refresh-token-manual", async (req, res) => {
  const { refreshToken } = req.body || req.cookies;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: "Refresh token required",
      statusCode: 401
    });
  }

  try {
    // Use the existing refreshTokenController logic
    const response = await fetch(`${req.get('origin')}/api/auth/refresh-token`, {
      method: "POST",
      headers: {
        "Cookie": `refreshToken=${refreshToken}`
      }
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Token refresh failed",
      statusCode: 500
    });
  }
});

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================

// Handle token errors
app.use((err, req, res, next) => {
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
      statusCode: 401
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
      requiresRefresh: true,
      statusCode: 401
    });
  }

  next(err);
});

// Generic error handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    statusCode: 500
  });
});

// ============================================
// SERVER STARTUP
// ============================================

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log("✅ Token rotation middleware is active");
  console.log("✅ Automatic token refresh enabled");
});

export default app;

// ============================================
// Additional Tips:
// ============================================

/*

1. ENVIRONMENT VARIABLES (.env):
   ==============================
   JWT_ACCESS_SECRET=your_long_random_access_secret_key_here
   JWT_REFRESH_SECRET=your_long_random_refresh_secret_key_here
   NODE_ENV=production
   FRONTEND_URL=http://localhost:5173
   PORT=3000

2. TESTING TOKEN ROTATION:
   ========================
   - Login and get tokens
   - Wait for access token to expire (15 min in dev, adjust for testing)
   - Make request with expired access token
   - Middleware should auto-refresh if still within 5-min warning window
   - Check response headers for X-Token-Refreshed

3. MONITORING:
   =============
   - Check database for tokenVersion changes
   - Monitor lastRefresh timestamps
   - Track loginHistory entries
   - Alert on tokenVersion increments > 1 (possible attack)

4. SECURITY HEADERS TO ADD:
   =========================
   app.use((req, res, next) => {
     res.setHeader('X-Content-Type-Options', 'nosniff');
     res.setHeader('X-Frame-Options', 'DENY');
     res.setHeader('X-XSS-Protection', '1; mode=block');
     res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
     next();
   });

5. RATE LIMITING FOR REFRESH ENDPOINT:
   =====================================
   import rateLimit from 'express-rate-limit';
   
   const refreshLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 20, // Limit each IP to 20 requests per windowMs
     message: 'Too many refresh attempts, please try again later'
   });
   
   app.post('/api/auth/refresh-token', refreshLimiter, refreshTokenController);

6. LOGGING TOKEN EVENTS:
   =======================
   // Add logging in middleware
   console.log(`[${new Date().toISOString()}] Token refreshed for user: ${req.user.id}`);
   console.log(`[${new Date().toISOString()}] Token rotation detected: v${oldVersion} -> v${newVersion}`);

*/
