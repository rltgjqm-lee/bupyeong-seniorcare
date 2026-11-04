/**
 * @file adminsPane.js
 * @description 부관리자(실무 담당자) 계정 및 RBAC 권한 관리 서브 페인 모듈 (ESM)
 *              - 부관리자 계정 목록 렌더링 및 상태(활동중/중지) 관리
 *              - 실무 접근 권한(읽기/쓰기/읽기+쓰기) 및 특수 보안 권한(엑셀/마스킹해제) 매트릭스 설정
 *              - 신규 부관리자 A계층 표준 UID(A-28-237-01-xx) 자동 채번 및 일회성 PW 발급
 *              - D1 실서버 CRUD 연동 (OrgAdminApi.getAdmins, saveAdmin, deleteAdmin)
 */

import { OrgAdminApi } from '../../api/orgAdminApi.js';
import { notifier } from '../../utils/notifier.js';
import { RbacService, PermissionType } from '../../services/rbacService.js';

export class AdminsPane {
  constructor(options = {}) {
    this.container = null;
    this.orgUid = options.orgUid || 'O-28-237-01';
    this.admins = options.admins || [
      {
        uid: 'A-28-237-01-02',
        login_id: 'sub_a282370102@wellrisk.kr',
        name: '이살핌',
        position: '현장 배차 주임',
        department: '',
        phone: '032-560-4002',
        role: 'ORG_ADMIN',
        permissions: PermissionType.READ_WRITE,
        can_export_excel: 0,
        can_unmask: 0,
        status: '활동중'
      }
    ];
  }

  /**
   * 페인 마운트 및 초기화
   * @param {HTMLElement|string} containerEl 
   * @param {Object} [options] 
   */
  async mount(containerEl, options = {}) {
    if (typeof containerEl === 'string') {
      this.container = document.getElementById(containerEl);
    } else {
      this.container = containerEl;
    }

    if (options.orgUid) this.orgUid = options.orgUid;

    if (!this.container) {
      console.warn('[AdminsPane] 컨테이너 요소를 찾을 수 없습니다.');
      return;
    }

    await this.loadAdmins();
    this.renderAdmins();
    this.bindEvents();
  }

  /**
   * D1 실서버 부관리자 목록 조회
   */
  async loadAdmins() {
    try {
      const admJson = await OrgAdminApi.getAdmins(this.orgUid);
      if (admJson && admJson.success && Array.isArray(admJson.data) && admJson.data.length > 0) {
        this.admins = admJson.data;
      }
    } catch (e) {
      console.warn('[AdminsPane] loadAdmins 실패, 기존 상태 유지:', e);
    }
  }

