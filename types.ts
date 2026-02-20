
export type ShiftType = 'OPEN' | 'MIDDLE' | 'CLOSE' | 'OFF' | 'LEAVE' | 'DUAL_OPEN' | 'DUAL_MIDDLE' | 'DUAL_CLOSE';

export interface ShiftInfo {
  id: string;
  label: string;
  color: string;
}

export interface ShiftData {
  value: string;
  isManual: boolean;
  shiftTime?: string;
}

export interface Staff {
  id: string;
  name: string;
  cinema: 'BUWON' | 'OUTLET';
  position: string;
}

export interface DaySchedule {
  [staffId: string]: ShiftData;
}

export interface MonthSchedule {
  [dateKey: string]: DaySchedule;
}

export interface Cinema {
  id: 'BUWON' | 'OUTLET';
  name: string;
  color: string;
}

export interface StaffStats {
  id: string;
  name: string;
  position: string;
  cinema: string;
  counts: {
    OPEN: number;
    MIDDLE: number;
    CLOSE: number;
    OFF: number;
    LEAVE: number;
    weekendWork: number;
  };
}

export interface ShortageAlert {
  date: string;
  cinemaName: string;
  count: number;
  dayName: string;
}

// Leave Management Types
export type LeaveCategory = 'SUBSTITUTE' | 'ANNUAL' | 'REGULAR' | 'FAMILY' | 'LONG_SERVICE' | 'LABOR_DAY';

export interface LeaveRecord {
  id: string;
  staffId: string;
  type: LeaveCategory;
  date: string;     // YYYY-MM-DD (Usage Date)
  days: number;     // e.g., 1, 0.5, -1
  memo?: string;
  createdAt: number;
  targetMonth?: number; // Month bucket (1-12)
  year?: number;        // Year bucket (e.g., 2025, 2026) - Essential for records with empty usage dates
  refDate?: string;     // Reference Date for sorting (e.g., Holiday Date) even if usage date is empty
}

export interface AnnualLeaveConfig {
  [staffId: string]: number; // Total annual leave days allowed
}

// Operating Hours Type
export interface DailyOperatingHours {
  [dateKey: string]: {
    [cinemaId: string]: {
      start: string;      // e.g., "09:00"
      end: string;        // e.g., "22:00"
      openShift: string;  // e.g., "08:00~17:00"
      closeShift: string; // e.g., "13:00~22:00"
    }
  }
}
