const fs = require('fs').promises;
const path = require('path');

class TaxonomyService {
  constructor() {
    this.taxonomy = {
      // Primary Categories
      categories: {
        'regulatory': {
          id: 'regulatory',
          name: 'Regulatory Documents',
          description: 'Official regulatory requirements and compliance frameworks',
          color: '#dc2626',
          subcategories: [
            'data-protection',
            'financial-services',
            'ai-governance',
            'cybersecurity',
            'operational-risk'
          ]
        },
        'policy': {
          id: 'policy',
          name: 'Internal Policies',
          description: 'Organization-specific policies and procedures',
          color: '#2563eb',
          subcategories: [
            'privacy-policy',
            'security-policy',
            'hr-policy',
            'operational-policy',
            'governance-policy'
          ]
        },
        'procedure': {
          id: 'procedure',
          name: 'Procedures & Guidelines',
          description: 'Step-by-step procedures and implementation guidelines',
          color: '#059669',
          subcategories: [
            'implementation-guide',
            'process-procedure',
            'technical-procedure',
            'compliance-procedure',
            'emergency-procedure'
          ]
        },
        'assessment': {
          id: 'assessment',
          name: 'Assessments & Audits',
          description: 'Risk assessments, audits, and evaluation documents',
          color: '#7c3aed',
          subcategories: [
            'risk-assessment',
            'compliance-audit',
            'security-audit',
            'impact-assessment',
            'gap-analysis'
          ]
        },
        'contract': {
          id: 'contract',
          name: 'Contracts & Agreements',
          description: 'Legal agreements and contractual documents',
          color: '#ea580c',
          subcategories: [
            'data-processing-agreement',
            'vendor-contract',
            'service-agreement',
            'confidentiality-agreement',
            'compliance-agreement'
          ]
        },
        'training': {
          id: 'training',
          name: 'Training & Documentation',
          description: 'Training materials and educational resources',
          color: '#0891b2',
          subcategories: [
            'compliance-training',
            'security-training',
            'process-training',
            'awareness-material',
            'certification-material'
          ]
        }
      },

      // Subcategories with detailed metadata
      subcategories: {
        // Data Protection
        'data-protection': {
          id: 'data-protection',
          name: 'Data Protection & Privacy',
          parent: 'regulatory',
          regulations: ['gdpr', 'ccpa', 'pipeda'],
          keywords: ['personal data', 'privacy', 'data subject', 'consent', 'data protection'],
          riskLevel: 'high'
        },
        'financial-services': {
          id: 'financial-services',
          name: 'Financial Services',
          parent: 'regulatory',
          regulations: ['basel3', 'mifid2', 'psd2', 'amld6', 'ifrs9', 'solvency2'],
          keywords: ['capital requirements', 'liquidity', 'aml', 'kyc', 'financial instruments'],
          riskLevel: 'high'
        },
        'ai-governance': {
          id: 'ai-governance',
          name: 'AI Governance & Ethics',
          parent: 'regulatory',
          regulations: ['ai_act', 'algorithmic_accountability'],
          keywords: ['artificial intelligence', 'machine learning', 'algorithmic', 'ai system', 'automated decision'],
          riskLevel: 'high'
        },
        'cybersecurity': {
          id: 'cybersecurity',
          name: 'Cybersecurity & Information Security',
          parent: 'regulatory',
          regulations: ['iso27001', 'iso27701', 'nist', 'data_security'],
          keywords: ['security', 'cybersecurity', 'information security', 'data breach', 'vulnerability'],
          riskLevel: 'high'
        },
        'operational-risk': {
          id: 'operational-risk',
          name: 'Operational Risk Management',
          parent: 'regulatory',
          regulations: ['operational_risk', 'business_continuity'],
          keywords: ['operational risk', 'business continuity', 'disaster recovery', 'resilience'],
          riskLevel: 'medium'
        },

        // Policy Subcategories
        'privacy-policy': {
          id: 'privacy-policy',
          name: 'Privacy Policies',
          parent: 'policy',
          regulations: ['gdpr', 'ccpa'],
          keywords: ['privacy policy', 'data collection', 'cookies', 'user data'],
          riskLevel: 'high'
        },
        'security-policy': {
          id: 'security-policy',
          name: 'Security Policies',
          parent: 'policy',
          regulations: ['iso27001', 'data_security'],
          keywords: ['security policy', 'access control', 'password policy', 'incident response'],
          riskLevel: 'high'
        },
        'hr-policy': {
          id: 'hr-policy',
          name: 'HR Policies',
          parent: 'policy',
          regulations: ['employment_law', 'data_protection'],
          keywords: ['employee', 'human resources', 'workplace', 'employment'],
          riskLevel: 'medium'
        },

        // Assessment Subcategories
        'risk-assessment': {
          id: 'risk-assessment',
          name: 'Risk Assessments',
          parent: 'assessment',
          regulations: ['iso27001', 'gdpr'],
          keywords: ['risk assessment', 'threat analysis', 'vulnerability assessment'],
          riskLevel: 'high'
        },
        'compliance-audit': {
          id: 'compliance-audit',
          name: 'Compliance Audits',
          parent: 'assessment',
          regulations: ['multiple'],
          keywords: ['audit', 'compliance review', 'assessment', 'evaluation'],
          riskLevel: 'medium'
        },
        'impact-assessment': {
          id: 'impact-assessment',
          name: 'Impact Assessments',
          parent: 'assessment',
          regulations: ['gdpr', 'ai_act'],
          keywords: ['impact assessment', 'dpia', 'privacy impact', 'ai impact'],
          riskLevel: 'high'
        }
      },

      // Regulatory Tags
      regulatoryTags: {
        'gdpr': {
          id: 'gdpr',
          name: 'GDPR',
          fullName: 'General Data Protection Regulation',
          jurisdiction: 'EU',
          type: 'regulation',
          effectiveDate: '2018-05-25',
          color: '#1f2937'
        },
        'ai_act': {
          id: 'ai_act',
          name: 'EU AI Act',
          fullName: 'Artificial Intelligence Act',
          jurisdiction: 'EU',
          type: 'regulation',
          effectiveDate: '2024-08-01',
          color: '#7c3aed'
        },
        'basel3': {
          id: 'basel3',
          name: 'Basel III',
          fullName: 'Basel III Capital Requirements',
          jurisdiction: 'Global',
          type: 'standard',
          effectiveDate: '2023-01-01',
          color: '#059669'
        },
        'mifid2': {
          id: 'mifid2',
          name: 'MiFID II',
          fullName: 'Markets in Financial Instruments Directive II',
          jurisdiction: 'EU',
          type: 'directive',
          effectiveDate: '2018-01-03',
          color: '#dc2626'
        },
        'psd2': {
          id: 'psd2',
          name: 'PSD2',
          fullName: 'Payment Services Directive 2',
          jurisdiction: 'EU',
          type: 'directive',
          effectiveDate: '2018-01-13',
          color: '#ea580c'
        },
        'iso27001': {
          id: 'iso27001',
          name: 'ISO 27001',
          fullName: 'Information Security Management Systems',
          jurisdiction: 'International',
          type: 'standard',
          effectiveDate: '2022-10-01',
          color: '#0891b2'
        }
      },

      // Functional Tags
      functionalTags: {
        'data-handling': {
          id: 'data-handling',
          name: 'Data Handling',
          description: 'Documents related to data collection, processing, and storage',
          color: '#2563eb'
        },
        'access-control': {
          id: 'access-control',
          name: 'Access Control',
          description: 'User access management and authorization',
          color: '#059669'
        },
        'incident-management': {
          id: 'incident-management',
          name: 'Incident Management',
          description: 'Security incidents and breach response',
          color: '#dc2626'
        },
        'vendor-management': {
          id: 'vendor-management',
          name: 'Vendor Management',
          description: 'Third-party vendor and supplier management',
          color: '#7c3aed'
        },
        'training-awareness': {
          id: 'training-awareness',
          name: 'Training & Awareness',
          description: 'Employee training and awareness programs',
          color: '#0891b2'
        },
        'monitoring-reporting': {
          id: 'monitoring-reporting',
          name: 'Monitoring & Reporting',
          description: 'Compliance monitoring and regulatory reporting',
          color: '#ea580c'
        }
      },

      // Risk Level Tags
      riskLevels: {
        'critical': {
          id: 'critical',
          name: 'Critical',
          description: 'Highest priority compliance requirements',
          color: '#991b1b',
          priority: 1
        },
        'high': {
          id: 'high',
          name: 'High',
          description: 'High-priority compliance requirements',
          color: '#dc2626',
          priority: 2
        },
        'medium': {
          id: 'medium',
          name: 'Medium',
          description: 'Medium-priority compliance requirements',
          color: '#ea580c',
          priority: 3
        },
        'low': {
          id: 'low',
          name: 'Low',
          description: 'Lower-priority compliance requirements',
          color: '#059669',
          priority: 4
        }
      },

      // Content Type Tags
      contentTypes: {
        'policy-document': {
          id: 'policy-document',
          name: 'Policy Document',
          description: 'Formal policy statements and requirements'
        },
        'procedure-guide': {
          id: 'procedure-guide',
          name: 'Procedure Guide',
          description: 'Step-by-step implementation procedures'
        },
        'assessment-report': {
          id: 'assessment-report',
          name: 'Assessment Report',
          description: 'Risk assessments and audit reports'
        },
        'training-material': {
          id: 'training-material',
          name: 'Training Material',
          description: 'Educational and training content'
        },
        'legal-document': {
          id: 'legal-document',
          name: 'Legal Document',
          description: 'Contracts, agreements, and legal requirements'
        },
        'technical-specification': {
          id: 'technical-specification',
          name: 'Technical Specification',
          description: 'Technical requirements and specifications'
        }
      }
    };
  }

