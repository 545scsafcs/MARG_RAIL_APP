export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const API_BASE_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

async function request(endpoint, options = {}) {
  let token = null;
  try {
    const saved = localStorage.getItem('marg_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      token = parsed.token;
    }
  } catch {}

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  } catch (networkError) {
    console.error(`[API] Network error on ${endpoint}:`, networkError.message);
    throw new Error('Unable to connect to MARG backend engine. Make sure the backend server is active on port 5000.');
  }

  if (!response.ok) {
    let errBody = {};
    try { errBody = await response.json(); } catch (_) {}
    const msg = errBody.message || errBody.error || `Server error (HTTP ${response.status})`;
    console.warn(`[API] ${endpoint} HTTP ${response.status}:`, msg);
    throw new Error(msg);
  }

  try {
    return await response.json();
  } catch (_) {
    throw new Error('MARG backend returned an invalid response.');
  }
}

// Authentication & Users
export const loginUser = (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
export const registerUser = (username, password, name) => request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password, name }) });
export const getCurrentUser = () => request('/auth/me');

// Core Operational APIs
export const getHealth = () => request('/health');
export const getDashboard = () => request('/dashboard');
export const getTrains = () => request('/trains');
export const getTrainsPaginated = (limit = 20, offset = 0, search = '') => {
  const params = new URLSearchParams({ limit, offset });
  if (search) params.append('search', search);
  return request(`/trains?${params.toString()}`);
};
export const getStations = () => request('/stations');
export const getSections = () => request('/sections');

// Assets
export const getAssets = () => request('/assets');
export const getAssetAvailability = () => request('/assets/availability');
export const getCriticalAssets = () => request('/assets/critical');
export const createAsset = (assetData) => request('/assets/create', { method: 'POST', body: JSON.stringify(assetData) });
export const updateAsset = (id, data) => request(`/assets/${id}`, { method: 'PUT', body: JSON.stringify(data) });

// Maintenance & Contractor Workflow
export const getMaintenance = () => request('/maintenance');
export const createMaintenanceTask = (taskData) => request('/maintenance/create', { method: 'POST', body: JSON.stringify(taskData) });
export const updateTaskStatus = (id, status) => request(`/maintenance/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const updateWorkStatus = (id, data) => request(`/maintenance/${id}/work-status`, { method: 'PATCH', body: JSON.stringify(data) });
export const submitTaskForApproval = (id, data) => request(`/maintenance/${id}/submit-approval`, { method: 'POST', body: JSON.stringify(data) });
export const reviewTask = (id, action, notes = '') => request(`/maintenance/${id}/review`, { method: 'POST', body: JSON.stringify({ action, notes }) });
export const getApprovalQueue = () => request('/approvals');
export const getTaskEvidence = (taskId) => request(`/work-evidence/task/${taskId}`);
export const deleteWorkEvidence = (evidenceId, reason = '') => request(`/work-evidence/${evidenceId}`, {
  method: 'DELETE',
  body: JSON.stringify({ reason })
});

export const uploadWorkEvidence = async (taskId, file, category = 'DURING', progressPercentage = 50, notes = '', ohePoleNumber = '') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);
  formData.append('progress_percentage', progressPercentage);
  formData.append('evidence_notes', notes);
  formData.append('ohe_pole_number', ohePoleNumber);

  let token = null;
  try {
    const saved = localStorage.getItem('marg_user');
    if (saved) token = JSON.parse(saved).token;
  } catch {}

  const response = await fetch(`${API_BASE_URL}/maintenance/${taskId}/evidence`, {
    method: 'POST',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: formData
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || body.error || `HTTP error ${response.status}`);
  }

  return body;
};

// Block Planning & Deterministic Train Impact Engine
export const getBlocks = () => request('/blocks');
export const runOptimization = (payload = {}) => request('/blocks/optimize', { method: 'POST', body: JSON.stringify(payload) });
export const approveBlock = (block_id) => request('/blocks/approve', { method: 'POST', body: JSON.stringify({ block_id }) });
export const getBlockTrainImpact = (id) => request(`/blocks/${id}/impact`);
export const getMonthlyPlan = (year = 2026, month = 9) => request(`/monthly-plan?year=${year}&month=${month}`);
export const runScenario = (payload) => request('/scenario/run', { method: 'POST', body: JSON.stringify(payload) });

// Insights, Audit Logs & Assistant
export const getAnalytics = () => request('/analytics');
export const getAuditLogs = () => request('/audit-logs');
export const searchGlobal = (q) => request(`/search?q=${encodeURIComponent(q)}`);
export const sendCopilotMessage = (message, history = [], context = {}) => request('/copilot/chat', { method: 'POST', body: JSON.stringify({ message, history, context }) });

// File Import
export const uploadImportFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  let token = null;
  try {
    const saved = localStorage.getItem('marg_user');
    if (saved) token = JSON.parse(saved).token;
  } catch {}

  const response = await fetch(`${API_BASE_URL}/import/trains`, {
    method: 'POST',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: formData
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || body.error || `HTTP error ${response.status}`);
  }

  return body;
};

