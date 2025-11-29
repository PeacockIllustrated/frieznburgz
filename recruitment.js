import { db } from './firebase.js';
import { createRecruitmentPageHtml, createApplicationDetailsHtml } from './templates/recruitment-template.js';
import { openModal } from './dashboard.js';

/**
 * Renders the Recruitment page.
 */
export async function renderRecruitmentPage() {
    const recruitmentContent = document.getElementById('recruitmentContent');
    recruitmentContent.innerHTML = '<p>Loading applications...</p>';

    try {
        // Assuming collection name is 'recruitment_applications' based on plan
        // Adjust if the webhook writes to a different collection
        const snapshot = await db.collection('recruitment_applications').orderBy('timestamp', 'desc').get();
        const applications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        recruitmentContent.innerHTML = createRecruitmentPageHtml(applications);

        // Add event listeners for "View Details" buttons
        document.querySelectorAll('.view-app-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const appId = btn.dataset.id;
                const app = applications.find(a => a.id === appId);
                if (app) {
                    showApplicationDetails(app);
                }
            });
        });

    } catch (error) {
        console.error('Error loading applications:', error);
        recruitmentContent.innerHTML = '<p style="color:red;">Error loading applications. Please try again later.</p>';
    }
}

function showApplicationDetails(app) {
    const title = `Application: ${app.name}`;
    const bodyHtml = createApplicationDetailsHtml(app);
    const footerHtml = '<button class="auth-button secondary-btn" onclick="document.querySelector(\'.close-button\').click()">Close</button>';
    openModal(title, bodyHtml, footerHtml);
}
