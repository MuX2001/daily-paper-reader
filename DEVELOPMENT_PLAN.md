# Daily Paper Reader 分阶段改造计划

> 当前配置步骤与逐项验收边界见 [新版使用指南](docs_init/tutorial/reader-setup.md)。下文执行记录按时间追加，较早的“待实现”描述可能已被后续记录替代；外部服务尚未验收的项目仍保持未完成。

日期：2026-11-24；开发分支：dev。本文是开发规格与验收清单，不代表功能已上线。

## 评审结论

保留 Python 检索/排序、Supabase 论文库、Actions 和 Pages，逐步迁移数据契约、用户状态和阅读界面。Docsify 放大了插件耦合问题，但不能把所有 bug 归因于框架；换 React 同样需要稳定身份、明确状态所有权和浏览器测试。强模型也不自动保证笔记质量，必须核验全文、证据与版本。

仓库已有 Step 5 推荐 JSON、user_read_state 云同步、全文获取、图表提取、专题研究预算及检查点。优先复用，不重复搭建。当前 read-state-sync.js 用 anon bearer 和 github_username 过滤，GitHub 用户名不是 Supabase 身份证明；新表必须由真实 Auth JWT 和 RLS 隔离。

每日 20–50 篇仅作为未来可配置分诊展示预算，不修改现有日常/10天/30天的选择规则。一级默认仅使用标题摘要；有缓存引言才附加，不为全部候选下载全文。缩略图在入围后生成，不放在全库维护热路径。第一页预览必须标记 first_page，不能冒充 Figure 1。GitHub 链接必须来自原文证据，不由模型猜测。

收藏只是状态变更，不自动触发付费；精读和“精读并导出”显式触发。默认先保留旧生成模式，新 triage 模式经验证后再切换。旧 docs 原位保留，先用归档入口链接旧路由，不搬文件或批量改写用户笔记。

## 架构及数据契约

- Python 产生不可变论文事实和分诊结果；浏览器消费版本化 JSON。
- Supabase 保存用户状态、反馈和个人笔记。精读任务状态以 GitHub Actions 运行记录为持久真源，前端可按精确版本恢复；不再重复维护第二份任务状态表。Actions 不覆盖用户状态。
- 新前端采用 React + TypeScript + Vite，已按用户后续授权替换根入口；使用普通 CSS。GitHub Pages 仓库子路径通过生产构建浏览器测试验证，旧 hash 阅读链接转入 legacy.html。
- 作者代码放 src/、app/ 或后续 reader/；数据输出放站点 docs/data/（运行态），实验放 workspace/runs，缓存放 workspace/.cache。不提交个性化运行产物上游。
- schema_version=1，run_id 使用既有日期/区间 token；papers 为标准记录列表。区间不能伪装成单日。
- paper_key = source + ':' + 原始带版本 ID；canonical_id 单独记录作品身份。未提供版本则 version=null，不猜 v1。会议保留 source/year/original_id，不能把 arXiv 日期当会议公布日。
- 记录包含 title、title_zh、abstract、authors、published、url、pdf_url、score、reason、tldr、breakdown(problem/method/results)、code_url、thumbnail、tags、content_status。
- 缺失值用 null，绝不拿 reason 冒充三点速览。thumbnail 包含 kind/url/evidence；指标需保留 baseline、数值、单位与证据，原文未报告则明确缺失。
- 输出按字段白名单过滤，不传播密钥或任意内部对象。按精确版本去重，同次运行重复推荐合并标签、保留最高分；重跑累计合并，不以空结果清空旧快照。
- 单文件原子替换；跨 Actions 并发发布仍需 concurrency + 拉取最新后重新合并，不能把原子 rename 当作跨机器锁。

## 阶段 0：基线与契约（本次先实施）

1. 记录评审、阶段依赖、验收及回退方式。
2. 增加无网络、无模型调用的 Step 5 → JSON 导出器；独立 CLI 可回放历史推荐文件。
3. main.py 增加显式开关，在 Step 5 后导出，旧 Step 6 继续执行。默认关闭，避免未验收时改变生产流程。
4. 验证版本身份、多来源、重复标签、缺字段、非法数据、空运行保护、同日重跑及原子写入。

完成标准：针对性测试通过，真实历史输入在 scratch 中导出成功；不改真实 docs/archive。JSON 允许内容 incomplete，不能声称一级分诊已完成。

## 阶段 1：一级分诊及安全状态基础

1. 基于现有 llm.py 增加独立 triage schema/prompt；复用评分证据，生成中文标题/一句亮点/三点拆解。严格验证 ID 回映、字段类型、数值范围和证据来源。
2. 缓存键含精确版本、标题摘要/引言 hash、模型、端点、prompt/schema 版本。成功项恢复，失败有限重试；缺失项目明确 failed，不写 done。记录 tokens/费用/延迟。
3. 新模式 legacy/dual/triage：legacy 不变；dual 验证两种输出；triage 取消日常自动精读，保留轻量卡片。专题固定名单和续跑预算不变。
4. 复用 paper_figures.py/全文缓存，在最终入围列表提取 HTML Figure 1，失败使用 PDF 第一页；限制响应大小、下载时间、图片尺寸与 WebP 大小，缓存失败原因。缩略图失败不阻断文本推荐。
5. Supabase Auth（优先 GitHub OAuth）和 paper_states：主键(user_id,paper_key)，read_at、starred、dismissed_at、feedback(-1/0/1)、updated_at、revision；用户私有笔记另表。read/star/dismiss/feedback 独立。
6. RLS 对 SELECT/INSERT/UPDATE/DELETE 限制 auth.uid()=user_id；anonymous 不读写私人状态。浏览器仅 publishable/anon key + 用户 JWT，service role 只在服务器 secret。
7. PATCH 仅发送变化字段；revision 乐观锁，冲突重新读取并提示；离线队列仅作重试副本，失败不能显示已同步。分页拉取，处理过期登录和重试。
8. 状态迁移提供 dry-run、JSON 备份、精确 ID/route 映射、冲突报告和幂等导入；旧 1/2/3/4 意义从代码核实，不猜映射。不删除旧记录，不覆盖云端较新修改。

