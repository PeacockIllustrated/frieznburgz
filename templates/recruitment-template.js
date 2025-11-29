/**
 * Creates the HTML for the Recruitment/Applications page.
 * @param {Array} applications - Array of application objects.
 * @returns {string} HTML string.
 */
export function createRecruitmentPageHtml(applications) {
    return `
        <h2 class="page-title">Recruitment Applications</h2>
        <div class="recruitment-container">
            ${applications.length === 0 ? '<p>No applications found.</p>' : `
                <div class="applications-list">
                    ${applications.map(createApplicationCardHtml).join('')}
                </div>
            `}
        </div>
    `;
}

/**
 * Creates the HTML for a single application card.
 * @param {Object} app - Application data object.
 * @returns {string} HTML string.
 */
function createApplicationCardHtml(app) {
    const date = app.timestamp ? new Date(app.timestamp.toDate()).toLocaleDateString() : 'N/A';
    return `
        <div class="application-card">
            <div class="app-header">
                <h3 class="app-name">${app.name || 'Unknown Candidate'}</h3>
                <span class="app-date">${date}</span>
            </div>
            <div class="app-details">
                <p><strong>Email:</strong> ${app.email || 'N/A'}</p>
                <p><strong>Phone:</strong> ${app.phone || 'N/A'}</p>
                <p><strong>Position:</strong> ${app.position || 'N/A'}</p>
                <p><strong>Location:</strong> ${app.location || 'N/A'}</p>
            </div>
            <div class="app-actions">
                <button class="auth-button small-btn view-app-btn" data-id="${app.id}">View Details</button>
            </div>
        </div>
    `;
}

/**
 * Creates the HTML for the application details modal.
 * @param {Object} app - Application data object.
 * @returns {string} HTML string.
 */
export function createApplicationDetailsHtml(app) {
    const date = app.timestamp ? new Date(app.timestamp.toDate()).toLocaleString() : 'N/A';
    return `
        <div class="app-details-modal">
            <div class="detail-row"><strong>Name:</strong> ${app.name}</div>
            <div class="detail-row"><strong>Email:</strong> ${app.email}</div>
            <div class="detail-row"><strong>Phone:</strong> ${app.phone}</div>
            <div class="detail-row"><strong>Date Applied:</strong> ${date}</div>
            <div class="detail-row"><strong>Position:</strong> ${app.position}</div>
            <div class="detail-row"><strong>Location Preference:</strong> ${app.location}</div>
            <div class="detail-row"><strong>Experience:</strong></div>
            <div class="detail-text">${app.experience || 'None provided'}</div>
            <div class="detail-row"><strong>Availability:</strong></div>
            <div class="detail-text">${app.availability || 'Not specified'}</div>
            <div class="detail-row"><strong>Why Friez n Burgz?</strong></div>
            <div class="detail-text">${app.reason || 'Not specified'}</div>
        </div>
    `;
}
