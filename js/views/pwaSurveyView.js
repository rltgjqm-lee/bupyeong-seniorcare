/**
 * @file pwaSurveyView.js
 * @description PWA 현장 조사 모바일 메인 컨트롤러 (코디네이터) (ESM)
 */

import { UidEngine } from '../core/uid.js';
import { maskUid } from '../utils/mask.js';
import { ScoringEngine } from '../core/scoringEngine.js';
import { notifier } from '../utils/notifier.js?v=2.2.3';
import { SurveyApi } from '../api/surveyApi.js';
import { OfflineSyncService } from '../services/offlineSyncService.js';
import { ValidationService } from '../services/validationService.js';
import { loadLastBasicInfo } from '../services/participantService.js';
import { initTooltipListeners } from '../utils/tooltip.js';
import { getLocalTodayString } from '../utils/date.js';

import { Step1BasicView } from './steps/step1BasicView.js?v=2.2.5';
import { Step2TargetView } from './steps/step2TargetView.js?v=2.2.5';
import { Step2RevisitView } from './steps/step2RevisitView.js?v=2.2.5';
import { Step3ObservationView } from './steps/step3ObservationView.js?v=2.2.8';
import { Step4QuestionsView } from './steps/step4QuestionsView.js?v=2.2.5';
import { Step5ConsentView } from './steps/step5ConsentView.js?v=2.2.5';
import { Step6CardView } from './steps/step6CardView.js?v=2.5.0';
import { Step7DownloadView } from './steps/step7DownloadView.js?v=2.5.0';

export class PwaSurveyView {
  constructor() {
    this.isAppToAppNavigating = false;
    const today = getLocalTodayString();
    const lastBasic = loadLastBasicInfo();

    this.state = {
      currentTab: 1, // 1: 기본정보, 2: 대상자 확인, 3: 관찰기록, 4: 10대문항, 5: 동의·서명, 6: 관리카드, 7: 저장·다운로드
      currentQuestionStep: 1, // 1 ~ 10
      questionMode: 'step', // 'step' or 'all'
      beneficiaryCard: null,
      
      // Step 1: 기본 정보 & 활동가
      basicInfo: {
        orgName: lastBasic.orgName || '인천 부평구 통합돌봄센터',
        orgCode: lastBasic.orgCode || 'O-28-237-01',
        project: lastBasic.project || '고독사예방게이트키퍼',
        inspectors: Array.isArray(lastBasic.inspectors) && lastBasic.inspectors.length > 0 ? [...lastBasic.inspectors] : ['박영희'],
        inspectionDate: (lastBasic.inspectionDate && lastBasic.inspectionDate <= today) ? lastBasic.inspectionDate : today,
        rawSurveyUid: '',
        maskedSurveyUid: '',
        caseUid: ''
      },

      // Step 2: 대상가구 인적사항, 거주지 유형 및 보호자 (서식 299p) - 초기 빈 폼 시작
      targetProfile: {
        name: '',
        birth: '',
        gender: '',
        phone: '',
        address: '',
        baseAddress: '',
        detailAddress: '',
        housingType: '',
        housingCustom: '',
        guardian: {
          hasGuardian: null,
          relation: '자녀',
          name: '',
          phone: '',
          address: '',
          isProxySigner: false
        }
      },

      // Step 3: 현장 관찰 기록지 (외부 6종 + 탐문 + 방문 결과 판정) - 중립(미선택 null) 시작
      observation: {
        // 외부 6종
        mailAccumulated: null,
        odorInsects: null,
        trashBottles: null,
        tvLightOn: null,
        isolatedLiving: null,
        contactLost: null,
        // 이웃 탐문
        neighborNote: '',
        // 방문 결과 (대면 vs 미대면)
        visitResult: null, // 'met' | 'unmet'
        unmetReason: '',
        // 실내 4종 (Step 4 진입 시 작성)
        indoorMealCondition: null,
        indoorBottles: null,
        indoorHygieneCondition: null,
        indoorTrashExcrement: null
      },

      // Step 4: 10대 문항 답변 & 즉시 욕구
      answers: {},
      immediateNeeds: [],

      // Step 5: 개인정보 동의서 및 전자 서명 - 중립(미선택 null) 시작
      consent: {
        agreeCollect: null,
        agreeThirdParty: null,
        targetSignature: null,
        proxySignature: null,
        inspectorSignatures: {}
      }
    };

    this.updateInspectionUids();

    // 7개 단계별 모듈 뷰 인스턴스화
    this.stepViews = {
      1: new Step1BasicView(this),
      2: new Step2TargetView(this),
      3: new Step3ObservationView(this),
      4: new Step4QuestionsView(this),
      5: new Step5ConsentView(this),
      6: new Step6CardView(this),
      7: new Step7DownloadView(this)
    };

    this.revisitView = new Step2RevisitView(this);
    this.flowMode = 'ASSESSMENT'; // 'ASSESSMENT' | 'REVISIT'
  }

