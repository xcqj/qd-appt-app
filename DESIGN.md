# Design System · 号源预约（移动端 · 患者端 + 分诊台）

> **本文是移动端唯一视觉事实源**。写页面前先对照本文件；颜色、字号、间距、圆角**只取本文件的 token**，不得临时造值。
> 覆盖范围：S10 患者主链路 10 屏（首页 / 选院区 / 选科室 / 医生列表 / 医生主页 / 排班选时 / 确认预约 / 支付 / 我的预约 / 预约详情）。
> S11 辅助页（我的就诊人、我的医生、消息、我的、分诊台）只适用本文的 token 与组件规范，不逐屏画。
> 配套：`README.md`（启动）、`AGENTS.md`（实现约定）、`../docs/api-contract.md`（字段出处）。

演示数据全部虚构，界面只出现中文与虚构医院名，**不出现英文代号**。

---

## 1. 视觉主题与氛围

**克制、可信、带温度的临床感**——像一间采光良好、指示清晰的现代门诊楼，而不是营销落地页。

| 维度 | 取值 | 说明 |
|---|---|---|
| 密度（Density） | **7 / 10** | 医疗场景信息优先：一屏要能看清医生、科室、院区、余量、价格 |
| 变化度（Variance） | **3 / 10** | 结构稳定可预期，患者不该在找按钮上花时间；不做非对称割裂布局 |
| 动效（Motion） | **2 / 10** | 只做出现/消失与点击态，**不做装饰性循环动画** |

**氛围描述**：浅灰底（`#F5F7FA`）承托白色卡片，主色只出现在关键行动、当前选中态与首页品牌区；层次靠**字号阶梯 + 分隔线**建立，不靠阴影堆叠。全站只有一个渐变——首页顶部 240rpx 的品牌区。

> 与通用「高饱和 + 玻璃拟态 + 持续微动效」风格的分歧是**故意的**：医疗场景里，装饰性动效和强对比会被读成「不专业」或「在推销」。

---

## 2. 色板与角色

### 2.1 主色与语义色

| 名称 | Hex | 用途 | 禁止用途 |
|---|---|---|---|
| 主色 · 深潭青 | `#1F7A8C` | 主按钮、当前 tab、选中态、链接、品牌区渐变起点 | 大面积铺底、正文文字 |
| 主色暗 · 深水 | `#16636F` | 主按钮按下态、深色底上的文字 | 常规文字 |
| 强调 · 松石 | `#2A9D8F` | **仅**首页品牌区渐变终点、极少数强调标记 | 按钮填充、状态标签 |
| 成功 | `#2E9E6B` | 已签到、支付成功 | 装饰 |
| 警告 | `#D98E04` | 待支付、被动退号、余量紧张 | 主按钮 |
| 危险 | `#D14343` | 爽约、取消预约、错误文案、退出登录 | 大面积背景 |
| 信息 | `#3B82C4` | 已预约、提示类文案 | 主按钮 |

### 2.2 中性色

| 名称 | Hex | 用途 |
|---|---|---|
| 画布 | `#F5F7FA` | 页面底色（`page`） |
| 表面 | `#FFFFFF` | 卡片、列表、底部操作条 |
| 浅表面 | `#EEF2F6` | 未选中分段、输入框底、图片占位 |
| 主文字 | `#1F2D3D` | 标题、正文（**不用纯黑** `#000000`） |
| 次文字 | `#5A667E` | 副标题、字段值 |
| 弱文字 | `#8A94A6` | 说明、时间戳、占位符 |
| 分隔线 | `#E6EBF2` | 1rpx 细分隔线、卡片描边（若需要） |

### 2.3 挂号状态色映射（**唯一出处，页面只引用状态名**）

| 状态线值 | 中文标签 | 文字/描边色 | 底色（12% 透明度） |
|---|---|---|---|
| `WAIT_PAY` | 待支付 | `#D98E04` | `rgba(217,142,4,.12)` |
| `BOOKED` | 已预约 | `#3B82C4` | `rgba(59,130,196,.12)` |
| `SIGNED` | 已签到 | `#2E9E6B` | `rgba(46,158,107,.12)` |
| `COMPLETED` | 已完成 | `#5A667E` | `rgba(90,102,126,.10)` |
| `CLOSED` | 已关闭 | `#8A94A6` | `rgba(138,148,166,.12)` |
| `CANCELED_ACTIVE` | 已退号（主动） | `#8A94A6` | `rgba(138,148,166,.12)` |
| `CANCELED_PASSIVE` | 已退号（停诊） | `#D98E04` | `rgba(217,142,4,.12)` |
| `NOSHOW` | 已爽约 | `#D14343` | `rgba(209,67,67,.12)` |

