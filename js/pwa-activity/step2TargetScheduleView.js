/**
 * @file step2TargetScheduleView.js
 * @description 2단계 대상자 확인 뷰 (senior-caresafe/step2TargetView.js 100% 원본 계승) (ESM)
 */

// 배정 대상자 마스터 프리셋 (bupyeong-seniorcare K1001~ 5자리 배정 표준)
const ASSIGNED_TARGET_CASES = [
  {
    caseUid: 'C-28-237-01-K1001',
    seq: 'K1001',
    name: '김만석',
    birth: '480315',
    gender: '남',
    phone: '010-3849-2910',
    address: '인천 부평구 부평대로 168 302호',
    status: '정기방문'
  },
  {
    caseUid: 'C-28-237-01-K1002',
    seq: 'K1002',
    name: '이점순',
    birth: '521104',
    gender: '여',
    phone: '010-7712-4432',
    address: '인천 부평구 부흥로 334 104동 502호',
    status: '신규배정'
  },
  {
    caseUid: 'C-28-237-01-K1003',
    seq: 'K1003',
    name: '박성철',
    birth: '550720',
    gender: '남',
    phone: '010-5544-1122',
    address: '인천 부평구 원적로 12 1층',
    status: '집중안부'
  }
];

function maskName(name) {
  if (!name) return '';
  const str = name.trim();
  if (str.length <= 1) return str;
  if (str.length === 2) return str[0] + '*';
  return str[0] + '*'.repeat(str.length - 2) + str[str.length - 1];
}

function maskBirth(birth) {
  if (!birth) return '';
  const digits = String(birth).replace(/\D/g, '');
  if (digits.length >= 6) return digits.slice(0, 2) + '****';
  return birth;
}

function maskPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 11) return `${digits.slice(0, 3)}-****-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-***-${digits.slice(6)}`;
  return phone.replace(/(\d{2,3})-(\d{3,4})-(\d{4})/, '$1-****-$3');
}

function maskAddress(addr) {
  if (!addr) return '';
  const str = addr.trim();
  const match = str.match(/^(.+?[로|길|동|읍|면|가])(?:\s+.*)?$/);
  if (match) {
    return `${match[1]} *** ***`;
  }
  const parts = str.split(/\s+/);
  if (parts.length >= 3) {
    return `${parts.slice(0, 3).join(' ')} *** ***`;
  }
  return `${str} *** ***`;
}

function maskDetailAddress(detail) {
  if (!detail) return '';
  const str = detail.trim();
  return str.replace(/\d+/g, '***');
}

export class Step2TargetScheduleView {
  constructor(app) {
    this.app = app;
    this.rawTarget = {
      caseUid: '',
      seq: 'K1001',
      name: '',
      birth: '',
      age: 0,
      gender: '남',
      phone: '',
      address: '',
      baseAddress: '',
      detailAddress: ''
    };
  }

  calcAge(birth) {
    if (!birth || birth.length < 2) return 0;
    const rawDigits = birth.replace(/\D/g, '');
    const yy = rawDigits.slice(0, 2);
    if (!yy) return 0;
    const yearPrefix = parseInt(yy, 10) > 30 ? '19' : '20';
    const birthYear = parseInt(yearPrefix + yy, 10);
    const currentYear = new Date().getFullYear();
    return Math.max(0, currentYear - birthYear);
  }

