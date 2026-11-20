import { useState } from 'react';

const agreement = ['매우 그렇다', '어느 정도 그렇다', '별로 그렇지 않다', '전혀 그렇지 않다'];
const questions = [
  {
    id: 'ai-use', max: 1,
    title: '평소 AI에게 고민이나 문제를 상담할 때, 답변을 어떻게 활용하시나요?',
    options: ['대부분 AI가 추천한 방향을 따른다', 'AI의 의견을 참고하되 스스로 결정한다', '다른 사람이나 자료와 비교한 후 결정한다', 'AI에게 고민을 상담하지 않는다'],
  },
  {
    id: 'reflection', max: 1,
    title: '이번 게임이 AI의 답변을 무조건 받아들이는 태도를 돌아보는 계기가 되었나요?',
    options: agreement,
  },
  {
    id: 'liked', max: 2,
    title: '게임에서 가장 좋았던 점은 무엇인가요?',
    options: ['참담한 선택지와 스토리', '캐릭터와 도트 스타일', '선택에 따라 진행되는 인터랙션', 'AI 맹신에 대한 반전 메시지', '다른 사람과 경험을 공유하는 기능'],
  },
  {
    id: 'improve', max: 2,
    title: '개선이 필요하다고 느낀 부분은 무엇인가요?',
    options: ['스토리와 선택지의 다양성', '배드엔딩의 재미와 완성도', '게임의 진행 속도와 분량', '조작 방식과 화면 구성', '기타'],
  },
];

export default function ReviewSurvey({ exhibition, onSubmit, onBrowse, canBrowse }) {
  const [answers, setAnswers] = useState({});
  const [other, setOther] = useState('');
  const [body, setBody] = useState('');
  const [share, setShare] = useState(false);
  const hasOther = answers.improve?.includes('기타');

  function choose(question, option) {
    setAnswers(previous => {
      const selected = previous[question.id] ?? [];
      if (question.max === 1) return { ...previous, [question.id]: [option] };
      if (selected.includes(option)) {
        return { ...previous, [question.id]: selected.filter(value => value !== option) };
      }
      if (selected.length === question.max) return previous;
      return { ...previous, [question.id]: [...selected, option] };
    });
  }

  return <form className="final-survey" onSubmit={event => {
    event.preventDefault();
    onSubmit({ answers, other: hasOther ? other.trim() : '', body: body.trim(), share: exhibition && share });
  }}>
    <div className="final-survey-scroll">
      <p className="survey-mode">{exhibition
        ? '전시용 · 제출한 응답은 이 노트북의 브라우저에 저장됩니다.'
        : '컨펌용 · 이 화면에서 설문과 후기를 체험할 수 있습니다. 새로고침하면 입력한 내용이 사라집니다.'}</p>
      {questions.map(question => {
        const selected = answers[question.id] ?? [];
        return <fieldset key={question.id}>
          <legend>{question.title}</legend>
          {question.max > 1 && <p className="survey-limit">최대 {question.max}개 선택 ({selected.length}/{question.max})</p>}
          {question.options.map(option => <label className="survey-option" key={option}>
            <input type={question.max === 1 ? 'radio' : 'checkbox'} name={question.id}
              checked={selected.includes(option)}
              disabled={question.max > 1 && selected.length === question.max && !selected.includes(option)}
              onChange={() => choose(question, option)} />
            {option}
          </label>)}
          {question.id === 'improve' && hasOther && <label className="survey-other">
            기타 의견
            <input value={other} maxLength={300} required onChange={event => setOther(event.target.value)} />
          </label>}
        </fieldset>;
      })}
      <label className="survey-body">서술형 후기
        <textarea aria-label="서술형 후기" value={body} maxLength={2000} onChange={event => setBody(event.target.value)} />
      </label>
      {exhibition && <label className="survey-option">
        <input type="checkbox" checked={share} onChange={event => setShare(event.target.checked)} />
        유저네임과 서술형 후기를 이 전시 화면에 보여주기
      </label>}
    </div>
    <div className="survey-actions">
      {canBrowse && <button type="button" onClick={onBrowse}>다른 후기 보기</button>}
      <button type="submit" disabled={(hasOther && !other.trim()) || (!body.trim() && !Object.values(answers).some(values => values.length))}>등록</button>
    </div>
  </form>;
}
