import { useLayoutEffect, useRef, useState } from 'react';
import { assetUrl } from '../assetUrl.js';

const track = assetUrl('/assets/d6e3dfac-883e-4435-8fa9-4ae5af4808ba.svg');
const thumb = assetUrl('/assets/d299d751-3248-4d19-a871-3a5aac437363.svg');

export default function ReviewList({ reviews, previewId }) {
  const list = useRef(null);
  const content = useRef(null);
  const [limit, setLimit] = useState(0);
  const [position, setPosition] = useState(0);

  useLayoutEffect(() => {
    const viewport = list.current;
    function measure() {
      setLimit(Math.max(0, viewport.scrollHeight - viewport.clientHeight));
      setPosition(viewport.scrollTop);
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(content.current);
    return () => observer.disconnect();
  }, []);

  function scrollBy(amount) {
    list.current.scrollBy({ top: amount });
  }

  return <>
    <section ref={list} id="review-list" className="final-reviews" aria-label="후기 목록"
      tabIndex={0} onScroll={event => setPosition(event.currentTarget.scrollTop)}>
      <div ref={content}>
        {reviews.length ? reviews.map(review => <article key={review.id}>
          <strong>{typeof review.author === 'string' && review.author.trim()
            ? review.author
            : review.id === previewId ? '내 후기 미리보기' : '익명의 지구인'}</strong>
          <p>{review.body}</p>
        </article>) : <p className="final-empty-review">표시할 후기가 없습니다.</p>}
      </div>
    </section>
    <div className="final-review-scrollbar" style={{ '--review-scroll-thumb': `url("${thumb}")` }}>
      <img src={track} width={63} height={556} alt="" draggable={false} />
      <button type="button" className="review-scroll-up" aria-label="후기 위로" aria-controls="review-list"
        disabled={!limit || position <= 0} onClick={() => scrollBy(-120)} />
      <input type="range" aria-label="후기 스크롤" aria-controls="review-list" aria-orientation="vertical"
        min={0} max={Math.max(1, limit)} value={Math.min(position, limit)} disabled={!limit}
        onChange={event => { list.current.scrollTop = event.target.valueAsNumber; }} />
      <button type="button" className="review-scroll-down" aria-label="후기 아래로" aria-controls="review-list"
        disabled={!limit || position >= limit - 1} onClick={() => scrollBy(120)} />
    </div>
  </>;
}
