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

  const { answer } = await inquirer.prompt<{ answer: string }>([
    {
      type: "confirm",
      name: "answer",
      message: "Scrap?",
    },
  ]);
  log(answer);

  if (answer === "yes") {
    log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 1: Scraping...");
    await scrap();
  }
  log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 2: Generate Static...");
  await genStatic();

  log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 3: Merging...");
  const sorted = await merge();

  log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 4: Extracting Social Links...");
  await extractSocial(sorted);

  log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 5: Extracting Domains...");
  await extractFlagged(sorted);

  log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 6: Copy to Addon...");
  await copyToAddon();
};
// process.stdin.once("data", () => log("done"));
main();
