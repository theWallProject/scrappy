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

// Search service configuration
type SearchService = {
  name: string;
  urlTemplate: (query: string) => string;
};

const searchServices: SearchService[] = [
  {
    name: "Ecosia",
    urlTemplate: (query) =>
      `https://www.ecosia.org/search?q=${encodeURIComponent(query)}`,
  },
  {
    name: "GitHub",
    urlTemplate: (query) =>
      `https://github.com/search?q=${encodeURIComponent(query)}&type=users`,
  },
  {
    name: "YouTube",
    urlTemplate: (query) =>
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAg%253D%253D`,
  },
  {
    name: "TikTok",
    urlTemplate: (query) =>
      `https://www.tiktok.com/search/user?q=${encodeURIComponent(query)}`,
  },
  {
    name: "Play Store",
    urlTemplate: (query) =>
      `https://play.google.com/store/search?q=${encodeURIComponent(query)}&c=apps`,
  },
  {
    name: "Apple Store",
    urlTemplate: (query) =>
      `https://www.apple.com/us/search/${encodeURIComponent(query)}?src=globalnav`,
  },
  {
    name: "Chrome Web Store",
    urlTemplate: (query) =>
      `https://chrome.google.com/webstore/search/${encodeURIComponent(query)}`,
  },
  {
    name: "Facebook",
    urlTemplate: (query) =>
      `https://www.facebook.com/search/top/?q=${encodeURIComponent(query)}`,
  },
  {
    name: "Threads",
    urlTemplate: (query) =>
      `https://www.threads.net/search?q=${encodeURIComponent(query)}`,
  },
  {
    name: "Instagram",
    urlTemplate: (query) =>
      `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(query)}`,
  },
];

/**
 * Opens search pages for all configured search services
 */