  // Auto-classify document based on content analysis
  async classifyDocument(documentContent, filename, documentType = null) {
    const classification = {
      categories: [],
      subcategories: [],
      regulatoryTags: [],
      functionalTags: [],
      riskLevel: 'medium',
      contentType: null,
      confidence: 0,
      suggestedTags: []
    };

    const content = documentContent.toLowerCase();
    const name = filename.toLowerCase();

    // 1. Analyze content for regulatory keywords
    for (const [regId, regData] of Object.entries(this.taxonomy.regulatoryTags)) {
      const keywords = this.getRegulationKeywords(regId);
      const matches = keywords.filter(keyword => 
        content.includes(keyword.toLowerCase()) || name.includes(keyword.toLowerCase())
      );
      
      if (matches.length > 0) {
        classification.regulatoryTags.push(regId);
        classification.confidence += matches.length * 0.1;
      }
    }

    // 2. Classify into subcategories based on keywords
    for (const [subId, subData] of Object.entries(this.taxonomy.subcategories)) {
      const keywordMatches = subData.keywords.filter(keyword =>
        content.includes(keyword.toLowerCase()) || name.includes(keyword.toLowerCase())
      );
      
      if (keywordMatches.length >= 2) {
        classification.subcategories.push(subId);
        classification.categories.push(subData.parent);
        classification.riskLevel = this.getHigherRiskLevel(classification.riskLevel, subData.riskLevel);
        classification.confidence += keywordMatches.length * 0.15;
      }
    }

    // 3. Determine functional tags
    classification.functionalTags = this.analyzeFunctionalContent(content, name);

    // 4. Determine content type
    classification.contentType = this.determineContentType(content, name, documentType);

    // 5. Generate suggested tags based on analysis
    classification.suggestedTags = this.generateSuggestedTags(content, classification);

    // 6. Remove duplicates and normalize confidence
    classification.categories = [...new Set(classification.categories)];
    classification.subcategories = [...new Set(classification.subcategories)];
    classification.regulatoryTags = [...new Set(classification.regulatoryTags)];
    classification.functionalTags = [...new Set(classification.functionalTags)];
    classification.confidence = Math.min(classification.confidence, 1.0);

    return classification;
  }

