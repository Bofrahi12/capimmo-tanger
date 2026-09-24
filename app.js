/* ============================================================
   سوق بيع العقار المغربي — app.js (الصفحة الرئيسية)
   يعتمد على: data/listings.js (SOUQ_CONFIG + LISTINGS)
   ============================================================ */
(function () {
  "use strict";

  /* ---------- أدوات مساعدة ---------- */
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

  // تطبيع عربي للبحث: أإآ→ا، ة→ه، ى→ي، إزالة التشكيل
  const norm = (s) =>
    String(s == null ? "" : s).toLowerCase()
      .replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
      .replace(/[\u064b-\u0652\u0670]/g, "").trim();

  // أسماء المدن بالفرنسية/الإنجليزية → العربية (للبحث فقط)
  const CITY_ALIAS = {
    tanger: "طنجة", tangier: "طنجة",
    casa: "الدار البيضاء", casablanca: "الدار البيضاء",
    rabat: "الرباط", marrakech: "مراكش", marrakesh: "مراكش",
    fes: "فاس", fez: "فاس", agadir: "أكادير",
    meknes: "مكناس", kenitra: "القنيطرة", tetouan: "تطوان",
    mohammedia: "المحمدية", "el jadida": "الجديدة", jadida: "الجديدة",
    oujda: "وجدة", sale: "سلا", temara: "تمارة"
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
    themeBtn.setAttribute("aria-label", dark ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن");
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

  /* ---------- المفضلة والمقارنة (localStorage) ---------- */
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
  function trustBadges(l) {
    const b = [];
    if (l.agency_direct) b.push('<span class="badge agency">إعلان الوكالة</span>');
    const d = dealPct(l);
    if (d != null) b.push(`<span class="badge deal">🔥 همزة −${d}%</span>`);
    if (l.verification === "page") b.push('<span class="badge verify">تم التحقق من الرابط</span>');
    if (l.status === "review") b.push('<span class="badge review">يحتاج مراجعة</span>');
    if (l.status === "unavailable") b.push('<span class="badge unavailable">غير متاح حالياً</span>');
    return b.join("");
  }

  function trustLine(l) {
    let v, cls = "";
    if (l.verification === "page") {
      v = `تم التحقق من رابط الإعلان${l.date_verified ? " — " + esc(l.date_verified) : ""}`;
    } else if (l.verification === "index") {
      v = "مرصود في نتائج البحث — لم يُفتح الرابط"; cls = "warn";
    } else {
      v = "لم يتم التحقق"; cls = "none";
    }
    const src = l.agency_direct
      ? "إعلان الوكالة"
      : `مصدر خارجي${l.source_name ? ": " + esc(l.source_name) : ""}`;
    return `<div class="trust-line"><span class="dot ${cls}"></span><span>${esc(v)} · ${src}</span></div>`;
  }

  function photoHTML(l, lazy) {
    const real = l.photos && l.photos.length > 0 && l.photo_real;
    const alt = esc(l.title || "عقار معروض للبيع");
    if (real) {
      return `<img src="${esc(l.photos[0])}" alt="${alt}" ${lazy ? 'loading="lazy"' : ""} onerror="this.closest('.card-media').innerHTML=window.__souqPH()">`;
    }
    return window.__souqPH();
  }
  window.__souqPH = () =>
    `<div class="ph" role="img" aria-label="صورة توضيحية — لا توجد صورة للعقار">` +
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">` +
    `<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10.5V20h14v-9.5"/><path d="M9 20v-6h6v6"/></svg>` +
    `<span>صورة توضيحية — لا توجد صورة للعقار</span></div>`;

  function dealLineHTML(l) {
    const d = dealPct(l), m = medianOf(l.city), p = ppm(l);
    if (d == null) return "";
    return `<div class="deal-line">🔥 أقل بـ${d}% من متوسط ${esc(l.city)} ` +
      `(${fmtNum(m)} درهم/م² مقابل ${fmtNum(p)} درهم/م²)</div>`;
  }

  /* ---------- بطاقة عقار ---------- */
  function cardHTML(l, lazy) {
    const p = ppm(l);
    const waText = encodeURIComponent(
      `السلام عليكم، مهتم بهذا العقار: ${l.title} — ${fmtPrice(l.price)} — ${l.city}.\n` +
      `رابط التفاصيل: ${location.origin}${location.pathname.replace(/[^/]*$/, "")}property-${l.id}.html`
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
        <div class="card-price">${fmtPrice(l.price)}${p ? ` <small>· ${fmtNum(p)} درهم/م²</small>` : ""}</div>
        <div class="card-meta">
          <span>📍 <b>${esc(l.city)}</b>${l.neighborhood ? " — " + esc(l.neighborhood) : ""}</span>
          ${l.area ? `<span>📐 <b>${esc(l.area)}</b> م²</span>` : ""}
          ${l.rooms ? `<span>🛏️ <b>${esc(l.rooms)}</b> غرف</span>` : ""}
          ${l.type ? `<span>🏷️ ${esc(l.type)}</span>` : ""}
        </div>
        ${dealLineHTML(l)}
        ${trustLine(l)}
        <div class="card-actions">
          <a class="btn btn-primary btn-sm" href="./property-${esc(l.id)}.html">التفاصيل</a>
          <a class="btn btn-ghost btn-sm" href="${waHref}" target="_blank" rel="noopener">واتساب</a>
          <button class="icon-btn" type="button" data-fav="${esc(l.id)}" aria-pressed="${fav}">${fav ? "❤️" : "🤍"} مفضلة</button>
          <button class="icon-btn" type="button" data-cmp="${esc(l.id)}" aria-pressed="${inCmp}">${inCmp ? "✓" : "+"} مقارنة</button>
        </div>
      </div>
    </article>`;
  }

  const renderGrid = (el, list, lazy) => {
    el.innerHTML = list.map((l) => cardHTML(l, lazy)).join("");
  };

  /* ---------- الفلاتر ---------- */
  const cities = [...new Set(LISTINGS.map((l) => l.city).filter(Boolean))].sort();
  const types = [...new Set(LISTINGS.map((l) => l.type).filter(Boolean))].sort();
  const fCity = $("fCity"), fHood = $("fHood"), fType = $("fType");

  cities.forEach((c) => fCity.add(new Option(c, c)));
  types.forEach((t) => fType.add(new Option(t, t)));

  function refreshHoods() {
    const c = fCity.value;
    const hoods = [...new Set(
      LISTINGS.filter((l) => !c || l.city === c).map((l) => l.neighborhood).filter(Boolean)
    )].sort();
    const cur = fHood.value;
    fHood.innerHTML = '<option value="">كل الأحياء</option>';
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
    resultCount.textContent = list.length === 0 ? "لا توجد نتائج"
      : list.length === 1 ? "نتيجة واحدة" : `${list.length} نتيجة`;
    emptyState.classList.toggle("show", list.length === 0);
  }

  ["input", "change"].forEach((ev) =>
    document.querySelector(".search-panel").addEventListener(ev, (e) => {
      if (e.target && e.target.id) applyFilters();
    }));
  // البحث الحر بتأخير بسيط
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

  /* ---------- أحداث البطاقات: مفضلة / مقارنة (تفويض) ---------- */
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
          toast("يمكنك مقارنة 3 عقارات كحد أقصى — أزل واحداً أولاً.");
          return;
        }
        cmp = [...cmp, id];
      }
      store.set("souq_cmp", cmp);
      applyFilters(); updateCompareBar();
    }
  });

  /* ---------- مفضلتي ---------- */
  const favGrid = $("favGrid"), favEmpty = $("favEmpty");
  function renderFavs() {
    const list = favs.map(byId).filter(Boolean);
    renderGrid(favGrid, list, true);
    favEmpty.classList.toggle("show", list.length === 0);
  }
  $("clearFavs").addEventListener("click", () => {
    if (!favs.length) return;
    if (confirm("مسح جميع العقارات المحفوظة في المفضلة؟")) {
      favs = []; store.set("souq_favs", favs);
      applyFilters(); renderFavs();
    }
  });

  /* ---------- المقارنة (حتى 3) ---------- */
  const compareBar = $("compareBar"), compareCount = $("compareCount");
  const compareModal = $("compareModal"), compareContent = $("compareContent");

  function updateCompareBar() {
    compareBar.classList.toggle("show", cmp.length > 0);
    // إخفاء تام عند عدم اختيار أي عقار (في الهاتف الشريط يلتف ويظهر جزء منه)
    compareBar.style.display = cmp.length > 0 ? "" : "none";
    compareCount.textContent = `تم اختيار ${cmp.length} من 3`;
  }
  $("clearCompare").addEventListener("click", () => {
    cmp = []; store.set("souq_cmp", cmp);
    applyFilters(); updateCompareBar();
  });

  function specRow(label, fn) {
    return `<tr><th scope="row">${label}</th>${cmp.map((id) => `<td>${fn(byId(id))}</td>`).join("")}</tr>`;
  }
  function statusLabel(s) {
    return s === "available" ? "متاح" : s === "review" ? "يحتاج مراجعة" : "غير متاح حالياً";
  }
  function verifyLabel(l) {
    if (l.verification === "page") return `تم التحقق من رابط الإعلان${l.date_verified ? " (" + esc(l.date_verified) + ")" : ""}`;
    if (l.verification === "index") return "مرصود في نتائج البحث — لم يُفتح الرابط";
    return "لم يتم التحقق";
  }

  $("openCompare").addEventListener("click", () => {
    if (!cmp.length) return;
    compareContent.innerHTML = `
      <table class="cmp-table">
        <tr><th scope="row">العقار</th>${cmp.map((id) => {
          const l = byId(id);
          return `<td><strong><a href="./property-${esc(id)}.html">${esc(l.title)}</a></strong></td>`;
        }).join("")}</tr>
        ${specRow("الصورة", (l) => {
          const real = l.photos && l.photos.length && l.photo_real;
          return real
            ? `<img src="${esc(l.photos[0])}" alt="${esc(l.title)}" loading="lazy">`
            : `<span style="font-size:.8rem;color:var(--muted)">صورة توضيحية — لا توجد صورة للعقار</span>`;
        })}
        ${specRow("الثمن", (l) => `<b>${fmtPrice(l.price)}</b>`)}
        ${specRow("المساحة", (l) => l.area ? esc(l.area) + " م²" : "–")}
        ${specRow("ثمن المتر", (l) => { const p = ppm(l); return p ? fmtNum(p) + " درهم/م²" : "–"; })}
        ${specRow("مقارنة بالمتوسط", (l) => {
          const d = dealPct(l);
          return d != null ? `<b style="color:var(--orange-dark)">أقل بـ${d}% من متوسط المدينة</b>` : "–";
        })}
        ${specRow("الغرف / الحمامات", (l) => `${l.rooms != null ? esc(l.rooms) : "–"} / ${l.bathrooms != null ? esc(l.bathrooms) : "–"}`)}
        ${specRow("المدينة / الحي", (l) => esc(l.city) + (l.neighborhood ? " — " + esc(l.neighborhood) : ""))}
        ${specRow("النوع", (l) => esc(l.type || "–"))}
        ${specRow("الحالة", (l) => esc(statusLabel(l.status)))}
        ${specRow("التحقق", (l) => esc(verifyLabel(l)))}
        ${specRow("المصدر", (l) => esc(l.agency_direct ? "إعلان الوكالة" : (l.source_name || "مصدر خارجي")))}
      </table>
      <p class="note">المعلومات للمقارنة الأولية فقط — تحقق من رابط المصدر الأصلي لكل إعلان قبل أي التزام.</p>`;
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
    // الهمزات: ثمن المتر أقل من متوسط المدينة
    const deals = LISTINGS.filter((l) => l.status !== "unavailable" && isDeal(l))
      .sort((a, b) => dealPct(b) - dealPct(a));
    renderGrid($("dealsGrid"), deals, true);

    // عقارات الوكالة
    renderGrid($("agencyGrid"), LISTINGS.filter((l) => l.agency_direct), true);

    // مؤشرات السوق
    $("medianGrid").innerHTML = Object.entries(SOUQ_CONFIG.cityMedians).map(([c, m]) => `
      <div class="median-card"><span>${esc(c)}</span><strong>${fmtNum(m)} درهم/م²</strong>
      <span>متوسط مرجعي داخلي للمقارنة</span></div>`).join("");

    // إحصائيات
    $("statCount").textContent = LISTINGS.length;
    $("statCities").textContent = cities.length;
    $("statDeals").textContent = deals.length;

    // روابط المدن في الفوتر
    $("cityLinks").innerHTML = cities.slice(0, 8).map((c) =>
      `<li><a href="./index.html?city=${encodeURIComponent(c)}">عقارات ${esc(c)}</a></li>`).join("");

    $("year").textContent = new Date().getFullYear();
    $("dataUpdated").textContent = SOUQ_CONFIG.dataUpdated || "–";
  }

  /* ---------- حاسبة القرض ---------- */
  const mForm = $("mortgageForm"), calcError = $("calcError");
  function calcMortgage() {
    const price = parseFloat($("homePrice").value);
    const down = parseFloat($("downPayment").value) || 0;
    const years = parseFloat($("years").value);
    const rate = parseFloat($("rate").value);
    $("yearsLabel").textContent = `${years} سنة`;
    $("rateLabel").textContent = `${rate.toFixed(2)}%`;

    let err = "";
    if (!(price > 0)) err = "المرجو إدخال ثمن عقار موجب.";
    else if (down < 0) err = "التسبيق لا يمكن أن يكون سالباً.";
    else if (down > price) err = "التسبيق لا يمكن أن يتجاوز ثمن العقار.";

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
    // تكاليف تقديرية: موثق ~1% + تأمين تقريبي + رسوم ملف
    const extra = price * 0.01 + loan * 0.003 * years + 3000;

    $("monthlyPayment").textContent = fmtPrice(monthly);
    $("loanAmount").textContent = fmtPrice(loan);
    $("interestTotal").textContent = fmtPrice(interest);
    $("loanRatio").textContent = ratio.toFixed(1) + "%";
    $("extraCosts").textContent = "≈ " + fmtPrice(extra);
  }
  mForm.addEventListener("input", calcMortgage);

  /* ---------- نموذج طلب عقار → واتساب (بدون إرسال تلقائي) ---------- */
  $("requestForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const err = $("reqError");
    const v = (id) => $(id).value.trim();
    const name = v("rName"), phone = v("rPhone"), city = v("rCity"), budget = parseFloat(v("rBudget"));

    let msg = "";
    if (!name) msg = "المرجو إدخال الاسم الكامل.";
    else if (!/^0[67]\d{8}$/.test(phone.replace(/[\s-]/g, ""))) msg = "المرجو إدخال رقم هاتف مغربي صحيح (مثال: 0612345678).";
    else if (!city) msg = "المرجو إدخال المدينة المطلوبة.";
    else if (!(budget > 0)) msg = "المرجو إدخال ميزانية صحيحة.";
    else if (!$("rConsent").checked) msg = "المرجو الموافقة على استعمال بياناتك للتواصل معك.";
    if (msg) { err.textContent = msg; return; }
    err.textContent = "";

    const lines = [
      "طلب عقار جديد من موقع سوق بيع العقار المغربي:",
      `الاسم: ${name}`,
      `الهاتف: ${phone}`,
      `المدينة: ${city}`,
      v("rHoods") ? `الأحياء: ${v("rHoods")}` : null,
      `الميزانية: ${fmtPrice(budget)}`,
      v("rRooms") ? `الغرف: ${v("rRooms")}+` : null,
      v("rType") ? `النوع: ${v("rType")}` : null,
      `العملية: ${v("rDeal") || "شراء"}`,
      v("rTime") ? `وقت التواصل: ${v("rTime")}` : null,
      v("rNotes") ? `ملاحظات: ${v("rNotes")}` : null
    ].filter(Boolean);

    window.open(`https://wa.me/212693981822?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener");
  });

  /* ---------- تهيئة ---------- */
  applyFilters();
  renderFavs();
  renderSections();
  updateCompareBar();
  calcMortgage();
})();
