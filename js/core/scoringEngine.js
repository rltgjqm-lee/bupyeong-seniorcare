/**
 * @file scoringEngine.js
 * @description 10개 문항 점수(0~13점), 위험 등급 판정, 4대 사업단 매칭 및 복지부 11대 위기분류 태깅 엔진 (ESM)
 */

import { QUESTION_SPECS } from '../config/questionSpecs.js';
import { RISK_GRADES, MOHW_CATEGORIES } from '../config/constants.js';

export class ScoringEngine {
  /**
   * 점수 산출 및 종합 판정
   * @param {Object} answersMap - { 1: { isRisk: bool, selectedCauses: [] }, ... }
   * @param {Array<string>} immediateNeeds - Q10 즉시 욕구 코드 배열
   * @returns {Object} { totalScore, grade, buCounts, activeBuList, mohwTags }
   */
  static calculate(answersMap = {}, immediateNeeds = []) {
    let totalScore = 0;
    const buCounts = { ME: 0, HE: 0, CL: 0, EM: 0 };
    const mohwTagSet = new Set();

    QUESTION_SPECS.forEach(q => {
      const ans = answersMap[q.num];
      if (ans && ans.isRisk) {
        totalScore += q.scoreWeight;
        buCounts[q.targetBU] = (buCounts[q.targetBU] || 0) + 1;

        // Add primary MOHW tags for this question
        (q.mohwCodes || []).forEach(mCode => mohwTagSet.add(mCode));

        // Additional BU counts from secondary cause selections
        (ans.selectedCauses || []).forEach(cCode => {
          const cObj = q.causes.find(c => c.code === cCode);
          if (cObj && cObj.bu !== q.targetBU) {
            buCounts[cObj.bu] = (buCounts[cObj.bu] || 0) + 1;
          }
        });
      }
    });

    // Immediate needs impact
    (immediateNeeds || []).forEach(need => {
      if (need.includes('MEAL')) buCounts.ME = (buCounts.ME || 0) + 1;
      if (need.includes('HOSPITAL') || need.includes('MENTAL')) buCounts.HE = (buCounts.HE || 0) + 1;
      if (need.includes('HEATING')) buCounts.CL = (buCounts.CL || 0) + 1;
      if (need.includes('TALK') || need.includes('FINANCIAL')) buCounts.EM = (buCounts.EM || 0) + 1;
    });

    // Determine Risk Grade
    let grade = RISK_GRADES.CLEAN;
    const isQ10Risk = answersMap[10] && answersMap[10].isRisk;

    if (totalScore >= RISK_GRADES.CRITICAL.minScore || isQ10Risk) {
      grade = RISK_GRADES.CRITICAL;
    } else if (totalScore >= RISK_GRADES.HIGH.minScore) {
      grade = RISK_GRADES.HIGH;
    } else if (totalScore >= RISK_GRADES.MID.minScore) {
      grade = RISK_GRADES.MID;
    }

    const activeBuList = Object.keys(buCounts).filter(bu => buCounts[bu] > 0);

    // Resolve MOHW Tag details
    const mohwTags = Array.from(mohwTagSet).map(code => {
      const entry = Object.values(MOHW_CATEGORIES).find(m => m.code === code);
      return entry ? entry : { code, name: code, desc: '' };
    });

    return {
      totalScore,
      maxScore: 13,
      grade,
      buCounts,
      activeBuList,
      mohwTags
    };
  }
}
