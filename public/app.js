// Global state
const state = {
    currentSection: 'dashboard',
    documents: [],
    analysisResults: {},
    chatHistory: []
};

// API endpoints
const API_BASE = '/api';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeFileUpload();
    initializeAnalysis();
    initializeChat();
    loadDashboard();
    loadDocuments();
    loadChatSuggestions();
});

// Navigation
function initializeNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.getAttribute('data-section');
            switchSection(section);
        });
    });
}

function switchSection(section) {
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-section') === section);
    });

    // Update content sections
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.toggle('active', sec.id === section);
    });

    state.currentSection = section;

    // Refresh section data
    if (section === 'dashboard') loadDashboard();
    if (section === 'documents') loadDocuments();
}

// File Upload
function initializeFileUpload() {
    const form = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const fileLabel = document.querySelector('.file-label span');

    fileInput.addEventListener('change', (e) => {
        const fileName = e.target.files[0]?.name || 'Choose file or drag here';
        fileLabel.textContent = fileName;
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await uploadDocument(new FormData(form));
    });
}

async function uploadDocument(formData) {
    showLoading();
    try {
        const response = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (result.success) {
            showNotification('Document uploaded successfully', 'success');
            document.getElementById('upload-form').reset();
            document.querySelector('.file-label span').textContent = 'Choose file or drag here';
            loadDocuments();
            loadDashboard();
        } else {
            showNotification(result.error || 'Upload failed', 'error');
        }
    } catch (error) {
        showNotification('Failed to upload document', 'error');
        console.error('Upload error:', error);
    } finally {
        hideLoading();
    }
}

// Document Management
async function loadDocuments() {
    try {
        const response = await fetch(`${API_BASE}/upload/list`);
        const data = await response.json();
        
        state.documents = data.documents;
        renderDocuments();
        updateAnalysisDocumentSelect();
    } catch (error) {
        console.error('Failed to load documents:', error);
    }
}

function renderDocuments() {
    const container = document.getElementById('documents-container');
    
    if (state.documents.length === 0) {
        container.innerHTML = '<p class="empty-state">No documents uploaded yet</p>';
        return;
    }

    container.innerHTML = state.documents.map(doc => `
        <div class="document-item">
            <div class="document-info">
                <h4>${doc.name}</h4>
                <p>${doc.type} • ${doc.wordCount} words • ${new Date(doc.uploadedAt).toLocaleDateString()}</p>
            </div>
            <div class="document-actions">
                <button class="btn btn-primary btn-small" onclick="analyzeDocument('${doc.id}')">Analyze</button>
                <button class="btn btn-danger btn-small" onclick="deleteDocument('${doc.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

async function deleteDocument(documentId) {
    if (!confirm('Are you sure you want to delete this document?')) return;

    showLoading();
    try {
        const response = await fetch(`${API_BASE}/upload/${documentId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        
        if (result.success) {
            showNotification('Document deleted successfully', 'success');
            loadDocuments();
            loadDashboard();
        } else {
            showNotification(result.error || 'Delete failed', 'error');
        }
    } catch (error) {
        showNotification('Failed to delete document', 'error');
        console.error('Delete error:', error);
    } finally {
        hideLoading();
    }
}

// Analysis
function initializeAnalysis() {
    const form = document.getElementById('analysis-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const documentId = document.getElementById('analysis-doc-select').value;
        const regulations = Array.from(document.querySelectorAll('input[name="regulations"]:checked'))
            .map(cb => cb.value);

        await runAnalysis(documentId, regulations);
    });
}

function updateAnalysisDocumentSelect() {
    const select = document.getElementById('analysis-doc-select');
    select.innerHTML = '<option value="">Select a document</option>' +
        state.documents.map(doc => `<option value="${doc.id}">${doc.name}</option>`).join('');
}

async function analyzeDocument(documentId) {
    switchSection('analysis');
    document.getElementById('analysis-doc-select').value = documentId;
}

