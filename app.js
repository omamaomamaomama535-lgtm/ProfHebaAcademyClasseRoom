// ======================= Configurazione Firebase =======================
// INSERISCI QUI I TUOI DATI FIREBASE REALI
const firebaseConfig = {
    apiKey: "AIzaSyBGOLQSvAEIKK380Zo2bpQtY6n0pSruFMg",
    authDomain: "profhebaacademyclasseroo-d1d49.firebaseapp.com",
    projectId: "profhebaacademyclasseroo-d1d49",
    storageBucket: "profhebaacademyclasseroo-d1d49.firebasestorage.app",
    messagingSenderId: "28002405171",
    appId: "1:28002405171:web:2136b2334812f73d810c46",
    measurementId: "G-TK9J9L2THQ"
};

// Inizializzazione Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Variabili di stato globali
let homeworks = [];
let scheduleData = {};
let allowedUsers = [];
let currentUser = null;
let activeHwId = null;

const days = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const slots = [1, 2, 3, 4, 5, 6];

// Al caricamento della pagina
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-screen').classList.remove('hidden-section');
});

// ================= Sistema di Notifiche (Toast) e Modali =================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    let icon = type === 'success' ? '<i class="fas fa-check-circle text-emerald-500 text-lg"></i>' : 
              (type === 'error' ? '<i class="fas fa-exclamation-circle text-red-500 text-lg"></i>' : 
              '<i class="fas fa-info-circle text-blue-500 text-lg"></i>');
              
    toast.className = `custom-toast ${type}`;
    toast.innerHTML = `${icon} <span class="font-medium text-sm text-slate-700">${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => { if(toast.parentElement) toast.remove(); }, 3000);
}

function customConfirm(message, onConfirm) {
    document.getElementById('confirm-msg').innerText = message;
    document.getElementById('confirm-modal').classList.add('active');
    
    let yesBtn = document.getElementById('confirm-btn-yes');
    let newBtn = yesBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newBtn, yesBtn);
    
    newBtn.addEventListener('click', () => {
        closeConfirmModal();
        onConfirm();
    });
}

window.closeConfirmModal = function() {
    document.getElementById('confirm-modal').classList.remove('active');
}

function showLoader() { document.getElementById('loader-overlay').classList.remove('hidden-section'); }
function hideLoader() { document.getElementById('loader-overlay').classList.add('hidden-section'); }

// ================= Recupero Dati dal Server =================
async function fetchServerData() {
    try {
        const usersSnap = await db.collection('users').get();
        allowedUsers = usersSnap.docs.map(doc => doc.data());
        
        const hwSnap = await db.collection('homeworks').get();
        homeworks = hwSnap.docs.map(doc => doc.data());
        
        const schDoc = await db.collection('settings').doc('schedule').get();
        if (schDoc.exists) scheduleData = schDoc.data();
        
        return true;
    } catch (error) {
        console.error("Errore di connessione:", error);
        showToast("Impossibile connettersi al database.", "error");
        return false;
    }
}

// ================= Gestione Accessi =================
function parseJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join('')));
}

window.handleGoogleLogin = async function(response) {
    showLoader();
    const payload = parseJwt(response.credential);
    const email = payload.email.toLowerCase();
    const name = payload.name;

    let success = await fetchServerData();
    hideLoader();
    if(!success) return;

    if (allowedUsers.length === 0) {
        showToast("Benvenuto! Sei stato registrato come Amministratore.", "success");
        let newAdmin = { email, name, role: 'admin' };
        allowedUsers.push(newAdmin);
        try {
            await db.collection('users').doc(email).set(newAdmin);
            loginAs('admin', name, email); 
        } catch(e) { showToast("Errore di salvataggio.", "error"); }
        return;
    }

    const user = allowedUsers.find(u => u.email === email);
    if (user) loginAs(user.role, user.name || name, email);
    else showToast("Accesso negato. Utente non registrato.", "error");
}

window.manualLogin = async function(role, name, email) {
    showLoader();
    let success = await fetchServerData();
    hideLoader();
    if(success) loginAs(role, name, email);
}

function loginAs(role, name, email) {
    currentUser = { role, name, email };
    
    document.getElementById('login-screen').classList.add('hidden-section');
    document.getElementById('main-dashboard').classList.remove('hidden-section');
    document.getElementById('user-name-display').innerText = name;
    
    let roleLabel = role === 'admin' ? 'Segreteria' : (role === 'teacher' ? 'Docente' : 'Studente');
    document.getElementById('user-role-badge').innerText = roleLabel;

    buildBottomNav();
    
    if(role === 'admin') navigateTo('view-admin', 'nav-admin');
    else if(role === 'teacher') navigateTo('view-homework-manage', 'nav-hw');
    else navigateTo('view-student', 'nav-student');
    
    showToast(`Benvenuto, ${name}`, 'info');
}

window.logout = function() {
    currentUser = null;
    document.getElementById('main-dashboard').classList.add('hidden-section');
    document.getElementById('login-screen').classList.remove('hidden-section');
}

// ================= Navigazione =================
function buildBottomNav() {
    const nav = document.getElementById('bottom-nav');
    nav.innerHTML = '';
    const createItem = (id, icon, text, target) => `
        <div class="nav-item btn-touch" id="${id}" onclick="navigateTo('${target}', '${id}')">
            <i class='fas ${icon}'></i><span>${text}</span>
        </div>`;

    if(currentUser.role === 'admin') nav.innerHTML += createItem('nav-admin', 'fa-users-cog', 'Utenze', 'view-admin');
    if(currentUser.role === 'admin' || currentUser.role === 'teacher') {
        nav.innerHTML += createItem('nav-hw', 'fa-book', 'Attività', 'view-homework-manage');
        nav.innerHTML += createItem('nav-sch', 'fa-calendar-alt', 'Orario', 'view-schedule-manage');
    }
    if(currentUser.role === 'student') nav.innerHTML += createItem('nav-student', 'fa-home', 'Home', 'view-student');
}

window.navigateTo = function(viewId, navId) {
    ['view-admin', 'view-homework-manage', 'view-schedule-manage', 'view-student'].forEach(id => {
        document.getElementById(id).classList.add('hidden-section');
    });
    document.getElementById(viewId).classList.remove('hidden-section');
    
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if(document.getElementById(navId)) document.getElementById(navId).classList.add('active');

    if(viewId === 'view-admin') renderAdminUsers();
    if(viewId === 'view-schedule-manage') drawSchedule('manage-schedule-container');
    if(viewId === 'view-homework-manage') switchTeacherTab('publish');
    if(viewId === 'view-student') { renderStudentHomeworks(); drawSchedule('display-schedule-container'); switchStudentTab('hw'); }
    
    window.scrollTo(0,0);
}

// ================= Amministrazione =================
window.addUser = async function() {
    let name = document.getElementById('add-user-name').value;
    let email = document.getElementById('add-user-email').value.trim().toLowerCase();
    let role = document.getElementById('add-user-role').value;
    
    if(!name || !email) return showToast('Compila tutti i campi.', 'error');
    if(allowedUsers.find(u => u.email === email)) return showToast('Email già registrata.', 'error');
    
    let newUser = { email, name, role };
    
    try {
        showLoader();
        await db.collection('users').doc(email).set(newUser);
        allowedUsers.push(newUser);
        document.getElementById('add-user-name').value = ''; 
        document.getElementById('add-user-email').value = '';
        renderAdminUsers(); 
        showToast('Utente aggiunto con successo', 'success');
    } catch (error) { showToast('Errore di comunicazione col server.', 'error'); } 
    finally { hideLoader(); }
}

window.removeUser = function(email) {
    customConfirm('Rimuovere definitivamente questo utente?', async () => {
        try {
            showLoader();
            await db.collection('users').doc(email).delete();
            allowedUsers = allowedUsers.filter(u => u.email !== email);
            renderAdminUsers(); showToast('Utente rimosso', 'success');
        } catch(e) { showToast("Errore durante l'eliminazione", 'error'); } 
        finally { hideLoader(); }
    });
}

function renderAdminUsers() {
    let html = '';
    let sortedUsers = [...allowedUsers].sort((a, b) => {
        const roleWeight = { 'admin': 1, 'teacher': 2, 'student': 3 };
        if(roleWeight[a.role] !== roleWeight[b.role]) return roleWeight[a.role] - roleWeight[b.role];
        return a.name.localeCompare(b.name);
    });

    sortedUsers.forEach(u => {
        let rName = u.role === 'admin' ? 'Admin' : (u.role === 'teacher' ? 'Docente' : 'Studente');
        let badgeClass = u.role === 'admin' ? 'bg-red-50 text-red-600 border-red-200' : (u.role === 'teacher' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200');
        let trashBtn = u.role !== 'admin' ? `<button onclick="removeUser('${u.email}')" class="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition btn-touch"><i class="fas fa-trash-alt"></i></button>` : '<div class="w-8 h-8"></div>';

        html += `
            <div class="mobile-card flex justify-between items-center p-4">
                <div><p class="font-semibold text-slate-800 text-sm">${u.name}</p><p class="text-xs text-slate-500 mt-1 mb-2">${u.email}</p>
                <span class="inline-block border px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${badgeClass}">${rName}</span></div>
                ${trashBtn}
            </div>
        `;
    });
    document.getElementById('admin-users-list').innerHTML = html;
}

// ================= Docenti =================
window.switchTeacherTab = function(tab) {
    let tPub = document.getElementById('tab-t-publish'); let tTrk = document.getElementById('tab-t-track');
    let vPub = document.getElementById('teacher-publish-view'); let vTrk = document.getElementById('teacher-track-view');
    let activeClass = "flex-1 py-2 font-medium rounded-lg text-sm bg-white text-blue-600 shadow-sm transition-all";
    let inactiveClass = "flex-1 py-2 font-medium rounded-lg text-sm text-slate-500 transition-all bg-transparent";

    if(tab === 'publish') {
        tPub.className = activeClass; tTrk.className = inactiveClass;
        vPub.classList.remove('hidden-section'); vTrk.classList.add('hidden-section');
    } else {
        tTrk.className = activeClass; tPub.className = inactiveClass;
        vTrk.classList.remove('hidden-section'); vPub.classList.add('hidden-section');
        renderTeacherTracking();
    }
}

window.addHomework = async function() {
    let title = document.getElementById('hw-title').value; let date = document.getElementById('hw-date').value;
    let grade = document.getElementById('hw-grade').value; let subject = document.getElementById('hw-subject').value;
    let desc = document.getElementById('hw-desc').value;
    
    if(!title || !date || !grade || !subject) return showToast('Compila tutti i campi obbligatori.', 'error');

    let hwId = Date.now().toString();
    let dateObj = new Date(date);
    let formattedDate = dateObj.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

    let newHw = { 
        id: hwId, title, date: formattedDate, rawDate: date, grade, subject, desc, 
        authorName: currentUser.name, timestamp: new Date().getTime(), submissions: [] 
    };
    
    try {
        showLoader();
        await db.collection('homeworks').doc(hwId).set(newHw);
        homeworks.push(newHw);
        document.getElementById('hw-title').value = ''; document.getElementById('hw-desc').value = ''; document.getElementById('hw-date').value = '';
        showToast('Attività pubblicata correttamente!', 'success');
        switchTeacherTab('track');
    } catch(e) { showToast('Errore di pubblicazione.', 'error'); } 
    finally { hideLoader(); }
}

function renderTeacherTracking() {
    let html = '';
    let sortedHw = [...homeworks].sort((a, b) => b.timestamp - a.timestamp);

    if(sortedHw.length === 0) {
        document.getElementById('teacher-hw-list').innerHTML = `<div class="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200"><i class="fas fa-folder-open text-3xl text-slate-300 mb-2"></i><p class="text-sm text-slate-500 font-medium">Nessuna attività pubblicata.</p></div>`; return;
    }

    sortedHw.forEach(hw => {
        let subCount = hw.submissions ? hw.submissions.length : 0;
        let badgeClass = subCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500';
        html += `
            <div class="mobile-card border-l-4 border-l-blue-500 p-4">
                <div class="flex justify-between items-start mb-2"><h3 class="font-bold text-slate-800 text-sm truncate pr-2">${hw.title}</h3><span class="px-2 py-1 rounded text-[10px] font-bold shrink-0 ${badgeClass}">${subCount} Consegne</span></div>
                <div class="flex flex-wrap gap-2 mb-3">
                    <span class="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded"><i class="fas fa-users mr-1"></i>${hw.grade}</span>
                    <span class="text-[10px] font-medium bg-indigo-50 text-indigo-600 px-2 py-1 rounded"><i class="fas fa-book mr-1"></i>${hw.subject}</span>
                </div>
                <button onclick="openTeacherSheet('${hw.id}')" class="btn-touch w-full bg-blue-50 text-blue-700 border border-blue-100 font-medium py-2 rounded-lg text-sm hover:bg-blue-100 transition">Verifica Elaborati</button>
            </div>
        `;
    });
    document.getElementById('teacher-hw-list').innerHTML = html;
}

window.openTeacherSheet = function(id) {
    let hw = homeworks.find(h => h.id.toString() === id.toString()); if(!hw) return;
    let html = '';
    
    if(!hw.submissions || hw.submissions.length === 0) {
        html = `<div class="text-center py-10"><i class="far fa-clock text-4xl text-slate-200 mb-3"></i><p class="text-sm text-slate-500">Nessuno studente ha ancora consegnato.</p></div>`;
    } else {
        let sortedSubs = [...hw.submissions].reverse();
        sortedSubs.forEach(sub => {
            let viewBtn = '';
            if(sub.fileData) {
                let fileIcon = 'fa-file';
                if(sub.fileType === 'application/pdf') fileIcon = 'fa-file-pdf text-red-500';
                else if(sub.fileType.startsWith('image/')) fileIcon = 'fa-file-image text-blue-500';
                viewBtn = `<button onclick="viewFileInModal('${sub.fileData}', '${sub.fileType}', '${sub.fileName}')" class="mt-3 w-full bg-slate-50 text-slate-700 border border-slate-200 py-2 rounded-lg text-sm font-medium btn-touch hover:bg-slate-100 flex items-center justify-center gap-2"><i class="far ${fileIcon}"></i> Apri Allegato</button>`;
            } else if (sub.fileName) { viewBtn = `<div class="mt-3 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-600 flex items-center gap-2"><i class="fas fa-exclamation-triangle"></i> Allegato non supportato.</div>`; }

            let answerText = sub.text ? `<div class="bg-slate-50 p-3 rounded-lg border border-slate-100 mt-2"><p class="text-sm text-slate-700 whitespace-pre-wrap">${sub.text}</p></div>` : '';

            html += `
                <div class="bg-white border border-slate-200 p-4 rounded-xl shadow-sm mb-3">
                    <div class="flex justify-between items-center mb-1"><h4 class="font-bold text-sm text-slate-800"><i class="fas fa-user-circle text-slate-400 mr-1"></i> ${sub.name}</h4><span class="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">${sub.date}</span></div>
                    ${answerText} ${viewBtn}
                </div>
            `;
        });
    }
    document.getElementById('submissions-container').innerHTML = html;
    document.getElementById('teacher-view-sheet').classList.add('active');
}

window.viewFileInModal = function(dataUrl, fileType, fileName) {
    const viewer = document.getElementById('file-viewer-container'); viewer.innerHTML = '';
    
    if(fileType.startsWith('image/')) {
        viewer.innerHTML = `<img src="${dataUrl}" class="max-w-full max-h-full object-contain rounded-lg">`;
    } else if (fileType === 'application/pdf') {
        viewer.innerHTML = `<embed src="${dataUrl}" type="application/pdf" width="100%" height="100%" class="rounded-lg"><p class="text-xs text-center mt-2 text-slate-500 absolute bottom-4 w-full bg-white/90 p-2">Se non visualizzi il PDF, il browser del dispositivo potrebbe non supportarlo direttamente.</p>`;
    } else { return showToast("Tipo di file non supportato.", "error"); }
    document.getElementById('file-viewer-modal').classList.add('active');
}

// ================= Orario =================
window.addScheduleSlot = async function() {
    let day = document.getElementById('sch-day').value;
    let slot = document.getElementById('sch-slot').value;
    let subject = document.getElementById('sch-subject').value.trim();
    
    let key = `${day}-${slot}`;
    if(subject) scheduleData[key] = subject; else delete scheduleData[key];
    
    try {
        showLoader();
        await db.collection('settings').doc('schedule').set(scheduleData);
        drawSchedule('manage-schedule-container'); document.getElementById('sch-subject').value = '';
        showToast('Orario aggiornato.', 'success');
    } catch(e) { showToast('Errore di salvataggio.', 'error'); } 
    finally { hideLoader(); }
}

window.clearSchedule = function() {
    customConfirm('Vuoi svuotare interamente l\'orario scolastico?', async () => {
        try {
            showLoader(); await db.collection('settings').doc('schedule').set({});
            scheduleData = {}; drawSchedule('manage-schedule-container'); showToast('Orario resettato.', 'success');
        } catch(e) { showToast('Errore di connessione', 'error'); } 
        finally { hideLoader(); }
    });
}

function drawSchedule(containerId) {
    let html = `<div class="schedule-wrapper"><table class="schedule-table"><thead><tr><th class="w-24 bg-slate-50 border-r border-slate-200">Giorno</th><th>1ª Ora</th><th>2ª Ora</th><th>3ª Ora</th><th>4ª Ora</th><th>5ª Ora</th><th>6ª Ora</th></tr></thead><tbody>`;
    days.forEach(day => {
        html += `<tr><td class="font-bold text-slate-700 bg-slate-50 border-r border-slate-200 text-xs uppercase tracking-wide">${day.substring(0,3)}</td>`;
        slots.forEach(slot => {
            let sub = scheduleData[`${day}-${slot}`] || '';
            let cellClass = sub ? 'filled border-blue-100' : 'text-slate-300';
            html += `<td class="schedule-cell ${cellClass}"><div class="line-clamp-2">${sub || '-'}</div></td>`;
        });
        html += `</tr>`;
    });
    html += `</tbody></table></div>`;
    const container = document.getElementById(containerId); if(container) container.innerHTML = html;
}

// ================= Studenti =================
window.switchStudentTab = function(tab) {
    let tHw = document.getElementById('tab-hw'); let tSch = document.getElementById('tab-sch');
    let vHw = document.getElementById('student-hw-list'); let vSch = document.getElementById('student-schedule-view');
    let activeClass = "flex-1 py-2 font-medium rounded-lg text-sm bg-white text-blue-600 shadow-sm transition-all";
    let inactiveClass = "flex-1 py-2 font-medium rounded-lg text-sm text-slate-500 transition-all bg-transparent";

    if(tab === 'hw') {
        tHw.className = activeClass; tSch.className = inactiveClass;
        vHw.classList.remove('hidden-section'); vSch.classList.add('hidden-section');
    } else {
        tSch.className = activeClass; tHw.className = inactiveClass;
        vSch.classList.remove('hidden-section'); vHw.classList.add('hidden-section');
    }
}

function renderStudentHomeworks() {
    let html = '';
    let sortedHw = [...homeworks].sort((a, b) => b.timestamp - a.timestamp);

    if(sortedHw.length === 0) {
        document.getElementById('student-hw-list').innerHTML = `<div class="text-center py-12 px-4"><div class="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4"><i class="fas fa-check text-4xl text-emerald-400"></i></div><h3 class="text-lg font-bold text-slate-800 mb-1">Tutto completato!</h3><p class="text-sm text-slate-500">Non ci sono compiti assegnati al momento.</p></div>`; return;
    }

    sortedHw.forEach(hw => {
        let hasSubmitted = hw.submissions && hw.submissions.some(s => s.email === currentUser.email);
        let statusUI = hasSubmitted ? 
            `<div class="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-center gap-2 text-emerald-700"><i class="fas fa-check-circle text-lg"></i><span class="text-sm font-semibold">Consegnato</span></div>` : 
            `<button onclick="openStudentSheet('${hw.id}')" class="btn-touch w-full mt-4 bg-blue-600 text-white font-medium py-3 rounded-xl shadow-sm hover:bg-blue-700 flex items-center justify-center gap-2"><i class="fas fa-file-upload"></i> Svolgi Compito</button>`;
        
        let borderClass = hasSubmitted ? 'border-l-4 border-l-emerald-500 opacity-80' : 'border-l-4 border-l-blue-500 shadow-md';

        html += `
            <div class="mobile-card ${borderClass} p-5 relative overflow-hidden">
                ${hasSubmitted ? '<div class="absolute -right-6 -top-6 text-emerald-100/50"><i class="fas fa-check-circle text-6xl"></i></div>' : ''}
                <div class="relative z-10">
                    <div class="flex justify-between items-start mb-3"><h3 class="font-bold text-lg text-slate-800 leading-tight pr-2">${hw.title}</h3><span class="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold shrink-0">${hw.grade}</span></div>
                    <div class="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md mb-3"><i class="fas fa-book text-[10px]"></i><span class="text-xs font-semibold">${hw.subject}</span></div>
                    <div class="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-3"><p class="text-sm text-slate-600 whitespace-pre-wrap">${hw.desc}</p></div>
                    <div class="flex items-center gap-1.5 text-xs font-semibold text-red-500 bg-red-50 inline-block px-2 py-1 rounded"><i class="far fa-calendar-times"></i> Scadenza: ${hw.date}</div>
                    ${statusUI}
                </div>
            </div>
        `;
    });
    document.getElementById('student-hw-list').innerHTML = html;
}

window.openStudentSheet = function(id) {
    let hw = homeworks.find(h => h.id.toString() === id.toString()); if(!hw) return;
    activeHwId = hw.id; document.getElementById('sheet-hw-title').innerText = hw.title;
    document.getElementById('submit-text').value = ''; document.getElementById('submit-file').value = '';
    
    let display = document.getElementById('file-name-display'); display.innerText = 'Tocca per selezionare un file';
    display.classList.remove('text-emerald-600'); display.classList.add('text-blue-600');
    document.getElementById('submit-sheet').classList.add('active');
}

window.closeSheet = function(sheetId) { document.getElementById(sheetId).classList.remove('active'); if(sheetId === 'submit-sheet') activeHwId = null; }

window.updateFileName = function(input) {
    let display = document.getElementById('file-name-display');
    if(input.files && input.files.length > 0) {
        let file = input.files[0];
        if(file.size > 1048576) {
            showToast("File troppo grande! Il limite è di 1MB.", "error"); input.value = '';
            display.innerText = 'Tocca per selezionare un file'; display.classList.remove('text-emerald-600'); display.classList.add('text-blue-600'); return;
        }
        display.innerText = file.name; display.classList.remove('text-blue-600'); display.classList.add('text-emerald-600');
    } else {
        display.innerText = 'Tocca per selezionare un file'; display.classList.remove('text-emerald-600'); display.classList.add('text-blue-600');
    }
}

window.confirmSubmission = async function() {
    let text = document.getElementById('submit-text').value.trim();
    let fileInput = document.getElementById('submit-file'); let file = fileInput.files[0];
    
    if(!text && !file) return showToast('Devi scrivere una risposta o allegare un file.', 'error');

    let idx = homeworks.findIndex(h => h.id === activeHwId); if(idx === -1) return;
    let hw = homeworks[idx];
    
    let btn = document.getElementById('confirm-submit-btn'); let originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Invio in corso...'; btn.disabled = true; btn.classList.add('opacity-75');

    const saveToDb = async (fileBase64 = null, fileType = null, fileName = null) => {
        let submissionDate = new Date().toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        let newSub = { email: currentUser.email, name: currentUser.name, text: text, fileName: fileName, fileType: fileType, fileData: fileBase64, date: submissionDate };

        if(!hw.submissions) hw.submissions = [];
        let updatedSubmissions = [...hw.submissions, newSub];

        try {
            await db.collection('homeworks').doc(hw.id.toString()).update({ submissions: updatedSubmissions });
            hw.submissions = updatedSubmissions; closeSheet('submit-sheet');
            setTimeout(() => { renderStudentHomeworks(); showToast('Ottimo lavoro! Consegna inviata.', 'success'); }, 400);
        } catch (error) { showToast('Errore di rete durante l\'invio.', 'error'); } 
        finally { btn.innerHTML = originalText; btn.disabled = false; btn.classList.remove('opacity-75'); }
    };

    if (file) {
        let reader = new FileReader();
        reader.onload = function(e) { saveToDb(e.target.result, file.type, file.name); };
        reader.onerror = function() { showToast("Errore durante la lettura del file.", "error"); btn.innerHTML = originalText; btn.disabled = false; btn.classList.remove('opacity-75'); };
        reader.readAsDataURL(file);
    } else { saveToDb(null, null, null); }
}

document.querySelectorAll('.bottom-sheet-overlay').forEach(sheet => { sheet.addEventListener('click', function(e) { if (e.target === this) closeSheet(this.id); }); });
