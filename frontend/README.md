# Marakah Frontend Deployment

This app can be deployed to a public URL so users can access it from desktop and mobile browsers.

## Quick Deploy (Vercel)

1. Push this repository to GitHub.
2. Go to https://vercel.com/new and import your repo.
3. Set the project root directory to `frontend`.
4. Build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Click Deploy.

Vercel will give you a public URL like:

`https://your-project-name.vercel.app`

This repo includes `vercel.json` so React Router routes work when users refresh or visit deep links.

## Quick Deploy (Netlify)

1. Push this repository to GitHub.
2. Go to https://app.netlify.com/start and import your repo.
3. Set the base directory to `frontend`.
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click Deploy site.

This repo includes `public/_redirects` so React Router routes work correctly.

## Custom Domain (Your Own URL)

After deployment, connect your domain in hosting settings.

Examples:

- `app.marakah.com`
- `www.marakah.com`

Your host will provide DNS records (usually `A` or `CNAME`) to add at your domain registrar.

## Local Build Check

From the `frontend` folder:

```bash
npm install
npm run build
npm run preview
```

Then open the preview URL shown in the terminal.
