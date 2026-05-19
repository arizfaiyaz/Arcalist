import { supabase } from "./supabase";
import { resolveAuthenticatedPlanStatus } from "./plan";
import { getFriendlySupabaseErrorMessage } from "./supabaseErrors";
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

async function hasAllowedWallpaperSignature(file: File): Promise<boolean> {
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const isJpeg =
    header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isPng =
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a;
  const isWebp =
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50;

  return isJpeg || isPng || isWebp;
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
  isProUser,
  mode,
  accentColor,
}: {
  file: File;
  userId?: string | null;
  isProUser: boolean;
  mode: ThemeMode;
  accentColor: string;
}): Promise<WallpaperUploadResult> {
  if (!userId) {
    return { ok: false, error: "Please sign in to upload custom wallpapers." };
  }
  if (!isProUser) {
    return {
      ok: false,
      error: "Custom wallpapers are available with Arcalist Pro.",
    };
  }
  const resolvedPlan = await resolveAuthenticatedPlanStatus(userId);
  if (!resolvedPlan.isProUser) {
    return {
      ok: false,
      error: "Custom wallpapers are available with Arcalist Pro.",
    };
  }

  const validationError = validateWallpaperFile(file);
  if (validationError) return { ok: false, error: validationError };

  try {
    if (!(await hasAllowedWallpaperSignature(file))) {
      return { ok: false, error: "Please upload a valid JPG, PNG, or WebP image." };
    }

    const compressed = await compressWallpaperToWebp(file);
    const wallpaperId = generateWallpaperId();
    const storagePath = `${userId}/${wallpaperId}.webp`;

    // TODO: Frontend gating is not enough. This must also be protected by RLS,
    // RPC, or Edge Function entitlement checks before production.
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
        error: getFriendlySupabaseErrorMessage(
          error,
          "Custom wallpapers are available with Arcalist Pro.",
        ),
      };
    }

    const { data, error: signedUrlError } = await supabase.storage
      .from(CUSTOM_WALLPAPER_BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

    if (signedUrlError || !data?.signedUrl) {
      console.error(
        "[Arcalist] Custom wallpaper signed URL failed:",
        signedUrlError?.message,
      );
      await deleteCustomWallpaperFile(storagePath);
      return {
        ok: false,
        error: "Something went wrong while preparing the wallpaper.",
      };
    }

    return {
      ok: true,
      wallpaper: {
        id: wallpaperId,
        userId,
        name: "My Wallpaper",
        storagePath,
        publicUrl: data.signedUrl,
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
  // TODO: Frontend gating is not enough. This must also be protected by RLS,
  // RPC, or Edge Function entitlement checks before production.
  const { error } = await supabase.storage
    .from(CUSTOM_WALLPAPER_BUCKET)
    .remove([storagePath]);

  if (error) {
    console.error("[Arcalist] Failed to delete custom wallpaper:", error.message);
  }
}

export async function createCustomWallpaperSignedUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from(CUSTOM_WALLPAPER_BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

  if (error || !data?.signedUrl) {
    console.error(
      "[Arcalist] Custom wallpaper signed URL refresh failed:",
      error?.message,
    );
    return null;
  }

  return data.signedUrl;
}

export async function refreshCustomWallpaperSignedUrls(
  wallpapers: CustomWallpaper[],
) {
  let changed = false;
  const refreshed = await Promise.all(
    wallpapers.map(async (wallpaper) => {
      if (wallpaper.publicUrl.includes("/object/sign/")) return wallpaper;
      const signedUrl = await createCustomWallpaperSignedUrl(
        wallpaper.storagePath,
      );
      if (!signedUrl) return wallpaper;
      changed = true;
      return { ...wallpaper, publicUrl: signedUrl };
    }),
  );

  return changed ? refreshed : wallpapers;
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
