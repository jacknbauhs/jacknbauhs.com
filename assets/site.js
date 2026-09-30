/* jacknbauhs.com · reads the board's JSON (the same files board.jacknbauhs.com renders) and fills the live parts.
   Nothing here is typed in by hand: the tiles, the ticker, the verdicts and the hero all come from Mission Control's feed.
   Every section fails on its own: a file that doesn't load leaves its own slot in its no-JS state. */
(function () {
  "use strict";
  var SITE = window.SITE || {};
  var BOARD = (SITE.board || "https://board.jacknbauhs.com").replace(/\/$/, "");
  var BASE = SITE.base || "";
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmtDate(iso) { if (!iso) return ""; var d = String(iso).slice(0, 10).split("-"); return MONTHS[+d[1] - 1] + " " + (+d[2]); }
  function monthName(iso) { return MONTHS_LONG[+String(iso).slice(5, 7) - 1]; }
  function pct(n, digits) { if (n == null || isNaN(n)) return "—"; var s = n > 0 ? "+" : (n < 0 ? "−" : ""); return s + Math.abs(n).toFixed(digits || 0) + "%"; }
  function money(c) { if (c == null) return "—"; var n = c / 100; return "$" + (Math.abs(n - Math.round(n)) < 0.005 ? Math.round(n).toLocaleString("en-US") : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })); }
  function sentence(t) { t = String(t || "").trim(); if (!t) return ""; t = t.charAt(0).toUpperCase() + t.slice(1); return /[.!?]$/.test(t) ? t : t + "."; }
  function load(name) {
    return fetch(BOARD + "/data/" + name + ".json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  /* ---------- the four tiles ---------- */
  function tileHtml(href, k, v, vClass, small, l1, l2, src) {
    return '<a class="tile" href="' + esc(href) + '"><span class="k">' + esc(k) + '</span>' +
      '<span class="v ' + esc(vClass || "") + '">' + esc(v) + (small ? '<small>' + esc(small) + '</small>' : '') + '</span>' +
      '<span class="l1">' + esc(l1) + '</span>' + (l2 ? '<span class="l2">' + esc(l2) + '</span>' : '') +
      '<span class="src">' + esc(src) + '</span></a>';
  }
  function buildTiles(d) {
    var f = d.file || {}, asOf = f.as_of || f.pulled, out = [];
    var rows = f.rows || [], row = null;
    for (var i = 0; i < rows.length; i++) if (rows[i].id === f.featured) row = rows[i];
    if (!row && rows.length) row = rows[0];
    if (row && asOf) {
      out.push(tileHtml(BOARD + "/#moving", "This week's file", pct(row.change_pct), (row.change_pct || 0) >= 0 ? "up" : "down", "",
        row.name + " " + row.tier, sentence(row.window_label) + " " + row.sales + " sold records, " + row.flagged + " kept out.", "130point · " + fmtDate(asOf)));
    } else {
      out.push(tileHtml(BOARD + "/#moving", "This week's file", "—", "", "", "Every sale checked before it counts.", "", "board.jacknbauhs.com"));
    }
    var head = (f.flags && f.flags.headline) || {}, feed = d.flags || {}, fh = feed.headline || {};
    if (head.value != null && asOf) {
      out.push(tileHtml(BOARD + "/#flags", "What got caught", String(head.value), "flag", "of " + head.of, sentence(head.label), "Each one is labeled on the board with the reason.", "130point · " + fmtDate(asOf)));
    } else if (fh.value != null && !feed.pending) {
      out.push(tileHtml(BOARD + "/#flags", "What got caught", pct(fh.value).replace("+", ""), "flag", "", sentence(fh.label || "of sold dollar volume flagged"), "Suspect pumps, washes and data errors, out before the math.", "Mission Control · " + fmtDate(feed.as_of)));
    } else {
      out.push(tileHtml(BOARD + "/#flags", "What got caught", "—", "flag", "", "Flags start with the first checked sales.", "", "board.jacknbauhs.com"));
    }
    var calls = ((d.calls || {}).items || []).filter(function (c) { return c.on_record !== false && c.status !== "withdrawn"; });
    if (calls.length) {
      var open = calls.filter(function (c) { return (c.status || "open") === "open"; });
      var hits = calls.filter(function (c) { return c.status === "hit"; }).length, misses = calls.filter(function (c) { return c.status === "miss"; }).length;
      var l1;
      if (open.length) { var nxt = open.map(function (c) { return c.check_date; }).sort()[0]; l1 = open.length === calls.length ? "Check me " + fmtDate(nxt) + "." : open.length + " open, check " + fmtDate(nxt) + "."; }
      else l1 = "All checked.";
      var dated = calls.map(function (c) { return c.dated; }).sort().pop();
      out.push(tileHtml(BOARD + "/#calls", "Calls on the record", String(calls.length), "", calls.length === 1 ? "call" : "calls", l1, (hits || misses ? hits + " hit, " + misses + " missed so far. " : "") + "Misses stay up.", "Dated " + fmtDate(dated)));
    } else {
      out.push(tileHtml(BOARD + "/#calls", "Calls on the record", "0", "", "calls", "The first call goes up the day it goes public.", "Misses stay up.", "board.jacknbauhs.com"));
    }
    var dr = d.drops || {}, dAs = (dr.as_of || new Date().toISOString()).slice(0, 10);
    var up = (dr.items || []).filter(function (i) { return String(i.date || "").slice(0, 10) >= dAs; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    if (up.length) {
      var nd = up[0], when = nd.date_precision === "month" ? monthName(nd.date) : fmtDate(nd.date);
      out.push(tileHtml(BOARD + "/#drops", "Next drop", when, "accent", "", nd.name, (nd.game ? nd.game + ". " : "") + (nd.detail || ""), "Checked " + fmtDate(dAs)));
    } else {
      out.push(tileHtml(BOARD + "/#drops", "Next drop", "—", "accent", "", "Nothing dated on the calendar right now.", "", "board.jacknbauhs.com"));
    }
    return out.join("");
  }

  /* ---------- the ticker ---------- */
  function buildTicker(d) {
    var items = [];
    var mv = (d.movers || {}).items || [];
    if (mv.length) {
      mv.slice(0, 10).forEach(function (m) {
        var c = m.clean_change_pct != null ? m.clean_change_pct : m.change_pct;
        items.push(esc(m.name + (m.tier ? " " + m.tier : "")) + ' <span class="' + (c >= 0 ? "up" : "down") + '">' + (c >= 0 ? "▲" : "▼") + " " + esc(pct(c, 1).replace(/^[+−]/, "")) + "</span>" + (m.window_label ? ' <span class="muted">' + esc(m.window_label) + "</span>" : ""));
      });
    }
    var f = d.file || {};
    (f.rows || []).forEach(function (r) {
      var c = r.change_pct || 0;
      items.push(esc(r.name + " " + r.tier) + ' <span class="' + (c >= 0 ? "up" : "down") + '">' + (c >= 0 ? "▲" : "▼") + " " + esc(pct(c).replace(/^[+−]/, "")) + '</span> <span class="muted">' + esc(r.window_label || "clean median") + "</span>");
    });
    var head = (f.flags && f.flags.headline) || {};
    if (head.value != null) items.push('<span class="flag">' + esc(head.value + " of " + head.of) + "</span> " + esc(head.label || "sold records kept out of the math"));
    var calls = ((d.calls || {}).items || []).filter(function (c) { return c.on_record !== false && c.status !== "withdrawn"; });
    if (calls.length) {
      var open = calls.filter(function (c) { return (c.status || "open") === "open"; });
      var nxt = open.length ? open.map(function (c) { return c.check_date; }).sort()[0] : null;
      items.push('<span class="warn">' + calls.length + (calls.length === 1 ? " call" : " calls") + "</span> on the record" + (nxt ? " · check " + esc(fmtDate(nxt)) : ""));
    }
    var dr = d.drops || {}, dAs = (dr.as_of || new Date().toISOString()).slice(0, 10);
    (dr.items || []).filter(function (i) { return String(i.date || "").slice(0, 10) >= dAs; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }).slice(0, 4).forEach(function (i) {
      items.push('<span class="accent">' + esc(i.date_precision === "month" ? monthName(i.date) : fmtDate(i.date)) + "</span> " + esc(i.name));
    });
    var gen = (d.meta || {}).generated_at;
    items.push('<span class="muted">Mission Control · updated ' + esc(gen ? fmtDate(gen) : "nightly") + " · board.jacknbauhs.com</span>");
    return items;
  }

  /* ---------- verdicts (Open or Sealed) ---------- */
  function buildVerdicts(v, ripEv) {
    var items = ((v || {}).items || []).filter(function (i) { return i.status !== "withdrawn"; }).sort(function (a, b) { return a.published < b.published ? 1 : -1; }).slice(0, 2);
    if (!items.length) return "";
    var byId = {}; ((ripEv || {}).products || []).forEach(function (p) { byId[p.id] = p; });
    return items.map(function (i) {
      var live = byId[i.product_id];
      return '<article class="verdict"><div class="top"><span class="kicker" style="margin:0">Open or Sealed · #' + esc(String(i.id).replace(/^v/, "")) + '</span><span class="stamp ' + esc(i.verdict) + '">' + esc(i.verdict) + "</span></div>" +
        "<h4>" + esc(i.product) + "</h4><p class=\"line\">" + esc(i.deciding_line) + "</p>" +
        '<div class="nums"><div>EV<b>' + esc(money(i.ev_cents)) + "</b></div><div>Sealed<b>" + esc(money(i.sealed_cents)) + "</b></div><div>P(hit $50+)<b>" + esc(Math.round((i.p_hit_50 || 0) * 100) + "%") + "</b></div></div>" +
        '<p class="src mono">Published ' + esc(fmtDate(i.published)) + " · checked " + esc(fmtDate(i.check_date)) + (live && live.ratio_market != null ? " · live EV ratio " + esc(Number(live.ratio_market).toFixed(2)) : "") + (i.video_url ? ' · <a href="' + esc(i.video_url) + '">watch</a>' : "") + "</p></article>";
    }).join("");
  }

  /* ---------- videos ---------- */
  function buildVideos(v) {
    var items = ((v || {}).items || []).slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 3);
    if (!items.length) return "";
    return items.map(function (i) {
      var poster = i.poster ? '<img src="' + esc(/^https?:/.test(i.poster) ? i.poster : BOARD + "/assets/posters/" + i.poster) + '" alt="" loading="lazy">' : '<div class="poster-placeholder"></div>';
      return '<a class="poster-card" href="' + esc(i.url) + '"><div class="poster-frame">' + poster + "</div><h3>" + esc(i.title) + '</h3><p class="meta">' + esc((i.show || "").replace(/-/g, " ")) + " · " + esc(fmtDate(i.date)) + "</p></a>";
    }).join("");
  }

  /* ---------- the hero constellation: the file's cards, the calls and the drops as a slow-moving network ---------- */
  function constellation(canvas, d) {
    var nodes = [];
    var f = d.file || {};
    (f.rows || []).forEach(function (r) { nodes.push({ a: r.name + " " + r.tier, b: pct(r.change_pct), c: (r.change_pct || 0) >= 0 ? "#34D399" : "#F87171", w: 1.4 }); });
    ((d.calls || {}).items || []).filter(function (c) { return c.on_record !== false && c.status !== "withdrawn"; }).forEach(function (c) { nodes.push({ a: "Call #" + c.id, b: "check " + fmtDate(c.check_date), c: "#FCD34D", w: 1 }); });
    ((d.drops || {}).items || []).slice(0, 4).forEach(function (i) { nodes.push({ a: i.name, b: i.date_precision === "month" ? monthName(i.date) : fmtDate(i.date), c: "#C4B5FD", w: 1 }); });
    var head = (f.flags && f.flags.headline) || {};
    if (head.value != null) nodes.push({ a: "Kept out of the math", b: head.value + " of " + head.of, c: "#F472B6", w: 1.2 });
    ((d.movers || {}).items || []).slice(0, 6).forEach(function (m) { var c = m.clean_change_pct != null ? m.clean_change_pct : m.change_pct; nodes.push({ a: m.name, b: pct(c, 1), c: c >= 0 ? "#34D399" : "#F87171", w: 1 }); });
    if (!nodes.length) return;
    var ctx = canvas.getContext("2d"), W, Hh, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var seed = 7; function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    var wide = window.innerWidth > 820;
    var pts = nodes.map(function (n, i) { return { n: n, x: wide ? 0.5 + rnd() * 0.44 : 0.06 + rnd() * 0.8, y: 0.08 + rnd() * 0.8, dx: (rnd() - 0.5) * 0.00012, dy: (rnd() - 0.5) * 0.00012, ph: rnd() * 6.28 }; });
    var stars = []; for (var s = 0; s < 70; s++) stars.push({ x: rnd(), y: rnd(), r: 0.6 + rnd() * 1.2, o: 0.15 + rnd() * 0.5 });
    function size() { var r = canvas.getBoundingClientRect(); W = r.width; Hh = r.height; canvas.width = W * dpr; canvas.height = Hh * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    var running = true, t0 = performance.now();
    function frame(now) {
      var t = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, Hh);
      stars.forEach(function (s) { ctx.globalAlpha = s.o; ctx.fillStyle = "#ECEAF6"; ctx.beginPath(); ctx.arc(s.x * W, s.y * Hh, s.r, 0, 6.28); ctx.fill(); });
      ctx.globalAlpha = 1;
      var P = pts.map(function (p) { return { x: (p.x + Math.sin(t * 0.11 + p.ph) * 0.012) * W, y: (p.y + Math.cos(t * 0.09 + p.ph) * 0.014) * Hh, p: p }; });
      ctx.lineWidth = 1;
      for (var i = 0; i < P.length; i++) for (var j = i + 1; j < P.length; j++) {
        var dx = P[i].x - P[j].x, dy = P[i].y - P[j].y, dist = Math.sqrt(dx * dx + dy * dy), max = Math.min(W, 900) * 0.34;
        if (dist < max) { ctx.globalAlpha = (1 - dist / max) * 0.35; ctx.strokeStyle = "#8B5CF6"; ctx.beginPath(); ctx.moveTo(P[i].x, P[i].y); ctx.lineTo(P[j].x, P[j].y); ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
      P.forEach(function (q) {
        var n = q.p.n;
        ctx.fillStyle = n.c; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(q.x, q.y, 3 * n.w, 0, 6.28); ctx.fill();
        ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(q.x, q.y, 9 * n.w, 0, 6.28); ctx.fill();
        ctx.globalAlpha = 0.85; ctx.font = "500 12px 'Geist Mono', ui-monospace, monospace";
        var tw = Math.max(ctx.measureText(n.a).width, ctx.measureText(n.b).width), left = q.x + 12 + tw > W - 12;
        ctx.textAlign = left ? "right" : "left"; var tx = left ? q.x - 12 : q.x + 12;
        ctx.fillStyle = "#CFCBE6"; ctx.fillText(n.a, tx, q.y - 2);
        ctx.fillStyle = n.c; ctx.fillText(n.b, tx, q.y + 13); ctx.textAlign = "left";
      });
      ctx.globalAlpha = 1;
      if (running && !reduced) requestAnimationFrame(frame);
    }
    size(); window.addEventListener("resize", size);
    if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { var was = running; running = e[0].isIntersecting; if (running && !was && !reduced) requestAnimationFrame(frame); }).observe(canvas);
    requestAnimationFrame(frame);
  }

  /* ---------- go ---------- */
  var tilesEls = document.querySelectorAll("[data-board-tiles]");
  var tickerEl = document.querySelector("[data-ticker]");
  var verdictEls = document.querySelectorAll("[data-verdicts]");
  var videosEls = document.querySelectorAll("[data-videos]");
  var canvas = document.querySelector("[data-constellation]");
  var updatedEls = document.querySelectorAll("[data-board-updated]");
  if (!tilesEls.length && !tickerEl && !verdictEls.length && !videosEls.length && !canvas) return;

  Promise.all(["meta", "file", "calls", "drops", "flags", "movers", "verdicts", "videos", "rip_ev"].map(load)).then(function (r) {
    var d = { meta: r[0], file: r[1], calls: r[2], drops: r[3], flags: r[4], movers: r[5], verdicts: r[6], videos: r[7], rip_ev: r[8] };
    var any = d.file || d.calls || d.drops || d.meta;
    if (any) {
      var tiles = buildTiles(d);
      tilesEls.forEach(function (el) { el.innerHTML = tiles; });
      if (d.meta && d.meta.generated_at) updatedEls.forEach(function (el) { el.textContent = "Mission Control published this at " + fmtDate(d.meta.generated_at) + ". It publishes every morning at 8:15 AM Central; every number carries its source and its date."; });
      if (tickerEl) {
        var items = buildTicker(d), html = items.map(function (i) { return '<span class="ticker-item">' + i + "</span>"; }).join("");
        tickerEl.innerHTML = '<div class="ticker-track">' + html + (reduced ? "" : html) + "</div>";
      }
      if (canvas) constellation(canvas, d);
    } else if (tickerEl) {
      tickerEl.innerHTML = '<div class="ticker-track"><span class="ticker-item muted">The board is at board.jacknbauhs.com · Mission Control publishes every morning at 8:15 AM Central</span></div>';
    }
    var vh = buildVerdicts(d.verdicts, d.rip_ev);
    verdictEls.forEach(function (el) { el.innerHTML = vh || (el.getAttribute("data-verdicts-empty") ? '<div class="empty">' + esc(el.getAttribute("data-verdicts-empty")) + "</div>" : ""); });
    var vids = buildVideos(d.videos);
    videosEls.forEach(function (el) { el.innerHTML = vids; var sec = el.closest("[data-videos-section]"); if (sec) sec.hidden = !vids; });
  });
})();
