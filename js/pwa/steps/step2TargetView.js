/**
 * @file step2TargetView.js
 * @description PWA 현장조사 Step 2: 대상자 기본정보 (게이트키퍼 원형 100% 일치)
 * - 지자체 배정(001 등): 인적사항 입력 차단(readonly) 및 터치 시 알림 패스스루
 * - 현장 발굴(N+ 난수): 인적사항 활성화 및 필수값 밸리데이션
 */

import { UidEngine } from '../../core/uid.js';
import { ApiClient } from '../../api/apiClient.js';
import { notifier } from '../../utils/notifier.js';
import { BUPYEONG_DONGS } from '../../data/bupyeongCoords.js';

const STORAGE_KEY_FIELD_LEDGER = 'wellrisk_field_uid_ledger';

export class Step2TargetView {
  constructor(mediator) {
    this.mediator = mediator;
    this.linkedHistory = null;
    this.hasCheckedHistoryForUid = null;
  }

  /**
   * 로컬 가명 채번 원장 조회 (PII 일체 배제, 오직 가명 UID와 발급일시만 보관)
   */
  getFieldLedger() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_FIELD_LEDGER) || localStorage.getItem('bupyeong_field_uid_ledger');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * 중복 없는 다음 순차 발굴 번호 채번 (단말기 대역 분리 반영: N1001~, N2001~)
   */
  getNextFieldSuffix() {
    const ledger = this.getFieldLedger();
    let baseSeq = 1000;
    try {
      const storedBase = localStorage.getItem('wellrisk_device_base_seq');
      if (storedBase && !isNaN(parseInt(storedBase, 10))) {
        baseSeq = parseInt(storedBase, 10);
      }
    } catch (e) {
      baseSeq = 1000;
    }

    let maxSeq = baseSeq;
    ledger.forEach((item) => {
      const num = parseInt(item.seq, 10);
      if (!isNaN(num) && num >= baseSeq && num < baseSeq + 1000) {
        if (num > maxSeq) {
          maxSeq = num;
        }
      }
    });

    const nextSeq = maxSeq + 1;
    const nextSuffix = `N${nextSeq}`;

    // 원장에 새 가명 번호 기록 (개인정보는 절대 저장하지 않음)
    ledger.push({
      suffix: nextSuffix,
      seq: nextSeq,
      issuedAt: new Date().toISOString()
    });

    try {
      localStorage.setItem(STORAGE_KEY_FIELD_LEDGER, JSON.stringify(ledger));
    } catch (e) {
      console.warn('로컬 가명 원장 저장 실패', e);
    }

    return nextSuffix;
  }

  /**
   * 이전 조사자료 실시간 조회 (개인정보 없이 관리번호 기반 과거 회차 및 활동내용 조회)
   */
  async fetchAndApplyCaseHistory(caseUid) {
    if (!caseUid) return;
    if (this.hasCheckedHistoryForUid === caseUid) {
      this.updateLinkedBanner();
      return;
    }
    this.hasCheckedHistoryForUid = caseUid;

    try {
      const res = await ApiClient.getCaseHistory(caseUid);
      if (res && res.success && Array.isArray(res.records) && res.records.length > 0) {
        this.linkedHistory = {
          totalRounds: res.records.length,
          nextRound: res.nextRound || (res.records.length + 1),
          records: res.records
        };

        // 활동관리카드 차수 및 이전 활동 이력 연동
        const act = this.mediator.state.activityCard;
        if (act) {
          if (act.currentEntry) {
            act.currentEntry.round = this.linkedHistory.nextRound;
          }
          act.records = res.records;
        }
      } else {
        this.linkedHistory = null;
        const act = this.mediator.state.activityCard;
        if (act && act.currentEntry) {
          act.currentEntry.round = 1;
        }
      }
    } catch (err) {
      this.linkedHistory = null;
    }

    this.updateLinkedBanner();
  }

  /**
   * 현장 발굴 연계 가구 식별 안내 배너 갱신
   */
  updateLinkedBanner() {
    const bannerArea = document.getElementById('linkedTargetBannerArea');
    if (!bannerArea) return;

    if (this.linkedHistory && this.linkedHistory.nextRound > 1) {
      bannerArea.innerHTML = `
        <div class="linked-target-alert-banner">
          <div class="linked-banner-title">현장 발굴 연계 가구</div>
          <div class="linked-banner-desc">
            이전 방문 조사가 완료된 가구입니다. 이번 방문은 <strong>[제 ${this.linkedHistory.nextRound}회차 모니터링]</strong>으로 진행됩니다.
          </div>
        </div>
      `;
    } else {
      bannerArea.innerHTML = '';
    }
  }

  /**
   * 현장 신규 발굴 가구(N+ 생성 또는 N 접두사 관리번호) 여부 판정
   * - N으로 시작하거나 영문 난수이면 100% 현장 신규 발굴
   * - 순수 숫자(001~999, 1001~) 또는 K(K1, K1001 등)로 시작하면 지자체 배정
   */
  isFieldDiscoveryTarget() {
    const t = this.mediator?.state?.targetProfile;
    const curUid = t?.caseUid || '';
    const parts = curUid.split('-');
    const suffix = (parts[parts.length - 1] || '').trim().toUpperCase();

    // N으로 시작하면 100% 현장 발굴
    if (suffix.startsWith('N') || t?.isFieldFound === true) {
      if (t) t.isFieldFound = true;
      return true;
    }
    // K로 시작하면 100% 지자체 사전 배정
    if (t) t.isFieldFound = false;
    return false;
  }

  render() {
    const container = document.getElementById('step2Container');
    if (!container) return;

    const b = this.mediator.state.basicInfo;
    const t = this.mediator.state.targetProfile;

    const casePrefix = 'C-28-237-01-';
    if (!t.caseUid) {
      t.caseUid = `${casePrefix}K1001`;
      this.mediator.updateSurveyUid();
    }

    const curUid = t.caseUid || `${casePrefix}K1001`;
    const suffix = curUid.startsWith(casePrefix) ? curUid.slice(casePrefix.length) : curUid.slice(-5);
    const isField = this.isFieldDiscoveryTarget();

    // 5자리 원형 박스용 문자 분배
    let paddedSuffix = suffix;
    if (/^\d+$/.test(suffix) && suffix.length < 5) {
      paddedSuffix = suffix.padStart(5, '0');
    }
    const suffixChars = paddedSuffix.padEnd(5, ' ').slice(0, 5).split('').map(c => c === ' ' ? '' : c);

    // 지자체 배정일 때는 인풋 입력 불가(readonly)
    const readOnlyAttr = isField ? '' : 'readonly';
    const readOnlyStyle = isField ? '' : 'background:#f8fafc; cursor:pointer; color:#64748b;';
    const placeholderMsg = isField ? '' : '지자체 배정 대상 (입력 불필요)';

    container.innerHTML = `
      <!-- 현장 발굴 연계 가구 식별 배너 영역 -->
      <div id="linkedTargetBannerArea"></div>

      <!-- 1. 실거주 주소지 (게이트키퍼 원형 100% 동일) -->
      <div class="pwa-card">
        <div class="card-header-bar">
          <span class="card-main-title">실거주 주소지</span>
          <div class="uid-header-group">
            <span class="uid-fixed-prefix"><span class="uid-label-text">관리번호 : </span>${casePrefix}</span>
            <div class="uid-circle-container" id="uidCirclesContainer">
              <input type="text" maxlength="1" id="uidCircle1" class="uid-circle-box" value="${suffixChars[0] || ''}" autocomplete="off" autocapitalize="characters" spellcheck="false" title="첫 번째 자리 (숫자 또는 K, N)">
              <input type="text" inputmode="numeric" maxlength="1" id="uidCircle2" class="uid-circle-box" value="${suffixChars[1] || ''}" autocomplete="off" title="두 번째 자리 (숫자)">
              <input type="text" inputmode="numeric" maxlength="1" id="uidCircle3" class="uid-circle-box" value="${suffixChars[2] || ''}" autocomplete="off" title="세 번째 자리 (숫자)">
              <input type="text" inputmode="numeric" maxlength="1" id="uidCircle4" class="uid-circle-box" value="${suffixChars[3] || ''}" autocomplete="off" title="네 번째 자리 (숫자)">
              <input type="text" inputmode="numeric" maxlength="1" id="uidCircle5" class="uid-circle-box" value="${suffixChars[4] || ''}" autocomplete="off" title="다섯 번째 자리 (숫자)">
            </div>
            <button type="button" id="btnNPlusCircle" class="btn-nplus-circle" title="현장 신규 번호 생성">N+</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">도로명 / 지번 주소 <span class="req">*</span></label>
          <div style="display: flex; gap: 6px; margin-bottom: 6px;">
            <input type="text" class="form-input" id="inputProfileBaseAddress" 
              value="${isField ? (t.baseAddress || '') : (t.baseAddress ? t.baseAddress : '')}" 
              placeholder="${isField ? '도로명 주소 검색' : placeholderMsg}" 
              readonly style="flex: 1; background: #f8fafc; cursor: pointer; ${!isField ? 'color:#64748b;' : ''}">
            <button type="button" class="btn-primary-action" id="btnSearchAddress" style="padding: 0 12px; min-height: 38px; font-size: 12px; white-space: nowrap;">
              주소 검색
            </button>
          </div>
          <input type="text" class="form-input" id="inputProfileDetailAddress" 
            value="${isField ? (t.detailAddress || '') : ''}" 
            placeholder="${isField ? '상세 주소 입력 (동·호수, 층, 반지하/옥탑 등)' : placeholderMsg}" 
            ${readOnlyAttr} style="${readOnlyStyle}">
        </div>
      </div>

      <!-- 2. 대상자 인적사항 (게이트키퍼 원형 100% 동일) -->
      <div class="pwa-card">
        <div class="card-header-bar">
          <span class="card-main-title">대상자 인적사항</span>
        </div>

        <div class="form-group">
          <label class="form-label">대상자 성명 <span class="req">*</span></label>
          <input type="text" class="form-input" id="inputProfileName" 
            value="${isField ? (t.targetName || '') : ''}" 
            placeholder="${isField ? '성명 입력' : placeholderMsg}" 
            autocomplete="off" ${readOnlyAttr} style="${readOnlyStyle}">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div class="form-group">
            <label class="form-label">생년월일 <span class="req">*</span></label>
            <input type="text" inputmode="numeric" maxlength="10" class="form-input" id="inputProfileBirth" 
              value="${isField ? (t.birth || '') : ''}" 
              placeholder="${isField ? '예: 1952-11-04 (숫자만 입력)' : '지자체 배정 대상'}" 
              autocomplete="off" ${readOnlyAttr} style="${readOnlyStyle}">
          </div>
          <div class="form-group">
            <label class="form-label">성별 <span class="req">*</span></label>
            <div style="display: flex; gap: 6px; height: 38px; align-items: center;">
              <button type="button" class="obs-btn-switch ${t.gender === '남' ? 'selected-clean' : ''}" id="btnGenderM" style="flex: 1; height: 100%; font-size: 12.5px;">남성</button>
              <button type="button" class="obs-btn-switch ${t.gender === '여' ? 'selected-clean' : ''}" id="btnGenderF" style="flex: 1; height: 100%; font-size: 12.5px;">여성</button>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">연락처 (전화번호) <span class="req">*</span></label>
          <input type="tel" inputmode="numeric" maxlength="13" class="form-input" id="inputProfilePhone" 
            value="${isField ? (t.phone || '') : ''}" 
            placeholder="${isField ? '예: 010-0000-0000 (숫자만 입력)' : '지자체 배정 대상'}" 
            autocomplete="off" ${readOnlyAttr} style="${readOnlyStyle}">
        </div>
      </div>

      <!-- 하단 네비게이션 버튼 -->
      <div class="btn-action-row" style="margin-bottom: 24px;">
        <button class="btn-secondary-action" id="btnBackToStep1">이전 (참여자)</button>
        <button class="btn-primary-action" id="btnNextToStep3">다음 (기초조사) ➔</button>
      </div>

      <!-- 카카오 주소 레이어 모달 -->
      <div id="kakaoPostcodeLayer" style="display:none; position:fixed; overflow:hidden; z-index:9999; -webkit-overflow-scrolling:touch; width:100%; height:100%; top:0; left:0; background:rgba(15,23,42,0.6); align-items:center; justify-content:center;">
        <div style="position:relative; width:92%; max-width:480px; height:500px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 20px 25px -5px rgba(0,0,0,0.3); display:flex; flex-direction:column;">
          <div style="background:#0f172a; color:#ffffff; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-weight:700; font-size:14px;">부평구 도로명 주소 검색</span>
            <button type="button" id="closePostcodeBtn" style="background:none; border:none; color:#ffffff; font-size:18px; cursor:pointer;">✕</button>
          </div>
          <div id="kakaoPostcodeContainer" style="flex:1; width:100%;"></div>
        </div>
      </div>
    `;

    this.bindEvents(casePrefix);
    this.fetchAndApplyCaseHistory(t.caseUid);
  }

  extractBupyeongDong(data) {
    if (data.bname && BUPYEONG_DONGS.includes(data.bname)) {
      return data.bname;
    }
    const full = `${data.roadAddress || ''} ${data.jibunAddress || ''} ${data.autoJibunAddress || ''}`;
    for (const dong of BUPYEONG_DONGS) {
      if (full.includes(dong)) return dong;
    }
    return '부평1동';
  }

  openKakaoPostcode() {
    const isField = this.isFieldDiscoveryTarget();
    if (!isField) {
      this.promptAssignedTargetAlert();
      return;
    }

    const layer = document.getElementById('kakaoPostcodeLayer');
    const container = document.getElementById('kakaoPostcodeContainer');
    const closeBtn = document.getElementById('closePostcodeBtn');

    if (!layer || !container || typeof daum === 'undefined' || !daum.Postcode) {
      notifier.toast('주소 검색 서비스를 불러올 수 없습니다. 인터넷 연결을 확인해 주십시오.', 'error');
      return;
    }

    closeBtn.onclick = () => { layer.style.display = 'none'; };
    container.innerHTML = '';

    new daum.Postcode({
      oncomplete: (data) => {
        let fullAddr = data.roadAddress || data.jibunAddress || '';
        let extraAddr = '';

        if (data.userSelectedType === 'R') {
          if (data.bname !== '' && /[동|로|가]$/g.test(data.bname)) {
            extraAddr += data.bname;
          }
          if (data.buildingName !== '' && data.apartment === 'Y') {
            extraAddr += (extraAddr !== '' ? `, ${data.buildingName}` : data.buildingName);
          }
          if (extraAddr !== '') {
            fullAddr += ` (${extraAddr})`;
          }
        }

        const isBupyeong = (data.sigungu && data.sigungu.includes('부평')) || fullAddr.includes('부평구');
        if (!isBupyeong) {
          notifier.toast('선택하신 주소는 인천 부평구 관할 구역이 아닙니다.', 'warning', 3000);
        }

        const extractedDong = this.extractBupyeongDong(data);
        const t = this.mediator.state.targetProfile;
        t.baseAddress = fullAddr;
        t.dong = extractedDong;

        const baseAddrEl = document.getElementById('inputProfileBaseAddress');
        if (baseAddrEl) baseAddrEl.value = fullAddr;

        const detailAddrEl = document.getElementById('inputProfileDetailAddress');
        if (detailAddrEl) detailAddrEl.focus();

        layer.style.display = 'none';
      },
      width: '100%',
      height: '100%'
    }).embed(container);

    layer.style.display = 'flex';
  }

  promptAssignedTargetAlert() {
    notifier.confirm({
      title: '지자체 배정 대상 확인',
      message: '지자체 배정 대상은 인적사항을 입력하지 않습니다. 다음 단계(기초조사)로 진행하시겠습니까?',
      confirmText: '확인',
      cancelText: '취소',
      onConfirm: () => {
        this.mediator.switchTab(3);
      }
    });
  }

  bindEvents(casePrefix) {
    const t = this.mediator.state.targetProfile;
    const isField = this.isFieldDiscoveryTarget();

    // 1) UID 5개 원형(동그라미) 입력창 및 밸리데이션
    const boxes = [1, 2, 3, 4, 5].map((i) => document.getElementById(`uidCircle${i}`));
    const syncUid = (forceRenderOnTypeChange = true) => {
      const fullSuffix = boxes.map((b) => (b ? b.value : '')).join('');
      const prevIsField = this.isFieldDiscoveryTarget();
      t.caseUid = `${casePrefix}${fullSuffix || 'K1001'}`;
      this.mediator.updateSurveyUid();
      const nowIsField = this.isFieldDiscoveryTarget();
      if (forceRenderOnTypeChange && prevIsField !== nowIsField) {
        this.render();
      } else if (fullSuffix.length === 5) {
        this.fetchAndApplyCaseHistory(t.caseUid);
      }
    };

    if (boxes[0]) {
      // 첫 번째 동그라미: 숫자 0~9, 영문 K, N만 허용
      boxes[0].addEventListener('input', (e) => {
        let val = (e.target.value || '').toUpperCase();
        if (val && !/^[KN]$/.test(val)) {
          boxes[0].value = '';
          notifier.toast('첫 자리는 배정(K) 또는 발굴(N)만 입력할 수 있습니다.', 'warning', 2500);
          syncUid(true);
          return;
        }
        boxes[0].value = val;
        syncUid(true);
        if (val && boxes[1]) {
          boxes[1].focus();
        }
      });
    }

    // 2~5번째 동그라미: 순수 숫자만 허용
    for (let i = 1; i < boxes.length; i++) {
      const box = boxes[i];
      if (box) {
        box.addEventListener('input', (e) => {
          box.value = e.target.value.replace(/[^0-9]/g, '');
          syncUid(true);
          if (box.value && boxes[i + 1]) {
            boxes[i + 1].focus();
          }
        });
      }
    }

    // 키보드 네비게이션 (백스페이스 시 이전 동그라미로 이동)
    boxes.forEach((box, idx) => {
      if (!box) return;

      box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !box.value && idx > 0 && boxes[idx - 1]) {
          e.preventDefault();
          boxes[idx - 1].value = '';
          boxes[idx - 1].focus();
          syncUid(true);
        } else if (e.key === 'ArrowLeft' && idx > 0 && boxes[idx - 1]) {
          boxes[idx - 1].focus();
        } else if (e.key === 'ArrowRight' && idx < boxes.length - 1 && boxes[idx + 1]) {
          boxes[idx + 1].focus();
        }
      });

      // 클립보드 붙여넣기 (최대 5글자 일괄 파싱)
      box.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text') || '';
        const clean = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        if (!clean) return;

        const chars = clean.slice(0, 5).split('');
        if (chars[0] && !/^[KN]$/.test(chars[0])) {
          notifier.toast('첫 자리는 배정(K) 또는 발굴(N)만 입력할 수 있습니다.', 'warning', 2500);
          chars[0] = '';
        }
        for (let j = 1; j < chars.length; j++) {
          if (!/^[0-9]$/.test(chars[j])) chars[j] = '';
        }

        chars.forEach((c, j) => {
          if (boxes[j]) boxes[j].value = c || '';
        });

        syncUid(true);
        const lastIdx = Math.min(chars.length, 4);
        if (boxes[lastIdx]) boxes[lastIdx].focus();
      });
    });

    // 2) ( N+ ) 원형 버튼: PWA 로컬 가명 원장 기반 N1001부터 중복 없는 순차 발굴 번호 채번
    const btnNPlus = document.getElementById('btnNPlusCircle');
    if (btnNPlus) {
      btnNPlus.addEventListener('click', () => {
        const nextSuffix = this.getNextFieldSuffix();
        const fullFieldUid = `${casePrefix}${nextSuffix}`;
        t.caseUid = fullFieldUid;
        t.isFieldFound = true;
        this.mediator.updateSurveyUid();

        // 신규 발굴 폼 비우기
        t.targetName = '';
        t.birth = '';
        t.gender = '';
        t.phone = '';
        t.baseAddress = '';
        t.detailAddress = '';

        this.render();
        notifier.toast(`현장 신규 관리번호 [${fullFieldUid}]가 채번되었습니다.`, 'info', 2500);
      });
    }

    // 3) 주소 검색 및 입력창 바인딩
    const btnSearchAddr = document.getElementById('btnSearchAddress');
    const baseAddrEl = document.getElementById('inputProfileBaseAddress');
    const detailAddrEl = document.getElementById('inputProfileDetailAddress');

    if (btnSearchAddr) btnSearchAddr.addEventListener('click', () => this.openKakaoPostcode());
    if (baseAddrEl) baseAddrEl.addEventListener('click', () => this.openKakaoPostcode());

    if (detailAddrEl) {
      if (!isField) {
        detailAddrEl.addEventListener('click', () => this.promptAssignedTargetAlert());
      } else {
        detailAddrEl.addEventListener('input', (e) => { t.detailAddress = e.target.value; });
      }
    }

    // 4) 대상자 성명 바인딩
    const nameEl = document.getElementById('inputProfileName');
    if (nameEl) {
      if (!isField) {
        nameEl.addEventListener('click', () => this.promptAssignedTargetAlert());
      } else {
        nameEl.addEventListener('input', (e) => { t.targetName = e.target.value; });
      }
    }

    // 생년월일 자동 하이픈 함수 (YYYY-MM-DD)
    const autoHyphenBirth = (raw) => {
      const nums = (raw || '').replace(/[^0-9]/g, '').slice(0, 8);
      if (nums.length <= 4) return nums;
      if (nums.length <= 6) return `${nums.slice(0, 4)}-${nums.slice(4)}`;
      return `${nums.slice(0, 4)}-${nums.slice(4, 6)}-${nums.slice(6, 8)}`;
    };

    // 전화번호 자동 하이픈 함수 (010-XXXX-XXXX / 02-XXX-XXXX / 032-XXX-XXXX)
    const autoHyphenPhone = (raw) => {
      const nums = (raw || '').replace(/[^0-9]/g, '').slice(0, 11);
      if (nums.startsWith('02')) {
        if (nums.length <= 2) return nums;
        if (nums.length <= 5) return `${nums.slice(0, 2)}-${nums.slice(2)}`;
        if (nums.length <= 9) return `${nums.slice(0, 2)}-${nums.slice(2, 5)}-${nums.slice(5)}`;
        return `${nums.slice(0, 2)}-${nums.slice(2, 6)}-${nums.slice(6, 10)}`;
      } else {
        if (nums.length <= 3) return nums;
        if (nums.length <= 6) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
        if (nums.length <= 10) return `${nums.slice(0, 3)}-${nums.slice(3, 6)}-${nums.slice(6)}`;
        return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7, 11)}`;
      }
    };

    // 5) 생년월일 바인딩
    const birthEl = document.getElementById('inputProfileBirth');
    if (birthEl) {
      if (!isField) {
        birthEl.addEventListener('click', () => this.promptAssignedTargetAlert());
      } else {
        birthEl.addEventListener('input', (e) => {
          const formatted = autoHyphenBirth(e.target.value);
          e.target.value = formatted;
          t.birth = formatted;
        });
      }
    }

    // 6) 성별 2단 토글 스위치 (obs-btn-switch)
    const btnM = document.getElementById('btnGenderM');
    const btnF = document.getElementById('btnGenderF');
    if (btnM && btnF) {
      if (!isField) {
        btnM.addEventListener('click', () => this.promptAssignedTargetAlert());
        btnF.addEventListener('click', () => this.promptAssignedTargetAlert());
      } else {
        btnM.addEventListener('click', () => {
          t.gender = '남';
          btnM.className = 'obs-btn-switch selected-clean';
          btnF.className = 'obs-btn-switch';
        });
        btnF.addEventListener('click', () => {
          t.gender = '여';
          btnF.className = 'obs-btn-switch selected-clean';
          btnM.className = 'obs-btn-switch';
        });
      }
    }

    // 7) 연락처 바인딩
    const phoneEl = document.getElementById('inputProfilePhone');
    if (phoneEl) {
      if (!isField) {
        phoneEl.addEventListener('click', () => this.promptAssignedTargetAlert());
      } else {
        phoneEl.addEventListener('input', (e) => {
          const formatted = autoHyphenPhone(e.target.value);
          e.target.value = formatted;
          t.phone = formatted;
        });
      }
    }

    // 8) 하단 이전 및 다음 버튼
    const btnBack = document.getElementById('btnBackToStep1');
    if (btnBack) {
      btnBack.addEventListener('click', () => this.mediator.switchTab(1));
    }

    const btnNext = document.getElementById('btnNextToStep3');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        // 1번: 지자체 배정 건 (끝 3자리가 순수 숫자 001~999)
        if (!this.isFieldDiscoveryTarget()) {
          this.promptAssignedTargetAlert();
          return;
        }

        // 2번: 현장 신규 발굴 건 (N+ 난수 번호) - 필수값 검증
        if (!t.baseAddress) {
          notifier.alert({
            title: '주소 입력 필요',
            message: '현장 신규 대상자의 도로명 주소를 검색해 주십시오.',
            confirmText: '확인'
          });
          return;
        }

        if (!t.targetName || t.targetName.trim().length < 2) {
          notifier.alert({
            title: '성명 입력 필요',
            message: '현장 신규 대상자의 성명을 2자 이상 입력해 주십시오.',
            confirmText: '확인'
          });
          return;
        }

        if (!t.gender) {
          notifier.alert({
            title: '성별 선택 필요',
            message: '대상자의 성별(남성/여성)을 선택해 주십시오.',
            confirmText: '확인'
          });
          return;
        }

        this.mediator.switchTab(3);
      });
    }
  }
}
