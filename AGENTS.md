# AGENTS.md · 移动端仓（qd-appt-app）

> 跨仓协作协议见 `../docs/AGENTS.md`；本文件只写**本仓**红线与实现细则。
> 红线与 `../docs/redlines.md` 逐字一致；改红线必须同步。

## 1. 本仓红线（摘自 redlines.md，公共条）

6. **两套状态标签严禁混用**：科室排班页只有「有排班/无排班」；医生主页只有「满诊/无号」。【公共】
10. **服务端强制校验权限与限购，不信任前端任何判断**；四层 API 边界（public / patient / triage / admin）不混用。【公共】
15. **PII**：身份证/就诊卡号演示数据可明文，代码预留加密接口位，日志禁止打印证件号（M11）。【公共】
16. **明确不做**（被问及时按「为什么不上」回答，不主动实现）：候补队列、改约、真实渠道签约、医保、问诊/开方/药品、检查治疗预约、报告/账单/地址/评价、多医院、ES、微服务、MQ（PRD §1.4 / §13.2）。【公共】
17. **命名纪律（PRD D10）**：简历用中文名「号源」；仓库 / README 用英文代号 QueueDepth；**演示 UI 仅中文 + 虚构医院名，不得出现 QueueDepth 或任何英文代号**；代码层缩写统一 `appt`（表前缀 `appt_` / 包 `org.dromara.appt` / API `/appt/**` / Redis `appt:*`）。【公共】

本仓追加两条：

- **金额与 19 位雪花 id 一律字符串**：禁止 `Number()` / `parseInt()`；后端 BigDecimal 与 Long 都已序列化成字符串。
- **分诊请求不传 `campusId`**：数据范围由服务端按账号解析（红线 10），前端不得自造。

## 2. 端口与代理

| 项 | 值 |
|---|---|
| H5 dev | `http://localhost:8084`（`vite.config.ts` 写死，避开后端 8082 / admin 8083） |
| 请求前缀 | `.env.development` 的 `VITE_APP_BASE_API=/dev-api` → 代理到 `127.0.0.1:8082` |
| 小程序 | `BASE_API` 需置空并配合法域名；本地调试勾「不校验合法域名」 |

## 3. 质量门槛（顺序不可换）

```bash
pnpm type-check   # vue-tsc --noEmit
pnpm lint         # oxlint src
pnpm build:h5     # 生产构建
```

`pnpm build` 不做类型检查，不能替代前两步。CI 同样串行跑这三条。

## 4. 实现约定

| 主题 | 约定 |
|---|---|
| 请求 | 只用 `src/utils/request.ts`；后端 **HTTP 恒 200，业务码在 `body.code`**；401 并发只跳一次登录 |
| 加密 | 仅 `/auth/login`：`encrypt-key: RSA(base64(aesKey))` + body `base64(AES(json))`；**私钥绝不入库** |
| **设计** | **写页面前先对照 `DESIGN.md`**：颜色/字号/间距/圆角只用其中 token，状态色取 §2.3 表，不新造色值；两套状态标签（有排班·无排班 / 满诊·无号）严禁混用 |
| 幂等 | 挂号请求必须带 `Idempotency-Key`（`newIdempotencyKey()`，小程序无 `randomUUID` 时降级） |
| 路由 | 手写 `pages.json`；`uni.switchTab` **不支持 query**，tab 间上下文一律进 store |
| tabBar | 患者用原生四项；分诊用 `components/TriageTabbar.vue` 自绘 + `uni.reLaunch` 互跳；**不要**改 `tabBar.custom` |
| UI 库 | Wot UI **2.x**（`@wot-ui/ui`），组件按源码发布走 resolver 自动导入；只查 v2 文档，勿照抄 v1 示例 |
| 样式 | SCSS + `--wot-color-*` 变量一套；不引 UnoCSS |
| 版本 | `@dcloudio/*` 整组同版本、`vite` 跟随模板；**禁止单升** |

## 5. 坑位清单（真出过错）

1. `Components()` 必须在 `uni()` **之前**，否则 H5 下 `wd-*` 样式不注入；
2. pnpm 必须 `.npmrc` 配 `public-hoist-pattern[]=@vue*`，否则组件解析失败；
3. pnpm 12 默认忽略依赖构建脚本 → `pnpm-workspace.yaml` 的 `allowBuilds` 必须放行 `esbuild` / `vue-demi` / `core-js` / `@parcel/watcher`，否则 `pnpm install` 直接失败；
4. `tsconfig` 缺 `"types": ["@wot-ui/ui/global"]` → 编辑器里 `wd-*` 全红；
5. `@ApiEncrypt` 接口缺 `encrypt-key` 返回 **403**（不是参数错误），别按 400 排查；
6. 后端 `sys_client` 的 `access_path` 在**登录时写进 token**，改完必须重新登录；
7. 小程序无 `crypto.randomUUID` / `btoa`，加密工具已用纯 JS 实现，勿改回 `window` API；
8. 页面栈上限 10：挂号链路用 `redirectTo` 收敛（S10 落地时遵守）。

## 6. 更新纪律

- 每完成一块（I1–I5、S10、S11）单独提交，信息 `feat(e5): I? …` / `feat(s10): …`；
- 改端口、代理、门槛、加密开关，必须同步本文件与 `README.md`；
- 后端配合改动（如 `sys_client` 放行）在 **backend 仓**单独提交，不在本仓混提。
