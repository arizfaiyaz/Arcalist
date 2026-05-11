import { test, expect, chromium } from "@playwright/test";
import fs from "fs";
import os from "os";
import path from "path";

type ExtensionManifest = {
  chrome_url_overrides?: {
    newtab?: string;
  };
};

const readManifest = (manifestPath: string): ExtensionManifest => {
  return JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
};

const findExtensionIdFromPreferences = (
  userDataDir: string,
  extensionPath: string,
): string | null => {
  const preferencesPath = path.join(userDataDir, "Default", "Preferences");
  if (!fs.existsSync(preferencesPath)) return null;

  const preferences = JSON.parse(fs.readFileSync(preferencesPath, "utf-8")) as {
    extensions?: { settings?: Record<string, { path?: string }> };
  };
  const settings = preferences.extensions?.settings;
  if (!settings) return null;

  const expectedPath = path.resolve(extensionPath).toLowerCase();
  for (const [extensionId, info] of Object.entries(settings)) {
    const infoPath = info?.path ? path.resolve(info.path).toLowerCase() : null;
    if (infoPath && infoPath === expectedPath) {
      return extensionId;
    }
  }

  return null;
};

test("new tab loads in MV3 extension context", async () => {
  const extensionPath = path.join(process.cwd(), "dist");
  const manifestPath = path.join(extensionPath, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      "Extension build missing. Run npm run build to create dist/manifest.json before E2E tests.",
    );
  }

  const manifest = readManifest(manifestPath);
  const newTabPath = manifest.chrome_url_overrides?.newtab;
  if (!newTabPath) {
    throw new Error(
      "manifest.json is missing chrome_url_overrides.newtab. Check the MV3 manifest.",
    );
  }

  const normalizedNewTabPath = newTabPath.replace(/^\//, "");
  const newTabFilePath = path.join(extensionPath, normalizedNewTabPath);
  if (!fs.existsSync(newTabFilePath)) {
    throw new Error(
      `New tab file does not exist in dist: ${newTabFilePath}. Run npm run build and re-check the output path.`,
    );
  }

  const userDataDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "arcalist-e2e-"),
  );

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  try {
    let extensionId = context.serviceWorkers()[0]
      ? new URL(context.serviceWorkers()[0].url()).host
      : null;

    if (!extensionId) {
      try {
        const worker = await context.waitForEvent("serviceworker", {
          timeout: 5000,
        });
        extensionId = new URL(worker.url()).host;
      } catch {
        extensionId = null;
      }
    }

    if (!extensionId) {
      extensionId = findExtensionIdFromPreferences(userDataDir, extensionPath);
    }

    if (!extensionId) {
      const extensionsPage = await context.newPage();
      await extensionsPage.goto("chrome://extensions/");
      try {
        const worker = await context.waitForEvent("serviceworker", {
          timeout: 5000,
        });
        extensionId = new URL(worker.url()).host;
      } catch {
        extensionId = findExtensionIdFromPreferences(userDataDir, extensionPath);
      }
      await extensionsPage.close();
    }

    if (!extensionId) {
      throw new Error(
        "Unable to determine the extension ID. Ensure the MV3 service worker is registered or inspect chrome://extensions.",
      );
    }

    const newTabUrl = `chrome-extension://${extensionId}/${normalizedNewTabPath}`;
    console.log(`[e2e] extensionId=${extensionId}`);
    console.log(`[e2e] newtabPath=${normalizedNewTabPath}`);
    console.log(`[e2e] newtabUrl=${newTabUrl}`);

    const page = await context.newPage();
    await page.goto(newTabUrl);

    await expect(page.locator("text=Home")).toBeVisible({ timeout: 10000 });
  } finally {
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
});