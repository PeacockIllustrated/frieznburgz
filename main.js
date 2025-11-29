// --- main.js ---
import { importAdminUser } from './import-admin.js';
// Import Firebase authentication instance
import { auth, db } from './firebase.js';

// Import user session management
import { setCurrentUser, clearCurrentUser } from './user.js';

// Import configuration values and location management functions
import { getSelectedLocation, clearSelectedLocation, getLocationDisplayName, locations } from './config.js';

// Import authentication UI and logic functions
import { initAuth, showAuth, hideAuth } from './auth.js';

// Import location selection UI and logic functions
import { initLocationSelection, showLocationSelection, hideLocationSelection, updateLocationDisplay } from './location.js';

// Import general UI utility functions
import { showPage, hideAllPages, initSidebarNav, showDashboardContainer, hideDashboardContainer, updateNavVisibility } from './ui.js';

// Import specific page rendering functions
import { renderStockManagementPage, getAllUniqueStockItems } from './stock.js';
import { renderWastageLogPage } from './wastage.js';
import { renderDashboardOverviewPage, showQuickAdjustmentModal, openModal, closeModal } from './dashboard.js';
import { renderSuppliersPage } from './suppliers.js';
import { renderOrdersPage } from './orders.js';
import { renderStaffPage } from './staff.js';
import { renderSettingsPage } from './settings.js';
import { renderRecruitmentPage } from './recruitment.js';

// --- DOM Elements (centralized for main.js's direct use) ---
const logoutBtn = document.getElementById('logoutBtn');
const changeLocationBtn = document.getElementById('changeLocationBtn');


// --- Application Flow Management ---

/**
 * Initializes the main application logic.
 */
function initializeApp() {
    // Initialize authentication handlers from auth.js, if the container exists
    if (document.getElementById('authContainer')) {
        initAuth();
    }

    // Initialize location selection handlers from location.js, if the container exists
    if (document.getElementById('locationSelectionContainer')) {
        initLocationSelection();
    }

    // Initialize sidebar navigation from ui.js, passing the content rendering callback
    if (document.querySelector('.dashboard-sidebar')) {
        initSidebarNav(handleNavigationClick);
    }

    // Set up general event listeners for main dashboard controls, if they exist
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    if (changeLocationBtn) {
        changeLocationBtn.addEventListener('click', handleChangeLocation);
    }

    // Observe Firebase authentication state changes
    auth.onAuthStateChanged(handleAuthStateChange);
}

/**
 * Handles changes in the user's authentication state.
 * This is the primary router for showing/hiding main app sections.
 * @param {firebase.User} user - The authenticated user object, or null if signed out.
 */
async function handleAuthStateChange(user) {
    if (user) {
        // User is signed in, fetch their profile from 'staff' collection
        try {
            const staffDoc = await db.collection('staff').doc(user.uid).get();
            if (staffDoc.exists) {
                // User exists in the staff collection, proceed
                setCurrentUser({
                    uid: user.uid,
                    email: user.email,
                    ...staffDoc.data()
                });

                hideAuth(); // Hide the login screen

                let selectedLocation = getSelectedLocation();
                if (selectedLocation) {
                    showDashboard(selectedLocation);
                } else {
                    hideDashboardContainer();
                    showLocationSelection();
                }
            } else {
                // User is not in the staff collection, treat as unauthorized
                console.warn(`User ${user.email} is not in the staff collection.`);
                alert("You are not authorized to access this application.");
                await auth.signOut(); // Sign them out
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
            alert("There was an error logging you in. Please try again.");
            await auth.signOut();
        }
    } else {
        // User is signed out
        clearCurrentUser(); // Clear the user session data
        hideLocationSelection();
        hideDashboardContainer();
        showAuth();
        updateLocationDisplay('Not Selected');
        clearSelectedLocation();
    }
}

/**
 * Shows the main dashboard and updates the current location display in the header.
 * This function is called by handleAuthStateChange (after login) and location.js (after selection).
 * @param {string} locationId - The ID of the selected location.
 */
function showDashboard(locationId) {
    hideLocationSelection();
    showDashboardContainer();
    updateLocationDisplay(locationId);
    updateNavVisibility(); // Update nav based on user role

    // Set the initial active page to dashboard
    showPage('dashboard');
    renderPageContent('dashboard');
}

/**
 * Handles the logout action.
 */
async function handleLogout() {
    try {
        await auth.signOut();
        // The handleAuthStateChange observer will handle the rest of the cleanup
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to log out. Please try again.');
    }
}

/**
 * Handles the "Change Location" button click from the dashboard header.
 */
function handleChangeLocation() {
    clearSelectedLocation(); // Clear the currently selected location from local storage
    hideDashboardContainer(); // Hide the dashboard
    showLocationSelection(); // Show the location selection screen again
}

/**
 * Callback function passed to ui.js for sidebar navigation.
 * Renders the content for the selected page.
 * @param {string} pageId - The ID of the page to render (e.g., 'stock-management').
 */
async function handleNavigationClick(pageId) {
    // This function will be called by ui.js when a nav item is clicked.
    // It's responsible for calling the correct rendering function for that page.
    await renderPageContent(pageId);
}

/**
 * Renders the content for a specific dashboard page based on its ID.
 * @param {string} pageId - The ID of the page to render.
 */
async function renderPageContent(pageId) {
    const selectedLocationId = getSelectedLocation();
    if (!selectedLocationId) {
        // If no location is selected, redirect to location selection
        console.warn(`Attempted to render page "${pageId}" without a selected location. Redirecting.`);
        hideDashboardContainer();
        showLocationSelection();
        return;
    }

    // Use a switch statement to call the appropriate rendering function
    switch (pageId) {
        case 'dashboard':
            await renderDashboardOverviewPage();
            break;
        case 'stock-management':
            await renderStockManagementPage();
            break;
        case 'staff':
            await renderStaffPage();
            break;
        case 'wastage-log':
            await renderWastageLogPage();
            break;
        case 'orders':
            await renderOrdersPage();
            break;
        case 'suppliers':
            await renderSuppliersPage();
            break;
        case 'settings':
            await renderSettingsPage();
            break;
        case 'recruitment':
            await renderRecruitmentPage();
            break;

        default:
            console.warn(`No rendering function defined for page: ${pageId}`);
            break;
    }
}


// Expose functions to the window object so other modules can call them
window.mainApp = {
    showDashboard: showDashboard,
    handleNavigationClick: handleNavigationClick,
    showQuickAdjustmentModal: showQuickAdjustmentModal,
    openModal: openModal,
    closeModal: closeModal,
    importAdminUser: importAdminUser,
    getAllUniqueStockItems: getAllUniqueStockItems,
    getLocations: () => locations
};


// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    router();
});

// --- Simple Router ---
// --- Simple Router ---
function router() {
    const path = window.location.pathname;
    // When served from root, path will include /static/
    if (path.endsWith('/') || path.endsWith('/index.html')) {
        // This is the main dashboard, which is handled by the auth state change logic
        // but we can leave a hook here if needed.
    }
}

// --- Seeder ---
import { seedTrainingData } from './seed-training.js';

function runSeeder() {
    const seederRun = localStorage.getItem('seederRun');
    if (!seederRun) {
        console.log("Running seeder...");
        seedTrainingData();
        localStorage.setItem('seederRun', 'true');
    }
}

runSeeder();
