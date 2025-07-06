const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');

class RegulationSourcesService {
  constructor() {
    this.sources = {
      'eu-official': {
        id: 'eu-official',
        name: 'EU Official Sources',
        description: 'Official EU regulations including GDPR, AI Act, and Digital Services Act',
        active: true,
        updateFrequency: 'daily',
        regulations: [
          { id: 'gdpr', url: 'https://example.com/gdpr.txt', filename: 'gdpr_requirements.txt' },
          { id: 'ai_act', url: 'https://example.com/ai_act.txt', filename: 'ai_act_requirements.txt' }
        ]
      },
      'financial-services': {
        id: 'financial-services',
        name: 'Financial Services Regulations',
        description: 'Banking and financial services compliance including Basel III, MiFID II, PSD2, AMLD, and more',
        active: false,
        updateFrequency: 'weekly',
        regulations: [
          { id: 'basel3', url: 'https://example.com/basel3.txt', filename: 'basel3_requirements.txt' },
          { id: 'mifid2', url: 'https://example.com/mifid2.txt', filename: 'mifid2_requirements.txt' },
          { id: 'psd2', url: 'https://example.com/psd2.txt', filename: 'psd2_requirements.txt' },
          { id: 'amld6', url: 'https://example.com/amld6.txt', filename: 'amld6_requirements.txt' },
          { id: 'ifrs9', url: 'https://example.com/ifrs9.txt', filename: 'ifrs9_requirements.txt' },
          { id: 'solvency2', url: 'https://example.com/solvency2.txt', filename: 'solvency2_requirements.txt' },
          { id: 'emir', url: 'https://example.com/emir.txt', filename: 'emir_requirements.txt' },
          { id: 'crd5', url: 'https://example.com/crd5.txt', filename: 'crd5_requirements.txt' }
        ]
      },
      'iso-standards': {
        id: 'iso-standards',
        name: 'ISO Standards',
        description: 'International standards including ISO 27001, ISO 27701, and ISO 9001',
        active: true,
        updateFrequency: 'monthly',
        regulations: [
          { id: 'iso27001', url: 'https://example.com/iso27001.txt', filename: 'iso27001_requirements.txt' },
          { id: 'iso27701', url: 'https://example.com/iso27701.txt', filename: 'iso27701_requirements.txt' }
        ]
      }
    };
    
    this.regulationsPath = path.join(__dirname, '..', 'regulations');
  }

  async getSources() {
    return Object.values(this.sources);
  }

  async getSource(sourceId) {
    return this.sources[sourceId];
  }

  async activateSource(sourceId) {
    if (!this.sources[sourceId]) {
      throw new Error('Source not found');
    }
    
    this.sources[sourceId].active = true;
    return { success: true, source: this.sources[sourceId] };
  }

  async deactivateSource(sourceId) {
    if (!this.sources[sourceId]) {
      throw new Error('Source not found');
    }
    
    this.sources[sourceId].active = false;
    return { success: true, source: this.sources[sourceId] };
  }

  async syncSource(sourceId) {
    const source = this.sources[sourceId];
    if (!source) {
      throw new Error('Source not found');
    }
    
    if (!source.active) {
      throw new Error('Source is not active');
    }
    
    console.log(`Syncing regulations from ${source.name}...`);
    
    let syncedCount = 0;
    const results = [];
    
    // In a real implementation, this would download from actual URLs
    // For MVP, we'll simulate the sync process
    for (const regulation of source.regulations) {
      try {
        // Simulate downloading regulation
        const success = await this.simulateDownload(regulation);
        
        if (success) {
          syncedCount++;
          results.push({
            regulation: regulation.id,
            status: 'success',
            message: 'Successfully synced'
          });
        }
      } catch (error) {
        results.push({
          regulation: regulation.id,
          status: 'error',
          message: error.message
        });
      }
    }
    
    return {
      success: true,
      sourceId: sourceId,
      count: syncedCount,
      total: source.regulations.length,
      results: results
    };
  }

