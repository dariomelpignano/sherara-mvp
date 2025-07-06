# 🚀 Sherara MVP - Quick Reference

## 🌐 Access Your Application
**URL:** http://localhost:3000

## ⚡ Quick Start
1. **Server is already running!** Just open your browser
2. Upload a sample document from `sample-docs/` folder
3. Run compliance analysis
4. Ask the AI Assistant questions

## 🔑 Key Features

### 📄 Document Upload
- Supported: PDF, DOCX, DOC, TXT
- Max size: 10MB
- Location: Documents tab

### 🔍 Compliance Analysis
- **Regulations covered:**
  - GDPR
  - EU AI Act
  - Financial Compliance
  - AML Requirements
  - Data Security

### 💬 AI Assistant
- Ask compliance questions
- Get remediation advice
- Context-aware responses

### 📊 Dashboard
- Real-time statistics
- Risk distribution
- Compliance overview

## ⚠️ Important Notes
- **Session timeout:** 30 minutes
- **No persistence:** Data cleared after session
- **AI features:** Add OpenAI API key in `.env`

## 🧪 Test Flow
1. Upload `sample-privacy-policy.txt`
2. Analyze against GDPR
3. Review gaps and recommendations
4. Ask AI: "How can I fix these gaps?"

## 🛠️ Commands
```bash
# Start server (already running)
npm start

# Stop server
Ctrl+C

# Install dependencies
npm install
```

## 📁 Key Files
- `public/` - Frontend UI
- `regulations/` - Compliance requirements
- `sample-docs/` - Test documents
- `.env` - Configuration (add API key here)

---
**Ready to use at:** http://localhost:3000