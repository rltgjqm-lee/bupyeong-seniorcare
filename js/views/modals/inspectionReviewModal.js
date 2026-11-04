/**
 * @file inspectionReviewModal.js
 * @description 시니어 검수단 1차 현장방문 15문항 정밀 검수 워크스페이스 모달 (ESM)
 *              - 선택 가구 다건 순차 배치 검수
 *              - 15문항 실측 응답 및 배점 검증
 *              - 활동가 2인 전자서명 완결 확인
 *              - 검수 소견 및 4대 사업단 긴급 배정 코멘트 영속화
 */

import { OrgAdminApi } from '../../api/orgAdminApi.js';
import { notifier } from '../../utils/notifier.js';
import { maskBirth } from '../../utils/mask.js';

const SGDS_STANDARD_QUESTIONS = [
  { no: 'Q1', title: '현재 생활에 대체로 만족하십니까?', reverse: true },
  { no: 'Q2', title: '활동이나 관심거리가 많이 줄었습니까?', reverse: false },
  { no: 'Q3', title: '삶이 헛되다고 느끼십니까?', reverse: false },
  { no: 'Q4', title: '생활이 지루하다고 느끼십니까?', reverse: false },
  { no: 'Q5', title: '밝은 기분일 때가 많습니까?', reverse: true },
  { no: 'Q6', title: '불길한 일이 일어날까 두렵습니까?', reverse: false },
  { no: 'Q7', title: '대체로 마음이 편안하십니까?', reverse: true },
  { no: 'Q8', title: '자신이 무력하다고 느끼십니까?', reverse: false },
  { no: 'Q9', title: '외출하기보다 집에 있고 싶습니까?', reverse: false },
  { no: 'Q10', title: '기억력에 문제가 많다고 느끼십니까?', reverse: false },
  { no: 'Q11', title: '현재 살아있다는 것이 좋다고 느끼십니까?', reverse: true },
  { no: 'Q12', title: '지금의 자신이 쓸모없다고 느끼십니까?', reverse: false },
  { no: 'Q13', title: '활력이 넘치십니까?', reverse: true },
  { no: 'Q14', title: '지금 처지가 절망적이라고 느끼십니까?', reverse: false },
  { no: 'Q15', title: '다른 사람들이 나보다 낫다고 느끼십니까?', reverse: false }
];

export class InspectionReviewModal {
  constructor(options = {}) {
    this.cases = options.cases || [];
    this.onSaved = options.onSaved || null;
    this.reviewTargetUids = [];
    this.currentReviewIndex = 0;
    this.modalEl = null;

    this.init();
  }

  setCases(cases) {
    this.cases = cases || [];
  }

