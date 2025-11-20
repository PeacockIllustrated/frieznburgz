# Friez n Burgz - Allergen Management Module

This module handles the FSA-compliant allergen matrix, staff training, and incident logging for Friez n Burgz.

## Data Model

### `menuItems` Collection
Stores the master list of menu items.
- `name`: String
- `category`: String
- `allergens`: Map<String, String> (keys: allergen IDs, values: 'contains'|'may_contain'|'free'|'unknown')
- `notes`: String
- `active`: Boolean
- `lastEditedAt`: Timestamp
- `lastEditedBy`: String

### `allergenVersions` Collection
Stores immutable snapshots of the allergen matrix as published by admins.
- `title`: String
- `changeLog`: String
- `publishedAt`: Timestamp
- `publishedBy`: String
- `matrixSnapshot`: Array<Object> (Copy of active menu items at time of publish)

### `allergyIncidents` Collection (New)
Logs interactions with customers regarding allergens.
- `createdAt`: Timestamp (Indexed)
- `createdBy`: String (User UID)
- `createdByName`: String
- `store`: String (Location ID)
- `storeName`: String
- `customerAllergies`: Array<String> (List of allergen names)
- `itemOrdered`: String
- `actionTaken`: String
- `outcome`: "served_safely" | "refused" | "escalated"
- `notes`: String

### `trainingAcks` Collection
Stores records of staff training acknowledgements.
- `uid`: String (User UID)
- `module`: String
- `timestamp`: Timestamp

## Features

### 1. Staff Matrix (Handbook)
- View the latest published allergen matrix.
- Search by item name or filter by category/allergen.
- **Access**: All Authenticated Users.
- **Log Interaction**: Use the "Log Interaction" button (global or per-item) to record customer queries.

### 2. Admin Editor & Seeding
- **Editor**: Add/Edit menu items and their allergen status.
- **Seed Menu**: Admin button to auto-populate the database with the standard menu (Beef Burgz, Chicken Burgz, etc.).
- **Publish**: Creates a snapshot in `allergenVersions`.
- **Import/Export**: CSV bulk tools.
- **Access**: Admin Only.

### 3. Incident Reporting (Admin)
- View a log of all recorded allergy incidents.
- Filter by **Date Range**, **Store**, and **Outcome**.
- Export logs to CSV (includes ISO timestamps for compliance).
- **Access**: Manager & Admin.

### 4. Printable View
- A4 Landscape optimized view.
- Includes "Specials" warning banner and Legend.
- QR Code links back to the live matrix.
- **Access**: All Authenticated Users (via Handbook).

## Workflows

### Logging an Incident
1. Staff member clicks "Log Interaction" in the Handbook (or on a specific item details pane).
2. Selects the **Store** (required).
3. Selects **Customer Allergies** (multi-select).
4. Enters **Item Ordered** (pre-filled if logged from item context).
5. Records **Action Taken** and **Outcome** (Served, Refused, Escalated).
6. Submits.

### Reviewing Incidents
1. Managers/Admins navigate to **Admin > Incidents**.
2. Use date pickers and dropdowns to filter the list.
3. Click "Export CSV" to download the report.

## Permissions (Firestore Rules)

- **Read Matrix**: All Authenticated Users.
- **Log Incident**: All Authenticated Users (Create only).
- **View/Export Incident Logs**: Manager & Admin.
- **Edit Matrix/Publish**: Admin Only.
- **Training Acknowledgements**: Create own only (immutable).

## Accessibility & Performance
- Matrix tables use proper `aria-label` attributes.
- Modal focus trapping is implemented.
- Matrix data is cached locally for performance.
