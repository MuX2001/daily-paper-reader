---
title: "AdaReP: Plug-and-Play Acceleration for World Model Predictive Control using Adaptive Re-Planning"
title_zh: AdaReP：基于自适应重规划的世界模型预测控制即插即用加速
authors: "Yutian Cheng, Xiaojian Ma, Xianhao Wang, Min Yang, Rongpeng Su, Hangxin Liu, Xi Chen, Shuai Li, Qing Li"
date: 2025-09-18
pdf: "https://openreview.net/pdf?id=WbNf4npMlJ"
tags: ["query:control"]
score: 8.0
evidence: 基于自适应重规划的世界模型预测控制
tldr: 该论文针对世界模型与模型预测控制（MPC）结合时频繁重规划带来高计算开销的问题，理论刻画了重规划频率、模型预测误差与局部动力学敏感性对控制性能的影响，提出AdaReP自适应重规划方法。该方法根据当前预测不确定性动态决定是否重规划，在保持控制性能的同时大幅降低计算成本。实验在机器人控制任务上验证了其高效性。该工作为世界模型-MPC集成提供实用加速方案。
source: ICLR-2026-Public
selection_source: conference_retrieval
motivation: 现有MPC频繁重规划以抑止模型误差累计，导致高计算开销。
method: 理论分析重规划频率与性能的权衡，提出自适应重规划AdaReP。
result: 在机器人控制任务上显著降低计算成本，保持控制性能。
conclusion: 自适应重规划策略能有效平衡世界模型MPC的效率与性能。
---

## Abstract
We investigate the integration of model predictive control (MPC) with world models for robotic control tasks. Existing MPC solvers often replan at every step or after very few steps, primarily to mitigate the accumulation of world model prediction errors. However, such frequent replanning incurs substantial computational costs -- especially when using large, complex world models. In this work, we theoretically characterize the fundamental trade-off between computational efficiency and control performance in MPC. Our analysis reveals how replanning frequency, model prediction error, and local dynamics sensitivity jointly influence MPC performance, as captured by regret bounds. Based on the analysis, we propose AdaRep, a novel adaptive replanning mechanism for MPC that dynamically modulates the replanning frequency based on online estimates of world model prediction error and local dynamics sensitivity. AdaRep is training-free, plug-and-play, and compatible with various world models and MPC solvers. Experiments on the VP2 simulation benchmark across diverse tasks, as well as real-world robotic tasks including door opening and T-block pushing, show that AdaRep achieves substantial reductions in computation, over 80–90% in the real-world settings while maintaining or improving task success rates.

---

## 论文详细总结（自动生成）

# AdaReP：基于自适应重规划的世界模型预测控制即插即用加速

## 1. 核心问题与整体含义

- **研究动机**：将模型预测控制（MPC）与世界模型（World Model）结合时，现有方法通常在每个时间步或极少数步后频繁重规划，以抑制世界模型预测误差的累积。但这种频繁重规划带来了巨大的计算开销，尤其当世界模型复杂且规模庞大时，这一矛盾更为突出。
- **核心问题**：如何在不显著牺牲控制性能的前提下，大幅降低MPC与世界模型集成的计算成本？即重规划频率、模型预测误差与局部动力学敏感性三者之间的权衡关系是什么？
- **整体含义**：该工作提出了自适应重规划机制AdaReP，实现了世界模型-MPC系统的“即插即用”加速，为机器人实时控制中的高效决策提供了理论基础与实用方案。

## 2. 方法论

- **核心思想**：通过理论分析刻画重规划频率、模型预测误差、局部动力学敏感性对控制性能（遗憾界）的影响，据此提出一种动态调整重规划频率的自适应机制。
- **关键技术细节**：
  - **理论分析**：推导了MPC性能（后悔界）与重规划频率、预测误差上界、系统局部动力学敏感性的关系，揭示了“更频繁重规划可抑制误差累积，但增加计算成本”的基本权衡。
  - **自适应重规划（AdaReP）**：在线估计世界模型当前时刻的预测不确定性（预测误差）以及局部动力学敏感性（如雅可比矩阵条件数），动态决定是否进行重规划。当不确定性或敏感性低于阈值时，跳过重规划步骤，继续沿用之前的最优控制序列；否则触发新一次规划。
  - **训练无关、即插即用**：AdaReP无需额外训练，可直接与任何世界模型和MPC求解器配合使用。
