#!/bin/bash

echo "🚀 Sherara MVP - Installation and Startup Script"
echo "=============================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Error: package.json not found!"
    print_info "Please run this script from the sherara-mvp directory"
    exit 1
fi

# Check Node.js installation
print_info "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed!"
    print_info "Please install Node.js from https://nodejs.org/"
    exit 1
else
    NODE_VERSION=$(node --version)
    print_status "Node.js $NODE_VERSION is installed"
fi

# Check npm installation
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed!"
    exit 1
else
    NPM_VERSION=$(npm --version)
    print_status "npm $NPM_VERSION is installed"
fi

# Clean install
print_info "Cleaning previous installation..."
rm -rf node_modules package-lock.json

# Install dependencies
print_info "Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    print_status "Dependencies installed successfully!"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_info "Creating .env file from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_status ".env file created"
        print_info "Please edit .env to add your OpenAI API key (optional)"
    else
        # Create a basic .env file
        cat > .env << EOL
# Sherara MVP Environment Configuration
PORT=3000
NODE_ENV=development
SESSION_SECRET=sherara-mvp-secret-key-change-in-production
OPENAI_API_KEY=
MAX_FILE_SIZE_MB=10
SESSION_TIMEOUT_MINUTES=30
ENABLE_AI_FEATURES=true
ENABLE_DEBUG_LOGGING=false
EOL
        print_status ".env file created with defaults"
    fi
fi

# Start the server
echo ""
print_info "Starting Sherara MVP server..."
echo "=============================================="
echo ""

# Display URLs
echo "📌 Once the server starts, you can access:"
echo "   - Landing Page: http://localhost:3000/landing.html"
echo "   - Main App: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
npm start