import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.js', 'resources/js/factorio-blueprint-editor.js'],
            refresh: true,
        }),
        tailwindcss(),
    ],
    optimizeDeps: {
        exclude: ['@fbe/editor'],
    },
    resolve: {
        preserveSymlinks: true,
    },
    server: {
        fs: {
            allow: ['..'],
        },
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
