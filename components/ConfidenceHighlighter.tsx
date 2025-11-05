"use client"

import React from "react"
import { AlertCircle, CheckCircle, Info } from "lucide-react"

interface ConfidenceHighlighterProps {
  text: string
  confidence: number
  editable?: boolean
  onEdit?: (newText: string) => void
  showBadge?: boolean
}

/**
 * Confidence Highlighter Component
 * Displays text with color-coded confidence highlighting
 * Allows inline editing for low-confidence text
 */
export function ConfidenceHighlighter({
  text,
  confidence,
  editable = false,
  onEdit,
  showBadge = true,
}: ConfidenceHighlighterProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editedText, setEditedText] = React.useState(text)

  // Get confidence level and colors
  const getConfidenceLevel = (score: number) => {
    if (score >= 85) return "high"
    if (score >= 70) return "medium"
    return "low"
  }

  const level = getConfidenceLevel(confidence)

  const colors = {
    high: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-800",
      badge: "bg-green-100 text-green-800",
      icon: CheckCircle,
    },
    medium: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-800",
      badge: "bg-yellow-100 text-yellow-800",
      icon: Info,
    },
    low: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      badge: "bg-red-100 text-red-800",
      icon: AlertCircle,
    },
  }

  const { bg, border, text: textColor, badge, icon: Icon } = colors[level]

  const handleSave = () => {
    if (onEdit && editedText !== text) {
      onEdit(editedText)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedText(text)
    setIsEditing(false)
  }

  return (
    <div className={`relative rounded p-3 border ${bg} ${border}`}>
      {/* Confidence Badge */}
      {showBadge && (
        <div className="flex items-center gap-2 mb-2">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${badge}`}>
            <Icon className="h-3 w-3" />
            {confidence}% confidence
          </span>
          {level === "low" && editable && (
            <span className="text-xs text-red-600">
              Please review and correct if needed
            </span>
          )}
        </div>
      )}

      {/* Text Content */}
      {!isEditing ? (
        <div className={`${textColor}`}>
          {text}
          {editable && level !== "high" && (
            <button
              onClick={() => setIsEditing(true)}
              className="ml-2 text-xs underline hover:no-underline"
            >
              Edit
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
            rows={3}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-brand-500 text-white rounded text-sm hover:bg-brand-600"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface ProtocolStepWithConfidenceProps {
  step: {
    stepNumber: number
    action?: string
    instruction?: string
    duration?: string
    temperature?: string
    notes?: string
    checkpoints?: string[]
    confidence?: number
  }
  overallConfidence: number
  onEditInstruction?: (stepNumber: number, newText: string) => void
}

/**
 * Protocol Step with Confidence Display
 * Shows a protocol step with confidence highlighting
 */
export function ProtocolStepWithConfidence({
  step,
  overallConfidence,
  onEditInstruction,
}: ProtocolStepWithConfidenceProps) {
  const stepConfidence = step.confidence || overallConfidence
  const instructionText = step.instruction || step.action || ''

  return (
    <div className="space-y-3">
      {/* Step Number & Instruction */}
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center font-semibold text-sm">
          {step.stepNumber}
        </div>
        <div className="flex-1">
          <ConfidenceHighlighter
            text={instructionText}
            confidence={stepConfidence}
            editable={stepConfidence < 85}
            onEdit={(newText) => onEditInstruction?.(step.stepNumber, newText)}
            showBadge={stepConfidence < 85}
          />
        </div>
      </div>

      {/* Step Details */}
      <div className="ml-11 space-y-2 text-sm text-gray-600">
        {step.duration && (
          <div className="flex gap-2">
            <span className="font-medium">Duration:</span>
            <span>{step.duration}</span>
          </div>
        )}
        {step.temperature && (
          <div className="flex gap-2">
            <span className="font-medium">Temperature:</span>
            <span>{step.temperature}</span>
          </div>
        )}
        {step.notes && (
          <div className="flex gap-2">
            <span className="font-medium">Notes:</span>
            <span className="italic">{step.notes}</span>
          </div>
        )}
        {step.checkpoints && step.checkpoints.length > 0 && (
          <div>
            <span className="font-medium">Checkpoints:</span>
            <ul className="list-disc list-inside ml-2 mt-1">
              {step.checkpoints.map((checkpoint, idx) => (
                <li key={idx}>{checkpoint}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

interface MaterialWithConfidenceProps {
  material: {
    name: string
    catalogNumber?: string
    supplier?: string
    quantity?: string
    notes?: string
    confidence?: number
  }
  overallConfidence: number
}

/**
 * Material Item with Confidence Display
 */
export function MaterialWithConfidence({
  material,
  overallConfidence,
}: MaterialWithConfidenceProps) {
  const confidence = material.confidence || overallConfidence

  return (
    <div className="space-y-2">
      <ConfidenceHighlighter
        text={material.name}
        confidence={confidence}
        showBadge={confidence < 85}
      />
      {(material.catalogNumber || material.supplier || material.quantity) && (
        <div className="ml-3 space-y-1 text-sm text-gray-600">
          {material.catalogNumber && (
            <div>
              <span className="font-medium">Catalog #:</span> {material.catalogNumber}
            </div>
          )}
          {material.supplier && (
            <div>
              <span className="font-medium">Supplier:</span> {material.supplier}
            </div>
          )}
          {material.quantity && (
            <div>
              <span className="font-medium">Quantity:</span> {material.quantity}
            </div>
          )}
          {material.notes && (
            <div className="italic text-gray-500">{material.notes}</div>
          )}
        </div>
      )}
    </div>
  )
}

interface ConfidenceScoreCardProps {
  score: number
  label?: string
  showDetails?: boolean
}

/**
 * Confidence Score Card
 * Displays overall confidence score with visual indicator
 */
export function ConfidenceScoreCard({
  score,
  label = "Overall Confidence",
  showDetails = true,
}: ConfidenceScoreCardProps) {
  const getLevel = (s: number) => {
    if (s >= 85) return { level: "High", color: "text-green-600", bg: "bg-green-100" }
    if (s >= 70) return { level: "Medium", color: "text-yellow-600", bg: "bg-yellow-100" }
    return { level: "Low", color: "text-red-600", bg: "bg-red-100" }
  }

  const { level, color, bg } = getLevel(score)

  return (
    <div className={`rounded-lg p-4 ${bg}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className={`text-2xl font-bold ${color}`}>{score}%</span>
      </div>
      {showDetails && (
        <div className="mt-2 text-xs text-gray-600">
          <span className={`font-semibold ${color}`}>{level} Confidence</span>
          {level === "Low" && (
            <span> - Please review all highlighted sections carefully</span>
          )}
          {level === "Medium" && (
            <span> - Review yellow-highlighted sections</span>
          )}
          {level === "High" && <span> - Ready to use</span>}
        </div>
      )}
    </div>
  )
}
