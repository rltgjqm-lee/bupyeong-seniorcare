/**
 * @file bupyeongPwaView.js
 * @description 부평구 통합돌봄 PWA 현장조사 메인 컨트롤러 (코디네이터) (ESM)
 * - 게이트키퍼 디자인 및 7단계 프로그레시브 뷰 표준 준수
 * - 모니터링 기록 트랙 vs 이용자 만족도 조사 트랙 동적 분기 완비
 */

import { UidEngine, BUPYEONG_DEFAULT_ORG_UID } from '../core/uid.js';
import { maskUid } from '../core/mask.js';
import { notifier } from '../utils/notifier.js';
import { getLocalTodayString } from '../utils/date.js';

import { Step1BasicView } from './steps/step1BasicView.js';
import { Step2TargetView } from './steps/step2TargetView.js';
import { Step3BasicSurveyView } from './steps/step3BasicSurveyView.js';
import { Step3ActivityCardView } from './steps/step3ActivityCardView.js';
import { Step4MonitoringView } from './steps/step4MonitoringView.js';
import { Step5SatisfactionView } from './steps/step5SatisfactionView.js';
import { Step6ConsentView } from './steps/step6ConsentView.js';
import { Step7CompleteView } from './steps/step7CompleteView.js';

const STORAGE_KEY_BASIC = 'bupyeong_last_basic_info';

export class BupyeongPwaView {
  constructor() {
    const today = getLocalTodayString();
    const lastBasic = this.loadLastBasicInfo();

    this.flowMode = 'MONITORING'; // 'MONITORING' | 'SATISFACTION'

    this.state = {
      currentTab: 1, // 1: 참여자, 2: 대상자, 3: 기초조사, 4: (활동/만족), 5: (상담/개선), 6: 동의서명, 7: 저장출력

      // Step 1: 순수 참여자 및 기관 정보 (캐싱 유지)
      basicInfo: {
        orgName: lastBasic.orgName || '인천광역시 부평구 통합돌봄센터',
        orgCode: lastBasic.orgCode || BUPYEONG_DEFAULT_ORG_UID,
        project: lastBasic.project || '부평형 노인일자리 안심살핌사업단',
        inspectors: Array.isArray(lastBasic.inspectors) && lastBasic.inspectors.length > 0 ? [...lastBasic.inspectors] : ['김철수', '이영희'],
        inspectionDate: (lastBasic.inspectionDate && lastBasic.inspectionDate <= today) ? lastBasic.inspectionDate : today,
        rawSurveyUid: '',
        maskedSurveyUid: '',
        caseUid: ''
      },

      // Step 2 & Step 3: 대상자 기본정보 및 공통 기초조사
      targetProfile: {
        caseUid: '',
        isFieldFound: false, // 현장 발굴 여부
        targetName: '',
        birth: '',
        gender: '', // 남 | 여
        phone: '',
        dong: '', // 행정동 (카카오 주소 검색 시 자동 추출)
        baseAddress: '',
        detailAddress: '',
        // 기초조사 공통 항목
        householdType: '독거', // 독거, 비독거
        householdSub: '부부', // 부부, 노부모, 성인자녀, 조손, 기타
        householdOther: '',
        socialSecurity: '', // 국민기초생활보장제도, 차상위, 일반가구 (현장 조사 시 선택)
        benefitStatus: '', // 맞춤형급여, 차상위, 장애인연금, 기초연금, 기타, 없음
        targetAttribute: '', // 장기요양재가급여, 노인맞춤돌봄서비스, 장애인활동보조 수급자, 해당없음, 기타
        housingEnvironment: '청결', // 청결, 보통, 불량 (모니터링 전용)
        housingEnvReason: ''
      },

      // Step 4 (모니터링 트랙): 활동관리카드 (차수별 방문일지 누적)
      activityCard: {
        records: [],
        currentEntry: {
          round: 1,
          date: today,
          time: '',
          isConsulted: true, // true: 상담 실시, false: 상담 불가
          unmetReason: '',
          content: ''
        }
      },

      // Step 5 (모니터링 트랙): 정밀 모니터링 기록지 (상태평가)
      monitoring: {
        housingEnv: '청결',
        housingEnvReason: '',
        healthState: '',
        primaryCaregiver: '',
        dailyLivingGrade: '',
        neededService: '',
        consultResult: '희망 서비스 없음',
        consultOpinion: ''
      },

      // Step 4~5 (만족도 트랙): 이용자 만족도 조사 (5점 척도 & 11대 피드백)
      satisfaction: {
        respondentType: '',
        respondentDetail: '',
        route: '',
        routeDetail: '',
        scores: {
          accessibility: null,
          timeliness: null,
          suitability: null,
          effectiveness: null,
          quality: null,
          overall: null,
          continuation: null
        },
        bestField: '',
        bestFieldDetail: '',
        neededServices: [],
        complaints: [],
        complaintDetail: '',
        bestPoint: '',
        improvementPoint: '',
        reliability: '',
        communication: '',
        nextLink: '',
        specialNote: '',
        complaintReasons: {}
      },

      // Step 6: 공통 동의 & 전자서명
      consent: {
        agreeCollect: false,
        agreeThirdParty: false,
        targetSignature: null
      }
    };

    // 뷰 컴포넌트 인스턴스화
    this.viewBasic = new Step1BasicView(this);
    this.viewTarget = new Step2TargetView(this);
    this.viewSurvey = new Step3BasicSurveyView(this);
    this.viewActivity = new Step3ActivityCardView(this);
    this.viewMonitoring = new Step4MonitoringView(this);
    this.viewSatisfaction = new Step5SatisfactionView(this);
    this.viewConsent = new Step6ConsentView(this);
    this.viewComplete = new Step7CompleteView(this);
  }

