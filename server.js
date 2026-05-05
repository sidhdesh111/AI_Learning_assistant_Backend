import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { ErrorHandler } from "./Middleware/errorHandler.js";
import { connectDB } from "./config/db_connect.js";
import { getUploadBaseDir, ensureUploadBaseDir } from "./config/uploadPaths.js";

import authrouter from "./Routes/authRoutes.js";
import documentRouter from "./Routes/documentRoutes.js";
import flashcardRouter from "./Routes/flashcardRoutes.js";
import airouter from "./Routes/aiRoutes.js";
import quizRouter from "./Routes/quizRoutes.js";
import progressRouter from "./Routes/progressRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ======================================================
// ENV CONFIG
// ======================================================

dotenv.config({ path: path.join(__dirname, ".env"), debug: false });

console.log("====================================");
console.log("ENV CHECK");
console.log("PORT:", process.env.PORT);
console.log("CLIENT_URL:", process.env.CLIENT_URL);
console.log("UPLOAD_DIR:", process.env.UPLOAD_DIR || "(default Backend/uploads)");
console.log("UPLOAD_BASE (resolved):", getUploadBaseDir());
console.log("VERCEL:", process.env.VERCEL ? "set (uploads use temp dir unless UPLOAD_DIR)" : "not set");
console.log(
  "MONGODB_URL:",
  process.env.MONGO_URL ? "FOUND ✅" : "MISSING ❌"
);
console.log(
  "JWT_SECRET:",
  process.env.JWT_ACCESS_SECRET ? "FOUND ✅" : "MISSING ❌"
);
console.log("====================================");

// ======================================================
// EXPRESS APP
// ======================================================

const app = express();
// Hostinger and other managed platforms run Express behind a reverse proxy.
// This enables correct client IP detection (needed by express-rate-limit).
app.set("trust proxy", 1);

// Fix URLs like https://host//uploads/... (double slash after host) so static + API routes match.
app.use((req, _res, next) => {
  if (typeof req.url !== "string" || !req.url.startsWith("//")) {
    return next();
  }
  const qIndex = req.url.indexOf("?");
  const pathOnly = qIndex === -1 ? req.url : req.url.slice(0, qIndex);
  const query = qIndex === -1 ? "" : req.url.slice(qIndex);
  req.url = `/${pathOnly.replace(/^\/+/u, "")}${query}`;
  next();
});

// ======================================================
// GLOBAL ERROR LOGGING
// ======================================================

process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION");
  console.error(err);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ UNHANDLED REJECTION");
  console.error(err);
});

connectDB();
ensureUploadBaseDir();

// ======================================================
// SECURITY
// ======================================================

app.use(
  helmet({
    // Allow the SPA (different origin) to embed PDFs served from this API.
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        frameAncestors: [
          process.env.CLIENT_URL || "https://ailearning.naranexus.com",
          "'self'",
        ],
        frameSrc: [
          process.env.CLIENT_URL || "https://ailearning.naranexus.com",
          "'self'",
          "blob:",
        ],
      },
    },
  })
);

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(morgan("dev"));

const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://ailearning.naranexus.com",
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server calls and same-origin browser requests.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS origin not allowed"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(cookieParser());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ======================================================
// STATIC FILES
// ======================================================

app.use(
  "/uploads",
  (req, res, next) => {
    res.header(
      "Access-Control-Allow-Origin",
      process.env.CLIENT_URL
    );
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Cross-Origin-Resource-Policy",
      "cross-origin"
    );
    next();
  },
  express.static(getUploadBaseDir())
);

// ======================================================
// TEST ROUTE
// ======================================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AI Learning Assistant Backend Running 🚀",
  });
});

// ======================================================
// API ROUTES
// ======================================================

app.use("/api/auth", authrouter);
app.use("/api/documents", documentRouter);
app.use("/api/flashcards", flashcardRouter);
app.use("/api/ai", airouter);
app.use("/api/quizzes", quizRouter);
app.use("/api/progress", progressRouter);

// ======================================================
// 404 ROUTE
// ======================================================

app.use((req, res) => {
  console.log("❌ Route Not Found:", req.originalUrl);

  res.status(404).json({
    success: false,
    message: "Route not found",
    route: req.originalUrl,
  });
});
// ======================================================
// ERROR HANDLER
// ======================================================

app.use(ErrorHandler);

// ======================================================
// SERVER
// ======================================================

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log("====================================");
  console.log(`✅ Server running on PORT ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log("====================================");
});