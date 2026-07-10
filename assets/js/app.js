/* =====================================================================
   app.js — สร้างเนื้อหาทุกหน้า + ระบบนำทาง
   ===================================================================== */
(() => {
  const $ = s => document.querySelector(s);
  // นำข้อมูลที่นำเข้า (ถ้ามี) มาทับ "ก่อน" คำนวณค่าใด ๆ ด้านล่าง
  if (typeof Tools !== "undefined") Tools.applyOverride();
  // เผยแพร่เวอร์ชันข้อมูลของไฟล์ให้ตัวโหลดคลาวด์ใช้เทียบ (กันข้อมูลคลาวด์เก่าค้าง)
  window.__fileDataVersion = (typeof CMCAT !== "undefined" && CMCAT.dataVersion) || 0;
  const fmt = Chart.fmt;
  const C = { study: "#2e7d32", work: "#0277bd", seek: "#ef6c00", other: "#9e9e9e",
              pvc: "#2e7d32", pvs: "#66bb6a", direct: "#0277bd", online: "#f9a825" };

  /* ---------- helper คำนวณ ---------- */
  const sum = a => a.reduce((x, y) => x + y, 0);

  // การรับสมัคร: รวมยอดต่าง ๆ (คำนวณใหม่ทุกครั้งที่ข้อมูลเปลี่ยน)
  const roundTotal = r => r.pvc.direct + r.pvc.online + r.pvs.direct + r.pvs.online;
  let adm, applied, reportedTotal, gradYears;
  function computeDerived() {
    adm = CMCAT.admission2569;
    applied = {
      pvc: sum(adm.rounds.map(r => r.pvc.direct + r.pvc.online)),
      pvs: sum(adm.rounds.map(r => r.pvs.direct + r.pvs.online)),
      direct: sum(adm.rounds.map(r => r.pvc.direct + r.pvs.direct)),
      online: sum(adm.rounds.map(r => r.pvc.online + r.pvs.online))
    };
    applied.all = applied.pvc + applied.pvs;
    reportedTotal = adm.reported.pvc + adm.reported.pvs;
    gradYears = Object.keys(CMCAT.graduates).map(Number).sort();
  }

  // ผู้จบ: สรุปยอดรวมต่อปี
  function gradTotals(year) {
    const rows = CMCAT.graduates[year].rows;
    const t = { total: 0, tracked: 0, study: 0, seek: 0, work: 0, other: 0 };
    rows.forEach(r => {
      t.total += r[1]; t.tracked += r[2]; t.study += r[3];
      t.seek += r[4]; t.work += r[5]; t.other += r[6];
    });
    return t;
  }

  /* ================= 1. ภาพรวม ================= */
  function overview() {
    const enr = CMCAT.enrollment;
    const cur = enr[enr.length - 1], first = enr[0], prev = enr[enr.length - 2];
    const dropPct = Math.round((first.total - cur.total) / first.total * 100);
    const yoyPct = Math.round((cur.total - prev.total) / prev.total * 100);
    const gy = gradYears[gradYears.length - 1]; // ปีล่าสุดที่มีข้อมูลผู้จบ (อัตโนมัติ)
    const g = gradTotals(gy);
    const successRate = Math.round((g.study + g.work) / g.tracked * 100);
    const svLv = CMCAT.survey.level;

    const cards = [
      { big: fmt(cur.total), cap: `นักเรียน–นักศึกษาในระบบ ปี ${cur.year}`, sub: `${yoyPct}% เทียบปีก่อน`, tone: "down" },
      { big: fmt(reportedTotal), cap: "รายงานตัวเข้าเรียนใหม่ ปี 2569", sub: `จากผู้สมัคร ${fmt(applied.all)} คน`, tone: "info" },
      { big: fmt(CMCAT.survey.total), cap: "ผู้ตอบแบบสำรวจการตัดสินใจ", sub: `${svLv[0].label} ${svLv[0].value} · ${svLv[1] ? svLv[1].label + " " + svLv[1].value : ""}`, tone: "info" },
      { big: successRate + "%", cap: `ผู้จบ ปี ${gy} ศึกษาต่อ/มีงานทำ`, sub: `ติดตามได้ ${fmt(g.tracked)} คน`, tone: "up" }
    ];
    $("#kpis").innerHTML = cards.map(c => `
      <div class="kpi kpi-${c.tone}">
        <div class="kpi-big">${c.big}</div>
        <div class="kpi-cap">${c.cap}</div>
        <div class="kpi-sub">${c.sub}</div>
      </div>`).join("");

    $("#overviewNote").innerHTML = `
      <strong>ภาพรวมโดยสรุป:</strong> จำนวนนักเรียนในระบบลดลง
      <b class="neg">${dropPct}%</b> ในรอบ 10 ปี (จาก ${fmt(first.total)} เหลือ ${fmt(cur.total)} คน)
      สวนทางกับ <b class="pos">คุณภาพผลผลิต</b> ที่ผู้สำเร็จการศึกษาได้ศึกษาต่อหรือมีงานทำสูงถึง
      ${successRate}% — โจทย์สำคัญของงานแนะแนวคือ <b>การเพิ่มจำนวนผู้เข้าเรียนใหม่</b>
      ผ่านช่องทางที่ได้ผลจริง`;
  }

  /* ========= 1.5 แผนที่ต้นทางนักศึกษา (ภาคเหนือ) ========= */
  function lerpHex(a, b, t) {
    const h = x => [parseInt(x.slice(1, 3), 16), parseInt(x.slice(3, 5), 16), parseInt(x.slice(5, 7), 16)];
    const [r1, g1, b1] = h(a), [r2, g2, b2] = h(b);
    const m = (u, v) => Math.round(u + (v - u) * t);
    return `rgb(${m(r1, r2)},${m(g1, g2)},${m(b1, b2)})`;
  }
  function provColor(v, max) {
    if (!v) return "#eef1ee";
    const t = 0.18 + 0.82 * Math.sqrt(v / max);   // sqrt เพื่อให้จังหวัดเล็กยังเห็นสี
    return lerpHex("#c8e6c9", "#1b5e20", t);
  }
  let _mapYear = null, _selProv = null;
  const escH = s => String(s == null ? "" : s).replace(/[&<>"]/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function originMap() {
    const cfg = CMCAT.originProvinces;
    if (!cfg || !cfg.years || typeof NORTH_MAP === "undefined") return;
    const years = Object.keys(cfg.years).sort((a, b) => b - a);
    if (_mapYear == null) _mapYear = String(cfg.defaultYear || years[0]);
    if (!cfg.years[_mapYear]) _mapYear = years[0];

    const sel = $("#mapYear");
    sel.innerHTML = years.map(y => `<option value="${y}">ปี ${y}</option>`).join("");
    sel.value = _mapYear;
    sel.onchange = () => { _mapYear = sel.value; _selProv = null; draw(); };
    // ซ่อนช่องเลือกปีเมื่อมีข้อมูลเพียงปีเดียว
    const yp = sel.closest(".year-pick");
    if (yp) yp.style.display = years.length > 1 ? "" : "none";
    draw();

    function yearData() { return cfg.years[_mapYear] || {}; }
    function totals() {
      const yd = yearData(), t = {};
      Object.keys(yd).forEach(p => t[p] = yd[p].reduce((a, s) => a + (s.n || 0), 0));
      return t;
    }

    function draw() {
      const tot = totals();
      const onMap = new Set(NORTH_MAP.provinces.map(p => p.name));
      const outside = Object.keys(tot).filter(p => !onMap.has(p)).reduce((a, p) => a + tot[p], 0);
      const grand = Object.values(tot).reduce((a, b) => a + b, 0) || 1;
      const max = Math.max(1, ...NORTH_MAP.provinces.map(p => tot[p.name] || 0));

      $("#mapSub").innerHTML = `${cfg.note} · ปีการศึกษา ${_mapYear} ` +
        `<span class="muted-sm">(รวม ${fmt(grand)} คน` +
        (outside ? ` · ไม่ระบุจังหวัด ${fmt(outside)} คน` : "") + `)</span>`;

      // ---- SVG map (ทั่วประเทศ) ----
      const M = NORTH_MAP;
      let s = `<svg viewBox="${M.viewBox}" class="north-map" role="img" aria-label="แผนที่ประเทศไทย">`;
      M.provinces.forEach(p => {
        const v = tot[p.name] || 0, pct = Math.round(v / grand * 100);
        s += `<path d="${p.d}" class="prov${v ? '' : ' nodata'}" fill="${provColor(v, max)}" ` +
          `data-name="${escH(p.name)}" data-v="${v}" data-pct="${pct}"></path>`;
      });
      // ป้ายชื่อ+จำนวน เฉพาะจังหวัดที่มีข้อมูล (กันรก)
      M.provinces.forEach(p => {
        const v = tot[p.name] || 0;
        if (!v) return;
        s += `<text x="${p.c[0]}" y="${p.c[1] - 2}" class="prov-lb">${p.name}</text>`;
        s += `<text x="${p.c[0]}" y="${p.c[1] + 12}" class="prov-ct">${fmt(v)}</text>`;
      });
      s += `</svg>`;
      $("#originMapSvg").innerHTML = s;

      $("#mapLegend").innerHTML =
        `<span class="lg-cap">น้อย</span><span class="lg-bar"></span><span class="lg-cap">มาก</span>
         <span class="lg-zero"><i></i> ยังไม่มีข้อมูล · 👆 คลิกจังหวัดเพื่อดูรายชื่อโรงเรียน</span>`;

      // ---- ranked list ----
      const ranked = Object.entries(tot).sort((a, b) => b[1] - a[1]);
      const rmax = ranked.length ? ranked[0][1] : 1;
      $("#originList").innerHTML = `<h3>อันดับจังหวัดต้นทาง</h3>` +
        ranked.map(([n, v]) => `
          <div class="ori-row${n === _selProv ? " sel" : ""}" data-name="${escH(n)}">
            <span class="ori-n">${escH(n)}</span>
            <span class="ori-track"><span class="ori-fill" style="width:${v / rmax * 100}%"></span></span>
            <span class="ori-v">${fmt(v)} <b>(${Math.round(v / grand * 100)}%)</b></span>
          </div>`).join("") +
        `<div class="ori-total">รวมทั้งหมด <b>${fmt(grand)}</b> คน</div>`;

      wire(grand);
      renderSchools();
    }

    function hi(name, on) {
      const p = $("#originMapSvg").querySelector(`.prov[data-name="${CSS.escape(name)}"]`);
      if (p) p.classList.toggle("hot", on);
      const r = $("#originList").querySelector(`.ori-row[data-name="${CSS.escape(name)}"]`);
      if (r) r.classList.toggle("hot", on);
    }
    function markSel() {
      $("#originMapSvg").querySelectorAll(".prov").forEach(p => p.classList.toggle("sel", p.dataset.name === _selProv));
      $("#originList").querySelectorAll(".ori-row").forEach(r => r.classList.toggle("sel", r.dataset.name === _selProv));
    }
    function pick(name) { _selProv = name; markSel(); renderSchools(); }

    function wire(grand) {
      const tip = $("#mapTip");
      const showTip = (e, name, v, pct) => {
        tip.hidden = false;
        tip.innerHTML = `<b>${escH(name)}</b><br>${fmt(v)} คน · ${pct}% ของนักศึกษาใหม่<br><span style="opacity:.8">คลิกเพื่อดูสถานศึกษาเดิม</span>`;
        const pad = 14, w = tip.offsetWidth, h = tip.offsetHeight;
        let x = e.clientX + pad, y = e.clientY + pad;
        if (x + w > innerWidth) x = e.clientX - w - pad;
        if (y + h > innerHeight) y = e.clientY - h - pad;
        tip.style.left = x + "px"; tip.style.top = y + "px";
      };
      const hideTip = () => { tip.hidden = true; };
      $("#originMapSvg").querySelectorAll(".prov").forEach(el => {
        const name = el.dataset.name, v = +el.dataset.v, pct = +el.dataset.pct;
        const on = e => { hi(name, true); showTip(e, name, v, pct); };
        el.addEventListener("pointerenter", on);
        el.addEventListener("pointermove", on);
        el.addEventListener("pointerleave", () => { hi(name, false); hideTip(); });
        el.addEventListener("click", () => pick(name));
      });
      $("#originList").querySelectorAll(".ori-row[data-name]").forEach(row => {
        row.addEventListener("mouseenter", () => hi(row.dataset.name, true));
        row.addEventListener("mouseleave", () => hi(row.dataset.name, false));
        row.addEventListener("click", () => {
          pick(row.dataset.name);
          $("#schoolPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
      });
    }

    function renderSchools() {
      const box = $("#schoolPanel");
      box.classList.toggle("active", !!_selProv);
      if (!_selProv) {
        box.innerHTML = `<div class="sch-empty">👆 คลิกที่จังหวัดบนแผนที่ (หรือในรายการ) เพื่อดูรายชื่อ
          <b>สถานศึกษาเดิม</b> ของนักศึกษาจากจังหวัดนั้น — ช่วยครูวางแผนออกแนะแนวได้ตรงเป้า</div>`;
        return;
      }
      const schools = (yearData()[_selProv] || []).slice().sort((a, b) => (b.n || 0) - (a.n || 0));
      const total = schools.reduce((a, s) => a + (s.n || 0), 0);
      const zoneCfg = (CMCAT.eduZones || {})[_selProv];
      const head =
        `<div class="sch-head"><h3>🏫 สถานศึกษาเดิม — ${escH(_selProv)} <span class="tag">ปี ${_mapYear}</span>` +
        (zoneCfg ? ` <span class="muted-sm">· ${escH(zoneCfg.label)} · รวม ${fmt(total)} คน</span>` : ``) +
        `</h3><button class="link-btn" id="schClose">✕ ปิด</button></div>`;

      let body;
      if (!schools.length) {
        body = `<div class="sch-empty">ยังไม่มีข้อมูลสถานศึกษาเดิมของ <b>${escH(_selProv)}</b> ในปี ${_mapYear}
          <br><span class="muted-sm">เพิ่มได้ที่ data.js → originProvinces.years["${_mapYear}"]["${escH(_selProv)}"]</span></div>`;
      } else if (zoneCfg) {
        body = zonedSchools(schools, zoneCfg, total);
      } else {
        body = flatSchools(schools, total);
      }
      box.innerHTML = head + body;
      const c = $("#schClose"); if (c) c.onclick = () => pick(null);
    }

    function schoolRows(list) {
      return list.map(s => `<tr><td>${escH(s.s)}</td>
        <td class="num">${fmt(s.n || 0)}</td></tr>`).join("");
    }
    function flatSchools(schools, total) {
      return `<div class="tbl-wrap-in"><table class="tbl"><thead><tr>
        <th>โรงเรียน / สถานศึกษาเดิม</th><th class="num">จำนวน (คน)</th></tr></thead><tbody>
        ${schoolRows(schools)}
        <tr class="total-row"><td>รวม ${escH(_selProv)}</td><td class="num">${fmt(total)}</td></tr>
      </tbody></table></div>`;
    }
    // จัดกลุ่มโรงเรียนตามเขตพื้นที่การศึกษา (ตามค่า z ของแต่ละโรงเรียน)
    function zonedSchools(schools, zoneCfg, total) {
      const THNUM = n => String(n).replace(/[0-9]/g, d => "๐๑๒๓๔๕๖๗๘๙"[+d]);
      const byZone = {}; const unknown = [];
      schools.forEach(s => {
        const z = +s.z;
        if (z && zoneCfg.zones.some(zn => zn.z === z)) (byZone[z] = byZone[z] || []).push(s);
        else unknown.push(s);
      });
      const activeZones = [], emptyZones = [];
      let html = "";
      zoneCfg.zones.forEach(zn => {
        const list = byZone[zn.z];
        if (!list || !list.length) { emptyZones.push(zn.z); return; }
        activeZones.push(zn.z);
        const sub = list.reduce((a, s) => a + (s.n || 0), 0);
        html += `<div class="zone-block">
          <div class="zone-hd">
            <span class="zone-name">เขตพื้นที่การศึกษาเขต ${THNUM(zn.z)}</span>
            <span class="zone-amp">อ.${zn.amphoes.join(" · ")}</span>
            <span class="zone-sub">${fmt(sub)} คน</span>
          </div>
          <table class="tbl mini"><tbody>${schoolRows(list.sort((a, b) => (b.n || 0) - (a.n || 0)))}</tbody></table>
        </div>`;
      });
      if (unknown.length) {
        const sub = unknown.reduce((a, s) => a + (s.n || 0), 0);
        html += `<div class="zone-block">
          <div class="zone-hd other"><span class="zone-name">ไม่ระบุเขต / อื่น ๆ</span>
            <span class="zone-sub">${fmt(sub)} คน</span></div>
          <table class="tbl mini"><tbody>${schoolRows(unknown)}</tbody></table></div>`;
      }
      const legend =
        `<div class="zone-legend">
          <span class="zl ok">✅ มีผู้สมัคร ${activeZones.length ? "เขต " + activeZones.map(THNUM).join(", ") : "-"}</span>` +
        (emptyZones.length ? `<span class="zl no">⚪ ยังไม่มีผู้สมัคร เขต ${emptyZones.map(THNUM).join(", ")}</span>` : ``) +
        `</div>`;
      const foot = `<div class="zone-total">รวม ${escH(_selProv)} <b>${fmt(total)}</b> คน</div>`;
      return legend + html + foot;
    }
  }

  /* ========= 1.6 อันดับสถานศึกษาเดิม 10 อันดับแรก ========= */
  function topSchoolsCard() {
    const t = CMCAT.topSchools, box = $("#topSchools");
    if (!box) return;
    if (!t || !t.rows) { box.innerHTML = ""; return; }
    const max = Math.max(1, ...t.rows.map(r => r.n));
    box.innerHTML =
      `<h3>🏆 10 อันดับสถานศึกษาเดิมที่ส่งนักเรียนมามากที่สุด (ปี ${t.year})</h3>` +
      t.rows.map(r => `<div class="top-row">
        <span class="top-rank r${r.r <= 3 ? r.r : 'x'}">${r.r}</span>
        <span class="top-name">${escH(r.s)}</span>
        <span class="top-track"><span class="top-fill" style="width:${r.n / max * 100}%"></span></span>
        <span class="top-n">${fmt(r.n)} คน</span></div>`).join("") +
      (t.note ? `<p class="muted-sm" style="margin-top:10px">${escH(t.note)}</p>` : "");
  }

  /* ================= 2. จำนวนนักเรียน ================= */
  function enrollment() {
    Chart.line($("#enrollChart"), CMCAT.enrollment);
    const enr = CMCAT.enrollment;
    const rows = enr.map((d, i) => {
      const diff = i ? d.total - enr[i - 1].total : 0;
      const cls = diff < 0 ? "neg" : diff > 0 ? "pos" : "";
      return `<tr><td>${d.year}</td><td class="num">${fmt(d.total)}</td>
        <td class="num ${cls}">${i ? (diff > 0 ? "+" : "") + fmt(diff) : "–"}</td></tr>`;
    }).reverse().join("");
    $("#enrollTable").innerHTML =
      `<table class="tbl"><thead><tr><th>ปีการศึกษา</th><th class="num">จำนวน (คน)</th>
       <th class="num">เปลี่ยนแปลง</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  /* ================= 3. การรับสมัคร 2569 ================= */
  function admission() {
    // แท่งซ้อนตามรอบ (ปวช./ปวส.)
    Chart.stacked($("#admRoundChart"),
      adm.rounds.map(r => r.name),
      [
        { name: "ปวช.", color: C.pvc, values: adm.rounds.map(r => r.pvc.direct + r.pvc.online) },
        { name: "ปวส.", color: C.pvs, values: adm.rounds.map(r => r.pvs.direct + r.pvs.online) }
      ]);

    // โดนัทช่องทางสมัคร
    Chart.donut($("#admChannelChart"), [
      { label: "สมัครตรง (Walk-in)", value: applied.direct, color: C.direct },
      { label: "สมัครออนไลน์", value: applied.online, color: C.online }
    ], { centerValue: applied.all, centerLabel: "ผู้สมัคร" });

    // ตารางรายรอบ
    const body = adm.rounds.map(r => `
      <tr><td>${r.name}<div class="muted-sm">${r.period}</div></td>
      <td class="num">${fmt(r.pvc.direct + r.pvc.online)}</td>
      <td class="num">${fmt(r.pvs.direct + r.pvs.online)}</td>
      <td class="num strong">${fmt(roundTotal(r))}</td></tr>`).join("");
    $("#admTable").innerHTML = `
      <table class="tbl"><thead><tr><th>รอบการสมัคร</th>
      <th class="num">ปวช.</th><th class="num">ปวส.</th><th class="num">รวม</th></tr></thead>
      <tbody>${body}
      <tr class="total-row"><td>รวมผู้สมัครทั้งหมด</td>
        <td class="num">${fmt(applied.pvc)}</td><td class="num">${fmt(applied.pvs)}</td>
        <td class="num strong">${fmt(applied.all)}</td></tr>
      <tr class="report-row"><td>ยอดรายงานตัวจริง (9 มิ.ย. 69)</td>
        <td class="num">${fmt(adm.reported.pvc)}</td><td class="num">${fmt(adm.reported.pvs)}</td>
        <td class="num strong">${fmt(reportedTotal)}</td></tr>
      </tbody></table>`;

    const yieldPct = Math.round(reportedTotal / applied.all * 100);
    $("#admNote").innerHTML = `
      <strong>อ่านผล:</strong> จากผู้สมัคร ${fmt(applied.all)} คน มารายงานตัวจริง
      ${fmt(reportedTotal)} คน (อัตรารายงานตัว <b>${yieldPct}%</b>) ·
      ช่องทาง <b>สมัครตรง ${Math.round(applied.direct / applied.all * 100)}%</b>
      ยังมากกว่าออนไลน์ · ${adm.note}`;
  }

  /* ================= 4. กลุ่มเป้าหมาย & ช่องทาง ================= */
  function survey() {
    const sv = CMCAT.survey;
    Chart.donut($("#svLevel"), sv.level.map((d, i) => ({ ...d, color: [C.pvc, C.pvs][i] })),
      { centerValue: sv.total, centerLabel: "ผู้ตอบ" });
    Chart.hbar($("#svChannel"), sv.channel, { labelW: 250, color: "#0277bd" });
    Chart.donut($("#svInfluence"), sv.influence);
    Chart.hbar($("#svReason"), sv.reason, { labelW: 250, color: "#2e7d32" });

    const topCh = sv.channel[0] || { label: "-" }, topReason = sv.reason[0] || { label: "-" };
    const selfPct = sv.total ? Math.round((sv.influence[0] ? sv.influence[0].value : 0) / sv.total * 100) : 0;
    $("#svNote").innerHTML = `
      <strong>อ่านผล:</strong> นักศึกษาส่วนใหญ่ <b>ตัดสินใจด้วยตนเอง (${selfPct}%)</b>
      รับรู้ข่าวจาก <b>${topCh.label}</b> มากที่สุด และช่องทางแบบ “บอกต่อ + ครูเข้าไปแนะแนวถึงโรงเรียน”
      รวมกันมีน้ำหนักสูง เหตุผลอันดับ 1 ที่เลือกเรียนคือ <b>${topReason.label}</b>`;
  }

  /* ================= 5. ภาวะผู้จบ ================= */
  function graduates() {
    // แท่งซ้อนเปรียบเทียบรายปี
    Chart.stacked($("#gradChart"),
      gradYears.map(String),
      [
        { name: "ศึกษาต่อ", color: C.study, values: gradYears.map(y => gradTotals(y).study) },
        { name: "มีงานทำ", color: C.work, values: gradYears.map(y => gradTotals(y).work) },
        { name: "รองาน/ว่างงาน", color: C.seek, values: gradYears.map(y => gradTotals(y).seek) },
        { name: "อื่น ๆ", color: C.other, values: gradYears.map(y => gradTotals(y).other) }
      ]);

    // ตัวเลือกปี
    const sel = $("#gradYearSel");
    sel.innerHTML = gradYears.map(y => `<option value="${y}">ปี ${y}</option>`).join("");
    sel.value = 2567;
    sel.onchange = () => renderGradYear(+sel.value);
    renderGradYear(2567);
  }

  function renderGradYear(year) {
    const info = CMCAT.graduates[year];
    const t = gradTotals(year);
    $("#gradRound").textContent = info.round;
    const rows = info.rows.map(r => {
      const track = r[2] || 1;
      const ok = Math.round((r[3] + r[5]) / track * 100);
      return `<tr><td>${r[0]}</td><td class="num">${fmt(r[1])}</td>
        <td class="num">${fmt(r[3])}</td><td class="num">${fmt(r[5])}</td>
        <td class="num">${fmt(r[4])}</td>
        <td class="num"><span class="pill ${ok >= 80 ? 'ok' : ok >= 60 ? 'mid' : 'low'}">${ok}%</span></td></tr>`;
    }).join("");
    const okAll = Math.round((t.study + t.work) / t.tracked * 100);
    $("#gradTable").innerHTML = `
      <table class="tbl"><thead><tr><th>สาขาวิชา</th><th class="num">จบ</th>
      <th class="num">ศึกษาต่อ</th><th class="num">มีงานทำ</th><th class="num">รองาน</th>
      <th class="num">สำเร็จ*</th></tr></thead><tbody>${rows}
      <tr class="total-row"><td>รวม</td><td class="num">${fmt(t.total)}</td>
      <td class="num">${fmt(t.study)}</td><td class="num">${fmt(t.work)}</td>
      <td class="num">${fmt(t.seek)}</td>
      <td class="num"><span class="pill ok">${okAll}%</span></td></tr>
      </tbody></table>
      <p class="muted-sm">* “สำเร็จ” = (ศึกษาต่อ + มีงานทำ) ต่อจำนวนที่ติดตามได้</p>`;
  }

  /* ================= 6. ผู้ปฏิบัติงาน (โครงสร้างบุคลากร) ================= */
  const escS = s => String(s == null ? "" : s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  function pChip(p) {
    const cls = /ที่ปรึกษา/.test(p) ? "adv" : /ประธาน/.test(p) ? "chair"
      : /ผู้ช่วยเลขา/.test(p) ? "sec2" : /เลขานุการ/.test(p) ? "sec" : "mem";
    return `<span class="p-chip ${cls}">${escS(p)}</span>`;
  }
  function initial(name) {
    const n = name.replace(/^(นางสาว|นาย|นาง|ว่าที่\s*ร\.ต\.|เด็กชาย|เด็กหญิง)\s*/, "").trim();
    return n[0] || "•";
  }
  function person(m) {
    return `<div class="person"><span class="p-av">${escS(initial(m.n))}</span>
      <span class="p-name">${escS(m.n)}</span>${pChip(m.p)}</div>`;
  }
  function committee(c, cls, showRole) {
    return `<div class="cmt ${cls || ""}">
      <div class="cmt-h"><h4>${escS(c.name)}${c.label ? ` <span class="cmt-zone">${escS(c.label)}</span>` : ""}</h4>
        <span class="cmt-n">${c.members.length} คน</span></div>
      ${c.area ? `<div class="cmt-area">📍 ${escS(c.area)}</div>` : ""}
      <div class="persons">${c.members.map(person).join("")}</div>
      ${showRole && c.role ? `<div class="cmt-role"><b>หน้าที่:</b> ${escS(c.role)}</div>` : ""}</div>`;
  }
  function staff() {
    const o = CMCAT.staffOrg;
    if (!o) { $("#staffOrg").innerHTML = ""; return; }
    const zoneRole = (o.zones.find(z => z.role) || {}).role || "";
    $("#staffOrg").innerHTML = `
      <div class="org-meta">
        <div class="org-order">📋 ${escS(o.order)}</div>
        <div class="org-title">${escS(o.title)}</div>
        <div class="org-sign">สั่ง ณ วันที่ ${escS(o.date)} · ลงนามโดย ${escS(o.signedBy)}</div>
      </div>
      <div class="org-tier"><span>ระดับอำนวยการ &amp; ดำเนินงาน</span></div>
      <div class="lead-row">${committee(o.direction, "lead", true)}${committee(o.operation, "oper", true)}</div>
      <div class="org-tier"><span>คณะกรรมการแนะแนว ๙ เขตพื้นที่การศึกษา</span></div>
      <div class="zone-grid">${o.zones.map(z => committee(z, "zone", false)).join("")}</div>
      ${zoneRole ? `<p class="callout" style="margin-top:12px;font-size:.86rem"><b>หน้าที่คณะกรรมการแนะแนวทุกเขต:</b> ${escS(zoneRole)}</p>` : ""}
      <div class="org-tier"><span>คณะทำงานสนับสนุน</span></div>
      <div class="support-grid">${o.support.map(c => committee(c, "sup", true)).join("")}</div>`;
  }

  /* ================= 7. วิเคราะห์เพื่ออนาคต ================= */
  function analysis() {
    const enr = CMCAT.enrollment;
    const cur = enr[enr.length - 1];
    // พยากรณ์อย่างง่าย: ค่าเฉลี่ยการลดต่อปี 3 ปีล่าสุด
    const recent = enr.slice(-4);
    const avgDrop = Math.round(sum(recent.slice(1).map((d, i) => recent[i].total - d.total)) / (recent.length - 1));
    const proj = cur.total - avgDrop;

    $("#projText").innerHTML = `
      หากแนวโน้มคงเดิม (เฉลี่ยลดปีละ ~${fmt(avgDrop)} คน) คาดว่าปี 2570
      จำนวน นร.นศ. ในระบบจะอยู่ราว <b class="neg">${fmt(proj)} คน</b>
      การรักษาระดับ/พลิกแนวโน้มขึ้นอยู่กับ <b>ประสิทธิภาพงานแนะแนวเชิงรุก</b>`;

    const strengths = [
      "ผลผลิตมีคุณภาพ: ผู้จบศึกษาต่อ/มีงานทำสูงกว่า 80% ต่อเนื่อง — เป็นจุดขายที่ทรงพลัง",
      "จุดแข็งด้านการเกษตร: เหตุผลอันดับ 1 ที่เลือกเรียนคือ “ชอบด้านการเกษตร”",
      "เครือข่ายบอกต่อแข็งแรง: เพื่อน/รุ่นพี่ + ครูเข้าไปแนะแนวถึงโรงเรียน คือช่องทางที่ได้ผลจริง",
      "ฐาน ปวช.→ปวส.: ปวส. รอบโควตาส่วนใหญ่เป็นเด็กเดิมของวิทยาลัย"
    ];
    const risks = [
      `จำนวนผู้เรียนลดต่อเนื่อง 10 ปี (−${Math.round((enr[0].total - cur.total) / enr[0].total * 100)}%) จากประชากรวัยเรียนลดและการแข่งขันสูง`,
      "อัตรารายงานตัวจริงต่ำกว่ายอดสมัคร — มี “รอยรั่ว” ช่วงสมัครถึงมอบตัว",
      "ช่องทางออนไลน์ (เว็บไซต์/Facebook) ยังรับรู้ข่าวได้น้อยกว่าที่ควร",
      "บางสาขามีผู้จบ ‘รองาน/ว่างงาน’ เป็นสัดส่วนที่ต้องเฝ้าระวัง"
    ];
    const actions = [
      "แนะแนวเชิงรุกเน้นโรงเรียนเครือข่ายเดิมที่ส่งเด็กมามาก + ใช้ศิษย์เก่า/รุ่นพี่เป็นทูตแนะแนว",
      "ชูข้อมูล “จบแล้วมีงานทำ/เรียนต่อ 80%+” เป็นสารหลักในสื่อประชาสัมพันธ์ทุกช่องทาง",
      "ปิดรอยรั่วสมัคร→มอบตัว: ระบบติดตามผู้สมัครรายบุคคล โทร./ไลน์ ยืนยันสิทธิ์และทุน",
      "ยกระดับช่องทางออนไลน์: คอนเทนต์ Facebook/TikTok + เพจรับสมัครที่ใช้ง่ายบนมือถือ",
      "ทำระบบข้อมูลนี้ให้เป็นฐานตัดสินใจประจำปี ปรับกลยุทธ์ตามตัวเลขที่เปลี่ยน"
    ];
    const li = a => a.map(x => `<li>${x}</li>`).join("");
    $("#swot").innerHTML = `
      <div class="swot swot-strong"><h4>✅ จุดแข็ง / โอกาส</h4><ul>${li(strengths)}</ul></div>
      <div class="swot swot-risk"><h4>⚠️ ความเสี่ยง / ปัญหา</h4><ul>${li(risks)}</ul></div>
      <div class="swot swot-action"><h4>🎯 ข้อเสนอเชิงกลยุทธ์</h4><ul>${li(actions)}</ul></div>`;
  }

  /* ================= ระบบนำทาง ================= */
  function nav() {
    const links = document.querySelectorAll(".nav a");
    const sections = [...document.querySelectorAll("section.panel")];
    links.forEach(a => a.addEventListener("click", e => {
      e.preventDefault();
      const id = a.getAttribute("href").slice(1);
      document.getElementById(id).scrollIntoView({ behavior: "smooth", block: "start" });
    }));
    const io = new IntersectionObserver(ents => {
      ents.forEach(en => {
        if (en.isIntersecting) {
          links.forEach(l => l.classList.toggle("active",
            l.getAttribute("href") === "#" + en.target.id));
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(s => io.observe(s));
  }

  /* ---------- ปุ่มพิมพ์เฉพาะหน้า (ฉีดเข้าแต่ละหัวข้อ) ---------- */
  function injectSectionTools() {
    document.querySelectorAll("main section.panel").forEach(sec => {
      const h2 = sec.querySelector("h2");
      if (!h2) return;
      const btn = document.createElement("button");
      btn.className = "print-sec-btn no-print";
      btn.title = "พิมพ์เฉพาะหัวข้อนี้";
      btn.textContent = "🖨️";
      btn.onclick = () => Tools.printSection(sec);
      h2.appendChild(btn);
    });
  }

  /* ---------- เรนเดอร์ทุกส่วน (เรียกซ้ำได้เมื่อข้อมูลเปลี่ยน) ---------- */
  function renderAll() {
    computeDerived();
    $("#collegeName").textContent = CMCAT.meta.college;
    $("#deptName").textContent = CMCAT.meta.department;
    $("#updated").textContent = "ข้อมูลล่าสุด: " + CMCAT.meta.updated;
    $("#sourceFoot").textContent = "แหล่งข้อมูล: " + CMCAT.meta.source;
    overview(); originMap(); topSchoolsCard(); enrollment(); admission(); survey(); graduates(); staff(); analysis();
  }

  /* ================= init ================= */
  document.addEventListener("DOMContentLoaded", () => {
    if (typeof Tools !== "undefined" && Tools.hasOverride()) {
      const b = $("#overrideBanner"); if (b) b.hidden = false;
    }
    $("#yearFoot").textContent = new Date().getFullYear() + 543;
    renderAll();
    nav(); injectSectionTools();
  });

  /* ---------- รับข้อมูลสดจากคลาวด์ (เรียกโดยตัวโหลด Firebase) ---------- */
  window.__setDashboardData = (cloud) => {
    if (!cloud || typeof cloud !== "object") return;
    Object.keys(cloud).forEach(k => { CMCAT[k] = cloud[k]; });
    try { renderAll(); } catch (e) { console.error("render error", e); }
    const c = document.getElementById("cloudBadge"); if (c) c.hidden = false;
  };
  window.__renderDashboard = renderAll;
})();
