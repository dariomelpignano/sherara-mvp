#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Sherara MVP - Move and Setup Script${NC}"
echo "======================================"

# Check if source directory exists
if [ ! -d "/Users/dmelpi/sherara-mvp" ]; then
    echo -e "${RED}Error: Source directory /Users/dmelpi/sherara-mvp not found!${NC}"
    echo "It may have already been moved."
    
    # Check if already in new location
    if [ -d "/Users/dmelpi/Documents/VSCode/sherara-mvp" ]; then
        echo -e "${GREEN}✓ Found project at new location!${NC}"
        cd /Users/dmelpi/Documents/VSCode/sherara-mvp
        echo -e "${YELLOW}Installing dependencies...${NC}"
        rm -rf node_modules package-lock.json
        npm install
        echo -e "${GREEN}✓ Setup complete! Starting server...${NC}"
        npm start
    else
        echo -e "${RED}Project not found in either location!${NC}"
        exit 1
    fi
else
    # Move the directory
    echo -e "${YELLOW}Moving project to VSCode folder...${NC}"
    mv /Users/dmelpi/sherara-mvp /Users/dmelpi/Documents/VSCode/
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Project moved successfully!${NC}"
        
        # Navigate to new location
        cd /Users/dmelpi/Documents/VSCode/sherara-mvp
        
        # Clean and reinstall
        echo -e "${YELLOW}Cleaning old dependencies...${NC}"
        rm -rf node_modules package-lock.json
        
        echo -e "${YELLOW}Installing fresh dependencies...${NC}"
        npm install
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Dependencies installed successfully!${NC}"
            echo ""
            echo -e "${GREEN}✓ Setup complete!${NC}"
            echo ""
            echo "📍 New location: /Users/dmelpi/Documents/VSCode/sherara-mvp"
            echo ""
            echo -e "${YELLOW}Starting server...${NC}"
            echo "======================================"
            echo "🌐 Landing page: http://localhost:3000/landing.html"
            echo "🌐 Main app: http://localhost:3000"
            echo ""
            echo "Press Ctrl+C to stop the server"
            echo ""
            
            # Start the server
            npm start
        else
            echo -e "${RED}✗ Failed to install dependencies${NC}"
            exit 1
        fi
    else
        echo -e "${RED}✗ Failed to move directory${NC}"
        exit 1
    fi
fi