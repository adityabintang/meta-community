import "dotenv/config";
import http from "node:http";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createWriteStream } from "node:fs";
import { randomBytes } from "node:crypto";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const PORT = Number(process.env.AUTH_PORT || 3001);
const D1_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const D1_DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID;
const D1_API_TOKEN = process.env.CLOUDFLARE_D1_API_TOKEN;
const JWT_SECRET = process.env.AUTH_JWT_SECRET || "dev-auth-jwt-secret";
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || "";
const ADMIN_EMAILS = new Set(
  (process.env.BETTER_AUTH_ADMIN_EMAILS || "adityabintang149@gmail.com")
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean),
);
const ALLOWED_ORIGINS = (
  process.env.BETTER_AUTH_TRUSTED_ORIGINS || "http://localhost:8080"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const R2_S3_ENDPOINT = process.env.R2_S3_ENDPOINT || "";
const R2_BUCKET = process.env.R2_BUCKET || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL || "";
const R2_UPLOAD_PREFIX = process.env.R2_UPLOAD_PREFIX || "uploads";

const canUseR2 =
  Boolean(R2_S3_ENDPOINT) &&
  Boolean(R2_BUCKET) &&
  Boolean(R2_ACCESS_KEY_ID) &&
  Boolean(R2_SECRET_ACCESS_KEY);

const r2Client = canUseR2
  ? new S3Client({
      region: "auto",
      endpoint: R2_S3_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })
  : null;

const D1_API_URL =
  D1_ACCOUNT_ID && D1_DATABASE_ID
    ? `https://api.cloudflare.com/client/v4/accounts/${D1_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`
    : null;

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  const isAllowedOrigin = origin && ALLOWED_ORIGINS.includes(origin);

  if (isAllowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization, x-requested-with");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

function buildR2PublicUrl(objectKey) {
  if (R2_PUBLIC_BASE_URL) {
    return `${R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${objectKey}`;
  }

  const endpoint = R2_S3_ENDPOINT.replace(/\/$/, "");
  return `${endpoint}/${R2_BUCKET}/${objectKey}`;
}

async function uploadImageToR2(file) {
  if (!r2Client) {
    return null;
  }

  const ext = path.extname(file.filename || "") || ".jpg";
  const dateSegment = new Date().toISOString().slice(0, 10);
  const prefix = R2_UPLOAD_PREFIX.replace(/^\/+|\/+$/g, "");
  const objectKey = `${prefix}/${dateSegment}/${randomBytes(16).toString("hex")}${ext}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: objectKey,
      Body: file.data,
      ContentType: file.type || "application/octet-stream",
      CacheControl: "public, max-age=31536000",
    }),
  );

  return {
    key: objectKey,
    url: buildR2PublicUrl(objectKey),
  };
}

async function getR2Object(objectKey) {
  if (!r2Client) {
    return null;
  }

  const response = await r2Client.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: objectKey,
    }),
  );

  if (!response.Body) {
    return null;
  }

  let bodyBuffer;
  if (typeof response.Body.transformToByteArray === "function") {
    const bytes = await response.Body.transformToByteArray();
    bodyBuffer = Buffer.from(bytes);
  } else {
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    bodyBuffer = Buffer.concat(chunks);
  }

  return {
    body: bodyBuffer,
    contentType: response.ContentType || "application/octet-stream",
    cacheControl: response.CacheControl || "public, max-age=31536000",
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON payload"));
      }
    });

    req.on("error", reject);
  });
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function createToken(payload) {
  const header = { alg: "HS256", typ: "JWT" };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  return `${headerB64}.${payloadB64}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const expectedSignature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  if (expectedSignature !== signatureB64) {
    return null;
  }

  try {
    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson);

    if (payload?.exp && Number(payload.exp) < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function getRequestUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== "string") {
    return null;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return null;
  }

  return verifyToken(match[1]);
}

function getOwnershipFilter(columns, user) {
  if (!columns || !user) {
    return null;
  }

  const emailColumns = [
    "ownerEmail",
    "owner_email",
    "authorEmail",
    "author_email",
    "createdByEmail",
    "created_by_email",
    "userEmail",
    "user_email",
  ];

  for (const columnName of emailColumns) {
    if (columns.has(columnName) && user.email) {
      return { clause: `${columnName} = ?`, params: [String(user.email).toLowerCase()] };
    }
  }

  const idColumns = [
    "ownerId",
    "owner_id",
    "authorId",
    "author_id",
    "createdBy",
    "created_by",
    "userId",
    "user_id",
  ];

  const userId = user.sub ?? user.id;
  for (const columnName of idColumns) {
    if (columns.has(columnName) && userId) {
      return { clause: `${columnName} = ?`, params: [String(userId)] };
    }
  }

  return null;
}

function isRowOwnedByUser(row, user) {
  if (!row || !user) {
    return false;
  }

  const userEmail = typeof user.email === "string" ? user.email.toLowerCase() : "";
  const userId = user.sub ?? user.id;

  const rowEmails = [
    row.ownerEmail,
    row.owner_email,
    row.authorEmail,
    row.author_email,
    row.createdByEmail,
    row.created_by_email,
    row.userEmail,
    row.user_email,
  ]
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => String(value).toLowerCase());

  if (userEmail && rowEmails.includes(userEmail)) {
    return true;
  }

  const rowIds = [
    row.ownerId,
    row.owner_id,
    row.authorId,
    row.author_id,
    row.createdBy,
    row.created_by,
    row.userId,
    row.user_id,
  ]
    .filter((value) => value !== undefined && value !== null && String(value).trim() !== "")
    .map((value) => String(value));

  if (userId && rowIds.includes(String(userId))) {
    return true;
  }

  return false;
}

function getStatusFilterFromWhere(urlParams) {
  const rawWhere = urlParams.get("where");
  if (!rawWhere) return null;

  try {
    const where = JSON.parse(rawWhere);
    const equalsStatus = where?.status?.equals;
    if (equalsStatus === "published" || equalsStatus === "draft") {
      return equalsStatus;
    }

    const notEqualsStatus = where?.status?.not_equals;
    if (notEqualsStatus === "draft") {
      return "published";
    }

    if (notEqualsStatus === "published") {
      return "draft";
    }
  } catch {
    return null;
  }

  return null;
}

function getRequestActor(req, requestUser) {
  if (requestUser?.sub || requestUser?.id) {
    const userId = String(requestUser.sub ?? requestUser.id);
    return {
      actorKey: `user:${userId}`,
      userId,
      userEmail: typeof requestUser.email === "string" ? requestUser.email.toLowerCase() : null,
      userName: typeof requestUser.name === "string" && requestUser.name.trim() ? requestUser.name.trim() : null,
      isAnonymous: false,
    };
  }

  const ip = req.socket?.remoteAddress || "unknown-ip";
  const ua = req.headers["user-agent"] || "unknown-ua";
  const actorHash = crypto.createHash("sha256").update(`${ip}|${ua}`).digest("hex").slice(0, 16);

  return {
    actorKey: `anon:${actorHash}`,
    userId: null,
    userEmail: null,
    userName: null,
    isAnonymous: true,
  };
}

async function getNewsOwnerRow(newsId) {
  const numericId = Number(newsId);
  const rows = Number.isInteger(numericId) && String(numericId) === String(newsId)
    ? await d1Query("SELECT rowid as _rowid, * FROM news WHERE id = ? OR rowid = ? LIMIT 1", [newsId, numericId])
    : await d1Query("SELECT rowid as _rowid, * FROM news WHERE id = ? LIMIT 1", [newsId]);

  return rows[0] || null;
}

async function getEventOwnerRow(eventId) {
  const rawId = String(eventId || "").trim();
  if (!rawId) return null;

  const numericId = Number(rawId);
  const isNumericId = Number.isInteger(numericId) && String(numericId) === rawId;

  let rows = isNumericId
    ? await d1Query(
        "SELECT rowid as _rowid, * FROM events WHERE id = ? OR CAST(id AS TEXT) = ? OR lower(CAST(id AS TEXT)) = lower(?) OR rowid = ? LIMIT 1",
        [rawId, rawId, rawId, numericId],
      )
    : await d1Query(
        "SELECT rowid as _rowid, * FROM events WHERE id = ? OR CAST(id AS TEXT) = ? OR lower(CAST(id AS TEXT)) = lower(?) LIMIT 1",
        [rawId, rawId, rawId],
      );

  if (rows[0]) return rows[0];

  const columns = await getTableColumns("events");
  if (columns.has("eventId")) {
    rows = await d1Query(
      "SELECT rowid as _rowid, * FROM events WHERE eventId = ? OR lower(CAST(eventId AS TEXT)) = lower(?) LIMIT 1",
      [rawId, rawId],
    );
    if (rows[0]) return rows[0];
  }

  if (columns.has("event_id")) {
    rows = await d1Query(
      "SELECT rowid as _rowid, * FROM events WHERE event_id = ? OR lower(CAST(event_id AS TEXT)) = lower(?) LIMIT 1",
      [rawId, rawId],
    );
    if (rows[0]) return rows[0];
  }

  return null;
}

async function getProductOwnerRow(productId) {
  const rawId = String(productId || "").trim();
  if (!rawId) return null;

  const numericId = Number(rawId);
  const isNumericId = Number.isInteger(numericId) && String(numericId) === rawId;

  let rows = isNumericId
    ? await d1Query(
        "SELECT rowid as _rowid, * FROM products WHERE id = ? OR CAST(id AS TEXT) = ? OR lower(CAST(id AS TEXT)) = lower(?) OR rowid = ? LIMIT 1",
        [rawId, rawId, rawId, numericId],
      )
    : await d1Query(
        "SELECT rowid as _rowid, * FROM products WHERE id = ? OR CAST(id AS TEXT) = ? OR lower(CAST(id AS TEXT)) = lower(?) LIMIT 1",
        [rawId, rawId, rawId],
      );

  if (rows[0]) return rows[0];

  const columns = await getTableColumns("products");
  if (columns.has("productId")) {
    rows = await d1Query(
      "SELECT rowid as _rowid, * FROM products WHERE productId = ? OR lower(CAST(productId AS TEXT)) = lower(?) LIMIT 1",
      [rawId, rawId],
    );
    if (rows[0]) return rows[0];
  }

  if (columns.has("product_id")) {
    rows = await d1Query(
      "SELECT rowid as _rowid, * FROM products WHERE product_id = ? OR lower(CAST(product_id AS TEXT)) = lower(?) LIMIT 1",
      [rawId, rawId],
    );
    if (rows[0]) return rows[0];
  }

  return null;
}

function getEventStartTimestamp(eventRow) {
  if (!eventRow || typeof eventRow !== "object") return null;

  const rawValue =
    eventRow.startAt ??
    eventRow.start_at ??
    eventRow.date ??
    null;

  if (!rawValue || typeof rawValue !== "string") return null;

  const ts = new Date(rawValue).getTime();
  if (!Number.isFinite(ts)) return null;

  return ts;
}

function isAdminOwnerOfNews(newsRow, requestUser) {
  if (!newsRow || requestUser?.role !== "admin") {
    return false;
  }

  const hasOwnerMetadata = [
    newsRow.ownerEmail,
    newsRow.owner_email,
    newsRow.ownerId,
    newsRow.owner_id,
    newsRow.authorEmail,
    newsRow.author_email,
    newsRow.authorId,
    newsRow.author_id,
    newsRow.createdBy,
    newsRow.created_by,
  ].some((value) => value !== undefined && value !== null && String(value).trim() !== "");

  if (!hasOwnerMetadata) {
    return true;
  }

  return isRowOwnedByUser(newsRow, requestUser);
}

function assertD1Configured() {
  if (!D1_API_URL || !D1_API_TOKEN) {
    throw new Error(
      "Cloudflare D1 is not configured. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, and CLOUDFLARE_D1_API_TOKEN.",
    );
  }
}

async function d1Query(sql, params = []) {
  assertD1Configured();

  const response = await fetch(D1_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${D1_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sql,
      params,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    const firstError = data.errors?.[0]?.message || "Unknown D1 error";
    throw new Error(`D1 query failed: ${firstError}`);
  }

  const result = data.result?.[0];
  return result?.results || [];
}

async function getTableColumns(tableName) {
  const rows = await d1Query(`PRAGMA table_info(${tableName})`);
  return new Set(rows.map((row) => row.name));
}

async function ensureSchema() {
  await d1Query(
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'member',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );
}

async function ensureColumn(tableName, columnName, definition) {
  const columns = await getTableColumns(tableName);
  if (columns.has(columnName)) {
    return;
  }

  await d1Query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

async function ensureEventsSchema() {
  await d1Query(
    `CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      description TEXT,
      date TEXT,
      start_at TEXT,
      end_at TEXT,
      location_type TEXT,
      location_link TEXT,
      location TEXT,
      thumbnail TEXT,
      embed_link TEXT,
      is_embed_only INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );

  await ensureColumn("events", "category", "TEXT DEFAULT 'general'");
  await ensureColumn("events", "start_at", "TEXT");
  await ensureColumn("events", "end_at", "TEXT");
  await ensureColumn("events", "location_type", "TEXT");
  await ensureColumn("events", "location_link", "TEXT");
  await ensureColumn("events", "thumbnail", "TEXT");
  await ensureColumn("events", "embed_link", "TEXT");
  await ensureColumn("events", "is_embed_only", "INTEGER DEFAULT 0");
  await ensureColumn("events", "updated_at", "TEXT");
}

async function ensureProductsSchema() {
  await d1Query(
    `CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'Other',
      description TEXT,
      tags TEXT,
      owner_name TEXT DEFAULT 'Anonymous',
      owner_email TEXT,
      product_link TEXT,
      demo_link TEXT,
      thumbnail TEXT,
      technical_lead TEXT,
      support_email TEXT,
      screenshots TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );

  await ensureColumn("products", "category", "TEXT DEFAULT 'Other'");
  await ensureColumn("products", "tags", "TEXT");
  await ensureColumn("products", "owner_name", "TEXT DEFAULT 'Anonymous'");
  await ensureColumn("products", "owner_email", "TEXT");
  await ensureColumn("products", "product_link", "TEXT");
  await ensureColumn("products", "demo_link", "TEXT");
  await ensureColumn("products", "thumbnail", "TEXT");
  await ensureColumn("products", "technical_lead", "TEXT");
  await ensureColumn("products", "support_email", "TEXT");
  await ensureColumn("products", "screenshots", "TEXT");
  await ensureColumn("products", "status", "TEXT DEFAULT 'pending'");
  await ensureColumn("products", "updated_at", "TEXT");
}

async function ensureRecordingsSchema() {
  await d1Query(
    `CREATE TABLE IF NOT EXISTS recordings (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      youtube_link TEXT NOT NULL,
      description TEXT,
      category TEXT,
      speakers TEXT,
      duration TEXT,
      recording_date TEXT,
      thumbnail TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );

  await ensureColumn("recordings", "category", "TEXT");
  await ensureColumn("recordings", "speakers", "TEXT");
  await ensureColumn("recordings", "duration", "TEXT");
  await ensureColumn("recordings", "recording_date", "TEXT");
  await ensureColumn("recordings", "thumbnail", "TEXT");
  await ensureColumn("recordings", "updated_at", "TEXT");
}

async function ensureNewsEngagementSchema() {
  await d1Query(
    `CREATE TABLE IF NOT EXISTS news_likes (
      id TEXT PRIMARY KEY,
      news_id TEXT NOT NULL,
      actor_key TEXT NOT NULL,
      user_id TEXT,
      user_email TEXT,
      user_name TEXT,
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );

  await ensureColumn("news_likes", "news_id", "TEXT");
  await ensureColumn("news_likes", "actor_key", "TEXT");
  await ensureColumn("news_likes", "user_id", "TEXT");
  await ensureColumn("news_likes", "user_email", "TEXT");
  await ensureColumn("news_likes", "user_name", "TEXT");
  await ensureColumn("news_likes", "is_anonymous", "INTEGER DEFAULT 0");
  await ensureColumn("news_likes", "created_at", "TEXT");

  await d1Query(
    `CREATE UNIQUE INDEX IF NOT EXISTS news_likes_actor_idx
     ON news_likes(news_id, actor_key)`,
  );

  await d1Query(
    `CREATE TABLE IF NOT EXISTS news_comments (
      id TEXT PRIMARY KEY,
      news_id TEXT NOT NULL,
      user_id TEXT,
      user_email TEXT,
      user_name TEXT,
      content TEXT NOT NULL,
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );

  await ensureColumn("news_comments", "news_id", "TEXT");
  await ensureColumn("news_comments", "user_id", "TEXT");
  await ensureColumn("news_comments", "user_email", "TEXT");
  await ensureColumn("news_comments", "user_name", "TEXT");
  await ensureColumn("news_comments", "content", "TEXT");
  await ensureColumn("news_comments", "is_anonymous", "INTEGER DEFAULT 0");
  await ensureColumn("news_comments", "created_at", "TEXT");

  await d1Query(
    `CREATE INDEX IF NOT EXISTS news_comments_news_idx
     ON news_comments(news_id, created_at DESC)`,
  );
}

async function ensureEventProductEngagementSchema() {
  await d1Query(
    `CREATE TABLE IF NOT EXISTS event_registrations (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      actor_key TEXT NOT NULL,
      user_id TEXT,
      user_email TEXT,
      user_name TEXT,
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );

  await ensureColumn("event_registrations", "event_id", "TEXT");
  await ensureColumn("event_registrations", "actor_key", "TEXT");
  await ensureColumn("event_registrations", "user_id", "TEXT");
  await ensureColumn("event_registrations", "user_email", "TEXT");
  await ensureColumn("event_registrations", "user_name", "TEXT");
  await ensureColumn("event_registrations", "full_name", "TEXT");
  await ensureColumn("event_registrations", "is_anonymous", "INTEGER DEFAULT 0");
  await ensureColumn("event_registrations", "created_at", "TEXT");

  await d1Query(
    `CREATE UNIQUE INDEX IF NOT EXISTS event_registrations_actor_idx
     ON event_registrations(event_id, actor_key)`,
  );

  await d1Query(
    `CREATE INDEX IF NOT EXISTS event_registrations_event_idx
     ON event_registrations(event_id, created_at DESC)`,
  );

  await d1Query(
    `CREATE TABLE IF NOT EXISTS event_likes (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      actor_key TEXT NOT NULL,
      user_id TEXT,
      user_email TEXT,
      user_name TEXT,
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );

  await ensureColumn("event_likes", "event_id", "TEXT");
  await ensureColumn("event_likes", "actor_key", "TEXT");
  await ensureColumn("event_likes", "user_id", "TEXT");
  await ensureColumn("event_likes", "user_email", "TEXT");
  await ensureColumn("event_likes", "user_name", "TEXT");
  await ensureColumn("event_likes", "is_anonymous", "INTEGER DEFAULT 0");
  await ensureColumn("event_likes", "created_at", "TEXT");

  await d1Query(
    `CREATE UNIQUE INDEX IF NOT EXISTS event_likes_actor_idx
     ON event_likes(event_id, actor_key)`,
  );

  await d1Query(
    `CREATE TABLE IF NOT EXISTS event_comments (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      user_id TEXT,
      user_email TEXT,
      user_name TEXT,
      content TEXT NOT NULL,
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );

  await ensureColumn("event_comments", "event_id", "TEXT");
  await ensureColumn("event_comments", "user_id", "TEXT");
  await ensureColumn("event_comments", "user_email", "TEXT");
  await ensureColumn("event_comments", "user_name", "TEXT");
  await ensureColumn("event_comments", "content", "TEXT");
  await ensureColumn("event_comments", "is_anonymous", "INTEGER DEFAULT 0");
  await ensureColumn("event_comments", "created_at", "TEXT");

  await d1Query(
    `CREATE INDEX IF NOT EXISTS event_comments_event_idx
     ON event_comments(event_id, created_at DESC)`,
  );

  await d1Query(
    `CREATE TABLE IF NOT EXISTS product_likes (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      actor_key TEXT NOT NULL,
      user_id TEXT,
      user_email TEXT,
      user_name TEXT,
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );

  await ensureColumn("product_likes", "product_id", "TEXT");
  await ensureColumn("product_likes", "actor_key", "TEXT");
  await ensureColumn("product_likes", "user_id", "TEXT");
  await ensureColumn("product_likes", "user_email", "TEXT");
  await ensureColumn("product_likes", "user_name", "TEXT");
  await ensureColumn("product_likes", "is_anonymous", "INTEGER DEFAULT 0");
  await ensureColumn("product_likes", "created_at", "TEXT");

  await d1Query(
    `CREATE UNIQUE INDEX IF NOT EXISTS product_likes_actor_idx
     ON product_likes(product_id, actor_key)`,
  );

  await d1Query(
    `CREATE TABLE IF NOT EXISTS product_comments (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      user_id TEXT,
      user_email TEXT,
      user_name TEXT,
      content TEXT NOT NULL,
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );

  await ensureColumn("product_comments", "product_id", "TEXT");
  await ensureColumn("product_comments", "user_id", "TEXT");
  await ensureColumn("product_comments", "user_email", "TEXT");
  await ensureColumn("product_comments", "user_name", "TEXT");
  await ensureColumn("product_comments", "content", "TEXT");
  await ensureColumn("product_comments", "is_anonymous", "INTEGER DEFAULT 0");
  await ensureColumn("product_comments", "created_at", "TEXT");

  await d1Query(
    `CREATE INDEX IF NOT EXISTS product_comments_product_idx
     ON product_comments(product_id, created_at DESC)`,
  );
}

async function ensureProductReportsSchema() {
  await d1Query(
    `CREATE TABLE IF NOT EXISTS product_reports (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      product_title TEXT,
      reason TEXT,
      actor_key TEXT NOT NULL,
      user_id TEXT,
      user_email TEXT,
      user_name TEXT,
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      read_at TEXT
    )`,
  );

  await ensureColumn("product_reports", "product_id", "TEXT");
  await ensureColumn("product_reports", "product_title", "TEXT");
  await ensureColumn("product_reports", "reason", "TEXT");
  await ensureColumn("product_reports", "actor_key", "TEXT");
  await ensureColumn("product_reports", "user_id", "TEXT");
  await ensureColumn("product_reports", "user_email", "TEXT");
  await ensureColumn("product_reports", "user_name", "TEXT");
  await ensureColumn("product_reports", "is_anonymous", "INTEGER DEFAULT 0");
  await ensureColumn("product_reports", "status", "TEXT DEFAULT 'pending'");
  await ensureColumn("product_reports", "created_at", "TEXT DEFAULT CURRENT_TIMESTAMP");
  await ensureColumn("product_reports", "read_at", "TEXT");

  await d1Query(
    `CREATE UNIQUE INDEX IF NOT EXISTS product_reports_actor_idx
     ON product_reports(product_id, actor_key)`,
  );

  await d1Query(
    `CREATE INDEX IF NOT EXISTS product_reports_status_idx
     ON product_reports(status, created_at DESC)`,
  );
}

async function ensureOwnershipColumns() {
  const ownershipColumnDefs = [
    { name: "owner_email", definition: "TEXT" },
    { name: "owner_id", definition: "TEXT" },
  ];

  const tables = ["events", "products", "news", "recordings"];

  for (const tableName of tables) {
    try {
      const columns = await getTableColumns(tableName);
      if (!columns || columns.size === 0) {
        continue;
      }

      for (const column of ownershipColumnDefs) {
        if (!columns.has(column.name)) {
          await d1Query(`ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${column.definition}`);
        }
      }
    } catch (error) {
      console.warn(`[auth-server] Skipped ownership migration for ${tableName}:`, error.message);
    }
  }
}

async function clearAllRecordings() {
  try {
    const result = await d1Query("DELETE FROM recordings");
    console.log("[auth-server] Cleared all existing recordings from database");
  } catch (error) {
    console.error(
      "[auth-server] Clear recordings failed:",
      error.message
    );
  }
}

async function migrateRecordingsNullIds() {
  try {
    const columns = await getTableColumns("recordings");
    if (!columns.has("id")) {
      console.log("[auth-server] Recordings table has no id column; skipping migration");
      return;
    }

    const nullIdRows = await d1Query(
      `SELECT rowid FROM recordings WHERE id IS NULL OR id = '' LIMIT 1000`
    );

    if (nullIdRows.length === 0) {
      console.log("[auth-server] No null-id recordings found; migration not needed");
      return;
    }

    console.log(
      `[auth-server] Found ${nullIdRows.length} recordings with null/empty id; generating UUIDs...`
    );

    for (const row of nullIdRows) {
      const newId = crypto.randomUUID();
      await d1Query(
        `UPDATE recordings SET id = ? WHERE rowid = ?`,
        [newId, row.rowid]
      );
    }

    console.log(
      `[auth-server] Migrated ${nullIdRows.length} recordings to have valid UUIDs`
    );
  } catch (error) {
    console.error(
      "[auth-server] Recordings null-id migration failed:",
      error.message
    );
  }
}

async function registerUser(req, res) {
  const body = await readJsonBody(req);
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : null;

  if (!email || !email.includes("@")) {
    sendJson(res, 400, {
      error: "invalid_email",
      message: "Email is invalid",
    });
    return;
  }

  if (password.length < 8) {
    sendJson(res, 400, {
      error: "invalid_password",
      message: "Password must be at least 8 characters",
    });
    return;
  }

  const existing = await d1Query(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [email],
  );

  if (existing.length > 0) {
    sendJson(res, 409, {
      error: "email_exists",
      message: "Email is already registered",
    });
    return;
  }

  const userId = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);

  await d1Query(
    "INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)",
    [userId, email, passwordHash, name, "member"],
  );

  sendJson(res, 201, {
    ok: true,
    user: {
      id: userId,
      email,
      name,
      role: "member",
    },
  });
}

async function loginUser(req, res) {
  const body = await readJsonBody(req);
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    sendJson(res, 400, {
      error: "invalid_request",
      message: "Email and password are required",
    });
    return;
  }

  const rows = await d1Query(
    "SELECT id, email, password_hash, name, role FROM users WHERE email = ? LIMIT 1",
    [email],
  );
  const user = rows[0];

  if (!user) {
    sendJson(res, 401, {
      error: "invalid_credentials",
      message: "Invalid email or password",
    });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    sendJson(res, 401, {
      error: "invalid_credentials",
      message: "Invalid email or password",
    });
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 60 * 60 * 24 * 7;
  const token = createToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    iat: now,
    exp: now + expiresIn,
  });

  sendJson(res, 200, {
    ok: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}

function getRoleByEmail(email) {
  return ADMIN_EMAILS.has(email) ? "admin" : "member";
}

async function verifyFirebaseIdToken(idToken) {
  if (!FIREBASE_API_KEY) {
    throw new Error("Firebase API key belum dikonfigurasi di server");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken }),
    },
  );

  const data = await response.json().catch(() => ({}));
  const account = data?.users?.[0];

  if (!response.ok || !account) {
    throw new Error(data?.error?.message || "Firebase token tidak valid");
  }

  const email = normalizeEmail(account.email);
  if (!email) {
    throw new Error("Email akun Google tidak tersedia");
  }

  return {
    uid: String(account.localId || ""),
    email,
    name: typeof account.displayName === "string" ? account.displayName.trim() : null,
  };
}

async function loginGoogleUser(req, res) {
  try {
    const body = await readJsonBody(req);
    const idToken = typeof body.idToken === "string" ? body.idToken.trim() : "";

    if (!idToken) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "Firebase ID token wajib diisi",
      });
      return;
    }

    const firebaseUser = await verifyFirebaseIdToken(idToken);
    const role = getRoleByEmail(firebaseUser.email);

    const rows = await d1Query(
      "SELECT id, email, name, role FROM users WHERE email = ? LIMIT 1",
      [firebaseUser.email],
    );

    let user = rows[0];

    if (!user) {
      const userId = crypto.randomUUID();
      const randomPasswordHash = await bcrypt.hash(crypto.randomUUID(), 12);

      await d1Query(
        "INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)",
        [userId, firebaseUser.email, randomPasswordHash, firebaseUser.name, role],
      );

      user = {
        id: userId,
        email: firebaseUser.email,
        name: firebaseUser.name,
        role,
      };
    } else {
      const shouldUpdateName = !user.name && firebaseUser.name;
      const shouldUpdateRole = user.role !== role;

      if (shouldUpdateName || shouldUpdateRole) {
        await d1Query(
          "UPDATE users SET name = ?, role = ? WHERE id = ?",
          [firebaseUser.name || user.name || null, role, user.id],
        );
        user = {
          ...user,
          name: firebaseUser.name || user.name,
          role,
        };
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 60 * 60 * 24 * 7;
    const token = createToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      iat: now,
      exp: now + expiresIn,
    });

    sendJson(res, 200, {
      ok: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google sign-in gagal";
    sendJson(res, 401, {
      error: "invalid_google_token",
      message,
    });
  }
}

async function routeAuthRequest(req, res) {
  if (!req.url) {
    sendJson(res, 400, {
      error: "invalid_request",
      message: "Missing request URL",
    });
    return;
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "POST" && requestUrl.pathname === "/api/auth/sign-up/email") {
    await registerUser(req, res);
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/auth/sign-in/email") {
    await loginUser(req, res);
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/auth/sign-in/google") {
    await loginGoogleUser(req, res);
    return;
  }

  sendJson(res, 404, {
    error: "not_found",
    message: "Unknown auth route",
  });
}

// Content API handlers
async function getEvents(req, res, urlParams) {
  try {
    const limit = parseInt(urlParams.get("limit")) || 10;
    const page = parseInt(urlParams.get("page")) || 1;
    const offset = (page - 1) * limit;
    const columns = await getTableColumns("events");
    const requestUser = getRequestUser(req);
    const statusFilterFromWhere = getStatusFilterFromWhere(urlParams);
    const isAdmin = requestUser?.role === "admin";
    const isMember = requestUser?.role === "member";
    const ownershipFilter = isMember ? getOwnershipFilter(columns, requestUser) : null;

    if (isMember && !ownershipFilter) {
      sendJson(res, 200, {
        docs: [],
        totalDocs: 0,
        limit,
        page,
        totalPages: 0,
        hasPrevPage: false,
        hasNextPage: false,
      });
      return;
    }

    const whereParts = [];
    const whereParams = [];

    if (statusFilterFromWhere) {
      whereParts.push("status = ?");
      whereParams.push(statusFilterFromWhere);
    } else if (!isAdmin) {
      whereParts.push("status = ?");
      whereParams.push("published");
    }

    if (ownershipFilter) {
      whereParts.push(ownershipFilter.clause);
      whereParams.push(...ownershipFilter.params);
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
    const rows = await d1Query(
      `SELECT * FROM events ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...whereParams, limit, offset]
    );
    const docs = rows.map((row) => ({
      ...row,
      category: row.category ?? row.eventCategory ?? row.event_category ?? "general",
      ownerName: row.ownerName ?? row.owner_name ?? row.authorName ?? row.author_name ?? "Anonymous",
      ownerEmail:
        row.ownerEmail ??
        row.owner_email ??
        row.authorEmail ??
        row.author_email ??
        row.createdByEmail ??
        row.created_by_email ??
        "",
      thumbnail: row.thumbnail ?? row.image ?? row.image_url ?? row.banner ?? null,
      startAt: row.startAt ?? row.start_at ?? row.date ?? null,
      endAt: row.endAt ?? row.end_at ?? null,
      locationType: row.locationType ?? row.location_type ?? null,
      locationLink: row.locationLink ?? row.location_link ?? row.location ?? null,
      embedLink: row.embedLink ?? row.embed_link ?? row.embeddedEventLink ?? row.event_link ?? null,
      isEmbedOnly: row.isEmbedOnly ?? row.is_embed_only ?? false,
    }));

    const totalRows = await d1Query(
      `SELECT COUNT(*) as count FROM events ${whereClause}`,
      whereParams,
    );
    const totalDocs = totalRows[0]?.count || 0;

    sendJson(res, 200, {
      docs,
      totalDocs,
      limit,
      page,
      totalPages: Math.ceil(totalDocs / limit),
      hasPrevPage: page > 1,
      hasNextPage: page < Math.ceil(totalDocs / limit),
    });
  } catch (error) {
    console.error("[auth-server] Get events failed:", error);
    sendJson(res, 500, { error: "failed_to_fetch_events", message: error.message });
  }
}

async function getEventById(req, res, id) {
  try {
    if (!id) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "Event id is required",
      });
      return;
    }

    const numericId = Number(id);
    const rows = Number.isInteger(numericId) && String(numericId) === String(id)
      ? await d1Query("SELECT rowid as _rowid, * FROM events WHERE id = ? OR rowid = ? LIMIT 1", [
          id,
          numericId,
        ])
      : await d1Query("SELECT rowid as _rowid, * FROM events WHERE id = ? LIMIT 1", [id]);

    const row = rows[0];
    if (!row) {
      sendJson(res, 404, {
        error: "not_found",
        message: "Event not found",
      });
      return;
    }

    const requestUser = getRequestUser(req);
    if (requestUser?.role === "member" && !isRowOwnedByUser(row, requestUser)) {
      sendJson(res, 404, {
        error: "not_found",
        message: "Event not found",
      });
      return;
    }

    sendJson(res, 200, {
      doc: {
        ...row,
        id: row.id ?? row._rowid,
        category: row.category ?? row.eventCategory ?? row.event_category ?? "general",
        ownerName: row.ownerName ?? row.owner_name ?? row.authorName ?? row.author_name ?? "Anonymous",
        ownerEmail:
          row.ownerEmail ??
          row.owner_email ??
          row.authorEmail ??
          row.author_email ??
          row.createdByEmail ??
          row.created_by_email ??
          "",
        thumbnail: row.thumbnail ?? row.image ?? row.image_url ?? row.banner ?? null,
        startAt: row.startAt ?? row.start_at ?? row.date ?? null,
        endAt: row.endAt ?? row.end_at ?? null,
        locationType: row.locationType ?? row.location_type ?? null,
        locationLink: row.locationLink ?? row.location_link ?? row.location ?? null,
        embedLink: row.embedLink ?? row.embed_link ?? row.embeddedEventLink ?? row.event_link ?? null,
        isEmbedOnly: row.isEmbedOnly ?? row.is_embed_only ?? false,
      },
    });
  } catch (error) {
    console.error("[auth-server] Get event by id failed:", error);
    sendJson(res, 500, {
      error: "failed_to_fetch_event",
      message: error.message,
    });
  }
}

async function createEvent(req, res) {
  try {
    const requestUser = getRequestUser(req);
    const body = await readJsonBody(req);
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "general";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const startAt = typeof body.startAt === "string" ? body.startAt.trim() : "";
    const endAt = typeof body.endAt === "string" ? body.endAt.trim() : "";
    const locationType =
      body.locationType === "zoom" ||
      body.locationType === "google_meet" ||
      body.locationType === "link" ||
      body.locationType === "custom"
        ? body.locationType
        : "link";
    const locationLink = typeof body.locationLink === "string" ? body.locationLink.trim() : "";
    const thumbnail = typeof body.thumbnail === "string" ? body.thumbnail.trim() : "";
    const embedLink =
      typeof body.embedLink === "string"
        ? body.embedLink.trim()
        : typeof body.embeddedEventLink === "string"
          ? body.embeddedEventLink.trim()
          : "";
    const status = body.status === "published" ? "published" : "draft";
    const isEmbedOnly = body.isEmbedOnly === true;

    if (!title || !startAt || !endAt || !locationLink) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "title, startAt, endAt, and locationLink are required",
      });
      return;
    }

    const columns = await getTableColumns("events");
    if (!columns.has("title")) {
      throw new Error("Events table is missing required title column");
    }

    const eventId = crypto.randomUUID();
    const insertColumns = [];
    const insertValues = [];

    if (columns.has("id")) {
      insertColumns.push("id");
      insertValues.push(eventId);
    }

    insertColumns.push("title");
    insertValues.push(title);

    if (columns.has("category")) {
      insertColumns.push("category");
      insertValues.push(category || "general");
    } else if (columns.has("eventCategory")) {
      insertColumns.push("eventCategory");
      insertValues.push(category || "general");
    } else if (columns.has("event_category")) {
      insertColumns.push("event_category");
      insertValues.push(category || "general");
    }

    if (columns.has("description")) {
      insertColumns.push("description");
      insertValues.push(description || null);
    }

    if (columns.has("startAt")) {
      insertColumns.push("startAt");
      insertValues.push(startAt);
    } else if (columns.has("start_at")) {
      insertColumns.push("start_at");
      insertValues.push(startAt);
    }

    if (columns.has("endAt")) {
      insertColumns.push("endAt");
      insertValues.push(endAt);
    } else if (columns.has("end_at")) {
      insertColumns.push("end_at");
      insertValues.push(endAt);
    }

    if (columns.has("date")) {
      insertColumns.push("date");
      insertValues.push(startAt.slice(0, 10));
    }

    if (columns.has("locationType")) {
      insertColumns.push("locationType");
      insertValues.push(locationType);
    } else if (columns.has("location_type")) {
      insertColumns.push("location_type");
      insertValues.push(locationType);
    }

    if (columns.has("locationLink")) {
      insertColumns.push("locationLink");
      insertValues.push(locationLink);
    } else if (columns.has("location_link")) {
      insertColumns.push("location_link");
      insertValues.push(locationLink);
    }

    if (columns.has("location")) {
      insertColumns.push("location");
      insertValues.push(locationLink);
    }

    if (columns.has("thumbnail")) {
      insertColumns.push("thumbnail");
      insertValues.push(thumbnail || null);
    } else if (columns.has("image_url")) {
      insertColumns.push("image_url");
      insertValues.push(thumbnail || null);
    } else if (columns.has("image")) {
      insertColumns.push("image");
      insertValues.push(thumbnail || null);
    }

    if (columns.has("embedLink")) {
      insertColumns.push("embedLink");
      insertValues.push(embedLink || null);
    } else if (columns.has("embed_link")) {
      insertColumns.push("embed_link");
      insertValues.push(embedLink || null);
    } else if (columns.has("event_link")) {
      insertColumns.push("event_link");
      insertValues.push(embedLink || null);
    }

    if (columns.has("isEmbedOnly")) {
      insertColumns.push("isEmbedOnly");
      insertValues.push(isEmbedOnly ? 1 : 0);
    } else if (columns.has("is_embed_only")) {
      insertColumns.push("is_embed_only");
      insertValues.push(isEmbedOnly ? 1 : 0);
    }

    if (columns.has("status")) {
      insertColumns.push("status");
      insertValues.push(status);
    }

    const ownerEmail = typeof requestUser?.email === "string" ? requestUser.email.toLowerCase() : "";
    const ownerId = requestUser?.sub ?? requestUser?.id ?? "";

    if (ownerEmail) {
      if (columns.has("ownerEmail")) {
        insertColumns.push("ownerEmail");
        insertValues.push(ownerEmail);
      } else if (columns.has("owner_email")) {
        insertColumns.push("owner_email");
        insertValues.push(ownerEmail);
      } else if (columns.has("createdByEmail")) {
        insertColumns.push("createdByEmail");
        insertValues.push(ownerEmail);
      } else if (columns.has("created_by_email")) {
        insertColumns.push("created_by_email");
        insertValues.push(ownerEmail);
      }
    }

    if (ownerId) {
      if (columns.has("ownerId")) {
        insertColumns.push("ownerId");
        insertValues.push(String(ownerId));
      } else if (columns.has("owner_id")) {
        insertColumns.push("owner_id");
        insertValues.push(String(ownerId));
      } else if (columns.has("createdBy")) {
        insertColumns.push("createdBy");
        insertValues.push(String(ownerId));
      } else if (columns.has("created_by")) {
        insertColumns.push("created_by");
        insertValues.push(String(ownerId));
      }
    }

    let sql = `INSERT INTO events (${insertColumns.join(", ")}) VALUES (${insertColumns
      .map(() => "?")
      .join(", ")})`;

    if (columns.has("created_at") && columns.has("updated_at")) {
      sql = `INSERT INTO events (${insertColumns.join(", ")}, created_at, updated_at) VALUES (${insertColumns
        .map(() => "?")
        .join(", ")}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
    }

    if (columns.has("createdAt") && columns.has("updatedAt")) {
      sql = `INSERT INTO events (${insertColumns.join(", ")}, createdAt, updatedAt) VALUES (${insertColumns
        .map(() => "?")
        .join(", ")}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
    }

    await d1Query(sql, insertValues);

    const insertedId = columns.has("id")
      ? eventId
      : (await d1Query("SELECT last_insert_rowid() as id"))[0]?.id ?? null;

    sendJson(res, 201, {
      ok: true,
      doc: {
        id: insertedId,
        title,
        category: category || "general",
        description,
        startAt,
        endAt,
        locationType,
        locationLink,
        thumbnail: thumbnail || null,
        embedLink: embedLink || null,
        status,
      },
    });
  } catch (error) {
    console.error("[auth-server] Create event failed:", error);
    sendJson(res, 500, {
      error: "failed_to_create_event",
      message: error.message,
    });
  }
}

async function deleteEvent(req, res, id) {
  try {
    if (!id) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "Event id is required",
      });
      return;
    }

    const numericId = Number(id);
    if (Number.isInteger(numericId) && String(numericId) === String(id)) {
      await d1Query("DELETE FROM events WHERE id = ? OR rowid = ?", [id, numericId]);
    } else {
      await d1Query("DELETE FROM events WHERE id = ?", [id]);
    }

    sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("[auth-server] Delete event failed:", error);
    sendJson(res, 500, {
      error: "failed_to_delete_event",
      message: error.message,
    });
  }
}

async function updateEvent(req, res, id) {
  try {
    if (!id) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "Event id is required",
      });
      return;
    }

    const body = await readJsonBody(req);
    const columns = await getTableColumns("events");
    const updates = [];
    const params = [];

    if (typeof body.title === "string") {
      updates.push("title = ?");
      params.push(body.title.trim());
    }

    if (typeof body.category === "string") {
      if (columns.has("category")) {
        updates.push("category = ?");
        params.push(body.category.trim() || "general");
      } else if (columns.has("eventCategory")) {
        updates.push("eventCategory = ?");
        params.push(body.category.trim() || "general");
      } else if (columns.has("event_category")) {
        updates.push("event_category = ?");
        params.push(body.category.trim() || "general");
      }
    }

    if (typeof body.description === "string" && columns.has("description")) {
      updates.push("description = ?");
      params.push(body.description.trim() || null);
    }

    if (typeof body.startAt === "string") {
      if (columns.has("startAt")) {
        updates.push("startAt = ?");
        params.push(body.startAt.trim() || null);
      } else if (columns.has("start_at")) {
        updates.push("start_at = ?");
        params.push(body.startAt.trim() || null);
      }

      if (columns.has("date")) {
        updates.push("date = ?");
        params.push(body.startAt.trim() ? body.startAt.trim().slice(0, 10) : null);
      }
    }

    if (typeof body.endAt === "string") {
      if (columns.has("endAt")) {
        updates.push("endAt = ?");
        params.push(body.endAt.trim() || null);
      } else if (columns.has("end_at")) {
        updates.push("end_at = ?");
        params.push(body.endAt.trim() || null);
      }
    }

    if (typeof body.locationType === "string") {
      if (columns.has("locationType")) {
        updates.push("locationType = ?");
        params.push(body.locationType.trim() || null);
      } else if (columns.has("location_type")) {
        updates.push("location_type = ?");
        params.push(body.locationType.trim() || null);
      }
    }

    if (typeof body.locationLink === "string") {
      if (columns.has("locationLink")) {
        updates.push("locationLink = ?");
        params.push(body.locationLink.trim() || null);
      } else if (columns.has("location_link")) {
        updates.push("location_link = ?");
        params.push(body.locationLink.trim() || null);
      }

      if (columns.has("location")) {
        updates.push("location = ?");
        params.push(body.locationLink.trim() || null);
      }
    }

    if (typeof body.thumbnail === "string") {
      if (columns.has("thumbnail")) {
        updates.push("thumbnail = ?");
        params.push(body.thumbnail.trim() || null);
      } else if (columns.has("image_url")) {
        updates.push("image_url = ?");
        params.push(body.thumbnail.trim() || null);
      } else if (columns.has("image")) {
        updates.push("image = ?");
        params.push(body.thumbnail.trim() || null);
      }
    }

    const embedLinkValue =
      typeof body.embedLink === "string"
        ? body.embedLink.trim()
        : typeof body.embeddedEventLink === "string"
          ? body.embeddedEventLink.trim()
          : null;
    if (embedLinkValue !== null) {
      if (columns.has("embedLink")) {
        updates.push("embedLink = ?");
        params.push(embedLinkValue || null);
      } else if (columns.has("embed_link")) {
        updates.push("embed_link = ?");
        params.push(embedLinkValue || null);
      } else if (columns.has("event_link")) {
        updates.push("event_link = ?");
        params.push(embedLinkValue || null);
      }
    }

    if (typeof body.isEmbedOnly === "boolean") {
      if (columns.has("isEmbedOnly")) {
        updates.push("isEmbedOnly = ?");
        params.push(body.isEmbedOnly ? 1 : 0);
      } else if (columns.has("is_embed_only")) {
        updates.push("is_embed_only = ?");
        params.push(body.isEmbedOnly ? 1 : 0);
      }
    }

    if (body.status === "draft" || body.status === "published") {
      if (columns.has("status")) {
        updates.push("status = ?");
        params.push(body.status);
      }
    }

    if (columns.has("updated_at")) {
      updates.push("updated_at = CURRENT_TIMESTAMP");
    } else if (columns.has("updatedAt")) {
      updates.push("updatedAt = CURRENT_TIMESTAMP");
    }

    if (updates.length === 0) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "No valid fields to update",
      });
      return;
    }

    const numericId = Number(id);
    if (Number.isInteger(numericId) && String(numericId) === String(id)) {
      await d1Query(`UPDATE events SET ${updates.join(", ")} WHERE id = ? OR rowid = ?`, [
        ...params,
        id,
        numericId,
      ]);
    } else {
      await d1Query(`UPDATE events SET ${updates.join(", ")} WHERE id = ?`, [...params, id]);
    }

    sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("[auth-server] Update event failed:", error);
    sendJson(res, 500, {
      error: "failed_to_update_event",
      message: error.message,
    });
  }
}

function parseScreenshots(rawScreenshots) {
  if (Array.isArray(rawScreenshots)) {
    return rawScreenshots
      .map((item) => {
        if (typeof item === "string") {
          return { image: item, caption: "" };
        }
        if (item && typeof item === "object" && typeof item.image === "string") {
          return {
            image: item.image,
            caption: typeof item.caption === "string" ? item.caption : "",
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  if (typeof rawScreenshots === "string") {
    const trimmed = rawScreenshots.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      return parseScreenshots(parsed);
    } catch {
      return [];
    }
  }

  return [];
}

// Products handlers
async function getProducts(req, res, urlParams) {
  try {
    const limit = parseInt(urlParams.get("limit")) || 10;
    const page = parseInt(urlParams.get("page")) || 1;
    const offset = (page - 1) * limit;
    const columns = await getTableColumns("products");
    const requestUser = getRequestUser(req);
    const isMember = requestUser?.role === "member";
    const ownershipFilter = isMember ? getOwnershipFilter(columns, requestUser) : null;

    if (isMember && !ownershipFilter) {
      sendJson(res, 200, {
        docs: [],
        totalDocs: 0,
        limit,
        page,
        totalPages: 0,
        hasPrevPage: false,
        hasNextPage: false,
      });
      return;
    }

    const whereClause = ownershipFilter ? `WHERE ${ownershipFilter.clause}` : "";
    const whereParams = ownershipFilter ? ownershipFilter.params : [];
    const rows = await d1Query(
      `SELECT * FROM products ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...whereParams, limit, offset]
    );
    
    // Normalize product fields with fallbacks
    const docs = rows.map((row) => ({
      ...row,
      category: row.category ?? row.productCategory ?? "Other",
      tags: typeof row.tags === "string" ? row.tags.split(",").map(t => t.trim()).filter(Boolean) : row.tags ?? [],
      screenshots: parseScreenshots(row.screenshots ?? row.screenshot_data),
      ownerName: row.ownerName ?? row.owner_name ?? "Anonymous",
      ownerEmail: row.ownerEmail ?? row.owner_email ?? "",
      productLink: row.productLink ?? row.product_link ?? row.website_url ?? "",
      demoLink: row.demoLink ?? row.demo_link ?? row.demo_url ?? "",
      thumbnail: row.thumbnail ?? row.image ?? row.image_url ?? null,
      technicalLead: row.technicalLead ?? row.technical_lead ?? "",
      supportEmail: row.supportEmail ?? row.support_email ?? "",
      status: row.status ?? "pending",
      createdAt: row.createdAt ?? row.created_at ?? null,
    }));

    const totalRows = await d1Query(
      `SELECT COUNT(*) as count FROM products ${whereClause}`,
      whereParams,
    );
    const totalDocs = totalRows[0]?.count || 0;

    sendJson(res, 200, {
      docs,
      totalDocs,
      limit,
      page,
      totalPages: Math.ceil(totalDocs / limit),
      hasPrevPage: page > 1,
      hasNextPage: page < Math.ceil(totalDocs / limit),
    });
  } catch (error) {
    console.error("[auth-server] Get products failed:", error);
    sendJson(res, 500, { error: "failed_to_fetch_products", message: error.message });
  }
}

async function getProductById(req, res, id) {
  try {
    if (!id) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "Product id is required",
      });
      return;
    }

    const numericId = Number(id);
    const rows = Number.isInteger(numericId) && String(numericId) === String(id)
      ? await d1Query("SELECT rowid as _rowid, * FROM products WHERE id = ? OR rowid = ? LIMIT 1", [
          id,
          numericId,
        ])
      : await d1Query("SELECT rowid as _rowid, * FROM products WHERE id = ? LIMIT 1", [id]);

    const row = rows[0];
    if (!row) {
      sendJson(res, 404, {
        error: "not_found",
        message: "Product not found",
      });
      return;
    }

    const requestUser = getRequestUser(req);
    if (requestUser?.role === "member" && !isRowOwnedByUser(row, requestUser)) {
      sendJson(res, 404, {
        error: "not_found",
        message: "Product not found",
      });
      return;
    }

    sendJson(res, 200, {
      doc: {
        ...row,
        id: row.id ?? row._rowid ?? null,
        category: row.category ?? row.productCategory ?? "Other",
        tags: typeof row.tags === "string" ? row.tags.split(",").map(t => t.trim()).filter(Boolean) : row.tags ?? [],
        screenshots: parseScreenshots(row.screenshots ?? row.screenshot_data),
        ownerName: row.ownerName ?? row.owner_name ?? "Anonymous",
        ownerEmail: row.ownerEmail ?? row.owner_email ?? "",
        productLink: row.productLink ?? row.product_link ?? row.website_url ?? "",
        demoLink: row.demoLink ?? row.demo_link ?? row.demo_url ?? "",
        thumbnail: row.thumbnail ?? row.image ?? row.image_url ?? null,
        technicalLead: row.technicalLead ?? row.technical_lead ?? "",
        supportEmail: row.supportEmail ?? row.support_email ?? "",
        status: row.status ?? "pending",
      },
    });
  } catch (error) {
    console.error("[auth-server] Get product by id failed:", error);
    sendJson(res, 500, {
      error: "failed_to_fetch_product",
      message: error.message,
    });
  }
}

