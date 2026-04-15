import React, { useState } from 'react';
import { PATCTCData } from '../types';
import { WORK_TYPES } from '../constants';
import { clsx } from 'clsx';
import { formatDateSlash, getDateParts } from '../utils/date';
import { cleanJobItem, ensureLocation, formatJobItem, HANG_MUC_SUFFIX, SHORT_HOTLINE_SUFFIX, toTitleCase } from '../utils/patctcFormat';
import { PreviewPage } from './preview/PreviewPage';
import { PreviewToolbar } from './preview/PreviewToolbar';

interface PreviewProps {
  data: PATCTCData;
  activeSection: string;
  zoom: number;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
}

export const Preview: React.FC<PreviewProps> = ({ data, activeSection, zoom, setZoom }) => {
  const [debugMode, setDebugMode] = useState(false);
  let currentPage = 0;
  const ngayLapParts = getDateParts(data.ngayLap) ?? { day: '', month: '', year: '' };
  
  const getCanCuItems = () => {
    const day = data.canCu10_ngay?.padStart(2, '0') || "27";
    const month = data.canCu10_thang?.padStart(2, '0') || "02";
    const year = data.canCu10_nam || "2027";
    const canCu9Date = formatDateSlash(data.canCu9_ngayVanBan, "25/02/2025");
    
    return [
      "“Quy chuẩn kỹ thuật Quốc gia về kỹ thuật điện - Tập 7: Thi công các công trình điện” (để xây dựng biện pháp kỹ thuật thi công).",
      "“Quy phạm trang bị điện” (bốn tập) kèm theo Quyết định số 19/2006/QĐ-BCN ngày 11 tháng 7 năm 2006 của Bộ trưởng Bộ Công nghiệp (để xây dựng biện pháp kỹ thuật thi công).",
      "“Quy chuẩn kỹ thuật Quốc gia về an toàn điện” kèm theo Quyết định số 41/2025/TT-BCT ngày 22 tháng 06 năm 2025 của Bộ trưởng Bộ Công Thương (để xây dựng biện pháp an toàn).",
      "“Quy trình an toàn điện” ban hành theo quyết định số 1356/QĐ- EVNNPC ngày 28/06/2025 của Tổng Giám đốc Tập đoàn Điện lực Việt Nam (để xây dựng biện pháp an toàn).",
      "Căn cứ quy định an toàn thi công Hotline của Tập đoàn Điện lực Việt Nam, Tổng công ty Điện lực miền Bắc.",
      "Quyết định số 2219/QĐ-EVNNPC ngày 03/8/2018 của Tổng công ty Điện lực miền Bắc quy định hướng dẫn sử dụng và bảo quản dụng cụ thi công hotline tại cấp điện áp 22kV;",
      "Quyết định số: 681/QĐ-EVNNPC ngày 26 /03/2021 của Tổng công ty Điện lực miền Bắc ban hành quy định hướng dẫn vận hành và bảo quản xe gàu hotline-Hiệu TEREX.",
      "Căn cứ các quy định đã ban hành về hướng dẫn các thao tác Hotline cho từng công việc bằng phương pháp sử dụng găng tay và xe gàu cách điện.",
      `Căn cứ vào đề nghị thi công Hotline của ${data.doiQuanLyKhuVuc || "Đội QLĐLKV Bắc Giang"} số ${data.canCu9_soVanBan || "637/KVBG-KHKT"} ngày ${canCu9Date}.`,
      `“Biên bản khảo sát hiện trường” ngày ${day} tháng ${month} năm ${year} giữa đội sửa chữa Hotline và ${data.doiQuanLyKhuVuc || "Đội QLĐLKV Bắc Giang"}.`
    ];
  };

  const canCuItems = getCanCuItems();

  const renderPage = (content: React.ReactNode, id: string) => {
    currentPage++;
    const pageNum = currentPage;
    return (
      <PreviewPage
        key={id}
        id={id}
        isActive={activeSection === id}
        zoom={zoom}
        debugMode={debugMode}
        pageNum={pageNum}
      >
        {content}
      </PreviewPage>
    );
  };

  const fixedDonVi = "Đội sửa chữa Hotline";

  const BlankLine = ({ count = 1 }: { count?: number }) => (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="leading-[1.3]">&nbsp;</div>
      ))}
    </>
  );

  return (
    <div className="flex-1 bg-zinc-100 flex flex-col h-full overflow-hidden">
      <PreviewToolbar
        zoom={zoom}
        setZoom={setZoom}
        debugMode={debugMode}
        setDebugMode={setDebugMode}
      />

      <div className="flex-1 overflow-y-auto p-12 scroll-smooth bg-zinc-200/50">
        {/* Trang bìa */}
        {renderPage((
          <div className="flex flex-col h-full font-times text-black">
            {/* Header Cluster (2 dòng) */}
            <div className="grid grid-cols-2 gap-12 items-start text-[12pt] font-bold">
              <div className="flex flex-col items-center text-center">
                <div className="uppercase leading-tight whitespace-nowrap">CÔNG TY ĐIỆN LỰC BẮC NINH</div>
                <div className="uppercase leading-tight whitespace-nowrap">{fixedDonVi}</div>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="uppercase whitespace-nowrap leading-tight">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div className="leading-tight whitespace-nowrap">Độc lập - Tự do - Hạnh phúc</div>
              </div>
            </div>

            {/* Cách ra 1 dòng (theo yêu cầu) - Thực tế cần 2 để đạt 31 dòng tổng */}
            <BlankLine count={2} />

            {/* Số + Tiêu đề Cluster (4 dòng) */}
            <div className="text-center font-bold text-[13pt] leading-tight">
              Số: {data.soVb}/PATCBPAT- HL
            </div>
            <div className="text-center font-bold text-[13pt] leading-tight uppercase">
              <div>PHƯƠNG ÁN TỔ CHỨC THI CÔNG</div>
              <div>VÀ BIỆN PHÁP AN TOÀN SỬA CHỮA LƯỚI ĐIỆN</div>
              <div>ĐANG MANG ĐIỆN</div>
            </div>

            {/* Cách ra 1 dòng */}
            <BlankLine count={2} />

            {/* Middle Content Cluster (5-7 dòng) */}
            <div className="text-left text-[13pt] leading-[1.3]">
              {data.jobItems.map((item, idx) => (
                <div key={idx} className="leading-tight">
                  <span className="font-bold">
                    {data.jobItems.length === 1 ? "Hạng mục công việc:" : `Hạng mục công việc ${idx + 1}:`}
                  </span>{" "}
                  <span style={{ fontSize: '13pt' }}>
                    {formatJobItem(item, data.cot, data.dz)}
                  </span>
                </div>
              ))}
              <div className="leading-tight">
                <span className="font-bold">Đơn vị thi công:</span> {fixedDonVi}
              </div>
              <div className="text-center italic leading-tight">
                {data.diaDanh}, ngày {ngayLapParts.day} tháng {ngayLapParts.month} năm {ngayLapParts.year}
              </div>
              <div className="flex justify-between items-baseline font-bold leading-tight">
                <span>Người lập phương án: <span className="font-normal">{toTitleCase(data.nguoiLap)}</span></span>
                <span className="mr-12">Ký tên .........</span>
              </div>
            </div>

            {/* Cách ra 1 dòng */}
            <BlankLine count={2} />

            {/* Signature Cluster (14 dòng -> tăng lên theo yêu cầu 5 dòng trống) */}
            <div className="flex flex-col flex-1 justify-end pb-4">
              {/* Người kiểm tra */}
              <div className="flex flex-col items-start">
                <div className="font-bold uppercase text-[13pt] leading-tight">NGƯỜI KIỂM TRA</div>
                <div className="italic font-normal text-[13pt] leading-tight">(Ký, ghi rõ họ tên)</div>
                <BlankLine count={5} />
                <div className="font-bold text-[13pt] ml-4 leading-tight">{toTitleCase(data.nguoiKiemTra)}</div>
              </div>

              {/* Khoảng cách giữa 2 khối */}
              <BlankLine count={2} />

              {/* Đội trưởng */}
              <div className="flex flex-col items-center">
                <div className="font-bold uppercase text-[13pt] leading-tight">ĐỘI TRƯỞNG</div>
                <div className="italic font-normal text-[13pt] leading-tight">(Ký, ghi rõ họ tên)</div>
                <BlankLine count={5} />
                <div className="font-bold text-[13pt] leading-tight">{toTitleCase(data.doiTruong)}</div>
              </div>
            </div>
          </div>
        ), "trang-bia")}

      {/* I. Căn cứ */}
      {renderPage((
        <div className="h-full flex flex-col">
          <div className="font-times text-[13pt] leading-[1.3] text-justify w-full">
            {/* 3 dòng trống đầu (Top Padding) */}
            <div className="h-[3.9em]">&nbsp;</div>
            
            {/* Tiêu đề I */}
            <div className="flex mb-1" style={{ paddingLeft: '0.75cm' }}>
              <div className="w-[0.6cm] flex-shrink-0 font-bold">I.</div>
              <div className="flex-1 font-bold">Căn cứ để lập Phương án tổ chức thi công và biện pháp an toàn:</div>
            </div>

            {/* 10 mục căn cứ */}
            <div className="space-y-0">
              {canCuItems.map((item, idx) => (
                <div key={idx} className="flex mb-1" style={{ paddingLeft: '0.75cm' }}>
                  <div className="w-[0.6cm] flex-shrink-0">{(idx + 1)}.</div>
                  <div className="flex-1 text-justify" style={{ overflowWrap: 'break-word', wordBreak: 'normal' }}>
                    {item}
                  </div>
                </div>
              ))}
              
              {/* Các mục căn cứ bổ sung (11, 12, ...) */}
              {data.canCuBoSung.map((item, idx) => (
                <div key={idx} className="flex mb-1" style={{ paddingLeft: '0.75cm' }}>
                  <div className="w-[0.6cm] flex-shrink-0">{(idx + 11)}.</div>
                  <div className="flex-1 text-justify whitespace-pre-wrap" style={{ overflowWrap: 'break-word', wordBreak: 'normal' }}>
                    {item}
                  </div>
                </div>
              ))}
            </div>

            {/* 3 dòng trống cuối (Bottom Padding) */}
            <div className="h-[3.9em]">&nbsp;</div>
          </div>
        </div>
      ), "can-cu")}

      {/* II. Đặc điểm */}
      {renderPage((
        <div className="space-y-4 font-times text-[13pt] leading-[1.3] text-justify">
          <BlankLine count={3} />
          <h2 className="font-bold pl-[1.27cm]">II. Các hạng mục công việc:</h2>
          
          <div className="space-y-1">
            <h3 className="font-bold pl-[1.27cm]">1. Đặc điểm công trình:</h3>
            <div className="pl-[2.54cm] flex items-start">
              <span className="w-[0.5cm] flex-shrink-0">-</span>
              <span className="flex-1">Đặc điểm cơ bản công trình điện:</span>
            </div>
            <div className="pl-[2.54cm] flex items-start">
              <span className="w-[0.5cm] flex-shrink-0">-</span>
              <span className="flex-1">
                {data.mach}, cột {data.cot} ĐZ {data.dz} 
                {data.mach === "Mạch kép" && data.diChungCot && ` (đi chung cột ${data.diChungCot})`} đang được cấp điện từ đường dây ĐZ {data.dz} qua MC {data.mc}.
              </span>
            </div>
            <div className="pl-[2.54cm] flex items-start">
              <span className="w-[0.5cm] flex-shrink-0">-</span>
              <span className="flex-1">
                Đặc điểm các thiết bị tại vị trí thi công sửa chữa Hotline tại cột {data.cot} ĐZ {data.dz}, sử dụng cột {data.loaiCot} {data.chieuCaoCot}m, xà {data.loaiXa}, sứ {data.loaiSu}, dây {data.loaiDay}.
              </span>
            </div>
            <div className="pl-[2.54cm] flex items-start">
              <span className="w-[0.5cm] flex-shrink-0">-</span>
              <span className="flex-1">
                Đã kiểm tra bằng mắt tại cột {data.cot} ĐZ {data.dz}, cột liền kề sau không có khả năng rơi dây xuống xà, đứt dây, tuột khóa máng, không có khả năng gây sự cố.
              </span>
            </div>
            <div className="pl-[2.54cm] flex items-start">
              <span className="w-[0.5cm] flex-shrink-0">-</span>
              <span className="flex-1">Hiện trạng: {data.hienTrang}</span>
            </div>
            <div className="pl-[2.54cm] flex items-start">
              <span className="w-[0.5cm] flex-shrink-0">-</span>
              <span className="flex-1">Công trình được thi công trên địa bàn {data.diaBan}.</span>
            </div>
            <div className="pl-[2.54cm] flex items-start">
              <span className="w-[0.5cm] flex-shrink-0">-</span>
              <span className="flex-1">
                Địa điểm theo sơ đồ lưới điện: Cột {data.cot} ĐZ {data.dz}, có nguồn sau xuất tuyến {data.dzNguon}, cấp điện 1 phần cho {data.phamViCapDien}.
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="font-bold pl-[1.27cm]">2. Đặc điểm giao thông:</h3>
            <div className="pl-[2.54cm] flex items-start">
              <span className="w-[0.5cm] flex-shrink-0">-</span>
              <span className="flex-1">Cột {data.cot} ĐZ {data.dz} đường rộng {data.duongRong}m, nằm gần tuyến đường giao thông thuận tiện cho xe chuyên dùng Hotline vào thực hiện công việc.</span>
            </div>
            <div className="pl-[2.54cm] flex items-start">
              <span className="w-[0.5cm] flex-shrink-0">-</span>
              <span className="flex-1">Tại vị trí làm việc không có bất kỳ trở ngại về giao thông, hành lang tuyến, công trình nhà cửa, khoảng dây giao chéo.(có hình ảnh kèm theo).</span>
            </div>
            <div className="pl-[2.54cm] flex items-start">
              <span className="w-[0.5cm] flex-shrink-0">-</span>
              <span className="flex-1">Cột cách đường {data.cotCachDuong}m thuận tiện cho thi công bằng xe gầu Hotline. (kèm theo hình ảnh)</span>
            </div>
          </div>
        </div>
      ), "dac-diem")}

      {/* III. Hình ảnh vị trí thi công */}
      {data.images.map((img, idx) => (
        <React.Fragment key={img.id}>
          {renderPage((
            <div className="flex items-center justify-center w-full h-[25.7cm]">
              <img 
                src={img.url} 
                alt={img.name} 
                style={{ 
                  width: `${Math.min(100, img.scalePercent)}%`, 
                  height: `${Math.min(100, img.scalePercent)}%` 
                }}
                className="object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          ), `hinh-anh-${idx}`)}
        </React.Fragment>
      ))}

      {/* Sections 3 onwards - Paginated */}
      {(() => {
        const MAX_LINES = 40;
        const CHARS_PER_LINE = 75;
        const items: any[] = [];

        const getLines = (text: string, charsPerLine: number) => {
          if (!text) return [];
          const paragraphs = text.split('\n');
          const allLines: string[] = [];
          
          paragraphs.forEach(p => {
            if (p.trim() === "") {
              allLines.push("");
              return;
            }
            const words = p.split(/\s+/);
            let currentLine = "";
            words.forEach(word => {
              if (!word) return;
              if ((currentLine + (currentLine ? " " : "") + word).length <= charsPerLine) {
                currentLine += (currentLine ? " " : "") + word;
              } else {
                if (currentLine) allLines.push(currentLine);
                currentLine = word;
                while (currentLine.length > charsPerLine) {
                  allLines.push(currentLine.substring(0, charsPerLine));
                  currentLine = currentLine.substring(charsPerLine);
                }
              }
            });
            if (currentLine) allLines.push(currentLine);
          });
          return allLines;
        };

        const estimateLines = (text: string, charsPerLine = CHARS_PER_LINE) => {
          if (!text) return 0;
          return getLines(text, charsPerLine).length;
        };

        const formatBullet = (text: string) => {
          if (!text) return null;
          let cleaned = text.trim();
          
          // Remove common bullet symbols at the start
          // Symbols: - (hyphen), — (em dash), – (en dash), • (bullet), * (asterisk), + (plus), · (middle dot), o (small o)
          // We use a regex that matches these symbols at the start, possibly repeated or followed by spaces
          cleaned = cleaned.replace(/^([-—–•*+·o]|\s)+/, "");
          cleaned = cleaned.trim();
          
          if (!cleaned || cleaned === "-" || cleaned === "–" || cleaned === "—") return null;
          
          // Ensure it ends with a dot
          if (!cleaned.endsWith('.')) {
            cleaned += '.';
          }
          
          return `- ${cleaned}`;
        };

        // Section 3
        items.push({
          type: 'content',
          lineCount: 1,
          isHeading: true,
          render: () => <div className="font-bold">3. Các hạng mục cần thi công:</div>
        });

        if (data.jobItems.length === 1) {
          const text = `Hạng mục công việc: ${ensureLocation(data.jobItems[0], data.cot, data.dz)}.`;
          items.push({
            type: 'content',
            lineCount: estimateLines(text, CHARS_PER_LINE - 10),
            render: () => (
              <div className="pl-[1.27cm] flex items-start">
                <span className="flex-1">- {text}</span>
              </div>
            )
          });
        } else {
          data.jobItems.forEach((item, idx) => {
            const text = `Hạng mục công việc ${idx + 1}: ${ensureLocation(item, data.cot, data.dz)}.`;
            items.push({
              type: 'content',
              lineCount: estimateLines(text, CHARS_PER_LINE - 15),
              render: () => (
                <div className="pl-[1.27cm] flex items-start">
                  <span className="w-[1cm] flex-shrink-0">3.{idx + 1}.</span>
                  <span className="flex-1">{text}</span>
                </div>
              )
            });
          });
        }

        // Section 4 & 5
        items.push({
          type: 'content',
          lineCount: 1,
          isHeading: true,
          render: () => (
            <div className="flex items-start">
              <span className="font-bold">4. Vị trí làm việc:</span>
              <span className="ml-1">Tại cột {data.cot} ĐZ {data.dz}.</span>
            </div>
          )
        });

        const timeText = `${data.tg_gio}h/${data.tg_soNgay.toString().padStart(2, '0')} ngày trong tháng ${data.tg_thang.toString().padStart(2, '0')} năm ${data.tg_nam}.`;
        items.push({
          type: 'content',
          lineCount: estimateLines(timeText, CHARS_PER_LINE - 25),
          isHeading: true,
          render: () => (
            <div className="flex items-start">
              <span className="font-bold">5. Dự kiến thời gian thực hiện:</span>
              <span className="ml-1">{timeText}</span>
            </div>
          )
        });

        // Section III
        items.push({
          type: 'content',
          lineCount: 2,
          isHeading: true,
          render: () => <div className="font-bold uppercase mt-4">III. Biện pháp an toàn thực hiện công việc:</div>
        });

        if (data.jobItems.length > 1) {
          const text = `1. Hạng mục công việc 1: ${ensureLocation(data.jobItems[0], data.cot, data.dz)}${HANG_MUC_SUFFIX}`;
          items.push({
            type: 'content',
            lineCount: estimateLines(text, CHARS_PER_LINE),
            isHeading: true,
            render: () => <div className="font-bold mt-2">{text}</div>
          });
        }

        // Loop through job items for IV.1 and IV.2
        data.jobItems.forEach((jobItem, jobIdx) => {
          const isSecondItem = jobIdx === 1;
          const fullJobItem = ensureLocation(jobItem, data.cot, data.dz) + ".";

          if (jobIdx > 0) {
            items.push({ type: 'blank', count: 2 });
          }

          if (data.jobItems.length > 1 && isSecondItem) {
            const text = `2. Hạng mục công việc 2: ${ensureLocation(jobItem, data.cot, data.dz)}${SHORT_HOTLINE_SUFFIX}`;
            items.push({
              type: 'content',
              lineCount: estimateLines(text, CHARS_PER_LINE),
              render: () => <div className="font-bold">{text}</div>
            });
          }

          // IV.1 a. Nhận diện rủi ro
          items.push({
            type: 'content',
            lineCount: 1.5,
            isHeading: true,
            render: () => <h4 className="font-bold italic mt-2">a. Nhận diện rủi ro, biện pháp phòng tránh:</h4>
          });

          const riskTableData = jobIdx === 0 ? data.riskTableJob1 : data.riskTableJob2;
          
          const riskRows = riskTableData.map((risk, idx) => {
            const hazardLines = risk.details.reduce((acc, d) => acc + estimateLines(d.hazard, 30), 0);
            const measureLines = risk.details.reduce((acc, d) => acc + estimateLines(d.measure, 30), 0);
            const locationLines = estimateLines(risk.location, 17);
            const rowLines = Math.max(hazardLines, measureLines, locationLines, 1);
            
            return {
              lineCount: rowLines,
              render: () => (
                <tr key={risk.id}>
                  <td className="border border-black p-1 text-center align-middle">{idx + 1}</td>
                  <td className="border border-black p-1 text-left align-top">{risk.location}</td>
                  <td className="border border-black p-1 text-left align-top">
                    {risk.details.map((d, dIdx) => (
                      <div key={d.id} className={dIdx > 0 ? "mt-1" : ""}>{d.hazard}</div>
                    ))}
                  </td>
                  <td className="border border-black p-1 text-left align-top">
                    {risk.details.map((d, dIdx) => (
                      <div key={d.id} className={dIdx > 0 ? "mt-1" : ""}>{d.measure}</div>
                    ))}
                  </td>
                  <td className="border border-black p-1 text-left align-top">{risk.note || ""}</td>
                </tr>
              )
            };
          });

          items.push({
            type: 'table',
            colWidths: ['35px', '110px', '190px', '190px', '79px'],
            headers: (
              <tr key="risk-header" className="bg-zinc-50">
                <th className="border border-black p-1 text-center align-middle font-bold">TT</th>
                <th className="border border-black p-1 text-center align-middle font-bold">Vị trí</th>
                <th className="border border-black p-1 text-center align-middle font-bold">Nhận diện mối nguy, đánh giá rủi ro</th>
                <th className="border border-black p-1 text-center align-middle font-bold">Biện pháp phòng tránh</th>
                <th className="border border-black p-1 text-center align-middle font-bold">Ghi chú</th>
              </tr>
            ),
            rows: riskRows,
            headerLineCount: 2
          });

          // IV.1 b. Biện pháp an toàn hotline
          items.push({
            type: 'content',
            lineCount: 1.5,
            isHeading: true,
            render: () => <h4 className="font-bold italic mt-4">b. Các biện pháp an toàn thi công hotline:</h4>
          });

          const currentMC = data.hotlineSafetyMeasures[jobIdx]?.mc || data.mc || data.dz;
          const mcText = `- Khóa chức năng TĐL (F79) của ĐKBV MC ${currentMC}.`;
          const extraMeasures = data.hotlineSafetyMeasures[jobIdx]?.extraMeasures || [];
          const measureLines = estimateLines(mcText, 60) + extraMeasures.reduce((acc, m) => acc + estimateLines(m, 60), 0);
          const jobItemLines = estimateLines(fullJobItem, 25);
          const hotlineRowLines = Math.max(measureLines, jobItemLines, 1);

          items.push({
            type: 'table',
            colWidths: ['35px', '160px', '409px'],
            headers: (
              <tr key="hotline-header" className="bg-zinc-50">
                <th className="border border-black p-1 text-center align-middle font-bold">TT</th>
                <th className="border border-black p-1 text-center align-middle font-bold">Hạng mục công việc</th>
                <th className="border border-black p-1 text-center align-middle font-bold">Biện pháp an toàn</th>
              </tr>
            ),
            rows: [{
              lineCount: hotlineRowLines,
              render: () => (
                <tr key={`hotline-row-${jobIdx}`}>
                  <td className="border border-black p-1 text-center align-middle">1</td>
                  <td className="border border-black p-1 text-left align-top">{fullJobItem}</td>
                  <td className="border border-black p-1 text-left align-top whitespace-pre-wrap">
                    <div>{mcText}</div>
                    {extraMeasures.map((extra, eIdx) => (
                      <div key={eIdx}>{extra}</div>
                    ))}
                  </td>
                </tr>
              )
            }],
            headerLineCount: 2
          });

          items.push({
            type: 'content',
            lineCount: 2,
            render: () => (
              <div className="mt-2 text-sm">
                <div>- Lưu ý: Nếu đến ngày làm việc mà phương thức thay đổi thì khóa tự đóng lại của ĐKBV các MC cấp điện cho khu vực làm việc của ngày công tác đó. Khi máy cắt nhảy không được đóng lại bằng tay.</div>
                <div className="mt-1">- Nối đất xe gầu hotline trong quá trình thi công hotline;</div>
              </div>
            )
          });

          // IV.2 c. Trình tự thi công
          items.push({
            type: 'content',
            lineCount: 2,
            isHeading: true,
            render: () => <h4 className="font-bold italic mt-4">c. Biện pháp kỹ thuật để làm công việc (trình tự thi công):</h4>
          });

          const seqData = (data.jobItems.length > 1 && data.sequences) 
            ? (data.sequences[jobIdx + 1] || { eyeCheckText: undefined, guongKiemTra: "", bocCachDienBlocks: [], dieuKhienGauBlocks: [], thaoBocCachDienBlocks: [] })
            : { 
                eyeCheckText: data.eyeCheckText,
                guongKiemTra: data.guongKiemTra, 
                bocCachDienBlocks: data.bocCachDienBlocks, 
                dieuKhienGauBlocks: data.dieuKhienGauBlocks, 
                thaoBocCachDienBlocks: data.thaoBocCachDienBlocks 
              };

          const allSteps: string[] = [];
          
          if (seqData.eyeCheckText !== undefined && seqData.eyeCheckText.trim() !== "") {
            const text = seqData.eyeCheckText.trim();
            const formattedText = `Kiểm tra bằng mắt ${text}${text.endsWith('.') ? '' : '.'}`;
            allSteps.push(formattedText);
          }

          allSteps.push("Hai công nhân leo lên gàu đã đeo găng tay và vai áo cao su cách điện và mang theo các dụng cụ, trang bị bảo vệ cá nhân cần thiết, móc dây an toàn chắc chắn.");
          
          const isHM2 = data.jobItems.length > 1 && jobIdx === 1;
          if (!isHM2) {
            const guongText = seqData.guongKiemTra 
              ? ` kiểm tra các vị trí, ${seqData.guongKiemTra}, xem có gì bất thường không.` 
              : " kiểm tra các vị trí.";
            allSteps.push(`Điều khiển gầu đến vị trí phù hợp dùng gương lắp vào sào cách điện${guongText}`);
          }
          
          seqData.bocCachDienBlocks.forEach(block => {
            const viTri = block.viTri.trim().replace(/\.+$/, "");
            const trinhTu = block.trinhTu.trim().replace(/\.+$/, "");
            allSteps.push(`Điều khiển gầu đến vị trí ${viTri || "..."} để bọc cách điện.`);
            allSteps.push(`Bọc theo trình tự: ${trinhTu || "..."}.`);
          });
          if (seqData.bocCachDienBlocks.length > 0) {
            allSteps.push("Kiểm tra xem vùng làm việc được cách ly an toàn chưa (cần phải bọc thêm chỗ nào không). Sau khi đảm bảo vùng làm việc được cách ly an toàn mới tiến hành công việc tiếp theo.");
          }
          
          seqData.dieuKhienGauBlocks.forEach(block => {
            const deLamGi = block.deLamGi.trim().replace(/\.+$/, "");
            const thucHien = block.thucHien.trim().replace(/\.+$/, "");
            allSteps.push(`Điều khiển gàu đến vị trí phù hợp để ${deLamGi || "..."}.`);
            allSteps.push(`Thực hiện: ${thucHien || "..."}.`);
          });
          
          seqData.thaoBocCachDienBlocks.forEach(block => {
            const viTri = block.viTri.trim().replace(/\.+$/, "");
            const trinhTu = block.trinhTu.trim().replace(/\.+$/, "");
            allSteps.push(`Điều khiển gầu đến vị trí ${viTri || "..."} để tháo bọc cách điện.`);
            allSteps.push(`Tháo bọc theo trình tự: ${trinhTu || "..."}.`);
          });
          allSteps.push("Điều khiển xe gầu hạ người xuống đất, xếp gầu lên xe.");
          allSteps.push("Người chỉ huy trực tiếp kiểm tra lại hiện trường. Phải đảm bảo mọi người, dụng cụ và thiết bị đã ra hết khỏi hiện trường.");
          allSteps.push("Thông báo hoàn thành công tác Hotline và bàn giao hiện trường lại cho đơn vị QLVH, kết thúc công tác.");
          allSteps.push("Kiểm tra và vệ sinh sạch các thiết bị, dụng cụ.");

          const seqRows = allSteps.map((content, sIdx) => {
            let renderedContent: React.ReactNode = content;
            if (content.startsWith("Kiểm tra bằng mắt") || content.startsWith("Điều khiển gầu đến") || content.startsWith("Điều khiển gàu đến")) {
              if (!content.includes("...")) renderedContent = <span className="font-bold">{content}</span>;
            } else if (content.startsWith("Bọc theo trình tự:") || content.startsWith("Tháo bọc theo trình tự:")) {
              const colonIndex = content.indexOf(":");
              const label = content.substring(0, colonIndex + 1);
              const value = content.substring(colonIndex + 1);
              renderedContent = <>{label}<span className="font-bold">{value}</span></>;
            }

            return {
              lineCount: estimateLines(content, 68),
              render: () => (
                <tr key={sIdx}>
                  <td className="border border-black p-2 text-center align-middle">{sIdx + 1}</td>
                  <td className="border border-black p-2 text-left align-top">{renderedContent}</td>
                  <td className="border border-black p-2"></td>
                </tr>
              )
            };
          });

          items.push({
            type: 'table',
            colWidths: ['45px', '480px', '79px'],
            headers: (
              <tr key="seq-header" className="bg-zinc-50">
                <th className="border border-black p-2 text-center align-middle font-bold">TT</th>
                <th className="border border-black p-2 text-left align-middle font-bold">
                  Trình tự thi công: {ensureLocation(jobItem, data.cot, data.dz)} (Đã thực hiện xong thủ tục cho phép vào làm việc)
                </th>
                <th className="border border-black p-2 text-center align-middle font-bold">Đánh dấu đã thực hiện (X)</th>
              </tr>
            ),
            rows: seqRows,
            headerLineCount: 3
          });
        });

        // 2. Các biện pháp an toàn chung:
        items.push({ type: 'blank', count: 2 });
        items.push({
          type: 'splittable-text-block',
          text: "2. Các biện pháp an toàn chung:",
          className: "font-bold",
          isHeading: true
        });

        const commonMeasures = [
          "+ Khi một người đã tiếp xúc với phần mang điện thì người còn lại không tiếp xúc với các kết cấu nối đất; khi một người đã tiếp xúc với kết cấu nối đất thì người còn lại không tiếp xúc với phần mang điện. Hai người trên gầu chỉ được phép làm việc với từng pha, không được phép đồng thời tiếp xúc với phần mang điện của hai pha.",
          "+ Kiểm tra các vật tư thiết bị đã được thí nghiệm đầy đủ thông qua biên bản thí nghiệm và tem thí nghiệm đạt tiêu chuẩn.",
          "+ Làm việc trên lưới điện phải tuân theo trình tự như quy định thực hiện chế độ phiếu thao tác:"
        ];

        commonMeasures.forEach(text => {
          items.push({
            type: 'splittable-text-block',
            text,
            className: "text-justify"
          });
        });

        const bulletMeasures = [
          "• Người CHTT đọc rõ từng thao tác, người trên gầu thực hiện xong thao tác vừa ra lệnh, người CHTT đánh dấu vào trình tự thi công xong người CHTT mới được phép đọc thao tác tiếp theo.",
          "• Người trên gầu chỉ được thực hiện theo lệnh thao tác của người CHTT, không tự ý thực hiện các thao tác mà người CHTT chưa ra lệnh.",
          "• Người GSAT quan sát việc thực hiện của người trên gầu, nếu thấy người trên gầu thực hiện động tác không đúng lệnh thao tác thì phải yêu cầu dừng ngay động tác, chấn chỉnh việc thực hiện trình tự thi công."
        ];

        bulletMeasures.forEach(text => {
          items.push({
            type: 'splittable-text-block',
            text,
            className: "pl-6 text-justify"
          });
        });

        const moreMeasures = [
          "+ Trước khi thực hiện công việc đội trưởng SX phải tổ chức cho người làm việc nghiên cứu kỹ PATCTC. Người chỉ huy trực tiếp phải phổ biến nội dung công việc, biện pháp an toàn cho đội công tác trước khi thực hiện công việc, các thao tác thực hiện cụ thể trước khi tổ chức thi công.",
          "+ Đến hiện trường làm việc người CHTT phải Phổ biến phương án tổ chức thi công.",
          "+ Quan sát hiện trường, hội ý, nêu các mối nguy hiểm, thống nhất các giải pháp và trình tự thi công trong phương án thi công.",
          "+ Phân công công tác cho từng cá nhân trong nhóm công tác.",
          "+ Phải sử dụng dây đeo an toàn trong quá trình làm việc trên cao từ 2m trở lên đúng quy định;",
          "+ Tất cả các dụng cụ, vật tư thi công như: mỏ lết, kìm, búa, êcu, bu lông... phải dùng túi đựng đảm bảo không bị rơi.",
          "+ Trong quá trình thi công, người giám sát an toàn, người chỉ huy trực tiếp phải luôn có mặt và liên tục giám sát chặt chẽ các công việc tại hiện trường.",
          "+ Tất cả nhân viên tham gia công việc phải tập trung tư tưởng vào nhiệm vụ được phân công; giám sát chặt chẽ lẫn nhau trong quá trình làm việc. Nghiêm cấm làm các công việc riêng, hoặc tự ý thực hiện công việc chưa được phép. Phải mang và sử dụng đầy đủ trang bị phương tiện bảo vệ cá nhân, mang thẻ ATĐ;",
          "+ Khi nâng, hạ vật tư, thiết bị, dụng cụ, người chỉ huy phải ra lệnh dứt khoát, người thực hiện tuyệt đối không được đùa nghịch, chú ý nghe và nhìn hiệu lệnh của chỉ huy trực tiếp. Ký hiệu, tín hiệu phải được thống nhất trước cho mọi người hiểu.",
          "+ Trong quá trình thi công phát hiện thấy có nguy cơ mất an toàn phải kịp thời ngừng ngay công việc và báo cáo với cấp trên;",
          "- Người Chỉ huy trực tiếp phiếu công tác phải kiểm tra tình trạng sức khỏe của nhân viên đội công tác, đảm bảo không có dấu hiệu khác thường; phải quản lý tốt nhân viên đơn vị công tác trong suốt quá trình làm việc; sau khi kết thúc công việc phải kiểm tra đủ số lượng nhân viên làm việc đã rút hết ra vị trí an toàn mới được ký khóa, trả phiếu công tác;",
          "- Vị trí đỗ xe gầu đảm bảo không sụt lún, 4 chân xe đã tỳ đều chắc chắn trên tấm chêm.",
          "- Trong quá trình công tác luôn luôn có 2 công nhân trên gầu, thời gian trên gầu không quá 1 giờ (một người điều khiển gầu, một người thực hiện thao tác), những thành viên còn lại đứng giám sát và nhắc nhở, cảnh báo ngăn chặn kịp thời các tình huống không an toàn có thể xảy ra.",
          "- Người công nhân trên gầu phải sử dụng đầy đủ phương tiện bảo vệ cá nhân (vai áo, găng tay cách điện, BHLD...) và một số dụng cụ cần thiết; người điều khiển gầu phải tập trung, điều khiển gầu nhẹ nhàng dứt khoát đưa người thao tác đến vị trí thuận lợi và luôn luôn duy trì 2 lần cách điện.",
          "- Khi thực hiện lắp đặt (hoặc tháo) các bọc cách điện cũng như khi thao tác, lưu ý phải thực hiện nhẹ nhàng tránh làm bung dây lèo, tuột mối nối hoặc làm chao dây gây ngắn mạch 2 pha.",
          "- Khi xe gầu di chuyển cấm người đứng trong gầu và trên sàn xe.",
          "- Khi tiến hành công việc phải lập rào chắn xung quanh nơi công tác và người CHTT cảnh giới không cho người lạ mặt, xe cộ... đi vào khu vực công trường, trên rào chắn treo biển báo “DỪNG LẠI! CÓ ĐIỆN NGUY HIỂM CHẾT NGƯỜI”",
          "+ Đặt biển báo “CHÚ Ý CÔNG TRƯỜNG ĐANG THI CÔNG 5 KM/H” để cảnh báo phương tiện giao thông về các phía khi đỗ xe chuyên dùng và đảm bảo an toàn giao thông.",
          "+ Người CHTT phải kiêm vai trò Người cảnh giới khu vực công tác để đảm bảo an toàn cho cộng đồng",
          "- Tiếp địa thân xe gầu."
        ];

        moreMeasures.forEach(text => {
          items.push({
            type: 'splittable-text-block',
            text,
            className: "text-justify"
          });
        });

        items.push({ type: 'blank', count: 1 });
        items.push({
          type: 'splittable-text-block',
          text: "3. Lưu ý:",
          className: "font-bold",
          isHeading: true
        });

        const noteMeasures = [
          "- Tuân thủ các yêu cầu đảm bảo an toàn được nêu trong các quy trình thi công Hotline đã được phê duyệt.",
          "- Nghiêm cấm làm việc tại hiện trường công tác:"
        ];

        noteMeasures.forEach(text => {
          items.push({
            type: 'splittable-text-block',
            text,
            className: "text-justify"
          });
        });

        const indentedNotes = [
          "+ Khi trời mưa hoặc thời tiết ẩm ướt hoặc có sương mù hoặc có gió cấp 5 trở lên trở lên. Khi có thời tiết thay đổi như trên phải ngừng ngay công tác hotline.",
          "+ Khi trời tối hoặc ban đêm, nơi làm việc không đủ ánh sáng như ban ngày;",
          "+ Khi không đảm bảo sức khỏe.",
          "+ Khi chưa đầy đủ các CCDC an toàn, phương tiện bảo vệ cá nhân."
        ];

        indentedNotes.forEach(text => {
          items.push({
            type: 'splittable-text-block',
            text,
            className: "pl-6 text-justify"
          });
        });

        items.push({
          type: 'splittable-text-block',
          text: "- Nếu phát sinh những điểm mất an toàn tại hiện trường thì phải ngừng công việc báo ĐVQLVH cắt điện để xử lý hoặc hoãn công tác.",
          className: "text-justify"
        });

        // Add Appendices to dynamic section
        const formatName = (name: string) => {
          const titleCaseName = toTitleCase(name);
          const words = titleCaseName.trim().split(/\s+/);
          if (words.length === 4) {
            return (
              <div className="leading-tight">
                {words[0]} {words[1]}
                <br />
                {words[2]} {words[3]}
              </div>
            );
          }
          return titleCaseName;
        };


        const rowsPerPage = 13;
        const totalPersonnel = data.personnel.length;
        const numPages = Math.max(1, Math.ceil(totalPersonnel / rowsPerPage));

        for (let pIdx = 0; pIdx < numPages; pIdx++) {
          const i = pIdx * rowsPerPage;
          const chunk = data.personnel.slice(i, i + rowsPerPage);
          const isFirstPage = pIdx === 0;

          if (isFirstPage) {
            items.push({
              type: 'content',
              lineCount: 1,
              isHeading: true,
              forceNewPage: true,
              render: () => <h2 className="font-bold text-center">PHỤ LỤC 1</h2>
            });
            items.push({
              type: 'content',
              lineCount: 1,
              isHeading: true,
              render: () => <div className="text-center italic">(Kèm theo phương án)</div>
            });
            items.push({
              type: 'content',
              lineCount: 2,
              isHeading: true,
              render: () => (
                <div className="text-center font-bold uppercase">
                  <div>DANH SÁCH CBCNV THAM GIA CÔNG TRÌNH VÀ PHÂN CÔNG</div>
                  <div>ĐƠN VỊ CÔNG TÁC CHO CÔNG VIỆC CỤ THỂ</div>
                </div>
              )
            });
            items.push({
              type: 'content',
              lineCount: 1,
              isHeading: true,
              render: () => <div className="font-bold text-left">I. Danh sách CBCNV đơn vị công tác: Dự kiến 6 - 8/13 người</div>
            });
          } else {
            items.push({
              type: 'content',
              lineCount: 1,
              isHeading: true,
              forceNewPage: true,
              render: () => <h2 className="font-bold text-center">PHỤ LỤC 1</h2>
            });
          }

          const chunkRows = chunk.map((p, chunkIdx) => {
            const globalIdx = i + chunkIdx;
            return {
              lineCount: p.name.trim().split(/\s+/).length === 4 ? 2 : 1,
              render: () => (
                <tr key={p.id} className="pl1-row">
                  <td className="border border-black p-1 text-center align-middle col-tt">{globalIdx + 1}</td>
                  <td className="border border-black p-1 text-left align-middle pl-2">{formatName(p.name)}</td>
                  <td className="border border-black p-1 text-center align-middle col-gender">{p.gender}</td>
                  <td className="border border-black p-1 text-center align-middle">{p.birthYear}</td>
                  <td className="border border-black p-1 text-center align-middle">{p.role}</td>
                  <td className="border border-black p-1 text-center align-middle">{p.job}</td>
                  <td className="border border-black p-1 text-center align-middle">{p.grade}</td>
                  <td className="border border-black p-1 text-center align-middle">{p.safetyGrade}</td>
                </tr>
              )
            };
          });

          items.push({
            type: 'table',
            className: 'pl1-table pl1-page',
            forceNewPage: false,
            colWidths: ['6%', '33%', '10%', '9%', '11%', '15%', '8%', '8%'],
            headers: (
              <tr key={`personnel-header-${pIdx}`} className="bg-zinc-50">
                <th className="border border-black p-1 font-bold text-center align-middle col-tt">TT</th>
                <th className="border border-black p-1 font-bold text-center align-middle">Họ và tên</th>
                <th className="border border-black p-1 font-bold text-center align-middle col-gender">Nam, nữ</th>
                <th className="border border-black p-1 font-bold text-center align-middle">Sinh năm</th>
                <th className="border border-black p-1 font-bold text-center align-middle">Chức danh</th>
                <th className="border border-black p-1 font-bold text-center align-middle">Nghề nghiệp</th>
                <th className="border border-black p-1 font-bold text-center align-middle">Bậc nghề</th>
                <th className="border border-black p-1 font-bold text-center align-middle">Bậc ATĐ</th>
              </tr>
            ),
            rows: chunkRows,
            headerLineCount: 2
          });
        }

        const selectedTools = data.tools.filter(t => t.selected);
        const totalTools = selectedTools.length;
        const hasMaterials = data.vatTuCap.length > 0;
        const RESERVE_ROWS = 4; // Title (1) + Header (2) + At least 1 row (1)
        const limitLastPage = rowsPerPage - RESERVE_ROWS;

        let toolChunks: any[][] = [];
        if (hasMaterials && totalTools > 0) {
          let remaining = [...selectedTools];
          while (remaining.length > 0) {
            if (remaining.length <= rowsPerPage) {
              // This is the last chunk of tools
              if (remaining.length > limitLastPage) {
                // Too many to fit materials on the same page, split it
                toolChunks.push(remaining.slice(0, limitLastPage));
                remaining = remaining.slice(limitLastPage);
              } else {
                toolChunks.push(remaining);
                remaining = [];
              }
            } else {
              toolChunks.push(remaining.slice(0, rowsPerPage));
              remaining = remaining.slice(rowsPerPage);
            }
          }
        } else {
          if (totalTools === 0) {
            toolChunks = [[]];
          } else {
            for (let i = 0; i < totalTools; i += rowsPerPage) {
              toolChunks.push(selectedTools.slice(i, i + rowsPerPage));
            }
          }
        }

        const numToolPages = toolChunks.length;

        for (let pIdx = 0; pIdx < numToolPages; pIdx++) {
          const chunk = toolChunks[pIdx];
          const i = toolChunks.slice(0, pIdx).reduce((acc, curr) => acc + curr.length, 0);
          const isFirstPage = pIdx === 0;

          if (isFirstPage) {
            items.push({
              type: 'content',
              lineCount: 1,
              isHeading: true,
              forceNewPage: true,
              render: () => <h2 className="font-bold text-center">PHỤ LỤC 2</h2>
            });
            items.push({
              type: 'content',
              lineCount: 1,
              isHeading: true,
              render: () => <div className="text-center italic">(Kèm theo phương án)</div>
            });
            items.push({
              type: 'content',
              lineCount: 2,
              isHeading: true,
              render: () => (
                <div className="text-center font-bold uppercase">
                  <div>DANH MỤC PHƯƠNG TIỆN, THIẾT BỊ, DỤNG CỤ THI CÔNG</div>
                </div>
              )
            });
            items.push({
              type: 'blank',
              lineCount: 1
            });
          } else {
            items.push({
              type: 'content',
              lineCount: 1,
              isHeading: true,
              forceNewPage: true,
              render: () => <h2 className="font-bold text-center">PHỤ LỤC 2</h2>
            });
          }

          const chunkRows = chunk.map((t, chunkIdx) => {
            const globalIdx = i + chunkIdx;
            return {
              lineCount: 1,
              render: () => (
                <tr key={t.id} className="pl1-row">
                  <td className="border border-black p-1 text-center align-middle col-tt">{globalIdx + 1}</td>
                  <td className="border border-black p-1 text-left align-middle pl-2">{t.name}</td>
                  <td className="border border-black p-1 text-center align-middle">{t.spec}</td>
                  <td className="border border-black p-1 text-center align-middle">{t.origin}</td>
                  <td className="border border-black p-1 text-center align-middle whitespace-nowrap">{t.unit}</td>
                  <td className="border border-black p-1 text-center align-middle">{t.quantity}</td>
                  <td className="border border-black p-1 text-left align-middle pl-2">{t.purpose}</td>
                </tr>
              )
            };
          });

          items.push({
            type: 'table',
            className: 'pl1-table pl1-page',
            forceNewPage: false,
            colWidths: ['6%', '22%', '18%', '12%', '10%', '8%', '24%'],
            headers: (
              <tr key={`tools-header-${pIdx}`} className="bg-zinc-50">
                <th className="border border-black p-1 font-bold text-center align-middle col-tt">TT</th>
                <th className="border border-black p-1 font-bold text-center align-middle">Tên thiết bị</th>
                <th className="border border-black p-1 font-bold text-center align-middle">Mã hiệu, quy cách</th>
                <th className="border border-black p-1 font-bold text-center align-middle">Nước sản xuất</th>
                <th className="border border-black p-1 font-bold text-center align-middle">Đơn vị</th>
                <th className="border border-black p-1 font-bold text-center align-middle">Số lượng</th>
                <th className="border border-black p-1 font-bold text-center align-middle">Mục đích sử dụng</th>
              </tr>
            ),
            rows: chunkRows,
            headerLineCount: 2
          });
        }

        // Appendix 3: Vật tư thi công (Paginated - Exactly like Appendix 2)
        if (data.vatTuCap.length > 0) {
          const rowsPerPageMaterials = 13;
          const numMaterialPages = Math.ceil(data.vatTuCap.length / rowsPerPageMaterials);

          for (let pIdx = 0; pIdx < numMaterialPages; pIdx++) {
            const startIdx = pIdx * rowsPerPageMaterials;
            const chunk = data.vatTuCap.slice(startIdx, startIdx + rowsPerPageMaterials);

            items.push({
              type: 'content',
              lineCount: 2,
              isHeading: true,
              forceNewPage: pIdx > 0, // Only force new page for subsequent material pages
              render: () => (
                <div className="materials-table">
                  <h3 className="font-bold mt-4">
                    *) Danh mục vật tư phục vụ thi công cần thiết: {data.benCapVatTu || "..."} cấp: {pIdx > 0 ? "(tiếp theo)" : ""}
                  </h3>
                </div>
              )
            });

            const materialRows = chunk.map((v, idx) => {
              const globalIdx = startIdx + idx;
              return {
                lineCount: 1,
                render: () => (
                  <tr key={v.id || globalIdx} className="pl1-row">
                    <td className="border border-black p-1 text-center align-middle col-tt">{globalIdx + 1}</td>
                    <td className="border border-black p-1 text-left align-middle pl-2">{v.name}</td>
                    <td className="border border-black p-1 text-center align-middle">{v.origin}</td>
                    <td className="border border-black p-1 text-center align-middle whitespace-nowrap">{v.unit}</td>
                    <td className="border border-black p-1 text-center align-middle">{v.quantity}</td>
                    <td className="border border-black p-1 text-left align-middle pl-2">{v.purpose}</td>
                  </tr>
                )
              };
            });

            items.push({
              type: 'table',
              className: 'pl1-table materials-table pl1-page',
              colWidths: ['6%', '24%', '15%', '10%', '10%', '35%'],
              headers: (
                <tr key={`vattu-header-${pIdx}`} className="bg-zinc-50">
                  <th className="border border-black p-1 font-bold text-center align-middle col-tt">TT</th>
                  <th className="border border-black p-1 font-bold text-center align-middle">Tên thiết bị</th>
                  <th className="border border-black p-1 font-bold text-center align-middle">Nước sản xuất</th>
                  <th className="border border-black p-1 font-bold text-center align-middle">Đơn vị</th>
                  <th className="border border-black p-1 font-bold text-center align-middle">Số lượng</th>
                  <th className="border border-black p-1 font-bold text-center align-middle">Mục đích sử dụng</th>
                </tr>
              ),
              rows: materialRows,
              headerLineCount: 2
            });
          }
        }

        // V. BIÊN BẢN KHẢO SÁT HIỆN TRƯỜNG (Moved here to appear after Appendices)
        items.push({
          type: 'content',
          lineCount: 5,
          isHeading: true,
          forceNewPage: true,
          render: () => (
            <div className="bbks-section">
              <div className="text-center font-bold uppercase">
                <div>CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div>Độc lập - Tự do - Hạnh phúc</div>
                <div className="mt-4">BIÊN BẢN KHẢO SÁT HIỆN TRƯỜNG</div>
                <div>(Thi công Hotline)</div>
              </div>
            </div>
          )
        });

        const jobItems = data.jobItems || [];
        jobItems.forEach((job, idx) => {
          const text = `Hạng mục công việc ${idx + 1}: ${ensureLocation(job, data.cot, data.dz)}.`;
          items.push({
            type: 'content',
            lineCount: estimateLines(text),
            render: () => (
              <div className="font-bold">
                {text}
              </div>
            )
          });
        });

        const ksDate = data.canCu10_ngay || "25";
        const ksMonth = data.canCu10_thang || "02";
        const ksYear = data.canCu10_nam || "2026";
        const ksTime = `${data.ks_gio?.toString().padStart(2, '0')}h ${data.ks_phut?.toString().padStart(2, '0')} phút`;

        const introText = `Hôm nay, vào hồi ${ksTime}, ngày ${ksDate} tháng ${ksMonth} năm ${ksYear}, tại cột ${data.cot} ĐZ ${data.dz}. Chúng tôi tiến hành khảo sát hiện trường để lập "Phương án tổ chức thi công và biện pháp an toàn", cụ thể như sau:`;
        items.push({
          type: 'content',
          lineCount: estimateLines(introText),
          render: () => (
            <div className="mt-2">
              {introText}
            </div>
          )
        });

        items.push({
          type: 'content',
          lineCount: 1,
          isHeading: true,
          render: () => <div className="font-bold mt-2">I. THÀNH PHẦN THAM GIA KHẢO SÁT: Chúng tôi gồm:</div>
        });

        items.push({
          type: 'content',
          lineCount: 1,
          isHeading: true,
          render: () => <div className="font-bold">1. Đại diện đơn vị làm công việc: Đội sửa chữa Hotline.</div>
        });

        data.ks_thanhPhanHotline.forEach(p => {
          items.push({
            type: 'content',
            lineCount: 1,
            render: () => (
              <table className="borderless-table">
                <tbody>
                  <tr>
                    <td className="w-[55%] pl-4">
                      - Ông (Bà): {p.name}
                    </td>
                    <td className="w-[45%]">
                      <div className="flex items-start">
                        <span className="shrink-0">Chức vụ:&nbsp;</span>
                        <span>{p.role}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            )
          });
        });

        items.push({
          type: 'content',
          lineCount: 1,
          isHeading: true,
          render: () => <div className="font-bold mt-1">2. Đại diện ( các) đơn vị quản lý vận hành: {data.doiQuanLyKhuVuc}</div>
        });

        items.push({
          type: 'content',
          lineCount: 1,
          render: () => (
            <table className="borderless-table">
              <tbody>
                <tr>
                  <td className="w-[55%] pl-4">
                    - Ông (Bà): {data.ks_qlvh_name}
                  </td>
                  <td className="w-[45%]">
                    <div className="flex items-start">
                      <span className="shrink-0">Chức vụ:&nbsp;</span>
                      <span>{data.ks_qlvh_role}</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          )
        });

        if (data.ks_coDieuDo) {
          items.push({
            type: 'content',
            lineCount: 1,
            isHeading: true,
            render: () => <div className="font-bold mt-1">3. Đại diện các đơn vị điều độ có liên quan (nếu có):</div>
          });
          data.ks_thanhPhanDieuDo.forEach(p => {
            items.push({
              type: 'content',
              lineCount: 1,
              render: () => (
                <table className="borderless-table">
                  <tbody>
                    <tr>
                      <td className="w-[55%] pl-4">
                        - Ông (Bà): {p.name} ({p.unit})
                      </td>
                      <td className="w-[45%]">
                        <div className="flex items-start">
                          <span className="shrink-0">Chức vụ:&nbsp;</span>
                          <span>{p.role}</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              )
            });
          });
        } else {
          items.push({
            type: 'content',
            lineCount: 1,
            isHeading: true,
            render: () => <div className="font-bold mt-1">3. Đại diện các đơn vị điều độ có liên quan (nếu có):</div>
          });
          items.push({
            type: 'content',
            lineCount: 1,
            render: () => (
              <table className="borderless-table">
                <tbody>
                  <tr>
                    <td className="w-[55%] pl-4">
                      - Ông (Bà): ...........................................
                    </td>
                    <td className="w-[45%]">
                      <div className="flex items-start">
                        <span className="shrink-0">Chức vụ:&nbsp;</span>
                        <span>.....Đơn vị.....</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            )
          });
        }

        const unifiedText = "Cùng nhau khảo sát thực tế, trao đổi và thống nhất phân công trách nhiệm thực hiện những nội dung để đảm bảo an toàn về điện cho đơn vị công tác khi tiến hành công việc, cụ thể như sau:";
        items.push({
          type: 'content',
          lineCount: estimateLines(unifiedText),
          render: () => (
            <div className="mt-2">
              {unifiedText}
            </div>
          )
        });

        items.push({
          type: 'content',
          lineCount: 1,
          isHeading: true,
          render: () => <div className="font-bold mt-2">4. Địa điểm ( hoặc thiết bị) thực hiện công việc :</div>
        });
        items.push({
          type: 'content',
          lineCount: 1,
          render: () => <div className="pl-2">+ Địa điểm theo sơ đồ lưới điện: Tại cột {data.cot} ĐZ {data.dz}.</div>
        });
        items.push({
          type: 'content',
          lineCount: 1,
          render: () => <div className="pl-2">+ Địa điểm theo hành chính: {data.diaBan || "xã Tân Yên, tỉnh Bắc Giang"}.</div>
        });

        items.push({
          type: 'content',
          lineCount: 1,
          isHeading: true,
          render: () => <div className="font-bold mt-2">5. Nội dung công việc :</div>
        });
        jobItems.forEach((job, idx) => {
          const shortJob = cleanJobItem(job);
          const text = `${jobItems.length > 1 ? `5.${idx + 1}. ` : "- "}Hạng mục công việc ${jobItems.length > 1 ? idx + 1 : ""}: ${shortJob} tại cột ${data.cot} ĐZ ${data.dz}.`;
          items.push({
            type: 'content',
            lineCount: estimateLines(text),
            render: () => (
              <div className="pl-2">
                {text}
              </div>
            )
          });
        });

        items.push({
          type: 'content',
          lineCount: 1,
          isHeading: true,
          render: () => <div className="font-bold mt-2">6. Phạm vi làm việc :</div>
        });
        items.push({
          type: 'content',
          lineCount: 1,
          render: () => <div className="pl-2">- Tại cột {data.cot} ĐZ {data.dz}.</div>
        });

        const gioThucHien = data.tg_gio || "6";
        const soNgayThucHien = data.tg_soNgay || "1";
        const thangThucHien = data.tg_thang || "03";
        const namThucHien = data.tg_nam || "2026";
        const timeTextV = `7. Thời gian tiến hành công việc : Khoảng ${gioThucHien}h/${soNgayThucHien} ngày trong tháng ${thangThucHien}/${namThucHien}.`;
        items.push({
          type: 'content',
          lineCount: estimateLines(timeTextV),
          isHeading: true,
          render: () => (
            <div className="font-bold mt-2">
              {timeTextV}
            </div>
          )
        });

        // 8. Những công việc tiến hành không cần cắt điện
        items.push({
          type: 'content',
          lineCount: 1,
          isHeading: true,
          render: () => <div className="font-bold mt-4">8. Những công việc tiến hành không cần cắt điện:</div>
        });

        const table8Rows = data.jobItems.map((jobItem, idx) => {
          const fullJobItem = ensureLocation(jobItem, data.cot, data.dz) + ".";
          
          const currentMC = data.hotlineSafetyMeasures?.[idx]?.mc || data.mc || data.dz;
          const mcText = `- Khóa chức năng TĐL (F79) của ĐKBV MC ${currentMC}.`;
          
          // Lấy các biện pháp bổ sung từ Mục III.b (không copy HM1 sang HM2)
          const extraMeasures = data.hotlineSafetyMeasures?.[idx]?.extraMeasures || [];
          
          const measures = [mcText, ...extraMeasures.filter(m => m && m.trim())];

          const measureLines = estimateLines(mcText, 37) + extraMeasures.reduce((acc, m) => acc + estimateLines(m, 37), 0);
          const jobItemLines = estimateLines(fullJobItem, 33);
          const rowLines = Math.max(measureLines, jobItemLines, 1);

          return {
            lineCount: rowLines,
            render: () => (
              <tr key={idx}>
                <td className="border border-black p-1 text-center align-middle">{idx + 1}</td>
                <td className="border border-black p-1 text-left align-top">
                  {fullJobItem}
                </td>
                <td className="border border-black p-1 text-left align-top text-[11pt] whitespace-pre-wrap">
                  {measures.map((m, i) => <div key={i}>{m}</div>)}
                </td>
              </tr>
            )
          };
        });

        items.push({
          type: 'table',
          colWidths: ['6%', '44%', '50%'],
          headers: (
            <tr className="bg-zinc-50">
              <th className="border border-black p-1">TT</th>
              <th className="border border-black p-1">Hạng mục công việc</th>
              <th className="border border-black p-1">Biện pháp an toàn</th>
            </tr>
          ),
          rows: table8Rows,
          headerLineCount: 2
        });

        if (data.ks_ghiChuPhuongThuc) {
          const noteText = "- Lưu ý: Nếu đến ngày làm việc mà phương thức thay đổi thì khóa tự đóng lại của ĐKBV các MC cấp điện cho khu vực làm việc của ngày công tác đó. Khi máy cắt nhảy không được đóng lại bằng tay.";
          items.push({
            type: 'content',
            lineCount: estimateLines(noteText),
            render: () => (
              <div className="mt-1 italic">
                {noteText}
              </div>
            )
          });
        }

        items.push({
          type: 'content',
          lineCount: 1,
          isHeading: true,
          render: () => (
            <div className="mt-2">
              <span className="font-bold">9. Những công việc tiến hành cần cắt điện:</span> {data.ks_canCatDien ? "Có." : "Không."}
            </div>
          )
        });

        items.push({
          type: 'content',
          lineCount: 1,
          isHeading: true,
          render: () => (
            <div className="mt-1">
              <span className="font-bold">10. Thống kê các vị trí có máy phát điện của khách hàng phát lên lưới:</span> {data.ks_mayPhatKH ? "Có." : "Không."}
            </div>
          )
        });

        items.push({
          type: 'content',
          lineCount: 2,
          isHeading: true,
          render: () => (
            <div className="font-bold mt-1">
              11. Những nhận diện, đánh giá nguy cơ rủi ro, chỉ dẫn, cảnh báo, các điều kiện an toàn khác cần lưu ý:
            </div>
          )
        });

        const table11Rows: any[] = [];
        jobItems.forEach((job, jobIdx) => {
          const shortJob = cleanJobItem(job);
          const riskPositions = jobIdx === 0 ? data.riskTableJob1 : data.riskTableJob2;
          
          const currentTT = table11Rows.length + 1;
          const viTriText = `${shortJob} tại cột ${data.cot} ĐZ ${data.dz}.`;
          
          if (riskPositions && riskPositions.length > 0) {
            // Aggregate all hazards and measures from all positions for this job item
            const allHazards: string[] = [];
            const allMeasures: string[] = [];
            
            riskPositions.forEach(pos => {
              pos.details?.forEach(d => {
                if (d.hazard) {
                  d.hazard.split('\n').forEach(line => {
                    const formatted = formatBullet(line);
                    if (formatted) allHazards.push(formatted);
                  });
                }
                if (d.measure) {
                  d.measure.split('\n').forEach(line => {
                    const formatted = formatBullet(line);
                    if (formatted) allMeasures.push(formatted);
                  });
                }
              });
            });

            // Widths: TT: 5%, Vị trí: 22%, Hazard: 28%, Measure: 33%, Note: 12%
            // Total width is roughly 75 chars/line
            const viTriLines = estimateLines(viTriText, 16); // ~22% of 75
            const hazardText = allHazards.join('\n');
            const hazardLines = estimateLines(hazardText, 21); // ~28%
            const measureText = allMeasures.join('\n');
            const measureLines = estimateLines(measureText, 25); // ~33%
            
            const maxLines = Math.max(viTriLines, hazardLines, measureLines, 2);

            table11Rows.push({
              lineCount: maxLines,
              render: () => (
                <tr key={jobIdx}>
                  <td className="border border-black p-1.5 text-center align-top text-[11pt]">{currentTT}</td>
                  <td className="border border-black p-1.5 text-left align-top text-[11pt] leading-tight">
                    {viTriText}
                  </td>
                  <td className="border border-black p-1.5 text-left align-top text-[11pt] leading-tight">
                    {allHazards.map((h, i) => (
                      <div key={i} className={i !== allHazards.length - 1 ? "mb-1" : ""}>{h}</div>
                    ))}
                  </td>
                  <td className="border border-black p-1.5 text-left align-top text-[11pt] leading-tight">
                    {allMeasures.map((m, i) => (
                      <div key={i} className={i !== allMeasures.length - 1 ? "mb-1" : ""}>{m}</div>
                    ))}
                  </td>
                  <td className="border border-black p-1.5 text-center align-top text-[11pt]"></td>
                </tr>
              )
            });
          } else {
            // Fallback if no risks defined
            const viTriLines = estimateLines(viTriText, 16);
            table11Rows.push({
              lineCount: Math.max(viTriLines, 2),
              render: () => (
                <tr key={`fallback-${jobIdx}`}>
                  <td className="border border-black p-1.5 text-center align-top text-[11pt]">{currentTT}</td>
                  <td className="border border-black p-1.5 text-left align-top text-[11pt] leading-tight">
                    {viTriText}
                  </td>
                  <td className="border border-black p-1.5 text-left align-top text-[11pt]"></td>
                  <td className="border border-black p-1.5 text-left align-top text-[11pt]"></td>
                  <td className="border border-black p-1.5 text-center align-top text-[11pt]"></td>
                </tr>
              )
            });
          }
        });

        items.push({
          type: 'table',
          colWidths: ['5%', '22%', '28%', '33%', '12%'],
          className: "text-[11pt]",
          headers: (
            <tr className="bg-zinc-50 text-[11pt]">
              <th className="border border-black p-1.5 align-middle">TT</th>
              <th className="border border-black p-1.5 align-middle">Vị trí</th>
              <th className="border border-black p-1.5 align-middle">Nhận diện mối nguy, đánh giá rủi ro</th>
              <th className="border border-black p-1.5 align-middle">Biện pháp phòng tránh</th>
              <th className="border border-black p-1.5 align-middle">Ghi chú</th>
            </tr>
          ),
          rows: table11Rows,
          headerLineCount: 2
        });

        items.push({
          type: 'content',
          lineCount: 1,
          isHeading: true,
          render: () => <div className="font-bold mt-4">12. Trách nhiệm các đơn vị liên quan:</div>
        });

        items.push({
          type: 'content',
          lineCount: 1,
          isHeading: true,
          render: () => <div className="font-bold pl-4 italic underline">12.1. Đối với ( các ) đơn vị quản lý vận hành:</div>
        });
        items.push({
          type: 'content',
          lineCount: 1,
          isHeading: true,
          render: () => <div className="pl-6 font-bold">12.1.1: Thực hiện:</div>
        });

        // Extract auto-fill requests from section 8 (extraMeasures)
        const autoRequests: string[] = [];
        data.hotlineSafetyMeasures?.forEach(measure => {
          if (measure.extraMeasures) {
            measure.extraMeasures.forEach(m => {
              if (m && m.trim()) {
                autoRequests.push(m.trim());
              }
            });
          }
        });

        const manualRequests = (data.dvqlvhCutRequests || []).filter(req => req.trim() !== "");
        
        // Combine and remove duplicates while preserving order (auto first, then manual)
        const combinedRequests = Array.from(new Set([...autoRequests, ...manualRequests]));

        if (combinedRequests.length === 0) {
          items.push({
            type: 'content',
            lineCount: 1,
            render: () => <div className="pl-8">- Cắt điện: Không.</div>
          });
        } else {
          combinedRequests.forEach((req) => {
            let formattedReq = req.trim();
            // Remove leading "- " if present to avoid double bullets in render
            if (formattedReq.startsWith("- ")) {
              formattedReq = formattedReq.substring(2).trim();
            }
            // Ensure it ends with exactly one dot
            formattedReq = formattedReq.replace(/\.+$/, "");
            formattedReq = `${formattedReq}.`;

            const fullText = `- ${formattedReq}`;
            items.push({
              type: 'content',
              lineCount: estimateLines(fullText),
              render: () => <div className="pl-8">{fullText}</div>
            });
          });
        }
        items.push({
          type: 'content',
          lineCount: 1,
          render: () => <div className="pl-6">12.1.2: Cấp phiếu công tác cho đơn vị thi công.</div>
        });
        items.push({
          type: 'content',
          lineCount: 1,
          render: () => <div className="pl-6">12.1.3: Bàn giao BPAT cho đơn vị thi công.</div>
        });
        items.push({
          type: 'content',
          lineCount: 1,
          render: () => <div className="pl-6">12.1.4: Chỉ rõ phạm vi được phép làm việc trên lưới điện tại hiện trường.</div>
        });
        const text1215 = "12.1.5: Nhận Giấy đăng ký công tác, thực hiện lập kế hoạch đăng ký cắt điện với cấp Điều độ theo quy định; viết Phiếu công tác; Giấy phối hợp cho phép (khi có 2 đơn vị QLVH liên quan); Thông báo và gửi lịch cắt điện cho đơn vị làm công việc biết để triển khai công việc.";
        items.push({
          type: 'content',
          lineCount: estimateLines(text1215),
          render: () => <div className="pl-6">{text1215}</div>
        });
        items.push({
          type: 'content',
          lineCount: 1,
          render: () => <div className="pl-6">12.1.6: Cấp Phiếu công tác, cử người cho phép.</div>
        });
        items.push({
          type: 'content',
          lineCount: 1,
          render: () => <div className="pl-6">12.1.7: Cho phép làm việc tại hiện trường.</div>
        });

        items.push({
          type: 'content',
          lineCount: 1,
          isHeading: true,
          render: () => <div className="font-bold pl-4 italic underline">12.2. Đối với đơn vị làm công việc:</div>
        });
        const text1221 = "12.2.1: Lập Giấy đăng ký công tác, gửi Giấy đăng ký công tác đến từng đơn vị quản lý vận hành liên quan. Nếu trước ngày chuẩn bị công tác mà đơn vị thi công có thay đổi về nhân sự nhóm công tác đã đăng ký thì đơn vị thi công phải làm giấy \"thay đổi bổ sung nhân lực\" và gửi về đơn vị QLVH có ý kiến và kẹp cùng vào phương án thi công.";
        items.push({
          type: 'content',
          lineCount: estimateLines(text1221),
          render: () => <div className="pl-6">{text1221}</div>
        });
        const text1222 = "12.2.2: Phối hợp đơn vị QLVH kiểm tra mặt bằng hiện trường làm việc để thiết lập sơ đồ mặt bằng và thuyết minh phương án.";
        items.push({
          type: 'content',
          lineCount: estimateLines(text1222),
          render: () => <div className="pl-6">{text1222}</div>
        });
        items.push({
          type: 'content',
          lineCount: 1,
          render: () => <div className="pl-6">12.2.3: Cử người CHTT, người GSATĐ nhận hiện trường làm việc tại hiện trường.</div>
        });
        items.push({
          type: 'content',
          lineCount: 1,
          render: () => <div className="pl-6">12.2.4: Cử người GSATĐ cho đội công tác trong thời gian làm việc.</div>
        });
        items.push({
          type: 'content',
          lineCount: 1,
          render: () => <div className="pl-6">12.2.5: Phối hợp với Người cho phép chụp ảnh biện pháp an toàn hiện trường làm việc.</div>
        });
        items.push({
          type: 'content',
          lineCount: 1,
          render: () => <div className="pl-6">12.2.6: Cho phép nhân viên đội công tác vào làm việc.</div>
        });
        items.push({
          type: 'content',
          lineCount: 1,
          render: () => <div className="pl-6">12.2.7: Thực hiện đúng phiếu công tác.</div>
        });
        items.push({
          type: 'content',
          lineCount: 1,
          render: () => <div className="pl-6">12.2.8: Thực hiện đủ và đúng nội dung công việc trong phạm vi cho phép công tác.</div>
        });
        items.push({
          type: 'content',
          lineCount: 1,
          render: () => <div className="pl-6">12.2.9: Có trang bị đủ dụng cụ an toàn và phương tiện bảo vệ cá nhân.</div>
        });
        items.push({
          type: 'content',
          lineCount: 1,
          render: () => <div className="pl-6">12.2.10: Sử dụng đầy đủ trang bị, phương tiện dụng cụ làm việc; phương tiện bảo vệ cá nhân, kỷ luật lao động.</div>
        });

        items.push({
          type: 'content',
          lineCount: 1,
          render: () => <div className="font-bold pl-4 italic underline">12.3. Đối với (các) đơn vị điều độ (nếu có) :</div>
        });
        items.push({
          type: 'content',
          lineCount: 1,
          render: () => (
            <div className="pl-6">
              + Phương thức kết dây hiện tại: Cột {data.cot} ĐZ {data.dz}, đang được cấp điện từ đường dây {data.ks_dzNguon || data.dzNguon} qua MC {data.mc}.
            </div>
          )
        });
        items.push({
          type: 'content',
          lineCount: 1,
          render: () => (
            <div className="pl-6">
              + Kiểm tra đã khóa chức năng tự động đóng lại (F79) của ĐKBV MC {data.mc}. Khi máy cắt nhảy không được đóng lại bằng tay.
            </div>
          )
        });
        items.push({
          type: 'content',
          lineCount: 1,
          render: () => (
            <div className="pl-6">
              - Nếu đến ngày làm việc mà phương thức thay đổi thì khóa tự đóng lại của ĐKBV các MC cấp điện cho khu vực làm việc của ngày công tác đó.
            </div>
          )
        });

        items.push({
          type: 'content',
          lineCount: 1,
          render: () => <div className="font-bold pl-4 italic underline">12.4. Những nội dung khác liên quan đến công việc:</div>
        });
        items.push({
          type: 'content',
          lineCount: 1,
          render: () => (
            <div className="pl-6">
              - Số lượng ảnh hiện trường đính kèm: 01 ảnh. Những nội dung khác: {data.ks_noiDungKhac || "Không"}.
            </div>
          )
        });

        items.push({
          type: 'blank',
          count: 1
        });

        // Section V Concluding Paragraph + Signature Headers (Grouped to stay together)
        items.push({
          type: 'content',
          lineCount: 8, // Estimated lines for para + headers + sub-headers
          render: () => (
            <div className="bbks-section">
              <div className="text-left italic text-[13pt] mt-6 pl-6">
                Biên bản này được lập thành 02 bản và được tất cả mọi người dự họp của các đơn vị liên quan đến công việc đồng ý, thông qua để làm cơ sở tiến hành công việc sau này và ký tên dưới đây.
              </div>
              <div className="grid grid-cols-3 gap-4 mt-8 text-center font-bold uppercase">
                <div className="text-[13pt]">
                  <div>ĐẠI DIỆN ĐƠN VỊ LÀM</div>
                  <div>CÔNG VIỆC</div>
                  <div className="normal-case italic font-normal mt-1">(Ký, ghi rõ họ tên)</div>
                </div>
                <div className="text-[12pt]">
                  <div>ĐẠI DIỆN (CÁC) ĐƠN VỊ</div>
                  <div>QUẢN LÝ VẬN HÀNH</div>
                  <div className="normal-case italic font-normal mt-1">(Ký, ghi rõ họ tên)</div>
                </div>
                <div className="text-[13pt]">
                  <div>ĐẠI DIỆN CÁC ĐƠN</div>
                  <div>VỊ LIÊN QUAN</div>
                  <div className="normal-case italic font-normal mt-1">(Ký, ghi rõ họ tên)</div>
                </div>
              </div>
            </div>
          )
        });

        // Signature Names Rows (Split into rows to allow breaking across pages)
        const hotlineNames = data.ks_thanhPhanHotline || [];
        const qlvhNames = [{ id: 'qlvh', name: data.ks_qlvh_name }];
        const dieuDoNames = data.ks_coDieuDo ? (data.ks_thanhPhanDieuDo || []) : [];
        
        const maxRows = Math.max(hotlineNames.length, qlvhNames.length, dieuDoNames.length);
        
        for (let i = 0; i < maxRows; i++) {
          items.push({
            type: 'content',
            lineCount: i === 0 ? 4 : 3, // First row has more margin
            render: () => (
              <div className={clsx("grid grid-cols-3 gap-4 text-[13pt]", i === 0 ? "mt-12" : "mt-8")}>
                <div className="text-left pl-4">
                  <div className="font-bold">{hotlineNames[i] ? `${toTitleCase(hotlineNames[i].name)}:` : ""}</div>
                </div>
                <div className="text-center">
                  <div className="font-bold">{qlvhNames[i] ? toTitleCase(qlvhNames[i].name) : ""}</div>
                </div>
                <div className="text-center">
                  <div className="font-bold">{dieuDoNames[i] ? toTitleCase(dieuDoNames[i].name) : ""}</div>
                </div>
              </div>
            )
          });
        }

        // Pagination Logic
        const pages: React.ReactNode[] = [];
        let currentPageItems: React.ReactNode[] = [];
        let currentLines = 0;
        let pNum = 4 + data.images.length; // Starting page number for this section

        const flushPage = () => {
          if (currentPageItems.length > 0) {
            pages.push(renderPage(
              <div className="flex flex-col font-times text-[13pt] leading-[1.3] text-left">
                {pNum === 4 + data.images.length && <BlankLine count={3} />}
                {currentPageItems.map((item, i) => (
                  <div key={i} className="mb-3 last:mb-0">
                    {item}
                  </div>
                ))}
              </div>,
              `paginated-${pNum}`
            ));
            pNum++;
            currentPageItems = [];
            currentLines = 0;
          }
        };

        items.forEach((item, idx) => {
          if (item.type === 'blank') {
            if (currentLines + item.count > MAX_LINES) flushPage();
            currentPageItems.push(<BlankLine key={`blank-${idx}`} count={item.count} />);
            currentLines += item.count;
          } else if (item.type === 'content') {
            if (currentLines + item.lineCount > MAX_LINES || item.forceNewPage) {
              flushPage();
            }
            
            // Heading keep-with-next logic for 'content' type
            if (item.isHeading && currentLines + item.lineCount + 2 > MAX_LINES) {
              flushPage();
            }

            currentPageItems.push(<React.Fragment key={`content-${idx}`}>{item.render()}</React.Fragment>);
            currentLines += item.lineCount;
          } else if (item.type === 'splittable-text-block') {
            let textToProcess = item.text;
            let isFirstPart = true;

            while (textToProcess.length > 0) {
              const availableLines = MAX_LINES - currentLines;
              if (availableLines <= 0) {
                flushPage();
                continue;
              }

              // Heading keep-with-next: Heading + at least 2 lines of content
              if (item.isHeading && isFirstPart && availableLines < 3) {
                flushPage();
                continue;
              }

              const chars = item.className?.includes('pl-') ? CHARS_PER_LINE - 10 : CHARS_PER_LINE;
              const allLines = getLines(textToProcess, chars);
              
              const linesToTake = Math.min(allLines.length, availableLines);
              const linesForThisPage = allLines.slice(0, linesToTake);
              const isLastPart = linesToTake === allLines.length;
              
              const textForThisPage = linesForThisPage.join(' ');
              textToProcess = allLines.slice(linesToTake).join(' ');

              currentPageItems.push(
                <div 
                  key={`split-${idx}-${pages.length}`} 
                  className={clsx(
                    item.className, 
                    !isLastPart && "text-justify-all",
                    isLastPart && "text-justify"
                  )}
                  style={{
                    textAlign: 'justify',
                    textAlignLast: isLastPart ? 'left' : 'justify'
                  }}
                >
                  {textForThisPage}
                </div>
              );
              currentLines += linesToTake;
              isFirstPart = false;

              if (textToProcess.length > 0) {
                flushPage();
              }
            }
          } else if (item.type === 'table') {
            // Check if header + at least one row fits
            if (currentLines + item.headerLineCount + (item.rows[0]?.lineCount || 0) > MAX_LINES || item.forceNewPage) {
              flushPage();
            }

            // Account for header on the current (possibly new) page
            currentLines += item.headerLineCount;

            let tableRows: React.ReactNode[] = [];

            item.rows.forEach((row: any, rIdx: number) => {
              if (currentLines + row.lineCount > MAX_LINES) {
                // Close current table and flush page
                if (tableRows.length > 0) {
                  currentPageItems.push(
                    <table key={`table-${idx}-${rIdx}-part`} className={clsx("w-full border-collapse border border-black text-[13pt] table-fixed mt-2", item.className)}>
                      <colgroup>
                        {item.colWidths.map((w: string, i: number) => <col key={i} style={{ width: w }} />)}
                      </colgroup>
                      <thead>{item.headers}</thead>
                      <tbody>{tableRows}</tbody>
                    </table>
                  );
                }
                flushPage();
                
                // Start new table part on new page with header
                tableRows = [];
                currentLines += item.headerLineCount;
              }
              tableRows.push(row.render());
              currentLines += row.lineCount;
            });

            if (tableRows.length > 0) {
              currentPageItems.push(
                <table key={`table-${idx}-${pages.length}-final`} className={clsx("w-full border-collapse border border-black text-[13pt] table-fixed mt-2", item.className)}>
                  <colgroup>
                    {item.colWidths.map((w: string, i: number) => <col key={i} style={{ width: w }} />)}
                  </colgroup>
                  <thead>{item.headers}</thead>
                  <tbody>{tableRows}</tbody>
                </table>
              );
            }
          }
        });

        flushPage();

        // Section VI: Sơ đồ vùng làm việc
        if (data.workZoneDiagrams && data.workZoneDiagrams.length > 0) {
          data.workZoneDiagrams.forEach((diagram) => {
            pages.push(renderPage(
              <div className="flex flex-col h-full w-full items-center justify-center relative">
                {debugMode && (
                  <div className="absolute top-0 left-0 text-red-500 text-[10pt] font-times bg-red-50 px-2 py-1 rounded border border-red-200 z-10 print:hidden">
                    DEBUG: VI. SƠ ĐỒ VÙNG LÀM VIỆC ({diagram.fileName} - P{diagram.pageNumber})
                  </div>
                )}
                <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                  <img 
                    src={diagram.imageData} 
                    alt={`Sơ đồ ${diagram.fileName} - Trang ${diagram.pageNumber}`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>,
              `work-zone-${diagram.id}`
            ));
          });
        }

        return pages;
      })()}
    </div>
  </div>
);
};
