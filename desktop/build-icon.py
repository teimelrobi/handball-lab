"""Generate a valid Windows .ico from the existing KéziStat PNG icon."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root / "icons" / "apple-touch-icon.png"
target = root / "desktop" / "generated-icon.ico"
if not source.is_file():
    raise SystemExit(f"Missing icon source: {source}")
with Image.open(source) as original:
    icon = original.convert("RGBA")
    icon.save(target, format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print(f"Windows icon generated: {target} ({target.stat().st_size} bytes)")
