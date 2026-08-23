// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
  const uploadArea = document.getElementById('upload-area');
  const fileInput = document.getElementById('file-input');
  const expirationSelect = document.getElementById('expiration');
  const customDateGroup = document.getElementById('custom-date-group');
  const sidebarLinks = document.querySelectorAll('.sidebar-link');

  // Upload area click
  if (uploadArea) {
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.style.backgroundColor = '#e0eeff';
    });
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.style.backgroundColor = '#f0f7ff';
    });
    uploadArea.addEventListener('drop', handleDrop);
  }

  // File input change
  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
  }

  // Expiration change
  if (expirationSelect) {
    expirationSelect.addEventListener('change', () => {
      customDateGroup.style.display = expirationSelect.value === 'custom' ? 'flex' : 'none';
    });
  }

  // Sidebar navigation
  sidebarLinks.forEach(link => {
    link.addEventListener('click', handleNavigation);
  });

  // Load initial data
  loadFiles();
  loadStats();
});

function handleDrop(e) {
  e.preventDefault();
  const files = e.dataTransfer.files;
  handleFiles(files);
}

function handleFileSelect(e) {
  handleFiles(e.target.files);
}

function handleFiles(files) {
  Array.from(files).forEach(file => {
    uploadFile(file);
  });
}

async function uploadFile(file) {
  const expiration = document.getElementById('expiration').value;
  const expirationDate = document.getElementById('expiration-date').value;
  const isPublic = document.getElementById('is-public').checked;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('expiration', expiration);
  formData.append('expirationDate', expirationDate);
  formData.append('isPublic', isPublic);

  try {
    const response = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const data = await response.json();
      alert('File uploaded successfully');
      loadFiles();
      loadStats();
    } else {
      const error = await response.json();
      alert('Upload failed: ' + error.error);
    }
  } catch (error) {
    alert('Error uploading file: ' + error.message);
  }
}

async function loadFiles() {
  try {
    const response = await fetch('/api/files');
    const data = await response.json();
    const filesList = document.getElementById('files-list');

    if (filesList) {
      filesList.innerHTML = data.files.map(file => `
        <div class="file-card">
          <div class="file-card-header">
            <div class="file-card-title">${escapeHtml(file.original_name)}</div>
            <div class="file-card-meta">${formatDate(file.created_at)}</div>
          </div>
          <div class="file-card-body">
            <div class="file-info">Size: ${formatBytes(file.file_size)}</div>
            <div class="file-info">Type: ${file.mime_type}</div>
            <div class="file-info">Downloads: ${file.download_count}</div>
            <div class="file-actions">
              <button class="btn btn-primary" onclick="downloadFile(${file.id})">Download</button>
              <button class="btn btn-secondary" onclick="copyPublicLink('${file.public_link_token}')">Copy Link</button>
              <button class="btn btn-danger" onclick="deleteFile(${file.id})">Delete</button>
            </div>
          </div>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Error loading files:', error);
  }
}

async function downloadFile(fileId) {
  try {
    const response = await fetch(`/api/files/${fileId}/download`);
    const data = await response.json();
    window.location.href = data.url;
  } catch (error) {
    alert('Error downloading file: ' + error.message);
  }
}

async function deleteFile(fileId) {
  if (!confirm('Are you sure you want to delete this file?')) return;

  try {
    const response = await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
    if (response.ok) {
      alert('File deleted successfully');
      loadFiles();
      loadStats();
    } else {
      alert('Error deleting file');
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

function copyPublicLink(token) {
  const link = `${window.location.origin}/api/public/${token}`;
  navigator.clipboard.writeText(link);
  alert('Public link copied to clipboard!');
}

async function loadStats() {
  try {
    const response = await fetch('/api/files');
    const data = await response.json();
    const files = data.files || [];

    let totalSize = 0;
    let totalDownloads = 0;

    files.forEach(file => {
      totalSize += file.file_size || 0;
      totalDownloads += file.download_count || 0;
    });

    document.getElementById('stat-total-files').textContent = files.length;
    document.getElementById('stat-storage').textContent = formatBytes(totalSize);
    document.getElementById('stat-downloads').textContent = totalDownloads;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

function handleNavigation(e) {
  const target = e.target.getAttribute('href')?.substring(1);
  if (!target) return;

  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.classList.remove('active');
  });
  e.target.classList.add('active');

  document.querySelectorAll('.dashboard-section').forEach(section => {
    section.classList.remove('active');
  });
  document.getElementById(target)?.classList.add('active');
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
