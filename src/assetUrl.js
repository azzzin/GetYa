// Keep local public assets relative to the published site's directory.
export function assetUrl(path) {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return path;
  return import.meta.env.BASE_URL + path.slice(1);
}