  // Get keywords for specific regulation
  getRegulationKeywords(regulationId) {
    const keywordMap = {
      'gdpr': ['gdpr', 'personal data', 'data subject', 'consent', 'data protection', 'privacy', 'data controller', 'data processor'],
      'ai_act': ['artificial intelligence', 'ai system', 'machine learning', 'automated decision', 'algorithmic', 'ai model'],
      'basel3': ['capital requirements', 'tier 1 capital', 'leverage ratio', 'liquidity coverage', 'basel', 'banking'],
      'mifid2': ['mifid', 'investment services', 'financial instruments', 'best execution', 'client categorization'],
      'psd2': ['payment services', 'strong customer authentication', 'open banking', 'payment initiation', 'account information'],
      'iso27001': ['information security', 'isms', 'security controls', 'risk management', 'security policy']
    };
    return keywordMap[regulationId] || [];
  }

  // Analyze functional content patterns
  analyzeFunctionalContent(content, filename) {
    const functionalTags = [];
    
    const patterns = {
      'data-handling': ['data collection', 'data processing', 'data storage', 'data retention', 'data deletion'],
      'access-control': ['access control', 'user access', 'authentication', 'authorization', 'permissions'],
      'incident-management': ['incident response', 'security incident', 'data breach', 'incident handling'],
      'vendor-management': ['third party', 'vendor', 'supplier', 'outsourcing', 'service provider'],
      'training-awareness': ['training', 'awareness', 'education', 'learning', 'certification'],
      'monitoring-reporting': ['monitoring', 'reporting', 'audit', 'compliance review', 'assessment']
    };

    for (const [tagId, keywords] of Object.entries(patterns)) {
      const matches = keywords.filter(keyword => 
        content.includes(keyword) || filename.includes(keyword)
      );
      if (matches.length >= 1) {
        functionalTags.push(tagId);
      }
    }

    return functionalTags;
  }

