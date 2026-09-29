import "server-only";

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { db, hasDatabaseUrl } from "@/lib/db";
import { ingestMediaHubFileMaterial, type MaterialIngestResult } from "@/lib/media-hub-manual-materials";

const DRIVE_FOLDER_ID = process.env.MEDIA_HUB_GOOGLE_DRIVE_FOLDER_ID ?? "1cHuO86kaqND34vLTFo3Ly_OoBSNV3rgC";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const FILES_URL = "https://www.googleapis.com/drive/v3/files";
const FILE_MAX_BYTES = 50 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 25_000;
const STATE_COOKIE = "ssi_drive_oauth_state";

export function classifyGoogleDriveMaterialKind(filename: string) {
  return /monthly|month|місячн|за\s+місяц|за\s+місяць/i.test(filename)
    ? "monthly_material" as const
    : "weekly_material" as const;
}

export function getGoogleDriveOAuthConfig() {
  const clientId = process.env.MEDIA_HUB_GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.MEDIA_HUB_GOOGLE_DRIVE_CLIENT_SECRET;
  const redirectUri = process.env.MEDIA_HUB_GOOGLE_DRIVE_REDIRECT_URI ??
    "https://spike.1d3x.com/api/admin/media-hub/google-drive/callback";
  if (!clientId || !clientSecret) throw new Error("Google Drive OAuth is not configured.");
  return { clientId, clientSecret, redirectUri };
}

export function createGoogleDriveOAuthState() {
  const state = randomBytes(24).toString("base64url");
  const signature = createHmac("sha256", getGoogleDriveOAuthConfig().clientSecret).update(state).digest("base64url");
  return { cookieValue: `${state}.${signature}`, state };
}

export function isValidGoogleDriveOAuthState(state: string, cookieValue: string | undefined) {
  if (!state || !cookieValue) return false;
  const [cookieState, signature] = cookieValue.split(".");
  if (!cookieState || !signature || cookieState !== state) return false;
  const expected = createHmac("sha256", getGoogleDriveOAuthConfig().clientSecret).update(state).digest();
  let actual: Buffer;
  try { actual = Buffer.from(signature, "base64url"); } catch { return false; }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function getGoogleDriveAuthorizationUrl(state: string) {
  const { clientId, redirectUri } = getGoogleDriveOAuthConfig();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    access_type: "offline",
    client_id: clientId,
    include_granted_scopes: "true",
    prompt: "consent",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: DRIVE_SCOPE,
    state,
  }).toString();
  return url.toString();
}

export function getGoogleDriveStateCookieName() { return STATE_COOKIE; }

export async function exchangeGoogleDriveAuthorizationCode(code: string) {
  const { clientId, clientSecret, redirectUri } = getGoogleDriveOAuthConfig();
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("Google authorization exchange failed.");
  return await response.json() as { refresh_token?: string };
}

export async function saveGoogleDriveRefreshToken(token: string) {
  if (!hasDatabaseUrl()) throw new Error("Database is not configured.");
  const encrypted = encryptRefreshToken(token);
  await db.$executeRawUnsafe(
    `INSERT INTO private."MediaHubGoogleDriveCredential" ("id", "refreshTokenCiphertext", "updatedAt")
     VALUES ('spike-ua', $1, NOW()) ON CONFLICT ("id") DO UPDATE
     SET "refreshTokenCiphertext" = EXCLUDED."refreshTokenCiphertext", "updatedAt" = NOW()`,
    encrypted,
  );
}

