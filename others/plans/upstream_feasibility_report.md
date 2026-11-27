# 上游组件的小样本 CPU 实验

**结果。** 在同一份 26 篇候选中，SampsonML 的短语桥接通道把一篇有建模价值、被宿主终评淘汰的最优控制论文排到第一。两篇解析样本上，宿主已经能恢复全部带 alttext 的公式字符串，且按编号找到所测四幅图和图注。优先投入跨域候选与来源定位。样本不足以证明推荐准确率提升，也不足以支持更换 PDF 引擎。

## 固定输入与环境

- 宿主 `94e52c89`，SampsonML/arxiv-digest `4a20d746a2288884bbb16b0c7cbd0784c87f1f60`。WSL2 Linux 6.6.87.2 x86_64，i5-12600KF，系统约 15.5 GiB 内存；Python 3.12.3，OpenBLAS 单线程。运行命令未调用 GPU、模型服务或数据库。
- 候选固定为仓库 `archive/20261127/recommend/arxiv_papers_20261127.standard.json`，SHA-256 为 `385ffa0dd5e6cc4839d515127e7283d4320aac1dab0fc757c0e4c4423094f7af`。宿主历史终评用同一天的 `quality-20261127/report/scores.csv`。文档是同一组候选中的 Phoenix v2 和 RoboHarness-RL v1，有架构图、实验表格、公式和参考文献。原始文件总计约 17 MiB。
- 宿主用既有环境和 BeautifulSoup 4.14.3、PyMuPDF 1.26.7。上游隔离环境含 httpx、pypdf、NumPy、Jinja2 和 tomlkit。带部分 wheel 缓存的 pip 安装用时 18.50 秒，峰值 RSS 104080 KiB，安装后环境 95 MiB。第一次直接从宿主环境导入 crossover 因缺少 httpx 失败。隔离安装后直接调用上游源码，无需安装其完整桌面应用。
- 本轮比较使用操作系统已可读的本地原件。下表是一次顺序运行，进程时间含导入，分项计时只含解析。宿主进程还做了二次 DOM 检查、PDF 裁图，故进程峰值不能用于比较两个 HTML 解析器的固有内存需求。

| ID | HTML SHA-256 | PDF SHA-256 |
|---|---|---|
| 2611.24938v2 | 8826ac8ae1f135dfa325bb43da93780a3bf21603457bbcc4d6f89ca5ca57ecc8 | 080c21b22582c60b03614d5c5ef7a75dac5e39b576ca3cb31034abdd33d81b0f |
| 2611.32016v1 | a3338add7077d5c6ad36f8d2e00cbb0cc7f40c0a46816ba9cdab6aba699523f8 | 737b7d1bc7e957e90e38a819ad232961d994e81795c2c8d99f91b8629e325ed3 |

## 解析对照

| 样本 | 宿主 HTML / PDF 秒 | 上游 HTML / PDF 秒 | 宿主 HTML / PDF 字符 | 上游 HTML / PDF 字符 |
|---|---:|---:|---:|---:|
| Phoenix | 0.312 / 0.100 | 0.071 / 0.896 | 112076 / 115378 | 95463 / 94569 |
| RoboHarness-RL | 0.179 / 0.097 | 0.066 / 0.635 | 128361 / 138271 | 113868 / 137167 |

宿主整进程 1.73 秒、141568 KiB；上游 1.76 秒、73188 KiB。上游 HTML 的流式遍历比较快，两个输出分别有 84、104 个 Markdown 标题标记，也都丢了 References 标题；上游 PDF 方案较慢。宿主两个 HTML 都保留 References。逐一查找输入 math 节点的 alttext，宿主分别命中 279/279 与 217/217（重复公式按节点计，此检查未验证公式渲染）。上游用成对美元符号的简单正则数得 271、214 段，此指标与节点命中率口径不同。两种纯文本都不能独立表达表格合并单元格或图版布局。应保存同版本 HTML 的元素 ID、表头、行列关系及 TeX，不宜用截断的投影覆盖全文。

| 样本 / 目标 | HTML 原件 | 宿主 PDF 裁切人工检查 |
|---|---|---|
| Phoenix Fig 1 | S0.F1，有图与 caption | p1，扇形实验结果图和图例正确，左上多带一小段 Code 链接 |
| Phoenix Fig 2 | S2.F2，有图与 caption | p3，双教师蒸馏和 VAE 架构分图及图例可辨 |
| RoboHarness Fig 1 | S0.F1，有 caption，img[src] 为 0 | p1，同编号方法、收益和相机画面三个分区可辨，说明 HTML 内嵌绘图需要回退 |
| RoboHarness Fig 2 | S1.F2，有图与 caption | p2，横向动作抽象层级图可辨 |

