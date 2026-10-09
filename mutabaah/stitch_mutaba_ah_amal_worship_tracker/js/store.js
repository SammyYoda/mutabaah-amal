/**
 * Mutaba'ah Amal - Tarbiyah IKRAM
 * Reactive Local State & Storage Manager
 */

import {
  INITIAL_MEMBERS,
  INITIAL_NAQIB,
  INITIAL_AMALAN,
  INITIAL_DAILY_LOGS,
  INITIAL_GUIDANCE_FEED,
  INITIAL_NOTIFICATIONS,
  MATRIX_MOCK_DATA
} from './data.js';

class MutabaahStore {
  constructor() {
    this.listeners = new Map();
    this.init();
  }

  init() {
    // 1. Role & Auth
    if (!localStorage.getItem('mutabaah_role')) {
      localStorage.setItem('mutabaah_role', 'member'); // 'member' or 'naqib'
    }

    // 2. Selected Member (for member view or naqib profile inspect)
    if (!localStorage.getItem('mutabaah_selected_member')) {
      localStorage.setItem('mutabaah_selected_member', 'faiz');
    }

    // 3. Selected Active Date (defaults to today)
    const storedDate = localStorage.getItem('mutabaah_active_date');
    if (!storedDate || storedDate.startsWith('2024-10-')) {
      // Reset stale hardcoded demo dates to today
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      localStorage.setItem('mutabaah_active_date', `${yyyy}-${mm}-${dd}`);
    }

    // 4. Daily Logs (re-seed if only stale hardcoded data exists)
    const storedLogs = localStorage.getItem('mutabaah_daily_logs');
    if (!storedLogs) {
      localStorage.setItem('mutabaah_daily_logs', JSON.stringify(INITIAL_DAILY_LOGS));
    } else {
      try {
        const logKeys = Object.keys(JSON.parse(storedLogs));
        const allOldDates = logKeys.length > 0 && logKeys.every(k => k.startsWith('2024-10-'));
        if (allOldDates) {
          localStorage.setItem('mutabaah_daily_logs', JSON.stringify(INITIAL_DAILY_LOGS));
        }
      } catch { /* keep existing */ }
    }

    // 5. Amalan Syllabus
    if (!localStorage.getItem('mutabaah_amalan')) {
      localStorage.setItem('mutabaah_amalan', JSON.stringify(INITIAL_AMALAN));
    }

    // 6. Guidance Feed (re-seed if containing old hardcoded dates)
    const storedGuidance = localStorage.getItem('mutabaah_guidance');
    if (!storedGuidance) {
      localStorage.setItem('mutabaah_guidance', JSON.stringify(INITIAL_GUIDANCE_FEED));
    } else {
      try {
        const items = JSON.parse(storedGuidance);
        const hasOldDates = items.length > 0 && items.some(g => typeof g.date === 'string' && g.date.includes('2024'));
        if (hasOldDates) {
          localStorage.setItem('mutabaah_guidance', JSON.stringify(INITIAL_GUIDANCE_FEED));
        }
      } catch { /* keep existing */ }
    }

    // 7. Notifications
    if (!localStorage.getItem('mutabaah_notifications')) {
      localStorage.setItem('mutabaah_notifications', JSON.stringify(INITIAL_NOTIFICATIONS));
    }
  }

