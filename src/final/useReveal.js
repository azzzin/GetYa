import { useEffect, useMemo, useState } from 'react';
import content from './data/content.json';
import layouts from './data/layouts.json';

const textOf = node => node.textKey ? content[node.textKey] : (node.children ?? []).map(textOf).join(' ');

export function useReveal(scene) {
  const plan = useMemo(() => {
    const offsets = {};
    let total = 0;
    if (['ending', 'epilogue'].includes(scene.kind)) {
      const body = layouts[scene.id].children.find(node => textOf(node).trim().length > 25);
      const walk = node => {
        if (!node) return;
        if (node.textKey) { offsets[node.textKey] = total; total += Array.from(content[node.textKey]).length; }
        node.children?.forEach(walk);
      };
      walk(body);
    }
    return { offsets, total };
  }, [scene]);
  const [progress, setProgress] = useState({ sceneId: scene.id, count: 0 });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const enabled = new URLSearchParams(location.search).get('typing') !== 'off';
  const visible = !enabled || reduced ? plan.total : progress.sceneId === scene.id ? progress.count : 0;
  useEffect(() => {
    if (!enabled || reduced || !plan.total) return;
    let count = 0;
    const timer = setInterval(() => {
      count = Math.min(plan.total, count + 1);
      setProgress(previous => ({ sceneId: scene.id, count: previous.sceneId === scene.id ? Math.max(previous.count, count) : count }));
      if (count === plan.total) clearInterval(timer);
    }, 45);
    return () => clearInterval(timer);
  }, [scene.id, plan, reduced, enabled]);
  return {
    offsets: plan.offsets, visible, typing: visible < plan.total,
    finish: () => setProgress({ sceneId: scene.id, count: plan.total }),
  };
}
