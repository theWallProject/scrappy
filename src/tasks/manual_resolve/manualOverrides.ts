import { ScrappedItemType } from "../../types";

// Allow arrays for link fields in overrides
type ManualOverrideFields = {
  ws?: string | string[];
  li?: string | string[];
  fb?: string | string[];
  tw?: string | string[];
} & Omit<Partial<ScrappedItemType>, "ws" | "li" | "fb" | "tw">;

export const manualOverrides: Record<
  string,
  | ManualOverrideFields
  | { _processed: true }
  | (ManualOverrideFields & { _processed: true })
  | (ManualOverrideFields & { urls?: string[] })
  | (ManualOverrideFields & { _processed: true; urls?: string[] })
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
  eToro: {
    fb: [
      "https://www.facebook.com/eToroDEofficial",
      "https://www.facebook.com/106007086252277",
      "https://www.facebook.com/183379648361597",
      "https://www.facebook.com/152479438248050",
    ],
    tw: [
      "https://x.com/eToroES",
      "https://x.com/eToroAr",
      "https://x.com/eToroItalia",
    ],
    ws: ["https://www.etoro.com", "https://etoropartners.com"],
    urls: [
      "https://www.tiktok.com/@etoro_official",
      "https://www.youtube.com/@etoro",
      "https://www.youtube.com/@eToroItalia",
      "https://www.youtube.com/@eToroAR",
      "https://www.youtube.com/@eToro_ES",
      "https://www.youtube.com/@eToroDE",
      "https://www.youtube.com/@etorofrance877",
      "https://www.youtube.com/eToroDeutsch",
      "https://www.threads.com/@etoro_official",
      "https://www.instagram.com/etoro_italia",
      "https://www.instagram.com/etoro_official",
      "https://apps.apple.com/us/developer/etoro/id491658374",
      "https://play.google.com/store/apps/developer?id=eToro&hl=de",
    ],
    _processed: true,
  },
};
