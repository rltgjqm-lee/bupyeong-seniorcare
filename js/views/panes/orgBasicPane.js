/**
 * @file orgBasicPane.js
 * @description 참여기관 기초정보 관리 서브 페인 모듈 (ESM)
 *              지자체 관리자(M) 및 전사 슈퍼 관리자(S) 공통 재사용 컴포넌트
 *              - 소재지 주소 검색 (Kakao/Daum Postcode) & 상세주소 분리
 *              - 우리 주소 엔진(location_tree.json) 기반 담당 관할구역 블루 칩 관리
 *              - D1 organizations & org_service_districts 원자적 저장 및 모달 알림
 */

import { OrgAdminApi } from '../../api/orgAdminApi.js';
import { notifier } from '../../utils/notifier.js';

export class OrgBasicPane {
  constructor(options = {}) {
    this.container = null;
    this.orgUid = options.orgUid || 'O-28-237-01';
    this.currentDistricts = [];
    this.locationTree = null;
    this.onSaved = options.onSaved || null;
  }

  /**
   * 페인 마운트 및 초기화
   * @param {HTMLElement|string} containerEl 
   * @param {string} [orgUid] 
   */
  async mount(containerEl, orgUid) {
    if (typeof containerEl === 'string') {
      this.container = document.getElementById(containerEl);
    } else {
      this.container = containerEl;
    }

    if (!this.container) {
      console.warn('[OrgBasicPane] 컨테이너 요소를 찾을 수 없습니다.');
      return;
    }

    if (orgUid) {
      this.orgUid = orgUid;
    }

    await this.loadLocationTree();
    await this.loadOrgData();
    this.bindEvents();
  }

  /**
   * 전사 주소 엔진(location_tree.json) 비동기 로드
   */
  async loadLocationTree() {
    if (this.locationTree) return;
    try {
      const res = await fetch('../data/location_tree.json');
      if (res.ok) {
        this.locationTree = await res.json();
      }
    } catch (err) {
      console.warn('[OrgBasicPane] location_tree.json 로드 실패:', err);
    }
  }

  /**
   * D1 데이터베이스에서 기관 기초정보 조회 및 바인딩
   */
  async loadOrgData() {
    try {
      const json = await OrgAdminApi.getOrganization(this.orgUid);
      if (json && json.success && json.data) {
        const d = json.data;
        const inpName = this.container.querySelector('#inpOrgName');
        const inpPhone = this.container.querySelector('#inpOrgPhone');
        const inpProject = this.container.querySelector('#inpOrgProject');
        const inpAddress = this.container.querySelector('#inpOrgAddress');
        const inpAddressDetail = this.container.querySelector('#inpOrgAddressDetail');

        if (inpName) inpName.value = d.orgName || '인천 부평구 통합돌봄센터';
        if (inpPhone) inpPhone.value = d.phone || '032-509-6114';
        if (inpProject) inpProject.value = d.buName || '고독사 예방 안부살핌단';
        if (inpAddress) inpAddress.value = d.baseAddress || d.address || '인천광역시 부평구 부평대로 168 (부평동)';
        if (inpAddressDetail) inpAddressDetail.value = d.detailAddress || '';

        // 담당 관할 구역 배열 복원
        if (d.districtsList && Array.isArray(d.districtsList)) {
          this.currentDistricts = [...d.districtsList];
        } else if (d.districts) {
          this.currentDistricts = typeof d.districts === 'string'
            ? d.districts.split(',').map(s => s.trim()).filter(Boolean)
            : Array.isArray(d.districts) ? d.districts : [];
        } else {
          this.currentDistricts = ['부평1동', '산곡1동', '청천1동', '갈산1동'];
        }

        // 상단 브레드크럼 동기화
        const breadcrumbOrg = document.getElementById('headerOrgBreadcrumb');
        if (breadcrumbOrg) breadcrumbOrg.innerText = d.orgName || '인천 부평구 통합돌봄센터';
      }

      this.initDistrictSelect();
      this.renderDistrictChips();
    } catch (e) {
      console.warn('[OrgBasicPane] loadOrgData 실패:', e);
    }
  }

