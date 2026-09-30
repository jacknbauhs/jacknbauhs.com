#!/usr/bin/env python3
"""Downloads the images in data/images.json that aren't in assets/img yet, converting PNG/JFIF to JPEG at the
listed name. Run by the workflow on every build (it commits what it fetched); run by hand after adding an entry.
Once a file exists, it's never fetched again, so the old site can go away without taking the pictures with it."""
from __future__ import annotations

import io
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"


def main() -> int:
    files = json.loads((ROOT / "data" / "images.json").read_text(encoding="utf-8"))["files"]
    IMG.mkdir(parents=True, exist_ok=True)
    fetched, failed = [], []
    for name, url in files.items():
        dest = IMG / name
        if dest.exists():
            continue
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (jacknbauhs.com build)"})
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
            try:
                from PIL import Image
                im = Image.open(io.BytesIO(data)).convert("RGB")
                im.thumbnail((1600, 1600))
                im.save(dest, "JPEG", quality=86, optimize=True)
            except ImportError:
                dest.write_bytes(data)
            fetched.append(name)
            print(f"fetched {name} ({dest.stat().st_size // 1024} KB)")
        except Exception as e:  # noqa: BLE001
            failed.append(name)
            print(f"could not fetch {name}: {e}", file=sys.stderr)
    print(f"{len(fetched)} fetched, {len(failed)} failed, {len(files) - len(fetched) - len(failed)} already there")
    return 0


if __name__ == "__main__":
    sys.exit(main())
