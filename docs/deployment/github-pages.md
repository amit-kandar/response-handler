# GitHub Pages Setup

## Configure Pages Source

1. Open repository settings.
2. Go to **Pages**.
3. Set source to **GitHub Actions**.

## Workflow

Use the docs deployment workflow in `.github/workflows/` to build and publish docs.

## Manual Fallback

```bash
npm run docs:build
# publish .vitepress/dist via gh-pages or your CI pipeline
```
