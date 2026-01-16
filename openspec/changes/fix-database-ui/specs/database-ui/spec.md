# Database UI Improvements

## MODIFIED Requirements

### Database View Filtering And Search

### Requirement: Independent Table State
The UI state including table data, search query, filter columns, and filter panel inputs must be fully reset when switching between tables to prevent cross-contamination of state.

#### Scenario: Switching tables resets UI state
- **Given** the user is viewing the "records" table with active filters
- **When** the user clicks on the "reports" table tab
- **Then** the data table should update to show reports
- **And** the search bar should be cleared
- **And** the filter panel (if open) should reset all fields ensuring no old fields persist

### Requirement: Optimized Filter UX
Filter inputs should not trigger API calls on every keystroke. To reduce server load and improve UX, filtering should only occur on explicit user action.

#### Scenario: Optimized filter execution (Debounce/Manual)
- **Given** the filter panel is open
- **When** the user types into a text filter field
- **Then** no API request should be triggered immediately
- **When** the user presses "Enter" or clicks "Apply"
- **Then** the table data should refresh with the new filter criteria

### Requirement: Global Search Support
When no specific column is selected for filtering, the search function should default to a global search across all applicable text columns.

#### Scenario: Global Search across all columns
- **Given** no specific column is selected in the search dropdown (default state)
- **When** the user enters a search term
- **Then** the backend should search across all available text columns
- **And** the results should include matches from any of those columns
