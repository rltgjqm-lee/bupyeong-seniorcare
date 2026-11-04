/**
 * @file rbacService.js
 * @description 전사 5단계 역할 및 실무 권한 통제 서비스 (RBAC Service - ESM)
 * 준수 철칙: 최소 권한의 원칙(Principle of Least Privilege), 개인정보 접근 통제
 */

export const PermissionType = Object.freeze({
  READ_WRITE: 'READ_WRITE', // 읽기 + 쓰기 (조회 및 등록/수정 전체 허용)
  READ: 'READ',             // 읽기 전용 (데이터 및 통계 열람만 허용, 등록/수정/삭제 차단)
  WRITE: 'WRITE'            // 쓰기 전용 (현장 조사지 및 상담일지 입력 전담, 전체 열람 제한)
});

export class RbacService {
  /**
   * 현재 로그인된 관리자 권한 정보 반환
   * @returns {{
   *   uid: string,
   *   role: string,
   *   permissions: string,
   *   canExportExcel: boolean,
   *   canUnmask: boolean
   * }}
   */
  static getCurrentSession() {
    const storage = typeof sessionStorage !== 'undefined' ? sessionStorage : { getItem: () => null, setItem: () => {} };
    const role = storage.getItem('wellrisk_admin_role') || 'ORG_ADMIN';
    const permissions = storage.getItem('wellrisk_admin_permissions') || 'READ_WRITE';
    const canExport = storage.getItem('wellrisk_admin_can_export');
    const canUnmask = storage.getItem('wellrisk_admin_can_unmask');
    const user = storage.getItem('wellrisk_admin_user') || 'wellrisk@wellrisk.com';

    // 총괄 관리자(SUPER_ADMIN) 또는 기본 센터장 계정은 전권 보유
    const isMaster = (role === 'SUPER_ADMIN' || user === 'wellrisk@wellrisk.com');

    return {
      uid: storage.getItem('wellrisk_admin_uid') || (isMaster ? 'A-28-260-01-01' : ''),
      user,
      role,
      permissions: isMaster ? PermissionType.READ_WRITE : permissions,
      canExportExcel: isMaster ? true : (canExport === '1' || canExport === 'true'),
      canUnmask: isMaster ? true : (canUnmask === '1' || canUnmask === 'true')
    };
  }

  /**
   * 세션 권한 정보 동기화 저장
   * @param {Object} admin
   */
  static setSession(admin) {
    if (!admin) return;
    const storage = typeof sessionStorage !== 'undefined' ? sessionStorage : { getItem: () => null, setItem: () => {} };
    if (admin.uid) storage.setItem('wellrisk_admin_uid', admin.uid);
    if (admin.role) storage.setItem('wellrisk_admin_role', admin.role);
    if (admin.login_id || admin.loginId) {
      storage.setItem('wellrisk_admin_user', admin.login_id || admin.loginId);
    }
    const perm = admin.permissions || PermissionType.READ_WRITE;
    storage.setItem('wellrisk_admin_permissions', perm);

    const canExp = (admin.can_export_excel === 1 || admin.can_export_excel === true || admin.canExportExcel === true) ? '1' : '0';
    storage.setItem('wellrisk_admin_can_export', canExp);

    const canUnm = (admin.can_unmask === 1 || admin.can_unmask === true || admin.canUnmask === true) ? '1' : '0';
    storage.setItem('wellrisk_admin_can_unmask', canUnm);
  }

  /**
   * 데이터 조회(읽기) 권한 검증
   * @returns {boolean}
   */
  static canRead() {
    const s = this.getCurrentSession();
    return s.permissions === PermissionType.READ || s.permissions === PermissionType.READ_WRITE;
  }

  /**
   * 신규 등록 / 정보 수정 / 데이터 삭제(쓰기) 권한 검증
   * @returns {boolean}
   */
  static canWrite() {
    const s = this.getCurrentSession();
    return s.permissions === PermissionType.WRITE || s.permissions === PermissionType.READ_WRITE;
  }

  /**
   * 17열 대용량 엑셀 원장 다운로드 권한 검증
   * @returns {boolean}
   */
  static canExportExcel() {
    const s = this.getCurrentSession();
    return s.canExportExcel === true;
  }

  /**
   * 개인정보 마스킹 해제(원본 열람) 권한 검증
   * @returns {boolean}
   */
  static canUnmask() {
    const s = this.getCurrentSession();
    return s.canUnmask === true;
  }

  /**
   * 화면 내 등록/수정/엑셀 버튼에 대한 실시간 가드 적용
   * @param {HTMLElement|Document} rootEl
   */
  static applyGuards(rootEl = document) {
    const canW = this.canWrite();
    const canExp = this.canExportExcel();

    // 1. 쓰기 권한이 없는 경우(읽기 전용 계정): 등록, 수정, 일괄등록 버튼 비활성화 또는 숨김
    if (!canW) {
      rootEl.querySelectorAll('[data-rbac-write], #btnOpenAddTargetModal, #btnBatchUploadTargets, #btnAddInspectorSingle, #btnBatchUploadInspectors, #btnAddAdminModal').forEach(el => {
        el.style.display = 'none';
      });
      rootEl.querySelectorAll('button[data-edit-admin], button[data-del-admin]').forEach(el => {
        el.disabled = true;
        el.style.opacity = '0.5';
        el.title = '수정/삭제 권한이 없습니다 (읽기 전용 계정)';
      });
    }

    // 2. 엑셀 다운로드 권한이 없는 경우: 엑셀 다운로드 버튼 차단/비활성화
    if (!canExp) {
      rootEl.querySelectorAll('[data-rbac-export], #btnStatsFormsExcel').forEach(el => {
        el.disabled = true;
        el.style.opacity = '0.5';
        el.style.cursor = 'not-allowed';
        el.title = '17열 엑셀 원장 다운로드 권한이 부여되지 않은 계정입니다.';
      });
    }
  }
}
