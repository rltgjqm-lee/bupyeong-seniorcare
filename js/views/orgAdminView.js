/**
 * @file orgAdminView.js
 * @description 참여기관 관리자 포털 메인 컨트롤러 (5대 계층형 메뉴 & 우측 액션 기능 완비) (ESM)
 */

import { ScoringEngine } from '../core/scoringEngine.js';
import { UidEngine } from '../core/uid.js';
import { notifier } from '../utils/notifier.js';
import { maskPhone, maskAddress, maskUid, maskName, maskBirth } from '../utils/mask.js';
import { SurveyApi, SUBMITTED_SURVEYS_KEY } from '../api/surveyApi.js';
import { OrgAdminApi } from '../api/orgAdminApi.js';
import { OrgBasicPane } from './panes/orgBasicPane.js';
import { AdminsPane } from './panes/adminsPane.js';
import { InspectorsPane } from './panes/inspectorsPane.js';
import { MyInfoPane } from './panes/myInfoPane.js';
import { TargetListPane } from './panes/targetListPane.js';
import { TargetMapPane } from './panes/targetMapPane.js';
import { TargetCreatePane } from './panes/targetCreatePane.js';
import { SchedulePane } from './panes/schedulePane.js';
import { BuLinkPane } from './panes/buLinkPane.js';
import { BuManagePane } from './panes/buManagePane.js';
import { StatsAndFormsPane } from './panes/statsAndFormsPane.js';
import { AuditLogPane } from './panes/auditLogPane.js';
import { BeneficiaryCardsPane } from './panes/beneficiaryCardsPane.js';
import { InspectionReviewModal } from './modals/inspectionReviewModal.js';
import { RbacService } from '../services/rbacService.js';

export const SEOGU_ADMIN_DONGS = [
  "가좌1동", "가좌2동", "가좌3동", "가좌4동",
  "검단동", "검암경서동", "당하동", "마전동",
  "불로대곡동", "석남1동", "석남2동", "석남3동",
  "신현원창동", "아라동", "연희동", "오류왕길동",
  "원당동", "청라1동", "청라2동", "청라3동",
  "가좌1·2동", "석남1·2·3동", "가정1·2·3동", "청라1·2·3동"
];

export { ADMIN_INITIAL_CASES } from './panes/targetListPane.js';

