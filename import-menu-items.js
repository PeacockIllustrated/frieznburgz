
// --- import-menu-items.js ---
// Script to one-time import menu items into the 'menuItems' collection.
// Usage:
// 1. Include this script in your HTML temporarily (or paste in console).
// 2. Run `window.importMenuItems(listOfNames)` where listOfNames is an array of strings.

import { FSA_ALLERGENS } from './constants.js';

export async function importMenuItems(names) {
    if (!names || !Array.isArray(names) || names.length === 0) {
        console.error("Please provide an array of item names.");
        return;
    }

    // We need the Firestore instance. Assuming it's available globally as 'db' or via firebase.
    // If running from console, might need to access via window.mainApp.db or similar if exposed,
    // or just use firebase.firestore() if the SDK is loaded.
    const db = firebase.firestore();
    const currentUser = firebase.auth().currentUser;

    if (!currentUser) {
        console.error("You must be logged in to import menu items.");
        return;
    }

    console.log(`Starting import of ${names.length} items...`);
    const batchSize = 500; // Firestore batch limit is 500 operations
    let batches = [];
    let currentBatch = db.batch();
    let operationCount = 0;

    // Prepare default allergen map (all unknown)
    const defaultAllergens = FSA_ALLERGENS.reduce((acc, allergen) => {
        acc[allergen.id] = 'unknown';
        return acc;
    }, {});

    for (const name of names) {
        // Create a new document reference
        const docRef = db.collection('menuItems').doc();

        const newItem = {
            name: name.trim(),
            category: 'Uncategorized', // Default
            active: true,
            allergens: defaultAllergens,
            notes: '',
            lastEditedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastEditedBy: currentUser.displayName || currentUser.email || 'Import Script'
        };

        currentBatch.set(docRef, newItem);
        operationCount++;

        if (operationCount === batchSize) {
            batches.push(currentBatch);
            currentBatch = db.batch();
            operationCount = 0;
        }
    }

    // Push the last batch if it has operations
    if (operationCount > 0) {
        batches.push(currentBatch);
    }

    // Commit all batches
    try {
        for (let i = 0; i < batches.length; i++) {
            await batches[i].commit();
            console.log(`Batch ${i + 1}/${batches.length} committed.`);
        }
        console.log("Import complete!");
        alert("Menu items imported successfully.");
    } catch (error) {
        console.error("Error importing menu items:", error);
        alert("Error importing menu items. Check console.");
    }
}

// Expose to window for easy access
window.importMenuItems = importMenuItems;
