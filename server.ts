import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const DB_PATH = path.join(process.cwd(), "src", "data", "db.json");

// Ensure db directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Memory-cached last updated timestamp to allow lightweight polling
let serverLastUpdated = Date.now();

// Helper to load db
function loadDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error loading DB, returning empty defaults:", err);
  }
  return {
    members: [],
    events: [],
    todos: [],
    alerts: [],
    activeMemberId: "member-2",
    appTitle: "兔兔家庭日历",
    appSubtitle: "共享小窝 🐰",
    appDescription: "同步蜜糖家庭日程，管理共同待办，随时拉响萌趣提醒 ✨",
    passcode: "咚咚7777"
  };
}

// Helper to save db
function saveDb(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
    serverLastUpdated = Date.now();
  } catch (err) {
    console.error("Error saving DB:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsers
  app.use(express.json({ limit: "10mb" }));

  // API endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // GET `/api/sync/version`: client checks this lightweight endpoint to see if they need to pull new data
  app.get("/api/sync/version", (req, res) => {
    res.json({ version: serverLastUpdated });
  });

  // GET `/api/sync`: load full state
  app.get("/api/sync", (req, res) => {
    const data = loadDb();
    res.json({
      ...data,
      version: serverLastUpdated
    });
  });

  // POST `/api/sync`: update full state or individual collections
  app.post("/api/sync", (req, res) => {
    const incoming = req.body;
    const current = loadDb();

    // Merge incoming keys with current DB content to support full or partial saves
    const updated = {
      ...current,
      ...incoming
    };

    saveDb(updated);
    res.json({
      status: "success",
      version: serverLastUpdated
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
