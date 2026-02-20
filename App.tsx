
import React, { useState, useMemo, useCallback } from 'react';
import { 
  Calendar, Users, ChevronLeft, ChevronRight, 
  MonitorPlay, X, Trash2, Sparkles, RefreshCw, Check, Plus, Eraser, Plane
} from 'lucide-react';
import { Staff, MonthSchedule, ShiftType, ShiftInfo, Cinema, ShiftData, StaffStats, LeaveRecord, AnnualLeaveConfig, DailyOperatingHours } from './types';
import { DEFAULT_SHIFTS, CINEMAS as INITIAL_CINEMAS, HOLIDAYS } from './constants';
import { formatDateKey, getCinemaMonthRange } from './utils/helpers';
import { MatrixView } from './components/ScheduleMatrix';
import { StaffManagement } from './components/StaffManagement';
import { LeaveManagement } from './components/LeaveManagement';
import { OperatingHoursModal } from './components/OperatingHoursModal';

const CUSTOM_COLORS = [
  'bg-pink-50 text-pink-700 border-pink-200 ring-1 ring-pink-100',
  'bg-cyan-50 text-cyan-700 border-cyan-200 ring-1 ring-cyan-100',
  'bg-lime-50 text-lime-700 border-lime-200 ring-1 ring-lime-100',
  'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 ring-1 ring-fuchsia-100',
  'bg-yellow-50 text-yellow-700 border-yellow-200 ring-1 ring-yellow-100',
  'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-100',
  'bg-teal-50 text-teal-700 border-teal-200 ring-1 ring-teal-100',
  'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-100',
  'bg-violet-50 text-violet-700 border-violet-200 ring-1 ring-violet-100',
  'bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-100',
];

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'calendar' | 'staff' | 'leave'>('calendar');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingTarget, setGeneratingTarget] = useState<string | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isManualClearModalOpen, setIsManualClearModalOpen] = useState(false);
  const [weeklyClearTarget, setWeeklyClearTarget] = useState<{weekIdx: number, cinemaId: 'BUWON' | 'OUTLET'} | null>(null);
  
  const [cinemas, setCinemas] = useState<Cinema[]>(INITIAL_CINEMAS);
  const [managedShifts, setManagedShifts] = useState<Record<string, ShiftInfo>>(DEFAULT_SHIFTS);
  const [manualModalData, setManualModalData] = useState<{dateKey: string, staff: Staff, currentShift: ShiftData | undefined} | null>(null);
  const [tempSelectedShift, setTempSelectedShift] = useState<string | null>(null);
  
  // Custom Shift Creation State
  const [isAddingShift, setIsAddingShift] = useState(false);
  const [newShiftName, setNewShiftName] = useState('');

  // Manual Time Input for Middle Shifts
  const [customTime, setCustomTime] = useState('');

  // Leave Management State
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
  const [annualConfig, setAnnualConfig] = useState<AnnualLeaveConfig>({});

  // Operating Hours State & Modal
  const [operatingHours, setOperatingHours] = useState<DailyOperatingHours>({});
  const [opHoursModal, setOpHoursModal] = useState<{isOpen: boolean, cinema: Cinema | null}>({ isOpen: false, cinema: null });


  const [staffList, setStaffList] = useState<Staff[]>([
    { id: '1', name: '김미소', cinema: 'BUWON', position: '점장' },
    { id: '2', name: '이열정', cinema: 'BUWON', position: '매니저' },
    { id: '3', name: '박친절', cinema: 'BUWON', position: '운영매니저' },
    { id: '4', name: '최성실', cinema: 'BUWON', position: '운영매니저' },
    { id: '5', name: '정정확', cinema: 'OUTLET', position: '운영매니저' },
    { id: '6', name: '강체력', cinema: 'OUTLET', position: '운영매니저' },
    { id: '7', name: '한성실', cinema: 'OUTLET', position: '운영매니저' },
  ]);
  
  const [schedules, setSchedules] = useState<MonthSchedule>({});

  const generateSchedule = useCallback((targetCinema: 'BUWON' | 'OUTLET', targetWeekIdx?: number) => {
    const isWeekly = targetWeekIdx !== undefined;
    const loadingKey = isWeekly ? `${targetCinema}-${targetWeekIdx}` : targetCinema;
    
    setIsGenerating(true);
    setGeneratingTarget(loadingKey);

    setTimeout(() => {
      const days = getCinemaMonthRange(currentDate);
      let newSchedules = JSON.parse(JSON.stringify(schedules));
      const targetStaff = staffList.filter(s => s.cinema === targetCinema);
      
      if (targetStaff.length < 2) {
          alert('직원이 부족하여 스케줄을 생성할 수 없습니다. (최소 2명 필요)');
          setIsGenerating(false);
          setGeneratingTarget(null);
          return;
      }

      const balanceStats: Record<string, { OPEN: number, MIDDLE: number, CLOSE: number, WEEKEND: number }> = {};
      targetStaff.forEach(s => {
          balanceStats[s.id] = { OPEN: 0, MIDDLE: 0, CLOSE: 0, WEEKEND: 0 };
      });

      days.forEach((day, idx) => {
         const currentWeekIdx = Math.floor(idx / 7);
         const dKey = formatDateKey(day);
         const dayData = newSchedules[dKey] || {};
         const isTargetWeek = isWeekly && currentWeekIdx === targetWeekIdx;
         
         targetStaff.forEach(s => {
             const shiftData = dayData[s.id];
             if (shiftData && (!isTargetWeek || shiftData.isManual)) {
                 const shift = shiftData.value;
                 if (shift === 'OPEN' || shift === 'DUAL_OPEN') balanceStats[s.id].OPEN++;
                 if (shift === 'MIDDLE' || shift === 'DUAL_MIDDLE') balanceStats[s.id].MIDDLE++;
                 if (shift === 'CLOSE' || shift === 'DUAL_CLOSE') balanceStats[s.id].CLOSE++;
                 const isWE = day.getDay() === 0 || day.getDay() === 6 || !!HOLIDAYS[dKey];
                 if (isWE && (shift.includes('OPEN') || shift.includes('MIDDLE') || shift.includes('CLOSE'))) {
                     balanceStats[s.id].WEEKEND++;
                 }
             }
         });
      });

      for (let i = 0; i < days.length; i += 7) {
        const weekIdx = Math.floor(i / 7);
        if (isWeekly && weekIdx !== targetWeekIdx) continue;

        const weekIndices: number[] = [];
        for(let j=0; j<7; j++) {
            if(i+j < days.length) weekIndices.push(i+j);
        }
        
        const dailyMinReq = weekIndices.map(dayGlobalIdx => {
            const dKey = formatDateKey(days[dayGlobalIdx]);
            
            const targetManuals = targetStaff.map(s => newSchedules[dKey]?.[s.id]).filter(shift => shift?.isManual);
            let hasManualOpen = targetManuals.some(s => s?.value === 'OPEN');
            let hasManualClose = targetManuals.some(s => s?.value === 'CLOSE');

            if (targetCinema === 'OUTLET') {
                 const otherStaff = staffList.filter(s => s.cinema !== targetCinema);
                 otherStaff.forEach(s => {
                     const shift = newSchedules[dKey]?.[s.id];
                     if (shift?.isManual) {
                         if (shift.value === 'DUAL_OPEN') hasManualOpen = true;
                         if (shift.value === 'DUAL_CLOSE') hasManualClose = true;
                     }
                 });
            }
            
            const manualWorkerCount = targetManuals.filter(s => s?.value !== 'OFF').length;
            
            const neededAutoOpen = hasManualOpen ? 0 : 1;
            const neededAutoClose = hasManualClose ? 0 : 1;
            
            return manualWorkerCount + neededAutoOpen + neededAutoClose;
        });

        const dailyActiveWorkers = weekIndices.map(() => targetStaff.length);
        const plannedOffs: Record<string, number[]> = {};
        targetStaff.forEach(s => plannedOffs[s.id] = []);

        weekIndices.forEach((dayGlobalIdx, wLocalIdx) => {
            const dKey = formatDateKey(days[dayGlobalIdx]);
            targetStaff.forEach(s => {
                const manualShift = newSchedules[dKey]?.[s.id];
                if (manualShift?.isManual && manualShift.value === 'OFF') {
                    plannedOffs[s.id].push(wLocalIdx);
                    dailyActiveWorkers[wLocalIdx]--;
                }
            });
        });

        targetStaff.forEach(s => {
            const currentOffCount = plannedOffs[s.id].length;
            let needed = 2 - currentOffCount;
            if (needed <= 0) return;

            const busyIndices: number[] = [];
            weekIndices.forEach((dayGlobalIdx, wLocalIdx) => {
                const dKey = formatDateKey(days[dayGlobalIdx]);
                const manualShift = newSchedules[dKey]?.[s.id];
                if (manualShift?.isManual && manualShift.value !== 'OFF') {
                    busyIndices.push(wLocalIdx);
                }
            });

            let candidates = [0,1,2,3,4,5,6].filter(d => 
                !plannedOffs[s.id].includes(d) && !busyIndices.includes(d)
            );

            candidates.sort((a, b) => {
                const getPrevShift = (dayOffset: number) => {
                    const d = days[weekIndices[dayOffset]];
                    const prev = new Date(d); prev.setDate(prev.getDate()-1);
                    return newSchedules[formatDateKey(prev)]?.[s.id]?.value;
                };
                const prevA = getPrevShift(a);
                const prevB = getPrevShift(b);
                
                if (prevA === 'CLOSE' && prevB !== 'CLOSE') return -1;
                if (prevA !== 'CLOSE' && prevB === 'CLOSE') return 1;
                return Math.random() - 0.5;
            });

            for (const dayIdx of candidates) {
                if (needed <= 0) break;
                if (dailyActiveWorkers[dayIdx] > dailyMinReq[dayIdx]) {
                    plannedOffs[s.id].push(dayIdx);
                    dailyActiveWorkers[dayIdx]--;
                    needed--;
                }
            }
        });

        weekIndices.forEach((dayGlobalIdx, wLocalIdx) => { 
            const dateObj = days[dayGlobalIdx];
            const dateKey = formatDateKey(dateObj);
            const prevDate = new Date(dateObj);
            prevDate.setDate(prevDate.getDate() - 1);
            const prevKey = formatDateKey(prevDate);
            const prevSchedules = newSchedules[prevKey] || {};

            if (!newSchedules[dateKey]) newSchedules[dateKey] = {};

            let manualOpen = false;
            let manualClose = false;
            let availableStaff: Staff[] = [];

            targetStaff.forEach(s => {
                const shift = newSchedules[dateKey][s.id];
                if (shift?.isManual) {
                    if (shift.value === 'OPEN') manualOpen = true;
                    if (shift.value === 'CLOSE') manualClose = true;
                } else {
                    if (plannedOffs[s.id]?.includes(wLocalIdx)) {
                        newSchedules[dateKey][s.id] = { value: 'OFF', isManual: false };
                    } else {
                        availableStaff.push(s);
                    }
                }
            });

            if (targetCinema === 'OUTLET') {
                 const otherStaff = staffList.filter(s => s.cinema !== targetCinema);
                 otherStaff.forEach(s => {
                     const shift = newSchedules[dateKey]?.[s.id];
                     if (shift?.isManual) {
                         if (shift.value === 'DUAL_OPEN') manualOpen = true;
                         if (shift.value === 'DUAL_CLOSE') manualClose = true;
                     }
                 });
            }

            let needOpen = manualOpen ? 0 : 1;
            let needClose = manualClose ? 0 : 1;

            if (needOpen > 0 && availableStaff.length > 0) {
                const candidates = availableStaff.filter(s => prevSchedules[s.id]?.value !== 'CLOSE');
                const pool = candidates.length > 0 ? candidates : availableStaff;
                pool.sort((a, b) => balanceStats[a.id].OPEN - balanceStats[b.id].OPEN);
                
                const picked = pool[0];
                if (picked) {
                    newSchedules[dateKey][picked.id] = { value: 'OPEN', isManual: false };
                    balanceStats[picked.id].OPEN++;
                    availableStaff = availableStaff.filter(s => s.id !== picked.id);
                    needOpen--;
                }
            }

            if (needClose > 0 && availableStaff.length > 0) {
                availableStaff.sort((a, b) => {
                    const prevA = prevSchedules[a.id]?.value === 'CLOSE';
                    const prevB = prevSchedules[b.id]?.value === 'CLOSE';
                    if (prevA && !prevB) return -1;
                    if (!prevA && prevB) return 1;

                    return balanceStats[a.id].CLOSE - balanceStats[b.id].CLOSE;
                });
                
                const picked = availableStaff[0];
                if (picked) {
                    newSchedules[dateKey][picked.id] = { value: 'CLOSE', isManual: false };
                    balanceStats[picked.id].CLOSE++;
                    availableStaff = availableStaff.filter(s => s.id !== picked.id);
                    needClose--;
                }
            }

            availableStaff.forEach(s => {
                newSchedules[dateKey][s.id] = { value: 'MIDDLE', isManual: false };
                balanceStats[s.id].MIDDLE++;
            });

            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6 || !!HOLIDAYS[dateKey];
            if (isWeekend) {
                targetStaff.forEach(s => {
                    const val = newSchedules[dateKey][s.id]?.value;
                    if (val === 'OPEN' || val === 'MIDDLE' || val === 'CLOSE') {
                        balanceStats[s.id].WEEKEND++;
                    }
                });
            }
        });
      }

      setSchedules(newSchedules);
      setIsGenerating(false);
      setGeneratingTarget(null);
    }, 500);
  }, [currentDate, staffList, schedules]);

  const clearWeeklySchedule = useCallback((weekIdx: number, cinemaId: 'BUWON' | 'OUTLET') => {
    const days = getCinemaMonthRange(currentDate);
    const newSchedules = JSON.parse(JSON.stringify(schedules));
    
    const startIdx = weekIdx * 7;
    const endIdx = Math.min(startIdx + 7, days.length);
    
    for(let i = startIdx; i < endIdx; i++) {
        const dateKey = formatDateKey(days[i]);
        const daySchedule = newSchedules[dateKey];
        
        if (daySchedule) {
             Object.keys(daySchedule).forEach(staffId => {
                 const shift = daySchedule[staffId];
                 if (!shift.isManual) { 
                     const staff = staffList.find(s => s.id === staffId);
                     if (staff && staff.cinema === cinemaId) {
                         delete daySchedule[staffId];
                     }
                 }
             });
        }
    }
    setSchedules(newSchedules);
  }, [currentDate, schedules, staffList]);

  const clearWeeklyManualSchedule = useCallback((weekIdx: number, cinemaId: 'BUWON' | 'OUTLET') => {
    const days = getCinemaMonthRange(currentDate);
    const newSchedules = JSON.parse(JSON.stringify(schedules));
    
    const startIdx = weekIdx * 7;
    const endIdx = Math.min(startIdx + 7, days.length);
    
    for(let i = startIdx; i < endIdx; i++) {
        const dateKey = formatDateKey(days[i]);
        const daySchedule = newSchedules[dateKey];
        
        if (daySchedule) {
             Object.keys(daySchedule).forEach(staffId => {
                 const shift = daySchedule[staffId];
                 if (shift.isManual) {
                     const staff = staffList.find(s => s.id === staffId);
                     if (staff && staff.cinema === cinemaId) {
                         delete daySchedule[staffId];
                     }
                 }
             });
        }
    }
    setSchedules(newSchedules);
  }, [currentDate, schedules, staffList]);
  
  const handleWeeklyAutoClear = () => {
    if(weeklyClearTarget) {
      clearWeeklySchedule(weeklyClearTarget.weekIdx, weeklyClearTarget.cinemaId);
      setWeeklyClearTarget(null);
    }
  };

  const handleWeeklyManualClear = () => {
    if(weeklyClearTarget) {
      clearWeeklyManualSchedule(weeklyClearTarget.weekIdx, weeklyClearTarget.cinemaId);
      setWeeklyClearTarget(null);
    }
  };

  const stats = useMemo(() => {
    const days = getCinemaMonthRange(currentDate);
    const resultStats: StaffStats[] = [];

    staffList.forEach(s => {
      const homeCounts = { OPEN: 0, MIDDLE: 0, CLOSE: 0, OFF: 0, LEAVE: 0, weekendWork: 0 };
      const dualCounts = { OPEN: 0, MIDDLE: 0, CLOSE: 0, OFF: 0, LEAVE: 0, weekendWork: 0 };
      let hasDualWork = false;

      days.forEach(day => {
        const dateKey = formatDateKey(day);
        const shiftData = schedules[dateKey]?.[s.id];
        if (shiftData) {
            const shift = shiftData.value;
            const isWE = day.getDay() === 0 || day.getDay() === 6 || !!HOLIDAYS[dateKey];

            if (shift.startsWith('DUAL_')) {
                const norm = shift.replace('DUAL_', '') as 'OPEN'|'MIDDLE'|'CLOSE';
                
                if (s.cinema === 'BUWON') {
                    dualCounts[norm]++;
                    if (isWE) dualCounts.weekendWork++;
                    hasDualWork = true;
                } else {
                    homeCounts[norm]++;
                    if (isWE) homeCounts.weekendWork++;
                }
            } 
            else if (['OPEN', 'MIDDLE', 'CLOSE'].includes(shift)) {
                homeCounts[shift as 'OPEN'|'MIDDLE'|'CLOSE']++;
                if (isWE) homeCounts.weekendWork++;
            }
            else if (shift === 'OFF') homeCounts.OFF++;
            else if (shift === 'LEAVE') homeCounts.LEAVE++;
        }
      });

      resultStats.push({
          ...s,
          counts: homeCounts
      });

      if (hasDualWork && s.cinema === 'BUWON') {
          resultStats.push({
              id: `${s.id}_DUAL`,
              name: `${s.name} (겸직)`,
              position: s.position,
              cinema: 'OUTLET',
              counts: dualCounts
          });
      }
    });

    return resultStats;
  }, [schedules, staffList, currentDate]);

  const updateCinemaName = (id: string, newName: string) => {
    setCinemas(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
  };

  const handleSaveOperatingHours = (selectedDates: string[], range: string, openShift: string, closeShift: string) => {
     if(!opHoursModal.cinema) return;
     const cinemaId = opHoursModal.cinema.id;
     
     // Split range to get start/end for display
     const [start, end] = range.split('~').map(s => s.trim());

     setOperatingHours(prev => {
         const next = { ...prev };
         selectedDates.forEach(dateKey => {
             if (!next[dateKey]) next[dateKey] = {};
             next[dateKey][cinemaId] = { start, end, openShift, closeShift };
         });
         return next;
     });
  };

  const autoCalculateTimeRange = (input: string) => {
      if (!input) return input;
      if (input.includes('~')) return input;
      
      const match = input.match(/^(\d{1,2}):(\d{2})$/);
      if (match) {
          const h = parseInt(match[1], 10);
          const m = parseInt(match[2], 10);
          
          let endH = h + 9;
          if (endH >= 24) endH -= 24;

          const startStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          const endStr = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          return `${startStr}~${endStr}`;
      }
      return input;
  };

  const handleManualSave = (specificShiftId?: string) => {
    const targetShift = typeof specificShiftId === 'string' ? specificShiftId : tempSelectedShift;
    if (!manualModalData || !targetShift) return;
    const next = { ...schedules };
    if(!next[manualModalData.dateKey]) next[manualModalData.dateKey] = {};
    
    next[manualModalData.dateKey] = { ...next[manualModalData.dateKey] };
    const newShiftData: ShiftData = { 
        value: targetShift, 
        isManual: true 
    };

    const finalTime = autoCalculateTimeRange(customTime);
    if ((targetShift === 'MIDDLE' || targetShift === 'DUAL_MIDDLE') && finalTime) {
        newShiftData.shiftTime = finalTime;
    }

    next[manualModalData.dateKey][manualModalData.staff.id] = newShiftData;
    
    setSchedules(next);
    setManualModalData(null);
  };

  const handleManualDelete = () => {
    if (!manualModalData) return;
    const next = { ...schedules };
    if(next[manualModalData.dateKey]) {
        next[manualModalData.dateKey] = { ...next[manualModalData.dateKey] };
        delete next[manualModalData.dateKey][manualModalData.staff.id];
    }
    setSchedules(next);
    setManualModalData(null);
  };

  const handleConfirmAddShift = () => {
      if (!newShiftName.trim()) return;
      const id = 'CUSTOM_' + Math.random().toString(36).substr(2, 9).toUpperCase();
      const customShiftsCount = Object.keys(managedShifts).length - 5; 
      const colorIndex = customShiftsCount % CUSTOM_COLORS.length;
      const selectedColor = CUSTOM_COLORS[colorIndex];

      setManagedShifts(prev => ({
          ...prev,
          [id]: { id, label: newShiftName, color: selectedColor }
      }));
      setNewShiftName('');
      setIsAddingShift(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[#F1F5F9] text-slate-900 overflow-hidden">
      <nav className="shrink-0 bg-white border-b border-slate-200 shadow-sm z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md">
              <MonitorPlay size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900">근무 매니저 <span className="text-indigo-600">v2</span></h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Schedule System</p>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl">
             <button onClick={() => setActiveTab('calendar')} className={`flex items-center gap-2 px-6 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'calendar' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}><Calendar size={16}/> 근무표</button>
             <button onClick={() => setActiveTab('staff')} className={`flex items-center gap-2 px-6 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'staff' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}><Users size={16}/> 직원 정보</button>
             <button onClick={() => setActiveTab('leave')} className={`flex items-center gap-2 px-6 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'leave' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}><Plane size={16}/> 휴가 관리</button>
          </div>

          <div className="flex items-center gap-3">
             <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-1.5 hover:bg-slate-50 rounded-lg"><ChevronLeft size={16} /></button>
                <span className="text-sm font-black px-4 tabular-nums">{currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월</span>
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-1.5 hover:bg-slate-50 rounded-lg"><ChevronRight size={16} /></button>
             </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-hidden relative">
        <div className="h-full flex flex-col max-w-[1600px] mx-auto">
            {activeTab === 'calendar' ? (
                <MatrixView 
                    currentDate={currentDate} 
                    staffList={staffList} 
                    schedules={schedules} 
                    managedShifts={managedShifts} 
                    isGenerating={isGenerating} 
                    generatingTarget={generatingTarget} 
                    onRequestClear={() => setIsClearModalOpen(true)}
                    onRequestManualClear={() => setIsManualClearModalOpen(true)}
                    generateSchedule={generateSchedule} 
                    onOpenWeeklyClear={(weekIdx, cinemaId) => setWeeklyClearTarget({weekIdx, cinemaId})}
                    openManualModal={(dk, s, cs) => { 
                        setManualModalData({dateKey: dk, staff: s, currentShift: cs || undefined }); 
                        setTempSelectedShift(cs?.value || null); 
                        setIsAddingShift(false); 
                        setNewShiftName('');
                        setCustomTime(cs?.shiftTime || '');
                    }} 
                    stats={stats}
                    cinemas={cinemas}
                    onUpdateCinemaName={updateCinemaName}
                    operatingHours={operatingHours}
                    onUpdateOperatingHours={(dateKey, cinemaId, range) => { /* handled by modal now */ }}
                    onOpenOpHoursModal={(cinema) => setOpHoursModal({ isOpen: true, cinema })}
                />
            ) : activeTab === 'staff' ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <StaffManagement 
                        staffList={staffList} 
                        setStaffList={setStaffList} 
                        managedShifts={managedShifts} 
                        cinemas={cinemas}
                    />
                </div>
            ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                  <LeaveManagement
                      staffList={staffList}
                      leaveRecords={leaveRecords}
                      setLeaveRecords={setLeaveRecords}
                      annualConfig={annualConfig}
                      setAnnualConfig={setAnnualConfig}
                      currentYear={currentDate.getFullYear()}
                      cinemas={cinemas}
                  />
              </div>
            )}
        </div>
      </main>

      {/* Manual Edit Modal */}
      {manualModalData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
               <div>
                  <h3 className="text-lg font-bold text-slate-900">{manualModalData.staff.name}님 근무 설정</h3>
                  <p className="text-xs font-medium text-slate-400">{manualModalData.dateKey}</p>
               </div>
               <button onClick={() => setManualModalData(null)} className="p-2 hover:bg-slate-200 rounded-full transition"><X size={20}/></button>
            </div>
            <div className="p-6">
               {isAddingShift ? (
                 <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <label className="text-[10px] font-bold text-slate-400 mb-2 block">새 근무 유형 이름</label>
                    <div className="space-y-3">
                        <input 
                            autoFocus
                            type="text" 
                            value={newShiftName}
                            onChange={(e) => setNewShiftName(e.target.value)}
                            placeholder="예: 교육, 반차"
                            className="w-full px-3 py-3 text-sm font-bold rounded-xl border border-slate-200 outline-none focus:border-indigo-500 bg-white"
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirmAddShift()}
                        />
                        <div className="flex gap-2">
                            <button onClick={() => setIsAddingShift(false)} className="flex-1 py-3 bg-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-300 transition">취소</button>
                            <button onClick={handleConfirmAddShift} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition shadow-md">확인</button>
                        </div>
                    </div>
                 </div>
               ) : (
                 <>
                     <div className="grid grid-cols-3 gap-2 mb-4 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                        {(Object.entries(managedShifts) as [string, ShiftInfo][]).map(([key, shift]) => (
                            <button 
                              key={key} 
                              onClick={() => setTempSelectedShift(key)}
                              onDoubleClick={() => handleManualSave(key)}
                              className={`py-3 rounded-2xl text-[11px] font-black border transition-all relative ${tempSelectedShift === key ? 'ring-2 ring-indigo-500 border-indigo-500 z-10 ' + shift.color : 'bg-slate-50 text-slate-500 border-slate-100 opacity-60 hover:opacity-100'}`}
                            >
                              {shift.label}
                              {tempSelectedShift === key && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>}
                            </button>
                        ))}
                     </div>
                     
                     {(tempSelectedShift === 'MIDDLE' || tempSelectedShift === 'DUAL_MIDDLE') && (
                        <div className="mb-4 bg-orange-50 p-3 rounded-xl border border-orange-100">
                            <label className="text-[10px] font-bold text-orange-700 mb-1 block">미들 근무 시간 입력</label>
                            <input 
                                type="text" 
                                value={customTime}
                                onChange={(e) => setCustomTime(e.target.value)}
                                onBlur={() => setCustomTime(autoCalculateTimeRange(customTime))}
                                placeholder="예: 13:00 (자동완성)"
                                className="w-full p-2 text-sm font-bold border border-orange-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-200 text-orange-900 placeholder:text-orange-300"
                            />
                        </div>
                     )}
                 </>
               )}
               
               {!isAddingShift && (
                   <div className="flex gap-2">
                      <button onClick={handleManualDelete} className="px-4 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-red-100 hover:text-red-600 transition-colors flex items-center justify-center">
                          <Trash2 size={20}/>
                      </button>
                      <button onClick={() => setIsAddingShift(true)} className="px-4 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-indigo-100 hover:text-indigo-600 transition-colors flex items-center justify-center" title="근무 유형 추가">
                          <Plus size={20}/>
                      </button>
                      <button onClick={() => handleManualSave()} disabled={!tempSelectedShift} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                          <Check size={18}/> 선택 적용
                      </button>
                   </div>
               )}
               <p className="text-center text-[10px] text-slate-400 mt-4">
                   * 근무 버튼을 <span className="text-indigo-600 font-bold">더블 클릭</span>하면 즉시 적용됩니다.
               </p>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Auto Clear Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl p-6 text-center animate-in zoom-in-95">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={24}/>
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">월간 자동 생성 스케줄 삭제</h3>
                <p className="text-xs text-slate-500 mb-6 font-medium">
                    자동으로 생성된 근무만 삭제되며,<br/>수동으로 설정한 근무는 유지됩니다.
                </p>
                <div className="flex gap-2">
                    <button onClick={() => setIsClearModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">취소</button>
                    <button 
                        onClick={() => {
                            const days = getCinemaMonthRange(currentDate);
                            const newSchedules = { ...schedules };
                            days.forEach(d => {
                                const dk = formatDateKey(d);
                                if(newSchedules[dk]) {
                                    Object.keys(newSchedules[dk]).forEach(sid => {
                                        if(!newSchedules[dk][sid].isManual) delete newSchedules[dk][sid];
                                    });
                                }
                            });
                            setSchedules(newSchedules);
                            setIsClearModalOpen(false);
                        }} 
                        className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600"
                    >
                        삭제하기
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Monthly Manual Clear Modal */}
      {isManualClearModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl p-6 text-center animate-in zoom-in-95">
                <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Eraser size={24}/>
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">월간 수동 설정 스케줄 삭제</h3>
                <p className="text-xs text-slate-500 mb-6 font-medium">
                    수동으로 설정한 근무만 삭제되며,<br/>자동 생성된 근무는 유지됩니다.
                </p>
                <div className="flex gap-2">
                    <button onClick={() => setIsManualClearModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">취소</button>
                    <button 
                        onClick={() => {
                             const days = getCinemaMonthRange(currentDate);
                             const newSchedules = { ...schedules };
                             days.forEach(d => {
                                 const dk = formatDateKey(d);
                                 if(newSchedules[dk]) {
                                     Object.keys(newSchedules[dk]).forEach(sid => {
                                         if(newSchedules[dk][sid].isManual) delete newSchedules[dk][sid];
                                     });
                                 }
                             });
                             setSchedules(newSchedules);
                             setIsManualClearModalOpen(false);
                        }} 
                        className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600"
                    >
                        삭제하기
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Weekly Clear Modal */}
      {weeklyClearTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl p-6 text-center animate-in zoom-in-95">
                <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={24}/>
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">
                    {weeklyClearTarget.weekIdx + 1}주차 {weeklyClearTarget.cinemaId === 'BUWON' ? '김해부원' : '김해아울렛'} 스케줄 삭제
                </h3>
                <p className="text-xs text-slate-500 mb-6 font-medium">
                    어떤 스케줄을 삭제하시겠습니까?
                </p>
                <div className="flex flex-col gap-2">
                    <button 
                        onClick={handleWeeklyAutoClear}
                        className="w-full py-3 bg-indigo-50 text-indigo-700 rounded-xl font-bold hover:bg-indigo-100 border border-indigo-100 flex items-center justify-center gap-2"
                    >
                        <Sparkles size={16}/> 자동 생성된 스케줄만 삭제
                    </button>
                    <button 
                        onClick={handleWeeklyManualClear}
                        className="w-full py-3 bg-orange-50 text-orange-700 rounded-xl font-bold hover:bg-orange-100 border border-orange-100 flex items-center justify-center gap-2"
                    >
                        <Eraser size={16}/> 수동 설정한 스케줄만 삭제
                    </button>
                    <button onClick={() => setWeeklyClearTarget(null)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 mt-2">
                        취소
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Operating Hours Modal */}
      {opHoursModal.isOpen && opHoursModal.cinema && (
          <OperatingHoursModal
              isOpen={opHoursModal.isOpen}
              onClose={() => setOpHoursModal({ isOpen: false, cinema: null })}
              cinema={opHoursModal.cinema}
              currentDate={currentDate}
              onSave={handleSaveOperatingHours}
          />
      )}
    </div>
  );
}
