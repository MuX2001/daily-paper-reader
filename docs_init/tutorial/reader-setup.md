# 新版阅读工作台：配置与验收

适用于 `dev` 的 React 阅读器。旧资料仍可从 `legacy.html` 访问；现有 `docs/` 路径不移动。开发过程与逐次测试记录见 [开发计划](../../DEVELOPMENT_PLAN.md)。

## 先在本地查看

使用 Node 24，以及项目现有 Python 环境；不要向系统 Python 安装依赖。在仓库根目录执行：

```bash
python -m pip install -r requirements-reader.txt
npm ci
python src/reader_catalog.py --output "$HOME/workspace/runs/daily-paper-reader/reader-data"
npm run dev
```

终端会给出本地地址。没有历史推荐数据时显示空列表，不会生成演示论文。`npm run build` 将生产站点写到 `DPR_WEB_OUTPUT_DIR`，默认 `~/workspace/runs/daily-paper-reader/web-build`。CI 的 `reader-site` artifact 是可用静态构建，不等于已部署的 Pages 站点。

构建后运行 `npm run preview`，地址固定为 `http://127.0.0.1:5174/`，保持此终端运行。端口已占用时会明确报错，不悄悄换端口。远程服务器需在VS Code中转发5174端口。页面无法连接时先检查预览进程和转发是否仍在运行；换浏览器不会自动共享之前的项目连接偏好或登录会话。

## 连接个人阅读状态

建议单独使用一个自己管理的 Supabase 项目保存阅读状态，不把公共论文召回库视为个人账户库。已有项目也可以使用，但应先确认拥有管理权限。

