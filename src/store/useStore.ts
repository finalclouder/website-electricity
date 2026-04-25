import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PATCTCData, WorkType, RiskItem, Personnel, ConstructionSequence, BocCachDienBlock, DieuKhienGauBlock, ThaoBocCachDienBlock } from '../types';
import { WORK_TYPES, PERSONNEL_MASTER, TOOLS_MASTER } from '../constants';
import { cleanJobItem, ensureBulletFormat, ensureLocation, formatJobItem } from '../utils/patctcFormat';

export { cleanJobItem, ensureBulletFormat, ensureLocation, formatJobItem };

function cloneBocCachDienBlocks(blocks?: BocCachDienBlock[]): BocCachDienBlock[] {
  return (blocks || []).map((block) => ({ ...block }));
}

function cloneDieuKhienGauBlocks(blocks?: DieuKhienGauBlock[]): DieuKhienGauBlock[] {
  return (blocks || []).map((block) => ({ ...block }));
}

function cloneThaoBocCachDienBlocks(blocks?: ThaoBocCachDienBlock[]): ThaoBocCachDienBlock[] {
  return (blocks || []).map((block) => ({ ...block }));
}

function cloneSequence(sequence?: Partial<ConstructionSequence> | null): ConstructionSequence {
  return {
    eyeCheckText: sequence?.eyeCheckText,
    guongKiemTra: sequence?.guongKiemTra || '',
    bocCachDienBlocks: cloneBocCachDienBlocks(sequence?.bocCachDienBlocks),
    dieuKhienGauBlocks: cloneDieuKhienGauBlocks(sequence?.dieuKhienGauBlocks),
    thaoBocCachDienBlocks: cloneThaoBocCachDienBlocks(sequence?.thaoBocCachDienBlocks)
  };
}

function getRootSequence(data: PATCTCData): ConstructionSequence {
  return cloneSequence({
    eyeCheckText: data.eyeCheckText,
    guongKiemTra: data.guongKiemTra,
    bocCachDienBlocks: data.bocCachDienBlocks,
    dieuKhienGauBlocks: data.dieuKhienGauBlocks,
    thaoBocCachDienBlocks: data.thaoBocCachDienBlocks
  });
}

const DEFAULT_RISK_HAZARD = 'Khi thi công có thể rơi dụng cụ đồ nghề, rơi bulong, êcu.';
const DEFAULT_RISK_MEASURE = 'Dụng cụ đồ nghề phải đựng trong túi đựng riêng. Khi làm việc phải thực hiện nắm giữ chắc chắn.';
const HOTLINE_ROLE = 'CHTT - GSAT';
const HOTLINE_DRAFTER_ROLE = 'CHTT - GSAT - Lập PA';
const HOTLINE_PLACEHOLDER_ID = 'ks-lap-pa-placeholder';
const HOTLINE_PLACEHOLDER_NAME = '..................................................';

function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function isHotlineRole(role?: string): boolean {
  return role === 'CHTT-GSAT' || role === HOTLINE_ROLE;
}

function buildRiskLocation(jobItem: string, cot: string, dz: string): string {
  return `${ensureLocation(jobItem, cot, dz).replace(/\.+$/, '')}.`;
}

function buildHotlineJobItem(jobItem: string, cot: string, dz: string): string {
  return ensureLocation(jobItem, cot, dz).replace(/\.+$/, '');
}

function buildWorkLocation(cot: string, dz: string): string {
  return `Cột ${cot} ĐZ ${dz}`;
}

function buildExpectedTime(data: Pick<PATCTCData, 'tg_gio' | 'tg_soNgay' | 'tg_thang' | 'tg_nam'>): string {
  return `${data.tg_gio}h/${String(data.tg_soNgay).padStart(2, '0')} ngày trong tháng ${String(data.tg_thang).padStart(2, '0')} năm ${data.tg_nam}`;
}

function buildDefaultSafetyMeasure(mc: string): string {
  return `Khóa chức năng TĐL (F79) của ĐKBV MC ${mc}. Nối đất xe gầu hotline trong quá trình thi công hotline.`;
}

function createDefaultRisk(jobItem: string, cot: string, dz: string, prefix: string): RiskItem {
  return {
    id: createId(prefix),
    location: buildRiskLocation(jobItem, cot, dz),
    details: [{
      id: createId(`${prefix}_detail`),
      hazard: DEFAULT_RISK_HAZARD,
      measure: DEFAULT_RISK_MEASURE
    }],
    note: ''
  };
}

