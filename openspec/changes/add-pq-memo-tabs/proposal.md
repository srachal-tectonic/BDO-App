# Proposal: Add PQ Memo Tabs

## Summary
Add a tabbed navigation interface to the PQMemoForm component, organizing content into three tabs: "Overview", "Risk Scores", and "BDO Summary". This improves the user experience by separating concerns and reducing vertical scrolling.

## Motivation
The current PQ Memo form displays all content in a single scrollable view. Adding tabs will:
- Organize content into logical sections
- Reduce cognitive load by showing one section at a time
- Restore the Risk Scores functionality that users need for credit scoring
- Provide a placeholder for future BDO Summary content

## Scope

### In Scope
- Add Radix UI Tabs component to PQMemoForm after the blue header section
- Style tabs to match the Replit reference design (gray-50 background, blue-500 active border)
- Move existing content into the "Overview" tab
- Import and display RiskScoresSection in the "Risk Scores" tab
- Create placeholder content for "BDO Summary" tab
- Add icons (FileText, BarChart3, ClipboardList) to tab labels

### Out of Scope
- Implementing actual BDO Summary functionality (placeholder only)
- Persisting active tab state across page reloads
- Changes to RiskScoresSection component itself

## Technical Approach

### Component Structure
The tabs will be added inside the white card container, immediately after the blue gradient header:

```
PQMemoForm
├── Blue Header (unchanged - project name, BDO, referral info, scores)
└── White Card Body
    └── Tabs (new)
        ├── TabsList (gray-50 background, border-b)
        │   ├── TabsTrigger "Overview" (FileText icon)
        │   ├── TabsTrigger "Risk Scores" (BarChart3 icon)
        │   └── TabsTrigger "BDO Summary" (ClipboardList icon)
        └── TabsContent
            ├── Overview: Current form content (Loan Structure, Project Description, etc.)
            ├── Risk Scores: RiskScoresSection component
            └── BDO Summary: Placeholder
```

### Styling Reference (from Replit)
- TabsList: `w-full justify-start rounded-none border-b bg-gray-50 h-auto p-0`
- TabsTrigger: `rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-white px-6 py-3 gap-2`
- TabsContent: `mt-0`
- Icons: `w-4 h-4` next to tab labels

## Dependencies
- Existing `components/ui/tabs.tsx` (Radix UI Tabs)
- Existing `components/loan-sections/RiskScoresSection.tsx`
- Lucide React icons (FileText, BarChart3, ClipboardList)

## Acceptance Criteria
1. Three tabs are visible below the blue header: "Overview", "Risk Scores", "BDO Summary"
2. Each tab has an appropriate icon
3. Active tab has a blue bottom border and white background
4. Overview tab shows all existing PQ Memo content
5. Risk Scores tab displays the RiskScoresSection component
6. BDO Summary tab shows a placeholder message
7. Tab switching works smoothly without page reload
8. Styling matches the Replit reference design
