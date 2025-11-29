# Vercel Deployment Guide

This project has been configured for deployment on Vercel. Follow these steps to build and publish your application.

## 1. Prerequisites

-   **Vercel Account**: Create one at [vercel.com](https://vercel.com) if you haven't already.
-   **Vercel CLI** (Optional but recommended): Install via npm:
    ```bash
    npm i -g vercel
    ```

## 2. Configuration Changes Made

-   **`vercel.json`**: Added to the project root. This file configures Vercel to:
    -   Rewrite all URLs to `/index.html` (essential for Single Page Applications).
    -   Enable clean URLs.
-   **`package.json`**: Added a `"build": "echo 'No build step required'"` script. This tells Vercel that there is no complex build process (like Webpack or Vite) needed, as this is a vanilla JavaScript application.

## 3. How to Deploy

### Option A: Using Vercel CLI (Recommended)

1.  Open your terminal in the project directory.
2.  Run the deploy command:
    ```bash
    vercel
    ```
3.  Follow the prompts:
    -   **Set up and deploy?** [Y]
    -   **Which scope?** [Select your account]
    -   **Link to existing project?** [N] (unless you already created one)
    -   **Project Name**: `friez-n-burgz-admin` (or your preferred name)
    -   **In which directory is your code located?** `./` (Press Enter to accept default)
    -   **Want to modify these settings?** [N] (The defaults should work with our changes)

4.  Wait for the deployment to complete. You will get a `Production: [URL]` link.

### Option B: Using Vercel Dashboard (Git Integration)

1.  Push your code to a Git repository (GitHub, GitLab, or Bitbucket).
2.  Log in to Vercel and click **"Add New..."** -> **"Project"**.
3.  Import your repository.
4.  Vercel should automatically detect the settings.
    -   **Framework Preset**: Other
    -   **Build Command**: `echo 'No build step required'` (or override if needed)
    -   **Output Directory**: `.` (Root)
5.  Click **Deploy**.

## 4. Environment Variables

Your `config.js` file is set up to use `import.meta.env` for Firebase configuration, with hardcoded fallbacks.

-   **If you want to use the hardcoded values**: You don't need to do anything.
-   **If you want to use environment variables**: Go to your Vercel Project Settings -> **Environment Variables** and add the following:
    -   `VITE_FIREBASE_API_KEY`
    -   `VITE_FIREBASE_AUTH_DOMAIN`
    -   `VITE_FIREBASE_PROJECT_ID`
    -   `VITE_FIREBASE_STORAGE_BUCKET`
    -   `VITE_FIREBASE_MESSAGING_SENDER_ID`
    -   `VITE_FIREBASE_APP_ID`
    -   `VITE_FIREBASE_MEASUREMENT_ID`

## 5. Firebase Functions

**Important**: This deployment only hosts the **Frontend** (HTML, CSS, JS).
If your application relies on Firebase Cloud Functions (in the `functions` directory), you must still deploy them to Firebase:

```bash
npm run deploy:functions
```

The frontend will communicate with these functions as long as your Firebase project configuration is correct.