function shouldFollowGlobalMc(currentMc: string | undefined, prevMc: string, prevDz: string): boolean {
  const trimmed = currentMc?.trim() || '';
  return !trimmed || trimmed === prevMc || trimmed === prevDz;
}

function shouldFollowDzSource(currentDzNguon: string, prevDz: string): boolean {
  const trimmed = currentDzNguon.trim();
  return !trimmed || trimmed === prevDz || trimmed.startsWith(prevDz);
}

function replaceLeadingDzSource(currentDzNguon: string, prevDz: string, nextDz: string): string {
  const trimmed = currentDzNguon.trim();
  if (!trimmed) return nextDz;
  if (trimmed === prevDz) return nextDz;
  if (trimmed.startsWith(prevDz)) {
    return `${nextDz}${trimmed.slice(prevDz.length)}`;
  }
  return currentDzNguon;
}

function syncSafetyMeasureMc(text: string, prevMc: string, nextMc: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return text;
  }
  if (!prevMc || prevMc === nextMc) {
    return text;
  }
  return text.split(`MC ${prevMc}`).join(`MC ${nextMc}`);
}

function hasSequenceContent(sequence?: Partial<ConstructionSequence> | null): boolean {
  if (!sequence) return false;
  return Boolean(
    sequence.eyeCheckText !== undefined
    || (sequence.guongKiemTra && sequence.guongKiemTra.trim())
    || sequence.bocCachDienBlocks?.length
    || sequence.dieuKhienGauBlocks?.length
    || sequence.thaoBocCachDienBlocks?.length
  );
}

function buildSurveyHotlineParticipants(
  personnel: Personnel[],
  requestedDrafterId?: string
): Pick<PATCTCData, 'ks_lapPAId' | 'ks_thanhPhanHotline'> {
  const sortedHotlinePersonnel = personnel
    .filter((person) => isHotlineRole(person.role))
    .sort((a, b) => (a.chttSelectedAt || 0) - (b.chttSelectedAt || 0));

  const resolvedDrafterId = sortedHotlinePersonnel.some((person) => person.id === requestedDrafterId)
    ? requestedDrafterId
    : sortedHotlinePersonnel[0]?.id;

  if (sortedHotlinePersonnel.length === 0) {
    return {
      ks_lapPAId: undefined,
      ks_thanhPhanHotline: [{
        id: HOTLINE_PLACEHOLDER_ID,
        name: HOTLINE_PLACEHOLDER_NAME,
        role: HOTLINE_DRAFTER_ROLE
      }]
    };
  }

  const drafter = sortedHotlinePersonnel.find((person) => person.id === resolvedDrafterId);
  const others = sortedHotlinePersonnel.filter((person) => person.id !== resolvedDrafterId);
  const orderedParticipants = drafter ? [drafter, ...others] : others;

  return {
    ks_lapPAId: resolvedDrafterId,
    ks_thanhPhanHotline: orderedParticipants.map((person) => ({
      id: person.id,
      name: person.name.trim() || HOTLINE_PLACEHOLDER_NAME,
      role: person.id === resolvedDrafterId ? HOTLINE_DRAFTER_ROLE : HOTLINE_ROLE
    }))
  };
}

