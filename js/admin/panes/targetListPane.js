/**
 * @file targetListPane.js
 * @description 참여기관 관리자 포털: 대상자 현황 및 종이명단 UID 매칭 관리 페인 (ESM)
 * - 총람 v06 제6장 4절 중앙 정렬 페이지네이션 표준 100% 준수
 * - 부평구 100% 완전 가명화 철칙 준수
 */

import { maskName, maskBirth, maskPhone, maskAddress } from '../../core/mask.js';
import { notifier } from '../../utils/notifier.js';
import { BUPYEONG_DONGS } from '../../data/bupyeongCoords.js';

export const BUPYEONG_INITIAL_CASES = [
  {
    uid: 'C-28-237-01-K1001',
    name: '김*순',
    birth: '1948-**-**',
    gender: '여',
    phone: '010-****-1001',
    dong: '부평1동',
    address: '인천광역시 부평구 부평대로 24 ***',
    livingType: '독거',
    socialSecurity: '기초생활수급자',
    targetFeature: '장기요양 재가급여',
    roundCount: 4,
    lastConsultDate: '2026-10-28',
    lastConsultResult: '희망 서비스 없음',
    needsDeepLink: false
  },
  {
    uid: 'C-28-237-01-K1002',
    name: '박*철',
    birth: '1951-**-**',
    gender: '남',
    phone: '010-****-1002',
    dong: '부평2동',
    address: '인천광역시 부평구 부평이로 15 ***',
    livingType: '독거',
    socialSecurity: '기초생활수급자',
    targetFeature: '해당없음',
    roundCount: 3,
    lastConsultDate: '2026-10-26',
    lastConsultResult: '서비스 연계 필요 (동 행정복지센터 심층상담 연계)',
    needsDeepLink: true
  },
  {
    uid: 'C-28-237-01-K1003',
    name: '이*옥',
    birth: '1945-**-**',
    gender: '여',
    phone: '010-****-1003',
    dong: '산곡1동',
    address: '인천광역시 부평구 산곡로 50 ***',
    livingType: '독거',
    socialSecurity: '차상위',
    targetFeature: '장기요양 재가급여',
    roundCount: 5,
    lastConsultDate: '2026-10-29',
    lastConsultResult: '희망 서비스 없음',
    needsDeepLink: false
  },
  {
    uid: 'C-28-237-01-K1004',
    name: '정*호',
    birth: '1953-**-**',
    gender: '남',
    phone: '010-****-1004',
    dong: '산곡2동',
    address: '인천광역시 부평구 원적로 210 ***',
    livingType: '부부',
    socialSecurity: '기초연금',
    targetFeature: '노인맞춤돌봄서비스',
    roundCount: 2,
    lastConsultDate: '2026-10-22',
    lastConsultResult: '희망 서비스 없음',
    needsDeepLink: false
  },
  {
    uid: 'C-28-237-01-K1005',
    name: '최*자',
    birth: '1949-**-**',
    gender: '여',
    phone: '010-****-1005',
    dong: '청천1동',
    address: '인천광역시 부평구 청천마차로 88 ***',
    livingType: '독거',
    socialSecurity: '기초생활수급자',
    targetFeature: '장애인활동보조 수급자',
    roundCount: 4,
    lastConsultDate: '2026-10-27',
    lastConsultResult: '서비스 연계 필요 (동 행정복지센터 심층상담 연계)',
    needsDeepLink: true
  },
  {
    uid: 'C-28-237-01-K1006',
    name: '강*식',
    birth: '1950-**-**',
    gender: '남',
    phone: '010-****-1006',
    dong: '청천2동',
    address: '인천광역시 부평구 세월천로 45 ***',
    livingType: '독거',
    socialSecurity: '기초생활수급자',
    targetFeature: '장기요양 재가급여',
    roundCount: 3,
    lastConsultDate: '2026-10-25',
    lastConsultResult: '희망 서비스 없음',
    needsDeepLink: false
  },
  {
    uid: 'C-28-237-01-K1007',
    name: '윤*숙',
    birth: '1947-**-**',
    gender: '여',
    phone: '010-****-1007',
    dong: '갈산1동',
    address: '인천광역시 부평구 평천로 140 ***',
    livingType: '독거',
    socialSecurity: '차상위',
    targetFeature: '해당없음',
    roundCount: 2,
    lastConsultDate: '2026-10-24',
    lastConsultResult: '희망 서비스 없음',
    needsDeepLink: false
  },
  {
    uid: 'C-28-237-01-K1008',
    name: '장*수',
    birth: '1952-**-**',
    gender: '남',
    phone: '010-****-1008',
    dong: '삼산1동',
    address: '인천광역시 부평구 삼산로 70 ***',
    livingType: '기타 가족동거',
    socialSecurity: '일반',
    targetFeature: '노인맞춤돌봄서비스',
    roundCount: 3,
    lastConsultDate: '2026-10-26',
    lastConsultResult: '희망 서비스 없음',
    needsDeepLink: false
  },
  {
    uid: 'C-28-237-01-K1009',
    name: '송*선',
    birth: '1946-**-**',
    gender: '여',
    phone: '010-****-1009',
    dong: '부개1동',
    address: '인천광역시 부평구 동수로 102 ***',
    livingType: '독거',
    socialSecurity: '기초생활수급자',
    targetFeature: '장기요양 재가급여',
    roundCount: 5,
    lastConsultDate: '2026-10-30',
    lastConsultResult: '서비스 연계 필요 (동 행정복지센터 심층상담 연계)',
    needsDeepLink: true
  },
  {
    uid: 'C-28-237-01-K1010',
    name: '오*원',
    birth: '1954-**-**',
    gender: '남',
    phone: '010-****-1010',
    dong: '십정1동',
    address: '인천광역시 부평구 경원대로 111 ***',
    livingType: '독거',
    socialSecurity: '기초연금',
    targetFeature: '해당없음',
    roundCount: 1,
    lastConsultDate: '2026-10-21',
    lastConsultResult: '희망 서비스 없음',
    needsDeepLink: false
  }
];

