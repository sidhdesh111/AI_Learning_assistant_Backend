import mongoose from "mongoose";

const BASE_RETRY_MS = Number(process.env.DB_RETRY_MS || 5000);
const MAX_RETRY_MS = Number(process.env.DB_MAX_RETRY_MS || 30000);
let reconnectTimer = null;
let isConnecting = false;

const logDbConnected = () => {
  console.log("====================================");
  console.log("✅ MongoDB Connected Successfully");
  console.log("HOST:", mongoose.connection.host);
  console.log("DATABASE:", mongoose.connection.name);
  console.log("====================================");
};

const getRetryDelay = (attempt) =>
  Math.min(BASE_RETRY_MS * Math.max(attempt, 1), MAX_RETRY_MS);

const scheduleReconnect = (attempt = 1) => {
  if (reconnectTimer || isConnecting) return;

  const retryDelay = getRetryDelay(attempt);
  console.log(`🔁 Retrying DB connection in ${Math.round(retryDelay / 1000)}s...`);
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    await connectDB(attempt + 1);
  }, retryDelay);
};

export const connectDB = async (attempt = 1) => {
  if (!process.env.MONGO_URL) {
    console.error("❌ MONGO_URL is missing. DB connection skipped.");
    return;
  }

  if (mongoose.connection.readyState === 1) return;
  if (isConnecting) return;

  isConnecting = true;

  try {
    await mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1,
      retryWrites: true,
      bufferCommands: false,
      autoIndex: false,
    });

    logDbConnected();
  } catch (error) {
    console.error("====================================");
    console.error("❌ MongoDB Connection Failed");
    console.error(error.message);
    console.error("====================================");
    scheduleReconnect(attempt);
  } finally {
    isConnecting = false;
  }
};

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB disconnected");
  scheduleReconnect(1);
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB runtime error:", err.message);
});