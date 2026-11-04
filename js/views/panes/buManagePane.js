/**
 * @file buManagePane.js
 * @description 3-2. 사업단별 관리 서브 페인 모듈 (ESM)
 *              - 상단 사업단 버튼 선택식 인터페이스
 *              - 하위 1. 사업단 수정 (기관정보 등록/수정 양식 기반)
 *              - 하위 2. 참여자 관리 (기관정보 참여자관리 동일 구조 - 개별/일괄등록)
 *              - 하위 3. 일정 등록 (수혜자관리카드 다음 일정 세팅 규격)
 */

import { notifier } from '../../utils/notifier.js';

export const INITIAL_BUSINESS_UNITS = [
  {
    code: 'ME',
    name: '식사지원 사업단',
    category: '식사지원',
    manager: '김민지 사회복지사',
    phone: '032-560-1121',
    targetQuota: 60,
    currentRecipients: 2,
    assignedWorkers: ['박영희 (1조)', '김철수 (1조)'],
    schedules: ['월/수/금 09:00~12:00 (밑반찬·영양죽 지원)'],
    desc: '영양 결핍 초고위험군 긴급 영양죽 배달 및 주 3회 밑반찬 정기 지원'
  },
  {
    code: 'HE',
    name: '건강의료 사업단',
    category: '건강의료',
    manager: '이서연 간호사',
    phone: '032-560-1122',
    targetQuota: 40,
    currentRecipients: 2,
    assignedWorkers: ['이순신 (2조)', '강감찬 (2조)'],
    schedules: ['화/목 13:00~16:00 (방문간호·복약지도)'],
    desc: '방문간호사 복약 지도, 혈압/혈당 정기 측정 및 보건소 치매안심센터 연계'
  },
  {
    code: 'CL',
    name: '주거개선 사업단',
    category: '주거개선',
    manager: '박준호 주임',
    phone: '032-560-1123',
    targetQuota: 30,
    currentRecipients: 2,
    assignedWorkers: ['박영희 (1조)', '김철수 (1조)'],
    schedules: ['수요일 10:00~15:00 (방역소독 및 특수청소)'],
    desc: '반지하/옥탑 특수 청소, 해충 방역 및 이동세탁차량 대형이불 세탁 지원'
  },
  {
    code: 'EM',
    name: '정서·이웃연결단',
    category: '정서이웃',
    manager: '최진우 사회복지사',
    phone: '032-560-1124',
    targetQuota: 100,
    currentRecipients: 3,
    assignedWorkers: ['박영희 (1조)', '이순신 (2조)'],
    schedules: ['주 2회 정기 안부전화 및 말벗 방문'],
    desc: '1:1 안심이웃 결연 주 2회 말벗 방문 및 AI 돌봄스피커·119 안심콜 등록'
  }
];

export class BuManagePane {
  constructor(options = {}) {
    this.container = null;
    this.cases = options.cases || [];
    this.buList = JSON.parse(localStorage.getItem('wrk_bu_list') || 'null') || INITIAL_BUSINESS_UNITS;
    this.activeBuCode = this.buList[0]?.code || 'ME';
    this.activeSubtab = 'edit'; // 'edit' | 'workers' | 'schedule'
    this.inspectors = [];
  }

  async mount(containerEl, options = {}) {
    if (typeof containerEl === 'string') {
      this.container = document.getElementById(containerEl);
    } else {
      this.container = containerEl;
    }

    if (options.cases && options.cases.length > 0) {
      this.cases = options.cases;
    }

    if (!this.container) return;

    this.loadInspectors();
    this.bindEvents();
    this.render();
  }

