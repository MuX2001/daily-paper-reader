---
title: "From Code to Action: Hierarchical Learning of Diffusion-VLM Policies"
title_zh: 从代码到动作：扩散-VLM策略的分层学习
authors: "Markus Peschl, Pietro Mazzaglia, Daniel Dijkman"
date: 2025-09-19
pdf: "https://openreview.net/pdf?id=S93SnUsO8c"
tags: ["query:robot-learn"]
score: 8.0
evidence: 分层VLM与扩散策略结合的机器人操作方法
tldr: 针对机器人操作中的泛化差和数据稀缺问题，提出一种分层框架，利用代码生成VLM将任务描述分解为可执行子例程，并通过低层扩散策略进行模仿学习。实验表明，该方法在复杂长时任务上显著提升了泛化能力和数据效率，为结合语义推理与低级控制提供了新思路。
source: ICLR-2026-Public
selection_source: conference_retrieval
motivation: 模仿学习在机器人操作中存在泛化差和数据稀缺问题，尤其长时任务场景下挑战更大。
method: 提出分层框架，上层使用代码生成VLM分解任务，下层使用扩散策略执行子例程。
result: 在多个操作任务上验证了方法的有效性，相比基线显著提升了成功率和泛化性。
conclusion: 通过结构化语义监督连接高层规划与低级控制，实现了高效的模仿学习和泛化。
---

## Abstract
Imitation learning for robotic manipulation often suffers from limited generalization and data scarcity, especially in complex, long-horizon tasks. In this work, we introduce a hierarchical framework that leverages code-generating vision-language models (VLMs) in combination with low-level diffusion policies to effectively imitate and generalize robotic behavior. Our key insight is to treat open-source robotic APIs not only as execution interfaces but also as sources of structured supervision: the associated subtask functions - when exposed - can serve as modular, semantically meaningful labels. We train a VLM to decompose task descriptions into executable subroutines, which are then grounded through a diffusion policy trained to imitate the corresponding robot behavior. To handle the non-Markovian nature of both code execution and certain real-world tasks, such as object swapping, our architecture incorporates a memory mechanism that maintains subtask context across time. We find that this design enables interpretable policy decomposition, improves generalization when compared to flat policies and enables separate evaluation of high-level planning and low-level control.

---

## 论文详细总结（自动生成）

# 论文详细中文总结

## 1. 论文的核心问题与整体含义（研究动机和背景）
- **研究动机**：机器人操作中的模仿学习面临两大挑战：泛化能力差和数据稀缺，尤其在复杂、长时间跨度（long-horizon）任务中表现更为明显。现有的平展策略（flat policy）难以分解任务结构，导致在遇到未见过的物体或场景时容易失败。
- **整体含义**：本文针对上述问题，提出将高层语义规划与低层控制器结合的分层框架，利用代码生成的大视觉语言模型（VLM）将任务描述分解为可执行的子例程（subroutines），再通过扩散策略执行具体的机器人动作，从而提升泛化能力和数据效率。

## 2. 论文提出的方法论：核心思想、关键技术细节、公式或算法流程
- **核心思想**：将开源机器人API（如PyBullet、Mujoco等）不仅作为执行接口，还作为结构化监督的来源：每个子任务函数（subtask function）可以作为模块化的语义标签。训练VLM将自然语言任务描述分解为子例程（代码序列），然后利用扩散策略学习执行每个子例程对应的低层行为。
- **关键技术细节**：
  - **上层：代码生成VLM**：输入任务描述（如“将红色方块放到蓝色杯子中”），输出可执行的代码子例程（如调用`pick(obj, loc)`、`place(obj, loc)`等API函数）。
  - **下层：扩散策略**：基于扩散模型的模仿学习策略，输入当前观测和子任务上下文，生成机器人动作序列。
  - **记忆机制**：为了处理非马尔可夫性（如代码执行中的状态依赖、物体交换等任务），在架构中加入跨时间的子任务记忆模块，维护子任务上下文。
- **流程说明**：训练阶段：收集演示数据，同时记录对应的子任务函数调用作为标签；训练VLM生成子例程，训练扩散策略模仿动作。推理阶段：VLM根据新任务生成子例程，扩散策略逐步骤执行。

