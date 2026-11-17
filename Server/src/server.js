const businessRoutes = require("./routes/businessRoutes");
const profileRoutes = require("./routes/profileRoutes");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const authRoutes = require("./routes/authRoutes");
const queueRoutes = require("./routes/queueRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const staffQueueRoutes = require("./routes/staffQueueRoutes");
const predictionRoutes = require("./routes/predictionRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const businessAnalyticsRoutes = require("./routes/businessAnalyticsRoutes");
const businessDashboardRoutes = require("./routes/businessDashboardRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const doctorDashboardRoutes = require("./routes/doctorDashboardRoutes");
const adminBusinessRoutes = require("./routes/adminBusinessRoutes");
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes = require("./routes/taskRoutes");
const Queue = require("./models/Queue");
const Appointment = require("./models/Appointment");
const Doctor = require("./models/Doctor");

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// Middleware
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Socket.IO
const io = new Server(server, {
  cors: { origin: CLIENT_URL, credentials: true },
});

require("./services/realtimeService")(io);

app.set("io", io);

// Authentication routes
app.use("/api/auth", authRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/staff/queue", staffQueueRoutes);
app.use("/api/predictions", predictionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/analytics", businessAnalyticsRoutes);
app.use("/api/business/dashboard", businessDashboardRoutes);
app.use("/api/admin/business", adminBusinessRoutes);
app.use("/api/admin/services", serviceRoutes);
app.use("/api/admin/departments", departmentRoutes);
app.use("/api/admin/doctors", doctorRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/doctor/dashboard", doctorDashboardRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "QueueLess API is running 🚀",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// Root
app.get("/", (req, res) => {
  res.json({
    name: "QueueLess API",
    version: "1.0.0",
    status: "running",
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err.name, err.code || err.status || "");

  res.status(err.status || 500).json({
    success: false,
    message: err.status && err.status < 500 ? err.message : "Internal server error",
  });
});

// MongoDB
async function connectDatabase() {
  if (!process.env.MONGO_URI) {
    console.warn(
      "⚠️ MONGO_URI is not set. Starting QueueLess without MongoDB."
    );
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, process.env.MONGO_DB_NAME ? { dbName: process.env.MONGO_DB_NAME } : {});
    await Promise.all([Doctor.init(), Appointment.init(), Queue.init()]);
    console.log("🍃 MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

// Start
async function startServer() {
  await connectDatabase();

  server.listen(Number(PORT), () => {
    const { port } = server.address();
    console.log(`
🚀 QueueLess Server Started

📡 API:       http://localhost:${port}
❤️  Health:    http://localhost:${port}/api/health
🔌 Socket.IO: Ready
🍃 MongoDB:   ${
      mongoose.connection.readyState === 1 ? "Connected" : "Not configured"
    }
`);
  });
}

startServer();

// Graceful shutdown
async function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down QueueLess...`);

  io.close(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    console.log("👋 QueueLess server stopped.");
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