验收：真实 PostgreSQL 两用户/匿名隔离、更新冲突及分页测试；失败恢复不重复付费；非 torch 环境运行；图片是真实来源。未配置测试库时明确记为待验证，不能仅靠 SQL 字符串测试宣布完成。

## 阶段 2：新分诊台 MVP

- 左栏今日/待精读/专题包/归档，中栏卡片，右侧摘要与详情；窄屏改列表与抽屉。今日为空显示空状态并允许选历史日期，不能伪称旧结果是今日。
- j/k 切换，s 收藏，x 归档，o 开原文；输入框、聊天编辑、IME composition 和组合键时不响应。列表变更后稳定选择，不丢焦点；提供快捷键帮助和可点击替代操作。
- + / - 反馈可撤销；批量历史未读归档先展示日期范围/数量，分页处理，支持撤销；收藏默认不被批量归档。
- 登录、错误/加载/空状态、会话失效、跨设备同步、移动端均包含在 MVP。
- 先接稳定 JSON，再接 Auth 状态；演示 fixture 必须明确标注，生产不回退成假数据。
- 保留旧阅读页、全文聊天、Zotero 和订阅/任务管理入口。未完成替代的功能链接旧页，不能仅做三栏外观就移除 Docsify。

验收：构建与类型检查；浏览器通过真实本地 HTTP 资源验证桌面/手机、键盘、滚动及抽屉；两登录会话验证同步。Pages 子路径及自定义域名检查；上线前确认实际部署提交。

## 阶段 3：按需精读与 Obsidian

1. 独立 deep-read workflow，输入精确论文版本 ID、request_id、export 选项；验证来源与输入，禁止任意 URL/路径/命令注入。工作流需存在于默认分支才能正常手动发现，dev 阶段先本地测试并规划发布。
2. request 状态 queued/running/succeeded/failed；幂等键(user,version,model,prompt,fulltext_hash)，并发锁阻止双击重复收费；预估费用确认后触发，提供失败原因与有限重试。
3. 全文优先同版 arXiv HTML，必要时安全解析源码或 PDF；验证正文/公式/参考文献和版本，错误页/截断不进入精读模型。内容过长分章节提取证据再合成，记录覆盖率，不能默默裁剪后称完整精读。
4. 精读模板：问题与假设、方法/公式及符号、baseline/指标/消融、局限、复现风险、可核验出处。论文内容视作数据；不执行其中指令。不编造链接/指标/引文。
5. Frontmatter：paper_key/arxiv_id/version/title/authors/tags/venue/status/pdf/code/date/model/source_hash；使用 YAML 序列化器，不拼接未转义文本。文件名取稳定 ID，模型内容不能决定路径。
6. 默认下载 Markdown/短 Obsidian URI 卡片；完整长笔记使用文件。URI 只表示已请求打开 Obsidian，不能声称同步成功。
7. 自动同步优先独立私有笔记仓库；公有论文站仓库不默认存私人笔记。笔记仓库、目录、模型端点由用户配置；凭据置 Actions Secrets。同步只写受控生成区，用户编辑区不覆盖。前端轮询请求状态与产物 hash。
8. Obsidian Git 自动 pull 由本地插件配置并实测；Actions 无法直接证明用户本地 vault 已同步。

验收：用一篇已确认版本跑真实 Actions；重复请求命中缓存；正文覆盖和公式/数据抽查；下载、Obsidian 打开、自动拉取分别报告结果。

## 阶段 4：反馈、通知与迁移收尾

- 反馈限定用户、专题、最近时间窗；负反馈不等同永久主题黑名单。先作为有上限的 few-shot/context，记录影响，提供关闭开关。
- 离线对照：固定候选集，比较收藏命中、误杀、多样性和费用；不把模型自评分当金标准。
- 通知通过可选 adapter（先选一个渠道），secret 留 CI。按 run_id 去重，发布成功后发数量和真实链接；通知失败不回滚产物。不配置默认不发。
- 用户后续明确取消一周观察等待，直接重构 dev 前端；新根入口已不加载 Docsify。旧归档仍保留独立 Docsify 壳，生产切换与真实云端联调须单独验收。
- 旧链接和 docs 文件长期保留；/legacy/ 如需入口仅作兼容壳，不移动原文件。回退以部署切回旧入口实现，数据库新增表保留。

## 待配置项与执行记录

后续云端联调需要：测试 Supabase 项目与 OAuth 回调、强模型端点/预算、笔记仓库或 vault 目录、通知渠道。通过 secret 配置，不在聊天或计划保存密钥。没有这些信息仍可完成本地实现与 fixture 测试，但不能报告云端验收完成。

- [x] dev 分支建立；初步代码评审与计划。
- [x] 阶段 0 导出器及测试：10 项 unittest 通过；真实历史推荐导出 26 篇，精确版本键无重复；输出仅在 workspace/scratch/dpr-triage-validation。main.py --export-triage 显式启用，新旧输出并行，尚未接通生产 workflow。
- [ ] 阶段 1 分诊/图像/Auth/RLS/迁移。
- [ ] 阶段 2 SPA 与浏览器验收。
- [ ] 阶段 3 精读/Obsidian 真实联调。
- [ ] 阶段 4 反馈/通知与生产切换验收（用户已取消观察等待）。

参考：Supabase RLS https://supabase.com/docs/guides/database/postgres/row-level-security ；变更日志 https://supabase.com/changelog.md ；Obsidian URI https://help.obsidian.md/Extending+Obsidian/Obsidian+URI 。


## dev 执行更新（用户要求直接重构，覆盖前述观察限制）

用户已明确 dev 分支直接替换前端，不等待一周稳定期。根 index.html 现为 React 入口，旧入口保存为同目录 legacy.html，旧 #/ 路由自动转到 legacy.html 保持原链接可读。无需额外同意继续实现。

