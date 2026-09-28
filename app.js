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

/* 版本与更新日志：每次部署必须更新 APP_VERSION 和这里的第一条
   作用：优化后用户能在设置页核对「真的更新了」——尤其 bug 类修复界面看不出变化 */
const APP_VERSION = 'V35';
const CHANGELOG = [
  { v: 'V35', d: '9月29日', items: [
    '自动找回数据：打开 App 时如果发现本地是空的，而云端有备份——自动把记录拉回来，不用点任何东西'
  ]},
  { v: 'V34', d: '9月29日', items: [
    '紧急修复：重开 App 显示空数据（记录其实都在手机里没丢）——器械功能的一个定义顺序错误导致数据读取中断，已修正，重开即恢复全部记录'
  ]},
  { v: 'V33', d: '9月29日', items: [
    '「＋」格文字重叠修好了：紧凑卡片里只显示「＋ 填体脂率」短文案，大卡模式才显示完整说明——再也不会挤成一团乱码',
    '日历缩略图里直接带每天体重数字（蓝字=你的、橙字=Tina），一眼看完一整月，不用再点进去看'
  ]},
  { v: 'V32', d: '9月28日', items: [
    '新增 5 套主题配色：经典蓝 / 暖阳橙 / 薄荷绿 / 海盐蓝 / 暗夜黑——设置页色块一点全 App 换装，暗夜模式晚上看数据不刺眼',
    '设置页新增「我的运动与器械」：勾上你会的和家里有的（快走/慢跑/跳绳/跑步机/游泳/骑行/哑铃/弹力带/瑜伽垫/徒手），一键按器械重排周计划，没勾的绝不出现'
  ]},
  { v: 'V31', d: '9月28日', items: [
    '全部记录的月份头右侧新增「📅 日历」切换：点一下，这个月变成日历缩略图（彩点=两人记录），再点切回列表——明细和全月一览两种看法随便换',
    '统计页新增「每周减脂安排」：周一到周日每天练什么一目了然（默认快走/力量/有氧轮休模板），点任何一天换成你要的运动，自动保存'
  ]},
  { v: 'V30', d: '9月28日', items: [
    '全部记录按月折叠：默认只展开本月，历史月份收起成一行（「2026年8月 · 2 天」），点月份头展开/收起——不用再无限下滑'
  ]},
  { v: 'V29', d: '9月28日', items: [
    '月历的「记了 28/28 天」说人话了：本月显示「截至 9/28，28 天全记了」（没记全会显示 差几天），历史月份显示「这个月记了 X/30 天」——不再像“9月只有28天”'
  ]},
  { v: 'V28', d: '9月28日', items: [
    '月历点日期不再跳转：点某天就地展开「当天详情」——两人体重、体脂/腰围/内脏脂肪/肌肉、备注，一看全知道；想改再点「修改这天的记录」',
    '翻月按钮修好了（之前被「记了28/28天」挤没了）：现在左右箭头常驻，任何年份任何月份随便翻'
  ]},
  { v: 'V27', d: '9月28日', items: [
    '保存终于有感觉了：点保存 → 按钮立刻变绿色「✓ 已保存」1.6 秒后恢复；底部同时弹出加粗的确认提示「✓ 今天已保存，数据记上了」——双保险，不成功不吭声',
    '所有提示气泡加大加粗加深影，一眼能看见'
  ]},
  { v: 'V26', d: '9月27日', items: [
    '周报表看得懂了：每行先标「9月第1周」再加日期（8/31~9/6），最后一行挂蓝色「本周」标——不用再猜哪行是哪周'
  ]},
  { v: 'V25', d: '9月27日', items: [
    '图表可读性重做：实线加粗、趋势虚线改碎点样式一眼区分；坐标数字加大加深、加横向参考线；图更高更透气',
    '线型说明改成三个徽章一行（实线·每天记录 / 虚线·趋势平滑 / 灰线·目标），长段落说明删掉，「按住看数值」移到图表下方',
    '设置页每张卡顶部加重点句：云备份卡一句「数据已自动上云，手机丢了记录都在」，不用再啃说明文字'
  ]},
  { v: 'V24', d: '9月27日', items: [
    '趋势页大搬家：7/30/90天筛选器搬进「体重走势」卡里，紧贴图表——点一下图立刻变，再也不用在页顶瞎按；走势卡提到整页最上面',
    '设置页全面整容：输入框有了边框和底色、聚焦变蓝，按钮从「一整条大蓝条」变成紧凑分组',
    '清空数据上双保险：已开云备份的，清空前自动先备份一份到云端（误触也能一键找回）；没开云备份的会强提醒先备份；云备份失败时二次警告',
    '新增「换新手机怎么迁移数据」3 步指引：设置 → 自动云备份卡里点开就看'
  ]},
  { v: 'V23', d: '9月27日', items: [
    '「连续打卡」「里程碑」整组下架——你要的是数据不是鸡血，这类东西全删了',
    '没填过的字段不再玩失踪：卡片上显示虚线「＋」格，点它直接跳到记录页的填写区，填完回来数字就位',
    '记录页入口写明白：按钮现在叫「+ 记体脂 / 腰围 / 内脏脂肪」，不再只写腰围'
  ]},
  { v: 'V22', d: '9月27日', items: [
    '卡片字段扩容：新增「内脏脂肪」「肌肉量」两个可选格子（小米秤抄录的数据，有就显示），可选字段到 7 个',
    '每个数字自带人话：BMI → 「BMI 体重指数」，内脏脂肪 → 「级 内脏脂肪」；设置面板里每个指标都有一行解释（BMI 18.5~24 正常、内脏脂肪 5 级以下健康…）',
    '趋势页默认改 7 天（更直观），7/30/90 天随你切，选完记住——下次打开还是你上次选的',
    '统计页大扫除：三张对比卡合并成一张「重点变化」——结论式大字（72.1 → 71.2 ↓0.9）+ 一句话判断（有效果/波动正常），「上期无数据 —」这类废话占位全部砍掉'
  ]},
  { v: 'V21', d: '9月27日', items: [
    '首页两张体重卡升级为仪表卡：起点→现在→目标的进度条一眼看到走了多远，距目标/BMI/体脂/腰围/连续打卡各占一格，不再挤成一行小字',
    '卡片右上角新增 ⚙️ 设置：卡片大小（紧凑并排/大卡整行）、谁在前谁在后、显示哪些数据，全部自己定，自动保存',
    '卡片顶部加了「今天」日期徽章，一眼确认数据新鲜度'
  ]},
  { v: 'V20', d: '9月27日', items: [
    '日期选择完全重做：扔掉 iPhone 系统自带的丑弹窗，换成和 App 一体的底部日历面板——点日期胶囊滑出，选中即关，顺滑跟手',
    '日期面板里也标出了哪些天有记录（带彩点），补录更直观',
    '修复补记提示显示「连缺 0 天」的文案错误'
  ]},
  { v: 'V19', d: '9月27日', items: [
    '打卡月历：趋势页顶部新增整月日历，彩点=记了，灰点=忘了，缺哪天一目了然；点任何一天直接去补录',
    '补记提醒：打开 App 发现昨天没记，记录页顶部会出现提示条，点「去补记」一步到位',
    '每天可以写备注了：吃火锅、熬夜、运动……保存后显示在历史记录里，方便回看体重波动的原因',
    '没记录的日子不再是尴尬的空白，月历和提醒都会帮你把坑补上'
  ]},
  { v: 'V18', d: '9月26日', items: [
    '界面全面升级为苹果设计语言：灰底白卡分组、大粗数字、涨跌徽章胶囊化——细节的格调和层次感',
    '体成分报告改为指标瓦片：每个数字独立一块，一眼锁定（对标 Withings 的排版）',
    '页面切换动效、按钮按压手感、弹窗圆角等微调，整体更顺滑'
  ]},
  { v: 'V17', d: '9月25日', items: [
    '对标 Withings / Renpho / Happy Scale：体成分报告可抄录（内脏脂肪·肌肉量·基础代谢），统计页新增「体成分」卡',
    '体重曲线新增趋势虚线（滑动平均）：过滤单日波动，看真实走向——专业减重 App 的核心功能',
    'BMI 自动算：设置里填一次身高，记录页体重旁自动显示，不用手填',
    '深色模式补全：自动跟随手机系统明暗切换'
  ]},
  { v: 'V16.1', d: '9月24日', items: [
    '设置页新增「指标怎么看」：体重/体脂/腰围/内脏脂肪等每个指标，多久看一次、什么标准、一句话意思'
  ]},
  { v: 'V16', d: '9月24日', items: [
    '设置页新增这个「版本与更新」卡片——以后每次优化都会在这里留痕',
    '底部版本号从写死的「V8」改成自动跟随（以前一直是错的）'
  ]},
  { v: 'V15', d: '9月23日', items: [
    '体脂率输入回归：记录页「+ 记腰围 / 体脂」展开后，体脂框直接抄小米秤的数'
  ]},
  { v: 'V13.1', d: '9月22日', items: [
    '全面体检修了 7 处问题，大多是看不见的后台修正，所以界面看着没变：周报里 Tina 的周变化箭头（之前一直显示「—」）、本月复盘「已过天数」算错、腰围提示显示乱码、曲线悬浮数值单位等',
    '本月复盘卡底部标明「历史数据永久保留」'
  ]},
  { v: 'V13', d: '9月22日', items: [
    '统计页顶部新增「本月复盘」卡：每月 1 号新开一页，之前的记录一条不动',
    '腰围超过 5 天没量，按钮自动改成提醒文案',
    '腰围曲线下方新增一句话解读'
  ]}
];

let state = loadState();
let currentDate = todayKey();   // 记录页当前编辑的日期
let trendRange = (state.ui && state.ui.trendRange) || 7;  // 趋势图天数，0 = 全部；默认 7 天（直观），记住上次选择
let drafts = { me: '', partner: '', me_waist: '', partner_waist: '', me_bf: '', partner_bf: '', me_vf: '', partner_vf: '', me_mm: '', partner_mm: '', me_bmr: '', partner_bmr: '' };
function resetDrafts() { drafts = { me: '', partner: '', me_waist: '', partner_waist: '', me_bf: '', partner_bf: '', me_vf: '', partner_vf: '', me_mm: '', partner_mm: '', me_bmr: '', partner_bmr: '' }; }
let extraOpen = false; /* 记录页腰围/体脂折叠区 */
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
  /* 扩展字段白名单：腰围 cm / 体脂率 %（v11） / 体成分（v17，抄小米完整报告） */
  const EXTRA = [
    ['me_waist', 40, 200], ['partner_waist', 40, 200],
    ['me_bf', 3, 70], ['partner_bf', 3, 70],
    ['me_vf', 1, 30], ['partner_vf', 1, 30],
    ['me_mm', 10, 90], ['partner_mm', 10, 90],
    ['me_bmr', 800, 4000], ['partner_bmr', 800, 4000]
  ];
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
    EXTRA.forEach(f => {
      const v = Number(r[f[0]]);
      if (r[f[0]] !== null && r[f[0]] !== undefined && r[f[0]] !== '' && isFinite(v) && v >= f[1] && v <= f[2]) {
        clean[f[0]] = Math.round(v * 10) / 10;
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

function sanitizeHeights(h) {
  const out = { me: null, partner: null };
  PERSON_IDS.forEach(p => {
    if (h && typeof h === 'object' && h[p] !== null && h[p] !== undefined && h[p] !== '') {
      const v = Number(h[p]);
      if (isFinite(v) && v >= 40 && v <= 250) out[p] = Math.round(v);
    }
  });
  return out;
}

function bmiOf(p, weightKg) {
  const h = state.heights && state.heights[p];
  if (!h || typeof weightKg !== 'number') return null;
  return weightKg / (h / 100 * h / 100);
}

/* 我的运动与器械（V32）：勾完自动重排周计划 */
const EQUIP_LIST = [
  { k: 'walk',   n: '快走/散步',   type: 'cardio' },
  { k: 'run',    n: '慢跑',        type: 'cardio' },
  { k: 'jump',   n: '跳绳',        type: 'cardio' },
  { k: 'tread',  n: '跑步机',      type: 'cardio' },
  { k: 'swim',   n: '游泳',        type: 'cardio' },
  { k: 'ride',   n: '骑行',        type: 'cardio' },
  { k: 'body',   n: '徒手力量',    type: 'strength' },
  { k: 'dumb',   n: '哑铃',        type: 'strength' },
  { k: 'band',   n: '弹力带',      type: 'strength' },
  { k: 'yoga',   n: '瑜伽垫',      type: 'soft' }
];


/* 首页卡片偏好：布局 / 顺序 / 显示哪些指标（V21） */
function sanitizeUI(u) {
  const d = { heroLayout: 'grid', heroOrder: PERSON_IDS.slice(), heroMetrics: { goal: true, bmi: true, bf: true, waist: true, vf: true, mm: true } };
  if (!u || typeof u !== 'object') return d;
  if (u.heroLayout === 'stack' || u.heroLayout === 'grid') d.heroLayout = u.heroLayout;
  if (Array.isArray(u.heroOrder) && u.heroOrder.length === 2 && PERSON_IDS.includes(u.heroOrder[0]) && PERSON_IDS.includes(u.heroOrder[1]) && u.heroOrder[0] !== u.heroOrder[1]) d.heroOrder = u.heroOrder.slice();
  if (u.heroMetrics && typeof u.heroMetrics === 'object') Object.keys(d.heroMetrics).forEach(k => { if (typeof u.heroMetrics[k] === 'boolean') d.heroMetrics[k] = u.heroMetrics[k]; });
  if (typeof u.trendRange === 'number' && [0, 7, 30, 90].includes(u.trendRange)) d.trendRange = u.trendRange;
  if (Array.isArray(u.weekPlan)) d.weekPlan = WEEK_PLAN_DEFAULT.map((def, i) => (typeof u.weekPlan[i] === 'string' && u.weekPlan[i].trim()) ? u.weekPlan[i].trim().slice(0, 20) : def);
  if (typeof u.theme === 'string' && ['classic', 'warm', 'mint', 'ocean', 'dark'].includes(u.theme)) d.theme = u.theme;
  if (Array.isArray(u.equip)) d.equip = u.equip.filter(x => typeof x === 'string' && EQUIP_LIST.some(e => e.k === x)).slice(0, 12);
  return d;
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
          goals: sanitizeGoals(parsed.goals),
          heights: sanitizeHeights(parsed.heights),
          ui: sanitizeUI(parsed.ui)
        };
      }
    }
  } catch (e) { console.warn('读取存档失败', e); }
  return { names: { ...DEFAULT_NAMES }, records: {}, goals: { me: null, partner: null }, heights: { me: null, partner: null }, ui: sanitizeUI(null) };
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

