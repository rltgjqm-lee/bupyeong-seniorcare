/**
 * @file myInfoPane.js
 * @description 참여기관 관리자 포털: 내 정보 관리 페인 (ESM)
 */

export class MyInfoPane {
  constructor(options = {}) {
    this.orgUid = options.orgUid || 'O-28-237-01';
  }

  render() {
    const el = document.getElementById('paneMyInfo');
    if (!el) return;

    el.innerHTML = `
      <div class="pane-header-title">
        <h2>내 정보 관리</h2>
        <p>현재 접속 중인 부평구 참여기관 관리자 프로필 및 보안 설정</p>
      </div>

      <div class="admin-card">
        <div class="card-section-title">관리자 세션 프로필</div>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">소속 기관</span>
            <span class="detail-value">인천 부평구 통합돌봄센터 (${this.orgUid})</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">관리자 식별번호</span>
            <span class="detail-value font-mono">A-28-237-01-01</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">관리자 성명</span>
            <span class="detail-value">김진우 (총괄관리자)</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">로그인 계정</span>
            <span class="detail-value font-mono">bupyeong_admin</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">보안 인증 상태</span>
            <span class="detail-value" style="color: #16a34a; font-weight: 700;">● 정상 로그인 (세션 유효)</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">최종 접속 일시</span>
            <span class="detail-value font-mono">2026-10-31 09:42:55</span>
          </div>
        </div>
      </div>
    `;
  }
}
