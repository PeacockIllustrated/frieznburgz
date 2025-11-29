// --- dashboard.js (Final, Complete & Corrected Version) ---

import { db, auth } from './firebase.js';
import { getSelectedLocation, getLocationDisplayName } from './config.js';
import { createDashboardCardHtml, createCriticalItemHtml, createRecentWasteItemHtml, createStaffSummaryCardHtml } from './templates/dashboard-template.js';
import { getCurrentStockItems, getAllUniqueStockItems } from './stock.js';
import { getSuppliers } from './suppliers.js';
import { createOrderFormModalBodyHtml, getItemOptionsHtml } from './templates/orders-template.js';


// --- DOM Elements ---
const dashboardPage = document.getElementById('dashboardPage');

// --- Modal Elements & Functions ---
const universalModal = document.getElementById('universalModal');
const closeModalButton = universalModal.querySelector('.close-button');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalMessage = document.getElementById('modalMessage');
const modalFooter = document.getElementById('modalFooter');

closeModalButton.addEventListener('click', closeModal);
universalModal.addEventListener('click', (event) => {
    if (event.target === universalModal) {
        closeModal();
    }
});

export function openModal(title, bodyHtml, footerHtml = '', message = '') {
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    modalFooter.innerHTML = footerHtml;
    modalMessage.textContent = message;
    universalModal.style.display = 'flex';
    modalMessage.style.display = 'none';
}

export function closeModal() {
    universalModal.style.display = 'none';
    modalTitle.textContent = '';
    modalBody.innerHTML = '';
    modalFooter.textContent = '';
    modalMessage.textContent = '';
    if (window.mainApp && window.mainApp.hideCustomTooltip) {
        window.mainApp.hideCustomTooltip();
    }
}

/**
 * Renders the Dashboard Overview page.
 */
export async function renderDashboardOverviewPage() {
    const selectedLocationId = getSelectedLocation();
    if (!selectedLocationId) {
        dashboardPage.innerHTML = `<h2 class="page-title">Dashboard Overview</h2><p>Welcome! Please select a location to get started.</p>`;
        return;
    }
    const locationName = getLocationDisplayName(selectedLocationId);

    // Simplified Dashboard Layout
    dashboardPage.innerHTML = `
        <h2 class="page-title">Dashboard Overview</h2>
        <p class="dashboard-welcome">Welcome to Friez n Burgz Admin for <strong>${locationName}</strong></p>
        
        <div class="dashboard-summary-grid simple-dashboard">
            <div id="staffSummaryCard" class="dashboard-card full-width-card">
                <h3 class="card-title">Staff Training Status</h3>
                <div id="staffSummaryContent"><p>Loading...</p></div>
            </div>

            <div id="quickNavCard" class="dashboard-card full-width-card">
                <h3 class="card-title">Quick Navigation</h3>
                <div class="quick-actions-content">
                    <button class="auth-button quick-action-btn" onclick="window.mainApp.handleNavigationClick('staff')">
                        <i class="fas fa-users"></i> Manage Staff
                    </button>
                    <button class="auth-button quick-action-btn" onclick="window.mainApp.handleNavigationClick('rota')">
                        <i class="fas fa-calendar-alt"></i> View Rota
                    </button>
                    <button class="auth-button quick-action-btn" onclick="window.mainApp.handleNavigationClick('loyalty-management')">
                        <i class="fas fa-star"></i> Loyalty Program
                    </button>
                    <button class="auth-button quick-action-btn" onclick="window.mainApp.handleNavigationClick('allergen-matrix')">
                        <i class="fas fa-book-open"></i> Handbook
                    </button>
                </div>
            </div>
        </div>
    `;

    // Only render staff summary, skip stock/wastage
    await renderStaffSummary();
}

