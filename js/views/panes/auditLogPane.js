/**
 * @file auditLogPane.js
 * @description 5. 감사로그 단독 서브 페인 모듈 (ESM)
 *              - 개인정보보호법 제29조에 따른 안전조치 접속 및 열람 이력 추적
 *              - 감사로그 조회 및 CSV 내보내기
 */

import { notifier } from '../../utils/notifier.js';

export const INITIAL_AUDIT_LOGS = [
  {
    id: "L-6718E29A-1F4A",
    action: "개인정보 열람",
    targetUid: "C-28-237-01-001 (김*수)",
    actor: "wellrisk@wellrisk.com",
    timestamp: "2026-10-26 08:35:12",
    integrity: "PASS"
  },
  {
    id: "L-6718E201-9B2C",
    action: "엑셀 다운로드",
    targetUid: "참여활동가_일괄등록_표준서식.csv",
    actor: "wellrisk@wellrisk.com",
    timestamp: "2026-10-26 08:29:40",
    integrity: "PASS"
  },
  {
    id: "L-6718E110-3D5F",
    action: "대상자 신규 등록",
    targetUid: "C-28-237-01-006 (지자체 명부)",
    actor: "wellrisk@wellrisk.com",
    timestamp: "2026-10-26 08:12:05",
    integrity: "PASS"
  },
  {
    id: "L-6718D809-5E7A",
    action: "비밀번호 변경",
    targetUid: "A-28-237-01-001 (관리자 센터장)",
    actor: "wellrisk@wellrisk.com",
    timestamp: "2026-10-25 17:42:10",
    integrity: "PASS"
  },
  {
    id: "L-6718C992-8F1E",
    action: "1차 방문 검수 승인",
    targetUid: "S-28-237-01-001-20260930",
    actor: "wellrisk@wellrisk.com",
    timestamp: "2026-10-25 15:30:22",
    integrity: "PASS"
  }
];

export class AuditLogPane {
  constructor(options = {}) {
    this.container = null;
    this.logs = JSON.parse(localStorage.getItem('wrk_audit_logs') || 'null') || INITIAL_AUDIT_LOGS;
  }

  async mount(containerEl, options = {}) {
    if (typeof containerEl === 'string') {
      this.container = document.getElementById(containerEl);
    } else {
      this.container = containerEl;
    }

    if (!this.container) return;

    this.bindEvents();
    this.renderLogs();
  }

  bindEvents() {
    const btnExport = document.getElementById('btnExportAuditLog');
    if (btnExport) {
      btnExport.onclick = () => this.exportCsv();
    }
  }

  renderLogs() {
    const tbody = document.getElementById('tbodyAuditLogs');
    if (!tbody) return;

    tbody.innerHTML = this.logs.map(log => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="font-family: monospace; font-size: 11px; font-weight: 700; color: #0f172a;">${log.id}</td>
        <td><span style="font-size: 11px; font-weight: 700; background: #f1f5f9; padding: 2px 6px; border-radius: 3px;">${log.action}</span></td>
        <td style="font-size: 11.5px; color: #334155;">${log.targetUid}</td>
        <td style="font-size: 11.5px; color: #64748b;">${log.actor}</td>
        <td style="font-size: 11px; color: #64748b;">${log.timestamp}</td>
        <td><span style="font-size: 11px; font-weight: 800; color: #16a34a;">PASS</span></td>
      </tr>
    `).join('');
  }

  exportCsv() {
    const headers = ['감사로그UID', '작업유형', '관련UID/대상', '작업자계정', '타임스탬프', '무결성상태'];
    const rows = this.logs.map(l => [
      l.id,
      `"${l.action}"`,
      `"${l.targetUid}"`,
      l.actor,
      l.timestamp,
      l.integrity
    ]);

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `WellRiskKeeper_감사로그_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    notifier.toast('감사로그 CSV 파일이 다운로드되었습니다.', 'success');
  }
}
