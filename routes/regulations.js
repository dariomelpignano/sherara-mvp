const express = require('express');
const regulationSources = require('../services/regulationSources');
const regulatoryAnalyzer = require('../services/regulatoryAnalyzer');

const router = express.Router();

// Get all regulation sources
router.get('/sources', async (req, res) => {
  try {
    const sources = await regulationSources.getSources();
    res.json({
      success: true,
      sources: sources
    });
  } catch (error) {
    console.error('Error fetching sources:', error);
    res.status(500).json({
      error: 'Failed to fetch regulation sources',
      message: error.message
    });
  }
});

// Get specific source
router.get('/sources/:sourceId', async (req, res) => {
  try {
    const source = await regulationSources.getSource(req.params.sourceId);
    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }
    res.json({
      success: true,
      source: source
    });
  } catch (error) {
    console.error('Error fetching source:', error);
    res.status(500).json({
      error: 'Failed to fetch source',
      message: error.message
    });
  }
});

// Activate a source
router.post('/sources/:sourceId/activate', async (req, res) => {
  try {
    const result = await regulationSources.activateSource(req.params.sourceId);
    res.json(result);
  } catch (error) {
    console.error('Error activating source:', error);
    res.status(500).json({
      error: 'Failed to activate source',
      message: error.message
    });
  }
});

// Deactivate a source
router.post('/sources/:sourceId/deactivate', async (req, res) => {
  try {
    const result = await regulationSources.deactivateSource(req.params.sourceId);
    res.json(result);
  } catch (error) {
    console.error('Error deactivating source:', error);
    res.status(500).json({
      error: 'Failed to deactivate source',
      message: error.message
    });
  }
});

// Sync regulations from a source
router.post('/sync', async (req, res) => {
  try {
    const { sourceId } = req.body;
    if (!sourceId) {
      return res.status(400).json({ error: 'Source ID is required' });
    }
    
    const result = await regulationSources.syncSource(sourceId);
    
    // Trigger re-discovery of regulations after sync
    await regulatoryAnalyzer.discoverRegulations();
    
    res.json(result);
  } catch (error) {
    console.error('Error syncing source:', error);
    res.status(500).json({
      error: 'Failed to sync regulations',
      message: error.message
    });
  }
});

// Add custom source
router.post('/sources', async (req, res) => {
  try {
    const result = await regulationSources.addCustomSource(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error adding source:', error);
    res.status(500).json({
      error: 'Failed to add custom source',
      message: error.message
    });
  }
});

// Update source
router.put('/sources/:sourceId', async (req, res) => {
  try {
    const result = await regulationSources.updateSource(req.params.sourceId, req.body);
    res.json(result);
  } catch (error) {
    console.error('Error updating source:', error);
    res.status(500).json({
      error: 'Failed to update source',
      message: error.message
    });
  }
});

// Delete custom source
router.delete('/sources/:sourceId', async (req, res) => {
  try {
    const result = await regulationSources.deleteSource(req.params.sourceId);
    res.json(result);
  } catch (error) {
    console.error('Error deleting source:', error);
    res.status(500).json({
      error: 'Failed to delete source',
      message: error.message
    });
  }
});

module.exports = router;