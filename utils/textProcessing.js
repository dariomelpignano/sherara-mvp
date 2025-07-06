const fs = require('fs').promises;
const path = require('path');

class TextProcessing {
  // Extract key terms from text using basic NLP techniques
  extractKeyTerms(text, topN = 20) {
    const words = this.tokenize(text.toLowerCase());
    const filtered = this.removeStopWords(words);
    const frequency = this.calculateTermFrequency(filtered);
    
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([term, freq]) => ({ term, frequency: freq }));
  }

  // Basic tokenization
  tokenize(text) {
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  // Remove common stop words
  removeStopWords(words) {
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
      'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this',
      'it', 'from', 'be', 'are', 'been', 'was', 'were', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
      'could', 'may', 'might', 'must', 'can', 'shall', 'if', 'then',
      'than', 'when', 'where', 'why', 'how', 'all', 'both', 'each'
    ]);
    
    return words.filter(word => !stopWords.has(word));
  }

  // Calculate term frequency
  calculateTermFrequency(words) {
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    return frequency;
  }

  // Calculate similarity between two texts
  calculateSimilarity(text1, text2) {
    const terms1 = new Set(this.extractKeyTerms(text1, 50).map(t => t.term));
    const terms2 = new Set(this.extractKeyTerms(text2, 50).map(t => t.term));
    
    const intersection = new Set([...terms1].filter(x => terms2.has(x)));
    const union = new Set([...terms1, ...terms2]);
    
    return intersection.size / union.size;
  }

  // Extract sections from a document
  extractSections(text) {
    const sections = [];
    const lines = text.split('\n');
    let currentSection = null;
    let currentContent = [];

    lines.forEach(line => {
      // Check if line looks like a heading
      if (this.isHeading(line)) {
        if (currentSection) {
          sections.push({
            title: currentSection,
            content: currentContent.join('\n').trim()
          });
        }
        currentSection = line.trim();
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    });

    // Add the last section
    if (currentSection) {
      sections.push({
        title: currentSection,
        content: currentContent.join('\n').trim()
      });
    }

    return sections;
  }

  // Simple heuristic to detect headings
  isHeading(line) {
    const trimmed = line.trim();
    if (!trimmed) return false;
    
    // Check for common heading patterns
    return (
      /^[A-Z\s]{5,}$/.test(trimmed) || // All caps
      /^\d+\.?\s+[A-Z]/.test(trimmed) || // Numbered sections
      /^Article\s+\d+/i.test(trimmed) || // Article numbering
      /^Section\s+\d+/i.test(trimmed) || // Section numbering
      (trimmed.length < 50 && /^[A-Z]/.test(trimmed) && !trimmed.endsWith('.')) // Short, starts with capital, no period
    );
  }

  // Find relevant excerpts containing keywords
  findRelevantExcerpts(text, keywords, contextLength = 100) {
    const excerpts = [];
    const lowerText = text.toLowerCase();
    const sentences = text.split(/[.!?]+/);
    
    keywords.forEach(keyword => {
      const lowerKeyword = keyword.toLowerCase();
      sentences.forEach((sentence, index) => {
        if (sentence.toLowerCase().includes(lowerKeyword)) {
          const start = Math.max(0, index - 1);
          const end = Math.min(sentences.length, index + 2);
          const excerpt = sentences.slice(start, end).join('. ').trim();
          
          if (excerpt) {
            excerpts.push({
              keyword,
              excerpt: excerpt + '.',
              relevance: this.calculateRelevance(sentence, keyword)
            });
          }
        }
      });
    });

    // Sort by relevance and remove duplicates
    return excerpts
      .sort((a, b) => b.relevance - a.relevance)
      .filter((excerpt, index, self) => 
        index === self.findIndex(e => e.excerpt === excerpt.excerpt)
      )
      .slice(0, 5);
  }

  // Calculate relevance score
  calculateRelevance(text, keyword) {
    const lowerText = text.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    let score = 0;

    // Exact match
    if (lowerText.includes(lowerKeyword)) score += 10;

    // Word boundaries
    const regex = new RegExp(`\\b${lowerKeyword}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) score += matches.length * 5;

    // Position in text (earlier is better)
    const position = lowerText.indexOf(lowerKeyword);
    if (position !== -1) {
      score += Math.max(0, 10 - (position / 10));
    }

    return score;
  }

  // Clean and normalize text
  normalizeText(text) {
    return text
      .replace(/\s+/g, ' ')              // Normalize whitespace
      .replace(/[""]/g, '"')             // Normalize quotes
      .replace(/['']/g, "'")             // Normalize apostrophes
      .replace(/…/g, '...')              // Normalize ellipsis
      .replace(/[—–]/g, '-')             // Normalize dashes
      .replace(/\r\n/g, '\n')            // Normalize line endings
      .trim();
  }

  // Extract dates from text
  extractDates(text) {
    const dates = [];
    const datePatterns = [
      /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,  // MM/DD/YYYY or MM-DD-YYYY
      /\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/g,    // YYYY/MM/DD or YYYY-MM-DD
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi,
      /\b\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\b/gi
    ];

    datePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        dates.push(...matches);
      }
    });

    return [...new Set(dates)];
  }

  // Extract monetary amounts
  extractMonetaryAmounts(text) {
    const amounts = [];
    const patterns = [
      /[€$£¥]\s*\d+(?:,\d{3})*(?:\.\d{2})?/g,  // Currency symbol followed by number
      /\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:euro|dollar|pound|yen)s?/gi  // Number followed by currency name
    ];

    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        amounts.push(...matches);
      }
    });

    return amounts;
  }

  // Extract percentages
  extractPercentages(text) {
    const pattern = /\b\d+(?:\.\d+)?%/g;
    return text.match(pattern) || [];
  }

  // Highlight text with keywords
  highlightKeywords(text, keywords) {
    let highlightedText = text;
    
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
      highlightedText = highlightedText.replace(regex, '**$1**');
    });

    return highlightedText;
  }

  // Generate summary by extracting key sentences
  generateSummary(text, maxSentences = 5) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    if (sentences.length <= maxSentences) {
      return text;
    }

    // Score sentences based on keyword frequency
    const keyTerms = this.extractKeyTerms(text, 10).map(t => t.term);
    const scoredSentences = sentences.map((sentence, index) => {
      let score = 0;
      
      // Position score (earlier sentences often more important)
      score += (sentences.length - index) / sentences.length;
      
      // Keyword score
      keyTerms.forEach(term => {
        if (sentence.toLowerCase().includes(term)) {
          score += 2;
        }
      });

      // Length score (prefer medium-length sentences)
      const words = sentence.trim().split(/\s+/).length;
      if (words >= 10 && words <= 30) {
        score += 1;
      }

      return { sentence: sentence.trim(), score, index };
    });

    // Select top sentences and maintain order
    const selected = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSentences)
      .sort((a, b) => a.index - b.index)
      .map(item => item.sentence);

    return selected.join('. ') + '.';
  }
}

module.exports = new TextProcessing();
