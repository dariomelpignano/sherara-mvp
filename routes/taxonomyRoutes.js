const express = require('express');
const router = express.Router();
const taxonomyService = require('../services/taxonomyService');

// Get all available tags and taxonomy structure
router.get('/tags', (req, res) => {
  try {
    const tags = taxonomyService.getAllTags();
    res.json({
      success: true,
      data: tags
    });
  } catch (error) {
    console.error('Error getting tags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve taxonomy tags'
    });
  }
});

// Get tags by category
router.get('/tags/:category', (req, res) => {
  try {
    const { category } = req.params;
    const tags = taxonomyService.getTagsByCategory(category);
    res.json({
      success: true,
      data: tags
    });
  } catch (error) {
    console.error('Error getting tags by category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve category tags'
    });
  }
});

// Auto-classify a document
router.post('/classify', async (req, res) => {
  try {
    const { documentId, content, filename, documentType } = req.body;
    
    if (!content || !filename) {
      return res.status(400).json({
        success: false,
        error: 'Document content and filename are required'
      });
    }

    const classification = await taxonomyService.classifyDocument(content, filename, documentType);
    
    // Store classification in session if documentId provided
    if (documentId && req.session.documents && req.session.documents[documentId]) {
      req.session.documents[documentId].autoClassification = classification;
    }

    res.json({
      success: true,
      data: classification
    });
  } catch (error) {
    console.error('Error classifying document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to classify document'
    });
  }
});

// Apply tags to a document
router.post('/documents/:documentId/tags', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { tags } = req.body;

    if (!req.session.documents) {
      req.session.documents = {};
    }

    if (!req.session.documents[documentId]) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    const updatedDocument = await taxonomyService.applyTagsToDocument(documentId, tags, req.session);
    
    res.json({
      success: true,
      data: updatedDocument
    });
  } catch (error) {
    console.error('Error applying tags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply tags to document'
    });
  }
});

// Get document tags
router.get('/documents/:documentId/tags', (req, res) => {
  try {
    const { documentId } = req.params;

    if (!req.session.documents || !req.session.documents[documentId]) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    const document = req.session.documents[documentId];
    const tags = document.tags || {};
    const autoClassification = document.autoClassification || {};

    res.json({
      success: true,
      data: {
        tags,
        autoClassification
      }
    });
  } catch (error) {
    console.error('Error getting document tags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve document tags'
    });
  }
});

// Search documents by tags
router.post('/search', (req, res) => {
  try {
    const { searchCriteria } = req.body;

    if (!req.session.documents) {
      return res.json({
        success: true,
        data: []
      });
    }

    const results = taxonomyService.searchByTags(req.session.documents, searchCriteria);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error searching documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search documents'
    });
  }
});

// Generate taxonomy report
router.get('/report', (req, res) => {
  try {
    const documents = req.session.documents || {};
    const report = taxonomyService.generateTaxonomyReport(documents);
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating taxonomy report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate taxonomy report'
    });
  }
});

// Auto-tag all documents in session
router.post('/auto-tag-all', async (req, res) => {
  try {
    if (!req.session.documents) {
      return res.json({
        success: true,
        data: { processed: 0, updated: 0 }
      });
    }

    let processed = 0;
    let updated = 0;

    for (const [documentId, document] of Object.entries(req.session.documents)) {
      if (document.content && document.filename) {
        processed++;
        
        try {
          const classification = await taxonomyService.classifyDocument(
            document.content,
            document.filename,
            document.type
          );
          
          // Apply auto-classification as tags if confidence is high enough
          if (classification.confidence > 0.3) {
            await taxonomyService.applyTagsToDocument(documentId, classification, req.session);
            updated++;
          }
          
          // Store auto-classification for manual review
          document.autoClassification = classification;
        } catch (error) {
          console.error(`Error auto-tagging document ${documentId}:`, error);
        }
      }
    }

    res.json({
      success: true,
      data: {
        processed,
        updated,
        message: `Processed ${processed} documents, auto-tagged ${updated} documents`
      }
    });
  } catch (error) {
    console.error('Error auto-tagging documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to auto-tag documents'
    });
  }
});

// Get taxonomy statistics
router.get('/stats', (req, res) => {
  try {
    const documents = req.session.documents || {};
    const report = taxonomyService.generateTaxonomyReport(documents);
    
    const stats = {
      totalDocuments: report.totalDocuments,
      taggedDocuments: report.taggedDocuments,
      untaggedDocuments: report.untaggedDocuments,
      taggedPercentage: report.totalDocuments > 0 ? 
        Math.round((report.taggedDocuments / report.totalDocuments) * 100) : 0,
      topCategories: Object.entries(report.categoryDistribution)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([category, count]) => ({ category, count })),
      riskDistribution: report.riskDistribution,
      regulatoryCoverage: Object.entries(report.regulatoryCoverage)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([regulation, count]) => ({ regulation, count }))
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting taxonomy stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve taxonomy statistics'
    });
  }
});

module.exports = router;