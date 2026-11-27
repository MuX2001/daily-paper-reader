# Recommendation Pipeline V2 实施与运行报告

**当前默认是影子模式。** 每日任务沿用原有上线名单，同时独立检索追踪对象和跨领域方法，为最多 15 篇候选生成证据评审。读者可以按来源筛选，在原总览里查看最强贡献、原文位置和局限。两次日期回放均发现了原 Global 名单之外的论文；目前没有人工偏好数据可以证明推荐质量整体提升。

## 已实施的边界

| 模块 | 实际行为 |
|---|---|
| `config.yaml → pipeline.recommendation_v2` | 全部开关、配额、两类探索池、追踪名单与资源限制。追踪默认空；固定词表按 UTC 日期确定性轮换 |
| `src/recommendation_channels.py` | arXiv Atom 获取带版本的论文。Targeted 独立比较身份确认与研究词命中；Global 复用既有 Step 2–5 的研究意图、重排与结果顺序；Exploration 独立比较方法词和目标学科。记录原通道、查询、排名、命中理由及版本；按 canonical_id 合池，用所选具体版本读取文档 |
| `src/main.py`、两个 `2.*retrieval_papers_*` RPC 入口 | 正常 Global 继续使用原有滚动时间窗。主动模式在 Supabase 接管且漏跑时间超出常规窗口时，用本轮原预算补一个历史片段。显式 profile 限定不改 Global 时间窗 |
| `src/reader_fulltext.py`、`recommendation_evidence.py` | 同一次 HTML 解析附带结构索引；PDF 保留真实页码。老缓存用原文连续字符偏移。复用已有来源校验、正文、哈希和缓存。索引由本版解析结果生成；图、表和公式按实际结构区分 |
| `src/recommendation_v2.py`、`minmax.py` | 从同一 feed 和源缓存编排 A/B/C，保存每日候选、预算、独立评审、逐篇错误及观测结果。校验失败的高分项单独保留为 unverified。可用已保存名单恢复内容，成功检查点可以复用 |
| `reader/src/domain.ts`、`main.tsx`、`PaperOverview.tsx`、`style.css` | 来源可多选归属，筛选器一次选一个来源，与未读筛选叠加。总览显示五项等级，缺失显示“—”。可展开核验定位、迁移用途和局限。历史记录沿用原始界面和 paper_key，已有投票、书签、同步及笔记继续使用 |
| 两个 Actions workflow、三项验证入口 | 每日流程支持定时、手动以及 resume-v2。reader-check 加入单元回归。验证入口为 `tests/test_recommendation_v2.py`、`scripts/smoke_recommendation_v2.py` 和 `reader/tests/browser-recommendation-v2.mjs`。两日期对照由 `scripts/replay_recommendation_v2.py` 复现 |

