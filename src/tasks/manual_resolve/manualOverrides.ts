import { ScrappedItemType } from "../../types";

export const manualOverrides: Record<
  string,
  | Partial<ScrappedItemType>
  | { _processed: true }
  | (Partial<ScrappedItemType> & { _processed: true })
  | (Partial<ScrappedItemType> & { urls?: string[] })
  | (Partial<ScrappedItemType> & { _processed: true; urls?: string[] })
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
  "Omada Health": {
    urls: [
      "https://consent.yahoo.com/v2/collectConsent?sessionId=3_cc-session_5fdcb969-50cc-4b7f-ba83-69d67d8bf9a7",
      "https://play.google.com/store/apps/details?id=com.omada.prevent&hl=de",
      "https://www.youtube.com/c/omadahealth",
      "https://www.instagram.com/omadahealth/?hl=de",
      "https://apps.apple.com/us/app/omada/id805711008",
      "https://www.youtube.com/@Omadahealth",
      "https://www.cnbc.com/quotes/OMDA",
      "https://vimeo.com/weareomadahealth",
      "https://job-boards.greenhouse.io/omadahealth",
    ],
    _processed: true,
  },
  "Red Alert": { ws: "" },
  Somite: { tw: "https://x.com/somiteai" },
  "The Agro Exchange": { ws: "https://www.agrox.io" },
  Wix: { tw: "https://x.com/Wix" },
};
