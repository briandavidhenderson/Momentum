#!/bin/bash

# Code Protection - Snapshot Creation Script
# Creates a tagged snapshot of the current codebase for major revisions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SNAPSHOT_DIR=".snapshots"
SNAPSHOT_LOG="$SNAPSHOT_DIR/snapshot-history.log"
BACKUP_BRANCH="snapshots/revisions"

# Create snapshot directory if it doesn't exist
mkdir -p "$SNAPSHOT_DIR"

# Get current timestamp
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

# Get short commit hash
COMMIT_HASH=$(git rev-parse --short HEAD)

# Prompt for snapshot description
echo -e "${BLUE}=== Code Snapshot Creation ===${NC}"
echo ""
echo -e "${YELLOW}Current branch:${NC} $CURRENT_BRANCH"
echo -e "${YELLOW}Current commit:${NC} $COMMIT_HASH"
echo ""

if [ -z "$1" ]; then
    echo -e "${YELLOW}Enter a description for this snapshot:${NC}"
    read -r DESCRIPTION
else
    DESCRIPTION="$1"
fi

if [ -z "$DESCRIPTION" ]; then
    echo -e "${RED}Error: Snapshot description is required${NC}"
    exit 1
fi

# Create snapshot tag name
SNAPSHOT_TAG="snapshot-$TIMESTAMP"

echo ""
echo -e "${BLUE}Creating snapshot...${NC}"

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}Warning: You have uncommitted changes${NC}"
    echo -e "${YELLOW}Do you want to commit them first? (y/n)${NC}"
    read -r COMMIT_CHANGES

    if [ "$COMMIT_CHANGES" = "y" ] || [ "$COMMIT_CHANGES" = "Y" ]; then
        echo -e "${BLUE}Committing changes...${NC}"
        git add -A
        git commit -m "snapshot: $DESCRIPTION"
        COMMIT_HASH=$(git rev-parse --short HEAD)
    else
        echo -e "${YELLOW}Creating snapshot with uncommitted changes (stash will be created)${NC}"
        git stash push -m "Snapshot stash: $DESCRIPTION"
    fi
fi

# Create annotated tag for the snapshot
git tag -a "$SNAPSHOT_TAG" -m "Snapshot: $DESCRIPTION

Created: $(date)
Branch: $CURRENT_BRANCH
Commit: $COMMIT_HASH
Description: $DESCRIPTION"

echo -e "${GREEN}✓ Snapshot tag created: $SNAPSHOT_TAG${NC}"

# Create/update backup branch
echo -e "${BLUE}Updating backup branch...${NC}"

# Check if backup branch exists
if git show-ref --verify --quiet "refs/heads/$BACKUP_BRANCH"; then
    # Branch exists, update it
    git branch -f "$BACKUP_BRANCH" HEAD
    echo -e "${GREEN}✓ Backup branch updated: $BACKUP_BRANCH${NC}"
else
    # Create new backup branch
    git branch "$BACKUP_BRANCH" HEAD
    echo -e "${GREEN}✓ Backup branch created: $BACKUP_BRANCH${NC}"
fi

# Log the snapshot
echo "$TIMESTAMP | $SNAPSHOT_TAG | $CURRENT_BRANCH | $COMMIT_HASH | $DESCRIPTION" >> "$SNAPSHOT_LOG"

# Create snapshot info file
SNAPSHOT_INFO_FILE="$SNAPSHOT_DIR/$SNAPSHOT_TAG.json"
cat > "$SNAPSHOT_INFO_FILE" << EOF
{
  "tag": "$SNAPSHOT_TAG",
  "timestamp": "$TIMESTAMP",
  "date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "branch": "$CURRENT_BRANCH",
  "commit": "$COMMIT_HASH",
  "description": "$DESCRIPTION",
  "author": "$(git config user.name) <$(git config user.email)>"
}
EOF

echo -e "${GREEN}✓ Snapshot info saved: $SNAPSHOT_INFO_FILE${NC}"

# Display summary
echo ""
echo -e "${GREEN}=== Snapshot Created Successfully ===${NC}"
echo -e "${BLUE}Tag:${NC} $SNAPSHOT_TAG"
echo -e "${BLUE}Description:${NC} $DESCRIPTION"
echo -e "${BLUE}Branch:${NC} $CURRENT_BRANCH"
echo -e "${BLUE}Commit:${NC} $COMMIT_HASH"
echo ""
echo -e "${YELLOW}To restore this snapshot:${NC}"
echo -e "  git checkout $SNAPSHOT_TAG"
echo ""
echo -e "${YELLOW}To view all snapshots:${NC}"
echo -e "  git tag -l 'snapshot-*'"
echo -e "  cat $SNAPSHOT_LOG"
echo ""
echo -e "${YELLOW}To push snapshot to remote:${NC}"
echo -e "  git push origin $SNAPSHOT_TAG"
echo -e "  git push origin $BACKUP_BRANCH"
echo ""

# Optional: Push to remote
echo -e "${YELLOW}Do you want to push this snapshot to remote? (y/n)${NC}"
read -r PUSH_REMOTE

if [ "$PUSH_REMOTE" = "y" ] || [ "$PUSH_REMOTE" = "Y" ]; then
    echo -e "${BLUE}Pushing to remote...${NC}"
    git push origin "$SNAPSHOT_TAG" || echo -e "${YELLOW}Warning: Could not push tag${NC}"
    git push origin "$BACKUP_BRANCH" || echo -e "${YELLOW}Warning: Could not push backup branch${NC}"
    echo -e "${GREEN}✓ Snapshot pushed to remote${NC}"
fi

echo ""
echo -e "${GREEN}Done!${NC}"
