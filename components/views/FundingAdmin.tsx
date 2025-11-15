"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { getFirebaseDb } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import {
  FundingAccount,
  FundingAllocation,
  FundingTransaction,
  UserRole,
} from "@/lib/types"
import {
  DEFAULT_CURRENCY,
  formatCurrency,
  getLowBalanceWarningLevel,
  FUNDING_WARNING_THRESHOLDS,
} from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, DollarSign, Users, Briefcase, TrendingDown, Plus, Download } from "lucide-react"
import { logger } from "@/lib/logger"

export function FundingAdmin() {
  const { currentUser, currentUserProfile } = useAuth()
  const [fundingAccounts, setFundingAccounts] = useState<FundingAccount[]>([])
  const [allocations, setAllocations] = useState<FundingAllocation[]>([])
  const [transactions, setTransactions] = useState<FundingTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  // Check authorization
  const isAuthorized =
    currentUserProfile?.userRole === UserRole.PI ||
    currentUserProfile?.userRole === UserRole.FINANCE_ADMIN ||
    currentUserProfile?.userRole === UserRole.LAB_MANAGER

  const loadFundingData = useCallback(async () => {
    setLoading(true)
    try {
      const labId = currentUserProfile?.labId

      // Load funding accounts
      const accountsSnapshot = await getDocs(
        query(collection(db, "fundingAccounts"), where("labId", "==", labId))
      )
      const accounts = accountsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FundingAccount[]
      setFundingAccounts(accounts)

      // Load all allocations for lab
      const allocationsSnapshot = await getDocs(
        query(collection(db, "fundingAllocations"), where("labId", "==", labId))
      )
      const allocs = allocationsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FundingAllocation[]
      setAllocations(allocs)

      // Load recent transactions (last 100)
      const transactionsSnapshot = await getDocs(
        query(
          collection(db, "fundingTransactions"),
          where("labId", "==", labId),
          orderBy("createdAt", "desc"),
          limit(100)
        )
      )
      const trans = transactionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FundingTransaction[]
      setTransactions(trans)
    } catch (error) {
      logger.error("Error loading funding data", error)
    } finally {
      setLoading(false)
    }
  }, [currentUserProfile?.labId])

  useEffect(() => {
    if (!isAuthorized || !currentUserProfile?.labId) return
    loadFundingData()
  }, [currentUserProfile?.labId, isAuthorized, loadFundingData])

  if (!isAuthorized) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only PIs, Finance Admins, and Lab Managers can access the Funding Admin dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (loading) {
    return <div className="p-8">Loading funding data...</div>
  }

  // Calculate summary statistics
  const totalBudget = allocations.reduce((sum, a) => sum + (a.allocatedAmount || 0), 0)
  const totalSpent = allocations.reduce((sum, a) => sum + a.currentSpent, 0)
  const totalCommitted = allocations.reduce((sum, a) => sum + a.currentCommitted, 0)
  const totalRemaining = allocations.reduce((sum, a) => sum + (a.remainingBudget || 0), 0)

  const criticalAllocations = allocations.filter((a) => {
    const percentSpent = ((a.currentSpent + a.currentCommitted) / (a.allocatedAmount || 1)) * 100
    return percentSpent >= FUNDING_WARNING_THRESHOLDS.CRITICAL
  })

  const personAllocations = allocations.filter((a) => a.type === "PERSON")
  const projectAllocations = allocations.filter((a) => a.type === "PROJECT")

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Funding Administration</h1>
          <p className="text-muted-foreground">Manage lab budget allocations and monitor spending</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
            <p className="text-xs text-muted-foreground">Across {allocations.length} allocations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
            <p className="text-xs text-muted-foreground">
              {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0}% of budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Committed</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCommitted)}</div>
            <p className="text-xs text-muted-foreground">Pending transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRemaining)}</div>
            <p className="text-xs text-muted-foreground">Available to spend</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {criticalAllocations.length > 0 && (
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Critical Budget Alerts ({criticalAllocations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalAllocations.map((allocation) => {
                const percentSpent =
                  ((allocation.currentSpent + allocation.currentCommitted) /
                    (allocation.allocatedAmount || 1)) *
                  100
                return (
                  <div
                    key={allocation.id}
                    className="flex justify-between items-center p-2 bg-red-50 rounded"
                  >
                    <div>
                      <p className="font-medium">
                        {allocation.type === "PERSON" ? "Person" : "Project"} Allocation
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {allocation.personName || allocation.projectName || "Unnamed"} -{" "}
                        {formatCurrency(allocation.currentSpent + allocation.currentCommitted)} /{" "}
                        {formatCurrency(allocation.allocatedAmount || 0)}
                      </p>
                    </div>
                    <Badge variant="destructive">{percentSpent.toFixed(0)}% Used</Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="people">
            <Users className="h-4 w-4 mr-2" />
            People ({personAllocations.length})
          </TabsTrigger>
          <TabsTrigger value="projects">
            <Briefcase className="h-4 w-4 mr-2" />
            Projects ({projectAllocations.length})
          </TabsTrigger>
          <TabsTrigger value="transactions">Transactions ({transactions.length})</TabsTrigger>
          <TabsTrigger value="accounts">Funding Accounts ({fundingAccounts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <AllocationOverview allocations={allocations} transactions={transactions} />
        </TabsContent>

        <TabsContent value="people">
          <PersonAllocationsTable allocations={personAllocations} />
        </TabsContent>

        <TabsContent value="projects">
          <ProjectAllocationsTable allocations={projectAllocations} />
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionsTable transactions={transactions} />
        </TabsContent>

        <TabsContent value="accounts">
          <FundingAccountsTable accounts={fundingAccounts} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Sub-components
function AllocationOverview({
  allocations,
  transactions,
}: {
  allocations: FundingAllocation[]
  transactions: FundingTransaction[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Overview</CardTitle>
        <CardDescription>Summary of all funding allocations and spending</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Total allocations: {allocations.length} ({allocations.filter((a) => a.type === "PERSON").length}{" "}
            personal, {allocations.filter((a) => a.type === "PROJECT").length} project)
          </div>
          <div className="text-sm text-muted-foreground">
            Recent transactions: {transactions.length} in the last 100 entries
          </div>
          <div className="text-sm text-muted-foreground">
            Active allocations:{" "}
            {allocations.filter((a) => a.status === "active" || a.status === "exhausted").length}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PersonAllocationsTable({ allocations }: { allocations: FundingAllocation[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Budget Allocations</CardTitle>
        <CardDescription>Individual researcher funding allocations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Person</th>
                <th className="text-left p-2">Funding Account</th>
                <th className="text-right p-2">Allocated</th>
                <th className="text-right p-2">Spent</th>
                <th className="text-right p-2">Committed</th>
                <th className="text-right p-2">Remaining</th>
                <th className="text-center p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((allocation) => {
                const percentUsed =
                  ((allocation.currentSpent + allocation.currentCommitted) /
                    (allocation.allocatedAmount || 1)) *
                  100
                const warningLevel = getLowBalanceWarningLevel(percentUsed)

                return (
                  <tr key={allocation.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{allocation.personName || allocation.personId || "Unknown"}</td>
                    <td className="p-2">{allocation.fundingAccountName}</td>
                    <td className="text-right p-2">
                      {formatCurrency(allocation.allocatedAmount || 0, allocation.currency)}
                    </td>
                    <td className="text-right p-2">
                      {formatCurrency(allocation.currentSpent, allocation.currency)}
                    </td>
                    <td className="text-right p-2">
                      {formatCurrency(allocation.currentCommitted, allocation.currency)}
                    </td>
                    <td className="text-right p-2">
                      {formatCurrency(allocation.remainingBudget || 0, allocation.currency)}
                    </td>
                    <td className="text-center p-2">
                      <Badge
                        variant={
                          warningLevel === "critical"
                            ? "destructive"
                            : warningLevel === "high"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {allocation.status}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {allocations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">No personal allocations found</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ProjectAllocationsTable({ allocations }: { allocations: FundingAllocation[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Budget Allocations</CardTitle>
        <CardDescription>Project-level funding allocations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Project</th>
                <th className="text-left p-2">Funding Account</th>
                <th className="text-right p-2">Allocated</th>
                <th className="text-right p-2">Spent</th>
                <th className="text-right p-2">Committed</th>
                <th className="text-right p-2">Remaining</th>
                <th className="text-center p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((allocation) => {
                const percentUsed =
                  ((allocation.currentSpent + allocation.currentCommitted) /
                    (allocation.allocatedAmount || 1)) *
                  100
                const warningLevel = getLowBalanceWarningLevel(percentUsed)

                return (
                  <tr key={allocation.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{allocation.projectName || allocation.projectId || "Unknown"}</td>
                    <td className="p-2">{allocation.fundingAccountName}</td>
                    <td className="text-right p-2">
                      {formatCurrency(allocation.allocatedAmount || 0, allocation.currency)}
                    </td>
                    <td className="text-right p-2">
                      {formatCurrency(allocation.currentSpent, allocation.currency)}
                    </td>
                    <td className="text-right p-2">
                      {formatCurrency(allocation.currentCommitted, allocation.currency)}
                    </td>
                    <td className="text-right p-2">
                      {formatCurrency(allocation.remainingBudget || 0, allocation.currency)}
                    </td>
                    <td className="text-center p-2">
                      <Badge
                        variant={
                          warningLevel === "critical"
                            ? "destructive"
                            : warningLevel === "high"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {allocation.status}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {allocations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">No project allocations found</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function TransactionsTable({ transactions }: { transactions: FundingTransaction[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>Funding transaction history (last 100)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Description</th>
                <th className="text-right p-2">Amount</th>
                <th className="text-center p-2">Status</th>
                <th className="text-left p-2">Created By</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">
                    {transaction.createdAt
                      ? new Date(transaction.createdAt).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="p-2">
                    <Badge variant="outline">{transaction.type}</Badge>
                  </td>
                  <td className="p-2 text-sm">{transaction.description}</td>
                  <td className="text-right p-2 font-medium">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </td>
                  <td className="text-center p-2">
                    <Badge variant={transaction.status === "FINAL" ? "default" : "secondary"}>
                      {transaction.status}
                    </Badge>
                  </td>
                  <td className="p-2">{transaction.createdBy || "System"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">No transactions found</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function FundingAccountsTable({ accounts }: { accounts: FundingAccount[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Funding Accounts</CardTitle>
        <CardDescription>Available funding sources for the lab</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Account Name</th>
                <th className="text-left p-2">Source</th>
                <th className="text-right p-2">Total Budget</th>
                <th className="text-left p-2">Currency</th>
                <th className="text-center p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">{account.accountName}</td>
                  <td className="p-2">{account.funderName || "N/A"}</td>
                  <td className="text-right p-2">
                    {formatCurrency(account.totalBudget || 0, account.currency)}
                  </td>
                  <td className="p-2">{account.currency || DEFAULT_CURRENCY}</td>
                  <td className="text-center p-2">
                    <Badge variant={account.status === "active" ? "default" : "secondary"}>
                      {account.status || "active"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {accounts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No funding accounts configured. Contact your lab administrator.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
