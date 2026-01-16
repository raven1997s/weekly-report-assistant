# Tasks

- [ ] Fix `DatabaseView.vue` search logic <!-- id: 1 -->
    - [ ] Restore "All Columns" option in dropdown
    - [ ] Ensure `searchableColumns` handles object structure correctly
- [ ] Optimize `FilterPanel.vue` <!-- id: 2 -->
    - [ ] Remove auto-apply watch
    - [ ] Add Enter key support
    - [ ] Add "Apply" button loading state (optional but good)
- [ ] Fix Table Switching Stability <!-- id: 3 -->
    - [ ] Ensure `columns` ref is cleared on switch before fetch
    - [ ] Ensure FilterPanel updates its fields when `columns` prop changes