async function renderStockSummary() {
    const stockSummary = document.getElementById('stockSummary');
    const criticalStockList = document.getElementById('criticalStockList');
    const selectedLocationId = getSelectedLocation();
    try {
        const itemsRef = db.collection('locations').doc(selectedLocationId).collection('items');
        const querySnapshot = await itemsRef.orderBy('category').orderBy('name').get();
        const allItems = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const criticalItems = allItems.filter(item => item.currentStock <= item.reorderPoint / 2);
        const lowItems = allItems.filter(item => item.currentStock > item.reorderPoint / 2 && item.currentStock <= item.reorderPoint);
        const goodItems = allItems.filter(item => item.currentStock > item.reorderPoint);

        stockSummary.innerHTML = `<div class="summary-top-row">${createDashboardCardHtml('good', goodItems.length, 'Good Stock')}${createDashboardCardHtml('low', lowItems.length, 'Low Stock')}</div><div class="summary-bottom-row">${createDashboardCardHtml('critical', criticalItems.length, 'Critical Stock')}</div>`;
        criticalStockList.innerHTML = criticalItems.length > 0 ? criticalItems.sort((a, b) => a.currentStock - b.currentStock).map(createCriticalItemHtml).join('') : '<p>No critical stock alerts. Good job!</p>';
    } catch (error) {
        console.error('Error loading stock summary:', error);
        stockSummary.innerHTML = `<p style="color:red;">Error loading data.</p>`;
        criticalStockList.innerHTML = `<p style="color:red;">Error loading data.</p>`;
    }
}

async function renderWastageSummary() {
    const recentWastageList = document.getElementById('recentWastageList');
    const selectedLocationId = getSelectedLocation();
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const wasteQuerySnapshot = await db.collection('locations').doc(selectedLocationId).collection('wastage_log')
            .where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(sevenDaysAgo))
            .orderBy('timestamp', 'desc')
            .limit(3)
            .get();
        if (wasteQuerySnapshot.empty) {
            recentWastageList.innerHTML = '<li>No waste logged in the last 7 days.</li>';
        } else {
            recentWastageList.innerHTML = wasteQuerySnapshot.docs.map(doc => createRecentWasteItemHtml(doc.data())).join('');
            recentWastageList.insertAdjacentHTML('beforeend', `<li class="view-all-link"><button class="auth-button quick-action-btn small-btn" id="viewAllWastageBtn">View All Wastage</button></li>`);
            document.getElementById('viewAllWastageBtn').addEventListener('click', () => {
                if (window.mainApp) window.mainApp.handleNavigationClick('wastage-log');
            });
        }
    } catch (error) {
        console.error('Error loading wastage summary:', error);
        recentWastageList.innerHTML = '<li>Error loading log.</li>';
    }
}

async function renderStaffSummary() {
    const staffSummaryContent = document.getElementById('staffSummaryContent');
    const TOTAL_HANDBOOK_SECTIONS = 12;
    try {
        const [staffSnapshot, usersSnapshot] = await Promise.all([
            db.collection('staff').get(),
            db.collection('users').get()
        ]);
        const staffData = staffSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        const progressData = {};
        usersSnapshot.forEach(doc => { progressData[doc.id] = doc.data(); });
        const totalEmployees = staffData.length;
        let upToDateCount = 0;
        const locationScores = {};
        staffData.forEach(staff => {
            const userProgress = progressData[staff.uid] || { readSections: [], quizHistory: [] };
            const location = staff.locationId || 'Unassigned';
            if (userProgress.readSections && userProgress.readSections.length >= TOTAL_HANDBOOK_SECTIONS) {
                upToDateCount++;
            }
            if (!locationScores[location]) {
                locationScores[location] = { totalScore: 0, quizCount: 0 };
            }
            if (userProgress.quizHistory && userProgress.quizHistory.length > 0) {
                userProgress.quizHistory.forEach(quiz => {
                    locationScores[location].totalScore += (quiz.score / quiz.total);
                    locationScores[location].quizCount++;
                });
            }
        });
        const locationAverages = Object.keys(locationScores).map(locId => {
            const data = locationScores[locId];
            const average = data.quizCount > 0 ? (data.totalScore / data.quizCount) * 100 : 0;
            return { name: getLocationDisplayName(locId), score: Math.round(average) };
        });
        staffSummaryContent.innerHTML = createStaffSummaryCardHtml({
            totalEmployees,
            upToDateCount,
            locationAverages
        });
    } catch (error) {
        console.error("Error rendering staff summary:", error);
        staffSummaryContent.innerHTML = `<p style="color:red;">Error loading staff data.</p>`;
    }
}

