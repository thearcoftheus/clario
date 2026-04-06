import { execSync } from 'child_process';

// Parse command line arguments
const args = process.argv.slice(2);
const isLocal = process.env.NODE_ENV === 'local';
const artisanCommand = isLocal ? 'ddev artisan' : 'php artisan';

// Check for --url flag to override VITE_API_URL
const urlArgIndex = args.indexOf('--url');
let apiUrl = null;
if (urlArgIndex !== -1 && args[urlArgIndex + 1]) {
    apiUrl = args[urlArgIndex + 1];
}

// Check for --production flag (shortcut for common production setup)
const isProduction = args.includes('--production');
if (isProduction && !apiUrl) {
    // In production mode without --url, require VITE_API_URL to be set to non-localhost
    const envUrl = process.env.VITE_API_URL;
    if (!envUrl || envUrl.includes('localhost')) {
        console.error('\x1b[31m%s\x1b[0m', 'Error: Production build requires VITE_API_URL to be set to your remote server URL.');
        console.error('\x1b[33m%s\x1b[0m', 'Either:');
        console.error('  1. Set VITE_API_URL in your .env file to your production URL');
        console.error('  2. Use: npm run build:production -- --url https://your-server.com');
        process.exit(1);
    }
}

// Build environment variables to pass to Vite
const env = { ...process.env };
if (apiUrl) {
    env.VITE_API_URL = apiUrl;
    console.log(`\x1b[36m%s\x1b[0m`, `Building with API URL: ${apiUrl}`);
} else if (process.env.VITE_API_URL) {
    console.log(`\x1b[36m%s\x1b[0m`, `Building with API URL: ${process.env.VITE_API_URL}`);
}

// Generate Ziggy routes
execSync(`${artisanCommand} ziggy:generate --types`, { stdio: 'inherit' });

// Run Vite builds with the environment
const execOptions = { stdio: 'inherit', env };

execSync(`vite build`, execOptions);
execSync(`vite build --config vite.config.content.ts`, execOptions);
execSync(`vite build --config vite.config.background.ts`, execOptions);

console.log('\x1b[32m%s\x1b[0m', '\n✓ Build complete!');
if (apiUrl || process.env.VITE_API_URL) {
    console.log(`\x1b[32m%s\x1b[0m`, `✓ Extension configured to use: ${apiUrl || process.env.VITE_API_URL}`);
}