async function createProduct(req, res) {
  try {
    const requestUser = getRequestUser(req);
    const isAdmin = requestUser?.role === "admin";
    const body = await readJsonBody(req);
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "Other";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const tags = Array.isArray(body.tags) ? body.tags.map(t => String(t).trim()).filter(Boolean) : [];
    const ownerName = typeof body.ownerName === "string" ? body.ownerName.trim() : "Anonymous";
    const ownerEmailInput = typeof body.ownerEmail === "string" ? body.ownerEmail.trim().toLowerCase() : "";
    const ownerEmail = requestUser?.role === "member"
      ? (typeof requestUser?.email === "string" ? requestUser.email.toLowerCase() : ownerEmailInput)
      : ownerEmailInput;
    const ownerId = requestUser?.sub ?? requestUser?.id ?? "";
    const productLink = typeof body.productLink === "string" ? body.productLink.trim() : "";
    const demoLink = typeof body.demoLink === "string" ? body.demoLink.trim() : "";
    const thumbnail = typeof body.thumbnail === "string" ? body.thumbnail.trim() : "";
    const technicalLead = typeof body.technicalLead === "string" ? body.technicalLead.trim() : "";
    const supportEmail = typeof body.supportEmail === "string" ? body.supportEmail.trim() : "";
    const status = isAdmin
      ? (body.status === "approved" || body.status === "rejected" || body.status === "pending"
          ? body.status
          : "approved")
      : "approved";

    if (!title) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "Product title is required",
      });
      return;
    }

    const columns = await getTableColumns("products");
    if (!columns.has("title")) {
      throw new Error("Products table is missing required 'title' column");
    }

    // Start building the insert
    const productId = crypto.randomUUID();
    const insertColumns = [];
    const insertValues = [];

    if (columns.has("id")) {
      insertColumns.push("id");
      insertValues.push(productId);
    }

    insertColumns.push("title");
    insertValues.push(title);

    if (columns.has("category")) {
      insertColumns.push("category");
      insertValues.push(category);
    } else if (columns.has("productCategory")) {
      insertColumns.push("productCategory");
      insertValues.push(category);
    } else if (columns.has("product_category")) {
      insertColumns.push("product_category");
      insertValues.push(category);
    }

    if (columns.has("description")) {
      insertColumns.push("description");
      insertValues.push(description || null);
    }

    if (columns.has("tags")) {
      insertColumns.push("tags");
      insertValues.push(tags.length > 0 ? tags.join(",") : null);
    }

    if (columns.has("ownerName")) {
      insertColumns.push("ownerName");
      insertValues.push(ownerName);
    } else if (columns.has("owner_name")) {
      insertColumns.push("owner_name");
      insertValues.push(ownerName);
    }

    if (columns.has("ownerEmail")) {
      insertColumns.push("ownerEmail");
      insertValues.push(ownerEmail || null);
    } else if (columns.has("owner_email")) {
      insertColumns.push("owner_email");
      insertValues.push(ownerEmail || null);
    }

    if (columns.has("productLink")) {
      insertColumns.push("productLink");
      insertValues.push(productLink || null);
    } else if (columns.has("product_link")) {
      insertColumns.push("product_link");
      insertValues.push(productLink || null);
    } else if (columns.has("website_url")) {
      insertColumns.push("website_url");
      insertValues.push(productLink || null);
    }

    if (columns.has("demoLink")) {
      insertColumns.push("demoLink");
      insertValues.push(demoLink || null);
    } else if (columns.has("demo_link")) {
      insertColumns.push("demo_link");
      insertValues.push(demoLink || null);
    } else if (columns.has("demo_url")) {
      insertColumns.push("demo_url");
      insertValues.push(demoLink || null);
    }

    if (columns.has("thumbnail")) {
      insertColumns.push("thumbnail");
      insertValues.push(thumbnail || null);
    } else if (columns.has("image")) {
      insertColumns.push("image");
      insertValues.push(thumbnail || null);
    } else if (columns.has("image_url")) {
      insertColumns.push("image_url");
      insertValues.push(thumbnail || null);
    }

    if (columns.has("technicalLead")) {
      insertColumns.push("technicalLead");
      insertValues.push(technicalLead || null);
    } else if (columns.has("technical_lead")) {
      insertColumns.push("technical_lead");
      insertValues.push(technicalLead || null);
    }

    if (columns.has("supportEmail")) {
      insertColumns.push("supportEmail");
      insertValues.push(supportEmail || null);
    } else if (columns.has("support_email")) {
      insertColumns.push("support_email");
      insertValues.push(supportEmail || null);
    }

    if (columns.has("status")) {
      insertColumns.push("status");
      insertValues.push(status);
    }

    // Handle screenshots
    let screenshotData = null;
        // Handle owner_id for Payload CMS compatibility
        if (columns.has("owner_id")) {
          insertColumns.push("owner_id");
          insertValues.push(ownerId ? String(ownerId) : crypto.randomUUID());
        } else if (columns.has("ownerId")) {
          insertColumns.push("ownerId");
          insertValues.push(ownerId ? String(ownerId) : crypto.randomUUID());
        }
    
    if (Array.isArray(body.screenshots) && body.screenshots.length > 0) {
      screenshotData = JSON.stringify(body.screenshots);
      if (columns.has("screenshots")) {
        insertColumns.push("screenshots");
        insertValues.push(screenshotData);
      } else if (columns.has("screenshot_data")) {
        insertColumns.push("screenshot_data");
        insertValues.push(screenshotData);
      }
    }

    const sql = `INSERT INTO products (${insertColumns.join(", ")}) VALUES (${insertColumns.map(() => "?").join(", ")})`;
    await d1Query(sql, insertValues);

    sendJson(res, 200, {
      ok: true,
      doc: {
        id: productId,
        title,
        category,
        description,
        tags,
        ownerName,
        ownerEmail,
        productLink,
        demoLink,
        thumbnail,
        technicalLead,
        supportEmail,
        status,
        screenshots: body.screenshots || [],
      },
    });
  } catch (error) {
    console.error("[auth-server] Create product failed:", error);
    sendJson(res, 500, {
      error: "failed_to_create_product",
      message: error.message,
    });
  }
}