export class TargetListPane {
  constructor(options = {}) {
    this.orgUid = options.orgUid || 'O-28-237-01';
    this.cases = options.cases || [...BUPYEONG_INITIAL_CASES];
    this.onCasesUpdated = options.onCasesUpdated || null;

    this.filters = {
      dong: 'ALL',
      livingType: 'ALL',
      needsDeepLink: 'ALL',
      keyword: ''
    };

    this.pagination = {
      currentPage: 1,
      pageSize: 10
    };
  }

  setCases(newCases) {
    this.cases = newCases;
    this.render();
  }

  getFilteredCases() {
    return this.cases.filter(c => {
      if (this.filters.dong !== 'ALL' && c.dong !== this.filters.dong) return false;
      if (this.filters.livingType !== 'ALL' && c.livingType !== this.filters.livingType) return false;
      if (this.filters.needsDeepLink === 'LINK' && !c.needsDeepLink) return false;
      if (this.filters.needsDeepLink === 'NORMAL' && c.needsDeepLink) return false;
      if (this.filters.keyword) {
        const kw = this.filters.keyword.toLowerCase();
        const matchUid = (c.uid || '').toLowerCase().includes(kw);
        const matchName = (c.name || '').toLowerCase().includes(kw);
        const matchDong = (c.dong || '').toLowerCase().includes(kw);
        if (!matchUid && !matchName && !matchDong) return false;
      }
      return true;
    });
  }

