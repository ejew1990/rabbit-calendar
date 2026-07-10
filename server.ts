import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Firestore } from "@google-cloud/firestore";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "src", "data", "db.json");

// Ensure db directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Memory-cached last updated timestamp to allow lightweight polling
let serverLastUpdated = Date.now();

let dbClient: Firestore | null = null;

function getFirestoreClient() {
  if (dbClient) return dbClient;

  // Option 1: Full service account JSON in one variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      dbClient = new Firestore({
        projectId: sa.project_id,
        credentials: {
          client_email: sa.client_email,
          private_key: sa.private_key.replace(/\\n/g, "\n"),
        },
      });
      console.log("🔥 Successfully initialized Firestore with Service Account JSON!");
      return dbClient;
    } catch (err) {
      console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", err);
    }
  }

  // Option 2: Separate environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (projectId) {
    try {
      const options: any = { projectId };
      if (privateKey && clientEmail) {
        options.credentials = {
          client_email: clientEmail,
          private_key: privateKey.replace(/\\n/g, "\n"),
        };
      }
      dbClient = new Firestore(options);
      console.log("🔥 Successfully initialized Firestore with individual environment variables!");
      return dbClient;
    } catch (err) {
      console.error("❌ Failed to initialize Firestore with env variables:", err);
    }
  }

  return null;
}

// Helper to load db
async function loadDb() {
  const firestore = getFirestoreClient();
  if (firestore) {
    try {
      const docRef = firestore.collection("bunny_family").doc("data");
      const doc = await docRef.get();
      if (doc.exists) {
        const data = doc.data();
        if (data && data.timestamp) {
          serverLastUpdated = data.timestamp;
        }
        console.log("📥 Loaded database from Cloud Firestore. Timestamp:", serverLastUpdated);
        return data;
      } else {
        console.log("ℹ️ No Firestore data document found, returning defaults...");
      }
    } catch (err) {
      console.error("❌ Failed to load from Firestore, falling back to local file:", err);
    }
  }

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
    appDescription: "同步家庭日程，管理共同待办，随时拉响萌趣提醒 ✨",
    passcode: "咚咚7777"
  };
}

// Helper to save db
async function saveDb(data: any) {
  serverLastUpdated = Date.now();
  const firestore = getFirestoreClient();

  if (firestore) {
    try {
      const docRef = firestore.collection("bunny_family").doc("data");
      const dataToSave = {
        ...data,
        timestamp: serverLastUpdated
      };
      await docRef.set(dataToSave);
      console.log("📤 Saved database to Cloud Firestore. Timestamp:", serverLastUpdated);
      return;
    } catch (err) {
      console.error("❌ Failed to save to Firestore, saving to local file as backup:", err);
    }
  }

  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
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
  app.get("/api/sync", async (req, res) => {
    const data = await loadDb();
    res.json({
      ...data,
      version: serverLastUpdated
    });
  });

  // POST `/api/sync`: update full state or individual collections with intelligent collision prevention
  app.post("/api/sync", async (req, res) => {
    const incoming = req.body;
    const current = await loadDb();
    const clientLastVersion = Number(incoming.clientLastVersion) || 0;

    // Smart merge collections to prevent overwrites from stale family members
    const smartMerge = (currentList: any[], incomingList: any[]) => {
      if (!incomingList) return currentList;
      if (!Array.isArray(currentList) || currentList.length === 0) {
        // If current is empty, all incoming are new
        const now = Date.now();
        return incomingList.map(item => ({ ...item, updatedAt: now }));
      }

      const now = Date.now();
      const incomingMap = new Map(incomingList.map(item => [item.id, item]));
      const mergedList: any[] = [];

      // 1. Process all incoming elements
      for (const incomingItem of incomingList) {
        const currentItem = currentList.find(x => x.id === incomingItem.id);
        if (currentItem) {
          // If the item exists, compare content to see if client actually modified it
          const hasChanged = JSON.stringify({ ...currentItem, updatedAt: undefined }) !== 
                             JSON.stringify({ ...incomingItem, updatedAt: undefined });
          mergedList.push({
            ...incomingItem,
            updatedAt: hasChanged ? now : (currentItem.updatedAt || now)
          });
        } else {
          // Brand new item added by this client
          mergedList.push({
            ...incomingItem,
            updatedAt: now
          });
        }
      }

      // 2. Process current elements that are missing from incoming (possible deletions)
      for (const currentItem of currentList) {
        if (!incomingMap.has(currentItem.id)) {
          const itemUpdatedAt = currentItem.updatedAt || 0;
          if (itemUpdatedAt > clientLastVersion) {
            // This item was added/edited by another family member AFTER this client's last sync!
            // The client did not know about it, so they omitted it. We MUST PRESERVE it to avoid wiping out others' work.
            mergedList.push(currentItem);
          } else {
            // The client did know about this item, but chose to omit it.
            // This is an intentional deletion. We let it be removed.
            console.log(`[SmartMerge] Intentional deletion of item: ${currentItem.id}`);
          }
        }
      }

      return mergedList;
    };

    // Apply smart merge to family collections
    const mergedMembers = smartMerge(current.members, incoming.members);
    const mergedEvents = smartMerge(current.events, incoming.events);
    const mergedTodos = smartMerge(current.todos, incoming.todos);
    const mergedAlerts = smartMerge(current.alerts, incoming.alerts);

    const updated = {
      ...current,
      ...incoming,
      members: mergedMembers,
      events: mergedEvents,
      todos: mergedTodos,
      alerts: mergedAlerts,
      timestamp: Date.now()
    };

    await saveDb(updated);
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
