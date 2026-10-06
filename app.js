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
let COLORS = { me: '#007aff', partner: '#ff9500' }; /* V42: let，随主题切换同步 */
const WEEK_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/* 版本与更新日志：每次部署必须更新 APP_VERSION 和这里的第一条
   作用：优化后用户能在设置页核对「真的更新了」——尤其 bug 类修复界面看不出变化 */
const APP_VERSION = 'V66';
const CHANGELOG = [
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
  { n: '炒菜', u: '份', k: 150 }, { n: '火锅', u: '顿', k: 800 }, { n: '麻辣烫', u: '份', k: 500 }
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
  const segs = text.split(/[，,。；;、\s和再还有]+/).map(function (s) { return s.trim(); }).filter(Boolean);
  const QTY_RE = '个|个大|只|根|碗|杯|片|份|块|勺|盘|条|包|瓶|盒|罐|颗|枚|串|小把|大勺|点';
  segs.forEach(function (seg) {
    const m = seg.match(new RegExp('^([0-9.]+|[一二两三四五六七八九十半])?(?:' + QTY_RE + ')?\\s*(.+)$'));
    let qty = 1, name = seg;
    if (m && m[2] && m[1]) {
      qty = /[0-9.]/.test(m[1]) ? parseFloat(m[1]) : (CN[m[1]] || 1);
      name = m[2];
    } else if (m && m[2]) {
      name = m[2];
    }
    /* 「一点西瓜」：数量是「一点」这类虚词 → 按 1 份 */
    if (/^[一点些]+/.test(name) && name.length > 2) { name = name.replace(/^[一点些]+/, ''); qty = 1; }
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
      for (const f of FOOD_DB) {
        let p = rest2.indexOf(f.n);
        let from = false;
        if (p === -1 && f.n.indexOf(rest2) === 0) { p = 0; from = true; }
        if (p > -1 && f.n.length > hitLen) { hit = f; hitLen = f.n.length; hitPos = from ? 0 : p; }
      }
      if (!hit) {
        const g = guessFood(rest2);
        if (g) out.push({ n: g.n + (qty !== 1 ? '×' + qty : ''), k: g.k, guessed: true });
        else out.push({ n: rest2.trim(), k: null, guessed: true });
        break;
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
  { id: 'plankleg', n: '平板抬腿', grp: '腹肌', kind: 'core', need: null,
    sets: '3 组 × 每边 10 次', rest: '组间休息 45 秒',
    tips: ['平板姿势基础上交替抬腿', '臀部和核心一起收紧', '屁股别歪， hips 保持水平'],
    bv: 'BV1paigeEEMx', by: '爱健身的体育老师' },
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
    bv: 'BV1c34y1q73T', by: '康复学堂' }
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
  if (typeof u.theme === 'string') {
    /* V42：白名单用字面量（铁律：loadState 链路不引用后文常量）；旧主题迁移到新风格 */
    const MIGRATE = { warm: 'creme', mint: 'creme', ocean: 'midnight', dark: 'midnight' };
    if (MIGRATE[u.theme]) d.theme = MIGRATE[u.theme];
    else if (['classic','onyx','creme','midnight','paper','neon','sakura','matcha','terra','aurora','glacier','mocha','graphite','lilac','emerald','mono'].indexOf(u.theme) > -1) d.theme = u.theme;
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
      '<p class="sub" style="margin:12px 0 6px">备注（选填）：写完自动保存 · 显示在统计页「全部记录」和月历的点日详情里</p>' +
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
      '<button class="btn sm" data-action="save-goals-inline">保存目标，开始倒计时</button>' +
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
    waistBox.innerHTML = '';
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
  return '<div class="card"><h3 class="card-label">本周 vs 上周</h3>' +
    '<div class="wc-wrap">' + cols + '</div>' +
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

function renderStats() {
  const keys = sortedKeys();
  let html = '';

  /* 30 天总览大屏 + 本周对比（V60）：顶部前两张 */
  html += overviewHTML();
  html += weekCompareHTML();

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
      '<div class="wk-head"><span>周</span><span>' + esc(state.names.me) + '</span><span>' + esc(state.names.partner) + '</span></div>' + wkRows + weekDuelHTML() + '</div>';
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
  bindFoldToggle(document.getElementById("stats-body"));
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
  { k: 'mono',     n: '报刊', en: 'MONO',     desc: '衬线报刊 · 黑白砖红',   bg: '#f7f5f0', fg: '#141414', accent: '#141414', me: '#141414', partner: '#8a2b1e', numFont: 'Georgia,"Times New Roman",serif', radius: '0px' }
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
  if (bk) {
    const backBtn = document.createElement('button');
    backBtn.className = 'btn ghost sm';
    backBtn.setAttribute('data-action', 'widget-back');
    backBtn.style.cssText = 'width:auto;display:inline-block;padding:7px 12px;font-size:12px;margin-bottom:10px';
    backBtn.textContent = '‹ 返回' + bk.t;
    body.insertBefore(backBtn, body.firstChild);
  }
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
function gymMoveChip(m) {
  return '<button class="set-chip gym-chip" data-action="gym-open" data-id="' + m.id + '" data-back="' + (curWidget || 'gym-lib') + '">' + m.n + '<i>' + m.grp + '</i></button>';
}
/* V66: 动作库（部位筛选 + 全部展示） */
let gymFilter = '全部';
const GYM_CATS = ['全部', '腹肌', '腿部', '臀部', '胸部', '背部', '肩部', '手臂', '有氧', '全身'];
function gymLibBody() {
  let h = '<p class="sub">每个动作都配了 B 站正规教学视频（教练/康复师人工核过）· 几组几次几点休息都写清了 · 点动作看视频</p>';
  h += '<div class="diet-tabs">' + GYM_CATS.map(c =>
    '<button class="set-chip' + (gymFilter === c ? ' on' : '') + '" data-action="gym-filter" data-c="' + c + '">' + c + '</button>').join('') + '</div>';
  const ms = gymFilter === '全部' ? GYM_MOVES : GYM_MOVES.filter(m => m.grp === gymFilter);
  if (!ms.length) h += '<p class="sub">这个部位还没录，先用相邻部位练</p>';
  else {
    h += '<p class="sub" style="margin:10px 2px 4px">' + gymFilter + ' · ' + ms.length + ' 个动作</p>';
    h += '<div class="gym-chips">' + ms.map(gymMoveChip).join('') + '</div>';
  }
  h += '<p class="set-tip">腹部新手路径：卷腹摸膝 → 卷腹 → 反向卷腹 → 空中蹬车 → 平板支撑，每组都能保证动作质量再加难度</p>';
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
  else h += '<div class="key-line">还没勾器械——纯徒手也能练 · 去设置页「我的运动与器械」勾上家里有的，计划会更准</div>';
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
  h += '<div class="diet-sum"><b>' + sum + '</b><span>kcal 今天合计 · ' + esc(state.names[dietWho]) + '</span></div>' +
    '<div class="diet-ref"><b>减脂参考</b>175cm / 72kg 每天吃 1500-1800 kcal 大概率掉秤 · 最近 7 天平均 <b>' + avg7 + ' kcal</b> · 都是估算，量准了再抠</div>';
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
    '<div class="diet-say"><input class="text-input" id="diet-say" placeholder="例：两个鸡蛋 一个玉米 一杯牛奶" enterkeyhint="done">' +
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
  diet: W_ICON('<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>'),
  'gym-lib': W_ICON('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'),
  'gym-plan': W_ICON('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
  equip: W_ICON('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'),
  trend: W_ICON('<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>'),
  review: W_ICON('<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.89"/>'),
  data: W_ICON('<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>'),
  remind: W_ICON('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>')
};
const WIDGETS = [
  { id: 'diet', t: '饮食日记', sub: '三餐+热量，减脂第一线' },
  { id: 'gym-lib', t: '居家动作库', sub: '36 个动作 · 按部位筛选' },
  { id: 'gym-plan', t: '智能训练规划', sub: '按你的器械排一周' },
  { id: 'equip', t: '运动与器械', sub: '勾上家里有的，计划更准' },
  { id: 'trend', t: '趋势预测', sub: '几号到目标，按真实速度' },
  { id: 'data', t: '数据与同步', sub: '云备份 · 双人同步 · 存档' },
  { id: 'review', t: '年度回顾', sub: '这一年你们的变化' },
  { id: 'remind', t: '称重提醒', sub: '每天早上弹窗提醒' }
];
let curWidget = null, widgetBack = null;
function openWidget(id) {
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
    if (curWidget === 'diet') body += dietBody();
    else if (curWidget === 'gym-lib') body += gymLibBody();
    else if (curWidget === 'gym-plan') body += gymPlanBody();
    else if (curWidget === 'equip') body += equipBody();
    else if (curWidget === 'trend') body += trendBody();
    else if (curWidget === 'review') body += yearReviewHTML();
    else if (curWidget === 'data') body += dataBody();
    else if (curWidget === 'remind') body += remindBody();
    else body += '<p class="sub">这个组件内容走丢了，重新点一下试试</p>';
  } catch (err) {
    /* V63 保险丝：内容函数抛错时也要切换 body，绝不出现标题/内容错位 */
    body += '<p class="sub">内容加载出错（' + esc(String(err.message || err)) + '）· 关掉重开一次就好，数据没丢</p>';
  }
  bEl.innerHTML = body;
}
function renderTools() {
  document.getElementById('tools-body').innerHTML =
    '<p class="sub" style="margin:4px 2px 14px">吃的、练的、数据家底，都在这营里管 · 点组件进去</p>' +
    '<div class="wg-grid">' + WIDGETS.map(w =>
      '<button class="wg-item" data-action="widget-open" data-id="' + w.id + '">' +
      WIDGET_ICONS[w.id] + '<b>' + w.t + '</b><span>' + w.sub + '</span></button>').join('') + '</div>';
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
  const GROUPS = [
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
  body.innerHTML = '<p class="sub" style="margin:2px 2px 12px">偏好都在这 · 健身的和数据的在「健康营」里管</p>' +
    '<div class="wg-grid">' + GROUPS.filter(g => buckets[g.id].length).map(g =>
    '<button class="wg-item" data-action="set-group" data-id="' + g.id + '">' +
    SET_ICONS[g.id] + '<b>' + g.t + '</b><span>' + g.sub + '</span></button>').join('') + '</div>';
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
      state.ui.themeDate = todayKey(); /* 手动选完当天不再被轮换覆盖 */
      persist();
      applyTheme();
      renderAll();
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
    else if (a === 'toggle-month') { const mk = act.dataset.mkey; expandedMonths[mk] = !expandedMonths[mk]; renderStats(); }
    else if (a === 'month-view') { const mk = act.dataset.mkey; monthView[mk] = monthView[mk] === 'cal' ? 'list' : 'cal'; if (!expandedMonths[mk]) expandedMonths[mk] = true; renderStats(); }
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
    else if (a === 'widget-open') {
      openWidget(act.getAttribute('data-id'));
    }
    else if (a === 'widget-close') {
      document.getElementById('widget-sheet').classList.remove('show');
      document.getElementById('sheet-mask').classList.remove('show');
      curWidget = null; widgetBack = null;
    }
    else if (a === 'widget-back') {
      const bw = WIDGETS.find(x => x.id === widgetBack);
      if (bw) { renderWidgetSheet(bw.t); curWidget = widgetBack; widgetBack = null; }
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
    else if (a === 'gym-filter') {
      gymFilter = act.getAttribute('data-c') || '全部';
      renderWidgetSheet('居家动作库');
    }
    else if (a === 'gym-open') {
      openGymSheet(act.getAttribute('data-id'), act.getAttribute('data-back'));
    }
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
