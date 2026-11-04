/**
 * @file step4QuestionsView.js
 * @description PWA 현장 조사 Step 4: 실내 환경 4대 관찰 + 10대 문항 대화형 FSM 진단 및 코칭 시퀀스 뷰 (ESM)
 */

import { QUESTION_SPECS } from '../../config/questionSpecs.js';
import { INDOOR_OBSERVATION_QUESTIONS } from '../../config/constants.js';
import { removeStepTooltip } from '../../utils/tooltip.js';
import { ValidationService } from '../../services/validationService.js';
import { notifier } from '../../utils/notifier.js';

export class Step4QuestionsView {
  constructor(mediator) {
    this.mediator = mediator;
  }

  render() {
    const container = document.getElementById('questionsList');
    if (!container) return;
    container.innerHTML = '';

    const obs = this.mediator.state.observation;

    const isIndoorExpanded = obs.isIndoorExpanded !== false; // 기본값 펼침 (true)

    // 0. 실내 환경 4대 관찰 지표 (서식 49p 필수) 상단 아코디언 카드 렌더링
    const indoorQuestions = INDOOR_OBSERVATION_QUESTIONS;
    const checkedCount = indoorQuestions.filter(q => obs[q.id] !== null && obs[q.id] !== undefined).length;
    const isCompleted = checkedCount === indoorQuestions.length;

    let headerTitleHtml = '실내 환경 관찰';
    let headerBadgeHtml = '실내 징후 (선택)';
    let headerBadgeStyle = 'font-size: 11px; color: var(--navy-500); font-weight: 600;';

    if (isCompleted) {
      headerTitleHtml = `실내 환경 관찰 <span style="color: #0f172a; font-weight: 800; font-size: 12.5px;">(확인완료)</span>`;
      headerBadgeHtml = '(4/4 확인완료)';
      headerBadgeStyle = 'font-size: 11px; color: #0f172a; background: #e2e8f0; padding: 2px 7px; border-radius: 4px; font-weight: 700;';
    } else if (checkedCount > 0) {
      headerTitleHtml = `실내 환경 관찰 <span style="color: #d97706; font-weight: 700; font-size: 12.5px;">(${checkedCount}/4 체크중)</span>`;
      headerBadgeHtml = `(${checkedCount}/4 진행중)`;
      headerBadgeStyle = 'font-size: 11px; color: #92400e; background: #fef3c7; padding: 2px 7px; border-radius: 4px; font-weight: 700;';
    }

    const indoorCard = document.createElement('div');
    indoorCard.className = 'pwa-card indoor-obs-header-card accordion-card';
    indoorCard.id = 'indoorObsHeaderCard';
    indoorCard.innerHTML = `
      <div class="card-header-bar accordion-toggle-header" id="btnToggleIndoorInStep4" style="margin-bottom: ${isIndoorExpanded ? '8px' : '0'};">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="card-main-title" id="indoorHeaderTitle">${headerTitleHtml}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span id="indoorHeaderBadge" style="${headerBadgeStyle}">${headerBadgeHtml}</span>
          <span class="accordion-indicator" id="indoorStep4Indicator" style="font-size: 10.5px; padding: 2px 6px;">${isIndoorExpanded ? '[− 접기]' : '[+ 펼치기]'}</span>
        </div>
      </div>
      <div class="accordion-body" id="indoorStep4Body" style="${isIndoorExpanded ? 'display: block;' : 'display: none;'}">
        <div style="font-size: 11px; color: var(--navy-600); margin-bottom: 8px;">
          ※ 현관문 진입 후 실내에서 확인된 징후를 체크하십시오. 체크된 징후는 아래 대화 코칭에 즉시 연동됩니다.
        </div>
        <div id="indoorObsItemsList">
          ${INDOOR_OBSERVATION_QUESTIONS.map((q, idx) => {
            const currentVal = obs[q.id];
            const isRiskActive = q.type === 'binary' ? currentVal === true : (currentVal === '불량' || currentVal === '심각');

            let controlHtml = '';
            if (q.type === 'binary') {
              controlHtml = `
                <div class="obs-toggle-group">
                  <button type="button" class="obs-btn-switch ${currentVal === false ? 'selected-clean' : ''}" data-obs-indoor-id="${q.id}" data-val="false">없음</button>
                  <button type="button" class="obs-btn-switch ${currentVal === true ? 'selected-risk' : ''}" data-obs-indoor-id="${q.id}" data-val="true">있음</button>
                </div>
              `;
            } else {
              controlHtml = `
                <div class="obs-scale3-group">
                  <button type="button" class="obs-btn-scale3 ${currentVal === '양호' ? 'selected-good' : ''}" data-obs-scale-id="${q.id}" data-val="양호">양호</button>
                  <button type="button" class="obs-btn-scale3 ${currentVal === '불량' ? 'selected-warning' : ''}" data-obs-scale-id="${q.id}" data-val="불량">불량</button>
                  <button type="button" class="obs-btn-scale3 ${currentVal === '심각' ? 'selected-critical' : ''}" data-obs-scale-id="${q.id}" data-val="심각">심각</button>
                </div>
              `;
            }

            return `
              <div class="obs-card-item ${isRiskActive ? 'risk-active' : ''}" id="obsCard_${q.id}" style="padding: 8px 10px; margin-bottom: 6px;">
                <div class="obs-card-text" style="font-size: 11.5px;">
                  <span style="font-weight: 700; color: var(--navy-800); margin-right: 4px;">${idx + 1}.</span>
                  ${q.text}
                </div>
                ${controlHtml}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    container.appendChild(indoorCard);

    // 1~10대 문항 카드 렌더링
    QUESTION_SPECS.forEach(q => {
      if (!this.mediator.state.answers[q.num]) {
        this.mediator.state.answers[q.num] = { isAnswered: false, isRisk: false, selectedCauses: [], activityMemo: '' };
      }
      const ans = this.mediator.state.answers[q.num];
      const selectedCauses = ans && ans.selectedCauses ? ans.selectedCauses : [];

      const card = document.createElement('div');
      card.className = `q-card ${this.mediator.state.questionMode === 'step' && q.num !== this.mediator.state.currentQuestionStep ? 'step-hidden' : ''} ${q.num === this.mediator.state.currentQuestionStep ? 'active-card' : ''}`;
      card.id = `q-card-${q.num}`;

      const causesHtml = q.causes.map(c => `
        <div class="cause-chip ${selectedCauses.includes(c.code) ? 'selected' : ''}" data-qnum="${q.num}" data-code="${c.code}">
          ${c.label}
        </div>
      `).join('') + `
        <div class="cause-chip cause-chip-other ${selectedCauses.includes('CAUSE_OTHER') ? 'selected' : ''}" data-qnum="${q.num}" data-code="CAUSE_OTHER">
          기타 (직접입력)
        </div>
      `;

      const dialogueStepsHtml = q.dialogueSteps.map((ds, sIdx) => {
        let rightBtnHtml = '';
        if (ds.isQuestion) {
          const cleanText = ds.cleanLabel || '양호';
          const riskText = ds.riskLabel || '주의';
          const cleanTip = ds.cleanTooltip || '판정 기준: 정상 및 양호';
          const riskTip = ds.riskTooltip || '판정 기준: 주의 및 징후 감지';

          rightBtnHtml = `
            <div class="step-r-group">
              <span class="step-r-label">어르신 반응:</span>
              <button class="step-r-btn" id="s-btn-${q.num}-${sIdx}-clean" 
                data-qnum="${q.num}" data-step="${sIdx}" data-type="clean" data-tip="${cleanTip}">
                ${cleanText}
              </button>
              <button class="step-r-btn" id="s-btn-${q.num}-${sIdx}-risk" 
                data-qnum="${q.num}" data-step="${sIdx}" data-type="risk" data-tip="${riskTip}">
                ${riskText}
              </button>
            </div>
          `;
        } else {
          rightBtnHtml = `<span style="font-size: 10px; font-weight: 700; color: var(--navy-700); background: var(--navy-50); padding: 2px 7px; border-radius: 3px; border: 1px solid var(--navy-200);">활동가 공감 멘트</span>`;
        }

        return `
          <div class="dialogue-step" id="dstep-${q.num}-${sIdx}" style="${sIdx === 0 ? '' : 'display: none;'}">
            <div class="step-head-row">
              <span class="step-tag" id="dtag-${q.num}-${sIdx}">${ds.step}</span>
              ${rightBtnHtml}
            </div>
            <div class="step-speech" id="dspeech-${q.num}-${sIdx}">"${ds.script}"</div>
          </div>
        `;
      }).join('');

      // 0.5단계 사전 관찰 브릿지 문구 생성
      const bridgeHtml = this.getContextBridgeHtml(q.num, obs);

      const navFooterHtml = `
        <div class="step-nav-footer">
          <button class="btn-step-nav" data-nav-step="${q.num - 1}">
            ${q.num === 1 ? '◀ 3단계 (외부관찰)' : '◀ 이전 문항'}
          </button>
          <span style="font-size: 11px; font-weight: 600; color: var(--navy-600);">${q.num} / 10 문항</span>
          ${q.num < 10 ? `
            <button class="btn-step-nav btn-step-next" data-nav-step="${q.num + 1}">
              다음 문항 ▶
            </button>
          ` : `
            <button class="btn-step-nav btn-step-next" id="btnNextToStep5" style="background:var(--navy-900); color:#fff; font-weight:700;">
              다음 (동의·서명) ▶
            </button>
          `}
        </div>
      `;

      const isAnswered = ans && ans.isAnswered;
      const isRisk = isAnswered && ans.isRisk;
      const isClean = isAnswered && !ans.isRisk;

      card.innerHTML = `
        <div class="q-card-header">
          <span class="q-num-pill">문항 ${q.num < 10 ? '0' + q.num : q.num}</span>
          <span class="q-title">${q.title}</span>
          <span class="q-score-badge ${isRisk ? 'risk' : ''}" id="badge-score-${q.num}">
            ${isAnswered ? (isRisk ? `주의 ${q.scoreWeight}점` : `0점 / ${q.scoreWeight}점`) : `- / ${q.scoreWeight}점`}
          </span>
        </div>
        <div class="q-card-body">
          <div id="contextBridgeContainer_${q.num}">
            ${bridgeHtml}
          </div>

          <div class="coaching-panel">
            <div style="font-size: 10px; font-weight: 700; color: var(--navy-600); margin-bottom: 6px;">현장 대화 코칭 시퀀스 (단계별 질문 가이드)</div>
            ${dialogueStepsHtml}
          </div>

          <div style="background: var(--navy-50); border: 1px solid var(--navy-200); border-radius: var(--radius-sm); padding: 6px 10px; font-size: 11px; color: var(--navy-800); margin-bottom: 8px;">
            <strong>판정 함정 방지:</strong> ${q.trapNotice}
          </div>

          <div class="action-row">
            <button class="btn-toggle ${isClean ? 'selected-clean' : ''}" id="btn-clean-${q.num}" data-qnum="${q.num}" data-risk="false">
              해당 없음 (양호 0점)
            </button>
            <button class="btn-toggle ${isRisk ? 'selected-risk' : ''}" id="btn-risk-${q.num}" data-qnum="${q.num}" data-risk="true">
              세심 살핌 필요 (주의 ${q.scoreWeight}점)
            </button>
          </div>

          <div class="cause-box" id="cause-box-${q.num}">
            <div class="cause-title">'왜(Why)?' 원인 선택 및 현장 메모:</div>
            <div class="cause-grid">
              ${causesHtml}
            </div>
            <div style="margin-top: 8px;">
              <input type="text" class="form-input q-memo-input" id="q-memo-${q.num}" data-qnum="${q.num}" value="${ans && ans.activityMemo ? ans.activityMemo : ''}" placeholder="${q.memoPlaceholder || '특이사항 직접 입력 (원인 선택 시 자동 반영)'}">
            </div>
          </div>

          ${navFooterHtml}
        </div>
      `;

      container.appendChild(card);
    });

    this.bindEvents();
  }

