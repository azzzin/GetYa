import { useEffect, useRef, useState } from 'react';
import FinalLayers from './FinalLayers.jsx';
import DialogueAdvance from '../components/DialogueAdvance.jsx';
import { useReveal } from './useReveal.js';
import { assetUrl } from '../assetUrl.js';
import scenes from './data/scenes.json';
import layouts from './data/layouts.json';
import './design.css';
import './final.css';

const START = '32:703';
const REVIEW_KEY = 'getya.final.local-reviews.v1';
const readReviews = () => {
  try { const value = JSON.parse(localStorage.getItem(REVIEW_KEY) || '[]'); return Array.isArray(value) ? value.filter(r => typeof r.body === 'string' && typeof r.author === 'string') : []; }
  catch { return []; }
};

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
  const stage = useRef(null);
  const timer = useRef(null);
  const [viewport, setViewport] = useState({ width: innerWidth, height: innerHeight });
  const scale = Math.min(viewport.width / scene.width, viewport.height / scene.height);
  const [nickname, setNickname] = useState('');
  const password = useRef(null);
  const [activeDoor, setActiveDoor] = useState(null);
  const [selecting, setSelecting] = useState(false);
  const [notice, setNotice] = useState('');
  const [review, setReview] = useState('');
  const [reviews, setReviews] = useState(readReviews);
  const reveal = useReveal(scene);

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
      if (node.src) sources.add(node.src);
      node.children?.forEach(collect);
    };
    scene.links.forEach(link => collect(layouts[link.target]));
    sources.forEach(source => { const image = new Image(); image.src = assetUrl(source); });
    return () => { clearTimeout(timer.current); timer.current = null; };
  }, [sceneId, scene.name]);
  useEffect(() => {
    if (!notice) return;
    const handle = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(handle);
  }, [notice]);

  const go = target => { if (scenes[target]) setSceneId(target); };
  const next = () => { if (reveal.typing) reveal.finish(); else if (scene.next) go(scene.next); };
  const home = () => { clearTimeout(timer.current); timer.current = null; setNickname(''); setReview(''); go(START); };
  const start = () => { if (password.current) password.current.value = ''; go('32:826'); };
  const activate = (link, i) => {
    if (['choice', 'topics'].includes(scene.kind)) {
      if (timer.current) return;
      setActiveDoor(i); setSelecting(true);
      timer.current = setTimeout(() => { timer.current = null; go(link.target); }, 180);
    } else go(link.target);
  };
  const submitReview = () => {
    const body = review.trim();
    if (!body) { setNotice('생각을 입력한 뒤 등록해 주세요.'); return; }
    const updated = [{ id: crypto.randomUUID(), author: nickname.trim() || '지구인', body, createdAt: new Date().toISOString() }, ...reviews];
    try { localStorage.setItem(REVIEW_KEY, JSON.stringify(updated)); }
    catch { setNotice('이 브라우저에 저장하지 못했습니다. 저장 공간 설정을 확인해 주세요.'); return; }
    setReviews(updated); setReview(''); go('32:2441');
  };
  const keyDown = event => {
    if (event.target !== stage.current || event.repeat || !['Enter', ' '].includes(event.key)) return;
    if (scene.next || reveal.typing) { event.preventDefault(); next(); }
  };
  const sound = () => setNotice('음악과 효과음은 아직 연결되지 않았습니다.');
  const fullFrameClick = ['noise', 'warning'].includes(scene.kind);
  const buttonLinks = scene.links.filter(link => link.id !== scene.id && (!scene.next || link.label));

  return <main className="game-shell final-game">
    <div className="stage-wrapper" style={{ width: scene.width * scale, height: scene.height * scale }}>
      <section ref={stage} tabIndex={-1} className="game-stage" style={{ width: scene.width, height: scene.height, transform: `scale(${scale})` }}
        data-scene-id={sceneId} data-typing={reveal.typing} onKeyDown={keyDown} aria-label={scene.name}>
        <div className="visual-layers"><FinalLayers layer={layouts[sceneId]} scene={scene} activeDoor={activeDoor} reveal={reveal}
          actions={{ home, sound, start, assetError: () => setNotice('이미지를 불러오지 못했습니다.') }} /></div>

        {scene.next && !['start', 'noise', 'warning'].includes(scene.kind) &&
          <DialogueAdvance sceneId={sceneId} scale={scale} onAdvance={next} />}
        {!scene.next && reveal.typing && <DialogueAdvance sceneId={sceneId} scale={scale} onAdvance={next} />}
        {fullFrameClick && scene.next && <button type="button" className="final-frame-next" aria-label="다음 대사" onClick={next} />}

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

        {scene.kind === 'review' && <>
          <textarea className="final-review-input" aria-label="AI 과의존에 대한 내 생각" value={review} maxLength={2000} onChange={e => setReview(e.target.value)} />
          {scene.links.map(link => <Target key={link.id} link={link} onClick={() => go(link.target)} />)}
          <Target link={{ id: 'submit-review', label: '등록', rect: [1323, 844, 249, 104] }} onClick={submitReview} />
        </>}
        {scene.kind === 'reviews' && <section className="final-reviews" aria-label="저장된 후기">
          {reviews.length ? reviews.map(r => <article key={r.id}><strong>{r.author}</strong><p>{r.body}</p></article>) : <p className="final-empty-review">이 브라우저에 저장된 후기가 없습니다.</p>}
        </section>}
      </section>
    </div>
    {['review', 'reviews'].includes(scene.kind) && <aside className="final-local-note">컨펌용 미리보기 · 후기는 이 브라우저에만 저장됩니다. 패스워드는 저장하지 않습니다.</aside>}
    {notice && <div className="notice" role="status">{notice}</div>}
    <p className="sr-only" aria-live="polite">{scene.name}</p>
  </main>;
}
