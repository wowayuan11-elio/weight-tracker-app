'use strict';
/* 双人体重小本本 V8 极简版
   只做两件事：记录 + 多维度查看。
   数据全部存本机 localStorage，备份格式与旧版完全兼容。 */

/* ---------- 常量与状态 ---------- */
const STORE_KEY = 'couples_weight_v1';
const BACKUP_TKEY = 'couples_weight_last_backup';
const GH_KEY = 'couples_weight_gh_conf';
const GH_SYNC_KEY = 'couples_weight_gh_sync';
const GH_DATA_REPO = 'weight-tracker-data';
const PERSON_IDS = ['me', 'partner'];
const DEFAULT_NAMES = { me: '我', partner: '对象' };
const COLORS = { me: '#007aff', partner: '#ff9500' };
const WEEK_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

let state = loadState();
let currentDate = todayKey();   // 记录页当前编辑的日期
let trendRange = 30;            // 趋势图天数，0 = 全部
let drafts = { me: '', partner: '' };
let ghConf = loadGhConf();
let ghTimer = null;

/* ---------- PWA ---------- */
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

/* ---------- 存取 ---------- */
function sanitizeRecords(recs) {
  const out = {};
  Object.keys(recs || {}).forEach(k => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return;
    const r = recs[k];
    if (!r || typeof r !== 'object') return;
    const clean = {};
    PERSON_IDS.forEach(p => {
      const v = Number(r[p]);
      if (r[p] !== null && r[p] !== undefined && r[p] !== '' && isFinite(v) && v >= 20 && v <= 300) {
        clean[p] = Math.round(v * 10) / 10;
      }
    });
    if (Object.keys(clean).length) out[k] = clean;
  });
  return out;
}

function sanitizeGoals(g) {
  const out = { me: null, partner: null };
  PERSON_IDS.forEach(p => {
    if (g && typeof g === 'object' && g[p] !== null && g[p] !== undefined && g[p] !== '') {
      const v = Number(g[p]);
      if (isFinite(v) && v >= 20 && v <= 300) out[p] = Math.round(v * 10) / 10;
    }
  });
  return out;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          names: {
            me: (parsed.names && typeof parsed.names.me === 'string' && parsed.names.me.trim()) || DEFAULT_NAMES.me,
            partner: (parsed.names && typeof parsed.names.partner === 'string' && parsed.names.partner.trim()) || DEFAULT_NAMES.partner
          },
          records: sanitizeRecords(parsed.records),
          goals: sanitizeGoals(parsed.goals)
        };
      }
    }
  } catch (e) { console.warn('读取存档失败', e); }
  return { names: { ...DEFAULT_NAMES }, records: {}, goals: { me: null, partner: null } };
}

function persist() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); scheduleCloudBackup(); return true; }
  catch (e) { toast('保存失败：浏览器存储不可用'); return false; }
}

/* ================= GitHub 自动云备份 ================= */
function loadGhConf() {
  try { const c = JSON.parse(localStorage.getItem(GH_KEY)); return (c && c.token) ? c : null; }
  catch (e) { return null; }
}
function saveGhConf(c) {
  try {
    if (c) localStorage.setItem(GH_KEY, JSON.stringify(c));
    else localStorage.removeItem(GH_KEY);
  } catch (e) {}
  ghConf = c;
}
function lastSyncText() {
  try {
    const t = Number(localStorage.getItem(GH_SYNC_KEY));
    if (!t) return '从未同步';
    const mins = Math.floor((Date.now() - t) / 60000);
    if (mins < 1) return '刚刚';
    if (mins < 60) return mins + ' 分钟前';
    const h = Math.floor(mins / 60);
    if (h < 24) return h + ' 小时前';
    return Math.floor(h / 24) + ' 天前';
  } catch (e) { return '从未同步'; }
}

/* 数据一变，3 秒后自动往云端推一份（防抖：连续操作只推最后一次） */
function scheduleCloudBackup() {
  if (!ghConf) return;
  clearTimeout(ghTimer);
  ghTimer = setTimeout(() => cloudBackup('auto'), 3000);
}

function ghBase() { return 'https://api.github.com/repos/' + ghConf.owner + '/' + ghConf.repo + '/contents/data/backup.json'; }

async function cloudBackup(reason) {
  if (!ghConf) return false;
  try {
    if (ghConf.provider === 'gitee') return await giteeBackup(reason);
    let sha = null;
    const g = await fetch(ghBase(), {
      headers: { Authorization: 'Bearer ' + ghConf.token, Accept: 'application/vnd.github+json' }
    });
    if (g.status === 200) { sha = (await g.json()).sha; }
    else if (g.status !== 404) {
      diagMsg('自动备份失败：GitHub 回应 ' + g.status);
      return false;
    }
    const p = await fetch(ghBase(), {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + ghConf.token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '自动备份 ' + todayKey() + (reason ? ' (' + reason + ')' : ''),
        content: btoa(unescape(encodeURIComponent(backupJSON()))),
        sha: sha
      })
    });
    if (p.ok) {
      markBackedUp();
      try { localStorage.setItem(GH_SYNC_KEY, String(Date.now())); } catch (e) {}
      if (document.getElementById('settings-body') && document.getElementById('settings-sheet').classList.contains('show')) {
        renderSettings();
      }
    } else {
      diagMsg('自动备份失败：写入回应 ' + p.status);
    }
    return p.ok;
  } catch (e) {
    diagMsg('自动备份失败：网络异常 · ' + (e && e.message ? e.message : e));
    return false;
  }
}

/* Gitee 通道（国内网络直连，无中间人问题） */
async function giteeBackup(reason) {
  const base = 'https://api.gitee.com/api/v5/repos/' + ghConf.owner + '/' + ghConf.repo + '/contents/data/backup.json';
  let sha = null;
  const g = await fetch(base + '?access_token=' + encodeURIComponent(ghConf.token));
  if (g.status === 200) { sha = (await g.json()).sha; }
  else if (g.status !== 404) {
    diagMsg('自动备份失败：Gitee 回应 ' + g.status);
    return false;
  }
  const p = await fetch(base, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: ghConf.token,
      content: btoa(unescape(encodeURIComponent(backupJSON()))),
      sha: sha,
      branch: 'master',
      message: '自动备份 ' + todayKey() + (reason ? ' (' + reason + ')' : '')
    })
  });
  if (p.ok) {
    markBackedUp();
    try { localStorage.setItem(GH_SYNC_KEY, String(Date.now())); } catch (e) {}
    if (document.getElementById('settings-body') && document.getElementById('settings-sheet') && document.getElementById('settings-sheet').classList.contains('show')) {
      renderSettings();
    }
  } else {
    let frag = '';
    try { frag = (await p.text()).slice(0, 80); } catch (e) {}
    diagMsg('自动备份失败：Gitee 写入回应 ' + p.status + (frag ? ' · ' + frag : ''));
  }
  return p.ok;
}

