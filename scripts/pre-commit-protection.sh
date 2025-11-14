#!/bin/bash

# Code Protection - Pre-commit Hook
# Warns about changes to protected files and offers to create snapshots

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CONFIG_FILE=".code-protection.json"

# Check if protection config exists
if [ ! -f "$CONFIG_FILE" ]; then
    exit 0
fi

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only)

if [ -z "$STAGED_FILES" ]; then
    exit 0
fi

# Read protected paths from config (simple approach - can be enhanced)
PROTECTED_PATHS=$(cat "$CONFIG_FILE" | grep -o '"app/\*\*"\|"components/\*\*"\|"lib/\*\*"\|"firestore.rules"\|"firebase.json"\|"package.json"' | tr -d '"')

# Check if any staged files are in protected paths
PROTECTED_FILES_CHANGED=""

while IFS= read -r file; do
    for pattern in $PROTECTED_PATHS; do
        # Remove ** for simple matching
        pattern_prefix=$(echo "$pattern" | sed 's/\/\*\*$//')

        if [[ "$file" == "$pattern_prefix"* ]] || [[ "$file" == "$pattern" ]]; then
            PROTECTED_FILES_CHANGED="$PROTECTED_FILES_CHANGED\n  - $file"
            break
        fi
    done
done <<< "$STAGED_FILES"

# If protected files are being changed, warn user
if [ -n "$PROTECTED_FILES_CHANGED" ]; then
    echo -e "${YELLOW}⚠ Warning: You are modifying protected core code:${NC}"
    echo -e "$PROTECTED_FILES_CHANGED"
    echo ""
    echo -e "${BLUE}Protected code is being changed. This is tracked for safety.${NC}"
    echo ""

    # Check if this is a snapshot commit (already has snapshot: prefix)
    COMMIT_MSG_FILE=".git/COMMIT_EDITMSG"
    if [ -f "$COMMIT_MSG_FILE" ]; then
        FIRST_LINE=$(head -n 1 "$COMMIT_MSG_FILE")
        if [[ "$FIRST_LINE" == "snapshot:"* ]]; then
            # This is a snapshot commit, allow it
            exit 0
        fi
    fi

    echo -e "${YELLOW}Do you want to create a snapshot before committing? (y/n)${NC}"
    echo -e "${YELLOW}(Recommended for major changes to core code)${NC}"

    # In non-interactive mode, just warn and continue
    if [ ! -t 0 ]; then
        echo -e "${YELLOW}Running in non-interactive mode, skipping snapshot${NC}"
        exit 0
    fi

    read -r CREATE_SNAPSHOT

    if [ "$CREATE_SNAPSHOT" = "y" ] || [ "$CREATE_SNAPSHOT" = "Y" ]; then
        echo -e "${BLUE}Please provide a description for this snapshot:${NC}"
        read -r SNAPSHOT_DESC

        if [ -n "$SNAPSHOT_DESC" ]; then
            # Create snapshot
            ./scripts/create-snapshot.sh "$SNAPSHOT_DESC"
            echo -e "${GREEN}✓ Snapshot created. Proceeding with commit...${NC}"
        fi
    fi
fi

exit 0
