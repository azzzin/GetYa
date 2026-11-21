import { useEffect, useRef, useState } from 'react';
import ReviewList from './ReviewList.jsx';
import ReviewSurvey from './ReviewSurvey.jsx';
import { downloadReviews, isLocalGame, readReviews, saveReview } from './reviewStorage.js';
import GameLogo from '../components/GameLogo.jsx';
import FinalLayers from './FinalLayers.jsx';
import DialogueAdvance from '../components/DialogueAdvance.jsx';
import { useReveal } from './useReveal.js';
import { assetUrl } from '../assetUrl.js';
import { chapters } from './scenePresentation.js';
import { autoTransitionDelay } from './transitionTiming.js';
import baseScenes from './data/scenes.json';
import opening from './data/opening.json';
import layouts from './data/layouts.json';
import './design.css';
import './final.css';

const START = '32:703';
const TOPICS = '32:826';
const scenes = { ...baseScenes, [START]: { ...baseScenes[START], next: opening[0].id } };
for (const [index, frame] of opening.entries()) {
  scenes[frame.id] = {
    ...frame, name: ['오프닝1', '오프닝2', '오프닝2-1', '오프닝3', '오프닝4'][index],
    width: 1920, height: 1080, kind: 'opening', links: [],
    next: opening[index + 1]?.id ?? TOPICS,
  };
}

function Opening({ scene }) {
  const [left, top, width, height] = scene.bg;
  const [bubbleLeft, bubbleTop, bubbleWidth, bubbleHeight] = scene.rect;
  return <>
    <img className="opening-background" src={assetUrl(scene.src)} alt="" style={{ left, top, width, height }} />
    <div className="opening-bubble" data-name="말풍선 오프닝" style={{
      left: bubbleLeft, top: bubbleTop, width: bubbleWidth, height: bubbleHeight, fontSize: scene.fontSize,
    }}>
      <img src={assetUrl('/assets/figma-opening-bubble.svg')} alt="" />
      <p>{scene.text}</p>
    </div>
  </>;
}
function Target({ link, onClick, onHover, disabled }) {
  const [x, y, width, height] = link.rect;
  return <button type="button" className="final-target" data-link-id={link.id} aria-label={link.label || '다음 대사'}
    style={{ left: x, top: y, width, height }} aria-disabled={disabled || undefined}
    onClick={onClick} onPointerEnter={onHover} onFocus={onHover} onPointerLeave={() => onHover?.(false)} onBlur={() => onHover?.(false)} />;
}

