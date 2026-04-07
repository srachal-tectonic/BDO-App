# Design: Fix Sources & Uses Table Isolation

## Context

The application has three Sources & Uses tables:
1. **7(a) Standard** - Uses "3rd Party" as 4th column
2. **SBA 504** - Uses "CDC 504" as 4th column
3. **7(a) Express** - Uses "3rd Party" as 4th column

Each table represents a different SBA loan program and should maintain independent data. Currently, all three tables share the same `sourcesUses` state in `lib/applicationStore.ts`, causing edits in one table to mirror in all others.

## Goals

- Each of the three tables maintains independent state
- Editing one table does not affect the other two
- "Mark as Primary" feature correctly populates all three tables with their respective synced data
- Minimal changes to existing component interfaces
- Backwards compatibility with existing saved project data

## Non-Goals

- Changing the visual layout of tables
- Adding new functionality beyond isolation fix
- Refactoring the entire data model

## Decisions

### Decision 1: Separate State Fields in Application Store

**What**: Add three new state fields: `sourcesUses7a`, `sourcesUses504`, `sourcesUsesExpress`

**Why**:
- Clear separation of concerns
- Each table gets dedicated state and update function
- Matches the existing `ProjectSourcesUses` structure used for synced data

**Alternatives considered**:
- Single `sourcesUses` object with nested keys - More complex prop drilling, harder to type
- Separate Zustand stores per table - Over-engineered for this use case

### Decision 2: Reuse Existing SourcesUses Interface

**What**: Use `Partial<SourcesUses>` for all three table state fields

**Why**:
- The `SourcesUses` interface already has all needed fields
- Minimizes type changes
- The 504 table's `cdc504` column can map to `thirdParty` at the display layer

### Decision 3: Add tableType Prop to SourcesUsesMatrix

**What**: Add `tableType: '7a' | '504' | 'express'` prop

**Why**:
- Component can determine correct column label ("CDC 504" vs "3rd Party")
- Enables future table-specific logic without breaking changes
- Explicit identification of which table is being rendered

## Data Flow

```
ApplicationStore
├── sourcesUses7a ─────┬──> SourcesUsesCards ──> SourcesUsesMatrix (7a Standard)
├── sourcesUses504 ────┤
└── sourcesUsesExpress ┘
                           Each card gets its own:
                           - state (sourcesUsesXxx)
                           - update function (updateSourcesUsesXxx)
                           - tableType prop
```

## Migration

1. Existing `sourcesUses` field remains for backwards compatibility
2. On project load, if `sourcesUses7a` is empty but `sourcesUses` has data, copy to `sourcesUses7a`
3. Future saves write to all three fields
4. Eventually deprecate single `sourcesUses` field

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Breaking existing saved data | Migration logic copies existing `sourcesUses` to `sourcesUses7a` |
| Increased store complexity | Clear naming convention, separate update functions |
| Triple the state updates on "Mark as Primary" | Acceptable - only happens on user action |

## Open Questions

- Should we persist all three tables to the same Firestore document or separate subcollections?
  - **Recommendation**: Same document for simplicity, nested under `sourcesUses7a`, `sourcesUses504`, `sourcesUsesExpress` keys
