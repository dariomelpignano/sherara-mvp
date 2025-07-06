// Enhanced Sherara MVP - Main Application
'use strict';

// Global state management
const AppState = {
    currentSection: 'dashboard',
    documents: [],
    analysisResults: {},
    chatHistory: [],
    complianceScore: 0,
    notifications: [],
    charts: {},
    insights: [],
    regulations: []
};

// Global variable for chat file attachment
let chatAttachedFile = null;

// API configuration
const API = {
    BASE: '/api',
    endpoints: {
        upload: '/upload',
        documents: '/upload/list',
        deleteDoc: '/upload/',
        analyze: '/analyze',
        remediation: '/analyze/remediation/',
        chat: '/chat',
        suggestions: '/chat/suggestions',
        dashboard: '/dashboard'
    }
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Core initialization
    initializeNavigation();
    initializeFileUpload();
    initializeAnalysis();
    initializeChat();
    initializeCharts();
    
    // Load initial data
    loadDashboard();
    loadDocuments();
    loadRegulations();
    loadInsights();
    
    // Set up periodic updates
    setInterval(updateHeaderStats, 30000);
    
    // Initialize tooltips and animations
    initializeUI();
}

// Enhanced Navigation System
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.getAttribute('data-section');
            navigateToSection(section);
        });
    });
    
    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.section) {
            navigateToSection(e.state.section, false);
        }
    });
}

function navigateToSection(section, pushState = true) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-section') === section);
    });
    
    // Update content sections with animation
    document.querySelectorAll('.content-section').forEach(sec => {
        if (sec.id === section) {
            sec.style.display = 'block';
            requestAnimationFrame(() => {
                sec.classList.add('active');
            });
        } else {
            sec.classList.remove('active');
            setTimeout(() => {
                if (!sec.classList.contains('active')) {
                    sec.style.display = 'none';
                }
            }, 300);
        }
    });
    
    AppState.currentSection = section;
    
    // Update browser history
    if (pushState) {
        history.pushState({ section }, '', `#${section}`);
    }
    
    // Load section-specific data
    loadSectionData(section);
}

async function loadSectionData(section) {
    switch (section) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'documents':
            loadDocuments();
            break;
        case 'taxonomy':
            await loadTaxonomySection();
            break;
        case 'analysis':
            await initializeAnalysisWizard();
            break;
        case 'compliance-map':
            renderComplianceMap();
            break;
        case 'insights':
            loadInsights();
            break;
        case 'regulations':
            renderRegulations();
            break;
        case 'reports':
            loadReports();
            break;
    }
}

// Enhanced File Upload with Drag & Drop
function initializeFileUpload() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const uploadForm = document.getElementById('upload-form');
    
    // Drag and drop handlers
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => {
            uploadZone.classList.add('dragover');
        });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => {
            uploadZone.classList.remove('dragover');
        });
    });
    
    uploadZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelect(files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });
    
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await uploadDocument(new FormData(uploadForm));
    });
}

function handleFileSelect(file) {
    const uploadZone = document.getElementById('upload-zone');
    uploadZone.querySelector('h4').textContent = file.name;
    uploadZone.querySelector('p').textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
}

async function uploadDocument(formData) {
    showLoading('Uploading document...', 'Please wait while we process your file');
    
    try {
        const response = await fetch(`${API.BASE}${API.endpoints.upload}`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Success', 'Document uploaded successfully', 'success');
            closeUploadModal();
            loadDocuments();
            updateHeaderStats();
            
            // Add to activity timeline
            addActivity('upload', `Uploaded ${result.filename}`);
        } else {
            showNotification('Error', result.error || 'Upload failed', 'error');
        }
    } catch (error) {
        showNotification('Error', 'Failed to upload document', 'error');
        console.error('Upload error:', error);
    } finally {
        hideLoading();
    }
}

// Enhanced Document Management
async function loadDocuments() {
    try {
        const response = await fetch(`${API.BASE}${API.endpoints.documents}`);
        const data = await response.json();
        
        AppState.documents = data.documents || [];
        renderDocuments();
        updateDocumentBadge();
    } catch (error) {
        console.error('Failed to load documents:', error);
        showNotification('Error', 'Failed to load documents', 'error');
    }
}

function renderDocuments() {
    const container = document.getElementById('documents-grid');
    
    if (AppState.documents.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>No documents uploaded</h3>
                <p>Upload your compliance documents to get started</p>
                <button class="btn btn-primary" onclick="showUploadModal()">
                    <i class="fas fa-upload"></i> Upload First Document
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = AppState.documents.map(doc => `
        <div class="document-card" data-doc-id="${doc.id}">
            <div class="document-header">
                <div class="document-icon">
                    <i class="fas ${getDocumentIcon(doc.type)}"></i>
                </div>
                <div class="document-actions">
                    <button class="btn btn-icon btn-small" onclick="analyzeDocument('${doc.id}')" title="Analyze">
                        <i class="fas fa-microscope"></i>
                    </button>
                    <button class="btn btn-icon btn-small" onclick="downloadDocument('${doc.id}')" title="Download">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn btn-icon btn-small btn-danger" onclick="deleteDocument('${doc.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <h4 class="document-title">${doc.name}</h4>
            <div class="document-meta">
                <span><i class="fas fa-file-alt"></i> ${doc.type}</span>
                <span><i class="fas fa-font"></i> ${formatNumber(doc.wordCount)} words</span>
                <span><i class="fas fa-calendar"></i> ${formatDate(doc.uploadedAt)}</span>
            </div>
            ${doc.tags ? `
                <div class="document-tags">
                    ${doc.tags.split(',').map(tag => `<span class="tag">${tag.trim()}</span>`).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');
    
    // Add click handlers for document cards
    container.querySelectorAll('.document-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.document-actions')) {
                showDocumentDetails(card.dataset.docId);
            }
        });
    });
}

