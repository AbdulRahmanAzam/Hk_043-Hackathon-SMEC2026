const API_BASE = 'http://localhost:8000';

let currentJobId = null;
let pollInterval = null;

function startExtraction() {
    const urlInput = document.getElementById('ytUrl');
    const ytUrl = urlInput.value.trim();
    
    if (!ytUrl) {
        alert('Please enter a YouTube URL');
        return;
    }
    
    if (!ytUrl.includes('youtube.com') && !ytUrl.includes('youtu.be')) {
        alert('Please enter a valid YouTube URL');
        return;
    }
    
    hideAllSections();
    showProgress();
    disableInput(true);
    
    fetch(`${API_BASE}/api/process`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: ytUrl })
    })
    .then(res => {
        if (!res.ok) throw new Error('Failed to start processing');
        return res.json();
    })
    .then(data => {
        currentJobId = data.job_id;
        startPolling();
    })
    .catch(err => {
        showError(err.message);
    });
}

function startPolling() {
    pollInterval = setInterval(checkStatus, 1500);
}

function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}

function checkStatus() {
    if (!currentJobId) return;
    
    fetch(`${API_BASE}/api/status/${currentJobId}`)
    .then(res => res.json())
    .then(data => {
        updateProgress(data.progress, data.message);
        
        if (data.status === 'done') {
            stopPolling();
            showResults(data);
        } else if (data.status === 'failed') {
            stopPolling();
            showError(data.message);
        }
    })
    .catch(err => {
        console.error('Polling error:', err);
    });
}

function updateProgress(percent, msg) {
    const bar = document.getElementById('progressBar');
    const text = document.getElementById('statusText');
    
    bar.style.width = percent + '%';
    text.textContent = msg;
}

function showProgress() {
    document.getElementById('progressSection').classList.remove('hidden');
}

function hideAllSections() {
    document.getElementById('progressSection').classList.add('hidden');
    document.getElementById('resultsSection').classList.add('hidden');
    document.getElementById('errorSection').classList.add('hidden');
}

function showResults(data) {
    document.getElementById('progressSection').classList.add('hidden');
    
    const lyricsEl = document.getElementById('lyricsText');
    lyricsEl.textContent = data.lyrics || 'No lyrics extracted';
    
    const wcImg = document.getElementById('wordcloudImg');
    wcImg.src = API_BASE + data.wordcloud_url;
    
    document.getElementById('resultsSection').classList.remove('hidden');
    disableInput(false);
}

function showError(msg) {
    document.getElementById('progressSection').classList.add('hidden');
    document.getElementById('errorText').textContent = msg;
    document.getElementById('errorSection').classList.remove('hidden');
    disableInput(false);
}

function disableInput(disabled) {
    document.getElementById('ytUrl').disabled = disabled;
    document.getElementById('extractBtn').disabled = disabled;
}

function resetForm() {
    hideAllSections();
    document.getElementById('ytUrl').value = '';
    currentJobId = null;
}

function downloadWordcloud() {
    if (!currentJobId) return;
    window.open(`${API_BASE}/download/wordcloud/${currentJobId}`, '_blank');
}

function downloadPdf() {
    if (!currentJobId) return;
    window.open(`${API_BASE}/download/pdf/${currentJobId}`, '_blank');
}

// allow enter key to submit
document.addEventListener('DOMContentLoaded', function() {
    const input = document.getElementById('ytUrl');
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            startExtraction();
        }
    });
});
