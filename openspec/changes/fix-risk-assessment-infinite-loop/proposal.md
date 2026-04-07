# Change: Fix Risk Assessment Infinite Loop Error

## Why
When a user selects a radio button in the Risk Assessment section, a "Maximum update depth exceeded" error occurs. This is caused by an infinite render loop in the component.

**Root Cause Analysis:**
1. `classification` is derived from `projectOverview.riskAssessment` via `getClassificationFromStorage()` on every render
2. The `useEffect` at line 177 depends on `classification` and calls `updateProjectOverview()`
3. Since `classification` is a new object reference on every render (not memoized), the useEffect runs on every render
4. The useEffect calls `updateProjectOverview()` to set computed values
5. This triggers a re-render, which creates a new `classification` object
6. This triggers the useEffect again, creating an infinite loop

## What Changes
- Memoize the `classification` object using `useMemo` to prevent unnecessary re-renders
- The dependency array will include the actual primitive values from `projectOverview.riskAssessment`
- This ensures the useEffect only runs when the actual values change, not when a new object reference is created

## Impact
- **Affected code:**
  - `components/loan-sections/RiskAssessmentSection.tsx` - Add useMemo for classification
- **No data model changes required**
- **No admin page changes required**

## Fix Summary
1. Import `useMemo` from React
2. Wrap `getClassificationFromStorage()` result in `useMemo` with proper dependencies on the underlying primitive values
3. Remove `classification` from the useEffect dependency array (it will be stable now)