async function cloudRestore() {
  if (!ghConf) { toast('先开通自动云备份'); return; }
  toast('正在从云端读取…');
  try {
    let j;
    if (ghConf.provider === 'gitee') {
      const g = await fetch('https://api.gitee.com/api/v5/repos/' + ghConf.owner + '/' + ghConf.repo + '/contents/data/backup.json?access_token=' + encodeURIComponent(ghConf.token));
      if (g.status === 404) { toast('云端还没有备份'); return; }
      if (!g.ok) { diagMsg('恢复失败：Gitee 回应 ' + g.status); toast('云端读取失败，检查网络'); return; }
      j = await g.json();
    } else {
      const g = await fetch(ghBase(), {
        headers: { Authorization: 'Bearer ' + ghConf.token, Accept: 'application/vnd.github+json' }
      });
      if (g.status === 404) { toast('云端还没有备份'); return; }
      if (!g.ok) { toast('云端读取失败，检查网络'); return; }
      j = await g.json();
    }
    const txt = decodeURIComponent(escape(atob(String(j.content).replace(/\n/g, ''))));
    const remote = parseBackupText(txt);
    if (!remote) { toast('云端数据无效'); return; }
    const count = Object.keys(remote.records).length;
    askConfirm('云端有 ' + count + ' 天记录，覆盖手机当前数据？').then(ok => {
      if (!ok) return;
      state = remote;
      persist();
      renderAll();
      toast('已从云端恢复 ' + count + ' 天');
    });
  } catch (e) { toast('云端读取失败，检查网络'); }
}

/* 诊断探头：把失败细节显示出来并记住，方便定位问题 */
function diagMsg(s) {
  try { localStorage.setItem('wt_diag', s); } catch (e) {}
  const d = document.getElementById('cloud-diag');
  if (d) { d.textContent = s; d.style.display = 'block'; }
}
function diagFromStorage() {
  try { return localStorage.getItem('wt_diag') || ''; } catch (e) { return ''; }
}
async function ghUser(token, style) {
  return fetch('https://api.github.com/user', {
    headers: style === 'token'
      ? { Authorization: 'token ' + token, Accept: 'application/vnd.github+json' }
      : { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' }
  });
}

async function setupCloud(raw) {
  /* 关键：杀掉聊天系统注入的零宽字符等一切不可见字符（肉眼看不见但会让码被切断） */
  let token = String(raw).replace(/[^\x21-\x7e]/g, '').trim();
  const m = token.match(/#k=([A-Za-z0-9._~\/+=-]+)/);
  if (m) token = m[1];
  const ghm = token.match(/(gh[pousrnw]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,})/);
  if (ghm) return setupGithub(ghm[1]);
  const gtm = token.match(/\b([0-9a-f]{40})\b/i);   /* Gitee 私人令牌：40位 */
  if (gtm) return setupGitee(gtm[1]);
  diagMsg('诊断：粘贴内容里没找到码（清洗后长度 ' + token.length + '）');
  toast('没认出授权码，请完整粘贴');
}

/* Gitee 通道开通（国内网络直连） */
async function setupGitee(token) {
  toast('正在开通云备份（国内通道）…');
  try {
    const u = await fetch('https://api.gitee.com/api/v5/user?access_token=' + encodeURIComponent(token));
    if (!u.ok) {
      let frag = '';
      try { frag = (await u.text()).slice(0, 80); } catch (e) {}
      diagMsg('诊断：Gitee 回应 ' + u.status + (frag ? ' · ' + frag : '') + ' · 码长 ' + token.length + '（令牌生成后只显示一次，请确认复制的是完整的40位）');
      toast('令牌无效(' + u.status + ')——详情在下方，截图发我');
      return;
    }
    const owner = (await u.json()).login;
    const cr = await fetch('https://api.gitee.com/api/v5/user/repos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: token, name: GH_DATA_REPO, private: true, description: '体重数据自动云备份（私有）' })
    });
    if (!cr.ok && cr.status !== 400) {   /* 400 = 仓库可能已存在，继续 */
      let frag = '';
      try { frag = (await cr.text()).slice(0, 80); } catch (e) {}
      diagMsg('诊断：身份验证通过(' + owner + ')，但建仓库失败 ' + cr.status + (frag ? ' · ' + frag : ''));
      toast('建仓库失败(' + cr.status + ')——详情在下方，截图发我');
      return;
    }
    saveGhConf({ provider: 'gitee', token: token, owner: owner, repo: GH_DATA_REPO });
    renderSettings();
    cloudBackup('first-sync');
    toast('云备份已开通，数据会自动上云');
  } catch (e) {
    diagMsg('诊断：网络异常 · ' + (e && e.message ? e.message : e));
    toast('开通失败——原因已显示在下方，截图发我');
  }
}

/* GitHub 通道开通 */
async function setupGithub(token) {
  toast('正在开通云备份…');
  try {
    let u = await ghUser(token, 'bearer');
    if (u.status === 401 || u.status === 403) u = await ghUser(token, 'token');  // 换备用鉴权方式再试
    if (!u.ok) {
      let frag = '';
      try { frag = (await u.text()).replace(/<[^>]*>/g, '').slice(0, 100); } catch (e) {}
      diagMsg('诊断：码长 ' + token.length + ' · GitHub 回应 ' + u.status + (frag ? ' · ' + frag : ''));
      toast('开通失败(' + u.status + ')——失败原因已显示在下方，截图发我');
      return;
    }
    const owner = (await u.json()).login;
    const cr = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: GH_DATA_REPO, private: true, description: '体重数据自动云备份（私有）' })
    });
    if (!cr.ok && cr.status !== 422) {
      diagMsg('诊断：身份验证通过(' + owner + ')，但建仓库失败 ' + cr.status);
      toast('建仓库失败(' + cr.status + ')——详情在下方，截图发我');
      return;
    }
    saveGhConf({ provider: 'github', token: token, owner: owner, repo: GH_DATA_REPO });
    renderSettings();
    cloudBackup('first-sync');
    toast('云备份已开通，数据会自动上云');
  } catch (e) {
    diagMsg('诊断：网络异常 · ' + (e && e.message ? e.message : e));
    toast('开通失败——原因已显示在下方，截图发我');
  }
}