  /**
   * 부관리자 목록 테이블 렌더링 (9개 컬럼 완비)
   */
  renderAdmins() {
    const tbody = document.getElementById('tbodyAdmins');
    if (!tbody) return;

    if (this.admins.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; color: #94a3b8; padding: 24px;">
            등록된 부관리자(실무 담당자)가 없습니다. 상단 [+ 부관리자 등록] 버튼을 눌러 등록해 주십시오.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.admins.map((a, idx) => {
      const perm = a.permissions || PermissionType.READ_WRITE;
      let permBadge = '';
      if (perm === PermissionType.READ) {
        permBadge = `<span class="sidebar-badge" style="background:#e0f2fe; color:#0369a1; font-weight:700;">읽기 전용</span>`;
      } else if (perm === PermissionType.WRITE) {
        permBadge = `<span class="sidebar-badge" style="background:#fef3c7; color:#b45309; font-weight:700;">쓰기 전용</span>`;
      } else {
        permBadge = `<span class="sidebar-badge" style="background:#ecfdf5; color:#047857; font-weight:700;">읽기+쓰기</span>`;
      }

      const canExportBadge = (a.can_export_excel === 1 || a.can_export_excel === true)
        ? `<span class="sidebar-badge" style="background:#f1f5f9; color:#334155; font-size:10px; margin-left:3px; padding:2px 5px;" title="17열 엑셀 다운로드 허용">엑셀</span>`
        : '';

      const canUnmaskBadge = (a.can_unmask === 1 || a.can_unmask === true)
        ? `<span class="sidebar-badge" style="background:#fee2e2; color:#b91c1c; font-size:10px; margin-left:3px; padding:2px 5px;" title="개인정보 마스킹 해제 허용">마스킹해제</span>`
        : '';

      return `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="font-family: monospace; font-size: 11.5px; color: #475569;">${a.uid}</td>
          <td><strong>${a.name}</strong></td>
          <td>${a.position || a.role || '-'}${a.department ? ` (${a.department})` : ''}</td>
          <td style="font-size: 12px; color: #475569;">${a.login_id || a.loginId || '-'}</td>
          <td>${a.phone}</td>
          <td style="text-align: center; white-space: nowrap;">${permBadge}${canExportBadge}${canUnmaskBadge}</td>
          <td style="text-align: center;"><span class="grade-pill clean">${a.status || '활동중'}</span></td>
          <td style="text-align: center;">
            <button type="button" class="btn-table-sm" data-edit-admin="${a.uid}">수정</button>
            <button type="button" class="btn-table-sm" data-del-admin="${a.uid}" style="color:#dc2626; border-color:#fca5a5;">삭제</button>
          </td>
        </tr>
      `;
    }).join('');

    // 부관리자 수정 모달 연동
    tbody.querySelectorAll('button[data-edit-admin]').forEach(btn => {
      btn.addEventListener('click', () => {
        const uid = btn.getAttribute('data-edit-admin');
        const target = this.admins.find(a => a.uid === uid);
        if (target) this.openAdminModal(target);
      });
    });

    // 부관리자 삭제 연동 (전용 OrgAdminApi 사용)
    tbody.querySelectorAll('button[data-del-admin]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = btn.getAttribute('data-del-admin');
        const target = this.admins.find(a => a.uid === uid);
        const targetName = target ? target.name : '부관리자';
        if (confirm(`[${targetName}] 부관리자 계정을 삭제하시겠습니까?`)) {
          try {
            await OrgAdminApi.deleteAdmin(uid);
          } catch (e) {
            console.warn('[AdminsPane] D1 부관리자 삭제 API 폴백:', e);
          }
          this.admins = this.admins.filter(a => a.uid !== uid);
          this.renderAdmins();
          notifier.toast(`[${targetName}] 부관리자 계정이 삭제되었습니다.`, 'info');
        }
      });
    });

    // 권한 가드 적용
    RbacService.applyGuards(this.container || document);
  }

  /**
   * 부관리자 신규 등록 / 정보 수정 모달 오픈
   * @param {Object|null} target 
   */
  openAdminModal(target = null) {
    const modal = document.getElementById('modalAddAdmin');
    const modalTitle = document.getElementById('modalAddAdminTitle');
    const inpUid = document.getElementById('inpEditAdminUid');
    const inpName = document.getElementById('inpNewAdminName');
    const inpRole = document.getElementById('inpNewAdminRole');
    const inpDept = document.getElementById('inpNewAdminDept');
    const inpPhone = document.getElementById('inpNewAdminPhone');
    const inpLoginId = document.getElementById('inpNewAdminLoginId');
    const divPw = document.getElementById('divAdminPwGroup');
    const inpPw = document.getElementById('inpNewAdminPw');
    const btnSubmit = document.getElementById('btnSubmitAddAdmin');

    const rbReadWrite = document.getElementById('rbPermReadWrite');
    const rbRead = document.getElementById('rbPermRead');
    const rbWrite = document.getElementById('rbPermWrite');
    const chkExport = document.getElementById('chkAdminCanExport');
    const chkUnmask = document.getElementById('chkAdminCanUnmask');

    if (!modal) return;

    if (target) {
      // 1. 기존 부관리자 수정 모드
      if (modalTitle) modalTitle.innerText = '부관리자 권한 및 정보 수정';
      if (btnSubmit) btnSubmit.innerText = '수정 내용 저장';
      if (inpUid) inpUid.value = target.uid;
      if (inpName) inpName.value = target.name || '';
      if (inpRole) inpRole.value = target.position || target.role || '';
      if (inpDept) inpDept.value = target.department || '';
      if (inpPhone) inpPhone.value = target.phone || '';
      if (inpLoginId) {
        inpLoginId.value = target.login_id || target.loginId || '';
        inpLoginId.disabled = true;
      }

      // 권한 라디오 바인딩
      const perm = target.permissions || PermissionType.READ_WRITE;
      if (perm === PermissionType.READ && rbRead) rbRead.checked = true;
      else if (perm === PermissionType.WRITE && rbWrite) rbWrite.checked = true;
      else if (rbReadWrite) rbReadWrite.checked = true;

      // 보안 체크박스 바인딩
      if (chkExport) chkExport.checked = (target.can_export_excel === 1 || target.can_export_excel === true);
      if (chkUnmask) chkUnmask.checked = (target.can_unmask === 1 || target.can_unmask === true);

      if (divPw) {
        divPw.style.display = 'block';
        const lblPw = divPw.querySelector('label');
        if (lblPw) lblPw.innerText = '일회성 임시 비밀번호 재발급';
        const descPw = divPw.querySelector('p');
        if (descPw) descPw.innerText = '비밀번호 재발급을 원할 경우 [자동 생성] 버튼을 클릭해 주십시오.';
      }
      if (inpPw) {
        inpPw.value = '';
        inpPw.placeholder = '비밀번호 재발급 시 [자동 생성] 클릭';
      }
    } else {
      // 2. 신규 계정 등록 모드
      if (modalTitle) modalTitle.innerText = '부관리자 계정 신규 등록';
      if (btnSubmit) btnSubmit.innerText = '신규 계정 등록 완료';
      if (inpUid) inpUid.value = '';
      if (inpName) inpName.value = '';
      if (inpRole) inpRole.value = '';
      if (inpDept) inpDept.value = '';
      if (inpPhone) inpPhone.value = '';
      if (inpLoginId) {
        inpLoginId.value = '';
        inpLoginId.disabled = false;
      }

      // 기본 권한 설정
      if (rbReadWrite) rbReadWrite.checked = true;
      if (chkExport) chkExport.checked = false;
      if (chkUnmask) chkUnmask.checked = false;

      if (divPw) {
        divPw.style.display = 'block';
        const lblPw = divPw.querySelector('label');
        if (lblPw) lblPw.innerText = '초기 임시 비밀번호';
        const descPw = divPw.querySelector('p');
        if (descPw) descPw.innerText = '첫 로그인 후 즉시 비밀번호를 변경하도록 안내됩니다.';
      }
      if (inpPw) {
        const randNum = Math.floor(100000 + Math.random() * 900000);
        inpPw.value = `wrk#${randNum}`;
      }
    }

    modal.classList.add('active');
    inpName?.focus();
  }

  closeAdminModal() {
    const modal = document.getElementById('modalAddAdmin');
    if (modal) modal.classList.remove('active');
  }

  /**
   * 상단 버튼 및 모달 서브밋 이벤트 바인딩
   */
  bindEvents() {
    const btnAddAdm = document.getElementById('btnAddAdminModal');
    const btnCloseAddAdm = document.getElementById('btnCloseAddAdminModal');
    const btnCancelAddAdm = document.getElementById('btnCancelAddAdminModal');
    const btnSubmitAddAdm = document.getElementById('btnSubmitAddAdmin');
    const btnGenAdminPw = document.getElementById('btnGenAdminPw');

    if (btnAddAdm) {
      btnAddAdm.onclick = () => this.openAdminModal(null);
    }

    if (btnGenAdminPw) {
      btnGenAdminPw.onclick = () => {
        const randNum = Math.floor(100000 + Math.random() * 900000);
        const inpPw = document.getElementById('inpNewAdminPw');
        if (inpPw) {
          inpPw.value = `wrk#${randNum}`;
          notifier.toast('신규 일회성 비밀번호가 생성되었습니다.', 'info');
        }
      };
    }

    if (btnCloseAddAdm) btnCloseAddAdm.onclick = () => this.closeAdminModal();
    if (btnCancelAddAdm) btnCancelAddAdm.onclick = () => this.closeAdminModal();

    if (btnSubmitAddAdm) {
      btnSubmitAddAdm.onclick = async () => {
        const editUid = document.getElementById('inpEditAdminUid')?.value.trim();
        const name = document.getElementById('inpNewAdminName')?.value.trim();
        const role = document.getElementById('inpNewAdminRole')?.value.trim();
        const dept = document.getElementById('inpNewAdminDept')?.value.trim();
        const phone = document.getElementById('inpNewAdminPhone')?.value.trim();
        const loginId = document.getElementById('inpNewAdminLoginId')?.value.trim();
        const tempPw = document.getElementById('inpNewAdminPw')?.value.trim();

        // RBAC 권한 라디오 선택값 확인
        const checkedRadio = document.querySelector('input[name="rbAdminPerm"]:checked');
        const permissions = checkedRadio ? checkedRadio.value : PermissionType.READ_WRITE;

        // 특수 보안 권한 확인
        const canExportExcel = document.getElementById('chkAdminCanExport')?.checked ? 1 : 0;
        const canUnmask = document.getElementById('chkAdminCanUnmask')?.checked ? 1 : 0;

        if (!name || !phone) {
          notifier.toast('관리자 성명과 연락처는 필수 입력 항목입니다.', 'warning');
          return;
        }

        if (editUid) {
          // 기존 부관리자 정보 수정
          const target = this.admins.find(a => a.uid === editUid);
          if (target) {
            target.name = name;
            target.position = role;
            target.department = dept;
            target.phone = phone;
            target.permissions = permissions;
            target.can_export_excel = canExportExcel;
            target.can_unmask = canUnmask;
            if (tempPw) {
              target.temp_password = tempPw;
            }

            try {
              await OrgAdminApi.saveAdmin({
                uid: editUid,
                name,
                position: role,
                department: dept,
                phone,
                permissions,
                can_export_excel: canExportExcel,
                can_unmask: canUnmask,
                temp_password: tempPw || undefined
              });
            } catch (e) {
              console.warn('[AdminsPane] 부관리자 D1 저장 API 폴백:', e);
            }

            this.renderAdmins();
            this.closeAdminModal();
            const pwMsg = tempPw ? ` (재발급 임시PW: ${tempPw})` : '';
            notifier.toast(`부관리자 [${name}] 권한 및 정보가 성공적으로 수정되었습니다.${pwMsg}`, 'success');
            return;
          }
        } else {
          // 신규 부관리자 등록
          if (!loginId) {
            notifier.toast('로그인 아이디(이메일)를 입력해 주십시오.', 'warning');
            return;
          }

          const nextSeq = String(this.admins.length + 2).padStart(2, '0');
          const newUid = `A-28-237-01-${nextSeq}`;
          const newAdmin = {
            uid: newUid,
            login_id: loginId,
            name,
            position: role,
            department: dept,
            phone,
            permissions,
            can_export_excel: canExportExcel,
            can_unmask: canUnmask,
            temp_password: tempPw,
            role: 'ORG_ADMIN',
            status: '활동중'
          };

          try {
            await OrgAdminApi.saveAdmin(newAdmin);
          } catch (e) {
            console.warn('[AdminsPane] 신규 부관리자 D1 등록 API 폴백:', e);
          }

          this.admins.push(newAdmin);
          this.renderAdmins();
          this.closeAdminModal();
          notifier.toast(`신규 부관리자 [${name}] 계정이 등록되었습니다. (아이디: ${loginId}, 임시PW: ${tempPw})`, 'success');
        }
      };
    }
  }
}
