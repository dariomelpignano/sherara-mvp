const fs = require('fs').promises;
const path = require('path');

class RegulatoryAnalyzer {
  constructor() {
    this.regulationsCache = {};
    this.regulationPath = path.join(__dirname, '..', 'regulations');
  }

  async loadRegulations(regulationTypes) {
    const requirements = [];

    for (const regulation of regulationTypes) {
      if (!this.regulationsCache[regulation]) {
        this.regulationsCache[regulation] = await this.loadRegulationFile(regulation);
      }
      requirements.push(...this.regulationsCache[regulation]);
    }

    return requirements;
  }

  async loadRegulationFile(regulationType) {
    try {
      const filename = this.getRegulationFilename(regulationType);
      const filePath = path.join(this.regulationPath, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      
      return this.parseRegulationContent(content, regulationType);
    } catch (error) {
      console.error(`Failed to load regulation ${regulationType}:`, error);
      return [];
    }
  }

  getRegulationFilename(regulationType) {
    const fileMap = {
      'GDPR': 'gdpr_requirements.txt',
      'AI_Act': 'ai_act_requirements.txt',
      'Financial_Compliance': 'financial_compliance.txt',
      'AML': 'aml_requirements.txt',
      'Data_Security': 'data_security_requirements.txt'
    };
    return fileMap[regulationType] || `${regulationType.toLowerCase()}.txt`;
  }

  parseRegulationContent(content, regulationType) {
    const requirements = [];
    const sections = content.split(/\n\s*\n/);
    
    sections.forEach((section, index) => {
      if (section.trim()) {
        const requirement = this.extractRequirement(section, regulationType, index);
        if (requirement) {
          requirements.push(requirement);
        }
      }
    });

    return requirements;
  }

  extractRequirement(text, regulationType, index) {
    // Extract structured requirement from text
    const lines = text.trim().split('\n');
    const title = lines[0];
    const description = lines.slice(1).join(' ');

    // Determine requirement category and risk level
    const category = this.categorizeRequirement(text);
    const riskLevel = this.assessRiskLevel(text, regulationType);

    return {
      id: `${regulationType}_${index + 1}`,
      regulation: regulationType,
      title: title,
      description: description,
      fullText: text,
      category: category,
      riskLevel: riskLevel,
      keywords: this.extractKeywords(text)
    };
  }

  categorizeRequirement(text) {
    const categories = {
      'Data Protection': ['personal data', 'privacy', 'data subject', 'consent'],
      'Security': ['security', 'encryption', 'access control', 'breach'],
      'Transparency': ['transparency', 'information', 'notification', 'disclosure'],
      'Governance': ['accountability', 'documentation', 'assessment', 'officer'],
      'Rights': ['rights', 'access', 'erasure', 'portability', 'objection'],
      'Technical': ['technical', 'measures', 'pseudonymization', 'protection']
    };

    const textLower = text.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => textLower.includes(keyword))) {
        return category;
      }
    }

    return 'General';
  }

  assessRiskLevel(text, regulationType) {
    const highRiskIndicators = ['mandatory', 'must', 'shall', 'required', 'penalty', 'fine', 'sanction'];
    const mediumRiskIndicators = ['should', 'recommended', 'expected', 'appropriate'];
    
    const textLower = text.toLowerCase();
    
    if (highRiskIndicators.some(indicator => textLower.includes(indicator))) {
      return 'high';
    } else if (mediumRiskIndicators.some(indicator => textLower.includes(indicator))) {
      return 'medium';
    }
    
    return 'low';
  }

  extractKeywords(text) {
    const stopWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for'];
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.includes(word));
    
    // Get unique words and return top 10 by frequency
    const wordFreq = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  async getRelevantRegulations(query) {
    // Load all available regulations for context
    const allRegulations = await this.loadRegulations(['GDPR', 'AI_Act', 'Financial_Compliance']);
    
    // Find regulations relevant to the query
    const queryLower = query.toLowerCase();
    const relevant = allRegulations.filter(req => {
      return req.keywords.some(keyword => queryLower.includes(keyword)) ||
             queryLower.includes(req.regulation.toLowerCase()) ||
             req.fullText.toLowerCase().includes(queryLower.split(' ')[0]);
    });

    return relevant.slice(0, 5); // Return top 5 most relevant
  }
}

module.exports = new RegulatoryAnalyzer();
