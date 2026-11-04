import { maskName, maskPhone, maskAddress, maskUid, maskBirth } from '../utils/mask.js';
import { QUESTION_SPECS } from '../config/questionSpecs.js';
import { getLocalTodayString } from '../utils/date.js';

export class ExcelExportService {
  /**
   * 단일 또는 다중 조사 데이터 엑셀 파일 다운로드 (무손실 2-Sheet 구조)
   * @param {Object|Array<Object>} surveyData - 조사 데이터 단건 또는 배열
   * @param {string} customFileName - 파일명 지정 (선택)
   */
  static async exportSurveyToExcel(surveyData, customFileName = '') {
    const list = Array.isArray(surveyData) ? surveyData : [surveyData];
    if (list.length === 0) {
      alert('다운로드할 조사 데이터가 없습니다.');
      return;
    }

    const ExcelJSLib = window.ExcelJS || (typeof ExcelJS !== 'undefined' ? ExcelJS : null);
    if (!ExcelJSLib) {
      alert('엑셀 모듈(ExcelJS)을 불러오지 못했습니다. 네트워크 또는 스크립트 연결을 확인해 주십시오.');
      return;
    }

    const workbook = new ExcelJSLib.Workbook();
    workbook.creator = 'WellRiskKeeper';
    workbook.created = new Date();

    // ==========================================
    // [시트 1] 가정방문 조사대장 (기본 행정 및 판정)
    // ==========================================
    const sheet1 = workbook.addWorksheet('가정방문_조사대장', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    const headers1 = [
      '연번',
      '조사일자',
      '조사 회차',
      '조사 관리번호',
      '지역코드',
      '기관명',
      '기관코드',
      '참여 활동가',
      '대상자 관리번호',
      '대상자 성명',
      '생년월일',
      '성별',
      '연락처',
      '거주지 주소',
      '거주지 유형',
      '방문 결과',
      '위험 총점',
      '위기 판정',
      '연계 추천 사업단',
      '개인정보 동의여부',
      '전자서명 완료여부'
    ];

    const headerRow1 = sheet1.addRow(headers1);
    headerRow1.height = 28;
    headerRow1.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' } // 딥 네이비
      };
      cell.font = {
        name: '맑은 고딕',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF0284C7' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    });

    // ==========================================
    // [시트 2] 문항 및 관찰 세부 기록부 (원문 100% 보존)
    // ==========================================
    const sheet2 = workbook.addWorksheet('문항_관찰_세부기록부', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    const headers2 = [
      '연번',
      '조사 관리번호',
      '대상자 성명',
      '[관찰1] 우편물 적재',
      '[관찰2] 악취·해충',
      '[관찰3] 쓰레기·술병',
      '[관찰4] 불켜짐·인기척',
      '[관찰5] 두문불출',
      '[관찰6] 연락두절',
      '[외부관찰] 이웃탐문 및 메모 원문',
      '[문항1] 식사결손_답변',
      '[문항1] 현장메모 원문',
      '[문항2] 만취음주_답변',
      '[문항2] 현장메모 원문',
      '[문항3] 소통단절_답변',
      '[문항3] 현장메모 원문',
      '[문항4] 문제도움_답변',
      '[문항4] 현장메모 원문',
      '[문항5] 소득상태_답변',
      '[문항5] 현장메모 원문',
      '[문항6] 공과금체납_답변',
      '[문항6] 현장메모 원문',
      '[문항7] 질환치료_답변',
      '[문항7] 현장메모 원문',
      '[문항8] 주거청결_답변',
      '[문항8] 현장메모 원문',
      '[문항9] 심한고독감_답변',
      '[문항9] 현장메모 원문',
      '[문항10] 생명위기_답변',
      '[문항10] 현장메모 원문'
    ];

    const headerRow2 = sheet2.addRow(headers2);
    headerRow2.height = 28;
    headerRow2.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' } // 딥 블루
      };
      cell.font = {
        name: '맑은 고딕',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF38BDF8' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    });

    // ==========================================
    // [시트 3] 수혜자 관리카드 (안부확인 5대 지표 및 관리대장)
    // ==========================================
    const sheet3 = workbook.addWorksheet('수혜자_관리카드', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    const headers3 = [
      '연번',
      '조사일자',
      '조사 회차',
      '조사 관리번호',
      '대상자 관리번호',
      '대상자 성명',
      '생년월일',
      '성별',
      '연락처',
      '거주지 주소',
      '거주지 유형',
      '보호자 유무',
      '보호자 관계',
      '보호자 성명',
      '보호자 연락처',
      '보호자 주소',
      '대리서명 여부',
      '안부확인 방법',
      '[건강상태] 판정',
      '[건강상태] 세부메모',
      '[심리상태] 판정',
      '[심리상태] 세부메모',
      '[주거환경] 판정',
      '[주거환경] 세부메모',
      '[이상징후] 판정',
      '[이상징후] 세부메모',
      '[기타사항] 여부',
      '[특이사항 및 종합의견] 원문',
      '담당 살핌단'
    ];

    const headerRow3 = sheet3.addRow(headers3);
    headerRow3.height = 28;
    headerRow3.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' } // 짙은 슬레이트
      };
      cell.font = {
        name: '맑은 고딕',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF10B981' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    });

    // ==========================================
    // 데이터 행 추가 (시트 1, 시트 2, 시트 3 동시 적재)
    // ==========================================
    list.forEach((item, index) => {
      const b = item.basicInfo || {};
      const p = item.profile || {};
      const g = p.guardian || {};
      const obs = item.observation || {};
      const ans = item.answers || {};
      const res = item.result || {};
      const card = item.beneficiaryCard || {};

      // 개인정보 동의여부 및 전자서명 완료여부 판정 (현장 참여자 업무 방식별 정합성 반영)
      const isRevisitCase = (item.isRevisit === true) || (item.revisitRound && item.revisitRound >= 2);
      const isCallCase = (card.method === 'call') || (obs.visitResult === 'call');
      const isUnmetCase = (obs.visitResult === 'unmet');
      const inspCount = Object.keys((item.consent && item.consent.inspectorSignatures) || {}).length;
      const hasTarget = !!(item.consent && (item.consent.targetSignature || item.consent.proxySignature));

      let consentStatus = '미동의';
      let signatureStatus = '미완료';

      if (isUnmetCase) {
        consentStatus = obs.unmetReason === '거부' ? '미동의 (거부)' : '미동의 (미대면)';
        signatureStatus = inspCount > 0 ? '완료 (현장확인)' : '미완료 (미대면)';
      } else if (isRevisitCase) {
        consentStatus = '동의 (1차 기수집)';
        signatureStatus = inspCount > 0 ? (isCallCase ? '완료 (유선 확인)' : '완료 (재방문 확인)') : '미완료';
      } else if (isCallCase) {
        consentStatus = '동의 (유선 확인)';
        signatureStatus = inspCount > 0 ? '완료 (유선 확인)' : '미완료';
      } else {
        // 1차 일반 대면 조사
        const isAgreed = item.consent && (item.consent.agreeCollect === true || item.consent.agreeAll === true || (hasTarget && item.consent.agreeCollect !== false));
        consentStatus = isAgreed ? '동의' : '미동의';

        if (hasTarget && inspCount > 0) {
          signatureStatus = '완료 (전체)';
        } else if (inspCount > 0) {
          signatureStatus = '완료 (활동가 서명)';
        } else if (hasTarget) {
          signatureStatus = '완료 (대상자 서명)';
        } else {
          signatureStatus = '미완료';
        }
      }

      const curCaseUid = b.caseUid || '';
      const uidParts = curCaseUid.split('-');
      const suffix = uidParts[uidParts.length - 1] || '';
      const isFieldDiscovery = (item.isFieldDiscovery === true) || (item.caseStatus === 'FIELD_DISCOVERY') || !/^\d{3}$/.test(suffix);

      const uidToDisplay = isFieldDiscovery 
        ? (b.maskedSurveyUid || b.rawSurveyUid || b.caseUid || '') 
        : maskUid(b.maskedSurveyUid || b.rawSurveyUid || b.caseUid || '');
      const caseUidToRecord = isFieldDiscovery ? curCaseUid : maskUid(curCaseUid);
      const targetNameToRecord = isFieldDiscovery ? (p.name || '') : maskName(p.name);
      const birthToRecord = isFieldDiscovery ? (p.birth || '') : maskBirth(p.birth);
      const phoneToRecord = isFieldDiscovery ? (p.phone || '') : maskPhone(p.phone);
      const addrToRecord = isFieldDiscovery ? (p.address || p.baseAddress || '') : maskAddress(p.address || p.baseAddress || '');

      const roundText = item.isRevisit ? `${item.revisitRound || 2}차` : '1차';

      // 1. 시트 1 행 데이터
      const rowValues1 = [
        index + 1,
        b.inspectionDate || '',
        roundText,
        uidToDisplay,
        b.orgCode ? b.orgCode.replace(/^O-/, '') : '28-260',
        b.orgName || '통합돌봄센터',
        b.orgCode || 'O-28-260-01',
        Array.isArray(b.inspectors) ? b.inspectors.join(', ') : (b.inspectors || ''),
        caseUidToRecord,
        targetNameToRecord,
        birthToRecord,
        p.gender || '',
        phoneToRecord,
        addrToRecord,
        p.housingType === '직접기재' && p.housingCustom ? `직접기재(${p.housingCustom})` : (p.housingType || ''),
        obs.visitResult === 'met' ? '대면 (실내진입)' : (obs.visitResult === 'unmet' ? `미대면 (${obs.unmetReason || '부재'})` : '통화 (전화)'),
        typeof res.totalScore === 'number' ? `${res.totalScore}점` : '-',
        res.grade && res.grade.label ? res.grade.label : (typeof res.totalScore === 'number' && res.totalScore >= 6 ? '위험군' : '일반군'),
        consentStatus,
        signatureStatus
      ];

      const row1 = sheet1.addRow(rowValues1);
      row1.height = 24;
      row1.eachCell((cell, colNumber) => {
        cell.font = { name: '맑은 고딕', size: 10 };
        cell.alignment = {
          vertical: 'middle',
          horizontal: [1, 2, 3, 4, 6, 8, 9, 10, 11, 12, 14, 15, 16, 17, 19, 20, 21].includes(colNumber) ? 'center' : 'left'
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
        if (index % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
      });

      // 2. 시트 2 행 데이터 (문항 답변 & 메모 원문 100% 보존, 통계 정규화)
      const qRow = [];
      QUESTION_SPECS.forEach((q) => {
        const a = ans[q.num];
        const isRisk = a && a.isRisk === true;
        const answerText = isRisk ? '예' : (a ? '아니오' : '-');
        const memoText = a && a.activityMemo ? a.activityMemo : '';
        qRow.push(answerText, memoText);
      });

      const rowValues2 = [
        index + 1,
        uidToDisplay,
        targetNameToRecord,
        obs.mailAccumulated === true ? '있음' : (obs.mailAccumulated === false ? '없음' : '-'),
        obs.odorInsects === true ? '있음' : (obs.odorInsects === false ? '없음' : '-'),
        obs.trashBottles === true ? '있음' : (obs.trashBottles === false ? '없음' : '-'),
        obs.tvLightOn === true ? '있음' : (obs.tvLightOn === false ? '없음' : '-'),
        obs.isolatedLiving === true ? '있음' : (obs.isolatedLiving === false ? '없음' : '-'),
        obs.contactLost === true ? '있음' : (obs.contactLost === false ? '없음' : '-'),
        obs.neighborNote || (obs.visitResult === 'unmet' ? `[미대면사유] ${obs.unmetReason || '부재'}` : ''),
        ...qRow
      ];

      const row2 = sheet2.addRow(rowValues2);
      row2.height = 24;
      row2.eachCell((cell, colNumber) => {
        cell.font = { name: '맑은 고딕', size: 10 };
        const isCenterCol = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29].includes(colNumber);
        cell.alignment = {
          vertical: 'middle',
          horizontal: isCenterCol ? 'center' : 'left'
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
        if (index % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
      });

      // 3. 시트 3 행 데이터 (수혜자 관리카드 5대 지표 및 관리대장)
      const healthCheck = card.healthCheck || card.healthStatus || '양호';
      const psychoCheck = card.psychoCheck || card.psychStatus || '안정';
      const livingCheck = card.livingCheck || card.livingStatus || '청결';
      const anomalyCheck = card.anomalyCheck || card.symptomStatus || '없음';
      const etcCheck = card.etcCheck ? card.etcCheck : (card.hasOther ? '있음' : '없음');
      const detailNote = card.detailNote || card.etcNote || card.trendNote || '특이사항 없음';

      const gNameToRecord = isFieldDiscovery ? (g.name || '-') : (maskName(g.name) || '-');
      const gPhoneToRecord = isFieldDiscovery ? (g.phone || '-') : (maskPhone(g.phone) || '-');
      const gAddrToRecord = isFieldDiscovery ? (g.address || '-') : (maskAddress(g.address) || '-');

      const rowValues3 = [
        index + 1,
        b.inspectionDate || '',
        roundText,
        uidToDisplay,
        caseUidToRecord,
        targetNameToRecord,
        birthToRecord,
        p.gender || '',
        phoneToRecord,
        addrToRecord,
        p.housingType === '직접기재' && p.housingCustom ? `직접기재(${p.housingCustom})` : (p.housingType || ''),
        (g.hasGuardian === 'YES' || g.name) ? '있음' : '없음',
        g.relation || '-',
        gNameToRecord,
        gPhoneToRecord,
        gAddrToRecord,
        g.isProxySigner ? '대리서명' : '본인서명',
        card.method === 'call' ? '전화' : '방문',
        healthCheck,
        card.healthNote || '',
        psychoCheck,
        card.psychoNote || '',
        livingCheck,
        card.livingNote || '',
        anomalyCheck,
        card.anomalyNote || '',
        etcCheck,
        detailNote,
        Array.isArray(b.inspectors) ? b.inspectors.join(', ') : (b.inspectors || '')
      ];

      const row3 = sheet3.addRow(rowValues3);
      row3.height = 24;
      row3.eachCell((cell, colNumber) => {
        cell.font = { name: '맑은 고딕', size: 10 };
        const isCenterCol = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 17, 18, 19, 21, 23, 25, 27, 29].includes(colNumber);
        cell.alignment = {
          vertical: 'middle',
          horizontal: isCenterCol ? 'center' : 'left'
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
        if (index % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
      });
    });

    // ==========================================
    // 열 너비 자동 최적화
    // ==========================================
    // 시트 1 열 너비
    sheet1.columns = [
      { width: 6 },  // 1. 연번
      { width: 12 }, // 2. 조사일자
      { width: 14 }, // 3. 조사 회차
      { width: 22 }, // 4. 조사 관리번호
      { width: 11 }, // 5. 지역코드
      { width: 18 }, // 6. 기관명
      { width: 14 }, // 7. 기관코드
      { width: 16 }, // 8. 참여 활동가
      { width: 18 }, // 9. 대상자 관리번호
      { width: 13 }, // 10. 대상자 성명
      { width: 13 }, // 11. 생년월일
      { width: 8 },  // 12. 성별
      { width: 15 }, // 13. 연락처
      { width: 28 }, // 14. 거주지 주소
      { width: 15 }, // 15. 거주지 유형
      { width: 14 }, // 16. 방문 결과
      { width: 11 }, // 17. 위험 총점
      { width: 12 }, // 18. 위기 판정
      { width: 20 }, // 19. 연계 추천 사업단
      { width: 17 }, // 20. 개인정보 동의여부
      { width: 18 }  // 21. 전자서명 완료여부
    ];

    // 시트 2 열 너비
    sheet2.columns = [
      { width: 6 },  // 1. 연번
      { width: 22 }, // 2. 조사 관리번호
      { width: 13 }, // 3. 대상자 성명
      { width: 14 }, // 4. [관찰1] 우편물
      { width: 14 }, // 5. [관찰2] 악취해충
      { width: 14 }, // 6. [관찰3] 쓰레기술병
      { width: 14 }, // 7. [관찰4] 불켜짐인기척
      { width: 14 }, // 8. [관찰5] 두문불출
      { width: 14 }, // 9. [관찰6] 연락두절
      { width: 28 }, // 10. [외부관찰] 이웃탐문 메모
      { width: 15 }, // 11. Q1 답변
      { width: 25 }, // 12. Q1 메모
      { width: 15 }, // 13. Q2 답변
      { width: 25 }, // 14. Q2 메모
      { width: 15 }, // 15. Q3 답변
      { width: 25 }, // 16. Q3 메모
      { width: 15 }, // 17. Q4 답변
      { width: 25 }, // 18. Q4 메모
      { width: 15 }, // 19. Q5 답변
      { width: 25 }, // 20. Q5 메모
      { width: 15 }, // 21. Q6 답변
      { width: 25 }, // 22. Q6 메모
      { width: 15 }, // 23. Q7 답변
      { width: 25 }, // 24. Q7 메모
      { width: 15 }, // 25. Q8 답변
      { width: 25 }, // 26. Q8 메모
      { width: 15 }, // 27. Q9 답변
      { width: 25 }, // 28. Q9 메모
      { width: 15 }, // 29. Q10 답변
      { width: 25 }  // 30. Q10 메모
    ];

    // 시트 3 열 너비
    sheet3.columns = [
      { width: 6 },  // 1. 연번
      { width: 12 }, // 2. 조사일자
      { width: 14 }, // 3. 조사 회차
      { width: 22 }, // 4. 조사 관리번호
      { width: 18 }, // 5. 대상자 관리번호
      { width: 13 }, // 6. 대상자 성명
      { width: 13 }, // 7. 생년월일
      { width: 8 },  // 8. 성별
      { width: 15 }, // 9. 연락처
      { width: 28 }, // 10. 거주지 주소
      { width: 15 }, // 11. 거주지 유형
      { width: 12 }, // 12. 보호자 유무
      { width: 12 }, // 13. 보호자 관계
      { width: 13 }, // 14. 보호자 성명
      { width: 15 }, // 15. 보호자 연락처
      { width: 24 }, // 16. 보호자 주소
      { width: 13 }, // 17. 대리서명 여부
      { width: 13 }, // 18. 안부확인 방법
      { width: 14 }, // 19. [건강상태] 판정
      { width: 24 }, // 20. [건강상태] 세부메모
      { width: 14 }, // 21. [심리상태] 판정
      { width: 24 }, // 22. [심리상태] 세부메모
      { width: 14 }, // 23. [주거환경] 판정
      { width: 24 }, // 24. [주거환경] 세부메모
      { width: 14 }, // 25. [이상징후] 판정
      { width: 24 }, // 26. [이상징후] 세부메모
      { width: 13 }, // 27. [기타사항] 여부
      { width: 32 }, // 28. [특이사항 및 종합의견] 원문
      { width: 16 }  // 29. 담당 살핌단
    ];

    // 시트 위·변조 방지 무결성 보호 암호 (123456) 적용 (셀 조회/선택 허용, 임의 수정 방지)
    const protectOptions = {
      selectLockedCells: true,
      selectUnlockedCells: true
    };
    await sheet1.protect('123456', protectOptions);
    await sheet2.protect('123456', protectOptions);
    await sheet3.protect('123456', protectOptions);

    // 파일 생성 및 다운로드 트리거
    const dateStr = (list[0]?.basicInfo?.inspectionDate || getLocalTodayString()).replace(/-/g, '');
    const fileName = customFileName || `고독사예방_가정방문_조사대장_${dateStr}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
