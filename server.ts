import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  PageBreak,
  Footer,
  TextWrappingType,
  TextWrappingSide,
  Header,
  VerticalAlign,
  PageNumber,
  ImageRun,
  ShadingType,
  UnderlineType,
} from "docx";
import PDFDocument from "pdfkit-table";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper for Vietnamese fonts in PDFKit
const getFontPath = () => {
  const paths = [
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSerif.ttf"
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return "Times-Roman"; // Fallback
};

const getBoldFontPath = () => {
  const paths = [
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf"
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return "Times-Bold"; // Fallback
};

const getItalicFontPath = () => {
  const paths = [
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSerifItalic.ttf"
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return "Times-Italic"; // Fallback
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/export/pdf", async (req, res) => {
    try {
      const data = req.body;
      const fixedDonVi = "Đội sửa chữa Hotline";
      const HANG_MUC_SUFFIX = ", bằng phương pháp thi công hotline, sử dụng găng cao su và xe gàu cách điện.";
      const fontRegular = getFontPath();
      const fontBold = getBoldFontPath();
      const fontItalic = getItalicFontPath();

      const formatJobItem = (text: string, cot: string, dz: string) => {
        if (!text) return "";
        let trimmed = text.trim();
        if (trimmed.endsWith('.') || trimmed.endsWith(',')) {
          trimmed = trimmed.slice(0, -1);
        }
        const locationPart = (cot || dz) ? `, tại cột ${cot || ""} ĐZ ${dz || ""}` : "";
        return trimmed + locationPart + HANG_MUC_SUFFIX;
      };

      const toTitleCase = (str: string) => {
        if (!str) return "";
        return str.toLowerCase().split(' ').map(word => {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
      };

      const doc = new PDFDocument({
        size: "A4",
        margin: 56.7, // 2cm
        bufferPages: true
      });

      const buffers: any[] = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=PATCTC_${data.soVb}.pdf`);
        res.send(pdfData);
      });

      // Page 1: Cover
      doc.font(fontBold).fontSize(13);
      
      // Header Table
      const headerY = doc.y;
      doc.text("CÔNG TY ĐIỆN LỰC BẮC NINH", 56.7, headerY, { width: 230, align: "center" });
      doc.text(fixedDonVi.toUpperCase(), 56.7, doc.y, { width: 230, align: "center" });
      doc.text("__________", 56.7, doc.y, { width: 230, align: "center" });

      doc.text("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", 300, headerY, { width: 250, align: "center" });
      doc.text("Độc lập - Tự do - Hạnh phúc", 300, doc.y, { width: 250, align: "center" });
      doc.text("________________", 300, doc.y, { width: 250, align: "center" });

      doc.moveDown(4);
      doc.text(`Số: ${data.soVb}/PATCBPAT- HL`, { align: "center" });
      doc.moveDown(1);
      doc.text("PHƯƠNG ÁN TỔ CHỨC THI CÔNG", { align: "center" });
      doc.text("VÀ BIỆN PHÁP AN TOÀN SỬA CHỮA LƯỚI ĐIỆN", { align: "center" });
      doc.text("ĐANG MANG ĐIỆN", { align: "center" });

      doc.moveDown(3);
      doc.font(fontBold).text("Hạng mục công việc: ", { continued: true });
      doc.font(fontRegular).text(formatJobItem(data.jobItems[0], data.cot, data.dz));
      
      doc.moveDown(1);
      doc.font(fontBold).text("Đơn vị thi công: ", { continued: true });
      doc.font(fontRegular).text(fixedDonVi);

      doc.moveDown(2);
      doc.font(fontItalic).text(`${data.diaDanh}, ngày ${data.ngayLap.split('-')[2]} tháng ${data.ngayLap.split('-')[1]} năm ${data.ngayLap.split('-')[0]}`, { align: "center" });

      doc.moveDown(1);
      doc.font(fontBold).text("Người lập phương án: ", { continued: true });
      doc.font(fontRegular).text(toTitleCase(data.nguoiLap), { continued: true });
      doc.font(fontBold).text("\t\t\tKý tên .........");

      doc.moveDown(2);
      doc.font(fontBold).text("NGƯỜI KIỂM TRA");
      doc.font(fontItalic).text("(Ký, ghi rõ họ tên)");
      doc.moveDown(5);
      doc.font(fontBold).text(toTitleCase(data.nguoiKiemTra));

      doc.moveDown(2);
      doc.font(fontBold).text("ĐỘI TRƯỞNG", { align: "center" });
      doc.font(fontItalic).text("(Ký, ghi rõ họ tên)", { align: "center" });
      doc.moveDown(5);
      doc.font(fontBold).text(toTitleCase(data.doiTruong), { align: "center" });

      // Page 2: Căn cứ
      doc.addPage();
      doc.font(fontBold).fontSize(13);
      
      // Strict 31 lines layout for Page 2
      const lineHeight = 17; // 13pt * 1.3
      const startY = 56.7 + (lineHeight * 3); // 3 lines top padding
      
      doc.text("I. Căn cứ để lập Phương án tổ chức thi công và biện pháp an toàn:", 56.7, startY);
      doc.font(fontRegular);
      
      const day = data.canCu10_ngay?.padStart(2, '0') || "27";
      const month = data.canCu10_thang?.padStart(2, '0') || "02";
      const year = data.canCu10_nam || "2027";

      const canCu = [
        "1. “Quy chuẩn kỹ thuật Quốc gia về kỹ thuật điện - Tập 7: Thi công các công trình điện” (để xây dựng biện pháp kỹ thuật thi công).",
        "2. “Quy phạm trang bị điện” (bốn tập) kèm theo Quyết định số 19/2006/QĐ-BCN ngày 11 tháng 7 năm 2006 của Bộ trưởng Bộ Công nghiệp (để xây dựng biện pháp kỹ thuật thi công).",
        "3. “Quy chuẩn kỹ thuật Quốc gia về an toàn điện” kèm theo Quyết định số 41/2025/TT-BCT ngày 22 tháng 06 năm 2025 của Bộ trưởng Bộ Công Thương (để xây dựng biện pháp an toàn).",
        "4. “Quy trình an toàn điện” ban hành theo quyết định số 1356/QĐ- EVNNPC ngày 28/06/2025 của Tổng Giám đốc Tập đoàn Điện lực Việt Nam (để xây dựng biện pháp an toàn).",
        "5. Căn cứ quy định an toàn thi công Hotline của Tập đoàn Điện lực Việt Nam, Tổng công ty Điện lực miền Bắc.",
        "6. Quyết định số 2219/QĐ-EVNNPC ngày 03/8/2018 của Tổng công ty Điện lực miền Bắc quy định hướng dẫn sử dụng và bảo quản dụng cụ thi công hotline tại cấp điện áp 22kV;",
        "7. Quyết định số: 681/QĐ-EVNNPC ngày 26 /03/2021 của Tổng công ty Điện lực miền Bắc ban hành quy định hướng dẫn vận hành và bảo quản xe gàu hotline-Hiệu TEREX.",
        "8. Căn cứ các quy định đã ban hành về hướng dẫn các thao tác Hotline cho từng công việc bằng phương pháp sử dụng găng tay và xe gàu cách điện.",
        `9. Căn cứ vào đề nghị thi công Hotline của ${data.doiQuanLyKhuVuc || "Đội QLĐLKV Bắc Giang"} số ${data.canCu9_soVanBan || "637/KVBG-KHKT"} ngày ${data.canCu9_ngayVanBan ? `${data.canCu9_ngayVanBan.split('-')[2]}/${data.canCu9_ngayVanBan.split('-')[1]}/${data.canCu9_ngayVanBan.split('-')[0]}` : "25/02/2025"}.`,
        `10. “Biên bản khảo sát hiện trường” ngày ${day} tháng ${month} năm ${year} giữa đội sửa chữa Hotline và ${data.doiQuanLyKhuVuc || "Đội QLĐLKV Bắc Giang"}.`
      ];

      let currentY = doc.y + 5;
      canCu.forEach(text => {
        doc.text(text, 56.7, currentY, { indent: 20, width: 480, lineGap: 2 });
        currentY = doc.y + 5;
      });

      // Page 3: Đặc điểm
      doc.addPage();
      doc.moveDown(3);
      const marginX = 70.87; // 2.5cm
      const level1X = marginX + 36; // 1 tab
      const level2X = level1X + 36; // 2 tabs
      const bulletWidth = 15;

      doc.font(fontBold).text("II. Các hạng mục công việc:", level1X);
      doc.moveDown(0.5);
      
      doc.text("1. Đặc điểm công trình:", level1X);
      doc.font(fontRegular);
      
      const renderBullet = (text: string) => {
        const textY = doc.y;
        doc.text("-", level2X, textY);
        doc.text(text, level2X + bulletWidth, textY, { 
          width: 595 - marginX - level2X - bulletWidth, 
          align: "justify" 
        });
      };

      renderBullet("Đặc điểm cơ bản công trình điện:");
      renderBullet(`${data.mach}, cột ${data.cot} ĐZ ${data.dz}${data.mach === "Mạch kép" && data.diChungCot ? ` (đi chung cột ${data.diChungCot})` : ""} đang được cấp điện từ đường dây ĐZ ${data.dz} qua MC ${data.mc}.`);
      renderBullet(`Đặc điểm các thiết bị tại vị trí thi công sửa chữa Hotline tại cột ${data.cot} ĐZ ${data.dz}, sử dụng cột ${data.loaiCot} ${data.chieuCaoCot}m, xà ${data.loaiXa}, sứ ${data.loaiSu}, dây ${data.loaiDay}.`);
      renderBullet(`Đã kiểm tra bằng mắt tại cột ${data.cot} ĐZ ${data.dz}, cột liền kề sau không có khả năng rơi dây xuống xà, đứt dây, tuột khóa máng, không có khả năng gây sự cố.`);
      renderBullet(`Hiện trạng: ${data.hienTrang}`);
      renderBullet(`Công trình được thi công trên địa bàn ${data.diaBan}.`);
      renderBullet(`Địa điểm theo sơ đồ lưới điện: Cột ${data.cot} ĐZ ${data.dz}, có nguồn sau xuất tuyến ${data.dzNguon}, cấp điện 1 phần cho ${data.phamViCapDien}.`);

      doc.moveDown(1);
      doc.font(fontBold).text("2. Đặc điểm giao thông:", level1X);
      doc.font(fontRegular);
      renderBullet(`Cột ${data.cot} ĐZ ${data.dz} đường rộng ${data.duongRong}m, nằm gần tuyến đường giao thông thuận tiện cho xe chuyên dùng Hotline vào thực hiện công việc.`);
      renderBullet(`Tại vị trí làm việc không có bất kỳ trở ngại về giao thông, hành lang tuyến, công trình nhà cửa, khoảng dây giao chéo.(có hình ảnh kèm theo).`);
      renderBullet(`Cột cách đường ${data.cotCachDuong}m thuận tiện cho thi công bằng xe gầu Hotline. (kèm theo hình ảnh)`);

      // Page 4: Risks Table
      doc.addPage();
      doc.font(fontBold).text("IV. Biện pháp an toàn thực hiện công việc:");
      doc.moveDown(0.5);
      doc.text("IV.1 Nhận diện rủi ro", { indent: 20 });
      doc.moveDown(0.5);

      doc.text("3. Hạng mục + vị trí + thời gian:", level1X);
      doc.font(fontRegular);
      data.jobItems.forEach((item: string, idx: number) => {
        renderBullet(`Hạng mục công việc ${data.jobItems.length > 1 ? idx + 1 : ""}: ${formatJobItem(item, data.cot, data.dz)}`);
      });
      renderBullet(`Vị trí làm việc: ${data.viTriLamViec}`);
      renderBullet(`Dự kiến thời gian thực hiện: ${data.thoiGianDuKien}`);

      doc.moveDown(1);
      doc.font(fontBold).font(fontItalic).text("a. Nhận diện rủi ro, biện pháp phòng tránh:");
      doc.moveDown(1);

      const riskTable = {
        headers: ["TT", "Vị trí", "Nhận diện rủi ro", "Biện pháp phòng tránh"],
        rows: data.risks.map((r: any, i: number) => [
          (i + 1).toString(),
          r.location,
          `${r.hazard}\n${r.consequence}`,
          r.measure
        ])
      };

      await doc.table(
        {
          headers: riskTable.headers.map(h => ({ label: h, property: h, width: h === "TT" ? 30 : h === "Vị trí" ? 80 : 185 })),
          rows: riskTable.rows
        },
        {
          prepareHeader: () => doc.font(fontBold).fontSize(11),
          prepareRow: () => doc.font(fontRegular).fontSize(11)
        }
      );

      // Page 5: Personnel
      doc.addPage();
      doc.font(fontBold).text("PHỤ LỤC 1", { align: "center" });
      doc.text("DANH SÁCH CBCNV THAM GIA CÔNG TRÌNH VÀ PHÂN CÔNG", { align: "center" });
      doc.moveDown(1);

      const personnelTable = {
        headers: ["TT", "Họ và tên", "Chức danh", "Bậc nghề", "Bậc ATĐ"],
        rows: data.personnel.map((p: any, i: number) => [
          (i + 1).toString(),
          toTitleCase(p.name),
          p.role,
          p.grade,
          p.safetyGrade
        ])
      };

      await doc.table(
        {
          headers: personnelTable.headers.map(h => ({ label: h, property: h, width: h === "TT" ? 30 : h === "Họ và tên" ? 150 : 100 })),
          rows: personnelTable.rows
        },
        {
          prepareHeader: () => doc.font(fontBold).fontSize(11),
          prepareRow: () => doc.font(fontRegular).fontSize(11)
        }
      );

      // Page 6: Tools
      doc.addPage();
      doc.font(fontBold).text("PHỤ LỤC 2", { align: "center" });
      doc.text("DANH MỤC PHƯƠNG TIỆN, THIẾT BỊ, DỤNG CỤ THI CÔNG", { align: "center" });
      doc.moveDown(1);

      const toolsTable = {
        headers: ["TT", "Tên thiết bị", "Quy cách", "SL", "Mục đích"],
        rows: data.tools.filter((t: any) => t.selected).map((t: any, i: number) => [
          (i + 1).toString(),
          t.name,
          t.spec,
          t.quantity.toString(),
          t.purpose
        ])
      };

      await doc.table(
        {
          headers: toolsTable.headers.map(h => ({ label: h, property: h, width: h === "TT" ? 30 : h === "Tên thiết bị" ? 150 : h === "SL" ? 30 : 100 })),
          rows: toolsTable.rows
        },
        {
          prepareHeader: () => doc.font(fontBold).fontSize(11),
          prepareRow: () => doc.font(fontRegular).fontSize(11)
        }
      );

      // Footer: Page numbers
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.font(fontRegular).fontSize(10).text(
          `${i + 1}`,
          0,
          doc.page.height - 50,
          { align: "center" }
        );
      }

      doc.end();

    } catch (error: any) {
      console.error("PDF Export error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/export/docx", async (req, res) => {
    try {
      const data = req.body;
      const fixedDonVi = "Đội sửa chữa Hotline";
      const HANG_MUC_SUFFIX = ", bằng phương pháp thi công hotline, sử dụng găng cao su và xe gàu cách điện.";

      const formatJobItem = (text: string, cot: string, dz: string) => {
        if (!text) return "";
        let trimmed = text.trim();
        if (trimmed.endsWith('.') || trimmed.endsWith(',')) {
          trimmed = trimmed.slice(0, -1);
        }
        const locationPart = (cot || dz) ? `, tại cột ${cot || ""} ĐZ ${dz || ""}` : "";
        return trimmed + locationPart + HANG_MUC_SUFFIX;
      };

      const toTitleCase = (str: string) => {
        if (!str) return "";
        return str.toLowerCase().split(' ').map(word => {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
      };

      // Helper for standard text style
      const standardText = (text: string, options: any = {}) => {
        return new Paragraph({
          alignment: options.alignment || AlignmentType.LEFT,
          spacing: { line: 312, before: 0, after: 0 }, // 1.3 line spacing
          children: [
            new TextRun({
              text: text,
              font: "Times New Roman",
              size: 26, // 13pt
              bold: options.bold || false,
              italics: options.italics || false,
              underline: options.underline ? {} : undefined,
            }),
          ],
          indent: options.indent,
        });
      };

      const blankLine = (count = 1) => {
        return Array.from({ length: count }).map(() =>
          new Paragraph({
            spacing: { line: 312, before: 0, after: 0 },
            children: [new TextRun({ text: "", font: "Times New Roman", size: 26 })]
          })
        );
      };

      const cleanJobItem = (text: string) => {
        if (!text) return "";
        let cleaned = text.replace(/, bằng phương pháp thi công hotline, sử dụng găng cao su và xe gàu cách điện\.?$/, "");
        cleaned = cleaned.replace(/ bằng phương pháp Hotline\.?$/, "");
        return cleaned.trim().replace(/\.+$/, "");
      };

      const ensureLocation = (item: string, cot: string, dz: string) => {
        const cleaned = cleanJobItem(item);
        const locationStr = `tại cột ${cot} ĐZ ${dz}`;
        if (cleaned.includes("tại cột")) {
          const idx = cleaned.indexOf("tại cột");
          const prefix = cleaned.substring(0, idx).trim().replace(/,$/, "");
          return `${prefix}, ${locationStr}`;
        }
        return `${cleaned}, ${locationStr}`;
      };

      const SHORT_HOTLINE_SUFFIX = " bằng phương pháp Hotline.";

      const cellBorders = {
        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      } as const;

      const makeCell = (text: string, opts: any = {}) => new TableCell({
        width: opts.width,
        verticalAlign: opts.vAlign || VerticalAlign.TOP,
        borders: cellBorders,
        children: [new Paragraph({
          alignment: opts.align || AlignmentType.LEFT,
          spacing: { line: 312 },
          children: [new TextRun({ text, font: "Times New Roman", size: opts.size || 26, bold: opts.bold || false, italics: opts.italics || false })],
        })],
      });

      const makeMultiCell = (texts: string[], opts: any = {}) => new TableCell({
        width: opts.width,
        verticalAlign: opts.vAlign || VerticalAlign.TOP,
        borders: cellBorders,
        children: texts.map(t => new Paragraph({
          alignment: opts.align || AlignmentType.LEFT,
          spacing: { line: 260 },
          children: [new TextRun({ text: t, font: "Times New Roman", size: opts.size || 26, bold: opts.bold || false })],
        })),
      });

      const noBorders = {
        top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      } as const;

      const formatBullet = (text: string) => {
        if (!text) return null;
        let cleaned = text.trim();
        cleaned = cleaned.replace(/^([-\u2014\u2013\u2022*+\u00B7o]|\s)+/, "");
        cleaned = cleaned.trim();
        if (!cleaned || cleaned === "-" || cleaned === "\u2013" || cleaned === "\u2014") return null;
        if (!cleaned.endsWith('.')) cleaned += '.';
        return `- ${cleaned}`;
      };

      // Create Document
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 1134, // 2cm
                  bottom: 1134,
                  left: 1134,
                  right: 1134,
                },
              },
            },
            footers: {
              default: new Footer({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        children: [PageNumber.CURRENT],
                        font: "Times New Roman",
                        size: 26,
                      }),
                    ],
                  }),
                ],
              }),
            },
            children: [
              // Page 1: Cover
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE },
                  insideHorizontal: { style: BorderStyle.NONE },
                  insideVertical: { style: BorderStyle.NONE },
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        width: { size: 45, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({ text: "CÔNG TY ĐIỆN LỰC BẮC NINH", font: "Times New Roman", size: 26, bold: true }),
                            ],
                          }),
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({ text: fixedDonVi.toUpperCase(), font: "Times New Roman", size: 26, bold: true }),
                            ],
                          }),
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({ text: "__________", font: "Times New Roman", size: 26, bold: true }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        width: { size: 55, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({ text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", font: "Times New Roman", size: 26, bold: true }),
                            ],
                          }),
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({ text: "Độc lập - Tự do - Hạnh phúc", font: "Times New Roman", size: 26, bold: true }),
                            ],
                          }),
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({ text: "________________", font: "Times New Roman", size: 26, bold: true }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              ...blankLine(2),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `Số: ${data.soVb}/PATCBPAT- HL`, font: "Times New Roman", size: 26, bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "PHƯƠNG ÁN TỔ CHỨC THI CÔNG", font: "Times New Roman", size: 26, bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "VÀ BIỆN PHÁP AN TOÀN SỬA CHỮA LƯỚI ĐIỆN", font: "Times New Roman", size: 26, bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "ĐANG MANG ĐIỆN", font: "Times New Roman", size: 26, bold: true })],
              }),
              ...blankLine(2),
              ...data.jobItems.map((item: string, idx: number) => 
                new Paragraph({
                  spacing: { line: 312 },
                  children: [
                    new TextRun({ text: data.jobItems.length === 1 ? "Hạng mục công việc: " : `Hạng mục công việc ${idx + 1}: `, font: "Times New Roman", size: 26, bold: true }),
                    new TextRun({ text: formatJobItem(item, data.cot, data.dz), font: "Times New Roman", size: 26 }),
                  ],
                })
              ),
              new Paragraph({
                spacing: { line: 312 },
                children: [
                  new TextRun({ text: "Đơn vị thi công: ", font: "Times New Roman", size: 26, bold: true }),
                  new TextRun({ text: fixedDonVi, font: "Times New Roman", size: 26 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 312 },
                children: [
                  new TextRun({ text: `${data.diaDanh}, ngày ${data.ngayLap.split('-')[2]} tháng ${data.ngayLap.split('-')[1]} năm ${data.ngayLap.split('-')[0]}`, font: "Times New Roman", size: 26, italics: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { line: 312 },
                children: [
                  new TextRun({ text: "Người lập phương án: ", font: "Times New Roman", size: 26, bold: true }),
                  new TextRun({ text: toTitleCase(data.nguoiLap), font: "Times New Roman", size: 26 }),
                  new TextRun({ text: "\t\t\tKý tên .........", font: "Times New Roman", size: 26, bold: true }),
                ],
              }),
              ...blankLine(2),
              // Signatures
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [new TextRun({ text: "NGƯỜI KIỂM TRA", font: "Times New Roman", size: 26, bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [new TextRun({ text: "(Ký, ghi rõ họ tên)", font: "Times New Roman", size: 26, italics: true })],
              }),
              ...blankLine(5),
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [new TextRun({ text: toTitleCase(data.nguoiKiemTra), font: "Times New Roman", size: 26, bold: true })],
              }),
              ...blankLine(2),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "ĐỘI TRƯỞNG", font: "Times New Roman", size: 26, bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "(Ký, ghi rõ họ tên)", font: "Times New Roman", size: 26, italics: true })],
              }),
              ...blankLine(5),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: toTitleCase(data.doiTruong), font: "Times New Roman", size: 26, bold: true })],
              }),
              
              new Paragraph({
                children: [new PageBreak()],
              }),

              // Page 2: Căn cứ (31 lines rule)
              ...blankLine(3), // Top padding
              new Paragraph({
                spacing: { line: 312 },
                children: [new TextRun({ text: "I. Căn cứ để lập Phương án tổ chức thi công và biện pháp an toàn:", font: "Times New Roman", size: 26, bold: true })],
              }),
              new Paragraph({
                spacing: { line: 312 },
                indent: { left: 720, hanging: 720 },
                children: [new TextRun({ text: "1. “Quy chuẩn kỹ thuật Quốc gia về kỹ thuật điện - Tập 7: Thi công các công trình điện” (để xây dựng biện pháp kỹ thuật thi công).", font: "Times New Roman", size: 26 })],
              }),
              new Paragraph({
                spacing: { line: 312 },
                indent: { left: 720, hanging: 720 },
                children: [new TextRun({ text: "2. “Quy phạm trang bị điện” (bốn tập) kèm theo Quyết định số 19/2006/QĐ-BCN ngày 11 tháng 7 năm 2006 của Bộ trưởng Bộ Công nghiệp (để xây dựng biện pháp kỹ thuật thi công).", font: "Times New Roman", size: 26 })],
              }),
              new Paragraph({
                spacing: { line: 312 },
                indent: { left: 720, hanging: 720 },
                children: [new TextRun({ text: "3. “Quy chuẩn kỹ thuật Quốc gia về an toàn điện” kèm theo Quyết định số 41/2025/TT-BCT ngày 22 tháng 06 năm 2025 của Bộ trưởng Bộ Công Thương (để xây dựng biện pháp an toàn).", font: "Times New Roman", size: 26 })],
              }),
              new Paragraph({
                spacing: { line: 312 },
                indent: { left: 720, hanging: 720 },
                children: [new TextRun({ text: "4. “Quy trình an toàn điện” ban hành theo quyết định số 1356/QĐ- EVNNPC ngày 28/06/2025 của Tổng Giám đốc Tập đoàn Điện lực Việt Nam (để xây dựng biện pháp an toàn).", font: "Times New Roman", size: 26 })],
              }),
              new Paragraph({
                spacing: { line: 312 },
                indent: { left: 720, hanging: 720 },
                children: [new TextRun({ text: "5. Căn cứ quy định an toàn thi công Hotline của Tập đoàn Điện lực Việt Nam, Tổng công ty Điện lực miền Bắc.", font: "Times New Roman", size: 26 })],
              }),
              new Paragraph({
                spacing: { line: 312 },
                indent: { left: 720, hanging: 720 },
                children: [new TextRun({ text: "6. Quyết định số 2219/QĐ-EVNNPC ngày 03/8/2018 của Tổng công ty Điện lực miền Bắc quy định hướng dẫn sử dụng và bảo quản dụng cụ thi công hotline tại cấp điện áp 22kV;", font: "Times New Roman", size: 26 })],
              }),
              new Paragraph({
                spacing: { line: 312 },
                indent: { left: 720, hanging: 720 },
                children: [new TextRun({ text: "7. Quyết định số: 681/QĐ-EVNNPC ngày 26 /03/2021 của Tổng công ty Điện lực miền Bắc ban hành quy định hướng dẫn vận hành và bảo quản xe gàu hotline-Hiệu TEREX.", font: "Times New Roman", size: 26 })],
              }),
              new Paragraph({
                spacing: { line: 312 },
                indent: { left: 720, hanging: 720 },
                children: [new TextRun({ text: "8. Căn cứ các quy định đã ban hành về hướng dẫn các thao tác Hotline cho từng công việc bằng phương pháp sử dụng găng tay và xe gàu cách điện.", font: "Times New Roman", size: 26 })],
              }),
              new Paragraph({
                spacing: { line: 312 },
                indent: { left: 720, hanging: 720 },
                children: [new TextRun({ text: `9. Căn cứ vào đề nghị thi công Hotline của ${data.doiQuanLyKhuVuc || "Đội QLĐLKV Bắc Giang"} số ${data.canCu9_soVanBan || "637/KVBG-KHKT"} ngày ${data.canCu9_ngayVanBan ? `${data.canCu9_ngayVanBan.split('-')[2]}/${data.canCu9_ngayVanBan.split('-')[1]}/${data.canCu9_ngayVanBan.split('-')[0]}` : "25/02/2025"}.`, font: "Times New Roman", size: 26 })],
              }),
              new Paragraph({
                spacing: { line: 312 },
                indent: { left: 720, hanging: 720 },
                children: [new TextRun({ text: `10. “Biên bản khảo sát hiện trường” ngày ${data.canCu10_ngay || "27"} tháng ${data.canCu10_thang || "02"} năm ${data.canCu10_nam || "2027"} giữa đội sửa chữa Hotline và ${data.doiQuanLyKhuVuc || "Đội QLĐLKV Bắc Giang"}.`, font: "Times New Roman", size: 26 })],
              }),
              ...blankLine(25 - 11), // Fill the rest of the 25 content lines
              ...blankLine(3), // Bottom padding
              
              new Paragraph({
                children: [new PageBreak()],
              }),

              // Page 3: Đặc điểm
              new Paragraph({
                indent: { left: 720 },
                children: [new TextRun({ text: "II. Các hạng mục công việc:", font: "Times New Roman", size: 26, bold: true })],
              }),
              ...blankLine(1),
              new Paragraph({
                indent: { left: 720 },
                children: [new TextRun({ text: "1. Đặc điểm công trình:", font: "Times New Roman", size: 26, bold: true })],
              }),
              new Paragraph({
                indent: { left: 1440, hanging: 360 },
                children: [new TextRun({ text: "- Đặc điểm cơ bản công trình điện:", font: "Times New Roman", size: 26 })],
              }),
              new Paragraph({
                indent: { left: 1440, hanging: 360 },
                children: [new TextRun({ text: `- ${data.mach}, cột ${data.cot} ĐZ ${data.dz}${data.mach === "Mạch kép" && data.diChungCot ? ` (đi chung cột ${data.diChungCot})` : ""} đang được cấp điện từ đường dây ĐZ ${data.dz} qua MC ${data.mc}.`, font: "Times New Roman", size: 26 })],
              }),
              new Paragraph({
                indent: { left: 1440, hanging: 360 },
                children: [new TextRun({ text: `- Đặc điểm các thiết bị tại vị trí thi công sửa chữa Hotline tại cột ${data.cot} ĐZ ${data.dz}, sử dụng cột ${data.loaiCot} ${data.chieuCaoCot}m, xà ${data.loaiXa}, sứ ${data.loaiSu}, dây ${data.loaiDay}.`, font: "Times New Roman", size: 26 })],
              }),
              new Paragraph({
                indent: { left: 1440, hanging: 360 },
                children: [new TextRun({ text: `- Đã kiểm tra bằng mắt tại cột ${data.cot} ĐZ ${data.dz}, cột liền kề sau không có khả năng rơi dây xuống xà, đứt dây, tuột khóa máng, không có khả năng gây sự cố.`, font: "Times New Roman", size: 26 })],
              }),
              new Paragraph({
                indent: { left: 1440, hanging: 360 },
                children: [new TextRun({ text: `- Hiện trạng: ${data.hienTrang}`, font: "Times New Roman", size: 26 })],
              }),
              new Paragraph({
                indent: { left: 1440, hanging: 360 },
                children: [new TextRun({ text: `- Công trình được thi công trên địa bàn ${data.diaBan}.`, font: "Times New Roman", size: 26 })],
              }),
              new Paragraph({
                indent: { left: 1440, hanging: 360 },
                children: [new TextRun({ text: `- Địa điểm theo sơ đồ lưới điện: Cột ${data.cot} ĐZ ${data.dz}, có nguồn sau xuất tuyến ${data.dzNguon}, cấp điện 1 phần cho ${data.phamViCapDien}.`, font: "Times New Roman", size: 26 })],
              }),
              ...blankLine(1),
              new Paragraph({
                indent: { left: 720 },
                children: [new TextRun({ text: "2. Đặc điểm giao thông:", font: "Times New Roman", size: 26, bold: true })],
              }),
              new Paragraph({
                indent: { left: 1440, hanging: 360 },
                children: [new TextRun({ text: `- Cột ${data.cot} ĐZ ${data.dz} đường rộng ${data.duongRong}m, nằm gần tuyến đường giao thông thuận tiện cho xe chuyên dùng Hotline vào thực hiện công việc.`, font: "Times New Roman", size: 26 })],
              }),
              new Paragraph({
                indent: { left: 1440, hanging: 360 },
                children: [new TextRun({ text: `- Tại vị trí làm việc không có bất kỳ trở ngại về giao thông, hành lang tuyến, công trình nhà cửa, khoảng dây giao chéo.(có hình ảnh kèm theo).`, font: "Times New Roman", size: 26 })],
              }),
              new Paragraph({
                indent: { left: 1440, hanging: 360 },
                children: [new TextRun({ text: `- Cột cách đường ${data.cotCachDuong}m thuận tiện cho thi công bằng xe gầu Hotline. ${data.coHinhAnh ? "(kèm theo hình ảnh)" : ""}`, font: "Times New Roman", size: 26 })],
              }),
              
              new Paragraph({
                children: [new PageBreak()],
              }),
              ...blankLine(3),

              // === Construction images (one per page) ===
              ...data.images.flatMap((img: any) => {
                try {
                  if (!img.url) return [];
                  const base64Data = img.url.split(',')[1];
                  if (!base64Data) return [];
                  const imgBuffer = Buffer.from(base64Data, 'base64');
                  return [
                    new Paragraph({ children: [new PageBreak()] }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new ImageRun({
                          data: imgBuffer,
                          transformation: { width: 550, height: 750 },
                          type: "png",
                        }),
                      ],
                    }),
                  ];
                } catch (e) {
                  return [];
                }
              }),

              // === Section 3: Các hạng mục cần thi công ===
              standardText("3. Các hạng mục cần thi công:", { bold: true }),
              ...data.jobItems.map((item: string, idx: number) =>
                new Paragraph({
                  spacing: { line: 312 },
                  indent: { left: 720 },
                  children: [new TextRun({
                    text: data.jobItems.length === 1
                      ? `- Hạng mục công việc: ${ensureLocation(item, data.cot, data.dz)}.`
                      : `- Hạng mục công việc ${idx + 1}: ${ensureLocation(item, data.cot, data.dz)}.`,
                    font: "Times New Roman", size: 26
                  })],
                })
              ),

              // === Section 4: Vị trí làm việc ===
              new Paragraph({
                spacing: { line: 312 },
                children: [
                  new TextRun({ text: "4. Vị trí làm việc: ", font: "Times New Roman", size: 26, bold: true }),
                  new TextRun({ text: `Tại cột ${data.cot} ĐZ ${data.dz}.`, font: "Times New Roman", size: 26 }),
                ],
              }),

              // === Section 5: Thời gian ===
              new Paragraph({
                spacing: { line: 312 },
                children: [
                  new TextRun({ text: "5. Dự kiến thời gian thực hiện: ", font: "Times New Roman", size: 26, bold: true }),
                  new TextRun({ text: `${data.tg_gio}h/${String(data.tg_soNgay).padStart(2,'0')} ngày trong tháng ${String(data.tg_thang).padStart(2,'0')} năm ${data.tg_nam}.`, font: "Times New Roman", size: 26 }),
                ],
              }),
              ...blankLine(1),

              // === Section III heading ===
              standardText("III. BIỆN PHÁP AN TOÀN THỰC HIỆN CÔNG VIỆC:", { bold: true }),

              // === For each job item: risk table, hotline safety, construction sequence ===
              ...data.jobItems.flatMap((jobItem: string, jobIdx: number) => {
                const fullJobItem = ensureLocation(jobItem, data.cot, data.dz) + ".";
                const riskTableData = jobIdx === 0 ? data.riskTableJob1 : data.riskTableJob2;
                const jobChildren: any[] = [];

                // Job item heading for multi-job
                if (data.jobItems.length > 1) {
                  if (jobIdx > 0) {
                    jobChildren.push(...blankLine(2));
                  }
                  const hmLabel = jobIdx === 0
                    ? `1. Hạng mục công việc 1: ${ensureLocation(jobItem, data.cot, data.dz)}${HANG_MUC_SUFFIX}`
                    : `2. Hạng mục công việc 2: ${ensureLocation(jobItem, data.cot, data.dz)}${SHORT_HOTLINE_SUFFIX}`;
                  jobChildren.push(standardText(hmLabel, { bold: true }));
                }

                // === a. Nhận diện rủi ro ===
                jobChildren.push(
                  new Paragraph({
                    spacing: { line: 312 },
                    children: [new TextRun({ text: "a. Nhận diện rủi ro, biện pháp phòng tránh:", font: "Times New Roman", size: 26, bold: true, italics: true })],
                  })
                );

                // Risk table
                if (riskTableData && riskTableData.length > 0) {
                  const riskHeaderRow = new TableRow({
                    children: [
                      makeCell("TT", { width: { size: 8, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell("Vị trí", { width: { size: 18, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell("Nhận diện mối nguy, đánh giá rủi ro", { width: { size: 30, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell("Biện pháp phòng tránh", { width: { size: 32, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell("Ghi chú", { width: { size: 12, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                    ],
                  });

                  const riskDataRows = riskTableData.map((risk: any, rIdx: number) => {
                    const hazardTexts = risk.details.map((d: any) => d.hazard || "");
                    const measureTexts = risk.details.map((d: any) => d.measure || "");
                    return new TableRow({
                      children: [
                        makeCell(String(rIdx + 1), { width: { size: 8, type: WidthType.PERCENTAGE }, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                        makeCell(risk.location || "", { width: { size: 18, type: WidthType.PERCENTAGE } }),
                        makeMultiCell(hazardTexts, { width: { size: 30, type: WidthType.PERCENTAGE } }),
                        makeMultiCell(measureTexts, { width: { size: 32, type: WidthType.PERCENTAGE } }),
                        makeCell(risk.note || "", { width: { size: 12, type: WidthType.PERCENTAGE } }),
                      ],
                    });
                  });

                  jobChildren.push(
                    new Table({
                      width: { size: 100, type: WidthType.PERCENTAGE },
                      rows: [riskHeaderRow, ...riskDataRows],
                    })
                  );
                }

                // === b. Biện pháp an toàn hotline ===
                jobChildren.push(
                  ...blankLine(1),
                  new Paragraph({
                    spacing: { line: 312 },
                    children: [new TextRun({ text: "b. Các biện pháp an toàn thi công hotline:", font: "Times New Roman", size: 26, bold: true, italics: true })],
                  })
                );

                const currentMC = data.hotlineSafetyMeasures?.[jobIdx]?.mc || data.mc || data.dz;
                const mcText = `- Khóa chức năng TĐL (F79) của ĐKBV MC ${currentMC}.`;
                const extraMeasures: string[] = data.hotlineSafetyMeasures?.[jobIdx]?.extraMeasures || [];
                const allMeasureTexts = [mcText, ...extraMeasures.filter((m: string) => m && m.trim())];

                const hotlineHeaderRow = new TableRow({
                  children: [
                    makeCell("TT", { width: { size: 6, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                    makeCell("Hạng mục công việc", { width: { size: 26, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                    makeCell("Biện pháp an toàn", { width: { size: 68, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                  ],
                });

                const hotlineDataRow = new TableRow({
                  children: [
                    makeCell("1", { width: { size: 6, type: WidthType.PERCENTAGE }, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                    makeCell(fullJobItem, { width: { size: 26, type: WidthType.PERCENTAGE } }),
                    makeMultiCell(allMeasureTexts, { width: { size: 68, type: WidthType.PERCENTAGE } }),
                  ],
                });

                jobChildren.push(
                  new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [hotlineHeaderRow, hotlineDataRow],
                  })
                );

                // Notes after hotline safety table
                jobChildren.push(
                  standardText("- Lưu ý: Nếu đến ngày làm việc mà phương thức thay đổi thì khóa tự đóng lại của ĐKBV các MC cấp điện cho khu vực làm việc của ngày công tác đó. Khi máy cắt nhảy không được đóng lại bằng tay."),
                  standardText("- Nối đất xe gầu hotline trong quá trình thi công hotline;"),
                );

                // === c. Trình tự thi công ===
                jobChildren.push(
                  ...blankLine(1),
                  new Paragraph({
                    spacing: { line: 312 },
                    children: [new TextRun({ text: "c. Biện pháp kỹ thuật để làm công việc (trình tự thi công):", font: "Times New Roman", size: 26, bold: true, italics: true })],
                  })
                );

                // Build allSteps
                const seqData = (data.jobItems.length > 1 && data.sequences)
                  ? (data.sequences[jobIdx + 1] || { eyeCheckText: undefined, guongKiemTra: "", bocCachDienBlocks: [], dieuKhienGauBlocks: [], thaoBocCachDienBlocks: [] })
                  : {
                      eyeCheckText: data.eyeCheckText,
                      guongKiemTra: data.guongKiemTra,
                      bocCachDienBlocks: data.bocCachDienBlocks || [],
                      dieuKhienGauBlocks: data.dieuKhienGauBlocks || [],
                      thaoBocCachDienBlocks: data.thaoBocCachDienBlocks || [],
                    };

                const allSteps: string[] = [];

                if (seqData.eyeCheckText !== undefined && seqData.eyeCheckText.trim() !== "") {
                  const text = seqData.eyeCheckText.trim();
                  allSteps.push(`Kiểm tra bằng mắt ${text}${text.endsWith('.') ? '' : '.'}`);
                }

                allSteps.push("Hai công nhân leo lên gàu đã đeo găng tay và vai áo cao su cách điện và mang theo các dụng cụ, trang bị bảo vệ cá nhân cần thiết, móc dây an toàn chắc chắn.");

                const isHM2 = data.jobItems.length > 1 && jobIdx === 1;
                if (!isHM2) {
                  const guongText = seqData.guongKiemTra
                    ? ` kiểm tra các vị trí, ${seqData.guongKiemTra}, xem có gì bất thường không.`
                    : " kiểm tra các vị trí.";
                  allSteps.push(`Điều khiển gầu đến vị trí phù hợp dùng gương lắp vào sào cách điện${guongText}`);
                }

                (seqData.bocCachDienBlocks || []).forEach((block: any) => {
                  const viTri = (block.viTri || "").trim().replace(/\.+$/, "");
                  const trinhTu = (block.trinhTu || "").trim().replace(/\.+$/, "");
                  allSteps.push(`Điều khiển gầu đến vị trí ${viTri || "..."} để bọc cách điện.`);
                  allSteps.push(`Bọc theo trình tự: ${trinhTu || "..."}.`);
                });
                if ((seqData.bocCachDienBlocks || []).length > 0) {
                  allSteps.push("Kiểm tra xem vùng làm việc được cách ly an toàn chưa (cần phải bọc thêm chỗ nào không). Sau khi đảm bảo vùng làm việc được cách ly an toàn mới tiến hành công việc tiếp theo.");
                }

                (seqData.dieuKhienGauBlocks || []).forEach((block: any) => {
                  const deLamGi = (block.deLamGi || "").trim().replace(/\.+$/, "");
                  const thucHien = (block.thucHien || "").trim().replace(/\.+$/, "");
                  allSteps.push(`Điều khiển gàu đến vị trí phù hợp để ${deLamGi || "..."}.`);
                  allSteps.push(`Thực hiện: ${thucHien || "..."}.`);
                });

                (seqData.thaoBocCachDienBlocks || []).forEach((block: any) => {
                  const viTri = (block.viTri || "").trim().replace(/\.+$/, "");
                  const trinhTu = (block.trinhTu || "").trim().replace(/\.+$/, "");
                  allSteps.push(`Điều khiển gầu đến vị trí ${viTri || "..."} để tháo bọc cách điện.`);
                  allSteps.push(`Tháo bọc theo trình tự: ${trinhTu || "..."}.`);
                });

                allSteps.push("Điều khiển xe gầu hạ người xuống đất, xếp gầu lên xe.");
                allSteps.push("Người chỉ huy trực tiếp kiểm tra lại hiện trường. Phải đảm bảo mọi người, dụng cụ và thiết bị đã ra hết khỏi hiện trường.");
                allSteps.push("Thông báo hoàn thành công tác Hotline và bàn giao hiện trường lại cho đơn vị QLVH, kết thúc công tác.");
                allSteps.push("Kiểm tra và vệ sinh sạch các thiết bị, dụng cụ.");

                // Construction sequence table
                const seqHeaderRow = new TableRow({
                  children: [
                    makeCell("TT", { width: { size: 6, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                    makeCell(`Trình tự thi công: ${ensureLocation(jobItem, data.cot, data.dz)} (Đã thực hiện xong thủ tục cho phép vào làm việc)`, { width: { size: 80, type: WidthType.PERCENTAGE }, bold: true }),
                    makeCell("Đánh dấu đã thực hiện (X)", { width: { size: 14, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                  ],
                });

                const seqDataRows = allSteps.map((step, sIdx) => new TableRow({
                  children: [
                    makeCell(String(sIdx + 1), { width: { size: 6, type: WidthType.PERCENTAGE }, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                    makeCell(step, { width: { size: 80, type: WidthType.PERCENTAGE } }),
                    makeCell("", { width: { size: 14, type: WidthType.PERCENTAGE }, align: AlignmentType.CENTER }),
                  ],
                }));

                jobChildren.push(
                  new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [seqHeaderRow, ...seqDataRows],
                  })
                );

                return jobChildren;
              }),

              // === 2. Các biện pháp an toàn chung ===
              ...blankLine(2),
              standardText("2. Các biện pháp an toàn chung:", { bold: true }),
              standardText("+ Khi một người đã tiếp xúc với phần mang điện thì người còn lại không tiếp xúc với các kết cấu nối đất; khi một người đã tiếp xúc với kết cấu nối đất thì người còn lại không tiếp xúc với phần mang điện. Hai người trên gầu chỉ được phép làm việc với từng pha, không được phép đồng thời tiếp xúc với phần mang điện của hai pha."),
              standardText("+ Kiểm tra các vật tư thiết bị đã được thí nghiệm đầy đủ thông qua biên bản thí nghiệm và tem thí nghiệm đạt tiêu chuẩn."),
              standardText("+ Làm việc trên lưới điện phải tuân theo trình tự như quy định thực hiện chế độ phiếu thao tác:"),
              standardText("\u2022 Người CHTT đọc rõ từng thao tác, người trên gầu thực hiện xong thao tác vừa ra lệnh, người CHTT đánh dấu vào trình tự thi công xong người CHTT mới được phép đọc thao tác tiếp theo.", { indent: { left: 360 } }),
              standardText("\u2022 Người trên gầu chỉ được thực hiện theo lệnh thao tác của người CHTT, không tự ý thực hiện các thao tác mà người CHTT chưa ra lệnh.", { indent: { left: 360 } }),
              standardText("\u2022 Người GSAT quan sát việc thực hiện của người trên gầu, nếu thấy người trên gầu thực hiện động tác không đúng lệnh thao tác thì phải yêu cầu dừng ngay động tác, chấn chỉnh việc thực hiện trình tự thi công.", { indent: { left: 360 } }),
              standardText("+ Trước khi thực hiện công việc đội trưởng SX phải tổ chức cho người làm việc nghiên cứu kỹ PATCTC. Người chỉ huy trực tiếp phải phổ biến nội dung công việc, biện pháp an toàn cho đội công tác trước khi thực hiện công việc, các thao tác thực hiện cụ thể trước khi tổ chức thi công."),
              standardText("+ Đến hiện trường làm việc người CHTT phải Phổ biến phương án tổ chức thi công."),
              standardText("+ Quan sát hiện trường, hội ý, nêu các mối nguy hiểm, thống nhất các giải pháp và trình tự thi công trong phương án thi công."),
              standardText("+ Phân công công tác cho từng cá nhân trong nhóm công tác."),
              standardText("+ Phải sử dụng dây đeo an toàn trong quá trình làm việc trên cao từ 2m trở lên đúng quy định;"),
              standardText("+ Tất cả các dụng cụ, vật tư thi công như: mỏ lết, kìm, búa, êcu, bu lông... phải dùng túi đựng đảm bảo không bị rơi."),
              standardText("+ Trong quá trình thi công, người giám sát an toàn, người chỉ huy trực tiếp phải luôn có mặt và liên tục giám sát chặt chẽ các công việc tại hiện trường."),
              standardText("+ Tất cả nhân viên tham gia công việc phải tập trung tư tưởng vào nhiệm vụ được phân công; giám sát chặt chẽ lẫn nhau trong quá trình làm việc. Nghiêm cấm làm các công việc riêng, hoặc tự ý thực hiện công việc chưa được phép. Phải mang và sử dụng đầy đủ trang bị phương tiện bảo vệ cá nhân, mang thẻ ATĐ;"),
              standardText("+ Khi nâng, hạ vật tư, thiết bị, dụng cụ, người chỉ huy phải ra lệnh dứt khoát, người thực hiện tuyệt đối không được đùa nghịch, chú ý nghe và nhìn hiệu lệnh của chỉ huy trực tiếp. Ký hiệu, tín hiệu phải được thống nhất trước cho mọi người hiểu."),
              standardText("+ Trong quá trình thi công phát hiện thấy có nguy cơ mất an toàn phải kịp thời ngừng ngay công việc và báo cáo với cấp trên;"),
              standardText("- Người Chỉ huy trực tiếp phiếu công tác phải kiểm tra tình trạng sức khỏe của nhân viên đội công tác, đảm bảo không có dấu hiệu khác thường; phải quản lý tốt nhân viên đơn vị công tác trong suốt quá trình làm việc; sau khi kết thúc công việc phải kiểm tra đủ số lượng nhân viên làm việc đã rút hết ra vị trí an toàn mới được ký khóa, trả phiếu công tác;"),
              standardText("- Vị trí đỗ xe gầu đảm bảo không sụt lún, 4 chân xe đã tỳ đều chắc chắn trên tấm chêm."),
              standardText("- Trong quá trình công tác luôn luôn có 2 công nhân trên gầu, thời gian trên gầu không quá 1 giờ (một người điều khiển gầu, một người thực hiện thao tác), những thành viên còn lại đứng giám sát và nhắc nhở, cảnh báo ngăn chặn kịp thời các tình huống không an toàn có thể xảy ra."),
              standardText("- Người công nhân trên gầu phải sử dụng đầy đủ phương tiện bảo vệ cá nhân (vai áo, găng tay cách điện, BHLD...) và một số dụng cụ cần thiết; người điều khiển gầu phải tập trung, điều khiển gầu nhẹ nhàng dứt khoát đưa người thao tác đến vị trí thuận lợi và luôn luôn duy trì 2 lần cách điện."),
              standardText("- Khi thực hiện lắp đặt (hoặc tháo) các bọc cách điện cũng như khi thao tác, lưu ý phải thực hiện nhẹ nhàng tránh làm bung dây lèo, tuột mối nối hoặc làm chao dây gây ngắn mạch 2 pha."),
              standardText("- Khi xe gầu di chuyển cấm người đứng trong gầu và trên sàn xe."),
              standardText(`- Khi tiến hành công việc phải lập rào chắn xung quanh nơi công tác và người CHTT cảnh giới không cho người lạ mặt, xe cộ... đi vào khu vực công trường, trên rào chắn treo biển báo \u201CDỪNG LẠI! CÓ ĐIỆN NGUY HIỂM CHẾT NGƯỜI\u201D`),
              standardText(`+ Đặt biển báo \u201CCHÚ Ý CÔNG TRƯỜNG ĐANG THI CÔNG 5 KM/H\u201D để cảnh báo phương tiện giao thông về các phía khi đỗ xe chuyên dùng và đảm bảo an toàn giao thông.`),
              standardText("+ Người CHTT phải kiêm vai trò Người cảnh giới khu vực công tác để đảm bảo an toàn cho cộng đồng"),
              standardText("- Tiếp địa thân xe gầu."),

              // === 3. Lưu ý ===
              ...blankLine(1),
              standardText("3. Lưu ý:", { bold: true }),
              standardText("- Tuân thủ các yêu cầu đảm bảo an toàn được nêu trong các quy trình thi công Hotline đã được phê duyệt."),
              standardText("- Nghiêm cấm làm việc tại hiện trường công tác:"),
              standardText("+ Khi trời mưa hoặc thời tiết ẩm ướt hoặc có sương mù hoặc có gió cấp 5 trở lên trở lên. Khi có thời tiết thay đổi như trên phải ngừng ngay công tác hotline.", { indent: { left: 360 } }),
              standardText("+ Khi trời tối hoặc ban đêm, nơi làm việc không đủ ánh sáng như ban ngày;", { indent: { left: 360 } }),
              standardText("+ Khi không đảm bảo sức khỏe.", { indent: { left: 360 } }),
              standardText("+ Khi chưa đầy đủ các CCDC an toàn, phương tiện bảo vệ cá nhân.", { indent: { left: 360 } }),
              standardText("- Nếu phát sinh những điểm mất an toàn tại hiện trường thì phải ngừng công việc báo ĐVQLVH cắt điện để xử lý hoặc hoãn công tác."),

              // ===================================================================
              // PHỤ LỤC 1 - DANH SÁCH CBCNV
              // ===================================================================
              new Paragraph({ children: [new PageBreak()] }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 312 },
                children: [new TextRun({ text: "PHỤ LỤC 1", font: "Times New Roman", size: 26, bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 312 },
                children: [new TextRun({ text: "(Kèm theo phương án)", font: "Times New Roman", size: 26, italics: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 312 },
                children: [new TextRun({ text: "DANH SÁCH CBCNV THAM GIA CÔNG TRÌNH VÀ PHÂN CÔNG", font: "Times New Roman", size: 26, bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 312 },
                children: [new TextRun({ text: "ĐƠN VỊ CÔNG TÁC CHO CÔNG VIỆC CỤ THỂ", font: "Times New Roman", size: 26, bold: true })],
              }),
              standardText("I. Danh sách CBCNV đơn vị công tác: Dự kiến 6 - 8/13 người", { bold: true }),

              // Personnel table
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      makeCell("TT", { width: { size: 6, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell("Họ và tên", { width: { size: 33, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell("Nam, nữ", { width: { size: 10, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell("Sinh năm", { width: { size: 9, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell("Chức danh", { width: { size: 11, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell("Nghề nghiệp", { width: { size: 15, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell("Bậc nghề", { width: { size: 8, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell("Bậc ATĐ", { width: { size: 8, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                    ],
                  }),
                  ...(data.personnel || []).map((p: any, pIdx: number) => new TableRow({
                    children: [
                      makeCell(String(pIdx + 1), { width: { size: 6, type: WidthType.PERCENTAGE }, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell(toTitleCase(p.name), { width: { size: 33, type: WidthType.PERCENTAGE } }),
                      makeCell(p.gender || "", { width: { size: 10, type: WidthType.PERCENTAGE }, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell(p.birthYear || "", { width: { size: 9, type: WidthType.PERCENTAGE }, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell(p.role || "", { width: { size: 11, type: WidthType.PERCENTAGE }, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell(p.job || "", { width: { size: 15, type: WidthType.PERCENTAGE }, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell(p.grade || "", { width: { size: 8, type: WidthType.PERCENTAGE }, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell(p.safetyGrade || "", { width: { size: 8, type: WidthType.PERCENTAGE }, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                    ],
                  })),
                ],
              }),

              // ===================================================================
              // PHỤ LỤC 2 - DỤNG CỤ THI CÔNG
              // ===================================================================
              new Paragraph({ children: [new PageBreak()] }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 312 },
                children: [new TextRun({ text: "PHỤ LỤC 2", font: "Times New Roman", size: 26, bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 312 },
                children: [new TextRun({ text: "(Kèm theo phương án)", font: "Times New Roman", size: 26, italics: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 312 },
                children: [new TextRun({ text: "DANH MỤC PHƯƠNG TIỆN, THIẾT BỊ, DỤNG CỤ THI CÔNG", font: "Times New Roman", size: 26, bold: true })],
              }),
              ...blankLine(1),

              // Tools table
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      makeCell("TT", { width: { size: 6, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell("Tên thiết bị", { width: { size: 22, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell("Mã hiệu, quy cách", { width: { size: 18, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell("Nước sản xuất", { width: { size: 12, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell("Đơn vị", { width: { size: 10, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell("Số lượng", { width: { size: 8, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell("Mục đích sử dụng", { width: { size: 24, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                    ],
                  }),
                  ...(data.tools || []).filter((t: any) => t.selected).map((t: any, tIdx: number) => new TableRow({
                    children: [
                      makeCell(String(tIdx + 1), { width: { size: 6, type: WidthType.PERCENTAGE }, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell(t.name || "", { width: { size: 22, type: WidthType.PERCENTAGE } }),
                      makeCell(t.spec || "", { width: { size: 18, type: WidthType.PERCENTAGE }, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell(t.origin || "", { width: { size: 12, type: WidthType.PERCENTAGE }, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell(t.unit || "", { width: { size: 10, type: WidthType.PERCENTAGE }, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell(String(t.quantity || ""), { width: { size: 8, type: WidthType.PERCENTAGE }, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell(t.purpose || "", { width: { size: 24, type: WidthType.PERCENTAGE } }),
                    ],
                  })),
                ],
              }),

              // ===================================================================
              // PHỤ LỤC 3 - VẬT TƯ (conditional)
              // ===================================================================
              ...(data.vatTuCap && data.vatTuCap.length > 0 ? [
                ...blankLine(2),
                standardText(`*) Danh mục vật tư phục vụ thi công cần thiết: ${data.benCapVatTu || "..."} cấp:`, { bold: true }),
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      children: [
                        makeCell("TT", { width: { size: 6, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                        makeCell("Tên thiết bị", { width: { size: 24, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                        makeCell("Nước sản xuất", { width: { size: 15, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                        makeCell("Đơn vị", { width: { size: 10, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                        makeCell("Số lượng", { width: { size: 10, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                        makeCell("Mục đích sử dụng", { width: { size: 35, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      ],
                    }),
                    ...data.vatTuCap.map((v: any, vIdx: number) => new TableRow({
                      children: [
                        makeCell(String(vIdx + 1), { width: { size: 6, type: WidthType.PERCENTAGE }, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                        makeCell(v.name || "", { width: { size: 24, type: WidthType.PERCENTAGE } }),
                        makeCell(v.origin || "", { width: { size: 15, type: WidthType.PERCENTAGE }, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                        makeCell(v.unit || "", { width: { size: 10, type: WidthType.PERCENTAGE }, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                        makeCell(String(v.quantity || ""), { width: { size: 10, type: WidthType.PERCENTAGE }, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                        makeCell(v.purpose || "", { width: { size: 35, type: WidthType.PERCENTAGE } }),
                      ],
                    })),
                  ],
                }),
              ] : []),

              // ===================================================================
              // V. BIÊN BẢN KHẢO SÁT HIỆN TRƯỜNG
              // ===================================================================
              new Paragraph({ children: [new PageBreak()] }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 312 },
                children: [new TextRun({ text: "CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM", font: "Times New Roman", size: 26, bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 312 },
                children: [new TextRun({ text: "Độc lập - Tự do - Hạnh phúc", font: "Times New Roman", size: 26, bold: true })],
              }),
              ...blankLine(1),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 312 },
                children: [new TextRun({ text: "BIÊN BẢN KHẢO SÁT HIỆN TRƯỜNG", font: "Times New Roman", size: 26, bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 312 },
                children: [new TextRun({ text: "(Thi công Hotline)", font: "Times New Roman", size: 26, bold: true })],
              }),
              ...blankLine(1),

              // Job items (bold)
              ...data.jobItems.map((job: string, idx: number) =>
                standardText(`Hạng mục công việc ${idx + 1}: ${ensureLocation(job, data.cot, data.dz)}.`, { bold: true })
              ),

              // Intro paragraph
              (() => {
                const ksTime = `${String(data.ks_gio || "8").padStart(2, '0')}h ${String(data.ks_phut || "00").padStart(2, '0')} phút`;
                const ksDate = data.canCu10_ngay || "25";
                const ksMonth = data.canCu10_thang || "02";
                const ksYear = data.canCu10_nam || "2026";
                return standardText(`Hôm nay, vào hồi ${ksTime}, ngày ${ksDate} tháng ${ksMonth} năm ${ksYear}, tại cột ${data.cot} ĐZ ${data.dz}. Chúng tôi tiến hành khảo sát hiện trường để lập "Phương án tổ chức thi công và biện pháp an toàn", cụ thể như sau:`);
              })(),

              // I. THÀNH PHẦN THAM GIA KHẢO SÁT
              standardText("I. THÀNH PHẦN THAM GIA KHẢO SÁT: Chúng tôi gồm:", { bold: true }),
              standardText("1. Đại diện đơn vị làm công việc: Đội sửa chữa Hotline.", { bold: true }),

              // Hotline members
              ...(data.ks_thanhPhanHotline || []).map((p: any) =>
                new Paragraph({
                  spacing: { line: 312 },
                  indent: { left: 240 },
                  children: [
                    new TextRun({ text: `- Ông (Bà): ${p.name || ""}`, font: "Times New Roman", size: 26 }),
                    new TextRun({ text: `\tChức vụ: ${p.role || ""}`, font: "Times New Roman", size: 26 }),
                  ],
                })
              ),

              // QLVH representative
              standardText(`2. Đại diện ( các) đơn vị quản lý vận hành: ${data.doiQuanLyKhuVuc || ""}`, { bold: true }),
              new Paragraph({
                spacing: { line: 312 },
                indent: { left: 240 },
                children: [
                  new TextRun({ text: `- Ông (Bà): ${data.ks_qlvh_name || ""}`, font: "Times New Roman", size: 26 }),
                  new TextRun({ text: `\tChức vụ: ${data.ks_qlvh_role || ""}`, font: "Times New Roman", size: 26 }),
                ],
              }),

              // Điều độ
              standardText("3. Đại diện các đơn vị điều độ có liên quan (nếu có):", { bold: true }),
              ...(data.ks_coDieuDo && data.ks_thanhPhanDieuDo && data.ks_thanhPhanDieuDo.length > 0
                ? data.ks_thanhPhanDieuDo.map((p: any) =>
                    new Paragraph({
                      spacing: { line: 312 },
                      indent: { left: 240 },
                      children: [
                        new TextRun({ text: `- Ông (Bà): ${p.name || ""} (${p.unit || ""})`, font: "Times New Roman", size: 26 }),
                        new TextRun({ text: `\tChức vụ: ${p.role || ""}`, font: "Times New Roman", size: 26 }),
                      ],
                    })
                  )
                : [
                    new Paragraph({
                      spacing: { line: 312 },
                      indent: { left: 240 },
                      children: [
                        new TextRun({ text: "- Ông (Bà): ...........................................", font: "Times New Roman", size: 26 }),
                        new TextRun({ text: "\tChức vụ: .....Đơn vị.....", font: "Times New Roman", size: 26 }),
                      ],
                    }),
                  ]
              ),

              // Unified text
              standardText("Cùng nhau khảo sát thực tế, trao đổi và thống nhất phân công trách nhiệm thực hiện những nội dung để đảm bảo an toàn về điện cho đơn vị công tác khi tiến hành công việc, cụ thể như sau:"),

              // Section 4
              standardText("4. Địa điểm ( hoặc thiết bị) thực hiện công việc :", { bold: true }),
              standardText(`+ Địa điểm theo sơ đồ lưới điện: Tại cột ${data.cot} ĐZ ${data.dz}.`, { indent: { left: 120 } }),
              standardText(`+ Địa điểm theo hành chính: ${data.diaBan || "xã Tân Yên, tỉnh Bắc Giang"}.`, { indent: { left: 120 } }),

              // Section 5
              standardText("5. Nội dung công việc :", { bold: true }),
              ...data.jobItems.map((job: string, idx: number) => {
                const shortJob = cleanJobItem(job);
                const prefix = data.jobItems.length > 1 ? `5.${idx + 1}. ` : "- ";
                return standardText(`${prefix}Hạng mục công việc ${data.jobItems.length > 1 ? idx + 1 : ""}: ${shortJob} tại cột ${data.cot} ĐZ ${data.dz}.`, { indent: { left: 120 } });
              }),

              // Section 6
              standardText("6. Phạm vi làm việc :", { bold: true }),
              standardText(`- Tại cột ${data.cot} ĐZ ${data.dz}.`, { indent: { left: 120 } }),

              // Section 7
              (() => {
                const gioTH = data.tg_gio || "6";
                const soNgayTH = data.tg_soNgay || "1";
                const thangTH = data.tg_thang || "03";
                const namTH = data.tg_nam || "2026";
                return standardText(`7. Thời gian tiến hành công việc : Khoảng ${gioTH}h/${soNgayTH} ngày trong tháng ${thangTH}/${namTH}.`, { bold: true });
              })(),

              // Section 8 - Những công việc tiến hành không cần cắt điện
              standardText("8. Những công việc tiến hành không cần cắt điện:", { bold: true }),

              // Table 8
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      makeCell("TT", { width: { size: 6, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell("Hạng mục công việc", { width: { size: 44, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                      makeCell("Biện pháp an toàn", { width: { size: 50, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                    ],
                  }),
                  ...data.jobItems.map((jobItem: string, idx: number) => {
                    const fullJob = ensureLocation(jobItem, data.cot, data.dz) + ".";
                    const currentMCv = data.hotlineSafetyMeasures?.[idx]?.mc || data.mc || data.dz;
                    const mcTextV = `- Khóa chức năng TĐL (F79) của ĐKBV MC ${currentMCv}.`;
                    const extraMeasuresV: string[] = data.hotlineSafetyMeasures?.[idx]?.extraMeasures || [];
                    const allMeasures = [mcTextV, ...extraMeasuresV.filter((m: string) => m && m.trim())];
                    return new TableRow({
                      children: [
                        makeCell(String(idx + 1), { width: { size: 6, type: WidthType.PERCENTAGE }, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER }),
                        makeCell(fullJob, { width: { size: 44, type: WidthType.PERCENTAGE } }),
                        makeMultiCell(allMeasures, { width: { size: 50, type: WidthType.PERCENTAGE }, size: 22 }),
                      ],
                    });
                  }),
                ],
              }),

              // Note about phương thức
              ...(data.ks_ghiChuPhuongThuc ? [
                standardText("- Lưu ý: Nếu đến ngày làm việc mà phương thức thay đổi thì khóa tự đóng lại của ĐKBV các MC cấp điện cho khu vực làm việc của ngày công tác đó. Khi máy cắt nhảy không được đóng lại bằng tay.", { italics: true }),
              ] : []),

              // Section 9
              new Paragraph({
                spacing: { line: 312 },
                children: [
                  new TextRun({ text: "9. Những công việc tiến hành cần cắt điện: ", font: "Times New Roman", size: 26, bold: true }),
                  new TextRun({ text: data.ks_canCatDien ? "Có." : "Không.", font: "Times New Roman", size: 26 }),
                ],
              }),

              // Section 10
              new Paragraph({
                spacing: { line: 312 },
                children: [
                  new TextRun({ text: "10. Thống kê các vị trí có máy phát điện của khách hàng phát lên lưới: ", font: "Times New Roman", size: 26, bold: true }),
                  new TextRun({ text: data.ks_mayPhatKH ? "Có." : "Không.", font: "Times New Roman", size: 26 }),
                ],
              }),

              // Section 11
              standardText("11. Những nhận diện, đánh giá nguy cơ rủi ro, chỉ dẫn, cảnh báo, các điều kiện an toàn khác cần lưu ý:", { bold: true }),

              // Table 11 - aggregated risk data
              (() => {
                const t11Rows: any[] = [];
                (data.jobItems || []).forEach((job: string, jobIdx: number) => {
                  const shortJob = cleanJobItem(job);
                  const viTriText = `${shortJob} tại cột ${data.cot} ĐZ ${data.dz}.`;
                  const riskPositions = jobIdx === 0 ? data.riskTableJob1 : data.riskTableJob2;

                  const allHazards: string[] = [];
                  const allMeasuresAgg: string[] = [];

                  if (riskPositions && riskPositions.length > 0) {
                    riskPositions.forEach((pos: any) => {
                      (pos.details || []).forEach((d: any) => {
                        if (d.hazard) {
                          d.hazard.split('\n').forEach((line: string) => {
                            const formatted = formatBullet(line);
                            if (formatted) allHazards.push(formatted);
                          });
                        }
                        if (d.measure) {
                          d.measure.split('\n').forEach((line: string) => {
                            const formatted = formatBullet(line);
                            if (formatted) allMeasuresAgg.push(formatted);
                          });
                        }
                      });
                    });
                  }

                  t11Rows.push(new TableRow({
                    children: [
                      makeCell(String(jobIdx + 1), { width: { size: 5, type: WidthType.PERCENTAGE }, align: AlignmentType.CENTER, vAlign: VerticalAlign.TOP, size: 22 }),
                      makeCell(viTriText, { width: { size: 22, type: WidthType.PERCENTAGE }, size: 22 }),
                      makeMultiCell(allHazards.length > 0 ? allHazards : [""], { width: { size: 28, type: WidthType.PERCENTAGE }, size: 22 }),
                      makeMultiCell(allMeasuresAgg.length > 0 ? allMeasuresAgg : [""], { width: { size: 33, type: WidthType.PERCENTAGE }, size: 22 }),
                      makeCell("", { width: { size: 12, type: WidthType.PERCENTAGE }, size: 22 }),
                    ],
                  }));
                });

                return new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      children: [
                        makeCell("TT", { width: { size: 5, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER, size: 22 }),
                        makeCell("Vị trí", { width: { size: 22, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER, size: 22 }),
                        makeCell("Nhận diện mối nguy, đánh giá rủi ro", { width: { size: 28, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER, size: 22 }),
                        makeCell("Biện pháp phòng tránh", { width: { size: 33, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER, size: 22 }),
                        makeCell("Ghi chú", { width: { size: 12, type: WidthType.PERCENTAGE }, bold: true, align: AlignmentType.CENTER, vAlign: VerticalAlign.CENTER, size: 22 }),
                      ],
                    }),
                    ...t11Rows,
                  ],
                });
              })(),

              // Section 12
              standardText("12. Trách nhiệm các đơn vị liên quan:", { bold: true }),

              // 12.1
              standardText("12.1. Đối với ( các ) đơn vị quản lý vận hành:", { bold: true, italics: true, underline: true, indent: { left: 240 } }),
              standardText("12.1.1: Thực hiện:", { bold: true, indent: { left: 360 } }),

              // Auto + manual requests for 12.1.1
              ...(() => {
                const autoReqs: string[] = [];
                (data.hotlineSafetyMeasures || []).forEach((measure: any) => {
                  if (measure.extraMeasures) {
                    measure.extraMeasures.forEach((m: string) => {
                      if (m && m.trim()) autoReqs.push(m.trim());
                    });
                  }
                });
                const manualReqs = (data.dvqlvhCutRequests || []).filter((req: string) => req.trim() !== "");
                const combined = Array.from(new Set([...autoReqs, ...manualReqs]));

                if (combined.length === 0) {
                  return [standardText("- Cắt điện: Không.", { indent: { left: 480 } })];
                }
                return combined.map((req: string) => {
                  let formatted = req.trim();
                  if (formatted.startsWith("- ")) formatted = formatted.substring(2).trim();
                  formatted = formatted.replace(/\.+$/, "") + ".";
                  return standardText(`- ${formatted}`, { indent: { left: 480 } });
                });
              })(),

              standardText("12.1.2: Cấp phiếu công tác cho đơn vị thi công.", { indent: { left: 360 } }),
              standardText("12.1.3: Bàn giao BPAT cho đơn vị thi công.", { indent: { left: 360 } }),
              standardText("12.1.4: Chỉ rõ phạm vi được phép làm việc trên lưới điện tại hiện trường.", { indent: { left: 360 } }),
              standardText("12.1.5: Nhận Giấy đăng ký công tác, thực hiện lập kế hoạch đăng ký cắt điện với cấp Điều độ theo quy định; viết Phiếu công tác; Giấy phối hợp cho phép (khi có 2 đơn vị QLVH liên quan); Thông báo và gửi lịch cắt điện cho đơn vị làm công việc biết để triển khai công việc.", { indent: { left: 360 } }),
              standardText("12.1.6: Cấp Phiếu công tác, cử người cho phép.", { indent: { left: 360 } }),
              standardText("12.1.7: Cho phép làm việc tại hiện trường.", { indent: { left: 360 } }),

              // 12.2
              standardText("12.2. Đối với đơn vị làm công việc:", { bold: true, italics: true, underline: true, indent: { left: 240 } }),
              standardText(`12.2.1: Lập Giấy đăng ký công tác, gửi Giấy đăng ký công tác đến từng đơn vị quản lý vận hành liên quan. Nếu trước ngày chuẩn bị công tác mà đơn vị thi công có thay đổi về nhân sự nhóm công tác đã đăng ký thì đơn vị thi công phải làm giấy "thay đổi bổ sung nhân lực" và gửi về đơn vị QLVH có ý kiến và kẹp cùng vào phương án thi công.`, { indent: { left: 360 } }),
              standardText("12.2.2: Phối hợp đơn vị QLVH kiểm tra mặt bằng hiện trường làm việc để thiết lập sơ đồ mặt bằng và thuyết minh phương án.", { indent: { left: 360 } }),
              standardText("12.2.3: Cử người CHTT, người GSATĐ nhận hiện trường làm việc tại hiện trường.", { indent: { left: 360 } }),
              standardText("12.2.4: Cử người GSATĐ cho đội công tác trong thời gian làm việc.", { indent: { left: 360 } }),
              standardText("12.2.5: Phối hợp với Người cho phép chụp ảnh biện pháp an toàn hiện trường làm việc.", { indent: { left: 360 } }),
              standardText("12.2.6: Cho phép nhân viên đội công tác vào làm việc.", { indent: { left: 360 } }),
              standardText("12.2.7: Thực hiện đúng phiếu công tác.", { indent: { left: 360 } }),
              standardText("12.2.8: Thực hiện đủ và đúng nội dung công việc trong phạm vi cho phép công tác.", { indent: { left: 360 } }),
              standardText("12.2.9: Có trang bị đủ dụng cụ an toàn và phương tiện bảo vệ cá nhân.", { indent: { left: 360 } }),
              standardText("12.2.10: Sử dụng đầy đủ trang bị, phương tiện dụng cụ làm việc; phương tiện bảo vệ cá nhân, kỷ luật lao động.", { indent: { left: 360 } }),

              // 12.3
              standardText("12.3. Đối với (các) đơn vị điều độ (nếu có) :", { bold: true, italics: true, underline: true, indent: { left: 240 } }),
              standardText(`+ Phương thức kết dây hiện tại: Cột ${data.cot} ĐZ ${data.dz}, đang được cấp điện từ đường dây ${data.ks_dzNguon || data.dzNguon || data.dz} qua MC ${data.mc}.`, { indent: { left: 360 } }),
              standardText(`+ Kiểm tra đã khóa chức năng tự động đóng lại (F79) của ĐKBV MC ${data.mc}. Khi máy cắt nhảy không được đóng lại bằng tay.`, { indent: { left: 360 } }),
              standardText("- Nếu đến ngày làm việc mà phương thức thay đổi thì khóa tự đóng lại của ĐKBV các MC cấp điện cho khu vực làm việc của ngày công tác đó.", { indent: { left: 360 } }),

              // 12.4
              standardText("12.4. Những nội dung khác liên quan đến công việc:", { bold: true, italics: true, underline: true, indent: { left: 240 } }),
              standardText(`- Số lượng ảnh hiện trường đính kèm: 01 ảnh. Những nội dung khác: ${data.ks_noiDungKhac || "Không"}.`, { indent: { left: 360 } }),

              ...blankLine(1),

              // Concluding paragraph
              standardText("Biên bản này được lập thành 02 bản và được tất cả mọi người dự họp của các đơn vị liên quan đến công việc đồng ý, thông qua để làm cơ sở tiến hành công việc sau này và ký tên dưới đây.", { italics: true, indent: { left: 360 } }),

              ...blankLine(2),

              // Signature block (3-column table with no borders)
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                },
                rows: [
                  // Header row
                  new TableRow({
                    children: [
                      new TableCell({
                        width: { size: 33, type: WidthType.PERCENTAGE },
                        borders: noBorders,
                        children: [
                          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 312 }, children: [new TextRun({ text: "ĐẠI DIỆN ĐƠN VỊ LÀM", font: "Times New Roman", size: 26, bold: true })] }),
                          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 312 }, children: [new TextRun({ text: "CÔNG VIỆC", font: "Times New Roman", size: 26, bold: true })] }),
                          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 312 }, children: [new TextRun({ text: "(Ký, ghi rõ họ tên)", font: "Times New Roman", size: 26, italics: true })] }),
                        ],
                      }),
                      new TableCell({
                        width: { size: 34, type: WidthType.PERCENTAGE },
                        borders: noBorders,
                        children: [
                          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 312 }, children: [new TextRun({ text: "ĐẠI DIỆN (CÁC) ĐƠN VỊ", font: "Times New Roman", size: 24, bold: true })] }),
                          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 312 }, children: [new TextRun({ text: "QUẢN LÝ VẬN HÀNH", font: "Times New Roman", size: 24, bold: true })] }),
                          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 312 }, children: [new TextRun({ text: "(Ký, ghi rõ họ tên)", font: "Times New Roman", size: 26, italics: true })] }),
                        ],
                      }),
                      new TableCell({
                        width: { size: 33, type: WidthType.PERCENTAGE },
                        borders: noBorders,
                        children: [
                          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 312 }, children: [new TextRun({ text: "ĐẠI DIỆN CÁC ĐƠN", font: "Times New Roman", size: 26, bold: true })] }),
                          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 312 }, children: [new TextRun({ text: "VỊ LIÊN QUAN", font: "Times New Roman", size: 26, bold: true })] }),
                          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 312 }, children: [new TextRun({ text: "(Ký, ghi rõ họ tên)", font: "Times New Roman", size: 26, italics: true })] }),
                        ],
                      }),
                    ],
                  }),
                  // Blank space row
                  new TableRow({
                    children: [
                      new TableCell({ width: { size: 33, type: WidthType.PERCENTAGE }, borders: noBorders, children: [...blankLine(4)] }),
                      new TableCell({ width: { size: 34, type: WidthType.PERCENTAGE }, borders: noBorders, children: [...blankLine(4)] }),
                      new TableCell({ width: { size: 33, type: WidthType.PERCENTAGE }, borders: noBorders, children: [...blankLine(4)] }),
                    ],
                  }),
                  // Names row
                  (() => {
                    const hotlineNames = data.ks_thanhPhanHotline || [];
                    const qlvhName = data.ks_qlvh_name || "";
                    const dieuDoNames = data.ks_coDieuDo ? (data.ks_thanhPhanDieuDo || []) : [];
                    const maxNames = Math.max(hotlineNames.length, 1, dieuDoNames.length);

                    const hotlineParagraphs = [];
                    for (let ni = 0; ni < maxNames; ni++) {
                      hotlineParagraphs.push(new Paragraph({
                        alignment: AlignmentType.LEFT,
                        spacing: { line: 312 },
                        indent: { left: 240 },
                        children: [new TextRun({ text: hotlineNames[ni] ? `${toTitleCase(hotlineNames[ni].name)}:` : "", font: "Times New Roman", size: 26, bold: true })],
                      }));
                    }

                    const qlvhParagraphs = [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { line: 312 },
                        children: [new TextRun({ text: toTitleCase(qlvhName), font: "Times New Roman", size: 26, bold: true })],
                      }),
                    ];
                    for (let ni = 1; ni < maxNames; ni++) {
                      qlvhParagraphs.push(new Paragraph({ spacing: { line: 312 }, children: [new TextRun({ text: "", font: "Times New Roman", size: 26 })] }));
                    }

                    const dieuDoParagraphs = [];
                    for (let ni = 0; ni < maxNames; ni++) {
                      dieuDoParagraphs.push(new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { line: 312 },
                        children: [new TextRun({ text: dieuDoNames[ni] ? toTitleCase(dieuDoNames[ni].name) : "", font: "Times New Roman", size: 26, bold: true })],
                      }));
                    }

                    return new TableRow({
                      children: [
                        new TableCell({ width: { size: 33, type: WidthType.PERCENTAGE }, borders: noBorders, children: hotlineParagraphs }),
                        new TableCell({ width: { size: 34, type: WidthType.PERCENTAGE }, borders: noBorders, children: qlvhParagraphs }),
                        new TableCell({ width: { size: 33, type: WidthType.PERCENTAGE }, borders: noBorders, children: dieuDoParagraphs }),
                      ],
                    });
                  })(),
                ],
              }),

              // ===================================================================
              // VI. Sơ đồ vùng làm việc (work zone diagrams)
              // ===================================================================
              ...(data.workZoneDiagrams && data.workZoneDiagrams.length > 0
                ? data.workZoneDiagrams.flatMap((diagram: any) => {
                    try {
                      if (!diagram.imageData) return [];
                      const base64Data = diagram.imageData.split(',')[1];
                      if (!base64Data) return [];
                      const imgBuffer = Buffer.from(base64Data, 'base64');
                      return [
                        new Paragraph({ children: [new PageBreak()] }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new ImageRun({
                              data: imgBuffer,
                              transformation: { width: 550, height: 750 },
                              type: "png",
                            }),
                          ],
                        }),
                      ];
                    } catch (e) {
                      return [];
                    }
                  })
                : []
              ),
            ],
          },
        ],
      });

      const buffer = await Packer.toBuffer(doc);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename=PATCTC_${data.soVb}.docx`);
      res.send(buffer);

    } catch (error: any) {
      console.error("Export error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
