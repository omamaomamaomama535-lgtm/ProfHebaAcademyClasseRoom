// ======================= إعدادات السيرفر السحابي (Firebase) =======================
// ضع كودك الحقيقي هنا
const firebaseConfig = {
    apiKey: "AIzaSyBGOLQSvAEIKK380Zo2bpQtY6n0pSruFMg",
    authDomain: "profhebaacademyclasseroo-d1d49.firebaseapp.com",
    projectId: "profhebaacademyclasseroo-d1d49",
    storageBucket: "profhebaacademyclasseroo-d1d49.firebasestorage.app",
    messagingSenderId: "28002405171",
    appId: "1:28002405171:web:2136b2334812f73d810c46",
    measurementId: "G-TK9J9L2THQ"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();

// ================= بيانات التهيئة واللغة =================
let homeworks = [];
let scheduleData = {};
let allowedUsers = [];
let currentUser = null;
let activeHwId = null;

let currentLang = localStorage.getItem('appLang') || 'it';
let isDarkMode = localStorage.getItem('appTheme') === 'dark';

// القاموس (عربي - إيطالي)
const i18n = {
    it: {
        app_title: "Accademia del Successo", portal_desc: "Portale Ufficiale di Accesso",
        loading: "Caricamento in corso...", confirm_msg: "Sei sicuro?",
        cancel: "Annulla", confirm: "Conferma", admin_area: "Gestione Utenze",
        new_user: "Nuovo Utente", name_label: "Nome e Cognome", email_label: "Indirizzo Email",
        role_label: "Ruolo", role_student: "Studente", role_teacher: "Docente", role_admin: "Amministratore",
        btn_register: "Registra Utente", reg_users: "Utenti Registrati", tab_assign: "Assegna Compito",
        tab_track: "Consegne", task_title: "Titolo dell'Attività", deadline: "Data di Scadenza",
        class_label: "Classe", subject_label: "Materia", instructions: "Istruzioni",
        btn_publish: "Pubblica Attività", day_label: "Giorno", hour_label: "Ora",
        subj_class: "Materia e Classe", btn_save: "Salva Modifica", schedule_title: "Orario delle Lezioni",
        current_schedule: "Orario Attuale", tab_assigned: "Attività Assegnate", tab_schedule: "Orario Lezioni",
        submit_task: "Svolgi Compito", submitted: "Consegnato", text_note: "Testo / Note:",
        attach_file: "Allega File:", btn_send: "Invia Consegna", teacher_view_subs: "Elaborati Ricevuti",
        no_subs: "Nessuno studente ha ancora consegnato.", open_attachment: "Apri Allegato",
        no_tasks: "Nessuna attività pubblicata.", file_viewer: "Visualizzatore", close: "Chiudi",
        tap_file: "Tocca per selezionare un file", nav_admin: "Utenze", nav_hw: "Attività", nav_sch: "Orario", nav_home: "Home"
    },
    ar: {
        app_title: "أكاديمية النجاح", portal_desc: "بوابة الدخول الرسمية",
        loading: "جاري الاتصال...", confirm_msg: "هل أنت متأكد؟",
        cancel: "إلغاء", confirm: "تأكيد", admin_area: "إدارة النظام",
        new_user: "تسجيل مستخدم", name_label: "الاسم الكامل", email_label: "البريد الإلكتروني",
        role_label: "الصلاحية", role_student: "طالب", role_teacher: "معلم", role_admin: "مدير",
        btn_register: "حفظ البيانات", reg_users: "المستخدمون المسجلون", tab_assign: "نشر واجب",
        tab_track: "التسليمات", task_title: "عنوان المهمة", deadline: "تاريخ التسليم",
        class_label: "الصف", subject_label: "المادة", instructions: "التعليمات",
        btn_publish: "نشر الآن", day_label: "اليوم", hour_label: "الحصة",
        subj_class: "المادة والصف", btn_save: "تثبيت", schedule_title: "الجدول المدرسي",
        current_schedule: "الجدول الحالي", tab_assigned: "الواجبات المطلوبة", tab_schedule: "الجدول",
        submit_task: "تسليم الواجب", submitted: "تم التسليم", text_note: "نص أو ملاحظات:",
        attach_file: "إرفاق ملف:", btn_send: "تأكيد الرفع", teacher_view_subs: "إجابات الطلاب",
        no_subs: "لم يقم أي طالب بالتسليم.", open_attachment: "فتح المرفق",
        no_tasks: "لا توجد واجبات حالياً.", file_viewer: "عارض الملفات", close: "إغلاق",
        tap_file: "اضغط لاختيار ملف", nav_admin: "الإدارة", nav_hw: "الواجبات", nav_sch: "الجدول", nav_home: "الرئيسية"
    }
};

const schoolData = {
    it: {
        subjects: ["Italiano", "Matematica", "Storia", "Geografia", "Inglese", "Scienze", "Arte e Immagine", "Tecnologia", "Musica", "Educazione Fisica", "Religione", "Fisica", "Chimica", "Informatica", "Altro"],
        grades: { "Scuola Primaria": ["1ª Primaria", "2ª Primaria", "3ª Primaria", "4ª Primaria", "5ª Primaria"], "Scuola Media": ["1ª Media", "2ª Media", "3ª Media"], "Scuola Superiore": ["1ª Superiore", "2ª Superiore", "3ª Superiore", "4ª Superiore", "5ª Superiore"] },
        days: ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"],
        slots: ["1ª Ora", "2ª Ora", "3ª Ora", "4ª Ora", "5ª Ora", "6ª Ora"]
    },
    ar: {
        subjects: ["اللغة الإيطالية", "الرياضيات", "التاريخ", "الجغرافيا", "اللغة الإنجليزية", "العلوم", "الفنون", "التكنولوجيا", "الموسيقى", "التربية البدنية", "الدين", "الفيزياء", "الكيمياء", "معلوماتية", "أخرى"],
        grades: { "الابتدائية": ["الأول الابتدائي", "الثاني الابتدائي", "الثالث الابتدائي", "الرابع الابتدائي", "الخامس الابتدائي"], "المتوسطة": ["الأول المتوسط", "الثاني المتوسط", "الثالث المتوسط"], "الثانوية": ["الأول الثانوي", "الثاني الثانوي", "الثالث الثانوي", "الرابع الثانوي", "الخامس الثانوي"] },
        days: ["الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
        slots: ["الحصة 1", "الحصة 2", "الحصة 3", "الحصة 4", "الحصة 5", "الحصة 6"]
    }
};

function t(key) { return i18n[currentLang][key] || key; }

// ================= تهيئة الواجهة =================
document.addEventListener('DOMContentLoaded', () => {
    applyTheme(isDarkMode);
    applyLanguage(currentLang);
    document.getElementById('login-screen').classList.remove('hidden-section');
});

window.toggleTheme = function() {
    isDarkMode = !isDarkMode;
    localStorage.setItem('appTheme', isDarkMode ? 'dark' : 'light');
    applyTheme(isDarkMode);
}

function applyTheme(dark) {
    const root = document.getElementById('html-root');
    if (dark) root.classList.add('dark-mode'); else root.classList.remove('dark-mode');
    
    const iconClass = dark ? 'fas fa-sun' : 'fas fa-moon';
    document.getElementById('theme-icon').className = iconClass;
    if(document.getElementById('header-theme-icon')) document.getElementById('header-theme-icon').className = iconClass;
}

window.toggleLang = function() {
    currentLang = currentLang === 'it' ? 'ar' : 'it';
    localStorage.setItem('appLang', currentLang);
    applyLanguage(currentLang);
}

function applyLanguage(lang) {
    const root = document.getElementById('html-root');
    root.lang = lang; root.dir = lang === 'ar' ? 'rtl' : 'ltr';
    
    const langBtnText = lang === 'it' ? 'AR' : 'IT';
    document.getElementById('lang-icon').innerText = langBtnText;
    if(document.getElementById('header-lang-icon')) document.getElementById('header-lang-icon').innerText = langBtnText;

    // تحديث النصوص الثابتة
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.innerText = t(el.getAttribute('data-i18n'));
    });

    // تحديث القوائم المنسدلة للمواد والأيام (Selects)
    populateDropdowns();

    // إعادة رسم البيانات إذا كان المستخدم مسجل دخول
    if(currentUser) {
        let roleLabel = currentUser.role === 'admin' ? t('role_admin') : (currentUser.role === 'teacher' ? t('role_teacher') : t('role_student'));
        document.getElementById('user-role-badge').innerText = roleLabel;
        buildBottomNav();
        if(currentUser.role === 'admin') renderAdminUsers();
        if(currentUser.role === 'teacher') renderTeacherTracking();
        if(currentUser.role === 'student') renderStudentHomeworks();
        drawSchedule('manage-schedule-container'); drawSchedule('display-schedule-container');
    }
}

