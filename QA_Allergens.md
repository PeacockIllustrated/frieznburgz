# QA Checklist - Allergens Module

## 1. Data Seeding (Admin)
- [ ] **Seed Menu**: Go to "Allergen Editor". Click "Seed Menu". Confirm dialog.
- [ ] **Verify**: Check that items like "Fussy", "Classic", "Fussy Chix" appear in the list.
- [ ] **Publish**: Click "Publish Matrix", enter version "QA Test v1", and submit.

## 2. Allergen Matrix (Staff View)
- [ ] **View Matrix**: Navigate to "Allergen Matrix" in Handbook. Verify table renders with the seeded data.
- [ ] **Item Details**: Click on "Classic" burger row. Verify "Item Details" modal opens with "Contains: Gluten" (or whatever was seeded/edited).
- [ ] **A11y**: Tab through the table. Verify focus lands on rows and Screen Reader announces item name.

## 3. Incident Logging
- [ ] **Open Form**: Click "Log Interaction" in the Item Drawer. Verify "Classic" is pre-filled in "Item Ordered".
- [ ] **Validation**: Try submitting empty form. Verify error toast.
- [ ] **Submission**: Fill all fields (Store, Allergy: Gluten, Outcome: Served Safely). Submit. Verify success toast.

## 4. Admin Incident Report
- [ ] **Navigation**: Go to Admin > Incidents.
- [ ] **Rendering**: Verify the log you just submitted appears.
- [ ] **Date Filter**: Set Start Date to tomorrow. Verify list is empty. Set back to today. Verify list returns.
- [ ] **Export**: Click "Export CSV". Verify `.csv` file contains the "Served Safely" entry.

## 5. Printable View
- [ ] **Navigation**: Go to Handbook > Print.
- [ ] **Layout**: Verify "Specials" banner is red (on screen). Verify Legend is present.
- [ ] **QR Code**: Verify QR code is generated top-right.
- [ ] **Print**: Click "Print". Verify browser print preview defaults to Landscape (if supported) and hides navigation/buttons.

## 6. Security (Manual/Test Script)
- [ ] **Staff Access**: Log in as standard staff. Try to edit a menu item (should be blocked or hidden).
- [ ] **Manager Access**: Log in as Manager. Access Incidents page. Try to delete an incident (if UI allows, or via console).
- [ ] **Rules Test**: Run `rules-test.js` suite (requires emulator) or verify manual access paths.
