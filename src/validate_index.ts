import { error } from "./helper";
import { run as validateUrls } from "./tasks/validate_urls";

process.on("unhandledRejection", (reason) => {
  error("VALIDATE_ERROR Unhandled Rejection:", reason);
  throw new Error("VALIDATE_ERROR Unhandled Rejection");
});

process.on("uncaughtException", (err) => {
  error("VALIDATE_ERROR Uncaught Exception:", err);
  throw new Error("VALIDATE_ERROR Uncaught Exception");
});

const main = async () => {
  await validateUrls();
};

main();

