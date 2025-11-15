# Code Protection & Snapshot System

A comprehensive system for protecting core code and creating snapshots before major revisions.

## 🛡️ Overview

This system provides:
- **Automated snapshots** of code before major changes
- **Git hooks** that warn when modifying protected files
- **Tagged backups** for easy rollback
- **Snapshot history** tracking all major revisions
- **GitHub CODEOWNERS** integration for pull request reviews

## 📁 Protected Code

The following paths are automatically protected:

- `app/**` - Next.js application code
- `components/**` - React components
- `lib/**` - Core utilities and services
- `firestore.rules` - Database security rules
- `firebase.json` - Firebase configuration
- `package.json` - Dependencies
- Configuration files (tsconfig, tailwind, etc.)

You can modify protected paths in `.code-protection.json`.

## 🚀 Quick Start

### Creating a Snapshot

**Before making major changes**, create a snapshot:

```bash
# Using npm script (recommended)
npm run snapshot:create

# Or directly
./scripts/create-snapshot.sh "Description of changes"
```

You'll be prompted to:
1. Enter a description of the changes
2. Commit any uncommitted changes (optional)
3. Push to remote (optional)

### Listing Snapshots

View all your snapshots:

```bash
# Using npm script
npm run snapshot:list

# Or directly
./scripts/list-snapshots.sh
```

### Restoring a Snapshot

To rollback to a previous snapshot:

```bash
# Find the snapshot you want
npm run snapshot:list

# Restore it
git checkout snapshot-20250113-143022

# Or restore and create a new branch
git checkout -b restored-version snapshot-20250113-143022
```

## 🔧 How It Works

### 1. Git Pre-commit Hook

When you commit changes to protected files:
1. Hook detects protected file modifications
2. Warns you about the changes
3. Offers to create a snapshot
4. Proceeds with commit

Example:
```bash
git commit -m "Refactor authentication system"
# → ⚠ Warning: You are modifying protected core code:
#     - lib/auth.ts
#     - components/LoginForm.tsx
# → Do you want to create a snapshot before committing? (y/n)
```

### 2. Snapshot Creation

Each snapshot creates:
- **Git Tag**: `snapshot-YYYYMMDD-HHMMSS`
- **Backup Branch**: `snapshots/revisions` (updated to latest)
- **Metadata File**: `.snapshots/snapshot-<tag>.json`
- **History Log**: `.snapshots/snapshot-history.log`

### 3. Snapshot Structure

```json
{
  "tag": "snapshot-20250113-143022",
  "timestamp": "20250113-143022",
  "date": "2025-01-13T14:30:22Z",
  "branch": "main",
  "commit": "a1b2c3d",
  "description": "Before implementing new authentication",
  "author": "Brian Henderson <brian@example.com>"
}
```

## 📋 NPM Scripts

Convenient commands added to `package.json`:

```bash
# Create a new snapshot
npm run snapshot:create

# List all snapshots
npm run snapshot:list

# Reinstall protection hooks
npm run protection:install
```

## 🔍 Advanced Usage

### Comparing with a Snapshot

See what changed since a snapshot:

```bash
git diff snapshot-20250113-143022
```

### Viewing Snapshot Details

```bash
git show snapshot-20250113-143022
```

### Pushing Snapshots to Remote

```bash
# Push specific snapshot
git push origin snapshot-20250113-143022

# Push backup branch
git push origin snapshots/revisions

# Push all snapshots
git push origin --tags
```

### Creating Snapshots Without Prompts

```bash
./scripts/create-snapshot.sh "My snapshot description"
```

## 📝 Configuration

Edit `.code-protection.json` to customize:

```json
{
  "protectedPaths": [
    "app/**",
    "components/**",
    "lib/**"
  ],
  "backupBranch": "snapshots/revisions",
  "snapshotPrefix": "snapshot-",
  "autoBackupOnProtectedChange": true,
  "requireCommitMessage": true,
  "excludeFromProtection": [
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/README.md"
  ]
}
```

## 🔐 GitHub Integration

