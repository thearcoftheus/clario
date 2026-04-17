# Clario

A Chrome browser extension that provides AI-powered web content analysis and enhancement features.

## Features

- **Content Overview** *(orphaned — not currently wired into the UI)*: Generates a bullet-point AI summary of page content via the OverviewAgent. The backend service and API endpoint still exist and could be reintroduced as a quick-glance summary in the toolbar or sidebar.
- **Content Reading Level Analysis** *(orphaned — not currently wired into the UI)*: Computes Flesch-Kincaid reading grade for page text. The backend service and API endpoint still exist and could be reintroduced in the toolbar or sidebar in the future.
- **Side Panel Interface**: Access detailed analysis through a persistent browser sidebar

## Tech Stack

- **Backend**: Laravel (PHP)
- **Frontend**: Vue 3, TypeScript, Tailwind CSS
- **Build Tools**: Vite
- **Chrome Extension**: Manifest V3

## Prerequisites

- PHP 8.3 or higher
- Node.js v20.9.0 (specified in `.nvmrc`)
- Composer
- Chrome browser

## Setup

### 1. Install Dependencies

```bash
# Install PHP dependencies
composer install

# Install Node dependencies (make sure you're using Node v20.9.0)
nvm use
npm install
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Set the correct APP_URL (required for Chrome extension API calls)
# Edit .env and set:
APP_URL=http://localhost:8000
```

### 3. Set Up Database

```bash
# Create SQLite database
touch database/database.sqlite

# Run migrations
php artisan migrate
```

### 4. Build the Chrome Extension

```bash
npm run build
```

This will generate the extension files in the `chrome_extension/` directory.

### 5. Start the Laravel Development Server

```bash
php artisan serve
```

The server will start at `http://localhost:8000`.

**Important**: The Chrome extension requires the Laravel server to be running to function properly. The extension makes API calls to the backend for content analysis features.

### 6. Install the Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome_extension` folder from this project
5. The extension should now appear in your extensions list

## Development

### Building the Extension

After making changes to the frontend code:

```bash
npm run build
```

Then reload the extension in Chrome (click the refresh icon on the extension card at `chrome://extensions/`).

### Code Formatting

```bash
# Format code
npm run format

# Check formatting
npm run format:check

# Lint code
npm run lint
```

## Remote Deployment

You can deploy the Laravel backend to a remote server (like Cloudways) so testers can use the extension without running a local server.

### Building for Production

**Option 1: Set the URL in .env before building**

```bash
# Edit .env and set VITE_API_URL to your production server
VITE_API_URL=https://your-cloudways-app.com

# Build the extension
npm run build:production
```

**Option 2: Pass the URL directly to the build command**

```bash
npm run build:production -- --url https://your-cloudways-app.com
```

### Deploying to Cloudways

1. **Create a PHP application** on Cloudways (PHP 8.3+)

2. **Upload your Laravel code** via Git or SFTP

3. **Set up environment variables** on the server:
   - Copy `.env.example` to `.env`
   - Set `APP_URL` to your Cloudways domain
   - Set `APP_ENV=production` and `APP_DEBUG=false`
   - Add all your API keys (GEMINI_API_KEY, DID_API_KEY, etc.)

4. **Run server setup commands**:
   ```bash
   composer install --optimize-autoloader --no-dev
   php artisan key:generate
   php artisan migrate --force
   ```

5. **Build the extension for production**:
   ```bash
   npm run build:production -- --url https://your-cloudways-app.com
   ```

6. **Distribute the extension**: Share the `chrome_extension/` folder with testers. They can load it as an unpacked extension.

### API Key Authentication

The extension uses a simple API key to authenticate requests. This prevents unauthorized use of your server.

**1. Generate an API key** (any random string works):
```bash
# Example: generate a random key
openssl rand -hex 32
```

**2. Set the key on your server** (in `.env`):
```
CLARIO_API_KEY=your-generated-key-here
```

**3. Set the same key for the extension build** (in your local `.env`):
```
VITE_API_KEY=your-generated-key-here
```

**4. Build and distribute**:
```bash
npm run build:production -- --url https://your-cloudways-app.com
```

The extension will include the API key, and the server will validate it on every request.

**Note**: For local development, you can leave both `CLARIO_API_KEY` and `VITE_API_KEY` empty - the server will skip authentication if no key is configured.

## Troubleshooting

### Wrong Node version

If you get Node version errors:

```bash
nvm install  # Install the version from .nvmrc
nvm use      # Switch to the correct version
```

## API Endpoints

- `POST /api/readability` - Analyze content reading level *(orphaned — not currently called by the UI)*
- `POST /api/overview` - Generate content overview *(orphaned — not currently called by the UI)*
- `POST /api/translate` - Translate content
- `POST /api/chat` - Chat with AI about content

## License

Private project.