  // Determine content type based on patterns
  determineContentType(content, filename, documentType) {
    if (documentType) {
      const typeMapping = {
        'privacy_policy': 'policy-document',
        'security_policy': 'policy-document',
        'ai_policy': 'policy-document',
        'data_processing': 'legal-document',
        'internal_policy': 'policy-document',
        'procedure': 'procedure-guide'
      };
      if (typeMapping[documentType]) {
        return typeMapping[documentType];
      }
    }

    // Analyze content patterns
    if (content.includes('policy') || content.includes('shall') || content.includes('must')) {
      return 'policy-document';
    }
    if (content.includes('procedure') || content.includes('step') || content.includes('process')) {
      return 'procedure-guide';
    }
    if (content.includes('assessment') || content.includes('audit') || content.includes('evaluation')) {
      return 'assessment-report';
    }
    if (content.includes('training') || content.includes('course') || content.includes('learning')) {
      return 'training-material';
    }
    if (content.includes('agreement') || content.includes('contract') || content.includes('terms')) {
      return 'legal-document';
    }
    if (content.includes('specification') || content.includes('technical') || content.includes('implementation')) {
      return 'technical-specification';
    }

    return 'policy-document'; // Default
  }

  // Generate additional suggested tags
  generateSuggestedTags(content, classification) {
    const suggestions = [];
    
    // Add jurisdiction tags based on regulatory tags
    if (classification.regulatoryTags.some(tag => ['gdpr', 'mifid2', 'psd2', 'ai_act'].includes(tag))) {
      suggestions.push('eu-regulation');
    }
    if (classification.regulatoryTags.includes('basel3')) {
      suggestions.push('global-standard');
    }

    // Add industry-specific tags
    if (classification.regulatoryTags.some(tag => ['basel3', 'mifid2', 'psd2'].includes(tag))) {
      suggestions.push('financial-services');
    }
    if (classification.regulatoryTags.includes('gdpr') || content.includes('privacy')) {
      suggestions.push('data-privacy');
    }
    if (classification.regulatoryTags.includes('ai_act') || content.includes('artificial intelligence')) {
      suggestions.push('ai-governance');
    }

    return suggestions;
  }

  // Compare risk levels and return higher one
  getHigherRiskLevel(current, new_level) {
    const levels = { 'critical': 1, 'high': 2, 'medium': 3, 'low': 4 };
    return levels[new_level] < levels[current] ? new_level : current;
  }

  // Get all available tags for UI
  getAllTags() {
    return {
      categories: this.taxonomy.categories,
      subcategories: this.taxonomy.subcategories,
      regulatoryTags: this.taxonomy.regulatoryTags,
      functionalTags: this.taxonomy.functionalTags,
      riskLevels: this.taxonomy.riskLevels,
      contentTypes: this.taxonomy.contentTypes
    };
  }

