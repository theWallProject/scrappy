import { ScrappedItemType } from "../../types";

// Allow arrays for link fields in overrides
type ManualOverrideFields = {
  ws?: string | string[];
  li?: string | string[];
  fb?: string | string[];
  tw?: string | string[];
  ig?: string | string[];
  gh?: string | string[];
} & Omit<Partial<ScrappedItemType>, "ws" | "li" | "fb" | "tw" | "ig" | "gh">;

export const manualOverrides: Record<
  string,
  | ManualOverrideFields
  | { _processed: true }
  | (ManualOverrideFields & { _processed: true })
  | (ManualOverrideFields & { urls?: string[] })
  | (ManualOverrideFields & { _processed: true; urls?: string[] })
> = {
  "01 Founders": { li: "https://www.linkedin.com/school/01-founders/" },
  "AI21 Labs": {
    ws: ["https://www.ai21.com", "https://www.wordtune.com"],
    li: [
      "https://www.linkedin.com/company/ai21",
      "https://www.linkedin.com/showcase/wordtune",
    ],
    fb: [
      "https://www.facebook.com/AI21Labs",
      "https://www.facebook.com/wordtune",
    ],
    tw: ["https://x.com/AI21Labs", "https://x.com/wordtune"],
    ig: ["https://www.instagram.com/wordtune_official"],
    gh: [
      "https://github.com/AI21Labs",
      "https://github.com/AI21X",
      "https://github.com/mangate",
    ],
    urls: [
      "https://apps.apple.com/us/developer/ai21-labs-inc/id1628773286",
      "https://aws.amazon.com/bedrock/ai21",
      "https://chromewebstore.google.com/detail/wordtune-ai-paraphrasing/nllcnknpjnininklegdoijpljgdjkijc",
      "https://cloud.google.com/customers/ai21",
      "https://discord.com/app/invite-with-guild-onboarding/cKzg6GEAyB",
      "https://discord.com/invite/cKzg6GEAyB",
      "https://finance.yahoo.com/news/nvidia-google-back-ai21-labs-140222256.html",
      "https://huggingface.co/ai21labs",
      "https://microsoftedge.microsoft.com/addons/detail/wordtune-ai-paraphrasing/fgngodlaekdlibajobmkaklibdggemdd",
      "https://microsoftedge.microsoft.com/addons/detail/wordtune-aipowered-wri/fgngodlaekdlibajobmkaklibdggemdd",
      "https://www.linkedin.com/newsletters/6995001803318681600",
      "https://www.tiktok.com/@wordtune_official",
      "https://www.youtube.com/@ai21labs",
      "https://www.youtube.com/channel/UCDQlFKBK11jIxm4iVymoAtA",
      "https://www.youtube.com/watch?v=DyE0YkoFFEE",
    ],
    _processed: true,
  },
  Bluesky: {
    ws: ["https://bsky.social", "https://bsky.app"],
    gh: ["https://github.com/bluesky-social"],
    urls: [
      "https://apps.apple.com/de/developer/bluesky-pbllc/id1654243552",
      "https://play.google.com/store/apps/developer?id=Bluesky+PBLLC&hl=de",
    ],
    _processed: true,
  },
  Cellebrite: {
    li: [
      "https://www.linkedin.com/company/cellebrite",
      "http://www.linkedin.com/company/100045",
    ],
    fb: [
      "https://www.facebook.com/cellebritedigitalintelligence",
      "https://www.facebook.com/groups/1143744623008587",
      "https://www.facebook.com/groups/571246666951707",
      "https://www.facebook.com/groups/746270377207022",
    ],
    urls: [
      "https://www.linkedin.com/showcase/cellebrite-careers",
      "https://www.linkedin.com/showcase/cellebrite-enterprise-solutions",
      "https://cellebrite.my.site.com/PartnerCommunity/s/login/?language=en_US",
      "https://www.youtube.com/@cellebrite",
      "https://www.youtube.com/@cellebrite-deutsch",
      "https://www.youtube.com/@cellebrite-espanol",
      "https://www.youtube.com/@cellebrite-francais",
      "https://www.youtube.com/@cellebrite-portugues",
      "https://www.youtube.com/@companycellebrite",
      "https://www.youtube.com/@lifeatcellebrite7735",
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
  Empathy: {
    tw: ["https://x.com/empathy"],
    ig: ["https://www.instagram.com/empathy_com"],
    urls: [
      "https://apps.apple.com/us/developer/empathy/id1536395194",
      "https://play.google.com/store/apps/dev?id=7573398188169424467&gl=US",
      "https://sprout.link/empathy_com",
      "https://www.threads.com/@empathy_com",
    ],
    _processed: true,
  },
  Fiverr: { fb: "https://www.facebook.com/Fiverr" },
  "Maris Tech Ltd.": { fb: "https://www.facebook.com/MarisTech" },
  "Metis Technologies": { fb: "", tw: "" },
  MoonPay: {
    ig: ["https://www.instagram.com/moonpay"],
    urls: [
      "https://apps.apple.com/de/app/moonpay-krypto-kaufen/id1635031432",
      "https://play.google.com/store/apps/details?id=com.moonpay&hl=de",
      "https://www.threads.com/@moonpay",
      "https://www.youtube.com/channel/UC9hQtWpGGNaZ8yiwFsBkRBg",
    ],
    _processed: true,
  },
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
    ig: [
      "https://www.instagram.com/avride.ai",
      "https://www.instagram.com/tripleten.tech",
    ],
    gh: [
      "https://github.com/Toloka",
      "https://github.com/nebius",
      "https://github.com/tractoai",
    ],
    urls: [
      "https://clickhouse.com",
      "https://de.finance.yahoo.com/quote/NBIS/?guccounter=1&guce_referrer=aHR0cHM6Ly93d3cuZWNvc2lhLm9yZy8&guce_referrer_sig=AQAAALwBGTNYy8lfeJM_nDuQ2jR8jYNYblL9Mb2FqXEdZzSYEJj0izM8TuTNBsbJVEiB5Ioql2PjlWHRNrBh-4-_hj8YHUU7Giyt4ZXqb7NjJTAns9a4-tP6i_Vag4gmGRiJvEzbsL0vNvFz6C_aIZtwEXCcni4p9OyQvthXnb17kwh5",
      "https://de.finance.yahoo.com/quote/NBIS/news",
      "https://discord.com/login",
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
    ig: ["https://www.instagram.com/omadahealth/?hl=de"],
    urls: [
      "https://consent.yahoo.com/v2/collectConsent?sessionId=3_cc-session_5fdcb969-50cc-4b7f-ba83-69d67d8bf9a7",
      "https://play.google.com/store/apps/details?id=com.omada.prevent&hl=de",
      "https://www.youtube.com/c/omadahealth",
      "https://apps.apple.com/us/app/omada/id805711008",
      "https://www.youtube.com/@Omadahealth",
      "https://www.cnbc.com/quotes/OMDA",
      "https://vimeo.com/weareomadahealth",
      "https://job-boards.greenhouse.io/omadahealth",
    ],
    _processed: true,
  },
  "Protect AI": {
    gh: ["https://github.com/protectai"],
    urls: [
      "https://mlsecops.slack.com/signup#/domain-signup",
      "https://www.youtube.com/@protectai",
    ],
    _processed: true,
  },
  "Red Alert": { ws: "" },
  Semperis: {
    ws: ["https://www.hipconf.com", "https://www.semperis.com"],
    li: [
      "https://www.linkedin.com/company/hybrid-identity-protection-conference",
      "https://www.linkedin.com/company/semperis",
    ],
    fb: [
      "https://www.facebook.com/semperistech",
      "https://www.facebook.com/HIPConf",
    ],
    tw: ["https://x.com/hipconf", "https://x.com/semperistech"],
    ig: ["https://www.instagram.com/hipconf"],
    urls: [
      "https://hipconf.slack.com",
      "https://marketplace.microsoft.com/en-us/product/saas/semperis.semperis-hybrid-active-directory-protection",
      "https://www.threads.com/@semperistech",
      "https://www.youtube.com/@semperistech",
      "https://www.youtube.com/channel/UCycrWXhxOTaUQ0sidlyN9SA",
    ],
    _processed: true,
  },
  SentinelOne: {
    li: [
      "https://www.linkedin.com/company/sentinelone-dach",
      "https://www.linkedin.com/company/sentinelone-france",
      "https://www.linkedin.com/showcase/sentinelone-apj",
      "https://www.linkedin.com/company/sentinelone",
    ],
    gh: ["https://github.com/Sentinel-One"],
    urls: [
      "https://play.google.com/store/search?q=SentinelOne&c=apps&hl=de",
      "https://www.youtube.com/@Sentinelone-inc",
      "https://www.youtube.com/channel/UCm-vzfQy1lNglsXRBY6Vu5w",
    ],
    _processed: true,
  },
  Sentra: {
    gh: ["https://github.com/sentraio"],
    urls: [
      "https://www.facebook.com/profile.php?id=100091748057784",
      "https://www.youtube.com/@sentra_security",
    ],
    _processed: true,
  },
  Silverfort: {
    ig: ["https://www.instagram.com/life_at_silverfort"],
    gh: ["https://github.com/silverfort-open-source"],
    urls: [
      "https://apps.apple.com/de/developer/silverfort/id1227704144",
      "https://chromewebstore.google.com/detail/silverfort/pehheafegmblicfcnkpacblgfeabpgim",
      "https://play.google.com/store/apps/developer?id=Silverfort+Inc.&hl=gsw",
      "https://www.youtube.com/@silverfort",
    ],
    _processed: true,
  },
  Somite: { tw: "https://x.com/somiteai" },
  Speedata: {
    li: ["https://www.linkedin.com/company/speedataio"],
    fb: ["https://www.facebook.com/speedata.io"],
    gh: ["https://github.com/Speedata-io"],
    urls: ["https://www.youtube.com/@Speedata-io"],
    _processed: true,
  },
  "The Agro Exchange": { ws: "https://www.agrox.io" },
  Torq: {
    fb: ["https://www.facebook.com/torqhq"],
    tw: ["https://x.com/torq_io"],
    ig: ["https://www.instagram.com/torq_io"],
    gh: ["https://github.com/torqio"],
    urls: [
      "https://job-boards.greenhouse.io/torq",
      "https://www.tiktok.com/@torq.io",
      "https://www.youtube.com/@torq_io",
    ],
    _processed: true,
  },
  "VAST Data": {
    gh: ["https://github.com/vast-data"],
    urls: [
      "https://aws.amazon.com/marketplace/seller-profile?id=seller-rhponql53yee4",
      "https://www.carahsoft.com/vast",
      "https://www.youtube.com/vastdata",
    ],
    _processed: true,
  },
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
    ig: [
      "https://www.instagram.com/etoro_italia",
      "https://www.instagram.com/etoro_official",
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
      "https://apps.apple.com/us/developer/etoro/id491658374",
      "https://play.google.com/store/apps/developer?id=eToro&hl=de",
    ],
    _processed: true,
  },
  "monday.com": {
    ws: [
      "https://monday.com",
      "https://www.mondayert.org",
      "https://www.workcanvas.com",
    ],
    li: [
      "https://www.linkedin.com/company/mondaydotcom/",
      "https://www.linkedin.com/company/2525169",
    ],
    tw: ["https://x.com/mondaydotcom", "https://x.com/mondaysupport"],
    ig: [
      "https://www.instagram.com/mondaydotcom",
      "https://www.instagram.com/monday.com.design",
      "https://www.instagram.com/monday.com_engineering",
      "https://www.instagram.com/peopleofmonday",
    ],
    urls: [
      "https://www.facebook.com/groups/monday.community",
      "https://www.facebook.com/groups/183295877306250",
      "https://www.facebook.com/groups/1160555395113889",
      "https://www.facebook.com/groups/192373903899712",
      "https://www.facebook.com/groups/monday.com.forenterprise",
      "https://linktr.ee/mondaydotcom",
      "https://play.google.com/store/apps/developer?id=monday.com",
      "https://apps.apple.com/de/developer/monday-com-ltd/id964740028",
      "https://sprout.link/mondaydotcom",
      "https://www.reddit.com/r/mondaydotcom",
      "https://www.threads.com/@mondaydotcom",
      "https://www.tiktok.com/@mondayinsights",
      "https://www.youtube.com/@mondaydotcom",
      "https://www.youtube.com/@mastering-monday",
      "https://www.youtube.com/@mondayappdeveloper",
      "https://www.youtube.com/@tryvechannel",
      "https://www.youtube.com/channel/UCA9UvBiKHly15rN8u_Km3BQ",
      "https://www.linkedin.com/products/mondaydotcom-monday-sales-crm",
      "https://www.linkedin.com/products/mondaydotcom-monday-dev",
      "https://www.linkedin.com/products/mondaydotcom-mondaycom",
    ],
    _processed: true,
  },
};