  /**
   * 재방문(서식 299p 안부 점검) 모드 시작
   */
  startRevisit(caseItem) {
    this.flowMode = 'REVISIT';
    this.revisitView.setCase(caseItem);
    this.revisitView.render('step2Container');
    this.switchTab(2);
    notifier.toast(`${caseItem.targetName} 대상자의 정기 안부 점검 화면으로 이동했습니다.`, 'info', 2500);
  }

  /**
   * 배정된 신규 가구 1차 진단 시작 (데이터 자동 인계)
   */
  startNewAssignedSurvey(caseItem) {
    this.flowMode = 'ASSESSMENT';
    const s = this.state;
    s.targetProfile.name = caseItem.targetName;
    s.targetProfile.birth = caseItem.birth;
    s.targetProfile.gender = caseItem.gender === 'M' ? '남' : '여';
    s.targetProfile.phone = caseItem.phone;
    s.targetProfile.address = caseItem.address;
    s.targetProfile.housingType = caseItem.housingType || '';
    
    if (caseItem.guardian) {
      s.targetProfile.guardian.hasGuardian = 'YES';
      s.targetProfile.guardian.relation = caseItem.guardian.relation;
      s.targetProfile.guardian.name = caseItem.guardian.name;
      s.targetProfile.guardian.phone = caseItem.guardian.phone;
      s.targetProfile.guardian.isProxySigner = caseItem.guardian.isProxySigner || false;
    } else {
      s.targetProfile.guardian.hasGuardian = 'NO';
    }

    s.basicInfo.householdId = caseItem.householdId;
    s.basicInfo.caseUid = caseItem.caseUid;

    this.stepViews[2].render();
    this.switchTab(2);
    notifier.toast(`${caseItem.targetName} 가구의 1차 진단 조사를 시작합니다.`, 'info', 2500);
  }

  /**
   * 목록 외 현장 직접 발굴 신규 등록 시작
   */
  startManualNewSurvey() {
    this.flowMode = 'ASSESSMENT';
    const s = this.state;
    s.targetProfile.name = '';
    s.targetProfile.birth = '';
    s.targetProfile.gender = '';
    s.targetProfile.phone = '';
    s.targetProfile.address = '';
    s.targetProfile.housingType = '';
    s.targetProfile.guardian = {
      hasGuardian: null,
      relation: '자녀',
      name: '',
      phone: '',
      address: '',
      isProxySigner: false
    };
    s.beneficiaryCard = null;

    this.updateInspectionUids();
    this.stepViews[2].render();
    this.switchTab(2);
    notifier.toast('신규 가구 조사를 시작합니다.', 'info', 2500);
  }

  updateInspectionUids() {
    const orgCode = this.state.basicInfo.orgCode || 'O-28-237-01';
    const caseUid = this.state.basicInfo.caseUid;

    if (!caseUid) {
      // 1단계(기본정보 단계): 대상자 가구 미배정이므로 기관 식별자만 확정하고 가구/일자는 미정(***-****)으로 표출
      const parts = orgCode.split('-');
      const sido = parts[1] || '28';
      const seq = parts[3] || '01';
      this.state.basicInfo.rawSurveyUid = '';
      this.state.basicInfo.maskedSurveyUid = `S-${sido}-***-${seq}-***-****`;
      return;
    }

    const rawSurveyUid = UidEngine.generateDatedSurveyUid(caseUid, this.state.basicInfo.inspectionDate);
    this.state.basicInfo.rawSurveyUid = rawSurveyUid;
    this.state.basicInfo.maskedSurveyUid = maskUid(rawSurveyUid);
  }

