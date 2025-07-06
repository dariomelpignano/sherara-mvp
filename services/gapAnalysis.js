const aiService = require('./aiService');
const riskScoring = require('../utils/riskScoring');

class GapAnalysis {
  async analyzeCompliance(documentContent, regulations, documentType) {
    const gaps = [];
    const compliantAreas = [];
    const partiallyCompliantAreas = [];

    // Analyze each regulation requirement
    for (const requirement of regulations) {
      const complianceStatus = await this.checkRequirementCompliance(
        documentContent,
        requirement,
        documentType
      );

      if (complianceStatus.status === 'non-compliant') {
        gaps.push({
          requirement: requirement.title,
          regulation: requirement.regulation,
          category: requirement.category,
          status: complianceStatus.status,
          details: complianceStatus.details,
          risk_score: riskScoring.calculateRiskScore(requirement, complianceStatus),
          evidence: complianceStatus.evidence,
          recommendation: complianceStatus.recommendation
        });
      } else if (complianceStatus.status === 'partially-compliant') {
        partiallyCompliantAreas.push({
          requirement: requirement.title,
          regulation: requirement.regulation,
          details: complianceStatus.details,
          improvements: complianceStatus.improvements
        });
      } else {
        compliantAreas.push({
          requirement: requirement.title,
          regulation: requirement.regulation,
          evidence: complianceStatus.evidence
        });
      }
    }

    // Sort gaps by risk score
    gaps.sort((a, b) => b.risk_score - a.risk_score);

    return {
      summary: {
        totalRequirements: regulations.length,
        compliant: compliantAreas.length,
        partiallyCompliant: partiallyCompliantAreas.length,
        nonCompliant: gaps.length,
        overallComplianceScore: this.calculateOverallScore(
          compliantAreas.length,
          partiallyCompliantAreas.length,
          gaps.length
        )
      },
      gaps: gaps,
      compliantAreas: compliantAreas,
      partiallyCompliantAreas: partiallyCompliantAreas,
      recommendations: await this.generateTopRecommendations(gaps)
    };
  }

  async checkRequirementCompliance(documentContent, requirement, documentType) {
    // Use AI to analyze if the document addresses the requirement
    const analysis = await aiService.analyzeRequirementCompliance(
      documentContent,
      requirement,
      documentType
    );

    // Extract compliance status from AI response
    return this.parseComplianceAnalysis(analysis, requirement);
  }

  parseComplianceAnalysis(aiAnalysis, requirement) {
    // Default structure if AI analysis fails
    const defaultResponse = {
      status: 'non-compliant',
      details: 'Unable to determine compliance status',
      evidence: '',
      recommendation: `Review and implement requirements for ${requirement.title}`
    };

    try {
      // Parse AI response (assuming it returns structured data)
      const { status, evidence, gaps, recommendation } = aiAnalysis;

      return {
        status: status || 'non-compliant',
        details: gaps || 'No specific implementation found',
        evidence: evidence || '',
        recommendation: recommendation || defaultResponse.recommendation,
        improvements: status === 'partially-compliant' ? gaps : undefined
      };
    } catch (error) {
      console.error('Error parsing AI analysis:', error);
      return defaultResponse;
    }
  }

  calculateOverallScore(compliant, partial, nonCompliant) {
    const total = compliant + partial + nonCompliant;
    if (total === 0) return 0;

    const score = ((compliant * 1) + (partial * 0.5) + (nonCompliant * 0)) / total;
    return Math.round(score * 100);
  }

  async generateTopRecommendations(gaps) {
    if (gaps.length === 0) return [];

    // Get top 5 highest risk gaps
    const topGaps = gaps.slice(0, 5);
    const recommendations = [];

    for (const gap of topGaps) {
      recommendations.push({
        priority: gap.risk_score >= 7 ? 'Critical' : gap.risk_score >= 4 ? 'High' : 'Medium',
        regulation: gap.regulation,
        requirement: gap.requirement,
        action: gap.recommendation,
        timeframe: this.estimateTimeframe(gap.risk_score),
        effort: this.estimateEffort(gap.category)
      });
    }

    return recommendations;
  }

  estimateTimeframe(riskScore) {
    if (riskScore >= 8) return 'Immediate (1-2 weeks)';
    if (riskScore >= 6) return 'Short-term (1 month)';
    if (riskScore >= 4) return 'Medium-term (3 months)';
    return 'Long-term (6 months)';
  }

  estimateEffort(category) {
    const effortMap = {
      'Technical': 'High',
      'Security': 'High',
      'Governance': 'Medium',
      'Data Protection': 'Medium',
      'Transparency': 'Low',
      'Rights': 'Low',
      'General': 'Low'
    };
    return effortMap[category] || 'Medium';
  }

