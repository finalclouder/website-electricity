export enum WorkType {
  LAP_DAY_NOI_DAT = "LAP_DAY_NOI_DAT",
  THAY_CSV = "THAY_CSV",
  DAU_LEO = "DAU_LEO",
  THAO_LEO = "THAO_LEO",
  THAY_SU_DO_LEO = "THAY_SU_DO_LEO"
}

export interface RiskDetail {
  id: string;
  hazard: string;
  measure: string;
}

export interface RiskItem {
  id: string;
  location: string;
  details: RiskDetail[];
  note?: string;
}

export interface StepItem {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
}

export interface Personnel {
  id: string;
  name: string;
  gender: string;
  birthYear: number;
  role: string;
  job: string;
  grade: string;
  safetyGrade: string;
  chttSelectedAt?: number;
}

export interface ToolItem {
  id: string;
  name: string;
  spec: string;
  origin: string;
  unit: string;
  quantity: number;
  purpose: string;
  selected: boolean;
}

export interface ConstructionImage {
  id: string;
  url: string;
  name: string;
  scalePercent: number;
}

export interface HotlineSafetyMeasure {
  id: string;
  jobItem: string;
  safetyMeasure: string;
  mc?: string;
  extraMeasures?: string[];
}

export interface BocCachDienBlock {
  id: string;
  viTri: string;
  trinhTu: string;
}

export interface DieuKhienGauBlock {
  id: string;
  deLamGi: string;
  thucHien: string;
}

export interface ThaoBocCachDienBlock {
  id: string;
  viTri: string;
  trinhTu: string;
}

export interface ConstructionSequence {
  eyeCheckText?: string;
  guongKiemTra: string;
  bocCachDienBlocks: BocCachDienBlock[];
  dieuKhienGauBlocks: DieuKhienGauBlock[];
  thaoBocCachDienBlocks: ThaoBocCachDienBlock[];
}

export interface WorkZoneDiagram {
  id: string;
  fileName: string;
  pageNumber: number;
  imageData: string;
}

export interface PATCTCData {
  // Trang bìa
  soVb: string;
  diaDanh: string;
  ngayLap: string;
  jobItems: string[];
  donViThiCong: string;
  nguoiLap: string;
  nguoiKiemTra: string;
  doiTruong: string;

  // I. Căn cứ
  doiQuanLyKhuVuc: string;
  canCu9_soVanBan: string;
  canCu9_ngayVanBan: string;
  canCu10_ngay: string;
  canCu10_thang: string;
  canCu10_nam: string;
  canCuBoSung: string[]; // Danh sách căn cứ bổ sung (mục 11, 12, ...)

  // II.1 Đặc điểm công trình
  dz: string;
  cot: string;
  mach: "Mạch đơn" | "Mạch kép";
  diChungCot: string;
  mc: string;
  dcl: string;
  fco: string;
  loaiCot: string;
  chieuCaoCot: string;
  loaiXa: string;
  loaiSu: string;
  loaiDay: string;
  phuongThucNgayLamViec: string[];
  hienTrang: string;
  diaBan: string;
  dzNguon: string;
  phamViCapDien: string;

  // II.2 Đặc điểm giao thông
  duongRong: string;
  cotCachDuong: string;
  coHinhAnh: boolean;
  images: ConstructionImage[];

  // II.3 Hạng mục + vị trí + thời gian
  viTriLamViec: string;
  thoiGianDuKien: string;
  tg_gio: number;
  tg_soNgay: number;
  tg_thang: number;
  tg_nam: number;

  // III.1 Nhận diện rủi ro
  workType: string;
  risks: RiskItem[];
  riskTableJob1: RiskItem[];
  riskTableJob2: RiskItem[];

  // III.1.b Biện pháp an toàn hotline
  khoaF79: boolean;
  catDcl: boolean;
  maDcl: string;
  catFco: boolean;
  maFco: string;
  hotlineSafetyMeasures: HotlineSafetyMeasure[];

  // III.1.c Trình tự thi công
  steps: StepItem[];
  eyeCheckText?: string;
  guongKiemTra: string;
  bocCachDienBlocks: BocCachDienBlock[];
  dieuKhienGauBlocks: DieuKhienGauBlock[];
  thaoBocCachDienBlocks: ThaoBocCachDienBlock[];
  sequences?: { [key: number]: ConstructionSequence };

  // Biện pháp an toàn chung + Lưu ý
  ghiChuBoSung: string;

  // Phụ lục 1: Nhân sự
  personnel: Personnel[];

  // Phụ lục 2: Dụng cụ + vật tư
  tools: ToolItem[];

  // Phụ lục 3: Vật tư thi công
  benCapVatTu: string;
  vatTuCap: { id?: string; name: string; quantity: string; unit: string; origin: string; purpose: string }[];

  // V. Biên bản khảo sát hiện trường
  ks_gio: number;
  ks_phut: number;
  ks_lapPAId?: string;
  ks_thanhPhanHotline: { id: string; name: string; role: string }[];
  ks_qlvh_name: string;
  ks_qlvh_role: string;
  ks_coDieuDo: boolean;
  ks_thanhPhanDieuDo: { id: string; name: string; role: string; unit: string }[];
  ks_ghiChuPhuongThuc: boolean;
  ks_canCatDien: boolean;
  ks_mayPhatKH: boolean;
  ks_dzNguon?: string;
  ks_noiDungKhac: string;
  dvqlvhCutRequests: string[];
  workZoneDiagrams: WorkZoneDiagram[];
}