  init() {
    // 앱투앱(App-to-App) 딥링크 수신 처리 (시니어안심살핌 연계)
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const payload = urlParams.get('payload');
    let targetTab = 1;

    if (action === 'import_target' && payload) {
      try {
        const cleanPayload = payload.replace(/\s/g, '+');
        let decodedJson = '';
        try {
          decodedJson = decodeURIComponent(Array.prototype.map.call(atob(cleanPayload), (c) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
        } catch (e1) {
          decodedJson = decodeURIComponent(escape(atob(cleanPayload)));
        }
        const data = JSON.parse(decodedJson);

        // 1. 기관 정본 데이터 및 사업단 덮어쓰기 (하드코딩 기본값 교체)
        if (data.orgName) this.state.basicInfo.orgName = data.orgName;
        if (data.buName) this.state.basicInfo.project = data.buName;
        if (data.caseUid) this.state.basicInfo.caseUid = data.caseUid;
        if (data.orgCode) this.state.basicInfo.orgCode = data.orgCode;
        if (Array.isArray(data.participants) && data.participants.length > 0) {
          this.state.basicInfo.inspectors = data.participants.map(p => (typeof p === 'string' ? p.trim() : (p?.name || ''))).filter(Boolean);
        } else if (data.inspector) {
          this.state.basicInfo.inspectors = data.inspector.split(',').map(s => s.trim()).filter(Boolean);
        }
        if (data.surveyDate) this.state.basicInfo.inspectionDate = data.surveyDate;

        // 2. 대상자 인적사항 데이터
        this.state.targetProfile.name = data.targetName || '';
        // 생년월일 정규화 (YYMMDD ➔ YYYY-MM-DD)
        if (data.birth) {
          const rawDigits = data.birth.replace(/\D/g, '');
          if (rawDigits.length === 6) {
            const yy = rawDigits.slice(0, 2);
            const mm = rawDigits.slice(2, 4);
            const dd = rawDigits.slice(4, 6);
            const yearPrefix = parseInt(yy, 10) > 30 ? '19' : '20';
            this.state.targetProfile.birth = `${yearPrefix}${yy}-${mm}-${dd}`;
          } else {
            this.state.targetProfile.birth = data.birth;
          }
        }
        this.state.targetProfile.gender = (data.gender === '남' || data.gender === 'M') ? '남' : '여';
        this.state.targetProfile.phone = data.phone || '';

        // 3. 주소 스마트 분리 (기본 도로명주소 + 상세주소)
        const fullAddr = (data.address || '').trim();
        const addrMatch = fullAddr.match(/^(.+?[로|길|동|읍|면|가]\s*\d+(?:-\d+)?)(?:\s+(.*))?$/);
        let baseAddr = fullAddr;
        let detailAddr = '';

        if (addrMatch) {
          baseAddr = addrMatch[1].trim();
          detailAddr = (addrMatch[2] || '').trim();
        } else {
          const parts = fullAddr.split(/\s+/);
          if (parts.length >= 4) {
            baseAddr = parts.slice(0, 3).join(' ');
            detailAddr = parts.slice(3).join(' ');
          }
        }

        this.state.targetProfile.address = fullAddr;
        this.state.targetProfile.baseAddress = baseAddr;
        this.state.targetProfile.detailAddress = detailAddr;

        if (data.returnUrl) {
          this.returnUrl = data.returnUrl;
          sessionStorage.setItem('WRK_RETURN_URL', data.returnUrl);
        }

        this.updateInspectionUids();
        targetTab = 2; // 2단계(대상자 확인)로 직접 진입

        // URL 히스토리 정돈
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch (err) {
        console.warn('[WellRiskKeeper] 연계 데이터 수신 실패:', err);
      }
    }

    this.renderAllSteps();
    this.bindTabEvents();
    this.updateScore();
    this.switchTab(targetTab);
    if (targetTab === 2) {
      notifier.toast(`[${this.state.targetProfile.name || '어르신'}] 대상자 정보가 연계되었습니다.`, 'success', 2500);
    }
    initTooltipListeners('#questionsList');
    OfflineSyncService.initAutoSyncListener();
    this.initHistoryAndBackButtonProtection();
  }

  renderAllSteps() {
    for (let i = 1; i <= 7; i++) {
      if (this.stepViews[i]) {
        this.stepViews[i].render();
      }
    }
  }

  renderStep(stepNum) {
    if (this.stepViews[stepNum]) {
      this.stepViews[stepNum].render();
    }
  }

  updateScore() {
    const result = ScoringEngine.calculate(this.state.answers, this.state.immediateNeeds);
    const scoreEl = document.getElementById('pwaLiveScore');
    const gradeEl = document.getElementById('pwaLiveGrade');

    if (scoreEl) scoreEl.innerHTML = `${result.totalScore} <span>/ 13점</span>`;
    if (gradeEl) {
      gradeEl.className = result.grade.pillClass;
      gradeEl.innerText = result.grade.label;
    }
  }

  bindTabEvents() {
    document.querySelectorAll('.pwa-tab-item').forEach(tab => {
      tab.addEventListener('click', () => {
        const targetStep = parseInt(tab.getAttribute('data-tab'), 10);
        this.handleTabNavigationWithValidation(targetStep);
      });
    });
  }

  handleTabNavigationWithValidation(targetStep) {
    // 이전 단계로 돌아가는 것은 자유롭게 허용
    if (targetStep <= this.state.currentTab) {
      this.switchTab(targetStep);
      return;
    }

    // 다음 단계로 건너뛸 때는 이전 단계들의 유효성을 순차적으로 검증
    if (this.state.currentTab === 1 || targetStep > 1) {
      const v1 = ValidationService.validateBasicInfo(this.state.basicInfo);
      if (!v1.isValid) {
        notifier.alert({ title: '1단계 기본정보 확인 필요', message: v1.message, confirmText: '확인' });
        this.switchTab(1);
        return;
      }
    }

    if (targetStep > 2) {
      const v2 = ValidationService.validateTargetProfile(this.state.targetProfile);
      if (!v2.isValid) {
        notifier.alert({ title: '2단계 대상자 정보 확인 필요', message: v2.message, confirmText: '확인' });
        this.switchTab(2);
        return;
      }
    }

    if (targetStep > 3) {
      const v3 = ValidationService.validateStep3Observation(this.state.observation);
      if (!v3.isValid) {
        notifier.alert({ title: '3단계 외부관찰 및 방문결과 확인 필요', message: v3.message, confirmText: '확인' });
        this.switchTab(3);
        return;
      }

      if (this.state.observation.visitResult === 'unmet') {
        notifier.alert({
          title: '미대면 종결 대상',
          message: '방문 결과가 [미대면 (부재/거부)]으로 선택되어 있습니다.\n대화 진단 대신 3단계 하단의 [미대면 관찰기록 제출 및 종료]를 진행해 주십시오.',
          confirmText: '확인'
        });
        this.switchTab(3);
        return;
      }
    }

    if (targetStep > 4) {
      const v4 = ValidationService.validateSurveyProgress(this.state.answers, 10);
      if (!v4.isComplete) {
        notifier.alert({ title: '4단계 10대문항 확인 필요', message: v4.message, confirmText: '확인' });
        this.switchTab(4);
        return;
      }
    }

    if (targetStep > 5) {
      const isProxy = this.state.targetProfile.guardian && this.state.targetProfile.guardian.isProxySigner === true;
      const consentVal = ValidationService.validateConsentAndSignatures(this.state.consent, this.state.basicInfo.inspectors, isProxy);
      if (!consentVal.isValid) {
        notifier.alert({ title: '5단계 동의 및 전자서명 확인 필요', message: consentVal.message, confirmText: '확인' });
        this.switchTab(5);
        return;
      }
    }

    if (targetStep > 6) {
      const cardVal = ValidationService.validateStep6BeneficiaryCard(this.state.beneficiaryCard);
      if (!cardVal.isValid) {
        notifier.alert({ title: '6단계 수혜자 관리카드 확인 필요', message: cardVal.message, confirmText: '확인' });
        this.switchTab(6);
        return;
      }
    }

    this.switchTab(targetStep);
  }

  switchTab(tabNum) {
    this.state.currentTab = tabNum;

    // 1. 탭 버튼 상태 동적 업데이트 (완료: 오렌지 동그라미 압축, 현재: 다크네이비 활성, 대기: 연회색 유지)
    document.querySelectorAll('.pwa-tab-item').forEach(t => {
      const num = parseInt(t.getAttribute('data-tab'), 10);
      t.classList.remove('completed', 'active', 'upcoming');
      if (num < tabNum) {
        t.classList.add('completed');
      } else if (num === tabNum) {
        t.classList.add('active');
      } else {
        t.classList.add('upcoming');
      }
    });

    // 2. 섹션 표시 전환
    document.querySelectorAll('.pwa-view-section').forEach(s => s.classList.remove('active'));
    const activeSec = document.getElementById(`pwaSecStep${tabNum}`);
    if (activeSec) activeSec.classList.add('active');

    // 3. 하단 실시간 점수바 노출 제어 (오직 4단계 10대문항 조사 시에만 노출)
    const scoreBar = document.getElementById('pwaStickyScoreBar');
    if (scoreBar) {
      scoreBar.style.display = (tabNum === 4 ? 'flex' : 'none');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async handleSubmitUnmet() {
    notifier.toast('미대면 관찰기록지 데이터를 전송 중입니다...', 'info', 1500);

    const payload = {
      basicInfo: this.state.basicInfo,
      profile: this.state.targetProfile,
      observation: this.state.observation,
      consent: this.state.consent,
      isUnmetCase: true,
      submittedAt: new Date().toISOString()
    };

    const submitRes = await SurveyApi.submitSurvey(payload);

    notifier.alert({
      title: '미대면 관찰기록 제출 완료',
      message: '고독사예방게이트키퍼 대상자 부재/거부에 따른 현장 외부 관찰기록지가 정상 등록되었습니다.',
      details: [
        { label: '조사 관리번호', value: this.state.basicInfo.maskedSurveyUid },
        { label: '대상자 성명', value: this.state.targetProfile.name },
        { label: '방문 결과', value: '미대면 (부재 / 거부)' },
        { label: '미대면 상세 사유', value: this.state.observation.unmetReason || '부재중' },
        { label: '작성 내용', value: '현장 외부 관찰기록 등록 완료' },
        { label: '방문 살핌단', value: this.state.basicInfo.inspectors.join(', ') }
      ],
      confirmText: '저장 확인 및 서식 다운로드',
      onConfirm: () => {
        notifier.toast('미대면 관찰기록 저장이 완료되었습니다.', 'success');
        this.renderStep(7);
        this.switchTab(7);
      }
    });
  }

  getSurveyPayload() {
    const result = ScoringEngine.calculate(this.state.answers, this.state.immediateNeeds);
    return {
      basicInfo: this.state.basicInfo,
      profile: this.state.targetProfile,
      observation: this.state.observation,
      answers: this.state.answers,
      immediateNeeds: this.state.immediateNeeds,
      consent: this.state.consent,
      beneficiaryCard: this.state.beneficiaryCard,
      result,
      submittedAt: new Date().toISOString()
    };
  }

  async handleSubmit() {
    // 1. 10대 문항 전체 답변 검증
    const progressVal = ValidationService.validateSurveyProgress(this.state.answers, 10);
    if (!progressVal.isComplete) {
      notifier.alert({
        title: '10대 문항 답변 미완료',
        message: progressVal.message,
        confirmText: '문항 확인하러 가기',
        onConfirm: () => this.switchTab(4)
      });
      return;
    }

    // 2. 동의서 및 서명 검증
    const isProxy = this.state.targetProfile.guardian && this.state.targetProfile.guardian.isProxySigner === true;
    const consentVal = ValidationService.validateConsentAndSignatures(this.state.consent, this.state.basicInfo.inspectors, isProxy);
    if (!consentVal.isValid) {
      notifier.alert({
        title: '동의 및 전자서명 확인 필요',
        message: consentVal.message,
        confirmText: '확인',
        onConfirm: () => this.switchTab(5)
      });
      return;
    }

    // 3. 수혜자 관리카드 작성 검증
    const cardVal = ValidationService.validateStep6BeneficiaryCard(this.state.beneficiaryCard);
    if (!cardVal.isValid) {
      notifier.alert({
        title: '수혜자 관리카드 확인 필요',
        message: cardVal.message,
        confirmText: '확인',
        onConfirm: () => this.switchTab(6)
      });
      return;
    }

    notifier.toast('현장 조사 및 서명 데이터를 전송 중입니다...', 'info', 1500);

    const result = ScoringEngine.calculate(this.state.answers, this.state.immediateNeeds);
    const payload = this.getSurveyPayload();

    const submitRes = await SurveyApi.submitSurvey(payload);

    if (submitRes.isOfflineSaved) {
      notifier.alert({
        title: '오프라인 안심 임시 저장 완료',
        message: '현재 네트워크 통신이 원활하지 않아 기기 내 보안 저장소에 임시 보관되었습니다.\n\n인터넷이 연결되면 별도 조작 없이 자동으로 서버로 전송되며, 전송 즉시 기기 내 임시 데이터는 영구 파기됩니다.',
        details: [
          { label: '조사 관리번호', value: this.state.basicInfo.maskedSurveyUid },
          { label: '대상자 성명', value: this.state.targetProfile.name },
          { label: '위험도 총점', value: `${result.totalScore}점 / 13점` },
          { label: '위기 판정', value: result.grade.label },
          { label: '전자 서명', value: isProxy ? `보호자(${this.state.targetProfile.guardian.name}) 대리 서명` : `대상자 본인 서명` },
          { label: '보관 상태', value: '기기 내 보안 큐 대기 (인터넷 연결 시 자동 전송)' }
        ],
        confirmText: '저장 확인 및 서식 다운로드',
        onConfirm: () => {
          notifier.toast('오프라인 조사가 안전하게 보관되었습니다.', 'info');
          this.renderStep(7);
          this.switchTab(7);
        }
      });
    } else {
      notifier.alert({
        title: '전송 및 저장 완료',
        message: '고독사예방게이트키퍼 안부살핌 조사 및 전자서명이 안전하게 저장되었습니다.',
        details: [
          { label: '조사 관리번호', value: this.state.basicInfo.maskedSurveyUid },
          { label: '대상자 성명', value: this.state.targetProfile.name },
          { label: '위험도 총점', value: `${result.totalScore}점 / 13점` },
          { label: '위기 판정', value: result.grade.label },
          { label: '연계 매칭 사업단', value: result.activeBuList.length > 0 ? result.activeBuList.join(', ') : '해당 없음' },
          { label: '위기 지표 분류', value: result.mohwTags.map(m => m.name).join(', ') || '일반' },
          { label: '전자 서명', value: isProxy ? `보호자 대리 1건 + 활동가 ${this.state.basicInfo.inspectors.length}건 완료` : `대상자 1건 + 활동가 ${this.state.basicInfo.inspectors.length}건 완료` }
        ],
        confirmText: '저장 확인 및 서식 다운로드',
        onConfirm: () => {
          notifier.toast('현장 조사가 완료되었습니다.', 'success');
          this.renderStep(7);
          this.switchTab(7);
        }
      });
    }
  }

  initHistoryAndBackButtonProtection() {
    try {
      window.history.pushState({ tab: this.state.currentTab }, '', window.location.href);

      // 1. 키보드 백스페이스(Backspace) 오동작 이탈 차단
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' || e.keyCode === 8) {
          const t = e.target;
          const isInput = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
          if (!isInput) {
            e.preventDefault();
            return false;
          }
        }
      });

      // 2. 브라우저 탭 닫기/새로고침 시 데이터 유실 경고 (Step 2~6 작성 중에만 한정, 앱간 이동 및 Step 7 완료 후 복귀 시 제외)
      window.addEventListener('beforeunload', (e) => {
        if (this.isAppToAppNavigating) return;
        if (this.state.currentTab > 1 && this.state.currentTab < 7) {
          e.preventDefault();
          e.returnValue = '작성 중인 현장 조사 데이터가 있습니다. 정말 나가시겠습니까?';
          return e.returnValue;
        }
      });

      // 3. 스마트폰 물리/제스처 뒤로가기 가드
      window.addEventListener('popstate', () => {
        try {
          window.history.pushState({ tab: this.state.currentTab }, '', window.location.href);
        } catch (err) {}

        // 다음 우편번호 레이어 열려있으면 먼저 닫기
        const postcodeLayer = document.getElementById('postcodeLayer');
        if (postcodeLayer && postcodeLayer.style.display === 'block') {
          postcodeLayer.style.display = 'none';
          return;
        }

        // 인앱 모달/알림창 열려있으면 먼저 닫기
        const modalBox = document.getElementById('wrkModalContainer');
        if (modalBox && modalBox.classList.contains('active')) {
          modalBox.classList.remove('active');
          setTimeout(() => {
            modalBox.style.display = 'none';
            modalBox.innerHTML = '';
          }, 200);
          return;
        }

        // 2~7단계 조사 진행 중 뒤로가기 가드
        if (this.state.currentTab > 1) {
          notifier.confirm({
            title: '안내',
            message: '작성 중인 현장 조사 데이터가 있습니다.\n이전 단계로 이동하시겠습니까?',
            confirmText: '이전 단계 이동',
            cancelText: '계속 작성',
            onConfirm: () => {
              this.switchTab(this.state.currentTab - 1);
            }
          });
        } else {
          // 1단계 시작 화면에서 뒤로가기 시 튕김 방지 및 토스트 안내
          notifier.toast('첫 번째 기본정보 단계입니다.', 'info', 2000);
        }
      });
    } catch (err) {
      console.error('BackButton protection init error:', err);
    }
  }
}