async function deleteDocument(documentId) {
    const confirmed = await showConfirmDialog(
        'Delete Document',
        'Are you sure you want to delete this document? This action cannot be undone.'
    );
    
    if (!confirmed) return;
    
    showLoading('Deleting document...');
    
    try {
        const response = await fetch(`${API.BASE}${API.endpoints.deleteDoc}${documentId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Success', 'Document deleted successfully', 'success');
            loadDocuments();
            updateHeaderStats();
            addActivity('delete', 'Deleted a document');
        } else {
            showNotification('Error', result.error || 'Delete failed', 'error');
        }
    } catch (error) {
        showNotification('Error', 'Failed to delete document', 'error');
        console.error('Delete error:', error);
    } finally {
        hideLoading();
    }
}

// Enhanced Analysis Wizard
async function initializeAnalysisWizard() {
    const wizardContent = document.getElementById('analysis-wizard-content');
    
    // Ensure regulations are loaded
    if (!AppState.regulations || AppState.regulations.length === 0) {
        await loadRegulations();
    }
    
    renderAnalysisStep1();
}

function renderAnalysisStep1() {
    const wizardContent = document.getElementById('analysis-wizard-content');
    
    // Check if we have documents
    if (!AppState.documents || AppState.documents.length === 0) {
        wizardContent.innerHTML = `
            <div class="wizard-step-content">
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <h3>No documents available</h3>
                    <p>Upload documents first to start compliance analysis</p>
                    <button class="btn btn-primary" onclick="showUploadModal()">
                        <i class="fas fa-upload"></i> Upload Document
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    wizardContent.innerHTML = `
        <div class="wizard-step-content">
            <h3>Select Document to Analyze</h3>
            <div class="document-selection-grid">
                ${AppState.documents.map(doc => `
                    <div class="selectable-document" data-doc-id="${doc.id}">
                        <i class="fas ${getDocumentIcon(doc.type)}"></i>
                        <h4>${doc.name}</h4>
                        <p>${doc.type} • ${formatNumber(doc.wordCount)} words</p>
                    </div>
                `).join('')}
            </div>
            <div class="wizard-actions">
                <button class="btn btn-secondary" disabled>Previous</button>
                <button class="btn btn-primary" onclick="proceedToStep2()" disabled id="step1-next">
                    Next <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        </div>
    `;
    
    // Add selection handlers
    wizardContent.querySelectorAll('.selectable-document').forEach(doc => {
        doc.addEventListener('click', () => {
            wizardContent.querySelectorAll('.selectable-document').forEach(d => {
                d.classList.remove('selected');
            });
            doc.classList.add('selected');
            document.getElementById('step1-next').disabled = false;
        });
    });
}

async function proceedToStep2() {
    const selectedDoc = document.querySelector('.selectable-document.selected');
    if (!selectedDoc) return;
    
    const docId = selectedDoc.dataset.docId;
    
    // Ensure regulations are loaded before proceeding
    if (!AppState.regulations || AppState.regulations.length === 0) {
        showLoading('Loading regulations...', 'Please wait while we fetch available regulations');
        await loadRegulations();
        hideLoading();
    }
    
    updateWizardStep(2);
    renderAnalysisStep2(docId);
}

function renderAnalysisStep2(docId) {
    const wizardContent = document.getElementById('analysis-wizard-content');
    
    // Check if regulations are available
    if (!AppState.regulations || AppState.regulations.length === 0) {
        wizardContent.innerHTML = `
            <div class="wizard-step-content">
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>No regulations available</h3>
                    <p>Unable to load regulations. Please try again.</p>
                    <button class="btn btn-primary" onclick="loadRegulations().then(() => renderAnalysisStep2('${docId}'))">
                        <i class="fas fa-sync"></i> Retry Loading Regulations
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    // Generate regulation cards from loaded regulations
    const regulationCards = AppState.regulations.map((reg, index) => {
        // Map regulation IDs to appropriate icons
        const iconMap = {
            'gdpr': 'fa-shield-alt',
            'ai_act': 'fa-robot',
            'financial_compliance': 'fa-coins',
            'aml': 'fa-money-check-alt',
            'data_security': 'fa-lock',
            'basel3': 'fa-university',
            'mifid2': 'fa-chart-line',
            'psd2': 'fa-credit-card'
        };
        const icon = iconMap[reg.id] || 'fa-gavel';
        
        // Check first few by default
        const isChecked = index < 3 ? 'checked' : '';
        
        return `
            <label class="regulation-option">
                <input type="checkbox" name="regulations" value="${reg.id}" ${isChecked}>
                <div class="regulation-card">
                    <i class="fas ${icon}"></i>
                    <h4>${reg.displayName}</h4>
                    <p>${reg.description.substring(0, 100)}${reg.description.length > 100 ? '...' : ''}</p>
                </div>
            </label>
        `;
    }).join('');
    
    wizardContent.innerHTML = `
        <div class="wizard-step-content">
            <h3>Select Regulations to Check</h3>
            <p class="step-description">Choose which regulations to analyze your document against. We've pre-selected the most common ones.</p>
            <div class="regulations-grid">
                ${regulationCards}
            </div>
            <div class="wizard-actions">
                <button class="btn btn-secondary" onclick="backToStep1()">
                    <i class="fas fa-arrow-left"></i> Previous
                </button>
                <button class="btn btn-primary" onclick="runAnalysis('${docId}')">
                    Run Analysis <i class="fas fa-play"></i>
                </button>
            </div>
        </div>
    `;
}

function backToStep1() {
    updateWizardStep(1);
    renderAnalysisStep1();
}

function updateWizardStep(step) {
    document.querySelectorAll('.wizard-step').forEach((s, index) => {
        s.classList.toggle('active', index + 1 === step);
        s.classList.toggle('completed', index + 1 < step);
    });
}

async function runAnalysis(documentId) {
    const regulations = Array.from(document.querySelectorAll('input[name="regulations"]:checked'))
        .map(cb => cb.value);
    
    if (regulations.length === 0) {
        showNotification('Warning', 'Please select at least one regulation', 'warning');
        return;
    }
    
    showLoading('Analyzing document...', 'Our AI is reviewing your document for compliance gaps');
    updateLoadingProgress(0);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
        const currentProgress = parseInt(document.getElementById('loading-progress').style.width) || 0;
        if (currentProgress < 90) {
            updateLoadingProgress(currentProgress + 10);
        }
    }, 500);
    
    try {
        const response = await fetch(`${API.BASE}${API.endpoints.analyze}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentId, regulations })
        });
        
        const result = await response.json();
        clearInterval(progressInterval);
        updateLoadingProgress(100);
        
        if (result.success) {
            AppState.analysisResults[result.analysisId] = result;
            updateWizardStep(3);
            renderAnalysisResults(result);
            showNotification('Success', 'Analysis completed successfully', 'success');
            updateHeaderStats();
            addActivity('analysis', `Analyzed ${result.documentName}`);
        } else {
            showNotification('Error', result.error || 'Analysis failed', 'error');
        }
    } catch (error) {
        clearInterval(progressInterval);
        showNotification('Error', 'Failed to analyze document', 'error');
        console.error('Analysis error:', error);
    } finally {
        hideLoading();
    }
}

function renderAnalysisResults(result) {
    const wizardContent = document.getElementById('analysis-wizard-content');
    const analysis = result.analysis;
    
    wizardContent.innerHTML = `
        <div class="analysis-results-container">
            <div class="results-header">
                <h3>${result.documentName} - Analysis Complete</h3>
                <div class="compliance-score-display">
                    <div class="score-circle" data-score="${analysis.summary.overallComplianceScore}">
                        <svg width="120" height="120">
                            <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" stroke-width="10"/>
                            <circle cx="60" cy="60" r="50" fill="none" stroke="${getScoreColor(analysis.summary.overallComplianceScore)}" 
                                    stroke-width="10" stroke-dasharray="${Math.PI * 100}" 
                                    stroke-dashoffset="${Math.PI * 100 * (1 - analysis.summary.overallComplianceScore / 100)}"
                                    transform="rotate(-90 60 60)"/>
                        </svg>
                        <div class="score-text">
                            <span class="score-value">${analysis.summary.overallComplianceScore}%</span>
                            <span class="score-label">Compliant</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="results-summary">
                <div class="summary-card">
                    <i class="fas fa-check-circle" style="color: var(--success)"></i>
                    <h4>${analysis.summary.compliant}</h4>
                    <p>Compliant</p>
                </div>
                <div class="summary-card">
                    <i class="fas fa-exclamation-circle" style="color: var(--warning)"></i>
                    <h4>${analysis.summary.partiallyCompliant}</h4>
                    <p>Partially Compliant</p>
                </div>
                <div class="summary-card">
                    <i class="fas fa-times-circle" style="color: var(--danger)"></i>
                    <h4>${analysis.summary.nonCompliant}</h4>
                    <p>Non-Compliant</p>
                </div>
            </div>
            
            <div class="gaps-section">
                <h3>Identified Compliance Gaps (${analysis.gaps.length})</h3>
                <div class="gaps-list">
                    ${analysis.gaps.map(gap => renderGapItem(gap)).join('')}
                </div>
            </div>
            
            <div class="wizard-actions">
                <button class="btn btn-secondary" onclick="initializeAnalysisWizard()">
                    <i class="fas fa-redo"></i> New Analysis
                </button>
                <button class="btn btn-primary" onclick="generateRemediation('${result.analysisId}')">
                    <i class="fas fa-tools"></i> Generate Remediation Plan
                </button>
            </div>
        </div>
    `;
    
    // Animate score circle
    setTimeout(() => {
        const circle = wizardContent.querySelector('.score-circle circle:last-child');
        if (circle) {
            circle.style.transition = 'stroke-dashoffset 1s ease-in-out';
        }
    }, 100);
}

function renderGapItem(gap) {
    return `
        <div class="gap-item ${getRiskClass(gap.risk_score)}">
            <div class="gap-header">
                <h4>${gap.requirement}</h4>
                <span class="risk-badge risk-${getRiskLevel(gap.risk_score)}">
                    <i class="fas fa-fire"></i> Risk: ${gap.risk_score}/10
                </span>
            </div>
            <div class="gap-details">
                <p><i class="fas fa-balance-scale"></i> <strong>Regulation:</strong> ${gap.regulation}</p>
                <p><i class="fas fa-folder"></i> <strong>Category:</strong> ${gap.category}</p>
                <p><i class="fas fa-info-circle"></i> <strong>Details:</strong> ${gap.details}</p>
                <p><i class="fas fa-lightbulb"></i> <strong>Recommendation:</strong> ${gap.recommendation}</p>
            </div>
        </div>
    `;
}

// Chat Upload Functions
let chatAttachedFile = null;

function triggerChatUpload() {
    document.getElementById('chat-file-input').click();
}

