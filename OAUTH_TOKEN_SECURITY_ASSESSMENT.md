# OAuth Token Security Assessment & Migration Plan

## Executive Summary

This document assesses the current OAuth token storage implementation for calendar integrations and provides a comprehensive migration plan to Google Secret Manager. While current implementation blocks client access to tokens, storing refresh tokens in Firestore poses security risks that must be addressed before implementing two-way calendar sync (Phase 2).

**Current Risk Level**: 🟡 **MEDIUM**
**Priority**: 🔴 **HIGH** (Must complete before Phase 2)

---

## 1. Current Implementation Analysis

### 1.1 Token Storage Architecture

**Location**: Firestore collection `_calendarTokens`

**Document Structure** (inferred from code):
```typescript
{
  connectionId: string          // Document ID
  accessToken: string           // Short-lived token (1 hour)
  refreshToken: string          // Long-lived token (no expiry)
  expiresAt: number            // Access token expiration timestamp
  provider: 'google' | 'microsoft'
  updatedAt: string            // Last token refresh
}
```

**Access Pattern**:
- ✅ **Client Access**: Blocked via Firestore rules
- ✅ **Server Access**: Cloud Functions only
- ❌ **Encryption**: None (Firestore encryption-at-rest only)
- ❌ **Audit Logging**: None
- ❌ **Rotation**: Only OAuth refresh, no forced rotation

### 1.2 Security Rules Audit

**File**: `firestore.rules:712-715`

```javascript
match /_calendarTokens/{tokenId} {
  // No client access - all operations blocked
  allow read, write: if false;
}
```

**Analysis**:
- ✅ **Properly secured** - No client code can access tokens
- ✅ **Comment clarity** - Explicitly states purpose
- ⚠️ **Server-only access** - Relies on Cloud Functions for all operations

### 1.3 Token Usage in Cloud Functions

**File**: `firebase/functions/src/calendar-sync.ts`

**Google Calendar Token Flow** (lines 161-186):
```typescript
export async function getAccessToken(connectionId: string): Promise<string> {
  const tokenDoc = await admin
    .firestore()
    .collection("_calendarTokens")
    .doc(connectionId)
    .get()

  if (!tokenDoc.exists) {
    throw new Error("Token not found")
  }

  const tokenData = tokenDoc.data()!
  const now = Date.now()

  // Check if token is expired
  if (tokenData.expiresAt && tokenData.expiresAt < now) {
    // Token expired, need to refresh
    const newTokens = await refreshGoogleToken(
      tokenData.refreshToken,
      connectionId
    )
    return newTokens.accessToken
  }

  return tokenData.accessToken
}
```

**Token Refresh Flow** (lines 191-234):
```typescript
async function refreshGoogleToken(
  refreshToken: string,
  connectionId: string
): Promise<{ accessToken: string; expiresAt: number }> {
  const config = {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    tokenUrl: "https://oauth2.googleapis.com/token",
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })

  // ... error handling omitted ...

  // Update stored tokens
  await admin
    .firestore()
    .collection("_calendarTokens")
    .doc(connectionId)
    .update({
      accessToken,
      expiresAt,
    })

  return { accessToken, expiresAt }
}
```

**Microsoft Calendar Token Flow** (lines 672-697):
- Similar pattern to Google
- Uses `getMicrosoftAccessToken()` and `refreshMicrosoftToken()`
- Same security concerns

---

## 2. Security Vulnerabilities

### 2.1 HIGH RISK: Unencrypted Refresh Tokens

**Issue**: Refresh tokens stored in plaintext in Firestore

**Impact**:
- If Firestore database is compromised, attacker gains persistent calendar access
- Refresh tokens have no expiration - work indefinitely until revoked
- Can be used to generate unlimited access tokens
- Allow read/write access to user's entire calendar

**Attack Scenarios**:
1. **Database Export**: If backup is leaked, tokens are exposed
2. **Insider Threat**: Firebase admins can access tokens
3. **Compromised Service Account**: If service account key leaks, tokens accessible
4. **Firestore SDK Vulnerability**: Zero-day could expose collections

**OWASP Reference**: [A02:2021 – Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)

### 2.2 MEDIUM RISK: No Audit Trail

**Issue**: No logging of token access or usage

**Impact**:
- Cannot detect unauthorized token access
- Cannot trace suspicious calendar operations
- No compliance trail for security audits
- Difficult to identify compromised connections

**Compliance Impact**:
- **GDPR Article 32**: Requires logging of data processing
- **SOC 2**: Requires access logging for sensitive credentials
- **HIPAA**: Requires audit trails (if health data in calendar)

