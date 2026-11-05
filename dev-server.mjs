import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 8787;
const submittedSurveys = new Map();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Client-Platform, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // 기본 라우팅 (참여기관 관리자 관제 포털 우선)
  if (pathname === '/' || pathname === '') {
    pathname = '/pages/admin.html';
  } else if (pathname === '/admin' || pathname === '/admin.html') {
    pathname = '/pages/admin.html';
  } else if (pathname === '/org-admin' || pathname === '/org-admin.html') {
    pathname = '/pages/org-admin.html';
  } else if (pathname === '/pwa' || pathname === '/pwa-survey.html') {
    pathname = '/pages/pwa-survey.html';
  }

  // API Mock 엔드포인트 처리
  if (pathname.startsWith('/api/v1/')) {
    // 1) 대상자 과거 이력 조회: /api/v1/cases/:caseUid/history
    const historyMatch = pathname.match(/^\/api\/v1\/cases\/([^/]+)\/history$/);
    if (historyMatch && req.method === 'GET') {
      const caseUid = decodeURIComponent(historyMatch[1]);
      const suffix = caseUid.split('-').pop() || '';
      
      // 기제출 저장소 조회 (없을 경우 N1001 등 예시 이력 응답)
      const existing = submittedSurveys.get(caseUid);
      if (existing) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          caseUid,
          isFieldFound: Boolean(suffix.startsWith('N')),
          totalRounds: existing.records.length,
          nextRound: existing.records.length + 1,
          records: existing.records
        }));
        return;
      }

      // 기본 응답: N1001 등 현장 발굴 번호에 대한 이전 이력 모의 데이터 지원
      const isField = suffix.startsWith('N');
      const hasHistory = suffix === 'N1001' || suffix === 'K1001';
      const records = hasHistory ? [
        {
          round: 1,
          date: '2026-11-01',
          time: '14:00 ~ 15:00',
          isConsulted: true,
          unmetReason: '',
          content: '현장 발굴 1차 방문 상담. 주거환경 점검 및 건강상태(양호) 확인 완료. 말벗 및 복지서비스 정보 제공.'
        }
      ] : [];

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        caseUid,
        isFieldFound: isField,
        totalRounds: records.length,
        nextRound: records.length + 1,
        records
      }));
      return;
    }

    // 2) 조사 데이터 저장: /api/v1/surveys/submit
    if (pathname === '/api/v1/surveys/submit' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          const caseUid = payload?.targetProfile?.caseUid || 'UNKNOWN';
          const prev = submittedSurveys.get(caseUid) || { records: [] };
          const curRecord = {
            round: prev.records.length + 1,
            date: payload?.basicInfo?.inspectionDate || new Date().toISOString().slice(0, 10),
            time: `${payload?.activity?.current?.startTime || '10:00'} ~ ${payload?.activity?.current?.endTime || '11:00'}`,
            isConsulted: payload?.activity?.current?.isConsulted !== false,
            unmetReason: payload?.activity?.current?.unmetReason || '',
            content: payload?.monitoring?.detailActivityContent || '방문 상담 완료'
          };
          prev.records.push(curRecord);
          submittedSurveys.set(caseUid, prev);

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: true,
            message: '조사 데이터가 정상 등록되었습니다.',
            caseUid,
            round: curRecord.round,
            timestamp: new Date().toISOString()
          }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, message: '잘못된 요청 본문입니다.' }));
        }
      });
      return;
    }

    // 2-B) D1 참여활동가 목록 조회: /api/v1/participants
    if (pathname === '/api/v1/participants' && req.method === 'GET') {
      const buFilter = parsedUrl.searchParams.get('buCode');
      const bupyeongParticipants = [
        { seq_number: 1, uid: 'U-28-237-01-ME-001', participant_uid: 'U-28-237-01-ME-001', org_uid: 'O-28-237-01', bu_uid: 'B-28-237-01-ME', bu_code: 'ME', bu_name: '식사지원 사업단', name: '박영희', phone: '010-3829-8891', phoneMasked: '010-****-8891', team_code: '1조 (김철수)', team_role: '정', assigned_areas: '부평1동, 부평4동', duty_days: '월, 수, 금', duty_hours: '09:00 ~ 12:00', type: '현장방문', status: '활동중', is_active: 1 },
        { seq_number: 2, uid: 'U-28-237-01-ME-002', participant_uid: 'U-28-237-01-ME-002', org_uid: 'O-28-237-01', bu_uid: 'B-28-237-01-ME', bu_code: 'ME', bu_name: '식사지원 사업단', name: '김철수', phone: '010-9182-0092', phoneMasked: '010-****-0092', team_code: '1조 (박영희)', team_role: '부', assigned_areas: '부평1동, 부평4동', duty_days: '월, 수, 금', duty_hours: '09:00 ~ 12:00', type: '배정·검수', status: '활동중', is_active: 1 },
        { seq_number: 3, uid: 'U-28-237-01-HE-001', participant_uid: 'U-28-237-01-HE-001', org_uid: 'O-28-237-01', bu_uid: 'B-28-237-01-HE', bu_code: 'HE', bu_name: '건강음료 사업단', name: '이순신', phone: '010-5829-3301', phoneMasked: '010-****-3301', team_code: '2조 (강감찬)', team_role: '정', assigned_areas: '삼산1동, 삼산2동', duty_days: '화, 목', duty_hours: '13:00 ~ 16:00', type: '현장방문', status: '활동중', is_active: 1 },
        { seq_number: 4, uid: 'U-28-237-01-HE-002', participant_uid: 'U-28-237-01-HE-002', org_uid: 'O-28-237-01', bu_uid: 'B-28-237-01-HE', bu_code: 'HE', bu_name: '건강음료 사업단', name: '강감찬', phone: '010-8291-9904', phoneMasked: '010-****-9904', team_code: '2조 (이순신)', team_role: '부', assigned_areas: '삼산1동, 삼산2동', duty_days: '화, 목', duty_hours: '13:00 ~ 16:00', type: '배정·검수', status: '활동중', is_active: 1 }
      ];

      const data = buFilter ? bupyeongParticipants.filter(p => p.bu_code === buFilter) : bupyeongParticipants;
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        data,
        total: data.length
      }));
      return;
    }

    // 3) 사업단별 실시간 현장 활동 내역 조회: /api/v1/business-units/:buCode/activities
    const buActMatch = pathname.match(/^\/api\/v1\/business-units\/([^/]+)\/activities$/);
    if (buActMatch && req.method === 'GET') {
      const buCode = decodeURIComponent(buActMatch[1]);
      
      // 기본 시드 활동 내역 데이터 (PWA 실시간 접수와 연동)
      if (!global.activityStore) {
        global.activityStore = [
          {
            id: 'ACT-28-237-01-001',
            buCode: 'ME',
            date: '2026-11-04',
            time: '10:00 ~ 10:45',
            targetUid: 'C-28-237-01-K1001',
            targetName: '김*수',
            targetAge: 74,
            targetGender: '남',
            workerNames: ['박영희', '김철수'],
            activityType: '밑반찬·영양죽 배달 및 식사 확인',
            status: '완료',
            unmetReason: '',
            content: '영양죽 및 주간 밑반찬 전달 완료. 식사 상태 양호하시며 당뇨약 정시 복용 여부 확인.',
            specialNotes: '다음 주 수요일 병원 진료 예정으로 오후 배달 요청하심.',
            isConfirmed: true,
            adminMemo: '관리자 확인 완료 (정시 배달 확인)'
          },
          {
            id: 'ACT-28-237-01-002',
            buCode: 'ME',
            date: '2026-11-04',
            time: '11:10 ~ 11:30',
            targetUid: 'C-28-237-01-K1004',
            targetName: '최*철',
            targetAge: 68,
            targetGender: '남',
            workerNames: ['박영희', '김철수'],
            activityType: '긴급 영양죽 배달',
            status: '상담 불가',
            unmetReason: '대상자 부재 (주간보호센터)',
            content: '현장 방문 시 자택 부재중. 주간보호센터 일정으로 유선 연락하여 안전 확인.',
            specialNotes: '오후 5시 이후 재통화 완료.',
            isConfirmed: false,
            adminMemo: ''
          },
          {
            id: 'ACT-28-237-01-003',
            buCode: 'ME',
            date: '2026-11-02',
            time: '09:30 ~ 10:15',
            targetUid: 'C-28-237-01-K1003',
            targetName: '이*순',
            targetAge: 81,
            targetGender: '여',
            workerNames: ['이순신', '강감찬'],
            activityType: '정기 밑반찬 지원 및 안부 확인',
            status: '완료',
            unmetReason: '',
            content: '밑반찬 3종 전달. 무릎 관절염 통증 호소하시어 파스 제공 및 보건소 연계 안내.',
            specialNotes: '주거환경 환기 상태 점검 완료.',
            isConfirmed: true,
            adminMemo: '확인 완료'
          },
          {
            id: 'ACT-28-237-01-004',
            buCode: 'HE',
            date: '2026-11-04',
            time: '13:30 ~ 14:20',
            targetUid: 'C-28-237-01-K1002',
            targetName: '박*동',
            targetAge: 76,
            targetGender: '남',
            workerNames: ['이순신', '강감찬'],
            activityType: '방문간호 혈압측정 및 복약지도',
            status: '완료',
            unmetReason: '',
            content: '혈압 125/80 측정. 혈당약 정시 복용 중이시며 건강 상태 양호.',
            specialNotes: '치매안심센터 선별검사 예약 완료.',
            isConfirmed: true,
            adminMemo: '전담 간호사 확인 완료'
          },
          {
            id: 'ACT-28-237-01-005',
            buCode: 'CL',
            date: '2026-11-03',
            time: '10:00 ~ 12:30',
            targetUid: 'C-28-237-01-K1004',
            targetName: '최*철',
            targetAge: 68,
            targetGender: '남',
            workerNames: ['박영희', '김철수'],
            activityType: '주거 방역소독 및 특수청소',
            status: '완료',
            unmetReason: '',
            content: '주방 싱크대 해충 방역 및 대형 침구류 세탁 지원.',
            specialNotes: '겨울철 문풍지 및 단열 에어캡 부착 완료.',
            isConfirmed: true,
            adminMemo: '주거개선 사진 증빙 완료'
          },
          {
            id: 'ACT-28-237-01-006',
            buCode: 'EM',
            date: '2026-11-04',
            time: '15:00 ~ 15:40',
            targetUid: 'C-28-237-01-K1005',
            targetName: '정*자',
            targetAge: 79,
            targetGender: '여',
            workerNames: ['박영희', '이순신'],
            activityType: '1:1 안심이웃 말벗 방문상담',
            status: '완료',
            unmetReason: '',
            content: '우울감 호소 경청 및 말벗 상담. 돌봄스피커 음량 및 연결 상태 점검.',
            specialNotes: '노인복지관 노래교실 프로그램 안내.',
            isConfirmed: false,
            adminMemo: ''
          }
        ];
      }

      let list = global.activityStore;
      if (buCode !== 'all') {
        list = list.filter(a => a.buCode === buCode);
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        buCode,
        total: list.length,
        activities: list
      }));
      return;
    }

    // 3-B) 사업단 신규 활동 및 방문 일정 등록: POST /api/v1/business-units/:buCode/activities
    if (buActMatch && req.method === 'POST') {
      const buCode = decodeURIComponent(buActMatch[1]);
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const actData = JSON.parse(body || '{}');
          if (!global.activityStore) global.activityStore = [];

          // 계층형 UID 생성: ACT-28-237-01-XXXX
          const seq = global.activityStore.length + 1;
          const actId = actData.id || `ACT-28-237-01-${String(seq).padStart(4, '0')}`;

          const newActivity = {
            id: actId,
            activity_uid: actId,
            org_uid: 'O-28-237-01',
            buCode: buCode || actData.buCode || 'ME',
            bu_code: buCode || actData.buCode || 'ME',
            targetUid: actData.targetUid || actData.caseUid || 'C-28-237-01-K1001',
            case_uid: actData.targetUid || actData.caseUid || 'C-28-237-01-K1001',
            targetName: actData.targetName || '대상자',
            targetAge: actData.targetAge || 74,
            targetGender: actData.targetGender || '남',
            date: actData.date || new Date().toISOString().slice(0, 10),
            activity_date: actData.date || new Date().toISOString().slice(0, 10),
            time: actData.time || '10:00 ~ 11:00',
            start_time: (actData.time || '10:00').split('~')[0].trim(),
            end_time: (actData.time || '11:00').split('~')[1]?.trim() || '11:00',
            workerNames: Array.isArray(actData.workerNames) ? actData.workerNames : [actData.worker || '박영희, 김철수'],
            activityType: actData.activityType || '정례 사업단 지원 서비스',
            status: actData.status || '예정',
            unmetReason: actData.unmetReason || '',
            content: actData.content || actData.memo || '',
            specialNotes: actData.specialNotes || '',
            isConfirmed: false,
            adminMemo: ''
          };

          global.activityStore.unshift(newActivity);

          console.log(`[D1 Master] 신규 사업단 활동 일정 등록 완료 [${actId}] 대상자: ${newActivity.targetName} (${newActivity.buCode})`);

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: true,
            message: '사업단 일정이 D1 원장에 성공적으로 등록되었습니다.',
            activity: newActivity
          }));
        } catch (e) {
          console.error('[dev-server POST activity error]:', e);
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, message: e.message || '잘못된 요청 규격입니다.' }));
        }
      });
      return;
    }

    // 4) 활동 확인 상태 업데이트: /api/v1/activities/:id
    const actUpdateMatch = pathname.match(/^\/api\/v1\/activities\/([^/]+)$/);
    if (actUpdateMatch && req.method === 'PUT') {
      const actId = decodeURIComponent(actUpdateMatch[1]);
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const updateData = JSON.parse(body || '{}');
          const target = (global.activityStore || []).find(a => a.id === actId);
          if (target) {
            if (updateData.isConfirmed !== undefined) target.isConfirmed = updateData.isConfirmed;
            if (updateData.adminMemo !== undefined) target.adminMemo = updateData.adminMemo;
            if (updateData.status !== undefined) target.status = updateData.status;
          }
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: true,
            message: '활동 확인 상태가 저장되었습니다.',
            activity: target || null
          }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, message: '잘못된 요청입니다.' }));
        }
      });
      return;
    }

    // 4-B) 활동 일정 삭제: DELETE /api/v1/activities/:id
    if (actUpdateMatch && req.method === 'DELETE') {
      const actId = decodeURIComponent(actUpdateMatch[1]);
      if (global.activityStore) {
        const idx = global.activityStore.findIndex(a => a.id === actId);
        if (idx !== -1) {
          global.activityStore.splice(idx, 1);
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        message: '활동 일정이 삭제되었습니다.',
        id: actId
      }));
      return;
    }

    // 5) 수혜 대상자별 전체 통합 일정 조회: GET /api/v1/cases/:caseUid/schedules
    const caseSchedMatch = pathname.match(/^\/api\/v1\/cases\/([^/]+)\/schedules$/);
    if (caseSchedMatch && req.method === 'GET') {
      const caseUid = decodeURIComponent(caseSchedMatch[1]);
      const list = (global.activityStore || []).filter(a => a.targetUid === caseUid || a.case_uid === caseUid);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        caseUid,
        total: list.length,
        schedules: list
      }));
      return;
    }

    // 6) 수혜자 관리카드 안부확인 원장 저장: POST /api/v1/monitoring-cards
    if (pathname === '/api/v1/monitoring-cards' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const cardData = JSON.parse(body || '{}');
          if (!global.monitoringCardStore) global.monitoringCardStore = [];

          global.monitoringCardStore.unshift(cardData);

          // 만약 차기 예정일과 연계 사업단(buCode)이 지정된 경우, D1 bu_activities에도 예정 일정으로 자동 동시 적재
          if (cardData.nextDate && cardData.buCode && cardData.buCode !== 'NONE') {
            if (!global.activityStore) global.activityStore = [];
            const seq = global.activityStore.length + 1;
            const actId = `ACT-28-237-01-${String(seq).padStart(4, '0')}`;
            const autoActivity = {
              id: actId,
              activity_uid: actId,
              org_uid: 'O-28-237-01',
              buCode: cardData.buCode,
              bu_code: cardData.buCode,
              targetUid: cardData.caseUid,
              case_uid: cardData.caseUid,
              targetName: cardData.targetName || '대상 어르신',
              targetAge: cardData.targetAge || 74,
              targetGender: cardData.targetGender || '남',
              date: cardData.nextDate,
              activity_date: cardData.nextDate,
              time: cardData.nextTime || '10:00 ~ 11:00',
              start_time: (cardData.nextTime || '10:00').split('~')[0].trim(),
              end_time: (cardData.nextTime || '11:00').split('~')[1]?.trim() || '11:00',
              workerNames: [cardData.inspector || '김조사, 박살핌'],
              activityType: `${cardData.buCode} 사업단 맞춤 서비스`,
              status: '예정',
              unmetReason: '',
              content: cardData.nextMemo || '수혜자 관리카드 차기 일정 세팅 연동',
              specialNotes: `건강: [${cardData.healthCheck || '양호'}], 심리: [${cardData.psychoCheck || '안정'}]`,
              isConfirmed: false,
              adminMemo: '수혜자관리카드 자동 연동'
            };
            global.activityStore.unshift(autoActivity);
            console.log(`[D1 Master] 관리카드 세팅 ➔ 사업단 활동 자동 등록 [${actId}] (${cardData.buCode})`);
          }

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: true,
            message: '수혜자 관리카드 및 차기 일정이 D1 원장에 저장되었습니다.',
            cardUid: cardData.cardUid
          }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, message: '잘못된 요청입니다.' }));
        }
      });
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      message: 'Bupyeong CareSafe API Gateway OK',
      endpoint: pathname,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // 만족도 조사 제출 API: /api/satisfaction/submit
  if (pathname === '/api/satisfaction/submit' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const surveyData = JSON.parse(body);
        const recordId = `SAT-${Date.now()}`;
        console.log(`[Bupyeong-CareSafe] 만족도 조사 수신 완료 [${recordId}]:`, surveyData.basicInfo?.targetName);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          message: '만족도 조사가 성공적으로 제출되었습니다.',
          recordId,
          timestamp: new Date().toISOString()
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: '잘못된 JSON 형식입니다.' }));
      }
    });
    return;
  }

  // 정적 파일 서빙
  const filePath = path.join(__dirname, pathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found: ${pathname}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`[Bupyeong-CareSafe] 개발 서버 가동 중: http://localhost:${PORT}`);
  console.log(`- 현장 모바일 PWA: http://localhost:${PORT}/pages/pwa-survey.html`);
  console.log(`- 참여기관 관리자: http://localhost:${PORT}/pages/org-admin.html`);
});
