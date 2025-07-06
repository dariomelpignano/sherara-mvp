const express = require('express');
const regulatoryAnalyzer = require('../services/regulatoryAnalyzer');
const gapAnalysis = require('../services/gapAnalysis');

const router = express.Router();

// Get available regulations
router.get('/regulations', async (req, res) => {
  try {
    const availableRegulations = await regulatoryAnalyzer.getAvailableRegulations();
    res.json({
      success: true,
      regulations: availableRegulations
    });
  } catch (error) {
    console.error('Error fetching regulations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch available regulations',
      message: error.message 
    });
  }
});

// Analyze compliance endpoint
router.post('/', async (req, res) => {
  try {
    const { documentId, regulations } = req.body;

    // Validate input
    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }

    // Check if document exists in session
    const document = req.session.documents[documentId];
    if (!document) {
      return res.status(404).json({ error: 'Document not found. Please upload a document first.' });
    }

    // If no regulations specified, use all available regulations
    let targetRegulations = regulations;
    if (!targetRegulations || targetRegulations.length === 0) {
      const availableRegulations = await regulatoryAnalyzer.getAvailableRegulations();
      targetRegulations = availableRegulations.map(r => r.id);
      console.log('Using all available regulations:', targetRegulations);
    }

    // Load and parse regulatory requirements
    const regulatoryRequirements = await regulatoryAnalyzer.loadRegulations(targetRegulations);

    // Perform gap analysis
    const analysisResult = await gapAnalysis.analyzeCompliance(
      document.content,
      regulatoryRequirements,
      document.metadata.documentType
    );

    // Store analysis results in session
    req.session.analysisResults[documentId] = {
      ...analysisResult,
      analyzedAt: new Date(),
      documentName: document.name,
      regulations: targetRegulations
    };

    res.json({
      success: true,
      documentId: documentId,
      documentName: document.name,
      analysis: analysisResult
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze document',
      message: error.message 
    });
  }
});

// Get analysis results for a document
router.get('/:documentId', (req, res) => {
  const { documentId } = req.params;
  
  if (req.session.analysisResults && req.session.analysisResults[documentId]) {
    res.json({
      success: true,
      analysis: req.session.analysisResults[documentId]
    });
  } else {
    res.status(404).json({ 
      error: 'No analysis found for this document' 
    });
  }
});

// Generate remediation report
router.post('/remediation/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const analysisResult = req.session.analysisResults[documentId];
    if (!analysisResult) {
      return res.status(404).json({ error: 'No analysis found for this document' });
    }

    // Generate remediation recommendations
    const remediation = await gapAnalysis.generateRemediation(analysisResult.gaps);

    res.json({
      success: true,
      documentId: documentId,
      documentName: analysisResult.documentName,
      remediation: remediation
    });

  } catch (error) {
    console.error('Remediation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate remediation plan',
      message: error.message 
    });
  }
});

module.exports = router;
