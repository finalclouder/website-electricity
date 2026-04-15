export interface DateParts {
  day: string;
  month: string;
  year: string;
}

const APP_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const DAY_FIRST_DATE = /^(\d{1,2})\s*[\/.-]\s*(\d{1,2})\s*[\/.-]\s*(\d{4})$/;
const YEAR_FIRST_DATE = /^(\d{4})\s*-\s*(\d{1,2})\s*-\s*(\d{1,2})$/;
const SQLITE_UTC_DATE_TIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

function padTwoDigits(value: string): string {
  return value.padStart(2, '0');
}

export function getDateParts(value?: string | null): DateParts | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const yearFirstMatch = trimmed.match(YEAR_FIRST_DATE);
  if (yearFirstMatch) {
    const [, year, month, day] = yearFirstMatch;
    return {
      day: padTwoDigits(day),
      month: padTwoDigits(month),
      year,
    };
  }

  const dayFirstMatch = trimmed.match(DAY_FIRST_DATE);
  if (dayFirstMatch) {
    const [, day, month, year] = dayFirstMatch;
    return {
      day: padTwoDigits(day),
      month: padTwoDigits(month),
      year,
    };
  }

  return null;
}

export function formatDateSlash(value?: string | null, fallback = ''): string {
  const parts = getDateParts(value);
  if (!parts) return fallback;
  return `${parts.day}/${parts.month}/${parts.year}`;
}

export function parseAppDate(value?: string | null): Date | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = SQLITE_UTC_DATE_TIME.test(trimmed)
    ? `${trimmed.replace(' ', 'T')}Z`
    : trimmed;

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateTime(dateStr?: string | null): string {
  const parsed = parseAppDate(dateStr);
  if (!parsed) return 'Không rõ thời gian';

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: APP_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(parsed);
}

export function timeAgo(dateStr: string): string {
  const parsed = parseAppDate(dateStr);
  if (!parsed) return 'Không rõ thời gian';

  const diff = Date.now() - parsed.getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return `Vừa xong · ${formatDateTime(dateStr)}`;
  if (mins < 60) return `${mins} phút trước · ${formatDateTime(dateStr)}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước · ${formatDateTime(dateStr)}`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} ngày trước · ${formatDateTime(dateStr)}`;

  return formatDateTime(dateStr);
}
