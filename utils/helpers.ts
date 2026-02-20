
export const generateId = () => Math.random().toString(36).substr(2, 9);

export const formatDateKey = (date: Date) => 
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * 극단적인 경우에도 5~6주 분량의 목요일 기준 주간 데이터를 생성합니다.
 */
export const getCinemaMonthRange = (currentDate: Date) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 해당 월의 1일
    const firstDayOfMonth = new Date(year, month, 1);
    
    // 시작일 계산: 1일이 포함된 주의 "목요일"을 찾음 (영화 주간 기준)
    // 만약 1일이 일(0)~수(3)라면 이전 주 목요일부터 시작
    const startObj = new Date(firstDayOfMonth);
    const dayOfWeek = startObj.getDay(); 
    const diff = (dayOfWeek < 4) ? (dayOfWeek + 3) : (dayOfWeek - 4);
    startObj.setDate(startObj.getDate() - diff);
    
    // 항상 35일(5주) 혹은 필요시 42일(6주)을 생성하여 그리드가 비지 않도록 함
    const days: Date[] = [];
    let curr = new Date(startObj);
    
    // 최소 5주(35일) 보장
    for (let i = 0; i < 35; i++) {
        days.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
    }
    
    // 만약 마지막 날이 여전히 해당 월 이내라면 1주 더 추가
    if (days[days.length - 1].getMonth() === month) {
        for (let i = 0; i < 7; i++) {
            days.push(new Date(curr));
            curr.setDate(curr.getDate() + 1);
        }
    }

    return days;
};
