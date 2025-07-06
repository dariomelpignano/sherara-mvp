# Sherara MVP - Installation and Usage Guide

## Overview
Sherara is an AI-powered regulatory compliance platform designed for financial services organizations. It helps banks, investment firms, and financial institutions monitor, analyze, and ensure compliance with critical financial regulations. The platform dynamically loads all regulations from the `/regulations` folder and includes comprehensive coverage of financial services regulations including Basel III, MiFID II, PSD2, AMLD6, IFRS 9, Solvency II, EMIR, and CRD V, alongside general regulations like GDPR and EU AI Act.

## Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- OpenAI API key (for AI features)

## Installation

1. Clone or download the project:
```bash
cd sherara-mvp
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Add your OpenAI API key
   - Adjust other settings as needed

```bash
cp .env.example .env
# Edit .env with your settings
```

## Running the Application

1. Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

## Features

### 1. Document Upload
- Upload internal policy documents (PDF, DOC, DOCX, TXT)
- Documents are parsed and stored in session memory
- Support for multiple document types (policies, procedures, etc.)

### 2. Regulations Management
- Manage multiple regulation data sources:
  - **EU Official**: GDPR, AI Act, Digital Services Act
  - **Financial Services**: Basel III, MiFID II, PSD2, AMLD6, IFRS 9, Solvency II, EMIR, CRD V
  - **ISO Standards**: ISO 27001, ISO 27701, ISO 9001
- Activate/deactivate sources as needed
- Sync regulations from external sources
- Add custom regulation sources
- Track updates and changes to regulations
- All synced regulations automatically appear in compliance analysis

### 3. Compliance Analysis
- Analyze uploaded documents against regulatory requirements
- Automatically detects all regulations in the `/regulations` folder
- Supports any compliance framework you add
- Identifies compliance gaps with risk scoring
- Provides actionable recommendations

### 4. AI Assistant
- Chat interface for compliance questions
- Context-aware responses based on uploaded documents
- Provides regulatory guidance and explanations

### 5. Dashboard
- Overview of compliance status
- Risk distribution visualization
- Quick stats on documents and identified gaps

## Usage Workflow

1. **Upload Documents**
   - Navigate to the "Documents" section
   - Click "Choose file" or drag and drop your policy documents
   - Select the document type and upload

2. **Manage Regulations**
   - Navigate to the "Regulations" section
   - View available data sources
   - Activate Financial Services source for banking regulations
   - Activate EU Official for GDPR and AI Act
   - Click "Sync Now" to download latest regulations
   - Check the Updates tab for sync history

3. **Run Analysis**
   - Go to the "Analysis" section
   - Select a document to analyze
   - Choose which regulations to check against
   - Click "Analyze Compliance"

4. **Review Results**
   - View identified compliance gaps
   - Check risk scores and recommendations
   - Generate remediation plans

5. **Ask Questions**
   - Use the AI Assistant for specific queries
   - Get clarification on regulations
   - Receive tailored compliance advice

## API Endpoints

- `POST /api/upload` - Upload documents
- `GET /api/upload/list` - List uploaded documents
- `DELETE /api/upload/:id` - Delete a document
- `POST /api/analyze` - Run compliance analysis
- `POST /api/chat` - Send chat messages
- `GET /api/dashboard` - Get dashboard statistics
- `GET /api/regulations/sources` - List regulation sources
- `POST /api/regulations/sources/:id/activate` - Activate a source
- `POST /api/regulations/sync` - Sync regulations from a source

## Limitations (MVP)

- No persistent storage (session-based only)
- Limited to predefined regulatory documents
- Basic AI integration (requires API key)
- Simple risk scoring algorithm
- English language only

## Troubleshooting

### Server won't start
- Check if port 3000 is available
- Verify Node.js is installed correctly
- Check for missing dependencies

### Upload fails
- Ensure file size is under 10MB
- Verify file format is supported
- Check session hasn't expired (30 min timeout)

### AI features not working
- Verify OpenAI API key is set in .env
- Check API key has sufficient credits
- Ensure internet connection is stable

### Analysis returns no results
- Confirm document was uploaded successfully
- Check document contains relevant content
- Try selecting different regulations

## Security Notes

- Sessions expire after 30 minutes of inactivity
- No data is persisted between sessions
- All processing happens server-side
- API keys should never be exposed client-side

## Development

### Project Structure
```
sherara-mvp/
├── server.js           # Main Express server
├── routes/            # API route handlers
├── services/          # Business logic
├── utils/             # Utility functions
├── public/            # Frontend files
└── regulations/       # Regulatory documents
```

### Adding New Regulations
Sherara now automatically discovers and loads all regulation files from the `/regulations` folder:

1. Create a new .txt file in `/regulations`
   - Use descriptive filename (e.g., `iso27001_requirements.txt`, `hipaa_compliance.txt`)
   - The system will automatically parse the filename for display

2. Follow the existing format for requirements:
   ```
   REGULATION TITLE
   Brief description of the regulation

   1. REQUIREMENT CATEGORY
   Detailed requirement description including:
   - Specific controls or measures
   - Implementation guidelines
   - Compliance criteria

   2. ANOTHER REQUIREMENT
   Description of the requirement...
   ```

3. The regulation will automatically appear in:
   - Analysis wizard for document checking
   - Regulations library
   - Compliance dashboard
   - Coverage charts

Example: See `regulations/sample_new_regulation.txt` for a template

### Extending the AI Service
- Modify prompts in `aiService.js`
- Adjust temperature and token limits
- Implement fallback logic for API failures

## Support

For issues or questions about the MVP:
1. Check the troubleshooting section
2. Review the error logs in console
3. Verify all prerequisites are met

---

This is an MVP demonstration. For production use, additional features like persistent storage, user authentication, and enhanced security measures would be required.
