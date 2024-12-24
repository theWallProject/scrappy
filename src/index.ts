import { error, log } from "./helper";
import { run as scrap } from "./tasks/1_scrap";
import { run as genStatic } from "./tasks/2_inject_static";
import { run as merge } from "./tasks/3_merge_results";
import { run as extractSocial } from "./tasks/4_extract_social";
import { run as extractFlagged } from "./tasks/5_extract_flagged";
import { run as copyToAddon } from "./tasks/6_copy_to_addon";
import inquirer from "inquirer";

process.on("unhandledRejection", (reason) => {
  error("INDEX_ERROR Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  error("INDEX_ERROR Uncaught Exception:", err);
});

const main = async () => {
  // const terminalImage = await import("terminal-image");
  // console.log(await terminalImage.file("li.png", { width: 30 }));

  const {
    shouldScrap,
    shouldGenStatic,
    shouldMerge,
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
  }

  if (shouldMerge) {
    log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 3: Merging...");
    const sorted = await merge();
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
