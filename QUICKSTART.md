# Sherara MVP - Quick Start Guide

## 🚀 Quick Start (3 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env and add your OpenAI API key
```

### 3. Start the Application
```bash
npm start
# Or use the quick start script:
# chmod +x start.sh && ./start.sh
```

### 4. Open Browser
Navigate to: http://localhost:3000

## 📋 First Steps

1. **Upload a Document**
   - Click on "Documents" tab
   - Upload one of the sample documents from `/sample-docs`
   - Or upload your own policy document

2. **Run Analysis**
   - Go to "Analysis" tab
   - Select your uploaded document
   - Choose regulations to check (GDPR, AI Act, etc.)
   - Click "Analyze Compliance"

3. **Review Results**
   - See identified compliance gaps
   - Check risk scores
   - Read recommendations

4. **Ask Questions**
   - Use the "AI Assistant" tab
   - Ask about specific regulations
   - Get compliance guidance

## 🎯 Key Features

- **No Installation Required**: Works with just Node.js
- **AI-Powered**: Uses OpenAI for intelligent analysis
- **Multiple Regulations**: GDPR, AI Act, Financial Compliance
- **Risk Scoring**: Prioritizes compliance gaps
- **Actionable Insights**: Provides specific recommendations

## ⚡ Tips

- Start with sample documents to see how it works
- The AI Assistant can explain any regulation
- Analysis takes 10-30 seconds depending on document size
- Sessions expire after 30 minutes of inactivity

## 🛠️ Troubleshooting

**"Cannot connect to OpenAI"**
- Check your API key in .env
- Ensure you have internet connection
- Verify API key has credits

**"Document upload failed"**
- Check file is under 10MB
- Ensure it's PDF, DOC, DOCX, or TXT
- Try a different browser

**"Analysis not working"**
- Upload a document first
- Select at least one regulation
- Check browser console for errors

## 📚 Sample Documents

Try these included samples:
- `/sample-docs/sample-privacy-policy.txt` - Basic GDPR policy
- `/sample-docs/sample-ai-policy.txt` - AI Act compliance
- `/sample-docs/sample-security-policy.txt` - Security measures

## 🔗 Next Steps

1. Upload your real policies
2. Run comprehensive analysis
3. Export results (coming soon)
4. Integrate with your workflow

---

Need help? Check the full README.md for detailed documentation.
