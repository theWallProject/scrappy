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
  Bluesky: {
    ws: ["https://bsky.social", "https://bsky.app"],
    urls: [
      "https://apps.apple.com/de/developer/bluesky-pbllc/id1654243552",
      "https://github.com/bluesky-social",
      "https://play.google.com/store/apps/developer?id=Bluesky+PBLLC&hl=de",
    ],
    _processed: true,
  },
  Cyera: {
    ws: "https://www.cyera.com",
    urls: [
      "https://marketplace.microsoft.com/de-de/product/web-apps/cyera1658314682323.cyera_cloud_data_security?tab=overview",
      "https://www.cyera.com/careers",
      "https://www.elastic.co/docs/reference/integrations/cyera",
      "https://www.youtube.com/@CyeraSecurity",
      "https://www.youtube.com/channel/UCQZhCZIe6xRDjCkfzzwPBCg",
    ],
    _processed: true,
  },
  Fiverr: { fb: "https://www.facebook.com/Fiverr" },
  "Maris Tech Ltd.": { fb: "https://www.facebook.com/MarisTech" },
  "Metis Technologies": { fb: "", tw: "" },
  MyHeritage: { li: "https://www.linkedin.com/company/myheritage" },
  "Nebius Group": {
    ws: "https://nebius.com/about",
    li: [
      "https://www.linkedin.com/company/avrideai",
      "https://www.linkedin.com/company/nebius",
      "https://www.linkedin.com/company/toloka",
      "https://www.linkedin.com/company/tractoai",
    ],
    fb: [
      "https://www.facebook.com/globaltoloka",
      "https://www.facebook.com/nebiusofficial",
      "https://www.facebook.com/tripleten.tech",
    ],
    tw: [
      "https://x.com/TripleTenTech",
      "https://x.com/avrideai",
      "https://x.com/nebiusai",
      "https://x.com/tolokaai",
      "https://x.com/tractoai",
    ],
    urls: [
      "https://clickhouse.com",
      "https://de.finance.yahoo.com/quote/NBIS/?guccounter=1&guce_referrer=aHR0cHM6Ly93d3cuZWNvc2lhLm9yZy8&guce_referrer_sig=AQAAALwBGTNYy8lfeJM_nDuQ2jR8jYNYblL9Mb2FqXEdZzSYEJj0izM8TuTNBsbJVEiB5Ioql2PjlWHRNrBh-4-_hj8YHUU7Giyt4ZXqb7NjJTAns9a4-tP6i_Vag4gmGRiJvEzbsL0vNvFz6C_aIZtwEXCcni4p9OyQvthXnb17kwh5",
      "https://de.finance.yahoo.com/quote/NBIS/news",
      "https://discord.com/login",
      "https://github.com/Toloka/toloka-kit#toloka-kit",
      "https://github.com/nebius",
      "https://github.com/nebius/nebius-solutions-library",
      "https://github.com/tractoai",
      "https://linktr.ee/TripleTen",
      "https://linktr.ee/TripleTen.Tech",
      "https://medium.com/nebius",
      "https://open.spotify.com/user/31wd6uyi4z7s3no2ll2anlssxplq?utm_campaign=Spotify&utm_medium=Organic&utm_source=Linktree&utm_term=SocialMedia&utm_content=Music",
      "https://podcasts.apple.com/us/podcast/techstart/id1711188418",
      "https://toloka.ai",
      "https://tracto.ai/?_gl=1*etrccq*_ga*MTQwOTA1MzcyNS4xNzYyMDUyNjM1*_ga_DHKV2ZED15*czE3NjIwNTI2MzQkbzEkZzEkdDE3NjIwNTI3NDMkajMyJGwwJGgxNjkyMTI5MzU2*_ga_RC5DG41GHF*czE3NjIwNTI2MzUkbzEkZzEkdDE3NjIwNTI3NDMkajM1JGwwJGgw*_gcl_au*MTcyNTEwMjE5Ni4xNzYyMDUyNjU1",
      "https://tripleten.com",
      "https://www.avride.ai",
      "https://www.google.com/search?q=Nebius+Group+N.V.&rlz=1C1MMCH_enDE1105DE1105&sourceid=chrome&ie=UTF-8&sei=FssGadmOBrmH7NYPu4iEqAQ",
      "https://www.instagram.com/avride.ai",
      "https://www.instagram.com/tripleten.tech",
      "https://www.linkedin.com/school/tripleten",
      "https://www.threads.com/@tripleten.tech?xmt=AQF0i0ywc_hD3hJ_6C0u9FO2-PnCORMKZmpPswDPZFmpxXU",
      "https://www.tiktok.com/@tripleten.tech",
      "https://www.tiktok.com/@tripleten.tech?_t=8dABuoZ4By2&_r=1",
      "https://www.youtube.com",
      "https://www.youtube.com/@TripleTenTech",
      "https://www.youtube.com/@nebiusofficial",
      "https://www.youtube.com/channel/UCGvsgFPVyOwuN8aJJbMem9A",
    ],
    _processed: true,
  },
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
    ws: ["https://www.etoro.com", "https://etoropartners.com"],
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
