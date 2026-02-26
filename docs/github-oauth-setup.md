# GitHub OAuth Setup

This project uses Auth.js v5 (NextAuth) with the GitHub provider. Follow these steps to create a GitHub OAuth App and configure the required environment variables.

## 1) Create a GitHub OAuth App

1. Go to GitHub Developer Settings:
   - https://github.com/settings/developers
2. Click **New OAuth App**.
3. Fill in the app details:
   - **Application name**: InvestManage (or your preferred name)
   - **Homepage URL**:
     - Local: http://localhost:3000
     - Production: https://<your-domain>
   - **Authorization callback URL**:
     - Local: http://localhost:3000/api/auth/callback/github
     - Production: https://<your-domain>/api/auth/callback/github
4. Create the app.

## 2) Copy Client ID and Client Secret

After creation, GitHub shows the **Client ID**. Click **Generate a new client secret** and copy it.

## 3) Configure environment variables

Set the following variables in your `.env` file (see `.env.example`):

```
AUTH_SECRET=your-auth-secret
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret
```

Notes:
- `AUTH_SECRET` can be any long random string. Use a secure generator for production.
- For Vercel, add the same variables in the Vercel project settings.
