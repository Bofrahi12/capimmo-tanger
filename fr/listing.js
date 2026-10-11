/* Cap Immo Tanger — version française (généré par scripts/build-fr-site.js) */
/* ============================================================
   Cap Immo Tanger — listing.js (صفحة تفاصيل Bien)
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
    if (n == null || isNaN(n)) return "Non disponible";
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " DH";
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

  document.title = `${l.title} | Cap Immo Tanger`;

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
  const descText = `${l.title} — ${fmtPrice(l.price)}${p ? ` (${fmtNum(p)} DH/m²)` : ""}. ${l.city}${l.neighborhood ? " — " + l.neighborhood : ""}. Détails et photos sur Cap Immo Tanger.`;
  setMeta("name", "description", descText);
  setMeta("property", "og:title", `${l.title} | Cap Immo Tanger`);
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
  // 🎨 Images illustratives مولّدة (ليست Photos du bien الحقيقي) — تُعرض مع شارة واضحة
  const aiPhotos = l.photos_ai && l.photos && l.photos.length > 0 ? l.photos : [];
  const galleryPhotos = realPhotos.length ? realPhotos : aiPhotos;
  const aiNotice = aiPhotos.length && !realPhotos.length ? `
      <p class="ai-notice" role="note">🎨 <strong>Images illustratives :</strong> Images générées par IA à titre purement illustratif — ce ne sont pas les vraies photos du bien. Demandez les vraies photos à l’agence via WhatsApp avant la visite.</p>` : "";
  let galleryHTML;
  if (galleryPhotos.length) {
    galleryHTML = `
      <div class="gallery-main">
        <img id="gMain" src="${esc(galleryPhotos[0])}" alt="${esc(l.title)} — Photo 1">
      </div>
      ${galleryPhotos.length > 1 ? `
      <div class="gallery-thumbs" role="group" aria-label="Photos du bien">
        ${galleryPhotos.map((src, i) => `
          <button type="button" data-thumb="${i}" aria-current="${i === 0}" aria-label="Voir la photo ${i + 1}">
            <img src="${esc(src)}" alt="${esc(l.title)} — Photo ${i + 1}" loading="lazy">
          </button>`).join("")}
      </div>` : ""}${aiNotice}`;
  } else {
    galleryHTML = `
      <div class="gallery-main">
        <div class="ph" role="img" aria-label="Image illustrative — aucune photo du bien" style="height:100%">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
            <path d="M3 11.5 12 4l9 7.5"/><path d="M5 10.5V20h14v-9.5"/><path d="M9 20v-6h6v6"/>
          </svg>
          <span>Image illustrative — aucune photo du bien</span>
        </div>
      </div>`;
  }

  /* شارات État */
  const statusBadge = l.status === "review"
    ? '<span class="badge review">À vérifier</span>'
    : l.status === "unavailable"
      ? '<span class="badge unavailable">Offre actuellement indisponible</span>' : "";

  const specs = [
    ["Surface", l.area ? l.area + " م²" : null],
    ["Nombre de chambres", l.rooms],
    ["Salles de bain", l.bathrooms],
    ["Étage", l.floor],
    ["Type", l.type],
    ["État", l.condition],
    ["Meublé", l.furnished == null ? null : l.furnished ? "Oui" : "Non"],
    ["Parking", l.parking == null ? null : l.parking ? "Oui" : "Non"],
    ["Ascenseur", l.elevator == null ? null : l.elevator ? "Oui" : "Non"],
    ["Titre foncier", l.ownership],
    ["Négociable", l.negotiable == null ? null : l.negotiable ? "Oui" : "Non"]
  ].filter(([, v]) => v != null && v !== "");

  const waBase = "https://wa.me/212693981822";
  const pageUrl = location.href.split("#")[0];
  const waView = `${waBase}?text=${encodeURIComponent(
    `Bonjour, je souhaite visiter ce bien:\n${l.title}\nPrix: ${fmtPrice(l.price)}\nEmplacement: ${l.city}${l.neighborhood ? " — " + l.neighborhood : ""}\nLien détails : ${pageUrl}`
  )}`;
  const waAsk = `${waBase}?text=${encodeURIComponent(
    `Bonjour, j’ai une question sur ce bien:\n${l.title} — ${fmtPrice(l.price)}\n${pageUrl}`
  )}`;
  const mailAsk = `mailto:mounir.boufrahi90@gmail.com?subject=${encodeURIComponent(
    `Question sur un bien: ${l.title}`
  )}&body=${encodeURIComponent(
    `Bonjour,\nJ’ai une question sur ce bien:\n${l.title}\nPrix: ${fmtPrice(l.price)}\nLien détails : ${pageUrl}`
  )}`;

  /* Biens similaires à نفس Ville (روابط داخلية) */
  const similarHTML = (() => {
    const sim = LISTINGS.filter((x) => !x.hidden && x.id !== l.id && x.city === l.city).slice(0, 3);
    if (!sim.length) return "";
    return `
  <section class="similar" aria-label="Biens similaires">
    <h2>🏘️ Biens similaires à ${esc(l.city)}</h2>
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
    <div class="gallery" aria-label="Photos du bien">${galleryHTML}</div>
    <div class="detail-info">
      <div class="card-badges" style="position:static;flex-direction:row;margin-bottom:10px">
        ${l.agency_direct ? '<span class="badge agency">Annonce de l’agence</span>' : ""}
        ${deal != null ? `<span class="badge deal">🔥 Bonne affaire −${deal}%</span>` : ""}
        ${l.verification === "page" ? '<span class="badge verify">Lien vérifié</span>' : ""}
        ${statusBadge}
      </div>
      <h1>${esc(l.title)}</h1>
      <div class="detail-price">${fmtPrice(l.price)}</div>
      <p style="color:var(--muted)">
        📍 ${esc(l.city)}${l.neighborhood ? " — " + esc(l.neighborhood) : ""}
        ${l.address && l.address !== l.neighborhood ? `<br><small>${esc(l.address)}</small>` : ""}
      </p>
      ${p ? `<p>📐 Prix du m²: <b>${fmtNum(p)} DH/m²</b>${
        median ? (deal != null
          ? ` — <b style="color:var(--orange-dark)">${deal}% sous la moyenne de ${esc(l.city)} (${fmtNum(median)} DH/m²)</b>`
          : ` — Moyenne de référence ${esc(l.city)}: ${fmtNum(median)} DH/m²`)
        : ""}</p>` : ""}
      ${deal != null ? `<p class="note" style="margin-top:0">💡 «${deal}%» Pourcentage calculé par rapport à la moyenne de référence de la ville — et non une remise annoncée par le vendeur.</p>` : ""}

      <div class="spec-grid">
        ${specs.map(([k, v]) => `<div class="spec"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("")}
      </div>

      ${l.description ? `<h2>Description du bien</h2><p>${esc(l.description)}</p>` : ""}

      ${l.features && l.features.length ? `
        <h2>Caractéristiques</h2>
        <ul class="feature-list">${l.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}

      <div class="trust-box">
        <h2>🔍 Transparence et vérification</h2>
        <ul>
          <li>${l.verification === "page"
            ? `Lien de l’annonce vérifié${l.date_verified ? " le " + esc(l.date_verified) : ""}`
            : l.verification === "index"
              ? "Repéré dans les résultats — lien non ouvert"
              : "Cette annonce n’a pas encore été vérifiée"}</li>
          ${l.verification_note ? `<li>${esc(l.verification_note)}</li>` : ""}
          <li>Source: ${l.agency_direct ? "Annonce directe de l’agence" : `Source externe${l.source_name ? " — " + esc(l.source_name) : ""}`}</li>
          ${l.seller_name ? `<li>Vendeur selon la source : ${esc(l.seller_name)}</li>` : `<li>Données du vendeur : non disponibles à la source</li>`}
          ${l.source_url ? `<li><a href="${esc(l.source_url)}" target="_blank" rel="noopener nofollow">🔗 Ouvrir l’annonce originale à la source</a></li>` : "<li>Pas de lien source externe — contact direct avec l’agence</li>"}
          <li>⚠️ Les informations peuvent changer — vérifiez la source originale avant tout engagement. Le site ne remplace ni le notaire ni l’expertise juridique.</li>
        </ul>
      </div>

      <div class="detail-actions">
        <a class="btn btn-primary" href="${waView}" target="_blank" rel="noopener">📅 Demander une visite via WhatsApp</a>
        <a class="btn btn-accent" href="tel:0693981822">📞 Appeler l’agence</a>
        <a class="btn btn-secondary" href="${waAsk}" target="_blank" rel="noopener">💬 Question via WhatsApp</a>
        <a class="btn btn-ghost" href="${mailAsk}">✉️ Question par e-mail</a>
        <button class="btn btn-ghost" type="button" id="shareBtn">🔗 Partager</button>
        <button class="icon-btn" type="button" id="favBtn" aria-pressed="${isFav}">${isFav ? "❤️" : "🤍"} Favoris</button>
      </div>
      <p class="note">La demande de visite ouvre WhatsApp avec un message prêt — <strong>rien ne sera envoyé sans votre clic sur Envoyer</strong>.</p>
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
        gMain.src = galleryPhotos[i];
        gMain.alt = `${l.title} — Photo ${i + 1}`;
        document.querySelectorAll("[data-thumb]").forEach((b) =>
          b.setAttribute("aria-current", b === btn ? "true" : "false"));
      });
    });

    /* ---------- لايت بوكس: ملء الشاشة + أسهم + سحب ---------- */
    const lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-label", "Voir les photos en plein écran");
    lb.innerHTML = `
      <button class="lb-btn lb-close" type="button" aria-label="Fermer">×</button>
      <button class="lb-btn lb-prev" type="button" aria-label="Photo précédente">‹</button>
      <img id="lbImg" alt="">
      <button class="lb-btn lb-next" type="button" aria-label="Photo suivante">›</button>
      <span class="lb-count" id="lbCount"></span>`;
    document.body.appendChild(lb);
    const lbImg = lb.querySelector("#lbImg"), lbCount = lb.querySelector("#lbCount");
    let lbIdx = 0;
    const lbShow = (i) => {
      lbIdx = (i + galleryPhotos.length) % galleryPhotos.length;
      lbImg.src = galleryPhotos[lbIdx];
      lbImg.alt = `${l.title} — Photo ${lbIdx + 1}`;
      lbCount.textContent = `${lbIdx + 1} / ${galleryPhotos.length}`;
    };
    const lbOpen = (i) => { lbShow(i); lb.classList.add("open"); document.body.style.overflow = "hidden"; };
    const lbClose = () => { lb.classList.remove("open"); document.body.style.overflow = ""; };
    gMain.addEventListener("click", () => {
      const cur = galleryPhotos.indexOf(gMain.getAttribute("src"));
      lbOpen(cur >= 0 ? cur : 0);
    });
    lb.querySelector(".lb-close").addEventListener("click", lbClose);
    lb.querySelector(".lb-prev").addEventListener("click", (e) => { e.stopPropagation(); lbShow(lbIdx - 1); });
    lb.querySelector(".lb-next").addEventListener("click", (e) => { e.stopPropagation(); lbShow(lbIdx + 1); });
    lb.addEventListener("click", (e) => { if (e.target === lb) lbClose(); });
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") lbClose();
      if (e.key === "ArrowLeft") lbShow(lbIdx + 1);   // RTL: اليسار = التالي
      if (e.key === "ArrowRight") lbShow(lbIdx - 1);
    });
    let tx0 = null;
    lb.addEventListener("touchstart", (e) => { tx0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", (e) => {
      if (tx0 == null) return;
      const dx = e.changedTouches[0].clientX - tx0;
      if (Math.abs(dx) > 40) lbShow(dx < 0 ? lbIdx + 1 : lbIdx - 1); // السحب لليسار = التالي
      tx0 = null;
    }, { passive: true });
  }

  /* Partager */
  $("shareBtn").addEventListener("click", async () => {
    const data = { title: l.title, text: `${l.title} — ${fmtPrice(l.price)}`, url: pageUrl };
    if (navigator.share) {
      try { await navigator.share(data); } catch (e) {}
    } else {
      try {
        await navigator.clipboard.writeText(pageUrl);
        alert("Lien du bien copié.");
      } catch (e) {
        prompt("Copier le lien du bien:", pageUrl);
      }
    }
  });

  /* Favoris */
  $("favBtn").addEventListener("click", () => {
    let f = store.get("souq_favs", []);
    const btn = $("favBtn");
    if (f.includes(l.id)) {
      f = f.filter((x) => x !== l.id);
      btn.setAttribute("aria-pressed", "false");
      btn.innerHTML = "🤍 Favoris";
    } else {
      f = [...f, l.id];
      btn.setAttribute("aria-pressed", "true");
      btn.innerHTML = "❤️ Favoris";
    }
    store.set("souq_favs", f);
  });

  /* قائمة الهاتف (هامبرغر) */
  try {
    const nt = $("navToggle"), nl = $("mainNav");
    if (nt && nl) nt.addEventListener("click", () => {
      const open = nl.classList.toggle("open");
      nt.setAttribute("aria-expanded", open ? "true" : "false");
    });
  } catch (e) {}
})();
