# Factorio Space Age Data Update

## Status

**Exporter: ✅ Ready for Space Age (Updated 2024-03-26)**
**Data: ⚠️ Outdated (needs regeneration)**

The exporter has been updated and is fully configured to export Factorio 2.0 Space Age expansion data. However, the current `data.json` in the repository was generated with an older version and needs to be regenerated.

## What's in the Updated Exporter

The exporter now includes:
- ✅ Enhanced Space Age support comments
- ✅ Full entity prototype support including Space Age entities (`thruster`, `fusion-reactor`, `space-platform-hub`, etc.)
- ✅ Dynamic item-group discovery that automatically includes Space Age groups
- ✅ Proper handling of all expansion content (planets, space-platform, cargo systems, etc.)
- ✅ All recipe and item types with Space Age extensions

## Current Data Issue

The `packages/exporter/data/output/data.json` only contains 7 base inventory groups:

- Logistics
- Production (with 'space-related' subgroup)
- Intermediate products
- Combat
- Fluids
- Signals
- Creative

**Missing Space Age groups:**
- Planets (with planetary construction items)
- Space Platform (with platform components)
- And other Space Age specific categories

Space Age items are currently scattered:
- `cargo-wagon` → Logistics
- `space-science-pack` → Intermediate Products
- `rocket-silo`, `cargo-landing-pad`, `satellite` → Production > space-related subgroup

## How to Regenerate Data with Space Age Support

### Prerequisites

- Rust 1.70+
- Node.js 18+
- Factorio.com account credentials
- ~60 minutes for the exporter to complete

### Quick Start

1. **Get credentials:**
   ```bash
   # Create/update .env file in packages/exporter/
   FACTORIO_USERNAME=<your_username>
   FACTORIO_TOKEN=<your_token>
   ```

2. **Regenerate data:**
   ```bash
   cd packages/exporter
   cargo run --release
   ```

3. **Verify update:**
   ```bash
   python3 << 'EOF'
   import json
   with open('data/output/data.json', 'r') as f:
       data = json.load(f)
       print(f"Item groups: {len(data['inventoryLayout'])}")
       for group in data['inventoryLayout']:
           print(f"  - {group['name']}: {group.get('localised_name', 'N/A')}")
   EOF
   ```

4. **Rebuild website:**
   ```bash
   npm run build:website
   ```

## Exporter Details

### What It Does
1. Downloads Factorio 2.0.68 (with Space Age)
2. Runs the data extraction mod (`export-data`) in a headless Factorio instance
3. Processes all game prototypes:
   - Items, recipes, fluids, virtual signals
   - Entities (machines, belts, platforms, etc.)
   - Item groups (automatically discovers Space Age groups)
   - Tiles, sprites, UI styles
   - Game constants
4. Validates and compresses all PNG icons to BASIS format
5. Outputs `data.json` and accompanying asset files

### Files of Interest
- `src/main.rs` - Entry point, downloads Factorio 2.0.68
- `src/setup.rs` - Extraction and compression pipeline
- `src/export-data/data-final-fixes.lua` - **The core exporter logic** (inventory layout, entityprototypes, etc.)
- `src/export-data/control.lua` - Data serialization script
- `src/export-data/info.json` - Mod metadata

## InventoryDialog Updates

The UI has been prepared to handle expanded inventory:
- ✅ Dynamic group layout
- ✅ Horizontal scrolling for group buttons
- ✅ Handles any number of item groups
- See: [InventoryDialog.ts](packages/editor/src/UI/InventoryDialog.ts)

## Development Notes

### First Run
- Exporter downloads ~500MB of Factorio data
- Initial PNG to BASIS compression is slow (~30-60 minutes)
- Subsequent runs use caching and are much faster

### Icon Assets
- Saved to `data/output/__base__/`
- Converted to BASIS format for web delivery
- Metadata cached in `data/output/metadata.json`

### Troubleshooting

**Exporter crashes with "Factorio not found":**
- Credentials are wrong or expired
- Delete `packages/exporter/data/factorio` and retry
- Get new token from https://factorio.com/profile

**Binary size too large:**
- Is expected; data.json + images ~100-200MB
- Icons are cached; Git tracks only metadata

**Missing Space Age items after rebuild:**
- Verify data.json was generated (check timestamp)
- Clear browser cache: Ctrl+Shift+Del
- Rebuild website: `npm run build:website`

## Related Files

- [InventoryDialog.ts](packages/editor/src/UI/InventoryDialog.ts) - UI component
- [data-final-fixes.lua](packages/exporter/src/export-data/data-final-fixes.lua) - Exporter logic
- [factorioData.ts](packages/editor/src/core/factorioData.ts) - Data loading

