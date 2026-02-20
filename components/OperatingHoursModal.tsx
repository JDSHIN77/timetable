
import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Calendar, Clock, CheckCircle2, Settings2, ArrowRight } from 'lucide-react';
import { Cinema } from '../types';
import { formatDateKey } from '../utils/helpers';
import { HOLIDAYS } from '../constants';

interface OperatingHoursModalProps {
    isOpen: boolean;
    onClose: () => void;
    cinema: Cinema;
    currentDate: Date;
    onSave: (dates: string[], timeRange: string, openShiftStr: string, closeShiftStr: string) => void;
}

const timeToMin = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
};

const minToTime = (min: number) => {
    let h = Math.floor(min / 60);
    const m = min % 60;
    if (h < 0) h += 24; 
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const OperatingHoursModal: React.FC<OperatingHoursModalProps> = ({
    isOpen, onClose, cinema, currentDate, onSave
}) => {
    const [timeRange, setTimeRange] = useState('09:00~22:00');
    const [prepTimeMin, setPrepTimeMin] = useState(90); // 1.5 hours default
    const [workDurationHr, setWorkDurationHr] = useState(9); // 9 hours default
    const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
    
    // Generate Standard Calendar Days (Sun-Sat)
    const days = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const startDow = firstDay.getDay(); // 0=Sun
        
        const current = new Date(firstDay);
        current.setDate(current.getDate() - startDow);
        
        const arr = [];
        // 6 weeks * 7 days = 42 days to ensure full coverage
        for(let i=0; i<42; i++) {
            arr.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        return arr;
    }, [currentDate]);

    useEffect(() => {
        if (isOpen) {
            setSelectedDates(new Set());
            setTimeRange('09:00~22:00');
            setPrepTimeMin(90);
            setWorkDurationHr(9);
        }
    }, [isOpen, currentDate]);

    const calculatedTimes = useMemo(() => {
        if (!timeRange.includes('~')) return { open: '-', close: '-' };
        const [start, end] = timeRange.split('~').map(s => s.trim());
        if (!start || !end || !start.includes(':') || !end.includes(':')) return { open: '-', close: '-' };

        try {
            const startMin = timeToMin(start);
            const endMin = timeToMin(end);
            const durationMin = workDurationHr * 60;

            // Open: Start Time - Prep Time ~ + Duration
            const openStart = startMin - prepTimeMin;
            const openEnd = openStart + durationMin;
            const openStr = `${minToTime(openStart)}~${minToTime(openEnd)}`;

            // Close: (End Time + 30min) - Duration ~ (End Time + 30min)
            const closeEnd = endMin + 30; // Cleanup time added to end
            const closeStart = closeEnd - durationMin;
            const closeStr = `${minToTime(closeStart)}~${minToTime(closeEnd)}`;

            return { open: openStr, close: closeStr };
        } catch (e) {
            return { open: '-', close: '-' };
        }
    }, [timeRange, prepTimeMin, workDurationHr]);

    if (!isOpen) return null;

    const toggleDate = (dateKey: string) => {
        const newSet = new Set(selectedDates);
        if (newSet.has(dateKey)) {
            newSet.delete(dateKey);
        } else {
            newSet.add(dateKey);
        }
        setSelectedDates(newSet);
    };

    const selectAll = () => {
        const newSet = new Set<string>();
        days.forEach(d => {
            if (d.getMonth() === currentDate.getMonth()) {
                newSet.add(formatDateKey(d));
            }
        });
        setSelectedDates(newSet);
    };

    const selectWeekdays = () => {
        const newSet = new Set<string>();
        days.forEach(d => {
            if (d.getMonth() === currentDate.getMonth()) {
                const day = d.getDay();
                const dateKey = formatDateKey(d);
                if (day !== 0 && day !== 6 && !HOLIDAYS[dateKey]) {
                    newSet.add(dateKey);
                }
            }
        });
        setSelectedDates(newSet);
    };

    const selectWeekends = () => {
        const newSet = new Set<string>();
        days.forEach(d => {
            if (d.getMonth() === currentDate.getMonth()) {
                const day = d.getDay();
                const dateKey = formatDateKey(d);
                if (day === 0 || day === 6 || !!HOLIDAYS[dateKey]) {
                    newSet.add(dateKey);
                }
            }
        });
        setSelectedDates(newSet);
    };

    const handleSave = () => {
        if (selectedDates.size === 0) {
            alert('날짜를 선택해주세요.');
            return;
        }
        onSave(Array.from(selectedDates), timeRange, calculatedTimes.open, calculatedTimes.close);
        onClose();
    };

    const isBuwon = cinema.id === 'BUWON';

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className={`p-6 flex justify-between items-center text-white shrink-0 ${isBuwon ? 'bg-indigo-600' : 'bg-orange-500'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <Clock size={24} className="text-white"/>
                        </div>
                        <div>
                            <h3 className="text-xl font-black">{cinema.name} 영업시간 설정</h3>
                            <p className="text-xs font-medium opacity-80">영업시간을 입력하면 근무 시간이 자동 계산됩니다.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition"><X size={24}/></button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                    {/* Settings Section */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
                            <div className="flex-1 w-full">
                                <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">영업 시간 (오픈~마감)</label>
                                <input 
                                    type="text" 
                                    value={timeRange}
                                    onChange={(e) => setTimeRange(e.target.value)}
                                    className={`w-full text-2xl font-black text-center p-3 rounded-xl border-2 outline-none focus:ring-4 transition-all ${isBuwon ? 'border-indigo-100 focus:border-indigo-500 focus:ring-indigo-100 text-indigo-900' : 'border-orange-100 focus:border-orange-500 focus:ring-orange-100 text-orange-900'}`}
                                    placeholder="09:00~22:00"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                             <div>
                                 <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block flex items-center gap-1"><Settings2 size={10}/> 오픈 준비 (분)</label>
                                 <input 
                                    type="number" 
                                    value={prepTimeMin}
                                    onChange={(e) => setPrepTimeMin(Number(e.target.value))}
                                    className="w-full p-2 text-sm font-bold bg-white border border-slate-200 rounded-lg text-center"
                                 />
                             </div>
                             <div>
                                 <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block flex items-center gap-1"><Settings2 size={10}/> 근무 시간 (시간)</label>
                                 <input 
                                    type="number" 
                                    value={workDurationHr}
                                    onChange={(e) => setWorkDurationHr(Number(e.target.value))}
                                    className="w-full p-2 text-sm font-bold bg-white border border-slate-200 rounded-lg text-center"
                                 />
                             </div>
                        </div>

                        {/* Preview */}
                        <div className="flex gap-4 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex-1 text-center border-r border-slate-100">
                                <div className="text-[10px] font-bold text-blue-500 mb-1">오픈 근무</div>
                                <div className="text-sm font-black text-slate-800">{calculatedTimes.open}</div>
                            </div>
                            <div className="flex-1 text-center">
                                <div className="text-[10px] font-bold text-purple-500 mb-1">마감 근무</div>
                                <div className="text-sm font-black text-slate-800">{calculatedTimes.close}</div>
                            </div>
                        </div>
                    </div>

                    {/* Date Selection Grid */}
                    <div>
                        <div className="mb-3 flex justify-between items-center">
                            <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                <Calendar size={16}/> 날짜 선택 ({selectedDates.size}일)
                            </h4>
                            <div className="flex gap-1.5">
                                <button onClick={selectAll} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold">전체</button>
                                <button onClick={selectWeekdays} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-[10px] font-bold">평일</button>
                                <button onClick={selectWeekends} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[10px] font-bold">주말/공휴</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-2">
                            {['일','월','화','수','목','금','토'].map((d, i) => (
                                <div key={i} className={`text-center text-[10px] font-black pb-2 ${i===0 ? 'text-red-500' : i===6 ? 'text-blue-500' : 'text-slate-400'}`}>{d}</div>
                            ))}
                            {days.map((date, idx) => {
                                const dateKey = formatDateKey(date);
                                const isSelected = selectedDates.has(dateKey);
                                const dayNum = date.getDate();
                                const dayOfWeek = date.getDay();
                                const isCurrentMonth = date.getMonth() === currentDate.getMonth();

                                const isHoliday = !!HOLIDAYS[dateKey];
                                const isSun = dayOfWeek === 0;
                                const isSat = dayOfWeek === 6;

                                const isRed = isSun || isHoliday;
                                const isBlue = !isRed && isSat;
                                const isToday = new Date().toLocaleDateString() === date.toLocaleDateString();

                                return (
                                    <button
                                        key={dateKey}
                                        onClick={() => toggleDate(dateKey)}
                                        className={`
                                            relative p-2 rounded-xl border-2 flex flex-col items-center justify-center min-h-[50px] transition-all duration-200
                                            ${!isCurrentMonth ? 'opacity-40 grayscale' : ''}
                                            ${isSelected 
                                                ? isBuwon 
                                                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
                                                    : 'bg-orange-50 border-orange-500 text-orange-700'
                                                : 'bg-white border-slate-100 hover:border-slate-300'
                                            }
                                        `}
                                    >
                                        <span className={`text-sm font-black ${isSelected ? '' : isRed ? 'text-red-500' : isBlue ? 'text-blue-500' : 'text-slate-600'}`}>{dayNum}</span>
                                        {holidayName(dateKey) && <span className="text-[8px] bg-red-100 text-red-600 px-1 rounded-sm mt-0.5 whitespace-nowrap overflow-hidden max-w-full">{holidayName(dateKey)}</span>}
                                        {isSelected && <CheckCircle2 size={14} className={`absolute top-1 right-1 ${isBuwon ? 'text-indigo-500' : 'text-orange-500'}`}/>}
                                        {isToday && <span className="absolute bottom-1 right-1 text-[8px] font-bold bg-slate-800 text-white px-1 rounded">오늘</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition">취소</button>
                    <button onClick={handleSave} className={`flex-1 py-3 text-white rounded-xl font-bold transition shadow-lg flex items-center justify-center gap-2 ${isBuwon ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'}`}>
                        <Check size={18}/> {selectedDates.size}일 적용하기
                    </button>
                </div>
            </div>
        </div>
    );
};

// Helper for displaying holiday name in modal if needed
const holidayName = (dateKey: string) => {
    return HOLIDAYS[dateKey];
}
