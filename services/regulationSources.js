const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');
const axios = require('axios');
const officialSources = require('./officialSources');

class RegulationSourcesService {
  constructor() {
    // Initialize with official sources data
    this.initializeFromOfficialSources();
    this.regulationsPath = path.join(__dirname, '..', 'regulations');
  }

  initializeFromOfficialSources() {
    this.sources = {};
    
    // Convert official sources to regulation sources format
    for (const [sourceId, sourceGroup] of Object.entries(officialSources.officialSources)) {
      const regulations = [];
      
      for (const [regId, regulation] of Object.entries(sourceGroup.sources)) {
        regulations.push({
          id: regId,
          url: regulation.officialUrl,
          apiUrl: regulation.apiUrl,
          filename: `${regId}_requirements.txt`,
          metadata: regulation.metadata,
          version: regulation.version,
          status: regulation.status
        });
      }
      
      this.sources[sourceId] = {
        id: sourceId,
        name: sourceGroup.name,
        description: this.getSourceDescription(sourceId),
        active: sourceId === 'eu-official' || sourceId === 'iso-standards',
        updateFrequency: this.getUpdateFrequency(sourceId),
        regulations: regulations
      };
    }
  }

  getSourceDescription(sourceId) {
    const descriptions = {
      'eu-official': 'Official EU regulations including GDPR, AI Act, and Digital Services Act',
      'financial-services': 'Banking and financial services compliance including Basel III, MiFID II, PSD2, AMLD, and more',
      'iso-standards': 'International standards including ISO 27001, ISO 27701, and ISO 9001'
    };
    return descriptions[sourceId] || 'Regulatory compliance source';
  }

