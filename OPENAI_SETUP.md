# OpenAI Integration Setup Guide

This guide explains how to securely integrate OpenAI API with Momentum Lab Management System.

## Security Best Practices

**⚠️ CRITICAL: Never hardcode API keys in your codebase!**

- API keys should **NEVER** be in frontend code
- API keys should **NEVER** be committed to Git
- API keys should **ONLY** be stored as server-side environment variables

## Prerequisites

1. **OpenAI API Account**
   - Sign up at https://platform.openai.com
   - Navigate to API Keys section
   - Create a new API key

2. **Firebase CLI**
   - Ensure you have Firebase CLI installed
   - Be authenticated to your Firebase project

## Setup Steps

### Step 1: Configure the API Key (Server-Side)

The API key must be set as a Firebase Functions environment variable:

```bash
# Set the OpenAI API key
firebase functions:config:set openai.api_key="sk-proj-YOUR_ACTUAL_API_KEY_HERE"

# Verify it was set correctly
firebase functions:config:get
```

**Replace** `sk-proj-YOUR_ACTUAL_API_KEY_HERE` with your actual OpenAI API key.

### Step 2: Deploy Cloud Functions

Deploy the updated Cloud Functions with OpenAI integration:

```bash
# Build and deploy functions
npm run deploy:functions

# Or deploy all Firebase services
npm run deploy:all
```

### Step 3: Verify Integration

Check Firebase Console → Functions to ensure these functions deployed successfully:
- `generateExperimentSuggestions`
- `generateProjectDescription`
- `suggestMaintenanceSchedule`

## Available AI Features

### 1. Experiment Suggestions (ELN)

Generates AI-powered suggestions for documenting experiments in the Electronic Lab Notebook.

**Usage from frontend:**
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions'

const functions = getFunctions()
const generateSuggestions = httpsCallable(functions, 'generateExperimentSuggestions')

const result = await generateSuggestions({
  experimentTitle: "Cell Culture Growth Analysis",
  experimentType: "Biology",
  previousNotes: "Previous experiment showed 80% cell viability"
})

console.log(result.data.suggestion)
```

**Returns:**
- Key observations to document
- Important parameters to measure
- Safety considerations
- Data to collect

### 2. Project Description Generator

Creates professional project descriptions suitable for grant applications.

**Usage:**
```typescript
const generateDescription = httpsCallable(functions, 'generateProjectDescription')

const result = await generateDescription({
  projectName: "Novel Cancer Treatment Research",
  objectives: "Develop new immunotherapy approach",
  workpackages: ["Literature Review", "Lab Experiments", "Clinical Trials"]
})

console.log(result.data.description)
```

### 3. Equipment Maintenance Suggestions

Provides intelligent maintenance recommendations based on equipment usage patterns.

**Usage:**
```typescript
const suggestMaintenance = httpsCallable(functions, 'suggestMaintenanceSchedule')

const result = await suggestMaintenance({
  equipmentName: "PCR Thermocycler",
  equipmentType: "Molecular Biology",
  usageHistory: "Used daily, heavy workload",
  lastMaintenance: "2024-01-15"
})

console.log(result.data.suggestions)
```

## Cost Management

### Model Selection

We use **GPT-4o-mini** for cost efficiency:
- ~15x cheaper than GPT-4
- Suitable for most lab management tasks
- Excellent for structured text generation

### Pricing (as of 2024)
- **GPT-4o-mini**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- Typical experiment suggestion: ~200 tokens = $0.0002 per request

### Usage Tracking

All AI requests are logged in the `auditTrails` collection:
```typescript
{
  userId: "user-id",
  action: "ai_experiment_suggestion",
  timestamp: "2024-11-16T10:30:00Z",
  metadata: {
    experimentTitle: "...",
    tokensUsed: 185
  }
}
```

### Cost Controls

To prevent unexpected charges:

1. **Set OpenAI Usage Limits**
   - Go to https://platform.openai.com/account/billing/limits
   - Set monthly budget limits
   - Enable email notifications at 75% and 90% usage

2. **Monitor Usage**
   - Check OpenAI dashboard regularly
   - Review audit trails in Firestore

3. **Implement Rate Limiting** (Optional)
   - Add rate limits in Cloud Functions
   - Example: Max 50 requests per user per day

## Environment Variables Reference

### Current Configuration

```bash
# OpenAI
firebase functions:config:set openai.api_key="YOUR_KEY"

# ORCID (already configured)
firebase functions:config:set orcid.client_id="YOUR_ORCID_CLIENT_ID"
firebase functions:config:set orcid.client_secret="YOUR_ORCID_CLIENT_SECRET"
firebase functions:config:set orcid.use_sandbox="true"
```

### View All Config

```bash
firebase functions:config:get
```

Expected output:
```json
{
  "openai": {
    "api_key": "sk-proj-..."
  },
  "orcid": {
    "client_id": "APP-...",
    "client_secret": "...",
    "use_sandbox": "true"
  }
}
```

## Troubleshooting

### Error: "OpenAI API key not configured"

**Solution:** Set the API key via Firebase CLI:
```bash
firebase functions:config:set openai.api_key="YOUR_KEY"
npm run deploy:functions
```

### Error: "Failed to generate suggestions"

**Possible causes:**
1. Invalid API key
2. Exceeded OpenAI rate limits
3. Insufficient OpenAI credits

**Check:**
- OpenAI dashboard for API status
- Firebase Functions logs: `firebase functions:log`

### Functions not deploying

```bash
# Check for TypeScript errors
cd firebase/functions
npm run build

# Deploy with verbose logging
firebase deploy --only functions --debug
```

## Security Checklist

- [ ] API key is set via `firebase functions:config:set`
- [ ] API key is NOT in any code files
- [ ] API key is NOT in environment variables files (`.env`)
- [ ] `.env` files are in `.gitignore`
- [ ] OpenAI usage limits are configured
- [ ] Monthly budget alerts are enabled
- [ ] Functions are deployed and accessible

## Local Development

For local testing with Firebase emulators:

1. **Download config to `.runtimeconfig.json`:**
```bash
cd firebase/functions
firebase functions:config:get > .runtimeconfig.json
```

2. **Start emulators:**
```bash
firebase emulators:start
```

3. **Important:** Add `.runtimeconfig.json` to `.gitignore`!

## Production Deployment

```bash
# 1. Set API key (one-time)
firebase functions:config:set openai.api_key="YOUR_PRODUCTION_KEY"

# 2. Deploy functions
npm run deploy:functions

# 3. Verify deployment
firebase functions:log --limit 10
```

## Quick Setup Command

**To configure your OpenAI API key:**
```bash
# Replace YOUR_OPENAI_API_KEY with your actual key from platform.openai.com
firebase functions:config:set openai.api_key="YOUR_OPENAI_API_KEY"

npm run deploy:functions
```

**Note:** Your actual API key has been provided separately and should be kept secure. Never commit API keys to version control!

## Support

For issues with:
- **OpenAI API**: https://help.openai.com
- **Firebase Functions**: https://firebase.google.com/support
- **Momentum Integration**: See project documentation

---

**Remember:** Keep your API keys secure and never commit them to version control!