> **严禁**在页面里另写 `#xxx` 表示状态；新增状态必须先进本表。后台（plus-ui）与移动端保持同一套语义色。

---

## 3. 字体与排版

**字体栈**：`-apple-system, "PingFang SC", "HarmonyOS Sans SC", "Noto Sans SC", sans-serif`
**数字**：金额、时间、单号一律 `font-variant-numeric: tabular-nums`（等宽数字，避免跳动）；小程序端不支持时退化为默认字体，**不得**为此引入第三方字体文件。

| 层级 | 字号 | 字重 | 行高 | 用途 |
|---|---|---|---|---|
| 展示 | 56rpx | 700 | 1.2 | 首页品牌区标题 |
| 页面标题 | 44rpx | 600 | 1.3 | 登录、分诊台标题 |
| 区块标题 | 36rpx | 600 | 1.4 | 「今日出诊」「就诊人」 |
| 卡片标题 | 32rpx | 600 | 1.4 | 医生姓名、科室名 |
| **正文** | **28rpx** | 400 | **1.6** | 列表值、段落 |
| 辅助 | 26rpx | 400 | 1.5 | 地址、职称、说明 |
| 标签 | 24rpx | 500 | 1.4 | tabBar、tag |
| 极小 | 20rpx | 400 | 1.4 | 脚注、免责声明 |

规则：单行正文最大宽度不超过 62 个中文字符；一屏最多 3 个字号层级同时出现。

---

## 4. 间距、圆角、阴影、栅格

**间距阶梯（rpx）**：`8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64`
**页面安全边距**：左右 `32rpx`；卡片之间纵向 `20rpx`；卡片内边距 `24~28rpx`。
**圆角**：`8`（tag、输入）/ `12`（按钮内嵌元素）/ `16`（输入行、图片）/ `20`（列表容器）/ `24`（**卡片标准**）/ `999`（头像、圆点）

**阴影（只允许 2 档）**

| 档位 | 值 | 用途 |
|---|---|---|
| 卡片 | `0 2rpx 8rpx rgba(31,45,61,.04)` | 白卡浮起一点，几乎看不见 |
| 浮层 | `0 8rpx 32rpx rgba(31,45,61,.12)` | 底部操作条、弹层 |

> 禁止第三档阴影、禁止卡片内套卡片（列表行用分隔线，不用内层卡）、禁止投影带颜色。

**栅格**：以 750rpx 设计宽为基准；单列为主，医生列表两列（`wd-row` / `wd-col` 24 栅格，每卡 `span=12`，间隙 `20rpx`）。

---

## 5. 组件规范（12 类）

只使用 `@wot-ui/ui` 2.x **实测存在**的组件（`Components()` 自动导入，模板里直接写 `<wd-button>` 这类标签，无需 import）。

| # | 组件 | 用什么 | 尺寸/变体 | 禁用条件 |
|---|---|---|---|---|
| 1 | 页面骨架 | 原生导航 + `scroll-view` 内容区 | 内容左右 32rpx，纵向 8rpx 节奏 | 不用 `wd-navbar` 叠加原生导航（双标题） |
| 2 | 白卡 | `view.card`（自写 class） | 白底 / 24rpx 圆角 / 28rpx 内边距 / 卡片阴影 | 卡内不再套卡 |
| 3 | 列表行 | `wd-cell` 或自写行 | 高 96rpx；左标题 28rpx/500，右值 28rpx/400 次色；底部 1rpx `#E6EBF2`，末行无线 | 行内不放两个以上可点区域 |
| 4 | 状态标签 | `wd-tag` size=small | 22rpx/500，圆角 8rpx，底色取状态色 12% | 不用纯色填充铺满；不用于非状态信息 |
| 5 | 日期栏 | `scroll-view` 横向 + 自写日格 | 每格 120rpx 宽；选中态主色底白字；有号显示圆点 | 不做「日/周」下拉日历（多一步操作） |
| 6 | 午别分段 | `wd-segmented` 或 `wd-tabs` | 「上午 / 下午」两项；带余量数字 `上午 · 余 6` | 余量为 0 时置灰禁用，不隐藏 |
| 7 | 号源格子 | `wd-grid` + 自写格 | 每格最小 44rpx 高（点击区 ≥88rpx）；两态：可约（白底主色边框）/ 已约（浅表面 + 弱文字） | 已约格不可点了还弹 toast（直接 `disabled`） |
| 8 | 金额 | 自写 `text.money` | `¥` 22rpx + 数字 30rpx/600 + tabular-nums，两位小数不省略 | 禁止 `Number()` 转换、禁止千分位四舍五入 |
| 9 | 空态 | `wd-empty` | 文案 + 一句「怎么办」；可带一个次按钮 | 不写「暂无数据」四个字了事 |
| 10 | 加载 | `wd-skeleton`（列表首屏）/ `wd-loading`（按钮内） | 骨架块与真实布局同尺寸 | 不用全屏 loading 遮罩 |
| 11 | 底部操作条 | 自写固定条 + `wd-button` | 高 112rpx + 安全区；主按钮占满；上边阴影用「浮层」档 | 只在「确认预约」「支付」两屏出现 |
| 12 | 弹层 | `wd-popup` / `wd-action-sheet` / `wd-dialog` | 底部弹出、圆角 24rpx 顶部两角；危险操作默认焦点在「再想想」 | 不用弹层做二次确认以外的展示 |

