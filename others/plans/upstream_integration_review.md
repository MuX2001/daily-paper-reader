# 每日论文推荐的上游集成评审

2026-11-28，宿主提交 `94e52c89`。建议保留检索、读者反馈、同版本全文及发布链路，优先移植 SampsonML 的跨领域查询与候选评分。最有价值的改动位置在初筛之前和最终资格判断处。如果只换最后的排序器，早期被筛掉的论文仍然没有机会。图表方面，先复用宿主已经能定位图注的抽取器。

## 实际运行链路

| 边界 | 输入、处理与输出 | 对集成的影响 |
|---|---|---|
| 抓取和查询 | `src/main.py:should_skip_fetch` 决定是否走本地抓取。维护流程通过 `src/maintain/sync.py` 入库。`subscription_plan.py` 分开生成关键词和语义意图，`source_backend_router.py` 按源分发至 BM25、exact RPC | 复用日期、来源、原词和语义查询契约。新的方法词可以成为单独召回通道 |
| 候选 | `2.1.retrieval_papers_bm25.py`、`2.2.retrieval_papers_embedding.py` → `2.3.retrieval_papers_rrf.py:rrf_fuse`，默认每查询融合上限 200，k=60 → `3.rank_papers.py` 重排 | RRF 合并命中，未约束同一方法占据多少席位。科研文献专用向量不能直接写进现有 384 维列 |
| 初筛 | `4.llm_refine_papers.py:call_filter/validate_filter_results` 对标题摘要评分；`5.select_papers.py` 产生 deep_dive、quick_skim。`archive/<date>/recommend` 是可重放的名单边界 | 20261127 有 13+13 篇进入下一阶段。26 篇是已经过筛的集合，用它无法测全库召回率 |
| 精读证据与终评 | 单日期 triage 由 `triage_export.py` 投影到 feed，再由 `minmax.py` 生成 narrative 并调用 `recommendation_quality.py:assess`。该函数校验证据编号，核对全文缓存哈希，每五篇一批，校验具体的夸大陈述和支持片段 | 已经区分问题匹配、信息增益和有据惩罚。配置用 0.8、1.2、0.75 加权，并同时要求 match≥3、gain≥3、总分≥7。有确切长板的相邻领域论文可能落选。E 编号是当前请求局部编号 |
| 资产与存储 | `reader_fulltext.py:get_fulltext` 校验版本，优先官方 HTML，回退带页码的 PDF，保留参考文献。`reader_thumbnail.py:preview/pdf_figure` 按目标图注找图。`paper_figures.py:ensure_paper_media` 是另一条 legacy 链；其 PyMuPDF 图像对象兜底把 caption 写为空 | 全文、预览、批量媒体是不同接口。已有章节内容和 TeX，扁平文本丢失可跳转的 DOM 标识。保留缓存、版本、资源 URL 和旧路由 |
| 反馈与发布 | `reader_feedback.py:snapshot/feedback_context` 可从已有状态库取最近 30 天最多 200 条记录，每方向提示最多正负各五条。`reader_catalog.py` 生成目录。Actions 默认 triage，legacy/dual 可以走 `6.generate_docs.py`；发布 reader 还要构建、暂存并核验 Pages | 读完与显式负反馈含义不同。API 密钥只在运行环境。新字段应可选，旧客户端仍然能读现有 feed |

## 统一决策矩阵

日期是实际检出提交的作者日期，作为维护信号；它不能证明有维护承诺。CPU 栏区分本次运行和依源码推断。成本“低”指单个边界字段适配，“中”涉及候选、缓存与验证，“高”涉及新运行时、语料或持久层。

