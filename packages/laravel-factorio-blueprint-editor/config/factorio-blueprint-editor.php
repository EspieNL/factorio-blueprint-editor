<?php

return [
    'title' => env('FBE_APP_TITLE', 'Factorio Blueprint Editor'),
    'exporter_working_directory' => env(
        'FBE_EXPORTER_WORKING_DIRECTORY',
        base_path('../packages/exporter')
    ),
    'exporter_output_directory' => env(
        'FBE_EXPORTER_OUTPUT_DIRECTORY',
        base_path('../packages/exporter/data/output')
    ),
    'cargo_binary' => env('FBE_CARGO_BINARY', 'cargo'),
    'factorio_username' => env('FACTORIO_USERNAME'),
    'factorio_token' => env('FACTORIO_TOKEN'),
];