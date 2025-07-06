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

  async answerComplianceQuestion(question, sessionContext, regulatoryContext) {
    try {
      // Build context from session and regulations
      const contextInfo = this.buildContextInfo(sessionContext, regulatoryContext);

      const prompt = `
You are Sherara, an AI compliance assistant. Answer the following compliance-related question based on the provided context.

Question: ${question}

Context:
${contextInfo}

Provide a helpful, accurate, and actionable response. If the question relates to uploaded documents or analysis results, reference them specifically. If you need more information to provide a complete answer, mention what additional details would be helpful.
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are Sherara, an expert AI compliance assistant specializing in EU regulations. Provide clear, actionable guidance while being accurate and helpful.'
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
      
      // Provide a helpful fallback response
      return this.generateFallbackResponse(question, regulatoryContext);
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

  generateFallbackResponse(question, regulatoryContext) {
    const questionLower = question.toLowerCase();

    // Provide specific responses for common questions
    if (questionLower.includes('gdpr')) {
      return `GDPR (General Data Protection Regulation) establishes comprehensive data protection requirements for organizations processing personal data of EU residents. Key obligations include:

1. Lawful basis for processing
2. Data subject rights (access, erasure, portability)
3. Privacy by design and default
4. Data protection impact assessments
5. Breach notification within 72 hours

To ensure GDPR compliance, I recommend reviewing your data processing activities and implementing appropriate technical and organizational measures.`;
    }

    if (questionLower.includes('ai act')) {
      return `The EU AI Act establishes requirements for AI systems based on risk levels:

1. Prohibited AI practices (e.g., social scoring)
2. High-risk AI systems require conformity assessments
3. Limited risk systems need transparency obligations
4. Minimal risk systems have voluntary codes of conduct

Organizations developing or deploying AI should assess their systems' risk levels and implement appropriate compliance measures.`;
    }

    if (questionLower.includes('gap') || questionLower.includes('analysis')) {
      return `To identify compliance gaps:

1. Upload your internal policies and procedures
2. Run a compliance analysis against relevant regulations
3. Review the identified gaps sorted by risk level
4. Implement recommended remediation actions

Would you like me to analyze any specific documents you've uploaded?`;
    }

    // Generic helpful response
    return `I understand you're asking about: "${question}"

While I cannot access external AI services at the moment, I can help you with:
- Understanding regulatory requirements (GDPR, AI Act, Financial Compliance)
- Analyzing uploaded documents for compliance gaps
- Providing remediation recommendations
- Answering specific compliance questions

Please feel free to upload documents or ask more specific questions about regulatory compliance.`;
  }
}

module.exports = new AIService();
