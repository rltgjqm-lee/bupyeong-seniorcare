/**
 * @file step4MonitoringView.js
 * @description PWA 현장조사 Step 5: 모니터링 기록지 (상태평가, 세부활동내용 및 상담결과)
 * - 부평구 모니터링 기록지 및 활동일지 서식 원본 100% 매핑
 * - 순서: 주거환경 ➔ 건강상태 ➔ 생활실태 ➔ 세부 활동내용(상단 선택값 자동 반영+추가입력) ➔ 상담결과
 */

import { notifier } from '../../utils/notifier.js';

export class Step4MonitoringView {
  constructor(mediator) {
    this.mediator = mediator;
    this.isLivingOpen = false; // 생활 실태 기본 접힘
    this.isDetailOpen = false; // 세부 활동내용 기본 접힘
  }

  // 상단 선택값 기반 자동 요약 텍스트 생성
  buildAutoSummary(m) {
    const parts = [];

    // 건강상태
    if (m.healthGrade === '양호') {
      parts.push('건강상태: 양호(정상)');
    } else if (m.healthGrade === '주의') {
      const dis = m.chronicDisease || '만성질환';
      const det = m.diseaseDetail ? `(${m.diseaseDetail})` : '';
      parts.push(`건강상태: 주의[${dis}${det}]`);
    } else if (m.healthGrade === '긴급') {
      const urg = m.urgentType || '비상';
      const act = m.urgentAction ? `(${m.urgentAction})` : '';
      parts.push(`건강상태: 긴급[${urg}${act}]`);
    }

    // 주 수발자
    if (m.primaryCaregiver) {
      const cgiver = m.primaryCaregiver === '기타' && m.primaryCaregiverCustom ? m.primaryCaregiverCustom : m.primaryCaregiver;
      parts.push(`주수발자: ${cgiver}`);
    }

    // 일상생활
    if (m.dailyLivingGrade) {
      parts.push(`일상생활: ${m.dailyLivingGrade}`);
    }

    // 필요 서비스
    if (m.neededService) {
      const nService = m.neededService === '기타' && m.neededServiceCustom ? m.neededServiceCustom : m.neededService;
      parts.push(`필요서비스: ${nService}`);
    }

    return parts.join(' | ');
  }