### 2.3 MEDIUM RISK: No Token Rotation

**Issue**: Tokens persist indefinitely without forced rotation

**Impact**:
- Compromised tokens remain valid forever
- No mechanism to invalidate old tokens
- Cannot enforce security policy updates
- Difficult to recover from suspected breach

**Industry Best Practice**: Rotate credentials every 90 days (NIST SP 800-53)

### 2.4 LOW RISK: Client Secrets in Environment Variables

**Current Implementation**: ✅ Acceptable for MVP

```typescript
clientId: process.env.GOOGLE_CLIENT_ID || "",
clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
```

**Analysis**:
- ✅ Not hardcoded in source code
- ✅ Not accessible from client
- ⚠️ Environment variables visible to all Cloud Functions
- ⚠️ Logged in some deployment tools

**Recommendation**: Migrate to Secret Manager alongside tokens

### 2.5 LOW RISK: No Rate Limiting on Token Refresh

**Issue**: No rate limiting on `getAccessToken()` calls

**Impact**:
- Malicious code could exhaust token refresh quota
- Google/Microsoft may throttle or block application
- DoS vector for calendar sync service

**Mitigation**: Add rate limiting in token refresh functions

---

## 3. Migration Plan to Google Secret Manager

### 3.1 Architecture Overview

**Before** (Current):
```
Client → Cloud Function → Firestore (_calendarTokens) → External API
                ↓
          Plaintext Tokens
```

**After** (Secure):
```
Client → Cloud Function → Secret Manager (encrypted) → External API
                ↓
          Token Service
          (encryption + audit)
```

### 3.2 Secret Manager Benefits

✅ **Encryption**: Automatic encryption at rest and in transit
✅ **Access Control**: IAM-based with service account permissions
✅ **Versioning**: Automatic version tracking for token rotation
✅ **Audit Logging**: All access logged to Cloud Audit Logs
✅ **Replication**: Multi-region redundancy built-in
✅ **Integration**: Native Firebase/GCP integration

### 3.3 Implementation Steps

#### **Week 3 - Day 1-2: Setup Secret Manager**

**Step 1**: Enable Secret Manager API
```bash
gcloud services enable secretmanager.googleapis.com
```

**Step 2**: Create service account for token management
```bash
gcloud iam service-accounts create calendar-token-manager \
  --display-name="Calendar Token Manager" \
  --description="Manages OAuth tokens for calendar integrations"
```

**Step 3**: Grant Secret Manager permissions
```bash
# Allow Cloud Functions to read secrets
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:calendar-token-manager@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Allow token manager to create/update secrets
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:calendar-token-manager@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretVersionManager"
```

**Step 4**: Create secret for each connection (template)
```bash
# Format: calendar-token-{connectionId}
gcloud secrets create calendar-token-CONNECTION_ID \
  --replication-policy="automatic" \
  --labels="app=momentum,type=oauth,provider=google"
```

#### **Week 3 - Day 3-4: Implement Token Service**

**Step 5**: Create new token service Cloud Function

**File**: `firebase/functions/src/tokenService.ts`