async function handleChatFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
        showNotification('Error', 'File size must be less than 10MB', 'error');
        return;
    }
    
    // Show file preview
    chatAttachedFile = file;
    const preview = document.getElementById('chat-file-preview');
    preview.querySelector('.file-name').textContent = file.name;
    preview.style.display = 'flex';
    
    // Focus back on input
    document.getElementById('chat-input').focus();
}

function removeChatFile() {
    chatAttachedFile = null;
    document.getElementById('chat-file-input').value = '';
    document.getElementById('chat-file-preview').style.display = 'none';
}

// Enhanced Chat System
function initializeChat() {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    
    if (!form || !input) {
        console.error('Chat form elements not found');
        return;
    }
    
    // Remove any existing event listeners
    form.removeEventListener('submit', handleChatSubmit);
    
    // Add submit event listener
    form.addEventListener('submit', handleChatSubmit);
    
    // Auto-resize input
    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
    
    // Handle Enter key
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            form.dispatchEvent(new Event('submit'));
        }
    });
    
    // Load initial suggestions
    loadChatSuggestions();
}

// Separate function to handle form submission
async function handleChatSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    console.log('Chat form submitted with message:', message);
    
    if (message || chatAttachedFile) {
        await sendChatMessage(message);
        input.value = '';
    }
}

