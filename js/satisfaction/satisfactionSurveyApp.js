/**
 * @file satisfactionSurveyApp.js
 * @description 부평형 지역사회 통합돌봄 이용자 만족도 조사 핵심 컨트롤러
 */

import { SATISFACTION_SPEC } from './satisfactionSpecs.js';

class SatisfactionSurveyApp {
  constructor() {
    this.spec = SATISFACTION_SPEC;
    this.state = {
      basicInfo: {
        dong: '부평1동',
        targetName: '',
        birth: '',
        surveyDate: new Date().toISOString().split('T')[0],
        investigator: '',
        respondentType: '본인',
        respondentRelation: '',
        serviceName: '식사영양지원',
        caseUid: ''
      },
      profile: {
        gender: '여',
        ageRange: '75세 이상',
        livingArrangement: '독거',
        livingArrangementCustom: '',
        socialSecurity: '기초생활수급자',
        socialSecurityCustom: '',
        targetCharacteristic: '장기요양 재가급여자'
      },
      serviceExperience: {
        q1_inflowRoute: '공무원 안내',
        q1_custom: '',
        likert: {
          2: { score: null, reason: '' },
          3: { score: null, reason: '' },
          4: { score: null, reason: '' },
          5: { score: null, reason: '' },
          6: { score: null, reason: '' },
          7: { score: null, reason: '' },
          8: { score: null, reason: '' }
        }
      },
      feedback: {
        q9_helpful: '일상생활(가사, 식사 등)',
        q9_custom: '',
        q10_needed: ['건강관리예방'],
        q10_custom: '',
        q11_complaints: ['없음'],
        q11_custom: ''
      },
      opinions: {
        q12_best: '',
        q13_complaint: ''
      },
      investigatorCheck: {
        reliability: '높음',
        communication: '원활',
        futureLinkage: '필요',
        notes: ''
      }
    };

    this.userManualComplaintText = '';
  }

  init() {
    this.parseUrlParams();
    this.renderForm();
    this.bindEvents();
  }

  parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('caseUid')) this.state.basicInfo.caseUid = params.get('caseUid');
    if (params.get('targetName')) this.state.basicInfo.targetName = params.get('targetName');
    if (params.get('birth')) this.state.basicInfo.birth = params.get('birth');
    if (params.get('dong')) this.state.basicInfo.dong = params.get('dong');
    if (params.get('serviceName')) this.state.basicInfo.serviceName = params.get('serviceName');
    if (params.get('investigator')) this.state.basicInfo.investigator = params.get('investigator');
  }

  renderForm() {
    const root = document.getElementById('surveyRoot');
    if (!root) return;

    root.innerHTML = `
      <!-- Ⅰ. 조사 기본정보 -->
      <section class="survey-section-card">
        <div class="section-head">
          <h2 class="section-title">Ⅰ. 조사 기본정보</h2>
          <span class="section-badge">조사자 사전기입</span>
        </div>
        <div class="form-grid-3">
          <div class="form-group">
            <label class="form-label required">행정동</label>
            <select class="form-control" id="inputDong">
              ${this.spec.dongList.map(d => `<option value="${d}" ${d === this.state.basicInfo.dong ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label required">대상자명</label>
            <input type="text" class="form-control" id="inputTargetName" value="${this.state.basicInfo.targetName}" placeholder="성명 입력 (예: 홍길동)">
          </div>
          <div class="form-group">
            <label class="form-label required">생년월일 (앞 1자리 포함)</label>
            <input type="text" class="form-control" id="inputBirth" value="${this.state.basicInfo.birth}" placeholder="예: 480312-1">
          </div>
        </div>

        <div class="form-grid-3">
          <div class="form-group">
            <label class="form-label required">조사일자</label>
            <input type="date" class="form-control" id="inputSurveyDate" value="${this.state.basicInfo.surveyDate}">
          </div>
          <div class="form-group">
            <label class="form-label required">조사자 (활동가)</label>
            <input type="text" class="form-control" id="inputInvestigator" value="${this.state.basicInfo.investigator}" placeholder="조사원 성명">
          </div>
          <div class="form-group">
            <label class="form-label required">서비스명</label>
            <input type="text" class="form-control" id="inputServiceName" value="${this.state.basicInfo.serviceName}" placeholder="예: 식사영양지원, 동행돌봄 등">
          </div>
        </div>

        <!-- 응답자 구분 (본인/가족/기타) -->
        <div class="form-group" style="margin-top: 6px;">
          <label class="form-label required">응답자 구분</label>
          <div class="chip-group" id="respondentChipGroup">
            ${['본인', '가족', '기타'].map(type => `
              <label class="chip-item">
                <input type="radio" name="respondentType" value="${type}" ${this.state.basicInfo.respondentType === type ? 'checked' : ''}>
                <span class="chip-text">${type === '본인' ? '👤 본인 직접 응답' : (type === '가족' ? '👨‍👩‍👧 가족 응답' : '👥 기타 대리 응답')}</span>
              </label>
            `).join('')}
          </div>
          <div id="respondentRelationWrap" style="margin-top: 8px; display: ${this.state.basicInfo.respondentType !== '본인' ? 'block' : 'none'};">
            <input type="text" class="form-control" id="inputRespondentRelation" value="${this.state.basicInfo.respondentRelation}" placeholder="대상자와의 관계를 입력하세요 (예: 자녀, 며느리, 이웃 등)">
          </div>
        </div>
      </section>

      <!-- Ⅱ. 조사 기본정보 (대상자 특성) -->
      <section class="survey-section-card">
        <div class="section-head">
          <h2 class="section-title">Ⅱ. 대상자 특성</h2>
          <span class="section-badge">조사자 사전기입</span>
        </div>

        <div class="form-group">
          <label class="form-label required">➊ 성별</label>
          <div class="chip-group">
            ${this.spec.profileOptions.genders.map(g => `
              <label class="chip-item">
                <input type="radio" name="profileGender" value="${g}" ${this.state.profile.gender === g ? 'checked' : ''}>
                <span class="chip-text">${g === '남' ? '남성' : '여성'}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label required">➋ 연령대</label>
          <div class="chip-group">
            ${this.spec.profileOptions.ageRanges.map(a => `
              <label class="chip-item">
                <input type="radio" name="profileAgeRange" value="${a}" ${this.state.profile.ageRange === a ? 'checked' : ''}>
                <span class="chip-text">${a}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label required">➌ 가구형태</label>
          <div class="chip-group">
            ${this.spec.profileOptions.livingArrangements.map(l => `
              <label class="chip-item">
                <input type="radio" name="profileLiving" value="${l}" ${this.state.profile.livingArrangement === l ? 'checked' : ''}>
                <span class="chip-text">${l}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label required">➍ 사회보장</label>
          <div class="chip-group">
            ${this.spec.profileOptions.socialSecurities.map(s => `
              <label class="chip-item">
                <input type="radio" name="profileSocial" value="${s}" ${this.state.profile.socialSecurity === s ? 'checked' : ''}>
                <span class="chip-text">${s}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label required">➎ 대상자 특성</label>
          <div class="chip-group">
            ${this.spec.profileOptions.targetCharacteristics.map(t => `
              <label class="chip-item">
                <input type="radio" name="profileTargetChar" value="${t}" ${this.state.profile.targetCharacteristic === t ? 'checked' : ''}>
                <span class="chip-text">${t}</span>
              </label>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- Ⅲ. 서비스 이용 만족도 (문항 1~8) -->
      <section class="survey-section-card">
        <div class="section-head">
          <h2 class="section-title">Ⅲ. 서비스 이용 만족도</h2>
          <span class="section-badge">1~8번 (리커트 5점 척도)</span>
        </div>

        <!-- 1번 문항: 이용 경로 -->
        <div class="question-item-card">
          <div class="question-title-row">
            <span class="question-title-text">${this.spec.serviceExperience.q1.title}</span>
            <span class="question-category-tag">이용 경로</span>
          </div>
          <div class="chip-group">
            ${this.spec.serviceExperience.q1.options.map(opt => `
              <label class="chip-item">
                <input type="radio" name="q1_route" value="${opt}" ${this.state.serviceExperience.q1_inflowRoute === opt ? 'checked' : ''}>
                <span class="chip-text">${opt}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <!-- 2~8번 리커트 문항 -->
        ${this.spec.serviceExperience.likertQuestions.map(q => {
          const current = this.state.serviceExperience.likert[q.id];
          const isLowScore = current.score === 1 || current.score === 2;
          return `
            <div class="question-item-card" data-qid="${q.id}">
              <div class="question-title-row">
                <span class="question-title-text">${q.title}</span>
                <span class="question-category-tag">${q.category}</span>
              </div>

              <!-- 리커트 5점 척도 선택 버튼 그룹 -->
              <div class="likert-button-group">
                ${this.spec.serviceExperience.likertScale.map(scale => `
                  <label class="likert-btn-label">
                    <input type="radio" name="likert_q_${q.id}" value="${scale.score}" ${current.score === scale.score ? 'checked' : ''}>
                    <span class="likert-score-badge">${scale.badge}</span>
                    <span class="likert-desc-text">${scale.desc}</span>
                  </label>
                `).join('')}
              </div>

              <!-- 1~2점 체크 시 동적 불만족 사유 입력창 -->
              <div class="sub-complaint-box" id="subComplaintWrap_${q.id}" style="display: ${isLowScore ? 'block' : 'none'};">
                <div class="sub-complaint-head">
                  <span>⚠️ 불만족 사유 입력 (${q.category})</span>
                </div>
                <input type="text" class="sub-complaint-input" id="subComplaintInput_${q.id}" value="${current.reason || ''}" placeholder="${q.category} 관련 불편하거나 아쉬웠던 점을 적어주세요">
              </div>
            </div>
          `;
        }).join('')}
      </section>

      <!-- Ⅳ. 가장 도움이 된 분야 및 개선 필요 분야 (문항 9~11) -->
      <section class="survey-section-card">
        <div class="section-head">
          <h2 class="section-title">Ⅳ. 가장 도움이 된 분야 및 개선 필요 분야</h2>
          <span class="section-badge">9~11번</span>
        </div>

        <!-- 9번: 가장 도움이 된 분야 (단일 선택) -->
        <div class="question-item-card">
          <div class="question-title-row">
            <span class="question-title-text">${this.spec.serviceFeedback.q9.title}</span>
            <span class="question-category-tag">단일 선택</span>
          </div>
          <div class="chip-group">
            ${this.spec.serviceFeedback.q9.options.map(opt => `
              <label class="chip-item">
                <input type="radio" name="q9_helpful" value="${opt}" ${this.state.feedback.q9_helpful === opt ? 'checked' : ''}>
                <span class="chip-text">${opt}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <!-- 10번: 추가로 필요한 서비스 (복수 선택) -->
        <div class="question-item-card">
          <div class="question-title-row">
            <span class="question-title-text">${this.spec.serviceFeedback.q10.title}</span>
            <span class="question-category-tag">복수 선택</span>
          </div>
          <div class="chip-group">
            ${this.spec.serviceFeedback.q10.options.map(opt => `
              <label class="chip-item">
                <input type="checkbox" name="q10_needed" value="${opt}" ${this.state.feedback.q10_needed.includes(opt) ? 'checked' : ''}>
                <span class="chip-text">${opt}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <!-- 11번: 불편 및 불만 사항 (복수 선택) -->
        <div class="question-item-card">
          <div class="question-title-row">
            <span class="question-title-text">${this.spec.serviceFeedback.q11.title}</span>
            <span class="question-category-tag">복수 선택</span>
          </div>
          <div class="chip-group">
            ${this.spec.serviceFeedback.q11.options.map(opt => `
              <label class="chip-item">
                <input type="checkbox" name="q11_complaints" value="${opt}" ${this.state.feedback.q11_complaints.includes(opt) ? 'checked' : ''}>
                <span class="chip-text">${opt}</span>
              </label>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- Ⅴ. 주관식 의견 (문항 12~13) -->
      <section class="survey-section-card">
        <div class="section-head">
          <h2 class="section-title">Ⅴ. 주관식 의견 (응답자 자유 기재)</h2>
          <span class="section-badge">12~13번</span>
        </div>

        <!-- 12번: 가장 만족한 점 -->
        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label">12. 가장 만족한 점</label>
          <textarea class="form-control" id="inputQ12Best" rows="3" placeholder="${this.spec.freeFeedback.q12.placeholder}">${this.state.opinions.q12_best}</textarea>
        </div>

        <!-- 13번: 불만족 사유 및 건의사항 (대영역 Ⅲ 1~2점 체크 시 자동 연동) -->
        <div class="form-group">
          <label class="form-label" style="display: flex; justify-content: space-between; align-items: center;">
            <span>13. 불만족 사유 및 건의사항</span>
            <span style="font-size: 11px; font-weight: 600; color: #e11d48;" id="complaintSyncBadge">
              ※ 대영역 Ⅲ 1·2점 자동 연동 중
            </span>
          </label>
          <textarea class="form-control" id="inputQ13Complaint" rows="5" placeholder="${this.spec.freeFeedback.q13.placeholder}">${this.state.opinions.q13_complaint}</textarea>
        </div>
      </section>

      <!-- Ⅵ. 조사자 확인 (사후기입) -->
      <section class="survey-section-card">
        <div class="section-head">
          <h2 class="section-title">Ⅵ. 조사자 확인</h2>
          <span class="section-badge">조사자 사후기입</span>
        </div>

        <div class="form-grid-3">
          <div class="form-group">
            <label class="form-label required">응답 신뢰도</label>
            <div class="chip-group">
              ${this.spec.investigatorCheck.reliability.map(r => `
                <label class="chip-item">
                  <input type="radio" name="checkReliability" value="${r}" ${this.state.investigatorCheck.reliability === r ? 'checked' : ''}>
                  <span class="chip-text">${r}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div class="form-group">
            <label class="form-label required">의사소통</label>
            <div class="chip-group">
              ${this.spec.investigatorCheck.communication.map(c => `
                <label class="chip-item">
                  <input type="radio" name="checkCommunication" value="${c}" ${this.state.investigatorCheck.communication === c ? 'checked' : ''}>
                  <span class="chip-text">${c}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div class="form-group">
            <label class="form-label required">향후 연계</label>
            <div class="chip-group">
              ${this.spec.investigatorCheck.futureLinkage.map(f => `
                <label class="chip-item">
                  <input type="radio" name="checkFutureLinkage" value="${f}" ${this.state.investigatorCheck.futureLinkage === f ? 'checked' : ''}>
                  <span class="chip-text">${f}</span>
                </label>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="form-group" style="margin-top: 10px;">
          <label class="form-label">특이사항 (소견)</label>
          <input type="text" class="form-control" id="inputCheckNotes" value="${this.state.investigatorCheck.notes}" placeholder="현장 관찰 특이사항 및 살핌 소견 기재">
        </div>
      </section>

      <!-- 하단 고정 액션바 -->
      <div class="bottom-action-bar">
        <button type="button" class="btn-secondary-action" id="btnSaveDraft">임시 저장</button>
        <button type="button" class="btn-primary-action" id="btnSubmitSurvey">만족도 조사 제출 완료</button>
      </div>
    `;
  }

  bindEvents() {
    // Ⅰ. 응답자 구분 라디오 변경 감지
    document.querySelectorAll('input[name="respondentType"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.state.basicInfo.respondentType = e.target.value;
        const wrap = document.getElementById('respondentRelationWrap');
        if (wrap) {
          wrap.style.display = (e.target.value !== '본인') ? 'block' : 'none';
        }
      });
    });

    document.getElementById('inputRespondentRelation')?.addEventListener('input', (e) => {
      this.state.basicInfo.respondentRelation = e.target.value;
    });

    // Ⅲ. 리커트 5점 척도 선택 및 1~2점 감지
    this.spec.serviceExperience.likertQuestions.forEach(q => {
      document.querySelectorAll(`input[name="likert_q_${q.id}"]`).forEach(radio => {
        radio.addEventListener('change', (e) => {
          const score = parseInt(e.target.value, 10);
          this.state.serviceExperience.likert[q.id].score = score;

          const wrap = document.getElementById(`subComplaintWrap_${q.id}`);
          if (wrap) {
            wrap.style.display = (score === 1 || score === 2) ? 'block' : 'none';
          }

          // 13번 의견란 동기화
          this.syncComplaintsToQuestion13();
        });
      });

      // 개별 불만족 사유 인라인 입력 시 13번 동기화
      document.getElementById(`subComplaintInput_${q.id}`)?.addEventListener('input', (e) => {
        this.state.serviceExperience.likert[q.id].reason = e.target.value;
        this.syncComplaintsToQuestion13();
      });
    });

    // 11번 문항 (불편 및 불만 사항): '없음' 상호 배타적 토글
    document.querySelectorAll('input[name="q11_complaints"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === '없음' && e.target.checked) {
          document.querySelectorAll('input[name="q11_complaints"]').forEach(cb => {
            if (cb.value !== '없음') cb.checked = false;
          });
        } else if (val !== '없음' && e.target.checked) {
          const noneCb = document.querySelector('input[name="q11_complaints"][value="없음"]');
          if (noneCb) noneCb.checked = false;
        }
        this.state.feedback.q11_complaints = Array.from(document.querySelectorAll('input[name="q11_complaints"]:checked')).map(cb => cb.value);
      });
    });

    // 13번 주관식 수기 변경 시
    const q13El = document.getElementById('inputQ13Complaint');
    if (q13El) {
      q13El.addEventListener('input', (e) => {
        this.state.opinions.q13_complaint = e.target.value;
      });
    }

    // 제출 버튼
    document.getElementById('btnSubmitSurvey')?.addEventListener('click', () => this.submit());
    // 임시저장 버튼
    document.getElementById('btnSaveDraft')?.addEventListener('click', () => this.saveDraft());
  }

  /**
   * 대영역 Ⅲ에서 1~2점 체크된 문항 목록을 13번 [불만족 사유 및 건의사항] 칸에 실시간 동기화
   */
  syncComplaintsToQuestion13() {
    const lowScoreList = [];
    this.spec.serviceExperience.likertQuestions.forEach(q => {
      const item = this.state.serviceExperience.likert[q.id];
      if (item.score === 1 || item.score === 2) {
        const scoreLabel = item.score === 1 ? '1점-전혀 그렇지 않다' : '2점-그렇지 않다';
        const reasonText = item.reason ? `: ${item.reason}` : ': (사유 미기재)';
        lowScoreList.push(`• [${q.id}번 ${q.category}(${scoreLabel})]${reasonText}`);
      }
    });

    const q13El = document.getElementById('inputQ13Complaint');
    if (!q13El) return;

    if (lowScoreList.length > 0) {
      const autoGeneratedSection = `[대영역 Ⅲ 불만족 체크 항목]\n${lowScoreList.join('\n')}\n\n[기타 건의사항]\n`;
      // 기존 작성 내용이 있다면 보존
      const userText = this.userManualComplaintText || '';
      q13El.value = `${autoGeneratedSection}${userText}`.trim();
      this.state.opinions.q13_complaint = q13El.value;
    }
  }

  saveDraft() {
    this.harvestFormValues();
    localStorage.setItem(`SATISFACTION_DRAFT_${this.state.basicInfo.caseUid || 'DEFAULT'}`, JSON.stringify(this.state));
    alert('임시 저장이 완료되었습니다.');
  }

  harvestFormValues() {
    this.state.basicInfo.dong = document.getElementById('inputDong')?.value || '';
    this.state.basicInfo.targetName = document.getElementById('inputTargetName')?.value || '';
    this.state.basicInfo.birth = document.getElementById('inputBirth')?.value || '';
    this.state.basicInfo.surveyDate = document.getElementById('inputSurveyDate')?.value || '';
    this.state.basicInfo.investigator = document.getElementById('inputInvestigator')?.value || '';
    this.state.basicInfo.serviceName = document.getElementById('inputServiceName')?.value || '';

    this.state.opinions.q12_best = document.getElementById('inputQ12Best')?.value || '';
    this.state.opinions.q13_complaint = document.getElementById('inputQ13Complaint')?.value || '';
    this.state.investigatorCheck.notes = document.getElementById('inputCheckNotes')?.value || '';
  }

  async submit() {
    this.harvestFormValues();

    if (!this.state.basicInfo.targetName) {
      alert('대상자명을 입력해 주십시오.');
      document.getElementById('inputTargetName')?.focus();
      return;
    }

    // 2~8번 리커트 미응답 검사
    const unselected = this.spec.serviceExperience.likertQuestions.filter(q => this.state.serviceExperience.likert[q.id].score === null);
    if (unselected.length > 0) {
      alert(`[대영역 Ⅲ 만족도] ${unselected[0].id}번 (${unselected[0].category}) 문항의 점수를 선택해 주십시오.`);
      document.querySelector(`div[data-qid="${unselected[0].id}"]`)?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    try {
      const res = await fetch('/api/satisfaction/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.state)
      });
      const data = await res.json();
      if (data.success) {
        alert('만족도 조사가 성공적으로 제출되었습니다.');
        window.location.reload();
      } else {
        throw new Error(data.message || '저장 실패');
      }
    } catch (err) {
      console.warn('서버 오프라인 또는 API 미등록 상태: 로컬 저장소 안전 보관', err);
      localStorage.setItem(`SATISFACTION_SUBMITTED_${Date.now()}`, JSON.stringify(this.state));
      alert('만족도 조사가 로컬 기기에 안전하게 저장되었습니다.');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new SatisfactionSurveyApp();
  app.init();
});