**按钮**：主操作用 `type="primary"`（主色填充、无外发光）；次操作用 `plain`；危险操作 `type="error"` 且必须二次确认。点击态：整体 `opacity .9` + `translateY(1rpx)`，120ms。

**输入**：`wd-input` 行内，标签在左（宽 120~140rpx）或在上；错误文案在下方 24rpx 红色。密码用 `password`，验证码右挂图片（点击刷新）。

---

## 6. 布局原则

1. **一屏一主行动**：每个页面只有一个主按钮，固定在拇指可达区（页面底部或卡片右下）。
2. **信息分区自上而下**：导航 → 关键信息（医生/时间/金额）→ 次要信息（地址、须知）→ 操作。
3. **不重叠**：任何元素不压图、不压文字；不使用绝对定位做主轴布局。
4. **单列优先**：宽度 < 750rpx 时全部单列；医生卡两列只在列表页。
5. **空态、错误态必须成对出现**：每个数据区块都要有「加载 / 空 / 错误」三态，不允许白屏。
6. **底部操作条不遮内容**：内容区底部留 112rpx + `env(safe-area-inset-bottom)` 的占位。

---

## 7. 动效与交互

- **时长**：出现/消失 120–180ms `ease-out`；点击态 120ms。
- **只动 `transform` 与 `opacity`**，不动 `top/left/width/height`。
- **不做**：持续脉冲、漂浮、渐变光晕、打字机效果。
- **骨架屏**：列表与详情首屏用 `wd-skeleton`，与真实布局同尺寸，避免跳动。
- **提交类按钮**：点击立刻 `loading` + `disabled`，防重复提交（配合请求层 500ms 去重与后端 `Idempotency-Key`）。
- **支付页轮询**：进入页面立即查一次，之后每 2s 查一次，最多 60s；超时给「继续等待 / 稍后在预约里查看」两个出口。
- **返回栈**：挂号链路（选时间点 → 确认预约 → 支付）用 `redirectTo` 收敛，不在栈里堆 4 层；返回默认回到「我的预约」。
- **H5 与小程序差异**：`uni.scanCode` 仅小程序可用，H5 用「手动补签」输入单号。

---

## 8. 文案规范

### 8.1 语气

面向患者，短句、给下一步。不出现英文代号、不出现内部状态名、不说「系统繁忙请稍后再试」这类无信息量的话。

### 8.2 业务码 → 中文（**唯一映射表**）

| bizCode | 文案 |
|---|---|
| `SLOT_GONE` | 该时间点刚被约走，换一个试试 |
| `LIMIT_HOLD_MAX` | 你已有 3 个待就诊预约，先完成或取消一个 |
| `LIMIT_DEPT_DAY` | 同一天同一科室只能约 1 个号 |
| `LIMIT_TIME_CONFLICT` | 这个时间你已经有预约了 |
| `BLACKLISTED` | 近期退号/爽约较多，暂不可预约，请联系门诊服务台 |
| `OUT_OF_WINDOW` | 该日期暂未开放预约（可约未来 7 天） |
| `SCHEDULE_SUSPENDED` | 该医生当日停诊，已为你释放号源 |
| `REFUND_DEADLINE_PASSED` | 已过退号时限（就诊前一日 23:00） |
| `REG_STATE_INVALID` | 该预约当前状态不支持此操作 |
| `PATIENT_LIMIT_EXCEEDED` | 就诊人已达 10 人上限，先删除不用的 |
| `PATIENT_IN_USE` | 该就诊人还有未完成的预约 |
| `PATIENT_ID_CONFLICT` | 该证件号已被使用，请核对后重试 |
| `PAYMENT_CLOSED` | 该支付单已关闭 |
| `DUPLICATE_SUBMIT` | 正在提交，请勿重复点击 |
| 未知码 | 展示服务端 `msg`；无 `msg` 时用「操作失败，请稍后重试」 |

