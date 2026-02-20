
import React from 'react';
import { ShiftInfo, Cinema, ShiftType } from './types';

export const DEFAULT_SHIFTS: Record<string, ShiftInfo> = {
  OPEN: { id: 'OPEN', label: '오픈', color: 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-100' },
  MIDDLE: { id: 'MIDDLE', label: '미들', color: 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-100' },
  CLOSE: { id: 'CLOSE', label: '마감', color: 'bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-100' },
  
  DUAL_OPEN: { id: 'DUAL_OPEN', label: '겸직오픈', color: 'bg-cyan-100 text-cyan-800 border-cyan-200 ring-1 ring-cyan-100' },
  DUAL_MIDDLE: { id: 'DUAL_MIDDLE', label: '겸직미들', color: 'bg-amber-100 text-amber-800 border-amber-200 ring-1 ring-amber-100' },
  DUAL_CLOSE: { id: 'DUAL_CLOSE', label: '겸직마감', color: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 ring-1 ring-fuchsia-100' },

  OFF: { id: 'OFF', label: '주휴', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-100' },
  LEAVE: { id: 'LEAVE', label: '휴무', color: 'bg-white border border-dashed border-gray-200 text-gray-400' },
};

export const POSITIONS = ['점장', '매니저', '운영매니저'];

export const CINEMAS: Cinema[] = [
    { id: 'BUWON', name: '김해부원', color: 'indigo' },
    { id: 'OUTLET', name: '김해아울렛', color: 'orange' }
];

// 2025년 및 2026년 공휴일 통합 데이터
export const HOLIDAYS: Record<string, string> = {
  // 2025년
  '2025-01-01': '신정', '2025-01-27': '설날 연휴', '2025-01-28': '설날', '2025-01-29': '설날 연휴', '2025-01-30': '대체공휴일',
  '2025-03-01': '3.1절', '2025-03-03': '대체공휴일', '2025-05-05': '어린이날/부처님오신날', '2025-05-06': '대체공휴일',
  '2025-06-06': '현충일', '2025-08-15': '광복절', '2025-10-03': '개천절', '2025-10-05': '추석',
  '2025-10-06': '추석 연휴', '2025-10-07': '추석 연휴', '2025-10-08': '대체공휴일', '2025-10-09': '한글날', '2025-12-25': '성탄절',
  // 2026년
  '2026-01-01': '신정', '2026-02-16': '설날 연휴', '2026-02-17': '설날', '2026-02-18': '설날 연휴',
  '2026-03-01': '3.1절', '2026-03-02': '대체공휴일', '2026-05-05': '어린이날', '2026-05-24': '부처님오신날',
  '2026-05-25': '대체공휴일', '2026-06-06': '현충일', '2026-08-15': '광복절', '2026-08-17': '대체공휴일',
  '2026-09-24': '추석 연휴', '2026-09-25': '추석', '2026-09-26': '추석 연휴', '2026-09-28': '대체공휴일',
  '2026-10-03': '개천절', '2026-10-05': '대체공휴일', '2026-10-09': '한글날', '2026-12-25': '성탄절',
};
