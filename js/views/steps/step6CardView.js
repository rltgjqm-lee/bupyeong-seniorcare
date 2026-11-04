/**
 * @file step6CardView.js
 * @description PWA 현장 조사 Step 6: 수혜자 관리카드 작성 (접이식 인적사항 리스트, 방문/통화 선택, 5대 지표 인터랙티브 체크 및 세부 메모, 참여자 확인) (ESM)
 */

import { ScoringEngine } from '../../core/scoringEngine.js';
import { notifier } from '../../utils/notifier.js';
import { maskName, maskPhone, maskAddress, maskUid, maskBirth } from '../../utils/mask.js';
import { getLocalTodayString } from '../../utils/date.js';

export class Step6CardView {
  constructor(mediator) {
    this.mediator = mediator;
    this.isProfileExpanded = true;
  }

  /**
   * 이전 단계 데이터를 기반으로 수혜자 관리카드 초기 데이터 구성 (기본 선택값 없이 null로 초기화)
   */
  initCardStateIfNeeded() {
    if (this.mediator.state.beneficiaryCard) return;

    this.mediator.state.beneficiaryCard = {
      method: null,
      healthCheck: null,
      healthNote: '',
      psychoCheck: null,
      psychoNote: '',
      livingCheck: null,
      livingNote: '',
      anomalyCheck: null,
      anomalyNote: '',
      etcCheck: null,
      etcNote: ''
    };
  }

  render() {
    const container = document.getElementById('step6Container');
    if (!container) return;

    this.initCardStateIfNeeded();

    const b = this.mediator.state.basicInfo;
    const p = this.mediator.state.targetProfile;
    const g = p.guardian || {};
    const card = this.mediator.state.beneficiaryCard;

    const dateParts = (b.inspectionDate || getLocalTodayString()).split('-');
    const formattedDate = `${dateParts[1]}.${dateParts[2]}`;
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][new Date(b.inspectionDate || new Date()).getDay()];
    const dateLabel = `${formattedDate}(${dayOfWeek})`;

    const isExp = this.isProfileExpanded;

    const maskedTargetName = maskName(p.name);
    const maskedBirthDate = maskBirth(p.birth);
    const maskedTargetPhone = maskPhone(p.phone);
    const maskedTargetAddr = maskAddress(p.address || p.baseAddress);
    const maskedGuardianName = maskName(g.name);
    const maskedGuardianPhone = maskPhone(g.phone);
    const maskedCaseUid = maskUid(b.caseUid);

