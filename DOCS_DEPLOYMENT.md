# Documentation Deployment Guide

This guide explains how to deploy the Response Handler documentation site using VitePress.

## Local Development

### Prerequisites

- Node.js (v16+)
- npm or yarn

### Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run docs:dev
```

3. Open your browser to `http://localhost:5173`

### Build for Production

```bash
npm run docs:build
```

The built site will be in the `.vitepress/dist` directory.

### Preview Production Build

```bash
npm run docs:preview
```

## GitHub Pages Deployment

The repository is already configured with GitHub Actions for automatic deployment to GitHub Pages.

### Automatic Deployment

1. **Push to main branch** - The documentation will automatically build and deploy
2. **GitHub Actions workflow** - Located at `.github/workflows/docs.yml`
3. **GitHub Pages** - Site will be available at `https://username.github.io/response-handler`

### Manual Deployment

If you need to deploy manually:

1. Build the documentation:
```bash
npm run docs:build
```

2. Deploy the `.vitepress/dist` folder to your hosting provider

## Deployment Platforms

### Netlify

1. Connect your GitHub repository to Netlify
2. Set build command: `npm run docs:build`
3. Set publish directory: `.vitepress/dist`
4. Deploy

### Vercel

1. Connect your GitHub repository to Vercel
2. Set build command: `npm run docs:build`
3. Set output directory: `.vitepress/dist`
4. Deploy

### GitHub Pages (Manual)

1. Build the documentation:
```bash
npm run docs:build
```

2. Push the contents of `.vitepress/dist` to the `gh-pages` branch:
```bash
# Build the docs
npm run docs:build

# Navigate to build output
cd .vitepress/dist

# Initialize git and commit
git init
git add -A
git commit -m 'Deploy documentation'

# Push to gh-pages branch
git push -f git@github.com:username/response-handler.git main:gh-pages

cd -
```

### Custom Domain

To use a custom domain with GitHub Pages:

1. Add a `CNAME` file to the `public` directory with your domain
2. Configure DNS to point to `username.github.io`
3. Enable custom domain in GitHub repository settings

## Configuration

### Base URL

If deploying to a subdirectory, update the base URL in `.vitepress/config.js`:

```javascript
export default {
  base: '/response-handler/', // For GitHub Pages
  // ... other config
}
```

### Environment Variables

No environment variables are required for basic deployment. All configuration is handled in `.vitepress/config.js`.

## Site Structure

The documentation site includes:

- **Homepage** (`/`) - Overview and quick start
- **Guide** (`/guide/`) - Getting started guides
- **API Reference** (`/api/`) - Complete API documentation
- **Examples** (`/examples/`) - Real-world usage examples
- **Configuration** (`/config/`) - Configuration options

## Navigation

The site uses a responsive sidebar navigation that changes based on the current section:

- **Guide section** - Shows getting started and configuration
- **API section** - Shows all API reference pages
- **Examples section** - Shows all example categories

## Search

The site includes local search functionality powered by VitePress.

## Troubleshooting

### Build Errors

1. **Missing dependencies**: Run `npm install`
2. **Node version**: Ensure Node.js v16+ is installed
3. **Clear cache**: Delete `.vitepress/cache` and rebuild

### Navigation Issues

1. **Check file paths** - Ensure all markdown files exist
2. **Update config** - Verify `.vitepress/config.js` sidebar configuration
3. **Restart dev server** - Changes to config require restart

### Deployment Issues

1. **GitHub Pages**: Check repository settings and Actions tab
2. **Base URL**: Ensure base URL matches deployment path
3. **Permissions**: Verify GitHub Actions has write permissions

## Performance

The documentation site is optimized for performance:

- **Static generation** - All pages pre-rendered
- **Code splitting** - JavaScript loaded on demand
- **Image optimization** - Automatic image optimization
- **Search indexing** - Local search with minimal bundle size

## Monitoring

Monitor your documentation site:

- **GitHub Actions** - Check build status
- **Analytics** - Add Google Analytics or similar
- **Error tracking** - Monitor for broken links
- **Performance** - Use Lighthouse for performance metrics
