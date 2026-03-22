// utility - generate dummy prediction
function generateDummyResult() {
    const diseases = ["Eczema","Psoriasis","Acne"];
    const disease = diseases[Math.floor(Math.random()*diseases.length)];
    const confidence = (Math.random() * 25 + 70).toFixed(1); // 70-95
    return { disease, confidence };
}

// localStorage helpers
const STORAGE_KEY = 'skinHistoryRecords';
function loadHistory() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
}
function saveHistory(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}
function addRecord(record) {
    const records = loadHistory();
    records.unshift(record); // newest first
    saveHistory(records);
    renderHistory();
}
function deleteRecord(id) {
    let records = loadHistory();
    records = records.filter(r => r.id !== id);
    saveHistory(records);
    renderHistory();
}
function clearHistory() {
    if(confirm('Are you sure you want to delete all history?')){
        localStorage.removeItem(STORAGE_KEY);
        renderHistory();
    }
}

// rendering
function renderHistory() {
    const container = document.getElementById('history');
    container.innerHTML = '';
    const records = loadHistory();
    if(records.length === 0){
        container.innerHTML = '<p>No history yet.</p>';
        return;
    }
    records.forEach(r => {
        const card = document.createElement('div');
        card.className = 'record';
        card.innerHTML = `
            <img src="${r.image}" alt="${r.disease}">
            <div class="record-content">
                <p><strong>Disease:</strong> ${r.disease}</p>
                <p><strong>Confidence:</strong> ${r.confidence}%</p>
                <p class="meta">${r.datetime}</p>
            </div>
            <button class="delete-btn" data-id="${r.id}">x</button>
        `;
        container.appendChild(card);
    });
    // attach delete listeners
    document.querySelectorAll('.delete-btn').forEach(btn=>{
        btn.addEventListener('click',e=>{
            const id = e.target.dataset.id;
            if(confirm('Delete this record?')) deleteRecord(id);
        });
    });
}

// file reader + detect
let currentImageData = null;
const imageInput = document.getElementById('imageInput');
imageInput.addEventListener('change',(e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev=>{
        currentImageData = ev.target.result;
    };
    reader.readAsDataURL(file);
});

const detectBtn = document.getElementById('detectBtn');
detectBtn.addEventListener('click',()=>{
    if(!currentImageData){
        alert('Please select an image first');
        return;
    }
    const dummy = generateDummyResult();
    const datetime = new Date().toLocaleString();
    const id = Date.now().toString();
    addRecord({ id, image: currentImageData, disease: dummy.disease, confidence: dummy.confidence, datetime });
    // reset input
    imageInput.value = '';
    currentImageData = null;
});

// clear all button
document.getElementById('clearAllBtn').addEventListener('click',clearHistory);

// initial render
renderHistory();
