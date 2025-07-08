const fs = require('fs').promises;
const path = require('path');
const taxonomyService = require('./taxonomyService');
const industryConfig = require('./industryConfig');

class RegulatoryAnalyzer {
  constructor() {
    this.regulationsCache = {};
    this.regulationPath = path.join(__dirname, '..', 'regulations');
    this.availableRegulations = null;
  }

  // Dynamically discover all regulation files in the folder
  async discoverRegulations() {
    if (this.availableRegulations) {
      return this.availableRegulations;
    }

    try {
      const files = await fs.readdir(this.regulationPath);
      this.availableRegulations = [];
      
      for (const file of files) {
        if (file.endsWith('.txt')) {
          const filePath = path.join(this.regulationPath, file);
          const stats = await fs.stat(filePath);
          
          if (stats.isFile()) {
            // Convert filename to regulation ID
            const regulationId = this.filenameToRegulationId(file);
            const displayName = this.formatDisplayName(regulationId);
            
            this.availableRegulations.push({
              id: regulationId,
              filename: file,
              displayName: displayName,
              description: await this.extractDescription(filePath)
            });
          }
        }
      }
      
      console.log(`Discovered ${this.availableRegulations.length} regulation files:`, 
        this.availableRegulations.map(r => r.displayName).join(', '));
      
      return this.availableRegulations;
    } catch (error) {
      console.error('Failed to discover regulations:', error);
      return [];
    }
  }

  // Convert filename to regulation ID (e.g., "gdpr_requirements.txt" -> "gdpr")
  filenameToRegulationId(filename) {
    return filename
      .replace('.txt', '')
      .replace(/_requirements?$/, '')
      .replace(/_/g, '_');
  }

