import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const ALGORITHM = "aes-256-gcm" as const;

function getKey(): Buffer {
  // No random fallback: a per-instance key would make stored documents undecryptable.
  const hex = process.env.DOCUMENT_ENCRYPTION_KEY;
  if (!hex) throw new Error("DOCUMENT_ENCRYPTION_KEY is not set");
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("DOCUMENT_ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  }
  return key;
}

function getBucket(): R2Bucket {
  const bucket = getCloudflareContext().env.DOCUMENTS;
  if (!bucket) throw new Error("DOCUMENTS R2 binding is not configured");
  return bucket;
}

export interface EncryptionResult {
  // R2 object key (column name kept from the filesystem version)
  storagePath: string;
  iv: string;
}

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

  const storagePath = `${transactionId}/${Date.now()}-${randomBytes(8).toString("hex")}`;
  const combined = Buffer.concat([authTag, encrypted]);
  await getBucket().put(storagePath, new Uint8Array(combined));

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

  const object = await getBucket().get(storagePath);
  if (!object) throw new Error("Document not found in storage");
  const combined = Buffer.from(await object.arrayBuffer());
  const authTag = combined.subarray(0, 16);
  const encrypted = combined.subarray(16);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const decipher = createDecipheriv(ALGORITHM, key as any, iv as any);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

export async function deleteEncryptedFile(storagePath: string): Promise<void> {
  // R2 delete is a no-op for missing keys
  await getBucket().delete(storagePath);
}
