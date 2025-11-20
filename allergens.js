// --- allergens.js ---
// Manages the rendering and logic for all allergen-related pages.
import { db, auth } from './firebase.js';
import { getCurrentUser } from './user.js';
import { showToast } from './ui.js';
import { createPageHtml, createAllergenMatrixForStaff } from './templates/allergens-template.js';
import { createAllergenEditorLayout, createAllergenGrid, createNotesSection } from './templates/allergens-editor-template.js';
import { FSA_ALLERGENS, ALLERGEN_STATUS } from './constants.js';
import { locations } from './config.js';
import { seedMenuItems } from './seed-menu-items.js';


// --- Page Rendering Functions ---

export async function renderAllergenMatrixPage() {
    const pageContainer = document.getElementById('allergenMatrixPage');
    pageContainer.innerHTML = createPageHtml('Allergen Matrix', '<p>Loading latest allergen matrix...</p>');

    try {
        const versionsSnapshot = await db.collection('allergenVersions')
            .orderBy('publishedAt', 'desc')
            .limit(1)
            .get();

        if (versionsSnapshot.empty) {
            pageContainer.innerHTML = createPageHtml('Allergen Matrix', '<p>No published allergen matrix found. Please ask an admin to publish a version.</p>');
            return;
        }

        const latestVersion = versionsSnapshot.docs[0].data();
        const publishedAt = latestVersion.publishedAt ? new Date(latestVersion.publishedAt.seconds * 1000).toLocaleString() : 'N/A';
        const publishedBy = latestVersion.publishedBy || 'N/A';

        const content = `
            <div class="version-info">
                <h3>${latestVersion.title}</h3>
                <p><strong>Published on:</strong> ${publishedAt}</p>
                <p><strong>Published by:</strong> ${publishedBy}</p>
                ${latestVersion.changeLog ? `<p><strong>Notes:</strong> ${latestVersion.changeLog}</p>` : ''}
            </div>
            <div class="allergen-matrix-grid">
                ${createAllergenMatrixForStaff(latestVersion.matrixSnapshot)}
            </div>
        `;

        pageContainer.innerHTML = createPageHtml('Allergen Matrix', content);

        // Inject the global "Log Interaction" button into the header
        injectLogButton(pageContainer);

        // Add event listeners for row clicks (Item Details)
        const rows = pageContainer.querySelectorAll('.clickable-row');
        rows.forEach(row => {
            row.addEventListener('click', () => {
                const itemId = row.dataset.itemId;
                const itemData = latestVersion.matrixSnapshot.find(i => i.id === itemId);
                openItemDetailsModal(itemData);
            });
        });

    } catch (error) {
        console.error("Error fetching latest allergen version:", error);
        pageContainer.innerHTML = createPageHtml('Allergen Matrix', '<p class="error-message">Could not load the allergen matrix.</p>');
    } finally {
        // Always try to inject the button, even if data loading fails
        injectLogButton(pageContainer);
    }
}

function injectLogButton(container) {
    const headerActions = container.querySelector('.header-actions');
    if (headerActions) {
        const btn = document.createElement('button');
        btn.className = 'button';
        btn.innerHTML = '<i class="fas fa-clipboard-list"></i> Log Interaction';
        btn.onclick = () => openIncidentLogModal();
        headerActions.appendChild(btn);
    }
}

function openItemDetailsModal(item) {
    if (!item) return;

    // Filter allergens to show only those that are NOT "free" or "unknown" (unless strictly required to show all)
    // Or just show the grid cleanly. Let's show a nice summary list.
    const relevantAllergens = FSA_ALLERGENS.filter(a => {
        const status = item.allergens[a.id];
        return status === 'contains' || status === 'may_contain';
    });

    const allergenListHtml = relevantAllergens.length > 0
        ? `<ul class="detail-allergen-list">
            ${relevantAllergens.map(a => `
                <li class="status-${item.allergens[a.id]}">
                    <i class="fas ${a.iconKey}"></i>
                    <strong>${a.name}:</strong> ${item.allergens[a.id].replace('_', ' ')}
                </li>
            `).join('')}
           </ul>`
        : '<p>No major allergens declared (Free/Unknown).</p>';

    const modalBody = `
        <div class="item-details-modal">
            <div class="item-meta">
                <span class="badge category-badge">${item.category || 'Uncategorized'}</span>
            </div>
            <h4>Allergen Information</h4>
            ${allergenListHtml}

            ${item.notes ? `<h4>Notes</h4><p>${item.notes}</p>` : ''}

            <hr>
            <button id="logItemInteractionBtn" class="button full-width">
                <i class="fas fa-exclamation-circle"></i> Log Allergy Interaction for this Item
            </button>
        </div>
    `;

    window.mainApp.openModal(item.name, modalBody, '');

    document.getElementById('logItemInteractionBtn').addEventListener('click', () => {
        // Close current modal and open log modal with item context
        window.mainApp.closeModal();
        // Small delay to allow smooth transition if needed, but usually instant is fine
        setTimeout(() => openIncidentLogModal(item), 100);
    });
}

