import { join, extname } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { config } from "../../config/index.js";
import { UPLOAD_LIMITS } from "@streamguard/shared";
import type { MultipartFile } from "@fastify/multipart";

export type UploadType = "sound" | "image";

class UploadService {
  async upload(channelId: string, type: UploadType, file: MultipartFile): Promise<string> {
    const limits = UPLOAD_LIMITS[type];
    const ext = extname(file.filename).toLowerCase();

    if (!(limits.allowedExtensions as readonly string[]).includes(ext)) {
      throw new Error(`Invalid file extension: ${ext}. Allowed: ${limits.allowedExtensions.join(", ")}`);
    }

    const buffer = await file.toBuffer();

    if (buffer.length > limits.maxSizeBytes) {
      throw new Error(`File too large. Max: ${limits.maxSizeBytes / 1024 / 1024}MB`);
    }

    const subdir = type === "sound" ? "sounds" : "images";
    const dir = join(config.uploadsDir, channelId, subdir);
    await mkdir(dir, { recursive: true });

    const filename = `${randomUUID()}${ext}`;
    const filePath = join(dir, filename);
    await writeFile(filePath, buffer);

    // Return the public URL path
    return `/uploads/${channelId}/${subdir}/${filename}`;
  }
}

export const uploadService = new UploadService();
