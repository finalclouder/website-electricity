export const WORK_TYPES: Record<string, any> = {
  "LAP_DAY_NOI_DAT": {
    label: "Lắp dây nối đất / CSV",
    risks: [
      { id: "r1", location: "{VỊ_TRÍ}", hazard: "Khi thi công có thể rơi dụng cụ đồ nghề, rơi bulong, êcu.", consequence: "Gây chấn thương cho người bên dưới hoặc hỏng thiết bị.", measure: "Dụng cụ đồ nghề phải đựng trong túi đựng riêng. Khi làm việc phải thực hiện nắm giữ chắc chắn." },
      { id: "r2", location: "{VỊ_TRÍ}", hazard: "Nguy cơ phóng điện khi lắp dây nối đất nếu chất lượng CSV, không tốt (rò điện).", consequence: "Gây điện giật cho công nhân.", measure: "Dùng sào cách điện dí khoảng 1 phút trước khi lắp dây nối đất vào CSV." }
    ],
    steps: [
      { id: "s1", title: "Chuẩn bị", content: "Hai công nhân leo lên gầu đã đeo găng tay và vai áo cao su cách điện và mang theo các dụng cụ, trang bị bảo vệ cá nhân cần thiết, móc dây an toàn chắc chắn." },
      { id: "s2", title: "Kiểm tra", content: "Điều khiển gầu đến vị trí phù hợp dùng gương lắp vào sào cách điện để kiểm tra đầu cốt bắt vào CSV, đế CSV... tại vị trí làm việc xem có gì bất thường không" },
      { id: "s3", title: "Bọc cách điện", content: "Điều khiển gầu đến vị trí CSV pha {PHA} ĐZ {DZ} để bọc cách điện. Bọc theo trình tự: Bọc CSV - bọc lèo CSV" },
      { id: "s4", title: "Lắp tiếp địa", content: "Thực hiện: Dùng 1 đoạn dây lèo đã ép đầu cốt sẵn 2 đầu để lắp dây nối đất cho CSV, bắt 1 đầu dây nối đất vào cờ dây tiếp địa dọc cột cố định chắc chắn, dùng sào cách điện hãm đầu lèo còn lại vào đầu sào, đưa dây lèo không mang điện tiếp xúc với chân CSV vị trí lắp dây nối đất, giữ khoảng 1 phút (đề phòng CSV bị rò điện), 1 người giữ dây lèo, 1 người thực hiện bắt đầu dây nối đất còn lại vào CSV cố định chắc chắn." }
    ],
    tools: ["Xe hotline", "Dây thừng", "Tiếp địa", "Biển báo an toàn", "Cọc rào", "Bọc dây dẫn", "Thảm cao su cách điện"]
  },
  "THAY_CSV": {
    label: "Thay CSV",
    risks: [
      { id: "r1", location: "{VỊ_TRÍ}", hazard: "Rơi vỡ CSV cũ khi tháo.", consequence: "Gây tai nạn hoặc hỏng vật tư.", measure: "Sử dụng dây thừng buộc chắc chắn CSV trước khi tháo bu lông." }
    ],
    steps: [
      { id: "s1", title: "Tháo CSV cũ", content: "Tiến hành tháo lèo, tháo bu lông chân đế và hạ CSV cũ xuống đất bằng dây thừng." },
      { id: "s2", title: "Lắp CSV mới", content: "Kéo CSV mới lên, cố định vào chân đế và đấu nối lèo." }
    ],
    tools: ["Xe hotline", "Dây thừng", "Puly", "Túi đồ dụng cụ", "Mỏ lết"]
  }
};

