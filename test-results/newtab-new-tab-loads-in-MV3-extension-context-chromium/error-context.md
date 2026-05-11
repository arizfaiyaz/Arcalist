# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: newtab.spec.ts >> new tab loads in MV3 extension context
- Location: tests\e2e\newtab.spec.ts:40:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Home')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('text=Home')

```

# Test source

```ts
  25  |   };
  26  |   const settings = preferences.extensions?.settings;
  27  |   if (!settings) return null;
  28  | 
  29  |   const expectedPath = path.resolve(extensionPath).toLowerCase();
  30  |   for (const [extensionId, info] of Object.entries(settings)) {
  31  |     const infoPath = info?.path ? path.resolve(info.path).toLowerCase() : null;
  32  |     if (infoPath && infoPath === expectedPath) {
  33  |       return extensionId;
  34  |     }
  35  |   }
  36  | 
  37  |   return null;
  38  | };
  39  | 
  40  | test("new tab loads in MV3 extension context", async () => {
  41  |   const extensionPath = path.join(process.cwd(), "dist");
  42  |   const manifestPath = path.join(extensionPath, "manifest.json");
  43  |   if (!fs.existsSync(manifestPath)) {
  44  |     throw new Error(
  45  |       "Extension build missing. Run npm run build to create dist/manifest.json before E2E tests.",
  46  |     );
  47  |   }
  48  | 
  49  |   const manifest = readManifest(manifestPath);
  50  |   const newTabPath = manifest.chrome_url_overrides?.newtab;
  51  |   if (!newTabPath) {
  52  |     throw new Error(
  53  |       "manifest.json is missing chrome_url_overrides.newtab. Check the MV3 manifest.",
  54  |     );
  55  |   }
  56  | 
  57  |   const normalizedNewTabPath = newTabPath.replace(/^\//, "");
  58  |   const newTabFilePath = path.join(extensionPath, normalizedNewTabPath);
  59  |   if (!fs.existsSync(newTabFilePath)) {
  60  |     throw new Error(
  61  |       `New tab file does not exist in dist: ${newTabFilePath}. Run npm run build and re-check the output path.`,
  62  |     );
  63  |   }
  64  | 
  65  |   const userDataDir = fs.mkdtempSync(
  66  |     path.join(os.tmpdir(), "arcalist-e2e-"),
  67  |   );
  68  | 
  69  |   const context = await chromium.launchPersistentContext(userDataDir, {
  70  |     headless: false,
  71  |     args: [
  72  |       `--disable-extensions-except=${extensionPath}`,
  73  |       `--load-extension=${extensionPath}`,
  74  |     ],
  75  |   });
  76  | 
  77  |   try {
  78  |     let extensionId = context.serviceWorkers()[0]
  79  |       ? new URL(context.serviceWorkers()[0].url()).host
  80  |       : null;
  81  | 
  82  |     if (!extensionId) {
  83  |       try {
  84  |         const worker = await context.waitForEvent("serviceworker", {
  85  |           timeout: 5000,
  86  |         });
  87  |         extensionId = new URL(worker.url()).host;
  88  |       } catch {
  89  |         extensionId = null;
  90  |       }
  91  |     }
  92  | 
  93  |     if (!extensionId) {
  94  |       extensionId = findExtensionIdFromPreferences(userDataDir, extensionPath);
  95  |     }
  96  | 
  97  |     if (!extensionId) {
  98  |       const extensionsPage = await context.newPage();
  99  |       await extensionsPage.goto("chrome://extensions/");
  100 |       try {
  101 |         const worker = await context.waitForEvent("serviceworker", {
  102 |           timeout: 5000,
  103 |         });
  104 |         extensionId = new URL(worker.url()).host;
  105 |       } catch {
  106 |         extensionId = findExtensionIdFromPreferences(userDataDir, extensionPath);
  107 |       }
  108 |       await extensionsPage.close();
  109 |     }
  110 | 
  111 |     if (!extensionId) {
  112 |       throw new Error(
  113 |         "Unable to determine the extension ID. Ensure the MV3 service worker is registered or inspect chrome://extensions.",
  114 |       );
  115 |     }
  116 | 
  117 |     const newTabUrl = `chrome-extension://${extensionId}/${normalizedNewTabPath}`;
  118 |     console.log(`[e2e] extensionId=${extensionId}`);
  119 |     console.log(`[e2e] newtabPath=${normalizedNewTabPath}`);
  120 |     console.log(`[e2e] newtabUrl=${newTabUrl}`);
  121 | 
  122 |     const page = await context.newPage();
  123 |     await page.goto(newTabUrl);
  124 | 
> 125 |     await expect(page.locator("text=Home")).toBeVisible({ timeout: 10000 });
      |                                             ^ Error: expect(locator).toBeVisible() failed
  126 |   } finally {
  127 |     await context.close();
  128 |     fs.rmSync(userDataDir, { recursive: true, force: true });
  129 |   }
  130 | });
```