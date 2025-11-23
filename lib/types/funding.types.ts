// ============================================================================
// FUNDING TYPES
// ============================================================================

/**
 * FundingAccount - Specific account/grant from a funder
 * Linked to a specific master project
 * Multiple accounts can exist per project (e.g., equipment, consumables, travel)
 */
export interface FundingAccount {
  id: string
  accountNumber: string
  accountName: string

  // Linking
  funderId: string              // Link to funder
  funderName: string            // Cached
  masterProjectId: string       // Link to master project
  masterProjectName: string     // Cached

  // Account Type (NEW)
  accountType?: "main" | "equipment" | "consumables" | "travel" | "personnel" | "other"

  // Financial
  totalBudget?: number
  spentAmount?: number  // Cached from orders
  committedAmount?: number  // From pending orders
  remainingBudget?: number  // Calculated: total - spent - committed
  currency: string  // e.g., "GBP", "USD", "EUR"

  // Dates
  startDate: string
  endDate: string

  // Status
  status: "active" | "closed" | "suspended" | "pending"

  // Metadata
  notes?: string
  createdAt: string
  createdBy: string
  updatedAt?: string
}



/**
 * FundingAllocationType - What the allocation is for
 */
export type FundingAllocationType = "PERSON" | "PROJECT"

/**
 * FundingAllocation - Allocation of funding to a person or project
 * A portion of a FundingAccount assigned to enable spending
 */
export interface FundingAllocation {
  id: string

  // Source funding
  fundingAccountId: string
  fundingAccountName: string      // Cached
  labId: string                   // Lab this allocation belongs to

  // Allocation target
  type: FundingAllocationType
  personId?: string               // PersonProfile ID if type = PERSON
  personName?: string             // Cached
  projectId?: string              // MasterProject ID if type = PROJECT
  projectName?: string            // Cached

  // Financial limits
  allocatedAmount?: number        // Hard limit (optional - can be unlimited)
  softLimit?: number              // Warning threshold
  currentSpent: number            // Calculated from transactions
  currentCommitted: number        // Calculated from pending transactions
  remainingBudget?: number        // Calculated: allocatedAmount - currentSpent - currentCommitted

  // Currency
  currency: string                // e.g., "EUR", "GBP", "USD"

  // Status
  status: "active" | "exhausted" | "suspended" | "archived"

  // Notifications
  lowBalanceWarningThreshold?: number  // Percentage (e.g., 80 = warn at 80% spent)
  lastLowBalanceWarningAt?: string     // When last warning was sent

  // Metadata
  notes?: string
  createdAt: string
  createdBy: string              // User ID who created this allocation
  updatedAt?: string
  updatedBy?: string
}

/**
 * FundingTransactionType - Type of transaction
 */
export type FundingTransactionType =
  | "ORDER_COMMIT"       // Order placed (pending)
  | "ORDER_RECEIVED"     // Order received (final)
  | "ORDER_CANCELLED"    // Order cancelled (reversal)
  | "ADJUSTMENT"         // Manual adjustment (correction, refund, etc.)
  | "REFUND"             // Refund from supplier
  | "TRANSFER"           // Transfer between allocations
  | "ALLOCATION_CREATED" // Initial allocation
  | "ALLOCATION_ADJUSTED" // Allocation amount changed

/**
 * FundingTransactionStatus - Transaction lifecycle status
 */
export type FundingTransactionStatus =
  | "PENDING"   // Committed but not final (e.g., order placed but not received)
  | "FINAL"     // Final transaction (e.g., order received, adjustment completed)
  | "CANCELLED" // Transaction cancelled/reversed

/**
 * FundingTransaction - Ledger entry for all funding movements
 * Tracks spending, commitments, adjustments, and refunds
 */
export interface FundingTransaction {
  id: string

  // Source funding
  fundingAccountId: string
  fundingAccountName: string      // Cached
  allocationId?: string           // Optional: specific allocation this draws from
  allocationName?: string         // Cached
  labId: string

  // Linked entity (what triggered this transaction)
  orderId?: string                // Order ID if this is an order transaction
  orderNumber?: string            // Cached order reference
  entityType?: "order" | "adjustment" | "transfer" | "allocation"
  entityId?: string               // Generic entity ID for non-order transactions

  // Financial
  amount: number                  // Transaction amount (positive = spent, negative = refund)
  currency: string

  // Transaction details
  type: FundingTransactionType
  status: FundingTransactionStatus
  description: string             // Human-readable description

  // Lifecycle tracking
  createdAt: string               // When transaction was created
  createdBy: string               // User ID who created transaction
  finalizedAt?: string            // When status changed to FINAL
  cancelledAt?: string            // When transaction was cancelled

  // Metadata
  invoiceNumber?: string          // Invoice reference
  poNumber?: string               // Purchase order number
  supplierName?: string           // Cached supplier name for orders
  notes?: string
  metadata?: Record<string, any>  // Additional context-specific data
}
