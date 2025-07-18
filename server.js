const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import services
const industryConfig = require('./services/industryConfig');

// Import routes
const uploadRoutes = require('./routes/upload');
const analysisRoutes = require('./routes/analysis');
const chatRoutes = require('./routes/chat');
const regulationsRoutes = require('./routes/regulations');
const sanityCheckRoutes = require('./routes/sanityCheck');
const taxonomyRoutes = require('./routes/taxonomyRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse command line arguments for industry selection
const args = process.argv.slice(2);
const industryArg = args.find(arg => arg.startsWith('--industry='));

if (industryArg) {
  const industry = industryArg.split('=')[1];
  try {
    industryConfig.setIndustry(industry);
    console.log(`🏭 Sherara MVP started for industry: ${industryConfig.getCurrentIndustry().name}`);
  } catch (error) {
    console.error(`❌ Error setting industry: ${error.message}`);
    console.log(`📋 Available industries: ${industryConfig.getSupportedIndustries().map(i => i.key).join(', ')}`);
    process.exit(1);
  }
} else {
  console.log(`🏭 Sherara MVP started with default industry: ${industryConfig.getCurrentIndustry().name}`);
  console.log(`💡 Use --industry=<industry-key> to specify industry. Available: ${industryConfig.getSupportedIndustries().map(i => i.key).join(', ')}`);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'sherara-secret-key-change-in-production',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    maxAge: 30 * 60 * 1000 // 30 minutes
  }
}));

// Initialize session storage for documents
app.use((req, res, next) => {
  if (!req.session.documents) {
    req.session.documents = {};
  }
  if (!req.session.analysisResults) {
    req.session.analysisResults = {};
  }
  next();
});

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/analyze', analysisRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/regulations', regulationsRoutes);
app.use('/api/sanity-check', sanityCheckRoutes);
app.use('/api/taxonomy', taxonomyRoutes);

// Industry configuration endpoint
app.get('/api/industry', (req, res) => {
  res.json({
    success: true,
    current: industryConfig.getCurrentIndustry(),
    available: industryConfig.getSupportedIndustries(),
    context: industryConfig.getIndustryContext()
  });
});

// Dashboard endpoint
app.get('/api/dashboard', (req, res) => {
  const documents = Object.keys(req.session.documents || {}).length;
  const analysisResults = req.session.analysisResults || {};
  
  // Calculate summary statistics
  let totalGaps = 0;
  let highRiskCount = 0;
  let mediumRiskCount = 0;
  let lowRiskCount = 0;
  
  Object.values(analysisResults).forEach(result => {
    if (result.gaps) {
      totalGaps += result.gaps.length;
      result.gaps.forEach(gap => {
        if (gap.risk_score >= 7) highRiskCount++;
        else if (gap.risk_score >= 4) mediumRiskCount++;
        else lowRiskCount++;
      });
    }
  });
  
  res.json({
    documentsUploaded: documents,
    totalGaps: totalGaps,
    riskDistribution: {
      high: highRiskCount,
      medium: mediumRiskCount,
      low: lowRiskCount
    },
    recentAnalyses: Object.keys(analysisResults).slice(-5)
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Sherara MVP server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to access the application`);
});
