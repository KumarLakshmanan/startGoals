import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sequelize from "./config/db.js";
import router from "./routes/router.js";
import { configurePassport } from "./utils/passport.js";
import passport from "passport";
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
    origin: [
      "https://startgoals.netlify.app/",
      "http://localhost:3030",
      "http://localhost:5173",
      "https://psychometrics.onrender.com",
      "http://startgoals.in",
      "https://startgoals.in",
    ],
    credentials: true,
  })
);

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

// 🔄 Manual DB Sync
import { getModels, syncModels, serveSyncDbPage } from './config/manualSyncDb.js';
import { syncDbMiddleware } from './middleware/syncDbMiddleware.js';
import { createRequiredTables, createTablesHandler } from './utils/createRequiredTables.js';

// Serve the sync-db HTML page
app.get('/sync-db', syncDbMiddleware, (req, res) => {
  serveSyncDbPage(req, res);
});

// API endpoint to create required tables
app.post('/create-required-tables', syncDbMiddleware, createTablesHandler);
// API to get all database models and their fields
app.get('/db-models', syncDbMiddleware, async (req, res) => {
  try {
    const models = await getModels();
    return sendSuccess(res, 200, "Fetched database models successfully", models);
  } catch (error) {
    console.error("Failed to fetch database models:", error);
    return sendServerError(res, error);
  }
});

// API to synchronize selected models and fields
app.post('/sync-db', syncDbMiddleware, async (req, res) => {
  try {
    const { models, options } = req.body;

    console.log('Received sync request with models:', JSON.stringify(models, null, 2));
    console.log('Received sync request with options:', JSON.stringify(options, null, 2));

    if (!models || !Array.isArray(models) || models.length === 0) {
      return res.status(200).json({
        status: false,
        success: false,
        message: "Please select at least one model to synchronize",
        logs: ["Error: No models selected"],
        error: "No models selected"
      });
    }

    console.log(`Starting manual database sync with options:`, options);
    const result = await syncModels(models, options);

    // Always return a consistent response
    return res.status(200).json({
      status: result.status,
      success: result.success,
      message: result.message,
      logs: result.logs,
      error: result.error || null
    });
  } catch (error) {
    console.error("💥 Failed to sync database:", error);
    return res.status(200).json({
      status: false,
      success: false,
      message: error.message || "Failed to sync database",
      logs: [error.message],
      error: error.message
    });
  }
});

app.use("/api", router);

// Global error handler (must be after all routes)
import { globalErrorHandler, notFoundHandler } from './middleware/globalErrorHandler.js';
import { sendSuccess, sendError } from "./utils/responseHelper.js";

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler (must be last)
// app.use(globalErrorHandler);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "https://startgoals.netlify.app/",
      "http://localhost:3030",
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
const startServer = async () => {
  try {
    // First, create required tables to ensure they exist
    console.log('Creating required tables...');
    const tablesResult = await createRequiredTables();
    if (tablesResult.success) {
      console.log('✅ Required tables created or verified successfully');
    } else {
      console.error('⚠️ Error creating required tables:', tablesResult.error);
      // Continue server startup even if table creation fails
    }

    // Start the server
    server.listen(process.env.SERVER_PORT, () => {
      console.log("🚀 Server running on PORT " + process.env.SERVER_PORT);
    });
  } catch (error) {
    console.error('💥 Server startup error:', error);
    process.exit(1);
  }
};

startServer();