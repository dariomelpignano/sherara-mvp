const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

class OfficialSourcesService {
  constructor() {
    this.officialSources = {
      'eu-official': {
        id: 'eu-official',
        name: 'European Union Official Sources',
        sources: {
          'gdpr': {
            name: 'General Data Protection Regulation (GDPR)',
            officialUrl: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj',
            apiUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679',
            lastChecked: null,
            version: '2016/679',
            status: 'in-force',
            metadata: {
              adoptedDate: '2016-04-27',
              effectiveDate: '2018-05-25',
              lastAmended: '2016-05-04'
            }
          },
          'ai_act': {
            name: 'Artificial Intelligence Act',
            officialUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52021PC0206',
            apiUrl: null, // Proposal stage - no final API yet
            lastChecked: null,
            version: '2021/0106(COD)',
            status: 'proposal',
            metadata: {
              proposedDate: '2021-04-21',
              expectedAdoption: '2024',
              lastAmended: '2023-06-14'
            }
          },
          'dsa': {
            name: 'Digital Services Act',
            officialUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2065',
            apiUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R2065',
            lastChecked: null,
            version: '2022/2065',
            status: 'in-force',
            metadata: {
              adoptedDate: '2022-10-19',
              effectiveDate: '2022-11-16',
              fullApplicationDate: '2024-02-17'
            }
          }
        }
      },
      'financial-services': {
        id: 'financial-services',
        name: 'Financial Services Regulatory Sources',
        sources: {
          'basel3': {
            name: 'Basel III Framework',
            officialUrl: 'https://www.bis.org/basel_framework/',
            apiUrl: 'https://www.bis.org/basel_framework/standard/RBC.htm',
            lastChecked: null,
            version: 'Basel III',
            status: 'in-force',
            metadata: {
              issuingBody: 'Basel Committee on Banking Supervision',
              lastRevised: '2023-01',
              implementationDeadline: '2023-01-01'
            }
          },
          'mifid2': {
            name: 'Markets in Financial Instruments Directive II',
            officialUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32014L0065',
            apiUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32014L0065',
            lastChecked: null,
            version: '2014/65/EU',
            status: 'in-force',
            metadata: {
              adoptedDate: '2014-05-15',
              effectiveDate: '2018-01-03',
              lastAmended: '2023-03-10'
            }
          },
          'psd2': {
            name: 'Payment Services Directive 2',
            officialUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32015L2366',
            apiUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32015L2366',
            lastChecked: null,
            version: '2015/2366',
            status: 'in-force',
            metadata: {
              adoptedDate: '2015-11-25',
              effectiveDate: '2018-01-13',
              scaDeadline: '2021-12-31'
            }
          },
          'amld6': {
            name: '6th Anti-Money Laundering Directive',
            officialUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32018L1673',
            apiUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32018L1673',
            lastChecked: null,
            version: '2018/1673',
            status: 'in-force',
            metadata: {
              adoptedDate: '2018-10-23',
              transpositionDeadline: '2020-12-03',
              effectiveDate: '2020-12-03'
            }
          }
        }
      },
      'iso-standards': {
        id: 'iso-standards',
        name: 'ISO International Standards',
        sources: {
          'iso27001': {
            name: 'ISO/IEC 27001:2022',
            officialUrl: 'https://www.iso.org/standard/82875.html',
            apiUrl: null, // ISO doesn't provide free API access
            lastChecked: null,
            version: '2022',
            status: 'current',
            metadata: {
              publishedDate: '2022-10',
              replaces: 'ISO/IEC 27001:2013',
              scope: 'Information security management systems'
            }
          },
          'iso27701': {
            name: 'ISO/IEC 27701:2019',
            officialUrl: 'https://www.iso.org/standard/71670.html',
            apiUrl: null,
            lastChecked: null,
            version: '2019',
            status: 'current',
            metadata: {
              publishedDate: '2019-08',
              scope: 'Privacy information management',
              extendsStandard: 'ISO/IEC 27001 and ISO/IEC 27002'
            }
          }
        }
      }
    };
  }

