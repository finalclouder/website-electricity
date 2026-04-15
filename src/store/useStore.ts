import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PATCTCData, WorkType, RiskItem, Personnel, ConstructionSequence, BocCachDienBlock, DieuKhienGauBlock, ThaoBocCachDienBlock } from '../types';
import { WORK_TYPES, PERSONNEL_MASTER, TOOLS_MASTER } from '../constants';
import { cleanJobItem, ensureBulletFormat, ensureLocation, formatJobItem } from '../utils/patctcFormat';

export { cleanJobItem, ensureBulletFormat, ensureLocation, formatJobItem };

// === Initial Data ===
const today = new Date();
const INITIAL_DATA: PATCTCData = {
  // Trang bìa
  soVb: '116',
  diaDanh: 'Bắc Ninh',
  ngayLap: `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`,
  jobItems: ['Lắp dây nối đất CSV, nối đất vỏ cáp ngầm'],
  donViThiCong: 'Đội sửa chữa Hotline',
  nguoiLap: 'Nguyễn Tuấn Anh',
  nguoiKiemTra: 'Nguyễn Tuấn Anh',
  doiTruong: 'Nguyễn Tuấn Anh',

  // I. Căn cứ
  doiQuanLyKhuVuc: 'Đội QLĐLKV Bắc Giang',
  canCu9_soVanBan: '1234/PCBN-ĐĐ',
  canCu9_ngayVanBan: '01/01/2027',
  canCu10_ngay: '27',
  canCu10_thang: '02',
  canCu10_nam: '2027',
  canCuBoSung: [],

  // II. Đặc điểm công trình
  dz: '471 E7.33',
  cot: '18',
  mach: 'Mạch đơn',
  diChungCot: '',
  mc: '471 E7.33',
  dcl: '',
  fco: '',
  loaiCot: 'Bê tông',
  chieuCaoCot: '12m',
  loaiXa: 'Xà thép mạ kẽm',
  loaiSu: 'Sứ đứng Polymer',
  loaiDay: 'AC-70',
  hienTrang: 'Đang vận hành',
  diaBan: 'xã Quang Châu, huyện Việt Yên, tỉnh Bắc Giang',
  dzNguon: '471 E7.33 từ TBA 110kV Việt Yên',
  phamViCapDien: 'Khu vực huyện Việt Yên',
  duongRong: '5',
  cotCachDuong: '3',
  coHinhAnh: false,
  images: [],

  // Hạng mục + vị trí + thời gian
  viTriLamViec: '',
  thoiGianDuKien: '',
  tg_gio: 8,
  tg_soNgay: 1,
  tg_thang: today.getMonth() + 1,
  tg_nam: today.getFullYear(),

  // Nhận diện rủi ro
  workType: WorkType.LAP_DAY_NOI_DAT,
  risks: [{ id: '1', location: '', details: [{ id: '1', hazard: '', measure: '' }], note: '' }],
  riskTableJob1: [{
    id: 'rj1_1',
    location: '',
    details: [
      { id: 'd1', hazard: 'Khi thi công có thể rơi dụng cụ đồ nghề, rơi bulong, êcu.', measure: 'Dụng cụ đồ nghề phải đựng trong túi đựng riêng. Khi làm việc phải thực hiện nắm giữ chắc chắn.' },
      { id: 'd2', hazard: 'Nguy cơ phóng điện khi lắp dây nối đất nếu chất lượng CSV, không tốt (rò điện).', measure: 'Dùng sào cách điện dí khoảng 1 phút trước khi lắp dây nối đất vào CSV.' }
    ],
    note: ''
  }],
  riskTableJob2: [],

  // Biện pháp an toàn hotline
  khoaF79: true,
  catDcl: false,
  maDcl: '',
  catFco: false,
  maFco: '',
  hotlineSafetyMeasures: [{
    id: 'hsm1',
    jobItem: '',
    safetyMeasure: '',
    mc: '',
    extraMeasures: []
  }],

  // Trình tự thi công
  steps: (WORK_TYPES[WorkType.LAP_DAY_NOI_DAT]?.steps || []).map((s: any) => ({ ...s, enabled: true })),
  eyeCheckText: undefined,
  guongKiemTra: 'chuỗi sứ, khóa máng',
  bocCachDienBlocks: [],
  dieuKhienGauBlocks: [],
  thaoBocCachDienBlocks: [],
  sequences: {
    1: { guongKiemTra: 'chuỗi sứ, khóa máng', bocCachDienBlocks: [], dieuKhienGauBlocks: [], thaoBocCachDienBlocks: [] },
    2: { guongKiemTra: '', bocCachDienBlocks: [], dieuKhienGauBlocks: [], thaoBocCachDienBlocks: [] }
  },

  ghiChuBoSung: '',

  // Phụ lục 1
  personnel: PERSONNEL_MASTER.map(p => ({ ...p })),

  // Phụ lục 2
  tools: TOOLS_MASTER.map(t => ({ ...t, selected: true })),

  // Phụ lục 3
  benCapVatTu: 'Công ty TNHH Điện lực Bắc Ninh',
  vatTuCap: [
    { id: 'vt1', name: 'Dây nối đất CSV', quantity: '1', unit: 'Bộ', origin: 'Việt Nam', purpose: 'Lắp dây nối đất' },
    { id: 'vt2', name: 'Cáp ngầm hạ thế', quantity: '10', unit: 'Mét', origin: 'Việt Nam', purpose: 'Nối đất vỏ cáp ngầm' }
  ],

  // Biên bản khảo sát
  ks_gio: 8,
  ks_phut: 5,
  ks_lapPAId: undefined,
  ks_thanhPhanHotline: [{ id: 'placeholder', name: '', role: 'CHTT – GSAT – Lập PA' }],
  ks_qlvh_name: 'Nguyễn Văn A',
  ks_qlvh_role: 'Nhân viên QLVH',
  ks_coDieuDo: false,
  ks_thanhPhanDieuDo: [],
  ks_ghiChuPhuongThuc: false,
  ks_canCatDien: false,
  ks_mayPhatKH: false,
  ks_dzNguon: '',
  ks_noiDungKhac: 'Không.',
  dvqlvhCutRequests: [],
  workZoneDiagrams: []
};