  getContextBridgeHtml(qNum, obs) {
    let bridgeText = '';
    if (qNum === 1 && (obs.indoorMealCondition === '불량' || obs.indoorMealCondition === '심각')) {
      bridgeText = '어르신, 주방을 살짝 보니 혼자서 끼니 챙겨 드시기가 많이 버거우셨던 것 같아요. 요즘 식사는 어떻게 챙겨 드셨어요?';
    } else if (qNum === 2 && obs.indoorBottles === true) {
      bridgeText = '어르신, 방 한편에 술병이 조금 보이는데... 혹시 몸이 쑤시거나 잠이 안 와서 약주를 한 잔씩 드시게 되신 건가요?';
    } else if (qNum === 7 && (obs.indoorHygieneCondition === '불량' || obs.indoorHygieneCondition === '심각')) {
      bridgeText = '어르신, 몸이 많이 편찮으셔서 옷 갈아입으시거나 씻는 것도 힘에 부치셨지요? 어디가 제일 불편하세요?';
    } else if (qNum === 8 && (obs.indoorTrashExcrement === true || obs.indoorHygieneCondition === '불량' || obs.indoorHygieneCondition === '심각')) {
      bridgeText = '혼자 계시다 보면 집안 치우는 게 참 큰일이죠. 몸이 아파서 치우기 힘드셨던 건지, 아니면 물건을 버리기가 어려우셨어요?';
    }

    if (bridgeText) {
      return `
        <div class="context-bridge-hint">
          <strong>[0.5단계 실내 관찰 연계 힌트]</strong> ${bridgeText}
        </div>
      `;
    }
    return '';
  }

