/**
 * Type Definitions - Barrel Export
 *
 * This file maintains backward compatibility by re-exporting all types from the new modular structure.
 * All type definitions have been migrated to domain-specific modules in ./types/
 *
 * @see lib/types/README.md for complete documentation
 *
 * Migration guide:
 * - Old: import { PersonProfile } from '@/lib/types'
 * - New: import { PersonProfile } from '@/lib/types' (same - backward compatible!)
 * - Or:  import { PersonProfile } from '@/lib/types/profile.types' (more explicit)
 */

export * from './types/index'