/* V35 自动恢复：本地空 + 云端有备份 → 启动时自动拉回，零点击
   安全论证：仅当本地 0 条记录时触发，云端数据进来不覆盖任何本地内容（本地没东西可覆盖） */
async function autoRestore() {
  try {
    if (sortedKeys().length > 0) return; /* 本地有数据，绝不碰 */
    if (!ghConf || !ghConf.token) return; /* 没开云备份，无从恢复 */
    let j;
    if (ghConf.provider === 'gitee') {
      const g = await fetch('https://api.gitee.com/api/v5/repos/' + ghConf.owner + '/' + ghConf.repo + '/contents/data/backup.json?access_token=' + encodeURIComponent(ghConf.token));
      if (!g.ok) return;
      j = await g.json();
    } else {
      const g = await fetch(ghBase(), { headers: { Authorization: 'Bearer ' + ghConf.token, Accept: 'application/vnd.github+json' } });
      if (!g.ok) return;
      j = await g.json();
    }
    const txt = decodeURIComponent(escape(atob(String(j.content).replace(/\n/g, ''))));
    const remote = parseBackupText(txt);
    const count = remote ? Object.keys(remote.records).length : 0;
    if (!remote || !count) return;
    remote.ui = sanitizeUI(remote.ui);
    state = remote;
    persist();
    renderAll();
    applyTheme();
    toast('✓ 检测到本地无数据，已自动从云端恢复 ' + count + ' 天记录');
  } catch (e) { /* 静默：网络不好下次重开再试 */ }
}

