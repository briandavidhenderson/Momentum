# 🔧 Quick Fix: Invalid API Key Error

## The Problem
You're seeing `FirebaseError: auth/invalid-api-key` because the `.env.local` file is missing or has incorrect values.

## Solution (3 Steps)

### Step 1: Create the `.env.local` file

Create a file named `.env.local` in the root of your project (same folder as `package.json`).

### Step 2: Get Your Firebase Configuration Values

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project** (or create a new one if you don't have one)
3. **Click the gear icon ⚙️** → **Project Settings**
4. **Scroll down** to "Your apps" section
5. **If you don't have a web app yet:**
   - Click the **`</>` Web** icon to add a new web app
   - Give it a nickname (e.g., "Lab Management")
   - **Don't check** "Also set up Firebase Hosting" (we'll do that separately)
   - Click **Register app**
6. **Copy the config values** - they look like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### Step 3: Fill in `.env.local`

Create `.env.local` with these values (replace with YOUR actual values):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

**Important Notes:**
- ✅ No quotes around the values
- ✅ No spaces around the `=` sign
- ✅ Replace ALL the placeholder values with your actual Firebase values

### Step 4: Restart the Development Server

After creating/updating `.env.local`:

1. **Stop the server** (Ctrl+C in terminal)
2. **Start it again**: `npm run dev`
3. **Refresh your browser**

## Don't Have a Firebase Project Yet?

1. Go to https://console.firebase.google.com/
2. Click **"Add project"**
3. Enter a project name
4. Follow the setup wizard
5. **Enable these services:**
   - ☑️ Authentication (Email/Password)
   - ☑️ Firestore Database (Create in production mode)
   - ☑️ Storage
6. Then follow Steps 2-4 above

## Still Having Issues?

### Check:
- ✅ File is named exactly `.env.local` (not `.env.local.txt`)
- ✅ File is in the root directory (same folder as `package.json`)
- ✅ No extra spaces or quotes in the values
- ✅ Server was restarted after creating the file

### Verify Your Values:
Open `.env.local` and make sure none of the values say:
- `your_api_key_here`
- `your_project_id`
- etc.

All values should be actual Firebase configuration strings.

## Quick Test

After setting up, you should be able to:
1. Go to http://localhost:3000
2. See the login/register page (not an error)
3. Register a new account or log in

If you still see the error, double-check your `.env.local` file values match exactly what Firebase Console shows.

