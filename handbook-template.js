// --- handbook-template.js ---
// Contains HTML template functions for the staff-facing handbook pages.

import { FSA_ALLERGENS } from './constants.js';

/**
 * Creates the main layout for the searchable allergen matrix page.
 * @returns {string} The HTML structure for the page.
 */
export function createMatrixPageLayout() {
    // Allergen filter options
    const allergenOptions = FSA_ALLERGENS.map(allergen => `
        <label>
            <input type="checkbox" class="allergen-filter-checkbox" value="${allergen.id}">
            ${allergen.name}
        </label>
    `).join('');

    return `
        <div class="handbook-page">
            <div id="persistent-banner" class="persistent-banner">
                <!-- Banner content will be rendered here -->
            </div>
            <header class="handbook-header">
                <h2 class="page-title">Allergen Matrix</h2>
            </header>
            <div class="matrix-controls">
                <div class="search-bar">
                    <i class="fas fa-search"></i>
                    <input type="text" id="matrixSearchInput" placeholder="Search menu items...">
                </div>
                <div class="filter-group">
                    <select id="categoryFilter" class="filter-select">
                        <option value="">All Categories</option>
                        <!-- Category options will be populated dynamically -->
                    </select>
                    <div class="allergen-multiselect">
                        <button id="allergenFilterBtn" class="filter-btn">
                            Filter by Allergen <i class="fas fa-chevron-down"></i>
                        </button>
                        <div id="allergenFilterDropdown" class="filter-dropdown">
                            ${allergenOptions}
                        </div>
                    </div>
                    <div class="toggle-group">
                        <label class="toggle-switch-label">Contains Only</label>
                        <label class="toggle-switch">
                            <input type="radio" name="contain_filter" value="contains" class="filter-radio">
                            <span class="slider round"></span>
                        </label>
                        <label class="toggle-switch-label">May Contain Only</label>
                        <label class="toggle-switch">
                            <input type="radio" name="contain_filter" value="may_contain" class="filter-radio">
                            <span class="slider round"></span>
                        </label>
                         <button id="clearFiltersBtn" class="filter-btn clear-btn"><i class="fas fa-times"></i> Clear</button>
                    </div>
                </div>
            </div>
            <div id="matrix-container" class="matrix-container">
                <!-- Allergen matrix table will be rendered here -->
            </div>
        </div>
        <div id="item-drawer" class="side-drawer">
            <!-- Item details will be rendered here -->
        </div>
        <div id="drawer-overlay" class="drawer-overlay"></div>
    `;
}


/**
 * Renders the HTML for the allergen matrix table.
 * @param {Array<Object>} items - The menu items to display.
 * @param {Array<string>} allergens - The list of allergen IDs to display as columns.
 * @returns {string} The HTML for the table.
 */
export function renderMatrixTable(items, allergens) {
    if (!items || items.length === 0) {
        return '<p class="no-results-message">No menu items match the current filters.</p>';
    }

    const allergenNameMap = FSA_ALLERGENS.reduce((acc, allergen) => {
        acc[allergen.id] = allergen.name;
        return acc;
    }, {});

    let tableHtml = `
        <table class="interactive-allergen-table">
            <thead>
                <tr>
                    <th>Menu Item</th>
                    ${allergens.map(id => `<th>${allergenNameMap[id] || id}</th>`).join('')}
                    <th>Notes</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => `
                    <tr data-item-id="${item.id}" tabindex="0" aria-label="${item.name}, Category: ${item.category}">
                        <td role="rowheader">${item.name}</td>
                        ${allergens.map(allergenId => {
                            const status = item.allergens[allergenId] || 'unknown';
                            const statusText = status.replace('_', ' ');
                            const allergenName = allergenNameMap[allergenId];
                             return `<td class="status-cell" data-status="${status}">
                                        <span class="badge status-${status}" role="img" aria-label="${allergenName}: ${statusText}"></span>
                                     </td>`;
                        }).join('')}
                        <td class="notes-cell">${item.notes || ''}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    return tableHtml;
}

/**
 * Renders the content for the side drawer with item details.
 * @param {Object} item - The menu item to display.
 * @returns {string} The HTML for the drawer content.
 */
export function renderItemDrawer(item) {
    if (!item) return '';

    // Heuristic for substitutions from notes
    let substitutions = '<li>None suggested. Check with the kitchen for options.</li>';
    if (item.substitutions && Array.isArray(item.substitutions) && item.substitutions.length > 0) {
        substitutions = item.substitutions.map(sub => `<li>${sub}</li>`).join('');
    } else if (item.notes && item.notes.toLowerCase().includes('substitute')) {
        // A simple split, assuming notes are well-formatted.
        substitutions = item.notes.split(/substitute with/i)[1]?.split(',').map(s => `<li>${s.trim()}</li>`).join('') || '<li>Check notes for details.</li>';
    }


    const containsAllergens = FSA_ALLERGENS
        .filter(allergen => item.allergens[allergen.id] === 'contains')
        .map(a => a.name).join(', ') || 'none';

    const mayContainAllergens = FSA_ALLERGENS
        .filter(allergen => item.allergens[allergen.id] === 'may_contain')
        .map(a => a.name).join(', ') || 'none';


    return `
        <div class="drawer-header">
            <h3>${item.name}</h3>
            <button id="closeDrawerBtn" class="close-drawer-btn" aria-label="Close item details">&times;</button>
        </div>
        <div class="drawer-body">
            <div class="drawer-section">
                <h4>Item Details</h4>
                <p><strong>Category:</strong> ${item.category}</p>
            </div>

            <div class="drawer-section">
                <h4>Allergen Status</h4>
                <ul class="drawer-allergen-list">
                    ${FSA_ALLERGENS.map(allergen => {
                        const status = item.allergens[allergen.id] || 'unknown';
                        return `<li>
                                    <span class="allergen-name">${allergen.name}</span>
                                    <span class="badge-container">
                                        <span class="badge status-${status}">${status.replace(/_/g, ' ')}</span>
                                    </span>
                                </li>`;
                    }).join('')}
                </ul>
            </div>

            <div class="drawer-section">
                <h4>Suggested Substitutions</h4>
                <ul class="substitutions-list">
                    ${substitutions}
                </ul>
            </div>

            <div class="drawer-section">
                <h4>Staff Script</h4>
                <div class="staff-script-block">
                    <p>"The <strong>${item.name}</strong> contains <strong>${containsAllergens}</strong>. It may also contain traces of <strong>${mayContainAllergens}</strong>. We can suggest the following substitutions: [read suggestions]."</p>
                </div>
            </div>

            <hr>
            <button id="logItemInteractionBtn" class="button full-width">
                <i class="fas fa-exclamation-circle"></i> Log Allergy Interaction for this Item
            </button>
        </div>
    `;
}


/**
 * Renders the persistent banner for specials.
 * @returns {string} The HTML for the banner.
 */
export function renderBanner() {
    return `
        <p><i class="fas fa-exclamation-triangle"></i> <strong>Specials:</strong> Always ask a manager for allergen information for daily specials as they are not listed here.</p>
    `;
}
