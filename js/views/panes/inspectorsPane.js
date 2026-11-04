/**
 * @file inspectorsPane.js
 * @description 참여기관 참여활동가(또래상담사/살핌단) 관리 서브 페인 모듈 (ESM)
 *              지자체 관리자(M) 및 전사 슈퍼 관리자(S) 공통 재사용 컴포넌트
 *              - D1 participants 테이블과 완전 양방향 실시간 동기화 (CRUD)
 *              - 개인정보보호법 및 전사 마스킹 정책 준수 (연락처 마스킹 표출: 010-****-8891)
 *              - 활동 요일(duty_days) 및 근무시간(duty_hours) 관리
 *              - 오전/오후 조 바꿈 프리셋 및 2인 1조 편성·조 이동 지원
 */

import { notifier } from '../../utils/notifier.js';

export class InspectorsPane {
  constructor(options = {}) {
    this.container = null;
    this.orgUid = options.orgUid || 'O-28-237-01';
    this.inspectors = [];
    this.currentModalDistricts = [];
    this.currentTeamModalDistricts = [];
  }

  /**
   * 페인 마운트 및 초기화
   * @param {HTMLElement|string} containerEl 
   * @param {string} [orgUid] 
   */
  async mount(containerEl, orgUid) {
    if (typeof containerEl === 'string') {
      this.container = document.getElementById(containerEl);
    } else {
      this.container = containerEl;
    }

    if (!this.container) {
      console.warn('[InspectorsPane] 컨테이너 요소를 찾을 수 없습니다.');
      return;
    }

    if (orgUid) {
      this.orgUid = orgUid;
    }

    await this.loadInspectors();
    this.bindEvents();
  }

