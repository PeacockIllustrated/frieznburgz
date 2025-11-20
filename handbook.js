// --- handbook.js ---
// Manages the rendering and logic for the staff-facing handbook pages, starting with the allergen matrix.

import { db } from './firebase.js';
import { createMatrixPageLayout, renderMatrixTable, renderItemDrawer, renderBanner } from './templates/handbook-template.js';
import { FSA_ALLERGENS } from './constants.js';
import { openIncidentLogModal } from './allergens.js';

// --- State Management ---
let allItems = []; // Full dataset from Firestore
let filteredItems = []; // Items currently displayed
const CACHE_KEY = 'allergenMatrixCache';
const CACHE_DURATION_MINUTES = 60;

// --- Main Page Rendering ---

/**
 * Renders the entire staff-facing allergen matrix page.
 * This is the main entry point called by main.js.
 */
export async function renderStaffAllergenMatrixPage() {
    const pageContainer = document.getElementById('allergenMatrixPage');
    if (!pageContainer) {
        console.error("Allergen matrix page container not found.");
        return;
    }

    // Render the basic layout immediately
    pageContainer.innerHTML = createMatrixPageLayout();
    document.getElementById('persistent-banner').innerHTML = renderBanner();
    document.getElementById('matrix-container').innerHTML = '<p class="loading-message">Loading latest allergen matrix...</p>';

    // Attempt to load from cache first
    const cachedData = getCachedData();
    if (cachedData) {
        console.log("Loading allergen matrix from cache.");
        allItems = cachedData;
        initializeMatrix(cachedData);
        // Fetch fresh data in the background to check for updates
        fetchLatestData(true);
    } else {
        // Fetch fresh data immediately if no cache is available
        await fetchLatestData(false);
    }
}

// --- Data Fetching and Caching ---

/**
 * Fetches the latest published allergen matrix from Firestore.
 * @param {boolean} isBackgroundUpdate - If true, won't show loading message and only updates if data is different.
 */
async function fetchLatestData(isBackgroundUpdate = false) {
    try {
        const versionsSnapshot = await db.collection('allergenVersions')
            .orderBy('publishedAt', 'desc')
            .limit(1)
            .get();

        if (versionsSnapshot.empty) {
            if (!isBackgroundUpdate) {
                document.getElementById('matrix-container').innerHTML = '<p class="error-message">No published allergen matrix found.</p>';
            }
            return;
        }

        const latestVersion = versionsSnapshot.docs[0].data();
        const snapshot = latestVersion.matrixSnapshot || [];

        // Only re-render if the data has actually changed
        if (JSON.stringify(snapshot) !== JSON.stringify(allItems)) {
            console.log("New allergen data found. Updating matrix.");
            allItems = snapshot;
            setCachedData(snapshot);
            // Only re-initialize if it's not a background update or if there was no data before
            if (!isBackgroundUpdate || allItems.length === 0) {
                initializeMatrix(snapshot);
            }
        } else {
            console.log("Cached data is up to date.");
        }

    } catch (error) {
        console.error("Error fetching latest allergen version:", error);
        if (!isBackgroundUpdate) {
            document.getElementById('matrix-container').innerHTML = '<p class="error-message">Could not load the allergen matrix. Please check your connection.</p>';
        }
    }
}

/**
 * Retrieves cached allergen data from localStorage if it's not expired.
 * @returns {Array<Object>|null} The cached data or null.
 */
function getCachedData() {
    const cachedItem = localStorage.getItem(CACHE_KEY);
    if (!cachedItem) return null;

    const { timestamp, data } = JSON.parse(cachedItem);
    const isExpired = (Date.now() - timestamp) > CACHE_DURATION_MINUTES * 60 * 1000;

    if (isExpired) {
        localStorage.removeItem(CACHE_KEY);
        return null;
    }

    return data;
}

/**
 * Saves the allergen data and a timestamp to localStorage.
 * @param {Array<Object>} data - The allergen matrix data to cache.
 */
function setCachedData(data) {
    try {
        const itemToCache = {
            timestamp: Date.now(),
            data: data
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(itemToCache));
    } catch (e) {
        console.error("Could not write to localStorage. Cache may be full.", e);
    }
}

// --- UI Initialization and Event Handling ---

/**
 * Initializes the matrix view after data is loaded.
 * Populates filters, renders the table, and sets up event listeners.
 * @param {Array<Object>} data - The allergen matrix data.
 */
function initializeMatrix(data) {
    if (!data || data.length === 0) {
         document.getElementById('matrix-container').innerHTML = '<p>No menu items available in the latest snapshot.</p>';
         return;
    }
    populateCategoryFilter(data);
    setupEventListeners();
    filterAndRenderMatrix(); // Initial render with all data
}

/**
 * Populates the category filter dropdown with unique categories from the data.
 * @param {Array<Object>} data - The allergen matrix data.
 */
