// --- ui.js ---
// General UI utility functions for managing page visibility and navigation.

import { getCurrentUser } from './user.js';

// --- DOM Elements ---
// Note: DOM elements are now selected inside the functions that use them
// to avoid errors on pages where they don't exist.

/**
 * Helper function to convert kebab-case string to camelCase.
 * Example: "stock-management" -> "stockManagement"
 * @param {string} kebabCaseString - The string in kebab-case (e.g., "my-data-page").
 * @returns {string} The converted string in camelCase.
 */
function kebabToCamelCase(kebabCaseString) {
    return kebabCaseString.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * Initializes sidebar navigation click listeners.
 * Sets up dynamic page switching.
 * @param {function} onNavLinkClickCallback - A callback function from main.js to be called when a navigation link is clicked,
 *                                            responsible for rendering the content of the selected page.
 */
export function initSidebarNav(onNavLinkClickCallback) {
    const sidebarNavItems = document.querySelectorAll('.nav-item');
    if (!sidebarNavItems || sidebarNavItems.length === 0) return;

    sidebarNavItems.forEach(item => {
        item.addEventListener('click', (event) => {
            event.preventDefault();
            const pageId = event.currentTarget.dataset.page;

            if (pageId) {
                showPage(pageId);
                updateSidebarActiveState(pageId);
                if (onNavLinkClickCallback && typeof onNavLinkClickCallback === 'function') {
                    onNavLinkClickCallback(pageId);
                }
            }
        });
    });
}

/**
 * Shows a specific content page element and hides all others.
 * This function primarily manages the `display` CSS property of the content sections.
 * @param {string} pageId - The base ID of the page to show (e.g., 'dashboard', 'stock-management').
 *                          This will be converted from kebab-case (from data-page) to camelCase
 *                          to match the HTML section IDs (e.g., 'stockManagementPage').
 */
export function showPage(pageId) {
    const contentPages = document.querySelectorAll('.content-page');
    if (!contentPages || contentPages.length === 0) return;

    contentPages.forEach(page => {
        page.classList.remove('active-page');
        page.style.display = 'none';
    });

    const camelCasePageId = kebabToCamelCase(pageId);
    const targetPage = document.getElementById(`${camelCasePageId}Page`);

    if (targetPage) {
        targetPage.classList.add('active-page');
        targetPage.style.display = 'block';
    } else {
        console.warn(`UI Error: Attempted to show unknown page with ID: ${camelCasePageId}Page`);
    }
}

/**
 * Hides all content pages.
 * Used when switching to non-dashboard sections (like auth or location selection).
 */
export function hideAllPages() {
    const contentPages = document.querySelectorAll('.content-page');
    if (!contentPages || contentPages.length === 0) return;
    contentPages.forEach(page => {
        page.classList.remove('active-page');
        page.style.display = 'none';
    });
}

/**
 * Updates the 'active' class on sidebar navigation items based on the currently displayed page.
 * @param {string} activePageId - The ID of the currently active page (e.g., 'dashboard', 'stock-management').
 */
function updateSidebarActiveState(activePageId) {
    const sidebarNavItems = document.querySelectorAll('.nav-item');
    if (!sidebarNavItems || sidebarNavItems.length === 0) return;
    sidebarNavItems.forEach(item => {
        if (item.dataset.page === activePageId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

/**
 * Displays a toast notification at the bottom of the screen.
 * @param {string} message - The message to display.
 * @param {string} [type='success'] - The type of toast ('success', 'error', 'info').
 * @param {number} [duration=3000] - How long the toast should be visible in ms.
 */
export function showToast(message, type = 'success', duration = 3000) {
    // Remove any existing toasts
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Center the toast
    toast.style.left = `calc(50% - ${toast.offsetWidth / 2}px)`;

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
}

/**
 * Shows the main dashboard container.
 * This utility function is called by main.js when the user logs in and selects a location.
 */
/**
 * Updates the visibility of navigation groups based on the current user's role.
 */
export function updateNavVisibility() {
    const user = getCurrentUser();
    const handbookNav = document.getElementById('handbookNavGroup');
    const adminNav = document.getElementById('adminNavGroup');

    // Helper to toggle visibility using classes
    const setVisible = (el, visible) => {
        if (!el) return;
        el.style.display = ''; // Clear inline style
        if (visible) {
            el.classList.add('nav-visible');
        } else {
            el.classList.remove('nav-visible');
        }
    };

    // Hide all role-based navs by default
    setVisible(handbookNav, false);
    setVisible(adminNav, false);

    if (!user || !user.role) {
        return; // No user or role, so keep everything hidden
    }

    const role = user.role.toLowerCase();

    // Staff, Managers, and Admins see the Handbook
    if (['staff', 'manager', 'admin'].includes(role)) {
        setVisible(handbookNav, true);
    }

    // Only Managers and Admins see the Admin section
    if (['manager', 'admin'].includes(role)) {
        setVisible(adminNav, true);
    }
}

export function showDashboardContainer() {
    const mainDashboardContainer = document.getElementById('mainDashboardContainer');
    if (mainDashboardContainer) {
        mainDashboardContainer.style.display = 'grid';
    }
}

/**
 * Hides the main dashboard container.
 * This utility function is called by main.js when the user logs out or decides to change location.
 */
export function hideDashboardContainer() {
    const mainDashboardContainer = document.getElementById('mainDashboardContainer');
    if (mainDashboardContainer) {
        mainDashboardContainer.style.display = 'none';
    }
}