| Component | Upstream | Reuse Strategy | Expected Benefit | Integration Cost | CPU Feasible | Evidence | Decision |
|---|---|---|---|---|---|---|---|
| 兴趣漂移、显式先验 | PaperFlow · MIT · 08-22 | REFERENCE | 把短时兴趣变化与长期研究方向分开 | 中；依赖 NumPy、方向词典和 drift_engine | 数值部分可行，未实测 | [update_profile.py](https://github.com/OpenRaiser/PaperFlow/blob/4a835e737490785b3ce51025c85b630cd224318c/skills/profile-updater/scripts/update_profile.py) 的 update_interest_vector、calculate_paper_score 混合向量、主题、作者机构热度和 must-read；质量项还受个人信号门控 | 保留漂移诊断设想，拒绝直接移植热度排序，也不把跳过视为显式负票 |
| 引用种子、多源 | paper-digest · 无根许可证 · 11-26 | REFERENCE | 已关注论文的引用者可以提供新入口 | 中；Semantic Scholar、HF、arXiv，Claude 两阶段及可选 Gmail | 客户端可行，远端限流另计 | [collectors.py](https://github.com/zytzrh/paper-digest/blob/463e39bab27bc126a8d824fb8eda75aabf6bb6f3/src/collectors.py) 以 SemanticScholarCollector 核对引用；同目录 ranker.py 的 LLMRanker 对关键词、引用、社区加分排序后仅评前30；feedback.py 保存正负 seeds | 等引用覆盖评估再做。无明确代码授权，排除移植 |
| 图注定位与区域裁切 | pdffigures2 · Apache-2.0 · 2023-11-27 | DEPENDENCY | PDF 向量图、表、caption 与区域成对输出 | 中；独立 JVM 批 CLI，Scala 2.12、PDFBox 2.0.26，构建含旧 sbt-bintray 插件 | CPU 设计；未实跑 | [FigureExtractor.scala](https://github.com/allenai/pdffigures2/blob/3d7ad46753d4a315cccd1c2bcab398380e88c534/src/main/scala/org/allenai/pdffigures2/FigureExtractor.scala) parseDocument 从 CaptionDetector、GraphicsExtractor、CaptionBuilder 到 RegionClassifier 和 FigureDetector，同时保留 failedCaptions | 仅作为受限 PDF 对照候选；目前不引入日常依赖 |
| 跨领域问题和方法词 | SampsonML/arxiv-digest · MIT · 11-04 | ADAPT | 扩展本领域关键词之外的候选 | 中；保留 BridgeMap、类别校验和 score_crossovers，替换 CLI、Store、模型调用 | 短语分支实测 | [crossover.py](https://github.com/SampsonML/arxiv-digest/blob/4a20d746a2288884bbb16b0c7cbd0784c87f1f60/src/arxiv_digest/crossover.py) 按兴趣缓存问题与桥接类别；候选分可含问题向量标准分、短语命中、类别奖励及本领域中心惩罚 | 优先影子运行。保留原文提供的迁移理由 |
| 英文短语匹配 | 同上 | ADOPT | 连字符、重音、单复数一致；匹配可解释 | 低；标准库，须传 normalize 后文本 | 已随上项运行 | [matching.py](https://github.com/SampsonML/arxiv-digest/blob/4a20d746a2288884bbb16b0c7cbd0784c87f1f60/src/arxiv_digest/matching.py) 的 normalize、find_terms 使用整词与有限复数规则 | 可直接移植两函数及相关测试，保留 MIT 声明；只用于桥接词 |
| 结构化全文 | 同上 | REFERENCE | 快速提取 Markdown 小标题、表格单元格和 LaTeX | 低；HTMLParser，可独立解析，PDF 端使用 pypdf | HTML/PDF 实测 | [fulltext.py](https://github.com/SampsonML/arxiv-digest/blob/4a20d746a2288884bbb16b0c7cbd0784c87f1f60/src/arxiv_digest/fulltext.py) 跳过 bibliography；FullTextFetcher 还会截断 120000 字符 | 借用段落标记约定，继续用宿主完整原文 |
| 文档版面和公式 | Docling · MIT · 11-27 | REFERENCE | 结构化表格、公式补识别 | 高；模型资产、OCR、表格与公式阶段需分开计费时 | CPU 路线可配，资源未测 | [standard_pdf_pipeline.py](https://github.com/docling-project/docling/blob/40e490c8d93ef51e4f270feb02c3bb14851f0405/docling/pipeline/standard_pdf_pipeline.py) 构造 OCR/layout/table factory，do_formula_enrichment 单独控制代码公式模型；入口 docling/document_converter.py | 仅给 HTML 缺失且普通 PDF 抽取不合格的文档做后续盲测 |
| 标签偏好分类 | arxiv-sanity-lite · MIT · 2022-02-13 | REFERENCE | 稀疏特征在本地可解释 | 中；TF-IDF 特征库与 scikit-learn | CPU 设计，依特征规模 | [serve.py](https://github.com/karpathy/arxiv-sanity-lite/blob/d7a303b410b0246fbd19087e37f1885f7ca8a9dc/serve.py) svm_rank 以标签/种子为正，其余为 0，balanced LinearSVC 使用决策距离；compute.py 生成特征 | 可作离线基线。稀少负票不足以校准该距离 |
| 科学语义 | SPECTER2 · Apache-2.0 · 2025-10-24 | REJECT | 文献间相似度可能优于通用模型 | 高；Torch、模型和 adapter，索引需重编码 | 本机未测速 | [timo/interface.py](https://github.com/allenai/SPECTER2/blob/fac1cb0940fe7bd3c0db00973f6889ca0b481b63/specter2_0/timo/interface.py) Instance 区分 ADHOC_QUERY 与 PROXIMITY，Prediction 规格 768 维 | 当前没有检索收益或 CPU 时间证据支持更换全库 |
| 探索席位提示 | arxiv-ai-digest · MIT · 04-16 | REFERENCE | 提示允许研究方向之外的 wildcard | 低；Claude、全日摘要上下文 | 客户端可行 | [ranker.py](https://github.com/agarciangulo/arxiv-ai-digest/blob/2b075befa84f77ec5a26c294727fb554645faa0a/src/ranker.py) 提示输出 top10、wildcard、tier、理由；.github/workflows/daily_digest.yml 为工作日程、15 分钟、邮件 secrets | 采用“可以空缺”的探索理由，舍弃机构加分和固定排名层级 |
| 静态摘要发布 | daily-arXiv-ai-enhanced · Modified Apache · 09-08 | REJECT | 可供比较的定时流水线 | 高；uv、模型 API、分支布局与宿主不同 | 网络服务驱动 | [run.yml](https://github.com/dw-dengwei/daily-arXiv-ai-enhanced/blob/01fdad3b0aec2d2f7977b686253a7b0c1c8273dc/.github/workflows/run.yml) 从 JSONL、enhance.py、convert.py 到 main/data 分支推送 | 宿主已有定时、内容目录和发布校验。保留宿主 |
| 可定位上下文与多样性 | paper-qa · Apache-2.0 · 10-25 | REFERENCE | 给证据片段去冗余 | 中；EmbeddingModel、向量检索及 LLM，整包接口为异步问答 | 小矩阵可行，未测速 | [llms.py](https://github.com/future-house/paper-qa/blob/c692d0dfeac4a0296599f7fe21a253a58b7ac12a/src/paperqa/llms.py) 的 MMR 兼顾查询分和与已选片段最大相似度，lambda 默认 1；同库 docs.py:aget_evidence 和 types.py:Context 关联文本与来源 | 仅对照测试 MMR。片段多样性不能直接推出论文榜单质量 |
| PDF 多后端解析 | MinerU · 自定义附加条款 · 11-18 | REJECT | 复杂版面的结构化输出 | 高；DocVortex、模型和可选 VLM 服务 | 不同 effort 路径要求不同，未测 | [backend/analyze.py](https://github.com/opendatalab/MinerU/blob/097de7f63f54722c9b805ee1c9a14a0c5b02e078/mineru/backend/analyze.py) doc_analyze 分派格式、effort、image_analysis，构造 ModelJson/MiddleJson | 暂不纳入每日链。许可证含服务展示归属及商业规模阈值 |

## 建议采用机制的边界

- **多目标与证据。** 当前质量提示已经要求声明与支持片段，且禁止由缺少证据推断夸大。保留这套校验，将单项信息增益拆成五类有独立证据的判断。证据编号命中只证明片段存在，仍需抽检它能否支持主张。
- **意外发现与结果多样性。** 跨域桥接解决“有没有进入池”，MMR 解决“候选之间是否重复”，适用阶段不同。SampsonML 的普通 rank.py 仍然要求主题相关并强制保留关注作者；此次建议针对 crossover.py。先观察领域分布、支持证据、相邻论文重复率，再决定是否需要 MMR。
- **偏好与负反馈。** 优先保留现成的按方向匹配、限量正负样例。历史长短期偏好拟合需要足够标签和时间切分，训练与验证必须按用户和日期隔离。访问量、作者热度、缺席或未读都不能作为负票。
- **来源及许可。** 上表指向已读源码，链接固定检出提交。MIT 移植保留版权和许可文本；Apache 依赖检查 LICENSE、NOTICE 和修改告知；模型权重、字体与代码分别核对许可。完整应用常附带此处不需的依赖，例如 SampsonML 的桌面语音、MCP 和本地 embedding。paper-digest 的 Actions 每日调用 src/main.py 并推状态，PaperFlow 的 ci.yml/pages.yml 面向测试和站点；两者都不能证明宿主的生产负载。

短语通道、结构化段落和现有证据之间的可复现实验见[可行性报告](upstream_feasibility_report.md)。具体改动与上线门槛见[集成计划](upstream_integration_plan.md)。