const openSearchPages = async (
  context: BrowserContext,
  query: string,
  pages: Page[],
): Promise<void> => {
  for (const service of searchServices) {
    try {
      const searchPage = await context.newPage();
      const searchUrl = service.urlTemplate(query);
      log(`  🔍 Opening ${service.name} search for "${query}"`);
      await searchPage.goto(searchUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      pages.push(searchPage);
      log(`  ✓ ${service.name} search tab opened`);
    } catch (e) {
      log(`  [DEBUG] Could not open ${service.name} search tab: ${e}`);
    }
  }
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

  // Open search pages for all configured services
  await openSearchPages(context, item.name, pages);

  // Close any empty tabs that might have been opened
  try {
    const allPages = context.pages();
    const emptyPages: Page[] = [];
    for (const page of allPages) {
      try {
        if (!page.isClosed() && !pages.includes(page)) {
          const url = page.url();
          if (url === "about:blank" || url === "") {
            emptyPages.push(page);
          }
        }
      } catch {
        // Page might already be closed or not accessible
      }
    }

    // Close all empty pages (except the ones we're using)
    for (const page of emptyPages) {
      try {
        await page.close();
      } catch {
        // Page might already be closed
      }
    }
    if (emptyPages.length > 0) {
      log(`  Closed ${emptyPages.length} empty tab(s)`);
    }
  } catch {
    // Ignore errors when closing empty tabs
  }

  // Wait for entire browser to be closed by user
  log(
    `  ⏳ Browser windows are open (${pages.length} tabs). Close the browser to proceed...`,
  );

  // CRITICAL: Store tracking data OUTSIDE browser context scope
  // These persist even after browser/context closes
  const urlStorage = new Map<Page, string>(); // Tab -> URL mapping (final URL per tab)
  const trackedTabs = new Set<Page>(); // All tracked tabs

  // Initialize with tabs we opened
  for (const tab of pages) {
    trackedTabs.add(tab);
    try {
      const url = tab.url();
      if (url && url !== "about:blank") {
        urlStorage.set(tab, url); // Store tab->URL mapping
      }
    } catch {
      // Tab might not have URL yet
    }
  }

  // Helper to update and store a tab's URL (synchronous for events)
  // Maintains clear tab->URL mapping (final URL per tab)
  const updateTabUrl = (tab: Page, source: string = "unknown") => {
    try {
      if (tab.isClosed()) {
        return;
      }
      const tabUrl = tab.url();
      if (tabUrl && tabUrl !== "about:blank") {
        const oldUrl = urlStorage.get(tab);
        urlStorage.set(tab, tabUrl); // Update tab->URL mapping

        if (oldUrl && oldUrl !== tabUrl && oldUrl !== "about:blank") {
          log(
            `  [DEBUG] ✨ Tab URL updated from ${source}: ${oldUrl} → ${tabUrl}`,
          );
        } else if (oldUrl !== tabUrl) {
          log(`  [DEBUG] ✨ Tab URL captured from ${source}: ${tabUrl}`);
        }
      }
    } catch {
      // Tab might be closing or not accessible - ignore silently
    }
  };

  // Store URLs for initial tabs and set up navigation listeners
  for (const tab of pages) {
    try {
      updateTabUrl(tab, "initial");

      // Set up navigation listeners for all initial tabs
      tab.on("framenavigated", () => {
        updateTabUrl(tab, "framenavigated");
      });

      tab.on("load", () => {
        updateTabUrl(tab, "load");
      });

      // Listen for tab close - remove tab->URL mapping when user closes tab
      tab.on("close", () => {
        // Remove tab from storage (user doesn't want this tab)
        const url = urlStorage.get(tab);
        if (url && url !== "about:blank") {
          log(`  [DEBUG] ✗ Tab closed, removed tab mapping: ${url}`);
        }
        urlStorage.delete(tab); // Remove tab->URL mapping
        trackedTabs.delete(tab);
      });
    } catch {
      // Tab might not have a URL yet
    }
  }

  // Listen for new tabs created (including manually opened tabs)
  // This event fires synchronously when a new tab is created
  // Events write to external storage, independent of browser lifecycle
  context.on("page", (tab) => {
    try {
      trackedTabs.add(tab); // Track in external storage
      log(`  [DEBUG] ✨ New tab created (total tracked: ${trackedTabs.size})`);

      // Try to get URL immediately if available
      try {
        const initialUrl = tab.url();
        if (initialUrl && initialUrl !== "about:blank") {
          urlStorage.set(tab, initialUrl); // Store tab->URL mapping
        }
      } catch {
        // Tab might not have URL yet
      }

      // Listen for navigation to capture final URL (stores externally)
      tab.on("framenavigated", () => {
        updateTabUrl(tab, "framenavigated");
      });

      // Also listen for load to catch fully loaded tabs (stores externally)
      tab.on("load", () => {
        updateTabUrl(tab, "load");
      });

      // Listen for tab close - remove tab->URL mapping when user closes tab
      tab.on("close", () => {
        // Remove tab from storage (user doesn't want this tab)
        const url = urlStorage.get(tab);
        if (url && url !== "about:blank") {
          log(`  [DEBUG] ✗ Tab closed, removed tab mapping: ${url}`);
        }
        urlStorage.delete(tab); // Remove tab->URL mapping
        trackedTabs.delete(tab);
      });
    } catch (e) {
      log(`  [DEBUG] Error in tab event handler: ${e}`);
    }
  });

  return new Promise<OverrideWithUrls | null>((resolve) => {
    let resolved = false;
    let pollInterval: NodeJS.Timeout | null = null;

    // Collect URLs from external storage (no dependency on browser context)
    const collectExtraUrls = (): string[] => {
      const extraUrls: string[] = [];
      log(`  [DEBUG] === Starting URL collection ===`);
      log(
        `  [DEBUG] Links we opened: ${JSON.stringify(links.map((l) => l.url))}`,
      );
      log(`  [DEBUG] Total tracked tabs: ${trackedTabs.size}`);
      log(`  [DEBUG] Tabs with URLs in storage: ${urlStorage.size}`);

      // NO browser access during collection - all data already prepared by events
      try {
        // No exclusion logic - collect ALL URLs from all tabs
        // User will manually close tabs they don't need

        // Collect ALL URLs from urlStorage - maintains clear tab->URL separation
        // Each entry in urlStorage represents one tab with its final URL
        const tabUrls = new Map<Page, string>(); // Tab -> final URL (maintains separation)
        const allCachedUrls = new Map<string, string>(); // normalized -> original url (for deduplication)

        // Collect from urlStorage - maintains tab->URL relationship
        for (const [tab, url] of urlStorage.entries()) {
          if (url && url !== "about:blank") {
            tabUrls.set(tab, url); // Keep tab->URL mapping
            const normalized = normalizeUrlForComparison(url);
            if (!allCachedUrls.has(normalized)) {
              allCachedUrls.set(normalized, url);
            }
            log(`  [DEBUG] Tab has final URL: ${url}`);
          }
        }

        log(`  [DEBUG] Collected ${tabUrls.size} tabs with URLs`);

        log(
          `  [DEBUG] Found ${allCachedUrls.size} unique cached URLs to check`,
        );

        // Process all cached URLs - no exclusions, collect everything
        for (const [, originalUrl] of allCachedUrls.entries()) {
          const cleanedUrl = removeTrailingSlash(originalUrl);
          log(`  [DEBUG] ✓ Adding URL: ${cleanedUrl}`);
          extraUrls.push(cleanedUrl);
        }

        // Log summary
        log(`  [DEBUG] Total cached URLs processed: ${allCachedUrls.size}`);
        if (allCachedUrls.size > 0) {
          log(
            `  [DEBUG] All cached URLs: ${Array.from(allCachedUrls.values()).join(", ")}`,
          );
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

      // Collect URLs - NO processing during cleanup, just read tab->URL mappings
      log(`  [DEBUG] cleanup() called with reason: ${reason}`);
      log(
        `  [DEBUG] Reading tab->URL mappings (no browser access needed): ${urlStorage.size} tabs with URLs`,
      );

      // Simply read from urlStorage - tab->URL mappings prepared by events
      (async () => {
        log(`  [DEBUG] Collecting from tab->URL mappings...`);
        const extraUrls = collectExtraUrls();

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
            hasChanges = true;
            log(
              `  ✓ Kept ${categorized.urls.length} unsupported URL(s) in urls array`,
            );
          }
        } else {
          log(`  [DEBUG] No extra URLs found`);
        }

        log(
          `  [DEBUG] Final changes object: ${JSON.stringify(changes, null, 2)}`,
        );
        log(
          `  [DEBUG] hasChanges=${hasChanges}, changes.keys=${Object.keys(changes).join(", ")}`,
        );

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

/**
 * Draws a progress bar
 */
const drawProgressBar = (
  current: number,
  total: number,
  width: number = 40,
): string => {
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  return `[${bar}] ${percentage.toFixed(1)}% (${current}/${total})`;
};

/**
 * Gets statistics about processed/unprocessed items
 */
const getStatistics = (
  allItems: ScrappedItemType[],
  processedItems: Record<string, ManualOverrideValue>,
) => {
  const total = allItems.length;
  let processed = 0;
  let unprocessed = 0;
  const byReason: Record<string, { total: number; processed: number }> = {
    h: { total: 0, processed: 0 },
    f: { total: 0, processed: 0 },
    other: { total: 0, processed: 0 },
  };

  for (const item of allItems) {
    const isProcessedItem =
      processedItems[item.name] && isProcessed(processedItems[item.name]);

    if (isProcessedItem) {
      processed++;
    } else {
      unprocessed++;
    }

    // Count by reason
    const priority = getReasonPriority(item);
    if (priority === 1) {
      // "h" reason
      byReason.h.total++;
      if (isProcessedItem) byReason.h.processed++;
    } else if (priority === 2) {
      // "f" reason
      byReason.f.total++;
      if (isProcessedItem) byReason.f.processed++;
    } else {
      // other reasons
      byReason.other.total++;
      if (isProcessedItem) byReason.other.processed++;
    }
  }

  return {
    total,
    processed,
    unprocessed,
    byReason,
  };
};

/**
 * Displays statistics and progress bar
 */
const displayStatistics = (
  allItems: ScrappedItemType[],
  processedItems: Record<string, ManualOverrideValue>,
) => {
  const stats = getStatistics(allItems, processedItems);

  log("\n" + "=".repeat(60));
  log("📊 VALIDATION STATISTICS");
  log("=".repeat(60));

  // Overall progress
  log("\n📈 Overall Progress:");
  log(`   ${drawProgressBar(stats.processed, stats.total, 50)}`);

  // By reason
  log("\n📋 By Reason:");
  log(
    `   Reason "h": ${drawProgressBar(stats.byReason.h.processed, stats.byReason.h.total, 30)}`,
  );
  log(
    `   Reason "f": ${drawProgressBar(stats.byReason.f.processed, stats.byReason.f.total, 30)}`,
  );
  log(
    `   Others:    ${drawProgressBar(stats.byReason.other.processed, stats.byReason.other.total, 30)}`,
  );

  // Summary
  log("\n📊 Summary:");
  log(`   Total companies:     ${stats.total}`);
  log(
    `   ✅ Processed:        ${stats.processed} (${((stats.processed / stats.total) * 100).toFixed(1)}%)`,
  );
  log(
    `   ⏳ Remaining:        ${stats.unprocessed} (${((stats.unprocessed / stats.total) * 100).toFixed(1)}%)`,
  );

  log("\n📋 Remaining by Reason:");
  log(
    `   Reason "h":          ${stats.byReason.h.total - stats.byReason.h.processed} remaining`,
  );
  log(
    `   Reason "f":          ${stats.byReason.f.total - stats.byReason.f.processed} remaining`,
  );
  log(
    `   Others:              ${stats.byReason.other.total - stats.byReason.other.processed} remaining`,
  );

  log("\n" + "=".repeat(60));
};

/**
 * Gets the priority of an item based on its reasons:
 * - "h" reason = priority 1 (highest)
 * - "f" reason = priority 2
 * - others = priority 3 (lowest)
 */
const getReasonPriority = (item: ScrappedItemType): number => {
  if (!item.reasons || item.reasons.length === 0) {
    return 3; // No reasons = lowest priority
  }
  if (item.reasons.includes("h")) {
    return 1; // Highest priority
  }
  if (item.reasons.includes("f")) {
    return 2; // Second priority
  }
  return 3; // Other reasons = lowest priority
};

const sortByReasonAndCbRank = (
  items: ScrappedItemType[],
): ScrappedItemType[] => {
  return [...items].sort((a, b) => {
    // First sort by reason priority (h first, then f, then others)
    const priorityA = getReasonPriority(a);
    const priorityB = getReasonPriority(b);
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // If same priority, sort by cbRank (lowest first)
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

    // Sort by reason priority (h first, then f, then others) and cbRank
    const sortedData = sortByReasonAndCbRank(data);
    log("Sorted by reason priority (h > f > others) and cbRank");

    // Filter out already processed items
    const unprocessedItems = sortedData.filter((item) => {
      const existing = currentOverrides[item.name];
      return !existing || !isProcessed(existing);
    });

    log(`\nFound ${unprocessedItems.length} unprocessed items`);

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

    // CRITICAL: Ensure file is fully written and readable before proceeding
    // Verify the file exists and is readable to ensure it's saved on disk
    try {
      const exists = fs.existsSync(manualOverridesPath);
      if (!exists) {
        throw new Error(
          `manualOverrides file not found after save: ${manualOverridesPath}`,
        );
      }
      // Try to read it to ensure it's fully written
      fs.readFileSync(manualOverridesPath, "utf-8");
      log("  💾 Progress saved and verified");
    } catch (e) {
      error(`  ⚠️  Failed to verify manualOverrides save: ${e}`);
      throw new Error(
        `Cannot proceed: manualOverrides file not saved correctly`,
      );
    }

    log(`\n✓ Item processed. Remaining items: ${unprocessedItems.length - 1}`);
    log("Running update steps (skipping questions)...");

    try {
      await runUpdateSteps();
      log("✓ Update steps completed successfully");
    } catch (err) {
      error("Error running update steps:", err);
      throw err;
    }

    // Reload overrides to get updated statistics
    const updatedOverrides = loadManualOverrides();

    log("\n✅ Script complete. Run again to process next item.");

    // Display statistics at the very end
    displayStatistics(sortedData, updatedOverrides);

    // Exit cleanly to prevent hanging prompts from index.ts
    process.exit(0);
  } catch (err) {
    error("Error during validation:", err);
    throw err;
  } finally {
    if (browserContext) {
      try {
        // Check if browser is still connected before trying to close
        const browser = browserContext.browser();
        const isConnected = browser?.isConnected() ?? false;
        if (isConnected) {
          await browserContext.close();
          log("Browser closed");
        }
      } catch {
        // Browser context already closed, ignore
      }
    }
  }
}