function backupJSON() {
  return JSON.stringify({
    app: 'couples-weight', v: 1,
    names: state.names, records: state.records,
    goals: state.goals || { me: null, partner: null },
    exportedAt: new Date().toISOString()
  });
}

function markBackedUp() {
  try { localStorage.setItem(BACKUP_TKEY, String(Date.now())); } catch (e) {}
}

function lastBackupAgeDays() {
  try {
    const t = Number(localStorage.getItem(BACKUP_TKEY));
    if (!t) return null;
    return Math.floor((Date.now() - t) / 86400000);
  } catch (e) { return null; }
}

function storageSelfTest() {
  try {
    const k = 'wt_probe', v = String(Date.now());
    localStorage.setItem(k, v);
    const ok = localStorage.getItem(k) === v;
    localStorage.removeItem(k);
    return ok;
  } catch (e) { return false; }
}

/* ---------- 日期工具 ---------- */
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function dateKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function todayKey() { return dateKey(new Date()); }
function parseKey(k) { const a = k.split('-').map(Number); return new Date(a[0], a[1] - 1, a[2]); }
function addDays(d, n) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
function fmtMD(k) { const d = parseKey(k); return (d.getMonth() + 1) + '/' + d.getDate(); }
function fmtCN(k) { const d = parseKey(k); return (d.getMonth() + 1) + '月' + d.getDate() + '日'; }
function lastNDays(n) {
  const arr = [], now = new Date();
  for (let i = n - 1; i >= 0; i--) arr.push(dateKey(addDays(now, -i)));
  return arr;
}
function weekStartOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - (x.getDay() + 6) % 7); // 周一开始
  return x;
}
function monthRange(offset) { // offset 0=本月 1=上月
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { from: dateKey(d), to: dateKey(end) };
}

/* ---------- 记录查询 ---------- */
function getRec(k) { return state.records[k] || null; }
function sortedKeys() { return Object.keys(state.records).sort(); }
function prevRecord(key, who) {
  const keys = sortedKeys();
  for (let i = keys.length - 1; i >= 0; i--) {
    if (keys[i] < key && typeof state.records[keys[i]][who] === 'number') {
      return { key: keys[i], value: state.records[keys[i]][who] };
    }
  }
  return null;
}
function lastKnown(who) {
  const keys = sortedKeys();
  for (let i = keys.length - 1; i >= 0; i--) {
    const v = state.records[keys[i]][who];
    if (typeof v === 'number') return v;
  }
  return null;
}
function lastKeyOf(who) {
  const keys = sortedKeys();
  for (let i = keys.length - 1; i >= 0; i--) {
    if (typeof state.records[keys[i]][who] === 'number') return keys[i];
  }
  return null;
}
function firstKnown(who) {
  const keys = sortedKeys();
  for (let i = 0; i < keys.length; i++) {
    const v = state.records[keys[i]][who];
    if (typeof v === 'number') return { key: keys[i], value: v };
  }
  return null;
}
function countDays(who) {
  let n = 0;
  Object.keys(state.records).forEach(k => { if (typeof state.records[k][who] === 'number') n++; });
  return n;
}
function avgBetween(from, to, who) {
  const vals = [];
  Object.keys(state.records).forEach(k => {
    if (k >= from && k <= to && typeof state.records[k][who] === 'number') vals.push(state.records[k][who]);
  });
  if (!vals.length) return null;
  return { avg: vals.reduce((s, x) => s + x, 0) / vals.length, count: vals.length };
}

/* ---------- 格式化 ---------- */
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function deltaChip(d, digits) {
  digits = digits || 1;
  if (d === null || d === undefined || isNaN(d)) return '<span class="delta flat">—</span>';
  if (Math.abs(d) < 0.05) return '<span class="delta flat">持平</span>';
  return d < 0
    ? '<span class="delta down">↓' + Math.abs(d).toFixed(digits) + '</span>'
    : '<span class="delta up">↑' + d.toFixed(digits) + '</span>';
}

/* ---------- Toast / 确认弹窗 ---------- */
let toastTimer = null;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
}

let _modalResolve = null;
function askConfirm(msg) {
  return new Promise(res => {
    _modalResolve = res;
    document.getElementById('modal-msg').textContent = msg;
    document.getElementById('modal-wrap').classList.add('show');
  });
}
function closeModal(val) {
  document.getElementById('modal-wrap').classList.remove('show');
  if (_modalResolve) { _modalResolve(val); _modalResolve = null; }
}

/* ---------- 页面切换 ---------- */
function switchTab(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + id));
  document.querySelectorAll('#tabbar .tab').forEach(t => t.classList.toggle('active', t.dataset.page === id));
  const pg = document.getElementById('page-' + id);
  if (pg) pg.scrollTop = 0;
}

/* ================= 记录页 ================= */
function renderRecord() {
  const dateInput = document.getElementById('record-date');
  dateInput.value = currentDate;
  dateInput.max = todayKey();
  document.getElementById('btn-today').style.display = currentDate === todayKey() ? 'none' : '';

  const r = getRec(currentDate);
  const when = currentDate === todayKey() ? '今天' : fmtMD(currentDate) + ' ' + WEEK_LABELS[parseKey(currentDate).getDay()];
  const both = r && typeof r.me === 'number' && typeof r.partner === 'number';

  document.getElementById('record-card').innerHTML =
    '<div class="card">' +
      '<h3 class="card-label">记录 · ' + when + '</h3>' +
      PERSON_IDS.map(p => {
        const has = r && typeof r[p] === 'number';
        const prev = prevRecord(currentDate, p);
        const val = has ? r[p] : esc(drafts[p] || '');
        return '<div class="in-row">' +
          '<span class="in-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span>' +
          '<input class="w-input" type="number" step="0.1" inputmode="decimal" placeholder="' + (prev ? prev.value.toFixed(1) : '0.0') + '" data-person="' + p + '" value="' + val + '">' +
          '<span class="unit">kg</span>' +
        '</div>';
      }).join('') +
      '<button class="btn" data-action="save-all">保存</button>' +
      (both ? '<div class="card-foot">相差 ' + Math.abs(r.me - r.partner).toFixed(1) + ' kg</div>' : '') +
    '</div>';

  document.getElementById('hero-row').innerHTML = heroHTML();
  document.getElementById('record-extra').innerHTML = recordExtraHTML();
}

