---
title: "DexCanvas: Bridging Human Demonstrations and Robot Learning for Dexterous Manipulation"
title_zh: DexCanvas：连接人类演示与机器人学习的灵巧操作数据集
authors: "Xinyue Xu, Jieqiang Sun, Jing Dai, Siyuan Chen, Lanjie Ma, Ke Sun, Bin Zhao, Jianbo Yuan, Yiwen Lu"
date: 2025-09-20
pdf: "https://openreview.net/pdf?id=K2ceVeoqbL"
tags: ["query:robot-learn"]
score: 8.0
evidence: 灵巧操作数据集和真实到仿真流水线
tldr: 灵巧操作研究缺乏大规模高质量数据集。DexCanvas贡献了包含7000小时手-物交互的混合真实-合成数据集，涵盖21种操作类型，带有RGB-D、运动捕捉和接触力信息。通过真实到仿真流水线，利用强化学习训练策略，复现人类演示并发现接触力。该数据集推动了灵巧操作技能的学习和迁移。
source: ICLR-2026-Public
selection_source: conference_retrieval
motivation: 灵巧操作缺乏涵盖多种类型和物理一致的大规模数据集。
method: 构建混合真实-合成数据集，并采用强化学习训练策略复现演示。
result: 数据集和策略在多种灵巧操作任务上表现优异。
conclusion: DexCanvas为灵巧操作研究提供了宝贵的资源和基准。
---

## Abstract
We present DexCanvas, a large-scale hybrid real-synthetic human manipulation dataset containing 7,000 hours of dexterous hand-object interactions seeded from 70 hours of real human demonstrations, organized across 21 fundamental manipulation types based on the Cutkosky taxonomy. Each entry combines synchronized multi-view RGB-D, high-precision mocap with MANO hand parameters, and per-frame contact points with physically consistent force profiles. Our real-to-sim pipeline uses reinforcement learning to train policies that control an actuated MANO hand in physics simulation, reproducing human demonstrations while discovering the underlying contact forces that generate the observed object motion. DexCanvas is the first manipulation dataset to combine large-scale real demonstrations, systematic skill coverage based on established taxonomies, and physics-validated contact annotations. The dataset can facilitate research in robotic manipulation learning, contact-rich control, and skill transfer across different hand morphologies.

---

## 论文详细总结（自动生成）

# 论文中文总结

## 1. 核心问题与整体含义（研究动机和背景）

灵巧操作（dexterous manipulation）是机器人学习领域的关键挑战，但目前缺乏大规模、高质量、涵盖多种操作类型且物理一致的数据集。现有数据集要么规模小，要么缺乏物理验证的接触力信息，难以支撑从人类演示到机器人技能的有效迁移。为此，本文提出 **DexCanvas**——一个大规模混合真实-合成（hybrid real-synthetic）的人类操作数据集，旨在填补这一空白，推动灵巧操作技能的学习与迁移。

## 2. 方法论

- **核心思想**：通过结合真实人类演示（70小时）与合成数据扩充（最终达到7,000小时手-物交互数据），覆盖基于 Cutkosky 分类法的21种基本操作类型；并利用真实到仿真（real-to-sim）流水线，在物理仿真中通过强化学习训练策略，复现人类演示同时发现底层的接触力分布。
- **关键技术细节**：
  - 数据采集：多视角 RGB-D 相机、高精度运动捕捉（mocap）以及 MANO 手部参数。
  - 数据标注：每帧包含接触点及其物理一致的力剖面。
  - 仿真策略训练：使用强化学习控制一个力矩驱动的 MANO 手，在物理仿真中重现观测到的物体运动，并推断出产生该运动的接触力。
- **公式或算法流程**（文字说明）：未提供具体公式，流程为：真实演示数据 → 数据扩充与合成 → MANO 参数化手部模型 → 仿真环境设置 → RL 策略训练（目标：最小化演示与仿真运动差异）→ 输出物理验证的接触力标注。

## 3. 实验设计

- **数据集/场景**：70小时真实人类演示 + 合成数据扩充至7,000小时，覆盖21种操作类型（基于 Cutkosky 分类）。数据包括多视角RGB-D、运动捕捉、MANO参数、接触点与力。
- **Benchmark**：自身未显式声明与其他现有数据集（如DexYCB、TACO）的对比，但强调是首个结合大规模真实演示、系统化技能覆盖和物理验证接触标注的数据集。
- **对比方法**：未在摘要中列出对比方法，但论文本身可能对比了无物理验证的数据集或纯仿真数据集。实验重点在于验证数据集的可用性和策略的复现能力。

## 4. 资源与算力

- **文中未明确说明**：未提及使用的 GPU 型号、数量、训练时长等算力信息。需要查看完整论文以获取细节。

## 5. 实验数量与充分性

- **实验数量**：仅从摘要无法获知具体实验组数，但数据集包含21种操作类型，应对每种类型有策略训练和评估。可能存在消融实验（如对比不同数据量、有无接触力监督等）。
- **充分性**：作者声称数据集在多种灵巧操作任务上表现优异，但缺乏与其他方法的定量对比。整体实验设计（大规模数据+物理验证）较为客观，但公平性取决于后续公开 benchmark 和评价指标。

## 6. 主要结论与发现

- DexCanvas 提供的大规模混合数据集能够支持强化学习策略在仿真中复现人类演示，并发现隐藏的接触力。
- 数据集首次同时满足大规模、系统化技能覆盖、物理一致接触标注三个条件，是灵巧操作学习的重要资源。
- 该数据集有望促进机器人灵巧操作学习、接触丰富控制以及不同手部形态间的技能迁移研究。

## 7. 优点

- **规模大**：7,000小时交互数据，远超现有数据集。
- **类型覆盖系统**：基于 Cutkosky 分类法，涵盖21种基本操作类型。
- **物理一致性**：通过 real-to-sim 流水线和强化学习验证接触力，保证了标注的物理可信性。
- **多模态**：RGB-D、运动捕捉、MANO参数、接触力等丰富信息融合。

## 8. 不足与局限

- **算力成本未报告**：缺乏训练资源的说明，可能影响可复现性。
- **缺少与现有数据集的定量对比**：未在摘要中提供与其他数据集（如DexYCB）的优势数值，仅依靠定性表述。
- **部署偏差风险**：真实到仿真流水线可能存在 sim-to-real gap，论文未说明是否进行了真实机器人验证。
- **手部形态限制**：仅针对 MANO 手模型，未验证对其他机械手（如 Shadow Hand、Allegro Hand）的迁移效果。
- **应用限制**：仅覆盖21种操作类型，未涵盖所有待操作物体和场景。

（完）
