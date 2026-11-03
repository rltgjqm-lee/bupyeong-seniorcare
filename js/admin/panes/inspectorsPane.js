/**
 * @file inspectorsPane.js
 * @description 참여기관 관리자 포털: 참여자(활동가) 명부 및 2인 1조 조편성 페인 (ESM)
 */

export class InspectorsPane {
  constructor(options = {}) {
    this.orgUid = options.orgUid || 'O-28-237-01';
  }

  render() {
    const el = document.getElementById('paneOrgInspectors');
    if (!el) return;

    el.innerHTML = `
      <div class="pane-header-title">
        <h2>참여자(활동가) 관리</h2>
        <p>부평구 노인일자리 살핌 참여자 명부 및 2인 1조 현장 방문 편성 관리</p>
      </div>

      <div class="admin-card">
        <div style="overflow-x: auto;">
          <table class="admin-table">
            <thead>
              <tr>
                <th style="width: 140px;">참여자 UID</th>
                <th style="width: 80px;">팀(조)</th>
                <th style="width: 90px;">성명</th>
                <th style="width: 120px;">연락처</th>
                <th style="width: 120px;">파트너 활동가</th>
                <th>배정 권역 (행정동)</th>
                <th style="width: 90px; text-align: center;">방문 누적</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="font-mono">U-28-237-01-MA-001</td>
                <td><span class="badge badge-primary">1조</span></td>
                <td>김철수</td>
                <td>010-****-1101</td>
                <td>이영희 (002)</td>
                <td>부평1동, 부평2동</td>
                <td style="text-align: center; font-weight: 700;">14건</td>
              </tr>
              <tr>
                <td class="font-mono">U-28-237-01-MA-002</td>
                <td><span class="badge badge-primary">1조</span></td>
                <td>이영희</td>
                <td>010-****-1102</td>
                <td>김철수 (001)</td>
                <td>부평1동, 부평2동</td>
                <td style="text-align: center; font-weight: 700;">14건</td>
              </tr>
              <tr>
                <td class="font-mono">U-28-237-01-MA-003</td>
                <td><span class="badge badge-secondary">2조</span></td>
                <td>박정남</td>
                <td>010-****-2201</td>
                <td>최순자 (004)</td>
                <td>산곡1동, 산곡2동</td>
                <td style="text-align: center; font-weight: 700;">11건</td>
              </tr>
              <tr>
                <td class="font-mono">U-28-237-01-MA-004</td>
                <td><span class="badge badge-secondary">2조</span></td>
                <td>최순자</td>
                <td>010-****-2202</td>
                <td>박정남 (003)</td>
                <td>산곡1동, 산곡2동</td>
                <td style="text-align: center; font-weight: 700;">11건</td>
              </tr>
              <tr>
                <td class="font-mono">U-28-237-01-MA-005</td>
                <td><span class="badge badge-secondary">3조</span></td>
                <td>정태수</td>
                <td>010-****-3301</td>
                <td>강옥희 (006)</td>
                <td>갈산1동, 갈산2동</td>
                <td style="text-align: center; font-weight: 700;">9건</td>
              </tr>
              <tr>
                <td class="font-mono">U-28-237-01-MA-006</td>
                <td><span class="badge badge-secondary">3조</span></td>
                <td>강옥희</td>
                <td>010-****-3302</td>
                <td>정태수 (005)</td>
                <td>갈산1동, 갈산2동</td>
                <td style="text-align: center; font-weight: 700;">9건</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}
