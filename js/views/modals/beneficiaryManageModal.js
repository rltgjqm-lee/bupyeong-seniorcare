/**
 * @file beneficiaryManageModal.js
 * @description 수혜자 관리카드 이력 조회 및 일정 관리 모달 모듈 (ESM)
 *              - 1번: 과거 일정 이력 (타임라인)
 *              - 2번: 건강상태 & 투약 (양호/보통/악화 + 메모)
 *              - 3번: 심리·정서 (우울/말벗) (안정/보통/불안우울 + 메모)
 *              - 4번: 특이사항 및 조치 (주거환경 및 연계 요청 메모)
 *              - 5번: 수혜카드 이력 & 비대면 상담 (마스터-디테일: 좌측 이력목록 및 비대면작성버튼 / 우측 상세열람 및 작성폼)
 *              - 6번: 다음 방문·상담 일정 세팅 (방식, 일자, 시간대, 담당 살핌단, 사전메모)
 *              - 전체화면 확대/축소 토글 지원
 */

import { notifier } from '../../utils/notifier.js';
import { UidEngine } from '../../core/uid.js';
import { RbacService } from '../../services/rbacService.js';

export class BeneficiaryManageModal {
  constructor(options = {}) {
    this.modalEl = document.getElementById('beneHistoryScheduleModal');
    this.onSaved = options.onSaved || null;
    this.currentCase = null;
    this.currentCards = [];
    this.allCards = [];
    this.currentTab = 'tab1';
    this.selectedCardIndex = 0;
    this.isFullscreen = false;

    this.bindStaticEvents();
  }

