---
title: "SpatialVLA-Mamba: Efficient State-Space Models with Self-Refinement for Spatially-Grounded Robotic Control"
title_zh: SpatialVLA-Mamba：具有自精炼的高效状态空间模型用于空间接地机器人控制
authors: "Sifan Li, Hao Tang"
date: 2025-09-19
pdf: "https://openreview.net/pdf?id=sTn4EqE49A"
tags: ["query:vla"]
score: 9.0
evidence: 具有空间接地和自我精炼的视觉语言动作模型
tldr: 现有视觉语言动作模型在空间精度和长程稳定性上存在不足。SpatialVLA-Mamba提出空间感知编码器增强深度和几何信息，并采用Mamba状态空间模型作为高效解码器，同时引入自精炼机制应对分布偏移。实验表明该方法在多种操作任务中提升了厘米级精度和执行鲁棒性。该工作为VLA模型的实际部署提供了关键改进。
source: ICLR-2026-Public
selection_source: conference_retrieval
motivation: 现有VLA模型缺乏空间接地，长程执行效率低且对分布偏移脆弱。
method: 提出空间感知编码器融合深度与几何基元，Mamba解码器替代Transformer，并加入自精炼机制。
result: 在多项机器人操作任务中实现了更高的空间精度和更稳定的长程执行。
conclusion: SpatialVLA-Mamba通过空间接地和高效架构显著提升了VLA模型的实用性能。
---

## Abstract
Recent progress in vision-language-action (VLA) models has enabled robots to follow natural language instructions across diverse manipulation tasks. However, existing approaches struggle with three persistent challenges: limited spatial grounding, which hampers centimeter-level precision; inefficiency and instability in long-horizon execution due to transformer-based decoders; and brittleness under distribution shift, where minor visual or linguistic variations can cause failure. We present SpatialVLA-Mamba, a framework that addresses these challenges through three innovations. First, a spatial-aware encoder augments RGB features with depth and geometric primitives, providing explicit metric grounding. Second, a Mamba-based state-space decoder replaces transformers, offering linear-time complexity and stable long-sequence modeling for extended action horizons. Third, a Chain-of-Thought Reinforcement Learning (CoT-RL) loop introduces intrinsic self-refinement: the policy generates textual outcome summaries of candidate trajectories, evaluates them with CLIPScore against the goal instruction, and updates itself via PPO without reliance on external language models. Experiments in Webots show that SpatialVLA-Mamba reduces spatial error by over 35\% relative to strong baselines, improves unseen-task success to 67.3\%, and achieves higher robustness to sensor noise and linguistic paraphrasing, while requiring less GPU memory and runtime. These results highlight the importance of combining spatial grounding, efficient sequence modeling, and intrinsic reasoning for reliable embodied control, pointing toward embodied foundation models that are accurate, efficient, and self-correcting.

---

## 论文详细总结（自动生成）

# 论文总结：SpatialVLA-Mamba

## 1. 核心问题与整体含义（研究动机和背景）
- **问题背景**：视觉-语言-动作（VLA）模型在机器人操控任务中已能遵循自然语言指令，但存在三大顽疾：(a) 空间接地不足，无法实现厘米级精度；(b) 基于Transformer的解码器在长程执行中效率低且不稳定；(c) 对分布偏移（视觉或语言微小变化）脆弱，易导致失败。
- **整体含义**：该工作旨在同时解决空间精度、长程稳定性和鲁棒性三个关键挑战，为VLA模型的实际物理部署提供高效、可靠、可自校正的框架。

## 2. 论文提出的方法论
- **核心思想**：通过三项创新组合——空间感知编码器、高效状态空间解码器、内在自精炼机制——构建一个既能精准理解空间几何、又能稳定执行长序列、且能自我修正的VLA模型。
- **关键技术细节**：
  - **空间感知编码器**：在标准RGB特征基础上融合深度信息与几何基元（如法向量、点云特征），提供明确的度量空间接地。
  - **Mamba状态空间解码器**：采用Mamba（一种状态空间模型）替代Transformer，具有线性时间复杂度，能稳定建模长序列，适用于扩展动作视界。
  - **链式思维强化学习（CoT-RL）自精炼机制**：策略生成候选轨迹后，首先通过CoT方式写出文本结果摘要，然后使用CLIPScore与目标指令进行对比评估，最后利用PPO算法更新策略，整个过程无需外部语言模型。
