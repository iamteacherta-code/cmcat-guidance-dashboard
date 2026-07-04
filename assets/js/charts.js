/* =====================================================================
   charts.js — ตัวช่วยวาดกราฟด้วย SVG (ไม่พึ่งไลบรารีภายนอก ทำงานออฟไลน์)
   ===================================================================== */
const Chart = (() => {

  const NS = "http://www.w3.org/2000/svg";
  const PALETTE = ["#2e7d32", "#66bb6a", "#f9a825", "#ef6c00", "#0277bd",
                   "#8e24aa", "#00897b", "#c62828", "#5d4037", "#546e7a"];

  const fmt = n => n.toLocaleString("th-TH");
  const el = (tag, attrs = {}, text) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  };
  const svg = (w, h) => el("svg", {
    viewBox: `0 0 ${w} ${h}`, class: "chart", preserveAspectRatio: "xMidYMid meet",
    role: "img"
  });

  /* ---------- กราฟเส้น (แนวโน้ม) ---------- */
  function line(container, data, opts = {}) {
    const W = 720, H = 340, m = { t: 30, r: 24, b: 44, l: 56 };
    const s = svg(W, H);
    const xs = data.map(d => d.year);
    const ys = data.map(d => d.total);
    const maxY = opts.max || Math.ceil(Math.max(...ys) / 100) * 100;
    const minY = 0;
    const px = i => m.l + (W - m.l - m.r) * (i / (data.length - 1));
    const py = v => H - m.b - (H - m.t - m.b) * ((v - minY) / (maxY - minY));

    // เส้นแนวนอน + ป้ายแกน Y
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const v = minY + (maxY - minY) * i / steps;
      const y = py(v);
      s.appendChild(el("line", { x1: m.l, y1: y, x2: W - m.r, y2: y, class: "grid" }));
      s.appendChild(el("text", { x: m.l - 10, y: y + 4, class: "axis-y" }, fmt(Math.round(v))));
    }
    // พื้นที่ใต้เส้น
    let area = `M ${px(0)} ${py(ys[0])}`;
    ys.forEach((v, i) => area += ` L ${px(i)} ${py(v)}`);
    area += ` L ${px(ys.length - 1)} ${py(minY)} L ${px(0)} ${py(minY)} Z`;
    s.appendChild(el("path", { d: area, fill: "url(#areaGrad)", opacity: .18 }));
    // gradient
    const defs = el("defs");
    const g = el("linearGradient", { id: "areaGrad", x1: 0, y1: 0, x2: 0, y2: 1 });
    g.appendChild(el("stop", { offset: "0%", "stop-color": "#2e7d32" }));
    g.appendChild(el("stop", { offset: "100%", "stop-color": "#2e7d32", "stop-opacity": 0 }));
    defs.appendChild(g); s.appendChild(defs);
    // เส้นหลัก
    let d = "";
    ys.forEach((v, i) => d += (i ? " L " : "M ") + px(i) + " " + py(v));
    s.appendChild(el("path", { d, class: "line-path" }));
    // จุด + ป้ายค่า + ป้ายแกน X
    ys.forEach((v, i) => {
      s.appendChild(el("circle", { cx: px(i), cy: py(v), r: 4.5, class: "dot" }));
      s.appendChild(el("text", { x: px(i), y: py(v) - 12, class: "point-label" }, fmt(v)));
      s.appendChild(el("text", { x: px(i), y: H - m.b + 20, class: "axis-x" }, xs[i]));
    });
    mount(container, s);
  }

  /* ---------- กราฟแท่งซ้อน (stacked) แนวตั้ง ---------- */
  function stacked(container, cats, series, opts = {}) {
    const W = 720, H = 360, m = { t: 24, r: 16, b: 46, l: 48 };
    const s = svg(W, H);
    const totals = cats.map((_, ci) => series.reduce((a, se) => a + se.values[ci], 0));
    const maxY = opts.max || Math.ceil(Math.max(...totals) / 50) * 50 || 10;
    const bw = (W - m.l - m.r) / cats.length;
    const barW = Math.min(84, bw * 0.55);
    const py = v => H - m.b - (H - m.t - m.b) * (v / maxY);

    for (let i = 0; i <= 5; i++) {
      const v = maxY * i / 5, y = py(v);
      s.appendChild(el("line", { x1: m.l, y1: y, x2: W - m.r, y2: y, class: "grid" }));
      s.appendChild(el("text", { x: m.l - 8, y: y + 4, class: "axis-y" }, fmt(Math.round(v))));
    }
    cats.forEach((c, ci) => {
      const cx = m.l + bw * ci + bw / 2;
      let acc = 0;
      series.forEach((se, si) => {
        const v = se.values[ci];
        if (v <= 0) { acc += v; return; }
        const y0 = py(acc), y1 = py(acc + v);
        const r = el("rect", {
          x: cx - barW / 2, y: y1, width: barW, height: Math.max(0, y0 - y1),
          fill: se.color || PALETTE[si], rx: 2, class: "bar"
        });
        r.appendChild(el("title", {}, `${c} · ${se.name}: ${fmt(v)}`));
        s.appendChild(r);
        if (y0 - y1 > 16) s.appendChild(el("text", { x: cx, y: (y0 + y1) / 2 + 4, class: "bar-in" }, fmt(v)));
        acc += v;
      });
      s.appendChild(el("text", { x: cx, y: py(acc) - 8, class: "point-label" }, fmt(totals[ci])));
      s.appendChild(el("text", { x: cx, y: H - m.b + 20, class: "axis-x" }, c));
    });
    mount(container, s, legend(series));
  }

  /* ---------- กราฟแท่งแนวนอน ---------- */
  function hbar(container, data, opts = {}) {
    const rowH = 34, m = { t: 8, r: 56, b: 8, l: opts.labelW || 200 };
    const W = 720, H = m.t + m.b + data.length * rowH;
    const s = svg(W, H);
    const max = Math.max(...data.map(d => d.value)) || 1;
    const bw = W - m.l - m.r;
    data.forEach((d, i) => {
      const y = m.t + i * rowH;
      const w = bw * (d.value / max);
      s.appendChild(el("text", { x: m.l - 10, y: y + rowH / 2 + 4, class: "hbar-label" }, d.label));
      s.appendChild(el("rect", { x: m.l, y: y + 5, width: bw, height: rowH - 14, class: "hbar-bg", rx: 4 }));
      const r = el("rect", { x: m.l, y: y + 5, width: Math.max(2, w), height: rowH - 14, rx: 4,
        fill: opts.color || PALETTE[i % PALETTE.length] });
      s.appendChild(r);
      s.appendChild(el("text", { x: m.l + Math.max(2, w) + 8, y: y + rowH / 2 + 4, class: "hbar-val" },
        fmt(d.value) + (opts.pct ? ` (${Math.round(d.value / opts.pct * 100)}%)` : "")));
    });
    mount(container, s);
  }

  /* ---------- โดนัท ---------- */
  function donut(container, data, opts = {}) {
    const size = 220, r = 92, ir = 58, cx = size / 2, cy = size / 2;
    const total = data.reduce((a, d) => a + d.value, 0) || 1;
    const s = svg(size, size);
    let a0 = -Math.PI / 2;
    data.forEach((d, i) => {
      const frac = d.value / total;
      const a1 = a0 + frac * Math.PI * 2;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const p = (rad, ang) => [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)];
      const [x0, y0] = p(r, a0), [x1, y1] = p(r, a1);
      const [x2, y2] = p(ir, a1), [x3, y3] = p(ir, a0);
      const path = el("path", {
        d: `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${ir} ${ir} 0 ${large} 0 ${x3} ${y3} Z`,
        fill: d.color || PALETTE[i % PALETTE.length], class: "slice"
      });
      path.appendChild(el("title", {}, `${d.label}: ${fmt(d.value)} (${Math.round(frac * 100)}%)`));
      s.appendChild(path);
      a0 = a1;
    });
    s.appendChild(el("text", { x: cx, y: cy - 4, class: "donut-num" }, fmt(opts.centerValue != null ? opts.centerValue : total)));
    s.appendChild(el("text", { x: cx, y: cy + 18, class: "donut-cap" }, opts.centerLabel || "รวม"));
    const wrap = document.createElement("div");
    wrap.className = "donut-wrap";
    wrap.appendChild(s);
    wrap.appendChild(legend(data.map((d, i) => ({ name: d.label, color: d.color || PALETTE[i % PALETTE.length], value: d.value }))));
    container.innerHTML = "";
    container.appendChild(wrap);
  }

  /* ---------- คำอธิบายสี ---------- */
  function legend(series) {
    const box = document.createElement("div");
    box.className = "legend";
    series.forEach((se, i) => {
      const item = document.createElement("span");
      item.className = "legend-item";
      const sw = document.createElement("i");
      sw.style.background = se.color || PALETTE[i % PALETTE.length];
      item.appendChild(sw);
      item.appendChild(document.createTextNode(
        se.name + (se.value != null ? ` (${fmt(se.value)})` : "")));
      box.appendChild(item);
    });
    return box;
  }

  function mount(container, s, extra) {
    container.innerHTML = "";
    container.appendChild(s);
    if (extra) container.appendChild(extra);
  }

  return { line, stacked, hbar, donut, PALETTE, fmt };
})();