async function runAnalysis(documentId, regulations) {
    showLoading();
    try {
        const response = await fetch(`${API_BASE}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentId, regulations })
        });

        const result = await response.json();
        
        if (result.success) {
            state.analysisResults[documentId] = result.analysis;
            renderAnalysisResults(result);
            showNotification('Analysis completed successfully', 'success');
            loadDashboard();
        } else {
            showNotification(result.error || 'Analysis failed', 'error');
        }
    } catch (error) {
        showNotification('Failed to analyze document', 'error');
        console.error('Analysis error:', error);
    } finally {
        hideLoading();
    }
}

function renderAnalysisResults(result) {
    const container = document.getElementById('analysis-container');
    const analysis = result.analysis;

    container.innerHTML = `
        <div class="analysis-summary">
            <h3>${result.documentName} - Analysis Summary</h3>
            <div class="summary-stats">
                <p>Total Requirements: ${analysis.summary.totalRequirements}</p>
                <p>Compliant: ${analysis.summary.compliant}</p>
                <p>Partially Compliant: ${analysis.summary.partiallyCompliant}</p>
                <p>Non-Compliant: ${analysis.summary.nonCompliant}</p>
                <p>Overall Compliance Score: ${analysis.summary.overallComplianceScore}%</p>
            </div>
        </div>

        <div class="gaps-section">
            <h3>Compliance Gaps (${analysis.gaps.length})</h3>
            ${analysis.gaps.map(gap => `
                <div class="gap-item ${getRiskClass(gap.risk_score)}">
                    <div class="gap-header">
                        <h4>${gap.requirement}</h4>
                        <span class="risk-badge risk-${getRiskLevel(gap.risk_score)}">
                            Risk Score: ${gap.risk_score}
                        </span>
                    </div>
                    <p><strong>Regulation:</strong> ${gap.regulation}</p>
                    <p><strong>Category:</strong> ${gap.category}</p>
                    <p><strong>Details:</strong> ${gap.details}</p>
                    <p><strong>Recommendation:</strong> ${gap.recommendation}</p>
                </div>
            `).join('')}
        </div>

        <div class="actions">
            <button class="btn btn-primary" onclick="generateRemediation('${result.documentId}')">
                Generate Remediation Plan
            </button>
        </div>
    `;
}

async function generateRemediation(documentId) {
    showLoading();
    try {
        const response = await fetch(`${API_BASE}/analyze/remediation/${documentId}`, {
            method: 'POST'
        });

        const result = await response.json();
        
        if (result.success) {
            showRemediationPlan(result.remediation);
        } else {
            showNotification(result.error || 'Failed to generate remediation plan', 'error');
        }
    } catch (error) {
        showNotification('Failed to generate remediation plan', 'error');
        console.error('Remediation error:', error);
    } finally {
        hideLoading();
    }
}

function showRemediationPlan(remediation) {
    // This would open a modal or new section with the remediation plan
    alert('Remediation plan generated! (Full UI implementation pending)');
    console.log('Remediation plan:', remediation);
}

// Chat
function initializeChat() {
    const form = document.getElementById('chat-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (message) {
            await sendChatMessage(message);
            input.value = '';
        }
    });
}

async function sendChatMessage(message) {
    // Add user message to chat
    addChatMessage('user', message);

    showLoading();
    try {
        const response = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });

        const result = await response.json();
        
        if (result.success) {
            addChatMessage('assistant', result.response);
        } else {
            addChatMessage('assistant', 'Sorry, I encountered an error processing your request.');
        }
    } catch (error) {
        addChatMessage('assistant', 'Sorry, I encountered an error processing your request.');
        console.error('Chat error:', error);
    } finally {
        hideLoading();
        loadChatSuggestions();
    }
}

function addChatMessage(type, content) {
    const container = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = `<p>${content}</p>`;
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

async function loadChatSuggestions() {
    try {
        const response = await fetch(`${API_BASE}/chat/suggestions`);
        const data = await response.json();
        
        const container = document.getElementById('chat-suggestions');
        container.innerHTML = data.suggestions.map(suggestion => `
            <button class="suggestion-btn" onclick="sendChatMessage('${suggestion}')">
                ${suggestion}
            </button>
        `).join('');
    } catch (error) {
        console.error('Failed to load suggestions:', error);
    }
}

// Dashboard
async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE}/dashboard`);
        const data = await response.json();
        
        // Update stats
        document.getElementById('doc-count').textContent = data.documentsUploaded;
        document.getElementById('gap-count').textContent = data.totalGaps;
        document.getElementById('high-risk-count').textContent = data.riskDistribution.high;
        
        // Calculate compliance score
        if (data.totalGaps > 0) {
            const score = Math.round(100 - (data.riskDistribution.high * 10 + 
                                           data.riskDistribution.medium * 5 + 
                                           data.riskDistribution.low * 2));
            document.getElementById('compliance-score').textContent = Math.max(0, score) + '%';
        } else {
            document.getElementById('compliance-score').textContent = '-';
        }

        // Update risk chart
        updateRiskChart(data.riskDistribution);
    } catch (error) {
        console.error('Failed to load dashboard:', error);
    }
}

function updateRiskChart(riskDistribution) {
    const canvas = document.getElementById('riskCanvas');
    const ctx = canvas.getContext('2d');
    
    // Simple bar chart
    const data = [
        { label: 'High', value: riskDistribution.high, color: '#e74c3c' },
        { label: 'Medium', value: riskDistribution.medium, color: '#f39c12' },
        { label: 'Low', value: riskDistribution.low, color: '#27ae60' }
    ];
    
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const barWidth = canvas.width / (data.length * 2);
    const barSpacing = barWidth;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    data.forEach((item, index) => {
        const barHeight = (item.value / maxValue) * (canvas.height - 40);
        const x = barSpacing + index * (barWidth + barSpacing);
        const y = canvas.height - barHeight - 20;
        
        ctx.fillStyle = item.color;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        ctx.fillStyle = '#2c3e50';
        ctx.textAlign = 'center';
        ctx.fillText(item.label, x + barWidth / 2, canvas.height - 5);
        ctx.fillText(item.value, x + barWidth / 2, y - 5);
    });
}

// Utility functions
function showLoading() {
    document.getElementById('loading-overlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.remove('active');
}

function showNotification(message, type) {
    // Simple alert for MVP - could be replaced with a better notification system
    alert(message);
}

function getRiskClass(riskScore) {
    if (riskScore >= 7) return 'high-risk';
    if (riskScore >= 4) return 'medium-risk';
    return 'low-risk';
}

function getRiskLevel(riskScore) {
    if (riskScore >= 7) return 'high';
    if (riskScore >= 4) return 'medium';
    return 'low';
}
