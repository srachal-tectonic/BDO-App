# Design: Dev-Only Dummy Data Button

## Context
Testing the loan application workflow requires filling out multiple form sections with valid data. This is time-consuming during development. A dev-only button to populate sample data will speed up testing.

## Goals / Non-Goals

### Goals
- Provide one-click population of all loan application fields with realistic sample data
- Only show button in development environment for safety
- Support testing of Zoho Sheets cell population feature

### Non-Goals
- Production-facing feature
- Randomized data generation (static sample data is sufficient)
- Multiple data scenarios (single realistic dataset is enough)

## Decisions

### Environment Detection
- **Decision**: Use `process.env.NODE_ENV === 'development'`
- **Rationale**: Standard Next.js pattern, tree-shaken in production builds

### Button Placement
- **Decision**: Place button in the header area of the project page, near existing action buttons
- **Rationale**: Easily accessible, visible but not intrusive

### Button Styling
- **Decision**: Use orange/amber color with "Dev Only" label
- **Rationale**: Clearly distinguishes from production features

### Data Population Method
- **Decision**: Call existing Zustand store actions to update each section
- **Rationale**: Reuses existing state management, triggers same update flows as manual entry

## Sample Data Structure

```typescript
const dummyData = {
  projectOverview: {
    projectName: 'ABC Manufacturing Acquisition',
    projectDescription: 'Acquisition of established manufacturing business...',
    bdoName: 'John Smith',
    industry: 'Manufacturing',
    naicsCode: '332710',
    primaryProjectPurpose: 'Business Acquisition',
  },
  sourcesUses: {
    loanAmount: 1500000,
    sellerFinancing: 200000,
    equityInjection: 300000,
    purchasePrice: 1800000,
    workingCapital: 150000,
    closingCosts: 50000,
  },
  loan1: {
    amount: 1500000,
    term: 10,
    baseRate: 'Prime',
    spread: 2.75,
    totalRate: 10.25,
  },
  businessApplicant: {
    legalName: 'ABC Holdings LLC',
    ein: '12-3456789',
    entityType: 'LLC',
    // ...
  },
  individualApplicants: [
    {
      firstName: 'Jane',
      lastName: 'Doe',
      ownershipPercentage: 51,
      // ...
    },
  ],
};
```

## Risks / Trade-offs

### Risk: Accidental use in production
- **Mitigation**: Environment check ensures button never renders in production

### Trade-off: Static vs dynamic data
- Static data is simpler but less flexible for edge case testing
- Acceptable for initial implementation; can add variations later if needed
