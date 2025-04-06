// Load OpenTelemetry first - must be first import
const tracer = require("./tracing");
require("dotenv").config();

const express = require("express");
const { Pool } = require("pg");
const path = require("path");
const fs = require("fs");

// Initialize Express app
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "tododb",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
});

// Simple structured logger
const logger = {
  info: (message) => {
    const logEntry = {
      level: "info",
      message,
      timestamp: new Date().toISOString(),
      service: process.env.OTEL_SERVICE_NAME || "node-app",
    };
    console.log(JSON.stringify(logEntry));

    // Also log to file if LOG_FILE is set
    if (process.env.LOG_FILE) {
      fs.appendFileSync(process.env.LOG_FILE, JSON.stringify(logEntry) + "\n");
    }
  },
  error: (message, error) => {
    const logEntry = {
      level: "error",
      message: error ? `${message}: ${error.message}` : message,
      timestamp: new Date().toISOString(),
      service: process.env.OTEL_SERVICE_NAME || "node-app",
      stack: error ? error.stack : undefined,
    };
    console.error(JSON.stringify(logEntry));

    // Also log to file if LOG_FILE is set
    if (process.env.LOG_FILE) {
      fs.appendFileSync(process.env.LOG_FILE, JSON.stringify(logEntry) + "\n");
    }
  },
};

// Serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// API Routes
const api = express.Router();

// Get all todos
api.get("/todos", async (req, res) => {
  try {
    logger.info("Getting all todos");
    const result = await pool.query(
      "SELECT id, title, completed, created_at FROM todos ORDER BY id"
    );
    logger.info(`Retrieved ${result.rows.length} todos`);
    res.json(result.rows);
  } catch (err) {
    logger.error("Failed to get todos", err);
    res.status(500).json({ error: "Failed to get todos" });
  }
});

// Create a new todo
api.post("/todos", async (req, res) => {
  const { title, completed = false } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  try {
    logger.info(`Creating new todo: ${title}`);
    const result = await pool.query(
      "INSERT INTO todos (title, completed) VALUES ($1, $2) RETURNING id, title, completed, created_at",
      [title, completed]
    );
    logger.info(`Created todo with ID: ${result.rows[0].id}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error("Failed to create todo", err);
    res.status(500).json({ error: "Failed to create todo" });
  }
});

// Update a todo
api.put("/todos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { completed } = req.body;

  if (completed === undefined) {
    return res.status(400).json({ error: "Completed status is required" });
  }

  try {
    logger.info(`Updating todo ID: ${id}`);
    const result = await pool.query(
      "UPDATE todos SET completed = $1 WHERE id = $2 RETURNING *",
      [completed, id]
    );

    if (result.rowCount === 0) {
      logger.error(`Todo not found with ID: ${id}`);
      return res.status(404).json({ error: `Todo with ID ${id} not found` });
    }

    logger.info(`Updated todo ID: ${id}`);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    logger.error(`Failed to update todo with ID: ${id}`, err);
    res.status(500).json({ error: "Failed to update todo" });
  }
});

// Delete a todo
api.delete("/todos/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    logger.info(`Deleting todo ID: ${id}`);
    const result = await pool.query("DELETE FROM todos WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      logger.error(`Todo not found with ID: ${id}`);
      return res.status(404).json({ error: `Todo with ID ${id} not found` });
    }

    logger.info(`Deleted todo ID: ${id}`);
    res.status(204).send();
  } catch (err) {
    logger.error(`Failed to delete todo with ID: ${id}`, err);
    res.status(500).json({ error: "Failed to delete todo" });
  }
});

// Health check endpoint
api.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Register API routes
app.use("/api", api);

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
  logger.info(
    `OpenTelemetry service name: ${process.env.OTEL_SERVICE_NAME || "node-app"}`
  );
  logger.info(
    `OpenTelemetry endpoint: ${
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "default"
    }`
  );
});

// Handle shutdown gracefully
process.on("SIGINT", () => {
  logger.info("Shutting down server...");
  pool.end().then(() => {
    logger.info("Database connection closed");
    process.exit(0);
  });
});
