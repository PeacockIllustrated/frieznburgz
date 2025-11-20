# QA Checklist - Allergens Module

## 1. Allergen Matrix (Staff View)
- [ ] **View Matrix**: Navigate to "Allergen Matrix" in Handbook. Verify table renders with latest published data.
- [ ] **Item Details**: Click on a row. Verify "Item Details" modal opens with correct info.
- [ ] **Log Button (Global)**: Verify "Log Interaction" button exists in the header.
- [ ] **Log Button (Item)**: Verify "Log Interaction" button exists inside the Item Details modal.

## 2. Incident Logging
- [ ] **Open Form**: Click "Log Interaction". Verify modal opens.
- [ ] **Validation**: Try submitting empty form. Verify error toast.
- [ ] **Pre-fill**: Open form from a specific item. Verify "Item Ordered" is pre-filled.
- [ ] **Submission**: Fill all fields (Store, Allergy, Outcome). Submit. Verify success toast and modal closes.

## 3. Admin Incident Report
- [ ] **Navigation**: Go to Admin -> Incidents.
- [ ] **Rendering**: Verify table loads (it might be empty initially).
- [ ] **Data Check**: If you just submitted a log, click "Refresh". Verify the new entry appears.
- [ ] **Filters**:
    - Filter by Outcome (e.g., "Refused"). Verify list updates.
    - Filter by Store. Verify list updates.
- [ ] **Export**: Click "Export CSV". Verify a `.csv` file is downloaded and contains the table data.

## 4. Permissions (Manual Verification needed)
- [ ] **Staff**: Should NOT see "Admin" nav group. Should be able to Log Incident.
- [ ] **Manager**: Should see "Admin" nav group. Should be able to view Incidents.
- [ ] **Admin**: Full access.
