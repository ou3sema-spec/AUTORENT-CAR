#!/bin/bash
# Build check script for AUTORENT CAR TUNISIA

echo "🔍 Checking TypeScript compilation..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo "✅ TypeScript check passed!"
else
    echo "❌ TypeScript compilation errors found!"
    echo ""
    echo "Common issues and fixes:"
    echo "1. Missing context export - ensure BookingContext is exported"
    echo "2. Date comparison type mismatch - use Date normalization utilities"
    echo "3. Missing Firebase config - check firebase.config.ts exists"
    echo ""
fi

echo ""
echo "📋 Building application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed!"
fi
