import fs from "fs";
import path from "path";
import { log } from "../helper";

const sourceFolder = path.join(__dirname, `../../results/3_final`);
const targetFolder = path.join(__dirname, `../../../../packages/addon/src/db/`);

export const run = async () => {
  const files = fs.readdirSync(sourceFolder);

  for (const file of files) {
    const sourcePath = path.join(sourceFolder, file);
    const targetPath = path.join(targetFolder, file);

    fs.copyFileSync(sourcePath, targetPath);
    log(`Copied: ${sourcePath} -> ${targetPath}`);
  }
};
