# Document Taxonomy System

## Overview

The Sherara MVP now includes a comprehensive document taxonomy system that automatically classifies and tags both regulatory documents and user-uploaded documents. This system enables efficient organization, search, and compliance management.

## Key Features

### 1. Automatic Document Classification
- **AI-Powered Analysis**: Uses content analysis to automatically classify documents
- **Confidence Scoring**: Provides confidence levels for auto-classifications
- **Real-time Processing**: Documents are classified immediately upon upload

### 2. Comprehensive Tag Structure
The taxonomy system includes multiple tag categories:

#### Primary Categories
- **Regulatory Documents**: Official regulatory requirements and compliance frameworks
- **Internal Policies**: Organization-specific policies and procedures  
- **Procedures & Guidelines**: Step-by-step procedures and implementation guidelines
- **Assessments & Audits**: Risk assessments, audits, and evaluation documents
- **Contracts & Agreements**: Legal agreements and contractual documents
- **Training & Documentation**: Training materials and educational resources

#### Regulatory Tags
- **GDPR**: General Data Protection Regulation (EU)
- **EU AI Act**: Artificial Intelligence Act (EU)
- **Basel III**: Capital Requirements (Global)
- **MiFID II**: Markets in Financial Instruments Directive II (EU)
- **PSD2**: Payment Services Directive 2 (EU)
- **ISO 27001**: Information Security Management Systems (International)

#### Functional Tags
- **Data Handling**: Data collection, processing, and storage
- **Access Control**: User access management and authorization
- **Incident Management**: Security incidents and breach response
- **Vendor Management**: Third-party vendor and supplier management
- **Training & Awareness**: Employee training and awareness programs
- **Monitoring & Reporting**: Compliance monitoring and regulatory reporting

#### Risk Levels
- **Critical**: Highest priority compliance requirements
- **High**: High-priority compliance requirements
- **Medium**: Medium-priority compliance requirements
- **Low**: Lower-priority compliance requirements

#### Content Types
- **Policy Document**: Formal policy statements and requirements
- **Procedure Guide**: Step-by-step implementation procedures
- **Assessment Report**: Risk assessments and audit reports
- **Training Material**: Educational and training content
- **Legal Document**: Contracts, agreements, and legal requirements
- **Technical Specification**: Technical requirements and specifications

### 3. Smart Classification Engine

The classification engine analyzes document content using:

#### Keyword Analysis
- Regulatory-specific keywords (e.g., "personal data", "GDPR", "consent")
- Functional keywords (e.g., "access control", "incident response")
- Risk indicators (e.g., "mandatory", "shall", "penalty")

#### Content Pattern Recognition
- Document structure analysis
- Language patterns for different document types
- Regulatory citation detection

#### Confidence Scoring
- Weighted scoring based on keyword matches
- Content pattern analysis
- Document type indicators
- Minimum 30% confidence threshold for auto-tagging

### 4. User Interface Components

#### Overview Dashboard
- Total documents statistics
- Tagged vs. untagged document counts
- Category distribution charts
- Risk level distribution
- Regulatory coverage analysis

#### Document Tagging Interface
- Individual document tagging cards
- Auto-classification display with confidence scores
- Manual tag selection checkboxes
- Bulk tagging operations

#### Search & Filter System
- Multi-criteria search by categories, regulations, risk levels
- Real-time search results
- Filter counts and statistics
- Export search results

#### Tag Management
- Complete taxonomy browser
- Tag usage statistics
- Tag relationship visualization
- Administrative controls

## API Endpoints

### Core Taxonomy Operations
```
GET /api/taxonomy/tags                    # Get all available tags
GET /api/taxonomy/tags/:category          # Get tags by category
POST /api/taxonomy/classify               # Auto-classify a document
GET /api/taxonomy/stats                   # Get taxonomy statistics
GET /api/taxonomy/report                  # Generate taxonomy report
```

### Document Tag Management
```
GET /api/taxonomy/documents/:id/tags      # Get document tags
POST /api/taxonomy/documents/:id/tags     # Apply tags to document
POST /api/taxonomy/search                 # Search documents by tags
POST /api/taxonomy/auto-tag-all           # Auto-tag all documents
```

## Integration Points

### 1. Document Upload
- Automatic classification on upload
- Tags applied if confidence > 30%
- Classification stored for manual review

### 2. Regulatory Analysis
- Regulations auto-classified on load
- Classification metadata added to requirements
- Enhanced analysis with taxonomy context

### 3. Compliance Reporting
- Tag-based compliance coverage reports
- Risk distribution analysis
- Regulatory gap identification

### 4. Search and Discovery
- Tag-based document search
- Faceted search with multiple criteria
- Compliance-focused document discovery

## Configuration

### Taxonomy Structure
The taxonomy is defined in `services/taxonomyService.js` with:
- Hierarchical category structure
- Keyword mappings for auto-classification
- Risk level definitions
- Regulatory metadata

### Classification Rules
- **Confidence Threshold**: 30% for auto-tagging
- **Keyword Weighting**: Regulatory keywords have higher weight
- **Content Analysis**: Pattern matching for document types
- **Manual Override**: Users can always modify auto-classifications

### Performance Optimization
- Cached taxonomy data for fast lookups
- Asynchronous classification processing
- Batch operations for bulk tagging
- Efficient search indexing

## Benefits

### For Compliance Officers
- **Automated Organization**: Documents automatically categorized
- **Risk Prioritization**: Clear risk level indicators
- **Compliance Gaps**: Easy identification of coverage gaps
- **Audit Readiness**: Well-organized document repository

### For Organizations
- **Efficiency**: Reduced manual classification effort
- **Consistency**: Standardized tagging across all documents
- **Searchability**: Fast, accurate document discovery
- **Compliance**: Better regulatory coverage tracking

### For Auditors
- **Transparency**: Clear document classification rationale
- **Traceability**: Full audit trail of document tags
- **Coverage**: Comprehensive view of compliance documentation
- **Reporting**: Detailed taxonomy and coverage reports

## Future Enhancements

### Machine Learning Improvements
- Training on organization-specific document patterns
- Improved confidence scoring algorithms
- Custom classification rules per organization
- Feedback-based learning from user corrections

### Advanced Features
- Hierarchical tag relationships
- Custom taxonomy extensions
- Integration with external compliance frameworks
- Automated compliance gap detection

### Reporting Enhancements
- Interactive taxonomy visualizations
- Compliance coverage heatmaps
- Trend analysis over time
- Regulatory change impact analysis

## Technical Implementation

### Backend Services
- `taxonomyService.js`: Core taxonomy logic and classification
- `taxonomyRoutes.js`: API endpoints for taxonomy operations
- Integration with existing document and analysis services

### Frontend Components
- Taxonomy section with 4 tabs (Overview, Documents, Search, Manage)
- Interactive charts and visualizations
- Document tagging interface
- Search and filter components

### Data Storage
- Session-based storage (no persistent database)
- In-memory taxonomy cache
- Document metadata with classification results
- Search indices for performance

This taxonomy system provides a solid foundation for document organization and compliance management, with the flexibility to evolve based on specific organizational needs and regulatory requirements.