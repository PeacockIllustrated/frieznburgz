// --- public/loyalty/loyalty-auth.js ---
// Handles authentication state for the customer-facing loyalty portal.

import { auth } from './firebase-loyalty-config.js';

document.addEventListener('DOMContentLoaded', () => {
    // This script should ONLY run on loyalty.html.
    // Login/Register pages have their own inline scripts or separate handlers.
    if (window.location.pathname.endsWith('loyalty-login.html') || window.location.pathname.endsWith('loyalty-register.html')) {
        return;
    }
    
    const mainContent = document.getElementById('main-loyalty-wrapper');
    const loadingSpinner = document.getElementById('loading-spinner');
    const loginPrompt = document.getElementById('login-prompt'); // Get the login prompt container

    if(loadingSpinner) loadingSpinner.style.display = 'flex'; // Show spinner initially

    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is logged in
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (loginPrompt) loginPrompt.style.display = 'none'; // Hide login prompt
            if (mainContent) mainContent.style.display = 'block'; // Show main content
            
            // Dispatch a custom event for other scripts to use
            document.dispatchEvent(new CustomEvent('userAuthenticatedLoyalty', { detail: { user } }));
        } else {
            // No user is logged in, hide content and show prompt
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (mainContent) mainContent.style.display = 'none';
            if (loginPrompt) loginPrompt.style.display = 'flex'; // Use flex for centering the prompt
        }
    });
});