function heroHTML() {
  const cols = PERSON_IDS.map(p => {
    const cur = lastKnown(p);
    if (cur === null) {
      return '<div class="hero-col">' +
        '<span class="hero-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span>' +
        '<div class="hero-num">--<small>kg</small></div>' +
        '<div class="hero-delta"><span class="delta flat">暂无记录</span></div>' +
      '</div>';
    }
    const lk = lastKeyOf(p);
    const prev = prevRecord(lk, p);
    const start = firstKnown(p);
    return '<div class="hero-col">' +
      '<span class="hero-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span>' +
      '<div class="hero-num">' + cur.toFixed(1) + '<small>kg</small></div>' +
      '<div class="hero-delta">' + deltaChip(prev ? cur - prev.value : null) + '</div>' +
      '<div class="hero-sub">' +
        (start && start.key !== lk ? '起点 ' + start.value.toFixed(1) + ' · ' : '') +
        '已记 ' + countDays(p) + ' 天' +
      '</div>' +
    '</div>';
  }).join('');
  return '<div class="hero">' + cols + '</div>';
}

function recordExtraHTML() {
  const n = Object.keys(state.records).length;
  let html = '';
  if (!n) {
    html += '<div class="card">' +
      '<h3 class="card-label">从旧版搬数据 · 一步完成</h3>' +
      '<p class="sub">旧图标 → 设置 → 复制备份文本，粘贴到下面直接导入。</p>' +
      '<textarea class="json-area import-area" placeholder="粘贴备份文本或存档链接"></textarea>' +
      '<button class="btn" data-action="import-backup">导入</button>' +
    '</div>';
  } else {
    const age = lastBackupAgeDays();
    if (!ghConf && n >= 3 && (age === null || age >= 7)) {
      const tip = age === null ? '从未备份，点这里 3 秒搞定' : '距上次备份 ' + age + ' 天';
      html += '<div class="hint">已记 ' + n + ' 天 · ' + tip + '<button class="linklike" data-action="backup-now">一键备份</button></div>';
    }
  }
  return html;
}

function saveAll() {
  const got = {};
  let invalidName = null;
  PERSON_IDS.forEach(p => {
    const input = document.querySelector('.w-input[data-person="' + p + '"]');
    const raw = input ? input.value.trim() : '';
    if (raw === '') return;
    const v = parseFloat(raw);
    if (isNaN(v) || v < 20 || v > 300) { invalidName = state.names[p]; return; }
    got[p] = Math.round(v * 10) / 10;
  });
  if (invalidName) { toast(invalidName + ' 的体重请填 20 ~ 300 之间'); return; }
  const keys = Object.keys(got);
  if (!keys.length) { toast('先输入至少一位的体重'); return; }
  if (!state.records[currentDate]) state.records[currentDate] = {};
  keys.forEach(p => { state.records[currentDate][p] = got[p]; drafts[p] = ''; });
  if (!persist()) return;
  toast((currentDate === todayKey() ? '今晨' : fmtMD(currentDate)) + ' 已保存');
  renderAll();
}

/* ================= 趋势页 ================= */
function rangeDays() {
  if (trendRange > 0) return lastNDays(trendRange);
  const first = sortedKeys()[0];
  if (!first) return lastNDays(30);
  const arr = [];
  let d = parseKey(first);
  const end = parseKey(todayKey());
  let guard = 0;
  while (d <= end && guard < 2000) { arr.push(dateKey(d)); d = addDays(d, 1); guard++; }
  return arr;
}

function smoothPath(pts) {
  if (pts.length < 2) return '';
  const f = n => +n.toFixed(1);
  let d = 'M ' + f(pts[0].x) + ' ' + f(pts[0].y);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = f(p1.x + (p2.x - p0.x) / 6), c1y = f(p1.y + (p2.y - p0.y) / 6);
    const c2x = f(p2.x - (p3.x - p1.x) / 6), c2y = f(p2.y - (p3.y - p1.y) / 6);
    d += ' C ' + c1x + ' ' + c1y + ', ' + c2x + ' ' + c2y + ', ' + f(p2.x) + ' ' + f(p2.y);
  }
  return d;
}

