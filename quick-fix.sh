#!/bin/bash
echo "🔧 Fixing Sherara MVP installation..."
rm -rf node_modules package-lock.json
npm install
echo "✅ Installation complete! Starting server..."
npm start