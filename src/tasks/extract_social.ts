import fs from "fs";
import path from "path";
import {
  APIEndpointDomains,
  API_ENDPOINT_RULE_LINKEDIN,
  API_ENDPOINT_RULE_FACEBOOK,
  API_ENDPOINT_RULE_TWITTER,
  API_ENDPOINT_RULE_INSTAGRAM,
  DBFileNames,
} from "@theWallProject/addonCommon";
import { APIScrapperFileDataSchema, ScrappedFileType } from "../types";
import { error, log, warn } from "../helper";

const extractSocialLinks = (data: ScrappedFileType) => {
  const linkedinFlagged: APIEndpointDomains = [];
  const facebookFlagged: APIEndpointDomains = [];
  const twitterFlagged: APIEndpointDomains = [];
  const instagramFlagged: APIEndpointDomains = [];

  const regexLinkedin = new RegExp(API_ENDPOINT_RULE_LINKEDIN.regex);
  const regexFacebook = new RegExp(API_ENDPOINT_RULE_FACEBOOK.regex);
  const regexTwitter = new RegExp(API_ENDPOINT_RULE_TWITTER.regex);
  const regexInstagram = new RegExp(API_ENDPOINT_RULE_INSTAGRAM.regex);

  // const namesMap: { [key: string]: boolean } = {};
  const websitesMap: { [key: string]: boolean } = {};
  const fbMap: { [key: string]: boolean } = {};
  const liMap: { [key: string]: boolean } = {};
  const twitterMap: { [key: string]: boolean } = {};
  const instagramMap: { [key: string]: boolean } = {};

  data.forEach((row) => {
    const { name, ws, li, fb, tw, ig, reasons, id } = row;

    // if (namesMap[name]) {
    //   error(`Duplicate name [social]: ${row.name}`);
    // } else {
    //   namesMap[row.name] = true;
    // }

    if (ws) {
      if (websitesMap[ws]) {
        error(`Duplicate website [social]: ${row.ws}`);
      } else {
        websitesMap[ws] = true;
      }
    }

    if (li && li !== "") {
      const results = regexLinkedin.exec(li);
      const result = results && results[1];

      if (result) {
        // log(`LinkedIn processing ${li} => ${result}`);

        if (liMap[result]) {
          error(`Duplicate LinkedIn [social]: ${result}`);
        } else {
          liMap[result] = true;
          linkedinFlagged.push({
            selector: result,
            name: name,
            id: row.id,
            reasons: reasons,
          });
        }
      } else {
        if (!(li.includes("/company-beta/") || li.includes("/in/"))) {
          warn(`LinkedIn processing ${li} had no result! [${result}]`);
        }
      }
    }

    if (fb && fb !== "") {
      const results = regexFacebook.exec(
        fb.replace("/pg/", "/").replace("/p/", "/"),
      );
      const result = results && results[1];

      if (result) {
        // log(`Facebook processing ${fb} => ${result}`);

        if (
          [
            "profile.php",
            "home.php",
            "groups",
            "pages",
            "search",
            "people",
            "share",
          ].includes(result)
        ) {
          // warn("skipping facebook group link for now");
        } else {
          if (fbMap[result]) {
            error(`Duplicate Facebook [social]: ${result}`);
          } else {
            fbMap[result] = true;
            facebookFlagged.push({
              id: id,
              selector: result,
              name: name,
              reasons: reasons,
            });
          }
        }
      } else {
        warn(`Facebook processing ${fb} had no result! [${result}]`);
      }
    }

    if (tw && tw !== "") {
      const results = regexTwitter.exec(tw);
      const result = results && results[1];

      if (result) {
        // log(`Twitter extracted ${tw} => ${result}`);
        if (
          ["home", "https:", "hashtag", "search", "intent"].includes(result)
        ) {
          return;
        }
        if (twitterMap[result]) {
          error(`Duplicate Twitter [social]: ${result}`);
        } else {
          twitterMap[result] = true;

          twitterFlagged.push({
            id: row.id,
            selector: result,
            name: row.name,
            reasons: row.reasons,
          });
        }
      } else {
        warn(`Twitter processing ${tw} had no result! [${result}]`);
      }
    }

    if (ig && ig !== "") {
      const results = regexInstagram.exec(ig);
      const result = results && results[1];

      if (result) {
        // log(`Instagram extracted ${insta} => ${result}`);
        if (
          ["explore", "accounts", "direct", "stories", "reels"].includes(result)
        ) {
          return;
        }
        if (instagramMap[result]) {
          error(`Duplicate Instagram [social]: ${result}`);
        } else {
          instagramMap[result] = true;

          instagramFlagged.push({
            id: row.id,
            selector: result,
            name: row.name,
            reasons: row.reasons,
          });
        }
      } else {
        warn(`Instagram processing ${ig} had no result! [${result}]`);
      }
    }
  });

  saveJsonToFile(
    linkedinFlagged.sort((a, b) => a.name.localeCompare(b.name)),
    path.join(
      __dirname,
      `../../results/3_networks/${DBFileNames.FLAGGED_LI_COMPANY}.json`,
    ),
  );

  saveJsonToFile(
    facebookFlagged.sort((a, b) => a.name.localeCompare(b.name)),
    path.join(
      __dirname,
      `../../results/3_networks/${DBFileNames.FLAGGED_FACEBOOK}.json`,
    ),
  );

  saveJsonToFile(
    twitterFlagged.sort((a, b) => a.name.localeCompare(b.name)),
    path.join(
      __dirname,
      `../../results/3_networks/${DBFileNames.FLAGGED_TWITTER}.json`,
    ),
  );

  saveJsonToFile(
    instagramFlagged.sort((a, b) => a.name.localeCompare(b.name)),
    path.join(
      __dirname,
      `../../results/3_networks/${DBFileNames.FLAGGED_INSTAGRAM}.json`,
    ),
  );

  log(`Wrote ${linkedinFlagged.length} li rows...`);
  log(`Wrote ${facebookFlagged.length} fb rows..`);
  log(`Wrote ${twitterFlagged.length} tw rows..`);
  log(`Wrote ${instagramFlagged.length} ig rows..`);
};

const saveJsonToFile = (data: unknown, outputFilePath: string) => {
  fs.writeFileSync(outputFilePath, JSON.stringify(data, null, 2), "utf-8");
  log(`Data successfully written to ${outputFilePath}`);
};

export async function run(merged: ScrappedFileType) {
  const tested = APIScrapperFileDataSchema.parse(merged);

  extractSocialLinks(tested);
}