export class OrgAdminView {
  constructor() {
    this.cases = [];
    this.pwaSurveyCount = 0;
    this.currentPane = 'paneOrgBasic';
    this.currentModalInspectorDistricts = [];
    this.orgBasicPane = new OrgBasicPane({ orgUid: 'O-28-237-01' });
    this.adminsPane = new AdminsPane({ orgUid: 'O-28-237-01' });
    this.inspectorsPane = new InspectorsPane({ orgUid: 'O-28-237-01' });
    this.targetListPane = new TargetListPane({
      orgUid: 'O-28-237-01',
      onCasesLoaded: (cases) => {
        this.cases = cases;
        if (this.inspectionReviewModal) {
          this.inspectionReviewModal.setCases(cases);
        }
        if (this.schedulePane) {
          this.schedulePane.setCases(cases);
        }
        if (this.targetMapPane) {
          this.targetMapPane.setCases(cases);
        }
        if (this.buLinkPane) {
          this.buLinkPane.cases = cases;
        }
        if (this.buManagePane) {
          this.buManagePane.cases = cases;
        }
        if (this.statsAndFormsPane) {
          this.statsAndFormsPane.cases = cases;
        }
        if (this.beneficiaryCardsPane) {
          this.beneficiaryCardsPane.setCases(cases);
        }
      },
      onOpenReview: (uid) => {
        this.openReviewWorkspace([uid]);
      }
    });
    this.beneficiaryCardsPane = new BeneficiaryCardsPane({
      cases: this.cases,
      onScheduleUpdated: () => {
        this.renderTargetGrid();
      }
    });
    this.targetMapPane = new TargetMapPane({
      cases: this.cases,
      onTargetClick: (item) => {
        if (this.targetListPane) {
          this.targetListPane.openDetailModal(item);
        } else {
          this.openReviewWorkspace([item.uid]);
        }
      }
    });
    this.buLinkPane = new BuLinkPane({
      cases: this.cases,
      onViewDetail: (uid) => {
        this.openReviewWorkspace([uid]);
      }
    });
    this.buManagePane = new BuManagePane({
      cases: this.cases
    });
    this.schedulePane = new SchedulePane({
      cases: this.cases,
      onScheduleUpdated: () => {
        this.renderTargetGrid();
      }
    });
    this.statsAndFormsPane = new StatsAndFormsPane({
      cases: this.cases
    });
    this.auditLogPane = new AuditLogPane();
    this.targetCreatePane = new TargetCreatePane({
      orgUid: 'O-28-237-01',
      getCases: () => this.cases,
      onTargetCreated: (newTarget) => {
        if (!newTarget.uid) {
          const nextSeq = this.cases.length + 1;
          newTarget.uid = `C-28-237-01-${String(nextSeq).padStart(3, '0')}`;
        }
        if (!newTarget.surveyUid) {
          const code = newTarget.uid.split('-').pop();
          newTarget.surveyUid = `S-28-237-01-${code}-PENDING`;
        }
        this.cases.unshift(newTarget);
        if (this.targetListPane) {
          this.targetListPane.cases = this.cases;
        }
        this.renderKpi();
        this.renderTargetGrid();
      },
      onSwitchPane: (paneId, title) => {
        this.switchPane(paneId, title);
      }
    });
    this.inspectionReviewModal = new InspectionReviewModal({
      cases: this.cases,
      onSaved: () => {
        this.renderTargetGrid();
      }
    });


    // 총괄 관리자(본인) 프로필 (전사 7대 표준 식별자 체계 A계층 규격)
    this.myProfile = {
      uid: 'A-28-237-01-01',
      login_id: sessionStorage.getItem('wellrisk_admin_user') || 'wellrisk@wellrisk.com',
      name: '관리자',
      position: '센터장',
      department: '',
      phone: '032-560-4001',
      role: 'ORG_ADMIN',
      org_name: '인천 부평구 통합돌봄센터 (O-28-237-01)'
    };
    this.myInfoPane = new MyInfoPane({
      orgUid: 'O-28-237-01',
      myProfile: this.myProfile,
      onProfileUpdated: (name) => {
        const btnMyProfile = document.getElementById('btnMyProfile');
        if (btnMyProfile) {
          btnMyProfile.innerHTML = `<span>${name} 님 (총괄관리자)</span>`;
        }
      }
    });

    // 부관리자(실무 담당자) 계정 목록 (전사 표준 A계층 규격)
    this.admins = [
      { uid: 'A-28-237-01-02', name: '이살핌', position: '현장 배차 주임', role: '현장 배차 주임', phone: '032-560-4002', grade: '현장 관리자', status: '활동중' }
    ];

    // 활동가 목록 (영속화 로컬스토리지 연동)
    const savedInspectors = localStorage.getItem('wrk_inspectors_list');
    if (savedInspectors) {
      try {
        this.inspectors = JSON.parse(savedInspectors);
      } catch (e) {
        this.inspectors = this.getDefaultInspectors();
      }
    } else {
      this.inspectors = this.getDefaultInspectors();
      this.saveInspectors();
    }

    // 필터 상태
    this.filters = {
      inspector: 'all',
      grade: 'all'
    };

    this.sessionRemainingSec = 3600;
  }

  getDefaultInspectors() {
    return [
      { uid: 'U-28-237-01-01', name: '박영희', phone: '010-3341-8891', pair: '1조 (김철수)', area: '가좌1·2동', type: '현장방문', status: '활동중' },
      { uid: 'U-28-237-01-02', name: '김철수', phone: '010-4491-0092', pair: '1조 (박영희)', area: '가좌1·2동', type: '현장방문', status: '활동중' },
      { uid: 'U-28-237-01-03', name: '이순신', phone: '010-8821-3301', pair: '2조 (강감찬)', area: '석남1·2·3동', type: '배정·검수', status: '활동중' },
      { uid: 'U-28-237-01-04', name: '강감찬', phone: '010-7712-9904', pair: '2조 (이순신)', area: '석남1·2·3동', type: '배정·검수', status: '활동중' }
    ];
  }

