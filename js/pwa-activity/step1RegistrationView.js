/**
 * @file step1RegistrationView.js
 * @description 1단계 기관 및 활동 세션 설정 뷰 (표준 pwa.css 카드 & 업무 시작) (ESM)
 */

import { ActivityService } from './activityService.js';
import { notifier } from '../utils/notifier.js';

export class Step1RegistrationView {
  constructor(app) {
    this.app = app;
    this.participants = ['김철수', '이영희'];
    this.businessUnits = [];
  }

  async render(container) {
    if (!container) return;

    const session = this.app.session;
    this.participants = [...(session.participants && session.participants.length ? session.participants : ['김철수', '이영희'])];

    try {
      this.businessUnits = await ActivityService.getBusinessUnits(session.orgUid || 'O-28-237-01');
    } catch (e) {
      console.warn('사업단 목록 로딩 에러:', e);
    }

    const todayStr = session.dutyDate || new Date().toISOString().slice(0, 10);
    session.dutyDate = todayStr;

    container.innerHTML = `
      <div class="card-box" style="margin-top: 4px;">
        <div class="card-title">
          <span>기관·사업단 설정</span>
          <span class="uid-badge" id="step1OrgBadge">${session.orgUid || 'O-28-237-01'}</span>
        </div>

        <div class="form-group">
          <label class="form-label">기관명</label>
          <input type="text" id="agencyInput" class="form-input" value="${session.orgName || '인천 부평구 통합돌봄센터'}" readonly style="background: #f8fafc; color: #475569;">
        </div>

        <div class="form-group" style="position: relative;">
          <label class="form-label">담당 사업단</label>
          <!-- 커스텀 드롭다운 버튼 (휴대폰 네이티브 휠 피커 원천 차단) -->
          <div id="btnCustomBuSelect" class="form-input" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; font-weight: 700; background: #ffffff; user-select: none;">
            <span id="txtSelectedBuName">${(this.businessUnits.find(b => b.bu_code === session.buCode) || {}).name || session.buName || '영양도시락/밑반찬 배달 사업단'}</span>
            <span id="icoBuDropdown" style="font-size: 11px; color: #64748b;">▼</span>
          </div>

          <!-- 커스텀 드롭다운 메뉴 레이어 -->
          <div id="layerCustomBuOptions" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); z-index: 100; overflow: hidden;">
            ${this.businessUnits.map(bu => `
              <div class="custom-bu-opt" data-bu-code="${bu.bu_code}" data-bu-name="${bu.name}" style="padding: 12px 14px; font-size: 13px; font-weight: 600; cursor: pointer; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; ${session.buCode === bu.bu_code ? 'background: #f8fafc; color: #0f172a; font-weight: 800;' : 'color: #334155;'}">
                <span>${bu.name}</span>
                ${session.buCode === bu.bu_code ? '<span style="color: #2563eb; font-weight: 800;">✓</span>' : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">활동 일자</label>
          <input type="date" id="dutyDateInput" class="form-input" value="${todayStr}">
        </div>

        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label class="form-label" style="margin-bottom: 0;">현장 참여자 (조사원 2인 1조)</label>
            <button type="button" id="btnAddParticipant" class="btn-secondary" style="width: auto; padding: 0 10px; height: 30px; font-size: 11.5px; font-weight: 600;">+ 추가</button>
          </div>
          <div id="participantsContainer" style="display: flex; flex-direction: column; gap: 6px;"></div>
        </div>

        <!-- 하단 5:5 2대 표준 액션 버튼 -->
        <div class="btn-action-row" style="margin-top: 20px;">
          <button type="button" class="btn-secondary" id="btnSaveAgency">설정 저장</button>
          <button type="button" class="btn-primary" id="btnStartWork">업무 시작</button>
        </div>
      </div>
    `;

    this.renderParticipants(container);
    this.bindEvents(container);
  }

  renderParticipants(container) {
    const listWrap = container.querySelector('#participantsContainer');
    if (!listWrap) return;

    listWrap.innerHTML = this.participants.map((name, idx) => `
      <div style="display: flex; gap: 6px; align-items: center;">
        <span style="font-size: 12px; font-weight: 600; color: #64748b; width: 48px;">참여자 ${idx + 1}</span>
        <input type="text" class="form-input participant-input" data-index="${idx}" value="${name || ''}" placeholder="성명 입력" style="flex: 1;">
        ${this.participants.length > 2 ? `
          <button type="button" class="btn-secondary btn-remove-part" data-index="${idx}" style="width: 36px; height: 38px; padding: 0; color: #dc2626; font-weight: 700;">-</button>
        ` : ''}
      </div>
    `).join('');
  }

  bindEvents(container) {
    const btnCustomBu = container.querySelector('#btnCustomBuSelect');
    const layerCustomBu = container.querySelector('#layerCustomBuOptions');
    const icoBuDropdown = container.querySelector('#icoBuDropdown');

    btnCustomBu?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = layerCustomBu.style.display !== 'none';
      layerCustomBu.style.display = isOpen ? 'none' : 'block';
      if (icoBuDropdown) icoBuDropdown.innerText = isOpen ? '▼' : '▲';
    });

    // 드롭다운 외부 클릭 시 닫기
    document.addEventListener('click', () => {
      if (layerCustomBu) {
        layerCustomBu.style.display = 'none';
        if (icoBuDropdown) icoBuDropdown.innerText = '▼';
      }
    });

    // 사업단 항목 선택 시
    container.querySelectorAll('.custom-bu-opt').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const code = opt.getAttribute('data-bu-code');
        const name = opt.getAttribute('data-bu-name');
        this.app.session.buCode = code;
        this.app.session.buName = name;
        this.render(container); // 선택 상태 반영 리렌더링
      });
    });

    const dutyDateInput = container.querySelector('#dutyDateInput');
    if (dutyDateInput) {
      dutyDateInput.addEventListener('change', (e) => {
        this.app.session.dutyDate = e.target.value;
      });
    }

    const btnAdd = container.querySelector('#btnAddParticipant');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        this.participants.push('');
        this.renderParticipants(container);
      });
    }

    const listWrap = container.querySelector('#participantsContainer');
    if (listWrap) {
      listWrap.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove-part')) {
          const idx = parseInt(e.target.dataset.index, 10);
          this.participants.splice(idx, 1);
          this.renderParticipants(container);
        }
      });
      listWrap.addEventListener('input', (e) => {
        if (e.target.classList.contains('participant-input')) {
          const idx = parseInt(e.target.dataset.index, 10);
          this.participants[idx] = e.target.value.trim();
        }
      });
    }

    // 설정 저장 버튼
    const btnSaveAgency = container.querySelector('#btnSaveAgency');
    if (btnSaveAgency) {
      btnSaveAgency.addEventListener('click', () => {
        const validParts = this.participants.filter(p => p && p.trim().length > 0);
        if (validParts.length < 2) {
          notifier.toast('현장 참여자는 최소 2인 1조 성명을 모두 입력해야 합니다.', 'warning', 2500);
          return;
        }
        this.app.session.participants = validParts;
        localStorage.setItem('PWA_ACTIVITY_SESSION', JSON.stringify({
          buCode: this.app.session.buCode,
          buName: this.app.session.buName,
          dutyDate: this.app.session.dutyDate,
          participants: validParts
        }));
        notifier.toast('기관 및 사업단 설정이 저장되었습니다.', 'success', 2000);
      });
    }

    // 업무 시작 버튼 (출근 신호)
    const btnStartWork = container.querySelector('#btnStartWork');
    if (btnStartWork) {
      btnStartWork.addEventListener('click', async () => {
        await this.handleStartWork(btnStartWork);
      });
    }
  }

  async handleStartWork(btn) {
    const validParts = this.participants.filter(p => p && p.trim().length > 0);
    if (validParts.length < 2) {
      notifier.toast('현장 참여자는 최소 2인 1조 성명을 모두 입력해야 합니다.', 'warning', 2500);
      return;
    }

    this.app.session.participants = validParts;

    const now = new Date();
    const startTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    this.app.session.startTime = startTimeStr;

    btn.disabled = true;
    btn.innerText = '출근 처리 중...';

    let lat = null, lng = null, acc = null;
    try {
      if (navigator.geolocation) {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        acc = Math.round(pos.coords.accuracy);
      }
    } catch (gpsErr) {
      console.warn('GPS 수집 실패:', gpsErr.message);
    }

    this.app.session.startGps = { lat, lng, acc };

    try {
      const partUid = this.app.session.participantUid || 'U-28-237-01-ME-001';
      await ActivityService.checkIn({
        orgUid: this.app.session.orgUid || 'O-28-237-01',
        participantUid: partUid,
        buCode: this.app.session.buCode || 'ME',
        dutyDate: this.app.session.dutyDate,
        startTime: startTimeStr,
        startGpsLat: lat,
        startGpsLng: lng,
        startGpsAccuracy: acc
      });
      this.app.session.isCheckedIn = true;
    } catch (apiErr) {
      console.warn('D1 check-in API 경고:', apiErr.message);
      this.app.session.isCheckedIn = true;
    }

    btn.innerText = '업무 시작 완료';
    this.app.updateHeaderStatus();
    this.app.goToStep(2);
  }
}
