<?php

namespace FactorioBlueprintEditorLaravel\Http\Controllers;

use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class DataAssetController
{
    public function exportedData(string $path): BinaryFileResponse
    {
        $root = config('factorio-blueprint-editor.exporter_output_directory');

        return $this->serve($this->resolvePath($root, $path));
    }

    public function packageAsset(string $path): BinaryFileResponse
    {
        $root = dirname(__DIR__, 3).'/public';

        return $this->serve($this->resolvePath($root, $path));
    }

    private function resolvePath(string $root, string $path): string
    {
        $resolvedRoot = realpath($root);
        $resolvedPath = realpath($root.'/'.ltrim($path, '/'));

        if (!$resolvedRoot || !$resolvedPath || !str_starts_with($resolvedPath, $resolvedRoot)) {
            throw new NotFoundHttpException();
        }

        return $resolvedPath;
    }

    private function serve(string $path): BinaryFileResponse
    {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $mimeType = match ($extension) {
            'json' => 'application/json',
            'svg' => 'image/svg+xml',
            'png' => 'image/png',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'html' => 'text/html; charset=UTF-8',
            'basis' => 'application/octet-stream',
            default => mime_content_type($path) ?: 'application/octet-stream',
        };

        return response()->file($path, [
            'Content-Type' => $mimeType,
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }
}