### 8.3 固定文案

- 首页品牌区副标题：「选择院区开始预约 · 演示数据全部虚构」
- 未登录提示：「未登录，点击去登录 ›」
- 空列表：「还没有预约 / 去看看今天有哪些医生出诊 ›」
- 支付成功：「支付成功，就诊当天请提前 15 分钟到院签到」

---

## 9. 十屏 blueprint

> 每屏结构：**目标 → 信息层级 → 布局 → 组件 → 四态 → 字段出处 → Stitch prompt**。
> 字段出处指向 `../docs/api-contract.md`（A1–A7 公开组、B1–B3 患者组），**不得出现契约里没有的字段**（评分、距离、号源总数等一律不做）。

### 9.1 首页

- **目标**：让患者 3 秒内知道「在哪家医院、能约什么、下一步点哪」。
- **信息层级**：品牌区（标题 + 副标题 + 登录态）→ 院区快捷入口 → 常用科室 → 底部 tab。
- **布局**：品牌区 240rpx 高、渐变、圆角 0（通栏）；内容区 32rpx 边距；院区卡 3 张纵向堆叠，每张 116rpx 高；科室入口 4 列 `wd-grid`。
- **组件**：品牌区（自写）、`view.card`、`wd-grid`、`wd-cell`、`wd-skeleton`。
- **四态**：加载（骨架 ×3）/ 正常（3 院区）/ 空（「暂无可预约院区」+ 重试）/ 错误（错误文案 + 重试按钮）。
- **字段**：`campusId / name / address`（A1）。
- **Stitch prompt**：

```text
Mobile mini-program home screen for a hospital appointment app, 750px design width.
Top: a 240px-tall brand block with a subtle 135° gradient from #1F7A8C to #2A9D8F,
containing a 56rpx bold white title "预约挂号", a 26rpx white 90%-opacity subtitle
"选择院区开始预约 · 演示数据全部虚构", and a small underlined white link "未登录，点击去登录 ›".
Below: 32rpx side padding, a 36rpx semi-bold heading "选择院区", then three stacked white cards
(border-radius 24rpx, padding 28rpx, shadow 0 2rpx 8rpx rgba(31,45,61,.04)), each showing a
32rpx #1F2D3D campus name and a 26rpx #8A94A6 address line.
Bottom: a 4-item native tab bar with text only (首页 / 预约 / 消息 / 我的), active item #1F7A8C.
Background #F5F7FA. Fonts: PingFang SC, tabular numerals for numbers.
STRICTLY NO: purple, neon glow, large gradient outside the hero, emoji, English acronyms,
card-inside-card, 3-column equal feature cards, stock-photo collage.
```

### 9.2 选院区

- **目标**：一次选清院区，随后所有列表都带院区上下文。
- **布局**：顶部一行说明「选择就诊院区」；每个院区一张横向卡：左 120rpx 封面（`#EEF2F6` 占位）、右名称 + 地址；选中态左边 4rpx 主色竖条。
- **组件**：`view.card`、`wd-img`、`wd-tag`（选中显示「当前」）。
- **四态**：同首页（骨架 ×3）。
- **字段**：`campusId / name / address / coverUrl`（A1；`coverUrl` 为空时用浅表面占位，不拉外链图）。
- **Stitch prompt**：

```text
Mobile "choose campus" list screen, 750px width, background #F5F7FA.
Header row: 36rpx semi-bold #1F2D3D title "选择就诊院区" and 24rpx #8A94A6 hint "选定后可按院区筛选医生".
Three vertical white cards, border-radius 20rpx, 16rpx gaps: left 120rpx square image placeholder
filled #EEF2F6 with radius 16rpx; right side a 32rpx #1F2D3D campus name plus 26rpx #8A94A6 address;
the selected card shows a 4rpx-wide #1F7A8C vertical bar on its left edge and a small #1F7A8C tag "当前".
STRICTLY NO: purple, neon glow, colored shadows, emoji, English labels, card-inside-card.
```

