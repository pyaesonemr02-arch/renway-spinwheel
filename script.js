/**
 * RENWAY Fashion Studio - Giveaway Engine
 * Enterprise-grade Canvas Wheel, State Management, and Audio Engine
 */

const AppState = {
    participants: [],
    winners: [],
    isSpinning: false,
    currentRotation: 0,
    config: {
        prizes: {
            'Dragon Set': { total: 1, given: 0 },
            'KPay 3000 MMK': { total: 10, given: 0 }
        }
    }
};

// --- Audio Engine Setup ---
// These files must exist in your assets folder!
const sfxTick = new Audio('assets/click.mp3');
const sfxWinner = new Audio('assets/winner.mp3');

// Preload audio and set comfortable volume levels
sfxTick.preload = 'auto';
sfxWinner.preload = 'auto';
sfxTick.volume = 0.8; // Increased volume for the single button click
sfxWinner.volume = 0.8;

// DOM Elements
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const ui = {
    input: document.getElementById('participantInput'),
    btnAdd: document.getElementById('btnAdd'),
    btnImport: document.getElementById('btnImport'),
    fileInput: document.getElementById('fileInput'),
    count: document.getElementById('participantCount'),
    btnSpin: document.getElementById('btnSpin'),
    btnClear: document.getElementById('btnClear'),
    btnRecordMode: document.getElementById('btnRecordMode'),
    btnExport: document.getElementById('btnExport'),
    prizeSelect: document.getElementById('prizeSelect'),
    appContainer: document.getElementById('appContainer'),
    winnersUl: document.getElementById('winnersUl'),
    modal: document.getElementById('winnerModal'),
    modalContent: document.querySelector('.modal-content'),
    winnerName: document.getElementById('winnerNameDisplay'),
    winnerPrize: document.getElementById('winnerPrizeDisplay'),
    btnAccept: document.getElementById('btnAcceptWinner'),
    btnRespin: document.getElementById('btnRespin'),
};

// Constants
const COLORS = ['#1A1A1A', '#0D0D0D']; 
const GOLD = '#D4AF37';

// --- Initialization ---
function init() {
    loadState();
    bindEvents();
    renderWheel();
    updateUI();
}

// --- State Management ---
function saveState() {
    localStorage.setItem('renway_participants', JSON.stringify(AppState.participants));
    localStorage.setItem('renway_winners', JSON.stringify(AppState.winners));
    localStorage.setItem('renway_prizes', JSON.stringify(AppState.config.prizes));
}

function loadState() {
    const savedP = localStorage.getItem('renway_participants');
    const savedW = localStorage.getItem('renway_winners');
    const savedPr = localStorage.getItem('renway_prizes');
    
    if (savedP) AppState.participants = JSON.parse(savedP);
    if (savedW) AppState.winners = JSON.parse(savedW);
    if (savedPr) AppState.config.prizes = JSON.parse(savedPr);
}

// --- Canvas Wheel Engine ---
function renderWheel() {
    const numSlices = AppState.participants.length || 1;
    const sliceAngle = (2 * Math.PI) / numSlices;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (AppState.participants.length === 0) {
        drawEmptyWheel(centerX, centerY, radius);
        return;
    }

    // Draw Slices
    for (let i = 0; i < numSlices; i++) {
        const startAngle = AppState.currentRotation + (i * sliceAngle);
        const endAngle = startAngle + sliceAngle;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        
        ctx.fillStyle = COLORS[i % COLORS.length];
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)'; 
        ctx.stroke();

        if (numSlices <= 200) {
            drawText(i, startAngle, sliceAngle, centerX, centerY, radius);
        }
    }
}

function drawEmptyWheel(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = '#111';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = GOLD;
    ctx.stroke();
    
    ctx.fillStyle = GOLD;
    ctx.font = '24px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('ADD PARTICIPANTS', x, y - 80);
}

function drawText(index, startAngle, sliceAngle, centerX, centerY, radius) {
    const text = AppState.participants[index];
    const angle = startAngle + (sliceAngle / 2);
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px Inter';
    
    const displayText = text.length > 20 ? text.substring(0, 17) + '...' : text;
    ctx.fillText(displayText, radius - 30, 6);
    ctx.restore();
}

// --- Physics & Spinning Logic ---
function easeOutQuart(t) {
    return 1 - (--t) * t * t * t;
}

function spinWheel() {
    if (AppState.isSpinning || AppState.participants.length === 0) return;
    
    const prize = ui.prizeSelect.value;
    if (AppState.config.prizes[prize].given >= AppState.config.prizes[prize].total) {
        alert(`All ${prize} prizes have been given out!`);
        return;
    }

    // --- Play single button click sound here ---
    sfxTick.currentTime = 0;
    sfxTick.play().catch(e => { /* Ignore browser autoplay blocks */ });

    AppState.isSpinning = true;
    
    const arrayBuffer = new Uint32Array(1);
    window.crypto.getRandomValues(arrayBuffer);
    const winningIndex = arrayBuffer[0] % AppState.participants.length;
    
    const numSlices = AppState.participants.length;
    const sliceAngle = (2 * Math.PI) / numSlices;
    
    const targetAngle = -(Math.PI / 2); 
    const currentBaseAngle = (winningIndex * sliceAngle) + (sliceAngle / 2);
    
    const spins = 10 * 2 * Math.PI;
    const offset = targetAngle - currentBaseAngle;
    const totalRotation = AppState.currentRotation + spins + offset;

    let startTime = null;
    const duration = 6000; 
    const startRotation = AppState.currentRotation;

    function animate(currentTime) {
        if (!startTime) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        
        const easeProgress = easeOutQuart(progress);
        AppState.currentRotation = startRotation + (totalRotation - startRotation) * easeProgress;
        
        renderWheel();

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            AppState.isSpinning = false;
            AppState.currentRotation = AppState.currentRotation % (2 * Math.PI); 
            showWinnerModal(AppState.participants[winningIndex], prize);
        }
    }
    requestAnimationFrame(animate);
}

