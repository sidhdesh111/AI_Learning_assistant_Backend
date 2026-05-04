import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";

import { ErrorHandler } from "./Middleware/errorHandler.js";

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

dotenv.config({ path: path.join(__dirname, ".env") });

console.log("====================================");
console.log("ENV CHECK");
console.log("PORT:", process.env.PORT);
console.log("CLIENT_URL:", process.env.CLIENT_URL);
console.log(
  "MONGODB_URI:",
  process.env.MONGO_URI ? "FOUND ✅" : "MISSING ❌"
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

// ======================================================
// DATABASE CONNECTION
// ======================================================

const DB_RETRY_MS = Number(process.env.DB_RETRY_MS || 10000);
let dbRetryTimer = null;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log("====================================");
    console.log("✅ MongoDB Connected Successfully");
    console.log("HOST:", conn.connection.host);
    console.log("DATABASE:", conn.connection.name);
    console.log("====================================");
    if (dbRetryTimer) {
      clearTimeout(dbRetryTimer);
      dbRetryTimer = null;
    }
  } catch (error) {
    console.error("====================================");
    console.error("❌ MongoDB Connection Failed");
    console.error(error.message);
    console.error("====================================");
    if (!dbRetryTimer) {
      dbRetryTimer = setTimeout(async () => {
        dbRetryTimer = null;
        await connectDB();
      }, DB_RETRY_MS);
      console.log(`🔁 Retrying DB connection in ${DB_RETRY_MS / 1000}s...`);
    }
  }
};

connectDB();

// ======================================================
// SECURITY
// ======================================================

app.use(
  helmet({
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
  express.static(path.join(__dirname, "uploads"))
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