  loadLastBasicInfo() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_BASIC);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  saveLastBasicInfo() {
    try {
      localStorage.setItem(STORAGE_KEY_BASIC, JSON.stringify(this.state.basicInfo));
    } catch (e) {
      console.warn('참여자 기본정보 캐싱 실패', e);
    }
  }

  updateSurveyUid() {
    const s = this.state;
    if (!s.targetProfile.caseUid) {
      s.basicInfo.rawSurveyUid = '';
      s.basicInfo.maskedSurveyUid = 'S-28-237-01-***-****';
      return;
    }
    const raw = UidEngine.generateSatisfactionSurveyUid(s.targetProfile.caseUid, s.basicInfo.inspectionDate);
    s.basicInfo.rawSurveyUid = raw;
    s.basicInfo.maskedSurveyUid = maskUid(raw);
  }

  startMonitoringFlow() {
    this.flowMode = 'MONITORING';
    this.updateTabLabels();
    notifier.toast('모니터링 기록 작성 트랙으로 진입합니다.', 'info', 2000);
    this.switchTab(4);
  }

  startSatisfactionFlow() {
    this.flowMode = 'SATISFACTION';
    this.updateTabLabels();
    notifier.toast('이용자 만족도 조사 트랙으로 진입합니다.', 'info', 2000);
    this.switchTab(4);
  }

  updateTabLabels() {
    const lbl4 = document.getElementById('tabLabel4');
    const lbl5 = document.getElementById('tabLabel5');

    if (this.flowMode === 'MONITORING') {
      if (lbl4) lbl4.textContent = '활동카드';
      if (lbl5) lbl5.textContent = '모니터링';
    } else {
      if (lbl4) lbl4.textContent = '만족도';
      if (lbl5) lbl5.textContent = '개선의견';
    }
  }

  switchTab(tabNumber) {
    if (tabNumber < 1 || tabNumber > 7) return;

    this.state.currentTab = tabNumber;

    // 탭 헤더 스타일 갱신
    const tabBtns = document.querySelectorAll('.pwa-tab-item');
    tabBtns.forEach(btn => {
      const num = parseInt(btn.dataset.tab, 10);
      btn.classList.remove('active', 'completed', 'upcoming');
      if (num === tabNumber) {
        btn.classList.add('active');
      } else if (num < tabNumber) {
        btn.classList.add('completed');
      } else {
        btn.classList.add('upcoming');
      }
    });

    // 뷰 섹션 표시/숨김
    for (let i = 1; i <= 7; i++) {
      const sec = document.getElementById(`pwaSecStep${i}`);
      if (sec) {
        sec.classList.toggle('active', i === tabNumber);
      }
    }

    // 단계별 뷰 렌더링 호출
    this.renderCurrentStep(tabNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderCurrentStep(tabNumber) {
    switch (tabNumber) {
      case 1:
        this.viewBasic.render();
        break;
      case 2:
        this.viewTarget.render();
        break;
      case 3:
        this.viewSurvey.render();
        break;
      case 4:
        if (this.flowMode === 'MONITORING') {
          this.viewActivity.render('step4Container');
        } else {
          this.viewSatisfaction.render('step4Container');
        }
        break;
      case 5:
        if (this.flowMode === 'MONITORING') {
          this.viewMonitoring.render('step5Container');
        } else {
          this.viewSatisfaction.render('step4Container');
        }
        break;
      case 6:
        this.viewConsent.render();
        break;
      case 7:
        this.viewComplete.render();
        break;
    }
  }

  init() {
    this.updateSurveyUid();
    this.updateTabLabels();

    // 탭 클릭 이벤트 바인딩
    const tabNav = document.getElementById('pwaStepTabs');
    if (tabNav) {
      tabNav.addEventListener('click', (e) => {
        const btn = e.target.closest('.pwa-tab-item');
        if (btn) {
          const tabNum = parseInt(btn.dataset.tab, 10);
          this.switchTab(tabNum);
        }
      });
    }

    // 1단계 첫 렌더링
    this.switchTab(1);
  }
}