  bindStaticEvents() {
    if (!this.modalEl) return;

    // 닫기 버튼
    const btnClose = document.getElementById('btnCloseBeneHistoryModal');
    if (btnClose) {
      btnClose.onclick = () => this.close();
    }

    // 확대/축소 토글 버튼
    const btnToggleFullscreen = document.getElementById('btnToggleBeneHistFullscreen');
    if (btnToggleFullscreen) {
      btnToggleFullscreen.onclick = () => this.toggleFullscreen();
    }

    // ESC 키 닫기
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalEl.classList.contains('active')) {
        this.close();
      }
    });

    // 1~6번 상단 탭 버튼 클릭 바인딩
    const tabChips = this.modalEl.querySelectorAll('.review-tab-chip[data-bene-tab]');
    tabChips.forEach(chip => {
      chip.onclick = () => {
        const tabKey = chip.getAttribute('data-bene-tab');
        this.switchTab(tabKey);
      };
    });

    // 5번 탭 [+ 비대면 상담 작성] 버튼
    const btnCallForm = document.getElementById('btnOpenCallCardForm');
    if (btnCallForm) {
      btnCallForm.onclick = () => this.renderCallCardForm();
    }

    // 6번 탭 저장 버튼
    const btnSave = document.getElementById('btnSaveBeneManage');
    if (btnSave) {
      btnSave.onclick = () => this.handleSave();
    }
  }

  switchTab(tabKey) {
    this.currentTab = tabKey;
    const tabChips = this.modalEl.querySelectorAll('.review-tab-chip[data-bene-tab]');
    tabChips.forEach(chip => {
      if (chip.getAttribute('data-bene-tab') === tabKey) chip.classList.add('active');
      else chip.classList.remove('active');
    });

    const panes = this.modalEl.querySelectorAll('.bene-tab-pane');
    panes.forEach(pane => {
      pane.style.display = 'none';
    });

    const targetPaneId = `beneTabPane${tabKey.replace('tab', '')}`;
    const targetPane = document.getElementById(targetPaneId);
    if (targetPane) {
      targetPane.style.display = 'block';
    }

    // 5번 탭으로 이동 시 초기 카드 상세 렌더링
    if (tabKey === 'tab5') {
      if (this.currentCards.length > 0) {
        this.renderCardDetail(this.selectedCardIndex);
      } else {
        this.renderCallCardForm();
      }
    }
  }

  toggleFullscreen() {
    const modalWindow = this.modalEl.querySelector('.admin-modal-window');
    const iconEl = document.getElementById('iconBeneHistFullscreen');
    const txtEl = document.getElementById('txtBeneHistFullscreen');

    this.isFullscreen = !this.isFullscreen;
    if (this.isFullscreen) {
      modalWindow?.classList.add('fullscreen');
      if (iconEl) iconEl.textContent = '🗗';
      if (txtEl) txtEl.textContent = '축소';
    } else {
      modalWindow?.classList.remove('fullscreen');
      if (iconEl) iconEl.textContent = '⛶';
      if (txtEl) txtEl.textContent = '전체화면';
    }
  }

  open(caseItem, cards = []) {
    if (!this.modalEl || !caseItem) return;

    this.currentCase = caseItem;
    this.allCards = cards;
    this.currentCards = cards.filter(c => c.case_uid === caseItem.uid);
    this.selectedCardIndex = 0;

    // 헤더 인적사항 바인딩
    this.renderHeader();

    // 1번 과거 일정 이력
    this.renderPastSchedules();

    // 2, 3번 현재 상태값 바인딩
    this.populateCurrentStatus();

    // 4번 4대 맞춤 사업단 연계 현황
    this.renderBuStatus();

    // 5번 수혜카드 목록 및 디테일 렌더링
    this.renderCardsList();

    // 6번 다음 일정 세팅 기본값
    this.populateNextSchedule();

    // 1번 탭으로 초기 활성화
    this.switchTab('tab1');

    this.modalEl.classList.add('active');
  }

  close() {
    if (this.modalEl) {
      this.modalEl.classList.remove('active');
      const modalWindow = this.modalEl.querySelector('.admin-modal-window');
      modalWindow?.classList.remove('fullscreen');
      this.isFullscreen = false;
      const iconEl = document.getElementById('iconBeneHistFullscreen');
      const txtEl = document.getElementById('txtBeneHistFullscreen');
      if (iconEl) iconEl.textContent = '⛶';
      if (txtEl) txtEl.textContent = '전체화면';
    }
  }

  renderHeader() {
    const nameEl = document.getElementById('beneHistTargetName');
    const metaEl = document.getElementById('beneHistTargetMeta');
    const uidEl = document.getElementById('beneHistTargetUid');
    const gradeEl = document.getElementById('beneHistTargetGrade');
    const periodEl = document.getElementById('beneHistTargetPeriod');

    const c = this.currentCase;
    const canWrite = RbacService.canWriteTarget(c);

    if (nameEl) {
      if (canWrite) {
        nameEl.textContent = c.name || '대상자';
      } else {
        // 타 사업단 대상자: 성명 마스킹 (예: 김*수)
        const rawName = c.name || '대상자';
        nameEl.textContent = rawName.length <= 2 ? rawName[0] + '*' : rawName[0] + '*' + rawName.slice(2);
      }
    }

    if (metaEl) {
      if (canWrite) {
        metaEl.textContent = `(${c.gender || '남'}/${c.age || 75}세, ${c.address || ''})`;
      } else {
        // 타 사업단 대상자: 주소 마스킹
        metaEl.textContent = `(${c.gender || '남'}/${c.age || 75}세, 부평구 ***)`;
      }
    }
    if (uidEl) uidEl.textContent = c.uid;

    const GRADE_MAP = {
      critical: { text: '초고위험', period: '권장 순찰: 주 3회' },
      high: { text: '고위험', period: '권장 순찰: 주 2회' },
      mid: { text: '중위험', period: '권장 순찰: 주 1회' },
      clean: { text: '저위험', period: '권장 순찰: 월 2회' }
    };
    const gInfo = GRADE_MAP[c.grade] || GRADE_MAP.clean;

    if (gradeEl) {
      gradeEl.className = `grade-pill ${c.grade || 'high'}`;
      gradeEl.textContent = canWrite ? gInfo.text : `${gInfo.text} (타 사업단 열람)`;
    }
    if (periodEl) periodEl.textContent = gInfo.period;

    // 저장 버튼들 가드 적용
    const btnSave = document.getElementById('btnBeneHistSave');
    if (btnSave) {
      btnSave.disabled = !canWrite;
      btnSave.style.opacity = canWrite ? '1' : '0.5';
      btnSave.style.cursor = canWrite ? 'pointer' : 'not-allowed';
      btnSave.title = canWrite ? '일정 및 카드 저장' : '타 사업단 연계 대상자 (읽기 전용)';
    }

    const btnStartCall = document.getElementById('btnBeneStartCallCard');
    if (btnStartCall) {
      btnStartCall.disabled = !canWrite;
      btnStartCall.style.opacity = canWrite ? '1' : '0.5';
      btnStartCall.style.cursor = canWrite ? 'pointer' : 'not-allowed';
      btnStartCall.title = canWrite ? '비대면 상담카드 작성' : '타 사업단 연계 대상자 (읽기 전용)';
    }
  }

  async renderPastSchedules() {
    const container = document.getElementById('beneHistScheduleListContainer');
    const countEl = document.getElementById('beneHistScheduleCount');
    if (!container) return;

    // 1. D1 사업단 연동 예정 스케줄 비동기 조회
    let buSchedules = [];
    if (this.currentCase?.uid) {
      try {
        const resp = await fetch(`/api/v1/cases/${encodeURIComponent(this.currentCase.uid)}/schedules`);
        if (resp.ok) {
          const data = await resp.json();
          buSchedules = data.schedules || [];
        }
      } catch (e) {
        console.warn('[BeneficiaryManageModal] fetch bu schedules error:', e);
      }
    }

    const totalCount = this.currentCards.length + buSchedules.length;
    if (countEl) countEl.textContent = `총 ${totalCount}건 (과거이력 ${this.currentCards.length}건, 사업단예정 ${buSchedules.length}건)`;

    if (totalCount === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 36px 16px; color: #94a3b8; font-size: 13px;">
          등록된 안부확인 및 사업단 활동 일정이 없습니다.
        </div>
      `;
      return;
    }

    const BU_NAMES = {
      ME: { name: '식사지원', color: '#1d4ed8', bg: '#eff6ff' },
      HE: { name: '건강의료', color: '#15803d', bg: '#f0fdf4' },
      CL: { name: '주거개선', color: '#c2410c', bg: '#fff7ed' },
      EM: { name: '정서이웃', color: '#7e22ce', bg: '#faf5ff' }
    };

    // 사업단 예정 스케줄 HTML
    const buSchedHtml = buSchedules.map(s => {
      const bInfo = BU_NAMES[s.buCode || s.bu_code] || { name: s.buCode || '사업단', color: '#2563eb', bg: '#eff6ff' };
      const workerStr = Array.isArray(s.workerNames) ? s.workerNames.join(', ') : (s.worker || '담당자');
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 11px 14px; background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 6px; font-size: 12px; margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-weight: 800; color: #15803d; font-size: 11px; background: #dcfce7; padding: 2px 6px; border-radius: 3px; border: 1px solid #bbf7d0;">
              [예정]
            </span>
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; color: ${bInfo.color}; background: ${bInfo.bg}; border: 1px solid ${bInfo.color}30;">
              ${bInfo.name} (${s.buCode || s.bu_code})
            </span>
            <span style="font-family: monospace; color: #0f172a; font-weight: 700;">${s.date || s.activity_date} ${s.time || ''}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 14px;">
            <span style="color: #475569; font-size: 11.5px;">내용: <strong>${s.content || s.activityType || '방문 서비스'}</strong></span>
            <span style="color: #0f172a; font-weight: 700; font-size: 11.5px;">${workerStr}</span>
            <span style="font-family: monospace; font-size: 10px; color: #94a3b8;">${s.id || s.activity_uid || ''}</span>
          </div>
        </div>
      `;
    }).join('');

    // 과거 안부확인 카드 이력 HTML
    const pastCardsHtml = this.currentCards.map((crd, idx) => {
      const isVisit = crd.contact_method === '방문';
      const round = this.currentCards.length - idx;
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px; margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-weight: 800; color: #0f172a; width: 36px;">${round}차</span>
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; ${isVisit ? 'color:#15803d; background:#dcfce7;' : 'color:#1d4ed8; background:#dbeafe;'}">
              ${isVisit ? '대면 방문' : '비대면 통화'}
            </span>
            <span style="font-family: monospace; color: #334155; font-weight: 600;">${(crd.check_date || '').slice(0, 16)}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 14px;">
            <span style="color: #64748b; font-size: 11.5px;">건강: <strong>[${crd.health_check || '양호'}]</strong></span>
            <span style="color: #64748b; font-size: 11.5px;">심리: <strong>[${crd.psycho_check || '안정'}]</strong></span>
            <span style="color: #0f172a; font-weight: 700; font-size: 11.5px;">${crd.inspector || '살핌단'}</span>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = buSchedHtml + pastCardsHtml;
  }

  populateCurrentStatus() {
    const latestCard = this.currentCards[0] || {};
    
    // 2. 건강상태
    const healthVal = latestCard.health_check || '양호';
    const healthRadio = document.querySelector(`input[name="beneModalHealth"][value="${healthVal}"]`);
    if (healthRadio) healthRadio.checked = true;
    const inpHealthNote = document.getElementById('inpBeneModalHealthNote');
    if (inpHealthNote) inpHealthNote.value = latestCard.health_note || '';

    // 3. 심리·정서
    const psychoVal = latestCard.psycho_check || '안정';
    const psychoRadio = document.querySelector(`input[name="beneModalPsycho"][value="${psychoVal}"]`);
    if (psychoRadio) psychoRadio.checked = true;
    const inpPsychoNote = document.getElementById('inpBeneModalPsychoNote');
    if (inpPsychoNote) inpPsychoNote.value = latestCard.psycho_note || '';

    // 3. 특이사항
    const inpEtcNote = document.getElementById('inpBeneModalEtcNote');
    if (inpEtcNote) inpEtcNote.value = latestCard.etc_note || latestCard.living_note || '';
  }

  // 4번 탭: 4대 맞춤 사업단 연계 현황 렌더링
  renderBuStatus() {
    const grid = document.getElementById('beneBuStatusGrid');
    const badge = document.getElementById('beneBuAssignedBadge');
    if (!grid) return;

    const buList = this.currentCase?.buList || [];
    if (badge) badge.textContent = `연계 ${buList.length}개 사업단`;

    const BU_DEFS = [
      {
        code: 'ME',
        name: '식사지원 사업단 (ME)',
        desc: '영양 결핍 긴급 영양죽 배달 및 주 3회 밑반찬 정기 지원',
        schedule: '매주 월·수·금 10:00 (밑반찬/죽 배달)',
        team: '1조 (김조사, 박살핌)'
      },
      {
        code: 'HE',
        name: '건강의료 사업단 (HE)',
        desc: '만성질환 복약 모니터링 및 보건소 이동진료차량 연계',
        schedule: '격주 화요일 14:00 (방문간호)',
        team: '1조 (김조사, 박살핌)'
      },
      {
        code: 'CL',
        name: '주거개선 사업단 (CL)',
        desc: '주거 결함 점검, 청소·방역 및 겨울철 방한용품 지원',
        schedule: '월 1회 정기 주거환경 점검',
        team: '2조 (이순신, 강감찬)'
      },
      {
        code: 'EM',
        name: '정서이웃 사업단 (EM)',
        desc: '1:1 안심이웃 말벗 결연 및 주 2회 정례 안부확인',
        schedule: '매주 화·목 15:00 (말벗상담)',
        team: '1조 (김조사, 박살핌)'
      }
    ];

    grid.innerHTML = BU_DEFS.map(bu => {
      const isAssigned = buList.includes(bu.code);
      return `
        <div style="border: 1px solid ${isAssigned ? '#cbd5e1' : '#e2e8f0'}; border-radius: 6px; padding: 12px 14px; background: ${isAssigned ? '#ffffff' : '#f8fafc'}; opacity: ${isAssigned ? '1' : '0.65'};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <strong style="font-size: 13px; color: ${isAssigned ? '#0f172a' : '#64748b'};">${bu.name}</strong>
            <span style="font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 3px; ${isAssigned ? 'color:#15803d; background:#dcfce7; border:1px solid #bbf7d0;' : 'color:#64748b; background:#e2e8f0;'}">
              ${isAssigned ? '연계 활성 (출동)' : '미연계'}
            </span>
          </div>
          <p style="font-size: 11.5px; color: #475569; margin-bottom: 8px; line-height: 1.4;">${bu.desc}</p>
          <div style="font-size: 11px; color: #64748b; background: #f8fafc; padding: 6px 8px; border-radius: 4px; display: flex; flex-direction: column; gap: 2px;">
            <div>• <strong>출동일정:</strong> ${isAssigned ? bu.schedule : '배정 대기'}</div>
            <div>• <strong>담당팀:</strong> ${bu.team}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 5번 탭: 좌측 수혜카드 목록 렌더링
  renderCardsList() {
    const container = document.getElementById('beneHistCardsListContainer');
    const countEl = document.getElementById('beneHistCardsCount');
    if (!container) return;

    if (countEl) countEl.textContent = `누적 ${this.currentCards.length}건`;

    if (this.currentCards.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 24px 8px; color: #94a3b8; font-size: 12px;">
          기록된 수혜카드가 없습니다.
        </div>
      `;
      return;
    }

    container.innerHTML = this.currentCards.map((crd, idx) => {
      const round = this.currentCards.length - idx;
      const isVisit = crd.contact_method === '방문';
      const isSelected = idx === this.selectedCardIndex;

      return `
        <div class="bene-card-list-item ${isSelected ? 'active' : ''}" data-card-idx="${idx}" style="cursor: pointer; padding: 9px 11px; border: 1px solid ${isSelected ? '#0f172a' : '#e2e8f0'}; border-radius: 6px; background: ${isSelected ? '#f1f5f9' : '#ffffff'}; transition: all 0.15s ease;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="font-size: 12px; color: #0f172a;">${round}차 안부확인</strong>
            <span style="font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 3px; ${isVisit ? 'color:#15803d; background:#dcfce7;' : 'color:#1d4ed8; background:#dbeafe;'}">
              ${isVisit ? '방문' : '통화'}
            </span>
          </div>
          <div style="font-family: monospace; font-size: 11px; color: #64748b;">${(crd.check_date || '').slice(0, 16)}</div>
        </div>
      `;
    }).join('');

    // 좌측 카드 항목 클릭 시 우측 상세 열람
    container.querySelectorAll('.bene-card-list-item[data-card-idx]').forEach(item => {
      item.onclick = () => {
        const idx = parseInt(item.getAttribute('data-card-idx'), 10);
        this.selectedCardIndex = idx;
        this.renderCardsList();
        this.renderCardDetail(idx);
      };
    });
  }

  // 5번 탭: 우측 과거 수혜카드 상세 열람
  renderCardDetail(idx) {
    const area = document.getElementById('beneCardDetailArea');
    if (!area) return;

    const crd = this.currentCards[idx];
    if (!crd) {
      this.renderCallCardForm();
      return;
    }

    const round = this.currentCards.length - idx;
    const isVisit = crd.contact_method === '방문';
    const healthColor = crd.health_check === '양호' ? '#15803d' : crd.health_check === '보통' ? '#d97706' : '#dc2626';
    const psychoColor = crd.psycho_check === '안정' ? '#15803d' : crd.psycho_check === '보통' ? '#d97706' : '#dc2626';

    area.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 14px;">
        <div>
          <strong style="font-size: 14px; color: #0f172a;">${round}차 수혜자 관리카드 상세 열람</strong>
          <span style="font-family: monospace; font-size: 11.5px; color: #64748b; margin-left: 8px;">${crd.card_uid || ''}</span>
        </div>
        <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11.5px; font-weight: 700; ${isVisit ? 'color:#15803d; background:#dcfce7;' : 'color:#1d4ed8; background:#dbeafe;'}">
          ${isVisit ? '대면 현장방문 (PWA)' : '비대면 전화상담 (유선)'}
        </span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; font-size: 12px;">
        <div><strong>확인일시:</strong> ${(crd.check_date || '').slice(0, 16)}</div>
        <div><strong>담당 살핌단:</strong> ${crd.inspector || '김조사, 박살핌'}</div>
        <div><strong>다음 예정일:</strong> ${crd.next_date || '2026-10-28'}</div>
        <div><strong>위험판정:</strong> <span class="grade-pill ${this.currentCase?.grade || 'high'}">${this.currentCase?.grade === 'critical' ? '초고위험' : '고위험'}</span></div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 12px; font-size: 12.5px;">
        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px;">
          <div style="font-weight: 800; color: #0f172a; margin-bottom: 4px;">1. 건강상태 & 투약</div>
          <div>판정: <strong style="color: ${healthColor};">[${crd.health_check || '양호'}]</strong></div>
          <div style="color: #475569; margin-top: 2px; line-height: 1.5;">${crd.health_note || '특이사항 없음 (정상 복약)'}</div>
        </div>

        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px;">
          <div style="font-weight: 800; color: #0f172a; margin-bottom: 4px;">2. 심리·정서 (우울/말벗)</div>
          <div>판정: <strong style="color: ${psychoColor};">[${crd.psycho_check || '안정'}]</strong></div>
          <div style="color: #475569; margin-top: 2px; line-height: 1.5;">${crd.psycho_note || '정서 안정 (특이사항 없음)'}</div>
        </div>

        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px;">
          <div style="font-weight: 800; color: #0f172a; margin-bottom: 4px;">3. 주거환경 및 이상징후</div>
          <div>주거: [${crd.living_check || '청결'}] | 이상징후: [${crd.anomaly_check || '없음'}]</div>
          <div style="color: #475569; margin-top: 2px; line-height: 1.5;">${crd.living_note || crd.anomaly_note || '주거 상태 양호 및 특이 이상징후 없음'}</div>
        </div>

        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px;">
          <div style="font-weight: 800; color: #0f172a; margin-bottom: 4px;">4. 기타 요청 및 조치사항</div>
          <div style="color: #475569; line-height: 1.5;">${crd.etc_note || '별도 조치사항 없음'}</div>
        </div>
      </div>
    `;
  }

  // 5번 탭: 우측 신규 비대면 상담카드 직접 작성 폼
  renderCallCardForm() {
    const area = document.getElementById('beneCardDetailArea');
    if (!area) return;

    // 좌측 선택 스타일 해제
    const container = document.getElementById('beneHistCardsListContainer');
    container?.querySelectorAll('.bene-card-list-item').forEach(el => el.classList.remove('active'));

    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    area.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px;">
        <strong style="font-size: 14px; color: #0f172a;">+ 신규 비대면 전화상담 수혜관리카드 작성</strong>
        <span style="font-size: 11px; color: #dc2626; font-weight: 700;">* 실시간 D1 원장 연동</span>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px; max-height: 480px; overflow-y: auto; padding-right: 4px;">
        <div>
          <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px;">상담 일시 <span style="color:#dc2626;">*</span></label>
          <input type="datetime-local" class="filter-ctrl" id="inpTab5CallDate" value="${localIso}" style="width: 100%; height: 32px;">
        </div>

        <div style="border: 1px solid #cbd5e1; border-radius: 5px; padding: 8px 10px; background: #f8fafc;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="font-size: 12px; color: #0f172a;">1. 건강상태 & 투약</strong>
            <div style="display: flex; gap: 8px;">
              <label style="font-size: 11.5px; cursor: pointer;"><input type="radio" name="tab5Health" value="양호" checked> 양호</label>
              <label style="font-size: 11.5px; cursor: pointer;"><input type="radio" name="tab5Health" value="보통"> 보통</label>
              <label style="font-size: 11.5px; cursor: pointer;"><input type="radio" name="tab5Health" value="악화"> 악화</label>
            </div>
          </div>
          <input type="text" class="filter-ctrl" id="inpTab5HealthNote" placeholder="식사 및 복약 상태 유선 확인 메모" style="width: 100%; height: 30px; font-size: 11.5px;">
        </div>

        <div style="border: 1px solid #cbd5e1; border-radius: 5px; padding: 8px 10px; background: #f8fafc;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="font-size: 12px; color: #0f172a;">2. 심리·정서 (우울/말벗)</strong>
            <div style="display: flex; gap: 8px;">
              <label style="font-size: 11.5px; cursor: pointer;"><input type="radio" name="tab5Psycho" value="안정" checked> 안정</label>
              <label style="font-size: 11.5px; cursor: pointer;"><input type="radio" name="tab5Psycho" value="불안"> 불안</label>
              <label style="font-size: 11.5px; cursor: pointer;"><input type="radio" name="tab5Psycho" value="우울"> 우울</label>
            </div>
          </div>
          <input type="text" class="filter-ctrl" id="inpTab5PsychoNote" placeholder="어르신 목소리 톤 및 말벗 상담 메모" style="width: 100%; height: 30px; font-size: 11.5px;">
        </div>

        <div style="border: 1px solid #cbd5e1; border-radius: 5px; padding: 8px 10px; background: #f8fafc;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="font-size: 12px; color: #0f172a;">3. 주거생활 환경</strong>
            <div style="display: flex; gap: 8px;">
              <label style="font-size: 11.5px; cursor: pointer;"><input type="radio" name="tab5Living" value="청결" checked> 청결</label>
              <label style="font-size: 11.5px; cursor: pointer;"><input type="radio" name="tab5Living" value="정돈필요"> 정돈필요</label>
              <label style="font-size: 11.5px; cursor: pointer;"><input type="radio" name="tab5Living" value="심각"> 심각</label>
            </div>
          </div>
          <input type="text" class="filter-ctrl" id="inpTab5LivingNote" placeholder="냉난방, 환기, 식자재 보관 등 구두 확인 내용" style="width: 100%; height: 30px; font-size: 11.5px;">
        </div>

        <div style="border: 1px solid #cbd5e1; border-radius: 5px; padding: 8px 10px; background: #f8fafc;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="font-size: 12px; color: #0f172a;">4. 이상징후 여부</strong>
            <div style="display: flex; gap: 8px;">
              <label style="font-size: 11.5px; cursor: pointer;"><input type="radio" name="tab5Anomaly" value="없음" checked> 없음</label>
              <label style="font-size: 11.5px; cursor: pointer;"><input type="radio" name="tab5Anomaly" value="고립조짐"> 고립조짐</label>
              <label style="font-size: 11.5px; cursor: pointer;"><input type="radio" name="tab5Anomaly" value="응급징후"> 응급징후</label>
            </div>
          </div>
          <input type="text" class="filter-ctrl" id="inpTab5AnomalyNote" placeholder="특이 이상징후 감지 내용" style="width: 100%; height: 30px; font-size: 11.5px;">
        </div>

        <div style="border: 1px solid #cbd5e1; border-radius: 5px; padding: 8px 10px; background: #f8fafc;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="font-size: 12px; color: #0f172a;">5. 기타 요청 및 조치사항</strong>
            <div style="display: flex; gap: 8px;">
              <label style="font-size: 11.5px; cursor: pointer;"><input type="radio" name="tab5Etc" value="없음" checked> 없음</label>
              <label style="font-size: 11.5px; cursor: pointer;"><input type="radio" name="tab5Etc" value="있음"> 있음</label>
            </div>
          </div>
          <input type="text" class="filter-ctrl" id="inpTab5EtcNote" placeholder="밑반찬, 방문간호, 말벗 추가 연계 요청 내용" style="width: 100%; height: 30px; font-size: 11.5px;">
        </div>

        <button type="button" class="btn-action primary" id="btnSaveTab5CallCard" style="background: #0f172a; font-weight: 800; padding: 10px; width: 100%; margin-top: 4px;">
          비대면 상담카드 저장
        </button>
      </div>
    `;

    // 저장 버튼 이벤트 바인딩
    const btnSaveCall = document.getElementById('btnSaveTab5CallCard');
    if (btnSaveCall) {
      btnSaveCall.onclick = () => this.handleSaveCallCard();
    }
  }

  async handleSaveCallCard() {
    if (!this.currentCase) return;

    if (!RbacService.canWriteTarget(this.currentCase)) {
      notifier.toast('타 사업단 전담 대상자는 상담카드를 저장할 수 없습니다. (읽기 전용)', 'warning');
      return;
    }

    const checkDate = document.getElementById('inpTab5CallDate')?.value;
    const healthCheck = document.querySelector('input[name="tab5Health"]:checked')?.value || '양호';
    const healthNote = document.getElementById('inpTab5HealthNote')?.value.trim();
    const psychoCheck = document.querySelector('input[name="tab5Psycho"]:checked')?.value || '안정';
    const psychoNote = document.getElementById('inpTab5PsychoNote')?.value.trim();
    const livingCheck = document.querySelector('input[name="tab5Living"]:checked')?.value || '청결';
    const livingNote = document.getElementById('inpTab5LivingNote')?.value.trim();
    const anomalyCheck = document.querySelector('input[name="tab5Anomaly"]:checked')?.value || '없음';
    const anomalyNote = document.getElementById('inpTab5AnomalyNote')?.value.trim();
    const etcCheck = document.querySelector('input[name="tab5Etc"]:checked')?.value || '없음';
    const etcNote = document.getElementById('inpTab5EtcNote')?.value.trim();

    const formattedDate = checkDate ? checkDate.replace('T', ' ') : new Date().toISOString().slice(0, 16).replace('T', ' ');
    const nextRound = (this.currentCards?.length || 0) + 1;
    const cardUid = UidEngine.generateCounselCardUid(this.currentCase.uid, nextRound);

    const newCard = {
      card_uid: cardUid,
      case_uid: this.currentCase.uid,
      org_uid: 'O-28-237-01',
      participant_uid: 'U-28-237-01-GD-001',
      check_date: formattedDate,
      contact_method: '통화',
      health_check: healthCheck,
      health_note: healthNote,
      psycho_check: psychoCheck,
      psycho_note: psychoNote,
      living_check: livingCheck,
      living_note: livingNote,
      anomaly_check: anomalyCheck,
      anomaly_note: anomalyNote,
      etc_check: etcCheck,
      etc_note: etcNote,
      next_date: this.currentCase.nextScheduleDate || '2026-10-28',
      inspector: '센터 전담 관리자'
    };

    // D1 API POST
    try {
      await fetch('/api/v1/monitoring-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-bu': RbacService.getAssignedBu()
        },
        body: JSON.stringify({
          cardUid,
          caseUid: this.currentCase.uid,
          orgCode: 'O-28-237-01',
          participantUid: 'U-28-237-01-GD-001',
          contactMethod: '통화',
          healthCheck,
          healthNote,
          psychoCheck,
          psychoNote,
          livingCheck,
          livingNote,
          anomalyCheck,
          anomalyNote,
          etcCheck,
          etcNote
        })
      });
    } catch (e) {
      console.warn('[BeneficiaryManageModal] Call card save error:', e);
    }

    // 목록에 추가 및 화면 갱신
    this.currentCards.unshift(newCard);
    this.allCards.unshift(newCard);
    this.selectedCardIndex = 0;
    this.renderCardsList();
    this.renderCardDetail(0);
    this.renderPastSchedules();

    notifier.toast(`[${this.currentCase.name}] 대상자의 비대면 상담카드가 등록되었습니다.`, 'success');

    if (this.onSaved) {
      this.onSaved(this.currentCase, newCard);
    }
  }

  populateNextSchedule() {
    const c = this.currentCase;
    const latestCard = this.currentCards[0] || {};

    const nextMethod = c.nextScheduleMethod || (latestCard.contact_method === '방문' ? '방문' : '통화');
    const methodRadio = document.querySelector(`input[name="nextScheduleMethod"][value="${nextMethod}"]`);
    if (methodRadio) methodRadio.checked = true;

    const inpNextDate = document.getElementById('inpNextScheduleDate');
    if (inpNextDate) {
      if (c.nextScheduleDate || latestCard.next_date) {
        inpNextDate.value = c.nextScheduleDate || latestCard.next_date;
      } else {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        inpNextDate.value = d.toISOString().slice(0, 10);
      }
    }

    const selTime = document.getElementById('selNextScheduleTime');
    if (selTime && c.nextScheduleTime) {
      selTime.value = c.nextScheduleTime;
    }

    // 연계 사업단 셀렉트 기본값 세팅
    const selBu = document.getElementById('selNextScheduleBu');
    if (selBu) {
      if (c.nextScheduleBu) {
        selBu.value = c.nextScheduleBu;
      } else if (c.buList && c.buList.length > 0) {
        selBu.value = c.buList[0];
      } else {
        selBu.value = 'NONE';
      }
    }

    const selInspector = document.getElementById('selNextScheduleInspector');
    if (selInspector && (c.inspectors || c.nextScheduleInspector)) {
      const insText = c.nextScheduleInspector || (c.inspectors || []).join(', ');
      for (const opt of selInspector.options) {
        if (opt.value.includes(insText) || insText.includes(opt.value.slice(0, 2))) {
          selInspector.value = opt.value;
          break;
        }
      }
    }

    const inpMemo = document.getElementById('inpNextScheduleMemo');
    if (inpMemo) inpMemo.value = c.nextScheduleMemo || '';
  }

  async handleSave() {
    if (!this.currentCase) return;

    if (!RbacService.canWriteTarget(this.currentCase)) {
      notifier.toast('타 사업단 전담 대상자는 일정/관리카드를 저장할 수 없습니다. (읽기 전용)', 'warning');
      return;
    }

    const nextDate = document.getElementById('inpNextScheduleDate')?.value;
    const nextMethod = document.querySelector('input[name="nextScheduleMethod"]:checked')?.value || '방문';
    const nextTime = document.getElementById('selNextScheduleTime')?.value || '오전 10:00';
    const nextBu = document.getElementById('selNextScheduleBu')?.value || 'NONE';
    const inspector = document.getElementById('selNextScheduleInspector')?.value || '1조 (김조사, 박살핌)';
    const nextMemo = document.getElementById('inpNextScheduleMemo')?.value.trim();

    const healthCheck = document.querySelector('input[name="beneModalHealth"]:checked')?.value || '양호';
    const healthNote = document.getElementById('inpBeneModalHealthNote')?.value.trim();

    const psychoCheck = document.querySelector('input[name="beneModalPsycho"]:checked')?.value || '안정';
    const psychoNote = document.getElementById('inpBeneModalPsychoNote')?.value.trim();

    const etcNote = document.getElementById('inpBeneModalEtcNote')?.value.trim();

    if (!nextDate) {
      notifier.toast('다음 예정 일자를 선택해 주십시오.', 'error');
      return;
    }

    const nextRound = (this.currentCards?.length || 0) + 1;
    const cardUid = UidEngine.generateCounselCardUid(this.currentCase.uid, nextRound);

    const payload = {
      cardUid,
      caseUid: this.currentCase.uid,
      targetName: this.currentCase.name,
      targetAge: this.currentCase.age || 74,
      targetGender: this.currentCase.gender || '남',
      orgCode: 'O-28-237-01',
      participantUid: 'U-28-237-01-GD-001',
      contactMethod: nextMethod,
      healthCheck,
      healthNote,
      psychoCheck,
      psychoNote,
      livingCheck: '청결',
      livingNote: etcNote,
      anomalyCheck: healthCheck === '악화' || psychoCheck === '불안/우울' ? '주의' : '없음',
      anomalyNote: etcNote,
      etcCheck: '조치',
      etcNote,
      nextDate,
      nextTime,
      buCode: nextBu,
      inspector,
      nextMemo
    };

    try {
      await fetch('/api/v1/monitoring-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-bu': RbacService.getAssignedBu()
        },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('[BeneficiaryManageModal] Save D1 error:', e);
    }

    this.currentCase.nextScheduleDate = nextDate;
    this.currentCase.nextScheduleMethod = nextMethod;
    this.currentCase.nextScheduleTime = nextTime;
    this.currentCase.nextScheduleBu = nextBu;
    this.currentCase.nextScheduleInspector = inspector;
    this.currentCase.nextScheduleMemo = nextMemo;

    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const newOrUpdatedCard = {
      card_uid: `CRD-${Date.now()}`,
      case_uid: this.currentCase.uid,
      org_uid: 'O-28-237-01',
      participant_uid: 'U-28-237-01-GD-001',
      check_date: nowStr,
      contact_method: nextMethod,
      health_check: healthCheck,
      health_note: healthNote,
      psycho_check: psychoCheck,
      psycho_note: psychoNote,
      living_check: '청결',
      living_note: etcNote,
      anomaly_check: healthCheck === '악화' || psychoCheck === '불안/우울' ? '주의' : '없음',
      anomaly_note: etcNote,
      etc_check: '조치',
      etc_note: etcNote,
      next_date: nextDate,
      inspector
    };

    notifier.toast(`[${this.currentCase.name}] 대상자의 관리 내용 및 다음 일정(${nextDate})이 저장되었습니다.`, 'success');

    if (this.onSaved) {
      this.onSaved(this.currentCase, newOrUpdatedCard);
    }

    this.close();
  }
}