### 9.3 选科室

- **目标**：三级科室树里快速定位（一级大科 → 二级专业组 → 三级科室）。
- **布局**：左侧 `wd-sidebar`（宽 180rpx，选中项白底 + 主色文字 + 左侧 4rpx 竖条）；右侧列表 `wd-cell`，带「医生数」右值；顶部 `wd-search` 可跳过层级直接搜。
- **组件**：`wd-sidebar`、`wd-cell`、`wd-search`、`wd-skeleton`。
- **四态**：加载（左 6 项骨架 + 右 8 行骨架）/ 空（「该院区暂未开放科室」）/ 错误 / 正常。
- **字段**：`deptId / name / children`（A2 科室树，按 `campusId` 过滤）。
- **Stitch prompt**：

```text
Mobile "choose department" screen, 750px width, background #F5F7FA, two-column split.
Left: 180rpx-wide sidebar with 6 items, 96rpx tall each, 28rpx text; the active item has a white
background, #1F7A8C text and a 4rpx #1F7A8C bar on its left.
Right: a scrollable list of department rows (96rpx tall, 28rpx #1F2D3D names, 1rpx #E6EBF2 bottom
dividers), each row right side shows a 24rpx #8A94A6 count like "12 位医生".
Top: a 72rpx-tall search field with #EEF2F6 fill and #8A94A6 placeholder "搜索科室".
STRICTLY NO: purple, neon glow, emoji, English acronyms, nested cards, excessive shadows.
```

### 9.4 医生列表

- **目标**：在院区 + 科室上下文中比较医生，决定看谁。
- **信息层级**：姓名 + 职称 → 擅长/门诊类型 → 余量状态。
- **布局**：两列 `wd-grid`（`span=12`，间隙 20rpx），卡片：左 88rpx 圆头像、右姓名 32rpx/600 + 职称 24rpx 次色 + 门诊类型 tag；底部一行余量提示。
- **组件**：`wd-grid`、`view.card`、`wd-avatar`、`wd-tag`、`wd-empty`。
- **四态**：加载（4 张骨架卡）/ 空（「该科室暂无出诊医生」+「换个科室」次按钮）/ 错误 / 正常。
- **字段**：`staffId / name / avatarUrl / title / degree / clinicType / deptName / campusName`（A3）。
- **注意**：本屏**只**出现「满诊 / 无号」标签（红线 6），不出现「有排班 / 无排班」（那是排班页的语汇）。
- **Stitch prompt**：

```text
Mobile doctor list screen, 750px width, background #F5F7FA, two-column card grid with 20rpx gaps.
Each card: white, radius 24rpx, 28rpx padding; top row has an 88rpx circular avatar (placeholder
#EEF2F6) and to its right a 32rpx 600-weight #1F2D3D name with a 24rpx #8A94A6 title underneath;
a small #1F7A8C tag for clinic type (e.g. 专家门诊); bottom line shows availability in 24rpx text
using semantic colors — #8A94A6 for 无号, #D98E04 for 满诊.
Sticky top bar: back arrow + 32rpx department name + 24rpx campus name.
STRICTLY NO: star ratings, distance labels, purple, neon glow, emoji, nested cards, English text.
```

### 9.5 医生主页

- **目标**：确认「这个医生值不值得约」并进入排班。
- **布局**：头部资料卡（头像 120rpx、姓名 40rpx/700、职称 + 门诊类型、院区/科室）；中部「擅长」段落 28rpx/1.6；底部固定操作条「查看排班」（主按钮）。
- **组件**：`view.card`、`wd-avatar`、`wd-tag`、`wd-cell`、固定底栏。
- **四态**：加载（骨架）/ 正常 / 错误 / 医生不存在（整页空态 + 返回）。
- **字段**：`staffId / name / avatarUrl / title / degree / clinicType / deptName / campusName`（A4）。
- **注意**：**不出现**「评分 / 患者评价 / 从医年限 / 挂号量」——契约里没有这些字段。
- **Stitch prompt**：

```text
Mobile doctor profile screen, 750px width, background #F5F7FA.
Header white card: 120rpx circular avatar on the left, right side 40rpx 700-weight #1F2D3D name,
26rpx #5A667E title and #1F7A8C clinic-type tag, and a 24rpx #8A94A6 line "东院区 · 心血管内科".
Second white card titled 擅长 with a 28rpx #1F2D3D paragraph, line-height 1.6.
Bottom fixed action bar 112rpx tall, white surface with a soft top shadow, containing one full-width
#1F7A8C primary button "查看排班".
STRICTLY NO: star ratings, review counts, years-of-experience badges, purple, neon glow, emoji, English.
```

