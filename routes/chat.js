const express = require('express');
const aiService = require('../services/aiService');
const regulatoryAnalyzer = require('../services/regulatoryAnalyzer');

const router = express.Router();

// Chat endpoint
router.post('/', async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Gather context from session
    const sessionContext = {
      uploadedDocuments: Object.keys(req.session.documents || {}).length,
      analysisResults: req.session.analysisResults || {},
      specificContext: context || 'general'
    };

    // Load relevant regulatory knowledge
    const regulatoryContext = await regulatoryAnalyzer.getRelevantRegulations(message);

    // Get AI response
    const response = await aiService.answerComplianceQuestion(
      message,
      sessionContext,
      regulatoryContext
    );

    res.json({
      success: true,
      message: message,
      response: response
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat request',
      message: error.message 
    });
  }
});

// Get chat suggestions based on current context
router.get('/suggestions', (req, res) => {
  const hasDocuments = Object.keys(req.session.documents || {}).length > 0;
  const hasAnalysis = Object.keys(req.session.analysisResults || {}).length > 0;

  const suggestions = [
    "What are the key GDPR requirements for data processing?",
    "Explain the main obligations under the EU AI Act",
    "What are the penalties for non-compliance with financial regulations?"
  ];

  if (hasDocuments && !hasAnalysis) {
    suggestions.unshift("Analyze my uploaded documents for compliance gaps");
  }

  if (hasAnalysis) {
    suggestions.unshift("What are my highest risk compliance gaps?");
    suggestions.unshift("Generate an action plan for GDPR compliance");
  }

  res.json({
    suggestions: suggestions.slice(0, 5)
  });
});

module.exports = router;
