/**
 * Graph Mind — Enterprise Backend Server
 * Hybrid GraphRAG, Knowledge Extraction & Decision Support API
 */

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple CORS header middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Mount API Routes
const apiRoutes = require("./routes/api");
app.use("/api", apiRoutes);

// Optional: Serve frontend in production build
const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));

// Root route
app.get("/api-status", (req, res) => {
  res.json({
    service: "Graph Mind Backend Engine",
    status: "online",
    version: "1.0.0",
    architecture: "Node.js / Express / Hybrid GraphRAG",
    endpoints: [
      "/api/health",
      "/api/signals",
      "/api/graph/entities",
      "/api/graph/entity/:id",
      "/api/graph/verify",
      "/api/copilot/ask",
      "/api/connectors",
      "/api/llmops"
    ]
  });
});

app.listen(PORT, () => {
  console.log(`[Graph Mind] Backend Engine running on http://localhost:${PORT}`);
  console.log(`[Graph Mind] API Health status at http://localhost:${PORT}/api/health`);
});
