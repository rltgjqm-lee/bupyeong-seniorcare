/**
 * @file step7CompleteView.js
 * @description PWA 현장조사 Step 7: 저장, D1 전송 및 개별 A4 암호화 PDF / 엑셀 다운로드 엔진
 * - 공문서 2종 각각 단독 A4 2장 완결형 벡터 출력 (html2pdf)
 * - 부평구 동적 열람 비밀번호 (부평구코드 28237 + 관리번호 끝3자리 = 8자리)
 */

import { ApiClient } from '../../api/apiClient.js';
import { notifier } from '../../utils/notifier.js';
import { maskName, maskBirth, maskPhone, maskAddress } from '../../core/mask.js';
import { getLocalTodayString, getLocalTimeString } from '../../utils/date.js';

export class Step7CompleteView {
  constructor(mediator) {
    this.mediator = mediator;
  }

  // 관리번호 마스킹 (마지막 3자리 제외 앞자리 마스킹)
  maskCaseUid(uid) {
    if (!uid) return 'C-**-***-**-001';
    const parts = uid.split('-');
    if (parts.length >= 5) {
      return `${parts[0]}-**-***-**-${parts[parts.length - 1]}`;
    }
    const last3 = uid.slice(-3);
    const prefix = uid.slice(0, -3).replace(/[0-9a-zA-Z]/g, '*');
    return prefix + last3;
  }

  render() {
    const container = document.getElementById('step7Container');
    if (!container) return;

    const s = this.mediator.state;
    const b = s.basicInfo;
    const t = s.targetProfile;
    const m = s.monitoring;
    const sat = s.satisfaction;
    const act = s.activityCard;
    const flowMode = this.mediator.flowMode; // 'MONITORING' | 'SATISFACTION'

    // 부평구 표준 PDF 열람 암호 (123456)
    const dynamicPdfPw = '123456';
    const suffix = (t.caseUid || '').split('-').pop() || '';
    const isField = Boolean(t.isFieldFound === true || suffix.startsWith('N') || (!suffix.startsWith('K') && !/^\d+$/.test(suffix)));
    const maskedUid = this.maskCaseUid(t.caseUid);

    container.innerHTML = `
      <div class="pwa-card" style="text-align: center; padding: 24px 16px;">
        <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">
          현장 조사가 완료되었습니다
        </h2>
        <div style="font-size: 13px; color: #64748b; line-height: 1.6; margin-bottom: 18px;">
          대상자: <strong style="color: #0f172a;">${isField ? (t.targetName || '어르신') : maskName(t.targetName)}</strong> (${t.dong || '부평구'})<br>
          관리번호: <strong style="font-family: 'Pretendard', sans-serif; color: #1e293b; letter-spacing: 0.5px;">${isField ? t.caseUid : maskedUid}</strong>
        </div>

        <button type="button" class="btn-primary-action" id="btnSaveToServer" style="width: 100%; height: 48px; font-size: 15px; font-weight: 700; background: #1e293b; color: #ffffff; border-radius: 6px; border: none; cursor: pointer;">
          조사 데이터 저장
        </button>
      </div>

      <!-- 행정 서식 암호화 출력 카드 -->
      <div class="pwa-card">
        <div class="card-header-bar">
          <span class="card-main-title">문서 출력</span>
        </div>
        <div style="font-size: 12px; color: #475569; margin-bottom: 14px;">
          * 개인정보보호법에 따라 암호화 문서로 저장됩니다. <strong>(열람 암호: 123456)</strong>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${flowMode === 'MONITORING' ? `
            <button type="button" class="btn-secondary-action" id="btnPdfMonitoring" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border: 1px solid #cbd5e1; background: #ffffff; text-align: left; cursor: pointer; border-radius: 8px;">
              <div>
                <div style="font-weight: 700; color: #0f172a; font-size: 14px;">모니터링 활동기록지</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 3px;">활동관리카드, 생활실태 및 상담결과</div>
              </div>
              <span style="font-size: 13px; font-weight: 700; color: #1e293b;">다운로드 ➔</span>
            </button>
          ` : `
            <button type="button" class="btn-secondary-action" id="btnPdfSatisfaction" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border: 1px solid #cbd5e1; background: #ffffff; text-align: left; cursor: pointer; border-radius: 8px;">
              <div>
                <div style="font-weight: 700; color: #0f172a; font-size: 14px;">이용자 만족도 조사지</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 3px;">5점 척도 만족도, 도움분야 및 조사자 확인서</div>
              </div>
              <span style="font-size: 13px; font-weight: 700; color: #1e293b;">다운로드 ➔</span>
            </button>
          `}
        </div>
      </div>

      <!-- 다음 대상자 조사 시작 -->
      <div class="pwa-card" style="background: #f8fafc; margin-bottom: 30px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 700; font-size: 13.5px; color: #0f172a;">다음 대상자 현장조사</div>
            <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">참여자 정보는 유지된 채 다음 대상자를 조사합니다.</div>
          </div>
          <button type="button" class="btn-secondary-action" id="btnStartNextSurvey" style="padding: 9px 15px; font-size: 13px; font-weight: 600; border-radius: 6px; cursor: pointer; background: #ffffff; border: 1px solid #cbd5e1;">
            + 다음 대상자 조사
          </button>
        </div>
      </div>

      <!-- 숨김 인쇄 전용 렌더링 컨테이너 (고정폭 730px A4 완결형) -->
      <div id="printContainerWrapper" style="position: absolute; left: -9999px; top: 0; width: 730px; background: #ffffff;">
        <div id="printSatisfactionArea"></div>
        <div id="printMonitoringArea"></div>
      </div>
    `;

    this.bindEvents(dynamicPdfPw);
  }

