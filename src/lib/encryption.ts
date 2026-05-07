import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { readFile, writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";

const ALGORITHM = "aes-256-gcm" as const;
const ENCRYPTION_KEY = process.env.DOCUMENT_ENCRYPTION_KEY || randomBytes(32).toString("hex");

function getKey(): Buffer {
  const key = Buffer.from(ENCRYPTION_KEY, "hex");
  if (key.length !== 32) {
    throw new Error("DOCUMENT_ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  }
  return key;
}

export interface EncryptionResult {
  storagePath: string;
  iv: string;
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), "uploads");

export async function encryptAndStore(
  fileBuffer: Buffer,
  transactionId: string,
  _filename: string
): Promise<EncryptionResult> {
  const iv = randomBytes(16);
  const key = getKey();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cipher = createCipheriv(ALGORITHM, key as any, iv as any);

  const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const storageName = `${Date.now()}-${randomBytes(8).toString("hex")}`;
  const dir = join(UPLOAD_DIR, transactionId);
  await mkdir(dir, { recursive: true });

  const storagePath = join(dir, storageName);
  const combined = Buffer.concat([authTag, encrypted]);
  await writeFile(storagePath, new Uint8Array(combined));

  return {
    storagePath,
    iv: iv.toString("hex"),
  };
}

export async function decryptFile(
  storagePath: string,
  ivHex: string
): Promise<Buffer> {
  const iv = Buffer.from(ivHex, "hex");
  const key = getKey();

  const combined = await readFile(storagePath);
  const authTag = combined.subarray(0, 16);
  const encrypted = combined.subarray(16);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const decipher = createDecipheriv(ALGORITHM, key as any, iv as any);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

export async function deleteEncryptedFile(storagePath: string): Promise<void> {
  try {
    await unlink(storagePath);
  } catch {
    // File already deleted or doesn't exist
  }
}
