import { HOUSING_TYPES } from '../../config/constants.js';
import { maskPhone, maskAddress, maskName, maskBirth } from '../../utils/mask.js';
import { ValidationService } from '../../services/validationService.js';
import { AssignmentService } from '../../services/assignmentService.js';
import { notifier } from '../../utils/notifier.js';
import { UidEngine } from '../../core/uid.js';

export class Step2TargetView {
  constructor(mediator) {
    this.mediator = mediator;
    this.selectedTargetMeta = null;
    this.guardianCollapsed = false; // 보호자 아코디언 접힘 상태
    this.housingCollapsed = false;  // 거주지 유형 아코디언 접힘 상태
  }

  /**
   * 현장 신규 발굴 가구(N+ 생성 또는 난수 관리번호) 여부 판정
   */
  isFieldDiscoveryTarget() {
    const meta = this.selectedTargetMeta;
    if (meta && meta.caseStatus === 'FIELD_DISCOVERY') return true;
    const b = this.mediator?.state?.basicInfo;
    const curUid = b?.caseUid || '';
    const parts = curUid.split('-');
    const suffix = (parts[parts.length - 1] || '').trim().toUpperCase();
    return suffix.startsWith('N');
  }

  getFieldLedger() {
    try {
      const data = localStorage.getItem('wellrisk_field_uid_ledger');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  getNextFieldSuffix() {
    const ledger = this.getFieldLedger();
    let maxSeq = 1000;
    ledger.forEach((item) => {
      const num = parseInt(item.seq, 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    });

    const nextSeq = maxSeq + 1;
    const nextSuffix = `N${nextSeq}`;

    ledger.push({
      suffix: nextSuffix,
      seq: nextSeq,
      issuedAt: new Date().toISOString()
    });

    try {
      localStorage.setItem('wellrisk_field_uid_ledger', JSON.stringify(ledger));
    } catch (e) {
      console.warn('가명 원장 저장 실패', e);
    }

    return nextSuffix;
  }

  render() {
    const container = document.getElementById('step2Container');
    if (!container) return;

    const b = this.mediator.state.basicInfo;
    const p = this.mediator.state.targetProfile;
    if (!p.guardian) {
      p.guardian = {
        hasGuardian: null,
        relation: '자녀',
        name: '',
        phone: '',
        address: '',
        isProxySigner: false
      };
    }
    const g = p.guardian;
    const meta = this.selectedTargetMeta;

    const orgSuffix = b.orgCode ? b.orgCode.replace(/^O-/, '') : '28-237-01';
    const casePrefix = `C-${orgSuffix}-`;
    const curUid = b.caseUid || `${casePrefix}K1001`;
    const suffix = curUid.startsWith(casePrefix) ? curUid.slice(casePrefix.length) : curUid.slice(-5);

    let paddedSuffix = suffix;
    if (/^\d+$/.test(suffix) && suffix.length < 5) {
      paddedSuffix = suffix.padStart(5, '0');
    }
    const suffixChars = paddedSuffix.padEnd(5, ' ').slice(0, 5).split('').map(c => c === ' ' ? '' : c);

    const GUARDIAN_RELATIONS = ['자녀', '형제/자매', '친척', '이웃/지인', '후견인', '기타'];
    const isField = this.isFieldDiscoveryTarget();

    container.innerHTML = `
      <!-- 1. 실거주 주소지 -->
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
            <input type="text" class="form-input" id="inputProfileBaseAddress" value="${p.baseAddress || p.address || ''}" placeholder="도로명 주소 검색 또는 배정 가구 선택" readonly style="flex: 1; background: #f8fafc; cursor: pointer;">
            <button type="button" class="btn-primary-action" id="btnSearchAddress" style="padding: 0 12px; min-height: 38px; font-size: 12px; white-space: nowrap;">
              주소 검색
            </button>
            <button type="button" class="btn-secondary-action" id="btnOpenAssignModal" style="padding: 0 10px; min-height: 38px; font-size: 12px; white-space: nowrap;">
              배정 가구 (3)
            </button>
          </div>
          <input type="text" class="form-input" id="inputProfileDetailAddress" value="${p.detailAddress || ''}" placeholder="상세 주소 입력 (동·호수, 층, 반지하/옥탑 등)">
        </div>

        <!-- 주소 매칭된 배정 가구 또는 N+ 현장 신규 배너 -->
        <div id="addrMatchedCaseBanner" style="display: ${meta ? 'block' : 'none'}; margin-top: 10px;">
          ${meta ? (meta.caseStatus === 'FIELD_DISCOVERY' ? `
            <div style="background:#fff7ed; border:1px solid #fdba74; border-radius:8px; padding:10px 12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span class="circle-round-badge" style="background:#ea580c; color:#ffffff; font-weight:800; font-size:11.5px; padding:2px 7px;">N+</span>
                  <strong style="font-size:13.5px; color:#c2410c;">현장 신규 대상자</strong>
                </div>
                <span class="uid-badge" style="font-family:monospace; background:#ffedd5; color:#9a3412; border:1px solid #fed7aa; font-weight:700;">${b.caseUid}</span>
              </div>
              <div style="font-size:11.5px; color:#9a3412; line-height:1.5; margin-top:4px;">
                * 실거주 주소와 인적사항을 직접 입력해 주세요.
              </div>
            </div>
          ` : `
            <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:10px 12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span class="circle-round-badge ${meta.caseStatus === 'NEW_SURVEY' ? 'new' : ''}">
                    ${meta.caseStatus === 'NEW_SURVEY' ? 'N' : (meta.revisitCount || 2)}
                  </span>
                  <strong style="font-size:13.5px; color:#0f172a;">${maskName(meta.targetName)}</strong>
                  <span style="font-size:11.5px; color:#64748b;">(${meta.gender === 'M' ? '남' : '여'}, ${maskBirth(meta.birth)})</span>
                </div>
                <span class="uid-badge" style="font-family:monospace;">${meta.householdId}</span>
              </div>
              <div style="font-size:11px; color:#475569; margin-bottom:8px;">
                상태: <strong>${meta.previousGrade || '신규 배정 대상'}</strong> (${meta.previousSurveyDate || '신규'})
              </div>
              <button type="button" class="btn-primary-action" id="btnApplyMatchedTarget" style="width:100%; min-height:34px; font-size:11.5px; padding:6px;">
                이 배정 가구 정보 자동 채우기
              </button>
            </div>
          `) : ''}
        </div>
      </div>

      <!-- 배정 가구 모노톤 모달 팝업 레이어 -->
      <div class="assign-modal-overlay" id="assignModalOverlay" style="display:none;">
        <div class="assign-modal-content">
          <div class="assign-modal-header">
            <span class="assign-modal-title">오늘의 안부살핌 배정 가구</span>
            <button type="button" id="btnCloseAssignModal" style="background:none; border:none; font-size:18px; color:#64748b; cursor:pointer; padding:0 4px;">✕</button>
          </div>
          <div class="assign-modal-body">
            <div style="font-size:11.5px; color:#64748b; margin-bottom:4px;">
              * 원하시는 가구를 선택하시면 주소와 정보가 즉시 로드됩니다.
            </div>
            
            <div class="assign-modal-item" data-assign-id="C-28-237-01-002">
              <span class="circle-round-badge new">N</span>
              <div style="flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <strong style="font-size:13px; color:#0f172a;">${maskName('이점순')}</strong>
                  <span style="font-size:10.5px; color:#64748b;">신규 1차 방문</span>
                </div>
                <div style="font-size:11px; color:#475569; margin-top:2px;">인천 부평구 봉오재3로 94 104동 502호</div>
              </div>
            </div>

            <div class="assign-modal-item" data-assign-id="C-28-237-01-001">
              <span class="circle-round-badge">2</span>
              <div style="flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <strong style="font-size:13px; color:#0f172a;">${maskName('김만석')}</strong>
                  <span style="font-size:10.5px; color:#475569;">2차 안부 (고위험 9점)</span>
                </div>
                <div style="font-size:11px; color:#475569; margin-top:2px;">인천 부평구 서곶로 284 302호</div>
              </div>
            </div>

            <div class="assign-modal-item" data-assign-id="C-28-237-01-003">
              <span class="circle-round-badge">3</span>
              <div style="flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <strong style="font-size:13px; color:#0f172a;">${maskName('박성철')}</strong>
                  <span style="font-size:10.5px; color:#475569;">3차 안부 (중위험 5점)</span>
                </div>
                <div style="font-size:11px; color:#475569; margin-top:2px;">인천 부평구 원적로 12 1층</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. 대상자 인적사항 -->
      <div class="pwa-card">
        <div class="card-header-bar">
          <span class="card-main-title">대상자 인적사항</span>
        </div>

        <div class="form-group">
          <label class="form-label">대상자 성명 <span class="req">*</span></label>
          <input type="text" class="form-input" id="inputProfileName" value="${p.name ? (isField ? p.name : maskName(p.name)) : ''}" placeholder="성명 입력" autocomplete="off">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div class="form-group">
            <label class="form-label">생년월일 <span class="req">*</span></label>
            <input type="text" class="form-input" id="inputProfileBirth" value="${p.birth ? (isField ? p.birth : maskBirth(p.birth)) : ''}" placeholder="예: 1952-**-** (또는 1952-11-04)" autocomplete="off">
          </div>
          <div class="form-group">
            <label class="form-label">성별 <span class="req">*</span></label>
            <div style="display: flex; gap: 6px; height: 38px; align-items: center;">
              <button type="button" class="obs-btn-switch ${p.gender === '남' ? 'selected-clean' : ''}" id="btnGenderM" style="flex: 1; height: 100%; font-size: 12.5px;">남성</button>
              <button type="button" class="obs-btn-switch ${p.gender === '여' ? 'selected-clean' : ''}" id="btnGenderF" style="flex: 1; height: 100%; font-size: 12.5px;">여성</button>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">연락처 (전화번호) <span class="req">*</span></label>
          <input type="text" class="form-input" id="inputProfilePhone" value="${p.phone ? (isField ? p.phone : maskPhone(p.phone)) : ''}" placeholder="010-0000-0000">
        </div>
      </div>

      <!-- 3. 보호자 및 비상연락망 (아코디언 접기/펴기 지원) -->
      <div class="pwa-card">
        <div class="card-header-bar accordion-toggle-header" id="btnToggleGuardianAccordion" style="cursor:pointer;">
          <span class="card-main-title">보호자 및 비상연락망</span>
          <span class="accordion-indicator" id="guardianToggleIndicator">
            ${this.guardianCollapsed ? '펼치기 ▼' : '접기 ▲'}
          </span>
        </div>

        <div id="guardianCardBody" style="${this.guardianCollapsed ? 'display:none;' : 'display:block;'}">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; margin-top: 4px;">
            <button type="button" class="obs-btn-switch ${g.hasGuardian === true ? 'selected-clean' : ''}" id="btnHasGuardianTrue" style="padding: 10px; font-size: 12.5px;">
              [있음] 보호자 등록
            </button>
            <button type="button" class="obs-btn-switch ${g.hasGuardian === false ? 'selected-clean' : ''}" id="btnHasGuardianFalse" style="padding: 10px; font-size: 12.5px;">
              [없음] 무연고 / 단절
            </button>
          </div>

          <!-- 보호자 등록 폼 -->
          <div class="guardian-box" id="guardianDetailBox" style="${g.hasGuardian === true ? 'display: block;' : 'display: none;'}">
            <div class="form-group">
              <label class="form-label">대상자와의 관계 <span class="req">*</span></label>
              <div class="guardian-relation-grid">
                ${GUARDIAN_RELATIONS.map(rel => `
                  <div class="guardian-rel-chip ${g.relation === rel ? 'selected' : ''}" data-rel="${rel}">
                    ${rel}
                  </div>
                `).join('')}
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div class="form-group">
                <label class="form-label">보호자 성명 <span class="req">*</span></label>
                <input type="text" class="form-input" id="inputGuardianName" value="${g.name ? (isField ? g.name : maskName(g.name)) : ''}" placeholder="성명 입력">
              </div>
              <div class="form-group">
                <label class="form-label">보호자 연락처 <span class="req">*</span></label>
                <input type="text" class="form-input" id="inputGuardianPhone" value="${g.phone ? (isField ? g.phone : maskPhone(g.phone)) : ''}" placeholder="010-0000-0000">
              </div>
            </div>

            <div class="proxy-signer-toggle-wrap">
              <input type="checkbox" id="chkProxySigner" ${g.isProxySigner === true ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;">
              <label for="chkProxySigner">
                대상자 본인 서명 불가 (치매·거동불능 등으로 보호자 대리 서명 진행)
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. 거주지 유형 (10종) (아코디언 접기/펴기 지원) -->
      <div class="pwa-card">
        <div class="card-header-bar accordion-toggle-header" id="btnToggleHousingAccordion" style="cursor:pointer;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="card-main-title">거주지 유형</span>
            ${p.housingType ? `<span style="font-size: 13px; color: #ea580c; font-weight: 700;">(${p.housingType}${p.housingType === '직접기재' && p.housingCustom ? `: ${p.housingCustom}` : ''})</span>` : '<span style="font-size: 11px; color: var(--navy-500); font-weight: 600;">단일 선택 <span class="req">*</span></span>'}
          </div>
          <span class="accordion-indicator" id="housingToggleIndicator">
            ${this.housingCollapsed ? '펼치기 ▼' : '접기 ▲'}
          </span>
        </div>

        <div id="housingCardBody" style="${this.housingCollapsed ? 'display:none;' : 'display:block;'}">
          <div class="housing-chip-grid" id="housingChipContainer">
            ${HOUSING_TYPES.map(t => `
              <div class="housing-chip ${p.housingType === t && p.housingType !== '' ? 'selected' : ''}" data-type="${t}">
                ${t}
              </div>
            `).join('')}
          </div>

          <div class="form-group" id="housingCustomGroup" style="margin-top: 10px; display: ${p.housingType === '직접기재' ? 'block' : 'none'};">
            <label class="form-label">거주지 직접 기재 <span class="req">*</span></label>
            <input type="text" class="form-input" id="inputHousingCustom" value="${p.housingCustom || ''}" placeholder="예: 비닐하우스, 컨테이너 등 상세 기재">
          </div>
        </div>
      </div>

      <!-- 하단 네비게이션 액션 버튼 (카드 분리) -->
      <div class="btn-action-row" style="${meta && meta.caseStatus === 'REVISIT' ? 'display: flex; gap: 6px; margin-top: 18px; margin-bottom: 24px;' : 'margin-bottom: 24px;'}">
        ${meta && meta.caseStatus === 'REVISIT' ? `
          <button class="btn-secondary-action" id="btnBackToStep1" style="flex: 1; padding: 10px 4px; font-size: 12px; white-space: nowrap; background: #ffffff; border: 1px solid #cbd5e1; color: #334155;">
            이전
          </button>
          <button class="btn-secondary-action" id="btnNextToStep3" style="flex: 1; padding: 10px 4px; font-size: 12px; white-space: nowrap; background: #ffffff; border: 1px solid #cbd5e1; color: #334155;">
            재관찰
          </button>
          <button class="btn-primary-action" id="btnGoToRevisit" style="flex: 1.3; padding: 10px 6px; font-size: 12px; white-space: nowrap; background: #334155; color: #ffffff;">
            방문(재)카드
          </button>
        ` : `
          <button class="btn-secondary-action" id="btnBackToStep1">이전 단계</button>
          <button class="btn-primary-action" id="btnNextToStep3">다음 (관찰기록 확인)</button>
        `}
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const p = this.mediator.state.targetProfile;
    const g = p.guardian;
    const b = this.mediator.state.basicInfo;

    // 1) 3개 사각 박스 [ ][ ][ ] 직접 입력 및 자동 포커스 이동
    const orgSuffix = b.orgCode ? b.orgCode.replace(/^O-/, '') : '28-237-01';
    const casePrefix = `C-${orgSuffix}-`;
    const box1 = document.getElementById('uidBox1');
    const box2 = document.getElementById('uidBox2');
    const box3 = document.getElementById('uidBox3');
    const boxes = [box1, box2, box3];

    const syncCaseUidFromBoxes = () => {
      const v1 = (box1?.value || '').trim().toUpperCase();
      const v2 = (box2?.value || '').trim().toUpperCase();
      const v3 = (box3?.value || '').trim().toUpperCase();
      const seq = `${v1}${v2}${v3}`;
      if (seq.length === 3) {
        const fullUid = `${casePrefix}${seq}`;
        b.caseUid = fullUid;
        b.householdId = fullUid;
        b.rawSurveyUid = UidEngine.generateDatedSurveyUid(fullUid, b.inspectionDate);
      }
    };

    boxes.forEach((box, idx) => {
      if (!box) return;

      box.addEventListener('input', (e) => {
        const clean = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        e.target.value = clean.slice(-1);

        if (e.target.value && idx < 2) {
          boxes[idx + 1].focus();
          boxes[idx + 1].select();
        }
        syncCaseUidFromBoxes();
      });

      box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !box.value && idx > 0) {
          boxes[idx - 1].focus();
        }
      });

      box.addEventListener('focus', () => {
        box.select();
      });
    });

    // 2) ( N+ ) 원형 버튼 터치 시 3자리 난수 생성 및 신규 폼 진입
    const btnNPlus = document.getElementById('btnNPlusCircle');
    if (btnNPlus) {
      btnNPlus.addEventListener('click', () => {
        const newUid = UidEngine.generateFieldCaseUid(b.orgCode);
        b.caseUid = newUid;
        b.householdId = newUid;
        b.rawSurveyUid = UidEngine.generateDatedSurveyUid(newUid, b.inspectionDate);

        this.selectedTargetMeta = {
          householdId: newUid,
          caseUid: newUid,
          caseStatus: 'FIELD_DISCOVERY',
          targetName: '',
          birth: '',
          gender: '',
          phone: '',
          address: '',
          housingType: ''
        };

        // 기존 폼 입력 내용 비우기 (새 어르신 주소 및 인적사항 직접 기재)
        p.name = '';
        p.birth = '';
        p.gender = '';
        p.phone = '';
        p.address = '';
        p.baseAddress = '';
        p.detailAddress = '';
        p.housingType = '';
        p.housingCustom = '';
        p.guardian = {
          hasGuardian: null,
          relation: '자녀',
          name: '',
          phone: '',
          address: '',
          isProxySigner: false
        };

        this.render();
        notifier.toast(`신규 관리번호 [${newUid}]가 생성되었습니다.`, 'success', 2500);
      });
    }

    // 배정 가구 모노톤 모달 열기/닫기/선택 이벤트
    const btnOpenModal = document.getElementById('btnOpenAssignModal');
    const modalOverlay = document.getElementById('assignModalOverlay');
    const btnCloseModal = document.getElementById('btnCloseAssignModal');

    if (btnOpenModal && modalOverlay) {
      btnOpenModal.addEventListener('click', () => {
        modalOverlay.style.display = 'flex';
      });
    }

    if (btnCloseModal && modalOverlay) {
      btnCloseModal.addEventListener('click', () => {
        modalOverlay.style.display = 'none';
      });
    }

    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
          modalOverlay.style.display = 'none';
        }
      });
    }

    // 모달 내 배정 가구 아이템 선택 이벤트
    document.querySelectorAll('.assign-modal-item[data-assign-id]').forEach(item => {
      item.addEventListener('click', async () => {
        const hid = item.getAttribute('data-assign-id');
        const cases = await AssignmentService.getAssignedCases(b.orgCode, '박영희');
        const chosen = cases.find(c => c.householdId === hid);
        if (!chosen) return;

        this.selectedTargetMeta = chosen;
        p.name = chosen.targetName;
        p.birth = chosen.birth;
        p.gender = chosen.gender === 'M' ? '남' : '여';
        p.phone = chosen.phone;
        p.address = chosen.address;
        p.baseAddress = chosen.address;
        p.detailAddress = '';
        p.housingType = chosen.housingType || '';

        if (chosen.guardian) {
          p.guardian.hasGuardian = true;
          p.guardian.relation = chosen.guardian.relation;
          p.guardian.name = chosen.guardian.name;
          p.guardian.phone = chosen.guardian.phone;
          p.guardian.isProxySigner = chosen.guardian.isProxySigner || false;
        } else {
          p.guardian.hasGuardian = false;
        }

        b.caseUid = chosen.caseUid || b.caseUid;
        b.householdId = chosen.householdId;

        if (modalOverlay) modalOverlay.style.display = 'none';
        this.render();
        notifier.toast(`[${chosen.targetName}] 가구가 선택되었습니다. (${chosen.caseStatus === 'REVISIT' ? '정기 안부 점검 대상' : '신규 1차 방문'})`, 'info', 2500);
      });
    });

    // 대상자 성명 스마트 마스킹
    const nameEl = document.getElementById('inputProfileName');
    if (nameEl) {
      nameEl.addEventListener('focus', () => { nameEl.value = p.name || ''; });
      nameEl.addEventListener('blur', () => { nameEl.value = p.name ? (this.isFieldDiscoveryTarget() ? p.name : maskName(p.name)) : ''; });
      nameEl.addEventListener('input', (e) => { p.name = e.target.value; });
    }

    // 정기 안부 점검(299p)으로 바로 이동 버튼
    const btnGoRevisit = document.getElementById('btnGoToRevisit');
    if (btnGoRevisit && this.selectedTargetMeta) {
      btnGoRevisit.addEventListener('click', () => {
        this.mediator.startRevisit(this.selectedTargetMeta);
      });
    }

    // 매칭된 배정 가구 정보 자동 채우기 버튼
    const btnApply = document.getElementById('btnApplyMatchedTarget');
    if (btnApply && this.selectedTargetMeta) {
      btnApply.addEventListener('click', () => {
        const chosen = this.selectedTargetMeta;
        p.name = chosen.targetName;
        p.birth = chosen.birth;
        p.gender = chosen.gender === 'M' ? '남' : '여';
        p.phone = chosen.phone;
        p.housingType = chosen.housingType || '';

        if (chosen.guardian) {
          p.guardian.hasGuardian = true;
          p.guardian.relation = chosen.guardian.relation;
          p.guardian.name = chosen.guardian.name;
          p.guardian.phone = chosen.guardian.phone;
          p.guardian.isProxySigner = chosen.guardian.isProxySigner || false;
        } else {
          p.guardian.hasGuardian = false;
        }

        b.caseUid = chosen.caseUid || b.caseUid;
        b.householdId = chosen.householdId;

        this.render();
        notifier.toast(`[${chosen.targetName}] 배정 가구 정보가 성공적으로 채워졌습니다.`, 'success', 2500);
      });
    }

    const birthEl = document.getElementById('inputProfileBirth');
    if (birthEl) {
      birthEl.addEventListener('focus', () => { birthEl.value = p.birth || ''; });
      birthEl.addEventListener('blur', () => { birthEl.value = p.birth ? (this.isFieldDiscoveryTarget() ? p.birth : maskBirth(p.birth)) : ''; });
      birthEl.addEventListener('input', (e) => { p.birth = e.target.value; });
    }

    const btnM = document.getElementById('btnGenderM');
    const btnF = document.getElementById('btnGenderF');
    if (btnM && btnF) {
      btnM.addEventListener('click', () => {
        p.gender = '남';
        btnM.className = 'obs-btn-switch selected-clean';
        btnF.className = 'obs-btn-switch';
      });
      btnF.addEventListener('click', () => {
        p.gender = '여';
        btnF.className = 'obs-btn-switch selected-clean';
        btnM.className = 'obs-btn-switch';
      });
    }

    const phoneEl = document.getElementById('inputProfilePhone');
    if (phoneEl) {
      phoneEl.addEventListener('focus', () => { phoneEl.value = p.phone || ''; });
      phoneEl.addEventListener('blur', () => { phoneEl.value = p.phone ? (this.isFieldDiscoveryTarget() ? p.phone : maskPhone(p.phone)) : ''; });
      phoneEl.addEventListener('input', (e) => { p.phone = e.target.value; });
    }

    // 카카오 우편번호/도로명 주소 검색 바인딩 (주소 선행 D1 핀포인트 쿼리)
    const baseAddrEl = document.getElementById('inputProfileBaseAddress');
    const detailAddrEl = document.getElementById('inputProfileDetailAddress');
    const btnSearchAddr = document.getElementById('btnSearchAddress');

    const updateCombinedAddress = () => {
      const base = (p.baseAddress || '').trim();
      const detail = (p.detailAddress || '').trim();
      p.address = detail ? `${base} ${detail}` : base;
    };

    const openAddressSearch = () => {
      if (!window.daum || !window.daum.Postcode) {
        notifier.alert({
          title: '주소 서비스 연결 중',
          message: '카카오 주소 검색 서비스가 로드되지 않았습니다. 인터넷 연결을 확인해 주십시오.',
          confirmText: '확인'
        });
        return;
      }

      new window.daum.Postcode({
        oncomplete: async (data) => {
          let fullAddr = data.roadAddress || data.jibunAddress;
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

          p.baseAddress = fullAddr;
          if (baseAddrEl) baseAddrEl.value = fullAddr;
          updateCombinedAddress();

          // D1 주소 기반 핀포인트 가구 매칭 쿼리 실행
          const matched = await AssignmentService.searchTargetByAddress(b.orgCode, fullAddr);
          if (matched && matched.length > 0) {
            this.selectedTargetMeta = matched[0];
            this.render();
            notifier.toast(`해당 주소지에 배정된 대상자 [${matched[0].targetName}] 가구가 발견되었습니다.`, 'info', 3500);
          } else {
            this.selectedTargetMeta = null;
            this.render();
            if (detailAddrEl) detailAddrEl.focus();
          }
        }
      }).open();
    };

    if (btnSearchAddr) btnSearchAddr.addEventListener('click', openAddressSearch);
    if (baseAddrEl) baseAddrEl.addEventListener('click', openAddressSearch);

    if (detailAddrEl) {
      detailAddrEl.addEventListener('input', (e) => {
        p.detailAddress = e.target.value;
        updateCombinedAddress();
      });
    }

    // 보호자 카드 아코디언 접기/펴기 토글 이벤트
    const btnToggleGuardian = document.getElementById('btnToggleGuardianAccordion');
    const guardianBody = document.getElementById('guardianCardBody');
    const guardianInd = document.getElementById('guardianToggleIndicator');

    if (btnToggleGuardian && guardianBody && guardianInd) {
      btnToggleGuardian.addEventListener('click', () => {
        this.guardianCollapsed = !this.guardianCollapsed;
        guardianBody.style.display = this.guardianCollapsed ? 'none' : 'block';
        guardianInd.innerText = this.guardianCollapsed ? '펼치기 ▼' : '접기 ▲';
      });
    }

    // 보호자 유무 선택 버튼
    const btnGTrue = document.getElementById('btnHasGuardianTrue');
    const btnGFalse = document.getElementById('btnHasGuardianFalse');
    const gDetailBox = document.getElementById('guardianDetailBox');

    if (btnGTrue) {
      btnGTrue.addEventListener('click', () => {
        g.hasGuardian = true;
        this.render();
      });
    }

    if (btnGFalse) {
      btnGFalse.addEventListener('click', () => {
        g.hasGuardian = false;
        g.isProxySigner = false;
        this.render();
      });
    }

    // 보호자 관계 칩 선택
    document.querySelectorAll('.guardian-rel-chip[data-rel]').forEach(chip => {
      chip.addEventListener('click', () => {
        const rel = chip.getAttribute('data-rel');
        g.relation = rel;
        document.querySelectorAll('.guardian-rel-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
      });
    });

    const gNameEl = document.getElementById('inputGuardianName');
    if (gNameEl) {
      gNameEl.addEventListener('focus', () => { gNameEl.value = g.name || ''; });
      gNameEl.addEventListener('blur', () => { gNameEl.value = g.name ? (this.isFieldDiscoveryTarget() ? g.name : maskName(g.name)) : ''; });
      gNameEl.addEventListener('input', (e) => { g.name = e.target.value; });
    }

    const gPhoneEl = document.getElementById('inputGuardianPhone');
    if (gPhoneEl) {
      gPhoneEl.addEventListener('focus', () => { gPhoneEl.value = g.phone || ''; });
      gPhoneEl.addEventListener('blur', () => { gPhoneEl.value = g.phone ? (this.isFieldDiscoveryTarget() ? g.phone : maskPhone(g.phone)) : ''; });
      gPhoneEl.addEventListener('input', (e) => { g.phone = e.target.value; });
    }

    const chkProxy = document.getElementById('chkProxySigner');
    if (chkProxy) {
      chkProxy.addEventListener('change', (e) => {
        g.isProxySigner = e.target.checked;
      });
    }

    // 거주지 유형 아코디언 접기/펴기 토글 이벤트
    const btnToggleHousing = document.getElementById('btnToggleHousingAccordion');
    const housingBody = document.getElementById('housingCardBody');
    const housingInd = document.getElementById('housingToggleIndicator');

    if (btnToggleHousing && housingBody && housingInd) {
      btnToggleHousing.addEventListener('click', () => {
        this.housingCollapsed = !this.housingCollapsed;
        housingBody.style.display = this.housingCollapsed ? 'none' : 'block';
        housingInd.innerText = this.housingCollapsed ? '펼치기 ▼' : '접기 ▲';
      });
    }

    // 10종 거주지 칩 선택
    const customGroup = document.getElementById('housingCustomGroup');
    const customInp = document.getElementById('inputHousingCustom');

    document.querySelectorAll('.housing-chip[data-type]').forEach(chip => {
      chip.addEventListener('click', () => {
        const type = chip.getAttribute('data-type');
        p.housingType = type;

        document.querySelectorAll('.housing-chip[data-type]').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');

        if (type === '직접기재') {
          if (customGroup) customGroup.style.display = 'block';
          if (customInp) customInp.focus();
        } else {
          if (customGroup) customGroup.style.display = 'none';
          p.housingCustom = '';
          // 칩 선택 완료 시 깔끔하게 자동 접기 및 렌더링
          this.housingCollapsed = true;
          this.render();
        }
      });
    });

    if (customInp) {
      customInp.addEventListener('input', (e) => {
        p.housingCustom = e.target.value;
      });
    }

    // 이전 및 다음 버튼
    const btnBack = document.getElementById('btnBackToStep1');
    if (btnBack) btnBack.addEventListener('click', () => this.mediator.switchTab(1));

    const btnNext = document.getElementById('btnNextToStep3');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        const val = ValidationService.validateTargetProfile(p);
        if (!val.isValid) {
          notifier.alert({
            title: '대상자 정보 확인 필요',
            message: val.message,
            confirmText: '확인'
          });
          return;
        }
        this.mediator.renderStep(3);
        this.mediator.switchTab(3);
      });
    }
  }
}