已实现：
- React/TypeScript/Vite 收件箱，真实 catalog、历史日期、搜索、三栏/移动抽屉、j/k/s/x/o、反馈及独立状态操作、Markdown/Obsidian 卡片导出。
- Supabase OAuth 配置、公钥检查、分页状态读取、revision 条件写入。未登录操作明确引导登录；状态不写 localStorage。公钥及 vault 名称作为设备偏好保存。
- paper_states SQL：RLS、身份不可修改、服务器 revision/updated_at；独立 PostgreSQL 17 容器实测跨用户/匿名/旧 revision/独立状态通过。尚未部署到真实 Supabase。
- 轻量 triage 模式及 dual 模式，摘要证据校验、内容缓存、每轮最多50次新增卡片生成；实际推荐数量不截断，超预算卡片保持 incomplete。缓存重建不清空已完成内容。
- reader-check.yml 构建静态站 artifact；不擅改现有 Pages 托管配置。npm run build 输出到 DPR_WEB_OUTPUT_DIR（默认 workspace/runs/daily-paper-reader/web-build）。

浏览器验证已覆盖真实26篇历史数据、键盘切换、搜索、输入保护、登录引导、移动抽屉和横向溢出。截图在 workspace/runs/daily-paper-reader/browser。生产构建与类型检查通过。

仍需推进：全文聊天与原生专题/管理迁移、精读任务及轮询、缩略图、历史状态迁移、反馈进入评分、通知与实际部署。当前“专题包”明确链接旧专题工作台，不能算新前端功能全部完成。真实 OAuth/云端两设备验证与真实模型调用尚未执行。


### 按需精读与视觉锚点执行更新

- 新增 reader_fulltext.py：固定 arXiv 版本、HTML 优先/PDF 兜底、拒绝重定向/超大文件/缺参考文献的短文本；缓存带内容 hash。
- deep_read.py + deep-read.yml：完整正文送入独立强模型、五部分带可核验引文的笔记、内容/版本/模型缓存与并发锁；超上下文预算明确停止，无静默截断。模型需 DEEP_READ_* 配置。
- React 加入 d 快捷键、单篇费用确认、GitHub dispatch 和请求 ID 对应的运行状态轮询，Token 仅驻留内存；成功后跳转对应运行下载笔记 artifact。
- Obsidian 自动同步可配置私有仓库：OBSIDIAN_NOTES_REPO/BRANCH/FOLDER variables 与 OBSIDIAN_NOTES_TOKEN secret。保留用户笔记区，生成区被人工编辑则冲突停止。未配置时仅生成下载文件，不冒称本地 vault 已同步。
- reader_thumbnail.py：仅入围论文，真实 Figure 1 优先、首页明确标记 fallback，限制下载/图片大小、压缩 WebP。
- 真实 1706.03762v7 已验证 HTML 全文 39,638 字符及官方 Figure 1，WebP 14,602 字节；未调用付费模型。测试图片位于 runs/daily-paper-reader/verified-paper，不提交 Git。

后续需完善：跨日报收藏聚合、原生专题和订阅管理、全文聊天、历史状态导入、反馈评分闭环、通知与 Pages 发布。真实 Actions 运行及云端 OAuth/笔记仓库同步仍待配置联调，不能以单元测试替代。


### 原生阅读闭环执行更新

- 待精读/归档跨全部日报与专题聚合，精确版本去重；收件箱支持全部日期，按高分排序并合并标签。
- reader_catalog 离线关联同版本原阅读 route 与已验证 .txt 全文；已发布 feed 不依赖 archive 仍然存在。原生专题读取 task-state 固定名单、guide.json，显示导读/阅读路线，并复制或下载完整名单。
- React 论文聊天完整发送同版 .txt 内容（无静默截断）；缺全文只发送标题摘要并明确标识。SSE 分片、异常和截断检测、停止生成；模型 key 仅页面内存。当前对话为会话态，切换论文清空。
- 旧阅读记录迁移：本地预览、原始 JSON 备份、精确 ID/route 关联、冲突报告、批量幂等导入，保留 good/blue/orange/bad。云端已有状态不覆盖，旧标记不自动变成推荐反馈。
- 反馈接入 Step 4 提示：配置 DPR_FEEDBACK_USER_ID + DPR_STATE_SUPABASE_URL/SERVICE_KEY 后读取该用户近30天最多200条，按当前方向限定最多5正/5负样例。作为软偏好，显式需求和证据优先。没有配置就不读取任何用户反馈。
- 每日 workflow 增加 triage/dual/legacy 选项，默认 triage；TRIAGE_MODEL/API_KEY/BASE_URL 支持独立配置，卡片缓存失败后仍保存。main 结束时离线重建 reader catalog。

本轮验证：33项 Python 测试及2项子测试通过（含既有评分需求/重试回归），11项前端单测通过。浏览器真实全文聊天通过模拟模型接口核验了请求正文；专题浏览器测试使用明确的 fixture 验证导读、完整名单下载和论文卡片。PostgreSQL 两用户/匿名/RLS/版本冲突验证再次通过。

尚待：通知、原生订阅和任务管理完整替代、发布方式及真实云端联调、旧前端退役审计。不能将已实现的 UI/模拟传输测试视作真实云端部署成功。


### 管理与发布执行更新

- 新原生研究管理：读取/编辑/保存 intent_profiles，YAML 保留无关节点与注释，使用 SHA 检测并发修改；keyword/query 原义不变。日常、会议、专题选择相互独立，专题复用既有 HEAD 精确计数预览；三个研究模式卡片等宽等高。
- 任务提交展示实际参数与费用说明，支持日常分诊、会议检索、90/365/starter 和继续内容，显示所选分支最近运行。管理模块单独按需加载，收件箱无需首屏下载 YAML 编辑依赖。
- 可选飞书日报通知：只在 Pages 当前提交验证成功后运行，按运行内容去重；送达结果未知时不自动重发。未配置 DPR_NOTIFY_FEISHU_WEBHOOK 时无网络发送。
- reader/index.html 是源码入口；Vite 在开发/构建时读取此入口，因此发布生成的根 index.html 不会成为下一轮源码。
- reader-publish.yml 只支持已经配置好的默认分支根目录 Pages，拒绝 dev 发布/切换配置；将编译产物放 app/reader-assets，保留历史资源 hash，提交后请求并核验当前 Pages 提交。每日成功任务可调用此可复用发布 workflow。开发分支仍由 reader-check 构建 artifact。
- 打包保留已有 legacy.html、app/docs 与加密 secret.private 和公开 config.yaml；不复制 .env 或明文新 API Key。

