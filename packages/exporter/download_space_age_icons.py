#!/usr/bin/env python3
"""Download Space Age icons from Factorio Wiki and convert to .basis format."""

import json
import os
import re
import subprocess
import sys
import urllib.request
import urllib.error
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

DATA_JSON = Path("data/output/data.json")
OUTPUT_DIR = Path("data/output")
BASISU = Path("./basisu")

# Map from Factorio icon filenames to wiki page names
# Wiki uses Title_Case with underscores
def icon_path_to_wiki_name(icon_path: str) -> str:
    """Convert a Factorio icon path to wiki image name.
    e.g. __space-age__/graphics/icons/quantum-processor.png -> Quantum_processor.png
    """
    filename = os.path.basename(icon_path)  # quantum-processor.png
    name = filename.replace(".png", "")  # quantum-processor
    # Wiki names: replace hyphens with underscores, capitalize first letter
    wiki_name = name.replace("-", "_")
    wiki_name = wiki_name[0].upper() + wiki_name[1:]
    return wiki_name + ".png"


def icon_path_to_wiki_name_variants(icon_path: str) -> list[str]:
    """Generate multiple wiki URL variants for an icon path."""
    filename = os.path.basename(icon_path)
    name = filename.replace(".png", "")
    
    variants = []
    
    # Variant 1: Simple capitalize + underscore
    v1 = name.replace("-", "_")
    v1 = v1[0].upper() + v1[1:]
    variants.append(v1 + ".png")
    
    # Variant 2: Title case each word
    words = name.split("-")
    v2 = "_".join(w.capitalize() for w in words)
    variants.append(v2 + ".png")
    
    # Variant 3: For fluid icons, try without the fluid/ prefix  
    if "/fluid/" in icon_path:
        v3 = name.replace("-", "_")
        v3 = v3[0].upper() + v3[1:]
        variants.append(v3 + "_(fluid).png")
    
    # Variant 4: original name with hyphens replaced
    variants.append(name.replace("-", " ").title().replace(" ", "_") + ".png")
    
    return list(dict.fromkeys(variants))  # dedupe preserving order


def download_icon(icon_path: str, output_dir: Path) -> tuple[str, bool, str]:
    """Download an icon from Wiki. Returns (path, success, message)."""
    # Determine output path
    basis_path = output_dir / icon_path.replace(".png", ".basis")
    png_path = output_dir / icon_path.replace(".png", ".png")
    
    if basis_path.exists():
        return (icon_path, True, "already exists")
    
    # Try variants
    variants = icon_path_to_wiki_name_variants(icon_path)
    
    png_path.parent.mkdir(parents=True, exist_ok=True)
    
    for wiki_name in variants:
        url = f"https://wiki.factorio.com/images/{wiki_name}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "FactorioBlueprintEditor/1.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = resp.read()
                if len(data) < 100:  # Too small, probably error page
                    continue
                png_path.write_bytes(data)
                return (icon_path, True, f"downloaded from {wiki_name}")
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
            continue
    
    return (icon_path, False, f"not found (tried: {', '.join(variants)})")


def convert_to_basis(png_path: Path, basis_path: Path) -> bool:
    """Convert a PNG to .basis format using basisu."""
    try:
        result = subprocess.run(
            [str(BASISU), "-no_multithreading", "-mipmap", "-file", str(png_path), "-output_file", str(basis_path)],
            capture_output=True, timeout=30
        )
        return result.returncode == 0
    except Exception as e:
        print(f"  Error converting {png_path}: {e}")
        return False


def main():
    # Extract all space-age/quality/elevated-rails icon paths from data.json
    with open(DATA_JSON) as f:
        text = f.read()
    
    paths = sorted(set(re.findall(
        r'"(__(?:space-age|quality|elevated-rails)__/graphics/(?:icons|item-group)/[^"]+\.png)"',
        text
    )))
    
    print(f"Found {len(paths)} Space Age icon paths to download")
    
    # Download icons in parallel
    downloaded = []
    failed = []
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(download_icon, p, OUTPUT_DIR): p for p in paths}
        for i, future in enumerate(as_completed(futures)):
            path, success, msg = future.result()
            status = "OK" if success else "FAIL"
            print(f"  [{i+1}/{len(paths)}] {status}: {path} ({msg})")
            if success and msg != "already exists":
                downloaded.append(path)
            elif not success:
                failed.append(path)
    
    print(f"\nDownloaded: {len(downloaded)}, Failed: {len(failed)}, Already existed: {len(paths) - len(downloaded) - len(failed)}")
    
    if failed:
        print(f"\nFailed icons ({len(failed)}):")
        for p in sorted(failed):
            print(f"  - {p}")
    
    # Convert downloaded PNGs to .basis
    if downloaded and BASISU.exists():
        print(f"\nConverting {len(downloaded)} PNGs to .basis format...")
        converted = 0
        for path in downloaded:
            png_path = OUTPUT_DIR / path
            basis_path = OUTPUT_DIR / path.replace(".png", ".basis")
            if convert_to_basis(png_path, basis_path):
                converted += 1
                # Remove the PNG after conversion
                png_path.unlink(missing_ok=True)
            else:
                print(f"  Failed to convert: {path}")
        print(f"Converted {converted}/{len(downloaded)} files to .basis")
    elif downloaded and not BASISU.exists():
        print(f"\nWarning: basisu not found at {BASISU}. PNGs downloaded but not converted.")
        print("Run basisu manually or set the correct path.")
    
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
