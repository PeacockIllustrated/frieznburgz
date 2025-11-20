// --- allergens-template.js ---
// Contains HTML template functions for the Allergens module.
import { FSA_ALLERGENS } from './constants.js';

/**
 * Creates the basic HTML structure for a content page.
 * @param {string} title - The title to display at the top of the page.
 * @param {string} contentHtml - The HTML content to place below the title.
 * @returns {string} The complete HTML for the page section.
 */
export function createPageHtml(title, contentHtml) {
    return `
        <div class="page-header">
             <h2 class="page-title">${title}</h2>
             <div class="header-actions">
                 <!-- Actions will be injected here if needed, or controlled by CSS -->
             </div>
        </div>
        <div class="page-content">
            ${contentHtml}
        </div>
    `;
}

export function createAllergenMatrixForStaff(matrixSnapshot) {
    if (!matrixSnapshot || matrixSnapshot.length === 0) {
        return '<p>No menu items available in this version.</p>';
    }

    // Create a set of all allergens present in the snapshot for the header
    const allAllergens = new Set();
    matrixSnapshot.forEach(item => {
        Object.keys(item.allergens).forEach(allergenId => {
            allAllergens.add(allergenId);
        });
    });

    const sortedAllergens = Array.from(allAllergens).sort();

    const allergenNameMap = FSA_ALLERGENS.reduce((acc, allergen) => {
        acc[allergen.id] = allergen.name;
        return acc;
    }, {});

    let tableHtml = `
        <table class="staff-allergen-table">
            <thead>
                <tr>
                    <th>Menu Item</th>
                    ${sortedAllergens.map(allergenId => `<th>${allergenNameMap[allergenId] || allergenId}</th>`).join('')}
                    <th>Notes</th>
                </tr>
            </thead>
            <tbody>
    `;

    matrixSnapshot.forEach(item => {
        // Make the row clickable by adding a data-id attribute
        tableHtml += `
            <tr class="clickable-row" data-item-id="${item.id}" tabindex="0" role="button" aria-label="View details for ${item.name}">
                <td role="rowheader">
                    <div class="item-name-cell">
                        ${item.name}
                        <i class="fas fa-info-circle info-icon" aria-hidden="true"></i>
                    </div>
                </td>
                ${sortedAllergens.map(allergenId => {
                    const status = item.allergens[allergenId] || 'unknown';
                    const allergenName = allergenNameMap[allergenId] || allergenId;
                    return `<td class="status-${status}" aria-label="${allergenName}: ${status.replace(/_/g, ' ')}">
                                ${status.replace(/_/g, ' ')}
                            </td>`;
                }).join('')}
                <td>${item.notes || ''}</td>
            </tr>
        `;
    });

    tableHtml += '</tbody></table>';
    return tableHtml;
}
