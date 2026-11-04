/**
 * @file targetCreatePane.js
 * @description 신규 안부대상자 등록 서브 페인 모듈 (ESM)
 *              - 보건복지부 10대 거주유형 및 인적사항 개별 등록
 *              - 담당 살핌단 조 배정
 *              - 전사 표준 UID(C-28-237-01-xxx) 연동
 *              - 지자체 엑셀/CSV 일괄 업로드 파이프라인
 *                1) DB 기존 순번 MAX 확인 후 연속 순차 채번 (중복 0%)
 *                2) 지자체 페이퍼 확인용 '관리번호 매핑 대장' 즉시 인쇄(프린트) 지원
 */

import { notifier } from '../../utils/notifier.js';
import { RbacService } from '../../services/rbacService.js';
import { UidEngine } from '../../core/uid.js';

export class TargetCreatePane {
  constructor(options = {}) {
    this.container = null;
    this.orgUid = options.orgUid || 'O-28-237-01';
    this.getCases = options.getCases || null;
    this.onTargetCreated = options.onTargetCreated || null;
    this.onSwitchPane = options.onSwitchPane || null;
    this.lastUploadedTargets = [];
  }

  /**
   * 페인 마운트 및 이벤트 바인딩
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
    if (options.getCases) this.getCases = options.getCases;
    if (options.onTargetCreated) this.onTargetCreated = options.onTargetCreated;
    if (options.onSwitchPane) this.onSwitchPane = options.onSwitchPane;

    if (!this.container) {
      console.warn('[TargetCreatePane] 컨테이너 요소를 찾을 수 없습니다.');
      return;
    }

    this.bindEvents();
    RbacService.applyGuards(this.container || document);
  }

  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    const btnSubmit = document.getElementById('btnSubmitNewTarget') || document.getElementById('btnSaveTarget');
    const btnBatch = document.getElementById('btnBatchUploadTargets');
    const btnSearchAddr = document.getElementById('btnSearchTargetAddress');
    const baseAddrInput = document.getElementById('newTargetBaseAddress');

    if (btnSubmit) {
      btnSubmit.onclick = () => this.submitTarget();
    }

    if (btnBatch) {
      btnBatch.onclick = () => this.openExcelModal();
    }

    if (btnSearchAddr) {
      btnSearchAddr.onclick = () => this.openAddressSearch();
    }

    if (baseAddrInput) {
      baseAddrInput.onclick = () => this.openAddressSearch();
    }

    // 엑셀 일괄 등록 모달
    const btnCloseExcel = document.getElementById('btnCloseExcelTargetsModal');
    const btnCancelExcel = document.getElementById('btnCancelExcelTargetsModal');
    const btnDownloadTpl = document.getElementById('btnDownloadTargetTemplate');
    const btnTriggerFile = document.getElementById('btnTriggerExcelTargetsFile');
    const inputExcelFile = document.getElementById('inputExcelTargetsFile');
    const btnSubmitExcel = document.getElementById('btnSubmitExcelTargets');

    if (btnCloseExcel) btnCloseExcel.onclick = () => this.closeExcelModal();
    if (btnCancelExcel) btnCancelExcel.onclick = () => this.closeExcelModal();
    if (btnDownloadTpl) btnDownloadTpl.onclick = () => this.downloadExcelTemplate();
    if (btnTriggerFile) btnTriggerFile.onclick = () => this.triggerExcelFile();
    if (inputExcelFile) inputExcelFile.onchange = (e) => this.onExcelFileSelected(e);
    if (btnSubmitExcel) btnSubmitExcel.onclick = () => this.submitExcelUpload();

    // 지자체 매핑 대장 인쇄 모달
    const btnClosePrintModal = document.getElementById('btnCloseTargetPrintModal');
    const btnClosePrintBtn = document.getElementById('btnCloseTargetPrintBtn');
    const btnDoPrint = document.getElementById('btnPrintTargetList');

    if (btnClosePrintModal) btnClosePrintModal.onclick = () => this.closePrintModal();
    if (btnClosePrintBtn) btnClosePrintBtn.onclick = () => this.closePrintModal();
    if (btnDoPrint) btnDoPrint.onclick = () => this.printTargetList();
  }

  /**
   * 카카오/다음 우편번호 주소 검색 서비스 실행
   */
  openAddressSearch() {
    if (!window.daum || !window.daum.Postcode) {
      notifier.toast('카카오 주소 검색 서비스가 로드되지 않았습니다. 잠시 후 다시 시도해 주세요.', 'warning');
      return;
    }

    new window.daum.Postcode({
      oncomplete: (data) => {
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

        const baseAddrEl = document.getElementById('newTargetBaseAddress');
        if (baseAddrEl) baseAddrEl.value = fullAddr;

        const detailAddrEl = document.getElementById('newTargetDetailAddress');
        if (detailAddrEl) detailAddrEl.focus();
      }
    }).open();
  }

