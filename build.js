import { execSync } from 'child_process';

const isLocal = process.env.NODE_ENV === 'local';
const artisanCommand = isLocal ? 'ddev artisan' : 'php artisan';

execSync(`${artisanCommand} ziggy:generate --types`, { stdio: 'inherit' });

execSync(`vite build`, { stdio: 'inherit' });

execSync(`vite build --config vite.config.content.ts`, { stdio: 'inherit' });

execSync(`vite build --config vite.config.background.ts`, { stdio: 'inherit' });