  render(containerId = 'step5Container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const m = this.mediator.state.monitoring;
    const a = this.mediator.state.activityCard;
    const curActivity = a.currentEntry;
    const isLinked = (m.consultResult || '').includes('연계 필요');

    const autoSummary = this.buildAutoSummary(m);
    const customNote = m.activityCustomNote || '';

    // 생활 실태 요약 문구 산출
    const livingParts = [];
    if (m.primaryCaregiver) {
      livingParts.push(m.primaryCaregiver === '기타' && m.primaryCaregiverCustom ? m.primaryCaregiverCustom : m.primaryCaregiver);
    }
    if (m.dailyLivingGrade) livingParts.push(m.dailyLivingGrade);
    if (m.neededService) {
      livingParts.push(m.neededService === '기타' && m.neededServiceCustom ? m.neededServiceCustom : m.neededService);
    }
    const isLivingComplete = !!(m.primaryCaregiver && m.dailyLivingGrade && m.neededService);
    const livingBadgeText = isLivingComplete 
      ? livingParts.join(' · ') 
      : (livingParts.length > 0 ? `${livingParts.join(' · ')} (일부)` : '미입력 (터치하여 선택)');

    container.innerHTML = `
      <!-- 1. 주거환경 -->
      <div class="pwa-card">
        <div class="card-header-bar">
          <span class="card-main-title">주거환경</span>
        </div>

        <div class="form-group" style="margin-bottom: 8px;">
          <label class="form-label">실내 청결 상태 <span class="req">*</span></label>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
            ${['청결', '보통', '불량'].map(env => `
              <button type="button" class="btn-tab-toggle ${m.housingEnv === env ? 'active' : ''}" data-env="${env}" style="padding: 9px; border-radius: 6px; font-weight: 700; font-size: 13.5px; cursor: pointer; border: 1px solid #cbd5e1; background: ${m.housingEnv === env ? '#1e293b' : '#ffffff'}; color: ${m.housingEnv === env ? '#ffffff' : '#334155'};">
                ${env}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="form-group" id="secHousingReason" style="${m.housingEnv === '불량' ? '' : 'display:none;'} margin-bottom: 0;">
          <label class="form-label" for="inputHousingReason">불량 사유 <span class="req">*</span></label>
          <input type="text" class="form-input" id="inputHousingReason" value="${m.housingEnvReason || ''}" placeholder="불량 사유를 입력하세요 (예: 곰팡이, 누수, 쓰레기 적치 등)" style="font-size: 13px;">
        </div>
      </div>

      <!-- 2. 대상자 건강상태 (3단 분기) -->
      <div class="pwa-card">
        <div class="card-header-bar">
          <span class="card-main-title">대상자 건강상태 <span class="req">*</span></span>
        </div>

        <div class="form-group" style="margin-bottom: 8px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
            ${[
              { key: '양호', label: '양호' },
              { key: '주의', label: '주의' },
              { key: '긴급', label: '긴급' }
            ].map(item => `
              <button type="button" class="btn-health-grade ${m.healthGrade === item.key ? 'active' : ''}" data-grade="${item.key}" style="padding: 10px; border-radius: 6px; font-weight: 700; font-size: 13.5px; cursor: pointer; border: 1px solid #cbd5e1; background: ${m.healthGrade === item.key ? '#1e293b' : '#ffffff'}; color: ${m.healthGrade === item.key ? '#ffffff' : '#334155'};">
                ${item.label}
              </button>
            `).join('')}
          </div>
          <div style="font-size: 11.5px; color: #64748b; margin-top: 6px;" id="txtHealthDesc">
            ${m.healthGrade === '양호' ? '식사·수면·거동 정상' : m.healthGrade === '주의' ? '만성질환 및 통증 호소' : m.healthGrade === '긴급' ? '발열, 낙상, 의식저하 등 비상상황' : '건강상태(양호/주의/긴급)를 선택하여 주십시오.'}
          </div>
        </div>

        <!-- 주의 선택 시 활성화 -->
        <div id="secHealthWarning" style="display: ${m.healthGrade === '주의' ? 'block' : 'none'}; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-top: 8px;">
          <label class="form-label" style="font-size: 12px;">주요 만성질환 선택 및 사유</label>
          <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 6px; margin-bottom: 6px;">
            <select class="form-input" id="selChronicDisease" style="font-size: 12.5px; height: 38px;">
              ${['근골격계 통증', '심혈관계', '내분비·대사계', '호흡기계', '기타'].map(d => `
                <option value="${d}" ${m.chronicDisease === d ? 'selected' : ''}>${d}</option>
              `).join('')}
            </select>
            <input type="text" class="form-input" id="inputDiseaseDetail" value="${m.diseaseDetail || ''}" placeholder="부위 및 사유 기재" style="font-size: 12.5px; height: 38px;">
          </div>
        </div>

        <!-- 긴급 선택 시 활성화 -->
        <div id="secHealthUrgent" style="display: ${m.healthGrade === '긴급' ? 'block' : 'none'}; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px; margin-top: 8px;">
          <label class="form-label" style="font-size: 12px; color: #991b1b;">비상 상황 유형 및 조치사항</label>
          <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 6px; margin-bottom: 6px;">
            <select class="form-input" id="selUrgentType" style="font-size: 12.5px; height: 38px;">
              ${['고열', '낙상사고', '의식저하', '응급진료필요', '기타'].map(u => `
                <option value="${u}" ${m.urgentType === u ? 'selected' : ''}>${u}</option>
              `).join('')}
            </select>
            <input type="text" class="form-input" id="inputUrgentAction" value="${m.urgentAction || ''}" placeholder="현장 조치사항 기재" style="font-size: 12.5px; height: 38px;">
          </div>
        </div>
      </div>

      <!-- 3. 생활 실태 (접기/펴기 아코디언) -->
      <div class="pwa-card" id="cardLivingCondition">
        <div class="card-header-bar" id="headerToggleLiving" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; padding-bottom: 2px;">
          <span class="card-main-title">생활 실태</span>
          <span id="badgeLivingStatus" style="font-size: 11px; padding: 3px 8px; border-radius: 6px; font-weight: 600; background: ${isLivingComplete ? '#e0f2fe' : '#f1f5f9'}; color: ${isLivingComplete ? '#0369a1' : '#64748b'}; border: 1px solid ${isLivingComplete ? '#bae6fd' : '#cbd5e1'};">
            ${livingBadgeText} <span id="arrowLiving">${this.isLivingOpen ? '▲' : '▼'}</span>
          </span>
        </div>

        <div id="bodyLivingCondition" style="display: ${this.isLivingOpen ? 'block' : 'none'}; margin-top: 10px; border-top: 1px solid #f1f5f9; padding-top: 10px;">
          <!-- 주 수발자 -->
          <div class="form-group" style="margin-bottom: 12px;">
            <label class="form-label">주 수발자 <span class="req">*</span></label>
            <div style="display: grid; grid-template-columns: 1fr ${m.primaryCaregiver === '기타' ? '1fr' : ''}; gap: 6px;">
              <select class="form-input" id="selCaregiver" style="font-size: 13px; height: 38px;">
                <option value="" disabled ${!m.primaryCaregiver ? 'selected' : ''}>-- 주 수발자 선택 --</option>
                ${['본인', '배우자', '성인자녀', '요양보호사', '기타'].map(opt => `
                  <option value="${opt}" ${m.primaryCaregiver === opt ? 'selected' : ''}>${opt}</option>
                `).join('')}
              </select>
              <input type="text" class="form-input" id="inputCaregiverCustom" value="${m.primaryCaregiverCustom || ''}" placeholder="직접 입력" style="font-size: 13px; height: 38px; display: ${m.primaryCaregiver === '기타' ? 'block' : 'none'};">
            </div>
          </div>

          <!-- 일상생활정도 -->
          <div class="form-group" style="margin-bottom: 12px;">
            <label class="form-label">일상생활정도 <span class="req">*</span></label>
            <select class="form-input" id="selDailyLiving" style="font-size: 13px; height: 38px;">
              <option value="" disabled ${!m.dailyLivingGrade ? 'selected' : ''}>-- 일상생활정도 선택 --</option>
              ${['독립 수행', '부분 도움', '전적 도움'].map(opt => `
                <option value="${opt}" ${m.dailyLivingGrade === opt ? 'selected' : ''}>${opt}</option>
              `).join('')}
            </select>
          </div>

          <!-- 필요한 서비스 -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">필요한 서비스 <span class="req">*</span></label>
            <div style="display: grid; grid-template-columns: 1fr ${m.neededService === '기타' ? '1fr' : ''}; gap: 6px;">
              <select class="form-input" id="selNeededService" style="font-size: 13px; height: 38px;">
                <option value="" disabled ${!m.neededService ? 'selected' : ''}>-- 필요한 서비스 선택 --</option>
                ${['가사지원', '식사지원', '건강·의료', '주거안전', '정서지원', '기타'].map(opt => `
                  <option value="${opt}" ${m.neededService === opt ? 'selected' : ''}>${opt}</option>
                `).join('')}
              </select>
              <input type="text" class="form-input" id="inputNeededServiceCustom" value="${m.neededServiceCustom || ''}" placeholder="직접 입력" style="font-size: 13px; height: 38px; display: ${m.neededService === '기타' ? 'block' : 'none'};">
            </div>
          </div>
        </div>
      </div>

      <!-- 4. 세부 활동내용 (접기/펴기 아코디언) -->
      <div class="pwa-card" id="cardActivityDetail">
        <div class="card-header-bar" id="headerToggleDetail" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; padding-bottom: 2px;">
          <span class="card-main-title">세부 활동내용 <span class="req">*</span></span>
          <span id="badgeDetailStatus" style="font-size: 11px; padding: 3px 8px; border-radius: 6px; font-weight: 600; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;">
            ${this.isDetailOpen ? '접기 ▲' : '요약 및 특이사항 (펼치기 ▼)'}
          </span>
        </div>

        <div id="bodyActivityDetail" style="display: ${this.isDetailOpen ? 'block' : 'none'}; margin-top: 10px; border-top: 1px solid #f1f5f9; padding-top: 10px;">
          <!-- 상단 선택 기반 자동 요약 표시 -->
          <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px;">
            <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 4px;">활동내역 자동 요약 (기록지 자동 반영)</div>
            <div id="txtAutoSummaryBox" style="font-size: 12.5px; color: #0f172a; line-height: 1.45; word-break: break-all;">
              ${autoSummary}
            </div>
          </div>

          <!-- 추가 특이사항 입력창 -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" for="inputDetailCustom" style="font-size: 12.5px;">추가 특이사항 (선택 입력)</label>
            <textarea class="form-input" id="inputDetailCustom" rows="3" placeholder="어르신 안부 확인, 면담 특이사항 및 추가 활동 내용을 간단히 기재하세요." style="line-height: 1.45; font-size: 13px;">${customNote}</textarea>
          </div>
        </div>
      </div>

      <!-- 5. 상담결과 (서식 원본 명칭 준수 및 화면 최하단 배치) -->
      <div class="pwa-card">
        <div class="card-header-bar">
          <span class="card-main-title">상담결과</span>
        </div>

        <div class="form-group" style="margin-bottom: 12px;">
          <label class="form-label">상담 결과 <span class="req">*</span></label>
          <div style="display: grid; grid-template-columns: 1fr 1.3fr; gap: 8px;">
            <button type="button" class="btn-tab-toggle ${!isLinked ? 'active' : ''}" id="btnResultNormal" style="padding: 10px; border-radius: 6px; font-weight: 700; font-size: 13px; cursor: pointer; border: 1px solid #cbd5e1; background: ${!isLinked ? '#1e293b' : '#ffffff'}; color: ${!isLinked ? '#ffffff' : '#334155'};">
              희망 서비스 없음
            </button>
            <button type="button" class="btn-tab-toggle ${isLinked ? 'active' : ''}" id="btnResultLink" style="padding: 10px; border-radius: 6px; font-weight: 700; font-size: 13px; cursor: pointer; border: 1px solid #cbd5e1; background: ${isLinked ? '#334155' : '#ffffff'}; color: ${isLinked ? '#ffffff' : '#334155'};">
              서비스 연계 필요<br><span style="font-size: 11px; font-weight: normal;">(동 행정복지센터 심층상담)</span>
            </button>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" for="inputConsultOpinion">기타 상담 의견</label>
          <textarea class="form-input" id="inputConsultOpinion" rows="2" placeholder="정기 모니터링 종합 소견 및 동 복지센터 전달 사항을 기재하세요." style="font-size: 13px; line-height: 1.45;">${m.consultOpinion || ''}</textarea>
        </div>
      </div>

      <!-- 하단 액션 버튼: 이전 버튼 배제, 확인 및 다음 버튼 채도 낮추고 우측 정렬 -->
      <div style="display: flex; justify-content: flex-end; margin-top: 18px; margin-bottom: 30px;">
        <button type="button" class="btn-primary-action" id="btnNextToStep6" style="min-width: 160px; height: 46px; font-size: 14.5px; font-weight: 700; background: #1e293b; color: #ffffff; border-radius: 6px; border: none; cursor: pointer; padding: 0 20px;">
          다음 (동의·서명) ➔
        </button>
      </div>
    `;

    this.bindEvents();
  }

  updateSummaryBox() {
    const m = this.mediator.state.monitoring;
    const a = this.mediator.state.activityCard;
    const box = document.getElementById('txtAutoSummaryBox');
    const autoSummary = this.buildAutoSummary(m);
    if (box) box.textContent = autoSummary;

    // 최종 세부 활동내용 조합
    const customNote = m.activityCustomNote || '';
    const fullContent = customNote ? `${autoSummary}\n[특이사항] ${customNote}` : autoSummary;
    a.currentEntry.content = fullContent;
    m.activityContent = fullContent;
  }

  bindEvents() {
    const m = this.mediator.state.monitoring;
    const a = this.mediator.state.activityCard;

    // 1) 주거환경
    const envBtns = document.querySelectorAll('[data-env]');
    const secReason = document.getElementById('secHousingReason');
    const inputReason = document.getElementById('inputHousingReason');

    envBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const val = e.currentTarget.dataset.env;
        m.housingEnv = val;
        envBtns.forEach(b => {
          const isSelected = (b.dataset.env === val);
          b.style.background = isSelected ? '#1e293b' : '#ffffff';
          b.style.color = isSelected ? '#ffffff' : '#334155';
        });
        if (secReason) secReason.style.display = (val === '불량') ? 'block' : 'none';
        this.updateSummaryBox();
      });
    });

    if (inputReason) {
      inputReason.addEventListener('input', (e) => {
        m.housingEnvReason = e.target.value.trim();
        this.updateSummaryBox();
      });
    }

    // 2) 건강상태
    const gradeBtns = document.querySelectorAll('.btn-health-grade');
    const txtHealthDesc = document.getElementById('txtHealthDesc');
    const secWarning = document.getElementById('secHealthWarning');
    const secUrgent = document.getElementById('secHealthUrgent');

    gradeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const grade = e.currentTarget.dataset.grade;
        m.healthGrade = grade;
        m.healthState = grade;

        gradeBtns.forEach(b => {
          const isSelected = (b.dataset.grade === grade);
          b.style.background = isSelected ? '#1e293b' : '#ffffff';
          b.style.color = isSelected ? '#ffffff' : '#334155';
        });

        if (txtHealthDesc) {
          txtHealthDesc.textContent = (grade === '양호')
            ? '식사·수면·거동 정상'
            : (grade === '주의')
              ? '만성질환 및 통증 호소'
              : '발열, 낙상, 의식저하 등 비상상황';
        }

        if (secWarning) secWarning.style.display = (grade === '주의') ? 'block' : 'none';
        if (secUrgent) secUrgent.style.display = (grade === '긴급') ? 'block' : 'none';

        this.updateSummaryBox();
      });
    });

    const selChronic = document.getElementById('selChronicDisease');
    if (selChronic) {
      selChronic.addEventListener('change', (e) => {
        m.chronicDisease = e.target.value;
        this.updateSummaryBox();
      });
    }

    const inputDisease = document.getElementById('inputDiseaseDetail');
    if (inputDisease) {
      inputDisease.addEventListener('input', (e) => {
        m.diseaseDetail = e.target.value.trim();
        this.updateSummaryBox();
      });
    }

    const selUrgent = document.getElementById('selUrgentType');
    if (selUrgent) {
      selUrgent.addEventListener('change', (e) => {
        m.urgentType = e.target.value;
        this.updateSummaryBox();
      });
    }

    const inputUrgentAction = document.getElementById('inputUrgentAction');
    if (inputUrgentAction) {
      inputUrgentAction.addEventListener('input', (e) => {
        m.urgentAction = e.target.value.trim();
        this.updateSummaryBox();
      });
    }

    // 3) 생활 실태 아코디언 토글 및 입력 바인딩
    const headerToggleLiving = document.getElementById('headerToggleLiving');
    const bodyLiving = document.getElementById('bodyLivingCondition');
    const badgeLiving = document.getElementById('badgeLivingStatus');

    const updateLivingBadge = () => {
      const parts = [];
      if (m.primaryCaregiver) {
        parts.push(m.primaryCaregiver === '기타' && m.primaryCaregiverCustom ? m.primaryCaregiverCustom : m.primaryCaregiver);
      }
      if (m.dailyLivingGrade) parts.push(m.dailyLivingGrade);
      if (m.neededService) {
        parts.push(m.neededService === '기타' && m.neededServiceCustom ? m.neededServiceCustom : m.neededService);
      }
      const isComplete = !!(m.primaryCaregiver && m.dailyLivingGrade && m.neededService);
      const text = isComplete 
        ? parts.join(' · ') 
        : (parts.length > 0 ? `${parts.join(' · ')} (일부)` : '미입력 (터치하여 선택)');

      if (badgeLiving) {
        badgeLiving.style.background = isComplete ? '#e0f2fe' : '#f1f5f9';
        badgeLiving.style.color = isComplete ? '#0369a1' : '#64748b';
        badgeLiving.style.borderColor = isComplete ? '#bae6fd' : '#cbd5e1';
        badgeLiving.innerHTML = `${text} <span id="arrowLiving">${this.isLivingOpen ? '▲' : '▼'}</span>`;
      }
    };

    if (headerToggleLiving && bodyLiving) {
      headerToggleLiving.addEventListener('click', () => {
        this.isLivingOpen = !this.isLivingOpen;
        bodyLiving.style.display = this.isLivingOpen ? 'block' : 'none';
        updateLivingBadge();
      });
    }

    // 4) 세부 활동내용 아코디언 토글
    const headerToggleDetail = document.getElementById('headerToggleDetail');
    const bodyDetail = document.getElementById('bodyActivityDetail');
    const badgeDetail = document.getElementById('badgeDetailStatus');

    if (headerToggleDetail && bodyDetail) {
      headerToggleDetail.addEventListener('click', () => {
        this.isDetailOpen = !this.isDetailOpen;
        bodyDetail.style.display = this.isDetailOpen ? 'block' : 'none';
        if (badgeDetail) {
          badgeDetail.textContent = this.isDetailOpen ? '접기 ▲' : '요약 및 특이사항 (펼치기 ▼)';
        }
      });
    }

    const selCaregiver = document.getElementById('selCaregiver');
    const inputCaregiverCustom = document.getElementById('inputCaregiverCustom');
    if (selCaregiver && inputCaregiverCustom) {
      selCaregiver.addEventListener('change', (e) => {
        const val = e.target.value;
        m.primaryCaregiver = val;
        if (val === '기타') {
          inputCaregiverCustom.style.display = 'block';
        } else {
          inputCaregiverCustom.style.display = 'none';
          m.primaryCaregiverCustom = '';
        }
        updateLivingBadge();
        this.updateSummaryBox();
      });
      inputCaregiverCustom.addEventListener('input', (e) => {
        m.primaryCaregiverCustom = e.target.value.trim();
        updateLivingBadge();
        this.updateSummaryBox();
      });
    }

    const selDaily = document.getElementById('selDailyLiving');
    if (selDaily) {
      selDaily.addEventListener('change', (e) => {
        m.dailyLivingGrade = e.target.value;
        updateLivingBadge();
        this.updateSummaryBox();
      });
    }

    const selNeeded = document.getElementById('selNeededService');
    const inputNeededCustom = document.getElementById('inputNeededServiceCustom');
    if (selNeeded && inputNeededCustom) {
      selNeeded.addEventListener('change', (e) => {
        const val = e.target.value;
        m.neededService = val;
        if (val === '기타') {
          inputNeededCustom.style.display = 'block';
        } else {
          inputNeededCustom.style.display = 'none';
          m.neededServiceCustom = '';
        }
        updateLivingBadge();
        this.updateSummaryBox();
      });
      inputNeededCustom.addEventListener('input', (e) => {
        m.neededServiceCustom = e.target.value.trim();
        updateLivingBadge();
        this.updateSummaryBox();
      });
    }

    // 4) 세부 활동내용 추가 특이사항
    const inputCustom = document.getElementById('inputDetailCustom');
    if (inputCustom) {
      inputCustom.addEventListener('input', (e) => {
        m.activityCustomNote = e.target.value.trim();
        this.updateSummaryBox();
      });
    }

    // 초기 1회 요약 갱신
    this.updateSummaryBox();

    // 5) 상담결과
    const btnNormal = document.getElementById('btnResultNormal');
    const btnLink = document.getElementById('btnResultLink');

    if (btnNormal) {
      btnNormal.addEventListener('click', () => {
        m.consultResult = '희망 서비스 없음';
        btnNormal.style.background = '#1e293b';
        btnNormal.style.color = '#ffffff';
        btnLink.style.background = '#ffffff';
        btnLink.style.color = '#334155';
      });
    }

    if (btnLink) {
      btnLink.addEventListener('click', () => {
        m.consultResult = '서비스 연계 필요 (동 행정복지센터 심층상담 연계)';
        btnLink.style.background = '#334155';
        btnLink.style.color = '#ffffff';
        btnNormal.style.background = '#ffffff';
        btnNormal.style.color = '#334155';
        notifier.toast('동 행정복지센터 심층상담 연계의뢰 대상으로 설정되었습니다.', 'info');
      });
    }

    const inputOpinion = document.getElementById('inputConsultOpinion');
    if (inputOpinion) {
      inputOpinion.addEventListener('input', (e) => {
        m.consultOpinion = e.target.value.trim();
      });
    }

    // 다음 (동의·서명) 버튼
    const btnNext = document.getElementById('btnNextToStep6');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        // 필수 모니터링 실태조사 대전제(Guard Condition) 검증
        if (m.housingEnv === '불량' && (!m.housingEnvReason || !m.housingEnvReason.trim())) {
          notifier.toast('주거환경 불량 사유를 입력하여 주십시오.', 'warning');
          document.getElementById('inputHousingReason')?.focus();
          return;
        }

        if (!m.healthGrade) {
          notifier.toast('대상자 건강상태(양호/주의/긴급)를 선택하여 주십시오.', 'warning');
          document.querySelector('.btn-health-grade')?.focus();
          return;
        }

        if (m.healthGrade === '주의' && m.chronicDisease === '기타' && (!m.diseaseDetail || !m.diseaseDetail.trim())) {
          notifier.toast('만성질환 상세 사유를 입력하여 주십시오.', 'warning');
          document.getElementById('inputDiseaseDetail')?.focus();
          return;
        }

        if (m.healthGrade === '긴급' && (!m.urgentAction || !m.urgentAction.trim())) {
          notifier.toast('비상 상황 현장 조치사항을 입력하여 주십시오.', 'warning');
          document.getElementById('inputUrgentAction')?.focus();
          return;
        }

        const ensureLivingOpen = () => {
          if (!this.isLivingOpen) {
            this.isLivingOpen = true;
            if (bodyLiving) bodyLiving.style.display = 'block';
            updateLivingBadge();
          }
        };

        if (!m.primaryCaregiver) {
          ensureLivingOpen();
          notifier.toast('주 수발자를 선택하여 주십시오.', 'warning');
          document.getElementById('selCaregiver')?.focus();
          return;
        }

        if (m.primaryCaregiver === '기타' && (!m.primaryCaregiverCustom || !m.primaryCaregiverCustom.trim())) {
          ensureLivingOpen();
          notifier.toast('주 수발자 직접 입력란을 작성하여 주십시오.', 'warning');
          document.getElementById('inputCaregiverCustom')?.focus();
          return;
        }

        if (!m.dailyLivingGrade) {
          ensureLivingOpen();
          notifier.toast('일상생활정도를 선택하여 주십시오.', 'warning');
          document.getElementById('selDailyLiving')?.focus();
          return;
        }

        if (!m.neededService) {
          ensureLivingOpen();
          notifier.toast('필요한 서비스를 선택하여 주십시오.', 'warning');
          document.getElementById('selNeededService')?.focus();
          return;
        }

        if (m.neededService === '기타' && (!m.neededServiceCustom || !m.neededServiceCustom.trim())) {
          ensureLivingOpen();
          notifier.toast('필요한 서비스 직접 입력란을 작성하여 주십시오.', 'warning');
          document.getElementById('inputNeededServiceCustom')?.focus();
          return;
        }

        if (!m.consultResult) {
          notifier.toast('상담결과를 선택하여 주십시오.', 'warning');
          return;
        }

        this.updateSummaryBox();

        // 활동카드 목록에 당일 회차 기록 누적/갱신
        const cur = a.currentEntry;
        const roundNum = a.records.length + 1;
        const alreadyExists = a.records.some(r => r.round === roundNum && r.date === cur.date);
        if (!alreadyExists) {
          a.records.push({
            round: roundNum,
            date: cur.date,
            time: cur.time,
            isConsulted: true,
            unmetReason: '',
            content: cur.content
          });
        } else {
          const targetRecord = a.records.find(r => r.round === roundNum);
          if (targetRecord) {
            targetRecord.content = cur.content;
          }
        }

        // 6단계 (동의·서명)으로 이동
        this.mediator.switchTab(6);
      });
    }
  }
}