export const PERSONNEL_MASTER = [
  { id: "p1", name: "Nguyễn Tuấn Anh", gender: "Nam", birthYear: 1984, role: "Đội phó", job: "Kỹ sư điện", grade: "6/7", safetyGrade: "5/5" },
  { id: "p2", name: "Đỗ Văn Truân", gender: "Nam", birthYear: 1981, role: "NV", job: "Công nhân Hotline", grade: "5/7", safetyGrade: "5/5" },
  { id: "p3", name: "Hoàng Văn Công", gender: "Nam", birthYear: 1989, role: "NV", job: "Công nhân Hotline", grade: "5/7", safetyGrade: "5/5" },
  { id: "p4", name: "Nguyễn Văn Hà", gender: "Nam", birthYear: 1986, role: "NV", job: "Công nhân Hotline", grade: "6/7", safetyGrade: "5/5" },
  { id: "p5", name: "Ngô Văn Tiến", gender: "Nam", birthYear: 1982, role: "NV", job: "Công nhân Hotline", grade: "5/7", safetyGrade: "5/5" },
  { id: "p6", name: "Ngô Thế Tiệp", gender: "Nam", birthYear: 1984, role: "NV", job: "Công nhân Hotline", grade: "5/7", safetyGrade: "5/5" },
  { id: "p7", name: "Chu Đình Dũng", gender: "Nam", birthYear: 1987, role: "NV", job: "Công nhân Hotline", grade: "5/7", safetyGrade: "5/5" },
  { id: "p8", name: "Nguyễn Lương Bằng", gender: "Nam", birthYear: 1989, role: "NV", job: "Công nhân Hotline", grade: "5/7", safetyGrade: "5/5" },
  { id: "p9", name: "Nguyễn Anh Đức", gender: "Nam", birthYear: 1988, role: "NV", job: "Công nhân Hotline", grade: "5/7", safetyGrade: "5/5" },
  { id: "p10", name: "Nguyễn Văn Thức", gender: "Nam", birthYear: 1990, role: "CHTT-GSAT", job: "Công nhân Hotline", grade: "5/7", safetyGrade: "5/5", chttSelectedAt: 1711760000000 },
  { id: "p11", name: "Nguyễn Hoàng Tùng", gender: "Nam", birthYear: 1990, role: "CHTT-GSAT", job: "Công nhân Hotline", grade: "5/7", safetyGrade: "5/5", chttSelectedAt: 1711760000001 },
  { id: "p12", name: "Nguyễn Hải Dương", gender: "Nam", birthYear: 1991, role: "CHTT-GSAT", job: "Công nhân Hotline", grade: "5/7", safetyGrade: "5/5", chttSelectedAt: 1711760000002 },
  { id: "p13", name: "Nguyễn Minh Tiến", gender: "Nam", birthYear: 1989, role: "NV", job: "Công nhân Hotline", grade: "4/7", safetyGrade: "5/5" }
];

