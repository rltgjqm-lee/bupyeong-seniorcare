/**
 * @file activityApp.js
 * @description 현장 참여자 PWA 메인 오케스트레이터 (4단계 프로그레시브 탭 라이프사이클 및 상단 헤더 동기화) (ESM)
 */

import { Step1RegistrationView } from './step1RegistrationView.js';
import { Step2TargetScheduleView } from './step2TargetScheduleView.js';
import { Step3WorkDutyView } from './step3WorkDutyView.js';
import { Step4ReportConfirmView } from './step4ReportConfirmView.js';
import { Step5CheckoutView } from './step5CheckoutView.js';

export class ActivityApp {
  constructor() {
    this.currentStep = 1;
    this.session = {
      orgUid: 'O-28-237-01',
      orgName: '부평노인인력개발센터',
      buCode: 'ME',
      buName: '영양도시락/밑반찬 배달 사업단',
      participantUid: 'U-28-237-01-ME-001',
      participants: ['김철수', '이영희'],
      dutyDate: new Date().toISOString().slice(0, 10),
      startTime: '',
      startGps: null,
      isCheckedIn: false
    };

    this.currentTarget = null;
    this.currentDutyResult = null;
    this.todayReports = []; // 당일 완료한 어르신 활동 실적 누적

    this.views = {
      step1: new Step1RegistrationView(this),
      step2: new Step2TargetScheduleView(this),
      step3: new Step3WorkDutyView(this),
      step4: new Step4ReportConfirmView(this),
      step5: new Step5CheckoutView(this)
    };
  }

  async init() {
    this.bindGlobalNavigation();
    this.updateHeaderStatus();
    await this.goToStep(1);
  }

  bindGlobalNavigation() {
    const navButtons = document.querySelectorAll('.pwa-tab-item');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetStep = parseInt(btn.dataset.step, 10);
        if (targetStep === 1 || this.session.isCheckedIn) {
          this.goToStep(targetStep);
        } else {
          alert('1단계에서 [업무 시작]을 먼저 진행해 주세요.');
        }
      });
    });
  }

  async goToStep(stepNumber) {
    this.currentStep = stepNumber;

    // 표준 프로그레시브 탭 상태 갱신 (completed / active / upcoming)
    document.querySelectorAll('.pwa-tab-item').forEach(btn => {
      const step = parseInt(btn.dataset.step, 10);
      btn.classList.remove('active', 'completed', 'upcoming');
      if (step < stepNumber) {
        btn.classList.add('completed');
      } else if (step === stepNumber) {
        btn.classList.add('active');
      } else {
        btn.classList.add('upcoming');
      }
    });

    const mainContainer = document.getElementById('stepViewContainer');
    if (!mainContainer) return;

    if (stepNumber === 1) {
      await this.views.step1.render(mainContainer);
    } else if (stepNumber === 2) {
      await this.views.step2.render(mainContainer);
    } else if (stepNumber === 3) {
      await this.views.step3.render(mainContainer);
    } else if (stepNumber === 4) {
      await this.views.step4.render(mainContainer);
    } else if (stepNumber === 5) {
      await this.views.step5.render(mainContainer);
    }

    this.updateHeaderStatus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateHeaderStatus() {
    const statusEl = document.getElementById('headerActiveStatus');
    if (!statusEl) return;

    if (this.session.isCheckedIn) {
      statusEl.innerHTML = `
        <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #16a34a;"></span>
        <span style="color: #0f172a; font-weight: 700;">[${this.session.buCode}]</span>
        <span style="color: #334155;">${(this.session.participants || []).join('·')}</span>
        <span style="color: #64748b; font-size: 11px;">(${this.session.startTime} 시작)</span>
      `;
    } else {
      statusEl.innerHTML = `
        <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #f59e0b;"></span>
        <span style="color: #64748b;">출근 전</span>
      `;
    }
  }

  resetSession() {
    this.session.isCheckedIn = false;
    this.session.startTime = '';
    this.session.startGps = null;
    this.currentTarget = null;
    this.currentDutyResult = null;
    this.updateHeaderStatus();
  }
}

// DOM 준비 시 자동 인스턴스화
document.addEventListener('DOMContentLoaded', () => {
  window.__ACTIVITY_APP__ = new ActivityApp();
  window.__ACTIVITY_APP__.init();
});