async function sendChatMessage(message) {
    console.log('sendChatMessage called with:', message);
    
    // Show user message
    if (message) {
        addChatMessage('user', message);
    }
    
    // Handle file upload if present
    let finalMessage = message;
    if (chatAttachedFile) {
        const fileName = chatAttachedFile.name;
        addChatMessage('user', `📎 ${fileName}`);
        
        // Upload the file first
        const formData = new FormData();
        formData.append('document', chatAttachedFile);
        formData.append('documentType', 'chat_upload');
        formData.append('tags', 'chat-assistant');
        
        try {
            showLoading('Uploading document...', 'Please wait while we process your file');
            
            const uploadResponse = await fetch(`${API.BASE}${API.endpoints.upload}`, {
                method: 'POST',
                body: formData
            });
            
            const uploadResult = await uploadResponse.json();
            hideLoading();
            
            if (uploadResult.success) {
                // Clear the attached file
                removeChatFile();
                
                // If no message, auto-generate one
                if (!message) {
                    finalMessage = `I've uploaded ${fileName}. Can you analyze this document for compliance?`;
                } else {
                    finalMessage = `${message} (Document: ${fileName})`;
                }
                
                // Add document context to the message
                finalMessage = `[Document uploaded: ${uploadResult.documentId}] ${finalMessage}`;
            } else {
                showNotification('Error', 'Failed to upload document', 'error');
                return;
            }
        } catch (error) {
            hideLoading();
            showNotification('Error', 'Failed to upload document', 'error');
            console.error('Upload error:', error);
            return;
        }
    }
    
    if (!finalMessage) {
        console.log('No message to send');
        return;
    }
    
    console.log('Sending message to API:', finalMessage);
    
    // Show typing indicator
    const typingIndicator = addChatMessage('assistant', '...', true);
    
    try {
        const response = await fetch(`${API.BASE}${API.endpoints.chat}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: finalMessage })
        });
        
        console.log('Chat API response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Chat API result:', result);
        
        // Remove typing indicator
        typingIndicator.remove();
        
        if (result.success) {
            addChatMessage('assistant', result.response);
            AppState.chatHistory.push({ user: finalMessage, assistant: result.response });
        } else {
            addChatMessage('assistant', `I apologize, but I encountered an error: ${result.error || 'Unknown error'}`);
            console.error('Chat API error:', result.error);
        }
    } catch (error) {
        typingIndicator.remove();
        addChatMessage('assistant', 'I apologize, but I encountered a connection error. Please check your connection and try again.');
        console.error('Chat error:', error);
    }
    
    // Refresh suggestions
    loadChatSuggestions();
}

function addChatMessage(type, content, isTyping = false) {
    const container = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const avatar = type === 'user' ? 
        '<i class="fas fa-user"></i>' : 
        '<i class="fas fa-robot"></i>';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            ${isTyping ? '<div class="typing-indicator"><span></span><span></span><span></span></div>' : `<p>${content}</p>`}
        </div>
    `;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
    
    return messageDiv;
}

async function loadChatSuggestions() {
    try {
        const response = await fetch(`${API.BASE}${API.endpoints.suggestions}`);
        const data = await response.json();
        
        const container = document.getElementById('chat-suggestions');
        container.innerHTML = data.suggestions.slice(0, 3).map(suggestion => `
            <button class="suggestion-chip" onclick="sendSuggestion('${suggestion.replace(/'/g, "\\'")}')">
                ${suggestion}
            </button>
        `).join('');
    } catch (error) {
        console.error('Failed to load suggestions:', error);
    }
}

function sendSuggestion(suggestion) {
    const input = document.getElementById('chat-input');
    if (input) {
        input.value = suggestion;
        // Trigger the form submission
        const form = document.getElementById('chat-form');
        if (form) {
            form.dispatchEvent(new Event('submit'));
        } else {
            // Fallback: call sendChatMessage directly
            sendChatMessage(suggestion);
        }
    }
}

// Quick Actions
function requestGapAnalysis() {
    sendChatMessage('Can you analyze the gaps in my latest document?');
}

function requestRemediation() {
    sendChatMessage('Generate a remediation plan for my compliance gaps');
}

function requestCompliance() {
    sendChatMessage('What is my current compliance status?');
}

function clearChat() {
    const container = document.getElementById('chat-messages');
    container.innerHTML = `
        <div class="message assistant">
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <p>Chat history cleared. How can I help you with compliance today?</p>
            </div>
        </div>
    `;
    AppState.chatHistory = [];
}

// Enhanced Dashboard with Charts
async function loadDashboard() {
    try {
        const response = await fetch(`${API.BASE}${API.endpoints.dashboard}`);
        const data = await response.json();
        
        // Update metrics
        updateMetrics(data);
        
        // Update charts
        updateCharts(data);
        
        // Calculate and display compliance score
        calculateComplianceScore(data);
        
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        showNotification('Error', 'Failed to load dashboard data', 'error');
    }
}

function updateMetrics(data) {
    // Animate number changes
    animateNumber('doc-count', data.documentsUploaded);
    animateNumber('gap-count', data.totalGaps);
    animateNumber('high-risk-count', data.riskDistribution.high);
    animateNumber('new-gaps', Math.floor(data.totalGaps * 0.3)); // Simulated
}

function calculateComplianceScore(data) {
    let score = 100;
    if (data.totalGaps > 0) {
        score = Math.max(0, 100 - (
            data.riskDistribution.high * 10 +
            data.riskDistribution.medium * 5 +
            data.riskDistribution.low * 2
        ));
    }
    
    AppState.complianceScore = score;
    
    // Update displays
    const scoreDisplay = document.getElementById('compliance-score');
    const headerScore = document.getElementById('header-compliance-score');
    const progressBar = document.getElementById('compliance-progress');
    
    if (scoreDisplay) {
        scoreDisplay.textContent = score > 0 ? `${score}%` : '--';
        
        // Add trend indicator
        const trend = document.getElementById('score-trend');
        if (trend) {
            trend.innerHTML = score > 70 ? 
                '<i class="fas fa-arrow-up"></i> +2%' : 
                '<i class="fas fa-arrow-down"></i> -3%';
            trend.style.color = score > 70 ? 'var(--success)' : 'var(--danger)';
        }
    }
    
    if (headerScore) {
        headerScore.textContent = score > 0 ? `${score}%` : '--';
    }
    
    if (progressBar) {
        progressBar.style.width = `${score}%`;
        progressBar.style.backgroundColor = getScoreColor(score);
    }
}

function initializeCharts() {
    // Initialize Chart.js charts
    const riskCtx = document.getElementById('riskChart');
    const trendCtx = document.getElementById('trendChart');
    const coverageCtx = document.getElementById('coverageChart');
    
    if (riskCtx) {
        AppState.charts.risk = new Chart(riskCtx, {
            type: 'doughnut',
            data: {
                labels: ['High Risk', 'Medium Risk', 'Low Risk'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: { size: 12 }
                        }
                    }
                }
            }
        });
    }
    
    if (trendCtx) {
        AppState.charts.trend = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Compliance Score',
                    data: [85, 87, 86, 88, 90, 89, 92],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }
    
    if (coverageCtx) {
        // Use dynamic regulations for coverage chart
        const regulationLabels = AppState.regulations.length > 0 
            ? AppState.regulations.map(r => r.displayName)
            : ['GDPR', 'AI Act', 'Financial', 'Security', 'AML'];
        
        // Generate random coverage data for now (would come from real analysis)
        const coverageData = regulationLabels.map(() => Math.floor(Math.random() * 30) + 70);
        
        AppState.charts.coverage = new Chart(coverageCtx, {
            type: 'radar',
            data: {
                labels: regulationLabels,
                datasets: [{
                    label: 'Coverage',
                    data: coverageData,
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6, 182, 212, 0.2)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }
}

function updateCharts(data) {
    // Update risk distribution chart
    if (AppState.charts.risk) {
        AppState.charts.risk.data.datasets[0].data = [
            data.riskDistribution.high,
            data.riskDistribution.medium,
            data.riskDistribution.low
        ];
        AppState.charts.risk.update();
    }
}

// Activity Timeline
function addActivity(type, description) {
    const timeline = document.getElementById('activity-timeline');
    const icons = {
        upload: 'fa-upload',
        analysis: 'fa-microscope',
        delete: 'fa-trash',
        chat: 'fa-comment',
        report: 'fa-file-alt'
    };
    
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.innerHTML = `
        <div class="timeline-icon">
            <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
        </div>
        <div class="timeline-content">
            <p>${description}</p>
            <span class="timeline-time">${formatTimeAgo(new Date())}</span>
        </div>
    `;
    
    // Add to beginning
    timeline.insertBefore(item, timeline.firstChild);
    
    // Keep only last 10 items
    while (timeline.children.length > 10) {
        timeline.removeChild(timeline.lastChild);
    }
}

// Compliance Map Visualization
function renderComplianceMap() {
    const container = document.getElementById('compliance-map-container');
    
    // This would be replaced with a proper visualization library like D3.js
    container.innerHTML = `
        <div class="compliance-map">
            <div class="map-legend">
                <h4>Compliance Status by Regulation</h4>
                <div class="legend-items">
                    <span><i class="fas fa-circle" style="color: var(--success)"></i> Compliant</span>
                    <span><i class="fas fa-circle" style="color: var(--warning)"></i> Partial</span>
                    <span><i class="fas fa-circle" style="color: var(--danger)"></i> Non-compliant</span>
                </div>
            </div>
            <div class="map-grid">
                ${renderComplianceMapItems()}
            </div>
        </div>
    `;
}

function renderComplianceMapItems() {
    const regulations = AppState.regulations.map(r => r.displayName);
    const categories = ['Data Protection', 'Risk Management', 'Documentation', 'Technical Measures', 'Governance'];
    
    return categories.map(category => `
        <div class="map-row">
            <div class="map-category">${category}</div>
            ${regulations.map(reg => `
                <div class="map-cell" style="background-color: ${getRandomComplianceColor()}">
                    <span class="map-score">${Math.floor(Math.random() * 100)}%</span>
                </div>
            `).join('')}
        </div>
    `).join('');
}

// AI Insights
async function loadInsights() {
    const container = document.getElementById('insights-grid');
    
    // Simulated insights - would come from backend
    const insights = [
        {
            icon: 'fa-shield-alt',
            title: 'GDPR Compliance Trending Up',
            content: 'Your GDPR compliance has improved by 15% over the last month. Key improvements in data subject rights documentation.',
            action: 'View Details'
        },
        {
            icon: 'fa-exclamation-triangle',
            title: 'AI Act Risk Identified',
            content: 'New high-risk AI system detected in recent documentation. Immediate compliance assessment recommended.',
            action: 'Start Assessment'
        },
        {
            icon: 'fa-chart-line',
            title: 'Compliance Score Projection',
            content: 'Based on current trends, your compliance score is projected to reach 95% by end of quarter.',
            action: 'View Projection'
        }
    ];
    
    container.innerHTML = insights.map(insight => `
        <div class="insight-card">
            <div class="insight-header">
                <div class="insight-icon">
                    <i class="fas ${insight.icon}"></i>
                </div>
                <h4 class="insight-title">${insight.title}</h4>
            </div>
            <p class="insight-content">${insight.content}</p>
            <a href="#" class="insight-action">
                ${insight.action} <i class="fas fa-arrow-right"></i>
            </a>
        </div>
    `).join('');
}

// Regulations Library
async function loadRegulations() {
    try {
        const response = await fetch(`${API.BASE}/analyze/regulations`);
        const data = await response.json();
        
        if (data.success) {
            AppState.regulations = data.regulations;
            console.log('Loaded regulations:', AppState.regulations);
        } else {
            console.error('Failed to load regulations:', data.error);
            // Fallback to default regulations
            AppState.regulations = [
                { id: 'gdpr', displayName: 'GDPR', description: 'General Data Protection Regulation' },
                { id: 'ai_act', displayName: 'EU AI Act', description: 'Artificial Intelligence Regulation' },
                { id: 'financial_compliance', displayName: 'Financial Compliance', description: 'AML/KYC Requirements' },
                { id: 'data_security', displayName: 'Data Security', description: 'Security Standards' }
            ];
        }
    } catch (error) {
        console.error('Error loading regulations:', error);
        // Fallback to default regulations
        AppState.regulations = [
            { id: 'gdpr', displayName: 'GDPR', description: 'General Data Protection Regulation' },
            { id: 'ai_act', displayName: 'EU AI Act', description: 'Artificial Intelligence Regulation' },
            { id: 'financial_compliance', displayName: 'Financial Compliance', description: 'AML/KYC Requirements' },
            { id: 'data_security', displayName: 'Data Security', description: 'Security Standards' }
        ];
    }
}

function renderRegulations() {
    const container = document.getElementById('regulations-grid');
    
    container.innerHTML = AppState.regulations.map(reg => `
        <div class="regulation-card-large">
            <div class="regulation-header">
                <i class="fas fa-gavel"></i>
                <h3>${reg.displayName}</h3>
            </div>
            <p>${reg.description}</p>
            <div class="regulation-stats">
                <span><i class="fas fa-file-alt"></i> Multiple Requirements</span>
                <span><i class="fas fa-clock"></i> Active</span>
            </div>
            <button class="btn btn-primary" onclick="viewRegulation('${reg.id}')">
                View Details
            </button>
        </div>
    `).join('');
}

// Reports Section
async function loadReports() {
    const container = document.getElementById('reports-list');
    
    // Simulated reports
    const reports = [
        {
            id: 1,
            name: 'Q4 2024 Compliance Report',
            date: new Date(),
            status: 'completed'
        },
        {
            id: 2,
            name: 'GDPR Audit Report',
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            status: 'completed'
        }
    ];
    
    container.innerHTML = reports.map(report => `
        <div class="report-item">
            <div class="report-icon">
                <i class="fas fa-file-pdf"></i>
            </div>
            <div class="report-info">
                <h4>${report.name}</h4>
                <p>Generated ${formatDate(report.date)}</p>
            </div>
            <div class="report-actions">
                <button class="btn btn-secondary" onclick="viewReport(${report.id})">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-primary" onclick="downloadReport(${report.id})">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        </div>
    `).join('');
}

// Utility Functions
function showLoading(title = 'Processing...', message = 'Please wait') {
    const overlay = document.getElementById('loading-overlay');
    document.getElementById('loading-title').textContent = title;
    document.getElementById('loading-message').textContent = message;
    overlay.classList.add('active');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.remove('active');
    updateLoadingProgress(0);
}

function updateLoadingProgress(percent) {
    document.getElementById('loading-progress').style.width = `${percent}%`;
}

function showNotification(title, message, type = 'info') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas ${icons[type]}"></i>
        </div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        </div>
    `;
    
    container.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

async function showConfirmDialog(title, message) {
    return confirm(`${title}\n\n${message}`);
}

function updateHeaderStats() {
    document.getElementById('header-gaps').textContent = AppState.documents.length;
    // Update other header stats as needed
}

function updateDocumentBadge() {
    document.getElementById('docs-badge').textContent = AppState.documents.length;
}

// Modal Functions
function showUploadModal() {
    document.getElementById('upload-modal').classList.add('active');
}

function closeUploadModal() {
    document.getElementById('upload-modal').classList.remove('active');
    document.getElementById('upload-form').reset();
    document.getElementById('upload-zone').querySelector('h4').textContent = 'Drag & Drop your file here';
}

// Helper Functions
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function getDocumentIcon(type) {
    const icons = {
        'privacy_policy': 'fa-user-shield',
        'security_policy': 'fa-lock',
        'ai_policy': 'fa-robot',
        'data_processing': 'fa-database',
        'internal_policy': 'fa-file-alt',
        'procedure': 'fa-clipboard-list'
    };
    return icons[type] || 'fa-file';
}

function getRiskClass(score) {
    if (score >= 7) return 'high-risk';
    if (score >= 4) return 'medium-risk';
    return 'low-risk';
}

function getRiskLevel(score) {
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
}

function getScoreColor(score) {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
}

function getRandomComplianceColor() {
    const colors = ['#10b981', '#f59e0b', '#ef4444'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function animateNumber(elementId, target) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const current = parseInt(element.textContent) || 0;
    const increment = (target - current) / 20;
    let value = current;
    
    const timer = setInterval(() => {
        value += increment;
        if ((increment > 0 && value >= target) || (increment < 0 && value <= target)) {
            value = target;
            clearInterval(timer);
        }
        element.textContent = Math.round(value);
    }, 50);
}

// Initialize UI enhancements
function initializeUI() {
    // Add smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'k':
                    e.preventDefault();
                    document.getElementById('chat-input').focus();
                    break;
                case 'u':
                    e.preventDefault();
                    showUploadModal();
                    break;
            }
        }
    });
}

// Regulations Management Functions
function switchRegulationTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Load content for the active tab
    if (tabName === 'library') {
        renderRegulations();
    }
}

async function syncSource(sourceId) {
    showLoading('Syncing regulations...', `Fetching latest updates from ${sourceId}`);
    
    try {
        const response = await fetch(`${API.BASE}/regulations/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourceId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Success', `Successfully synced ${result.count} regulations`, 'success');
            addRegulationUpdate('success', `${sourceId} Synced`, `Updated ${result.count} regulations`);
            
            // Refresh regulations list
            await loadRegulations();
        } else {
            showNotification('Error', result.error || 'Sync failed', 'error');
        }
    } catch (error) {
        showNotification('Error', 'Failed to sync regulations', 'error');
        console.error('Sync error:', error);
    } finally {
        hideLoading();
    }
}

async function activateSource(sourceId) {
    try {
        const response = await fetch(`${API.BASE}/regulations/sources/${sourceId}/activate`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Success', 'Source activated successfully', 'success');
            updateSourceStatus(sourceId, 'active');
            
            // Trigger initial sync
            await syncSource(sourceId);
        } else {
            showNotification('Error', result.error || 'Activation failed', 'error');
        }
    } catch (error) {
        showNotification('Error', 'Failed to activate source', 'error');
        console.error('Activation error:', error);
    }
}

function updateSourceStatus(sourceId, status) {
    const sourceCard = document.querySelector(`[data-source-id="${sourceId}"]`);
    if (!sourceCard) return;
    
    const statusElement = sourceCard.querySelector('.source-status');
    if (status === 'active') {
        statusElement.className = 'source-status active';
        statusElement.innerHTML = '<i class="fas fa-check-circle"></i> Active';
        
        // Update action buttons
        const actions = sourceCard.querySelector('.source-actions');
        actions.innerHTML = `
            <button class="btn btn-small btn-secondary" onclick="configureSource('${sourceId}')">
                <i class="fas fa-cog"></i> Configure
            </button>
            <button class="btn btn-small btn-primary" onclick="syncSource('${sourceId}')">
                <i class="fas fa-sync"></i> Sync Now
            </button>
        `;
    }
}

function configureSource(sourceId) {
    // Would open a configuration modal
    showNotification('Info', 'Source configuration coming soon', 'info');
}

function showAddSourceModal() {
    // Would open a modal to add custom source
    showNotification('Info', 'Custom source addition coming soon', 'info');
}

function refreshRegulations() {
    loadRegulations();
    showNotification('Success', 'Regulations refreshed', 'success');
}

function addRegulationUpdate(type, title, description) {
    const timeline = document.querySelector('.updates-timeline');
    if (!timeline) return;
    
    const updateItem = document.createElement('div');
    updateItem.className = 'update-item';
    updateItem.innerHTML = `
        <div class="update-icon ${type}">
            <i class="fas fa-${type === 'success' ? 'check' : type === 'warning' ? 'exclamation' : 'info'}"></i>
        </div>
        <div class="update-content">
            <h4>${title}</h4>
            <p>${description}</p>
            <span class="update-time">Just now</span>
        </div>
    `;
    
    timeline.insertBefore(updateItem, timeline.firstChild);
}

// Regulations Sources Management
async function initRegulationsSources() {
    const sourcesContainer = document.getElementById('regulation-sources');
    if (!sourcesContainer) return;

    sourcesContainer.innerHTML = `
        <div class="sources-header">
            <h2>Regulation Sources Management</h2>
            <div class="sources-actions">
                <button class="btn btn-secondary" onclick="runSanityCheck()">
                    <i class="fas fa-check-circle"></i> Run Sanity Check
                </button>
                <button class="btn btn-primary" onclick="addCustomSource()">
                    <i class="fas fa-plus"></i> Add Custom Source
                </button>
            </div>
        </div>
        
        <div id="sanity-check-results" style="display: none;" class="sanity-check-results">
            <div class="sanity-header">
                <h3><i class="fas fa-clipboard-check"></i> Sanity Check Results</h3>
                <button class="btn btn-sm" onclick="closeSanityCheck()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div id="sanity-content"></div>
        </div>
        
        <div class="sources-tabs">
            <button class="tab-btn active" onclick="switchSourceTab('data-sources')">
                <i class="fas fa-database"></i> Data Sources
            </button>
            <button class="tab-btn" onclick="switchSourceTab('library')">
                <i class="fas fa-book"></i> Library
            </button>
            <button class="tab-btn" onclick="switchSourceTab('updates')">
                <i class="fas fa-sync"></i> Updates
            </button>
        </div>
        
        <div id="sources-content">
            <div id="data-sources" class="tab-content active">
                <div class="sources-grid" id="sources-list">
                    <div class="loading">
                        <i class="fas fa-spinner fa-spin"></i> Loading sources...
                    </div>
                </div>
            </div>
            
            <div id="library" class="tab-content">
                <div class="library-grid" id="library-content">
                    <div class="loading">
                        <i class="fas fa-spinner fa-spin"></i> Loading library...
                    </div>
                </div>
            </div>
            
            <div id="updates" class="tab-content">
                <div class="updates-list" id="updates-content">
                    <div class="loading">
                        <i class="fas fa-spinner fa-spin"></i> Loading updates...
                    </div>
                </div>
            </div>
        </div>
    `;

    await loadRegulationSources();
}

// Run sanity check
window.runSanityCheck = async function() {
    const resultsDiv = document.getElementById('sanity-check-results');
    const contentDiv = document.getElementById('sanity-content');
    
    resultsDiv.style.display = 'block';
    contentDiv.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i> Running comprehensive sanity check...
        </div>
    `;
    
    try {
        const response = await fetch('/api/sanity-check/run');
        const data = await response.json();
        
        if (data.success) {
            displaySanityCheckResults(data.report);
        } else {
            contentDiv.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i> Error: ${data.message}
                </div>
            `;
        }
    } catch (error) {
        contentDiv.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> Failed to run sanity check: ${error.message}
            </div>
        `;
    }
};

// Display sanity check results
function displaySanityCheckResults(report) {
    const contentDiv = document.getElementById('sanity-content');
    
    const summary = report.officialSources.summary;
    const recommendations = report.recommendations || [];
    
    let html = `
        <div class="sanity-summary">
            <h4>Summary</h4>
            <div class="summary-stats">
                <div class="stat">
                    <span class="stat-value">${summary.total}</span>
                    <span class="stat-label">Total Sources</span>
                </div>
                <div class="stat success">
                    <span class="stat-value">${summary.accessible}</span>
                    <span class="stat-label">Accessible</span>
                </div>
                <div class="stat warning">
                    <span class="stat-value">${summary.warnings}</span>
                    <span class="stat-label">Warnings</span>
                </div>
                <div class="stat danger">
                    <span class="stat-value">${summary.errors}</span>
                    <span class="stat-label">Errors</span>
                </div>
            </div>
        </div>
        
        <div class="sanity-details">
            <h4>Official Sources Check</h4>
            <div class="sources-check">
    `;
    
    // Display source check results
    for (const [sourceId, sourceData] of Object.entries(report.officialSources.sources)) {
        html += `
            <div class="source-check-group">
                <h5>${sourceData.name}</h5>
                <div class="regulations-check">
        `;
        
        for (const [regId, regCheck] of Object.entries(sourceData.regulations)) {
            const statusClass = regCheck.status === 'accessible' ? 'success' : 
                              regCheck.status === 'warning' ? 'warning' : 'danger';
            const icon = regCheck.status === 'accessible' ? 'check-circle' : 
                       regCheck.status === 'warning' ? 'exclamation-triangle' : 'times-circle';
            
            html += `
                <div class="regulation-check ${statusClass}">
                    <i class="fas fa-${icon}"></i>
                    <span class="reg-name">${regCheck.name}</span>
                    <span class="reg-status">${regCheck.message}</span>
                    <a href="${regCheck.url}" target="_blank" class="reg-link">
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                </div>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
    }
    
    html += `
            </div>
        </div>
        
        <div class="sanity-local">
            <h4>Local Regulations Check</h4>
            <p>Found ${report.localRegulations.totalFiles} regulation files</p>
            ${report.localRegulations.issues.length > 0 ? `
                <div class="issues-list">
                    <h5>Issues Found:</h5>
                    <ul>
                        ${report.localRegulations.issues.map(issue => 
                            `<li><i class="fas fa-exclamation-triangle"></i> ${issue}</li>`
                        ).join('')}
                    </ul>
                </div>
            ` : '<p class="success"><i class="fas fa-check-circle"></i> No issues found</p>'}
        </div>
    `;
    
    // Display recommendations
    if (recommendations.length > 0) {
        html += `
            <div class="sanity-recommendations">
                <h4>Recommendations</h4>
                <div class="recommendations-list">
        `;
        
        for (const rec of recommendations) {
            const priorityClass = rec.priority === 'high' ? 'danger' : 
                                rec.priority === 'medium' ? 'warning' : 'info';
            
            html += `
                <div class="recommendation ${priorityClass}">
                    <div class="rec-header">
                        <span class="rec-priority">${rec.priority.toUpperCase()}</span>
                        <span class="rec-issue">${rec.issue}</span>
                    </div>
                    <div class="rec-action">${rec.action}</div>
                    ${rec.details ? `
                        <div class="rec-details">
                            <ul>
                                ${rec.details.map(detail => `<li>${detail}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    ${rec.files ? `
                        <div class="rec-files">
                            Files: ${rec.files.join(', ')}
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
    }
    
    html += `
        <div class="sanity-timestamp">
            <i class="fas fa-clock"></i> Check performed at: ${new Date(report.timestamp).toLocaleString()}
        </div>
    `;
    
    contentDiv.innerHTML = html;
}

// Close sanity check results
window.closeSanityCheck = function() {
    document.getElementById('sanity-check-results').style.display = 'none';
};

// Export functions for external use
window.sherara = {
    showUploadModal,
    closeUploadModal,
    analyzeDocument,
    deleteDocument,
    generateReport,
    refreshDashboard: loadDashboard,
    showAnalysisHistory: () => console.log('Analysis history'),
    generateNewReport: () => console.log('Generate new report'),
    viewRegulation: (id) => console.log('View regulation:', id),
    viewReport: (id) => console.log('View report:', id),
    downloadReport: (id) => console.log('Download report:', id),
    downloadDocument: (id) => console.log('Download document:', id),
    showDocumentDetails: (id) => console.log('Show document details:', id),
    sendSuggestion,
    requestGapAnalysis,
    requestRemediation,
    requestCompliance,
    clearChat,
    switchRegulationTab,
    syncSource,
    activateSource,
    configureSource,
    showAddSourceModal,
    refreshRegulations
};

// Load regulation sources
async function loadRegulationSources() {
    try {
        const response = await fetch('/api/regulations/sources');
        const data = await response.json();
        
        if (data.success) {
            displayRegulationSources(data.sources);
        }
    } catch (error) {
        console.error('Error loading regulation sources:', error);
        document.getElementById('sources-list').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> Failed to load regulation sources
            </div>
        `;
    }
}

// Taxonomy Management System
let taxonomyData = null;
let currentTaxonomyTab = 'overview';

// Initialize taxonomy functionality
function setupTaxonomy() {
    // Load taxonomy data
    loadTaxonomyData();
    
    // Set up event listeners for taxonomy section
    document.addEventListener('click', (e) => {
        if (e.target.matches('[data-section="taxonomy"]')) {
            loadTaxonomySection();
        }
    });
}

// Load taxonomy data from server
async function loadTaxonomyData() {
    try {
        const response = await fetch('/api/taxonomy/tags');
        const result = await response.json();
        
        if (result.success) {
            taxonomyData = result.data;
        } else {
            console.error('Failed to load taxonomy data:', result.error);
        }
    } catch (error) {
        console.error('Error loading taxonomy data:', error);
    }
}

// Load taxonomy section
async function loadTaxonomySection() {
    await loadTaxonomyStats();
    await loadTaxonomyOverview();
}

// Switch taxonomy tabs
function switchTaxonomyTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.taxonomy-tabs .tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.onclick.toString().includes(tabName));
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
    
    currentTaxonomyTab = tabName;
    
    // Load tab-specific content
    switch (tabName) {
        case 'overview':
            loadTaxonomyOverview();
            break;
        case 'documents':
            loadDocumentTagging();
            break;
        case 'search':
            loadTaxonomySearch();
            break;
        case 'manage':
            loadTagManagement();
            break;
    }
}

// Load taxonomy overview with statistics and charts
async function loadTaxonomyOverview() {
    try {
        const response = await fetch('/api/taxonomy/stats');
        const result = await response.json();
        
        if (result.success) {
            const stats = result.data;
            updateTaxonomyStats(stats);
            updateTaxonomyCharts(stats);
        }
    } catch (error) {
        console.error('Error loading taxonomy overview:', error);
    }
}

// Update taxonomy statistics display
function updateTaxonomyStats(stats) {
    document.getElementById('total-docs').textContent = stats.totalDocuments;
    document.getElementById('tagged-docs').textContent = stats.taggedDocuments;
    document.getElementById('untagged-docs').textContent = stats.untaggedDocuments;
    document.getElementById('tagged-percentage').textContent = `${stats.taggedPercentage}%`;
}

// Update taxonomy charts
function updateTaxonomyCharts(stats) {
    // Category Distribution Chart
    const categoryCtx = document.getElementById('categoryChart');
    if (categoryCtx) {
        new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: stats.topCategories.map(c => c.category),
                datasets: [{
                    data: stats.topCategories.map(c => c.count),
                    backgroundColor: [
                        '#dc2626', '#2563eb', '#059669', '#7c3aed', '#ea580c'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    // Risk Level Distribution Chart
    const riskCtx = document.getElementById('riskLevelChart');
    if (riskCtx) {
        new Chart(riskCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(stats.riskDistribution),
                datasets: [{
                    label: 'Documents',
                    data: Object.values(stats.riskDistribution),
                    backgroundColor: [
                        '#991b1b', '#dc2626', '#ea580c', '#059669'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    // Regulatory Coverage Chart
    const regulatoryCtx = document.getElementById('regulatoryChart');
    if (regulatoryCtx) {
        new Chart(regulatoryCtx, {
            type: 'horizontalBar',
            data: {
                labels: stats.regulatoryCoverage.map(r => r.regulation),
                datasets: [{
                    label: 'Documents',
                    data: stats.regulatoryCoverage.map(r => r.count),
                    backgroundColor: '#2563eb'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
}

// Load document tagging interface
async function loadDocumentTagging() {
    try {
        const response = await fetch('/api/upload/list');
        const result = await response.json();
        
        if (result.documents) {
            renderDocumentTaggingGrid(result.documents);
        }
    } catch (error) {
        console.error('Error loading documents for tagging:', error);
    }
}

// Render document tagging grid
function renderDocumentTaggingGrid(documents) {
    const grid = document.getElementById('documents-tagging-grid');
    
    if (!documents || documents.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tags"></i>
                <h3>No documents to tag</h3>
                <p>Upload documents to start tagging them</p>
                <button class="btn btn-primary" onclick="showUploadModal()">
                    <i class="fas fa-upload"></i> Upload Document
                </button>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = documents.map(doc => `
        <div class="document-tagging-card" data-doc-id="${doc.id}">
            <div class="document-tagging-header">
                <div>
                    <h4 class="document-tagging-title">${doc.name}</h4>
                    <div class="document-tagging-meta">
                        <span><i class="fas fa-calendar"></i> ${formatDate(doc.uploadedAt)}</span>
                        <span><i class="fas fa-font"></i> ${doc.wordCount} words</span>
                    </div>
                </div>
            </div>
            
            <div class="auto-classification" id="auto-classification-${doc.id}">
                <h5>Auto-Classification</h5>
                <div class="loading-placeholder">Loading classification...</div>
            </div>
            
            <div class="tag-editor" id="tag-editor-${doc.id}">
                <div class="tag-section">
                    <h6>Categories</h6>
                    <div class="tag-checkboxes" id="categories-${doc.id}">
                        <!-- Categories will be loaded here -->
                    </div>
                </div>
                
                <div class="tag-section">
                    <h6>Regulatory Tags</h6>
                    <div class="tag-checkboxes" id="regulatory-${doc.id}">
                        <!-- Regulatory tags will be loaded here -->
                    </div>
                </div>
                
                <div class="tag-section">
                    <h6>Risk Level</h6>
                    <div class="tag-checkboxes" id="risk-${doc.id}">
                        <!-- Risk levels will be loaded here -->
                    </div>
                </div>
                
                <button class="apply-tags-btn" onclick="applyDocumentTags('${doc.id}')">
                    <i class="fas fa-save"></i> Apply Tags
                </button>
            </div>
        </div>
    `).join('');
    
    // Load auto-classification and tag options for each document
    documents.forEach(doc => {
        loadDocumentClassification(doc.id);
        loadTagOptions(doc.id);
    });
}

// Load auto-classification for a document
async function loadDocumentClassification(documentId) {
    try {
        const response = await fetch(`/api/taxonomy/documents/${documentId}/tags`);
        const result = await response.json();
        
        if (result.success) {
            const { autoClassification } = result.data;
            renderAutoClassification(documentId, autoClassification);
        }
    } catch (error) {
        console.error('Error loading document classification:', error);
    }
}

// Render auto-classification display
function renderAutoClassification(documentId, classification) {
    const container = document.getElementById(`auto-classification-${documentId}`);
    
    if (!classification || Object.keys(classification).length === 0) {
        container.innerHTML = `
            <h5>Auto-Classification</h5>
            <p>No auto-classification available</p>
            <button class="btn btn-small btn-primary" onclick="classifyDocument('${documentId}')">
                <i class="fas fa-magic"></i> Classify Now
            </button>
        `;
        return;
    }
    
    container.innerHTML = `
        <h5>Auto-Classification <span class="confidence-score">${Math.round(classification.confidence * 100)}% confidence</span></h5>
        <div class="suggested-tags">
            ${classification.categories ? classification.categories.map(cat => `<span class="tag-chip">${cat}</span>`).join('') : ''}
            ${classification.regulatoryTags ? classification.regulatoryTags.map(reg => `<span class="tag-chip regulatory">${reg}</span>`).join('') : ''}
            ${classification.functionalTags ? classification.functionalTags.map(func => `<span class="tag-chip functional">${func}</span>`).join('') : ''}
            ${classification.riskLevel ? `<span class="tag-chip risk-${classification.riskLevel}">${classification.riskLevel}</span>` : ''}
        </div>
        <button class="btn btn-small btn-secondary" onclick="acceptAutoClassification('${documentId}')">
            <i class="fas fa-check"></i> Accept All
        </button>
    `;
}

// Load tag options for document editor
async function loadTagOptions(documentId) {
    if (!taxonomyData) {
        await loadTaxonomyData();
    }
    
    // Load categories
    const categoriesContainer = document.getElementById(`categories-${documentId}`);
    if (categoriesContainer && taxonomyData.categories) {
        categoriesContainer.innerHTML = Object.entries(taxonomyData.categories).map(([id, cat]) => `
            <label class="tag-checkbox">
                <input type="checkbox" name="categories" value="${id}">
                <span>${cat.name}</span>
            </label>
        `).join('');
    }
    
    // Load regulatory tags
    const regulatoryContainer = document.getElementById(`regulatory-${documentId}`);
    if (regulatoryContainer && taxonomyData.regulatoryTags) {
        regulatoryContainer.innerHTML = Object.entries(taxonomyData.regulatoryTags).map(([id, reg]) => `
            <label class="tag-checkbox">
                <input type="checkbox" name="regulatory" value="${id}">
                <span>${reg.name}</span>
            </label>
        `).join('');
    }
    
    // Load risk levels
    const riskContainer = document.getElementById(`risk-${documentId}`);
    if (riskContainer && taxonomyData.riskLevels) {
        riskContainer.innerHTML = Object.entries(taxonomyData.riskLevels).map(([id, risk]) => `
            <label class="tag-checkbox">
                <input type="radio" name="risk-${documentId}" value="${id}">
                <span>${risk.name}</span>
            </label>
        `).join('');
    }
}

// Classify document using AI
async function classifyDocument(documentId) {
    try {
        showLoading('Classifying document...', 'AI is analyzing document content');
        
        const response = await fetch('/api/taxonomy/classify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            renderAutoClassification(documentId, result.data);
            showNotification('Success', 'Document classified successfully', 'success');
        } else {
            showNotification('Error', result.error || 'Classification failed', 'error');
        }
    } catch (error) {
        console.error('Error classifying document:', error);
        showNotification('Error', 'Failed to classify document', 'error');
    } finally {
        hideLoading();
    }
}

// Accept auto-classification
async function acceptAutoClassification(documentId) {
    try {
        const response = await fetch(`/api/taxonomy/documents/${documentId}/tags`);
        const result = await response.json();
        
        if (result.success && result.data.autoClassification) {
            await applyTags(documentId, result.data.autoClassification);
            showNotification('Success', 'Auto-classification applied successfully', 'success');
        }
    } catch (error) {
        console.error('Error accepting auto-classification:', error);
        showNotification('Error', 'Failed to apply auto-classification', 'error');
    }
}

// Apply tags to document
async function applyDocumentTags(documentId) {
    const card = document.querySelector(`[data-doc-id="${documentId}"]`);
    
    // Collect selected tags
    const tags = {
        categories: Array.from(card.querySelectorAll('input[name="categories"]:checked')).map(cb => cb.value),
        regulatoryTags: Array.from(card.querySelectorAll('input[name="regulatory"]:checked')).map(cb => cb.value),
        riskLevel: card.querySelector(`input[name="risk-${documentId}"]:checked`)?.value
    };
    
    await applyTags(documentId, tags);
}

// Apply tags via API
async function applyTags(documentId, tags) {
    try {
        const response = await fetch(`/api/taxonomy/documents/${documentId}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Success', 'Tags applied successfully', 'success');
            // Refresh the document display
            loadDocumentTagging();
        } else {
            showNotification('Error', result.error || 'Failed to apply tags', 'error');
        }
    } catch (error) {
        console.error('Error applying tags:', error);
        showNotification('Error', 'Failed to apply tags', 'error');
    }
}

// Load taxonomy search interface
async function loadTaxonomySearch() {
    if (!taxonomyData) {
        await loadTaxonomyData();
    }
    
    // Render filter options
    renderSearchFilters();
    
    // Set up search event listeners
    setupSearchEventListeners();
}

// Render search filters
function renderSearchFilters() {
    if (!taxonomyData) return;
    
    // Categories filter
    const categoryFilters = document.getElementById('category-filters');
    if (categoryFilters) {
        categoryFilters.innerHTML = Object.entries(taxonomyData.categories).map(([id, cat]) => `
            <div class="filter-option">
                <input type="checkbox" id="cat-${id}" value="${id}">
                <label for="cat-${id}">${cat.name}</label>
                <span class="filter-count">0</span>
            </div>
        `).join('');
    }
    
    // Regulatory filters
    const regulatoryFilters = document.getElementById('regulatory-filters');
    if (regulatoryFilters) {
        regulatoryFilters.innerHTML = Object.entries(taxonomyData.regulatoryTags).map(([id, reg]) => `
            <div class="filter-option">
                <input type="checkbox" id="reg-${id}" value="${id}">
                <label for="reg-${id}">${reg.name}</label>
                <span class="filter-count">0</span>
            </div>
        `).join('');
    }
    
    // Risk level filters
    const riskFilters = document.getElementById('risk-filters');
    if (riskFilters) {
        riskFilters.innerHTML = Object.entries(taxonomyData.riskLevels).map(([id, risk]) => `
            <div class="filter-option">
                <input type="checkbox" id="risk-${id}" value="${id}">
                <label for="risk-${id}">${risk.name}</label>
                <span class="filter-count">0</span>
            </div>
        `).join('');
    }
}

// Set up search event listeners
function setupSearchEventListeners() {
    const searchFilters = document.querySelectorAll('.search-filters input[type="checkbox"]');
    searchFilters.forEach(filter => {
        filter.addEventListener('change', performTaxonomySearch);
    });
}

// Perform taxonomy search
async function performTaxonomySearch() {
    const searchCriteria = {
        categories: Array.from(document.querySelectorAll('#category-filters input:checked')).map(cb => cb.value),
        regulatoryTags: Array.from(document.querySelectorAll('#regulatory-filters input:checked')).map(cb => cb.value),
        riskLevel: document.querySelector('#risk-filters input:checked')?.value
    };
    
    try {
        const response = await fetch('/api/taxonomy/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ searchCriteria })
        });
        
        const result = await response.json();
        
        if (result.success) {
            renderSearchResults(result.data);
        }
    } catch (error) {
        console.error('Error performing taxonomy search:', error);
    }
}