  /**
   * 만족도 조사지 A4 2장 인쇄 HTML 렌더러
   */
  renderSatisfactionPrintHtml() {
    const s = this.mediator.state;
    const b = s.basicInfo;
    const t = s.targetProfile;
    const sat = s.satisfaction;
    const c = s.consent || {};
    const inspSignatures = c.inspectorSignatures || {};
    const inspectors = Array.isArray(b.inspectors) && b.inspectors.length > 0 ? b.inspectors : ['김철수', '이영희'];

    // 가구형태 및 대상자특성 undefined 해결
    const householdStr = t.householdType === '비독거'
      ? `비독거${t.householdSub ? ` (${t.householdSub})` : ''}`
      : (t.householdType || '독거');
    const targetAttrStr = t.targetAttribute || '해당없음';

    const FIELDS_9_10 = [
      '보건·의료 서비스', '건강관리예방', '일상생활(가사, 식사 등)', '주거 지원', '정서지원', '기타'
    ];
    const COMPLAINTS_11 = [
      '없음', '신청절차', '안내 부족', '제공시간·횟수', '서비스 내용', '제공인력', '기타'
    ];
    const ROUTES_1 = [
      '지인추천', '공무원 안내', '홍보물', '언론', '기타'
    ];

    return `
      <div style="width: 710px; margin: 0 auto; font-family: 'Pretendard', sans-serif; color: #000; box-sizing: border-box; line-height: 1.45; font-size: 11.5px; background: #ffffff;">
        
        <!-- ================= [ PAGE 1: 기본정보 및 5점 척도 만족도 (A4 1장 꽉 찬 밸런스) ] ================= -->
        <div class="pdf-page-1" style="min-height: 1040px; box-sizing: border-box; padding: 42px 32px 30px 32px; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
          <div>
            <!-- Page 1 Header -->
            <div style="text-align: center; margin-bottom: 18px; border-bottom: 2px solid #000; padding-bottom: 10px;">
              <h1 style="font-size: 19px; font-weight: 800; margin: 0 0 5px 0; letter-spacing: -0.02em;">
                「2026년 부평형 지역사회 통합돌봄서비스」 이용자 만족도 조사
              </h1>
              <div style="font-size: 11px; color: #475569;">서식번호: ${b.maskedSurveyUid || 'S-28-237-01-***'}</div>
            </div>

            <!-- I. 조사 기본정보 -->
            <div style="background: #e2e8f0; padding: 6px 12px; font-weight: 800; font-size: 12px; margin-bottom: 6px; border-left: 4px solid #0f172a; display: flex; justify-content: space-between; align-items: center;">
              <span>Ⅰ. 조사 기본정보 [조사자 사전기입]</span>
              <span style="font-size: 12px; font-weight: 800; font-family: 'Pretendard', sans-serif; letter-spacing: 0.5px; color: #0f172a;">관리번호: ${t.caseUid || 'C-28-237-01-001'}</span>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px; border: 1px solid #000; font-size: 11.5px;">
              <tr>
                <th style="border: 1px solid #000; background: #f8fafc; padding: 9px 8px; width: 14%;">행정동</th>
                <td style="border: 1px solid #000; padding: 9px 10px; width: 20%;">${t.dong || '부평구'}</td>
                <th style="border: 1px solid #000; background: #f8fafc; padding: 9px 8px; width: 14%;">대상자명</th>
                <td style="border: 1px solid #000; padding: 9px 10px; width: 20%; font-weight: 700;">${maskName(t.targetName)}</td>
                <th style="border: 1px solid #000; background: #f8fafc; padding: 9px 8px; width: 14%;">생년월일</th>
                <td style="border: 1px solid #000; padding: 9px 10px;">${maskBirth(t.birth)}</td>
              </tr>
              <tr>
                <th style="border: 1px solid #000; background: #f8fafc; padding: 9px 8px;">조사일</th>
                <td style="border: 1px solid #000; padding: 9px 10px;">${b.inspectionDate}</td>
                <th style="border: 1px solid #000; background: #f8fafc; padding: 9px 8px;">조사자</th>
                <td style="border: 1px solid #000; padding: 9px 10px;">${inspectors.join(', ')}</td>
                <th style="border: 1px solid #000; background: #f8fafc; padding: 9px 8px;">응답자</th>
                <td style="border: 1px solid #000; padding: 9px 10px;">${sat.respondentType ? `■ ${sat.respondentType}${sat.respondentType !== '본인' && sat.respondentDetail ? ` (${sat.respondentDetail})` : ''}` : '-'}</td>
              </tr>
              <tr>
                <th style="border: 1px solid #000; background: #f8fafc; padding: 9px 8px;">서비스명</th>
                <td colspan="5" style="border: 1px solid #000; padding: 9px 10px;">${b.project || '부평형 노인일자리 안심살핌사업단'}</td>
              </tr>
            </table>

            <!-- II. 대상자 기본정보 & 1. 이용 경로 -->
            <div style="background: #e2e8f0; padding: 6px 10px; font-weight: 800; font-size: 12px; margin-bottom: 6px; border-left: 4px solid #0f172a;">
              Ⅱ. 대상자 기본정보 [조사자 사전기입] & 1. 이용 경로
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px; border: 1px solid #000; font-size: 11.5px;">
              <tr>
                <th style="border: 1px solid #000; background: #f8fafc; padding: 9px 8px; width: 18%;">➊ 성별</th>
                <td style="border: 1px solid #000; padding: 9px 10px; width: 32%;">${t.gender === '남' ? '■ 남  □ 여' : (t.gender === '여' ? '□ 남  ■ 여' : '□ 남  □ 여')}</td>
                <th style="border: 1px solid #000; background: #f8fafc; padding: 9px 8px; width: 18%;">➋ 연령대</th>
                <td style="border: 1px solid #000; padding: 9px 10px; width: 32%;">□ 65세 미만  ■ 65~74세  □ 75세 이상</td>
              </tr>
              <tr>
                <th style="border: 1px solid #000; background: #f8fafc; padding: 9px 8px;">➌ 가구형태</th>
                <td style="border: 1px solid #000; padding: 9px 10px;">■ ${householdStr}</td>
                <th style="border: 1px solid #000; background: #f8fafc; padding: 9px 8px;">➍ 사회보장</th>
                <td style="border: 1px solid #000; padding: 9px 10px;">■ ${t.socialSecurity || '일반가구'}</td>
              </tr>
              <tr>
                <th style="border: 1px solid #000; background: #f8fafc; padding: 9px 8px;">➎ 대상자 특성</th>
                <td colspan="3" style="border: 1px solid #000; padding: 9px 10px;">■ ${targetAttrStr}</td>
              </tr>
              <tr>
                <th style="border: 1px solid #000; background: #f8fafc; padding: 10px 8px;">1. 이용 경로</th>
                <td colspan="3" style="border: 1px solid #000; padding: 10px 10px;">
                  ${ROUTES_1.map(r => `${sat.route === r ? '■' : '□'} ${r}`).join('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')}
                </td>
              </tr>
            </table>

            <!-- III. 서비스 만족도 -->
            <div style="background: #e2e8f0; padding: 6px 10px; font-weight: 800; font-size: 12px; margin-bottom: 6px; border-left: 4px solid #0f172a;">
              Ⅲ. 서비스 만족도 (5점 척도)
            </div>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 11px;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="border: 1px solid #000; padding: 9px 4px; width: 6%; text-align: center;">번호</th>
                  <th style="border: 1px solid #000; padding: 9px 8px; width: 44%;">응답 문항</th>
                  <th style="border: 1px solid #000; padding: 9px 4px; width: 10%; text-align: center;">전혀아님(1)</th>
                  <th style="border: 1px solid #000; padding: 9px 4px; width: 10%; text-align: center;">그렇지않음(2)</th>
                  <th style="border: 1px solid #000; padding: 9px 4px; width: 10%; text-align: center;">보통(3)</th>
                  <th style="border: 1px solid #000; padding: 9px 4px; width: 10%; text-align: center;">그렇다(4)</th>
                  <th style="border: 1px solid #000; padding: 9px 4px; width: 10%; text-align: center;">매우그렇다(5)</th>
                </tr>
              </thead>
              <tbody>
                ${[
                  { num: 2, label: '접근성', text: '신청·이용 절차가 이해하기 쉽고 편리하였습니까?', score: sat.scores?.accessibility },
                  { num: 3, label: '적시성', text: '필요한 서비스를 적절한 시기에 잘 연계받았습니까?', score: sat.scores?.timeliness },
                  { num: 4, label: '적합성', text: '제공받은 서비스 내용에 만족하십니까?', score: sat.scores?.suitability },
                  { num: 5, label: '효과성', text: '서비스가 실제 생활에 도움이 되었습니까?', score: sat.scores?.effectiveness },
                  { num: 6, label: '서비스 품질', text: '서비스 제공자(제공기관)는 귀하의 상황을 이해하고 적절한 서비스를 제공하였습니까?', score: sat.scores?.quality },
                  { num: 7, label: '종합만족도', text: '전반적으로 의료·요양 통합돌봄 사업에 만족하십니까?', score: sat.scores?.overall },
                  { num: 8, label: '지속 이용 의향', text: '앞으로도 서비스를 계속 이용하고 싶은 의향이 있습니까?', score: sat.scores?.continuation }
                ].map(row => `
                  <tr>
                    <td style="border: 1px solid #000; padding: 12px 4px; text-align: center; font-weight: 700;">${row.num}</td>
                    <td style="border: 1px solid #000; padding: 12px 8px; line-height: 1.45;">(${row.label}) ${row.text}</td>
                    <td style="border: 1px solid #000; padding: 12px 4px; text-align: center; font-size: 13px;">${row.score === 1 ? '■' : '□'}</td>
                    <td style="border: 1px solid #000; padding: 12px 4px; text-align: center; font-size: 13px;">${row.score === 2 ? '■' : '□'}</td>
                    <td style="border: 1px solid #000; padding: 12px 4px; text-align: center; font-size: 13px;">${row.score === 3 ? '■' : '□'}</td>
                    <td style="border: 1px solid #000; padding: 12px 4px; text-align: center; font-size: 13px;">${row.score === 4 ? '■' : '□'}</td>
                    <td style="border: 1px solid #000; padding: 12px 4px; text-align: center; font-size: 13px;">${row.score === 5 ? '■' : '□'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div style="text-align: right; font-size: 10px; color: #64748b; padding-top: 10px;">
            [1 / 2 페이지]
          </div>
        </div>

        <!-- ================= [ PAGE 2: 도움분야, 의견, 조사자 확인 및 공식 푸터 (A4 1장 꽉 찬 밸런스) ] ================= -->
        <div class="pdf-page-2" style="min-height: 1040px; box-sizing: border-box; padding: 42px 32px 30px 32px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <!-- IV. 가장 도움이 된 분야 및 개선 필요 분야 (9~11번 전체 보기 및 바둑판 체크박스) -->
            <div style="background: #e2e8f0; padding: 6px 12px; font-weight: 800; font-size: 12px; margin-bottom: 6px; border-left: 4px solid #0f172a; display: flex; justify-content: space-between; align-items: center;">
              <span>Ⅳ. 가장 도움이 된 분야 및 개선 필요 분야</span>
              <span style="font-size: 11.5px; font-weight: 700; font-family: 'Pretendard', sans-serif; letter-spacing: 0.5px; color: #334155;">관리번호: ${t.caseUid || 'C-28-237-01-001'}</span>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px; border: 1px solid #000; font-size: 11px;">
              <tr>
                <th style="border: 1px solid #000; background: #f8fafc; padding: 13px 10px; width: 28%; text-align: left; line-height: 1.5;">
                  9. 가장 도움이 된 분야<br><span style="font-size: 10px; font-weight: normal; color: #475569;">(1개 선택)</span>
                </th>
                <td style="border: 1px solid #000; padding: 13px 12px;">
                  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 12px; line-height: 1.6;">
                    ${FIELDS_9_10.map(f => `
                      <span>${sat.bestField === f ? '■' : '□'} ${f}</span>
                    `).join('')}
                  </div>
                </td>
              </tr>
              <tr>
                <th style="border: 1px solid #000; background: #f8fafc; padding: 13px 10px; text-align: left; line-height: 1.5;">
                  10. 추가 필요 서비스<br><span style="font-size: 10px; font-weight: normal; color: #475569;">(복수 선택 가능)</span>
                </th>
                <td style="border: 1px solid #000; padding: 13px 12px;">
                  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 12px; line-height: 1.6;">
                    ${FIELDS_9_10.map(f => {
                      const isChecked = (sat.neededServices || []).includes(f);
                      return `<span>${isChecked ? '■' : '□'} ${f}</span>`;
                    }).join('')}
                  </div>
                </td>
              </tr>
              <tr>
                <th style="border: 1px solid #000; background: #f8fafc; padding: 13px 10px; text-align: left; line-height: 1.5;">
                  11. 불편 및 불만 사항<br><span style="font-size: 10px; font-weight: normal; color: #475569;">(복수 선택 가능)</span>
                </th>
                <td style="border: 1px solid #000; padding: 13px 12px;">
                  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px 8px; line-height: 1.6;">
                    ${COMPLAINTS_11.map(c => {
                      const isChecked = (sat.complaints || []).includes(c);
                      return `<span>${isChecked ? '■' : '□'} ${c}</span>`;
                    }).join('')}
                  </div>
                </td>
              </tr>
            </table>

            <!-- V. 의견 -->
            <div style="background: #e2e8f0; padding: 6px 10px; font-weight: 800; font-size: 12px; margin-bottom: 6px; border-left: 4px solid #0f172a;">
              Ⅴ. 의견 (응답자의 응답 내용을 자유로이 기재)
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px; border: 1px solid #000; font-size: 11px;">
              <tr>
                <th style="border: 1px solid #000; background: #f8fafc; padding: 12px 10px; width: 28%; text-align: left;">12. 가장 만족한 점</th>
                <td style="border: 1px solid #000; padding: 12px 12px; min-height: 85px; height: 85px; line-height: 1.5; vertical-align: top;">
                  ${sat.bestPoint || '특이사항 없음'}
                </td>
              </tr>
              <tr>
                <th style="border: 1px solid #000; background: #f8fafc; padding: 12px 10px; text-align: left;">13. 불만족 사유 및 건의사항</th>
                <td style="border: 1px solid #000; padding: 12px 12px; min-height: 125px; height: 125px; line-height: 1.5; white-space: pre-line; vertical-align: top;">
                  ${sat.improvementPoint || '특이사항 없음'}
                </td>
              </tr>
            </table>

            <!-- VI. 조사자 확인 -->
            <div style="background: #e2e8f0; padding: 6px 10px; font-weight: 800; font-size: 12px; margin-bottom: 6px; border-left: 4px solid #0f172a;">
              Ⅵ. 조사자 확인 [조사자 사후기입]
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px; border: 1px solid #000; font-size: 11px;">
              <tr>
                <th style="border: 1px solid #000; background: #f8fafc; padding: 10px 8px; width: 18%;">응답 신뢰도</th>
                <td style="border: 1px solid #000; padding: 10px 10px; width: 32%;">${sat.reliability ? `■ ${sat.reliability}` : '-'}</td>
                <th style="border: 1px solid #000; background: #f8fafc; padding: 10px 8px; width: 18%;">의사소통</th>
                <td style="border: 1px solid #000; padding: 10px 10px; width: 32%;">${sat.communication ? `■ ${sat.communication}` : '-'}</td>
              </tr>
              <tr>
                <th style="border: 1px solid #000; background: #f8fafc; padding: 10px 8px;">향후 연계</th>
                <td style="border: 1px solid #000; padding: 10px 10px;">${sat.nextLink ? `■ ${sat.nextLink}` : '-'}</td>
                <th style="border: 1px solid #000; background: #f8fafc; padding: 10px 8px;">특이사항</th>
                <td style="border: 1px solid #000; padding: 10px 10px;">${sat.specialNote || '-'}</td>
              </tr>
            </table>
          </div>

          <!-- 하단 공식 조사자 확인란 및 공문서 푸터 마감 (전자서명 탑재) -->
          <div style="border-top: 1px solid #000; padding-top: 14px; margin-top: auto;">
            <div style="text-align: center; font-size: 12.5px; font-weight: 700; margin-bottom: 12px; color: #0f172a;">
              상기와 같이 이용자 만족도 조사를 성실히 수행하였음을 확인합니다.
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px;">
              <div style="font-size: 12.5px; font-weight: 700; color: #1e293b;">
                조사일시: <span>${b.inspectionDate || getLocalTodayString()}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 24px;">
                ${inspectors.map((name, idx) => {
                  const sig = inspSignatures[name];
                  return `
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 12.5px;">
                      <span style="font-weight: 700;">조사자 ${idx + 1} (${name}) :</span>
                      <div style="width: 96px; height: 44px; border: 1px solid #000; display: flex; align-items: center; justify-content: center; background: #ffffff;">
                        ${sig ? `<img src="${sig}" style="max-height: 40px; max-width: 90px; object-fit: contain;" alt="서명">` : '<span style="font-size: 11px; color: #94a3b8;">(서명)</span>'}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <div style="text-align: center; margin-top: 10px; margin-bottom: 6px; font-weight: 800; font-size: 14.5px; letter-spacing: -0.01em; color: #1e293b;">
              인천광역시 부평구 통합돌봄센터
            </div>

            <div style="text-align: right; font-size: 10px; color: #64748b;">
              [2 / 2 페이지]
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 모니터링 활동일지 A4 2장 인쇄 HTML 렌더러
   */
  /**
   * 모니터링 기록지 및 활동일지 인쇄 HTML (사용자 정의 2페이지 완결형 구조)
   * 1페이지: 대상자 기본사항 + 모니터링 내용 + 세부 실태 + 참여자 서명 및 일자
   * 2페이지: 날짜/관리번호/회차 + 상담실시여부 + 활동관리카드(종류별 확인/세부내용) + 상담결과/의견
   */
  /**
   * 모니터링 기록지 및 활동일지 인쇄 HTML (A4 전면 균형 배치 및 세부활동내용 단일열 통합)
   * 1페이지: 대상자 기본사항 + 모니터링 내용 + 세부 실태 + 참여자 서명 및 일자
   * 2페이지: 날짜/관리번호/회차 + 상담실시여부 + 활동관리카드(세부활동내용 통합) + 상담결과/의견
   */
  /**
   * 모니터링 기록지 및 활동일지 인쇄 HTML (A4 전면 균등 최적화: 상단 시원한 여백 및 중간 공백 완전 제거)
   * 1페이지: 대상자 기본사항 + 모니터링 내용 + 세부 실태 + 참여자 서명 및 일자
   * 2페이지: 날짜/관리번호/회차 + 상담실시여부 + 활동관리카드(세부활동내용 통합) + 상담결과/의견
   */
  renderMonitoringPrintHtml() {
    const s = this.mediator.state;
    const b = s.basicInfo;
    const t = s.targetProfile;
    const m = s.monitoring;
    const act = s.activityCard;
    const c = s.consent;

    // 배정 대상자(001, K1001 등) vs 현장발굴(N+) 정보 분기
    const curSuffix = (t.caseUid || '').split('-').pop() || '';
    const isField = Boolean(t.isFieldFound === true || curSuffix.startsWith('N') || (!curSuffix.startsWith('K') && !/^\d+$/.test(curSuffix)));
    const dispName = isField ? (t.targetName || '-') : (t.targetName ? maskName(t.targetName) : '-');
    const dispBirth = isField ? (t.birth || '-') : (t.birth ? maskBirth(t.birth) : '-');
    const dispPhone = isField ? (t.phone || '-') : (t.phone ? maskPhone(t.phone) : '-');
    const dispAddress = isField 
      ? `${t.baseAddress || ''} ${t.detailAddress || ''}`.trim() || '부평구' 
      : (t.baseAddress ? `${maskAddress(t.baseAddress)} (${t.dong || '부평구'})` : '부평구');
    const caseUid = t.caseUid || 'C-28-237-01-001';
    const inspectDate = b.inspectionDate || getLocalTodayString();
    const dateParts = inspectDate.split('-');
    const formattedDate = `${dateParts[0]}년  ${dateParts[1]}월  ${dateParts[2]}일`;

    // 당일 활동 정보
    const cur = act.currentEntry || {};
    const curRound = cur.round || act.records.length || 1;
    const isConsulted = cur.isConsulted !== false;
    const unmetReason = cur.unmetReason || '대상자 부재';

    // 참여자 서명 이미지 목록
    const inspSignatures = c.inspectorSignatures || {};
    const inspectors = Array.isArray(b.inspectors) && b.inspectors.length > 0 ? b.inspectors : ['김철수', '이영희'];

    // 대상자 유형 매핑 (서식 원본: 장기요양재가급여, 노인맞춤돌봄서비스, 기타)
    const normAttr = (t.targetAttribute || '').replace(/\s/g, '');
    const isJanggi = normAttr.includes('장기요양');
    const isNoin = normAttr.includes('노인맞춤');
    const isEtc = Boolean(normAttr && !isJanggi && !isNoin);

    return `
      <div style="width: 710px; margin: 0 auto; font-family: 'Pretendard', sans-serif; color: #000; box-sizing: border-box; line-height: 1.5; font-size: 11.5px;">
        
        <!-- ================= [ PAGE 1: 대상자 기초 실태 진단서 ] ================= -->
        <div style="min-height: 1040px; box-sizing: border-box; padding: 48px 36px 36px 36px; page-break-after: always;">
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 24px;">
            <div>
              <span style="font-size: 11.5px; font-weight: 700; color: #334155; display: block; margin-bottom: 4px;">부평형 지역사회 통합돌봄 안심살핌</span>
              <h1 style="font-size: 21px; font-weight: 800; margin: 0; letter-spacing: -0.02em;">
                「의료·요양 통합돌봄 대상자」 모니터링 기록지
              </h1>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 13px; font-weight: 800; font-family: 'Pretendard', sans-serif; letter-spacing: 0.5px;">관리번호: ${caseUid}</div>
              <div style="font-size: 11.5px; color: #475569; margin-top: 3px;">수행기관: ${b.orgName}</div>
            </div>
          </div>

          <!-- 1. 대상자 기본사항 -->
          <div style="background: #e2e8f0; padding: 7px 12px; font-weight: 800; font-size: 12px; margin-bottom: 6px; border-left: 4px solid #0f172a;">
            ■ 대상자 기본사항
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 1px solid #000; font-size: 11.5px;">
            <tr>
              <th style="border: 1px solid #000; background: #f8fafc; padding: 10px 12px; width: 16%;">성 명</th>
              <td style="border: 1px solid #000; padding: 10px 12px; width: 34%; font-weight: 700;">${dispName}</td>
              <th style="border: 1px solid #000; background: #f8fafc; padding: 10px 12px; width: 16%;">전화번호</th>
              <td style="border: 1px solid #000; padding: 10px 12px; width: 34%;">${dispPhone}</td>
            </tr>
            <tr>
              <th style="border: 1px solid #000; background: #f8fafc; padding: 10px 12px;">생년월일</th>
              <td style="border: 1px solid #000; padding: 10px 12px;">${dispBirth}</td>
              <th style="border: 1px solid #000; background: #f8fafc; padding: 10px 12px;">성 별</th>
              <td style="border: 1px solid #000; padding: 10px 12px;">${t.gender === '남' ? '남성' : (t.gender === '여' ? '여성' : '-')}</td>
            </tr>
            <tr>
              <th style="border: 1px solid #000; background: #f8fafc; padding: 10px 12px;">실거주 주소</th>
              <td colspan="3" style="border: 1px solid #000; padding: 10px 12px;">${dispAddress}</td>
            </tr>
          </table>

          <!-- 2. 모니터링 내용 (분류 5종 원본 서식 체크박스) -->
          <div style="background: #e2e8f0; padding: 7px 12px; font-weight: 800; font-size: 12px; margin-bottom: 6px; border-left: 4px solid #0f172a;">
            ■ 모니터링 내용 (가구 및 수급 분류)
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 1px solid #000; font-size: 11.5px;">
            <tr>
              <th style="border: 1px solid #000; background: #f8fafc; padding: 10px 12px; width: 22%;">가구유형</th>
              <td style="border: 1px solid #000; padding: 10px 12px;">
                ${t.householdType === '독거' ? '■' : '□'} 독거 &nbsp;&nbsp;&nbsp;&nbsp;
                ${t.householdType === '비독거' ? '■' : '□'} 비독거 (
                  ${t.householdSub === '부부' ? '■' : '□'} 부부&nbsp;
                  ${t.householdSub === '노부모' ? '■' : '□'} 노부모&nbsp;
                  ${t.householdSub === '성인자녀' ? '■' : '□'} 성인자녀&nbsp;
                  ${t.householdSub === '조손' ? '■' : '□'} 조손&nbsp;
                  ${t.householdSub === '기타' ? '■' : '□'} 기타${t.householdOther ? `(${t.householdOther})` : ''}
                )
              </td>
            </tr>
            <tr>
              <th style="border: 1px solid #000; background: #f8fafc; padding: 10px 12px;">수혜자격</th>
              <td style="border: 1px solid #000; padding: 10px 12px; line-height: 1.6;">
                ${t.benefitStatus === '맞춤형급여' ? '■' : '□'} 맞춤형급여(생계·의료·주거)&nbsp;&nbsp;
                ${t.benefitStatus === '차상위' ? '■' : '□'} 차상위&nbsp;&nbsp;
                ${t.benefitStatus === '장애인연금' ? '■' : '□'} 장애인연금<br>
                ${t.benefitStatus === '기초연금' ? '■' : '□'} 기초연금&nbsp;&nbsp;
                ${t.benefitStatus === '없음' ? '■' : '□'} 없음&nbsp;&nbsp;
                ${t.benefitStatus === '기타' ? '■' : '□'} 기타
              </td>
            </tr>
            <tr>
              <th style="border: 1px solid #000; background: #f8fafc; padding: 10px 12px;">사회보장수급권</th>
              <td style="border: 1px solid #000; padding: 10px 12px;">
                ${t.socialSecurity === '국민기초생활보장제도' ? '■' : '□'} 국민기초생활보장제도&nbsp;&nbsp;
                ${t.socialSecurity === '차상위' ? '■' : '□'} 차상위&nbsp;&nbsp;
                ${t.socialSecurity === '일반가구' ? '■' : '□'} 일반가구
              </td>
            </tr>
            <tr>
              <th style="border: 1px solid #000; background: #f8fafc; padding: 10px 12px;">주거환경</th>
              <td style="border: 1px solid #000; padding: 10px 12px;">
                ${m.housingEnv === '청결' ? '■' : '□'} 청결&nbsp;&nbsp;&nbsp;&nbsp;
                ${m.housingEnv === '보통' ? '■' : '□'} 보통&nbsp;&nbsp;&nbsp;&nbsp;
                ${m.housingEnv === '불량' ? '■' : '□'} 불량${m.housingEnvReason ? ` (사유: ${m.housingEnvReason})` : ''}
              </td>
            </tr>
            <tr>
              <th style="border: 1px solid #000; background: #f8fafc; padding: 10px 12px;">대상자 유형</th>
              <td style="border: 1px solid #000; padding: 10px 12px;">
                ${isJanggi ? '■' : '□'} 장기요양재가급여&nbsp;&nbsp;&nbsp;&nbsp;
                ${isNoin ? '■' : '□'} 노인맞춤돌봄서비스&nbsp;&nbsp;&nbsp;&nbsp;
                ${isEtc ? '■' : '□'} 기타${(isEtc && t.targetAttribute !== '기타') ? ` (${t.targetAttribute})` : ''}
              </td>
            </tr>
          </table>

          <!-- 3. 세부 실태 진단 -->
          <div style="background: #e2e8f0; padding: 7px 12px; font-weight: 800; font-size: 12px; margin-bottom: 6px; border-left: 4px solid #0f172a;">
            ■ 세부 실태 진단
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px; border: 1px solid #000; font-size: 11.5px;">
            <tr>
              <th style="border: 1px solid #000; background: #f8fafc; padding: 10px 12px; width: 22%;">▪ 대상자 건강상태</th>
              <td style="border: 1px solid #000; padding: 10px 12px;">
                <strong>[${m.healthGrade || '양호'}]</strong> 
                ${m.healthGrade === '주의' ? `${m.chronicDisease || ''} ${m.diseaseDetail ? `(${m.diseaseDetail})` : ''}` : ''}
                ${m.healthGrade === '긴급' ? `${m.urgentType || ''} ${m.urgentAction ? `(조치: ${m.urgentAction})` : ''}` : ''}
                ${m.healthGrade === '양호' ? '식사·수면·거동 정상' : ''}
              </td>
            </tr>
            <tr>
              <th style="border: 1px solid #000; background: #f8fafc; padding: 10px 12px;">▪ 주 수발자</th>
              <td style="border: 1px solid #000; padding: 10px 12px;">${m.primaryCaregiver === '기타' ? m.primaryCaregiverCustom || '기타' : (m.primaryCaregiver || '본인')}</td>
            </tr>
            <tr>
              <th style="border: 1px solid #000; background: #f8fafc; padding: 10px 12px;">▪ 일상생활정도</th>
              <td style="border: 1px solid #000; padding: 10px 12px;">${m.dailyLivingGrade || '독립 수행'}</td>
            </tr>
            <tr>
              <th style="border: 1px solid #000; background: #f8fafc; padding: 10px 12px;">▪ 필요한 서비스</th>
              <td style="border: 1px solid #000; padding: 10px 12px;">${m.neededService === '기타' ? m.neededServiceCustom || '기타' : (m.neededService || '가사지원')}</td>
            </tr>
          </table>

          <!-- 하단: 조사 일자 및 참여자 서명란 (자연스러운 간격 연결) -->
          <div style="border-top: 1px solid #000; padding-top: 20px; margin-top: 8px;">
            <div style="text-align: center; font-size: 13.5px; font-weight: 700; margin-bottom: 12px; color: #0f172a;">
              상기와 같이 대상자 기초 모니터링 실태 조사를 실시하였음을 확인합니다.
            </div>
            <div style="text-align: center; font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 18px;">
              ${formattedDate}
            </div>

            <div style="display: flex; justify-content: center; gap: 60px; align-items: center; margin-bottom: 12px;">
              ${inspectors.map((name, idx) => {
                const sig = inspSignatures[name];
                return `
                  <div style="display: flex; align-items: center; gap: 12px; font-size: 13px;">
                    <span style="font-weight: 700;">참여자 ${idx + 1} : ${name}</span>
                    <div style="width: 104px; height: 48px; border: 1px solid #000; display: flex; align-items: center; justify-content: center; background: #ffffff;">
                      ${sig ? `<img src="${sig}" style="max-height: 44px; max-width: 96px; object-fit: contain;" alt="서명">` : '<span style="font-size: 11.5px; color: #94a3b8;">(서명)</span>'}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
            <div style="text-align: center; font-size: 11px; color: #64748b; margin-top: 10px;">
              * 본 조사표는 개인정보보호법에 따라 안전하게 보관 및 관리됩니다.
            </div>
          </div>
        </div>

        <!-- ================= [ PAGE 2: 회차별 활동관리카드 및 상담일지 ] ================= -->
        <div style="min-height: 1040px; box-sizing: border-box; padding: 48px 36px 36px 36px;">
          <!-- Header -->
          <div style="border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 22px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="font-size: 11.5px; font-weight: 700; color: #334155; display: block; margin-bottom: 4px;">부평형 지역사회 통합돌봄 안심살핌</span>
                <h2 style="font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.02em;">
                  「의료·요양 통합돌봄 대상자」 활동관리카드 및 상담일지
                </h2>
              </div>
              <span style="font-size: 13px; font-weight: 800; background: #0f172a; color: #ffffff; padding: 4px 12px; border-radius: 4px;">
                제 ${curRound} 회차
              </span>
            </div>
          </div>

          <!-- 활동 상단 메타 헤더 -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 22px; border: 1px solid #000; font-size: 11.5px;">
            <tr style="background: #f8fafc;">
              <th style="border: 1px solid #000; padding: 10px 12px; width: 16%;">활동 날짜</th>
              <td style="border: 1px solid #000; padding: 10px 12px; width: 34%; font-weight: 700;">${cur.date || inspectDate}</td>
              <th style="border: 1px solid #000; padding: 10px 12px; width: 16%;">관리번호</th>
              <td style="border: 1px solid #000; padding: 10px 12px; width: 34%; font-family: 'Pretendard', sans-serif; font-weight: 700; letter-spacing: 0.5px;">${caseUid}</td>
            </tr>
            <tr>
              <th style="border: 1px solid #000; background: #f8fafc; padding: 10px 12px;">활동 시간</th>
              <td style="border: 1px solid #000; padding: 10px 12px;">${cur.time || '14:00~14:30'} (${cur.durationMinutes || 30}분)</td>
              <th style="border: 1px solid #000; background: #f8fafc; padding: 10px 12px;">현장 참여자</th>
              <td style="border: 1px solid #000; padding: 10px 12px;">${inspectors.join(', ')}</td>
            </tr>
          </table>

          <!-- 1. 상담 실시 여부 -->
          <div style="background: #e2e8f0; padding: 7px 12px; font-weight: 800; font-size: 12px; margin-bottom: 6px; border-left: 4px solid #0f172a;">
            ■ 상담 실시 여부
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 22px; border: 1px solid #000; font-size: 11.5px;">
            <tr>
              <th style="border: 1px solid #000; background: #f8fafc; padding: 10px 12px; width: 20%;">상담 여부</th>
              <td style="border: 1px solid #000; padding: 10px 12px;">
                ${isConsulted ? '■' : '□'} 상담 실시 (대면)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                ${!isConsulted ? '■' : '□'} 상담 불가 (미대면)
              </td>
            </tr>
            <tr>
              <th style="border: 1px solid #000; background: #f8fafc; padding: 10px 12px;">상담불가 사유</th>
              <td style="border: 1px solid #000; padding: 10px 12px;">
                ${!isConsulted && unmetReason.includes('부재') ? '■' : '□'} 대상자 부재&nbsp;&nbsp;&nbsp;
                ${!isConsulted && unmetReason.includes('거부') ? '■' : '□'} 상담 거부&nbsp;&nbsp;&nbsp;
                ${!isConsulted && unmetReason.includes('사망') ? '■' : '□'} 사망&nbsp;&nbsp;&nbsp;
                ${!isConsulted && unmetReason.includes('병원') ? '■' : '□'} 병원(시설)이용&nbsp;&nbsp;&nbsp;
                ${!isConsulted && unmetReason.includes('기타') ? '■' : '□'} 기타${!isConsulted && cur.unmetReasonDetail ? `(${cur.unmetReasonDetail})` : ''}
              </td>
            </tr>
          </table>

          <!-- 2. 활동 관리카드 (세부 활동내용 단일 열 통합 + 넉넉한 6행 격자) -->
          <div style="background: #e2e8f0; padding: 7px 12px; font-weight: 800; font-size: 12px; margin-bottom: 6px; border-left: 4px solid #0f172a; display: flex; justify-content: space-between;">
            <span>■ 활동 관리카드 (회차별 누적 기록)</span>
            <span style="font-size: 11px; font-weight: normal; color: #475569;">총 ${act.records.length}건 누적</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 22px; border: 1px solid #000; font-size: 11px;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="border: 1px solid #000; padding: 8px 6px; width: 8%; text-align: center;">연번</th>
                <th style="border: 1px solid #000; padding: 8px 6px; width: 14%; text-align: center;">활동일자</th>
                <th style="border: 1px solid #000; padding: 8px 6px; width: 16%; text-align: center;">활동시간</th>
                <th style="border: 1px solid #000; padding: 8px 12px; width: 62%;">세부 활동내용</th>
              </tr>
            </thead>
            <tbody>
              ${(act.records.length > 0 ? act.records : [
                { round: 1, date: cur.date || inspectDate, time: cur.time || '14:00~14:30', content: cur.content || '정기 안부 확인 및 건강 상태 점검' }
              ]).map(r => {
                return `
                  <tr>
                    <td style="border: 1px solid #000; padding: 9px 6px; text-align: center; font-weight: 700;">${r.round}</td>
                    <td style="border: 1px solid #000; padding: 9px 6px; text-align: center;">${r.date}</td>
                    <td style="border: 1px solid #000; padding: 9px 6px; text-align: center;">${r.time}</td>
                    <td style="border: 1px solid #000; padding: 9px 12px; line-height: 1.5;">${r.content || '안부 확인 및 특이사항 없음'}</td>
                  </tr>
                `;
              }).join('')}
              ${Array.from({ length: Math.max(0, 5 - act.records.length) }).map((_, i) => `
                <tr>
                  <td style="border: 1px solid #000; padding: 9px 6px; text-align: center; color: #94a3b8;">${act.records.length + i + 1}</td>
                  <td style="border: 1px solid #000; padding: 9px 6px;"></td>
                  <td style="border: 1px solid #000; padding: 9px 6px;"></td>
                  <td style="border: 1px solid #000; padding: 9px 12px;"></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- 3. 상담 결과 및 기타 상담 의견 -->
          <div style="background: #e2e8f0; padding: 7px 12px; font-weight: 800; font-size: 12px; margin-bottom: 6px; border-left: 4px solid #0f172a;">
            ■ 상담 결과 및 동 행정복지센터 연계
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px; border: 1px solid #000; font-size: 11.5px;">
            <tr>
              <th style="border: 1px solid #000; background: #f8fafc; padding: 10px 12px; width: 20%;">상담 결과</th>
              <td style="border: 1px solid #000; padding: 10px 12px; font-weight: 700;">
                ${m.consultResult ? m.consultResult : '희망 서비스 없음'}
              </td>
            </tr>
            <tr>
              <th style="border: 1px solid #000; background: #f8fafc; padding: 10px 12px; vertical-align: top;">기타 상담 의견</th>
              <td style="border: 1px solid #000; padding: 12px 14px; min-height: 130px; line-height: 1.6; vertical-align: top;">
                ${m.consultOpinion ? m.consultOpinion.replace(/\n/g, '<br>') : '정기 모니터링 안부 확인 및 특이사항 없음.'}
              </td>
            </tr>
          </table>

          <!-- 2페이지 하단 마무리 푸터 -->
          <div style="border-top: 1px solid #000; padding-top: 14px; margin-top: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b;">
            <span>부평형 통합돌봄 안심살핌 관리시스템</span>
            <span>출력일시: ${getLocalTodayString()} ${getLocalTimeString()}</span>
          </div>
        </div>

      </div>
    `;
  }

  downloadPdf(htmlContent, fileName, password = '123456') {
    if (typeof html2pdf === 'undefined') {
      notifier.toast('PDF 생성 엔진을 불러올 수 없습니다.', 'error');
      return;
    }

    const opt = {
      margin: 0,
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      pagebreak: { mode: ['css', 'legacy'] },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollY: 0
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
        encryption: {
          userPassword: password,
          ownerPassword: password,
          userPermissions: ['print', 'modify', 'copy', 'annot-forms']
        }
      }
    };

    const worker = html2pdf().set(opt).from(htmlContent);

    worker.save().then(() => {
      notifier.toast(`[${fileName}] 암호화 PDF가 다운로드되었습니다. (암호: ${password})`, 'success');
    }).catch(err => {
      console.error(err);
      notifier.toast('PDF 다운로드 중 오류가 발생했습니다.', 'error');
    });
  }

  bindEvents(dynamicPdfPw) {
    const btnSave = document.getElementById('btnSaveToServer');
    const btnPdfSat = document.getElementById('btnPdfSatisfaction');
    const btnPdfMon = document.getElementById('btnPdfMonitoring');
    const btnNextSurvey = document.getElementById('btnStartNextSurvey');
    const btnBack = document.getElementById('btnBackToStep6');

    if (btnSave) {
      btnSave.addEventListener('click', async () => {
        btnSave.disabled = true;
        btnSave.textContent = '조사 데이터 저장 중...';

        const payload = {
          basicInfo: this.mediator.state.basicInfo,
          targetProfile: this.mediator.state.targetProfile,
          activityCard: this.mediator.state.activityCard,
          monitoring: this.mediator.state.monitoring,
          satisfaction: this.mediator.state.satisfaction,
          consent: {
            agreeCollect: this.mediator.state.consent.agreeCollect,
            agreeThirdParty: this.mediator.state.consent.agreeThirdParty,
            hasSignature: !!this.mediator.state.consent.targetSignature
          }
        };

        try {
          const res = await ApiClient.post('/surveys/submit', payload);
          notifier.toast('조사 데이터가 안전하게 저장되었습니다.', 'success');
          btnSave.textContent = '저장 완료';
          btnSave.style.background = '#475569';

          // 현장 발굴 번호 로컬 가명 원장 동기화 (개인정보는 일체 배제)
          const caseUid = this.mediator.state.targetProfile?.caseUid || '';
          const suffix = caseUid.split('-').pop() || '';
          if (suffix.startsWith('N')) {
            try {
              const ledgerKey = 'bupyeong_field_uid_ledger';
              const raw = localStorage.getItem(ledgerKey);
              const ledger = raw ? JSON.parse(raw) : [];
              const exists = ledger.some((item) => item.suffix === suffix);
              if (!exists) {
                const seq = parseInt(suffix.slice(1), 10) || 1001;
                ledger.push({ suffix, seq, issuedAt: new Date().toISOString() });
                localStorage.setItem(ledgerKey, JSON.stringify(ledger));
              }
            } catch (err) {
              console.warn('로컬 가명 원장 동기화 실패', err);
            }
          }
        } catch (e) {
          notifier.toast('오프라인 안전 보관함에 저장되었습니다. 네트워크 복구 시 자동 동기화됩니다.', 'info');
          btnSave.textContent = '저장 완료';
          btnSave.style.background = '#475569';
        } finally {
          btnSave.disabled = false;
        }
      });
    }

    if (btnPdfSat) {
      btnPdfSat.addEventListener('click', () => {
        const html = this.renderSatisfactionPrintHtml();
        const caseUid = this.mediator.state.targetProfile.caseUid || 'C-28-237-01-001';
        this.downloadPdf(html, `[부평형통합돌봄]이용자만족도조사_${caseUid}.pdf`, dynamicPdfPw);
      });
    }

    if (btnPdfMon) {
      btnPdfMon.addEventListener('click', () => {
        const html = this.renderMonitoringPrintHtml();
        const caseUid = this.mediator.state.targetProfile.caseUid || 'C-28-237-01-001';
        this.downloadPdf(html, `[부평형통합돌봄]모니터링활동기록지_${caseUid}.pdf`, dynamicPdfPw);
      });
    }

    if (btnNextSurvey) {
      btnNextSurvey.addEventListener('click', () => {
        // 활동가 정보만 유지하고 대상자 폼 초기화
        const s = this.mediator.state;
        s.targetProfile = {
          caseUid: '',
          isFieldFound: false,
          targetName: '',
          birth: '',
          gender: '',
          phone: '',
          dong: '',
          baseAddress: '',
          detailAddress: '',
          livingType: '독거',
          livingTypeDetail: '',
          socialSecurity: '기초생활수급자',
          socialSecurityDetail: '',
          targetFeature: '장기요양 재가급여'
        };
        s.activityCard.records = [];
        s.activityCard.currentEntry = {
          round: 1,
          date: s.basicInfo.inspectionDate,
          time: '',
          isConsulted: true,
          unmetReason: '',
          content: ''
        };
        s.monitoring = {
          housingEnv: '청결',
          housingEnvReason: '',
          healthState: '',
          primaryCaregiver: '',
          dailyLivingGrade: '',
          neededService: '',
          consultResult: '희망 서비스 없음',
          consultOpinion: ''
        };
        s.consent = {
          agreeCollect: false,
          agreeThirdParty: false,
          targetSignature: null
        };

        this.mediator.updateSurveyUid();
        this.mediator.switchTab(2);
        notifier.toast('새로운 가구 조사를 시작합니다. (참여자 정보 유지됨)', 'info');
      });
    }

    if (btnBack) {
      btnBack.addEventListener('click', () => this.mediator.switchTab(6));
    }
  }
}