async function updateProduct(req, res, id) {
  try {
    if (!id) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "Product id is required",
      });
      return;
    }

    const requestUser = getRequestUser(req);
    const isAdmin = requestUser?.role === "admin";

    const numericId = Number(id);
    const existingRows = Number.isInteger(numericId) && String(numericId) === String(id)
      ? await d1Query("SELECT rowid as _rowid, * FROM products WHERE id = ? OR rowid = ? LIMIT 1", [id, numericId])
      : await d1Query("SELECT rowid as _rowid, * FROM products WHERE id = ? LIMIT 1", [id]);

    const existing = existingRows[0];
    if (!existing) {
      sendJson(res, 404, {
        error: "not_found",
        message: "Product not found",
      });
      return;
    }

    if (!isAdmin && !isRowOwnedByUser(existing, requestUser)) {
      sendJson(res, 403, {
        error: "forbidden",
        message: "You can only edit your own product",
      });
      return;
    }

    const body = await readJsonBody(req);
    const columns = await getTableColumns("products");

    const updates = [];
    const params = [];

    // Map each possible field to its database column variant
    if (typeof body.title === "string" && columns.has("title")) {
      updates.push("title = ?");
      params.push(body.title.trim());
    }

    if (typeof body.category === "string" && (columns.has("category") || columns.has("productCategory") || columns.has("product_category"))) {
      const col = columns.has("category") ? "category" : columns.has("productCategory") ? "productCategory" : "product_category";
      updates.push(`${col} = ?`);
      params.push(body.category.trim());
    }

    if (typeof body.description === "string" && columns.has("description")) {
      updates.push("description = ?");
      params.push(body.description.trim());
    }

    if (Array.isArray(body.tags)) {
      if (columns.has("tags")) {
        updates.push("tags = ?");
        params.push(body.tags.length > 0 ? body.tags.join(",") : null);
      }
    }

    if (isAdmin && typeof body.status === "string" && columns.has("status")) {
      updates.push("status = ?");
      params.push(body.status);
    }

    if (typeof body.productLink === "string") {
      if (columns.has("productLink")) {
        updates.push("productLink = ?");
        params.push(body.productLink.trim() || null);
      } else if (columns.has("product_link")) {
        updates.push("product_link = ?");
        params.push(body.productLink.trim() || null);
      } else if (columns.has("website_url")) {
        updates.push("website_url = ?");
        params.push(body.productLink.trim() || null);
      }
    }

    if (typeof body.demoLink === "string") {
      if (columns.has("demoLink")) {
        updates.push("demoLink = ?");
        params.push(body.demoLink.trim() || null);
      } else if (columns.has("demo_link")) {
        updates.push("demo_link = ?");
        params.push(body.demoLink.trim() || null);
      } else if (columns.has("demo_url")) {
        updates.push("demo_url = ?");
        params.push(body.demoLink.trim() || null);
      }
    }

    if (typeof body.technicalLead === "string") {
      if (columns.has("technicalLead")) {
        updates.push("technicalLead = ?");
        params.push(body.technicalLead.trim() || null);
      } else if (columns.has("technical_lead")) {
        updates.push("technical_lead = ?");
        params.push(body.technicalLead.trim() || null);
      }
    }

    if (typeof body.supportEmail === "string") {
      if (columns.has("supportEmail")) {
        updates.push("supportEmail = ?");
        params.push(body.supportEmail.trim() || null);
      } else if (columns.has("support_email")) {
        updates.push("support_email = ?");
        params.push(body.supportEmail.trim() || null);
      }
    }

    if (Array.isArray(body.screenshots)) {
      const screenshotJson = body.screenshots.length > 0 ? JSON.stringify(body.screenshots) : null;
      if (columns.has("screenshots")) {
        updates.push("screenshots = ?");
        params.push(screenshotJson);
      } else if (columns.has("screenshot_data")) {
        updates.push("screenshot_data = ?");
        params.push(screenshotJson);
      }
    }

    if (columns.has("updated_at")) {
      updates.push("updated_at = CURRENT_TIMESTAMP");
    } else if (columns.has("updatedAt")) {
      updates.push("updatedAt = CURRENT_TIMESTAMP");
    }

    if (updates.length === 0) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "No valid fields to update",
      });
      return;
    }

    if (Number.isInteger(numericId) && String(numericId) === String(id)) {
      await d1Query(`UPDATE products SET ${updates.join(", ")} WHERE id = ? OR rowid = ?`, [
        ...params,
        id,
        numericId,
      ]);
    } else {
      await d1Query(`UPDATE products SET ${updates.join(", ")} WHERE id = ?`, [...params, id]);
    }

    sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("[auth-server] Update product failed:", error);
    sendJson(res, 500, {
      error: "failed_to_update_product",
      message: error.message,
    });
  }
}

