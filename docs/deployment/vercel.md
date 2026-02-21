# Vercel Deployment

Deploy the documentation site to Vercel.

## One-click Deploy

Use the Vercel button from the project README or import the repository in Vercel.

## Build Settings

- Framework preset: `Other`
- Build command: `npm run docs:build`
- Output directory: `.vitepress/dist`
- Install command: `npm ci`

## CLI Deployment

```bash
npm i -g vercel
vercel
vercel --prod
```

## Notes

- `vercel.json` in the project root contains deployment defaults.
- The docs site is static output from VitePress.
