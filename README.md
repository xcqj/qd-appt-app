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
pnpm dev:mp-weixin    # 产物 dist/dev/mp-weixin，用微信开发者工具打开
```

- 开发者工具需勾选 **不校验合法域名、web-view、TLS**（本地接口是 `http://127.0.0.1:8082`）；
- 仓里 `manifest.json` 的 `mp-weixin.appid` 是 `touristappid` 占位；真机调试请在本地改成自己的 AppID，**不要提交**。

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