  saveInspectors() {
    localStorage.setItem('wrk_inspectors_list', JSON.stringify(this.inspectors));
  }

  async init() {
    // 1-1. 기초정보 서브 페인 모듈 마운트 (독립 ESM 모듈화)
    await this.orgBasicPane.mount('paneOrgBasic', 'O-28-237-01');

    // 1-2. 부관리자 관리 서브 페인 모듈 마운트 (독립 ESM 모듈화)
    await this.adminsPane.mount('paneOrgAdmins', { orgUid: 'O-28-237-01' });

    // 1-3. 참여활동가 서브 페인 모듈 마운트 (독립 ESM 모듈화)
    await this.inspectorsPane.mount('paneOrgInspectors', 'O-28-237-01');

    // 1-4. 내 정보 서브 페인 모듈 마운트 (독립 ESM 모듈화)
    await this.myInfoPane.mount('paneMyInfo');

    // 2-1. 안부대상자 현황 서브 페인 모듈 마운트 (독립 ESM 모듈화)
    await this.targetListPane.mount('paneTargetList', 'O-28-237-01');
    this.cases = this.targetListPane.cases;
    if (this.inspectionReviewModal) {
      this.inspectionReviewModal.setCases(this.cases);
    }

    // 2-1-B. GIS 관제 지도 서브 페인 모듈 마운트 (독립 ESM 모듈화)
    await this.targetMapPane.mount('targetMapView', {
      cases: this.cases,
      onTargetClick: (item) => {
        if (this.targetListPane) {
          this.targetListPane.openDetailModal(item);
        } else {
          this.openReviewWorkspace([item.uid]);
        }
      }
    });

    // 2-2. 수혜자 관리카드 서브 페인 모듈 마운트 (독립 ESM 모듈화)
    await this.beneficiaryCardsPane.mount('paneBeneficiaryCards', { cases: this.cases });

    // 2-3. 수혜자 연계 관리 서브 페인 모듈 마운트 (독립 ESM 모듈화)
    await this.schedulePane.mount('paneVisitSchedule', { cases: this.cases });

    // 2-4. 신규 대상자 등록 서브 페인 모듈 마운트 (독립 ESM 모듈화)
    await this.targetCreatePane.mount('paneTargetCreate');

    // 3-1. 사업단별 연계 서브 페인 모듈 마운트 (독립 ESM 모듈화)
    await this.buLinkPane.mount('paneBuLink', { cases: this.cases });

    // 3-2. 사업단별 관리 서브 페인 모듈 마운트 (독립 ESM 모듈화)
    await this.buManagePane.mount('paneBuManage', { cases: this.cases });

    // 4. 통계 및 서식 서브 페인 모듈 마운트 (독립 ESM 모듈화)
    await this.statsAndFormsPane.mount('paneStatsAndForms', { cases: this.cases });

    // 5. 감사로그 서브 페인 모듈 마운트 (독립 ESM 모듈화)
    await this.auditLogPane.mount('paneAuditLog');

    await this.loadMyProfileAndAdmins();
    this.bindNavigation();
    this.renderAll();
    this.bindActionEvents();
    this.initSessionTimer();
    this.initRealtimeStorageListener();

    // 초기 활성화된 메뉴와 화면 동기화 (새로고침 시 기본 1. 기관정보 - 기초정보 표시)
    this.switchPane('paneOrgBasic', '기초정보');
  }

  /**
   * D1에서 총괄 관리자 프로필 및 부관리자 목록 실시간 동기화 (전용 OrgAdminApi 사용)
   */
  async loadMyProfileAndAdmins() {
    try {
      // 1. 내 프로필 로드 (MyInfoPane 서브 페인 모듈 위임)
      if (this.myInfoPane) {
        await this.myInfoPane.loadMyProfile();
        this.myProfile = this.myInfoPane.myProfile;
      }

      // 2. 부관리자 목록 로드 (AdminsPane 서브 페인 모듈 위임)
      if (this.adminsPane) {
        await this.adminsPane.loadAdmins();
        this.admins = this.adminsPane.admins;
      }

      // 3. 현재 로그인 사용자 세션 권한 동기화
      const currentUser = sessionStorage.getItem('wellrisk_admin_user') || 'wellrisk@wellrisk.com';
      const matchedAdmin = (this.admins || []).find(a => (a.login_id === currentUser || a.loginId === currentUser));
      if (matchedAdmin) {
        RbacService.setSession(matchedAdmin);
      } else if (this.myProfile) {
        RbacService.setSession(this.myProfile);
      }

      // 4. 전사 UI 권한 가드 적용
      RbacService.applyGuards(document);
    } catch (e) {
      console.warn('[orgAdminView] loadMyProfileAndAdmins 실패:', e);
    }
  }

