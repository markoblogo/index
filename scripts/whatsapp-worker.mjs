#!/usr/bin/env node
import { createServer } from "node:http";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import qrImage from "qrcode";
import qrcode from "qrcode-terminal";
import pkg from "whatsapp-web.js";

const { Client, LocalAuth } = pkg;

loadEnvFile(resolve(process.cwd(), ".env.whatsapp.local"));

const PORT = Number.parseInt(process.env.WHATSAPP_WORKER_PORT || "8787", 10);
const SECRET = process.env.WHATSAPP_WORKER_SECRET || process.env.SSI_WHATSAPP_WEBHOOK_SECRET;
const DEFAULT_GROUP_NAME = process.env.SSI_WHATSAPP_TARGET_GROUP_NAME || "SPIKE INDEX";
const DEFAULT_GROUP_ID = process.env.SSI_WHATSAPP_TARGET_GROUP_ID || "";
const SESSION_PATH = resolve(process.cwd(), process.env.WHATSAPP_SESSION_PATH || ".whatsapp-session");
const QR_PATH = resolve(process.cwd(), process.env.WHATSAPP_QR_PATH || "tmp/whatsapp-qr.png");

if (!SECRET) {
  console.error("Missing WHATSAPP_WORKER_SECRET or SSI_WHATSAPP_WEBHOOK_SECRET.");
  process.exit(1);
}

mkdirSync(SESSION_PATH, { recursive: true });

let ready = false;
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: SESSION_PATH }),
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true,
  },
});

client.on("qr", (qr) => {
  console.log("Scan this QR in WhatsApp -> Linked devices -> Link a device:");
  qrcode.generate(qr, { small: true });
  mkdirSync(resolve(QR_PATH, ".."), { recursive: true });
  qrImage.toFile(QR_PATH, qr, { margin: 2, scale: 8 })
    .then(() => console.log(`QR image saved to ${QR_PATH}`))
    .catch((error) => console.error("Failed to save QR image:", error));
});

client.on("ready", () => {
  ready = true;
  console.log(`WhatsApp worker ready. Default group: ${DEFAULT_GROUP_NAME}`);
});

client.on("auth_failure", (message) => {
  ready = false;
  console.error("WhatsApp auth failure:", message);
});

client.on("disconnected", (reason) => {
  ready = false;
  console.error("WhatsApp disconnected:", reason);
});

client.initialize();

createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/health") {
      return sendJson(response, 200, { ready, status: "ok" });
    }
    if (request.method !== "POST" || request.url !== "/send") {
      return sendJson(response, 404, { error: "Not found" });
    }

    const auth = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (auth !== SECRET) {
      return sendJson(response, 401, { error: "Unauthorized" });
    }
    if (!ready) {
      return sendJson(response, 503, { error: "WhatsApp client is not ready" });
    }

    const body = await readJson(request);
    const text = String(body.text || "").trim();
    const groupId = String(body.groupId || DEFAULT_GROUP_ID || "").trim();
    const groupName = String(body.groupName || DEFAULT_GROUP_NAME || "").trim();
    if (!text) {
      return sendJson(response, 400, { error: "Missing text" });
    }

    const chat = groupId ? await client.getChatById(groupId) : await findGroupByName(groupName);
    if (!chat) {
      return sendJson(response, 404, { error: "Group not found", groupName });
    }

    const sent = await chat.sendMessage(text);
    return sendJson(response, 200, {
      groupId: chat.id?._serialized,
      groupName: chat.name,
      messageId: sent.id?._serialized,
      status: "sent",
    });
  } catch (error) {
    return sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Unknown worker error",
    });
  }
}).listen(PORT, () => {
  console.log(`WhatsApp worker listening on http://localhost:${PORT}`);
});

async function findGroupByName(groupName) {
  const chats = await client.getChats();
  return chats.find((chat) => chat.isGroup && chat.name === groupName) || null;
}

function readJson(request) {
  return new Promise((resolveRequest, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 65_000) {
        request.destroy();
        reject(new Error("Payload too large"));
      }
    });
    request.on("end", () => {
      try {
        resolveRequest(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

function loadEnvFile(path) {
  try {
    const content = readFileSync(path, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // optional local env file
  }
}