function populateDropdowns() {
    const data = schoolData[currentLang];
    
    // الأيام
    let dayHtml = ''; data.days.forEach((d, i) => dayHtml += `<option value="${i}">${d}</option>`);
    if(document.getElementById('sch-day')) document.getElementById('sch-day').innerHTML = dayHtml;

    // الحصص
    let slotHtml = ''; data.slots.forEach((s, i) => slotHtml += `<option value="${i}">${s}</option>`);
    if(document.getElementById('sch-slot')) document.getElementById('sch-slot').innerHTML = slotHtml;

    // المواد
    let subjHtml = `<option value="">- ${t('subject_label')} -</option>`; 
    data.subjects.forEach(s => subjHtml += `<option value="${s}">${s}</option>`);
    if(document.getElementById('hw-subject')) document.getElementById('hw-subject').innerHTML = subjHtml;

    // الفصول (Grades)
    let gradeHtml = `<option value="">- ${t('class_label')} -</option>`;
    for (const [group, grades] of Object.entries(data.grades)) {
        gradeHtml += `<optgroup label="${group}">`;
        grades.forEach(g => gradeHtml += `<option value="${g}">${g}</option>`);
        gradeHtml += `</optgroup>`;
    }
    if(document.getElementById('hw-grade')) document.getElementById('hw-grade').innerHTML = gradeHtml;
}