### 9.6 排班选时（两页一组：6A 排班页 / 6B 选时间点）

**6A 排班页**

- **目标**：先看「哪天有号、上午还是下午」，再决定点进去。
- **布局**：顶部日期栏（横向 7 天，每格 120rpx，选中主色底白字，有号时格下方一个小圆点）；下方午别分段「上午 · 余 6 / 下午 · 余 2」；再下方医生卡列表（按医生看）或排班行（按排班看），行右侧显示余量。
- **组件**：横向 `scroll-view`、`wd-segmented`、`view.card`、`wd-tag`、`wd-skeleton`。
- **四态**：加载 / 空（「当日暂无排班」，并提示切换日期）/ 错误 / 正常。
- **字段**：`dates[]`（A5）、`staffId / staffName / period / remain / hasSchedule`（A6）。
- **注意**：本屏**只**出现「有排班 / 无排班」（红线 6）。余量为 0 显示「无排班」而不是「满诊」。
- **Stitch prompt**：

```text
Mobile schedule screen, 750px width, background #F5F7FA.
Top: horizontal date strip of 7 cells, 120rpx wide each, 24rpx weekday label above a 30rpx day number;
selected cell uses #1F7A8C fill with white text and a 6rpx dot below indicating availability.
Below: a two-option segmented control (上午 · 余 6 / 下午 · 余 2), inactive on #EEF2F6, active on white
with #1F7A8C text.
Then a list of doctor rows inside one white card (radius 24rpx): 32rpx name on the left, 24rpx #8A94A6
department, and on the right a 24rpx label that is either #2E9E6B "有排班" or #8A94A6 "无排班".
STRICTLY NO: calendar month grid, purple, neon glow, emoji, English labels, "满诊" wording on this screen.
```

**6B 选时间点**

- **目标**：一屏选完具体时刻，价格清晰。
- **布局**：顶部「医生 + 日期 + 午别」摘要条（一行，32rpx/600）；中部 3 列时间格（每格 200rpx 宽 × 88rpx 高，圆角 12rpx）；底部固定条显示已选时刻与价格 + 主按钮「下一步」。
- **组件**：`wd-grid`、自写格子、固定底栏、`wd-button`。
- **四态**：加载（9 格骨架）/ 空（「该午别号源已约满」+「换上午/下午」）/ 错误 / 正常。
- **字段**：`slotId / timePoint / period / fee / status`（A7）。
- **注意**：`status=TAKEN` 的格子直接 `disabled` 并显示「已约」，点击不弹 toast。
- **Stitch prompt**：

```text
Mobile time-slot picker screen, 750px width, background #F5F7FA.
Top summary row: 32rpx 600-weight "李文博 · 10月24日 上午" on the left and 24rpx #8A94A6 clinic name right.
Body: a 3-column grid of time cells, each 200rpx wide and 88rpx tall, white fill, 12rpx radius,
1rpx #1F7A8C border for available (28rpx #1F2D3D text like "09:30"), and #EEF2F6 fill with #8A94A6
text for taken slots; the selected cell uses #1F7A8C fill with white text.
Bottom fixed bar 112rpx tall: left shows "09:30 · ¥25.00" (¥ at 22rpx, number 30rpx 600-weight,
tabular numerals), right a primary button "下一步".
STRICTLY NO: purple, neon glow, emoji, English, nested cards, gradient buttons.
```

### 9.7 确认预约

- **目标**：确认就诊人、医生、时间、金额，一次提交成功。
- **布局**：就诊人卡（可切换 + 「+ 新增就诊人」，新增走底部 `wd-popup` 表单）；预约信息卡（医生/科室/院区/时间/门诊类型，`wd-cell` 行式）；须知卡（退号时限、签到提前 15 分钟）；底部固定条金额 + 「确认预约」。
- **组件**：`wd-cell`、`wd-popup`、`wd-form`/`wd-form-item`、`wd-input`、固定底栏。
- **四态**：正常 / 无就诊人（空态 + 主按钮变成「先添加就诊人」）/ 提交中（按钮 loading + 全表单禁用）/ 错误（toast + 保留已填内容）。
- **字段**：就诊人 `id / name / idNoMasked / isDefault`（B6）；提交 `slotId / patientId`（B1）；回参 `registrationNo / status / fee / expireTime`（B1）。
- **交互**：提交带 `Idempotency-Key`；成功后 `redirectTo` 支付页，**不保留**确认页在栈里。
- **Stitch prompt**：