async function deleteProduct(req, res, id) {
  try {
    if (!id) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "Product id is required",
      });
      return;
    }

    const requestUser = getRequestUser(req);
    const isAdmin = requestUser?.role === "admin";

    const numericId = Number(id);
    const existingRows = Number.isInteger(numericId) && String(numericId) === String(id)
      ? await d1Query("SELECT rowid as _rowid, * FROM products WHERE id = ? OR rowid = ? LIMIT 1", [id, numericId])
      : await d1Query("SELECT rowid as _rowid, * FROM products WHERE id = ? LIMIT 1", [id]);

    const existing = existingRows[0];
    if (!existing) {
      sendJson(res, 404, {
        error: "not_found",
        message: "Product not found",
      });
      return;
    }

    if (!isAdmin && !isRowOwnedByUser(existing, requestUser)) {
      sendJson(res, 403, {
        error: "forbidden",
        message: "You can only delete your own product",
      });
      return;
    }

    if (Number.isInteger(numericId) && String(numericId) === String(id)) {
      await d1Query("DELETE FROM products WHERE id = ? OR rowid = ?", [id, numericId]);
    } else {
      await d1Query("DELETE FROM products WHERE id = ?", [id]);
    }

    sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("[auth-server] Delete product failed:", error);
    sendJson(res, 500, {
      error: "failed_to_delete_product",
      message: error.message,
    });
  }
}

async function getDailyCountsByTable(tableName) {
  try {
    const columns = await getTableColumns(tableName);
    if (!columns || columns.size === 0) {
      return [];
    }

    const createdColumn = columns.has("created_at")
      ? "created_at"
      : columns.has("createdAt")
        ? "createdAt"
        : null;

    if (!createdColumn) {
      return [];
    }

    const rows = await d1Query(
      `SELECT substr(${createdColumn}, 1, 10) as date, COUNT(*) as count
       FROM ${tableName}
       WHERE ${createdColumn} IS NOT NULL
       GROUP BY substr(${createdColumn}, 1, 10)
       ORDER BY date ASC
       LIMIT 120`,
    );

    return rows.map((row) => ({
      date: row.date,
      count: Number(row.count || 0),
    }));
  } catch {
    return [];
  }
}

async function getProjectSubmissionSummary() {
  try {
    const columns = await getTableColumns("products");
    if (!columns || columns.size === 0) {
      return {
        totalSubmissions: 0,
        uniqueSubmitters: 0,
      };
    }

    const totalRows = await d1Query("SELECT COUNT(*) as count FROM products");
    const totalSubmissions = Number(totalRows[0]?.count || 0);

    let uniqueSubmitters = 0;
    if (columns.has("ownerEmail")) {
      const uniqueRows = await d1Query(
        "SELECT COUNT(DISTINCT ownerEmail) as count FROM products WHERE ownerEmail IS NOT NULL AND ownerEmail <> ''",
      );
      uniqueSubmitters = Number(uniqueRows[0]?.count || 0);
    } else if (columns.has("owner_email")) {
      const uniqueRows = await d1Query(
        "SELECT COUNT(DISTINCT owner_email) as count FROM products WHERE owner_email IS NOT NULL AND owner_email <> ''",
      );
      uniqueSubmitters = Number(uniqueRows[0]?.count || 0);
    }

    return {
      totalSubmissions,
      uniqueSubmitters,
    };
  } catch {
    return {
      totalSubmissions: 0,
      uniqueSubmitters: 0,
    };
  }
}

async function getDashboardMetrics(req, res) {
  try {
    const [userRegistrationsDaily, projectSubmissionsDaily, usersTotalRows, projectSummary] =
      await Promise.all([
        getDailyCountsByTable("users"),
        getDailyCountsByTable("products"),
        d1Query("SELECT COUNT(*) as count FROM users"),
        getProjectSubmissionSummary(),
      ]);

    sendJson(res, 200, {
      userRegistrationsDaily,
      projectSubmissionsDaily,
      totals: {
        registeredUsers: Number(usersTotalRows[0]?.count || 0),
        projectSubmissions: projectSummary.totalSubmissions,
        uniqueProjectSubmitters: projectSummary.uniqueSubmitters,
      },
    });
  } catch (error) {
    console.error("[auth-server] Get dashboard metrics failed:", error);
    sendJson(res, 500, {
      error: "failed_to_fetch_dashboard_metrics",
      message: error.message,
    });
  }
}

async function getNews(req, res, urlParams) {
  try {
    const limit = parseInt(urlParams.get("limit")) || 10;
    const page = parseInt(urlParams.get("page")) || 1;
    const offset = (page - 1) * limit;
    const search = typeof urlParams.get("search") === "string" ? urlParams.get("search").trim() : "";
    const requestUser = getRequestUser(req);
    const statusFilterFromWhere = getStatusFilterFromWhere(urlParams);
    const isAdmin = requestUser?.role === "admin";
    const columns = await getTableColumns("news");

    const whereParts = [];
    const whereParams = [];

    if (statusFilterFromWhere) {
      whereParts.push("status = ?");
      whereParams.push(statusFilterFromWhere);
    } else if (!isAdmin) {
      whereParts.push("status = ?");
      whereParams.push("published");
    }

    if (search) {
      const searchTerm = `%${search}%`;
      const searchParts = [];

      if (columns.has("title")) {
        searchParts.push("title LIKE ?");
        whereParams.push(searchTerm);
      }

      if (columns.has("content")) {
        searchParts.push("content LIKE ?");
        whereParams.push(searchTerm);
      }

      if (columns.has("metaDescription")) {
        searchParts.push("metaDescription LIKE ?");
        whereParams.push(searchTerm);
      } else if (columns.has("meta_description")) {
        searchParts.push("meta_description LIKE ?");
        whereParams.push(searchTerm);
      }

      if (searchParts.length > 0) {
        whereParts.push(`(${searchParts.join(" OR ")})`);
      }
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

    const rows = await d1Query(
      `SELECT * FROM news ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...whereParams, limit, offset]
    );

    const totalRows = await d1Query(`SELECT COUNT(*) as count FROM news ${whereClause}`, whereParams);
    const totalDocs = totalRows[0]?.count || 0;

    sendJson(res, 200, {
      docs: rows,
      totalDocs,
      limit,
      page,
      totalPages: Math.ceil(totalDocs / limit),
      hasPrevPage: page > 1,
      hasNextPage: page < Math.ceil(totalDocs / limit),
    });
  } catch (error) {
    console.error("[auth-server] Get news failed:", error);
    sendJson(res, 500, { error: "failed_to_fetch_news", message: error.message });
  }
}

async function getNewsById(req, res, id) {
  try {
    if (!id) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "News id is required",
      });
      return;
    }

    const numericId = Number(id);
    const rows = Number.isInteger(numericId) && String(numericId) === String(id)
      ? await d1Query("SELECT rowid as _rowid, * FROM news WHERE id = ? OR rowid = ? LIMIT 1", [
          id,
          numericId,
        ])
      : await d1Query("SELECT rowid as _rowid, * FROM news WHERE id = ? LIMIT 1", [id]);

    const row = rows[0];
    if (!row) {
      sendJson(res, 404, {
        error: "not_found",
        message: "News not found",
      });
      return;
    }

    sendJson(res, 200, {
      doc: {
        ...row,
        id: row.id ?? row._rowid ?? null,
      },
    });
  } catch (error) {
    console.error("[auth-server] Get news by id failed:", error);
    sendJson(res, 500, {
      error: "failed_to_fetch_news",
      message: error.message,
    });
  }
}

async function getNewsBySlug(req, res, slug) {
  try {
    if (!slug) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "News slug is required",
      });
      return;
    }

    const rows = await d1Query(
      "SELECT rowid as _rowid, * FROM news WHERE slug = ? AND status = 'published' LIMIT 1",
      [slug],
    );
    const row = rows[0];

    if (!row) {
      sendJson(res, 404, {
        error: "not_found",
        message: "Article not found",
      });
      return;
    }

    sendJson(res, 200, {
      doc: {
        ...row,
        id: row.id ?? row._rowid ?? null,
      },
    });
  } catch (error) {
    console.error("[auth-server] Get news by slug failed:", error);
    sendJson(res, 500, {
      error: "failed_to_fetch_news",
      message: error.message,
    });
  }
}

async function getNewsLikes(req, res, newsId) {
  try {
    if (!newsId) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "News id is required",
      });
      return;
    }

    const newsRow = await getNewsOwnerRow(newsId);
    if (!newsRow || newsRow.status !== "published") {
      sendJson(res, 404, {
        error: "not_found",
        message: "Article not found",
      });
      return;
    }

    const requestUser = getRequestUser(req);
    const actor = getRequestActor(req, requestUser);

    const totalRows = await d1Query("SELECT COUNT(*) as count FROM news_likes WHERE news_id = ?", [String(newsId)]);
    const likedRows = await d1Query(
      "SELECT id FROM news_likes WHERE news_id = ? AND actor_key = ? LIMIT 1",
      [String(newsId), actor.actorKey],
    );

    sendJson(res, 200, {
      total: Number(totalRows[0]?.count || 0),
      liked: likedRows.length > 0,
    });
  } catch (error) {
    console.error("[auth-server] Get news likes failed:", error);
    sendJson(res, 500, {
      error: "failed_to_fetch_news_likes",
      message: error.message,
    });
  }
}

async function toggleNewsLike(req, res, newsId) {
  try {
    if (!newsId) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "News id is required",
      });
      return;
    }

    const newsRow = await getNewsOwnerRow(newsId);
    if (!newsRow || newsRow.status !== "published") {
      sendJson(res, 404, {
        error: "not_found",
        message: "Article not found",
      });
      return;
    }

    const requestUser = getRequestUser(req);
    const actor = getRequestActor(req, requestUser);
    const newsIdValue = String(newsId);

    const existing = await d1Query(
      "SELECT id FROM news_likes WHERE news_id = ? AND actor_key = ? LIMIT 1",
      [newsIdValue, actor.actorKey],
    );

    let liked = false;
    if (existing.length > 0) {
      await d1Query("DELETE FROM news_likes WHERE id = ?", [existing[0].id]);
      liked = false;
    } else {
      await d1Query(
        `INSERT INTO news_likes (id, news_id, actor_key, user_id, user_email, user_name, is_anonymous)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          newsIdValue,
          actor.actorKey,
          actor.userId,
          actor.userEmail,
          actor.userName,
          actor.isAnonymous ? 1 : 0,
        ],
      );
      liked = true;
    }

    const totalRows = await d1Query("SELECT COUNT(*) as count FROM news_likes WHERE news_id = ?", [newsIdValue]);
    sendJson(res, 200, {
      liked,
      total: Number(totalRows[0]?.count || 0),
    });
  } catch (error) {
    console.error("[auth-server] Toggle news like failed:", error);
    sendJson(res, 500, {
      error: "failed_to_toggle_news_like",
      message: error.message,
    });
  }
}