function buildPersonChart(days, who) {
  const W = 350, H = 158, L = 40, R = 12, T = 14, B = 24;
  const iw = W - L - R, ih = H - T - B;
  const pts = [];
  days.forEach((k, i) => {
    const r = state.records[k];
    if (r && typeof r[who] === 'number') pts.push({ i, v: r[who] });
  });
  if (!pts.length) return { empty: true };

  const vals = pts.map(x => x.v);
  const g = state.goals && typeof state.goals[who] === 'number' ? state.goals[who] : null;
  if (g !== null) vals.push(g);
  let min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
  if (max - min < 0.8) { min -= 0.5; max += 0.5; }
  else { const pp = (max - min) * 0.18; min -= pp; max += pp; }

  const n = days.length;
  const X = i => +(L + (n === 1 ? iw / 2 : iw * i / (n - 1))).toFixed(1);
  const Y = v => +(T + ih * (1 - (v - min) / (max - min))).toFixed(1);

  let grid = '';
  [0, 0.5, 1].forEach(t => {
    const v = min + (max - min) * t, y = Y(v);
    grid += '<line x1="' + L + '" y1="' + y + '" x2="' + (W - R) + '" y2="' + y + '" stroke="var(--sep)" stroke-width="1"/>';
    grid += '<text x="' + (L - 6) + '" y="' + (y + 3.5) + '" text-anchor="end">' + v.toFixed(1) + '</text>';
  });

  const idxs = [...new Set([0, Math.round((n - 1) / 3), Math.round((n - 1) * 2 / 3), n - 1])];
  idxs.forEach(i => {
    const k = days[i];
    const lab = n > 120 ? ('' + parseKey(k).getFullYear()).slice(2) + '/' + (parseKey(k).getMonth() + 1) : fmtMD(k);
    grid += '<text x="' + X(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + lab + '</text>';
  });

  const cpts = pts.map(pt => ({ x: X(pt.i), y: Y(pt.v) }));
  const d = smoothPath(cpts);
  let paths = d ? '<path d="' + d + '" fill="none" stroke="' + COLORS[who] + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' : '';
  const last = cpts[cpts.length - 1];
  paths += '<circle cx="' + last.x + '" cy="' + last.y + '" r="4" fill="var(--bg)" stroke="' + COLORS[who] + '" stroke-width="2.5"/>';
  if (g !== null) {
    paths += '<line x1="' + L + '" y1="' + Y(g) + '" x2="' + (W - R) + '" y2="' + Y(g) + '" stroke="' + COLORS[who] + '" stroke-width="1" stroke-dasharray="4 4" opacity="0.45"/>';
  }

  const svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img">' +
    grid +
    '<line class="scrub-line" x1="0" y1="' + T + '" x2="0" y2="' + (T + ih) + '" stroke="var(--text3)" stroke-width="1" stroke-dasharray="3 3" style="display:none"/>' +
    paths +
    '<rect class="scrub-zone" x="' + L + '" y="' + T + '" width="' + iw + '" height="' + ih + '" fill="transparent" pointer-events="all"/>' +
  '</svg>';

  return { empty: false, svg, pts, days, X, Y, W };
}

function attachScrub(wrap, chart) {
  const svg = wrap.querySelector('svg');
  const tip = wrap.querySelector('.chart-tip');
  const line = svg.querySelector('.scrub-line');

  function hide() { tip.style.display = 'none'; line.style.display = 'none'; }
  function onMove(e) {
    const rect = svg.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (chart.W / rect.width);
    let best = null, bestD = 1e9;
    chart.pts.forEach(pt => {
      const d = Math.abs(chart.X(pt.i) - px);
      if (d < bestD) { bestD = d; best = pt; }
    });
    if (!best) { hide(); return; }
    const gx = chart.X(best.i);
    line.setAttribute('x1', gx); line.setAttribute('x2', gx);
    line.style.display = '';
    tip.innerHTML = '<b>' + fmtMD(chart.days[best.i]) + '</b> · ' + best.v.toFixed(1) + ' kg';
    tip.style.display = 'block';
    const tipW = tip.offsetWidth || 110;
    let cx = gx / chart.W * rect.width;
    cx = Math.max(tipW / 2 + 4, Math.min(rect.width - tipW / 2 - 4, cx));
    tip.style.left = cx + 'px';
  }
  svg.addEventListener('pointerdown', e => { svg.setPointerCapture && svg.setPointerCapture(e.pointerId); onMove(e); });
  svg.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons > 0) onMove(e); });
  svg.addEventListener('pointerup', hide);
  svg.addEventListener('pointercancel', hide);
  svg.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hide(); });
}

function renderTrend() {
  document.querySelectorAll('#range-seg button').forEach(b => {
    b.classList.toggle('active', +b.dataset.range === trendRange);
  });

  const days = rangeDays();
  const anyData = PERSON_IDS.some(p => lastKnown(p) !== null);
  const box = document.getElementById('chart-box');
  if (!anyData) {
    box.innerHTML = '<div class="card chart-card"><div class="chart-empty">还没有数据<br>记下第一笔，曲线就会长出来</div></div>';
    document.getElementById('range-summary').innerHTML = '';
    return;
  }

  const cards = PERSON_IDS.map(p => ({ p, c: buildPersonChart(days, p) }));
  box.innerHTML = cards.map(({ p, c }) => {
    const g = state.goals && typeof state.goals[p] === 'number' ? state.goals[p] : null;
    const cur = lastKnown(p);
    const head = '<div class="chart-head">' +
      '<i class="dotc" style="background:' + COLORS[p] + '"></i>' +
      '<b>' + esc(state.names[p]) + '</b>' +
      (g !== null ? '<span class="s-dim">目标 ' + g.toFixed(1) + '</span>' : '') +
      '<span class="chart-latest">' + (cur !== null ? cur.toFixed(1) + ' kg' : '') + '</span>' +
    '</div>';
    if (c.empty) {
      return '<div class="card chart-card">' + head + '<div class="chart-empty">该时间段暂无记录</div></div>';
    }
    return '<div class="card chart-card">' + head + '<div class="chart-wrap">' + c.svg + '<div class="chart-tip"></div></div></div>';
  }).join('');

  const nonEmpty = cards.filter(x => !x.c.empty);
  box.querySelectorAll('.chart-wrap').forEach((wrap, idx) => {
    attachScrub(wrap, nonEmpty[idx].c);
  });
  document.getElementById('range-summary').innerHTML = rangeSummaryHTML(days);
}

function rangeSummaryHTML(days) {
  const from = days[0], to = days[days.length - 1];
  const rows = PERSON_IDS.map(p => {
    const cur = lastKnown(p);
    if (cur === null) return '';
    const inRange = [];
    days.forEach(k => {
      const v = state.records[k] ? state.records[k][p] : undefined;
      if (typeof v === 'number') inRange.push({ k, v });
    });
    if (!inRange.length) {
      return '<div class="rs-row"><span class="rs-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span>' +
        '<span class="s-dim">该时间段暂无记录</span></div>';
    }
    const first = inRange[0], last = inRange[inRange.length - 1];
    const avg = inRange.reduce((s, x) => s + x.v, 0) / inRange.length;
    const span = last.v - first.v;
    const title = trendRange === 0 ? '全部' : trendRange + '天';
    return '<div class="rs-row">' +
      '<span class="rs-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span>' +
      '<span class="rs-main">' + first.v.toFixed(1) + ' → ' + last.v.toFixed(1) + '</span>' +
      deltaChip(span) +
      '<span class="rs-avg">均 ' + avg.toFixed(1) + '</span>' +
    '</div>';
  }).filter(Boolean).join('');
  if (!rows) return '';
  return '<div class="card"><h3 class="card-label">' + (trendRange === 0 ? '全部' : trendRange + '天') + '概览 · 期初 → 现在</h3>' + rows + '</div>';
}

