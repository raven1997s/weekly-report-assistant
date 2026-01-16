# Fix Database Management UI

## Goal Description
Fix core functionality issues in the Database Management UI based on user feedback:
1.  **Fix Filter Panel State on Table Switch:** Ensure filters are consistently available and reset when switching tables.
2.  **Optimize Search Trigger:** Replace "search as you type" in the Filter Panel with explicit submission (Button/Enter) to prevent excessive API calls.
3.  **Restore "Search All" Functionality:** Ensure the main search bar searches across all text columns when no specific column is selected.

## User Review Required
> [!IMPORTANT]
> - **Search Behavior Change:** The main search bar will keep debounced auto-search (500ms). The **Filter Panel** inputs will require an explicit "Apply" click or "Enter" keypress.
> - **UI Change:** The "All Columns" option in the dropdown was reported missing/broken. This will be fixed to explicitly support a "Global Search" mode.

## Proposed Changes

### Frontend Components

#### [MODIFY] [DatabaseView.vue](file:///Users/raven/Documents/devlop/all_in_ai/weekly_report_assistant/src/views/DatabaseView.vue)
-   **Computed Properties:** Ensure `searchableColumns` maps correctly to the new object format returned by the API.
-   **Search Logic:** Fix `filterColumn` binding. If empty, backend should receive no `column` param (triggering global search).
-   **Table Switching:** Reset `columns` and `filters` immediately upon switch.

#### [MODIFY] [FilterPanel.vue](file:///Users/raven/Documents/devlop/all_in_ai/weekly_report_assistant/src/components/FilterPanel.vue)
-   **Event Handling:** Remove `watch(localFilters)` for auto-apply. Add `@keyup.enter="handleApply"` to inputs.
-   **Validation:** Ensure `columns` prop changes (on table switch) trigger a clean reset of local state.

#### [MODIFY] [DataTable.vue](file:///Users/raven/Documents/devlop/all_in_ai/weekly_report_assistant/src/components/DataTable.vue)
-   **Rendering:** Ensure column headers and cells handle the object-based column definition consistently.

## Verification Plan

### Manual Verification
1.  **Global Search:** Enter text in main search bar with "All Fields" selected. Verify backend logs show search across multiple columns.
2.  **Filter Panel:** Open panel, type in a field. Verify NO request until Enter/Apply is hit.
3.  **Table Switch:** Switch tables. Open filter panel immediately. Verify the fields match the NEW table, not the old one.