async function getNewsComments(req, res, newsId) {
  try {
    if (!newsId) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "News id is required",
      });
      return;
    }

    const newsRow = await getNewsOwnerRow(newsId);
    if (!newsRow || newsRow.status !== "published") {
      sendJson(res, 404, {
        error: "not_found",
        message: "Article not found",
      });
      return;
    }

    const comments = await d1Query(
      `SELECT id, news_id, user_name, content, created_at, is_anonymous
       FROM news_comments
       WHERE news_id = ?
       ORDER BY created_at DESC`,
      [String(newsId)],
    );

    sendJson(res, 200, {
      comments: comments.map((comment) => ({
        ...comment,
        user_name:
          comment.user_name && String(comment.user_name).trim()
            ? comment.user_name
            : comment.is_anonymous
              ? "Anonymous"
              : "Anonymous",
      })),
    });
  } catch (error) {
    console.error("[auth-server] Get news comments failed:", error);
    sendJson(res, 500, {
      error: "failed_to_fetch_news_comments",
      message: error.message,
    });
  }
}

async function createNewsComment(req, res, newsId) {
  try {
    if (!newsId) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "News id is required",
      });
      return;
    }

    const newsRow = await getNewsOwnerRow(newsId);
    if (!newsRow || newsRow.status !== "published") {
      sendJson(res, 404, {
        error: "not_found",
        message: "Article not found",
      });
      return;
    }

    const body = await readJsonBody(req);
    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!content) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "Comment content is required",
      });
      return;
    }

    const requestUser = getRequestUser(req);
    const userName =
      typeof requestUser?.name === "string" && requestUser.name.trim()
        ? requestUser.name.trim()
        : typeof requestUser?.email === "string"
          ? requestUser.email.split("@")[0]
          : "Anonymous";
    const userId = requestUser?.sub ?? requestUser?.id ?? null;
    const userEmail = typeof requestUser?.email === "string" ? requestUser.email.toLowerCase() : null;
    const isAnonymous = !requestUser;

    await d1Query(
      `INSERT INTO news_comments (id, news_id, user_id, user_email, user_name, content, is_anonymous)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        String(newsId),
        userId ? String(userId) : null,
        userEmail,
        isAnonymous ? "Anonymous" : userName,
        content,
        isAnonymous ? 1 : 0,
      ],
    );

    sendJson(res, 201, {
      ok: true,
      message: "Comment posted",
    });
  } catch (error) {
    console.error("[auth-server] Create news comment failed:", error);
    sendJson(res, 500, {
      error: "failed_to_create_news_comment",
      message: error.message,
    });
  }
}

async function deleteNewsComment(req, res, commentId) {
  try {
    if (!commentId) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "Comment id is required",
      });
      return;
    }

    const requestUser = getRequestUser(req);
    if (requestUser?.role !== "admin") {
      sendJson(res, 403, {
        error: "forbidden",
        message: "Only admin can delete comments",
      });
      return;
    }

    await d1Query("DELETE FROM news_comments WHERE id = ?", [commentId]);
    sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("[auth-server] Delete news comment failed:", error);
    sendJson(res, 500, {
      error: "failed_to_delete_news_comment",
      message: error.message,
    });
  }
}

async function getNewsLikers(req, res, newsId) {
  try {
    if (!newsId) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "News id is required",
      });
      return;
    }

    const requestUser = getRequestUser(req);
    if (requestUser?.role !== "admin") {
      sendJson(res, 403, {
        error: "forbidden",
        message: "Only admin can view liker list",
      });
      return;
    }

    const newsRow = await getNewsOwnerRow(newsId);
    if (!newsRow) {
      sendJson(res, 404, {
        error: "not_found",
        message: "Article not found",
      });
      return;
    }

    if (!isAdminOwnerOfNews(newsRow, requestUser)) {
      sendJson(res, 403, {
        error: "forbidden",
        message: "You can only view likes for your own article",
      });
      return;
    }

    const likes = await d1Query(
      `SELECT user_name, user_email, is_anonymous, created_at
       FROM news_likes
       WHERE news_id = ?
       ORDER BY created_at DESC`,
      [String(newsId)],
    );

    sendJson(res, 200, {
      likes: likes.map((like) => ({
        name:
          like.is_anonymous === 1
            ? "Anonymous"
            : (like.user_name || like.user_email || "Unknown"),
        email: like.is_anonymous === 1 ? null : (like.user_email || null),
        isAnonymous: like.is_anonymous === 1,
        createdAt: like.created_at,
      })),
      total: likes.length,
    });
  } catch (error) {
    console.error("[auth-server] Get news likers failed:", error);
    sendJson(res, 500, {
      error: "failed_to_fetch_news_likers",
      message: error.message,
    });
  }
}

async function getEventLikes(req, res, eventId) {
  try {
    if (!eventId) {
      sendJson(res, 400, { error: "invalid_request", message: "Event id is required" });
      return;
    }

    const eventRow = await getEventOwnerRow(eventId);
    if (!eventRow) {
      sendJson(res, 404, { error: "not_found", message: "Event not found" });
      return;
    }

    const requestUser = getRequestUser(req);
    const actor = getRequestActor(req, requestUser);
    const eventIdValue = String(eventId);

    const totalRows = await d1Query("SELECT COUNT(*) as count FROM event_likes WHERE event_id = ?", [eventIdValue]);
    const likedRows = await d1Query(
      "SELECT id FROM event_likes WHERE event_id = ? AND actor_key = ? LIMIT 1",
      [eventIdValue, actor.actorKey],
    );

    sendJson(res, 200, {
      total: Number(totalRows[0]?.count || 0),
      liked: likedRows.length > 0,
    });
  } catch (error) {
    console.error("[auth-server] Get event likes failed:", error);
    sendJson(res, 500, {
      error: "failed_to_fetch_event_likes",
      message: error.message,
    });
  }
}

async function getEventRegistrations(req, res, eventId) {
  try {
    if (!eventId) {
      sendJson(res, 400, { error: "invalid_request", message: "Event id is required" });
      return;
    }

    const eventRow = await getEventOwnerRow(eventId);
    if (!eventRow) {
      sendJson(res, 404, { error: "not_found", message: "Event not found" });
      return;
    }

    const requestUser = getRequestUser(req);
    const actor = getRequestActor(req, requestUser);
    const eventIdValue = String(eventId);

    const rows = await d1Query(
      `SELECT user_name, user_email, is_anonymous, created_at
       FROM event_registrations
       WHERE event_id = ?
       ORDER BY created_at DESC`,
      [eventIdValue],
    );

    const currentActorRows = await d1Query(
      "SELECT id FROM event_registrations WHERE event_id = ? AND actor_key = ? LIMIT 1",
      [eventIdValue, actor.actorKey],
    );

    sendJson(res, 200, {
      total: rows.length,
      registered: currentActorRows.length > 0,
      registrations: rows.map((row) => ({
        name: row.is_anonymous === 1
          ? "Anonymous"
          : (row.full_name && String(row.full_name).trim())
            ? String(row.full_name).trim()
            : (row.user_full_name && String(row.user_full_name).trim())
              ? String(row.user_full_name).trim()
              : (row.user_name && String(row.user_name).trim())
                ? String(row.user_name).trim()
                : "Anonymous",
        email: row.is_anonymous === 1 ? null : row.user_email || null,
        isAnonymous: row.is_anonymous === 1,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error("[auth-server] Get event registrations failed:", error);
    sendJson(res, 500, {
      error: "failed_to_fetch_event_registrations",
      message: error.message,
    });
  }
}

async function registerEvent(req, res, eventId) {
  try {
    if (!eventId) {
      sendJson(res, 400, { error: "invalid_request", message: "Event id is required" });
      return;
    }

    const eventRow = await getEventOwnerRow(eventId);
    const eventStatus = typeof eventRow?.status === "string" ? eventRow.status.toLowerCase() : "";
    if (!eventRow || (eventStatus && eventStatus !== "published")) {
      sendJson(res, 404, { error: "not_found", message: "Event not found" });
      return;
    }

    const eventStartTs = getEventStartTimestamp(eventRow);
    if (eventStartTs !== null && eventStartTs < Date.now()) {
      sendJson(res, 400, {
        error: "registration_closed",
        message: "Registrasi sudah ditutup karena event telah berlangsung",
      });
      return;
    }

    const requestUser = getRequestUser(req);
    if (!requestUser) {
      sendJson(res, 401, {
        error: "unauthorized",
        message: "Login required to register event",
      });
      return;
    }

    const body = await readJsonBody(req);
    const fullNameInput = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const actor = getRequestActor(req, requestUser);
    const eventIdValue = String(eventId);

    const existing = await d1Query(
      "SELECT id FROM event_registrations WHERE event_id = ? AND actor_key = ? LIMIT 1",
      [eventIdValue, actor.actorKey],
    );

    if (existing.length === 0) {
      const fullName = fullNameInput || actor.userName || "";
      const displayName = fullName || "Anonymous";

      await d1Query(
        `INSERT INTO event_registrations (id, event_id, actor_key, user_id, user_email, user_name, full_name, is_anonymous)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          eventIdValue,
          actor.actorKey,
          actor.userId,
          actor.userEmail,
          displayName,
          fullName || null,
          0,
        ],
      );
    }

    const totalRows = await d1Query("SELECT COUNT(*) as count FROM event_registrations WHERE event_id = ?", [
      eventIdValue,
    ]);

    sendJson(res, 200, {
      ok: true,
      registered: true,
      total: Number(totalRows[0]?.count || 0),
      message: existing.length > 0 ? "Already registered" : "Registration successful",
    });
  } catch (error) {
    console.error("[auth-server] Register event failed:", error);
    sendJson(res, 500, {
      error: "failed_to_register_event",
      message: error.message,
    });
  }
}

async function toggleEventLike(req, res, eventId) {
  try {
    if (!eventId) {
      sendJson(res, 400, { error: "invalid_request", message: "Event id is required" });
      return;
    }

    const eventRow = await getEventOwnerRow(eventId);
    const eventStatus = typeof eventRow?.status === "string" ? eventRow.status.toLowerCase() : "";
    if (!eventRow || (eventStatus && eventStatus !== "published")) {
      sendJson(res, 404, { error: "not_found", message: "Event not found" });
      return;
    }

    const requestUser = getRequestUser(req);
    const actor = getRequestActor(req, requestUser);
    const eventIdValue = String(eventId);
    const existing = await d1Query(
      "SELECT id FROM event_likes WHERE event_id = ? AND actor_key = ? LIMIT 1",
      [eventIdValue, actor.actorKey],
    );

    let liked = false;
    if (existing.length > 0) {
      await d1Query("DELETE FROM event_likes WHERE id = ?", [existing[0].id]);
    } else {
      await d1Query(
        `INSERT INTO event_likes (id, event_id, actor_key, user_id, user_email, user_name, is_anonymous)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          eventIdValue,
          actor.actorKey,
          actor.userId,
          actor.userEmail,
          actor.userName,
          actor.isAnonymous ? 1 : 0,
        ],
      );
      liked = true;
    }

    const totalRows = await d1Query("SELECT COUNT(*) as count FROM event_likes WHERE event_id = ?", [eventIdValue]);
    sendJson(res, 200, {
      liked,
      total: Number(totalRows[0]?.count || 0),
    });
  } catch (error) {
    console.error("[auth-server] Toggle event like failed:", error);
    sendJson(res, 500, {
      error: "failed_to_toggle_event_like",
      message: error.message,
    });
  }
}

async function getEventComments(req, res, eventId) {
  try {
    if (!eventId) {
      sendJson(res, 400, { error: "invalid_request", message: "Event id is required" });
      return;
    }

    const eventRow = await getEventOwnerRow(eventId);
    const eventStatus = typeof eventRow?.status === "string" ? eventRow.status.toLowerCase() : "";
    if (!eventRow || (eventStatus && eventStatus !== "published")) {
      sendJson(res, 404, { error: "not_found", message: "Event not found" });
      return;
    }

    const comments = await d1Query(
      `SELECT id, event_id, user_name, content, created_at, is_anonymous
       FROM event_comments
       WHERE event_id = ?
       ORDER BY created_at DESC`,
      [String(eventId)],
    );

    sendJson(res, 200, {
      comments: comments.map((comment) => ({
        ...comment,
        user_name:
          comment.user_name && String(comment.user_name).trim()
            ? comment.user_name
            : "Anonymous",
      })),
    });
  } catch (error) {
    console.error("[auth-server] Get event comments failed:", error);
    sendJson(res, 500, {
      error: "failed_to_fetch_event_comments",
      message: error.message,
    });
  }
}

async function createEventComment(req, res, eventId) {
  try {
    if (!eventId) {
      sendJson(res, 400, { error: "invalid_request", message: "Event id is required" });
      return;
    }

    const eventRow = await getEventOwnerRow(eventId);
    const eventStatus = typeof eventRow?.status === "string" ? eventRow.status.toLowerCase() : "";
    if (!eventRow || (eventStatus && eventStatus !== "published")) {
      sendJson(res, 404, { error: "not_found", message: "Event not found" });
      return;
    }

    const body = await readJsonBody(req);
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) {
      sendJson(res, 400, { error: "invalid_request", message: "Comment content is required" });
      return;
    }

    const requestUser = getRequestUser(req);
    const userName =
      typeof requestUser?.name === "string" && requestUser.name.trim()
        ? requestUser.name.trim()
        : typeof requestUser?.email === "string"
          ? requestUser.email.split("@")[0]
          : "Anonymous";
    const userId = requestUser?.sub ?? requestUser?.id ?? null;
    const userEmail = typeof requestUser?.email === "string" ? requestUser.email.toLowerCase() : null;
    const isAnonymous = !requestUser;

    await d1Query(
      `INSERT INTO event_comments (id, event_id, user_id, user_email, user_name, content, is_anonymous)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        String(eventId),
        userId ? String(userId) : null,
        userEmail,
        isAnonymous ? "Anonymous" : userName,
        content,
        isAnonymous ? 1 : 0,
      ],
    );

    sendJson(res, 201, { ok: true, message: "Comment posted" });
  } catch (error) {
    console.error("[auth-server] Create event comment failed:", error);
    sendJson(res, 500, {
      error: "failed_to_create_event_comment",
      message: error.message,
    });
  }
}

async function deleteEventComment(req, res, commentId) {
  try {
    if (!commentId) {
      sendJson(res, 400, { error: "invalid_request", message: "Comment id is required" });
      return;
    }

    const requestUser = getRequestUser(req);
    if (requestUser?.role !== "admin") {
      sendJson(res, 403, { error: "forbidden", message: "Only admin can delete comments" });
      return;
    }

    await d1Query("DELETE FROM event_comments WHERE id = ?", [commentId]);
    sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("[auth-server] Delete event comment failed:", error);
    sendJson(res, 500, {
      error: "failed_to_delete_event_comment",
      message: error.message,
    });
  }
}

async function getProductLikes(req, res, productId) {
  try {
    if (!productId) {
      sendJson(res, 400, { error: "invalid_request", message: "Product id is required" });
      return;
    }

    const productRow = await getProductOwnerRow(productId);
    if (!productRow) {
      sendJson(res, 404, { error: "not_found", message: "Product not found" });
      return;
    }

    const requestUser = getRequestUser(req);
    const actor = getRequestActor(req, requestUser);
    const productIdValue = String(productId);

    const totalRows = await d1Query("SELECT COUNT(*) as count FROM product_likes WHERE product_id = ?", [productIdValue]);
    const likedRows = await d1Query(
      "SELECT id FROM product_likes WHERE product_id = ? AND actor_key = ? LIMIT 1",
      [productIdValue, actor.actorKey],
    );

    sendJson(res, 200, {
      total: Number(totalRows[0]?.count || 0),
      liked: likedRows.length > 0,
    });
  } catch (error) {
    console.error("[auth-server] Get product likes failed:", error);
    sendJson(res, 500, {
      error: "failed_to_fetch_product_likes",
      message: error.message,
    });
  }
}

