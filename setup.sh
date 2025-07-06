#!/bin/bash

# Sherara MVP Setup Script

echo "Setting up Sherara MVP..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js v14 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "Node.js version is too old. Please upgrade to v14 or higher."
    exit 1
fi

echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# Install dependencies
echo "Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "Please edit .env file and add your OpenAI API key"
fi

# Create necessary directories if they don't exist
mkdir -p logs
mkdir -p temp

echo ""
echo "Setup complete!"
echo ""
echo "To start the application:"
echo "  1. Edit .env file and add your OpenAI API key"
echo "  2. Run: npm start"
echo "  3. Open: http://localhost:3000"
echo ""
echo "For development mode with auto-reload:"
echo "  Run: npm run dev"
