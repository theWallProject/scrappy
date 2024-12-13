import { error, log } from "./helper";
import { run as scrap } from "./tasks/1_scrap";
import { run as merge } from "./tasks/2_merge_results";
import { run as extractSocial } from "./tasks/3_extract_social";
import { run as extractFlagged } from "./tasks/4_extract_flagged";
import { run as copyToAddon } from "./tasks/5_copy_to_addon";
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
    await scrap();
  }

  log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 1: Merging...");
  const sorted = await merge();

  log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 2: Extracting Social Links...");
  await extractSocial(sorted);

  log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 3: Extracting Domains...");
  await extractFlagged(sorted);

  log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Step 4: Copy to Addon...");
  await copyToAddon();
};
// process.stdin.once("data", () => log("done"));
main();
