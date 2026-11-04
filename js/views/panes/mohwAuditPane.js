/**
 * @file mohwAuditPane.js
 * @description 연계 현황, 실적 통계 대시보드, 시스템 감사 로그 서브 페인 모듈 (ESM)
 */

import { notifier } from '../../utils/notifier.js';

export class MohwAuditPane {
  constructor(options = {}) {
    this.orgUid = options.orgUid || 'O-28-237-01';
    this.onExportCsv = options.onExportCsv || null;
    this.auditLogs = options.auditLogs || this.getDefaultAuditLogs();
    this.mohwDocs = options.mohwDocs || this.getDefaultMohwDocs();
  }

  getDefaultMohwDocs() {
    return [
      {
        uid: 'LNK-28-237-01-001',
        caseUid: 'C-28-237-01-001',
        name: '김*수',
        types: '생계지원 (MOHW-01), 주거지원 (MOHW-06)',
        agency: '가좌2동 행정복지센터 (맞춤형복지)',
        date: '2026-09-30 09:30',
        status: '연계 접수',
        statusClass: 'clean'
      },
      {
        uid: 'LNK-28-237-01-002',
        caseUid: 'C-28-237-01-002',
        name: '박*동',
        types: '건강·의료 (MOHW-03), 고립·고독 (MOHW-10)',
        agency: '석남1동 행정복지센터 (방문간호)',
        date: '2026-09-29 14:20',
        status: '서비스 지원중',
        statusClass: 'clean'
      },
      {
        uid: 'LNK-28-237-01-003',
        caseUid: 'C-28-237-01-004',
        name: '최*철',
        types: '돌봄·안전 (MOHW-05)',
        agency: '서구 노인복지관 (응급안전)',
        date: '2026-09-28 11:10',
        status: '연계 완료',
        statusClass: 'clean'
      }
    ];
  }

  getDefaultAuditLogs() {
    return [
      {
        uid: 'AUD-28-9901-20261002-0830',
        action: 'PWA 현장 조사 전송',
        refUid: 'S-28-237-01-001-20261002',
        worker: '관리자 (총괄 센터장)',
        timestamp: '2026-10-02 08:30:15',
        status: '무결성 검증',
        statusClass: 'clean'
      },
      {
        uid: 'AUD-28-9901-20260930-0930',
        action: '전자 서명 생성 및 저장',
        refUid: 'C-28-237-01-001',
        worker: '박영희, 김철수 (1조)',
        timestamp: '2026-09-30 09:45:12',
        status: '서명 암호화',
        statusClass: 'clean'
      }
    ];
  }

  async mount() {
    this.renderMohwDocs();
    this.renderAuditLogs();
    this.bindEvents();
  }

  // ========================================================
  // 3-2. 연계 현황 테이블 렌더링
  // ========================================================
  renderMohwDocs() {
    const tbody = document.getElementById('tbodyMohwDocs');
    if (!tbody) return;

    tbody.innerHTML = this.mohwDocs.map(item => `
      <tr>
        <td style="font-family:monospace; font-weight:700; white-space:nowrap;">${item.uid}</td>
        <td style="white-space:nowrap;">${item.name} <span class="sidebar-badge" style="font-family:monospace;">${item.caseUid}</span></td>
        <td>${item.types}</td>
        <td>${item.agency}</td>
        <td style="font-family:monospace; white-space:nowrap;">${item.date}</td>
        <td><span class="grade-pill ${item.statusClass}">${item.status}</span></td>
      </tr>
    `).join('');
  }

  // ========================================================
  // 4-2. 시스템 감사 로그 테이블 렌더링
  // ========================================================
  renderAuditLogs() {
    const tbody = document.getElementById('tbodyAuditLogs');
    if (!tbody) return;

    tbody.innerHTML = this.auditLogs.map(item => `
      <tr>
        <td style="font-family:monospace; font-size:11.5px; white-space:nowrap;">${item.uid}</td>
        <td>${item.action}</td>
        <td style="font-family:monospace; white-space:nowrap;">${item.refUid}</td>
        <td>${item.worker}</td>
        <td style="font-family:monospace; white-space:nowrap;">${item.timestamp}</td>
        <td><span class="grade-pill ${item.statusClass}">${item.status}</span></td>
      </tr>
    `).join('');
  }

  // ========================================================
  // 이벤트 바인딩
  // ========================================================
  bindEvents() {
    // 3-2. 연계 등록 및 엑셀 다운로드
    const btnMohwLink = document.getElementById('btnCreateMohwLink');
    if (btnMohwLink && !btnMohwLink._boundMohw) {
      btnMohwLink._boundMohw = true;
      btnMohwLink.addEventListener('click', () => {
        notifier.toast('외부 전문기관 및 행정복지센터 연계 등록 창을 엽니다.', 'info');
      });
    }

    const btnMohwExcel = document.getElementById('btnDownloadMohwExcel');
    if (btnMohwExcel && !btnMohwExcel._boundMohw) {
      btnMohwExcel._boundMohw = true;
      btnMohwExcel.addEventListener('click', () => {
        if (typeof this.onExportCsv === 'function') {
          this.onExportCsv();
        }
        notifier.toast('연계 현황 목록이 엑셀로 다운로드되었습니다.', 'success');
      });
    }

    // 4-1. 통계 다운로드
    const btnStatsDown = document.getElementById('btnDownloadStats');
    if (btnStatsDown && !btnStatsDown._boundMohw) {
      btnStatsDown._boundMohw = true;
      btnStatsDown.addEventListener('click', () => {
        if (typeof this.onExportCsv === 'function') {
          this.onExportCsv();
        }
        notifier.toast('실적 통계 데이터가 다운로드되었습니다.', 'success');
      });
    }

    // 4-2. 감사로그 CSV 내보내기
    const btnAuditExport = document.getElementById('btnExportAuditLog');
    if (btnAuditExport && !btnAuditExport._boundMohw) {
      btnAuditExport._boundMohw = true;
      btnAuditExport.addEventListener('click', () => {
        notifier.toast('감사 로그 무결성 감사 기록이 CSV로 내보내졌습니다.', 'success');
      });
    }
  }
}