  updateAllContextBridges() {
    const obs = this.mediator.state.observation;
    for (let qNum of [1, 2, 7, 8]) {
      const box = document.getElementById(`contextBridgeContainer_${qNum}`);
      if (box) {
        box.innerHTML = this.getContextBridgeHtml(qNum, obs);
      }
    }
  }

  updateIndoorHeaderStatus() {
    const obs = this.mediator.state.observation;
    const indoorQuestions = INDOOR_OBSERVATION_QUESTIONS;
    const checkedCount = indoorQuestions.filter(q => obs[q.id] !== null && obs[q.id] !== undefined).length;
    const isCompleted = checkedCount === indoorQuestions.length;

    const titleEl = document.getElementById('indoorHeaderTitle');
    const badgeEl = document.getElementById('indoorHeaderBadge');

    if (titleEl) {
      if (isCompleted) {
        titleEl.innerHTML = `실내 환경 관찰 <span style="color: #0f172a; font-weight: 800; font-size: 12.5px;">(확인완료)</span>`;
      } else if (checkedCount > 0) {
        titleEl.innerHTML = `실내 환경 관찰 <span style="color: #d97706; font-weight: 700; font-size: 12.5px;">(${checkedCount}/4 체크중)</span>`;
      } else {
        titleEl.textContent = '실내 환경 관찰';
      }
    }

    if (badgeEl) {
      if (isCompleted) {
        badgeEl.textContent = '(4/4 확인완료)';
        badgeEl.style.cssText = 'font-size: 11px; color: #0f172a; background: #e2e8f0; padding: 2px 7px; border-radius: 4px; font-weight: 700;';
      } else if (checkedCount > 0) {
        badgeEl.textContent = `(${checkedCount}/4 진행중)`;
        badgeEl.style.cssText = 'font-size: 11px; color: #92400e; background: #fef3c7; padding: 2px 7px; border-radius: 4px; font-weight: 700;';
      } else {
        badgeEl.textContent = '실내 징후 (선택)';
        badgeEl.style.cssText = 'font-size: 11px; color: var(--navy-500); font-weight: 600;';
      }
    }
  }