function derivePatctcData(
  prev: PATCTCData,
  next: PATCTCData,
  changedKeys: Set<keyof PATCTCData>,
  options?: { forceRepair?: boolean }
): PATCTCData {
  const jobContextChanged = options?.forceRepair
    || changedKeys.has('jobItems')
    || changedKeys.has('cot')
    || changedKeys.has('dz');
  const mcContextChanged = options?.forceRepair || changedKeys.has('mc') || changedKeys.has('dz');
  const shouldRepairSingleSequence = options?.forceRepair && next.jobItems.length === 1;
  const prevGlobalMc = (prev.mc || prev.dz).trim();

  let derived = {
    ...next,
    viTriLamViec: buildWorkLocation(next.cot, next.dz),
    thoiGianDuKien: buildExpectedTime(next)
  };

  if (changedKeys.has('dz') && !changedKeys.has('mc') && shouldFollowGlobalMc(prev.mc, prevGlobalMc, prev.dz)) {
    derived.mc = next.dz;
  }

  if (changedKeys.has('dz') && !changedKeys.has('dzNguon') && shouldFollowDzSource(prev.dzNguon, prev.dz)) {
    derived.dzNguon = replaceLeadingDzSource(prev.dzNguon, prev.dz, next.dz);
  }

  derived.riskTableJob1 = (derived.riskTableJob1.length === 0
    ? [createDefaultRisk(derived.jobItems[0] || '', derived.cot, derived.dz, 'rj1')]
    : derived.riskTableJob1
  ).map((risk) => (
    jobContextChanged
      ? { ...risk, location: buildRiskLocation(derived.jobItems[0] || '', derived.cot, derived.dz) }
      : risk
  ));

  if (derived.jobItems.length > 1) {
    const seededRiskTableJob2 = derived.riskTableJob2.length === 0
      ? [createDefaultRisk(derived.jobItems[1] || '', derived.cot, derived.dz, 'rj2')]
      : derived.riskTableJob2;

    derived.riskTableJob2 = seededRiskTableJob2.map((risk) => (
      jobContextChanged
        ? { ...risk, location: buildRiskLocation(derived.jobItems[1] || '', derived.cot, derived.dz) }
        : risk
    ));
  } else {
    derived.riskTableJob2 = [];
  }

  const nextGlobalMc = (derived.mc || derived.dz).trim();
  derived.hotlineSafetyMeasures = Array.from({ length: derived.jobItems.length }, (_, idx) => {
    const existingMeasure = derived.hotlineSafetyMeasures[idx] ?? prev.hotlineSafetyMeasures[idx];
    const previousMeasureMc = (prev.hotlineSafetyMeasures[idx]?.mc || prevGlobalMc || prev.dz).trim();
    const existingMeasureMc = existingMeasure?.mc?.trim() || '';
    const syncedMeasureMc = mcContextChanged && shouldFollowGlobalMc(existingMeasureMc, previousMeasureMc, prev.dz)
      ? nextGlobalMc
      : (existingMeasureMc || nextGlobalMc);

    return {
      id: existingMeasure?.id || createId('hsm'),
      jobItem: buildHotlineJobItem(derived.jobItems[idx] || '', derived.cot, derived.dz),
      mc: syncedMeasureMc,
      safetyMeasure: mcContextChanged
        ? syncSafetyMeasureMc(existingMeasure?.safetyMeasure || '', previousMeasureMc, syncedMeasureMc)
        : (existingMeasure != null ? (existingMeasure.safetyMeasure ?? '') : buildDefaultSafetyMeasure(syncedMeasureMc)),
      extraMeasures: [...(existingMeasure?.extraMeasures || [])]
    };
  });

  if (derived.jobItems.length === 1) {
    const sourceSequence = shouldRepairSingleSequence && hasSequenceContent(derived.sequences?.[1])
      ? cloneSequence(derived.sequences?.[1])
      : getRootSequence(derived);

    derived = {
      ...derived,
      eyeCheckText: sourceSequence.eyeCheckText,
      guongKiemTra: sourceSequence.guongKiemTra,
      bocCachDienBlocks: cloneBocCachDienBlocks(sourceSequence.bocCachDienBlocks),
      dieuKhienGauBlocks: cloneDieuKhienGauBlocks(sourceSequence.dieuKhienGauBlocks),
      thaoBocCachDienBlocks: cloneThaoBocCachDienBlocks(sourceSequence.thaoBocCachDienBlocks),
      sequences: {
        1: cloneSequence(sourceSequence)
      }
    };
  } else {
    derived.sequences = {
      ...derived.sequences,
      1: cloneSequence(derived.sequences?.[1] ?? getRootSequence(derived)),
      2: cloneSequence(derived.sequences?.[2])
    };
  }

  const surveyState = buildSurveyHotlineParticipants(derived.personnel, derived.ks_lapPAId);
  derived.ks_lapPAId = surveyState.ks_lapPAId;
  derived.ks_thanhPhanHotline = surveyState.ks_thanhPhanHotline;

  return derived;
}

