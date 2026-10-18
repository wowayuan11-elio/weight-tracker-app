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

const TOOL_IDS_DEFAULT = ['ai','diet','equip','trend','data','review','remind','astro','zodiac'];
function sanitizeToolsOrder(arr) {
  if (!Array.isArray(arr)) return TOOL_IDS_DEFAULT.slice();
  const out = [];
  arr.forEach(x => { if (typeof x === 'string' && (TOOL_IDS_DEFAULT.indexOf(x) > -1 || /^g\d{6,}$/.test(x)) && out.indexOf(x) < 0) out.push(x); });
  return out;
}
function sanitizeGroups(g, okIds) {
  /* 兼容对象字典（持久化格式）与数组两种输入，统一输出对象字典；okIds=组内合法 key */
  const OK = okIds || TOOL_IDS_DEFAULT;
  let arr = [];
  if (Array.isArray(g)) arr = g;
  else if (g && typeof g === 'object') arr = Object.keys(g).map(k => g[k]);
  const out = {};
  arr.slice(0, 6).forEach(x => {
    if (!x || typeof x !== 'object' || typeof x.id !== 'string' || !/^g\d{6,}$/.test(x.id)) return;
    if (!Array.isArray(x.items) || x.items.length < 2) return;
    const uniq = [];
    x.items.forEach(v => { if (typeof v === 'string' && OK.indexOf(v) > -1 && uniq.indexOf(v) < 0) uniq.push(v); });
    if (uniq.length >= 2) out[x.id] = { id: x.id, name: (typeof x.name === 'string' && x.name.trim()) ? x.name.trim().slice(0, 8) : '文件夹', items: uniq.slice(0, 9) };
  });
  return out;
}

let COLORS = { me: '#007aff', partner: '#ff9500' }; /* V42: let，随主题切换同步 */
const WEEK_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/* 版本与更新日志：每次部署必须更新 APP_VERSION 和这里的第一条
   作用：优化后用户能在设置页核对「真的更新了」——尤其 bug 类修复界面看不出变化 */
const APP_VERSION = 'V99';
/* V83: AI 助手——智谱 API（浏览器直连已验证 CORS 允许 github.io）。钥匙只存手机 localStorage，绝不写入本公开仓库 */
const AI_ENDPOINT = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const AI_MODELS = ['glm-4-flash', 'glm-4.5-flash', 'glm-4.7-flash'];
/* V85: B站视频真实封面（API 拉取，webp 缩略） */
const BV_COVERS = {"BV115411d7MG":"https://i0.hdslb.com/bfs/archive/9da36158001c84dfddfa41522ff160755f208439.jpg@480x270.webp","BV117411q7et":"https://i2.hdslb.com/bfs/archive/a41003102b0ee7b3629ae667de28f876a5c76c69.png@480x270.webp","BV11J4m1u7R3":"https://i2.hdslb.com/bfs/archive/93f9394c891d81ed506550a12a523c7c604abae1.jpg@480x270.webp","BV12M411L7k8":"https://i2.hdslb.com/bfs/archive/ea3ab0170f0ea7017f42760b13a03f5d1de84bb1.jpg@480x270.webp","BV13L4y1g72R":"https://i1.hdslb.com/bfs/archive/7628d448db7caa098735a5fc087452a9f7324613.jpg@480x270.webp","BV15E411E7AW":"https://i0.hdslb.com/bfs/archive/85b7965b2d283d6567e7311aef2aaef8efb8af62.jpg@480x270.webp","BV15N4y1g7VV":"https://i0.hdslb.com/bfs/archive/ba3bd01abab9310e218e4911663a8df6c0852892.jpg@480x270.webp","BV16i421h71B":"https://i1.hdslb.com/bfs/archive/769c91abd4ad53fda388986ed0ed92438ed50a4b.jpg@480x270.webp","BV183411N7uG":"https://i0.hdslb.com/bfs/archive/12254af2c99ee44d7b5327fc0cf4a9889330e4d9.jpg@480x270.webp","BV1BK4y1o7sk":"https://i0.hdslb.com/bfs/archive/9dff28a11b2a6743778537708290e4872308901e.jpg@480x270.webp","BV1Bb4y147tm":"https://i2.hdslb.com/bfs/archive/df5cdc09e6c54a57c55388c43770cc54d17d6ee9.jpg@480x270.webp","BV1Bu411V7rW":"https://i1.hdslb.com/bfs/archive/2e3e2f32fdeb55afa7d7ccb5dff1c51e067b8957.jpg@480x270.webp","BV1C14y157Kx":"https://i0.hdslb.com/bfs/archive/1302658682d586e5e5983477ad784e5600b4b767.jpg@480x270.webp","BV1D24y1t7CD":"https://i2.hdslb.com/bfs/archive/02a7227868039de7f9c21237ea1a1aec9af6f4ac.jpg@480x270.webp","BV1FB4y137gi":"https://i1.hdslb.com/bfs/archive/36af254bdb8f2e2dee5bba36f20e1a2b17f4980b.jpg@480x270.webp","BV1Ft421G7fw":"https://i2.hdslb.com/bfs/archive/a741dc00d34c6a52495b9f96b80341d2dae853fc.jpg@480x270.webp","BV1H7411E7uZ":"https://i0.hdslb.com/bfs/archive/502165784ed7a679b826e7e85518baf5f069d605.jpg@480x270.webp","BV1J3DaYWErt":"https://i1.hdslb.com/bfs/archive/53b3457a2d33cd695fdd7bfddc796e19527f7706.jpg@480x270.webp","BV1JS411N7Yg":"https://i1.hdslb.com/bfs/archive/d29eea575cb484ace11df265629dca309f2c297a.jpg@480x270.webp","BV1MU411d7VU":"https://i2.hdslb.com/bfs/archive/21f7fd46161ace9b60c36c53083e204d7ac9575f.jpg@480x270.webp","BV1Mr4y1z7Ac":"https://i0.hdslb.com/bfs/archive/1b68a2788691c7fd0691bdceb96ba2a16f3f3525.jpg@480x270.webp","BV1MscszTEJH":"https://i0.hdslb.com/bfs/archive/4a1c46829cda9673d5f9c9b76f1f4975502a7d73.jpg@480x270.webp","BV1NnzzBSEyq":"https://i1.hdslb.com/bfs/archive/8473ef90a1b5612ae75d5ef539c46e6f95a5bd29.jpg@480x270.webp","BV1Q34y1j79r":"https://i2.hdslb.com/bfs/archive/b3c5c50bd22b32e3b37a2ac67e820333327467c0.jpg@480x270.webp","BV1QXqDYFEmZ":"https://i2.hdslb.com/bfs/archive/d80fe4f2bb0d7ca361e39c921032b2b3263b3c12.jpg@480x270.webp","BV1Sx411r7yZ":"https://i0.hdslb.com/bfs/archive/8017e634ae8e43d38a0e97ed99fb16afeaf00269.jpg@480x270.webp","BV1Ta411K72v":"https://i2.hdslb.com/bfs/archive/25b9879e2d9664430beaef4caa17a22f4b0096f3.jpg@480x270.webp","BV1Uk4y117VV":"https://i0.hdslb.com/bfs/archive/f4e46ba42e4b6517d32fc143b840464457cca8c8.jpg@480x270.webp","BV1WF411b7jb":"https://i1.hdslb.com/bfs/archive/88aab93755bbd2aad51203b313a842b4c369c09c.jpg@480x270.webp","BV1X142147nu":"https://i1.hdslb.com/bfs/archive/131551f8dd7933fcfe12d4e3eefd48b2387563b1.jpg@480x270.webp","BV1ZZ421N7T8":"https://i2.hdslb.com/bfs/archive/1812aad2517494f042eea5e1975588ca010120b3.jpg@480x270.webp","BV1aQJKz6Ezj":"https://i1.hdslb.com/bfs/archive/825c0ecb0f87dfb9f903ffa64862ed7d85011c54.jpg@480x270.webp","BV1c34y1q73T":"https://i0.hdslb.com/bfs/archive/f638ecec8214b514894aa1e804cac37f54aced0b.jpg@480x270.webp","BV1eF3tzjEMk":"https://i1.hdslb.com/bfs/archive/45dcc5fe734005a3e58d78a387427f16f4414693.jpg@480x270.webp","BV1fkoyY3EWs":"https://i0.hdslb.com/bfs/archive/ef4c17af85e73b52eaa8f0580d590e1ae7c77cf8.jpg@480x270.webp","BV1fqtGzXE3m":"https://i2.hdslb.com/bfs/archive/85589efacc3280997cd52b6c390bfe3731d2cb10.jpg@480x270.webp","BV1gs4y167gt":"https://i2.hdslb.com/bfs/archive/187f4aa21c9bdb02d571a4f4aa2ef9fc2a75e213.jpg@480x270.webp","BV1hb4y1a7Rd":"https://i2.hdslb.com/bfs/archive/79bb7ff4b9d478a285dc3e39961e3013e48afd2a.jpg@480x270.webp","BV1iV89zME8a":"https://i1.hdslb.com/bfs/archive/e6149739af8f27274f5919b6bafd5cf0917858b4.jpg@480x270.webp","BV1jx4y1K7Jw":"https://i2.hdslb.com/bfs/archive/e736f08c8e2327fb488d318be7a6abec82459901.jpg@480x270.webp","BV1k5411m76e":"https://i2.hdslb.com/bfs/archive/c996442c5299613820bd6f34b3aaa51557eae519.jpg@480x270.webp","BV1kA411q7cH":"https://i0.hdslb.com/bfs/archive/45b79f3b14dbb80a4d9e190aaf20af3c0ca9b2bc.jpg@480x270.webp","BV1kF411F7YG":"https://i2.hdslb.com/bfs/archive/ff55e74b022960d4add1c0ebcf2482662e296159.jpg@480x270.webp","BV1kg4y1m7y5":"https://i1.hdslb.com/bfs/archive/2aa4b0e6d59a2960e2d473fa4c636083083d8298.jpg@480x270.webp","BV1kq4y1n75T":"https://i1.hdslb.com/bfs/archive/72d184ceb4d1a292c05ed9cf04e37e52c29f6c61.jpg@480x270.webp","BV1m1421S7Tg":"https://i2.hdslb.com/bfs/archive/59be769cec64894d72b96ff65fe05e9c2732fb3a.jpg@480x270.webp","BV1m2421L7tw":"https://i1.hdslb.com/bfs/archive/2f3adfd6b5eb9edce229933b32e432534b597da6.jpg@480x270.webp","BV1nE421u7Q4":"https://i0.hdslb.com/bfs/archive/8fc423e43d41259c0f1fd8fb7a8cd438eb9cc6b7.jpg@480x270.webp","BV1nVjEz5EBQ":"https://i0.hdslb.com/bfs/archive/4efb1e376d8127b7c46abc0055cf47a53381821a.jpg@480x270.webp","BV1nb4y1M7By":"https://i0.hdslb.com/bfs/archive/e8984d1c034d8805b3dbaaffc79e7f1fa52b1a08.jpg@480x270.webp","BV1ne411W7MV":"https://i1.hdslb.com/bfs/archive/e4e38c16b01080ef9155f9744bae8d3af4703915.jpg@480x270.webp","BV1oa4y1z73J":"https://i0.hdslb.com/bfs/archive/4a68d20bbc774ccee2b2ae8d9627c822739a5f45.jpg@480x270.webp","BV1rr4y1e7Wq":"https://i1.hdslb.com/bfs/archive/3d52c48c679cac430a21d64c1d6b0cc8eb3eaffc.jpg@480x270.webp","BV1uS4y1k7sw":"https://i0.hdslb.com/bfs/archive/1881f2e5eef38cbe9d204bac712d89497764b5d0.jpg@480x270.webp","BV1uX4y1P7uX":"https://i2.hdslb.com/bfs/archive/a5515afde031442f9e57ca8b60bb41e555bc4c92.jpg@480x270.webp","BV1uc411W7Hd":"https://i0.hdslb.com/bfs/archive/e070d9a160aadb32cad5a81a30d5d3c2993dfb34.jpg@480x270.webp","BV1uw411N7MC":"https://i0.hdslb.com/bfs/archive/60b2348c267d0c733b34a5e1911aff72b6f52062.jpg@480x270.webp","BV1wL9sYEE8t":"https://i2.hdslb.com/bfs/archive/f254d83877d03099a66fc9a11042e510e68d6130.jpg@480x270.webp","BV1xV411C7e9":"https://i2.hdslb.com/bfs/archive/cbd1650791cefd27adeca640624313052178dfdf.jpg@480x270.webp","BV1yp4y1k7Gp":"https://i0.hdslb.com/bfs/archive/25dd265caedaf15ef643725e19126772f0145f10.jpg@480x270.webp","BV1ys421T7gZ":"https://i2.hdslb.com/bfs/archive/54d89b5fc7ee689ce4bfe7b9c361a8a22c2bbf24.jpg@480x270.webp","BV1zq4y197rR":"https://i2.hdslb.com/bfs/archive/1586a9d1c8566a4be99aa0227bc7c762fefadcda.jpg@480x270.webp"};

const CHANGELOG = [
  { v: 'V99', d: '10月18日', items: [
    '双人对比拆成两张独立卡：Elio、Tina 各自长按拖动；拖到一起自动并排，分开则各占整行'
  ]},
  { v: 'V98', d: '10月18日', items: [
    '修复：拖动时不再出现 iOS 蓝色选择光标和手柄（全局禁用文本选择，输入框不受影响）'
  ]},
  { v: 'V97', d: '10月18日', items: [
    '修复：体重主打卡和健身打卡卡改为固定首位不可拖动——核心录入卡永远在顶上，排版不会乱'
  ]},
  { v: 'V96', d: '10月17日', items: [
    '拖动手感重做：拖动时其他卡片像 iPhone 一样实时让位滑开，松手卡片滑进位置，拖到屏幕边缘页面自动滚动'
  ]},
  { v: 'V95', d: '10月17日', items: [
    '统计页 8 个格子支持长按拖动排序，压住另一格半秒可打包成文件夹，顺序进云备份'
  ]},
  { v: 'V94', d: '10月17日', items: [
    '修复排序：拖动松手=移动位置（默认），压住卡片中心半秒出现"松手打包"提示才是合并——不再一拖就打包',
    '记录、趋势、健身三页的全部卡片支持长按拖动排序，顺序自动保存进云备份'
  ]},
  { v: 'V93', d: '10月17日', items: [
    '健康营全部组件支持长按拖动排序（iPhone 桌面逻辑），拖到另一张卡上直接打包成文件夹',
    '文件夹支持改名/解散/移入新组件，设置页各卡片也支持长按拖动调顺序',
    '排序和文件夹存进云备份，换手机/清缓存都不丢'
  ]},
  { v: 'V92', d: '10月17日', items: [
    '修复：星座「星盘速览」长句把弹层横向撑爆——文字改正常换行，并加全局禁止横向溢出兜底'
  ]},
  { v: 'V91', d: '10月17日', items: [
    '宜忌每条自带白话翻译（术语在上、大白话在下），原文对照不用再点切换',
    '彭祖百忌口诀配白话直译；顶部「原版/白话」开关删除——对比就在眼前，零切换'
  ]},
  { v: 'V90', d: '10月17日', items: [
    '深色模式全面适配：手机黑色模式下黄历/星座全部清晰可读（贴纸卡文字锁定+变量名归位+浅底降亮度）'
  ]},
  { v: 'V89', d: '10月17日', items: [
    '星座独立成板块（照你的工作台版式）：档案大卡+性格关键词+今日幸运物+星盘速览+综合运势',
    '黄道吉日单独一格：纯黄历（大卡/宜忌/彭祖/冲煞/时辰/挑日子），星座内容全部移出',
    '运势分数=确定性算法（种子=日期+星座，同一天固定结果），来源标注「规则生成的娱乐内容」，不装天文预测也不随机骗你'
  ]},
  { v: 'V88', d: '10月17日', items: [
    '黄历全面升级（对齐你做的工作台版式）：今日大卡带农历+红月牌，干支四柱+五行能量+脏腑，属相今日冲合+建议',
    '宜忌标准术语胶囊（可切白话），彭祖百忌独立卡，冲煞方位（冲/煞/喜神/财神），十二时辰吉凶',
    '农历表内置寿星天文历数据（2025-2028），九月初八与你的工作台逐字对上'
  ]},
  { v: 'V87d', d: '10月17日', items: [
    '补打卡直达：训练日历点没练的日子，就地填一句+补打卡，不用绕 AI 管家',
    '补错可撤销；连续/周目标/日历即时刷新'
  ]},
  { v: 'V87c', d: '10月17日', items: [
    '八字四柱齐了：时柱戊辰（辰时两小时一段，7-9点都是它，确定的）',
    '五行全量：木3土5，通行命理"土重"解读',
    '上升星座按辰时估算（大概率天蝎，标注边界）；月亮没把握不编'
  ]},
  { v: 'V87b', d: '10月17日', items: [
    '命理升级：八字三柱卡（己卯年·甲戌月·甲辰日，纳音标注），日主甲木解读',
    '档案加入农历生日（农历九月十一）',
    '时柱/上升/月亮星座：等一个出生钟点，问到就补齐'
  ]},
  { v: 'V87', d: '10月16日', items: [
    '健身页充实：本周目标进度条（默认3次/周）+ 今日推荐（周计划接上每天该练什么）+ 最近训练列表',
    '娱乐板块上线（健康营→每日运势）：黄道吉日挑日子+星座档案+生肖命理，12星座12生肖全量可切换',
    '黄历按钦天监《协纪辨方书》体系：干支日柱精确（甲子锚点校准），不编运势数字，来源都标在页面上'
  ]},
  { v: 'V86', d: '10月16日', items: [
    '框架重组（方案A）：健身升级为底部独立标签，和体重同级，1 秒直达',
    '健身页=打卡卡+训练日历+在家跟练/动作库/周计划三分栏，一个入口包圆',
    '健康营 9 格瘦身为 7 格，重复入口全部合并'
  ]},
  { v: 'V85b', d: '10月16日', items: [
    '打卡入口提到首页第一屏：体重录入区正下方，一键打卡不用进任何页面',
    '训练日历上线（参考 Keep）：月历看每天打卡情况，点任何一天看当天练了什么，可翻月',
    '点条子看详情（圆点日历/撤销/说一句就记）'
  ]},
  { v: 'V85', d: '10月16日', items: [
    '健身打卡上线：进跟练库第一眼就是打卡卡，一键记今天，连续天数/本周/累计一眼看到',
    '对 AI 管家说「补昨天的健身」也能补打卡，做多了做少了说一句就记上',
    '语音按钮在 iPhone 上不再卡死——改为引导用键盘自带听写（系统限制，网页麦克风在 iPhone 上就不可靠）',
    '跟练视频和动作全部换成真实视频封面（之前是纯色块）',
    '补上「低冲击友好」分类：帕梅拉官方两千步 + MadFit/fitbymik 低冲击跟练（都核实过来源）',
    '一个失效视频（平板抬腿）已换成死虫式——对腰更友好的核心动作'
  ]},
  { v: 'V84', d: '10月15日', items: [
    '跟练库重排：跟练视频（在家）与动作库分成两大板块，各管各的',
    '动作库改成分区制：胸/背/肩/手臂/腿/臀/腹各一个区，一眼找到想练的部位',
    '新增 14 个健身房器械动作（卧推/高位下拉/坐姿划船/腿举/罗马尼亚硬拉等），每个都配 B 站正规教学——教练频道逐一核实过',
    '每个动作标注器械和场景：徒手/哑铃在家练，杠铃/器械去健身房'
  ]},
  { v: 'V83', d: '10月15日', items: [
    'AI 管家入驻：能聊天、能帮你记体重/腰围/饮食、能改目标——说「帮我记今天午饭吃了三菜一汤」直接办妥',
    '语音说一句就记：点麦克风说话自动变文字（不支持的设备用键盘自带麦克风一样用）',
    '食物识别升级成 AI 认菜：「三菜一汤」「食堂随便吃的」这种模糊说法也能估',
    '钥匙在 AI 管家里填，只存你手机本地，不上传不进代码'
  ]},
  { v: 'V82b', d: '10月14日', items: [
    '修好「说一句就记」看不到输入框：识别按钮占满整行把输入框挤没了（V65 起的老 bug），现在输入框正常显示、按钮恢复正常宽度',
    '输入框加了边框底色——以前是透明的，不点根本看不出那里能打字'
  ]},
  { v: 'V82', d: '10月14日', items: [
    '说一句就记大升级：随便怎么说都行——「今天在海底捞吃了毛肚和虾滑，喝了两瓶啤酒」直接识别出全部食物和热量，「在」「吃了」「今天」这些废话自动忽略',
    '食物库 60 → 190 种：家常菜/餐厅菜/火锅菜/水果奶茶零食全进了',
    '懂份数和份量：两个鸡蛋、一大碗面、半份烤鱼、牛排套餐都会折算'
  ]},
  { v: 'V81', d: '10月14日', items: [
    '选中态全面清晰化：筛选标签选中变成深色实底反白，点了哪个一眼可见；跟练库顶部换成 iOS 分段控件',
    '课程卡封面重做：大号时长数字做主角+双层光晕+斜纹肌理，不再是干巴巴的纯色块'
  ]},
  { v: 'V80', d: '10月14日', items: [
    '跟练库上线：12 个 B 站人工核过的权威跟练视频（帕梅拉/周六野），点开直接播——燃脂HIIT/有氧舞蹈/腹肌马甲线/拉伸四大类',
    '全网找课：搜「减脂」等词，B站/知乎/小红书/抖音/快手/微博一键直达搜索结果；抖音小红书无开放接口，只能跳转直达（诚实说明）',
    '权威知识卡：热量缺口/有氧+力量/局部减脂不存在/体重波动——都是公认口径，不是网上随便抄的',
    '36 个动作库并入跟练库，健身内容从此一个入口'
  ]},
  { v: 'V79', d: '10月14日', items: [
    '卡片边框回归，但重做成 1px 细线 hairline + 顶部内高光——有边界感但不廉价，柔影分层保留'
  ]},
  { v: 'V78', d: '10月14日', items: [
    '修好目标进度条 0%：进度基准从「最早记录」改成「历史最高」——涨过再降也能看到真实进度（从最高已减多少）',
    '预测升级为数据驱动：7 天移动平均抹掉日常波动 + 线性回归算趋势 + 质量门槛——趋势稳才给周数（注明依据），在涨就诚实说，波动大就不猜',
    '进度条打开时有生长动画，弹层弹出更顺滑'
  ]},
  { v: 'V77', d: '10月14日', items: [
    '视觉全面去廉价：纸纹噪点材质永久下线，所有卡片描边砍掉——分层只靠留白和柔影，干净就是高级',
    '记录页说明书式文案全砍：改成一句话状态，备注说明行和底部凑数小字删除'
  ]},
  { v: 'V76', d: '10月13日', items: [
    '标题全面加黑加粗加大：所有卡片标题（昨天→今天 / 7天概览 / 体重走势…）回归传统标题层级——最黑最粗，一眼和正文分开，全主题统一'
  ]},
  { v: 'V75', d: '10月13日', items: [
    '修好两个「点了没反应」：历史记录里列表/日历切换、月份展开收起，点完立刻变，不用再退出重进',
    '修好月历点日期：点 12 号看 12 号、点 13 号看 13 号，点谁显示谁',
    '「从最开始到现在」全面收敛：只在趋势页切「全部」时保留一处总账；腰围对比从「比首次」改成「比上次」并带上日期'
  ]},
  { v: 'V74', d: '10月13日', items: [
    '趋势页置顶新增「昨天 → 今天」对比卡：昨天多少、今天多少、差多少，一眼直出——不用再翻图表按来按去'
  ]},
  { v: 'V73', d: '10月12日', items: [
    '深夜称重护栏：晚上 11 点到凌晨 5 点记体重会提醒「深夜体重比晨重高 0.5~1kg，不作数」——别让半夜的秤吓到自己',
    '饮食日记新增最近 7 天摄入小柱图：哪天吃多了、哪天控得好，一眼看穿',
    '修正版本号显示：V72 的内容（装修 2.0 / 首页迷你走势线 / 主题分组）上线时版本号没跟上，现在设置页看到的是真实版本'
  ]},
  { v: 'V72', d: '10月10日', items: [
    '装修 2.0：噪点材质+双层光影+极光流体动画，主题面板按旗舰/暗色/亮色/科技四组归类',
    '首页新增 14 天迷你走势线，不点进去也能看趋势'
  ]},
  { v: 'V71', d: '10月10日', items: [
    '修复趋势页切换时偶发的白屏兜底（清理了旧渲染残留代码）'
  ]},
  { v: 'V70', d: '10月10日', items: [
    '趋势页同款瘦身：图表+一句话总结直出，月历/目标进度/腰围/体脂收进宫格点开看',
    '新增 4 套一线质感主题：深邃（Linear）、简白（Things）、硬核（Whoop）、琉璃（Arc）',
    '全站质感升级：卡片顶光+氛围底光+玻璃弹层，主题面板每个色卡带迷你曲线预览'
  ]},
  { v: 'V69', d: '10月10日', items: [
    '统计页大瘦身：顶部只留「大屏 + 重点变化」两张结论卡，其余 8 个板块收进「数据宫格」——格子上只放一个核心数，点哪个看哪个的完整分析'
  ]},
  { v: 'V68', d: '10月10日', items: [
    '趋势页新增「一句话总结」：这 30 天谁降了多少、算不算有效，自动说人话+一键复制',
    '周对比卡新增「复制周报」：生成能直接发微信的周报文本（本周 vs 上周·每人平均·合计变化）'
  ]},
  { v: 'V67', d: '10月9日', items: [
    '新增 3 套硬核科技主题：赛博（黑底霓虹青+数字发光）、终端（黑客绿+等宽字体）、量子（深空电紫光晕）——字体、光效整套换',
    '首页右上角新增调色板按钮：点一下直接弹出全部主题速切，不用再进设置翻'
  ]},
  { v: 'V66', d: '10月7日', items: [
    '动作库 16 → 36 个，新增 12 个练腹肌的动作（反向卷腹/俄罗斯转体/侧平板/V字两头起/鸟狗式…），都是 B 站人工核过的正规教学',
    '动作库支持按部位筛选：腹肌/腿部/臀部/胸部/背部/肩部/手臂/有氧，想练哪直接点哪',
    '饮食日记排版重排：标题、说明、输入框层级拉开，当前餐段一眼可见'
  ]},
  { v: 'V65', d: '10月6日', items: [
    '饮食日记彻底重做：像说话一样记——输入「两个鸡蛋 一个玉米 一杯牛奶」，自动拆解数量并算好热量，认一下就能全记上',
    '食物库扩到 60+ 种家常食物；认不出的自动按类别估算，不用再去别处查',
    '修掉老版「点了没反应」的交互：餐段变成标签页，点谁显示谁；速查点一下进清单，攒齐了一键记上'
  ]},
  { v: 'V64', d: '10月6日', items: [
    '大归类：运动与器械从设置搬到健康营，就挨着「智能训练规划」——健身相关的从此都在一个地方找',
    '数据工具升级成「数据与同步」：云备份、双人同步、导出 CSV、合并导入全归它管',
    '设置页瘦成纯设置：主题、名字与目标、指标说明、安装版本——跟主流健康 App 一个思路，设置里不再塞业务功能'
  ]},
  { v: 'V63.2', d: '10月6日', items: [
    '真正的病根修了：饮食日记算 7 天平均时，碰到没记录的日期（比如国庆没称的那几天）会算崩——就是它导致切换组件时内容卡住。现在没记录的天自动跳过'
  ]},
  { v: 'V63.1', d: '10月6日', items: [
    '修复：从别的组件切到饮食日记时，标题变了但内容没跟着变的问题——现在弹层内容加了保险，任何情况下点谁显示谁'
  ]},
  { v: 'V63', d: '10月6日', items: [
    '设置页全面组件化：7 个大格子（主题/名字目标/器械/双人同步/数据备份/指标说明/安装版本），点哪个进哪个——和健康营同一套设计语言，小展开彻底绝迹',
    '统计页的每周安排也变成一条摘要卡：一眼看到今天练什么，点进去改'
  ]},
  { v: 'V62', d: '10月6日', items: [
    '重磅上新「饮食日记」：三餐+加餐记了什么、多少千卡，内置 26 种常见食物一键选，今日合计+7 天平均都有——减脂=管住嘴迈开腿，现在俩都在一个营里',
    '「工具」板块大改版：名字换成「健康营」，所有功能变成大格子组件，点哪个弹哪个，不再是一堆小展开',
    '饮食数据进自动备份，和体重一样安全'
  ]},
  { v: 'V61', d: '10月6日', items: [
    '工具页上线「居家训练」：16 个居家动作，每个都能点开看 B 站标准教学视频（都是验证过的正规教练/康复师视频）+ 几组几次怎么休息',
    '「智能训练规划」自动识别你勾过的器械（哑铃/弹力带/跳绳…），一键生成一周居家计划，没勾的器械绝不会出现在安排里',
    '没器械也能练——徒手动作永远都在池子里'
  ]},
  { v: 'V60', d: '10月5日', items: [
    '统计页顶部新增「30 天总览」大屏卡：两人并排，最新体重/距目标/30天变化/平均/本月天数/体脂率一次看全——一屏看懂俩人的区别',
    '新增「本周 vs 上周」对比卡：每周平均一比，降了就报喜，涨了也告诉你波动很正常'
  ]},
  { v: 'V59', d: '10月5日', items: [
    '图表质感升级：曲线下方加同色渐变填充，最新一个数据点带光晕——对标一线健康 App 的图表观感',
    '切页时卡片带轻微上浮入场动画，滑动更跟手',
    '首页大数字字形收紧，更有海报感'
  ]},
  { v: 'V58', d: '10月4日', items: [
    '整体质感打磨：所有绿色提示块改成细线摘要行，页面安静了一大截',
    '次要按钮全部改小号（复制/导出/导入/开通类），主操作才保留大按钮——不容易误触，层级也清楚',
    '数字全部等宽对齐（表格数字体），竖着看一列数字不再歪歪扭扭',
    '切换设计风格时，手机顶部状态栏颜色跟着主题走'
  ]},
  { v: 'V57', d: '10月4日', items: [
    '「每周减脂安排」收起成一行摘要（今天练什么 · 本周练几休几），点标题才展开 7 天——滚动不再误触改安排',
    '工具页「数据工具」「称重提醒」同样收起成一行，展开后按钮全部改小号，不再满屏大色块'
  ]},
  { v: 'V56', d: '10月4日', items: [
    '设置页从 13 张散卡合并成 3 张（个性化 / 数据与同步 / 关于），点开才展开，不再一屏堆满',
    '首页右上角换成精致细线齿轮图标，去掉了灰底圆',
    '砍掉趋势页「腰围说明」常驻提示卡（每次内容都一样的纯文案，没有信息量）'
  ]},
  { v: 'V55', d: '10月4日', items: [
    '新增第 4 个板块「工具」：趋势预测、平台期、年度回顾、CSV 导出、合并导入、称重提醒全部集中到这里，一屏找得到',
    '设置页大瘦身：所有卡片默认收起只留一行摘要，点标题才展开——不用再滚两屏找东西'
  ]},
  { v: 'V54', d: '10月3日', items: [
    '合并导入（微信中转兜底）：Tina 点一键备份发微信给你，你粘贴点「合并导入」就并入——她全程不碰 GitHub，只补不删永不覆盖你的数据',
    '趋势预测：按最近 14 天真实速度算出几月几号到 65/63；平台期检测：连续多天波动极小说一句「正常现象」',
    '周对决：本周你和 Tina 谁的趋势更稳，一句话见分晓',
    '本机身份 + 快捷指令一键记录：标明这台手机记的是谁，配合 iPhone 快捷指令不打开 App 也能记',
    '早上称重提醒：给出一套免费可行的 iOS 自动化配置（复制即可用）',
    'CSV 表格导出 + 2026 年度回顾卡'
  ]},
  { v: 'V53', d: '10月2日', items: [
    '双人合并同步上线：她的手机装同一个 App（Safari 打开 → 分享 → 添加到主屏幕，像真 App 一样），各记各的，数据自动在云端合并——你打开自己 App 就能看到她的最新记录',
    '控制权设计：云端仓库和钥匙都在你的 GitHub 账号里，给她的是你另发的一把钥匙，随时可以作废重发',
    '云端同步从「覆盖」改为「合并」：只把云端有而手机没有的记录并进来，永不覆盖你手机上的任何数据——丢数据风险进一步下降'
  ]},
  { v: 'V42', d: '10月1日', items: [
    '一次上线 10 套全新设计语言（共 16 套可选）：樱粉/抹茶/赤陶/极光/冰川/摩卡/石墨/丁香/翡翠/报刊——每套都是完整设计语言，不是简单换色',
    '系统体检：16 套风格全量截图审查 + 数据保存→重载→还在 完整回归，全部通过'
  ]},
  { v: 'V42', d: '10月1日', items: [
    '整套设计风格大改版：5 套全新设计语言——曜石（黑金老钱·衬线数字）、晨雾（奶油陶橘·大圆角）、静蓝（暗夜玻璃·电光青渐变数字）、纸感（瑞士排版·无圆角细黑线·等宽数字）、霓虹（克制赛博·紫青微光）',
    '设置页主题选择改成大预览卡，每套风格所见即所得',
    '新增「每天自动换一套」开关：每天第一次打开自动轮换下一套风格，每天一个新心情；手动选了某套也会记住'
  ]},
  { v: 'V41', d: '9月30日', items: [
    '修复备注丢失的总根因：数据读取器的白名单里一直没有「备注」字段——每次重开 App 所有备注都被丢弃（从备注功能上线起就存在）。已补上，历史备注从云端恢复后也会完整保留'
  ]},
  { v: 'V40', d: '9月30日', items: [
    '退出前一瞬间也会强制保存备注并立即上云——「写完就走」从此不丢'
  ]},
  { v: 'V39', d: '9月30日', items: [
    '修复「备注存了半句」：点保存时拼音还没打完，现在会先等输入法上屏再存——存的永远是你看到的完整句子',
    '修复「重开丢最后一次保存」：iPhone 杀 App 时可能弄丢刚写的数据，现在点保存立刻上云 + 每次打开自动对账（云端比手机新就弹窗让你一键找回）',
    '备注仍自动保存（打完停一下就存）'
  ]},
  { v: 'V38', d: '9月30日', items: [
    '备注自动保存：打字停一下或点别处就自动存，不用再点保存按钮——忘了点也不会丢文字',
    '备注写在哪、去哪看写明白了：输入框上方标注去向（统计页全部记录 + 月历点日详情）'
  ]},
  { v: 'V37', d: '9月29日', items: [
    '器械/运动全部可自定义：设置页新增「＋ 自定义」，你的健身棒、任何家里有的器材都能加进去参与周计划',
    '每日安排的选项也开放自定义：改成任何一天时，除了预设（已加入俯卧撑/仰卧起坐/健身棒练胸）还能自己写',
    '按器械重排升级：健身棒 → 力量日变「健身棒练胸」；勾「每天俯卧撑」则全周每天自动附加「俯卧撑 30 个」'
  ]},
  { v: 'V36', d: '9月29日', items: [
    '多重备份落地：每次记录/修改后，除了主备份外再存一份按日期命名的「每日快照」到云端 history 目录——任何一天的数据都可回退，误覆盖也能找回那天的原样',
    '备份补齐身高数据（之前漏了，恢复后 BMI 才准）',
    '日历缩略图两人数字都显示：蓝字=你、橙字=Tina，上下两行'
  ]},
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
    navigator.serviceWorker.register('./sw2.js').catch(() => {});
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
    /* V41 紧急：note 一直不在白名单里——每次重载所有备注都被丢弃（TA 备注丢失的总根因） */
    if (typeof r.note === 'string' && r.note.trim()) clean.note = r.note.trim().slice(0, 60);
    /* V62 饮食日记：条目白名单（名字/千卡/餐段/谁）——新字段必须进白名单，否则重载即丢 */
    if (Array.isArray(r.diet)) {
      const dl = r.diet.slice(0, 30).map(d => {
        if (!d || typeof d !== 'object') return null;
        const n = (typeof d.n === 'string' && d.n.trim()) ? d.n.trim().slice(0, 24) : null;
        const k = Number(d.k);
        const m = ['b', 'l', 'd', 's'].indexOf(d.m) > -1 ? d.m : 's';
        const w = PERSON_IDS.indexOf(d.w) > -1 ? d.w : 'me';
        if (!n || !isFinite(k) || k <= 0 || k > 5000) return null;
        return { n, k: Math.round(k), m, w };
      }).filter(Boolean);
      if (dl.length) clean.diet = dl;
    }
    /* V85 健身打卡白名单（对象字段）——新字段必须进白名单，否则重载即丢 */
    if (r.workout && typeof r.workout === 'object' && r.workout.done) {
      const w = { done: 1 };
      if (typeof r.workout.d === 'string' && r.workout.d.trim()) w.d = r.workout.d.trim().slice(0, 140);
      clean.workout = w;
    }
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
  { k: 'bar',    n: '健身棒',      type: 'strength' },
  { k: 'pushup', n: '每天俯卧撑',  type: 'daily' },
  { k: 'dumb',   n: '哑铃',        type: 'strength' },
  { k: 'band',   n: '弹力带',      type: 'strength' },
  { k: 'yoga',   n: '瑜伽垫',      type: 'soft' }
];


/* ============ 食物库（V65）：{n 名称, u 基准单位, k 每基准份量的常见热量}，中国食物成分表常用值 ============ */
const FOOD_DB = [
  /* 主食 */
  { n: '米饭', u: '碗', k: 232 }, { n: '馒头', u: '个', k: 223 }, { n: '面条', u: '碗', k: 330 },
  { n: '全麦面包', u: '片', k: 82 }, { n: '面包', u: '片', k: 75 }, { n: '燕麦片', u: '碗', k: 152 },
  { n: '红薯', u: '个', k: 129 }, { n: '玉米', u: '根', k: 112 }, { n: '包子', u: '个', k: 200 },
  { n: '饺子', u: '个', k: 50 }, { n: '馄饨', u: '个', k: 40 }, { n: '粥', u: '碗', k: 100 },
  { n: '炒饭', u: '份', k: 500 }, { n: '汉堡', u: '个', k: 550 }, { n: '披萨', u: '块', k: 280 },
  { n: '油条', u: '根', k: 270 }, { n: '土豆', u: '个', k: 130 }, { n: '山药', u: '份', k: 90 },
  /* 蛋白 */
  { n: '鸡蛋', u: '个', k: 78 }, { n: '鸡胸肉', u: '份', k: 133 }, { n: '鸡腿', u: '个', k: 200 },
  { n: '牛瘦肉', u: '份', k: 143 }, { n: '牛排', u: '份', k: 300 }, { n: '猪排', u: '份', k: 280 },
  { n: '羊肉', u: '份', k: 200 }, { n: '培根', u: '片', k: 45 }, { n: '火腿肠', u: '根', k: 120 },
  { n: '三文鱼', u: '份', k: 208 }, { n: '虾仁', u: '份', k: 93 }, { n: '豆腐', u: '份', k: 82 },
  { n: '豆浆', u: '杯', k: 80 }, { n: '鸡翅', u: '个', k: 120 },
  /* 蔬果 */
  { n: '西兰花', u: '份', k: 36 }, { n: '生菜', u: '份', k: 15 }, { n: '番茄', u: '个', k: 22 },
  { n: '黄瓜', u: '根', k: 16 }, { n: '苹果', u: '个', k: 95 }, { n: '香蕉', u: '根', k: 105 },
  { n: '橙子', u: '个', k: 62 }, { n: '葡萄', u: '份', k: 60 }, { n: '西瓜', u: '份', k: 90 },
  { n: '草莓', u: '份', k: 30 }, { n: '芒果', u: '个', k: 130 }, { n: '沙拉', u: '份', k: 150 },
  /* 奶饮 */
  { n: '牛奶', u: '杯', k: 108 }, { n: '无糖酸奶', u: '杯', k: 62 }, { n: '酸奶', u: '杯', k: 90 },
  { n: '拿铁', u: '杯', k: 150 }, { n: '美式咖啡', u: '杯', k: 5 }, { n: '咖啡', u: '杯', k: 60 },
  { n: '可乐', u: '罐', k: 140 }, { n: '奶茶', u: '杯', k: 300 }, { n: '橙汁', u: '杯', k: 110 },
  { n: '啤酒', u: '罐', k: 150 }, { n: '果汁', u: '杯', k: 120 },
  /* 零食汤菜 */
  { n: '坚果', u: '把', k: 60 }, { n: '薯片', u: '袋', k: 300 }, { n: '饼干', u: '片', k: 50 },
  { n: '蛋糕', u: '块', k: 250 }, { n: '巧克力', u: '块', k: 150 }, { n: '冰淇淋', u: '个', k: 200 },
  { n: '汤', u: '碗', k: 100 }, { n: '紫菜汤', u: '碗', k: 30 }, { n: '番茄炒蛋', u: '份', k: 200 },
  { n: '炒菜', u: '份', k: 150 }, { n: '火锅', u: '顿', k: 800 }, { n: '麻辣烫', u: '份', k: 500 },
  /* V82 家常菜·餐厅菜 */
  { n: '青菜', u: '份', k: 40 }, { n: '鸡肉', u: '份', k: 180 }, { n: '猪肉', u: '份', k: 230 },
  { n: '红烧肉', u: '份', k: 480 }, { n: '糖醋里脊', u: '份', k: 380 }, { n: '鱼香肉丝', u: '份', k: 320 },
  { n: '麻婆豆腐', u: '份', k: 250 }, { n: '回锅肉', u: '份', k: 420 }, { n: '宫保鸡丁', u: '份', k: 340 },
  { n: '可乐鸡翅', u: '份', k: 380 }, { n: '白切鸡', u: '份', k: 300 }, { n: '烤鸭', u: '份', k: 450 },
  { n: '叉烧', u: '份', k: 350 }, { n: '排骨', u: '份', k: 400 }, { n: '红烧鱼', u: '份', k: 280 },
  { n: '清蒸鱼', u: '份', k: 200 }, { n: '酸菜鱼', u: '份', k: 350 }, { n: '水煮鱼', u: '份', k: 420 },
  { n: '烤鱼', u: '份', k: 500 }, { n: '小龙虾', u: '份', k: 450 }, { n: '螃蟹', u: '只', k: 120 },
  { n: '牛肉', u: '份', k: 200 }, { n: '肥牛', u: '份', k: 320 }, { n: '羊肉串', u: '串', k: 90 },
  { n: '烤串', u: '串', k: 70 }, { n: '烧烤', u: '顿', k: 600 }, { n: '卤味', u: '份', k: 250 },
  { n: '炒面', u: '份', k: 450 }, { n: '炒粉', u: '份', k: 430 }, { n: '米线', u: '碗', k: 350 },
  { n: '米粉', u: '碗', k: 330 }, { n: '酸辣粉', u: '碗', k: 380 }, { n: '螺蛳粉', u: '碗', k: 420 },
  { n: '热干面', u: '碗', k: 400 }, { n: '牛肉面', u: '碗', k: 440 }, { n: '拉面', u: '碗', k: 420 },
  { n: '盖浇饭', u: '份', k: 550 }, { n: '煲仔饭', u: '份', k: 600 }, { n: '咖喱饭', u: '份', k: 520 },
  { n: '寿司', u: '个', k: 60 }, { n: '便当', u: '份', k: 550 }, { n: '三明治', u: '个', k: 280 },
  { n: '薯条', u: '份', k: 320 }, { n: '炸鸡', u: '份', k: 550 }, { n: '鸡排', u: '块', k: 400 },
  { n: '煎饼', u: '个', k: 300 }, { n: '手抓饼', u: '个', k: 320 }, { n: '凉皮', u: '份', k: 350 },
  { n: '凉面', u: '份', k: 340 }, { n: '生煎', u: '个', k: 110 }, { n: '锅贴', u: '个', k: 90 },
  { n: '烧麦', u: '个', k: 95 }, { n: '肠粉', u: '份', k: 250 }, { n: '饺子馆', u: '顿', k: 600 },
  { n: '排骨汤', u: '碗', k: 220 }, { n: '鸡汤', u: '碗', k: 180 }, { n: '冬瓜汤', u: '碗', k: 45 },
  { n: '沙拉', u: '份', k: 150 }, { n: '南瓜', u: '份', k: 45 }, { n: '茄子', u: '份', k: 80 },
  { n: '白菜', u: '份', k: 35 }, { n: '菠菜', u: '份', k: 35 }, { n: '豆角', u: '份', k: 60 },
  { n: '蘑菇', u: '份', k: 40 }, { n: '金针菇', u: '份', k: 45 }, { n: '香菇', u: '份', k: 45 },
  { n: '木耳', u: '份', k: 40 }, { n: '海带', u: '份', k: 30 }, { n: '豆芽', u: '份', k: 35 },
  { n: '韭菜', u: '份', k: 40 }, { n: '芹菜', u: '份', k: 30 }, { n: '萝卜', u: '份', k: 35 },
  { n: '冬瓜', u: '份', k: 25 }, { n: '虾饺', u: '个', k: 65 }, { n: '牛肉丸', u: '个', k: 55 },
  { n: '鸡蛋灌饼', u: '个', k: 340 }, { n: '皮蛋豆腐', u: '份', k: 150 }, { n: '凉拌菜', u: '份', k: 100 },
  /* V82 水果饮品零食 */
  { n: '桃', u: '个', k: 80 }, { n: '梨', u: '个', k: 75 }, { n: '柚子', u: '瓣', k: 25 },
  { n: '猕猴桃', u: '个', k: 60 }, { n: '菠萝', u: '份', k: 90 }, { n: '荔枝', u: '颗', k: 15 },
  { n: '龙眼', u: '颗', k: 12 }, { n: '哈密瓜', u: '份', k: 85 }, { n: '火龙果', u: '个', k: 130 },
  { n: '樱桃', u: '颗', k: 8 }, { n: '柠檬', u: '个', k: 20 }, { n: '椰子水', u: '杯', k: 60 },
  { n: '柠檬水', u: '杯', k: 30 }, { n: '气泡水', u: '杯', k: 5 }, { n: '功能饮料', u: '罐', k: 130 },
  { n: '奶昔', u: '杯', k: 280 }, { n: '珍珠奶茶', u: '杯', k: 380 }, { n: '果茶', u: '杯', k: 180 },
  { n: '酸奶昔', u: '杯', k: 220 }, { n: '锅巴', u: '袋', k: 280 }, { n: '辣条', u: '袋', k: 260 },
  { n: '瓜子', u: '把', k: 70 }, { n: '花生', u: '把', k: 80 }, { n: '爆米花', u: '桶', k: 400 },
  { n: '甜甜圈', u: '个', k: 260 }, { n: '泡芙', u: '个', k: 220 }, { n: '布丁', u: '个', k: 160 },
  { n: '山楂', u: '份', k: 90 }, { n: '话梅', u: '份', k: 60 }, { n: '豆腐脑', u: '碗', k: 90 },
  { n: '皮蛋瘦肉粥', u: '碗', k: 180 }, { n: '八宝粥', u: '碗', k: 200 }, { n: '烤红薯', u: '个', k: 200 },
  /* V82 火锅菜 */
  { n: '毛肚', u: '份', k: 60 }, { n: '虾滑', u: '份', k: 90 }, { n: '鸭血', u: '份', k: 55 },
  { n: '腐竹', u: '份', k: 130 }, { n: '宽粉', u: '份', k: 120 }, { n: '油豆腐', u: '份', k: 80 },
  { n: '鹌鹑蛋', u: '个', k: 15 }, { n: '午餐肉', u: '份', k: 130 }, { n: '娃娃菜', u: '份', k: 30 },
  { n: '拍黄瓜', u: '份', k: 80 }, { n: '蘸料', u: '份', k: 60 }, { n: '牛肉卷', u: '份', k: 250 },
  { n: '煮玉米', u: '根', k: 112 }, { n: '茶叶蛋', u: '个', k: 85 }, { n: '卤蛋', u: '个', k: 95 }
];
let dietParsed = []; /* 识别清单（购物车） */
function guessFood(name) {
  const rules = [['汤', 100], ['粥', 100], ['面', 330], ['饭', 300], ['蛋', 78], ['奶', 110], ['菜', 120], ['肉', 200], ['鱼', 150], ['虾', 93], ['果', 80], ['茶', 150], ['咖啡', 60], ['包', 200], ['饼', 150], ['鸡', 180], ['牛', 200], ['猪', 200], ['薯', 150], ['豆', 100], ['糖', 100], ['饮', 120]];
  for (let i = 0; i < rules.length; i++) if (name.indexOf(rules[i][0]) > -1) return { n: name, k: rules[i][1], guessed: true };
  return null;
}
function parseDietText(text) {
  const CN = { '一': 1, '两': 2, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '半': 0.5 };
  const out = [];
  /* V82: 噪音词——场景/动作/时间/语气词，先整体剥掉再分词，"今天在餐厅吃了牛排"→"牛排" */
  const NOISE = /在.{1,6}(?:餐厅|饭店|食堂|店|馆|家里)|去.{1,6}吃了?|今天|昨天|前天|早上|上午|中午|下午|晚上|半夜|凌晨|刚才|刚刚|早餐|午餐|晚餐|中餐|宵夜|在|从|去|到|餐厅|饭店|食堂|家里|家|外面|外卖|店里|馆子|楼下|公司|学校|某某|和|跟|同事|朋友|闺蜜|对象|同学|客户|老板|家属|同|与|一起|一起吃|总共|一共|大概|大约|差不多|左右|吃了|喝了|吃了点|吃|喝|点了|点|叫了|要了|要|来|来点|配|加|拌|就|然后|接着|最后|首先|还|又|也|有|都|什么|啥|些|之类的|一份|这块|这顿|那顿|自己|我们|我|你|他|她|它|弄|搞|准备|做|买|吃了饭|吃饭|午饭|早饭|晚饭|下午茶|夜宵|加餐|的|了|呢|吧|啊|呀|哦|嗯|哈|嘿|咯|嗦|呗|啦/g;
  const MULT = [['套餐', 1.35], ['大份', 1.5], ['大碗', 1.4], ['小份', 0.7], ['小碗', 0.6], ['半份', 0.5], ['拼盘', 1.2]];
  const textClean = text.replace(/在.{1,8}吃了?/g, '，').replace(NOISE, '，').replace(/，{2,}/g, '，').replace(/^，+|，+$/g, '');
  const segs = textClean.split(/[，,。；;、\s和]+/).map(function (s) { return s.trim(); }).filter(Boolean);
  const QTY_RE = '个|个大|只|根|碗|杯|片|份|块|勺|盘|条|包|瓶|盒|罐|颗|枚|串|小把|大勺|点';
  segs.forEach(function (seg) {
    const m = seg.match(new RegExp('^([0-9.]+|[一二两三四五六七八九十半])?(?:' + QTY_RE + ')?\\s*(.+)$'));
    let qty = 1, name = seg;
    if (m && m[2] && m[1]) {
      qty = /[0-9.]/.test(m[1]) ? parseFloat(m[1]) : (CN[m[1]] || 1);
      name = m[2];
    }
    /* V82: 没有数量词时绝不剥段首字——"包子豆浆"的"包"是包子不是量词 */
    /* 「一点西瓜」：数量是「一点」这类虚词 → 按 1 份 */
    if (/^[一点些]+/.test(name) && name.length > 2) { name = name.replace(/^[一点些]+/, ''); qty = 1; }
    /* V82: 份量倍率——「牛排套餐」=牛排×1.35，连写剥后缀乘进去 */
    let mult = 1;
    for (let mi = 0; mi < MULT.length; mi++) {
      if (name.indexOf(MULT[mi][0]) > -1 && name.length > MULT[mi][0].length) {
        name = name.split(MULT[mi][0]).join('');
        mult *= MULT[mi][1];
      } else if (name === MULT[mi][0] && out.length && out[out.length - 1].k !== null) {
        /* 独立出现（"牛排 套餐"）→ 乘给上一条 */
        const pv = out[out.length - 1];
        pv.k = Math.round(pv.k * MULT[mi][1]);
        return;
      }
    }
    qty *= mult;
    /* 「拿铁一杯」：数量后置 → 先记 1 份，尾部数量并入 */
    const isDictWord = FOOD_DB.some(f => f.n === name);
    const tail = name.match(new RegExp('^(.*?)([0-9.]+|[一二两三四五六七八九十]+)?(' + QTY_RE + ')$'));
    if (tail && tail[1].trim() && !isDictWord) {
      name = tail[1].trim();
      if (tail[2]) qty = /[0-9.]/.test(tail[2]) ? parseFloat(tail[2]) : (CN[tail[2]] || 1);
    }
    /* 纯数量段（「一杯」「两碗」）没食物 → 并进上一条的份数 */
    if (!FOOD_DB.some(f => name.indexOf(f.n) > -1 || f.n.indexOf(name) > -1) && !guessFood(name)) {
      const mq = name.match(new RegExp('^([0-9.]+|[一二两三四五六七八九十]+)(' + QTY_RE + ')$'));
      if (mq && out.length && out[out.length - 1].k) {
        const prev = out[out.length - 1];
        const nq = /[0-9.]/.test(mq[1]) ? parseFloat(mq[1]) : (CN[mq[1]] || 1);
        const base = prev.k / (prev.qty || 1);
        prev.k = Math.round(base * nq);
        prev.n = prev.n.replace(/×.*$/, '') + (nq !== 1 ? '×' + nq : '');
        prev.qty = nq;
        return;
      }
      /* 没认出来的照实列出，让用户看到并补 */
      if (name.replace(/^[个只根碗杯片份块勺盘条包瓶盒罐颗枚串小把大点些]+$/, '')) out.push({ n: name, k: null, guessed: true });
      return;
    }
    /* 段内可能连写多种食物（如「牛奶面包」），最长匹配命中后继续吃残余 */
    let rest2 = name;
    let guard = 0;
    while (rest2.trim() && guard++ < 6) {
      let hit = null, hitLen = 0, hitPos = -1;
      /* V82: 先找精确包含（"鸡蛋"绝不该被"鸡蛋灌饼"抢走），前缀猜测只兜底两字以上的残段 */
      for (const f of FOOD_DB) {
        const p = rest2.indexOf(f.n);
        if (p > -1 && f.n.length > hitLen) { hit = f; hitLen = f.n.length; hitPos = p; }
      }
      if (!hit) {
        for (const f of FOOD_DB) {
          if (rest2.length >= 3 && f.n.indexOf(rest2) === 0 && f.n.length > hitLen) { hit = f; hitLen = f.n.length; hitPos = 0; }
        }
      }
      if (!hit) {
        const g = guessFood(rest2);
        if (g) out.push({ n: g.n + (qty !== 1 ? '×' + qty : ''), k: g.k, guessed: true });
        else out.push({ n: rest2.trim(), k: null, guessed: true });
        break;
      }
      /* V82: 载体词吞并——"红烧肉盖浇饭"=一份饭。命中载体词时不单独记账，乘进上一条 */
      const CARRIER = { '盖浇饭': 1.25, '拌饭': 1.2, '定食': 1.3, '便当': 1.15 };
      if (CARRIER[hit.n] && out.length && out[out.length - 1].k !== null) {
        const pv = out[out.length - 1];
        pv.k = Math.round(pv.k * CARRIER[hit.n]);
        rest2 = rest2.slice(hit.n.length).trim();
        if (!rest2) break;
        continue;
      }
      const pos = hitPos > -1 ? hitPos : rest2.indexOf(hit.n);
      const before = rest2.slice(0, pos);
      rest2 = rest2.slice(pos + hit.n.length);
      const beforeClean = before.trim().replace(/^(个|只|根|碗|杯|片|块|份|条|包|盒|瓶|罐|勺|顿|小把|大|小)+$/, '');
      if (beforeClean) {
        out.push({ n: beforeClean + hit.n + (qty !== 1 ? '×' + qty : ''), k: Math.round(hit.k * qty), guessed: true });
      } else {
        out.push({ n: hit.n + (qty !== 1 ? '×' + qty : ''), k: Math.round(hit.k * qty), guessed: false });
      }
      rest2 = rest2.trim();
    }
  });
  return out;
}

const DIET_MEALS = { b: '早餐', l: '午餐', d: '晚餐', s: '加餐' };
let dietWho = 'me', dietDate = todayKey(), dietMeal = 'b';
function dietDaySum(key, w) {
  const r = state.records[key];
  if (!r || !Array.isArray(r.diet)) return 0;
  return r.diet.filter(d => !w || d.w === w).reduce((a, b) => a + (b.k || 0), 0);
}

/* ============ 居家训练动作库（V61）：视频均为人工验证的 B 站正规教学 ============ */
const GYM_MOVES = [
  /* 下肢力量 */
  { id: 'squat',   n: '深蹲',     grp: '腿部', kind: 'strength', need: null,
    sets: '3 组 × 12-15 次', rest: '组间休息 60-90 秒',
    tips: ['双脚与肩同宽，脚尖微微外展', '膝盖始终对准脚尖方向，不要内扣', '臀部向后坐，重心压在脚跟，起身夹臀'],
    bv: 'BV1FB4y137gi', by: '卓叔增重' },
  { id: 'lunge',   n: '弓步蹲',   grp: '腿部', kind: 'strength', need: null,
    sets: '3 组 × 每边 10-12 次', rest: '组间休息 60-90 秒',
    tips: ['前脚膝盖对脚尖，后膝靠近地面但不砸地', '上身挺直，核心收紧别晃', '步幅别太小——太小膝盖压力反而大'],
    bv: 'BV1iV89zME8a', by: 'ACE 认证教练 宋健鹏' },
  { id: 'glutebridge', n: '臀桥', grp: '臀部', kind: 'strength', need: null,
    sets: '3 组 × 15-20 次', rest: '组间休息 45-60 秒',
    tips: ['脚跟踩实，用臀部发力顶起', '顶到身体成一条直线，停 1 秒再下', '下落时臀部别完全坐实地面，保持张力'],
    bv: 'BV1kF411F7YG', by: 'MidoriLau' },
  { id: 'wallsit', n: '靠墙静蹲', grp: '腿部', kind: 'strength', need: null,
    sets: '3 组 × 坚持 30-60 秒', rest: '组间休息 60 秒',
    tips: ['背贴紧墙面，大腿与地面平行（做不到就高一点）', '膝盖不超过脚尖，小腿尽量垂直地面', '膝盖不舒服时抬高角度，量力而行'],
    bv: 'BV1MscszTEJH', by: '运动康复陈老师' },
  { id: 'pushup',  n: '俯卧撑',   grp: '胸部', kind: 'strength', need: null,
    sets: '3 组 × 8-15 次（做不动就跪姿）', rest: '组间休息 60-90 秒',
    tips: ['手在胸两侧，肘部与身体约 45 度，别外展 90 度', '全身绷直像一块板，塌腰=白练', '下去吸气上来呼气，幅度做满'],
    bv: 'BV1Ta411K72v', by: '帅soserious' },
  { id: 'dumbrow', n: '哑铃俯身划船', grp: '背部', kind: 'strength', need: 'dumb',
    sets: '3 组 × 每边 10-12 次', rest: '组间休息 60-90 秒',
    tips: ['俯身时背平，别弓腰', '肘部贴身向后拉，感受背部收紧', '用哑铃就从小重量开始，动作对了再加'],
    bv: 'BV1JS411N7Yg', by: '拿铁孙同学' },
  { id: 'press',   n: '哑铃肩上推举', grp: '肩部', kind: 'strength', need: 'dumb',
    sets: '3 组 × 10-12 次', rest: '组间休息 60-90 秒',
    tips: ['坐稳或站直，核心收紧别挺腰', '推起时哑铃轨迹略向后，头顶正上方', '下放慢一点，别借力甩'],
    bv: 'BV1uw411N7MC', by: '凯圣王' },
  { id: 'bandrow', n: '弹力带划船', grp: '背部', kind: 'strength', need: 'band',
    sets: '3 组 × 12-15 次', rest: '组间休息 45-60 秒',
    tips: ['弹力带固定稳，两端拉直再开始', '肘贴身向后收，肩胛骨夹紧', '回放慢速对抗，别让带子弹回来'],
    bv: 'BV183411N7uG', by: '菠萝头爱运动' },
  /* 核心 */
  { id: 'plank',   n: '平板支撑', grp: '腹肌', kind: 'core', need: null,
    sets: '3 组 × 坚持 30-60 秒', rest: '组间休息 45-60 秒',
    tips: ['肘在肩正下方，小臂平行向前', '收腹夹臀，身体一条直线', '憋不住变形了就停——质量大于时长'],
    bv: 'BV1Q34y1j79r', by: 'Gandy__' },
  { id: 'crunch',  n: '卷腹',     grp: '腹肌', kind: 'core', need: null,
    sets: '3 组 × 15-20 次', rest: '组间休息 45-60 秒',
    tips: ['下背贴地，靠腹部卷起肩胛骨就够', '脖子放松，手轻扶耳别抱头使劲拽', '起身呼气，慢下比快起有效'],
    bv: 'BV15N4y1g7VV', by: 'ALEX 健身频道' },
  { id: 'deadbug', n: '死虫式',   grp: '腹肌', kind: 'core', need: null,
    sets: '3 组 × 每边 10 次', rest: '组间休息 45 秒',
    tips: ['下背全程压紧地面，腰别拱起', '对侧手脚同时放，慢到像慢动作', '腰痛人群首选核心动作，安全'],
    bv: 'BV1Bu411V7rW', by: '运动康复陈老师' },
  { id: 'legraise', n: '仰卧抬腿', grp: '腹肌', kind: 'core', need: null,
    sets: '3 组 × 12-15 次', rest: '组间休息 45 秒',
    tips: ['手放身体两侧，下背压住地面', '腿慢抬慢放，落下来别碰地', '腰离地了就抬高一点腿再放'],
    bv: 'BV1kq4y1n75T', by: 'Mina筱敏' },
  /* 有氧 */
  { id: 'jumpingjack', n: '开合跳', grp: '有氧', kind: 'cardio', need: null,
    sets: '4 组 × 30-45 秒', rest: '组间休息 30-45 秒',
    tips: ['落地膝盖微屈缓冲，别直腿砸地', '手臂摆到头顶，幅度做满', '节奏匀速，能边做边正常喘气为宜'],
    bv: 'BV1Bb4y147tm', by: 'coolkii' },
  { id: 'burpee',  n: '波比跳',   grp: '有氧', kind: 'cardio', need: null,
    sets: '3-4 组 × 8-12 次', rest: '组间休息 60-90 秒',
    tips: ['跳不起来的降级版：站起就行，不跳', '撑地时核心收紧，别塌腰', '心率猛就减次数，安全第一'],
    bv: 'BV15E411E7AW', by: '闫帅奇' },
  { id: 'mountain', n: '登山跑',  grp: '有氧', kind: 'cardio', need: null,
    sets: '4 组 × 30 秒', rest: '组间休息 30-45 秒',
    tips: ['肩在手腕正上方，屁股别撅高', '膝盖往胸口方向提，速度匀', '撑不住就放慢，姿态优先'],
    bv: 'BV1D24y1t7CD', by: '运动科学' },
  { id: 'highknees', n: '高抬腿', grp: '有氧', kind: 'cardio', need: null,
    sets: '4 组 × 30-45 秒', rest: '组间休息 30-45 秒',
    tips: ['膝盖抬到髋部高度，前脚掌落地', '上身挺直别后仰', '小区里怕吵就原地轻放，不用猛跺'],
    bv: 'BV11J4m1u7R3', by: '阿娇教练' },
  { id: 'jumprope', n: '跳绳（新手版）', grp: '有氧', kind: 'cardio', need: 'jump',
    sets: '3-5 组 × 1 分钟', rest: '组间休息 60-90 秒',
    tips: ['前脚掌起跳落，跳得低一点省力', '手腕摇绳，不是抡大臂', '膝盖踝关节有旧伤就先别跳'],
    bv: 'BV1uS4y1k7sw', by: '麦斯跳绳' },
  /* —— V66 腹肌专场 —— */
  { id: 'reversecrunch', n: '反向卷腹', grp: '腹肌', kind: 'core', need: null,
    sets: '3 组 × 12-15 次', rest: '组间休息 45-60 秒',
    tips: ['练下腹王牌：膝盖往胸口收，屁股离地', '用腹部发力，不是甩腿', '腰始终贴地，腰拱起就停'],
    bv: 'BV1hb4y1a7Rd', by: 'Mina筱敏' },
  { id: 'bicycle', n: '空中蹬车', grp: '腹肌', kind: 'core', need: null,
    sets: '3 组 × 每边 15 次', rest: '组间休息 45-60 秒',
    tips: ['肘找对侧膝，转的是躯干不是脖子', '动作慢一点，蹬得越快越没效果', '下背压住地面'],
    bv: 'BV1Mr4y1z7Ac', by: '三藩之犬' },
  { id: 'russian', n: '俄罗斯转体', grp: '腹肌', kind: 'core', need: null,
    sets: '3 组 × 每边 12 次', rest: '组间休息 45-60 秒',
    tips: ['转的是肩膀和胸腔，不是只摆手', '新手脚可以着地，进阶抬脚', '腰背挺直，塌腰伤腰'],
    bv: 'BV1Uk4y117VV', by: 'JunJ徒手俊杰' },
  { id: 'sideplank', n: '侧平板支撑', grp: '腹肌', kind: 'core', need: null,
    sets: '每边 3 组 × 20-40 秒', rest: '组间休息 45 秒',
    tips: ['肘在肩正下方，髋部往上顶', '身体一条直线，别塌腰', '练侧腹和腰线，马甲线必练'],
    bv: 'BV1eF3tzjEMk', by: 'ACE 认证教练 宋健鹏' },
  { id: 'vup', n: 'V字两头起', grp: '腹肌', kind: 'core', need: null,
    sets: '3 组 × 8-12 次', rest: '组间休息 60 秒',
    tips: ['手和脚同时起来找脚尖，像字母 V', '腹部抽筋就弯膝降难度', '下来时慢，别砸'],
    bv: 'BV1uX4y1P7uX', by: '街健醉翁' },
  { id: 'scissor', n: '剪刀腿', grp: '腹肌', kind: 'core', need: null,
    sets: '3 组 × 30 秒', rest: '组间休息 45 秒',
    tips: ['下背贴死地面，腰离地就抬高腿', '上下交叉像剪刀，慢速控制', '脖子放松别使劲抬头'],
    bv: 'BV1NnzzBSEyq', by: '居家锻炼的小宅' },
  { id: 'birddog', n: '鸟狗式', grp: '腹肌', kind: 'core', need: null,
    sets: '3 组 × 每边 10 次', rest: '组间休息 45 秒',
    tips: ['对侧手脚同时伸，像猎鸟犬姿势', '腰背平得像放杯水不掉', '腰痛人群最友好的核心动作'],
    bv: 'BV1ne411W7MV', by: '科学康复频道' },
  { id: 'toetap', n: '仰卧触踝', grp: '腹肌', kind: 'core', need: null,
    sets: '3 组 × 20 次', rest: '组间休息 45 秒',
    tips: ['屈膝仰卧，左右手交替摸同侧脚跟', '用侧腹发力，幅度不用大', '肩胛骨微微离地保持张力'],
    bv: 'BV1Ft421G7fw', by: '跟练健身 Online' },
  { id: 'deadbug', n: '死虫式', grp: '腹肌', kind: 'core', need: null,
    sets: '3 组 × 每边 10 次', rest: '组间休息 45 秒',
    tips: ['下背全程贴死地面，别弓腰', '对侧手脚同时下放，慢速控制', '腰疼人群最友好的核心动作，疼就减小幅度'],
    bv: 'BV19hP9zvE8V', by: '运动科学（13万播放）' },
  { id: 'kneewheel', n: '跪姿健腹轮', grp: '腹肌', kind: 'core', need: 'bar',
    sets: '3 组 × 8-10 次', rest: '组间休息 60 秒',
    tips: ['膝盖垫软垫，滚出去别塌腰', '先滚 60% 幅度，能收回来再加', '全程核心收紧像被打了一样绷住'],
    bv: 'BV1fkoyY3EWs', by: 'Klein邵邵' },
  { id: 'crunchknee', n: '卷腹摸膝', grp: '腹肌', kind: 'core', need: null,
    sets: '3 组 × 15 次', rest: '组间休息 45 秒',
    tips: ['手顺着大腿滑向膝盖，肩胛离地即可', '脖子放松，下巴看天花板', '比标准卷腹更适合零基础'],
    bv: 'BV115411d7MG', by: 'Gandy__' },
  { id: 'hollow', n: '屈体收腹', grp: '腹肌', kind: 'core', need: null,
    sets: '3 组 × 坚持 15-30 秒', rest: '组间休息 45 秒',
    tips: ['像香蕉一样绷住：腰压地、腿手抬离地', '做不了就弯膝收一点', '街舞/徒手训练核心的地基动作'],
    bv: 'BV1BK4y1o7sk', by: 'ICFC 国际徒手体适能' },
  /* —— V66 其他部位 —— */
  { id: 'widepushup', n: '宽距俯卧撑', grp: '胸部', kind: 'strength', need: null,
    sets: '3 组 × 8-12 次', rest: '组间休息 60-90 秒',
    tips: ['手比肩宽一掌，主打胸外侧', '胸部尽量贴近地面', '做不动就跪姿'],
    bv: 'BV1MU411d7VU', by: '李志佑' },
  { id: 'diamondpushup', n: '钻石俯卧撑', grp: '手臂', kind: 'strength', need: null,
    sets: '3 组 × 6-10 次', rest: '组间休息 60-90 秒',
    tips: ['双手食指拇指拼成钻石形，主打肱三头', '肘部贴身，别外展', '太难就跪姿做'],
    bv: 'BV1m1421S7Tg', by: '曼巴yelomamba' },
  { id: 'superman', n: '超人式', grp: '背部', kind: 'strength', need: null,
    sets: '3 组 × 12 次（停 2 秒）', rest: '组间休息 45 秒',
    tips: ['俯卧，手脚同时抬离地 2 秒', '练下背部，久坐腰酸救星', '动作幅度小而稳，别甩'],
    bv: 'BV1QXqDYFEmZ', by: '增肌期' },
  { id: 'ytw', n: '俯卧 YTW', grp: '肩部', kind: 'strength', need: null,
    sets: '3 组 × 每个字 8 次', rest: '组间休息 45 秒',
    tips: ['俯卧或俯身，手臂摆出 Y→T→W 字形', '圆肩驼背矫正必练', '拇指朝上，肩胛骨发力带动'],
    bv: 'BV1zq4y197rR', by: '欧阳春晓Aurora' },
  { id: 'bulgarian', n: '保加利亚分腿蹲', grp: '臀部', kind: 'strength', need: null,
    sets: '3 组 × 每边 8-12 次', rest: '组间休息 60-90 秒',
    tips: ['后脚搭沙发/床沿，前腿下蹲', '重心 80% 在前腿，膝盖对脚尖', '臀腿王牌，比普通深蹲累得多'],
    bv: 'BV12M411L7k8', by: 'ALEX 健身频道' },
  { id: 'singlebridge', n: '单腿臀桥', grp: '臀部', kind: 'strength', need: null,
    sets: '3 组 × 每边 10-12 次', rest: '组间休息 45-60 秒',
    tips: ['一腿伸直离地，单腿顶髋', '臀部发力，腰别代偿', '比双腿臀桥难度高一档'],
    bv: 'BV1ys421T7gZ', by: '首桐康复小周' },
  { id: 'squatjump', n: '深蹲跳', grp: '有氧', kind: 'cardio', need: null,
    sets: '4 组 × 10-15 次', rest: '组间休息 45-60 秒',
    tips: ['深蹲到底跳起来，落地缓冲', '膝盖不好就用不跳的深蹲替代', '楼下住户慎重，可去楼道或垫上'],
    bv: 'BV1nE421u7Q4', by: '跟练健身 Online' },
  { id: 'bearcrawl', n: '熊爬', grp: '全身', kind: 'core', need: null,
    sets: '3 组 × 爬 20-30 秒', rest: '组间休息 60 秒',
    tips: ['手膝着地微离地，像熊一样爬', '膝盖不着地，屁股别撅高', '全身核心肩带一起练，DNS 康复体系推荐'],
    bv: 'BV1c34y1q73T', by: '康复学堂' },
  /* V84: 健身房器械动作（B站教学逐一核实：卓叔增重/ALEX健身频道/健助师小珂/Jeff Nippard搬运等） */
  { id: 'bench-press', n: '杠铃卧推', grp: '胸部', kind: 'strength', need: 'gym',
    sets: '4 组 × 8-12 次', rest: '组间休息 90 秒',
    tips: ['肩胛骨后收下沉挺胸，双脚踩实地面，臀部全程贴凳', '杠铃下放到乳头上沿，小臂始终垂直地面，肘部约 45° 夹角', '推起时杠铃走一条微斜直线，顶端不锁肘悬停'],
    bv: 'BV16i421h71B', by: '卓叔增重（54万播放）' },
  { id: 'incline-db', n: '上斜哑铃卧推', grp: '胸部', kind: 'strength', need: 'gym',
    sets: '3 组 × 10-12 次', rest: '组间休息 60-90 秒',
    tips: ['凳面调到 30-45°，太高会练到肩前束', '哑铃下放到胸口两侧，肘部略低于肩线', '顶端哑铃别相撞，保持胸部张力不卸'],
    bv: 'BV1k5411m76e', by: '萝卜大神Robert' },
  { id: 'cable-fly', n: '龙门架绳索夹胸', grp: '胸部', kind: 'strength', need: 'gym',
    sets: '3 组 × 12-15 次', rest: '组间休息 45-60 秒',
    tips: ['滑轮调到略高于肩，身体略前倾站稳', '肘部微屈角度全程不变，像抱一棵大树合拢', '合拢时挤压胸部 1 秒，回放要慢，别让配重片相撞'],
    bv: 'BV1ZZ421N7T8', by: 'ALEX健身频道' },
  { id: 'pec-deck', n: '蝴蝶机夹胸', grp: '胸部', kind: 'strength', need: 'gym',
    sets: '3 组 × 12-15 次', rest: '组间休息 45 秒',
    tips: ['座椅高度调到把手与胸口同高，背贴紧靠垫', '用肘部小臂发力合拢，不是用手抓把手硬掰', '中缝挤压感是关键，重量宁轻勿重'],
    bv: 'BV1fqtGzXE3m', by: '古Gu教练' },
  { id: 'lat-pulldown', n: '高位下拉', grp: '背部', kind: 'strength', need: 'gym',
    sets: '4 组 × 10-12 次', rest: '组间休息 60-90 秒',
    tips: ['大腿压紧挡垫，上身略后倾约 15° 并固定', '先用肘往下「插」的意识启动，杠拉到锁骨附近', '背阔肌顶点挤压 1 秒，还原时完全伸展背阔肌'],
    bv: 'BV1oa4y1z73J', by: 'ALEX健身频道（49万播放）' },
  { id: 'seated-row', n: '坐姿划船', grp: '背部', kind: 'strength', need: 'gym',
    sets: '4 组 × 10-12 次', rest: '组间休息 60-90 秒',
    tips: ['膝微屈，腰背挺直，躯干别前后大幅摇摆', '拉把手到腹部，肘部贴身往后收，肩胛骨夹紧', '还原时控制速度，肩胛骨充分前伸拉长背阔肌'],
    bv: 'BV1m2421L7tw', by: 'ALEX健身频道' },
  { id: 'pullup', n: '引体向上', grp: '背部', kind: 'strength', need: 'bar',
    sets: '4 组 × 力竭（目标 5-8 个）', rest: '组间休息 90 秒',
    tips: ['握距略宽于肩，先沉肩再启动，别耸肩', '想象肘部往下往里拉，下巴过杠即可', '下放控制 2-3 秒，做不了就用弹力带辅助或做离心'],
    bv: 'BV1WF411b7jb', by: '曼巴yelomamba' },
  { id: 'ohp', n: '杠铃站姿推肩', grp: '肩部', kind: 'strength', need: 'gym',
    sets: '4 组 × 8-12 次', rest: '组间休息 90 秒',
    tips: ['握距略宽于肩，杠放锁骨前，核心臀腿收紧像根柱子', '杠贴脸往上推，过头后微微后移把杠推到头顶正上方', '别塌腰借力——腰往前顶说明重量大了'],
    bv: 'BV1jx4y1K7Jw', by: '运动科学' },
  { id: 'lat-raise', n: '哑铃侧平举', grp: '肩部', kind: 'strength', need: 'dumb',
    sets: '4 组 × 12-15 次', rest: '组间休息 45 秒',
    tips: ['微屈肘并固定角度，向两侧抬到与肩同高', '想象用小指侧引领上抬，肩峰别耸起来', '下放慢 2-3 秒，中束的张力全在下放阶段'],
    bv: 'BV1aQJKz6Ezj', by: '健助师_小珂（56万播放）' },
  { id: 'leg-press', n: '倒蹬机腿举', grp: '腿部', kind: 'strength', need: 'gym',
    sets: '4 组 × 10-15 次', rest: '组间休息 90 秒',
    tips: ['脚放踏板中上部与肩同宽，膝盖对准脚尖方向', '下放到大腿约贴胸口即可，臀部别离开座椅卷起来', '蹬起时膝盖别完全锁死，保持持续张力'],
    bv: 'BV1gs4y167gt', by: 'ALEX健身频道' },
  { id: 'rdl', n: '罗马尼亚硬拉', grp: '腿部', kind: 'strength', need: 'gym',
    sets: '4 组 × 8-12 次', rest: '组间休息 90 秒',
    tips: ['膝微屈固定不变，靠髋部往后折叠下放杠铃', '杠贴着大腿滑下去，感受大腿后侧被拉紧', '拉到腘绳肌极限（膝盖以下）就起，腰背始终平直'],
    bv: 'BV1J3DaYWErt', by: 'Jeff Nippard（科学健身顶流·中文字幕）' },
  { id: 'hack-squat', n: '哈克深蹲机', grp: '腿部', kind: 'strength', need: 'gym',
    sets: '3 组 × 10-12 次', rest: '组间休息 90 秒',
    tips: ['背贴紧靠垫，脚位适中偏下，膝盖对脚尖', '下到大腿平行或略低，全程腰部不离开靠垫', '比自由深蹲友好，适合新手建立腿部力量'],
    bv: 'BV1rr4y1e7Wq', by: 'SallyTalk' },
  { id: 'barbell-curl', n: '杠铃弯举', grp: '手臂', kind: 'strength', need: 'gym',
    sets: '3 组 × 10-12 次', rest: '组间休息 60 秒',
    tips: ['肘部固定在身体两侧，只动前臂', '顶端用力挤压肱二头肌 1 秒，别甩腰借力', '下放慢速到底，手臂接近伸直再弯下一次'],
    bv: 'BV1nb4y1M7By', by: '凯圣王（28万播放）' },
  { id: 'rope-pushdown', n: '绳索下压（三头）', grp: '手臂', kind: 'strength', need: 'gym',
    sets: '3 组 × 12-15 次', rest: '组间休息 45 秒',
    tips: ['大臂夹紧身体固定，只有肘关节在动', '下压到底时绳索往两侧分开，挤压三头 1 秒', '上身别前倾压重量，慢速还原到前臂贴近大臂'],
    bv: 'BV1nVjEz5EBQ', by: 'Gandy__（17万播放）' },
];

/* 首页卡片偏好：布局 / 顺序 / 显示哪些指标（V21） */
function sanitizeUI(u) {
  const d = { heroLayout: 'grid', heroOrder: PERSON_IDS.slice(), heroMetrics: { goal: true, bmi: true, bf: true, waist: true, vf: true, mm: true }, toolsOrder: TOOL_IDS_DEFAULT.slice(), toolsGroups: {}, setOrder: [] };
  if (!u || typeof u !== 'object') return d;
  /* V93 自定义排序/分组：白名单严密校验 */
  d.toolsOrder = sanitizeToolsOrder(u.toolsOrder);
  d.toolsGroups = sanitizeGroups(u.toolsGroups);
  if (Array.isArray(u.setOrder)) {
    const OK_SET = ['theme', 'who', 'metrics', 'about'];
    d.setOrder = u.setOrder.filter(x => typeof x === 'string' && OK_SET.indexOf(x) > -1).slice(0, 8);
  }
  /* V94 页面卡排序白名单：key 合法性按页校验，缺的补齐 */
  d.pageOrder = {};
  const PG_OK = {
    record: ['elio-card', 'tina-card', 'record-extra'],
    trend: ['day-compare', 'chart-box', 'cal-box', 'goal-box', 'waist-chart-box', 'bf-chart-box', 'range-summary', 'trend-grid'],
    workout: ['plan', 'cal', 'recent']
  };
  Object.keys(PG_OK).forEach(pg => {
    const ok = PG_OK[pg];
    let arr = (u.pageOrder && Array.isArray(u.pageOrder[pg])) ? u.pageOrder[pg].filter(k => typeof k === 'string' && ok.indexOf(k) > -1) : [];
    ok.forEach(k => { if (arr.indexOf(k) < 0) arr.push(k); });
    d.pageOrder[pg] = arr.slice(0, 12);
  });
  /* V95 统计宫格：格子排序 + 格子文件夹 */
  const STAT_IDS = ['compare','weekly','monthly','waist','comp','table','plan','history'];
  if (Array.isArray(u.statsOrder)) {
    const so = u.statsOrder.filter(x => typeof x === 'string' && (STAT_IDS.indexOf(x) > -1 || /^g\d{6,}$/.test(x)));
    const uniq = [];
    so.forEach(x => { if (uniq.indexOf(x) < 0) uniq.push(x); });
    d.statsOrder = uniq.slice(0, 12);
  }
  d.statsGroups = sanitizeGroups(u.statsGroups, STAT_IDS);
  if (u.heroLayout === 'stack' || u.heroLayout === 'grid') d.heroLayout = u.heroLayout;
  if (Array.isArray(u.heroOrder) && u.heroOrder.length === 2 && PERSON_IDS.includes(u.heroOrder[0]) && PERSON_IDS.includes(u.heroOrder[1]) && u.heroOrder[0] !== u.heroOrder[1]) d.heroOrder = u.heroOrder.slice();
  if (u.heroMetrics && typeof u.heroMetrics === 'object') Object.keys(d.heroMetrics).forEach(k => { if (typeof u.heroMetrics[k] === 'boolean') d.heroMetrics[k] = u.heroMetrics[k]; });
  if (typeof u.trendRange === 'number' && [0, 7, 30, 90].includes(u.trendRange)) d.trendRange = u.trendRange;
  if (Array.isArray(u.weekPlan)) d.weekPlan = WEEK_PLAN_DEFAULT.map((def, i) => (typeof u.weekPlan[i] === 'string' && u.weekPlan[i].trim()) ? u.weekPlan[i].trim().slice(0, 20) : def);
  if (typeof u.theme === 'string') {
    /* V42：白名单用字面量（铁律：loadState 链路不引用后文常量）；旧主题迁移到新风格 */
    const MIGRATE = { warm: 'creme', mint: 'creme', ocean: 'midnight', dark: 'midnight' };
    if (MIGRATE[u.theme]) d.theme = MIGRATE[u.theme];
    else if (['classic','onyx','creme','midnight','paper','neon','sakura','matcha','terra','aurora','glacier','mocha','graphite','lilac','emerald','mono','cyber','terminal','quantum','linear','things','whoop','arc'].indexOf(u.theme) > -1) d.theme = u.theme;
  }
  if (u.themeRotate === true) d.themeRotate = true;
  if (typeof u.themeDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(u.themeDate)) d.themeDate = u.themeDate;
  if (Array.isArray(u.equip)) d.equip = u.equip.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim().slice(0, 14)).filter(function (v, i, a) { return a.indexOf(v) === i; }).slice(0, 18);
  /* V61 居家训练计划：只认合法动作 id 与文字条目 */
  if (u.gymPlan && typeof u.gymPlan === 'object' && Array.isArray(u.gymPlan.days)) {
    const okIds = {};
    GYM_MOVES.forEach(m => { okIds[m.id] = true; });
    const days = u.gymPlan.days.slice(0, 7).map(day => {
      if (!day || !Array.isArray(day.ex)) return null;
      const ex = day.ex.slice(0, 8).map(e => {
        if (e && okIds[e.id]) return { id: e.id };
        if (e && typeof e.t === 'string' && e.t.trim()) return { t: e.t.trim().slice(0, 30), s: typeof e.s === 'string' ? e.s.slice(0, 40) : '' };
        return null;
      }).filter(Boolean);
      return { f: typeof day.f === 'string' ? day.f.slice(0, 16) : '', ex };
    }).filter(Boolean);
    if (days.length === 7) d.gymPlan = { gen: (typeof u.gymPlan.gen === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(u.gymPlan.gen)) ? u.gymPlan.gen : todayKey(), days };
  }
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

/* ================= V53 双人合并同步 =================
   原则：合并只补不删——云端有而本地没有的记录并进来，本地已有的任何字段绝不覆盖。
   这样两台手机各记各的，云端自动汇成完整双人账本；同时天然兼做丢数据找回。 */
function mergeRemoteIntoState(remote) {
  if (!remote || !remote.records || typeof remote.records !== 'object') return 0;
  const clean = sanitizeRecords(remote.records); /* 白名单过滤，脏数据进不来 */
  const recs = state.records = state.records || {};
  let added = 0;
  Object.keys(clean).forEach(k => {
    const r = clean[k], cur = recs[k];
    if (!cur) { recs[k] = r; added++; return; }
    PERSON_IDS.forEach(p => { if (typeof r[p] === 'number' && typeof cur[p] !== 'number') { cur[p] = r[p]; added++; } });
    ['_waist','_bf','_vf','_mm','_bmr'].forEach(s => {
      PERSON_IDS.forEach(p => {
        const f = p + s;
        if (typeof r[f] === 'number' && typeof cur[f] !== 'number') { cur[f] = r[f]; added++; }
      });
    });
    if (typeof r.note === 'string' && r.note.trim() && !cur.note) { cur.note = r.note.trim(); added++; }
  });
  if (remote.goals && typeof remote.goals === 'object') {
    state.goals = state.goals || {};
    PERSON_IDS.forEach(p => { if (typeof remote.goals[p] === 'number' && typeof state.goals[p] !== 'number') state.goals[p] = remote.goals[p]; });
  }
  if (remote.heights && typeof remote.heights === 'object') {
    state.heights = state.heights || {};
    PERSON_IDS.forEach(p => { if (typeof remote.heights[p] === 'number' && typeof state.heights[p] !== 'number') state.heights[p] = remote.heights[p]; });
  }
  return added;
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
    if (g.status === 200) {
      const gj = await g.json();
      sha = gj.sha;
      /* V53：推送前先把云端有而本机没有的并进来，再推全量——两台手机互不覆盖 */
      try {
        const rem = parseBackupText(decodeURIComponent(escape(atob(String(gj.content).replace(/\n/g, '')))));
        if (rem && mergeRemoteIntoState(rem) > 0) persist();
      } catch (e) {}
    }
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
      pushHistorySnapshot('每日快照 ' + todayKey());
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
    pushHistorySnapshot('每日快照 ' + todayKey());
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

/* V39 启动对账：本地空 → 自动拉回；本地有但云端更新（上次没存完整就被杀）→ 确认后拉回 */
async function autoRestore() {
  try {
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
    const localCount = sortedKeys().length;
    if (localCount === 0) {
      /* 本地全空：云端进来是纯增益，直接恢复 */
      remote.ui = sanitizeUI(remote.ui);
      state = remote;
      persist();
      renderAll();
      applyTheme();
      toast('✓ 检测到本地无数据，已自动从云端恢复 ' + count + ' 天记录');
      return;
    }
    /* V53 双人合并：云端有而手机没有的直接并入（也覆盖 iOS 杀进程丢写入的找回），不再打扰弹窗 */
    const added = mergeRemoteIntoState(remote);
    if (added > 0) {
      persist();
      scheduleCloudBackup(); /* 并入后尽快上云，对方打开就能看到 */
      renderAll();
      applyTheme();
      toast('✓ 已从云端合并 ' + added + ' 条记录');
    }
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
    const added = mergeRemoteIntoState(remote);
    if (added > 0) {
      persist();
      scheduleCloudBackup();
      renderAll();
      toast('✓ 已从云端合并 ' + added + ' 条记录（手机原有数据全部保留）');
    } else {
      toast('云端没有手机上缺的记录，无需合并');
    }
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
    heights: state.heights || { me: null, partner: null },
    ui: state.ui || sanitizeUI(null),
    exportedAt: new Date().toISOString()
  });
}

/* V36 历史档：每次推送同时存一份按日期命名的快照到 data/history/，误覆盖可回退到任意过去的一天 */
async function pushHistorySnapshot(msg) {
  try {
    const d = new Date();
    const stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const path = 'data/history/' + stamp + '.json';
    const content = btoa(unescape(encodeURIComponent(backupJSON())));
    if (ghConf.provider === 'gitee') {
      const base = 'https://api.gitee.com/api/v5/repos/' + ghConf.owner + '/' + ghConf.repo + '/contents/' + path;
      let sha = null;
      const g = await fetch(base + '?access_token=' + encodeURIComponent(ghConf.token));
      if (g.status === 200) sha = (await g.json()).sha;
      await fetch(base, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content, message: msg, sha: sha })
      });
    } else {
      let sha = null;
      const g = await fetch('https://api.github.com/repos/' + ghConf.owner + '/' + ghConf.repo + '/contents/' + path, {
        headers: { Authorization: 'Bearer ' + ghConf.token, Accept: 'application/vnd.github+json' }
      });
      if (g.status === 200) sha = (await g.json()).sha;
      await fetch('https://api.github.com/repos/' + ghConf.owner + '/' + ghConf.repo + '/contents/' + path, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + ghConf.token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, content: content, sha: sha })
      });
    }
  } catch (e) { /* 历史档失败不影响主备份 */ }
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
    recHint = '已记录 · 数字可直接改，改完点保存';
  } else if (r) {
    recHint = '只记了一半 · 缺的人填上';
  } else if (currentDate === todayKey()) {
    recHint = '今天还没记 · 灰字是上次称的，仅供参考';
  } else {
    recHint = '这天没记 · 灰字是上次（' + (prevMe ? fmtMD(prevMe.key) + ' ' + prevMe.value.toFixed(1) : '暂无') + '）';
  }

  document.getElementById('record-card').innerHTML =
    '<div class="card">' +
      '<h3 class="card-label">记录 · ' + when + '</h3>' +
      '<p class="sub" style="margin-bottom:8px">' + recHint + '</p>' +
      /* V73 深夜称重护栏：23点~5点 且今天还没存体重时提醒——深夜值不作数，别被吓到 */
      (function () {
        if (currentDate !== todayKey()) return '';
        if (r && PERSON_IDS.some(p => typeof r[p] === 'number')) return '';
        const hr = new Date().getHours();
        if (!(hr >= 23 || hr < 5)) return '';
        return '<div class="late-bar"><b>🌙 深夜体重不作数</b><span>现在是深夜——这时候称出来比明早晨重高 0.5~1kg（一天的饭和水都还在身上），是正常生理现象不是胖了。去睡吧，明早空腹称的数才官方</span></div>';
      })() +
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
              '<input class="w-input x-input" type="number" step="0.5" inputmode="decimal" placeholder="' + (wPrev ? '上次 ' + wPrev.value.toFixed(1) : '腰围') + '" data-person="' + p + '_waist" value="' + (wHas ? r[p + '_waist'] : esc(drafts[p + '_waist'] || '')) + '">' +
              '<span class="unit">cm</span>' +
            '</div>';
          }).join('') +
          '<p class="sub" style="margin:6px 0 2px">体脂率：小米秤测完直接抄数（%）。同秤自比才有意义，换了秤别跨秤比</p>' +
          PERSON_IDS.map(p => {
            const bHas = r && typeof r[p + '_bf'] === 'number';
            const bPrev = lastKnownField(p + '_bf');
            return '<div class="in-row x-row">' +
              '<span class="in-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span>' +
              '<input class="w-input x-input" type="number" step="0.1" inputmode="decimal" placeholder="' + (bPrev ? '上次 ' + bPrev.value.toFixed(1) : '体脂') + '" data-person="' + p + '_bf" value="' + (bHas ? r[p + '_bf'] : esc(drafts[p + '_bf'] || '')) + '">' +
              '<span class="unit">%</span>' +
            '</div>';
          }).join('') +
          '<p class="sub" style="margin:6px 0 2px">体成分报告：测完整报告那天才填（秤上点「体成分」页抄），平时不用管</p>' +
          PERSON_IDS.map(p => {
            const vf = lastKnownField(p + '_vf'), mm = lastKnownField(p + '_mm'), bmr = lastKnownField(p + '_bmr');
            return '<div class="in-row x-row">' +
              '<span class="in-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span>' +
              '<input class="w-input x-input" type="number" step="1" inputmode="numeric" placeholder="' + (vf ? '上次 ' + vf.value.toFixed(0) : '内脏') + '" data-person="' + p + '_vf" value="' + (r && typeof r[p + '_vf'] === 'number' ? r[p + '_vf'] : esc(drafts[p + '_vf'] || '')) + '">' +
              '<input class="w-input x-input" type="number" step="0.1" inputmode="decimal" placeholder="' + (mm ? '上次 ' + mm.value.toFixed(1) : '肌肉') + '" data-person="' + p + '_mm" value="' + (r && typeof r[p + '_mm'] === 'number' ? r[p + '_mm'] : esc(drafts[p + '_mm'] || '')) + '">' +
              '<input class="w-input x-input" type="number" step="1" inputmode="numeric" placeholder="' + (bmr ? '上次 ' + bmr.value.toFixed(0) : '代谢') + '" data-person="' + p + '_bmr" value="' + (r && typeof r[p + '_bmr'] === 'number' ? r[p + '_bmr'] : esc(drafts[p + '_bmr'] || '')) + '">' +
            '</div>';
          }).join('') +
          '<button class="linklike extra-toggle" data-action="toggle-extra">收起</button>' +
        '</div>';
      })() +
            '<input class="note-input" type="text" maxlength="60" enterkeyhint="done" placeholder="如：昨晚吃火锅 / 熬夜了 / 开始力量训练" value="' + (r && r.note ? esc(r.note) : '') + '">' +
      '<button class="btn save-btn' + (Date.now() - (window.__savedFlashAt || 0) < 1600 ? ' saved' : '') + '" data-action="save-all">' +
        (Date.now() - (window.__savedFlashAt || 0) < 1600 ? '✓ 已保存' : '保存') + '</button>' +
      
    '</div>';

  /* V99：双人对比拆成两张独立卡（各自可拖），相邻时并排、分开时各占整行 */
  const recPg0 = document.getElementById('page-record');
  const hrOld = document.getElementById('hero-row');
  if (hrOld && !document.getElementById('elio-card')) {
    const eC = document.createElement('div'); eC.id = 'elio-card';
    const tC = document.createElement('div'); tC.id = 'tina-card';
    hrOld.after(eC); eC.after(tC); hrOld.remove();
  }
  const heroCards = heroHTML();
  const eEl = document.getElementById('elio-card'), tEl = document.getElementById('tina-card');
  if (eEl) eEl.innerHTML = heroCards[0] || '';
  if (tEl) tEl.innerHTML = heroCards[1] || '';
  document.getElementById('record-extra').innerHTML = recordExtraHTML();
  ['elio-card', 'tina-card', 'record-extra'].forEach(function (k) {
    const el = document.getElementById(k);
    if (el) { el.removeAttribute('data-psortkey'); el.setAttribute('data-psortkey', k); }
  });
  const rc = document.getElementById('record-card');
  if (rc) { rc.removeAttribute('data-psortkey'); rc.setAttribute('data-pssortanchor', '1'); }
  const recPg = document.getElementById('page-record');
  ['.page-head', '.date-row', '#makeup-box'].forEach(function (sel) {
    const el = recPg.querySelector(sel);
    if (el) el.setAttribute('data-psortfixed', '1');
  });
  setupPageSort('record');
  fixDuoPair();
}
/* 相邻=并排半宽；被拖开=各自整行 */
function fixDuoPair() {
  const eE2 = document.getElementById('elio-card'), tE2 = document.getElementById('tina-card');
  if (!eE2 || !tE2) return;
  const cont = eE2.parentElement;
  if (!cont) return;
  const kids = [...cont.children];
  const adj = state.ui.heroLayout !== 'stack' && Math.abs(kids.indexOf(eE2) - kids.indexOf(tE2)) === 1;
  eE2.classList.toggle('duo-half', adj);
  tE2.classList.toggle('duo-half', adj);
}

const GEAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z"/></svg>';

/* V72: hero 迷你走势线（最近 14 天，纯 SVG 轻量自绘） */
function heroSpark(p) {
  const ks = sortedKeys().slice(-14);
  const pts = [];
  ks.forEach(k => { const v = state.records[k] ? state.records[k][p] : undefined; if (typeof v === 'number') pts.push(v); });
  if (pts.length < 3) return '';
  const W = 120, H = 30;
  const min = Math.min.apply(null, pts), max = Math.max.apply(null, pts);
  const span = Math.max(0.4, max - min);
  const xy = pts.map((v, i) => [ (i / (pts.length - 1)) * (W - 4) + 2, H - 4 - ((v - min) / span) * (H - 10) ]);
  const d = xy.map((p2, i) => (i === 0 ? 'M' : 'L') + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1)).join(' ');
  const last = xy[xy.length - 1];
  return '<svg class="hero-spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
    '<path d="' + d + '" fill="none" stroke="' + COLORS[p] + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>' +
    '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="3" fill="' + COLORS[p] + '"/>' +
  '</svg>';
}

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
  const cols = PERSON_IDS.map(p => {
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
      heroSpark(p) +
      '<div class="hero-delta">' + deltaChip(prev ? cur - prev.value : null, 1, relPrev(lk, prev)) + '</div>' +
      progHTML + gridHTML +
    '</div>';
  });
  return cols;
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

function workoutStripHTML() {
  const st = workoutStats();
  const done = st.done;
  const ico = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/></svg>';
  return '<div class="wstrip" data-action="wt-open-hub" role="button">' +
    '<span class="wstrip-ico' + (done ? ' ok' : '') + '">' + (done ? '✓' : ico) + '</span>' +
    '<span class="wstrip-t"><b>' + (done ? '今天已打卡' : '今天的健身还没记') + '</b><em>连续 ' + st.streak + ' 天 · 本周 ' + st.week + ' 次 · 累计 ' + st.total + '</em></span>' +
    (done ? '<span class="wstrip-done">✓</span>' : '<button class="wstrip-btn" data-action="wt-punch">打卡</button>') +
    '</div>';
}
function refreshWorkoutUI() {
  const el = document.getElementById('record-extra');
  if (el) el.innerHTML = recordExtraHTML();
  if (document.getElementById('workout-body')) renderWorkout();
  if (typeof curWidget !== 'undefined' && (curWidget === 'fit-hub' || curWidget === 'gym-lib')) renderWidgetSheet('跟练库');
}
function recordExtraHTML() {
  const n = Object.keys(state.records).length;
  let html = workoutStripHTML();
  if (!n) {
    html += '<div class="card">' +
      '<h3 class="card-label">从旧版搬数据 · 一步完成</h3>' +
      '<p class="sub">旧图标 → 设置 → 复制备份文本，粘贴到下面直接导入。</p>' +
      '<textarea class="json-area import-area" placeholder="粘贴备份文本或存档链接"></textarea>' +
      '<button class="btn sm" data-action="import-backup">导入</button>' +
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
function prevKnownField(f) {
  /* V75: 倒数第二次测量——腰围是低频指标，「比上次」比「比首次」有用得多 */
  const ks = sortedKeys().filter(k => typeof (state.records[k] || {})[f] === 'number');
  return ks.length >= 2 ? { key: ks[ks.length - 2], value: state.records[ks[ks.length - 2]][f] } : null;
}
function waistInterpText() {
  const parts = PERSON_IDS.map(p => {
    const last = lastKnownField(p + '_waist');
    if (!last) return null;
    let txt = esc(state.names[p]) + ' 最新 ' + last.value.toFixed(1) + 'cm（' + fmtMD(last.key) + '）';
    const prev = prevKnownField(p + '_waist');
    if (prev) {
      const d = last.value - prev.value;
      const cmp = '比上次（' + fmtMD(prev.key) + ' ' + prev.value.toFixed(1) + '）';
      if (d <= -0.5) txt += '，' + cmp + ' ↓' + Math.abs(d).toFixed(1) + '，肚子在缩小';
      else if (d >= 0.5) txt += '，' + cmp + ' ↑' + d.toFixed(1) + '，最近留意饮食';
      else txt += '，与上次（' + fmtMD(prev.key) + '）基本持平';
    }
    return txt;
  }).filter(Boolean);
  return parts.join(' · ') || '量过一次之后，这里会自动出解读';
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
  if (noteInput && document.activeElement === noteInput) {
    /* 点保存时若光标还在备注框：先失焦，强制拼音输入法把没上屏的字提交完，否则会存到半句（V39） */
    try { noteInput.blur(); } catch (e) {}
  }
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
  clearTimeout(ghTimer);
  cloudBackup('save'); /* 手动保存立即推云（V39）：不等 3 秒防抖，缩小 iOS 杀进程丢写的窗口 */
  toast('✓ ' + (currentDate === todayKey() ? '今晨' : fmtMD(currentDate)) + ' 已保存，数据记上了');
  renderAll();
}

/* ================= 目标进度卡 ================= */
function peakKnown(p) {
  /* V78: 进度基准=历史最高体重——涨过再降的人用「最早记录」会算出负进度（0% 元凶） */
  let best = null;
  sortedKeys().forEach(k => {
    const v = (state.records[k] || {})[p];
    if (typeof v === 'number' && (!best || v > best.value)) best = { key: k, value: v };
  });
  return best;
}

function goalRate2(p) {
  /* V78: 预测升级——先 7 日移动平均抹掉日波动（深夜称重/聚餐），再对平滑线做最小二乘，带 R² 质量门槛：不达标不出数，宁缺毋滥 */
  const days = lastNDays(28);
  const raw = [];
  days.forEach(k => {
    const r = state.records[k];
    if (r && typeof r[p] === 'number') raw.push({ t: parseKey(k).getTime() / 86400000, v: r[p] });
  });
  if (raw.length < 7) return null;
  const pts = [];
  for (let i = 6; i < raw.length; i++) {
    const seg = raw.slice(i - 6, i + 1);
    pts.push({ t: seg[seg.length - 1].t, v: seg.reduce((s, x) => s + x.v, 0) / seg.length });
  }
  if (pts.length < 5) return null;
  const n = pts.length;
  const mt = pts.reduce((s, x) => s + x.t, 0) / n, mv = pts.reduce((s, x) => s + x.v, 0) / n;
  let num = 0, den = 0;
  pts.forEach(x => { num += (x.t - mt) * (x.v - mv); den += (x.t - mt) * (x.t - mt); });
  if (!den) return null;
  const slope = num / den;
  const ssTot = pts.reduce((s, x) => s + Math.pow(x.v - mv, 2), 0);
  const ssRes = pts.reduce((s, x) => s + Math.pow(x.v - (mv + slope * (x.t - mt)), 2), 0);
  const r2 = ssTot ? Math.max(0, 1 - ssRes / ssTot) : 0;
  return { slope: slope, r2: r2, n: raw.length };
}

function goalRateOld(p) { /* 最近14天斜率 kg/天，用最小二乘 */
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
      '<button class="btn sm" data-action="save-goals-inline">保存目标，开始倒计时</button>' +
    '</div>';
  }

  /* 有人设了目标 → 进度卡 */
  const rows = PERSON_IDS.map(p => {
    const g = state.goals[p];
    if (g === null || g === undefined) return '';
    const peak = peakKnown(p), cur = lastKnown(p);
    if (!peak || !cur) return '<div class="gp-row"><span class="gp-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span><span class="s-dim">记一笔体重后开始算进度</span></div>';

    /* V78: 基准=历史最高。每个数字自带解释（从最高 X） */
    const done = peak.value - cur;   /* 从峰值已减（≥0） */
    const need = peak.value - g;           /* 总任务 */
    if (need <= 0) return '<div class="gp-row"><span class="gp-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span><span class="s-dim">目标应低于体重，回设置里改一下</span></div>';

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

    /* V78: 预测三态——稳定降=给周数（注明依据）/ 在涨=诚实说+建设性 / 数据乱=不猜 */
    let eta = '';
    if (remain <= 0.05) {
      eta = '<span class="gp-hit">目标已达成，保持住</span>';
    } else {
      const r2r = goalRate2(p);
      if (r2r && r2r.r2 >= 0.45 && r2r.slope <= -0.02) {
        const rateW = -r2r.slope * 7; /* kg/周，正=在减 */
        const w = Math.ceil(remain / rateW);
        if (w <= 52) eta = '按近 4 周趋势（-' + rateW.toFixed(2) + ' kg/周）约 ' + w + ' 周达成';
        else eta = weekly || '趋势在但很慢 · 保持记录，让曲线说话';
      } else if (r2r && r2r.r2 >= 0.45 && r2r.slope >= 0.02) {
        eta = '最近一个月在涨（+' + (r2r.slope * 7).toFixed(2) + ' kg/周）· 回到下降趋势这里会自动出预测';
      } else {
        eta = r2r ? '波动太大，趋势还不够清晰 · 多记几天预测会更准' : (weekly || '再记几天就能预测了');
      }
    }

    return '<div class="gp-row">' +
      '<div class="gp-head"><span class="gp-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span>' +
      '<span class="gp-num">进度 ' + pct.toFixed(0) + '% · 从最高 ' + peak.value.toFixed(1) + ' 已减 ' + done.toFixed(1) + ' kg</span></div>' +
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
  let defs = '';
  const bottom = T + ih;
  const goalsDrawn = [];
  series.forEach(s => {
    const cpts = s.pts.map(pt => ({ x: X(pt.i), y: Y(pt.v) }));
    if (cpts.length) {
      const d = smoothPath(cpts);
      if (d) {
        /* V59 渐变面积：曲线下方同色淡出填充 */
        const gid = 'g' + s.p + '-' + Math.random().toString(36).slice(2, 7);
        defs += '<linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="' + COLORS[s.p] + '" stop-opacity=".16"/>' +
          '<stop offset="1" stop-color="' + COLORS[s.p] + '" stop-opacity="0"/></linearGradient>';
        paths += '<path d="' + d + ' L ' + cpts[cpts.length - 1].x + ' ' + bottom + ' L ' + cpts[0].x + ' ' + bottom + ' Z" fill="url(#' + gid + ')" stroke="none"/>';
        paths += '<path d="' + d + '" fill="none" stroke="' + COLORS[s.p] + '" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>';
      }
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
      paths += '<circle cx="' + last.x + '" cy="' + last.y + '" r="10" fill="' + COLORS[s.p] + '" opacity=".14"/>' +
        '<circle cx="' + last.x + '" cy="' + last.y + '" r="4" fill="var(--card)" stroke="' + COLORS[s.p] + '" stroke-width="2.5"/>';
    }
    const g = withGoals ? state.goals[s.p] : undefined;
    if (typeof g === 'number' && goalsDrawn.indexOf(g.toFixed(1)) === -1) {
      goalsDrawn.push(g.toFixed(1));
      paths += '<line x1="' + L + '" y1="' + Y(g) + '" x2="' + (W - R) + '" y2="' + Y(g) + '" stroke="var(--text3)" stroke-width="1" stroke-dasharray="4 4" opacity="0.7"/>';
      paths += '<text x="' + (W - R - 2) + '" y="' + (Y(g) - 4) + '" text-anchor="end" style="font-size:10px;fill:var(--text3)">目标 ' + g.toFixed(1) + '</text>';
    }
  });

  const svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img">' +
    (defs ? '<defs>' + defs + '</defs>' : '') +
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

/* V70: 趋势页数据宫格（与统计页同款交互：格上一个数，点开看完整卡） */
function trendWaistBody() {
  const days = rangeDays();
  const anyWaist = sortedKeys().some(k => { const r = state.records[k]; return r && PERSON_IDS.some(p => typeof r[p + '_waist'] === 'number'); });
  if (!anyWaist) return '';
  const c = buildDualChart(days, { read: (r, p) => (r ? r[p + '_waist'] : undefined), goals: false, unit: 'cm' });
  if (c.empty) return '';
  const rangeName = trendRange === 0 ? '全部记录' : '最近 ' + trendRange + ' 天';
  const legend = PERSON_IDS.map(p => {
    const last = lastKnownField(p + '_waist');
    return '<span class="lg-item"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) +
      (last ? ' <b>' + last.value.toFixed(1) + '</b> cm' : '') + '</span>';
  }).join('');
  const html = '<div class="card chart-card">' +
    '<div class="chart-head2"><h3 class="card-label">腰围走势 · ' + rangeName + '</h3><div class="lg">' + legend + '</div></div>' +
    '<p class="sub">' + waistInterpText() + '</p>' +
    '<p class="sub">减肚子的硬指标：体重不动时，腰围缩小 = 脂肪真的在掉 · 建议每周量 1~2 次</p>' +
    '<div class="chart-wrap">' + c.svg + '<div class="chart-tip"></div></div>' +
  '</div>';
  return { html: html, scrub: true };
}
function trendBfBody() {
  const days = rangeDays();
  const anyBf = sortedKeys().some(k => { const r = state.records[k]; return r && PERSON_IDS.some(p => typeof r[p + '_bf'] === 'number'); });
  if (!anyBf) return '';
  const c = buildDualChart(days, { read: (r, p) => (r ? r[p + '_bf'] : undefined), goals: false, dec: 1, unit: '%' });
  if (c.empty) return '';
  const rangeName = trendRange === 0 ? '全部记录' : '最近 ' + trendRange + ' 天';
  const legend = PERSON_IDS.map(p => {
    const last = lastKnownField(p + '_bf');
    return '<span class="lg-item"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) +
      (last ? ' <b>' + last.value.toFixed(1) + '</b> %' : '') + '</span>';
  }).join('');
  const html = '<div class="card chart-card">' +
    '<div class="chart-head2"><h3 class="card-label">体脂率走势 · ' + rangeName + '</h3><div class="lg">' + legend + '</div></div>' +
    '<p class="sub">来自你们的体脂秤数据 · 看趋势别看单日：早上空腹上秤最准</p>' +
    '<div class="chart-wrap">' + c.svg + '<div class="chart-tip"></div></div>' +
  '</div>';
  return { html: html, scrub: true };
}
function trendGridHTML() {
  const curMe = lastKnown('me'), curPa = lastKnown('partner');
  const wMe = lastKnownField('me_waist'), wPa = lastKnownField('partner_waist');
  const bfMe = lastKnownField('me_bf'), bfPa = lastKnownField('partner_bf');
  const cell = (k, icon, name, val, foot) =>
    '<button class="stat-cell" data-action="open-trend" data-v="' + k + '">' +
      '<span class="sc-ico">' + icon + '</span>' +
      '<span class="sc-name">' + name + '</span>' +
      '<span class="sc-val">' + val + '</span>' +
      '<span class="sc-foot">' + foot + '</span>' +
    '</button>';
  const days = rangeDays();
  const counted = days.filter(k => state.records[k] && PERSON_IDS.some(p => typeof state.records[k][p] === 'number')).length;
  const cells = [];
  cells.push(cell('cal', '🗓️', '月历', counted + ' 天', '这个月哪天记了哪天没记'));
  cells.push(cell('goal', '🎯', '目标进度', (curMe !== null ? curMe.toFixed(1) : '--'), '离 65kg / 63kg 还差多少'));
  cells.push(cell('waist', '📏', '腰围走势', (wMe ? wMe.value.toFixed(1) : (wPa ? wPa.value.toFixed(1) : '没量')), '肚子的硬指标曲线'));
  cells.push(cell('bf', bfMe || bfPa ? '🫀' : '🫀', '体脂率', (bfMe ? bfMe.value.toFixed(1) : (bfPa ? bfPa.value.toFixed(1) : '没录')), '秤上的体脂曲线'));
  return '<div class="card"><h3 class="card-label">更多 · 点开看详情</h3>' +
    '<p class="sub">格上一眼一个数 · 点哪个看哪个的完整走势</p>' +
    '<div class="stat-grid">' + cells.join('') + '</div></div>';
}
let curTrendSheet = null, curStatSheet = null;
/* V75: 弹层开着时点击交互必须刷新弹层本身——只刷底页=用户看着毫无反应 */
function refreshOpenSheet() {
  const el = document.getElementById('widget-sheet');
  if (!el || !el.classList.contains('show')) return false;
  if (curTrendSheet) { openTrendSheet(curTrendSheet); return true; }
  if (curStatSheet) { openStatSheet(curStatSheet); return true; }
  /* V80: 健康营组件弹层也在刷新名单——漏了就是「点了没反应」重演 */
  if (curWidget) {
    const w = WIDGETS.find(x => x.id === curWidget);
    if (w) { renderWidgetSheet(w.t); return true; }
  }
  return false;
}
function openTrendSheet(key) { curTrendSheet = key; curStatSheet = null;
  let content = '', title = '';
  if (key === 'cal') { title = '月历'; content = calendarHTML(); }
  else if (key === 'goal') { title = '目标进度'; content = goalProgressHTML(); }
  else if (key === 'waist') { const m = trendWaistBody(); if (!m) { toast('腰围数据还不够画曲线，先记上 2 次再来看'); return; } title = '腰围走势'; content = m.html; setTimeout(() => { const w = document.querySelector('#widget-body .chart-wrap'); if (w) { const c = buildDualChart(rangeDays(), { read: (r, p) => (r ? r[p + '_waist'] : undefined), goals: false, unit: 'cm' }); if (!c.empty) attachScrub(w, c); } }, 30); }
  else if (key === 'bf') { const m = trendBfBody(); if (!m) { toast('体脂数据还不够画曲线，先记上 2 次再来看'); return; } title = '体脂率走势'; content = m.html; setTimeout(() => { const w = document.querySelector('#widget-body .chart-wrap'); if (w) { const c = buildDualChart(rangeDays(), { read: (r, p) => (r ? r[p + '_bf'] : undefined), goals: false, dec: 1, unit: '%' }); if (!c.empty) attachScrub(w, c); } }, 30); }
  const el = document.getElementById('widget-sheet');
  document.getElementById('widget-sheet-title').textContent = title;
  document.getElementById('widget-body').innerHTML = content;
  el.classList.add('show');
  document.getElementById('sheet-mask').classList.add('show');
}
function renderTrend() {
  const calBox = document.getElementById('cal-box');
  if (calBox) calBox.innerHTML = '';
  document.querySelectorAll('#range-seg button').forEach(b => {
    b.classList.toggle('active', +b.dataset.range === trendRange);
  });
  ['day-compare','chart-box','cal-box','goal-box','waist-chart-box','bf-chart-box','range-summary','trend-grid'].forEach(function (k) {
    const el = document.getElementById(k);
    if (el && !el.getAttribute('data-psortkey')) el.setAttribute('data-psortkey', k);
  });
  const trHead = document.querySelector('#page-trend .page-head');
  if (trHead) trHead.setAttribute('data-pssortanchor', '1');
  setupPageSort('trend');

  document.getElementById('goal-box').innerHTML = '';

  const days = rangeDays();
  const anyData = PERSON_IDS.some(p => lastKnown(p) !== null);
  const box = document.getElementById('chart-box');
  const dcEmpty = document.getElementById('day-compare');
  if (dcEmpty) dcEmpty.innerHTML = dayCompareHTML();
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

  /* V74: 昨天→今天对比卡置顶（图表上方），7 天概览保持原位 */
  const dcBox = document.getElementById('day-compare');
  if (dcBox) dcBox.innerHTML = dayCompareHTML();
  document.getElementById('range-summary').innerHTML = rangeSummaryHTML(days);

  /* V70: 趋势页组件化——日历/目标/腰围/体脂收进宫格，点开看详情 */
  const gridBox = document.getElementById('trend-grid');
  if (gridBox) gridBox.innerHTML = trendGridHTML();

    /* V70: 腰围/体脂曲线收进宫格，这里只填宫格 */
  const waistBox = document.getElementById('waist-chart-box');
  const bfBox = document.getElementById('bf-chart-box');
  waistBox.innerHTML = '';
  bfBox.innerHTML = '';
}

/* V74: 昨天→今天对比卡——TA 要的是"昨天多少、今天多少、差多少"，一眼直出 */
function dayCompareHTML() {
  const ks = sortedKeys().filter(k => PERSON_IDS.some(p => typeof (state.records[k] || {})[p] === 'number'));
  if (!ks.length) return '';
  const latest = ks[ks.length - 1], prev = ks.length > 1 ? ks[ks.length - 2] : null;
  const isToday = latest === todayKey();
  const title = !prev ? '最近一次' : (prev === shiftKey(latest, -1) && isToday ? '昨天 → 今天' : fmtMD(prev) + ' → ' + fmtMD(latest));
  const rows = PERSON_IDS.map(p => {
    const cur = state.records[latest] ? state.records[latest][p] : undefined;
    if (typeof cur !== 'number') return '';
    const pv = prev && state.records[prev] ? state.records[prev][p] : undefined;
    const d = typeof pv === 'number' ? cur - pv : null;
    return '<div class="rs-row">' +
      '<span class="rs-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span>' +
      '<span class="rs-main">' + (typeof pv === 'number' ? pv.toFixed(1) + ' → ' : '') + '<b>' + cur.toFixed(1) + '</b> kg</span>' +
      (d === null ? '<span class="s-dim">上一次没记</span>' : deltaChip(d)) +
    '</div>';
  }).filter(Boolean).join('');
  if (!rows) return '';
  const hint = isToday ? '' : '<p class="sub" style="margin-top:6px">最新一条是 ' + fmtMD(latest) + ' · 今天还没记，去「记录」页称一个</p>';
  return '<div class="card" style="margin-bottom:12px"><h3 class="card-label">' + title + '</h3>' +
    '<p class="sub">最近两次记录直出 · ' + (prev ? fmtMD(prev) + ' ' : '') + '→ ' + fmtMD(latest) + (isToday ? '（今天）' : '') + '</p>' +
    rows + hint + '</div>';
}
/* 日期键平移工具：shiftKey('2026-10-13', -1) === '2026-10-12' */
function shiftKey(key, n) {
  const d = parseKey(key); d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
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
  /* V68: 一句话总结——把表格翻译成人话 */
  let verdict = '';
  try {
    const lines = PERSON_IDS.map(p => {
      const cur = lastKnown(p);
      if (cur === null) return '';
      const inRange = [];
      days.forEach(k => { const v = state.records[k] ? state.records[k][p] : undefined; if (typeof v === 'number') inRange.push({ k, v }); });
      if (!inRange.length) return '';
      const first = inRange[0], last = inRange[inRange.length - 1];
      const span = last.v - first.v;
      const nm = esc(state.names[p]);
      if (span <= -0.3) return nm + ' ' + first.v.toFixed(1) + '→' + last.v.toFixed(1) + '（降 ' + Math.abs(span).toFixed(1) + 'kg，有效果）';
      if (span >= 0.3) return nm + ' ' + first.v.toFixed(1) + '→' + last.v.toFixed(1) + '（涨 ' + span.toFixed(1) + 'kg，盯一下）';
      return nm + ' ' + first.v.toFixed(1) + '→' + last.v.toFixed(1) + '（基本横住，稳）';
    }).filter(Boolean);
    if (lines.length) verdict = '<div class="verdict"><b>一句话：</b>' + lines.join(' · ') +
      '<button class="btn ghost sm" data-action="copy-summary" style="margin-top:8px">复制这段话</button></div>';
  } catch (e) {}
  const isAll = trendRange === 0;
return '<div class="card"><h3 class="card-label">' + (isAll ? '全部记录 · 从第一斤到现在' : trendRange + '天概览 · 期初 → 现在') + '</h3>' +
    '<p class="sub" style="margin-bottom:6px">' + (isAll
      ? '全期总账只在这一个地方看 · 想看近期对比，上面切「7天」或「30天」'
      : '「起点 → 最新」这段总共的变化 · 箭头=瘦了↓ / 胖了↑ · 「均」= 这段平均') + '</p>' + rows + verdict + '</div>';
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
/* V60: 30 天总览大屏——一屏看懂俩人的区别（数值固定列，防短条折行） */
function ovStats(p) {
  const cur = lastKnown(p);
  if (cur === null) return null;
  const days = lastNDays(30);
  const in30 = days.filter(k => state.records[k] && typeof state.records[k][p] === 'number').map(k => state.records[k][p]);
  const first30 = in30.length ? in30[0] : null;
  const avg30 = in30.length ? in30.reduce((a, b) => a + b, 0) / in30.length : null;
  const now = new Date();
  const mStr = todayKey().slice(0, 7);
  const mKeys = sortedKeys().filter(k => k.slice(0, 7) === mStr && typeof state.records[k][p] === 'number');
  const mDays = mKeys.length, mAll = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const g = state.goals[p];
  const bf = lastKnownField(p + '_bf');
  return {
    cur, curKey: lastKeyOf(p),
    goal: (typeof g === 'number' && cur !== null) ? (cur - g) : null,
    d30: (first30 !== null && in30.length >= 2) ? (cur - first30) : null,
    avg30, mDays, mAll,
    bf: bf ? bf.value : null
  };
}
function overviewHTML() {
  const a = ovStats('me'), b = ovStats('partner');
  if (!a && !b) return '';
  function cell(v, digits) { return v === null ? '<span class="ov-mute">—</span>' : '<b class="ov-num">' + v.toFixed(digits === undefined ? 1 : digits) + '</b>'; }
  function rows() {
    const mk = (label, fa, fb, unit, digits) =>
      '<div class="ov-row"><span class="ov-lab">' + label + '</span>' +
      '<span class="ov-val">' + cell(fa, digits) + (unit ? '<i>' + unit + '</i>' : '') + '</span>' +
      '<span class="ov-val">' + cell(fb, digits) + (unit ? '<i>' + unit + '</i>' : '') + '</span></div>';
    let h = '';
    h += mk('最新体重', a && a.cur, b && b.cur, 'kg');
    h += mk('距目标', a && a.goal, b && b.goal, 'kg');
    h += mk('30 天变化', a && a.d30, b && b.d30, 'kg');
    h += mk('30 天平均', a && a.avg30, b && b.avg30, 'kg');
    const md = p => p === null ? null : p.mDays;
    h += '<div class="ov-row"><span class="ov-lab">本月记了</span>' +
      '<span class="ov-val">' + (a ? '<b class="ov-num">' + a.mDays + '</b><i>/' + a.mAll + ' 天</i>' : '<span class="ov-mute">—</span>') + '</span>' +
      '<span class="ov-val">' + (b ? '<b class="ov-num">' + b.mDays + '</b><i>/' + b.mAll + ' 天</i>' : '<span class="ov-mute">—</span>') + '</span></div>';
    h += mk('体脂率', a && a.bf, b && b.bf, '%');
    return h;
  }
  return '<div class="card"><h3 class="card-label">30 天总览 · 一屏看懂俩人</h3>' +
    '<div class="ov-head"><span class="ov-lab"></span>' +
    '<span class="ov-name"><i class="dotc" style="background:' + COLORS.me + '"></i>' + esc(state.names.me) + '</span>' +
    '<span class="ov-name"><i class="dotc" style="background:' + COLORS.partner + '"></i>' + esc(state.names.partner) + '</span></div>' +
    rows() +
    '<p class="set-tip">30 天变化 = 30 天前第一记 vs 现在 · 平均 = 这 30 天有记录日子的平均 · 「—」= 这个指标还没记过</p></div>';
}

/* V60: 本周 vs 上周——短周期对比，鼓励式定调 */
function weekAvgRange(p, fromKey, toKey) {
  const vals = sortedKeys().filter(k => k >= fromKey && k <= toKey && typeof state.records[k][p] === 'number').map(k => state.records[k][p]);
  return vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : null;
}
function weekCompareHTML() {
  const now = new Date();
  const monday = addDays(now, -((now.getDay() + 6) % 7));
  const lastMonday = addDays(monday, -7), lastSunday = addDays(monday, -1);
  const wk = dateKey(monday), lwk = dateKey(lastMonday), lwe = dateKey(lastSunday);
  const cols = PERSON_IDS.map(p => {
    const t = weekAvgRange(p, wk, todayKey()), l = weekAvgRange(p, lwk, lwe);
    let inner;
    if (t === null) inner = '<span class="delta flat">本周还没记</span>';
    else if (l === null) inner = '<span class="delta flat">上周没记录，从这周开始比</span>';
    else {
      const d = t - l;
      if (Math.abs(d) < 0.05) inner = '<span class="delta flat">和上周打平</span>';
      else if (d < 0) inner = '<span class="delta down">↓ ' + Math.abs(d).toFixed(1) + '</span><span class="wc-note">比上周低，继续保持</span>';
      else inner = '<span class="delta up">↑ ' + d.toFixed(1) + '</span><span class="wc-note">比上周高一点，波动很正常</span>';
    }
    return '<div class="wc-col"><div class="wc-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</div>' +
      (t !== null ? '<div class="wc-big">' + t.toFixed(1) + '<small>kg 本周均</small></div>' : '') +
      (l !== null ? '<div class="wc-last">上周均 ' + l.toFixed(1) + '</div>' : '') +
      '<div class="wc-delta">' + inner + '</div></div>';
  }).join('');
  /* V68: 周报文本——拼好直接发微信 */
  let report = '📊 双人减重周报（' + wk.slice(5).replace('-', '.') + ' 更新）\n';
  PERSON_IDS.forEach(p => {
    const t = weekAvgRange(p, wk, todayKey()), l = weekAvgRange(p, lwk, lwe);
    const nm = state.names[p];
    if (t === null) { report += '· ' + nm + '：本周还没记\n'; return; }
    const d = (l === null) ? '' : ('（较上周 ' + (t - l >= 0 ? '+' : '') + (t - l).toFixed(1) + '）');
    report += '· ' + nm + '：平均 ' + t.toFixed(1) + 'kg ' + d + '\n';
  });
  return '<div class="card"><h3 class="card-label">本周 vs 上周</h3>' +
    '<div class="wc-wrap">' + cols + '</div>' +
    '<button class="btn ghost sm" data-action="copy-weekly" data-report="' + esc(report).replace(/"/g, '&quot;') + '">复制周报 · 发微信</button>' +
    '<p class="set-tip">每周一为起点 · 比的是平均值，一天两天的浮动不算数</p></div>';
}

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

/* ================= V69 统计页组件化重构 =================
   顶部只留「大屏 + 重点变化」两张结论卡，其余全部收进宫格，点开看详情 */

function statCompareBody() {
  const curMe = lastKnown('me'), curPa = lastKnown('partner');
  if (curMe === null && curPa === null) return '';
  const vals = [curMe, curPa].filter(v => v !== null);
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
  return '<div class="card"><h3 class="card-label">俩人对比 · 最新一次体重</h3>' +
    '<p class="sub">条越长 = 体重越大 · 对比的是最新一次记录</p>' +
    bar('me', curMe) + bar('partner', curPa) + diffLine + '</div>';
}

function statWaistBody() {
  const wMe = lastKnownField('me_waist'), wPa = lastKnownField('partner_waist');
  if (!wMe && !wPa) return '';
  const vals = [wMe, wPa].filter(Boolean).map(x => x.value);
  const lo = Math.min.apply(null, vals) - 4, hi = Math.max.apply(null, vals) + 4;
  const wbar = (p, rec) => {
    const who = esc(state.names[p]);
    if (!rec) return '<div class="cmp-row"><span class="cmp-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + who + '</span><div class="cmp-track"></div><span class="cmp-val s-dim">还没量</span></div>';
    const w = Math.max(6, (rec.value - lo) / (hi - lo) * 100);
    const prev = prevKnownField(p + '_waist');
    let chg = '';
    if (prev && prev.key !== rec.key) {
      const d = rec.value - prev.value;
      const cmp = '比上次（' + fmtMD(prev.key) + ' ' + prev.value.toFixed(1) + '）';
      chg = d <= -0.5 ? '（' + cmp + ' ↓' + Math.abs(d).toFixed(1) + '）' : d >= 0.5 ? '（' + cmp + ' ↑' + d.toFixed(1) + '）' : '（和上次基本持平）';
    }
    return '<div class="cmp-row"><span class="cmp-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + who + '</span>' +
      '<div class="cmp-track"><div class="cmp-fill" style="width:' + w.toFixed(1) + '%;background:' + COLORS[p] + '"></div></div>' +
      '<span class="cmp-val">' + rec.value.toFixed(1) + ' cm</span></div>' +
      '<div class="cmp-sub">' + fmtMD(rec.key) + '记录' + chg + ' · 腰围减小=肚子脂肪在掉</div>';
  };
  return '<div class="card"><h3 class="card-label">腰围对比 · 最新一次测量</h3>' +
    '<p class="sub">腰围是肚子脂肪的硬指标 · 健康参考：男性 &lt; 90cm，女性 &lt; 85cm</p>' +
    wbar('me', wMe) + wbar('partner', wPa) + '</div>';
}

function statCompBody() {
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
        tileFoot((vf.value < 5 ? '<span class="delta down">达标</span>' : '<span class="delta up">警戒</span>') + '<span>' + VF_REF + ' · ' + fmtMD(vf.key) + '</span>') +
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
  if (!compTiles.length) return '';
  return '<div class="card"><h3 class="card-label">体成分 · 最新报告</h3>' +
    '<p class="sub">来自小米秤完整报告 · 记录页「+ 记腰围 / 体脂」最下面一栏抄数</p>' +
    '<div class="tile-grid">' + compTiles.join('') + '</div></div>';
}

function statWeeklyBody() {
  const wkRows = weeklyTableHTML();
  if (!wkRows) return '';
  return '<div class="card"><h3 class="card-label">周报 · 每周平均</h3>' +
    '<p class="sub">一人一列 · 「比上周」= 和上一个有记录的周平均比，中间没记的周自动跳过（↓瘦 ↑胖）</p>' +
    '<div class="wk-head"><span>周</span><span>' + esc(state.names.me) + '</span><span>' + esc(state.names.partner) + '</span></div>' + wkRows + weekDuelHTML() + '</div>';
}

/* 宫格：每格只放一个核心值，点开看完整卡 */
const STAT_META = {
  compare: { n: '俩人对比', ico: '⚖️' }, weekly: { n: '本周 vs 上周', ico: '📅' }, monthly: { n: '本月复盘', ico: '🗓️' },
  waist: { n: '腰围', ico: '📏' }, comp: { n: '体成分', ico: '🫀' }, table: { n: '周报表', ico: '📊' },
  plan: { n: '周计划', ico: '💪' }, history: { n: '历史记录', ico: '📜' }
};
function statFlow() {
  /* V95: 统计宫格展示顺序 = statsOrder（混排格子 id 与文件夹 id） */
  const ALL = Object.keys(STAT_META);
  const ord = (state.ui.statsOrder && state.ui.statsOrder.length) ? state.ui.statsOrder.slice() : ALL.slice();
  ALL.forEach(id => { if (ord.indexOf(id) < 0) ord.push(id); });
  const grpIds = Object.keys(state.ui.statsGroups || {});
  const used = new Set();
  const flow = ord.filter(x => {
    if (grpIds.indexOf(x) > -1) { used.add(x); return true; }
    if (ALL.indexOf(x) > -1) return !grpIds.some(g => state.ui.statsGroups[g].items.indexOf(x) > -1);
    return false;
  });
  grpIds.forEach(g => { if (!used.has(g)) flow.push(g); });
  state.ui.statsOrder = flow;
  return flow;
}
function statGridHTML() {
  const curMe = lastKnown('me'), curPa = lastKnown('partner');
  const wMe = lastKnownField('me_waist'), wPa = lastKnownField('partner_waist');
  const vfMe = lastKnownField('me_vf'), vfPa = lastKnownField('partner_vf');
  const wf = vfMe || vfPa;
  const cell = (k, icon, name, val, foot, cls) =>
    '<button class="stat-cell' + (cls ? ' ' + cls : '') + '" data-action="open-stat" data-v="' + k + '">' +
      '<span class="sc-ico">' + icon + '</span>' +
      '<span class="sc-name">' + name + '</span>' +
      '<span class="sc-val">' + val + '</span>' +
      '<span class="sc-foot">' + foot + '</span>' +
    '</button>';
  const hasAny = sortedKeys().length > 0;
  const valOf = function (k) {
    if (k === 'compare') return [(curMe !== null ? curMe.toFixed(1) : '--') + ' / ' + (curPa !== null ? curPa.toFixed(1) : '--'), '最新一次体重，谁的条更长'];
    const ws = weekStartOf(new Date());
    const wkMe = avgBetween(dateKey(ws), todayKey(), 'me'), wkPa = avgBetween(dateKey(ws), todayKey(), 'partner');
    if (k === 'weekly') return [((wkMe || wkPa) ? (wkMe ? wkMe.avg.toFixed(1) : '--') + ' / ' + (wkPa ? wkPa.avg.toFixed(1) : '--') : '还没记'), '本周平均，和上周比谁在掉'];
    if (k === 'monthly') return [hasAny ? '复盘' : '暂无', '这个月的节奏总结'];
    if (k === 'waist') return [(wMe ? wMe.value.toFixed(1) : (wPa ? wPa.value.toFixed(1) : '没量')), '肚子的硬指标，每周量 1~2 次'];
    if (k === 'comp') return [wf ? wf.value.toFixed(0) + ' 级' : '没录', wf ? (wf.value < 5 ? '内脏脂肪达标' : '内脏脂肪警戒，主战场') : '小米秤报告抄进来'];
    if (k === 'table') return [hasAny ? '看趋势' : '暂无', '每周平均一行行对比'];
    if (k === 'plan') return ['打开', '按器械排的一周安排'];
    if (k === 'history') return [sortedKeys().length + ' 天', '每一天的原始记录'];
    return ['', ''];
  };
  const cells = [];
  statFlow().forEach(function (id) {
    const g = state.ui.statsGroups && state.ui.statsGroups[id];
    if (g) {
      cells.push('<button class="stat-cell stat-folder" data-action="group-open" data-store="stats" data-id="' + id + '">' +
        '<span class="sc-ico">📁</span><span class="sc-name">' + esc(g.name) + '</span>' +
        '<span class="sc-val">' + g.items.length + ' 格</span>' +
        '<span class="sc-foot">点击打开文件夹</span></button>');
      return;
    }
    const v = valOf(id);
    cells.push(cell(id, STAT_META[id].ico, STAT_META[id].n, v[0], v[1]));
  });
  return '<div class="card"><h3 class="card-label">数据 · 点开看详情</h3>' +
    '<p class="sub">格子上一眼只放最关键的数 · <b style="color:var(--text)">长按格子拖动排序</b>，压住另一格半秒打包成文件夹</p>' +
    '<div class="stat-grid" id="stat-grid">' + cells.join('') + '</div></div>';
}

/* 点格子 → 弹出该组件完整内容 */
function openStatSheet(key) { curStatSheet = key; curTrendSheet = null;
  const map = {
    compare: [statCompareBody(), '俩人对比'],
    weekly:  [weekCompareHTML(), '本周 vs 上周'],
    monthly: [monthlyReviewHTML(), '本月复盘'],
    waist:   [statWaistBody(), '腰围'],
    comp:    [statCompBody(), '体成分'],
    table:   [statWeeklyBody(), '周报 · 每周平均'],
    plan:    [weekPlanHTML(), '周计划'],
    history: [historyHTML(), '历史记录']
  };
  const m = map[key];
  if (!m || !m[0]) { toast('这里还没有数据，先记几笔再来'); return; }
  const el = document.getElementById('widget-sheet');
  document.getElementById('widget-sheet-title').textContent = m[1];
  document.getElementById('widget-body').innerHTML = m[0];
  el.classList.add('show');
  document.getElementById('sheet-mask').classList.add('show');
  bindFoldToggle(document.getElementById('widget-body'));
}

function renderStats() {
  const keys = sortedKeys();
  let html = '';

  /* 30 天总览大屏（结论式，直出） */
  html += overviewHTML();

  /* 重点变化 · 结论卡（V22 合并版，直出） */
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
      const verdict = delta <= -0.5 ? '有效果，照这个劲头继续'
        : delta >= 0.5 ? '比起点高了，先看趋势线别慌'
        : '基本持平，身体在适应期';
      const verdictCls = delta <= -0.5 ? ' good' : delta >= 0.5 ? ' warn' : '';
      const rateTxt = rate !== null && Math.abs(rate) >= 0.005
        ? ' · 约 <b>' + (rate < 0 ? '↓' : '↑') + Math.abs(rate).toFixed(2) + '</b> kg/周'
        : '';
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

  /* 其余全部收进宫格（V69） */
  html += statGridHTML();
  document.getElementById('stats-body').innerHTML = html;
  bindFoldToggle(document.getElementById("stats-body"));
  attachDrag('#stat-grid', '.stat-cell', function (el) { return el.getAttribute('data-v') || el.getAttribute('data-id'); }, 'statgrid');
}

/* 月份折叠状态（V30）：默认只展开当月，历史月收起 */
let expandedMonths = {};
let historyMonthSeeded = false;
let monthView = {}; /* V31: 每月视图 'list' | 'cal'，默认列表 */
let planEditDow = -1; /* 正在改周几的运动（0=周一…6=周日） */
let equipAddMode = false; /* plan-sheet 正在添加自定义器械（V37） */

const WEEK_PLAN_DEFAULT = ['快走 40 分钟', '休息', '力量训练 30 分钟', '休息', '有氧运动 40 分钟', '拉伸散步', '休息'];
const PLAN_PRESETS = ['俯卧撑 30 个', '仰卧起坐 30 个', '健身棒练胸 3 组', '快走 40 分钟', '慢跑 30 分钟', '力量训练 30 分钟', '有氧运动 40 分钟', '瑜伽 20 分钟', '拉伸散步', '休息'];

/* V42 五套设计语言（+经典苹果风）：常量表放顶部（铁律），选择器渲染与每日轮换共用 */
const THEME_LIST = [
  { k: 'classic',  n: '经典', en: 'CLASSIC',  desc: '苹果设计系统 · 百搭耐看', bg: '#f2f2f7', fg: '#1d1d1f', accent: '#007aff', me: '#007aff', partner: '#ff9500', numFont: 'inherit', radius: '14px' },
  { k: 'onyx',     n: '曜石', en: 'ONYX',     desc: '黑金老钱 · 衬线数字',     bg: '#0b0a08', fg: '#ede4d3', accent: '#c9a961', me: '#c9a961', partner: '#b08d57', numFont: 'Georgia,"Times New Roman",serif', radius: '10px' },
  { k: 'creme',    n: '晨雾', en: 'CRÈME',    desc: '奶油陶橘 · 温柔大圆角',   bg: '#f7f1e9', fg: '#33261c', accent: '#d9724a', me: '#d9724a', partner: '#7f9db9', numFont: 'inherit', radius: '22px' },
  { k: 'midnight', n: '静蓝', en: 'MIDNIGHT', desc: '暗夜玻璃 · 电光青渐变',   bg: '#0a0e18', fg: '#e8edf6', accent: '#6ee7ff', me: '#6ee7ff', partner: '#a78bfa', numFont: 'inherit', radius: '16px' },
  { k: 'paper',    n: '纸感', en: 'PAPER',    desc: '瑞士排版 · 细黑线等宽数字', bg: '#f2efe9', fg: '#161513', accent: '#161513', me: '#c8401f', partner: '#161513', numFont: 'ui-monospace,"SF Mono",Menlo,monospace', radius: '0px' },
  { k: 'neon',     n: '霓虹', en: 'NEON',     desc: '克制赛博 · 紫青微光',     bg: '#050508', fg: '#eeeaff', accent: '#8b5cf6', me: '#22d3ee', partner: '#f472b6', numFont: 'ui-monospace,"SF Mono",Menlo,monospace', radius: '14px' },
  { k: 'sakura',   n: '樱粉', en: 'SAKURA',   desc: '日系温柔 · 梅粉圆点',   bg: '#faf3f4', fg: '#3d2530', accent: '#d6648e', me: '#d6648e', partner: '#7a9e9f', numFont: 'inherit', radius: '22px' },
  { k: 'matcha',   n: '抹茶', en: 'MATCHA',   desc: '京都茶室 · 和式小圆角', bg: '#f0f2e6', fg: '#2c3324', accent: '#7a8f4e', me: '#7a8f4e', partner: '#c4895b', numFont: 'inherit', radius: '8px' },
  { k: 'terra',    n: '赤陶', en: 'TERRA',    desc: '地中海陶土 · 暖沙色',   bg: '#f4ece4', fg: '#42302a', accent: '#bc5b3c', me: '#bc5b3c', partner: '#4e7d6b', numFont: 'inherit', radius: '12px' },
  { k: 'aurora',   n: '极光', en: 'AURORA',   desc: '深空黑 · 绿紫渐变数字', bg: '#07090f', fg: '#e4ecf5', accent: '#5adfc0', me: '#5adfc0', partner: '#b18cff', numFont: 'inherit', radius: '16px' },
  { k: 'glacier',  n: '冰川', en: 'GLACIER',  desc: '北欧冷调 · 钢蓝清爽',   bg: '#eef2f6', fg: '#22303c', accent: '#3a7ca5', me: '#3a7ca5', partner: '#e09f5a', numFont: 'inherit', radius: '14px' },
  { k: 'mocha',    n: '摩卡', en: 'MOCHA',    desc: '咖啡馆 · 焦糖衬线数字', bg: '#f2ebe3', fg: '#3a2d24', accent: '#a0673f', me: '#a0673f', partner: '#5f7f6a', numFont: 'Georgia,"Times New Roman",serif', radius: '20px' },
  { k: 'graphite', n: '石墨', en: 'GRAPHITE', desc: '工业极简 · 全灰阶一点橙', bg: '#e8e8ea', fg: '#1a1a1c', accent: '#e8590c', me: '#e8590c', partner: '#525258', numFont: 'inherit', radius: '6px' },
  { k: 'lilac',    n: '丁香', en: 'LILAC',    desc: '柔和紫罗兰 · 超大圆角', bg: '#f3f0fa', fg: '#322848', accent: '#7d5fd3', me: '#7d5fd3', partner: '#d3729e', numFont: 'inherit', radius: '24px' },
  { k: 'emerald',  n: '翡翠', en: 'EMERALD',  desc: '深绿赌场 · 金绿衬线',   bg: '#0a1f16', fg: '#e8f0e6', accent: '#50c98c', me: '#50c98c', partner: '#d4b06a', numFont: 'Georgia,"Times New Roman",serif', radius: '10px' },
  { k: 'mono',     n: '报刊', en: 'MONO',     desc: '衬线报刊 · 黑白砖红',   bg: '#f7f5f0', fg: '#141414', accent: '#141414', me: '#141414', partner: '#8a2b1e', numFont: 'Georgia,"Times New Roman",serif', radius: '0px' },
  { k: 'cyber',    n: '赛博', en: 'CYBER',     desc: '黑底霓虹青 · 数字会发光',  bg: '#030308', fg: '#d7fdf6', accent: '#00f0ff', me: '#00f0ff', partner: '#ff2d95', numFont: 'ui-monospace,"SF Mono",Menlo,monospace', radius: '8px' },
  { k: 'terminal', n: '终端', en: 'TERMINAL',  desc: '黑客帝国绿 · 全等宽字体',  bg: '#040804', fg: '#c8ffd9', accent: '#00ff88', me: '#00ff88', partner: '#ffd166', numFont: 'ui-monospace,"SF Mono",Menlo,monospace', radius: '2px' },
  { k: 'quantum',  n: '量子', en: 'QUANTUM',   desc: '深空电紫 · 光晕渐变',      bg: '#0a0614', fg: '#e6ddff', accent: '#a855f7', me: '#a855f7', partner: '#22d3ee', numFont: 'inherit', radius: '14px' },
  { k: 'linear',   n: '深邃', en: 'LINEAR',    desc: 'Linear 风 · 蓝紫微光边框',  bg: '#08090d', fg: '#e2e4ec', accent: '#7b8cff', me: '#7b8cff', partner: '#f2994a', numFont: 'inherit', radius: '12px' },
  { k: 'things',   n: '简白', en: 'THINGS',    desc: 'Things 3 风 · 超重白磁',    bg: '#ffffff', fg: '#1a1a1a', accent: '#2f6bff', me: '#2f6bff', partner: '#f5a623', numFont: 'inherit', radius: '18px' },
  { k: 'whoop',    n: '硬核', en: 'WHOOP',     desc: 'Whoop 风 · 纯黑荧光数据',   bg: '#000000', fg: '#f2f2f2', accent: '#d4ff3f', me: '#d4ff3f', partner: '#ff4d6d', numFont: 'ui-monospace,"SF Mono",Menlo,monospace', radius: '6px' },
  { k: 'arc',      n: '琉璃', en: 'ARC',       desc: 'Arc 风 · 彩虹渐变玻璃',     bg: '#101018', fg: '#f0ecff', accent: '#c084fc', me: '#c084fc', partner: '#5eead4', numFont: 'inherit', radius: '20px' },
];
const THEME_KEYS = THEME_LIST.map(t => t.k);
/* 旧版主题（V32 的 warm/mint/ocean/dark）平滑迁移到新风格 */
const THEME_MIGRATE = { warm: 'creme', mint: 'creme', ocean: 'midnight', dark: 'midnight' };

function applyTheme() {
  const t = state.ui && state.ui.theme;
  if (t && t !== 'classic') document.body.setAttribute('data-theme', t);
  else document.body.removeAttribute('data-theme');
  /* V58: 状态栏颜色跟随主题（PWA 高级感细节） */
  try {
    const th2 = THEME_LIST.find(function (x) { return x.k === (t || 'classic'); });
    if (th2) {
      document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) { m.setAttribute('content', th2.bg); });
    }
  } catch (e) {}
  /* V42: 身份色（Elio/Tina 的专属色）随主题走，图表和圆点才不跳戏 */
  const th = THEME_LIST.find(x => x.k === (t || 'classic'));
  if (th) COLORS = { me: th.me, partner: th.partner };
}

/* V42 每日轮换：开关打开时，每天第一次打开自动换下一套（手动选的风格当天起生效，次日继续轮） */
function rotateDailyTheme() {
  if (!state.ui || state.ui.themeRotate !== true) return;
  const tk = todayKey();
  if (state.ui.themeDate === tk) return; /* 今天已经换过 */
  const cur = state.ui.theme || 'classic';
  const i = THEME_KEYS.indexOf(cur);
  state.ui.theme = THEME_KEYS[(i + 1) % THEME_KEYS.length];
  state.ui.themeDate = tk;
  persist();
}

/* 按勾选的装备生成一周安排：力量隔天、有氧穿插、至少两个休息日 */
function generateWeekPlan() {
  const eq = (state.ui && state.ui.equip) || [];
  const has = k => eq.indexOf(k) > -1;
  /* 自定义条目（不在固定清单里的）直接当作力量动作候选，写什么用什么 */
  const customs = eq.filter(k => !EQUIP_LIST.some(e => e.k === k));
  const sPool = [];
  if (has('dumb')) sPool.push('哑铃力量 30 分钟');
  if (has('band')) sPool.push('弹力带力量 30 分钟');
  if (has('bar')) sPool.push('健身棒练胸 3 组×15 个');
  if (has('body')) sPool.push('徒手力量 30 分钟');
  customs.forEach(c => sPool.push(/[个组分钟]$/.test(c) ? c : c + ' 训练'));
  let strength = sPool.length ? sPool[0] : null;
  const daily = has('pushup') ? '俯卧撑 30 个' : null; /* 每天都做的动作，全周附加 */
  const cardios = [];
  if (has('tread')) cardios.push('跑步机快走 40 分钟');
  if (has('walk')) cardios.push('快走 40 分钟');
  if (has('run')) cardios.push('慢跑 30 分钟');
  if (has('jump')) cardios.push('跳绳 15 分钟×3 组');
  if (has('swim')) cardios.push('游泳 30 分钟');
  if (has('ride')) cardios.push('骑行 40 分钟');
  if (!cardios.length) cardios.push('快走 40 分钟');
  const soft = has('yoga') ? '瑜伽/垫上拉伸 20 分钟' : '拉伸散步';
  const withDaily = txt => {
    if (!daily) return txt;
    return txt === '休息' ? '休息 · ' + daily : txt + ' + ' + daily;
  };
  /* 模板：1力量 2休 3有氧 4休/拉伸 5力量 6有氧 7休 */
  const c0 = cardios[0], c1 = cardios[1] || cardios[0];
  return [
    withDaily(strength || c0),
    withDaily(soft),
    withDaily(c0),
    withDaily(strength ? soft : c1),
    withDaily(strength || c1),
    withDaily(strength ? c1 : (has('yoga') ? soft : c0)),
    withDaily('休息')
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
    if (typeof r.me === 'number' && typeof r.partner === 'number') {
      wt = '<span class="cal-w" style="color:' + COLORS.me + '">' + r.me.toFixed(1) + '</span>' +
           '<span class="cal-w" style="color:' + COLORS.partner + '">' + r.partner.toFixed(1) + '</span>';
    } else if (typeof r.me === 'number') {
      wt = '<span class="cal-w" style="color:' + COLORS.me + '">' + r.me.toFixed(1) + '</span>';
    } else if (typeof r.partner === 'number') {
      wt = '<span class="cal-w" style="color:' + COLORS.partner + '">' + r.partner.toFixed(1) + '</span>';
    }
    cells += '<span class="' + cls + '"><span class="cal-d">' + d + '</span>' + (wt || '<span class="cal-dots">' + dots + '</span>') + '</span>';
  }
  return '<div class="mini-cal">' +
    '<div class="cal-week">' + ['日','一','二','三','四','五','六'].map(w => '<span>' + w + '</span>').join('') + '</div>' +
    '<div class="cal-grid">' + cells + '</div>' +
  '</div>';
}

/* 每周减脂安排卡（V31）：减脂三分练七分吃，动起来代谢才不掉 */
/* 每周减脂安排（V63）：摘要组件条，点击进编辑器 */
function weekPlanHTML() {
  const plan = weekPlanArr();
  const now = new Date();
  const todayDow = (now.getDay() + 6) % 7; /* 0=周一 */
  const trainDays = plan.filter(t => t !== '休息').length;
  return '<button class="card wp-pill" data-action="plan-day" data-dow="' + todayDow + '">' +
    '<span class="wp-pill-main"><b>今天 · ' + esc(plan[todayDow]) + '</b>' +
    '<span>本周训练 ' + trainDays + ' 天 · 点这里改安排</span></span><i>›</i></button>';
}

function bindFoldToggle(root) {
  if (!root) return;
  root.querySelectorAll('.card[data-fc]').forEach(function (card) {
    const label = card.querySelector(':scope > .card-label');
    const body = card.querySelector(':scope > .sg-body');
    if (!label || !body || label.dataset.fcBound) return;
    label.dataset.fcBound = '1';
    label.style.cursor = 'pointer';
    const ar = document.createElement('span');
    ar.className = 'sg-arrow';
    ar.textContent = '展开';
    ar.style.cssText = 'float:right;font-size:12px;font-weight:400;color:var(--muted,#98A2B3)';
    label.appendChild(ar);
    body.style.display = 'none';
    label.addEventListener('click', function () {
      const open = body.style.display === 'none';
      body.style.display = open ? '' : 'none';
      ar.textContent = open ? '收起' : '展开';
    });
  });
}

function renderPlanSheet() {
  const body = document.getElementById('plan-body');
  if (!body) return;
  if (equipAddMode) {
    /* 添加自定义器械/运动（V37） */
    document.getElementById('plan-sheet-title').textContent = '添加自定义器械 / 运动';
    body.innerHTML =
      '<p class="set-lab">写上它的名字（14 字内）</p>' +
      '<div class="custom-row"><input class="text-input" id="equip-input" maxlength="14" placeholder="如：健身棒 / 健身环 / 跳绳垫">' +
      '<button class="btn" data-action="equip-save">保存</button></div>' +
      '<p class="set-tip">保存后回到设置页勾上它，周计划就会用它排 · 例：健身棒 → 力量日变「健身棒练胸」</p>';
    return;
  }
  if (planEditDow < 0) return;
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
    '<p class="set-lab">或者自己写一个</p>' +
    '<div class="custom-row"><input class="text-input" id="plan-custom-input" maxlength="20" placeholder="如：健身棒练胸 3 组×15 个">' +
    '<button class="btn" data-action="plan-pick-custom">保存</button></div>' +
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
/* V67: 主题速切（首页调色板按钮直达） */
/* V72: 主题分组——旗舰置顶，其余按明暗归类 */
const THEME_GROUPS = [
  { name: '旗舰 · 设计语言最完整', keys: ['aurora', 'onyx', 'creme', 'linear'] },
  { name: '暗夜系', keys: ['midnight', 'cyber', 'quantum', 'arc', 'terminal', 'whoop', 'neon'] },
  { name: '晨光系', keys: ['classic', 'things', 'paper', 'mono', 'graphite'] },
  { name: '趣味系', keys: ['sakura', 'matcha', 'glacier', 'lilac', 'emerald', 'terra', 'mocha'] }
];
function themeGroupedHTML() {
  const cur = state.ui.theme || 'classic';
  const used = {};
  return THEME_GROUPS.map(function (g) {
    const tiles = g.keys.filter(function (k) { const t = THEME_LIST.find(function (x) { return x.k === k; }); if (!t) return false; used[k] = 1; return true; }).map(function (k) {
      const t = THEME_LIST.find(function (x) { return x.k === k; });
      const on = cur === t.k;
      return '<button class="theme-tile' + (on ? ' on' : '') + '" data-action="set-theme" data-v="' + t.k + '" style="background:' + t.bg + ';color:' + t.fg + ';border-radius:' + (t.radius === '0px' ? '0' : '16px') + '">' +
        '<span class="tt-num" style="font-family:' + t.numFont + ';color:' + t.accent + '">72.5</span>' +
        '<svg class="tt-spark" viewBox="0 0 100 26" preserveAspectRatio="none"><path d="M0 20 L12 17 L24 18 L36 12 L48 13 L60 8 L72 9 L84 5 L100 4" fill="none" stroke="' + t.accent + '" stroke-width="2" stroke-linecap="round"/></svg>' +
        '<span class="tt-name">' + t.n + '</span>' +
        '<span class="tt-en" style="color:' + t.accent + '">' + t.en + '</span>' +
        '<span class="tt-desc" style="color:' + t.fg + ';opacity:.55">' + t.desc + '</span>' +
        (on ? '<span class="tt-check">\u2713</span>' : '') +
      '</button>';
    }).join('');
    if (!tiles) return '';
    return '<p class="tg-name">' + g.name + '</p><div class="theme-grid">' + tiles + '</div>';
  }).join('') +
  THEME_LIST.filter(function (t) { return !used[t.k]; }).map(function (t) {
    const on = cur === t.k;
    return '<button class="theme-tile' + (on ? ' on' : '') + '" data-action="set-theme" data-v="' + t.k + '" style="background:' + t.bg + ';color:' + t.fg + ';border-radius:' + (t.radius === '0px' ? '0' : '16px') + '">' +
      '<span class="tt-num" style="font-family:' + t.numFont + ';color:' + t.accent + '">72.5</span>' +
      '<svg class="tt-spark" viewBox="0 0 100 26" preserveAspectRatio="none"><path d="M0 20 L12 17 L24 18 L36 12 L48 13 L60 8 L72 9 L84 5 L100 4" fill="none" stroke="' + t.accent + '" stroke-width="2" stroke-linecap="round"/></svg>' +
      '<span class="tt-name">' + t.n + '</span>' +
      '<span class="tt-en" style="color:' + t.accent + '">' + t.en + '</span>' +
      '<span class="tt-desc" style="color:' + t.fg + ';opacity:.55">' + t.desc + '</span>' +
      (on ? '<span class="tt-check">\u2713</span>' : '') +
    '</button>';
  }).join('');
}
function openThemeSheet() {
  const el = document.getElementById('widget-sheet');
  document.getElementById('widget-sheet-title').textContent = '换个风格';
  document.getElementById('widget-body').innerHTML =
    '<p class="sub">点一下立即换 · 字体、圆角、光效整套变，数据不受任何影响</p>' +
    themeGroupedHTML();
  el.classList.add('show');
  document.getElementById('sheet-mask').classList.add('show');
}

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
      '<h3 class="card-label">设计风格 · 每天换一个心情</h3>' +
      '<div class="theme-grid">' +
        THEME_LIST.map(function (t) {
          const on = (state.ui.theme || 'classic') === t.k;
          return '<button class="theme-tile' + (on ? ' on' : '') + '" data-action="set-theme" data-v="' + t.k + '" style="background:' + t.bg + ';color:' + t.fg + ';border-radius:' + (t.radius === '0px' ? '0' : '16px') + '">' +
            '<span class="tt-num" style="font-family:' + t.numFont + ';color:' + t.accent + '">72.5</span>' +
'<svg class="tt-spark" viewBox="0 0 100 26" preserveAspectRatio="none">' +
            '<path d="M0 20 L12 17 L24 18 L36 12 L48 13 L60 8 L72 9 L84 5 L100 4" fill="none" stroke="' + t.accent + '" stroke-width="2" stroke-linecap="round"/>' +
          '</svg>' +
            '<span class="tt-name">' + t.n + '</span>' +
            '<span class="tt-en" style="color:' + t.accent + '">' + t.en + '</span>' +
            '<span class="tt-desc" style="color:' + t.fg + ';opacity:.55">' + t.desc + '</span>' +
            (on ? '<span class="tt-check">\u2713</span>' : '') +
          '</button>';
        }).join('') +
      '</div>' +
      '<button class="rotate-row" data-action="toggle-theme-rotate">' +
        '<span class="rr-text"><b>每天自动换一套</b><small>每天第一次打开时轮到下一套风格，手动选的当天会保留</small></span>' +
        '<span class="rr-switch' + (state.ui.themeRotate ? ' on' : '') + '">' + (state.ui.themeRotate ? '开' : '关') + '</span>' +
      '</button>' +
      '<p class="set-tip">六套都是完整设计语言——字体、圆角、光效各不相同 · 选完立即生效，不影响任何数据</p>' +
    '</div>' +
    '<div class="card">' +
      '<h3 class="card-label">我的运动与器械</h3>' +
      '<p class="sub">勾上你会做的和家里有的，周计划按这个排</p>' +
      '<div class="equip-grid">' +
        EQUIP_LIST.map(t =>
          '<button class="set-chip' + ((state.ui.equip || []).indexOf(t.k) > -1 ? ' on' : '') + '" data-action="toggle-equip" data-v="' + t.k + '">' +
          ((state.ui.equip || []).indexOf(t.k) > -1 ? '✓ ' : '') + t.n + '</button>'
        ).join('') +
        ((state.ui.equip || []).filter(x => !EQUIP_LIST.some(e => e.k === x)).map(x =>
          '<button class="set-chip on" data-action="toggle-equip" data-v="' + x + '">✓ ' + esc(x) + '</button>'
        ).join('')) +
        '<button class="set-chip equip-add" data-action="equip-add">＋ 自定义</button>' +
      '</div>' +
      '<button class="btn sm" data-action="regen-plan">按我的器械重排周计划</button>' +
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
        '<div class="settings-btns"><button class="btn" data-action="cloud-sync">立即同步</button><button class="btn ghost sm" data-action="cloud-restore">从云端恢复</button></div>' +
        migrateGuideHTML() +
        '<button class="btn danger sm" data-action="cloud-off">关闭自动云备份</button>' +
      '</div>'
      : '<div class="card">' +
        '<h3 class="card-label">自动云备份</h3>' +
        '<p class="sub">开通后数据自动上云，永不用手动备份。推荐用 Gitee 私人令牌（国内网络稳定）。粘贴令牌：</p>' +
        '<textarea class="json-area cloud-area" placeholder="粘贴配置链接或授权码" spellcheck="false"></textarea>' +
        '<button class="btn" data-action="cloud-setup">开通自动云备份</button>' +
        migrateGuideHTML() +
        '<p class="s-dim" id="cloud-diag" style="display:none;margin-top:10px;color:#b91c1c;word-break:break-all">' + esc(diagFromStorage()) + '</p>' +
      '</div>') +
    ('<div class="card">' +
      '<h3 class="card-label">双人同步 · 她用她的手机记</h3>' +
      '<div class="key-line">✓ 各记各的，云端自动合并 —— 你打开 App 就能看到她的最新记录</div>' +
      '<p class="sub">云端仓库和钥匙都在你的 GitHub 账号里：给她另发一把钥匙，随时可以作废——控制权永远在你手上。</p>' +
      '<button class="btn sm" data-action="copy-app-link">📋 把 App 链接发给她</button>' +
      '<div class="divider">这台手机默认记谁（快捷指令记录用）</div>' +
      '<div class="settings-btns">' +
        PERSON_IDS.map(p => '<button class="btn ' + (deviceOwner() === p ? '' : 'ghost') + '" data-action="set-owner-' + p + '">' + esc(state.names[p]) + (deviceOwner() === p ? ' ✓' : '') + '</button>').join('') +
      '</div>' +
      '<p class="s-dim" style="margin-top:10px">她的安装三步：① Safari 打开这个网址 ② 点分享 → 添加到主屏幕 ③ 在她的 App「设置 → 自动云备份」里粘贴你发给她的钥匙（去你的 GitHub 账号再生成一把新钥匙发她，方法和你当初配置一样；同一仓库，谁记的标谁的名字）。</p>' +
      (ghConf ? '' : '<p class="set-tip" style="color:#b45309">她的第一步：先在下方「自动云备份」卡开通云备份，钥匙就在那张卡里配置——建议你在 GitHub 上另生成一把新钥匙发给她，和你自己那把分开，随时可作废。</p>') +
    '</div>') +
    
    '<div class="card">' +
      '<h3 class="card-label">手动备份 · 不依赖网络</h3>' +
      '<div class="key-line">把数据变成一段文字，发到微信存着，随存随恢复</div>' +
      '<button class="btn" data-action="backup-now">一键备份（弹出分享面板）</button>' +
      '<button class="btn ghost sm" data-action="copy-link">复制存档链接</button>' +
      '<div class="divider">数据工具已搬家</div>' +
      '<p class="sub" style="margin:4px 0 0">合并导入 / CSV 导出搬到了底部「工具」板块</p>' +
      '<div class="divider">恢复数据 · 粘贴进来，点一下就导入</div>' +
      '<textarea class="import-area json-area" placeholder="粘贴备份文本或存档链接" spellcheck="false"></textarea>' +
      '<button class="btn sm" data-action="import-backup">导入并覆盖</button>' +
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
      '<button class="btn sm" data-action="save-heights" style="margin-top:8px">保存身高</button>' +
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
  regroupSettings();
  foldSettings();
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

/* ================= V54 功能全家桶 ================= */

/* 本机身份：这台手机主要记谁（快捷指令记录用） */
function deviceOwner() {
  try { return localStorage.getItem('wt_device_owner') === 'partner' ? 'partner' : 'me'; } catch (e) { return 'me'; }
}
function setDeviceOwner(p) {
  try { localStorage.setItem('wt_device_owner', p); } catch (e) {}
  renderSettings();
  toast('这台手机默认记 ' + state.names[p] + ' 的体重');
}

/* 深链一键记录：?quick=72.5 或 #q=72.5 → 记到本机身份今天（不覆盖已有） */
function handleQuickRecord() {
  let v = null;
  try {
    const q = new URLSearchParams(location.search);
    v = q.get('quick');
    if (!v && location.hash && location.hash.indexOf('#q=') === 0) v = decodeURIComponent(location.hash.slice(3));
  } catch (e) { return; }
  if (!v) return;
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
  const n = Number(v);
  if (!isFinite(n) || n < 20 || n > 300) { toast('快捷记录失败：' + v + ' 不是有效体重'); return; }
  const p = deviceOwner(), k = todayKey();
  if (typeof (state.records[k] || {})[p] === 'number') {
    toast('今天已记过 ' + state.records[k][p].toFixed(1) + ' kg，没有覆盖——要改在记录页改');
    return;
  }
  state.records[k] = state.records[k] || {};
  state.records[k][p] = Math.round(n * 10) / 10;
  persist();
  renderAll();
  toast('✓ 已记录 ' + state.records[k][p].toFixed(1) + ' kg（' + state.names[p] + ' · 今天）');
}

/* 合并导入：微信中转兜底——只补不删 */
function importMerge() {
  const areas = [...document.querySelectorAll('.merge-area'), ...document.querySelectorAll('.import-area')];
  const area = areas.find(a => a.value.trim());
  if (!area) { toast('先把她发的备份文本粘贴到上面的框里'); return; }
  let txt = area.value.trim();
  const m = txt.match(/#r=([A-Za-z0-9+/=%]{8,})/);
  if (m) {
    try { txt = decodeURIComponent(escape(atob(m[1].replace(/%3D/gi, '=')))); } catch (e) { toast('存档链接数据无效'); return; }
  }
  const remote = parseBackupText(txt);
  if (!remote) { toast('内容不是有效的备份数据'); return; }
  const added = mergeRemoteIntoState(remote);
  if (!added) { toast('她的数据你都已经有了，无需合并'); return; }
  persist();
  scheduleCloudBackup();
  renderAll();
  area.value = '';
  toast('✓ 已合并 ' + added + ' 条新记录（你原有的数据一条没动）');
}

/* CSV 导出 */
function exportCSV() {
  const cols = [['me_waist', '腰围cm'], ['partner_waist', '腰围cm'], ['me_bf', '体脂%'], ['partner_bf', '体脂%'], ['me_vf', '内脏脂肪'], ['partner_vf', '内脏脂肪']];
  let head = '日期,' + PERSON_IDS.map(p => state.names[p] + '体重kg,' + state.names[p]).join(',');
  head = '日期,' + PERSON_IDS.map(p => state.names[p] + '体重kg,' + state.names[p] + '腰围cm,' + state.names[p] + '体脂%').join(',') + ',备注';
  const rows = sortedKeys().map(k => {
    const r = state.records[k];
    const cell = p => [r[p], r[p + '_waist'], r[p + '_bf']].map(x => typeof x === 'number' ? x : '');
    const vals = PERSON_IDS.map(cell);
    return k + ',' + vals.map(a => a.join(',')).join(',') + ',"' + (r.note || '').replace(/"/g, '""') + '"';
  });
  const csv = '\ufeff' + head + '\n' + rows.join('\n');
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = '体重记录_' + todayKey() + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    toast('✓ 已导出 ' + rows.length + ' 天记录（CSV 表格）');
  } catch (e) { toast('导出失败，试试一键备份文字版'); }
}

/* 趋势预测 + 平台期（每放一行：预测一句 + 平台期一句） */
function recentWindow(p, days) {
  const from = dateKey(addDays(new Date(), -days));
  return sortedKeys().filter(k => k >= from && typeof state.records[k][p] === 'number').map(k => ({ k, v: state.records[k][p] }));
}
function forecastRowHTML(p) {
  const pts = recentWindow(p, 14);
  const bits = [];
  /* 趋势预测 */
  const goal = state.goals && typeof state.goals[p] === 'number' ? state.goals[p] : null;
  const lk = lastKeyOf(p);
  if (lk && goal) {
    const cur = state.records[lk][p];
    if (cur <= goal) {
      bits.push('<b>' + esc(state.names[p]) + '</b>：最新 ' + cur.toFixed(1) + '，已在目标 ' + goal.toFixed(1) + ' 以内——维持就是胜利');
    } else if (pts.length >= 5 && (parseKey(pts[pts.length - 1].k) - parseKey(pts[0].k)) >= 3 * 86400000) {
      const spanD = (parseKey(pts[pts.length - 1].k) - parseKey(pts[0].k)) / 86400000;
      const rate = (pts[pts.length - 1].v - pts[0].v) / spanD; /* kg/天 */
      if (rate < -0.007) {
        const days = Math.ceil((cur - goal) / (-rate));
        const eta = addDays(new Date(), days);
        bits.push('<b>' + esc(state.names[p]) + '</b>：按最近 14 天速度（↓' + (rate * 7).toFixed(1) + ' kg/周），预计 <b>' + (eta.getMonth() + 1) + '月' + eta.getDate() + '日</b> 到 ' + goal.toFixed(1) + '（还差 ' + (cur - goal).toFixed(1) + ' kg，约 ' + days + ' 天）');
      } else {
        bits.push('<b>' + esc(state.names[p]) + '</b>：最近 14 天没有下降趋势（' + (rate >= 0 ? '↑' : '±') + Math.abs(rate * 7).toFixed(1) + ' kg/周），距目标 ' + (cur - goal).toFixed(1) + ' kg——先稳住吃和动，趋势有了日期自然来');
      }
    } else {
      bits.push('<b>' + esc(state.names[p]) + '</b>：最近 14 天记录还不足 5 天，攒一攒就能预测到 ' + goal.toFixed(1) + ' 的日期');
    }
  }
  /* 平台期 */
  const w10 = recentWindow(p, 10);
  if (w10.length >= 6) {
    const vs = w10.map(x => x.v);
    const range = Math.max.apply(null, vs) - Math.min.apply(null, vs);
    const drift = Math.abs(vs[vs.length - 1] - vs[0]);
    if (range <= 0.6 && drift <= 0.4) {
      bits.push('<b>' + esc(state.names[p]) + '</b> 平台期中：最近 10 天在 ' + Math.min.apply(null, vs).toFixed(1) + '~' + Math.max.apply(null, vs).toFixed(1) + ' 之间小幅波动——身体的适应期，正常现象，继续就好');
    }
  }
  return bits.map(b => '<div style="font-size:13px;line-height:1.6;padding:6px 0;border-bottom:1px solid rgba(128,128,128,.14)">' + b + '</div>').join('');
}

/* 周对决：本周谁更稳（极差对比） */
function weekDuelHTML() {
  const ws = dateKey(addDays(weekStartOf(new Date()), 0)), we = dateKey(addDays(weekStartOf(new Date()), 6));
  const pts = PERSON_IDS.map(p => {
    const arr = sortedKeys().filter(k => k >= ws && k <= we && typeof state.records[k][p] === 'number').map(k => state.records[k][p]);
    return { p, n: arr.length, range: arr.length >= 3 ? Math.max.apply(null, arr) - Math.min.apply(null, arr) : null };
  });
  const a = pts[0], b = pts[1];
  if (!a || !b || !a.range || !b.range) return '';
  if (Math.abs(a.range - b.range) < 0.15) return '<div class="card-foot">本周稳度打平：' + esc(state.names.me) + ' 波动 ' + a.range.toFixed(1) + '，' + esc(state.names.partner) + ' 波动 ' + b.range.toFixed(1) + '——半斤八两，一起稳</div>';
  const steady = a.range < b.range ? a : b, wild = a.range < b.range ? b : a;
  return '<div class="card-foot">本周 <b>' + esc(state.names[steady.p]) + '</b> 的趋势更稳（波动 ' + steady.range.toFixed(1) + ' vs ' + esc(state.names[wild.p]) + ' 的 ' + wild.range.toFixed(1) + '）</div>';
}

/* 年度回顾 */
function yearReviewHTML() {
  const y = todayKey().slice(0, 4);
  const yKeys = sortedKeys().filter(k => k.slice(0, 4) === y);
  if (yKeys.length < 3) return '';
  let best = 0, run = 0, prev = null;
  yKeys.forEach(k => { run = (prev && parseKey(k) - parseKey(prev) === 86400000) ? run + 1 : 1; if (run > best) best = run; prev = k; });
  const rows = PERSON_IDS.map(p => {
    const arr = yKeys.filter(k => typeof state.records[k][p] === 'number');
    if (arr.length < 2) return '';
    const first = state.records[arr[0]][p], last = state.records[arr[arr.length - 1]][p];
    const d = last - first;
    return '<div class="rv-row"><span class="rv-name"><i class="dotc" style="background:' + COLORS[p] + '"></i>' + esc(state.names[p]) + '</span>' +
      '<div class="rv-body"><div>' + arr[0].slice(5).replace('-', '/') + ' ' + first.toFixed(1) + ' → ' + arr[arr.length - 1].slice(5).replace('-', '/') + ' ' + last.toFixed(1) + ' kg，' +
      (Math.abs(d) < 0.05 ? '持平' : (d < 0 ? '共瘦 ' : '共涨 ') + Math.abs(d).toFixed(1) + ' kg') + '</div></div></div>';
  }).join('');
  return '<div class="card"><h3 class="card-label">' + y + ' 年度回顾 · 至今</h3>' +
    '<p class="sub">今年 1 月 1 日以来的第一笔 → 最新一笔 · 每个数字自带日期</p>' + rows +
    '<div class="card-foot">今年共同记录 ' + yKeys.length + ' 天 · 最长连续 ' + best + ' 天没断 · 这些数字年底会越来越好看</div></div>';
}

/* ================= 工具页（V55：新功能集合地） ================= */
/* 动作详情（V62：渲染进 widget-sheet，iframe 懒加载） */
function openGymSheet(id, back) {
  const m = GYM_MOVES.find(x => x.id === id);
  if (!m) return;
  widgetBack = back || (curWidget === 'gym-plan' ? 'gym-plan' : 'gym-lib');
  const sheetTitle = document.getElementById('widget-sheet-title');
  if (!sheetTitle) return;
  sheetTitle.textContent = m.n;
  const body = document.getElementById('widget-body');
  body.innerHTML =
    '<div class="gym-meta"><span class="set-chip on">' + m.grp + '</span><span class="set-chip">' + m.sets + '</span>' +
    (m.rest ? '<span class="set-chip">' + m.rest + '</span>' : '') + '</div>' +
    '<div class="gym-video"><iframe src="https://player.bilibili.com/player.html?bvid=' + m.bv + '&autoplay=0&danmaku=0" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" title="' + esc(m.n) + ' 标准动作教学"></iframe></div>' +
    '<p class="sub">教学来源：B 站 · ' + esc(m.by) + ' · 已人工核对为标准动作教学</p>' +
    '<div class="divider">动作要点 · 做对比做多重要</div>' +
    '<div class="gym-tips">' + m.tips.map(t => '<div class="gym-tip"><i class="dotc" style="background:' + COLORS.me + '"></i>' + t + '</div>').join('') + '</div>' +
    '<a class="btn ghost sm" href="https://www.bilibili.com/video/' + m.bv + '" target="_blank" rel="noopener" style="width:auto;display:inline-block;padding:9px 14px;font-size:13px;text-decoration:none;margin-top:10px">卡了？去 B 站 App 看原视频 ↗</a>';
  const bk = WIDGETS.find(x => x.id === widgetBack);
  const backBtn = document.createElement('button');
  backBtn.className = 'btn ghost sm';
  backBtn.setAttribute('data-action', 'widget-back');
  backBtn.style.cssText = 'width:auto;display:inline-block;padding:7px 12px;font-size:12px;margin-bottom:10px';
  backBtn.textContent = '‹ 返回' + (bk ? bk.t : '健身');
  body.insertBefore(backBtn, body.firstChild);
}


/* ============ 娱乐板块（V87）：黄历·星座·生肖 ============
   数据可信度声明（写进页面）：干支纪日/建除十二神/黄黑道/彭祖百忌为钦天监《协纪辨方书》体系，
   纯历法推算，日柱经 1949-10-01 甲子锚点校准，精确可靠；干支纪月按节气平均日近似（边界日±1天）；
   星座/生肖为通行占星与民俗档案；不生成虚构运势数字。 */
const GZ10 = '甲乙丙丁戊己庚辛壬癸', DZ12 = '子丑寅卯辰巳午未申酉戌亥';
const SX12 = '鼠牛虎兔龙蛇马羊猴鸡狗猪';
function jdFromDate(y, m, d) {
  const a = Math.floor((14 - m) / 12), y2 = y + 4800 - a, m2 = m + 12 * a - 3;
  return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
}
function dayGZ(k) {
  const p = parseKey(k);
  const jdn = jdFromDate(p.getFullYear(), p.getMonth() + 1, p.getDate());
  const idx = ((jdn - 2433191) % 60 + 60) % 60; /* 1949-10-01 = 甲子日锚点 */
  return { gz: GZ10[idx % 10] + DZ12[idx % 12], zhi: idx % 12, gan: idx % 10 };
}
function yearGZ(y) { return GZ10[(y - 4) % 10] + DZ12[(y - 4) % 12]; } /* 立春界，2/4近似 */
function monthZhi(y, m, d) { /* 12节定月支：小寒1/6丑 立春2/4寅 惊蛰3/6卯 清明4/5辰 立夏5/6巳 芒种6/6午 小暑7/7未 立秋8/8申 白露9/8酉 寒露10/8戌 立冬11/7亥 大雪12/7子 */
  const seg = [[1,6,1],[2,4,2],[3,6,3],[4,5,4],[5,6,5],[6,6,6],[7,7,7],[8,8,8],[9,8,9],[10,8,10],[11,7,11],[12,7,0]];
  let z = 11; /* 大雪后→子月 */
  for (let i = 0; i < seg.length; i++) {
    if (m > seg[i][0] || (m === seg[i][0] && d >= seg[i][1])) z = seg[i][2];
  }
  return z;
}
const JIANCHU = ['建','除','满','平','定','执','破','危','成','收','开','闭'];
const JC_TABLE = [
  { yi: '会友出行·上任立券', ji: '动土开仓' },
  { yi: '沐浴清洁·求医除旧', ji: '开业嫁娶' },
  { yi: '祭祀祈福·结亲', ji: '服药安葬' },
  { yi: '修整治道·诸事平平', ji: '词讼口角' },
  { yi: '订盟纳采·签约安床', ji: '诉讼远行' },
  { yi: '捕捉立券·专注攻坚', ji: '搬迁开业' },
  { yi: '拆卸破旧·求医问病', ji: '嫁娶开业出行' },
  { yi: '安床置物·稳字当头', ji: '登高冒险' },
  { yi: '开业签约·嫁娶入宅（大吉日）', ji: '词讼' },
  { yi: '纳财收账·入学盘点', ji: '安葬行丧' },
  { yi: '开业开工·搬家问医（百事吉）', ji: '安葬' },
  { yi: '安葬修坟·收尾封存', ji: '开业出行' }
];
const HUANGDAO = [0,1,4,5,7,10]; /* 青龙0 明堂1 金匮4 天德5 玉堂7 司命10 为黄道 */
const QD12 = ['青龙','明堂','天刑','朱雀','金匮','天德','白虎','玉堂','天牢','玄武','司命','勾陈'];
const QD_START = { 0: 8, 1: 10, 2: 0, 3: 2, 4: 4, 5: 6, 6: 8, 7: 10, 8: 0, 9: 2, 10: 4, 11: 6 }; /* 月支/日支→青龙起支：(z*2+8)%12，协纪辨方书起例 */
const PG_GAN_BAI = ['今天别开仓出货，容易破财','今天别种花栽树，难活','今天别动厨房灶台','今天别剃头','今天别买地置产','今天别签合同，容易两败俱伤','今天别赶工开新线','今天别腌制发酵东西','今天别放水开渠，防出岔子','今天别打官司，理亏难赢'];
const PG_ZHI_BAI = ['今天别求签问卜，自寻烦恼','今天别正装赴宴远行','今天别祭拜','今天别打井挖泉','今天别大悲大哭','今天别出远门，管好财物','今天别盖屋顶动房顶','今天别乱吃药','今天别安新床','今天别宴请贪杯','今天别吃狗肉','今天别办婚事'];
const PG_GAN = ['甲不开仓财物耗散','乙不栽植千株不长','丙不修灶必见灾殃','丁不剃头头必生疮','戊不受田田主不祥','己不破券二比并亡','庚不经络织机虚张','辛不合酱主人不尝','壬不泱水更难提防','癸不词讼理弱敌强'];
const PG_ZHI = ['子不问卜自惹祸殃','丑不冠带主不还乡','寅不祭祀神鬼不尝','卯不穿井水泉不香','辰不哭泣必主重丧','巳不远行财物伏藏','午不苫盖屋主更张','未不服药毒气入肠','申不安床鬼祟入房','酉不会客醉坐颠狂','戌不吃犬作怪上床','亥不嫁娶不利新郎'];
function dayAstro(k) {
  const p = parseKey(k);
  const g = dayGZ(k);
  const y = p.getFullYear(), mo = p.getMonth() + 1, dd = p.getDate();
  const yy = (mo < 2 || (mo === 2 && dd < 4)) ? y - 1 : y; /* 立春界 */
  const yGan = (yy - 4) % 10;
  const mz = monthZhi(y, mo, dd);
  const mGanIdx = (yGan * 2 + 2 + (mz - 2) + 20) % 10; /* 五虎遁：甲己丙作首 */
  const jcIdx = ((g.zhi - mz) % 12 + 12) % 12;
  const qdIdx = ((g.zhi - QD_START[mz]) % 12 + 12) % 12;
  const isHuang = HUANGDAO.indexOf(qdIdx) > -1;
  const chong = (g.zhi + 6) % 12;
  return {
    gz: g.gz, gan: g.gan, zhi: g.zhi, mz: mz,
    jc: JIANCHU[jcIdx], jcIdx: jcIdx,
    qd: QD12[qdIdx], isHuang: isHuang,
    yi: JC_TABLE[jcIdx].yi, ji: JC_TABLE[jcIdx].ji,
    chong: '冲' + SX12[chong] + '（' + DZ12[chong] + '）',
    peng: PG_GAN[g.gan] + '，' + PG_ZHI[g.zhi],
    yg: GZ10[yGan] + DZ12[(yy - 4) % 12] + '年 · ' + GZ10[mGanIdx] + DZ12[mz] + '月 · ' + g.gz + '日'
  };
}
/* 星座档案（通行占星） */
const XINGZUO = [
  { n: '白羊座', r: '3.21-4.19', e: '火象', star: '火星', tag: '冲锋·直接·来劲', tip: '今天适合把拖着的事一口气管掉', mate: '狮子·射手' },
  { n: '金牛座', r: '4.20-5.20', e: '土象', star: '金星', tag: '稳当·务实·能囤', tip: '今天适合整理钱包和存钱计划', mate: '处女·摩羯' },
  { n: '双子座', r: '5.21-6.21', e: '风象', star: '水星', tag: '机灵·话多·点子王', tip: '今天适合聊事情谈合作，脑子转得快', mate: '天秤·水瓶' },
  { n: '巨蟹座', r: '6.22-7.22', e: '水象', star: '月亮', tag: '顾家·心软·记得住事', tip: '今天适合给家里人打个电话', mate: '天蝎·双鱼' },
  { n: '狮子座', r: '7.23-8.22', e: '火象', star: '太阳', tag: '大方·要面子·能带人', tip: '今天适合站出来拍板拿主意', mate: '白羊·射手' },
  { n: '处女座', r: '8.23-9.22', e: '土象', star: '水星', tag: '较真·细节控·靠谱', tip: '今天适合做清单和复盘', mate: '金牛·摩羯' },
  { n: '天秤座', r: '9.23-10.23', e: '风象', star: '金星', tag: '好看·会平衡·人缘好', tip: '今天适合社交、拍照、把选择列成两项再挑', mate: '双子·水瓶' },
  { n: '天蝎座', r: '10.24-11.22', e: '水象', star: '冥王星', tag: '专一·藏得深·狠得下心', tip: '今天适合一个人专心做事', mate: '巨蟹·双鱼' },
  { n: '射手座', r: '11.23-12.21', e: '火象', star: '木星', tag: '爱自由·乐观·直给', tip: '今天适合出门走走换换脑子', mate: '白羊·狮子' },
  { n: '摩羯座', r: '12.22-1.19', e: '土象', star: '土星', tag: '能熬·目标感·大器晚成', tip: '今天适合啃硬骨头干正事', mate: '金牛·处女' },
  { n: '水瓶座', r: '1.20-2.18', e: '风象', star: '天王星', tag: '独立·怪点子·不跟风', tip: '今天适合试试没走过的路子', mate: '双子·天秤' },
  { n: '双鱼座', r: '2.19-3.20', e: '水象', star: '海王星', tag: '感性·共情·脑洞大', tip: '今天适合听歌画画放空', mate: '巨蟹·天蝎' }
];

/* ===== 星座板块全量数据（V89，对齐 TA 工作台） ===== */
const XZ_FULL = [
  { n: '白羊座', en: 'ARIES', emoji: '♈', r: '3.21-4.19', star: '火星', starD: '火星·行动与冲劲之星', el: '火象', elD: '火象·行动与热情', mode: '基本宫', modeD: '开创·行动力强', kw: ['精力充沛','行动第一','直来直去','天生的先锋','性子急','三分钟热度','好胜心强','吃软不吃硬'], color: '大红色', gem: '钻石', flower: '郁金香', sun: '太阳落在白羊座：天生带头冲锋的人，想到就干，最烦磨叽。热情藏不住，是你的点火器也是你的灭火器。', con: '标志性矛盾：想要第一又懒得等节奏；冲动上头之后常为收尾头疼。', grow: '核心成长课题：学会等一等，把冲劲变成持久力。' },
  { n: '金牛座', en: 'TAURUS', emoji: '♉', r: '4.20-5.20', star: '金星', starD: '金星·爱与美之星', el: '土象', elD: '土象·务实与积累', mode: '固定宫', modeD: '固定·稳字当头', kw: ['踏实可靠','能攒会存','审美在线','说到做到','慢性子','认定了不改','爱美食','不爱变动'], color: '森林绿', gem: '翡翠', flower: '康乃馨', sun: '太阳落在金牛座：最稳的那一个，钱和安全感都攥在自己手里才踏实。对好吃的、好用的有天生的鉴赏力。', con: '标志性矛盾：求稳和怕错过新机会在打架；嘴上说不改，心里在算账。', grow: '核心成长课题：允许一点变化进来，稳是底子不是墙。' },
  { n: '双子座', en: 'GEMINI', emoji: '♊', r: '5.21-6.21', star: '水星', starD: '水星·沟通与思维之星', el: '风象', elD: '风象·沟通与思想', mode: '变动宫', modeD: '变动·灵活应变', kw: ['反应快','点子多','自来熟','消息灵通','话多','兴趣广但不专','一心多用','怕无聊'], color: '柠檬黄', gem: '玛瑙', flower: '薰衣草', sun: '太阳落在双子座：脑子永远在线的信息处理器，什么都好奇、什么都能聊，人群里的气氛担当。', con: '标志性矛盾：兴趣太广导致样样浅尝；选择太多反而难下决定。', grow: '核心成长课题：把一件事情做穿，比同时开十件更值钱。' },
  { n: '巨蟹座', en: 'CANCER', emoji: '♋', r: '6.22-7.22', star: '月亮', starD: '月亮·情绪与安全感之星', el: '水象', elD: '水象·感受与滋养', mode: '基本宫', modeD: '开创·先护住再说', kw: ['顾家','心软','记性好','直觉准','情绪化','爱翻旧账','护内','嘴硬心软'], color: '珍珠白', gem: '珍珠', flower: '百合', sun: '太阳落在巨蟹座：把家人朋友看得比什么都重的那类人，情绪感受力是天赋，也是你的软肋。', con: '标志性矛盾：想被照顾又抢先照顾别人；受委屈不说，攒着攒着翻旧账。', grow: '核心成长课题：把感受说出口，别让人靠猜。' },
  { n: '狮子座', en: 'LEO', emoji: '♌', r: '7.23-8.22', star: '太阳', starD: '太阳·自我与光芒之源', el: '火象', elD: '火象·行动与热情', mode: '固定宫', modeD: '固定·王者气场', kw: ['大方','能带人','讲义气','气场足','爱面子','要掌声','心软嘴硬','被夸就上头'], color: '金黄色', gem: '琥珀', flower: '向日葵', sun: '太阳落在狮子座：自带舞台灯光的人，站在人群中央不慌，对认定的人出手大方到底。', con: '标志性矛盾：要面子又拉不下脸求和；明明想被夸，偏装不在乎。', grow: '核心成长课题：光芒不用证明，放松了才照得远。' },
  { n: '处女座', en: 'VIRGO', emoji: '♍', r: '8.23-9.22', star: '水星', starD: '水星·沟通与思维之星', el: '土象', elD: '土象·务实与积累', mode: '变动宫', modeD: '变动·细节控场', kw: ['靠谱','细节控','会复盘','爱干净','较真','爱操心','毒舌','对自己更狠'], color: '灰色系', gem: '蓝宝石', flower: '铃兰', sun: '太阳落在处女座：把事情交给你就放心的那种人，清单和复盘是本能，嘴上毒舌心里护人。', con: '标志性矛盾：对别人宽容对自己更狠；想放松又怕失控。', grow: '核心成长课题：完成比完美重要，放过自己也放过别人。' },
  { n: '天秤座', en: 'LIBRA', emoji: '♎', r: '9.23-10.23', star: '金星', starD: '金星·爱与美之星', el: '风象', elD: '风象·沟通与思想', mode: '基本宫', modeD: '开创·行动力强', kw: ['优雅迷人','追求平衡','艺术天赋','善于社交','优柔寡断','审美出众','追求和谐','公正客观'], color: '粉红色', gem: '蛋白石', flower: '玫瑰', sun: '太阳落在天秤座：追求和谐、优雅、公正。由金星守护的你，天生具有艺术鉴赏力和社交魅力，是朋友圈里的调停者。', con: '标志性矛盾：因过度权衡利弊而犹豫不决；因害怕冲突而压抑真实感受；因追求美而沉迷形式。', grow: '核心成长课题：学会说「不」，允许关系中的不完美，从他人的评价中抽身回到自我中心。' },
  { n: '天蝎座', en: 'SCORPIO', emoji: '♏', r: '10.24-11.22', star: '冥王星', starD: '冥王星·蜕变与掌控之星', el: '水象', elD: '水象·感受与滋养', mode: '固定宫', modeD: '固定·深水静流', kw: ['专一','看得透','能蛰伏','护短','记仇','爱恨分明','控制欲','不轻易交底'], color: '深酒红', gem: '黄玉', flower: '曼陀罗', sun: '太阳落在天蝎座：表面安静、内里自有版图的人，对认定的人和事倾注到底，也要求同样的深度。', con: '标志性矛盾：渴望亲密又怕被看穿；放下戒备和保持掌控在拉扯。', grow: '核心成长课题：交底不是失控，信任是深关系的入场券。' },
  { n: '射手座', en: 'SAGITTARIUS', emoji: '♐', r: '11.23-12.21', star: '木星', starD: '木星·扩张与幸运之星', el: '火象', elD: '火象·行动与热情', mode: '变动宫', modeD: '变动·永远在路上', kw: ['乐观','爱自由','直给','见多识广','没耐性','说走就走','欠考虑','招人喜欢'], color: '紫色系', gem: '土耳其石', flower: '石竹', sun: '太阳落在射手座：天生的远行者，对世界保持好奇，乐观和直给让你走到哪都有朋友。', con: '标志性矛盾：要自由又怕辜负；说走就走的背后是怕被束缚。', grow: '核心成长课题：承诺不是笼子，是给自由找的落脚点。' },
  { n: '摩羯座', en: 'CAPRICORN', emoji: '♑', r: '12.22-1.19', star: '土星', starD: '土星·纪律与时间之星', el: '土象', elD: '土象·务实与积累', mode: '基本宫', modeD: '开创·长期主义者', kw: ['能熬','目标感','靠谱','自律','闷','不表达','工作狂','大器晚成'], color: '黑色系', gem: '玛瑙', flower: '水仙', sun: '太阳落在摩羯座：把时间当朋友的人，别人在找捷径你在爬坡，山顶的风景你配得上。', con: '标志性矛盾：渴望被认可又不肯表功；把休息当罪过。', grow: '核心成长课题：辛苦是手段不是目的，记得抬头看路。' },
  { n: '水瓶座', en: 'AQUARIUS', emoji: '♒', r: '1.20-2.18', star: '天王星', starD: '天王星·革新与独立之星', el: '风象', elD: '风象·沟通与思想', mode: '固定宫', modeD: '固定·独立的怪点子', kw: ['独立','怪点子','不跟风','讲逻辑','冷感','疏离','理想主义','朋友遍天下'], color: '天蓝色', gem: '紫水晶', flower: '兰花', sun: '太阳落在水瓶座：天生带着"为什么一定要这样"的人，独立思考是你的默认设置，路子越没人走你越来劲。', con: '标志性矛盾：想靠近人群又要保持距离；理性至上又偶尔为理念上头。', grow: '核心成长课题：与众不同不用刻意，合群也不代表妥协。' },
  { n: '双鱼座', en: 'PISCES', emoji: '♓', r: '2.19-3.20', star: '海王星', starD: '海王星·梦境与灵感之星', el: '水象', elD: '水象·感受与滋养', mode: '变动宫', modeD: '变动·随波也随缘', kw: ['共情力','脑洞大','艺术细胞','心善','爱幻想','容易上头','逃避','没边界'], color: '海蓝色', gem: '海蓝宝', flower: '睡莲', sun: '太阳落在双鱼座：想象力不设限的人，共情力是你的超能力，音乐电影和梦境是你的充电站。', con: '标志性矛盾：心太软容易被耗；幻想太美现实有点扎手。', grow: '核心成长课题：善良要有边界，梦境要落一笔进现实。' }
];
function decanOf(k) {
  const p = parseKey(k), md = (p.getMonth() + 1) * 100 + p.getDate();
  const xz = XZ_FULL[xzByKey(k)];
  const starts = [321,420,521,622,723,823,923,1024,1123,1222,120,219];
  let s0 = null, e0 = null, idx = 9;
  for (let i = 0; i < starts.length; i++) {
    const end = (i === 11) ? 320 : starts[i + 1] - 1;
    const st = starts[i];
    if ((st <= md && md <= end) || (st > end && (md >= st || md <= end))) { s0 = st; e0 = end; idx = i; break; }
  }
  if (s0 === null) return '· 十位分区按星座内每 10 天一段';
  /* 星座内天数 → 第几个十年 */
  let dd;
  if (s0 <= md) dd = Math.floor((md - s0) / 100 * 1) ;
  const mm = Math.floor(s0 / 100), ddm = s0 % 100;
  const dayIn = (function () {
    const a = new Date(p.getFullYear(), mm - 1, ddm), b = new Date(p.getFullYear(), p.getMonth(), p.getDate());
    return Math.round((b - a) / 86400000) + 1;
  })();
  const seg = dayIn <= 10 ? 1 : (dayIn <= 20 ? 2 : 3);
  const CN = ['一','二','三'];
  return '第' + ['1','2','3'][seg - 1].replace('1','1').replace('2','2').replace('3','3') + '个十年 · ' + xz.n.slice(0, -1) + CN[seg - 1] + '（星座内第 ' + dayIn + ' 天）';
}
/* 确定性运势算法（seed = 日期+星座）：同一天同星座结果固定，非随手编 */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function dayFortune(k, xzIdx) {
  const p = parseKey(k);
  const seed = (p.getFullYear() * 10000 + (p.getMonth() + 1) * 100 + p.getDate()) * 31 + xzIdx * 7;
  const rnd = mulberry32(seed);
  const score = function () { return 55 + Math.floor(rnd() * 41); };
  const all = [score(), score(), score(), score()];
  const overall = Math.round((all[0] + all[1] + all[2] + all[3]) / 4);
  const tone = overall >= 75 ? 'high' : (overall >= 60 ? 'mid' : 'low');
  return { overall: overall, love: all[0], work: all[1], wealth: all[2], health: all[3], tone: tone, stamp: ('0' + p.getHours()).slice(-2) + ':' + ('0' + p.getMinutes()).slice(-2) + ':' + ('0' + p.getSeconds()).slice(-2) };
}
const FORT_TEXT = {
  high: '运势整体上扬，之前铺垫的事今天容易看到回响。状态在线，把最重要的事排在上午做，傍晚留点余地收尾，好状态要省着用。',
  mid: '平稳向好的一天，没有大风浪也没有大惊喜——这种日子最适合把该做的事做完。节奏稳住，晚上复盘十分钟，比什么鸡汤都管用。',
  low: '今天的能量偏低，别硬扛大事，也别做重要决定。把日程排松一点，照顾好吃饭和睡眠，低谷期守住了就是赢。'
};
const FORT_FACE = { high: '😄', mid: '🙂', low: '😐' };
const FORT_LABEL = { high: '上扬', mid: '平稳向好', low: '谨慎前行' };
const ZX_LUCK = {
  num: function (r) { return 1 + Math.floor(r() * 98); },
  dir: function (r) { return ['正东','正南','正西','正北','东南','西北','西南','东北'][Math.floor(r() * 8)]; },
  hour: function (r) { const s = Math.floor(r() * 8) * 2 + 8; return ('0' + s).slice(-2) + ':00-' + ('0' + (s + 2) % 24).slice(-2) + ':00'; }
};
let zxSel = 6, zxLuckSeed = 0;

function xzByKey(k) {
  const p = parseKey(k);
  const md = (p.getMonth() + 1) * 100 + p.getDate();
  const starts = [321,420,521,622,723,823,923,1024,1123,1222,120,219];
  let idx = 9; /* 摩羯兜底 */
  for (let i = 0; i < starts.length; i++) {
    const end = (i === 11) ? 320 : starts[i + 1] - 1;
    const s = starts[i];
    if (s <= md && md <= end || (s > end && (md >= s || md <= end))) { idx = i; break; }
  }
  return idx;
}
/* 生肖档案（民俗通行） */
const SHENGXIAO = [
  { n: '鼠', tag: '机敏·会攒·心细', lh: '牛（六合）', sh: '龙·猴（三合）', chong: '马' },
  { n: '牛', tag: '踏实·能扛·慢性子', lh: '鼠（六合）', sh: '蛇·鸡（三合）', chong: '羊' },
  { n: '虎', tag: '胆大·爱拼·讲义气', lh: '猪（六合）', sh: '马·狗（三合）', chong: '猴' },
  { n: '兔', tag: '温和·人缘好·有分寸', lh: '狗（六合）', sh: '猪·羊（三合）', chong: '鸡' },
  { n: '龙', tag: '有志气·场面人·标准高', lh: '鸡（六合）', sh: '猴·鼠（三合）', chong: '狗' },
  { n: '蛇', tag: '冷静·看得透·能蛰伏', lh: '猴（六合）', sh: '鸡·牛（三合）', chong: '猪' },
  { n: '马', tag: '热乎·闲不住·重自由', lh: '羊（六合）', sh: '虎·狗（三合）', chong: '鼠' },
  { n: '羊', tag: '心善·审美好·恋家', lh: '马（六合）', sh: '兔·猪（三合）', chong: '牛' },
  { n: '猴', tag: '活络·学得快·鬼点子', lh: '蛇（六合）', sh: '龙·鼠（三合）', chong: '虎' },
  { n: '鸡', tag: '准时·爱美·嗓门亮', lh: '龙（六合）', sh: '蛇·牛（三合）', chong: '兔' },
  { n: '狗', tag: '忠诚·护人·认死理', lh: '兔（六合）', sh: '虎·马（三合）', chong: '龙' },
  { n: '猪', tag: '实在·有福气·好相处', lh: '虎（六合）', sh: '兔·羊（三合）', chong: '蛇' }
];
const SX_YEAR = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
function sxByYear(y) { return (y - 4) % 12; } /* 1999→(1995)%12=3→兔 */
const NYN2 = { '戊寅': '城头土', '己卯': '城头土', '庚辰': '白蜡金', '辛巳': '白蜡金', '丙戌': '屋上土', '丁亥': '屋上土', '甲戌': '山头火', '乙亥': '山头火', '甲辰': '覆灯火', '乙巳': '覆灯火' };

/* ============ 黄历扩展数据（V88，展示结构对齐 TA 工作台） ============ */
const LUNAR_TBL = '2025.01.29|正|30;2025.02.28|二|29;2025.03.29|三|30;2025.04.28|四|29;2025.05.27|五|29;2025.06.25|六|30;2025.07.25|闰六|29;2025.08.23|七|30;2025.09.22|八|29;2025.10.21|九|30;2025.11.20|十|30;2025.12.20|冬|30;2026.01.19|腊|29;2026.02.17|正|30;2026.03.19|二|29;2026.04.17|三|30;2026.05.17|四|29;2026.06.15|五|29;2026.07.14|六|30;2026.08.13|七|29;2026.09.11|八|29;2026.10.10|九|30;2026.11.09|十|30;2026.12.09|冬|30;2027.01.08|腊|29;2027.02.06|正|30;2027.03.08|二|30;2027.04.07|三|29;2027.05.06|四|30;2027.06.05|五|29;2027.07.04|六|29;2027.08.02|七|30;2027.09.01|八|29;2027.09.30|九|29;2027.10.29|十|30;2027.11.28|冬|30;2027.12.28|腊|29;2028.01.26|正|30;2028.02.25|二|30;2028.03.26|三|30;2028.04.25|四|29;2028.05.24|五|30;2028.06.23|闰五|29;2028.07.22|六|29;2028.08.20|七|30;2028.09.19|八|29;2028.10.18|九|29;2028.11.16|十|30;2028.12.16|冬|30';
const LUNAR_ROWS = (function () {
  return LUNAR_TBL.split(';').map(function (line) {
    const a = line.split('|');
    const d = a[0].split('.');
    return { d: new Date(+d[0], +d[1] - 1, +d[2]).getTime(), n: a[1], s: +a[2] };
  });
})();
const LCN = ['一','二','三','四','五','六','七','八','九','十'];
function lunarOf(k) {
  const t = parseKey(k).getTime();
  let cur = null, nxt = null;
  for (let i = 0; i < LUNAR_ROWS.length; i++) {
    if (LUNAR_ROWS[i].d <= t && (i + 1 === LUNAR_ROWS.length || LUNAR_ROWS[i + 1].d > t)) { cur = LUNAR_ROWS[i]; nxt = LUNAR_ROWS[i + 1]; break; }
  }
  if (!cur) return null;
  const day = Math.round((t - cur.d) / 86400000) + 1;
  let ds;
  if (day <= 10) ds = '初' + LCN[day - 1];
  else if (day === 20) ds = '二十';
  else if (day === 30) ds = '三十';
  else if (day < 20) ds = '十' + LCN[day - 11];
  else ds = '二十' + LCN[day - 21];
  return { mon: cur.n, day: ds, n: day };
}
function yearGZIdx(p) {
  const mo = p.getMonth() + 1, dd = p.getDate();
  const y = (mo < 2 || (mo === 2 && dd < 4)) ? p.getFullYear() - 1 : p.getFullYear();
  return { g: (y - 4) % 10, z: (y - 4) % 12 };
}
const GAN5 = '木木火火土土金金水水';
const ZHI5 = '水土木木土火火土金金土水';
const NY30 = ['海中金','炉中火','大林木','路旁土','剑锋金','山头火','涧下水','城头土','白蜡金','杨柳木','泉中水','屋上土','霹雳火','松柏木','长流水','沙中金','山下火','平地木','壁上土','金箔金','覆灯火','天河水','大驿土','钗钏金','桑柘木','大溪水','沙中土','天上火','石榴木','大海水'];
function nayinOf(gan, zhi) {
  for (let i = 0; i < 60; i++) if (i % 10 === gan && i % 12 === zhi) return NY30[i >> 1];
  return '';
}
const WX_ORGANS = [['金','肺·大肠','#F5EEDC'],['木','肝·胆','#E4F1E4'],['水','肾·膀胱','#E3ECF8'],['火','心·小肠','#FBE9E4'],['土','脾·胃','#F3EEE7']];
const SX_LH = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 }; /* 六合：子丑 寅亥 卯戌 辰酉 巳申 午未 */
const SX_HAI = { 0: 7, 7: 0, 1: 6, 6: 1, 2: 5, 5: 2, 3: 4, 4: 3, 8: 11, 11: 8, 9: 10, 10: 9 };
const SANHE_GRP = [[8, 0, 4], [5, 9, 1], [2, 6, 10], [11, 3, 7]];
function sxRelation(dayZhi, myZhi) {
  const rel = [];
  if (dayZhi === myZhi) rel.push('同属');
  if (SX_LH[myZhi] === dayZhi) rel.push('六合');
  if (SANHE_GRP.some(g => g.indexOf(myZhi) > -1 && g.indexOf(dayZhi) > -1 && myZhi !== dayZhi)) rel.push('三合');
  if ((myZhi + 6) % 12 === dayZhi) rel.push('六冲');
  if (SX_HAI[myZhi] === dayZhi) rel.push('相害');
  if ((myZhi === 0 && dayZhi === 3) || (myZhi === 3 && dayZhi === 0)) rel.push('相刑');
  if ((myZhi === 2 && dayZhi === 5) || (myZhi === 5 && dayZhi === 2)) rel.push('相刑');
  if ((myZhi === 1 && dayZhi === 10) || (myZhi === 10 && dayZhi === 1)) rel.push('相刑');
  return rel;
}
const REL_ADVICE = {
  '六冲': '诸事多变，大事别今天拍板，稳字当头',
  '相刑': '容易较劲内耗，凡事求稳，说话过脑，低调行事，勿替人担保',
  '相害': '提防口舌是非，话到嘴边留三分',
  '六合': '贵人缘旺，适合主动约人谈事，推进计划',
  '三合': '合作运顺，拉上搭子一起干更容易成',
  '同属': '本命日，情绪易起伏，照常节奏走就好',
  '无': '平平常常的一天，按自己的计划走就行'
};
const REL_LEVEL = { '六冲': ['忌', '#C0392B'], '相刑': ['注意', '#E67E22'], '相害': ['注意', '#E67E22'], '六合': ['吉', '#27864A'], '三合': ['顺', '#27864A'], '同属': ['本命日', '#8E6FB8'], '无': ['平', '#667'] };
const JC_FULL = [
  { yi: ['出行','上任','会友','立券','交易'], ji: ['动土','开仓'] },
  { yi: ['沐浴','清洁','求医','治病','除旧布新'], ji: ['开市','嫁娶'] },
  { yi: ['祭祀','祈福','纳畜','栽种','牧养','纳财','开市','立券','交易','纳采','订货','收债','进人口'], ji: ['安葬','服药'] },
  { yi: ['修造','饰垣','平治道涂'], ji: ['词讼'] },
  { yi: ['订盟','纳采','签约','安床','立券','交易'], ji: ['诉讼','远行'] },
  { yi: ['捕捉','立券','专注攻坚'], ji: ['搬迁','开市'] },
  { yi: ['拆卸','破屋','求医','治病'], ji: ['嫁娶','开市','出行','签约'] },
  { yi: ['安床','置产','祭祀'], ji: ['登高','行船','冒险'] },
  { yi: ['开市','立券','交易','嫁娶','入宅','签约','纳财'], ji: ['词讼'] },
  { yi: ['纳财','收账','入学','纳畜','立券'], ji: ['安葬','行丧'] },
  { yi: ['开市','开工','移徙','入宅','求医','出行'], ji: ['安葬'] },
  { yi: ['安葬','修坟','筑堤','补垣','塞穴'], ji: ['开市','出行','问病'] }
];
const TERM_BAI = { '出行':'出门远行','上任':'入职到岗','会友':'约朋友','立券':'签合同','交易':'做买卖','动土':'动土施工','开仓':'开仓出货','沐浴':'洗头洗澡','清洁':'大扫除','求医':'去看病','治病':'治疗','除旧布新':'断舍离','开市':'开业开张','嫁娶':'办喜事','祭祀':'拜拜祈福','祈福':'求好运','纳畜':'添宠物','栽种':'种绿植','牧养':'养宠','纳财':'收钱进账','纳采':'提亲定亲','订货':'下订单','收债':'收欠款','进人口':'添丁进门','安葬':'下葬','服药':'吃药','修造':'装修修补','饰垣':'粉刷墙','平治道涂':'修路整院','词讼':'打官司','诉讼':'打官司','远行':'出远门','订盟':'订约定盟','签约':'签合同','安床':'安置床铺','捕捉':'抓虫灭鼠','专注攻坚':'啃硬骨头','搬迁':'搬家','拆卸':'拆旧','破屋':'破旧改造','置产':'买房置地','登高':'登高冒险','行船':'坐船水路','冒险':'冒险行事','入宅':'搬新家','纳采2':'提亲','收账':'收欠款','入学':'报名开学','开工':'动工','移徙':'搬家','修坟':'修整坟墓','筑堤':'修堤坝','补垣':'补墙','塞穴':'堵洞','问病':'探病' };
function baihua(t) { return TERM_BAI[t] || t; }
const ZHI_SHA = function (z) { return ([8,0,4].indexOf(z)>-1)?'南':([5,9,1].indexOf(z)>-1)?'东':([2,6,10].indexOf(z)>-1)?'北':'西'; };
const XI_FANG = ['东北','西北','西南','正南','东南','东北','西北','西南','正南','东南'];
const CAI_FANG = ['东北','东北','西南','西南','正北','正北','正东','正东','正南','正南'];
const SHI12 = [
  { g: 1, d: '祈福·嫁娶' }, { g: 1, d: '修造·安葬' }, { g: 0, d: '诸事不宜' },
  { g: 0, d: '口舌是非，大事勿用' }, { g: 1, d: '订婚·嫁娶' }, { g: 1, d: '祭祀·祈福' },
  { g: 0, d: '诸事不宜' }, { g: 1, d: '修造·盖屋' }, { g: 0, d: '诸事不宜' },
  { g: 0, d: '暗耗小心，诸事不宜' }, { g: 1, d: '祭祀·祈福' }, { g: 0, d: '诸事不宜' }
];
const SHI_NAME = ['子时','丑时','寅时','卯时','辰时','巳时','午时','未时','申时','酉时','戌时','亥时'];
const SHI_RANGE = ['23:00-01:00','01:00-03:00','03:00-05:00','05:00-07:00','07:00-09:00','09:00-11:00','11:00-13:00','13:00-15:00','15:00-17:00','17:00-19:00','19:00-21:00','21:00-23:00'];
let astroPlain = false;

let astroSelXZ = -1, astroSelSX = -1, astroYM = null, astroDay = null;
/* ============ 星座运势板块（V89，对齐 TA 工作台） ============ */
function zodiacBody() {
  const tk = todayKey();
  if (zxSel < 0) zxSel = 6;
  const xz = XZ_FULL[zxSel];
  const p = parseKey(tk);
  const f = dayFortune(tk, zxSel);
  /* 幸运物：确定性 seed（同日固定），重新拉取+1 换一组 */
  const lr = mulberry32((p.getFullYear() * 10000 + (p.getMonth() + 1) * 100 + p.getDate()) * 97 + zxSel * 13 + zxLuckSeed);
  const luckNum = ZX_LUCK.num(lr), luckDir = ZX_LUCK.dir(lr), luckHour = ZX_LUCK.hour(lr);
  let h = '';
  /* 头部档案大卡 */
  h += '<div class="card zx-hero"><div class="zx-hero-top">' +
    '<div class="zx-badge"><span class="zx-emoji">' + xz.emoji + '</span></div>' +
    '<div class="zx-hero-name"><b>' + xz.n + '</b><span>' + xz.en + '</span>' +
    '<em class="zx-range">📅 ' + xz.r + '</em></div></div>' +
    '<div class="zx-facts">' +
    '<div class="zx-fact"><span>守护星</span><b>' + xz.star + '</b><i>' + xz.starD + '</i></div>' +
    '<div class="zx-fact"><span>元素</span><b>' + xz.el + '</b><i>' + xz.elD + '</i></div>' +
    '<div class="zx-fact"><span>模式</span><b>' + xz.mode + '</b><i>' + xz.modeD + '</i></div>' +
    '<div class="zx-fact"><span>生日</span><b>1999-10-19</b><i>' + decanOf('1999-10-19') + '</i></div>' +
    '</div>' +
    '<div class="zx-kw"><p class="card-label">性格关键词</p><div class="as-chips">' +
    xz.kw.map(k => '<span class="as-chip zx-kw-chip">' + k + '</span>').join('') + '</div></div>' +
    '<div class="zx-switch"><span class="as-k">换着看：</span>' +
    '<select class="as-sel" data-astro="xzfull">' + XZ_FULL.map((x, i) => '<option value="' + i + '"' + (i === zxSel ? ' selected' : '') + '>' + x.n + '</option>').join('') + '</select></div>' +
    '<p class="as-src">档案为通行占星内容（日期范围/守护星/元素/三分法/十位分区）；关键词含缺点，真实为主</p></div>';
  /* 今日幸运物 */
  h += '<div class="zx-sect"><h3 class="card-label">🍀 今日幸运物</h3>' +
    '<button class="btn ghost sm" data-action="zx-repull" style="width:auto;display:inline-block;padding:8px 12px;font-size:12.5px">🔄 重新拉取</button></div>' +
    '<div class="zx-luck-grid">' +
    '<div class="zx-luck"><span class="zx-luck-emoji">🎨</span><span class="as-k">幸运色</span><b>' + xz.color + '</b></div>' +
    '<div class="zx-luck"><span class="zx-luck-emoji">🔢</span><span class="as-k">幸运数</span><b>' + luckNum + '</b></div>' +
    '<div class="zx-luck"><span class="zx-luck-emoji">💎</span><span class="as-k">幸运石</span><b>' + xz.gem + '</b></div>' +
    '<div class="zx-luck"><span class="zx-luck-emoji">🧭</span><span class="as-k">方位</span><b>' + luckDir + '</b></div>' +
    '<div class="zx-luck"><span class="zx-luck-emoji">⏰</span><span class="as-k">吉时</span><b>' + luckHour + '</b></div>' +
    '<div class="zx-luck"><span class="zx-luck-emoji">🌸</span><span class="as-k">花朵</span><b>' + xz.flower + '</b></div>' +
    '</div>' +
    '<p class="as-src">幸运色/石/花为占星通行对应；幸运数/方位/吉时由确定性算法按日生成（同一天固定，重新拉取换一组）· 娱乐参考</p>';
  /* 星盘速览 */
  h += '<div class="zx-sect"><h3 class="card-label">⚡ 星盘速览（太阳' + xz.n.slice(0, -1) + '）</h3></div>' +
    '<div class="card zx-chart-txt"><div class="as-fact"><b>☀️</b><span>' + xz.sun + '</span></div>' +
    '<div class="as-fact"><b>' + xz.emoji + '</b><span>' + xz.con + '</span></div>' +
    '<div class="as-fact"><b>🌱</b><span>' + xz.grow + '</span></div>' +
    '<p class="as-src">通行占星的太阳星座解读；上升/月亮需出生钟点与星历（月亮没把握不编）</p></div>';
  /* 今日综合运势（确定性算法） */
  const ring = Math.round(f.overall * 2.51); /* 2.51 ≈ 2πr(40)/100 */
  h += '<div class="zx-sect"><h3 class="card-label">🔮 今日综合运势</h3></div>' +
    '<p class="as-src" style="margin:0 2px 8px">⚙️ 本地确定性算法 · 基于' + xz.el + '+' + xz.star + '守护特质 · ' + (p.getMonth() + 1) + '月' + p.getDate() + '日为种子，同一天结果固定</p>' +
    '<div class="card zx-fort">' +
    '<div class="zx-fort-top"><div class="zx-ring" style="--p:' + ring + '"><b>' + f.overall + '</b><i>/100</i></div>' +
    '<div class="zx-fort-txt"><span class="as-ym">' + p.getFullYear() + '年' + (p.getMonth() + 1) + '月' + p.getDate() + '日 ' + WEEK_LABELS[p.getDay()] + '</span>' +
    '<b class="zx-fort-label">' + FORT_FACE[f.tone] + ' ' + FORT_LABEL[f.tone] + '</b>' +
    '<p class="sub">' + FORT_TEXT[f.tone] + '</p></div></div>' +
    '<div class="zx-bars">' +
    zxBar('💕 爱情人际', f.love, '#E4589B') +
    zxBar('💼 学业事业', f.work, '#5B6CE8') +
    zxBar('💰 财富运势', f.wealth, '#E89B2D') +
    zxBar('🍏 健康身体', f.health, '#27A567') +
    '</div>' +
    '<p class="as-src">分数由确定性伪随机生成（seed=日期+星座），是「规则生成的娱乐内容」——不装成天文预测，也绝不随机骗你</p></div>';
  return h;
}
function zxBar(label, v, color) {
  return '<div class="zx-bar-row"><span class="zx-bar-l">' + label + '</span><b class="zx-bar-v" style="color:' + color + '">' + v + '</b>' +
    '<div class="zx-bar"><div class="zx-bar-fill" style="width:' + v + '%;background:' + color + '"></div></div></div>';
}

function astroBody() {
  const tk = todayKey();
  if (astroSelXZ < 0) astroSelXZ = xzByKey('1999-10-19');
  if (astroSelSX < 0) astroSelSX = sxByYear(1999);
  const xz = XINGZUO[astroSelXZ], sx = SHENGXIAO[astroSelSX];
  const now = parseKey(tk);
  if (!astroYM) astroYM = { y: now.getFullYear(), m: now.getMonth() };
  const da = dayAstro(tk);
  const lu = lunarOf(tk);
  const p = parseKey(tk);
  let h = '';
  /* ---- 今日大卡 ---- */
  const yIdx = yearGZIdx(p);
  const luTxt = lu ? lu.mon + '月' + lu.day : '';
  h += '<div class="card as-today"><div class="as-today-h"><b>今日黄历</b><span class="as-wx-sub">' + da.jc + '日 · ' + (da.isHuang ? '黄道 ' + da.qd : '黑道 ' + da.qd) + '</span></div>' +
    '<div class="as-big"><div class="as-date">' +
    '<span class="as-ym">' + p.getFullYear() + '年' + (p.getMonth() + 1) + '月 · ' + WEEK_LABELS[p.getDay()] + '</span>' +
    '<b class="as-num">' + p.getDate() + '</b>' +
    '<span class="as-lunar">' + luTxt + ' · 属' + SX12[yIdx.z] + '年</span>' +
    '<span class="as-gzline">' + da.yg + '</span></div>' +
    '<div class="as-plaque"><span class="as-pq-top">' + DZ12[yIdx.z] + ' ' + SX12[yIdx.z] + '</span><b class="as-pq-day">' + (lu ? (lu.n <= 10 ? LCN[lu.n - 1] : lu.n === 20 ? '廿' : lu.n === 30 ? '卅' : lu.n < 20 ? '十' + LCN[lu.n - 11] : '廿' + LCN[lu.n - 21]) : '') + '</b><span class="as-pq-mon">' + (lu ? lu.mon + '月' : '') + '</span></div>' +
    '</div></div>';
  /* ---- 干支 · 五行 ---- */
  const gz = dayGZ(tk).gz;
  const mGanIdx = (yIdx.g * 2 + 2 + (da.mz - 2) + 20) % 10;
  const wxCount = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };
  [yIdx, { g: mGanIdx, z: da.mz }, { g: da.gan, z: da.zhi }].forEach(function (c) {
    wxCount[GAN5[c.g]]++; wxCount[ZHI5[c.z]]++;
  });
  const dayNY = nayinOf(da.gan, da.zhi);
  h += '<div class="card"><h3 class="card-label">干支 · 五行</h3>' +
    '<div class="as-pq-grid">' +
    '<div class="as-pq-item"><span>年柱</span><b>' + GZ10[yIdx.g] + DZ12[yIdx.z] + '</b><i>' + GAN5[yIdx.g] + ZHI5[yIdx.z] + ' · ' + nayinOf(yIdx.g, yIdx.z) + '</i></div>' +
    '<div class="as-pq-item"><span>月柱</span><b>' + GZ10[mGanIdx] + DZ12[da.mz] + '</b><i>' + GAN5[mGanIdx] + ZHI5[da.mz] + ' · ' + nayinOf(mGanIdx, da.mz) + '</i></div>' +
    '<div class="as-pq-item"><span>日柱</span><b>' + gz + '</b><i>' + GAN5[da.gan] + ZHI5[da.zhi] + ' · ' + dayNY + '</i></div>' +
    '<div class="as-pq-item"><span>建除</span><b>' + da.jc + '日</b><i>' + (da.isHuang ? '黄道 · ' + da.qd : '黑道 · ' + da.qd) + '</i></div>' +
    '</div>' +
    '<p class="as-wx-title">今日五行能量 <span class="as-wx-sub">年 · 月 · 日 三柱干支</span></p>' +
    '<div class="as-wx-grid">' + WX_ORGANS.map(function (o) {
      return '<div class="as-wx-item" style="background:' + o[2] + '"><b>' + o[0] + '</b><i>' + o[1] + '</i><em>' + (wxCount[o[0]] || 0) + ' 个</em></div>';
    }).join('') + '</div>' +
    '<p class="as-dayzhu">今日日主为 <b>' + GAN5[da.gan] + '</b>（' + gz[0] + '），生于 <b>' + GZ10[mGanIdx] + DZ12[da.mz] + '</b> 月，日柱纳音 <b>' + dayNY + '</b></p>' +
    '<p class="as-src">干支/纳音/建除按《协纪辨方书》体系，日柱甲子锚点校准可对万年历验证；农历表源自寿星天文历</p></div>';
  /* ---- 属相今日专属冲合 ---- */
  const myZhi = astroSelSX;
  const rels = sxRelation(da.zhi, myZhi);
  const mainRel = rels.length ? (rels.indexOf('六冲') > -1 ? '六冲' : rels.indexOf('相刑') > -1 ? '相刑' : rels.indexOf('相害') > -1 ? '相害' : rels[0]) : '无';
  const lv = REL_LEVEL[mainRel];
  const lhZ = SX_LH[myZhi], haiZ = SX_HAI[myZhi], chongZ = (myZhi + 6) % 12;
  const shGrp = SANHE_GRP.filter(g => g.indexOf(myZhi) > -1)[0];
  const xingWith = function (z) {
    if (z === 0) return [3]; if (z === 3) return [0];
    if ([2, 5, 8].indexOf(z) > -1) return [2, 5, 8].filter(x => x !== z);
    if ([1, 10, 7].indexOf(z) > -1) return [1, 10, 7].filter(x => x !== z);
    return [z];
  };
  const xw = xingWith(myZhi);
  const detTxt = '六合：合' + SX12[lhZ] + '（' + DZ12[lhZ] + '） · 三合：' + shGrp.map(z => DZ12[z] + SX12[z]).join(' · ') +
    ' · 六冲：冲' + SX12[chongZ] + '（' + DZ12[chongZ] + '） · 相害：害' + SX12[haiZ] + '（' + DZ12[haiZ] + '） · 相刑：刑' + xw.map(z => SX12[z]).join('、');
  h += '<div class="card as-rel"><div class="as-rel-h"><h3 class="card-label">属' + sx.n + ' · 今日专属冲合</h3>' +
    '<select class="as-sel" data-astro="sx">' + SHENGXIAO.map((x, i2) => '<option value="' + i2 + '"' + (i2 === astroSelSX ? ' selected' : '') + '>属' + x.n + '</option>').join('') + '</select></div>' +
    '<div class="as-rel-row"><div class="as-rel-box"><span class="as-k">今日运势</span><b style="color:' + lv[1] + '">' + lv[0] + '</b></div>' +
    '<div class="as-rel-box"><span class="as-k">与日支（' + DZ12[da.zhi] + '）关系</span><b>' + (rels.length ? '今日与' + sx.n + rels.join('、') : '无明显冲合') + '</b></div></div>' +
    '<div class="as-rel-detail"><b>专属参考</b>' + detTxt +
    '<div class="as-rel-adv"><b>建议：</b>' + REL_ADVICE[mainRel] + '</div></div>' +
    '<p class="as-src">关系判定按地支六合/三合/六冲/相害/相刑标准，建议为规则化文案（非预测）</p></div>';
  /* ---- 宜 · 忌 ---- */
  const jcT = JC_FULL[da.jcIdx];
  const chip = function (arr, cls) {
    return '<div class="as-yj-grid">' + arr.map(function (t) {
      const bai = baihua(t);
      return '<div class="as-yj-item ' + cls + '"><b>' + t + '</b>' + (bai !== t ? '<i>' + bai + '</i>' : '') + '</div>';
    }).join('') + '</div>';
  };
  h += '<div class="card"><h3 class="card-label">宜 · 忌<span class="as-wx-sub"> 建除十二神 · ' + da.jc + '日 · 每条都带白话</span></h3>' +
    '<div class="as-yj-head yi"><b>宜</b>今日适合</div>' + chip(jcT.yi, 'ok') +
    '<div class="as-yj-head ji"><b>忌</b>今日避开</div>' + chip(jcT.ji, 'no') + '</div>';
  /* ---- 彭祖百忌 ---- */
  h += '<div class="card"><h3 class="card-label">彭祖百忌<span class="as-wx-sub"> 口诀 + 白话</span></h3><div class="as-pg-box">' +
    '<div class="as-pg-row"><b>【' + gz[0] + '】</b><span class="as-pg-txt">' + PG_GAN[da.gan] + '</span><i>' + PG_GAN_BAI[da.gan] + '</i></div>' +
    '<div class="as-pg-row"><b>【' + gz[1] + '】</b><span class="as-pg-txt">' + PG_ZHI[da.zhi] + '</span><i>' + PG_ZHI_BAI[da.zhi] + '</i></div></div>' +
    '<p class="as-src">按日干、日支各取一条 · 传统通书标准口诀，白话为直译</p></div>';
  /* ---- 冲煞方位 ---- */
  const chongZ2 = (da.zhi + 6) % 12;
  h += '<div class="card"><h3 class="card-label">冲煞方位</h3><div class="as-pq-grid">' +
    '<div class="as-pq-item"><span>冲</span><b>' + SX12[chongZ2] + '（' + DZ12[chongZ2] + '）</b><i>属' + SX12[chongZ2] + '的今天低调点</i></div>' +
    '<div class="as-pq-item"><span>煞</span><b>煞' + ZHI_SHA(da.zhi) + '</b><i>往这个方向办事悠着点</i></div>' +
    '<div class="as-pq-item"><span>喜神方位</span><b>' + XI_FANG[da.gan] + '</b><i>接喜气朝这边</i></div>' +
    '<div class="as-pq-item"><span>财神方位</span><b>' + CAI_FANG[da.gan] + '</b><i>求财朝这边</i></div>' +
    '</div><p class="as-src">煞方按日支三合局（申子辰煞南等），喜神/财神按日干方位歌诀</p></div>';
  /* ---- 十二时辰吉凶 ---- */
  const qdStart = QD_START[da.zhi];
  let shiCards = '';
  for (let i3 = 0; i3 < 12; i3++) {
    const qdIdx2 = ((i3 - qdStart) % 12 + 12) % 12;
    const st = SHI12[qdIdx2];
    shiCards += '<div class="as-shi ' + (st.g ? 'ok' : 'no') + '"><b>' + SHI_NAME[i3] + '</b><span>' + SHI_RANGE[i3] + '</span>' +
      '<em>' + (st.g ? '吉' : '凶') + ' · ' + QD12[qdIdx2] + '</em><i>' + st.d + '</i></div>';
  }
  h += '<div class="card"><h3 class="card-label">十二时辰吉凶（今日 ' + gz + '日）</h3>' +
    '<div class="as-shi-grid">' + shiCards + '</div>' +
    '<p class="as-src">黄道六神：青龙·明堂·金匮·天德·玉堂·司命为吉时；黑道六神：天刑·朱雀·白虎·天牢·玄武·勾陈为凶时（《协纪辨方书》时家黄黑道）</p></div>';
  /* ---- 八字四柱 ---- */
  h += '<div class="card"><h3 class="card-label">命理 · 我的八字四柱</h3>' +
    '<div class="bz-row">' +
    '<div class="bz-pill"><span>年柱</span><b>己卯</b><i>城头土</i></div>' +
    '<div class="bz-pill"><span>月柱</span><b>甲戌</b><i>山头火</i></div>' +
    '<div class="bz-pill"><span>日柱</span><b>甲辰</b><i>覆灯火</i></div>' +
    '<div class="bz-pill"><span>时柱</span><b>戊辰</b><i>大林木</i></div>' +
    '</div>' +
    '<div class="as-fact"><b>为什么准</b>时辰本来就是两小时一段（古人没分钟概念），早上 7-9 点整段都是辰时——甲日辰时=戊辰，这是确定的</div>' +
    '<div class="as-fact"><b>日主甲木</b>命理通行说法：甲木是参天大树——直爽、有主见、认准的事能一直熬（你减脂打卡这股劲倒是对得上）。兔年生龙时，民俗叫"玉兔腾云"</div>' +
    '<div class="as-fact"><b>五行分布</b>四柱全看：木 3 · 土 5，金火水未透——通行命理讲"土重"，为人稳但容易闷头扛，情绪要有出口（健身就是出口）</div>' +
    '<div class="as-fact"><b>上升星座</b>大概率天蝎（10 月中旬辰时段的天文估算；若接近 9 点则可能射手）——按"早上 7-9 点"估的，供娱乐参考</div>' +
    '<div class="as-fact"><b>月亮星座</b>需要 1999 年当日精确星历才能算——没有把握的我不编，这条就空着</div>' +
    '<p class="set-tip">八字按《三命通会》通行体系排，四柱可对万年历验证；上升按辰时中段天文近似；命理/星座均为娱乐参考</p></div>';
  /* ---- 吉日挑日子月历 ---- */
  const first = new Date(astroYM.y, astroYM.m, 1);
  const startPad = first.getDay();
  const dim = new Date(astroYM.y, astroYM.m + 1, 0).getDate();
  let cells = '';
  for (let i4 = 0; i4 < startPad; i4++) cells += '<span class="cal-cell cal-pad"></span>';
  for (let d2 = 1; d2 <= dim; d2++) {
    const k = astroYM.y + '-' + String(astroYM.m + 1).padStart(2, '0') + '-' + String(d2).padStart(2, '0');
    const a2 = dayAstro(k);
    const cls = 'cal-cell' + (k === tk ? ' cal-today' : '') + (astroDay === k ? ' cal-sel' : '');
    cells += '<button class="' + cls + '" data-action="astro-day" data-k="' + k + '">' +
      '<span class="cal-d">' + d2 + '</span><span class="as-jc">' + a2.jc + '</span><span class="cal-dots"><i class="' + (a2.isHuang ? 'as-huang' : '') + '"></i></span></button>';
  }
  h += '<div class="card"><div class="cal-head">' +
    '<button class="cal-nav" data-action="astro-prev">‹</button>' +
    '<div class="cal-title"><b>挑个好日子 · ' + astroYM.y + ' 年 ' + (astroYM.m + 1) + ' 月</b><span class="cal-count">金点=黄道日 · 格内小字=建除</span></div>' +
    '<button class="cal-nav" data-action="astro-next">›</button></div>' +
    '<div class="cal-week">' + ['日','一','二','三','四','五','六'].map(w => '<span>' + w + '</span>').join('') + '</div>' +
    '<div class="cal-grid">' + cells + '</div>';
  if (astroDay) {
    const a3 = dayAstro(astroDay), dp = parseKey(astroDay);
    h += '<div class="cal-detail"><div class="cdd-head"><b>' + (dp.getMonth() + 1) + '月' + dp.getDate() + '日 · ' + a3.gz + '日 · ' + a3.jc + '日</b>' +
      '<button class="cdd-close" data-action="astro-close">✕</button></div>' +
      '<span class="as-badge ' + (a3.isHuang ? 'hd' : 'hmd') + '">' + (a3.isHuang ? '黄道日 · ' + a3.qd : '黑道日 · ' + a3.qd) + '</span>' +
      '<div class="as-yj"><div class="as-yi"><b>宜</b>' + a3.yi + '</div><div class="as-ji"><b>忌</b>' + a3.ji + '</div></div>' +
      '<div class="as-meta">' + a3.chong + ' · 彭祖：' + a3.peng + '</div></div>';
  }
  h += '<p class="cal-legend">想挑大事的日子（面试/搬家/领证），翻到那个月点开看宜忌</p></div>';
return h;
}

/* ============ 智能训练规划（V61）：读已勾器械 → 自动生成一周居家计划 ============ */
function gymPool() {
  const eq = (state.ui && state.ui.equip) || [];
  const has = k => eq.indexOf(k) > -1;
  return GYM_MOVES.filter(m => !m.need || (m.need === 'dumb' && has('dumb')) || (m.need === 'band' && has('band')) || (m.need === 'jump' && has('jump')));
}
function gymPick(arr, n, used) {
  const rest = arr.filter(m => used.indexOf(m.id) === -1);
  const bag = rest.sort(() => Math.random() - 0.5);
  if (bag.length < n) bag.push.apply(bag, arr.filter(m => used.indexOf(m.id) === -1 && bag.indexOf(m) === -1).sort(() => Math.random() - 0.5));
  return bag.slice(0, n);
}
function genGymPlan() {
  const pool = gymPool();
  const by = k => pool.filter(m => m.kind === k);
  const legs = pool.filter(m => m.kind === 'strength' && ['腿部', '臀部'].indexOf(m.grp) > -1);
  const upper = pool.filter(m => m.kind === 'strength' && ['胸部', '背部', '肩部', '手臂'].indexOf(m.grp) > -1);
  const core = by('core'), cardio = by('cardio');
  const eq = (state.ui && state.ui.equip) || [];
  const walkName = { walk: '快走 30 分钟', run: '慢跑 20-30 分钟', tread: '跑步机快走/慢跑 30 分钟', swim: '游泳 30 分钟', ride: '骑行 30 分钟' };
  const walkItem = (eq.find(k => walkName[k]) || 'walk') && (eq.map(k => walkName[k]).filter(Boolean)[0] || null);
  const used = [];
  const L = () => { const p = gymPick(legs, 3, used); p.forEach(m => used.push(m.id)); return p; };
  const U = () => { const p = gymPick(upper.length ? upper : legs, 2, used); p.forEach(m => used.push(m.id)); return p; };
  const C = n => { const p = gymPick(core, n, used); p.forEach(m => used.push(m.id)); return p; };
  const A = n => { const p = gymPick(cardio, n, used); p.forEach(m => used.push(m.id)); return p; };
  const mk = (f, ms) => ({ f, ex: ms.map(m => ({ id: m.id })) });
  const days = [];
  /* 周一 下肢+核心 */
  days.push(mk('下肢 + 核心', L().concat(C(2))));
  /* 周二 上肢+核心 */
  days.push(mk('上肢 + 核心', U().concat(C(2))));
  /* 周三 有氧 */
  days.push(mk('有氧日', A(3).map(m => ({ id: m.id })).concat(walkItem ? [{ t: walkItem, s: '微微出汗就行' }] : []).concat(C(1).map(m => ({ id: m.id })))));
  /* 周四 休息 */
  days.push({ f: '休息日', ex: [{ t: '散步 / 拉伸', s: '让肌肉恢复，比硬练更出效果' }] });
  /* 周五 全身 */
  days.push(mk('全身日', L().slice(0, 2).concat(U()).concat(A(1)).concat(C(1))));
  /* 周六 有氧+核心 */
  days.push(mk('有氧 + 核心', A(2).map(m => ({ id: m.id })).concat(C(2).map(m => ({ id: m.id })))));
  /* 周日 休息 */
  days.push({ f: '休息日', ex: [{ t: '散步 / 拉伸', s: '每周休息 2 天，练得久才练得住' }] });
  return { gen: todayKey(), days };
}
/* ============ 跟练库（V80）：内置权威跟练视频 + 全网聚合搜索 ============
   视频均为 B 站人工核过的正规教学（帕梅拉官方搬运/周六野），B 站官方播放器嵌入 */
let fitTab = 'video', fitQ = '', fitCat = '全部', fitOpenBv = null, fitOpenCat = null, fitFactsOpen = false;
const FIT_CATS = ['全部', '燃脂HIIT', '有氧舞蹈', '腹肌马甲线', '低冲击友好', '拉伸放松'];
const FIT_VIDEOS = [
  { bv: 'BV1wL9sYEE8t', t: '20分钟有氧两千步 · 暴汗不跳', by: '帕梅拉PamelaReif 官方', cat: '低冲击友好', min: 21, lvl: '入门', kcal: 190 },
  { bv: 'BV14T9iYpEEg', t: '20分钟全身有氧操 · 低冲击新手友好', by: 'MadFit（官方搬运）', cat: '低冲击友好', min: 18, lvl: '入门', kcal: 150 },
  { bv: 'BV1fC4y117hk', t: '20分钟站立有氧 · 无跳跃快乐燃脂', by: 'fitbymik（官方搬运）', cat: '低冲击友好', min: 20, lvl: '入门', kcal: 160 },
  { bv: 'BV1yp4y1k7Gp', t: '20分钟全身初级 HIIT · 有休息', by: '帕梅拉', cat: '燃脂HIIT', min: 20, lvl: '入门', kcal: 180 },
  { bv: 'BV1uc411W7Hd', t: '20分钟全身燃脂 · 初级无装备', by: '帕梅拉', cat: '燃脂HIIT', min: 20, lvl: '入门', kcal: 170 },
  { bv: 'BV1kg4y1m7y5', t: '35分钟高效燃脂 + HIIT', by: '帕梅拉', cat: '燃脂HIIT', min: 35, lvl: '进阶', kcal: 320 },
  { bv: 'BV117411q7et', t: '40分钟 HIIT · 消耗400大卡', by: '周六野Zoey', cat: '燃脂HIIT', min: 40, lvl: '进阶', kcal: 400 },
  { bv: 'BV1wL9sYEE8t', t: '20分钟有氧两千步 · 暴汗燃脂', by: '帕梅拉', cat: '有氧舞蹈', min: 20, lvl: '入门', kcal: 150 },
  { bv: 'BV1xV411C7e9', t: '15分钟舞蹈燃脂 · 新手友好', by: '帕梅拉', cat: '有氧舞蹈', min: 15, lvl: '入门', kcal: 110 },
  { bv: 'BV1H7411E7uZ', t: '10分钟新手腹部训练', by: '帕梅拉', cat: '腹肌马甲线', min: 10, lvl: '入门', kcal: 70 },
  { bv: 'BV1kA411q7cH', t: '10分钟腹部训练 · 练就钢铁核心', by: '帕梅拉', cat: '腹肌马甲线', min: 10, lvl: '中级', kcal: 80 },
  { bv: 'BV1C14y157Kx', t: '20分钟腹部训练 · 15天马甲线', by: '帕梅拉', cat: '腹肌马甲线', min: 20, lvl: '进阶', kcal: 160 },
  { bv: 'BV13L4y1g72R', t: '10分钟侧腰曲线 · 马甲线线条', by: '帕梅拉', cat: '腹肌马甲线', min: 10, lvl: '中级', kcal: 80 },
  { bv: 'BV1X142147nu', t: '20分钟久坐全身拉伸 · 改善体态助眠', by: 'B站精选', cat: '拉伸放松', min: 20, lvl: '入门', kcal: 60 },
  { bv: 'BV1Sx411r7yZ', t: '5分钟运动前后热身拉伸', by: '周六野Zoey', cat: '拉伸放松', min: 5, lvl: '入门', kcal: 20 }
];
const FIT_FACTS = [
  { t: '减脂唯一原理：热量缺口', d: '每天少摄入 300~500 大卡，每周掉 0.5~1 斤是可持续速度。饿到掉头发那种会反弹。' },
  { t: '有氧和力量要一起练', d: '有氧烧脂肪效率高；力量练肌肉守住基础代谢——减脂期不练力量，掉的是肌肉不是肥肉。' },
  { t: '局部减脂不存在', d: '脂肪是全身一起消耗的，练哪瘦哪是伪科学。腹肌训练是练肌肉线条，减肚子靠整体缺口。' },
  { t: '体重每天波动很正常', d: '盐吃多了、睡前喝水、生理期都会让体重涨 1 斤上下——看趋势（7天平均），别看单天数字。' }
];
const FIT_LINKS = [
  { n: 'B站', u: 'https://search.bilibili.com/all?keyword=' },
  { n: '知乎', u: 'https://www.zhihu.com/search?type=content&q=' },
  { n: '小红书', u: 'https://www.xiaohongshu.com/search_result?keyword=' },
  { n: '抖音', u: 'https://www.douyin.com/search/' },
  { n: '快手', u: 'https://www.kuaishou.com/search/video?searchKey=' },
  { n: '微博', u: 'https://s.weibo.com/weibo?q=' }
];
const FIT_CAT_COLOR = { '燃脂HIIT': '#ff5a4e', '有氧舞蹈': '#ff8a3d', '腹肌马甲线': '#7c5cff', '低冲击友好': '#34a853', '拉伸放松': '#5aa0ff' };

/* V85 健身打卡：统计 */
function workoutStats() {
  const tk = todayKey();
  const has = k => !!(state.records[k] && state.records[k].workout && state.records[k].workout.done);
  let streak = 0;
  const cur = new Date();
  if (!has(tk)) cur.setDate(cur.getDate() - 1);
  for (let i = 0; i < 730; i++) {
    const k = cur.getFullYear() + '-' + ('0' + (cur.getMonth() + 1)).slice(-2) + '-' + ('0' + cur.getDate()).slice(-2);
    if (has(k)) { streak++; cur.setDate(cur.getDate() - 1); } else break;
  }
  let total = 0, week = 0;
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  Object.keys(state.records).forEach(k => {
    if (has(k)) {
      total++;
      const d = new Date(k + 'T12:00:00');
      if (d >= monday && d <= now) week++;
    }
  });
  return { streak, total, week, done: has(tk) };
}
function workoutDots() {
  let h = '';
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const k = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    const on = !!(state.records[k] && state.records[k].workout && state.records[k].workout.done);
    h += '<span class="wdot' + (on ? ' on' : '') + '"><i>' + d.getDate() + '</i></span>';
  }
  return h;
}
const WORKOUT_DEFAULT = '健身棒上举20+前举20+下举20+单臂各5 · 俯卧撑30 · 胯下击掌60 · 提踵45';
let wcalYM = null, wcalSel = null;
function workoutCalHTML() {
  const now = parseKey(todayKey());
  if (!wcalYM) wcalYM = { y: now.getFullYear(), m: now.getMonth() };
  const tk = todayKey();
  const first = new Date(wcalYM.y, wcalYM.m, 1);
  const startPad = first.getDay();
  const dim = new Date(wcalYM.y, wcalYM.m + 1, 0).getDate();
  const isCurMonth = wcalYM.y === now.getFullYear() && wcalYM.m === now.getMonth();
  let counted = 0;
  for (let d = 1; d <= (isCurMonth ? now.getDate() : dim); d++) {
    const r = state.records[dateKey(new Date(wcalYM.y, wcalYM.m, d))];
    if (r && r.workout && r.workout.done) counted++;
  }
  const cntTxt = isCurMonth ? '这个月练了 ' + counted + ' 次（截至今天）' : '这个月练了 ' + counted + ' 次';
  let cells = '';
  for (let i = 0; i < startPad; i++) cells += '<span class="cal-cell cal-pad"></span>';
  for (let d = 1; d <= dim; d++) {
    const k = dateKey(new Date(wcalYM.y, wcalYM.m, d));
    const r = state.records[k] || {};
    const on = !!(r.workout && r.workout.done);
    const future = k > tk;
    const cls = 'cal-cell' + (k === tk ? ' cal-today' : '') + (k === wcalSel ? ' cal-sel' : '') + (future ? ' cal-future' : '');
    cells += '<button class="' + cls + '" data-action="wcal-day" data-k="' + k + '"' + (future ? ' disabled' : '') + '>' +
      '<span class="cal-d">' + d + '</span><span class="cal-dots"><i class="' + (on ? 'wcal-on' : '') + '"></i></span></button>';
  }
  let detailHTML = '';
  if (wcalSel && wcalSel.slice(0, 7) === wcalYM.y + '-' + String(wcalYM.m + 1).padStart(2, '0')) {
    const r = state.records[wcalSel] || {};
    const dD = parseKey(wcalSel);
    const w = r.workout || {};
    detailHTML = '<div class="cal-detail">' +
      '<div class="cdd-head"><b>' + (dD.getMonth() + 1) + '月' + dD.getDate() + '日 · ' + WEEK_LABELS[dD.getDay()] + ' 训练详情</b>' +
        '<button class="cdd-close" data-action="wcal-close" aria-label="收起">✕</button></div>' +
      (w.done
        ? '<div class="cdd-person"><span class="wcal-badge">✓ 已打卡</span></div><p class="cdd-note">练了：' + esc(w.d || WORKOUT_DEFAULT) + '</p>' +
          (w.d ? '' : '<button class="btn ghost sm" data-action="wcal-undo" data-k="' + wcalSel + '" style="width:auto;display:inline-block;padding:8px 12px;font-size:12.5px">补错了？撤销</button>')
        : '<div class="fit-searchrow" style="margin-top:8px"><input class="text-input" id="wcal-note" type="search" placeholder="练了什么（可不填）">' +
          '<button class="btn sm" data-action="wcal-fill" data-k="' + wcalSel + '" style="width:auto">补打卡</button></div>' +
          '<p class="s-dim" style="margin:6px 0 0">补记到这天 · 连续和周目标会一起算</p>') +
    '</div>';
  }
  return '<div class="card">' +
    '<div class="cal-head">' +
      '<button class="cal-nav" data-action="wcal-prev" aria-label="上个月">‹</button>' +
      '<div class="cal-title"><b>训练日历 · ' + wcalYM.y + ' 年 ' + (wcalYM.m + 1) + ' 月</b><span class="cal-count">' + cntTxt + '</span></div>' +
      '<button class="cal-nav" data-action="wcal-next" aria-label="下个月">›</button>' +
    '</div>' +
    '<div class="cal-week">' + ['日','一','二','三','四','五','六'].map(w => '<span>' + w + '</span>').join('') + '</div>' +
    '<div class="cal-grid">' + cells + '</div>' +
    detailHTML +
    '<p class="cal-legend">实心点 = 那天打了卡 · 点任何一天看当天练了什么</p>' +
  '</div>';
}
const WK_GOAL = 3; /* 每周打卡目标（Keep 式） */
function wkProgress() {
  const now = parseKey(todayKey());
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const k = dateKey(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i));
    if (k > todayKey()) break;
    const r = state.records[k];
    if (r && r.workout && r.workout.done) n++;
  }
  return { n: n, goal: WK_GOAL };
}
function todayPlanHTML() {
  const p = state.ui.gymPlan;
  const wd = (parseKey(todayKey()).getDay() + 6) % 7; /* 周一=0 */
  const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  if (p && Array.isArray(p.days) && p.days[wd]) {
    const d = p.days[wd];
    const exs = d.ex.map(e => e.t || '动作').join(' · ');
    const isRest = d.f.indexOf('休息') > -1;
    return '<div class="card wtplan' + (isRest ? ' rest' : '') + '">' +
      '<div class="tp-head"><b>' + dayNames[wd] + '今日推荐 · ' + esc(d.f) + '</b>' +
      '<span class="tp-sub">' + (isRest ? '恢复日，别硬练' : p.gen + ' 生成') + '</span></div>' +
      '<p class="tp-exs">' + esc(exs) + '</p>' +
      '<div class="tp-row">' +
      '<button class="btn sm" data-action="fit-tab" data-v="plan" style="width:auto">看整周安排</button>' +
      '<button class="btn sm ghost" data-action="wt-punch" style="width:auto">练完打卡</button></div>' +
    '</div>';
  }
  return '<div class="card wtplan"><div class="tp-head"><b>' + dayNames[wd] + '今日推荐</b><span class="tp-sub">还没排计划</span></div>' +
    '<p class="tp-exs">先去「周计划」按你的器械排一周，这里每天告诉你该练什么</p>' +
    '<div class="tp-row"><button class="btn sm" data-action="fit-tab" data-v="plan" style="width:auto">去排周计划</button></div></div>';
}
function recentWorkoutsHTML() {
  const ks = Object.keys(state.records).filter(k => state.records[k].workout && state.records[k].workout.done).sort().reverse().slice(0, 8);
  if (!ks.length) return '';
  return '<div class="card"><h3 class="card-label">最近训练</h3>' +
    ks.map(k => {
      const d = parseKey(k);
      const w = state.records[k].workout || {};
      return '<div class="rw-row"><span class="rw-date">' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + WEEK_LABELS[d.getDay()] + '</span>' +
        '<span class="rw-what">' + esc((w.d || '已打卡') + '') + '</span></div>';
    }).join('') +
    '<p class="set-tip">点日历里的任何一天也能看当天的训练细节</p></div>';
}
function workoutCard() {
  const st = workoutStats();
  const rec = state.records[todayKey()] || {};
  const wd = rec.workout || {};
  let h = '<div class="wcard">';
  h += '<div class="wcard-h"><div><b>今日健身打卡</b><span>' + (st.done ? '今天已打卡' : '今天的还没记') + '</span></div>' +
    '<div class="wcard-nums"><div><b>' + st.streak + '</b><i>连续天</i></div><div><b>' + st.week + '</b><i>本周</i></div><div><b>' + st.total + '</b><i>累计</i></div></div></div>';
  if (wd.done) {
    h += '<p class="wcard-d">' + esc(wd.d || WORKOUT_DEFAULT) + '</p>';
    h += '<button class="btn ghost sm" data-action="wt-undo" style="width:auto;display:inline-block;padding:8px 12px;font-size:12.5px">记错了？撤销今天打卡</button>';
  } else {
    h += '<button class="btn wcard-btn" data-action="wt-punch">今天练了，打卡</button>';
    h += '<div class="fit-searchrow" style="margin-top:8px"><input class="text-input" id="wt-say" type="search" placeholder="做得不一样？说一句：俯卧撑只做了20个">' +
      '<button class="btn sm" data-action="wt-say" style="width:auto">记</button></div>';
  }
  const wp = wkProgress();
  const pct = Math.min(100, Math.round(wp.n / wp.goal * 100));
  h += '<div class="wk-goal"><div class="wk-goal-h"><span>本周目标 ' + wp.n + '/' + wp.goal + ' 次</span><span>' + (wp.n >= wp.goal ? '达标了，稳' : '还差 ' + (wp.goal - wp.n) + ' 次') + '</span></div>' +
    '<div class="wk-goal-bar"><div class="wk-goal-fill' + (wp.n >= wp.goal ? ' ok' : '') + '" style="width:' + pct + '%"></div></div></div>';
  h += '<div class="wdots">' + workoutDots() + '</div>';
  h += '<p class="sub" style="margin:6px 2px 0">圆点=打卡的日子 · 断没断一眼看出 · 想补打卡对 AI 管家说「补昨天健身」</p>';
  h += '</div>';
  return h;
}

function renderWorkout() {
  const el = document.getElementById('workout-body');
  if (el) el.innerHTML = workoutPageHTML();
  setupPageSort('workout');
}
function workoutPageHTML() {
  let h = '<div data-pssortanchor="1">' + workoutCard() + '</div>';
  h += '<div data-psortkey="plan">' + todayPlanHTML() + '</div>';
  h += '<div data-psortkey="cal">' + workoutCalHTML() + '</div>';
  const rw = recentWorkoutsHTML();
  if (rw) h += '<div data-psortkey="recent">' + rw + '</div>';
  let tail = '<div class="fit-seg" role="tablist" style="margin-top:12px">' +
    '<button class="fit-seg-btn' + (fitTab === 'video' ? ' on' : '') + '" data-action="fit-tab" data-v="video">在家跟练</button>' +
    '<button class="fit-seg-btn' + (fitTab === 'moves' ? ' on' : '') + '" data-action="fit-tab" data-v="moves">动作库 ' + GYM_MOVES.length + '</button>' +
    '<button class="fit-seg-btn' + (fitTab === 'plan' ? ' on' : '') + '" data-action="fit-tab" data-v="plan">周计划</button>' +
    '</div>';
  if (fitTab === 'moves') tail += gymLibBody();
  else if (fitTab === 'plan') tail += gymPlanBody();
  else tail += fitVideoSection();
  return h + '<div data-psortfixed="tail">' + tail + '</div>';
}
function fitHubBody() { return workoutPageHTML(); } /* V86 兼容壳：健身内容已上独立页 */
function fitVideoSection() {
  let h = '';
  /* 搜索框：内置库先查，全网一键直达 */
  h += '<p class="fit-sec">想练什么，直接搜</p><div class="fit-searchrow">' +
    '<input class="text-input" id="fit-q" type="search" placeholder="搜：减脂 / 马甲线 / 拉伸…" value="' + esc(fitQ) + '" onkeydown="if(event.key===\'Enter\'){this.blur();document.querySelector(\'[data-action=fit-search]\').click()}">' +
    '<button class="btn sm" data-action="fit-search" style="width:auto">搜</button></div>';
  const q = fitQ.trim().toLowerCase();
  if (q) {
    const hit = FIT_VIDEOS.filter(v => (v.t + v.by + v.cat).toLowerCase().indexOf(q) > -1);
    h += hit.length ? '<p class="sub" style="margin:10px 2px 4px">内置库 ' + hit.length + ' 个 · 点开直接练</p>' + fitVideoCards(hit) : '';
    h += '<div class="divider">全网找「' + esc(fitQ.trim()) + '」· 一键直达</div><div class="fit-links">' +
      FIT_LINKS.map(l => '<a class="fit-link" href="' + l.u + encodeURIComponent(fitQ.trim()) + '" target="_blank" rel="noopener">' + l.n + ' ↗</a>').join('') + '</div>' +
      '<p class="set-tip">抖音/小红书没有开放接口，App 里抓不了内容——点平台名直接跳到它们的搜索结果，看到好的视频号告诉我，我加进内置库</p>';
    return h;
  }
  /* 无搜索词：分类浏览 */
  h += '<div class="diet-tabs">' + FIT_CATS.map(c =>
    '<button class="set-chip' + (fitCat === c ? ' on' : '') + '" data-action="fit-cat" data-c="' + c + '">' + c + '</button>').join('') + '</div>';
  const vs = fitCat === '全部' ? FIT_VIDEOS : FIT_VIDEOS.filter(v => v.cat === fitCat);
  h += vs.length ? fitVideoCards(vs) : '<p class="sub" style="margin:14px 2px">这个分类的视频还在核实中（宁缺毋滥）· 想现在练就用上面搜索直达全网</p>';
  /* 权威知识卡 */
  h += '<button class="btn ghost sm" data-action="fit-facts" style="width:auto;display:inline-block;padding:8px 12px;font-size:12.5px;margin-top:14px">' + (fitFactsOpen ? '收起' : '为什么跟这些视频有用？') + '</button>';
  if (fitFactsOpen) {
    h += '<div class="fit-facts">' + FIT_FACTS.map(f =>
      '<div class="fit-fact"><b>' + f.t + '</b><span>' + f.d + '</span></div>').join('') + '</div>';
  }
  return h;
}
function fitVideoCards(vs) {
  return '<div class="fit-list">' + vs.map(v => {
    const c = FIT_CAT_COLOR[v.cat] || '#7c5cff';
    const open = fitOpenBv === v.bv && fitOpenCat === v.t;
    let h = '<div class="fit-card' + (open ? ' open' : '') + '">';
    h += '<button class="fit-cover" data-action="fit-open" data-bv="' + v.bv + '" data-t="' + esc(v.t) + '" style="--fitc:' + c + '">' +
      (BV_COVERS[v.bv] ? '<img class="fit-cover-img" src="' + BV_COVERS[v.bv] + '" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.remove()">' : '') +
      '<span class="fit-min"><b>' + v.min + '</b><i>分钟</i></span>' +
      '<span class="fit-play">▶</span>' +
      '<span class="fit-lvl">' + v.lvl + '</span>' +
      '<span class="fit-cat-chip">' + v.cat + '</span></button>';
    h += '<div class="fit-info"><b>' + esc(v.t) + '</b>' +
      '<div class="fit-meta"><span>' + v.by + '</span><span>' + v.min + ' 分钟</span><span>' + v.lvl + '</span><span>≈' + v.kcal + ' 大卡</span></div></div>';
    if (open) {
      h += '<div class="gym-video"><iframe src="https://player.bilibili.com/player.html?bvid=' + v.bv + '&autoplay=1&danmaku=0" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" title="' + esc(v.t) + ' 跟练视频"></iframe></div>' +
        '<a class="btn ghost sm" href="https://www.bilibili.com/video/' + v.bv + '" target="_blank" rel="noopener" style="width:auto;display:inline-block;padding:8px 12px;font-size:12px;text-decoration:none;margin-top:8px">卡顿？去 B 站看原视频 ↗</a>';
    }
    return h + '</div>';
  }).join('') + '</div>';
}

function gymMoveChip(m) {
  return '<button class="set-chip gym-chip" data-action="gym-open" data-id="' + m.id + '" data-back="' + (curWidget || 'gym-lib') + '">' + m.n + '<i>' + m.grp + '</i></button>';
}
/* V84: 动作库（场景+部位 双筛选，分区行式列表） */
let gymFilter = '全部';
let gymScene = 'all';
const GYM_HOME_NEEDS = [null, 'dumb', 'band', 'jump', 'bar'];
const GYM_NEED_NAME = { dumb: '哑铃', band: '弹力带', jump: '跳绳', bar: '单杠', gym: '健身房器械' };
function gymSceneOf(m) { return GYM_HOME_NEEDS.indexOf(m.need) > -1 ? 'home' : 'gym'; }
function gymNeedName(m) { return m.need ? (GYM_NEED_NAME[m.need] || m.need) : '徒手'; }
const GYM_CATS = ['全部', '腹肌', '腿部', '臀部', '胸部', '背部', '肩部', '手臂', '有氧', '全身'];
function gymLibBody() {
  let h = '<p class="sub">每个动作配 B 站正规教学视频（教练/科学健身频道逐一核实）· 点动作看视频，组次休息都写清</p>';
  /* 场景：在家 / 健身房 */
  h += '<div class="fit-seg" role="tablist">' +
    '<button class="fit-seg-btn' + (gymScene === 'all' ? ' on' : '') + '" data-action="gym-scene" data-v="all">全部 ' + GYM_MOVES.length + '</button>' +
    '<button class="fit-seg-btn' + (gymScene === 'home' ? ' on' : '') + '" data-action="gym-scene" data-v="home">在家练</button>' +
    '<button class="fit-seg-btn' + (gymScene === 'gym' ? ' on' : '') + '" data-action="gym-scene" data-v="gym">健身房</button>' +
    '</div>';
  /* 部位筛选 */
  h += '<div class="diet-tabs">' + GYM_CATS.map(c =>
    '<button class="set-chip' + (gymFilter === c ? ' on' : '') + '" data-action="gym-filter" data-c="' + c + '">' + c + '</button>').join('') + '</div>';
  const pool = GYM_MOVES.filter(m => (gymScene === 'all' || gymSceneOf(m) === gymScene) && (gymFilter === '全部' || m.grp === gymFilter));
  if (!pool.length) {
    h += '<p class="sub" style="margin:14px 2px">这个组合暂时没动作——换个部位或场景看看</p>';
  } else if (gymFilter !== '全部') {
    h += gymSection(gymFilter, pool);
  } else {
    /* 部位分区：胸→背→肩→手臂→腿→臀→腹肌→全身→有氧 */
    GYM_CATS.filter(c => c !== '全部').forEach(c => {
      const ms = pool.filter(m => m.grp === c);
      if (ms.length) h += gymSection(c, ms);
    });
  }
  h += '<p class="set-tip">腹部新手路径：卷腹摸膝 → 卷腹 → 反向卷腹 → 空中蹬车 → 平板支撑，每组都能保证动作质量再加难度</p>';
  return h;
}
function gymSection(title, ms) {
  let h = '<div class="gym-sec">';
  h += '<div class="gym-sec-h"><b>' + title + '</b><span>' + ms.length + ' 个动作</span></div>';
  h += ms.map(m =>
    '<button class="gym-row" data-action="gym-open" data-id="' + m.id + '" data-back="' + (curWidget || 'gym-lib') + '">' +
    (BV_COVERS[m.bv] ? '<img class="gym-row-img" src="' + BV_COVERS[m.bv] + '" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.remove()">' : '') +
    '<span class="gym-row-t"><b>' + m.n + '</b><em>' + gymNeedName(m) + ' · ' + m.sets + ' · ' + esc(m.by || 'B站教学') + '</em></span>' +
    '<i class="gym-row-p">▶</i></button>').join('');
  h += '</div>';
  return h;
}
/* V62: 训练规划内容 */
function gymPlanBody() {
  const eq = (state.ui && state.ui.equip) || [];
  const eqNames = eq.map(k => { const e = EQUIP_LIST.find(x => x.k === k); return e ? e.n : k; });
  const pool = gymPool();
  const p = state.ui.gymPlan;
  let h = '';
  if (eqNames.length) h += '<div class="divider">自动识别到你的器械</div><div class="gym-chips">' + eqNames.map(n => '<span class="set-chip on gym-eq">' + esc(n) + '</span>').join('') + '</div>';
  else h += '<div class="key-line">还没勾器械——纯徒手也能练 · 去「健康营 → 运动与器械」勾上家里有的，计划会更准</div>';
  h += '<p class="sub">当前可选动作 ' + pool.length + ' 个（徒手永远在池子里 · 没勾的器械绝不会出现）</p>';
  if (p && Array.isArray(p.days)) {
    h += '<div class="divider">本周安排（' + p.gen + ' 生成）</div>';
    p.days.forEach((d, i) => {
      h += '<div class="gym-day"><b>周' + '一二三四五六日'[i] + ' · ' + esc(d.f) + '</b>' +
        d.ex.map(e => {
          if (e.t) return '<span class="gym-ex"><i class="dotc" style="background:var(--text3)"></i>' + esc(e.t) + '<em>' + esc(e.s || '') + '</em></span>';
          const m = GYM_MOVES.find(x => x.id === e.id);
          return m ? '<button class="gym-ex gym-link" data-action="gym-open" data-id="' + m.id + '" data-back="gym-plan"><i class="dotc" style="background:' + COLORS.me + '"></i>' + m.n + '<em>' + m.sets + '</em><u>看视频</u></button>' : '';
        }).join('') + '</div>';
    });
  }
  h += '<button class="btn ghost sm" data-action="gym-gen" style="width:auto;display:inline-block;padding:9px 14px;font-size:13px">' + (p ? '换一套安排' : '生成一周计划') + '</button>';
  h += '<p class="set-tip">按「减脂+新手」配的量：力量 3 组、核心 3 组、有氧 30 秒起步 · 哪天累就挪到第二天，别硬顶</p>';
  return h;
}
/* V65: 餐段标签页 + 说话式识别 + 购物车一键记 */
function dietBody() {
  const r = state.records[dietDate] || {};
  const items = (r.diet || []).filter(d => d.w === dietWho);
  const sum = items.reduce((a, b) => a + (b.k || 0), 0);
  const avg7 = Math.round(lastNDays(7).reduce((a, k) => a + dietDaySum(k, dietWho), 0) / 7);
  const mealSum = items.filter(d => d.m === dietMeal).reduce((a, b) => a + (b.k || 0), 0);
  const mealItems = items.filter(d => d.m === dietMeal);
  let h = '<div class="diet-top">' +
    '<div class="gym-chips">' + PERSON_IDS.map(p =>
      '<button class="set-chip' + (p === dietWho ? ' on' : '') + '" data-action="diet-who" data-w="' + p + '">' + esc(state.names[p]) + '</button>').join('') + '</div>' +
    '<div class="diet-date"><button class="icon-btn" data-action="diet-day" data-d="-1" aria-label="前一天">‹</button>' +
    '<b>' + (dietDate === todayKey() ? '今天' : fmtCN(dietDate)) + '</b>' +
    '<button class="icon-btn" data-action="diet-day" data-d="1" aria-label="后一天"' + (dietDate >= todayKey() ? ' disabled' : '') + '>›</button></div></div>';
  /* V73: 减脂参考按人给——你们共用组件，女生的参考线不该用男生的数 */
  const target = dietWho === 'me' ? 1800 : 1500;
  h += '<div class="diet-sum"><b>' + sum + '</b><span>kcal 今天合计 · ' + esc(state.names[dietWho]) + '</span></div>' +
    '<div class="diet-ref"><b>减脂参考</b>' + (dietWho === 'me'
      ? '175cm / 72kg 每天吃 1500-1800 kcal 大概率掉秤'
      : '女生减脂每天 1200-1500 kcal 比较稳（比男生低，代谢差在肌肉量）') +
    ' · 最近 7 天平均 <b>' + avg7 + ' kcal</b> · 都是估算，量准了再抠</div>';
  /* V73: 最近 7 天摄入迷你柱图——哪天吃爆了一眼看穿，点柱子跳到那天 */
  (function () {
    const days7 = lastNDays(7);
    const vals = days7.map(k => dietDaySum(k, dietWho));
    const maxV = Math.max(target * 1.3, ...vals, 200);
    h += '<div class="sec-title" style="margin-top:14px">最近 7 天吃了多少<i>点柱子看那天</i></div>';
    h += '<div class="diet-bars">' + days7.map((k, i) => {
      const v = vals[i];
      const pct = v ? Math.max(8, Math.round(v / maxV * 100)) : 0;
      const d = parseKey(k);
      return '<div class="diet-bar' + (v > target ? ' over' : '') + (k === dietDate ? ' cur' : '') +
        '" data-action="diet-goto" data-key="' + k + '" role="button" aria-label="' + k + ' 摄入 ' + v + ' 千卡">' +
        '<i>' + (v ? v : '·') + '</i>' +
        '<div class="bar-zone"><div class="bar-fill"' + (v ? ' style="height:' + pct + '%"' : ' style="height:3px;opacity:.25"') + '></div></div>' +
        '<b>' + (d.getMonth() + 1) + '/' + d.getDate() + '</b></div>';
    }).join('') + '</div>';
    const overDays = days7.filter((k, i) => vals[i] > target).length;
    h += '<div class="diet-ref"><b>怎么看</b>橙色柱 = 超过参考线 ' + target + ' kcal · ' +
      (overDays ? '最近 7 天有 ' + overDays + ' 天超线，超线不等于前功尽弃，第二天回来就行' : '最近 7 天全部在线内，控得很稳') + ' · 没柱 = 那天没记饮食</div>';
  })();
  /* 餐段标签页：点谁显示谁 */
  h += '<div class="diet-tabs">' + ['b', 'l', 'd', 's'].map(mk =>
    '<button class="diet-tab' + (dietMeal === mk ? ' on' : '') + '" data-action="diet-meal" data-m="' + mk + '">' +
    '<b>' + DIET_MEALS[mk] + '</b><i>' + (items.filter(d => d.m === mk).length ? items.filter(d => d.m === mk).reduce((a, b) => a + b.k, 0) + ' kcal' : '未记') + '</i></button>').join('') + '</div>';
  h += '<div class="diet-meal-card">';
  h += '<div class="sec-title">' + DIET_MEALS[dietMeal] + '<i>' + mealSum + ' kcal</i></div>';
  h += mealItems.length
    ? mealItems.map(d => '<div class="diet-item"><span>' + esc(d.n) + '</span><i>约 ' + d.k + ' kcal</i>' +
        '<button class="icon-btn diet-del" data-action="diet-del" data-idx="' + (r.diet || []).indexOf(d) + '" aria-label="删除">×</button></div>').join('')
    : '<p class="s-dim" style="padding:4px 2px 8px">这一餐还没记 · 在下面说一句就记上</p>';
  h += '</div>';
  /* 说话式识别 */
  h += '<div class="sec-title">说一句就记<i>自动算热量</i></div>' +
    '<div class="diet-say"><input class="text-input" id="diet-say" placeholder="如：在海底捞吃了毛肚和虾滑，喝了两瓶啤酒" enterkeyhint="done">' +
    (voiceSupport() ? '<button class="mic-btn" data-action="voice" data-for="diet-say" aria-label="语音输入">' + MIC_SVG + '</button>' : '') +
    '<button class="btn" data-action="diet-parse">识别</button></div>';
  if (dietParsed.length) {
    h += '<div class="diet-pv"><div class="sec-title">识别结果<i>' + dietParsed.length + ' 样 · 核对后记上</i></div>' + dietParsed.map((p, i) =>
      '<div class="diet-item' + (p.k === null ? ' diet-unknown' : '') + '"><span>' + (p.k === null ? '❓ ' : '') + esc(p.n) + '</span>' +
      (p.k === null
        ? '<input class="text-input diet-pv-k" type="number" inputmode="numeric" placeholder="千卡" style="max-width:76px;padding:6px 8px;font-size:12px">'
        : '<i>约 ' + p.k + ' kcal</i>') +
      '<button class="icon-btn diet-del" data-action="diet-pv-del" data-i="' + i + '" aria-label="移除">×</button></div>').join('') +
      '<button class="btn" data-action="diet-add-batch" style="margin-top:10px">全部记到「' + DIET_MEALS[dietMeal] + '」</button>' +
      '<p class="set-tip">❓ 的是没认出来的，给的是类别估算值，框里可以改成准的</p></div>';
  }
  /* 速查：点一下进清单 */
  h += '<div class="sec-title">常见的 · 点一下加进清单</div><div class="gym-chips food-chips">' +
    FOOD_DB.map((f, i) => '<button class="set-chip" data-action="diet-pick" data-i="' + i + '">' + esc(f.n) + ' <i>≈' + f.k + '</i></button>').join('') + '</div>' +
    '<p class="set-tip">库里没有的就打字说，按类别自动估</p>';
  return h;
}

function trendBody() {
  const keys = sortedKeys();
  if (keys.length >= 5) {
    const fr = PERSON_IDS.map(forecastRowHTML).join('');
    if (fr) return '<p class="sub">按最近 14 天的真实速度算，不是拍脑袋 · 速度变了日期自动变</p>' + fr;
  }
  return '<p class="sub">记录攒够 5 天就能预测——按现在的节奏，下周就有答案</p>';
}
/* V64: 运动与器械（从设置搬来，紧挨训练规划） */
function equipBody() {
  return '<p class="sub">勾上你会做的和家里有的，周计划和训练规划都按这个排</p>' +
    '<div class="equip-grid">' +
    EQUIP_LIST.map(t =>
      '<button class="set-chip' + ((state.ui.equip || []).indexOf(t.k) > -1 ? ' on' : '') + '" data-action="toggle-equip" data-v="' + t.k + '">' +
      ((state.ui.equip || []).indexOf(t.k) > -1 ? '✓ ' : '') + t.n + '</button>'
    ).join('') +
    ((state.ui.equip || []).filter(x => !EQUIP_LIST.some(e => e.k === x)).map(x =>
      '<button class="set-chip on" data-action="toggle-equip" data-v="' + x + '">✓ ' + esc(x) + '</button>'
    ).join('')) +
    '<button class="set-chip equip-add" data-action="equip-add">＋ 自定义</button>' +
    '</div>' +
    '<button class="btn sm" data-action="regen-plan" style="margin-top:12px">按我的器械重排周计划</button>' +
    '<p class="set-tip">重排后仍可去统计页逐天微调 · 没勾的器械不会出现在安排里 · 智能训练规划读的也是这份清单</p>';
}
/* V64: 数据与同步（云备份+双人同步+CSV+合并，全归一处） */
function dataBody() {
  let h = '';
  if (ghConf) {
    h += '<div class="divider">云备份 · 已开通</div>' +
      '<div class="key-line">✓ 数据已自动上云 —— 手机丢了、换新机，记录都在</div>' +
      '<p class="sub">每次记录后自动备份（' + (ghConf.provider === 'gitee' ? 'Gitee 国内通道' : 'GitHub') + ' · 私有仓库 ' + esc(ghConf.owner) + '/' + esc(ghConf.repo) + '，只有你能看）</p>' +
      '<p class="s-dim" style="margin-bottom:10px">上次同步：' + lastSyncText() + '</p>' +
      '<div class="settings-btns"><button class="btn" data-action="cloud-sync">立即同步</button><button class="btn ghost sm" data-action="cloud-restore">从云端恢复</button></div>';
  } else {
    h += '<div class="divider">云备份 · 还没开通</div>' +
      '<p class="sub">开通后数据自动上云，手机丢了也不怕。推荐用 Gitee 私人令牌（国内网络稳定）。粘贴令牌：</p>' +
      '<textarea class="json-area cloud-area" placeholder="粘贴配置链接或授权码" spellcheck="false"></textarea>' +
      '<button class="btn" data-action="cloud-setup">开通自动云备份</button>';
  }
  h += '<div class="divider">双人同步 · 她用她的手机记</div>' +
    '<p class="sub">各记各的，云端自动合并 —— 你打开 App 就能看到她的最新记录。云端仓库和钥匙都在你的账号里，给她的钥匙随时可作废。</p>' +
    '<button class="btn sm" data-action="copy-app-link">📋 把 App 链接发给她</button>' +
    '<div class="divider">这台手机默认记谁（快捷指令记录用）</div>' +
    '<div class="settings-btns">' +
    PERSON_IDS.map(p => '<button class="btn ' + (deviceOwner() === p ? '' : 'ghost') + '" data-action="set-owner-' + p + '">' + esc(state.names[p]) + (deviceOwner() === p ? ' ✓' : '') + '</button>').join('') +
    '</div>' +
    '<div class="divider">存档 · 导出与合并</div>' +
    '<button class="btn ghost sm" data-action="export-csv" style="width:auto;display:inline-block;padding:9px 14px;font-size:13px">导出 CSV</button>' +
    '<div class="divider">她发来的备份 · 粘贴进来只补不删</div>' +
    '<textarea class="merge-area json-area" placeholder="粘贴 Tina 发来的备份文本或存档链接" spellcheck="false" style="min-height:64px"></textarea>' +
    '<button class="btn" data-action="import-merge" style="width:auto;display:inline-block;padding:9px 14px;font-size:13px">合并导入（只补不删）</button>' +
    '<p class="set-tip">饮食和体重都在备份里 · 建议每周导一次 CSV 存档</p>';
  return h;
}
function remindBody() {
  return '<p class="s-dim" style="margin-bottom:8px">① 打开 iPhone「快捷指令」App → 底部「自动化」→「新建」→ 选「特定时间」，设为每天早上 7:30<br>② 添加操作：搜「获取文本」，填「输入」→ 把文本设为你输入的数字<br>③ 再添加操作：搜「URL」，粘贴下面的网址（末尾换成「快捷指令变量」）→ 最后搜「打开 URL」<br>④ 完成</p>' +
    '<button class="btn ghost sm" data-action="copy-shortcut-url" style="width:auto;display:inline-block;padding:9px 14px;font-size:13px">复制要用的网址</button>';
}

/* ============ 健康营组件宫格（V62）：点组件弹大弹层 ============ */
function W_ICON(d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; }
const WIDGET_ICONS = {
  ai: W_ICON('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/><path d="M5 16l.7 1.6L7.4 18l-1.7.4L5 20l-.7-1.6L2.6 18l1.7-.4z"/>'),
  astro: W_ICON('<path d="M12 3l2.2 5.6L20 11l-5.8 2.4L12 19l-2.2-5.6L4 11l5.8-2.4z"/><path d="M19 3.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>'),
  zodiac: W_ICON('<circle cx="12" cy="12" r="9"/><path d="M7.5 9.5l4.5 3 4.5-3M7.5 14.5l4.5 3 4.5-3"/>'),
  diet: W_ICON('<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>'),
    'fit-hub': W_ICON('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'),
  'gym-lib': W_ICON('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'),
  'gym-plan': W_ICON('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
  equip: W_ICON('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'),
  trend: W_ICON('<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>'),
  review: W_ICON('<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.89"/>'),
  data: W_ICON('<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>'),
  remind: W_ICON('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>')
};
const WIDGETS = [
  { id: 'ai', t: 'AI 管家', sub: '说话就能记 · 问什么答什么' },
  { id: 'diet', t: '饮食日记', sub: '三餐+热量，减脂第一线' },
  { id: 'equip', t: '运动与器械', sub: '勾上家里有的，计划更准' },
  { id: 'trend', t: '趋势预测', sub: '几号到目标，按真实速度' },
  { id: 'data', t: '数据与同步', sub: '云备份 · 双人同步 · 存档' },
  { id: 'review', t: '年度回顾', sub: '这一年你们的变化' },
  { id: 'remind', t: '称重提醒', sub: '每天早上弹窗提醒' },
  { id: 'astro', t: '黄道吉日', sub: '黄历 · 宜忌 · 挑日子' },
  { id: 'zodiac', t: '星座运势', sub: '档案 · 幸运物 · 今日运势' }
];
let curWidget = null, widgetBack = null;
function openGroup(gid, store) {
  store = store || 'tools';
  const groups = store === 'stats' ? state.ui.statsGroups : state.ui.toolsGroups;
  const g = groups && groups[gid];
  if (!g) { if (store === 'stats') renderStats(); else renderTools(); return; }
  document.getElementById('widget-sheet-title').textContent = g.name;
  document.getElementById('widget-sheet').classList.add('show');
  document.getElementById('sheet-mask').classList.add('show');
  curWidget = 'group:' + gid;
  let b = '<p class="sub" style="margin:2px 2px 12px">文件夹 · ' + g.items.length + ' 个' + (store === 'stats' ? '格子' : '组件') + '</p>';
  g.items.forEach(function (iid) {
    if (store === 'stats') {
      const m = STAT_META[iid];
      if (!m) return;
      b += '<button class="wg-item" data-action="open-stat" data-v="' + iid + '" style="width:100%;margin-bottom:10px">' +
        '<span class="wg-f-ico"><span style="font-size:18px">' + m.ico + '</span></span><b>' + m.n + '</b><span>点开看完整分析</span></button>';
      return;
    }
    const w = WIDGETS.find(x => x.id === iid);
    if (!w) return;
    b += '<button class="wg-item" data-action="widget-open" data-id="' + iid + '" style="width:100%;margin-bottom:10px">' +
      WIDGET_ICONS[iid] + '<b>' + w.t + '</b><span>' + w.sub + '</span></button>';
  });
  b += '<div style="display:flex;gap:8px;margin-top:14px">' +
    '<button class="btn ghost sm" data-action="group-act" data-op="rename" data-id="' + gid + '" data-store="' + store + '" style="flex:1">改名</button>' +
    '<button class="btn ghost sm" data-action="group-act" data-op="dissolve" data-id="' + gid + '" data-store="' + store + '" style="flex:1;color:#c0392b">解散文件夹</button></div>' +
    '<p class="as-src" style="margin-top:10px">解散后' + (store === 'stats' ? '格子' : '组件') + '会按原位置放回</p>';
  document.getElementById('widget-body').innerHTML = b;
  document.getElementById('widget-sheet-body').scrollTop = 0;
}
function groupAct(op, gid, wid, store) {
  store = store || 'tools';
  const groups = store === 'stats' ? state.ui.statsGroups : state.ui.toolsGroups;
  const g = groups && groups[gid];
  if (!g) return;
  if (op === 'rename') {
    const name = prompt('文件夹名字（最多 8 个字）', g.name);
    if (name && name.trim()) {
      g.name = name.trim().slice(0, 8);
      persist(); renderTools();
      if (curWidget === 'group:' + gid) { openGroup(gid); }
      toast('✓ 已改名「' + g.name + '」');
    }
  } else if (op === 'dissolve') {
    if (store === 'stats') {
      const flow = statFlow(); const at = flow.indexOf(gid);
      if (at > -1) {
        flow.splice(at, 1);
        g.items.forEach(function (iid, i) { flow.splice(at + i, 0, iid); });
      }
      delete state.ui.statsGroups[gid];
      state.ui.statsOrder = flow;
      persist(); renderStats();
    } else {
    const flow = toolsFlow(); const at = flow.indexOf(gid);
    if (at > -1) {
      flow.splice(at, 1);
      g.items.forEach(function (iid, i) { flow.splice(at + i, 0, iid); });
    }
    delete state.ui.toolsGroups[gid];
    state.ui.toolsOrder = flow;
    persist(); renderTools();
    }
    document.getElementById('widget-sheet').classList.remove('show');
    document.getElementById('sheet-mask').classList.remove('show');
    curWidget = null;
    toast('✓ 文件夹已解散，' + (store === 'stats' ? '格子' : '组件') + '放回原位');
  }
}
function openWidget(id) {
  if (id === 'gym-lib') { fitTab = 'moves'; switchTab('workout'); refreshWorkoutUI(); return; } /* V86: 动作库并入健身页 */
  const w = WIDGETS.find(x => x.id === id);
  if (!w) return;
  curWidget = id; widgetBack = null;
  renderWidgetSheet(w.t);
  /* V63 保险：下一帧校验标题与内容一致，不一致强制重渲一次 */
  setTimeout(function () {
    const tEl = document.getElementById('widget-sheet-title');
    if (tEl && tEl.textContent !== w.t && curWidget === id) renderWidgetSheet(w.t);
  }, 60);
  document.getElementById('sheet-mask').classList.add('show');
  document.getElementById('widget-sheet').classList.add('show');
}
function renderWidgetSheet(title, backLabel) {
  const tEl = document.getElementById('widget-sheet-title');
  const bEl = document.getElementById('widget-body');
  if (!tEl || !bEl) return;
  tEl.textContent = title;
  let body = '';
  if (backLabel) body += '<button class="btn ghost sm" data-action="widget-back" style="width:auto;display:inline-block;padding:7px 12px;font-size:12px;margin-bottom:10px">‹ ' + backLabel + '</button>';
  try {
    if (curWidget === 'ai') body += aiChatBody();
    else if (curWidget === 'diet') body += dietBody();
    else if (curWidget === 'fit-hub') body += fitHubBody();
    else if (curWidget === 'gym-lib') body += fitHubBody();
    else if (curWidget === 'gym-plan') body += gymPlanBody();
    else if (curWidget === 'equip') body += equipBody();
    else if (curWidget === 'trend') body += trendBody();
    else if (curWidget === 'review') body += yearReviewHTML();
    else if (curWidget === 'data') body += dataBody();
    else if (curWidget === 'remind') body += remindBody();
    else if (curWidget === 'astro') body += astroBody();
    else if (curWidget === 'zodiac') body += zodiacBody();
    else body += '<p class="sub">这个组件内容走丢了，重新点一下试试</p>';
  } catch (err) {
    /* V63 保险丝：内容函数抛错时也要切换 body，绝不出现标题/内容错位 */
    body += '<p class="sub">内容加载出错（' + esc(String(err.message || err)) + '）· 关掉重开一次就好，数据没丢</p>';
  }
  bEl.innerHTML = body;
}
/* ===== V93 长按拖拽排序引擎（iOS 桌面逻辑）：长按拿起→拖动→松手落位；拖到另一张卡正中=打包成文件夹 ===== */
let dragCtx = null;
function attachDrag(gridSel, itemSel, idFn, mode) {
  const grid = document.querySelector(gridSel);
  if (!grid || grid.dataset.dragBound === '1') return;
  grid.dataset.dragBound = '1';
  grid.addEventListener('touchstart', function (e) {
    const card = e.target.closest(itemSel);
    if (!card || dragCtx) return;
    const t = e.touches[0];
    dragCtx = { card, id: idFn(card), x: t.clientX, y: t.clientY, t0: Date.now(), mode, gridSel, itemSel, armed: false, mv: null, up: null };
    dragCtx.timer = setTimeout(function () { armDrag(dragCtx); }, 480);
    /* 未拿起就抬手 → 取消长按 */
    document.addEventListener('touchend', function cancel() {
      document.removeEventListener('touchend', cancel);
      document.removeEventListener('touchmove', cancelMv);
      if (dragCtx && !dragCtx.armed) { if (dragCtx.timer) clearTimeout(dragCtx.timer); dragCtx = null; }
    });
    /* 未拿起就滚动超过 12px → 取消 */
    const cancelMv = function (e2) {
      if (dragCtx && !dragCtx.armed && Math.hypot(e2.touches[0].clientX - dragCtx.x, e2.touches[0].clientY - dragCtx.y) > 12) {
        if (dragCtx.timer) clearTimeout(dragCtx.timer); dragCtx = null;
      }
    };
    document.addEventListener('touchmove', cancelMv, { passive: true });
  }, { passive: true });
}
let suppressClickUntil = 0;
function armDrag(ctx) {
  if (!dragCtx || dragCtx !== ctx) return;
  ctx.armed = true;
  if (navigator.vibrate) navigator.vibrate(10);
  /* iPhone 桌面式：拖动卡浮起脱离文档流，原位留占位框，其他卡实时让位滑动 */
  const cr = ctx.card.getBoundingClientRect();
  ctx.ph = document.createElement('div');
  ctx.ph.className = 'drag-ph';
  ctx.ph.style.height = cr.height + 'px';
  ctx.card.classList.add('dragging');
  ctx.card.style.width = cr.width + 'px';
  ctx.card.style.height = cr.height + 'px';
  ctx.card.style.left = cr.left + 'px';
  ctx.card.style.top = cr.top + 'px';
  ctx.card.parentElement.insertBefore(ctx.ph, ctx.card);
  ctx.contRect = ctx.ph.parentElement.getBoundingClientRect();
  toast('已拿起 · 松手=移动位置；压住卡片中心半秒=打包成文件夹');
  dragCtx.hoverTimer = setInterval(function () {
    if (!dragCtx || !dragCtx.armed || dragCtx.lx == null) return;
    /* 用最后手指位置主动判定：压在某卡中心区 400ms → 打包提示 */
    let hit = null;
    document.querySelectorAll(dragCtx.gridSel + ' ' + dragCtx.itemSel).forEach(function (c) {
      if (c === dragCtx.card) return;
      const r = c.getBoundingClientRect();
      const near = Math.hypot(dragCtx.lx - (r.left + r.width / 2), dragCtx.ly - (r.top + r.height / 2)) < Math.min(r.width, r.height) * 0.45;
      if (dragCtx.lx > r.left && dragCtx.lx < r.right && dragCtx.ly > r.top && dragCtx.ly < r.bottom && near) hit = c;
    });
    if (hit) {
      const cid = hit.getAttribute('data-v') || hit.getAttribute('data-id');
      if (dragCtx.hoverId !== cid) { dragCtx.hoverId = cid; dragCtx.hoverT = Date.now(); }
      else if (Date.now() - dragCtx.hoverT > 400) hit.classList.add('merge-hint');
    } else {
      dragCtx.hoverId = null;
      document.querySelectorAll('.merge-hint').forEach(c => c.classList.remove('merge-hint'));
    }
  }, 150);
  document.addEventListener('touchmove', ctx.mv = function (e) {
    if (!dragCtx || !dragCtx.armed) return;
    e.preventDefault();
    const t = e.touches[0];
    dragCtx.lx = t.clientX; dragCtx.ly = t.clientY;
    dragCtx.card.style.transform = 'translate(' + (t.clientX - dragCtx.x) + 'px,' + (t.clientY - dragCtx.y) + 'px) scale(1.05)';
    /* 边缘自动滚动（拖到屏幕上下边页面自己滚） */
    const edge = 72;
    if (t.clientY < edge) window.scrollBy(0, -(edge - t.clientY) * 0.35);
    else if (t.clientY > window.innerHeight - edge) window.scrollBy(0, (t.clientY - (window.innerHeight - edge)) * 0.35);
    /* 实时让位：手指在某卡上（且非悬停合并态）→ 占位框移到它旁边，其他卡 FLIP 滑动 */
    let hitEl = null;
    document.querySelectorAll(dragCtx.gridSel + ' ' + dragCtx.itemSel).forEach(function (c) {
      if (c === dragCtx.card || hitEl) return;
      const r = c.getBoundingClientRect();
      if (t.clientX > r.left && t.clientX < r.right && t.clientY > r.top && t.clientY < r.bottom) hitEl = c;
    });
    if (hitEl && !hitEl.classList.contains('merge-hint') && Date.now() - (dragCtx.lastSwap || 0) > 90) {
      const r = hitEl.getBoundingClientRect();
      const before = t.clientY < r.top + r.height / 2;
      const ph = dragCtx.ph;
      const phNext = ph.nextElementSibling, phPrev = ph.previousElementSibling;
      const wantNext = before ? hitEl : hitEl.nextElementSibling;
      if (phNext !== wantNext) {
        dragCtx.lastSwap = Date.now();
        /* FLIP：记录旧位 → 移占位框 → 差值反向 → 过渡归零 */
        const moving = [...ph.parentElement.children].filter(el => el !== dragCtx.card && el !== ph && !el.classList.contains('dragging') && el.style.position !== 'fixed');
        const olds = new Map();
        moving.forEach(el => { const rr = el.getBoundingClientRect(); if (rr.width || rr.height) olds.set(el, rr); });
        ph.parentElement.insertBefore(ph, wantNext);
        olds.forEach(function (o, el) {
          const n = el.getBoundingClientRect();
          const dx = o.left - n.left, dy = o.top - n.top;
          if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            el.style.transition = 'none';
            el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
            el.getBoundingClientRect();
            el.style.transition = 'transform .24s cubic-bezier(.2,.9,.3,1)';
            el.style.transform = '';
          }
        });
      }
    }
  }, { passive: false });
  document.addEventListener('touchend', ctx.up = function () {
    if (!dragCtx || !dragCtx.armed) return;
    /* FLIP 方案：落点=占位框位置；只有悬停打包提示出现才算合并 */
    const mergeArmed = !!document.querySelector(dragCtx.gridSel + ' .merge-hint');
    const on = mergeArmed ? document.querySelector(dragCtx.gridSel + ' .merge-hint') : null;
    finishDrag(on, mergeArmed);
  });
}
function finishDrag(target, allowMerge) {
  const ctx = dragCtx; dragCtx = null;
  if (ctx.hoverTimer) clearInterval(ctx.hoverTimer);
  suppressClickUntil = Date.now() + 450;
  if (ctx.timer) clearTimeout(ctx.timer);
  document.removeEventListener('touchmove', ctx.mv);
  document.removeEventListener('touchend', ctx.up);
  document.querySelectorAll('.drop-on,.merge-hint').forEach(c => c.classList.remove('drop-on', 'merge-hint'));
  if (!ctx.armed) { if (ctx.ph) ctx.ph.remove(); return; }
  /* 悬停合并：卡飞向目标后重渲染 */
  if (allowMerge && target) {
    ctx.ph.remove();
    ctx.card.remove();
    if (ctx.mode === 'tools' || ctx.mode === 'statgrid') {
      const isStat = ctx.mode === 'statgrid';
      const flow = isStat ? statFlow() : toolsFlow();
      const tid = target.getAttribute('data-v') || target.getAttribute('data-id');
      const groups = isStat ? state.ui.statsGroups : state.ui.toolsGroups;
      const ti = flow.indexOf(tid);
      if (ti > -1 && !/^g/.test(ctx.id)) {
        const g = groups[tid];
        if (g && g.items.length < 9) { g.items.push(ctx.id); toast('✓ 已加入「' + g.name + '」'); }
        else {
          const gid = 'g' + Date.now();
          groups[gid] = { id: gid, name: '文件夹', items: [tid, ctx.id] };
          flow[ti] = gid;
          toast('✓ 已打包成文件夹 · 点开可改名/解散');
        }
        const fi = flow.indexOf(ctx.id); if (fi > -1) flow.splice(fi, 1);
      }
      if (isStat) { state.ui.statsOrder = flow; persist(); renderStats(); }
      else { state.ui.toolsOrder = flow; persist(); renderTools(); }
    } else {
      ctx.ph && ctx.ph.remove();
    }
    return;
  }
  /* 落位动画：卡滑进占位框 */
  if (ctx.ph) {
    const pr = ctx.ph.getBoundingClientRect();
    const cr = ctx.card.getBoundingClientRect();
    const dx = (pr.left + (pr.width - cr.width) / 2) - cr.left;
    const dy = (pr.top + (pr.height - cr.height) / 2) - cr.top;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      ctx.card.style.transition = 'transform .22s cubic-bezier(.2,.9,.3,1)';
      ctx.card.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1)';
    }
  }
  /* set / page 模式：卡替换占位框，DOM 保序后读取保存 */
  if (ctx.mode === 'set' || (ctx.mode && ctx.mode.indexOf('page:') === 0)) {
    if (ctx.ph) {
      ctx.card.style.cssText = '';
      ctx.card.classList.remove('dragging');
      ctx.ph.parentElement.insertBefore(ctx.card, ctx.ph);
      ctx.ph.remove();
    }
    if (ctx.mode === 'set') {
      state.ui.setOrder = [...document.querySelectorAll('#set-grid .wg-item')].map(c => c.getAttribute('data-id'));
      persist(); toast('✓ 顺序已保存');
      const el2 = document.querySelector('#set-grid .wg-item[data-id="' + ctx.id + '"]');
      if (el2) { el2.classList.add('drop-pop'); setTimeout(function () { el2.classList.remove('drop-pop'); }, 420); }
    } else {
      const pg = ctx.mode.slice(5);
      const cont = document.getElementById(PAGE_SORT_CONT[pg] || ('page-' + pg));
      if (cont) {
        state.ui.pageOrder = state.ui.pageOrder || {};
        state.ui.pageOrder[pg] = [...cont.querySelectorAll(':scope > [data-psortkey]')].map(c => c.getAttribute('data-psortkey'));
        persist(); toast('✓ 顺序已保存');
      }
      fixDuoPair();
      ctx.card.classList.add('drop-pop');
      setTimeout(function () { ctx.card.classList.remove('drop-pop'); }, 420);
    }
    return;
  }
  /* tools / statgrid 模式：按占位框位置重排数组后重渲染 */
  if (ctx.ph) {
    const isStat = ctx.mode === 'statgrid';
    const flowOld = isStat ? statFlow() : toolsFlow();
    const kids = [...ctx.ph.parentElement.children];
    const ids = []; let inserted = false;
    kids.forEach(function (el) {
      if (el === ctx.card) return;
      if (el === ctx.ph) { ids.push(ctx.id); inserted = true; return; }
      const did = el.getAttribute('data-id');
      if (did) ids.push(did);
    });
    if (!inserted) ids.push(ctx.id);
    /* 校验：新序必须含全部旧 id（防漏），否则退回旧序 */
    const missing = flowOld.filter(x => ids.indexOf(x) < 0);
    const flow = missing.length ? flowOld : ids;
    if (isStat) { state.ui.statsOrder = flow; persist(); renderStats(); }
    else { state.ui.toolsOrder = flow; persist(); renderTools(); }
  }
}

const PAGE_SORT_CONT = { record: 'page-record', trend: 'page-trend', workout: 'workout-body' };
function setupPageSort(pg) {
  const cont = document.getElementById(PAGE_SORT_CONT[pg] || ('page-' + pg));
  if (!cont) return;
  const order = (state.ui.pageOrder && state.ui.pageOrder[pg]) ? state.ui.pageOrder[pg].slice() : [];
  const cards = [...cont.querySelectorAll(':scope > [data-psortkey]')];
  if (!cards.length) return;
  cards.forEach(c => { const k = c.getAttribute('data-psortkey'); if (order.indexOf(k) < 0) order.push(k); });
  /* 锚点（主打卡/页头等固定元素）永不动；排序卡依次插在锚点之后 */
  const anchor = cont.querySelector(':scope > [data-pssortanchor]');
  const lastFixed = [...cont.querySelectorAll(':scope > [data-psortfixed]')].pop();
  let cursor = anchor || lastFixed || null;
  if (cursor) {
    order.forEach(function (k) {
      const el = cards.find(c => c.getAttribute('data-psortkey') === k);
      if (el && el !== cursor) { cursor.after(el); cursor = el; }
    });
  } else {
    order.forEach(function (k) {
      const el = cards.find(c => c.getAttribute('data-psortkey') === k);
      if (el) cont.appendChild(el);
    });
  }
  state.ui.pageOrder = state.ui.pageOrder || {};
  state.ui.pageOrder[pg] = order;
  if (cont.dataset.sortBound !== pg) {
    cont.dataset.sortBound = pg;
    attachDrag('#' + cont.id, '[data-psortkey]', function (el) { return el.getAttribute('data-psortkey'); }, 'page:' + pg);
  }
}
function toolsFlow() {
  /* V93: 展示顺序 = toolsOrder（混排组件 id 与文件夹 id），补齐新增、滤掉非法 */
  const ord = (state.ui.toolsOrder || TOOL_IDS_DEFAULT.slice()).slice();
  TOOL_IDS_DEFAULT.forEach(id => { if (ord.indexOf(id) < 0) ord.push(id); });
  const grpIds = Object.keys(state.ui.toolsGroups || {});
  const used = new Set();
  const flow = ord.filter(x => {
    if (grpIds.indexOf(x) > -1) { used.add(x); return true; }
    if (TOOL_IDS_DEFAULT.indexOf(x) > -1) {
      const inGrp = grpIds.some(g => state.ui.toolsGroups[g].items.indexOf(x) > -1);
      return !inGrp;
    }
    return false;
  });
  grpIds.forEach(g => { if (used.has(g) === false) flow.push(g); });
  state.ui.toolsOrder = flow;
  return flow;
}
function renderTools() {
  document.getElementById('tools-body').innerHTML =
    '<p class="sub" style="margin:4px 2px 14px">吃的、练的、数据家底，都在这营里管 · <b style="color:var(--text)">长按卡片可拖动排序</b>，拖到另一张卡上打包成文件夹</p>' +
    '<div class="wg-grid" id="wg-grid">' + toolsFlow().map(function (id) {
      const g = state.ui.toolsGroups && state.ui.toolsGroups[id];
      if (g) {
        return '<button class="wg-item wg-folder" data-action="group-open" data-id="' + id + '" data-kind="folder">' +
          '<span class="wg-f-ico">' + g.items.slice(0, 4).map(function (iid) { return WIDGET_ICONS[iid] || ''; }).join('') + '</span>' +
          '<b>' + esc(g.name) + '</b><span>' + g.items.length + ' 个组件 · 点击打开</span></button>';
      }
      const w = WIDGETS.find(x => x.id === id);
      return '<button class="wg-item" data-action="widget-open" data-id="' + id + '" data-kind="card">' +
        WIDGET_ICONS[id] + '<b>' + w.t + '</b><span>' + w.sub + '</span></button>';
    }).join('') + '</div>';
  attachDrag('#wg-grid', '.wg-item', function (el) { return el.getAttribute('data-id'); }, 'tools');
}

let setCardsCache = null, setGroupBuckets = null;
function SET_ICON(d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; }
const SET_ICONS = {
  theme: SET_ICON('<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>'),
  who: SET_ICON('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
  equip: SET_ICON('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'),
  sync: SET_ICON('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  backup: SET_ICON('<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>'),
  metrics: SET_ICON('<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>'),
  about: SET_ICON('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>')
};
function attachSetDrag() {
  const body = document.getElementById('settings-body');
  if (!body || body.dataset.setDrag === '1') return;
  body.dataset.setDrag = '1';
  let ctx = null;
  body.addEventListener('touchstart', function (e) {
    const card = e.target.closest('#settings-body > .card');
    if (!card || ctx) return;
    const t = e.touches[0];
    ctx = { card, x: t.clientX, y: t.clientY, armed: false, key: card.dataset.setkey, mv: null, up: null };
    ctx.timer = setTimeout(function () {
      if (!ctx) return;
      ctx.armed = true; ctx.card.classList.add('dragging');
      if (navigator.vibrate) navigator.vibrate(10);
      toast('已拿起 · 上下拖动调整设置卡顺序');
      body.style.overflow = 'hidden';
    }, 480);
  }, { passive: true });
  body.addEventListener('touchmove', function (e) {
    if (!ctx || !ctx.armed) return;
    e.preventDefault();
    const t = e.touches[0];
    ctx.card.style.transform = 'translateY(' + (t.clientY - ctx.y) + 'px)';
    document.querySelectorAll('#settings-body > .card').forEach(function (c) {
      if (c === ctx.card) { c.classList.remove('drop-on'); return; }
      const r = c.getBoundingClientRect();
      c.classList.toggle('drop-on', t.clientY > r.top && t.clientY < r.bottom);
    });
  }, { passive: false });
  body.addEventListener('touchend', function () {
    if (!ctx || !ctx.armed) { if (ctx) clearTimeout(ctx.timer); ctx = null; return; }
    const on = document.querySelector('#settings-body > .card.drop-on');
    ctx.card.classList.remove('dragging'); ctx.card.style.transform = '';
    document.querySelectorAll('.drop-on').forEach(c => c.classList.remove('drop-on'));
    body.style.overflow = '';
    const cards = [...body.querySelectorAll(':scope > .card')];
    if (on && on !== ctx.card) {
      const keys = cards.map(c => c.dataset.setkey);
      const to = keys.indexOf(on.dataset.setkey);
      if (to > -1) {
        state.ui.setOrder = keys.filter(k => k !== ctx.key);
        state.ui.setOrder.splice(to, 0, ctx.key);
        persist();
        const cur = setCardsCache; setCardsCache = null;
        cards.forEach(c => c.remove());
        setCardsCache = cur;
        regroupSettings();
        toast('✓ 顺序已保存');
      }
    }
    ctx = null;
  });
}
function regroupSettings() {
  const body = document.getElementById('settings-body');
  if (!body) return;
  const cards = [...body.querySelectorAll(':scope > .card')];
  /* 首次渲染时缓存原卡；之后反复挂载不重建，表单状态不丢 */
  if (cards.length) setCardsCache = cards;
  if (!setCardsCache || !setCardsCache.length) return;
  const th = THEME_LIST.find(x => x.k === (state.ui.theme || 'classic'));
  const thName = th ? th.n : (state.ui.theme || '经典');
  const age = lastBackupAgeDays();
  /* V64：设置只留纯偏好（行业惯例），业务功能全部搬去健康营 */
  let GROUPS = [
    { id: 'theme',  match: /设计风格/, t: '主题外观', sub: '主题「' + thName + '」· 每天换一个心情' },
    { id: 'who',    match: /称呼|目标体重|身高/, t: '名字与目标', sub: esc(state.names.me) + ' & ' + esc(state.names.partner) + (typeof state.goals.me === 'number' ? ' · 目标 ' + state.goals.me + ' / ' + state.goals.partner : '') },
    { id: 'metrics', match: /指标怎么看/, t: '指标说明', sub: '每个数字怎么看、准不准' },
    { id: 'about',  match: /安装到桌面|版本与更新/, t: '安装与版本', sub: APP_VERSION + ' · 装到桌面 · 更新日志' }
  ];
  const buckets = {};
  GROUPS.forEach(g => { buckets[g.id] = []; });
  setCardsCache.forEach(function (card) {
    const label = card.querySelector('.card-label');
    const t = label ? label.textContent : '';
    /* 运动器械/同步备份类不再出现在设置里（健康营管辖） */
    if (/运动与器械|双人同步|云备份|手动备份|数据状态/.test(t)) return;
    const g = GROUPS.find(x => x.match.test(t));
    if (g) buckets[g.id].push(card);
  });
  setGroupBuckets = buckets;
  let visible = GROUPS.filter(g => buckets[g.id].length);
  /* V93: 按用户排序 setOrder 排列 */
  const so = state.ui.setOrder || [];
  visible.sort((a, b) => (so.indexOf(a.id) < 0 ? 99 : so.indexOf(a.id)) - (so.indexOf(b.id) < 0 ? 99 : so.indexOf(b.id)));
  body.innerHTML = '<p class="sub" style="margin:2px 2px 12px">偏好都在这 · <b style="color:var(--text)">长按卡片拖动排序</b> · 健身的和数据的在「健康营」里管</p>' +
    '<div class="wg-grid" id="set-grid">' + visible.map(g =>
    '<button class="wg-item" data-action="set-group" data-id="' + g.id + '">' +
    SET_ICONS[g.id] + '<b>' + g.t + '</b><span>' + g.sub + '</span></button>').join('') + '</div>';
  attachDrag('#set-grid', '.wg-item', function (el) { return el.getAttribute('data-id'); }, 'set');
}
function showSetGroup(id) {
  const body = document.getElementById('settings-body');
  const g = (function () {
    const th = THEME_LIST.find(x => x.k === (state.ui.theme || 'classic'));
    const thName = th ? th.n : '';
    const map = { theme: '主题外观', who: '名字与目标', equip: '运动与器械', sync: '双人同步', backup: '数据备份', metrics: '指标说明', about: '安装与版本' };
    return map[id] || id;
  })();
  const wrap = document.createElement('div');
  const back = document.createElement('button');
  back.className = 'btn ghost sm';
  back.setAttribute('data-action', 'set-back');
  back.style.cssText = 'width:auto;display:inline-block;padding:7px 12px;font-size:12px;margin-bottom:10px';
  back.textContent = '‹ 返回设置';
  (setGroupBuckets && setGroupBuckets[id] || []).forEach(function (card) {
    const kl = card.querySelector(':scope > .key-line'); if (kl) kl.remove();
    wrap.appendChild(card);
  });
  body.innerHTML = '';
  body.appendChild(back);
  body.appendChild(wrap);
  const h = document.createElement('div'); h.className = 'card-label'; h.style.margin = '2px 2px 8px'; h.textContent = g;
  body.insertBefore(h, back.nextSibling);
}

function foldSettings() {
  document.querySelectorAll('#settings-body .card').forEach(function (card) {
    const label = card.querySelector('.card-label');
    if (!label || label.dataset.sgBound) return;
    const kids = [...card.children].filter(el => el !== label && !el.classList.contains('key-line'));
    kids.forEach(el => { el.style.display = 'none'; });
    label.style.cursor = 'pointer';
    const ar = document.createElement('span');
    ar.textContent = '展开';
    ar.style.cssText = 'float:right;font-size:12px;font-weight:400;color:var(--muted,#98A2B3)';
    label.appendChild(ar);
    label.dataset.sgBound = '1';
    label.addEventListener('click', function () {
      const open = kids[0] && kids[0].style.display === 'none';
      kids.forEach(el => { el.style.display = open ? '' : 'none'; });
      ar.textContent = open ? '收起' : '展开';
    });
  });
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
document.addEventListener('change', e => {
  const sel = e.target.closest('[data-astro]');
  if (sel) {
    const v = +sel.value;
    const t = sel.getAttribute('data-astro');
    if (t === 'xz') astroSelXZ = v; else if (t === 'sx') astroSelSX = v; else if (t === 'xzfull') zxSel = v;
    if (curWidget === 'astro') renderWidgetSheet('黄道吉日');
    if (curWidget === 'zodiac') renderWidgetSheet('星座运势');
    return;
  }
}, true);

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
    if (!refreshOpenSheet()) renderTrend(); /* V75: 弹层开着刷弹层，点哪天当天内容立刻跟上 */
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
    else if (a === 'cal-close') { selectedCalDay = null; if (!refreshOpenSheet()) renderTrend(); }
    else if (a === 'edit-cal-day') {
      if (selectedCalDay) { currentDate = selectedCalDay; resetDrafts(); switchTab('record'); renderAll(); }
    }
    else if (a === 'cal-prev') { calYM.m--; if (calYM.m < 0) { calYM.m = 11; calYM.y--; } selectedCalDay = null; if (!refreshOpenSheet()) renderTrend(); }
    else if (a === 'cal-next') { calYM.m++; if (calYM.m > 11) { calYM.m = 0; calYM.y++; } selectedCalDay = null; if (!refreshOpenSheet()) renderTrend(); }
    else if (a === 'set-theme') {
      state.ui.theme = act.dataset.v;
      state.ui.themeDate = todayKey(); /* 手动选完当天不再被轮换覆盖 */
      persist();
      applyTheme();
      renderAll();
      /* 从速切面板进来就留在速切面板，从设置进来回设置 */
      if (document.getElementById('widget-sheet').classList.contains('show')) openThemeSheet();
      else openSettings();
    }
    else if (a === 'open-theme') {
      openThemeSheet();
    }
    else if (a === 'open-stat') {
      openStatSheet(act.getAttribute('data-v'));
    }
    else if (a === 'open-trend') {
      openTrendSheet(act.getAttribute('data-v'));
    }
    else if (a === 'copy-summary') {
      const card = act.closest('.card');
      const txt = card ? card.querySelector('.verdict').innerText.replace(/^一句话：/, '').replace(/复制这段话$/, '').trim() : '';
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => toast('✓ 已复制，可以直接发给别人')).catch(() => {});
      else toast(txt);
    }
    else if (a === 'copy-weekly') {
      const txt = (act.getAttribute('data-report') || '').replace(/\\n/g, '\n');
      if (navigator.share) { navigator.share({ text: txt }).catch(() => {}); }
      else if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => toast('✓ 周报已复制，去微信粘贴')).catch(() => {});
      else toast('周报：' + txt);
    }
    else if (a === 'copy-app-link') {
      const url = 'https://wowayuan11-elio.github.io/weight-tracker-app/';
      if (navigator.share) { navigator.share({ title: '双人体重小本本', url: url }).catch(() => {}); }
      else if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(url).then(() => toast('✓ 链接已复制，微信发给她就行')).catch(() => {}); }
      else toast('链接：' + url);
    }
    else if (a === 'toggle-theme-rotate') {
      state.ui.themeRotate = !state.ui.themeRotate;
      if (state.ui.themeRotate) state.ui.themeDate = todayKey(); /* 开启当天不立刻换，明天开始轮 */
      persist();
      applyTheme();
      renderAll();
      toast(state.ui.themeRotate ? '\u2713 已开启：每天自动换一套风格' : '已关闭自动轮换，用你手动选的风格');
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
    else if (a === 'toggle-month') { const mk = act.dataset.mkey; expandedMonths[mk] = !expandedMonths[mk]; renderStats(); refreshOpenSheet(); }
    else if (a === 'month-view') { const mk = act.dataset.mkey; monthView[mk] = monthView[mk] === 'cal' ? 'list' : 'cal'; if (!expandedMonths[mk]) expandedMonths[mk] = true; renderStats(); refreshOpenSheet(); }
    else if (a === 'plan-day') { planEditDow = +act.dataset.dow; renderPlanSheet(); document.getElementById('sheet-mask').classList.add('show'); document.getElementById('plan-sheet').classList.add('show'); }
    else if (a === 'plan-pick-custom') {
      const v = (document.getElementById('plan-custom-input') || {}).value || '';
      if (planEditDow >= 0 && v.trim()) {
        state.ui.weekPlan = weekPlanArr();
        state.ui.weekPlan[planEditDow] = v.trim().slice(0, 20);
        persist();
        document.getElementById('plan-sheet').classList.remove('show');
        document.getElementById('sheet-mask').classList.remove('show');
        planEditDow = -1;
        renderStats();
        toast('✓ 安排已更新');
      } else if (!v.trim()) { toast('先写点内容再保存'); }
    }
    else if (a === 'equip-add') {
      equipAddMode = true;
      renderPlanSheet();
      document.getElementById('sheet-mask').classList.add('show');
      document.getElementById('plan-sheet').classList.add('show');
    }
    else if (a === 'equip-save') {
      const v = (document.getElementById('equip-input') || {}).value || '';
      if (!v.trim()) { toast('先写点内容再保存'); return; }
      state.ui.equip = state.ui.equip || [];
      if (state.ui.equip.indexOf(v.trim()) === -1) state.ui.equip.push(v.trim().slice(0, 14));
      persist();
      equipAddMode = false;
      document.getElementById('plan-sheet').classList.remove('show');
      document.getElementById('sheet-mask').classList.remove('show');
      renderSettings();
      toast('✓ 已添加「' + v.trim() + '」，勾上即可参与周计划');
    }
    else if (a === 'gym-gen') {
      try {
        state.ui.gymPlan = genGymPlan();
        persist(); renderTools();
        toast('✓ 一周计划已按你的器械生成');
      } catch (err) { toast('生成失败：' + err.message); }
    }
    else if (a === 'group-open') { openGroup(act.getAttribute('data-id'), act.getAttribute('data-store')); }
    else if (a === 'group-act') { groupAct(act.getAttribute('data-op'), act.getAttribute('data-id'), act.getAttribute('data-w'), act.getAttribute('data-store')); }
    else if (a === 'widget-open') {
      if (Date.now() < suppressClickUntil) return;
      openWidget(act.getAttribute('data-id'));
    }
    else if (a === 'widget-close') {
      document.getElementById('widget-sheet').classList.remove('show');
      document.getElementById('sheet-mask').classList.remove('show');
      curWidget = null; widgetBack = null; curTrendSheet = null; curStatSheet = null;
    }
    else if (a === 'widget-back') {
      const bw = WIDGETS.find(x => x.id === widgetBack);
      if (bw) { renderWidgetSheet(bw.t); curWidget = widgetBack; widgetBack = null; }
      else { document.getElementById('widget-sheet').classList.remove('show'); document.getElementById('sheet-mask').classList.remove('show'); curWidget = null; widgetBack = null; }
    }
    else if (a === 'diet-who') {
      const sv = (document.getElementById('diet-say') || {}).value || '';
      dietWho = act.getAttribute('data-w') === 'partner' ? 'partner' : 'me';
      renderWidgetSheet('饮食日记');
      const el = document.getElementById('diet-say');
      if (el && sv) el.value = sv;
    }
    else if (a === 'diet-day') {
      const dd = parseInt(act.getAttribute('data-d'), 10) || 0;
      const t = new Date(dietDate); t.setDate(t.getDate() + dd);
      const nk = t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2);
      if (nk <= todayKey()) { dietDate = nk; renderWidgetSheet('饮食日记'); }
    }
    else if (a === 'diet-goto') {
      const nk = act.getAttribute('data-key');
      if (nk && nk <= todayKey()) { dietDate = nk; renderWidgetSheet('饮食日记'); }
    }
    else if (a === 'diet-meal') {
      const sv = (document.getElementById('diet-say') || {}).value || '';
      dietMeal = act.getAttribute('data-m') || 'b';
      renderWidgetSheet('饮食日记');
      const el = document.getElementById('diet-say');
      if (el && sv) el.value = sv;
    }
    else if (a === 'diet-parse') {
      const say = ((document.getElementById('diet-say') || {}).value || '').trim();
      if (!say) { toast('先说说吃了啥'); return; }
      if (aiHas()) { aiParseFood(say); return; }
      const res = parseDietText(say);
      if (!res.length) { toast('没认出来，换个说法试试'); return; }
      dietParsed = dietParsed.concat(res);
      renderWidgetSheet('饮食日记');
      toast('✓ 识别出 ' + res.length + ' 样，核对后记上');
    }
    else if (a === 'diet-pick') {
      const f = FOOD_DB[parseInt(act.getAttribute('data-i'), 10) || 0];
      if (f) {
        dietParsed.push({ n: f.n, k: f.k, guessed: false });
        renderWidgetSheet('饮食日记');
        toast('✓ 已加进清单');
      }
    }
    else if (a === 'diet-pv-del') {
      const i2 = parseInt(act.getAttribute('data-i'), 10);
      if (dietParsed[i2]) { dietParsed.splice(i2, 1); renderWidgetSheet('饮食日记'); }
    }
    else if (a === 'diet-add-batch') {
      try {
        const inputs = [].map.call(document.querySelectorAll('.diet-pv-k'), el => Number(el.value));
        const out = [];
        let miss = 0;
        dietParsed.forEach(p => {
          if (p.k !== null) { out.push({ n: p.n, k: p.k }); return; }
          const v = inputs.shift();
          if (isFinite(v) && v > 0 && v <= 5000) out.push({ n: p.n, k: Math.round(v) });
          else miss++;
        });
        if (!out.length) { toast(miss ? '没认出来的要填个千卡数字' : '清单是空的'); return; }
        state.records[dietDate] = state.records[dietDate] || {};
        state.records[dietDate].diet = state.records[dietDate].diet || [];
        out.forEach(o => state.records[dietDate].diet.push({ n: o.n.slice(0, 24), k: o.k, m: dietMeal, w: dietWho }));
        persist();
        const total = out.reduce((a, b) => a + b.k, 0);
        dietParsed = [];
        const sayEl = document.getElementById('diet-say'); if (sayEl) sayEl.value = '';
        renderWidgetSheet('饮食日记');
        const btn = document.querySelector('[data-action=diet-add-batch]');
        if (btn) { btn.textContent = '✓ 已记上'; btn.style.background = '#34c759'; btn.style.borderColor = '#34c759'; }
        toast('✓ ' + out.length + ' 样已记到' + DIET_MEALS[dietMeal] + ' · 约 ' + total + ' kcal');
      } catch (err) { toast('没记上：' + err.message); }
    }
    else if (a === 'diet-del') {
      const idx = parseInt(act.getAttribute('data-idx'), 10);
      const arr = (state.records[dietDate] || {}).diet || [];
      if (arr[idx]) { arr.splice(idx, 1); if (!arr.length) delete state.records[dietDate].diet; persist(); renderWidgetSheet('饮食日记'); toast('已删除'); }
    }
    else if (a === 'ai-send') { aiSend(); }
    else if (a === 'ai-quick') {
      const q = act.getAttribute('data-q') || '';
      const el = document.getElementById('ai-input');
      if (el) { el.value = q; el.focus(); }
    }
    else if (a === 'ai-cfg-save') {
      const k = (document.getElementById('ai-key-in') || {}).value || '';
      const m = (document.getElementById('ai-model-in') || {}).value || 'glm-4-flash';
      if (k.trim().length < 20) { toast('钥匙不对劲，检查下是不是复制全了'); return; }
      aiSetCfg(k, m);
      renderWidgetSheet('AI 管家');
      toast('✓ 钥匙已保存（只存本机）· 开聊！');
    }
    else if (a === 'ai-cfg-test') {
      const tip = document.getElementById('ai-test-tip');
      const k = (document.getElementById('ai-key-in') || {}).value || '';
      const m = (document.getElementById('ai-model-in') || {}).value || 'glm-4-flash';
      if (tip) { tip.textContent = '测试中…'; tip.style.color = '#b45309'; }
      fetch(AI_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + k.trim() },
        body: JSON.stringify({ model: m, messages: [{ role: 'user', content: '回复ok' }], max_tokens: 8 }) })
        .then(r => r.json().then(j => ({ ok: r.ok, j: j }))).then(x => {
          if (tip) {
            if (x.ok) { tip.textContent = '✓ 钥匙能用！点上面「保存并开始用」'; tip.style.color = '#1d7a3a'; }
            else { tip.textContent = '✗ 不通：' + ((x.j && x.j.error && x.j.error.message) || 'HTTP ' + x.ok); tip.style.color = '#b45309'; }
          }
        }).catch(function (e) { if (tip) { tip.textContent = '✗ 网络不通：' + (e.message || e); tip.style.color = '#b45309'; } });
    }
    else if (a === 'ai-cycle-model') {
      const cur = aiCfg().model || 'glm-4-flash';
      const idx = AI_MODELS.indexOf(cur);
      const nxt = AI_MODELS[(idx + 1 + AI_MODELS.length) % AI_MODELS.length] || AI_MODELS[0];
      aiSetCfg(aiCfg().key, nxt);
      renderWidgetSheet('AI 管家');
      toast('已切换到 ' + nxt + '（更强更聪明，稍慢一点点）');
    }
    else if (a === 'voice') { voiceStart(act.getAttribute('data-for') || 'ai-input'); }
    else if (a === 'wt-open-hub') { switchTab('workout'); }
    else if (a === 'astro-prev') { astroYM.m--; if (astroYM.m < 0) { astroYM.m = 11; astroYM.y--; } astroDay = null; if (curWidget === 'astro') renderWidgetSheet('每日运势'); }
    else if (a === 'astro-next') { astroYM.m++; if (astroYM.m > 11) { astroYM.m = 0; astroYM.y++; } astroDay = null; if (curWidget === 'astro') renderWidgetSheet('每日运势'); }
    else if (a === 'astro-day') { astroDay = act.getAttribute('data-k'); if (curWidget === 'astro') renderWidgetSheet('每日运势'); }
    else if (a === 'astro-close') { astroDay = null; if (curWidget === 'astro') renderWidgetSheet('每日运势'); }
    else if (a === 'zx-repull') { zxLuckSeed++; if (curWidget === 'zodiac') renderWidgetSheet('星座运势'); }
    else if (a === 'wcal-prev') { wcalYM.m--; if (wcalYM.m < 0) { wcalYM.m = 11; wcalYM.y--; } wcalSel = null; refreshWorkoutUI(); }
    else if (a === 'wcal-next') { wcalYM.m++; if (wcalYM.m > 11) { wcalYM.m = 0; wcalYM.y++; } wcalSel = null; refreshWorkoutUI(); }
    else if (a === 'wcal-day') { wcalSel = act.getAttribute('data-k'); refreshWorkoutUI(); }
    else if (a === 'wcal-close') { wcalSel = null; refreshWorkoutUI(); }
    else if (a === 'wcal-fill') {
      const kk = act.getAttribute('data-k');
      if (kk && kk <= todayKey()) {
        const note = (document.getElementById('wcal-note') || {}).value || '';
        state.records[kk] = state.records[kk] || {};
        state.records[kk].workout = { done: 1, d: note.trim() ? note.trim() : '补记 · 当天练了' };
        persist();
        toast('✓ 已补 ' + (parseKey(kk).getMonth() + 1) + '月' + parseKey(kk).getDate() + '日打卡');
        refreshWorkoutUI();
      }
    }
    else if (a === 'wcal-undo') {
      const kk = act.getAttribute('data-k');
      if (kk && state.records[kk] && state.records[kk].workout) {
        const rk = state.records[kk];
        if (typeof rk.me !== 'number' && typeof rk.partner !== 'number' && !rk.diet && !rk.water && !rk.note) delete state.records[kk];
        else delete rk.workout;
        persist();
        toast('已撤销 ' + (parseKey(kk).getMonth() + 1) + '月' + parseKey(kk).getDate() + '日打卡');
        refreshWorkoutUI();
      }
    }
    else if (a === 'wt-punch') {
      const tk = todayKey();
      state.records[tk] = state.records[tk] || {};
      state.records[tk].workout = { done: 1, d: WORKOUT_DEFAULT };
      persist();
      refreshWorkoutUI();
      toast('已打卡！坚持 ' + workoutStats().streak + ' 天了');
    }
    else if (a === 'wt-undo') {
      const rec = state.records[todayKey()];
      if (rec && rec.workout) { delete rec.workout; if (!Object.keys(rec).length) delete state.records[todayKey()]; persist(); refreshWorkoutUI(); toast('已撤销今天的打卡'); }
    }
    else if (a === 'wt-say') {
      const say = ((document.getElementById('wt-say') || {}).value || '').trim();
      if (!say) { toast('先说说今天练了啥'); return; }
      const tk = todayKey();
      state.records[tk] = state.records[tk] || {};
      state.records[tk].workout = { done: 1, d: say.slice(0, 140) };
      persist();
      refreshWorkoutUI();
      toast('记上了！坚持 ' + workoutStats().streak + ' 天了');
    }
    else if (a === 'gym-scene') {
      gymScene = act.getAttribute('data-v') || 'all';
      refreshWorkoutUI();
    }
    else if (a === 'gym-filter') {
      gymFilter = act.getAttribute('data-c') || '全部';
      refreshWorkoutUI();
    }
    else if (a === 'gym-open') {
      openGymSheet(act.getAttribute('data-id'), act.getAttribute('data-back'));
    }
    else if (a === 'fit-tab') { const v = act.dataset.v; fitTab = (v === 'moves' || v === 'plan') ? v : 'video'; fitOpenBv = null; refreshOpenSheet(); refreshWorkoutUI(); }
    else if (a === 'fit-cat') { fitCat = act.dataset.c; fitOpenBv = null; refreshOpenSheet(); refreshWorkoutUI(); }
    else if (a === 'fit-open') { const bv = act.dataset.bv; const t = act.dataset.t; if (fitOpenBv === bv && fitOpenCat === t) { fitOpenBv = null; fitOpenCat = null; } else { fitOpenBv = bv; fitOpenCat = t; } refreshOpenSheet(); refreshWorkoutUI(); }
    else if (a === 'fit-facts') { fitFactsOpen = !fitFactsOpen; refreshOpenSheet(); refreshWorkoutUI(); }
    else if (a === 'fit-search') { fitQ = (document.getElementById('fit-q') || {}).value || ''; fitOpenBv = null; refreshOpenSheet(); refreshWorkoutUI(); }
    else if (a === 'gym-close') {
      document.getElementById('gym-sheet').classList.remove('show');
      document.getElementById('sheet-mask').classList.remove('show');
      document.getElementById('gym-body').innerHTML = '';
    }
    else if (a === 'close-plan') { equipAddMode = false; document.getElementById('plan-sheet').classList.remove('show'); document.getElementById('sheet-mask').classList.remove('show'); }
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
    else if (a === 'set-group') showSetGroup(act.getAttribute('data-id'));
    else if (a === 'set-back') regroupSettings();
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
    else if (a === 'import-merge') importMerge();
    else if (a === 'export-csv') exportCSV();
    else if (a === 'set-owner-me') setDeviceOwner('me');
    else if (a === 'set-owner-partner') setDeviceOwner('partner');
    else if (a === 'copy-shortcut-url') {
      const u = 'https://wowayuan11-elio.github.io/weight-tracker-app/?quick=输入的数字';
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(() => toast('✓ 已复制——URL 处把「输入的数字」换成快捷指令的文本变量')).catch(() => toast(u));
      else toast(u);
    }
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

/* V38 备注自动保存：打字停 0.9 秒就写库，再也不怕忘点保存 */
let noteAutoTimer = null;
function noteAutoSaveNow() {
  const inp = document.querySelector('.note-input');
  if (!inp) return;
  const v = inp.value.trim();
  const cur = state.records[currentDate] || {};
  if (v === (cur.note || '')) return;
  if (!state.records[currentDate]) state.records[currentDate] = {};
  if (v) state.records[currentDate].note = v; else delete state.records[currentDate].note;
  if (!Object.keys(state.records[currentDate]).length) delete state.records[currentDate];
  if (persist()) { clearTimeout(ghTimer); cloudBackup('note'); toast('✓ 备注已自动保存'); }
}

/* V40：切后台/退出前一瞬间强制保存备注并立即上云——写完就走也不丢 */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { try { noteAutoSaveNow(); } catch (e) {} }
});
window.addEventListener('pagehide', () => { try { noteAutoSaveNow(); } catch (e) {} });
let noteComposing = false;
document.addEventListener('compositionstart', e => {
  if (e.target.classList && e.target.classList.contains('note-input')) noteComposing = true;
});
document.addEventListener('compositionend', e => {
  if (e.target.classList && e.target.classList.contains('note-input')) {
    noteComposing = false;
    clearTimeout(noteAutoTimer);
    noteAutoTimer = setTimeout(noteAutoSaveNow, 120);
  }
});
document.addEventListener('input', e => {
  if (!e.target.classList || !e.target.classList.contains('note-input')) return;
  if (noteComposing) return; /* 拼音组合中不取值，等上屏再存，否则存到半句 */
  clearTimeout(noteAutoTimer);
  noteAutoTimer = setTimeout(noteAutoSaveNow, 900);
});
document.addEventListener('focusout', e => {
  if (e.target && e.target.classList && e.target.classList.contains('note-input')) noteAutoSaveNow();
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
    renderWorkout();
    renderStats();
    renderTools();
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
rotateDailyTheme();
applyTheme(); /* 轮换后重新应用当天风格 */
if (navigator.storage && navigator.storage.persist) { try { navigator.storage.persist(); } catch (e) {} } /* V39：请求持久化存储，降低 iOS 清写概率 */
renderAll();
handleQuickRecord();
autoRestore();

/* ===================== V83: AI 管家 ===================== */
const MIC_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';

function aiCfg() {
  try { const o = JSON.parse(localStorage.getItem('wt_ai') || '{}'); return { key: String(o.key || ''), model: String(o.model || 'glm-4-flash') }; }
  catch (e) { return { key: '', model: 'glm-4-flash' }; }
}
function aiSetCfg(key, model) {
  try { localStorage.setItem('wt_ai', JSON.stringify({ key: (key || '').trim(), model: model || 'glm-4-flash' })); }
  catch (e) { toast('存不上钥匙：' + e.message); }
}
function aiHas() { const c = aiCfg(); return c.key.length > 20; }
function aiMsgs() {
  try { const a = JSON.parse(localStorage.getItem('wt_ai_chat') || '[]'); return Array.isArray(a) ? a : []; }
  catch (e) { return []; }
}
function aiPushMsg(role, content) {
  try {
    const a = aiMsgs(); a.push({ role: role, c: content, t: Date.now() });
    while (a.length > 24) a.shift();
    localStorage.setItem('wt_ai_chat', JSON.stringify(a));
  } catch (e) { /* 存储满等情况：聊天记录丢就丢，不阻断 */ }
}

/* —— 用户数据上下文：让 AI 知道你们俩最近什么情况 —— */
function aiContext() {
  const tk = todayKey();
  const d7 = lastNDays(7);
  const line = [];
  const wk = ['周日','周一','周二','周三','周四','周五','周六'];
  const me7 = d7.map(k => { const v = state.records[k] ? state.records[k]['me'] : null; return k + '(' + wk[parseKey(k).getDay()] + '):' + (typeof v === 'number' ? v : '没称'); });
  const pa7 = d7.map(k => { const v = state.records[k] ? state.records[k]['partner'] : null; return k + ':' + (typeof v === 'number' ? v : '没称'); });
  line.push('今天是 ' + tk + ' ' + wk[parseKey(tk).getDay()] + '。');
  line.push('用户名：' + state.names.me + '（me），对象：' + state.names.partner + '（partner）。目标体重：' + state.goals.me + ' / ' + state.goals.partner + ' kg。');
  line.push('' + state.names.me + ' 近7天体重：' + me7.join('，') + '。');
  line.push('' + state.names.partner + ' 近7天体重：' + pa7.join('，') + '。');
  const wm = lastKeyOf ? null : null; /* no-op 占位防压缩误删 */
  [ 'me', 'partner' ].forEach(function (p) {
    const keys = sortedKeys();
    for (let i = keys.length - 1; i >= 0; i--) {
      const v = state.records[keys[i]][p + '_waist'];
      if (typeof v === 'number') { line.push((p === 'me' ? state.names.me : state.names.partner) + ' 最近一次腰围：' + v + ' cm（' + keys[i] + '）。'); break; }
    }
  });
  const dToday = (state.records[tk] || {}).diet || [];
  const dYst = (state.records[d7[6]] || {}).diet || [];
  line.push('今日已记饮食：' + (dToday.length ? dToday.map(x => x.n + '约' + x.k + 'kcal(' + (x.w === 'me' ? state.names.me : state.names.partner) + DIET_MEALS[x.m] + ')').join('，') : '还没记。'));
  line.push('昨日饮食：' + (dYst.length ? dYst.length + ' 项，合计约 ' + dYst.reduce((a, b) => a + b.k, 0) + ' kcal' : '没记。'));
  return line.join('\n');
}

function aiSystemPrompt() {
  const _today = new Date();
  const _fmt = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  const _td = _fmt(_today);
  const _yd = _fmt(new Date(_today.getTime() - 86400000));
  const _qtd = _fmt(new Date(_today.getTime() - 172800000));
  const _wk = ['日', '一', '二', '三', '四', '五', '六'][_today.getDay()];
  return [
    '今天是 ' + _td + ' 星期' + _wk + '。「昨天」指 ' + _yd + '，「前天」指 ' + _qtd + '。提到非今天的日期，动作里必须带 date 字段填对应日期。',
    '你是「双人体重小本本」App 内置的 AI 管家，一对年轻情侣（用户 ' + state.names.me + ' 和 TA 的对象 ' + state.names.partner + '）的健康助手。',
    '目标：陪他们减脂（重点减腰腹内脏脂肪）、保持肌肉、养成长期习惯。语气：朋友式，简洁、具体、不说教、不灌鸡汤。',
    '规则：',
    '1. 回答要用上他们真实数据（下面给你），结论先行，一段说完，不超过 5 句。数字要说明是谁的、哪天的。',
    '2. 只有当用户明确要求记录/修改时，才在回复末尾附加动作块，格式（可多个动作放数组）：',
    '```action\n[{"type":"log_weight","who":"me","v":73.2},{"type":"log_waist","who":"me","v":83},{"type":"log_diet","who":"me","items":[{"n":"米饭","k":200,"m":"l"}]},{"type":"set_goal","me":65,"partner":63}]\n```',
    '3. 动作说明：log_weight 记体重(kg)、log_waist 记腰围(cm)、log_diet 记饮食(m 是餐段：b早餐/l午餐/d晚餐/s零食，k 是估算千卡，必须有数字)、set_goal 改目标。who 只能是 "me" 或 "partner"，不确定问谁时默认 me。',
    '3b. 「记体重/今天称了/体重是X」用 log_weight；只有用户明确说到"目标"两个字且数值远低于当前体重才用 set_goal。「把体重改成X」按 log_weight 理解。绝不用 set_goal 记当天体重。',
    '3c. log_diet 关键规则：用户提到任何吃的（哪怕模糊如"大量牛肉鸡肉茄子"、"吃了顿火锅"），必须拆成 items 逐条记录，每条都要给出 k 的估算数字（模糊说法按常见分量估），绝不能因为说不清分量就不记。记完后在正文里说明你的估算假设，让用户可以纠正。',
    '3d. 提到非今天的日子（昨天/前天等），log_weight/log_waist/log_diet 动作里都必须带 date 字段（YYYY-MM-DD，按开头的日期换算）。m 餐段按语境判断：早餐=b、午饭/中午=l、晚饭/晚上/请客吃饭聚餐下馆子=d、零食加餐=s，说不清用 s。',
    '3e. 缺信息时最多问一个问题，而且能按合理假设先记就先记（记完说明假设），不要连环反问。',
    '3f. 用户说「健身打卡/今天练了/记一下健身/补昨天的健身」时用 log_workout 动作，d 字段写实际内容（没细说就写默认套餐：健身棒上举20前举20下举20单臂各5+俯卧撑30+胯下击掌60+提踵45）。这是他们的每日固定训练，别用 log_diet。',
    '4. 估算食物热量要给合理数字；用户没说份数就按常见一份估。',
    '5. 动作块必须放在回复最后，动作块之后不要再写正文。没有动作就别输出动作块。',
    '5b. 严禁在正文里写「已记上/✓/已修改」这类执行确认——动作是否成功由 App 系统反馈行告知用户，你只写建议和结论。',
    '6. 动作块的开头必须是三个反引号紧跟单词 action（即 ```action），结尾三个反引号。绝对不要用单个反引号包 JSON。',
    '示例——用户说「帮我记今天体重73.2」，你回复：',
    '已记上 73.2 kg。最近 7 天你在 72.8~73.6 之间，趋势平稳。今晚早点睡，明早空腹再称会更准。\n```action\n[{"type":"log_weight","who":"me","v":73.2}]\n```',
    '—— 以下是他们的真实数据 ——',
    aiContext()
  ].join('\n');
}

/* —— 调 API —— */
function aiCallAPI(sysPrompt, msgs, cb) {
  const c = aiCfg();
  fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.key },
    body: JSON.stringify({ model: c.model, messages: [{ role: 'system', content: sysPrompt }].concat(msgs), temperature: 0.3, max_tokens: 1500, thinking: { type: 'disabled' } })
  }).then(r => r.json().then(j => ({ ok: r.ok, j: j }))).then(x => {
    if (!x.ok) { const m = (x.j && x.j.error && x.j.error.message) || ('HTTP ' + x.ok); cb(null, m); return; }
    const t = x.j.choices && x.j.choices[0] && x.j.choices[0].message && x.j.choices[0].message.content;
    cb(typeof t === 'string' ? t : null, t === undefined ? '回复为空' : null);
  }).catch(e => cb(null, e.message || '网络错误'));
}

/* —— 解析并执行动作块 —— */
const AI_ACT_TYPES = ['log_weight', 'log_waist', 'log_diet', 'set_goal', 'log_workout'];
function aiParseActions(text) {
  const out = [];
  const push = function (j) {
    (Array.isArray(j) ? j : [j]).forEach(function (a) {
      if (a && AI_ACT_TYPES.indexOf(a.type) > -1) out.push(a);
    });
  };
  const re = /```(?:action)?\s*([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    try { push(JSON.parse(m[1].trim())); } catch (e) { /* 继续其他块 */ }
  }
  if (out.length) return out;
  /* 兜底：模型不守格式时，抓文本里含动作 type 的 JSON（裸 {} 或反引号包的 {}） */
  const re2 = /(\[[\s\S]{2,600}?\]|\{[\s\S]{2,400}?\})/g;
  let m2;
  while ((m2 = re2.exec(text)) !== null) {
    const frag = m2[1];
    if (frag.indexOf('"type"') === -1 && frag.indexOf("'type'") === -1) continue;
    let fragOk = frag.replace(/([{,]\s*)([A-Za-z_]+)(\s*:)/g, '$1"$2"$3').replace(/'/g, '"');
    try { push(JSON.parse(fragOk)); } catch (e) { /* 非动作 JSON 忽略 */ }
  }
  return out;
}
function aiStripActions(text) {
  let t = text.replace(/```action[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, function (b) {
    return (b.indexOf('"type"') > -1 || b.indexOf("'type'") > -1) ? '' : b;
  });
  t = t.replace(/`(\[[^\`]{2,600}?\]|\{[^\`]{2,400}?\})`/g, function (b, j) {
    return (j.indexOf('"type"') > -1) ? '' : b;
  });
  return t.trim();
}

function aiDateOf(d, tk) {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= tk && d >= '2024-01-01') return d;
  return tk;
}
function aiRunActions(acts) {
  const done = [];
  const tk = todayKey();
  acts.forEach(function (a) {
    try {
      let who = (a.who === 'partner') ? 'partner' : 'me';
      const _wstr = String(a.who || '');
      if (/(Tina|她|女友|女伴|对象|老婆|partner)/i.test(_wstr) && !/(Elio|我|me)/i.test(_wstr)) who = 'partner';
      const name = who === 'me' ? state.names.me : state.names.partner;
      if (a.type === 'log_weight') {
        const v = Number(a.v);
        if (!isFinite(v) || v < 20 || v > 300) { done.push('⚠️ 体重数字 ' + a.v + ' 不合理，没记'); return; }
        const dk = aiDateOf(a.date, tk);
        state.records[dk] = state.records[dk] || {};
        const had = typeof state.records[dk][who] === 'number';
        state.records[dk][who] = v;
        done.push('✓ 已' + (had ? '更新' : '记上') + ' ' + name + ' ' + (dk === tk ? '今天' : dk) + '体重 ' + v + ' kg');
      } else if (a.type === 'log_waist') {
        const v = Number(a.v);
        if (!isFinite(v) || v < 40 || v > 200) { done.push('⚠️ 腰围数字不合理，没记'); return; }
        state.records[aiDateOf(a.date, tk)] = state.records[aiDateOf(a.date, tk)] || {};
        state.records[aiDateOf(a.date, tk)][who + '_waist'] = v;
        done.push('✓ 已记 ' + name + ' 今天腰围 ' + v + ' cm');
      } else if (a.type === 'log_diet') {
        const items = Array.isArray(a.items) ? a.items : [];
        const ok = [];
        items.forEach(it => {
          let k = Math.round(Number(it.k));
          if (it.n && (!isFinite(k) || k <= 0 || k > 5000)) k = 150; /* AI 没估出热量给保守默认，先记上 */
          if (it.n) { const _ms = String(it.m || ''); const _mm = DIET_MEALS[_ms] ? _ms : (/早/.test(_ms) ? 'b' : (/中|午/.test(_ms) ? 'l' : (/晚|餐|聚/.test(_ms) ? 'd' : 's'))); ok.push({ n: String(it.n).slice(0, 24), k: k, m: _mm, w: who }); }
        });
        if (!ok.length) { done.push('⚠️ 饮食没认出能记的项'); return; }
        const dk = aiDateOf(a.date, tk);
        state.records[dk] = state.records[dk] || {};
        state.records[dk].diet = state.records[dk].diet || [];
        ok.forEach(o => state.records[dk].diet.push(o));
        persist();
        done.push('✓ 已记 ' + name + ' ' + (dk === tk ? '今天' : dk) + ' ' + ok.length + ' 样饮食（约 ' + ok.reduce((x, y) => x + y.k, 0) + ' kcal）');
      } else if (a.type === 'log_workout') {
        const dk = aiDateOf(a.date, tk);
        state.records[dk] = state.records[dk] || {};
        const desc = (typeof a.d === 'string' && a.d.trim()) ? a.d.trim().slice(0, 140) : WORKOUT_DEFAULT;
        state.records[dk].workout = { done: 1, d: desc };
        persist();
        done.push('已打卡 ' + name + ' ' + (dk === tk ? '今天' : dk) + ' 的健身');
      } else if (a.type === 'set_goal') {
        const nm = (isFinite(Number(a.me)) && a.me !== null) ? Number(a.me) : ((isFinite(Number(a.v)) && (a.who === 'me' || !a.who)) ? Number(a.v) : null);
        const np = (isFinite(Number(a.partner)) && a.partner !== null) ? Number(a.partner) : ((isFinite(Number(a.v)) && a.who === 'partner') ? Number(a.v) : null);
        const bad = [];
        if (nm !== null && isFinite(nm)) {
          const cw = lastKnown('me');
          if (nm < 40 || nm > 120 || (cw !== null && nm >= cw)) bad.push(state.names.me + '(' + nm + ')');
          else state.goals.me = nm;
        }
        if (np !== null && isFinite(np)) {
          const cw2 = lastKnown('partner');
          if (np < 40 || np > 120 || (cw2 !== null && np >= cw2)) bad.push(state.names.partner + '(' + np + ')');
          else state.goals.partner = np;
        }
        if (bad.length) {
          persist(); done.push('⚠️ 目标没改：' + bad.join('、') + ' 不合理（目标要比现在的体重低才对）。要改去「名字与目标」页手动填');
        } else {
          persist(); done.push('✓ 目标已改为 ' + state.goals.me + ' / ' + state.goals.partner + ' kg');
        }
      }
    } catch (err) { done.push('⚠️ 一项没执行成功：' + (err.message || err)); }
  });
  if (done.some(x => x.indexOf('✓') === 0)) { persist(); refreshOpenSheet(); }
  return done;
}

/* —— 聊天界面 —— */
function aiChatBody() {
  if (!aiHas()) return aiSetupHTML();
  const msgs = aiMsgs();
  let h = '<div class="ai-wrap">';
  h += '<div class="ai-hero"><b>AI 管家</b><span>说话就能记 · 问什么答什么</span><i data-action="ai-cycle-model" style="cursor:pointer">模型：' + (aiCfg().model || 'glm-4-flash') + '</i><i onclick="aiResetKey()" style="cursor:pointer;margin-left:8px">换钥匙</i></div>';
  h += '<div class="ai-msgs" id="ai-msgs">';
  if (!msgs.length) {
    h += '<div class="ai-msg ai"><div class="ai-bub">我是你们的 AI 管家 🧑‍🍳 不对，是教练+记账员。可以：<br>· 说「帮我记今天午饭三菜一汤」——我直接记上<br>· 问「我这周吃得怎么样」——我看数据说话<br>· 说「帮 ' + esc(state.names.partner) + ' 记体重 68.2」——分人记，不会乱<br>下面输入框可以直接打字，也可以点 🎤 说。</div></div>';
  }
  msgs.forEach(function (m) {
    h += '<div class="ai-msg ' + (m.role === 'user' ? 'user' : 'ai') + '"><div class="ai-bub">' + nl2brAI(m.c) + '</div></div>';
  });
  h += '</div>';
  h += '<div class="ai-quick">' + ['这周我们吃得怎么样', '帮我记今天午饭：', '最近趋势怎么样，该注意啥'].map(q =>
    '<button class="set-chip" data-action="ai-quick" data-q="' + q + '">' + q + '</button>').join('') + '</div>';
  h += '<div class="ai-inrow">' +
    (voiceSupport() ? '<button class="mic-btn" data-action="voice" data-for="ai-input" aria-label="语音输入">' + MIC_SVG + '</button>' : '') +
    '<input class="text-input" id="ai-input" placeholder="说话或打字，比如：帮我记今天体重73.2" enterkeyhint="send">' +
    '<button class="btn" data-action="ai-send">发送</button></div>';
  h += '</div>';
  return h;
}
function nl2brAI(t) { return esc(t).replace(/\n/g, '<br>'); }
function aiSetupHTML() {
  const c = aiCfg();
  return '<div class="ai-wrap"><div class="ai-hero"><b>AI 管家</b><span>接入智谱 AI，像跟我聊天一样操作这个 App</span></div>' +
    '<div class="card" style="margin-top:14px"><div class="card-label">第一步 · 填钥匙</div>' +
    '<p class="s-dim" style="margin:0 0 10px">钥匙就是 API Key。填一次就存进这部手机，<b>只存本机</b>，不上传、不进代码。聊天内容会发给智谱换取回答。</p>' +
    '<div class="field"><span>API Key</span><input class="text-input" id="ai-key-in" type="password" placeholder="粘贴你的智谱 API Key" value="' + esc(c.key) + '"></div>' +
    '<div class="field"><span>模型</span><select class="text-input" id="ai-model-in" style="padding:10px 12px">' + AI_MODELS.map(m =>
      '<option value="' + m + '"' + (m === c.model ? ' selected' : '') + '>' + m + (m.indexOf('flash') > -1 ? '（免费）' : '') + '</option>').join('') + '</select></div>' +
    '<button class="btn" data-action="ai-cfg-save" style="margin-top:12px">保存并开始用</button>' +
    '<button class="btn ghost" data-action="ai-cfg-test" style="margin-top:8px">先测测钥匙通不通</button>' +
    '<p class="set-tip" id="ai-test-tip">没有钥匙？智谱开放平台 open.bigmodel.cn 注册就能领，免费模型日常用不完。</p>' +
    '</div></div>';
}
function aiResetKey() {
  if (!confirm('重新配置会保留聊天记录，只清掉钥匙。要继续吗？')) return;
  aiSetCfg('', aiCfg().model);
  renderWidgetSheet('AI 管家');
}
function aiMsgsScroll() { const el = document.getElementById('ai-msgs'); if (el) el.scrollTop = el.scrollHeight; }

function aiSend() {
  const el = document.getElementById('ai-input');
  const val = el ? el.value.trim() : '';
  if (!val) { toast('先说点什么'); return; }
  if (val.length > 500) { toast('说得太长啦，砍到 500 字以内'); return; }
  aiPushMsg('user', val);
  el.value = '';
  renderWidgetSheet('AI 管家');
  const box = document.getElementById('ai-msgs');
  if (box) box.insertAdjacentHTML('beforeend', '<div class="ai-msg ai" id="ai-thinking"><div class="ai-bub dim">正在想…</div></div>');
  aiMsgsScroll();
  const hist = aiMsgs().slice(-8).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.c }));
  aiCallAPI(aiSystemPrompt(), hist, function (text, err) {
    if (err !== null) {
      aiPushMsg('ai', '⚠️ 连不上 AI（' + err + '）。检查钥匙是否填对/是否欠费，或者过会儿再试。');
      renderWidgetSheet('AI 管家');
      return;
    }
    const acts = aiParseActions(text);
    let feed = '';
    if (acts.length) {
      const done = aiRunActions(acts);
      feed = done.length ? '\nApp 系统反馈：\n' + done.join('\n') : '';
    }
    aiPushMsg('ai', aiStripActions(text) + feed);
    renderWidgetSheet('AI 管家');
  });
}

/* —— AI 食物识别（无钥匙时回退本地词典，调用方已处理） —— */
function aiParseFood(say) {
  const btn = document.querySelector('[data-action=diet-parse]');
  if (btn) { btn.disabled = true; btn.textContent = 'AI 认菜中…'; }
  const sys = '你是食物热量估算器。用户说一段吃了什么的话，你输出 JSON 数组，不要输出任何别的文字。格式：[{"n":"食物名","k":千卡数字}]。规则：1. 只算用户本人这顿吃的；2. 份数词（两个/一碗/半份）要折算进 k；3. 常见家常菜/餐厅菜/零食都要能估；4. 实在无法判断的给常见做法的中位估算；5. k 必须是 20~5000 的数字；6. n 保持用户原词或通用名，别加做法修饰。';
  aiCallAPI(sys, [{ role: 'user', content: say }], function (text, err) {
    if (btn) { btn.disabled = false; btn.textContent = '识别'; }
    if (err !== null) {
      const res = parseDietText(say);
      if (res.length) { dietParsed = dietParsed.concat(res); renderWidgetSheet('饮食日记'); toast('AI 没接上，词典认出 ' + res.length + ' 样'); }
      else toast('AI 没接上：' + err);
      return;
    }
    let arr = null;
    try {
      const m = text.match(/\[[\s\S]*\]/);
      arr = JSON.parse(m[0]);
    } catch (e) { arr = null; }
    if (!Array.isArray(arr) || !arr.length) { toast('AI 也没认出来，换个说法试试'); return; }
    const res = arr.filter(x => x && x.n && isFinite(Number(x.k)) && Number(x.k) > 0)
      .map(x => ({ n: String(x.n).slice(0, 24), k: Math.min(5000, Math.max(20, Math.round(Number(x.k)))), guessed: true }));
    if (!res.length) { toast('AI 也没认出来，换个说法试试'); return; }
    dietParsed = dietParsed.concat(res);
    renderWidgetSheet('饮食日记');
    toast('✓ AI 认出 ' + res.length + ' 样，核对后记上');
  });
}

/* —— 语音输入（iOS Safari 14.5+ / Chrome 可用；不支持的设备隐藏按钮，用键盘自带听写兜底） —— */
function voiceSupport() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); }
let voiceRec = null, voiceBusy = false;
function voiceStart(forId) {
  if (/(iPhone|iPad|iPod)/i.test(navigator.userAgent)) {
    /* iOS 全系：网页语音接口不可靠（授权后锁死页面），直接引导用系统键盘听写——更快更准 */
    toast('iPhone 系统限制：网页麦克风不可用。点输入框唤起键盘，长按键盘左下角的 🎤 听写键说话，说完自动变文字，比网页识别更快更准', 4200);
    return;
  }
  if (!voiceSupport()) { toast('这台设备不支持网页语音，用键盘上的麦克风按钮一样能说'); return; }
  if (voiceBusy) { try { voiceRec.stop(); } catch (e) {} return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  voiceRec = new SR();
  voiceRec.lang = 'zh-CN';
  voiceRec.interimResults = false;
  voiceRec.maxAlternatives = 1;
  const btn = document.querySelector('.mic-btn[data-for="' + forId + '"]');
  voiceRec.onstart = function () { voiceBusy = true; if (btn) btn.classList.add('rec'); toast('开始说…说完自动停'); };
  voiceRec.onend = function () { voiceBusy = false; if (btn) btn.classList.remove('rec'); };
  voiceRec.onerror = function (e) {
    voiceBusy = false; if (btn) btn.classList.remove('rec');
    if (e.error === 'not-allowed') toast('麦克风权限被拒：设置 → Safari → 麦克风 打开，或用键盘麦克风');
    else if (e.error === 'no-speech') toast('没听到声音，再点一次说');
    else toast('语音没接上（' + e.error + '），可以用键盘麦克风');
  };
  voiceRec.onresult = function (ev) {
    const t = ev.results && ev.results[0] && ev.results[0][0] && ev.results[0][0].transcript || '';
    const el = document.getElementById(forId);
    if (el && t) { el.value = (el.value ? el.value + ' ' : '') + t; el.focus(); }
  };
  try { voiceRec.start(); } catch (e) { voiceBusy = false; toast('语音没启动成功，再点一次'); }
}

/* —— 事件：AI 相关 —— */
/* ai-send / ai-quick / ai-cfg-save / ai-cfg-test / voice —— 挂进主委托，见下方注入 */
