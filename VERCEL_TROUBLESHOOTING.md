# Vercel Deployment Troubleshooting

Common issues and solutions for Vercel deployment of VitePress documentation.

## 🔧 404 Errors on Navigation

### Problem
Getting 404 errors when navigating to `/api/`, `/guide/`, or `/examples/`

### Solution
The repository is now configured with:
- `cleanUrls: true` in VitePress config
- `cleanUrls: true` in vercel.json
- Proper navigation structure

### Test Locally
```bash
npm run docs:build
npm run docs:preview
```

### Force Deploy
```bash
# If using CLI
vercel --prod --force

# Or trigger new build in Vercel dashboard
```

## 🔄 Build Issues

### Problem: Build Fails
```
Error: Command "npm run docs:build" exited with 1
```

### Solutions
1. **Check Node.js version** - Ensure using Node 18+
2. **Clear dependencies**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run docs:build
   ```
3. **Check for TypeScript errors**:
   ```bash
   npm run lint
   npm run build
   ```

### Problem: Assets Not Loading
```
Failed to load resource: the server responded with a status of 404
```

### Solutions
1. **Verify output directory** in vercel.json:
   ```json
   {
     "outputDirectory": ".vitepress/dist"
   }
   ```
2. **Check asset paths** in built files
3. **Clear Vercel cache** and redeploy

## 🌐 Routing Issues

### Problem: Clean URLs Not Working
Pages show `.html` extensions or 404 on direct navigation

### Solution
Ensure both configs have clean URLs:

**VitePress config** (`.vitepress/config.js`):
```javascript
export default {
  cleanUrls: true,
  // ... other config
}
```

**Vercel config** (`vercel.json`):
```json
{
  "cleanUrls": true,
  "trailingSlash": false
}
```

### Problem: SPA Routing Issues
Navigation works from homepage but direct URLs fail

### Solution
VitePress uses client-side routing. The current config handles this automatically with `cleanUrls: true`.

## 🚀 Performance Issues

### Problem: Slow Loading
Site takes too long to load

### Solutions
1. **Enable caching** (already configured):
   ```json
   {
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

2. **Optimize images**:
   ```bash
   # Add image optimization
   npm install @vercel/next
   ```

3. **Check bundle size**:
   ```bash
   npm run docs:build
   du -h .vitepress/dist
   ```

## 🔍 Debug Commands

### Local Testing
```bash
# Build and preview locally
npm run docs:build
npm run docs:preview

# Test specific routes
curl http://localhost:4173/api/
curl http://localhost:4173/guide/
```

### Vercel CLI Debug
```bash
# Check deployment logs
vercel logs [deployment-url]

# Local development mode
vercel dev

# Force new deployment
vercel --prod --force
```

### Browser Debug
1. **Open DevTools** → Network tab
2. **Navigate** to problematic URLs
3. **Check** for failed requests
4. **Verify** correct file paths

## 📁 File Structure Check

Ensure your build creates this structure:
```
.vitepress/dist/
├── index.html
├── api/
│   ├── index.html
│   ├── express.html
│   └── ...
├── guide/
│   ├── index.html
│   └── ...
├── examples/
│   ├── index.html
│   └── ...
└── assets/
    └── ...
```

## 🔐 Environment Variables

### For Advanced Features
If you need environment variables:

1. **Vercel Dashboard** → Project → Settings → Environment Variables
2. **Add variables**:
   - `NODE_ENV=production`
   - `VITE_BASE_URL=https://your-domain.vercel.app`

3. **Use in config**:
   ```javascript
   export default {
     base: process.env.VITE_BASE_URL || '/',
     // ... other config
   }
   ```

## 🚨 Emergency Fixes

### Quick Reset
1. **Delete** `.vercel` folder
2. **Run** `vercel` to redeploy
3. **Check** domain configuration

### Rollback Deployment
1. **Vercel Dashboard** → Deployments
2. **Find** working deployment
3. **Click** "Promote to Production"

### Alternative: Static Export
If dynamic routing fails, use static export:

```javascript
// .vitepress/config.js
export default {
  base: '/response-handler/',
  cleanUrls: false, // Disable for static hosting
  // ... other config
}
```

## 💡 Best Practices

1. **Test locally** before deploying
2. **Use clean URLs** for better SEO
3. **Enable caching** for assets
4. **Monitor** build times and sizes
5. **Keep dependencies** up to date

## 📞 Get Help

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **VitePress Issues**: [GitHub Issues](https://github.com/vuejs/vitepress/issues)
- **Community**: [Discord](https://discord.gg/HBherRA)

## ✅ Verification Checklist

- [ ] Build completes without errors
- [ ] All navigation links work
- [ ] Direct URLs load correctly
- [ ] Assets load properly
- [ ] Mobile responsive
- [ ] Fast loading times
- [ ] Search functionality works
- [ ] No console errors

The configuration should now work correctly with Vercel's static hosting and VitePress routing!
