const OpenAI = require('openai');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async analyzeRequirementCompliance(documentContent, requirement, documentType) {
    try {
      const prompt = `
You are a regulatory compliance expert. Analyze the following document content to determine if it meets the specified regulatory requirement.

Regulatory Requirement:
- Regulation: ${requirement.regulation}
- Requirement: ${requirement.title}
- Description: ${requirement.description}
- Category: ${requirement.category}

Document Type: ${documentType}

Document Content (excerpt):
${documentContent.substring(0, 3000)}...

IMPORTANT: You must respond with ONLY a valid JSON object. Do not include any other text, explanations, or formatting. The JSON must have exactly this structure:

{
  "status": "compliant",
  "evidence": "specific text from document that addresses the requirement",
  "gaps": "what is missing or needs improvement (or 'None' if compliant)",
  "recommendation": "specific action to achieve compliance"
}

The status must be exactly one of: "compliant", "partially-compliant", or "non-compliant"
Focus on being accurate and specific. If the document doesn't address the requirement at all, mark it as non-compliant.
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a regulatory compliance expert specializing in EU regulations including GDPR, AI Act, and financial compliance. You must ALWAYS respond with valid JSON only - no additional text, explanations, or formatting. Provide accurate, specific analysis in the requested JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent analysis
        max_tokens: 500
      });

      const content = response.choices[0].message.content.trim();
      
      // Try to parse as JSON, fallback to structured response if needed
      try {
        // First try direct JSON parsing
        return JSON.parse(content);
      } catch (parseError) {
        // Only log if we're having persistent issues
        console.warn('AI response parsing issue - attempting recovery methods');
        
        // Try to extract JSON from markdown code blocks or other formatting
        const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          try {
            return JSON.parse(jsonMatch[1]);
          } catch (innerParseError) {
            // Continue to next method
          }
        }
        
        // Try to find JSON-like structure anywhere in the text
        const jsonLikeMatch = content.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
        if (jsonLikeMatch) {
          try {
            return JSON.parse(jsonLikeMatch[0]);
          } catch (innerParseError) {
            // Continue to next method
          }
        }
        
        // If all JSON parsing fails, use text parsing
        console.warn('JSON parsing failed, using text analysis fallback');
        return this.parseTextResponse(content);
      }

    } catch (error) {
      console.error('AI analysis error:', error);
      
      // Check if it's an API key issue
      if (error.message && error.message.includes('API key')) {
        return {
          status: 'non-compliant',
          evidence: 'Analysis performed using rule-based method',
          gaps: 'AI analysis unavailable - using fallback analysis',
          recommendation: `Review document for ${requirement.title} compliance manually`
        };
      }
      
      // Fallback analysis without AI
      return this.fallbackAnalysis(documentContent, requirement);
    }
  }

  // Language detection utility
  detectLanguage(text) {
    const languagePatterns = {
      'it': [
        /\b(il|la|le|gli|dello|della|dei|delle|un|una|uno|che|chi|quando|dove|come|perché|perchè|cosa|cose|sono|è|siamo|siete|hanno|ha|abbiamo|avete|questo|questa|questi|queste|quello|quella|quelli|quelle)\b/gi,
        /\b(e|o|ma|però|quindi|allora|infatti|inoltre|tuttavia|comunque|anche|ancora|già|sempre|mai|molto|poco|tanto|troppo|più|meno)\b/gi,
        /\b(compliance|regolamento|normativa|privacy|dati|sicurezza|protezione|conformità|analisi|documenti|documento|carica|aiuto|assistenza|domanda|risposta)\b/gi
      ],
      'es': [
        /\b(el|la|los|las|un|una|unos|unas|que|quien|cuando|donde|como|por|para|que|qué|esto|esta|estos|estas|eso|esa|esos|esas)\b/gi,
        /\b(y|o|pero|sin|embargo|entonces|además|también|siempre|nunca|muy|poco|más|menos|todo|nada|algo|alguien|nadie)\b/gi,
        /\b(cumplimiento|regulación|normativa|privacidad|datos|seguridad|protección|análisis|documentos|documento|ayuda|asistencia|pregunta|respuesta)\b/gi
      ],
      'fr': [
        /\b(le|la|les|un|une|des|du|de|que|qui|quand|où|comment|pourquoi|quoi|ce|cette|ces|cet|celui|celle|ceux|celles)\b/gi,
        /\b(et|ou|mais|donc|car|ni|or|ainsi|aussi|encore|déjà|toujours|jamais|très|peu|plus|moins|tout|rien|quelque|quelqu'un|personne)\b/gi,
        /\b(conformité|règlement|réglementation|confidentialité|données|sécurité|protection|analyse|documents|document|aide|assistance|question|réponse)\b/gi
      ],
      'de': [
        /\b(der|die|das|den|dem|des|ein|eine|eines|einem|einen|einer|und|oder|aber|doch|jedoch|dann|also|auch|noch|schon|immer|nie|sehr|wenig|mehr|weniger|alles|nichts|etwas|jemand|niemand)\b/gi,
        /\b(was|wer|wann|wo|wie|warum|welche|welcher|welches|dieser|diese|dieses|jener|jene|jenes)\b/gi,
        /\b(compliance|verordnung|vorschrift|datenschutz|daten|sicherheit|schutz|analyse|dokumente|dokument|hilfe|unterstützung|frage|antwort)\b/gi
      ]
    };

    const scores = {};
    
    for (const [lang, patterns] of Object.entries(languagePatterns)) {
      scores[lang] = 0;
      for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
          scores[lang] += matches.length;
        }
      }
      // Normalize by text length
      scores[lang] = scores[lang] / (text.length / 100);
    }

    // Add simple character-based detection
    if (/[àèéìíîòóùúñü]/gi.test(text)) {
      if (/[àèéòù]/gi.test(text)) scores.it = (scores.it || 0) + 2;
      if (/[ñü]/gi.test(text)) scores.es = (scores.es || 0) + 2;
      if (/[àèéêëïîôöùûüÿç]/gi.test(text)) scores.fr = (scores.fr || 0) + 2;
      if (/[äöüß]/gi.test(text)) scores.de = (scores.de || 0) + 2;
    }

    // Find the language with highest score
    const detectedLang = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
    
    // Return detected language if confidence is high enough, otherwise default to English
    return scores[detectedLang] > 1 ? detectedLang : 'en';
  }

  // Get language-specific system prompt
  getLanguageSystemPrompt(language) {
    const prompts = {
      'it': 'Sei Sherara, un assistente AI esperto in conformità normativa specializzato nelle normative UE. Fornisci risposte chiare e utili in italiano, essendo accurato e professionale.',
      'es': 'Eres Sherara, un asistente de IA experto en cumplimiento normativo especializado en regulaciones de la UE. Proporciona respuestas claras y útiles en español, siendo preciso y profesional.',
      'fr': 'Vous êtes Sherara, un assistant IA expert en conformité réglementaire spécialisé dans les réglementations de l\'UE. Fournissez des réponses claires et utiles en français, en étant précis et professionnel.',
      'de': 'Sie sind Sherara, ein KI-Assistent für regulatorische Compliance, spezialisiert auf EU-Vorschriften. Geben Sie klare und hilfreiche Antworten auf Deutsch, seien Sie präzise und professionell.',
      'en': 'You are Sherara, an expert AI compliance assistant specializing in EU regulations. Provide clear, actionable guidance while being accurate and helpful.'
    };
    
    return prompts[language] || prompts['en'];
  }

  // Get language-specific prompt prefix
  getLanguagePromptPrefix(language) {
    const prefixes = {
      'it': 'Rispondi in italiano. ',
      'es': 'Responde en español. ',
      'fr': 'Répondez en français. ',
      'de': 'Antworten Sie auf Deutsch. ',
      'en': ''
    };
    
    return prefixes[language] || '';
  }

  async answerComplianceQuestion(question, sessionContext, regulatoryContext) {
    try {
      // Detect the language of the user's question
      const detectedLanguage = this.detectLanguage(question);
      
      // Build context from session and regulations
      const contextInfo = this.buildContextInfo(sessionContext, regulatoryContext);

      // Create language-appropriate prompt
      const languagePrefix = this.getLanguagePromptPrefix(detectedLanguage);
      const prompt = `${languagePrefix}

Domanda: ${question}

Contesto:
${contextInfo}

Fornisci una risposta utile, accurata e pratica. Se la domanda riguarda documenti caricati o risultati di analisi, fai riferimento specifico ad essi. Se hai bisogno di più informazioni per fornire una risposta completa, menziona quali dettagli aggiuntivi sarebbero utili.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: this.getLanguageSystemPrompt(detectedLanguage)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 800
      });

      return response.choices[0].message.content;

    } catch (error) {
      console.error('AI chat error:', error);
      
      // Provide a helpful fallback response in the detected language
      const detectedLanguage = this.detectLanguage(question);
      return this.generateFallbackResponse(question, regulatoryContext, detectedLanguage);
    }
  }

  buildContextInfo(sessionContext, regulatoryContext) {
    let context = '';

    // Add document context
    if (sessionContext.uploadedDocuments > 0) {
      context += `\nUploaded Documents: ${sessionContext.uploadedDocuments} document(s) in current session`;
    }

    // Add analysis results summary
    const analysisCount = Object.keys(sessionContext.analysisResults).length;
    if (analysisCount > 0) {
      context += `\nCompliance Analyses Performed: ${analysisCount}`;
      
      // Add summary of gaps
      let totalGaps = 0;
      Object.values(sessionContext.analysisResults).forEach(result => {
        if (result.gaps) totalGaps += result.gaps.length;
      });
      context += `\nTotal Compliance Gaps Identified: ${totalGaps}`;
    }

    // Add relevant regulations
    if (regulatoryContext && regulatoryContext.length > 0) {
      context += '\n\nRelevant Regulations:';
      regulatoryContext.forEach(reg => {
        context += `\n- ${reg.regulation}: ${reg.title}`;
      });
    }

    return context || 'No specific context available.';
  }

  parseTextResponse(text) {
    // Basic parsing of text response to create structured data
    const response = {
      status: 'non-compliant',
      evidence: '',
      gaps: 'AI analysis completed but response format needs improvement',
      recommendation: 'Manual review required'
    };

    // Look for keywords to determine status
    const textLower = text.toLowerCase();
    if (textLower.includes('compliant') && !textLower.includes('non-compliant')) {
      response.status = 'compliant';
      response.gaps = 'Document appears to meet the requirement';
    } else if (textLower.includes('partially')) {
      response.status = 'partially-compliant';
      response.gaps = 'Document partially addresses the requirement';
    }

    // Try to extract structured information from the text
    // Look for evidence section
    const evidenceMatch = text.match(/evidence[:\s]+([^.]+(?:\.[^.]*)*)/i);
    if (evidenceMatch) {
      response.evidence = evidenceMatch[1].trim();
    } else {
      // Try to extract the first meaningful sentence as evidence
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
      if (sentences.length > 0) {
        response.evidence = sentences[0].trim();
      }
    }

    // Look for gaps/issues
    const gapsMatch = text.match(/gaps?[:\s]+([^.]+(?:\.[^.]*)*)/i);
    if (gapsMatch) {
      response.gaps = gapsMatch[1].trim();
    } else if (textLower.includes('missing') || textLower.includes('lacks') || textLower.includes('insufficient')) {
      // Extract context around these keywords
      const issueMatch = text.match(/(?:missing|lacks|insufficient)[^.]+/i);
      if (issueMatch) {
        response.gaps = issueMatch[0].trim();
      }
    }

    // Look for recommendations
    const recommendationMatch = text.match(/recommend[:\s]+([^.]+(?:\.[^.]*)*)/i);
    if (recommendationMatch) {
      response.recommendation = recommendationMatch[1].trim();
    } else {
      // Generate a basic recommendation based on status
      if (response.status === 'compliant') {
        response.recommendation = 'Continue current practices and monitor for changes';
      } else if (response.status === 'partially-compliant') {
        response.recommendation = 'Review and enhance current implementation';
      } else {
        response.recommendation = 'Implement comprehensive policies and procedures';
      }
    }

    return response;
  }

  fallbackAnalysis(documentContent, requirement) {
    // Simple keyword-based analysis as fallback
    const docLower = documentContent.toLowerCase();
    const keywords = requirement.keywords || [];
    const matchedKeywords = keywords.filter(keyword => docLower.includes(keyword.toLowerCase()));

    if (matchedKeywords.length >= keywords.length * 0.7) {
      return {
        status: 'partially-compliant',
        evidence: 'Document contains relevant keywords',
        gaps: 'Detailed analysis required',
        recommendation: `Review document sections related to ${requirement.title}`
      };
    } else if (matchedKeywords.length > 0) {
      return {
        status: 'non-compliant',
        evidence: 'Limited relevant content found',
        gaps: `Missing comprehensive coverage of ${requirement.title}`,
        recommendation: `Implement policies and procedures for ${requirement.title}`
      };
    }

    return {
      status: 'non-compliant',
      evidence: 'No relevant content found',
      gaps: `No implementation of ${requirement.title} requirements`,
      recommendation: `Develop and implement ${requirement.category} policies addressing ${requirement.title}`
    };
  }

  generateFallbackResponse(question, regulatoryContext, language = 'en') {
    const questionLower = question.toLowerCase();

    // Define responses in multiple languages
    const responses = {
      gdpr: {
        'en': `GDPR (General Data Protection Regulation) establishes comprehensive data protection requirements for organizations processing personal data of EU residents. Key obligations include:

1. Lawful basis for processing
2. Data subject rights (access, erasure, portability)
3. Privacy by design and default
4. Data protection impact assessments
5. Breach notification within 72 hours

To ensure GDPR compliance, I recommend reviewing your data processing activities and implementing appropriate technical and organizational measures.`,
        'it': `Il GDPR (Regolamento Generale sulla Protezione dei Dati) stabilisce requisiti completi per la protezione dei dati per le organizzazioni che elaborano dati personali di residenti UE. Gli obblighi principali includono:

1. Base giuridica per l'elaborazione
2. Diritti dell'interessato (accesso, cancellazione, portabilità)
3. Privacy by design e by default
4. Valutazioni d'impatto sulla protezione dei dati
5. Notifica delle violazioni entro 72 ore

Per garantire la conformità GDPR, raccomando di rivedere le vostre attività di elaborazione dati e implementare misure tecniche e organizzative appropriate.`,
        'es': `El RGPD (Reglamento General de Protección de Datos) establece requisitos completos de protección de datos para organizaciones que procesan datos personales de residentes de la UE. Las obligaciones clave incluyen:

1. Base legal para el procesamiento
2. Derechos del interesado (acceso, supresión, portabilidad)
3. Privacidad por diseño y por defecto
4. Evaluaciones de impacto en la protección de datos
5. Notificación de brechas dentro de 72 horas

Para asegurar el cumplimiento del RGPD, recomiendo revisar sus actividades de procesamiento de datos e implementar medidas técnicas y organizativas apropiadas.`,
        'fr': `Le RGPD (Règlement Général sur la Protection des Données) établit des exigences complètes de protection des données pour les organisations traitant des données personnelles de résidents de l'UE. Les obligations clés incluent:

1. Base légale pour le traitement
2. Droits de la personne concernée (accès, effacement, portabilité)
3. Protection de la vie privée dès la conception et par défaut
4. Analyses d'impact sur la protection des données
5. Notification des violations dans les 72 heures

Pour assurer la conformité au RGPD, je recommande d'examiner vos activités de traitement des données et d'implémenter des mesures techniques et organisationnelles appropriées.`,
        'de': `Die DSGVO (Datenschutz-Grundverordnung) legt umfassende Datenschutzanforderungen für Organisationen fest, die personenbezogene Daten von EU-Bürgern verarbeiten. Wesentliche Pflichten umfassen:

1. Rechtsgrundlage für die Verarbeitung
2. Betroffenenrechte (Zugang, Löschung, Übertragbarkeit)
3. Datenschutz durch Technikgestaltung und durch datenschutzfreundliche Voreinstellungen
4. Datenschutz-Folgenabschätzungen
5. Meldung von Datenschutzverletzungen binnen 72 Stunden

Zur DSGVO-Compliance empfehle ich, Ihre Datenverarbeitungsaktivitäten zu überprüfen und angemessene technische und organisatorische Maßnahmen zu implementieren.`
      },
      aiact: {
        'en': `The EU AI Act establishes requirements for AI systems based on risk levels:

1. Prohibited AI practices (e.g., social scoring)
2. High-risk AI systems require conformity assessments
3. Limited risk systems need transparency obligations
4. Minimal risk systems have voluntary codes of conduct

Organizations developing or deploying AI should assess their systems' risk levels and implement appropriate compliance measures.`,
        'it': `L'AI Act UE stabilisce requisiti per i sistemi AI basati sui livelli di rischio:

1. Pratiche AI proibite (es. punteggio sociale)
2. Sistemi AI ad alto rischio richiedono valutazioni di conformità
3. Sistemi a rischio limitato necessitano obblighi di trasparenza
4. Sistemi a rischio minimo hanno codici di condotta volontari

Le organizzazioni che sviluppano o implementano AI dovrebbero valutare i livelli di rischio dei loro sistemi e implementare misure di conformità appropriate.`,
        'es': `La Ley de IA de la UE establece requisitos para sistemas de IA basados en niveles de riesgo:

1. Prácticas de IA prohibidas (ej. puntuación social)
2. Sistemas de IA de alto riesgo requieren evaluaciones de conformidad
3. Sistemas de riesgo limitado necesitan obligaciones de transparencia
4. Sistemas de riesgo mínimo tienen códigos de conducta voluntarios

Las organizaciones que desarrollan o implementan IA deben evaluar los niveles de riesgo de sus sistemas e implementar medidas de cumplimiento apropiadas.`,
        'fr': `La Loi sur l'IA de l'UE établit des exigences pour les systèmes d'IA basées sur les niveaux de risque:

1. Pratiques d'IA interdites (ex. notation sociale)
2. Les systèmes d'IA à haut risque nécessitent des évaluations de conformité
3. Les systèmes à risque limité ont des obligations de transparence
4. Les systèmes à risque minimal ont des codes de conduite volontaires

Les organisations développant ou déployant l'IA doivent évaluer les niveaux de risque de leurs systèmes et implémenter des mesures de conformité appropriées.`,
        'de': `Das EU-KI-Gesetz legt Anforderungen für KI-Systeme basierend auf Risikoebenen fest:

1. Verbotene KI-Praktiken (z.B. Social Scoring)
2. Hochrisiko-KI-Systeme benötigen Konformitätsbewertungen
3. Systeme mit begrenztem Risiko haben Transparenzpflichten
4. Systeme mit minimalem Risiko haben freiwillige Verhaltenskodizes

Organisationen, die KI entwickeln oder einsetzen, sollten die Risikoebenen ihrer Systeme bewerten und angemessene Compliance-Maßnahmen implementieren.`
      },
      analysis: {
        'en': `To identify compliance gaps:

1. Upload your internal policies and procedures
2. Run a compliance analysis against relevant regulations
3. Review the identified gaps sorted by risk level
4. Implement recommended remediation actions

Would you like me to analyze any specific documents you've uploaded?`,
        'it': `Per identificare gap di conformità:

1. Carica le tue politiche e procedure interne
2. Esegui un'analisi di conformità contro le normative pertinenti
3. Rivedi i gap identificati ordinati per livello di rischio
4. Implementa le azioni di rimedio raccomandate

Vorresti che analizzi qualche documento specifico che hai caricato?`,
        'es': `Para identificar brechas de cumplimiento:

1. Sube tus políticas y procedimientos internos
2. Ejecuta un análisis de cumplimiento contra regulaciones relevantes
3. Revisa las brechas identificadas ordenadas por nivel de riesgo
4. Implementa las acciones de remediación recomendadas

¿Te gustaría que analice algún documento específico que hayas subido?`,
        'fr': `Pour identifier les lacunes de conformité:

1. Téléchargez vos politiques et procédures internes
2. Effectuez une analyse de conformité contre les réglementations pertinentes
3. Examinez les lacunes identifiées triées par niveau de risque
4. Implémentez les actions de remédiation recommandées

Souhaiteriez-vous que j'analyse des documents spécifiques que vous avez téléchargés?`,
        'de': `Um Compliance-Lücken zu identifizieren:

1. Laden Sie Ihre internen Richtlinien und Verfahren hoch
2. Führen Sie eine Compliance-Analyse gegen relevante Vorschriften durch
3. Überprüfen Sie die identifizierten Lücken sortiert nach Risikoebene
4. Implementieren Sie empfohlene Abhilfemaßnahmen

Möchten Sie, dass ich spezifische Dokumente analysiere, die Sie hochgeladen haben?`
      },
      generic: {
        'en': `I understand you're asking about: "${question}"

While I cannot access external AI services at the moment, I can help you with:
- Understanding regulatory requirements (GDPR, AI Act, Financial Compliance)
- Analyzing uploaded documents for compliance gaps
- Providing remediation recommendations
- Answering specific compliance questions

Please feel free to upload documents or ask more specific questions about regulatory compliance.`,
        'it': `Capisco che stai chiedendo informazioni su: "${question}"

Anche se al momento non posso accedere ai servizi AI esterni, posso aiutarti con:
- Comprensione dei requisiti normativi (GDPR, AI Act, Conformità Finanziaria)
- Analisi di documenti caricati per gap di conformità
- Fornire raccomandazioni di rimedio
- Rispondere a domande specifiche sulla conformità

Sentiti libero di caricare documenti o fare domande più specifiche sulla conformità normativa.`,
        'es': `Entiendo que estás preguntando sobre: "${question}"

Aunque no puedo acceder a servicios de IA externos en este momento, puedo ayudarte con:
- Entender requisitos regulatorios (RGPD, Ley de IA, Cumplimiento Financiero)
- Analizar documentos subidos para brechas de cumplimiento
- Proporcionar recomendaciones de remediación
- Responder preguntas específicas de cumplimiento

Por favor, siéntete libre de subir documentos o hacer preguntas más específicas sobre cumplimiento regulatorio.`,
        'fr': `Je comprends que vous demandez des informations sur: "${question}"

Bien que je ne puisse pas accéder aux services IA externes pour le moment, je peux vous aider avec:
- Comprendre les exigences réglementaires (RGPD, Loi sur l'IA, Conformité Financière)
- Analyser les documents téléchargés pour les lacunes de conformité
- Fournir des recommandations de remédiation
- Répondre à des questions spécifiques de conformité

N'hésitez pas à télécharger des documents ou à poser des questions plus spécifiques sur la conformité réglementaire.`,
        'de': `Ich verstehe, dass Sie nach folgendem fragen: "${question}"

Obwohl ich derzeit nicht auf externe KI-Dienste zugreifen kann, kann ich Ihnen helfen mit:
- Verstehen von regulatorischen Anforderungen (DSGVO, KI-Gesetz, Finanz-Compliance)
- Analysieren hochgeladener Dokumente für Compliance-Lücken
- Bereitstellen von Abhilfe-Empfehlungen
- Beantworten spezifischer Compliance-Fragen

Bitte laden Sie gerne Dokumente hoch oder stellen Sie spezifischere Fragen zur regulatorischen Compliance.`
      }
    };

    // Check for specific topics and return appropriate response
    if (questionLower.includes('gdpr') || questionLower.includes('rgpd') || questionLower.includes('dsgvo')) {
      return responses.gdpr[language] || responses.gdpr['en'];
    }

    if (questionLower.includes('ai act') || questionLower.includes('atto ai') || questionLower.includes('ley ia') || questionLower.includes('loi ia') || questionLower.includes('ki-gesetz')) {
      return responses.aiact[language] || responses.aiact['en'];
    }

    if (questionLower.includes('gap') || questionLower.includes('analysis') || questionLower.includes('analisi') || questionLower.includes('análisis') || questionLower.includes('analyse')) {
      return responses.analysis[language] || responses.analysis['en'];
    }

    // Generic helpful response in detected language
    return responses.generic[language] || responses.generic['en'];
  }
}

module.exports = new AIService();
