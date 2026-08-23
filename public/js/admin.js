// Admin panel functionality
document.addEventListener('DOMContentLoaded', function() {
  const navLinks = document.querySelectorAll('.admin-nav .nav-link:not(.logout)');
  
  navLinks.forEach(link => {
    link.addEventListener('click', handleAdminNavigation);
  });

  // Load initial dashboard data
  loadDashboardStats();
});

function handleAdminNavigation(e) {
  if (e.target.classList.contains('logout')) return;
  
  e.preventDefault();
  const href = e.target.getAttribute('href');
  if (!href) return;
  
  const sectionId = href.substring(1);
  
  // Remove active class from all links and sections
  document.querySelectorAll('.admin-nav .nav-link').forEach(link => {
    link.classList.remove('active');
  });
  document.querySelectorAll('.admin-section').forEach(section => {
    section.classList.remove('active');
  });
  
  // Add active class to clicked link and section
  e.target.classList.add('active');
  document.getElementById(sectionId)?.classList.add('active');
  
  // Load data for the section
  if (sectionId === 'users') loadUsers();
  else if (sectionId === 'files') loadAllFiles();
  else if (sectionId === 'reports') loadReports();
  else if (sectionId === 'expired') loadExpiredFiles();
  else if (sectionId === 'logs') loadAuditLogs();
  else if (sectionId === 'settings') loadSettings();
  else if (sectionId === 'dashboard') loadDashboardStats();
}

async function loadDashboardStats() {
  try {
    const response = await fetch('/admin-panel/api/dashboard/stats');
    const data = await response.json();
    
    document.getElementById('stat-users').textContent = data.totalUsers || 0;
    document.getElementById('stat-files').textContent = data.totalFiles || 0;
    document.getElementById('stat-storage').textContent = formatBytes(data.totalStorage || 0);
    document.getElementById('stat-reports').textContent = data.totalReports || 0;
    document.getElementById('stat-pending').textContent = data.pendingReports || 0;
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
  }
}

async function loadUsers() {
  try {
    const response = await fetch('/admin-panel/api/users');
    const data = await response.json();
    const tbody = document.getElementById('users-tbody');
    
    tbody.innerHTML = data.users.map(user => `
      <tr>
        <td>${user.id}</td>
        <td>${escapeHtml(user.email)}</td>
        <td>${escapeHtml(user.username)}</td>
        <td><span class="role-badge role-${user.role}">${user.role}</span></td>
        <td><span class="user-status status-${user.status}">${user.status}</span></td>
        <td>${formatBytes(user.storage_used || 0)}</td>
        <td>${user.warning_count || 0}</td>
        <td>
          <button class="btn btn-primary" onclick="viewUserDetails(${user.id})">View</button>
          <button class="btn btn-danger" onclick="suspendUser(${user.id})">Suspend</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

async function loadAllFiles() {
  try {
    const response = await fetch('/admin-panel/api/files');
    const data = await response.json();
    const tbody = document.getElementById('files-tbody');
    
    tbody.innerHTML = data.files.map(file => `
      <tr>
        <td>${file.id}</td>
        <td>${escapeHtml(file.original_name)}</td>
        <td>${escapeHtml(file.user_email)}</td>
        <td>${formatBytes(file.file_size)}</td>
        <td>${file.mime_type}</td>
        <td>${file.is_public ? 'Yes' : 'No'}</td>
        <td>${file.download_count}</td>
        <td>${formatDate(file.created_at)}</td>
        <td>
          <button class="btn btn-danger" onclick="deleteFile(${file.id})">Delete</button>
          ${file.is_public ? `<button class="btn btn-secondary" onclick="disablePublicLink(${file.id})">Disable Link</button>` : ''}
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading files:', error);
  }
}

async function loadReports() {
  try {
    const response = await fetch('/admin-panel/api/reports');
    const data = await response.json();
    const container = document.getElementById('reports-list');
    
    container.innerHTML = data.reports.map(report => `
      <div class="report-card">
        <span class="report-reason">${report.reason.toUpperCase()}</span>
        <p><strong>File:</strong> ${escapeHtml(report.original_name)}</p>
        <p><strong>Reporter Email:</strong> ${escapeHtml(report.reporter_email || 'Anonymous')}</p>
        <p><strong>Description:</strong> ${escapeHtml(report.description || 'No description')}</p>
        <p><strong>Owner:</strong> ${escapeHtml(report.user_email)}</p>
        <div class="report-actions">
          <button class="btn btn-primary" onclick="updateReportStatus(${report.id}, 'reviewed')">Review</button>
          <button class="btn btn-success" onclick="updateReportStatus(${report.id}, 'resolved')">Resolve</button>
          <button class="btn btn-secondary" onclick="updateReportStatus(${report.id}, 'dismissed')">Dismiss</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading reports:', error);
  }
}

async function loadExpiredFiles() {
  try {
    const response = await fetch('/admin-panel/api/expired-files');
    const data = await response.json();
    const tbody = document.getElementById('expired-tbody');
    
    tbody.innerHTML = data.files.map(file => `
      <tr>
        <td>${file.id}</td>
        <td>${escapeHtml(file.original_name)}</td>
        <td>${escapeHtml(file.user_email)}</td>
        <td>${formatDate(file.expires_at)}</td>
        <td>${formatDate(file.deletion_scheduled_at)}</td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading expired files:', error);
  }
}

async function loadAuditLogs() {
  try {
    const response = await fetch('/admin-panel/api/audit-logs');
    const data = await response.json();
    const container = document.getElementById('logs-list');
    
    container.innerHTML = `
      <div>${data.logs.map(log => `
        <div class="log-entry">
          <div class="log-timestamp">${formatDate(log.created_at)}</div>
          <div class="log-action">${log.action}</div>
          <div>${log.target_type}</div>
          <div>${log.details || '-'}</div>
          <div>${log.admin_email || '-'}</div>
        </div>
      `).join('')}</div>
    `;
  } catch (error) {
    console.error('Error loading audit logs:', error);
  }
}

async function loadSettings() {
  try {
    const response = await fetch('/admin-panel/api/settings');
    const data = await response.json();
    const form = document.getElementById('settings-form');
    
    form.innerHTML = data.settings.map(setting => `
      <div class="setting-item">
        <label>${setting.setting_key}</label>
        <input type="text" value="${setting.setting_value}" onchange="updateSetting('${setting.setting_key}', this.value)">
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

async function updateSetting(key, value) {
  try {
    await fetch(`/admin-panel/api/settings/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value })
    });
    alert('Setting updated successfully');
  } catch (error) {
    alert('Error updating setting: ' + error.message);
  }
}

async function deleteFile(fileId) {
  if (!confirm('Are you sure you want to delete this file?')) return;
  try {
    await fetch(`/admin-panel/api/files/${fileId}`, { method: 'DELETE' });
    alert('File deleted successfully');
    loadAllFiles();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function disablePublicLink(fileId) {
  try {
    await fetch(`/admin-panel/api/files/${fileId}/disable-public`, { method: 'PUT' });
    alert('Public link disabled');
    loadAllFiles();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function suspendUser(userId) {
  const reason = prompt('Enter suspension reason:');
  if (!reason) return;
  try {
    await fetch(`/admin-panel/api/users/${userId}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    alert('User suspended successfully');
    loadUsers();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function updateReportStatus(reportId, status) {
  const adminNotes = prompt('Add admin notes:');
  try {
    await fetch(`/admin-panel/api/reports/${reportId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminNotes })
    });
    alert('Report updated successfully');
    loadReports();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString();
}

function viewUserDetails(userId) {
  window.location.href = `/admin-panel#users/${userId}`;
}
