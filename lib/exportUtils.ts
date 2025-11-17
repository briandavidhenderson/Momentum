/**
 * Data Export Utilities
 * Functions for exporting data to CSV, JSON, and other formats
 */

import type { Project, Task, PersonProfile, Order, InventoryItem, CalendarEvent } from "./types"
import { format } from "date-fns"

// ============================================================================
// CSV EXPORT
// ============================================================================

/**
 * Convert an array of objects to CSV string
 */
function arrayToCSV<T extends Record<string, any>>(
  data: T[],
  columns: { key: keyof T; label: string }[]
): string {
  if (data.length === 0) return ""

  // Header row
  const headers = columns.map((col) => col.label).join(",")

  // Data rows
  const rows = data.map((item) =>
    columns
      .map((col) => {
        const value = item[col.key] as any
        // Handle different types
        if (value === null || value === undefined) return ""
        if (value instanceof Date) return format(value, "yyyy-MM-dd")
        if (typeof value === "string" && !isNaN(Date.parse(value))) {
          // Handle date strings
          const date = new Date(value)
          return format(date, "yyyy-MM-dd")
        }
        if (Array.isArray(value)) return `"${value.join("; ")}"`
        if (typeof value === "object") return `"${JSON.stringify(value)}"`
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = String(value)
        if (stringValue.includes(",") || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      })
      .join(",")
  )

  return [headers, ...rows].join("\n")
}

/**
 * Download a string as a file
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ============================================================================
// PROJECT EXPORTS
// ============================================================================

/**
 * Export projects to CSV
 */
export function exportProjectsToCSV(projects: Project[]) {
  const columns = [
    { key: "name" as const, label: "Project Name" },
    { key: "startDate" as const, label: "Start Date" },
    { key: "endDate" as const, label: "End Date" },
    { key: "progress" as const, label: "Progress (%)" },
    { key: "status" as const, label: "Status" },
    { key: "health" as const, label: "Health" },
    { key: "totalBudget" as const, label: "Budget" },
    { key: "notes" as const, label: "Notes" },
  ]

  const csv = arrayToCSV(projects, columns)
  const filename = `projects_export_${format(new Date(), "yyyy-MM-dd")}.csv`
  downloadFile(csv, filename, "text/csv")
}

/**
 * Export projects to JSON
 */
export function exportProjectsToJSON(projects: Project[]) {
  const json = JSON.stringify(projects, null, 2)
  const filename = `projects_export_${format(new Date(), "yyyy-MM-dd")}.json`
  downloadFile(json, filename, "application/json")
}

// ============================================================================
// TASK EXPORTS
// ============================================================================

/**
 * Export tasks to CSV
 */
export function exportTasksToCSV(tasks: Task[]) {
  const columns = [
    { key: "name" as const, label: "Task Name" },
    { key: "start" as const, label: "Start Date" },
    { key: "end" as const, label: "End Date" },
    { key: "progress" as const, label: "Progress (%)" },
    { key: "importance" as const, label: "Importance" },
    { key: "status" as const, label: "Status" },
    { key: "type" as const, label: "Type" },
    { key: "primaryOwner" as const, label: "Owner ID" },
    { key: "notes" as const, label: "Notes" },
  ]

  const csv = arrayToCSV(tasks, columns)
  const filename = `tasks_export_${format(new Date(), "yyyy-MM-dd")}.csv`
  downloadFile(csv, filename, "text/csv")
}

// ============================================================================
// PEOPLE EXPORTS
// ============================================================================

/**
 * Export person profiles to CSV
 */
export function exportPeopleToCSV(profiles: PersonProfile[]) {
  const columns = [
    { key: "firstName" as const, label: "First Name" },
    { key: "lastName" as const, label: "Last Name" },
    { key: "email" as const, label: "Email" },
    { key: "position" as const, label: "Position" },
    { key: "organisation" as const, label: "Organisation" },
    { key: "institute" as const, label: "Institute" },
    { key: "lab" as const, label: "Lab" },
    { key: "phone" as const, label: "Phone" },
    { key: "officeLocation" as const, label: "Office" },
    { key: "researchInterests" as const, label: "Research Interests" },
    { key: "qualifications" as const, label: "Qualifications" },
  ]

  const csv = arrayToCSV(profiles, columns)
  const filename = `people_export_${format(new Date(), "yyyy-MM-dd")}.csv`
  downloadFile(csv, filename, "text/csv")
}

// ============================================================================
// INVENTORY EXPORTS
// ============================================================================

/**
 * Export inventory to CSV
 */
export function exportInventoryToCSV(inventory: InventoryItem[]) {
  const columns = [
    { key: "productName" as const, label: "Product Name" },
    { key: "catNum" as const, label: "Catalog Number" },
    { key: "inventoryLevel" as const, label: "Stock Level" },
    { key: "currentQuantity" as const, label: "Current Quantity" },
    { key: "minQuantity" as const, label: "Min Quantity" },
    { key: "burnRatePerWeek" as const, label: "Burn Rate/Week" },
    { key: "priceExVAT" as const, label: "Price (ex VAT)" },
    { key: "category" as const, label: "Category" },
    { key: "subcategory" as const, label: "Subcategory" },
    { key: "receivedDate" as const, label: "Received Date" },
    { key: "notes" as const, label: "Notes" },
  ]

  const csv = arrayToCSV(inventory, columns)
  const filename = `inventory_export_${format(new Date(), "yyyy-MM-dd")}.csv`
  downloadFile(csv, filename, "text/csv")
}

/**
 * Export orders to CSV
 */
export function exportOrdersToCSV(orders: Order[]) {
  const columns = [
    { key: "productName" as const, label: "Product Name" },
    { key: "catNum" as const, label: "Catalog Number" },
    { key: "status" as const, label: "Status" },
    { key: "priceExVAT" as const, label: "Price (ex VAT)" },
    { key: "orderedBy" as const, label: "Ordered By" },
    { key: "orderedDate" as const, label: "Ordered Date" },
    { key: "receivedDate" as const, label: "Received Date" },
    { key: "chargeToAccount" as const, label: "Account" },
    { key: "category" as const, label: "Category" },
    { key: "subcategory" as const, label: "Subcategory" },
  ]

  const csv = arrayToCSV(orders, columns)
  const filename = `orders_export_${format(new Date(), "yyyy-MM-dd")}.csv`
  downloadFile(csv, filename, "text/csv")
}

// ============================================================================
// CALENDAR EXPORTS
// ============================================================================

/**
 * Export calendar events to CSV
 */
export function exportEventsToCSV(events: CalendarEvent[]) {
  const columns = [
    { key: "title" as const, label: "Title" },
    { key: "start" as const, label: "Start" },
    { key: "end" as const, label: "End" },
    { key: "type" as const, label: "Type" },
    { key: "location" as const, label: "Location" },
    { key: "visibility" as const, label: "Visibility" },
    { key: "description" as const, label: "Description" },
  ]

  const csv = arrayToCSV(events, columns)
  const filename = `events_export_${format(new Date(), "yyyy-MM-dd")}.csv`
  downloadFile(csv, filename, "text/csv")
}

// ============================================================================
// FULL DATA BACKUP
// ============================================================================

/**
 * Export all data as a JSON backup
 */
export function exportFullBackup(data: {
  projects: Project[]
  profiles: PersonProfile[]
  events: CalendarEvent[]
  orders: Order[]
  inventory: InventoryItem[]
  [key: string]: any
}) {
  const backup = {
    exportDate: new Date().toISOString(),
    version: "1.0",
    data,
  }

  const json = JSON.stringify(backup, null, 2)
  const filename = `momentum_backup_${format(new Date(), "yyyy-MM-dd_HH-mm")}.json`
  downloadFile(json, filename, "application/json")
}

// ============================================================================
// CSV IMPORT (PARSING)
// ============================================================================

/**
 * Parse CSV string to array of objects
 * Simple parser - doesn't handle all edge cases
 */
export function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.split("\n").filter((line) => line.trim())
  if (lines.length === 0) return []

  const headers = lines[0].split(",").map((h) => h.trim())
  const data: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ""
    })
    data.push(row)
  }

  return data
}

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })
}
