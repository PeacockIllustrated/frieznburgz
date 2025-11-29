// --- public/import-loyalty-programs.js ---
// This script is for one-time import of initial loyalty program data.
// It should ONLY be run once. Remove the script tag and delete this file afterwards.

/**
 * Imports initial loyalty program definitions into Firestore.
 * This function should be run ONCE manually from the browser's developer console
 * after a successful login to populate the database.
 *
 * IMPORTANT: After successful import, it is HIGHLY RECOMMENDED to:
 * 1. Remove the `<script src="import-loyalty-programs.js"></script>` tag from `index.html`.
 * 2. Delete the `import-loyalty-programs.js` file itself.
 * This prevents accidental re-imports and keeps your production bundle clean.
 */
window.importLoyaltyPrograms = async function() {
    // Check if Firebase is initialized and user is authenticated (as an admin user, ideally)
    if (!firebase.apps.length || !firebase.auth().currentUser) {
        console.error("Import Error: Firebase not initialized or user not logged in. Please log in first.");
        alert("Please log in to the Friez n Burgz Admin Dashboard before attempting to import loyalty programs.");
        return;
    }

    const db = firebase.firestore();

    const confirmImport = confirm(
        "Are you sure you want to import initial Loyalty Programs?\n\n" +
        "This will create new data or OVERWRITE existing data in: loyaltyPrograms/{programId}\n" +
        "ONLY RUN THIS ONCE FOR INITIAL SETUP."
    );
    if (!confirmImport) {
        return;
    }

    const programsToImport = [
        {
            id: 'standard_stamps',
            name: 'Friez n Burgz Standard Loyalty Card',
            isActive: true,
            totalStampsRequired: 10, // NEW: Total stamps for the card
            rewards: [ // NEW: Array of reward tiers
                { id: 'filletz_reward', threshold: 5, description: 'Free Filletz' },
                { id: 'burger_reward', threshold: 10, description: 'Free Classic Burger' }
            ],
            locations: ['south_shields', 'forrest_hall', 'byker', 'whitley_bay']
        },
        {
            id: 'coffee_lover_card',
            name: 'Coffee Lover Card',
            isActive: true,
            totalStampsRequired: 8,
            rewards: [
                { id: 'coffee_reward', threshold: 8, description: 'Free Regular Coffee' }
            ],
            locations: ['south_shields', 'forrest_hall']
        },
        // Add more loyalty programs as needed
    ];

    const batch = db.batch();
    let importedCount = 0;


    programsToImport.forEach(program => {
        const programDocRef = db.collection('loyaltyPrograms').doc(program.id);
        batch.set(programDocRef, program);
        importedCount++;
    });

    try {
        await batch.commit();
        alert(`Successfully imported ${importedCount} Loyalty Programs!`);
    } catch (error) {
        console.error('Error importing Loyalty Programs:', error);
        alert(`Failed to import Loyalty Programs: ${error.message}. Check console for details.`);
    }
};
