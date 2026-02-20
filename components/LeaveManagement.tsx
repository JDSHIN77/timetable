
import React, { useState, useEffect, useMemo } from 'react';
import { Staff, LeaveRecord, LeaveCategory, AnnualLeaveConfig, Cinema } from '../types';
import { generateId } from '../utils/helpers';
import { HOLIDAYS } from '../constants';
import { 
  Plane, Gift, Briefcase, CalendarClock, HeartHandshake, 
  Medal, Plus, Trash2, X, CheckCircle2, BarChart3, User, 
  Calendar as CalendarIcon, PieChart, ShieldCheck, Palmtree, Users,
  Building2, ShoppingBag, Clock, MoreHorizontal, AlertCircle, ChevronRight, Search
} from 'lucide-react';

interface LeaveManagementProps {
    staffList: Staff[];
    leaveRecords: LeaveRecord[];
    setLeaveRecords: React.Dispatch<React.SetStateAction<LeaveRecord[]>>;
    annualConfig: AnnualLeaveConfig;
    setAnnualConfig: (config: AnnualLeaveConfig) => void;
    currentYear: number;
    cinemas: Cinema[];
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
    'ANNUAL': '연차',
    'SUBSTITUTE': '대체휴무',
    'REGULAR': '정기휴가',
    'FAMILY': '경조사',
    'LONG_SERVICE': '근속휴가'
};

