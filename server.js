import express from "express";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { networkInterfaces } from "node:os";
import QRCode from "qrcode";

const app = express();
const port = process.env.PORT || 4173;
const root = resolve(".");
const dataFile = resolve("data/people.json");
const statsFile = resolve("data/stats.json");
const configuredBaseUrl = String(process.env.CARD_BASE_URL || "").trim().replace(/\/$/, "");

app.use(express.json({ limit: "1mb" }));

async function readPeople() {
  return JSON.parse(await readFile(dataFile, "utf8"));
}

async function readStats() {
  try {
    return JSON.parse(await readFile(statsFile, "utf8"));
  } catch {
    return { profiles: {} };
  }
}

async function writeStats(stats) {
  await writeFile(statsFile, `${JSON.stringify(stats, null, 2)}\n`, "utf8");
}

function emptyProfileStats() {
  return {
    scans: 0,
    contactIntents: 0,
    callClicks: 0,
    emailClicks: 0,
    lastScanAt: "",
    lastContactAt: ""
  };
}

function ensureProfileStats(stats, slug) {
  if (!stats.profiles) stats.profiles = {};
  if (!stats.profiles[slug]) stats.profiles[slug] = emptyProfileStats();
  return stats.profiles[slug];
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

function buildPublicBaseUrl(req) {
  if (configuredBaseUrl) return configuredBaseUrl;

  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = forwardedProto ? String(forwardedProto).split(",")[0] : req.protocol;
  const host = req.get("host") || `localhost:${port}`;
  const [hostname, hostPort] = host.split(":");
  const resolvedHost = /^(localhost|127\.0\.0\.1)$/i.test(hostname)
    ? `${getPreferredLanAddress()}${hostPort ? `:${hostPort}` : ""}`
    : host;

  return `${protocol}://${resolvedHost}`;
}

function buildPublicUrl(req, slug) {
  return `${buildPublicBaseUrl(req)}/${slug}`;
}

function buildTrackedUrl(req, slug) {
  return `${buildPublicBaseUrl(req)}/r/${slug}`;
}

function serialiseStatsForAdmin(people, stats) {
  const profiles = people.map((person) => {
    const row = stats.profiles?.[person.slug] || emptyProfileStats();
    const conversionRate = row.scans > 0
      ? Number(((row.contactIntents / row.scans) * 100).toFixed(1))
      : 0;

    return {
      slug: person.slug,
      name: person.name,
      title: person.title,
      scans: row.scans,
      contactIntents: row.contactIntents,
      callClicks: row.callClicks,
      emailClicks: row.emailClicks,
      conversionRate,
      lastScanAt: row.lastScanAt,
      lastContactAt: row.lastContactAt
    };
  });

  const totals = profiles.reduce((acc, row) => {
    acc.scans += row.scans;
    acc.contactIntents += row.contactIntents;
    acc.callClicks += row.callClicks;
    acc.emailClicks += row.emailClicks;
    return acc;
  }, { scans: 0, contactIntents: 0, callClicks: 0, emailClicks: 0 });

  return {
    totals: {
      ...totals,
      conversionRate: totals.scans > 0
        ? Number(((totals.contactIntents / totals.scans) * 100).toFixed(1))
        : 0
    },
    profiles
  };
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

app.get("/api/stats", async (_req, res) => {
  const [people, stats] = await Promise.all([readPeople(), readStats()]);
  res.json(serialiseStatsForAdmin(people, stats));
});

app.post("/api/stats/contact", async (req, res) => {
  const slug = String(req.body?.slug || "").trim().toLowerCase();
  const type = String(req.body?.type || "").trim().toLowerCase();
  if (!slug || !["call", "email"].includes(type)) {
    return res.status(400).json({ ok: false });
  }

  const people = await readPeople();
  if (!people.some((person) => person.slug === slug)) {
    return res.status(404).json({ ok: false });
  }

  const stats = await readStats();
  const profile = ensureProfileStats(stats, slug);
  profile.contactIntents += 1;
  profile.lastContactAt = new Date().toISOString();
  if (type === "call") profile.callClicks += 1;
  if (type === "email") profile.emailClicks += 1;
  await writeStats(stats);
  res.json({ ok: true });
});

app.post("/api/stats/reset", async (_req, res) => {
  await writeStats({ profiles: {} });
  res.json({ ok: true });
});

app.get("/api/qr/:slug.svg", async (req, res, next) => {
  const { slug } = req.params;
  if (!/^[a-z0-9-]+$/.test(slug)) return next();

  const people = await readPeople();
  const person = people.find((entry) => entry.slug === slug);
  if (!person) return next();

  const svg = await QRCode.toString(buildTrackedUrl(req, slug), {
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

app.get("/r/:slug", async (req, res, next) => {
  const { slug } = req.params;
  if (!/^[a-z0-9-]+$/.test(slug)) return next();

  const people = await readPeople();
  if (!people.some((person) => person.slug === slug)) return next();

  const stats = await readStats();
  const profile = ensureProfileStats(stats, slug);
  profile.scans += 1;
  profile.lastScanAt = new Date().toISOString();
  await writeStats(stats);
  res.redirect(`/${slug}?src=qr`);
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
