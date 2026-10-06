# BoBoZan Online

React + TypeScript 多人联机卡牌游戏，使用 Firebase Anonymous Authentication 和 Firestore 同步房间。支持中英文、机器人和新手教程。

## 本地运行

建议使用 Node.js 22 LTS。

```sh
npm ci
cp .env.example .env.local
# 在 .env.local 填入 Firebase Web App 的配置
npm run dev
```

在 Firebase 项目中启用匿名登录、创建 Firestore 数据库，并将实际站点域名加入 Authentication 的授权域名（GitHub Pages 为 `runbochai.github.io`）。`VITE_*` 配置会进入浏览器构建产物；它们不是服务端密钥，数据库访问必须由 Firestore Security Rules 控制。不要填入服务账号私钥。

```sh
npm run lint -- --max-warnings 0
npm test
npm run build
npm run preview
```

CI 自动执行以上检查（preview 除外）。单元测试验证状态转换、回合校验、结算幂等和输入不可变性，不替代 Firestore 多客户端集成测试。

## 代码结构

- `src/App.tsx`：界面、教程与交互。
- `src/logic/combat.ts`：卡牌与战斗结算。
- `src/logic/room.ts`：房间状态转换和出牌校验。
- `src/services/rooms.ts`：Firestore 事务及防碰撞建房。
- `src/assets.ts`：兼容子路径部署的资源 URL。
- `src/data/`：技能、翻译和游戏常量。
- `assets/audio-source/`：保留的 WAV 原始音频，不复制到生产站点。
- `public/music/bgm.mp3`：游戏实际使用的压缩音乐，进入游戏时按需加载。

## 新手练习与远征

主页的「新手练习 · 学猜招」提供 12 课、16 个可重试练习：攒、防、攻击强弱、费用与技能等级、打平、基础牌反制、破防与射程、猜习惯、翻盘，以及升级和死亡重开。练习调用正式战斗结算，每题明确使用独立预设状态，不影响真实对局。已完成课程保存在本机；规则手册可在练习和远征中随时打开。

远征不再强制走前三关教学，敌人回合开始就确定出牌，界面只展示习惯与上一张牌。战中、领奖、商城和结局可复盘刚才双方的牌、血量、能量及遗物触发原因。远征幸存者保留自己的血量、能量和层数；联机原有淘汰重置规则保持独立。护甲和保命先于死亡判定，限次秘技在当前战斗内按剩余次数使用。

升级解锁对应等级的招式，不提高旧牌强度。普通远征升级最高 Lv.5，死亡后重开清空这一轮的金币、装备、遗物和技能；课程进度与历史最佳保留。当前只保存课程和历史最佳，不保存进行中的远征。

## 联机行为

所有房间修改都在 Firestore 事务中基于最新快照计算，避免多人同时出牌、发表情或入房时互相覆盖。事务会校验回合、玩家身份和当前状态；结算对同一回合只生效一次。房主主动退出时移交给下一位真人玩家，最后一位真人退出则关闭房间。仍在房间的玩家可用相同匿名身份和房间码重新进入正在进行的对局。

房间数据结构保持原来的 `rooms/bobozan-v1_<code>` 和 `players` 数组，无须数据迁移。上线新版本时应让所有玩家刷新并重开房间；旧客户端仍然可能整数组覆盖新客户端的事务更新。

## GitHub Pages

`vite.config.ts` 的 `base` 为 `/Bobozan1/`。构建时提供上述 Firebase 环境变量，然后把 `dist/` 发布到 Pages。若更换仓库名称、使用自定义域名或部署到根路径，请修改 `base` 后重新构建。应用中的头像、标题和音乐通过 `import.meta.env.BASE_URL` 生成 URL。

### 发布修正后的版本

合并 PR 只更新源码，`Check application` 只验证代码；它不会更新现有 Pages 网站。

1. 在 GitHub 仓库 Settings → Secrets and variables → Actions 的 Variables 或 Secrets 中填入 Firebase Web App 配置。支持 `.env.example` 中的旧名称，也支持 `VITE_FIREBASE_API_KEY`、`VITE_FIREBASE_PROJECT_ID` 等名称。
2. `VITE_FIREBASE_API_KEY` 和 `VITE_FIREBASE_PROJECT_ID` 必填。未指定 `authDomain` 时会使用 `<projectId>.firebaseapp.com`；自定义认证域名应显式配置。建议填入 Firebase 提供的完整 Web App 配置。
3. 在 Settings → Pages 将 Source 设为 GitHub Actions。
4. 在 Actions 选择 **Deploy GitHub Pages**，点击 **Run workflow**，选择 `main`。
5. 等部署成功后刷新网站。工作流会从 `dist/` 发布完整的 HTML、JS、图片和 MP3。

部署会先执行 `npm run build:deploy`，缺少必要配置或仍然使用示例占位符时直接失败，不会替换正在运行的网站。配置变更后必须重新构建和部署；只修改 GitHub 变量或本地 `.env` 不会改变已发布的 JS。

若本地手动部署，请运行 `npm run build:deploy` 后发布 `dist/`。`npm run build` 仍允许无 Firebase 配置的本地教程预览。

### 错误排查

- 联机服务尚未配置：检查构建时是否注入真实 Firebase 项目的 Web 配置。缺少配置时仍可进入教程，但联机按钮不可用。
- 匿名登录未启用：在 Firebase Authentication 中启用 Anonymous 提供方。
- 域名未授权：将网站域名加入 Authentication 的 Authorized domains。
- 数据库拒绝访问：检查 Firestore Security Rules，而不是替换 API key；不要简单将所有读写设为公开。
- 网络失败：检查网络并刷新重试。
- 浏览器拦截背景音乐：点击页面或“点击播放背景音乐”；媒体加载失败时可点击重试。

## 上线前需要确认的限制

- 本次没有变更线上 Firestore Security Rules，仓库也未包含已部署规则。事务和浏览器出牌校验不能防止恶意客户端，必须单独审查数据库权限。
- 出牌仍位于所有房间成员可读取的文档里；要隐藏未揭晓的牌，需要私有出牌文档及可信服务端结算。
- 自动接管意外断网或直接关闭浏览器的房主尚未实现。当前支持主动退出移交和原身份重连；意外断线后需房主重连。后续应增加服务端心跳/租约和出牌超时策略。
- 测试不连接生产 Firebase。发布前用两个浏览器验证同时出牌、发出表情、满员入房、房主主动退出和重连，并确认部署规则允许相应事务读取/写入。
