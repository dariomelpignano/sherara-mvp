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

function loadSectionData(section) {
    switch (section) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'documents':
            loadDocuments();
            break;
        case 'analysis':
            initializeAnalysisWizard();
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
function initializeAnalysisWizard() {
    const wizardContent = document.getElementById('analysis-wizard-content');
    renderAnalysisStep1();
}

function renderAnalysisStep1() {
    const wizardContent = document.getElementById('analysis-wizard-content');
    
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

function proceedToStep2() {
    const selectedDoc = document.querySelector('.selectable-document.selected');
    if (!selectedDoc) return;
    
    const docId = selectedDoc.dataset.docId;
    updateWizardStep(2);
    renderAnalysisStep2(docId);
}

function renderAnalysisStep2(docId) {
    const wizardContent = document.getElementById('analysis-wizard-content');
    
    // Generate regulation cards from loaded regulations
    const regulationCards = AppState.regulations.map((reg, index) => {
        // Map regulation IDs to appropriate icons
        const iconMap = {
            'gdpr': 'fa-shield-alt',
            'ai_act': 'fa-robot',
            'financial_compliance': 'fa-coins',
            'aml': 'fa-money-check-alt',
            'data_security': 'fa-lock'
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
                    <p>${reg.description}</p>
                </div>
            </label>
        `;
    }).join('');
    
    wizardContent.innerHTML = `
        <div class="wizard-step-content">
            <h3>Select Regulations to Check</h3>
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

// Enhanced Chat System
function initializeChat() {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = input.value.trim();
        
        if (message) {
            await sendChatMessage(message);
            input.value = '';
        }
    });
    
    // Auto-resize input
    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
    
    // Load initial suggestions
    loadChatSuggestions();
}

async function sendChatMessage(message) {
    addChatMessage('user', message);
    
    // Show typing indicator
    const typingIndicator = addChatMessage('assistant', '...', true);
    
    try {
        const response = await fetch(`${API.BASE}${API.endpoints.chat}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        
        const result = await response.json();
        
        // Remove typing indicator
        typingIndicator.remove();
        
        if (result.success) {
            addChatMessage('assistant', result.response);
            AppState.chatHistory.push({ user: message, assistant: result.response });
        } else {
            addChatMessage('assistant', 'I apologize, but I encountered an error. Please try again.');
        }
    } catch (error) {
        typingIndicator.remove();
        addChatMessage('assistant', 'I apologize, but I encountered an error. Please try again.');
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
    document.getElementById('chat-input').value = suggestion;
    sendChatMessage(suggestion);
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
    clearChat
};