  /**
   * 개별 1건 신규 대상자 등록 처리
   */
  submitTarget() {
    if (!RbacService.canWrite()) {
      notifier.toast('데이터 등록 및 수정 권한이 부여되지 않은 계정입니다 (읽기 전용).', 'warning');
      return;
    }
    const nameInput = document.getElementById('newTargetName');
    const birthInput = document.getElementById('newTargetBirth');
    const genderInput = document.getElementById('newTargetGender');
    const phoneInput = document.getElementById('newTargetPhone');
    const baseAddrInput = document.getElementById('newTargetBaseAddress');
    const detailAddrInput = document.getElementById('newTargetDetailAddress');
    const housingInput = document.getElementById('newTargetHousing') || document.getElementById('newTargetHomeType');
    const teamInput = document.getElementById('newTargetTeam');

    const name = nameInput?.value.trim();
    const birth = birthInput?.value;
    const gender = genderInput?.value || '남';
    const phone = phoneInput?.value.trim();
    const baseAddr = baseAddrInput?.value.trim() || '';
    const detailAddr = detailAddrInput?.value.trim() || '';
    const address = detailAddr ? `${baseAddr} ${detailAddr}` : baseAddr;
    const housing = housingInput?.value || '다가구·다세대주택';
    const team = teamInput?.value || '1조 (박영희, 김철수)';

    if (!name || !address) {
      notifier.toast('대상자 성명과 주소(주소 검색)는 필수 입력 항목입니다.', 'warning');
      return;
    }

    const birthYear = birth ? parseInt(birth.slice(0, 4), 10) : 1952;
    const age = new Date().getFullYear() - birthYear;
    const inspectors = team ? [team.split(' ')[1]?.replace('(', '').replace(')', '') || '박영희'] : ['박영희'];

    // DB 기존 순번 MAX 확인 후 5자리 K-시리즈 뒷번호 채번 (K1001~)
    const nextSeq = this.getNextSequenceNumber();
    const targetUid = UidEngine.generateCaseUid(this.orgUid, nextSeq);
    const seqStr = `K${nextSeq}`;

    const newTarget = {
      uid: targetUid,
      localGovNo: '-',
      name,
      gender,
      age: isNaN(age) ? 74 : age,
      birth: birth || '1952-08-15',
      phone: phone || '010-0000-0000',
      address,
      living: housing,
      score: 0,
      grade: 'clean',
      date: new Date().toISOString().slice(0, 10),
      causesSummary: '신규 등록 (초기 방문 대기)',
      buList: ['EM'],
      mohwList: ['안부확인 대기'],
      surveyUid: `${this.orgUid.replace('O-', 'S-')}-${seqStr}-PENDING`,
      inspectors,
      obsSummary: '초기 방문 예정',
      status: '배정 완료'
    };

    if (this.onTargetCreated) {
      this.onTargetCreated(newTarget);
    }

    // 폼 초기화
    if (nameInput) nameInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (baseAddrInput) baseAddrInput.value = '';
    if (detailAddrInput) detailAddrInput.value = '';

    notifier.toast(`신규 대상자 [${name}] (${targetUid})님이 성공적으로 등록되었습니다.`, 'success');

    if (this.onSwitchPane) {
      this.onSwitchPane('paneTargetList', '대상자 현황');
    }
  }

