const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const documentParser = require('../services/documentParser');
const taxonomyService = require('../services/taxonomyService');

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'text/plain', 
                         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                         'application/msword'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'));
    }
  }
});

// Upload endpoint
router.post('/', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const documentId = uuidv4();
    const { originalname, mimetype, buffer } = req.file;

    // Parse the document content
    const parsedContent = await documentParser.parseDocument(buffer, mimetype);

    // Auto-classify the document
    const classification = await taxonomyService.classifyDocument(
      parsedContent,
      originalname,
      req.body.documentType || 'internal_policy'
    );

    // Store in session
    req.session.documents[documentId] = {
      id: documentId,
      name: originalname,
      filename: originalname,
      type: mimetype,
      content: parsedContent,
      uploadedAt: new Date(),
      metadata: {
        wordCount: parsedContent.split(/\s+/).length,
        documentType: req.body.documentType || 'internal_policy'
      },
      autoClassification: classification,
      tags: classification.confidence > 0.3 ? classification : {} // Auto-apply tags if confidence is high
    };

    res.json({
      success: true,
      documentId: documentId,
      filename: originalname,
      wordCount: req.session.documents[documentId].metadata.wordCount,
      classification: classification,
      message: 'Document uploaded, parsed, and classified successfully'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload document',
      message: error.message 
    });
  }
});

// Get uploaded documents list
router.get('/list', (req, res) => {
  const documents = Object.values(req.session.documents || {}).map(doc => ({
    id: doc.id,
    name: doc.name,
    type: doc.type,
    uploadedAt: doc.uploadedAt,
    wordCount: doc.metadata.wordCount
  }));

  res.json({
    documents: documents,
    count: documents.length
  });
});

// Delete document
router.delete('/:documentId', (req, res) => {
  const { documentId } = req.params;
  
  if (req.session.documents && req.session.documents[documentId]) {
    delete req.session.documents[documentId];
    
    // Also remove any analysis results for this document
    if (req.session.analysisResults && req.session.analysisResults[documentId]) {
      delete req.session.analysisResults[documentId];
    }
    
    res.json({ 
      success: true, 
      message: 'Document deleted successfully' 
    });
  } else {
    res.status(404).json({ 
      error: 'Document not found' 
    });
  }
});

module.exports = router;