```typescript
import * as admin from "firebase-admin"
import { SecretManagerServiceClient } from "@google-cloud/secret-manager"

const secretManager = new SecretManagerServiceClient()

interface TokenData {
  accessToken: string
  refreshToken: string
  expiresAt: number
  provider: 'google' | 'microsoft'
  connectionId: string
  userId: string
  createdAt: string
  lastRefreshedAt: string
}

/**
 * Store tokens securely in Secret Manager
 */
export async function storeTokens(
  connectionId: string,
  tokenData: Omit<TokenData, 'connectionId'>
): Promise<void> {
  const secretName = `projects/${process.env.GCLOUD_PROJECT}/secrets/calendar-token-${connectionId}`

  try {
    // Encrypt token data before storage
    const payload = JSON.stringify({
      ...tokenData,
      connectionId,
    })

    // Create or update secret version
    await secretManager.addSecretVersion({
      parent: secretName,
      payload: {
        data: Buffer.from(payload, 'utf8'),
      },
    })

    // Log access for audit trail
    console.log({
      action: 'TOKEN_STORED',
      connectionId,
      provider: tokenData.provider,
      userId: tokenData.userId,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error storing tokens:', error)
    throw new Error('Failed to store OAuth tokens securely')
  }
}

/**
 * Retrieve tokens from Secret Manager
 */
export async function getTokens(connectionId: string): Promise<TokenData> {
  const secretName = `projects/${process.env.GCLOUD_PROJECT}/secrets/calendar-token-${connectionId}/versions/latest`

  try {
    const [version] = await secretManager.accessSecretVersion({
      name: secretName,
    })

    const payload = version.payload?.data?.toString('utf8')
    if (!payload) {
      throw new Error('Token not found')
    }

    const tokenData = JSON.parse(payload) as TokenData

    // Log access for audit trail
    console.log({
      action: 'TOKEN_ACCESSED',
      connectionId,
      provider: tokenData.provider,
      userId: tokenData.userId,
      timestamp: new Date().toISOString(),
    })

    return tokenData
  } catch (error) {
    console.error('Error retrieving tokens:', error)
    throw new Error('Failed to retrieve OAuth tokens')
  }
}

/**
 * Delete tokens from Secret Manager
 */
export async function deleteTokens(connectionId: string): Promise<void> {
  const secretName = `projects/${process.env.GCLOUD_PROJECT}/secrets/calendar-token-${connectionId}`

  try {
    await secretManager.deleteSecret({
      name: secretName,
    })

    console.log({
      action: 'TOKEN_DELETED',
      connectionId,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error deleting tokens:', error)
    throw new Error('Failed to delete OAuth tokens')
  }
}

/**
 * Rotate tokens (create new version, archive old)
 */
export async function rotateTokens(
  connectionId: string,
  newTokenData: Omit<TokenData, 'connectionId'>
): Promise<void> {
  // Store new version (Secret Manager automatically versions)
  await storeTokens(connectionId, newTokenData)

  console.log({
    action: 'TOKEN_ROTATED',
    connectionId,
    provider: newTokenData.provider,
    timestamp: new Date().toISOString(),
  })
}
```

**Step 6**: Update calendar-sync.ts to use token service

Replace direct Firestore access with token service calls:

```typescript
// OLD (line 162-186):
const tokenDoc = await admin
  .firestore()
  .collection("_calendarTokens")
  .doc(connectionId)
  .get()

// NEW:
import { getTokens, storeTokens } from './tokenService'

export async function getAccessToken(connectionId: string): Promise<string> {
  const tokenData = await getTokens(connectionId)
  const now = Date.now()

  if (tokenData.expiresAt && tokenData.expiresAt < now) {
    const newTokens = await refreshGoogleToken(
      tokenData.refreshToken,
      connectionId,
      tokenData.userId,
      tokenData.provider
    )
    return newTokens.accessToken
  }

  return tokenData.accessToken
}
```

#### **Week 3 - Day 5: Migration Script**

**Step 7**: Create migration script

**File**: `firebase/functions/src/migrate-tokens.ts`

```typescript
import * as admin from "firebase-admin"
import { storeTokens } from "./tokenService"

/**
 * Migrate tokens from Firestore to Secret Manager
 * Run once to migrate existing tokens
 */
export async function migrateTokensToSecretManager(): Promise<{
  success: number
  failed: number
  errors: string[]
}> {
  const stats = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  }

  try {
    console.log("Starting token migration...")

    // Get all tokens from Firestore
    const tokensSnapshot = await admin
      .firestore()
      .collection("_calendarTokens")
      .get()

    console.log(`Found ${tokensSnapshot.size} tokens to migrate`)

    // Migrate each token
    for (const tokenDoc of tokensSnapshot.docs) {
      const connectionId = tokenDoc.id
      const data = tokenDoc.data()

      try {
        // Get connection to find userId
        const connectionDoc = await admin
          .firestore()
          .collection("calendarConnections")
          .doc(connectionId)
          .get()

        if (!connectionDoc.exists) {
          throw new Error("Connection not found")
        }

        const connection = connectionDoc.data()!

        // Store in Secret Manager
        await storeTokens(connectionId, {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresAt: data.expiresAt,
          provider: data.provider || connection.provider,
          userId: connection.userId,
          createdAt: data.createdAt || new Date().toISOString(),
          lastRefreshedAt: data.updatedAt || new Date().toISOString(),
        })

        stats.success++
        console.log(`✓ Migrated token for connection ${connectionId}`)
      } catch (error) {
        stats.failed++
        const errorMsg = `Failed to migrate ${connectionId}: ${error}`
        stats.errors.push(errorMsg)
        console.error(errorMsg)
      }
    }

    console.log("Migration complete:", stats)
    return stats
  } catch (error) {
    console.error("Fatal migration error:", error)
    throw error
  }
}

/**
 * Cleanup old tokens from Firestore after successful migration
 * ONLY RUN AFTER VERIFYING SECRET MANAGER MIGRATION
 */
export async function cleanupFirestoreTokens(): Promise<void> {
  console.log("⚠️  Deleting tokens from Firestore...")

  const tokensSnapshot = await admin
    .firestore()
    .collection("_calendarTokens")
    .get()

  const batch = admin.firestore().batch()

  tokensSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref)
  })

  await batch.commit()

  console.log(`✓ Deleted ${tokensSnapshot.size} tokens from Firestore`)
}
```