export const LeaveManagement: React.FC<LeaveManagementProps> = ({
    staffList,
    leaveRecords,
    setLeaveRecords,
    annualConfig,
    setAnnualConfig,
    currentYear,
    cinemas
}) => {
    const [selectedStaffId, setSelectedStaffId] = useState<string>(staffList[0]?.id || '');
    const selectedStaff = staffList.find(s => s.id === selectedStaffId) || staffList[0];

    // Modal State for Manager Batch Add
    const [isBatchAddModalOpen, setIsBatchAddModalOpen] = useState(false);
    const [batchAddMonth, setBatchAddMonth] = useState<number | null>(null);
    const [batchAddMemo, setBatchAddMemo] = useState('');

    // Automatically populate Holidays for the selected staff and CURRENT YEAR
    useEffect(() => {
        if (!selectedStaffId) return;
        
        const newRecords: LeaveRecord[] = [];
        
        Object.entries(HOLIDAYS).forEach(([date, name]) => {
            if (!date.startsWith(String(currentYear))) return;

            const month = parseInt(date.split('-')[1], 10);
            const memo = `${parseInt(date.split('-')[1])}.${parseInt(date.split('-')[2])} ${name}`;

            const exists = leaveRecords.some(r => 
                r.staffId === selectedStaffId && 
                r.type === 'SUBSTITUTE' && 
                r.year === currentYear &&
                r.memo === memo
            );

            if (!exists) {
                newRecords.push({
                    id: generateId(),
                    staffId: selectedStaffId,
                    type: 'SUBSTITUTE',
                    date: '',
                    days: 1, 
                    memo: memo,
                    createdAt: Date.now(),
                    targetMonth: month,
                    year: currentYear,
                    refDate: date
                });
            }
        });

        if (newRecords.length > 0) {
            setLeaveRecords(prev => [...prev, ...newRecords]);
        }
    }, [selectedStaffId, currentYear]); 

    // Stats Calculation
    const employeeStats = useMemo(() => staffList.map(emp => {
        const records = leaveRecords.filter(r => r.staffId === emp.id);
        
        // Annual Stats
        const usedAnnual = records.filter(r => r.type === 'ANNUAL').reduce((acc, r) => acc + r.days, 0);
        const totalAnnual = annualConfig[emp.id] || 15;
        const totalQuota = totalAnnual;
        const annualRate = totalQuota > 0 ? Math.round((usedAnnual / totalQuota) * 100) : 0;

        // Substitute Stats (Current Year)
        const subRecords = records.filter(r => {
             if (r.type !== 'SUBSTITUTE') return false;
             // Ensure we count records belonging to current year
             return r.year === currentYear || (r.date && r.date.startsWith(String(currentYear)));
        });
        const totalSub = subRecords.length;
        const usedSub = subRecords.filter(r => r.date && r.date !== '').length;
        const subRate = totalSub > 0 ? Math.round((usedSub / totalSub) * 100) : 0;

        return {
            ...emp,
            stats: {
                annual: { used: usedAnnual, total: totalAnnual, rate: annualRate },
                substitute: { used: usedSub, total: totalSub, rate: subRate }
            }
        };
    }), [staffList, leaveRecords, annualConfig, currentYear]);

    // Cinema-specific Total Stats
    const cinemaTotalStats = useMemo(() => {
        const stats: Record<string, { annualUsed: number, annualTotal: number, subUsed: number, subTotal: number }> = {};
        
        cinemas.forEach(c => {
             stats[c.id] = { annualUsed: 0, annualTotal: 0, subUsed: 0, subTotal: 0 };
        });

        employeeStats.forEach(emp => {
             const cId = emp.cinema;
             if(stats[cId]) {
                 stats[cId].annualUsed += emp.stats.annual.used;
                 stats[cId].annualTotal += emp.stats.annual.total;
                 stats[cId].subUsed += emp.stats.substitute.used;
                 stats[cId].subTotal += emp.stats.substitute.total;
             }
        });
        
        return stats;
    }, [employeeStats, cinemas]);

    const handleUpdateAnnualTotal = (val: number) => {
        if (selectedStaff) {
            setAnnualConfig({ ...annualConfig, [selectedStaff.id]: val });
        }
    };

    const addRecord = (type: LeaveCategory, days: number, date: string = '', memo: string = '', targetMonth?: number) => {
        if (!selectedStaff) return;

        if (selectedStaff.position === '점장' && type === 'SUBSTITUTE') {
            setBatchAddMonth(targetMonth || null);
            setBatchAddMemo('');
            setIsBatchAddModalOpen(true);
        } else {
            const newRecord: LeaveRecord = {
                id: generateId(),
                staffId: selectedStaff.id,
                type,
                date,
                days,
                memo,
                createdAt: Date.now(),
                targetMonth,
                year: currentYear
            };
            setLeaveRecords(prev => [...prev, newRecord]);
        }
    };

    const confirmBatchAdd = () => {
        if (batchAddMonth === null) return;
        
        const timestamp = Date.now();
        const newRecords = staffList.map((staff, idx) => ({
            id: generateId() + idx, 
            staffId: staff.id,
            type: 'SUBSTITUTE' as LeaveCategory,
            date: '',
            days: 1,
            memo: batchAddMemo,
            createdAt: timestamp,
            targetMonth: batchAddMonth,
            year: currentYear
        }));
        setLeaveRecords(prev => [...prev, ...newRecords]);
        setIsBatchAddModalOpen(false);
        setBatchAddMemo('');
    };

    const updateRecord = (id: string, field: keyof LeaveRecord, value: any) => {
        setLeaveRecords(leaveRecords.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const deleteRecord = (id: string) => {
        setLeaveRecords(leaveRecords.filter(r => r.id !== id));
    };

    const getAnnualBuckets = () => {
        if (!selectedStaff) return [];
        const records = leaveRecords
            .filter(r => r.staffId === selectedStaff.id && r.type === 'ANNUAL')
            .sort((a, b) => a.createdAt - b.createdAt);
            
        const totalQuota = annualConfig[selectedStaff.id] || 15;
        
        const buckets: { index: number, records: LeaveRecord[], remaining: number }[] = [];
        for(let i=0; i<totalQuota; i++) {
            buckets.push({ index: i, records: [], remaining: 100 });
        }

        records.forEach(record => {
            const size = Math.round(record.days * 100);
            const target = buckets.find(b => b.remaining >= size);
            if (target) {
                target.records.push(record);
                target.remaining -= size;
            } else {
                if(buckets.length > 0) {
                     buckets[buckets.length-1].records.push(record);
                }
            }
        });

        return buckets;
    };

    const annualBuckets = getAnnualBuckets();
    const currentStats = employeeStats.find(e => e.id === selectedStaffId)?.stats;

    return (
        <div className="p-6 max-w-[1600px] mx-auto flex flex-col space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Header & Stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Plane className="text-indigo-600" /> 휴가 관리
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">직원별 연차 및 대체휴무 현황을 관리합니다.</p>
                </div>
                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm self-start">
                    {cinemas.map(c => (
                        <div key={c.id} className="px-3 py-1.5 border-r last:border-0 border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase truncate max-w-[60px]">{c.name}</span>
                            <span className={`text-sm font-black ${c.id === 'BUWON' ? 'text-indigo-600' : 'text-orange-600'}`}>{staffList.filter(s => s.cinema === c.id).length}명</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cinema Status Dashboards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cinemas.map(cinema => {
                    const stats = cinemaTotalStats[cinema.id];
                    const annualRate = stats.annualTotal > 0 ? Math.round((stats.annualUsed / stats.annualTotal) * 100) : 0;
                    const subRate = stats.subTotal > 0 ? Math.round((stats.subUsed / stats.subTotal) * 100) : 0;
                    const isBuwon = cinema.id === 'BUWON';
                    
                    return (
                        <div key={cinema.id} className={`rounded-3xl p-6 border shadow-sm relative overflow-hidden ${isBuwon ? 'bg-white border-indigo-100' : 'bg-white border-orange-100'}`}>
                            {/* Background Icon */}
                            <div className={`absolute top-0 right-0 p-4 opacity-5 ${isBuwon ? 'text-indigo-900' : 'text-orange-900'}`}>
                                <PieChart size={120} />
                            </div>
                            
                            {/* Header */}
                            <div className="flex items-center gap-3 mb-6 relative z-10">
                                <div className={`p-2.5 rounded-xl shadow-md text-white ${isBuwon ? 'bg-indigo-600' : 'bg-orange-500'}`}>
                                    <BarChart3 size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">{cinema.name} 누계 현황</h3>
                                    <p className="text-xs font-medium text-slate-500">지점 통합 소진율</p>
                                </div>
                            </div>
                            
                            <div className="space-y-5 relative z-10">
                                 {/* Annual Bar */}
                                 <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs font-bold text-slate-500">연차 통합 소진율</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-black text-slate-800">{annualRate}%</span>
                                            <span className="text-xs font-bold text-slate-400">({stats.annualUsed}/{stats.annualTotal})</span>
                                        </div>
                                    </div>
                                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                        <div 
                                            className={`h-full rounded-full shadow-sm transition-all duration-1000 ease-out ${isBuwon ? 'bg-gradient-to-r from-slate-700 to-slate-900' : 'bg-gradient-to-r from-slate-700 to-slate-900'}`} 
                                            style={{ width: `${Math.min(annualRate, 100)}%` }}
                                        ></div>
                                    </div>
                                 </div>

                                 {/* Substitute Bar */}
                                 <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs font-bold text-slate-500">대휴 통합 소진율</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className={`text-2xl font-black ${isBuwon ? 'text-indigo-600' : 'text-orange-600'}`}>{subRate}%</span>
                                            <span className="text-xs font-bold text-slate-400">({stats.subUsed}/{stats.subTotal})</span>
                                        </div>
                                    </div>
                                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                        <div 
                                            className={`h-full rounded-full shadow-sm transition-all duration-1000 ease-out ${isBuwon ? 'bg-gradient-to-r from-indigo-500 to-purple-600' : 'bg-gradient-to-r from-orange-400 to-red-500'}`} 
                                            style={{ width: `${Math.min(subRate, 100)}%` }}
                                        ></div>
                                    </div>
                                 </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Unified Status Dashboard (Staff Selector) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cinemas.map(cinema => {
                    const cStaff = employeeStats.filter(s => s.cinema === cinema.id);
                    const isBuwon = cinema.id === 'BUWON';
                    const themeColor = isBuwon ? 'indigo' : 'orange';
                    
                    return (
                         <div key={cinema.id} className={`rounded-3xl p-5 border ${isBuwon ? 'bg-indigo-50/50 border-indigo-100' : 'bg-orange-50/50 border-orange-100'}`}>
                            {/* Header for Cinema Column */}
                            <div className="flex items-center justify-between mb-4 px-1">
                                <div className="flex items-center gap-2">
                                     <div className={`w-2 h-2 rounded-full ${isBuwon ? 'bg-indigo-600' : 'bg-orange-600'}`}></div>
                                     <h3 className={`text-sm font-black ${isBuwon ? 'text-indigo-900' : 'text-orange-900'}`}>{cinema.name}</h3>
                                </div>
                                <span className="text-[10px] text-slate-400 font-bold bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-sm">{cStaff.length}명</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {cStaff.map(staff => {
                                    const isSelected = selectedStaffId === staff.id;
                                    
                                    return (
                                        <button
                                            key={staff.id}
                                            onClick={() => setSelectedStaffId(staff.id)}
                                            className={`relative text-left w-full bg-white rounded-2xl p-4 transition-all duration-200 group ${
                                                isSelected 
                                                ? `ring-2 ring-${themeColor}-500 shadow-lg shadow-${themeColor}-100 scale-[1.02] z-10` 
                                                : 'border border-slate-100 hover:border-slate-300 hover:shadow-md'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border mb-1 inline-block ${isBuwon ? 'text-indigo-600 bg-indigo-50 border-indigo-100' : 'text-orange-600 bg-orange-50 border-orange-100'}`}>
                                                        {staff.position}
                                                    </span>
                                                    <div className="text-sm font-black text-slate-800">{staff.name}</div>
                                                </div>
                                                {isSelected && <CheckCircle2 size={16} className={isBuwon ? 'text-indigo-500' : 'text-orange-500'} />}
                                            </div>

                                            <div className="space-y-2.5">
                                                {/* Annual Progress */}
                                                <div>
                                                    <div className="flex justify-between items-end mb-1">
                                                        <span className="text-[9px] font-bold text-slate-400">연차</span>
                                                        <span className={`text-[9px] font-black ${isBuwon ? 'text-indigo-600' : 'text-orange-600'}`}>
                                                            {staff.stats.annual.rate}%
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-500 ${isBuwon ? 'bg-indigo-500' : 'bg-orange-500'}`} 
                                                            style={{ width: `${Math.min(staff.stats.annual.rate, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>

                                                {/* Substitute Progress */}
                                                <div>
                                                    <div className="flex justify-between items-end mb-1">
                                                        <span className="text-[9px] font-bold text-slate-400">대휴</span>
                                                        <span className={`text-[9px] font-black ${isBuwon ? 'text-indigo-400' : 'text-orange-400'}`}>
                                                            {staff.stats.substitute.rate}%
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-500 ${isBuwon ? 'bg-indigo-300' : 'bg-orange-300'}`} 
                                                            style={{ width: `${Math.min(staff.stats.substitute.rate, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                         </div>
                    );
                })}
            </div>

            {/* Main Content: Selected Staff Details */}
            {selectedStaff && currentStats ? (
                <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
                    {/* Detail Header */}
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 text-slate-800 flex items-center justify-center font-black text-2xl shadow-sm">
                                {selectedStaff.name[0]}
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                    {selectedStaff.name} <span className="text-sm font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{currentYear}년</span>
                                </h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${selectedStaff.cinema === 'BUWON' ? 'text-indigo-600 bg-indigo-50 border-indigo-100' : 'text-orange-600 bg-orange-50 border-orange-100'}`}>
                                        {selectedStaff.cinema === 'BUWON' ? '김해부원' : '김해아울렛'}
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border text-slate-500 bg-white border-slate-200">{selectedStaff.position}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm group hover:border-indigo-300 transition-colors cursor-text">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">연차 한도</span>
                                <input 
                                    type="number" 
                                    value={currentStats.annual.total} 
                                    onChange={(e) => handleUpdateAnnualTotal(parseInt(e.target.value) || 0)} 
                                    className="w-10 font-black text-center focus:ring-0 outline-none border-none p-0 text-indigo-600 text-base bg-transparent" 
                                />
                                <span className="text-xs text-slate-400 font-bold">일</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-10">
                        {/* 1. Annual Leave */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><CalendarIcon size={16}/></div>
                                <h3 className="text-sm font-black text-slate-800">연차 상세 기록</h3>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                {annualBuckets.map((bucket) => (
                                    <div key={bucket.index} className="bg-slate-50 border border-slate-200 rounded-xl p-3 min-h-[150px] flex flex-col relative group hover:bg-white hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase">{bucket.index + 1}일차</span>
                                            {bucket.remaining >= 25 && (
                                                <div className="opacity-0 group-hover:opacity-100 flex flex-col gap-1 absolute right-2 top-2 z-10 bg-white/95 p-1.5 rounded-lg border border-slate-100 shadow-sm">
                                                    {bucket.remaining >= 100 && <button onClick={() => addRecord('ANNUAL', 1)} className="text-[9px] bg-slate-50 border px-2 py-1 rounded font-bold hover:bg-indigo-600 hover:text-white mb-0.5 whitespace-nowrap">1.0 연차</button>}
                                                    {bucket.remaining >= 50 && <button onClick={() => addRecord('ANNUAL', 0.5)} className="text-[9px] bg-slate-50 border px-2 py-1 rounded font-bold hover:bg-emerald-500 hover:text-white mb-0.5 whitespace-nowrap">0.5 반차</button>}
                                                    <button onClick={() => addRecord('ANNUAL', 0.25)} className="text-[9px] bg-slate-50 border px-2 py-1 rounded font-bold hover:bg-orange-400 hover:text-white whitespace-nowrap">0.25 반반차</button>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex-1 flex flex-col gap-1.5 w-full">
                                            {bucket.records.map(r => {
                                                const heightPercent = r.days * 100;
                                                let styleClass = 'bg-indigo-100 border-indigo-200 text-indigo-700';
                                                let label = '연차';
                                                if(r.days === 0.5) { styleClass = 'bg-emerald-100 border-emerald-200 text-emerald-700'; label = '반차'; }
                                                else if (r.days === 0.25) { styleClass = 'bg-orange-100 border-orange-200 text-orange-700'; label = '반반차'; }

                                                return (
                                                    <div key={r.id} className={`w-full rounded-lg border flex flex-col justify-center px-2 py-1 relative group/item transition-all ${styleClass}`} style={{ minHeight: r.days === 0.25 ? '32px' : 'auto', flex: r.days }}>
                                                        <button onClick={() => deleteRecord(r.id)} className="absolute top-0.5 right-0.5 opacity-0 group-hover/item:opacity-100 text-slate-400 hover:text-rose-500 p-0.5 z-10"><X size={12}/></button>
                                                        <span className="text-[9px] font-black opacity-70 leading-none mb-0.5">{label}</span>
                                                        <input type="date" value={r.date} onChange={(e) => updateRecord(r.id, 'date', e.target.value)} className="w-full text-[10px] font-bold border-none p-0 focus:ring-0 bg-transparent text-slate-800 tracking-tighter h-4" />
                                                    </div>
                                                );
                                            })}
                                            {bucket.records.length === 0 && <div className="flex-1 flex items-center justify-center"><div className="w-full h-full border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center"><span className="text-[10px] text-slate-300 font-bold">미사용</span></div></div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 2. Substitute Leave */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"><Clock size={16}/></div>
                                <h3 className="text-sm font-black text-slate-800">대체휴무 현황</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => {
                                    const monthRecords = leaveRecords.filter(r => {
                                        if (r.staffId !== selectedStaff.id || r.type !== 'SUBSTITUTE') return false;
                                        let recordYear = r.year;
                                        if (!recordYear && r.date) recordYear = new Date(r.date).getFullYear();
                                        if (recordYear && recordYear !== currentYear) return false;
                                        if (r.targetMonth) return r.targetMonth === month;
                                        if (r.date) return new Date(r.date).getMonth() + 1 === month;
                                        return false;
                                    }).sort((a,b) => (a.refDate || a.createdAt).toString().localeCompare((b.refDate || b.createdAt).toString()));

                                    return (
                                        <div key={month} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col hover:shadow-md transition-shadow min-h-[200px]">
                                            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-50">
                                                <span className="text-sm font-black text-slate-600">{month}월</span>
                                                <button onClick={() => addRecord('SUBSTITUTE', 1, '', '', month)} className="w-6 h-6 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-colors"><Plus size={14}/></button>
                                            </div>
                                            <div className="flex-1 flex flex-col gap-2">
                                                {monthRecords.map(r => {
                                                    const isScheduled = !!r.date;
                                                    return (
                                                        <div key={r.id} className={`p-2.5 rounded-xl border text-xs relative group/item transition-all ${isScheduled ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                                                            <button onClick={() => deleteRecord(r.id)} className="absolute top-1.5 right-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover/item:opacity-100 p-1"><X size={12}/></button>
                                                            <input type="text" value={r.memo || ''} onChange={(e) => updateRecord(r.id, 'memo', e.target.value)} placeholder="내용" className="w-full bg-transparent border-none p-0 focus:ring-0 font-bold text-slate-700 mb-1 leading-tight"/>
                                                            <input type="date" value={r.date} onChange={(e) => updateRecord(r.id, 'date', e.target.value)} className={`w-full bg-transparent border-none p-0 focus:ring-0 font-medium ${isScheduled ? 'text-indigo-500' : 'text-slate-400'}`}/>
                                                        </div>
                                                    );
                                                })}
                                                {monthRecords.length === 0 && <div className="flex-1 flex items-center justify-center text-[10px] text-slate-300 font-medium">내역 없음</div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* 3. Other Leaves */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg"><MoreHorizontal size={16}/></div>
                                <h3 className="text-sm font-black text-slate-800">기타 휴가</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {['REGULAR', 'FAMILY', 'LONG_SERVICE', 'LABOR_DAY'].map(type => {
                                    const records = leaveRecords.filter(r => r.staffId === selectedStaff.id && r.type === type);
                                    const isLaborDay = type === 'LABOR_DAY';
                                    const laborDayOffRecord = isLaborDay ? records.find(r => r.memo === 'OFF_CHECK') : null;
                                    const isLaborDayOff = !!laborDayOffRecord;

                                    return (
                                        <div key={type} className={`bg-white rounded-xl border p-4 space-y-3 ${isLaborDayOff ? 'border-indigo-200 ring-1 ring-indigo-50' : 'border-slate-200'}`}>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-700">{type === 'LABOR_DAY' ? '노동절' : LEAVE_TYPE_LABELS[type]}</span>
                                                {isLaborDay ? (
                                                    <label className="flex items-center gap-1 cursor-pointer">
                                                        <input type="checkbox" checked={isLaborDayOff} onChange={(e) => e.target.checked ? addRecord('LABOR_DAY', 0, '', 'OFF_CHECK') : laborDayOffRecord && deleteRecord(laborDayOffRecord.id)} className="w-3 h-3 rounded text-indigo-600 border-slate-300"/>
                                                        <span className="text-[9px] font-bold text-slate-500">휴무</span>
                                                    </label>
                                                ) : (
                                                    <button onClick={() => addRecord(type as LeaveCategory, 1)} className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[9px] font-bold text-slate-600">+ 추가</button>
                                                )}
                                            </div>
                                            
                                            {isLaborDayOff ? (
                                                <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-center">
                                                    <span className="text-[10px] font-bold text-indigo-500">대체휴무 미발생</span>
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    {isLaborDay && (
                                                        <div className="flex gap-1 mb-2">
                                                            <button onClick={() => addRecord('LABOR_DAY', 1)} className="flex-1 bg-indigo-50 text-indigo-600 text-[9px] font-bold py-1 rounded border border-indigo-100">1일</button>
                                                            <button onClick={() => addRecord('LABOR_DAY', 0.5)} className="flex-1 bg-emerald-50 text-emerald-600 text-[9px] font-bold py-1 rounded border border-emerald-100">0.5일</button>
                                                        </div>
                                                    )}
                                                    {records.filter(r => r.memo !== 'OFF_CHECK').map((r, i) => {
                                                        const isScheduled = !!r.date;
                                                        return (
                                                            <div key={r.id} className={`flex items-center gap-2 p-1.5 rounded-lg border group/row transition-all ${isScheduled ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                                                                <span className={`text-[9px] font-bold w-6 text-center ${isScheduled ? 'text-indigo-400' : 'text-slate-400'}`}>{isLaborDay ? r.days + '일' : (i + 1) + '일'}</span>
                                                                <input type="date" value={r.date} onChange={(e) => updateRecord(r.id, 'date', e.target.value)} className={`flex-1 bg-transparent border-none p-0 focus:ring-0 text-[10px] font-bold ${isScheduled ? 'text-indigo-700' : 'text-slate-700'}`}/>
                                                                <button onClick={() => deleteRecord(r.id)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover/row:opacity-100"><X size={12}/></button>
                                                            </div>
                                                        );
                                                    })}
                                                    {records.filter(r => r.memo !== 'OFF_CHECK').length === 0 && <div className="text-center text-[9px] text-slate-300 py-2 border border-dashed border-slate-100 rounded">기록 없음</div>}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 font-medium">직원을 선택해주세요</div>
            )}

            {/* Batch Add Modal */}
            {isBatchAddModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 bg-indigo-600 flex justify-between items-center text-white">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    <Users size={20} className="text-white"/>
                                </div>
                                <div>
                                    <h3 className="text-lg font-black">전체 대체휴무 생성</h3>
                                    <p className="text-[10px] font-medium opacity-80">{batchAddMonth}월 대체휴무 일괄 등록</p>
                                </div>
                            </div>
                            <button onClick={() => setIsBatchAddModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 ml-1">내용 (예: 9.9 창립기념일)</label>
                                <input 
                                    autoFocus
                                    type="text" 
                                    value={batchAddMemo}
                                    onChange={(e) => setBatchAddMemo(e.target.value)}
                                    placeholder="내용을 입력하세요"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900"
                                    onKeyDown={(e) => e.key === 'Enter' && confirmBatchAdd()}
                                />
                                <p className="text-[10px] text-slate-400 px-1">
                                    * 입력하신 내용으로 <strong>모든 직원</strong>에게 휴가가 생성됩니다.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setIsBatchAddModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition">취소</button>
                                <button onClick={confirmBatchAdd} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">일괄 생성</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
