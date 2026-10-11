/* Cap Immo Tanger — version française (généré par scripts/build-fr-site.js) */
/* ============================================================
   Cap Immo Tanger — app.js (الصفحة الرئيسية)
   يعتمد على: data/listings.js (SOUQ_CONFIG + LISTINGS)
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Outils ---------- */
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

  // تطبيع عربي للRecherche: أإآ→ا، ة→ه، ى→ي، إزالة التشكيل
  const norm = (s) =>
    String(s == null ? "" : s).toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // أسماء المدن بالفرنسية/الإنجليزية → Français (للRecherche فقط)
  const CITY_ALIAS = {
    tanger: "Tanger", tangier: "Tanger", tanja: "Tanger",
    casa: "Tanger", casablanca: "Tanger",
    rabat: "Tanger", marrakech: "Tanger", marrakesh: "Tanger",
    fes: "Tanger", fez: "Tanger", agadir: "Tanger",
    meknes: "Tanger", kenitra: "Tanger", tetouan: "Tanger",
    mohammedia: "Tanger", "el jadida": "Tanger", jadida: "Tanger",
    oujda: "Tanger", sale: "Tanger", temara: "Tanger"
  };
  const normQuery = (q) => {
    let nq = norm(q);
    for (const [k, v] of Object.entries(CITY_ALIAS)) {
      if (nq.includes(k)) nq = nq.replaceAll(k, norm(v));
    }
    return nq;
  };

  const ppm = (l) => (l.price && l.area ? l.price / l.area : null);
  const medianOf = (city) => SOUQ_CONFIG.cityMedians[city] || null;
  const dealPct = (l) => {
    const p = ppm(l), m = medianOf(l.city);
    if (p == null || m == null || p >= m) return null;
    return Math.round((m - p) / m * 100);
  };
  const isDeal = (l) => dealPct(l) != null;

  /* ---------- الوضع الداكن ---------- */
  const themeBtn = $("themeToggle");
  const applyThemeIcon = () => {
    const cur = document.documentElement.dataset.theme;
    const dark = cur === "dark" ||
      (!cur && window.matchMedia("(prefers-color-scheme: dark)").matches);
    themeBtn.textContent = dark ? "☀️" : "🌙";
    themeBtn.setAttribute("aria-label", dark ? "Passer en mode clair" : "Passer en mode sombre");
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

  /* ---------- الFavoris والComparer (localStorage) ---------- */
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  let favs = store.get("souq_favs", []);
  let cmp = store.get("souq_cmp", []);
  const byId = (id) => LISTINGS.find((l) => l.id === id);

  /* تنبيه لطيف بدل alert */
  let toastTimer = null;
  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  /* ---------- شارات الثقة (صياغة صريحة — ممنوع «موثق») ---------- */
  /* تنبيهات الRecherche: «جديد منذ زيارتك» — localStorage فقط، بلا backend */
  const LAST_VISIT_KEY = "capimmo_last_visit";
  let lastVisitTs = 0;
  try { lastVisitTs = parseInt(localStorage.getItem(LAST_VISIT_KEY) || "0", 10) || 0; } catch (e) { lastVisitTs = 0; }
  const isNewSinceVisit = (l) => {
    if (!lastVisitTs || !l.date_added) return false;
    const t = new Date(l.date_added + "T00:00:00").getTime();
    return !isNaN(t) && t > lastVisitTs;
  };
  function trustBadges(l) {
    const b = [];
    if (isNewSinceVisit(l)) b.push('<span class="badge is-new">🆕 Nouveau</span>');
    if (l.agency_direct) b.push('<span class="badge agency">Annonce de l’agence</span>');
    const d = dealPct(l);
    if (d != null) b.push(`<span class="badge deal">🔥 Bonne affaire −${d}%</span>`);
    if (l.verification === "page") b.push('<span class="badge verify">Lien vérifié</span>');
    if (l.photos_ai) b.push('<span class="badge ai-photos" title="Images générées par IA à titre illustratif — pas les photos réelles du bien">🎨 Images illustratives</span>');
    if (l.status === "review") b.push('<span class="badge review">À vérifier</span>');
    if (l.status === "unavailable") b.push('<span class="badge unavailable">Actuellement indisponible</span>');
    return b.join("");
  }

  function trustLine(l) {
    let v, cls = "";
    if (l.verification === "page") {
      v = `Lien de l’annonce vérifié${l.date_verified ? " — " + esc(l.date_verified) : ""}`;
    } else if (l.verification === "index") {
      v = "Repéré dans les résultats — lien non ouvert"; cls = "warn";
    } else {
      v = "Non vérifié"; cls = "none";
    }
    const src = l.agency_direct
      ? "Annonce de l’agence"
      : `Source externe${l.source_name ? ": " + esc(l.source_name) : ""}`;
    return `<div class="trust-line"><span class="dot ${cls}"></span><span>${esc(v)} · ${src}</span></div>`;
  }

  function photoHTML(l, lazy) {
    const real = l.photos && l.photos.length > 0 && l.photo_real;
    const alt = esc(l.title || "Bien à vendre");
    if (real) {
      return `<img src="${esc(l.photos[0])}" alt="${alt}" ${lazy ? 'loading="lazy"' : ""} onerror="this.closest('.card-media').innerHTML=window.__souqPH()">`;
    }
    return window.__souqPH();
  }
  window.__souqPH = () =>
    `<div class="ph" role="img" aria-label="Image illustrative — aucune photo du bien">` +
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">` +
    `<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10.5V20h14v-9.5"/><path d="M9 20v-6h6v6"/></svg>` +
    `<span>Image illustrative — aucune photo du bien</span></div>`;

  function dealLineHTML(l) {
    const d = dealPct(l), m = medianOf(l.city), p = ppm(l);
    if (d == null) return "";
    return `<div class="deal-line">🔥 ${d}% sous la moyenne de ${esc(l.city)} ` +
      `(${fmtNum(m)} DH/m² contre ${fmtNum(p)} DH/m²)</div>`;
  }

  /* ---------- Carte bien ---------- */
  function cardHTML(l, lazy) {
    const p = ppm(l);
    const waText = encodeURIComponent(
      `Bonjour, je suis intéressé par ce bien: ${l.title} — ${fmtPrice(l.price)} — ${l.city}.\n` +
      `Lien détails : ${location.origin}${location.pathname.replace(/[^/]*$/, "")}property-${l.id}.html`
    );
    const waHref = `https://wa.me/212693981822?text=${waText}`;
    const fav = favs.includes(l.id);
    const inCmp = cmp.includes(l.id);
    return `
    <article class="card" data-id="${esc(l.id)}">
      <div class="card-media">
        ${photoHTML(l, lazy)}
        <div class="card-badges">${trustBadges(l)}</div>
      </div>
      <div class="card-body">
        <h3 class="card-title"><a href="./property-${esc(l.id)}.html">${esc(l.title)}</a></h3>
        <div class="card-price">${fmtPrice(l.price)}${p ? ` <small>· ${fmtNum(p)} DH/m²</small>` : ""}</div>
        <div class="card-meta">
          <span>📍 <b>${esc(l.city)}</b>${l.neighborhood ? " — " + esc(l.neighborhood) : ""}</span>
          ${l.area ? `<span>📐 <b>${esc(l.area)}</b> م²</span>` : ""}
          ${l.rooms ? `<span>🛏️ <b>${esc(l.rooms)}</b> chambres</span>` : ""}
          ${l.type ? `<span>🏷️ ${esc(l.type)}</span>` : ""}
        </div>
        ${dealLineHTML(l)}
        ${trustLine(l)}
        <div class="card-actions">
          <a class="btn btn-primary btn-sm" href="./property-${esc(l.id)}.html">Détails</a>
          <a class="btn btn-ghost btn-sm" href="${waHref}" target="_blank" rel="noopener">WhatsApp</a>
          <button class="icon-btn" type="button" data-fav="${esc(l.id)}" aria-pressed="${fav}">${fav ? "❤️" : "🤍"} Favoris</button>
          <button class="icon-btn" type="button" data-cmp="${esc(l.id)}" aria-pressed="${inCmp}">${inCmp ? "✓" : "+"} Comparer</button>
        </div>
      </div>
    </article>`;
  }

  const renderGrid = (el, list, lazy) => {
    el.innerHTML = list.map((l) => cardHTML(l, lazy)).join("");
  };

  /* ---------- الفلاتر ---------- */
  // 🔒 مرحلة طنجة فقط: الBiens à المخفية (خارج طنجة) لا تظهر في الشبكة ولا الهمزات ولا التصفح
  const isVisible = (l) => !l.hidden;
  const cities = [...new Set(LISTINGS.filter(isVisible).map((l) => l.city).filter(Boolean))].sort();
  const types = [...new Set(LISTINGS.filter(isVisible).map((l) => l.type).filter(Boolean))].sort();
  const fCity = $("fCity"), fHood = $("fHood"), fType = $("fType");

  cities.forEach((c) => fCity.add(new Option(c, c)));
  types.forEach((t) => fType.add(new Option(t, t)));

  function refreshHoods() {
    const c = fCity.value;
    const hoods = [...new Set(
      LISTINGS.filter(isVisible).filter((l) => !c || l.city === c).map((l) => l.neighborhood).filter(Boolean)
    )].sort();
    const cur = fHood.value;
    fHood.innerHTML = '<option value="">Tous les quartiers</option>';
    hoods.forEach((h) => fHood.add(new Option(h, h)));
    if (hoods.includes(cur)) fHood.value = cur;
  }
  refreshHoods();
  fCity.addEventListener("change", refreshHoods);

  // دعم ?city=طنجة من روابط الفوتر/SEO
  try {
    const pc = new URLSearchParams(location.search).get("city");
    if (pc && cities.includes(pc)) { fCity.value = pc; refreshHoods(); }
  } catch (e) {}

  const F = {
    q: $("q"), minP: $("fMinPrice"), maxP: $("fMaxPrice"),
    minA: $("fMinArea"), maxA: $("fMaxArea"), rooms: $("fRooms"),
    baths: $("fBaths"), status: $("fStatus"), sort: $("fSort"),
    fur: $("fFurnished"), park: $("fParking"), elev: $("fElevator"),
    deals: $("fDeals"), favsOnly: $("fFavs")
  };

  function filtered() {
    const q = normQuery(F.q.value);
    const city = fCity.value, hood = fHood.value, type = fType.value;
    const minP = parseFloat(F.minP.value), maxP = parseFloat(F.maxP.value);
    const minA = parseFloat(F.minA.value), maxA = parseFloat(F.maxA.value);
    const rooms = parseInt(F.rooms.value || "0", 10);
    const baths = parseInt(F.baths.value || "0", 10);
    const status = F.status.value;

    let list = LISTINGS.filter((l) => {
      if (l.hidden) return false; // 🔒 مرحلة طنجة فقط
      if (q) {
        const hay = normQuery([l.title, l.city, l.neighborhood, l.address, l.description,
          (l.features || []).join(" "), l.type, l.source_name].join(" "));
        if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      if (city && l.city !== city) return false;
      if (hood && l.neighborhood !== hood) return false;
      if (type && l.type !== type) return false;
      if (!isNaN(minP) && (l.price == null || l.price < minP)) return false;
      if (!isNaN(maxP) && (l.price == null || l.price > maxP)) return false;
      if (!isNaN(minA) && (l.area == null || l.area < minA)) return false;
      if (!isNaN(maxA) && (l.area == null || l.area > maxA)) return false;
      if (rooms && (l.rooms == null || l.rooms < rooms)) return false;
      if (baths && (l.bathrooms == null || l.bathrooms < baths)) return false;
      if (status && l.status !== status) return false;
      if (F.fur.checked && !l.furnished) return false;
      if (F.park.checked && !l.parking) return false;
      if (F.elev.checked && !l.elevator) return false;
      if (F.deals.checked && !isDeal(l)) return false;
      if (F.favsOnly.checked && !favs.includes(l.id)) return false;
      return true;
    });

    const byDate = (a, b) => String(b.date_verified || "").localeCompare(String(a.date_verified || ""));
    switch (F.sort.value) {
      case "price-asc": list.sort((a, b) => (a.price || Infinity) - (b.price || Infinity)); break;
      case "price-desc": list.sort((a, b) => (b.price || 0) - (a.price || 0)); break;
      case "area-desc": list.sort((a, b) => (b.area || 0) - (a.area || 0)); break;
      case "ppm-asc": list.sort((a, b) => (ppm(a) || Infinity) - (ppm(b) || Infinity)); break;
      case "newest": list.sort(byDate); break;
      default:
        list.sort((a, b) =>
          ((b.agency_direct ? 1 : 0) - (a.agency_direct ? 1 : 0)) ||
          ((b.spotlight ? 1 : 0) - (a.spotlight ? 1 : 0)) || byDate(a, b));
    }
    return list;
  }

  const grid = $("listingGrid"), emptyState = $("emptyState"), resultCount = $("resultCount");

  function applyFilters() {
    const list = filtered();
    renderGrid(grid, list, true);
    resultCount.textContent = list.length === 0 ? "Aucun résultat"
      : list.length === 1 ? "1 résultat" : `${list.length} résultats`;
    emptyState.classList.toggle("show", list.length === 0);
  }

  ["input", "change"].forEach((ev) =>
    document.querySelector(".search-panel").addEventListener(ev, (e) => {
      if (e.target && e.target.id) applyFilters();
    }));
  // الRecherche الحر بتأخير بسيط
  let qTimer = null;
  F.q.addEventListener("input", () => {
    clearTimeout(qTimer);
    qTimer = setTimeout(applyFilters, 180);
  });

  function clearFilters() {
    F.q.value = ""; fCity.value = ""; refreshHoods(); fHood.value = ""; fType.value = "";
    F.minP.value = ""; F.maxP.value = ""; F.minA.value = ""; F.maxA.value = "";
    F.rooms.value = ""; F.baths.value = ""; F.status.value = ""; F.sort.value = "default";
    F.fur.checked = F.park.checked = F.elev.checked = F.deals.checked = F.favsOnly.checked = false;
    applyFilters();
  }
  $("clearFilters").addEventListener("click", clearFilters);
  $("emptyClear").addEventListener("click", clearFilters);

  /* ---------- أحداث البطاقات: Favoris / Comparer (تفويض) ---------- */
  document.addEventListener("click", (e) => {
    const favBtn = e.target.closest("[data-fav]");
    if (favBtn) {
      const id = favBtn.getAttribute("data-fav");
      favs = favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id];
      store.set("souq_favs", favs);
      applyFilters(); renderFavs();
      return;
    }
    const cmpBtn = e.target.closest("[data-cmp]");
    if (cmpBtn) {
      const id = cmpBtn.getAttribute("data-cmp");
      if (cmp.includes(id)) {
        cmp = cmp.filter((x) => x !== id);
      } else {
        if (cmp.length >= 3) {
          toast("Vous pouvez comparer 3 biens maximum — retirez-en un d’abord.");
          return;
        }
        cmp = [...cmp, id];
      }
      store.set("souq_cmp", cmp);
      applyFilters(); updateCompareBar();
    }
  });

  /* ---------- Mes favoris ---------- */
  const favGrid = $("favGrid"), favEmpty = $("favEmpty");
  function renderFavs() {
    const list = favs.map(byId).filter(Boolean).filter((l) => !l.hidden);
    renderGrid(favGrid, list, true);
    favEmpty.classList.toggle("show", list.length === 0);
  }
  $("clearFavs").addEventListener("click", () => {
    if (!favs.length) return;
    if (confirm("Supprimer tous les biens favoris ?")) {
      favs = []; store.set("souq_favs", favs);
      applyFilters(); renderFavs();
    }
  });

  /* ---------- الComparer (حتى 3) ---------- */
  const compareBar = $("compareBar"), compareCount = $("compareCount");
  const compareModal = $("compareModal"), compareContent = $("compareContent");

  function updateCompareBar() {
    compareBar.classList.toggle("show", cmp.length > 0);
    // إخفاء تام عند عدم اختيار أي عقار (في الهاتف الشريط يلتف ويظهر جزء منه)
    compareBar.style.display = cmp.length > 0 ? "" : "none";
    compareCount.textContent = `${cmp.length} sur 3 sélectionnés`;
  }
  $("clearCompare").addEventListener("click", () => {
    cmp = []; store.set("souq_cmp", cmp);
    applyFilters(); updateCompareBar();
  });

  function specRow(label, fn) {
    return `<tr><th scope="row">${label}</th>${cmp.map((id) => `<td>${fn(byId(id))}</td>`).join("")}</tr>`;
  }
  function statusLabel(s) {
    return s === "available" ? "Disponible" : s === "review" ? "À vérifier" : "Actuellement indisponible";
  }
  function verifyLabel(l) {
    if (l.verification === "page") return `Lien de l’annonce vérifié${l.date_verified ? " (" + esc(l.date_verified) + ")" : ""}`;
    if (l.verification === "index") return "Repéré dans les résultats — lien non ouvert";
    return "Non vérifié";
  }

  $("openCompare").addEventListener("click", () => {
    if (!cmp.length) return;
    compareContent.innerHTML = `
      <table class="cmp-table">
        <tr><th scope="row">Bien</th>${cmp.map((id) => {
          const l = byId(id);
          return `<td><strong><a href="./property-${esc(id)}.html">${esc(l.title)}</a></strong></td>`;
        }).join("")}</tr>
        ${specRow("Photo", (l) => {
          const real = l.photos && l.photos.length && l.photo_real;
          return real
            ? `<img src="${esc(l.photos[0])}" alt="${esc(l.title)}" loading="lazy">`
            : `<span style="font-size:.8rem;color:var(--muted)">Image illustrative — aucune photo du bien</span>`;
        })}
        ${specRow("Prix", (l) => `<b>${fmtPrice(l.price)}</b>`)}
        ${specRow("Surface", (l) => l.area ? esc(l.area) + " م²" : "–")}
        ${specRow("Prix/m²", (l) => { const p = ppm(l); return p ? fmtNum(p) + " DH/m²" : "–"; })}
        ${specRow("Comparé à la moyenne", (l) => {
          const d = dealPct(l);
          return d != null ? `<b style="color:var(--orange-dark)">${d}% sous la moyenne de la ville</b>` : "–";
        })}
        ${specRow("Chambres / SDB", (l) => `${l.rooms != null ? esc(l.rooms) : "–"} / ${l.bathrooms != null ? esc(l.bathrooms) : "–"}`)}
        ${specRow("Ville / Quartier", (l) => esc(l.city) + (l.neighborhood ? " — " + esc(l.neighborhood) : ""))}
        ${specRow("Type", (l) => esc(l.type || "–"))}
        ${specRow("État", (l) => esc(statusLabel(l.status)))}
        ${specRow("Vérification", (l) => esc(verifyLabel(l)))}
        ${specRow("Source", (l) => esc(l.agency_direct ? "Annonce de l’agence" : (l.source_name || "Source externe")))}
      </table>
      <p class="note">Informations à titre comparatif uniquement — vérifiez le lien source original de chaque annonce avant tout engagement.</p>`;
    compareModal.classList.add("open");
    compareModal.querySelector("[data-close]").focus();
  });

  compareModal.addEventListener("click", (e) => {
    if (e.target === compareModal || e.target.closest("[data-close]")) {
      compareModal.classList.remove("open");
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") compareModal.classList.remove("open");
  });

  /* ---------- الأقسام الديناميكية ---------- */
  function renderSections() {
    // Bonnes affaires : prix/m² inférieur à la moyenne de la ville
    const deals = LISTINGS.filter((l) => isVisible(l) && l.status !== "unavailable" && isDeal(l))
      .sort((a, b) => dealPct(b) - dealPct(a));
    renderGrid($("dealsGrid"), deals, true);

    // Biens de l’agence
    renderGrid($("agencyGrid"), LISTINGS.filter((l) => isVisible(l) && l.agency_direct), true);

    // Indicateurs du marché
    $("medianGrid").innerHTML = Object.entries(SOUQ_CONFIG.cityMedians).map(([c, m]) => `
      <div class="median-card"><span>${esc(c)}</span><strong>${fmtNum(m)} DH/m²</strong>
      <span>Moyenne interne de référence pour comparaison</span></div>`).join("");

    // Statistiques (biens visibles uniquement — phase Tanger)
    $("statCount").textContent = LISTINGS.filter((l) => !l.hidden).length;
    $("statCities").textContent = cities.length;
    $("statDeals").textContent = deals.length;

    // روابط المدن في الفوتر
    $("cityLinks").innerHTML = cities.slice(0, 8).map((c) =>
      `<li><a href="./index.html?city=${encodeURIComponent(c)}">Biens à ${esc(c)}</a></li>`).join("");

    $("year").textContent = new Date().getFullYear();
    $("dataUpdated").textContent = SOUQ_CONFIG.dataUpdated || "–";
  }

  /* ---------- Calculateur de crédit ---------- */
  const mForm = $("mortgageForm"), calcError = $("calcError");
  function calcMortgage() {
    const price = parseFloat($("homePrice").value);
    const down = parseFloat($("downPayment").value) || 0;
    const years = parseFloat($("years").value);
    const rate = parseFloat($("rate").value);
    $("yearsLabel").textContent = `${years} ans`;
    $("rateLabel").textContent = `${rate.toFixed(2)}%`;

    let err = "";
    if (!(price > 0)) err = "Veuillez saisir un prix positif.";
    else if (down < 0) err = "L’apport ne peut pas être négatif.";
    else if (down > price) err = "L’apport ne peut pas dépasser le prix du bien.";

    if (err) {
      calcError.textContent = err;
      $("monthlyPayment").textContent = "–";
      $("loanAmount").textContent = "–";
      $("interestTotal").textContent = "–";
      $("loanRatio").textContent = "–";
      $("extraCosts").textContent = "–";
      return;
    }
    calcError.textContent = "";
    const loan = price - down;
    const r = rate / 100 / 12, n = years * 12;
    const monthly = r > 0 ? loan * r / (1 - Math.pow(1 + r, -n)) : loan / n;
    const interest = monthly * n - loan;
    const ratio = price > 0 ? loan / price * 100 : 0;
    // Coûts estimés : notaire ~1% + Assurance approx. + Frais de dossier
    const extra = price * 0.01 + loan * 0.003 * years + 3000;

    $("monthlyPayment").textContent = fmtPrice(monthly);
    $("loanAmount").textContent = fmtPrice(loan);
    $("interestTotal").textContent = fmtPrice(interest);
    $("loanRatio").textContent = ratio.toFixed(1) + "%";
    $("extraCosts").textContent = "≈ " + fmtPrice(extra);
  }
  mForm.addEventListener("input", calcMortgage);

  /* ---------- نموذج طلب عقار → WhatsApp (بدون إرسال تلقائي) ---------- */
  $("requestForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const err = $("reqError");
    const v = (id) => $(id).value.trim();
    const name = v("rName"), phone = v("rPhone"), city = v("rCity"), budget = parseFloat(v("rBudget"));

    let msg = "";
    if (!name) msg = "Veuillez saisir votre nom complet.";
    else if (!/^0[67]\d{8}$/.test(phone.replace(/[\s-]/g, ""))) msg = "Veuillez saisir un numéro marocain valide (ex : 0612345678).";
    else if (!city) msg = "Veuillez saisir la ville souhaitée.";
    else if (!(budget > 0)) msg = "Veuillez saisir un budget valide.";
    else if (!$("rConsent").checked) msg = "Veuillez accepter l’utilisation de vos données pour vous contacter.";
    if (msg) { err.textContent = msg; return; }
    err.textContent = "";

    const lines = [
      "Nouvelle demande de bien — Cap Immo Tanger :",
      `Nom : ${name}`,
      `Téléphone : ${phone}`,
      `Ville : ${city}`,
      v("rHoods") ? `Quartiers : ${v("rHoods")}` : null,
      `Budget : ${fmtPrice(budget)}`,
      v("rRooms") ? `Chambres : ${v("rRooms")}+` : null,
      v("rType") ? `Type : ${v("rType")}` : null,
      `Transaction : ${v("rDeal") || "Achat"}`,
      v("rTime") ? `Contact : ${v("rTime")}` : null,
      v("rNotes") ? `Notes : ${v("rNotes")}` : null
    ].filter(Boolean);

    window.open(`https://wa.me/212693981822?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener");
  });

  /* ---------- تهيئة ---------- */
  applyFilters();
  renderFavs();
  renderSections();
  updateCompareBar();
  calcMortgage();

  /* ختم الزيارة الحالية — لشارة «جديد منذ زيارتك» في الزيارة القادمة */
  try { localStorage.setItem(LAST_VISIT_KEY, String(Date.now())); } catch (e) {}

  /* ---------- نبهني بالجديد — اشتراك WhatsApp بمعايير الفلاتر الحالية ---------- */
  const alertBtn = $("alertBtn");
  if (alertBtn) alertBtn.addEventListener("click", () => {
    const optText = (sel) => { const o = sel.options[sel.selectedIndex]; return o ? o.text.trim() : ""; };
    const num = (v) => { const n = parseFloat(v); return isNaN(n) ? null : n; };
    const rangeLine = (label, min, max, unit) => {
      min = num(min); max = num(max);
      if (min == null && max == null) return null;
      let r;
      if (min != null && max != null) r = `${fmtNum(min)} - ${fmtNum(max)}`;
      else if (min != null) r = `≥ ${fmtNum(min)}`;
      else r = `≤ ${fmtNum(max)}`;
      return `${label}${r} ${unit}`;
    };
    const lines = ["Bonjour, je souhaite être alerté des nouveaux biens correspondant à mes critères de recherche :"];
    if (F.q.value.trim()) lines.push(`• Recherche : ${F.q.value.trim()}`);
    if (fCity.value) lines.push(`• Ville : ${optText(fCity)}`);
    if (fHood.value) lines.push(`• Quartier : ${optText(fHood)}`);
    if (fType.value) lines.push(`• Type : ${optText(fType)}`);
    const pr = rangeLine("• Prix : ", F.minP.value, F.maxP.value, "DH");
    if (pr) lines.push(pr);
    const ar = rangeLine("• Surface : ", F.minA.value, F.maxA.value, "م²");
    if (ar) lines.push(ar);
    if (F.rooms.value) lines.push(`• Chambres : ${optText(F.rooms)}`);
    if (F.baths.value) lines.push(`• Salles de bain : ${optText(F.baths)}`);
    if (F.deals.checked) lines.push("• Bonnes affaires uniquement");
    if (F.fur.checked) lines.push("• Meublé");
    if (F.park.checked) lines.push("• Parking");
    if (F.elev.checked) lines.push("• Ascenseur");
    lines.push("Merci.");
    window.open(`https://wa.me/212693981822?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener");
  });

  /* ---------- قائمة الهاتف (هامبرغر) ---------- */
  try {
    const nt = $("navToggle"), nl = $("mainNav");
    if (nt && nl) nt.addEventListener("click", () => {
      const open = nl.classList.toggle("open");
      nt.setAttribute("aria-expanded", open ? "true" : "false");
      nt.setAttribute("aria-label", open ? "Fermer le menu de navigation" : "Ouvrir le menu de navigation");
    });
  } catch (e) {}

  /* ---------- الفلاتر القابلة للطي + رقائق الفلاتر النشطة ---------- */
  try {
    const ft = $("filtersToggle"), fb = $("filtersBox"), chips = $("activeChips");
    if (ft && fb) {
      // على الهاتف تبدأ مطوية
      if (window.matchMedia("(max-width: 900px)").matches) {
        fb.classList.add("collapsed");
        ft.setAttribute("aria-expanded", "false");
      }
      ft.addEventListener("click", () => {
        const c = fb.classList.toggle("collapsed");
        ft.setAttribute("aria-expanded", c ? "false" : "true");
      });
    }
    const CHIP_FIELDS = [
      ["q", "Recherche"], ["fCity", "Ville"], ["fHood", "Quartier"], ["fType", "Type"],
      ["fMinPrice", "Prix min"], ["fMaxPrice", "Prix max"], ["fMinArea", "Surface min"],
      ["fMaxArea", "Surface max"], ["fRooms", "Chambres"], ["fBaths", "Salles de bain"],
      ["fStatus", "État"], ["fSort", "Tri"]
    ];
    window.__renderChips = function () {
      if (!chips) return;
      const out = [];
      CHIP_FIELDS.forEach(([id, label]) => {
        const el = $(id);
        if (!el || !el.value) return;
        const txt = el.tagName === "SELECT"
          ? el.options[el.selectedIndex].text : el.value;
        out.push(`<span class="chip">${esc(label)}: ${esc(txt)}<button type="button" data-clear="${id}" aria-label="Retirer le filtre ${esc(label)}">×</button></span>`);
      });
      chips.innerHTML = out.join("");
      chips.querySelectorAll("[data-clear]").forEach((b) =>
        b.addEventListener("click", () => {
          const el = $(b.getAttribute("data-clear"));
          if (el) { el.value = ""; el.dispatchEvent(new Event("change", { bubbles: true })); }
          applyFilters(); window.__renderChips();
        }));
    };
    const _apply = applyFilters;
    applyFilters = function () { _apply(); window.__renderChips(); };
    window.__renderChips();
    // إزالة هيكل التحميل بعد أول عرض
    ["statCount", "statCities", "statDeals"].forEach((id) => {
      const el = $(id); if (el) el.classList.remove("skel");
    });
  } catch (e) {}
})();
