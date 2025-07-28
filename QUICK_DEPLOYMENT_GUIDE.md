# Quick GitHub Pages Deployment Guide

## 🚀 Simple Setup (3 Steps)

### Step 1: Push Your Code

```bash
git push origin main
```

The GitHub Action will automatically run and create a `gh-pages` branch.

### Step 2: Enable GitHub Pages

1. Go to your repository on GitHub
2. **Settings** → **Pages** (left sidebar)
3. **Source**: Select "Deploy from a branch"
4. **Branch**: Select `gh-pages` and `/ (root)`
5. Click **Save**

### Step 3: Access Your Site

Your documentation will be available at:
`https://USERNAME.github.io/REPOSITORY-NAME/`

## 🔧 If It Doesn't Work

### Check Repository Permissions

1. **Settings** → **Actions** → **General**
2. **Actions permissions**: Allow all actions and reusable workflows
3. **Workflow permissions**: Read and write permissions

### Manual Trigger

1. Go to **Actions** tab
2. Click **Deploy Documentation**
3. Click **Run workflow** → **Run workflow**

### Alternative: Simple Manual Deployment

```bash
# Build the docs
npm run docs:build

# Deploy to gh-pages branch
npx gh-pages -d .vitepress/dist
```

## 🐛 Common Issues

| Issue                | Solution                                                |
| -------------------- | ------------------------------------------------------- |
| 403 Permission Error | Enable "Read and write permissions" in Actions settings |
| Pages not found      | Wait 5-10 minutes after enabling Pages                  |
| Build fails          | Check that all dependencies are in package.json         |
| Old content showing  | Clear browser cache or wait for CDN update              |

## ✅ Success Indicators

- ✅ Green checkmark in Actions tab
- ✅ `gh-pages` branch exists with built files
- ✅ Pages settings show green checkmark
- ✅ Site loads at your GitHub Pages URL

The workflow is designed to be zero-configuration and work out of the box!
