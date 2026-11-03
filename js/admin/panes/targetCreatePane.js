/**
 * @file targetCreatePane.js
 * @description 참여기관 관리자 포털: 신규 대상자 등록 및 UID 채번 페인 (ESM)
 */

import { UidEngine } from '../../core/uid.js';
import { maskName, maskBirth } from '../../core/mask.js';
import { notifier } from '../../utils/notifier.js';
import { BUPYEONG_DONGS } from '../../data/bupyeongCoords.js';

export class TargetCreatePane {
  constructor(options = {}) {
    this.orgUid = options.orgUid || 'O-28-237-01';
    this.onCaseCreated = options.onCaseCreated || null;
  }

  render() {
    const el = document.getElementById('paneTargetCreate');
    if (!el) return;

    const defaultNextUid = UidEngine.generateCaseUid(this.orgUid, 1011);

    el.innerHTML = `
      <div class="pane-header-title">
        <h2>신규 대상자 등록 및 UID 발급</h2>
        <p>지자체 교부 종이명단과 1:1 매칭되는 고유식별자(UID) 채번 및 인적사항 등록</p>
      </div>

      <div class="admin-card" style="max-width: 720px;">
        <form id="formCreateTarget">
          <div class="card-section-title">1. 고유식별자 (UID) 채번</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div class="form-group">
              <label class="form-label">발급 구분</label>
              <select class="form-input" id="createCaseType">
                <option value="REGULAR">정규 종이명단 매칭 (순번)</option>
                <option value="FIELD">현장 사각지대 발굴 (난수)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">채번된 대상자 UID</label>
              <input type="text" class="form-input font-mono" id="createCaseUid" value="${defaultNextUid}" readonly style="font-weight: 700; color: #2563eb; background: #f1f5f9;">
            </div>
          </div>

          <div class="card-section-title">2. 도로명 주소 & 행정동 자동 추출</div>
          <div class="form-group" style="margin-bottom: 12px;">
            <label class="form-label">도로명 주소</label>
            <div style="display: flex; gap: 8px;">
              <input type="text" class="form-input" id="createBaseAddress" placeholder="주소 검색 버튼을 클릭하세요" readonly style="flex: 1; cursor: pointer; background: #f8fafc;">
              <button type="button" class="btn-action" id="btnAdminSearchAddr" style="width: 90px; padding: 0 12px; background: #0f172a; color: #ffffff; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">주소 검색</button>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 12px; margin-bottom: 16px;">
            <div class="form-group">
              <label class="form-label">관할 행정동 (자동추출)</label>
              <input type="text" class="form-input" id="createDong" placeholder="부평동" style="font-weight: 700;">
            </div>
            <div class="form-group">
              <label class="form-label">상세 주소 (동·호수)</label>
              <input type="text" class="form-input" id="createDetailAddress" placeholder="예: 101호">
            </div>
          </div>

          <div class="card-section-title">3. 인적사항 및 복지 수급 자격 (가명화 보호)</div>
          <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 12px; margin-bottom: 12px;">
            <div class="form-group">
              <label class="form-label">성명</label>
              <input type="text" class="form-input" id="createName" placeholder="예: 홍길동" required>
            </div>
            <div class="form-group">
              <label class="form-label">성별</label>
              <select class="form-input" id="createGender">
                <option value="여">여</option>
                <option value="남">남</option>
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <div class="form-group">
              <label class="form-label">생년월일 (YYMMDD)</label>
              <input type="text" class="form-input" id="createBirth" placeholder="예: 501225" maxlength="10" required>
            </div>
            <div class="form-group">
              <label class="form-label">연락처</label>
              <input type="tel" class="form-input" id="createPhone" placeholder="010-0000-0000" maxlength="13">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 24px;">
            <div class="form-group">
              <label class="form-label">가구 형태</label>
              <select class="form-input" id="createLiving">
                <option value="독거">독거</option>
                <option value="부부">부부</option>
                <option value="성인자녀 동거">성인자녀 동거</option>
                <option value="기타 가족동거">기타 가족동거</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">사회보장 수급권</label>
              <select class="form-input" id="createSocial">
                <option value="기초생활수급자">기초생활수급자</option>
                <option value="차상위">차상위</option>
                <option value="기초연금">기초연금</option>
                <option value="일반">일반</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">대상자 특성</label>
              <select class="form-input" id="createFeature">
                <option value="장기요양 재가급여">장기요양 재가급여</option>
                <option value="장애인활동보조 수급자">장애인활동보조</option>
                <option value="노인맞춤돌봄서비스">노인맞춤돌봄</option>
                <option value="해당없음">해당없음</option>
              </select>
            </div>
          </div>

          <button type="submit" class="btn-action" style="width: 100%; height: 44px; font-size: 15px; font-weight: 800; background: #0f172a; color: #ffffff; border: none; border-radius: 8px; cursor: pointer;">
            신규 대상자 등록 및 원장 매칭 완료
          </button>
        </form>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const selType = document.getElementById('createCaseType');
    const inputUid = document.getElementById('createCaseUid');
    const btnSearch = document.getElementById('btnAdminSearchAddr');
    const inputBaseAddr = document.getElementById('createBaseAddress');
    const form = document.getElementById('formCreateTarget');

    if (selType && inputUid) {
      selType.addEventListener('change', () => {
        if (selType.value === 'FIELD') {
          inputUid.value = UidEngine.generateFieldCaseUid(this.orgUid);
        } else {
          inputUid.value = UidEngine.generateCaseUid(this.orgUid, 1011);
        }
      });
    }

    const openPostcode = () => {
      const layer = document.getElementById('adminPostcodeLayer');
      const container = document.getElementById('adminPostcodeFrameContainer');
      const closeBtn = document.getElementById('closeAdminPostcodeBtn');

      if (!layer || !container || typeof daum === 'undefined' || !daum.Postcode) {
        notifier.toast('주소 검색 서비스를 불러올 수 없습니다.', 'error');
        return;
      }

      closeBtn.onclick = () => { layer.style.display = 'none'; };
      container.innerHTML = '';

      new daum.Postcode({
        oncomplete: (data) => {
          const roadAddr = data.roadAddress || data.jibunAddress || '';
          const bname = data.bname || '부평동';

          let matchedDong = '부평1동';
          for (const d of BUPYEONG_DONGS) {
            if ((roadAddr + ' ' + bname).includes(d)) {
              matchedDong = d;
              break;
            }
          }

          document.getElementById('createBaseAddress').value = roadAddr;
          document.getElementById('createDong').value = matchedDong;
          layer.style.display = 'none';
          notifier.toast(`관할 행정동 [${matchedDong}]이(가) 자동 추출되었습니다.`, 'success');
        },
        width: '100%',
        height: '100%'
      }).embed(container);

      layer.style.display = 'block';
    };

    if (btnSearch) btnSearch.addEventListener('click', openPostcode);
    if (inputBaseAddr) inputBaseAddr.addEventListener('click', openPostcode);

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();

        const uid = document.getElementById('createCaseUid').value.trim();
        const rawName = document.getElementById('createName').value.trim();
        const birth = document.getElementById('createBirth').value.trim();
        const gender = document.getElementById('createGender').value;
        const phone = document.getElementById('createPhone').value.trim();
        const dong = document.getElementById('createDong').value.trim() || '부평1동';
        const baseAddr = document.getElementById('createBaseAddress').value.trim() || '부평구 부평동 ***';
        const living = document.getElementById('createLiving').value;
        const social = document.getElementById('createSocial').value;
        const feature = document.getElementById('createFeature').value;

        const newCase = {
          uid: uid,
          name: maskName(rawName),
          birth: maskBirth(birth),
          gender: gender,
          phone: phone,
          dong: dong,
          address: baseAddr,
          livingType: living,
          socialSecurity: social,
          targetFeature: feature,
          roundCount: 1,
          lastConsultDate: new Date().toISOString().slice(0, 10),
          lastConsultResult: '희망 서비스 없음',
          needsDeepLink: false
        };

        if (this.onCaseCreated) {
          this.onCaseCreated(newCase);
        }
      });
    }
  }
}
