## 1. Implementation

- [x] 1.1 Remove `mapProjectStructureData()` function entirely from `lib/spreadsDataMapper.ts`
- [x] 1.2 Remove `SHEET1_USE_CATEGORY_ROWS` constant (only used by Sheet 1 mapping)
- [x] 1.3 Remove the "1. Project Structure" entry from `mapLoanApplicationToSheets()` so no cells are sent to Sheet 1
- [x] 1.4 Review `lib/spreadsReverseMapper.ts` — confirmed it already only reads from "2. Sources and Uses" (no changes needed)
- [x] 1.5 Review `lib/spreadsTemplateConfig.ts` — this is a reference/documentation config describing sheet structure, not used by pre-fill logic (no changes needed)
- [x] 1.6 Verify "2. Sources and Uses" (Sheet 2) pre-fill is unchanged — confirmed `mapSourcesAndUsesData()` untouched
- [x] 1.7 TypeScript compilation passes with no errors
