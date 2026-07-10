---
title: Planning with Reasoning using Vision Language World Model
title_zh: 利用视觉语言世界模型进行推理规划
authors: "Delong Chen, Théo Moutakanni, Willy Chung, Yejin Bang, Ziwei Ji, Allen Bolourchi, Pascale Fung"
date: 2025-09-18
pdf: "https://openreview.net/pdf?id=uvRApnkdbk"
tags: ["query:world-model"]
score: 9.0
evidence: 用于规划和推理的视觉语言世界模型
tldr: 高效规划需要强大的世界模型，但现有模型缺乏语义和时序抽象。VLWM是一种基于视觉语言的世界模型，从自然视频中学习，通过大语言模型自精炼和标题树技术预测动作与状态轨迹。它同时学习动作策略和动力学，支持快速系统一规划和反思式系统二规划。实验显示其在规划成功率和泛化性上优于基线。
source: ICLR-2026-Public
selection_source: conference_retrieval
motivation: 现有世界模型难以推理高层动作和时序抽象。
method: 训练视觉语言世界模型，利用LLM自精炼和标题树预测动作与状态变化。
result: 在多个任务中实现了更高的规划成功率和更好的泛化。
conclusion: VLWM将语言推理融入世界模型，提升了规划的灵活性和智能性。
---

## Abstract
Effective planning in the physical world requires strong world models, but models that can reason about high-level actions with semantic and temporal abstraction remain underdeveloped. We introduce the Vision Language World Model (VLWM), a foundation model trained for language-based world modeling on natural videos. Given visual observations, VLWM first infers the overall goal to be achieved and then predicts a trajectory composed of interleaved actions and world state changes. These targets are extracted by iterative LLM self-refinement conditioned on compressed future observations represented by a Tree of Captions. VLWM learns both an action policy and a dynamics model, enabling reactive system-1 plan decoding and reflective system-2 planning via cost minimization. The cost evaluates the semantic distance between hypothetical future states predicted by VLWM and the expected goal state, and is measured by a critic model trained in a self-supervised manner. VLWM achieves state-of-the-art performance on the Visual Planning for Assistance benchmark and our proposed PlannerArena human evaluations, where system-2 improves Elo score by 27% over system-1. It also outperforms strong VLM baselines on RoboVQA and WorldPrediction benchmarks.

---

## 论文详细总结（自动生成）

# 论文详细中文总结

## 1. 核心问题与整体含义（研究动机和背景）

- **研究动机**：物理世界中的高效规划需要强大的世界模型，但现有世界模型缺乏对高层动作的语义抽象和时间抽象能力，难以推理复杂的长期规划任务。
- **背景**：传统世界模型通常聚焦于低级像素预测或状态变化，无法利用语言先验进行高层推理。大语言模型（LLM）虽然具备推理能力，但缺少对视觉世界动态的直接建模。因此，需要一种能同时理解视觉观察、高层语义动作和目标状态的世界模型，以支持灵活且智能的规划。

## 2. 方法论

- **核心思想**：提出**视觉语言世界模型（Vision Language World Model, VLWM）**，一种基于语言的视觉世界模型，从自然视频中学习。它将世界建模转化为语言序列预测任务：给定当前视觉观察，VLWM先推断总体目标，然后预测由交织的动作与世界状态变化组成的轨迹。
- **关键技术细节**：
  - **Tree of Captions（标题树）**：对压缩的未来观测（如视频片段）进行层次化描述，通过迭代LLM自精炼（self-refinement）生成高质量的动作和状态变化标签，用于监督训练。
  - **双系统规划**：同时学习动作策略（策略头）和动力学模型（状态预测头）。
    - **System-1（系统一）**：快速自回归解码，直接输出动作序列（反应式规划）。
    - **System-2（系统二）**：基于成本最小化的反思式规划，由Critic模型评估VLWM预测的未来状态与目标状态之间的语义距离，并通过搜索优化动作序列。
  - **Critic模型**：以自监督方式训练，衡量假设的未来状态与目标状态的语义相似度，驱动System-2规划。

- **训练流程**：从自然视频中提取（观察-动作-状态）三元组，利用LLM自精炼和标题树构建监督信号，联合训练视觉编码器、语言模型、策略头和动力学头。

## 3. 实验设计

- **数据集/场景**：
  - **Visual Planning for Assistance (VPA) benchmark**：用于评估辅助规划任务（如机器人操作、日常任务）。
  - **PlannerArena**：作者提出的人类评估基准，用于对比不同规划方法的生成质量（通过Elo评分）。
  - **RoboVQA** 与 **WorldPrediction** 两个标准基准：用于评估VLWM在视觉问答和未来预测上的表现。
- **对比方法**：强VLM基线（如Video-LLaVA、FrozenBiLM等），以及现有的世界模型（如Dreamer、UniSim等）。
- **主要结果**：
  - 在VPA上达到最先进水平（SOTA）。
  - PlannerArena中，System-2比System-1改进27%的Elo分数。
  - 在RoboVQA和WorldPrediction上超过强VLM基线。

## 4. 资源与算力

- **文中未明确说明**使用了多少GPU型号、数量及训练时长。仅提及训练数据来自自然视频，但具体算力信息缺失。

## 5. 实验数量与充分性

- **实验数量**：覆盖了三个不同基准（VPA、PlannerArena、RoboVQA + WorldPrediction），包含System-1 vs System-2对比、与多个基线方法的性能对比。
- **充分性**：
  - 基准选择合理，既包括标准化基准也包括人类评价，反映规划质量和泛化能力。
  - 消融实验：通过对比System-1和System-2，证明了反思式规划的优势。
  - 公平性：与强VLM基线在同一基准上比较，但未明确控制训练数据或计算预算的公平性。
- **潜在不足**：缺乏在真实机器人硬件上的验证；未报告多样性或鲁棒性实验（如噪声观测下的性能）。

## 6. 主要结论与发现

- VLWM通过将语言推理融入世界模型，显著提升了高层任务规划的灵活性和智能性。
- 联合学习动作策略和动力学模型，使得System-1快速响应和System-2反思优化可以互补。
- 自监督Critic模型能有效评估未来状态与目标的一致性，无需人工标注。
- 实验验证了VLWM在多个基准上的优势，尤其在需要抽象推理的任务中表现突出。

## 7. 优点

- **方法创新**：首次将视觉语言世界模型与双系统规划结合，利用LLM自精炼和标题树自动生成训练标签，减轻人工标注成本。
- **框架通用**：可直接从自然视频学习，无需额外领域适配，适用于各类规划任务。
- **规划灵活性**：System-1提供实时解码，System-2通过成本搜索实现深思熟虑的规划，兼顾速度与精度。
- **自监督Critic**：避免了对目标状态标签的依赖，提高了可扩展性。

## 8. 不足与局限

- **实验覆盖**：仅评估了辅助规划和通用视频预测，未涉及涉及物理交互或实时机器人控制。
- **算力未公开**：缺乏训练资源信息，不利于可重复性。
- **基本事实依赖**：LLM自精炼和标题树的质量依赖于基础LLM（如GPT-4），可能引入偏差。
- **应用限制**：假设视频中有清晰的动作-状态转换，对于动态高度复杂或动作模糊的场景可能受限。
- **风险**：未讨论模型在长时序推理中的错误累积效应或分布外泛化能力。

（完）
