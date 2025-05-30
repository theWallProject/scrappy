/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

/**
 * Processes a JSON report file, removing rows where the 'result' field is equal to 200,
 * and overwrites the original file with the filtered data.
 *
 * @param {string} filePath - The path to the JSON file.
 * @returns {Promise<void>} - A promise that resolves when the processing is complete.
 */
async function filterReport(filePath) {
  try {
    // Read the JSON file
    const rawData = fs.readFileSync(filePath);
    const data = JSON.parse(rawData);

    // Lines to REMOVE
    const filteredData = data.filter((row) => {
      if (row.result === 200) {
        return false;
      }

      if (row.result === row.url) {
        return false;
      }

      if (typeof row.result === "string") {
        if (
          row.result.split("https://")[1] &&
          row.result.split("https://")[1] === row.url.split("https://www.")[1]
        ) {
          // console.log(
          //   row.result.split("https://")[1],
          //   row.url.split("https://www.")[1],
          // );
          return false;
        }
      }

      return true;

      // return  &&
      //   row.result !== row.url &&
      //   typeof row.result === "string"
      //   ? !row.result.startsWith("/")
      //   : true;
    });

    // Write the filtered data back to the original file, overwriting it
    fs.writeFileSync(filePath, JSON.stringify(filteredData, null, 2)); // Use null, 2 for pretty printing

    console.log("The JSON file was filtered and overwritten successfully");
  } catch (err) {
    console.error(err);
  }
}

// Example usage:
const filePath = path.join(__dirname, "../results/2_merged/report.json"); // Adjust the path as per your repo structure

filterReport(filePath).catch((err) => console.error(err));