  async generateRemediation(gaps) {
    const remediationPlan = {
      executiveSummary: await this.generateExecutiveSummary(gaps),
      prioritizedActions: [],
      timeline: {},
      resourceRequirements: {}
    };

    // Group gaps by regulation and priority
    const groupedGaps = this.groupGapsByPriority(gaps);

    for (const [priority, priorityGaps] of Object.entries(groupedGaps)) {
      const actions = await this.generateActionsForPriority(priority, priorityGaps);
      remediationPlan.prioritizedActions.push({
        priority: priority,
        actions: actions,
        estimatedDuration: this.estimateDuration(actions),
        requiredResources: this.estimateResources(actions)
      });
    }

    return remediationPlan;
  }

  async generateExecutiveSummary(gaps) {
    const criticalCount = gaps.filter(g => g.risk_score >= 7).length;
    const totalRisk = gaps.reduce((sum, g) => sum + g.risk_score, 0);

    return `Compliance Gap Analysis identified ${gaps.length} non-compliant areas with ${criticalCount} critical issues requiring immediate attention. The aggregated risk score is ${totalRisk}, indicating ${this.getRiskLevel(totalRisk)} overall compliance risk. Immediate action is recommended to address high-priority gaps and establish a comprehensive remediation program.`;
  }

  groupGapsByPriority(gaps) {
    const grouped = {
      'Critical': [],
      'High': [],
      'Medium': [],
      'Low': []
    };

    gaps.forEach(gap => {
      if (gap.risk_score >= 7) grouped['Critical'].push(gap);
      else if (gap.risk_score >= 5) grouped['High'].push(gap);
      else if (gap.risk_score >= 3) grouped['Medium'].push(gap);
      else grouped['Low'].push(gap);
    });

    return grouped;
  }

  async generateActionsForPriority(priority, gaps) {
    const actions = [];

    for (const gap of gaps) {
      actions.push({
        requirement: gap.requirement,
        regulation: gap.regulation,
        currentState: gap.details,
        targetState: `Full compliance with ${gap.requirement}`,
        specificActions: await this.generateSpecificActions(gap),
        successCriteria: this.defineSuccessCriteria(gap),
        dependencies: this.identifyDependencies(gap)
      });
    }

    return actions;
  }

  async generateSpecificActions(gap) {
    // Generate specific action items based on gap category
    const actionTemplates = {
      'Data Protection': [
        'Update privacy policy to include required disclosures',
        'Implement consent management system',
        'Document data processing activities',
        'Establish data retention policies'
      ],
      'Security': [
        'Implement encryption for data at rest and in transit',
        'Establish access control procedures',
        'Conduct security risk assessment',
        'Develop incident response plan'
      ],
      'Governance': [
        'Appoint compliance officer',
        'Establish governance framework',
        'Create compliance documentation',
        'Implement regular compliance reviews'
      ],
      'Technical': [
        'Implement technical controls',
        'Update system architecture',
        'Deploy monitoring solutions',
        'Establish backup procedures'
      ]
    };

    const baseActions = actionTemplates[gap.category] || [
      'Review current practices',
      'Develop implementation plan',
      'Update documentation',
      'Train relevant staff'
    ];

    return baseActions.map(action => ({
      action: action,
      owner: 'Compliance Team',
      deadline: this.calculateDeadline(gap.risk_score)
    }));
  }

  defineSuccessCriteria(gap) {
    return [
      `${gap.requirement} fully implemented and documented`,
      'All relevant staff trained on new procedures',
      'Compliance verified through internal audit',
      'No outstanding issues identified'
    ];
  }

  identifyDependencies(gap) {
    const dependencies = [];

    if (gap.category === 'Technical') {
      dependencies.push('IT infrastructure updates');
    }
    if (gap.category === 'Governance') {
      dependencies.push('Management approval', 'Budget allocation');
    }
    if (gap.regulation === 'GDPR') {
      dependencies.push('Legal review', 'Privacy team consultation');
    }

    return dependencies;
  }

  calculateDeadline(riskScore) {
    const today = new Date();
    const daysToAdd = riskScore >= 7 ? 14 : riskScore >= 5 ? 30 : riskScore >= 3 ? 90 : 180;
    const deadline = new Date(today.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
    return deadline.toISOString().split('T')[0];
  }

  estimateDuration(actions) {
    const totalActions = actions.reduce((sum, item) => sum + item.specificActions.length, 0);
    const weeks = Math.ceil(totalActions / 5); // Assume 5 actions per week
    return `${weeks} weeks`;
  }

  estimateResources(actions) {
    return {
      personnel: `${Math.ceil(actions.length / 3)} FTE`, // 3 action items per person
      budget: 'To be determined based on specific requirements',
      external: actions.some(a => a.dependencies.includes('Legal review')) ? 'Legal counsel required' : 'None'
    };
  }

  getRiskLevel(totalRisk) {
    if (totalRisk > 50) return 'Critical';
    if (totalRisk > 30) return 'High';
    if (totalRisk > 15) return 'Medium';
    return 'Low';
  }
}

module.exports = new GapAnalysis();