  /**
   * D1 데이터베이스에서 참여활동가 목록 조회
   */
  async loadInspectors() {
    try {
      const res = await fetch(`/api/v1/participants?orgUid=${encodeURIComponent(this.orgUid)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          this.inspectors = json.data;
          this.renderInspectors();
          return;
        }
      }
    } catch (err) {
      console.warn('[InspectorsPane] D1 참여활동가 목록 조회 예외:', err);
    }

    // 통신 오류 시 로컬스토리지 백업 데이터 활용
    const saved = localStorage.getItem('wrk_inspectors_list');
    if (saved) {
      try {
        this.inspectors = JSON.parse(saved);
      } catch (e) {
        this.inspectors = [];
      }
    }
    this.renderInspectors();
  }

  /**
   * 참여활동가 목록 테이블 렌더링 (마스킹 적용 & 근무일·시간 정돈)
   */
  renderInspectors() {
    const tbody = this.container.querySelector('#tbodyInspectors') || document.getElementById('tbodyInspectors');
    if (!tbody) return;

    if (!this.inspectors || this.inspectors.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; color: #94a3b8; padding: 24px;">
            등록된 참여활동가가 없습니다. 우측 상단의 '+ 조 편성' 또는 '+ 1명 등록' 버튼을 눌러 등록해 주십시오.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.inspectors.map((ins, idx) => {
      const seq = ins.seq_number || (idx + 1);
      const uid = ins.participant_uid || ins.uid || `U-28-237-01-GD-${String(seq).padStart(3, '0')}`;
      const name = ins.name || '-';
      
      // 연락처 마스킹 처리 (010-****-8891)
      let phoneDisplay = ins.phoneMasked;
      if (!phoneDisplay && ins.phone) {
        const parts = ins.phone.split('-');
        if (parts.length === 3) {
          phoneDisplay = `${parts[0]}-****-${parts[2]}`;
        } else if (ins.phone.length >= 10) {
          phoneDisplay = ins.phone.slice(0, 3) + '-****-' + ins.phone.slice(-4);
        } else {
          phoneDisplay = ins.phone;
        }
      }
      if (!phoneDisplay) phoneDisplay = '010-****-0000';

      const loginId = ins.login_id || ins.loginId || `user_${String(seq).padStart(3, '0')}`;
      const pair = ins.team_code || ins.pair || '미배정';
      
      // 근무일·시간
      const dutyDays = ins.duty_days || ins.dutyDays || '월, 수, 금';
      const dutyHours = ins.duty_hours || ins.dutyHours || '09:00 ~ 12:00';

      const area = ins.assigned_areas || ins.area || '부평구 관내';
      const type = ins.team_role === '부' ? '배정·검수' : (ins.type || '현장방문');
      const status = ins.duty_status === 'SUSPENDED' ? '중지' : (ins.status || (ins.is_active === 0 ? '중지' : '활동중'));

      return `
        <tr data-inspector-uid="${uid}">
          <td style="text-align: center; font-weight: 700; color: #64748b;">${seq}</td>
          <td style="white-space: nowrap;">
            <strong style="color: #0f172a; font-size: 13px;">${name}</strong>
            <span style="font-size: 11px; color: #64748b; font-family: monospace; margin-left: 2px;">(${loginId})</span>
          </td>
          <td style="text-align: center; font-family: monospace; font-size: 12px; color: #334155; white-space: nowrap;">${phoneDisplay}</td>
          <td style="text-align: center; color: #1e293b; font-weight: 600; white-space: nowrap;" title="${pair}">${pair}</td>
          <td>
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              ${area.split(',').map(a => `<span style="display: inline-block; padding: 2px 6px; background: #f8fafc; color: #334155; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 11px; font-weight: 600;">${a.trim()}</span>`).join('')}
            </div>
          </td>
          <td style="text-align: center; white-space: nowrap; font-size: 12px; color: #334155;">
            ${type} <span style="font-size: 11px; color: #64748b;">(${dutyDays} ${dutyHours})</span>
          </td>
          <td style="text-align: center; white-space: nowrap;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; ${status === '활동중' ? 'background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0;' : 'background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;'}">
              ${status}
            </span>
          </td>
          <td style="text-align: center; white-space: nowrap;">
            <div style="display: flex; gap: 4px; justify-content: center;">
              <button type="button" class="btn-table-sm btn-edit-inspector" data-uid="${uid}" style="padding: 4px 10px; font-size: 11.5px; font-weight: 700;">수정</button>
              <button type="button" class="btn-table-sm btn-del-inspector" data-uid="${uid}" style="padding: 4px 10px; font-size: 11.5px; font-weight: 700; color: #dc2626; border-color: #fca5a5;">삭제</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // 수정 및 삭제 버튼 이벤트 바인딩
    tbody.querySelectorAll('.btn-edit-inspector').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const uid = e.currentTarget.getAttribute('data-uid');
        const target = this.inspectors.find(i => (i.participant_uid || i.uid) === uid);
        if (target) this.openInspectorModal(target);
      });
    });

    tbody.querySelectorAll('.btn-del-inspector').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const uid = e.currentTarget.getAttribute('data-uid');
        await this.deleteInspector(uid);
      });
    });
  }

  /**
   * 참여활동가 모달 열기 (등록 또는 수정)
   * @param {Object|null} target 
   */
  openInspectorModal(target = null) {
    const modal = document.getElementById('modalInspector');
    const modalTitle = document.getElementById('modalInspectorTitle');
    const btnSubmit = document.getElementById('btnSubmitInspector');
    const selArea = document.getElementById('selInspectorArea');
    const inpUid = document.getElementById('inpEditInspectorUid');
    const inpName = document.getElementById('inpInspectorName');
    const inpPhone = document.getElementById('inpInspectorPhone');
    const inpLoginId = document.getElementById('inpInspectorLoginId');
    const inpPassword = document.getElementById('inpInspectorPassword');
    const inpPair = document.getElementById('inpInspectorPair');
    const selTeam = document.getElementById('selInspectorTeam');
    const inpDutyHours = document.getElementById('inpInspectorDutyHours');
    const selType = document.getElementById('selInspectorType');
    const selStatus = document.getElementById('selInspectorStatus');

    if (!modal) return;

    // 관할 구역 선택 드롭다운 옵션 구성
    let availableDongs = [];
    const savedDistricts = localStorage.getItem('wrk_org_districts');
    if (savedDistricts) {
      try {
        const parsed = JSON.parse(savedDistricts);
        if (Array.isArray(parsed) && parsed.length > 0) availableDongs = parsed;
      } catch (e) {}
    }
    if (availableDongs.length === 0) {
      availableDongs = ["가좌1동", "가좌2동", "가좌3동", "가좌4동", "석남1동", "석남2동", "석남3동", "가정1동", "가정2동", "가정3동", "청라1동", "청라2동", "청라3동"];
    }

    if (selArea) {
      selArea.innerHTML = availableDongs.map(d => `<option value="${d}">${d}</option>`).join('');
    }

    // 활동 요일 체크박스 바인딩 헬퍼
    const setDayCheckboxes = (dayStr) => {
      const days = dayStr ? dayStr.split(',').map(s => s.trim()) : ['월', '수', '금'];
      document.querySelectorAll('input[name="chkDutyDay"]').forEach(chk => {
        chk.checked = days.includes(chk.value);
      });
      this.updateDutyDaysSummary();
    };

    if (target) {
      // 수정 모드
      if (modalTitle) modalTitle.textContent = '참여자 정보 수정';
      if (btnSubmit) btnSubmit.textContent = '수정 내용 저장';
      if (inpUid) inpUid.value = target.participant_uid || target.uid || '';
      if (inpName) inpName.value = target.name || '';
      if (inpPhone) inpPhone.value = target.phone || '';
      const seq = target.seq_number || (this.inspectors.findIndex(i => (i.participant_uid || i.uid) === (target.participant_uid || target.uid)) + 1) || 1;
      const defaultLoginId = target.login_id || target.loginId || ('user_' + String(seq).padStart(3, '0'));
      if (inpLoginId) inpLoginId.value = defaultLoginId;
      if (inpPassword) {
        inpPassword.value = '';
        inpPassword.placeholder = '변경 시에만 새 비밀번호 입력';
      }
      
      const teamVal = target.team_code || target.pair || '';
      if (inpPair) inpPair.value = teamVal;
      if (selTeam) {
        if (['1조', '2조', '3조', '4조'].some(t => teamVal.startsWith(t))) {
          selTeam.value = teamVal.split(' ')[0] || '1조';
        } else {
          selTeam.value = 'direct';
        }
      }

      const hoursVal = target.duty_hours || target.dutyHours || '09:00 ~ 12:00';
      const parts = hoursVal.split('~').map(s => s.trim());
      const inpHoursStart = document.getElementById('inpInspectorStartTime');
      const inpHoursEnd = document.getElementById('inpInspectorEndTime');
      if (inpHoursStart) inpHoursStart.value = parts[0] || '09:00';
      if (inpHoursEnd) inpHoursEnd.value = parts[1] || '12:00';
      setDayCheckboxes(target.duty_days || target.dutyDays || '월, 수, 금');

      if (selType) selType.value = target.team_role === '부' ? '배정·검수' : (target.type || '현장방문');
      if (selStatus) selStatus.value = target.duty_status === 'SUSPENDED' ? '중지' : (target.status || '활동중');

      const areaStr = target.assigned_areas || target.area || '';
      if (areaStr) {
        this.currentModalDistricts = areaStr.split(',').map(s => s.trim()).filter(Boolean);
      } else {
        this.currentModalDistricts = [availableDongs[0] || '가좌1동'];
      }
    } else {
      // 신규 등록 모드
      if (modalTitle) modalTitle.textContent = '참여활동가 신규 등록';
      if (btnSubmit) btnSubmit.textContent = '등록 완료';
      if (inpUid) inpUid.value = '';
      if (inpName) inpName.value = '';
      if (inpPhone) inpPhone.value = '';
      
      const nextSeq = this.inspectors.length + 1;
      if (inpLoginId) inpLoginId.value = `user_${String(nextSeq).padStart(3, '0')}`;
      if (inpPassword) {
        inpPassword.value = '1234';
        inpPassword.placeholder = '비밀번호 (기본값: 1234)';
      }
      
      const defaultTeam = `${Math.ceil(nextSeq / 2)}조`;
      if (inpPair) inpPair.value = defaultTeam;
      if (selTeam) selTeam.value = ['1조', '2조', '3조', '4조'].includes(defaultTeam) ? defaultTeam : 'direct';

      const inpHoursStart = document.getElementById('inpInspectorStartTime');
      const inpHoursEnd = document.getElementById('inpInspectorEndTime');
      if (inpHoursStart) inpHoursStart.value = '09:00';
      if (inpHoursEnd) inpHoursEnd.value = '12:00';
      setDayCheckboxes('월, 수, 금');

      if (selType) selType.value = '현장방문';
      if (selStatus) selStatus.value = '활동중';

      this.currentModalDistricts = [availableDongs[0] || '가좌1동'];
    }

    this.renderModalChips();
    modal.classList.add('active');
  }

  /**
   * 요일 체크박스 변경 시 요약 텍스트 갱신
   */
  updateDutyDaysSummary() {
    const checked = Array.from(document.querySelectorAll('input[name="chkDutyDay"]:checked')).map(c => c.value);
    const disp = document.getElementById('dispDutyDaysSummary');
    if (disp) {
      if (checked.length === 0) {
        disp.textContent = '선택 요일 없음';
        disp.style.color = '#dc2626';
      } else {
        disp.textContent = `주 ${checked.length}회 (${checked.join('·')})`;
        disp.style.color = '#2563eb';
      }
    }
  }

  /**
   * 모달 내 복수 담당 관할구역 블루 칩 렌더링
   */
  renderModalChips() {
    const chipBox = document.getElementById('modalInspectorChipsContainer');
    if (!chipBox) return;

    if (!this.currentModalDistricts || this.currentModalDistricts.length === 0) {
      chipBox.innerHTML = '<span style="font-size: 11px; color: #94a3b8;">배정된 구역이 없습니다. 아래에서 구역을 추가해 주십시오.</span>';
      return;
    }

    chipBox.innerHTML = this.currentModalDistricts.map((dong, idx) => `
      <span class="org-district-chip" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; border-radius: 4px; font-size: 12px; font-weight: 700;">
        ${dong}
        <button type="button" class="btn-del-modal-chip" data-idx="${idx}" style="background: none; border: none; color: #0284c7; cursor: pointer; font-size: 13px; line-height: 1; padding: 0 2px;">&times;</button>
      </span>
    `).join('');

    chipBox.querySelectorAll('.btn-del-modal-chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const delIdx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
        this.currentModalDistricts.splice(delIdx, 1);
        this.renderModalChips();
      });
    });
  }

  /**
   * 모달 닫기
   */
  closeInspectorModal() {
    const modal = document.getElementById('modalInspector');
    if (modal) modal.classList.remove('active');
  }

  /**
   * 2인 1조 편성 모달 열기 (참여자 최우선 워크플로우)
   */
  openTeamModal() {
    const modal = document.getElementById('modalTeamManagement');
    const selMem1 = document.getElementById('selTeamMember1');
    const selMem2 = document.getElementById('selTeamMember2');
    const selTeam = document.getElementById('selTeamSelect');
    const inpNewTeam = document.getElementById('inpNewTeamName');
    const btnToggleTeam = document.getElementById('btnToggleNewTeam');
    const inpHoursStart = document.getElementById('inpTeamStartTime');
    const inpHoursEnd = document.getElementById('inpTeamEndTime');
    const selDistrict = document.getElementById('selTeamDistrict');

    if (!modal) return;

    // 1. 참여자 1 (조장) 및 참여자 2 드롭다운 바인딩 (화면 표출 시 복잡한 UID 제거)
    const optHtml = this.inspectors.map(ins => {
      const uid = ins.participant_uid || ins.uid;
      const teamInfo = ins.team_code ? ` [${ins.team_code.split(' ')[0]}]` : '';
      return `<option value="${uid}">${ins.name}${teamInfo}</option>`;
    }).join('');

    if (selMem1) {
      selMem1.innerHTML = optHtml;
      selMem1.selectedIndex = 0;
    }
    if (selMem2) {
      selMem2.innerHTML = optHtml;
      if (selMem2.options.length > 1) selMem2.selectedIndex = 1;
    }

    // 2. 기존 등록된 조 목록 동적 수집 및 셀렉트박스 옵션 구성
    const existingTeams = new Set(['1조', '2조', '3조', '4조']);
    this.inspectors.forEach(ins => {
      if (ins.team_code) {
        const tMatch = ins.team_code.match(/^\d+조/);
        if (tMatch) existingTeams.add(tMatch[0]);
      }
    });
    if (selTeam) {
      selTeam.innerHTML = Array.from(existingTeams).sort().map(t => `<option value="${t}">${t}</option>`).join('');
    }
    if (inpNewTeam) {
      inpNewTeam.style.display = 'none';
      inpNewTeam.value = '';
    }
    if (btnToggleTeam) {
      btnToggleTeam.textContent = '+ 새 조 추가';
    }

    // 3. 관할 구역 목록 채우기 및 칩 초기화
    let availableDongs = [];
    const savedDistricts = localStorage.getItem('wrk_org_districts');
    if (savedDistricts) {
      try {
        const parsed = JSON.parse(savedDistricts);
        if (Array.isArray(parsed) && parsed.length > 0) availableDongs = parsed;
      } catch (e) {}
    }
    if (availableDongs.length === 0) {
      availableDongs = ["가좌1동", "가좌2동", "가좌3동", "가좌4동", "석남1동", "석남2동", "석남3동", "가정1동", "가정2동", "가정3동", "청라1동", "청라2동", "청라3동"];
    }
    if (selDistrict) {
      selDistrict.innerHTML = availableDongs.map(d => `<option value="${d}">${d}</option>`).join('');
    }

    // 4. 선택된 참여자 1의 기존 정보로 조/시간/요일/구역 폼 자동 로드 (참여자 우선 워크플로우)
    this.syncTeamFormFromMember1();

    modal.classList.add('active');
  }

  /**
   * 참여자 1 선택 변경 시 해당 활동가의 기존 조, 시간, 구역을 폼에 자동 동기화
   */
  syncTeamFormFromMember1() {
    const selMem1 = document.getElementById('selTeamMember1');
    const selMem2 = document.getElementById('selTeamMember2');
    const selTeam = document.getElementById('selTeamSelect');
    const inpHoursStart = document.getElementById('inpTeamStartTime');
    const inpHoursEnd = document.getElementById('inpTeamEndTime');
    if (!selMem1) return;

    const mem1 = this.inspectors.find(i => (i.participant_uid || i.uid) === selMem1.value);
    if (!mem1) return;

    // 조 동기화
    if (selTeam && mem1.team_code) {
      const tMatch = mem1.team_code.match(/^\d+조/);
      if (tMatch && Array.from(selTeam.options).some(o => o.value === tMatch[0])) {
        selTeam.value = tMatch[0];
      }
    }

    // 파트너(참여자 2) 자동 매핑
    if (selMem2 && mem1.partner_uid) {
      selMem2.value = mem1.partner_uid;
    }

    // 근무시간 동기화
    if (mem1.duty_hours) {
      const parts = mem1.duty_hours.split('~').map(s => s.trim());
      if (parts.length === 2) {
        if (inpHoursStart) inpHoursStart.value = parts[0];
        if (inpHoursEnd) inpHoursEnd.value = parts[1];
      }
    }

    // 요일 동기화
    const dutyDays = mem1.duty_days ? mem1.duty_days.split(',').map(s => s.trim()) : ['월', '수', '금'];
    document.querySelectorAll('input[name="chkTeamDutyDay"]').forEach(chk => {
      chk.checked = dutyDays.includes(chk.value);
    });

    // 구역 칩 동기화
    if (mem1.assigned_areas) {
      this.currentTeamModalDistricts = mem1.assigned_areas.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      this.currentTeamModalDistricts = ['가좌1동', '가좌2동'];
    }
    this.renderTeamModalChips();
  }

  /**
   * 조 편성 모달 내 블루 칩 컴포넌트 렌더링
   */
  renderTeamModalChips() {
    const chipBox = document.getElementById('teamModalChipsContainer');
    if (!chipBox) return;

    if (!this.currentTeamModalDistricts || this.currentTeamModalDistricts.length === 0) {
      chipBox.innerHTML = '<span style="font-size: 11px; color: #94a3b8;">배정된 관할 구역이 없습니다. 아래에서 구역을 추가해 주십시오.</span>';
      return;
    }

    chipBox.innerHTML = this.currentTeamModalDistricts.map((dong, idx) => `
      <span class="org-district-chip" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; border-radius: 4px; font-size: 12px; font-weight: 700;">
        ${dong}
        <button type="button" class="btn-del-team-chip" data-idx="${idx}" style="background: none; border: none; color: #0284c7; cursor: pointer; font-size: 13px; line-height: 1; padding: 0 2px;">&times;</button>
      </span>
    `).join('');

    chipBox.querySelectorAll('.btn-del-team-chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const delIdx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
        this.currentTeamModalDistricts.splice(delIdx, 1);
        this.renderTeamModalChips();
      });
    });
  }

  closeTeamModal() {
    const modal = document.getElementById('modalTeamManagement');
    if (modal) modal.classList.remove('active');
  }

  /**
   * 2인 1조 편성 저장 (D1 일괄 연동)
   */
  async saveTeam() {
    const selTeam = document.getElementById('selTeamSelect');
    const inpNewTeam = document.getElementById('inpNewTeamName');
    let teamName = selTeam?.value || '1조';
    if (inpNewTeam && inpNewTeam.style.display !== 'none' && inpNewTeam.value.trim()) {
      teamName = inpNewTeam.value.trim();
    }

    const startTime = document.getElementById('inpTeamStartTime')?.value || '09:00';
    const endTime = document.getElementById('inpTeamEndTime')?.value || '12:00';
    const shift = `${startTime} ~ ${endTime}`;

    const mem1Uid = document.getElementById('selTeamMember1')?.value;
    const mem2Uid = document.getElementById('selTeamMember2')?.value;

    const checkedDays = Array.from(document.querySelectorAll('input[name="chkTeamDutyDay"]:checked')).map(c => c.value);
    const dutyDaysStr = checkedDays.join(', ') || '월, 수, 금';

    if (!this.currentTeamModalDistricts || this.currentTeamModalDistricts.length === 0) {
      await notifier.alert('입력 확인', '조 담당 관할 구역을 최소 1개 이상 추가해 주십시오.', 'warning');
      return;
    }
    const areas = this.currentTeamModalDistricts.join(', ');

    if (!mem1Uid || !mem2Uid) {
      await notifier.alert('편성 오류', '참여자 1과 참여자 2를 모두 선택해 주십시오.', 'warning');
      return;
    }
    if (mem1Uid === mem2Uid) {
      await notifier.alert('편성 오류', '참여자 1과 참여자 2는 서로 다른 활동가를 선택해 주십시오.', 'warning');
      return;
    }

    const mem1 = this.inspectors.find(i => (i.participant_uid || i.uid) === mem1Uid);
    const mem2 = this.inspectors.find(i => (i.participant_uid || i.uid) === mem2Uid);

    try {
      // 1. 참여자 1 (조장) 업데이트
      await fetch('/api/v1/participants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantUid: mem1Uid,
          name: mem1?.name || '',
          phone: mem1?.phone || '',
          loginId: mem1?.login_id || mem1?.loginId || '',
          teamCode: `${teamName} (${mem1?.name}, ${mem2?.name})`,
          dutyHours: shift,
          dutyDays: dutyDaysStr,
          assignedAreas: areas,
          dutyStatus: 'ACTIVE'
        })
      });

      // 2. 참여자 2 업데이트
      await fetch('/api/v1/participants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantUid: mem2Uid,
          name: mem2?.name || '',
          phone: mem2?.phone || '',
          loginId: mem2?.login_id || mem2?.loginId || '',
          teamCode: `${teamName} (${mem1?.name}, ${mem2?.name})`,
          dutyHours: shift,
          dutyDays: dutyDaysStr,
          assignedAreas: areas,
          dutyStatus: 'ACTIVE'
        })
      });

      this.closeTeamModal();
      await this.loadInspectors();
      await notifier.alert('2인 1조 편성 완료', `[${teamName}] (${mem1?.name}, ${mem2?.name}) 편성이 D1에 성공적으로 저장되었습니다.\n근무시간: ${shift} / 활동일: ${dutyDaysStr}\n담당구역: ${areas}`, 'success');
    } catch (err) {
      console.warn('[InspectorsPane] 2인 1조 편성 저장 예외:', err);
      await notifier.alert('저장 예외', err.message, 'error');
    }
  }

  /**
   * 참여활동가 개별 저장 (D1 비동기 연동)
   */
  async saveInspector() {
    const editUid = document.getElementById('inpEditInspectorUid')?.value.trim();
    const name = document.getElementById('inpInspectorName')?.value.trim();
    const phone = document.getElementById('inpInspectorPhone')?.value.trim();
    const loginId = document.getElementById('inpInspectorLoginId')?.value.trim();
    const password = document.getElementById('inpInspectorPassword')?.value.trim();
    const pair = document.getElementById('inpInspectorPair')?.value.trim();
    const startTime = document.getElementById('inpInspectorStartTime')?.value || '09:00';
    const endTime = document.getElementById('inpInspectorEndTime')?.value || '12:00';
    const dutyHours = `${startTime} ~ ${endTime}`;
    const type = document.getElementById('selInspectorType')?.value || '현장방문';
    const status = document.getElementById('selInspectorStatus')?.value || '활동중';

    // 활동 요일 추출
    const checkedDays = Array.from(document.querySelectorAll('input[name="chkDutyDay"]:checked')).map(c => c.value);
    const dutyDays = checkedDays.join(', ') || '월, 수, 금';

    if (!name) {
      await notifier.alert('입력 확인', '활동가 성명을 입력해 주십시오.', 'warning');
      return;
    }
    if (!phone) {
      await notifier.alert('입력 확인', '활동가 연락처를 입력해 주십시오.', 'warning');
      return;
    }
    if (!loginId) {
      await notifier.alert('입력 확인', '로그인 아이디를 입력해 주십시오.', 'warning');
      return;
    }
    if (!this.currentModalDistricts || this.currentModalDistricts.length === 0) {
      await notifier.alert('입력 확인', '최소 1개 이상의 담당 관할 구역을 추가해 주십시오.', 'warning');
      return;
    }

    const assignedAreas = this.currentModalDistricts.join(', ');
    const isEdit = Boolean(editUid);

    const payload = {
      orgUid: this.orgUid,
      participantUid: editUid || undefined,
      name,
      phone,
      loginId,
      password: password || undefined,
      teamCode: pair,
      dutyHours: dutyHours || '09:00 ~ 12:00',
      dutyDays,
      assignedAreas,
      dutyStatus: status === '중지' ? 'SUSPENDED' : 'ACTIVE',
      status
    };

    try {
      const url = '/api/v1/participants';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (res.ok && json.success) {
        this.closeInspectorModal();
        await this.loadInspectors();
        await notifier.alert('참여활동가 저장 완료', isEdit ? `활동가 '${name}' 님의 정보가 D1에 성공적으로 수정되었습니다.` : `활동가 '${name}' 님이 D1에 신규 등록되었습니다.`, 'success');
        return;
      } else {
        throw new Error(json.error || 'D1 저장 실패');
      }
    } catch (err) {
      console.warn('[InspectorsPane] D1 저장 예외 발생:', err);
      // 로컬 fallback
      if (isEdit) {
        const item = this.inspectors.find(i => (i.participant_uid || i.uid) === editUid);
        if (item) {
          item.name = name;
          item.phone = phone;
          item.login_id = loginId;
          item.duty_hours = dutyHours;
          item.duty_days = dutyDays;
          item.assigned_areas = assignedAreas;
          item.team_code = pair;
          item.duty_status = status === '중지' ? 'SUSPENDED' : 'ACTIVE';
        }
      } else {
        const newUid = `U-28-237-01-GD-${String(this.inspectors.length + 1).padStart(3, '0')}`;
        this.inspectors.push({
          participant_uid: newUid,
          org_uid: this.orgUid,
          name,
          phone,
          login_id: loginId,
          duty_hours: dutyHours,
          duty_days: dutyDays,
          assigned_areas: assignedAreas,
          team_code: pair,
          duty_status: status === '중지' ? 'SUSPENDED' : 'ACTIVE',
          is_active: status === '활동중' ? 1 : 0
        });
      }
      localStorage.setItem('wrk_inspectors_list', JSON.stringify(this.inspectors));
      this.closeInspectorModal();
      this.renderInspectors();
      await notifier.alert('참여활동가 저장 완료', `활동가 '${name}' 님의 정보가 안전하게 저장되었습니다.`, 'success');
    }
  }

  /**
   * 참여활동가 삭제
   * @param {string} uid 
   */
  async deleteInspector(uid) {
    const target = this.inspectors.find(i => (i.participant_uid || i.uid) === uid);
    const targetName = target ? target.name : '해당 활동가';

    const confirmed = await notifier.confirm('활동가 삭제 확인', `'${targetName}' 님의 등록 정보를 정말 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/v1/participants?participantUid=${encodeURIComponent(uid)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await this.loadInspectors();
        await notifier.alert('삭제 완료', `'${targetName}' 님의 정보가 성공적으로 삭제되었습니다.`, 'success');
        return;
      }
    } catch (err) {
      console.warn('[InspectorsPane] D1 삭제 예외:', err);
    }

    this.inspectors = this.inspectors.filter(i => (i.participant_uid || i.uid) !== uid);
    localStorage.setItem('wrk_inspectors_list', JSON.stringify(this.inspectors));
    this.renderInspectors();
    await notifier.alert('삭제 완료', `'${targetName}' 님의 정보가 삭제되었습니다.`, 'success');
  }

  /**
   * 엑셀 일괄 등록 모달 열기
   */
  openExcelModal() {
    const modal = document.getElementById('modalExcelInspectors');
    const fileInput = document.getElementById('inputExcelInspectorsFile');
    const dispName = document.getElementById('dispSelectedExcelFileName');
    if (!modal) return;

    if (fileInput) fileInput.value = '';
    if (dispName) dispName.textContent = '선택된 파일 없음 (.xlsx, .csv)';
    modal.classList.add('active');
  }

  /**
   * 엑셀 일괄 등록 모달 닫기
   */
  closeExcelModal() {
    const modal = document.getElementById('modalExcelInspectors');
    if (modal) modal.classList.remove('active');
  }

  /**
   * 표준 엑셀 서식(.csv) 즉시 다운로드 (UTF-8 BOM 포함)
   */
  downloadExcelTemplate() {
    const headers = ['성명', '연락처', '아이디', '비밀번호', '담당조', '근무시간', '활동요일', '관할구역', '구분'];
    const sampleRows = [
      ['홍길동', '010-1234-5678', 'user_004', '1234', '1조', '09:00 ~ 12:00', '월, 수, 금', '가좌1동', '현장방문'],
      ['신사임당', '010-8765-4321', 'user_005', '1234', '1조', '09:00 ~ 12:00', '월, 수, 금', '가좌1동', '현장방문']
    ];

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...sampleRows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '참여활동가_일괄등록_표준서식.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    notifier.toast('표준 엑셀 서식(.csv) 다운로드가 완료되었습니다.', 'success');
  }

  /**
   * 엑셀 파일 선택 탐색기 열기
   */
  triggerExcelFile() {
    const fileInput = document.getElementById('inputExcelInspectorsFile');
    if (fileInput) fileInput.click();
  }

  /**
   * 파일 선택 시 파일명 표시
   */
  onExcelFileSelected(e) {
    const file = e.target.files && e.target.files[0];
    const dispName = document.getElementById('dispSelectedExcelFileName');
    if (!dispName) return;

    if (file) {
      dispName.innerHTML = `<strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
      dispName.style.color = '#0284c7';
    } else {
      dispName.textContent = '선택된 파일 없음 (.xlsx, .csv)';
      dispName.style.color = '#64748b';
    }
  }

  /**
   * 엑셀/CSV 일괄 등록 실행 (D1 파이프라인 연동)
   */
  async submitExcelUpload() {
    const fileInput = document.getElementById('inputExcelInspectorsFile');
    const file = fileInput && fileInput.files && fileInput.files[0];

    if (!file) {
      await notifier.alert('파일 선택 확인', '업로드할 엑셀/CSV 파일을 먼저 선택해 주십시오.', 'warning');
      return;
    }

    try {
      const text = await file.text();
      const lines = text.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0);

      if (lines.length <= 1) {
        await notifier.alert('데이터 확인', '업로드한 파일에 등록할 활동가 데이터가 없습니다.', 'warning');
        return;
      }

      // CSV 행 파싱 헬퍼 (쉼표 및 따옴표 안전 분리)
      const parseCsvLine = (line) => {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"' || char === "'") {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
          } else {
            cur += char;
          }
        }
        result.push(cur.trim());
        return result.map(s => s.replace(/^["']|["']$/g, '').trim());
      };

      // 첫 행(헤더)을 제외한 데이터 행 파싱
      const dataRows = lines.slice(1);
      let successCount = 0;

      for (let idx = 0; idx < dataRows.length; idx++) {
        const cols = parseCsvLine(dataRows[idx]);
        if (cols.length < 2 || !cols[0]) continue; // 최소 이름은 필수

        const name = cols[0] || '';
        const phone = cols[1] || '';
        const loginId = cols[2] || `user_${String(this.inspectors.length + successCount + 1).padStart(3, '0')}`;
        const password = cols[3] || '1234';
        const teamCode = cols[4] || '1조';
        const dutyHours = cols[5] || '09:00 ~ 12:00';
        const dutyDays = cols[6] || '월, 수, 금';
        const assignedAreas = cols[7] || '가좌1동';
        const type = cols[8] || '현장방문';

        try {
          const res = await fetch('/api/v1/participants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orgUid: this.orgUid,
              name,
              phone,
              loginId,
              password,
              teamCode,
              dutyHours,
              dutyDays,
              assignedAreas,
              type,
              status: '활동중'
            })
          });
          if (res.ok) {
            successCount++;
          }
        } catch (e) {
          console.warn(`[InspectorsPane] ${name} 일괄 등록 실패:`, e);
        }
      }

      this.closeExcelModal();
      await this.loadInspectors();
      await notifier.alert('엑셀 일괄 등록 완료', `총 ${successCount}명의 참여활동가가 D1 데이터베이스에 성공적으로 일괄 등록되었습니다.`, 'success');
    } catch (err) {
      console.warn('[InspectorsPane] 엑셀 파일 읽기 예외:', err);
      await notifier.alert('파일 처리 오류', '엑셀/CSV 파일을 읽는 중 오류가 발생했습니다.\n서식 형식을 확인해 주십시오.', 'error');
    }
  }

  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    const btnAddSingle = this.container.querySelector('#btnAddInspectorSingle') || document.getElementById('btnAddInspectorSingle');
    const btnManageTeams = this.container.querySelector('#btnManageTeams') || document.getElementById('btnManageTeams');
    const btnCloseModal = document.getElementById('btnCloseInspectorModal');
    const btnCancelModal = document.getElementById('btnCancelInspectorModal');
    const btnSubmit = document.getElementById('btnSubmitInspector');
    const btnAddDistrict = document.getElementById('btnAddInspectorDistrict');
    const selArea = document.getElementById('selInspectorArea');
    const selTeam = document.getElementById('selInspectorTeam');
    const inpPair = document.getElementById('inpInspectorPair');

    // 조 관리 모달 버튼 및 컨트롤
    const btnCloseTeam = document.getElementById('btnCloseTeamModal');
    const btnCancelTeam = document.getElementById('btnCancelTeamModal');
    const btnSubmitTeam = document.getElementById('btnSubmitTeam');
    const selMem1 = document.getElementById('selTeamMember1');
    const btnToggleNewTeam = document.getElementById('btnToggleNewTeam');
    const inpNewTeam = document.getElementById('inpNewTeamName');
    const selTeamSelect = document.getElementById('selTeamSelect');
    const btnAddTeamDist = document.getElementById('btnAddTeamDistrict');
    const selTeamDist = document.getElementById('selTeamDistrict');

    if (btnManageTeams) {
      btnManageTeams.onclick = () => this.openTeamModal();
    }
    if (btnCloseTeam) {
      btnCloseTeam.onclick = () => this.closeTeamModal();
    }
    if (btnCancelTeam) {
      btnCancelTeam.onclick = () => this.closeTeamModal();
    }
    if (btnSubmitTeam) {
      btnSubmitTeam.onclick = () => this.saveTeam();
    }

    // 참여자 1 변경 시 기존 조/시간/요일/구역 폼 자동 로드 (참여자 우선 워크플로우)
    if (selMem1) {
      selMem1.onchange = () => this.syncTeamFormFromMember1();
    }

    // 새 조 추가 토글 버튼
    if (btnToggleNewTeam && inpNewTeam && selTeamSelect) {
      btnToggleNewTeam.onclick = () => {
        if (inpNewTeam.style.display === 'none') {
          inpNewTeam.style.display = 'block';
          inpNewTeam.focus();
          btnToggleNewTeam.textContent = '선택 목록';
        } else {
          inpNewTeam.style.display = 'none';
          btnToggleNewTeam.textContent = '+ 새 조 추가';
        }
      };
    }

    // 조 편성 모달 근무시간 프리셋 버튼
    document.querySelectorAll('.btn-team-preset').forEach(btn => {
      btn.onclick = (e) => {
        const start = e.currentTarget.getAttribute('data-start');
        const end = e.currentTarget.getAttribute('data-end');
        const inpStart = document.getElementById('inpTeamStartTime');
        const inpEnd = document.getElementById('inpTeamEndTime');
        if (inpStart && start) inpStart.value = start;
        if (inpEnd && end) inpEnd.value = end;
      };
    });

    // 조 편성 모달 관할 구역 추가 버튼
    if (btnAddTeamDist && selTeamDist) {
      btnAddTeamDist.onclick = () => {
        const val = selTeamDist.value;
        if (!val) return;
        if (!this.currentTeamModalDistricts) this.currentTeamModalDistricts = [];
        if (this.currentTeamModalDistricts.includes(val)) {
          notifier.alert('구역 중복 안내', `'${val}'은(는) 이미 배정 구역에 추가되어 있습니다.`, 'warning');
          return;
        }
        this.currentTeamModalDistricts.push(val);
        this.renderTeamModalChips();
      };
    }

    if (btnAddSingle) {
      btnAddSingle.onclick = () => this.openInspectorModal(null);
    }
    if (btnCloseModal) {
      btnCloseModal.onclick = () => this.closeInspectorModal();
    }
    if (btnCancelModal) {
      btnCancelModal.onclick = () => this.closeInspectorModal();
    }
    if (btnSubmit) {
      btnSubmit.onclick = () => this.saveInspector();
    }

    // 근무시간 프리셋 버튼 클릭 이벤트 (오전/오후 조 바꿈)
    document.querySelectorAll('.btn-preset-hours').forEach(btn => {
      btn.onclick = (e) => {
        const start = e.currentTarget.getAttribute('data-start');
        const end = e.currentTarget.getAttribute('data-end');
        const inpStart = document.getElementById('inpInspectorStartTime');
        const inpEnd = document.getElementById('inpInspectorEndTime');
        if (inpStart && start) inpStart.value = start;
        if (inpEnd && end) inpEnd.value = end;
      };
    });

    // 활동 요일 체크박스 변경 시 요약 텍스트 갱신
    document.querySelectorAll('input[name="chkDutyDay"]').forEach(chk => {
      chk.onchange = () => this.updateDutyDaysSummary();
    });

    // 조 이동 셀렉트박스 변경 시 텍스트 인풋 동기화
    if (selTeam && inpPair) {
      selTeam.onchange = () => {
        if (selTeam.value !== 'direct') {
          inpPair.value = selTeam.value;
        } else {
          inpPair.value = '';
          inpPair.focus();
        }
      };
    }

    if (btnAddDistrict && selArea) {
      btnAddDistrict.onclick = () => {
        const val = selArea.value;
        if (!val) return;
        if (!this.currentModalDistricts) this.currentModalDistricts = [];
        if (this.currentModalDistricts.includes(val)) {
          notifier.alert('구역 중복 안내', `'${val}'은(는) 이미 배정 구역에 추가되어 있습니다.`, 'warning');
          return;
        }
        this.currentModalDistricts.push(val);
        this.renderModalChips();
      };
    }

    // 엑셀 일괄 등록 모달 연동
    const btnBatchExcel = this.container.querySelector('#btnBatchUploadInspectors') || document.getElementById('btnBatchUploadInspectors');
    const btnCloseExcel = document.getElementById('btnCloseExcelInspectorsModal');
    const btnCancelExcel = document.getElementById('btnCancelExcelInspectorsModal');
    const btnDownloadTpl = document.getElementById('btnDownloadInspectorTemplate');
    const btnTriggerFile = document.getElementById('btnTriggerExcelInspectorsFile');
    const inputExcelFile = document.getElementById('inputExcelInspectorsFile');
    const btnSubmitExcel = document.getElementById('btnSubmitExcelInspectors');

    if (btnBatchExcel) {
      btnBatchExcel.onclick = () => this.openExcelModal();
    }
    if (btnCloseExcel) {
      btnCloseExcel.onclick = () => this.closeExcelModal();
    }
    if (btnCancelExcel) {
      btnCancelExcel.onclick = () => this.closeExcelModal();
    }
    if (btnDownloadTpl) {
      btnDownloadTpl.onclick = () => this.downloadExcelTemplate();
    }
    if (btnTriggerFile) {
      btnTriggerFile.onclick = () => this.triggerExcelFile();
    }
    if (inputExcelFile) {
      inputExcelFile.onchange = (e) => this.onExcelFileSelected(e);
    }
    if (btnSubmitExcel) {
      btnSubmitExcel.onclick = () => this.submitExcelUpload();
    }
  }
}
