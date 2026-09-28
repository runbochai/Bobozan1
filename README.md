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

在 Firebase 项目中启用匿名登录、创建 Firestore 数据库，并将实际站点域名加入 Authentication 的授权域名。`VITE_*` 配置会进入浏览器构建产物；它们不是服务端密钥，数据库访问必须由 Firestore Security Rules 控制。不要填入服务账号私钥。

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

## 联机行为

所有房间修改都在 Firestore 事务中基于最新快照计算，避免多人同时出牌、发表情或入房时互相覆盖。事务会校验回合、玩家身份和当前状态；结算对同一回合只生效一次。房主主动退出时移交给下一位真人玩家，最后一位真人退出则关闭房间。仍在房间的玩家可用相同匿名身份和房间码重新进入正在进行的对局。

房间数据结构保持原来的 `rooms/bobozan-v1_<code>` 和 `players` 数组，无须数据迁移。上线新版本时应让所有玩家刷新并重开房间；旧客户端仍然可能整数组覆盖新客户端的事务更新。

## GitHub Pages

`vite.config.ts` 的 `base` 为 `/Bobozan1/`。构建时提供上述 Firebase 环境变量，然后把 `dist/` 发布到 Pages。若更换仓库名称、使用自定义域名或部署到根路径，请修改 `base` 后重新构建。应用中的头像、标题和音乐通过 `import.meta.env.BASE_URL` 生成 URL。

此仓库的 CI 只验证代码，不会自动发布站点。

## 上线前需要确认的限制

- 本次没有变更线上 Firestore Security Rules，仓库也未包含已部署规则。事务和浏览器出牌校验不能防止恶意客户端，必须单独审查数据库权限。
- 出牌仍位于所有房间成员可读取的文档里；要隐藏未揭晓的牌，需要私有出牌文档及可信服务端结算。
- 自动接管意外断网或直接关闭浏览器的房主尚未实现。当前支持主动退出移交和原身份重连；意外断线后需房主重连。后续应增加服务端心跳/租约和出牌超时策略。
- 测试不连接生产 Firebase。发布前用两个浏览器验证同时出牌、发出表情、满员入房、房主主动退出和重连，并确认部署规则允许相应事务读取/写入。
