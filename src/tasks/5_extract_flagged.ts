import fs from "fs";
import path from "path";
import { format } from "prettier";
import { APIEndpointDomains, DBFileNames } from "@theWallProject/addonCommon";
import { APIScrapperFileDataSchema, ScrappedFileType } from "../types";
import { error, log, warn } from "../helper";

const outputFilePath = path.join(
  __dirname,
  `../../results/3_final/${DBFileNames.FLAGGED}.json`,
);

export const run = async (merged: ScrappedFileType) => {
  const mergedDB = APIScrapperFileDataSchema.parse(merged);
  const websites: { [key: string]: boolean } = {};

  const db: APIEndpointDomains = mergedDB
    .filter((row) => row.ws && row.ws !== "")
    .filter((row) => {
      const website = row.ws;

      let shouldKeep = false;

      if (website) {
        const domain = website
          .replace("https://", "")
          .replace("http://", "")
          .replace("www.", "")
          .split("/")[0];

        shouldKeep = !(
          domain.includes("google.com") ||
          domain.includes("business.site") ||
          domain.endsWith(".il")
        );

        if (!shouldKeep) {
          warn(`Website excluded ${website} => ${domain}`);
        }
      }

      return shouldKeep;
    })
    .map((row) => {
      const website = row.ws;

      if (!website) {
        error(row);
        throw new Error("Website is empty");
      }

      const domain = website
        .replace("https://", "")
        .replace("http://", "")
        .replace("www.", "")
        .split("/")[0];

      // if (domain.split(".").length > 2) {
      //   // warn(`Website Domain extracted ${website} => ${domain}`);
      // } else {
      //   // log(`Website Domain extracted ${website} => ${domain}`);
      // }

      if (websites[website]) {
        error(`Duplicate website [flagged]: ${website}`);
      } else {
        websites[website] = true;
      }

      return {
        selector: domain,
        name: row.name,
        reasons: row.reasons,
      };
    });

  fs.writeFileSync(
    outputFilePath,
    await format(
      JSON.stringify(
        db.sort((a, b) => a.selector.localeCompare(b.selector)),
        null,
        2,
      ),
      { parser: "json" },
    ),
    "utf-8",
  );

  log(`Wrote ${mergedDB.length} rows...`);
};
