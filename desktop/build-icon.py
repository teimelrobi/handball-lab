"""Generate a 256x256 Windows icon from the existing KéziStat logo."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root / "icons" / "apple-touch-icon.png"
target = root / "desktop" / "generated-icon.ico"
if not source.is_file():
    raise SystemExit(f"Missing icon source: {source}")
with Image.open(source) as original:
    icon = original.convert("RGBA")
    # Electron Builder requires an actual 256x256 frame inside the ICO.
    # Upscale small source images instead of silently omitting the large frame.
    icon = icon.resize((256, 256), Image.Resampling.LANCZOS)
    icon.save(target, format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
with Image.open(target) as check:
    available = check.info.get("sizes", set())
    if (256, 256) not in available:
        raise SystemExit(f"Generated ICO missing 256x256 frame: {available}")
print(f"Windows icon generated: {target} ({target.stat().st_size} bytes)")