**Step 8**: Run migration (manual execution)

```bash
# Deploy migration function
firebase deploy --only functions:migrateTokensToSecretManager

# Run migration via HTTP trigger or Firebase Console
# Monitor logs carefully

# After verification, run cleanup
firebase deploy --only functions:cleanupFirestoreTokens
```

#### **Week 4: Testing & Verification**

**Step 9**: Integration testing

Test Checklist:
- [ ] New connections store tokens in Secret Manager
- [ ] Token refresh updates Secret Manager versions
- [ ] Calendar sync works with migrated tokens
- [ ] Audit logs capture token access
- [ ] Old Firestore collection is empty
- [ ] Connection deletion removes secrets
- [ ] Error handling for missing tokens
- [ ] Token expiration triggers refresh

**Step 10**: Security audit

- [ ] Run Cloud Security Scanner
- [ ] Review IAM permissions
- [ ] Check Secret Manager access logs
- [ ] Verify no tokens in Firestore
- [ ] Test token revocation flow
- [ ] Validate encryption at rest

**Step 11**: Update Firestore rules

```javascript
// Remove _calendarTokens collection (no longer used)
// Delete this block after migration:
match /_calendarTokens/{tokenId} {
  allow read, write: if false;
}
```

**Step 12**: Documentation updates

- [ ] Update architecture diagrams
- [ ] Document token management procedures
- [ ] Create runbook for token issues
- [ ] Update security policies
- [ ] Train team on new system

---

## 4. Security Improvements Checklist

### Pre-Migration
- [x] Document current implementation
- [x] Identify all token storage locations
- [x] Audit Firestore security rules
- [ ] Review Cloud Function permissions
- [ ] Identify service accounts needing access
- [ ] Create Secret Manager access policies

### During Migration
- [ ] Enable Secret Manager API
- [ ] Create service account
- [ ] Grant IAM permissions
- [ ] Implement token service
- [ ] Update calendar sync functions
- [ ] Run migration script
- [ ] Verify all tokens migrated

### Post-Migration
- [ ] Test calendar sync functionality
- [ ] Monitor Secret Manager access logs
- [ ] Delete Firestore tokens
- [ ] Update security rules
- [ ] Remove obsolete code
- [ ] Update documentation

---

## 5. Cost Analysis

### Current Cost (Firestore)
- **Storage**: ~1 KB per token × N connections ≈ **FREE** (under quota)
- **Reads**: 2 reads per sync (token + refresh) × M syncs ≈ **~$0.06/million**
- **Writes**: 1 write per refresh × P refreshes ≈ **~$0.18/million**

**Estimated Monthly**: **< $0.01** for < 100 connections

### Secret Manager Cost
- **Active Secrets**: $0.06 per secret-version per month
- **Access Operations**: $0.03 per 10,000 accesses
- **Replication**: Included in price

**Example Calculation** (100 connections, 1000 syncs/day):
- Secrets: 100 × $0.06 = **$6.00/month**
- Accesses: (30 days × 1000 syncs/day × 2 reads) / 10,000 × $0.03 = **$0.18/month**
- **Total**: **~$6.20/month**

**Cost Increase**: **~$6.20/month** for 100 connections

**Security ROI**: Worth the cost for:
- Regulatory compliance (avoid fines)
- Data breach prevention (avg cost: $4.45M)
- User trust and reputation
- Audit trail for forensics

---

## 6. Rollback Plan

### If Migration Fails

**Immediate Rollback** (Day of migration):
1. Revert Cloud Functions to previous version
2. Tokens still in Firestore (not deleted yet)
3. System continues working with old implementation

**Partial Migration Recovery** (Some tokens migrated):
1. Keep both systems running temporarily
2. Tokens not in Secret Manager fall back to Firestore
3. Gradually migrate remaining tokens
4. Monitor error rates

