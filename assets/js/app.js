/* =====================================================================
   app.js — สร้างเนื้อหาทุกหน้า + ระบบนำทาง
   ===================================================================== */
(() => {
  const $ = s => document.querySelector(s);
  // นำข้อมูลที่นำเข้า (ถ้ามี) มาทับ "ก่อน" คำนวณค่าใด ๆ ด้านล่าง
  if (typeof Tools !== "undefined") Tools.applyOverride();
  const fmt = Chart.fmt;
  const C = { study: "#2e7d32", work: "#0277bd", seek: "#ef6c00", other: "#9e9e9e",
              pvc: "#2e7d32", pvs: "#66bb6a", direct: "#0277bd", online: "#f9a825" };

  /* ---------- helper คำนวณ ---------- */
  const sum = a => a.reduce((x, y) => x + y, 0);

  // การรับสมัคร: รวมยอดต่าง ๆ
  const adm = CMCAT.admission2569;
  const roundTotal = r => r.pvc.direct + r.pvc.online + r.pvs.direct + r.pvs.online;
  const applied = {
    pvc: sum(adm.rounds.map(r => r.pvc.direct + r.pvc.online)),
    pvs: sum(adm.rounds.map(r => r.pvs.direct + r.pvs.online)),
    direct: sum(adm.rounds.map(r => r.pvc.direct + r.pvs.direct)),
    online: sum(adm.rounds.map(r => r.pvc.online + r.pvs.online))
  };
  applied.all = applied.pvc + applied.pvs;
  const reportedTotal = adm.reported.pvc + adm.reported.pvs;

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
  const gradYears = Object.keys(CMCAT.graduates).map(Number).sort();

  /* ================= 1. ภาพรวม ================= */
  function overview() {
    const enr = CMCAT.enrollment;
    const cur = enr[enr.length - 1], first = enr[0], prev = enr[enr.length - 2];
    const dropPct = Math.round((first.total - cur.total) / first.total * 100);
    const yoyPct = Math.round((cur.total - prev.total) / prev.total * 100);
    const g = gradTotals(2567); // ปีล่าสุดที่สรุปสมบูรณ์
    const successRate = Math.round((g.study + g.work) / g.tracked * 100);

    const cards = [
      { big: fmt(cur.total), cap: `นักเรียน–นักศึกษาในระบบ ปี ${cur.year}`, sub: `${yoyPct}% เทียบปีก่อน`, tone: "down" },
      { big: fmt(reportedTotal), cap: "รายงานตัวเข้าเรียนใหม่ ปี 2569", sub: `จากผู้สมัคร ${fmt(applied.all)} คน`, tone: "info" },
      { big: fmt(CMCAT.survey.total), cap: "ผู้ตอบแบบสำรวจการตัดสินใจ", sub: `ปวช. ${CMCAT.survey.level[0].value} · ปวส. ${CMCAT.survey.level[1].value}`, tone: "info" },
      { big: successRate + "%", cap: "ผู้จบ ปี 2567 ศึกษาต่อ/มีงานทำ", sub: `ติดตามได้ ${fmt(g.tracked)} คน`, tone: "up" }
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

    const topCh = sv.channel[0], topReason = sv.reason[0];
    const selfPct = Math.round(sv.influence[0].value / sv.total * 100);
    const wordOfMouth = sv.channel[0].value + sv.channel[4].value; // เพื่อน + ครูแนะแนวเข้าไปในรร.
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

  /* ================= 6. ผู้ปฏิบัติงาน ================= */
  function staff() {
    $("#staffGrid").innerHTML = CMCAT.staff.map(s => `
      <div class="staff-card">
        <div class="staff-role">${s.role}</div>
        <div class="staff-name">${s.name}</div>
        <div class="staff-task">${s.tasks}</div>
      </div>`).join("");
    $("#staffNote").textContent = CMCAT.staffNote;
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

  /* ================= init ================= */
  document.addEventListener("DOMContentLoaded", () => {
    if (typeof Tools !== "undefined" && Tools.hasOverride()) {
      const b = $("#overrideBanner"); if (b) b.hidden = false;
    }
    $("#collegeName").textContent = CMCAT.meta.college;
    $("#deptName").textContent = CMCAT.meta.department;
    $("#updated").textContent = "ข้อมูลล่าสุด: " + CMCAT.meta.updated;
    $("#sourceFoot").textContent = "แหล่งข้อมูล: " + CMCAT.meta.source;
    $("#yearFoot").textContent = new Date().getFullYear() + 543;
    overview(); enrollment(); admission(); survey(); graduates(); staff(); analysis();
    nav(); injectSectionTools();
  });
})();