```text
Mobile booking confirmation screen, 750px width, background #F5F7FA.
Card 1 "就诊人": white card, 24rpx radius, a row with 32rpx name "林晚晴", 26rpx #8A94A6 masked ID
"3701**********1234", a small #1F7A8C tag "默认", and a right chevron; below a 26rpx #1F7A8C text button
"+ 新增就诊人".
Card 2 "预约信息": four label/value rows (医生 / 科室 / 院区 / 就诊时间), 28rpx text, right values in
#5A667E, 1rpx #E6EBF2 dividers between rows.
Card 3 "就诊须知": 26rpx #8A94A6 paragraph, line-height 1.6, two short lines about refund deadline and
arriving 15 minutes early.
Bottom fixed bar 112rpx: left "合计 ¥25.00", right full-half-width primary button "确认预约".
STRICTLY NO: purple, neon glow, emoji, English, form fields floating labels, nested cards.
```

### 9.8 支付

- **目标**：把「付多少钱、付给谁、付完会怎样」说清，并且在 60 秒内给出确定结果。
- **布局**：金额区（居中，`¥` 44rpx + 数字 72rpx/700，等宽数字）→ 倒计时一行（`wd-count-down`，15 分钟，弱文字）→ 支付方式（`wd-cell`，当前仅「模拟支付」一项，右侧 `wd-tag` 标注「演示」）→ 主按钮「立即支付」+ 次按钮「取消本次预约」（危险色文字，二次确认）。
- **组件**：`wd-count-down`、`wd-cell`、`wd-tag`、`wd-button`、`wd-dialog`。
- **四态**：待支付 / 支付中（按钮 loading + 禁止返回）/ 已支付（自写成功块：绿色对勾 + 「查看预约」主按钮）/ 已关闭（说明 + 「重新预约」）。
- **字段**：`paymentNo / amount / expireTime`（C1 创建 / B1 回参）、轮询 `GET /appt/patient/payment/{paymentNo}`（C2）。
- **交互**：进入即查一次 → 每 2s 轮询 → 60s 停止并给两个出口；关闭支付页不取消预约（超时由后端关单）。
- **Stitch prompt**：

```text
Mobile payment screen, 750px width, background #F5F7FA.
Centered amount block: small 44rpx "¥" plus 72rpx 700-weight #1F2D3D "25.00" with tabular numerals,
under it a 24rpx #8A94A6 countdown line "剩余支付时间 14:32".
A white card with one cell row: left 28rpx "支付方式", right a 24rpx tag "演示 · 模拟支付" and a chevron.
Bottom fixed area: full-width #1F7A8C button "立即支付", below it a 26rpx #D14343 text button
"取消本次预约".
STRICTLY NO: purple, neon glow, emoji, English, QR code, card brand logos, gradient buttons.
```

### 9.9 我的预约

- **目标**：一屏看清所有预约的状态与下一步动作（去支付 / 去签到 / 退号 / 再看一次）。
- **布局**：顶部状态筛选（`wd-tabs`：全部 / 待支付 / 已预约 / 已完成）；列表卡：左侧状态色竖条 4rpx、右上状态标签；主信息「医生 · 科室」「院区 · 日期 时间」；底部一行按状态给主次按钮。
- **组件**：`wd-tabs`、`view.card`、`wd-tag`、`wd-button`、`wd-empty`、`wd-loadmore`。
- **四态**：加载（3 张骨架卡）/ 空（空态 + 「去看医生」）/ 错误 / 正常；分页用 `wd-loadmore` 触底加载。
- **字段**：`registrationNo / patientName / staffName / deptName / campusName / visitDate / period / timePoint / status / fee`（B2）。
- **状态 → 动作**：`WAIT_PAY`→「去支付 / 取消」；`BOOKED`→「查看就诊码 / 退号」（过退号时限则仅「查看就诊码」）；`SIGNED`/`COMPLETED`→「再次预约」；`CLOSED`/`CANCELED_*`/`NOSHOW`→「再次预约」。
- **Stitch prompt**：