// --- Modal & Winners ---
function showWinnerModal(username, prize) {
    ui.winnerName.textContent = username;
    ui.winnerPrize.textContent = `Won: ${prize}`;
    
    // Play Winner Celebration Audio
    sfxWinner.currentTime = 0;
    sfxWinner.play().catch(e => { console.log("Audio blocked by browser."); });
    
    // GSAP Animation
    gsap.to(ui.modal, { autoAlpha: 1, duration: 0.3 });
    gsap.fromTo(ui.modalContent, 
        { scale: 0.5, y: 50 }, 
        { scale: 1, y: 0, duration: 0.5, ease: "back.out(1.7)" }
    );

    // Canvas Confetti
    confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#FFDF73', '#FFFFFF']
    });
}

function acceptWinner() {
    const winnerName = ui.winnerName.textContent;
    const prize = ui.winnerPrize.textContent.replace('Won: ', '');
    
    AppState.winners.push({ name: winnerName, prize, date: new Date().toISOString() });
    AppState.config.prizes[prize].given++;
    
    AppState.participants = AppState.participants.filter(p => p !== winnerName);
    
    saveState();
    updateUI();
    closeModal();
    renderWheel();
}

function closeModal() {
    gsap.to(ui.modal, { autoAlpha: 0, duration: 0.2 });
}

// --- Data Handlers ---
function processParticipants(rawText) {
    const names = rawText.split(/[\n,]+/).map(n => n.trim().replace(/^@/, '')).filter(n => n.length > 0);
    const uniqueNames = [...new Set([...AppState.participants, ...names])];
    AppState.participants = uniqueNames;
    ui.input.value = '';
    saveState();
    updateUI();
    renderWheel();
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        processParticipants(evt.target.result);
    };
    reader.readAsText(file);
}

function exportCSV() {
    if (AppState.winners.length === 0) return alert("No winners to export.");
    let csv = "Date,Username,Prize\n";
    AppState.winners.forEach(w => {
        csv += `${new Date(w.date).toLocaleString()},${w.name},${w.prize}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'renway_winners.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// --- UI Updates ---
function updateUI() {
    ui.count.textContent = AppState.participants.length;
    
    Array.from(ui.prizeSelect.options).forEach(opt => {
        const pInfo = AppState.config.prizes[opt.value];
        const remaining = pInfo.total - pInfo.given;
        opt.text = `${opt.value} (${remaining} remaining)`;
        opt.disabled = remaining <= 0;
    });

    ui.winnersUl.innerHTML = '';
    [...AppState.winners].reverse().slice(0, 5).forEach(w => {
        const li = document.createElement('li');
        li.innerHTML = `<span>@${w.name}</span> <span>${w.prize}</span>`;
        ui.winnersUl.appendChild(li);
    });
}

// --- Events ---
function bindEvents() {
    ui.btnAdd.addEventListener('click', () => processParticipants(ui.input.value));
    ui.btnImport.addEventListener('click', () => ui.fileInput.click());
    ui.fileInput.addEventListener('change', handleFileUpload);
    ui.btnSpin.addEventListener('click', spinWheel);
    
    ui.btnClear.addEventListener('click', () => {
        if(confirm("Are you sure you want to RESET EVERYTHING? This will clear all participants, delete the winner history, and reset all prize counts.")) {
            AppState.participants = [];
            AppState.winners = [];
            AppState.config.prizes = {
                'Dragon Set': { total: 1, given: 0 },
                'KPay 3000 MMK': { total: 10, given: 0 } 
            };
            localStorage.removeItem('renway_participants');
            localStorage.removeItem('renway_winners');
            localStorage.removeItem('renway_prizes');
            saveState();
            updateUI();
            renderWheel();
        }
    });

    ui.btnRecordMode.addEventListener('click', () => {
        ui.appContainer.classList.toggle('is-record-mode');
    });

    ui.btnAccept.addEventListener('click', acceptWinner);
    ui.btnRespin.addEventListener('click', closeModal);
    ui.btnExport.addEventListener('click', exportCSV);

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !AppState.isSpinning && ui.appContainer.classList.contains('is-record-mode')) {
            spinWheel();
        }
        if (e.code === 'KeyR' && e.ctrlKey) {
            ui.appContainer.classList.toggle('is-record-mode');
            e.preventDefault();
        }
    });
}

// Boot
window.onload = init;