/* ================= 统计页 ================= */
function periodRow(p, cur, prev, unitLabel) {
  const name = '<span class="s-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span>';
  if (!cur && !prev) {
    return '<div class="s-row">' + name + '<span class="s-dim">暂无记录</span></div>';
  }
  const curTxt = cur ? '<span class="s-val">' + cur.avg.toFixed(1) + '</span><span class="s-dim"> ' + cur.count + '天</span>' : '<span class="s-dim">' + unitLabel + '未记录</span>';
  const delta = (cur && prev) ? deltaChip(cur.avg - prev.avg) : '<span class="delta flat">—</span>';
  const prevTxt = prev ? '<span class="s-dim">上期 ' + prev.avg.toFixed(1) + '</span>' : '<span class="s-dim">上期无数据</span>';
  return '<div class="s-row">' + name + curTxt + '<span class="s-right">' + prevTxt + delta + '</span></div>';
}

function renderStats() {
  const keys = sortedKeys();
  let html = '';

  /* 本周 vs 上周 */
  const ws = weekStartOf(new Date());
  const we = dateKey(addDays(ws, 6));
  const ps = dateKey(addDays(ws, -7)), pe = dateKey(addDays(ws, -1));
  html += '<div class="card"><h3 class="card-label">本周 vs 上周 · 平均体重</h3>';
  html += PERSON_IDS.map(p =>
    periodRow(p, avgBetween(dateKey(ws), we, p), avgBetween(ps, pe, p), '本周')
  ).join('');
  html += '</div>';

  /* 本月 vs 上月 */
  const m0 = monthRange(0), m1 = monthRange(1);
  html += '<div class="card"><h3 class="card-label">本月 vs 上月 · 平均体重</h3>';
  html += PERSON_IDS.map(p =>
    periodRow(p, avgBetween(m0.from, m0.to, p), avgBetween(m1.from, m1.to, p), '本月')
  ).join('');
  html += '</div>';

  /* 累计变化 */
  if (keys.length) {
    html += '<div class="card"><h3 class="card-label">累计变化 · 从第一条记录起</h3>';
    html += PERSON_IDS.map(p => {
      const first = firstKnown(p);
      if (!first) return '<div class="s-row"><span class="s-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span><span class="s-dim">暂无记录</span></div>';
      const lk = lastKeyOf(p);
      const cur = state.records[lk][p];
      const delta = cur - first.value;
      const spanDays = (parseKey(lk) - parseKey(first.key)) / 86400000;
      const weeks = spanDays / 7;
      const rate = weeks >= 1 ? (delta / weeks) : null;
      const rateTxt = rate !== null && Math.abs(rate) >= 0.005
        ? '<span class="s-dim">约 ' + (rate < 0 ? '↓' : '↑') + Math.abs(rate).toFixed(2) + ' kg/周</span>'
        : '<span class="s-dim">—</span>';
      return '<div class="s-row">' +
        '<span class="s-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span>' +
        '<span class="s-val">' + first.value.toFixed(1) + ' → ' + cur.toFixed(1) + '</span>' +
        '<span class="s-right">' + rateTxt + deltaChip(delta) + '</span>' +
      '</div>' +
      '<div class="s-row" style="border:0;padding-top:0">' +
        '<span class="s-dim" style="margin-left:26px">起点 ' + fmtCN(first.key) + ' · 已记 ' + countDays(p) + ' 天 · 跨度 ' + Math.max(1, Math.round(spanDays)) + ' 天</span>' +
      '</div>';
    }).join('');
    html += '</div>';
  }

  html += historyHTML();
  document.getElementById('stats-body').innerHTML = html;
}

function historyHTML() {
  const keys = sortedKeys().reverse();
  if (!keys.length) return '<div class="card"><h3 class="card-label">全部记录</h3><p class="sub">还没有记录</p></div>';
  const tk = todayKey();
  let html = '<div class="card list-card"><h3 class="card-label" style="padding:12px 0 4px">全部记录 · 点按可修改</h3>';
  let lastYM = '';
  keys.forEach(k => {
    const r = state.records[k], d = parseKey(k);
    const ym = d.getFullYear() + '年' + (d.getMonth() + 1) + '月';
    if (ym !== lastYM) { html += '<div class="m-sep">' + ym + '</div>'; lastYM = ym; }
    const vals = PERSON_IDS.map(p => {
      if (typeof r[p] !== 'number') return '<div class="h-v"><span class="hv-name" style="color:' + COLORS[p] + '">' + esc(state.names[p]) + '</span><span class="s-dim">未记录</span></div>';
      const prev = prevRecord(k, p);
      return '<div class="h-v"><span class="hv-name" style="color:' + COLORS[p] + '">' + esc(state.names[p]) + '</span><b>' + r[p].toFixed(1) + '</b>' + deltaChip(prev ? r[p] - prev.value : null) + '</div>';
    }).join('');
    html += '<div class="h-row" data-key="' + k + '">' +
      '<div class="h-date"><div class="h-d1">' + fmtMD(k) + '</div><div class="h-d2">' + WEEK_LABELS[d.getDay()] + (k === tk ? ' · 今天' : '') + '</div></div>' +
      '<div class="h-vals">' + vals + '</div>' +
      '<button class="h-del" data-action="del-day" data-key="' + k + '" aria-label="删除">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 7h14M10 7V5h4v2M8 7l1 12h6l1-12"/></svg>' +
      '</button>' +
    '</div>';
  });
  html += '</div>';
  return html;
}

/* ================= 设置 ================= */
function openSettings() {
  renderSettings();
  document.getElementById('sheet-mask').classList.add('show');
  document.getElementById('settings-sheet').classList.add('show');
}
function closeSettings() {
  document.getElementById('sheet-mask').classList.remove('show');
  document.getElementById('settings-sheet').classList.remove('show');
}

