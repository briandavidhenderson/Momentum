/**
 * Firestore Service - Barrel Export
 *
 * This file maintains backward compatibility by re-exporting all functions from the new modular service structure.
 * All service functions have been migrated to domain-specific modules in ./services/
 *
 * @see lib/services/README.md for complete documentation
 *
 * Migration guide:
 * - Old: import { createProfile } from '@/lib/firestoreService'
 * - New: import { createProfile } from '@/lib/firestoreService' (same - backward compatible!)
 * - Or:  import { createProfile } from '@/lib/services/profileService' (more explicit)
 * - Or:  import { createProfile } from '@/lib/services' (via barrel export)
 */

export * from './services'
