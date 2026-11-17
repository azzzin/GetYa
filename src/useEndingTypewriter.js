import { useEffect, useMemo, useState } from 'react';
import layouts from './data/layouts.json';
import content from './data/content.json';

const dialogueNodes = {
  '1:665': '1:727', '1:729': '1:791', '1:793': '1:855',
  '1:1624': '1:1686', '1:1688': '1:1750', '1:1752': '1:1814',
};

export function useEndingTypewriter(sceneId, enabled) {
  const plan = useMemo(() => {
    const offsets = {};
    let total = 0;
    function walk(node, dialogue = false) {
      dialogue ||= node['data-node-id'] === dialogueNodes[sceneId];
      if (dialogue && node.textKey) {
        offsets[node.textKey] = total;
        total += Array.from(content[node.textKey]).length;
      }
      node.children?.forEach(child => walk(child, dialogue));
    }
    if (enabled && dialogueNodes[sceneId]) walk(layouts[sceneId]);
    return { offsets, total };
  }, [sceneId, enabled]);
  const [progress, setProgress] = useState({ sceneId, count: 0 });
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const visible = reducedMotion ? plan.total : progress.sceneId === sceneId ? progress.count : 0;

  useEffect(() => {
    setProgress({ sceneId, count: 0 });
    if (!plan.total || reducedMotion) return;
    let count = 0;
    const timer = setInterval(() => {
      count = Math.min(plan.total, count + 1);
      setProgress(previous => ({ sceneId, count: previous.sceneId === sceneId ? Math.max(previous.count, count) : count }));
      if (count === plan.total) clearInterval(timer);
    }, 45);
    return () => clearInterval(timer);
  }, [sceneId, plan, reducedMotion]);

  return {
    reveal: plan.total ? { offsets: plan.offsets, visible } : null,
    typing: visible < plan.total,
    finish: () => setProgress({ sceneId, count: plan.total }),
  };
}
