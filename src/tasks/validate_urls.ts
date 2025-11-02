import fs from "fs";
import path from "path";
import { chromium, BrowserContext, Page } from "playwright";
import {
  API_ENDPOINT_RULE_LINKEDIN,
  API_ENDPOINT_RULE_FACEBOOK,
  API_ENDPOINT_RULE_TWITTER,
} from "@theWallProject/addonCommon";
import { APIScrapperFileDataSchema, ScrappedItemType } from "../types";
import { error, log } from "../helper";
import prettier from "prettier";
import { runUpdateSteps } from "../index";

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
  const resolvedPath = require.resolve(modulePath);
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete require.cache[resolvedPath];
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
    if ("urls" in value && value.urls !== undefined)
      fields.push(`urls: ${JSON.stringify(value.urls)}`);

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
    if ("urls" in value && value.urls !== undefined)
      fields.push(`urls: ${JSON.stringify(value.urls)}`);

    if (fields.length > 0) {
      return `{ ${fields.join(", ")} }`;
    } else {
      return `{}`;
    }
  }
};

const saveManualOverrides = async (
  overrides: Record<string, ManualOverrideValue>,
) => {
  const keys = Object.keys(overrides).sort();
  let content = 'import { ScrappedItemType } from "../../types";\n\n';
  content +=
    '// Allow arrays for link fields in overrides\ntype ManualOverrideFields = {\n  ws?: string | string[];\n  li?: string | string[];\n  fb?: string | string[];\n  tw?: string | string[];\n} & Omit<Partial<ScrappedItemType>, "ws" | "li" | "fb" | "tw">;\n\n';
  content +=
    "export const manualOverrides: Record<string, ManualOverrideFields | { _processed: true } | (ManualOverrideFields & { _processed: true }) | (ManualOverrideFields & { urls?: string[] }) | (ManualOverrideFields & { _processed: true; urls?: string[] })> = {\n";

  for (const key of keys) {
    const value = overrides[key];
    const needsQuotes = !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
    const keyStr = needsQuotes ? `"${key.replace(/"/g, '\\"')}"` : key;
    content += `  ${keyStr}: ${formatValue(value)},\n`;
  }

  content += "};\n";

  // Format with prettier
  try {
    const prettierConfig = await prettier.resolveConfig(manualOverridesPath);
    const formatted = await prettier.format(content, {
      ...prettierConfig,
      parser: "typescript",
    });
    fs.writeFileSync(manualOverridesPath, formatted, "utf-8");
    log(
      `Saved manualOverrides to ${manualOverridesPath} (formatted with prettier)`,
    );
  } catch (e) {
    // If prettier fails, save without formatting
    fs.writeFileSync(manualOverridesPath, content, "utf-8");
    log(
      `Saved manualOverrides to ${manualOverridesPath} (prettier failed: ${e})`,
    );
  }
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

const removeTrailingSlash = (url: string): string => {
  return url.replace(/\/+$/, "");
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
type CategorizedUrls = {
  ws?: string[];
  li?: string[];
  fb?: string[];
  tw?: string[];
  urls?: string[]; // Unsupported URLs only
};

// Categorize a URL into ws, li, fb, tw, or null (unsupported)
const categorizeUrl = (url: string): LinkField | null => {
  try {
    // Check LinkedIn
    const regexLinkedin = new RegExp(API_ENDPOINT_RULE_LINKEDIN.regex);
    if (regexLinkedin.test(url)) {
      return "li";
    }

    // Check Facebook
    const regexFacebook = new RegExp(API_ENDPOINT_RULE_FACEBOOK.regex);
    const normalizedFb = url.replace("/pg/", "/").replace("/p/", "/");
    if (regexFacebook.test(normalizedFb)) {
      return "fb";
    }

    // Check Twitter/X
    const regexTwitter = new RegExp(API_ENDPOINT_RULE_TWITTER.regex);
    if (regexTwitter.test(url)) {
      return "tw";
    }

    // Don't auto-categorize websites - keep them in urls for manual organization
    // Exclude obvious non-website URLs
    const excludePatterns = [
      /youtube\./i,
      /instagram\./i,
      /tiktok\./i,
      /threads\./i,
      /apps\.apple\./i,
      /play\.google\./i,
      /vimeo\./i,
      /greenhouse\./i,
      /consent\.yahoo\./i,
      /cnbc\./i,
    ];

    const isExcluded = excludePatterns.some((pattern) => pattern.test(url));
    if (isExcluded) {
      return null; // Unsupported
    }

    // Websites stay in urls array for manual organization
    return null;
  } catch (e) {
    log(`  [DEBUG] Error categorizing URL ${url}: ${e}`);
    return null;
  }
};

type OverrideWithUrls = {
  ws?: string | string[];
  li?: string | string[];
  fb?: string | string[];
  tw?: string | string[];
  urls?: string[];
};

const validateItemLinks = async (
  context: BrowserContext,
  item: ScrappedItemType,
): Promise<OverrideWithUrls | null> => {
  const changes: OverrideWithUrls = {};
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
        changes[field] = removeTrailingSlash(finalUrl);
        hasChanges = true;
      } else {
        // URLs are equivalent after normalization
        log(`    ✓ No redirect (URLs are equivalent: ${url} === ${finalUrl})`);
      }

      pages.push(page);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      error(
        `    ⚠️  Error checking ${field} (${url}): ${errorMessage}. Page kept open for manual verification.`,
      );

      // Keep the page open for manual verification instead of closing it
      // The user can manually check and update if needed
      pages.push(page);
      // Note: We don't set changes[field] here, so it won't be auto-updated
      // User can manually update via the urls array or close the browser and continue
    }
  }

  // Open Ecosia search tab for the company name
  try {
    const searchPage = await context.newPage();
    const searchUrl = `https://www.ecosia.org/search?q=${encodeURIComponent(item.name)}`;
    log(`  🔍 Opening Ecosia search for "${item.name}"`);
    await searchPage.goto(searchUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    pages.push(searchPage);
    log(`  ✓ Ecosia search tab opened`);
  } catch (e) {
    log(`  [DEBUG] Could not open Ecosia search tab: ${e}`);
  }

  // Wait for entire browser to be closed by user
  log(
    `  ⏳ Browser windows are open (${pages.length} tabs). Close the browser to proceed...`,
  );

  // Track all pages including manually opened ones
  const allTrackedPages = new Set<Page>(pages);
  // Store URLs for pages even after they're closed
  const pageUrls = new Map<Page, string>();

  // Store URLs for initial pages
  for (const page of pages) {
    try {
      const url = page.url();
      pageUrls.set(page, url);
    } catch {
      // Page might not have a URL yet
    }
  }

  // Listen for new pages created (including manually opened tabs)
  context.on("page", async (page) => {
    try {
      allTrackedPages.add(page);
      log(
        `  [DEBUG] ✨ New page created (total tracked: ${allTrackedPages.size})`,
      );

      // Try to get URL immediately
      const updatePageUrl = async () => {
        try {
          // Wait a bit for navigation to complete
          await new Promise((resolve) => setTimeout(resolve, 500));
          const pageUrl = page.url();
          if (pageUrl && pageUrl !== "about:blank") {
            const oldUrl = pageUrls.get(page);
            pageUrls.set(page, pageUrl);
            if (oldUrl !== pageUrl) {
              log(`  [DEBUG] ✨ Page URL captured/updated: ${pageUrl}`);
            }
          }
        } catch {
          // Ignore errors getting URL
        }
      };

      // Try immediately and after navigation
      updatePageUrl().catch(() => {});

      // Also listen for navigation to capture final URL
      page.on("framenavigated", () => {
        updatePageUrl().catch(() => {});
      });

      // Also listen for load to catch fully loaded pages
      page.on("load", () => {
        updatePageUrl().catch(() => {});
      });
    } catch (e) {
      log(`  [DEBUG] Error in page event handler: ${e}`);
    }
  });

  return new Promise<OverrideWithUrls | null>((resolve) => {
    let resolved = false;
    let pollInterval: NodeJS.Timeout | null = null;

    const collectExtraUrls = (): string[] => {
      const extraUrls: string[] = [];
      log(`  [DEBUG] === Starting URL collection ===`);
      log(
        `  [DEBUG] Links we opened: ${JSON.stringify(links.map((l) => l.url))}`,
      );
      log(`  [DEBUG] Total tracked pages: ${allTrackedPages.size}`);
      log(`  [DEBUG] Original pages array length: ${pages.length}`);

      try {
        // Try to get pages from context first, but fallback to tracked pages
        // if context is closed (returns empty array)
        let pagesToCheck: Page[] = [];
        try {
          pagesToCheck = context.pages();
          log(
            `  [DEBUG] Found ${pagesToCheck.length} pages from context.pages()`,
          );
          if (pagesToCheck.length > 0) {
            log(
              `  [DEBUG] Context pages: ${pagesToCheck.map((p, i) => `[${i}] ${p.isClosed() ? "CLOSED" : p.url()}`).join(", ")}`,
            );
          } else {
            // Context is closed or empty, use tracked pages
            log(
              `  [DEBUG] context.pages() returned empty (context closed), using tracked pages`,
            );
            pagesToCheck = Array.from(allTrackedPages);
            log(`  [DEBUG] Using ${pagesToCheck.length} tracked pages`);
          }
        } catch (e) {
          log(`  [DEBUG] Could not get pages from context: ${e}`);
          // Fallback to tracked pages
          pagesToCheck = Array.from(allTrackedPages);
          log(`  [DEBUG] Using ${pagesToCheck.length} tracked pages`);
        }

        // If still empty, use the original pages array as last resort
        if (pagesToCheck.length === 0 && pages.length > 0) {
          log(
            `  [DEBUG] Tracked pages empty, falling back to original pages array`,
          );
          pagesToCheck = pages;
          log(
            `  [DEBUG] Using ${pagesToCheck.length} pages from original array`,
          );
        }

        if (pagesToCheck.length > 0) {
          log(
            `  [DEBUG] Final pages to check: ${pagesToCheck.map((p, i) => `[${i}] ${p.isClosed() ? "CLOSED" : p.url()}`).join(", ")}`,
          );
        }

        // Create set of normalized URLs to exclude:
        // 1. URLs we automatically opened (ws, li, fb, tw tabs)
        // 2. URLs already in the data
        const excludedUrls = new Set<string>();

        // Add the URLs we automatically opened (normalized)
        for (const autoPage of pages) {
          try {
            const autoUrl = pageUrls.get(autoPage) || autoPage.url();
            if (autoUrl && autoUrl !== "about:blank") {
              const normalized = normalizeUrlForComparison(autoUrl);
              excludedUrls.add(normalized);
              log(
                `  [DEBUG] Added auto-opened tab to exclude: ${autoUrl} -> ${normalized}`,
              );
            }
          } catch {
            // Page might be closed, skip
          }
        }

        // Also exclude the Ecosia search URL we opened
        const ecosiaSearchUrl = normalizeUrlForComparison(
          `https://www.ecosia.org/search?q=${encodeURIComponent(item.name)}`,
        );
        excludedUrls.add(ecosiaSearchUrl);

        // Add the URLs that are already in the item data (normalized)
        if (item.ws) {
          const normalized = normalizeUrlForComparison(item.ws);
          excludedUrls.add(normalized);
          log(
            `  [DEBUG] Added existing ws to exclude: ${item.ws} -> ${normalized}`,
          );
        }
        if (item.li) {
          const normalized = normalizeUrlForComparison(item.li);
          excludedUrls.add(normalized);
          log(
            `  [DEBUG] Added existing li to exclude: ${item.li} -> ${normalized}`,
          );
        }
        if (item.fb) {
          const normalized = normalizeUrlForComparison(item.fb);
          excludedUrls.add(normalized);
          log(
            `  [DEBUG] Added existing fb to exclude: ${item.fb} -> ${normalized}`,
          );
        }
        if (item.tw) {
          const normalized = normalizeUrlForComparison(item.tw);
          excludedUrls.add(normalized);
          log(
            `  [DEBUG] Added existing tw to exclude: ${item.tw} -> ${normalized}`,
          );
        }

        log(
          `  [DEBUG] Total URLs to exclude (normalized): ${Array.from(excludedUrls).join(", ")}`,
        );

        log(
          `  [DEBUG] Checking ${pagesToCheck.length} pages for extra URLs...`,
        );
        for (let i = 0; i < pagesToCheck.length; i++) {
          const page = pagesToCheck[i];
          try {
            const isClosed = page.isClosed();
            log(`  [DEBUG] Page [${i}]: isClosed=${isClosed}`);

            // Try to get URL - either from live page or cached
            let pageUrl: string | null = null;
            if (!isClosed) {
              try {
                pageUrl = page.url();
              } catch {
                // Page might be closing
              }
            }

            // If page is closed or we couldn't get URL, try cached URL
            if (!pageUrl || pageUrl === "about:blank") {
              pageUrl = pageUrls.get(page) || null;
              if (pageUrl) {
                log(`  [DEBUG] Page [${i}] using cached URL: ${pageUrl}`);
              }
            }

            if (pageUrl && pageUrl !== "about:blank") {
              const normalizedPageUrl = normalizeUrlForComparison(pageUrl);

              log(
                `  [DEBUG] Page [${i}] URL: ${pageUrl} (normalized: ${normalizedPageUrl})`,
              );

              // Ignore ecosia domains
              const isEcosia = /ecosia\.(org|com|net)/i.test(pageUrl);
              if (isEcosia) {
                log(`  [DEBUG] ✗ Skipping page [${i}] (ecosia domain)`);
                continue;
              }

              const isExcluded = excludedUrls.has(normalizedPageUrl);
              log(
                `  [DEBUG] Page [${i}] isExcluded=${isExcluded} (checking against ${excludedUrls.size} excluded URLs)`,
              );

              // Check if this URL is new information (not auto-opened and not already in data)
              if (!isExcluded) {
                const cleanedUrl = removeTrailingSlash(pageUrl);
                log(`  [DEBUG] ✓ Adding NEW URL: ${cleanedUrl}`);
                extraUrls.push(cleanedUrl);
              } else {
                log(
                  `  [DEBUG] ✗ Skipping page [${i}] (excluded: ${normalizedPageUrl})`,
                );
              }
            } else {
              log(`  [DEBUG] Page [${i}] no URL available (closed or blank)`);
            }
          } catch (e) {
            log(`  [DEBUG] Error checking page [${i}]: ${e}`);
            // Page might be closed or URL not available
          }
        }

        // Remove duplicates and sort
        const uniqueUrls = Array.from(new Set(extraUrls));
        uniqueUrls.sort();

        log(`  [DEBUG] === URL collection complete ===`);
        log(
          `  [DEBUG] Collected ${extraUrls.length} URLs (${uniqueUrls.length} unique): ${JSON.stringify(uniqueUrls)}`,
        );

        return uniqueUrls;
      } catch (e) {
        log(`  [DEBUG] Error collecting extra URLs: ${e}`);
        if (e instanceof Error) {
          log(`  [DEBUG] Error stack: ${e.stack}`);
        }
        return [];
      }
    };

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

      // Collect URLs from all tabs before browser closes
      log(`  [DEBUG] cleanup() called with reason: ${reason}`);
      log(
        `  [DEBUG] About to collect URLs, tracked pages: ${allTrackedPages.size}`,
      );

      // Try to collect URLs immediately before context fully closes
      // Also try after a small delay as fallback
      (async () => {
        // First attempt: immediate collection (before delay)
        log(`  [DEBUG] Attempting immediate URL collection...`);
        let extraUrls = collectExtraUrls();

        // If that didn't work and we have tracked pages, try again after delay
        if (extraUrls.length === 0 && allTrackedPages.size > 0) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          log(`  [DEBUG] Retrying URL collection after 100ms delay...`);
          extraUrls = collectExtraUrls();
        }

        log(`  [DEBUG] Collection returned ${extraUrls.length} URLs`);
        log(
          `  [DEBUG] Changes object before: ${JSON.stringify(Object.keys(changes))}`,
        );

        if (extraUrls.length > 0) {
          log(`  📎 Found ${extraUrls.length} extra tab URL(s):`, extraUrls);

          // Categorize URLs into appropriate keys
          const categorized: CategorizedUrls = {};

          for (const url of extraUrls) {
            const category = categorizeUrl(url);
            if (category === "li") {
              if (!categorized.li) categorized.li = [];
              categorized.li.push(url);
            } else if (category === "fb") {
              if (!categorized.fb) categorized.fb = [];
              categorized.fb.push(url);
            } else if (category === "tw") {
              if (!categorized.tw) categorized.tw = [];
              categorized.tw.push(url);
            } else {
              // Unsupported URL or website - keep in urls array for manual organization
              if (!categorized.urls) categorized.urls = [];
              categorized.urls.push(url);
            }
          }

          // Merge categorized URLs into changes object
          // Note: Websites are kept in urls array for manual organization

          if (categorized.li && categorized.li.length > 0) {
            if (Array.isArray(changes.li)) {
              changes.li = [...changes.li, ...categorized.li];
            } else if (typeof changes.li === "string") {
              changes.li = [changes.li, ...categorized.li];
            } else {
              changes.li = categorized.li;
            }
            hasChanges = true;
            log(`  ✓ Categorized ${categorized.li.length} LinkedIn URL(s)`);
          }

          if (categorized.fb && categorized.fb.length > 0) {
            if (Array.isArray(changes.fb)) {
              changes.fb = [...changes.fb, ...categorized.fb];
            } else if (typeof changes.fb === "string") {
              changes.fb = [changes.fb, ...categorized.fb];
            } else {
              changes.fb = categorized.fb;
            }
            hasChanges = true;
            log(`  ✓ Categorized ${categorized.fb.length} Facebook URL(s)`);
          }

          if (categorized.tw && categorized.tw.length > 0) {
            if (Array.isArray(changes.tw)) {
              changes.tw = [...changes.tw, ...categorized.tw];
            } else if (typeof changes.tw === "string") {
              changes.tw = [changes.tw, ...categorized.tw];
            } else {
              changes.tw = categorized.tw;
            }
            hasChanges = true;
            log(`  ✓ Categorized ${categorized.tw.length} Twitter/X URL(s)`);
          }

          // Only keep unsupported URLs in urls array
          if (categorized.urls && categorized.urls.length > 0) {
            changes.urls = categorized.urls;
            log(
              `  ✓ Kept ${categorized.urls.length} unsupported URL(s) in urls array`,
            );
          }
        } else {
          log(`  [DEBUG] No extra URLs found`);
        }

        const finalHasChanges =
          hasChanges || (changes.urls !== undefined && changes.urls.length > 0);
        const hasUrls = changes.urls !== undefined && changes.urls.length > 0;
        log(
          `  [DEBUG] Final decision: hasChanges=${hasChanges}, hasUrls=${hasUrls}, finalHasChanges=${finalHasChanges}`,
        );
        log(`  ✓ Browser closed, continuing... (detected via: ${reason})`);
        resolve(finalHasChanges ? changes : null);
      })();
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
    pollInterval = setInterval(() => {
      const isConnected = browser.isConnected();
      const browserFromContext = context.browser();
      const allPagesClosed = pages.every((p) => p.isClosed());

      if (!isConnected) {
        cleanup("polling (isConnected=false)");
        return;
      }

      // Also check if context browser is null
      if (browserFromContext === null) {
        cleanup("polling (context.browser() === null)");
        return;
      }

      // If all pages are closed, browser was likely closed
      if (allPagesClosed && pages.length > 0) {
        cleanup("polling (all pages closed)");
        return;
      }
    }, 1000); // Poll every second
  });
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
  let browserContext: BrowserContext | null = null;

  // Enable extension loading (set to false to disable)
  const ENABLE_EXTENSION = false;

  // Persistent browser profile path
  const userDataDir = path.join(__dirname, "../../.browser-profile");

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

    // Process only the first unprocessed item

    const item = unprocessedItems[0];
    log(
      `\n[1/${unprocessedItems.length}] Processing: ${item.name} (cbRank: ${item.cbRank || "N/A"})`,
    );

    // Launch browser with persistent profile (reuse same profile across items)
    log("Launching browser with persistent profile...");

    const browserArgs = [
      "--start-maximized", // Ensure single window
      // Remove automation detection flags
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--no-sandbox",
      // Use a realistic user agent
      "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ];

    // Extension loading (enabled by ENABLE_EXTENSION flag)
    if (ENABLE_EXTENSION) {
      // Extension path relative to this script
      const extensionManifestPath = path.join(
        __dirname,
        "../../../addon/build/chrome-mv3-dev/manifest.json",
      );

      // Check if extension exists - crash if not found
      if (!fs.existsSync(extensionManifestPath)) {
        throw new Error(
          `Extension manifest not found at: ${extensionManifestPath}`,
        );
      }

      const extensionDir = path.dirname(extensionManifestPath);
      browserArgs.push(`--load-extension=${extensionDir}`);
      log(`Loading extension from: ${extensionDir}`);
    } else {
      log("Extension loading disabled (ENABLE_EXTENSION=false)");
    }

    browserContext = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      channel: "chrome", // Use Playwright's Chrome channel support
      args: browserArgs,
      // Add viewport to make it look more realistic
      viewport: { width: 1280, height: 720 },
      // Disable webdriver flag
      ignoreHTTPSErrors: true,
    });
    log("Browser launched (profile will persist cookies/login)");

    // Remove webdriver property from all pages to avoid detection
    const pages = browserContext.pages();
    for (const page of pages) {
      await page.addInitScript(() => {
        // Remove webdriver property
        Object.defineProperty(navigator, "webdriver", {
          get: () => false,
        });
        // Override plugins to appear more realistic
        Object.defineProperty(navigator, "plugins", {
          get: () => [1, 2, 3, 4, 5],
        });
        // Override languages
        Object.defineProperty(navigator, "languages", {
          get: () => ["en-US", "en"],
        });
        // Remove Chrome automation indicator
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).chrome = {
          runtime: {},
        };
      });
    }

    // Also apply to future pages
    browserContext.on("page", async (page) => {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", {
          get: () => false,
        });
        Object.defineProperty(navigator, "plugins", {
          get: () => [1, 2, 3, 4, 5],
        });
        Object.defineProperty(navigator, "languages", {
          get: () => ["en-US", "en"],
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).chrome = {
          runtime: {},
        };
      });
    });

    // Use the persistent context directly
    const changes = await validateItemLinks(browserContext, item);

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
    await saveManualOverrides(currentOverrides);
    log("  💾 Progress saved");
    log(`\n✓ Item processed. Remaining items: ${unprocessedItems.length - 1}`);
    log("Running update steps (skipping questions)...");

    try {
      await runUpdateSteps();
      log("✓ Update steps completed successfully");
    } catch (err) {
      error("Error running update steps:", err);
      throw err;
    }

    log("\nScript complete. Run again to process next item.");

    // Exit cleanly to prevent hanging prompts from index.ts
    process.exit(0);
  } catch (err) {
    error("Error during validation:", err);
    throw err;
  } finally {
    if (browserContext) {
      await browserContext.close();
      log("Browser closed");
    }
  }
}
