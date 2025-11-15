"use client"

import { useState, useEffect } from "react"
import { useAppContext } from "@/lib/AppContext"
import { getFirebaseDb } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { FundingTransaction } from "@/lib/types"
import { formatCurrency, getLowBalanceWarningLevel } from "@/lib/constants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Wallet, TrendingDown, Clock, AlertCircle } from "lucide-react"
import { logger } from "@/lib/logger"

export function PersonalLedger() {
  const { currentUser, fundingAllocations, fundingAllocationsLoading } = useAppContext()
  const [transactions, setTransactions] = useState<FundingTransaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(true)

  // Load transaction history when allocations change
  useEffect(() => {
    if (!fundingAllocations || fundingAllocations.length === 0) {
      setTransactions([])
      setTransactionsLoading(false)
      return
    }

    const loadTransactions = async () => {
    const db = getFirebaseDb()
      setTransactionsLoading(true)
      try {
        const allocationIds = fundingAllocations.map((a) => a.id)
        if (allocationIds.length > 0) {
          // Firestore has a limit of 10 items in 'in' queries, so we'll need to handle this
          const transactionsSnapshot = await getDocs(
            query(
              collection(db, "fundingTransactions"),
              where("allocationId", "in", allocationIds.slice(0, 10)),
              orderBy("createdAt", "desc"),
              limit(50)
            )
          )
          const trans = transactionsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as FundingTransaction[]
          setTransactions(trans)
        }
      } catch (error) {
        logger.error("Error loading transactions", error)
      } finally {
        setTransactionsLoading(false)
      }
    }

    loadTransactions()
  }, [fundingAllocations])

  if (fundingAllocationsLoading) {
    return <div className="p-6">Loading your budget...</div>
  }

  if (!fundingAllocations || fundingAllocations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Personal Budget</CardTitle>
          <CardDescription>You currently have no funding allocations.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Contact your PI or lab manager to request funding allocation.
          </p>
        </CardContent>
      </Card>
    )
  }

  const totalAllocated = fundingAllocations.reduce((sum, a) => sum + (a.allocatedAmount || 0), 0)
  const totalSpent = fundingAllocations.reduce((sum, a) => sum + a.currentSpent, 0)
  const totalCommitted = fundingAllocations.reduce((sum, a) => sum + a.currentCommitted, 0)
  const totalRemaining = fundingAllocations.reduce((sum, a) => sum + (a.remainingBudget || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">My Budget</h2>
        <p className="text-muted-foreground">View your funding allocations and spending history</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Allocated</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAllocated)}</div>
            <p className="text-xs text-muted-foreground">{fundingAllocations.length} allocations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spent</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
            <p className="text-xs text-muted-foreground">
              {totalAllocated > 0 ? ((totalSpent / totalAllocated) * 100).toFixed(1) : 0}% used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Committed</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCommitted)}</div>
            <p className="text-xs text-muted-foreground">Pending orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRemaining)}</div>
            <p className="text-xs text-muted-foreground">Available</p>
          </CardContent>
        </Card>
      </div>

      {/* Individual Allocations */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Funding Allocations</h3>
        {fundingAllocations.map((allocation) => {
          const percentUsed =
            ((allocation.currentSpent + allocation.currentCommitted) / (allocation.allocatedAmount || 1)) *
            100
          const warningLevel = getLowBalanceWarningLevel(percentUsed)

          return (
            <Card key={allocation.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{allocation.fundingAccountName}</CardTitle>
                    <CardDescription>
                      Allocated: {formatCurrency(allocation.allocatedAmount || 0, allocation.currency)}
                    </CardDescription>
                  </div>
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
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Budget Usage</span>
                    <span className="font-medium">{percentUsed.toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min(percentUsed, 100)} className="h-2" />
                </div>

                {/* Budget Breakdown */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Spent</p>
                    <p className="font-medium">
                      {formatCurrency(allocation.currentSpent, allocation.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Committed</p>
                    <p className="font-medium">
                      {formatCurrency(allocation.currentCommitted, allocation.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Remaining</p>
                    <p className="font-medium text-green-600">
                      {formatCurrency(allocation.remainingBudget || 0, allocation.currency)}
                    </p>
                  </div>
                </div>

                {/* Warning */}
                {warningLevel === "critical" && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 rounded">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-red-600">Critical Budget Alert</p>
                      <p className="text-red-700">
                        You have used over 90% of your allocated budget. Please consult with your PI
                        before placing additional orders.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your latest funding transactions</CardDescription>
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
                  </tr>
                ))}
              </tbody>
            </table>
            {transactions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No transactions yet</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
