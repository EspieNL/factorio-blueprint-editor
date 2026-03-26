-- Data Exporter Control Script for Factorio Blueprint Editor
-- Supports: Base Game + Space Age Expansion
--
-- This script extracts all game prototypes including:
-- - Items, recipes, fluids, signals
-- - Entities (machines, belts, rails, etc.)
-- - Item groups and subgroups (including Space Age groups like 'planets', 'space-platform')
-- - Tiles, sprites, and GUI styles
-- - Game constants and defines

script.on_init(function()
    -- EXTRACT SERIALIZED DATA
    local l = tonumber(prototypes.entity["FBE-DATA-COUNT"].localised_name)
    local serialized = ""
    for i = 1, l, 1 do
        serialized = serialized .. prototypes.entity["FBE-DATA-" .. tostring(i)].localised_name
    end
    local data = load(serialized)()
    helpers.write_file('data.json', helpers.table_to_json(data), false, 0)
    error("!EXIT!")
end)
