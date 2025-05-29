import { error, log } from "./helper";
import { run as scrap } from "./tasks/1_scrap";
import { run as genStatic } from "./tasks/2_inject_static";
import { run as genStaticBIT } from "./tasks/2_1_inject_buyIsraeliTech";
import { run as merge } from "./tasks/3_merge_results";
import { run as validate } from "./tasks/3_1_validate";
import { run as extractSocial } from "./tasks/4_extract_social";
import { run as extractFlagged } from "./tasks/5_extract_flagged";
import { run as copyToAddon } from "./tasks/6_copy_to_addon";
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
  const {
    shouldScrap,
    shouldGenStatic,
    shouldMerge,
    shouldValidate,
    shouldExtractSocial,
    shouldExtractFlagged,
    shouldCopyToAddon,
  } = await inquirer.prompt([
    {
      type: "confirm",
      name: "shouldScrap",
      message: "Scrap?",
    },
    {
      type: "confirm",
      name: "shouldGenStatic",
      message: "Generate Static files?",
    },
    {
      type: "confirm",
      name: "shouldMerge",
      message: "Merge files?",
    },
    {
      type: "confirm",
      name: "shouldValidate",
      message: "Validate URLs?",
    },
    {
      type: "confirm",
      name: "shouldExtractSocial",
      message: "Extract Social?",
    },
    {
      type: "confirm",
      name: "shouldExtractFlagged",
      message: "Extract Flagged?",
    },
    {
      type: "confirm",
      name: "shouldCopyToAddon",
      message: "Copy to Addon?",
    },
  ]);

  log({ shouldScrap });

  if (shouldScrap) {
    log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 1: Scraping...");
    await scrap();
  }

  if (shouldGenStatic) {
    log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 2: Generate Static...");
    await genStatic();
    await genStaticBIT();
  }

  if (shouldMerge) {
    log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 3: Merging...");
    const sorted = await merge();

    if (shouldValidate) {
      log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 3.1: Validating URLs...");
      await validate();
    }

    if (shouldExtractSocial) {
      log(
        ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 4: Extracting Social Links...",
      );
      await extractSocial(sorted);
    }

    if (shouldExtractFlagged) {
      log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 5: Extracting Domains...");
      await extractFlagged(sorted);
    }

    if (shouldCopyToAddon) {
      log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 6: Copy to Addon...");
      await copyToAddon();
    }
  }
};
// process.stdin.once("data", () => log("done"));
main();
