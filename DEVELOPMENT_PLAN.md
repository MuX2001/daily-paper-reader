# Daily Paper Reader 分阶段改造计划

日期：2026-11-24；开发分支：dev。本文是开发规格与验收清单，不代表功能已上线。

## 评审结论

保留 Python 检索/排序、Supabase 论文库、Actions 和 Pages，逐步迁移数据契约、用户状态和阅读界面。Docsify 放大了插件耦合问题，但不能把所有 bug 归因于框架；换 React 同样需要稳定身份、明确状态所有权和浏览器测试。强模型也不自动保证笔记质量，必须核验全文、证据与版本。

仓库已有 Step 5 推荐 JSON、user_read_state 云同步、全文获取、图表提取、专题研究预算及检查点。优先复用，不重复搭建。当前 read-state-sync.js 用 anon bearer 和 github_username 过滤，GitHub 用户名不是 Supabase 身份证明；新表必须由真实 Auth JWT 和 RLS 隔离。

每日 20–50 篇仅作为未来可配置分诊展示预算，不修改现有日常/10天/30天的选择规则。一级默认仅使用标题摘要；有缓存引言才附加，不为全部候选下载全文。缩略图在入围后生成，不放在全库维护热路径。第一页预览必须标记 first_page，不能冒充 Figure 1。GitHub 链接必须来自原文证据，不由模型猜测。

收藏只是状态变更，不自动触发付费；精读和“精读并导出”显式触发。默认先保留旧生成模式，新 triage 模式经验证后再切换。旧 docs 原位保留，先用归档入口链接旧路由，不搬文件或批量改写用户笔记。

## 架构及数据契约

- Python 产生不可变论文事实和分诊结果；浏览器消费版本化 JSON。
- Supabase 保存用户状态、反馈、精读请求。Actions 不覆盖用户状态。
- 新前端采用 React + TypeScript + Vite，部署 reader/ 子路径；初期使用普通 CSS，待设计稳定再决定是否引入 Tailwind。hash 路由兼容 Pages 和 fork 子路径。
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
- 新站实际稳定一周，确认订阅编辑/会议/专题/全文问答/Zotero/反馈/移动端/历史状态替代齐全，才删除 Docsify 加载链。观察窗口不能用测试代替。
- 旧链接和 docs 文件长期保留；/legacy/ 如需入口仅作兼容壳，不移动原文件。回退以部署切回旧入口实现，数据库新增表保留。

## 待配置项与执行记录

后续云端联调需要：测试 Supabase 项目与 OAuth 回调、强模型端点/预算、笔记仓库或 vault 目录、通知渠道。通过 secret 配置，不在聊天或计划保存密钥。没有这些信息仍可完成本地实现与 fixture 测试，但不能报告云端验收完成。

- [x] dev 分支建立；初步代码评审与计划。
- [x] 阶段 0 导出器及测试：10 项 unittest 通过；真实历史推荐导出 26 篇，精确版本键无重复；输出仅在 workspace/scratch/dpr-triage-validation。main.py --export-triage 显式启用，新旧输出并行，尚未接通生产 workflow。
- [ ] 阶段 1 分诊/图像/Auth/RLS/迁移。
- [ ] 阶段 2 SPA 与浏览器验收。
- [ ] 阶段 3 精读/Obsidian 真实联调。
- [ ] 阶段 4 反馈/通知及一周观察后退役。

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
