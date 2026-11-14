import { assetUrl } from './assetUrl.js';

export function createGameAudio(config, report) {
  let bgm;
  let click;
  let enabled = Boolean(config.bgm || config.click);
  let started = false;
  const configured = Boolean(config.bgm || config.click);

  function prepare() {
    if (config.bgm && !bgm) {
      bgm = new Audio(assetUrl(config.bgm));
      bgm.loop = true;
      bgm.volume = config.bgmVolume;
      bgm.addEventListener('error', () => report('배경음악 파일을 불러오지 못했습니다.'));
    }
    if (config.click && !click) {
      click = new Audio(assetUrl(config.click));
      click.volume = config.clickVolume;
      click.addEventListener('error', () => report('효과음 파일을 불러오지 못했습니다.'));
    }
  }

  async function playBgm() {
    if (!enabled || !started || !bgm || document.hidden) return;
    try { await bgm.play(); }
    catch { report('소리 켜기를 누르면 배경음악을 다시 재생합니다.'); }
  }

  function visibilityChanged() {
    if (document.hidden) bgm?.pause();
    else void playBgm();
  }
  document.addEventListener('visibilitychange', visibilityChanged);

  return {
    start() {
      prepare();
      started = true;
      void playBgm();
    },
    setEnabled(value) {
      if (!configured) {
        report('배경음악과 효과음은 준비 중입니다. 현재는 무음으로 플레이할 수 있어요.');
        return false;
      }
      prepare();
      enabled = value;
      if (enabled) void playBgm();
      else { bgm?.pause(); click?.pause(); }
      return enabled;
    },
    click() {
      if (!enabled || !click) return;
      click.currentTime = 0;
      void click.play().catch(() => report('효과음을 재생하지 못했습니다.'));
    },
    dispose() {
      document.removeEventListener('visibilitychange', visibilityChanged);
      bgm?.pause(); click?.pause();
      bgm = undefined; click = undefined;
    },
    configured,
    isEnabled: () => enabled && started,
  };
}