  formatPhoneNumber(val) {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  render(container) {
    if (!container) return;

    const session = this.app.session;
    const orgCode = session.orgUid || 'O-28-237-01';
    const prefix = `${orgCode.replace(/^O-/, 'C-')}-`;

    if (!this.rawTarget.caseUid) {
      this.rawTarget.caseUid = `${prefix}K1001`;
    }

    const curUid = this.rawTarget.caseUid || `${prefix}K1001`;
    const suffix = curUid.startsWith(prefix) ? curUid.slice(prefix.length) : curUid.slice(-5);
    this.rawTarget.seq = suffix;
    let paddedSuffix = suffix;
    if (/^\d+$/.test(suffix) && suffix.length < 5) {
      paddedSuffix = suffix.padStart(5, '0');
    }
    const suffixChars = paddedSuffix.padEnd(5, ' ').slice(0, 5).split('').map(c => c === ' ' ? '' : c);
    const inspectorsStr = (session.participants || []).join(', ');

    // 기본 주소 및 상세 주소 분리
    if (!this.rawTarget.baseAddress && this.rawTarget.address) {
      const fullAddr = this.rawTarget.address.trim();
      const addrMatch = fullAddr.match(/^(.+?[로|길|동|읍|면|가]\s*\d+(?:-\d+)?)(?:\s+(.*))?$/);
      if (addrMatch) {
        this.rawTarget.baseAddress = addrMatch[1].trim();
        this.rawTarget.detailAddress = (addrMatch[2] || '').trim();
      } else {
        this.rawTarget.baseAddress = fullAddr;
        this.rawTarget.detailAddress = '';
      }
    }

    const displayName = maskName(this.rawTarget.name);
    const displayBirth = maskBirth(this.rawTarget.birth);
    const displayPhone = maskPhone(this.rawTarget.phone);
    const displayBaseAddress = maskAddress(this.rawTarget.baseAddress || this.rawTarget.address);
    const isAssigned = (this.rawTarget.seq || '').startsWith('K');
    const displayDetailAddress = isAssigned ? maskDetailAddress(this.rawTarget.detailAddress) : (this.rawTarget.detailAddress || '');

    container.innerHTML = `
      <!-- 1. 상단: 참여기관 및 활동 현황 요약 바 (독립 라운드 카드) -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-top: 4px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 13.5px; font-weight: 700; color: #0f172a;">${session.orgName || '기관설정'}</span>
          <span class="uid-badge">${orgCode}</span>
        </div>
        <div style="margin-top: 4px; font-size: 12px; color: #64748b;">
          <span>조사원: <strong style="color: #334155;">${inspectorsStr || '미등록'}</strong></span>
          <span style="margin: 0 4px; color: #cbd5e1;">|</span>
          <span style="font-weight: 600; color: #0f172a;">${session.buName || session.buCode || ''}</span>
        </div>
      </div>

      <!-- 2. 대상자 확인 카드 (정통 단일 카드) -->
      <div class="card-box" style="margin-top: 4px;">
        <div class="card-title">
          <span>대상자 확인</span>
          <span class="uid-badge" id="displayTargetCaseUid">${this.rawTarget.caseUid}</span>
        </div>

        <!-- 🛡️ 전사 5자리 원형 관리번호 (K/N 2대 표준) 툴바 (단일 행 콤팩트 밀착 배치) -->
        <div style="display: flex; align-items: center; justify-content: flex-start; margin-top: 2px; margin-bottom: 14px; background: #f8fafc; padding: 6px 8px; border-radius: 6px; border: 1px solid #e2e8f0; gap: 4px; flex-wrap: nowrap; overflow-x: auto;">
          <span class="uid-fixed-prefix"><span class="uid-label-text">관리번호 : </span>${prefix}</span>
          <div class="uid-circle-container" id="uidCirclesContainer">
            <input type="text" maxlength="1" id="uidCircle1" class="uid-circle-box" value="${suffixChars[0] || 'K'}" autocomplete="off" autocapitalize="characters" spellcheck="false" title="첫 번째 자리 (K 또는 N)">
            <input type="text" inputmode="numeric" maxlength="1" id="uidCircle2" class="uid-circle-box" value="${suffixChars[1] || '1'}" autocomplete="off" title="두 번째 자리 (숫자)">
            <input type="text" inputmode="numeric" maxlength="1" id="uidCircle3" class="uid-circle-box" value="${suffixChars[2] || '0'}" autocomplete="off" title="세 번째 자리 (숫자)">
            <input type="text" inputmode="numeric" maxlength="1" id="uidCircle4" class="uid-circle-box" value="${suffixChars[3] || '0'}" autocomplete="off" title="네 번째 자리 (숫자)">
            <input type="text" inputmode="numeric" maxlength="1" id="uidCircle5" class="uid-circle-box" value="${suffixChars[4] || '1'}" autocomplete="off" title="다섯 번째 자리 (숫자)">
          </div>
          <button type="button" id="btnGenFieldUid" class="btn-nplus-circle" title="현장 신규발굴 채번">N+</button>
          <button type="button" id="btnSearchUid" style="width: 25px; height: 25px; min-width: 25px; border-radius: 50%; padding: 0; font-size: 11px; font-weight: 700; background: #ecfdf5; border: 1.5px solid #6ee7b7; color: #047857; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; user-select: none;" title="배정 대상자 목록 조회">S</button>
          <button type="button" id="btnResetTargetForm" style="width: 25px; height: 25px; min-width: 25px; border-radius: 50%; padding: 0; font-size: 11px; font-weight: 700; background: #f1f5f9; border: 1.5px solid #cbd5e1; color: #475569; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; user-select: none;" title="관리번호 초기화">R</button>
        </div>

        <div class="form-group">
          <label class="form-label">어르신 성명 <span style="color:#b45309;">*</span></label>
          <input type="text" id="targetNameInput" class="form-input" placeholder="어르신 성함 입력 (S 버튼으로 조회)" value="${displayName}">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div class="form-group">
            <label class="form-label">생년월일 (마스킹)</label>
            <div style="display: flex; align-items: center; gap: 6px;">
              <input type="text" id="targetBirthInput" maxlength="6" placeholder="YYMMDD" class="form-input" value="${displayBirth}" style="flex: 1;">
              <span style="font-size: 12px; font-weight: 700; color: #475569; white-space: nowrap;">(<span id="targetAgeVal">${this.rawTarget.age || 0}</span>세)</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">성별</label>
            <div style="display: flex; gap: 6px;">
              <button type="button" class="obs-btn-switch ${this.rawTarget.gender === '남' ? 'active' : ''}" id="btnGenderM" style="flex: 1;">남성</button>
              <button type="button" class="obs-btn-switch ${this.rawTarget.gender === '여' ? 'active' : ''}" id="btnGenderF" style="flex: 1;">여성</button>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">연락처 (마스킹)</label>
          <input type="tel" id="targetPhoneInput" class="form-input" placeholder="010-****-0000" value="${displayPhone}">
        </div>

        <div class="form-group">
          <label class="form-label">거주지 주소 <span style="color:#b45309;">*</span></label>
          <div style="display: flex; gap: 8px;">
            <input type="text" id="targetBaseAddressInput" class="form-input" placeholder="도로명/지번 기본 주소" readonly style="flex: 1; background: #f8fafc; cursor: pointer;" value="${displayBaseAddress}">
            <button type="button" class="btn-secondary" id="btnSearchAddress" style="height: 42px; padding: 0 14px; font-size: 13px; font-weight: 600; width: auto; flex: initial; white-space: nowrap;">주소 검색</button>
          </div>
          <div style="margin-top: 6px;">
            <input type="text" id="targetDetailAddressInput" class="form-input" placeholder="상세주소 입력 (예: 101동 202호, 반지하 등)" value="${displayDetailAddress}">
          </div>
        </div>

        <div class="btn-action-row" style="margin-top: 20px;">
          <button type="button" class="btn-secondary" id="btnBackToStep1">이전 (기관설정)</button>
          <button type="button" class="btn-primary" id="btnNextToStep3">다음</button>
        </div>
      </div>

      <!-- 배정 대상자 조회 모달 팝업 -->
      <div id="targetSearchModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center; padding: 16px;">
        <div style="background: #ffffff; border-radius: 8px; max-width: 480px; width: 100%; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
          <div style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 15px; font-weight: 700; color: #0f172a;">배정 대상자 선택</span>
            <button type="button" id="btnCloseTargetModal" style="background: none; border: none; font-size: 20px; color: #64748b; cursor: pointer;">&times;</button>
          </div>
          <div id="targetModalList" style="padding: 12px 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
            <!-- 대상자 카드 목록 동적 렌더링 -->
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container, session, orgCode);
  }

  bindEvents(container, session, orgCode) {
    const caseUidBadge = container.querySelector('#displayTargetCaseUid');
    const btnSearchUid = container.querySelector('#btnSearchUid');
    const btnGenFieldUid = container.querySelector('#btnGenFieldUid');
    const btnResetTargetForm = container.querySelector('#btnResetTargetForm');

    const nameInput = container.querySelector('#targetNameInput');
    const birthInput = container.querySelector('#targetBirthInput');
    const ageVal = container.querySelector('#targetAgeVal');
    const btnGenderM = container.querySelector('#btnGenderM');
    const btnGenderF = container.querySelector('#btnGenderF');
    const phoneInput = container.querySelector('#targetPhoneInput');

    const baseAddrInput = container.querySelector('#targetBaseAddressInput');
    const detailAddrInput = container.querySelector('#targetDetailAddressInput');
    const btnSearchAddress = container.querySelector('#btnSearchAddress');

    const btnBackToStep1 = container.querySelector('#btnBackToStep1');
    const btnNextToStep3 = container.querySelector('#btnNextToStep3');

    const modal = container.querySelector('#targetSearchModal');
    const modalList = container.querySelector('#targetModalList');
    const btnCloseModal = container.querySelector('#btnCloseTargetModal');

    const prefix = `${orgCode.replace(/^O-/, 'C-')}-`;
    const boxes = [1, 2, 3, 4, 5].map((i) => container.querySelector(`#uidCircle${i}`));

    const syncUid = () => {
      const fullSuffix = boxes.map((b) => (b ? b.value : '')).join('');
      const full = `${prefix}${fullSuffix || 'K1001'}`;
      this.rawTarget.seq = fullSuffix || 'K1001';
      this.rawTarget.caseUid = full;
      if (caseUidBadge) caseUidBadge.textContent = full;
    };

    if (boxes[0]) {
      boxes[0].addEventListener('input', (e) => {
        let val = (e.target.value || '').toUpperCase();
        if (val && !/^[KN]$/.test(val)) {
          boxes[0].value = '';
          alert('첫 자리는 배정(K) 또는 발굴(N)만 입력할 수 있습니다.');
          syncUid();
          return;
        }
        boxes[0].value = val;
        syncUid();
        if (val && boxes[1]) boxes[1].focus();
      });
    }

    for (let i = 1; i < boxes.length; i++) {
      const box = boxes[i];
      if (box) {
        box.addEventListener('input', (e) => {
          box.value = e.target.value.replace(/[^0-9]/g, '');
          syncUid();
          if (box.value && boxes[i + 1]) boxes[i + 1].focus();
        });
      }
    }

    boxes.forEach((box, idx) => {
      if (!box) return;
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !box.value && idx > 0 && boxes[idx - 1]) {
          boxes[idx - 1].focus();
        }
      });
    });

    // 어르신 성명 입력 감지
    nameInput?.addEventListener('input', (e) => {
      if (!e.target.value.includes('*')) {
        this.rawTarget.name = e.target.value.trim();
      }
    });

    // 실시간 생년월일 입력 및 나이 계산
    birthInput?.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (val.includes('*')) return;
      if (val.length === 6 && /^\d{6}$/.test(val)) {
        const age = this.calcAge(val);
        if (ageVal) ageVal.textContent = age;
        this.rawTarget.age = age;
        this.rawTarget.birth = val;
      }
    });

    // 연락처 실시간 오토하이픈
    phoneInput?.addEventListener('input', (e) => {
      if (e.target.value.includes('*')) return;
      const formatted = this.formatPhoneNumber(e.target.value);
      e.target.value = formatted;
      this.rawTarget.phone = formatted;
    });

    const updateCombinedAddress = () => {
      const base = (this.rawTarget.baseAddress || '').trim();
      const detail = (this.rawTarget.detailAddress || '').trim();
      this.rawTarget.address = detail ? `${base} ${detail}` : base;
    };

    const openAddressSearch = () => {
      if (!window.daum || !window.daum.Postcode) {
        alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
        return;
      }

      new window.daum.Postcode({
        oncomplete: (data) => {
          let fullAddr = data.roadAddress || data.jibunAddress;
          let extraAddr = '';
          if (data.userSelectedType === 'R') {
            if (data.bname !== '' && /[동|로|가]$/g.test(data.bname)) extraAddr += data.bname;
            if (data.buildingName !== '' && data.apartment === 'Y') {
              extraAddr += (extraAddr !== '' ? `, ${data.buildingName}` : data.buildingName);
            }
            if (extraAddr !== '') fullAddr += ` (${extraAddr})`;
          }

          this.rawTarget.baseAddress = fullAddr;
          if (baseAddrInput) baseAddrInput.value = fullAddr;
          updateCombinedAddress();
          if (detailAddrInput) detailAddrInput.focus();
        }
      }).open();
    };

    btnSearchAddress?.addEventListener('click', openAddressSearch);
    baseAddrInput?.addEventListener('click', openAddressSearch);

    detailAddrInput?.addEventListener('input', (e) => {
      this.rawTarget.detailAddress = e.target.value.trim();
      updateCombinedAddress();
    });

    // (S) 배정 대상자 모달 열기
    btnSearchUid?.addEventListener('click', () => {
      modalList.innerHTML = '';
      ASSIGNED_TARGET_CASES.forEach((c) => {
        const item = document.createElement('div');
        item.style.padding = '12px';
        item.style.border = '1px solid #cbd5e1';
        item.style.borderRadius = '6px';
        item.style.cursor = 'pointer';
        item.style.background = '#f8fafc';
        item.style.transition = 'background-color 0.15s';

        item.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="color: #0f172a; font-size: 14px;">${maskName(c.name)} (${c.gender})</strong>
            <span class="uid-badge" style="font-size: 11px;">관리번호: ${c.seq}</span>
          </div>
          <div style="font-size: 12px; color: #475569;">${maskBirth(c.birth)} | ${maskPhone(c.phone)}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">${maskAddress(c.address)}</div>
        `;

        item.addEventListener('mouseenter', () => { item.style.backgroundColor = '#eff6ff'; });
        item.addEventListener('mouseleave', () => { item.style.backgroundColor = '#f8fafc'; });

        item.addEventListener('click', () => {
          this.rawTarget.name = c.name;
          this.rawTarget.birth = c.birth;
          this.rawTarget.age = this.calcAge(c.birth);
          this.rawTarget.gender = c.gender;
          this.rawTarget.phone = c.phone;
          this.rawTarget.address = c.address;
          this.rawTarget.baseAddress = '';
          this.rawTarget.detailAddress = '';
          this.rawTarget.seq = c.seq;
          this.rawTarget.caseUid = `${prefix}${c.seq}`;

          modal.style.display = 'none';
          this.render(container);
        });

        modalList.appendChild(item);
      });

      modal.style.display = 'flex';
    });

    btnCloseModal?.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // (N+) 현장 신규 발굴 5자리 자동 채번
    btnGenFieldUid?.addEventListener('click', () => {
      let ledger = [];
      try {
        const raw = localStorage.getItem('caresafe_field_uid_ledger');
        if (raw) ledger = JSON.parse(raw);
      } catch (e) { ledger = []; }
      let nextSeq = 1001;
      if (Array.isArray(ledger) && ledger.length > 0) {
        const maxSeq = ledger.reduce((max, item) => Math.max(max, item.seq || 0), 1000);
        nextSeq = maxSeq + 1;
      }
      const newSuffix = `N${nextSeq}`;
      ledger.push({ uid: `${prefix}${newSuffix}`, seq: nextSeq, issuedAt: new Date().toISOString() });
      try {
        localStorage.setItem('caresafe_field_uid_ledger', JSON.stringify(ledger));
      } catch (e) {}

      this.rawTarget.caseUid = `${prefix}${newSuffix}`;
      this.rawTarget.seq = newSuffix;
      this.rawTarget.name = '';
      this.rawTarget.birth = '';
      this.rawTarget.age = 0;
      this.rawTarget.phone = '';
      this.rawTarget.address = '';
      this.rawTarget.baseAddress = '';
      this.rawTarget.detailAddress = '';
      this.render(container);
    });

    // (R) 관리번호 리셋 (K1001)
    btnResetTargetForm?.addEventListener('click', () => {
      this.rawTarget.seq = 'K1001';
      this.rawTarget.caseUid = `${prefix}K1001`;
      this.rawTarget.name = '';
      this.rawTarget.birth = '';
      this.rawTarget.age = 0;
      this.rawTarget.phone = '';
      this.rawTarget.address = '';
      this.rawTarget.baseAddress = '';
      this.rawTarget.detailAddress = '';
      this.render(container);
    });

    // 성별 토글
    btnGenderM?.addEventListener('click', () => {
      btnGenderM.classList.add('active');
      btnGenderF.classList.remove('active');
      this.rawTarget.gender = '남';
    });
    btnGenderF?.addEventListener('click', () => {
      btnGenderF.classList.add('active');
      btnGenderM.classList.remove('active');
      this.rawTarget.gender = '여';
    });

    // 이전 (기관설정)
    btnBackToStep1?.addEventListener('click', () => {
      this.app.goToStep(1);
    });

    // 다음 (업무 및 보고)
    btnNextToStep3?.addEventListener('click', () => {
      if (!this.rawTarget.name && nameInput) {
        this.rawTarget.name = nameInput.value.trim();
      }
      if (!this.rawTarget.name) {
        alert('어르신 성명을 입력해 주세요. (S 버튼으로 조회 가능)');
        return;
      }
      this.app.currentTarget = { ...this.rawTarget };
      this.app.goToStep(3);
    });
  }
}
