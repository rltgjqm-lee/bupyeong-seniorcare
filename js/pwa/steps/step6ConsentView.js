/**
 * @file step6ConsentView.js
 * @description PWA 현장조사 Step 6: 개인정보 수집·이용 동의서, 전자서명 패드 및 최종 검토 점프 뷰 (ESM)
 * - 게이트키퍼 PWA 표준 서명 모달 및 동의서 규격 100% 매핑
 * - 대상자 본인 서명 및 현장 참여자 2인 개별 전자서명 완비
 * - 제출 전 전 단계 데이터 요약 검토 및 원클릭 점프 수정 카드 제공
 */

import { signaturePad } from '../../utils/signaturePad.js';
import { notifier } from '../../utils/notifier.js';
import { maskName } from '../../core/mask.js';

export class Step6ConsentView {
  constructor(mediator) {
    this.mediator = mediator;
    this.isReviewOpen = false; // 최종 검토 기본 접힘
  }

  render() {
    const container = document.getElementById('step6Container');
    if (!container) return;

    const b = this.mediator.state.basicInfo;
    const t = this.mediator.state.targetProfile;
    const c = this.mediator.state.consent;
    const m = this.mediator.state.monitoring;
    const sat = this.mediator.state.satisfaction;
    const act = this.mediator.state.activityCard;

    if (!c.inspectorSignatures) {
      c.inspectorSignatures = {};
    }

    const inspectDate = b.inspectionDate || new Date().toISOString().slice(0, 10);
    const dateParts = inspectDate.split('-');
    const formattedDate = `${dateParts[0]}년  ${dateParts[1]}월  ${dateParts[2]}일`;

    container.innerHTML = `
      <div class="pwa-card">
        <div class="card-header-bar">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="uid-badge" style="background: #1e293b; color: #ffffff;">서비스 대상자용</span>
            <span class="card-main-title">개인정보 수집·이용 및 제공 동의서</span>
          </div>
          <span class="uid-badge">관리번호: ${t.caseUid || b.caseUid || 'C-28-237-01-001'}</span>
        </div>

        <div style="font-size: 11.5px; color: #475569; line-height: 1.5; margin-bottom: 12px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 12px; border-radius: 4px;">
          개인정보 보호법 규정에 따라 처리하는 개인정보의 수집 및 이용, 제3자 제공 목적, 개인정보의 보유 및 이용기간을 안내 드리오니 자세히 읽은 후 동의하여 주시기 바랍니다.
        </div>

        <!-- 1. 개인정보 수집·이용 내역 -->
        <div class="consent-box" style="margin-bottom: 14px;">
          <div class="consent-title" style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 6px;">■ 개인정보 수집·이용 내역</div>
          <table class="consent-table" style="width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 6px;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="width: 44%; border: 1px solid #cbd5e1; padding: 6px;">항목</th>
                <th style="width: 28%; border: 1px solid #cbd5e1; padding: 6px;">수집목적</th>
                <th style="width: 28%; border: 1px solid #cbd5e1; padding: 6px;">보유기간</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 6px; line-height: 1.4;">
                  • 대상자 정보(성명, 생년월일, 주소, 전화번호)<br>
                  • 서비스 제공에 필요한 정보(안부확인 사항)
                </td>
                <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: 600;">• 서비스 제공 등</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: 600;">• 서비스 종결 후 5년</td>
              </tr>
            </tbody>
          </table>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
            ※ 위의 개인정보 수집·이용에 대한 동의를 거부할 권리가 있습니다. 그러나 동의를 거부할 경우 원활한 서비스 제공 등에 일부 제한을 받을 수 있습니다.
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 8px 12px; border-radius: 4px; border: 1px solid #e2e8f0;">
            <div style="font-size: 12px; font-weight: 600; color: #1e293b;">☞ 개인정보 수집·이용에 동의하십니까?</div>
            <div style="display: flex; gap: 12px; font-size: 12px;">
              <label style="cursor: pointer; display: flex; align-items: center; gap: 3px;">
                <input type="radio" name="consentCollect" value="true" ${c.agreeCollect === true ? 'checked' : ''}> 동의함
              </label>
              <label style="cursor: pointer; display: flex; align-items: center; gap: 3px;">
                <input type="radio" name="consentCollect" value="false" ${c.agreeCollect === false ? 'checked' : ''}> 동의하지 않음
              </label>
            </div>
          </div>
        </div>

        <!-- 2. 개인정보 제3자 제공 내역 -->
        <div class="consent-box" style="margin-bottom: 14px;">
          <div class="consent-title" style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 6px;">■ 개인정보 제3자 제공 내역</div>
          <table class="consent-table" style="width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 6px;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="width: 44%; border: 1px solid #cbd5e1; padding: 6px;">제공하는 기관</th>
                <th style="width: 28%; border: 1px solid #cbd5e1; padding: 6px;">제공목적</th>
                <th style="width: 28%; border: 1px solid #cbd5e1; padding: 6px;">보유기간</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 6px; line-height: 1.4;">
                  • 정부부처 및 부평구, 동 행정복지센터, 서비스 제공기관 등
                </td>
                <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: 600;">• 통합돌봄 연계 및 심층상담</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: 600;">• 서비스 종결 후 5년</td>
              </tr>
            </tbody>
          </table>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
            ※ 위의 개인정보를 동 행정복지센터 등 제3자에게 제공하는데 동의를 거부할 권리가 있습니다.
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 8px 12px; border-radius: 4px; border: 1px solid #e2e8f0;">
            <div style="font-size: 12px; font-weight: 600; color: #1e293b;">☞ 개인정보 제3자 제공에 동의하십니까?</div>
            <div style="display: flex; gap: 12px; font-size: 12px;">
              <label style="cursor: pointer; display: flex; align-items: center; gap: 3px;">
                <input type="radio" name="consentThirdParty" value="true" ${c.agreeThirdParty === true ? 'checked' : ''}> 동의함
              </label>
              <label style="cursor: pointer; display: flex; align-items: center; gap: 3px;">
                <input type="radio" name="consentThirdParty" value="false" ${c.agreeThirdParty === false ? 'checked' : ''}> 동의하지 않음
              </label>
            </div>
          </div>
        </div>

        <!-- 서식 일자 중앙 표기 -->
        <div style="text-align: center; font-size: 13px; font-weight: 700; color: #0f172a; margin: 16px 0 12px 0;">
          ${dateParts[0]} . ${dateParts[1]} . ${dateParts[2]} .
        </div>

        <!-- 대상자 본인 서명란 -->
        <div class="sig-row-card" style="display: flex; justify-content: space-between; align-items: center; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
          <div class="sig-row-info">
            <span style="font-size: 11px; font-weight: 700; color: #475569; display: block;">서비스 대상자 (수혜자)</span>
            <span style="font-size: 14px; font-weight: 800; color: #0f172a; display: block; margin-top: 2px;">성명: ${t.targetName || '어르신'}</span>
          </div>
          <div class="sig-box-preview" id="sigBoxTarget" style="width: 130px; height: 56px; border: 1px dashed #94a3b8; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: #f8fafc;">
            ${c.targetSignature ? `
              <img src="${c.targetSignature}" style="max-width: 100%; max-height: 100%;" alt="대상자 서명">
            ` : `
              <span style="font-size: 12px; color: #64748b; font-weight: 600;">[터치 서명]</span>
            `}
          </div>
        </div>

        <!-- 현장 방문 참여자 2인 서명란 -->
        <div style="margin-top: 10px;">
          <div style="font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 6px;">현장 방문 살핌 참여자 서명</div>
          ${b.inspectors.map((name, idx) => `
            <div class="sig-row-card" style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px;">
              <div class="sig-row-info">
                <span style="font-size: 11px; font-weight: 600; color: #64748b; display: block;">참여자 ${idx + 1}</span>
                <span style="font-size: 13.5px; font-weight: 700; color: #0f172a; display: block; margin-top: 2px;">성명: ${name || '참여자'}</span>
              </div>
              <div class="sig-box-preview sig-box-inspector" data-insp-name="${name}" style="width: 130px; height: 50px; border: 1px dashed #94a3b8; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: #ffffff;">
                ${c.inspectorSignatures[name] ? `
                  <img src="${c.inspectorSignatures[name]}" style="max-width: 100%; max-height: 100%;" alt="${name} 서명">
                ` : `
                  <span style="font-size: 12px; color: #64748b; font-weight: 600;">[터치 서명]</span>
                `}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 최종 검토 요약 & 원클릭 점프 수정 카드 (아코디언 접기/펴기) -->
      <div class="pwa-card" id="cardDataReview" style="background: #ffffff; border: 1px solid #cbd5e1;">
        <div class="card-header-bar" id="headerToggleReview" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; padding-bottom: 2px;">
          <span class="card-main-title">조사 데이터 최종 검토</span>
          <span id="badgeReviewStatus" style="font-size: 11px; padding: 3px 8px; border-radius: 6px; font-weight: 600; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;">
            ${this.isReviewOpen ? '검토 접기 ▲' : '검토 내용 펼치기 (1~5단계) ▼'}
          </span>
        </div>

        <div id="bodyDataReview" style="display: ${this.isReviewOpen ? 'flex' : 'none'}; flex-direction: column; gap: 8px; margin-top: 10px; border-top: 1px solid #f1f5f9; padding-top: 10px;">
          <!-- 1단계: 참여자 및 기관 -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f8fafc; border-radius: 6px;">
            <div>
              <div style="font-size: 11px; font-weight: 700; color: #64748b;">1. 수행기관 및 참여자</div>
              <div style="font-size: 12.5px; color: #0f172a; font-weight: 600;">${b.orgName} (${b.inspectors.join(', ')})</div>
            </div>
            <button type="button" class="btn-jump-step" data-jump="1" style="font-size: 11.5px; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; background: #ffffff; cursor: pointer;">수정</button>
          </div>

          <!-- 2단계: 대상자 인적사항 -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f8fafc; border-radius: 6px;">
            <div>
              <div style="font-size: 11px; font-weight: 700; color: #64748b;">2. 대상자 기본정보</div>
              <div style="font-size: 12.5px; color: #0f172a; font-weight: 600;">${t.targetName || '미입력'} / ${t.gender || '미선택'} (${t.baseAddress || '주소확인'})</div>
            </div>
            <button type="button" class="btn-jump-step" data-jump="2" style="font-size: 11.5px; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; background: #ffffff; cursor: pointer;">수정</button>
          </div>

          <!-- 3단계: 공통 기초조사 -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f8fafc; border-radius: 6px;">
            <div>
              <div style="font-size: 11px; font-weight: 700; color: #64748b;">3. 기초조사 분류</div>
              <div style="font-size: 12.5px; color: #0f172a; font-weight: 600;">가구: ${t.householdType || '독거'} | 수급: ${t.socialSecurity || '일반'} | 특성: ${t.targetAttribute || '일반'}</div>
            </div>
            <button type="button" class="btn-jump-step" data-jump="3" style="font-size: 11.5px; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; background: #ffffff; cursor: pointer;">수정</button>
          </div>

          <!-- 4단계: 활동카드 및 시간 -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f8fafc; border-radius: 6px;">
            <div>
              <div style="font-size: 11px; font-weight: 700; color: #64748b;">4. 활동일지 및 근태 시간</div>
              <div style="font-size: 12.5px; color: #0f172a; font-weight: 600;">일자: ${act.currentEntry.date} | 시간: ${act.currentEntry.time} (${act.currentEntry.durationMinutes || 0}분)</div>
            </div>
            <button type="button" class="btn-jump-step" data-jump="4" style="font-size: 11.5px; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; background: #ffffff; cursor: pointer;">수정</button>
          </div>

          <!-- 5단계: 모니터링 / 만족도 -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f8fafc; border-radius: 6px;">
            <div>
              <div style="font-size: 11px; font-weight: 700; color: #64748b;">5. ${this.mediator.flowMode === 'MONITORING' ? '모니터링 및 상담결과' : '만족도 조사 결과'}</div>
              <div style="font-size: 12.5px; color: #0f172a; font-weight: 600;">
                ${this.mediator.flowMode === 'MONITORING' ? `건강: ${m.healthGrade || '양호'} | 판정: ${m.consultResult || '희망서비스 없음'}` : `응답: ${sat.respondentType} | 만족도 문항 작성완료`}
              </div>
            </div>
            <button type="button" class="btn-jump-step" data-jump="5" style="font-size: 11.5px; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; background: #ffffff; cursor: pointer;">수정</button>
          </div>
        </div>
      </div>

      <!-- 하단 액션 버튼: 이전 버튼 배제, 채도 낮춘 우측 정렬 버튼 -->
      <div style="display: flex; justify-content: flex-end; margin-top: 18px; margin-bottom: 30px;">
        <button type="button" class="btn-primary-action" id="btnNextToStep7" style="min-width: 180px; height: 46px; font-size: 14.5px; font-weight: 700; background: #1e293b; color: #ffffff; border-radius: 6px; border: none; cursor: pointer; padding: 0 20px;">
          저장 및 보고서 출력 (7단계) ➔
        </button>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const c = this.mediator.state.consent;
    const t = this.mediator.state.targetProfile;

    // 동의 라디오 이벤트
    document.querySelectorAll('input[name="consentCollect"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        c.agreeCollect = (e.target.value === 'true');
      });
    });

    document.querySelectorAll('input[name="consentThirdParty"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        c.agreeThirdParty = (e.target.value === 'true');
      });
    });

    // 대상자 서명 패드 모달 오픈
    const sigBoxTarget = document.getElementById('sigBoxTarget');
    if (sigBoxTarget) {
      sigBoxTarget.addEventListener('click', () => {
        const title = `${t.targetName || '어르신'} 전자 서명`;
        signaturePad.open(title, (dataUrl) => {
          c.targetSignature = dataUrl;
          sigBoxTarget.innerHTML = `<img src="${dataUrl}" style="max-width: 100%; max-height: 100%;" alt="대상자 서명">`;
        });
      });
    }

    // 참여자별 개별 서명 패드 모달 오픈
    document.querySelectorAll('.sig-box-inspector').forEach(box => {
      box.addEventListener('click', () => {
        const inspName = box.getAttribute('data-insp-name');
        const title = `참여자 (${inspName}) 전자 서명`;
        signaturePad.open(title, (dataUrl) => {
          c.inspectorSignatures[inspName] = dataUrl;
          box.innerHTML = `<img src="${dataUrl}" style="max-width: 100%; max-height: 100%;" alt="${inspName} 서명">`;
        });
      });
    });

    // 최종 검토 아코디언 토글 이벤트
    const headerToggleReview = document.getElementById('headerToggleReview');
    const bodyReview = document.getElementById('bodyDataReview');
    const badgeReview = document.getElementById('badgeReviewStatus');

    if (headerToggleReview && bodyReview) {
      headerToggleReview.addEventListener('click', () => {
        this.isReviewOpen = !this.isReviewOpen;
        bodyReview.style.display = this.isReviewOpen ? 'flex' : 'none';
        if (badgeReview) {
          badgeReview.textContent = this.isReviewOpen ? '검토 접기 ▲' : '검토 내용 펼치기 (1~5단계) ▼';
        }
      });
    }

    // 최종 검토 원클릭 점프 버튼들
    document.querySelectorAll('.btn-jump-step').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetStep = parseInt(e.currentTarget.getAttribute('data-jump'), 10);
        if (targetStep >= 1 && targetStep <= 5) {
          this.mediator.switchTab(targetStep);
        }
      });
    });

    // 7단계 이동
    const btnNext = document.getElementById('btnNextToStep7');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        if (!c.agreeCollect) {
          notifier.toast('개인정보 수집 및 이용 동의가 필요합니다.', 'warning');
          return;
        }
        if (!c.targetSignature) {
          notifier.toast('대상자 서명을 작성해 주십시오.', 'warning');
          return;
        }
        this.mediator.switchTab(7);
      });
    }
  }
}
