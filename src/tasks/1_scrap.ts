import puppeteer, { Page } from "puppeteer";
import fs from "fs";
import path from "path";
import { format } from "prettier";
import { ScrappedItemType } from "../types";
import { APIListOfReasons } from "@theWallProject/addonCommon";
import { error, log, warn } from "../helper";
import dotenv from "dotenv";

type ScrappingConfig = {
  cbSearchUrl: string;
  // cbRanges: [string, string][];
  reasons: APIListOfReasons[];
  fileName: string;
  cbSteps: [number, number][];
};

const homeUrl = "https://www.crunchbase.com";
const filterStages: ScrappingConfig[] = [
  // isBlank
  // {
  //   cbSearchUrl:
  //     "https://www.crunchbase.com/lists/isr/f584e097-e942-47f5-a3a1-c3083b960430/organization.companies",
  //   reasons: [APIListOfReasons.HeadQuarterInIL],
  //   fileName: "HQ_ISR",
  //   cbSteps: [
  //     [1, 60000],
  //     [60001, 144000],
  //     [144001, 240000],
  //     [240001, 355000],
  //     [355001, 480000],
  //     [480001, 640000],
  //     [640001, 800000],
  //     [800001, 1000000],
  //     [1000001, 1200000],
  //     [1200001, 1400000],
  //     [1400001, 1600000],
  //     [1600001, 1800000],
  //     [1800001, 2000000],
  //     [2000001, 2200000],
  //     [2200001, 2400000],
  //     [2400001, 2600000],
  //     [2600001, 2800000],
  //     [2800001, 3000000],
  //     [3000001, 3200000],
  //     [3200001, 3400000],
  //     [3400001, 99999999],
  //   ],
  // },
  // {
  //   cbSearchUrl:
  //     "https://www.crunchbase.com/lists/isr-founder/4a567c09-b27f-4192-b60d-116133a09db6/organization.companies",
  //   reasons: [APIListOfReasons.FounderInIL],
  //   fileName: "FOUNDER_ISR",
  //   cbSteps: [
  //     [1, 30000],
  //     [30001, 130000],
  //     [130001, 999999999],
  //   ],
  // },
  {
    cbSearchUrl:
      "https://www.crunchbase.com/lists/berlin-halal-friendly/6dab6829-5be0-4038-a408-edf172fb269a/organization.companies",
    reasons: [APIListOfReasons.FounderInIL],
    fileName: "TMP_BERLIN",
    cbSteps: [
      [1, 130000],
      [130001, 320000],
      [320001, 550000],
      [550001, 840000],
      [840001, 1120000],
      [1120001, 1420000],
      [1420001, 1700000],
      [1700001, 1950000],
      [1950001, 2220000],
      [2220001, 2480000],
      [2480001, 2730000],
      [2730001, 3000000],
      [3000001, 3300000],
      [3300001, 999999999],
    ],
  },
];

