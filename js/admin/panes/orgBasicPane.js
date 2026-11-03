/**
 * @file orgBasicPane.js
 * @description 참여기관 관리자 포털: 기관 기초정보 페인 (ESM)
 */

export class OrgBasicPane {
  constructor(options = {}) {
    this.orgUid = options.orgUid || 'O-28-237-01';
  }

  render() {
    const el = document.getElementById('paneOrgBasic');
    if (!el) return;

    el.innerHTML = `
      <div class="pane-header-title">
        <h2>기관 기초정보</h2>
        <p>인천광역시 부평구 통합돌봄 참여기관 및 수행조직 기본 명세</p>
      </div>

      <div class="admin-card">
        <div class="card-section-title">기관 식별 및 마스터 정보</div>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">기관 고유코드 (Org UID)</span>
            <span class="detail-value font-mono" style="font-weight:700; color:#2563eb;">${this.orgUid}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">시군구 행정코드</span>
            <span class="detail-value font-mono">M-28-237 (인천광역시 부평구)</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">기관 공식명칭</span>
            <span class="detail-value">인천광역시 부평구 통합돌봄센터</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">참여 기관유형</span>
            <span class="detail-value">부평구 직영 통합돌봄 거점기관</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">대표 전화번호</span>
            <span class="detail-value">032-509-6114 (부평구 대표)</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">소재지 주소</span>
            <span class="detail-value">인천광역시 부평구 부평대로 168 (부평동, 부평구청)</span>
          </div>
        </div>
      </div>

      <div class="admin-card">
        <div class="card-section-title">관할 22개 행정동 및 돌봄 쿼터 현황</div>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">관할 행정동 (22개동 완비)</span>
            <span class="detail-value" style="line-height: 1.5;">부평1~6동, 산곡1~4동, 청천1~2동, 갈산1~2동, 삼산1~2동, 부개1~3동, 일신동, 십정1~2동</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">돌봄 대상자 정원 쿼터</span>
            <span class="detail-value font-mono"><strong>500명</strong> (현재 등록: 10명)</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">노인일자리 살핌 참여자 정원</span>
            <span class="detail-value font-mono"><strong>50명 (25개 조)</strong></span>
          </div>
          <div class="detail-item">
            <span class="detail-label">거버넌스 상태</span>
            <span class="detail-value" style="color: #16a34a; font-weight: 700;">● 정상 운영 중 (100% 완전 가명화)</span>
          </div>
        </div>
      </div>
    `;
  }
}
