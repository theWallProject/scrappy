import fs from "fs";
import path from "path";
import { chromium, Browser, BrowserContext, Page } from "playwright";
import { APIScrapperFileDataSchema, ScrappedItemType } from "../types";
import { error, log, cleanWebsite } from "../helper";
import inquirer from "inquirer";

type ProcessedState = {
  _processed: true;
};

type ManualOverrideValue =
  | (Partial<ScrappedItemType> & ProcessedState)
  | ProcessedState
  | Partial<ScrappedItemType>;

const inputFilePath = path.join(
  __dirname,
  "../../results/2_merged/2_MERGED_ALL.json",
);

const manualOverridesPath = path.join(
  __dirname,
  "./manual_resolve/manualOverrides.ts",
);

const isProcessed = (
  value: ManualOverrideValue,
): value is ProcessedState | (Partial<ScrappedItemType> & ProcessedState) => {
  return (
    typeof value === "object" &&
    value !== null &&
    "_processed" in value &&
    value._processed === true
  );
};

const loadManualOverrides = (): Record<string, ManualOverrideValue> => {
  const modulePath = path.resolve(manualOverridesPath);
  delete require.cache[require.resolve(modulePath)];
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const module = require(modulePath);
  return (module.manualOverrides || {}) as Record<string, ManualOverrideValue>;
};

const formatValue = (value: ManualOverrideValue): string => {
  if (isProcessed(value)) {
    const fields: string[] = [];
    if ("ws" in value && value.ws !== undefined)
      fields.push(`ws: ${JSON.stringify(value.ws)}`);
    if ("li" in value && value.li !== undefined)
      fields.push(`li: ${JSON.stringify(value.li)}`);
    if ("fb" in value && value.fb !== undefined)
      fields.push(`fb: ${JSON.stringify(value.fb)}`);
    if ("tw" in value && value.tw !== undefined)
      fields.push(`tw: ${JSON.stringify(value.tw)}`);

    if (fields.length > 0) {
      // Has changes - include both the fields and the processed state
      return `{ ${fields.join(", ")}, _processed: true }`;
    } else {
      // No changes - just processed state
      return `{ _processed: true }`;
    }
  } else {
    // Regular override without processed state
    const fields: string[] = [];
    if (value.ws !== undefined) fields.push(`ws: ${JSON.stringify(value.ws)}`);
    if (value.li !== undefined) fields.push(`li: ${JSON.stringify(value.li)}`);
    if (value.fb !== undefined) fields.push(`fb: ${JSON.stringify(value.fb)}`);
    if (value.tw !== undefined) fields.push(`tw: ${JSON.stringify(value.tw)}`);

    if (fields.length > 0) {
      return `{ ${fields.join(", ")} }`;
    } else {
      return `{}`;
    }
  }
};

const saveManualOverrides = (
  overrides: Record<string, ManualOverrideValue>,
) => {
  const keys = Object.keys(overrides).sort();
  let content = 'import { ScrappedItemType } from "../../types";\n\n';
  content +=
    "export const manualOverrides: Record<string, Partial<ScrappedItemType> | { _processed: true } | (Partial<ScrappedItemType> & { _processed: true })> = {\n";

  for (const key of keys) {
    const value = overrides[key];
    const needsQuotes = !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
    const keyStr = needsQuotes ? `"${key.replace(/"/g, '\\"')}"` : key;
    content += `  ${keyStr}: ${formatValue(value)},\n`;
  }

  content += "};\n";
  fs.writeFileSync(manualOverridesPath, content, "utf-8");
  log(`Saved manualOverrides to ${manualOverridesPath}`);
};

