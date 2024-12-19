import fs from "fs";
import path from "path";
import { ScrappedItemType, APIScrapperFileDataSchema } from "../types";
import { log, error, cleanWebsite } from "../helper";
import {
  manualDeleteNames,
  DUPLICATE_WEBSITES,
} from "./manual_resolve/duplicate";

const folderPath = path.join(__dirname, "../../results/1_batches");

const outputFilePath = path.join(
  __dirname,
  "../../results/2_merged/MERGED_RAW.json",
);

const loadJsonFiles = (folderPath: string) => {
  const files = fs
    .readdirSync(folderPath)
    .filter((file) => file.endsWith(".json"));

  let combinedArray: ScrappedItemType[] = [];

  files.forEach((file) => {
    const filePath = path.join(folderPath, file);
    const fileContent = fs.readFileSync(filePath, "utf-8");

    try {
      const parsedData = APIScrapperFileDataSchema.parse(
        JSON.parse(fileContent),
      );
      log(`File ${file} has ${parsedData.length} rows`);
      combinedArray = combinedArray.concat(parsedData);
    } catch (err) {
      error(`Error parsing file ${file}:`, err);
    }
  });

  const tmpArr: ScrappedItemType[] = [];
  const deDubeArray = combinedArray.flatMap((row) => {
    row.li = cleanWebsite(row.li);
    row.ws = cleanWebsite(row.ws);
    row.fb = cleanWebsite(row.fb);
    row.tw = cleanWebsite(row.tw);

    const { name, li, ws, fb, tw } = row;

    if (manualDeleteNames.includes(name)) return [];
    if (ws && DUPLICATE_WEBSITES[ws]) {
      return [];
    }
    // const dubNameWebsite = tmpArr.find(
    //   (row) => row.name === name && row.ws === ws,
    // );
    // const dubName = tmpArr.find((row) => row.name === name);
    const dubWebsite = tmpArr.find((row) => row.ws === ws && ws);
    const dubFb = tmpArr.find((row) => row.fb === fb && fb);
    const dubLi = tmpArr.find((row) => row.li === li && li);
    const dubTw = tmpArr.find((row) => row.tw === tw && tw);
    // const dubWebsite = tmpArr.find((row) => row.ws === ws);
    // const dubWebsite = tmpArr.find((row) => row.ws === ws);

    // if (dubNameWebsite) {
    //   error(`Duplicate name and website: ${row.name} ${row.ws}`, {
    //     li1: row.li,
    //     li2: dubNameWebsite.li,
    //     tw1: row.tw,
    //     tw2: dubNameWebsite.tw,
    //     reasons1: row.reasons,
    //     reasons2: dubNameWebsite.reasons,
    //   });
    //   return [];
    // } else

    // if (dubName) {
    //   error(`Duplicate name: ${row.name}`, {
    //     li1: row.li,
    //     li2: dubName.li,
    //     ws1: row.ws,
    //     ws2: dubName.ws,
    //     tw1: row.tw,
    //     tw2: dubName.tw,
    //     reasons1: row.reasons,
    //     reasons2: dubName.reasons,
    //   });
    //   return [];
    // } else
    if (dubWebsite) {
      error(`Duplicate website: ${row.ws}`, {
        nameIgnored: row.name,
        nameSaved: dubWebsite.name,
        liIgnored: row.li,
        liSaved: dubWebsite.li,
        fbIgnored: row.fb,
        fbSaved: dubWebsite.fb,
        twIgnored: row.tw,
        twSaved: dubWebsite.tw,
        reasonsIgnored: row.reasons,
        reasonsSaved: dubWebsite.reasons,
      });

      return [];
    } else if (dubFb) {
      error(`Duplicate Facebook: ${row.fb}`, {
        nameIgnored: row.name,
        nameSaved: dubFb.name,
        liIgnored: row.li,
        liSaved: dubFb.li,
        twIgnored: row.tw,
        twSaved: dubFb.tw,
        reasonsIgnored: row.reasons,
        reasonsSaved: dubFb.reasons,
      });
      return [];
    } else if (dubLi) {
      error(`Duplicate LinkedIn: ${row.li}`, {
        nameIgnored: row.name,
        nameSaved: dubLi.name,
        fbIgnored: row.fb,
        fbSaved: dubLi.fb,
        twIgnored: row.tw,
        twSaved: dubLi.tw,
        reasonsIgnored: row.reasons,
        reasonsSaved: dubLi.reasons,
      });
      return [];
    } else if (dubTw) {
      error(`Duplicate Twitter: ${row.tw}`, {
        nameIgnored: row.name,
        nameSaved: dubTw.name,
        fbIgnored: row.fb,
        fbSaved: dubTw.fb,
        twIgnored: row.tw,
        twSaved: dubTw.tw,
        reasonsIgnored: row.reasons,
        reasonsSaved: dubTw.reasons,
      });
      return [];
    } else {
      tmpArr.push(row);

      return [row];
    }
  });

  for (const website in DUPLICATE_WEBSITES) {
    deDubeArray.push(DUPLICATE_WEBSITES[website]);
  }

  const sortedArray = deDubeArray.sort((a, b) => a.name.localeCompare(b.name));

  saveJsonToFile(sortedArray, outputFilePath);
  log(`Wrote ${sortedArray.length} rows to ${outputFilePath}...`);

  return sortedArray;
};

const saveJsonToFile = (data: unknown, outputFilePath: string) => {
  fs.writeFileSync(outputFilePath, JSON.stringify(data, null, 2), "utf-8");
  log(`Data successfully written to ${outputFilePath}`);
};

export async function run() {
  return loadJsonFiles(folderPath);
}
