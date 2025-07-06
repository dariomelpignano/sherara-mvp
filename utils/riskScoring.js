class RiskScoring {
  calculateRiskScore(requirement, complianceStatus) {
    let score = 0;

    // Base score from requirement risk level
    const riskLevelScores = {
      'high': 7,
      'medium': 4,
      'low': 2
    };
    score += riskLevelScores[requirement.riskLevel] || 4;

    // Adjust based on compliance status
    if (complianceStatus.status === 'non-compliant') {
      score += 3;
    } else if (complianceStatus.status === 'partially-compliant') {
      score += 1;
    }

    // Additional factors
    score += this.getRegulationSeverityModifier(requirement.regulation);
    score += this.getCategoryRiskModifier(requirement.category);

    // Ensure score is between 1 and 10
    return Math.max(1, Math.min(10, Math.round(score)));
  }

  getRegulationSeverityModifier(regulation) {
    const severityMap = {
      'GDPR': 2,              // High penalties
      'AI_Act': 2,            // New and stringent
      'Financial_Compliance': 2, // Heavy scrutiny
      'AML': 3,               // Very high penalties
      'Data_Security': 1      // Important but lower penalties
    };
    return severityMap[regulation] || 1;
  }

  getCategoryRiskModifier(category) {
    const categoryRiskMap = {
      'Data Protection': 1,
      'Security': 2,
      'Technical': 1,
      'Governance': 0,
      'Transparency': 0,
      'Rights': 1,
      'General': 0
    };
    return categoryRiskMap[category] || 0;
  }

  prioritizeGaps(gaps) {
    // Sort by risk score descending, then by regulation importance
    return gaps.sort((a, b) => {
      if (b.risk_score !== a.risk_score) {
        return b.risk_score - a.risk_score;
      }
      // Secondary sort by regulation importance
      const regPriority = {
        'AML': 1,
        'GDPR': 2,
        'AI_Act': 3,
        'Financial_Compliance': 4,
        'Data_Security': 5
      };
      return (regPriority[a.regulation] || 99) - (regPriority[b.regulation] || 99);
    });
  }

  calculateAggregateRisk(gaps) {
    if (gaps.length === 0) return { score: 0, level: 'Low' };

    const totalScore = gaps.reduce((sum, gap) => sum + gap.risk_score, 0);
    const avgScore = totalScore / gaps.length;
    const maxScore = Math.max(...gaps.map(g => g.risk_score));

    // Weighted calculation favoring maximum risk
    const aggregateScore = (avgScore * 0.4) + (maxScore * 0.6);

    let level;
    if (aggregateScore >= 8) level = 'Critical';
    else if (aggregateScore >= 6) level = 'High';
    else if (aggregateScore >= 4) level = 'Medium';
    else level = 'Low';

    return {
      score: Math.round(aggregateScore * 10) / 10,
      level: level,
      totalGaps: gaps.length,
      criticalGaps: gaps.filter(g => g.risk_score >= 8).length,
      highRiskGaps: gaps.filter(g => g.risk_score >= 6).length
    };
  }

  generateRiskMatrix(gaps) {
    const matrix = {
      'Critical': { count: 0, items: [] },
      'High': { count: 0, items: [] },
      'Medium': { count: 0, items: [] },
      'Low': { count: 0, items: [] }
    };

    gaps.forEach(gap => {
      let category;
      if (gap.risk_score >= 8) category = 'Critical';
      else if (gap.risk_score >= 6) category = 'High';
      else if (gap.risk_score >= 4) category = 'Medium';
      else category = 'Low';

      matrix[category].count++;
      matrix[category].items.push({
        requirement: gap.requirement,
        regulation: gap.regulation,
        score: gap.risk_score
      });
    });

    return matrix;
  }
}

module.exports = new RiskScoring();
