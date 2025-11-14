#!/bin/bash

# Code Protection - List Snapshots Script
# Lists all available code snapshots

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

SNAPSHOT_DIR=".snapshots"
SNAPSHOT_LOG="$SNAPSHOT_DIR/snapshot-history.log"

echo -e "${BLUE}=== Code Snapshots ===${NC}"
echo ""

# Check if snapshot log exists
if [ ! -f "$SNAPSHOT_LOG" ]; then
    echo -e "${YELLOW}No snapshots found. Create one with:${NC}"
    echo -e "  ./scripts/create-snapshot.sh \"Your description here\""
    echo ""
    exit 0
fi

# Display snapshots from log
echo -e "${CYAN}Recent Snapshots:${NC}"
echo ""
echo -e "${BLUE}Timestamp          | Tag                    | Branch              | Commit  | Description${NC}"
echo "-------------------+------------------------+---------------------+---------+---------------------------"

# Read and display last 20 snapshots
tail -20 "$SNAPSHOT_LOG" | while IFS='|' read -r timestamp tag branch commit description; do
    echo -e "${GREEN}$timestamp${NC} | ${YELLOW}$tag${NC} | ${CYAN}$branch${NC} | $commit | $description"
done

echo ""
echo -e "${YELLOW}Total snapshots:${NC} $(wc -l < "$SNAPSHOT_LOG")"

# Display git tags
echo ""
echo -e "${CYAN}All Snapshot Tags:${NC}"
git tag -l 'snapshot-*' --sort=-version:refname | head -20

echo ""
echo -e "${YELLOW}To restore a snapshot:${NC}"
echo -e "  git checkout <tag-name>"
echo ""
echo -e "${YELLOW}To view snapshot details:${NC}"
echo -e "  git show <tag-name>"
echo ""
echo -e "${YELLOW}To compare with a snapshot:${NC}"
echo -e "  git diff <tag-name>"
echo ""
