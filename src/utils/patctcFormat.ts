const LOCATION_PREFIX = "tại cột";

export const HANG_MUC_SUFFIX = ", bằng phương pháp thi công hotline, sử dụng găng cao su và xe gàu cách điện.";
export const SHORT_HOTLINE_SUFFIX = " bằng phương pháp Hotline.";

export function ensureBulletFormat(text: string): string {
  if (!text) return "";

  return text
    .split("\n")
    .map((line) => {
      let trimmed = line.trim();
      if (!trimmed) return "";
      if (!trimmed.startsWith("-")) trimmed = `- ${trimmed}`;
      else if (!trimmed.startsWith("- ")) trimmed = `- ${trimmed.slice(1).trim()}`;
      if (!trimmed.endsWith(".")) trimmed += ".";
      const afterDash = trimmed.slice(2);
      return `- ${afterDash.charAt(0).toUpperCase()}${afterDash.slice(1)}`;
    })
    .filter(Boolean)
    .join("\n");
}

export function toTitleCase(text: string): string {
  if (!text) return "";

  return text
    .toLowerCase()
    .split(" ")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export function cleanJobItem(text: string): string {
  if (!text) return "";

  let cleaned = text.replace(/, bằng phương pháp thi công hotline, sử dụng găng cao su và xe gàu cách điện\.?$/, "");
  cleaned = cleaned.replace(/ bằng phương pháp Hotline\.?$/, "");
  return cleaned.trim().replace(/\.+$/, "");
}

function getLocationText(cot: string, dz: string): string {
  const parts = [cot, dz].filter(Boolean);

  if (parts.length === 0) return "";
  if (cot && dz) return `${LOCATION_PREFIX} ${cot} ĐZ ${dz}`;
  if (cot) return `${LOCATION_PREFIX} ${cot}`;
  return `${LOCATION_PREFIX} ĐZ ${dz}`;
}

export function ensureLocation(item: string, cot: string, dz: string): string {
  const cleaned = cleanJobItem(item);
  const locationText = getLocationText(cot, dz);

  if (!cleaned || !locationText) return cleaned || item;
  if (cleaned.includes(locationText)) return cleaned;

  if (cleaned.includes(LOCATION_PREFIX)) {
    const index = cleaned.indexOf(LOCATION_PREFIX);
    const prefix = cleaned.substring(0, index).trim().replace(/,$/, "");
    return `${prefix}, ${locationText}`;
  }

  return `${cleaned}, ${locationText}`;
}

export function formatJobItem(text: string, cot: string, dz: string, suffix = HANG_MUC_SUFFIX): string {
  const withLocation = ensureLocation(text, cot, dz);

  if (!withLocation) return "";
  return `${withLocation}${suffix}`;
}
