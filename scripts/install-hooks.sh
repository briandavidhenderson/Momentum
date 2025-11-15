#!/bin/bash

# Code Protection - Install Git Hooks Script
# Installs git hooks for code protection

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Installing Code Protection Git Hooks ===${NC}"
echo ""

# Make scripts executable
echo -e "${YELLOW}Making scripts executable...${NC}"
chmod +x scripts/create-snapshot.sh
chmod +x scripts/list-snapshots.sh
chmod +x scripts/pre-commit-protection.sh
echo -e "${GREEN}✓ Scripts are now executable${NC}"

# Install pre-commit hook
HOOK_FILE=".git/hooks/pre-commit"

echo -e "${YELLOW}Installing pre-commit hook...${NC}"

if [ -f "$HOOK_FILE" ]; then
    echo -e "${YELLOW}Existing pre-commit hook found. Creating backup...${NC}"
    cp "$HOOK_FILE" "$HOOK_FILE.backup"
    echo -e "${GREEN}✓ Backup created: $HOOK_FILE.backup${NC}"
fi

# Create the hook
cat > "$HOOK_FILE" << 'EOF'
#!/bin/bash

# Code Protection Pre-commit Hook
# This hook runs before each commit to check for protected file changes

# Run the protection script
./scripts/pre-commit-protection.sh

exit $?
EOF

# Make hook executable
chmod +x "$HOOK_FILE"

echo -e "${GREEN}✓ Pre-commit hook installed${NC}"

# Create snapshot directory
mkdir -p .snapshots

# Initialize snapshot log if it doesn't exist
if [ ! -f ".snapshots/snapshot-history.log" ]; then
    echo "# Snapshot History Log" > .snapshots/snapshot-history.log
    echo "# Format: Timestamp | Tag | Branch | Commit | Description" >> .snapshots/snapshot-history.log
    echo -e "${GREEN}✓ Snapshot log initialized${NC}"
fi

# Add .snapshots to .gitignore if not already there
if ! grep -q "^\.snapshots/$" .gitignore 2>/dev/null; then
    echo "" >> .gitignore
    echo "# Code protection snapshots" >> .gitignore
    echo ".snapshots/" >> .gitignore
    echo -e "${GREEN}✓ Added .snapshots to .gitignore${NC}"
fi

echo ""
echo -e "${GREEN}=== Installation Complete ===${NC}"
echo ""
echo -e "${BLUE}Available commands:${NC}"
echo -e "  ${YELLOW}Create a snapshot:${NC}"
echo -e "    ./scripts/create-snapshot.sh \"Description of changes\""
echo ""
echo -e "  ${YELLOW}List all snapshots:${NC}"
echo -e "    ./scripts/list-snapshots.sh"
echo ""
echo -e "  ${YELLOW}Restore a snapshot:${NC}"
echo -e "    git checkout <snapshot-tag>"
echo ""
echo -e "${BLUE}The pre-commit hook will now:${NC}"
echo -e "  • Warn you when modifying protected core code"
echo -e "  • Offer to create a snapshot before major changes"
echo -e "  • Track all changes for easy rollback"
echo ""
echo -e "${GREEN}Your code is now protected!${NC}"