  /**
   * 담당 관할구역 드롭다운 셀렉트 바인딩 (우리 주소 엔진 연동)
   */
  initDistrictSelect() {
    const sel = this.container.querySelector('#selOrgDistrict');
    if (!sel) return;

    sel.innerHTML = '<option value="">-- 동(구역) 선택 --</option>';

    let dongs = [];
    if (this.locationTree && this.locationTree['인천광역시'] && this.locationTree['인천광역시']['부평구']) {
      dongs = this.locationTree['인천광역시']['부평구'];
    } else {
      dongs = [
        "부평1동", "부평2동", "부평3동", "부평4동", "부평5동", "부평6동",
        "산곡1동", "산곡2동", "산곡3동", "산곡4동",
        "청천1동", "청천2동", "갈산1동", "갈산2동",
        "삼산1동", "삼산2동", "부개1동", "부개2동", "부개3동",
        "일신동", "십정1동", "십정2동"
      ];
    }

    const uniqueDongs = Array.from(new Set(dongs)).filter(d => !d.includes('·') && !d.includes('.'));
    uniqueDongs.forEach(dong => {
      const opt = document.createElement('option');
      opt.value = dong;
      opt.textContent = dong;
      sel.appendChild(opt);
    });
  }

  /**
   * 담당 관할구역 블루 칩(태그) UI 렌더링
   */
  renderDistrictChips() {
    const chipContainer = this.container.querySelector('#orgDistrictsChipsContainer');
    if (!chipContainer) return;

    if (!this.currentDistricts || this.currentDistricts.length === 0) {
      chipContainer.innerHTML = '<span style="font-size: 12px; color: #94a3b8;">등록된 관할 구역이 없습니다.</span>';
      return;
    }

    chipContainer.innerHTML = this.currentDistricts.map((dong, idx) => `
      <span style="display: inline-flex; align-items: center; gap: 6px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; border-radius: 9999px; padding: 4px 10px; font-size: 12px; font-weight: 600;">
        <span>${dong}</span>
        <button type="button" data-del-district="${idx}" style="background: none; border: none; color: #0284c7; cursor: pointer; font-size: 13px; line-height: 1; padding: 0;" title="삭제">✕</button>
      </span>
    `).join('');

    chipContainer.querySelectorAll('[data-del-district]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const delIdx = parseInt(e.currentTarget.getAttribute('data-del-district'), 10);
        if (!isNaN(delIdx)) {
          this.currentDistricts.splice(delIdx, 1);
          this.renderDistrictChips();
        }
      });
    });
  }

  /**
   * 이벤트 리스너 바인딩 (주소 검색, 구역 추가, D1 저장)
   */
  bindEvents() {
    const btnSearchAddress = this.container.querySelector('#btnSearchOrgAddress');
    const inpOrgAddress = this.container.querySelector('#inpOrgAddress');
    const inpOrgAddressDetail = this.container.querySelector('#inpOrgAddressDetail');

    // 1. 주소 검색 (Kakao/Daum 우편번호 서비스 연동)
    const openPostcode = () => {
      if (typeof daum === 'undefined' || !daum.Postcode) {
        notifier.toast('우편번호 검색 엔진을 로드하는 중입니다. 잠시 후 다시 시도해 주세요.', 'warning');
        return;
      }
      new daum.Postcode({
        oncomplete: (data) => {
          const fullAddr = data.roadAddress || data.jibunAddress;
          if (inpOrgAddress) inpOrgAddress.value = fullAddr;
          if (inpOrgAddressDetail) {
            inpOrgAddressDetail.focus();
          }
        }
      }).open();
    };

    if (btnSearchAddress) btnSearchAddress.onclick = openPostcode;
    if (inpOrgAddress) inpOrgAddress.onclick = openPostcode;

    // 2. 담당 관할구역 개별 추가 버튼
    const btnAddDistrict = this.container.querySelector('#btnAddOrgDistrict');
    const selDistrict = this.container.querySelector('#selOrgDistrict');
    if (btnAddDistrict && selDistrict) {
      btnAddDistrict.onclick = () => {
        const val = selDistrict.value;
        if (!val) {
          notifier.toast('추가할 구역을 먼저 선택해 주세요.', 'warning');
          return;
        }
        if (!this.currentDistricts) this.currentDistricts = [];
        if (this.currentDistricts.includes(val)) {
          notifier.toast(`'${val}' 구역은 이미 등록되어 있습니다.`, 'warning');
          return;
        }
        this.currentDistricts.push(val);
        this.renderDistrictChips();
        selDistrict.value = '';
      };
    }

    // 2-2. 관내 전체 구역 일괄 추가 버튼 (우리 주소 엔진 부평구 전수 연동)
    const btnAddAllDistricts = this.container.querySelector('#btnAddAllOrgDistricts');
    if (btnAddAllDistricts) {
      btnAddAllDistricts.onclick = () => {
        let allDongs = [];
        if (this.locationTree && this.locationTree['인천광역시'] && this.locationTree['인천광역시']['부평구']) {
          allDongs = this.locationTree['인천광역시']['부평구'];
        } else {
          allDongs = [
            "부평1동", "부평2동", "부평3동", "부평4동", "부평5동", "부평6동",
            "산곡1동", "산곡2동", "산곡3동", "산곡4동",
            "청천1동", "청천2동", "갈산1동", "갈산2동",
            "삼산1동", "삼산2동", "부개1동", "부개2동", "부개3동",
            "일신동", "십정1동", "십정2동"
          ];
        }

        const cleanDongs = Array.from(new Set(allDongs)).filter(d => !d.includes('·') && !d.includes('.'));
        this.currentDistricts = [...cleanDongs];
        this.renderDistrictChips();
        notifier.toast(`관내 전체 ${cleanDongs.length}개 동이 관할 구역으로 일괄 등록되었습니다. (저장을 눌러 D1에 반영)`, 'success');
      };
    }

    // 3. 수정 내용 저장 버튼
    const btnSaveBasic = this.container.querySelector('#btnSaveOrgBasic');
    if (btnSaveBasic) {
      btnSaveBasic.onclick = async () => {
        await this.handleSave(btnSaveBasic);
      };
    }
  }

  /**
   * D1 저장 실행 및 결과 알림 모달 표출
   */
  async handleSave(btnSaveBasic) {
    const inpName = this.container.querySelector('#inpOrgName');
    const inpPhone = this.container.querySelector('#inpOrgPhone');
    const inpProject = this.container.querySelector('#inpOrgProject');
    const inpAddress = this.container.querySelector('#inpOrgAddress');
    const inpAddressDetail = this.container.querySelector('#inpOrgAddressDetail');

    const orgName = inpName?.value.trim();
    const phone = inpPhone?.value.trim();
    const buName = inpProject?.value.trim();
    const baseAddr = inpAddress?.value.trim();
    const detailAddr = inpAddressDetail?.value.trim();

    if (!orgName || !phone) {
      notifier.toast('기관명과 대표 연락처는 필수 입력 사항입니다.', 'warning');
      return;
    }

    const districtsStr = (this.currentDistricts || []).join(', ');

    try {
      if (btnSaveBasic) {
        btnSaveBasic.disabled = true;
        btnSaveBasic.innerText = '저장 중...';
      }

      const res = await OrgAdminApi.updateOrganization({
        orgUid: this.orgUid,
        orgName,
        phone,
        buName,
        address: baseAddr,
        baseAddress: baseAddr,
        detailAddress: detailAddr,
        districts: districtsStr
      });

      if (res && res.success) {
        const breadcrumbOrg = document.getElementById('headerOrgBreadcrumb');
        if (breadcrumbOrg) breadcrumbOrg.innerText = orgName;

        notifier.alert({
          title: '기초정보 저장 완료',
          message: '기관 기초정보 및 관할 구역 설정이 D1 데이터베이스에 안전하게 저장되었습니다.',
          details: [
            { label: '기관명', value: orgName },
            { label: '대표 연락처', value: phone },
            { label: '소재지 주소', value: baseAddr + (detailAddr ? ' ' + detailAddr : '') },
            { label: '담당 관할 구역', value: districtsStr || '(설정된 구역 없음)' }
          ],
          confirmText: '확인'
        });

        if (typeof this.onSaved === 'function') {
          this.onSaved({ orgName, phone, buName, baseAddr, detailAddr, districtsStr });
        }
      } else {
        notifier.toast('기관 정보 저장에 실패했습니다: ' + (res?.error || '알 수 없는 오류'), 'error');
      }
    } catch (e) {
      console.error('[OrgBasicPane] 저장 오류:', e);
      notifier.toast('서버 통신 오류가 발생했습니다.', 'error');
    } finally {
      if (btnSaveBasic) {
        btnSaveBasic.disabled = false;
        btnSaveBasic.innerText = '수정 내용 저장';
      }
    }
  }
}
