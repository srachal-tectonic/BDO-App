# Tasks: Add PQ Memo Tabs

## 1. Add Tabs Structure to PQMemoForm
- [x] 1.1 Import Tabs, TabsList, TabsTrigger, TabsContent from `@/components/ui/tabs`
- [x] 1.2 Import FileText, BarChart3, ClipboardList icons from lucide-react
- [x] 1.3 Import RiskScoresSection component

## 2. Implement Tab Navigation
- [x] 2.1 Add Tabs wrapper inside white card, after blue header section
- [x] 2.2 Create TabsList with custom styling (bg-gray-50, border-b, w-full, justify-start, rounded-none, h-auto, p-0)
- [x] 2.3 Add "Overview" TabsTrigger with FileText icon and custom styling
- [x] 2.4 Add "Risk Scores" TabsTrigger with BarChart3 icon and custom styling
- [x] 2.5 Add "BDO Summary" TabsTrigger with ClipboardList icon and custom styling

## 3. Implement Tab Content
- [x] 3.1 Wrap existing form content (from line 256 `<div className="p-5">` to end) in Overview TabsContent
- [x] 3.2 Create Risk Scores TabsContent with RiskScoresSection component
- [x] 3.3 Create BDO Summary TabsContent with placeholder message

## 4. Apply Tab Styling
- [x] 4.1 Style TabsTrigger for inactive state (rounded-none, border-b-2, border-transparent)
- [x] 4.2 Style TabsTrigger for active state (data-[state=active]:border-blue-500, data-[state=active]:bg-white)
- [x] 4.3 Style TabsTrigger with proper padding (px-6 py-3) and gap for icons (gap-2)
- [x] 4.4 Style icons with w-4 h-4 class
- [x] 4.5 Set TabsContent mt-0 to remove default margin

## 5. Verification
- [x] 5.1 Verify Overview tab displays all existing content correctly
- [x] 5.2 Verify Risk Scores tab displays RiskScoresSection and score selection works
- [x] 5.3 Verify BDO Summary tab displays placeholder
- [x] 5.4 Verify tab switching works without page reload
- [x] 5.5 Verify styling matches Replit reference (gray-50 bar, blue-500 active border, white active background)

## Notes
- Default active tab should be "overview"
- Tab values: "overview", "risk-scores", "bdo-summary"
- RiskScoresSection already uses useApplication hook - no additional state management needed
- Placeholder for BDO Summary: "BDO Summary content coming soon."