  /**
   * 안부대상자 데이터 로드 (TargetListPane 서브 페인 모듈 위임)
   */
  async loadCases() {
    if (this.targetListPane) {
      await this.targetListPane.loadCases();
      this.cases = this.targetListPane.cases;
      return;
    }
  }

  renderAll() {
    this.renderAdmins();
    this.renderInspectors();
    this.renderMyInfo();
    this.renderKpi();
    this.renderTargetGrid();
    this.renderSchedule();
    this.renderBuLink();
    this.renderBuManage();
    this.renderStatsAndForms();
    this.renderAuditLogs();
  }

  /**
   * LNB 네비게이션 및 배타적 아코디언 바인딩
   */
  bindNavigation() {
    const MENU_TITLES = {
      paneOrgBasic: '기초정보',
      paneOrgAdmins: '부관리자 관리',
      paneOrgInspectors: '참여자 관리',
      paneMyInfo: '내 정보',
      paneTargetList: '대상자 현황',
      paneBeneficiaryCards: '수혜자 관리카드',
      paneVisitSchedule: '수혜자 연계 관리',
      paneTargetCreate: '신규 대상자 등록',
      paneBuLink: '사업단별 연계',
      paneBuManage: '사업단별 관리',
      paneStatsAndForms: '통계 및 서식',
      paneAuditLog: '감사 로그'
    };

    // 1. 상위 메인 그룹 아코디언 토글 (단일 그룹만 열림)
    document.querySelectorAll('.sidebar-group-btn').forEach(groupBtn => {
      groupBtn.addEventListener('click', () => {
        const groupEl = groupBtn.closest('.sidebar-group');
        if (!groupEl) return;

        const isAlreadyOpen = groupEl.classList.contains('open');

        // 다른 모든 그룹 닫기 (Exclusive Accordion)
        document.querySelectorAll('.sidebar-group').forEach(g => {
          g.classList.remove('open');
          const arrow = g.querySelector('.group-arrow');
          if (arrow) arrow.innerText = '▶';
        });

        if (!isAlreadyOpen) {
          groupEl.classList.add('open');
          const arrow = groupEl.querySelector('.group-arrow');
          if (arrow) arrow.innerText = '▼';

          // 첫 번째 서브 메뉴 자동 활성화
          const firstSubBtn = groupEl.querySelector('.sidebar-menu-btn');
          if (firstSubBtn) {
            const paneId = firstSubBtn.getAttribute('data-pane');
            this.switchPane(paneId, MENU_TITLES[paneId] || '화면');
          }
        }
      });
    });

    // 2. 하위 서브 메뉴 버튼 클릭
    document.querySelectorAll('.sidebar-menu-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const paneId = btn.getAttribute('data-pane');
        const parentGroup = btn.closest('.sidebar-group');
        
        if (parentGroup && !parentGroup.classList.contains('open')) {
          document.querySelectorAll('.sidebar-group').forEach(g => {
            g.classList.remove('open');
            const arrow = g.querySelector('.group-arrow');
            if (arrow) arrow.innerText = '▶';
          });
          parentGroup.classList.add('open');
          const arrow = parentGroup.querySelector('.group-arrow');
          if (arrow) arrow.innerText = '▼';
        }

        this.switchPane(paneId, MENU_TITLES[paneId] || '화면');
      });
    });
  }

  switchPane(paneId, title) {
    this.currentPane = paneId;

    document.querySelectorAll('.sidebar-menu-btn').forEach(b => {
      if (b.getAttribute('data-pane') === paneId) b.classList.add('active');
      else b.classList.remove('active');
    });

    document.querySelectorAll('.admin-pane').forEach(p => {
      if (p.id === paneId) p.classList.add('active');
      else p.classList.remove('active');
    });

    const breadcrumb = document.getElementById('headerMenuBreadcrumb');
    if (breadcrumb) breadcrumb.innerText = title;

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ========================================================
  // 1-2. 부관리자 목록 (AdminsPane 서브 페인 모듈 위임)
  // ========================================================
  renderAdmins() {
    if (this.adminsPane) {
      this.adminsPane.renderAdmins();
    }
  }

  // ========================================================
  // 1-4. 내 정보 렌더링 (MyInfoPane 서브 페인 모듈 위임)
  // ========================================================
  renderMyInfo() {
    if (this.myInfoPane) {
      this.myInfoPane.renderMyInfo();
    }
  }

  // ========================================================
  // 1-3. 참여활동가 목록 (InspectorsPane 독립 모듈 위임)
  // ========================================================
  renderInspectors() {
    if (this.inspectorsPane) {
      this.inspectorsPane.renderInspectors();
    }
  }

  // ========================================================
  // 2-1. KPI 및 대상자 현황 그리드 (TargetListPane 서브 페인 모듈 위임)
  // ========================================================
  renderKpi() {
    if (this.targetListPane) {
      this.targetListPane.renderKpi();
    }
  }

  renderTargetGrid() {
    if (this.targetListPane) {
      this.targetListPane.renderTargetGrid();
    }
  }

  // ========================================================
  // 2-3. 정기 방문 일정 및 4대 사업단 배정 스케줄 (SchedulePane 독립 모듈 위임)
  // ========================================================
  renderSchedule() {
    if (this.schedulePane) {
      this.schedulePane.renderSchedule();
    }
  }

  openAssignScheduleModal(uid = null) {
    if (this.schedulePane) {
      this.schedulePane.openAssignScheduleModal(uid);
    }
  }

  // ========================================================
  // 3-1. 사업단별 연계 (BuLinkPane 독립 모듈 위임)
  // ========================================================
  renderBuLink() {
    if (this.buLinkPane) {
      this.buLinkPane.renderLinkTable();
    }
  }

  // ========================================================
  // 3-2. 사업단별 관리 (BuManagePane 독립 모듈 위임)
  // ========================================================
  renderBuManage() {
    if (this.buManagePane) {
      if (typeof this.buManagePane.render === 'function') {
        this.buManagePane.render();
      }
    }
  }

  // ========================================================
  // 4. 통계 및 서식 (StatsAndFormsPane 독립 모듈 위임)
  // ========================================================
  renderStatsAndForms() {
    if (this.statsAndFormsPane) {
      this.statsAndFormsPane.renderStats();
      this.statsAndFormsPane.renderFormViewer();
    }
  }

  // ========================================================
  // 5. 감사로그 (AuditLogPane 독립 모듈 위임)
  // ========================================================
  renderAuditLogs() {
    if (this.auditLogPane) {
      this.auditLogPane.renderLogs();
    }
  }

  // ========================================================
  // 상세 모달 열기
  // ========================================================
  // ========================================================
  // 1차 현장방문 검수 및 시니어 검수단 심층 평가 워크스페이스 (InspectionReviewModal 독립 모듈 위임)
  // ========================================================
  openReviewWorkspace(targetUids = null) {
    if (this.inspectionReviewModal) {
      this.inspectionReviewModal.open(targetUids);
    }
  }

  // ========================================================
  // 수혜자 상세 진단 및 관찰 기록지 모달 -> 현장방문 평가 워크스페이스 단일 모달로 일원화
  // ========================================================
  async openDetailModal(c) {
    if (c && c.uid) {
      this.openReviewWorkspace([c.uid]);
    }
  }

  // ========================================================
  // 우측 액션 버튼 및 공통 이벤트 바인딩
  // ========================================================
  openAdminModal(target = null) {
    if (this.adminsPane) {
      this.adminsPane.openAdminModal(target);
    }
  }

  closeAdminModal() {
    if (this.adminsPane) {
      this.adminsPane.closeAdminModal();
    }
  }

  openInspectorModal(targetIns = null) {
    if (this.inspectorsPane) {
      this.inspectorsPane.openInspectorModal(targetIns);
    }
  }

  closeInspectorModal() {
    if (this.inspectorsPane) {
      this.inspectorsPane.closeInspectorModal();
    }
  }

  bindActionEvents() {
    // 1-1. 기초정보 페인은 OrgBasicPane 서브 모듈에서 완전 자립 캡슐화 관리

    // 1-2. 부관리자 정식 등록 모달 이벤트는 AdminsPane에서 독립 처리됨

    // 1-4. 내 정보 저장 및 비밀번호 변경 이벤트는 MyInfoPane에서 독립 처리됨

    // 1-3. 참여활동가 서브 페인 및 엑셀 일괄 등록은 InspectorsPane 모듈에서 완전 자립 캡슐화 관리

    // 2-1-B. 목록 보기 ⇄ 지도 보기 전환 및 핀 클릭 이벤트는 TargetMapPane에서 독립 처리됨

    const btnExcel = document.getElementById('btnDownloadExcel');
    if (btnExcel) btnExcel.addEventListener('click', () => this.exportToCsv());

    const btnPdf = document.getElementById('btnPrintGridPdf');
    if (btnPdf) btnPdf.addEventListener('click', () => window.print());

    const btnSync = document.getElementById('btnSyncPwaData');
    if (btnSync) btnSync.addEventListener('click', () => {
      this.loadCases();
      this.renderAll();
      notifier.toast(`PWA 실시간 데이터(${this.pwaSurveyCount}건)가 동기화되었습니다.`, 'success');
    });

    // 2-2. 신규 대상자 등록 (개별 / 일괄) 이벤트는 TargetCreatePane에서 독립 처리됨

    // 2-3. 4대 사업단 방문 일정 배정 및 수정 모달 연동
    // (SchedulePane에서 독립 처리됨)



    // 3-1. 4대 사업단 등록 / 현황 및 수혜자 상세 보기 이벤트는 BuDispatchPane에서 독립 처리됨

    // 3-2. 연계 현황 이벤트는 MohwAuditPane에서 독립 처리됨
    // 4-1. 통계 다운로드 이벤트는 MohwAuditPane에서 독립 처리됨
    // 4-2. 감사로그 내보내기 이벤트는 MohwAuditPane에서 독립 처리됨

    // 5-1. 보고서 인쇄 / 엑셀 / 재집계 이벤트는 ExecutiveReportPane에서 독립 처리됨

    // 2-1. 1차 현장방문 검수 및 시니어 검수단 심층 평가 워크스페이스 이벤트는 InspectionReviewModal에서 독립 처리됨

    // 대상자 현황 필터 및 상세 모달 이벤트는 TargetListPane에서 독립 처리됨

    // 세션 연장
    const btnExtend = document.getElementById('btnExtendSession');
    if (btnExtend) btnExtend.addEventListener('click', () => {
      this.sessionRemainingSec = 3600;
      notifier.toast('보안 세션이 60분으로 연장되었습니다.', 'success');
    });

    // 로그아웃
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        sessionStorage.removeItem('wellrisk_admin_auth');
        sessionStorage.removeItem('wellrisk_admin_user');
        window.location.replace('admin');
      });
    }
  }

  exportToCsv() {
    if (this.statsAndFormsPane) {
      this.statsAndFormsPane.exportExcel();
    }
  }

  initSessionTimer() {
    const disp = document.getElementById('dispSessionTimer');
    setInterval(() => {
      if (this.sessionRemainingSec > 0) {
        this.sessionRemainingSec--;
        const min = Math.floor(this.sessionRemainingSec / 60);
        const sec = this.sessionRemainingSec % 60;
        if (disp) disp.innerText = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
      }
    }, 1000);
  }

  initRealtimeStorageListener() {
    window.addEventListener('storage', (e) => {
      if (e.key === SUBMITTED_SURVEYS_KEY) {
        this.loadCases();
        this.renderAll();
        notifier.toast('PWA에서 신규 현장 조사가 제출되어 실적 목록에 실시간 반영되었습니다!', 'info', 4000);
      }
    });
  }
}