export async function showQuickAdjustmentModal(type) {
    const selectedLocationId = getSelectedLocation();
    if (!selectedLocationId) {
        alert('Please select a location first.');
        return;
    }
    const title = type === 'add' ? 'Quick Add Stock' : 'Quick Log Waste';
    const items = getCurrentStockItems();
    let itemOptions = '';
    if (items.length === 0) {
        itemOptions = '<option value="" disabled selected>No items found</option>';
    } else {
        const categorizedItems = items.reduce((acc, item) => {
            const category = item.category || 'Uncategorized';
            if (!acc[category]) acc[category] = [];
            acc[category].push(item);
            return acc;
        }, {});
        const sortedCategories = Object.keys(categorizedItems).sort();
        itemOptions += '<option value="" disabled selected>Select Item</option>';
        sortedCategories.forEach(category => {
            itemOptions += `<optgroup label="${category}">`;
            categorizedItems[category].sort((a, b) => a.name.localeCompare(b.name)).forEach(item => {
                itemOptions += `<option value="${item.id}">${item.name} (${item.unit || 'units'})</option>`;
            });
            itemOptions += `</optgroup>`;
        });
    }
    const qtyControlsHtml = `<div class="stock-controls-group"><div class="stock-controls"><button class="control-button decrement-btn">-</button><input type="number" id="modalQtyInput" class="stock-input" value="1" min="1"><button class="control-button increment-btn">+</button></div></div>`;
    const bodyHtml = `<div class="modal-input-group"><div class="select-wrapper"><select id="modalItemSelect" class="waste-select">${itemOptions}</select><i class="fas fa-chevron-down select-arrow"></i></div>${qtyControlsHtml}${type === 'waste' ? `<input type="text" id="modalReasonInput" placeholder="Reason for waste" class="auth-input modal-input">` : ''}</div>`;
    const footerHtml = `<button id="modalConfirmBtn" class="auth-button">Confirm</button><button id="modalCancelBtn" class="auth-button secondary-btn">Cancel</button>`;
    openModal(title, bodyHtml, footerHtml);
    document.getElementById('modalConfirmBtn').addEventListener('click', () => handleModalAdjustment(type));
    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
    const modalQtyInput = document.getElementById('modalQtyInput');
    if (modalQtyInput) {
        const decrementBtn = modalQtyInput.closest('.stock-controls').querySelector('.decrement-btn');
        const incrementBtn = modalQtyInput.closest('.stock-controls').querySelector('.increment-btn');
        if (decrementBtn) decrementBtn.addEventListener('click', () => { let val = parseInt(modalQtyInput.value, 10) || 1; modalQtyInput.value = Math.max(1, val - 1); });
        if (incrementBtn) incrementBtn.addEventListener('click', () => { let val = parseInt(modalQtyInput.value, 10) || 0; modalQtyInput.value = val + 1; });
        modalQtyInput.addEventListener('change', () => { if (parseInt(modalQtyInput.value, 10) < 1) modalQtyInput.value = 1; });
    }
}

// --- Quick Create Order Functions ---