  async performSanityCheck() {
    console.log('🔍 Starting sanity check on all regulation sources...\n');
    const results = {
      timestamp: new Date().toISOString(),
      sources: {},
      summary: {
        total: 0,
        accessible: 0,
        errors: 0,
        warnings: 0
      }
    };

    for (const [sourceId, sourceGroup] of Object.entries(this.officialSources)) {
      console.log(`\n📋 Checking ${sourceGroup.name}...`);
      results.sources[sourceId] = {
        name: sourceGroup.name,
        regulations: {}
      };

      for (const [regId, regulation] of Object.entries(sourceGroup.sources)) {
        results.summary.total++;
        const checkResult = await this.checkRegulationSource(regulation);
        results.sources[sourceId].regulations[regId] = checkResult;

        if (checkResult.status === 'accessible') {
          results.summary.accessible++;
          console.log(`  ✅ ${regulation.name}: Accessible`);
        } else if (checkResult.status === 'warning') {
          results.summary.warnings++;
          console.log(`  ⚠️  ${regulation.name}: ${checkResult.message}`);
        } else {
          results.summary.errors++;
          console.log(`  ❌ ${regulation.name}: ${checkResult.message}`);
        }
      }
    }

    // Save sanity check results
    const resultsPath = path.join(__dirname, '..', 'logs', 'sanity-check.json');
    await this.ensureDirectory(path.dirname(resultsPath));
    await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));

    console.log('\n📊 Sanity Check Summary:');
    console.log(`   Total sources: ${results.summary.total}`);
    console.log(`   ✅ Accessible: ${results.summary.accessible}`);
    console.log(`   ⚠️  Warnings: ${results.summary.warnings}`);
    console.log(`   ❌ Errors: ${results.summary.errors}`);

    return results;
  }

  async checkRegulationSource(regulation) {
    const result = {
      name: regulation.name,
      url: regulation.officialUrl,
      status: 'unknown',
      message: '',
      lastChecked: new Date().toISOString(),
      metadata: regulation.metadata
    };

    try {
      // Check if URL is accessible
      const response = await axios.head(regulation.officialUrl, {
        timeout: 10000,
        validateStatus: (status) => status < 500
      });

      if (response.status === 200) {
        result.status = 'accessible';
        result.message = 'Source is accessible';
        
        // Additional checks for API URLs if available
        if (regulation.apiUrl) {
          try {
            const apiResponse = await axios.head(regulation.apiUrl, {
              timeout: 10000,
              validateStatus: (status) => status < 500
            });
            if (apiResponse.status !== 200) {
              result.status = 'warning';
              result.message = 'Main URL accessible but API URL returned ' + apiResponse.status;
            }
          } catch (apiError) {
            result.status = 'warning';
            result.message = 'Main URL accessible but API URL check failed';
          }
        }
      } else {
        result.status = 'warning';
        result.message = `URL returned status ${response.status}`;
      }
    } catch (error) {
      result.status = 'error';
      result.message = error.message;
    }

    // Update last checked timestamp
    regulation.lastChecked = result.lastChecked;

    return result;
  }

  async fetchRegulationContent(sourceId, regulationId) {
    const sourceGroup = this.officialSources[sourceId];
    if (!sourceGroup) {
      throw new Error(`Source ${sourceId} not found`);
    }

    const regulation = sourceGroup.sources[regulationId];
    if (!regulation) {
      throw new Error(`Regulation ${regulationId} not found in ${sourceId}`);
    }

    console.log(`📥 Fetching ${regulation.name} from official source...`);

    // For EU regulations with API access
    if (regulation.apiUrl && regulation.apiUrl.includes('eur-lex.europa.eu')) {
      return await this.fetchEurLexContent(regulation);
    }

    // For Basel framework
    if (regulation.officialUrl.includes('bis.org')) {
      return await this.fetchBaselContent(regulation);
    }

    // For ISO standards (limited access)
    if (regulation.officialUrl.includes('iso.org')) {
      return this.generateISOSummary(regulation);
    }

    // Default: return metadata and link
    return this.generateDefaultContent(regulation);
  }

  async fetchEurLexContent(regulation) {
    try {
      const response = await axios.get(regulation.apiUrl || regulation.officialUrl, {
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      
      // Extract key sections
      const articles = [];
      $('.article').each((i, elem) => {
        const articleNum = $(elem).find('.article-number').text();
        const articleTitle = $(elem).find('.article-title').text();
        const articleContent = $(elem).find('.article-content').text();
        
        if (articleNum && articleContent) {
          articles.push({
            number: articleNum.trim(),
            title: articleTitle.trim(),
            content: articleContent.trim()
          });
        }
      });

      return {
        source: regulation.name,
        version: regulation.version,
        status: regulation.status,
        officialUrl: regulation.officialUrl,
        fetchedAt: new Date().toISOString(),
        metadata: regulation.metadata,
        content: {
          articles: articles.slice(0, 20), // First 20 articles for summary
          totalArticles: articles.length
        }
      };
    } catch (error) {
      console.error(`Failed to fetch EUR-Lex content: ${error.message}`);
      return this.generateDefaultContent(regulation);
    }
  }

  async fetchBaselContent(regulation) {
    // Basel Committee doesn't provide easy API access
    // Return structured summary based on known Basel III requirements
    return {
      source: regulation.name,
      version: regulation.version,
      status: regulation.status,
      officialUrl: regulation.officialUrl,
      fetchedAt: new Date().toISOString(),
      metadata: regulation.metadata,
      content: {
        note: 'Basel framework content requires manual extraction from official PDFs',
        keyRequirements: [
          'Minimum Capital Requirements (Pillar 1)',
          'Supervisory Review Process (Pillar 2)',
          'Market Discipline (Pillar 3)',
          'Leverage Ratio Framework',
          'Liquidity Coverage Ratio (LCR)',
          'Net Stable Funding Ratio (NSFR)'
        ]
      }
    };
  }

  generateISOSummary(regulation) {
    return {
      source: regulation.name,
      version: regulation.version,
      status: regulation.status,
      officialUrl: regulation.officialUrl,
      fetchedAt: new Date().toISOString(),
      metadata: regulation.metadata,
      content: {
        note: 'ISO standards are copyrighted and require purchase for full access',
        scope: regulation.metadata.scope,
        keyAreas: this.getISOKeyAreas(regulation.name)
      }
    };
  }

  generateDefaultContent(regulation) {
    return {
      source: regulation.name,
      version: regulation.version,
      status: regulation.status,
      officialUrl: regulation.officialUrl,
      fetchedAt: new Date().toISOString(),
      metadata: regulation.metadata,
      content: {
        note: 'Full content extraction not available for this source',
        manualReview: 'Please visit the official URL for complete information'
      }
    };
  }

  getISOKeyAreas(isoName) {
    const keyAreas = {
      'ISO/IEC 27001:2022': [
        'Context of the organization',
        'Leadership and commitment',
        'Planning and risk assessment',
        'Support and resources',
        'Operation and controls',
        'Performance evaluation',
        'Improvement'
      ],
      'ISO/IEC 27701:2019': [
        'Privacy-specific requirements',
        'PII controllers and processors',
        'Privacy risk assessments',
        'Privacy by design',
        'Data subject rights',
        'Cross-border transfers'
      ]
    };
    return keyAreas[isoName] || ['Standard requirements as per ISO framework'];
  }

  async ensureDirectory(dir) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async generateSourceReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      sources: this.officialSources,
      statistics: {
        totalSources: 0,
        totalRegulations: 0,
        byStatus: {},
        byType: {}
      }
    };

    for (const [sourceId, sourceGroup] of Object.entries(this.officialSources)) {
      report.statistics.totalSources++;
      report.statistics.byType[sourceId] = Object.keys(sourceGroup.sources).length;
      
      for (const regulation of Object.values(sourceGroup.sources)) {
        report.statistics.totalRegulations++;
        report.statistics.byStatus[regulation.status] = 
          (report.statistics.byStatus[regulation.status] || 0) + 1;
      }
    }

    return report;
  }
}

module.exports = new OfficialSourcesService();