  loadInspectors() {
    let list = [];
    const saved = localStorage.getItem('wrk_inspectors_list');
    if (saved) {
      try {
        list = JSON.parse(saved);
      } catch (e) {
        list = [];
      }
    }
    if (!list || list.length === 0) {
      list = [
        { seq_number: 1, uid: 'U-28-237-01-GD-001', name: '박영희', login_id: 'user_001', phone: '010-3829-1029', team_code: '1조', assigned_areas: '가좌1동, 가좌2동', duty_days: '월, 수, 금', duty_hours: '09:00 ~ 12:00', type: '현장방문', status: '활동중' },
        { seq_number: 2, uid: 'U-28-237-01-GD-002', name: '김철수', login_id: 'user_002', phone: '010-9182-3849', team_code: '1조', assigned_areas: '가좌1동, 가좌2동', duty_days: '월, 수, 금', duty_hours: '09:00 ~ 12:00', type: '배정·검수', status: '활동중' },
        { seq_number: 3, uid: 'U-28-237-01-GD-003', name: '이순신', login_id: 'user_003', phone: '010-5829-4820', team_code: '2조', assigned_areas: '석남1동, 석남2동', duty_days: '화, 목', duty_hours: '13:00 ~ 16:00', type: '현장방문', status: '활동중' },
        { seq_number: 4, uid: 'U-28-237-01-GD-004', name: '강감찬', login_id: 'user_004', phone: '010-8291-0029', team_code: '2조', assigned_areas: '석남1동, 석남2동', duty_days: '화, 목', duty_hours: '13:00 ~ 16:00', type: '배정·검수', status: '활동중' }
      ];
    }
    this.inspectors = list;
    return this.inspectors;
  }

  getActiveBu() {
    return this.buList.find(b => b.code === this.activeBuCode) || this.buList[0];
  }

  bindEvents() {
    // 1. 헤더의 신규 사업단 등록 버튼 연동
    const btnNew = document.getElementById('btnAddNewBuFromManage');
    if (btnNew) {
      btnNew.onclick = () => this.openNewBuModal();
    }

    // 신규 사업단 모달 닫기/저장
    const btnCloseBu = document.getElementById('btnCloseBuModal');
    const btnCancelBu = document.getElementById('btnCancelBuModal');
    const btnSaveBu = document.getElementById('btnSaveBu');

    if (btnCloseBu) btnCloseBu.onclick = () => this.closeBuModal();
    if (btnCancelBu) btnCancelBu.onclick = () => this.closeBuModal();
    if (btnSaveBu) btnSaveBu.onclick = () => this.saveNewBuFromModal();

    // 2. 하위 메뉴 탭 버튼 클릭 이벤트 바인딩
    ['edit', 'workers', 'schedule'].forEach(subtab => {
      const btn = document.getElementById(`subtabBu${subtab.charAt(0).toUpperCase() + subtab.slice(1)}`);
      if (btn) {
        btn.onclick = () => {
          this.activeSubtab = subtab;
          this.render();
        };
      }
    });
  }

  render() {
    this.renderBuButtons();
    this.renderSubmenuTabs();

    if (this.activeSubtab === 'edit') {
      this.renderEditSubpane();
    } else if (this.activeSubtab === 'workers') {
      this.renderWorkersSubpane();
    } else if (this.activeSubtab === 'schedule') {
      this.renderScheduleSubpane();
    }
  }

  /**
   * 1. 상단 사업단 버튼 바 (순수 사업단 목록만 배치)
   */
  renderBuButtons() {
    const tabsContainer = document.getElementById('buSelectorTabs');
    if (!tabsContainer) return;

    tabsContainer.innerHTML = this.buList.map(bu => {
      const isActive = bu.code === this.activeBuCode;
      const activeStyle = isActive
        ? 'background: #0f172a; color: #ffffff; border-color: #0f172a; font-weight: 800;'
        : 'background: #ffffff; color: #334155; border: 1px solid #cbd5e1; font-weight: 600;';

      return `
        <button type="button" class="btn-action ${isActive ? 'active' : 'secondary'}" data-bu-code="${bu.code}" style="padding: 8px 18px; font-size: 13px; border-radius: 4px; ${activeStyle}">
          ${bu.name} (${bu.code})
        </button>
      `;
    }).join('');

    tabsContainer.querySelectorAll('button[data-bu-code]').forEach(btn => {
      btn.onclick = (e) => {
        this.activeBuCode = e.currentTarget.dataset.buCode;
        this.render();
      };
    });
  }