export const TOOLS_MASTER = [
  { id: "t1", name: "Xe hotline", spec: "TEREX", origin: "Mỹ", unit: "Cái", quantity: 1, purpose: "Chuyên dùng phục vụ thi công Hotline" },
  { id: "t2", name: "Dây thừng", spec: "Φ10", origin: "Việt Nam", unit: "Cuộn", quantity: 1, purpose: "Nâng hạ vật tư" },
  { id: "t3", name: "Tiếp địa", spec: "TĐĐĐ", origin: "Việt Nam", unit: "Cuộn", quantity: 1, purpose: "Làm tiếp đất xe gầu" },
  { id: "t4", name: "Biển báo an toàn", spec: "", origin: "Việt Nam", unit: "Cái", quantity: 2, purpose: "Cảnh báo" },
  { id: "t5", name: "Cọc rào", spec: "", origin: "Việt Nam", unit: "Cái", quantity: 10, purpose: "Cảnh báo" },
  { id: "t6", name: "Băng nilong làm rào chắn", spec: "", origin: "Việt Nam", unit: "Cuộn", quantity: 1, purpose: "Cảnh báo" },
  { id: "t7", name: "Puly", spec: "", origin: "Việt Nam", unit: "Cái", quantity: 1, purpose: "Nâng hạ vật tư" },
  { id: "t8", name: "Túi đồ dụng cụ làm việc", spec: "", origin: "Mỹ", unit: "Cái", quantity: 1, purpose: "Đựng dụng cụ, đồ nghề" },
  { id: "t9", name: "Cơ lê các loại", spec: "Từ 13-30", origin: "Nhật Bản", unit: "Bộ", quantity: 1, purpose: "Dùng để tháo lắp" },
  { id: "t10", name: "Mỏ lết", spec: "300", origin: "Nhật Bản", unit: "Cái", quantity: 2, purpose: "Dùng để tháo lắp" },
  { id: "t11", name: "Kim mỏ nhọn", spec: "", origin: "Việt Nam", unit: "Cái", quantity: 1, purpose: "Dùng để tháo chốt chẻ" },
  { id: "t12", name: "Tuốc tua vít", spec: "2 cạnh và 4 cạnh", origin: "Việt Nam", unit: "Cái", quantity: 1, purpose: "Dùng để tháo lắp" },
  { id: "t13", name: "Vải bạt", spec: "", origin: "Mỹ", unit: "Tấm", quantity: 2, purpose: "Dùng để thiết bị dụng cụ" },
  { id: "t14", name: "Túi đựng dụng cụ", spec: "", origin: "Mỹ", unit: "Cái", quantity: 1, purpose: "Dùng để đựng đồ nghề" },
  { id: "t15", name: "Vải silicone", spec: "", origin: "Mỹ", unit: "Cái", quantity: 2, purpose: "Dùng để lau dụng cụ, thiết bị cách điện" },
  { id: "t16", name: "Khăn lau sạch", spec: "", origin: "Việt Nam", unit: "Kg", quantity: 0.5, purpose: "Dùng để lau thiết bị dụng cụ" },
  { id: "t17", name: "Bọc dây dẫn", spec: "24kV", origin: "Mỹ", unit: "Cái", quantity: 24, purpose: "Dùng để bọc dây" },
  { id: "t18", name: "Thảm cao su cách điện có rãnh", spec: "24kV", origin: "Mỹ", unit: "Cái", quantity: 12, purpose: "Dùng để bọc chuỗi sứ" },
  { id: "t19", name: "Thảm cao su cách điện không rãnh", spec: "24kV", origin: "Mỹ", unit: "Cái", quantity: 6, purpose: "Dùng để bọc chuỗi sứ" },
  { id: "t20", name: "Cao su bọc dây dẫn", spec: "24kV", origin: "Mỹ", unit: "Cái", quantity: 6, purpose: "Dùng để bọc dây" },
  { id: "t21", name: "Kẹp thảm cao su", spec: "24kV", origin: "Mỹ", unit: "Cái", quantity: 40, purpose: "Dùng để kẹp thảm cao su" },
  { id: "t22", name: "Găng tay cách điện", spec: "24kV", origin: "Nhật", unit: "Đôi", quantity: 2, purpose: "Phục vụ thi công" },
  { id: "t23", name: "Găng tay da", spec: "", origin: "", unit: "Đôi", quantity: 2, purpose: "Phục vụ thi công" },
  { id: "t24", name: "Vai áo", spec: "24kV", origin: "Mỹ", unit: "Đôi", quantity: 2, purpose: "Phục vụ thi công" },
  { id: "t25", name: "Dây đeo an toàn", spec: "", origin: "", unit: "Cái", quantity: 2, purpose: "Phục vụ thi công" }
];

export const JOB_ITEM_TEMPLATES = [
  "Thay FCO",
  "Thay sứ đỡ lèo",
  "Thay sứ đứng",
  "Thay sứ néo",
  "Thay chuỗi sứ",
  "Thay CSV (chống sét van)",
  "Lắp CSV mới",
  "Tháo CSV cũ",
  "Thay DCL (dao cách ly)",
  "Lắp DCL mới",
  "Đấu lèo",
  "Tháo lèo",
  "Tháo và đấu lèo",
  "Lắp dây nối đất CSV, nối đất vỏ cáp ngầm",
  "Thay dây nối đất",
  "Thay xà",
  "Lắp xà",
  "Thay dây dẫn",
  "Nối dây",
  "Bọc cách điện dây dẫn",
  "Lắp đặt chống sét",
  "Đo điện trở tiếp đất",
  "Thay TI (biến dòng)",
  "Thay TU (biến áp đo lường)",
  "Thay đầu cốt",
  "Thay khoá néo",
  "Thay khoá đỡ",
  "Thay mối nối",
  "Lắp dây chống sét",
  "Thay cầu chì tự rơi",
  "Vệ sinh sứ cách điện",
  "Lắp tụ bù",
  "Tháo tụ bù",
];
