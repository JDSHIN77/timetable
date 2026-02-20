
import React, { useState } from 'react';
import { Plus, Users, Trash2, ArrowUp, ArrowDown, Pencil, Check, X, Building2, ShoppingBag, ShieldCheck } from 'lucide-react';
import { Staff, ShiftInfo, Cinema } from '../types';
import { generateId } from '../utils/helpers';
import { POSITIONS } from '../constants';

interface StaffManagementProps {
    staffList: Staff[];
    setStaffList: (list: Staff[]) => void;
    managedShifts: Record<string, ShiftInfo>;
    cinemas: Cinema[];
}

export const StaffManagement: React.FC<StaffManagementProps> = ({ staffList, setStaffList, managedShifts, cinemas }) => {
    const [newName, setNewName] = useState('');
    const [newPos, setNewPos] = useState('운영매니저');
    const [newCin, setNewCin] = useState<'BUWON' | 'OUTLET'>('BUWON');
    const [editId, setEditId] = useState<string | null>(null);
    const [editFm, setEditFm] = useState<Staff | null>(null);
    const [delId, setDelId] = useState<string | null>(null);

    const addStaff = () => { 
        if (!newName) return; 
        setStaffList([...staffList, { id: generateId(), name: newName, position: newPos, cinema: newCin }]); 
        setNewName(''); 
    };

    const moveStaff = (idx: number, dir: 'UP' | 'DOWN') => { 
        const newList = [...staffList]; 
        const target = dir === 'UP' ? idx - 1 : idx + 1; 
        if (target >= 0 && target < newList.length) { 
            [newList[idx], newList[target]] = [newList[target], newList[idx]]; 
            setStaffList(newList); 
        } 
    };

    const buwonCinema = cinemas.find(c => c.id === 'BUWON')!;
    const outletCinema = cinemas.find(c => c.id === 'OUTLET')!;

    const renderStaffListItem = (s: Staff, originalIndex: number) => {
        const isEdit = editId === s.id;
        const isBuwon = s.cinema === 'BUWON';
        const isManager = s.position === '점장';
        const cinemaInfo = cinemas.find(c => c.id === s.cinema)!;
        
        return (
            <div key={s.id} className={`group relative bg-white rounded-xl border transition-all duration-200 ${isEdit ? 'border-indigo-500 ring-2 ring-indigo-50 shadow-lg' : 'border-slate-200 hover:border-slate-300 shadow-sm'} ${isManager ? 'border-amber-200 bg-amber-50/10' : ''}`}>
                {isEdit && editFm ? (
                    <div className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">직원 정보 수정</span>
                            <div className="flex gap-1">
                                <button onClick={() => { setStaffList(staffList.map(st => st.id === editId ? editFm : st)); setEditId(null); }} className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"><Check size={14} /></button>
                                <button onClick={() => setEditId(null)} className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-100 transition-colors"><X size={14} /></button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 ml-1 uppercase">이름</label>
                                <input type="text" value={editFm.name} onChange={(e) => setEditFm({...editFm, name: e.target.value})} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 ml-1 uppercase">직책</label>
                                <select value={editFm.position} onChange={(e) => setEditFm({...editFm, position: e.target.value})} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:ring-1 focus:ring-indigo-500">{POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}</select>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center p-3 gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black shadow-inner shrink-0 ${isManager ? 'bg-amber-100 text-amber-600' : isBuwon ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'}`}>
                            {isManager ? <ShieldCheck size={18}/> : s.name[0]}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900 text-sm truncate">{s.name}</h4>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${isManager ? 'text-amber-600 bg-amber-50 border-amber-100' : isBuwon ? 'text-indigo-500 bg-indigo-50 border-indigo-100' : 'text-orange-500 bg-orange-50 border-orange-100'}`}>
                                    {s.position}
                                </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">소속: {cinemaInfo.name}</div>
                        </div>

                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button onClick={() => moveStaff(originalIndex, 'UP')} disabled={originalIndex === 0} className="p-1 text-slate-400 hover:text-slate-900 rounded disabled:opacity-0"><ArrowUp size={12} /></button>
                            <button onClick={() => moveStaff(originalIndex, 'DOWN')} disabled={originalIndex === staffList.length - 1} className="p-1 text-slate-400 hover:text-slate-900 rounded disabled:opacity-0"><ArrowDown size={12} /></button>
                            <button onClick={() => { setEditId(s.id); setEditFm({ ...s }); }} className="p-1 text-slate-400 hover:text-indigo-600 rounded ml-1"><Pencil size={12} /></button>
                            <button onClick={() => { if(confirm(`${s.name}님을 삭제하시겠습니까?`)) setStaffList(staffList.filter(st => st.id !== s.id)); }} className="p-1 text-slate-400 hover:text-red-500 rounded"><Trash2 size={12} /></button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="p-6 max-w-[1200px] mx-auto animate-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Users className="text-indigo-600" /> 직원 통합 관리
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">지점별 인력을 관리합니다. 점장은 두 지점 모두 근무가 가능합니다.</p>
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
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">지점</label>
                            <select value={newCin} onChange={(e) => setNewCin(e.target.value as any)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all">
                                {cinemas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">성함</label>
                            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="이름" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">직책</label>
                            <select value={newPos} onChange={(e) => setNewPos(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all">
                                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <button onClick={addStaff} className="lg:w-32 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-indigo-600 transition-all shadow-lg text-xs mt-auto active:scale-95">직원 등록</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1 pb-1">
                        <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                        <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                            <Building2 size={16} className="text-indigo-500" /> {buwonCinema.name}
                        </h3>
                    </div>
                    <div className="flex flex-col gap-2">
                        {staffList.filter(s => s.cinema === 'BUWON').length > 0 ? (
                            staffList.map((s, i) => s.cinema === 'BUWON' ? renderStaffListItem(s, i) : null)
                        ) : (
                            <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs font-medium bg-slate-50/50">등록된 직원이 없습니다.</div>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1 pb-1">
                        <div className="w-1.5 h-4 bg-orange-500 rounded-full"></div>
                        <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                            <ShoppingBag size={16} className="text-orange-500" /> {outletCinema.name}
                        </h3>
                    </div>
                    <div className="flex flex-col gap-2">
                        {staffList.filter(s => s.cinema === 'OUTLET').length > 0 ? (
                            staffList.map((s, i) => s.cinema === 'OUTLET' ? renderStaffListItem(s, i) : null)
                        ) : (
                            <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs font-medium bg-slate-50/50">등록된 직원이 없습니다.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