// === Store Interface ===
interface AppState {
  // Data
  data: PATCTCData;

  // UI state
  activeSection: string;
  hotlineTab: number;
  activeJobIdx: number;
  zoom: number;
  isExporting: boolean;
  isUploadingPdf: boolean;
  errors: string[];

  // Actions
  updateData: (updates: Partial<PATCTCData>) => void;
  setData: (data: PATCTCData) => void;
  resetData: () => void;
  setActiveSection: (section: string) => void;
  toggleSection: (section: string) => void;
  setHotlineTab: (tab: number) => void;
  setActiveJobIdx: (idx: number) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setIsExporting: (val: boolean) => void;
  setIsUploadingPdf: (val: boolean) => void;
  setErrors: (errors: string[]) => void;

  // Business logic actions
  handleWorkTypeChange: (type: string) => void;
  addJobItem: () => void;
  removeJobItem: (idx: number) => void;
  copyJobItem: (idx: number) => void;
  addBocCachDien: (jobIdx: number) => void;
  addDieuKhienGau: (jobIdx: number) => void;
  addThaoBocCachDien: (jobIdx: number) => void;
  addCanCuBoSung: () => void;
  removeCanCuBoSung: (idx: number) => void;
  validateData: () => boolean;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      data: INITIAL_DATA,
      activeSection: '',
      hotlineTab: 0,
      activeJobIdx: 1,
      zoom: 0.85,
      isExporting: false,
      isUploadingPdf: false,
      errors: [],

      // Basic actions
      updateData: (updates) => set(state => ({
        data: { ...state.data, ...updates }
      })),

      setData: (data) => set({ data }),

      resetData: () => set({ data: INITIAL_DATA }),

      setActiveSection: (section) => set({ activeSection: section }),

      toggleSection: (section) => set(state => ({
        activeSection: state.activeSection === section ? '' : section
      })),

      setHotlineTab: (tab) => set({ hotlineTab: tab }),
      setActiveJobIdx: (idx) => set({ activeJobIdx: idx }),

      setZoom: (zoom) => set(state => ({
        zoom: typeof zoom === 'function' ? zoom(state.zoom) : zoom
      })),

      setIsExporting: (val) => set({ isExporting: val }),
      setIsUploadingPdf: (val) => set({ isUploadingPdf: val }),
      setErrors: (errors) => set({ errors }),