export async function run() {
  dotenv.config();

  const EMAIL = process.env.EMAIL;
  const PASSWORD = process.env.PASSWORD;

  if (!EMAIL || !PASSWORD) {
    throw new Error("EMAIL and PASSWORD must be set");
  }

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: "/usr/bin/google-chrome",
    // args: ["--start-maximized"],
    args: ["--window-size=1800,1000"],
    // userDataDir,
  });
  const page = await browser.newPage();

  page.on("error", (err) => {
    error("Scrap browser error occurred:", err);
    throw new Error("Scrap browser error occurred");
  });

  page.on("close", () => {
    warn("Page was closed unexpectedly!");
  });

  browser.on("disconnected", () => {
    error("Browser was disconnected!");
    throw new Error("Browser was disconnected");
  });

  await page.setViewport({ width: 1800, height: 1000 });

  // Navigate to the page
  await page.goto(homeUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[aria-label="Log In"]');
  await page.click('[aria-label="Log In"]');
  await page.waitForSelector('[type="email"]');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  await page.type('[type="email"]', EMAIL, { delay: 100 });
  await page.type('[type="password"]', PASSWORD, { delay: 100 });
  await page.click('[type="submit"]');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  log("Continuing after login...");

  for await (const stage of filterStages) {
    log("processing stage:", stage);

    let batchNum = 1;

    for (const [from, to] of stage.cbSteps) {
      if (
        fs.existsSync(
          path.join(
            __dirname,
            `../../results/1_batches/${stage.fileName}_${batchNum}.json`,
          ),
        )
      ) {
        warn(`Skipping stage ${stage.fileName}_${batchNum}...`);
        batchNum += 1;

        continue;
      }

      log(`before naviagting to ${stage.cbSearchUrl}`);

      await page.goto(stage.cbSearchUrl, { waitUntil: "domcontentloaded" });

      // log("before reloading");
      // await page.reload({ waitUntil: "domcontentloaded" });

      await setFilter(page, 0, from);
      log("after setting from");

      await setFilter(page, 1, to);
      log("after setting to");

      try {
        await clickSearchButton(page);
      } catch (error) {
        warn("couldnt click search, skipping", error);
      }

      // const resultsInfo = await page.waitForSelector(
      //   ".component--results-info",
      // );

      // if (resultsInfo) {
      const textNodes = await page.evaluate(() => {
        const element = document.querySelector(".component--results-info");
        if (!element) return [];

        return Array.from(element.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent?.trim());
      });

      log("Search count:", textNodes);

      const results = await processTable(page, stage);
      log("after processTable");

      results.sort((a, b) => a.name.localeCompare(b.name));

      await saveResultsToFile(results, `${stage.fileName}_${batchNum}.json`);
      batchNum += 1;
    }

    // await page.goto(stage.cbSearchUrl, { waitUntil: "domcontentloaded" });
    // await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  // await browser.close();
}

async function saveResultsToFile(
  results: ScrappedItemType[],
  fileName: string,
) {
  const filePath = path.join(__dirname, "../../results/1_batches/", fileName);

  log(`scraping complete. Saving ${results.length} rows to [${filePath}]...`);
  const text = await format(JSON.stringify(results, null, 2), {
    parser: "json",
  });

  fs.writeFileSync(filePath, text, { flag: "a" });
  log(`Results saved to ${filePath}`);
}

async function clickSearchButton(page: Page): Promise<void> {
  log("Clicking the search button...");
  const searchButtonSelector = '[data-cy="search-button"]';
  await page.waitForSelector(searchButtonSelector, { timeout: 500 });

  try {
    await page.click(searchButtonSelector);
    log("Search button clicked, waiting for results to load...");
  } catch (error) {
    warn(
      "Couldnt click search button button, waiting for results to load...",
      error,
    );
  }
  await new Promise((resolve) => setTimeout(resolve, 5000));
}

async function setFilter(
  page: Page,
  index: number,
  value: number,
): Promise<void> {
  const selector = ".component--number-input .mdc-text-field__input";

  log(`Setting filter for ${selector} with value ${value}[${index}]`);
  await page.waitForSelector(selector);
  const fields = await page.$$(selector);
  const field = fields[index];
  await field.click();
  await new Promise((resolve) => setTimeout(resolve, 300));

  await field.press("ArrowRight", { delay: 100 });
  await field.press("ArrowRight", { delay: 100 });
  await field.press("ArrowRight", { delay: 100 });
  await field.press("ArrowRight", { delay: 100 });
  await field.press("ArrowRight", { delay: 100 });
  await field.press("ArrowRight", { delay: 100 });
  await field.press("ArrowRight", { delay: 100 });
  await field.press("ArrowRight", { delay: 100 });
  await field.press("Backspace", { delay: 100 });
  await field.press("Backspace", { delay: 100 });
  await field.press("Backspace", { delay: 100 });
  await field.press("Backspace", { delay: 100 });
  await field.press("Backspace", { delay: 100 });
  await field.press("Backspace", { delay: 100 });
  await field.press("Backspace", { delay: 100 });
  await field.press("Backspace", { delay: 100 });
  await field.press("Backspace", { delay: 100 });
  await field.press("Backspace", { delay: 100 });
  await field.type(`${value}`, { delay: 100 });
  await new Promise((resolve) => setTimeout(resolve, 300));

  if (index === 1) {
    await page.mouse.click(500, 100);
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}

async function processTable(
  page: Page,
  stage: ScrappingConfig,
): Promise<ScrappedItemType[]> {
  const results: ScrappedItemType[] = [];
  let hasMore = true;
  let currentFirstRowName = "";

  while (hasMore) {
    log("waiting for table body...");

    await page.waitForSelector(".body-wrapper");
    await page.waitForSelector(".body-wrapper grid-row");

    const rows = await page.$$(".body-wrapper grid-row");

    log("processing rows...");
    for (const row of rows) {
      const rowData: ScrappedItemType = await page.evaluate(
        (row, stg) => {
          const getData = (selector: string): string =>
            row.querySelector<HTMLDivElement>(selector)?.innerText || "";

          const getLinks = (
            selector: string,
          ): { name: string; link: string }[] =>
            [...row.querySelectorAll<HTMLAnchorElement>(selector)].map(
              (link) => ({
                name: link.innerText.trim(),
                link: link.href,
              }),
            );

          const result: ScrappedItemType = {
            reasons: stg.reasons,
            name: getData("[data-columnid=identifier]"),
            li:
              row.querySelector<HTMLAnchorElement>("[data-columnid=linkedin] a")
                ?.href || "",
            fb:
              row.querySelector<HTMLAnchorElement>("[data-columnid=facebook] a")
                ?.href || "",
            ws:
              row.querySelector<HTMLAnchorElement>("[data-columnid=website] a")
                ?.href || "",
            tw:
              row.querySelector<HTMLAnchorElement>("[data-columnid=twitter] a")
                ?.href || "",
            founderIds: getLinks("[data-columnid=founder_identifiers] a"),
            investorIds: getLinks("[data-columnid=investor_identifiers] a"),
            acquirerIds: getLinks("[data-columnid=acquirer_identifier] a"),
          };

          return result;
        },
        row,
        stage,
      );

      results.push(rowData);
    }

    log("checking for next page...");
    const nextBtn = await page.$(".page-button-next");
    if (!nextBtn) break;

    hasMore = await page.evaluate(
      (btn) => btn.getAttribute("aria-disabled") !== "true",
      nextBtn,
    );

    if (hasMore) {
      log("has more... clicking next");
      await nextBtn.click();

      // Wait for the first row to change
      const newFirstRowSelector =
        ".body-wrapper grid-row [data-columnid=identifier]";

      currentFirstRowName = await page.evaluate(
        (selector) =>
          document.querySelector<HTMLDivElement>(selector)?.innerText || "",
        newFirstRowSelector,
      );

      await page.waitForFunction(
        (selector, currentName) =>
          document.querySelector<HTMLDivElement>(selector)?.innerText !==
          currentName,
        { timeout: 5000 },
        newFirstRowSelector,
        currentFirstRowName,
      );

      log("waiting for content to load...");
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results;
}
