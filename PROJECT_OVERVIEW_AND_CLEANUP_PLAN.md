# Project Overview & Cleanup Plan

## 1. Project Overview

**Friez n Burgz Admin Dashboard** is a Single Page Application (SPA) built with Vanilla JavaScript and Firebase. It manages stock, orders, wastage, staff, and loyalty programs for a multi-location restaurant chain.

### Current Architecture
-   **Frontend**: Vanilla JS (ES6 Modules), HTML5, CSS3.
-   **Backend**: Firebase (Firestore, Auth, Functions).
-   **Routing**: Custom client-side router in `main.js` (handling `/dashboard`, `/stock-management`, etc.).
-   **Templating**: JS-based template functions (now in `templates/` and root).
-   **Hosting**: Configured for Vercel (static serving with rewrites).

## 2. Cleanup & Optimization Proposal

To make this project "production-ready", I propose the following actions:

### A. Immediate Cleanup (High Impact)
1.  **Remove Unused Files**:
    -   `seed.js`, `seed-menu-items.js`, `seed-training.js`: Seeding scripts should be moved to a `scripts/` folder or removed if data is already populated.
    -   `import-data.js`, `import-admin.js`: One-off import scripts.
    -   `rules.test.js`: If not being run in a CI pipeline, move to `tests/`.
    -   `employee-flow.html` (in `static/`): Seems like a standalone page, verify if it's still needed.
2.  **Consolidate Templates**:
    -   Move all `*-template.js` files from the root to the `templates/` directory.
    -   Update imports in `main.js` and other files.
3.  **Standardize CSS**:
    -   Move all CSS files to `static/css/` or a dedicated `styles/` folder.
    -   Update `index.html` links.
4.  **Security & Config**:
    -   Ensure `firebaseConfig` uses environment variables (already partially done).
    -   **CRITICAL**: Remove any hardcoded secrets (e.g., `GATEKEEPER_PASSWORD` in `staff-training/register-profile.js` if it exists).

### B. Code Quality & Performance
1.  **Remove Console Logs**: Strip out `console.log` statements for production.
2.  **Error Handling**: Replace `alert()` calls with the existing `showToast()` function for a better UI.
3.  **Asset Optimization**: Ensure images in `static/assets` are optimized.

## 3. Sections to Remove (Waiting for your input)

You mentioned removing some sections "until further notice". Based on the codebase, here are likely candidates:

-   **Loyalty Management**: Is this fully ready?
-   **Rota/Scheduling**: Often a complex feature that might be phased.
-   **Allergen Handbook/Admin**: Is this needed for the initial launch?
-   **Staff Training**: Is the quiz/training module required immediately?

## 4. New Features (Waiting for your input)

You mentioned "more features being added". Please specify what you have in mind so I can architect the cleanup to support them. Common requests include:
-   Advanced Reporting/Analytics.
-   User Roles & Permissions (more granular).
-   Notification System.

## 5. Next Steps

1.  **Approve Cleanup**: Confirm which of the "Immediate Cleanup" items you want me to execute.
2.  **Select Sections to Disable**: Tell me which specific sections (from list #3) to hide/remove.
3.  **Define New Features**: Briefly describe the new features you want to add.