### CODEOWNERS File

The `CODEOWNERS` file ensures:
- Pull requests modifying core code require review
- Specific owners are automatically assigned
- Additional protection layer for team environments

To use on GitHub:
1. Push `CODEOWNERS` file to repository
2. Enable branch protection rules
3. Require review from code owners

### Branch Protection (Recommended)

For additional protection, configure on GitHub:
1. Go to Settings → Branches
2. Add rule for main/master branch
3. Enable:
   - Require pull request before merging
   - Require review from Code Owners
   - Require status checks to pass

## 🗂️ File Structure

```
Momentum/
├── .code-protection.json          # Protection configuration
├── .snapshots/                    # Snapshot metadata (gitignored)
│   ├── snapshot-history.log       # All snapshots log
│   └── snapshot-*.json            # Individual snapshot metadata
├── scripts/
│   ├── create-snapshot.sh         # Create snapshot script
│   ├── list-snapshots.sh          # List snapshots script
│   ├── pre-commit-protection.sh   # Git hook logic
│   └── install-hooks.sh           # Hook installation
├── .git/hooks/
│   └── pre-commit                 # Active git hook
└── CODEOWNERS                     # GitHub code ownership
```

## 🚨 Best Practices

### When to Create Snapshots

✅ **DO create snapshots:**
- Before major refactoring
- Before architectural changes
- Before upgrading dependencies
- Before implementing risky features
- At the end of successful feature implementations
- Before merging large pull requests

❌ **DON'T create snapshots:**
- For every small commit
- For typo fixes
- For documentation-only changes
- Multiple times for same change set

### Naming Snapshots

Good descriptions:
- ✅ "Before implementing OAuth authentication"
- ✅ "Working state before Firestore refactor"
- ✅ "Stable version before calendar integration"

Poor descriptions:
- ❌ "Changes"
- ❌ "Update"
- ❌ "WIP"

### Cleanup

Keep your snapshot history manageable:

```bash
# List all snapshots
git tag -l 'snapshot-*'

# Delete old snapshot (local)
git tag -d snapshot-20240101-120000

# Delete from remote
git push origin :refs/tags/snapshot-20240101-120000
```

## 🆘 Troubleshooting

### Hook Not Running

Reinstall hooks:
```bash
npm run protection:install
```

### Hook Errors in CI/CD

The pre-commit hook detects non-interactive mode and skips prompts automatically.

### Snapshot Script Fails

Ensure scripts are executable:
```bash
chmod +x scripts/*.sh
```

### Uncommitted Changes Warning

Either commit your changes first or stash them:
```bash
git stash
./scripts/create-snapshot.sh "Description"
git stash pop
```

## 📊 Snapshot History

View full history:

```bash
cat .snapshots/snapshot-history.log
```

Format:
```
Timestamp | Tag | Branch | Commit | Description
20250113-143022 | snapshot-20250113-143022 | main | a1b2c3d | Before authentication refactor
```

## 🔄 Workflow Example

Complete workflow for a major change:

```bash
# 1. Create snapshot before starting
npm run snapshot:create
# → "Before implementing new feature X"

# 2. Make your changes
git add .
git commit -m "Implement feature X"
# → Hook warns about protected files
# → Choose 'n' (already have snapshot)

# 3. Test thoroughly
npm run build
npm test

# 4. If successful, create success snapshot
npm run snapshot:create
# → "Feature X implemented successfully"

# 5. Push everything
git push
git push origin --tags
```

## 📚 Additional Resources

- Git Tags: https://git-scm.com/book/en/v2/Git-Basics-Tagging
- Git Hooks: https://git-scm.com/docs/githooks
- CODEOWNERS: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners

## 🎯 Summary

This system ensures:
- ✅ Core code is protected from accidental changes
- ✅ All major revisions are tracked and recoverable
- ✅ Easy rollback to any previous state
- ✅ Clear history of all significant changes
- ✅ Team collaboration with code ownership

**Remember**: Snapshots are your safety net. Create them liberally before major changes!
