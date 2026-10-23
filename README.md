# 号源 QueueDepth · 移动端（患者端 + 分诊台）

> **技术演示项目**：所有院区、科室、医生、就诊人、挂号与支付数据**全部虚构**，支付走 Mock 渠道，
> **不提供任何真实医疗服务**，不接入真实医院系统。

一套 uni-app（Vue3 + Vite + TS）代码，按登录账号的角色切换两种形态：

| 形态 | 角色 | 底栏 |
|---|---|---|
| 患者端 | 无 `triage` 角色的登录账号（或未登录浏览） | `pages.json` 原生 tabBar 四项：首页 / 预约 / 消息 / 我的 |
| 分诊台 | 角色含 `triage` | 普通页面 + 自绘底栏（原生 tabBar 无法按角色增删项） |

**当前进度**：本仓处于 **E5 建仓与工程骨架**阶段——登录、双角色切换、匿名院区列表可用；
患者 15 个业务页与分诊 4 个业务页分别在 **S10 / S11** 实现（见 `../docs/ROADMAP.md`）。

**设计与组件规范见 [`DESIGN.md`](./DESIGN.md)**：色板 / 字号 / 间距 / 圆角 token、挂号 8 状态色映射、
12 类组件规格、S10 十屏 blueprint 与可直接粘贴的 Stitch prompt。**写页面前先对照它，颜色只用其中的 token。**

## 三步启动

```bash
# 0) 前置：后端已在 8082 运行（见 ../backend/README 或 ../docs/README.md）
pnpm install          # 1) 安装依赖（Node ≥ 20.19，pnpm 12）
pnpm dev:h5           # 2) 起 H5：http://localhost:8084
```

演示账号（由后端 seed 提供）：

| 账号 | 密码 | 落点 |
|---|---|---|
| `admin` | `admin123` | 患者端 |
| `appt_triage` | `admin123` | 分诊台 |

小程序端（可选）：

```bash
# 源码与开发者工具在同一系统：产物写在本仓 dist/dev/mp-weixin
pnpm dev:mp-weixin

# WSL 开发：产物直接写 Windows 盘，开发者工具导入 D:\programming\project\appt-app
pnpm dev:mp-wsl
```

- WSL 里的源码在 `/home/...`，Windows 版开发者工具打不开；**不要**用 `\\wsl.localhost\...` UNC 路径（文件监听失效、编译变慢）。用 `dev:mp-wsl` 把产物输出到 Windows 盘即可正常热编译；
- `dev:mp-wsl` 同时覆盖 `VITE_APP_BASE_API=http://localhost:8082`——小程序端不走 vite 代理，`.env.development` 里的 `/dev-api` 前缀无效。换输出目录或后端地址：`APPT_MP_OUT_DIR=... APPT_MP_BASE_API=... pnpm dev:mp-wsl`；
- 开发者工具需勾选 **不校验合法域名、web-view、TLS**（本地接口是 `http://127.0.0.1:8082`）；
- 仓里 `manifest.json` 的 `mp-weixin.appid` 是 `touristappid` 占位；真机调试请在本地改成自己的 AppID，**不要提交**。

## 小程序端真机调试（扫码签到）

小程序端只做一件事：**分诊台扫码签到**（E1）。H5 没有 `uni.scanCode`，走手动补签（E2），两端口径一致。

### 1. 换 AppID（否则「预览 / 真机调试」点了没反应）

`touristappid` 是游客占位：微信开发者工具在这种模式下**不支持预览与真机调试**（按钮无响应、不报错）。

- 取自己的 AppID：mp.weixin.qq.com → 开发管理 → 开发设置 → AppID（个人主体免费）
- 改 **`src/manifest.json`** 的 `mp-weixin.appid`（**不要只改开发者工具里的 AppID** —— `project.config.json` 由 manifest 生成，下次构建会被覆盖回去）
- 改完必须**重新跑** `pnpm dev:mp-wsl`（`VITE_APP_BASE_API` 是构建期注入，热更不生效）

### 2. 后端地址不能用 localhost

`localhost` 在手机上指向手机自己。用电脑的局域网 IP：

```bash
APPT_MP_BASE_API=http://192.168.x.x:8082 pnpm dev:mp-wsl
```

后端已监听 `0.0.0.0:8082`，手机与电脑同一 WiFi 即可；开发者工具「详情 → 本地设置」保持勾选**不校验合法域名、web-view、TLS**（真机调试同样需要）。要在公网真机验证，就得给后端挂 HTTPS 域名并配到小程序后台的 request 合法域名。

> `dev:mp-wsl` 的默认 baseApi 已写成本机网卡 + **转发端口** `http://192.168.0.108:18082`（不是后端原始的 8082，原因见 2.1）；换机器/换网段时用 `APPT_MP_BASE_API=... pnpm dev:mp-wsl` 覆盖，别改脚本。

### 2.1 WSL2 下让手机访问后端（必做）

后端跑在 WSL 里，`192.168.0.108` 是 **Windows 网卡**，默认不会把连接转发进 WSL —— 表现为手机浏览器打不开、小程序报网络错误。二选一开通：

> **端口别用 8082**：Windows 上 `QQ.exe` 会占用 8082（本地互联服务），`netsh portproxy` 因端口被占**静默绑定失败**，访问 `192.168.0.108:8082` 实际打到 QQ 的 HTTP 服务，返回**空 body 的 404**（前端表现为 `request.ts` 的「响应为空」，且后端日志里查不到请求）。因此本文统一用 **18082** 做转发口。

**A) 端口代理（管理员 PowerShell，推荐）**