// Render search results
function renderSearchResults(documents) {
    const resultsContainer = document.getElementById('search-results');
    
    resultsContainer.innerHTML = `
        <div class="search-results-header">
            <h4>Search Results</h4>
            <span class="search-results-count">${documents.length} documents found</span>
        </div>
        <div class="search-results-list">
            ${documents.map(doc => `
                <div class="search-result-item">
                    <div class="search-result-icon">
                        <i class="fas ${getDocumentIcon(doc.type)}"></i>
                    </div>
                    <div class="search-result-content">
                        <h5 class="search-result-title">${doc.name}</h5>
                        <div class="search-result-meta">
                            ${formatDate(doc.uploadedAt)} • ${doc.wordCount} words
                        </div>
                        <div class="search-result-tags">
                            ${doc.tags ? renderDocumentTags(doc.tags) : ''}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Render document tags
function renderDocumentTags(tags) {
    let tagHtml = '';
    
    if (tags.categories) {
        tagHtml += tags.categories.map(cat => `<span class="tag-chip">${cat}</span>`).join('');
    }
    if (tags.regulatoryTags) {
        tagHtml += tags.regulatoryTags.map(reg => `<span class="tag-chip regulatory">${reg}</span>`).join('');
    }
    if (tags.riskLevel) {
        tagHtml += `<span class="tag-chip risk-${tags.riskLevel}">${tags.riskLevel}</span>`;
    }
    
    return tagHtml;
}

// Load tag management interface
async function loadTagManagement() {
    if (!taxonomyData) {
        await loadTaxonomyData();
    }
    
    renderTagManagement();
}

// Render tag management interface
function renderTagManagement() {
    // Primary Categories
    const primaryCategories = document.getElementById('primary-categories');
    if (primaryCategories && taxonomyData.categories) {
        primaryCategories.innerHTML = Object.entries(taxonomyData.categories).map(([id, cat]) => `
            <div class="tag-item">
                <div class="tag-item-info">
                    <h5 class="tag-item-name">${cat.name}</h5>
                    <p class="tag-item-description">${cat.description}</p>
                </div>
                <div class="tag-item-actions">
                    <span class="tag-item-count">0</span>
                </div>
            </div>
        `).join('');
    }
    
    // Regulatory Tags
    const regulatoryTags = document.getElementById('regulatory-tags');
    if (regulatoryTags && taxonomyData.regulatoryTags) {
        regulatoryTags.innerHTML = Object.entries(taxonomyData.regulatoryTags).map(([id, reg]) => `
            <div class="tag-item">
                <div class="tag-item-info">
                    <h5 class="tag-item-name">${reg.name}</h5>
                    <p class="tag-item-description">${reg.fullName}</p>
                </div>
                <div class="tag-item-actions">
                    <span class="tag-item-count">0</span>
                </div>
            </div>
        `).join('');
    }
    
    // Functional Tags
    const functionalTags = document.getElementById('functional-tags');
    if (functionalTags && taxonomyData.functionalTags) {
        functionalTags.innerHTML = Object.entries(taxonomyData.functionalTags).map(([id, func]) => `
            <div class="tag-item">
                <div class="tag-item-info">
                    <h5 class="tag-item-name">${func.name}</h5>
                    <p class="tag-item-description">${func.description}</p>
                </div>
                <div class="tag-item-actions">
                    <span class="tag-item-count">0</span>
                </div>
            </div>
        `).join('');
    }
    
    // Risk Levels
    const riskLevels = document.getElementById('risk-levels');
    if (riskLevels && taxonomyData.riskLevels) {
        riskLevels.innerHTML = Object.entries(taxonomyData.riskLevels).map(([id, risk]) => `
            <div class="tag-item">
                <div class="tag-item-info">
                    <h5 class="tag-item-name">${risk.name}</h5>
                    <p class="tag-item-description">${risk.description}</p>
                </div>
                <div class="tag-item-actions">
                    <span class="tag-item-count">0</span>
                </div>
            </div>
        `).join('');
    }
}

// Auto-tag all documents
async function autoTagAllDocuments() {
    const confirmed = await showConfirmDialog(
        'Auto-Tag All Documents',
        'This will automatically classify and tag all documents. Existing tags will be preserved. Continue?'
    );
    
    if (!confirmed) return;
    
    showLoading('Auto-tagging documents...', 'AI is analyzing all documents');
    
    try {
        const response = await fetch('/api/taxonomy/auto-tag-all', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Success', result.data.message, 'success');
            // Refresh current view
            if (currentTaxonomyTab === 'overview') {
                loadTaxonomyOverview();
            } else if (currentTaxonomyTab === 'documents') {
                loadDocumentTagging();
            }
        } else {
            showNotification('Error', result.error || 'Auto-tagging failed', 'error');
        }
    } catch (error) {
        console.error('Error auto-tagging documents:', error);
        showNotification('Error', 'Failed to auto-tag documents', 'error');
    } finally {
        hideLoading();
    }
}

// Generate taxonomy report
async function generateTaxonomyReport() {
    showLoading('Generating taxonomy report...', 'Analyzing document classification data');
    
    try {
        const response = await fetch('/api/taxonomy/report');
        const result = await response.json();
        
        if (result.success) {
            downloadTaxonomyReport(result.data);
            showNotification('Success', 'Taxonomy report generated successfully', 'success');
        } else {
            showNotification('Error', result.error || 'Report generation failed', 'error');
        }
    } catch (error) {
        console.error('Error generating taxonomy report:', error);
        showNotification('Error', 'Failed to generate taxonomy report', 'error');
    } finally {
        hideLoading();
    }
}

// Download taxonomy report
function downloadTaxonomyReport(reportData) {
    const report = {
        generatedAt: new Date().toISOString(),
        summary: reportData,
        details: {
            totalDocuments: reportData.totalDocuments,
            taggedDocuments: reportData.taggedDocuments,
            untaggedDocuments: reportData.untaggedDocuments,
            categoryDistribution: reportData.categoryDistribution,
            riskDistribution: reportData.riskDistribution,
            regulatoryCoverage: reportData.regulatoryCoverage
        }
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taxonomy-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Load taxonomy statistics
async function loadTaxonomyStats() {
    try {
        const response = await fetch('/api/taxonomy/stats');
        const result = await response.json();
        
        if (result.success) {
            updateTaxonomyStats(result.data);
        }
    } catch (error) {
        console.error('Error loading taxonomy stats:', error);
    }
}

// Initialize taxonomy system when app loads
document.addEventListener('DOMContentLoaded', function() {
    setupTaxonomy();
});
