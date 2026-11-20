import { useEffect, useReducer, useRef, useState } from 'react';
import GameLogo from './components/GameLogo.jsx';
import DesignLayers from './components/DesignLayers.jsx';
import layouts from './data/layouts.json';
import { gameReducer, initialGame, scenes } from './data/story.js';
import { settings } from './data/settings.js';
import { createGameAudio } from './audio.js';
import { assetUrl } from './assetUrl.js';
import { useEndingTypewriter } from './useEndingTypewriter.js';
import DialogueAdvance from './components/DialogueAdvance.jsx';

const previewRoute = import.meta.env.DEV ? new URLSearchParams(location.search).get('endingPreview') : null;
const previewEnabled = ['career', 'friend'].includes(previewRoute);
function initialPreviewGame() {
  return previewEnabled ? { sceneId: previewRoute === 'friend' ? '1:665' : '1:1624', route: previewRoute, history: [] } : initialGame();
}

function useStageScale() {
  const [scale, setScale] = useState(() => Math.min(innerWidth / 1920, innerHeight / 1080));
  useEffect(() => {
    const resize = () => setScale(Math.min(innerWidth / 1920, innerHeight / 1080));
    addEventListener('resize', resize);
    return () => removeEventListener('resize', resize);
  }, []);
  return scale;
}

function HitButton({ rect, label, onClick, disabled = false, title, ...events }) {
  return <button type="button" className="hit-button"
    style={{ left: rect[0], top: rect[1], width: rect[2], height: rect[3] }}
    aria-label={label} onClick={onClick} disabled={disabled} title={title} {...events} />;
}