async function toggleProductLike(req, res, productId) {
  try {
    if (!productId) {
      sendJson(res, 400, { error: "invalid_request", message: "Product id is required" });
      return;
    }

    const productRow = await getProductOwnerRow(productId);
    if (!productRow) {
      sendJson(res, 404, { error: "not_found", message: "Product not found" });
      return;
    }

    const requestUser = getRequestUser(req);
    const actor = getRequestActor(req, requestUser);
    const productIdValue = String(productId);
    const existing = await d1Query(
      "SELECT id FROM product_likes WHERE product_id = ? AND actor_key = ? LIMIT 1",
      [productIdValue, actor.actorKey],
    );

    let liked = false;
    if (existing.length > 0) {
      await d1Query("DELETE FROM product_likes WHERE id = ?", [existing[0].id]);
    } else {
      await d1Query(
        `INSERT INTO product_likes (id, product_id, actor_key, user_id, user_email, user_name, is_anonymous)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          productIdValue,
          actor.actorKey,
          actor.userId,
          actor.userEmail,
          actor.userName,
          actor.isAnonymous ? 1 : 0,
        ],
      );
      liked = true;
    }

    const totalRows = await d1Query("SELECT COUNT(*) as count FROM product_likes WHERE product_id = ?", [productIdValue]);
    sendJson(res, 200, {
      liked,
      total: Number(totalRows[0]?.count || 0),
    });
  } catch (error) {
    console.error("[auth-server] Toggle product like failed:", error);
    sendJson(res, 500, {
      error: "failed_to_toggle_product_like",
      message: error.message,
    });
  }
}

async function getProductComments(req, res, productId) {
  try {
    if (!productId) {
      sendJson(res, 400, { error: "invalid_request", message: "Product id is required" });
      return;
    }

    const productRow = await getProductOwnerRow(productId);
    if (!productRow) {
      sendJson(res, 404, { error: "not_found", message: "Product not found" });
      return;
    }

    const comments = await d1Query(
      `SELECT id, product_id, user_name, content, created_at, is_anonymous
       FROM product_comments
       WHERE product_id = ?
       ORDER BY created_at DESC`,
      [String(productId)],
    );

    sendJson(res, 200, {
      comments: comments.map((comment) => ({
        ...comment,
        user_name:
          comment.user_name && String(comment.user_name).trim()
            ? comment.user_name
            : "Anonymous",
      })),
    });
  } catch (error) {
    console.error("[auth-server] Get product comments failed:", error);
    sendJson(res, 500, {
      error: "failed_to_fetch_product_comments",
      message: error.message,
    });
  }
}

async function createProductComment(req, res, productId) {
  try {
    if (!productId) {
      sendJson(res, 400, { error: "invalid_request", message: "Product id is required" });
      return;
    }

    const productRow = await getProductOwnerRow(productId);
    if (!productRow) {
      sendJson(res, 404, { error: "not_found", message: "Product not found" });
      return;
    }

    const body = await readJsonBody(req);
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) {
      sendJson(res, 400, { error: "invalid_request", message: "Comment content is required" });
      return;
    }

    const requestUser = getRequestUser(req);
    const userName =
      typeof requestUser?.name === "string" && requestUser.name.trim()
        ? requestUser.name.trim()
        : typeof requestUser?.email === "string"
          ? requestUser.email.split("@")[0]
          : "Anonymous";
    const userId = requestUser?.sub ?? requestUser?.id ?? null;
    const userEmail = typeof requestUser?.email === "string" ? requestUser.email.toLowerCase() : null;
    const isAnonymous = !requestUser;

    await d1Query(
      `INSERT INTO product_comments (id, product_id, user_id, user_email, user_name, content, is_anonymous)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        String(productId),
        userId ? String(userId) : null,
        userEmail,
        isAnonymous ? "Anonymous" : userName,
        content,
        isAnonymous ? 1 : 0,
      ],
    );

    sendJson(res, 201, { ok: true, message: "Comment posted" });
  } catch (error) {
    console.error("[auth-server] Create product comment failed:", error);
    sendJson(res, 500, {
      error: "failed_to_create_product_comment",
      message: error.message,
    });
  }
}

async function deleteProductComment(req, res, commentId) {
  try {
    if (!commentId) {
      sendJson(res, 400, { error: "invalid_request", message: "Comment id is required" });
      return;
    }

    const requestUser = getRequestUser(req);
    if (requestUser?.role !== "admin") {
      sendJson(res, 403, { error: "forbidden", message: "Only admin can delete comments" });
      return;
    }

    await d1Query("DELETE FROM product_comments WHERE id = ?", [commentId]);
    sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("[auth-server] Delete product comment failed:", error);
    sendJson(res, 500, {
      error: "failed_to_delete_product_comment",
      message: error.message,
    });
  }
}

async function reportProduct(req, res, productId) {
  try {
    if (!productId) {
      sendJson(res, 400, { error: "invalid_request", message: "Product id is required" });
      return;
    }

    const productRow = await getProductOwnerRow(productId);
    if (!productRow) {
      sendJson(res, 404, { error: "not_found", message: "Product not found" });
      return;
    }

    const body = await readJsonBody(req);
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (reason.length > 500) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "Report reason cannot exceed 500 characters",
      });
      return;
    }

    const requestUser = getRequestUser(req);
    const actor = getRequestActor(req, requestUser);
    const productIdValue = String(productId);

    const existingRows = await d1Query(
      "SELECT id FROM product_reports WHERE product_id = ? AND actor_key = ? LIMIT 1",
      [productIdValue, actor.actorKey],
    );

    if (existingRows.length > 0) {
      sendJson(res, 200, {
        ok: true,
        message: "Report already submitted",
      });
      return;
    }

    const productTitle =
      typeof productRow.title === "string" && productRow.title.trim()
        ? productRow.title.trim()
        : "Product";

    await d1Query(
      `INSERT INTO product_reports (id, product_id, product_title, reason, actor_key, user_id, user_email, user_name, is_anonymous, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        productIdValue,
        productTitle,
        reason || null,
        actor.actorKey,
        actor.userId,
        actor.userEmail,
        actor.userName,
        actor.isAnonymous ? 1 : 0,
        "pending",
      ],
    );

    sendJson(res, 201, {
      ok: true,
      message: "Product reported successfully",
    });
  } catch (error) {
    console.error("[auth-server] Report product failed:", error);
    sendJson(res, 500, {
      error: "failed_to_report_product",
      message: error.message,
    });
  }
}

async function getAdminNotifications(req, res) {
  try {
    const requestUser = getRequestUser(req);
    if (requestUser?.role !== "admin") {
      sendJson(res, 403, {
        error: "forbidden",
        message: "Only admin can access notifications",
      });
      return;
    }

    const rows = await d1Query(
      `SELECT id, product_id, product_title, reason, status, created_at, user_name, user_email
       FROM product_reports
       ORDER BY created_at DESC
       LIMIT 100`,
    );

    const unreadRows = await d1Query(
      "SELECT COUNT(*) as count FROM product_reports WHERE status = ?",
      ["pending"],
    );

    sendJson(res, 200, {
      notifications: rows.map((row) => ({
        id: row.id,
        productId: row.product_id,
        productTitle: row.product_title || "Product",
        reason: row.reason || "",
        status: row.status || "pending",
        createdAt: row.created_at,
        reporterName: row.user_name || "Anonymous",
        reporterEmail: row.user_email || "",
        href: `/product/${row.product_id}`,
      })),
      unreadCount: Number(unreadRows[0]?.count || 0),
    });
  } catch (error) {
    console.error("[auth-server] Get admin notifications failed:", error);
    sendJson(res, 500, {
      error: "failed_to_fetch_notifications",
      message: error.message,
    });
  }
}

async function markAdminNotificationRead(req, res, notificationId) {
  try {
    if (!notificationId) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "Notification id is required",
      });
      return;
    }

    const requestUser = getRequestUser(req);
    if (requestUser?.role !== "admin") {
      sendJson(res, 403, {
        error: "forbidden",
        message: "Only admin can update notifications",
      });
      return;
    }

    await d1Query(
      "UPDATE product_reports SET status = ?, read_at = CURRENT_TIMESTAMP WHERE id = ?",
      ["reviewed", notificationId],
    );

    sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("[auth-server] Mark admin notification read failed:", error);
    sendJson(res, 500, {
      error: "failed_to_update_notification",
      message: error.message,
    });
  }
}

async function createNews(req, res) {
  try {
    const requestUser = getRequestUser(req);
    const body = await readJsonBody(req);
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const thumbnail = typeof body.thumbnail === "string" ? body.thumbnail.trim() : "";
    const metaTitle = typeof body.metaTitle === "string" ? body.metaTitle.trim() : "";
    const metaDescription =
      typeof body.metaDescription === "string" ? body.metaDescription.trim() : "";
    const keywords = typeof body.keywords === "string" ? body.keywords.trim() : "";
    const status = body.status === "published" ? "published" : "draft";

    if (!title || !slug || !content) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "Title, slug, and content are required",
      });
      return;
    }

    const columns = await getTableColumns("news");
    if (!columns.has("title") || !columns.has("slug") || !columns.has("content")) {
      throw new Error("News table is missing required columns");
    }

    const newsId = crypto.randomUUID();
    const insertColumns = [];
    const insertValues = [];

    if (columns.has("id")) {
      insertColumns.push("id");
      insertValues.push(newsId);
    }

    insertColumns.push("title", "slug", "content");
    insertValues.push(title, slug, content);

    if (columns.has("thumbnail")) {
      insertColumns.push("thumbnail");
      insertValues.push(thumbnail || null);
    }

    if (columns.has("metaTitle")) {
      insertColumns.push("metaTitle");
      insertValues.push(metaTitle || null);
    } else if (columns.has("meta_title")) {
      insertColumns.push("meta_title");
      insertValues.push(metaTitle || null);
    }

    if (columns.has("metaDescription")) {
      insertColumns.push("metaDescription");
      insertValues.push(metaDescription || null);
    } else if (columns.has("meta_description")) {
      insertColumns.push("meta_description");
      insertValues.push(metaDescription || null);
    }

    if (columns.has("keywords")) {
      insertColumns.push("keywords");
      insertValues.push(keywords || null);
    }

    if (columns.has("status")) {
      insertColumns.push("status");
      insertValues.push(status);
    }

    const ownerEmail = typeof requestUser?.email === "string" ? requestUser.email.toLowerCase() : "";
    const ownerId = requestUser?.sub ?? requestUser?.id ?? "";

    if (ownerEmail) {
      if (columns.has("ownerEmail")) {
        insertColumns.push("ownerEmail");
        insertValues.push(ownerEmail);
      } else if (columns.has("owner_email")) {
        insertColumns.push("owner_email");
        insertValues.push(ownerEmail);
      } else if (columns.has("authorEmail")) {
        insertColumns.push("authorEmail");
        insertValues.push(ownerEmail);
      } else if (columns.has("author_email")) {
        insertColumns.push("author_email");
        insertValues.push(ownerEmail);
      } else if (columns.has("createdByEmail")) {
        insertColumns.push("createdByEmail");
        insertValues.push(ownerEmail);
      } else if (columns.has("created_by_email")) {
        insertColumns.push("created_by_email");
        insertValues.push(ownerEmail);
      }
    }

    if (ownerId) {
      if (columns.has("ownerId")) {
        insertColumns.push("ownerId");
        insertValues.push(String(ownerId));
      } else if (columns.has("owner_id")) {
        insertColumns.push("owner_id");
        insertValues.push(String(ownerId));
      } else if (columns.has("authorId")) {
        insertColumns.push("authorId");
        insertValues.push(String(ownerId));
      } else if (columns.has("author_id")) {
        insertColumns.push("author_id");
        insertValues.push(String(ownerId));
      } else if (columns.has("createdBy")) {
        insertColumns.push("createdBy");
        insertValues.push(String(ownerId));
      } else if (columns.has("created_by")) {
        insertColumns.push("created_by");
        insertValues.push(String(ownerId));
      }
    }

    let sql = `INSERT INTO news (${insertColumns.join(", ")}) VALUES (${insertColumns
      .map(() => "?")
      .join(", ")})`;

    if (columns.has("created_at") && columns.has("updated_at")) {
      sql = `INSERT INTO news (${insertColumns.join(", ")}, created_at, updated_at) VALUES (${insertColumns
        .map(() => "?")
        .join(", ")}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
    }

    if (columns.has("createdAt") && columns.has("updatedAt")) {
      sql = `INSERT INTO news (${insertColumns.join(", ")}, createdAt, updatedAt) VALUES (${insertColumns
        .map(() => "?")
        .join(", ")}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
    }

    await d1Query(sql, insertValues);

    const insertedId = columns.has("id")
      ? newsId
      : (await d1Query("SELECT last_insert_rowid() as id"))[0]?.id ?? null;

    sendJson(res, 201, {
      ok: true,
      doc: {
        id: insertedId,
        title,
        slug,
        content,
        thumbnail: thumbnail || null,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        keywords: keywords || null,
        status,
      },
    });
  } catch (error) {
    console.error("[auth-server] Create news failed:", error);
    sendJson(res, 500, {
      error: "failed_to_create_news",
      message: error.message,
    });
  }
}

async function deleteNews(req, res, id) {
  try {
    if (!id) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "News id is required",
      });
      return;
    }

    const numericId = Number(id);
    if (Number.isInteger(numericId) && String(numericId) === String(id)) {
      await d1Query("DELETE FROM news WHERE id = ? OR rowid = ?", [id, numericId]);
    } else {
      await d1Query("DELETE FROM news WHERE id = ?", [id]);
    }

    sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("[auth-server] Delete news failed:", error);
    sendJson(res, 500, {
      error: "failed_to_delete_news",
      message: error.message,
    });
  }
}

async function updateNews(req, res, id) {
  try {
    if (!id) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "News id is required",
      });
      return;
    }

    const body = await readJsonBody(req);
    const columns = await getTableColumns("news");

    const updates = [];
    const params = [];

    if (typeof body.title === "string") {
      updates.push("title = ?");
      params.push(body.title.trim());
    }

    if (typeof body.slug === "string") {
      updates.push("slug = ?");
      params.push(body.slug.trim());
    }

    if (typeof body.content === "string") {
      updates.push("content = ?");
      params.push(body.content.trim());
    }

    if (columns.has("thumbnail") && typeof body.thumbnail === "string") {
      updates.push("thumbnail = ?");
      params.push(body.thumbnail.trim() || null);
    }

    if (typeof body.metaTitle === "string") {
      if (columns.has("metaTitle")) {
        updates.push("metaTitle = ?");
        params.push(body.metaTitle.trim() || null);
      } else if (columns.has("meta_title")) {
        updates.push("meta_title = ?");
        params.push(body.metaTitle.trim() || null);
      }
    }

    if (typeof body.metaDescription === "string") {
      if (columns.has("metaDescription")) {
        updates.push("metaDescription = ?");
        params.push(body.metaDescription.trim() || null);
      } else if (columns.has("meta_description")) {
        updates.push("meta_description = ?");
        params.push(body.metaDescription.trim() || null);
      }
    }

    if (typeof body.keywords === "string" && columns.has("keywords")) {
      updates.push("keywords = ?");
      params.push(body.keywords.trim() || null);
    }

    if (body.status === "draft" || body.status === "published") {
      if (columns.has("status")) {
        updates.push("status = ?");
        params.push(body.status);
      }
    }

    if (columns.has("updated_at")) {
      updates.push("updated_at = CURRENT_TIMESTAMP");
    } else if (columns.has("updatedAt")) {
      updates.push("updatedAt = CURRENT_TIMESTAMP");
    }

    if (updates.length === 0) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "No valid fields to update",
      });
      return;
    }

    const numericId = Number(id);
    if (Number.isInteger(numericId) && String(numericId) === String(id)) {
      await d1Query(`UPDATE news SET ${updates.join(", ")} WHERE id = ? OR rowid = ?`, [
        ...params,
        id,
        numericId,
      ]);
    } else {
      await d1Query(`UPDATE news SET ${updates.join(", ")} WHERE id = ?`, [...params, id]);
    }

    sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("[auth-server] Update news failed:", error);
    sendJson(res, 500, {
      error: "failed_to_update_news",
      message: error.message,
    });
  }
}

async function getRecordings(req, res, urlParams) {
  try {
    const limit = parseInt(urlParams.get("limit")) || 10;
    const page = parseInt(urlParams.get("page")) || 1;
    const offset = (page - 1) * limit;
    const rows = await d1Query(
      `SELECT rowid as _rowid, * FROM recordings ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const docs = rows.map((row) => ({
      ...row,
      id: row.id ?? row._rowid ?? null,
      youtubeLink: row.youtubeLink ?? row.youtube_link ?? "",
      category: row.category ?? row.recording_category ?? "General",
      speakers:
        typeof row.speakers === "string"
          ? row.speakers.split(",").map((s) => s.trim()).filter(Boolean)
          : Array.isArray(row.speakers)
            ? row.speakers
            : [],
      duration: row.duration ?? row.length ?? "",
      recordingDate: row.recordingDate ?? row.recording_date ?? row.date ?? null,
      thumbnail: row.thumbnail ?? row.image ?? row.image_url ?? null,
      createdAt: row.createdAt ?? row.created_at ?? null,
      updatedAt: row.updatedAt ?? row.updated_at ?? null,
    }));

    const totalRows = await d1Query("SELECT COUNT(*) as count FROM recordings");
    const totalDocs = totalRows[0]?.count || 0;

    sendJson(res, 200, {
      docs,
      totalDocs,
      limit,
      page,
      totalPages: Math.ceil(totalDocs / limit),
      hasPrevPage: page > 1,
      hasNextPage: page < Math.ceil(totalDocs / limit),
    });
  } catch (error) {
    console.error("[auth-server] Get recordings failed:", error);
    sendJson(res, 500, { error: "failed_to_fetch_recordings", message: error.message });
  }
}

