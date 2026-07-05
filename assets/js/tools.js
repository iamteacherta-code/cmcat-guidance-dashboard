/* =====================================================================
   tools.js — เครื่องมือหน้าบ้าน: พิมพ์รายงาน / ดาวน์โหลดข้อมูล / นำเข้าข้อมูล
   (ทำงานฝั่งเบราว์เซอร์ล้วน ๆ ไม่มีเซิร์ฟเวอร์)
   ===================================================================== */
const Tools = (() => {
  const OVERRIDE_KEY = "cmcat_data_override";

  /* ---------- นำค่าที่ผู้ใช้นำเข้ามาทับข้อมูลเริ่มต้น (เฉพาะเครื่องนี้) ---------- */
  function applyOverride() {
    try {
      const raw = localStorage.getItem(OVERRIDE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      Object.keys(data).forEach(k => { window.CMCAT[k] = data[k]; });
      return true;
    } catch (e) { console.warn("override ผิดพลาด", e); return false; }
  }

  /* ---------- ดาวน์โหลดไฟล์ ---------- */
  function download(filename, text, type = "text/plain;charset=utf-8") {
    const blob = new Blob(["﻿" + text], { type }); // BOM ให้ Excel อ่านภาษาไทยถูก
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
  }

  const stamp = () => (new Date().getFullYear() + 543) + "-" +
    String(new Date().getMonth() + 1).padStart(2, "0") + "-" +
    String(new Date().getDate()).padStart(2, "0");

  /* ---------- ส่งออก JSON (ข้อมูลทั้งหมด) ---------- */
  function exportJSON() {
    download(`cmcat-ข้อมูลแนะแนว-${stamp()}.json`,
      JSON.stringify(window.CMCAT, null, 2), "application/json;charset=utf-8");
  }

  /* ---------- ส่งออกไฟล์ data.js (สำหรับนำไปเผยแพร่) ---------- */
  function exportDataJS() {
    const body = "/* สร้างจากปุ่มดาวน์โหลดในหน้าเว็บ — นำไปแทนที่ assets/js/data.js เพื่อเผยแพร่ */\n" +
      "const CMCAT = " + JSON.stringify(window.CMCAT, null, 2) + ";\n";
    download("data.js", body, "text/javascript;charset=utf-8");
  }

  /* ---------- ส่งออก CSV (ตารางหลัก รวมในไฟล์เดียว) ---------- */
  function exportCSV() {
    const C = window.CMCAT;
    const esc = v => `"${String(v).replace(/"/g, '""')}"`;
    const line = arr => arr.map(esc).join(",");
    const out = [];
    out.push(line([`ข้อมูลงานแนะแนว ${C.meta.college}`]));
    out.push(line([C.meta.updated])); out.push("");

    out.push(line(["ตารางที่ 1: จำนวน นร.นศ. 10 ปี"]));
    out.push(line(["ปีการศึกษา", "จำนวน (คน)"]));
    C.enrollment.forEach(r => out.push(line([r.year, r.total]))); out.push("");

    out.push(line(["ตารางที่ 2: การรับสมัคร ปี 2569"]));
    out.push(line(["รอบ", "ช่วงเวลา", "ปวช.", "ปวส.", "รวม"]));
    C.admission2569.rounds.forEach(r => {
      const pvc = r.pvc.direct + r.pvc.online, pvs = r.pvs.direct + r.pvs.online;
      out.push(line([r.name, r.period, pvc, pvs, pvc + pvs]));
    }); out.push("");

    out.push(line(["ตารางที่ 3: แบบสำรวจ — ช่องทางทราบข่าว"]));
    C.survey.channel.forEach(r => out.push(line([r.label, r.value]))); out.push("");
    out.push(line(["ตารางที่ 4: แบบสำรวจ — เหตุผลที่เลือกเรียน"]));
    C.survey.reason.forEach(r => out.push(line([r.label, r.value]))); out.push("");

    out.push(line(["ตารางที่ 5: ภาวะผู้จบ (รายปี)"]));
    out.push(line(["ปีที่จบ", "จบทั้งหมด", "ศึกษาต่อ", "มีงานทำ", "รองาน", "อื่นๆ"]));
    Object.keys(C.graduates).forEach(y => {
      const t = C.graduates[y].rows.reduce((a, r) =>
        [a[0] + r[1], a[1] + r[3], a[2] + r[5], a[3] + r[4], a[4] + r[6]], [0, 0, 0, 0, 0]);
      out.push(line([y, t[0], t[1], t[2], t[3], t[4]]));
    });
    download(`cmcat-ตารางข้อมูล-${stamp()}.csv`, out.join("\r\n"), "text/csv;charset=utf-8");
  }

  /* ---------- นำเข้า JSON เพื่ออัปเดต (เฉพาะเครื่องนี้) ---------- */
  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.enrollment && !data.admission2569 && !data.survey && !data.graduates)
          throw new Error("ไฟล์ไม่ตรงรูปแบบข้อมูลแนะแนว");
        localStorage.setItem(OVERRIDE_KEY, JSON.stringify(data));
        alert("นำเข้าข้อมูลสำเร็จ ✓ กำลังโหลดหน้าใหม่…");
        location.reload();
      } catch (e) { alert("นำเข้าไม่สำเร็จ: " + e.message); }
    };
    reader.readAsText(file);
  }
  function clearOverride() {
    if (confirm("กลับไปใช้ข้อมูลเริ่มต้น (ลบข้อมูลที่นำเข้าชั่วคราวในเครื่องนี้)?")) {
      localStorage.removeItem(OVERRIDE_KEY); location.reload();
    }
  }
  const hasOverride = () => !!localStorage.getItem(OVERRIDE_KEY);

  /* ---------- พิมพ์ ---------- */
  function printAll() { document.body.classList.remove("printing-section"); window.print(); }
  function printSection(el) {
    const sections = document.querySelectorAll("main section.panel");
    sections.forEach(s => s.classList.toggle("print-hide", s !== el));
    document.body.classList.add("printing-section");
    window.print();
  }
  window.addEventListener("afterprint", () => {
    document.querySelectorAll(".print-hide").forEach(s => s.classList.remove("print-hide"));
    document.body.classList.remove("printing-section");
  });

  return { applyOverride, exportJSON, exportDataJS, exportCSV, importJSON,
           clearOverride, hasOverride, printAll, printSection };
})();