```text
Mobile "my appointments" list screen, 750px width, background #F5F7FA.
Top: a 4-item horizontal tab strip (全部 / 待支付 / 已预约 / 已完成), active tab in #1F7A8C with a 4rpx
underline, inactive in #8A94A6.
Three white cards (24rpx radius, 28rpx padding, 20rpx gaps): each has a 4rpx state-colored bar on the
left, a 32rpx 600-weight "李文博 · 心血管内科" title, a 26rpx #8A94A6 line "东院区 · 10月24日 09:30",
a small state tag on the top right (待支付 #D98E04 / 已预约 #3B82C4 / 已签到 #2E9E6B), and a bottom row
with one or two small buttons aligned right (primary "去支付", plain "取消").
STRICTLY NO: purple, neon glow, emoji, English, star ratings, nested cards, more than two buttons per card.
```

### 9.10 预约详情（含就诊码）

- **目标**：到院那天一屏出示就诊码；平时看清状态与退号入口。
- **布局**：状态头（大字状态 + 一句话说明，背景用状态色 12% 底）→ 就诊码卡（居中二维码 360rpx、`registrationNo` 24rpx 等宽、提示「就诊当天出示」）→ 信息卡（医生/科室/院区/时间/就诊人/金额）→ 退号入口（文字按钮，危险色；过时限置灰并说明原因）。
- **组件**：`wd-qr-code`（内容 = `registrationNo`）、`wd-cell`、`wd-button`、`wd-dialog`。
- **四态**：正常（有 `visitCode`）/ 无就诊码（状态不属于 BOOKED/SIGNED/COMPLETED 时隐藏二维码，改显示「本次就诊已结束」）/ 加载 / 错误。
- **字段**：`registrationNo / status / staffName / deptName / campusName / visitDate / period / timePoint / patientName / fee / visitCode`（B3）。
- **注意**：`visitCode` 仅在有效态返回（契约 §4.3），页面不得用 `registrationNo` 代替就诊码渲染——两者语义不同。
- **Stitch prompt**：

```text
Mobile appointment detail screen with check-in code, 750px width, background #F5F7FA.
Top status banner: full-width block with 12%-opacity #3B82C4 background, contains a 40rpx 600-weight
"已预约" and a 26rpx #5A667E line "就诊当天请提前 15 分钟到院签到".
Code card: white card, centered 360rpx QR code, below it 24rpx #1F2D3D mono-looking text of the booking
number and a 24rpx #8A94A6 hint "就诊当天向分诊台出示".
Info card: five label/value rows (医生 / 科室 / 院区 / 就诊时间 / 就诊人), 28rpx, right values #5A667E.
Bottom: a 26rpx #D14343 text button "退号", with a 24rpx #8A94A6 note "就诊前一日 23:00 前可退".
STRICTLY NO: purple, neon glow, emoji, English, barcode duplication, nested cards, gradient buttons.
```

---

## 10. 禁止项清单（10 条，硬约束）

1. **不用紫色**、不用霓虹/外发光阴影、不用纯黑 `#000000`。
2. **渐变只允许首页品牌区一处**；其它页面、按钮、卡片一律平色。
3. **不出现英文代号与项目代号**（含 `QueueDepth`、`appt`、状态线值），界面只中文。
4. **不用 emoji**（含「🙂」「✅」这类装饰）。
5. **卡片不套卡片**；列表分层用 1rpx 分隔线，不靠阴影堆叠（阴影只有「卡片」「浮层」两档）。
6. **不臆造字段**：评分、距离、号源总数、患者评价一律不做——契约里没有。
7. **金额与雪花 id 按字符串展示**，禁止 `Number()` / `parseInt()` / 千分位重排。
8. **两套状态标签严禁混用**：排班页只有「有排班 / 无排班」，医生主页只有「满诊 / 无号」。
9. **证件号只上脱敏串**（`idNoMasked`），任何页面不出现完整证件号。
10. **不做装饰性循环动效**；不做「滚动探索」「向下滑动」这类提示文案。

---

## 11. 落地自检（写完一屏后逐条过）

- [ ] 页面里出现的每个 `#hex` 都能在第 2 章找到出处
- [ ] 字号只用第 3 章阶梯内的值；间距只用第 4 章阶梯内的值
- [ ] 每个数据区块都有加载 / 空 / 错误三态
- [ ] 每个展示字段都能追到 A1–A7 / B1–B3 的某个属性
- [ ] 金额与时间使用等宽数字，两位小数未省略
- [ ] 状态标签取第 2.3 章的颜色，未自定义
- [ ] 本屏只有一个主按钮，且在拇指可达区
- [ ] 与 `app/src/App.vue` 的 `--wot-color-theme` 一致（`#1F7A8C`）
