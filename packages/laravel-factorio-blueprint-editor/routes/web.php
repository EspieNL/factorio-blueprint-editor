<?php

use FactorioBlueprintEditorLaravel\Http\Controllers\DataAssetController;
use FactorioBlueprintEditorLaravel\Http\Controllers\EditorController;
use Illuminate\Support\Facades\Route;

Route::get('/', EditorController::class)->name('factorio-blueprint-editor.index');

Route::get('/data/{path}', [DataAssetController::class, 'exportedData'])
    ->where('path', '.*')
    ->name('factorio-blueprint-editor.data');

Route::get('/factorio-blueprint-editor-assets/{path}', [DataAssetController::class, 'packageAsset'])
    ->where('path', '.*')
    ->name('factorio-blueprint-editor.assets');