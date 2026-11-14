// All dialogue is in content.json; these edges connect the original Figma frames.
// Shared outcomes intentionally make the two choices converge again.
const scene = (title, next, extra = {}) => ({ title, next, ...extra });
const choice = (label, target) => ({ label, target });

export const START = '1:295';
export const scenes = {
  '1:295': scene('겟야! 시작', '1:404', { kind: 'start' }),
  '1:404': scene('고민을 골라봐, 지구인!', null, {
    kind: 'topics', choices: [choice('진로', '1:1054'), choice('친구', '1:155')],
  }),
  '1:155': scene('친구 고민', '1:225', { route: 'friend' }),
  '1:225': scene('냐냐의 제안', '1:564', { route: 'friend' }),
  '1:564': scene('친구 · 첫 번째 선택', null, {
    kind: 'choice', route: 'friend', phase: 1,
    choices: [choice('친구의 변명 톡 심리 분석을 맡겨, 분석 결과를 캡쳐해 보낸다.', '1:3'),
      choice('지각 1분당 100원씩 정산하는 우정 유지용 정산법을 물어본다.', '1:41')],
  }),
  '1:3': scene('심리 분석을 받은 친구', '1:22', { phase: 1 }),
  '1:22': scene('이제 어떻게 해야할까?', '1:586', { phase: 1 }),
  '1:41': scene('정산표를 받은 친구', '1:136', { phase: 1 }),
  '1:136': scene('이제 어떻게 해야할까?', '1:586', { phase: 1 }),
  '1:586': scene('친구 · 두 번째 선택', null, {
    kind: 'choice', phase: 2,
    choices: [choice('냐냐에게 장문의 반박문을 대신 써달라고 하고 그대로 전송한다.', '1:60'),
      choice('냐냐가 만든 정산표인데 왜 네가 화를 내냐고 말한다.', '1:60')],
  }),
  '1:60': scene('거리를 두는 친구들', '1:117', { phase: 2 }),
  '1:117': scene('냐냐를 믿어도 되는 걸까?', '1:608', { phase: 2 }),
  '1:608': scene('친구 · 마지막 선택', null, {
    kind: 'choice', phase: 3,
    choices: [choice('단톡방 전체 공지로 친구에게 공개 사과를 요구한다.', '1:79'),
      choice('친구에게 손절하자고 말한다.', '1:79')],
  }),
  '1:79': scene('나 없이 떠난 친구들', '1:98', { phase: 3 }),
  '1:98': scene('이게 아닌가...?', '1:630', { phase: 3 }),
  '1:630': scene('당신의 선택은', '1:647', { phase: 4 }),
  '1:647': scene('친구 이야기 결과', '1:665', { kind: 'result', phase: 4 }),
  '1:665': scene('냐냐의 진심', '1:729'),
  '1:729': scene('인간관계의 답', '1:793'),
  '1:793': scene('친구 이야기 엔딩', null, { kind: 'ending' }),
  '1:1054': scene('진로 고민', '1:1124', { route: 'career' }),
  '1:1124': scene('냐냐의 갓생 설계', '1:1441', { route: 'career' }),
  '1:1441': scene('진로 · 첫 번째 선택', null, {
    kind: 'choice', route: 'career', phase: 1,
    choices: [choice('나와 딱 맞는 100% 합격 보장 직업을 추천해 달라고 한다.', '1:864'),
      choice('하루 23시간 초밀도 갓생 루틴을 시작한다.', '1:902')],
  }),
  '1:864': scene('우주 외계인 통역사', '1:883', { phase: 1 }),
  '1:883': scene('일단 시키는 대로 해보자', '1:1463', { phase: 1 }),
  '1:902': scene('우주 수면법', '1:1035', { phase: 1 }),
  '1:1035': scene('일단 시키는 대로 해보자', '1:1463', { phase: 1 }),
  '1:1463': scene('진로 · 두 번째 선택', null, {
    kind: 'choice', phase: 2,
    choices: [choice('외계어 맞춤법을 외우며 SNS에 우주어로 공부 인증을 올린다.', '1:921'),
      choice('밤새 아.아를 마시며 자소서 100개 자동 생성을 돌린다.', '1:921')],
  }),
  '1:921': scene('친구들의 걱정', '1:1016', { phase: 2 }),
  '1:1016': scene('혼자 고민하는 일', '1:1485', { phase: 2 }),
  '1:1485': scene('진로 · 마지막 선택', null, {
    kind: 'choice', phase: 3,
    choices: [choice('친구들을 정신 차리게 할 글을 써달라고 한다.', '1:940'),
      choice('갓생 사는 중이라고 말하고 단톡방 알림을 끈다.', '1:978')],
  }),
  '1:940': scene('외계어 수수께끼', '1:959', { phase: 3 }),
  '1:959': scene('뭔가 잘못된 것 같아', '1:1589', { phase: 3 }),
  '1:978': scene('나 없이 떠난 친구들', '1:997', { phase: 3 }),
  '1:997': scene('뭔가 잘못된 것 같아', '1:1589', { phase: 3 }),
  '1:1589': scene('냐냐를 따른 결과', '1:1606', { phase: 4 }),
  '1:1606': scene('진로 이야기 결과', '1:1624', { kind: 'result', phase: 4 }),
  '1:1624': scene('냐냐의 진심', '1:1688'),
  '1:1688': scene('스스로 고민할 기회', '1:1752'),
  '1:1752': scene('진로 이야기 엔딩', null, { kind: 'ending' }),
};

export function initialGame() {
  return { sceneId: START, route: null, history: [] };
}

export function gameReducer(state, action) {
  if (action.type === 'restart') return initialGame();
  if (action.type !== 'advance') return state;
  const current = scenes[state.sceneId];
  const target = action.choiceIndex == null ? current.next : current.choices?.[action.choiceIndex]?.target;
  if (!target || !scenes[target]) return state;
  return {
    sceneId: target,
    route: scenes[target].route ?? state.route,
    history: [...state.history, { from: state.sceneId, to: target, choiceIndex: action.choiceIndex ?? null }],
  };
}
