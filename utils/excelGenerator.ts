
import * as XLSX from 'xlsx-js-style';
import { Staff, MonthSchedule, DailyOperatingHours } from '../types';
import { formatDateKey } from './helpers';
import { HOLIDAYS } from '../constants';

const timeToMin = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
};

const minToTime = (min: number) => {
    let h = Math.floor(min / 60);
    const m = min % 60;
    if (h >= 24) h -= 24;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const getShiftTimeRange = (
    shiftType: string, 
    dateKey: string, 
    cinemaId: string, 
    operatingHours: DailyOperatingHours
): { start: string, end: string } => {
    const defaultTimes = {
        OPEN: { start: '09:00', end: '18:00' },
        MIDDLE: { start: '12:00', end: '21:00' },
        CLOSE: { start: '15:00', end: '24:00' }
    };

    const op = operatingHours[dateKey]?.[cinemaId];
    
    let openStart = defaultTimes.OPEN.start;
    let openEnd = defaultTimes.OPEN.end;
    let closeStart = defaultTimes.CLOSE.start;
    let closeEnd = defaultTimes.CLOSE.end;

    if (op) {
        if (op.openShift && op.openShift.includes('~')) {
            [openStart, openEnd] = op.openShift.split('~');
        }
        if (op.closeShift && op.closeShift.includes('~')) {
            [closeStart, closeEnd] = op.closeShift.split('~');
        }
    }

    // Calculate Middle
    const openStartMin = timeToMin(openStart);
    const middleStartMin = openStartMin + 180; // +3h
    const middleEndMin = middleStartMin + 540; // +9h
    const middleStart = minToTime(middleStartMin);
    const middleEnd = minToTime(middleEndMin);

    if (shiftType.includes('OPEN')) return { start: openStart, end: openEnd };
    if (shiftType.includes('CLOSE')) return { start: closeStart, end: closeEnd };
    if (shiftType.includes('MIDDLE')) return { start: middleStart, end: middleEnd };
    
    return { start: '-', end: '-' };
};

export const downloadWeeklySchedule = (
    weekIdx: number,
    targetCinemaId: 'BUWON' | 'OUTLET',
    weekDates: Date[],
    staffList: Staff[],
    schedules: MonthSchedule,
    operatingHours: DailyOperatingHours
) => {
    // 1. Filter Staff
    let targetStaff = staffList.filter(s => s.cinema === targetCinemaId || s.position === '점장');
    
    const positionRank: Record<string, number> = { '점장': 0, '매니저': 1, '운영매니저': 2 };
    targetStaff.sort((a, b) => {
        const rankA = positionRank[a.position] ?? 99;
        const rankB = positionRank[b.position] ?? 99;
        if (rankA !== rankB) return rankA - rankB;
        return a.name.localeCompare(b.name);
    });
    
    targetStaff = Array.from(new Set(targetStaff.map(s => s.id)))
        .map(id => targetStaff.find(s => s.id === id)!);

    // 2. Prepare Data & Layout
    const data: any[][] = [];
    const merges: any[] = [];
    
    // Total Columns: 2 (Pos/Name) + 14 (7 days * 2 cols) + 1 (Sig) = 17 columns (Index 0-16)
    // Row 0: Empty Top Margin
    data.push(Array(17).fill('')); 

    // Row 1-3: Title & Approval Box
    const row1 = Array(17).fill('');
    row1[0] = '김해부원 / 김해아울렛 직원 스케줄';
    // Approval Box Headers (Moved to 14, 15, 16 to align with right edge)
    row1[14] = '결\n재'; // Vertical Text
    row1[15] = '담 당';
    row1[16] = '점 장';
    data.push(row1);

    const row2 = Array(17).fill(''); // Approval Space
    data.push(row2);
    
    const row3 = Array(17).fill(''); // Approval Space
    data.push(row3);

    // Row 4: Empty Gap
    const row4 = Array(17).fill('');
    data.push(row4);

    // Merges for Top Section
    merges.push({ s: { r: 1, c: 0 }, e: { r: 3, c: 13 } }); // Title (Extended to col 13)
    merges.push({ s: { r: 1, c: 14 }, e: { r: 3, c: 14 } }); // "결재" Vertical at 14
    
    merges.push({ s: { r: 2, c: 15 }, e: { r: 3, c: 15 } }); // "담당" Space at 15
    merges.push({ s: { r: 2, c: 16 }, e: { r: 3, c: 16 } }); // "점장" Space at 16

    // Row 5: "이슈", [Holidays...], "서명"
    const row5 = Array(17).fill('');
    row5[0] = '이슈';
    weekDates.forEach((d, i) => {
        const dk = formatDateKey(d);
        row5[2 + i * 2] = HOLIDAYS[dk] || '';
    });
    row5[16] = '서명';
    data.push(row5);
    
    merges.push({ s: { r: 5, c: 0 }, e: { r: 5, c: 1 } }); // "이슈" merged A6:B6
    weekDates.forEach((_, i) => {
        merges.push({ s: { r: 5, c: 2 + i * 2 }, e: { r: 5, c: 2 + i * 2 + 1 } }); // Holiday Cells merged
    });
    merges.push({ s: { r: 5, c: 16 }, e: { r: 8, c: 16 } }); // "서명" merged vertically Q6:Q9

    // Row 6: "구분", "날짜", [DateString...]
    const row6 = Array(17).fill('');
    row6[0] = '구분';
    row6[1] = '날짜';
    weekDates.forEach((d, i) => {
        row6[2 + i * 2] = `${d.getMonth() + 1}월 ${d.getDate()}일`;
    });
    data.push(row6);
    
    merges.push({ s: { r: 6, c: 0 }, e: { r: 8, c: 0 } }); // "구분" merged vert A7:A9
    merges.push({ s: { r: 6, c: 1 }, e: { r: 8, c: 1 } }); // "날짜" merged vert B7:B9
    weekDates.forEach((_, i) => {
        merges.push({ s: { r: 6, c: 2 + i * 2 }, e: { r: 6, c: 2 + i * 2 + 1 } }); // Date Cells merged
    });

    // Row 7: Empty, Empty, [DayName...]
    const row7 = Array(17).fill('');
    const daysKR = ['일', '월', '화', '수', '목', '금', '토'];
    weekDates.forEach((d, i) => {
        row7[2 + i * 2] = daysKR[d.getDay()];
    });
    data.push(row7);
    weekDates.forEach((_, i) => {
        merges.push({ s: { r: 7, c: 2 + i * 2 }, e: { r: 7, c: 2 + i * 2 + 1 } }); // Day Cells merged
    });

    // Row 8: Empty, Empty, ["출", "퇴"...]
    const row8 = Array(17).fill('');
    weekDates.forEach((_, i) => {
        row8[2 + i * 2] = '출';
        row8[2 + i * 2 + 1] = '퇴';
    });
    data.push(row8);

    // Track rows that are "Dual" rows to set different height
    const dualRowsIndices: number[] = [];

    // Row 9+: Staff Data
    targetStaff.forEach((staff) => {
        const rowData = Array(17).fill('');
        rowData[0] = staff.position;
        rowData[1] = staff.name;

        weekDates.forEach((d, i) => {
            const dk = formatDateKey(d);
            const shiftData = schedules[dk]?.[staff.id];
            const colIdx = 2 + i * 2;

            if (shiftData) {
                const val = shiftData.value;
                if (val === 'OFF') {
                    rowData[colIdx] = '주휴';
                    rowData[colIdx + 1] = '1';
                } else if (val === 'LEAVE') {
                    rowData[colIdx] = '휴무';
                    rowData[colIdx + 1] = '1';
                } else if (val.includes('OPEN') || val.includes('MIDDLE') || val.includes('CLOSE')) {
                    // Check if manual shift time exists
                    if (shiftData.shiftTime) {
                         // Parse custom time range (e.g. 13:00~22:00)
                         // Try splitting by ~
                         if (shiftData.shiftTime.includes('~')) {
                            const [sTime, eTime] = shiftData.shiftTime.split('~').map(t => t.trim());
                            rowData[colIdx] = sTime;
                            rowData[colIdx + 1] = eTime;
                         } else {
                            rowData[colIdx] = shiftData.shiftTime;
                            rowData[colIdx + 1] = '';
                         }
                    } else {
                        let actualCinema = staff.cinema;
                        if (val.startsWith('DUAL_')) {
                            actualCinema = staff.cinema === 'BUWON' ? 'OUTLET' : 'BUWON';
                        }
                        const { start, end } = getShiftTimeRange(val, dk, actualCinema, operatingHours);
                        rowData[colIdx] = start;
                        rowData[colIdx + 1] = end;
                    }
                } else {
                    rowData[colIdx] = val;
                }
            }
        });
        data.push(rowData);
        const mainRowIdx = data.length - 1;

        // If Manager, add "Dual" row
        if (staff.position === '점장') {
            const dualRow = Array(17).fill('');
            data.push(dualRow);
            const dualRowIdx = data.length - 1;
            dualRowsIndices.push(dualRowIdx);

            // Merge Position, Name, Signature vertically
            merges.push({ s: { r: mainRowIdx, c: 0 }, e: { r: dualRowIdx, c: 0 } });
            merges.push({ s: { r: mainRowIdx, c: 1 }, e: { r: dualRowIdx, c: 1 } });
            merges.push({ s: { r: mainRowIdx, c: 16 }, e: { r: dualRowIdx, c: 16 } });

            // Fill "Dual" data per day
            weekDates.forEach((d, i) => {
                const colIdx = 2 + i * 2;
                // Merge the two columns for the day in the dual row (e.g. C-D, E-F)
                merges.push({ s: { r: dualRowIdx, c: colIdx }, e: { r: dualRowIdx, c: colIdx + 1 } });

                const dk = formatDateKey(d);
                const shiftData = schedules[dk]?.[staff.id];
                if (shiftData && shiftData.value && shiftData.value.startsWith('DUAL_')) {
                    dualRow[colIdx] = '겸직';
                }
            });
        }
    });

    // Generate Sheet
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!merges'] = merges;

    // --- ROW HEIGHTS ---
    const wrows = data.map((_, i) => {
        if (i === 4) return { hpt: 10 }; // Gap row
        if (i >= 5 && i <= 8) return { hpt: 30 }; // Header rows (이슈, 날짜, 요일, 출퇴)
        if (dualRowsIndices.includes(i)) return { hpt: 18 }; // Dual Role Rows
        return { hpt: 30 }; // Regular Rows
    });
    ws['!rows'] = wrows;

    // --- STYLING ---
    const borderStyle = { style: "thin", color: { rgb: "000000" } };
    const borderAll = { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle };
    const alignCenter = { horizontal: "center", vertical: "center", wrapText: true };
    const titleStyle = { font: { name: "Malgun Gothic", sz: 20, bold: true }, alignment: alignCenter };
    const headerFill = { fgColor: { rgb: "EFEFEF" } };

    const range = XLSX.utils.decode_range(ws['!ref']!);

    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const addr = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[addr]) ws[addr] = { t: 's', v: '' };

            let cellStyle: any = {
                alignment: alignCenter,
                font: { name: "Malgun Gothic", sz: 10 }
            };

            // Title (Row 1)
            if (R === 1 && C <= 13) {
                cellStyle = { ...titleStyle };
            }
            // Approval Box (Row 1-3, Col 14-16)
            else if (R >= 1 && R <= 3 && C >= 14 && C <= 16) {
                cellStyle.border = borderAll;
                // No bold for approval text requested
            }
            // Gap Row (Row 4)
            else if (R === 4) {
                // No borders for the gap row
            }
            // Table Header (Row 5-8)
            else if (R >= 5 && R <= 8) {
                cellStyle.border = borderAll;
                cellStyle.fill = headerFill;
                cellStyle.font = { name: "Malgun Gothic", sz: 10, bold: true };

                // Holiday Row (Row 5) Colors
                if (R === 5 && C >= 2 && ws[addr].v) {
                    cellStyle.font.color = { rgb: "FF0000" };
                }
                
                // Day/Date Text Colors (Row 6, 7)
                if ((R === 6 || R === 7) && C >= 2) {
                    const dateIdx = Math.floor((C - 2) / 2);
                    if (dateIdx >= 0 && dateIdx < weekDates.length) {
                        const d = weekDates[dateIdx];
                        const isSun = d.getDay() === 0;
                        const isSat = d.getDay() === 6;
                        const dk = formatDateKey(d);
                        const isHol = !!HOLIDAYS[dk];
                        
                        if (isSun || isHol) cellStyle.font.color = { rgb: "FF0000" };
                        else if (isSat) cellStyle.font.color = { rgb: "0000FF" };
                    }
                }

                // "서명" text color (Row 5, Col 16)
                if (R === 5 && C === 16) {
                    cellStyle.font.color = { rgb: "FF0000" };
                }
            }
            // Data Rows (Row 9+)
            else if (R >= 9) {
                cellStyle.border = borderAll;
                
                // Color for "주휴", "휴무", "겸직"
                if (ws[addr].v === '주휴' || ws[addr].v === '휴무' || ws[addr].v === '겸직') {
                    cellStyle.font = { name: "Malgun Gothic", sz: 10, bold: true };
                }
            }
            
            ws[addr].s = cellStyle;
        }
    }

    // Column Widths
    const wscols: any[] = [
        { wch: 10 }, // Pos (A)
        { wch: 8 },  // Name (B)
    ];
    
    // C(2) ~ Q(16) -> Width 7.00
    // Total 15 columns (7 days * 2 = 14) + (1 sig) = 15 columns from index 2 to 16.
    for(let i=0; i<15; i++) {
        wscols.push({ wch: 7 });
    }

    ws['!cols'] = wscols;

    // Page Setup
    ws['!pageSetup'] = {
        orientation: 'landscape',
        paperSize: 9, // A4
        fitToWidth: 1, 
        scale: 100
    };
    ws['!margins'] = { left: 0.3, right: 0.3, top: 0.3, bottom: 0.3, header: 0, footer: 0 };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${weekIdx + 1}주차`);

    const cinemaName = targetCinemaId === 'BUWON' ? '김해부원' : '김해아울렛';
    const fName = `${cinemaName}_${weekIdx + 1}주차_근무표.xlsx`;
    XLSX.writeFile(wb, fName);
};