1. 在该项目 SQL Editor 执行仓库的 `sql/create_paper_states_schema.sql`。脚本包含所有者 RLS、更新 revision 和私人笔记字段，不需重建论文库。
2. 在 Supabase Auth 启用 GitHub provider。创建 GitHub OAuth App 时，回调地址填写 Supabase 提供的 `https://<project-ref>.supabase.co/auth/v1/callback`，将 Client ID/Secret 填入 Supabase provider 设置。[官方 GitHub 登录步骤](https://supabase.com/docs/guides/auth/social-sign-in/auth-github)
3. Supabase Auth URL Configuration 的 Site URL 设置为阅读器站点根地址，并在允许的 Redirect URLs 中加入实际地址。Pages 项目站需包含仓库子路径和结尾 `/`，例如 `https://OWNER.github.io/REPO/`；本地调试另加实际本地地址。[回跳地址规则](https://supabase.com/docs/guides/auth/redirect-urls)
4. 打开阅读器设置，填写项目 URL 和 publishable/anon 公钥，保存后选择“使用 GitHub 登录”。这里不能填 service-role key。
5. 两个独立浏览器会话登录同一账户，分别测试收藏、笔记保存和刷新；另一个账户不应看到这些记录。并发编辑笔记应显示冲突，不能悄悄覆盖。

本项目已经完成隔离本地 Supabase 的真实 Auth/REST/多会话测试；托管项目与 GitHub OAuth 仍需按上述流程验收。没有连接时可公开浏览、下载笔记，不能将未保存状态显示为已同步；当前不提供后台离线写入队列。

### 登录返回400：provider is not enabled

`Unsupported provider: provider is not enabled` 表示当前Supabase未启用GitHub provider，与是否部署到GitHub Pages无关。现在点击GitHub登录会先检查provider设置，并在页面内提示，不直接跳到错误页。可以按上文配置GitHub OAuth，或使用设置中的“邮箱登录/注册邮箱账户”；托管项目若开启邮箱确认，须按邮件完成验证。

本机已启动Supabase测试库时，可以为外部构建目录准备公开连接文件：

```bash
python scripts/prepare_reader_local.py \
  --connection /path/to/private/local-supabase-status.json \
  --build "$HOME/workspace/runs/daily-paper-reader/web-build"
```

输入是本地Supabase CLI的status JSON，保持私有；脚本仅输出回环API地址和anon公钥，不输出service key。只有本地页面才显示折叠的“本地测试（不与线上同步）”入口。展开并点击“连接本地测试库”后，用邮箱注册自己的测试账户，即可测试收藏、归档和笔记；本地测试数据与托管项目相互独立。重新构建后需重新执行此命令。若浏览器通过SSH转发访问远端机器，还需转发Supabase API端口54321。不要将本地连接文件上传至生产站点。

`reader/tests/browser-auth-live.mjs` 使用 `DPR_LOCAL_SUPABASE_CONNECTION` 和 `DPR_TEST_URL` 显式运行真实本地UI注册/登录/笔记保存测试，测试完成只删除自身创建的临时账户，不访问托管项目。

## 每日分诊与模型配置

仓库 Settings → Secrets and variables → Actions 中设置：

| 参数 | 保存位置 | 用途 |
| --- | --- | --- |
| `TRIAGE_API_KEY` | Secret | 一级轻量模型密钥；未设置回退 `DEEPSEEK_API_KEY` |
| `TRIAGE_MODEL`、`TRIAGE_BASE_URL` | Variables | 一级模型/端点；回退原有 `DEEPSEEK_MODEL`、`DEEPSEEK_BASE_URL` Secrets |
| `DEEP_READ_API_KEY`、`DEEP_READ_MODEL`、`DEEP_READ_BASE_URL` | Secrets | 二级强模型，必须显式配置，不回退轻量模型 |
| `DPR_FEEDBACK_USER_ID` | Secret | 当前 Supabase Auth 用户 UUID；留空关闭反馈评分 |
| `DPR_STATE_SUPABASE_URL`、`DPR_STATE_SERVICE_KEY` | Secrets | 读取该用户的近期反馈，只供服务器使用 |
| `DPR_NOTIFY_FEISHU_WEBHOOK` | Secret，可选 | 发布核验成功后发送日报通知 |

本地对应变量见 `.env.example`；复制到私有 `.env` 不会自动配置 GitHub Actions。原有检索、embedding、reranker 配置继续使用。

日常 workflow 默认 `content_mode=triage`，每天最多新增50张分诊卡片，不批量生成精读。未完成内容继续保持不完整状态。`triage-run-report` artifact 包含调用/复用/延后数量、耗时和已返回 token；无用量不代表零费用，金额以供应商记录为准。反馈只作为相关方向的有界偏好示例，不作为永久排除条件；尚无人工标注集证明它提高了推荐质量。

## 单篇精读和 Obsidian

设置 → 按需精读任务提供 DeepSeek Pro/Flash、硅基流动、OpenAI 和自定义服务的配置参考。选择预设不会自动保存 GitHub Secrets：点击仓库 Secrets 链接，逐项 New repository secret，保存 `DEEP_READ_MODEL`、`DEEP_READ_BASE_URL` 和服务密钥 `DEEP_READ_API_KEY`。先测 DeepSeek 官方可使用 `deepseek-v4-pro`、`https://api.deepseek.com`；以服务账号实际可用模型为准。其他服务需填写支持 Chat Completions/JSON 的模型 ID。预设不是已联调保证。

设置中可展开查看后端共用的精读提示词，文件为 `src/deep_read_prompt.txt`；模板要求具体计算步骤、公式解释、实验数值与出处、消融分析和复现风险。更改模板后对应笔记缓存失效；长文仍通过证据提取后合成，最终内容需人工复核。

不使用 API 时，在论文预览的“交给聊天客户端精读”中打开 PDF、复制提示词，或下载 Markdown 精读材料。材料含当前笔记、元数据和提示词，不包含 PDF 全文，不冒充已完成的精读。请在聊天客户端另附对应版本 PDF。

官方接口参考：https://api-docs.deepseek.com/api/create-chat-completion/ 、https://api-docs.siliconflow.cn/docs/userguide/quickstart 。

在阅读器设置中填写自己的仓库、任务分支、具有该仓库 Actions 读写权限的 Token。订阅保存还需要 Contents 写权限。Token 只存在当前页面内存，刷新后重新输入。前端通过已有的 daily-paper-reader.yml 入口传入 pipeline_action=deep-read，在指定任务分支调用独立精读流水线，不执行每日推荐。仓库默认分支须已有 daily-paper-reader.yml；不需要把新精读文件先合入默认分支。恢复任务按仓库最近300次手动运行查找精确版本。

选择带明确版本的 arXiv 论文，按 `d` 或点击精读按钮，确认费用后提交。长文最多12段提取加1次合成；输入覆盖率不等于所有事实都被提取。失败时检查对应运行的状态/日志；成功时下载 Markdown。整页刷新后可用“恢复这篇的精读任务”查找最近300次运行，不会重新派发。

只需快速剪藏时，在设置中填写实际 Obsidian vault 名称和“Obsidian 收件箱目录”（默认Inbox，可填Papers/Inbox等多级目录，留空放在vault根目录），点击“发送到 Obsidian”；过长笔记自动改为 Markdown 下载。URI 打开请求不证明桌面应用已经保存，需实际打开 vault 检查。[Obsidian URI 说明](https://help.obsidian.md/Extending+Obsidian/Obsidian+URI)

需要自动同步时，先准备独立私有笔记仓库，再配置：

| 参数 | Actions 位置 |
| --- | --- |
| `OBSIDIAN_NOTES_REPO`（`owner/repo`） | Variable |
| `OBSIDIAN_NOTES_BRANCH`（默认 `main`） | Variable |
| `OBSIDIAN_NOTES_FOLDER`（默认 `Inbox`） | Variable |
| `OBSIDIAN_NOTES_TOKEN`（目标仓库 Contents 读写） | Secret |

精读成功后才写入此仓库；未配置则仅提供下载。脚本保留用户编辑区，人工改动生成区会停止覆盖。将私有仓库同步到自己的 Obsidian vault，通过自己的 Git 客户端或 Obsidian Git 拉取；必须在桌面确认文件内容与版本，不能把 Actions 推送成功称为 vault 已同步。不要把私人笔记仓库配置成公开论文站仓库。

## 历史记录与生产切换

旧浏览器记录迁移入口在设置中：预览 → 下载原始备份 → 登录后导入。只读取当前设备/同一站点的旧记录；冲突或无法确认版本的记录会跳过，云端已有状态不覆盖。旧云端 `user_read_state` 可从自己管理的数据库导出 JSON 数组（每行含 `github_username`、`paper_id`、`status`），通过“导入旧记录 JSON 文件”选择文件，再明确选择自己的旧用户名并预览；也支持旧版 ID→状态 JSON 备份。重复冲突会跳过，不跨用户名合并，文件最多5MB。此入口只导入用户主动选择的文件，不自动读取旧云表，也不删除原库。

`reader-publish.yml` 只接受已经配置好的“默认分支根目录”Pages 托管，不会替你改变 Pages 设置。当前 `dev` 开发与通过 CI 不表示生产切换已完成。发布前需审核分支差异，剔除私人运行数据，再按仓库合并规则处理；不能为了让发布脚本通过而擅自把 `dev` 设为默认分支。

## 当前验收范围

| 要求 | 已有证据 | 尚未证明 |
| --- | --- | --- |
| JSON 分诊、严格版本、缓存与缩略图 | Python 测试；官方论文全文/图片实取；缓存失败恢复测试 | 真实每日付费分诊质量与账单 |
| React 工作台、键盘、管理、专题、聊天、导出 | 26项前端测试、10组生产子路径浏览器场景 | 真实 Zotero Connector 与 Obsidian 桌面联动 |
| 云状态、私人笔记、并发冲突 | 真实本地 Supabase Auth/REST、三个隔离浏览器会话 | 托管 OAuth、真实公网多设备 |
| 按需精读、分段续跑、私有库同步 | 46项Python链路测试中的对应测试；模拟派发与恢复 | 强模型实际 Actions、笔记质量、私有库到 vault 同步 |
| 反馈与通知 | 用户/方向隔离、数量限制、通知去重测试 | 人工相关性对照、实际推送触达 |
| Pages 发布 | 构建、子路径验证、发布条件测试 | 默认分支生产切换与线上提交核验 |

这些未验证项不能由单元测试替代。此指南不包含任何真实密钥，也不表示上述外部账户已经配置完成。

## 离线检查反馈效果

`src/reader_feedback_eval.py` 只比较已保存的排序，不调用模型。把输入和报告放在自己的运行目录，不提交个人候选和标注。需要三个JSON文件：

- `snapshot.json`：`candidates` 为固定候选数组，每项保留精确 `paper_key`、实际标题/摘要和 `tags`；`label_source` 必须为 `human`；`labels` 是人工标注的 `{paper_key: 1或0}`（1相关、0不相关）；`feedback_context_ids` 列出评分提示中使用的反馈示例ID。评估标签与这些示例不得重叠，未标注论文不填labels。
- `baseline.json`：`candidate_sha256` 为下述指纹；`ranking` 按不开启反馈时的排序列出全部候选ID，每个恰好一次。
- `feedback.json`：同一指纹，`ranking` 为开启反馈后的全部候选排序。不要重新召回导致候选变化。两个文件可各自附加 `usage: {tokens, cost, currency}`；未知字段省略，不能用0冒充未知。

```bash
python src/reader_feedback_eval.py --snapshot /path/to/run/snapshot.json --fingerprint
python src/reader_feedback_eval.py \
  --snapshot /path/to/run/snapshot.json \
  --baseline /path/to/run/baseline.json \
  --feedback /path/to/run/feedback.json \
  --top-k 20 --output /path/to/run/comparison.json
```

报告给出标注覆盖率、Top K中已标注正/负例数量、遗漏的已标注正例、新增/丢失的正例ID、标签覆盖和用量差异。仅在币种相同时比较金额；未知费用保持null。候选对象内容变化会改变指纹。标签数只表示标签覆盖，不等于语义多样性；少量不完整标注也不能支持统计显著性结论。工具中的human标识是输入者声明，不能替代真实人工评审。
