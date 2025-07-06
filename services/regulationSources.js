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
      'us-federal': {
        id: 'us-federal',
        name: 'US Federal Regulations',
        description: 'US federal compliance requirements including HIPAA, SOX, and CCPA',
        active: false,
        updateFrequency: 'weekly',
        regulations: [
          { id: 'hipaa', url: 'https://example.com/hipaa.txt', filename: 'hipaa_requirements.txt' },
          { id: 'sox', url: 'https://example.com/sox.txt', filename: 'sox_requirements.txt' },
          { id: 'ccpa', url: 'https://example.com/ccpa.txt', filename: 'ccpa_requirements.txt' }
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
      if (regulation.id === 'hipaa') {
        await this.createPlaceholderRegulation('hipaa', 'HIPAA Privacy and Security Rules');
      } else if (regulation.id === 'sox') {
        await this.createPlaceholderRegulation('sox', 'Sarbanes-Oxley Act Compliance');
      } else if (regulation.id === 'ccpa') {
        await this.createPlaceholderRegulation('ccpa', 'California Consumer Privacy Act');
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