async function showCreateOrderModal() {
    const title = 'Create New Order';

    // Fetch data needed for the modal
    const allSuppliers = await getSuppliers();
    const allUniqueStockItems = await getAllUniqueStockItems();

    // Create modal body and footer
    const bodyHtml = createOrderFormModalBodyHtml(null, allSuppliers, allUniqueStockItems);
    const footerHtml = `<button id="saveOrderBtn" class="auth-button">Save Order</button><button id="closeModalBtn" class="auth-button secondary-btn">Cancel</button>`;

    openModal(title, bodyHtml, footerHtml);

    // --- Attach event listeners to the new modal content ---
    const orderSupplierCardsContainer = document.getElementById('orderSupplierCardsContainer');
    const orderSupplierIdInput = document.getElementById('orderSupplierId');
    const orderSupplierNameInput = document.getElementById('orderSupplierName');
    const supplierSelectionMessage = document.getElementById('supplierSelectionMessage');
    const orderItemsList = document.getElementById('orderItemsList');
    const addOrderItemBtn = document.getElementById('addOrderItemBtn');
    const orderItemMessage = document.getElementById('orderItemMessage');

    let filteredSupplierItemsCache = [];

    const selectSupplierCard = (supplierId, supplierName) => {
        orderSupplierCardsContainer.querySelectorAll('.compact-supplier-card').forEach(card => card.classList.remove('selected'));
        const selectedCard = orderSupplierCardsContainer.querySelector(`[data-supplier-id="${supplierId}"]`);
        if (selectedCard) selectedCard.classList.add('selected');

        orderSupplierIdInput.value = supplierId;
        orderSupplierNameInput.value = supplierName;
        supplierSelectionMessage.style.display = 'none';

        const selectedSupplier = allSuppliers.find(s => s.id === supplierId);
        if (selectedSupplier && selectedSupplier.itemsSupplied && selectedSupplier.itemsSupplied.length > 0) {
            filteredSupplierItemsCache = allUniqueStockItems.filter(item => selectedSupplier.itemsSupplied.includes(item.name));
            orderItemMessage.style.display = 'none';
            addOrderItemBtn.disabled = false;
        } else {
            filteredSupplierItemsCache = [];
            orderItemMessage.textContent = 'No items configured for this supplier.';
            orderItemMessage.style.display = 'block';
            addOrderItemBtn.disabled = true;
        }
        orderItemsList.innerHTML = '';
        addOrderItemRow(orderItemsList, filteredSupplierItemsCache);
    };

    orderSupplierCardsContainer.querySelectorAll('.compact-supplier-card').forEach(card => {
        card.addEventListener('click', () => {
            const supplierId = card.dataset.supplierId;
            const supplierName = card.dataset.supplierName;
            selectSupplierCard(supplierId, supplierName);
        });
    });

    addOrderItemBtn.addEventListener('click', () => addOrderItemRow(orderItemsList, filteredSupplierItemsCache));

    orderItemsList.addEventListener('click', (event) => {
        if (event.target.closest('.remove-item-btn')) {
            if (orderItemsList.children.length > 1) {
                event.target.closest('.order-item-row').remove();
            } else {
                alert('An order must have at least one item.');
            }
        }
    });

    orderItemsList.addEventListener('change', (event) => {
        const target = event.target;
        if (target.classList.contains('order-item-select')) {
            const selectedOption = target.options[target.selectedIndex];
            target.closest('.order-item-row').querySelector('.order-item-unit').textContent = selectedOption.dataset.unit || 'units';
            const qtyInput = target.closest('.order-item-row').querySelector('.order-item-qty');
            qtyInput.disabled = (target.value === '');
            if (target.value !== '' && (!qtyInput.value || parseInt(qtyInput.value) < 1)) {
                qtyInput.value = 1;
            }
        }
    });

    document.getElementById('saveOrderBtn').addEventListener('click', handleQuickCreateOrder);
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
}

