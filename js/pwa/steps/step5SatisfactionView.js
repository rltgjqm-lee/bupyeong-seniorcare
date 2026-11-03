/**
 * @file step5SatisfactionView.js
 * @description PWA 현장조사 Step 5: 부평형 통합돌봄 이용자 만족도 조사
 * - 공문서 서식 100% 매핑: 대분류별 접기/펴기(Accordion), 5점 리커트 척도(1~8번), 9~13번 정규화, 1·2점 자동연동, 조사자 사후확인
 */

import { notifier } from '../../utils/notifier.js';

export class Step5SatisfactionView {
  constructor(mediator) {
    this.mediator = mediator;
    this.accordionState = {
      catBody1: true,
      catBody2: true,
      catBody3: true,
      catBody4: true
    };
  }

  render(containerId = 'step4Container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const s = this.mediator.state.satisfaction;
    if (!s.complaintReasons) s.complaintReasons = {};
    if (!s.scores) {
      s.scores = {
        accessibility: 5,
        timeliness: 5,
        suitability: 5,
        effectiveness: 5,
        quality: 5,
        overall: 5,
        continuation: 5
      };
    }

    const QUESTIONS_5P = [
      { key: 'accessibility', num: 2, label: '접근성', text: '신청·이용 절차가 이해하기 쉽고 편리하였습니까?' },
      { key: 'timeliness',    num: 3, label: '적시성', text: '필요한 서비스를 적절한 시기에 잘 연계받았습니까?' },
      { key: 'suitability',   num: 4, label: '적합성', text: '제공받은 서비스 내용에 만족하십니까?' },
      { key: 'effectiveness', num: 5, label: '효과성', text: '서비스가 실제 생활에 도움이 되었습니까?' },
      { key: 'quality',       num: 6, label: '서비스 품질', text: '서비스 제공자(제공기관)는 귀하의 상황을 이해하고 적절한 서비스를 제공하였습니까?' },
      { key: 'overall',       num: 7, label: '종합만족도', text: '전반적으로 의료·요양 통합돌봄 사업에 만족하십니까?' },
      { key: 'continuation',  num: 8, label: '지속 이용 의향', text: '앞으로도 서비스를 계속 이용하고 싶은 의향이 있습니까?' }
    ];

    const FIELDS = [
      '보건·의료 서비스', '건강관리예방', '일상생활(가사, 식사 등)', '주거 지원', '정서지원', '기타'
    ];

    const COMPLAINTS = [
      '없음', '신청절차', '안내 부족', '제공시간·횟수', '서비스 내용', '제공인력', '기타'
    ];

    container.innerHTML = `
      <!-- ========================================================
           대분류 1. 응답자 구분 및 서비스 이용 경로 (접기/펴기)
           ======================================================== -->
      <div class="pwa-card" style="margin-bottom: 12px;">
        <div class="card-header-bar accordion-toggle-btn" data-target="catBody1" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none; padding: 6px 0;">
          <span class="card-main-title" style="font-size: 14.5px; font-weight: 800; color: #0f172a;">1. 응답자 구분 및 서비스 이용 경로</span>
          <span class="accordion-icon" id="icon_catBody1" style="font-size: 13px; font-weight: bold; color: #64748b; transition: transform 0.2s;">
            ${this.accordionState.catBody1 ? '▲ 접기' : '▼ 펴기'}
          </span>
        </div>

        <div class="card-body-wrap" id="catBody1" style="display: ${this.accordionState.catBody1 ? 'block' : 'none'}; margin-top: 10px;">
          <!-- 응답자 구분 (본인 / 가족 / 기타) -->
          <div class="form-group">
            <label class="form-label" style="font-size: 13px; font-weight: 700; color: #334155;">응답자 구분 <span class="req" style="color: #ef4444;">*</span></label>
            <div style="display: flex; gap: 14px; margin-top: 6px;">
              ${['본인', '가족', '기타'].map(opt => `
                <label style="display: flex; align-items: center; gap: 5px; font-size: 13.5px; font-weight: 600; cursor: pointer;">
                  <input type="radio" name="respRadio" value="${opt}" ${s.respondentType === opt ? 'checked' : ''}>
                  <span>${opt === '본인' ? '본인 (직접)' : (opt === '가족' ? '가족' : '기타')}</span>
                </label>
              `).join('')}
            </div>

            <!-- 가족 또는 기타 선택 시 세부 관계 입력창 -->
            <div id="respDetailWrap" style="margin-top: 8px; display: ${s.respondentType !== '본인' ? 'block' : 'none'};">
              <input type="text" class="form-input" id="inputRespDetail" value="${s.respondentDetail || ''}" placeholder="대상자와의 관계를 입력하세요 (예: 자녀, 며느리, 이웃 등)" style="font-size: 13px; padding: 8px 10px; border: 1.5px solid #cbd5e1; border-radius: 6px; width: 100%;">
            </div>
          </div>

          <!-- 1번 문항: 이용 경로 -->
          <div class="form-group" style="margin-top: 14px;">
            <label class="form-label" style="font-size: 13px; font-weight: 700; color: #334155;">1. 이용 경로 <span class="req" style="color: #ef4444;">*</span></label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px;">
              ${['지인추천', '공무원 안내', '홍보물', '언론', '기타'].map(r => `
                <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; padding: 4px 0;">
                  <input type="radio" name="routeRadio" value="${r}" ${s.route === r ? 'checked' : ''}>
                  <span>${r}</span>
                </label>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================================
           대분류 2. 서비스 만족도 평가 (5점 척도, 2~8번) (접기/펴기)
           ======================================================== -->
      <div class="pwa-card" style="margin-bottom: 12px;">
        <div class="card-header-bar accordion-toggle-btn" data-target="catBody2" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none; padding: 6px 0;">
          <span class="card-main-title" style="font-size: 14.5px; font-weight: 800; color: #0f172a;">2. 서비스 만족도 평가 (5점 척도, 2~8번)</span>
          <span class="accordion-icon" id="icon_catBody2" style="font-size: 13px; font-weight: bold; color: #64748b; transition: transform 0.2s;">
            ${this.accordionState.catBody2 ? '▲ 접기' : '▼ 펴기'}
          </span>
        </div>

        <div class="card-body-wrap" id="catBody2" style="display: ${this.accordionState.catBody2 ? 'block' : 'none'}; margin-top: 10px;">
          <div style="font-size: 11.5px; color: #64748b; margin-bottom: 12px; background: #f1f5f9; padding: 6px 10px; border-radius: 6px;">
            ※ 각 문항별로 1점(전혀 그렇지 않다) ~ 5점(매우 그렇다) 중 하나를 선택해 주세요.<br>
            <strong style="color: #e11d48;">※ 1점 또는 2점 체크 시 불만족 사유 입력칸이 생성되며, 13번 의견란에 자동 연동됩니다.</strong>
          </div>

          ${QUESTIONS_5P.map(q => {
            const curVal = s.scores[q.key] !== undefined ? s.scores[q.key] : 5;
            const isLowScore = (curVal === 1 || curVal === 2);
            const reasonVal = s.complaintReasons?.[q.key] || '';
            return `
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px;" data-qkey="${q.key}">
                <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin-bottom: 6px; line-height: 1.4;">
                  ${q.num}. (${q.label}) ${q.text}
                </div>

                <!-- 5점 척도 버튼 그룹 -->
                <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; margin-top: 8px;">
                  ${[1, 2, 3, 4, 5].map(pt => {
                    const labelMap = { 1: '전혀아님', 2: '그렇지않음', 3: '보통', 4: '그렇다', 5: '매우그렇다' };
                    const isChecked = curVal === pt;
                    
                    let activeBg = '#2563eb';
                    let activeBorder = '#2563eb';
                    if (isChecked && pt <= 2) {
                      activeBg = pt === 1 ? '#ef4444' : '#f59e0b';
                      activeBorder = pt === 1 ? '#dc2626' : '#d97706';
                    }

                    return `
                      <button type="button" class="btn-score-toggle" data-qkey="${q.key}" data-score="${pt}" style="padding: 8px 2px; border-radius: 6px; font-size: 11px; text-align: center; border: 1.5px solid ${isChecked ? activeBorder : '#cbd5e1'}; background: ${isChecked ? activeBg : '#ffffff'}; color: ${isChecked ? '#ffffff' : '#334155'}; font-weight: ${isChecked ? '800' : 'normal'}; cursor: pointer; transition: all 0.15s ease;">
                        <div style="font-size: 14px; font-weight: 800;">${pt}점</div>
                        <div style="font-size: 10px; margin-top: 2px;">${labelMap[pt]}</div>
                      </button>
                    `;
                  }).join('')}
                </div>

                <!-- 1~2점 체크 시 나타나는 동적 불만족 사유 입력칸 -->
                <div class="sub-complaint-box" id="subComplaintWrap_${q.key}" style="display: ${isLowScore ? 'block' : 'none'}; margin-top: 10px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 10px 12px;">
                  <div style="font-size: 11.5px; font-weight: 700; color: #be123c; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
                    <span>⚠️ [${q.num}번 ${q.label}] 불만족 세부 사유 (13번 의견란 자동 반영)</span>
                  </div>
                  <input type="text" class="form-input sub-complaint-input" data-qkey="${q.key}" id="subComplaintInput_${q.key}" value="${reasonVal}" placeholder="${q.label} 관련 구체적인 불만족 사유를 적어주세요" style="width: 100%; font-size: 12.5px; padding: 7px 10px; border: 1px solid #f43f5e; border-radius: 4px; background: #ffffff; color: #881337;">
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- ========================================================
           대분류 3. 도움 분야 및 개선 의견 (9~13번) (접기/펴기)
           ======================================================== -->
      <div class="pwa-card" style="margin-bottom: 12px;">
        <div class="card-header-bar accordion-toggle-btn" data-target="catBody3" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none; padding: 6px 0;">
          <span class="card-main-title" style="font-size: 14.5px; font-weight: 800; color: #0f172a;">3. 도움 분야 및 개선 의견 (9~13번)</span>
          <span class="accordion-icon" id="icon_catBody3" style="font-size: 13px; font-weight: bold; color: #64748b; transition: transform 0.2s;">
            ${this.accordionState.catBody3 ? '▲ 접기' : '▼ 펴기'}
          </span>
        </div>

        <div class="card-body-wrap" id="catBody3" style="display: ${this.accordionState.catBody3 ? 'block' : 'none'}; margin-top: 10px;">
          <!-- 9번 문항: 가장 도움이 된 분야 (1개 선택) -->
          <div class="form-group">
            <label class="form-label" style="font-size: 13px; font-weight: 700; color: #334155;">9. 가장 도움이 된 분야 (1개 선택) <span class="req" style="color: #ef4444;">*</span></label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px;">
              ${FIELDS.map(f => `
                <label style="display: flex; align-items: center; gap: 5px; font-size: 12.5px; cursor: pointer; padding: 4px 0;">
                  <input type="radio" name="bestFieldRadio" value="${f}" ${s.bestField === f ? 'checked' : ''}>
                  <span>${f}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- 10번 문항: 추가로 필요한 서비스 (복수 선택) -->
          <div class="form-group" style="margin-top: 14px;">
            <label class="form-label" style="font-size: 13px; font-weight: 700; color: #334155;">10. 추가로 필요한 서비스 (복수 선택 가능)</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px;">
              ${FIELDS.map(f => {
                const isChecked = (s.neededServices || []).includes(f);
                return `
                  <label style="display: flex; align-items: center; gap: 5px; font-size: 12.5px; cursor: pointer; padding: 4px 0;">
                    <input type="checkbox" class="chk-needed" value="${f}" ${isChecked ? 'checked' : ''}>
                    <span>${f}</span>
                  </label>
                `;
              }).join('')}
            </div>
          </div>

          <!-- 11번 문항: 불편 및 불만 사항 (복수 선택) -->
          <div class="form-group" style="margin-top: 14px;">
            <label class="form-label" style="font-size: 13px; font-weight: 700; color: #334155;">11. 불편 및 불만 사항 (복수 선택 가능)</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px;">
              ${COMPLAINTS.map(c => {
                const isChecked = (s.complaints || []).includes(c);
                return `
                  <label style="display: flex; align-items: center; gap: 5px; font-size: 12.5px; cursor: pointer; padding: 4px 0;">
                    <input type="checkbox" class="chk-complaint" value="${c}" ${isChecked ? 'checked' : ''}>
                    <span>${c}</span>
                  </label>
                `;
              }).join('')}
            </div>
          </div>

          <!-- 12번 문항: 가장 만족한 점 -->
          <div class="form-group" style="margin-top: 16px;">
            <label class="form-label" for="inputBestPoint" style="font-size: 13px; font-weight: 700; color: #334155;">12. 가장 만족한 점</label>
            <textarea class="form-input" id="inputBestPoint" rows="2" placeholder="서비스를 이용하면서 가장 만족스러웠던 부분을 작성해 주세요." style="width: 100%; font-size: 13px; padding: 8px 10px; border: 1.5px solid #cbd5e1; border-radius: 6px;">${s.bestPoint || ''}</textarea>
          </div>

          <!-- 13번 문항: 불만족 사유 및 건의사항 (2~8번 1·2점 자동 연동) -->
          <div class="form-group" style="margin-top: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <label class="form-label" for="inputImprovement" style="font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 0;">13. 불만족 사유 및 건의사항</label>
              <span style="font-size: 11px; font-weight: 600; color: #e11d48;">※ 2~8번 1·2점 자동 연동 중</span>
            </div>
            <textarea class="form-input" id="inputImprovement" rows="4" placeholder="1~2점 응답 사유 또는 부평구에 바라는 점을 작성해 주세요." style="width: 100%; font-size: 13px; padding: 8px 10px; border: 1.5px solid #cbd5e1; border-radius: 6px;">${s.improvementPoint || ''}</textarea>
          </div>
        </div>
      </div>

      <!-- ========================================================
           대분류 4. 조사자 사후 확인 [사후기입] (접기/펴기)
           ======================================================== -->
      <div class="pwa-card" style="margin-bottom: 12px;">
        <div class="card-header-bar accordion-toggle-btn" data-target="catBody4" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none; padding: 6px 0;">
          <span class="card-main-title" style="font-size: 14.5px; font-weight: 800; color: #0f172a;">4. 조사자 사후 확인 [사후기입]</span>
          <span class="accordion-icon" id="icon_catBody4" style="font-size: 13px; font-weight: bold; color: #64748b; transition: transform 0.2s;">
            ${this.accordionState.catBody4 ? '▲ 접기' : '▼ 펴기'}
          </span>
        </div>

        <div class="card-body-wrap" id="catBody4" style="display: ${this.accordionState.catBody4 ? 'block' : 'none'}; margin-top: 10px;">
          <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 8px;">
            <div class="form-group">
              <label class="form-label" style="font-size: 12.5px; font-weight: 700;">응답 신뢰도 <span class="req" style="color: #ef4444;">*</span></label>
              <select class="form-input" id="selReliability" style="width: 100%; font-size: 13px; padding: 7px 8px; border: 1.5px solid #cbd5e1; border-radius: 6px;">
                ${['높음', '보통', '낮음'].map(opt => `<option value="${opt}" ${s.reliability === opt ? 'selected' : ''}>${opt}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size: 12.5px; font-weight: 700;">의사소통 상태 <span class="req" style="color: #ef4444;">*</span></label>
              <select class="form-input" id="selCommunication" style="width: 100%; font-size: 13px; padding: 7px 8px; border: 1.5px solid #cbd5e1; border-radius: 6px;">
                ${['원활', '일부도움', '대리응답'].map(opt => `<option value="${opt}" ${s.communication === opt ? 'selected' : ''}>${opt}</option>`).join('')}
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 8px; margin-top: 10px;">
            <div class="form-group">
              <label class="form-label" style="font-size: 12.5px; font-weight: 700;">향후 연계 여부 <span class="req" style="color: #ef4444;">*</span></label>
              <select class="form-input" id="selNextLink" style="width: 100%; font-size: 13px; padding: 7px 8px; border: 1.5px solid #cbd5e1; border-radius: 6px;">
                <option value="불필요" ${s.nextLink === '불필요' ? 'selected' : ''}>불필요</option>
                <option value="필요" ${s.nextLink === '필요' ? 'selected' : ''}>필요 (연계 의뢰)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="inputSpecialNote" style="font-size: 12.5px; font-weight: 700;">특이사항</label>
              <input type="text" class="form-input" id="inputSpecialNote" value="${s.specialNote || ''}" placeholder="조사 시 특이사항 간단히 기재" style="width: 100%; font-size: 13px; padding: 7px 8px; border: 1.5px solid #cbd5e1; border-radius: 6px;">
            </div>
          </div>
        </div>
      </div>

      <div class="btn-action-row" style="margin-top: 16px; margin-bottom: 24px; display: flex; gap: 10px;">
        <button type="button" class="btn-secondary-action" id="btnBackToStep4" style="flex: 1; padding: 12px; font-size: 13.5px; font-weight: 700;">◀ 이전 (기초조사)</button>
        <button type="button" class="btn-primary-action" id="btnNextToStep6" style="flex: 1.5; padding: 12px; font-size: 14px; font-weight: 800; background: #0f172a; color: #fff; border: none; border-radius: 6px; cursor: pointer;">다음 (동의·서명) ➔</button>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const s = this.mediator.state.satisfaction;

    // 0. 대분류별 접기/펴기 (Accordion Toggle) 이벤트 바인딩
    document.querySelectorAll('.accordion-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetId = btn.getAttribute('data-target');
        const targetBody = document.getElementById(targetId);
        const targetIcon = document.getElementById(`icon_${targetId}`);
        if (!targetBody) return;

        const isCurrentlyOpen = (targetBody.style.display !== 'none');
        targetBody.style.display = isCurrentlyOpen ? 'none' : 'block';
        this.accordionState[targetId] = !isCurrentlyOpen;

        if (targetIcon) {
          targetIcon.textContent = isCurrentlyOpen ? '▼ 펴기' : '▲ 접기';
        }
      });
    });

    // 1. 응답자 라디오 & 관계 상세 입력 필드 토글
    document.querySelectorAll('input[name="respRadio"]').forEach(r => {
      r.addEventListener('change', (e) => {
        if (e.target.checked) {
          s.respondentType = e.target.value;
          const wrap = document.getElementById('respDetailWrap');
          if (wrap) {
            wrap.style.display = (e.target.value !== '본인') ? 'block' : 'none';
          }
        }
      });
    });

    const inputRespDetail = document.getElementById('inputRespDetail');
    if (inputRespDetail) {
      inputRespDetail.addEventListener('input', (e) => {
        s.respondentDetail = e.target.value.trim();
      });
    }

    // 경로 라디오
    document.querySelectorAll('input[name="routeRadio"]').forEach(r => {
      r.addEventListener('change', (e) => { if (e.target.checked) s.route = e.target.value; });
    });

    // 2. 5점 척도 버튼 클릭 및 1~2점 동적 불만족 연동
    document.querySelectorAll('.btn-score-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBtn = e.currentTarget;
        const qkey = targetBtn.dataset.qkey;
        const score = parseInt(targetBtn.dataset.score, 10);
        s.scores[qkey] = score;

        // 동일 문항 버튼 스타일 갱신
        document.querySelectorAll(`.btn-score-toggle[data-qkey="${qkey}"]`).forEach(b => {
          const pt = parseInt(b.dataset.score, 10);
          const isSel = (pt === score);
          let activeBg = '#2563eb';
          let activeBorder = '#2563eb';
          if (isSel && pt <= 2) {
            activeBg = pt === 1 ? '#ef4444' : '#f59e0b';
            activeBorder = pt === 1 ? '#dc2626' : '#d97706';
          }
          b.style.borderColor = isSel ? activeBorder : '#cbd5e1';
          b.style.background = isSel ? activeBg : '#ffffff';
          b.style.color = isSel ? '#ffffff' : '#334155';
          b.style.fontWeight = isSel ? '800' : 'normal';
        });

        // 1~2점 체크 시 해당 문항 하단 불만족 사유 입력칸 노출/숨김
        const subWrap = document.getElementById(`subComplaintWrap_${qkey}`);
        if (subWrap) {
          subWrap.style.display = (score === 1 || score === 2) ? 'block' : 'none';
        }

        // 13번 불만족 사유 및 건의사항 자동 동기화
        this.syncToImprovementText();
      });
    });

    // 개별 문항 불만족 사유 입력 시 13번 실시간 동기화
    document.querySelectorAll('.sub-complaint-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const qkey = e.target.getAttribute('data-qkey');
        if (!s.complaintReasons) s.complaintReasons = {};
        s.complaintReasons[qkey] = e.target.value;
        this.syncToImprovementText();
      });
    });

    // 도움분야 라디오
    document.querySelectorAll('input[name="bestFieldRadio"]').forEach(r => {
      r.addEventListener('change', (e) => { if (e.target.checked) s.bestField = e.target.value; });
    });

    // 추가 필요 서비스 체크박스
    document.querySelectorAll('.chk-needed').forEach(chk => {
      chk.addEventListener('change', () => {
        const checked = Array.from(document.querySelectorAll('.chk-needed:checked')).map(c => c.value);
        s.neededServices = checked;
      });
    });

    // 11번 불만사항 체크박스 ('없음' 선택 시 배타적 처리)
    document.querySelectorAll('.chk-complaint').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === '없음' && e.target.checked) {
          document.querySelectorAll('.chk-complaint').forEach(c => {
            if (c.value !== '없음') c.checked = false;
          });
        } else if (val !== '없음' && e.target.checked) {
          const noneChk = document.querySelector('.chk-complaint[value="없음"]');
          if (noneChk) noneChk.checked = false;
        }
        const checked = Array.from(document.querySelectorAll('.chk-complaint:checked')).map(c => c.value);
        s.complaints = checked;
      });
    });

    const inputBest = document.getElementById('inputBestPoint');
    if (inputBest) inputBest.addEventListener('input', (e) => { s.bestPoint = e.target.value.trim(); });

    // 13번 수기 입력 시 manualImprovementText 보존
    const inputImprove = document.getElementById('inputImprovement');
    if (inputImprove) {
      inputImprove.addEventListener('input', (e) => {
        s.improvementPoint = e.target.value;
      });
    }

    const selRel = document.getElementById('selReliability');
    if (selRel) selRel.addEventListener('change', (e) => { s.reliability = e.target.value; });

    const selComm = document.getElementById('selCommunication');
    if (selComm) selComm.addEventListener('change', (e) => { s.communication = e.target.value; });

    const selNext = document.getElementById('selNextLink');
    if (selNext) selNext.addEventListener('change', (e) => { s.nextLink = e.target.value; });

    const inputSpec = document.getElementById('inputSpecialNote');
    if (inputSpec) inputSpec.addEventListener('input', (e) => { s.specialNote = e.target.value.trim(); });

    // 이전/다음
    const btnBack = document.getElementById('btnBackToStep4');
    const btnNext = document.getElementById('btnNextToStep6');

    if (btnBack) btnBack.addEventListener('click', () => this.mediator.switchTab(3));
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        this.mediator.switchTab(6);
      });
    }
  }

  /**
   * 2~8번 문항 중 1점 또는 2점으로 평가된 문항과 세부 사유를 13번 의견란에 실시간 반영
   */
  syncToImprovementText() {
    const s = this.mediator.state.satisfaction;
    const QUESTIONS_5P = [
      { key: 'accessibility', num: 2, label: '접근성' },
      { key: 'timeliness',    num: 3, label: '적시성' },
      { key: 'suitability',   num: 4, label: '적합성' },
      { key: 'effectiveness', num: 5, label: '효과성' },
      { key: 'quality',       num: 6, label: '서비스 품질' },
      { key: 'overall',       num: 7, label: '종합만족도' },
      { key: 'continuation',  num: 8, label: '지속 이용 의향' }
    ];

    const lowScoreLines = [];
    QUESTIONS_5P.forEach(q => {
      const score = s.scores[q.key];
      if (score === 1 || score === 2) {
        const scoreLabel = score === 1 ? '1점(전혀아님)' : '2점(그렇지않음)';
        const reason = s.complaintReasons?.[q.key]?.trim();
        lowScoreLines.push(`• [${q.num}번 ${q.label} ${scoreLabel}]${reason ? `: ${reason}` : ': (사유 미기재)'}`);
      }
    });

    const inputImprove = document.getElementById('inputImprovement');
    if (!inputImprove) return;

    if (lowScoreLines.length > 0) {
      const autoSection = `[대영역 Ⅲ 불만족 체크 항목]\n${lowScoreLines.join('\n')}\n\n[기타 건의사항]\n`;
      // 기존 작성 내용과 결합
      const existingManual = s.improvementPoint && !s.improvementPoint.includes('[대영역 Ⅲ 불만족 체크 항목]')
        ? s.improvementPoint
        : (s.manualNote || '');
      
      inputImprove.value = `${autoSection}${existingManual}`.trim();
      s.improvementPoint = inputImprove.value;
    }
  }
}