export default function App() {
  const [game, dispatch] = useReducer(gameReducer, undefined, initialPreviewGame);
  const [nickname, setNickname] = useState('');
  const [notice, setNotice] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [activeDoor, setActiveDoor] = useState(null);
  const [selectionPending, setSelectionPending] = useState(false);
  const choiceTimer = useRef(null);
  const audio = useRef(null);
  const stage = useRef(null);
  const scale = useStageScale();
  const current = scenes[game.sceneId];
  const typewriter = useEndingTypewriter(game.sceneId, previewEnabled);

  useEffect(() => {
    setActiveDoor(null);
    setSelectionPending(false);
    return () => clearTimeout(choiceTimer.current);
  }, [game.sceneId]);

  useEffect(() => {
    audio.current = createGameAudio(settings.audio, setNotice);
    return () => { audio.current?.dispose(); audio.current = null; };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(''), 5500);
    return () => clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    document.title = `${current.title} · Get-Ya!`;
    // Move focus to the scene, so keyboard users do not activate a stale button.
    stage.current?.focus({ preventScroll: true });
    // Warm the next scenes' assets without blocking the current screen.
    const nextIds = current.choices?.map(choice => choice.target) ?? [current.next];
    const urls = new Set();
    const collect = layer => {
      if (!layer) return;
      if (layer.src) urls.add(layer.src);
      layer.children?.forEach(collect);
    };
    nextIds.forEach(id => collect(layouts[id]));
    urls.forEach(src => { const image = new Image(); image.src = assetUrl(src); });
  }, [game.sceneId, current]);

  const advance = choiceIndex => {
    if (choiceIndex == null && typewriter.typing) {
      typewriter.finish();
      return;
    }
    audio.current?.click();
    dispatch({ type: 'advance', choiceIndex });
  };
  const chooseDoor = index => {
    if (choiceTimer.current) return;
    setActiveDoor(index);
    setSelectionPending(true);
    // Let mouse, touch and keyboard players see the opened door before moving on.
    choiceTimer.current = setTimeout(() => {
      choiceTimer.current = null;
      advance(index);
    }, 180);
  };
  const doorEvents = index => ({
    onPointerEnter: () => { if (!selectionPending) setActiveDoor(index); },
    onPointerLeave: () => { if (!selectionPending) setActiveDoor(null); },
    onFocus: () => { if (!selectionPending) setActiveDoor(index); },
    onBlur: () => { if (!selectionPending) setActiveDoor(null); },
    onPointerDown: () => { if (!selectionPending) setActiveDoor(index); },
    'aria-disabled': selectionPending,
  });
  const start = () => {
    audio.current?.start();
    setSoundEnabled(audio.current?.isEnabled() ?? false);
    advance();
  };
  const restart = () => {
    clearTimeout(choiceTimer.current);
    choiceTimer.current = null;
    audio.current?.click();
    dispatch({ type: 'restart' });
    setNotice('');
    setNickname('');
  };
  const soundOn = () => setSoundEnabled(audio.current?.setEnabled(true) ?? false);
  const soundOff = () => {
    audio.current?.setEnabled(false);
    setSoundEnabled(false);
  };
  const keyDown = event => {
    if (event.target !== stage.current || event.repeat || !['Enter', ' '].includes(event.key)) return;
    if ((!current.next && !typewriter.typing) || current.kind === 'start') return;
    event.preventDefault();
    advance();
  };

  return <main className="game-shell">
    <div className="stage-wrapper" style={{ width: 1920 * scale, height: 1080 * scale }}>
      <section ref={stage} tabIndex={-1} className="game-stage" aria-label={current.title}
        data-scene-id={game.sceneId} data-route={game.route ?? ''} data-typing={typewriter.typing}
        style={{ transform: `scale(${scale})` }} onKeyDown={keyDown}>
        <div className="visual-layers">
          <DesignLayers layer={layouts[game.sceneId]} phase={current.phase} activeDoor={activeDoor} reveal={typewriter.reveal}
            actions={{ home: restart, soundOn, soundOff, start,
              next: undefined }}
            onAssetError={() => setNotice('이미지를 불러오지 못했습니다. 새로고침해 주세요.')} />
        </div>
        <GameLogo />

        {((current.next && current.kind !== 'start') || typewriter.typing) &&
          <DialogueAdvance sceneId={game.sceneId} scale={scale} onAdvance={() => advance()} />}

        {current.kind === 'start' && <form className="start-form" onSubmit={event => { event.preventDefault(); start(); }}>
          <label className="sr-only" htmlFor="nickname">닉네임 (선택)</label>
          <input id="nickname" className="nickname-input" value={nickname} onChange={event => setNickname(event.target.value)}
            maxLength={20} autoComplete="off" placeholder="닉네임" />
          <label className="sr-only" htmlFor="password">비밀번호 (저장하지 않음)</label>
          <input id="password" className="password-input" type="password" maxLength={64} autoComplete="off"
            placeholder="비밀번호" title="입력 내용은 저장하거나 전송하지 않습니다. MVP에는 로그인 기능이 없습니다." />
          <button type="submit" className="sr-only">게임 시작</button>
        </form>}

        {current.kind === 'topics' && <>
          <HitButton rect={[1183, 540, 276, 450]} label="진로 이야기 시작" onClick={() => chooseDoor(0)} {...doorEvents(0)} />
          <HitButton rect={[1475, 540, 276, 450]} label="친구 이야기 시작" onClick={() => chooseDoor(1)} {...doorEvents(1)} />
        </>}

        {current.kind === 'choice' && current.choices.map((choice, index) =>
          <HitButton key={choice.target + index} rect={[index === 0 ? 300 : 960, 685, 660, 335]}
            label={choice.label} onClick={() => chooseDoor(index)} {...doorEvents(index)} />)}

        {current.kind === 'result' &&
          <HitButton rect={[1410, 818, 380, 135]} label="엔딩 보기" onClick={() => advance()} />}
        {current.kind === 'ending' && <>
          <HitButton rect={[800, 825, 330, 125]} label="다시 하기" onClick={restart} />
          <HitButton rect={[1150, 825, 330, 125]} label="후기 남기기"
            onClick={() => {
              if (settings.reviewUrl) window.open(settings.reviewUrl, '_blank', 'noopener,noreferrer');
              else setNotice('후기 페이지는 준비 중입니다.');
            }} />
        </>}
      </section>
    </div>
    {previewEnabled && <nav className="ending-preview-bar" aria-label="로컬 엔딩 테스트">
      <span>로컬 테스트 · 1글자 / 45ms</span>
      <a href="?endingPreview=career">진로 엔딩</a>
      <a href="?endingPreview=friend">친구 엔딩</a>
      <a href={`?endingPreview=${previewRoute}`}>다시 보기</a>
    </nav>}
    <p className="sr-only" role="status" aria-live="polite">{current.title}</p>
    <span className="sr-only">{soundEnabled ? '소리 켜짐' : '소리 꺼짐'}</span>
    {notice && <div className="notice" role="status">{notice}</div>}
  </main>;
}
