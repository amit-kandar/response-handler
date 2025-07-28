# GitHub Pages Setup Guide

This guide explains how to set up GitHub Pages for automatic documentation deployment.

## Repository Settings

### 1. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. Scroll down to **Pages** section (left sidebar)
4. Under **Source**, select **GitHub Actions**

### 2. Required Repository Settings

Ensure your repository has the following settings:

- **Actions**: General → Actions permissions → Allow all actions and reusable workflows
- **Pages**: Source → GitHub Actions (instead of Deploy from a branch)

## Workflow Configuration

The repository includes a GitHub Actions workflow (`.github/workflows/docs.yml`) that:

1. **Triggers on**:
   - Push to `main` branch
   - Manual workflow dispatch

2. **Permissions**:
   - `contents: read` - Read repository contents
   - `pages: write` - Write to GitHub Pages
   - `id-token: write` - Generate deployment tokens

3. **Jobs**:
   - **Build**: Installs dependencies, builds docs, uploads artifacts
   - **Deploy**: Deploys to GitHub Pages using official actions

## Deployment Process

### Automatic Deployment

1. **Push to main branch**:
   ```bash
   git push origin main
   ```

2. **Check Actions tab** to monitor deployment progress

3. **Access your site** at: `https://USERNAME.github.io/REPOSITORY-NAME/`

### Manual Deployment

1. Go to **Actions** tab in your repository
2. Click on **Deploy Documentation** workflow
3. Click **Run workflow** button
4. Select `main` branch and click **Run workflow**

## Troubleshooting

### Common Issues

1. **403 Permission Error**:
   - Ensure repository has Pages enabled
   - Check that Actions have write permissions
   - Verify the workflow uses `actions/deploy-pages@v4`

2. **Build Failures**:
   - Check Node.js version compatibility
   - Verify all dependencies are in `package.json`
   - Check for TypeScript/ESLint errors

3. **Pages Not Found**:
   - Verify GitHub Pages source is set to "GitHub Actions"
   - Check that deployment job completed successfully
   - Wait a few minutes for DNS propagation

### Workflow Fixes

If the original workflow fails with permission errors, the updated workflow includes:

- **Modern Actions**: Uses `actions/deploy-pages@v4` instead of `peaceiris/actions-gh-pages@v3`
- **Proper Permissions**: Explicitly sets required permissions
- **Environment Protection**: Uses GitHub's built-in pages environment

## Custom Domain (Optional)

### Setup Custom Domain

1. **Add CNAME file**:
   ```bash
   echo "docs.yourdomain.com" > .vitepress/dist/CNAME
   ```

2. **Update VitePress config**:
   ```javascript
   // .vitepress/config.js
   export default {
     base: '/', // Remove base path for custom domain
     // ... other config
   }
   ```

3. **Configure DNS**:
   - Add CNAME record: `docs.yourdomain.com` → `username.github.io`
   - Or A records pointing to GitHub Pages IPs

4. **Enable in GitHub**:
   - Repository Settings → Pages → Custom domain
   - Enter your domain and save
   - Enable "Enforce HTTPS"

## Monitoring

### Check Deployment Status

1. **Actions Tab**: Monitor workflow runs
2. **Deployments**: View in repository sidebar
3. **Pages Settings**: Check configuration and domain status

### Logs and Debugging

- **Build logs**: Actions tab → Workflow run → Build job
- **Deploy logs**: Actions tab → Workflow run → Deploy job
- **Pages status**: Repository → Environments → github-pages

## Security Considerations

1. **Branch Protection**: Protect main branch to prevent unauthorized deployments
2. **Review Required**: Require PR reviews for documentation changes
3. **Environment Secrets**: Use environment secrets for sensitive configuration

## Alternative Deployment Methods

If GitHub Actions don't work, alternatives include:

### Netlify
```bash
# Deploy to Netlify
npm run docs:build
# Upload .vitepress/dist folder to Netlify
```

### Vercel
```bash
# Deploy to Vercel
npm run docs:build
vercel --prod .vitepress/dist
```

### Manual Deployment
```bash
# Build and push to gh-pages branch
npm run docs:build
cd .vitepress/dist
git init
git add -A
git commit -m 'Deploy docs'
git push -f git@github.com:username/repo.git main:gh-pages
```

## Support

If you encounter issues:

1. Check [GitHub Pages documentation](https://docs.github.com/en/pages)
2. Review [GitHub Actions documentation](https://docs.github.com/en/actions)
3. Check [VitePress deployment guide](https://vitepress.dev/guide/deploy)
4. Open an issue in the repository with error details

The updated workflow should resolve permission issues and provide reliable automatic deployment to GitHub Pages.