**Code Pattern** (fallback logic):
```typescript
async function getTokensWithFallback(connectionId: string): Promise<TokenData> {
  try {
    // Try Secret Manager first
    return await getTokens(connectionId)
  } catch (error) {
    // Fallback to Firestore
    console.warn('Falling back to Firestore for', connectionId)
    const doc = await admin.firestore().collection('_calendarTokens').doc(connectionId).get()
    if (!doc.exists) throw new Error('Token not found')
    return doc.data() as TokenData
  }
}
```

**Complete Rollback Procedure**:
1. Redeploy previous Cloud Functions version
2. Disable Secret Manager access
3. Restore Firestore collection from backup
4. Document lessons learned
5. Schedule retry with fixes

---

## 7. Monitoring & Alerting

### Key Metrics to Track

**Token Operations**:
- Token access rate (requests/minute)
- Token refresh rate (refreshes/hour)
- Token refresh failures
- Secret Manager API errors

**Security Events**:
- Unauthorized access attempts
- Token deletion events
- Permission changes
- Service account usage

**Cost Monitoring**:
- Secret Manager active secrets count
- Access operation costs
- Monthly spend vs budget

### Recommended Alerts

1. **Token Refresh Failures** > 5% → Page on-call engineer
2. **Secret Manager errors** > 1% → Warning notification
3. **Unusual access patterns** → Security team alert
4. **Cost spike** > 150% of average → Finance notification

---

## 8. Compliance Impact

### GDPR (EU Regulation)
- ✅ **Article 32**: Encryption of personal data (**Satisfied** by Secret Manager)
- ✅ **Article 32**: Logging and monitoring (**Satisfied** by audit logs)
- ✅ **Article 25**: Data protection by design (**Improved** by migration)

### SOC 2 (Trust Services Criteria)
- ✅ **CC6.1**: Logical access controls (**Satisfied** by IAM)
- ✅ **CC6.2**: Security system monitoring (**Satisfied** by Cloud Audit Logs)
- ✅ **CC6.6**: Encryption of data at rest (**Satisfied** by Secret Manager)

### HIPAA (If health data in calendars)
- ✅ **§164.312(a)(2)(iv)**: Encryption of ePHI (**Satisfied**)
- ✅ **§164.312(b)**: Audit controls (**Satisfied**)
- ✅ **§164.308(a)(5)**: Security awareness (**Requires** training)

---

## 9. Success Criteria

### Functional Requirements
✅ All calendar syncs continue working
✅ Token refresh operates transparently
✅ New connections use Secret Manager
✅ Old tokens migrated successfully
✅ Connection deletion removes secrets

### Security Requirements
✅ No tokens in Firestore
✅ All access logged to Cloud Audit Logs
✅ IAM permissions follow least-privilege
✅ Client secrets in Secret Manager
✅ Encryption at rest and in transit

### Operational Requirements
✅ < 1% error rate during migration
✅ Zero downtime for users
✅ Rollback plan tested
✅ Documentation complete
✅ Team trained on new system

---

## 10. Next Steps

### Immediate (This Week)
1. ✅ Review this document with stakeholders
2. ⏳ Get approval for Secret Manager costs
3. ⏳ Create Secret Manager setup script
4. ⏳ Implement token service module

### Week 3 (Migration Week)
1. ⏳ Enable Secret Manager API
2. ⏳ Deploy token service
3. ⏳ Run migration script
4. ⏳ Verify migration success

### Week 4 (Verification Week)
1. ⏳ Integration testing
2. ⏳ Security audit
3. ⏳ Cleanup Firestore tokens
4. ⏳ Update documentation

### After Migration (Phase 2)
1. ⏳ Implement two-way sync (safe now!)
2. ⏳ Add token rotation policy
3. ⏳ Set up monitoring dashboards
4. ⏳ Schedule security reviews

---

## Appendix A: References

**OWASP Resources**:
- [A02:2021 – Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)
- [Secure Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

**Google Documentation**:
- [Secret Manager Overview](https://cloud.google.com/secret-manager/docs/overview)
- [Secret Manager Best Practices](https://cloud.google.com/secret-manager/docs/best-practices)
- [OAuth 2.0 Security](https://developers.google.com/identity/protocols/oauth2/security)

**Standards**:
- NIST SP 800-53: Security and Privacy Controls
- PCI DSS: Payment Card Industry Data Security Standard
- CIS Google Cloud Platform Benchmark

---

*Document created: 2025-11-17*
*Author: Claude (AI Assistant)*
*Project: Momentum - Phase 1 Foundation Refactoring*
*Classification: Internal - Security Sensitive*