// ================= النوافذ والإشعارات =================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    let icon = type === 'success' ? '<i class="fas fa-check-circle text-emerald-500 text-lg"></i>' : (type === 'error' ? '<i class="fas fa-exclamation-circle text-red-500 text-lg"></i>' : '<i class="fas fa-info-circle text-blue-500 text-lg"></i>');
    toast.className = `custom-toast ${type}`; toast.innerHTML = `${icon} <span class="font-medium text-sm">${message}</span>`;
    container.appendChild(toast); setTimeout(() => { if(toast.parentElement) toast.remove(); }, 3000);
}

function showLoader() { document.getElementById('loader-overlay').classList.remove('hidden-section'); }
function hideLoader() { document.getElementById('loader-overlay').classList.add('hidden-section'); }

// ================= الاتصال بقاعدة البيانات =================
async function fetchServerData() {
    try {
        const usersSnap = await db.collection('users').get(); allowedUsers = usersSnap.docs.map(doc => doc.data());
        const hwSnap = await db.collection('homeworks').get(); homeworks = hwSnap.docs.map(doc => doc.data());
        const schDoc = await db.collection('settings').doc('schedule').get(); if (schDoc.exists) scheduleData = schDoc.data();
        return true;
    } catch (error) { showToast("Errore di connessione al server.", "error"); return false; }
}

