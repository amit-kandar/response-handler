# Vercel Deployment Guide

Deploy your Response Handler documentation to Vercel for fast, global distribution.

## 🚀 Quick Deployment (Recommended)

### Method 1: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/amit-kandar/response-handler)

### Method 2: GitHub Integration

1. **Visit Vercel Dashboard**: Go to [vercel.com](https://vercel.com)
2. **Sign in with GitHub**: Use your GitHub account
3. **Import Project**: Click "New Project" → Import your repository
4. **Configure Settings**:
   - **Framework Preset**: Other
   - **Build Command**: `npm run docs:build`
   - **Output Directory**: `.vitepress/dist`
   - **Install Command**: `npm ci`
5. **Deploy**: Click "Deploy"

## 📁 Project Configuration

The repository includes a `vercel.json` configuration file:

```json
{
  "buildCommand": "npm run docs:build",
  "outputDirectory": ".vitepress/dist",
  "installCommand": "npm ci",
  "framework": null,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

## 💻 CLI Deployment

### Install Vercel CLI

```bash
npm install -g vercel
```

### Deploy

```bash
# First time deployment
vercel

# Production deployment
vercel --prod
```

### Login and Configuration

```bash
# Login to Vercel
vercel login

# Link project to existing Vercel project
vercel link

# Set up environment (if needed)
vercel env add VARIABLE_NAME
```

## 🔧 Manual Configuration

If automatic detection doesn't work:

### Build Settings
- **Framework**: Other
- **Build Command**: `npm run docs:build`
- **Output Directory**: `.vitepress/dist`
- **Install Command**: `npm ci`
- **Node.js Version**: 18.x

### Environment Variables
Usually not needed for static documentation, but you can add:
- `NODE_ENV=production`
- `CI=true`

## 🌐 Custom Domain

### Add Custom Domain

1. **Vercel Dashboard**: Go to your project
2. **Settings** → **Domains**
3. **Add Domain**: Enter your domain (e.g., `docs.yourdomain.com`)
4. **Configure DNS**: Add CNAME record

### DNS Configuration

```bash
# CNAME record for subdomain
docs.yourdomain.com → cname.vercel-dns.com

# Or A record for apex domain
yourdomain.com → 76.76.19.61
```

### Update VitePress Config

```javascript
// .vitepress/config.js
export default {
  base: '/', // Remove base path for custom domain
  title: 'Response Handler',
  description: 'Your documentation description',
  // ... other config
}
```

## 🔄 Automatic Deployments

### GitHub Integration Benefits

- **Automatic builds** on every push to main
- **Preview deployments** for pull requests
- **Branch deployments** for feature branches
- **Rollback capability** to previous deployments

### Deployment Triggers

- **Production**: Push to `main` branch
- **Preview**: Push to any other branch or PR
- **Manual**: CLI deployment or dashboard trigger

## 📊 Performance Features

### Vercel Optimizations

- **Edge Network**: Global CDN with 20+ regions
- **Automatic GZIP**: Compression for faster loading
- **Image Optimization**: Automatic image optimization
- **Analytics**: Built-in performance analytics

### Speed Optimizations

```javascript
// .vitepress/config.js
export default {
  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'dns-prefetch', href: 'https://fonts.gstatic.com' }]
  ],
  themeConfig: {
    // Enable search for better UX
    search: {
      provider: 'local'
    }
  }
}
```

## 🔍 Monitoring & Analytics

### Vercel Analytics

```bash
# Install Vercel Analytics (optional)
npm install @vercel/analytics
```

```javascript
// Add to .vitepress/theme/index.js
import { inject } from '@vercel/analytics'
import DefaultTheme from 'vitepress/theme'

export default {
  ...DefaultTheme,
  enhanceApp({ app, router, siteData }) {
    if (typeof window !== 'undefined') {
      inject()
    }
  }
}
```

## 🐛 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Build fails | Check Node.js version, use 18.x |
| 404 errors | Ensure rewrites are configured in vercel.json |
| Slow builds | Use `npm ci` instead of `npm install` |
| Asset loading issues | Check output directory path |

### Debug Commands

```bash
# Check build locally
npm run docs:build
npm run docs:preview

# Vercel logs
vercel logs [deployment-url]

# Local development
vercel dev
```

### Build Logs

Check build logs in Vercel dashboard:
1. **Functions** tab → **Build Logs**
2. Look for specific error messages
3. Verify all dependencies are installed

## 🚀 Advanced Configuration

### Multiple Environments

```bash
# Development environment
vercel --target development

# Preview environment  
vercel --target preview

# Production environment
vercel --target production --prod
```

### Custom Build Command

```json
{
  "buildCommand": "npm run build && npm run docs:build",
  "outputDirectory": ".vitepress/dist"
}
```

### Serverless Functions (if needed)

```javascript
// api/health.js
export default function handler(req, res) {
  res.status(200).json({ status: 'healthy' })
}
```

## 🔐 Security

### Headers Configuration

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

## 📱 Mobile Optimization

VitePress is mobile-responsive by default, but you can enhance it:

```javascript
// .vitepress/config.js
export default {
  head: [
    ['meta', { name: 'viewport', content: 'width=device-width,initial-scale=1' }],
    ['meta', { name: 'theme-color', content: '#646cff' }]
  ]
}
```

## 🎯 Benefits of Vercel Hosting

✅ **Zero Configuration**: Works out of the box  
✅ **Global CDN**: Fast worldwide access  
✅ **Automatic HTTPS**: SSL certificates included  
✅ **Preview Deployments**: Test before production  
✅ **Custom Domains**: Easy domain configuration  
✅ **Analytics**: Built-in performance monitoring  
✅ **Edge Functions**: Serverless capabilities  
✅ **Git Integration**: Automatic deployments  

Your documentation will be available at: `https://your-project.vercel.app`

## 📞 Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **VitePress Deployment**: [vitepress.dev/guide/deploy](https://vitepress.dev/guide/deploy)
- **Community**: [Vercel Discord](https://vercel.com/discord)
