/**
 * @file constants.js
 * @description 전역 시스템 상수, 점수 배점, 등급 기준, 복지부 11대 위기분류 코드
 */

export const SYSTEM_META = {
  APP_NAME: 'WellRiskKeeper',
  VERSION: '2.0.0-ESM',
  MAX_SCORE: 13,
  TOTAL_QUESTIONS: 10
};

export const BU_CODES = {
  ME: { code: 'ME', name: '식사지원 사업단', color: '#2c5082' },
  HE: { code: 'HE', name: '건강의료 사업단', color: '#1b3250' },
  CL: { code: 'CL', name: '주거환경개선 사업단', color: '#3b6699' },
  EM: { code: 'EM', name: '정서·이웃연결단', color: '#0d1b2a' }
};

export const RISK_GRADES = {
  CRITICAL: {
    id: 'critical',
    label: '초고위험 (즉시개입)',
    minScore: 7,
    pillClass: 'grade-pill critical',
    desc: '24시간 집중 안심 관제 및 4대 사업단 전면 즉시 출동'
  },
  HIGH: {
    id: 'high',
    label: '고위험군',
    minScore: 4,
    pillClass: 'grade-pill high',
    desc: '주 2~3회 방문 안부 확인 및 2~3개 복합 사업단 맞춤 개입'
  },
  MID: {
    id: 'mid',
    label: '중위험군',
    minScore: 2,
    pillClass: 'grade-pill mid',
    desc: '주 1회 정기 안부 확인 및 단일 사업단 연계'
  },
  CLEAN: {
    id: 'clean',
    label: '정상 (저위험)',
    minScore: 0,
    pillClass: 'grade-pill clean',
    desc: '월 1~2회 일상 모니터링 및 자조모임 연결'
  }
};

export const MOHW_CATEGORIES = {
  LIVELIHOOD: { code: 'MOHW-01-LIVELIHOOD', name: '생계 지원', desc: '식비, 주거비, 공과금 지원 등' },
  CARE:       { code: 'MOHW-02-CARE',       name: '돌봄·보호', desc: '간병, 시설보호, 주야간 보호 등' },
  HEALTH:     { code: 'MOHW-03-HEALTH',     name: '건강·의료', desc: '질병, 진단·치료, 임신·출산 등' },
  DAILY:      { code: 'MOHW-04-DAILY',      name: '일상생활', desc: '가사·식사·이동·위생지원 등' },
  SAFETY:     { code: 'MOHW-05-SAFETY',     name: '안전위기', desc: '폭력, 학대, 자해 등' },
  HOUSING:    { code: 'MOHW-06-HOUSING',    name: '주거지원', desc: '거처마련, 주거환경 개선 등' },
  JOB:        { code: 'MOHW-07-JOB',        name: '일자리',   desc: '구직, 자활, 직업능력개발 등' },
  CHILD:      { code: 'MOHW-08-CHILD',      name: '아동지원', desc: '돌봄, 양육상담, 보육·교육 등' },
  FINANCE:    { code: 'MOHW-09-FINANCE',    name: '채무·법률', desc: '채무·법률 상담 등' },
  ISOLATION:  { code: 'MOHW-10-ISOLATION',  name: '고립·고독', desc: '사회적 고립, 고독사 예방 등' },
  OTHER:      { code: 'MOHW-11-OTHER',      name: '기타',     desc: '직접 입력' }
};

/**
 * 복지부 공식 공문서 양식 기준 10종 거주지 유형 칩 목록
 */
export const HOUSING_TYPES = [
  '단독주택',
  '다가구·다세대주택',
  '아파트',
  '연립주택',
  '오피스텔',
  '고시원(텔)',
  '원룸',
  '쪽방',
  '여관·모텔',
  '직접기재'
];

/**
 * [5. 관찰 기록지] 복지부 공문서 6대 현장 외부 관찰 항목
 */
export const OUTDOOR_OBSERVATION_QUESTIONS = [
  { id: 'mailAccumulated', text: '집 앞에 우편물, 독촉장 등 우편물이 쌓여 있다.' },
  { id: 'odorInsects', text: '집 주변에 악취가 나고, 벌레 등이 보인다.' },
  { id: 'trashBottles', text: '집 주변에 쓰레기 또는 술병이 많이 보인다.' },
  { id: 'tvLightOn', text: '인기척이 없으나, 계속해서 텔레비전이 켜져 있거나, 불이 켜져 있다.' },
  { id: 'isolatedLiving', text: '밖에 나오지 않고 혼자만 지낸다. 외출한 모습을 본적이 없다고 한다.' },
  { id: 'contactLost', text: '자주 마주치던 곳에서 보이지 않거나, 갑자기 연락이 안된다.' }
];
export const OBSERVATION_QUESTIONS = OUTDOOR_OBSERVATION_QUESTIONS; // 하위 호환성 유지

/**
 * [6. 가정방문 기록지] 복지부 공문서 4대 실내 환경 관찰 항목
 */
export const INDOOR_OBSERVATION_QUESTIONS = [
  { id: 'indoorBottles', text: '집 주변 또는 실내에 술병이 많이 보인다.', type: 'binary' },
  { id: 'indoorTrashExcrement', text: '집 실내에 음식·쓰레기·배설물이 방치되어 있다.', type: 'binary' },
  { id: 'indoorMealCondition', text: '냉장고, 주방 등을 볼 때 식사를 제대로 하지 않는 것 같다.', type: 'scale3', options: ['양호', '불량', '심각'] },
  { id: 'indoorHygieneCondition', text: '더러운 옷을 입고 있거나, 한동안 세면·목욕을 하지 않은 듯하다.', type: 'scale3', options: ['양호', '불량', '심각'] }
];

/**
 * [실내 관찰 ➔ 10대 문항 대화] 사전 연결(Context Pre-linking) 트리거 브릿지
 */
export const INDOOR_CONTEXT_BRIDGES = {
  indoorMealCondition: {
    targetQuestions: [1],
    triggerCondition: (val) => val === '불량' || val === '심각',
    bridgeText: '어르신, 주방을 살짝 보니 혼자서 끼니 챙겨 드시기가 많이 버거우셨던 것 같아요. 요즘 식사는 어떻게 챙겨 드셨어요?'
  },
  indoorBottles: {
    targetQuestions: [2],
    triggerCondition: (val) => val === true,
    bridgeText: '어르신, 방 한편에 술병이 조금 보이는데... 혹시 몸이 쑤시거나 잠이 안 와서 약주를 한 잔씩 드시게 되신 건가요?'
  },
  indoorHygieneCondition: {
    targetQuestions: [7, 8],
    triggerCondition: (val) => val === '불량' || val === '심각',
    bridgeText: '어르신, 몸이 많이 편찮으셔서 옷 갈아입으시거나 씻는 것도 힘에 부치셨지요? 어디가 제일 불편하세요?'
  },
  indoorTrashExcrement: {
    targetQuestions: [8],
    triggerCondition: (val) => val === true,
    bridgeText: '혼자 계시다 보면 집안 치우는 게 참 큰일이죠. 몸이 아파서 치우기 힘드셨던 건지, 아니면 물건을 버리기가 어려우셨어요?'
  }
};


