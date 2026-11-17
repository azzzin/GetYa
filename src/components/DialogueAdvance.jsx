import { useLayoutEffect, useRef, useState } from 'react';

// The design's image layers include the complete bubble (and its tail).
// Measure them instead of maintaining a second set of scene coordinates.
export default function DialogueAdvance({ sceneId, scale, onAdvance }) {
  const [area, setArea] = useState(null);
  const control = useRef(null);
  useLayoutEffect(() => {
    const element = control.current?.closest('.game-stage');
    const bubble = element?.querySelector('[data-name^="말풍선"], [data-name^="칸 2"], [data-name="후기 2"], [data-name="큰 칸 1"]');
    if (!bubble) { setArea(null); return; }
    const bounds = bubble.getBoundingClientRect();
    const origin = element.getBoundingClientRect();
    setArea({
      sceneId,
      left: (bounds.left - origin.left) / scale,
      top: (bounds.top - origin.top) / scale,
      width: bounds.width / scale,
      height: bounds.height / scale,
    });
  }, [sceneId, scale]);

  const { sceneId: _, ...style } = area ?? {};
  return <button ref={control} type="button" className="dialogue-advance" style={style}
    hidden={!area || area.sceneId !== sceneId}
    aria-label="다음 대사" title="말풍선을 클릭하면 대사를 넘깁니다. 글자가 나오는 중에는 전체 대사를 표시합니다."
    onClick={onAdvance} />;
}
