# Deploy to Vercel 🚀

This repository is ready for one-click deployment to Vercel!

## Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/amit-kandar/response-handler)

## What gets deployed?

- **VitePress Documentation Site** - Complete documentation with examples
- **Fast Global CDN** - Vercel's edge network for fast loading worldwide
- **Automatic HTTPS** - SSL certificates included
- **Preview Deployments** - Every PR gets a preview URL

## Build Configuration

The repository includes optimized Vercel configuration:

```json
{
  "buildCommand": "npm run docs:build",
  "outputDirectory": ".vitepress/dist",
  "installCommand": "npm ci"
}
```

## Features Included

✅ **Comprehensive Documentation** - Installation, API reference, examples  
✅ **Interactive Examples** - Live code samples and use cases  
✅ **Mobile Responsive** - Works perfectly on all devices  
✅ **Search Functionality** - Built-in search across all documentation  
✅ **Dark/Light Theme** - Automatic theme switching  
✅ **Fast Loading** - Optimized for performance

## Manual Deployment

If you prefer CLI deployment:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

## Custom Domain

After deployment, you can easily add a custom domain:

1. Go to your Vercel dashboard
2. Select your project
3. Settings → Domains
4. Add your custom domain

## Environment Variables

No environment variables needed for basic deployment. The site is completely static.

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [VitePress Guide](https://vitepress.dev/guide/deploy)
- [Response Handler Issues](https://github.com/amit-kandar/response-handler/issues)

Your documentation will be live at: `https://your-project.vercel.app`
