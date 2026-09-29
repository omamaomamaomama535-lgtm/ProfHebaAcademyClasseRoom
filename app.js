// ======================= إعدادات السيرفر السحابي (Firebase) =======================
const firebaseConfig = {
    apiKey: "AIzaSyBGOLQSvAEIKK380Zo2bpQtY6n0pSruFMg",
    authDomain: "profhebaacademyclasseroo-d1d49.firebaseapp.com",
    projectId: "profhebaacademyclasseroo-d1d49",
    storageBucket: "profhebaacademyclasseroo-d1d49.firebasestorage.app",
    messagingSenderId: "28002405171",
    appId: "1:28002405171:web:2136b2334812f73d810c46",
    measurementId: "G-TK9J9L2THQ"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// المتغيرات المحلية 
let homeworks = [];
let scheduleData = {};
let allowedUsers = [];
let currentUser = null;
let activeHwId = null;

const days = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];
const slots = [1, 2, 3, 4, 5];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-screen').classList.remove('hidden-section');
});

// ================= الإشعارات =================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    let icon = type === 'success' ? '<i class="fas fa-check-circle text-emerald-500 text-xl"></i>' : (type === 'error' ? '<i class="fas fa-exclamation-circle text-red-500 text-xl"></i>' : '<i class="fas fa-info-circle text-blue-500 text-xl"></i>');
    toast.className = `custom-toast ${type}`; toast.innerHTML = `${icon} <span class="font-bold text-sm text-gray-700">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { if(toast.parentElement) toast.remove(); }, 3500);
}

function customConfirm(message, onConfirm) {
    document.getElementById('confirm-msg').innerText = message; document.getElementById('confirm-modal').classList.add('active');
    let yesBtn = document.getElementById('confirm-btn-yes'); let newBtn = yesBtn.cloneNode(true); yesBtn.parentNode.replaceChild(newBtn, yesBtn);
    newBtn.addEventListener('click', () => { closeConfirmModal(); onConfirm(); });
}
function closeConfirmModal() { document.getElementById('confirm-modal').classList.remove('active'); }

// ================= جلب البيانات =================
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
        console.error("خطأ السيرفر:", error);
        showToast("لا يمكن الاتصال بقاعدة البيانات. تأكد من إعدادات Firestore rules.", "error");
        return false;
    }
}

// ================= الدخول =================
function parseJwt(token) {
    var base64Url = token.split('.')[1]; var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(window.atob(base64).split('').map(function(c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join('')));
}

window.handleGoogleLogin = async function(response) {
    document.getElementById('loader-overlay').classList.remove('hidden-section');
    const payload = parseJwt(response.credential);
    const email = payload.email.toLowerCase();
    const name = payload.name;

    let success = await fetchServerData();
    document.getElementById('loader-overlay').classList.add('hidden-section');
    if(!success) return; 

    if (allowedUsers.length === 0) {
        showToast("أنت أول مستخدم! تم إنشاء قاعدة بيانات السيرفر وجعلك مديراً.", "success");
        let newAdmin = { email, name, role: 'admin' };
        allowedUsers.push(newAdmin);
        try {
            await db.collection('users').doc(email).set(newAdmin);
            loginAs('admin', name, email); 
        } catch(e) {
             showToast("لا يمكن الحفظ في السيرفر. تحقق من صلاحيات Firestore (Rules).", "error");
        }
        return;
    }

    const user = allowedUsers.find(u => u.email === email);
    if (user) loginAs(user.role, user.name || name, email);
    else showToast("حسابك غير مسجل في سيرفر المدرسة.", "error");
}

function loginAs(role, name, email) {
    currentUser = { role, name, email };
    document.getElementById('login-screen').classList.add('hidden-section');
    document.getElementById('main-dashboard').classList.remove('hidden-section');
    document.getElementById('user-name-display').innerText = name;
    document.getElementById('user-role-badge').innerText = role === 'admin' ? 'الإدارة' : (role === 'teacher' ? 'معلم' : 'طالب');

    buildBottomNav();
    if(role === 'admin') navigateTo('view-admin', 'nav-admin');
    else if(role === 'teacher') navigateTo('view-homework-manage', 'nav-hw');
    else navigateTo('view-student', 'nav-student');
    showToast(`أهلاً بك يا ${name}`, 'info');
}

window.logout = function() { currentUser = null; document.getElementById('main-dashboard').classList.add('hidden-section'); document.getElementById('login-screen').classList.remove('hidden-section'); }

function buildBottomNav() {
    const nav = document.getElementById('bottom-nav'); nav.innerHTML = '';
    const createItem = (id, icon, text, target) => `<div class="nav-item btn-touch" id="${id}" onclick="navigateTo('${target}', '${id}')"><i class='fas ${icon}'></i><span>${text}</span></div>`;

    if(currentUser.role === 'admin') nav.innerHTML += createItem('nav-admin', 'fa-shield-alt', 'الإدارة', 'view-admin');
    if(currentUser.role === 'admin' || currentUser.role === 'teacher') {
        nav.innerHTML += createItem('nav-hw', 'fa-pen-square', 'الواجبات', 'view-homework-manage');
        nav.innerHTML += createItem('nav-sch', 'fa-calendar-alt', 'الجدول', 'view-schedule-manage');
    }
    if(currentUser.role === 'student') nav.innerHTML += createItem('nav-student', 'fa-layer-group', 'لوحتي', 'view-student');
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
    let name = document.getElementById('add-user-name').value;
    let email = document.getElementById('add-user-email').value.trim().toLowerCase();
    let role = document.getElementById('add-user-role').value;
    if(!name || !email) return showToast('يرجى إكمال البيانات!', 'error');
    if(allowedUsers.find(u => u.email === email)) return showToast('الإيميل مسجل مسبقاً في السيرفر!', 'error');
    
    let newUser = { email, name, role };
    try {
        document.getElementById('loader-overlay').classList.remove('hidden-section');
        await db.collection('users').doc(email).set(newUser);
        allowedUsers.push(newUser);
        document.getElementById('add-user-name').value = ''; document.getElementById('add-user-email').value = '';
        renderAdminUsers(); showToast('تم الحفظ في السيرفر بنجاح', 'success');
    } catch (error) {
        showToast('حدث خطأ أثناء الاتصال بالسيرفر. تحقق من الصلاحيات.', 'error');
    } finally { document.getElementById('loader-overlay').classList.add('hidden-section'); }
}

window.removeUser = function(email) {
    customConfirm('هل أنت متأكد من حذف هذا المستخدم نهائياً من السيرفر؟', async () => {
        try {
            document.getElementById('loader-overlay').classList.remove('hidden-section');
            await db.collection('users').doc(email).delete();
            allowedUsers = allowedUsers.filter(u => u.email !== email);
            renderAdminUsers(); showToast('تم حذفه من قاعدة البيانات', 'success');
        } catch(e) { showToast('خطأ أثناء الحذف', 'error'); }
        finally { document.getElementById('loader-overlay').classList.add('hidden-section'); }
    });
}

function renderAdminUsers() {
    let html = '';
    allowedUsers.forEach(u => {
        let rName = u.role === 'admin' ? 'مدير' : (u.role === 'teacher' ? 'معلم' : 'طالب');
        let color = u.role === 'admin' ? 'red' : (u.role === 'teacher' ? 'indigo' : 'emerald');
        html += `<div class="mobile-card flex justify-between items-center mb-2 p-3">
                    <div><p class="font-bold text-sm text-gray-800">${u.name}</p><p class="text-[11px] text-gray-500 mt-1" dir="ltr">${u.email}</p>
                    <span class="inline-block mt-2 bg-${color}-100 text-${color}-700 px-2 py-0.5 rounded text-[10px] font-bold">${rName}</span></div>
                    ${u.role !== 'admin' ? `<button onclick="removeUser('${u.email}')" class="p-2 bg-red-50 text-red-500 rounded-full btn-touch"><i class="fas fa-trash"></i></button>` : ''}
                </div>`;
    });
    document.getElementById('admin-users-list').innerHTML = html;
}

// ================= المعلم =================
window.switchTeacherTab = function(tab) {
    let tPub = document.getElementById('tab-t-publish'), tTrk = document.getElementById('tab-t-track');
    let vPub = document.getElementById('teacher-publish-view'), vTrk = document.getElementById('teacher-track-view');
    if(tab === 'publish') {
        tPub.className = "flex-1 py-2 font-bold rounded-lg text-sm transition bg-white shadow-sm text-indigo-600"; tTrk.className = "flex-1 py-2 font-bold rounded-lg text-sm transition text-gray-500";
        vPub.classList.remove('hidden-section'); vTrk.classList.add('hidden-section');
    } else {
        tTrk.className = "flex-1 py-2 font-bold rounded-lg text-sm transition bg-white shadow-sm text-indigo-600"; tPub.className = "flex-1 py-2 font-bold rounded-lg text-sm transition text-gray-500";
        vTrk.classList.remove('hidden-section'); vPub.classList.add('hidden-section'); renderTeacherTracking();
    }
}

window.addHomework = async function() {
    let title = document.getElementById('hw-title').value; let date = document.getElementById('hw-date').value;
    let grade = document.getElementById('hw-grade').value; let subject = document.getElementById('hw-subject').value;
    let desc = document.getElementById('hw-desc').value;
    if(!title || !date || !grade || !subject) return showToast('يرجى إكمال الحقول الأساسية!', 'error');

    let hwId = Date.now().toString();
    let newHw = { id: hwId, title, date, grade, subject, desc, submissions: [] };
    
    try {
        document.getElementById('loader-overlay').classList.remove('hidden-section');
        await db.collection('homeworks').doc(hwId).set(newHw);
        homeworks.push(newHw);
        document.getElementById('hw-title').value = ''; document.getElementById('hw-desc').value = '';
        showToast('تم رفع الواجب للسيرفر بنجاح!', 'success');
    } catch(e) { showToast('فشل النشر، تأكد من صلاحيات Firestore', 'error'); }
    finally { document.getElementById('loader-overlay').classList.add('hidden-section'); }
}

function renderTeacherTracking() {
    let html = ''; let reversedHw = [...homeworks].reverse();
    if(reversedHw.length === 0) { document.getElementById('teacher-hw-list').innerHTML = `<div class="text-center p-6 text-gray-400">لا يوجد بيانات.</div>`; return; }

    reversedHw.forEach(hw => {
        let subCount = hw.submissions ? hw.submissions.length : 0;
        let badgeClass = subCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600';
        html += `
            <div class="mobile-card border-r-4 border-r-indigo-500 p-4">
                <div class="flex justify-between items-start mb-2"><h3 class="font-bold text-gray-800">${hw.title}</h3><span class="px-2 py-1 rounded text-xs font-bold ${badgeClass}">${subCount} تسليم</span></div>
                <p class="text-xs text-gray-500 mb-3"><i class="fas fa-book ml-1"></i> ${hw.subject} (${hw.grade})</p>
                <button onclick="openTeacherSheet('${hw.id}')" class="btn-touch w-full bg-indigo-50 text-indigo-700 font-bold py-2 rounded-lg text-sm"><i class="fas fa-users ml-1"></i> عرض إجابات الطلاب</button>
            </div>
        `;
    });
    document.getElementById('teacher-hw-list').innerHTML = html;
}

window.openTeacherSheet = function(id) {
    let hw = homeworks.find(h => h.id.toString() === id.toString()); if(!hw) return;
    let html = '';
    if(!hw.submissions || hw.submissions.length === 0) {
        html = `<div class="text-center p-6 text-gray-400">لم يسلم أي طالب حتى الآن.</div>`;
    } else {
        hw.submissions.forEach(sub => {
            let viewBtn = '';
            if(sub.fileData) { viewBtn = `<button onclick="viewFileInModal('${sub.fileData}', '${sub.fileType}')" class="mt-2 w-full bg-blue-100 text-blue-700 py-2 rounded-lg text-xs font-bold btn-touch"><i class="fas fa-external-link-alt"></i> عرض الملف (${sub.fileName})</button>`; } 
            else if (sub.fileName) { viewBtn = `<p class="text-xs text-gray-400 mt-2">مرفق غير مقروء: ${sub.fileName}</p>`; }
            html += `
                <div class="bg-white border border-gray-200 p-4 rounded-xl shadow-sm mb-3">
                    <div class="flex justify-between items-center mb-2 border-b pb-2"><h4 class="font-bold text-sm text-indigo-800"><i class="fas fa-user-graduate ml-1"></i> ${sub.name}</h4><span class="text-[10px] text-gray-400">${sub.date}</span></div>
                    <p class="text-sm text-gray-700 whitespace-pre-wrap">${sub.text || '<span class="text-gray-400 text-xs">لا يوجد إجابة نصية</span>'}</p>
                    ${viewBtn}
                </div>
            `;
        });
    }
    document.getElementById('submissions-container').innerHTML = html; document.getElementById('teacher-view-sheet').classList.add('active');
}

window.viewFileInModal = function(dataUrl, fileType) {
    const viewer = document.getElementById('file-viewer-container'); viewer.innerHTML = '';
    if(fileType.startsWith('image/')) { viewer.innerHTML = `<img src="${dataUrl}" class="max-w-full max-h-full object-contain rounded-lg shadow-lg">`; } 
    else if (fileType === 'application/pdf') { viewer.innerHTML = `<iframe src="${dataUrl}" class="w-full h-full rounded-lg border-0"></iframe>`; } 
    else { return showToast("نوع الملف غير مدعوم.", "error"); }
    document.getElementById('file-viewer-modal').classList.add('active');
}

// ================= الجدول =================
window.addScheduleSlot = async function() {
    let key = `${document.getElementById('sch-day').value}-${document.getElementById('sch-slot').value}`;
    let val = document.getElementById('sch-subject').value;
    if(val) scheduleData[key] = val; else delete scheduleData[key];
    
    try {
        document.getElementById('loader-overlay').classList.remove('hidden-section');
        await db.collection('settings').doc('schedule').set(scheduleData);
        drawSchedule('manage-schedule-container'); document.getElementById('sch-subject').value = '';
        showToast('تم تحديث الجدول', 'success');
    } catch(e) { showToast('خطأ في الاتصال', 'error'); }
    finally { document.getElementById('loader-overlay').classList.add('hidden-section'); }
}

window.clearSchedule = function() {
    customConfirm('مسح الجدول بالكامل؟', async () => {
        try {
            document.getElementById('loader-overlay').classList.remove('hidden-section');
            await db.collection('settings').doc('schedule').set({});
            scheduleData = {}; drawSchedule('manage-schedule-container'); showToast('تم مسح الجدول', 'success');
        } catch(e) { showToast('خطأ في الاتصال', 'error'); }
        finally { document.getElementById('loader-overlay').classList.add('hidden-section'); }
    });
}

function drawSchedule(containerId) {
    let html = `<div class="schedule-wrapper"><table class="schedule-table"><thead><tr><th>اليوم</th><th>ح 1</th><th>ح 2</th><th>ح 3</th><th>ح 4</th><th>ح 5</th></tr></thead><tbody>`;
    days.forEach(day => {
        html += `<tr><td class="font-bold text-indigo-900 bg-indigo-50">${day}</td>`;
        slots.forEach(slot => {
            let sub = scheduleData[`${day}-${slot}`] || '';
            html += `<td class="schedule-cell ${sub ? 'filled' : 'text-gray-300'}">${sub || '-'}</td>`;
        }); html += `</tr>`;
    }); html += `</tbody></table></div>`;
    document.getElementById(containerId).innerHTML = html;
}

// ================= الطالب =================
window.switchStudentTab = function(tab) {
    let tHw = document.getElementById('tab-hw'), tSch = document.getElementById('tab-sch');
    let vHw = document.getElementById('student-hw-list'), vSch = document.getElementById('student-schedule-view');
    if(tab === 'hw') {
        tHw.className = "flex-1 py-2 font-bold rounded-lg text-sm bg-white shadow-sm text-indigo-600"; tSch.className = "flex-1 py-2 font-bold rounded-lg text-sm text-gray-500 bg-transparent";
        vHw.classList.remove('hidden-section'); vSch.classList.add('hidden-section');
    } else {
        tSch.className = "flex-1 py-2 font-bold rounded-lg text-sm bg-white shadow-sm text-indigo-600"; tHw.className = "flex-1 py-2 font-bold rounded-lg text-sm text-gray-500 bg-transparent";
        vSch.classList.remove('hidden-section'); vHw.classList.add('hidden-section');
    }
}

function renderStudentHomeworks() {
    let html = ''; let reversedHw = [...homeworks].reverse();
    if(reversedHw.length === 0) { document.getElementById('student-hw-list').innerHTML = `<div class="text-center p-8 text-gray-400 mt-10"><i class="fas fa-glass-cheers text-6xl mb-3 text-gray-300"></i><p>لا يوجد واجبات.</p></div>`; return; }

    reversedHw.forEach(hw => {
        let isSubmitted = hw.submissions && hw.submissions.some(s => s.email === currentUser.email);
        let btnHtml = isSubmitted ? `<button class="w-full mt-3 bg-gray-100 text-emerald-600 font-bold py-2.5 rounded-lg flex justify-center items-center gap-2 cursor-default"><i class="fas fa-check-circle"></i> تم التسليم</button>` : `<button onclick="openStudentSheet('${hw.id}')" class="btn-touch w-full mt-3 bg-indigo-600 text-white font-bold py-2.5 rounded-lg shadow-md flex justify-center items-center gap-2"><i class="fas fa-cloud-upload-alt"></i> تسليم الواجب</button>`;
        let borderClass = isSubmitted ? 'border-r-4 border-emerald-500 opacity-80' : 'border-r-4 border-indigo-500';

        html += `
            <div class="mobile-card ${borderClass} p-4">
                <div class="flex justify-between items-start mb-2"><h3 class="font-bold text-lg text-gray-800">${hw.title}</h3><span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold">${hw.grade}</span></div>
                <span class="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full"><i class="fas fa-book"></i> ${hw.subject}</span>
                <p class="text-sm text-gray-600 mt-3 whitespace-pre-wrap">${hw.desc}</p>
                <div class="mt-3 flex items-center gap-1 text-[11px] font-bold text-red-500"><i class="far fa-clock"></i> التسليم: ${hw.date}</div>
                ${btnHtml}
            </div>
        `;
    });
    document.getElementById('student-hw-list').innerHTML = html;
}

window.openStudentSheet = function(id) {
    let hw = homeworks.find(h => h.id.toString() === id.toString()); if(!hw) return;
    activeHwId = hw.id; document.getElementById('sheet-hw-title').innerText = hw.title;
    document.getElementById('submit-text').value = ''; document.getElementById('submit-file').value = '';
    document.getElementById('file-name-display').innerText = 'اختر ملف';
    document.getElementById('submit-sheet').classList.add('active');
}

window.closeSheet = function(sheetId) { document.getElementById(sheetId).classList.remove('active'); if(sheetId === 'submit-sheet') activeHwId = null; }

window.updateFileName = function(input) {
    let display = document.getElementById('file-name-display');
    if(input.files && input.files.length > 0) {
        let file = input.files[0];
        if(file.size > 800 * 1024) {
            showToast("حجم الملف كبير جداً! (الحد الأقصى 800KB)", "error");
            input.value = ''; display.innerText = 'اختر ملف'; display.classList.replace('text-emerald-600', 'text-indigo-600'); return;
        }
        display.innerText = file.name; display.classList.replace('text-indigo-600', 'text-emerald-600');
    } else { display.innerText = 'اختر ملف'; display.classList.replace('text-emerald-600', 'text-indigo-600'); }
}

window.confirmSubmission = async function() {
    let text = document.getElementById('submit-text').value; let fileInput = document.getElementById('submit-file'); let file = fileInput.files[0];
    if(!text && !file) return showToast('اكتب إجابة أو أرفق ملفاً أولاً!', 'error');

    let idx = homeworks.findIndex(h => h.id === activeHwId); if(idx === -1) return;
    let hw = homeworks[idx];
    
    let btn = document.getElementById('confirm-submit-btn'); let originalText = btn.innerText;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الرفع...'; btn.disabled = true;

    const saveToDb = async (fileBase64 = null, fileType = null, fileName = null) => {
        let sub = { email: currentUser.email, name: currentUser.name, text: text, fileName: fileName, fileType: fileType, fileData: fileBase64, date: new Date().toLocaleString('ar-EG') };
        if(!hw.submissions) hw.submissions = [];
        let updatedSubmissions = [...hw.submissions, sub];

        try {
            await db.collection('homeworks').doc(hw.id.toString()).update({ submissions: updatedSubmissions });
            hw.submissions = updatedSubmissions; 
            closeSheet('submit-sheet');
            setTimeout(() => { renderStudentHomeworks(); showToast('تم إرسال الواجب!', 'success'); }, 300);
        } catch (e) { showToast('فشل الرفع! تأكد من الصلاحيات', 'error'); } 
        finally { btn.innerHTML = originalText; btn.disabled = false; }
    };

    if (file) { let reader = new FileReader(); reader.onload = function(e) { saveToDb(e.target.result, file.type, file.name); }; reader.readAsDataURL(file); } 
    else { saveToDb(null, null, null); }
}

document.querySelectorAll('.bottom-sheet-overlay').forEach(sheet => { sheet.addEventListener('click', function(e) { if (e.target === this) closeSheet(this.id); }); });
