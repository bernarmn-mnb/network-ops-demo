## 1. Field Discovery

- [ ] 1.1 Ensure backend is running (`./dev status`) and `SEARCH_INDEX` is set in `backend/.env`
- [ ] 1.2 Call `GET /api/search/fields` and capture the `suggested_config` response
- [ ] 1.3 Identify: title field, description field, image URL field, keyword fields (for facets/badges), numeric fields (for range filters/sort)

## 2. Search Config Population

- [ ] 2.1 Set `index` in `searchConfig.ts` to match `SEARCH_INDEX` env var
- [ ] 2.2 Populate `fields.search` with at least 2 text fields and appropriate boosts (title^3, description^1)
- [ ] 2.3 Map `display.title` to the primary title field
- [ ] 2.4 Map `display.description` to the body/summary field
- [ ] 2.5 Map `display.image` to the image URL field (if available) or `display.badges` to keyword fields
- [ ] 2.6 Verify no template placeholder values remain in config

## 3. Facets and Filters

- [ ] 3.1 Add at least 2 facets using keyword-type fields from the fields API response
- [ ] 3.2 Verify each facet produces non-empty aggregation buckets by testing `GET /api/search` with no query
- [ ] 3.3 Add range filters for relevant numeric fields with min/max matching actual data bounds
- [ ] 3.4 Add at least 2 sort options: "Relevance" (default) and one domain-specific field

## 4. Display and UX Verification

- [ ] 4.1 Load the search page and verify results display title, description, and image/badges
- [ ] 4.2 Test a domain-relevant query and confirm results are relevant (title-match ranks higher)
- [ ] 4.3 Select a facet value and confirm results filter correctly
- [ ] 4.4 Combine two facet selections and confirm AND intersection
- [ ] 4.5 Adjust a range filter and confirm results narrow within bounds
- [ ] 4.6 Change sort option and confirm result order changes

## 5. Edge Cases and Polish

- [ ] 5.1 Search for a nonsense string and verify empty state shows visual element + actionable text
- [ ] 5.2 Apply filters that produce zero results and verify "clear all filters" action appears
- [ ] 5.3 Toggle dark/light mode and verify no invisible text, broken borders, or hardcoded colours
- [ ] 5.4 Confirm no template placeholder text visible in any result card
