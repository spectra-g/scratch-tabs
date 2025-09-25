import { TabletState } from '../types';

export interface DateTimeTabletData {
  parsedDate: Date | null;
  error: string | null;
  selectedTimezones: string[];
  calculatorState: {
    operation: 'add' | 'subtract' | 'duration';
    years: number;
    months: number;
    weeks: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    secondDate: string;
    durationResult: DurationResult | null;
  };
  history: PinnedDate[];
  isOptimizing: boolean;
  selectedElementId: string | null;
  expandedAccordionSections?: string[];
}

export interface DateTimeTabletState extends TabletState {
  type: "datetime";
  data: DateTimeTabletData;
}

export interface PinnedDate {
  id: string;
  label: string;
  date: Date;
  originalInput: string;
  pinnedAt: number;
}

export interface DurationResult {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalDays: number;
  totalHours: number;
  totalMinutes: number;
  totalSeconds: number;
}

export interface ConversionFormats {
  humanReadable: string;
  relativeTime: string;
  iso8601: string;
  unixSeconds: number;
  unixMilliseconds: number;
  components: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    dayOfWeek: string;
    monthName: string;
  };
}

export interface TimezoneInfo {
  timezone: string;
  currentTime: string;
  convertedTime: string;
  offset: string;
  isDST: boolean;
}

export interface ParseResult {
  language: string;
  success: boolean;
  result?: string;
  error?: string;
  code: string;
}

export interface DateTimeTabletProps {
  state: DateTimeTabletState;
  onChange: (newState: DateTimeTabletState) => void;
}