上表人工检查实际返回的四张裁图，同时对照 PDF caption 的编号和文字。裁图与 caption/page/clip 分开返回。Phoenix 的 Table 1 是 S3.T1，直接遍历 img 会遗漏表格；RoboHarness 的 S3.T1 图注还给出每条件回合数。老版 `paper_figures.py:extract_figures_from_pdf` 按 xref 导出嵌入位图，源码明确写入空图注。此处对老版仅静态检查。未测试扫描件、无图注页或会议专有排版。

## 推荐与原文证据

以机器人学习中的轨迹优化为桥接意图，固定 math.OC 类别及三个英文词组，调用上游原始 `score_crossovers` 的无向量路径。含历史证据校验，26 篇用时 0.18 秒、43756 KiB，只有一篇得分大于零。SQP 论文 `2611.31786v1` 得 2.5，排名第一，其后四篇均为 0；不要把零分并列的顺序解释成推荐。历史记录中它的原筛选分 9.0、排名 6；终评问题匹配 2、增益 4、惩罚 0，总分 6.4，排名 22/26，落选。所存终评证据归一空白后在同版本全文精确命中，全文哈希 `e992faf1e354c14ac83d2fd32f03bd0623eae0441ab866882188c11b7e890f24`。具体建模长板是文中给出的 iLQR 与修正 SQP 的关系，以及下降方向与二阶动力学项之间的取舍，可作为机器人优化的阅读理由。[论文原文](https://arxiv.org/html/2611.31786v1)

这验证了“用方法词找回单项价值，再用原文核验”的可行性。词表由研究者针对已知问题选定，存在选择偏差；上游算法本身没有给该论文打五维分。26 篇原评分有 4 个不同值，终评有 9 个不同值，10 篇通过。分数拉开并不能证明校准良好。另两个可复核的证据点是 Phoenix 的 S4.T5（同条件的特征压缩消融，实验设计）和 RoboHarness 的 S4.T4（配对状态、检验方法，实证结论需连同统计条件阅读）。图注写得清楚可支持呈现价值，无法据此推断工程实现可复现。[Phoenix 原文](https://arxiv.org/html/2611.24938v2#S4.T5) · [RoboHarness 原文](https://arxiv.org/html/2611.32016v1#S4.T4)

## 复现

从宿主根目录运行。优先使用已有缓存目录，另一台机器可将 arxiv.org 的 /html/ 和 /pdf/ 对应版本保存为上表文件名，先校验 SHA-256。若上游重新生成 HTML 导致哈希变化，另记样本版本。下列准备命令面向尚未创建实验目录的工作区。

```bash
WS="$HOME/workspace"
UP="$WS/deps/dpr-study-arxiv-digest"
LAB="$WS/envs/venv/dpr-upstream-study"
SAMPLES="$WS/runs/daily-paper-reader/quality-20261127"
git clone https://github.com/SampsonML/arxiv-digest "$UP"
git -C "$UP" switch --detach 4a20d746a2288884bbb16b0c7cbd0784c87f1f60
python3 -m venv "$LAB"
"$LAB/bin/pip" install --cache-dir "$WS/.cache/pip" httpx==0.28.1 pypdf==6.1.1 numpy==2.2.6 jinja2==3.1.6 tomlkit==0.13.3
export OPENBLAS_NUM_THREADS=1 PYTHONPATH="$UP/src"
sha256sum "$SAMPLES"/*.html "$SAMPLES"/*.pdf
/usr/bin/time -f '%e sec %M KiB' "$WS/envs/venv/daily-paper-reader/bin/python" -B scripts/upstream_study_probe.py host "$SAMPLES"
/usr/bin/time -f '%e sec %M KiB' "$LAB/bin/python" -B scripts/upstream_study_probe.py candidate "$SAMPLES"
/usr/bin/time -f '%e sec %M KiB' "$LAB/bin/python" -B scripts/upstream_study_probe.py bridge "$SAMPLES"
```

**验证范围。** 已跑两套 HTML/PDF 解析、宿主图注裁切和上游桥接候选。pdffigures2 只完成源码和构建链审核，本机未装 JVM/sbt；Docling、MinerU、SPECTER2 未下载权重。没有运行跨域查询生成模型、全库向量桥接或五维评审，没有盲评读者偏好。未触发真实 GitHub Actions 或 Pages 发布。原有缓存的付费调用与本次零 API 调用分开核算，见[实施计划](upstream_integration_plan.md)。
