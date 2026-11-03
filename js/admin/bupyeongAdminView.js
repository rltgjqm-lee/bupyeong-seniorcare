/**
 * @file bupyeongAdminView.js
 * @description 부평구 참여기관 관리자 포털 메인 컨트롤러 (코디네이터) (ESM)
 * - 게이트키퍼 디자인 및 5대 계층 LNB 메뉴 표준 100% 준수
 */

import { notifier } from '../utils/notifier.js';
import { BUPYEONG_DEFAULT_ORG_UID } from '../core/uid.js';

import { OrgBasicPane } from './panes/orgBasicPane.js';
import { AdminsPane } from './panes/adminsPane.js';
import { InspectorsPane } from './panes/inspectorsPane.js';
import { MyInfoPane } from './panes/myInfoPane.js';
import { TargetListPane, BUPYEONG_INITIAL_CASES } from './panes/targetListPane.js';
import { ActivityCardsPane } from './panes/activityCardsPane.js';
import { MonitoringRecordsPane } from './panes/monitoringRecordsPane.js';
import { TargetCreatePane } from './panes/targetCreatePane.js';
import { StatsAndFormsPane } from './panes/statsAndFormsPane.js';
import { TargetMapPane } from './panes/targetMapPane.js';
import { AuditLogPane } from './panes/auditLogPane.js';

export class BupyeongAdminView {
  constructor() {
    this.orgUid = BUPYEONG_DEFAULT_ORG_UID;
    this.cases = [...BUPYEONG_INITIAL_CASES];
    this.currentPane = 'paneOrgBasic';

    // 페인 인스턴스화
    this.orgBasicPane = new OrgBasicPane({ orgUid: this.orgUid });
    this.adminsPane = new AdminsPane({ orgUid: this.orgUid });
    this.inspectorsPane = new InspectorsPane({ orgUid: this.orgUid });
    this.myInfoPane = new MyInfoPane({ orgUid: this.orgUid });
    
    this.targetListPane = new TargetListPane({
      orgUid: this.orgUid,
      cases: this.cases,
      onCasesUpdated: (updated) => {
        this.cases = updated;
        if (this.targetMapPane) this.targetMapPane.setCases(updated);
        if (this.activityCardsPane) this.activityCardsPane.setCases(updated);
        if (this.monitoringRecordsPane) this.monitoringRecordsPane.setCases(updated);
        if (this.statsAndFormsPane) this.statsAndFormsPane.setCases(updated);
      }
    });

    this.activityCardsPane = new ActivityCardsPane({ cases: this.cases });
    this.monitoringRecordsPane = new MonitoringRecordsPane({ cases: this.cases });
    this.targetCreatePane = new TargetCreatePane({
      orgUid: this.orgUid,
      onCaseCreated: (newCase) => {
        this.cases.unshift(newCase);
        this.targetListPane.setCases(this.cases);
        this.switchPane('paneTargetList');
        notifier.toast(`대상자 [${newCase.uid}]가 성공적으로 등록 및 매칭되었습니다.`, 'success');
      }
    });

    this.statsAndFormsPane = new StatsAndFormsPane({ cases: this.cases });
    this.targetMapPane = new TargetMapPane({ cases: this.cases });
    this.auditLogPane = new AuditLogPane({ orgUid: this.orgUid });

    this.panes = {
      paneOrgBasic: this.orgBasicPane,
      paneOrgAdmins: this.adminsPane,
      paneOrgInspectors: this.inspectorsPane,
      paneMyInfo: this.myInfoPane,
      paneTargetList: this.targetListPane,
      paneActivityCards: this.activityCardsPane,
      paneMonitoringRecords: this.monitoringRecordsPane,
      paneTargetCreate: this.targetCreatePane,
      paneStatsAndForms: this.statsAndFormsPane,
      paneTargetMap: this.targetMapPane,
      paneAuditLog: this.auditLogPane
    };
  }

  switchPane(paneId) {
    if (!this.panes[paneId]) return;

    this.currentPane = paneId;

    // LNB 활성화 갱신
    document.querySelectorAll('.sidebar-menu-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.pane === paneId);
    });

    // 메인 페인 영역 갱신
    document.querySelectorAll('.admin-pane').forEach(el => {
      el.classList.toggle('active', el.id === paneId);
    });

    // 브레드크럼 갱신
    const activeBtn = document.querySelector(`.sidebar-menu-btn[data-pane="${paneId}"]`);
    const breadcrumb = document.getElementById('headerPageBreadcrumb');
    if (activeBtn && breadcrumb) {
      breadcrumb.textContent = activeBtn.querySelector('span')?.textContent || '관리';
    }

    // 페인 렌더링
    this.panes[paneId].render();

    // 지도 페인일 경우 리사이즈 보정
    if (paneId === 'paneTargetMap' && this.targetMapPane.invalidateMapSize) {
      setTimeout(() => this.targetMapPane.invalidateMapSize(), 150);
    }
  }

  init() {
    // LNB 메뉴 클릭 이벤트
    document.querySelectorAll('.sidebar-menu-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const paneId = e.currentTarget.dataset.pane;
        this.switchPane(paneId);
      });
    });

    // LNB 그룹 아코디언 토글
    document.querySelectorAll('.sidebar-group-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const group = e.currentTarget.closest('.sidebar-group');
        if (group) {
          group.classList.toggle('open');
          const arrow = group.querySelector('.group-arrow');
          if (arrow) {
            arrow.textContent = group.classList.contains('open') ? '▼' : '▶';
          }
        }
      });
    });

    // 첫 페인 렌더링
    this.switchPane('paneOrgBasic');
  }
}
