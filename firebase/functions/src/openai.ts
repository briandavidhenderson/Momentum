import * as functions from "firebase-functions/v1"
import * as admin from "firebase-admin"
import { defineSecret } from "firebase-functions/params"

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY")

function getOpenAiKey() {
  const key = OPENAI_API_KEY.value()
  if (!key) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "OPENAI_API_KEY param is not configured"
    )
  }
  return key
}

/**
 * OpenAI Integration for Momentum
 *
 * SECURITY NOTE: API keys should NEVER be exposed in frontend code.
 * They must be stored as Firebase Functions environment variables.
 *
 * To set the OpenAI API key:
 * firebase functions:config:set openai.api_key="your-api-key-here"
 *
 * To deploy:
 * npm run deploy:functions
 */

/**
 * Generate AI-powered experiment notes suggestions for ELN
 */
export const generateExperimentSuggestions = functions
  .runWith({ secrets: [OPENAI_API_KEY] })
  .https.onCall(
  async (data, context) => {
    // Ensure user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to use AI features"
      )
    }

    const { experimentTitle, experimentType, previousNotes } = data

    if (!experimentTitle) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Experiment title is required"
      )
    }

    try {
      // Get API key from environment config
      const apiKey = getOpenAiKey()

      // Call OpenAI API
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini", // Using efficient model for cost savings
          messages: [
            {
              role: "system",
              content: "You are a helpful scientific research assistant that helps researchers document their experiments in electronic lab notebooks. Provide structured, concise suggestions for experiment notes.",
            },
            {
              role: "user",
              content: `Help me create notes for this experiment:
Title: ${experimentTitle}
Type: ${experimentType || "General"}
${previousNotes ? `Previous notes context: ${previousNotes}` : ""}

Please suggest:
1. Key observations to document
2. Important parameters to measure
3. Safety considerations
4. Data to collect`,
            },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`OpenAI API error: ${error.error?.message || "Unknown error"}`)
      }

      const result = await response.json()
      const suggestion = result.choices[0]?.message?.content

      // Log AI usage for audit trail
      await admin.firestore().collection("auditTrails").add({
        userId: context.auth.uid,
        action: "ai_experiment_suggestion",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          experimentTitle,
          experimentType,
          tokensUsed: result.usage?.total_tokens || 0,
        },
      })

      return {
        success: true,
        suggestion,
        tokensUsed: result.usage?.total_tokens || 0,
      }
    } catch (error: any) {
      console.error("Error generating AI suggestions:", error)
      throw new functions.https.HttpsError(
        "internal",
        `Failed to generate suggestions: ${error.message}`
      )
    }
  }
)

/**
 * Generate project description from project details
 */
export const generateProjectDescription = functions
  .runWith({ secrets: [OPENAI_API_KEY] })
  .https.onCall(
  async (data, context) => {
    // Ensure user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to use AI features"
      )
    }

    const { projectName, workpackages, objectives } = data

    if (!projectName) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Project name is required"
      )
    }

    try {
      const apiKey = getOpenAiKey()

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a research grant writing assistant. Help researchers create clear, professional project descriptions.",
            },
            {
              role: "user",
              content: `Create a professional project description for:
Project: ${projectName}
${objectives ? `Objectives: ${objectives}` : ""}
${workpackages ? `Workpackages: ${JSON.stringify(workpackages)}` : ""}

Write a concise 2-3 paragraph project description suitable for a grant application.`,
            },
          ],
          max_tokens: 400,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`OpenAI API error: ${error.error?.message || "Unknown error"}`)
      }

      const result = await response.json()
      const description = result.choices[0]?.message?.content

      // Log AI usage
      await admin.firestore().collection("auditTrails").add({
        userId: context.auth.uid,
        action: "ai_project_description",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          projectName,
          tokensUsed: result.usage?.total_tokens || 0,
        },
      })

      return {
        success: true,
        description,
        tokensUsed: result.usage?.total_tokens || 0,
      }
    } catch (error: any) {
      console.error("Error generating project description:", error)
      throw new functions.https.HttpsError(
        "internal",
        `Failed to generate description: ${error.message}`
      )
    }
  }
)

/**
 * Smart equipment maintenance suggestions based on usage patterns
 */
export const suggestMaintenanceSchedule = functions
  .runWith({ secrets: [OPENAI_API_KEY] })
  .https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      )
    }

    const { equipmentName, equipmentType, usageHistory, lastMaintenance } = data

    try {
      const apiKey = getOpenAiKey()

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a laboratory equipment maintenance expert. Provide practical maintenance recommendations.",
            },
            {
              role: "user",
              content: `Suggest a maintenance schedule for:
Equipment: ${equipmentName}
Type: ${equipmentType}
${lastMaintenance ? `Last maintenance: ${lastMaintenance}` : ""}
${usageHistory ? `Usage pattern: ${usageHistory}` : ""}

Provide:
1. Recommended maintenance interval
2. Key maintenance tasks
3. Warning signs to watch for`,
            },
          ],
          max_tokens: 300,
          temperature: 0.6,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`OpenAI API error: ${error.error?.message || "Unknown error"}`)
      }

      const result = await response.json()
      const suggestions = result.choices[0]?.message?.content

      return {
        success: true,
        suggestions,
        tokensUsed: result.usage?.total_tokens || 0,
      }
    } catch (error: any) {
      console.error("Error generating maintenance suggestions:", error)
      throw new functions.https.HttpsError(
        "internal",
        `Failed to generate suggestions: ${error.message}`
      )
    }
  }
)
