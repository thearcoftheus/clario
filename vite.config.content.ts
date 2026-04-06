import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
    plugins: [
        tailwindcss(),
        vue({
            template: {
                transformAssetUrls: {
                    base: null,
                    includeAbsolute: false,
                },
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './resources/js'),
            'ziggy-js': resolve(__dirname, 'vendor/tightenco/ziggy'),
        },
    },
    build: {
        emptyOutDir: false,
        outDir: 'chrome_extension/build',
        sourcemap: true,
        copyPublicDir: false,
        rollupOptions: {
            input: 'resources/js/content.ts',
            output: {
                format: 'iife',
                inlineDynamicImports: true,
                entryFileNames: `[name].js`,
                chunkFileNames: `[name]-[hash].js`,
                assetFileNames: `assets/[name].[ext]`,
            },
        },
    },
}));