本轮验证：36项 Python 测试与2项子测试、13项新前端测试、全部现有 JS 测试通过。原生管理浏览器测试使用 mock GitHub，覆盖读取、编辑、SHA 保存、确认后派发与移动端模式卡片。生产构建通过；发布脚本测试确认不会修改 Pages 设置，拒绝非默认分支并保留源码及旧入口。

仍未证明：真实 Supabase OAuth/跨设备、真实强模型精读工作流、私有 Obsidian 仓库同步、实际 Pages 发布/通知。后续继续功能与安全审计、真实 CI 验证；不将 mock 或本地构建标记为线上完成。

### 真实 CI 验证

代码已提交并推送 dev：81fc3ad；首次 CI 在执行前发现 job 级 env 不能引用 runner.temp，已由 135053c 修复为步骤内设置输出目录。

GitHub Actions 运行 https://github.com/MuX2001/daily-paper-reader/actions/runs/45236775434 对应 135053c0574857e63a2b7ab940a630951919e180，build 成功，Python 3.11 依赖安装、Node 24 npm ci、前后端测试、构建及 reader-site artifact 上传全部通过。构建产物约48 MB，包含旧阅读资料。此证据仅证明干净 CI 构建通过，不等于生产 Pages 已部署。

Supabase 扩展已找到但尚未安装/连接；需要连接用户项目后才能做真实 Auth/RLS 联调。当前本地 PostgreSQL 验证仍不能替代此项。main 未合并，生产 Pages 配置未改变，未执行付费精读或发送通知。

### 静态产物与任务状态审计

修复任务参数变化后仍可提交旧确认的问题；专题首次继承日常选择后不再反复覆盖选择。切换仓库/分支重新挂载管理面板，旧异步读取不能更新新目标面板。精读任务记录创建时仓库与分支，轮询固定原目标并禁止重叠请求。构建拒绝把仓库或其祖先作为清空输出目录；开发服务支持外部 WebP 缩略图。

13项前端单元测试通过，包括切换仓库后仍查询原任务的回归验证。生产构建由独立 HTTP 静态服务提供，浏览器验证真实26篇论文、键盘/登录门控与移动端；管理页 mock GitHub 验证参数变更撤销确认、新预算提交、SHA 保存与移动端等尺寸卡片。云端联调限制保持不变。

### 新阅读台引用出口

新增选中论文 citation_* 元数据与 BibTeX 下载。作者分别输出，保留原始英文标题与确切 arXiv 版本；会议只使用 publication_date 与声明精度，禁止 published 投稿日期冒充公布日期。BibTeX 转义特殊字符，作者保留完整姓名以免猜测姓氏，缺失字段不生成。离开论文视图清除元数据，切换论文通知 Zotero Connector 更新。

参考官方元数据契约：https://www.zotero.org/support/dev/exposing_metadata 。15项前端测试及生产构建通过；独立静态服务浏览器验证切篇后元数据替换、无重复、真实 .bib 下载与管理页清理。尚未安装 Zotero Connector 执行真实入库，不宣称已完成扩展端验收。

### 已发布历史与全文关联

新目录可从日期目录的 _daily_state.json + papers.meta.json 恢复缺失论文，不再要求 archive/recommend 缓存存在。恢复只增加缺失 ID，不覆盖新流水线数据、不调用模型、不改历史页或阅读状态。来源与完整版本 ID 共同确定全文关联，避免不同来源同名 ID 误挂全文；专题固定名单复用同样关联逻辑。无法确认来源/标题的历史记录不猜测导入。独立会议目录的完整投影仍待补齐。

11项目录/导出回归测试与生产构建通过，覆盖缓存删除后的恢复、重复运行、跨来源 ID 冲突和专题同版本全文复用。

### 会议历史目录接入

新增 reader_conferences 离线投影：从已发布 conference Markdown 读取明确 ID/来源，旧页可由明确标注的 OpenReview forum 链接恢复 ID；不从截断文件名猜身份。新生成会议页保存 original_id、original_url、authors_list，旧页不改写。缺少身份的旧页留在归档，catalog 列出未解析 route，前端显示数量。会议 feed 纳入目录、全库收藏/归档和日期选择器；无日报只有会议数据也能初始化。日期只保留正式公布字段与其精度。此步骤不重新抓取、评分或调用模型。

17项 Python、15项前端测试及生产构建通过；浏览器使用明确会议 fixture 验证静态产物中的会议单独加载、年精度引用、未解析提示及仅 arXiv 支持精读的限制。当前仓库没有真实会议页面，不能把 fixture 验证称为真实历史数据迁移验收。新增后端测试已加入 reader-check CI。

### 云端账户请求隔离

分页状态读取固定启动时客户端；项目切换后不发下一页。批量归档逐项检查启动时账户/项目，切换后停止未启动写入，已在途的原账户写入可能完成但不更新新账户视图。旧认证初始化不得覆盖后到的认证事件；刷新响应使用请求序号，写入前后淘汰过时读结果。切换连接清空旧会话与可见状态，迁移预览按账户重建，批量迁移遇到项目变化停止后续批次。

18项前端测试通过，含真实 Supabase SDK 配合 mock transport 的500条分页切换测试、延迟批量写入切换测试和中途版本冲突测试；TypeScript、生产构建及静态服务基础浏览器回归通过。未连接真实 Supabase，仍不代替实际 OAuth/多设备验收。实现对照 https://supabase.com/docs/reference/javascript/auth-onauthstatechange 与当前 changelog；未变更 RLS 或服务端权限。

### 精读工作流启动与失败交付

修复 Validate inputs 在安装 requirements-reader 前导入 requests 的隐式依赖；reader_identity 仅依赖标准库，并由下载器/精读入口/Actions 共用。测试直接提取工作流实际校验代码，以 python -S 执行，覆盖正常参数、未指定版本、路径输入与换行请求 ID，失败不写 GITHUB_OUTPUT。模型配置缺失时先生成 stage=configuration 的 failed status.json，再退出，便于 artifact 解释任务未启动原因，不抓取全文也不调用模型。