export default function FinalGame() {
  const reviewMode = import.meta.env.DEV || location.pathname.includes('/final-preview/');
  const requested = reviewMode ? new URLSearchParams(location.search).get('scene') : null;
  const [sceneId, setSceneId] = useState(scenes[requested] ? requested : START);
  const scene = scenes[sceneId];
  const chapter = chapters.get(sceneId);
  const stage = useRef(null);
  const timer = useRef(null);
  const [viewport, setViewport] = useState({ width: innerWidth, height: innerHeight });
  const scale = Math.min(viewport.width / scene.width, viewport.height / scene.height);
  const [nickname, setNickname] = useState('');
  const password = useRef(null);
  const [activeDoor, setActiveDoor] = useState(null);
  const [selecting, setSelecting] = useState(false);
  const [notice, setNotice] = useState('');
  const [reviews, setReviews] = useState(readReviews);
  const [previewReview, setPreviewReview] = useState(null);
  const canExport = isLocalGame && new URLSearchParams(location.search).get('operator') === '1';
  const reveal = useReveal(scene);
  const automaticDelay = autoTransitionDelay(scene, scenes[scene.next]);

  useEffect(() => {
    const resize = () => setViewport({ width: innerWidth, height: innerHeight });
    addEventListener('resize', resize);
    return () => removeEventListener('resize', resize);
  }, []);
  useEffect(() => {
    setActiveDoor(null); setSelecting(false);
    stage.current?.focus({ preventScroll: true });
    document.title = `${scene.name} · Get-Ya! 최종 미리보기`;
    const sources = new Set();
    const collect = node => {
      if (node?.src) sources.add(node.src);
      node?.children?.forEach(collect);
    };
    if (scene.next) collect(layouts[scene.next] ?? scenes[scene.next]);
    scene.links.forEach(link => collect(layouts[link.target]));

    // Warm the full TV sequence on the preceding result screen. Loading an
    // image should never extend the time a visitor spends in the static.
    let upcoming = scenes[scene.next];
    while (upcoming && autoTransitionDelay(upcoming, scenes[upcoming.next]) != null) {
      collect(layouts[upcoming.id]);
      upcoming = scenes[upcoming.next];
      if (upcoming) collect(layouts[upcoming.id]);
    }
    sources.forEach(source => { const image = new Image(); image.src = assetUrl(source); });
    return () => { clearTimeout(timer.current); timer.current = null; };
  }, [sceneId, scene.name]);
  useEffect(() => {
    if (!notice) return;
    const handle = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(handle);
  }, [notice]);
  useEffect(() => {
    if (automaticDelay == null || !scene.next) return;
    const handle = setTimeout(() => setSceneId(scene.next), automaticDelay);
    return () => clearTimeout(handle);
  }, [sceneId, scene.next, automaticDelay]);

  const go = target => { if (scenes[target]) setSceneId(target); };
  const next = () => { if (reveal.typing) reveal.finish(); else if (scene.next) go(scene.next); };
  const home = () => { clearTimeout(timer.current); timer.current = null; setNickname(''); setPreviewReview(null); go(START); };
  const start = () => { if (password.current) password.current.value = ''; go(scene.next); };
  const activate = (link, i) => {
    if (['choice', 'topics'].includes(scene.kind)) {
      if (timer.current) return;
      setActiveDoor(i); setSelecting(true);
      timer.current = setTimeout(() => { timer.current = null; go(link.target); }, 180);
    } else {
      if (scene.kind === 'reviews') {
        setPreviewReview(null);
        if (link.target === START) setNickname('');
        setNotice('');
      }
      go(link.target);
    }
  };
  const submitReview = draft => {
    const entry = {
      ...draft,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const author = nickname.trim();
    if (author && draft.body && (!isLocalGame || draft.share)) entry.author = author;
    if (isLocalGame) {
      try {
        setReviews(saveReview(entry));
      } catch {
        setNotice('응답을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.');
        return;
      }
    }
    setPreviewReview(!isLocalGame && draft.body ? entry : null);
    setNotice(isLocalGame ? '전시 노트북에 응답을 저장했습니다.' : '작성 체험을 완료했습니다.');
    go('32:2441');
  };
  const visibleReviews = reviews.filter(review => review.share && review.body);
  if (previewReview) {
    visibleReviews.unshift(previewReview);
  }
  const keyDown = event => {
    if (event.target !== stage.current || event.repeat || !['Enter', ' '].includes(event.key)) return;
    if (scene.next || reveal.typing) { event.preventDefault(); next(); }
  };
  const sound = () => setNotice('음악과 효과음은 아직 연결되지 않았습니다.');
  const buttonLinks = scene.links.filter(link => link.id !== scene.id && (!scene.next || link.label));

  return <main className="game-shell final-game">
    <div className="stage-wrapper" style={{ width: scene.width * scale, height: scene.height * scale }}>
      <section ref={stage} tabIndex={-1} className="game-stage" style={{ width: scene.width, height: scene.height, transform: `scale(${scale})` }}
        data-scene-id={sceneId} data-transition-kind={automaticDelay != null ? scene.kind : undefined}
        data-typing={reveal.typing} onKeyDown={keyDown} aria-label={scene.name}>
        <div className="visual-layers">{scene.kind === 'opening' ? <Opening scene={scene} /> : <FinalLayers key={sceneId} layer={layouts[sceneId]} scene={scene} activeDoor={activeDoor} reveal={reveal}
          actions={{ home, sound, start, assetError: () => setNotice('이미지를 불러오지 못했습니다.') }} />}</div>

        <GameLogo />
        {chapter && <div className="final-chapter pixel-progress" aria-label={`챕터 ${chapter}`}>1/{chapter}</div>}

        {scene.next && !['start', 'noise', 'warning'].includes(scene.kind) &&
          <DialogueAdvance sceneId={sceneId} scale={scale} onAdvance={next} />}
        {!scene.next && reveal.typing && <DialogueAdvance sceneId={sceneId} scale={scale} onAdvance={next} />}

        {!['start', 'review'].includes(scene.kind) && buttonLinks.map((link, i) =>
          <Target key={link.id} link={link} disabled={selecting} onClick={() => activate(link, i)}
            onHover={['choice', 'topics'].includes(scene.kind) ? value => { if (!selecting) setActiveDoor(value === false ? null : i); } : undefined} />)}

        {scene.kind === 'start' && <form className="final-start-form" onSubmit={event => { event.preventDefault(); start(); }}>
          <label className="sr-only" htmlFor="final-username">Username</label>
          <input id="final-username" className="final-username" value={nickname} maxLength={20} autoComplete="off" placeholder="이름" onChange={e => setNickname(e.target.value)} />
          <label className="sr-only" htmlFor="final-password">Pw</label>
          <input ref={password} id="final-password" className="final-password" type="password" maxLength={64} autoComplete="off" placeholder="패스워드"
            title="컨펌용 입력란입니다. 입력값은 저장하거나 서버로 전송하지 않습니다." />
          <button className="sr-only" type="submit">게임 시작</button>
        </form>}

        {scene.kind === 'review' && <ReviewSurvey exhibition={isLocalGame} onSubmit={submitReview}
          canBrowse={scene.links.length > 0} onBrowse={() => go('32:2441')} />}
        {scene.kind === 'reviews' && <ReviewList reviews={visibleReviews} previewId={previewReview?.id} />}
        {scene.kind === 'reviews' && canExport && <button type="button" className="review-export"
          onClick={() => downloadReviews(readReviews())}>저장된 응답 내려받기</button>}
      </section>
    </div>
    {['review', 'reviews'].includes(scene.kind) && <aside className="final-local-note">{isLocalGame ? '전시용 · 다른 관람객에게는 공개에 동의한 후기와 유저네임이 표시됩니다.' : '컨펌용 · 응답을 저장하거나 전송하지 않습니다.'}</aside>}
    {notice && <div className="notice" role="status">{notice}</div>}
    <p className="sr-only" aria-live="polite">{scene.name}</p>
  </main>;
}
