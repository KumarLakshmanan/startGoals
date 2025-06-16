import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sequelize from "./config/db.js";
import router from "./routes/router.js";
import { configurePassport } from "./utils/passport.js";
import passport from "passport";
import { autoSyncDatabase } from "./config/autoSyncDb.js"; // 👈 import sync function
import session from "express-session"; // Import express-session
import { Server } from "socket.io";
import initializeSocketIO from "./services/socketHandler.js";
import http from "http";
import requestLogger from "./middleware/requestLogger.js";

// to use  .env file atributes
dotenv.config();

const app = express();

// to convert the http request body to json type or as object
app.use(express.json());

// Serve static files for the web interface
app.use('/live-session/assets', express.static('web/assets'));

app.use(
  cors({
    origin: "*"
  })
);

app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PATCH, DELETE, OPTIONS');
  next();
});

app.use(express.json({ limit: '50mb' }));

// Request logging middleware
app.use(requestLogger);

//autoCreate();

// Use sessions for tracking login state
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

// Initialize Passport.js
configurePassport(passport);
app.use(passport.initialize());
app.use(passport.session());

// 🔄 Sync DB
app.get('/sync-db', (req, res) => {
  autoSyncDatabase()
    .then(() => {
      console.log("✅ Database synced successfully");
      res.status(200).json({ message: "Database synced successfully" });
      return;
    })
    .catch((err) => {
      console.error("💥 Failed to sync database:", err);
      res.status(500).json({ error: "Failed to sync database" });
      return;
    });
});

app.use("/api", router);

// Global error handler (must be after all routes)
import { globalErrorHandler, notFoundHandler } from './middleware/globalErrorHandler.js';

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://psychometrics.onrender.com",
      "http://startgoals.in",
      "https://startgoals.in",
    ],
    methods: ["GET", "POST"],
  },
});

initializeSocketIO(io);
app.set("io", io);

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.log(promise)
  console.error("⚠️ Unhandled Rejection at:" + promise + "reason:" + reason);
});

// Start the server using the HTTP server instance (for socket.io)
server.listen(process.env.SERVER_PORT, () => {
  console.log("🚀 Server running on PORT " + process.env.SERVER_PORT);
});