7项相关测试通过。reader-check 的触发路径扩展至 reader 后端、精读、依赖和测试/工作流变更，避免仅后端变更绕过 CI；新增启动验证已加入 CI。真实付费精读及私有笔记同步仍未执行。

### Obsidian 快速剪藏内容补齐

Markdown 下载与 Obsidian URI 共用完整待读卡片：YAML 作者/来源/确切版本/公布日期精度、原文与 PDF 分离字段、可用代码链接、速览、原摘要与 BibTeX。显式标记 triage，避免被误认为全文精读。URI 按编码后长度保守限制，过长下载全文卡片；不带 overwrite/append，避免覆盖或重复追加已有用户笔记。文件名转义 Windows 不允许字符并保留身份差异。

20项前端测试、生产构建通过；静态站点浏览器实际下载 Markdown 与 BibTeX，检查作者、原文链接与待读声明。URI 编码及长中文内容回退有单元测试；未启动本地 Obsidian，不能将协议构造验证当成笔记实际落库。协议对照官方说明：https://help.obsidian.md/Extending+Obsidian/Obsidian+URI 。

### 个人笔记上云与冲突保护

paper_states 新增 note_text（默认空串、最多50000字符），复用 owner RLS 与 revision 乐观并发；已有部署需重新应用 sql/create_paper_states_schema.sql。前端个人笔记保存、草稿按账户/论文隔离并跨切篇保留、离页未保存提示、云端冲突对照与明确替换选择已接入。保存完成时保留保存期间继续输入的内容。访客可以写草稿，登录前按钮先下载备份；不承诺 OAuth 页面跳转保留内存草稿。Markdown 和 Obsidian 导出包含当前草稿，反馈管道仍只读取 feedback 字段，不发送私人笔记给推荐模型。

本地 PostgreSQL17 实际执行更新后 schema 与 RLS 验证：匿名/跨用户读写拒绝、笔记旧 revision 不覆盖、收藏状态独立、50000长度上限。20项前端测试与生产构建通过；静态产物浏览器用 mock Supabase 验证切篇草稿、revision保存、其他设备编辑冲突、保留草稿下载与主动采用云端内容。真实 Supabase schema 尚未部署，实际多端同步仍待联调。

### 生产子路径浏览器 CI

新增 npm run test:reader:browser，自建临时只读 HTTP 服务，在 /reader-preview/ 下加载实际生产 JS/CSS，使用明确合成数据与各测试的外部 API mock，依次验证会议、笔记、管理、专题、聊天、精读、引用七组场景。无需真实论文数据、服务密钥或付费模型；不把模拟响应标为云端联调。子路径解析保留路径边界检查，结束后关闭服务，单组90秒超时退出。

本地七组全部通过，验证模块资源、数据路径和懒加载在 Pages 子路径下可用。reader-check 新增 Chromium 安装与此浏览器验收步骤；这轮云端运行结果需在推送后单独核对。

真实 CI 45240502125 中前后端测试/构建通过，但 ubuntu-latest 已迁移26.04，Playwright1.57拒绝安装浏览器。reader-check 已固定 ubuntu-24.04，与当前锁定浏览器版本支持矩阵一致；保留全部浏览器验收，不跳过失败步骤。

### 批量归档撤销与 CI 后续

新增当前页面内撤销最近一批归档；逐项使用归档后 revision，后续改动产生冲突时停止，避免覆盖新笔记/状态。已成功恢复项从撤销列表移除，账户或项目切换后不可操作旧批次；刷新页面后仍可在已归档逐篇恢复。浏览器模拟验证收藏不归档、撤销恢复、私人笔记保留及后续变更拒绝覆盖。

真实运行45240684601已通过Ubuntu24.04浏览器安装，会议/笔记场景通过；管理场景因断言早于React effect更新而失败。现改为等待确认区真实移除，仍验证旧确认不可提交，不用固定sleep。用户授权自行选择联调项目；当前无Supabase管理工具/环境服务凭据，仅有论文库公开配置，下一步采用隔离本地Supabase验证真实Auth/Data API，不能冒称托管项目已部署。

### 真实本地 Supabase Auth / REST 验证

按用户“自行决定”授权，采用隔离本地项目 supabase-integration（运行态位于 workspace/runs/daily-paper-reader），CLI固定3.3.0，经 --help 确认 init/start/status 参数；仅运行Postgres/Auth/Kong/PostgREST，未连接或修改任何托管项目。已在真实Supabase数据库应用 paper_states schema。

新增 scripts/check_reader_cloud.py：只允许回环项目，读取权限受限的connection JSON，在真实Auth创建两个临时账户并密码登录/refresh token，调用真实REST验证匿名与跨账户隔离、私人笔记写入、revision冲突拒绝覆盖、50000字符上限，最后删除自身创建的账户。实际执行全部通过，不使用mock transport。命令：`python scripts/check_reader_cloud.py --connection <私有本地status-json文件>`。connection文件包含本地服务密钥，不提交、不输出。

前端连接地址校验仅在本地页面允许HTTP回环项目，线上仍要求HTTPS，拒绝凭据/路径/query/hash；21项前端测试和生产构建通过。真实浏览器多会话、GitHub OAuth回调和托管部署尚未验证。GitHub CI 45241288564目前仍在浏览器运行时安装步骤，继续观察同一运行，不重复启动。

### 真实浏览器多会话同步验收

新增 `npm run test:reader:cloud`（显式启用，不加入无服务的普通测试）：通过 `DPR_LOCAL_SUPABASE_CONNECTION` 指向私有本地status JSON，`DPR_TEST_URL` 指向本地生产构建服务。入口只允许回环地址；服务密钥仅Node测试进程用于建立/清理临时账户，不注入页面。三个隔离浏览器context使用真实Auth登录取得的会话，页面Supabase请求无mock，只有论文元数据为fixture。

实际通过：账户A的两次独立登录可保存/聚焦刷新同步笔记，B会话未保存草稿遇到A的新保存时保留草稿并禁止直接覆盖；账户B的独立笔记不泄露到A；最终真实REST读取也只返回当前账户内容。测试后临时账户已删除。此证据证明本地Auth/Data API与生产前端互通，不替代托管服务、GitHub OAuth或真实公网多设备验证。