英文短语规范化、整词匹配及桥接候选的短语/类别评分适配自 SampsonML/arxiv-digest 提交 `4a20d746`。标准库实现和版权说明位于 `src/recommendation_channels.py`，发行时随附 `src/LICENSE.arxiv-digest`。未引入上游应用、Claude CLI、语音、向量库或新站点。[上游匹配实现](https://github.com/SampsonML/arxiv-digest/blob/4a20d746a2288884bbb16b0c7cbd0784c87f1f60/src/arxiv_digest/matching.py) · [桥接候选实现](https://github.com/SampsonML/arxiv-digest/blob/4a20d746a2288884bbb16b0c7cbd0784c87f1f60/src/arxiv_digest/crossover.py)

## 配置和操作

编辑现有 `config.yaml` 的 `pipeline.recommendation_v2`。将配置和代码放到 fork 的默认 dev 分支后由现有 UTC 18:37 日程运行。保持仓库原有的模型配置、Actions 权限和分支根目录 Pages 设置。手动运行标准日报选择 `pipeline_action=daily`、`content_mode=triage`、`fetch_days=1`。10/30 天、专题及 legacy 内容生成保留原流程。

| 设置 | A 原流程 | 默认影子 | B 三路+原终评 | C 完整 V2 |
|---|---|---|---|---|
| enabled | false | true | true | true |
| targeted / exploration | 任意 | true / true | true / true | true / true |
| evaluate | false | true | false | true |
| shadow_mode | 任意 | true | false | false |
| select_v2 | false | false | false | true |

**激活**时按 C 列修改右侧三个评审开关。**回滚**只需设 `enabled: false`，下轮日报即走 A；原有 feed、缓存和读者状态可保留。B 使用既有终评；C 对有定位证据的单项等级 ≥3 的论文开放。超过阅读预算时先比较有证据的最高等级，再考虑尚未覆盖的维度、主题和与已选标题的词重合度，以稳定键打破平局。没有加权综合分，也允许零篇。V2 执行出错且无有效入选时保留已完成的旧评审名单。

**追踪实验室、PI、作者。** 在下例位置填写自己的信息。示例均为占位符，不是预设名单。

```yaml
pipeline:
  recommendation_v2:
    targeted: true
    tracking:
      - name: "Author Full Name"
        aliases: ["Alternate Published Name"]
        affiliations: ["Exact Laboratory or University Name"]
        phrases: ["experimental design"]
        openalex_id: A1234567890
        backfill_days: 7
      - affiliations: ["Exact Name of Another Lab"]
```

1. 有稳定 ID 时填写 OpenAlex 作者页最后一段的 A 编号。仅在已确认作者身份后配置。可选的 `OPENALEX_API_KEY` 通过 Actions secret 传入。带 ID 的记录要求同一 arXiv DOI 和作者署名证据，冲突不入队。
2. `backfill_days` 为可选的滚动补抓，最多 30 天。按作者 ID 和日期取最多 25 条作品，只接收能映射到 arXiv DOI 的结果，再回官方 Atom 获取版本和提交日。实验室未集中发表在 arXiv、OpenAlex 缺 DOI 或 arXiv 缺机构字段时会漏召回。追踪实验室时可同时列出已确认的成员和别名。
3. 没有 ID 可删除 `openalex_id` 和 `backfill_days`，用姓名/别名与机构共同确认。只填姓名默认记为歧义并跳过；若已接受同名风险，可设 `accept_name_only: true`，记录会标出 configured_name。机构和作者匹配用于召回，不进入五维评分。
4. 探索方向填写 `profiles[].name/mode/bottleneck/abstraction/categories/phrases`。问题驱动和开放探索各有一个按日轮换的入口，默认各占探索配额的一半。开放探索可以没有当前瓶颈。新增主题时先写可迁移的方法词和学科类别，按日期轮换，无需每天生成关键词。

## 预算、证据与恢复

- 起始分析配额 Targeted/Global/Exploration 为 30%/50%/20%。整数名额按最大余数分摊，先保障探索名额，再分给仍有候选的通道。相同作品只占一个位置；候选少时允许不满。15 为 V2 全文候选上限，8 为激活模式下的阅读上限。影子期原名单仍按原规则生成。
- 默认 V2 独立评审每天最多 15 次模型请求、180000 tokens；查询/身份消歧共用 12 次搜索请求。主动模式额外沿用宿主 narrative/旧质量评审，并为这部分设置 60 次、500000 tokens 上限。原 Global 的上游粗筛、向量服务和重排沿用原配置，未计入上述 V2 增量 token 统计。评审前预留输入字节、输出上限和消息开销；无账单回执的失败请求保留预留量。计数不会因重试自动清零。
- HTML 优先使用本版 section/paragraph/equation/figure/table ID，PDF 使用页定位。老 HTML 缓存的本地 `text-偏移` 可用于核验，没有虚构的 HTML 链接。引用先精确或按空白校验；回退仅允许同一连续 token 序列，要求唯一，保留正负号、不等号、数字和运算符。表格需要实际单元格；图像评审需要实际交给模型的图片。默认 `vision_input: false`，可视化维度为空。已有模型支持图像时可打开该选项，优先使用同版本 HTML 图片，也可复用 reader 所选的有校验和的图像裁切。已用缓存的 Phoenix v2 PDF 实际提取架构图 Figure 2，核验了 JPEG 输入和第 3 页定位；本次使用的文本模型未评判图像质量。
- 按半开 Global 窗口和完整 UTC 日期处理增量。补抓最多三天，仍共用当日候选及 API 限额。探索每个日期使用当日旋转配置，每查询最新 60 篇，是有界发现。部分检索失败记录日期与来源；连续成功区间才推进游标。Global 在影子期保持原窗口，长时间中断留下的早期缺口可在主动模式补。
- `archive/recommendation-v2/<YYYYMMDD>/` 中的 `pool.json`、`evaluated.json`、`observation.json`、`budget.json` 分别保留候选、逐篇结果、当日对照和资源账本。`reviews/` 按实际请求内容、版本和模型参数缓存独立评审。发布仍走原 catalog 与 reader-publish。运行失败时保留 V2 检查点，Actions 留存 14 天的观测 artifact。推送或 Pages 校验失败查看原发布 job，不能用评审成功代替站点发布成功。
- 恢复已有日报时，手动选择 `pipeline_action=resume-v2`，在 `request_id` 填原日报日期，例如 `20261127`。该入口使用已持久化的名单与已筛选 feed，跳过重新召回、原始排序和原 LLM 初筛，使用恢复当天的可用预算。恢复需要当天有足够的剩余全文名额。生产没有对应历史 V2 池的日期无法通过该入口恢复。

## 实际对照

固定 2026-11-18、11-24 两个首次提交日期。Global 输入来自同一份 11-27 归档，对照重放已有候选，探索使用真实 arXiv Atom 日期查询和默认轮换词表。追踪名单为空。每种配置上限相同，每日分析三篇、推荐两篇；此前的 26 篇上游试验未充当标签。下表为修复历史扁平文本切片后的实际结果。

| 提交日 | Targeted / Global / Exploration 原始作品 | 合池 / 探索独有 | A / B / C 入选数 | A∩B / B∩C / A∩C | C 高分证据通过 / 未通过 |
|---|---:|---:|---:|---:|---:|
| 11-18 | 0 / 8 / 2 | 10 / 2 | 2 / 1 / 2 | 1 / 0 / 0 | 9 / 1 |
| 11-24 | 0 / 6 / 1 | 7 / 1 | 1 / 2 / 2 | 1 / 1 / 1 | 9 / 0 |

19 条高分证据中 18 条通过定位校验（94.7%）。六篇均完成本轮解析与评审；缺少可用图像仍返回 null。第一轮中历史 HTML 缓存按单行取样，抽到了作者列表和破碎公式，11-24 的 C 返回空。改为复用 narrative 的正文章节范围和连续原文偏移后复测。报告保留两轮开销，不把有更多推荐视为质量提升。

| 实际测量 | 模型响应 | tokens | 墙钟与峰值 |
|---|---:|---:|---|
| 第一轮 A/B 旧评审 + C | 7 + 6 | 31497 + 9621 | 46.08 秒，59324 KiB |
| 修正后重测，A/B 复用已缓存内容 | 3 + 6 | 15597 + 13705 | 28.62 秒，35644 KiB |
| 最终离线重放，网络调用被测试替身禁止 | 0 | 0 新增 | 0.31 秒，37036 KiB |

实测模型为 deepseek-v4-flash，C 两轮共 12 次、23326 tokens。A/B 首轮探索新论文可能只有摘要；后一次使用 C 已拉取的相同版本正文，部分旧评审请求因此发生变化。未取得实际币种账单，保留 token 数。该小样本不能估算全年收益。

### 四类可复核例子

- **实际探索发现。** 11-18 的 Fill-Distance-Guided Active Learning for Causal Function Recovery under Network Interference 原来不在这天的 Global 候选。其方法把试验点覆盖用于干扰下的函数恢复；评审指向方法段与 S6.T1 的对照表。两次 C 都将其列入。这是一个可阅读的跨域提名，尚无用户“有用”投票。[同版本论文](https://arxiv.org/html/2611.24143v1)
- **单项突出，控制样例。** 测试注入唯一有效的 idea=4，其余证据不足或较弱；同版段落支持该项时可独立入选。托管 smoke 的合成 feed 则仅 experiment=3，完整经过合池、评审校验、选择、写 feed 和生成 catalog。
- **宣传性表述，控制样例。** 只给出“突破解决所有问题”的宣称，强项引用不存在的段落。输出保留 claim–evidence gap，入选数为零。该例验证拒绝策略，不给真实论文贴上欺骗标签。
- **证据缺失或不符。** 真实回放的六篇都没有向模型发送图片，visualization 全部为 null。11-18 有一条高分证据未通过，其他合法定位仍可使用。单测另覆写了引文中的不等号和负号，预期均拒绝生成有效跳转。

## 日常观察与复现

先运行 7–14 个正常日报，检查 `observation.json` 的各通道数、unique、deduplicated、重合、证据校验、阶段错误、覆盖末日、资源账本、时长和 RSS。只有存在显式赞/踩时再算读者收益；未读、快速归档以及无反馈均为未知。用留出的用户投票文件，例如 `{"label_source":"human","feedback_context_ids":[],"labels":{"arxiv:示例版本":1}}`，其中 -1 表示明确无用。在 `measured_cost` 中可选提供 legacy/recommended 各自的 amount 和 currency。完整 K 个位置均有标签时输出 Useful Precision@K；覆盖不足时单列标注覆盖、已评样本比例和独有有用篇目。无用票不能证明论文夸大宣传。

```bash
python -m pytest -q tests/test_recommendation_v2.py
python scripts/smoke_recommendation_v2.py "$DPR_TEST_OUTPUT"
python src/recommendation_v2.py feedback "$OBSERVATION_JSON" "$HELD_OUT_VOTES" --k 8
npm run test:reader
npm run build
npm run test:reader:browser
# 两日期复现：先指定 workspace/runs 下的输出目录和原实验 sources 目录。
python scripts/replay_recommendation_v2.py --live --output "$REPLAY_DIR" --sources "$CACHED_SOURCES"
python scripts/replay_recommendation_v2.py --cached --output "$REPLAY_DIR" --sources "$CACHED_SOURCES"
```

## 验证与发布状态

本地 Python 全量 656 项和 110 个子测试通过；reader 单元测试 14 个测试文件通过。TypeScript、生产构建、actionlint 通过。使用生产 bundle 的浏览器套件验证了来源筛选与未读叠加、有效链接、空值、独立旧评分及原有桌面/移动工作区、阅读状态和笔记流程。本地首次运行 settings 浏览器测试因系统 Python 缺少 PyNaCl 中断，切到项目已有环境后全套通过。

GitHub-hosted Ubuntu 24.04 / Python 3.11 实际运行了隔离 smoke。第一轮成功生成并发布 artifact #15218214401（1073 字节），从 GitHub 下载后与原目录逐文件一致，摘要为 `sha256:01429612ac7eadde4227619233bd68cab8b6cb08ba57cd8b963b4a6aa4279204`。该运行使用合成评审响应，不消耗模型额度。[首轮托管运行](https://github.com/MuX2001/daily-paper-reader/actions/runs/46039805036)

第二轮托管运行成功构建生产 reader，通过浏览器套件、V2 单元回归，并再次完成 artifact 发布、下载和目录比对。托管 smoke 使用隔离分支 `smoke/recommendation-v2-20261127-171103`。后续总览对缺少有效定位的高等级加问号，主动模式显示实际旧终评分，并补测了可选的 PDF 裁图输入；这些改动另以本地回归验证。[第二轮托管运行](https://github.com/MuX2001/daily-paper-reader/actions/runs/46041846575)

生产 dev 分支及 Pages 未由本次 smoke 更新。正式发布仍需 dev 上的每日任务和既有 Pages commit 校验。已知边界包括 arXiv/作者元数据覆盖有限、检索窗口限量、无图像模型时无法评价视觉价值、旧 HTML 的文本偏移缺少可跳转锚点，以及定位通过不能证明语义判断正确。选择中的标题词重合仅为同级候选的去重提示。保持影子状态观察真实读者反馈，再决定是否切换 C。
