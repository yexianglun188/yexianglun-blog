/**
 * 农历换算（支持 1900 ~ 2098）。
 *
 * 为什么要自己实现：站内有两个按日期触发的彩蛋（生日 / 情人节），
 * 生日要按**农历**算，而农历每月长度不固定、还有闰月，
 * 「农历八月十八」在公历上每年都不同（实测 2026→09-28、2027→09-18、2028→10-06），
 * 所以不能写死日期，必须真换算。
 *
 * 数据表来源：用 Python 的 lunardate 逐日扫描生成（不是凭记忆抄的通用表），
 * 每年一个整数 info：
 *   bit 0-11  十二月长度掩码（bit 11 = 正月 … bit 0 = 十二月），1 = 该月 30 天
 *   bit 12-15 闰月月份（0 = 该年无闰月）
 *   bit 16    闰月长度（1 = 30 天）
 * 生成时做过 encode→decode 往返校验，且本文件另有跨语言对照测试。
 */

const LUNAR_INFO: readonly number[] = [
  0x084bd,0x004ae,0x00a57,0x0554d,0x00d26,0x00d95,0x14655,0x0056a,
  0x009ad,0x0255d,0x004ae,0x06a5b,0x00a4d,0x00d25,0x15d25,0x00b54,
  0x00d6a,0x02ada,0x0095b,0x17497,0x00497,0x00a4b,0x05b4b,0x006a5,
  0x006d4,0x14ab5,0x002b6,0x00957,0x0252f,0x00497,0x06656,0x00d4a,
  0x00ea5,0x056e9,0x005ad,0x002b6,0x1386e,0x0092e,0x17c8d,0x00c95,
  0x00d4a,0x16d8a,0x00b55,0x0056a,0x14a5b,0x0025d,0x0092d,0x02d2b,
  0x00a95,0x07b55,0x006ca,0x00b55,0x15535,0x004da,0x00a5d,0x13457,
  0x0052b,0x08a9a,0x00e95,0x006aa,0x06aea,0x00ab5,0x004b6,0x04aae,
  0x00a57,0x00526,0x03f26,0x00d95,0x075b5,0x0056a,0x0096d,0x054dd,
  0x004ad,0x00a4d,0x04d4d,0x00d25,0x08d55,0x00b54,0x00b5a,0x1695a,
  0x0095b,0x0049b,0x04a97,0x00a4b,0x0ab27,0x006a5,0x006d4,0x06af4,
  0x00ab6,0x00957,0x054af,0x00497,0x0064b,0x0374a,0x00ea5,0x086b5,
  0x005ac,0x00ab6,0x0596d,0x0092e,0x00c96,0x04d95,0x00d4a,0x00da5,
  0x02755,0x0056a,0x07abb,0x0025d,0x0092d,0x05cab,0x00a95,0x00b4a,
  0x04baa,0x00ad5,0x0955d,0x004ba,0x00a5b,0x16517,0x0052b,0x00a93,
  0x04795,0x006aa,0x00ad5,0x025b5,0x004b6,0x06a6e,0x00a4e,0x00d26,
  0x05ea6,0x00d53,0x005aa,0x0376a,0x0096d,0x0b4af,0x004ad,0x00a4d,
  0x16d0b,0x00d25,0x00d52,0x05dd4,0x00b5a,0x0056d,0x0255b,0x0049b,
  0x07a57,0x00a4b,0x00aa5,0x15b25,0x006d2,0x00ada,0x134b6,0x00937,
  0x0849f,0x00497,0x0064b,0x1668a,0x00ea5,0x006aa,0x14a6c,0x00aae,
  0x0092e,0x03d2e,0x00c96,0x07d55,0x00d4a,0x00da5,0x055d5,0x0056a,
  0x00a6d,0x0455d,0x0052d,0x08a9b,0x00a95,0x00b4a,0x06b6a,0x00ad5,
  0x0055a,0x04aba,0x00a5b,0x0052b,0x03b27,0x00693,0x07733,0x006aa,
  0x00ad5,0x154b5,0x004b6,0x00a57,0x0454e,0x00d16,0x08e96,0x00d52,
  0x00daa,0x166aa,0x0056d,0x004ae,0x04a9d,0x00a2d,0x00d15,
];

const YEAR_MIN = 1900;
const YEAR_MAX = 2098;

