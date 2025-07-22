import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import fs from 'node:fs';
import { resolve } from 'node:path';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => ({
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
        {
            name: 'copy-static-assets',
            buildEnd() {
                const env = loadEnv(mode, process.cwd(), '');

                const iconSizes = [16, 48, 128];
                const targetDir = resolve(__dirname, 'chrome_extension');
                let sourceDir = resolve(__dirname, `resources/icons/${env.APP_ENV}`);

                if (!fs.existsSync(sourceDir)) sourceDir = resolve(__dirname, `resources/icons/default`);

                iconSizes.forEach(size => {
                    const sourceFile = resolve(sourceDir, `icon-${size}.png`);
                    const targetFile = resolve(targetDir, `icon-${size}.png`);

                    if (fs.existsSync(sourceFile)) {
                        fs.copyFileSync(sourceFile, targetFile);
                        console.log(`Copied icon-${size}.png`);
                    } else {
                        console.warn(`Warning: icon-${size}.png not found`);
                    }
                });
            },
        },
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './resources/js'),
            'ziggy-js': resolve(__dirname, 'vendor/tightenco/ziggy'),
        },
    },
    build: {
        emptyOutDir: true,
        outDir: 'chrome_extension/build',
        sourcemap: true,
        copyPublicDir: false,
        rollupOptions: {
            input: 'resources/js/sidebar.ts',
            output: {
                entryFileNames: `[name].js`,
                chunkFileNames: `[name]-[hash].js`,
                assetFileNames: `assets/[name].[ext]`,
            },
        },
    },
}));
