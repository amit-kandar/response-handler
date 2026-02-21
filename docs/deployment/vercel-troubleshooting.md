# Vercel Troubleshooting

## 404 on Internal Routes

Ensure docs are built from VitePress and `cleanUrls` is enabled.

```bash
npm run docs:build
npm run docs:preview
```

## Build Fails on Vercel

1. Confirm Node version compatibility.
2. Run locally:

```bash
npm ci
npm run docs:build
```

3. Verify `outputDirectory` is `.vitepress/dist` in `vercel.json`.

## Stale Content

Redeploy with cache invalidation in Vercel dashboard or run `vercel --prod --force`.
