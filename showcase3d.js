/* ============================================================
 * سوق بيع العقار المغربي — العرض ثلاثي الأبعاد (3D Showcase)
 * ------------------------------------------------------------
 * - بطاقة الـ hero التفاعلية + خانة «الهمزات بتجربة 3D»
 * - Vanilla JS بدون أي مكتبة خارجية
 * - البيانات حقيقية 100%: من LISTINGS (data/listings.js)
 * - الميلان يتبع المؤشر (فأرة) واللمس (pointer events)
 * - يحترم prefers-reduced-motion
 * ============================================================ */
(function () {
  "use strict";
  if (typeof LISTINGS === "undefined" || typeof SOUQ_CONFIG === "undefined") return;

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- أدوات ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function fmtPrice(n) {
    if (n == null || isNaN(n)) return "غير متوفر";
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " درهم";
  }
  function ppm(l) { return (l.price && l.area) ? l.price / l.area : null; }
  function medianOf(city) { return SOUQ_CONFIG.cityMedians[city] || null; }
  function dealPct(l) {
    var p = ppm(l), m = medianOf(l.city);
    if (p == null || m == null || p >= m) return null;
    return Math.round((m - p) / m * 100);
  }
  function firstPhoto(l) {
    if (l.photo_real && l.photos && l.photos.length) return l.photos[0];
    return null;
  }

  /* ---------- محرك الميلان ثلاثي الأبعاد ---------- */
  function makeTilt(card, maxDeg) {
    if (reduceMotion || !card) return;
    var stage = (card.closest && card.closest(".s3d-stage")) || card.parentElement;
    if (!stage) return;
    var max = maxDeg || 13;
    var rx = 0, ry = 0, trx = 0, try_ = 0, raf = null;

    function frame() {
      rx += (trx - rx) * 0.14;
      ry += (try_ - ry) * 0.14;
      card.style.transform =
        "rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg)";
      if (Math.abs(trx - rx) > 0.02 || Math.abs(try_ - ry) > 0.02) {
        raf = requestAnimationFrame(frame);
      } else {
        card.style.transform = "rotateX(0deg) rotateY(0deg)";
        raf = null;
      }
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }

    stage.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var px = (e.clientX - r.left) / r.width - 0.5;   /* -0.5 .. 0.5 */
      var py = (e.clientY - r.top) / r.height - 0.5;
      /* البطاقة "تنظر" نحو المؤشر */
      try_ = px * max * 2;
      trx = -py * max * 2 * 0.7;
      card.style.setProperty("--mx", ((px + 0.5) * 100).toFixed(1) + "%");
      card.style.setProperty("--my", ((py + 0.5) * 100).toFixed(1) + "%");
      kick();
    });
    stage.addEventListener("pointerleave", function () {
      trx = 0; try_ = 0;
      card.style.setProperty("--mx", "50%");
      card.style.setProperty("--my", "50%");
      kick();
    });
  }

  /* ---------- اختلاف المنظر للرقائق (chips) ---------- */
  function makeChipsParallax(stage, chipsEl, depth) {
    if (reduceMotion || !chipsEl) return;
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
    function frame() {
      cx += (tx - cx) * 0.1;
      cy += (ty - cy) * 0.1;
      chipsEl.style.transform =
        "translate3d(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px,0)";
      if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) {
        raf = requestAnimationFrame(frame);
      } else { raf = null; }
    }
    stage.addEventListener("pointermove", function (e) {
      var r = stage.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * -depth;
      ty = ((e.clientY - r.top) / r.height - 0.5) * -depth;
      if (!raf) raf = requestAnimationFrame(frame);
    });
    stage.addEventListener("pointerleave", function () {
      tx = 0; ty = 0;
      if (!raf) raf = requestAnimationFrame(frame);
    });
  }

  /* ---------- بناء بطاقة 3D ---------- */
  function cardHTML(l, opts) {
    var d = dealPct(l);
    var photo = firstPhoto(l);
    var tag = opts.tag || (d != null
      ? '<span class="s3d-tag">🔥 همزة −' + d + "%</span>"
      : (l.agency_direct ? '<span class="s3d-tag">🏠 من الوكالة مباشرة</span>' : ""));
    var meta = [l.city, l.neighborhood].filter(Boolean).join("، ");
    var specs = [];
    if (l.area) specs.push(l.area + " م²");
    if (l.rooms) specs.push(l.rooms + (l.rooms === 1 ? " غرفة" : l.rooms === 2 ? " غرفتان" : " غرف"));
    return (
      '<a class="s3d-card s3d-tilt" href="./property-' + esc(l.id) + '.html" aria-label="' + esc(l.title) + '">' +
        '<span class="s3d-photo">' +
          (photo
            ? '<img src="./' + esc(photo) + '" alt="' + esc(l.title) + '" loading="lazy">'
            : '<span class="s3d-nophoto">لا توجد صورة للعقار</span>') +
          '<span class="s3d-shine"></span>' + tag +
        "</span>" +
        '<span class="s3d-body">' +
          '<span class="s3d-title">' + esc(l.title) + "</span>" +
          '<span class="s3d-meta">' + esc(meta) + (specs.length ? " • " + esc(specs.join(" • ")) : "") + "</span>" +
          '<span class="s3d-price">' + esc(fmtPrice(l.price)) + "</span>" +
          (d != null ? '<span class="s3d-deal">أقل بـ' + d + "% من متوسط " + esc(l.city) + "</span>" : "") +
        "</span>" +
      "</a>"
    );
  }

  /* ---------- 1) بطاقة الـ Hero ---------- */
  (function heroShowcase() {
    var wrap = document.getElementById("heroCardWrap");
    var stage = document.getElementById("heroShowcase");
    if (!wrap || !stage) return;

    var featured =
      LISTINGS.find(function (l) {
        return l.agency_direct && l.status !== "unavailable" && firstPhoto(l);
      }) ||
      LISTINGS.filter(function (l) {
        return l.status !== "unavailable" && firstPhoto(l) && dealPct(l) != null;
      }).sort(function (a, b) { return dealPct(b) - dealPct(a); })[0] ||
      LISTINGS.find(function (l) { return firstPhoto(l); });

    if (!featured) { stage.style.display = "none"; return; }

    wrap.innerHTML = cardHTML(featured, { tag: '<span class="s3d-tag">✨ العقار المميز</span>' });
    var card = wrap.querySelector(".s3d-tilt");
    makeTilt(card, 12);

    /* رقائق عائمة حول البطاقة */
    var chipsEl = document.getElementById("heroChips");
    if (chipsEl) {
      var dealsCount = LISTINGS.filter(function (l) {
        return l.status !== "unavailable" && dealPct(l) != null;
      }).length;
      var citiesCount = {};
      LISTINGS.forEach(function (l) { if (l.status !== "unavailable") citiesCount[l.city] = 1; });
      var chips = [
        "🏠 " + SOUQ_CONFIG.agencyName,
        "🔥 " + dealsCount + " همزة",
        "📍 " + Object.keys(citiesCount).length + " مدن"
      ];
      chipsEl.innerHTML = chips.map(function (t, i) {
        return '<span class="s3d-chip s3d-chip-' + (i + 1) + '"><span class="s3d-chip-inner">' +
          esc(t) + "</span></span>";
      }).join("");
      makeChipsParallax(stage, chipsEl, 26);
    }
  })();

  /* ---------- 2) خانة «الهمزات بتجربة 3D» ---------- */
  (function gridShowcase() {
    var grid = document.getElementById("s3dGrid");
    if (!grid) return;
    var top = LISTINGS
      .filter(function (l) {
        return l.status !== "unavailable" && firstPhoto(l) && dealPct(l) != null;
      })
      .sort(function (a, b) { return dealPct(b) - dealPct(a); })
      .slice(0, 3);

    var section = document.getElementById("showcase3d");
    if (!top.length) { if (section) section.style.display = "none"; return; }

    grid.innerHTML = top.map(function (l) {
      return '<div class="s3d-stage"><div class="s3d-float">' + cardHTML(l, {}) + "</div></div>";
    }).join("");

    grid.querySelectorAll(".s3d-tilt").forEach(function (card) { makeTilt(card, 11); });
  })();
})();
