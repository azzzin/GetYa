"""Share byte-identical Figma downloads without changing their image content."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
manifest_path = ROOT / 'design/asset-manifest.json'
manifest = json.loads(manifest_path.read_text())
seen = {}
replacements = {}
duplicates = []
for name in sorted(set(manifest.values())):
    path = ROOT / 'public/assets' / name
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest in seen:
        replacements[name] = seen[digest]
        duplicates.append(path)
    else:
        seen[digest] = name
layouts_path = ROOT / 'src/data/layouts.json'
layouts = layouts_path.read_text()
for old, new in replacements.items():
    layouts = layouts.replace('/assets/' + old, '/assets/' + new)
layouts_path.write_text(layouts)
manifest_path.write_text(json.dumps({url: replacements.get(name, name) for url, name in manifest.items()}, indent=2))
# Only remove redundant files produced by our own downloader in this task.
for path in duplicates:
    path.unlink()
print(f'{len(seen)} unique original assets; {len(duplicates)} redundant downloads consolidated.')
