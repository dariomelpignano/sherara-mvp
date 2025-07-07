# Industry-Specific Regulation Libraries

Sherara MVP now supports industry-specific regulation libraries, allowing you to focus on the regulations most relevant to your business sector.

## Supported Industries

### 🏦 Financial Services
- **Regulations**: MiFID II, Basel III, DORA, GDPR
- **Focus Areas**: Capital adequacy, Risk management, Client protection, Operational resilience, Transaction reporting
- **Use Cases**: Banks, Investment firms, Payment processors, Financial advisors

### 🏥 Medicinal Gases
- **Regulations**: EU GMP, ISO 7396, GDPR
- **Focus Areas**: Good manufacturing practice, Quality management systems, Pipeline system safety, Gas purity standards, Distribution controls
- **Use Cases**: Medical gas manufacturers, Hospital systems, Gas distributors, Healthcare facilities

### 🍎 Food and Beverages
- **Regulations**: HACCP, EU Food Law, GDPR
- **Focus Areas**: Hazard analysis and control, Food safety management, Traceability systems, Quality assurance, Consumer protection
- **Use Cases**: Food manufacturers, Beverage producers, Restaurants, Food distributors

## How to Use

### Option 1: Interactive Menu
Start the application with an interactive industry selection menu:

```bash
npm run start:interactive
```

or

```bash
node start-industry.js
```

This will display a menu where you can choose your industry.

### Option 2: Direct Industry Selection
Start directly with a specific industry:

```bash
# Financial Services
npm run start:financial

# Medicinal Gases  
npm run start:medical

# Food and Beverages
npm run start:food
```

### Option 3: Command Line Parameter
You can also use the standard start command with the industry parameter:

```bash
node server.js --industry=financial-services
node server.js --industry=medicinal-gases
node server.js --industry=food-beverages
```

## What Changes?

When you select an industry, the following aspects of the application are customized:

### 1. Regulation Library
- Only regulations relevant to your industry are loaded
- Industry-specific regulation files from `/regulations/{industry}/` folders
- Fallback to common regulations when industry-specific versions don't exist

### 2. User Interface
- Header shows your selected industry with appropriate icon and color
- Dashboard displays industry-specific information card
- Regulations section shows industry context and specializations
- Compliance analysis focuses on industry-relevant requirements

### 3. AI Analysis
- Analysis prompts are contextualized for your industry
- Risk assessment considers industry-specific factors
- Recommendations are tailored to industry best practices

## Regulation File Structure

```
regulations/
├── financial-services/
│   ├── mifid2.md
│   ├── basel3.md
│   └── dora.md
├── medicinal-gases/
│   ├── eu-gmp.md
│   └── iso-7396.md
├── food-beverages/
│   ├── haccp.md
│   └── eu-food-law.md
└── gdpr.md (common regulation)
```

## Adding New Industries

To add a new industry:

1. **Create regulation folder**: `regulations/{industry-key}/`
2. **Add regulation files**: Create `.md` files for industry-specific regulations
3. **Update industryConfig.js**: Add the new industry to the `supportedIndustries` object
4. **Update start-industry.js**: Add the industry to the menu
5. **Add npm script**: Add a start script in package.json

### Industry Configuration Format

```javascript
'industry-key': {
  name: 'Industry Display Name',
  description: 'Brief description of the industry',
  regulations: ['regulation1', 'regulation2', 'gdpr'], // regulation file names
  icon: 'fa-icon-name', // FontAwesome icon
  color: '#hexcolor' // Brand color for the industry
}
```

## Default Behavior

If no industry is specified, the application defaults to Financial Services with appropriate logging to indicate available options.

## Benefits

- **Focused Compliance**: Only see regulations relevant to your industry
- **Reduced Complexity**: Eliminate irrelevant regulatory noise
- **Industry Expertise**: Specialized guidance and recommendations
- **Scalable Architecture**: Easy to add new industries and regulations
- **Flexible Deployment**: Same codebase serves multiple industries

## Technical Implementation

The industry-specific feature is implemented through:

- **Command line argument parsing** in `server.js`
- **Industry configuration service** (`services/industryConfig.js`)
- **Dynamic regulation loading** in `services/regulatoryAnalyzer.js`
- **UI contextualization** in the frontend (`public/app.js`)
- **Interactive startup script** (`start-industry.js`)

This architecture ensures that industry specialization is seamlessly integrated throughout the entire application stack.