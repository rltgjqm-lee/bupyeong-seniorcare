/**
 * @file adminsPane.js
 * @description 참여기관 관리자 포털: 관리자 계정 관리 페인 (ESM)
 */

export class AdminsPane {
  constructor(options = {}) {
    this.orgUid = options.orgUid || 'O-28-237-01';
  }

  render() {
    const el = document.getElementById('paneOrgAdmins');
    if (!el) return;

    el.innerHTML = `
      <div class="pane-header-title">
        <h2>관리자 계정 관리</h2>
        <p>부평구 통합돌봄센터 소속 전담 복지사 및 총괄관리자 권한 통제</p>
      </div>

      <div class="admin-card">
        <div style="overflow-x: auto;">
          <table class="admin-table">
            <thead>
              <tr>
                <th style="width: 140px;">관리자 UID</th>
                <th style="width: 100px;">성명</th>
                <th style="width: 130px;">아이디</th>
                <th style="width: 110px;">권한 등급</th>
                <th>담당 행정동</th>
                <th style="width: 90px; text-align: center;">상태</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="font-mono">A-28-237-01-01</td>
                <td>김진우</td>
                <td class="font-mono">bupyeong_admin</td>
                <td><span class="badge badge-primary">총괄관리자</span></td>
                <td>부평구 전체 (22개 행정동)</td>
                <td style="text-align: center;"><span class="badge badge-success">활성</span></td>
              </tr>
              <tr>
                <td class="font-mono">A-28-237-01-02</td>
                <td>이지은</td>
                <td class="font-mono">bupyeong_mgr1</td>
                <td><span class="badge badge-secondary">전담복지사</span></td>
                <td>부평1동, 부평4동, 갈산1동</td>
                <td style="text-align: center;"><span class="badge badge-success">활성</span></td>
              </tr>
              <tr>
                <td class="font-mono">A-28-237-01-03</td>
                <td>박성훈</td>
                <td class="font-mono">bupyeong_mgr2</td>
                <td><span class="badge badge-secondary">전담복지사</span></td>
                <td>산곡1동, 산곡2동, 청천1동</td>
                <td style="text-align: center;"><span class="badge badge-success">활성</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}
