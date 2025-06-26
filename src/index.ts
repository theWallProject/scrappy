import { error, log } from "./helper";
import { run as scrap } from "./tasks/scrap";
import { run as mergeCB } from "./tasks/merge_cb";
import { run as mergeStatic } from "./tasks/merge_static";
import { run as genStatic } from "./tasks/gen_static";
import { run as genStaticBIT } from "./tasks/gen_buyIsraeliTech";
import { run as validate } from "./tasks/validate";
import { run as extractSocial } from "./tasks/extract_social";
import { run as extractWebsites } from "./tasks/extract_websites";
import { run as copyToAddon } from "./tasks/copy_to_addon";
import inquirer from "inquirer";

process.on("unhandledRejection", (reason) => {
  error("INDEX_ERROR Unhandled Rejection:", reason);
  throw new Error("INDEX_ERROR Unhandled Rejection");
});

process.on("uncaughtException", (err) => {
  error("INDEX_ERROR Uncaught Exception:", err);
  throw new Error("INDEX_ERROR Uncaught Exception");
});

const main = async () => {
  const { shouldScrap, shouldValidate, shouldCopyToAddon } =
    await inquirer.prompt([
      {
        type: "confirm",
        name: "shouldScrap",
        message: "Scrap?",
      },
      {
        type: "confirm",
        name: "shouldValidate",
        message: "Validate URLs?",
      },
      {
        type: "confirm",
        name: "shouldCopyToAddon",
        message: "Copy to Addon?",
      },
    ]);

  if (shouldScrap) {
    log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 1: Scraping...");
    await scrap();
  }

  log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 2: Merging CB Results...");
  await mergeCB();

  log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 3: Prepare Manual Data...");
  await genStatic();

  log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 4: Prepare BuyIsTech Data...");
  await genStaticBIT();

  log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 5: Merging All Results...");
  const sorted = await mergeStatic();

  log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 6: Extracting Social Links...");
  await extractSocial(sorted);

  log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 7: Extracting Domains...");
  await extractWebsites(sorted);

  if (shouldCopyToAddon) {
    log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 8: Copy to Addon...");
    await copyToAddon();
  }

  if (shouldValidate) {
    log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 9: Validating URLs...");
    await validate();
  }
};
// process.stdin.once("data", () => log("done"));
main();
