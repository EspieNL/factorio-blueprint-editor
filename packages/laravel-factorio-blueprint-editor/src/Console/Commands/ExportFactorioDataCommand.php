<?php

namespace FactorioBlueprintEditorLaravel\Console\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Process\Process;

class ExportFactorioDataCommand extends Command
{
    protected $signature = 'factorio-blueprint-editor:export-data';

    protected $description = 'Run the Rust exporter and refresh the data served by the Laravel app.';

    public function handle(): int
    {
        $workingDirectory = (string) config('factorio-blueprint-editor.exporter_working_directory');
        $cargoBinary = (string) config('factorio-blueprint-editor.cargo_binary', 'cargo');

        if (!is_dir($workingDirectory) || !is_file($workingDirectory.'/Cargo.toml')) {
            $this->error('Exporter working directory is invalid. Check factorio-blueprint-editor config.');

            return self::FAILURE;
        }

        $env = array_filter([
            'FACTORIO_USERNAME' => config('factorio-blueprint-editor.factorio_username'),
            'FACTORIO_TOKEN' => config('factorio-blueprint-editor.factorio_token'),
        ], static fn ($value) => filled($value));

        $process = new Process([$cargoBinary, 'run', '--release'], $workingDirectory, $env ?: null);
        $process->setTimeout(null);

        $this->info('Running exporter...');

        $process->run(function (string $type, string $buffer): void {
            if ($type === Process::ERR) {
                $this->output->write('<fg=red>'.$buffer.'</>');

                return;
            }

            $this->output->write($buffer);
        });

        if (!$process->isSuccessful()) {
            $this->error('Exporter failed.');

            return self::FAILURE;
        }

        $this->info('Exporter output refreshed.');

        return self::SUCCESS;
    }
}