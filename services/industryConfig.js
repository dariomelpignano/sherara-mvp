const path = require('path');
const fs = require('fs').promises;

class IndustryConfig {
  constructor() {
    this.supportedIndustries = {
      'financial-services': {
        name: 'Financial Services',
        description: 'Banking, investment, and financial institutions',
        regulations: ['mifid2', 'basel3', 'dora', 'gdpr'],
        icon: 'fa-university',
        color: '#2563eb'
      },
      'medicinal-gases': {
        name: 'Medicinal Gases',
        description: 'Medical gas manufacturing and distribution',
        regulations: ['eu-gmp', 'iso-7396', 'medicinal-gas-manufacturing', 'gruppo-sol-regulatory-framework', 'gdpr'],
        icon: 'fa-lungs',
        color: '#059669'
      },
      'food-beverages': {
        name: 'Food and Beverages',
        description: 'Food production, processing, and distribution',
        regulations: ['haccp', 'eu-food-law', 'gdpr'],
        icon: 'fa-apple-alt',
        color: '#ea580c'
      }
    };
    
    this.currentIndustry = 'financial-services'; // default
    this.regulationsPath = path.join(process.cwd(), 'regulations');
  }

  setIndustry(industryKey) {
    if (!this.supportedIndustries[industryKey]) {
      throw new Error(`Unsupported industry: ${industryKey}. Supported: ${Object.keys(this.supportedIndustries).join(', ')}`);
    }
    this.currentIndustry = industryKey;
    console.log(`Industry set to: ${this.supportedIndustries[industryKey].name}`);
  }

  getCurrentIndustry() {
    return {
      key: this.currentIndustry,
      ...this.supportedIndustries[this.currentIndustry]
    };
  }

  getSupportedIndustries() {
    return Object.entries(this.supportedIndustries).map(([key, config]) => ({
      key,
      ...config
    }));
  }

  getIndustryRegulationsPath() {
    return path.join(this.regulationsPath, this.currentIndustry);
  }

  async getAvailableRegulations() {
    const industryConfig = this.supportedIndustries[this.currentIndustry];
    const regulationsDir = this.getIndustryRegulationsPath();
    
    const regulations = [];
    
    for (const regulationId of industryConfig.regulations) {
      try {
        // Try to find the regulation file
        const regulationFile = path.join(regulationsDir, `${regulationId}.md`);
        await fs.access(regulationFile);
        
        regulations.push({
          id: regulationId,
          displayName: this.getRegulationDisplayName(regulationId),
          description: await this.getRegulationDescription(regulationFile),
          industry: this.currentIndustry,
          filePath: regulationFile
        });
      } catch (error) {
        console.warn(`Regulation file not found: ${regulationId}.md for industry ${this.currentIndustry}`);
        
        // Fallback to common regulations if industry-specific not found
        try {
          const commonFile = path.join(this.regulationsPath, `${regulationId}.md`);
          await fs.access(commonFile);
          
          regulations.push({
            id: regulationId,
            displayName: this.getRegulationDisplayName(regulationId),
            description: await this.getRegulationDescription(commonFile),
            industry: 'common',
            filePath: commonFile
          });
        } catch (commonError) {
          console.warn(`Regulation file not found in common directory: ${regulationId}.md`);
        }
      }
    }
    
    return regulations;
  }

  getRegulationDisplayName(regulationId) {
    const displayNames = {
      'mifid2': 'MiFID II',
      'basel3': 'Basel III',
      'dora': 'DORA',
      'gdpr': 'GDPR',
      'eu-gmp': 'EU GMP',
      'iso-7396': 'ISO 7396',
      'medicinal-gas-manufacturing': 'Medicinal Gas Manufacturing',
      'gruppo-sol-regulatory-framework': 'Gruppo Sol Regulatory Framework',
      'haccp': 'HACCP',
      'eu-food-law': 'EU Food Law'
    };
    
    return displayNames[regulationId] || regulationId.toUpperCase();
  }

  async getRegulationDescription(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const overviewMatch = content.match(/## Overview\s*\n(.*?)(?=\n##|\n$)/s);
      
      if (overviewMatch) {
        return overviewMatch[1].trim().substring(0, 200) + '...';
      }
      
      // Fallback to first paragraph
      const firstParagraph = content.split('\n').find(line => 
        line.trim().length > 20 && !line.startsWith('#')
      );
      
      return firstParagraph ? firstParagraph.trim().substring(0, 200) + '...' : 'Regulatory compliance requirements';
    } catch (error) {
      return 'Regulatory compliance requirements';
    }
  }

  async loadRegulationFile(regulationId) {
    const industryRegPath = path.join(this.getIndustryRegulationsPath(), `${regulationId}.md`);
    const commonRegPath = path.join(this.regulationsPath, `${regulationId}.md`);
    
    try {
      // Try industry-specific first
      await fs.access(industryRegPath);
      return await fs.readFile(industryRegPath, 'utf8');
    } catch (error) {
      // Fallback to common
      try {
        return await fs.readFile(commonRegPath, 'utf8');
      } catch (commonError) {
        throw new Error(`Regulation file not found: ${regulationId}`);
      }
    }
  }

  getIndustryContext() {
    const industry = this.getCurrentIndustry();
    return {
      industry: industry.name,
      description: industry.description,
      regulationCount: industry.regulations.length,
      specializations: this.getIndustrySpecializations()
    };
  }

  getIndustrySpecializations() {
    const specializations = {
      'financial-services': [
        'Capital adequacy requirements',
        'Risk management frameworks',
        'Client protection measures',
        'Operational resilience',
        'Transaction reporting'
      ],
      'medicinal-gases': [
        'Good manufacturing practice',
        'Quality management systems',
        'Pipeline system safety',
        'Gas purity standards',
        'Distribution controls'
      ],
      'food-beverages': [
        'Hazard analysis and control',
        'Food safety management',
        'Traceability systems',
        'Quality assurance',
        'Consumer protection'
      ]
    };
    
    return specializations[this.currentIndustry] || [];
  }

  validateIndustrySetup() {
    const issues = [];
    const industry = this.getCurrentIndustry();
    
    for (const regulationId of industry.regulations) {
      const industryPath = path.join(this.getIndustryRegulationsPath(), `${regulationId}.md`);
      const commonPath = path.join(this.regulationsPath, `${regulationId}.md`);
      
      Promise.all([
        fs.access(industryPath).catch(() => null),
        fs.access(commonPath).catch(() => null)
      ]).then(([industryExists, commonExists]) => {
        if (!industryExists && !commonExists) {
          issues.push(`Missing regulation file: ${regulationId}.md`);
        }
      });
    }
    
    return issues;
  }
}

module.exports = new IndustryConfig();