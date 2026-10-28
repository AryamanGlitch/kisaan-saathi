/**
 * Every official source the app relies on. Each record was opened/read on `verifiedOn`.
 * `documentDate` is the date of the document itself when known (old documents are shown with their date).
 * To add data: add the source here first, then reference its id. Tests fail on unknown ids.
 */
export interface SourceRef {
  id: string;
  title: string;
  publisher: string;
  url: string;
  documentDate: string | null;
  verifiedOn: string;
}

const V = "2026-10-26";

export const SOURCES = {
  "crida-dehradun": {
    id: "crida-dehradun",
    title: "Agriculture Contingency Plan for District Dehradun",
    publisher: "ICAR-CRIDA",
    url: "https://www.icar-crida.res.in/CP/Uttarkhand/UKD7-Dehradun-10.07.14.pdf",
    documentDate: "2014-07-10",
    verifiedOn: V,
  },
  "crida-haridwar": {
    id: "crida-haridwar",
    title: "Agriculture Contingency Plan for District Haridwar",
    publisher: "ICAR-CRIDA",
    url: "https://icar-crida.res.in/CP/Uttarkhand/UKD2-Haridwar-31.3.2013.pdf",
    documentDate: "2013-03-31",
    verifiedOn: "2026-10-27",
  },
  "crida-almora": {
    id: "crida-almora",
    title: "Agriculture Contingency Plan for District Almora",
    publisher: "ICAR-CRIDA",
    url: "https://icar-crida.res.in/CP/Uttarkhand/UKD1-Almora-31.03.2013.pdf",
    documentDate: "2013-03-31",
    verifiedOn: "2026-10-27",
  },
  "pmkisan-pib-faq": {
    id: "pmkisan-pib-faq",
    title: "PM-KISAN: frequently asked questions",
    publisher: "Press Information Bureau, Government of India",
    url: "https://static.pib.gov.in/WriteReadData/specificdocs/documents/2021/nov/doc2021112361.pdf",
    documentDate: "2021-11-23",
    verifiedOn: V,
  },
  "pmkisan-portal": {
    id: "pmkisan-portal",
    title: "PM-KISAN official portal",
    publisher: "Ministry of Agriculture & Farmers Welfare",
    url: "https://pmkisan.gov.in/",
    documentDate: null,
    verifiedOn: V,
  },
  "pmfby-pib-faq": {
    id: "pmfby-pib-faq",
    title: "PMFBY: frequently asked questions",
    publisher: "Press Information Bureau, Government of India",
    url: "https://static.pib.gov.in/WriteReadData/specificdocs/documents/2021/dec/doc202112701.pdf",
    documentDate: "2021-12-07",
    verifiedOn: V,
  },
  "pmfby-portal": {
    id: "pmfby-portal",
    title: "Pradhan Mantri Fasal Bima Yojana portal",
    publisher: "Ministry of Agriculture & Farmers Welfare",
    url: "https://pmfby.gov.in/",
    documentDate: null,
    verifiedOn: V,
  },
  "miss-pmindia-2025": {
    id: "miss-pmindia-2025",
    title: "Cabinet approves continuation of Modified Interest Subvention Scheme (MISS) for FY 2025-26",
    publisher: "PMIndia (Prime Minister's Office)",
    url: "https://www.pmindia.gov.in/en/news_updates/cabinet-approves-continuation-of-modified-interest-subvention-scheme-miss-for-fy-2025-26-with-existing-1-5-interest-subvention-is/",
    documentDate: "2025-05-28",
    verifiedOn: V,
  },
  "shc-pib-2025": {
    id: "shc-pib-2025",
    title: "Soil Health Card Scheme factsheet",
    publisher: "Press Information Bureau, Government of India",
    url: "https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/aug/doc2025816613501.pdf",
    documentDate: "2025-08-16",
    verifiedOn: V,
  },
  "shc-portal": {
    id: "shc-portal",
    title: "Soil Health Card portal",
    publisher: "Department of Agriculture & Farmers Welfare",
    url: "https://soilhealth.dac.gov.in/",
    documentDate: null,
    verifiedOn: V,
  },
  "upcl-contact": {
    id: "upcl-contact",
    title: "UPCL — Contact us",
    publisher: "Uttarakhand Power Corporation Ltd",
    url: "https://upcl.uk.gov.in/contact-us/",
    documentDate: null,
    verifiedOn: V,
  },
  "ujs-customer-care": {
    id: "ujs-customer-care",
    title: "Uttarakhand Jal Sansthan — Customer care",
    publisher: "Uttarakhand Jal Sansthan",
    url: "https://ujs.uk.gov.in/customer-care/",
    documentDate: null,
    verifiedOn: V,
  },
  "kcc-mkisan": {
    id: "kcc-mkisan",
    title: "About Kisan Call Centre",
    publisher: "mKisan, Government of India",
    url: "https://mkisan.gov.in/Home/AboutKCC",
    documentDate: null,
    verifiedOn: V,
  },
  "telemanas-vikaspedia": {
    id: "telemanas-vikaspedia",
    title: "Tele-MANAS",
    publisher: "Vikaspedia (Government of India)",
    url: "https://en.vikaspedia.in/viewcontent/health/mental-health/tele-manas",
    documentDate: null,
    verifiedOn: V,
  },
  "iiss-shc-limits": {
    id: "iiss-shc-limits",
    title: "Soil Health Card: a step towards sustainable agriculture, Table 1 (Harit Dhara 4(1), Jan–Jun 2021)",
    publisher: "ICAR-Indian Institute of Soil Science",
    url: "https://iiss.res.in/old/eMagazine/v4i1/12.pdf",
    documentDate: null,
    verifiedOn: V,
  },
  "shc-download": {
    id: "shc-download",
    title: "Soil Health Card portal: download your card",
    publisher: "Department of Agriculture & Farmers Welfare (NIC)",
    url: "https://www.soilhealth.dac.gov.in/HealthCard/HealthCard/HealthCardPublic",
    documentDate: null,
    verifiedOn: V,
  },
  "open-meteo": {
    id: "open-meteo",
    title: "Open-Meteo weather forecast",
    publisher: "Open-Meteo",
    url: "https://open-meteo.com/",
    documentDate: null,
    verifiedOn: V,
  },
} as const satisfies Record<string, SourceRef>;

export type SourceId = keyof typeof SOURCES;

export function getSource(id: SourceId): SourceRef {
  return SOURCES[id];
}

export function isSourceId(x: string): x is SourceId {
  return Object.prototype.hasOwnProperty.call(SOURCES, x);
}

/** Helplines used across the app (each tied to a verified source). */
export const HELPLINES = {
  kcc: { number: "18001801551", display: "1800-180-1551", sourceId: "kcc-mkisan" as SourceId },
  teleManas: { number: "14416", display: "14416", alt: "1-800-891-4416", sourceId: "telemanas-vikaspedia" as SourceId },
  emergency: { number: "112", display: "112" },
};