- **算法流程（文字说明）**：
  1. 输入：RGB图像 + 深度图 + 几何基元 + 自然语言指令。
  2. 空间感知编码器提取空间增强的特征。
  3. Mamba解码器以线性时间生成动作序列。
  4. 基于CoT-RL循环：生成轨迹 → 生成文本结果摘要 → CLIPScore评估 → PPO更新策略。
  5. 输出：精确且稳定的机器人动作指令序列。

## 3. 实验设计
- **使用场景与Benchmark**：实验在Webots仿真环境中进行，覆盖多种机器人操控任务。具体任务集未详细列出，但提及了“未见任务”（unseen-task）的成功率测量。
- **对比方法**：与“强基线”方法对比（如标准VLA模型），文中明确报告空间误差降低超过35%，表明对比了若干基线（可能包括基于Transformer的VLA模型）。
- **评估指标**：空间误差（厘米级精度）、未见任务成功率、对传感器噪声和语言改写的鲁棒性、GPU内存和运行时效率。

## 4. 资源与算力
- **文中说明**：未明确提及使用的GPU型号、数量或训练时长。仅提到所需GPU内存和运行时比基线更低，但具体数值未列出。
- **结论**：算力细节未被报告，因此无法评估训练成本的可复现性。

## 5. 实验数量与充分性
- **实验数量**：从摘要看，至少包含三类实验：(a) 空间误差对比（与基线）；(b) 未见任务成功率；(c) 鲁棒性测试（传感器噪声、语言改写）。未明确报告消融实验的次数，但“自精炼”机制应是消融的一部分（需对比有无CoT-RL）。
- **充分性判断**：实验覆盖了核心指标的定量比较，但缺乏对每个创新模块的独立消融（可能全文中有，但摘要未提）。此外，仅使用Webots单一仿真环境，未见真实机器人实验，泛化性证据有限。总体而言，实验设计基本合理，但场景覆盖度和消融深度可能不够充分。

## 6. 论文主要结论与发现
- **量化成果**：空间误差降低超过35%；未见任务成功率达到67.3%；对传感器噪声和语言改写具有更高鲁棒性；所需GPU内存和运行时间更少。
- **定性结论**：空间接地、高效序列建模和内在推理的结合对于可靠具身控制至关重要，为构建准确、高效、能自校正的具身基础模型指明了方向。

## 7. 优点
- **方法创新**：将Mamba状态空间模型引入VLA解码器，解决了Transformer在长程动作序列上的效率与稳定性问题。
- **空间接地明确**：通过显式融合深度和几何基元，而非隐式学习，提升了物理精度。
- **自精炼无外部依赖**：CoT-RL机制使得模型可以自主评估和改进，无需依赖外部语言模型，降低了部署复杂度。
- **效率提升**：线性复杂度和更低资源消耗，有利于实际机器人实时控制。

## 8. 不足与局限
- **实验覆盖不足**：只在Webots仿真环境验证，未在真实机器人上测试，结果可能受仿真与真实差距（Sim-to-Real gap）影响。
- **消融实验不透明**：摘要未给出每个模块的独立贡献分析（如去掉空间感知编码器、去掉CoT-RL的对比），论文全文可能包含，但这里无法确认。
- **数据集与任务细节缺失**：未说明具体任务种类、数量、难度分层，Benchmark可复现性存疑。
- **算力未报告**：缺乏训练成本和环境设置说明，对后续研究者复现造成困难。
- **鲁棒性测试范围有限**：仅提及传感器噪声和语言改写，未涉及光照变化、背景杂乱、物体类别变化等更多实际分布偏移。
- **潜在偏差风险**：可能仅在特定仿真环境、特定机器人构型上调优，结果泛化到其他平台（如不同机械臂、抓爪）需进一步验证。

（完）
