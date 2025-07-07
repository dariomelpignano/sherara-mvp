#!/usr/bin/env node

const { spawn } = require('child_process');
const readline = require('readline');

const industries = [
  {
    key: 'financial-services',
    name: 'Financial Services',
    description: 'Banking, investment, and financial institutions',
    icon: '🏦'
  },
  {
    key: 'medicinal-gases',
    name: 'Medicinal Gases',
    description: 'Medical gas manufacturing and distribution',
    icon: '🏥'
  },
  {
    key: 'food-beverages',
    name: 'Food and Beverages',
    description: 'Food production, processing, and distribution',
    icon: '🍎'
  }
];

function displayMenu() {
  console.log('\n🏭 Sherara MVP - Industry Selection');
  console.log('=====================================\n');
  
  industries.forEach((industry, index) => {
    console.log(`${index + 1}. ${industry.icon} ${industry.name}`);
    console.log(`   ${industry.description}\n`);
  });
  
  console.log('0. Exit\n');
}

function startServer(industryKey) {
  const industry = industries.find(i => i.key === industryKey);
  
  console.log(`\n🚀 Starting Sherara MVP for ${industry.icon} ${industry.name}...`);
  console.log(`📋 Description: ${industry.description}\n`);
  
  const serverProcess = spawn('node', ['server.js', `--industry=${industryKey}`], {
    stdio: 'inherit',
    shell: true
  });
  
  serverProcess.on('close', (code) => {
    console.log(`\n📊 Server exited with code ${code}`);
    process.exit(code);
  });
  
  serverProcess.on('error', (error) => {
    console.error(`❌ Error starting server: ${error.message}`);
    process.exit(1);
  });
  
  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n⏹️  Shutting down server...');
    serverProcess.kill('SIGINT');
  });
}

function getUserChoice() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('Please select an industry (1-3) or 0 to exit: ', (answer) => {
    const choice = parseInt(answer);
    
    if (choice === 0) {
      console.log('👋 Goodbye!');
      rl.close();
      process.exit(0);
    }
    
    if (choice >= 1 && choice <= industries.length) {
      const selectedIndustry = industries[choice - 1];
      rl.close();
      startServer(selectedIndustry.key);
    } else {
      console.log('❌ Invalid choice. Please try again.');
      rl.close();
      getUserChoice();
    }
  });
}

// Check if industry was provided as command line argument
const args = process.argv.slice(2);
const directIndustryArg = args.find(arg => arg.startsWith('--industry='));

if (directIndustryArg) {
  const industryKey = directIndustryArg.split('=')[1];
  const industry = industries.find(i => i.key === industryKey);
  
  if (industry) {
    startServer(industryKey);
  } else {
    console.error(`❌ Unknown industry: ${industryKey}`);
    console.log(`📋 Available industries: ${industries.map(i => i.key).join(', ')}`);
    process.exit(1);
  }
} else {
  // Show interactive menu
  displayMenu();
  getUserChoice();
}