  bindEvents() {
    const container = document.getElementById('questionsList');
    if (!container) return;

    const obs = this.mediator.state.observation;

    // Step 4 실내 관찰 아코디언 접기/펼치기 이벤트
    const btnToggle = document.getElementById('btnToggleIndoorInStep4');
    const bodyEl = document.getElementById('indoorStep4Body');
    const indicatorEl = document.getElementById('indoorStep4Indicator');

    if (btnToggle && bodyEl && indicatorEl) {
      btnToggle.addEventListener('click', () => {
        const currentlyExpanded = bodyEl.style.display !== 'none';
        if (currentlyExpanded) {
          bodyEl.style.display = 'none';
          indicatorEl.textContent = '[+ 펼치기]';
          btnToggle.style.marginBottom = '0';
          obs.isIndoorExpanded = false;
        } else {
          bodyEl.style.display = 'block';
          indicatorEl.textContent = '[− 접기]';
          btnToggle.style.marginBottom = '8px';
          obs.isIndoorExpanded = true;
        }
      });
    }

    // 실내 관찰 바이너리 버튼 (술병, 음식쓰레기)
    container.querySelectorAll('.obs-btn-switch[data-obs-indoor-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const obsId = btn.getAttribute('data-obs-indoor-id');
        const isRisk = btn.getAttribute('data-val') === 'true';
        obs[obsId] = isRisk;

        const card = document.getElementById(`obsCard_${obsId}`);
        if (card) {
          if (isRisk) card.classList.add('risk-active');
          else card.classList.remove('risk-active');

          card.querySelectorAll('.obs-btn-switch').forEach(b => {
            const bVal = b.getAttribute('data-val') === 'true';
            if (bVal === isRisk) {
              b.className = `obs-btn-switch ${isRisk ? 'selected-risk' : 'selected-clean'}`;
            } else {
              b.className = 'obs-btn-switch';
            }
          });
        }

        this.updateIndoorHeaderStatus();
        this.updateAllContextBridges();
      });
    });

    // 실내 관찰 3단계 척도 버튼 (식사방치, 의복세면)
    container.querySelectorAll('.obs-btn-scale3[data-obs-scale-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const obsId = btn.getAttribute('data-obs-scale-id');
        const scaleVal = btn.getAttribute('data-val'); // '양호' | '불량' | '심각'
        obs[obsId] = scaleVal;

        const card = document.getElementById(`obsCard_${obsId}`);
        if (card) {
          const isRisk = scaleVal === '불량' || scaleVal === '심각';
          if (isRisk) card.classList.add('risk-active');
          else card.classList.remove('risk-active');

          card.querySelectorAll('.obs-btn-scale3').forEach(b => {
            const bVal = b.getAttribute('data-val');
            if (bVal === scaleVal) {
              const cls = scaleVal === '양호' ? 'selected-good' : (scaleVal === '불량' ? 'selected-warning' : 'selected-critical');
              b.className = `obs-btn-scale3 ${cls}`;
            } else {
              b.className = 'obs-btn-scale3';
            }
          });
        }

        this.updateIndoorHeaderStatus();
        this.updateAllContextBridges();
      });
    });

    // 메모 직접 입력 (스마트 연동)
    container.querySelectorAll('.q-memo-input').forEach(input => {
      input.addEventListener('input', () => {
        const qNum = parseInt(input.getAttribute('data-qnum'), 10);
        if (!this.mediator.state.answers[qNum]) {
          this.mediator.state.answers[qNum] = { isAnswered: false, isRisk: false, selectedCauses: [], activityMemo: input.value };
        } else {
          this.mediator.state.answers[qNum].activityMemo = input.value;
        }

        // 스마트 연동: 메모 입력 시 'CAUSE_OTHER' 칩 자동 활성화
        const otherChip = container.querySelector(`.cause-chip[data-qnum="${qNum}"][data-code="CAUSE_OTHER"]`);
        const causes = this.mediator.state.answers[qNum].selectedCauses;
        if (input.value.trim().length > 0) {
          if (!causes.includes('CAUSE_OTHER')) {
            causes.push('CAUSE_OTHER');
          }
          if (otherChip) otherChip.classList.add('selected');
        } else {
          const oIdx = causes.indexOf('CAUSE_OTHER');
          if (oIdx > -1) {
            causes.splice(oIdx, 1);
          }
          if (otherChip) otherChip.classList.remove('selected');
        }
      });
    });

    container.querySelectorAll('.step-r-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const qNum = parseInt(btn.getAttribute('data-qnum'), 10);
        const stepIdx = parseInt(btn.getAttribute('data-step'), 10);
        const type = btn.getAttribute('data-type');
        this.handleStepResponse(qNum, stepIdx, type);
      });
    });

    container.querySelectorAll('.btn-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const qNum = parseInt(btn.getAttribute('data-qnum'), 10);
        const isRisk = btn.getAttribute('data-risk') === 'true';
        this.applyCardRiskState(qNum, isRisk, true);
        this.mediator.updateScore();
      });
    });

    container.querySelectorAll('.cause-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const qNum = parseInt(chip.getAttribute('data-qnum'), 10);
        const code = chip.getAttribute('data-code');
        const causes = this.mediator.state.answers[qNum].selectedCauses;
        const idx = causes.indexOf(code);
        const qSpec = QUESTION_SPECS.find(q => q.num === qNum);
        const causeObj = qSpec ? qSpec.causes.find(c => c.code === code) : null;
        const input = document.getElementById(`q-memo-${qNum}`);

        if (idx > -1) {
          causes.splice(idx, 1);
          chip.classList.remove('selected');
        } else {
          causes.push(code);
          chip.classList.add('selected');

          if (code === 'CAUSE_OTHER') {
            if (input) {
              input.focus();
            }
          } else if (causeObj && input && (!input.value || input.value.trim() === '')) {
            input.value = causeObj.label;
            this.mediator.state.answers[qNum].activityMemo = causeObj.label;
          }
        }
        this.mediator.updateScore();
      });
    });

    container.querySelectorAll('.btn-step-nav[data-nav-step]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetStep = parseInt(btn.getAttribute('data-nav-step'), 10);
        const currentStep = this.mediator.state.currentQuestionStep;

        // 1번 문항에서 이전 버튼 클릭 시 Step 3으로 이동
        if (targetStep < 1) {
          this.mediator.switchTab(3);
          return;
        }

        // 이전 문항(◀)으로 이동은 자유롭게 허용
        if (targetStep < currentStep) {
          this.goToQuestionStep(targetStep);
          return;
        }

        // 다음 문항(▶)으로 이동 시 현재 문항 응답 검증
        const qVal = this.validateQuestionAnswer(currentStep);
        if (!qVal.isValid) {
          notifier.alert({
            title: `문항 ${currentStep} 확인 필요`,
            message: qVal.message,
            confirmText: '확인'
          });
          return;
        }

        this.goToQuestionStep(targetStep);
      });
    });

    const nextStep5Btn = document.getElementById('btnNextToStep5');
    if (nextStep5Btn) {
      nextStep5Btn.addEventListener('click', () => {
        const currentStep = 10;
        const qVal = this.validateQuestionAnswer(currentStep);
        if (!qVal.isValid) {
          notifier.alert({
            title: '문항 10 확인 필요',
            message: qVal.message,
            confirmText: '확인'
          });
          return;
        }

        const progressVal = ValidationService.validateSurveyProgress(this.mediator.state.answers, 10);
        if (!progressVal.isComplete) {
          notifier.alert({
            title: '10대 문항 답변 확인 필요',
            message: progressVal.message,
            confirmText: '확인'
          });
          return;
        }
        this.mediator.renderStep(5);
        this.mediator.switchTab(5);
      });
    }
  }

  validateQuestionAnswer(qNum) {
    const ans = this.mediator.state.answers[qNum];
    if (!ans || !ans.isAnswered) {
      return {
        isValid: false,
        message: `문항 ${qNum}의 판정([양호] 또는 [세심 살핌])을 먼저 선택해 주십시오.`
      };
    }

    if (ans.isRisk) {
      const causes = ans.selectedCauses || [];
      const memo = (ans.activityMemo || '').trim();

      // 1. 기타(직접입력)만 선택되어 있고 메모란이 비어있는 경우
      if (causes.length === 1 && causes[0] === 'CAUSE_OTHER' && !memo) {
        return {
          isValid: false,
          message: `문항 ${qNum}의 '기타(직접입력)' 사유 내용을 현장 메모란에 입력해 주십시오.`
        };
      }

      // 2. 사유 칩도 0개이고 메모도 비어있는 경우
      if (causes.length === 0 && !memo) {
        return {
          isValid: false,
          message: `문항 ${qNum}의 세심 살핌(주의)에 대한 원인(Why) 칩을 선택하거나 메모란에 직접 사유를 입력해 주십시오.`
        };
      }
    }

    return { isValid: true };
  }

  handleStepResponse(qNum, stepIdx, type) {
    const qSpec = QUESTION_SPECS.find(q => q.num === qNum);
    const totalSteps = qSpec.dialogueSteps.length;

    if (!this.mediator.state.answers[qNum]) {
      this.mediator.state.answers[qNum] = { isAnswered: false, isRisk: false, selectedCauses: [], activityMemo: '', dialogueAnswers: {} };
    }
    const ans = this.mediator.state.answers[qNum];
    if (!ans.dialogueAnswers) ans.dialogueAnswers = {};
    ans.dialogueAnswers[stepIdx] = type;

    const cleanBtn = document.getElementById(`s-btn-${qNum}-${stepIdx}-clean`);
    const riskBtn = document.getElementById(`s-btn-${qNum}-${stepIdx}-risk`);

    if (type === 'clean') {
      if (cleanBtn) cleanBtn.className = 'step-r-btn selected-clean';
      if (riskBtn) riskBtn.className = 'step-r-btn';
    } else {
      if (cleanBtn) cleanBtn.className = 'step-r-btn';
      if (riskBtn) riskBtn.className = 'step-r-btn selected-risk';
    }

    const nextIdx = stepIdx + 1;
    if (nextIdx < totalSteps) {
      const nextStepSpec = qSpec.dialogueSteps[nextIdx];
      const nextStepEl = document.getElementById(`dstep-${qNum}-${nextIdx}`);
      const nextTagEl = document.getElementById(`dtag-${qNum}-${nextIdx}`);
      const nextSpeechEl = document.getElementById(`dspeech-${qNum}-${nextIdx}`);
      const nextCleanBtn = document.getElementById(`s-btn-${qNum}-${nextIdx}-clean`);
      const nextRiskBtn = document.getElementById(`s-btn-${qNum}-${nextIdx}-risk`);

      // 3단계(최종 검증 단계) 진입 시 분기 결정: 1단계 또는 2단계 중 하나라도 주의(risk)가 있었는가?
      let branchType = type;
      if (nextIdx === 2 && nextStepSpec.branches) {
        const hasPriorRisk = ans.dialogueAnswers[0] === 'risk' || ans.dialogueAnswers[1] === 'risk';
        branchType = hasPriorRisk ? 'risk' : 'clean';
      }

      if (nextStepSpec.branches && nextStepSpec.branches[branchType]) {
        const branch = nextStepSpec.branches[branchType];
        if (nextTagEl && branch.step) nextTagEl.innerText = branch.step;
        if (nextSpeechEl && branch.script) nextSpeechEl.innerHTML = `"${branch.script}"`;
        if (nextCleanBtn && branch.cleanLabel) nextCleanBtn.innerText = branch.cleanLabel;
        if (nextRiskBtn && branch.riskLabel) nextRiskBtn.innerText = branch.riskLabel;
        if (nextCleanBtn && branch.cleanTooltip) nextCleanBtn.setAttribute('data-tip', branch.cleanTooltip);
        if (nextRiskBtn && branch.riskTooltip) nextRiskBtn.setAttribute('data-tip', branch.riskTooltip);
      }

      if (nextCleanBtn) nextCleanBtn.className = 'step-r-btn';
      if (nextRiskBtn) nextRiskBtn.className = 'step-r-btn';

      if (nextStepEl) {
        nextStepEl.style.display = 'block';
      }

      for (let i = nextIdx + 1; i < totalSteps; i++) {
        const el = document.getElementById(`dstep-${qNum}-${i}`);
        if (el) el.style.display = 'none';
        const sc = document.getElementById(`s-btn-${qNum}-${i}-clean`);
        const sr = document.getElementById(`s-btn-${qNum}-${i}-risk`);
        if (sc) sc.className = 'step-r-btn';
        if (sr) sr.className = 'step-r-btn';
      }

      if (qNum === 10 && stepIdx === 1) {
        this.applyCardRiskState(10, type === 'risk', false);
      }
    } else {
      // 3단계 최종 응답 처리:
      // 1점 위험 확정 조건: 1단계 또는 2단계에서 주의가 있었고 AND 3단계 결손 검증에서도 [주의]인 경우!
      const hasPriorRisk = ans.dialogueAnswers[0] === 'risk' || ans.dialogueAnswers[1] === 'risk';
      const isFinalDeficitConfirmed = hasPriorRisk && type === 'risk';
      
      this.applyCardRiskState(qNum, isFinalDeficitConfirmed, false);
    }

    this.mediator.updateScore();
  }

  applyCardRiskState(qNum, isRisk, isManualCardClick = false) {
    const qSpec = QUESTION_SPECS.find(q => q.num === qNum);
    if (!this.mediator.state.answers[qNum]) {
      this.mediator.state.answers[qNum] = { isAnswered: true, isRisk, selectedCauses: [], activityMemo: '' };
    } else {
      this.mediator.state.answers[qNum].isAnswered = true;
      this.mediator.state.answers[qNum].isRisk = isRisk;
    }

    const btnClean = document.getElementById(`btn-clean-${qNum}`);
    const btnRisk = document.getElementById(`btn-risk-${qNum}`);
    const causeBox = document.getElementById(`cause-box-${qNum}`);
    const badgeScore = document.getElementById(`badge-score-${qNum}`);

    if (isRisk) {
      if (btnClean) btnClean.className = 'btn-toggle';
      if (btnRisk) btnRisk.className = 'btn-toggle selected-risk';
      if (causeBox) causeBox.className = 'cause-box show';
      if (badgeScore) {
        badgeScore.className = 'q-score-badge risk';
        badgeScore.innerText = `주의 ${qSpec.scoreWeight}점`;
      }
    } else {
      if (btnClean) btnClean.className = 'btn-toggle selected-clean';
      if (btnRisk) btnRisk.className = 'btn-toggle';
      if (causeBox) causeBox.className = 'cause-box';
      if (badgeScore) {
        badgeScore.className = 'q-score-badge';
        badgeScore.innerText = `0점 / ${qSpec.scoreWeight}점`;
      }
      this.mediator.state.answers[qNum].selectedCauses = [];
      if (causeBox) {
        causeBox.querySelectorAll('.cause-chip').forEach(el => el.classList.remove('selected'));
      }
    }
  }

  goToQuestionStep(stepNum) {
    if (stepNum < 1 || stepNum > 10) return;
    this.mediator.state.currentQuestionStep = stepNum;

    for (let i = 1; i <= 10; i++) {
      const c = document.getElementById(`q-card-${i}`);
      if (!c) continue;
      if (i === stepNum) {
        c.classList.remove('step-hidden');
      } else {
        c.classList.add('step-hidden');
      }
    }
    window.scrollTo({ top: 60, behavior: 'smooth' });
  }
}
