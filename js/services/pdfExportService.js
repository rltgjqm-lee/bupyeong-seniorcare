/**
 * @file pdfExportService.js
 * @description 고독사 예방 안심살핌 조사표 A4 표준 흑백 공문서 서식 4종 PDF 생성 및 다운로드 서비스 (ESM)
 */

import { QUESTION_SPECS } from '../config/questionSpecs.js';
import { maskName, maskPhone, maskAddress, maskUid, maskBirth } from '../utils/mask.js';
import { notifier } from '../utils/notifier.js';
import { getLocalTodayString } from '../utils/date.js';

function formatKoreanDate(dateStr) {
  if (!dateStr) {
    const now = new Date();
    return `${now.getFullYear()}년 ${String(now.getMonth() + 1).padStart(2, '0')}월 ${String(now.getDate()).padStart(2, '0')}일`;
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[0]}년 ${parts[1]}월 ${parts[2]}일`;
  }
  return dateStr;
}

function resolveInspectors(surveyData) {
  const b = surveyData?.basicInfo || {};
  let raw = b.inspectors || surveyData?.inspectors || surveyData?.participants || b.inspector;
  let list = [];
  if (Array.isArray(raw)) {
    list = raw.map(n => (typeof n === 'string' ? n.trim() : (n?.name ? String(n.name).trim() : ''))).filter(Boolean);
  } else if (typeof raw === 'string' && raw.trim()) {
    list = raw.split(',').map(n => n.trim()).filter(Boolean);
  }
  return list.length > 0 ? list : ['참여자'];
}

function buildBlackAndWhiteSignaturesHtml(inspectors, consentSignatures, formattedDate) {
  const list = resolveInspectors({ basicInfo: { inspectors } });

  const sigBoxesHtml = list.map((name, idx) => {
    const sig = (consentSignatures && (consentSignatures[name] || consentSignatures[name.trim()]))
      || (consentSignatures && typeof consentSignatures === 'object' && Object.values(consentSignatures)[idx])
      || null;
    const label = list.length > 1 ? `참여자 ${idx + 1} : ${name}` : `참여자 : ${name}`;
    return `
      <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #000000;">
        <span style="font-weight: bold; font-size: 12px;">${label}</span>
        <div style="width: 88px; height: 36px; border: 1px solid #000000; display: flex; align-items: center; justify-content: center; background: #ffffff;">
          ${sig ? `<img src="${sig}" style="max-height: 32px; max-width: 82px; object-fit: contain;" alt="${name} 서명">` : '<span style="font-size: 11px; font-weight: bold; color: #111111;">(인/서명)</span>'}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div style="text-align: center; margin-top: 14px; padding-top: 6px;">
      <div style="font-size: 13px; font-weight: bold; color: #000000; margin-bottom: 6px; letter-spacing: -0.2px;">
        상기와 같이 고독사예방게이트키퍼 활동을 보고 드립니다.
      </div>
      <div style="font-size: 12.5px; color: #000000; margin-bottom: 10px; font-weight: bold;">
        ${formattedDate}
      </div>
      <div style="display: flex; justify-content: center; gap: 36px; align-items: center;">
        ${sigBoxesHtml}
      </div>
    </div>
  `;
}

/**
 * 현장 신규 발굴 가구(100% 원본 노출) vs 기존 배정 가구(마스킹 유지) 정보 해석기
 * @param {Object} surveyData 
 */
function resolveTargetDisplayInfo(surveyData) {
  const b = surveyData.basicInfo || {};
  const p = surveyData.profile || surveyData.targetProfile || {};
  const g = p.guardian || {};

  const curCaseUid = b.caseUid || '';
  const uidParts = curCaseUid.split('-');
  const suffix = uidParts[uidParts.length - 1] || '';

  // 1. 차수 및 재방문 검증 (2차 이상은 발굴 완료된 '기 대상자'로 전환되어 마스킹 필수)
  const round = b.round || (b.surveyUid && b.surveyUid.match(/-R(\d+)/) ? parseInt(b.surveyUid.match(/-R(\d+)/)[1], 10) : (surveyData.revisitRound || 1));
  const isRevisit = (surveyData.isRevisit === true) || (b.isRevisit === true) || (round >= 2) || (surveyData.caseStatus === '정기방문');
  const isFieldDiscovery = (!isRevisit) && ((surveyData.isFieldDiscovery === true) || (surveyData.caseStatus === 'FIELD_DISCOVERY') || !/^\d{3}$/.test(suffix));

  const rawName = p.name || '대상자';
  return {
    isFieldDiscovery,
    targetName: isFieldDiscovery ? rawName : maskName(rawName),
    birth: isFieldDiscovery ? (p.birth || '') : maskBirth(p.birth),
    phone: isFieldDiscovery ? (p.phone || '') : maskPhone(p.phone),
    address: isFieldDiscovery ? (p.address || p.baseAddress || '') : maskAddress(p.address || p.baseAddress),
    caseUid: isFieldDiscovery ? curCaseUid : maskUid(curCaseUid),
    surveyUid: isFieldDiscovery ? (b.rawSurveyUid || b.maskedSurveyUid || curCaseUid) : maskUid(b.maskedSurveyUid || b.rawSurveyUid || curCaseUid),
    guardianName: isFieldDiscovery ? (g.name || '보호자') : maskName(g.name || '보호자'),
    guardianPhone: isFieldDiscovery ? (g.phone || '-') : (maskPhone(g.phone) || '-'),
    guardianAddress: isFieldDiscovery ? (g.address || '-') : (maskAddress(g.address) || '-')
  };
}

export class PdfExportService {
  /**
   * check-smoking-zone 정통 표준: A4 1장 단일 페이지 PDF 생성 엔진 (margin: 0)
   * @param {string} pageHtml - A4 서식 HTML
   * @param {string} fileName - 저장할 파일명
   */
  static async exportA4PageToPdf(pageHtml, fileName) {
    const element = document.createElement('div');
    element.style.width = "730px";
    element.style.margin = "0 auto";
    element.style.backgroundColor = "#ffffff";
    element.style.boxSizing = "border-box";
    element.innerHTML = pageHtml;
    document.body.appendChild(element);

    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          // [전사 v06 4항] 전자서명 캔버스 이미지 비동기 무결성 보장 (img.onload 대기)
          const imgList = Array.from(element.querySelectorAll('img'));
          await Promise.all(imgList.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise((r) => {
              img.onload = () => r();
              img.onerror = () => r();
            });
          }));

          const html2pdfLib = window.html2pdf || (typeof html2pdf !== 'undefined' ? html2pdf : null);
          if (!html2pdfLib) throw new Error('PDF 출력 모듈을 불러오지 못했습니다.');

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
              orientation: 'portrait',
              encryption: {
                userPassword: '123456',
                ownerPassword: 'WellRiskKeeper-Enterprise-Master-2026',
                userPermissions: ['print']
              }
            }
          };

          await html2pdfLib().from(element).set(opt).save();

          if (document.body.contains(element)) document.body.removeChild(element);
          notifier.toast(`PDF 파일(${fileName}) 다운로드가 완료되었습니다.`, 'success', 2500);
          resolve();
        } catch (err) {
          if (document.body.contains(element)) document.body.removeChild(element);
          console.error('PDF 생성 실패:', err);
          alert(`PDF 다운로드 중 오류가 발생했습니다: ${err.message || err}`);
          reject(err);
        }
      }, 400);
    });
  }

  static async exportObservationLogToPdf(surveyData, customFileName = '') {
    if (!surveyData) {
      alert('다운로드할 조사 데이터가 없습니다.');
      return;
    }

    const b = surveyData.basicInfo || {};
    const p = surveyData.profile || {};
    const obs = surveyData.observation || {};
    const ans = surveyData.answers || {};
    const consent = surveyData.consent || {};

    const dateStr = (b.inspectionDate || getLocalTodayString());
    const koreanDateStr = formatKoreanDate(b.inspectionDate);
    const tInfo = resolveTargetDisplayInfo(surveyData);
    const inspectors = resolveInspectors(surveyData);

    const fileName = customFileName || `[${tInfo.caseUid || 'C-미지정'}]_가정방문기록지_내외부환경_${tInfo.targetName}_${dateStr.replace(/-/g, '')}.pdf`;

    const hType = p.housingType || '';
    const hCustom = p.housingCustom || '';
    const housingList = [
      { key: '단독주택', label: '단독주택' },
      { key: '다가구/다세대주택', label: '다가구·다세대주택' },
      { key: '아파트', label: '아파트' },
      { key: '연립주택', label: '연립주택' },
      { key: '오피스텔', label: '오피스텔' },
      { key: '고시원', label: '고시원(텔)' },
      { key: '원룸', label: '원룸' },
      { key: '쪽방', label: '쪽방' },
      { key: '여관/모텔', label: '여관·모텔' }
    ];

    let housingBoxesHtml = housingList.map(item => {
      const isChecked = hType.includes(item.key) || hType === item.label;
      return `<span style="margin-right: 6px; display: inline-block;">${isChecked ? '■' : '□'} ${item.label}</span>`;
    }).join(' ');

    const isDirectCustom = hType === '직접기재' || !!hCustom;
    housingBoxesHtml += `<span style="display: inline-block;">${isDirectCustom ? '■' : '□'} 직접기재(${hCustom || ' '})</span>`;

    // 외부 관찰 6종
    const obsItems = [
      { key: 'mailAccumulated', text: '집 앞에 우편물, 독촉장 등 우편물이 쌓여 있다.' },
      { key: 'odorInsects', text: '집 주변에 악취가 나고, 벌레 등이 보인다.' },
      { key: 'trashBottles', text: '집 주변에 쓰레기 또는 술병이 많이 보인다.' },
      { key: 'tvLightOn', text: '인기척이 없으나, 계속해서 텔레비전이 켜져 있거나, 불이 켜져 있다.' },
      { key: 'isolatedLiving', text: '밖에 나오지 않고 혼자만 지낸다. 외출한 모습을 본적이 없다고 한다.' },
      { key: 'contactLost', text: '자주 마주치던 곳에서 보이지 않거나, 갑자기 연락이 안된다.' }
    ];

    // 실내 주거환경 관찰 4종
    const obs1_bottles = obs.trashBottles === true;
    const obs2_odor = obs.odorInsects === true || ans[12]?.isRisk === true;
    const obs3_hygiene = ans[8]?.isRisk === true || ans[11]?.isRisk === true;
    const obs4_meal = ans[1]?.isRisk === true;

    const signaturesHtml = buildBlackAndWhiteSignaturesHtml(inspectors, consent.inspectorSignatures, koreanDateStr);

    const pageHtml = `
      <div class="pdf-page" style="width:730px; height:1060px; max-height:1060px; overflow:hidden; margin:0 auto; padding:18px 22px; box-sizing:border-box; color:#000000; font-family:'Pretendard', 'Malgun Gothic', sans-serif; background:#ffffff; position:relative;">
        <div style="border:2px solid #000000; padding:18px 18px 12px 18px; background:#ffffff; box-sizing:border-box; height:1024px; display:flex; flex-direction:column; justify-content:space-between;">
          
          <div style="flex:1; display:flex; flex-direction:column;">
            <!-- 상단 헤더 (박스 안 상단 여유 확보) -->
            <div style="margin-top:2px; margin-bottom:10px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:4px;">
                <div style="font-size:11.5px; color:#000000;">${b.orgName || '통합돌봄센터'} | ${b.project || '고독사예방게이트키퍼'}</div>
                <div style="font-size:11.5px; color:#000000;"><strong>관리번호:</strong> ${tInfo.caseUid}</div>
              </div>
              <div style="text-align:center; font-size:23px; font-weight:800; letter-spacing:2px; color:#000000; border-bottom:2px solid #000000; padding-bottom:6px; margin-top:4px;">
                가정방문 기록지 (내·외부환경)
              </div>
            </div>

            <!-- 본문 테이블 -->
            <table style="width:100%; border-collapse:collapse; table-layout:fixed; border:1px solid #000000; margin-bottom:0; font-size:11.5px; color:#000000;">
              <tr>
                <td style="width:15%; border:1px solid #000000; padding:9.5px 6px; background:#f2f2f2; text-align:center; font-weight:bold;">방문일시</td>
                <td style="width:35%; border:1px solid #000000; padding:7.5px 10px; background:#ffffff;">${dateStr}</td>
                <td style="width:15%; border:1px solid #000000; padding:9.5px 6px; background:#f2f2f2; text-align:center; font-weight:bold;">방문자</td>
                <td style="width:35%; border:1px solid #000000; padding:7.5px 10px; background:#ffffff;">${inspectors.join(', ')}</td>
              </tr>
              <tr>
                <td colspan="4" style="border:1px solid #000000; padding:7px 6px; background:#f2f2f2; text-align:center; font-weight:bold; font-size:12px;">대 상 가 구</td>
              </tr>
              <tr>
                <td style="border:1px solid #000000; padding:9.5px 6px; background:#f2f2f2; text-align:center; font-weight:bold;">성 명</td>
                <td style="border:1px solid #000000; padding:7.5px 10px; font-weight:bold;">${tInfo.targetName}</td>
                <td style="border:1px solid #000000; padding:9.5px 6px; background:#f2f2f2; text-align:center; font-weight:bold;">생년월일</td>
                <td style="border:1px solid #000000; padding:7.5px 10px;">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span>${tInfo.birth || '-'}</span>
                    <span>성별: ${p.gender === '남' ? '■ 남 □ 여' : '□ 남 ■ 여'}</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="border:1px solid #000000; padding:9.5px 6px; background:#f2f2f2; text-align:center; font-weight:bold;">주 소</td>
                <td style="border:1px solid #000000; padding:7.5px 10px;">${tInfo.address || '-'}</td>
                <td style="border:1px solid #000000; padding:9.5px 6px; background:#f2f2f2; text-align:center; font-weight:bold;">전화번호</td>
                <td style="border:1px solid #000000; padding:7.5px 10px;">${tInfo.phone || '-'}</td>
              </tr>
              <tr>
                <td style="border:1px solid #000000; padding:9.5px 6px; background:#f2f2f2; text-align:center; font-weight:bold;">거주지유형</td>
                <td colspan="3" style="border:1px solid #000000; padding:7.5px 10px; font-size:10.5px; line-height:1.5;">
                  ${housingBoxesHtml}
                </td>
              </tr>
              <tr>
                <td colspan="4" style="border:1px solid #000000; padding:7px 6px; background:#f2f2f2; text-align:center; font-weight:bold; font-size:12px;">내·외부 확인사항</td>
              </tr>
              <!-- 외부 관찰 6종 -->
              ${obsItems.map((item, idx) => `
                <tr>
                  ${idx === 0 ? `<td rowspan="6" style="border:1px solid #000000; padding:6px; background:#f2f2f2; text-align:center; font-weight:bold; font-size:12px; letter-spacing:1px;">집 밖<br>외부</td>` : ''}
                  <td colspan="2" style="border:1px solid #000000; padding:8.5px 10px; line-height:1.4;">${item.text}</td>
                  <td style="border:1px solid #000000; padding:8.5px 8px; text-align:center; white-space:nowrap; font-size:11.5px;">
                    <span style="margin-right:12px;">${obs[item.key] === false ? '■' : '□'} 없음</span>
                    <span>${obs[item.key] === true ? '■' : '□'} 있음</span>
                  </td>
                </tr>
              `).join('')}
              <!-- 실내 관찰 4종 -->
              <tr>
                <td rowspan="4" style="border:1px solid #000000; padding:6px; background:#f2f2f2; text-align:center; font-weight:bold; font-size:12px; letter-spacing:1px;">집 안<br>내부</td>
                <td colspan="2" style="border:1px solid #000000; padding:8.5px 10px;">실내 술병 방치 및 쓰레기 적치 여부</td>
                <td style="border:1px solid #000000; padding:8.5px 8px; text-align:center; font-size:11.5px;">
                  <span style="margin-right:12px;">${!obs1_bottles ? '■' : '□'} 없음</span>
                  <span>${obs1_bottles ? '■' : '□'} 있음</span>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="border:1px solid #000000; padding:8.5px 10px;">실내 악취 발생 및 해충 번식 여부</td>
                <td style="border:1px solid #000000; padding:8.5px 8px; text-align:center; font-size:11.5px;">
                  <span style="margin-right:12px;">${!obs2_odor ? '■' : '□'} 없음</span>
                  <span>${obs2_odor ? '■' : '□'} 있음</span>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="border:1px solid #000000; padding:8.5px 10px;">실내 위생 청결 및 의복/주거 상태</td>
                <td style="border:1px solid #000000; padding:8.5px 8px; text-align:center; font-size:11.5px;">
                  <span style="margin-right:12px;">${!obs3_hygiene ? '■' : '□'} 양호</span>
                  <span>${obs3_hygiene ? '■' : '□'} 불량</span>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="border:1px solid #000000; padding:8.5px 10px;">대상자 식사 챙김 및 영양/거동 상태</td>
                <td style="border:1px solid #000000; padding:8.5px 8px; text-align:center; font-size:11.5px;">
                  <span style="margin-right:12px;">${!obs4_meal ? '■' : '□'} 양호</span>
                  <span>${obs4_meal ? '■' : '□'} 불량</span>
                </td>
              </tr>
              <tr>
                <td style="border:1px solid #000000; padding:8px 6px; background:#f2f2f2; text-align:center; font-weight:bold;">특이사항<br>및 소견</td>
                <td colspan="3" style="border:1px solid #000000; height:120px; vertical-align:top; padding:10px 12px;">
                  <div style="font-size:10.5px; color:#555555; margin-bottom:4px;">※ 집주인/이웃 탐문 및 실내 주거/건강 특이사항을 기재합니다.</div>
                  <div style="font-size:11.5px; line-height:1.5; color:#000000;">${obs.neighborNote || (obs.visitResult === 'unmet' ? `[미대면 사유] ${obs.unmetReason || '부재중'}` : '특이사항 없음')}</div>
                </td>
              </tr>
            </table>
          </div>

          <!-- 하단 보고 및 서명 영역 (A4 최하단 고정 안착) -->
          <div style="margin-top:auto; flex-shrink:0;">
            ${signaturesHtml}
          </div>

        </div>
      </div>
    `;

    await this.exportA4PageToPdf(pageHtml, fileName);
  }

  /**
   * [3번 서식] 수혜자 관리카드 A4 1장 흑백 공문서 서식 (항목 바로 아래 세부내용 1:1 배치)
   */
  static async exportBeneficiaryCardToPdf(surveyData, customFileName = '') {
    if (!surveyData) {
      alert('다운로드할 조사 데이터가 없습니다.');
      return;
    }

    const b = surveyData.basicInfo || {};
    const p = surveyData.profile || {};
    const g = p.guardian || {};
    const card = surveyData.beneficiaryCard || {};
    const consent = surveyData.consent || {};

    const dateStr = (b.inspectionDate || getLocalTodayString());
    const koreanDateStr = formatKoreanDate(b.inspectionDate);
    const dateParts = dateStr.split('-');
    const formattedShortDate = `${parseInt(dateParts[1], 10)}.${parseInt(dateParts[2], 10)}`;
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][new Date(dateStr).getDay()];

    const tInfo = resolveTargetDisplayInfo(surveyData);
    const inspectors = resolveInspectors(surveyData);

    const fileName = customFileName || `[${tInfo.caseUid || 'C-미지정'}]_수혜자_관리카드_${tInfo.targetName}_${dateStr.replace(/-/g, '')}.pdf`;

    const isVisit = card.method !== 'call';
    const healthStatus = card.healthStatus || '양호';
    const psychStatus = card.psychStatus || '안정';
    const livingStatus = card.livingStatus || '청결';
    const symptomStatus = card.symptomStatus || '없음';
    const hasOther = card.hasOther === true;

    const signaturesHtml = buildBlackAndWhiteSignaturesHtml(inspectors, consent.inspectorSignatures, koreanDateStr);

    const pageHtml = `
      <div class="pdf-page" style="width:730px; height:1060px; max-height:1060px; overflow:hidden; margin:0 auto; padding:18px 22px; box-sizing:border-box; color:#000000; font-family:'Pretendard', 'Malgun Gothic', sans-serif; background:#ffffff; position:relative;">
        <div style="border:2px solid #000000; padding:18px 18px 12px 18px; background:#ffffff; box-sizing:border-box; height:1024px; display:flex; flex-direction:column; justify-content:space-between;">
          
          <div style="flex:1; display:flex; flex-direction:column;">
            <!-- 상단 헤더 (박스 안 상단 여유 확보) -->
            <div style="margin-top:2px; margin-bottom:10px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:4px;">
                <div style="font-size:11.5px; color:#000000;">${b.orgName || '통합돌봄센터'} | ${b.project || '고독사예방게이트키퍼'}</div>
                <div style="font-size:11.5px; color:#000000;"><strong>관리번호:</strong> ${tInfo.caseUid}</div>
              </div>
              <div style="text-align:center; font-size:23px; font-weight:800; letter-spacing:3px; color:#000000; border-bottom:2px solid #000000; padding-bottom:6px; margin-top:4px;">
                수혜자 관리카드
              </div>
            </div>

            <!-- 1. 대상자 및 보호자 인적사항 테이블 -->
            <table style="width:100%; border-collapse:collapse; table-layout:fixed; border:1px solid #000000; margin-bottom:8px; font-size:11.5px; color:#000000;">
              <tr>
                <td style="width:13%; border:1px solid #000000; padding:6px 6px; background:#f2f2f2; text-align:center; font-weight:bold;">성 명</td>
                <td style="width:20%; border:1px solid #000000; padding:6px 6px; font-weight:bold;">${tInfo.targetName}</td>
                <td style="width:14%; border:1px solid #000000; padding:6px 6px; background:#f2f2f2; text-align:center; font-weight:bold;">생년월일</td>
                <td style="width:19%; border:1px solid #000000; padding:6px 6px;">${tInfo.birth || '-'}</td>
                <td style="width:14%; border:1px solid #000000; padding:6px 6px; background:#f2f2f2; text-align:center; font-weight:bold;">성 별</td>
                <td style="width:20%; border:1px solid #000000; padding:6px 6px; text-align:center;">
                  <span>${p.gender === '남' ? '■ 남 □ 여' : '□ 남 ■ 여'}</span>
                </td>
              </tr>
              <tr>
                <td style="border:1px solid #000000; padding:6px 6px; background:#f2f2f2; text-align:center; font-weight:bold;">주 소</td>
                <td colspan="3" style="border:1px solid #000000; padding:6px 6px;">${tInfo.address || '-'}</td>
                <td style="border:1px solid #000000; padding:6px 6px; background:#f2f2f2; text-align:center; font-weight:bold;">연락처</td>
                <td style="border:1px solid #000000; padding:6px 6px; text-align:center;">${tInfo.phone || '-'}</td>
              </tr>
              <tr>
                <td style="border:1px solid #000000; padding:6px 6px; background:#f2f2f2; text-align:center; font-weight:bold;">보호자 정보</td>
                <td colspan="5" style="border:1px solid #000000; padding:6px 6px; font-size:11px;">
                  1) 성명: <strong>${tInfo.guardianName || '미등록'}</strong> &nbsp;&nbsp;&nbsp;&nbsp;
                  2) 관계: <strong>${g.relation || '-'}</strong> &nbsp;&nbsp;&nbsp;&nbsp;
                  3) 연락처: <strong>${tInfo.guardianPhone || '-'}</strong>
                </td>
              </tr>
            </table>

            <!-- 2. 안부확인 메인 기록 테이블 (항목 바로 아래 세부내용 1:1 행 매핑 구조) -->
            <table style="width:100%; border-collapse:collapse; table-layout:fixed; border:1px solid #000000; margin-bottom:8px; font-size:11px; color:#000000;">
              <thead>
                <tr style="background:#f2f2f2; font-weight:bold; text-align:center;">
                  <th style="width:18%; border:1px solid #000000; padding:6px 4px;">일자 / 방식</th>
                  <th style="width:32%; border:1px solid #000000; padding:6px 6px;">점 검 항 목</th>
                  <th style="width:50%; border:1px solid #000000; padding:6px 6px;">상 태 체 크</th>
                </tr>
              </thead>
              <tbody>
                <!-- 1. 건강상태 -->
                <tr>
                  <td rowspan="10" style="border:1px solid #000000; padding:8px 4px; text-align:center; vertical-align:middle; line-height:1.7; background:#ffffff;">
                    <div style="font-weight:bold; font-size:12.5px; margin-bottom:6px;">${formattedShortDate}(${dayOfWeek})</div>
                    <div style="font-size:11.5px; margin-bottom:4px;">${isVisit ? '■' : '□'} 방문안부</div>
                    <div style="font-size:11.5px;">${!isVisit ? '■' : '□'} 전화안부</div>
                  </td>
                  <td style="border:1px solid #000000; padding:6px 6px; background:#f9f9f9; font-weight:bold;">1. 건강상태</td>
                  <td style="border:1px solid #000000; padding:6px 6px; text-align:center;">
                    <span style="margin-right:12px;">${healthStatus === '양호' ? '■' : '□'} 양호</span>
                    <span style="margin-right:12px;">${healthStatus === '보통' ? '■' : '□'} 보통</span>
                    <span>${healthStatus === '악화' ? '■' : '□'} 악화</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="border:1px solid #000000; padding:4px 8px; background:#ffffff; font-size:10.5px; color:#333333; line-height:1.4;">
                    <strong>• 세부내용:</strong> ${card.healthNote || (healthStatus === '악화' ? '건강 악화 소견 있음' : '특이사항 없음')}
                  </td>
                </tr>

                <!-- 2. 심리상태 -->
                <tr>
                  <td style="border:1px solid #000000; padding:6px 6px; background:#f9f9f9; font-weight:bold;">2. 심리상태</td>
                  <td style="border:1px solid #000000; padding:6px 6px; text-align:center;">
                    <span style="margin-right:12px;">${psychStatus === '안정' ? '■' : '□'} 안정</span>
                    <span style="margin-right:12px;">${psychStatus === '불안' ? '■' : '□'} 불안</span>
                    <span>${psychStatus === '우울' ? '■' : '□'} 우울</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="border:1px solid #000000; padding:4px 8px; background:#ffffff; font-size:10.5px; color:#333333; line-height:1.4;">
                    <strong>• 세부내용:</strong> ${card.psychNote || (psychStatus !== '안정' ? '정서적 불안/우울감 호소' : '정서적으로 안정된 상태임')}
                  </td>
                </tr>

                <!-- 3. 주거환경 상태 -->
                <tr>
                  <td style="border:1px solid #000000; padding:6px 6px; background:#f9f9f9; font-weight:bold;">3. 주거환경 상태</td>
                  <td style="border:1px solid #000000; padding:6px 6px; text-align:center;">
                    <span style="margin-right:12px;">${livingStatus === '청결' ? '■' : '□'} 청결</span>
                    <span style="margin-right:12px;">${livingStatus === '정돈필요' ? '■' : '□'} 정돈필요</span>
                    <span>${livingStatus === '심각' ? '■' : '□'} 심각</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="border:1px solid #000000; padding:4px 8px; background:#ffffff; font-size:10.5px; color:#333333; line-height:1.4;">
                    <strong>• 세부내용:</strong> ${card.livingNote || (livingStatus === '심각' ? '주거 청소 및 환경개선 지원 필요' : '주거 상태 이상 없음')}
                  </td>
                </tr>

                <!-- 4. 이상징후여부 -->
                <tr>
                  <td style="border:1px solid #000000; padding:6px 6px; background:#f9f9f9; font-weight:bold;">4. 이상징후여부</td>
                  <td style="border:1px solid #000000; padding:6px 6px; text-align:center;">
                    <span style="margin-right:10px;">${symptomStatus === '없음' ? '■' : '□'} 없음</span>
                    <span style="margin-right:10px;">${symptomStatus === '고립조짐' ? '■' : '□'} 고립조짐</span>
                    <span>${symptomStatus === '응급징후' ? '■' : '□'} 응급징후</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="border:1px solid #000000; padding:4px 8px; background:#ffffff; font-size:10.5px; color:#333333; line-height:1.4;">
                    <strong>• 세부내용:</strong> ${card.symptomNote || (symptomStatus !== '없음' ? '고립 또는 위기 조짐 발견' : '특이 이상징후 관찰되지 않음')}
                  </td>
                </tr>

                <!-- 5. 기타사항 -->
                <tr>
                  <td style="border:1px solid #000000; padding:6px 6px; background:#f9f9f9; font-weight:bold;">5. 기타 특이사항</td>
                  <td style="border:1px solid #000000; padding:6px 6px; text-align:center;">
                    <span style="margin-right:16px;">${hasOther ? '■' : '□'} 있음</span>
                    <span>${!hasOther ? '■' : '□'} 없음</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="border:1px solid #000000; padding:4px 8px; background:#ffffff; font-size:10.5px; color:#333333; line-height:1.4;">
                    <strong>• 세부내용:</strong> ${card.otherNote || (hasOther ? '기타 요청 및 특이사항 있음' : '특이사항 없음')}
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- 3. 종합 소견 및 조치사항 박스 -->
            <div style="border:1px solid #000000; padding:8px 10px; background:#ffffff; font-size:11px; line-height:1.5; min-height:85px;">
              <div style="font-weight:bold; color:#000000; margin-bottom:4px;">※ 종합 안부살핌 총평 및 조치 계획:</div>
              <div style="color:#111111;">
                ${(card.trendNote || card.detailNote) ? (card.trendNote || card.detailNote) : '<span style="color:#94a3b8; font-size:11px;">(관리자 종합 총평 및 조치 계획 수기 작성란)</span>'}
              </div>
            </div>
          </div>

          <!-- 하단 보고 및 서명 영역 (A4 최하단 고정 안착) -->
          <div style="margin-top:auto; flex-shrink:0;">
            ${signaturesHtml}
          </div>

        </div>
      </div>
    `;

    await this.exportA4PageToPdf(pageHtml, fileName);
  }

  /**
   * [2번 서식] 고독사 위험도 현장조사표 A4 1장 흑백 공문서 서식 (10대 문항 전체 및 메모 100% 수록)
   */
  static async exportSurveyToPdf(surveyData, customFileName = '') {
    if (!surveyData) {
      alert('다운로드할 조사 데이터가 없습니다.');
      return;
    }

    const b = surveyData.basicInfo || {};
    const p = surveyData.profile || {};
    const ans = surveyData.answers || {};
    const res = surveyData.result || {};
    const consent = surveyData.consent || {};

    const dateStr = (b.inspectionDate || getLocalTodayString());
    const koreanDateStr = formatKoreanDate(b.inspectionDate);
    const tInfo = resolveTargetDisplayInfo(surveyData);
    const inspectors = resolveInspectors(surveyData);

    const fileName = customFileName || `[${tInfo.caseUid || 'C-미지정'}]_고독사위험도_현장조사표_${tInfo.targetName}_${dateStr.replace(/-/g, '')}.pdf`;

    const hType = p.housingType || '';
    const hCustom = p.housingCustom || '';
    const housingList = [
      { key: '단독주택', label: '단독주택' },
      { key: '다가구/다세대주택', label: '다가구·다세대주택' },
      { key: '아파트', label: '아파트' },
      { key: '연립주택', label: '연립주택' },
      { key: '오피스텔', label: '오피스텔' },
      { key: '고시원', label: '고시원(텔)' },
      { key: '원룸', label: '원룸' },
      { key: '쪽방', label: '쪽방' },
      { key: '여관/모텔', label: '여관·모텔' }
    ];

    let housingBoxesHtml = housingList.map(item => {
      const isChecked = hType.includes(item.key) || hType === item.label;
      return `<span style="margin-right: 6px; display: inline-block;">${isChecked ? '■' : '□'} ${item.label}</span>`;
    }).join(' ');

    const isDirectCustom = hType === '직접기재' || !!hCustom;
    housingBoxesHtml += `<span style="display: inline-block;">${isDirectCustom ? '■' : '□'} 직접기재(${hCustom || ' '})</span>`;

    let questionsHtml = '';
    let calculatedScore = 0;
    QUESTION_SPECS.forEach((q) => {
      const a = ans[q.num] || ans[q.id];
      const isRisk = a && a.isRisk === true;
      if (isRisk) {
        calculatedScore += q.scoreWeight;
      }
      const memo = a && a.activityMemo ? a.activityMemo : '';

      questionsHtml += `
        <tr>
          <td style="border:1px solid #000000; padding:6px 10px; font-size:11px; line-height:1.4; color:#000000;">
            <div><strong>${q.num})</strong> ${q.title}</div>
            ${memo ? `<div style="font-size:10px; color:#444444; margin-top:2px; padding-left:12px;">※ 메모: ${memo}</div>` : ''}
          </td>
          <td style="width:160px; border:1px solid #000000; text-align:center; font-size:11px; white-space:nowrap; color:#000000; padding:6px 8px;">
            <span style="margin-right:12px; ${isRisk ? 'font-weight:bold;' : ''}">
              ${isRisk ? '■' : '□'} 예(${q.scoreWeight}점)
            </span>
            <span style="${!isRisk ? 'font-weight:bold;' : ''}">
              ${!isRisk ? '■' : '□'} 아니오(0점)
            </span>
          </td>
        </tr>
      `;
    });

    // 대전제 가드: 문항 응답 데이터가 존재하면 실제 체크된 배점 합산(calculatedScore)을 총점으로 1:1 동기화
    const hasAnyAnswers = Object.keys(ans).length > 0;
    const totalScore = hasAnyAnswers ? calculatedScore : (typeof res.totalScore === 'number' ? res.totalScore : 0);
    const isRiskGroup = totalScore >= 6;

    const signaturesHtml = buildBlackAndWhiteSignaturesHtml(inspectors, consent.inspectorSignatures, koreanDateStr);

    const pageHtml = `
      <div class="pdf-page" style="width:730px; height:1060px; max-height:1060px; overflow:hidden; margin:0 auto; padding:18px 22px; box-sizing:border-box; color:#000000; font-family:'Pretendard', 'Malgun Gothic', sans-serif; background:#ffffff; position:relative;">
        <div style="border:2px solid #000000; padding:18px 18px 12px 18px; background:#ffffff; box-sizing:border-box; height:1024px; display:flex; flex-direction:column; justify-content:space-between;">
          
          <div style="flex:1; display:flex; flex-direction:column;">
            <!-- 상단 헤더 (박스 안 상단 여유 확보) -->
            <div style="margin-top:2px; margin-bottom:10px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:4px;">
                <div style="font-size:11.5px; color:#000000;">${b.orgName || '통합돌봄센터'} | ${b.project || '고독사예방게이트키퍼'}</div>
                <div style="font-size:11.5px; color:#000000;"><strong>관리번호:</strong> ${tInfo.caseUid || '-'}</div>
              </div>
              <div style="text-align:center; font-size:23px; font-weight:800; letter-spacing:2px; color:#000000; border-bottom:2px solid #000000; padding-bottom:6px; margin-top:4px;">
                고독사 위험도 현장조사표
              </div>
            </div>

            <!-- 1. 대상자 인적사항 -->
            <table style="width:100%; border-collapse:collapse; table-layout:fixed; border:1px solid #000000; margin-bottom:8px; font-size:11px; color:#000000;">
              <tr>
                <td style="width:13%; border:1px solid #000000; padding:6px 6px; background:#f2f2f2; text-align:center; font-weight:bold;">성 명</td>
                <td style="width:20%; border:1px solid #000000; padding:6px 8px; font-weight:bold;">${tInfo.targetName || '-'}</td>
                <td style="width:14%; border:1px solid #000000; padding:6px 6px; background:#f2f2f2; text-align:center; font-weight:bold;">생년월일</td>
                <td style="width:19%; border:1px solid #000000; padding:6px 8px;">${tInfo.birth || '-'}</td>
                <td style="width:14%; border:1px solid #000000; padding:6px 6px; background:#f2f2f2; text-align:center; font-weight:bold;">성 별</td>
                <td style="width:20%; border:1px solid #000000; padding:6px 8px; text-align:center;">
                  <span>${p.gender === '남' ? '■ 남 □ 여' : '□ 남 ■ 여'}</span>
                </td>
              </tr>
              <tr>
                <td style="border:1px solid #000000; padding:6px 6px; background:#f2f2f2; text-align:center; font-weight:bold;">주 소</td>
                <td colspan="3" style="border:1px solid #000000; padding:6px 8px;">${tInfo.address || '-'}</td>
                <td style="border:1px solid #000000; padding:6px 6px; background:#f2f2f2; text-align:center; font-weight:bold;">연락처</td>
                <td style="border:1px solid #000000; padding:6px 8px; text-align:center;">${tInfo.phone || '-'}</td>
              </tr>
              <tr>
                <td style="border:1px solid #000000; padding:6px 6px; background:#f2f2f2; text-align:center; font-weight:bold;">거주지유형</td>
                <td colspan="5" style="border:1px solid #000000; padding:6px 8px; font-size:10.5px; line-height:1.5;">
                  ${housingBoxesHtml}
                </td>
              </tr>
            </table>

            <!-- 2. 문항 위험자 판단도구 테이블 (10대 문항 전체) -->
            <div style="font-size:12px; font-weight:bold; color:#000000; margin-bottom:4px;">
              2. 고독사 위험도 판단 문항 (10대 문항)
            </div>
            <table style="width:100%; border-collapse:collapse; table-layout:fixed; border:1px solid #000000; margin-bottom:0; font-size:11px; color:#000000;">
              <thead>
                <tr>
                  <th style="width:74%; border:1px solid #000000; padding:6px 8px; background:#f2f2f2; text-align:center; font-weight:bold; font-size:11.5px;">질문 내용 (10대 문항)</th>
                  <th style="width:26%; border:1px solid #000000; padding:6px 8px; background:#f2f2f2; text-align:center; font-weight:bold; font-size:11.5px;">답 변</th>
                </tr>
              </thead>
              <tbody>
                ${questionsHtml}
              </tbody>
              <tfoot>
                <tr style="background:#f2f2f2; font-weight:bold;">
                  <td colspan="2" style="border:1px solid #000000; padding:0; vertical-align:middle;">
                    <div style="display:flex; align-items:center; width:100%;">
                      <div style="width:160px; padding:8px 12px; font-size:12px; border-right:1px solid #000000; box-sizing:border-box;">
                        총점 : <span style="font-size:13.5px; font-weight:bold;">${totalScore}</span> 점
                      </div>
                      <div style="flex:1; text-align:center; font-size:11.5px; padding:8px 12px; display:flex; justify-content:center; align-items:center; gap:24px; white-space:nowrap;">
                        <span>${isRiskGroup ? '■' : '□'} 위험군(6점이상)</span>
                        <span>${!isRiskGroup ? '■' : '□'} 일반군</span>
                      </div>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- 하단 보고 및 서명 영역 (A4 최하단 고정 안착) -->
          <div style="margin-top:auto; flex-shrink:0;">
            ${signaturesHtml}
          </div>

        </div>
      </div>
    `;

    await this.exportA4PageToPdf(pageHtml, fileName);
  }

  /**
   * [4번 서식] 개인정보 수집·이용 및 제공 동의서 독립 A4 1장 흑백 공문서 서식
   */
  static async exportConsentToPdf(surveyData, customFileName = '') {
    if (!surveyData) {
      alert('다운로드할 조사 데이터가 없습니다.');
      return;
    }

    const b = surveyData.basicInfo || {};
    const p = surveyData.profile || {};
    const g = p.guardian || {};
    const consent = surveyData.consent || {};

    const dateStr = (b.inspectionDate || getLocalTodayString());
    const koreanDateStr = formatKoreanDate(b.inspectionDate);
    const tInfo = resolveTargetDisplayInfo(surveyData);
    const inspectors = resolveInspectors(surveyData);

    const fileName = customFileName || `[${tInfo.caseUid || 'C-미지정'}]_개인정보_동의서_${tInfo.targetName}_${dateStr.replace(/-/g, '')}.pdf`;

    const targetSig = consent.targetSignature || consent.proxySignature;
    const isProxy = g.isProxySigner === true;
    const isAgreeCollect = consent.agreeCollect !== false;
    const isAgreeThird = consent.agreeThirdParty !== false;

    const signaturesHtml = buildBlackAndWhiteSignaturesHtml(inspectors, consent.inspectorSignatures, koreanDateStr);

    const pageHtml = `
      <div class="pdf-page" style="width:730px; height:1060px; max-height:1060px; overflow:hidden; margin:0 auto; padding:18px 22px; box-sizing:border-box; color:#000000; font-family:'Pretendard', 'Malgun Gothic', sans-serif; background:#ffffff; position:relative;">
        <div style="border:2px solid #000000; padding:22px 20px 18px 20px; background:#ffffff; box-sizing:border-box; min-height:980px; display:flex; flex-direction:column; justify-content:flex-start; gap:16px;">
          
          <div style="width:100%;">
            <!-- 상단 헤더 (박스 안 상단 여유 확보) -->
            <div style="margin-top:4px; margin-bottom:14px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:6px;">
                <div style="font-size:11.5px; color:#000000;">${b.orgName || '통합돌봄센터'} | ${b.project || '고독사예방게이트키퍼'}</div>
                <div style="font-size:11.5px; color:#000000;"><strong>관리번호:</strong> ${tInfo.caseUid || '-'}</div>
              </div>
              <div style="text-align:center; font-size:22px; font-weight:800; letter-spacing:1.5px; color:#000000; border-bottom:2px solid #000000; padding-bottom:8px; margin-top:6px;">
                개인정보 수집·이용 및 제3자 제공 동의서
              </div>
            </div>

            <div style="font-size:11.5px; line-height:1.6; color:#000000; margin-bottom:22px; border:1px solid #000000; padding:12px 14px; background:#fafafa;">
              본 동의서는 「개인정보 보호법」 등 관련 법령에 따라 고독사 예방 및 안부확인, 위기상황 점검 지원 서비스를 제공하기 위해 대상자의 개인정보를 수집·이용 및 제3자 제공하는 것에 대한 동의를 구하는 서식입니다.
            </div>

            <!-- 1. 대상자 인적사항 테이블 -->
            <table style="width:100%; border-collapse:collapse; table-layout:fixed; border:1px solid #000000; margin-bottom:24px; font-size:11.5px; color:#000000;">
              <tr>
                <td style="width:13%; border:1px solid #000000; padding:12px 6px; background:#f2f2f2; text-align:center; font-weight:bold;">성 명</td>
                <td style="width:20%; border:1px solid #000000; padding:12px 8px; font-weight:bold;">${tInfo.targetName}</td>
                <td style="width:14%; border:1px solid #000000; padding:12px 6px; background:#f2f2f2; text-align:center; font-weight:bold;">생년월일</td>
                <td style="width:19%; border:1px solid #000000; padding:12px 8px;">${tInfo.birth || '-'}</td>
                <td style="width:14%; border:1px solid #000000; padding:12px 6px; background:#f2f2f2; text-align:center; font-weight:bold;">성 별</td>
                <td style="width:20%; border:1px solid #000000; padding:12px 8px; text-align:center;">
                  <span>${p.gender === '남' ? '■ 남 □ 여' : '□ 남 ■ 여'}</span>
                </td>
              </tr>
              <tr>
                <td style="border:1px solid #000000; padding:12px 6px; background:#f2f2f2; text-align:center; font-weight:bold;">주 소</td>
                <td colspan="3" style="border:1px solid #000000; padding:12px 8px;">${tInfo.address || '-'}</td>
                <td style="border:1px solid #000000; padding:12px 6px; background:#f2f2f2; text-align:center; font-weight:bold;">연락처</td>
                <td style="border:1px solid #000000; padding:12px 8px; text-align:center;">${tInfo.phone || '-'}</td>
              </tr>
              ${isProxy ? `
              <tr>
                <td style="border:1px solid #000000; padding:12px 6px; background:#f2f2f2; text-align:center; font-weight:bold;">대리인 정보</td>
                <td colspan="5" style="border:1px solid #000000; padding:12px 8px;">
                  성명: <strong>${tInfo.guardianName || '보호자'}</strong> (관계: ${g.relation || '가족'}), 연락처: ${tInfo.guardianPhone || '-'}
                </td>
              </tr>
              ` : ''}
            </table>

            <!-- 2. 개인정보 수집·이용 동의 -->
            <div style="font-size:12.5px; font-weight:bold; color:#000000; margin-bottom:8px;">
              1. 개인정보 수집·이용에 관한 사항
            </div>
            <table style="width:100%; border-collapse:collapse; table-layout:fixed; border:1px solid #000000; margin-bottom:24px; font-size:11px; color:#000000;">
              <thead>
                <tr style="background:#f2f2f2; font-weight:bold; text-align:center;">
                  <th style="width:15%; border:1px solid #000000; padding:9px 4px;">구 분</th>
                  <th style="width:25%; border:1px solid #000000; padding:9px 4px;">수집·이용 목적</th>
                  <th style="width:32%; border:1px solid #000000; padding:9px 4px;">수집 항목</th>
                  <th style="width:14%; border:1px solid #000000; padding:9px 4px;">보유기간</th>
                  <th style="width:14%; border:1px solid #000000; padding:9px 4px;">동의여부</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="border:1px solid #000000; padding:13.5px 4px; text-align:center; font-weight:bold;">필수정보</td>
                  <td style="border:1px solid #000000; padding:13.5px 8px; line-height:1.45;">고독사 예방 안부확인, 위기상황 점검 및 맞춤 복지 지원</td>
                  <td style="border:1px solid #000000; padding:13.5px 8px; line-height:1.45;">성명, 생년월일, 성별, 주소, 연락처, 보호자 정보, 위기도 판정</td>
                  <td style="border:1px solid #000000; padding:13.5px 4px; text-align:center;">사업 종료 후 5년</td>
                  <td style="border:1px solid #000000; padding:13.5px 4px; text-align:center; font-weight:bold; line-height:1.6;">
                    <div>${isAgreeCollect ? '■' : '□'} 동의함</div>
                    <div>${!isAgreeCollect ? '■' : '□'} 거부함</div>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- 3. 개인정보 제3자 제공 동의 -->
            <div style="font-size:12.5px; font-weight:bold; color:#000000; margin-bottom:8px;">
              2. 개인정보의 제3자 제공에 관한 사항
            </div>
            <table style="width:100%; border-collapse:collapse; table-layout:fixed; border:1px solid #000000; margin-bottom:22px; font-size:11px; color:#000000;">
              <thead>
                <tr style="background:#f2f2f2; font-weight:bold; text-align:center;">
                  <th style="width:20%; border:1px solid #000000; padding:9px 4px;">제공받는 기관</th>
                  <th style="width:25%; border:1px solid #000000; padding:9px 4px;">제공 목적</th>
                  <th style="width:27%; border:1px solid #000000; padding:9px 4px;">제공 항목</th>
                  <th style="width:14%; border:1px solid #000000; padding:9px 4px;">보유기간</th>
                  <th style="width:14%; border:1px solid #000000; padding:9px 4px;">동의여부</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="border:1px solid #000000; padding:13.5px 8px; line-height:1.45;">보건복지부, 관할 지자체 및 연계 복지기관</td>
                  <td style="border:1px solid #000000; padding:13.5px 8px; line-height:1.45;">맞춤형 복지서비스 연계 및 긴급구호·안부 지원</td>
                  <td style="border:1px solid #000000; padding:13.5px 8px; line-height:1.45;">성명, 연락처, 주소, 위험도 점검 결과</td>
                  <td style="border:1px solid #000000; padding:13.5px 4px; text-align:center;">제공 목적 달성 시</td>
                  <td style="border:1px solid #000000; padding:13.5px 4px; text-align:center; font-weight:bold; line-height:1.6;">
                    <div>${isAgreeThird ? '■' : '□'} 동의함</div>
                    <div>${!isAgreeThird ? '■' : '□'} 거부함</div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div style="font-size:11px; color:#444444; line-height:1.65; margin-bottom:22px;">
              ※ 귀하는 개인정보 수집·이용 및 제3자 제공에 대한 동의를 거부할 권리가 있습니다. 단, 필수정보 수집에 동의하지 않을 경우 맞춤형 안부살핌 및 긴급 복지 지원 서비스 제공이 제한될 수 있습니다.
            </div>

            <!-- 동의자 서명란 -->
            <div style="display:flex; justify-content:flex-end; align-items:center; gap:14px; padding:13px 18px; border:1px solid #000000; background:#ffffff; margin-bottom:20px;">
              <div style="font-size:12.5px; font-weight:bold; color:#000000;">
                동의자 (${isProxy ? `대리인: ${tInfo.guardianName || '보호자'}` : `본인: ${tInfo.targetName}`})
              </div>
              <div style="width:110px; height:42px; border:1px solid #000000; display:flex; align-items:center; justify-content:center; background:#ffffff;">
                ${targetSig ? `<img src="${targetSig}" style="max-height:36px; max-width:100px; object-fit:contain;" alt="동의자 서명">` : '<span style="font-size:11px; color:#666666;">(서명 완료)</span>'}
              </div>
            </div>
          </div>

          <!-- 하단 확인자 서명 영역 -->
          <div style="margin-top:36px;">
            ${signaturesHtml}
          </div>

        </div>
      </div>
    `;

    await this.exportA4PageToPdf(pageHtml, fileName);
  }

  /**
   * C:\Users\user\Desktop\sgds 정통 표준: 749px 기반 S-GDS 다중/단일 페이지 PDF 생성 엔진
   */
  static async exportSgdsContainerToPdf(element, fileName) {
    document.body.appendChild(element);

    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          // [전사 v06 4항] 전자서명 캔버스 이미지 비동기 무결성 보장 (img.onload 대기)
          const imgList = Array.from(element.querySelectorAll('img'));
          await Promise.all(imgList.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise((r) => {
              img.onload = () => r();
              img.onerror = () => r();
            });
          }));

          const html2pdfLib = window.html2pdf || (typeof html2pdf !== 'undefined' ? html2pdf : null);
          if (!html2pdfLib) throw new Error('PDF 출력 모듈을 불러오지 못했습니다.');

          const opt = {
            margin: [10, 5, 5, 5],
            filename: fileName,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
              scale: 2,
              useCORS: true,
              logging: false,
              scrollY: 0
            },
            jsPDF: {
              unit: 'mm',
              format: 'a4',
              orientation: 'portrait',
              encryption: {
                userPassword: '123456',
                ownerPassword: 'WellRiskKeeper-Enterprise-Master-2026',
                userPermissions: ['print']
              }
            }
          };

          await html2pdfLib().from(element).set(opt).save();

          if (document.body.contains(element)) document.body.removeChild(element);
          notifier.toast(`PDF 파일(${fileName}) 다운로드가 완료되었습니다.`, 'success', 2500);
          resolve();
        } catch (err) {
          if (document.body.contains(element)) document.body.removeChild(element);
          console.error('PDF 생성 실패:', err);
          alert(`PDF 다운로드 중 오류가 발생했습니다: ${err.message || err}`);
          reject(err);
        }
      }, 400);
    });
  }

  /**
   * [1번 서식] S-GDS 노인우울척도 15문항 검사지 (C:\Users\user\Desktop\sgds 원본 규격: 1p 검사지 + 2p 동의서 100% 동일 구현)
   */
  static async exportSgdsToPdf(surveyData, customFileName = '') {
    if (!surveyData) {
      alert('다운로드할 조사 데이터가 없습니다.');
      return;
    }

    const b = surveyData.basicInfo || {};
    const p = surveyData.profile || {};
    const ans = surveyData.answers || {};
    const res = surveyData.result || {};

    const koreanDateStr = formatKoreanDate(b.inspectionDate);
    const tInfo = resolveTargetDisplayInfo(surveyData);
    const name = tInfo.targetName || '어르신';
    const area = p.area || '인천 서구';
    const birth = tInfo.birth || '-';
    const age = p.age || tInfo.age || 74;
    const gender = p.gender || '남';
    const tel = tInfo.phone || '-';
    const addr = tInfo.address || '-';
    const living = p.living || '노인단독';
    const economy = p.economy || '일반';
    const health = p.health || '고혈압';
    const extraText = p.extraText || '특이사항 없음';
    const inspectorStr = Array.isArray(b.inspectors) && b.inspectors.length > 0 ? b.inspectors.join(', ') : '담당자';
    const targetSeq = (b.caseUid || tInfo.caseUid || '001').slice(-3);
    const fileName = customFileName || `SGDS_검사지_${name}_${targetSeq}.pdf`;

    const SGDS_QUESTIONS = [
      "현재의 생활에 대체적으로 만족하십니까?",
      "요즘 들어 예전에 비해 활동량이나 의욕이 많이 떨어지셨습니까?",
      "왠지 자신이 헛되이 살고 있다고 느끼십니까?",
      "생활이 지루하게 느껴질 때가 많습니까?",
      "평소에 기분은 상쾌한 편이십니까?",
      "특별한 일이 없는데도 자신에게 불길한 일이 닥칠 것 같아 불안하십니까?",
      "대체로 마음이 즐거우신 편이십니까?",
      "괜히 어르신의 앞날이 절망적이라는 느낌이 자주 드십니까?",
      "바깥에 나가기가 싫고 집에만 있고 싶습니까?",
      "비슷한 나이의 노인들보다 기억력이 더 나쁘다고 느끼십니까?",
      "현재 살아있다는 것이 즐겁게 생각되십니까?",
      "지금의 내 자신이 이제는 아무 일도 할 수 없고 왠지 쓸모없는 사람이라고 느끼십니까?",
      "기력이 좋은 편입니까?",
      "지금 자신의 처지가 아무런 희망도 없다고 느끼십니까?",
      "자신이 다른 사람들의 처지보다 더 못하다고 생각하십니까?"
    ];

    const REVERSE_ITEMS = [1, 5, 7, 11, 13];

    let totalScore = 0;
    const targetScore = res.totalScore !== undefined ? res.totalScore : 12;

    const rowsHtml = SGDS_QUESTIONS.map((qText, idx) => {
      const num = idx + 1;
      const isReverse = REVERSE_ITEMS.includes(num);

      let isDepressed = false;
      if (ans[num] !== undefined) {
        isDepressed = Number(ans[num]) === 1;
      } else {
        isDepressed = num <= targetScore;
      }
      if (isDepressed) totalScore++;

      const isYes = isReverse ? !isDepressed : isDepressed;
      const yesCell = isYes ? '<span style="color:#000; font-weight:bold; font-size:15px;">V</span>' : '';
      const noCell = !isYes ? '<span style="color:#000; font-weight:bold; font-size:15px;">V</span>' : '';

      return `
        <tr id="row_${num}" style="height: 33px;">
          <td style="border: 1px solid #a6a6a6; padding: 6.5px 2px; text-align: center; font-size: 12px; font-weight: bold;">${num}</td>
          <td style="border: 1px solid #a6a6a6; padding: 6.5px 8px; text-align: left; font-size: 12px;">${qText}</td>
          <td style="border: 1px solid #a6a6a6; padding: 6.5px 2px; text-align: center; font-size: 12px;">${yesCell}</td>
          <td style="border: 1px solid #a6a6a6; padding: 6.5px 2px; text-align: center; font-size: 12px;">${noCell}</td>
        </tr>
      `;
    }).join('');

    const finalScore = res.totalScore !== undefined ? res.totalScore : totalScore;

    const element = document.createElement('div');
    element.style.width = "730px";
    element.style.margin = "0 auto";
    element.style.backgroundColor = "#ffffff";
    element.style.boxSizing = "border-box";
    element.style.padding = "2mm 0mm";

    const infoTbl = `
      <table class="pdf-table" style="width: 100%; table-layout: fixed; border-collapse: collapse; border: 1px solid #000; font-size: 12px; margin-bottom: 12px;">
        <colgroup>
          <col style="width: 90px;">  <col style="width: 160px;"> <col style="width: 90px;">  <col style="width: 100px;"> <col style="width: 90px;">  <col style="width: 200px;">
        </colgroup>
        <tr>
          <td class="pdf-label" style="border: 1px solid #000; height: 31px; background: #f2f2f2; font-weight: bold; text-align: center;">거주구</td>
          <td style="border: 1px solid #000; padding-left: 5px;">${area}</td>
          <td class="pdf-label" style="border: 1px solid #000; background: #f2f2f2; font-weight: bold; text-align: center;">이름</td>
          <td colspan="3" style="border: 1px solid #000; padding-left: 5px; font-weight: bold;">${name}</td>
        </tr>
        <tr>
          <td class="pdf-label" style="border: 1px solid #000; height: 31px; background: #f2f2f2; font-weight: bold; text-align: center;">생년월일</td>
          <td style="border: 1px solid #000; padding-left: 5px;">${birth} (${age}세)</td>
          <td class="pdf-label" style="border: 1px solid #000; background: #f2f2f2; font-weight: bold; text-align: center;">성별</td>
          <td style="border: 1px solid #000; text-align: center;">${gender}</td>
          <td class="pdf-label" style="border: 1px solid #000; background: #f2f2f2; font-weight: bold; text-align: center;">연락처</td>
          <td style="border: 1px solid #000; padding-left: 5px;">${tel}</td>
        </tr>
        <tr>
          <td class="pdf-label" style="border: 1px solid #000; height: 31px; background: #f2f2f2; font-weight: bold; text-align: center;">주소</td>
          <td colspan="5" style="border: 1px solid #000; padding-left: 5px;">${addr}</td>
        </tr>
        <tr>
          <td class="pdf-label" style="border: 1px solid #000; height: 31px; background: #f2f2f2; font-weight: bold; text-align: center;">동거형태</td>
          <td style="border: 1px solid #000; padding-left: 5px;">${living}</td>
          <td class="pdf-label" style="border: 1px solid #000; background: #f2f2f2; font-weight: bold; text-align: center;">생활형태</td>
          <td style="border: 1px solid #000; text-align: center;">${economy}</td>
          <td class="pdf-label" style="border: 1px solid #000; background: #f2f2f2; font-weight: bold; text-align: center;">신체상태</td>
          <td style="border: 1px solid #000; padding-left: 5px;">${health}</td>
        </tr>
        <tr>
          <td class="pdf-label" style="border: 1px solid #000; height: 40px; background: #f2f2f2; font-weight: bold; text-align: center;">추가정보</td>
          <td colspan="5" style="border: 1px solid #000; padding-left: 5px; vertical-align: top;">${extraText}</td>
        </tr>
      </table>
    `;

    element.innerHTML = `
      <div id="pdf_gds_area" style="width: 730px; box-sizing: border-box; margin: 0 auto; color: #000000; font-family: 'Malgun Gothic', 'Pretendard', sans-serif;">
        <div id="pdf_header_info_wrap">${infoTbl}</div>
        <div style="border-bottom: 2px solid #000; margin-bottom: 10px; padding-bottom: 6px;">
          <h1 style="font-size: 19px; margin-bottom: 4px; font-weight: bold; color: #000;">노인우울척도 단축형(S-GDS)</h1>
          <p style="font-size: 11.5px; margin: 0; color: #000; line-height: 1.4;">
            다음 각 문항을 대상노인에게 설명하고 대상노인의 대답에 따라 정확하게 『예 / 아니오』 에 동그라미 해 주십시오.(추가적으로 기록할 사항이 있으면 추가정보란에 기록해 주십시오)
          </p>
        </div>
        <table class="gds-table" id="gds_table" style="width: 100% !important; border-collapse: collapse; margin-top: 6px; font-size: 12px; table-layout: fixed; word-break: break-all;">
          <colgroup>
            <col style="width: 10%;">
            <col style="width: 70%;">
            <col style="width: 10%;">
            <col style="width: 10%;">
          </colgroup>
          <thead>
            <tr style="background: #f2f2f2; height: 30px;">
              <th style="border: 1px solid #a6a6a6; padding: 6px 2px; text-align: center;">번호</th>
              <th style="border: 1px solid #a6a6a6; padding: 6px 4px; text-align: center;">질문</th>
              <th style="border: 1px solid #a6a6a6; padding: 6px 2px; text-align: center;">예</th>
              <th style="border: 1px solid #a6a6a6; padding: 6px 2px; text-align: center;">아니오</th>
            </tr>
          </thead>
          <tbody id="gds_body">
            ${rowsHtml}
          </tbody>
        </table>
        <div style="border: 1.5px solid #000; padding: 14px 18px; margin-top: 20px; display: flex; justify-content: center; align-items: center; gap: 24px; font-size: 14px;">
          <span style="font-weight: bold; color: #000;">${koreanDateStr}</span>
          <span style="font-weight: bold; color: #000;">조사자: <span>${inspectorStr}</span></span>
          <span style="font-weight: bold; color: #000;">총점: <span id="total_score" style="color: red; font-size: 16px;">${finalScore}</span> 점</span>
        </div>
      </div>
    `;

    await this.exportSgdsContainerToPdf(element, fileName);
  }

  static async exportSgdsConsentToPdf(surveyData, customFileName = '') {
    if (!surveyData) {
      alert('다운로드할 조사 데이터가 없습니다.');
      return;
    }

    const b = surveyData.basicInfo || {};
    const p = surveyData.profile || {};
    const koreanDateStr = formatKoreanDate(b.inspectionDate);
    const tInfo = resolveTargetDisplayInfo(surveyData);
    const name = tInfo.targetName || '어르신';
    const orgName = b.orgName || '인천 서구 통합돌봄센터';
    const targetSeq = (b.caseUid || tInfo.caseUid || '001').slice(-3);
    const fileName = customFileName || `SGDS_동의서_${name}_${targetSeq}.pdf`;

    const element = document.createElement('div');
    element.style.width = "730px";
    element.style.margin = "0 auto";
    element.style.backgroundColor = "#ffffff";
    element.style.boxSizing = "border-box";
    element.style.padding = "2mm 0mm";

    element.innerHTML = `
      <div class="agreement-box" id="pdf_agreement_area" style="border: 1.5px solid #000; padding: 26px 26px; font-size: 12.5px; line-height: 1.6; background: #fff; width: 100%; box-sizing: border-box; margin: 0 auto; color: #000; font-family: 'Malgun Gothic', 'Pretendard', sans-serif;">
        <div style="text-align: center; font-size: 19px; font-weight: bold; margin-bottom: 18px; border-bottom: 2px solid #000; padding-bottom: 8px; color: #000;">개인정보 수집 및 이용 동의서</div>
        <div style="margin-bottom: 12px; font-weight: bold; font-size: 13px;">□ 동의자 성명: <span style="color: #0070C0; text-decoration: underline;">${name}</span></div>
        <p style="margin: 0; text-align: justify; line-height: 1.65;">본 <span style="font-weight: bold; color: #0070C0;">${orgName}</span>은 노인복지법 제39조의5제2항에 의한 업무를 처리함에 있어 원활한 상담, 각종 서비스 등 기본적인 서비스 제공을 위하여 아래와 같은 개인정보를 수집하고 있으며 수집된 개인 정보는 개인정보 보호법에 명기된 관련 법률상의 개인정보보호 규정을 준수하며, 관련법령에 의거하여 학대피해노인의 인권보호에 최선을 다하고 있습니다.</p>
        
        <span style="font-weight: bold; margin-top: 18px; display: block; font-size: 13px;">□ 개인정보 수집 항목</span>
        <span style="padding-left: 10px; display: block; line-height: 1.65;">• 인적사항: 성명, 성별, 주민등록번호, 주소, 연락처, 연령, 동거인, 직업상태, 결혼상태, 교육수준, 생활상태, 건강상태, 일상생활수행정도, 기타 사항 등 노인자살 사례관리에 명기된 항목</span>
        <span style="padding-left: 10px; display: block; line-height: 1.65;">• 관련사항: 노인자살 관련 상담일지, 기타 관련 자료</span>

        <span style="font-weight: bold; margin-top: 18px; display: block; font-size: 13px;">□ 개인정보 수집 및 이용 목적</span>
        <span style="padding-left: 10px; display: block; line-height: 1.65;">• 노인 우울증 여부 판단에 대한 근거</span>
        <span style="padding-left: 10px; display: block; line-height: 1.65;">• 노인자살 해결을 위한 논의자료 및 기관에 권고하는 자료</span>
        <span style="padding-left: 10px; display: block; line-height: 1.65;">• 노인자살예방 결과 및 관련 내용을 관할기관(보건복지부·시)에 보고하는 자료</span>

        <span style="font-weight: bold; margin-top: 18px; display: block; font-size: 13px;">□ 개인정보의 보유 및 이용 기간</span>
        <span style="padding-left: 10px; display: block; line-height: 1.65;">• 상기 내용은 개인정보 보호법을 기준으로 합니다.</span>
        <span style="padding-left: 10px; display: block; line-height: 1.65;">• 상기 개인정보의 이용목적이 소멸된 경우에도 노인자살 관련 정보의 이용목적이 분명한 경우는 개인정보를 보유할 수 있음을 안내하여 드립니다.</span>

        <span style="font-weight: bold; margin-top: 18px; display: block; font-size: 13px;">□ 기타</span>
        <span style="padding-left: 10px; display: block; line-height: 1.65;">※ 상기 내용은 본 기관에서 노인자살 상담 및 서비스 연계 등에 필요한 개인 정보에 해당합니다.</span>
        <span style="padding-left: 10px; display: block; line-height: 1.65;">※ 상기 내용에 대하여 귀하는 동의를 거부하실 권리가 있습니다. 다만 그러한 경우에 원활한 지원이 어려울 수 있음을 알려드립니다.</span>
        <span style="padding-left: 10px; display: block; line-height: 1.65;">※ 본 동의서는 노인자살 관련 사업 진행 및 서비스 연계의 목적 외에는 사용하지 않을 것을 약속드리며 타인에게 공개하거나 유출되지 않을 것임을 알려드립니다.</span>

        <p style="margin-top: 24px; font-weight: bold; text-align: center; font-size: 13px;">본인은 위 내용을 확인하였으며, 위와 같이 “개인정보 보호법”에 명기된 관련 법률에 의거하여 개인정보 수집 및 이용에 동의합니다.</p>
        <table style="width: 100%; border: 1px solid #000; border-collapse: collapse; margin-top: 14px;">
          <tr>
            <td style="padding: 12px; text-align: center; font-size: 13px;">
              개인정보 수집 및 이용에 동의하십니까? &nbsp;&nbsp;<strong>[ V ] 동의</strong> &nbsp;&nbsp;&nbsp;&nbsp; [ &nbsp; ] 동의 안함
            </td>
          </tr>
        </table>
        <div style="text-align: center; font-weight: bold; margin-top: 26px; font-size: 14px;">${koreanDateStr}</div>
        <table style="width: 100%; border: 1px solid #000; border-collapse: collapse; margin-top: 18px;">
          <tr>
            <td style="width: 55%; padding: 12px 14px; border: 1px solid #000; font-size: 13px;">
              동의인: <span style="font-weight: bold;">${name}</span> (서명)
              <div style="margin-top: 10px;">노인과의 관계: <span style="font-weight: bold;">본인</span></div>
            </td>
            <td style="width: 45%; padding: 0; border: 1px solid #000; text-align: center; vertical-align: middle;">
              <div style="font-size: 14px; font-weight: bold; color: #333; padding: 16px 0;">[ 서명 완료 ]</div>
            </td>
          </tr>
        </table>
        <div style="text-align: center; font-size: 20px; font-weight: bold; margin-top: 32px; color: #000;">${orgName}</div>
      </div>
    `;

    await this.exportSgdsContainerToPdf(element, fileName);
  }
}