function renderSettings() {
  const days = Object.keys(state.records).length;
  let size = 0;
  try { size = (localStorage.getItem(STORE_KEY) || '').length; } catch (e) {}
  const earliest = sortedKeys()[0];
  const storeOk = storageSelfTest();
  const age = lastBackupAgeDays();
  const backupTxt = age === null ? '从未备份' : (age === 0 ? '今天刚备份过' : age + ' 天前');

  document.getElementById('settings-body').innerHTML =
    '<div class="card">' +
      '<h3 class="card-label">称呼</h3>' +
      '<label class="field"><span>我的称呼</span><input class="text-input" id="name-me" value="' + esc(state.names.me) + '" maxlength="8"></label>' +
      '<label class="field"><span>对方的称呼</span><input class="text-input" id="name-partner" value="' + esc(state.names.partner) + '" maxlength="8"></label>' +
      '<button class="btn" data-action="save-names">保存称呼</button>' +
    '</div>' +
    '<div class="card">' +
      '<h3 class="card-label">目标体重（选填）</h3>' +
      '<p class="sub">设置后会以虚线显示在趋势图上。</p>' +
      '<label class="field"><span>' + esc(state.names.me) + '</span><input class="text-input" id="goal-me" type="number" step="0.1" inputmode="decimal" value="' + (state.goals.me !== null ? state.goals.me : '') + '" placeholder="选填"></label>' +
      '<label class="field"><span>' + esc(state.names.partner) + '</span><input class="text-input" id="goal-partner" type="number" step="0.1" inputmode="decimal" value="' + (state.goals.partner !== null ? state.goals.partner : '') + '" placeholder="选填"></label>' +
      '<button class="btn" data-action="save-goals">保存目标</button>' +
    '</div>' +
    (ghConf
      ? '<div class="card">' +
        '<h3 class="card-label">自动云备份</h3>' +
        '<p class="sub">已开通 · 每次记录后数据自动上云（' + (ghConf.provider === 'gitee' ? 'Gitee 国内通道' : 'GitHub') + ' · 私有仓库 ' + esc(ghConf.owner) + '/' + esc(ghConf.repo) + '，只有你能看）</p>' +
        '<p class="s-dim" style="margin-bottom:10px">上次同步：' + lastSyncText() + '</p>' +
        '<button class="btn" data-action="cloud-sync">立即同步</button>' +
        '<button class="btn ghost" data-action="cloud-restore">从云端恢复（换手机 / 误删时用）</button>' +
        '<button class="btn danger" data-action="cloud-off">关闭自动云备份</button>' +
      '</div>'
      : '<div class="card">' +
        '<h3 class="card-label">自动云备份</h3>' +
        '<p class="sub">开通后数据自动上云，永不用手动备份。推荐用 Gitee 私人令牌（国内网络稳定）。粘贴令牌：</p>' +
        '<textarea class="json-area cloud-area" placeholder="粘贴配置链接或授权码" spellcheck="false"></textarea>' +
        '<button class="btn" data-action="cloud-setup">开通自动云备份</button>' +
        '<p class="s-dim" id="cloud-diag" style="display:none;margin-top:10px;color:#b91c1c;word-break:break-all">' + esc(diagFromStorage()) + '</p>' +
      '</div>') +
    '<div class="card">' +
      '<h3 class="card-label">备份与恢复（手动）</h3>' +
      '<p class="sub">开通云备份后这里一般用不上。备份文本可存到备忘录或微信。</p>' +
      '<button class="btn" data-action="backup-now">一键备份（弹出分享面板）</button>' +
      '<button class="btn ghost" data-action="copy-link">复制存档链接</button>' +
      '<div class="divider">恢复数据 · 粘贴进来，点一下就导入</div>' +
      '<textarea class="import-area json-area" placeholder="粘贴备份文本或存档链接" spellcheck="false"></textarea>' +
      '<button class="btn" data-action="import-backup">导入并覆盖</button>' +
      '<p class="s-dim" style="margin-top:10px">状态：' + backupTxt + '</p>' +
    '</div>' +
    '<div class="card">' +
      '<h3 class="card-label">数据状态</h3>' +
      '<p class="sub">共 ' + days + ' 天' + (earliest ? ' · 自 ' + fmtCN(earliest) : '') + ' · 约 ' + (size / 1024).toFixed(1) + ' KB<br>存储：' + (storeOk ? '正常' : '异常（检查是否无痕模式）') + ' · 上次备份：' + backupTxt + '</p>' +
    '</div>' +
    '<div class="card">' +
      '<h3 class="card-label">安装到桌面</h3>' +
      '<p class="sub">iPhone · Safari 打开本页 → 分享 → 添加到主屏幕<br>Android · Chrome → 右上角菜单 → 添加到主屏幕</p>' +
    '</div>' +
    '<div class="card">' +
      '<button class="btn danger" data-action="clear-all">清空全部记录</button>' +
      '<p class="sub" style="text-align:center;margin-top:10px">V8 极简版 · 本机存储 + GitHub 云备份 · 不上传任何第三方服务器</p>' +
    '</div>';
}

function saveNames() {
  state.names.me = (document.getElementById('name-me').value.trim()) || DEFAULT_NAMES.me;
  state.names.partner = (document.getElementById('name-partner').value.trim()) || DEFAULT_NAMES.partner;
  persist();
  renderAll();
  toast('称呼已保存');
}
function saveGoals() {
  state.goals = sanitizeGoals({
    me: document.getElementById('goal-me').value.trim(),
    partner: document.getElementById('goal-partner').value.trim()
  });
  persist();
  renderAll();
  toast('目标已保存');
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) {}
  document.body.removeChild(ta);
  if (ok) { markBackedUp(); toast('已复制，快去粘贴保存'); }
  else toast('复制失败，请截图保存或手动复制');
}

function copyBackup() {
  const json = backupJSON();
  const done = () => { markBackedUp(); renderRecord(); toast('备份文本已复制'); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(json).then(done).catch(() => fallbackCopy(json));
  } else {
    fallbackCopy(json);
  }
}

/* 一键备份：优先弹系统分享面板（iOS 可直接存备忘录/发微信），不行就复制 */
function oneClickBackup() {
  const json = backupJSON();
  if (navigator.share) {
    navigator.share({ title: '体重小本本备份 ' + todayKey(), text: json })
      .then(() => { markBackedUp(); renderRecord(); toast('备份完成'); })
      .catch(err => { if (err && err.name !== 'AbortError') copyBackup(); });
  } else {
    copyBackup();
  }
}
function copyLink() {
  const link = location.origin + location.pathname + '#r=' + btoa(unescape(encodeURIComponent(backupJSON())));
  const done = () => { markBackedUp(); renderRecord(); toast('存档链接已复制'); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(link).then(done).catch(() => fallbackCopy(link));
  } else {
    fallbackCopy(link);
  }
}

