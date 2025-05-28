import { ScrappedItemType } from "../../types";

export const manualDeleteNames = ["Corvid", "Tradeos", "ARJeannie Ltd."];
export const manualOverrides: [string, Partial<ScrappedItemType>][] = [
  ["Somite", { tw: "https://x.com/somiteai" }],
  ["Fiverr", { fb: "https://www.facebook.com/Fiverr" }],
  ["Maris Tech Ltd.", { fb: "https://www.facebook.com/MarisTech" }],
  ["Wix", { tw: "https://x.com/Wix" }],
  ["MyHeritage", { li: "https://www.linkedin.com/company/myheritage" }],
];

export const DUPLICATE_WEBSITES: {
  [key: string]: ScrappedItemType;
} = {
  ["www.goperfect.com"]: {
    name: "Perfect",
    li: "www.linkedin.com/company/goperfect",
    ws: "www.goperfect.com",
    tw: "twitter.com/Perfect_HQ",
    fb: "",
    reasons: ["f"],
    founderIds: [],
    acquirerIds: [],
    investorIds: [],
  },
  ["www.amobee.com"]: {
    name: "Amobee",
    li: "www.linkedin.com/company/amobee",
    ws: "www.amobee.com",
    tw: "twitter.com/amobee",
    fb: "www.facebook.com/Amobee",
    reasons: ["f"],
    founderIds: [],
    acquirerIds: [],
    investorIds: [],
  },
};