云端浏览器CI已核验成功：运行 https://github.com/MuX2001/daily-paper-reader/actions/runs/45241920217 对应提交 e8c63ce4f20139847a3eaa4204481f6f4bab1ec7。build job137928509420全部步骤success，包含Chromium安装、生产子路径七组浏览器测试及reader-site artifact上传。不能将此运行归到后续51c8816提交；后者新增的真实本地多会话测试已单独执行通过。

### 新前端反馈入口

原生反馈表单替代旧插件入口：桌面在侧栏顶部与首页/教程同行，移动端在页头，不占底部导航。类型多选按既有顺序生成 `[功能新增|体验问题] 标题`；正文只含用户输入，不附加页面/仓库等模板。保留原项目反馈目标 ziwenhahaha/daily-paper-reader；只打开GitHub预填草稿，由用户在GitHub检查提交，不读取PAT或自动创建Issue。提交前明确公开身份声明，弹窗点击外部关闭，输入时屏蔽阅读快捷键。

22项前端单元测试、生产构建及8组子路径浏览器测试通过。新浏览器用window.open拦截验证目标和标题/正文、公开确认门、桌面/手机入口、遮罩关闭与移动端无横向溢出，未实际发送任何反馈。

### 精读全文缓存恢复与版本声明核验

全文缓存增加 validation_version=2：损坏JSON、无效正文、错误hash、不同版本source_url及旧校验缓存均重新获取，不把坏检查点当永久失败。HTML检查论文级citation/canonical元数据中的明确版本，PDF检查第一页arXiv版本水印，明确不匹配时拒绝；没有声明时继续依赖官方指定版本URL及禁止跳转规则，不猜版本。PyMuPDF坏文档错误归一化成可报告的来源失败，全部来源失败不写完成检查点。

10项全文/精读/缩略图相关测试通过，含公式alttext保留、版本冲突、损坏缓存恢复/复用及失败无检查点。实际从官方arXiv获取1706.03762v7 HTML成功，提取39638字符并通过新版验证，产物仅在workspace/runs；没有调用付费模型。新版全文测试已纳入CI。

### 缩略图可见标注与会议日期

卡片缩略图显示独立可见标签 Figure 1 / PDF 首页；未知kind只称论文配图，加载失败显示预览不可用，保留文本卡片浏览。会议卡片日期复用publication_date精度规则，不再直接展示可能是投稿时间的published。新增浏览器验证实际图片naturalWidth、失败回退、两类标签可见、年份精度与手机无横向溢出；已查看移动端截图，图片为明确测试fixture，不作为真实Figure1数据证据。

生产构建及9组子路径浏览器测试通过。CI新增reader-browser-screenshots产物（7天）；截图写runner.temp外部输出目录，不混入部署站点。开发时发现测试编排器输出路径计算被Promise resolve同名变量遮蔽，已移到回调外计算并完整重跑九组通过。

### 缩略图失败退避与缓存修复

缩略图检查点记录确切paper_id、成功/失败状态与图片SHA256。失败后六小时内跳过重复获取并在feed保留真实错误/retry_after；过期自动重试，CLI --retry-failed 可显式提前重试。图片内容与hash不符、JSON损坏或身份不匹配时重新生成。成功后清理旧错误与重试时间，公开thumbnail字段不携带内部缓存字段；失败仍不影响论文文本结果。

7项缩略图/全文针对性测试通过，覆盖失败退避/到期/手动重试、成功复用、坏图片与坏元数据恢复。此处模拟网络失败以验证恢复逻辑，不声称外部服务实时可用。

### 刷新后的精读任务恢复

新增“恢复这篇的精读任务”，从当前配置仓库/分支的deep-read工作流记录按精确版本与完整run-name解析恢复request_id/run_id/status。最多查询3页/300条，未命中明确提示查询边界；不派发、不触发模型、不保存Token。恢复期间防止重复提交，配置切换后忽略旧请求结果，活动任务仍固定原仓库/分支轮询。

23项前端测试与生产构建通过。浏览器模拟GitHub验证首次提交完成后整页刷新、重新输入内存Token、恢复原任务，POST派发计数仍为1；单元测试覆盖分页、同论文其他版本/分支排除和300条上限。此处仍非真实付费Actions运行验收。

### 精读书目字段证据检查

模型返回的原标题和非空作者名必须出现在全文开头8000字符内，仅容许Unicode兼容规范化和空白折行差异；禁止猜测作者、展开缩写或翻译原标题。缺作者可返回空列表，笔记明确提示补充；错误标题/作者与错误正文证据同样阻止成功缓存和发布，保留已有完整笔记。提示改变自动隔离旧模型缓存。这是文本出现核验，不是独立书目认证或完整作者名单认证，笔记已说明限制。

14项精读/全文/Obsidian同步测试通过，覆盖虚构元数据拒绝、仅参考文献出现的姓名拒绝、折行兼容和失败保留旧笔记；没有调用付费模型。超过350000字符的全文仍在模型调用前明确失败，分块汇总尚未实现，不声称已覆盖所有长论文。

### 长论文分段证据提取与断点恢复（替代上一条的长文限制）

新增 deep_read_chunks.py：超出单次上下文字符预算时，优先在段落边界拆成连续区间，每段最多60000字符、最多12段。所有区间无重叠无缺口；超过总段数或无法容纳合成证据的配置在调用前失败。每段按问题/方法/实验/局限/阅读提取有长度上限的分析与精确原文引用，逐项校验来源；全部成功后才进行一次笔记合成，合成引用还须属于已提取的证据。缺失于提取记录不代表原文没有报告，系统提示和生成笔记都说明这一点。

各段缓存包含精确版本、区间、文本hash、模型/端点、提示/schema，成功立即落盘；提取中断只补剩余段，合成失败复用全部成功段。最终笔记缓存隔离策略与合成提示；重复请求无需再次调模型，并恢复 evidence.json 审计文件。status.json 记录已完成段数，笔记YAML记录实际输入覆盖字符数与分段模式；100%输入覆盖不等于100%信息被提取。没有静默裁剪全文或证据。