async function handleQuickCreateOrder() {
    const modalMessage = document.getElementById('modalMessage');
    modalMessage.style.display = 'none';

    const selectedLocationId = getSelectedLocation();
    const supplierId = document.getElementById('orderSupplierId').value;
    const supplierName = document.getElementById('orderSupplierName').value;
    const orderItemsList = document.getElementById('orderItemsList');
    const notes = document.getElementById('orderNotes').value.trim();

    const items = [];
    let isValidOrder = true;
    let hasAtLeastOneItem = false;

    orderItemsList.querySelectorAll('.order-item-row').forEach(row => {
        const itemSelect = row.querySelector('.order-item-select');
        const qtyInput = row.querySelector('.order-item-qty');
        const itemId = itemSelect.value;
        const quantity = parseInt(qtyInput.value, 10);
        const itemName = itemSelect.options[itemSelect.selectedIndex]?.text.split('(')[0].trim() || '';
        const itemUnit = row.querySelector('.order-item-unit').textContent;

        if (itemId && quantity > 0) {
            items.push({ itemId, itemName, quantity, unit: itemUnit });
            hasAtLeastOneItem = true;
        } else if (itemId || qtyInput.value) {
            isValidOrder = false;
        }
    });

    if (!supplierId) {
        modalMessage.textContent = 'Please select a supplier.';
        modalMessage.style.display = 'block';
        return;
    }
    if (!isValidOrder || !hasAtLeastOneItem) {
        modalMessage.textContent = 'Please ensure all items have a valid quantity.';
        modalMessage.style.display = 'block';
        return;
    }

    const orderToSave = {
        supplierId,
        supplierName,
        items,
        notes,
        locationId: selectedLocationId,
        orderedBy: auth.currentUser ? auth.currentUser.email : 'Unknown',
        timestampOrdered: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'Pending'
    };

    modalMessage.textContent = 'Saving order...';
    modalMessage.style.display = 'block';

    try {
        await db.collection('locations').doc(selectedLocationId).collection('orders').add(orderToSave);
        modalMessage.textContent = 'Order created successfully!';
        setTimeout(() => {
            closeModal();
            // Optionally, navigate to orders page
            // if (window.mainApp) window.mainApp.handleNavigationClick('orders');
        }, 1000);
    } catch (error) {
        console.error('Error creating order:', error);
        modalMessage.textContent = `Error: ${error.message}`;
    }
}

function addOrderItemRow(container, itemsForDropdown) {
    const itemOptions = getItemOptionsHtml(itemsForDropdown);
    const newRowHtml = `
        <div class="order-item-row">
            <div class="select-wrapper item-select-wrapper">
                <select class="order-item-select" ${itemsForDropdown.length === 0 ? 'disabled' : ''}>
                    ${itemOptions}
                </select>
                <i class="fas fa-chevron-down select-arrow"></i>
            </div>
            <input type="number" class="order-item-qty auth-input modal-input" value="1" min="1" placeholder="Qty" disabled>
            <span class="order-item-unit">units</span>
            <button class="remove-item-btn secondary-btn" type="button"><i class="fas fa-times"></i></button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', newRowHtml);
}


async function handleModalAdjustment(type) {
    const selectedLocationId = getSelectedLocation();
    const itemSelect = document.getElementById('modalItemSelect');
    const qtyInput = document.getElementById('modalQtyInput');
    const reasonInput = document.getElementById('modalReasonInput');
    const itemId = itemSelect.value;
    const quantity = parseInt(qtyInput.value, 10);
    const reason = type === 'waste' ? reasonInput.value.trim() : '';
    if (!itemId || isNaN(quantity) || quantity <= 0) {
        modalMessage.textContent = 'Please select an item and a valid quantity.';
        modalMessage.style.display = 'block';
        return;
    }
    if (type === 'waste' && !reason) {
        modalMessage.textContent = 'A reason for waste is required.';
        modalMessage.style.display = 'block';
        return;
    }
    modalMessage.textContent = 'Processing...';
    modalMessage.style.display = 'block';
    const itemDocRef = db.collection('locations').doc(selectedLocationId).collection('items').doc(itemId);
    try {
        if (type === 'add') {
            await itemDocRef.update({ currentStock: firebase.firestore.FieldValue.increment(quantity) });
        } else {
            await itemDocRef.update({ currentStock: firebase.firestore.FieldValue.increment(-quantity) });
            await db.collection('locations').doc(selectedLocationId).collection('wastage_log').add({ item: itemSelect.options[itemSelect.selectedIndex].text.split('(')[0].trim(), itemId, quantity, unit: itemSelect.options[itemSelect.selectedIndex].text.split('(')[1]?.replace(')', '') || 'units', reason, timestamp: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: auth.currentUser ? auth.currentUser.email : 'Unknown' });
        }
        modalMessage.textContent = 'Operation successful!';
        setTimeout(() => { closeModal(); renderDashboardOverviewPage(); }, 1000);
    } catch (error) {
        console.error('Error during quick adjustment:', error);
        modalMessage.textContent = `Operation failed: ${error.message}`;
    }
}
