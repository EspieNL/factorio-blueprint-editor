<?php

namespace FactorioBlueprintEditorLaravel\Http\Controllers;

use Illuminate\Contracts\View\View;

class EditorController
{
    public function __invoke(): View
    {
        return view('factorio-blueprint-editor::editor', [
            'title' => config('factorio-blueprint-editor.title'),
        ]);
    }
}