export async function syncGoogleDriveContextMaterials() {
  if (!hasDatabaseUrl()) throw new Error("Database is not configured.");
  const credential = await db.$queryRawUnsafe<Array<{ refreshTokenCiphertext: string }>>(
    `SELECT "refreshTokenCiphertext" FROM private."MediaHubGoogleDriveCredential" WHERE "id" = 'spike-ua' LIMIT 1`,
  );
  if (!credential[0]) throw new Error("Google Drive account has not been connected.");

  const token = await refreshGoogleDriveAccessToken(decryptRefreshToken(credential[0].refreshTokenCiphertext));
  const stateRows = await db.$queryRawUnsafe<Array<{ lastSuccessfulSyncAt: Date | null }>>(
    `SELECT "lastSuccessfulSyncAt" FROM private."MediaHubGoogleDriveSyncState" WHERE "id" = 'spike-ua' LIMIT 1`,
  );
  const lastSyncAt = stateRows[0]?.lastSuccessfulSyncAt ?? new Date("2000-01-01T00:00:00.000Z");
  const modifiedAfter = new Date(lastSyncAt.getTime() - 5 * 60_000).toISOString();
  const files = await listChangedDriveFiles(token, modifiedAfter);
  const results: MaterialIngestResult[] = [];
  for (const file of files) {
    if (!file.id || !file.name || !file.modifiedTime || file.mimeType === "application/vnd.google-apps.folder") continue;
    const size = Number(file.size ?? 0);
    if (size > FILE_MAX_BYTES) continue;
    const download = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!download.ok) throw new Error(`Google Drive download failed for ${file.id}.`);
    const bytes = Buffer.from(await download.arrayBuffer());
    if (bytes.length > FILE_MAX_BYTES) continue;
    const kind = classifyGoogleDriveMaterialKind(file.name);
    const fileUrl = file.webViewLink ?? `https://drive.google.com/file/d/${encodeURIComponent(file.id)}/view`;
    results.push(await ingestMediaHubFileMaterial({
      bytes,
      canonicalUrl: `${fileUrl}${fileUrl.includes("?") ? "&" : "?"}driveVersion=${encodeURIComponent(file.modifiedTime)}`,
      filename: file.name,
      hashtags: ["#ssi", kind === "monthly_material" ? "#monthly" : "#weekly"],
      kind,
      mimeType: file.mimeType || download.headers.get("content-type") || "application/octet-stream",
      originalUrl: fileUrl,
      receivedFrom: "google-drive",
      sourceType: "google_drive_file",
      tenantId: "spike-ua",
    }));
  }

  await db.$executeRawUnsafe(
    `INSERT INTO private."MediaHubGoogleDriveSyncState" ("id", "lastSuccessfulSyncAt", "updatedAt")
     VALUES ('spike-ua', $1, NOW()) ON CONFLICT ("id") DO UPDATE
     SET "lastSuccessfulSyncAt" = GREATEST(private."MediaHubGoogleDriveSyncState"."lastSuccessfulSyncAt", EXCLUDED."lastSuccessfulSyncAt"), "updatedAt" = NOW()`,
    new Date(Date.now() - 5 * 60_000),
  );
  return { fileCount: files.length, results, status: "processed" as const };
}

async function refreshGoogleDriveAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getGoogleDriveOAuthConfig();
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("Google Drive access token refresh failed.");
  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) throw new Error("Google returned no Drive access token.");
  return payload.access_token;
}

async function listChangedDriveFiles(accessToken: string, modifiedAfter: string) {
  const files: Array<{ id?: string; name?: string; mimeType?: string; modifiedTime?: string; webViewLink?: string; size?: string }> = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(FILES_URL);
    url.search = new URLSearchParams({
      fields: "nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink,size)",
      orderBy: "modifiedTime",
      pageSize: "100",
      q: `'${DRIVE_FOLDER_ID}' in parents and trashed = false and modifiedTime > '${modifiedAfter}'`,
      ...(pageToken ? { pageToken } : {}),
    }).toString();
    const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) throw new Error("Google Drive file listing failed.");
    const page = await response.json() as { files?: typeof files; nextPageToken?: string };
    files.push(...(page.files ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return files;
}

function getEncryptionKey() {
  const secret = process.env.MEDIA_HUB_GOOGLE_DRIVE_CLIENT_SECRET;
  if (!secret) throw new Error("Google Drive OAuth is not configured.");
  return createHash("sha256").update(`ssi-drive-token-v1:${secret}`).digest();
}

function encryptRefreshToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}`;
}

function decryptRefreshToken(value: string) {
  const [version, ivText, tagText, ciphertextText] = value.split(".");
  if (version !== "v1" || !ivText || !tagText || !ciphertextText) throw new Error("Stored Google Drive credential is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextText, "base64url")), decipher.final()]).toString("utf8");
}
