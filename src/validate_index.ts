import { error, log } from "./helper";
import { run as validateUrls } from "./tasks/validate_urls";
import { runUpdateSteps } from "./index";

process.on("unhandledRejection", (reason) => {
  error("VALIDATE_ERROR Unhandled Rejection:", reason);
  throw new Error("VALIDATE_ERROR Unhandled Rejection");
});

process.on("uncaughtException", (err) => {
  error("VALIDATE_ERROR Uncaught Exception:", err);
  throw new Error("VALIDATE_ERROR Uncaught Exception");
});

const main = async () => {
  try {
    await validateUrls();
  } catch (err) {
    error("Validation error:", err);
    throw err;
  }
  
  // Note: validateUrls() calls process.exit(0) at the end, so this code won't run
  // unless we handle the exit. But validateUrls() already calls runUpdateSteps()
  // internally after processing each item, so manual overrides are already applied.
  // This is kept as documentation that overrides are applied automatically.
};

main();

