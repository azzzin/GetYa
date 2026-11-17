"""Download only the original assets provided by the Figma MCP response."""
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parent.parent
assets = json.loads((ROOT / 'design/final/asset-manifest.json').read_text())
target = ROOT / 'public/assets'
target.mkdir(parents=True, exist_ok=True)


def download(item):
    url, name = item
    path = target / name
    if path.exists() and path.stat().st_size:
        return
    subprocess.run(['curl', '-fsSL', '--retry', '2', '--max-time', '60', url, '-o', str(path)], check=True)
    assert path.stat().st_size, name


with ThreadPoolExecutor(max_workers=12) as pool:
    list(pool.map(download, assets.items()))
print(f'Verified {len(assets)} non-empty local Figma assets.')