  // --- PUB / SUB SYSTEM ---
  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => {
      const arr = this.listeners.get(event).filter(cb => cb !== callback);
      this.listeners.set(event, arr);
    };
  }

  notify(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => cb(data));
    }
  }

  // --- ROLE & AUTH ---
  getRole() {
    return localStorage.getItem('mutabaah_role') || 'member';
  }

  setRole(role) {
    localStorage.setItem('mutabaah_role', role);
    this.notify('role_changed', role);
  }

  getCurrentUser() {
    const role = this.getRole();
    if (role === 'naqib') {
      return INITIAL_NAQIB;
    }
    const memberId = localStorage.getItem('mutabaah_selected_member') || 'faiz';
    return this.getMemberById(memberId) || INITIAL_MEMBERS[0];
  }

  getMembers() {
    return INITIAL_MEMBERS;
  }

  getMemberById(id) {
    return INITIAL_MEMBERS.find(m => m.id === id) || INITIAL_MEMBERS[0];
  }

  setSelectedMember(id) {
    localStorage.setItem('mutabaah_selected_member', id);
    this.notify('member_selected', id);
  }

  getSelectedMemberId() {
    return localStorage.getItem('mutabaah_selected_member') || 'faiz';
  }

  // --- DATE SELECTION ---
  getActiveDate() {
    const stored = localStorage.getItem('mutabaah_active_date');
    if (stored) return stored;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  setActiveDate(dateStr) {
    localStorage.setItem('mutabaah_active_date', dateStr);
    this.notify('date_changed', dateStr);
  }

  // --- DAILY LOGS ---
  getAllLogs() {
    try {
      return JSON.parse(localStorage.getItem('mutabaah_daily_logs')) || INITIAL_DAILY_LOGS;
    } catch {
      return INITIAL_DAILY_LOGS;
    }
  }

  getLogForDate(dateStr) {
    const logs = this.getAllLogs();
    if (logs[dateStr]) {
      return logs[dateStr];
    }
    // Return blank scaffold if date not recorded yet
    return {
      tilawah: 0,
      istighfar: 0,
      rawatib: 0,
      buku: 0,
      riadah: 0,
      prayers: { subuh: false, zohor: false, asar: false, maghrib: false, isya: false },
      dhuha: false,
      doa: false,
      wirid: false,
      hafaz: false,
      mathurat: false,
      jiran: false,
      qiam: false,
      sedekah: false,
      ibubapa: false,
      masyarakat: false,
      puasa: false,
      notes: ''
    };
  }

  updateLog(dateStr, partial) {
    const logs = this.getAllLogs();
    const current = this.getLogForDate(dateStr);
    logs[dateStr] = { ...current, ...partial };
    localStorage.setItem('mutabaah_daily_logs', JSON.stringify(logs));
    this.notify('log_updated', { date: dateStr, log: logs[dateStr] });
    return logs[dateStr];
  }

  // --- SCORE COMPUTATION ---
  calculateScore(log) {
    if (!log) return { completed: 0, total: 17, percentage: 0 };
    let completed = 0;
    const total = 17;

    // 1. Tilawah (>= 5 pages)
    if (log.tilawah >= 5) completed++;

    // 2. Solat Fardhu Berjamaah (all 5 times completed)
    const p = log.prayers || {};
    const prayerCount = [p.subuh, p.zohor, p.asar, p.maghrib, p.isya].filter(Boolean).length;
    if (prayerCount === 5) completed++;

    // 3. Istighfar (>= 70)
    if (log.istighfar >= 70) completed++;

    // 4. Rawatib (>= 8)
    if (log.rawatib >= 8) completed++;

    // 5. Dhuha
    if (log.dhuha) completed++;

    // 6. Doa
    if (log.doa) completed++;

    // 7. Wirid
    if (log.wirid) completed++;

    // 8. Buku (>= 30 min)
    if (log.buku >= 30) completed++;

    // 9. Hafaz
    if (log.hafaz) completed++;

    // 10. Mathurat
    if (log.mathurat) completed++;

    // 11. Riadah (>= 2 of 3)
    if (log.riadah >= 2) completed++;

    // 12. Jiran
    if (log.jiran) completed++;

    // 13. Qiam
    if (log.qiam) completed++;

    // 14. Sedekah
    if (log.sedekah) completed++;

    // 15. Ibubapa
    if (log.ibubapa) completed++;

    // 16. Masyarakat
    if (log.masyarakat) completed++;

    // 17. Puasa
    if (log.puasa) completed++;

    const percentage = Math.round((completed / total) * 100);
    return {
      completed,
      total,
      percentage,
      prayerCount
    };
  }

  // --- AMALAN SYLLABUS ---
  getAmalanList() {
    try {
      return JSON.parse(localStorage.getItem('mutabaah_amalan')) || INITIAL_AMALAN;
    } catch {
      return INITIAL_AMALAN;
    }
  }

  saveAmalanList(list) {
    localStorage.setItem('mutabaah_amalan', JSON.stringify(list));
    this.notify('amalan_changed', list);
  }

  addAmalan(newItem) {
    const list = this.getAmalanList();
    const codeNum = String(list.length + 1).padStart(2, '0');
    const item = {
      id: 'custom_' + Date.now(),
      code: codeNum,
      name: newItem.name || 'Amalan Baru',
      desc: newItem.desc || 'Huraian sasaran amalan',
      freq: newItem.freq || 'Harian',
      targetVal: Number(newItem.targetVal) || 1,
      unit: newItem.unit || 'kali',
      icon: newItem.icon || 'star',
      active: true
    };
    list.push(item);
    this.saveAmalanList(list);
    return item;
  }

  updateAmalan(id, partial) {
    const list = this.getAmalanList();
    const idx = list.findIndex(item => item.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...partial };
      this.saveAmalanList(list);
      return list[idx];
    }
    return null;
  }

  deleteAmalan(id) {
    let list = this.getAmalanList();
    list = list.filter(item => item.id !== id);
    this.saveAmalanList(list);
  }

  // --- GUIDANCE FEED ---
  getGuidanceList() {
    try {
      return JSON.parse(localStorage.getItem('mutabaah_guidance')) || INITIAL_GUIDANCE_FEED;
    } catch {
      return INITIAL_GUIDANCE_FEED;
    }
  }

  saveGuidanceList(list) {
    localStorage.setItem('mutabaah_guidance', JSON.stringify(list));
    this.notify('guidance_changed', list);
  }

  markGuidanceAsRead(id) {
    const list = this.getGuidanceList();
    const item = list.find(g => g.id === id);
    if (item) {
      item.read = true;
      const now = new Date();
      item.readDate = now.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' });
      this.saveGuidanceList(list);
    }
  }

  addGuidanceReply(id, replyText, author = 'Ahmad Faiz') {
    const list = this.getGuidanceList();
    const item = list.find(g => g.id === id);
    if (item) {
      if (!item.replies) item.replies = [];
      const now = new Date();
      const dateStr = now.toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' }) + ', ' +
                      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      item.replies.push({
        author,
        date: dateStr,
        text: replyText
      });
      this.saveGuidanceList(list);
      return item;
    }
    return null;
  }

  sendGuidanceFromNaqib(newGuidance) {
    const list = this.getGuidanceList();
    const now = new Date();
    const dateStr = now.toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' }) + ', ' +
                    now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const item = {
      id: Date.now(),
      category: newGuidance.category || 'peribadi',
      categoryLabel: newGuidance.categoryLabel || 'Nota Peribadi',
      targetMemberId: newGuidance.targetMemberId || 'faiz',
      targetMemberName: newGuidance.targetMemberName || 'Ahmad Faiz',
      author: 'Ustaz Hazwan Ismail',
      authorRole: 'Naqib Usrah',
      authorAvatar: INITIAL_NAQIB.avatarUrl,
      title: newGuidance.title || 'Bimbingan Ruhani & Tausiyah',
      date: dateStr,
      content: newGuidance.content || '',
      reference: newGuidance.reference || null,
      priority: newGuidance.priority || false,
      read: false,
      replies: []
    };

    list.unshift(item);
    this.saveGuidanceList(list);

    // Also trigger notification for member
    this.addNotification({
      title: 'Nota Bimbingan Baru daripada Naqib',
      desc: item.title,
      time: 'Baru sahaja',
      read: false,
      path: 'bimbingan'
    });

    return item;
  }

  // --- NOTIFICATIONS ---
  getNotifications() {
    try {
      return JSON.parse(localStorage.getItem('mutabaah_notifications')) || INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  }

  addNotification(notif) {
    const list = this.getNotifications();
    list.unshift({ id: Date.now(), ...notif });
    localStorage.setItem('mutabaah_notifications', JSON.stringify(list));
    this.notify('notifications_changed', list);
  }

  markNotificationsAllRead() {
    const list = this.getNotifications();
    list.forEach(n => n.read = true);
    localStorage.setItem('mutabaah_notifications', JSON.stringify(list));
    this.notify('notifications_changed', list);
  }

  // --- MATRIX DATA ---
  getMatrix() {
    return MATRIX_MOCK_DATA;
  }
}

export const store = new MutabaahStore();