  async simulateDownload(regulation) {
    // In production, this would actually download from the URL
    // For MVP, we'll just check if the file exists
    const filePath = path.join(this.regulationsPath, regulation.filename);
    
    try {
      await fs.access(filePath);
      console.log(`Regulation ${regulation.id} already exists, simulating update check...`);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In production, would check if remote file is newer
      return true;
    } catch (error) {
      // File doesn't exist, would download it
      console.log(`Regulation ${regulation.id} not found, would download from ${regulation.url}`);
      
      // For MVP, create a placeholder if it doesn't exist
      if (regulation.id === 'basel3') {
        await this.createFinancialRegulation('basel3', 'Basel III Capital Requirements');
      } else if (regulation.id === 'mifid2') {
        await this.createFinancialRegulation('mifid2', 'Markets in Financial Instruments Directive II');
      } else if (regulation.id === 'psd2') {
        await this.createFinancialRegulation('psd2', 'Payment Services Directive 2');
      } else if (regulation.id === 'amld6') {
        await this.createFinancialRegulation('amld6', 'Anti-Money Laundering Directive 6');
      } else if (regulation.id === 'ifrs9') {
        await this.createFinancialRegulation('ifrs9', 'IFRS 9 Financial Instruments');
      } else if (regulation.id === 'solvency2') {
        await this.createFinancialRegulation('solvency2', 'Solvency II Directive');
      } else if (regulation.id === 'emir') {
        await this.createFinancialRegulation('emir', 'European Market Infrastructure Regulation');
      } else if (regulation.id === 'crd5') {
        await this.createFinancialRegulation('crd5', 'Capital Requirements Directive V');
      }
      
      return true;
    }
  }

