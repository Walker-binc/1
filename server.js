import express from "express";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { networkInterfaces } from "node:os";
import QRCode from "qrcode";

const app = express();
const port = process.env.PORT || 4173;
const root = resolve(".");
const dataFile = resolve("data/people.json");
const configuredBaseUrl = String(process.env.CARD_BASE_URL || "").trim().replace(/\/$/, "");

app.use(express.json({ limit: "1mb" }));

async function readPeople() {
  return JSON.parse(await readFile(dataFile, "utf8"));
}

function normaliseCategories(categories) {
  if (!Array.isArray(categories)) return [];
  return categories
    .map((category) => String(category || "").trim())
    .filter(Boolean);
}

function cleanPerson(person) {
  const sections = Array.isArray(person.sections)
    ? person.sections
        .map((section, index) => ({
          id: String(section.id || `section-${index + 1}`).trim(),
          title: String(section.title || "").trim(),
          body: String(section.body || "").trim()
        }))
        .filter((section) => section.title || section.body)
    : [];

  return {
    slug: String(person.slug || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, ""),
    name: String(person.name || "").trim(),
    title: String(person.title || "").trim(),
    phone: String(person.phone || "").trim(),
    email: String(person.email || "").trim(),
    region: String(person.region || "").trim(),
    photo: String(person.photo || "").trim(),
    bio: String(person.bio || "").trim(),
    detailHeadline: String(person.detailHeadline || "").trim(),
    categories: normaliseCategories(person.categories),
    sections
  };
}

function getPreferredLanAddress() {
  const all = Object.values(networkInterfaces())
    .flat()
    .filter(Boolean)
    .filter((entry) => entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address)
    .filter((address) => !address.startsWith("169.254."));

  const preferred = [
    all.find((address) => address.startsWith("192.168.137.")),
    all.find((address) => address.startsWith("172.20.10.")),
    all.find((address) => address.startsWith("192.168.")),
    all.find((address) => address.startsWith("10.")),
    all.find((address) => address.startsWith("172."))
  ].find(Boolean);

  return preferred || all[0] || "localhost";
}

function buildPublicUrl(req, slug) {
  if (configuredBaseUrl) return `${configuredBaseUrl}/${slug}`;

  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = forwardedProto ? String(forwardedProto).split(",")[0] : req.protocol;
  const host = req.get("host") || `localhost:${port}`;
  const [hostname, hostPort] = host.split(":");
  const resolvedHost = /^(localhost|127\.0\.0\.1)$/i.test(hostname)
    ? `${getPreferredLanAddress()}${hostPort ? `:${hostPort}` : ""}`
    : host;

  return `${protocol}://${resolvedHost}/${slug}`;
}

app.get("/api/people", async (_req, res) => {
  res.json(await readPeople());
});

app.post("/api/people", async (req, res) => {
  const people = Array.isArray(req.body)
    ? req.body.map(cleanPerson).filter((person) => person.slug && person.name)
    : [];
  const unique = new Map(people.map((person) => [person.slug, person]));
  await writeFile(dataFile, `${JSON.stringify([...unique.values()], null, 2)}\n`, "utf8");
  res.json({ ok: true, count: unique.size });
});

app.get("/api/qr/:slug.svg", async (req, res, next) => {
  const { slug } = req.params;
  if (!/^[a-z0-9-]+$/.test(slug)) return next();

  const people = await readPeople();
  const person = people.find((entry) => entry.slug === slug);
  if (!person) return next();

  const svg = await QRCode.toString(buildPublicUrl(req, slug), {
    errorCorrectionLevel: "M",
    margin: 2,
    type: "svg",
    color: {
      dark: "#111111",
      light: "#ffffff"
    }
  });

  res.type("image/svg+xml").send(svg);
});

app.use(express.static(root, { extensions: ["html"] }));

app.get("/:slug", async (req, res, next) => {
  const { slug } = req.params;
  if (!/^[a-z0-9-]+$/.test(slug)) return next();
  const people = await readPeople();
  if (!people.some((person) => person.slug === slug)) return next();
  res.sendFile(resolve(root, "card.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Sales card system running at http://localhost:${port}`);
  if (configuredBaseUrl) {
    console.log(`QR base URL override: ${configuredBaseUrl}`);
  } else {
    console.log(`QR base URL auto-detected from LAN address: http://${getPreferredLanAddress()}:${port}`);
  }
});
