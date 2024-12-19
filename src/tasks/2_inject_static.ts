import fs from "fs";
import path from "path";
import { ScrappedFileType } from "../types";
import { log, cleanWebsite } from "../helper";
import { BDS } from "../static_data/BDS";

const outputFilePath = path.join(
  __dirname,
  "../../results/1_batches/STATIC.json",
);

const injectStaticRows = () => {
  const merged: ScrappedFileType = [];

  for (const item of BDS) {
    const { name, reasons, ws, li, fb, tw } = item;

    for (const website of ws) {
      const _website = cleanWebsite(website) as string;

      merged.push({
        name,
        reasons,
        ws: _website,
      });
    }

    if (li) {
      for (const linkedIn of li) {
        merged.push({
          name,
          reasons,
          li: cleanWebsite(linkedIn),
          ws: "",
        });
      }
    }

    if (fb) {
      for (const facebook of fb) {
        merged.push({
          name,
          reasons,
          fb: cleanWebsite(facebook),
          ws: "",
        });
      }
    }

    if (tw) {
      for (const twitter of tw) {
        merged.push({
          name,
          reasons,
          tw: cleanWebsite(twitter),
          ws: "",
        });
      }
    }
  }

  const sortedArray = merged.sort((a, b) => a.name.localeCompare(b.name));

  saveJsonToFile(sortedArray, outputFilePath);
  log(`Wrote ${sortedArray.length} rows to ${outputFilePath}...`);

  return sortedArray;
};

const saveJsonToFile = (data: unknown, outputFilePath: string) => {
  fs.writeFileSync(outputFilePath, JSON.stringify(data, null, 2), "utf-8");
  log(`Data successfully written to ${outputFilePath}`);
};

export async function run() {
  injectStaticRows();
}
