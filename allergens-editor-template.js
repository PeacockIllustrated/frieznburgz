// --- allergens-editor-template.js ---

/**
 * Creates the main HTML structure for the Allergen Editor page.
 * @returns {string} The HTML string for the page.
 */
export function createAllergenEditorLayout() {
    return `
        <div class="allergen-editor-container">
            <div class="allergen-editor-sidebar">
                <div class="sidebar-header">
                    <input type="search" id="menuItemSearch" placeholder="Search menu items..." class="search-input">
                    <div class="sidebar-filters">
                        <select id="categoryFilter" class="filter-select">
                            <option value="">All Categories</option>
                            <!-- Categories will be populated dynamically -->
                        </select>
                        <select id="activeFilter" class="filter-select">
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                        </select>
                    </div>
                </div>
                <div id="menuItemsList" class="sidebar-list">
                    <!-- Menu items will be populated dynamically -->
                </div>
                 <div class="sidebar-footer">
                    <button id="newMenuItemBtn" class="new-item-btn"><i class="fas fa-plus"></i> New Menu Item</button>
                    <button id="seedMenuBtn" class="new-item-btn secondary-btn" style="margin-top: 10px; background-color: #6c757d;"><i class="fas fa-seedling"></i> Seed Menu</button>
                </div>
            </div>
            <div class="allergen-editor-main">
                <div class="editor-header-links" style="padding: 10px; text-align: right;">
                     <a href="README_Allergens.md" target="_blank" class="help-link"><i class="fas fa-book"></i> Docs</a>
                     <a href="QA_Allergens.md" target="_blank" class="help-link"><i class="fas fa-tasks"></i> QA Checklist</a>
                </div>
                <div id="editorWelcome" class="editor-welcome">
                    <h2>Welcome to the Allergen Editor</h2>
                    <p>Select a menu item from the list on the left to begin editing.</p>
                    <i class="fas fa-edit fa-3x"></i>
                </div>
                <div id="itemEditor" class="item-editor" style="display: none;">
                    <div class="editor-toolbar">
                        <h2 id="editorItemName" class="item-name-display"></h2>
                        <div class="toolbar-actions">
                             <button id="publishMatrixBtn" class="toolbar-button primary"><i class="fas fa-cloud-upload-alt"></i> Publish Matrix</button>
                             <button id="duplicateMenuItemBtn" class="toolbar-button"><i class="fas fa-copy"></i> Duplicate</button>
                             <button id="deactivateMenuItemBtn" class="toolbar-button danger"><i class="fas fa-ban"></i> Deactivate</button>
                        </div>
                    </div>
                    <div id="editorForm" class="editor-form">
                        <!-- Allergen grid and notes will be populated here -->
                    </div>
                    <div class="editor-footer">
                        <div class="save-status">
                            <span id="lastEdited" class="last-edited-text"></span>
                        </div>
                        <button id="saveChangesBtn" class="save-button">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Creates the HTML for the allergen editing grid.
 * @param {Array<object>} allergens - The list of FSA allergens from constants.js.
 * @param {object} itemAllergens - The current allergen status for the item.
 * @returns {string} The HTML for the allergen grid.
 */
export function createAllergenGrid(allergens, itemAllergens = {}) {
    return allergens.map(allergen => `
        <div class="allergen-row">
            <div class="allergen-name">
                <i class="fas ${allergen.iconKey}"></i>
                <span>${allergen.name}</span>
            </div>
            <div class="allergen-options">
                <label>
                    <input type="radio" name="${allergen.id}" value="contains" ${itemAllergens[allergen.id] === 'contains' ? 'checked' : ''}> Contains
                </label>
                <label>
                    <input type="radio" name="${allergen.id}" value="may_contain" ${itemAllergens[allergen.id] === 'may_contain' ? 'checked' : ''}> May Contain
                </label>
                <label>
                    <input type="radio" name="${allergen.id}" value="free" ${itemAllergens[allergen.id] === 'free' ? 'checked' : ''}> Free
                </label>
                <label>
                    <input type="radio" name="${allergen.id}" value="unknown" ${!itemAllergens[allergen.id] || itemAllergens[allergen.id] === 'unknown' ? 'checked' : ''}> Unknown
                </label>
            </div>
        </div>
    `).join('');
}

/**
 * Creates the HTML for the notes section of the editor.
 * @param {string} notes - The current notes for the item.
 * @returns {string} The HTML for the notes textarea.
 */
export function createNotesSection(notes = '') {
    return `
        <div class="notes-section">
            <h3>Notes</h3>
            <textarea id="allergenNotes" class="notes-textarea" placeholder="Add any specific notes about allergens for this item...">${notes}</textarea>
        </div>
    `;
}