function hydratePatctcData(data: PATCTCData): PATCTCData {
  return derivePatctcData(data, data, new Set<keyof PATCTCData>(), { forceRepair: true });
}

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
  phuongThucNgayLamViec: [],
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
    jobItem: 'Lắp dây nối đất CSV, nối đất vỏ cáp ngầm, tại cột 18 ĐZ 471 E7.33',
    safetyMeasure: 'Khóa chức năng TĐL (F79) của ĐKBV MC 471 E7.33. Nối đất xe gầu hotline trong quá trình thi công hotline.',
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
    2: { eyeCheckText: '', guongKiemTra: '', bocCachDienBlocks: [], dieuKhienGauBlocks: [], thaoBocCachDienBlocks: [] }
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
  /** Monotonic counter — incremented each time Preview should scroll to activeSection */
  previewScrollTick: number;
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
  /** Force Preview to scroll to activeSection — call after setActiveSection when section is already active */
  scrollPreviewToSection: (section: string) => void;
  setHotlineTab: (tab: number) => void;
  setActiveJobIdx: (idx: number) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setIsExporting: (val: boolean) => void;
  setIsUploadingPdf: (val: boolean) => void;
  setErrors: (errors: string[]) => void;

  // Business logic actions
  handleWorkTypeChange: (type: string) => void;
  updateJobItem: (idx: number, value: string) => void;
  updateCot: (cot: string) => void;
  updateDz: (dz: string) => void;
  setSurveyDrafter: (personId?: string) => void;
  addPersonnel: () => void;
  removePersonnel: (id: string) => void;
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
      data: hydratePatctcData(INITIAL_DATA),
      activeSection: '',
      previewScrollTick: 0,
      hotlineTab: 0,
      activeJobIdx: 1,
      zoom: 0.85,
      isExporting: false,
      isUploadingPdf: false,
      errors: [],

      // Basic actions
      updateData: (updates) => set(state => {
        const changedKeys = new Set(Object.keys(updates) as (keyof PATCTCData)[]);
        return {
          data: derivePatctcData(
            state.data,
            { ...state.data, ...updates },
            changedKeys
          )
        };
      }),

      setData: (data) => set({
        data: hydratePatctcData({ ...INITIAL_DATA, ...data })
      }),

      resetData: () => set({ data: hydratePatctcData(INITIAL_DATA) }),

      setActiveSection: (section) => set(state => ({
        activeSection: section,
        previewScrollTick: state.previewScrollTick + 1
      })),

      toggleSection: (section) => set(state => ({
        activeSection: state.activeSection === section ? '' : section,
        previewScrollTick: state.previewScrollTick + 1
      })),

      scrollPreviewToSection: (section) => set(state => ({
        activeSection: section,
        previewScrollTick: state.previewScrollTick + 1
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
        const currentData = get().data;

        const newRisks = (workType.risks || []).map((r: any, i: number) => ({
          id: `r${i + 1}`,
          location: r.location.replace('{VỊ_TRÍ}', `cột ${currentData.cot} ĐZ ${currentData.dz}`),
          details: [{ id: `d${i + 1}`, hazard: r.hazard, measure: r.measure }],
          note: ''
        }));

        const newSteps = (workType.steps || []).map((s: any) => ({ ...s, enabled: true }));

        set(state => ({
          data: derivePatctcData(
            state.data,
            {
              ...state.data,
              workType: type,
              riskTableJob1: newRisks,
              steps: newSteps
            },
            new Set<keyof PATCTCData>(['workType', 'riskTableJob1', 'steps'])
          )
        }));
      },

      updateJobItem: (idx, value) => set(state => {
        const newItems = [...state.data.jobItems];
        newItems[idx] = value;
        return {
          data: derivePatctcData(
            state.data,
            { ...state.data, jobItems: newItems },
            new Set<keyof PATCTCData>(['jobItems'])
          )
        };
      }),

      updateCot: (cot) => set(state => ({
        data: derivePatctcData(
          state.data,
          { ...state.data, cot },
          new Set<keyof PATCTCData>(['cot'])
        )
      })),

      updateDz: (dz) => set(state => ({
        data: derivePatctcData(
          state.data,
          { ...state.data, dz },
          new Set<keyof PATCTCData>(['dz'])
        )
      })),

      setSurveyDrafter: (personId) => set(state => ({
        data: derivePatctcData(
          state.data,
          { ...state.data, ks_lapPAId: personId },
          new Set<keyof PATCTCData>(['ks_lapPAId'])
        )
      })),

      addPersonnel: () => set(state => {
        const newPerson: Personnel = {
          id: createId('person'),
          name: '',
          gender: 'Nam',
          birthYear: 1990,
          role: 'NV',
          job: 'Công nhân Hotline',
          grade: '5/7',
          safetyGrade: '5/5'
        };

        return {
          data: derivePatctcData(
            state.data,
            { ...state.data, personnel: [...state.data.personnel, newPerson] },
            new Set<keyof PATCTCData>(['personnel'])
          )
        };
      }),

      removePersonnel: (id) => set(state => {
        if (state.data.personnel.length <= 1) return state;
        const person = state.data.personnel.find((item) => item.id === id);
        const updates: Partial<PATCTCData> = {
          personnel: state.data.personnel.filter((item) => item.id !== id),
          ks_thanhPhanDieuDo: state.data.ks_thanhPhanDieuDo.filter(
            (item) => item.id !== id && item.name !== person?.name
          )
        };

        if (person) {
          if (state.data.nguoiLap === person.name) updates.nguoiLap = '';
          if (state.data.nguoiKiemTra === person.name) updates.nguoiKiemTra = '';
          if (state.data.doiTruong === person.name) updates.doiTruong = '';
          if (state.data.ks_qlvh_name === person.name) updates.ks_qlvh_name = '';
        }

        const changedKeys = new Set<keyof PATCTCData>(['personnel', 'ks_thanhPhanDieuDo']);
        if (updates.nguoiLap !== undefined) changedKeys.add('nguoiLap');
        if (updates.nguoiKiemTra !== undefined) changedKeys.add('nguoiKiemTra');
        if (updates.doiTruong !== undefined) changedKeys.add('doiTruong');
        if (updates.ks_qlvh_name !== undefined) changedKeys.add('ks_qlvh_name');

        return {
          data: derivePatctcData(
            state.data,
            { ...state.data, ...updates },
            changedKeys
          )
        };
      }),

      addJobItem: () => set(state => {
        const d = state.data;
        if (d.jobItems.length >= 2) return state;
        const newMeasure = {
          id: createId('hsm'),
          jobItem: '',
          safetyMeasure: buildDefaultSafetyMeasure(d.mc || d.dz),
          mc: d.mc,
          extraMeasures: [] as string[]
        };
        const newSequences = { ...d.sequences };
        // If going from 1 to 2, copy root sequence into sequences[1] if not already there
        if (d.jobItems.length === 1) {
          newSequences[1] = cloneSequence(newSequences[1] ?? getRootSequence(d));
          newSequences[2] = cloneSequence();
        }
        return {
          data: derivePatctcData(
            d,
            {
              ...d,
              jobItems: [...d.jobItems, ''],
              hotlineSafetyMeasures: [...d.hotlineSafetyMeasures, newMeasure],
              sequences: newSequences
            },
            new Set<keyof PATCTCData>(['jobItems', 'hotlineSafetyMeasures', 'sequences'])
          )
        };
      }),

      removeJobItem: (idx) => set(state => {
        const d = state.data;
        if (d.jobItems.length <= 1) return state;
        const newJobItems = d.jobItems.filter((_, i) => i !== idx);
        const newMeasures = d.hotlineSafetyMeasures.filter((_, i) => i !== idx);

        if (newJobItems.length === 1) {
          const remainingSeq = cloneSequence(d.sequences?.[idx === 0 ? 2 : 1] ?? getRootSequence(d));
          const nextRiskTableJob1 = idx === 0 ? [...d.riskTableJob2] : [...d.riskTableJob1];

          return {
            data: derivePatctcData(
              d,
              {
                ...d,
                jobItems: newJobItems,
                hotlineSafetyMeasures: newMeasures,
                riskTableJob1: nextRiskTableJob1,
                riskTableJob2: [],
                eyeCheckText: remainingSeq.eyeCheckText,
                guongKiemTra: remainingSeq.guongKiemTra,
                bocCachDienBlocks: cloneBocCachDienBlocks(remainingSeq.bocCachDienBlocks),
                dieuKhienGauBlocks: cloneDieuKhienGauBlocks(remainingSeq.dieuKhienGauBlocks),
                thaoBocCachDienBlocks: cloneThaoBocCachDienBlocks(remainingSeq.thaoBocCachDienBlocks),
                sequences: {
                  1: remainingSeq
                }
              },
              new Set<keyof PATCTCData>([
                'jobItems',
                'hotlineSafetyMeasures',
                'riskTableJob1',
                'riskTableJob2',
                'eyeCheckText',
                'guongKiemTra',
                'bocCachDienBlocks',
                'dieuKhienGauBlocks',
                'thaoBocCachDienBlocks',
                'sequences'
              ])
            ),
            activeJobIdx: 1,
            hotlineTab: 0
          };
        }

        return {
          data: derivePatctcData(
            d,
            {
              ...d,
              jobItems: newJobItems,
              hotlineSafetyMeasures: newMeasures
            },
            new Set<keyof PATCTCData>(['jobItems', 'hotlineSafetyMeasures'])
          )
        };
      }),

      copyJobItem: (idx) => set(state => {
        const d = state.data;
        if (d.jobItems.length >= 2) return state;
        const newItems = [...d.jobItems];
        newItems.splice(idx + 1, 0, d.jobItems[idx]);
        // Copy hotline measure
        const newMeasures = [...d.hotlineSafetyMeasures];
        const sourceMeasure = d.hotlineSafetyMeasures[idx];
        newMeasures.splice(idx + 1, 0, {
          id: createId('hsm'),
          jobItem: sourceMeasure?.jobItem || `${d.jobItems[idx]}, tại cột ${d.cot} ĐZ ${d.dz}`,
          mc: sourceMeasure?.mc || d.mc,
          safetyMeasure: sourceMeasure?.safetyMeasure || `Khóa chức năng TĐL (F79) của ĐKBV MC ${d.mc}. Nối đất xe gầu hotline trong quá trình thi công hotline.`,
          extraMeasures: sourceMeasure?.extraMeasures ? [...sourceMeasure.extraMeasures] : []
        });
        // Copy sequences
        const newSequences = { ...d.sequences };
        if (d.jobItems.length === 1) {
          newSequences[1] = cloneSequence(newSequences[1] ?? getRootSequence(d));
        }
        const sourceSeq = cloneSequence(newSequences[idx + 1] ?? getRootSequence(d));
        newSequences[idx + 2] = sourceSeq;
        return {
          data: derivePatctcData(
            d,
            {
              ...d,
              jobItems: newItems,
              hotlineSafetyMeasures: newMeasures,
              sequences: newSequences
            },
            new Set<keyof PATCTCData>(['jobItems', 'hotlineSafetyMeasures', 'sequences'])
          )
        };
      }),

      addBocCachDien: (jobIdx) => set(state => {
        const seqKey = jobIdx as keyof typeof state.data.sequences;
        const seq = state.data.sequences?.[seqKey];
        if (!seq) return state;
        const isSingleJob = state.data.jobItems.length === 1;

        const newBlock: BocCachDienBlock = {
          id: Date.now().toString(),
          viTri: '',
          trinhTu: ''
        };

        const nextSequence = {
          ...seq,
          bocCachDienBlocks: [...seq.bocCachDienBlocks, newBlock]
        };

        return {
          data: {
            ...state.data,
            ...(isSingleJob ? { bocCachDienBlocks: nextSequence.bocCachDienBlocks } : {}),
            sequences: {
              ...state.data.sequences,
              [jobIdx]: nextSequence
            }
          }
        };
      }),

      addDieuKhienGau: (jobIdx) => set(state => {
        const seqKey = jobIdx as keyof typeof state.data.sequences;
        const seq = state.data.sequences?.[seqKey];
        if (!seq) return state;
        const isSingleJob = state.data.jobItems.length === 1;

        const newBlock: DieuKhienGauBlock = {
          id: Date.now().toString(),
          deLamGi: '',
          thucHien: ''
        };

        const nextSequence = {
          ...seq,
          dieuKhienGauBlocks: [...seq.dieuKhienGauBlocks, newBlock]
        };

        return {
          data: {
            ...state.data,
            ...(isSingleJob ? { dieuKhienGauBlocks: nextSequence.dieuKhienGauBlocks } : {}),
            sequences: {
              ...state.data.sequences,
              [jobIdx]: nextSequence
            }
          }
        };
      }),

      addThaoBocCachDien: (jobIdx) => set(state => {
        const seqKey = jobIdx as keyof typeof state.data.sequences;
        const seq = state.data.sequences?.[seqKey];
        if (!seq) return state;
        const isSingleJob = state.data.jobItems.length === 1;

        const newBlock: ThaoBocCachDienBlock = {
          id: Date.now().toString(),
          viTri: '',
          trinhTu: ''
        };

        const nextSequence = {
          ...seq,
          thaoBocCachDienBlocks: [...seq.thaoBocCachDienBlocks, newBlock]
        };

        return {
          data: {
            ...state.data,
            ...(isSingleJob ? { thaoBocCachDienBlocks: nextSequence.thaoBocCachDienBlocks } : {}),
            sequences: {
              ...state.data.sequences,
              [jobIdx]: nextSequence
            }
          }
        };
      }),

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
      }),
      merge: (persistedState, currentState) => {
        const typedPersistedState = persistedState as Partial<AppState>;

        return {
          ...currentState,
          ...typedPersistedState,
          data: typedPersistedState.data
            ? hydratePatctcData({ ...currentState.data, ...typedPersistedState.data })
            : currentState.data
        };
      }
    }
  )
);