const normalizeUrl = (url: string): string => {
  if (!url) {
    throw new Error("URL is empty");
  }

  // Remove leading/trailing whitespace
  url = url.trim();

  // If URL doesn't start with http:// or https://, add https://
  if (!url.match(/^https?:\/\//i)) {
    url = `https://${url}`;
  }

  return url;
};

const normalizeUrlForComparison = (url: string): string => {
  if (!url) return "";

  // Normalize to https if it's http
  url = url.trim().toLowerCase();
  url = url.replace(/^http:\/\//, "https://");

  // Remove trailing slash (except for root domain like https://example.com/)
  url = url.replace(/\/+$/, "");

  // Remove www. prefix for comparison
  url = url.replace(/^https:\/\/www\./, "https://");

  // Remove query parameters and fragments for comparison
  url = url.split("?")[0].split("#")[0];

  return url;
};

const urlsAreEquivalent = (url1: string, url2: string): boolean => {
  const normalized1 = normalizeUrlForComparison(url1);
  const normalized2 = normalizeUrlForComparison(url2);
  return normalized1 === normalized2;
};

const checkRedirect = async (
  page: Page,
  url: string,
): Promise<{ finalUrl: string; redirected: boolean }> => {
  const normalizedUrl = normalizeUrl(url);
  const initialUrl = normalizedUrl;
  let finalUrl = initialUrl;
  let redirected = false;

  const response = await page.goto(normalizedUrl, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  if (!response) {
    throw new Error(`No response from ${normalizedUrl}`);
  }

  if (response.status() >= 400) {
    throw new Error(
      `HTTP ${response.status()} error for ${normalizedUrl}: ${response.statusText()}`,
    );
  }

  finalUrl = response.url();

  // Compare normalized URLs to ignore formatting differences
  redirected = !urlsAreEquivalent(initialUrl, finalUrl);

  return { finalUrl, redirected };
};

type LinkField = "ws" | "li" | "fb" | "tw";

const validateItemLinks = async (
  context: BrowserContext,
  item: ScrappedItemType,
): Promise<Partial<Pick<ScrappedItemType, LinkField>> | null> => {
  const changes: Partial<Pick<ScrappedItemType, LinkField>> = {};
  let hasChanges = false;

  const links: Array<{ field: LinkField; url: string }> = [];
  if (item.ws) links.push({ field: "ws", url: item.ws });
  if (item.li) links.push({ field: "li", url: item.li });
  if (item.fb) links.push({ field: "fb", url: item.fb });
  if (item.tw) links.push({ field: "tw", url: item.tw });

  if (links.length === 0) {
    log(`  No links to validate for ${item.name}`);
    return null;
  }

  const pages: Page[] = [];

  // Open all links in separate tabs (using context ensures same window)
  for (const { field, url } of links) {
    log(`  Opening ${field}: ${url}`);
    const page = await context.newPage();

    try {
      const { finalUrl, redirected } = await checkRedirect(page, url);

      if (redirected) {
        log(`    → Redirected to: ${finalUrl} (from ${url})`);
        changes[field] = finalUrl;
        hasChanges = true;
      } else {
        // URLs are equivalent after normalization
        log(`    ✓ No redirect (URLs are equivalent: ${url} === ${finalUrl})`);
      }

      pages.push(page);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      error(`    ❌ Error checking ${field} (${url}): ${errorMessage}`);

      // Close the page on error
      if (!page.isClosed()) {
        await page.close().catch(() => {});
      }
      throw new Error(
        `Failed to validate ${field} for ${item.name}: ${errorMessage}`,
      );
    }
  }

  // Wait for entire browser to be closed by user
  log(
    `  ⏳ Browser windows are open (${pages.length} tabs). Close the browser to proceed...`,
  );

  return new Promise<Partial<Pick<ScrappedItemType, LinkField>> | null>(
    (resolve) => {
      let resolved = false;
      let pollInterval: NodeJS.Timeout | null = null;

      const cleanup = (reason: string) => {
        if (resolved) {
          log(
            `  [DEBUG] cleanup called again with reason: ${reason}, but already resolved`,
          );
          return;
        }
        resolved = true;
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
        log(`  ✓ Browser closed, continuing... (detected via: ${reason})`);
        resolve(hasChanges ? changes : null);
      };

      const browser = context.browser();
      log(`  [DEBUG] Browser instance: ${browser ? "exists" : "null"}`);

      if (!browser) {
        log(`  [DEBUG] No browser instance, cleaning up`);
        cleanup("no browser instance");
        return;
      }

      log(`  [DEBUG] Browser connected: ${browser.isConnected()}`);
      log(`  [DEBUG] Setting up event listeners...`);

      // Listen to multiple events with debug logging
      browser.once("disconnected", () => {
        log(`  [DEBUG] Browser 'disconnected' event fired`);
        cleanup("disconnected event");
      });

      context.once("close", () => {
        log(`  [DEBUG] Context 'close' event fired`);
        cleanup("context close event");
      });

      // Also check if browser is already disconnected
      if (!browser.isConnected()) {
        log(`  [DEBUG] Browser already disconnected`);
        cleanup("already disconnected");
        return;
      }

      // Poll for browser disconnection as a fallback (in case events don't fire)
      let pollCount = 0;
      pollInterval = setInterval(() => {
        pollCount++;
        const isConnected = browser.isConnected();
        const browserFromContext = context.browser();
        const allPagesClosed = pages.every((p) => p.isClosed());

        log(
          `  [DEBUG] Poll #${pollCount}: browser.isConnected()=${isConnected}, context.browser()=${browserFromContext ? "exists" : "null"}, allPagesClosed=${allPagesClosed}`,
        );

        if (!isConnected) {
          log(`  [DEBUG] Poll detected browser disconnection`);
          cleanup("polling (isConnected=false)");
          return;
        }

        // Also check if context browser is null
        if (browserFromContext === null) {
          log(`  [DEBUG] Poll detected context browser is null`);
          cleanup("polling (context.browser() === null)");
          return;
        }

        // If all pages are closed, browser was likely closed
        if (allPagesClosed && pages.length > 0) {
          log(`  [DEBUG] All pages are closed, assuming browser closed`);
          cleanup("polling (all pages closed)");
          return;
        }
      }, 1000); // Poll every second for better visibility

      log(`  [DEBUG] Started polling interval, waiting for browser closure...`);
    },
  );
};

const sortByCbRank = (items: ScrappedItemType[]): ScrappedItemType[] => {
  return [...items].sort((a, b) => {
    const rankA = a.cbRank
      ? parseInt(a.cbRank.replace(/,/g, ""), 10)
      : Infinity;
    const rankB = b.cbRank
      ? parseInt(b.cbRank.replace(/,/g, ""), 10)
      : Infinity;
    return rankA - rankB;
  });
};

export async function run() {
  let browser: Browser | null = null;

  try {
    // Load data
    log("Loading data from 2_MERGED_ALL.json...");
    const fileContent = fs.readFileSync(inputFilePath, "utf-8");
    const data = APIScrapperFileDataSchema.parse(JSON.parse(fileContent));
    log(`Loaded ${data.length} items`);

    // Load current manual overrides
    let currentOverrides = loadManualOverrides();
    log(`Loaded ${Object.keys(currentOverrides).length} existing overrides`);

    // Sort by cbRank (lowest first)
    const sortedData = sortByCbRank(data);
    log("Sorted by cbRank (lowest first)");

    // Filter out already processed items
    const unprocessedItems = sortedData.filter((item) => {
      const existing = currentOverrides[item.name];
      return !existing || !isProcessed(existing);
    });

    log(`Found ${unprocessedItems.length} unprocessed items`);

    if (unprocessedItems.length === 0) {
      log("All items have been processed!");
      return;
    }

    // Process each item
    for (let i = 0; i < unprocessedItems.length; i++) {
      const item = unprocessedItems[i];
      log(
        `\n[${i + 1}/${unprocessedItems.length}] Processing: ${item.name} (cbRank: ${item.cbRank || "N/A"})`,
      );

      // Launch browser for this item (single window, all tabs will be in this window)
      log("Launching browser...");
      browser = await chromium.launch({
        headless: false,
        args: ["--start-maximized"], // Ensure single window
      });
      // Create a context - all pages in this context will be in the same window
      const context = await browser.newContext();
      log("Browser launched");

      const changes = await validateItemLinks(context, item);

      // Context will be closed automatically when browser is closed by user

      // Browser is closed now, process results
      if (changes && Object.keys(changes).length > 0) {
        // Has changes - update with the changes
        log(`  ✏️ Changes detected for ${item.name}:`, changes);
        currentOverrides[item.name] = {
          ...changes,
          _processed: true,
        } as Partial<ScrappedItemType> & ProcessedState;
      } else {
        // No changes - mark as processed
        log(`  ✓ No changes for ${item.name}`);
        currentOverrides[item.name] = {
          _processed: true,
        } as ProcessedState;
      }

      // Save after each item
      saveManualOverrides(currentOverrides);
      log("  💾 Progress saved");

      // Ask if user wants to continue
      const { continueProcessing } = await inquirer.prompt([
        {
          type: "confirm",
          name: "continueProcessing",
          message: "Continue to next item?",
          default: true,
        },
      ]);

      if (!continueProcessing) {
        log("Stopping...");
        browser = null; // Don't try to close in finally block
        break;
      }

      // Browser is already closed, set to null so finally block doesn't try to close it
      browser = null;
    }

    log("\nValidation complete!");
  } catch (err) {
    error("Error during validation:", err);
    throw err;
  } finally {
    if (browser) {
      await browser.close();
      log("Browser closed");
    }
  }
}
