# Clario

A Chrome browser extension that provides AI-powered web content analysis and enhancement features.

## Features

- **Content Reading Level Analysis**: Automatically analyzes and displays the reading difficulty level of web pages (Easy, Moderate, Challenging, Advanced)
- **Content Overview**: Generate AI-powered summaries of web page content
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

## Troubleshooting

### Extension spinner keeps spinning

If the content reading level spinner never stops:

1. Make sure the Laravel server is running (`php artisan serve`)
2. Check that `APP_URL` in `.env` is set to `http://localhost:8000`
3. Rebuild the extension (`npm run build`)
4. Reload the extension in Chrome

### Wrong Node version

If you get Node version errors:

```bash
nvm install  # Install the version from .nvmrc
nvm use      # Switch to the correct version
```

## API Endpoints

- `POST /api/readability` - Analyze content reading level
- `POST /api/overview` - Generate content overview
- `POST /api/translate` - Translate content
- `POST /api/chat` - Chat with AI about content

## License

Private project.
