#!/bin/bash

# Quick start script for Sherara MVP

echo "🚀 Starting Sherara MVP..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp .env.example .env
    echo "📝 Please edit .env and add your OpenAI API key"
    echo "   Then run this script again."
    exit 1
fi

# Check if OPENAI_API_KEY is set
if grep -q "your-openai-api-key-here" .env; then
    echo "⚠️  OpenAI API key not configured in .env"
    echo "📝 Please edit .env and add your OpenAI API key"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the server
echo "✅ Starting server on http://localhost:3000"
echo "📋 Press Ctrl+C to stop"
echo ""
npm start
