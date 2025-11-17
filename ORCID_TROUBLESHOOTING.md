# ORCID Linking Troubleshooting Guide

## Current Issue

The ORCID linking is failing with a 500 error from the `orcidLinkAccount` Firebase Cloud Function.

## Possible Causes

### 1. ORCID Credentials Not Configured

The most common cause is missing or incorrect ORCID OAuth credentials.

**Check if configured:**
```bash
firebase functions:config:get
```

**Expected output should include:**
```json
{
  "orcid": {
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "use_sandbox": "true"  // or "false" for production
  }
}
```

**If missing, configure:**
```bash
firebase functions:config:set orcid.client_id="YOUR_ORCID_CLIENT_ID"
firebase functions:config:set orcid.client_secret="YOUR_ORCID_CLIENT_SECRET"
firebase functions:config:set orcid.use_sandbox="true"  # Use "false" for production ORCID
```

**After setting config, redeploy functions:**
```bash
firebase deploy --only functions
```

### 2. Functions Not Deployed

The functions might not be deployed to the production environment.

**Check deployment:**
```bash
firebase deploy --only functions:orcidLinkAccount
```

### 3. Check Firebase Console Logs

View the actual error from Firebase Console:

1. Go to: https://console.firebase.google.com/project/momentum-a60c5/functions/logs
2. Filter by `orcidLinkAccount`
3. Look for the error message that occurred when you tried to link ORCID

The logs will show the actual error (e.g., "Failed to exchange authorization code", "Invalid client credentials", etc.)

## Common Errors and Solutions

### Error: "Failed to exchange authorization code"

**Cause:** ORCID credentials are incorrect or expired

**Solution:**
1. Verify credentials in ORCID developer console
2. Update Firebase config with correct credentials
3. Redeploy functions

### Error: "No ORCID iD in response"

**Cause:** ORCID OAuth flow returned invalid data

**Solution:**
1. Check if you're using sandbox vs production ORCID correctly
2. Verify redirect URI matches what's configured in ORCID app

### Error: "PERMISSION_DENIED"

**Cause:** Firestore security rules blocking the write

**Solution:**
- Admin SDK bypasses security rules, so this shouldn't happen
- Check if the Cloud Function has proper IAM permissions

## Testing ORCID Linking

### 1. Check if ORCID App is Configured

- Go to https://orcid.org/developer-tools (or https://sandbox.orcid.org for sandbox)
- Verify your application settings
- Ensure redirect URI is: `https://momentum-a60c5.web.app/auth/orcid/callback`

### 2. Test Token Exchange Manually

You can test if the ORCID credentials work by checking the `orcidAuthStart` function first:

```javascript
// In browser console on your app
const auth = firebase.auth();
const functions = firebase.functions();

const startAuth = functions.httpsCallable('orcidAuthStart');
const result = await startAuth({ redirect_uri: window.location.origin + '/auth/orcid/callback' });
console.log(result.data); // Should show authUrl and state
```

## Frontend vs Backend Issues

### Frontend Issues (Not This Case)
- User prop becoming stale ✅ **FIXED** by our recent changes
- Complete Setup button hidden ✅ **FIXED**

### Backend Issues (Current Problem)
- ORCID credentials not configured ❌ **NEEDS CHECKING**
- Function not deployed ❌ **NEEDS CHECKING**
- ORCID API changes ❌ **NEEDS CHECKING**

## Next Steps

1. **Check Firebase Functions logs** to see the actual error
2. **Verify ORCID credentials** are configured in Firebase
3. **Ensure functions are deployed** to production
4. **Share the actual error message** from logs for further diagnosis

## Contact

If the issue persists after checking these items, please provide:
1. The actual error message from Firebase Console logs
2. Output of `firebase functions:config:get`
3. Whether you're using sandbox or production ORCID
