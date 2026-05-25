const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");
const logger = require("./middleware/logger.js");

// Load environment variables
dotenv.config();

// Import database connection
const connectDB = require("./config/db");

// Connect to database
connectDB();

// Initialize Express app
const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:8080"],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
});
app.use("/api", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging middleware
app.use(logger);

// Static file serving for images
app.use("/images", express.static(path.join(__dirname, "public/images")));

// API Routes
const apiBase = process.env.API_BASE_URL || "/api/v1";

// Welcome route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Amixa AI Server API",
    version: process.env.API_VERSION || "v1",
    documentation: `${req.protocol}://${req.get("host")}${apiBase}/docs`,
    endpoints: {
      health: "/health",
      api: apiBase,
    },
  });
});

// Import and use route modules
app.use(`${apiBase}/auth`, require("./routes/authRoutes"));
app.use(`${apiBase}/images`, require("./routes/imageRoutes"));
app.use(`${apiBase}/videos`, require("./routes/videoRoutes"));
app.use(`${apiBase}/history`, require("./routes/historyRoutes"));
app.use(`${apiBase}/liked`, require("./routes/likedRoutes"));
app.use(`${apiBase}/download`, require("./routes/downloadRoutes"));
app.use(`${apiBase}/credits`, require("./routes/creditRoutes"));
app.use(`${apiBase}/transactions`, require("./routes/transactionRoutes"));
app.use(`${apiBase}/dashboard`, require("./routes/dashboardRoutes"));
app.use(`${apiBase}/admin`, require("./routes/adminRoutes"));
app.use(`${apiBase}/payments`, require("./routes/paymentRoutes"));

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`
🚀 Amixa AI Server is running!
🌐 Port: ${PORT}
🔗 URL: http://localhost:${PORT}
📚 API Base: ${apiBase}`);
});

module.exports = app;