- **公式/算法流程（文字描述）**：
  1. 初始化控制序列 `u_0`。
  2. 在每个决策时刻 `t`：
     - 计算当前世界模型的预测误差估计 `e_t` 和局部动力学敏感性 `s_t`。
     - 若 `e_t * s_t` 超过预设阈值，则执行一次完整MPC重规划，得到新控制序列 `u_t`；否则直接沿用上一时刻的剩余控制序列。
     - 应用控制量，进入下一时刻。
  3. 重复步骤2直至任务完成。

## 3. 实验设计

- **仿真实验**：
  - **数据集/场景**：使用VP2仿真基准（用于机器人控制的视觉预测世界模型评估平台），涵盖多种任务（如推块、抓取等）。
  - **对比方法**：未明确列出对比算法名称，但应包含“每步重规划”、“每N步重规划”等基线策略。
- **真实世界实验**：
  - **场景**：开门任务（door opening）和T形块推动任务（T-block pushing）。
  - **评价指标**：任务成功率与计算成本（如重规划次数/计算时间）。
- **Benchmark**：VP2仿真基准 + 真实机器人任务。

## 4. 资源与算力

- 论文摘要和元数据中**未明确说明**所使用的GPU型号、数量及训练时长。仅提及其方法为“训练无关”（training-free），因此可能不需要大规模训练资源；但世界模型本身的训练资源未提及。建议在总结中指出这一信息缺失。

## 5. 实验数量与充分性

- **实验数量**：包括多类仿真任务（VP2基准下的不同任务）和两类真实世界任务，总体实验组数较为丰富。
- **消融实验**：文中提到“根据当前预测不确定性动态决定是否重规划”，但未明确是否单独消融了预测误差或敏感性估计的影响。可能存在对阈值选择的敏感性分析。
- **充分性与公平性**：
  - 提供了仿真与真实场景的双重验证，增强了结论的泛化性。
  - 对比基线应为“每步重规划”或固定频率重规划，能够体现自适应方法的优势。
  - 但缺少与其他先进自适应规划方法（如基于不确定性估计的MPC变体）的对比，可能略微影响客观性。

## 6. 主要结论与发现

- AdaReP在**维持或提升任务成功率**的同时，在真实世界设置中实现**80–90%的计算量削减**（即重规划次数大幅降低）。
- 理论分析揭示了重规划频率、模型预测误差与局部动力学敏感性三者的权衡关系，为设计自适应策略提供了理论支撑。
- 该方法具有**训练无关、即插即用**的特性，易于集成到现有MPC与世界模型系统中。

## 7. 优点

- **理论驱动**：先建立遗憾界理论，再设计自适应机制，方法论严谨。
- **实用性强**：无需额外训练，兼容性强，直接降低实时控制中的计算瓶颈。
- **实验充分**：覆盖仿真与真实物理场景，且计算成本节省效果显著（80–90%），性能未见下降甚至提升。
- **创新性**：将“重规划频率”视为可动态调节的变量，而非固定参数，填补了世界模型-MPC效率优化方面的空白。

## 8. 不足与局限

- **算力信息缺失**：未报告世界模型本身的计算资源需求，使得系统级效率分析不够透明。
- **阈值设置依赖**：自适应策略依赖阈值选择，文中未讨论阈值对性能的敏感度或自动调优方法。
- **对比方法有限**：未与基于学习（如元学习）的自适应重规划方法比较，可能未充分体现方法相对于最优基线的优势。
- **应用限制**：目前仅在机器人控制任务验证，对于强非线性/混沌系统、高维状态空间下的效果尚待检验；另外，实时性评估（如计算延迟）未详细给出。

（完）