async function getRecordingById(req, res, id) {
  try {
    if (!id) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "Recording id is required",
      });
      return;
    }

    const numericId = Number(id);
    const rows = Number.isInteger(numericId) && String(numericId) === String(id)
      ? await d1Query(
          "SELECT rowid as _rowid, * FROM recordings WHERE id = ? OR rowid = ? LIMIT 1",
          [id, numericId],
        )
      : await d1Query("SELECT rowid as _rowid, * FROM recordings WHERE id = ? LIMIT 1", [id]);

    const row = rows[0];
    if (!row) {
      sendJson(res, 404, {
        error: "not_found",
        message: "Recording not found",
      });
      return;
    }

    sendJson(res, 200, {
      doc: {
        ...row,
        id: row.id ?? row._rowid ?? null,
        youtubeLink: row.youtubeLink ?? row.youtube_link ?? "",
        category: row.category ?? row.recording_category ?? "General",
        speakers:
          typeof row.speakers === "string"
            ? row.speakers.split(",").map((s) => s.trim()).filter(Boolean)
            : Array.isArray(row.speakers)
              ? row.speakers
              : [],
        duration: row.duration ?? row.length ?? "",
        recordingDate: row.recordingDate ?? row.recording_date ?? row.date ?? null,
        thumbnail: row.thumbnail ?? row.image ?? row.image_url ?? null,
      },
    });
  } catch (error) {
    console.error("[auth-server] Get recording by id failed:", error);
    sendJson(res, 500, {
      error: "failed_to_fetch_recording",
      message: error.message,
    });
  }
}

async function createRecording(req, res) {
  try {
    const requestUser = getRequestUser(req);
    if (requestUser?.role !== "admin") {
      sendJson(res, 403, {
        error: "forbidden",
        message: "Only admin can create recordings",
      });
      return;
    }

    const body = await readJsonBody(req);
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const youtubeLink =
      typeof body.youtubeLink === "string" ? body.youtubeLink.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "General";
    const duration = typeof body.duration === "string" ? body.duration.trim() : "";
    const recordingDate =
      typeof body.recordingDate === "string"
        ? body.recordingDate.trim()
        : typeof body.date === "string"
          ? body.date.trim()
          : "";
    const thumbnail = typeof body.thumbnail === "string" ? body.thumbnail.trim() : "";
    const speakers = Array.isArray(body.speakers)
      ? body.speakers.map((speaker) => String(speaker).trim()).filter(Boolean)
      : typeof body.speakers === "string"
        ? body.speakers.split(",").map((speaker) => speaker.trim()).filter(Boolean)
        : [];
    const recordingId = crypto.randomUUID();

    if (!title || !youtubeLink) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "Title and youtubeLink are required",
      });
      return;
    }

    const columns = await getTableColumns("recordings");
    const youtubeColumn = columns.has("youtube_link")
      ? "youtube_link"
      : columns.has("youtubeLink")
        ? "youtubeLink"
        : null;

    if (!youtubeColumn || !columns.has("title")) {
      throw new Error("Recordings table is missing required columns");
    }

    const insertColumns = columns.has("id")
      ? ["id", "title", youtubeColumn]
      : ["title", youtubeColumn];
    const insertValues = columns.has("id")
      ? [recordingId, title, youtubeLink]
      : [title, youtubeLink];

    if (columns.has("description")) {
      insertColumns.push("description");
      insertValues.push(description);
    }

    if (columns.has("category")) {
      insertColumns.push("category");
      insertValues.push(category || "General");
    } else if (columns.has("recording_category")) {
      insertColumns.push("recording_category");
      insertValues.push(category || "General");
    }

    if (columns.has("duration")) {
      insertColumns.push("duration");
      insertValues.push(duration || null);
    } else if (columns.has("length")) {
      insertColumns.push("length");
      insertValues.push(duration || null);
    }

    if (columns.has("recording_date")) {
      insertColumns.push("recording_date");
      insertValues.push(recordingDate || null);
    } else if (columns.has("recordingDate")) {
      insertColumns.push("recordingDate");
      insertValues.push(recordingDate || null);
    } else if (columns.has("date")) {
      insertColumns.push("date");
      insertValues.push(recordingDate || null);
    }

    if (columns.has("thumbnail")) {
      insertColumns.push("thumbnail");
      insertValues.push(thumbnail || null);
    } else if (columns.has("image")) {
      insertColumns.push("image");
      insertValues.push(thumbnail || null);
    } else if (columns.has("image_url")) {
      insertColumns.push("image_url");
      insertValues.push(thumbnail || null);
    }

    if (columns.has("speakers")) {
      insertColumns.push("speakers");
      insertValues.push(speakers.length > 0 ? speakers.join(",") : null);
    }

    const ownerEmail = typeof requestUser?.email === "string" ? requestUser.email.toLowerCase() : "";
    const ownerId = requestUser?.sub ?? requestUser?.id ?? "";

    if (ownerEmail) {
      if (columns.has("ownerEmail")) {
        insertColumns.push("ownerEmail");
        insertValues.push(ownerEmail);
      } else if (columns.has("owner_email")) {
        insertColumns.push("owner_email");
        insertValues.push(ownerEmail);
      } else if (columns.has("createdByEmail")) {
        insertColumns.push("createdByEmail");
        insertValues.push(ownerEmail);
      } else if (columns.has("created_by_email")) {
        insertColumns.push("created_by_email");
        insertValues.push(ownerEmail);
      }
    }

    if (ownerId) {
      if (columns.has("ownerId")) {
        insertColumns.push("ownerId");
        insertValues.push(String(ownerId));
      } else if (columns.has("owner_id")) {
        insertColumns.push("owner_id");
        insertValues.push(String(ownerId));
      } else if (columns.has("createdBy")) {
        insertColumns.push("createdBy");
        insertValues.push(String(ownerId));
      } else if (columns.has("created_by")) {
        insertColumns.push("created_by");
        insertValues.push(String(ownerId));
      }
    }

    let sql = `INSERT INTO recordings (${insertColumns.join(", ")}) VALUES (${insertColumns
      .map(() => "?")
      .join(", ")})`;

    if (columns.has("created_at") && columns.has("updated_at")) {
      sql = `INSERT INTO recordings (${insertColumns.join(", ")}, created_at, updated_at) VALUES (${insertColumns
        .map(() => "?")
        .join(", ")}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
    }

    if (columns.has("createdAt") && columns.has("updatedAt")) {
      sql = `INSERT INTO recordings (${insertColumns.join(", ")}, createdAt, updatedAt) VALUES (${insertColumns
        .map(() => "?")
        .join(", ")}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
    }

    await d1Query(sql, insertValues);
    const insertedId = columns.has("id")
      ? recordingId
      : (await d1Query("SELECT last_insert_rowid() as id"))[0]?.id ?? null;

    sendJson(res, 201, {
      ok: true,
      doc: {
        id: insertedId,
        title,
        youtubeLink,
        description,
        category,
        speakers,
        duration,
        recordingDate: recordingDate || null,
        thumbnail: thumbnail || null,
      },
    });
  } catch (error) {
    console.error("[auth-server] Create recording failed:", error);
    sendJson(res, 500, {
      error: "failed_to_create_recording",
      message: error.message,
    });
  }
}

async function deleteRecording(req, res, id) {
  try {
    const requestUser = getRequestUser(req);
    if (requestUser?.role !== "admin") {
      sendJson(res, 403, {
        error: "forbidden",
        message: "Only admin can delete recordings",
      });
      return;
    }

    if (!id) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "Recording id is required",
      });
      return;
    }

    const numericId = Number(id);
    if (Number.isInteger(numericId) && String(numericId) === String(id)) {
      await d1Query("DELETE FROM recordings WHERE id = ? OR rowid = ?", [id, numericId]);
    } else {
      await d1Query("DELETE FROM recordings WHERE id = ?", [id]);
    }
    sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("[auth-server] Delete recording failed:", error);
    sendJson(res, 500, {
      error: "failed_to_delete_recording",
      message: error.message,
    });
  }
}

async function updateRecording(req, res, id) {
  try {
    const requestUser = getRequestUser(req);
    if (requestUser?.role !== "admin") {
      sendJson(res, 403, {
        error: "forbidden",
        message: "Only admin can update recordings",
      });
      return;
    }

    if (!id) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "Recording id is required",
      });
      return;
    }

    const body = await readJsonBody(req);
    const columns = await getTableColumns("recordings");
    const youtubeColumn = columns.has("youtube_link")
      ? "youtube_link"
      : columns.has("youtubeLink")
        ? "youtubeLink"
        : null;

    const updates = [];
    const params = [];

    if (typeof body.title === "string" && columns.has("title")) {
      updates.push("title = ?");
      params.push(body.title.trim());
    }

    if (typeof body.youtubeLink === "string" && youtubeColumn) {
      updates.push(`${youtubeColumn} = ?`);
      params.push(body.youtubeLink.trim());
    }

    if (typeof body.description === "string" && columns.has("description")) {
      updates.push("description = ?");
      params.push(body.description.trim());
    }

    if (typeof body.category === "string") {
      if (columns.has("category")) {
        updates.push("category = ?");
        params.push(body.category.trim() || "General");
      } else if (columns.has("recording_category")) {
        updates.push("recording_category = ?");
        params.push(body.category.trim() || "General");
      }
    }

    if (typeof body.duration === "string") {
      if (columns.has("duration")) {
        updates.push("duration = ?");
        params.push(body.duration.trim() || null);
      } else if (columns.has("length")) {
        updates.push("length = ?");
        params.push(body.duration.trim() || null);
      }
    }

    const recordingDateValue =
      typeof body.recordingDate === "string"
        ? body.recordingDate.trim()
        : typeof body.date === "string"
          ? body.date.trim()
          : null;
    if (recordingDateValue !== null) {
      if (columns.has("recording_date")) {
        updates.push("recording_date = ?");
        params.push(recordingDateValue || null);
      } else if (columns.has("recordingDate")) {
        updates.push("recordingDate = ?");
        params.push(recordingDateValue || null);
      } else if (columns.has("date")) {
        updates.push("date = ?");
        params.push(recordingDateValue || null);
      }
    }

    if (typeof body.thumbnail === "string") {
      if (columns.has("thumbnail")) {
        updates.push("thumbnail = ?");
        params.push(body.thumbnail.trim() || null);
      } else if (columns.has("image")) {
        updates.push("image = ?");
        params.push(body.thumbnail.trim() || null);
      } else if (columns.has("image_url")) {
        updates.push("image_url = ?");
        params.push(body.thumbnail.trim() || null);
      }
    }

    if (Array.isArray(body.speakers) || typeof body.speakers === "string") {
      const speakers = Array.isArray(body.speakers)
        ? body.speakers.map((speaker) => String(speaker).trim()).filter(Boolean)
        : body.speakers.split(",").map((speaker) => speaker.trim()).filter(Boolean);
      if (columns.has("speakers")) {
        updates.push("speakers = ?");
        params.push(speakers.length > 0 ? speakers.join(",") : null);
      }
    }

    if (columns.has("updated_at")) {
      updates.push("updated_at = CURRENT_TIMESTAMP");
    } else if (columns.has("updatedAt")) {
      updates.push("updatedAt = CURRENT_TIMESTAMP");
    }

    if (updates.length === 0) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "No valid fields to update",
      });
      return;
    }

    const numericId = Number(id);
    if (Number.isInteger(numericId) && String(numericId) === String(id)) {
      await d1Query(`UPDATE recordings SET ${updates.join(", ")} WHERE id = ? OR rowid = ?`, [
        ...params,
        id,
        numericId,
      ]);
    } else {
      await d1Query(`UPDATE recordings SET ${updates.join(", ")} WHERE id = ?`, [...params, id]);
    }

    sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("[auth-server] Update recording failed:", error);
    sendJson(res, 500, {
      error: "failed_to_update_recording",
      message: error.message,
    });
  }
}

// Parse multipart form data
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const contentTypeRaw = req.headers["content-type"];
    const contentType = typeof contentTypeRaw === "string" ? contentTypeRaw : "";

    if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
      reject(new Error("Invalid content type. Expected multipart/form-data"));
      return;
    }

    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    const boundary = boundaryMatch?.[1] || boundaryMatch?.[2] || "";

    if (!boundary) {
      reject(new Error("No boundary found in multipart data"));
      return;
    }

    let chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("error", reject);
    req.on("end", () => {
      try {
        const buffer = Buffer.concat(chunks);
        const parts = buffer.toString("binary").split(`--${boundary}`);
        const fields = {};
        const files = {};

        for (const part of parts) {
          if (part.includes("filename=")) {
            // File field
            const nameMatch = part.match(/name="([^"]+)"/);
            const filenameMatch = part.match(/filename="([^"]+)"/);
            const typeMatch = part.match(/Content-Type: ([^\r\n]+)/);

            if (nameMatch && filenameMatch) {
              const name = nameMatch[1];
              const filename = filenameMatch[1];
              const type = typeMatch ? typeMatch[1] : "application/octet-stream";
              const fileStart = part.indexOf("\r\n\r\n") + 4;
              const fileEnd = part.lastIndexOf("\r\n");
              const fileData = Buffer.from(part.slice(fileStart, fileEnd), "binary");

              files[name] = {
                filename,
                type,
                data: fileData,
              };
            }
          } else if (part.includes("Content-Disposition") && !part.includes("filename=")) {
            // Text field
            const nameMatch = part.match(/name="([^"]+)"/);
            if (nameMatch) {
              const name = nameMatch[1];
              const valueStart = part.indexOf("\r\n\r\n") + 4;
              const valueEnd = part.lastIndexOf("\r\n");
              const value = part.slice(valueStart, valueEnd).trim();
              fields[name] = value;
            }
          }
        }

        resolve({ fields, files });
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Image upload handler
async function uploadImage(req, res) {
  try {
    const { files } = await parseMultipart(req);
    const file = files.image || files.file;

    if (!file) {
      sendJson(res, 400, { error: "no_file", message: "No file provided" });
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      sendJson(res, 400, { error: "invalid_file_type", message: "Only image files are allowed" });
      return;
    }

    if (canUseR2) {
      const uploaded = await uploadImageToR2(file);

      sendJson(res, 200, {
        ok: true,
        filename: uploaded?.key,
        key: uploaded?.key,
        storage: "r2",
        url: `/uploads/${uploaded?.key}`,
        publicUrl: uploaded?.url,
      });
      return;
    }

    // Fallback local storage when R2 config is incomplete.
    const uploadsDir = "./uploads";
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = path.extname(file.filename) || ".jpg";
    const filename = `${randomBytes(16).toString("hex")}${ext}`;
    const filepath = path.join(uploadsDir, filename);

    await new Promise((resolve, reject) => {
      fs.writeFile(filepath, file.data, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    sendJson(res, 200, {
      ok: true,
      filename,
      storage: "local",
      url: `/uploads/${filename}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    const isBadRequest =
      message.includes("multipart/form-data") ||
      message.includes("No boundary found") ||
      message.includes("No file provided") ||
      message.includes("Only image files are allowed");

    if (isBadRequest) {
      sendJson(res, 400, { error: "invalid_upload_request", message });
      return;
    }

    console.error("[auth-server] Image upload failed:", error);
    sendJson(res, 500, { error: "upload_failed", message });
  }
}

function decodeHtmlEntities(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function stripHtml(value) {
  if (typeof value !== "string") return "";
  
  // Replace block-level elements and br tags with newlines to preserve structure
  let text = value
    .replace(/<\/(p|div|br|h[1-6]|li|blockquote)>/gi, "\n")
    .replace(/<(p|div|br|h[1-6]|li|blockquote)[^>]*>/gi, "\n");
  
  // Remove all other HTML tags
  text = text.replace(/<[^>]*>/g, "");
  
  // Decode HTML entities
  text = decodeHtmlEntities(text);
  
  // Clean up excessive whitespace while preserving intentional spacing and line breaks
  // Replace multiple consecutive spaces with single space, but preserve line breaks
  text = text
    .split("\n")
    .map(line => line.replace(/\s+/g, " ").trim())
    .filter(line => line.length > 0)
    .join("\n");
  
  return text.trim();
}

function extractMetaContent(html, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escapedKey}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${escapedKey}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escapedKey}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escapedKey}["'][^>]*>`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtmlEntities(match[1]);
  }

  return "";
}

function normalizeDateValue(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  const raw = value.trim();
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) return date.toISOString();
  return raw;
}

function pickImageValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();

  if (Array.isArray(value)) {
    for (const item of value) {
      const picked = pickImageValue(item);
      if (picked) return picked;
    }
    return "";
  }

  if (typeof value === "object") {
    if (typeof value.url === "string" && value.url.trim()) return value.url.trim();
    if (typeof value.contentUrl === "string" && value.contentUrl.trim()) return value.contentUrl.trim();
  }

  return "";
}

function pickEventPayload(node) {
  if (!node) return null;

  if (Array.isArray(node)) {
    for (const item of node) {
      const picked = pickEventPayload(item);
      if (picked) return picked;
    }
    return null;
  }

  if (typeof node === "object") {
    const maybeName = node.name || node.title;
    const maybeStart =
      node.startDate || node.start_date || node.startAt || node.start_at || node.event?.startAt;
    const maybeEnd =
      node.endDate || node.end_date || node.endAt || node.end_at || node.event?.endAt;

    if (typeof maybeName === "string" && (maybeStart || maybeEnd)) {
      return node;
    }

    for (const value of Object.values(node)) {
      const picked = pickEventPayload(value);
      if (picked) return picked;
    }
  }

  return null;
}

function extractEventDataFromJsonLd(html) {
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html))) {
    try {
      const parsed = JSON.parse(match[1]);
      const payload = pickEventPayload(parsed);
      if (!payload) continue;

      return {
        title: typeof payload.name === "string" ? payload.name.trim() : "",
        description:
          typeof payload.description === "string" ? stripHtml(payload.description) : "",
        startAt: normalizeDateValue(
          payload.startDate || payload.start_date || payload.startAt || payload.start_at || "",
        ),
        endAt: normalizeDateValue(
          payload.endDate || payload.end_date || payload.endAt || payload.end_at || "",
        ),
        thumbnail: pickImageValue(payload.image || payload.thumbnail || payload.logo),
      };
    } catch {
      // Ignore invalid JSON-LD blocks.
    }
  }

  return null;
}