  /**
   * DB 기존 순번 MAX 계산 후 다음 순번 반환 (K1001 ~ K9999 기준)
   */
  getNextSequenceNumber() {
    let currentCases = [];
    if (this.getCases && typeof this.getCases === 'function') {
      currentCases = this.getCases() || [];
    } else if (window.admin && window.admin.cases) {
      currentCases = window.admin.cases;
    }

    let maxSeq = 1000;
    for (const c of currentCases) {
      const parts = (c.uid || '').split('-');
      const lastPart = parts[parts.length - 1] || '';
      const match = lastPart.match(/^K?(\d{4})$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxSeq) maxSeq = num;
      }
    }
    return maxSeq + 1;
  }

  /**
   * 엑셀 일괄 등록 모달 열기
   */
  openExcelModal() {
    if (!RbacService.canWrite()) {
      notifier.toast('데이터 등록 및 수정 권한이 부여되지 않은 계정입니다 (읽기 전용).', 'warning');
      return;
    }
    const modal = document.getElementById('modalExcelTargets');
    const fileInput = document.getElementById('inputExcelTargetsFile');
    const dispName = document.getElementById('dispSelectedTargetFileName');
    if (!modal) return;

    if (fileInput) fileInput.value = '';
    if (dispName) dispName.textContent = '선택된 파일 없음 (.xlsx, .csv)';
    modal.classList.add('active');
  }

  /**
   * 엑셀 일괄 등록 모달 닫기
   */
  closeExcelModal() {
    const modal = document.getElementById('modalExcelTargets');
    if (modal) modal.classList.remove('active');
  }

  /**
   * 대상자 엑셀 일괄 등록 표준 서식(.csv) 다운로드 (UTF-8 BOM 포함)
   */
  downloadExcelTemplate() {
    const headers = ['지자체연번', '성명', '성별', '생년월일', '연락처', '거주지유형', '기본주소', '상세주소', '담당조'];
    const sampleRows = [
      ['1', '홍길순', '여', '', '', '', '', '', ''],
      ['2', '이영수', '남', '', '', '', '', '', ''],
      ['3', '박옥자', '여', '', '', '', '', '', '']
    ];

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...sampleRows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '대상자_일괄등록_표준서식.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    notifier.toast('대상자 표준 서식(.csv) 다운로드가 완료되었습니다.', 'success');
  }

  /**
   * 파일 선택 탐색기 열기
   */
  triggerExcelFile() {
    const fileInput = document.getElementById('inputExcelTargetsFile');
    if (fileInput) fileInput.click();
  }

  /**
   * 파일 선택 시 화면에 파일명 표시
   */
  onExcelFileSelected(e) {
    const file = e.target.files && e.target.files[0];
    const dispName = document.getElementById('dispSelectedTargetFileName');
    if (file && dispName) {
      dispName.textContent = file.name;
    }
  }

  /**
   * CSV 파싱 헬퍼 (따옴표 지원)
   */
  parseCsvLine(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  }

  /**
   * 엑셀/CSV 일괄 업로드 파이프라인 실행
   */
  async submitExcelUpload() {
    const fileInput = document.getElementById('inputExcelTargetsFile');
    const file = fileInput?.files && fileInput.files[0];

    if (!file) {
      await notifier.alert('파일 선택 필요', '업로드할 대상자 서식(.csv, .xlsx) 파일을 먼저 선택해 주십시오.', 'warning');
      return;
    }

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);

      if (lines.length < 2) {
        await notifier.alert('데이터 없음', '서식에 등록할 대상자 데이터가 없습니다. (헤더 제외 최소 1건 필요)', 'warning');
        return;
      }

      // 첫 줄(헤더) 제외
      const dataLines = lines.slice(1);
      const parsedTargets = [];

      // DB 기존 마지막 순번 MAX 산출
      let currentSeq = this.getNextSequenceNumber() - 1;

      for (let i = 0; i < dataLines.length; i++) {
        const lineNum = i + 2;
        const cols = this.parseCsvLine(dataLines[i]);
        if (cols.length === 0 || cols.every(c => !c)) continue;

        const localGovNo = (cols[0] || '').trim();
        const name = (cols[1] || '').trim();
        const gender = (cols[2] || '').trim() || '남';
        const birth = (cols[3] || '').trim();
        const phone = (cols[4] || '').trim();
        const housing = (cols[5] || '').trim() || '다가구·다세대주택';
        const baseAddr = (cols[6] || '').trim();
        const detailAddr = (cols[7] || '').trim();
        const team = (cols[8] || '').trim();

        // [대원칙 가드 1] 지자체 연번 필수 검증 (페이퍼 대조용)
        if (!localGovNo) {
          await notifier.alert(
            '지자체 연번 필수 누락',
            `${lineNum}번째 행의 [지자체연번]이 비어 있어 등록할 수 없습니다.\n\n지자체 페이퍼 명부 대조를 위해 지자체 연번(1, 2, 3...)은 필수 입력 항목입니다.`,
            'error'
          );
          return;
        }

        // [대원칙 가드 2] 성명 필수 검증
        if (!name) {
          await notifier.alert(
            '성명 필수 누락',
            `${lineNum}번째 행의 대상자 [성명]이 비어 있어 등록할 수 없습니다.`,
            'error'
          );
          return;
        }

        // DB 확인 후 마지막 번호 뒷번부터 순차 연속 5자리 K-시리즈 채번
        currentSeq++;
        const targetUid = UidEngine.generateCaseUid(this.orgUid, currentSeq);
        const seqStr = `K${currentSeq}`;

        // 주소 처리: 공란 시 관내 현장 확인 대기
        const address = baseAddr ? (detailAddr ? `${baseAddr} ${detailAddr}` : baseAddr) : '관내 (현장 확인 대기)';

        // 연령 및 생년월일 (공란 허용)
        let age = '-';
        if (birth && birth.length >= 4) {
          const birthYear = parseInt(birth.slice(0, 4), 10);
          if (!isNaN(birthYear)) {
            age = new Date().getFullYear() - birthYear;
          }
        }

        // 담당조 처리 (공란 허용)
        const hasTeam = Boolean(team && team !== '미배정');
        const inspectors = hasTeam ? [team.split(' ')[1]?.replace('(', '').replace(')', '') || team] : ['미배정'];
        const status = hasTeam ? '배정 완료' : '배정 대기';

        parsedTargets.push({
          uid: targetUid,
          localGovNo,
          name,
          gender,
          age,
          birth: birth || '-',
          phone: phone || '-',
          address,
          living: housing || '미상',
          score: 0,
          grade: 'clean',
          date: new Date().toISOString().slice(0, 10),
          causesSummary: '지자체 일괄 등록 (초기 방문 대기)',
          buList: ['EM'],
          mohwList: ['안부확인 대기'],
          surveyUid: `${this.orgUid.replace('O-', 'S-')}-${seqStr}-PENDING`,
          inspectors,
          obsSummary: '초기 방문 예정',
          status
        });
      }

      if (parsedTargets.length === 0) {
        await notifier.alert('데이터 없음', '유효한 대상자 데이터가 없습니다.', 'warning');
        return;
      }

      // 등록 실행 (상위 콜백)
      for (const target of parsedTargets) {
        if (this.onTargetCreated) {
          this.onTargetCreated(target);
        }
      }

      this.lastUploadedTargets = parsedTargets;
      this.closeExcelModal();

      // 지자체 확인용 매핑 대장 팝업 오픈
      this.openPrintModal(parsedTargets);

    } catch (err) {
      console.error('[TargetCreatePane] 엑셀 파싱 예외:', err);
      await notifier.alert('파일 처리 오류', '엑셀/CSV 파일을 읽는 중 오류가 발생했습니다.\n서식 형식을 확인해 주십시오.', 'error');
    }
  }

  /**
   * 지자체 매핑 대장 모달 열기 및 렌더링
   */
  openPrintModal(targets) {
    const modal = document.getElementById('modalTargetPrintList');
    const tbody = document.getElementById('targetPrintTableBody');
    const metaInfo = document.getElementById('printMetaInfo');
    const badge = document.getElementById('printTotalBadge');

    if (!modal || !tbody) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    if (metaInfo) {
      metaInfo.textContent = `수행기관: 인천 부평구 통합돌봄센터 (${this.orgUid}) | 등록일시: ${todayStr}`;
    }
    if (badge) {
      badge.textContent = `총 ${targets.length}건 등록 완료`;
    }

    tbody.innerHTML = targets.map((t, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 6px; color: #64748b;">${idx + 1}</td>
        <td style="padding: 8px 6px; font-weight: 800; color: #0f172a; background: #f0f9ff; font-family: monospace;">${t.uid}</td>
        <td style="padding: 8px 6px; font-weight: 700; color: #2563eb;">${t.localGovNo}</td>
        <td style="padding: 8px 6px; font-weight: 700; color: #0f172a;">${t.name}</td>
        <td style="padding: 8px 6px; color: #334155;">${t.gender}</td>
        <td style="padding: 8px 6px; color: #64748b;">${t.birth}</td>
        <td style="padding: 8px 6px; text-align: left; color: #334155;">${t.address}</td>
        <td style="padding: 8px 6px; color: ${t.status === '배정 완료' ? '#16a34a' : '#64748b'};">${t.inspectors ? t.inspectors.join(', ') : '미배정'}</td>
      </tr>
    `).join('');

    modal.classList.add('active');
  }

  /**
   * 지자체 매핑 대장 모달 닫기
   */
  closePrintModal() {
    const modal = document.getElementById('modalTargetPrintList');
    if (modal) modal.classList.remove('active');

    if (this.onSwitchPane) {
      this.onSwitchPane('paneTargetList', '대상자 현황');
    }
  }

  /**
   * 지자체 매핑 대장 인쇄 전용 윈도우 실행
   */
  printTargetList() {
    const printArea = document.getElementById('targetPrintArea');
    if (!printArea) return;

    const printWindow = window.open('', '_blank', 'width=960,height=700');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>지자체 안부대상자 관리번호 매핑 대장</title>
        <style>
          body { font-family: 'Pretendard', -apple-system, sans-serif; padding: 25px; margin: 0; color: #0f172a; }
          h3 { margin: 0 0 6px 0; font-size: 18px; font-weight: 800; }
          p { margin: 0 0 16px 0; font-size: 12px; color: #475569; }
          table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-top: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 7px 6px; text-align: center; }
          th { background-color: #f1f5f9; font-weight: 700; color: #1e293b; }
          td.left { text-align: left; }
          @media print {
            body { padding: 0; }
            @page { margin: 12mm; size: A4 landscape; }
          }
        </style>
      </head>
      <body>
        ${printArea.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
}
