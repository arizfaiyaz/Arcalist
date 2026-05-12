import { supabase } from "./supabase";
import type { ArcalistTheme, ThemeMode } from "../config/themes";
import type { CustomWallpaper } from "../types";

export const CUSTOM_WALLPAPER_BUCKET = "custom-wallpapers";
export const CUSTOM_THEME_PREFIX = "custom:";
export const MAX_WALLPAPER_UPLOAD_BYTES = 2 * 1024 * 1024;
export const MAX_WALLPAPER_WIDTH = 1920;
export const MAX_WALLPAPER_HEIGHT = 1080;

const ALLOWED_WALLPAPER_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type WallpaperUploadResult =
  | { ok: true; wallpaper: CustomWallpaper }
  | { ok: false; error: string };

export function validateWallpaperFile(file: File): string | null {
  if (!ALLOWED_WALLPAPER_TYPES.has(file.type)) {
    return "Please upload a JPG, PNG, or WebP image.";
  }

  if (file.size > MAX_WALLPAPER_UPLOAD_BYTES) {
    return "Wallpaper must be under 2MB.";
  }

  return null;
}

const createObjectUrlImage = (file: Blob) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image could not be loaded"));
    };
    image.src = objectUrl;
  });

export async function compressWallpaperToWebp(file: File): Promise<Blob> {
  const image = await createObjectUrlImage(file);
  const scale = Math.min(
    1,
    MAX_WALLPAPER_WIDTH / image.naturalWidth,
    MAX_WALLPAPER_HEIGHT / image.naturalHeight,
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return file;

  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", 0.84);
  });

  return blob ?? file;
}

const generateWallpaperId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `cw_${crypto.randomUUID()}`
    : `cw_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export async function uploadCustomWallpaper({
  file,
  userId,
  mode,
  accentColor,
}: {
  file: File;
  userId: string;
  mode: ThemeMode;
  accentColor: string;
}): Promise<WallpaperUploadResult> {
  const validationError = validateWallpaperFile(file);
  if (validationError) return { ok: false, error: validationError };

  try {
    const compressed = await compressWallpaperToWebp(file);
    const wallpaperId = generateWallpaperId();
    const storagePath = `${userId}/${wallpaperId}.webp`;

    const { error } = await supabase.storage
      .from(CUSTOM_WALLPAPER_BUCKET)
      .upload(storagePath, compressed, {
        contentType: "image/webp",
        upsert: false,
      });

    if (error) {
      console.error("[Arcalist] Custom wallpaper upload failed:", error.message);
      return {
        ok: false,
        error: "Something went wrong while uploading. Please try again.",
      };
    }

    const { data } = supabase.storage
      .from(CUSTOM_WALLPAPER_BUCKET)
      .getPublicUrl(storagePath);

    return {
      ok: true,
      wallpaper: {
        id: wallpaperId,
        userId,
        name: "My Wallpaper",
        storagePath,
        publicUrl: data.publicUrl,
        createdAt: new Date().toISOString(),
        mode,
        accentColor,
        ...(mode === "dark"
          ? {
              glassBackground: "rgba(8, 20, 30, 0.45)",
              glassBorder: "rgba(255, 255, 255, 0.16)",
            }
          : {
              glassBackground: "rgba(255, 255, 255, 0.34)",
              glassBorder: "rgba(255, 255, 255, 0.42)",
            }),
      },
    };
  } catch (error) {
    console.error("[Arcalist] Custom wallpaper upload failed:", error);
    return {
      ok: false,
      error: "Something went wrong while uploading. Please try again.",
    };
  }
}

export async function deleteCustomWallpaperFile(storagePath: string) {
  const { error } = await supabase.storage
    .from(CUSTOM_WALLPAPER_BUCKET)
    .remove([storagePath]);

  if (error) {
    console.error("[Arcalist] Failed to delete custom wallpaper:", error.message);
  }
}

export function customWallpaperToTheme(
  wallpaper: CustomWallpaper,
): ArcalistTheme {
  const isDark = wallpaper.mode === "dark";
  return {
    id: `${CUSTOM_THEME_PREFIX}${wallpaper.id}`,
    name: wallpaper.name,
    mode: wallpaper.mode,
    tier: "pro",
    wallpaper: wallpaper.publicUrl,
    accentColor: wallpaper.accentColor,
    previewColor: wallpaper.accentColor,
    glassBackground:
      wallpaper.glassBackground ??
      (isDark
        ? "rgba(8, 20, 30, 0.45)"
        : "rgba(255, 255, 255, 0.34)"),
    glassBorder:
      wallpaper.glassBorder ??
      (isDark
        ? "rgba(255, 255, 255, 0.16)"
        : "rgba(255, 255, 255, 0.42)"),
    glassBlur: "24px",
    glassShadow: isDark
      ? "0 24px 70px rgba(0, 0, 0, 0.45)"
      : "0 20px 52px rgba(15, 23, 42, 0.16)",
    textPrimary: isDark ? "#ffffff" : "#1f2937",
    textSecondary: isDark
      ? "rgba(255,255,255,0.72)"
      : "rgba(31,41,55,0.68)",
    overlay: isDark
      ? "linear-gradient(180deg, rgba(4, 10, 18, 0.24), rgba(4, 10, 18, 0.58))"
      : "linear-gradient(180deg, rgba(255, 255, 255, 0.56), rgba(255, 255, 255, 0.30))",
  };
}