function parseJwt(token) {
    var base64Url = token.split('.')[1]; var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(window.atob(base64).split('').map(function(c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join('')));
}

window.handleGoogleLogin = async function(response) {
    showLoader();
    const payload = parseJwt(response.credential);
    const email = payload.email.toLowerCase(); const name = payload.name;
    let success = await fetchServerData(); hideLoader(); if(!success) return;

    if (allowedUsers.length === 0) {
        showToast("Benvenuto Admin!", "success");
        let newAdmin = { email, name, role: 'admin' }; allowedUsers.push(newAdmin);
        try { await db.collection('users').doc(email).set(newAdmin); loginAs('admin', name, email); } catch(e) {} return;
    }

    const user = allowedUsers.find(u => u.email === email);
    if (user) loginAs(user.role, user.name || name, email);
    else showToast("Accesso negato.", "error");
}

function loginAs(role, name, email) {
    currentUser = { role, name, email };
    document.getElementById('login-screen').classList.add('hidden-section');
    document.getElementById('main-dashboard').classList.remove('hidden-section');
    document.getElementById('user-name-display').innerText = name;
    
    let roleLabel = role === 'admin' ? t('role_admin') : (role === 'teacher' ? t('role_teacher') : t('role_student'));
    document.getElementById('user-role-badge').innerText = roleLabel;

    buildBottomNav();
    if(role === 'admin') navigateTo('view-admin', 'nav-admin');
    else if(role === 'teacher') navigateTo('view-homework-manage', 'nav-hw');
    else navigateTo('view-student', 'nav-student');
}

window.logout = function() { currentUser = null; document.getElementById('main-dashboard').classList.add('hidden-section'); document.getElementById('login-screen').classList.remove('hidden-section'); }

function buildBottomNav() {
    const nav = document.getElementById('bottom-nav'); nav.innerHTML = '';
    const createItem = (id, icon, text, target) => `<div class="nav-item btn-touch" id="${id}" onclick="navigateTo('${target}', '${id}')"><i class='fas ${icon}'></i><span>${text}</span></div>`;

    if(currentUser.role === 'admin') nav.innerHTML += createItem('nav-admin', 'fa-users-cog', t('nav_admin'), 'view-admin');
    if(currentUser.role === 'admin' || currentUser.role === 'teacher') {
        nav.innerHTML += createItem('nav-hw', 'fa-book', t('nav_hw'), 'view-homework-manage');
        nav.innerHTML += createItem('nav-sch', 'fa-calendar-alt', t('nav_sch'), 'view-schedule-manage');
    }
    if(currentUser.role === 'student') nav.innerHTML += createItem('nav-student', 'fa-home', t('nav_home'), 'view-student');
}

window.navigateTo = function(viewId, navId) {
    ['view-admin', 'view-homework-manage', 'view-schedule-manage', 'view-student'].forEach(id => document.getElementById(id).classList.add('hidden-section'));
    document.getElementById(viewId).classList.remove('hidden-section');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if(document.getElementById(navId)) document.getElementById(navId).classList.add('active');

    if(viewId === 'view-admin') renderAdminUsers();
    if(viewId === 'view-schedule-manage') drawSchedule('manage-schedule-container');
    if(viewId === 'view-homework-manage') switchTeacherTab('publish');
    if(viewId === 'view-student') { renderStudentHomeworks(); drawSchedule('display-schedule-container'); switchStudentTab('hw'); }
    window.scrollTo(0,0);
}

// ================= الإدارة =================
window.addUser = async function() {
    let name = document.getElementById('add-user-name').value; let email = document.getElementById('add-user-email').value.trim().toLowerCase(); let role = document.getElementById('add-user-role').value;
    if(!name || !email) return;
    let newUser = { email, name, role };
    try { showLoader(); await db.collection('users').doc(email).set(newUser); allowedUsers.push(newUser); document.getElementById('add-user-name').value = ''; document.getElementById('add-user-email').value = ''; renderAdminUsers(); showToast('Success', 'success'); } catch (error) {} finally { hideLoader(); }
}

window.removeUser = async function(email) {
    if(confirm(t('confirm_msg'))) {
        try { showLoader(); await db.collection('users').doc(email).delete(); allowedUsers = allowedUsers.filter(u => u.email !== email); renderAdminUsers(); } catch(e) {} finally { hideLoader(); }
    }
}

function renderAdminUsers() {
    let html = '';
    allowedUsers.forEach(u => {
        let rName = u.role === 'admin' ? t('role_admin') : (u.role === 'teacher' ? t('role_teacher') : t('role_student'));
        let badgeClass = u.role === 'admin' ? 'bg-red-50 text-red-600 border-red-200' : (u.role === 'teacher' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200');
        let trashBtn = u.role !== 'admin' ? `<button onclick="removeUser('${u.email}')" class="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center btn-touch"><i class="fas fa-trash-alt"></i></button>` : '';

        html += `<div class="mobile-card flex justify-between items-center p-4"><div><p class="font-semibold text-sm">${u.name}</p><p class="text-xs mt-1 mb-2" style="color:var(--text-muted)">${u.email}</p><span class="inline-block border px-2 py-0.5 rounded text-[10px] font-bold uppercase ${badgeClass}">${rName}</span></div>${trashBtn}</div>`;
    });
    document.getElementById('admin-users-list').innerHTML = html;
}

// ================= المعلم =================
window.switchTeacherTab = function(tab) {
    let tPub = document.getElementById('tab-t-publish'); let tTrk = document.getElementById('tab-t-track');
    let vPub = document.getElementById('teacher-publish-view'); let vTrk = document.getElementById('teacher-track-view');
    let activeCls = "flex-1 py-2 font-medium rounded-lg text-sm shadow-sm transition-all text-blue-600";
    let inactiveCls = "flex-1 py-2 font-medium rounded-lg text-sm transition-all bg-transparent";

    if(tab === 'publish') { tPub.className = activeCls; tPub.style.background = 'var(--surface)'; tTrk.className = inactiveCls; tTrk.style.color = 'var(--text-muted)'; vPub.classList.remove('hidden-section'); vTrk.classList.add('hidden-section'); } 
    else { tTrk.className = activeCls; tTrk.style.background = 'var(--surface)'; tPub.className = inactiveCls; tPub.style.color = 'var(--text-muted)'; vTrk.classList.remove('hidden-section'); vPub.classList.add('hidden-section'); renderTeacherTracking(); }
}

window.addHomework = async function() {
    let title = document.getElementById('hw-title').value; let date = document.getElementById('hw-date').value;
    let grade = document.getElementById('hw-grade').value; let subject = document.getElementById('hw-subject').value;
    let desc = document.getElementById('hw-desc').value;
    if(!title || !date || !grade || !subject) return showToast('Error', 'error');

    let hwId = Date.now().toString();
    let dateObj = new Date(date); let formattedDate = dateObj.toLocaleDateString(currentLang === 'it' ? 'it-IT' : 'ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' });
    let newHw = { id: hwId, title, date: formattedDate, rawDate: date, grade, subject, desc, authorName: currentUser.name, timestamp: new Date().getTime(), submissions: [] };
    
    try { showLoader(); await db.collection('homeworks').doc(hwId).set(newHw); homeworks.push(newHw); document.getElementById('hw-title').value = ''; document.getElementById('hw-desc').value = ''; showToast('Success', 'success'); switchTeacherTab('track'); } catch(e) {} finally { hideLoader(); }
}

function renderTeacherTracking() {
    let html = ''; let sortedHw = [...homeworks].sort((a, b) => b.timestamp - a.timestamp);
    if(sortedHw.length === 0) { document.getElementById('teacher-hw-list').innerHTML = `<div class="text-center py-10"><p>${t('no_tasks')}</p></div>`; return; }

    sortedHw.forEach(hw => {
        let subCount = hw.submissions ? hw.submissions.length : 0;
        let badgeClass = subCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500';
        html += `<div class="mobile-card border-l-4 border-l-blue-500 p-4"><div class="flex justify-between items-start mb-2"><h3 class="font-bold text-sm truncate pr-2">${hw.title}</h3><span class="px-2 py-1 rounded text-[10px] font-bold ${badgeClass}">${subCount}</span></div><div class="flex flex-wrap gap-2 mb-3"><span class="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-700"><i class="fas fa-users mr-1"></i>${hw.grade}</span><span class="text-[10px] bg-indigo-50 px-2 py-1 rounded text-indigo-700"><i class="fas fa-book mr-1"></i>${hw.subject}</span></div><button onclick="openTeacherSheet('${hw.id}')" class="btn-touch w-full py-2 rounded-lg text-sm font-medium border" style="color:var(--primary); border-color:var(--primary);">${t('teacher_view_subs')}</button></div>`;
    });
    document.getElementById('teacher-hw-list').innerHTML = html;
}

window.openTeacherSheet = function(id) {
    let hw = homeworks.find(h => h.id.toString() === id.toString()); if(!hw) return;
    let html = '';
    if(!hw.submissions || hw.submissions.length === 0) { html = `<div class="text-center py-10"><p>${t('no_subs')}</p></div>`; } 
    else {
        [...hw.submissions].reverse().forEach(sub => {
            let viewBtn = '';
            if(sub.fileData) { viewBtn = `<button onclick="viewFileInModal('${sub.fileData}', '${sub.fileType}', '${sub.fileName}')" class="mt-3 w-full py-2 rounded-lg text-sm btn-touch border" style="color:var(--primary);border-color:var(--border-color)"><i class="far fa-file"></i> ${t('open_attachment')}</button>`; } 
            let answerText = sub.text ? `<div class="p-3 rounded-lg border mt-2" style="background:var(--input-bg);border-color:var(--border-color);"><p class="text-sm">${sub.text}</p></div>` : '';
            html += `<div class="border p-4 rounded-xl mb-3" style="border-color:var(--border-color);"><div class="flex justify-between items-center mb-1"><h4 class="font-bold text-sm"><i class="fas fa-user-circle mr-1"></i> ${sub.name}</h4><span class="text-[10px] px-2 py-0.5 rounded" style="background:var(--input-bg);">${sub.date}</span></div>${answerText} ${viewBtn}</div>`;
        });
    }
    document.getElementById('submissions-container').innerHTML = html; document.getElementById('teacher-view-sheet').classList.add('active');
}

window.viewFileInModal = function(dataUrl, fileType, fileName) {
    const viewer = document.getElementById('file-viewer-container'); viewer.innerHTML = '';
    if(fileType.startsWith('image/')) { viewer.innerHTML = `<img src="${dataUrl}" class="max-w-full max-h-full object-contain rounded-lg">`; } 
    else if (fileType === 'application/pdf') { viewer.innerHTML = `<embed src="${dataUrl}" type="application/pdf" width="100%" height="100%" class="rounded-lg">`; } 
    document.getElementById('file-viewer-modal').classList.add('active');
}

// ================= الجدول =================
window.addScheduleSlot = async function() {
    let dayIdx = document.getElementById('sch-day').value; let slotIdx = document.getElementById('sch-slot').value;
    let subject = document.getElementById('sch-subject').value.trim();
    let key = `${dayIdx}-${slotIdx}`;
    if(subject) scheduleData[key] = subject; else delete scheduleData[key];
    try { showLoader(); await db.collection('settings').doc('schedule').set(scheduleData); drawSchedule('manage-schedule-container'); document.getElementById('sch-subject').value = ''; showToast('Success', 'success'); } catch(e) {} finally { hideLoader(); }
}

window.clearSchedule = function() {
    if(confirm(t('confirm_msg'))) { showLoader(); db.collection('settings').doc('schedule').set({}).then(()=>{ scheduleData = {}; drawSchedule('manage-schedule-container'); hideLoader(); }); }
}

function drawSchedule(containerId) {
    let data = schoolData[currentLang];
    let html = `<div class="schedule-wrapper"><table class="schedule-table"><thead><tr><th class="w-24 border-r border-slate-200">${t('day_label')}</th>`;
    data.slots.forEach(s => html += `<th>${s}</th>`); html += `</tr></thead><tbody>`;
    
    data.days.forEach((dayStr, dayIdx) => {
        html += `<tr><td class="font-bold text-xs uppercase border-r border-slate-200" style="background:var(--input-bg);">${dayStr.substring(0,3)}</td>`;
        data.slots.forEach((slotStr, slotIdx) => {
            let sub = scheduleData[`${dayIdx}-${slotIdx}`] || '';
            let cellClass = sub ? 'filled' : '';
            html += `<td class="schedule-cell ${cellClass}"><div class="line-clamp-2">${sub || '-'}</div></td>`;
        });
        html += `</tr>`;
    });
    html += `</tbody></table></div>`;
    const container = document.getElementById(containerId); if(container) container.innerHTML = html;
}

// ================= الطالب =================
window.switchStudentTab = function(tab) {
    let tHw = document.getElementById('tab-hw'); let tSch = document.getElementById('tab-sch');
    let vHw = document.getElementById('student-hw-list'); let vSch = document.getElementById('student-schedule-view');
    let activeCls = "flex-1 py-2 font-medium rounded-lg text-sm shadow-sm transition-all text-blue-600";
    let inactiveCls = "flex-1 py-2 font-medium rounded-lg text-sm transition-all bg-transparent";

    if(tab === 'hw') { tHw.className = activeCls; tHw.style.background = 'var(--surface)'; tSch.className = inactiveCls; tSch.style.color = 'var(--text-muted)'; vHw.classList.remove('hidden-section'); vSch.classList.add('hidden-section'); } 
    else { tSch.className = activeCls; tSch.style.background = 'var(--surface)'; tHw.className = inactiveCls; tHw.style.color = 'var(--text-muted)'; vSch.classList.remove('hidden-section'); vHw.classList.add('hidden-section'); }
}

function renderStudentHomeworks() {
    let html = ''; let sortedHw = [...homeworks].sort((a, b) => b.timestamp - a.timestamp);
    if(sortedHw.length === 0) { document.getElementById('student-hw-list').innerHTML = `<div class="text-center py-12"><p>${t('no_tasks')}</p></div>`; return; }

    sortedHw.forEach(hw => {
        let hasSub = hw.submissions && hw.submissions.some(s => s.email === currentUser.email);
        let statusUI = hasSub ? `<div class="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex justify-center text-emerald-700"><i class="fas fa-check-circle"></i> <span class="ml-2 mr-2 font-semibold">${t('submitted')}</span></div>` : `<button onclick="openStudentSheet('${hw.id}')" class="btn-touch w-full mt-4 bg-blue-600 text-white font-medium py-3 rounded-xl shadow-sm"><i class="fas fa-file-upload"></i> ${t('submit_task')}</button>`;
        let borderClass = hasSub ? 'border-l-4 border-emerald-500' : 'border-l-4 border-blue-500';

        html += `
            <div class="mobile-card ${borderClass} p-5 relative overflow-hidden">
                <div class="flex justify-between items-start mb-3"><h3 class="font-bold text-lg leading-tight">${hw.title}</h3><span class="px-2 py-1 rounded text-[10px] font-bold" style="background:var(--input-bg);">${hw.grade}</span></div>
                <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md mb-3" style="background:var(--nav-active-bg); color:var(--primary);"><i class="fas fa-book text-[10px]"></i><span class="text-xs font-semibold">${hw.subject}</span></div>
                <div class="p-3 rounded-lg border mb-3" style="background:var(--input-bg); border-color:var(--border-color);"><p class="text-sm whitespace-pre-wrap">${hw.desc}</p></div>
                <div class="flex items-center gap-1.5 text-xs font-semibold text-red-500"><i class="far fa-calendar-times"></i> ${t('deadline')}: ${hw.date}</div>
                ${statusUI}
            </div>
        `;
    });
    document.getElementById('student-hw-list').innerHTML = html;
}

window.openStudentSheet = function(id) {
    let hw = homeworks.find(h => h.id.toString() === id.toString()); if(!hw) return;
    activeHwId = hw.id; document.getElementById('sheet-hw-title').innerText = hw.title;
    document.getElementById('submit-text').value = ''; document.getElementById('submit-file').value = '';
    let display = document.getElementById('file-name-display'); display.innerText = t('tap_file');
    document.getElementById('submit-sheet').classList.add('active');
}

window.closeSheet = function(sheetId) { document.getElementById(sheetId).classList.remove('active'); if(sheetId === 'submit-sheet') activeHwId = null; }

window.updateFileName = function(input) {
    let display = document.getElementById('file-name-display');
    if(input.files && input.files.length > 0) {
        if(input.files[0].size > 1048576) { showToast("File > 1MB.", "error"); input.value = ''; display.innerText = t('tap_file'); return; }
        display.innerText = input.files[0].name; display.style.color = "var(--secondary)";
    } else { display.innerText = t('tap_file'); display.style.color = "var(--primary)"; }
}

window.confirmSubmission = async function() {
    let text = document.getElementById('submit-text').value.trim(); let fileInput = document.getElementById('submit-file'); let file = fileInput.files[0];
    if(!text && !file) return;

    let idx = homeworks.findIndex(h => h.id === activeHwId); if(idx === -1) return; let hw = homeworks[idx];
    let btn = document.getElementById('confirm-submit-btn'); let originalText = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>...'; btn.disabled = true;

    const saveToDb = async (fileBase64 = null, fileType = null, fileName = null) => {
        let submissionDate = new Date().toLocaleString(currentLang === 'it' ? 'it-IT' : 'ar-EG');
        let newSub = { email: currentUser.email, name: currentUser.name, text: text, fileName: fileName, fileType: fileType, fileData: fileBase64, date: submissionDate };
        if(!hw.submissions) hw.submissions = []; let updatedSubmissions = [...hw.submissions, newSub];

        try { await db.collection('homeworks').doc(hw.id.toString()).update({ submissions: updatedSubmissions }); hw.submissions = updatedSubmissions; closeSheet('submit-sheet'); setTimeout(() => { renderStudentHomeworks(); showToast('Success', 'success'); }, 400); } 
        catch (error) {} finally { btn.innerHTML = originalText; btn.disabled = false; }
    };

    if (file) { let reader = new FileReader(); reader.onload = function(e) { saveToDb(e.target.result, file.type, file.name); }; reader.readAsDataURL(file); } else { saveToDb(null, null, null); }
}

document.querySelectorAll('.bottom-sheet-overlay').forEach(sheet => { sheet.addEventListener('click', function(e) { if (e.target === this) closeSheet(this.id); }); });