function populateCategoryFilter(data) {
    const categoryFilter = document.getElementById('categoryFilter');
    const categories = [...new Set(data.map(item => item.category))].sort();

    categoryFilter.innerHTML = '<option value="">All Categories</option>';

    categories.forEach(category => {
        if (category) {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        }
    });
}

/**
 * Sets up all the event listeners for the filter controls and table.
 */
function setupEventListeners() {
    const controls = document.querySelector('.matrix-controls');
    if (!controls) return;

    controls.addEventListener('input', (e) => {
        if (e.target.id === 'matrixSearchInput' || e.target.classList.contains('filter-radio')) {
            filterAndRenderMatrix();
        }
    });

    controls.addEventListener('change', (e) => {
        if (e.target.id === 'categoryFilter' || e.target.classList.contains('allergen-filter-checkbox')) {
            filterAndRenderMatrix();
        }
    });

    const allergenFilterBtn = document.getElementById('allergenFilterBtn');
    const allergenDropdown = document.getElementById('allergenFilterDropdown');
    allergenFilterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        allergenDropdown.classList.toggle('show');
    });

    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
        document.getElementById('matrixSearchInput').value = '';
        document.getElementById('categoryFilter').value = '';
        document.querySelectorAll('.allergen-filter-checkbox').forEach(cb => cb.checked = false);
        const radioToCheck = document.querySelector('input[name="contain_filter"]:checked');
        if(radioToCheck) radioToCheck.checked = false;
        filterAndRenderMatrix();
    });

    const matrixContainer = document.getElementById('matrix-container');
    matrixContainer.addEventListener('click', handleMatrixInteraction);
    matrixContainer.addEventListener('keydown', handleMatrixInteraction);

    document.addEventListener('click', (event) => {
        if (!allergenFilterBtn.contains(event.target) && !allergenDropdown.contains(event.target)) {
            allergenDropdown.classList.remove('show');
        }
    });
}

function handleMatrixInteraction(event) {
    if (event.type === 'click' || (event.type === 'keydown' && (event.key === 'Enter' || event.key === ' '))) {
        const row = event.target.closest('tr[data-item-id]');
        if (row) {
            event.preventDefault();
            openDrawer(row.dataset.itemId);
        }
    } else if (event.type === 'keydown' && event.key === 'Escape') {
        closeDrawer();
    }
}


// --- Core Logic ---

/**
 * Applies all active filters to the dataset and re-renders the matrix.
 */
function filterAndRenderMatrix() {
    if (!allItems || allItems.length === 0) return;

    const startTime = performance.now();

    const searchText = document.getElementById('matrixSearchInput').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    const selectedAllergens = Array.from(document.querySelectorAll('.allergen-filter-checkbox:checked')).map(cb => cb.value);
    const containFilterMode = document.querySelector('input[name="contain_filter"]:checked')?.value;

    filteredItems = allItems.filter(item => {
        if (!item.name.toLowerCase().includes(searchText)) return false;
        if (category && item.category !== category) return false;

        if (selectedAllergens.length > 0) {
            const hasAllSelectedAllergens = selectedAllergens.every(allergenId => {
                const status = item.allergens[allergenId];
                return status === 'contains' || status === 'may_contain';
            });
            if (!hasAllSelectedAllergens) return false;

            if (containFilterMode) {
                const matchesMode = selectedAllergens.every(allergenId => item.allergens[allergenId] === containFilterMode);
                if (!matchesMode) return false;
            }
        }
        return true;
    });

    const allAllergenIds = FSA_ALLERGENS.map(a => a.id);
    const tableHtml = renderMatrixTable(filteredItems, allAllergenIds);
    document.getElementById('matrix-container').innerHTML = tableHtml;

    const endTime = performance.now();
    console.log(`Matrix filtered and rendered in ${endTime - startTime}ms`);
}

/**
 * Opens the side drawer and populates it with the selected item's details.
 * @param {string} itemId - The ID of the item to display.
 */
function openDrawer(itemId) {
    const item = allItems.find(i => i.id === itemId);
    if (!item) return;

    const drawer = document.getElementById('item-drawer');
    const overlay = document.getElementById('drawer-overlay');

    drawer.innerHTML = renderItemDrawer(item);
    drawer.classList.add('open');
    overlay.classList.add('open');

    const closeBtn = document.getElementById('closeDrawerBtn');
    closeBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);

    // Trap focus
    const focusableElements = drawer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    drawer.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            if (e.shiftKey) { // Shift + Tab
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else { // Tab
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        } else if (e.key === 'Escape') {
            closeDrawer();
        }
    });

    const logBtn = document.getElementById('logItemInteractionBtn');
    if(logBtn) {
        logBtn.addEventListener('click', () => {
            closeDrawer();
            // Small delay to allow smooth transition
            setTimeout(() => openIncidentLogModal(item), 100);
        });
    }

    closeBtn.focus(); // For accessibility
}

/**
 * Closes the side drawer.
 */
function closeDrawer() {
    const drawer = document.getElementById('item-drawer');
    const overlay = document.getElementById('drawer-overlay');
    drawer.classList.remove('open');
    overlay.classList.remove('open');
}
