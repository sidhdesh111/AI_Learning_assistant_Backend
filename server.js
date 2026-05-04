import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";

import { ErrorHandler } from "./Middleware/errorHandler.js";
import connectDB from "./config/db_connect.js";
import authrouter from "./Routes/authRoutes.js";
import cookieParser from "cookie-parser";
import documentRouter from "./Routes/documentRoutes.js";
import flashcardRouter from "./Routes/flashcardRoutes.js";
import airouter from "./Routes/aiRoutes.js";
import quizRouter from "./Routes/quizRoutes.js";
import progressRouter from "./Routes/progressRoutes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// DB
connectDB();

// Security middleware with CSP configuration to allow iframe embedding from frontend
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      frameAncestors: [process.env.CLIENT_URL || "https://ailearning.naranexus.com", "'self'"],
      frameSrc: [process.env.CLIENT_URL || "https://ailearning.naranexus.com", "'self'", "blob:"],
    },
  },
}));

// Logging
app.use(morgan("dev"));

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(cookieParser())

// Body parser with increased limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files with CORS headers
app.use("/uploads", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.CLIENT_URL);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Cross-Origin-Resource-Policy", "cross-origin");
  next();
}, express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth/", authrouter);
app.use("/api/documents/", documentRouter);
app.use("/api/flashcards/", flashcardRouter);
app.use("/api/ai/", airouter);
app.use("/api/quizzes", quizRouter);
app.use("/api/progress", progressRouter)



// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

// Error handler (LAST)
app.use(ErrorHandler);

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});