  /**
   * 2. 하위 메뉴 탭 상태 동기화
   */
  renderSubmenuTabs() {
    ['edit', 'workers', 'schedule'].forEach(subtab => {
      const btn = document.getElementById(`subtabBu${subtab.charAt(0).toUpperCase() + subtab.slice(1)}`);
      const pane = document.getElementById(`buSubpane${subtab.charAt(0).toUpperCase() + subtab.slice(1)}`);
      const isActive = this.activeSubtab === subtab;

      if (btn) {
        if (isActive) {
          btn.className = 'btn-action active';
          btn.style.background = '#0f172a';
          btn.style.color = '#ffffff';
          btn.style.fontWeight = '800';
        } else {
          btn.className = 'btn-action secondary';
          btn.style.background = '#ffffff';
          btn.style.color = '#475569';
          btn.style.fontWeight = '700';
        }
      }

      if (pane) {
        pane.style.display = isActive ? 'block' : 'none';
      }
    });
  }

  /**
   * 3-1. 하위 1: 사업단 수정 양식 (기관정보 기초정보 양식 스타일)
   */
  renderEditSubpane() {
    const pane = document.getElementById('buSubpaneEdit');
    if (!pane) return;

    const bu = this.getActiveBu();
    if (!bu) return;

    pane.innerHTML = `
      <div class="admin-card" style="max-width: 840px; margin: 12px 0 24px 0; padding: 28px 32px;">
        <div style="font-size: 15.5px; font-weight: 800; color: #0f172a; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
          <span>${bu.name} 기본정보 수정</span>
          <span style="font-size: 12px; font-weight: 600; color: #64748b;">사업단 코드: <strong style="color: #0f172a;">${bu.code}</strong></span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px 22px;">
          <div>
            <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">사업단 명칭 <span style="color:#dc2626;">*</span></label>
            <input type="text" class="filter-ctrl" id="inpEditBuName" value="${bu.name || ''}" style="width: 100%; height: 38px; border-radius: 4px;">
          </div>
          <div>
            <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">사업단 코드 (고유식별)</label>
            <input type="text" class="filter-ctrl" id="inpEditBuCode" value="${bu.code || ''}" readonly style="width: 100%; height: 38px; border-radius: 4px; background: #f8fafc; color: #64748b; font-family: monospace;">
          </div>

          <div>
            <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">서비스 분류</label>
            <select class="filter-ctrl" id="selEditBuCategory" style="width: 100%; height: 38px; border-radius: 4px;">
              <option value="식사지원" ${bu.category === '식사지원' ? 'selected' : ''}>식사지원 (도시락·밑반찬)</option>
              <option value="건강의료" ${bu.category === '건강의료' ? 'selected' : ''}>건강의료 (방문간호·복약지도)</option>
              <option value="주거개선" ${bu.category === '주거개선' ? 'selected' : ''}>주거개선 (방역·청소·세탁)</option>
              <option value="정서이웃" ${bu.category === '정서이웃' ? 'selected' : ''}>정서이웃 (말벗·안심이웃)</option>
              <option value="기타돌봄" ${bu.category === '기타돌봄' ? 'selected' : ''}>기타 특화돌봄</option>
            </select>
          </div>
          <div>
            <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">전담 매니저(담당자)</label>
            <input type="text" class="filter-ctrl" id="inpEditBuManager" value="${bu.manager || ''}" style="width: 100%; height: 38px; border-radius: 4px;">
          </div>

          <div>
            <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">대표 연락처</label>
            <input type="text" class="filter-ctrl" id="inpEditBuPhone" value="${bu.phone || ''}" style="width: 100%; height: 38px; border-radius: 4px;">
          </div>
          <div>
            <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">배정 목표 가구수 (목표치)</label>
            <input type="number" class="filter-ctrl" id="inpEditBuTargetQuota" value="${bu.targetQuota || 50}" style="width: 100%; height: 38px; border-radius: 4px;">
          </div>

          <div style="grid-column: span 2;">
            <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">사업단 주요 목적 및 지원 내용</label>
            <textarea class="filter-ctrl" id="inpEditBuDesc" rows="3" style="width: 100%; border-radius: 4px; padding: 10px; resize: vertical;">${bu.desc || ''}</textarea>
          </div>
        </div>

        <div style="margin-top: 26px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; align-items: center; padding-top: 18px;">
          <button type="button" class="btn-action primary" id="btnSaveBuEditForm" style="padding: 8px 28px; font-weight: 700; background: #0f172a;">수정 내용 저장</button>
        </div>
      </div>
    `;

    const btnSave = document.getElementById('btnSaveBuEditForm');
    if (btnSave) {
      btnSave.onclick = () => {
        const name = document.getElementById('inpEditBuName')?.value.trim();
        const category = document.getElementById('selEditBuCategory')?.value;
        const manager = document.getElementById('inpEditBuManager')?.value.trim();
        const phone = document.getElementById('inpEditBuPhone')?.value.trim();
        const quota = parseInt(document.getElementById('inpEditBuTargetQuota')?.value || '50', 10);
        const desc = document.getElementById('inpEditBuDesc')?.value.trim();

        if (!name) {
          notifier.toast('사업단 명칭은 필수 입력 항목입니다.', 'warning');
          return;
        }

        bu.name = name;
        bu.category = category;
        bu.manager = manager;
        bu.phone = phone;
        bu.targetQuota = quota;
        bu.desc = desc;

        localStorage.setItem('wrk_bu_list', JSON.stringify(this.buList));
        notifier.toast(`[${bu.name}] 사업단 정보가 성공적으로 저장되었습니다.`, 'success');
        this.renderBuButtons();
      };
    }
  }