```powershell
# 先查 WSL 的 IPv4（WSL 里执行：hostname -I | awk '{print $1}'）
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=18082 connectaddress=<WSL_IP> connectport=8082
netsh advfirewall firewall add rule name="appt-18082" dir=in action=allow protocol=TCP localport=18082
netsh interface portproxy show v4tov4      # 必须看到 0.0.0.0:18082 → <WSL_IP>:8082
# 撤销：netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=18082
```

> `connectaddress` **必须填 WSL 的 IPv4**（如 `172.31.124.129`），不能填 `127.0.0.1`：Windows 的 `localhost` 走 IPv6 回环 `[::1]:8082`（WSL 的 localhost 转发落在这里），IPv4 的 `127.0.0.1:8082` 上并没有监听。WSL 重启后 IP 会变，需重加。
> `netsh add` 在端口被占或条目已存在时**不报错**，所以每次都要 `show v4tov4` 复核。

**B) 镜像网络（Win11 22H2+，Win10 不支持）**

`%USERPROFILE%\.wslconfig`：

```ini
[wsl2]
networkingMode=mirrored
```

然后 `wsl --shutdown` 重开。WSL 直接共享 Windows 网络栈，`192.168.0.108:8082` 就是 WSL 的 8082，不需要 portproxy。

**验证顺序（务必先用手机浏览器，别先开小程序）**：

```text
手机浏览器打开 http://192.168.0.108:18082/appt/public/campus/list
→ 看到 {"code":200,"data":[{"campusId":...}]} 才算通
→ 打不开：portproxy 未生效 / 防火墙 / 手机不在同一网段
→ 返回空 body 的 404：端口被 Windows 本地程序占用（QQ 常见），换一个 listenport
```

### 3. 真机调试与扫码链路

1. 工具工具栏 **真机调试** → 手机扫码 → 页面右上角胶囊「…」→ 打开调试（出现 vConsole）
2. 手机登录 `appt_triage / admin123` → 底部「签到」
3. 患者端（H5 或另一台手机）打开一条 `BOOKED` 预约 → 详情页出示二维码（内容 = `visitCode`）
4. 分诊端点「扫一扫」→ 走 E1 `POST /appt/triage/sign`（`signType=SCAN`）；手动输入框走 E2（`signType=MANUAL`）

### 4. 真机白屏怎么查

工具里正常、真机空白（只有导航栏与 tabBar）＝**页面 JS 在真机抛错**，不是接口问题（模板里的静态文本也没渲染出来就是证据）。

- 先看 vConsole 的 **Console** 第一条红错；
- **`Xxx is not defined`（Web API 缺失）是最常见的一类**：小程序没有 `TextEncoder/TextDecoder`、`btoa/atob`、`window`、`document`。2026-10-23 真机就踩过一次——`utils/crypto.ts` 顶层 `new TextEncoder()`，而它被 `request.ts` 顶层 import、`request` 又被所有页面顶层 import → 页面模块求值阶段抛错，整页白屏。现改为纯 JS UTF-8 编解码；
  > 排查口诀：**报错栈里出现 `crypto.js / request.js` 且页面全白**，先查 `utils/` 下有没有 Web API 全局对象。
- 若是语法/编译类，确认 `manifest.json` 的 `mp-weixin.setting` 已含 `es6 / enhance / postcss`（2026-10-23 已补齐，缺少时产物里的 `??`、`?.` 不会被降级）；
- 若是 `window / navigator is not defined` 且栈里是 `encrypt.js`，那是 `jsencrypt`（只在登录页用到）——改成 `await import('jsencrypt')` 动态加载，或按 `AGENTS.md` 换 `wxmp-rsa`。

## 端口与代理

| 服务 | 端口 | 说明 |
|---|---|---|
| 后端 | 8082 | RuoYi-Vue-Plus + `appt` 模块 |
| 管理后台 | 8083 | plus-ui |
| **本仓 H5** | **8084** | 请求统一走 `/dev-api` → vite 代理 → `127.0.0.1:8082` |

## 目录结构

```text
src/
├─ api/appt/        # auth / public / types（S10 起补 patient、triage）
├─ components/      # TriageTabbar（分诊自绘底栏）、EmptyState
├─ pages/           # index / login / mine + registration、notice 占位 + triage/sign 占位
├─ resolvers/       # Wot UI 2.x 组件解析器
├─ router/          # ROUTES 常量 + uni.addInterceptor 守卫
├─ store/           # pinia：登录态与角色
├─ types/           # env / api（ApiResult、BizError）
└─ utils/           # request（body.code 语义）、crypto（AES-ECB）、encrypt（RSA）
```

## 质量门禁

```bash
pnpm type-check   # vue-tsc --noEmit，0 错
pnpm lint         # oxlint src，0 错（与 admin 同款）
pnpm build:h5     # 生产构建
```

CI（`.github/workflows/ci.yml`）串行执行 `install --frozen-lockfile → type-check → lint → build:h5`。

## 三个必踩坑（已写进 AGENTS.md）

1. **Wot UI 组件不解析/样式丢失**：`Components()` 必须排在 `uni()` 之前，且 `.npmrc` 要有 `public-hoist-pattern[]=@vue*`；
2. **登录返回 403**：`/auth/login` 带 `@ApiEncrypt`，**缺 `encrypt-key` 头就是 403**（不是 400/401）；
3. **登录后所有 `/appt/**` 403**：后端 `sys_client` 的 app 行 `access_path` 需放行 `/appt/**`，
   且该值**在登录时写进 token**，改完必须重新登录（见 `../backend/script/sql/appt_e5_client_access.sql`）。
