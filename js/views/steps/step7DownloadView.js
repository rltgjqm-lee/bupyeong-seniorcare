/**
 * @file step7DownloadView.js
 * @description PWA 현장 조사 Step 7: 안전 저장 완료 확인 및 공식 서식 5종 다운로드 허브 (ESM)
 */

import { PdfExportService } from '../../services/pdfExportService.js';
import { ExcelExportService } from '../../services/excelExportService.js';
import { notifier } from '../../utils/notifier.js';
import { maskUid } from '../../utils/mask.js';

export class Step7DownloadView {
  constructor(mediator) {
    this.mediator = mediator;
  }

  render() {
    const container = document.getElementById('step7Container');
    if (!container) return;

    const b = this.mediator.state.basicInfo;
    const p = this.mediator.state.targetProfile || {};
    const obs = this.mediator.state.observation || {};
    const maskedCaseUid = maskUid(b.caseUid);
    const isUnmet = obs.visitResult === 'unmet';
    const unmetReason = obs.unmetReason || '부재/거부';
    const isRevisit = this.mediator.state.isRevisit === true;
    const revisitRound = this.mediator.state.revisitRound || 2;

    // 1~3번 서식 비활성화 조건 (n차 정기 안부살핌 시 1~3번 비활성화)
    const isForm1Disabled = isRevisit;
    const isForm2Disabled = isUnmet || isRevisit;
    const isForm3Disabled = isUnmet || isRevisit;
    const isForm4Disabled = isUnmet; // n차는 수혜자 관리카드 활성화

    let bannerTitle = '안부살핌 조사 저장 완료 및 서식 다운로드';
    let bannerHtml = '안부살핌 조사가 정상 저장되었습니다. 아래에서 필요한 서식을 다운로드하세요.';

    if (isRevisit) {
      bannerTitle = `[${revisitRound}차 정기 안부살핌] 저장 완료 및 서식 출력`;
      bannerHtml = `<strong>[${revisitRound}차 정기 안부살핌]</strong> 기록이 안전하게 저장되었습니다. 아래에서 <strong>4. 수혜자 관리카드</strong> 또는 <strong>5. 전체 엑셀 대장</strong>을 다운로드하세요.`;
    } else if (isUnmet) {
      bannerTitle = '미대면 관찰기록 저장 완료 및 서식 출력';
      bannerHtml = `<strong>[미대면(${unmetReason})]</strong> 현장 외부 관찰기록이 정상 저장되었습니다. 현장 확인용 <strong>1. 가정방문 기록지</strong> 또는 <strong>5. 전체 엑셀 대장</strong>을 다운로드하세요.`;
    }

    container.innerHTML = `
      <div class="pwa-card" style="border-top: 3px solid ${isUnmet ? '#d97706' : (isRevisit ? '#0284c7' : '#0f172a')};">
        <div class="card-header-bar step7-header-bar">
          <span class="card-main-title step7-main-title">${bannerTitle}</span>
          <span class="uid-badge step7-header-uid">관리번호: ${b.caseUid}</span>
        </div>

        <!-- 1. 저장 완료 안내 -->
        <div style="background: ${isUnmet ? '#fffbeb' : (isRevisit ? '#f0f9ff' : '#f1f5f9')}; border-left: 4px solid ${isUnmet ? '#d97706' : (isRevisit ? '#0284c7' : '#0f172a')}; padding: 12px 14px; margin-bottom: 10px; font-size: 12.5px; line-height: 1.5; color: #0f172a;">
          ${bannerHtml}
        </div>

        <!-- 대상 가구 확인 명찰 -->
        <div class="step7-target-badge-bar">
          <div style="flex: 1; min-width: 0;">
            <span style="color: #64748b; font-size: 11.5px;">조사 대상자:</span>
            <strong style="color: #0f172a; margin-left: 4px; font-size: 13.5px;">${p.name || '미입력'}</strong>
            <span style="color: #64748b; font-size: 12px; margin-left: 3px;">(${p.gender === '남' ? '남' : (p.gender === '여' ? '여' : '-')}, ${p.birth || '-'})</span>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px;">
          
          <!-- 서식 1: 가정방문 기록지 (내·외부환경) -->
          <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; background: ${isForm1Disabled ? '#f8fafc' : '#ffffff'}; opacity: ${isForm1Disabled ? '0.6' : '1'};">
            <div style="margin-bottom: 8px;">
              <div class="step7-card-title-row">
                <span class="step7-card-title-text">1. 가정방문 기록지 (내·외부환경)</span>
                ${isUnmet ? '<span class="step7-card-badge" style="background: #dbeafe; color: #1e40af;">미대면 사유 수록</span>' : ''}
                ${isRevisit ? '<span class="step7-card-badge" style="background: #f1f5f9; color: #64748b;">n차 정기안부 미해당</span>' : ''}
              </div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px; line-height: 1.45;">
                ${isRevisit ? '1차 초기 발굴 전용 서식입니다. (n차 안부는 4번 수혜자 관리카드에 누적 관리)' : `집 밖 외부 관찰사항 6종, ${isUnmet ? '미대면 상세 사유' : '실내 환경 관찰 4종'}, 이웃 탐문 및 현장 소견, 살핌단 서명`}
              </div>
            </div>
            <button type="button" class="btn-primary-action" id="btnDownloadObservationPdf" style="width: 100%; font-size: 12.5px; padding: 10px; background: ${isForm1Disabled ? '#64748b' : '#0f172a'}; cursor: ${isForm1Disabled ? 'not-allowed' : 'pointer'};">
              ${isRevisit ? '가정방문 기록지 (n차 미해당)' : '가정방문 기록지 (내·외부환경)'}
            </button>
          </div>

          <!-- 서식 2: 고독사 위험도 현장조사표 -->
          <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; background: ${isForm2Disabled ? '#f8fafc' : '#ffffff'}; opacity: ${isForm2Disabled ? '0.6' : '1'};">
            <div style="margin-bottom: 8px;">
              <div class="step7-card-title-row">
                <span class="step7-card-title-text">2. 고독사 위험도 현장조사표</span>
                ${isUnmet ? '<span class="step7-card-badge" style="background: #f1f5f9; color: #64748b;">미대면 미실시</span>' : ''}
                ${isRevisit ? '<span class="step7-card-badge" style="background: #f1f5f9; color: #64748b;">n차 정기안부 미해당</span>' : ''}
              </div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px; line-height: 1.45;">
                ${isRevisit ? '1차 초기 발굴 전용 10대 문항 서식입니다. (상태 급변 시 재관찰 전환으로 재진단 가능)' : (isUnmet ? '대상자 부재/거부로 인해 10대 문항 조사가 실시되지 않았습니다.' : '10대 문항 전체 질문과 답변, 현장 메모 원문, 총점 및 위험군 판정, 살핌단 서명')}
              </div>
            </div>
            <button type="button" class="btn-primary-action" id="btnDownloadSurveyPdf" style="width: 100%; font-size: 12.5px; padding: 10px; background: ${isForm2Disabled ? '#64748b' : '#0f172a'}; cursor: ${isForm2Disabled ? 'not-allowed' : 'pointer'};">
              ${isRevisit ? '고독사 위험도 현장조사표 (n차 미해당)' : (isUnmet ? '고독사 위험도 현장조사표 (미대면)' : '고독사 위험도 현장조사표')}
            </button>
          </div>

          <!-- 서식 3: 개인정보 수집·이용 및 제공 동의서 -->
          <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; background: ${isForm3Disabled ? '#f8fafc' : '#ffffff'}; opacity: ${isForm3Disabled ? '0.6' : '1'};">
            <div style="margin-bottom: 8px;">
              <div class="step7-card-title-row">
                <span class="step7-card-title-text">3. 개인정보 수집·이용 및 제공 동의서</span>
                ${isUnmet ? '<span class="step7-card-badge" style="background: #f1f5f9; color: #64748b;">미대면 미징구</span>' : ''}
                ${isRevisit ? '<span class="step7-card-badge" style="background: #dbeafe; color: #1e40af;">1차 등록 시 기수집</span>' : ''}
              </div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px; line-height: 1.45;">
                ${isRevisit ? '1차 초기 등록 시 이미 수집 완료된 동의서입니다.' : (isUnmet ? '대상자 부재/거부로 인해 본인/대리인 서명이 진행되지 않았습니다.' : '개인정보 수집·이용 및 제3자 제공 동의 전문, 본인/대리인 전자서명, 확인자 서명')}
              </div>
            </div>
            <button type="button" class="btn-primary-action" id="btnDownloadConsentPdf" style="width: 100%; font-size: 12.5px; padding: 10px; background: ${isForm3Disabled ? '#64748b' : '#0f172a'}; cursor: ${isForm3Disabled ? 'not-allowed' : 'pointer'};">
              ${isRevisit ? '개인정보 동의서 (1차 기수집 완료)' : (isUnmet ? '개인정보 동의서 (미대면)' : '개인정보 수집·이용 및 제공 동의서')}
            </button>
          </div>

          <!-- 서식 4: 수혜자 관리카드 -->
          <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; background: ${isForm4Disabled ? '#f8fafc' : '#ffffff'}; opacity: ${isForm4Disabled ? '0.6' : '1'};">
            <div style="margin-bottom: 8px;">
              <div class="step7-card-title-row">
                <span class="step7-card-title-text">4. 수혜자 관리카드</span>
                ${isUnmet ? '<span class="step7-card-badge" style="background: #f1f5f9; color: #64748b;">미대면 미작성</span>' : ''}
                ${isRevisit ? `<span class="step7-card-badge" style="background: #e0f2fe; color: #0369a1; font-weight: 700;">${revisitRound}차 안부기록 반영</span>` : ''}
              </div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px; line-height: 1.45;">
                ${isUnmet ? '대상자 부재/거부로 인해 당일 대면 지표가 체크되지 않았습니다.' : `대상자/보호자 인적사항, ${isRevisit ? `${revisitRound}차 ` : '당일 '}방문/전화 안부확인 5대 지표 및 세부 소견, 살핌단 확인`}
              </div>
            </div>
            <button type="button" class="btn-primary-action" id="btnDownloadBeneficiaryCardPdf" style="width: 100%; font-size: 12.5px; padding: 10px; background: ${isForm4Disabled ? '#64748b' : '#0f172a'}; cursor: ${isForm4Disabled ? 'not-allowed' : 'pointer'};">
              ${isUnmet ? '수혜자 관리카드 (미대면)' : `수혜자 관리카드${isRevisit ? ` (${revisitRound}차)` : ''}`}
            </button>
          </div>

          <!-- 서식 5: 전체 조사대장 (엑셀) -->
          <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; background: #ffffff;">
            <div style="margin-bottom: 8px;">
              <div class="step7-card-title-row">
                <span class="step7-card-title-text">5. 전체 조사대장 (엑셀)</span>
                ${isUnmet ? '<span class="step7-card-badge" style="background: #dbeafe; color: #1e40af;">미대면 대장 수록</span>' : ''}
                ${isRevisit ? `<span class="step7-card-badge" style="background: #e0f2fe; color: #0369a1; font-weight: 700;">${revisitRound}차 실적 수록</span>` : ''}
              </div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px; line-height: 1.45;">
                총괄대장(조사 회차 칼럼 포함) / 문항·관찰 세부기록 / 수혜자 관리카드 3-Sheet 무손실 일괄 집계 대장
              </div>
            </div>
            <button type="button" class="btn-primary-action" id="btnDownloadSurveyExcel" style="width: 100%; font-size: 12.5px; padding: 10px; background: #0f172a;">
              전체 조사대장 (엑셀)
            </button>
          </div>

        </div>

        <!-- 3. 새로운 안부살핌 시작하기 버튼 -->
        <div style="margin-top: 14px; margin-bottom: 24px; display: flex; gap: 8px;">
          <button type="button" class="btn-secondary-action" id="btnStartNextSurveyStep7" style="flex: 1; height: 38px; font-size: 12.5px; font-weight: 700; background: #f1f5f9; border-color: #cbd5e1; padding: 0 10px;">
            새 안부살핌 시작
          </button>
          ${(this.mediator.returnUrl || sessionStorage.getItem('WRK_RETURN_URL')) ? `
            <button type="button" class="btn-secondary-action" id="btnReturnToCareSafe" style="flex: 1; height: 38px; font-size: 12px; font-weight: 700; border: 1.5px solid #0f172a; color: #0f172a; background: #ffffff; padding: 0 10px; cursor: pointer; white-space: nowrap;">
              ‹ 안심살핌 복귀
            </button>
          ` : ''}
        </div>

      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const obs = this.mediator.state.observation || {};
    const isUnmet = obs.visitResult === 'unmet';
    const isRevisit = this.mediator.state.isRevisit === true;
    const revisitRound = this.mediator.state.revisitRound || 2;

    const btnReturn = document.getElementById('btnReturnToCareSafe');
    if (btnReturn) {
      btnReturn.addEventListener('click', () => {
        this.mediator.isAppToAppNavigating = true;
        const defaultReturnUrl = (typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname.includes('workers.dev') || window.location.hostname.includes('pages.dev')))
          ? 'https://senior-caresafe.pages.dev'
          : 'http://localhost:8989';
        const returnUrl = this.mediator.returnUrl || sessionStorage.getItem('WRK_RETURN_URL') || defaultReturnUrl;
        const b = this.mediator.state.basicInfo;
        const p = this.mediator.state.targetProfile || {};
        const returnPayload = {
          caseUid: b.caseUid,
          targetName: p.name,
          birth: p.birth,
          gender: p.gender,
          phone: p.phone,
          address: p.address,
          wrkCompleted: true
        };
        const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(returnPayload))));
        sessionStorage.removeItem('WRK_RETURN_URL');
        window.location.href = `${returnUrl}?action=import_wrk&payload=${encodeURIComponent(base64)}`;
      });
    }

    // 1. 가정방문 기록지 (내·외부환경) PDF 다운로드
    const btnObs = document.getElementById('btnDownloadObservationPdf');
    if (btnObs) {
      btnObs.addEventListener('click', async () => {
        if (isRevisit) {
          notifier.alert({
            title: '서식 안내',
            message: `${revisitRound}차 정기 안부살핌은 [4. 수혜자 관리카드]에 누적 관리됩니다.\n\n[1. 가정방문 기록지]는 1차 초기 발굴 전용 서식입니다.`,
            confirmText: '확인'
          });
          return;
        }
        const payload = this.mediator.getSurveyPayload();
        notifier.toast('가정방문 기록지 (내·외부환경)을 생성하여 다운로드합니다...', 'info', 2000);
        await PdfExportService.exportObservationLogToPdf(payload);
      });
    }

    // 2. 고독사 위험도 현장조사표 PDF 다운로드
    const btnSurvey = document.getElementById('btnDownloadSurveyPdf');
    if (btnSurvey) {
      btnSurvey.addEventListener('click', async () => {
        if (isRevisit) {
          notifier.alert({
            title: '서식 안내',
            message: `${revisitRound}차 정기 안부살핌은 [4. 수혜자 관리카드]에 누적 관리됩니다.\n\n[2. 고독사 위험도 현장조사표]는 1차 초기 발굴 전용 서식입니다.`,
            confirmText: '확인'
          });
          return;
        }
        if (isUnmet) {
          notifier.alert({
            title: '미대면 서식 안내',
            message: '대상자 부재/거부로 인해 10대 문항 현장조사가 실시되지 않았습니다.\n\n현장 외부 관찰 확인본은 [1. 가정방문 기록지]에서 다운로드하실 수 있습니다.',
            confirmText: '확인'
          });
          return;
        }
        const payload = this.mediator.getSurveyPayload();
        notifier.toast('고독사 위험도 현장조사표를 생성하여 다운로드합니다...', 'info', 2000);
        await PdfExportService.exportSurveyToPdf(payload);
      });
    }

    // 3. 개인정보 수집·이용 및 제공 동의서 PDF 다운로드
    const btnConsent = document.getElementById('btnDownloadConsentPdf');
    if (btnConsent) {
      btnConsent.addEventListener('click', async () => {
        if (isRevisit) {
          notifier.alert({
            title: '동의서 안내',
            message: `개인정보 수집·이용 동의서는 1차 초기 발굴 시 이미 수집 완료된 서식입니다.`,
            confirmText: '확인'
          });
          return;
        }
        if (isUnmet) {
          notifier.alert({
            title: '미대면 서식 안내',
            message: '대상자 부재/거부로 인해 본인/대리인 서명이 진행되지 않았습니다.',
            confirmText: '확인'
          });
          return;
        }
        const payload = this.mediator.getSurveyPayload();
        notifier.toast('개인정보 수집·이용 및 제공 동의서를 생성하여 다운로드합니다...', 'info', 2000);
        await PdfExportService.exportConsentToPdf(payload);
      });
    }

    // 4. 수혜자 관리카드 PDF 다운로드
    const btnCard = document.getElementById('btnDownloadBeneficiaryCardPdf');
    if (btnCard) {
      btnCard.addEventListener('click', async () => {
        if (isUnmet) {
          notifier.alert({
            title: '미대면 서식 안내',
            message: '대상자 부재/거부로 인해 당일 대면 관리카드가 작성되지 않았습니다.\n\n현장 확인본은 [1. 가정방문 기록지]에서 다운로드하실 수 있습니다.',
            confirmText: '확인'
          });
          return;
        }
        const payload = this.mediator.getSurveyPayload();
        notifier.toast(`수혜자 관리카드 (${isRevisit ? `${revisitRound}차 ` : ''}PDF)를 생성하여 다운로드합니다...`, 'info', 2000);
        await PdfExportService.exportBeneficiaryCardToPdf(payload);
      });
    }

    // 5. 엑셀 대장 다운로드
    const btnExcel = document.getElementById('btnDownloadSurveyExcel');
    if (btnExcel) {
      btnExcel.addEventListener('click', async () => {
        const payload = this.mediator.getSurveyPayload();
        notifier.toast('전체 조사대장을 생성하여 다운로드합니다...', 'info', 2000);
        await ExcelExportService.exportSurveyToExcel(payload);
      });
    }

    // 새로운 가구 안부살핌 시작하기
    const btnNext = document.getElementById('btnStartNextSurveyStep7');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        notifier.confirm({
          title: '새로운 안부살핌 시작',
          message: '현재 가구의 조사가 안전하게 저장되었습니다.\n새로운 가구의 안부살핌을 시작하시겠습니까?',
          confirmText: '새 조사 시작',
          cancelText: '취소',
          onConfirm: () => {
            this.mediator.state.isRevisit = false;
            this.mediator.state.revisitRound = 1;
            this.mediator.startManualNewSurvey();
            this.mediator.switchTab(1);
          }
        });
      });
    }
  }
}
