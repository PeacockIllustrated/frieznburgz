import { db, auth } from './firebase.js';
import { FSA_ALLERGENS } from './constants.js';
import { showToast } from './ui.js';

const MENU_DATA = {
  "beef_burgz": [
    {
      "title": "Fussy",
      "description": "Only beef & cheeze",
      "category": "Beef Burgz"
    },
    {
      "title": "Classic",
      "description": "Cheeze, shredded lettuce, diced onions, dill pickles, classic sauce",
      "category": "Beef Burgz"
    },
    {
      "title": "Original",
      "description": "Cheeze, grilled onions, dill pickles, sweet ’n’ smokey sauce",
      "category": "Beef Burgz"
    },
    {
      "title": "Delicate",
      "description": "Cheeze, shredded lettuce, spicy pickled onions, fresh chilli, chipotle sauce",
      "category": "Beef Burgz"
    },
    {
      "title": "American",
      "description": "Cheeze, diced onion, dill pickles, ketchup & mustard",
      "category": "Beef Burgz"
    }
  ],

  "chicken_burgz": [
    {
      "title": "Fussy Chix",
      "description": "Only chicken & cheeze",
      "category": "Chicken Burgz"
    },
    {
      "title": "Light Chix",
      "description": "Cheeze, lettuce, creamy garlic",
      "category": "Chicken Burgz"
    },
    {
      "title": "Tangy Chix",
      "description": "Cheeze, lettuce, pickled onions, chillies, smokey hot sauce",
      "category": "Chicken Burgz"
    },
    {
      "title": "Crunchy Chix",
      "description": "Cheeze, dijonese coleslaw, garlic & parmesan sauce",
      "category": "Chicken Burgz"
    },
    {
      "title": "Sweet n’ Smokey Chix",
      "description": "Cheeze, pickles, sweet n’ smokey sauce",
      "category": "Chicken Burgz"
    }
  ],

  "saverz_menu": [
    {
      "title": "Plain / Seasoned Friez",
      "description": "Plain or seasoned chips",
      "category": "Saverz"
    },
    {
      "title": "Single Beef Burger",
      "description": "Beef n’ cheeze",
      "category": "Saverz"
    },
    {
      "title": "Mini Chix Burgz",
      "description": "Two chix filletz, cheeze slices",
      "category": "Saverz"
    },
    {
      "title": "3 Filletz n’ Friez",
      "description": "Three filletz – plain or spicy, served with friez",
      "category": "Saverz"
    },
    {
      "title": "6 Filletz n’ Friez",
      "description": "Six filletz – plain or spicy, served with friez",
      "category": "Saverz"
    }
  ],

  "sauces": [
    { "title": "Creamy Garlic", "description": "Sauce", "category": "Sauces" },
    { "title": "Heinz Ketchup", "description": "Sauce", "category": "Sauces" },
    { "title": "Smokey BBQ", "description": "Sauce", "category": "Sauces" },
    { "title": "Chipotle Mayo", "description": "Sauce", "category": "Sauces" },
    { "title": "Sweet n’ Smokey", "description": "Sauce", "category": "Sauces" },
    { "title": "Burger Classic", "description": "Sauce", "category": "Sauces" },
    { "title": "Garlic Parmesan", "description": "Sauce", "category": "Sauces" },
    { "title": "Hot Cheeze", "description": "Spicy hot cheeze sauce", "category": "Sauces" }
  ],

  "box_additions": [
    {
      "title": "Oumi Cheese",
      "description": "Grilled oumi block",
      "category": "Add into your box"
    },
    {
      "title": "Coleslaw",
      "description": "Creamy slaw",
      "category": "Add into your box"
    },
    {
      "title": "Cheeze Sauce & Bacon Crumbs",
      "description": "Cheeze sauce with bacon crumbs",
      "category": "Add into your box"
    },
    {
      "title": "Plain Filletz",
      "description": "Plain chicken filletz",
      "category": "Add into your box"
    },
    {
      "title": "Spicy Filletz",
      "description": "Spicy chicken filletz",
      "category": "Add into your box"
    },
    {
      "title": "Filletz of the Week",
      "description": "Weekly special fillet flavour",
      "category": "Add into your box"
    }
  ],

  "cheesecake": [
    { "title": "Biscoff Cheesecake", "description": "Biscoff flavour", "category": "Cheesecake" },
    { "title": "Lemon Cheesecake", "description": "Lemon flavour", "category": "Cheesecake" },
    { "title": "Oreo Cheesecake", "description": "Oreo flavour", "category": "Cheesecake" },
    { "title": "Banoffee Cheesecake", "description": "Banoffee flavour", "category": "Cheesecake" }
  ],

  "milkshakes": [
    { "title": "Vanilla Shake", "description": "Vanilla milkshake", "category": "Milkshakes" },
    { "title": "Strawberry Shake", "description": "Strawberry milkshake", "category": "Milkshakes" },
    { "title": "Chocolate Shake", "description": "Chocolate milkshake", "category": "Milkshakes" },
    { "title": "Banana Shake", "description": "Banana milkshake", "category": "Milkshakes" },
    { "title": "Flavour of the Week Shake", "description": "Weekly special flavour", "category": "Milkshakes" }
  ]
};

export async function seedMenuItems() {
    if (!confirm("Are you sure you want to seed the database with the default menu items? This will add new items.")) {
        return;
    }

    showToast("Starting menu seed...", "info");
    let addedCount = 0;
    const batch = db.batch();
    let operationCount = 0;
    const MAX_BATCH_SIZE = 450; // Firestore batch limit is 500

    // Flatten the data
    const items = [];
    Object.values(MENU_DATA).forEach(categoryItems => {
        categoryItems.forEach(item => items.push(item));
    });

    const currentUser = auth.currentUser;
    const userEmail = currentUser ? (currentUser.email || currentUser.uid) : 'system_seed';

    try {
        for (const item of items) {
            // Check for existing item to avoid duplicates (optional, but good practice)
            // For simplicity in this specific task "get menu on there quickly", we will just add.
            // Or better, we can query if name exists? Firestore reads might be expensive if many items.
            // Let's just generate a consistent ID or rely on auto-ID. Auto-ID is safer for bulk adds.

            const newItemRef = db.collection('menuItems').doc();

            const allergenDefaults = {};
            FSA_ALLERGENS.forEach(a => {
                allergenDefaults[a.id] = 'unknown';
            });

            const docData = {
                name: item.title,
                category: item.category,
                notes: item.description || '',
                active: true,
                allergens: allergenDefaults,
                lastEditedAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastEditedBy: userEmail
            };

            batch.set(newItemRef, docData);
            operationCount++;
            addedCount++;

            if (operationCount >= MAX_BATCH_SIZE) {
                await batch.commit();
                // Reset batch
                // batch = db.batch(); // Cannot re-assign const. Ideally need loop structure or separate batches.
                // Since the list is small (< 100 items), one batch is enough.
            }
        }

        if (operationCount > 0) {
            await batch.commit();
        }

        showToast(`Successfully seeded ${addedCount} menu items.`, "success");

        // Trigger a refresh if the app exposes one, or let the user navigate
        // window.location.reload(); // Aggressive but ensures data is seen

    } catch (error) {
        console.error("Error seeding menu items:", error);
        showToast("Error seeding menu items: " + error.message, "error");
    }
}
