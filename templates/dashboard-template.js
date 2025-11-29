/**
 * Creates the HTML for the main dashboard overview.
 * @param {string} locationName - The name of the current location.
 * @returns {string} HTML string.
 */
export function createDashboardHtml(locationName) {
    return `
        <div class="dashboard-header-section">
            <h2 class="page-title">Dashboard Overview</h2>
            <p class="welcome-text">Welcome back! Here's what's happening at <strong>${locationName}</strong>.</p>
        </div>

        <div class="dashboard-grid">
            <!-- Key Metrics Row -->
            <div class="dashboard-row metrics-row">
                <div id="stockSummary" class="metric-card">
                    <div class="metric-icon stock-icon"><i class="fas fa-boxes"></i></div>
                    <div class="metric-content">
                        <h3>Stock Status</h3>
                        <div class="metric-value" id="stockStatusValue">Loading...</div>
                    </div>
                </div>
                <div id="wastageSummary" class="metric-card">
                    <div class="metric-icon waste-icon"><i class="fas fa-trash-alt"></i></div>
                    <div class="metric-content">
                        <h3>Recent Waste</h3>
                        <div class="metric-value" id="wasteStatusValue">Loading...</div>
                    </div>
                </div>
                <div id="ordersSummary" class="metric-card">
                    <div class="metric-icon order-icon"><i class="fas fa-truck"></i></div>
                    <div class="metric-content">
                        <h3>Pending Orders</h3>
                        <div class="metric-value" id="ordersStatusValue">Loading...</div>
                    </div>
                </div>
            </div>

            <!-- Quick Actions & Links Row -->
            <div class="dashboard-row links-row">
                <div class="dashboard-card quick-links-card">
                    <h3 class="card-title">Quick Actions</h3>
                    <div class="quick-actions-grid">
                        <button class="action-btn" id="quickAddStockBtn">
                            <i class="fas fa-plus-circle"></i> Add Stock
                        </button>
                        <button class="action-btn" id="quickLogWasteBtn">
                            <i class="fas fa-dumpster-fire"></i> Log Waste
                        </button>
                        <button class="action-btn" id="quickCreateOrderBtn">
                            <i class="fas fa-file-invoice"></i> New Order
                        </button>
                    </div>
                </div>

                <div class="dashboard-card navigation-card">
                    <h3 class="card-title">Management</h3>
                    <div class="nav-links-grid">
                        <div class="nav-link-item" onclick="window.mainApp.handleNavigationClick('stock-management')">
                            <i class="fas fa-boxes"></i> <span>Stock</span>
                        </div>
                        <div class="nav-link-item" onclick="window.mainApp.handleNavigationClick('wastage-log')">
                            <i class="fas fa-dumpster"></i> <span>Wastage</span>
                        </div>
                        <div class="nav-link-item" onclick="window.mainApp.handleNavigationClick('orders')">
                            <i class="fas fa-shipping-fast"></i> <span>Orders</span>
                        </div>
                        <div class="nav-link-item" onclick="window.mainApp.handleNavigationClick('suppliers')">
                            <i class="fas fa-handshake"></i> <span>Suppliers</span>
                        </div>
                        <div class="nav-link-item" onclick="window.mainApp.handleNavigationClick('staff')">
                            <i class="fas fa-users"></i> <span>Staff</span>
                        </div>
                        <div class="nav-link-item" onclick="window.mainApp.handleNavigationClick('recruitment')">
                            <i class="fas fa-user-plus"></i> <span>Recruitment</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Critical Alerts Row -->
            <div class="dashboard-row alerts-row">
                <div class="dashboard-card full-width">
                    <h3 class="card-title">Critical Stock Alerts</h3>
                    <div id="criticalStockList" class="critical-list">
                        <p>Loading alerts...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function createCriticalItemHtml(item) {
    return `
        <div class="critical-item">
            <span class="item-name">${item.name}</span>
            <span class="item-stock critical">${item.currentStock} ${item.unit}</span>
            <span class="item-status">Reorder Point: ${item.reorderPoint}</span>
        </div>
    `;
}
