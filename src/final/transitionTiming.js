// A short burst of static, a second burst, then the clean warning frame.
export const TV_TIMING = { firstNoise: 650, secondNoise: 500, warning: 700 };

export function autoTransitionDelay(scene, nextScene) {
  if (scene.kind === 'noise') return nextScene?.kind === 'noise' ? TV_TIMING.firstNoise : TV_TIMING.secondNoise;
  if (scene.kind === 'warning') return TV_TIMING.warning;
  return null;
}
