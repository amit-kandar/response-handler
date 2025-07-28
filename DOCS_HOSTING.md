# Documentation Hosting Guide

This guide explains how to host the Response Handler documentation using various platforms.

## 📋 Current Documentation Structure

```
├── index.md                 # Homepage
├── guide/
│   ├── quick-start.md       # Getting started guide
│   └── migration.md         # Migration guide
├── config/
│   ├── basic.md            # Basic configuration
│   └── advanced.md         # Advanced options
├── api/
│   ├── express.md          # Express API reference
│   ├── socket.md           # Socket.IO API reference
│   └── response-builder.md # Response builder API
├── examples/
│   ├── express.md          # Express examples
│   ├── socket.md           # Socket.IO examples
│   └── errors.md           # Error handling examples
└── .vitepress/
    └── config.js           # VitePress configuration
```

## 🚀 Hosting Options

### 1. GitHub Pages (Recommended)

**Setup:**
1. Enable GitHub Pages in repository settings
2. Set source to "GitHub Actions"
3. Push to main branch - docs will auto-deploy

**Features:**
- ✅ Free hosting
- ✅ Custom domain support
- ✅ Automatic deployments
- ✅ SSL certificates

**Access:** `https://amit-kandar.github.io/response-handler/`

### 2. Netlify

**Setup:**
```bash
# Build command
npm run docs:build

# Publish directory
.vitepress/dist
```

**Features:**
- ✅ Continuous deployment
- ✅ Preview deployments for PRs
- ✅ Form handling
- ✅ Edge functions

### 3. Vercel

**Setup:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Features:**
- ✅ Serverless functions
- ✅ Preview deployments
- ✅ Analytics
- ✅ Global CDN

### 4. Simple Static Hosting

For any static hosting provider:

```bash
# Build documentation
npm run docs:build

# Upload .vitepress/dist/ folder to your hosting provider
```

## 🛠️ Development Commands

```bash
# Start development server
npm run docs:dev

# Build for production
npm run docs:build

# Preview production build
npm run docs:preview
```

## 📝 Content Management

### Adding New Pages

1. Create markdown file in appropriate directory
2. Add to sidebar in `.vitepress/config.js`
3. Update navigation if needed

### Updating Existing Docs

The documentation is automatically synchronized with:
- `docs/API.md` → `api/` directory  
- `docs/CONFIGURATION.md` → `config/` directory
- `docs/EXAMPLES.md` → `examples/` directory
- `NEW_API_README.md` → Used for homepage content

### Custom Styling

Edit `.vitepress/theme/` directory for custom themes and components.

## 🌐 Domain Setup

### GitHub Pages
1. Add `CNAME` file with your domain
2. Configure DNS records
3. Enable HTTPS in settings

### Other Platforms
Follow platform-specific domain configuration guides.

## 🔄 Automatic Updates

The GitHub Action automatically:
1. Builds documentation on every push to main
2. Deploys to GitHub Pages
3. Updates the live site

## 📊 Analytics

Add analytics to `.vitepress/config.js`:

```javascript
export default defineConfig({
  head: [
    ['script', { 
      async: true, 
      src: 'https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID' 
    }],
    ['script', {}, "window.dataLayer = window.dataLayer || [];\nfunction gtag(){dataLayer.push(arguments);}\ngtag('js', new Date());\ngtag('config', 'GA_MEASUREMENT_ID');"]
  ]
})
```

## 🎨 Customization

### Theme Colors
Edit `.vitepress/config.js` to customize the theme:

```javascript
themeConfig: {
  primaryColor: '#3b82f6',
  // ... other theme options
}
```

### Logo and Branding
Place logo files in `public/` directory and reference in config.

## 📧 Support

For hosting issues:
- GitHub Pages: Check repository settings and Actions tab
- Netlify/Vercel: Check build logs in their dashboards
- DNS issues: Verify DNS propagation with tools like `dig` or online checkers

The documentation is designed to be platform-agnostic and should work with any modern static hosting solution.
