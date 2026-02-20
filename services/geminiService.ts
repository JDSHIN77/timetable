
import { GoogleGenAI, Type } from "@google/genai";
import { Staff, MonthSchedule, StaffStats } from "../types";

// Always use process.env.API_KEY directly for initialization
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeSchedule = async (
  staffList: Staff[],
  schedules: MonthSchedule,
  stats: StaffStats[]
) => {
  // AI에게 보내기 전에 스케줄 데이터를 단순화 (값만 추출)
  const simplifiedSchedules: Record<string, Record<string, string>> = {};
  Object.keys(schedules).forEach(dateKey => {
      simplifiedSchedules[dateKey] = {};
      Object.keys(schedules[dateKey]).forEach(staffId => {
          simplifiedSchedules[dateKey][staffId] = schedules[dateKey][staffId].value;
      });
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        다음 시네마 근무표 데이터를 분석하고 개선 제안을 한국어로 제공해줘.
        직원 정보: ${JSON.stringify(staffList)}
        스케줄 정보 (날짜: {직원ID: 근무타입}): ${JSON.stringify(simplifiedSchedules)}
        통계 정보: ${JSON.stringify(stats)}
        
        분석 초점:
        1. 번아웃 위험 (너무 많은 연속 근무).
        2. 공정성 (주말 근무 배분의 균등성).
        3. 인원 충족 (오픈/마감 인원이 충분한지).
        
        반드시 다음 구조의 JSON 형식으로 응답해:
        {
          "overallStatus": "전체적인 상태 요약",
          "warnings": [{"staffName": "이름", "issue": "문제점", "suggestion": "해결책"}],
          "optimizationTips": ["팁1", "팁2"]
        }
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallStatus: { type: Type.STRING },
            warnings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  staffName: { type: Type.STRING },
                  issue: { type: Type.STRING },
                  suggestion: { type: Type.STRING }
                },
                required: ["staffName", "issue", "suggestion"]
              }
            },
            optimizationTips: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["overallStatus", "warnings", "optimizationTips"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return null;
  }
};
