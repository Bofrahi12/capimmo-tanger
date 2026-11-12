/* ============================================================
   سوق بيع العقار المغربي — listing.js (صفحة تفاصيل العقار)
   تُقرأ البيانات من: data/listings.js (SOUQ_CONFIG + LISTINGS)
   ============================================================ */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const fmtPrice = (n) => {
    if (n == null || isNaN(n)) return "غير متوفر";
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " درهم";
  };
  const fmtNum = (n) => {
    if (n == null || isNaN(n)) return "–";
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };
  const ppm = (l) => (l.price && l.area ? l.price / l.area : null);
  const medianOf = (city) => SOUQ_CONFIG.cityMedians[city] || null;

  /* الوضع الداكن */
  const themeBtn = $("themeToggle");
  const applyThemeIcon = () => {
    const cur = document.documentElement.dataset.theme;
    const dark = cur === "dark" ||
      (!cur && window.matchMedia("(prefers-color-scheme: dark)").matches);
    themeBtn.textContent = dark ? "☀️" : "🌙";
  };
  try {
    const saved = localStorage.getItem("souq_theme");
    if (saved) document.documentElement.dataset.theme = saved;
  } catch (e) {}
  applyThemeIcon();
  themeBtn.addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme;
    const darkNow = cur === "dark" ||
      (!cur && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const next = darkNow ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("souq_theme", next); } catch (e) {}
    applyThemeIcon();
  });
  $("year").textContent = new Date().getFullYear();

  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* قراءة ?id= أو data-listing-id (الصفحات الثابتة) */
  let id = null;
  try { id = new URLSearchParams(location.search).get("id"); } catch (e) {}
  if (!id && document.body && document.body.dataset.listingId) {
    id = document.body.dataset.listingId;
  }
  const l = id ? LISTINGS.find((x) => x.id === id) : null;
  if (!l) {
    $("notFound").classList.add("show");
    $("detailContent").innerHTML = "";
    return;
  }

  document.title = `${l.title} | كاب إيمو طنجة`;

  const p = ppm(l), median = medianOf(l.city);
  const deal = p != null && median != null && p < median
    ? Math.round((median - p) / median * 100) : null;

  /* وصف تعريفي و og خاص بكل عقار */
  const setMeta = (attr, name, content) => {
    const sel = `meta[${attr}="${name}"]`;
    let tag = document.querySelector(sel);
    if (!tag) { tag = document.createElement("meta"); tag.setAttribute(attr, name); document.head.appendChild(tag); }
    tag.setAttribute("content", content);
  };
  const descText = `${l.title} — ${fmtPrice(l.price)}${p ? ` (${fmtNum(p)} درهم/م²)` : ""}. ${l.city}${l.neighborhood ? " — " + l.neighborhood : ""}. التفاصيل والصور على كاب إيمو طنجة.`;
  setMeta("name", "description", descText);
  setMeta("property", "og:title", `${l.title} | كاب إيمو طنجة`);
  setMeta("property", "og:description", descText);
  const firstPhoto = l.photos && l.photos.length && l.photo_real ? l.photos[0] : null;
  if (firstPhoto) setMeta("property", "og:image", new URL(firstPhoto, location.href).href);

  /* canonical فريد لكل عقار */
  let canon = document.querySelector('link[rel="canonical"]');
  if (!canon) { canon = document.createElement("link"); canon.setAttribute("rel", "canonical"); document.head.appendChild(canon); }
  canon.setAttribute("href", location.href.split("#")[0]);

  const favs = store.get("souq_favs", []);
  const isFav = favs.includes(l.id);

  /* المعرض */
  const realPhotos = l.photos && l.photos.length > 0 && l.photo_real ? l.photos : [];
  let galleryHTML;
  if (realPhotos.length) {
    galleryHTML = `
      <div class="gallery-main">
        <img id="gMain" src="${esc(realPhotos[0])}" alt="${esc(l.title)} — صورة 1">
      </div>
      ${realPhotos.length > 1 ? `
      <div class="gallery-thumbs" role="group" aria-label="صور العقار">
        ${realPhotos.map((src, i) => `
          <button type="button" data-thumb="${i}" aria-current="${i === 0}" aria-label="عرض الصورة ${i + 1}">
            <img src="${esc(src)}" alt="${esc(l.title)} — صورة ${i + 1}" loading="lazy">
          </button>`).join("")}
      </div>` : ""}`;
  } else {
    galleryHTML = `
      <div class="gallery-main">
        <div class="ph" role="img" aria-label="صورة توضيحية — لا توجد صورة للعقار" style="height:100%">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
            <path d="M3 11.5 12 4l9 7.5"/><path d="M5 10.5V20h14v-9.5"/><path d="M9 20v-6h6v6"/>
          </svg>
          <span>صورة توضيحية — لا توجد صورة للعقار</span>
        </div>
      </div>`;
  }

  /* شارات الحالة */
  const statusBadge = l.status === "review"
    ? '<span class="badge review">يحتاج إلى مراجعة</span>'
    : l.status === "unavailable"
      ? '<span class="badge unavailable">العرض غير متاح حالياً</span>' : "";

  const specs = [
    ["المساحة", l.area ? l.area + " م²" : null],
    ["عدد الغرف", l.rooms],
    ["الحمامات", l.bathrooms],
    ["الطابق", l.floor],
    ["النوع", l.type],
    ["الحالة", l.condition],
    ["مفروش", l.furnished == null ? null : l.furnished ? "نعم" : "لا"],
    ["موقف سيارة", l.parking == null ? null : l.parking ? "نعم" : "لا"],
    ["مصعد", l.elevator == null ? null : l.elevator ? "نعم" : "لا"],
    ["الملكية", l.ownership],
    ["قابل للتفاوض", l.negotiable == null ? null : l.negotiable ? "نعم" : "لا"]
  ].filter(([, v]) => v != null && v !== "");

  const waBase = "https://wa.me/212693981822";
  const pageUrl = location.href.split("#")[0];
  const waView = `${waBase}?text=${encodeURIComponent(
    `السلام عليكم، أرغب في معاينة هذا العقار:\n${l.title}\nالثمن: ${fmtPrice(l.price)}\nالموقع: ${l.city}${l.neighborhood ? " — " + l.neighborhood : ""}\nرابط التفاصيل: ${pageUrl}`
  )}`;
  const waAsk = `${waBase}?text=${encodeURIComponent(
    `السلام عليكم، عندي استفسار حول هذا العقار:\n${l.title} — ${fmtPrice(l.price)}\n${pageUrl}`
  )}`;

  /* عقارات مشابهة في نفس المدينة (روابط داخلية) */
  const similarHTML = (() => {
    const sim = LISTINGS.filter((x) => x.id !== l.id && x.city === l.city).slice(0, 3);
    if (!sim.length) return "";
    return `
  <section class="similar" aria-label="عقارات مشابهة">
    <h2>🏘️ عقارات مشابهة في ${esc(l.city)}</h2>
    <div class="similar-grid">
      ${sim.map((s) => {
        const sp = s.photos && s.photos.length && s.photo_real ? s.photos[0] : null;
        return `<a class="similar-card" href="./property-${esc(s.id)}.html">
          ${sp ? `<img src="${esc(sp)}" alt="${esc(s.title)}" loading="lazy">` : ""}
          <div class="similar-body">
            <p class="similar-title">${esc(s.title)}</p>
            <div class="similar-price">${fmtPrice(s.price)}</div>
          </div>
        </a>`;
      }).join("")}
    </div>
  </section>`;
  })();

  $("detailContent").innerHTML = `
  <div class="detail-layout">
    <div class="gallery" aria-label="صور العقار">${galleryHTML}</div>
    <div class="detail-info">
      <div class="card-badges" style="position:static;flex-direction:row;margin-bottom:10px">
        ${l.agency_direct ? '<span class="badge agency">إعلان الوكالة</span>' : ""}
        ${deal != null ? `<span class="badge deal">🔥 همزة −${deal}%</span>` : ""}
        ${l.verification === "page" ? '<span class="badge verify">تم التحقق من الرابط</span>' : ""}
        ${statusBadge}
      </div>
      <h1>${esc(l.title)}</h1>
      <div class="detail-price">${fmtPrice(l.price)}</div>
      <p style="color:var(--muted)">
        📍 ${esc(l.city)}${l.neighborhood ? " — " + esc(l.neighborhood) : ""}
        ${l.address && l.address !== l.neighborhood ? `<br><small>${esc(l.address)}</small>` : ""}
      </p>
      ${p ? `<p>📐 ثمن المتر المربع: <b>${fmtNum(p)} درهم/م²</b>${
        median ? (deal != null
          ? ` — <b style="color:var(--orange-dark)">أقل بـ${deal}% من متوسط ${esc(l.city)} (${fmtNum(median)} درهم/م²)</b>`
          : ` — متوسط ${esc(l.city)} المرجعي: ${fmtNum(median)} درهم/م²`)
        : ""}</p>` : ""}
      ${deal != null ? `<p class="note" style="margin-top:0">💡 «أقل بـ${deal}%» نسبة محسوبة حسابياً مقابل متوسط المدينة المرجعي — وليست تخفيضاً معلناً من البائع.</p>` : ""}

      <div class="spec-grid">
        ${specs.map(([k, v]) => `<div class="spec"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("")}
      </div>

      ${l.description ? `<h2>وصف العقار</h2><p>${esc(l.description)}</p>` : ""}

      ${l.features && l.features.length ? `
        <h2>المميزات</h2>
        <ul class="feature-list">${l.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}

      <div class="trust-box">
        <h2>🔍 الشفافية والتحقق</h2>
        <ul>
          <li>${l.verification === "page"
            ? `تم التحقق من رابط الإعلان${l.date_verified ? " بتاريخ " + esc(l.date_verified) : ""}`
            : l.verification === "index"
              ? "مرصود في نتائج البحث فقط — لم يُفتح رابط الإعلان"
              : "لم يتم التحقق من هذا الإعلان بعد"}</li>
          ${l.verification_note ? `<li>${esc(l.verification_note)}</li>` : ""}
          <li>المصدر: ${l.agency_direct ? "إعلان الوكالة مباشرة" : `مصدر خارجي${l.source_name ? " — " + esc(l.source_name) : ""}`}</li>
          ${l.seller_name ? `<li>البائع حسب المصدر: ${esc(l.seller_name)}</li>` : `<li>بيانات البائع: غير متوفرة في المصدر</li>`}
          ${l.source_url ? `<li><a href="${esc(l.source_url)}" target="_blank" rel="noopener nofollow">🔗 فتح الإعلان الأصلي في المصدر</a></li>` : "<li>لا يوجد رابط مصدر خارجي — التواصل مع الوكالة مباشرة</li>"}
          <li>⚠️ المعلومات قابلة للتغيير — تحقق من المصدر الأصلي قبل أي التزام. الموقع ليس بديلاً عن الموثق أو الفحص القانوني.</li>
        </ul>
      </div>

      <div class="detail-actions">
        <a class="btn btn-primary" href="${waView}" target="_blank" rel="noopener">📅 طلب معاينة عبر واتساب</a>
        <a class="btn btn-accent" href="tel:0693981822">📞 اتصال بالوكالة</a>
        <a class="btn btn-secondary" href="${waAsk}" target="_blank" rel="noopener">💬 استفسار واتساب</a>
        <button class="btn btn-ghost" type="button" id="shareBtn">🔗 مشاركة</button>
        <button class="icon-btn" type="button" id="favBtn" aria-pressed="${isFav}">${isFav ? "❤️" : "🤍"} مفضلة</button>
      </div>
      <p class="note">طلب المعاينة يفتح واتساب برسالة جاهزة — <strong>لن يُرسل أي شيء دون ضغطك على زر الإرسال</strong>.</p>
    </div>
  </div>
  ${similarHTML}`;

  /* JSON-LD */
  const ld = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": l.title,
    "description": l.description || l.title,
    "url": pageUrl,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": l.city,
      "streetAddress": l.address || undefined,
      "addressCountry": "MA"
    },
    "datePosted": l.date_added || undefined
  };
  if (l.price) {
    ld.offers = { "@type": "Offer", "price": l.price, "priceCurrency": "MAD" };
  }
  if (realPhotos.length) ld.image = realPhotos.map((s) => new URL(s, location.href).href);
  const ldEl = document.createElement("script");
  ldEl.type = "application/ld+json";
  ldEl.textContent = JSON.stringify(ld);
  document.head.appendChild(ldEl);

  /* تفاعلات المعرض */
  const gMain = $("gMain");
  if (gMain) {
    document.querySelectorAll("[data-thumb]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = parseInt(btn.getAttribute("data-thumb"), 10);
        gMain.src = realPhotos[i];
        gMain.alt = `${l.title} — صورة ${i + 1}`;
        document.querySelectorAll("[data-thumb]").forEach((b) =>
          b.setAttribute("aria-current", b === btn ? "true" : "false"));
      });
    });
  }

  /* مشاركة */
  $("shareBtn").addEventListener("click", async () => {
    const data = { title: l.title, text: `${l.title} — ${fmtPrice(l.price)}`, url: pageUrl };
    if (navigator.share) {
      try { await navigator.share(data); } catch (e) {}
    } else {
      try {
        await navigator.clipboard.writeText(pageUrl);
        alert("تم نسخ رابط العقار.");
      } catch (e) {
        prompt("انسخ رابط العقار:", pageUrl);
      }
    }
  });

  /* مفضلة */
  $("favBtn").addEventListener("click", () => {
    let f = store.get("souq_favs", []);
    const btn = $("favBtn");
    if (f.includes(l.id)) {
      f = f.filter((x) => x !== l.id);
      btn.setAttribute("aria-pressed", "false");
      btn.innerHTML = "🤍 مفضلة";
    } else {
      f = [...f, l.id];
      btn.setAttribute("aria-pressed", "true");
      btn.innerHTML = "❤️ مفضلة";
    }
    store.set("souq_favs", f);
  });
})();