  /**
   * 3-2. 하위 2: 참여자 관리 (기관정보 참여자관리 동일 구조 - 개별등록, 일괄등록 연동)
   */
  renderWorkersSubpane() {
    const pane = document.getElementById('buSubpaneWorkers');
    if (!pane) return;

    const bu = this.getActiveBu();
    if (!bu) return;

    this.loadInspectors();

    const assignedNames = bu.assignedWorkers || [];

    // 소속 참여자 테이블 행 구성
    let rowsHtml = '';
    if (assignedNames.length === 0) {
      rowsHtml = `
        <tr>
          <td colspan="8" style="text-align: center; color: #94a3b8; padding: 24px;">
            현재 [${bu.name}]에 배정된 참여자가 없습니다. 우측 상단의 '+ 1명 등록' 또는 아래 기존 참여자 배정을 이용해 주십시오.
          </td>
        </tr>
      `;
    } else {
      rowsHtml = assignedNames.map((wEntry, idx) => {
        const rawName = wEntry.split(' ')[0].replace(/\[.*?\]/g, '').trim();
        const matched = this.inspectors.find(ins => ins.name === rawName);

        const seq = idx + 1;
        const name = rawName;
        const loginId = matched ? (matched.login_id || matched.loginId || `user_${String(seq).padStart(3, '0')}`) : '-';
        const phone = matched ? (matched.phone || matched.phoneMasked || '010-****-0000') : '-';
        const pair = matched ? (matched.team_code || matched.pair || '1조') : (wEntry.includes('조') ? wEntry : '미배정');
        const area = matched ? (matched.assigned_areas || matched.area || '부평구 관내') : '부평구 관내';
        const duty = matched ? `${matched.duty_days || '월,수,금'} (${matched.duty_hours || '09:00~12:00'})` : '정례 활동';
        const status = matched ? (matched.status || '활동중') : '활동중';

        return `
          <tr>
            <td style="text-align: center; font-weight: 700; color: #64748b;">${seq}</td>
            <td style="white-space: nowrap;">
              <strong style="color: #0f172a; font-size: 13px;">${name}</strong>
              <span style="font-size: 11px; color: #64748b; font-family: monospace; margin-left: 2px;">(${loginId})</span>
            </td>
            <td style="color: #475569; font-size: 12.5px;">${phone}</td>
            <td style="font-weight: 600; color: #0f172a;">${pair}</td>
            <td style="color: #475569; font-size: 12px;">${area}</td>
            <td style="color: #64748b; font-size: 11.5px;">${duty}</td>
            <td style="text-align: center;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1;">${status}</span>
            </td>
            <td style="text-align: center;">
              <button type="button" class="btn-action secondary btn-unassign-worker" data-worker-entry="${wEntry}" style="padding: 3px 8px; font-size: 11px; color: #dc2626; border-color: #fecaca; background: #fff;">
                배정 해제
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    pane.innerHTML = `
      <div style="margin-top: 12px; margin-bottom: 24px;">
        <!-- 상단 헤더 및 등록 버튼 바 -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
          <div>
            <div style="font-size: 15px; font-weight: 800; color: #0f172a;">
              ${bu.name} 참여자 관리
            </div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
              해당 사업단에 배정된 소속 참여자 명단을 확인하고 신규 등록(개별/일괄) 및 배정을 관리합니다.
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn-action primary" id="btnBuAddInspectorSingle" style="font-weight: 700; background: #0f172a;">+ 1명 등록 (개별등록)</button>
            <button type="button" class="btn-action secondary" id="btnBuBatchUploadInspectors" style="font-weight: 700;">엑셀 일괄 등록</button>
          </div>
        </div>

        <!-- 기존 참여자 사업단 배정 바 -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 16px; margin-bottom: 14px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <span style="font-size: 12px; font-weight: 700; color: #334155;">기존 등록된 참여자를 본 사업단에 배정:</span>
          <select class="filter-ctrl" id="selAssignExistingWorker" style="height: 34px; border-radius: 4px; min-width: 220px;">
            ${this.inspectors.map(ins => `<option value="${ins.name}">${ins.name} (${ins.team_code || '1조'} / ${ins.phone || ''})</option>`).join('')}
          </select>
          <button type="button" class="btn-action primary" id="btnDoAssignWorker" style="height: 34px; padding: 0 16px; font-size: 12px; font-weight: 700; background: #2563eb;">
            + 사업단 배정 추가
          </button>
        </div>

        <!-- 소속 참여자 테이블 -->
        <div class="table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th style="width: 50px;">연번</th>
                <th style="width: 140px;">성명 (로그인ID)</th>
                <th style="width: 130px;">연락처</th>
                <th style="width: 120px;">담당 배정 조</th>
                <th>담당 관할 구역</th>
                <th style="width: 150px;">근무 요일/시간</th>
                <th style="width: 80px;">상태</th>
                <th style="width: 90px;">관리</th>
              </tr>
            </thead>
            <tbody id="tbodyBuWorkers">
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // 1명 등록 버튼 -> 기존 modalInspector 팝업 오픈
    const btnAddSingle = document.getElementById('btnBuAddInspectorSingle');
    if (btnAddSingle) {
      btnAddSingle.onclick = () => {
        const modal = document.getElementById('modalInspector');
        if (modal) {
          const title = document.getElementById('modalInspectorTitle');
          if (title) title.textContent = '신규 참여자 등록';
          modal.classList.add('active');
        }
      };
    }

    // 엑셀 일괄 등록 버튼 -> 기존 modalExcelInspectors 팝업 오픈
    const btnBatch = document.getElementById('btnBuBatchUploadInspectors');
    if (btnBatch) {
      btnBatch.onclick = () => {
        const modal = document.getElementById('modalExcelInspectors');
        if (modal) modal.classList.add('active');
      };
    }

    // 기존 참여자 배정 추가
    const btnDoAssign = document.getElementById('btnDoAssignWorker');
    if (btnDoAssign) {
      btnDoAssign.onclick = () => {
        const selName = document.getElementById('selAssignExistingWorker')?.value;
        if (!selName) return;

        if (!bu.assignedWorkers) bu.assignedWorkers = [];
        const exists = bu.assignedWorkers.some(w => w.startsWith(selName));
        if (exists) {
          notifier.toast(`[${selName}] 님은 이미 [${bu.name}]에 배정되어 있습니다.`, 'info');
          return;
        }

        const matched = this.inspectors.find(i => i.name === selName);
        const entry = `${selName} (${matched?.team_code || '1조'})`;
        bu.assignedWorkers.push(entry);

        localStorage.setItem('wrk_bu_list', JSON.stringify(this.buList));
        notifier.toast(`[${selName}] 님이 [${bu.name}]에 성공적으로 배정되었습니다.`, 'success');
        this.renderWorkersSubpane();
      };
    }

    // 배정 해제 버튼
    pane.querySelectorAll('.btn-unassign-worker').forEach(btn => {
      btn.onclick = (e) => {
        const targetEntry = e.currentTarget.dataset.workerEntry;
        if (!confirm(`[${targetEntry}] 참여자를 해당 사업단에서 배정 해제하시겠습니까?`)) return;

        bu.assignedWorkers = bu.assignedWorkers.filter(w => w !== targetEntry);
        localStorage.setItem('wrk_bu_list', JSON.stringify(this.buList));
        notifier.toast(`[${targetEntry}] 참여자의 배정이 해제되었습니다.`, 'info');
        this.renderWorkersSubpane();
      };
    });
  }

  /**
   * 3-3. 하위 3: 일정 등록 (수혜자관리카드 다음일정 세팅 규격 반영)
   *      - 안부확인 방식(라디오) 제외
   *      - 용어 '담당 참여자' 준수
   */
  renderScheduleSubpane() {
    const pane = document.getElementById('buSubpaneSchedule');
    if (!pane) return;

    const bu = this.getActiveBu();
    if (!bu) return;

    const todayStr = new Date().toISOString().split('T')[0];

    // 소속 참여자 옵션 목록
    let workerOptions = '<option value="">-- 담당 참여자 선택 --</option>';
    if (bu.assignedWorkers && bu.assignedWorkers.length > 0) {
      workerOptions += bu.assignedWorkers.map(w => `<option value="${w}">${w}</option>`).join('');
    } else if (this.inspectors && this.inspectors.length > 0) {
      workerOptions += this.inspectors.map(i => `<option value="${i.name} (${i.team_code || '1조'})">${i.name} (${i.team_code || '1조'})</option>`).join('');
    }

    // 수혜 대상자 옵션 목록
    let targetOptions = '<option value="">-- 대상 어르신 선택 --</option>';
    if (this.cases && this.cases.length > 0) {
      targetOptions += this.cases.map(c => `
        <option value="${c.uid}">${c.name} (${c.uid} / ${c.gender} / ${c.age || ''}세)</option>
      `).join('');
    }

    // 등록된 일정 리스트
    let scheduleRowsHtml = '';
    const schedList = bu.schedules || [];
    if (schedList.length === 0) {
      scheduleRowsHtml = `
        <div style="text-align: center; color: #94a3b8; padding: 36px 12px; font-size: 12.5px;">
          등록된 사업단 방문 및 서비스 활동 일정이 없습니다.
        </div>
      `;
    } else {
      scheduleRowsHtml = schedList.map((sched, idx) => {
        let title = '';
        let details = '';

        if (typeof sched === 'string') {
          title = sched;
          details = '정례 사업단 지원 일정';
        } else {
          title = `${sched.targetName} 어르신: ${sched.date} ${sched.time}`;
          details = `담당 참여자: ${sched.worker} | 메모: ${sched.memo || '-'}`;
        }

        return `
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
            <div style="display: flex; flex-direction: column; gap: 3px;">
              <div style="font-size: 13px; font-weight: 700; color: #0f172a;">${title}</div>
              <div style="font-size: 11.5px; color: #64748b;">${details}</div>
            </div>
            <button type="button" class="btn-action secondary btn-delete-bu-sched" data-sched-idx="${idx}" style="padding: 4px 10px; font-size: 11px; color: #dc2626; border-color: #fecaca; background: #fff;">
              삭제
            </button>
          </div>
        `;
      }).join('');
    }

    pane.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 12px; margin-bottom: 24px;">
        <!-- 좌측: 일정 세팅 폼 카드 (수혜자관리카드 다음 일정 세팅 규격) -->
        <div class="admin-card" style="padding: 24px 28px;">
          <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 6px; border-bottom: 2px solid #0f172a; padding-bottom: 8px;">
            ${bu.name} 일정 등록
          </div>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 18px;">
            해당 사업단의 수혜 어르신별 방문 및 활동 서비스 일정을 지정·등록합니다.
          </p>

          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px;">수혜 대상 어르신 검색 및 선택 <span style="color:#dc2626;">*</span></label>
              <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <input type="text" class="filter-ctrl" id="inpSchedTargetSearch" placeholder="어르신 성명 또는 관리번호(UID) 검색..." style="flex: 1; height: 36px; border-radius: 4px; font-size: 12px;">
                <button type="button" class="btn-action secondary" id="btnResetSchedTargetSearch" style="padding: 0 12px; height: 36px; font-size: 11.5px; white-space: nowrap;">초기화</button>
              </div>
              <select class="filter-ctrl" id="inpSchedTargetSelect" style="width: 100%; height: 38px; border-radius: 4px;">
                ${targetOptions}
              </select>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px;">예정 일자 <span style="color:#dc2626;">*</span></label>
                <input type="date" class="filter-ctrl" id="inpSchedDate" value="${todayStr}" style="width: 100%; height: 38px; border-radius: 4px;">
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px;">예정 시간대</label>
                <select class="filter-ctrl" id="inpSchedTime" style="width: 100%; height: 38px; border-radius: 4px;">
                  <option value="오전 10:00">오전 10:00 (식사/약 복용 확인)</option>
                  <option value="오후 14:00">오후 14:00 (정례 오후 순찰)</option>
                  <option value="오후 16:30">오후 16:30 (야간 대비 안부)</option>
                </select>
              </div>
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px;">담당 참여자 <span style="color:#dc2626;">*</span></label>
              <select class="filter-ctrl" id="inpSchedWorkerSelect" style="width: 100%; height: 38px; border-radius: 4px;">
                ${workerOptions}
              </select>
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px;">사전 확인 메모</label>
              <textarea class="filter-ctrl" id="inpSchedMemo" rows="3" placeholder="예: 영양 밑반찬 지원 및 복약 상태 확인" style="width: 100%; font-size: 12px; padding: 10px; resize: vertical; border-radius: 4px;"></textarea>
            </div>

            <button type="button" class="btn-action primary" id="btnSubmitSchedForm" style="background: #0f172a; font-weight: 800; padding: 11px; width: 100%; margin-top: 6px;">
              일정 등록 완료
            </button>
          </div>
        </div>

        <!-- 우측: 등록된 활동 일정 목록 -->
        <div class="admin-card" style="padding: 24px 28px;">
          <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 6px; border-bottom: 2px solid #0f172a; padding-bottom: 8px;">
            ${bu.name} 등록된 활동 일정 (${schedList.length}건)
          </div>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 18px;">
            현재 등록되어 있는 어르신별 활동 일정 목록입니다.
          </p>

          <div style="display: flex; flex-direction: column; gap: 10px; max-height: 480px; overflow-y: auto;">
            ${scheduleRowsHtml}
          </div>
        </div>
      </div>
    `;

    // 실시간 수혜 대상자 검색 및 필터링
    const inpSearch = document.getElementById('inpSchedTargetSearch');
    const selTarget = document.getElementById('inpSchedTargetSelect');
    const btnResetSearch = document.getElementById('btnResetSchedTargetSearch');

    const filterTargetOptions = (keyword = '') => {
      const kw = keyword.trim().toLowerCase();
      const filtered = (this.cases || []).filter(c => {
        if (!kw) return true;
        const name = (c.name || '').toLowerCase();
        const uid = (c.uid || '').toLowerCase();
        return name.includes(kw) || uid.includes(kw);
      });

      if (!selTarget) return;

      if (filtered.length === 0) {
        selTarget.innerHTML = '<option value="">일치하는 대상 어르신이 없습니다</option>';
      } else {
        selTarget.innerHTML = `
          <option value="">-- 대상 어르신 선택 (${filtered.length}명) --</option>
          ${filtered.map(c => `<option value="${c.uid}">${c.name} (${c.uid} / ${c.gender} / ${c.age || ''}세)</option>`).join('')}
        `;
        if (kw && filtered.length === 1) {
          selTarget.value = filtered[0].uid;
        }
      }
    };

    if (inpSearch) {
      inpSearch.oninput = (e) => filterTargetOptions(e.target.value);
    }
    if (btnResetSearch) {
      btnResetSearch.onclick = () => {
        if (inpSearch) inpSearch.value = '';
        filterTargetOptions('');
      };
    }

    // 일정 등록 완료 이벤트
    const btnSubmit = document.getElementById('btnSubmitSchedForm');
    if (btnSubmit) {
      btnSubmit.onclick = () => {
        const targetUid = document.getElementById('inpSchedTargetSelect')?.value;
        const date = document.getElementById('inpSchedDate')?.value;
        const time = document.getElementById('inpSchedTime')?.value;
        const worker = document.getElementById('inpSchedWorkerSelect')?.value;
        const memo = document.getElementById('inpSchedMemo')?.value.trim();

        if (!targetUid) {
          notifier.toast('수혜 대상 어르신을 선택해 주십시오.', 'warning');
          return;
        }
        if (!date) {
          notifier.toast('예정 일자를 지정해 주십시오.', 'warning');
          return;
        }
        if (!worker) {
          notifier.toast('담당 참여자를 지정해 주십시오.', 'warning');
          return;
        }

        const target = this.cases.find(c => c.uid === targetUid);
        const targetName = target ? target.name : targetUid;

        if (!bu.schedules) bu.schedules = [];
        bu.schedules.unshift({
          id: 'SCHED-' + Date.now(),
          targetUid,
          targetName,
          date,
          time,
          worker,
          memo: memo || '정례 사업단 지원 서비스'
        });

        localStorage.setItem('wrk_bu_list', JSON.stringify(this.buList));
        notifier.toast(`[${targetName}] 어르신의 [${bu.name}] 일정이 등록되었습니다.`, 'success');
        this.renderScheduleSubpane();
      };
    }

    // 일정 삭제 이벤트
    pane.querySelectorAll('.btn-delete-bu-sched').forEach(btn => {
      btn.onclick = (e) => {
        const idx = parseInt(e.currentTarget.dataset.schedIdx, 10);
        if (confirm('해당 일정을 삭제하시겠습니까?')) {
          bu.schedules.splice(idx, 1);
          localStorage.setItem('wrk_bu_list', JSON.stringify(this.buList));
          notifier.toast('일정이 삭제되었습니다.', 'info');
          this.renderScheduleSubpane();
        }
      };
    });
  }

  // 상단 헤더 [+ 신규 사업단 등록] 모달 제어
  openNewBuModal() {
    const modal = document.getElementById('modalAddBu');
    if (!modal) return;

    const title = document.getElementById('titleModalBu');
    const editIdx = document.getElementById('editBuIndex');
    const inpName = document.getElementById('inpBuName');
    const inpCode = document.getElementById('inpBuCode');
    const inpManager = document.getElementById('inpBuManager');
    const inpPhone = document.getElementById('inpBuPhone');
    const inpQuota = document.getElementById('inpBuTargetQuota');
    const inpDesc = document.getElementById('inpBuDesc');

    if (title) title.textContent = '신규 전담 사업단 추가';
    if (editIdx) editIdx.value = '-1';
    if (inpName) inpName.value = '';
    if (inpCode) { inpCode.value = ''; inpCode.disabled = false; }
    if (inpManager) inpManager.value = '';
    if (inpPhone) inpPhone.value = '';
    if (inpQuota) inpQuota.value = '50';
    if (inpDesc) inpDesc.value = '';

    modal.classList.add('active');
  }

  closeBuModal() {
    const modal = document.getElementById('modalAddBu');
    if (modal) modal.classList.remove('active');
  }

  saveNewBuFromModal() {
    const name = document.getElementById('inpBuName')?.value.trim();
    const code = document.getElementById('inpBuCode')?.value.trim().toUpperCase();
    const category = document.getElementById('selBuCategory')?.value || '기타돌봄';
    const manager = document.getElementById('inpBuManager')?.value.trim();
    const phone = document.getElementById('inpBuPhone')?.value.trim();
    const targetQuota = parseInt(document.getElementById('inpBuTargetQuota')?.value || '50', 10);
    const desc = document.getElementById('inpBuDesc')?.value.trim();

    if (!name || !code) {
      notifier.toast('사업단 명칭과 코드는 필수 입력 항목입니다.', 'warning');
      return;
    }

    if (this.buList.some(b => b.code === code)) {
      notifier.toast(`이미 존재하는 사업단 코드(${code})입니다.`, 'warning');
      return;
    }

    const newBu = {
      code,
      name,
      category,
      manager: manager || '미정',
      phone: phone || '-',
      targetQuota,
      currentRecipients: 0,
      assignedWorkers: [],
      schedules: [],
      desc: desc || '맞춤 돌봄 서비스 제공'
    };

    this.buList.push(newBu);
    this.activeBuCode = code;

    localStorage.setItem('wrk_bu_list', JSON.stringify(this.buList));
    notifier.toast(`신규 사업단 [${name}] (${code})이 등록되었습니다.`, 'success');

    this.closeBuModal();
    this.render();
  }
}
