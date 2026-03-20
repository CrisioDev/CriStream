import { join, extname } from "node:path";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { config } from "../../config/index.js";
import { UPLOAD_LIMITS } from "@streamguard/shared";
import { logger } from "../../lib/logger.js";
import type { MultipartFile } from "@fastify/multipart";

const execFileAsync = promisify(execFile);

export type UploadType = "sound" | "image" | "video";

const VIDEO_EXTENSIONS = new Set([".webm", ".mp4"]);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);

async function getVideoDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "quiet",
      "-print_format", "json",
      "-show_format",
      filePath,
    ], { timeout: 10_000 });
    const info = JSON.parse(stdout);
    return Math.ceil(parseFloat(info.format?.duration ?? "0"));
  } catch {
    return 0;
  }
}

class UploadService {
  async upload(channelId: string, type: UploadType, file: MultipartFile): Promise<{ url: string; duration?: number }> {
    const limits = UPLOAD_LIMITS[type];
    const ext = extname(file.filename).toLowerCase();

    if (!(limits.allowedExtensions as readonly string[]).includes(ext)) {
      throw new Error(`Invalid file extension: ${ext}. Allowed: ${limits.allowedExtensions.join(", ")}`);
    }

    const buffer = await file.toBuffer();

    if (buffer.length > limits.maxSizeBytes) {
      throw new Error(`File too large. Max: ${limits.maxSizeBytes / 1024 / 1024}MB`);
    }

    const subdir = type === "sound" ? "sounds" : type === "video" ? "videos" : "images";
    const dir = join(config.uploadsDir, channelId, subdir);
    await mkdir(dir, { recursive: true });

    const id = randomUUID();

    // Convert images to WebP
    if (type === "image" && IMAGE_EXTENSIONS.has(ext) && ext !== ".webp") {
      const filename = `${id}.webp`;
      const filePath = join(dir, filename);
      try {
        const webpBuffer = await sharp(buffer)
          .webp({ quality: 85 })
          .toBuffer();
        await writeFile(filePath, webpBuffer);
        logger.info({ original: ext, size: buffer.length, converted: webpBuffer.length }, "Image converted to WebP");
        return { url: `/uploads/${channelId}/${subdir}/${filename}` };
      } catch (err) {
        logger.warn({ err, ext }, "WebP conversion failed, saving original");
      }
    }

    // Convert videos to WebM
    if (type === "video" && ext === ".mp4") {
      const tempPath = join(dir, `${id}_temp.mp4`);
      const outFilename = `${id}.webm`;
      const outPath = join(dir, outFilename);
      try {
        await writeFile(tempPath, buffer);
        await execFileAsync("ffmpeg", [
          "-i", tempPath,
          "-c:v", "libvpx-vp9",
          "-crf", "30",
          "-b:v", "0",
          "-c:a", "libopus",
          "-b:a", "128k",
          "-y",
          outPath,
        ], { timeout: 120_000 });
        await unlink(tempPath);
        const duration = await getVideoDuration(outPath);
        logger.info({ original: ext, size: buffer.length, duration }, "Video converted to WebM");
        return { url: `/uploads/${channelId}/${subdir}/${outFilename}`, duration };
      } catch (err) {
        logger.warn({ err }, "WebM conversion failed, saving original MP4");
        // Clean up temp file if it exists
        await unlink(tempPath).catch(() => {});
        await unlink(outPath).catch(() => {});
      }
    }

    // Save as-is (already WebP/WebM, sounds, or conversion failed)
    const filename = `${id}${ext}`;
    const filePath = join(dir, filename);
    await writeFile(filePath, buffer);

    // Get duration for video files
    let duration: number | undefined;
    if (type === "video") {
      duration = await getVideoDuration(filePath);
    }
    return { url: `/uploads/${channelId}/${subdir}/${filename}`, duration };
  }
}

export const uploadService = new UploadService();