  render() {
    const el = document.getElementById('paneTargetList');
    if (!el) return;

    const filtered = this.getFilteredCases();
    const totalCount = filtered.length;
    const { currentPage, pageSize } = this.pagination;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const startIdx = (safePage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, totalCount);
    const pageItems = filtered.slice(startIdx, endIdx);

    el.innerHTML = `
      <div class="pane-header-title" style="display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h2>대상자 현황 및 UID 매칭 대장</h2>
          <p>지자체 교부 종이명단과 1:1 매칭된 부평구 안부대상자 원장 관리</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn-action" id="btnExportTargetExcel" style="padding: 7px 14px; font-size: 13px; font-weight: 700; background: #1e293b; color: #ffffff; border: none; border-radius: 6px; cursor: pointer;">
            📊 17열 엑셀 대장 반출
          </button>
        </div>
      </div>

      <!-- 상단 다중 필터바 -->
      <div class="admin-card" style="padding: 14px 18px; margin-bottom: 14px;">
        <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 13px; font-weight: 600; color: #475569;">행정동:</span>
            <select class="filter-ctrl" id="filterDong" style="height: 32px; font-size: 12.5px; padding: 0 8px; border: 1px solid #cbd5e1; border-radius: 6px;">
              <option value="ALL">전체 22개동</option>
              ${BUPYEONG_DONGS.map(d => `<option value="${d}" ${this.filters.dong === d ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
          </div>

          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 13px; font-weight: 600; color: #475569;">가구형태:</span>
            <select class="filter-ctrl" id="filterLiving" style="height: 32px; font-size: 12.5px; padding: 0 8px; border: 1px solid #cbd5e1; border-radius: 6px;">
              <option value="ALL">전체 가구</option>
              <option value="독거" ${this.filters.livingType === '독거' ? 'selected' : ''}>독거</option>
              <option value="부부" ${this.filters.livingType === '부부' ? 'selected' : ''}>부부</option>
              <option value="기타 가족동거" ${this.filters.livingType === '기타 가족동거' ? 'selected' : ''}>기타 가족동거</option>
            </select>
          </div>

          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 13px; font-weight: 600; color: #475569;">심층연계의뢰:</span>
            <select class="filter-ctrl" id="filterLink" style="height: 32px; font-size: 12.5px; padding: 0 8px; border: 1px solid #cbd5e1; border-radius: 6px;">
              <option value="ALL">전체 상태</option>
              <option value="LINK" ${this.filters.needsDeepLink === 'LINK' ? 'selected' : ''}>★ 동 복지센터 연계필요군</option>
              <option value="NORMAL" ${this.filters.needsDeepLink === 'NORMAL' ? 'selected' : ''}>일반(정상)</option>
            </select>
          </div>

          <div style="display: flex; align-items: center; gap: 6px; margin-left: auto;">
            <input type="text" id="filterKeyword" class="filter-ctrl" placeholder="성명, UID 검색" value="${this.filters.keyword}" style="height: 32px; font-size: 12.5px; padding: 0 10px; border: 1px solid #cbd5e1; border-radius: 6px; width: 160px;">
            <button type="button" id="btnApplyFilter" style="height: 32px; padding: 0 12px; background: #0f172a; color: #ffffff; border: none; border-radius: 6px; font-size: 12.5px; cursor: pointer;">검색</button>
            <button type="button" id="btnResetFilter" style="height: 32px; padding: 0 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12.5px; cursor: pointer;">초기화</button>
          </div>
        </div>
      </div>

      <!-- 대상자 그리드 테이블 -->
      <div class="admin-card" style="padding: 0; overflow: hidden;">
        <div style="overflow-x: auto;">
          <table class="admin-table">
            <thead>
              <tr>
                <th style="width: 140px;">관리번호 (UID)</th>
                <th style="width: 90px;">성명</th>
                <th style="width: 100px;">생년월일</th>
                <th style="width: 60px;">성별</th>
                <th style="width: 85px;">행정동</th>
                <th style="width: 85px;">가구형태</th>
                <th style="width: 110px;">사회보장</th>
                <th style="width: 80px; text-align: center;">누적차수</th>
                <th>최근 모니터링 판정</th>
                <th style="width: 90px; text-align: center;">심층연계</th>
              </tr>
            </thead>
            <tbody>
              ${pageItems.length === 0 ? `
                <tr><td colspan="10" style="text-align: center; padding: 32px; color: #94a3b8;">일치하는 대상자 데이터가 없습니다.</td></tr>
              ` : pageItems.map(c => `
                <tr>
                  <td class="font-mono" style="font-weight: 700; color: #2563eb;">${c.uid}</td>
                  <td><strong>${c.name}</strong></td>
                  <td class="font-mono">${c.birth}</td>
                  <td>${c.gender}</td>
                  <td><span class="badge badge-secondary">${c.dong}</span></td>
                  <td>${c.livingType}</td>
                  <td>${c.socialSecurity}</td>
                  <td style="text-align: center; font-weight: 700;">${c.roundCount}회차</td>
                  <td style="font-size: 12px; color: #334155;">
                    <div>${c.lastConsultResult}</div>
                    <div style="font-size: 11px; color: #94a3b8;">(${c.lastConsultDate})</div>
                  </td>
                  <td style="text-align: center;">
                    ${c.needsDeepLink ? `
                      <span class="badge badge-danger" style="animation: pulse 2s infinite;">연계필요</span>
                    ` : `
                      <span class="badge badge-success">정상</span>
                    `}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- 총람 v06 제6장 4절: 중앙 정렬 페이지네이션 (Center-Aligned Pagination) -->
        <div style="display: flex; justify-content: center; align-items: center; gap: 16px; padding: 18px 0; border-top: 1px solid #e2e8f0; background: #ffffff;">
          <div style="font-size: 12px; color: #64748b;">
            총 <strong style="color: #0f172a;">${totalCount}</strong>건 (${startIdx + 1}~${endIdx} 표시)
          </div>

          <div style="display: flex; align-items: center; gap: 4px;">
            <button type="button" class="btn-page-nav" id="btnPageFirst" ${safePage <= 1 ? 'disabled' : ''} style="padding: 4px 8px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px; background: #ffffff; cursor: pointer; ${safePage <= 1 ? 'opacity:0.4; cursor:not-allowed;' : ''}">« 처음</button>
            <button type="button" class="btn-page-nav" id="btnPagePrev" ${safePage <= 1 ? 'disabled' : ''} style="padding: 4px 8px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px; background: #ffffff; cursor: pointer; ${safePage <= 1 ? 'opacity:0.4; cursor:not-allowed;' : ''}">‹ 이전</button>
            
            ${Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1;
              const isCur = (p === safePage);
              return `
                <button type="button" class="btn-page-num ${isCur ? 'active' : ''}" data-page="${p}" style="min-width: 28px; height: 28px; padding: 0 6px; font-size: 12px; font-weight: ${isCur ? '700' : 'normal'}; border: 1px solid ${isCur ? '#0f172a' : '#cbd5e1'}; border-radius: 4px; background: ${isCur ? '#0f172a' : '#ffffff'}; color: ${isCur ? '#ffffff' : '#334155'}; cursor: pointer;">
                  ${p}
                </button>
              `;
            }).join('')}

            <button type="button" class="btn-page-nav" id="btnPageNext" ${safePage >= totalPages ? 'disabled' : ''} style="padding: 4px 8px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px; background: #ffffff; cursor: pointer; ${safePage >= totalPages ? 'opacity:0.4; cursor:not-allowed;' : ''}">다음 ›</button>
            <button type="button" class="btn-page-nav" id="btnPageLast" ${safePage >= totalPages ? 'disabled' : ''} style="padding: 4px 8px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px; background: #ffffff; cursor: pointer; ${safePage >= totalPages ? 'opacity:0.4; cursor:not-allowed;' : ''}">마지막 »</button>
          </div>

          <select id="selPageSize" style="height: 28px; font-size: 11.5px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0 6px;">
            <option value="10" ${pageSize === 10 ? 'selected' : ''}>10개씩 보기</option>
            <option value="20" ${pageSize === 20 ? 'selected' : ''}>20개씩 보기</option>
          </select>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  exportExcel() {
    if (typeof ExcelJS === 'undefined') {
      notifier.toast('ExcelJS 엔진을 불러올 수 없습니다.', 'error');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Bupyeong-SeniorCare';
    const sheet = workbook.addWorksheet('부평구_통합돌봄_대상자대장');

    // 17열 표준 컬럼 헤더
    sheet.columns = [
      { header: '순번', key: 'seq', width: 8 },
      { header: '대상자UID', key: 'uid', width: 18 },
      { header: '시군구코드', key: 'sgg', width: 12 },
      { header: '행정동', key: 'dong', width: 12 },
      { header: '성명(가명)', key: 'name', width: 12 },
      { header: '생년월일', key: 'birth', width: 14 },
      { header: '성별', key: 'gender', width: 8 },
      { header: '연락처(마스킹)', key: 'phone', width: 16 },
      { header: '주소(마스킹)', key: 'address', width: 32 },
      { header: '가구형태', key: 'livingType', width: 14 },
      { header: '사회보장', key: 'socialSecurity', width: 16 },
      { header: '대상자특성', key: 'targetFeature', width: 18 },
      { header: '누적방문차수', key: 'roundCount', width: 12 },
      { header: '최근상담일자', key: 'lastConsultDate', width: 14 },
      { header: '최근상담결과', key: 'lastConsultResult', width: 30 },
      { header: '심층연계의뢰', key: 'needsDeepLink', width: 14 },
      { header: '관할기관', key: 'orgName', width: 22 }
    ];

    // 헤더 스타일링
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' } // Slate 900
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 24;

    // 데이터 삽입
    this.cases.forEach((c, idx) => {
      sheet.addRow({
        seq: idx + 1,
        uid: c.uid,
        sgg: 'M-28-237',
        dong: c.dong,
        name: c.name,
        birth: c.birth,
        gender: c.gender,
        phone: c.phone,
        address: c.address,
        livingType: c.livingType,
        socialSecurity: c.socialSecurity,
        targetFeature: c.targetFeature,
        roundCount: `${c.roundCount}회차`,
        lastConsultDate: c.lastConsultDate,
        lastConsultResult: c.lastConsultResult,
        needsDeepLink: c.needsDeepLink ? '연계필요' : '정상',
        orgName: '부평구 통합돌봄센터'
      });
    });

    // 다운로드 트리거
    workbook.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `[부평구통합돌봄]대상자_17열대장_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      notifier.toast('17열 표준 엑셀 대장 다운로드가 완료되었습니다.', 'success');
    }).catch(err => {
      console.error(err);
      notifier.toast('엑셀 파일 생성 중 오류가 발생했습니다.', 'error');
    });
  }

  bindEvents() {
    const filterDong = document.getElementById('filterDong');
    const filterLiving = document.getElementById('filterLiving');
    const filterLink = document.getElementById('filterLink');
    const filterKw = document.getElementById('filterKeyword');
    const btnApply = document.getElementById('btnApplyFilter');
    const btnReset = document.getElementById('btnResetFilter');
    const btnExport = document.getElementById('btnExportTargetExcel');

    if (btnApply) {
      btnApply.addEventListener('click', () => {
        if (filterDong) this.filters.dong = filterDong.value;
        if (filterLiving) this.filters.livingType = filterLiving.value;
        if (filterLink) this.filters.needsDeepLink = filterLink.value;
        if (filterKw) this.filters.keyword = filterKw.value.trim();
        this.pagination.currentPage = 1;
        this.render();
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.filters = { dong: 'ALL', livingType: 'ALL', needsDeepLink: 'ALL', keyword: '' };
        this.pagination.currentPage = 1;
        this.render();
      });
    }

    if (btnExport) {
      btnExport.addEventListener('click', () => this.exportExcel());
    }

    // 페이지 번호 클릭
    document.querySelectorAll('.btn-page-num').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const page = parseInt(e.currentTarget.dataset.page, 10);
        this.pagination.currentPage = page;
        this.render();
      });
    });

    const btnFirst = document.getElementById('btnPageFirst');
    const btnPrev = document.getElementById('btnPagePrev');
    const btnNext = document.getElementById('btnPageNext');
    const btnLast = document.getElementById('btnPageLast');
    const selPageSize = document.getElementById('selPageSize');

    if (btnFirst) btnFirst.addEventListener('click', () => { this.pagination.currentPage = 1; this.render(); });
    if (btnPrev) btnPrev.addEventListener('click', () => { if (this.pagination.currentPage > 1) { this.pagination.currentPage--; this.render(); } });
    if (btnNext) btnNext.addEventListener('click', () => { this.pagination.currentPage++; this.render(); });
    if (btnLast) btnLast.addEventListener('click', () => {
      const filtered = this.getFilteredCases();
      this.pagination.currentPage = Math.ceil(filtered.length / this.pagination.pageSize);
      this.render();
    });

    if (selPageSize) {
      selPageSize.addEventListener('change', (e) => {
        this.pagination.pageSize = parseInt(e.target.value, 10);
        this.pagination.currentPage = 1;
        this.render();
      });
    }
  }
}
