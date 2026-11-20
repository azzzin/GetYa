export const REVIEW_KEY = 'getya.final.exhibition-reviews.v1';

export const isLocalGame = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

export function readReviews() {
  if (!isLocalGame) return [];
  try {
    const value = JSON.parse(localStorage.getItem(REVIEW_KEY) || '[]');
    return Array.isArray(value) ? value.filter(review =>
      review && typeof review.id === 'string' && typeof review.body === 'string') : [];
  } catch {
    return [];
  }
}

export function saveReview(review) {
  const updated = [review, ...readReviews()];
  localStorage.setItem(REVIEW_KEY, JSON.stringify(updated));
  return updated;
}

export function downloadReviews(reviews) {
  const file = new Blob([JSON.stringify(reviews, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'GetYa-exhibition-reviews.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