/* V35 手动恢复入口（设置页）——自动恢复失败时的兜底 */
async function cloudPullText() {
  let j;
  if (ghConf.provider === 'gitee') {
    const g = await fetch('https://api.gitee.com/api/v5/repos/' + ghConf.owner + '/' + ghConf.repo + '/contents/data/backup.json?access_token=' + encodeURIComponent(ghConf.token));
    if (!g.ok) return null;
    j = await g.json();
  } else {
    const g = await fetch(ghBase(), { headers: { Authorization: 'Bearer ' + ghConf.token, Accept: 'application/vnd.github+json' } });
    if (!g.ok) return null;
    j = await g.json();
  }
  return decodeURIComponent(escape(atob(String(j.content).replace(/\n/g, ''))));
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
      remote.ui = sanitizeUI(remote.ui);
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
    ui: state.ui || sanitizeUI(null),
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
function deltaChip(d, digits, label) {
  digits = digits || 1;
  label = label || '';
  const lb = label ? '<span class="d-label">' + label + '</span>' : '';
  if (d === null || d === undefined || isNaN(d)) return lb + '<span class="delta flat">—</span>';
  if (Math.abs(d) < 0.05) return lb + '<span class="delta flat">持平</span>';
  return d < 0
    ? lb + '<span class="delta down">↓' + Math.abs(d).toFixed(digits) + '</span>'
    : lb + '<span class="delta up">↑' + d.toFixed(digits) + '</span>';
}

/* ---------- Toast / 确认弹窗 ---------- */
let toastTimer = null;
let saveFlashTimer = null;
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
/* 最近缺勤日：从昨天往回找第一个「两人都没记」的日子（最多回看 7 天） */
function lastGapDay() {
  let d = addDays(new Date(), -1);
  for (let i = 0; i < 7; i++) {
    const k = dateKey(d);
    const r = state.records[k];
    const any = r && (typeof r.me === 'number' || typeof r.partner === 'number');
    if (!any) return { key: k, gap: i };
    d = addDays(d, -1);
  }
  return null;
}

const DATE_CHIP_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="16" rx="3.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';

function renderRecord() {
  /* 日期胶囊（自绘日期选择器的入口）——防御旧版缓存混装：容器不存在就跳过，绝不让整个页面崩掉 */
  const chipEl = document.getElementById('date-chip');
  if (chipEl) {
    const chipD = parseKey(currentDate);
    chipEl.innerHTML = DATE_CHIP_SVG +
      '<span>' + (chipD.getMonth() + 1) + ' 月 ' + chipD.getDate() + ' 日</span>' +
      (currentDate === todayKey() ? '<span class="chip-today">今天</span>' : '');
  }
  const btnToday = document.getElementById('btn-today');
  if (btnToday) btnToday.style.display = currentDate === todayKey() ? 'none' : '';

  /* 补记提示：只在看今天时提示，不打扰编辑历史 */
  const makeupEl = document.getElementById('makeup-box');
  if (makeupEl) makeupEl.innerHTML = (function () {
    if (currentDate !== todayKey()) return '';
    const gap = lastGapDay();
    if (!gap) return '';
    const gapD = parseKey(gap.key);
    const label = (gap.gap === 0 ? '昨天' : fmtMD(gap.key)) + '（' + WEEK_LABELS[gapD.getDay()] + '）还没记体重';
    return '<div class="makeup-bar"><span>' + label + ' · 补上它，趋势线才不断</span>' +
      '<button class="linklike" data-action="goto-makeup">去补记</button></div>';
  })();

  const r = getRec(currentDate);
  const when = currentDate === todayKey() ? '今天' : fmtMD(currentDate) + ' ' + WEEK_LABELS[parseKey(currentDate).getDay()];
  const both = r && typeof r.me === 'number' && typeof r.partner === 'number';
  const prevMe = prevRecord(currentDate, 'me');


  /* 这天是什么状态，一句话说清 */
  let recHint;
  if (both) {
    recHint = '这天已记录：' + esc(state.names.me) + ' ' + r.me.toFixed(1) + ' kg · ' + esc(state.names.partner) + ' ' + r.partner.toFixed(1) + ' kg。数字有错直接改，改完点保存';
  } else if (r) {
    recHint = '这天只记了一半（缺的人填上即可），改完点保存';
  } else if (currentDate === todayKey()) {
    recHint = '今天还没记。灰字是上次称的数，只是参考——照着改或清空重输，点保存才算数';
  } else {
    recHint = '这天没记过。灰字是上次（' + (prevMe ? fmtMD(prevMe.key) + ' ' + prevMe.value.toFixed(1) + ' kg' : '暂无') + '）的参考值，要补录就照着改，点保存才算数';
  }

  document.getElementById('record-card').innerHTML =
    '<div class="card">' +
      '<h3 class="card-label">记录 · ' + when + '</h3>' +
      '<p class="sub" style="margin-bottom:8px">' + recHint + '</p>' +
      PERSON_IDS.map(p => {
        const has = r && typeof r[p] === 'number';
        const prev = prevRecord(currentDate, p);
        const val = has ? r[p] : esc(drafts[p] || '');
        return '<div class="in-row">' +
          '<span class="in-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span>' +
          '<input class="w-input" type="number" step="0.1" inputmode="decimal" placeholder="' + (prev ? '未记 · 上次 ' + prev.value.toFixed(1) : '未记录') + '" data-person="' + p + '" value="' + val + '">' +
          '<span class="unit">kg</span>' +
        '</div>';
      }).join('') +
      /* 腰围折叠区：减肚子的核心指标，量了再填 */
      (function () {
        const hasExtra = r && PERSON_IDS.some(p => typeof r[p + '_waist'] === 'number');
        if (!extraOpen && !hasExtra) {
          /* 超过 5 天没量腰围，按钮自己开口提醒 */
          const lastW = latestWaistOf();
          let btnTxt = '+ 记体脂 / 腰围 / 内脏脂肪';
          if (lastW) {
            const gap = Math.round((parseKey(todayKey()) - parseKey(lastW.key)) / 86400000);
            if (gap >= 5) btnTxt = '+ 记腰围 · 距上次已 ' + gap + ' 天，该量了';
          }
          return '<button class="linklike extra-toggle" data-action="toggle-extra">' + btnTxt + '</button>';
        }
        return '<div class="extra-zone">' +
          '<p class="sub" style="margin:2px 0 6px">减肚子看腰围：软尺贴肚脐绕一圈，呼气末读数（cm）。每周量 1~2 次就够，没量就空着</p>' +
          PERSON_IDS.map(p => {
            const wHas = r && typeof r[p + '_waist'] === 'number';
            const wPrev = lastKnownField(p + '_waist');
            return '<div class="in-row x-row">' +
              '<span class="in-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span>' +
              '<input class="w-input x-input" type="number" step="0.5" inputmode="decimal" placeholder="' + (wPrev ? '腰围 · 上次 ' + wPrev.value.toFixed(1) : '腰围 cm') + '" data-person="' + p + '_waist" value="' + (wHas ? r[p + '_waist'] : esc(drafts[p + '_waist'] || '')) + '">' +
              '<span class="unit">cm</span>' +
            '</div>';
          }).join('') +
          '<p class="sub" style="margin:6px 0 2px">体脂率：小米秤测完直接抄数（%）。同秤自比才有意义，换了秤别跨秤比</p>' +
          PERSON_IDS.map(p => {
            const bHas = r && typeof r[p + '_bf'] === 'number';
            const bPrev = lastKnownField(p + '_bf');
            return '<div class="in-row x-row">' +
              '<span class="in-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span>' +
              '<input class="w-input x-input" type="number" step="0.1" inputmode="decimal" placeholder="' + (bPrev ? '体脂 · 上次 ' + bPrev.value.toFixed(1) : '体脂率 %') + '" data-person="' + p + '_bf" value="' + (bHas ? r[p + '_bf'] : esc(drafts[p + '_bf'] || '')) + '">' +
              '<span class="unit">%</span>' +
            '</div>';
          }).join('') +
          '<p class="sub" style="margin:6px 0 2px">体成分报告：测完整报告那天才填（秤上点「体成分」页抄），平时不用管</p>' +
          PERSON_IDS.map(p => {
            const vf = lastKnownField(p + '_vf'), mm = lastKnownField(p + '_mm'), bmr = lastKnownField(p + '_bmr');
            return '<div class="in-row x-row">' +
              '<span class="in-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span>' +
              '<input class="w-input x-input" type="number" step="1" inputmode="numeric" placeholder="' + (vf ? '内脏 · 上次 ' + vf.value.toFixed(0) : '内脏脂肪 级') + '" data-person="' + p + '_vf" value="' + (r && typeof r[p + '_vf'] === 'number' ? r[p + '_vf'] : esc(drafts[p + '_vf'] || '')) + '">' +
              '<input class="w-input x-input" type="number" step="0.1" inputmode="decimal" placeholder="' + (mm ? '肌肉 · 上次 ' + mm.value.toFixed(1) : '肌肉 kg') + '" data-person="' + p + '_mm" value="' + (r && typeof r[p + '_mm'] === 'number' ? r[p + '_mm'] : esc(drafts[p + '_mm'] || '')) + '">' +
              '<input class="w-input x-input" type="number" step="1" inputmode="numeric" placeholder="' + (bmr ? '代谢 · 上次 ' + bmr.value.toFixed(0) : '代谢 千卡') + '" data-person="' + p + '_bmr" value="' + (r && typeof r[p + '_bmr'] === 'number' ? r[p + '_bmr'] : esc(drafts[p + '_bmr'] || '')) + '">' +
            '</div>';
          }).join('') +
          '<button class="linklike extra-toggle" data-action="toggle-extra">收起</button>' +
        '</div>';
      })() +
      '<p class="sub" style="margin:12px 0 6px">备注（选填）：这天有什么想记的，一句话就行</p>' +
      '<input class="note-input" type="text" maxlength="60" enterkeyhint="done" placeholder="如：昨晚吃火锅 / 熬夜了 / 开始力量训练" value="' + (r && r.note ? esc(r.note) : '') + '">' +
      '<button class="btn save-btn' + (Date.now() - (window.__savedFlashAt || 0) < 1600 ? ' saved' : '') + '" data-action="save-all">' +
        (Date.now() - (window.__savedFlashAt || 0) < 1600 ? '✓ 已保存' : '保存') + '</button>' +
      (both ? '<div class="card-foot">这天的记录：你们俩相差 ' + Math.abs(r.me - r.partner).toFixed(1) + ' kg</div>' : '') +
    '</div>';

  document.getElementById('hero-row').innerHTML = heroHTML();
  document.getElementById('record-extra').innerHTML = recordExtraHTML();
}

const GEAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z"/></svg>';

function heroHTML() {
  /* 上一次记录的相对说法：隔1天=昨天，隔2天=前天，再久直接报日期 */
  const relPrev = (lk, prev) => {
    if (!prev) return '';
    const gap = Math.round((parseKey(lk) - parseKey(prev.key)) / 86400000);
    if (gap === 1) return lk === todayKey() ? '比昨天 ' : '比前一天 ';
    if (gap === 2 && (lk === todayKey() || lk === dateKey(addDays(new Date(), -1)))) return '比前天 ';
    return '比 ' + fmtMD(prev.key) + ' ';
  };
  const ui = state.ui;
  const cols = ui.heroOrder.map(p => {
    const gear = '<button class="hero-gear" data-action="open-heroset" aria-label="卡片设置">' + GEAR_SVG + '</button>';
    const cur = lastKnown(p);
    if (cur === null) {
      return '<div class="hero-col">' +
        '<div class="hero-top"><span class="hero-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span>' + gear + '</div>' +
        '<div class="hero-num">--<small>kg</small></div>' +
        '<div class="hero-delta"><span class="delta flat">还没有任何记录</span></div>' +
      '</div>';
    }
    const lk = lastKeyOf(p);
    const prev = prevRecord(lk, p);
    const start = firstKnown(p);
    const g = state.goals && state.goals[p];
    const bmi = bmiOf(p, cur);
    const latestTag = lk === todayKey() ? '今天' : fmtMD(lk);

    /* 关键节点进度条：起点 → 现在 → 目标 */
    let progHTML = '';
    if (start && typeof g === 'number' && Math.abs(start.value - g) > 0.05) {
      const total = start.value - g;
      const done = start.value - cur;
      const pct = Math.max(0, Math.min(100, done / total * 100));
      progHTML = '<div class="hprog"><div class="hprog-bar" style="width:' + pct.toFixed(1) + '%"></div></div>' +
        '<div class="hprog-lab"><span>起点 ' + start.value.toFixed(1) + '</span><span>已走 ' + Math.round(pct) + '%</span><span>目标 ' + g.toFixed(1) + '</span></div>';
    }

    /* 指标网格：每个数字都自带人话解释；开关开着但没数据的字段 → 显示「＋」点击直达填写（V23） */
    const m = ui.heroMetrics;
    const cells = [];
    if (m.goal && typeof g === 'number') {
      const off = cur - g;
      cells.push({ v: Math.abs(off).toFixed(1), u: off > 0.05 ? 'kg 距目标' : 'kg 已达标', ok: off <= 0.05 });
    }
    if (m.bmi && bmi !== null) cells.push({ v: bmi.toFixed(1), u: 'BMI 体重指数', ok: bmi >= 18.5 && bmi < 24 });
    if (m.bf) { const bf = lastKnownField(p + '_bf'); cells.push(bf ? { v: bf.value.toFixed(1), u: '% 体脂率', ok: null } : { add: '体脂率', u: '没填 · 点这里', short: '体脂率' }); }
    if (m.waist) { const w = lastKnownField(p + '_waist'); cells.push(w ? { v: w.value.toFixed(1), u: 'cm 腰围', ok: null } : { add: '腰围', u: '没填 · 点这里', short: '腰围' }); }
    if (m.vf) { const vf = lastKnownField(p + '_vf'); cells.push(vf ? { v: vf.value.toFixed(0), u: '级 内脏脂肪', ok: vf.value < 5 } : { add: '内脏脂肪', u: '没填 · 点这里', short: '内脏脂肪' }); }
    if (m.mm) { const mm = lastKnownField(p + '_mm'); cells.push(mm ? { v: mm.value.toFixed(1), u: 'kg 肌肉量', ok: null } : { add: '肌肉量', u: '没填 · 点这里', short: '肌肉量' }); }
    const gridHTML = cells.length
      ? '<div class="hgrid">' + cells.map(c =>
          c.add
            ? '<button class="hcell hcell-add" data-action="goto-extra"><b>＋</b><span>' + (ui.heroLayout === 'stack' ? c.add + ' · ' + c.u : '填' + c.short) + '</span></button>'
            : '<div class="hcell">' + (c.ok === true ? '<b style="color:#34c759">' + c.v + '</b>' : '<b>' + c.v + '</b>') + '<span>' + c.u + '</span></div>'
        ).join('') + '</div>'
      : '';

    return '<div class="hero-col">' +
      '<div class="hero-top"><span class="hero-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span>' +
      '<span class="hero-date">' + latestTag + '</span>' + gear + '</div>' +
      '<div class="hero-num">' + cur.toFixed(1) + '<small>kg</small></div>' +
      '<div class="hero-delta">' + deltaChip(prev ? cur - prev.value : null, 1, relPrev(lk, prev)) + '</div>' +
      progHTML + gridHTML +
    '</div>';
  }).join('');
  return '<div class="hero' + (ui.heroLayout === 'stack' ? ' hero-stack' : '') + '">' + cols + '</div>';
}

/* ---------- 首页卡片设置 ---------- */
function openHeroSet() {
  renderHeroSet();
  document.getElementById('sheet-mask').classList.add('show');
  document.getElementById('hero-sheet').classList.add('show');
}
function closeHeroSet() {
  document.getElementById('hero-sheet').classList.remove('show');
  if (!document.getElementById('settings-sheet').classList.contains('show') &&
      !document.getElementById('date-sheet').classList.contains('show')) {
    document.getElementById('sheet-mask').classList.remove('show');
  }
}
function renderHeroSet() {
  const ui = state.ui;
  const body = document.getElementById('heroset-body');
  if (!body) return;
  /* 每个指标一行：人话解释 + 开关（V22：字段含义必须写明白） */
  const METRICS = [
    { k: 'goal',   n: '距目标',   d: '还差多少公斤到你的目标' },
    { k: 'bmi',    n: 'BMI',      d: '体重指数 · 18.5~24 属正常' },
    { k: 'bf',     n: '体脂率',   d: '脂肪占体重的比例，越低越精瘦' },
    { k: 'waist',  n: '腰围',     d: '肚子脂肪的硬指标 · 男<90 女<85' },
    { k: 'vf',     n: '内脏脂肪', d: '包在内脏上的脂肪 · 5级以下健康' },
    { k: 'mm',     n: '肌肉量',   d: '减脂期守住它，代谢才不掉' }
  ];
  body.innerHTML =
    '<p class="set-lab">卡片大小</p>' +
    '<div class="set-row">' +
      '<button class="set-seg' + (ui.heroLayout === 'grid' ? ' on' : '') + '" data-action="hero-size" data-v="grid">紧凑 · 两张并排</button>' +
      '<button class="set-seg' + (ui.heroLayout === 'stack' ? ' on' : '') + '" data-action="hero-size" data-v="stack">大卡 · 整行一张</button>' +
    '</div>' +
    '<p class="set-lab">谁在上面（大卡）/ 左边（紧凑）</p>' +
    '<div class="set-row">' +
      '<button class="set-seg' + (ui.heroOrder[0] === 'me' ? ' on' : '') + '" data-action="hero-order" data-v="me">' + esc(state.names.me) + '</button>' +
      '<button class="set-seg' + (ui.heroOrder[0] === 'partner' ? ' on' : '') + '" data-action="hero-order" data-v="partner">' + esc(state.names.partner) + '</button>' +
    '</div>' +
    '<p class="set-lab">卡片上显示哪些数据</p>' +
    METRICS.map(mk =>
      '<button class="set-line' + (ui.heroMetrics[mk.k] ? ' on' : '') + '" data-action="hm-toggle" data-key="' + mk.k + '">' +
        '<span class="set-line-txt"><b>' + mk.n + '</b><i>' + mk.d + '</i></span>' +
        '<span class="tgl"></span>' +
      '</button>'
    ).join('') +
    '<p class="set-tip">体脂/腰围/内脏脂肪/肌肉量：有测量记录才会出现在卡片上 · 设置自动保存</p>';
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

function lastKnownField(f) {
  const ks = sortedKeys();
  for (let i = ks.length - 1; i >= 0; i--) {
    const r = state.records[ks[i]];
    if (r && typeof r[f] === 'number') return { key: ks[i], value: r[f] };
  }
  return null;
}

function firstKnownField(f) {
  const ks = sortedKeys();
  for (let i = 0; i < ks.length; i++) {
    const r = state.records[ks[i]];
    if (r && typeof r[f] === 'number') return { key: ks[i], value: r[f] };
  }
  return null;
}

/* 两人中最近一次腰围测量（用于提醒） */
function latestWaistOf() {
  const cands = [lastKnownField('me_waist'), lastKnownField('partner_waist')].filter(Boolean);
  if (!cands.length) return null;
  cands.sort((a, b) => b.key.localeCompare(a.key));
  return cands[0];
}

/* 腰围一句话解读：每人「最新值 vs 首次」，变化 ≥0.5cm 才报涨跌 */
function waistInterpText() {
  const parts = PERSON_IDS.map(p => {
    const last = lastKnownField(p + '_waist');
    if (!last) return null;
    let txt = esc(state.names[p]) + ' 最新 ' + last.value.toFixed(1) + 'cm（' + fmtMD(last.key) + '）';
    const first = firstKnownField(p + '_waist');
    if (first && first.key !== last.key) {
      const d = last.value - first.value;
      if (d <= -0.5) txt += '，比首次 ↓' + Math.abs(d).toFixed(1) + '，肚子在缩小';
      else if (d >= 0.5) txt += '，比首次 ↑' + d.toFixed(1) + '，最近留意饮食';
      else txt += '，与首次基本持平';
    }
    return txt;
  }).filter(Boolean);
  return parts.join(' · ') || '量过第一次后，这里会自动出解读';
}

function saveAll() {
  window.__savedFlashAt = Date.now(); /* 按钮即时变「✓ 已保存」，1.6 秒后由定时器恢复 */
  clearTimeout(saveFlashTimer);
  saveFlashTimer = setTimeout(() => { if (document.querySelector('.save-btn')) renderRecord(); }, 1650);
  const got = {};
  let weightErr = null, waistErr = null;
  PERSON_IDS.forEach(p => {
    const input = document.querySelector('.w-input[data-person="' + p + '"]');
    const raw = input ? input.value.trim() : '';
    if (raw === '') return;
    const v = parseFloat(raw);
    if (isNaN(v) || v < 20 || v > 300) { weightErr = state.names[p]; return; }
    got[p] = Math.round(v * 10) / 10;
  });
  if (weightErr) { toast(weightErr + ' 的体重请填 20 ~ 300 之间'); return; }

  /* 腰围：填了才存，量错范围直接拦下（真实数据，不编不猜） */
  const extraGot = {}, extraDel = [];
  PERSON_IDS.forEach(p => {
    const field = p + '_waist';
    const input = document.querySelector('.x-input[data-person="' + field + '"]');
    if (!input) return;
    const raw = input.value.trim();
    if (raw === '') {
      if (state.records[currentDate] && typeof state.records[currentDate][field] === 'number') extraDel.push(field);
      return;
    }
    const v = parseFloat(raw);
    if (isNaN(v) || v < 40 || v > 200) { waistErr = state.names[p] + ' 的腰围（' + raw + '）看着不对，应在 40~200 之间，检查一下再存'; return; }
    extraGot[field] = Math.round(v * 10) / 10;
  });
  if (waistErr) { toast(waistErr); return; }

  /* 体成分四件套：体脂% / 内脏脂肪级 / 肌肉kg / 代谢千卡（小米秤抄数，填了才存） */
  const BF_FIELDS = [
    { suf: '_bf',  min: 3,   max: 70,   name: '体脂率',   step: 0.1 },
    { suf: '_vf',  min: 1,   max: 30,   name: '内脏脂肪', step: 1 },
    { suf: '_mm',  min: 10,  max: 90,   name: '肌肉量',   step: 0.1 },
    { suf: '_bmr', min: 800, max: 4000, name: '基础代谢', step: 1 }
  ];
  const bodyGot = {}, bodyDel = [];
  let bodyErr = null;
  BF_FIELDS.forEach(f => {
    PERSON_IDS.forEach(p => {
      const field = p + f.suf;
      const input = document.querySelector('.x-input[data-person="' + field + '"]');
      if (!input) return;
      const raw = input.value.trim();
      if (raw === '') {
        if (state.records[currentDate] && typeof state.records[currentDate][field] === 'number') bodyDel.push(field);
        return;
      }
      const v = parseFloat(raw);
      if (isNaN(v) || v < f.min || v > f.max) { bodyErr = state.names[p] + ' 的' + f.name + '（' + raw + '）看着不对，应在 ' + f.min + '~' + f.max + ' 之间，检查一下再存'; return; }
      bodyGot[field] = Math.round(v * 10) / 10;
    });
  });
  if (bodyErr) { toast(bodyErr); return; }

  /* 备注：跟当天记录一起存，只改备注也允许保存 */
  const noteInput = document.querySelector('.note-input');
  const noteRaw = noteInput ? noteInput.value.trim() : '';
  const noteChanged = noteRaw !== ((state.records[currentDate] || {}).note || '');

  const keys = Object.keys(got);
  if (!keys.length && !Object.keys(extraGot).length && !Object.keys(bodyGot).length) {
    if (noteChanged) {
      if (!state.records[currentDate]) state.records[currentDate] = {};
      if (noteRaw) state.records[currentDate].note = noteRaw;
      else delete state.records[currentDate].note;
      if (!Object.keys(state.records[currentDate]).length) delete state.records[currentDate];
      if (persist()) { toast('备注已保存'); renderAll(); }
      return;
    }
    toast('先输入至少一位的体重'); return;
  }
  if (!state.records[currentDate]) state.records[currentDate] = {};
  if (noteRaw) state.records[currentDate].note = noteRaw;
  else delete state.records[currentDate].note;
  keys.forEach(p => { state.records[currentDate][p] = got[p]; drafts[p] = ''; });
  Object.keys(extraGot).forEach(f => { state.records[currentDate][f] = extraGot[f]; drafts[f] = ''; });
  extraDel.forEach(f => { delete state.records[currentDate][f]; drafts[f] = ''; });
  Object.keys(bodyGot).forEach(f => { state.records[currentDate][f] = bodyGot[f]; drafts[f] = ''; });
  bodyDel.forEach(f => { delete state.records[currentDate][f]; drafts[f] = ''; });
  /* 记录变空就整行删掉，不留幽灵日期 */
  const cur = state.records[currentDate];
  if (cur && !Object.keys(cur).length) delete state.records[currentDate];
  if (!persist()) return;
  toast('✓ ' + (currentDate === todayKey() ? '今晨' : fmtMD(currentDate)) + ' 已保存，数据记上了');
  renderAll();
}

/* ================= 目标进度卡 ================= */
function goalRate(p) { /* 最近14天斜率 kg/天，用最小二乘 */
  const days = lastNDays(14);
  const pts = [];
  days.forEach((k, i) => {
    const r = state.records[k];
    if (r && typeof r[p] === 'number') pts.push({ t: parseKey(k).getTime() / 86400000, v: r[p] });
  });
  if (pts.length < 3) return null;
  const n = pts.length;
  const mt = pts.reduce((s, x) => s + x.t, 0) / n;
  const mv = pts.reduce((s, x) => s + x.v, 0) / n;
  let num = 0, den = 0;
  pts.forEach(x => { num += (x.t - mt) * (x.v - mv); den += (x.t - mt) * (x.t - mt); });
  if (den === 0) return null;
  return num / den; /* 正=在涨，负=在瘦 */
}

function goalProgressHTML() {
  const anyGoal = PERSON_IDS.some(p => state.goals && typeof state.goals[p] === 'number');

  /* 都没设目标 → 引导卡，直接在这设定 */
  if (!anyGoal) {
    return '<div class="card goal-card">' +
      '<h3 class="card-label">定个目标 · 进步看得见</h3>' +
      '<p class="sub">填上各自的理想体重，这里会显示进度条、还差多少、按最近速度多久能到</p>' +
      '<div class="goal-inline">' +
        PERSON_IDS.map(p =>
          '<label class="field"><span><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '的目标 kg</span>' +
          '<input class="text-input" id="qgoal-' + p + '" type="number" step="0.1" inputmode="decimal" placeholder="如 70.0"></label>'
        ).join('') +
      '</div>' +
      '<button class="btn" data-action="save-goals-inline">保存目标，开始倒计时</button>' +
    '</div>';
  }

  /* 有人设了目标 → 进度卡 */
  const rows = PERSON_IDS.map(p => {
    const g = state.goals[p];
    if (g === null || g === undefined) return '';
    const start = firstKnown(p), cur = lastKnown(p);
    if (!start || !cur) return '<div class="gp-row"><span class="gp-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span><span class="s-dim">记一笔体重后开始算进度</span></div>';

    const done = start.value - cur;       /* 已减（正=瘦了） */
    const need = start.value - g;         /* 总任务 */
    if (need <= 0) return '<div class="gp-row"><span class="gp-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span><span class="s-dim">目标应低于起点，回设置里改一下</span></div>';

    const pct = Math.max(0, Math.min(100, done / need * 100));
    const remain = cur - g;

    /* 第二行：本周均 vs 上周均，短周期反馈不吓人 */
    let weekly = '';
    const ws = weekStartOf(new Date());
    const curW = avgBetween(dateKey(ws), dateKey(addDays(ws, 6)), p);
    const prevW = avgBetween(dateKey(addDays(ws, -7)), dateKey(addDays(ws, -1)), p);
    if (curW && prevW) {
      const dw = curW.avg - prevW.avg;
      weekly = Math.abs(dw) < 0.05
        ? '本周和上周基本持平，稳住了'
        : dw < 0
          ? '本周均比上周 ↓' + Math.abs(dw).toFixed(1) + '，方向对了'
          : '本周均比上周 ↑' + dw.toFixed(1) + '，波动很正常';
    }

    /* 预测：只在实际稳定下降且结果不荒谬时才说 */
    let eta = '';
    if (remain <= 0.05) {
      eta = '<span class="gp-hit">目标已达成，保持住</span>';
    } else {
      const rate = goalRate(p);
      const rateW = rate !== null ? rate * 7 : null; /* kg/周 */
      if (rateW !== null && rateW <= -0.15) {
        const w = Math.ceil(remain / (-rateW));
        if (w <= 26) eta = '按最近速度约 ' + w + ' 周达成';
        else eta = weekly || '保持记录，让曲线说话';
      } else {
        eta = weekly || '保持记录，让曲线说话';
      }
    }

    return '<div class="gp-row">' +
      '<div class="gp-head"><span class="gp-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span>' +
      '<span class="gp-num">进度 ' + pct.toFixed(0) + '% · 已减 ' + Math.max(0, done).toFixed(1) + ' kg</span></div>' +
      '<div class="gbar"><div class="gfill" style="width:' + pct.toFixed(1) + '%;background:' + COLORS[p] + '"></div></div>' +
      '<div class="gp-foot"><span class="gp-eta">' + eta + '</span> <span class="s-dim">还差 ' + remain.toFixed(1) + ' kg · 目标 ' + g.toFixed(1) + '</span></div>' +
    '</div>';
  }).join('');

  return '<div class="card goal-card"><h3 class="card-label">目标进度</h3>' + rows + '</div>';
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

/* 双人对比图：一条图两条线，直观看差距与走势 */
function buildDualChart(days, opts) {
  opts = opts || {};
  const read = opts.read || ((r, p) => (r ? r[p] : undefined));
  const withGoals = opts.goals !== false;
  const dec = opts.dec !== undefined ? opts.dec : 1;
  const W = 350, H = 200, L = 46, R = 12, T = 20, B = 28;
  const iw = W - L - R, ih = H - T - B;
  const series = PERSON_IDS.map(p => {
    const pts = [];
    days.forEach((k, i) => {
      const r = state.records[k];
      const v = read(r, p);
      if (typeof v === 'number') pts.push({ i, v });
    });
    return { p, pts };
  });

  const vals = [];
  series.forEach(s => s.pts.forEach(x => vals.push(x.v)));
  if (withGoals) PERSON_IDS.forEach(p => { const g = state.goals[p]; if (typeof g === 'number') vals.push(g); });
  if (!vals.length) return { empty: true };
  let min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
  if (max - min < 0.8) { min -= 0.5; max += 0.5; }
  else { const pp = (max - min) * 0.18; min -= pp; max += pp; }

  const n = days.length;
  const X = i => +(L + (n === 1 ? iw / 2 : iw * i / (n - 1))).toFixed(1);
  const Y = v => +(T + ih * (1 - (v - min) / (max - min))).toFixed(1);

  let grid = '';
  [0, 0.25, 0.5, 0.75, 1].forEach((t, idx) => {
    const v = min + (max - min) * t, y = Y(v);
    grid += '<line x1="' + L + '" y1="' + y + '" x2="' + (W - R) + '" y2="' + y + '" stroke="var(--sep)" stroke-width="' + (idx === 0 || idx === 4 ? 1 : 0.6) + '" opacity="' + (idx === 0 || idx === 4 ? 1 : 0.6) + '"/>';
    grid += '<text class="axis-y" x="' + (L - 7) + '" y="' + (y + 4) + '" text-anchor="end">' + v.toFixed(dec) + '</text>';
  });
  const idxs = [...new Set([0, Math.round((n - 1) / 3), Math.round((n - 1) * 2 / 3), n - 1])];
  idxs.forEach(i => {
    const k = days[i];
    const lab = n > 120 ? ('' + parseKey(k).getFullYear()).slice(2) + '/' + (parseKey(k).getMonth() + 1) : fmtMD(k);
    grid += '<text x="' + X(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + lab + '</text>';
  });

  let paths = '';
  const goalsDrawn = [];
  series.forEach(s => {
    const cpts = s.pts.map(pt => ({ x: X(pt.i), y: Y(pt.v) }));
    if (cpts.length) {
      const d = smoothPath(cpts);
      if (d) paths += '<path d="' + d + '" fill="none" stroke="' + COLORS[s.p] + '" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>';
      /* 趋势线：滑动平均（Happy Scale 式）——碎虚线+降透明度，和实线一眼区分 */
      if (opts.trend && s.pts.length >= 4) {
        const mpts = s.pts.map((pt, idx) => {
          const from = Math.max(0, idx - 6);
          const win = s.pts.slice(from, idx + 1);
          return { x: X(pt.i), y: Y(win.reduce((a, b) => a + b.v, 0) / win.length) };
        });
        const dm = smoothPath(mpts);
        if (dm) paths += '<path d="' + dm + '" fill="none" stroke="' + COLORS[s.p] + '" stroke-width="2" stroke-linecap="round" opacity="0.45" stroke-dasharray="2 6"/>';
      }
      const last = cpts[cpts.length - 1];
      paths += '<circle cx="' + last.x + '" cy="' + last.y + '" r="4" fill="var(--card)" stroke="' + COLORS[s.p] + '" stroke-width="2.5"/>';
    }
    const g = withGoals ? state.goals[s.p] : undefined;
    if (typeof g === 'number' && goalsDrawn.indexOf(g.toFixed(1)) === -1) {
      goalsDrawn.push(g.toFixed(1));
      paths += '<line x1="' + L + '" y1="' + Y(g) + '" x2="' + (W - R) + '" y2="' + Y(g) + '" stroke="var(--text3)" stroke-width="1" stroke-dasharray="4 4" opacity="0.7"/>';
      paths += '<text x="' + (W - R - 2) + '" y="' + (Y(g) - 4) + '" text-anchor="end" style="font-size:10px;fill:var(--text3)">目标 ' + g.toFixed(1) + '</text>';
    }
  });

  const svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img">' +
    grid +
    '<line class="scrub-line" x1="0" y1="' + T + '" x2="0" y2="' + (T + ih) + '" stroke="var(--text3)" stroke-width="1" stroke-dasharray="3 3" style="display:none"/>' +
    paths +
    '<rect class="scrub-zone" x="' + L + '" y="' + T + '" width="' + iw + '" height="' + ih + '" fill="transparent" pointer-events="all"/>' +
  '</svg>';

  return { empty: false, svg, series, days, X, Y, W, read, unit: opts.unit || 'kg' };
}

function attachScrub(wrap, chart) {
  const svg = wrap.querySelector('svg');
  const tip = wrap.querySelector('.chart-tip');
  const line = svg.querySelector('.scrub-line');

  function hide() { tip.style.display = 'none'; line.style.display = 'none'; }
  function onMove(e) {
    const rect = svg.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (chart.W / rect.width);
    const allPts = [];
    chart.series.forEach(s => s.pts.forEach(pt => allPts.push(pt)));
    if (!allPts.length) { hide(); return; }
    let best = null, bestD = 1e9;
    allPts.forEach(pt => {
      const d = Math.abs(chart.X(pt.i) - px);
      if (d < bestD) { bestD = d; best = pt; }
    });
    if (!best) { hide(); return; }
    const gx = chart.X(best.i);
    line.setAttribute('x1', gx); line.setAttribute('x2', gx);
    line.style.display = '';
    const k = chart.days[best.i];
    const parts = chart.series.map(s => {
      const r = state.records[k];
      const v = r ? chart.read(r, s.p) : undefined;
      return '<span style="color:' + COLORS[s.p] + '">' + esc(state.names[s.p]) + ' ' +
        (typeof v === 'number' ? v.toFixed(1) : '—') + (typeof v === 'number' ? ' ' + chart.unit : '') + '</span>';
    });
    tip.innerHTML = '<b>' + fmtMD(k) + '</b> · ' + parts.join(' / ');
    tip.style.display = 'block';
    const tipW = tip.offsetWidth || 150;
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

/* ================= 打卡月历（趋势页顶部） =================
   借鉴 Happy Scale / 薄荷健康：整月一览，缺哪天一目了然，点任何一天直接去补录 */
let calYM = null;
let selectedCalDay = null; /* 月历点选查看的那天（V28：就地查看，不再跳转） */

function calendarHTML() {
  const now = parseKey(todayKey());
  if (!calYM) calYM = { y: now.getFullYear(), m: now.getMonth() };
  const first = new Date(calYM.y, calYM.m, 1);
  const startPad = first.getDay();
  const dim = new Date(calYM.y, calYM.m + 1, 0).getDate();
  const tk = todayKey();
  let counted = 0;
  for (let d = 1; d <= dim; d++) {
    const r = state.records[dateKey(new Date(calYM.y, calYM.m, d))];
    if (r && (typeof r.me === 'number' || typeof r.partner === 'number')) counted++;
  }
  const monthTotal = (calYM.y === now.getFullYear() && calYM.m === now.getMonth()) ? now.getDate() : dim;
  /* V29：分母语义必须说人话——本月=截至今天，历史月=全月，不再出现「28/28」这种让人以为9月只有28天的写法 */
  const cntTxt = (calYM.y === now.getFullYear() && calYM.m === now.getMonth())
    ? (counted >= monthTotal
        ? '截至 ' + fmtMD(tk) + '，' + counted + ' 天全记了'
        : '记了 ' + counted + '/' + monthTotal + ' 天（截至 ' + fmtMD(tk) + '）')
    : '这个月记了 ' + counted + '/' + dim + ' 天';
  let cells = '';
  for (let i = 0; i < startPad; i++) cells += '<span class="cal-cell cal-pad"></span>';
  for (let d = 1; d <= dim; d++) {
    const k = dateKey(new Date(calYM.y, calYM.m, d));
    const r = state.records[k] || {};
    const future = k > tk;
    const cls = 'cal-cell' + (k === tk ? ' cal-today' : '') + (k === selectedCalDay ? ' cal-sel' : '') + (future ? ' cal-future' : '');
    const dots = (typeof r.me === 'number' ? '<i style="background:' + COLORS.me + '"></i>' : '<i></i>') +
      (typeof r.partner === 'number' ? '<i style="background:' + COLORS.partner + '"></i>' : '<i></i>');
    cells += '<button class="' + cls + '" data-cal="' + k + '"' + (future ? ' disabled' : '') + '>' +
      '<span class="cal-d">' + d + '</span><span class="cal-dots">' + dots + '</span></button>';
  }
  /* 选中日的就地详情（V28）：点日期 = 查看那天记了什么，想改再点「修改」 */
  let detailHTML = '';
  if (selectedCalDay && selectedCalDay.slice(0, 7) === calYM.y + '-' + String(calYM.m + 1).padStart(2, '0')) {
    const r = state.records[selectedCalDay] || {};
    const dD = parseKey(selectedCalDay);
    const rows = [];
    PERSON_IDS.forEach(p => {
      const hasW = typeof r[p] === 'number';
      const extras = [];
      [['waist', '腰围', 'cm', 1], ['bf', '体脂', '%', 1], ['vf', '内脏脂肪', '级', 0], ['mm', '肌肉', 'kg', 1]].forEach(x => {
        if (typeof r[p + '_' + x[0]] === 'number') extras.push(x[1] + ' ' + r[p + '_' + x[0]].toFixed(x[3]) + x[2]);
      });
      rows.push('<div class="cdd-person">' +
        '<span class="cdd-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span>' +
        (hasW ? '<b>' + r[p].toFixed(1) + '<small> kg</small></b>' : '<span class="s-dim">没记体重</span>') +
        (extras.length ? '<span class="cdd-extras">' + extras.join(' · ') + '</span>' : '') +
      '</div>');
    });
    detailHTML = '<div class="cal-detail">' +
      '<div class="cdd-head"><b>' + (dD.getMonth() + 1) + '月' + dD.getDate() + '日 · ' + WEEK_LABELS[dD.getDay()] + '</b>' +
        '<button class="cdd-close" data-action="cal-close" aria-label="收起">✕</button></div>' +
      rows.join('') +
      (r.note ? '<p class="cdd-note">备注：' + esc(r.note) + '</p>' : '') +
      (!Object.keys(r).length ? '<p class="s-dim" style="margin:4px 0 0">这天什么都没记</p>' : '') +
      '<button class="btn ghost cdd-edit" data-action="edit-cal-day">修改这天的记录</button>' +
    '</div>';
  }
  return '<div class="card">' +
    '<div class="cal-head">' +
      '<button class="cal-nav" data-action="cal-prev" aria-label="上个月">‹</button>' +
      '<div class="cal-title"><b>' + calYM.y + ' 年 ' + (calYM.m + 1) + ' 月</b>' +
      '<span class="cal-count">' + cntTxt + '</span></div>' +
      '<button class="cal-nav" data-action="cal-next" aria-label="下个月">›</button>' +
    '</div>' +
    '<div class="cal-week">' + ['日','一','二','三','四','五','六'].map(w => '<span>' + w + '</span>').join('') + '</div>' +
    '<div class="cal-grid">' + cells + '</div>' +
    detailHTML +
    '<p class="cal-legend">彩点 = 记了体重（<span style="color:' + COLORS.me + '">●</span> ' + esc(state.names.me) + ' / <span style="color:' + COLORS.partner + '">●</span> ' + esc(state.names.partner) + '）· 点任何一天查看当天数据</p>' +
  '</div>';
}

function renderTrend() {
  const calBox = document.getElementById('cal-box');
  if (calBox) calBox.innerHTML = calendarHTML();
  document.querySelectorAll('#range-seg button').forEach(b => {
    b.classList.toggle('active', +b.dataset.range === trendRange);
  });

  document.getElementById('goal-box').innerHTML = goalProgressHTML();

  const days = rangeDays();
  const anyData = PERSON_IDS.some(p => lastKnown(p) !== null);
  const box = document.getElementById('chart-box');
  if (!anyData) {
    box.innerHTML = '<div class="card chart-card"><div class="chart-empty">还没有数据<br>记下第一笔，曲线就会长出来</div></div>';
    document.getElementById('range-summary').innerHTML = '';
    return;
  }

  /* 一张图两条线 */
  const c = buildDualChart(days, { trend: true });
  const rangeName = trendRange === 0 ? '全部记录' : '最近 ' + trendRange + ' 天';
  const legend = PERSON_IDS.map(p => {
    const cur = lastKnown(p);
    return '<span class="lg-item"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) +
      (cur !== null ? ' <b>' + cur.toFixed(1) + '</b> kg' : '') + '</span>';
  }).join('');
  if (c.empty) {
    box.innerHTML = '<div class="card chart-card"><div class="chart-empty">该时间段暂无记录</div></div>';
  } else {
    /* 筛选器紧贴图表（V24：以前在页面顶上，图表在页底，按了没反应——反人性） */
    const segHTML = '<div class="seg chart-seg" id="range-seg">' +
      [7, 30, 90, 0].map(r => '<button data-range="' + r + '"' + (trendRange === r ? ' class="active"' : '') + '>' + (r === 0 ? '全部' : r + '天') + '</button>').join('') +
    '</div>';
    /* V25：线型图例做成徽章一行，长说明拆出去，告别文字糊成一坨 */
    const chipsHTML = '<div class="chart-chips">' +
      '<span class="chip-key"><i class="ln solid" style="background:var(--text)"></i>实线 · 每天记录</span>' +
      '<span class="chip-key"><i class="ln dash"></i>虚线 · 趋势平滑</span>' +
      '<span class="chip-key"><i class="ln goal"></i>灰线 · 目标</span>' +
    '</div>';
    box.innerHTML = '<div class="card chart-card">' +
      '<div class="chart-head2"><h3 class="card-label">体重走势 · ' + rangeName + '</h3><div class="lg">' + legend + '</div></div>' +
      segHTML +
      chipsHTML +
      '<div class="chart-wrap">' + c.svg + '<div class="chart-tip"></div></div>' +
      '<p class="chart-hint">按住图表任意位置，可看那一天的数值</p>' +
    '</div>';
    const wrap = box.querySelector('.chart-wrap');
    attachScrub(wrap, c);
  }

  document.getElementById('range-summary').innerHTML = rangeSummaryHTML(days);

  /* 腰围 / 体脂曲线：有数据才出现，没有就不占地方 */
  const waistBox = document.getElementById('waist-chart-box');
  const bfBox = document.getElementById('bf-chart-box');
  const anyWaist = sortedKeys().some(k => { const r = state.records[k]; return r && PERSON_IDS.some(p => typeof r[p + '_waist'] === 'number'); });
  const anyBf = sortedKeys().some(k => { const r = state.records[k]; return r && PERSON_IDS.some(p => typeof r[p + '_bf'] === 'number'); });

  if (anyWaist) {
    const c = buildDualChart(days, { read: (r, p) => (r ? r[p + '_waist'] : undefined), goals: false, unit: 'cm' });
    if (!c.empty) {
      const legend = PERSON_IDS.map(p => {
        const last = lastKnownField(p + '_waist');
        return '<span class="lg-item"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) +
          (last ? ' <b>' + last.value.toFixed(1) + '</b> cm' : '') + '</span>';
      }).join('');
      waistBox.innerHTML = '<div class="card chart-card">' +
        '<div class="chart-head2"><h3 class="card-label">腰围走势 · ' + rangeName + '</h3><div class="lg">' + legend + '</div></div>' +
        '<p class="sub">' + waistInterpText() + '</p>' +
        '<p class="sub">减肚子的硬指标：体重不动时，腰围缩小 = 脂肪真的在掉 · 建议每周量 1~2 次</p>' +
        '<div class="chart-wrap">' + c.svg + '<div class="chart-tip"></div></div>' +
      '</div>';
      attachScrub(waistBox.querySelector('.chart-wrap'), c);
    } else waistBox.innerHTML = '';
  } else {
    waistBox.innerHTML = '<div class="card"><h3 class="card-label">腰围 · 减肚子的硬指标</h3>' +
      '<p class="sub">体重包含水分和肌肉，波动大；腰围直接反映肚子上的脂肪。在记录页点「+ 记腰围 / 体脂」，一把软尺就够了，每周 1~2 次。</p></div>';
  }

  if (anyBf) {
    const c = buildDualChart(days, { read: (r, p) => (r ? r[p + '_bf'] : undefined), goals: false, dec: 1, unit: '%' });
    if (!c.empty) {
      const legend = PERSON_IDS.map(p => {
        const last = lastKnownField(p + '_bf');
        return '<span class="lg-item"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) +
          (last ? ' <b>' + last.value.toFixed(1) + '</b> %' : '') + '</span>';
      }).join('');
      bfBox.innerHTML = '<div class="card chart-card">' +
        '<div class="chart-head2"><h3 class="card-label">体脂率走势 · ' + rangeName + '</h3><div class="lg">' + legend + '</div></div>' +
        '<p class="sub">来自你们的体脂秤数据 · 看趋势别看单日：早上空腹上秤最准</p>' +
        '<div class="chart-wrap">' + c.svg + '<div class="chart-tip"></div></div>' +
      '</div>';
      attachScrub(bfBox.querySelector('.chart-wrap'), c);
    } else bfBox.innerHTML = '';
  } else bfBox.innerHTML = '';
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
  return '<div class="card"><h3 class="card-label">' + (trendRange === 0 ? '全部' : trendRange + '天') + '概览 · 期初 → 现在</h3>' +
    '<p class="sub" style="margin-bottom:6px">「起点 → 最新」这段总共的变化 · 箭头=瘦了↓ / 胖了↑ · 「均」= 这段平均</p>' + rows + '</div>';
}

/* ================= 统计页 ================= */
function periodRow(p, cur, prev, unitLabel) {
  const name = '<span class="s-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span>';
  if (!cur && !prev) {
    return '<div class="s-row">' + name + '<span class="s-dim">暂无记录</span></div>';
  }
  /* 只显示真正有对比意义的行：本期没记→跳过；上期没数据→不显示占位（V22：砍废话） */
  if (!cur) return '';
  const curTxt = '<span class="s-val">' + cur.avg.toFixed(1) + '</span><span class="s-dim"> ' + cur.count + '天</span>';
  const delta = prev ? deltaChip(cur.avg - prev.avg) : '';
  const prevTxt = prev ? '<span class="s-dim">上期 ' + prev.avg.toFixed(1) + '</span>' : '';
  return '<div class="s-row">' + name + curTxt + '<span class="s-right">' + prevTxt + delta + '</span></div>';
}

function weeklyTableHTML() {
  const ws0 = weekStartOf(new Date());
  const weeks = [];
  for (let w = 0; w < 6; w++) {
    const from = dateKey(addDays(ws0, -7 * w)), to = dateKey(addDays(ws0, -7 * w + 6));
    const me = avgBetween(from, to, 'me'), pa = avgBetween(from, to, 'partner');
    if (!me && !pa) continue;
    weeks.push({ from, to, me, partner: pa });
  }
  if (!weeks.length) return '';
  /* 从旧到新排，方便逐周比 */
  weeks.reverse();
  return weeks.map((wk, idx) => {
    const prev = idx > 0 ? weeks[idx - 1] : null;
    const delta = (p, cur) => {
      if (!cur || !prev || !prev[p]) return '<span class="s-dim">—</span>';
      const d = cur.avg - prev[p].avg;
      if (Math.abs(d) < 0.05) return '<span class="delta flat">持平</span>';
      return d < 0 ? '<span class="delta down">↓' + Math.abs(d).toFixed(1) + '</span>' : '<span class="delta up">↑' + d.toFixed(1) + '</span>';
    };
    const cell = (p, v) => v
      ? '<div class="wk-val"><b>' + v.avg.toFixed(1) + '</b>' + delta(p, v) + '</div>'
      : '<div class="wk-val"><span class="s-dim">没记</span></div>';
    const sameMonth = wk.from.slice(0, 7) === wk.to.slice(0, 7);
    const label = fmtMD(wk.from) + '~' + (sameMonth ? wk.to.slice(8) : fmtMD(wk.to));
    /* 月内第几周：按结束日在当月的位置算，跨月的周归到天数多的那个月 */
    const anchor = new Date(parseKey(wk.to).getFullYear(), parseKey(wk.to).getMonth(), 1);
    const monthName = (anchor.getMonth() + 1) + '月';
    const nth = Math.floor((parseKey(wk.to).getDate() - 1) / 7) + 1;
    const isThis = idx === weeks.length - 1;
    return '<div class="wk-row">' +
      '<div class="wk-cell wk-date"><b class="wk-n">' + monthName + '第' + nth + '周</b>' +
        '<span class="s-dim">' + label + '</span>' +
        (isThis ? '<span class="wk-now">本周</span>' : '') +
      '</div>' +
      cell('me', wk.me) + cell('partner', wk.partner) +
    '</div>';
  }).join('');
}

/* 本月复盘卡：体重/腰围各「月初第一条 → 最新」+ 打卡天数，每个数字自带日期解释 */
function monthlyReviewHTML() {
  const mStr = todayKey().slice(0, 7);
  const mKeys = sortedKeys().filter(k => k.slice(0, 7) === mStr);
  if (!mKeys.length) return '';
  const rows = PERSON_IDS.map(p => {
    const w = mKeys.map(k => ({ k, v: state.records[k][p] })).filter(x => typeof x.v === 'number');
    const ws = mKeys.map(k => ({ k, v: state.records[k][p + '_waist'] })).filter(x => typeof x.v === 'number');
    const bits = [];
    if (w.length >= 2) {
      const d = w[w.length - 1].v - w[0].v;
      const sym = d <= -0.05 ? '↓' : d >= 0.05 ? '↑' : '±';
      bits.push('体重 ' + w[0].v.toFixed(1) + '（' + fmtMD(w[0].k) + '）→ ' + w[w.length - 1].v.toFixed(1) + '（' + fmtMD(w[w.length - 1].k) + '）kg，' + (Math.abs(d) < 0.05 ? '基本持平' : sym + Math.abs(d).toFixed(1)));
    } else if (w.length === 1) bits.push('体重只记了 1 次（' + fmtMD(w[0].k) + '），暂没法对比');
    else bits.push('本月体重还没记');
    if (ws.length >= 2) {
      const d = ws[ws.length - 1].v - ws[0].v;
      const sym = d <= -0.5 ? '↓' : d >= 0.5 ? '↑' : '±';
      bits.push('腰围 ' + ws[0].v.toFixed(1) + '（' + fmtMD(ws[0].k) + '）→ ' + ws[ws.length - 1].v.toFixed(1) + '（' + fmtMD(ws[ws.length - 1].k) + '）cm，' + (Math.abs(d) < 0.5 ? '基本持平' : sym + Math.abs(d).toFixed(1)));
    } else if (ws.length === 1) bits.push('腰围只量了 1 次（' + fmtMD(ws[0].k) + '），每周量 1~2 次才能看出趋势');
    else bits.push('本月腰围还没量');
    return '<div class="rv-row"><span class="rv-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span>' +
      '<div class="rv-body">' + bits.map(b => '<div>' + b + '</div>').join('') + '</div></div>';
  }).join('');
  const dom = +todayKey().slice(8, 10);
  return '<div class="card"><h3 class="card-label">本月复盘 · ' + (+mStr.slice(5, 7)) + '月</h3>' +
    '<p class="sub" style="margin-bottom:6px">本月第 1 次记录 → 最新 1 次 · 每个数字后面标了是哪天的</p>' +
    rows +
    '<div class="card-foot">本月已记录 ' + mKeys.length + ' 天（本月已过 ' + dom + ' 天）· 历史数据永久保留，随时在趋势页回看</div>' +
  '</div>';
}

function renderStats() {
  const keys = sortedKeys();
  let html = '';

  /* 本月复盘 · 顶部第一张卡（可复盘） */
  html += monthlyReviewHTML();

  /* 俩人对比 · 横条图 */
  const curMe = lastKnown('me'), curPa = lastKnown('partner');
  if (curMe !== null || curPa !== null) {
    const vals = [curMe, curPa].filter(v => v !== null);
    if (vals.length) {
      const lo = Math.min.apply(null, vals) - 0.6, hi = Math.max.apply(null, vals) + 0.6;
      const bar = (p, v) => {
        if (v === null) return '<div class="cmp-row"><span class="cmp-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span><div class="cmp-track"></div><span class="cmp-val s-dim">还没记</span></div>';
        const w = Math.max(6, (v - lo) / (hi - lo) * 100);
        return '<div class="cmp-row"><span class="cmp-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span>' +
          '<div class="cmp-track"><div class="cmp-fill" style="width:' + w.toFixed(1) + '%;background:' + COLORS[p] + '"></div></div>' +
          '<span class="cmp-val">' + v.toFixed(1) + ' kg</span></div>';
      };
      let diffLine = '';
      if (curMe !== null && curPa !== null) {
        const d = curMe - curPa;
        const heavier = d > 0 ? state.names.me : state.names.partner;
        const lighter = d > 0 ? state.names.partner : state.names.me;
        diffLine = Math.abs(d) < 0.05
          ? '<p class="cmp-diff">最新体重一模一样，齐头并进</p>'
          : '<p class="cmp-diff">' + esc(lighter) + ' 比 ' + esc(heavier) + ' 轻 <b>' + Math.abs(d).toFixed(1) + '</b> kg</p>';
      }
      html += '<div class="card"><h3 class="card-label">俩人对比 · 最新一次体重</h3>' +
        '<p class="sub">条越长 = 体重越大 · 对比的是最新一次记录</p>' +
        bar('me', curMe) + bar('partner', curPa) + diffLine + '</div>';
    }
  }

  /* 腰围对比 · 最新一次测量（有腰围数据才出现） */
  const wMe = lastKnownField('me_waist'), wPa = lastKnownField('partner_waist');
  if (wMe || wPa) {
    const vals = [wMe, wPa].filter(Boolean).map(x => x.value);
    const lo = Math.min.apply(null, vals) - 4, hi = Math.max.apply(null, vals) + 4;
    const wbar = (p, rec) => {
      const who = esc(state.names[p]);
      if (!rec) return '<div class="cmp-row"><span class="cmp-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + who + '</span><div class="cmp-track"></div><span class="cmp-val s-dim">还没量</span></div>';
      const w = Math.max(6, (rec.value - lo) / (hi - lo) * 100);
      const first = firstKnownField(p + '_waist');
      let chg = '';
      if (first && first.key !== rec.key) {
        const d = rec.value - first.value;
        chg = d <= -0.5 ? '（比首次 ↓' + Math.abs(d).toFixed(1) + '）' : d >= 0.5 ? '（比首次 ↑' + d.toFixed(1) + '）' : '（和首次基本持平）';
      }
      return '<div class="cmp-row"><span class="cmp-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + who + '</span>' +
        '<div class="cmp-track"><div class="cmp-fill" style="width:' + w.toFixed(1) + '%;background:' + COLORS[p] + '"></div></div>' +
        '<span class="cmp-val">' + rec.value.toFixed(1) + ' cm</span></div>' +
        '<div class="cmp-sub">' + fmtMD(rec.key) + '记录' + chg + ' · 腰围减小=肚子脂肪在掉</div>';
    };
    html += '<div class="card"><h3 class="card-label">腰围对比 · 最新一次测量</h3>' +
      '<p class="sub">腰围是肚子脂肪的硬指标 · 健康参考：男性 &lt; 90cm，女性 &lt; 85cm</p>' +
      wbar('me', wMe) + wbar('partner', wPa) + '</div>';
  }

  /* 体成分 · 最新报告（有完整报告数据才出现，来源：小米秤体成分页） */
  const compTiles = [];
  const VF_REF = '健康 <5级';
  PERSON_IDS.forEach(p => {
    const vf = lastKnownField(p + '_vf'), mm = lastKnownField(p + '_mm'), bmr = lastKnownField(p + '_bmr');
    if (!vf && !mm && !bmr) return;
    const tileFoot = x => '<span class="tile-foot">' + x + '</span>';
    if (vf) compTiles.push(
      '<div class="tile">' +
        '<span class="tile-label"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + ' · 内脏脂肪</span>' +
        '<div class="tile-num">' + vf.value.toFixed(0) + '<small>级</small></div>' +
        tileFoot((vf.value < 5
          ? '<span class="delta down">达标</span>'
          : '<span class="delta up">警戒</span>') + '<span>' + VF_REF + ' · ' + fmtMD(vf.key) + '</span>') +
      '</div>');
    if (mm) compTiles.push(
      '<div class="tile">' +
        '<span class="tile-label"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + ' · 肌肉量</span>' +
        '<div class="tile-num">' + mm.value.toFixed(1) + '<small>kg</small></div>' +
        tileFoot('<span>掉肌肉=代谢掉，减脂期守住它 · ' + fmtMD(mm.key) + '</span>') +
      '</div>');
    if (bmr) compTiles.push(
      '<div class="tile">' +
        '<span class="tile-label"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + ' · 基础代谢</span>' +
        '<div class="tile-num">' + bmr.value.toFixed(0) + '<small>千卡/天</small></div>' +
        tileFoot('<span>躺着也消耗的热量，每天吃别低于它 · ' + fmtMD(bmr.key) + '</span>') +
      '</div>');
  });
  if (compTiles.length) {
    html += '<div class="card"><h3 class="card-label">体成分 · 最新报告</h3>' +
      '<p class="sub">来自小米秤完整报告 · 记录页「+ 记腰围 / 体脂」最下面一栏抄数</p>' +
      '<div class="tile-grid">' + compTiles.join('') + '</div></div>';
  }

  /* 周报表 · 最近 6 周 */
  const wkRows = weeklyTableHTML();
  if (wkRows) {
    html += '<div class="card"><h3 class="card-label">周报 · 每周平均</h3>' +
      '<p class="sub">一人一列 · 「比上周」= 和上一个有记录的周平均比，中间没记的周自动跳过（↓瘦 ↑胖）</p>' +
      '<div class="wk-head"><span>周</span><span>' + esc(state.names.me) + '</span><span>' + esc(state.names.partner) + '</span></div>' + wkRows + '</div>';
  }

  /* 重点变化 · 一张结论卡（V22：合并周/月/累计三张卡，砍掉无对比意义的行，结论式大字） */
  if (keys.length) {
    const ws = weekStartOf(new Date());
    const we = dateKey(addDays(ws, 6));
    const ps = dateKey(addDays(ws, -7)), pe = dateKey(addDays(ws, -1));
    const m0 = monthRange(0), m1 = monthRange(1);
    const blocks = PERSON_IDS.map(p => {
      const first = firstKnown(p);
      if (!first) return '';
      const lk = lastKeyOf(p);
      const cur = state.records[lk][p];
      const delta = cur - first.value;
      const spanDays = Math.max(1, Math.round((parseKey(lk) - parseKey(first.key)) / 86400000));
      const weeks = spanDays / 7;
      const rate = weeks >= 1 ? (delta / weeks) : null;
      /* 一句话结论：这个数字意味着什么 */
      const verdict = delta <= -0.5 ? '有效果，照这个劲头继续'
        : delta >= 0.5 ? '比起点高了，先看趋势线别慌'
        : '基本持平，身体在适应期';
      const verdictCls = delta <= -0.5 ? ' good' : delta >= 0.5 ? ' warn' : '';
      const rateTxt = rate !== null && Math.abs(rate) >= 0.005
        ? ' · 约 <b>' + (rate < 0 ? '↓' : '↑') + Math.abs(rate).toFixed(2) + '</b> kg/周'
        : '';
      /* 本周 vs 上周：有上期数据才有意义，没有就不显示这行 */
      const wkCur = avgBetween(dateKey(ws), we, p), wkPrev = avgBetween(ps, pe, p);
      let wkLine = '';
      if (wkCur && wkPrev) {
        const d = wkCur.avg - wkPrev.avg;
        const arrow = d > 0.05 ? '↑' : d < -0.05 ? '↓' : '≈';
        wkLine = '本周平均 <b>' + wkCur.avg.toFixed(1) + '</b>，比上周 ' + arrow + Math.abs(d).toFixed(1) +
          ' —— ' + (Math.abs(d) < 0.3 ? '波动正常，稳住' : Math.abs(d) < 0.8 ? '小变化，在正常范围' : '变化有点大，看下周走向');
      }
      const moCur = avgBetween(m0.from, m0.to, p), moPrev = avgBetween(m1.from, m1.to, p);
      let moLine = '';
      if (moCur && moPrev) {
        const d = moCur.avg - moPrev.avg;
        const arrow = d > 0.05 ? '↑' : d < -0.05 ? '↓' : '≈';
        moLine = '本月平均 ' + moCur.avg.toFixed(1) + '，比上月 ' + arrow + Math.abs(d).toFixed(1);
      }
      return '<div class="sum-blk">' +
        '<div class="sum-head">' +
          '<span class="s-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span>' +
          '<span class="s-dim">' + fmtCN(first.key) + ' 起</span>' +
          deltaChip(delta) +
        '</div>' +
        '<p class="sum-big">' + first.value.toFixed(1) + ' <i>→</i> <b>' + cur.toFixed(1) + '</b> <small>kg</small></p>' +
        '<p class="sum-verdict' + verdictCls + '">' + verdict + rateTxt + '</p>' +
        (wkLine ? '<p class="sum-line">' + wkLine + '</p>' : '') +
        (moLine ? '<p class="sum-line dim">' + moLine + '</p>' : '') +
      '</div>';
    }).filter(Boolean).join('<div class="divider"></div>');
    if (blocks) {
      html += '<div class="card"><h3 class="card-label">重点变化</h3>' +
        '<p class="sub">从第一天记到现在 · 只说有意义的结论</p>' + blocks + '</div>';
    }
  }

  html += weekPlanHTML();
  html += historyHTML();
  document.getElementById('stats-body').innerHTML = html;
}

/* 月份折叠状态（V30）：默认只展开当月，历史月收起 */
let expandedMonths = {};
let historyMonthSeeded = false;
let monthView = {}; /* V31: 每月视图 'list' | 'cal'，默认列表 */
let planEditDow = -1; /* 正在改周几的运动（0=周一…6=周日） */

const WEEK_PLAN_DEFAULT = ['快走 40 分钟', '休息', '力量训练 30 分钟', '休息', '有氧运动 40 分钟', '拉伸散步', '休息'];
const PLAN_PRESETS = ['快走 40 分钟', '慢跑 30 分钟', '力量训练 30 分钟', '有氧运动 40 分钟', '瑜伽 20 分钟', '拉伸散步', '休息'];

function applyTheme() {
  const t = state.ui && state.ui.theme;
  if (t && t !== 'classic') document.body.setAttribute('data-theme', t);
  else document.body.removeAttribute('data-theme');
}

/* 按勾选的装备生成一周安排：力量隔天、有氧穿插、至少两个休息日 */
function generateWeekPlan() {
  const eq = (state.ui && state.ui.equip) || [];
  const has = k => eq.indexOf(k) > -1;
  let strength = has('dumb') ? '哑铃力量 30 分钟'
    : has('band') ? '弹力带力量 30 分钟'
    : has('body') ? '徒手力量 30 分钟' : null;
  const cardios = [];
  if (has('tread')) cardios.push('跑步机快走 40 分钟');
  if (has('walk')) cardios.push('快走 40 分钟');
  if (has('run')) cardios.push('慢跑 30 分钟');
  if (has('jump')) cardios.push('跳绳 15 分钟×3 组');
  if (has('swim')) cardios.push('游泳 30 分钟');
  if (has('ride')) cardios.push('骑行 40 分钟');
  if (!cardios.length) cardios.push('快走 40 分钟');
  const soft = has('yoga') ? '瑜伽/垫上拉伸 20 分钟' : '拉伸散步';
  if (!strength) strength = has('body') ? '徒手力量 30 分钟' : null;
  /* 模板：1力量 2休 3有氧 4休/拉伸 5力量 6有氧 7休 */
  const c0 = cardios[0], c1 = cardios[1] || cardios[0];
  return [
    strength || c0,
    soft,
    c0,
    strength ? soft : c1,
    strength || c1,
    strength ? c1 : (has('yoga') ? soft : c0),
    '休息'
  ];
}

function weekPlanArr() {
  const p = (state.ui && state.ui.weekPlan) || [];
  return WEEK_PLAN_DEFAULT.map((d, i) => (typeof p[i] === 'string' && p[i]) ? p[i] : d);
}

/* 迷你月历：月份折叠视图的"日历形态"（V31），复用打卡月历的格子样式 */
function miniMonthHTML(mkey) {
  const y = +mkey.slice(0, 4), mo = +mkey.slice(5, 7) - 1;
  const first = new Date(y, mo, 1);
  const startPad = first.getDay();
  const dim = new Date(y, mo + 1, 0).getDate();
  const tk = todayKey();
  let cells = '';
  for (let i = 0; i < startPad; i++) cells += '<span class="cal-cell cal-pad"></span>';
  for (let d = 1; d <= dim; d++) {
    const k = dateKey(new Date(y, mo, d));
    const r = state.records[k] || {};
    const future = k > tk;
    const cls = 'cal-cell' + (k === tk ? ' cal-today' : '') + (future ? ' cal-future' : '');
    const dots = (typeof r.me === 'number' ? '<i style="background:' + COLORS.me + '"></i>' : '<i></i>') +
      (typeof r.partner === 'number' ? '<i style="background:' + COLORS.partner + '"></i>' : '<i></i>');
    /* V33：格子里直接带当天体重数字（有记录的那人），数字+彩点都有含义 */
    let wt = '';
    if (typeof r.me === 'number') wt = '<span class="cal-w" style="color:' + COLORS.me + '">' + r.me.toFixed(1) + '</span>';
    else if (typeof r.partner === 'number') wt = '<span class="cal-w" style="color:' + COLORS.partner + '">' + r.partner.toFixed(1) + '</span>';
    cells += '<span class="' + cls + '"><span class="cal-d">' + d + '</span>' + (wt || '<span class="cal-dots">' + dots + '</span>') + '</span>';
  }
  return '<div class="mini-cal">' +
    '<div class="cal-week">' + ['日','一','二','三','四','五','六'].map(w => '<span>' + w + '</span>').join('') + '</div>' +
    '<div class="cal-grid">' + cells + '</div>' +
  '</div>';
}

/* 每周减脂安排卡（V31）：减脂三分练七分吃，动起来代谢才不掉 */
function weekPlanHTML() {
  const plan = weekPlanArr();
  const now = new Date();
  const todayDow = (now.getDay() + 6) % 7; /* 0=周一 */
  const rows = plan.map((txt, i) => {
    const rest = txt === '休息';
    return '<button class="wp-row' + (i === todayDow ? ' today' : '') + '" data-action="plan-day" data-dow="' + i + '">' +
      '<span class="wp-dow">' + ['周一','周二','周三','周四','周五','周六','周日'][i] + (i === todayDow ? ' · 今天' : '') + '</span>' +
      '<span class="wp-txt' + (rest ? ' rest' : '') + '">' + esc(txt) + '</span>' +
      '<span class="wp-edit">改</span>' +
    '</button>';
  }).join('');
  return '<div class="card">' +
    '<h3 class="card-label">每周减脂安排</h3>' +
    '<div class="key-line">减脂 = 70% 管住嘴 + 30% 迈开腿 · 一周动 3~4 次，练一天歇一天</div>' +
    rows +
    '<p class="set-tip">点任意一天改安排 · 力量训练保住肌肉，减脂期比纯有氧更保代谢 · 安排自动保存</p>' +
  '</div>';
}

function renderPlanSheet() {
  const body = document.getElementById('plan-body');
  if (!body || planEditDow < 0) return;
  const plan = weekPlanArr();
  document.getElementById('plan-sheet-title').textContent = ['周一','周二','周三','周四','周五','周六','周日'][planEditDow] + '做什么？';
  body.innerHTML =
    '<p class="set-lab">现在的安排</p>' +
    '<div class="key-line">' + esc(plan[planEditDow]) + '</div>' +
    '<p class="set-lab">换成</p>' +
    PLAN_PRESETS.map(p =>
      '<button class="set-line' + (plan[planEditDow] === p ? ' on' : '') + '" data-action="plan-pick" data-v="' + p + '">' +
        '<span class="set-line-txt"><b>' + p + '</b></span>' +
      '</button>'
    ).join('') +
    '<p class="set-tip">建议：力量和有氧隔天轮换，练后第二天酸痛是正常的，休息日拉伸恢复更快</p>';
}

function historyHTML() {
  const keys = sortedKeys().reverse();
  if (!keys.length) return '<div class="card"><h3 class="card-label">全部记录</h3><p class="sub">还没有记录</p></div>';
  const tk = todayKey();
  /* 先按月分组，每组带天数摘要 */
  const months = [];
  let curM = null;
  keys.forEach(k => {
    const d = parseKey(k);
    const ymKey = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const ymLabel = d.getFullYear() + '年' + (d.getMonth() + 1) + '月';
    if (!curM || curM.key !== ymKey) { curM = { key: ymKey, label: ymLabel, days: [] }; months.push(curM); }
    curM.days.push(k);
  });
  if (!historyMonthSeeded) {
    months.forEach(m => { expandedMonths[m.key] = (m.key === tk.slice(0, 7)); });
    historyMonthSeeded = true;
  }
  let html = '<div class="card list-card"><h3 class="card-label" style="padding:12px 0 4px">全部记录 · 点按可修改</h3>' +
    '<p class="sub" style="padding:0 0 6px">点月份头展开/收起 · 右侧 📅 可切换成日历缩略图 · 每行小箭头 = 和上一次记录比（↓瘦 ↑胖）</p>';
  months.forEach(m => {
    const open = !!expandedMonths[m.key];
    const isCal = monthView[m.key] === 'cal';
    const mLabel = m.label + (m.key === tk.slice(0, 7) ? '（本月）' : '');
    /* V31：月份头 = 折叠开关 + 右侧视图切换（列表/日历），div 嵌套避免 button 套 button */
    html += '<div class="m-toggle' + (open ? ' open' : '') + '" data-action="toggle-month" data-mkey="' + m.key + '">' +
      '<span class="m-arrow">' + (open ? '▾' : '▸') + '</span>' +
      '<b>' + mLabel + '</b>' +
      '<button class="m-viewbtn' + (isCal ? ' on' : '') + '" data-action="month-view" data-mkey="' + m.key + '">' +
        (isCal ? '列表' : '📅 日历') +
      '</button>' +
      '<span class="m-days">' + m.days.length + ' 天</span>' +
    '</div>';
    if (!open) return; /* forEach 回调里用 return 跳过 */
    html += '<div class="m-body">';
    if (isCal) {
      html += miniMonthHTML(m.key);
    } else {
      m.days.forEach(k => {
        const r = state.records[k], d = parseKey(k);
        const vals = PERSON_IDS.map(p => {
          if (typeof r[p] !== 'number') return '<div class="h-v"><span class="hv-name" style="color:' + COLORS[p] + '">' + esc(state.names[p]) + '</span><span class="s-dim">未记录</span></div>';
          const prev = prevRecord(k, p);
          return '<div class="h-v"><span class="hv-name" style="color:' + COLORS[p] + '">' + esc(state.names[p]) + '</span><b>' + r[p].toFixed(1) + '</b>' + deltaChip(prev ? r[p] - prev.value : null) + '</div>';
        }).join('');
        html += '<div class="h-row" data-key="' + k + '">' +
          '<div class="h-date"><div class="h-d1">' + fmtMD(k) + '</div><div class="h-d2">' + WEEK_LABELS[d.getDay()] + (k === tk ? ' · 今天' : '') + '</div></div>' +
          '<div class="h-vals">' + vals + (r.note ? '<div class="h-note">' + esc(r.note) + '</div>' : '') + '</div>' +
          '<button class="h-del" data-action="del-day" data-key="' + k + '" aria-label="删除">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 7h14M10 7V5h4v2M8 7l1 12h6l1-12"/></svg>' +
          '</button>' +
        '</div>';
      });
    }
    html += '</div>';
  });
  html += '</div>';
  return html;
}

/* ================= 日期选择（自绘 sheet，替代系统日期控件） ================= */
let dsYM = null;
function openDateSheet() {
  dsYM = null; /* 跟随当前编辑日期所在月 */
  renderDateSheet();
  document.getElementById('sheet-mask').classList.add('show');
  document.getElementById('date-sheet').classList.add('show');
}
function closeDateSheet() {
  document.getElementById('date-sheet').classList.remove('show');
  if (!document.getElementById('settings-sheet').classList.contains('show')) {
    document.getElementById('sheet-mask').classList.remove('show');
  }
}
function renderDateSheet() {
  const now = parseKey(todayKey());
  const sel = parseKey(currentDate);
  if (!dsYM) dsYM = { y: sel.getFullYear(), m: sel.getMonth() };
  const startPad = new Date(dsYM.y, dsYM.m, 1).getDay();
  const dim = new Date(dsYM.y, dsYM.m + 1, 0).getDate();
  const tk = todayKey();
  let cells = '';
  for (let i = 0; i < startPad; i++) cells += '<span class="cal-cell cal-pad"></span>';
  for (let d = 1; d <= dim; d++) {
    const k = dateKey(new Date(dsYM.y, dsYM.m, d));
    const r = state.records[k] || {};
    const future = k > tk;
    const cls = 'cal-cell ds-cell' + (k === tk ? ' cal-today' : '') + (k === currentDate ? ' cal-sel' : '') + (future ? ' cal-future' : '');
    const hasAny = typeof r.me === 'number' || typeof r.partner === 'number';
    const dotColor = typeof r.me === 'number' ? COLORS.me : COLORS.partner;
    cells += '<button class="' + cls + '" data-dscal="' + k + '"' + (future ? ' disabled' : '') + '>' +
      '<span class="cal-d">' + d + '</span>' +
      '<span class="cal-dots">' + (hasAny ? '<i style="background:' + dotColor + '"></i>' : '') + '</span></button>';
  }
  document.getElementById('datesheet-body').innerHTML =
    '<div class="cal-head">' +
      '<button class="cal-nav" data-action="ds-prev" aria-label="上个月">‹</button>' +
      '<b>' + dsYM.y + ' 年 ' + (dsYM.m + 1) + ' 月</b>' +
      '<button class="cal-nav" data-action="ds-next" aria-label="下个月">›</button>' +
    '</div>' +
    '<div class="cal-week">' + ['日','一','二','三','四','五','六'].map(w => '<span>' + w + '</span>').join('') + '</div>' +
    '<div class="cal-grid ds-grid">' + cells + '</div>' +
    '<p class="cal-legend">带点 = 那天有记录 · 最多选到今天</p>' +
    '<button class="btn ghost" data-action="goto-today" style="margin-top:8px">回到今天</button>';
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

/* 换手机 / 数据迁移指引（V24） */
function migrateGuideHTML() {
  return '<details class="mig-guide">' +
    '<summary>换新手机怎么把数据带过去？点开看 3 步</summary>' +
    '<ol class="mig-steps">' +
      '<li><b>新手机</b>用 Safari 打开本页网址（就是你现在这个地址），按设置里的「安装到桌面」把 App 装好</li>' +
      '<li>在新手机上打开 App → 设置 → 自动云备份 → 开通（用你原来的授权码）</li>' +
      '<li>设置 → 点「从云端恢复」→ 确认覆盖。全部记录、目标、卡片设置一步到位</li>' +
    '</ol>' +
    '<p class="mig-note">没开通云备份？旧手机上点「一键备份」把文本发到微信，新手机粘贴到「恢复数据」框里导入，效果一样</p>' +
  '</details>';
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
      '<h3 class="card-label">主题外观</h3>' +
      '<div class="theme-row">' +
        [{ k: 'classic', n: '经典', c: '#007aff' }, { k: 'warm', n: '暖阳', c: '#d97a2b' }, { k: 'mint', n: '薄荷', c: '#1e9e6a' }, { k: 'ocean', n: '海盐', c: '#2d6cdf' }, { k: 'dark', n: '暗夜', c: '#1c1c22' }].map(t =>
          '<button class="theme-swatch' + ((state.ui.theme || 'classic') === t.k ? ' on' : '') + '" data-action="set-theme" data-v="' + t.k + '">' +
            '<span class="sw-dot" style="background:' + t.c + '"></span>' + t.n +
          '</button>'
        ).join('') +
      '</div>' +
      '<p class="set-tip">暗夜主题夜间看数据不刺眼 · 选完立即生效</p>' +
    '</div>' +
    '<div class="card">' +
      '<h3 class="card-label">我的运动与器械</h3>' +
      '<p class="sub">勾上你会做的和家里有的，周计划按这个排</p>' +
      '<div class="equip-grid">' +
        EQUIP_LIST.map(t =>
          '<button class="set-chip' + ((state.ui.equip || []).indexOf(t.k) > -1 ? ' on' : '') + '" data-action="toggle-equip" data-v="' + t.k + '">' +
          ((state.ui.equip || []).indexOf(t.k) > -1 ? '✓ ' : '') + t.n + '</button>'
        ).join('') +
      '</div>' +
      '<button class="btn" data-action="regen-plan">按我的器械重排周计划</button>' +
      '<p class="set-tip">重排后仍可去统计页逐天微调 · 没勾的器械不会出现在安排里</p>' +
    '</div>' +
    '<div class="card">' +
      '<h3 class="card-label">称呼</h3>' +
      '<label class="field"><span>我的称呼</span><input class="text-input" id="name-me" value="' + esc(state.names.me) + '" maxlength="8"></label>' +
      '<label class="field"><span>对方的称呼</span><input class="text-input" id="name-partner" value="' + esc(state.names.partner) + '" maxlength="8"></label>' +
      '<div class="settings-btns"><button class="btn" data-action="save-names">保存称呼</button></div>' +
    '</div>' +
    '<div class="card">' +
      '<h3 class="card-label">目标体重（选填）</h3>' +
      '<p class="sub">设置后会以虚线显示在趋势图上。</p>' +
      '<label class="field"><span>' + esc(state.names.me) + '</span><input class="text-input" id="goal-me" type="number" step="0.1" inputmode="decimal" value="' + (state.goals.me !== null ? state.goals.me : '') + '" placeholder="选填"></label>' +
      '<label class="field"><span>' + esc(state.names.partner) + '</span><input class="text-input" id="goal-partner" type="number" step="0.1" inputmode="decimal" value="' + (state.goals.partner !== null ? state.goals.partner : '') + '" placeholder="选填"></label>' +
      '<div class="settings-btns"><button class="btn" data-action="save-goals">保存目标</button></div>' +
    '</div>' +
    (ghConf
      ? '<div class="card">' +
        '<h3 class="card-label">自动云备份</h3>' +
        '<div class="key-line">✓ 数据已自动上云 —— 手机丢了、换新机，记录都在</div>' +
        '<p class="sub">每次记录后自动备份（' + (ghConf.provider === 'gitee' ? 'Gitee 国内通道' : 'GitHub') + ' · 私有仓库 ' + esc(ghConf.owner) + '/' + esc(ghConf.repo) + '，只有你能看）</p>' +
        '<p class="s-dim" style="margin-bottom:10px">上次同步：' + lastSyncText() + '</p>' +
        '<div class="settings-btns"><button class="btn" data-action="cloud-sync">立即同步</button><button class="btn ghost" data-action="cloud-restore">从云端恢复</button></div>' +
        migrateGuideHTML() +
        '<button class="btn danger" data-action="cloud-off">关闭自动云备份</button>' +
      '</div>'
      : '<div class="card">' +
        '<h3 class="card-label">自动云备份</h3>' +
        '<p class="sub">开通后数据自动上云，永不用手动备份。推荐用 Gitee 私人令牌（国内网络稳定）。粘贴令牌：</p>' +
        '<textarea class="json-area cloud-area" placeholder="粘贴配置链接或授权码" spellcheck="false"></textarea>' +
        '<button class="btn" data-action="cloud-setup">开通自动云备份</button>' +
        migrateGuideHTML() +
        '<p class="s-dim" id="cloud-diag" style="display:none;margin-top:10px;color:#b91c1c;word-break:break-all">' + esc(diagFromStorage()) + '</p>' +
      '</div>') +
    '<div class="card">' +
      '<h3 class="card-label">手动备份 · 不依赖网络</h3>' +
      '<div class="key-line">把数据变成一段文字，发到微信存着，随存随恢复</div>' +
      '<button class="btn" data-action="backup-now">一键备份（弹出分享面板）</button>' +
      '<button class="btn ghost" data-action="copy-link">复制存档链接</button>' +
      '<div class="divider">恢复数据 · 粘贴进来，点一下就导入</div>' +
      '<textarea class="import-area json-area" placeholder="粘贴备份文本或存档链接" spellcheck="false"></textarea>' +
      '<button class="btn" data-action="import-backup">导入并覆盖</button>' +
      '<p class="s-dim" style="margin-top:10px">状态：' + backupTxt + '</p>' +
    '</div>' +
    '<div class="card">' +
      '<h3 class="card-label">数据状态</h3>' +
      '<div class="key-line">' + (storeOk ? '✓ 一切正常' : '⚠️ 存储异常，检查是否无痕模式') + '</div>' +
      '<p class="sub">共 ' + days + ' 天' + (earliest ? ' · 自 ' + fmtCN(earliest) : '') + ' · 约 ' + (size / 1024).toFixed(1) + ' KB · 上次备份：' + backupTxt + '</p>' +
    '</div>' +
    '<div class="card">' +
      '<h3 class="card-label">指标怎么看</h3>' +
      '<p class="sub" style="margin-bottom:6px">每个指标：多久看一次 · 什么标准 · 一句话意思。你的当前值在趋势页和复盘卡里</p>' +
      '<div class="divider">体重 · 每天早上</div>' +
      '<p class="sub">只看周趋势。单日 ±1kg 是水分和饭量，不是胖瘦，别较劲</p>' +
      '<div class="divider">体脂率 · 每天早上（上秤顺手抄）</div>' +
      '<p class="sub">男性 10~20% 正常。减肚子的第二证据：体重不动但体脂在降 = 脂肪真在走</p>' +
      '<div class="divider">腰围 · 每周 1~2 次（软尺）</div>' +
      '<p class="sub">男性 &lt; 90cm 健康。贴肚脐绕一圈，呼气末读数。减肚子最诚实的硬指标</p>' +
      '<div class="divider">内脏脂肪 · 每月复测看一次</div>' +
      '<p class="sub">秤的完整报告里看，&lt; 5 理想。它超标 = 肚子里的脂肪包着器官，是减肚子的核心理由</p>' +
      '<div class="divider">基础代谢 · 吃饭时想起</div>' +
      '<p class="sub">每天躺着也消耗的热量。减脂期每天吃的别低于这个数，否则掉肌肉、代谢跟着掉，越减越难</p>' +
      '<div class="divider">身体年龄 / 身体得分 · 每月复测</div>' +
      '<p class="sub">全身底子的总评分。这个好说明问题在局部（肚子），不用全面节食</p>' +
    '</div>' +
    '<div class="card">' +
      '<h3 class="card-label">身高 · BMI 自动算</h3>' +
      '<p class="sub">填一次身高，记录页体重下面会自动显示 BMI（不用手填）。两个人各填各的</p>' +
      PERSON_IDS.map(p => {
        const h = state.heights && state.heights[p];
        return '<div class="in-row x-row">' +
          '<span class="in-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span>' +
          '<input class="w-input x-input" type="number" step="1" inputmode="numeric" placeholder="' + (h ? '上次 ' + h : '身高 cm') + '" data-height="' + p + '" value="' + (h || '') + '">' +
          '<span class="unit">cm</span>' +
        '</div>';
      }).join('') +
      '<button class="btn" data-action="save-heights" style="margin-top:8px">保存身高</button>' +
    '</div>' +
    '<div class="card">' +
      '<h3 class="card-label">安装到桌面</h3>' +
      '<p class="sub">iPhone · Safari 打开本页 → 分享 → 添加到主屏幕<br>Android · Chrome → 右上角菜单 → 添加到主屏幕</p>' +
    '</div>' +
    '<div class="card">' +
      '<h3 class="card-label">版本与更新</h3>' +
      '<p class="sub">当前版本：<b>' + APP_VERSION + '</b>' + (CHANGELOG.length ? ' · 最近更新 ' + esc(CHANGELOG[0].d) : '') + '<br>更新后如果界面看着没变化，来这里核对版本号——修 bug 类的优化本来就不改变界面长相</p>' +
      CHANGELOG.slice(0, 5).map(c =>
        '<div class="divider">' + c.v + ' · ' + esc(c.d) + '</div>' +
        '<ul class="changelog" style="margin:4px 0 8px;padding-left:18px">' +
        c.items.map(t => '<li class="sub" style="margin-bottom:3px">' + esc(t) + '</li>').join('') +
        '</ul>'
      ).join('') +
    '</div>' +
    '<div class="card">' +
      '<button class="btn danger" data-action="clear-all">清空全部记录</button>' +
      '<p class="sub" style="text-align:center;margin-top:10px">' + APP_VERSION + ' · 本机存储 + GitHub 云备份 · 不上传任何第三方服务器</p>' +
    '</div>';
}

function saveHeights() {
  let err = null;
  PERSON_IDS.forEach(p => {
    const input = document.querySelector('input[data-height="' + p + '"]');
    if (!input) return;
    const raw = input.value.trim();
    if (raw === '') { state.heights[p] = null; return; }
    const v = parseFloat(raw);
    if (isNaN(v) || v < 40 || v > 250) { err = state.names[p] + ' 的身高（' + raw + '）看着不对，应在 40~250 之间'; return; }
    state.heights[p] = Math.round(v);
  });
  if (err) { toast(err); return; }
  if (persist()) { toast('身高已保存 · BMI 会自动出现在体重下面'); renderAll(); closeSettings(); }
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
function saveGoalsInline() {
  state.goals = sanitizeGoals({
    me: (document.getElementById('qgoal-me') || {}).value,
    partner: (document.getElementById('qgoal-partner') || {}).value
  });
  if (state.goals.me === null && state.goals.partner === null) { toast('至少填一个人的目标'); return; }
  persist();
  renderAll();
  toast('目标已保存，进度条长出来了');
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
    remote.ui = sanitizeUI(remote.ui);
    state = remote;
    persist();
    renderAll();
    area.value = '';
    toast('已恢复 ' + count + ' 天记录');
  });
}

function clearAll() {
  /* V24 双保险：清空前自动留一份云端备份，误触也能一键找回 */
  if (ghConf && ghConf.token) {
    askConfirm('清空前会自动把全部数据备份到云端（私有仓库，只有你能看）。\n\n备份完成后手机上的记录会被清空，之后可在 设置 → 从云端恢复 一键找回。\n\n确定继续吗？').then(ok => {
      if (!ok) return;
      toast('正在先备份到云端…');
      cloudBackup('manual').then(ok2 => {
        if (ok2) {
          markBackedUp();
          state.records = {};
          persist();
          renderAll();
          toast('已备份到云端并清空 · 可随时从云端恢复');
        } else {
          askConfirm('⚠️ 云备份失败！现在清空的话数据找不回来。\n\n建议：检查网络后再试，或先用「一键备份」存到微信/备忘录。\n\n仍要强 制清空吗？').then(ok3 => {
            if (!ok3) return;
            state.records = {};
            persist();
            renderAll();
            toast('已清空（注意：本次没有云端备份）');
          });
        }
      });
    });
  } else {
    askConfirm('⚠️ 你还没开通自动云备份，清空后数据无法找回！\n\n建议：先点「一键备份」把备份文本存到微信/备忘录，或先开通云备份。\n\n确定还是要清空全部记录吗？').then(ok => {
      if (!ok) return;
      state.records = {};
      persist();
      renderAll();
      toast('已清空（没有云端备份，无法恢复）');
    });
  }
}

/* ================= 事件绑定 ================= */
document.addEventListener('click', e => {
  const tab = e.target.closest('#tabbar .tab');
  if (tab) { switchTab(tab.dataset.page); return; }

  const seg = e.target.closest('#range-seg button');
  if (seg) {
    trendRange = +seg.dataset.range;
    state.ui.trendRange = trendRange;  /* 记住选择，下次打开还是它 */
    persist();
    renderTrend();
    return;
  }

  /* 月历：点某天 → 就地展开/收起当天详情（V28：不跳转，先看后改） */
  const calCell = e.target.closest('[data-cal]');
  if (calCell && !calCell.disabled) {
    selectedCalDay = selectedCalDay === calCell.dataset.cal ? null : calCell.dataset.cal;
    renderTrend();
    return;
  }

  /* 日期选择 sheet：点某天 → 选中并关闭 */
  const dsCell = e.target.closest('[data-dscal]');
  if (dsCell && !dsCell.disabled) {
    currentDate = dsCell.dataset.dscal;
    resetDrafts();
    closeDateSheet();
    renderAll();
    return;
  }

  const act = e.target.closest('[data-action]');
  if (act) {
    const a = act.dataset.action;
    if (a === 'save-all') saveAll();
    else if (a === 'goto-today') { currentDate = todayKey(); resetDrafts(); closeDateSheet(); renderAll(); }
    else if (a === 'goto-makeup') { const g = lastGapDay(); if (g) { currentDate = g.key; resetDrafts(); closeDateSheet(); renderAll(); } }
    else if (a === 'open-datesheet') openDateSheet();
    else if (a === 'close-datesheet') closeDateSheet();
    else if (a === 'open-heroset') openHeroSet();
    else if (a === 'close-heroset') closeHeroSet();
    else if (a === 'hero-size') { state.ui.heroLayout = act.dataset.v === 'stack' ? 'stack' : 'grid'; persist(); renderHeroSet(); renderAll(); }
    else if (a === 'hero-order') { const v = act.dataset.v; if (PERSON_IDS.includes(v)) { state.ui.heroOrder = [v, PERSON_IDS.find(x => x !== v)]; persist(); renderHeroSet(); renderAll(); } }
    else if (a === 'hm-toggle') { const k = act.dataset.key; if (state.ui.heroMetrics && k in state.ui.heroMetrics) { state.ui.heroMetrics[k] = !state.ui.heroMetrics[k]; persist(); renderHeroSet(); renderAll(); } }
    else if (a === 'close-sheets') { closeSettings(); closeDateSheet(); closeHeroSet(); }
    else if (a === 'ds-prev') { dsYM.m--; if (dsYM.m < 0) { dsYM.m = 11; dsYM.y--; } renderDateSheet(); }
    else if (a === 'ds-next') { dsYM.m++; if (dsYM.m > 11) { dsYM.m = 0; dsYM.y++; } renderDateSheet(); }
    else if (a === 'cal-close') { selectedCalDay = null; renderTrend(); }
    else if (a === 'edit-cal-day') {
      if (selectedCalDay) { currentDate = selectedCalDay; resetDrafts(); switchTab('record'); renderAll(); }
    }
    else if (a === 'cal-prev') { calYM.m--; if (calYM.m < 0) { calYM.m = 11; calYM.y--; } selectedCalDay = null; renderTrend(); }
    else if (a === 'cal-next') { calYM.m++; if (calYM.m > 11) { calYM.m = 0; calYM.y++; } selectedCalDay = null; renderTrend(); }
    else if (a === 'set-theme') {
      state.ui.theme = act.dataset.v;
      persist();
      applyTheme();
      renderSettings();
    }
    else if (a === 'toggle-equip') {
      const v = act.dataset.v;
      state.ui.equip = state.ui.equip || [];
      const i = state.ui.equip.indexOf(v);
      if (i > -1) state.ui.equip.splice(i, 1); else state.ui.equip.push(v);
      persist();
      renderSettings();
    }
    else if (a === 'regen-plan') {
      state.ui.weekPlan = generateWeekPlan();
      persist();
      renderStats();
      toast('✓ 周计划已按你的器械重排');
    }
    else if (a === 'toggle-month') { const mk = act.dataset.mkey; expandedMonths[mk] = !expandedMonths[mk]; renderStats(); }
    else if (a === 'month-view') { const mk = act.dataset.mkey; monthView[mk] = monthView[mk] === 'cal' ? 'list' : 'cal'; if (!expandedMonths[mk]) expandedMonths[mk] = true; renderStats(); }
    else if (a === 'plan-day') { planEditDow = +act.dataset.dow; renderPlanSheet(); document.getElementById('sheet-mask').classList.add('show'); document.getElementById('plan-sheet').classList.add('show'); }
    else if (a === 'close-plan') { document.getElementById('plan-sheet').classList.remove('show'); document.getElementById('sheet-mask').classList.remove('show'); }
    else if (a === 'plan-pick') {
      if (planEditDow >= 0) {
        state.ui.weekPlan = weekPlanArr();
        state.ui.weekPlan[planEditDow] = act.dataset.v;
        persist();
        document.getElementById('plan-sheet').classList.remove('show');
        document.getElementById('sheet-mask').classList.remove('show');
        planEditDow = -1;
        renderStats();
        toast('✓ 安排已更新');
      }
    }
    else if (a === 'close-sheets') { closeSettings(); closeDateSheet(); closeHeroSet(); document.getElementById('plan-sheet').classList.remove('show'); }
    else if (a === 'toggle-extra') { extraOpen = !extraOpen; renderRecord(); }
    else if (a === 'goto-extra') {
      /* 卡片空格子的「＋」：直达记录页展开体成分填写区并滚到位 */
      extraOpen = true;
      switchTab('record');
      renderAll();
      requestAnimationFrame(() => {
        const z = document.querySelector('.extra-zone');
        if (z) z.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    }
    else if (a === 'open-settings') openSettings();
    else if (a === 'close-settings') closeSettings();
    else if (a === 'save-names') saveNames();
    else if (a === 'save-goals') saveGoals();
    else if (a === 'save-goals-inline') saveGoalsInline();
    else if (a === 'save-heights') saveHeights();
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
    resetDrafts();
    switchTab('record');
    renderAll();
    toast('正在编辑 ' + fmtMD(currentDate) + '，改完点保存');
  }
});

document.addEventListener('input', e => {
  const inp = e.target.closest('.w-input');
  if (inp) drafts[inp.dataset.person] = inp.value;
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
      remote.ui = sanitizeUI(remote.ui);
    state = remote;
    persist();
      setTimeout(() => toast('已导入 ' + n + ' 天记录'), 400);
    } else {
      askConfirm('存档链接包含 ' + n + ' 天记录，覆盖当前数据并导入？').then(ok => {
        if (!ok) return;
        remote.ui = sanitizeUI(remote.ui);
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
  try {
    renderRecord();
    renderTrend();
    renderStats();
  } catch (err) {
    /* 更新瞬间新旧文件短暂混装的兜底：绝不让用户看到白屏 */
    const pg = document.querySelector('.page.active') || document.getElementById('page-record');
    if (pg) pg.innerHTML = '<div class="card" style="margin-top:40px;text-align:center;padding:30px 20px">' +
      '<p style="font-size:44px;margin:0 0 10px">🔄</p>' +
      '<p style="font-size:16px;font-weight:700;margin:0 0 6px">正在更新，请关掉本页重新打开</p>' +
      '<p style="font-size:13px;color:var(--text3);margin:0">再开一次就好 · 你的所有记录都安全存在手机里</p></div>';
    if (window.__wtErrLogged !== err.message) {
      window.__wtErrLogged = err.message;
      try { console.error('renderAll:', err); } catch (e) {}
    }
  }
}
applyTheme();
renderAll();
autoRestore();
