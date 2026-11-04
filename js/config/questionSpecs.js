/**
 * @file questionSpecs.js
 * @description 10대 문항 정밀 스크립트, 3단계 대화 분기, 판정 가이드, 롱프레스 툴팁 및 Why 매핑 데이터 (ESM)
 */

export const QUESTION_SPECS = [
  {
    num: 1, id: "Q1", title: "지난 1주 동안 평균 하루 한 끼 식사도 하지 않았다", scoreWeight: 1, targetBU: "ME",
    mohwCodes: ["MOHW-04-DAILY"],
    guide: "배가 고플 때 챙겨 먹는 식사 (밥, 빵, 라면 포함 / 단, 주류·과자류 제외)",
    trapNotice: "막걸리, 소주 등 술이나 과자로 끼니를 때운 경우는 식사 결손(위험 1점)으로 판정합니다.",
    memoPlaceholder: "식사 관련 고충 및 관찰 1줄 요약 (예: 혼자 먹기 싫다고 하심, 틀니 통증, 복지관 식사 등)",
    memoChips: [
      { chip: "#혼자먹기싫음", text: "혼자 드시기 적적하고 입맛 없다고 하심" },
      { chip: "#치아틀니통증", text: "치아 통증 및 틀니 헐거움으로 저작 불가" },
      { chip: "#복지관식사해결", text: "복지관 점심으로 하루 한 끼 해결 중" },
      { chip: "#조리도구고장", text: "가스 차단 및 조리도구 고장으로 식사 불가" }
    ],
    dialogueSteps: [
      { step: "1단계 일상 공감", script: "어르신, 혼자 계시다 보면 밥 챙겨 드시는 게 제일 큰 일이고 힘들잖아요. 요즘 진지는 잘 챙겨 드시고 계세요?", isQuestion: true, cleanLabel: "양호", riskLabel: "주의", cleanTooltip: "하루 2~3회 규칙적으로 챙겨 드심", riskTooltip: "하루 1끼 이하 또는 끼니 자주 거르심" },
      { step: "2단계 식사 탐색", script: "어제나 오늘은 식사 어떻게 챙겨 드셨어요? 따뜻한 국이나 밥 좀 챙겨 드셨어요?", isQuestion: true, cleanLabel: "양호", riskLabel: "주의", cleanTooltip: "어제 밥과 국, 반찬을 골고루 드심", riskTooltip: "라면, 물, 빵으로 때우거나 굶으심" },
      {
        step: "3단계 충분성 검증 및 결손 확인",
        isQuestion: true,
        script: "식사 상태를 확인합니다.",
        branches: {
          clean: {
            step: "3단계 식사 질 및 충분성 검증",
            script: "식사는 든든하게 챙겨 드시고 계세요? 혹시 <strong>반찬이 조금 부족하거나 물리지는 않으셨고요?</strong>",
            cleanLabel: "양호",
            riskLabel: "주의",
            cleanTooltip: "소화나 식욕 양호하여 잘 드심",
            riskTooltip: "반찬 부족 및 식사 질 결손 감지"
          },
          risk: {
            step: "3단계 식사 결손 확인",
            script: "아이고, 그러셨구나. 지난 일주일 동안 입맛이나 기운이 없어서 <strong>하루 종일 아무것도 안 드시고 그냥 건너뛴 날</strong>도 있으셨어요?",
            cleanLabel: "양호",
            riskLabel: "주의",
            cleanTooltip: "끼니 건너뛴 날 없이 최소한 챙겨드심",
            riskTooltip: "하루종일 굶거나 결손 확정 (1점)"
          }
        }
      }
    ],
    causes: [
      { code: "REASON_DENTAL", label: "치아/잇몸 통증으로 저작 불가", bu: "ME" },
      { code: "REASON_DEPRESSION", label: "우울감으로 인한 식욕 전폐", bu: "EM" },
      { code: "REASON_MEDICAL", label: "만성질환/복약 후 소화불량", bu: "HE" },
      { code: "REASON_COOKING_ENV", label: "조리도구 고장 및 가스 차단", bu: "CL" }
    ]
  },
  {
    num: 2, id: "Q2", title: "지난 1주 동안 혼자서 만취할 정도로 술을 마신 적이 1회 이상 있었다", scoreWeight: 1, targetBU: "HE",
    mohwCodes: ["MOHW-03-HEALTH"],
    guide: "혼자 마시며 기억이 끊기거나 몸을 가누지 못하고 잠드는 상태",
    trapNotice: "치료/약 복용으로 일시적 단주 시 '단주 전 평소 습관'을 기준으로 판정합니다.",
    memoPlaceholder: "음주 습관 및 관찰 1줄 요약 (예: 밤에 잠 안 와서 매일 막걸리 드심, 단주 중 등)",
    memoChips: [
      { chip: "#불면증약주", text: "잠이 안 와서 수면용으로 매일 막걸리 음주" },
      { chip: "#외로움달래기", text: "외로움과 적적함을 달래려 혼술 만취" },
      { chip: "#치료중일시단주", text: "병원 치료 및 약 복용으로 며칠간 일시 단주 중" },
      { chip: "#자포자기폭음", text: "자포자기 심정으로 식사 대신 술만 복용" }
    ],
    dialogueSteps: [
      { step: "1단계 약주 안부", script: "혼자 계실 때 적적하시거나 밤에 잠이 잘 안 오실 때 가볍게 약주 한 잔씩 하시는 편이신가요?", isQuestion: true, cleanLabel: "양호", riskLabel: "주의", cleanTooltip: "술 안 마심 또는 주 1~2회 가벼운 반주", riskTooltip: "매일 마심 또는 술 없으면 잠을 못 주무심" },
      { step: "2단계 일시적 단주 확인", script: "보통 한 번 드실 때 어느 정도나 드시는 편이세요? 혹시 요즘 치료나 약 복용 때문에 잠깐 쉬고 계신 건가요?", isQuestion: true, cleanLabel: "양호", riskLabel: "주의", cleanTooltip: "과음 없이 조절 가능하심", riskTooltip: "치료 때문에 잠시 참을 뿐 평소 폭음 습관" },
      {
        step: "3단계 수면 및 만취 확인",
        isQuestion: true,
        script: "음주 및 수면 상태를 확인합니다.",
        branches: {
          clean: {
            step: "3단계 수면 및 일상 안정 검증",
            script: "약주 없이도 <strong>밤에 잠은 잘 주무시고 일상생활에 불편함은 없으신가요, 아니면 통증이나 불면으로 부족하신가요?</strong>",
            cleanLabel: "양호",
            riskLabel: "주의",
            cleanTooltip: "약주 없이도 수면 양호 (0점)",
            riskTooltip: "만성 불면 및 수면 유도 음주 위험"
          },
          risk: {
            step: "3단계 혼술 만취 확인",
            script: "속상하거나 외로워서 <strong>혼자서 몸을 못 가눌 정도로 취해서 잠이 든 날</strong>이 지난 일주일 동안 있으셨을까요?",
            cleanLabel: "양호",
            riskLabel: "주의",
            cleanTooltip: "만취할 정도로 폭음하진 않으심",
            riskTooltip: "혼술 만취 및 블랙아웃 확인 (1점)"
          }
        }
      }
    ],
    causes: [
      { code: "REASON_INSOMNIA_PAIN", label: "만성 통증 및 불면증 극복용", bu: "HE" },
      { code: "REASON_LONELINESS", label: "극심한 고독감과 적적함 달래기", bu: "EM" },
      { code: "REASON_ADDICTION", label: "알코올 의존 및 금단 손떨림", bu: "HE" },
      { code: "REASON_SELF_NEGLECT", label: "자포자기형 습관성 폭음", bu: "EM" }
    ]
  },
  {
    num: 3, id: "Q3", title: "지난 1주 동안 한 번도 다른 사람과 소통(연락/만남)이 없었다", scoreWeight: 1, targetBU: "EM",
    mohwCodes: ["MOHW-10-ISOLATION"],
    guide: "가족, 이웃, 지인과의 정서적 연락 또는 대면 만남",
    trapNotice: "마트 장보기, 병원 진료 등 필수 생존 목적의 사무적 대화는 소통에서 제외합니다.",
    memoPlaceholder: "소통 및 대인관계 관찰 1줄 요약 (예: 마트 갈 때 외엔 말 한마디 안 하심 등)",
    memoChips: [
      { chip: "#TV소리만들음", text: "종일 TV만 켜놓고 타인과 대화 전무" },
      { chip: "#대인기피외출거부", text: "경제적 위축 및 건강 악화로 대인 기피" },
      { chip: "#가족연락단절", text: "자녀 및 친인척과 수년간 연락 단절" },
      { chip: "#종교모임외출", text: "주 1회 종교 모임 참석 외 교류 없음" }
    ],
    dialogueSteps: [
      { step: "1단계 적적함 공감", script: "어르신, 혼자 계시다 보면 하루 종일 TV 소리만 듣고 말 한마디 안 나누고 지나가는 날이 참 많으시죠?", isQuestion: true, cleanLabel: "양호", riskLabel: "주의", cleanTooltip: "이웃/가족과 정기적으로 대화 나눔", riskTooltip: "이야기 나눌 사람이 없어 며칠째 침묵" },
      { step: "2단계 필수 목적 분리", script: "마트 가서 장보시거나 병원 다녀오시는 일 말고, 가족이나 이웃, 친구분들과 편하게 안부 나누거나 수다 떠실 일이 좀 있으신가요?", isQuestion: true, cleanLabel: "양호", riskLabel: "주의", cleanTooltip: "정서적 안부 나누는 지인/이웃 있음", riskTooltip: "마트/병원 외 일상적 대화 전무" },
      {
        step: "3단계 소통 만족도 및 단절 확인",
        isQuestion: true,
        script: "소통 상태를 확인합니다.",
        branches: {
          clean: {
            step: "3단계 소통 만족도 검증",
            script: "가족이나 이웃분들과 안부 나누시며 지내기에 <strong>충분하신가요, 아니면 여전히 적적하고 부족하신가요?</strong>",
            cleanLabel: "양호",
            riskLabel: "주의",
            cleanTooltip: "사회적 교류 충분하고 양호 (0점)",
            riskTooltip: "교류 있으나 여전히 고립감 호소"
          },
          risk: {
            step: "3단계 단절 확인",
            script: "요 며칠 사이에 아는 분들과 <strong>전화로 목소리 한 번 나누지 못할 만큼 완전히 단절</strong>되어 계신가요?",
            cleanLabel: "양호",
            riskLabel: "주의",
            cleanTooltip: "최소한의 전화 통화는 유지 중",
            riskTooltip: "완전한 사회적 단절 확인 (1점)"
          }
        }
      }
    ],
    causes: [
      { code: "REASON_ECONOMIC_SHAME", label: "경제적 위축으로 인한 대인 기피", bu: "EM" },
      { code: "REASON_FAMILY_CUT", label: "가족/자녀와의 오랜 단절", bu: "EM" },
      { code: "REASON_MOBILITY_HEARING", label: "거동 불편 및 청력 저하", bu: "HE" },
      { code: "REASON_SOCIAL_PHOBIA", label: "대인 공포 및 방문 거부", bu: "EM" }
    ]
  },
  {
    num: 4, id: "Q4", title: "나에게 문제가 생겼을 때 도움을 청하거나 나를 도와줄 사람이 없다", scoreWeight: 1, targetBU: "EM",
    mohwCodes: ["MOHW-10-ISOLATION"],
    guide: "위급 상황 시 실질적으로 방문하거나 도움을 줄 수 있는 인적 지지망",
    trapNotice: "단순 인사만 나누는 이웃이나 수년간 연락 두절된 명목상 자녀는 지지체계 없음 판정.",
    memoPlaceholder: "위급 시 조력자 관련 관찰 1줄 요약 (예: 아파도 부를 사람 없어 혼자 참으심 등)",
    memoChips: [
      { chip: "#남에게폐끼치기싫음", text: "아파도 주변에 신세 지기 싫어 혼자 참음" },
      { chip: "#호적상자녀단절", text: "호적상 자녀 있으나 실제 왕래 완전 두절" },
      { chip: "#비상연락처없음", text: "위급 시 119 외에 연락할 지인 전무" },
      { chip: "#이웃교류단절", text: "이웃과 인사조차 나누지 않는 고립 상태" }
    ],
    dialogueSteps: [
      { step: "1단계 위급 시 연락처 확인", script: "어르신, 혹시 밤에 갑자기 몸이 많이 아프거나 급한 일 생기면 바로 전화해서 부를 만한 사람은 있으세요?", isQuestion: true, cleanLabel: "양호", riskLabel: "주의", cleanTooltip: "위급 시 부를 지인/가족 존재", riskTooltip: "위급 시 기댈 곳 전무" },
      { step: "2단계 실질 조력 검증", script: "혹시 밤에 갑자기 아프실 때, 그분한테 <strong>'나 좀 도와달라'</strong>고 바로 연락해서 도움을 받으실 수 있으세요?", isQuestion: true, cleanLabel: "양호", riskLabel: "주의", cleanTooltip: "실제 즉시 와줄 수 있는 조력자", riskTooltip: "연락처는 있으나 폐 끼치기 싫어 부르지 못함" },
      {
        step: "3단계 조력 실효성 검증 및 공감",
        isQuestion: true,
        script: "지지체계를 확인합니다.",
        branches: {
          clean: {
            step: "3단계 실질 조력 검증",
            script: "위급할 때 실제로 바로 와줄 수 있는 <strong>든든한 조력자가 맞으신가요, 아니면 연락만 닿을 뿐 실질적 도움은 부족한가요?</strong>",
            cleanLabel: "양호",
            riskLabel: "주의",
            cleanTooltip: "실질적 지지망 양호 (0점)",
            riskTooltip: "명목상 연락처일 뿐 실질 조력 부족"
          },
          risk: {
            step: "3단계 결손 공감",
            script: "아이고... 그동안 급한 일 생겨도 기댈 데 없이 혼자 끙끙 앓으셨겠어요. 위급 시 바로 도움받으실 수 있는 비상 연락망을 함께 챙겨드리겠습니다.",
            cleanLabel: "양호",
            riskLabel: "주의",
            cleanTooltip: "주변 이웃의 비상 도움 가능",
            riskTooltip: "조력자 완전 부재 결손 확정 (1점)"
          }
        }
      }
    ],
    causes: [
      { code: "REASON_FAMILY_CUT", label: "자녀 및 친인척 전무/단절", bu: "EM" },
      { code: "REASON_SHAME_BURDEN", label: "지인에게 폐 끼치기 싫음", bu: "EM" },
      { code: "REASON_AGENCY_DISTRUST", label: "공공기관 및 이웃 불신", bu: "EM" },
      { code: "REASON_MOBILITY_PHYSICAL", label: "손떨림으로 통신 기기 조작 불가", bu: "HE" }
    ]
  },
  {
    num: 5, id: "Q5", title: "현재 지속적 일자리나 복지급여 등의 일정한 소득이 없다", scoreWeight: 1, targetBU: "EM",
    mohwCodes: ["MOHW-01-LIVELIHOOD", "MOHW-09-FINANCE"],
    guide: "지속적 근로소득, 공적 복지급여, 자산소득(임대수입, 이자 등) 중 일정한 수입",
    trapNotice: "보유 자산 등으로 인해 임대수입/이자 소득이 있을 시 비위험(0점)으로 판정합니다.",
    memoPlaceholder: "소득 및 경제 상태 관찰 1줄 요약 (예: 불규칙 폐지 수입 외 없음, 기초연금 의존 등)",
    memoChips: [
      { chip: "#불규칙폐지수입", text: "폐지 수거 하루 몇천 원 수입으로 생계 유지" },
      { chip: "#부양의무자기준탈락", text: "자녀 소득 인정액으로 기초수급 탈락 상태" },
      { chip: "#기초연금생활", text: "기초연금 외에 추가 근로 및 지원 수입 전무" },
      { chip: "#공적구호신청모름", text: "복지 급여 신청 절차를 몰라 방치 중" }
    ],
    dialogueSteps: [
      { step: "1단계 일상 활동 접근", script: "어르신, 요즘 밖에서 가볍게라도 일하시는 게 좀 있으세요?", isQuestion: true, cleanLabel: "양호", riskLabel: "주의", cleanTooltip: "정기 근로 또는 일정한 활동 수입 있음", riskTooltip: "근로 불가 및 정기 일자리 없음" },
      { step: "2단계 정밀 소득 분기", script: "그 일은 매달 꾸준히 계속하시는 일인가요? 아니면 나라에서 나오는 연금이나 지원금, 작게라도 들어오는 집세나 이자로 생활하고 계신가요?", isQuestion: true, cleanLabel: "양호", riskLabel: "주의", cleanTooltip: "기초연금/급여/이자 등 정기 소득 있음", riskTooltip: "공적급여 및 자산 소득 전무" },
      {
        step: "3단계 생활 충분성 검증 및 공감",
        isQuestion: true,
        script: "소득 상태를 확인합니다.",
        branches: {
          clean: {
            step: "3단계 생활 충분성 검증",
            script: "다행입니다. 그런데 어르신, 그 수입(연금)으로 한 달 약값이나 공과금 내고 생활하시기에 <strong>충분하신가요, 아니면 부족하신가요?</strong>",
            cleanLabel: "양호",
            riskLabel: "주의",
            cleanTooltip: "기본 생활 유지에 충분함 (0점)",
            riskTooltip: "소득 있으나 생계비 턱없이 부족"
          },
          risk: {
            step: "3단계 결손 공감 및 연계",
            script: "아이고... 정해진 수입도 없이 그동안 얼마나 불안하고 빠듯하게 버티셨어요. 공적 지원이나 긴급 생계 지원 방법을 함께 찾아보겠습니다.",
            cleanLabel: "양호",
            riskLabel: "주의",
            cleanTooltip: "임시 구호나 지인 지원으로 버팀",
            riskTooltip: "정기 소득 완전 결손 확정 (1점)"
          }
        }
      }
    ],
    causes: [
      { code: "REASON_LABOR_INCAPACITY", label: "고령 및 만성질환으로 근로 불가", bu: "EM" },
      { code: "REASON_WELFARE_EXCLUSION", label: "부양의무자 기준으로 수급 탈락", bu: "EM" },
      { code: "REASON_PROCEDURE_IGNORANCE", label: "복지 급여 신청 방법 모름", bu: "EM" },
      { code: "REASON_SHAME_REJECTION", label: "자존심으로 인한 공적 구호 거부", bu: "EM" }
    ]
  },
  {
    num: 6, id: "Q6", title: "최근 1년간 임대료나 공과금이 2개월 이상 체납된 적이 있다", scoreWeight: 1, targetBU: "EM",
    mohwCodes: ["MOHW-01-LIVELIHOOD"],
    guide: "최근 1년 이내 월세, 전기, 가스, 수도, 건보료 등의 2개월 이상 체납 이력",
    trapNotice: "현재는 납부했더라도 최근 1년 내 2개월 이상 밀린 적이 있다면 위험(1점) 판정.",
    memoPlaceholder: "주거비 및 공과금 납부 관찰 1줄 요약 (예: 가스비 3달 밀려 전기장판 사용 등)",
    memoChips: [
      { chip: "#월세체납퇴거불안", text: "월세 수개월 체납으로 집주인 퇴거 독촉 불안" },
      { chip: "#가스전기체납", text: "도시가스 체납으로 난방 중단 및 전기장판 의존" },
      { chip: "#건보료체납", text: "건강보험료 장기 체납으로 통장 압류 위기" },
      { chip: "#병원비부담미납", text: "과도한 약값 지출로 공과금 납부 불가" }
    ],
    dialogueSteps: [
      { step: "1단계 지출 부담 공감", script: "어르신, 요즘 공과금이나 집세 내실 때 부담되거나 밀리신 적은 없으셨어요?", isQuestion: true, cleanLabel: "양호", riskLabel: "주의", cleanTooltip: "공과금/방세 제때 정상 납부 중", riskTooltip: "공과금이나 방세 지출에 큰 부담 호소" },
      { step: "2단계 체납 여부 확인", script: "지난 1년 동안 혹시 사정이 여의치 않아서 공과금이나 세가 조금 밀렸던 적도 있으셨어요?", isQuestion: true, cleanLabel: "양호", riskLabel: "주의", cleanTooltip: "최근 1년간 2개월 이상 체납 이력 없음", riskTooltip: "최근 1년간 2개월 이상 체납 발생" },
      {
        step: "3단계 주거비 부담 및 원인 파악",
        isQuestion: true,
        script: "체납 및 주거비 상태를 확인합니다.",
        branches: {
          clean: {
            step: "3단계 주거비 부담 검증",
            script: "공과금은 잘 내고 계시지만, 매달 나가는 방세나 광열비 때문에 <strong>생활비가 부족하지는 않으신가요?</strong>",
            cleanLabel: "양호",
            riskLabel: "주의",
            cleanTooltip: "주거비 및 공과금 부담 양호 (0점)",
            riskTooltip: "체납은 없으나 주거비로 생활비 결손"
          },
          risk: {
            step: "3단계 심층 원인 파악",
            script: "어르신, 매달 나가는 돈 중에 어떤 부분이 제일 부담스럽고 버거우세요? 지금 바로 도와드릴 수 있는 부분부터 챙겨드리겠습니다.",
            cleanLabel: "양호",
            riskLabel: "주의",
            cleanTooltip: "현재는 완납하여 위기 해소됨",
            riskTooltip: "2개월 이상 체납 지속 위험 확정 (1점)"
          }
        }
      }
    ],
    causes: [
      { code: "REASON_RENT_DELINQUENCY", label: "월세 체납으로 인한 퇴거 위기", bu: "CL" },
      { code: "REASON_UTILITY_CUTOFF", label: "전기·가스비 체납 (에너지 빈곤)", bu: "EM" },
      { code: "REASON_HEALTH_INS_DEBT", label: "건강보험료 장기 체납/압류", bu: "HE" },
      { code: "REASON_MEDICAL_DRAIN", label: "과도한 병원비 지출로 공과금 미납", bu: "HE" }
    ]
  },
  {
    num: 7, id: "Q7", title: "몸이나 마음이 아플 때 필요한 치료나 약을 복용하지 않고 있다", scoreWeight: 2, targetBU: "HE",
    mohwCodes: ["MOHW-03-HEALTH"],
    guide: "신체 및 정신건강(우울, 불면) 질환에 필요한 진료 미이용 및 필수 처방약 미복용",
    trapNotice: "처방약을 임의 중단했거나 통증을 파스만 붙이고 참는 경우도 위험(2점) 판정.",
    memoPlaceholder: "치료 및 복약 상태 관찰 1줄 요약 (예: 병원비 없어 파스만 붙임, 약 임의 중단 등)",
    memoChips: [
      { chip: "#병원비약값부담", text: "병원비와 약값이 부담되어 진료 포기" },
      { chip: "#거동불가병원못감", text: "다리 통증과 이동 수단 부재로 병원 방문 불가" },
      { chip: "#약부작용임의중단", text: "속쓰림/어지럼증 부작용으로 처방약 임의 중단" },
      { chip: "#치료포기방치", text: "만성 통증을 파스와 진통제로만 버티는 중" }
    ],
    dialogueSteps: [
      { step: "1단계 건강 안부", script: "어르신, 요즘 몸이나 마음 편찮으신 데는 없으세요?", isQuestion: true, cleanLabel: "양호", riskLabel: "주의", cleanTooltip: "특별히 편찮은 곳 없이 건강하심", riskTooltip: "만성 통증이나 신체/정신적 불편 호소" },
      { step: "2단계 정기 복약 확인", script: "병원에서 지어오신 처방약은 제때 잘 챙겨 드시고 계세요?", isQuestion: true, cleanLabel: "양호", riskLabel: "주의", cleanTooltip: "처방약 거르지 않고 규칙적 복용", riskTooltip: "약값 부담이나 귀찮음으로 복약 중단/임의 조절" },
      {
        step: "3단계 복약 유지 및 치료 결손 확인",
        isQuestion: true,
        script: "치료 상태를 확인합니다.",
        branches: {
          clean: {
            step: "3단계 복약 유지 및 추가 욕구 검증",
            script: "병원 진료랑 약을 꾸준히 잘 챙겨 드신다니 참 다행입니다. 혹시 <strong>약값 부담이나 거동 때문에 추가 진료를 못 받고 계신 부족한 부분은 없으신가요?</strong>",
            cleanLabel: "양호",
            riskLabel: "주의",
            cleanTooltip: "필수 치료 성실 이행 중 (0점)",
            riskTooltip: "약은 먹으나 병원 추가 진료 결손"
          },
          risk: {
            step: "3단계 치료 결손 확인",
            script: "아프실 때 병원 가기가 번거롭거나 부담스러워서 <strong>그냥 참고 지나가시거나 복약을 미룬 적</strong>이 있으신가요?",
            cleanLabel: "양호",
            riskLabel: "주의",
            cleanTooltip: "참지 않고 제때 진료받으심",
            riskTooltip: "필수 치료 중단/방치 확정 (2점)"
          }
        }
      }
    ],
    causes: [
      { code: "REASON_MEDICAL_COST", label: "약값 및 병원비 부담으로 포기", bu: "HE" },
      { code: "REASON_MOBILITY_HOSPITAL", label: "거동 불가 및 이동 수단 부재", bu: "HE" },
      { code: "REASON_DESPAIR_NEGLECT", label: "우울감으로 인한 치료 방치", bu: "HE" },
      { code: "REASON_DRUG_SIDE_EFFECT", label: "약물 부작용으로 임의 복용 중단", bu: "HE" }
    ]
  },
  {
    num: 8, id: "Q8", title: "나와 집안의 청결을 유지하고 있지 않다", scoreWeight: 1, targetBU: "CL",
    mohwCodes: ["MOHW-06-HOUSING", "MOHW-04-DAILY"],
    guide: "부패 음식물 방치, 쓰레기 누적, 악취, 세탁되지 않은 침구, 해충 발생 등 위생 결손",
    trapNotice: "단순 노후 주택은 제외하며, 거동불편형과 저장강박(Hoarding)형을 분리 처방.",
    memoPlaceholder: "주거 환경 및 위생 관찰 1줄 요약 (예: 악취, 썩은 음식물 방치, 쓰레기 누적 등)",
    memoChips: [
      { chip: "#거동불편청소불가", text: "허리/무릎 통증으로 쓰레기 배출 및 빨래 불가" },
      { chip: "#쓰레기적치저장강박", text: "물건을 버리지 못하고 방안 가득 쓰레기 적치" },
      { chip: "#세탁물방치악취", text: "세탁되지 않은 침구 및 부패 음식물 악취 심함" },
      { chip: "#수도누수방치", text: "싱크대 누수 및 세탁기 고장으로 위생 악화" }
    ],
    dialogueSteps: [
      { step: "1단계 집안일 고충 공감", script: "혼자 계시다 보면 이불 빨래나 무거운 쓰레기 내놓는 게 제일 큰 일이고 힘들더라고요. 어르신은 어떠세요?", isQuestion: true, cleanLabel: "양호", riskLabel: "주의", cleanTooltip: "집안 청소 및 정리정돈 양호", riskTooltip: "빨래/쓰레기 배출에 극심한 고충 호소" },
      { step: "2단계 위생/세탁 상태 확인", script: "혹시 몸이 무겁거나 허리가 아파서 쓰레기 내놓기가 힘들거나, 빨래가 밀려서 쌓여있는 게 좀 있으신가요?", isQuestion: true, cleanLabel: "양호", riskLabel: "주의", cleanTooltip: "주기적인 환기와 세탁 유지", riskTooltip: "오염 침구 방치 및 쓰레기 적치 징후" },
      {
        step: "3단계 위생 유지 및 심층 고충 파악",
        isQuestion: true,
        script: "주거 위생 상태를 확인합니다.",
        branches: {
          clean: {
            step: "3단계 위생 유지 검증",
            script: "집안 관리를 잘하고 계시네요. 혹시 <strong>무거운 이불 빨래나 높은 곳 청소 등 손길이 닿지 않아 부족한 부분은 없으신가요?</strong>",
            cleanLabel: "양호",
            riskLabel: "주의",
            cleanTooltip: "위생적 주거환경 유지 (0점)",
            riskTooltip: "대형 빨래 등 일부 가사 도움 필요"
          },
          risk: {
            step: "3단계 심층 고충 질문",
            script: "어르신, 집안 돌보시는 데 있어서 가장 손대기 힘들고 어려운 부분이 어떤 건가요? 주거환경 개선 사업단을 통해 도와드리겠습니다.",
            cleanLabel: "양호",
            riskLabel: "주의",
            cleanTooltip: "단순 일시적 밀림일 뿐 스스로 해결 가능",
            riskTooltip: "주거환경 극심 악화 확정 (1점)"
          }
        }
      }
    ],
    causes: [
      { code: "REASON_MOBILITY_CLEANING", label: "거동 불편으로 쓰레기 배출 불가", bu: "CL" },
      { code: "REASON_HOARDING_TRAUMA", label: "물건을 버리지 못하는 저장강박", bu: "CL" },
      { code: "REASON_SEVERE_DEPRESSION", label: "중증 우울증으로 인한 만성 방치", bu: "CL" },
      { code: "REASON_FACILITY_BREAKDOWN", label: "수도 누수 및 세탁기 고장 방치", bu: "CL" }
    ]
  },
  {
    num: 9, id: "Q9", title: "지난 2주간 지속해서 심한 외로움을 느끼고 있다", scoreWeight: 2, targetBU: "EM",
    mohwCodes: ["MOHW-10-ISOLATION"],
    guide: "지난 2주 동안 지속적인 우울감, 기운 처짐, 고독감, 감정 둔마 상태",
    trapNotice: "직설적 단어(외로움, 우울) 지양, '아무 생각 없다'는 감정 둔마 상태를 포착합니다.",
    memoPlaceholder: "정서 및 심리 상태 관찰 1줄 요약 (예: 하루 종일 누워만 계심, 멍하니 창밖 응시 등)",
    memoChips: [
      { chip: "#배우자사별충격", text: "배우자 사별 후 삶의 의욕과 기운 완전 상실" },
      { chip: "#만성의욕상실", text: "세수나 외출조차 귀찮아 하루 종일 누워만 계심" },
      { chip: "#야간적막공포", text: "밤이 되면 극심한 고독감과 불안으로 가슴 답답" },
      { chip: "#감정둔마체념", text: "기쁨이나 슬픔 없이 아무 생각 없다고 체념" }
    ],
    dialogueSteps: [
      { step: "1단계 마음 안부 열기", script: "어르신, 요즘 혼자 계시면서 마음이나 기분은 좀 어떠세요?", isQuestion: true, cleanLabel: "양호", riskLabel: "주의", cleanTooltip: "마음이 편안하고 활력을 유지하심", riskTooltip: "최근 마음이 울적하고 삶의 의욕 저하" },
      { step: "2단계 기운 처짐 확인", script: "혼자 계실 때 유난히 적적하거나 가슴 한구석이 허전하다는 생각이 들 때가 있으세요?", isQuestion: true, cleanLabel: "양호", riskLabel: "주의", cleanTooltip: "혼자 계셔도 외로움을 잘 견디심", riskTooltip: "온종일 눈물 나고 깊은 고독감에 짓눌림" },
      {
        step: "3단계 정서 안정 및 고독감 확인",
        isQuestion: true,
        script: "정서 상태를 확인합니다.",
        branches: {
          clean: {
            step: "3단계 정서 안정 및 야간 고독 검증",
            script: "낮 동안 마음이 편안하시다니 다행입니다. 혹시 <strong>밤이 되었을 때 유독 적적하거나 외로움으로 마음이 허전하고 부족하진 않으신가요?</strong>",
            cleanLabel: "양호",
            riskLabel: "주의",
            cleanTooltip: "정서 안정 및 고립감 없음 (0점)",
            riskTooltip: "야간 고립 및 적적함 호소"
          },
          risk: {
            step: "3단계 심층 마음 질문",
            script: "어르신, 어떤 생각이 드실 때 제일 마음이 가라앉고 허전하세요? 혼자 끙끙 앓지 마시고 편하게 털어놓아 주세요.",
            cleanLabel: "양호",
            riskLabel: "주의",
            cleanTooltip: "일시적 감정 기복일 뿐 회복력 있음",
            riskTooltip: "중증 우울/고독감 위험 확정 (2점)"
          }
        }
      }
    ],
    causes: [
      { code: "REASON_BEREAVEMENT_TRAUMA", label: "배우자/가족 사별 트라우마", bu: "EM" },
      { code: "REASON_CHRONIC_DEPRESSION", label: "만성 우울 및 의욕 완전 상실", bu: "EM" },
      { code: "REASON_ROLE_LOSS", label: "사회적 역할 상실과 무력감", bu: "EM" },
      { code: "REASON_NIGHT_LONELINESS", label: "야간 고립 및 적막 공포", bu: "EM" }
    ]
  },
  {
    num: 10, id: "Q10", title: "지난 6개월 동안 죽음을 생각하거나 살고 싶지 않았다", scoreWeight: 2, targetBU: "EM",
    mohwCodes: ["MOHW-05-SAFETY", "MOHW-10-ISOLATION"],
    guide: "지난 6개월 이내 자살 생각, 자포자기, 죽음에 대한 갈망, 구체적 시도 계획",
    trapNotice: "과도한 확정적 장담 대신 경청에 대한 감사와 현실적 도움 약속으로 지지합니다.",
    memoPlaceholder: "생명 위기 징후 및 핵심 관찰 1줄 요약 (예: 신변 정리, 수면제 모음 등)",
    memoChips: [
      { chip: "#차라리눈감고싶다", text: "사는 게 고통스러워 차라리 눈 감고 싶다고 호소" },
      { chip: "#수면제모아둠", text: "처방받은 수면제를 모아둔 정황 포착 (초응급)" },
      { chip: "#주변신변정리", text: "아끼던 물건을 이웃에게 나눠주는 신변 정리 징후" },
      { chip: "#살의지체념", text: "누구도 도와줄 수 없다는 깊은 고립 체념" }
    ],
    dialogueSteps: [
      { step: "1단계 조심스러운 상황 열기", script: "어르신, 사람이 살다 보면 몸도 편치 않고 사는 게 너무 힘들고 지칠 때가 있잖아요...", isQuestion: true, cleanLabel: "양호", riskLabel: "주의", cleanTooltip: "어려워도 삶을 지키려는 의지 확고", riskTooltip: "극심한 삶의 무게에 지쳐 계심" },
      { step: "2단계 생명 위기 확인", script: "혹시 최근 몇 달 사이에... <strong>'차라리 이대로 눈 감았으면 좋겠다'</strong>거나 <strong>'살아서 뭐하나'</strong> 하는 생각이 깊게 드신 적이 있으셨을까요?", isQuestion: true, cleanLabel: "양호", riskLabel: "주의", cleanTooltip: "극단적 생각 없이 잘 버텨내심", riskTooltip: "'차라리 눈감고 싶다'는 생각 호소" },
      {
        step: "3단계 지지 및 개입",
        isQuestion: false,
        script: "어르신, 털어놓아 주셔서 감사합니다.",
        branches: {
          clean: {
            step: "3단계 생명 지지 및 안도",
            script: "힘든 순간에도 꿋꿋하게 버텨주셔서 참 감사하고 든든합니다. 일상에서 더 큰 힘이 되어 드릴 수 있도록 저희가 늘 곁에서 함께하겠습니다."
          },
          risk: {
            step: "3단계 감사 지지 및 도움 약속",
            script: "이야기를 들려주셔서 정말 고맙습니다. 마음 무거우실 때 언제든 기댈 수 있도록 저희가 늘 곁에 함께 있을게요."
          }
        }
      }
    ],
    causes: [
      { code: "REASON_SUICIDE_PLAN", label: "구체적 계획/약물 모음 (초긴급)", bu: "EM" },
      { code: "REASON_CHRONIC_PAIN_DESPAIR", label: "극심한 만성 통증으로 인한 비관", bu: "HE" },
      { code: "REASON_EXTREME_DEBT_POVERTY", label: "극심한 빚 독촉 및 생계 파탄", bu: "EM" },
      { code: "REASON_TOTAL_ABANDONMENT", label: "세상과의 완전한 단절 체념", bu: "EM" }
    ]
  }
];
