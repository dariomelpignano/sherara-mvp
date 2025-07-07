const express = require('express');
const aiService = require('../services/aiService');
const regulatoryAnalyzer = require('../services/regulatoryAnalyzer');

const router = express.Router();

// Chat endpoint
router.post('/', async (req, res) => {
  try {
    let { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Extract document ID if present in message
    let documentContext = null;
    const docMatch = message.match(/\[Document uploaded: ([^\]]+)\]/);
    if (docMatch) {
      const documentId = docMatch[1];
      message = message.replace(docMatch[0], '').trim();
      
      // Get document from session
      if (req.session.documents && req.session.documents[documentId]) {
        documentContext = {
          documentId: documentId,
          document: req.session.documents[documentId],
          content: req.session.documents[documentId].content
        };
      }
    }

    // Gather context from session
    const sessionContext = {
      uploadedDocuments: Object.keys(req.session.documents || {}).length,
      analysisResults: req.session.analysisResults || {},
      specificContext: context || 'general',
      currentDocument: documentContext
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
  
  // Detect language from Accept-Language header or default to English
  const acceptLanguage = req.headers['accept-language'] || 'en';
  const language = detectLanguageFromHeader(acceptLanguage);

  const suggestions = getLocalizedSuggestions(language, hasDocuments, hasAnalysis);

  res.json({
    suggestions: suggestions.slice(0, 5)
  });
});

// Helper function to detect language from Accept-Language header
function detectLanguageFromHeader(acceptLanguage) {
  const supportedLanguages = ['it', 'es', 'fr', 'de', 'en'];
  
  // Parse Accept-Language header (e.g., "it-IT,it;q=0.9,en;q=0.8")
  const languages = acceptLanguage.split(',').map(lang => {
    const [code, quality] = lang.trim().split(';q=');
    return {
      code: code.split('-')[0].toLowerCase(),
      quality: quality ? parseFloat(quality) : 1.0
    };
  }).sort((a, b) => b.quality - a.quality);

  // Find the first supported language
  for (const lang of languages) {
    if (supportedLanguages.includes(lang.code)) {
      return lang.code;
    }
  }
  
  return 'en'; // Default to English
}

// Get localized suggestions based on language and context
function getLocalizedSuggestions(language, hasDocuments, hasAnalysis) {
  const baseSuggestions = {
    'en': [
      "What are the key GDPR requirements for data processing?",
      "Explain the main obligations under the EU AI Act",
      "What are the penalties for non-compliance with financial regulations?"
    ],
    'it': [
      "Quali sono i requisiti chiave del GDPR per l'elaborazione dei dati?",
      "Spiega i principali obblighi dell'AI Act UE",
      "Quali sono le sanzioni per la non conformità alle normative finanziarie?"
    ],
    'es': [
      "¿Cuáles son los requisitos clave del RGPD para el procesamiento de datos?",
      "Explica las principales obligaciones bajo la Ley de IA de la UE",
      "¿Cuáles son las sanciones por incumplimiento de las regulaciones financieras?"
    ],
    'fr': [
      "Quelles sont les exigences clés du RGPD pour le traitement des données?",
      "Expliquez les principales obligations sous la Loi sur l'IA de l'UE",
      "Quelles sont les sanctions pour non-conformité aux réglementations financières?"
    ],
    'de': [
      "Was sind die wichtigsten DSGVO-Anforderungen für die Datenverarbeitung?",
      "Erklären Sie die Hauptpflichten unter dem EU-KI-Gesetz",
      "Was sind die Strafen für Nichteinhaltung von Finanzvorschriften?"
    ]
  };

  const contextSuggestions = {
    'en': {
      documentsOnly: "Analyze my uploaded documents for compliance gaps",
      withAnalysis: [
        "What are my highest risk compliance gaps?",
        "Generate an action plan for GDPR compliance"
      ]
    },
    'it': {
      documentsOnly: "Analizza i miei documenti caricati per gap di conformità",
      withAnalysis: [
        "Quali sono i miei gap di conformità ad alto rischio?",
        "Genera un piano d'azione per la conformità GDPR"
      ]
    },
    'es': {
      documentsOnly: "Analiza mis documentos subidos para brechas de cumplimiento",
      withAnalysis: [
        "¿Cuáles son mis brechas de cumplimiento de mayor riesgo?",
        "Genera un plan de acción para el cumplimiento del RGPD"
      ]
    },
    'fr': {
      documentsOnly: "Analysez mes documents téléchargés pour les lacunes de conformité",
      withAnalysis: [
        "Quelles sont mes lacunes de conformité les plus risquées?",
        "Générez un plan d'action pour la conformité RGPD"
      ]
    },
    'de': {
      documentsOnly: "Analysieren Sie meine hochgeladenen Dokumente für Compliance-Lücken",
      withAnalysis: [
        "Was sind meine höchsten Risiko-Compliance-Lücken?",
        "Erstellen Sie einen Aktionsplan für DSGVO-Compliance"
      ]
    }
  };

  let suggestions = [...(baseSuggestions[language] || baseSuggestions['en'])];

  if (hasDocuments && !hasAnalysis) {
    suggestions.unshift(contextSuggestions[language]?.documentsOnly || contextSuggestions['en'].documentsOnly);
  }

  if (hasAnalysis) {
    const contextSuggs = contextSuggestions[language]?.withAnalysis || contextSuggestions['en'].withAnalysis;
    suggestions.unshift(...contextSuggs);
  }

  return suggestions;
}

module.exports = router;