export function openIncidentLogModal(itemContext = null) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showToast("You must be logged in to log an incident.", "error");
        return;
    }

    const title = itemContext ? `Log Interaction: ${itemContext.name}` : 'Log Allergy Interaction';

    const modalBody = `
        <form id="incidentForm" class="incident-form">
            <div class="form-group">
                <label>Store Location <span class="required">*</span></label>
                <select id="incidentStore" class="modal-input" required>
                    <option value="">Select Store...</option>
                    ${locations.map(loc => `<option value="${loc.id}">${loc.name}</option>`).join('')}
                </select>
            </div>

            <div class="form-group">
                <label>Customer Allergy (Select all that apply)</label>
                <div class="checkbox-grid">
                    ${FSA_ALLERGENS.map(a => `
                        <label class="checkbox-label">
                            <input type="checkbox" name="customerAllergy" value="${a.name}">
                            ${a.name}
                        </label>
                    `).join('')}
                </div>
            </div>

            <div class="form-group">
                <label>Item Ordered / Discussed</label>
                <input type="text" id="incidentItem" class="modal-input"
                    value="${itemContext ? itemContext.name : ''}"
                    placeholder="e.g., Classic Burger (or General Inquiry)">
            </div>

            <div class="form-group">
                <label>Action Taken <span class="required">*</span></label>
                <input type="text" id="incidentAction" class="modal-input" required
                    placeholder="e.g., Checked matrix, advised customer...">
            </div>

            <div class="form-group">
                <label>Outcome <span class="required">*</span></label>
                <select id="incidentOutcome" class="modal-input" required>
                    <option value="served_safely">Served Safely</option>
                    <option value="refused">Refused Service (Safety)</option>
                    <option value="escalated">Escalated to Manager</option>
                </select>
            </div>

            <div class="form-group">
                <label>Notes</label>
                <textarea id="incidentNotes" class="modal-textarea" placeholder="Any additional details..."></textarea>
            </div>
        </form>
    `;

    const modalFooter = `<button id="submitIncidentBtn" class="button-primary">Submit Log</button>`;

    window.mainApp.openModal(title, modalBody, modalFooter);

    // Pre-select user's location if available
    if (currentUser.locationId && currentUser.locationId !== 'all_locations') {
        const locSelect = document.getElementById('incidentStore');
        if (locSelect) locSelect.value = currentUser.locationId;
    }

    document.getElementById('submitIncidentBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        const store = document.getElementById('incidentStore').value;
        const itemOrdered = document.getElementById('incidentItem').value.trim();
        const actionTaken = document.getElementById('incidentAction').value.trim();
        const outcome = document.getElementById('incidentOutcome').value;
        const notes = document.getElementById('incidentNotes').value.trim();

        const allergyCheckboxes = document.querySelectorAll('input[name="customerAllergy"]:checked');
        const customerAllergies = Array.from(allergyCheckboxes).map(cb => cb.value);

        if (!store || !actionTaken || !outcome) {
            showToast("Please fill in all required fields.", "error");
            return;
        }

        if (customerAllergies.length === 0) {
            if(!confirm("No specific allergies selected. Submit anyway?")) return;
        }

        const incidentData = {
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid,
            createdByName: currentUser.displayName || currentUser.email,
            store,
            storeName: locations.find(l => l.id === store)?.name || store,
            customerAllergies,
            itemOrdered: itemOrdered || "General Inquiry",
            actionTaken,
            outcome,
            notes
        };

        try {
            await db.collection('allergyIncidents').add(incidentData);
            showToast("Incident logged successfully.", "success");
            window.mainApp.closeModal();
        } catch (error) {
            console.error("Error logging incident:", error);
            showToast("Failed to log incident.", "error");
        }
    });
}

