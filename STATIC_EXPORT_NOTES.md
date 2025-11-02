# Static Export Configuration Notes

## API Routes Limitation

The application is configured for static export (`output: 'export'` in `next.config.js`). This means:

### What Works
- ✅ All client-side pages (all dashboard pages)
- ✅ Firebase client SDK (authentication, Firestore, Storage)
- ✅ Real-time updates via Firestore listeners
- ✅ All React components and hooks

### What Doesn't Work
- ❌ **API Routes** - Server-side API routes are not available in static export

### Affected Feature

**iCal Export** (`app/api/calendar/[projectId]/route.ts`)
- This API route generates iCal files for calendar export
- **Status:** Will not work with static export
- **Workaround Options:**
  1. Convert to Cloud Function (recommended)
  2. Move logic client-side and generate iCal in browser
  3. Use a third-party service

### Solution: Convert to Cloud Function

To make iCal export work, convert the API route to a Cloud Function:

1. Create `firebase/functions/src/icalExport.ts`
2. Move the iCal generation logic there
3. Deploy as HTTP Cloud Function
4. Update frontend to call the Cloud Function URL instead of `/api/calendar/...`

This is optional - the feature can be disabled or converted later without affecting deployment.

## Environment Variables

- Environment variables are **baked into the build** at build time
- Must be set before running `npm run build`
- Variables starting with `NEXT_PUBLIC_` are exposed to the client
- To update env vars: rebuild and redeploy

## Build Output

- Static files are generated in the `out/` directory
- Firebase Hosting serves from the `out/` directory
- All routing is client-side (React Router handles navigation)