  // Format regulation ID for display (e.g., "gdpr" -> "GDPR")
  formatDisplayName(regulationId) {
    const specialCases = {
      'gdpr': 'GDPR',
      'ai_act': 'EU AI Act',
      'aml': 'AML/KYC',
      'data_security': 'Data Security',
      'financial_compliance': 'Financial Compliance'
    };
    
    if (specialCases[regulationId.toLowerCase()]) {
      return specialCases[regulationId.toLowerCase()];
    }
    
    // Default formatting: capitalize each word
    return regulationId
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Extract description from the first few lines of the file
  async extractDescription(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      // Look for a description in the first few lines
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        const line = lines[i].trim();
        if (line.length > 20 && line.length < 200 && !line.includes(':')) {
          return line;
        }
      }
      
      // Default description based on filename
      const filename = path.basename(filePath, '.txt');
      return `Compliance requirements for ${this.formatDisplayName(filename)}`;
    } catch (error) {
      return 'Regulatory compliance requirements';
    }
  }

  async loadRegulations(regulationTypes) {
    const requirements = [];
    
    // Ensure we have discovered available regulations
    await this.discoverRegulations();

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
      // Try to load from industry-specific location first
      let content;
      let filename = `${regulationType}.md`; // Define filename for classification
      
      try {
        content = await industryConfig.loadRegulationFile(regulationType);
      } catch (industryError) {
        console.warn(`Could not load ${regulationType} from industry config, trying legacy method`);
        
        // Fallback to legacy method
        const legacyFilename = await this.getRegulationFilename(regulationType);
        if (!legacyFilename) {
          console.error(`No regulation file found for ${regulationType}`);
          return [];
        }
        
        filename = legacyFilename; // Update filename for legacy files
        const filePath = path.join(this.regulationPath, legacyFilename);
        content = await fs.readFile(filePath, 'utf-8');
      }
      
      // Auto-classify the regulation using taxonomy service
      let classification = {};
      try {
        classification = await taxonomyService.classifyDocument(content, filename, 'regulatory');
        console.log(`Classified regulation ${regulationType} with ${Math.round(classification.confidence * 100)}% confidence`);
      } catch (error) {
        console.error(`Error classifying regulation ${regulationType}:`, error);
      }
      
      const requirements = this.parseRegulationContent(content, regulationType);
      
      // Add classification metadata to each requirement
      requirements.forEach(req => {
        req.classification = classification;
        req.autoTags = classification.confidence > 0.3 ? classification : {};
      });
      
      return requirements;
    } catch (error) {
      console.error(`Failed to load regulation ${regulationType}:`, error);
      return [];
    }
  }

  async getRegulationFilename(regulationType) {
    // First check if regulations have been discovered
    const regulations = await this.discoverRegulations();
    
    // Try exact match first
    const exactMatch = regulations.find(r => r.id === regulationType);
    if (exactMatch) {
      return exactMatch.filename;
    }
    
    // Try case-insensitive match
    const caseInsensitiveMatch = regulations.find(
      r => r.id.toLowerCase() === regulationType.toLowerCase()
    );
    if (caseInsensitiveMatch) {
      return caseInsensitiveMatch.filename;
    }
    
    // Try to match by removing underscores and comparing
    const normalizedType = regulationType.toLowerCase().replace(/[_-]/g, '');
    const normalizedMatch = regulations.find(
      r => r.id.toLowerCase().replace(/[_-]/g, '') === normalizedType
    );
    if (normalizedMatch) {
      return normalizedMatch.filename;
    }
    
    // Legacy support for old format
    const legacyMap = {
      'GDPR': 'gdpr_requirements.txt',
      'AI_Act': 'ai_act_requirements.txt',
      'Financial_Compliance': 'financial_compliance.txt',
      'AML': 'aml_requirements.txt',
      'Data_Security': 'data_security_requirements.txt'
    };
    
    return legacyMap[regulationType] || null;
  }

  parseRegulationContent(content, regulationType) {
    const requirements = [];
    
    // Detect if this is markdown format (contains ## headers)
    if (content.includes('## ') || content.includes('### ')) {
      return this.parseMarkdownRegulation(content, regulationType);
    }
    
    // Legacy text format parsing
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

  parseMarkdownRegulation(content, regulationType) {
    const requirements = [];
    
    // Split content by ### headers (requirement sections)
    const sections = content.split(/###\s+/);
    
    sections.forEach((section, index) => {
      if (section.trim() && index > 0) { // Skip the first section (before first ###)
        const requirement = this.extractMarkdownRequirement(section, regulationType, index);
        if (requirement) {
          requirements.push(requirement);
        }
      }
    });

    // If no ### sections found, try ## sections
    if (requirements.length === 0) {
      const majorSections = content.split(/##\s+/);
      majorSections.forEach((section, index) => {
        if (section.trim() && index > 0) {
          const requirement = this.extractMarkdownRequirement(section, regulationType, index);
          if (requirement) {
            requirements.push(requirement);
          }
        }
      });
    }

    return requirements;
  }

  extractMarkdownRequirement(text, regulationType, index) {
    const lines = text.trim().split('\n');
    const title = lines[0].trim();
    
    // Skip certain sections that aren't requirements
    const skipSections = ['overview', 'key resources', 'compliance checklist', 'implementation', 'monitoring and updates'];
    if (skipSections.some(skip => title.toLowerCase().includes(skip))) {
      return null;
    }
    
    // Extract requirement details
    let requirement = null;
    let article = '';
    let category = '';
    let description = '';
    
    // Look for structured requirement information
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('- **Requirement**:')) {
        requirement = line.replace('- **Requirement**:', '').trim();
      } else if (line.startsWith('- **Article**:')) {
        article = line.replace('- **Article**:', '').trim();
      } else if (line.startsWith('- **Category**:')) {
        category = line.replace('- **Category**:', '').trim();
      } else if (line.startsWith('- **Description**:')) {
        description = line.replace('- **Description**:', '').trim();
      }
    }
    
    // If no structured format found, use the content as description
    if (!requirement && !description) {
      description = lines.slice(1).join(' ').trim();
      requirement = title;
    }
    
    // Determine category and risk level
    const finalCategory = category || this.categorizeRequirement(text);
    const riskLevel = this.assessRiskLevel(text, regulationType);

    return {
      id: `${regulationType}_${index}`,
      regulation: regulationType,
      title: requirement || title,
      description: description || text.substring(0, 200) + '...',
      fullText: text,
      article: article,
      category: finalCategory,
      riskLevel: riskLevel,
      keywords: this.extractKeywords(text)
    };
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
      'Technical': ['technical', 'measures', 'pseudonymization', 'protection'],
      'Risk Management': ['risk', 'assessment', 'mitigation', 'monitoring'],
      'Compliance': ['compliance', 'audit', 'review', 'enforcement']
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
    const highRiskIndicators = ['mandatory', 'must', 'shall', 'required', 'penalty', 'fine', 'sanction', 'critical'];
    const mediumRiskIndicators = ['should', 'recommended', 'expected', 'appropriate', 'important'];
    
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
    // Ensure regulations are discovered
    await this.discoverRegulations();
    
    // Load all available regulations for context
    const allRegulationIds = this.availableRegulations.map(r => r.id);
    const allRegulations = await this.loadRegulations(allRegulationIds);
    
    // Find regulations relevant to the query
    const queryLower = query.toLowerCase();
    const relevant = allRegulations.filter(req => {
      return req.keywords.some(keyword => queryLower.includes(keyword)) ||
             queryLower.includes(req.regulation.toLowerCase()) ||
             req.fullText.toLowerCase().includes(queryLower.split(' ')[0]);
    });

    return relevant.slice(0, 5); // Return top 5 most relevant
  }

  // Get list of all available regulations for UI
  async getAvailableRegulations() {
    try {
      // Use industry-specific regulations
      const industryRegulations = await industryConfig.getAvailableRegulations();
      
      if (industryRegulations.length > 0) {
        return industryRegulations;
      }
      
      // Fallback to file discovery for backward compatibility
      return await this.discoverRegulations();
    } catch (error) {
      console.error('Error getting industry regulations:', error);
      return await this.discoverRegulations();
    }
  }
}

module.exports = new RegulatoryAnalyzer();
