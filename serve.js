/* เซิร์ฟเวอร์ไฟล์แบบง่ายสำหรับเปิดหน้าเว็บในเครื่อง (เปิด index.html ตรง ๆ ก็ได้)
   วิธีใช้:  node serve.js   แล้วเปิด http://localhost:8090
   รองรับโฟลเดอร์ย่อย เช่น /admin/ , /backoffice/ (เสิร์ฟ index.html ให้อัตโนมัติ) */
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = __dirname, PORT = process.env.PORT || 8090;
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".ico": "image/x-icon" };

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  let file = path.join(ROOT, path.normalize(p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end("forbidden"); }
  fs.stat(file, (err, st) => {
    // ถ้าเป็นโฟลเดอร์ (หรือหน้าแรก) → เสิร์ฟ index.html ข้างใน
    if (!err && st.isDirectory()) file = path.join(file, "index.html");
    else if (err && (p === "/" || p === "")) file = path.join(ROOT, "index.html");
    fs.readFile(file, (e, data) => {
      if (e) { res.writeHead(404); return res.end("not found"); }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
      res.end(data);
    });
  });
}).listen(PORT, () => console.log(`CMCAT dashboard: http://localhost:${PORT}`));
