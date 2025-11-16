# Type Definitions

This directory contains TypeScript type definitions organized by domain, refactored from the monolithic `types.ts`.

## Structure

Each module contains related type definitions for a specific domain area.

### Core Types

- **user.types.ts** - User and authentication types
- **profile.types.ts** - Person profiles, positions, and lab roles
- **organization.types.ts** - Organizational hierarchy (Organisation, Institute, Lab)
- **funding.types.ts** - Funding accounts, allocations, and funders

### Project & Task Types

- **project.types.ts** - Master projects, profile projects, and legacy projects
- **workpackage.types.ts** - Workpackages, deliverables, tasks, and subtasks
- **task.types.ts** - Day-to-day tasks and importance levels

### Lab Operations Types

- **order.types.ts** - Purchase orders and order status
- **inventory.types.ts** - Inventory items and levels
- **equipment.types.ts** - Equipment devices, supplies, and SOPs
- **eln.types.ts** - Electronic lab notebook experiments

### Calendar & Events Types

- **calendar.types.ts** - Calendar events, connections, and sync logs

### Integration Types

- **orcid.types.ts** - ORCID integration types
- **ai.types.ts** - AI-related types (if any)

### Utility Types

- **common.types.ts** - Shared utility types and enums

## Usage

Import types individually:
```typescript
import type { PersonProfile, PositionLevel } from '@/lib/types/profile.types'
import type { MasterProject } from '@/lib/types/project.types'
```

Or use the barrel export (maintains backward compatibility):
```typescript
import type { PersonProfile, MasterProject } from '@/lib/types'
```

## Type Organization Principles

1. **Domain Cohesion** - Related types are grouped together
2. **Clear Dependencies** - Minimize cross-module dependencies
3. **Shared Types** - Common types go in `common.types.ts`
4. **Export Everything** - All types are re-exported through barrel export

## Migration from types.ts

All type definitions from the original `types.ts` have been distributed to appropriate domain modules. The original file now serves as a barrel export for backward compatibility.

To update your code:
```typescript
// Old (still works via barrel export)
import { PersonProfile } from '@/lib/types'

// New (more explicit, same result)
import { PersonProfile } from '@/lib/types/profile.types'

// Or continue using barrel export
import { PersonProfile } from '@/lib/types'
```

## Constants

Constants like `FUNDING_ACCOUNTS` remain in the type files where they're most relevant, or in a dedicated `constants.ts` file if they're used across multiple domains.
