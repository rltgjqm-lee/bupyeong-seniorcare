/**
 * @file step5CheckoutView.js
 * @description 5단계 활동 마감 및 퇴근 업무 처리 뷰 (참여자 전자서명 패드 연동, 정규 A4 공문서 PDF 출력, D1 3시간 근태 최종 마감) (ESM)
 */

import { ActivityService } from './activityService.js';
import { maskName, maskAddress } from '../utils/mask.js';
import { signaturePad } from '../utils/signaturePad.js';
import { notifier } from '../utils/notifier.js';

export class Step5CheckoutView {
  constructor(app) {
    this.app = app;
    this.signatures = {}; // 참여자 성명별 서명 dataUrl
  }

  async render(container) {
    if (!container) return;

    const session = this.app.session;
    const buName = session.buName || '영양도시락/밑반찬 배달 사업단';
    const participants = session.participants && session.participants.length ? session.participants : ['김철수', '이영희'];
    const participantsStr = participants.join(' · ');

    // 로컬 실적 배열이 비어있을 경우 D1 원장에서 당일 완료 데이터 자동 복원 동기화
    if (!this.app.todayReports || this.app.todayReports.length === 0) {
      try {
        const buCode = session.buCode || 'ME';
        const res = await ActivityService.getBusinessUnitsActivities(buCode);
        const activities = (res && res.activities) || [];
        const todayStr = session.dutyDate || new Date().toISOString().slice(0, 10);
        const todayMatched = activities.filter(a => a.date === todayStr && a.status === '완료');
        if (todayMatched.length > 0) {
          this.app.todayReports = todayMatched.map(a => {
            let details = {};
            try {
              details = typeof a.dutyDetailsJson === 'string' ? JSON.parse(a.dutyDetailsJson) : (a.dutyDetailsJson || {});
            } catch (e) {}
            return {
              targetUid: a.targetUid,
              targetName: a.targetName,
              contactStatus: a.contactStatus || '대면 접촉',
              verdict: details.verdict || '정상 완료',
              isUrgent: a.isUrgent === 1,
              specialNotes: a.specialNotes || '',
              dutyDetails: details
            };
          });
        }
      } catch (err) {
        console.warn('당일 실적 D1 동기화 안내:', err);
      }
    }

    const completedList = this.app.todayReports || [];

    const nowTimeStr = new Date().toTimeString().slice(0, 5);
    const dateParts = (session.dutyDate || new Date().toISOString().slice(0, 10)).split('-');
    const formattedDateKorean = `${dateParts[0]}년 ${parseInt(dateParts[1], 10)}월 ${parseInt(dateParts[2], 10)}일`;

    container.innerHTML = `
      <!-- 상단 당일 활동 세션 요약 바 (독립 라운드 카드) -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-top: 4px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 14px; font-weight: 700; color: #0f172a;">${buName}</span>
          <span class="badge badge-primary" style="font-size: 11px;">활동 마감</span>
        </div>
        <div style="margin-top: 4px; font-size: 12px; color: #64748b;">
          <span>참여자: <strong>${participantsStr}</strong></span>
          <span style="margin: 0 4px; color: #cbd5e1;">|</span>
          <span>일자: ${session.dutyDate}</span>
        </div>
      </div>

      <!-- 1. 당일 방문 어르신 활동 실적 요약 카드 -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #ffffff; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 13.5px; font-weight: 700; color: #0f172a;">1. 당일 현장 활동 실적 요약</span>
          <span style="font-size: 12px; font-weight: 700; color: #475569;">총 <strong style="color: #0f172a;">${completedList.length}</strong>명 완료</span>
        </div>

        <div id="todayCompletedListArea" style="display: flex; flex-direction: column; gap: 6px;">
          ${completedList.length === 0 ? `
            <div style="text-align: center; padding: 16px 0; color: #64748b; font-size: 12.5px;">
              당일 완료된 활동 보고가 없습니다.
            </div>
          ` : completedList.map((item, idx) => `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center; font-size: 12.5px;">
              <div>
                <strong style="color: #0f172a;">${idx + 1}. ${maskName(item.targetName)}</strong>
                <span style="color: #64748b; font-size: 11.5px; margin-left: 4px;">(${item.contactStatus})</span>
              </div>
              <span class="badge ${item.isUrgent ? 'badge-primary' : 'badge-secondary'}" style="font-size: 11px;">
                ${item.verdict || '정상 완료'}
              </span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 2. 현장 참여자 확인 및 전자 서명 (기존 PWA 표준 서명패드) -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #ffffff; margin-bottom: 8px;">
        <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
          2. 현장 참여자 확인 및 전자 서명
        </div>
        <p style="font-size: 12px; color: #64748b; margin: 0 0 10px 0;">
          금일 활동에 참여한 조사원 2인의 전자 서명을 등록해 주십시오. (서명 터치 시 입력)
        </p>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${participants.map((name, idx) => `
            <div class="sig-row-card" style="background: #f8fafc; margin-bottom: 0;">
              <div class="sig-row-info">
                <span class="sig-role-label">참여자 ${idx + 1}</span>
                <span class="sig-name-val">성명: <strong>${name}</strong></span>
              </div>
              <div class="sig-box-preview" data-participant-name="${name}" style="cursor: pointer;" title="클릭하여 전자 서명">
                ${this.signatures[name] ? `
                  <img src="${this.signatures[name]}" class="sig-preview-img" alt="${name} 서명" style="max-height: 36px; max-width: 90px; object-fit: contain;">
                ` : `
                  <span class="sig-placeholder-text" style="font-size: 11.5px; font-weight: 700; color: #2563eb;">[터치 서명]</span>
                `}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- 다른 PWA 표준 하단 보고 문구 -->
        <div style="text-align: center; margin-top: 14px; padding-top: 10px; border-top: 1px dashed #e2e8f0;">
          <div style="font-size: 12.5px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
            상기와 같이 ${buName} 현장 활동을 보고합니다.
          </div>
          <div style="font-size: 12px; color: #64748b; font-weight: 600;">
            ${formattedDateKorean}
          </div>
        </div>
      </div>

      <!-- 3. 업무 서식 출력 및 증빙 카드 -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #ffffff; margin-bottom: 8px;">
        <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">
          3. 업무 서식 출력 및 증빙
        </div>
        <p style="font-size: 12px; color: #64748b; margin: 0 0 10px 0;">
          참여자 서명이 포함된 정규 활동일지를 A4 PDF로 다운로드하거나 보관용 엑셀로 내보냅니다.
        </p>
        <div class="btn-action-row" style="margin-top: 0; display: flex; gap: 8px; flex-wrap: wrap;">
          <button type="button" id="btnExportAllPdf" class="btn-secondary" style="height: 42px; font-size: 13px; font-weight: 700; flex: 1; min-width: 135px;">
            활동 보고서 PDF 인쇄/저장
          </button>
          <button type="button" id="btnExportAllExcel" class="btn-secondary" style="height: 42px; font-size: 13px; font-weight: 700; flex: 1; min-width: 135px;">
            당일 내역 엑셀 다운로드
          </button>
          <button type="button" id="btnRequestScheduleAdd" class="btn-secondary" style="height: 42px; font-size: 13px; font-weight: 700; background: #eff6ff; border-color: #93c5fd; color: #1d4ed8; flex: 1; min-width: 110px;">
            일정 추가 요청
          </button>
        </div>
      </div>

      <!-- 4. 퇴근 업무 처리 (D1 3시간 근태 마감) 카드 -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; background: #f8fafc; margin-bottom: 12px;">
        <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
          4. 당일 활동 마감 및 퇴근 업무 처리
        </div>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px; font-size: 12.5px; color: #475569; line-height: 1.6;">
          <div>• 업무 시작(출근): <strong>${session.startTime || '09:00'}</strong></div>
          <div>• 업무 종료(퇴근): <strong id="lblCheckoutTime">${nowTimeStr}</strong></div>
        </div>

        <button type="button" id="btnFinalCheckout" class="btn-primary" style="width: 100%; height: 48px; font-size: 15px; font-weight: 800; background: #0f172a; border-color: #0f172a;">
          오늘 활동 마감 및 퇴근 (귀가)
        </button>
      </div>

      <!-- 하단 이전 버튼 -->
      <div style="margin-top: 8px;">
        <button type="button" class="btn-secondary" id="btnBackToBeneficiaryList" style="width: 100%; height: 42px; font-size: 13px; font-weight: 700;">
          ← 다른 어르신 추가 방문하기 (2단계)
        </button>
      </div>
    `;

    this.bindEvents(container);
  }

  bindEvents(container) {
    const session = this.app.session;
    const participants = session.participants && session.participants.length ? session.participants : ['김철수', '이영희'];

    // 서명 패드 모달 연동
    container.querySelectorAll('.sig-box-preview[data-participant-name]').forEach(box => {
      box.addEventListener('click', () => {
        const participantName = box.getAttribute('data-participant-name');
        signaturePad.open({
          title: '참여자 전자 서명',
          signerName: participantName,
          onSave: (dataUrl) => {
            this.signatures[participantName] = dataUrl;
            this.render(container);
          }
        });
      });
    });

    // 정규 A4 공문서 PDF 출력 이벤트 (html2pdf 연동)
    container.querySelector('#btnExportAllPdf')?.addEventListener('click', async () => {
      await this.generateAndDownloadReportPdf();
    });

    // 엑셀 다운로드 이벤트
    container.querySelector('#btnExportAllExcel')?.addEventListener('click', () => {
      this.generateAndDownloadExcel();
    });

    // 일정 추가 요청 이벤트 (참여기관 전달)
    container.querySelector('#btnRequestScheduleAdd')?.addEventListener('click', () => {
      notifier.confirm({
        title: '기관 일정 추가 요청',
        message: '금일 현장 활동 특이사항 또는 대상자 어르신의 요청에 따라\n참여기관 관리자에게 차기 추가 방문 일정 배정을 요청하시겠습니까?',
        confirmText: '일정 추가 요청',
        cancelText: '취소',
        onConfirm: () => {
          notifier.toast('참여기관 관리자에게 차기 방문 일정 추가 요청이 접수되었습니다.', 'success', 2500);
        }
      });
    });

    // 추가 방문 버튼 클릭 시 ➔ 2단계 이동
    container.querySelector('#btnBackToBeneficiaryList')?.addEventListener('click', () => {
      this.app.currentTarget = null;
      this.app.currentDutyResult = null;
      this.app.goToStep(2);
    });

    // 최종 퇴근 마감 버튼
    const btnCheckout = container.querySelector('#btnFinalCheckout');
    btnCheckout?.addEventListener('click', async () => {
      if (!confirm('오늘의 모든 현장 활동을 마감하고 퇴근(귀가) 처리하시겠습니까?')) {
        return;
      }

      btnCheckout.disabled = true;
      btnCheckout.innerText = '퇴근 마감 처리 중...';

      try {
        const payload = {
          orgUid: session.orgUid || 'O-28-237-01',
          participantUid: session.participantUid || 'U-28-237-01-ME-001',
          buCode: session.buCode || 'ME',
          dutyDate: session.dutyDate,
          endTime: new Date().toTimeString().slice(0, 5),
          endGpsLat: session.gpsLat || null,
          endGpsLng: session.gpsLng || null
        };

        await ActivityService.checkOut(payload);
        notifier.alert({
          title: '활동 마감 완료',
          message: '오늘의 현장 활동이 안전하게 완료되었습니다!\n활동 내역이 성공적으로 기록되었습니다. 수고하셨습니다.',
          type: 'success',
          confirmText: '확인',
          onConfirm: () => window.location.reload()
        });
      } catch (err) {
        notifier.toast('퇴근 마감 처리 실패: ' + err.message, 'error', 3000);
        btnCheckout.disabled = false;
        btnCheckout.innerText = '오늘 활동 마감 및 퇴근 (귀가)';
      }
    });
  }

  /**
   * 참여자 서명이 날인된 정규 A4 공문서 활동일지 PDF 생성 및 다운로드 (전사 표준 A4 엔진 계승)
   */
  async generateAndDownloadReportPdf() {
    const session = this.app.session;
    const buName = session.buName || '영양도시락/밑반찬 배달 사업단';
    const participants = session.participants && session.participants.length ? session.participants : ['김철수', '이영희'];
    const completedList = this.app.todayReports || [];

    const dateParts = (session.dutyDate || new Date().toISOString().slice(0, 10)).split('-');
    const formattedDateKorean = `${dateParts[0]}년 ${parseInt(dateParts[1], 10)}월 ${parseInt(dateParts[2], 10)}일`;
    const dutyDateStr = session.dutyDate || new Date().toISOString().slice(0, 10);
    const fileName = `[활동일지]_${buName.slice(0, 5)}_${dutyDateStr.replace(/-/g, '')}.pdf`;

    // 참여자 서명 박스 HTML 생성 (크기 확대 110x46px)
    const sigBoxesHtml = participants.map((name, idx) => {
      const sigImg = this.signatures[name] || null;
      return `
        <div style="display: flex; align-items: center; gap: 10px; font-size: 13px; color: #000000;">
          <span style="font-weight: bold;">참여자 ${idx + 1} : ${name}</span>
          <div style="width: 110px; height: 46px; border: 1.5px solid #000000; display: flex; align-items: center; justify-content: center; background: #ffffff;">
            ${sigImg ? `<img src="${sigImg}" style="max-height: 42px; max-width: 102px; object-fit: contain;" alt="${name} 서명">` : '<span style="font-size: 11.5px; font-weight: bold; color: #444444;">(인/서명)</span>'}
          </div>
        </div>
      `;
    }).join('');

    // A4 정규 공문서 템플릿 마크업 (A4 풀페이지 꽉 차는 레이아웃: min-height 980px + flex column)
    const reportWrap = document.createElement('div');
    reportWrap.style.width = '730px';
    reportWrap.style.minHeight = '980px';
    reportWrap.style.margin = '0 auto';
    reportWrap.style.backgroundColor = '#ffffff';
    reportWrap.style.boxSizing = 'border-box';
    reportWrap.style.padding = '32px 24px 28px 24px';
    reportWrap.style.fontFamily = "'Pretendard', sans-serif";
    reportWrap.style.color = '#000000';
    reportWrap.style.display = 'flex';
    reportWrap.style.flexDirection = 'column';
    reportWrap.style.justifyContent = 'space-between';

    reportWrap.innerHTML = `
      <div>
        <div style="text-align: center; margin-bottom: 18px;">
          <div style="font-size: 13.5px; font-weight: 700; color: #475569; letter-spacing: 0.5px; margin-bottom: 6px;">
            [2026년 노인일자리 및 사회활동 지원사업]
          </div>
          <div style="font-size: 23px; font-weight: 800; letter-spacing: -0.5px; border-bottom: 2px solid #000000; padding-bottom: 10px;">
            ${buName} 현장 활동일지
          </div>
        </div>

        <!-- 기본 정보 테이블 -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 12.5px; border: 1.5px solid #000000;">
          <tr>
            <td style="width: 16%; background: #f1f5f9; font-weight: bold; padding: 9px 8px; border: 1px solid #000000; text-align: center;">수 행 기 관</td>
            <td style="width: 34%; padding: 9px 12px; border: 1px solid #000000;">${session.orgName || '부평노인인력개발센터'}</td>
            <td style="width: 16%; background: #f1f5f9; font-weight: bold; padding: 9px 8px; border: 1px solid #000000; text-align: center;">활 동 일 자</td>
            <td style="width: 34%; padding: 9px 12px; border: 1px solid #000000;">${formattedDateKorean}</td>
          </tr>
          <tr>
            <td style="background: #f1f5f9; font-weight: bold; padding: 9px 8px; border: 1px solid #000000; text-align: center;">현장 참여자</td>
            <td style="padding: 9px 12px; border: 1px solid #000000;">${participants.join(', ')} (2인 1조)</td>
            <td style="background: #f1f5f9; font-weight: bold; padding: 9px 8px; border: 1px solid #000000; text-align: center;">인정 활동시간</td>
            <td style="padding: 9px 12px; border: 1px solid #000000;">09:00 ~ 12:00 (총 3시간 인정)</td>
          </tr>
        </table>

        <!-- 당일 현장 활동 실적 테이블 헤더 -->
        <div style="font-size: 13.5px; font-weight: 800; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
          <span>■ 당일 대상자별 안부 및 배달 실적</span>
          <span style="font-size: 12px; font-weight: normal; color: #475569;">총 <strong>${completedList.length}</strong>가구 방문 완료</span>
        </div>

        <!-- 실적 테이블: 2~3줄 텍스트가 겹치지 않게 여유 패딩과 줄간격 확보 -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; border: 1.5px solid #000000;">
          <thead>
            <tr style="background: #f1f5f9; text-align: center;">
              <th style="width: 5%; border: 1px solid #000000; padding: 8px 4px;">연번</th>
              <th style="width: 14%; border: 1px solid #000000; padding: 8px 6px;">성명 (UID)</th>
              <th style="width: 15%; border: 1px solid #000000; padding: 8px 6px;">접촉상태</th>
              <th style="width: 19%; border: 1px solid #000000; padding: 8px 6px;">금번 배달 물품</th>
              <th style="width: 20%; border: 1px solid #000000; padding: 8px 6px;">잔반 및 건강상태</th>
              <th style="width: 16%; border: 1px solid #000000; padding: 8px 6px;">판정 및 메모</th>
              <th style="width: 11%; border: 1px solid #000000; padding: 8px 4px;">용기회수</th>
            </tr>
          </thead>
          <tbody>
            ${completedList.length === 0 ? `
              <tr>
                <td colspan="7" style="border: 1px solid #000000; padding: 28px; text-align: center; color: #64748b;">
                  당일 등록된 방문 완료 내역이 없습니다.
                </td>
              </tr>
            ` : completedList.map((item, idx) => {
              const spec = (item.dutyDetails && item.dutyDetails.specific) || {};
              const common = (item.dutyDetails && item.dutyDetails.commonResult) || {};

              // 배달물품 괄호 2줄 분리 처리
              let itemTitle = spec.deliveryItem || '주간 밑반찬';
              let itemSub = '';
              const matchItem = itemTitle.match(/^([^(]+)(?:\((.*)\))?$/);
              if (matchItem) {
                itemTitle = matchItem[1].trim();
                itemSub = matchItem[2] ? `(${matchItem[2].trim()})` : '';
              }

              return `
                <tr>
                  <td style="border: 1px solid #000000; padding: 12px 4px; text-align: center; font-weight: bold;">${idx + 1}</td>
                  <td style="border: 1px solid #000000; padding: 12px 6px; text-align: center; line-height: 1.5;">
                    <strong style="font-size: 13px;">${maskName(item.targetName)}</strong><br>
                    <span style="font-size: 10px; color: #64748b; font-family: monospace;">${item.targetUid || ''}</span>
                  </td>
                  <td style="border: 1px solid #000000; padding: 12px 6px; text-align: center; line-height: 1.55;">
                    <strong style="color: #0f172a;">${item.contactStatus || '대면 접촉'}</strong><br>
                    <span style="font-size: 10.5px; color: #475569;">(${spec.receiveMethod || '직접 대면 수령'})</span>
                  </td>
                  <td style="border: 1px solid #000000; padding: 12px 8px; line-height: 1.55;">
                    <strong style="color: #0f172a; font-size: 12.5px;">${itemTitle}</strong>
                    ${itemSub ? `<br><span style="font-size: 11px; color: #475569;">${itemSub}</span>` : ''}
                  </td>
                  <td style="border: 1px solid #000000; padding: 12px 8px; line-height: 1.6;">
                    <div>• 섭취: <strong>${spec.intake || '전량 섭취'}</strong></div>
                    <div>• 상태: <strong>${common.healthStatus || spec.dietHealth || '양호'}</strong></div>
                  </td>
                  <td style="border: 1px solid #000000; padding: 12px 8px; line-height: 1.55;">
                    <strong style="color: ${item.isUrgent ? '#dc2626' : '#0f172a'};">${item.verdict || '정상 완료'}</strong><br>
                    <span style="font-size: 10.5px; color: #475569;">${item.specialNotes || '특이사항 없음'}</span>
                  </td>
                  <td style="border: 1px solid #000000; padding: 12px 4px; text-align: center; font-size: 11px; line-height: 1.5;">
                    ${spec.container ? spec.container.replace(/\s+/g, '<br>') : '세척 후<br>정상 회수'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- 하단 보고 및 서명 영역 (A4 최하단 꽉 차게 안착) -->
      <div style="margin-top: auto; padding-top: 36px; padding-bottom: 8px; text-align: center;">
        <div style="font-size: 14.5px; font-weight: 800; color: #000000; margin-bottom: 10px; letter-spacing: -0.2px;">
          상기와 같이 ${buName} 현장 활동을 보고합니다.
        </div>
        <div style="font-size: 14px; font-weight: 700; color: #000000; margin-bottom: 24px;">
          ${formattedDateKorean}
        </div>
        <div style="display: flex; justify-content: center; gap: 48px; align-items: center;">
          ${sigBoxesHtml}
        </div>
      </div>
    `;

    document.body.appendChild(reportWrap);

    try {
      // 전자서명 캔버스 이미지 비동기 무결성 보장 (img.onload 대기)
      const imgList = Array.from(reportWrap.querySelectorAll('img'));
      await Promise.all(imgList.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((r) => {
          img.onload = () => r();
          img.onerror = () => r();
        });
      }));

      // 잠시 렌더링 딜레이 (300ms)
      await new Promise(r => setTimeout(r, 300));

      const html2pdfLib = window.html2pdf || (typeof html2pdf !== 'undefined' ? html2pdf : null);
      if (!html2pdfLib) {
        window.print();
        return;
      }

      const opt = {
        margin: [10, 5, 5, 5],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        pagebreak: { mode: ['css', 'legacy'] },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollY: 0
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        }
      };

      await html2pdfLib().from(reportWrap).set(opt).save();
      notifier.toast(`활동일지 PDF 파일(${fileName}) 다운로드가 완료되었습니다.`, 'success', 2500);
    } catch (err) {
      console.error('PDF 생성 실패:', err);
      notifier.toast('PDF 생성 실패: ' + err.message, 'error', 3000);
    } finally {
      if (document.body.contains(reportWrap)) {
        document.body.removeChild(reportWrap);
      }
    }
  }

  /**
   * 당일 내역 엑셀 다운로드 (CSV / 엑셀 호환)
   */
  generateAndDownloadExcel() {
    const session = this.app.session;
    const completedList = this.app.todayReports || [];
    const buName = session.buName || '영양도시락밑반찬배달사업단';
    const dutyDate = session.dutyDate || new Date().toISOString().slice(0, 10);

    const headers = ['연번', '어르신UID', '성명', '접촉상태', '수령방식', '배달품목', '섭취상태', '건강상태', '용기회수', '판정', '특이사항'];
    const rows = completedList.map((item, idx) => {
      const spec = (item.dutyDetails && item.dutyDetails.specific) || {};
      const common = (item.dutyDetails && item.dutyDetails.commonResult) || {};
      return [
        idx + 1,
        item.targetUid || '',
        item.targetName || '',
        item.contactStatus || '',
        spec.receiveMethod || '',
        spec.deliveryItem || '',
        spec.intake || '',
        common.healthStatus || spec.dietHealth || '',
        spec.container || '',
        item.verdict || '정상 완료',
        item.specialNotes || ''
      ];
    });

    const csvContent = '\uFEFF' + [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `[활동내역]_${buName.slice(0, 5)}_${dutyDate.replace(/-/g, '')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

