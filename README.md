# Marakah

Marakah is a React app in the `frontend` folder.

## Run Locally

```bash
cd frontend
npm install
npm run dev
```

## Publish to a Public URL

Use Vercel or Netlify to host the frontend so users can open it on computer or phone.

### Vercel

1. Push this repository to GitHub.
2. Import the repo at https://vercel.com/new.
3. Set Root Directory to `frontend`.
4. Use:
	- Build command: `npm run build`
	- Output directory: `dist`
5. Deploy.

### Netlify

1. Push this repository to GitHub.
2. Import the repo at https://app.netlify.com/start.
3. Set Base directory to `frontend`.
4. Use:
	- Build command: `npm run build`
	- Publish directory: `dist`
5. Deploy.

After deployment, you will get a live URL (for example, `https://your-app.vercel.app`).

To use your own domain (for example `app.marakah.com`), connect it from your hosting provider domain settings and add the DNS records they provide.