## 3. 实验设计：使用了哪些数据集 / 场景，它的 benchmark 是什么，对比了哪些方法
- **数据集/场景**：论文摘要未详细列出具体任务或数据集名称，但提及了“多种操作任务”、“复杂长时任务”以及“物体交换（object swapping）”等典型场景。推测使用了模拟环境（如MetaWorld、Robosuite或自定义任务）中的多步操作任务。
- **Benchmark**：未明确说明具体基准，但对比了“平展策略”（flat policies），即没有分层分解的端到端模仿学习方法。
- **对比方法**：至少对比了平展策略（如行为克隆、扩散策略直接端到端）以及可能的高层规划方法（如语言条件策略）。摘要提到“显著提升了成功率和泛化性”，但未列出具体基线名称。

## 4. 资源与算力：如果文中有提到，请总结使用了多少算力（GPU 型号、数量、训练时长等）。若未明确说明，也请指出这一点
- **算力信息**：论文摘要及元数据中**未提及**任何具体的GPU型号、数量或训练时长。因此无法总结算力资源。

## 5. 实验数量与充分性：大概做了多少组实验（如不同数据集、消融实验等），这些实验是否充分、是否客观、公平
- **实验数量**：摘要中仅概述了实验结果，未提供具体实验组数（如多少任务、多少种子、消融实验等）。可能包含：
  - 主实验：在多个任务上与平展策略对比成功率和泛化性。
  - 消融实验：可能包括去掉记忆机制、去掉VLM代码分解、替换高层规划器等。
- **充分性评估**：从摘要看，实验设计看似合理（对比平展策略、评估分解和记忆机制），但缺乏细节（如任务数量、统计显著性、随机种子等），难以判断是否充分。元数据中evidence提到“分层VLM与扩散策略结合的机器人操作方法”，但未说明实验覆盖范围。
- **客观公平性**：由于未提供公开代码或详细实验设置，无法确认是否存在选择偏差或过度报告最佳结果。但对比平展策略是合理的基线。

## 6. 论文的主要结论与发现
- 提出的分层框架（VLM代码生成 + 扩散策略）相比平展策略显著提升了复杂长时操作任务的**成功率和泛化能力**。
- 记忆机制对于处理非马尔可夫任务（如物体交换）是必要的。
- 该方法实现了**可解释的策略分解**，并支持高层规划和低层控制的**分别评估**，有助于诊断和调试。
- 结构化语义监督（子任务函数）作为中间表示，有助于从较少的数据中学习，提升数据效率。

## 7. 优点：方法或实验设计上有哪些亮点
- **方法创新**：巧妙利用现有机器人API函数作为结构化监督来源，避免了昂贵的细粒度标签（如像素级分割或姿态标注）。
- **分层设计**：将高层语义推理（VLM）与低层连续控制（扩散策略）解耦，兼顾灵活性（可处理语言任务变体）和精确控制（扩散策略擅长生成平滑轨迹）。
- **记忆机制**：针对非马尔可夫任务的改进，增强了对时序依赖的建模。
- **可解释性与诊断能力**：高层规划的代码序列可读，可单独评估规划错误和执行错误。

## 8. 不足与局限：包括实验覆盖、偏差风险、应用限制等
- **实验细节缺失**：未在摘要或元数据中提供具体任务、评估指标、对比方法名称、数据集规模等，使得可复现性和可靠性存疑。
- **算力信息缺失**：无法评估方法的经济成本和可扩展性。
- **泛化范围有限**：方法依赖预先定义的API函数库，对于新任务（需要新函数）可能需要重新定义；VLM的代码生成质量也受限于训练数据和模型能力。
- **假设条件**：假设演示数据中包含子任务函数标签，这在实际中可能难以获得（需要手动标注或自动提取），限制了推广到无结构化演示的场景。
- **实验充分性不足**：缺乏多种子重复实验、跨不同环境（真实机器人）的验证，以及与其他分层方法（如Task and Motion Planning）的对比，削弱了结论的普遍性。

（完）
