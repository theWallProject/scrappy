import { error, log } from "./helper";
import { run as validateUrls } from "./tasks/validate_urls";
import { execSync } from "child_process";

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
    // Still try to apply overrides even if validation had errors
  }

  // Run apply-overrides automatically after validation completes
  log("\n🔄 Automatically applying manual overrides to output files...");
  try {
    execSync("npm run apply-overrides", { stdio: "inherit" });
    log("✅ All files updated successfully!");
    process.exit(0);
  } catch (err) {
    error(
      "⚠️  Failed to apply overrides automatically. Run 'npm run apply-overrides' manually.",
    );
    process.exit(1);
  }
};

main();
