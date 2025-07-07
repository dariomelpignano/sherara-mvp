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
      'it': 'Sei Sherara, un assistente AI esperto in conformità normativa specializzato nelle normative UE. Fornisci risposte chiare e utili in italiano, essendo accurato e professionale. Usa la formattazione markdown per strutturare le tue risposte con titoli, elenchi puntati, grassetto per concetti importanti, e tabelle quando appropriato.',
      'es': 'Eres Sherara, un asistente de IA experto en cumplimiento normativo especializado en regulaciones de la UE. Proporciona respuestas claras y útiles en español, siendo preciso y profesional. Usa formato markdown para estructurar tus respuestas con títulos, listas, negrita para conceptos importantes, y tablas cuando sea apropiado.',
      'fr': 'Vous êtes Sherara, un assistant IA expert en conformité réglementaire spécialisé dans les réglementations de l\'UE. Fournissez des réponses claires et utiles en français, en étant précis et professionnel. Utilisez le formatage markdown pour structurer vos réponses avec des titres, des listes, du gras pour les concepts importants, et des tableaux quand approprié.',
      'de': 'Sie sind Sherara, ein KI-Assistent für regulatorische Compliance, spezialisiert auf EU-Vorschriften. Geben Sie klare und hilfreiche Antworten auf Deutsch, seien Sie präzise und professionell. Verwenden Sie Markdown-Formatierung um Ihre Antworten mit Überschriften, Listen, Fettschrift für wichtige Konzepte und Tabellen zu strukturieren.',
      'en': 'You are Sherara, an expert AI compliance assistant specializing in EU regulations. Provide clear, actionable guidance while being accurate and helpful. Use markdown formatting to structure your responses with headings, bullet points, bold text for important concepts, and tables when appropriate.'
    };
    
    return prompts[language] || prompts['en'];
  }

  // Get language-specific prompt prefix
  getLanguagePromptPrefix(language) {
    const prefixes = {
      'it': 'Rispondi in italiano usando formattazione markdown. ',
      'es': 'Responde en español usando formato markdown. ',
      'fr': 'Répondez en français en utilisant le formatage markdown. ',
      'de': 'Antworten Sie auf Deutsch mit Markdown-Formatierung. ',
      'en': 'Respond using markdown formatting. '
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

    // Define responses in multiple languages with markdown formatting
    const responses = {
      gdpr: {
        'en': `## GDPR (General Data Protection Regulation)

GDPR establishes comprehensive data protection requirements for organizations processing personal data of EU residents.

### Key Obligations:

1. **Lawful basis for processing**
2. **Data subject rights** (access, erasure, portability)
3. **Privacy by design and default**
4. **Data protection impact assessments**
5. **Breach notification within 72 hours**

### Compliance Recommendation:
To ensure GDPR compliance, I recommend reviewing your data processing activities and implementing appropriate technical and organizational measures.`,

        'it': `## GDPR (Regolamento Generale sulla Protezione dei Dati)

Il GDPR stabilisce requisiti completi per la protezione dei dati per le organizzazioni che elaborano dati personali di residenti UE.

### Obblighi Principali:

1. **Base giuridica per l'elaborazione**
2. **Diritti dell'interessato** (accesso, cancellazione, portabilità)
3. **Privacy by design e by default**
4. **Valutazioni d'impatto sulla protezione dei dati**
5. **Notifica delle violazioni entro 72 ore**

### Raccomandazione per la Conformità:
Per garantire la conformità GDPR, raccomando di rivedere le vostre attività di elaborazione dati e implementare misure tecniche e organizzative appropriate.`,

        'es': `## RGPD (Reglamento General de Protección de Datos)

El RGPD establece requisitos completos de protección de datos para organizaciones que procesan datos personales de residentes de la UE.

### Obligaciones Clave:

1. **Base legal para el procesamiento**
2. **Derechos del interesado** (acceso, supresión, portabilidad)
3. **Privacidad por diseño y por defecto**
4. **Evaluaciones de impacto en la protección de datos**
5. **Notificación de brechas dentro de 72 horas**

### Recomendación de Cumplimiento:
Para asegurar el cumplimiento del RGPD, recomiendo revisar sus actividades de procesamiento de datos e implementar medidas técnicas y organizativas apropiadas.`,

        'fr': `## RGPD (Règlement Général sur la Protection des Données)

Le RGPD établit des exigences complètes de protection des données pour les organisations traitant des données personnelles de résidents de l'UE.

### Obligations Clés:

1. **Base légale pour le traitement**
2. **Droits de la personne concernée** (accès, effacement, portabilité)
3. **Protection de la vie privée dès la conception et par défaut**
4. **Analyses d'impact sur la protection des données**
5. **Notification des violations dans les 72 heures**

### Recommandation de Conformité:
Pour assurer la conformité au RGPD, je recommande d'examiner vos activités de traitement des données et d'implémenter des mesures techniques et organisationnelles appropriées.`,

        'de': `## DSGVO (Datenschutz-Grundverordnung)

Die DSGVO legt umfassende Datenschutzanforderungen für Organisationen fest, die personenbezogene Daten von EU-Bürgern verarbeiten.

### Wesentliche Pflichten:

1. **Rechtsgrundlage für die Verarbeitung**
2. **Betroffenenrechte** (Zugang, Löschung, Übertragbarkeit)
3. **Datenschutz durch Technikgestaltung und durch datenschutzfreundliche Voreinstellungen**
4. **Datenschutz-Folgenabschätzungen**
5. **Meldung von Datenschutzverletzungen binnen 72 Stunden**

### Compliance-Empfehlung:
Zur DSGVO-Compliance empfehle ich, Ihre Datenverarbeitungsaktivitäten zu überprüfen und angemessene technische und organisatorische Maßnahmen zu implementieren.`
      },
      aiact: {
        'en': `## EU AI Act

The EU AI Act establishes requirements for AI systems based on risk levels:

### Risk Categories:

| Risk Level | Requirements | Examples |
|------------|-------------|----------|
| **Prohibited** | Complete ban | Social scoring systems |
| **High-risk** | Conformity assessments | Recruitment AI, credit scoring |
| **Limited risk** | Transparency obligations | Chatbots, deepfakes |
| **Minimal risk** | Voluntary codes | Spam filters, games |

### Compliance Steps:
Organizations developing or deploying AI should:
- **Assess** their systems' risk levels
- **Implement** appropriate compliance measures
- **Document** AI governance processes`,

        'it': `## AI Act UE

L'AI Act UE stabilisce requisiti per i sistemi AI basati sui livelli di rischio:

### Categorie di Rischio:

| Livello di Rischio | Requisiti | Esempi |
|-------------------|-----------|--------|
| **Proibite** | Divieto completo | Sistemi di punteggio sociale |
| **Alto rischio** | Valutazioni di conformità | AI per assunzioni, scoring creditizio |
| **Rischio limitato** | Obblighi di trasparenza | Chatbot, deepfake |
| **Rischio minimo** | Codici di condotta volontari | Filtri spam, giochi |

### Passi per la Conformità:
Le organizzazioni che sviluppano o implementano AI dovrebbero:
- **Valutare** i livelli di rischio dei loro sistemi
- **Implementare** misure di conformità appropriate
- **Documentare** i processi di governance AI`,

        'es': `## Ley de IA de la UE

La Ley de IA de la UE establece requisitos para sistemas de IA basados en niveles de riesgo:

### Categorías de Riesgo:

| Nivel de Riesgo | Requisitos | Ejemplos |
|----------------|------------|----------|
| **Prohibidas** | Prohibición completa | Sistemas de puntuación social |
| **Alto riesgo** | Evaluaciones de conformidad | IA de contratación, puntuación crediticia |
| **Riesgo limitado** | Obligaciones de transparencia | Chatbots, deepfakes |
| **Riesgo mínimo** | Códigos de conducta voluntarios | Filtros de spam, juegos |

### Pasos de Cumplimiento:
Las organizaciones que desarrollan o implementan IA deben:
- **Evaluar** los niveles de riesgo de sus sistemas
- **Implementar** medidas de cumplimiento apropiadas
- **Documentar** procesos de gobernanza de IA`,

        'fr': `## Loi sur l'IA de l'UE

La Loi sur l'IA de l'UE établit des exigences pour les systèmes d'IA basées sur les niveaux de risque:

### Catégories de Risque:

| Niveau de Risque | Exigences | Exemples |
|-----------------|-----------|----------|
| **Interdites** | Interdiction complète | Systèmes de notation sociale |
| **Haut risque** | Évaluations de conformité | IA de recrutement, notation de crédit |
| **Risque limité** | Obligations de transparence | Chatbots, deepfakes |
| **Risque minimal** | Codes de conduite volontaires | Filtres spam, jeux |

### Étapes de Conformité:
Les organisations développant ou déployant l'IA doivent:
- **Évaluer** les niveaux de risque de leurs systèmes
- **Implémenter** des mesures de conformité appropriées
- **Documenter** les processus de gouvernance IA`,

        'de': `## EU-KI-Gesetz

Das EU-KI-Gesetz legt Anforderungen für KI-Systeme basierend auf Risikoebenen fest:

### Risikokategorien:

| Risikoebene | Anforderungen | Beispiele |
|-------------|---------------|-----------|
| **Verboten** | Vollständiges Verbot | Social Scoring Systeme |
| **Hochrisiko** | Konformitätsbewertungen | Recruiting-KI, Kreditscoring |
| **Begrenztes Risiko** | Transparenzpflichten | Chatbots, Deepfakes |
| **Minimales Risiko** | Freiwillige Verhaltenskodizes | Spam-Filter, Spiele |

### Compliance-Schritte:
Organisationen, die KI entwickeln oder einsetzen, sollten:
- **Bewerten** Sie die Risikoebenen ihrer Systeme
- **Implementieren** Sie angemessene Compliance-Maßnahmen
- **Dokumentieren** Sie KI-Governance-Prozesse`
      },
      analysis: {
        'en': `## Compliance Gap Analysis

To identify compliance gaps effectively:

### Process Steps:

1. **📤 Upload** your internal policies and procedures
2. **🔍 Run** a compliance analysis against relevant regulations
3. **📊 Review** the identified gaps sorted by risk level
4. **✅ Implement** recommended remediation actions

### Next Steps:
Would you like me to analyze any specific documents you've uploaded?

> **Tip:** Start with your most critical compliance documents for the best results.`,

        'it': `## Analisi dei Gap di Conformità

Per identificare efficacemente i gap di conformità:

### Passi del Processo:

1. **📤 Carica** le tue politiche e procedure interne
2. **🔍 Esegui** un'analisi di conformità contro le normative pertinenti
3. **📊 Rivedi** i gap identificati ordinati per livello di rischio
4. **✅ Implementa** le azioni di rimedio raccomandate

### Prossimi Passi:
Vorresti che analizzi qualche documento specifico che hai caricato?

> **Suggerimento:** Inizia con i tuoi documenti di conformità più critici per i migliori risultati.`,

        'es': `## Análisis de Brechas de Cumplimiento

Para identificar brechas de cumplimiento efectivamente:

### Pasos del Proceso:

1. **📤 Sube** tus políticas y procedimientos internos
2. **🔍 Ejecuta** un análisis de cumplimiento contra regulaciones relevantes
3. **📊 Revisa** las brechas identificadas ordenadas por nivel de riesgo
4. **✅ Implementa** las acciones de remediación recomendadas

### Próximos Pasos:
¿Te gustaría que analice algún documento específico que hayas subido?

> **Consejo:** Comienza con tus documentos de cumplimiento más críticos para mejores resultados.`,

        'fr': `## Analyse des Lacunes de Conformité

Pour identifier efficacement les lacunes de conformité:

### Étapes du Processus:

1. **📤 Téléchargez** vos politiques et procédures internes
2. **🔍 Effectuez** une analyse de conformité contre les réglementations pertinentes
3. **📊 Examinez** les lacunes identifiées triées par niveau de risque
4. **✅ Implémentez** les actions de remédiation recommandées

### Prochaines Étapes:
Souhaiteriez-vous que j'analyse des documents spécifiques que vous avez téléchargés?

> **Conseil:** Commencez avec vos documents de conformité les plus critiques pour de meilleurs résultats.`,

        'de': `## Compliance-Lücken-Analyse

Um Compliance-Lücken effektiv zu identifizieren:

### Prozessschritte:

1. **📤 Laden** Sie Ihre internen Richtlinien und Verfahren hoch
2. **🔍 Führen** Sie eine Compliance-Analyse gegen relevante Vorschriften durch
3. **📊 Überprüfen** Sie die identifizierten Lücken sortiert nach Risikoebene
4. **✅ Implementieren** Sie empfohlene Abhilfemaßnahmen

### Nächste Schritte:
Möchten Sie, dass ich spezifische Dokumente analysiere, die Sie hochgeladen haben?

> **Tipp:** Beginnen Sie mit Ihren kritischsten Compliance-Dokumenten für beste Ergebnisse.`
      },
      generic: {
        'en': `## AI Assistant Response

I understand you're asking about: **"${question}"**

### How I Can Help:

- 📋 **Understanding regulatory requirements** (GDPR, AI Act, Financial Compliance)
- 📄 **Analyzing uploaded documents** for compliance gaps
- 🔧 **Providing remediation recommendations**
- ❓ **Answering specific compliance questions**

### Getting Started:
Please feel free to upload documents or ask more specific questions about regulatory compliance.

> **Note:** While I cannot access external AI services at the moment, I can provide comprehensive guidance based on regulatory knowledge.`,

        'it': `## Risposta dell'Assistente AI

Capisco che stai chiedendo informazioni su: **"${question}"**

### Come Posso Aiutarti:

- 📋 **Comprensione dei requisiti normativi** (GDPR, AI Act, Conformità Finanziaria)
- 📄 **Analisi di documenti caricati** per gap di conformità
- 🔧 **Fornire raccomandazioni di rimedio**
- ❓ **Rispondere a domande specifiche sulla conformità**

### Per Iniziare:
Sentiti libero di caricare documenti o fare domande più specifiche sulla conformità normativa.

> **Nota:** Anche se al momento non posso accedere ai servizi AI esterni, posso fornire una guida completa basata sulla conoscenza normativa.`,

        'es': `## Respuesta del Asistente de IA

Entiendo que estás preguntando sobre: **"${question}"**

### Cómo Puedo Ayudar:

- 📋 **Entender requisitos regulatorios** (RGPD, Ley de IA, Cumplimiento Financiero)
- 📄 **Analizar documentos subidos** para brechas de cumplimiento
- 🔧 **Proporcionar recomendaciones de remediación**
- ❓ **Responder preguntas específicas de cumplimiento**

### Para Empezar:
Por favor, siéntete libre de subir documentos o hacer preguntas más específicas sobre cumplimiento regulatorio.

> **Nota:** Aunque no puedo acceder a servicios de IA externos en este momento, puedo proporcionar orientación integral basada en conocimiento regulatorio.`,

        'fr': `## Réponse de l'Assistant IA

Je comprends que vous demandez des informations sur: **"${question}"**

### Comment Je Peux Aider:

- 📋 **Comprendre les exigences réglementaires** (RGPD, Loi sur l'IA, Conformité Financière)
- 📄 **Analyser les documents téléchargés** pour les lacunes de conformité
- 🔧 **Fournir des recommandations de remédiation**
- ❓ **Répondre à des questions spécifiques de conformité**

### Pour Commencer:
N'hésitez pas à télécharger des documents ou à poser des questions plus spécifiques sur la conformité réglementaire.

> **Note:** Bien que je ne puisse pas accéder aux services IA externes pour le moment, je peux fournir des conseils complets basés sur la connaissance réglementaire.`,

        'de': `## KI-Assistent Antwort

Ich verstehe, dass Sie nach folgendem fragen: **"${question}"**

### Wie Ich Helfen Kann:

- 📋 **Verstehen von regulatorischen Anforderungen** (DSGVO, KI-Gesetz, Finanz-Compliance)
- 📄 **Analysieren hochgeladener Dokumente** für Compliance-Lücken
- 🔧 **Bereitstellen von Abhilfe-Empfehlungen**
- ❓ **Beantworten spezifischer Compliance-Fragen**

### Erste Schritte:
Bitte laden Sie gerne Dokumente hoch oder stellen Sie spezifischere Fragen zur regulatorischen Compliance.

> **Hinweis:** Obwohl ich derzeit nicht auf externe KI-Dienste zugreifen kann, kann ich umfassende Beratung basierend auf regulatorischem Wissen bieten.`
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