  async createPlaceholderRegulation(id, title) {
    const content = `${title.toUpperCase()}
This is a placeholder for ${title} requirements.

1. DATA PROTECTION REQUIREMENTS
Organizations must implement appropriate safeguards to protect sensitive data.
- Implement access controls
- Encrypt data at rest and in transit
- Regular security assessments
- Incident response procedures

2. PRIVACY REQUIREMENTS
Ensure individual privacy rights are protected.
- Provide notice of data collection
- Obtain consent where required
- Allow data access and correction
- Enable data deletion requests

3. COMPLIANCE MONITORING
Establish procedures to ensure ongoing compliance.
- Regular audits
- Documentation requirements
- Training programs
- Violation reporting

4. GOVERNANCE REQUIREMENTS
Implement appropriate governance structures.
- Designate responsible parties
- Establish policies and procedures
- Regular reviews and updates
- Board oversight where required`;

    const filename = `${id}_requirements.txt`;
    const filePath = path.join(this.regulationsPath, filename);
    
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`Created placeholder regulation: ${filename}`);
  }

  async createFinancialRegulation(id, title) {
    let content = `${title.toUpperCase()}\n`;
    
    if (id === 'basel3') {
      content += `Basel III International Regulatory Framework for Banks

1. CAPITAL ADEQUACY REQUIREMENTS
Banks must maintain minimum capital ratios to ensure financial stability.
- Common Equity Tier 1 (CET1) ratio: minimum 4.5%
- Tier 1 capital ratio: minimum 6%
- Total capital ratio: minimum 8%
- Capital conservation buffer: 2.5%
- Countercyclical capital buffer: 0-2.5%

2. LEVERAGE RATIO REQUIREMENTS
Non-risk based leverage ratio to act as a backstop.
- Minimum leverage ratio of 3%
- Calculation methodology and reporting requirements
- Exposure measurement criteria
- Quarterly disclosure requirements

3. LIQUIDITY REQUIREMENTS
Ensure banks maintain adequate liquidity buffers.
- Liquidity Coverage Ratio (LCR): minimum 100%
- Net Stable Funding Ratio (NSFR): minimum 100%
- Intraday liquidity monitoring
- Stress testing requirements

4. RISK MANAGEMENT FRAMEWORK
Comprehensive risk management and governance.
- Credit risk measurement and mitigation
- Market risk capital requirements
- Operational risk management
- Interest rate risk in the banking book (IRRBB)
- Pillar 2 supervisory review process`;
    } else if (id === 'mifid2') {
      content += `Markets in Financial Instruments Directive II (MiFID II)

1. INVESTOR PROTECTION
Enhanced protection for retail and professional clients.
- Best execution requirements
- Client categorization and suitability assessments
- Product governance obligations
- Costs and charges transparency
- Inducements and conflicts of interest

2. MARKET TRANSPARENCY
Pre and post-trade transparency requirements.
- Equity transparency requirements
- Non-equity transparency requirements
- Systematic internaliser regime
- Transaction reporting obligations
- Reference data reporting

3. MARKET STRUCTURE
Rules governing trading venues and execution.
- Regulated markets oversight
- Multilateral Trading Facilities (MTFs)
- Organised Trading Facilities (OTFs)
- Algorithm trading controls
- Direct Electronic Access (DEA) requirements

4. CONDUCT OF BUSINESS
Organizational and conduct requirements.
- Governance arrangements
- Compliance function requirements
- Record keeping obligations
- Telephone recording requirements
- Research unbundling rules`;
    } else if (id === 'psd2') {
      content += `Payment Services Directive 2 (PSD2)

1. STRONG CUSTOMER AUTHENTICATION (SCA)
Enhanced security for electronic payments.
- Two-factor authentication requirements
- Authentication elements (knowledge, possession, inherence)
- Dynamic linking for remote transactions
- Exemptions and thresholds
- Implementation timelines

2. OPEN BANKING REQUIREMENTS
Third-party access to payment accounts.
- Account Information Service Providers (AISPs)
- Payment Initiation Service Providers (PISPs)
- API requirements and standards
- Consent management
- Data sharing obligations

3. CONSUMER PROTECTION
Enhanced rights and protections for payment service users.
- Liability for unauthorized transactions
- Refund rights for direct debits
- Complaints handling procedures
- Transparency and information requirements
- Currency conversion disclosure

4. OPERATIONAL AND SECURITY REQUIREMENTS
Risk management and incident reporting.
- Operational and security risk management
- Incident reporting obligations
- Business continuity planning
- Outsourcing arrangements
- Fraud monitoring and reporting`;
    } else if (id === 'amld6') {
      content += `Anti-Money Laundering Directive 6 (AMLD6)

1. CUSTOMER DUE DILIGENCE (CDD)
Enhanced due diligence requirements for financial institutions.
- Customer identification and verification
- Beneficial ownership identification
- Enhanced due diligence for high-risk customers
- Simplified due diligence criteria
- Ongoing monitoring obligations

2. RISK ASSESSMENT AND MANAGEMENT
Risk-based approach to AML compliance.
- Enterprise-wide risk assessment
- Customer risk categorization
- Geographic risk considerations
- Product and service risk assessment
- Enhanced measures for high-risk third countries

3. REPORTING OBLIGATIONS
Suspicious activity and transaction reporting.
- Suspicious Activity Reports (SARs)
- Threshold transaction reporting
- Cross-border wire transfer requirements
- Record keeping requirements (5 years minimum)
- Data protection considerations

4. GOVERNANCE AND COMPLIANCE
AML program requirements and oversight.
- AML compliance officer appointment
- Independent audit function
- Employee training programs
- Whistleblowing procedures
- Group-wide AML policies`;
    }

    const filename = `${id}_requirements.txt`;
    const filePath = path.join(this.regulationsPath, filename);
    
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`Created financial regulation: ${filename}`);
  }

  async downloadRegulation(url, filename) {
    // This would be used in production to actually download regulations
    const filePath = path.join(this.regulationsPath, filename);
    const file = await fs.open(filePath, 'w');
    
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      
      protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }
        
        response.pipe(file.createWriteStream());
        
        response.on('end', () => {
          file.close();
          resolve(true);
        });
        
        response.on('error', (error) => {
          file.close();
          fs.unlink(filePath).catch(() => {});
          reject(error);
        });
      }).on('error', reject);
    });
  }

  async addCustomSource(sourceData) {
    const sourceId = `custom-${Date.now()}`;
    
    this.sources[sourceId] = {
      id: sourceId,
      name: sourceData.name,
      description: sourceData.description,
      active: false,
      updateFrequency: sourceData.updateFrequency || 'manual',
      regulations: sourceData.regulations || [],
      custom: true
    };
    
    return { success: true, sourceId: sourceId };
  }

  async updateSource(sourceId, updates) {
    if (!this.sources[sourceId]) {
      throw new Error('Source not found');
    }
    
    Object.assign(this.sources[sourceId], updates);
    return { success: true, source: this.sources[sourceId] };
  }

  async deleteSource(sourceId) {
    if (!this.sources[sourceId]) {
      throw new Error('Source not found');
    }
    
    if (!this.sources[sourceId].custom) {
      throw new Error('Cannot delete built-in sources');
    }
    
    delete this.sources[sourceId];
    return { success: true };
  }
}

module.exports = new RegulationSourcesService();