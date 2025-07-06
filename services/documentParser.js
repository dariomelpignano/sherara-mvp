const pdf = require('pdf-parse');
const mammoth = require('mammoth');

class DocumentParser {
  async parseDocument(buffer, mimeType) {
    try {
      switch (mimeType) {
        case 'application/pdf':
          return await this.parsePDF(buffer);
        
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
          return await this.parseWord(buffer);
        
        case 'text/plain':
          return buffer.toString('utf-8');
        
        default:
          throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      console.error('Document parsing error:', error);
      throw new Error(`Failed to parse document: ${error.message}`);
    }
  }

  async parsePDF(buffer) {
    try {
      const data = await pdf(buffer);
      return this.cleanText(data.text);
    } catch (error) {
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  async parseWord(buffer) {
    try {
      const result = await mammoth.extractRawText({ buffer: buffer });
      return this.cleanText(result.value);
    } catch (error) {
      throw new Error(`Word document parsing failed: ${error.message}`);
    }
  }

  cleanText(text) {
    // Remove excessive whitespace and clean up the text
    return text
      .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
      .replace(/\n{3,}/g, '\n\n')     // Replace multiple newlines with double newline
      .trim();
  }

  extractSections(text) {
    // Extract document sections based on common patterns
    const sections = {};
    const sectionPatterns = [
      { name: 'introduction', pattern: /(?:introduction|overview|executive summary)[\s\S]*?(?=\n\d+\.|$)/i },
      { name: 'policies', pattern: /(?:policies|procedures)[\s\S]*?(?=\n\d+\.|$)/i },
      { name: 'compliance', pattern: /(?:compliance|regulatory)[\s\S]*?(?=\n\d+\.|$)/i },
      { name: 'dataProtection', pattern: /(?:data protection|privacy|GDPR)[\s\S]*?(?=\n\d+\.|$)/i },
      { name: 'security', pattern: /(?:security|technical measures)[\s\S]*?(?=\n\d+\.|$)/i }
    ];

    sectionPatterns.forEach(({ name, pattern }) => {
      const match = text.match(pattern);
      if (match) {
        sections[name] = match[0].trim();
      }
    });

    return sections;
  }
}

module.exports = new DocumentParser();
