import fs from "fs";
import path from "path";
import { log } from "../helper";
import {
  APIEndpointDomainsResultSchema,
  DBFileNames,
  FinalDBFileType,
} from "@theWallProject/addonCommon";
import { z } from "zod";
import alternatives from "../../src/static_data/alternatives.json";

const folderPath = path.join(__dirname, "../../results/3_networks");

const outputFilePath = path.join(
  __dirname,
  `../../results/4_final/${DBFileNames.ALL}.json`,
);

const loadJsonFiles = (folderPath: string) => {
  const files = fs
    .readdirSync(folderPath)
    .filter((file) => file.endsWith(".json"));

  let combinedArray: FinalDBFileType[] = [];
  const idRecord: Record<string, FinalDBFileType> = {};

  files.forEach((file) => {
    const filePath = path.join(folderPath, file);
    const fileContent = fs.readFileSync(filePath, "utf-8");

    const parsedData = z
      .array(APIEndpointDomainsResultSchema)
      .parse(JSON.parse(fileContent));

    log(`File ${file} has ${parsedData.length} rows`);
    const key = keyFromFileName(file);

    for (const newRow of parsedData) {
      let testRow = idRecord[newRow.id];

      if (testRow) {
        idRecord[newRow.id] = {
          ...idRecord[newRow.id],
          [key]: newRow.selector,
        };
      } else {
        idRecord[newRow.id] = {
          id: newRow.id,
          r: newRow.reasons,
          n: newRow.name,
          // ws: "",
          [key]: newRow.selector,
          // c: newRow;
        };
      }
    }
  });

  log(`Combined data has ${Object.keys(idRecord).length} unique ids`);
  combinedArray = Object.values(idRecord);

  combinedArray = combinedArray.map((item) => {
    // @ts-expect-error -- ok here
    const alt = alternatives[item.id];

    if (alt) {
      item.alt = alt;
    }

    return item;
  });

  const sortedArray = combinedArray.sort((a, b) => a.n.localeCompare(b.n));

  saveJsonToFile(sortedArray, outputFilePath);
  log(`Wrote ${sortedArray.length} rows to ${outputFilePath}...`);
};

const saveJsonToFile = (data: unknown, outputFilePath: string) => {
  fs.writeFileSync(outputFilePath, JSON.stringify(data, null, 2), "utf-8");
  log(`Final data successfully written to ${outputFilePath}`);
};

export async function run() {
  return loadJsonFiles(folderPath);
}
function keyFromFileName(fileName: string): "ws" | "li" | "fb" | "tw" {
  switch (fileName.split(".")[0]) {
    case DBFileNames.FLAGGED_FACEBOOK:
      return "fb";
    case DBFileNames.FLAGGED_LI_COMPANY:
      return "li";
    case DBFileNames.FLAGGED_TWITTER:
      return "tw";
    case DBFileNames.WEBSITES:
      return "ws";

    default:
      throw new Error(`Unknown file name: ${fileName}`);
  }
}
