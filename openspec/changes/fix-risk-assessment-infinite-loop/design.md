# Design: Fix Risk Assessment Infinite Loop

## Problem
The current code creates a new `classification` object on every render:

```typescript
const classification = getClassificationFromStorage();
```

This object is then used as a dependency in a useEffect:

```typescript
useEffect(() => {
  // ... evaluates rules and calls updateProjectOverview()
}, [rules, classification, updateProjectOverview]);
```

Since `classification` is always a new object reference, the useEffect runs on every render, calling `updateProjectOverview()`, which triggers another render, causing an infinite loop.

## Solution
Use `useMemo` to memoize the `classification` object based on the actual primitive values:

```typescript
const classification = useMemo(() => {
  const stored = projectOverview?.riskAssessment;
  if (!stored) return defaultClassification;

  return {
    isStartup: stored.isStartup === true ? 'yes' : stored.isStartup === false ? 'no' : '',
    hasExistingCashflow: stored.hasExistingCashflow === true ? 'yes' : stored.hasExistingCashflow === false ? 'no' : '',
    hasTransitionRisk: stored.hasTransitionRisk === true ? 'yes' : stored.hasTransitionRisk === false ? 'no' : '',
    includesRealEstate: stored.includesRealEstate === true ? 'yes' : stored.includesRealEstate === false ? 'no' : '',
    creScope: stored.creScope || '',
    isPartnerBuyout: stored.isPartnerBuyout === true ? 'yes' : stored.isPartnerBuyout === false ? 'no' : '',
    involvesConstruction: stored.involvesConstruction === true ? 'yes' : stored.involvesConstruction === false ? 'no' : '',
  };
}, [
  projectOverview?.riskAssessment?.isStartup,
  projectOverview?.riskAssessment?.hasExistingCashflow,
  projectOverview?.riskAssessment?.hasTransitionRisk,
  projectOverview?.riskAssessment?.includesRealEstate,
  projectOverview?.riskAssessment?.creScope,
  projectOverview?.riskAssessment?.isPartnerBuyout,
  projectOverview?.riskAssessment?.involvesConstruction,
]);
```

This ensures:
1. The `classification` object reference only changes when actual values change
2. The useEffect runs only when needed (when actual classification values or rules change)
3. No infinite render loop

## Alternative Considered
Could also use a ref to track if we're in the middle of an update, but `useMemo` is the cleaner React-idiomatic solution that addresses the root cause.