/** 农历 1900 年正月初一 = 公历 1900-01-31（UTC 零点，避免时区漂移） */
const BASE_UTC = Date.UTC(1900, 0, 31);
const DAY_MS = 86400000;

const MONTH_NAMES = [
  "正月", "二月", "三月", "四月", "五月", "六月",
  "七月", "八月", "九月", "十月", "冬月", "腊月",
];

const DAY_TENS = ["初", "十", "廿", "三"];
const DAY_UNITS = ["十", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

export interface LunarDate {
  year: number;
  month: number;      // 1-12
  day: number;        // 1-30
  isLeap: boolean;
  monthName: string;  // 如「八月」「闰六月」
  dayName: string;    // 如「十八」
}

function info(y: number): number {
  if (y < YEAR_MIN || y > YEAR_MAX) return NaN;
  return LUNAR_INFO[y - YEAR_MIN];
}

/** 该农历年的闰月月份，0 表示无闰月 */
export function leapMonth(y: number): number {
  return (info(y) >> 12) & 0xf;
}

/** 闰月天数（无闰月返回 0） */
export function leapDays(y: number): number {
  return leapMonth(y) ? ((info(y) >> 16) & 1 ? 30 : 29) : 0;
}

/** 某农历月的天数（不含闰月） */
export function monthDays(y: number, m: number): number {
  return info(y) & (1 << (12 - m)) ? 30 : 29;
}

interface MonthSlot { month: number; isLeap: boolean; days: number }

/** 按真实顺序列出该年的所有月份（闰月紧跟在本月之后） */
function monthsOfYear(y: number): MonthSlot[] {
  const leap = leapMonth(y);
  const out: MonthSlot[] = [];
  for (let m = 1; m <= 12; m++) {
    out.push({ month: m, isLeap: false, days: monthDays(y, m) });
    if (leap === m) out.push({ month: m, isLeap: true, days: leapDays(y) });
  }
  return out;
}

function daysInYear(y: number): number {
  let s = 0;
  for (const s2 of monthsOfYear(y)) s += s2.days;
  return s;
}

function monthName(m: number, isLeap: boolean): string {
  return (isLeap ? "闰" : "") + (MONTH_NAMES[m - 1] ?? `${m}月`);
}

function dayName(d: number): string {
  if (d === 10) return "初十";
  if (d === 20) return "二十";
  if (d === 30) return "三十";
  const tens = Math.floor(d / 10);
  const unit = d % 10;
  return (DAY_TENS[tens] ?? "") + (DAY_UNITS[unit] ?? "");
}

/** 公历 → 农历 */
export function solarToLunar(y: number, m: number, d: number): LunarDate | null {
  if (y < YEAR_MIN || y > YEAR_MAX) return null;
  let offset = Math.floor((Date.UTC(y, m - 1, d) - BASE_UTC) / DAY_MS);
  if (offset < 0) return null;

  let ly = YEAR_MIN;
  while (ly <= YEAR_MAX) {
    const diy = daysInYear(ly);
    if (offset < diy) break;
    offset -= diy;
    ly++;
  }
  if (ly > YEAR_MAX) return null;

  for (const slot of monthsOfYear(ly)) {
    if (offset < slot.days) {
      return {
        year: ly,
        month: slot.month,
        day: offset + 1,
        isLeap: slot.isLeap,
        monthName: monthName(slot.month, slot.isLeap),
        dayName: dayName(offset + 1),
      };
    }
    offset -= slot.days;
  }
  return null;
}

/** 农历 → 公历 */
export function lunarToSolar(
  ly: number, lm: number, ld: number, isLeap = false
): { year: number; month: number; day: number } | null {
  if (ly < YEAR_MIN || ly > YEAR_MAX) return null;
  let days = 0;
  for (let y = YEAR_MIN; y < ly; y++) days += daysInYear(y);
  let found = false;
  for (const slot of monthsOfYear(ly)) {
    if (slot.month === lm && slot.isLeap === isLeap) {
      found = true;
      break;
    }
    days += slot.days;
  }
  if (!found) return null;
  days += ld - 1;

  const dt = new Date(BASE_UTC + days * DAY_MS);
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
  };
}

/** 今天的农历（用于日期彩蛋判断） */
export function todayLunar(now: Date = new Date()): LunarDate | null {
  return solarToLunar(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export const LUNAR_RANGE = { min: YEAR_MIN, max: YEAR_MAX };