前端费用确认明确显示最多12段加1次合成，实际费用依赖模型用量与定价。43项Python测试、23项前端测试、生产构建和9组生产子路径浏览器场景通过；新增覆盖连续分段、引用拒绝、缓存恢复、合成失败重试、超预算零调用与缓存产物恢复。浏览器实际验证确认文案可见。此验收使用模拟模型，未调用付费强模型，真实长文笔记质量仍待联调。

### 原生订阅表单与删除流程

新增 ProfileEditor：方向标识/说明/来源、英文关键词与语义改写、独立语义查询可直接表单编辑，支持新增和移除查询；高级JSON保留用于扩展字段。编辑沿用原对象字段，改动查询时清理该条embedding缓存，keyword与query不互换。应用和仓库保存前验证类型、唯一标识、非空查询与来源；字符串和旧text/expr查询格式继续兼容。

重命名同步当前各页签的任务选项；删除先确认，只修改本地订阅草稿，保存后生效，不删除历史论文/阅读记录。编辑期间禁用重新读取、其他方向编辑及仓库保存，必须应用或取消；未保存修改禁止重读覆盖。任务确认在进入编辑时失效，仍使用原SHA冲突保护写入所选分支。

24项前端测试、生产构建及9组生产子路径浏览器场景通过。管理场景实际操作表单、改名、独立语义查询、SHA保存、删除取消/确认和空列表保存；390px手机无横向溢出。首次测试暴露文本框标签名称不稳定，添加明确aria-label后重跑通过。GitHub写入与任务执行为mock，未改变实际订阅配置。

### 分诊缓存修复、预算与用量报告

缓存复用现在验证JSON、内容缓存键、论文版本及摘要证据，而非只判断文件存在。坏缓存按新增请求计入预算，零预算不修复也不调用模型；有预算时重新生成并原子替换。成功论文仍逐篇保存，后续失败不覆盖已有输出，重跑复用成功项。

每轮生成状态/耗时报告，包含完成、延后、缓存命中、chat_structured调用次数、已返回token及逐篇结果。缺用量明确usage_complete=false；usage_scope为returned_responses_only，不包含无法观测的SDK内部重试消耗，cost保持null，不推算金额。报告仅记录异常类型，不复制可能含敏感URL的供应商错误正文。CLI支持--report / DPR_TRIAGE_REPORT；Actions写runner.temp并在失败时也上传triage-run-report，保留7天，不会从缓存恢复旧报告冒充本轮完成。

46项Python链路测试通过，新增坏缓存/错误身份/错误证据缓存预算检查、已返回用量计数、失败后续跑与旧结果保留。未调用真实付费模型，供应商实际账单仍应以其计费记录为准。

### 实际 Actions 解析失败与专用校验

提交a75e954的运行45246486207在GitHub解析阶段失败，错误为job级env中不能引用runner.temp（第85行），尚未执行日报。已将DPR_TRIAGE_REPORT移至实际流水线step.env；根据GitHub上下文可用性规则，该位置允许runner上下文。普通YAML解析不能验证此规则。

本地使用官方release校验SHA256后的actionlint1.7.7验证日报/精读/reader-check/reader-publish四个工作流通过；旧版本相同文件可复现同一错误。reader-check新增固定版本与哈希校验的actionlint步骤，同时补充日报/发布工作流路径触发器，校验在安装项目依赖前执行；仅校验Actions结构/表达式，Python与shell行为仍由既有测试负责。

同一提交a75e954的轻量完整回归运行45246489835已全部success（包含真实cloud embedding/reranker smoke）；新版前端运行45246489388已通过Python/JS/构建，核对时仍在安装浏览器，未将其报告为全部成功。修复后的远端状态需以新提交对应运行另行核验。

规则来源：https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#context-availability

### 历史云端备份文件迁移

核对旧 app/read-state-sync.js 确认其表为 user_read_state，字段为 github_username/paper_id/status；旧云端记录不必存在当前浏览器localStorage。新设置入口支持选择最多5MB的JSON文件：既可读取原始ID→状态备份，也可读取旧云表导出的数组。数组必须明确选择用户名，不自动跨用户合并；相同ID的不同状态作为冲突跳过，不根据顺序覆盖。导入继续复用精确版本映射和云端ignoreDuplicates保护，不删除旧库，不自动访问旧匿名表。原始文件备份可下载，已读时间仍明确采用迁移时间。

26项前端测试、生产构建及10组生产子路径浏览器场景通过。新增单元测试覆盖用户名隔离/冲突顺序不变/非法行/特殊对象键；浏览器实际上传备份，检查选人前禁用预览、切换用户清除旧计划、访客禁止写入、本地对象备份和390px布局。未访问用户真实历史云库或导入真实个人数据。使用指南已更新迁移步骤。

### 反馈排序离线对照工具

新增reader_feedback_eval.py，只读取固定候选快照、不开启/开启反馈的两份完整排序和人工相关性标签，不访问云端或调用模型。候选内容指纹一致才比较，拒绝缺失/重复候选、模型标签以及评估ID与反馈示例ID重叠。输出Top K已标注命中/遗漏、正例增减、未标注数量、标签覆盖与可比币种的费用差异；未知用量保持null。候选输入顺序不影响指纹，标题摘要等内容变化影响指纹。

5项反馈相关测试和独立CLI合成输入冒烟通过；新增测试已纳入reader-check，Actions专用校验通过。这里只证明指标计算和输入约束，不声称已得到真实人工标签、统计显著提升或真实费用节约；工具用法已加入新版指南。

### 修复本地登录400及可操作测试入口

用户反馈登录400，错误为Unsupported provider: provider is not enabled；已用本地真实Auth authorize接口复现，根因为GitHub provider未配置，并非页面托管位置。GitHub登录增加公开Auth设置预检查与原地错误提示；新增邮箱注册/密码登录，处理邮箱确认和登录中状态，成功后清空密码，不将密码写入localStorage。

增加仅回环页面显示的本地测试库连接入口，公开配置由prepare_reader_local.py从私有CLI status文件中显式提取API_URL/ANON_KEY，检查anon角色和回环地址，只写外部构建目录，不暴露service key。当前本地5174预览已准备公开连接文件，用户可以自行注册测试账户；这些数据不与托管项目同步。

