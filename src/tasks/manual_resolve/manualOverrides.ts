import { ScrappedItemType } from "../../types";

export const manualOverrides: [string, Partial<ScrappedItemType>][] = [
  ["Somite", { tw: "https://x.com/somiteai" }],
  ["Fiverr", { fb: "https://www.facebook.com/Fiverr" }],
  ["Maris Tech Ltd.", { fb: "https://www.facebook.com/MarisTech" }],
  ["Wix", { tw: "https://x.com/Wix" }],
  ["MyHeritage", { li: "https://www.linkedin.com/company/myheritage" }],
  ["Red Alert", { ws: "" }],
  ["The Agro Exchange", { ws: "https://www.agrox.io" }],
  [
    "Od Podcast",
    { li: "https://www.linkedin.com/company/guykatsovichpodcast", ws: "" },
  ],
  ["Metis Technologies", { tw: "", fb: "" }],
  ["01 Founders", { li: "https://www.linkedin.com/school/01-founders/" }],
];
