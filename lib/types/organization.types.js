"use strict";
// ============================================================================
// ORGANIZATIONAL HIERARCHY TYPES - FIXED STRUCTURE
// ============================================================================
// These represent the fixed 3-level organizational hierarchy set during onboarding.
// Field names remain unchanged for backward compatibility, but semantic meaning has evolved:
//
// HIERARCHY (Fixed at onboarding):
//   1. Organisation - University/Institution (unchanged)
//   2. Institute - Now represents School/Faculty (e.g., "School of Medicine")
//   3. Lab - Now represents Department (e.g., "Department of Histopathology")
//
// DYNAMIC GROUPS (can join/leave multiple):
//   4. ResearchGroup - Research collaboration groups (see researchgroup.types.ts)
//   5. WorkingLab - Physical laboratory spaces (see researchgroup.types.ts)
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=organization.types.js.map