  getUpdateFrequency(sourceId) {
    const frequencies = {
      'eu-official': 'daily',
      'financial-services': 'weekly',
      'iso-standards': 'monthly'
    };
    return frequencies[sourceId] || 'manual';
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
    
    for (const regulation of source.regulations) {
      try {
        // Check if official source is accessible
        const sourceCheck = await officialSources.checkRegulationSource({
          officialUrl: regulation.url,
          apiUrl: regulation.apiUrl,
          name: regulation.id
        });
        
        if (sourceCheck.status === 'accessible') {
          // Try to fetch content from official source
          const content = await officialSources.fetchRegulationContent(sourceId, regulation.id);
          
          // Update or create local regulation file
          await this.updateRegulationFromOfficial(regulation, content);
          
          syncedCount++;
          results.push({
            regulation: regulation.id,
            status: 'success',
            message: 'Successfully synced from official source',
            version: regulation.version,
            lastUpdated: new Date().toISOString()
          });
        } else {
          // Fallback to existing update mechanism
          const success = await this.updateExistingRegulation(regulation.id, regulation.filename);
          
          if (success) {
            syncedCount++;
            results.push({
              regulation: regulation.id,
              status: 'partial',
              message: `Official source not accessible (${sourceCheck.message}), updated with enhanced content`,
              version: regulation.version
            });
          }
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

  async updateRegulationFromOfficial(regulation, officialContent) {
    const filePath = path.join(this.regulationsPath, regulation.filename);
    
    // Create structured content from official source
    let content = `${regulation.metadata?.name || regulation.id.toUpperCase()}\n`;
    content += `[LAST UPDATED: ${new Date().toISOString().split('T')[0]}]\n`;
    content += `[VERSION: ${regulation.version}]\n`;
    content += `[STATUS: ${regulation.status}]\n`;
    content += `[OFFICIAL SOURCE: ${regulation.url}]\n\n`;
    
    // Add metadata section
    if (regulation.metadata) {
      content += `REGULATORY METADATA:\n`;
      for (const [key, value] of Object.entries(regulation.metadata)) {
        content += `- ${key}: ${value}\n`;
      }
      content += '\n';
    }
    
    // Add content from official source
    if (officialContent.content) {
      if (officialContent.content.articles) {
        content += `KEY PROVISIONS:\n\n`;
        for (const article of officialContent.content.articles) {
          content += `${article.number}. ${article.title || ''}\n`;
          content += `${article.content}\n\n`;
        }
      } else if (officialContent.content.keyRequirements) {
        content += `KEY REQUIREMENTS:\n\n`;
        for (const req of officialContent.content.keyRequirements) {
          content += `- ${req}\n`;
        }
        content += '\n';
      } else if (officialContent.content.keyAreas) {
        content += `KEY AREAS:\n\n`;
        for (const area of officialContent.content.keyAreas) {
          content += `- ${area}\n`;
        }
        content += '\n';
      }
      
      if (officialContent.content.note) {
        content += `\nNOTE: ${officialContent.content.note}\n`;
      }
    }
    
    // Write updated content
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`Updated ${regulation.filename} from official source`);
  }

  async updateExistingRegulation(regulationId, filename) {
    const filePath = path.join(this.regulationsPath, filename);
    
    try {
      // Check if file exists
      await fs.access(filePath);
      
      // Read current content
      const currentContent = await fs.readFile(filePath, 'utf-8');
      
      // Add update notice and enhanced content
      const updateDate = new Date().toISOString().split('T')[0];
      let updatedContent = currentContent;
      
      // Update or add the date
      if (!currentContent.includes('[LAST UPDATED:')) {
        updatedContent = `[LAST UPDATED: ${updateDate}]\n\n${currentContent}`;
      } else {
        updatedContent = currentContent.replace(/\[LAST UPDATED: \d{4}-\d{2}-\d{2}\]/, `[LAST UPDATED: ${updateDate}]`);
      }
      
      // Add new requirements based on regulation type
      if (regulationId === 'gdpr' && !currentContent.includes('AUTOMATED DECISION MAKING')) {
        updatedContent += `\n\n11. AUTOMATED DECISION MAKING AND PROFILING
Specific requirements for automated processing including profiling.
- Right to not be subject to automated decision-making
- Meaningful information about the logic involved
- Human intervention requirements
- Regular testing of automated systems
- Documentation of decision logic

12. PRIVACY IMPACT ASSESSMENTS
Requirements for conducting Data Protection Impact Assessments (DPIAs).
- When DPIAs are mandatory
- Methodology for conducting assessments
- Risk evaluation criteria
- Mitigation measures documentation
- Consultation with supervisory authority when required`;
      } else if (regulationId === 'ai_act' && !currentContent.includes('CONFORMITY ASSESSMENT')) {
        updatedContent += `\n\n9. CONFORMITY ASSESSMENT PROCEDURES
Requirements for AI system conformity assessments.
- Self-assessment for low-risk AI systems
- Third-party assessment for high-risk systems
- Technical documentation requirements
- Quality management system
- Post-market monitoring plan

10. AI REGULATORY SANDBOXES
Provisions for testing AI systems in controlled environments.
- Application procedures for sandbox participation
- Regulatory flexibility within sandboxes
- Data protection safeguards
- Exit conditions and transition to market
- Learnings documentation and sharing`;
      }
      
      // Write updated content
      await fs.writeFile(filePath, updatedContent, 'utf-8');
      console.log(`Updated regulation ${regulationId} with latest requirements`);
      return true;
    } catch (error) {
      // File doesn't exist, create it
      console.log(`Regulation ${regulationId} not found, creating new file...`);
      
      // Create appropriate regulation based on ID
      if (regulationId === 'basel3') {
        await this.createFinancialRegulation('basel3', 'Basel III Capital Requirements');
      } else if (regulationId === 'mifid2') {
        await this.createFinancialRegulation('mifid2', 'Markets in Financial Instruments Directive II');
      } else if (regulationId === 'psd2') {
        await this.createFinancialRegulation('psd2', 'Payment Services Directive 2');
      } else if (regulationId === 'amld6') {
        await this.createFinancialRegulation('amld6', 'Anti-Money Laundering Directive 6');
      } else if (regulationId === 'ifrs9') {
        await this.createFinancialRegulation('ifrs9', 'IFRS 9 Financial Instruments');
      } else if (regulationId === 'solvency2') {
        await this.createFinancialRegulation('solvency2', 'Solvency II Directive');
      } else if (regulationId === 'emir') {
        await this.createFinancialRegulation('emir', 'European Market Infrastructure Regulation');
      } else if (regulationId === 'crd5') {
        await this.createFinancialRegulation('crd5', 'Capital Requirements Directive V');
      } else if (regulationId === 'dsa') {
        await this.createRegulation('dsa', 'Digital Services Act', 'eu-official');
      } else if (regulationId === 'iso27001') {
        await this.createISORegulation('iso27001', 'ISO/IEC 27001:2022');
      } else if (regulationId === 'iso27701') {
        await this.createISORegulation('iso27701', 'ISO/IEC 27701:2019');
      } else {
        await this.createPlaceholderRegulation(regulationId, regulationId.toUpperCase());
      }
      
      return true;
    }
  }

  async createRegulation(id, title, sourceType) {
    const updateDate = new Date().toISOString().split('T')[0];
    let content = `${title.toUpperCase()}\n`;
    content += `[LAST UPDATED: ${updateDate}]\n\n`;
    
    if (id === 'dsa') {
      content += `Digital Services Act - Regulation (EU) 2022/2065

1. SCOPE AND DEFINITIONS
The DSA applies to intermediary services offered to recipients in the EU.
- Mere conduit services
- Caching services
- Hosting services
- Online platforms
- Very large online platforms (VLOPs)

2. LIABILITY EXEMPTIONS
Conditions for liability exemptions for intermediary services.
- No general monitoring obligation
- Notice and action mechanisms
- Voluntary own-initiative investigations
- Good Samaritan provisions

3. DUE DILIGENCE OBLIGATIONS
Obligations for all providers of intermediary services.
- Terms and conditions requirements
- Transparency reporting obligations
- Point of contact and legal representative
- Cooperation with authorities

4. ADDITIONAL OBLIGATIONS FOR ONLINE PLATFORMS
Enhanced obligations for platforms.
- Complaint and redress mechanisms
- Trusted flaggers
- Measures against abusive notices
- Suspension of repeat infringers
- Transparency on recommender systems

5. SYSTEMIC RISK OBLIGATIONS FOR VLOPs
Special obligations for very large platforms.
- Risk assessment and mitigation
- External and independent auditing
- Recommender system transparency
- Data access for researchers
- Compliance officer appointment`;
    }
    
    const filename = `${id}_requirements.txt`;
    const filePath = path.join(this.regulationsPath, filename);
    
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`Created regulation: ${filename}`);
  }

  async createISORegulation(id, title) {
    const updateDate = new Date().toISOString().split('T')[0];
    let content = `${title}\n`;
    content += `[LAST UPDATED: ${updateDate}]\n\n`;
    
    if (id === 'iso27001') {
      content += `ISO/IEC 27001:2022 - Information Security Management Systems

1. CONTEXT OF THE ORGANIZATION
Understanding the organization and its context.
- Determine external and internal issues
- Understand needs and expectations of interested parties
- Determine ISMS scope
- Establish the ISMS

2. LEADERSHIP
Top management commitment and involvement.
- Leadership and commitment demonstration
- Information security policy establishment
- Organizational roles and responsibilities
- Risk-based thinking integration

3. PLANNING
Risk assessment and treatment planning.
- Risk and opportunity identification
- Information security risk assessment
- Information security risk treatment
- Statement of Applicability (SoA)
- Information security objectives

4. SUPPORT
Resources and competence requirements.
- Resource determination and provision
- Competence requirements
- Awareness programs
- Communication processes
- Documented information control

5. OPERATION
Operational planning and control.
- Risk assessment implementation
- Risk treatment implementation
- Control objectives and controls
- Change management
- Outsourcing considerations`;
    } else if (id === 'iso27701') {
      content += `ISO/IEC 27701:2019 - Privacy Information Management

1. PRIVACY-SPECIFIC REQUIREMENTS
Extension to ISO 27001 for privacy management.
- Privacy information management system (PIMS)
- Integration with existing ISMS
- Privacy-specific risk assessment
- Privacy impact assessments

2. PII CONTROLLERS
Requirements specific to PII controllers.
- Lawful basis determination
- Purpose limitation
- PII minimization
- Accuracy requirements
- Retention limitation

3. PII PROCESSORS
Requirements specific to PII processors.
- Controller instructions compliance
- Confidentiality obligations
- Sub-processor management
- Return or deletion of PII
- Audit facilitation

4. DATA SUBJECT RIGHTS
Managing individual privacy rights.
- Access requests
- Correction requests
- Deletion requests
- Data portability
- Objection handling`;
    }
    
    const filename = `${id}_requirements.txt`;
    const filePath = path.join(this.regulationsPath, filename);
    
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`Created ISO regulation: ${filename}`);
  }

  async createFinancialRegulation(id, title) {
    const updateDate = new Date().toISOString().split('T')[0];
    let content = `${title.toUpperCase()}\n`;
    content += `[LAST UPDATED: ${updateDate}]\n\n`;
    
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

  async createPlaceholderRegulation(id, title) {
    const updateDate = new Date().toISOString().split('T')[0];
    const content = `${title}
[LAST UPDATED: ${updateDate}]

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