function parseBackupText(txt) {
  let obj = null;
  try { obj = JSON.parse(txt); } catch (e) { return null; }
  const recs = sanitizeRecords(obj && obj.records);
  if (!obj || !Object.keys(recs).length) return null;
  return {
    names: {
      me: (obj.names && typeof obj.names.me === 'string' && obj.names.me.trim()) || state.names.me,
      partner: (obj.names && typeof obj.names.partner === 'string' && obj.names.partner.trim()) || state.names.partner
    },
    records: recs,
    goals: sanitizeGoals(obj.goals)
  };
}

function importBackup() {
  const areas = [...document.querySelectorAll('.import-area')];
  const area = areas.find(a => a.value.trim()) || areas[0];
  if (!area) { toast('找不到输入框'); return; }
  let txt = area.value.trim();
  if (!txt) { toast('先粘贴备份文本或存档链接'); return; }
  const m = txt.match(/#r=([A-Za-z0-9+/=%]{8,})/);
  if (m) {
    try {
      const b64 = m[1].replace(/%3D/gi, '=');
      txt = decodeURIComponent(escape(atob(b64)));
    } catch (e) { toast('存档链接数据无效'); return; }
  }
  const remote = parseBackupText(txt);
  if (!remote) { toast('内容不是有效的备份数据'); return; }
  const count = Object.keys(remote.records).length;
  askConfirm('将恢复 ' + count + ' 天的记录，并覆盖当前数据，确定吗？').then(ok => {
    if (!ok) return;
    state = remote;
    persist();
    renderAll();
    area.value = '';
    toast('已恢复 ' + count + ' 天记录');
  });
}

function clearAll() {
  askConfirm('将删除全部体重记录且无法恢复，确定吗？（建议先备份）').then(ok => {
    if (!ok) return;
    state.records = {};
    persist();
    renderAll();
    toast('已清空');
  });
}

/* ================= 事件绑定 ================= */
document.addEventListener('click', e => {
  const tab = e.target.closest('#tabbar .tab');
  if (tab) { switchTab(tab.dataset.page); return; }

  const seg = e.target.closest('#range-seg button');
  if (seg) { trendRange = +seg.dataset.range; renderTrend(); return; }

  const act = e.target.closest('[data-action]');
  if (act) {
    const a = act.dataset.action;
    if (a === 'save-all') saveAll();
    else if (a === 'goto-today') { currentDate = todayKey(); drafts = { me: '', partner: '' }; renderAll(); }
    else if (a === 'open-settings') openSettings();
    else if (a === 'close-settings') closeSettings();
    else if (a === 'save-names') saveNames();
    else if (a === 'save-goals') saveGoals();
    else if (a === 'copy-backup') copyBackup();
    else if (a === 'backup-now') oneClickBackup();
    else if (a === 'cloud-setup') setupCloud((document.querySelector('.cloud-area') || {}).value || '');
    else if (a === 'cloud-sync') cloudBackup('manual').then(ok => toast(ok ? '已同步到云端' : '同步失败，检查网络'));
    else if (a === 'cloud-restore') cloudRestore();
    else if (a === 'cloud-off') askConfirm('关闭后数据只存本机，需要手动备份。确定关闭？').then(ok => {
      if (!ok) return;
      saveGhConf(null);
      renderSettings();
      toast('已关闭自动云备份');
    });
    else if (a === 'copy-link') copyLink();
    else if (a === 'import-backup') importBackup();
    else if (a === 'clear-all') clearAll();
    else if (a === 'modal-cancel') closeModal(false);
    else if (a === 'modal-ok') closeModal(true);
    else if (a === 'del-day') {
      e.stopPropagation();
      const k = act.dataset.key;
      askConfirm('删除 ' + fmtCN(k) + ' 的记录？').then(ok => {
        if (!ok) return;
        delete state.records[k];
        if (currentDate === k) currentDate = todayKey();
        persist();
        renderAll();
        toast('已删除');
      });
    }
    return;
  }

  const row = e.target.closest('.h-row[data-key]');
  if (row) {
    currentDate = row.dataset.key;
    drafts = { me: '', partner: '' };
    switchTab('record');
    renderAll();
    toast('正在编辑 ' + fmtMD(currentDate) + '，改完点保存');
  }
});

document.addEventListener('input', e => {
  const inp = e.target.closest('.w-input');
  if (inp) drafts[inp.dataset.person] = inp.value;
});

document.addEventListener('change', e => {
  if (e.target.id === 'record-date') {
    currentDate = e.target.value || todayKey();
    drafts = { me: '', partner: '' };
    renderAll();
  }
});

/* ---------- 存档链接自动恢复 ---------- */
(function initHashImport() {
  const m = location.hash.match(/#r=([A-Za-z0-9+/=%]{8,})/);
  if (!m) return;
  try {
    const b64 = m[1].replace(/%3D/gi, '=');
    const txt = decodeURIComponent(escape(atob(b64)));
    const remote = parseBackupText(txt);
    history.replaceState(null, '', location.pathname + location.search);
    if (!remote) return;
    const n = Object.keys(remote.records).length;
    if (!sortedKeys().length) {
      state = remote;
      persist();
      setTimeout(() => toast('已导入 ' + n + ' 天记录'), 400);
    } else {
      askConfirm('存档链接包含 ' + n + ' 天记录，覆盖当前数据并导入？').then(ok => {
        if (!ok) return;
        state = remote;
        persist();
        renderAll();
        toast('已导入 ' + n + ' 天记录');
      });
    }
  } catch (e) {}
})();

/* ---------- 配置链接自动开通云备份（#k=token，读完即清） ---------- */
(function initHashToken() {
  const m = location.hash.match(/#k=([A-Za-z0-9._~\/+=-]{20,})/);
  if (!m) return;
  history.replaceState(null, '', location.pathname + location.search);
  if (ghConf) return;
  setupCloud(m[1]);
})();

/* ---------- 启动 ---------- */
function renderAll() {
  renderRecord();
  renderTrend();
  renderStats();
}
renderAll();
