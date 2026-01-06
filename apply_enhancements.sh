#!/bin/bash

# Mojo Creative Pre-Flight Enhancement Script
# This script applies all improvements to your project

set -e  # Exit on error

echo "🚀 Mojo Creative Pre-Flight Enhancement Script"
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found."
    echo "   Please run this script from your project root directory."
    exit 1
fi

# Check if src directory exists
if [ ! -d "src" ]; then
    echo "❌ Error: src/ directory not found."
    echo "   Please run this script from your project root directory."
    exit 1
fi

echo "📁 Found project structure. Proceeding with enhancements..."
echo ""

# Create backup directory
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "💾 Creating backup in: $BACKUP_DIR"

# Backup existing files
if [ -f "src/App.tsx" ]; then
    cp src/App.tsx "$BACKUP_DIR/App.tsx.backup"
    echo "   ✓ Backed up App.tsx"
fi

if [ -f "src/App.css" ]; then
    cp src/App.css "$BACKUP_DIR/App.css.backup"
    echo "   ✓ Backed up App.css"
fi

if [ -f "src/Trafficker.ts" ]; then
    cp src/Trafficker.ts "$BACKUP_DIR/Trafficker.ts.backup"
    echo "   ✓ Backed up Trafficker.ts"
fi

echo ""
echo "📝 Applying enhancements..."

# Copy enhanced files
if [ -f "App_Enhanced.tsx" ]; then
    cp App_Enhanced.tsx src/App.tsx
    echo "   ✓ Updated App.tsx with enhanced version"
else
    echo "   ⚠️  App_Enhanced.tsx not found (skipping)"
fi

if [ -f "App_Enhanced.css" ]; then
    cp App_Enhanced.css src/App.css
    echo "   ✓ Updated App.css with enhanced version"
else
    echo "   ⚠️  App_Enhanced.css not found (skipping)"
fi

if [ -f "Trafficker_Enhanced.ts" ]; then
    cp Trafficker_Enhanced.ts src/Trafficker.ts
    echo "   ✓ Updated Trafficker.ts with enhanced version"
else
    echo "   ⚠️  Trafficker_Enhanced.ts not found (skipping)"
fi

echo ""
echo "✅ Enhancement complete!"
echo ""
echo "📊 What changed:"
echo "   • Added scanning animation with progress messages"
echo "   • Implemented progressive fix reveal"
echo "   • Added intelligence badge (🧠 Mojo detected...)"
echo "   • Updated all copy to operator language"
echo "   • Enhanced business context for all issues"
echo "   • Added micro-animations and hover states"
echo ""
echo "🧪 Next steps:"
echo "   1. Review changes: git diff src/"
echo "   2. Start dev server: npm run dev"
echo "   3. Test scenarios:"
echo "      • Upload creative → see scanning animation"
echo "      • Bad filename → see progressive reveal"
echo "      • High text density → see platform-specific warnings"
echo ""
echo "💡 To rollback:"
echo "   cp $BACKUP_DIR/*.backup src/"
echo ""
echo "📚 Read ENHANCEMENT_GUIDE.md for full details"
echo ""
echo "🎉 Happy trafficking!"
