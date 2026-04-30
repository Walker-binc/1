import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import QRCode from "qrcode";

const baseUrl = process.env.CARD_BASE_URL || "https://card.company.com";
const outDir = resolve("business-cards");
const people = JSON.parse(await readFile(resolve("data/people.json"), "utf8"));

function escapeXml(value) {
  return String(value).replace(/[<>&'"]/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    "\"": "&quot;"
  })[char]);
}

function cardSvg(person, qr) {
  const pageUrl = `${baseUrl}/${person.slug}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1180" viewBox="0 0 720 1180">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#111214"/>
      <stop offset="0.55" stop-color="#1b1b1c"/>
      <stop offset="1" stop-color="#2f6f63"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000" flood-opacity=".32"/>
    </filter>
  </defs>
  <rect width="720" height="1180" fill="#ede5d7"/>
  <rect x="68" y="48" width="584" height="1084" rx="0" fill="url(#bg)" filter="url(#shadow)"/>
  <rect x="96" y="82" width="528" height="1016" fill="none" stroke="#caa45d" stroke-width="3"/>
  <rect x="218" y="128" width="284" height="284" rx="42" fill="#f8f2e7" transform="rotate(45 360 270)"/>
  <circle cx="360" cy="252" r="84" fill="#efc2a5"/>
  <path d="M277 256c5-78 45-118 94-116 54 3 86 46 78 124-54-36-105-37-172-8Z" fill="#24201d"/>
  <path d="M238 438c26-84 70-132 122-132s96 48 122 132H238Z" fill="#1f2630"/>
  <path d="M300 438l60-124 60 124H300Z" fill="#fff"/>
  <rect x="238" y="458" width="244" height="52" rx="0" fill="#f6dd93"/>
  <text x="360" y="493" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#191919">${escapeXml(person.name)}</text>
  <path d="M238 484h-54l26-22-26-22h54Z" fill="#e2c36f"/>
  <path d="M482 484h54l-26-22 26-22h-54Z" fill="#e2c36f"/>
  <text x="360" y="610" text-anchor="middle" font-family="Georgia, serif" font-size="56" font-weight="700" fill="#f4df9c">Trusted Advice</text>
  <text x="360" y="678" text-anchor="middle" font-family="Georgia, serif" font-size="56" font-weight="700" fill="#f4df9c">Local Service</text>
  <rect x="190" y="724" width="340" height="46" fill="#272522"/>
  <text x="360" y="755" text-anchor="middle" font-family="Arial, sans-serif" font-size="21" fill="#d8c28a">${escapeXml(person.title)} · ${escapeXml(person.region)}</text>
  <rect x="112" y="828" width="178" height="178" fill="#fff"/>
  <image x="122" y="838" width="158" height="158" href="${qr}"/>
  <text x="322" y="878" font-family="Arial, sans-serif" font-size="25" font-weight="700" fill="#fff">Scan to contact</text>
  <text x="322" y="918" font-family="Arial, sans-serif" font-size="23" fill="#f4df9c">${escapeXml(person.phone)}</text>
  <text x="322" y="954" font-family="Arial, sans-serif" font-size="20" fill="#cfc8b6">${escapeXml(person.email)}</text>
  <text x="322" y="990" font-family="Arial, sans-serif" font-size="18" fill="#9fa59d">${escapeXml(pageUrl)}</text>
  <text x="360" y="1060" text-anchor="middle" font-family="Arial, sans-serif" font-size="19" fill="#caa45d">Company Name Australia</text>
</svg>`;
}

await mkdir(outDir, { recursive: true });
for (const person of people) {
  const pageUrl = `${baseUrl}/${person.slug}`;
  const qr = await QRCode.toDataURL(pageUrl, { margin: 1, width: 360, color: { dark: "#111111", light: "#ffffff" } });
  await writeFile(resolve(outDir, `${person.slug}.svg`), cardSvg(person, qr), "utf8");
}
console.log(`Generated ${people.length} QR business cards in ${outDir}`);