export async function renderAllergyIncidentsPage() {
    const pageContainer = document.getElementById('allergenIncidentsPage');

    // Determine default date range (last 30 days)
    const endDateDefault = new Date().toISOString().split('T')[0];
    const startDateDefault = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const headerHtml = `
        <div class="incidents-toolbar">
            <div class="filter-row">
                <div class="filter-group">
                    <label>Start Date:</label>
                    <input type="date" id="filterStartDate" value="${startDateDefault}">
                </div>
                <div class="filter-group">
                    <label>End Date:</label>
                    <input type="date" id="filterEndDate" value="${endDateDefault}">
                </div>
                <div class="filter-group">
                    <label>Status:</label>
                    <select id="filterOutcome">
                        <option value="">All Outcomes</option>
                        <option value="served_safely">Served Safely</option>
                        <option value="refused">Refused</option>
                        <option value="escalated">Escalated</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Store:</label>
                    <select id="filterStore">
                        <option value="">All Stores</option>
                        ${locations.map(loc => `<option value="${loc.id}">${loc.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="action-row" style="margin-top: 1rem;">
                <button id="refreshIncidentsBtn" class="button"><i class="fas fa-sync"></i> Refresh</button>
                <button id="exportIncidentsBtn" class="button"><i class="fas fa-file-csv"></i> Export CSV</button>
            </div>
        </div>
        <div id="incidentsTableContainer">
            <p>Loading incidents...</p>
        </div>
    `;

    pageContainer.innerHTML = createPageHtml('Allergy Incident Logs', headerHtml);

    document.getElementById('refreshIncidentsBtn').addEventListener('click', fetchAndRenderIncidents);
    document.getElementById('exportIncidentsBtn').addEventListener('click', exportIncidentsToCsv);

    // No auto-fetch on change to avoid spamming if user changes multiple filters
    // document.getElementById('filterOutcome').addEventListener('change', fetchAndRenderIncidents);
    // document.getElementById('filterStore').addEventListener('change', fetchAndRenderIncidents);
    // document.getElementById('filterStartDate').addEventListener('change', fetchAndRenderIncidents);

    await fetchAndRenderIncidents();
}

let currentIncidents = []; // Cache for export

async function fetchAndRenderIncidents() {
    const container = document.getElementById('incidentsTableContainer');
    const outcomeFilter = document.getElementById('filterOutcome').value;
    const storeFilter = document.getElementById('filterStore').value;
    const startDateVal = document.getElementById('filterStartDate').value;
    const endDateVal = document.getElementById('filterEndDate').value;

    container.innerHTML = '<div class="loading-spinner">Loading...</div>';

    try {
        let query = db.collection('allergyIncidents').orderBy('createdAt', 'desc');

        if (outcomeFilter) {
            query = query.where('outcome', '==', outcomeFilter);
        }
        if (storeFilter) {
            query = query.where('store', '==', storeFilter);
        }

        // Date filtering
        // Note: Firestore equality filters (outcome, store) must come before range filters (createdAt)
        // if we use a composite index. If not, we might need client-side filtering for some.
        // However, 'createdAt' is the orderBy field.
        // Firestore requires range filter to be on the same field as orderBy.
        // Since we order by createdAt, we can filter by createdAt.

        if (startDateVal) {
             const startDate = new Date(startDateVal);
             query = query.where('createdAt', '>=', startDate);
        }

        if (endDateVal) {
            const endDate = new Date(endDateVal);
            // Add one day to include the end date fully
            endDate.setDate(endDate.getDate() + 1);
            query = query.where('createdAt', '<', endDate);
        }

        // Limit safety
        query = query.limit(500);

        const snapshot = await query.get();
        currentIncidents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (currentIncidents.length === 0) {
            container.innerHTML = '<p>No incidents found matching criteria.</p>';
            return;
        }

        const tableHtml = `
            <table class="incidents-table">
                <thead>
                    <tr>
                        <th>Date/Time</th>
                        <th>Store</th>
                        <th>Staff</th>
                        <th>Item</th>
                        <th>Allergy</th>
                        <th>Outcome</th>
                        <th>Action/Notes</th>
                    </tr>
                </thead>
                <tbody>
                    ${currentIncidents.map(incident => {
                        const date = incident.createdAt ? new Date(incident.createdAt.seconds * 1000).toLocaleString() : 'N/A';
                        const outcomeClass = incident.outcome === 'refused' ? 'status-refused' :
                                             incident.outcome === 'escalated' ? 'status-escalated' : 'status-success';

                        return `
                            <tr>
                                <td>${date}</td>
                                <td>${incident.storeName || incident.store}</td>
                                <td>${incident.createdByName || 'Unknown'}</td>
                                <td>${incident.itemOrdered}</td>
                                <td>${(incident.customerAllergies || []).join(', ')}</td>
                                <td><span class="badge ${outcomeClass}">${incident.outcome.replace('_', ' ')}</span></td>
                                <td>
                                    <div class="action-text"><strong>Action:</strong> ${incident.actionTaken}</div>
                                    ${incident.notes ? `<div class="notes-text"><em>${incident.notes}</em></div>` : ''}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = tableHtml;

    } catch (error) {
        console.error("Error loading incidents:", error);
        container.innerHTML = `<p class="error-message">Error loading data: ${error.message}</p>`;
    }
}

function exportIncidentsToCsv() {
    if (!currentIncidents || currentIncidents.length === 0) {
        showToast("No data to export.", "info");
        return;
    }

    const csvData = currentIncidents.map(row => ({
        Date: row.createdAt ? new Date(row.createdAt.seconds * 1000).toISOString() : '',
        Store: row.storeName || row.store,
        Staff: row.createdByName || row.createdBy,
        Item: row.itemOrdered,
        Allergies: (row.customerAllergies || []).join('; '),
        Outcome: row.outcome,
        Action: row.actionTaken,
        Notes: row.notes || ''
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `allergy_incidents_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


export async function renderAllergenProceduresPage() {
    const content = '<h2>Allergen Procedures</h2><p>Standard operating procedures for handling allergens.</p>';
    document.getElementById('allergenProceduresPage').innerHTML = createPageHtml('Allergen Procedures', content);
}

export async function renderAllergenTrainingPage() {
    const content = '<h2>Allergen Training</h2><p>Training materials and resources.</p>';
    document.getElementById('allergenTrainingPage').innerHTML = createPageHtml('Allergen Training', content);
}

export async function renderAllergenPrintPage() {
    const pageContainer = document.getElementById('allergenPrintPage');

    // Render Loading State
    pageContainer.innerHTML = '<div class="loading-spinner">Generating print view...</div>';

    try {
        // Fetch latest published version
        const versionsSnapshot = await db.collection('allergenVersions')
            .orderBy('publishedAt', 'desc')
            .limit(1)
            .get();

        if (versionsSnapshot.empty) {
            pageContainer.innerHTML = '<p class="error-message">No published version available to print.</p>';
            return;
        }

        const versionData = versionsSnapshot.docs[0].data();
        const items = versionData.matrixSnapshot || [];
        const publishedAt = versionData.publishedAt ? new Date(versionData.publishedAt.seconds * 1000).toLocaleString() : 'N/A';

        // Generate QR Code URL (pointing to the matrix page)
        // Assumes the app is hosted at the current origin
        const matrixUrl = `${window.location.origin}?page=allergen-matrix`;

        const printHtml = `
            <div class="print-controls">
                <button class="button" onclick="window.print()"><i class="fas fa-print"></i> Print</button>
                <button class="button" onclick="window.print()"><i class="fas fa-file-pdf"></i> Download PDF</button>
            </div>

            <div class="print-page-container">
                <header class="print-header">
                    <div class="print-header-left">
                        <h1 class="print-title">Friez n Burgz | Allergen Matrix</h1>
                        <div class="print-meta">
                            Version: ${versionData.title} <br>
                            Published: ${publishedAt}
                        </div>
                    </div>
                    <div class="print-header-right">
                         <div class="qr-container">
                            <canvas id="qrCodeCanvas"></canvas>
                            <span>Scan for live updates</span>
                         </div>
                    </div>
                </header>

                <div class="print-banner">
                    PLEASE ASK ABOUT ALLERGEN INFORMATION FOR SPECIALS
                </div>

                <div class="print-legend">
                    <div class="legend-item">
                        <span class="legend-box contains"></span>
                        <span>Contains</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-box may-contain"></span>
                        <span>May Contain</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-box free"></span>
                        <span>Free</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-box unknown"></span>
                        <span>Unknown</span>
                    </div>
                </div>

                <table class="print-matrix-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            ${FSA_ALLERGENS.map(a => `<th class="allergen-header"><div>${a.name}</div></th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td class="item-name">${item.name}</td>
                                ${FSA_ALLERGENS.map(a => {
                                    const status = item.allergens[a.id] || 'unknown';
                                    return `<td><span class="status-indicator ${status}"></span></td>`;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                 <footer class="print-footer" style="margin-top: 20px; font-size: 10px; text-align: center; color: #777;">
                    Generated on ${new Date().toLocaleString()} | Use the QR code to verify the latest information.
                </footer>
            </div>
        `;

        pageContainer.innerHTML = printHtml;

        // Generate QR Code
        if (window.QRious) {
            new QRious({
                element: document.getElementById('qrCodeCanvas'),
                value: matrixUrl,
                size: 80
            });
        } else {
            console.warn("QRious library not loaded. QR code generation skipped.");
            document.getElementById('qrCodeCanvas').style.display = 'none';
        }

    } catch (error) {
        console.error("Error rendering print page:", error);
        pageContainer.innerHTML = `<p class="error-message">Error loading print view: ${error.message}</p>`;
    }
}

// --- Admin-Only Page Rendering Functions ---

// A cache for menu items to avoid re-fetching from Firestore unnecessarily
let menuItemsCache = [];
let selectedItemId = null;

export async function renderAllergenEditorPage() {
    // Set the main layout
    document.getElementById('allergenEditorPage').innerHTML = createPageHtml('Allergen Matrix Editor', createAllergenEditorLayout());

    // Fetch menu items and populate the list
    await fetchAndRenderMenuItems();

    // Add event listeners for search and filters
    const searchInput = document.getElementById('menuItemSearch');
    const categoryFilter = document.getElementById('categoryFilter');
    const activeFilter = document.getElementById('activeFilter');

    searchInput.addEventListener('input', () => renderMenuItemsList());
    categoryFilter.addEventListener('change', () => renderMenuItemsList());
    activeFilter.addEventListener('change', () => renderMenuItemsList());

    // Add event listener for the "New Menu Item" button
    document.getElementById('newMenuItemBtn').addEventListener('click', handleNewMenuItem);
    document.getElementById('seedMenuBtn').addEventListener('click', async () => {
        await seedMenuItems();
        await fetchAndRenderMenuItems();
    });
}

async function fetchAndRenderMenuItems() {
    try {
        const snapshot = await db.collection('menuItems').orderBy('name').get();
        menuItemsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        populateCategoryFilter();
        renderMenuItemsList();
    } catch (error) {
        console.error("Error fetching menu items:", error);
        document.getElementById('menuItemsList').innerHTML = '<p class="error-message">Could not load menu items.</p>';
    }
}

function populateCategoryFilter() {
    const categoryFilter = document.getElementById('categoryFilter');
    const categories = [...new Set(menuItemsCache.map(item => item.category))];

    // Clear existing options except the first one
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

function renderMenuItemsList() {
    const listElement = document.getElementById('menuItemsList');
    const searchInput = document.getElementById('menuItemSearch').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    const activeFilter = document.getElementById('activeFilter').value;

    const filteredItems = menuItemsCache.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchInput);
        const matchesCategory = !categoryFilter || item.category === categoryFilter;
        const matchesActive = activeFilter === '' || String(item.active) === activeFilter;
        return matchesSearch && matchesCategory && matchesActive;
    });

    if (filteredItems.length === 0) {
        listElement.innerHTML = '<p class="no-results-message">No items match the criteria.</p>';
        return;
    }

    listElement.innerHTML = filteredItems.map(item => `
        <div class="list-item" data-id="${item.id}">
            <span>${item.name}</span>
            <span class="item-category">${item.category}</span>
        </div>
    `).join('');

    // Add click event listeners to each item
    listElement.querySelectorAll('.list-item').forEach(itemElement => {
        itemElement.addEventListener('click', () => {
            selectedItemId = itemElement.dataset.id;
            renderEditorPane(selectedItemId);

            // Highlight the selected item
            listElement.querySelectorAll('.list-item').forEach(el => el.classList.remove('active'));
            itemElement.classList.add('active');
        });
    });
}

function renderEditorPane(itemId) {
    const item = menuItemsCache.find(i => i.id === itemId);
    if (!item) {
        console.error(`Item with ID ${itemId} not found in cache.`);
        return;
    }

    // Show editor, hide welcome message
    document.getElementById('editorWelcome').style.display = 'none';
    document.getElementById('itemEditor').style.display = 'flex';

    // Populate editor fields
    document.getElementById('editorItemName').textContent = item.name;

    const editorForm = document.getElementById('editorForm');
    const allergenGridHtml = createAllergenGrid(FSA_ALLERGENS, item.allergens);
    const notesHtml = createNotesSection(item.notes);
    editorForm.innerHTML = allergenGridHtml + notesHtml;

    const lastEditedBy = item.lastEditedBy ? `by ${item.lastEditedBy}` : '';
    const lastEditedAt = item.lastEditedAt ? new Date(item.lastEditedAt.seconds * 1000).toLocaleString() : 'Never';
    document.getElementById('lastEdited').textContent = `Last Edited: ${lastEditedAt} ${lastEditedBy}`;

    // Add event listener to the save button, ensuring it's only added once
    const saveBtn = document.getElementById('saveChangesBtn');
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    newSaveBtn.addEventListener('click', handleSaveChanges);

    // Toolbar buttons
    const publishBtn = document.getElementById('publishMatrixBtn');
    const newPublishBtn = publishBtn.cloneNode(true);
    publishBtn.parentNode.replaceChild(newPublishBtn, publishBtn);
    newPublishBtn.addEventListener('click', handlePublishMatrix);

    const duplicateBtn = document.getElementById('duplicateMenuItemBtn');
    const newDuplicateBtn = duplicateBtn.cloneNode(true);
    duplicateBtn.parentNode.replaceChild(newDuplicateBtn, duplicateBtn);
    newDuplicateBtn.addEventListener('click', () => handleDuplicateMenuItem(itemId));

    const deactivateBtn = document.getElementById('deactivateMenuItemBtn');
    const newDeactivateBtn = deactivateBtn.cloneNode(true);
    deactivateBtn.parentNode.replaceChild(newDeactivateBtn, deactivateBtn);
    newDeactivateBtn.addEventListener('click', () => handleDeactivateMenuItem(itemId));
}

async function handlePublishMatrix() {
    const modalTitle = 'Publish New Allergen Matrix Version';
    const modalBody = `
        <p>Enter a title and any relevant notes for this new version. This will capture the current state of all active menu items.</p>
        <div class="modal-input-group">
            <label for="versionTitle">Version Title</label>
            <input type="text" id="versionTitle" class="modal-input" placeholder="e.g., Autumn 2025 v1">
        </div>
        <div class="modal-input-group">
            <label for="versionChangeLog">Change Log</label>
            <textarea id="versionChangeLog" class="modal-textarea" placeholder="Describe the key changes in this version..."></textarea>
        </div>
    `;
    const modalFooter = '<button id="confirmPublishBtn" class="auth-button">Publish Version</button>';

    window.mainApp.openModal(modalTitle, modalBody, modalFooter);

    document.getElementById('confirmPublishBtn').addEventListener('click', async () => {
        const title = document.getElementById('versionTitle').value.trim();
        const changeLog = document.getElementById('versionChangeLog').value.trim();

        if (!title) {
            showToast("Version title is required.", "error");
            return;
        }

        const currentUser = getCurrentUser();
        if (!currentUser) {
            showToast("You must be logged in to publish.", "error");
            return;
        }

        showToast("Publishing new version...", "info");

        try {
            // 1. Fetch all active menu items
            const activeItemsSnapshot = await db.collection('menuItems').where('active', '==', true).get();

            // 2. Create the snapshot
            const matrixSnapshot = activeItemsSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name,
                    category: data.category,
                    allergens: data.allergens,
                    notes: data.notes
                };
            });

            // 3. Create the version object
            const newVersion = {
                title,
                changeLog,
                publishedAt: firebase.firestore.FieldValue.serverTimestamp(),
                publishedBy: currentUser.displayName || currentUser.email,
                matrixSnapshot
            };

            // 4. Save to the new collection
            await db.collection('allergenVersions').add(newVersion);

            showToast("New version published successfully!", "success");
            window.mainApp.closeModal();

        } catch (error) {
            console.error("Error publishing new version:", error);
            showToast(`Publishing failed: ${error.message}`, "error");
        }
    });
}

async function handleSaveChanges() {
    if (!selectedItemId) {
        showToast("No item selected.", "error");
        return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
        showToast("You must be logged in to save changes.", "error");
        return;
    }

    // --- 1. Gather Data ---
    const form = document.getElementById('editorForm');
    const allergens = {};
    let isValid = true;
    FSA_ALLERGENS.forEach(allergen => {
        const selectedOption = form.querySelector(`input[name="${allergen.id}"]:checked`);
        if (selectedOption && ALLERGEN_STATUS.includes(selectedOption.value)) {
            allergens[allergen.id] = selectedOption.value;
        } else {
            showToast(`Invalid status for ${allergen.name}.`, 'error');
            isValid = false;
        }
    });

    if (!isValid) return;

    const notes = document.getElementById('allergenNotes').value;

    const updateData = {
        allergens,
        notes,
        lastEditedAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastEditedBy: currentUser.displayName || currentUser.email,
    };

    // --- 2. Optimistic UI Update ---
    const originalItemIndex = menuItemsCache.findIndex(item => item.id === selectedItemId);
    const originalItem = { ...menuItemsCache[originalItemIndex] };

    // Create a temporary updated item for the UI
    const tempUpdatedItem = {
        ...originalItem,
        ...updateData,
        // Mock the timestamp for immediate UI feedback
        lastEditedAt: { seconds: Math.floor(Date.now() / 1000) }
    };
    menuItemsCache[originalItemIndex] = tempUpdatedItem;

    // Re-render the editor pane with the new data
    renderEditorPane(selectedItemId);
    showToast("Saving...", "info");


    // --- 3. Firestore Update ---
    try {
        await db.collection('menuItems').doc(selectedItemId).update(updateData);
        showToast("Changes saved successfully!", "success");
    } catch (error) {
        console.error("Error saving changes:", error);
        showToast("Failed to save changes. Reverting.", "error");

        // Revert optimistic update on failure
        menuItemsCache[originalItemIndex] = originalItem;
        renderEditorPane(selectedItemId);
    }
}

// --- Toolbar Button Handlers ---

function handleNewMenuItem() {
    const modalTitle = 'Create New Menu Item';
    const modalBody = `
        <div class="modal-input-group">
            <label for="newItemName">Item Name</label>
            <input type="text" id="newItemName" class="modal-input" placeholder="e.g., Classic Burger">
        </div>
        <div class="modal-input-group">
            <label for="newItemCategory">Category</label>
            <input type="text" id="newItemCategory" class="modal-input" placeholder="e.g., Burgers">
        </div>
    `;
    const modalFooter = '<button id="confirmNewItemBtn" class="auth-button">Create Item</button>';

    window.mainApp.openModal(modalTitle, modalBody, modalFooter);

    document.getElementById('confirmNewItemBtn').addEventListener('click', async () => {
        const name = document.getElementById('newItemName').value.trim();
        const category = document.getElementById('newItemCategory').value.trim();

        if (!name || !category) {
            showToast("Name and category are required.", "error");
            return;
        }

        const currentUser = getCurrentUser();
        const newItem = {
            name,
            category,
            active: true,
            allergens: FSA_ALLERGENS.reduce((acc, allergen) => {
                acc[allergen.id] = 'unknown';
                return acc;
            }, {}),
            notes: '',
            lastEditedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastEditedBy: currentUser.displayName || currentUser.email,
        };

        try {
            await db.collection('menuItems').add(newItem);
            showToast("New item created successfully!", "success");
            window.mainApp.closeModal();
            await fetchAndRenderMenuItems();
        } catch (error) {
            console.error("Error creating new item:", error);
            showToast("Failed to create new item.", "error");
        }
    });
}

async function handleDuplicateMenuItem(itemId) {
    const itemToDuplicate = menuItemsCache.find(item => item.id === itemId);
    if (!itemToDuplicate) {
        showToast("Cannot find item to duplicate.", "error");
        return;
    }

    if (!confirm(`Are you sure you want to duplicate "${itemToDuplicate.name}"?`)) {
        return;
    }

    const currentUser = getCurrentUser();
    const duplicatedItem = {
        ...itemToDuplicate,
        name: `${itemToDuplicate.name} (Copy)`,
        lastEditedAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastEditedBy: currentUser.displayName || currentUser.email,
    };
    delete duplicatedItem.id; // Remove the original ID

    try {
        const docRef = await db.collection('menuItems').add(duplicatedItem);
        showToast("Item duplicated successfully!", "success");
        await fetchAndRenderMenuItems();
        // Optionally, select the new item
        selectedItemId = docRef.id;
        renderMenuItemsList(); // To highlight the new item
        renderEditorPane(docRef.id);
    } catch (error) {
        console.error("Error duplicating item:", error);
        showToast("Failed to duplicate item.", "error");
    }
}

async function handleDeactivateMenuItem(itemId) {
    const itemToDeactivate = menuItemsCache.find(item => item.id === itemId);
    if (!itemToDeactivate) {
        showToast("Cannot find item to deactivate.", "error");
        return;
    }

    if (!confirm(`Are you sure you want to deactivate "${itemToDeactivate.name}"? This will hide it from the active list.`)) {
        return;
    }

    try {
        await db.collection('menuItems').doc(itemId).update({ active: false });
        showToast("Item deactivated.", "info");

        // Optimistically update cache
        const itemIndex = menuItemsCache.findIndex(item => item.id === itemId);
        menuItemsCache[itemIndex].active = false;

        // Clear the editor pane
        document.getElementById('itemEditor').style.display = 'none';
        document.getElementById('editorWelcome').style.display = 'block';
        selectedItemId = null;

        renderMenuItemsList();

    } catch (error) {
        console.error("Error deactivating item:", error);
        showToast("Failed to deactivate item.", "error");
    }
}

export async function renderAllergenVersionsPage() {
    const content = '<h2>Allergen Versions</h2><p>Admin-only: View and manage published versions of the allergen matrix.</p>';
    document.getElementById('allergenVersionsPage').innerHTML = createPageHtml('Allergen Versions', content);
}

export async function renderAllergenImportPage() {
    const importPageContent = `
        <div class="import-container">
            <p>Upload a CSV file to bulk update allergen information for menu items.</p>

            <div class="import-step">
                <h3>Step 1: Upload CSV</h3>
                <input type="file" id="csvFileInput" accept=".csv">
                <button id="loadCsvBtn" class="button">Load Data</button>
            </div>

            <div class="import-step" id="previewContainer" style="display: none;">
                <h3>Step 2: Preview and Confirm</h3>
                <div id="importPreviewGrid"></div>
                <div class="import-actions">
                    <button id="confirmImportBtn" class="button-primary">Confirm and Save Changes</button>
                    <button id="cancelImportBtn" class="button-secondary">Cancel</button>
                </div>
            </div>
             <div class="import-step" id="bulkToolsContainer" style="display: none;">
                <h3>Bulk Tools</h3>
                <div class="bulk-tool">
                    <label for="bulkSetColumn">Set column for selected items:</label>
                    <select id="bulkSetColumn">
                        ${FSA_ALLERGENS.map(allergen => `<option value="${allergen.id}">${allergen.name}</option>`).join('')}
                    </select>
                    <select id="bulkSetStatus">
                        ${ALLERGEN_STATUS.map(status => `<option value="${status}">${status}</option>`).join('')}
                    </select>
                    <button id="bulkSetBtn" class="button">Apply</button>
                </div>
                <div class="bulk-tool">
                    <button id="copyStatusBtn" class="button">Copy Statuses</button>
                    <button id="pasteStatusBtn" class="button">Paste Statuses</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('allergenImportPage').innerHTML = createPageHtml('Import Allergens', importPageContent);

    // Add event listener for the new button
    document.getElementById('loadCsvBtn').addEventListener('click', handleCsvLoad);

    document.getElementById('bulkSetBtn').addEventListener('click', handleBulkSet);
    document.getElementById('copyStatusBtn').addEventListener('click', handleCopyStatus);
    document.getElementById('pasteStatusBtn').addEventListener('click', handlePasteStatus);
    document.getElementById('confirmImportBtn').addEventListener('click', handleConfirmImport);
    document.getElementById('cancelImportBtn').addEventListener('click', () => {
        // Simply hide the containers and clear the data
        document.getElementById('previewContainer').style.display = 'none';
        document.getElementById('bulkToolsContainer').style.display = 'none';
        document.getElementById('csvFileInput').value = '';
        parsedCsvData = [];
    });

    const gridContainer = document.getElementById('importPreviewGrid');
    gridContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'TD') {
            e.target.parentElement.classList.toggle('selected');
        }
    });
}

let parsedCsvData = [];

/**
 * Handles the CSV file upload and parsing.
 */
function handleCsvLoad() {
    const fileInput = document.getElementById('csvFileInput');
    const file = fileInput.files[0];

    if (!file) {
        showToast("Please select a CSV file to upload.", "error");
        return;
    }

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            if (results.errors.length) {
                showToast("Errors found while parsing the CSV. Please check the file format.", "error");
                console.error("CSV Parsing Errors:", results.errors);
                return;
            }

            parsedCsvData = processCsvData(results.data);
            renderPreviewGrid(parsedCsvData); // This function will be created in the next step

            // Show the preview and bulk tools containers
            document.getElementById('previewContainer').style.display = 'block';
            document.getElementById('bulkToolsContainer').style.display = 'block';
        }
    });
}

/**
 * Processes the raw data from the CSV file, mapping columns and values.
 * @param {Array<Object>} data The array of objects from PapaParse.
 * @returns {Array<Object>} The processed data.
 */
function processCsvData(data) {
    const allergenIdMap = FSA_ALLERGENS.reduce((acc, allergen) => {
        acc[`allergen_${allergen.id}`] = allergen.id;
        return acc;
    }, {});

    const statusMap = {
        'contains': 'contains',
        'y': 'contains',
        'may contain': 'may_contain',
        'x': 'may_contain',
        'free': 'free',
        'n': 'free',
        '-': 'free',
        '': 'unknown'
    };

    return data.map(row => {
        const processedRow = {
            item: row.item,
            category: row.category,
            notes: row.notes,
            allergens: {}
        };

        for (const key in row) {
            const lowerKey = key.toLowerCase().trim();
            const allergenId = allergenIdMap[lowerKey];
            if (allergenId) {
                const value = row[key] ? row[key].toLowerCase().trim() : '';
                processedRow.allergens[allergenId] = statusMap[value] || 'unknown';
            }
        }

        return processedRow;
    });
}

/**
 * Renders the preview grid with the processed CSV data, highlighting changes.
 * @param {Array<Object>} data The processed data to render.
 */
function renderPreviewGrid(data) {
    const gridContainer = document.getElementById('importPreviewGrid');
    if (!gridContainer) return;

    const existingItems = menuItemsCache.reduce((acc, item) => {
        acc[item.name.toLowerCase()] = item;
        return acc;
    }, {});

    let tableHtml = `
        <table class="import-preview-table">
            <thead>
                <tr>
                    <th>Item Name</th>
                    <th>Category</th>
                    ${FSA_ALLERGENS.map(a => `<th>${a.name}</th>`).join('')}
                    <th>Notes</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach(newRow => {
        const existingItem = existingItems[newRow.item.toLowerCase()];
        tableHtml += '<tr>';
        tableHtml += `<td>${newRow.item}</td>`;
        tableHtml += `<td>${newRow.category}</td>`;

        FSA_ALLERGENS.forEach(allergen => {
            const newStatus = newRow.allergens[allergen.id] || 'unknown';
            const oldStatus = existingItem ? (existingItem.allergens[allergen.id] || 'unknown') : 'new';

            const isChanged = newStatus !== oldStatus;
            const cellClass = isChanged ? 'status-changed' : '';
            const originalValueAttr = `data-original-value="${oldStatus}"`;

            tableHtml += `<td class="${cellClass}" ${originalValueAttr}>${newStatus}</td>`;
        });

        const oldNotes = existingItem ? existingItem.notes : '';
        const notesChanged = newRow.notes !== oldNotes;
        const notesCellClass = notesChanged ? 'status-changed' : '';
        tableHtml += `<td class="${notesCellClass}" data-original-value="${oldNotes}">${newRow.notes}</td>`;

        tableHtml += '</tr>';
    });

    tableHtml += '</tbody></table>';
    gridContainer.innerHTML = tableHtml;
}

let copiedStatuses = null;

/**
 * Handles the "Set column for selected items" bulk tool.
 */
function handleBulkSet() {
    const selectedRows = document.querySelectorAll('.import-preview-table .selected');
    if (selectedRows.length === 0) {
        showToast("Please select at least one row to apply the bulk change.", "error");
        return;
    }

    const column = document.getElementById('bulkSetColumn').value;
    const status = document.getElementById('bulkSetStatus').value;

    selectedRows.forEach(row => {
        const itemName = row.cells[0].textContent;
        const dataRow = parsedCsvData.find(d => d.item === itemName);
        if (dataRow) {
            dataRow.allergens[column] = status;
        }
    });

    renderPreviewGrid(parsedCsvData);
}

/**
 * Handles the confirmation of the import, sending the data to the backend.
 */
async function handleConfirmImport() {
    if (parsedCsvData.length === 0) {
        showToast("No data to import.", "error");
        return;
    }

    showToast("Importing data...", "info");

    try {
        const importAllergens = firebase.functions().httpsCallable('importAllergens');
        const result = await importAllergens({ items: parsedCsvData });

        showToast(result.data.message, "success");

        // Refresh the local cache and UI
        await fetchAndRenderMenuItems();

        // Reset the import page
        document.getElementById('previewContainer').style.display = 'none';
        document.getElementById('bulkToolsContainer').style.display = 'none';
        document.getElementById('csvFileInput').value = '';
        parsedCsvData = [];

    } catch (error) {
        console.error("Error calling importAllergens function:", error);
        showToast(`Import failed: ${error.message}`, "error");
    }
}

/**
 * Handles the "Copy Statuses" bulk tool.
 */
function handleCopyStatus() {
    const selectedRow = document.querySelector('.import-preview-table .selected');
    if (!selectedRow) {
        showToast("Please select a row to copy from.", "error");
        return;
    }

    if (document.querySelectorAll('.import-preview-table .selected').length > 1) {
        showToast("Please select only one row to copy from.", "error");
        return;
    }

    const itemName = selectedRow.cells[0].textContent;
    const dataRow = parsedCsvData.find(d => d.item === itemName);
    if (dataRow) {
        copiedStatuses = { ...dataRow.allergens };
        showToast("Statuses copied.", "success");
    }
}

/**
 * Handles the "Paste Statuses" bulk tool.
 */
function handlePasteStatus() {
    const selectedRows = document.querySelectorAll('.import-preview-table .selected');
    if (selectedRows.length === 0) {
        showToast("Please select at least one row to paste to.", "error");
        return;
    }

    if (!copiedStatuses) {
        showToast("Nothing to paste. Please copy a row's statuses first.", "error");
        return;
    }

    selectedRows.forEach(row => {
        const itemName = row.cells[0].textContent;
        const dataRow = parsedCsvData.find(d => d.item === itemName);
        if (dataRow) {
            dataRow.allergens = { ...copiedStatuses };
        }
    });

    renderPreviewGrid(parsedCsvData);
}
