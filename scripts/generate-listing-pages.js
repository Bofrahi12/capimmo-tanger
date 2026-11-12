#!/usr/bin/env node
/* ============================================================
 * مولّد صفحات العقارات الثابتة — SEO
 * ------------------------------------------------------------
 * يقرأ data/listings.js ويولّد صفحة HTML ثابتة لكل عقار:
 *   property-{id}.html
 * بوسوم <title> و meta description و og:* و canonical فريدة
 * مكتوبة في الـHTML الخام (تُقرأ من محركات البحث بلا JavaScript).
 *
 * يُشغَّل قبل كل نشر:  node scripts/generate-listing-pages.js
 * ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const BASE_URL = "https://capimmo-tanger.netlify.app";
const SITE_BRAND = "كاب إيمو طنجة";

/* ---------- أدوات ---------- */
const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const fmtPrice = (n) => {
  if (n == null || isNaN(n)) return "غير متوفر";
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " درهم";
};
const fmtNum = (n) => {
  if (n == null || isNaN(n)) return "–";
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};
const ppm = (l) => (l.price && l.area ? l.price / l.area : null);

/* نفس صيغة الوصف المستعملة في listing.js (لتتطابق الوسوم الثابتة والديناميكية) */
const descText = (l) => {
  const p = ppm(l);
  return `${l.title} — ${fmtPrice(l.price)}${p ? ` (${fmtNum(p)} درهم/م²)` : ""}. ${l.city}${l.neighborhood ? " — " + l.neighborhood : ""}. التفاصيل والصور على ${SITE_BRAND}.`;
};

const ogImage = (l) => {
  const first = l.photos && l.photos.length && l.photo_real ? l.photos[0] : null;
  return first ? `${BASE_URL}/${first}` : `${BASE_URL}/assets/og-cover.jpg`;
};

/* ---------- قراءة البيانات ---------- */
const dataSrc = fs.readFileSync(path.join(ROOT, "data", "listings.js"), "utf8");
const box = {};
vm.runInNewContext(dataSrc + "\nthis.__LISTINGS = LISTINGS;", box);
const LISTINGS = box.__LISTINGS;
if (!Array.isArray(LISTINGS) || !LISTINGS.length) {
  console.error("✖ لا توجد عقارات في data/listings.js");
  process.exit(1);
}
const ids = LISTINGS.map((l) => l.id);
const dupes = ids.filter((x, i) => ids.indexOf(x) !== i);
if (dupes.length) {
  console.error("✖ معرّفات مكررة:", dupes.join(", "));
  process.exit(1);
}
const bad = ids.filter((x) => !/^[a-z0-9-]+$/.test(x));
if (bad.length) {
  console.error("✖ معرّفات غير صالحة للروابط:", bad.join(", "));
  process.exit(1);
}

/* ---------- توليد الصفحات ---------- */
const template = fs.readFileSync(path.join(ROOT, "listing.html"), "utf8");
let generated = 0;

for (const l of LISTINGS) {
  const url = `${BASE_URL}/property-${l.id}.html`;
  const title = `${l.title} | ${SITE_BRAND}`;
  const desc = descText(l);

  let html = template;
  html = html.replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`);
  html = html.replace(
    /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${esc(desc)}">`
  );
  html = html.replace(
    /<link rel="canonical" href="[^"]*">/,
    `<link rel="canonical" href="${url}">`
  );
  html = html.replace(
    /<meta property="og:title" content="[^"]*">/,
    `<meta property="og:title" content="${esc(title)}">`
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*">/,
    `<meta property="og:description" content="${esc(desc)}">`
  );
  html = html.replace(
    /<meta property="og:image" content="[^"]*">/,
    `<meta property="og:image" content="${esc(ogImage(l))}">`
  );
  html = html.replace(
    /<meta property="og:image:alt" content="[^"]*">/,
    `<meta property="og:image:alt" content="${esc(l.title)}">`
  );
  /* og:url بعد og:image مباشرة */
  html = html.replace(
    /(<meta property="og:image:alt" content="[^"]*">)/,
    `$1\n  <meta property="og:url" content="${url}">`
  );
  /* معرّف العقار في body ليقرأه listing.js */
  html = html.replace("<body>", `<body data-listing-id="${esc(l.id)}">`);

  const out = path.join(ROOT, `property-${l.id}.html`);
  fs.writeFileSync(out, html, "utf8");
  generated++;
}

/* حذف صفحات ثابتة قديمة لعقارات لم تعد موجودة */
for (const f of fs.readdirSync(ROOT)) {
  const m = f.match(/^property-(.+)\.html$/);
  if (m && !ids.includes(m[1])) {
    fs.unlinkSync(path.join(ROOT, f));
    console.log("  حذف صفحة قديمة:", f);
  }
}

/* ---------- sitemap.xml ---------- */
const staticPages = ["index.html", "listing.html", "privacy.html", "terms.html"];
let sitemap =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
for (const p of staticPages) {
  sitemap += `  <url><loc>${BASE_URL}/${p}</loc><changefreq>weekly</changefreq></url>\n`;
}
for (const l of LISTINGS) {
  sitemap += `  <url><loc>${BASE_URL}/property-${l.id}.html</loc><changefreq>weekly</changefreq></url>\n`;
}
sitemap += "</urlset>\n";
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap, "utf8");

console.log(`✔ وُلّدت ${generated} صفحة ثابتة + sitemap.xml`);