function extractLooseDate(html, key) {
  const pattern = new RegExp(`"${key}"\\s*:\\s*"([^"\\n]+)"`, "i");
  const match = html.match(pattern);
  return normalizeDateValue(match?.[1] || "");
}

function extractTitleFromHtml(html) {
  return decodeHtmlEntities((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/\s+/g, " ").trim());
}

function pickFirstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function detectEventSource(parsedUrl, html) {
  const hostname = parsedUrl.hostname.toLowerCase();
  const htmlLower = html.toLowerCase();
  const siteName = pickFirstString(
    extractMetaContent(html, "og:site_name"),
    extractMetaContent(html, "twitter:site"),
    extractMetaContent(html, "application-name"),
  ).toLowerCase();

  if (
    hostname.includes("eventbrite.") ||
    siteName.includes("eventbrite") ||
    htmlLower.includes("eventbrite")
  ) {
    return "eventbrite";
  }

  if (
    hostname.includes("meetup.") ||
    siteName.includes("meetup") ||
    htmlLower.includes("meetup")
  ) {
    return "meetup";
  }

  if (
    hostname.endsWith("luma.com") ||
    hostname === "luma.com" ||
    hostname.endsWith("lu.ma") ||
    siteName.includes("luma") ||
    siteName.includes("lu.ma") ||
    htmlLower.includes("luma") ||
    htmlLower.includes("lu.ma")
  ) {
    return "luma";
  }

  return "generic";
}

function extractEventDataWithAdapter(html, parsedUrl, adapterName) {
  const jsonLdData = extractEventDataFromJsonLd(html);
  const titleFromTitleTag = extractTitleFromHtml(html);

  const titleMetaKeys = ["og:title", "twitter:title"];
  const descriptionMetaKeys = ["description", "og:description", "twitter:description"];
  const startMetaKeys = ["event:start_time", "event:start_date"];
  const endMetaKeys = ["event:end_time", "event:end_date"];
  const imageMetaKeys = ["og:image", "og:image:secure_url", "twitter:image", "twitter:image:src"];

  if (adapterName === "eventbrite") {
    imageMetaKeys.unshift("og:image:secure_url");
  }

  if (adapterName === "meetup") {
    descriptionMetaKeys.unshift("og:description");
  }

  const title = pickFirstString(
    jsonLdData?.title,
    ...titleMetaKeys.map((key) => extractMetaContent(html, key)),
    titleFromTitleTag,
  );

  const description = pickFirstString(
    jsonLdData?.description,
    ...descriptionMetaKeys.map((key) => extractMetaContent(html, key)),
  );

  const startAt = pickFirstString(
    jsonLdData?.startAt,
    ...startMetaKeys.map((key) => extractMetaContent(html, key)),
    extractLooseDate(html, "start_at"),
    extractLooseDate(html, "startAt"),
    extractLooseDate(html, "startDate"),
  );

  const endAt = pickFirstString(
    jsonLdData?.endAt,
    ...endMetaKeys.map((key) => extractMetaContent(html, key)),
    extractLooseDate(html, "end_at"),
    extractLooseDate(html, "endAt"),
    extractLooseDate(html, "endDate"),
  );

  const thumbnailRaw = pickFirstString(
    jsonLdData?.thumbnail,
    ...imageMetaKeys.map((key) => extractMetaContent(html, key)),
  );

  let thumbnail = "";
  if (thumbnailRaw) {
    try {
      thumbnail = new URL(thumbnailRaw, parsedUrl).toString();
    } catch {
      thumbnail = thumbnailRaw;
    }
  }

  return {
    title: title || "",
    description: description || "",
    startAt: normalizeDateValue(startAt),
    endAt: normalizeDateValue(endAt),
    thumbnail,
  };
}

async function scrapeEventFromUrl(req, res) {
  const user = getRequestUser(req);
  if (!user) {
    sendJson(res, 401, {
      error: "unauthorized",
      message: "Unauthorized",
    });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const sourceUrl = typeof body.url === "string" ? body.url.trim() : "";

    if (!sourceUrl) {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "URL is required",
      });
      return;
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(sourceUrl);
    } catch {
      sendJson(res, 400, {
        error: "invalid_request",
        message: "Invalid URL format",
      });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    let html = "";
    try {
      const response = await fetch(parsedUrl.toString(), {
        method: "GET",
        signal: controller.signal,
        headers: {
          "User-Agent": "MetaCommunityEventScraper/1.0",
          Accept: "text/html,application/xhtml+xml",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch source page (HTTP ${response.status})`);
      }

      html = await response.text();
    } finally {
      clearTimeout(timeout);
    }

    const adapterName = detectEventSource(parsedUrl, html);

    const eventData = extractEventDataWithAdapter(html, parsedUrl, adapterName);

    if (!eventData.title && !eventData.description && !eventData.startAt && !eventData.endAt && !eventData.thumbnail) {
      sendJson(res, 422, {
        error: "scrape_failed",
        message: "Unable to extract event details from this link",
      });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      data: {
        ...eventData,
        platform: adapterName,
      },
    });
  } catch (error) {
    console.error("[auth-server] Event scrape failed:", error);
    sendJson(res, 500, {
      error: "scrape_failed",
      message: error?.name === "AbortError" ? "Scrape request timed out" : error.message,
    });
  }
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (!req.url) {
    sendJson(res, 400, { error: "invalid_request", message: "Missing request URL" });
    return;
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  // Serve static files from uploads directory
  if (requestUrl.pathname.startsWith("/uploads/")) {
    try {
      const uploadPath = requestUrl.pathname.replace(/^\/uploads\//, "");

      if (canUseR2 && uploadPath) {
        try {
          const r2Object = await getR2Object(decodeURIComponent(uploadPath));
          if (r2Object) {
            res.setHeader("Content-Type", r2Object.contentType);
            res.setHeader("Cache-Control", r2Object.cacheControl);
            res.statusCode = 200;
            res.end(r2Object.body);
            return;
          }
        } catch (r2Error) {
          const message = r2Error instanceof Error ? r2Error.message : String(r2Error);
          console.warn("[auth-server] Failed to read image from R2:", message);
        }
      }

      const filepath = path.join(".", requestUrl.pathname);
      // Security: prevent directory traversal
      if (!path.resolve(filepath).startsWith(path.resolve("./uploads"))) {
        res.statusCode = 403;
        res.end();
        return;
      }

      if (fs.existsSync(filepath)) {
        const buffer = fs.readFileSync(filepath);
        const ext = path.extname(filepath).toLowerCase();
        const mimeTypes = {
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".png": "image/png",
          ".gif": "image/gif",
          ".webp": "image/webp",
        };
        const contentType = mimeTypes[ext] || "application/octet-stream";
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=31536000");
        res.statusCode = 200;
        res.end(buffer);
        return;
      }

      res.statusCode = 404;
      res.end();
      return;
    } catch (error) {
      console.error("[auth-server] Static file error:", error);
      res.statusCode = 500;
      res.end();
      return;
    }
  }

  // Auth routes
  if (req.url.startsWith("/api/auth")) {
    try {
      await routeAuthRequest(req, res);
    } catch (error) {
      console.error("[auth-server] Auth handler failed:", error);

      if (!res.headersSent) {
        sendJson(res, 500, {
          error: "internal_server_error",
          message: "Failed to process auth request",
        });
      } else {
        res.end();
      }
    }
    return;
  }

  // Content API routes
  try {
    const eventIdMatch = requestUrl.pathname.match(/^\/api\/events\/([^/]+)$/);
    const eventRegistrationsMatch = requestUrl.pathname.match(/^\/api\/events\/([^/]+)\/registrations$/);
    const eventRegisterMatch = requestUrl.pathname.match(/^\/api\/events\/([^/]+)\/register$/);
    const eventLikesMatch = requestUrl.pathname.match(/^\/api\/events\/([^/]+)\/likes$/);
    const eventCommentsMatch = requestUrl.pathname.match(/^\/api\/events\/([^/]+)\/comments$/);
    const eventCommentIdMatch = requestUrl.pathname.match(/^\/api\/event-comments\/([^/]+)$/);
    const newsSlugMatch = requestUrl.pathname.match(/^\/api\/news\/slug\/([^/]+)$/);
    const newsLikesMatch = requestUrl.pathname.match(/^\/api\/news\/([^/]+)\/likes$/);
    const newsLikersMatch = requestUrl.pathname.match(/^\/api\/news\/([^/]+)\/likes\/users$/);
    const newsCommentsMatch = requestUrl.pathname.match(/^\/api\/news\/([^/]+)\/comments$/);
    const newsIdMatch = requestUrl.pathname.match(/^\/api\/news\/([^/]+)$/);
    const newsCommentIdMatch = requestUrl.pathname.match(/^\/api\/news-comments\/([^/]+)$/);
    const recordingIdMatch = requestUrl.pathname.match(/^\/api\/recordings\/([^/]+)$/);
    const productIdMatch = requestUrl.pathname.match(/^\/api\/products\/([^/]+)$/);
    const productLikesMatch = requestUrl.pathname.match(/^\/api\/products\/([^/]+)\/likes$/);
    const productCommentsMatch = requestUrl.pathname.match(/^\/api\/products\/([^/]+)\/comments$/);
    const productReportMatch = requestUrl.pathname.match(/^\/api\/products\/([^/]+)\/report$/);
    const productCommentIdMatch = requestUrl.pathname.match(/^\/api\/product-comments\/([^/]+)$/);
    const adminNotificationsMatch = requestUrl.pathname.match(/^\/api\/admin\/notifications$/);
    const adminNotificationIdMatch = requestUrl.pathname.match(/^\/api\/admin\/notifications\/([^/]+)\/read$/);

    if (req.method === "POST" && requestUrl.pathname === "/api/upload") {
      await uploadImage(req, res);
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/events") {
      await getEvents(req, res, requestUrl.searchParams);
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/events") {
      await createEvent(req, res);
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/events/scrape") {
      await scrapeEventFromUrl(req, res);
      return;
    }

    if (req.method === "GET" && eventRegistrationsMatch) {
      await getEventRegistrations(req, res, eventRegistrationsMatch[1]);
      return;
    }

    if (req.method === "POST" && eventRegisterMatch) {
      await registerEvent(req, res, eventRegisterMatch[1]);
      return;
    }

    if (req.method === "GET" && eventLikesMatch) {
      await getEventLikes(req, res, eventLikesMatch[1]);
      return;
    }

    if (req.method === "POST" && eventLikesMatch) {
      await toggleEventLike(req, res, eventLikesMatch[1]);
      return;
    }

    if (req.method === "GET" && eventCommentsMatch) {
      await getEventComments(req, res, eventCommentsMatch[1]);
      return;
    }

    if (req.method === "POST" && eventCommentsMatch) {
      await createEventComment(req, res, eventCommentsMatch[1]);
      return;
    }

    if (req.method === "DELETE" && eventCommentIdMatch) {
      await deleteEventComment(req, res, eventCommentIdMatch[1]);
      return;
    }

    if (req.method === "GET" && eventIdMatch) {
      await getEventById(req, res, eventIdMatch[1]);
      return;
    }

    if (req.method === "DELETE" && eventIdMatch) {
      await deleteEvent(req, res, eventIdMatch[1]);
      return;
    }

    if (req.method === "PATCH" && eventIdMatch) {
      await updateEvent(req, res, eventIdMatch[1]);
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/products") {
      await getProducts(req, res, requestUrl.searchParams);
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/products") {
      await createProduct(req, res);
      return;
    }

    if (req.method === "GET" && productLikesMatch) {
      await getProductLikes(req, res, productLikesMatch[1]);
      return;
    }

    if (req.method === "POST" && productLikesMatch) {
      await toggleProductLike(req, res, productLikesMatch[1]);
      return;
    }

    if (req.method === "GET" && productCommentsMatch) {
      await getProductComments(req, res, productCommentsMatch[1]);
      return;
    }

    if (req.method === "POST" && productCommentsMatch) {
      await createProductComment(req, res, productCommentsMatch[1]);
      return;
    }

    if (req.method === "POST" && productReportMatch) {
      await reportProduct(req, res, productReportMatch[1]);
      return;
    }

    if (req.method === "DELETE" && productCommentIdMatch) {
      await deleteProductComment(req, res, productCommentIdMatch[1]);
      return;
    }

    if (req.method === "GET" && productIdMatch) {
      await getProductById(req, res, productIdMatch[1]);
      return;
    }

    if (req.method === "PATCH" && productIdMatch) {
      await updateProduct(req, res, productIdMatch[1]);
      return;
    }

    if (req.method === "DELETE" && productIdMatch) {
      await deleteProduct(req, res, productIdMatch[1]);
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/dashboard/metrics") {
      await getDashboardMetrics(req, res);
      return;
    }

    if (req.method === "GET" && adminNotificationsMatch) {
      await getAdminNotifications(req, res);
      return;
    }

    if (req.method === "PATCH" && adminNotificationIdMatch) {
      await markAdminNotificationRead(req, res, adminNotificationIdMatch[1]);
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/news") {
      await getNews(req, res, requestUrl.searchParams);
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/news") {
      await createNews(req, res);
      return;
    }

    if (req.method === "GET" && newsSlugMatch) {
      await getNewsBySlug(req, res, decodeURIComponent(newsSlugMatch[1]));
      return;
    }

    if (req.method === "GET" && newsLikesMatch) {
      await getNewsLikes(req, res, newsLikesMatch[1]);
      return;
    }

    if (req.method === "POST" && newsLikesMatch) {
      await toggleNewsLike(req, res, newsLikesMatch[1]);
      return;
    }

    if (req.method === "GET" && newsLikersMatch) {
      await getNewsLikers(req, res, newsLikersMatch[1]);
      return;
    }

    if (req.method === "GET" && newsCommentsMatch) {
      await getNewsComments(req, res, newsCommentsMatch[1]);
      return;
    }

    if (req.method === "POST" && newsCommentsMatch) {
      await createNewsComment(req, res, newsCommentsMatch[1]);
      return;
    }

    if (req.method === "DELETE" && newsCommentIdMatch) {
      await deleteNewsComment(req, res, newsCommentIdMatch[1]);
      return;
    }

    if (req.method === "GET" && newsIdMatch) {
      await getNewsById(req, res, newsIdMatch[1]);
      return;
    }

    if (req.method === "DELETE" && newsIdMatch) {
      await deleteNews(req, res, newsIdMatch[1]);
      return;
    }

    if (req.method === "PATCH" && newsIdMatch) {
      await updateNews(req, res, newsIdMatch[1]);
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/recordings") {
      await getRecordings(req, res, requestUrl.searchParams);
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/recordings") {
      await createRecording(req, res);
      return;
    }

    if (req.method === "GET" && recordingIdMatch) {
      await getRecordingById(req, res, recordingIdMatch[1]);
      return;
    }

    if (req.method === "DELETE" && recordingIdMatch) {
      await deleteRecording(req, res, recordingIdMatch[1]);
      return;
    }

    if (req.method === "PATCH" && recordingIdMatch) {
      await updateRecording(req, res, recordingIdMatch[1]);
      return;
    }

    sendJson(res, 404, {
      error: "not_found",
      message: "Route not found",
    });
  } catch (error) {
    console.error("[auth-server] Request handler failed:", error);

    if (!res.headersSent) {
      sendJson(res, 500, {
        error: "internal_server_error",
        message: "Failed to process request",
      });
    } else {
      res.end();
    }
  }
});

server.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.warn(
      `[auth-server] Port ${PORT} is already in use. Reusing existing auth server instance.`,
    );
    process.exit(0);
  }

  console.error("[auth-server] Failed to start:", error);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`[auth-server] D1 auth API listening on http://0.0.0.0:${PORT}`);
});

Promise.all([
  ensureSchema().then(() => {
    console.log("[auth-server] D1 users table is ready");
  }),
  ensureEventsSchema().then(() => {
    console.log("[auth-server] D1 events table is ready");
  }),
  ensureProductsSchema().then(() => {
    console.log("[auth-server] D1 products table is ready");
  }),
  ensureRecordingsSchema().then(() => {
    console.log("[auth-server] D1 recordings table is ready");
  }),
  ensureNewsEngagementSchema().then(() => {
    console.log("[auth-server] D1 news engagement tables are ready");
  }),
  ensureEventProductEngagementSchema().then(() => {
    console.log("[auth-server] D1 event/product engagement tables are ready");
  }),
  ensureProductReportsSchema().then(() => {
    console.log("[auth-server] D1 product reports table is ready");
  }),
  ensureOwnershipColumns().then(() => {
    console.log("[auth-server] Content ownership columns are ready");
  }),
  migrateRecordingsNullIds(),
]).catch((error) => {
  console.error("[auth-server] Failed to initialize database:", error.message);
});

const shutdown = (signal) => {
  console.log(`[auth-server] Received ${signal}, shutting down...`);
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