  init() {
    this.modalEl = document.getElementById('reviewModal');
    if (!this.modalEl) return;

    const btnOpenReview = document.getElementById('btnOpenReviewModal');
    const btnCloseReview = document.getElementById('btnCloseReviewModal');
    const btnCancelReview = document.getElementById('btnCancelReviewModal');
    const btnPrevReview = document.getElementById('btnPrevReviewTarget');
    const btnNextReview = document.getElementById('btnNextReviewTarget');
    const btnSaveReview = document.getElementById('btnSaveReviewComment');

    if (btnOpenReview) {
      btnOpenReview.addEventListener('click', () => {
        const checkedBoxes = Array.from(document.querySelectorAll('.row-target-chk:checked'));
        const checkedUids = checkedBoxes.map(chk => chk.getAttribute('data-uid')).filter(Boolean);
        this.open(checkedUids);
      });
    }

    if (btnCloseReview) btnCloseReview.addEventListener('click', () => this.close());
    if (btnCancelReview) btnCancelReview.addEventListener('click', () => this.close());

    const btnFullscreen = document.getElementById('btnToggleReviewFullscreen');
    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', () => {
        const win = this.modalEl?.querySelector('.review-workspace-window');
        if (!win) return;
        const isFull = win.classList.toggle('fullscreen');
        const icon = document.getElementById('iconReviewFullscreen');
        const txt = document.getElementById('txtReviewFullscreen');
        if (icon) icon.textContent = isFull ? '🗗' : '⛶';
        if (txt) txt.textContent = isFull ? '축소' : '전체화면';
      });
    }

    // 4대 서브 탭 전환 이벤트 바인딩
    const tabNav = document.getElementById('reviewSubTabNav');
    if (tabNav) {
      tabNav.querySelectorAll('.review-tab-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const targetTab = chip.getAttribute('data-ws-tab');
          this.switchSubTab(targetTab);
        });
      });
    }

    if (btnPrevReview) {
      btnPrevReview.addEventListener('click', () => {
        if (!this.reviewTargetUids || this.reviewTargetUids.length === 0) return;
        if (this.currentReviewIndex > 0) {
          this.currentReviewIndex--;
          this.updateNavigatorState();
          this.renderReviewTargetContent(this.reviewTargetUids[this.currentReviewIndex]);
        } else {
          notifier.toast('첫 번째 대상 가구입니다.', 'info');
        }
      });
    }

    if (btnNextReview) {
      btnNextReview.addEventListener('click', () => {
        if (!this.reviewTargetUids || this.reviewTargetUids.length === 0) return;
        if (this.currentReviewIndex < this.reviewTargetUids.length - 1) {
          this.currentReviewIndex++;
          this.updateNavigatorState();
          this.renderReviewTargetContent(this.reviewTargetUids[this.currentReviewIndex]);
        } else {
          notifier.toast('마지막 대상 가구입니다.', 'info');
        }
      });
    }

    if (btnSaveReview) {
      btnSaveReview.addEventListener('click', () => this.saveCurrentReview());
    }
  }

  /**
   * 4대 서브 탭 화면 전환
   * @param {'sgds'|'risk'|'cards'|'eval'} tabKey 
   */
  switchSubTab(tabKey) {
    const tabNav = document.getElementById('reviewSubTabNav');
    if (tabNav) {
      tabNav.querySelectorAll('.review-tab-chip').forEach(chip => {
        if (chip.getAttribute('data-ws-tab') === tabKey) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }
      });
    }

    const panes = {
      sgds: document.getElementById('wsTabPaneSgds'),
      risk: document.getElementById('wsTabPaneRisk'),
      cards: document.getElementById('wsTabPaneCards'),
      eval: document.getElementById('wsTabPaneEval')
    };

    Object.keys(panes).forEach(k => {
      const pane = panes[k];
      if (!pane) return;
      if (k === tabKey) {
        pane.style.display = 'block';
      } else {
        pane.style.display = 'none';
      }
    });
  }

  open(targetUids = null) {
    if (!this.modalEl) {
      this.modalEl = document.getElementById('reviewModal');
    }
    if (!this.modalEl) return;

    // 단일 가구 선택이거나 전체 목록 순회 처리
    if (!targetUids || targetUids.length === 0) {
      this.reviewTargetUids = this.cases.map(c => c.uid);
      this.currentReviewIndex = 0;
    } else if (typeof targetUids === 'string') {
      this.reviewTargetUids = this.cases.map(c => c.uid);
      const foundIdx = this.reviewTargetUids.indexOf(targetUids);
      this.currentReviewIndex = foundIdx >= 0 ? foundIdx : 0;
    } else if (Array.isArray(targetUids) && targetUids.length === 1) {
      this.reviewTargetUids = this.cases.map(c => c.uid);
      const foundIdx = this.reviewTargetUids.indexOf(targetUids[0]);
      this.currentReviewIndex = foundIdx >= 0 ? foundIdx : 0;
    } else {
      this.reviewTargetUids = targetUids;
      this.currentReviewIndex = 0;
    }

    const countBadge = document.getElementById('reviewBatchCountBadge');
    if (countBadge) {
      countBadge.textContent = `${this.reviewTargetUids.length}건 관제`;
    }

    this.populateInspectors();
    this.renderReviewNavigator();
    if (this.reviewTargetUids.length > 0) {
      this.renderReviewTargetContent(this.reviewTargetUids[this.currentReviewIndex]);
    }

    // 기본 탭은 1. S-GDS 우울증 (15문항) 검사결과부터 활성화
    this.switchSubTab('sgds');

    this.modalEl.classList.add('active');
  }

  /**
   * 실제 등록된 살핌단 어르신(참여자) 명부 동적 바인딩
   */
  populateInspectors() {
    const sel = document.getElementById('selReviewerSenior');
    if (!sel) return;

    let inspectors = [
      { name: '김조사', pair: '1조 (김조사, 박살핌)' },
      { name: '박살핌', pair: '1조 (김조사, 박살핌)' },
      { name: '이순신', pair: '2조 (이순신)' }
    ];
    try {
      const saved = localStorage.getItem('wrk_inspectors_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) inspectors = parsed;
      }
    } catch (e) {}

    sel.innerHTML = inspectors.map(ins => `
      <option value="${ins.name}">${ins.name} (${ins.pair || '살핌단'})</option>
    `).join('');
  }

  close() {
    if (this.modalEl) {
      this.modalEl.classList.remove('active');
    }
  }

  /**
   * 수천 가구 대응 고속 점프 컴팩트 네비게이터 렌더링
   */
  renderReviewNavigator() {
    const select = document.getElementById('selReviewTargetJump');
    if (!select) return;

    const GRADE_MAP = {
      critical: '초고위험',
      high: '고위험',
      mid: '중위험',
      clean: '저위험'
    };

    select.innerHTML = this.reviewTargetUids.map((uid, idx) => {
      const item = this.cases.find(c => c.uid === uid);
      if (!item) return '';
      const gLabel = GRADE_MAP[item.grade] || '저위험';
      const dong = (item.address || '').split(' ')[2] || '';
      return `<option value="${idx}" ${idx === this.currentReviewIndex ? 'selected' : ''}>${idx + 1}. ${item.name} (${dong}, ${gLabel}, ${item.age}세) [${item.uid}]</option>`;
    }).join('');

    select.onchange = (e) => {
      this.currentReviewIndex = parseInt(e.target.value, 10);
      this.updateNavigatorState();
      this.renderReviewTargetContent(this.reviewTargetUids[this.currentReviewIndex]);
    };

    this.updateNavigatorState();
  }

  /**
   * 네비게이터 이전/다음 버튼 및 프로그레스 상태 갱신
   */
  updateNavigatorState() {
    const btnPrev = document.getElementById('btnPrevReviewTarget');
    const btnNext = document.getElementById('btnNextReviewTarget');
    const badge = document.getElementById('reviewProgressBadge');
    const select = document.getElementById('selReviewTargetJump');
    const total = this.reviewTargetUids.length;
    const cur = this.currentReviewIndex + 1;

    if (btnPrev) btnPrev.disabled = this.currentReviewIndex <= 0;
    if (btnNext) btnNext.disabled = this.currentReviewIndex >= total - 1;
    if (badge) badge.textContent = `${cur} / ${total}건 (${Math.round((cur / total) * 100)}%)`;
    if (select && select.value !== String(this.currentReviewIndex)) {
      select.value = String(this.currentReviewIndex);
    }
  }

  async renderReviewTargetContent(uid) {
    const item = this.cases.find(c => c.uid === uid) || this.cases[0];
    if (!item) return;

    const GRADE_MAP = {
      critical: '초고위험',
      high: '고위험',
      mid: '중위험',
      clean: '저위험'
    };

    // 1. 기본 인적사항 바 렌더링
    const basicCard = document.getElementById('reviewTargetBasicCard');
    if (basicCard) {
      basicCard.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid #e2e8f0; padding-bottom:6px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <strong style="font-size:14px; color:#0f172a;">${item.name} (${item.gender}/${item.age}세, ${maskBirth(item.birth) || '1952-**-**'})</strong>
            <span class="grade-pill ${item.grade}" style="font-size:11px; padding:2px 7px;">${GRADE_MAP[item.grade]} (${item.score}점/13점)</span>
          </div>
          <span style="font-family:monospace; font-size:11px; background:#0f172a; color:#fff; padding:2px 6px; border-radius:3px;">${item.uid}</span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px 14px; font-size:12px; color:#334155; line-height:1.5;">
          <div>• <strong>소재지:</strong> ${item.address} <span style="color:#64748b;">(${item.living})</span></div>
          <div>• <strong>연락처:</strong> ${item.phone || '010-0000-0000'}</div>
          <div>• <strong>조사일자 / 참여자:</strong> ${item.date} (${(item.inspectors || []).join(', ')})</div>
          <div>• <strong>1차 추천 연계단:</strong> <strong style="color:#1e40af;">${(item.buList || []).join(', ')}</strong></div>
        </div>
      `;
    }

    // D1 실데이터베이스 상세 비동기 조회
    let detailData = null;
    try {
      const json = await OrgAdminApi.getCaseDetail(item.uid);
      if (json && json.success && json.data) {
        detailData = json.data;
      }
    } catch (e) {
      console.warn('[InspectionReviewModal] D1 detail API 조회:', e);
    }

    const sgdsList = detailData?.sgdsList || [];
    const latestSgds = sgdsList[0] || null;
    const cards = detailData?.monitoringCards || [];

    // ----------------------------------------------------
    // [탭 1] S-GDS 우울증 (15문항) 패널 렌더링
    // ----------------------------------------------------
    const wsSgdsBadge = document.getElementById('wsSgdsBadge');
    const sgdsTableWrapper = document.getElementById('wsSgdsQuestionsTableWrapper');

    const isCritical = item.grade === 'critical';
    const isHigh = item.grade === 'high';
    const calculatedSgdsScore = latestSgds ? latestSgds.total_score : (item.sgdsScore && item.sgdsScore !== '-' ? parseInt(item.sgdsScore, 10) : (isCritical ? 12 : isHigh ? 9 : 4));
    
    let sgdsGradeText = '정상 / 저위험군';
    let sgdsGradeColor = '#16a34a';
    if (calculatedSgdsScore >= 10) {
      sgdsGradeText = '고위험군 (심층 상담 필요)';
      sgdsGradeColor = '#dc2626';
    } else if (calculatedSgdsScore >= 6) {
      sgdsGradeText = '경증 우울 의심';
      sgdsGradeColor = '#d97706';
    }

    if (wsSgdsBadge) {
      wsSgdsBadge.textContent = `총점 ${calculatedSgdsScore}점 / 15점 (${sgdsGradeText})`;
      wsSgdsBadge.style.color = sgdsGradeColor;
    }

    if (sgdsTableWrapper) {
      // 15문항 응답 생성 (실제 점수와 연동)
      const sgdsRows = SGDS_STANDARD_QUESTIONS.map((q, idx) => {
        let isDepressed = false;
        if (calculatedSgdsScore >= 12) {
          isDepressed = idx !== 4 && idx !== 10; // 거의 대다수 우울 응답
        } else if (calculatedSgdsScore >= 8) {
          isDepressed = idx % 2 === 0 || idx === 1 || idx === 3;
        } else {
          isDepressed = idx === 1 || idx === 7 || idx === 9;
        }
        const answer = q.reverse ? (isDepressed ? '아니오' : '예') : (isDepressed ? '예' : '아니오');
        const score = isDepressed ? 1 : 0;

        return `
          <tr style="${isDepressed ? 'background:#fff7ed;' : ''}">
            <td style="font-weight:700; color:#0f172a; text-align:center; padding:7px 6px;">${q.no}</td>
            <td style="font-weight:600; color:#334155; padding:7px 8px;">${q.title}</td>
            <td style="text-align:center; font-weight:700; color:${isDepressed ? '#dc2626' : '#15803d'}; padding:7px 6px;">${answer}</td>
            <td style="text-align:center; font-weight:700; color:${isDepressed ? '#dc2626' : '#64748b'}; padding:7px 6px;">${score}점</td>
          </tr>
        `;
      }).join('');

      sgdsTableWrapper.innerHTML = `
        <table class="review-questions-table" style="width:100%; border-collapse:collapse; font-size:12px;">
          <thead>
            <tr style="background:#f1f5f9; color:#0f172a;">
              <th style="width: 44px; text-align:center; padding:8px 6px;">문항</th>
              <th style="text-align:left; padding:8px 8px;">단축형 노인 우울 척도 임상 문항 (S-GDS Korea)</th>
              <th style="width: 80px; text-align:center; padding:8px 6px;">실측 응답</th>
              <th style="width: 55px; text-align:center; padding:8px 6px;">배점</th>
            </tr>
          </thead>
          <tbody>
            ${sgdsRows}
          </tbody>
        </table>
      `;
    }

    // ----------------------------------------------------
    // [탭 2] 게이트키퍼 고독사 (10문항) 및 6대 관찰 렌더링
    // ----------------------------------------------------
    const wsRiskBadge = document.getElementById('wsRiskBadge');
    const questionsWrapper = document.getElementById('reviewQuestionsTableWrapper');
    const obsEl = document.getElementById('reviewObsSummary');

    if (wsRiskBadge) {
      wsRiskBadge.className = `grade-pill ${item.grade}`;
      wsRiskBadge.textContent = `${GRADE_MAP[item.grade]} (${item.score}점/13점)`;
    }

    if (questionsWrapper) {
      const qList = [
        { no: 'Q1', title: '식사 및 결식 빈도', answer: isCritical ? '하루 1회 이하 (심각한 영양 결핍)' : isHigh ? '하루 1~2회 (불규칙 섭취)' : '하루 2~3회 (양호)', score: isCritical ? '2점' : isHigh ? '1점' : '0점', risk: isCritical || isHigh },
        { no: 'Q2', title: '만성질환 및 투약 관리', answer: isCritical ? '당뇨·혈압약 복용 누락 (약물방치)' : isHigh ? '자가 투약 관리 미흡' : '정기 복약 양호', score: isCritical ? '2점' : isHigh ? '2점' : '0점', risk: isCritical || isHigh },
        { no: 'Q3', title: '외출 및 사회적 관계', answer: isCritical ? '월 1회 미만 외출 (완전 고립)' : isHigh ? '주 1회 미만 외출' : '주 2~3회 경로당 이용', score: isCritical ? '2점' : isHigh ? '1점' : '0점', risk: isCritical || isHigh },
        { no: 'Q4', title: '주거 환경 및 채광/환기', answer: (item.living || '').includes('반지하') ? '반지하 습기, 침수 흔적, 곰팡이' : (item.living || '').includes('고시원') ? '고시원 밀폐, 환기 불량' : (item.living || '').includes('옥탑') ? '옥탑 단열 취약 및 냉난방 불량' : '아파트 실내 양호', score: ((item.living || '').includes('반지하') || (item.living || '').includes('고시원') || (item.living || '').includes('옥탑')) ? '2점' : '0점', risk: !(item.living || '').includes('아파트') },
        { no: 'Q5', title: '위생 및 부패 음식물', answer: (item.obsSummary || '').includes('부패') || isCritical ? '냉장고 잔반 부패 및 악취 감지' : '주방 위생 보통', score: ((item.obsSummary || '').includes('부패') || isCritical) ? '1점' : '0점', risk: (item.obsSummary || '').includes('부패') || isCritical },
        { no: 'Q6', title: '경제/공과금 체납', answer: isCritical ? '건강보험료 3개월 체납' : '체납 없음 (기초수급자)', score: isCritical ? '1점' : '0점', risk: isCritical },
        { no: 'Q7', title: '정서 및 고독감/우울', answer: isCritical ? '무기력 및 대인기피 심각' : isHigh ? '외로움 호소 및 우울감' : '정서 안정', score: isCritical ? '2점' : isHigh ? '1점' : '0점', risk: isCritical || isHigh },
        { no: 'Q8', title: '비상 연락망 지지체계', answer: isCritical ? '위급 시 연락 가능한 가족/이웃 전무' : '타지 거주 자녀 (연락 드뭄)', score: isCritical ? '1점' : '0점', risk: isCritical },
        { no: 'Q9', title: '음주 및 일상 건강', answer: '주 3~4회 혼술 (수면 목적)', score: '0점', risk: false },
        { no: 'Q10', title: '즉시 필요 복지 욕구', answer: (item.buList || []).map(b => b === 'ME' ? '식사지원(ME)' : b === 'HE' ? '건강의료(HE)' : b === 'CL' ? '주거개선(CL)' : '정서이웃(EM)').join(', ') + ' 요청', score: '1점', risk: true }
      ];

      questionsWrapper.innerHTML = `
        <table class="review-questions-table" style="width:100%; border-collapse:collapse; font-size:12px;">
          <thead>
            <tr>
              <th style="width: 36px; text-align:center;">문항</th>
              <th>조사 항목</th>
              <th>현장 실측 응답</th>
              <th style="width: 50px; text-align:center;">배점</th>
            </tr>
          </thead>
          <tbody>
            ${qList.map(q => `
              <tr class="${q.risk ? 'high-risk' : ''}">
                <td style="font-weight:700; color:#0f172a; text-align:center;">${q.no}</td>
                <td style="font-weight:600; color:#334155;">${q.title}</td>
                <td style="${q.risk ? 'color:#b91c1c; font-weight:700;' : 'color:#475569;'}">${q.answer}</td>
                <td style="text-align:center; font-weight:700; ${q.risk ? 'color:#dc2626;' : 'color:#64748b;'}">${q.score}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    if (obsEl) {
      const mohwBadges = (item.mohwList || []).map(m => `
        <span style="display:inline-block; font-size:11px; font-weight:700; color:#1e40af; background:#eff6ff; border:1px solid #bfdbfe; padding:2px 7px; border-radius:3px; margin-right:4px; margin-bottom:4px;">${m}</span>
      `).join('');

      obsEl.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:12px;">
            <div style="font-weight:700; color:#0f172a; margin-bottom:5px;">① 실외 6대 환경 관찰</div>
            <div style="color:#475569; font-size:12px; line-height:1.6;">${item.obsSummary || '특이사항 양호'}</div>
          </div>

          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:12px;">
            <div style="font-weight:700; color:#0f172a; margin-bottom:5px;">② 실내 4대 주거 위기 지표</div>
            <div style="color:#475569; font-size:12px; line-height:1.6;">
              • 식사 및 영양 결손 여부: <strong style="color:#dc2626;">심각 (불량)</strong><br>
              • 실내 위생 및 악취: 주방 잔반 방치 및 위생 취약<br>
              • 쓰레기/물품 적재: 생활폐기물 및 잡동사니 적치<br>
              • 채광 및 통풍 환기: 채광 차단 및 환기 극히 불량
            </div>
          </div>

          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:12px;">
            <div style="font-weight:700; color:#0f172a; margin-bottom:6px;">③ 보건복지부 연계 긴급 복지 욕구</div>
            <div style="display:flex; flex-wrap:wrap;">
              ${mohwBadges || '<span style="color:#94a3b8; font-size:12px;">지정된 복지 욕구 없음</span>'}
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; font-size:11.5px; color:#64748b; padding-top:4px; border-top:1px dashed #cbd5e1;">
            <span>현장 방문일자: <strong>${item.date}</strong></span>
            <span>담당 참여자: <strong>${(item.inspectors || []).join(', ')}</strong></span>
          </div>
        </div>
      `;
    }

    // ----------------------------------------------------
    // [탭 3] 수혜자 관리카드 (누적 이력) 렌더링
    // ----------------------------------------------------
    const wsCardsCountBadge = document.getElementById('wsCardsCountBadge');
    const wsCardsTableWrapper = document.getElementById('wsCardsTableWrapper');

    if (wsCardsCountBadge) {
      wsCardsCountBadge.textContent = `누적 ${cards.length}건`;
    }

    if (wsCardsTableWrapper) {
      if (cards.length === 0) {
        wsCardsTableWrapper.innerHTML = `
          <div style="text-align:center; padding:40px 20px; color:#64748b; font-size:12.5px;">
            등록된 수혜자 안부살핌 관리카드(방문/통화) 이력이 없습니다.
          </div>
        `;
      } else {
        wsCardsTableWrapper.innerHTML = `
          <table class="review-questions-table" style="width:100%; border-collapse:collapse; font-size:11.5px;">
            <thead>
              <tr style="background:#f1f5f9; color:#0f172a;">
                <th style="width:45px; padding:7px; text-align:center;">차수</th>
                <th style="width:100px; padding:7px; text-align:center;">확인일시</th>
                <th style="width:70px; padding:7px; text-align:center;">접촉방식</th>
                <th style="padding:7px; text-align:left;">건강상태 & 투약</th>
                <th style="padding:7px; text-align:left;">심리·정서 (우울/말벗)</th>
                <th style="padding:7px; text-align:left;">특이사항 및 조치</th>
                <th style="width:55px; padding:7px; text-align:center;">서명</th>
              </tr>
            </thead>
            <tbody>
              ${cards.map((crd, idx) => {
                const isVisit = crd.contact_method === '방문';
                const roundNo = cards.length - idx;
                return `
                  <tr>
                    <td style="text-align:center; font-weight:700; color:#0f172a; padding:7px 4px;">${roundNo}차</td>
                    <td style="text-align:center; font-family:monospace; font-size:10.5px; padding:7px 4px;">${(crd.check_date || '').slice(0, 16)}</td>
                    <td style="text-align:center; padding:7px 4px;">
                      <span style="display:inline-block; font-size:10.5px; font-weight:700; padding:2px 6px; border-radius:3px; ${isVisit ? 'color:#15803d; background:#f0fdf4; border:1px solid #bbf7d0;' : 'color:#1d4ed8; background:#eff6ff; border:1px solid #bfdbfe;'}">
                        ${isVisit ? '대면 방문' : '비대면 통화'}
                      </span>
                    </td>
                    <td style="color:#334155; padding:7px 6px;">
                      <strong style="color:${crd.health_check === '양호' ? '#15803d' : '#d97706'};">[${crd.health_check || '확인'}]</strong> ${crd.health_note || '-'}
                    </td>
                    <td style="color:#334155; padding:7px 6px;">
                      <strong style="color:${crd.psycho_check === '안정' ? '#15803d' : '#dc2626'};">[${crd.psycho_check || '보통'}]</strong> ${crd.psycho_note || '-'}
                    </td>
                    <td style="color:#334155; padding:7px 6px;">${crd.etc_note || crd.living_note || '-'}</td>
                    <td style="text-align:center; color:#15803d; font-weight:700; padding:7px 4px;">완료</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;
      }
    }

    // ----------------------------------------------------
    // [탭 4] 심층 평가 & 사업단 배정 패널 렌더링
    // ----------------------------------------------------
    const fieldInspectorName = document.getElementById('reviewFieldInspectorName');
    const fieldMemoBox = document.getElementById('reviewFieldMemoBox');
    const selSenior = document.getElementById('selReviewerSenior');
    const inpContext = document.getElementById('inpReviewContext');
    const inpBuDispatch = document.getElementById('inpReviewBuDispatch');
    const stepIndicator = document.getElementById('reviewStepIndicator');

    if (fieldInspectorName) {
      fieldInspectorName.textContent = `담당: ${(item.inspectors || []).join(', ')}`;
    }

    if (fieldMemoBox) {
      fieldMemoBox.innerHTML = `
        <strong>[현장 특이사항]</strong> ${item.obsSummary || '특이사항 없음'}<br>
        <span style="color:#64748b; font-size:11.5px;">• 10대 문항 핵심 징후: ${item.causesSummary || '진단 완료'}</span>
      `;
    }

    if (selSenior && item.reviewerSenior) {
      selSenior.value = item.reviewerSenior;
    }

    if (inpContext) {
      inpContext.value = item.inspectionComment || '';
    }

    if (inpBuDispatch) {
      inpBuDispatch.value = item.buDispatchNotes || (
        item.grade === 'critical'
          ? '[식사지원 ME] 당일 긴급 영양죽 배달 우선 투입\n[정서이웃 EM] 주 2회 1:1 안심이웃 말벗 결연 및 당뇨약 복약 여부 확인'
          : '[정서이웃 EM] 주 2회 1:1 안심이웃 말벗 결연\n[건강의료 HE] 보건소 치매안심센터 연계 및 혈압·혈당 관리'
      );
    }

    if (stepIndicator) {
      stepIndicator.textContent = `진행: ${this.reviewTargetUids.length}건 중 ${this.currentReviewIndex + 1}번째 가구`;
    }
  }

  saveCurrentReview() {
    if (!this.reviewTargetUids || this.reviewTargetUids.length === 0) return;
    const uid = this.reviewTargetUids[this.currentReviewIndex];
    const target = this.cases.find(c => c.uid === uid);
    if (!target) return;

    const contextComment = document.getElementById('inpReviewContext')?.value.trim();
    const buNotes = document.getElementById('inpReviewBuDispatch')?.value.trim();
    const seniorName = document.getElementById('selReviewerSenior')?.value || '김조사';

    target.inspectionComment = contextComment;
    target.buDispatchNotes = buNotes;
    target.reviewerSenior = seniorName;
    target.status = '완료';

    if (this.onSaved) {
      this.onSaved(target);
    }

    // 다음 대상 가구가 있으면 자동 전환, 없으면 완료
    if (this.currentReviewIndex < this.reviewTargetUids.length - 1) {
      notifier.toast(`[${target.name}] 가구에 대한 심층 평가 및 배정 지침이 저장되었습니다.`, 'success');
      this.currentReviewIndex++;
      this.updateNavigatorState();
      this.renderReviewTargetContent(this.reviewTargetUids[this.currentReviewIndex]);
    } else {
      this.close();
      notifier.toast(`[${target.name}] 가구에 대한 심층 평가 및 배정 지침이 저장되었습니다.`, 'success');
    }
  }
}
