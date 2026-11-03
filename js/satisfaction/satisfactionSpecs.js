/**
 * @file satisfactionSpecs.js
 * @description 「2026년 부평형 지역사회 통합돌봄서비스」 이용자 만족도 조사 공식 문항 및 선택지 정본 명세
 */

export const SATISFACTION_SPEC = {
  title: '2026년 부평형 지역사회 통합돌봄서비스 이용자 만족도 조사',
  
  // 부평구 22개 행정동 목록
  dongList: [
    '부평1동', '부평2동', '부평3동', '부평4동', '부평5동', '부평6동',
    '산곡1동', '산곡2동', '산곡3동', '산곡4동',
    '청천1동', '청천2동',
    '갈산1동', '갈산2동',
    '삼산1동', '삼산2동',
    '부개1동', '부개2동', '부개3동',
    '일신동', '십정1동', '십정2동'
  ],

  // Ⅱ. 조사 기본정보 (대상자 특성) 선택지
  profileOptions: {
    genders: ['남', '여'],
    ageRanges: ['65세 미만', '65~74세', '75세 이상'],
    livingArrangements: ['독거', '부부', '성인자녀 동거', '기타 가족동거', '기타'],
    socialSecurities: ['기초생활수급자', '차상위', '기초연금', '일반', '기타'],
    targetCharacteristics: ['장기요양 재가급여자', '장애인활동보조 수급자', '해당없음']
  },

  // Ⅲ. 서비스 이용 만족도 (문항 1~8)
  serviceExperience: {
    // 1번 문항: 이용 경로
    q1: {
      id: 1,
      code: 'inflow_route',
      title: '1. (이용 경로) 귀하는 의료·요양 통합돌봄 사업을 어떻게 알고 이용하게 되셨습니까?',
      options: ['지인추천', '공무원 안내', '홍보물', '언론', '기타']
    },

    // 리커트 5점 척도 공통 라벨
    likertScale: [
      { score: 1, label: '전혀 그렇지 않다', badge: '1점', desc: '매우 불만족' },
      { score: 2, label: '그렇지 않다', badge: '2점', desc: '불만족' },
      { score: 3, label: '보통', badge: '3점', desc: '보통' },
      { score: 4, label: '그렇다', badge: '4점', desc: '만족' },
      { score: 5, label: '매우 그렇다', badge: '5점', desc: '매우 만족' }
    ],

    // 2~8번 리커트 문항
    likertQuestions: [
      { id: 2, code: 'accessibility', category: '접근성', title: '2. (접근성) 신청·이용 절차가 이해하기 쉽고 편리하였습니까?' },
      { id: 3, code: 'timeliness', category: '적시성', title: '3. (적시성) 필요한 서비스를 적절한 시기에 잘 연계받았습니까?' },
      { id: 4, code: 'suitability', category: '적합성', title: '4. (적합성) 제공받은 서비스 내용에 만족하십니까?' },
      { id: 5, code: 'effectiveness', category: '효과성', title: '5. (효과성) 서비스가 실제 생활에 도움이 되었습니까?' },
      { id: 6, code: 'quality', category: '서비스 품질', title: '6. (서비스 품질) 서비스 제공자(제공기관)는 귀하의 상황을 이해하고 적절한 서비스를 제공하였습니까?' },
      { id: 7, code: 'overall_satisfaction', category: '종합만족도', title: '7. (종합만족도) 전반적으로 의료·요양 통합돌봄 사업에 만족하십니까?' },
      { id: 8, code: 'continue_intent', category: '지속 이용 의향', title: '8. (지속 이용 의향) 앞으로도 서비스를 계속 이용하고 싶은 의향이 있습니까?' }
    ]
  },

  // Ⅳ. 가장 도움이 된 분야 및 개선 필요 분야 (문항 9~11)
  serviceFeedback: {
    // 9번: 가장 도움이 된 분야 (단일 선택)
    q9: {
      id: 9,
      code: 'most_helpful',
      title: '9. 가장 도움이 된 분야 (1개 선택)',
      isMulti: false,
      options: [
        '보건·의료 서비스',
        '건강관리예방',
        '일상생활(가사, 식사 등)',
        '주거 지원',
        '정서지원',
        '기타'
      ]
    },
    // 10번: 추가로 필요한 서비스 (복수 선택)
    q10: {
      id: 10,
      code: 'needed_services',
      title: '10. 추가로 필요한 서비스 (복수 선택 가능)',
      isMulti: true,
      options: [
        '보건·의료 서비스',
        '건강관리예방',
        '일상생활(가사, 식사 등)',
        '주거 지원',
        '정서지원',
        '기타'
      ]
    },
    // 11번: 불편 및 불만 사항 (복수 선택)
    q11: {
      id: 11,
      code: 'complaints',
      title: '11. 불편 및 불만 사항 (복수 선택 가능)',
      isMulti: true,
      options: [
        '없음',
        '신청절차',
        '안내 부족',
        '제공시간·횟수',
        '서비스 내용',
        '제공인력',
        '기타'
      ]
    }
  },

  // Ⅴ. 주관식 의견 (문항 12~13)
  freeFeedback: {
    q12: {
      id: 12,
      code: 'best_point',
      title: '12. 가장 만족한 점',
      placeholder: '서비스를 이용하시면서 가장 좋았거나 유익했던 점을 자유롭게 적어주세요.'
    },
    q13: {
      id: 13,
      code: 'complaint_note',
      title: '13. 불만족 사유 및 건의사항',
      placeholder: '서비스 이용 중 불편했던 점이나 부평구에 바라는 건의사항을 적어주세요.\n(※ 대영역 Ⅲ에서 1~2점을 체크하신 경우 관련 불만족 사유가 자동으로 반영됩니다)'
    }
  },

  // Ⅵ. 조사자 확인 (사후기입)
  investigatorCheck: {
    reliability: ['높음', '보통', '낮음'],
    communication: ['원활', '일부도움', '대리응답'],
    futureLinkage: ['불필요', '필요']
  }
};
