import * as functions from "firebase-functions/v1"
import * as admin from "firebase-admin"
import { defineSecret } from "firebase-functions/params"
import { GoogleGenerativeAI } from "@google/generative-ai"

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY")

function getGeminiClient() {
    const key = GEMINI_API_KEY.value()
    if (!key) {
        throw new functions.https.HttpsError(
            "failed-precondition",
            "GEMINI_API_KEY param is not configured"
        )
    }
    return new GoogleGenerativeAI(key)
}

/**
 * Generic helper to call Gemini API
 */
export async function callGemini(prompt: string, modelName: string = "gemini-2.0-flash"): Promise<string> {
    const genAI = getGeminiClient()
    const model = genAI.getGenerativeModel({ model: modelName })

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    if (!text) {
        throw new Error("Gemini response missing content")
    }

    return text
}

/**
 * Helper to parse JSON from LLM response (handles markdown code blocks)
 */
export function parseJsonFromString(raw: string) {
    const trimmed = raw.trim()
    // Remove markdown code blocks if present
    const clean = trimmed.replace(/^```json\s*|\s*```$/g, "")

    if (clean.startsWith("{")) {
        return JSON.parse(clean)
    }

    const match = clean.match(/\{[\s\S]*\}/)
    if (match) {
        return JSON.parse(match[0])
    }

    throw new Error("LLM response did not contain JSON")
}

/**
 * Call Gemini and expect a JSON response
 */
export async function callGeminiJSON(prompt: string, modelName: string = "gemini-2.0-flash"): Promise<any> {
    const genAI = getGeminiClient()
    const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
            responseMimeType: "application/json"
        }
    })

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    if (!text) {
        throw new Error("Gemini response missing content")
    }

    return parseJsonFromString(text)
}

/**
 * Generate AI-powered experiment notes suggestions for ELN
 */
export const generateExperimentSuggestions = functions
    .runWith({ secrets: [GEMINI_API_KEY] })
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
                const prompt = `You are a helpful scientific research assistant that helps researchers document their experiments in electronic lab notebooks. Provide structured, concise suggestions for experiment notes.

Help me create notes for this experiment:
Title: ${experimentTitle}
Type: ${experimentType || "General"}
${previousNotes ? `Previous notes context: ${previousNotes}` : ""}

Please suggest:
1. Key observations to document
2. Important parameters to measure
3. Safety considerations
4. Data to collect`

                const suggestion = await callGemini(prompt)

                // Log AI usage for audit trail
                await admin.firestore().collection("auditTrails").add({
                    userId: context.auth.uid,
                    action: "ai_experiment_suggestion",
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    metadata: {
                        experimentTitle,
                        experimentType,
                        provider: "gemini",
                    },
                })

                return {
                    success: true,
                    suggestion,
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
    .runWith({ secrets: [GEMINI_API_KEY] })
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
                const prompt = `You are a research grant writing assistant. Help researchers create clear, professional project descriptions.

Create a professional project description for:
Project: ${projectName}
${objectives ? `Objectives: ${objectives}` : ""}
${workpackages ? `Workpackages: ${JSON.stringify(workpackages)}` : ""}

Write a concise 2-3 paragraph project description suitable for a grant application.`

                const description = await callGemini(prompt)

                // Log AI usage
                await admin.firestore().collection("auditTrails").add({
                    userId: context.auth.uid,
                    action: "ai_project_description",
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    metadata: {
                        projectName,
                        provider: "gemini",
                    },
                })

                return {
                    success: true,
                    description,
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
    .runWith({ secrets: [GEMINI_API_KEY] })
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
                const prompt = `You are a laboratory equipment maintenance expert. Provide practical maintenance recommendations.

Suggest a maintenance schedule for:
Equipment: ${equipmentName}
Type: ${equipmentType}
${lastMaintenance ? `Last maintenance: ${lastMaintenance}` : ""}
${usageHistory ? `Usage pattern: ${usageHistory}` : ""}

Provide:
1. Recommended maintenance interval
2. Key maintenance tasks
3. Warning signs to watch for`

                const suggestions = await callGemini(prompt)

                return {
                    success: true,
                    suggestions,
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
