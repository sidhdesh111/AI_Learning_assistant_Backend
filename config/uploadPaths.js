import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Root folder that contains `documents/` (same as the folder Express serves at `/uploads`).
 *
 * - Default: `Backend/uploads` next to this codebase.
 * - Production: set `UPLOAD_DIR` to an absolute path on a persistent disk (Docker volume, VPS path).
 * - If `VERCEL` is set, uploads go to the OS temp dir (not durable); prefer UPLOAD_DIR or disable VERCEL on a VM.
 */
export function getUploadBaseDir() {
  if (process.env.UPLOAD_DIR) {
    return path.resolve(process.env.UPLOAD_DIR);
  }
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "uploads");
  }
  return path.join(__dirname, "..", "uploads");
}

/** Ensures base exists; returns same path as getUploadBaseDir(). */
export function ensureUploadBaseDir() {
  const base = getUploadBaseDir();
  if (!fs.existsSync(base)) {
    fs.mkdirSync(base, { recursive: true });
  }
  return base;
}

/**
 * Maps DB `filePath` like `/uploads/documents/file.pdf` to an absolute path under the upload root.
 */
export function resolveFilePathFromDbUrl(filePath) {
  if (!filePath || typeof filePath !== "string") {
    return null;
  }
  const rel = filePath.replace(/^\/uploads\//, "");
  return path.join(getUploadBaseDir(), rel);
}
