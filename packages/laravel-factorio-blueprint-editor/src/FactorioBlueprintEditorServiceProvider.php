<?php

namespace FactorioBlueprintEditorLaravel;

use FactorioBlueprintEditorLaravel\Console\Commands\ExportFactorioDataCommand;
use Illuminate\Support\ServiceProvider;

class FactorioBlueprintEditorServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(
            __DIR__.'/../config/factorio-blueprint-editor.php',
            'factorio-blueprint-editor'
        );
    }

    public function boot(): void
    {
        $this->loadRoutesFrom(__DIR__.'/../routes/web.php');
        $this->loadViewsFrom(__DIR__.'/../resources/views', 'factorio-blueprint-editor');

        $this->publishes([
            __DIR__.'/../config/factorio-blueprint-editor.php' => config_path('factorio-blueprint-editor.php'),
        ], 'factorio-blueprint-editor-config');

        if ($this->app->runningInConsole()) {
            $this->commands([
                ExportFactorioDataCommand::class,
            ]);
        }
    }
}