const express = require('express');
const officialSources = require('../services/officialSources');
const regulationSources = require('../services/regulationSources');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Run full sanity check on all sources
router.get('/run', async (req, res) => {
  try {
    console.log('🚀 Starting comprehensive sanity check...');
    
    // Check official sources
    const sanityResults = await officialSources.performSanityCheck();
    
    // Generate source report
    const sourceReport = await officialSources.generateSourceReport();
    
    // Check local regulation files
    const localCheck = await checkLocalRegulations();
    
    const fullReport = {
      timestamp: new Date().toISOString(),
      officialSources: sanityResults,
      sourceReport: sourceReport,
      localRegulations: localCheck,
      recommendations: generateRecommendations(sanityResults, localCheck)
    };
    
    res.json({
      success: true,
      report: fullReport
    });
  } catch (error) {
    console.error('Sanity check error:', error);
    res.status(500).json({
      error: 'Failed to perform sanity check',
      message: error.message
    });
  }
});

// Get last sanity check results
router.get('/last', async (req, res) => {
  try {
    const resultsPath = path.join(__dirname, '..', 'logs', 'sanity-check.json');
    const results = await fs.readFile(resultsPath, 'utf-8');
    res.json({
      success: true,
      results: JSON.parse(results)
    });
  } catch (error) {
    res.status(404).json({
      error: 'No sanity check results found',
      message: 'Run a sanity check first'
    });
  }
});

// Check specific source
router.get('/source/:sourceId', async (req, res) => {
  try {
    const { sourceId } = req.params;
    const sources = officialSources.officialSources;
    
    if (!sources[sourceId]) {
      return res.status(404).json({ error: 'Source not found' });
    }
    
    const results = {
      sourceId: sourceId,
      name: sources[sourceId].name,
      regulations: {}
    };
    
    for (const [regId, regulation] of Object.entries(sources[sourceId].sources)) {
      results.regulations[regId] = await officialSources.checkRegulationSource(regulation);
    }
    
    res.json({
      success: true,
      results: results
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check source',
      message: error.message
    });
  }
});

// Fetch content from official source
router.post('/fetch', async (req, res) => {
  try {
    const { sourceId, regulationId } = req.body;
    
    if (!sourceId || !regulationId) {
      return res.status(400).json({ error: 'sourceId and regulationId are required' });
    }
    
    const content = await officialSources.fetchRegulationContent(sourceId, regulationId);
    
    // Save fetched content
    const fetchPath = path.join(__dirname, '..', 'regulations', 'fetched', `${regulationId}_official.json`);
    await ensureDirectory(path.dirname(fetchPath));
    await fs.writeFile(fetchPath, JSON.stringify(content, null, 2));
    
    res.json({
      success: true,
      content: content,
      savedTo: fetchPath
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch regulation content',
      message: error.message
    });
  }
});

// Helper functions
async function checkLocalRegulations() {
  const regulationsPath = path.join(__dirname, '..', 'regulations');
  const results = {
    totalFiles: 0,
    regulations: [],
    issues: []
  };
  
  try {
    const files = await fs.readdir(regulationsPath);
    
    for (const file of files) {
      if (file.endsWith('.txt')) {
        results.totalFiles++;
        const filePath = path.join(regulationsPath, file);
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        
        const regulation = {
          filename: file,
          size: stats.size,
          modified: stats.mtime,
          hasUpdateDate: content.includes('[LAST UPDATED:'),
          lineCount: content.split('\n').length,
          wordCount: content.split(/\s+/).length
        };
        
        // Check for issues
        if (regulation.size === 0) {
          results.issues.push(`${file} is empty`);
        }
        if (regulation.lineCount < 10) {
          results.issues.push(`${file} has very little content (${regulation.lineCount} lines)`);
        }
        if (!regulation.hasUpdateDate) {
          results.issues.push(`${file} missing update date`);
        }
        
        results.regulations.push(regulation);
      }
    }
  } catch (error) {
    results.issues.push(`Error reading regulations directory: ${error.message}`);
  }
  
  return results;
}

function generateRecommendations(sanityResults, localCheck) {
  const recommendations = [];
  
  // Check official source accessibility
  if (sanityResults.summary.errors > 0) {
    recommendations.push({
      priority: 'high',
      issue: `${sanityResults.summary.errors} official sources are not accessible`,
      action: 'Review and update official source URLs'
    });
  }
  
  if (sanityResults.summary.warnings > 0) {
    recommendations.push({
      priority: 'medium',
      issue: `${sanityResults.summary.warnings} sources have warnings`,
      action: 'Check API endpoints and consider alternative access methods'
    });
  }
  
  // Check local regulations
  if (localCheck.issues.length > 0) {
    recommendations.push({
      priority: 'medium',
      issue: `Found ${localCheck.issues.length} issues with local regulation files`,
      action: 'Review and update local regulation files',
      details: localCheck.issues
    });
  }
  
  // Check for outdated regulations
  const outdatedRegs = localCheck.regulations.filter(reg => {
    const daysSinceUpdate = (Date.now() - new Date(reg.modified).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > 30;
  });
  
  if (outdatedRegs.length > 0) {
    recommendations.push({
      priority: 'low',
      issue: `${outdatedRegs.length} regulations haven't been updated in over 30 days`,
      action: 'Consider syncing with official sources',
      files: outdatedRegs.map(r => r.filename)
    });
  }
  
  return recommendations;
}

async function ensureDirectory(dir) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

module.exports = router;