    container.innerHTML = `
      <div class="pwa-card">
        <div class="card-header-bar">
          <span class="card-main-title">수혜자 관리카드</span>
          <span class="uid-badge">관리번호: ${maskedCaseUid}</span>
        </div>

        <!-- 1. 대상자 및 보호자 정보 (한 줄 리스트 + 접기/펼치기 아코디언) -->
        <div style="border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #ffffff; margin-bottom: 16px;">
          <div class="card-header-bar accordion-toggle-header" id="btnToggleProfileInStep6" style="padding: 10px 12px; margin-bottom: 0; background: #f8fafc; border-bottom: ${isExp ? '1px solid #e2e8f0' : 'none'}; cursor: pointer;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 13px; font-weight: 700; color: #0f172a;">대상자 및 보호자 기본 정보</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 11px; color: #64748b;">${maskedTargetName || '미입력'} (${p.gender === '남' ? '남성' : (p.gender === '여' ? '여성' : '-')})</span>
              <span class="accordion-indicator" id="profileStep6Indicator" style="font-size: 10.5px; padding: 2px 6px;">${isExp ? '[− 접기]' : '[+ 펼치기]'}</span>
            </div>
          </div>

          <div id="profileStep6Body" style="display: ${isExp ? 'block' : 'none'}; padding: 10px 12px; font-size: 12px; color: #334155; line-height: 1.7; background: #ffffff;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 5px; margin-bottom: 5px;">
              <span>• <strong>성명 / 성별:</strong> ${maskedTargetName || '미입력'} (${p.gender === '남' ? '남성' : (p.gender === '여' ? '여성' : '-')})</span>
              <span>• <strong>생년월일:</strong> ${maskedBirthDate || '-'}</span>
            </div>
            <div style="border-bottom: 1px dashed #e2e8f0; padding-bottom: 5px; margin-bottom: 5px;">
              • <strong>거주지 주소:</strong> ${maskedTargetAddr || '-'}
            </div>
            <div style="border-bottom: 1px dashed #e2e8f0; padding-bottom: 5px; margin-bottom: 5px;">
              • <strong>대상자 연락처:</strong> ${maskedTargetPhone || '-'}
            </div>
            <div>
              • <strong>보호자(비상연락):</strong> ${g.hasGuardian === true ? `${maskedGuardianName || '미입력'} (${g.relation || '대리인'}, ${maskedGuardianPhone || '-'})` : '무연고 (가족단절)'}
            </div>
          </div>
        </div>

        <!-- 2. 당일 안부확인 모니터링 섹션 헤더 -->
        <div class="card-header-bar" style="margin-bottom: 10px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">
          <span class="card-main-title">당일 안부확인 기록 (${dateLabel})</span>
          <span style="font-size: 11px; color: #64748b; font-weight: 600;">상태체크 및 세부내용</span>
        </div>

        <!-- 2-1. 안부확인 방식 선택 (방문 vs 통화 라디오 버튼) -->
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
          <div style="font-size: 12.5px; font-weight: 700; color: #0f172a;">
            확인 방식 선택
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn-toggle card-method-btn ${card.method === 'visit' ? 'selected-clean' : ''}" data-method="visit" style="padding: 7px 16px; font-size: 12px;">
              현장 방문
            </button>
            <button type="button" class="btn-toggle card-method-btn ${card.method === 'call' ? 'selected-clean' : ''}" data-method="call" style="padding: 7px 16px; font-size: 12px;">
              통화 (전화)
            </button>
          </div>
        </div>

        <!-- 3. 5대 지표 인터랙티브 상태체크 & 다단 리사이즈 세부내용 카드 리스트 -->
        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">
          
          <!-- 1) 건강상태 -->
          <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #ffffff;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 13px; font-weight: 700; color: #0f172a;">1. 건강상태</span>
              <div class="obs-scale3-group">
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.healthCheck === '양호' ? 'selected-good' : ''}" data-item="healthCheck" data-val="양호">양호</button>
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.healthCheck === '보통' ? 'selected-warning' : ''}" data-item="healthCheck" data-val="보통">보통</button>
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.healthCheck === '악화' ? 'selected-critical' : ''}" data-item="healthCheck" data-val="악화">악화</button>
              </div>
            </div>
            <div>
              <textarea class="card-note-textarea card-note-input" id="cardHealthNote" data-note-key="healthNote" placeholder="예: 규칙적으로 식사 및 복약 유지 중 / 식사 결손 징후 등">${card.healthNote || ''}</textarea>
            </div>
          </div>

          <!-- 2) 심리상태 -->
          <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #ffffff;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 13px; font-weight: 700; color: #0f172a;">2. 심리상태</span>
              <div class="obs-scale3-group">
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.psychoCheck === '안정' ? 'selected-good' : ''}" data-item="psychoCheck" data-val="안정">안정</button>
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.psychoCheck === '불안' ? 'selected-warning' : ''}" data-item="psychoCheck" data-val="불안">불안</button>
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.psychoCheck === '우울' ? 'selected-critical' : ''}" data-item="psychoCheck" data-val="우울">우울</button>
              </div>
            </div>
            <div>
              <textarea class="card-note-textarea card-note-input" id="cardPsychoNote" data-note-key="psychoNote" placeholder="예: 대화 원활하며 정서적으로 편안한 상태 / 우울감 호소 등">${card.psychoNote || ''}</textarea>
            </div>
          </div>

          <!-- 3) 주거환경 상태 -->
          <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #ffffff;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 13px; font-weight: 700; color: #0f172a;">3. 주거환경 상태</span>
              <div class="obs-scale3-group">
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.livingCheck === '청결' ? 'selected-good' : ''}" data-item="livingCheck" data-val="청결">청결</button>
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.livingCheck === '정돈필요' ? 'selected-warning' : ''}" data-item="livingCheck" data-val="정돈필요">정돈필요</button>
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.livingCheck === '심각' ? 'selected-critical' : ''}" data-item="livingCheck" data-val="심각">심각</button>
              </div>
            </div>
            <div>
              <textarea class="card-note-textarea card-note-input" id="cardLivingNote" data-note-key="livingNote" placeholder="예: 실내외 청결 상태 양호하게 정돈됨 / 쓰레기 적치 등">${card.livingNote || ''}</textarea>
            </div>
          </div>

          <!-- 4) 이상징후여부 -->
          <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #ffffff;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 13px; font-weight: 700; color: #0f172a;">4. 이상징후여부</span>
              <div class="obs-scale3-group">
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.anomalyCheck === '없음' ? 'selected-good' : ''}" data-item="anomalyCheck" data-val="없음">없음</button>
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.anomalyCheck === '고립조짐' ? 'selected-warning' : ''}" data-item="anomalyCheck" data-val="고립조짐">고립조짐</button>
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.anomalyCheck === '응급징후' ? 'selected-critical' : ''}" data-item="anomalyCheck" data-val="응급징후">응급징후</button>
              </div>
            </div>
            <div>
              <textarea class="card-note-textarea card-note-input" id="cardAnomalyNote" data-note-key="anomalyNote" placeholder="예: 특이 이상징후 없이 일상생활 유지 중 / 연락두절 감지 등">${card.anomalyNote || ''}</textarea>
            </div>
          </div>

          <!-- 5) 기타사항 -->
          <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #ffffff;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 13px; font-weight: 700; color: #0f172a;">5. 기타사항</span>
              <div class="obs-scale3-group">
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.etcCheck === '있음' ? 'selected-warning' : ''}" data-item="etcCheck" data-val="있음">있음</button>
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.etcCheck === '없음' ? 'selected-good' : ''}" data-item="etcCheck" data-val="없음">없음</button>
              </div>
            </div>
            <div>
              <textarea class="card-note-textarea card-note-input" id="cardEtcNote" data-note-key="etcNote" placeholder="예: 긴급 생계 지원 또는 식사 배달 연계 필요">${card.etcNote || ''}</textarea>
            </div>
          </div>

        </div>

        <!-- 4. 참여자(활동가) 확인 영역 (수혜자 서명 배제) -->
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; margin-bottom: 16px;">
          <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">안부살핌 참여자 (활동가) 확인</div>
          <div style="font-size: 11.5px; color: #475569;">
            • 담당 참여자: <strong>${b.inspectors.join(', ')}</strong> (5단계 전자서명 날인 연동됨)
          </div>
        </div>

        <!-- 하단 이동 버튼 -->
        <div class="btn-action-row" style="margin-top: 14px; margin-bottom: 24px;">
          <button type="button" class="btn-secondary-action" id="btnBackToStep5">이전 단계 (동의·서명)</button>
          <button type="button" class="btn-primary-action" id="btnSubmitAndGoStep7">
            완료 및 저장 >
          </button>
        </div>

      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const card = this.mediator.state.beneficiaryCard;

    // 0. 인적사항 아코디언 토글
    const btnToggleProfile = document.getElementById('btnToggleProfileInStep6');
    const profileBody = document.getElementById('profileStep6Body');
    const profileIndicator = document.getElementById('profileStep6Indicator');

    if (btnToggleProfile && profileBody && profileIndicator) {
      btnToggleProfile.addEventListener('click', () => {
        this.isProfileExpanded = !this.isProfileExpanded;
        if (this.isProfileExpanded) {
          profileBody.style.display = 'block';
          profileIndicator.textContent = '[− 접기]';
          btnToggleProfile.style.borderBottom = '1px solid #e2e8f0';
        } else {
          profileBody.style.display = 'none';
          profileIndicator.textContent = '[+ 펼치기]';
          btnToggleProfile.style.borderBottom = 'none';
        }
      });
    }

    // 1. 방식 선택 (방문 vs 통화)
    document.querySelectorAll('.card-method-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const method = btn.getAttribute('data-method');
        card.method = method;
        document.querySelectorAll('.card-method-btn').forEach(b => b.classList.remove('selected-clean'));
        btn.classList.add('selected-clean');
      });
    });

    // 2. 5대 항목 버튼 클릭 바인딩
    document.querySelectorAll('.card-status-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemKey = btn.getAttribute('data-item');
        const val = btn.getAttribute('data-val');
        card[itemKey] = val;

        const parentGroup = btn.parentElement;
        parentGroup.querySelectorAll('.card-status-btn').forEach(b => {
          b.classList.remove('selected-good', 'selected-warning', 'selected-critical');
        });

        if (val === '양호' || val === '안정' || val === '청결' || val === '없음') {
          btn.classList.add('selected-good');
        } else if (val === '보통' || val === '불안' || val === '정돈필요' || val === '고립조짐' || val === '있음') {
          btn.classList.add('selected-warning');
        } else if (val === '악화' || val === '우울' || val === '심각' || val === '응급징후') {
          btn.classList.add('selected-critical');
        }
      });
    });

    // 3. 세부내용 텍스트 입력 바인딩
    document.querySelectorAll('.card-note-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const noteKey = input.getAttribute('data-note-key');
        card[noteKey] = e.target.value;
      });
    });

    // 4. 이전 단계 버튼
    const backBtn = document.getElementById('btnBackToStep5');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.mediator.switchTab(5));
    }

    // 5. 완료 및 저장 (7단계 이동) 버튼
    const submitBtn = document.getElementById('btnSubmitAndGoStep7');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        this.mediator.handleSubmit();
      });
    }
  }
}
