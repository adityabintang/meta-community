# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Cloudflare D1 Auth Setup

Email/password auth now uses a custom auth server backed by Cloudflare D1.

1. Fill D1 variables in `.env.local`:
	- `CLOUDFLARE_ACCOUNT_ID`
	- `CLOUDFLARE_D1_DATABASE_ID`
	- `CLOUDFLARE_D1_API_TOKEN`
	- `AUTH_JWT_SECRET`
2. Start frontend:
	- `npm run dev`
3. Start auth server:
	- `npm run auth:dev`

Auth endpoints handled by the auth server:
- `POST /api/auth/sign-up/email`
- `POST /api/auth/sign-in/email`

## Cloudflare R2 Image Upload Setup

Image uploads via `POST /api/upload` can store directly to Cloudflare R2 using S3 API.

Add these variables to `.env`:

- `R2_S3_ENDPOINT` (example: `https://<accountid>.r2.cloudflarestorage.com`)
- `R2_BUCKET` (example: `metacommunity`)
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PUBLIC_BASE_URL` (public domain for serving image URLs)
- `R2_UPLOAD_PREFIX` (optional, default: `uploads`)

If R2 config is incomplete, upload falls back to local `./uploads` storage.
