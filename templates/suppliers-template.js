// --- suppliers-template.js ---
// Provides HTML templating for supplier page components.

import { itemCategoryIcons } from '../config.js'; // NEW: Import icon mappings

/**
 * Generates the HTML for a single supplier card/list item.
 * @param {Object} supplier - The supplier object.
 * @param {Array<Object>} allUniqueItems - A list of all unique items across all locations.
 * @returns {string} The HTML string for a supplier card.
 */
export function createSupplierCardHtml(supplier, allUniqueItems) {
    const supplierCategories = new Set(); // Use a Set to store unique categories for this supplier

    // Determine unique categories based on itemsSupplied names
    if (supplier.itemsSupplied && Array.isArray(supplier.itemsSupplied)) {
        supplier.itemsSupplied.forEach(itemName => {
            const item = allUniqueItems.find(i => i.name === itemName);
            if (item && item.category) {
                supplierCategories.add(item.category);
            }
        });
    }

    // Generate icon HTML for each unique category
    let iconsHtml = '';
    const sortedCategories = Array.from(supplierCategories).sort(); // Sort categories alphabetically for consistent display
    sortedCategories.forEach(category => {
        const iconInfo = itemCategoryIcons[category] || itemCategoryIcons['Uncategorized'];
        if (iconInfo) {
            iconsHtml += `
                <div class="supplier-icon ${iconInfo.colorClass}" data-tooltip-text="${category}"> <!-- REMOVED title, ADDED data-tooltip-text -->
                    <i class="${iconInfo.icon}"></i>
                </div>
            `;
        }
    });

    return `
        <div class="supplier-card" data-supplier-id="${supplier.id}">
            <div class="supplier-icons-container">
                ${iconsHtml}
            </div>
            <h3 class="supplier-name">${supplier.name}</h3>
            <p class="supplier-contact">Contact: ${supplier.contactPerson}</p>
            <p class="supplier-email"><i class="fas fa-envelope"></i> ${supplier.email}</p>
            <p class="supplier-phone"><i class="fas fa-phone-alt"></i> ${supplier.phone}</p> <!-- CORRECTED line -->
            <button class="auth-button small-btn view-details-btn">View Details</button>
        </div>
    `;
}

/**
 * Generates the HTML for the supplier details modal body.
 * @param {Object} supplier - The supplier object. Can be null/undefined for 'add new'.
 * @param {Array<Object>} allAvailableItems - A list of all unique items available in the system.
 * @returns {string} The HTML string for the supplier details form/display.
 */
export function createSupplierDetailsModalBodyHtml(supplier, allAvailableItems = []) {
    // Safely destructure properties, providing default empty values if supplier is null/undefined
    const {
        id,
        name,
        contactPerson,
        email,
        phone,
        address,
        itemsSupplied = [], // Default to empty array
        notes
    } = supplier || {}; // If supplier is null/undefined, use an empty object

    const isNew = !id; // Determine if it's a new supplier based on 'id' existence

    // Group all available items by category
    const categorizedItems = allAvailableItems.reduce((acc, item) => {
        const category = item.category || 'Uncategorized';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(item);
        return acc;
    }, {});

    // Generate HTML for item checkboxes, grouped by category
    let itemsCheckboxesHtml = '';
    const sortedCategories = Object.keys(categorizedItems).sort();

    if (allAvailableItems.length === 0) {
        itemsCheckboxesHtml = '<p class="modal-message info-message no-items-message">No inventory items found to list here. Add items to a location first.</p>';
    } else {
        sortedCategories.forEach(category => {
            itemsCheckboxesHtml += `<div class="item-category-group">`;
            itemsCheckboxesHtml += `<h5 class="category-heading">${category}</h5>`;
            itemsCheckboxesHtml += `<div class="item-checkboxes-grid">`;
            categorizedItems[category].sort((a, b) => a.name.localeCompare(b.name)).forEach(item => {
                // Check if the current supplier already supplies this item by name
                const isChecked = itemsSupplied.includes(item.name);
                itemsCheckboxesHtml += `
                    <label class="item-checkbox-label">
                        <input type="checkbox" name="itemsSupplied" value="${item.name}" ${isChecked ? 'checked' : ''}>
                        ${item.name}
                    </label>
                `;
            });
            itemsCheckboxesHtml += `</div></div>`;
        });
    }

    return `
        <div class="modal-supplier-details-form">
            <div class="modal-input-group">
                <label for="supplierName">Supplier Name:</label>
                <input type="text" id="supplierName" class="auth-input modal-input" value="${name || ''}" placeholder="e.g., Premium Meat Co." ${isNew ? '' : 'readonly'}>
            </div>
            <div class="modal-input-group">
                <label for="contactPerson">Contact Person:</label>
                <input type="text" id="contactPerson" class="auth-input modal-input" value="${contactPerson || ''}" placeholder="e.g., John Smith">
            </div>
            <div class="modal-input-group">
                <label for="supplierEmail">Email:</label>
                <input type="email" id="supplierEmail" class="auth-input modal-input" value="${email || ''}" placeholder="e.g., info@meatco.com">
            </div>
            <div class="modal-input-group">
                <label for="supplierPhone">Phone:</label>
                <input type="tel" id="supplierPhone" class="auth-input modal-input" value="${phone || ''}" placeholder="e.g., +44 1234 567890">
            </div>
            <div class="modal-input-group">
                <label for="supplierAddress">Address (Optional):</label>
                <textarea id="supplierAddress" class="auth-input modal-input" placeholder="e.g., 123 Food Street, City, Postcode">${address || ''}</textarea>
            </div>

            <div class="modal-input-group items-supplied-section">
                <label>Items Supplied:</label>
                ${itemsCheckboxesHtml}
                <p class="small-text">Select all items this supplier provides.</p>
            </div>

            <div class="modal-input-group">
                <label for="supplierNotes">Notes:</label>
                <textarea id="supplierNotes" class="auth-input modal-input" placeholder="Any special notes about this supplier...">${notes || ''}</textarea>
            </div>
        </div>
    `;
}