  // Get tags by category
  getTagsByCategory(category) {
    switch (category) {
      case 'regulatory':
        return this.taxonomy.regulatoryTags;
      case 'functional':
        return this.taxonomy.functionalTags;
      case 'risk':
        return this.taxonomy.riskLevels;
      case 'content':
        return this.taxonomy.contentTypes;
      default:
        return {};
    }
  }

  // Apply tags to document
  async applyTagsToDocument(documentId, tags, session) {
    if (!session.documents[documentId]) {
      throw new Error('Document not found');
    }

    // Validate tags
    const validatedTags = this.validateTags(tags);
    
    // Apply tags to document
    session.documents[documentId].tags = {
      ...session.documents[documentId].tags,
      ...validatedTags,
      lastUpdated: new Date().toISOString()
    };

    return session.documents[documentId];
  }

  // Validate tags against taxonomy
  validateTags(tags) {
    const validated = {};
    
    if (tags.categories) {
      validated.categories = tags.categories.filter(cat => this.taxonomy.categories[cat]);
    }
    if (tags.subcategories) {
      validated.subcategories = tags.subcategories.filter(sub => this.taxonomy.subcategories[sub]);
    }
    if (tags.regulatoryTags) {
      validated.regulatoryTags = tags.regulatoryTags.filter(reg => this.taxonomy.regulatoryTags[reg]);
    }
    if (tags.functionalTags) {
      validated.functionalTags = tags.functionalTags.filter(func => this.taxonomy.functionalTags[func]);
    }
    if (tags.riskLevel && this.taxonomy.riskLevels[tags.riskLevel]) {
      validated.riskLevel = tags.riskLevel;
    }
    if (tags.contentType && this.taxonomy.contentTypes[tags.contentType]) {
      validated.contentType = tags.contentType;
    }

    return validated;
  }

  // Search documents by tags
  searchByTags(documents, searchCriteria) {
    return Object.values(documents).filter(doc => {
      if (!doc.tags) return false;

      // Check categories
      if (searchCriteria.categories && searchCriteria.categories.length > 0) {
        if (!doc.tags.categories || !searchCriteria.categories.some(cat => doc.tags.categories.includes(cat))) {
          return false;
        }
      }

      // Check regulatory tags
      if (searchCriteria.regulatoryTags && searchCriteria.regulatoryTags.length > 0) {
        if (!doc.tags.regulatoryTags || !searchCriteria.regulatoryTags.some(reg => doc.tags.regulatoryTags.includes(reg))) {
          return false;
        }
      }

      // Check risk level
      if (searchCriteria.riskLevel) {
        if (doc.tags.riskLevel !== searchCriteria.riskLevel) {
          return false;
        }
      }

      // Check content type
      if (searchCriteria.contentType) {
        if (doc.tags.contentType !== searchCriteria.contentType) {
          return false;
        }
      }

      return true;
    });
  }

  // Generate taxonomy report
  generateTaxonomyReport(documents) {
    const report = {
      totalDocuments: Object.keys(documents).length,
      taggedDocuments: 0,
      untaggedDocuments: 0,
      categoryDistribution: {},
      riskDistribution: {},
      regulatoryCoverage: {},
      contentTypeDistribution: {}
    };

    Object.values(documents).forEach(doc => {
      if (doc.tags) {
        report.taggedDocuments++;
        
        // Count categories
        if (doc.tags.categories) {
          doc.tags.categories.forEach(cat => {
            report.categoryDistribution[cat] = (report.categoryDistribution[cat] || 0) + 1;
          });
        }

        // Count risk levels
        if (doc.tags.riskLevel) {
          report.riskDistribution[doc.tags.riskLevel] = (report.riskDistribution[doc.tags.riskLevel] || 0) + 1;
        }

        // Count regulatory tags
        if (doc.tags.regulatoryTags) {
          doc.tags.regulatoryTags.forEach(reg => {
            report.regulatoryCoverage[reg] = (report.regulatoryCoverage[reg] || 0) + 1;
          });
        }

        // Count content types
        if (doc.tags.contentType) {
          report.contentTypeDistribution[doc.tags.contentType] = (report.contentTypeDistribution[doc.tags.contentType] || 0) + 1;
        }
      } else {
        report.untaggedDocuments++;
      }
    });

    return report;
  }
}

module.exports = new TaxonomyService();