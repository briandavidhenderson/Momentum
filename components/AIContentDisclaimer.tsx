"use client"

import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Sparkles, Check, Info } from "lucide-react"
import { getFirebaseDb } from "@/lib/firebase"
import { collection, addDoc } from "firebase/firestore"
import { AIGeneratedContent } from "@/lib/types"
import { useAuth } from "@/lib/hooks/useAuth"
import { logger } from "@/lib/logger"

interface AIContentDisclaimerProps {
  entityType: "eln_report" | "experiment_summary" | "task_suggestion" | "protocol_extraction"
  entityId: string
  modelName: string
  promptHash: string
  generatedContent: string
  onAccept?: () => void
}

export function AIContentDisclaimer({
  entityType,
  entityId,
  modelName,
  promptHash,
  generatedContent,
  onAccept,
}: AIContentDisclaimerProps) {
  const { currentUser } = useAuth()
  const [accepted, setAccepted] = useState(false)
  const [edited, setEdited] = useState(false)

  const recordAIGeneration = async (approved: boolean) => {
    const db = getFirebaseDb()
    const now = new Date().toISOString()
    const aiRecord: Omit<AIGeneratedContent, "id"> = {
      entityType,
      entityId,
      modelName,
      promptHash,
      generatedAt: now,
      generatedBy: currentUser?.uid || "anonymous",
      disclaimerShown: true,
      userEdited: edited,
      userApproved: approved,
      userOverrideAllowed: true,
      createdAt: now,
    }

    try {
      await addDoc(collection(db, "aiGeneratedContent"), aiRecord)
    } catch (error) {
      logger.error("Error recording AI generation", error)
    }
  }

  const handleAccept = async () => {
    const db = getFirebaseDb()
    setAccepted(true)
    await recordAIGeneration(true)
    onAccept?.()
  }

  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <Alert className="border-purple-300 bg-purple-50">
        <Sparkles className="h-5 w-5 text-purple-600" />
        <AlertDescription className="ml-2">
          <div className="space-y-2">
            <p className="font-medium text-purple-900">AI-Generated Content</p>
            <p className="text-sm text-purple-800">
              This content was generated using artificial intelligence ({modelName}). In compliance with
              the EU AI Act, we inform you that AI-generated content may contain inaccuracies or biases.
              Please review and verify this content before use in scientific or regulatory contexts.
            </p>
            <div className="flex items-start gap-2 mt-3 p-3 bg-white rounded border border-purple-200">
              <Info className="h-4 w-4 text-purple-600 mt-0.5" />
              <div className="text-xs text-gray-700">
                <p className="font-medium">Required Actions:</p>
                <ul className="list-disc ml-4 mt-1 space-y-1">
                  <li>Review the generated content for accuracy</li>
                  <li>Verify any scientific claims or data</li>
                  <li>Edit as needed to ensure correctness</li>
                  <li>Accept to confirm you have reviewed this content</li>
                </ul>
              </div>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Generated Content */}
      <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50/30">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-900">AI-Generated Content</span>
        </div>
        <div
          className="prose prose-sm max-w-none bg-white p-4 rounded"
          contentEditable
          suppressContentEditableWarning
          onInput={() => setEdited(true)}
          dangerouslySetInnerHTML={{ __html: generatedContent }}
        />
      </div>

      {/* Accept Button */}
      {!accepted ? (
        <Button onClick={handleAccept} className="w-full">
          <Check className="h-4 w-4 mr-2" />
          I have reviewed and accept this AI-generated content
        </Button>
      ) : (
        <Alert className="border-green-300 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="ml-2 text-green-800">
            Content accepted. {edited && "Your edits have been recorded."}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
