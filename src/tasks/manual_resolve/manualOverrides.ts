import { ScrappedItemType } from "../../types";

export const manualOverrides: Record<
  string,
  | Partial<ScrappedItemType>
  | { _processed: true }
  | (Partial<ScrappedItemType> & { _processed: true })
> = {
  "01 Founders": { li: "https://www.linkedin.com/school/01-founders/" },
  Fiverr: { fb: "https://www.facebook.com/Fiverr" },
  "Maris Tech Ltd.": { fb: "https://www.facebook.com/MarisTech" },
  "Metis Technologies": { fb: "", tw: "" },
  MyHeritage: { li: "https://www.linkedin.com/company/myheritage" },
  "Od Podcast": {
    ws: "",
    li: "https://www.linkedin.com/company/guykatsovichpodcast",
  },
  "Red Alert": { ws: "" },
  Somite: { tw: "https://x.com/somiteai" },
  "The Agro Exchange": { ws: "https://www.agrox.io" },
  Wix: { tw: "https://x.com/Wix" },
};
