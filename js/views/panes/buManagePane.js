/**
 * @file buManagePane.js
 * @description 3-2. 사업단별 관리 서브 페인 모듈 (ESM)
 *              - 상단 사업단 버튼 선택식 인터페이스
 *              - 하위 1. 사업단 수정 (기관정보 등록/수정 양식 기반)
 *              - 하위 2. 참여자 관리 (기관정보 참여자관리 동일 구조 - 개별/일괄등록)
 *              - 하위 3. 일정 등록 (수혜자관리카드 다음 일정 세팅 규격)
 */

import { notifier } from '../../utils/notifier.js';
import { OrgAdminApi } from '../../api/orgAdminApi.js';
import { RbacService } from '../../services/rbacService.js';
import { getLocalTodayString } from '../../utils/date.js';
import { BUPYEONG_INITIAL_INSPECTORS } from './inspectorsPane.js';

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
    this.activeSubtab = 'edit'; // 'edit' | 'admins' | 'workers' | 'schedule' | 'activity'
    this.inspectors = [];
    this.actPagination = {
      currentPage: 1,
      pageSize: 10
    };
    this.selectedActIds = new Set();
    this.hideActUid = false; // 기본값: 관리번호 보임 (체크 시 숨김)
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
    const hasLegacy = !list || list.length === 0 || list.some(i => {
      const u = i.uid || i.participant_uid || '';
      return u.includes('GD') || (i.assigned_areas || '').includes('가좌') || (!u.includes('-ME-') && !u.includes('-HE-')) || !i.bu_name;
    });
    if (hasLegacy) {
      list = BUPYEONG_INITIAL_INSPECTORS;
      localStorage.setItem('wrk_inspectors_list', JSON.stringify(list));
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
    const selBuCategory = document.getElementById('selBuCategory');
    const inpBuCategoryCustom = document.getElementById('inpBuCategoryCustom');

    if (btnCloseBu) btnCloseBu.onclick = () => this.closeBuModal();
    if (btnCancelBu) btnCancelBu.onclick = () => this.closeBuModal();
    if (btnSaveBu) btnSaveBu.onclick = () => this.saveNewBuFromModal();
    if (selBuCategory && inpBuCategoryCustom) {
      selBuCategory.onchange = () => {
        inpBuCategoryCustom.style.display = selBuCategory.value === 'custom' ? 'block' : 'none';
        if (selBuCategory.value === 'custom') inpBuCategoryCustom.focus();
      };
    }

    // 2. 하위 메뉴 탭 버튼 클릭 이벤트 바인딩
    ['edit', 'admins', 'workers', 'schedule', 'activity'].forEach(subtab => {
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
    } else if (this.activeSubtab === 'admins') {
      this.renderAdminsSubpane();
    } else if (this.activeSubtab === 'workers') {
      this.renderWorkersSubpane();
    } else if (this.activeSubtab === 'schedule') {
      this.renderScheduleSubpane();
    } else if (this.activeSubtab === 'activity') {
      this.renderActivitySubpane();
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
    ['edit', 'admins', 'workers', 'schedule', 'activity'].forEach(subtab => {
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
              <option value="이동동행" ${bu.category === '이동동행' ? 'selected' : ''}>이동동행 (병원동행·외출지원)</option>
              <option value="안전관리" ${bu.category === '안전관리' ? 'selected' : ''}>안전관리 (스마트센서·안심콜)</option>
              ${(!['식사지원', '건강의료', '주거개선', '정서이웃', '이동동행', '안전관리'].includes(bu.category) && bu.category) ? `<option value="${bu.category}" selected>${bu.category} (특화 분류)</option>` : ''}
              <option value="custom">+ 직접 입력 (신규 특화 분류)</option>
            </select>
            <input type="text" class="filter-ctrl" id="inpEditBuCategoryCustom" placeholder="신규 서비스 분류명 입력" style="display: none; width: 100%; height: 34px; margin-top: 6px; border-radius: 4px;">
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

    const selEditCat = document.getElementById('selEditBuCategory');
    const inpEditCustom = document.getElementById('inpEditBuCategoryCustom');
    if (selEditCat && inpEditCustom) {
      selEditCat.onchange = () => {
        inpEditCustom.style.display = selEditCat.value === 'custom' ? 'block' : 'none';
        if (selEditCat.value === 'custom') inpEditCustom.focus();
      };
    }

    const btnSave = document.getElementById('btnSaveBuEditForm');
    if (btnSave) {
      btnSave.onclick = () => {
        const name = document.getElementById('inpEditBuName')?.value.trim();
        const selCatVal = document.getElementById('selEditBuCategory')?.value;
        const customCatVal = document.getElementById('inpEditBuCategoryCustom')?.value.trim();
        const category = (selCatVal === 'custom') ? (customCatVal || '기타 특화돌봄') : selCatVal;
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
   * 3-2. 하위 2: 관리자추가 (사업단 전담 부관리자 목록 및 신규 배정)
   */
  renderAdminsSubpane() {
    const pane = document.getElementById('buSubpaneAdmins');
    if (!pane) return;

    const bu = this.getActiveBu();
    if (!bu) return;

    // 기관 부관리자 목록 조회
    const allAdmins = window.admin?.adminsPane?.admins || [
      {
        uid: 'A-28-237-01-01',
        login_id: 'sub_a282370101@wellrisk.kr',
        name: '김살핌',
        position: '총괄 슈퍼바이저',
        department: '통합돌봄사례관리팀',
        phone: '032-560-4001',
        assigned_bu_code: 'ALL',
        permissions: 'READ_WRITE',
        status: '활동중'
      },
      {
        uid: 'A-28-237-01-02',
        login_id: 'sub_a282370102@wellrisk.kr',
        name: '이살핌',
        position: '현장 배차 주임',
        department: '식사지원팀',
        phone: '032-560-4002',
        assigned_bu_code: 'ME',
        permissions: 'READ_WRITE',
        status: '활동중'
      }
    ];

    // 현재 사업단 담당 관리자 필터 (해당 사업단 코드 or ALL)
    const buAdmins = allAdmins.filter(a => {
      const code = a.assigned_bu_code || a.bu_code || 'ALL';
      return code === bu.code || code === 'ALL';
    });

    pane.innerHTML = `
      <div class="pwa-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h3 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0;">
              ${bu.name} 전담 관리자 및 실무 담당자 목록
            </h3>
            <p style="font-size: 12px; color: #64748b; margin: 0;">
              본 사업단 소속 안부대상자 및 살핌 활동가에 대한 읽기/쓰기 권한을 보유한 담당자 계정입니다.
            </p>
          </div>
          <button type="button" class="btn-action primary" id="btnAddAdminForThisBu" style="font-size: 12.5px; padding: 7px 16px; font-weight: 700;">
            + ${bu.name} 전담 관리자 추가
          </button>
        </div>

        <div class="table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th style="width: 50px;">순번</th>
                <th style="width: 140px;">관리자 식별자</th>
                <th style="width: 110px;">성명</th>
                <th style="width: 140px;">직책 / 부서</th>
                <th>로그인 ID</th>
                <th style="width: 120px;">연락처</th>
                <th style="width: 110px;">실무 권한</th>
                <th style="width: 110px;">담당 범위</th>
                <th style="width: 70px;">상태</th>
                <th style="width: 100px;">관리</th>
              </tr>
            </thead>
            <tbody>
              ${buAdmins.length === 0 ? `
                <tr>
                  <td colspan="10" style="text-align: center; color: #94a3b8; padding: 32px 0;">
                    등록된 [${bu.name}] 전담 관리자가 없습니다. 우측 상단 버튼을 눌러 담당 사회복지사 또는 실무자를 등록해 주십시오.
                  </td>
                </tr>
              ` : buAdmins.map((a, idx) => {
                const code = a.assigned_bu_code || 'ALL';
                const isDedicated = code === bu.code;
                const scopeBadge = isDedicated 
                  ? `<span class="sidebar-badge" style="background:#e0f2fe; color:#0369a1; font-weight:700;">${bu.name} 전담</span>`
                  : `<span class="sidebar-badge" style="background:#f1f5f9; color:#475569;">기관 전체 총괄</span>`;
                
                const perm = a.permissions || 'READ_WRITE';
                const permBadge = perm === 'READ'
                  ? `<span class="sidebar-badge" style="background:#e0f2fe; color:#0369a1; font-weight:700;">읽기 전용</span>`
                  : `<span class="sidebar-badge" style="background:#ecfdf5; color:#047857; font-weight:700;">읽기+쓰기</span>`;

                return `
                  <tr>
                    <td style="text-align: center; color: #64748b; font-weight: 700;">${idx + 1}</td>
                    <td style="font-family: monospace; font-size: 11.5px; color: #475569;">${a.uid}</td>
                    <td><strong>${a.name}</strong></td>
                    <td>${a.position || a.role || '-'}${a.department ? ` (${a.department})` : ''}</td>
                    <td style="font-size: 12px; color: #475569;">${a.login_id || a.loginId || '-'}</td>
                    <td>${a.phone || '-'}</td>
                    <td style="text-align: center;">${permBadge}</td>
                    <td style="text-align: center;">${scopeBadge}</td>
                    <td style="text-align: center;"><span class="grade-pill clean">${a.status || '활동중'}</span></td>
                    <td style="text-align: center;">
                      <button type="button" class="btn-table-sm" data-edit-bu-admin="${a.uid}">수정</button>
                      <button type="button" class="btn-table-sm" data-del-bu-admin="${a.uid}" style="color:#dc2626; border-color:#fca5a5;">삭제</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // 이벤트 바인딩
    const btnAdd = document.getElementById('btnAddAdminForThisBu');
    if (btnAdd) {
      btnAdd.onclick = () => {
        if (window.admin?.adminsPane) {
          window.admin.adminsPane.openAdminModal(null);
          const selBu = document.getElementById('selNewAdminBu');
          if (selBu) selBu.value = bu.code;
          const inpRole = document.getElementById('inpNewAdminRole');
          if (inpRole && !inpRole.value) inpRole.value = `${bu.name} 전담 매니저`;
          const inpDept = document.getElementById('inpNewAdminDept');
          if (inpDept && !inpDept.value) inpDept.value = bu.name;
        } else {
          notifier.toast('관리자 등록 모달을 로드할 수 없습니다.', 'warning');
        }
      };
    }

    // 수정 버튼
    pane.querySelectorAll('button[data-edit-bu-admin]').forEach(btn => {
      btn.onclick = () => {
        const uid = btn.dataset.editBuAdmin;
        const target = allAdmins.find(a => a.uid === uid);
        if (target && window.admin?.adminsPane) {
          window.admin.adminsPane.openAdminModal(target);
        }
      };
    });

    // 삭제 버튼
    pane.querySelectorAll('button[data-del-bu-admin]').forEach(btn => {
      btn.onclick = () => {
        const uid = btn.dataset.delBuAdmin;
        if (confirm(`해당 관리자 계정(${uid})을 정말 삭제하시겠습니까?`)) {
          if (window.admin?.adminsPane) {
            window.admin.adminsPane.admins = window.admin.adminsPane.admins.filter(a => a.uid !== uid);
            window.admin.adminsPane.renderAdmins();
            this.renderAdminsSubpane();
            notifier.toast('관리자 계정이 성공적으로 삭제되었습니다.', 'info');
          }
        }
      };
    });
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
        // D1 표준 UID 강제 적용: 사업단 코드가 포함된 정규 계층형 UID (U-28-237-01-{BU}-{순번3})
        let uid = (matched?.participant_uid || matched?.uid || '').trim();
        if (!uid || !uid.includes(`-${bu.code}-`)) {
          uid = `U-28-237-01-${bu.code}-${String(seq).padStart(3, '0')}`;
        }
        const phone = matched ? (matched.phone || matched.phoneMasked || '010-****-0000') : '-';
        const pair = matched ? (matched.team_code || matched.pair || '1조') : (wEntry.includes('조') ? wEntry : '미배정');
        const rawArea = matched ? (matched.assigned_areas || matched.area || '부평1·2동, 삼산동') : '부평1·2동, 삼산동';
        const area = (rawArea.includes('가좌') || rawArea.includes('석남')) ? '부평1·2동, 삼산동' : rawArea;
        const duty = matched ? `${matched.duty_days || '월,수,금'} (${matched.duty_hours || '09:00~12:00'})` : '정례 활동';
        const status = matched ? (matched.status || '활동중') : '활동중';

        return `
          <tr>
            <td style="text-align: center; font-weight: 700; color: #64748b;">${seq}</td>
            <td style="text-align: center; font-family: monospace; font-weight: 700; color: #0f172a; white-space: nowrap;">${uid}</td>
            <td style="white-space: nowrap;">
              <strong style="color: #0f172a; font-size: 13px;">${name}</strong>
            </td>
            <td style="color: #475569; font-size: 12.5px; text-align: center; font-family: monospace;">${phone}</td>
            <td style="font-weight: 600; color: #0f172a; text-align: center;">${pair}</td>
            <td style="color: #475569; font-size: 12px;">${area}</td>
            <td style="color: #64748b; font-size: 11.5px; text-align: center;">${duty}</td>
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
          <select class="filter-ctrl" id="selAssignExistingWorker" style="height: 34px; border-radius: 4px; min-width: 260px;">
            ${this.inspectors.map(ins => {
              const buCd = ins.bu_code || 'ME';
              let insUid = (ins.participant_uid || ins.uid || '').trim();
              if (!insUid || (!insUid.includes('-ME-') && !insUid.includes('-HE-') && !insUid.includes('-CL-') && !insUid.includes('-EM-'))) {
                insUid = `U-28-237-01-${buCd}-001`;
              }
              const buNm = ins.bu_name ? `[${ins.bu_name}] ` : '';
              return `<option value="${ins.name}">${buNm}${ins.name} (${insUid} / ${ins.team_code || '1조'} / ${ins.phone || ''})</option>`;
            }).join('')}
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
                <th style="width: 150px;">참여자 식별번호(UID)</th>
                <th style="width: 110px;">성명</th>
                <th style="width: 130px;">연락처</th>
                <th style="width: 130px;">담당 배정 조</th>
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
  async renderScheduleSubpane() {
    const pane = document.getElementById('buSubpaneSchedule');
    if (!pane) return;

    const bu = this.getActiveBu();
    if (!bu) return;

    const todayStr = new Date().toISOString().split('T')[0];

    // D1 API에서 해당 사업단의 실시간 일정/활동 내역 조회
    let d1Activities = [];
    try {
      const resp = await fetch(`/api/v1/business-units/${encodeURIComponent(bu.code)}/activities`);
      if (resp.ok) {
        const json = await resp.json();
        d1Activities = json.activities || [];
      }
    } catch (e) {
      console.warn('[buManagePane] D1 activities fetch error:', e);
      d1Activities = bu.schedules || [];
    }

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
    const schedList = d1Activities.length > 0 ? d1Activities : (bu.schedules || []);
    if (schedList.length === 0) {
      scheduleRowsHtml = `
        <div style="text-align: center; color: #94a3b8; padding: 36px 12px; font-size: 12.5px;">
          등록된 사업단 방문 및 서비스 활동 일정이 없습니다.
        </div>
      `;
    } else {
      scheduleRowsHtml = schedList.map((sched, idx) => {
        const schedId = sched.id || sched.activity_uid || `SCHED-${idx}`;
        const targetNm = sched.targetName || sched.target_name || sched.targetUid;
        const schedDate = sched.date || sched.activity_date || '';
        const schedTime = sched.time || `${sched.start_time || ''} ~ ${sched.end_time || ''}`;
        const workers = Array.isArray(sched.workerNames) ? sched.workerNames.join(', ') : (sched.worker || '담당 참여자');
        const actContent = sched.content || sched.memo || sched.activityType || '정례 사업단 지원 서비스';
        const isScheduled = sched.status === '예정';

        return `
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 6px;">
            <div style="display: flex; flex-direction: column; gap: 3px;">
              <div style="font-size: 13px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 11px; padding: 2px 6px; border-radius: 3px; font-weight: 800; ${isScheduled ? 'background: #dcfce7; color: #15803d; border: 1px solid #86efac;' : 'background: #f1f5f9; color: #475569;'}">
                  ${isScheduled ? '예정' : '완료'}
                </span>
                <strong>${targetNm} 어르신</strong>: ${schedDate} ${schedTime}
                <span style="font-family: monospace; font-size: 10.5px; color: #94a3b8; font-weight: 500;">[${schedId}]</span>
              </div>
              <div style="font-size: 11.5px; color: #64748b;">
                담당 참여자: <strong>${workers}</strong> | 내용: ${actContent}
              </div>
            </div>
            <button type="button" class="btn-action secondary btn-delete-bu-sched" data-act-id="${schedId}" style="padding: 4px 10px; font-size: 11px; color: #dc2626; border-color: #fecaca; background: #fff;">
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

    // 일정 등록 완료 이벤트 (D1 Master 직결 및 대상자 원장 실시간 동기화)
    const btnSubmit = document.getElementById('btnSubmitSchedForm');
    if (btnSubmit) {
      btnSubmit.onclick = async () => {
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
        const targetAge = target ? target.age : 74;
        const targetGender = target ? target.gender : '남';

        // 1. D1 bu_activities API로 활동 일정 영구 적재
        try {
          const resp = await fetch(`/api/v1/business-units/${encodeURIComponent(bu.code)}/activities`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetUid,
              targetName,
              targetAge,
              targetGender,
              date,
              time,
              worker,
              activityType: `${bu.name} 방문 서비스`,
              memo: memo || '정례 사업단 지원 서비스'
            })
          });

          if (resp.ok) {
            const result = await resp.json();
            const actUid = result.activity?.id || 'ACT-28-237-01';

            // 2. 대상자 마스터 객체 차기 일정 속성 즉시 동기화
            if (target) {
              target.nextScheduleDate = date;
              target.nextScheduleTime = time;
              target.nextScheduleInspector = worker;
              target.nextScheduleBu = bu.code;
            }

            notifier.toast(`[${targetName}] 어르신의 [${bu.name}] 일정이 등록되었습니다. (${actUid})`, 'success');
            await this.renderScheduleSubpane();
          } else {
            notifier.toast('일정 등록에 실패했습니다.', 'error');
          }
        } catch (err) {
          console.error('[buManagePane] D1 일정 등록 에러:', err);
          notifier.toast('서버 통신 오류가 발생했습니다.', 'error');
        }
      };
    }

    // 일정 삭제 이벤트 (D1 Master 직결)
    pane.querySelectorAll('.btn-delete-bu-sched').forEach(btn => {
      btn.onclick = async (e) => {
        const actId = e.currentTarget.dataset.actId;
        if (!actId) return;

        if (confirm(`해당 사업단 활동 일정 [${actId}]을 삭제하시겠습니까?`)) {
          try {
            const resp = await fetch(`/api/v1/activities/${encodeURIComponent(actId)}`, {
              method: 'DELETE'
            });
            if (resp.ok) {
              notifier.toast('일정이 D1 원장에서 삭제되었습니다.', 'info');
              await this.renderScheduleSubpane();
            } else {
              notifier.toast('일정 삭제에 실패했습니다.', 'error');
            }
          } catch (err) {
            console.error('[buManagePane] D1 일정 삭제 에러:', err);
            notifier.toast('서버 통신 오류가 발생했습니다.', 'error');
          }
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
    const selCategory = document.getElementById('selBuCategory');
    const inpCategoryCustom = document.getElementById('inpBuCategoryCustom');
    const inpManager = document.getElementById('inpBuManager');
    const inpPhone = document.getElementById('inpBuPhone');
    const inpQuota = document.getElementById('inpBuTargetQuota');
    const inpDesc = document.getElementById('inpBuDesc');

    if (title) title.textContent = '신규 전담 사업단 추가';
    if (editIdx) editIdx.value = '-1';
    if (inpName) inpName.value = '';
    if (inpCode) { inpCode.value = ''; inpCode.disabled = false; }
    if (selCategory) selCategory.value = '식사지원';
    if (inpCategoryCustom) { inpCategoryCustom.value = ''; inpCategoryCustom.style.display = 'none'; }
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
    const selCatVal = document.getElementById('selBuCategory')?.value || '기타돌봄';
    const customCatVal = document.getElementById('inpBuCategoryCustom')?.value.trim();
    const category = (selCatVal === 'custom') ? (customCatVal || '기타 특화돌봄') : selCatVal;
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

  /**
   * 3-5. 하위 5: 활동관리 (실시간 현장 활동 내역, 선택 인쇄 및 페이지네이션)
   */
  async renderActivitySubpane() {
    const pane = document.getElementById('buSubpaneActivity');
    if (!pane) return;

    const bu = this.getActiveBu();
    if (!bu) return;

    const today = getLocalTodayString();
    const currentYearMonth = today.slice(0, 7); // 'YYYY-MM'

    // 서버 API 호출로 실시간 활동 내역 로드
    let activities = [];
    try {
      const res = await OrgAdminApi.getBuActivities(bu.code);
      if (res && res.activities) {
        activities = res.activities;
      }
    } catch (e) {
      console.warn('[buManagePane] 활동 내역 API 로드 오류, 기본 모의 저장소 연동:', e);
      activities = [];
    }

    // 4대 핵심 통계 실측 집계
    const totalAssignedRecipients = (bu.currentRecipients !== undefined) ? bu.currentRecipients : (bu.assignedWorkers?.length ? bu.assignedWorkers.length * 2 : 0);
    const completedThisMonth = activities.filter(a => a.status === '완료' && (a.date || '').startsWith(currentYearMonth)).length;
    const todayActivities = activities.filter(a => a.date === today).length;
    const unmetActivities = activities.filter(a => a.status.includes('불가')).length;

    pane.innerHTML = `
      <div style="margin: 12px 0 24px 0;">
        <!-- 1. 활동 실적 통계 요약 바 (단정하고 슬림한 1줄 바) -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px 16px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; color: #475569;">
          <div>
            <span style="font-weight: 700; color: #0f172a;">활동 실적 현황:</span>
            <span style="margin: 0 8px; color: #cbd5e1;">|</span>
            <span>총 배정 가구수: <strong style="color: #0f172a;">${totalAssignedRecipients}</strong>가구</span>
            <span style="margin: 0 8px; color: #cbd5e1;">|</span>
            <span>금월 활동 완료: <strong style="color: #0f172a;">${completedThisMonth}</strong>건</span>
            <span style="margin: 0 8px; color: #cbd5e1;">|</span>
            <span>금일 활동: <strong style="color: #0f172a;">${todayActivities}</strong>건</span>
            <span style="margin: 0 8px; color: #cbd5e1;">|</span>
            <span>상담 불가(부재 등): <strong style="color: #0f172a;">${unmetActivities}</strong>건</span>
          </div>
          <div style="font-size: 11.5px; color: #64748b;">
            기준일자: ${today}
          </div>
        </div>

        <!-- 2. 필터 검색 바 -->
        <div class="filter-search-bar" style="margin-bottom: 10px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
          <div class="filter-item">
            <span>진행상태:</span>
            <select class="filter-ctrl" id="selActStatusFilter" style="height: 34px;">
              <option value="all">전체 상태</option>
              <option value="완료">활동 완료</option>
              <option value="today">금일 활동</option>
              <option value="불가">상담 불가(부재 등)</option>
            </select>
          </div>
          <div class="filter-item">
            <span>성명 검색:</span>
            <input type="text" class="filter-ctrl" id="inpActSearchKeyword" placeholder="참여자 또는 대상자 검색" style="width: 175px; height: 34px;">
          </div>
          <div class="filter-item">
            <span>기간:</span>
            <input type="date" class="filter-ctrl" id="inpActStartDate" style="height: 34px; width: 130px;">
            <span style="color: #94a3b8;">~</span>
            <input type="date" class="filter-ctrl" id="inpActEndDate" style="height: 34px; width: 130px;">
          </div>
          <button type="button" class="btn-action secondary" id="btnResetActFilter" style="height: 34px; font-size: 12px;">초기화</button>
        </div>

        <!-- 2-1. 금연점검 & 전사 v06 표준 상단 컨트롤 및 인쇄 액션 바 -->
        <div class="action-buttons-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 14px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 13px; color: #475569; font-weight: 600;">조회: <strong id="lblActFilteredCount" style="color: #0f172a;">${activities.length}</strong> 건</span>
            <select id="selActTopPageSize" class="filter-ctrl" style="height: 30px; font-size: 12px; padding: 2px 8px; border-radius: 4px;">
              <option value="10" ${this.actPagination.pageSize === 10 ? 'selected' : ''}>10개씩 보기</option>
              <option value="20" ${this.actPagination.pageSize === 20 ? 'selected' : ''}>20개씩 보기</option>
              <option value="50" ${this.actPagination.pageSize === 50 ? 'selected' : ''}>50개씩 보기</option>
            </select>
            <label style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #334155; font-weight: 600; cursor: pointer; user-select: none; margin-left: 4px;">
              <input type="checkbox" id="chkTopHideTargetUid" ${this.hideActUid ? 'checked' : ''} style="width: 15px; height: 15px; cursor: pointer; accent-color: #0f172a;" />
              <span>관리번호 숨김</span>
            </label>
          </div>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn-action secondary" id="btnPrintSelectedActs" style="height: 32px; font-size: 12px; font-weight: 700;">선택 인쇄</button>
            <button type="button" class="btn-action primary" id="btnPrintTodayActReport" style="height: 32px; font-size: 12px; font-weight: 700; background: #0f172a;">활동 보고서 인쇄</button>
          </div>
        </div>

        <!-- 3. 실시간 현장 활동 내역 테이블 (대상 어르신 / 관리번호 분리 컬럼) -->
        <div class="table-wrapper" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; overflow-x: auto;">
          <table class="admin-table">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;"><input type="checkbox" id="chkAllBuActs"></th>
                <th style="width: 50px;">순번</th>
                <th style="width: 95px;">활동일자</th>
                <th style="width: 130px;">대상 어르신</th>
                <th id="thBuActUidCol" style="width: 140px; ${this.hideActUid ? 'display: none;' : ''}">관리번호</th>
                <th style="width: 120px;">담당 참여자</th>
                <th>활동 유형</th>
                <th style="width: 120px;">활동 시간(근태연동)</th>
                <th style="width: 85px;">상태</th>
                <th style="width: 65px;">상세</th>
              </tr>
            </thead>
            <tbody id="tbodyBuActivities">
              <!-- Rendered by JS -->
            </tbody>
          </table>
        </div>

        <!-- 4. 하단 표준 페이지네이션 바 -->
        <div id="buActPagination" class="table-pagination-footer" style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;"></div>
      </div>
    `;

    // 테이블 렌더링 함수
    const renderTable = () => {
      const tbody = document.getElementById('tbodyBuActivities');
      if (!tbody) return;

      const stFilter = document.getElementById('selActStatusFilter')?.value || 'all';
      const kwFilter = (document.getElementById('inpActSearchKeyword')?.value || '').trim().toLowerCase();
      const sDate = document.getElementById('inpActStartDate')?.value || '';
      const eDate = document.getElementById('inpActEndDate')?.value || '';

      let filtered = activities;

      // 상태 필터
      if (stFilter === '완료') {
        filtered = filtered.filter(a => a.status === '완료');
      } else if (stFilter === 'today') {
        filtered = filtered.filter(a => a.date === today);
      } else if (stFilter === '불가') {
        filtered = filtered.filter(a => a.status.includes('불가'));
      }

      // 성명 검색 (참여자 또는 대상자)
      if (kwFilter) {
        filtered = filtered.filter(a => {
          const tName = (a.targetName || '').toLowerCase();
          const tUid = (a.targetUid || '').toLowerCase();
          const wNames = (a.workerNames || []).join(' ').toLowerCase();
          return tName.includes(kwFilter) || tUid.includes(kwFilter) || wNames.includes(kwFilter);
        });
      }

      // 기간 필터
      if (sDate) filtered = filtered.filter(a => (a.date || '') >= sDate);
      if (eDate) filtered = filtered.filter(a => (a.date || '') <= eDate);

      const totalItems = filtered.length;
      const pageSize = this.actPagination.pageSize;
      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
      if (this.actPagination.currentPage > totalPages) {
        this.actPagination.currentPage = totalPages;
      }
      const startIndex = (this.actPagination.currentPage - 1) * pageSize;
      const paged = filtered.slice(startIndex, startIndex + pageSize);

      // 하단 페이지네이션 바 렌더링
      this.renderActPagination(totalItems, totalPages, renderTable);

      // 상단 조회 건수 동기화
      const lblCount = document.getElementById('lblActFilteredCount');
      if (lblCount) {
        lblCount.textContent = totalItems;
      }

      // 테이블 헤더 '관리번호' 컬럼 숨김/보임 동기화
      const thUidCol = document.getElementById('thBuActUidCol');
      if (thUidCol) {
        thUidCol.style.display = this.hideActUid ? 'none' : '';
      }

      if (filtered.length === 0) {
        const colSpan = this.hideActUid ? 9 : 10;
        tbody.innerHTML = `
          <tr>
            <td colspan="${colSpan}" style="padding: 32px 0; color: #94a3b8; text-align: center;">
              조건에 부합하는 현장 활동 내역이 없습니다.
            </td>
          </tr>
        `;
        return;
      }

      const canReadWrite = RbacService.canWrite();

      tbody.innerHTML = paged.map((a, idx) => {
        // 관리번호 권한별 마스킹
        let dispUid = a.targetUid || '-';
        if (!canReadWrite && a.targetUid) {
          const parts = String(a.targetUid).split('-');
          dispUid = (parts.length >= 5) ? `${parts[0]}-**-***-**-${parts[4]}` : 'C-**-***-**-****';
        }

        const isComplete = a.status === '완료';
        const badgeStyle = isComplete
          ? 'background: #f8fafc; color: #16a34a; border: 1px solid #cbd5e1; font-weight: 700;'
          : 'background: #f8fafc; color: #dc2626; border: 1px solid #cbd5e1; font-weight: 700;'

        const workerDisplay = Array.isArray(a.workerNames) ? a.workerNames.join(', ') : (a.workerNames || '-');
        const isChecked = this.selectedActIds.has(a.id);
        const uidCell = this.hideActUid
          ? ''
          : `<td class="col-bu-act-uid" style="font-family: monospace; font-size: 11.5px; font-weight: 700; color: #0f172a; text-align: center;">${dispUid}</td>`;

        return `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="text-align: center;">
              <input type="checkbox" class="chk-bu-act-item" value="${a.id}" ${isChecked ? 'checked' : ''}>
            </td>
            <td style="color: #64748b; font-weight: 700; text-align: center;">${startIndex + idx + 1}</td>
            <td style="font-size: 11.5px; color: #0f172a; font-weight: 600;">${a.date}</td>
            <td>
              <strong style="color: #0f172a;">${a.targetName}</strong>
              <span style="font-size: 11px; color: #64748b; margin-left: 2px;">(${a.targetGender || '미상'}/${a.targetAge || ''}세)</span>
            </td>
            ${uidCell}
            <td style="font-size: 11.5px; color: #334155;">${workerDisplay}</td>
            <td style="font-size: 12px; color: #0f172a; text-align: left;">
              ${a.activityType}
              ${a.unmetReason ? `<div style="font-size: 11px; color: #dc2626; margin-top: 2px;">사유: ${a.unmetReason}</div>` : ''}
            </td>
            <td style="font-size: 11.5px; color: #475569; font-family: monospace;">${a.time}</td>
            <td>
              <span style="font-size: 11px; padding: 2px 8px; border-radius: 3px; ${badgeStyle}">
                ${a.status}
              </span>
            </td>
            <td>
              <button type="button" class="btn-table-sm btn-view-bu-act" data-act-id="${a.id}" style="font-size: 11px; padding: 2px 8px;">
                상세
              </button>
            </td>
          </tr>
        `;
      }).join('');

      // 전체 선택 체크박스 동기화
      const chkAll = document.getElementById('chkAllBuActs');
      if (chkAll) {
        chkAll.checked = paged.length > 0 && paged.every(a => this.selectedActIds.has(a.id));
        chkAll.onchange = (e) => {
          const checked = e.target.checked;
          paged.forEach(a => {
            if (checked) this.selectedActIds.add(a.id);
            else this.selectedActIds.delete(a.id);
          });
          renderTable();
        };
      }

      // 개별 체크박스 이벤트 바인딩
      tbody.querySelectorAll('.chk-bu-act-item').forEach(chk => {
        chk.onchange = (e) => {
          const id = e.target.value;
          if (e.target.checked) this.selectedActIds.add(id);
          else this.selectedActIds.delete(id);
          if (chkAll) chkAll.checked = paged.every(a => this.selectedActIds.has(a.id));
        };
      });

      // 상세 버튼 이벤트 바인딩
      tbody.querySelectorAll('.btn-view-bu-act').forEach(btn => {
        btn.onclick = () => {
          const actId = btn.dataset.actId;
          const targetAct = activities.find(a => a.id === actId);
          if (targetAct) {
            this.openActivityDetailModal(targetAct, bu, () => this.renderActivitySubpane());
          }
        };
      });
    };

    // 필터 이벤트 바인딩
    const selStatus = document.getElementById('selActStatusFilter');
    const inpKw = document.getElementById('inpActSearchKeyword');
    const inpStart = document.getElementById('inpActStartDate');
    const inpEnd = document.getElementById('inpActEndDate');
    const btnReset = document.getElementById('btnResetActFilter');
    const btnPrintSelected = document.getElementById('btnPrintSelectedActs');
    const btnPrintTodayReport = document.getElementById('btnPrintTodayActReport');

    const triggerSearch = () => {
      this.actPagination.currentPage = 1;
      renderTable();
    };

    if (selStatus) selStatus.onchange = triggerSearch;
    if (inpKw) inpKw.oninput = triggerSearch;
    if (inpStart) inpStart.onchange = triggerSearch;
    if (inpEnd) inpEnd.onchange = triggerSearch;

    if (btnReset) {
      btnReset.onclick = () => {
        if (selStatus) selStatus.value = 'all';
        if (inpKw) inpKw.value = '';
        if (inpStart) inpStart.value = '';
        if (inpEnd) inpEnd.value = '';
        this.selectedActIds.clear();
        this.actPagination.currentPage = 1;
        renderTable();
        notifier.toast('필터가 초기화되었습니다.', 'info');
      };
    }

    // 상단 [보기 개수] 셀렉트 (금연점검 & v06 표준)
    const selTopPageSize = document.getElementById('selActTopPageSize');
    if (selTopPageSize) {
      selTopPageSize.onchange = (e) => {
        this.actPagination.pageSize = parseInt(e.target.value, 10);
        this.actPagination.currentPage = 1;
        renderTable();
      };
    }

    // 상단 [관리번호 숨김] 체크박스 (금연점검 & v06 표준)
    const chkTopHide = document.getElementById('chkTopHideTargetUid');
    if (chkTopHide) {
      chkTopHide.onchange = (e) => {
        this.hideActUid = e.target.checked;
        renderTable();
      };
    }

    // 상단 [선택 인쇄]
    if (btnPrintSelected) {
      btnPrintSelected.onclick = () => {
        const selectedList = activities.filter(a => this.selectedActIds.has(a.id));
        if (selectedList.length === 0) {
          notifier.toast('인쇄할 활동 항목을 먼저 선택해 주십시오.', 'warning');
          return;
        }
        this.printActivityBatchReport(selectedList, bu, '선택 활동 내역 보고서');
      };
    }

    // 상단 [활동 보고서 인쇄] (금일 활동 보고서 종합 출력)
    if (btnPrintTodayReport) {
      btnPrintTodayReport.onclick = () => {
        const todayList = activities.filter(a => a.date === today);
        const targetList = todayList.length > 0 ? todayList : activities;
        const subTitle = todayList.length > 0 ? `금일 활동 종합 보고서 (${today})` : `사업단 활동 종합 보고서`;
        this.printActivityBatchReport(targetList, bu, subTitle);
      };
    }

    renderTable();
  }

  /**
   * 활동관리 하단 표준 페이지네이션 바
   */
  renderActPagination(totalItems, totalPages, onPageChange) {
    const container = document.getElementById('buActPagination');
    if (!container) return;

    if (totalItems === 0) {
      container.innerHTML = '';
      return;
    }

    const { currentPage, pageSize } = this.actPagination;
    const startNum = (currentPage - 1) * pageSize + 1;
    const endNum = Math.min(totalItems, currentPage * pageSize);

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }

    const pageButtons = [];
    for (let p = startPage; p <= endPage; p++) {
      pageButtons.push(`
        <button type="button" class="page-btn ${p === currentPage ? 'active' : ''}" data-act-page="${p}" style="min-width: 28px; height: 28px; font-size: 12px; border: 1px solid #cbd5e1; background: ${p === currentPage ? '#0f172a' : '#ffffff'}; color: ${p === currentPage ? '#ffffff' : '#334155'}; font-weight: ${p === currentPage ? '800' : '600'}; border-radius: 3px; cursor: pointer;">
          ${p}
        </button>
      `);
    }

    container.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; gap: 16px; width: 100%; min-height: 42px; margin: 12px 0;">
        <span style="font-size: 12px; color: #64748b; font-weight: 600;">
          총 <strong>${totalItems}</strong>건 (${startNum}~${endNum} 표시)
        </span>
        <div class="table-pagination-nav" style="display: flex; align-items: center; gap: 4px;">
          <button type="button" class="page-btn" id="btnActPageFirst" ${currentPage === 1 ? 'disabled' : ''} style="min-width: 28px; height: 28px; font-size: 12px; border: 1px solid #cbd5e1; background: #ffffff; border-radius: 3px; cursor: pointer;">«</button>
          <button type="button" class="page-btn" id="btnActPagePrev" ${currentPage === 1 ? 'disabled' : ''} style="min-width: 28px; height: 28px; font-size: 12px; border: 1px solid #cbd5e1; background: #ffffff; border-radius: 3px; cursor: pointer;">‹</button>
          ${pageButtons.join('')}
          <button type="button" class="page-btn" id="btnActPageNext" ${currentPage === totalPages ? 'disabled' : ''} style="min-width: 28px; height: 28px; font-size: 12px; border: 1px solid #cbd5e1; background: #ffffff; border-radius: 3px; cursor: pointer;">›</button>
          <button type="button" class="page-btn" id="btnActPageLast" ${currentPage === totalPages ? 'disabled' : ''} style="min-width: 28px; height: 28px; font-size: 12px; border: 1px solid #cbd5e1; background: #ffffff; border-radius: 3px; cursor: pointer;">»</button>
        </div>
      </div>
    `;

    container.querySelectorAll('.page-btn[data-act-page]').forEach(btn => {
      btn.onclick = () => {
        this.actPagination.currentPage = parseInt(btn.getAttribute('data-act-page'), 10);
        onPageChange();
      };
    });

    const btnFirst = container.querySelector('#btnActPageFirst');
    const btnPrev = container.querySelector('#btnActPagePrev');
    const btnNext = container.querySelector('#btnActPageNext');
    const btnLast = container.querySelector('#btnActPageLast');

    if (btnFirst) btnFirst.onclick = () => { this.actPagination.currentPage = 1; onPageChange(); };
    if (btnPrev) btnPrev.onclick = () => { if (this.actPagination.currentPage > 1) { this.actPagination.currentPage--; onPageChange(); } };
    if (btnNext) btnNext.onclick = () => { if (this.actPagination.currentPage < totalPages) { this.actPagination.currentPage++; onPageChange(); } };
    if (btnLast) btnLast.onclick = () => { this.actPagination.currentPage = totalPages; onPageChange(); };
  }

  /**
   * 상단 활동 보고서 일괄 인쇄 (A4 공공기관 공식 보고서 서식)
   */
  printActivityBatchReport(actList, bu, reportTitle) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      notifier.toast('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해 주십시오.', 'warning');
      return;
    }

    const today = getLocalTodayString();
    const canReadWrite = RbacService.canWrite();

    const tableRows = actList.map((a, idx) => {
      let dispUid = a.targetUid || '-';
      if (!canReadWrite && a.targetUid) {
        const parts = String(a.targetUid).split('-');
        dispUid = (parts.length >= 5) ? `${parts[0]}-**-***-**-${parts[4]}` : 'C-**-***-**-****';
      }
      const workerDisplay = Array.isArray(a.workerNames) ? a.workerNames.join(', ') : (a.workerNames || '-');

      return `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="text-align: center;">${a.date}</td>
          <td><strong>${a.targetName}</strong> <span style="font-family: monospace; font-size: 11px;">(${dispUid})</span></td>
          <td>${workerDisplay}</td>
          <td>${a.activityType}</td>
          <td style="font-family: monospace; text-align: center;">${a.time}</td>
          <td style="text-align: center;"><strong>${a.status}</strong></td>
          <td style="font-size: 11px;">${a.content || a.unmetReason || '-'}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>${reportTitle} - ${bu.name}</title>
        <style>
          @page { size: A4 landscape; margin: 15mm 12mm; }
          body { font-family: Pretendard, 'Malgun Gothic', sans-serif; color: #0f172a; margin: 0; padding: 15px; font-size: 12px; line-height: 1.5; }
          .report-header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 15px; }
          .report-title { font-size: 18px; font-weight: 800; margin: 0 0 4px 0; }
          .report-subtitle { font-size: 11.5px; color: #64748b; margin: 0; }
          .summary-info { display: flex; justify-content: space-between; font-size: 11.5px; color: #475569; margin-bottom: 8px; font-weight: 600; }
          table.report-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          table.report-table th, table.report-table td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; }
          table.report-table th { background: #f8fafc; color: #334155; font-weight: 700; text-align: center; }
          .footer-sign { margin-top: 24px; text-align: right; font-size: 11.5px; color: #475569; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h1 class="report-title">${reportTitle}</h1>
          <p class="report-subtitle">인천광역시 부평구 통합돌봄센터 | 소속 사업단: ${bu.name} (${bu.code})</p>
        </div>

        <div class="summary-info">
          <span>총 출력 건수: <strong>${actList.length}</strong>건</span>
          <span>출력 일시: ${today} | 담당 관리자: ${bu.manager || '담당자'}</span>
        </div>

        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 35px;">순번</th>
              <th style="width: 75px;">활동일자</th>
              <th style="width: 140px;">대상 어르신(관리번호)</th>
              <th style="width: 100px;">담당 참여자</th>
              <th style="width: 130px;">활동 유형</th>
              <th style="width: 90px;">활동시간</th>
              <th style="width: 60px;">상태</th>
              <th>현장 활동 내용 및 특이사항</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="footer-sign">
          <p>위와 같이 사업단 현장 안심살핌 활동 실적을 공식 보고합니다.</p>
          <p style="margin-top: 14px; font-weight: 700; font-size: 12px;">인천광역시 부평구 통합돌봄센터 사업단장 (직인생략)</p>
        </div>

        <script>
          window.onload = () => {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  /**
   * 현장 활동 상세 모달 열기 및 인쇄 연동
   */
  openActivityDetailModal(act, bu, onUpdated) {
    const modal = document.getElementById('modalBuActivityDetail');
    const body = document.getElementById('bodyBuActivityDetail');
    if (!modal || !body) return;

    const canReadWrite = RbacService.canWrite();
    let dispUid = act.targetUid || '-';
    if (!canReadWrite && act.targetUid) {
      const parts = String(act.targetUid).split('-');
      dispUid = (parts.length >= 5) ? `${parts[0]}-**-***-**-${parts[4]}` : 'C-**-***-**-****';
    }

    const workerDisplay = Array.isArray(act.workerNames) ? act.workerNames.join(', ') : (act.workerNames || '-');

    body.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px 18px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; font-size: 12.5px;">
            <div><span style="color: #64748b; font-weight: 600;">활동 일자:</span> <strong style="color: #0f172a;">${act.date}</strong></div>
            <div><span style="color: #64748b; font-weight: 600;">활동 시간(근태):</span> <strong style="color: #0f172a; font-family: monospace;">${act.time}</strong></div>
            <div><span style="color: #64748b; font-weight: 600;">대상 어르신:</span> <strong>${act.targetName}</strong> <span style="font-size: 11px; color: #64748b;">(${dispUid})</span></div>
            <div><span style="color: #64748b; font-weight: 600;">소속 사업단:</span> <strong>${bu.name} (${bu.code})</strong></div>
            <div style="grid-column: span 2;"><span style="color: #64748b; font-weight: 600;">담당 참여자:</span> <strong style="color: #0f172a;">${workerDisplay}</strong></div>
            <div style="grid-column: span 2;"><span style="color: #64748b; font-weight: 600;">활동 유형:</span> <strong style="color: #0f172a;">${act.activityType}</strong></div>
            <div style="grid-column: span 2;"><span style="color: #64748b; font-weight: 600;">진행 상태:</span> <strong style="color: ${act.status === '완료' ? '#16a34a' : '#dc2626'};">${act.status}</strong> ${act.unmetReason ? `<span style="font-size: 11.5px; color: #dc2626; margin-left: 6px;">(사유: ${act.unmetReason})</span>` : ''}</div>
          </div>
        </div>

        <div>
          <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">현장 활동 및 상담 내용</label>
          <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 12px; font-size: 12.5px; line-height: 1.6; color: #1e293b; min-height: 60px;">
            ${act.content || '내용 없음'}
          </div>
        </div>

        ${act.specialNotes ? `
          <div>
            <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">특이사항 및 전달사항</label>
            <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px 12px; font-size: 12px; line-height: 1.5; color: #334155;">
              ${act.specialNotes}
            </div>
          </div>
        ` : ''}

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px;">
          <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">관리자 확인 점검</div>
          <label style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 700; color: #0f172a; cursor: pointer; margin-bottom: 8px;">
            <input type="checkbox" id="chkActivityConfirmed" ${act.isConfirmed ? 'checked' : ''} style="width: 16px; height: 16px;">
            활동 내역 검수 및 확인 완료
          </label>
          <input type="text" class="filter-ctrl" id="inpActivityAdminMemo" placeholder="관리자 검수 의견 또는 조치사항 입력" value="${act.adminMemo || ''}" style="width: 100%; height: 34px;">
        </div>
      </div>
    `;

    modal.classList.add('active');

    // 닫기 이벤트
    const btnClose = document.getElementById('btnCloseActivityDetailModal');
    const btnCancel = document.getElementById('btnCancelActivityDetail');
    const closeModal = () => modal.classList.remove('active');
    if (btnClose) btnClose.onclick = closeModal;
    if (btnCancel) btnCancel.onclick = closeModal;

    // 인쇄 버튼 이벤트
    const btnPrint = document.getElementById('btnPrintActivityDetail');
    if (btnPrint) {
      btnPrint.onclick = () => this.printActivityReport(act, bu, dispUid, workerDisplay);
    }

    // 확인 상태 저장 버튼 이벤트 (서버 API 호출)
    const btnSave = document.getElementById('btnSaveActivityConfirm');
    if (btnSave) {
      btnSave.onclick = async () => {
        const isConfirmed = document.getElementById('chkActivityConfirmed')?.checked || false;
        const adminMemo = (document.getElementById('inpActivityAdminMemo')?.value || '').trim();

        try {
          await OrgAdminApi.updateActivityStatus(act.id, { isConfirmed, adminMemo });
          act.isConfirmed = isConfirmed;
          act.adminMemo = adminMemo;
          notifier.toast('관리자 확인 상태가 성공적으로 저장되었습니다.', 'success');
          closeModal();
          if (onUpdated) onUpdated();
        } catch (e) {
          notifier.toast('확인 상태 저장 중 오류가 발생했습니다.', 'error');
        }
      };
    }
  }

  /**
   * 활동 보고서 A4 공식 인쇄 서식 출력
   */
  printActivityReport(act, bu, dispUid, workerDisplay) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      notifier.toast('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해 주십시오.', 'warning');
      return;
    }

    const today = getLocalTodayString();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>현장 활동 일지 및 결과 보고서 - ${act.targetName}</title>
        <style>
          @page { size: A4 portrait; margin: 18mm 15mm; }
          body { font-family: Pretendard, 'Malgun Gothic', sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 13px; line-height: 1.6; }
          .report-header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .report-title { font-size: 20px; font-weight: 800; margin: 0 0 6px 0; }
          .report-subtitle { font-size: 12px; color: #64748b; margin: 0; }
          table.report-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          table.report-table th, table.report-table td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 12px; }
          table.report-table th { background: #f8fafc; color: #334155; font-weight: 700; text-align: left; width: 22%; }
          .content-box { border: 1px solid #cbd5e1; padding: 12px 14px; min-height: 120px; font-size: 12.5px; white-space: pre-wrap; margin-bottom: 16px; }
          .footer-sign { margin-top: 36px; text-align: right; font-size: 12px; color: #475569; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h1 class="report-title">현장 안심살핌 활동 일지 및 결과 보고서</h1>
          <p class="report-subtitle">인천광역시 부평구 통합돌봄센터 | 소속 사업단: ${bu.name} (${bu.code})</p>
        </div>

        <table class="report-table">
          <tr>
            <th>문서 관리번호</th>
            <td style="font-family: monospace;">${act.id}</td>
            <th>출력 일자</th>
            <td>${today}</td>
          </tr>
          <tr>
            <th>활동 일자</th>
            <td><strong>${act.date}</strong></td>
            <th>활동 시간(근태)</th>
            <td style="font-family: monospace;">${act.time}</td>
          </tr>
          <tr>
            <th>수혜 대상 어르신</th>
            <td><strong>${act.targetName}</strong> (${act.targetGender || '미상'}/${act.targetAge || ''}세)</td>
            <th>어르신 관리번호</th>
            <td style="font-family: monospace;">${dispUid}</td>
          </tr>
          <tr>
            <th>담당 참여자(살핌단)</th>
            <td><strong>${workerDisplay}</strong></td>
            <th>진행 상태</th>
            <td><strong>${act.status}</strong> ${act.unmetReason ? `(${act.unmetReason})` : ''}</td>
          </tr>
          <tr>
            <th>활동 유형</th>
            <td colspan="3">${act.activityType}</td>
          </tr>
        </table>

        <div style="font-weight: 700; font-size: 13px; margin-bottom: 6px;">1. 현장 활동 및 상담 상세 내역</div>
        <div class="content-box">${act.content || '내용 없음'}</div>

        ${act.specialNotes ? `
          <div style="font-weight: 700; font-size: 13px; margin-bottom: 6px;">2. 특이사항 및 조치 연계 내용</div>
          <div class="content-box" style="min-height: 60px;">${act.specialNotes}</div>
        ` : ''}

        <div style="font-weight: 700; font-size: 13px; margin-bottom: 6px;">3. 사업단 관리자 검수 및 확인</div>
        <table class="report-table">
          <tr>
            <th>확인 여부</th>
            <td><strong>${act.isConfirmed ? '검수 완료 (승인)' : '확인 대기'}</strong></td>
            <th>확인자</th>
            <td>${bu.manager || '담당 관리자'}</td>
          </tr>
          <tr>
            <th>관리자 의견</th>
            <td colspan="3">${act.adminMemo || '특이사항 없음'}</td>
          </tr>
        </table>

        <div class="footer-sign">
          <p>위와 같이 현장 살핌 활동 사항을 공식 보고합니다.</p>
          <p style="margin-top: 18px; font-weight: 700; font-size: 13px;">인천광역시 부평구 통합돌봄센터 사업단장 (직인생략)</p>
        </div>

        <script>
          window.onload = () => {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
}
