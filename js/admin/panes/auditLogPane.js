/**
 * @file auditLogPane.js
 * @description 참여기관 관리자 포털: 개인정보 열람 감사로그 페인 (ESM)
 */

export class AuditLogPane {
  constructor(options = {}) {
    this.orgUid = options.orgUid || 'O-28-237-01';
  }

  render() {
    const el = document.getElementById('paneAuditLog');
    if (!el) return;

    el.innerHTML = `
      <div class="pane-header-title">
        <h2>개인정보 열람 및 인쇄 감사 로그</h2>
        <p>개인정보보호법에 따른 취약계층 어르신 개인정보 조회, 엑셀 반출 및 PDF 출력 무결성 감사 추적</p>
      </div>

      <div class="admin-card" style="padding: 0; overflow: hidden;">
        <div style="overflow-x: auto;">
          <table class="admin-table">
            <thead>
              <tr>
                <th style="width: 140px;">로그 식별자</th>
                <th style="width: 140px;">일시</th>
                <th style="width: 110px;">작업자 (ID)</th>
                <th style="width: 130px;">대상 가구 UID</th>
                <th style="width: 130px;">행위 유형</th>
                <th>열람 사유</th>
                <th style="width: 120px;">무결성 해시</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="font-mono">L-6718E29A-1F4A</td>
                <td class="font-mono">2026-10-31 09:30:12</td>
                <td>김진우 (admin)</td>
                <td class="font-mono">부평구 전역</td>
                <td><span class="badge badge-primary">17열 엑셀 반출</span></td>
                <td>2026년 10월 부평구 통합돌봄 월간 실적 구청 보고용</td>
                <td class="font-mono" style="font-size: 11px; color: #64748b;">a1f8c4...e9</td>
              </tr>
              <tr>
                <td class="font-mono">L-6718E12F-08B2</td>
                <td class="font-mono">2026-10-31 09:15:40</td>
                <td>이지은 (mgr1)</td>
                <td class="font-mono">C-28-237-01-002</td>
                <td><span class="badge badge-secondary">원장 상세 조회</span></td>
                <td>부평2동 행정복지센터 심층상담 연계 사전 검토</td>
                <td class="font-mono" style="font-size: 11px; color: #64748b;">b7c93e...14</td>
              </tr>
              <tr>
                <td class="font-mono">L-6718DF81-45D1</td>
                <td class="font-mono">2026-10-30 16:45:22</td>
                <td>박성훈 (mgr2)</td>
                <td class="font-mono">C-28-237-01-005</td>
                <td><span class="badge badge-danger">PDF 서식 출력</span></td>
                <td>공문서 제출을 위한 만족도 조사지 암호화 출력</td>
                <td class="font-mono" style="font-size: 11px; color: #64748b;">99fa01...6b</td>
              </tr>
              <tr>
                <td class="font-mono">L-6718DE30-71A9</td>
                <td class="font-mono">2026-10-30 15:20:05</td>
                <td>김진우 (admin)</td>
                <td class="font-mono">C-28-237-01-009</td>
                <td><span class="badge badge-secondary">원장 상세 조회</span></td>
                <td>부개1동 복지사 방문 일정 조율 및 안부 확인</td>
                <td class="font-mono" style="font-size: 11px; color: #64748b;">33de81...fa</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}
