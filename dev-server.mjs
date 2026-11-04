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
