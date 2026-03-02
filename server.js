const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const bodyParser = require("body-parser");
const cors = require("cors");
const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const db = new sqlite3.Database("./creative.db");

// สร้างตาราง
db.run(`
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    project TEXT,
    detail TEXT,
    status TEXT
)
`);

// เพิ่มงาน
app.post("/submit", (req, res) => {
    const { name, project, detail } = req.body;
    db.run(
        `INSERT INTO tasks (name, project, detail, status) VALUES (?, ?, ?, ?)`,
        [name, project, detail, "pending"],
        () => res.json({ message: "บันทึกสำเร็จ" })
    );
});

// ดึงงานทั้งหมด
app.get("/tasks", (req, res) => {
    db.all(`SELECT * FROM tasks ORDER BY id DESC`, [], (err, rows) => {
        res.json(rows);
    });
});

// อัปเดตสถานะ
app.post("/update-status", (req, res) => {
    const { id, status } = req.body;
    db.run(`UPDATE tasks SET status=? WHERE id=?`, [status, id], () => {
        res.json({ message: "อัปเดตสำเร็จ" });
    });
});

// Dashboard Stats
app.get("/stats", (req, res) => {
    db.all(`
        SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) as approved
        FROM tasks
    `, [], (err, rows) => {
        res.json(rows[0]);
    });
});

// Export Excel
app.get("/export-excel", async (req, res) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Tasks");

    sheet.columns = [
        { header: "ID", key: "id" },
        { header: "Name", key: "name" },
        { header: "Project", key: "project" },
        { header: "Detail", key: "detail" },
        { header: "Status", key: "status" },
    ];

    db.all(`SELECT * FROM tasks`, [], async (err, rows) => {
        rows.forEach(row => sheet.addRow(row));
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader("Content-Disposition", "attachment; filename=tasks.xlsx");
        await workbook.xlsx.write(res);
        res.end();
    });
});

// Export PDF
app.get("/export-pdf", (req, res) => {
    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    db.all(`SELECT * FROM tasks`, [], (err, rows) => {
        rows.forEach(row => {
            doc.text(
                `ID: ${row.id} | ${row.name} | ${row.project} | ${row.status}`
            );
            doc.moveDown();
        });
        doc.end();
    });
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
    
});