实际浏览器使用真实本地Supabase完成：未启用GitHub的原地提示、UI注册、保存笔记、退出后密码登录、刷新后笔记保留；未mock Auth或状态请求，临时用户已清理。26项前端单元测试与构建通过。托管GitHub OAuth仍需配置真实OAuth App，不能将邮箱测试当作GitHub联调完成。

### 登录项目可见性与未保存配置保护

用户切换本地/托管项目后持续遇到Invalid login credentials，不能仅凭此错误推断账号存在或密码错误。登录区域现在显示实际客户端使用的项目地址；输入地址/公钥与已保存客户端不一致时禁用登录/注册，明确要求先保存。连接参数去除首尾空白。本地测试入口默认折叠并强调不能用线上账号登录。26项前端测试、构建和真实本地Auth浏览器验证通过，包含未保存地址时禁止登录及恢复原地址后正常注册/登录/笔记恢复。用户托管账号问题仍需核对目标项目Auth Users，未将本地验证冒称线上问题已解决。

### Obsidian收件箱配置与预览服务恢复

发送到Obsidian的Inbox固定路径改为设备偏好，可编辑多级相对路径、中文目录或留空写入vault根目录；保存后刷新保持，URI正确编码目录。拒绝绝对路径、父目录段与控制字符。Actions私有仓库自动同步仍使用单独的OBSIDIAN_NOTES_FOLDER变量，界面明确说明作用范围。29项前端测试、构建和实际浏览器URI导航验证通过，未冒称桌面Obsidian保存完成；新增场景加入浏览器CI。

用户报告Chrome无法访问5174，检查发现该端口没有监听进程，已独立后台恢复静态服务并验证200及新产物。新增npm run preview固定5174并使用strictPort；另用5175实际验证此启动入口返回200后停止临时测试进程，不影响5174用户预览。

### 精读服务预设、可审阅提示词与桌面聊天材料

用户希望先测DeepSeek并检查提示词质量，同时保留桌面聊天客户端精读路径。设置新增DeepSeek官方Pro/Flash、硅基流动、OpenAI、自定义服务的配置参考与当前仓库Secrets入口；明确选择不会自动写入云端，模型密钥只配置到Actions。DeepSeek当前模型名按官方Chat Completions文档核对，不再建议已退役别名。提示词提取为src/deep_read_prompt.txt，前端展示与后端读取同一文件，补充算法流程、公式解释、同设置实验表、消融证据和复现风险要求；缓存原本包含完整提示词，因此改动后不会误用旧笔记。

新增聊天客户端精读入口，提供精确原文/PDF链接、可复制提示词、Markdown准备材料（含个人当前笔记）；明确不含全文且不是模型输出。无需API或登录，不自动派发费用。

修正dev精读入口：复用默认分支已有daily-paper-reader.yml注册入口，显式pipeline_action=deep-read调用同提交可复用workflow，跳过日报；独立concurrency避免阻塞日常任务。轮询/恢复按仓库运行请求ID与精确版本关联，兼容旧独立workflow记录。未改默认分支/Pages配置。

验证：29项前端单测、14项Python测试与7项subtests、生产构建、actionlint通过；12组生产子路径浏览器场景通过，新增真实剪贴板/下载内容/预设切换/共用模板可见性/移动布局检查。GitHub派发与模型仍是mock测试，未使用真实密钥或声称真实生成质量通过。5174服务返回200。下一步用户配置DeepSeek Secrets后实际生成一篇并人工对照原文。

### 云端全量回归的任务定位修正

0ee1f21的全量回归45302674374在test_cloud_models失败：旧测试用jobs第一个任务作为检索任务，新增可复用精读任务后读取不到env。现在分别明确检查日报run、会议retrieve任务，保留远程模型策略与轻量smoke断言。修复后本地完整pytest为616 passed、107 subtests passed；原新版阅读器CI 45302674351已经通过工作流校验、29项JS、50项Python及构建，浏览器步骤核对时仍在运行，不冒称完成。此次无产品运行逻辑变更。

### 工作台设置五分组重构（按用户确认的Spec实施）

设置弹窗替换为820px双栏、190px导航和独立内容滚动；390px手机切换横向Tab。账户/聊天/云端精读/导出/维护独立分组，草稿与实际运行配置分离，切Tab保留输入，关闭未保存内容需明确放弃。导航和顶部摘要区分配置、待密钥、同步中、成功和失败。

账户卡片保留邮箱注册登录；未启用GitHub provider时隐藏入口。Supabase配置先对候选地址验证，不替换有效连接，保存同配置不清空已有会话。手动同步返回明确结果；本地测试移至维护开发者选项。数据库与状态迁移契约未变。

聊天增加常见服务预设、显隐密钥、最小连接测试；GitHub增加只读身份/仓库/分支/workflow验证，明确未证明Actions写权限、不启动付费任务。Secrets助手改为只读变量清单和逐项复制，提示词默认折叠并提供源码链接。API Key/Token分别由用户显式勾选后存localStorage，默认仅内存；取消记住删除持久副本，一键清除同时清除草稿/运行内存与存储，保留登录和阅读数据。

导出模式实际控制论文页入口，新增安全命名格式、同函数路径预览、Vault打开测试（不创建笔记）。现有Vault用户缺省保留两个入口，其他默认Markdown，稳定ID命名继续兼容。迁移使用原解析器，按选来源/预览/导入分步，不编造旧笔记数量。

验证：33项前端单测、生产构建、13组生产子路径浏览器场景通过；新增实测默认密钥刷新清空、主动记住/清除、未保存草稿、测试不自动保存、401错误可见且密钥脱敏、权限检查不派发、导出按钮控制、桌面/手机计算布局与截图。真实本地Auth无mock验证注册、密码登录、立即同步、笔记刷新保留、无效新地址失败后原连接继续有效；临时用户已清理。5174实际下发新版构建。模型与GitHub验证传输为mock，不声称真实密钥已配置或Obsidian桌面已经入库；不扩展用户拒绝的双页面冲突验收。