      // Business logic
      handleWorkTypeChange: (type) => {
        const workType = WORK_TYPES[type];
        if (!workType) return;
        const { data } = get();

        const newRisks = (workType.risks || []).map((r: any, i: number) => ({
          id: `r${i + 1}`,
          location: r.location.replace('{VỊ_TRÍ}', `cột ${data.cot} ĐZ ${data.dz}`),
          details: [{ id: `d${i + 1}`, hazard: r.hazard, measure: r.measure }],
          note: ''
        }));

        const newSteps = (workType.steps || []).map((s: any) => ({ ...s, enabled: true }));

        set(state => ({
          data: {
            ...state.data,
            workType: type,
            riskTableJob1: newRisks,
            steps: newSteps
          }
        }));
      },

      addJobItem: () => set(state => ({
        data: { ...state.data, jobItems: [...state.data.jobItems, ''] }
      })),

      removeJobItem: (idx) => set(state => {
        if (state.data.jobItems.length <= 1) return state;
        return {
          data: {
            ...state.data,
            jobItems: state.data.jobItems.filter((_, i) => i !== idx)
          }
        };
      }),

      copyJobItem: (idx) => set(state => {
        if (state.data.jobItems.length >= 2) return state;
        const newItems = [...state.data.jobItems];
        newItems.splice(idx + 1, 0, state.data.jobItems[idx]);
        return { data: { ...state.data, jobItems: newItems } };
      }),

      addBocCachDien: (jobIdx) => {
        const { data } = get();
        const seqKey = jobIdx as keyof typeof data.sequences;
        const seq = data.sequences?.[seqKey];
        if (!seq) return;

        const newBlock: BocCachDienBlock = {
          id: Date.now().toString(),
          viTri: '',
          trinhTu: ''
        };

        set(state => ({
          data: {
            ...state.data,
            sequences: {
              ...state.data.sequences,
              [jobIdx]: {
                ...seq,
                bocCachDienBlocks: [...seq.bocCachDienBlocks, newBlock]
              }
            }
          }
        }));
      },

      addDieuKhienGau: (jobIdx) => {
        const { data } = get();
        const seqKey = jobIdx as keyof typeof data.sequences;
        const seq = data.sequences?.[seqKey];
        if (!seq) return;

        const newBlock: DieuKhienGauBlock = {
          id: Date.now().toString(),
          deLamGi: '',
          thucHien: ''
        };

        set(state => ({
          data: {
            ...state.data,
            sequences: {
              ...state.data.sequences,
              [jobIdx]: {
                ...seq,
                dieuKhienGauBlocks: [...seq.dieuKhienGauBlocks, newBlock]
              }
            }
          }
        }));
      },

      addThaoBocCachDien: (jobIdx) => {
        const { data } = get();
        const seqKey = jobIdx as keyof typeof data.sequences;
        const seq = data.sequences?.[seqKey];
        if (!seq) return;

        const newBlock: ThaoBocCachDienBlock = {
          id: Date.now().toString(),
          viTri: '',
          trinhTu: ''
        };

        set(state => ({
          data: {
            ...state.data,
            sequences: {
              ...state.data.sequences,
              [jobIdx]: {
                ...seq,
                thaoBocCachDienBlocks: [...seq.thaoBocCachDienBlocks, newBlock]
              }
            }
          }
        }));
      },

      addCanCuBoSung: () => set(state => ({
        data: {
          ...state.data,
          canCuBoSung: [...state.data.canCuBoSung, '']
        }
      })),

      removeCanCuBoSung: (idx) => set(state => ({
        data: {
          ...state.data,
          canCuBoSung: state.data.canCuBoSung.filter((_, i) => i !== idx)
        }
      })),

      validateData: () => {
        const { data } = get();
        const errs: string[] = [];

        const day = parseInt(data.canCu10_ngay);
        const month = parseInt(data.canCu10_thang);
        const year = parseInt(data.canCu10_nam);

        if (isNaN(day) || day < 1 || day > 31) errs.push('Ngày (Mục 10) không hợp lệ');
        if (isNaN(month) || month < 1 || month > 12) errs.push('Tháng (Mục 10) không hợp lệ');
        if (isNaN(year) || year < 2020 || year > 2100) errs.push('Năm (Mục 10) không hợp lệ');

        if (!data.soVb.trim()) errs.push('Chưa nhập số văn bản');
        if (data.jobItems.some(j => !j.trim())) errs.push('Có hạng mục công việc chưa nhập');

        set({ errors: errs });
        return errs.length === 0;
      }
    }),
    {
      name: 'patctc-storage',
      partialize: (state) => ({
        data: state.data,
        activeSection: state.activeSection,
        zoom: state.zoom
      })
    }
  )
);
