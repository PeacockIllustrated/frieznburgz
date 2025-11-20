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
- `createdAt`: Timestamp
- `createdBy`: String (User UID)
- `createdByName`: String
- `store`: String (Location ID)
- `storeName`: String
- `customerAllergies`: Array<String> (List of allergen names)
- `itemOrdered`: String
- `actionTaken`: String
- `outcome`: "served_safely" | "refused" | "escalated"
- `notes`: String

## Features

### 1. Staff Matrix (Handbook)
- View the latest published allergen matrix.
- Click any item row to view details.
- **Log Interaction**: Use the "Log Interaction" button (global or per-item) to record customer queries.

### 2. Admin Editor
- Edit menu items and their allergen status.
- Publish new versions (creates a snapshot).
- Import/Export via CSV.

### 3. Incident Reporting (Admin)
- View a log of all recorded allergy incidents.
- Filter by Store, Outcome, and Date.
- Export logs to CSV for compliance reviews.

## Workflows

### Logging an Incident
1. Staff member clicks "Log Interaction" in the Handbook (or on a specific item).
2. Selects the Store (auto-selected if user has a home location).
3. Selects Customer Allergies (multi-select).
4. Enters Item Ordered (pre-filled if logged from item context).
5. Records Action Taken and Outcome.
6. Submits.

### Reviewing Incidents
1. Managers/Admins navigate to **Admin > Incidents**.
2. Use filters to narrow down the list.
3. Click "Export CSV" to download the report.

## Permissions

- **Read Matrix**: All Authenticated Users.
- **Log Incident**: All Authenticated Users.
- **Edit Matrix/Publish**: Admin Only.
- **View/Export Incident Logs**: Manager & Admin.
- **Delete Incident Logs**: Manager & Admin.
