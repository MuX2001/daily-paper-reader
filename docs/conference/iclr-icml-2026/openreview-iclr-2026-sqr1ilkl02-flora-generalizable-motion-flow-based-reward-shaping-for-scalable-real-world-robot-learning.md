---
title: "FLORA: Generalizable Motion-Flow-Based Reward Shaping for Scalable Real-World Robot Learning"
title_zh: FLORA：基于通用运动流奖励塑形的可扩展真实世界机器人学习
authors: "Tengye Xu, Yangting Sun, Ziju Shen, Hua Chen, Jia Pan"
date: 2025-09-20
pdf: "https://openreview.net/pdf?id=sQr1ILkL02"
tags: ["query:robot-learn"]
score: 8.0
evidence: 用于真实世界机器人强化学习的奖励塑形
tldr: 该论文针对真实世界机器人强化学习中奖励设计难题，现有稀疏奖励效率低、视觉奖励模型泛化差且缺乏理论保证，提出FLORA框架，利用光流和语言驱动离线的奖励塑形，同时具有最优策略的理论保证。FLORA通过预训练的光流模型和新颖的泛化机制，能够在未见任务上提供有效奖励信号。实验表明FLORA在真实机器人操作任务上显著提升学习效率且具有强泛化能力。该工作为可扩展的真实世界机器人学习提供了理论扎实的奖励塑形方案。
source: ICLR-2026-Public
selection_source: conference_retrieval
motivation: 真实世界RL中奖励设计困难，现有方法效率低或泛化差。
method: 提出FLORA框架，结合光流与语言离线生成奖励，并保证最优策略。
result: 在真实机器人操作任务上提升学习效率，且泛化到新任务。
conclusion: 理论保证的奖励塑形方法能有效推进真实世界机器人强化学习。
---

## Abstract
Rewards design is a long-standing challenge in Reinforcement Learning (RL) for robotics, particularly when scaling to real-world robot learning tasks. Generally speaking, existing reward design approaches in real-world RL rely either on sparse rewards, which provide little feedback and commonly lead to inefficient learning, or on pre-trained vision-based reward models, which typically lack theoretical guarantees and often fail in generalizing to new tasks. To address these challenges, we introduce  $\textbf{F}$low-based $\textbf{L}$anguage-driven $\textbf{O}$ffline $\textbf{R}$eward $\textbf{A}$daptation ($\textbf{FLORA}$), a framework that combines strong generalization capability with a theoretical guarantee of optimal policy invariance. FLORA adopts large language models (LLMs) to automatically generate analytical reward functions for new tasks, leveraging their inherent generalization ability across diverse tasks. Unlike end-to-end neural reward models, these analytical reward functions encode task-relevant priors, enabling efficient few-shot adaptation. With only $\textbf{3–5}$ demonstrations, our proposed offline reward improvement procedure optimizes both the structure and parameters of the rewards, producing reliable signals for new tasks. To enable direct operation from raw visual inputs and eliminate the reliance on privileged states, we extract flows from images as inputs to the analytical reward functions. Furthermore, we propose a PBRS-Milestone rewards shaping structure to reformulate rewards signals, which improves practicality while preserving optimal policy invariance guarantee. Extensive experiments show that FLORA enables sample-efficient RL on new tasks, outperforming strong baselines by more than $\textbf{2×}$ in simulation, and solving complex real-world manipulation tasks in $\textbf{$\sim$20 minutes}$, where existing baselines fail even after $\textbf{60}$ minutes training. These results establish our method as a critical step towards scalable real-world robot learning.

---

## 论文详细总结（自动生成）

# 论文详细中文总结

## 1. 论文的核心问题与整体含义（研究动机和背景）

在真实世界机器人强化学习（RL）中，奖励函数设计长期面临挑战。现有方法主要分为两类：一是稀疏奖励，反馈极少导致学习效率低下；二是基于预训练视觉模型的奖励函数，泛化能力差且缺乏理论保证。论文提出 **FLORA**（Flow-based Language-driven Offline Reward Adaptation）框架，通过结合光流和语言模型离线生成奖励信号，同时提供最优策略不变性的理论保证，旨在推动真实世界机器人学习的可扩展性。

## 2. 论文提出的方法论：核心思想、关键技术细节

### 核心思想
利用大语言模型（LLM）自动为新任务生成解析形式的奖励函数，借助 LLM 的跨任务泛化能力；以光流作为解析奖励的输入，避免依赖特权状态；通过离线奖励改进过程（仅需 3–5 次演示）优化奖励的结构和参数，产生可靠信号；并设计 **PBRS-Milestone** 奖励塑形结构，在保证最优策略不变性的前提下提升实用性。

### 关键技术细节
- **光流提取**：从原始视觉输入中提取光流，作为解析奖励函数的输入，消除对特权状态的依赖。
- **LLM 生成解析奖励**：对未见任务，利用 LLM 自动生成包含任务相关先验的解析奖励函数。
- **离线奖励改进**：仅用 3–5 次演示，通过优化算法同时调整奖励函数的结构和参数，产生高质量奖励信号。
- **PBRS-Milestone 塑形结构**：基于势函数的奖励塑形方法，将奖励重新表述为里程碑式结构，在保持最优策略不变性理论保证的同时提高实用性。

### 公式或算法流程（文字说明）
1. 对于新任务，使用 LLM 自动生成初始解析奖励函数（输入为光流特征）。
2. 收集 3–5 条演示轨迹，提取光流。
3. 离线优化步骤：基于演示数据，对奖励函数的结构（如里程碑设置）和参数进行迭代调整，使生成的奖励信号与任务目标对齐。
4. 将优化后的奖励函数整合到 RL 训练管道中，用于策略学习。
5. 整个过程中，PBRS-Milestone 机制确保任何基于该奖励学习的策略与原始任务的最优策略等价（最优策略不变性）。

## 3. 实验设计：数据集/场景、benchmark、对比方法

- **场景**：模拟环境和真实世界机器人操作任务。未明确指定具体任务名称（如抓取、放置等），但摘要提及“复杂真实世界操作任务”。
- **Benchmark**：未提及公开标准 benchmark，但包含与强基线的对比。
- **对比方法**：称为“强基线”，推测包括稀疏奖励、预训练视觉奖励模型等常见奖励设计方法。
- **核心指标**：样本效率（模拟中提升 2× 以上），真实任务中训练时间（FLORA 约 20 分钟解决，基线 60 分钟仍失败）。

## 4. 资源与算力

文中**未明确说明**所使用的 GPU 型号、数量或训练时长等算力资源。仅在真实实验中提到训练时间（约 20 分钟或 60 分钟），但未给出具体硬件信息。因此无法评估算力成本。

## 5. 实验数量与充分性

- **实验数量**：从摘要看，包含模拟实验和真实世界实验，并对比了多个基线。但缺乏具体实验次数、任务种类数、消融实验组数等细节。
- **充分性**：虽然未见详细消融研究，但提供了跨场景（模拟+真实）的验证，且真实任务中基线完全失败而 FLORA 成功，表明方法有效性。但未报告统计显著性或多轮重复结果，可能导致对泛化能力的判断不够全面。
- **客观公平性**：对比方法选为“强基线”，但未明确指出基线名称，可能存在选择偏差。不过真实世界结果差异较大（成功 vs. 失败）增强了说服力。

## 6. 论文的主要结论与发现

- FLORA 能够显著提升新任务上的样本效率，在模拟中性能超过强基线 2 倍以上。
- 在真实世界操作任务中，FLORA 仅需约 20 分钟即可解决复杂任务，而现有基线在 60 分钟训练后仍失败。
- 提出的 PBRS-Milestone 结构在保证最优策略不变性的前提下提高了奖励的可实用性。
- LLM 结合光流的离线奖励塑形方法具有良好的泛化能力，为可扩展的真实世界机器人学习提供了理论扎实的解决方案。

## 7. 优点

- **理论保证**：具备最优策略不变性，优于无理论保证的端到端视觉奖励模型。
- **强泛化能力**：LLM 的跨任务先验和光流输入的域无关性使方法能快速适应新任务。
- **数据高效**：仅需 3–5 次演示即可优化奖励，降低了对大规模人类示教的需求。
- **实用性强**：直接从原始视觉输入操作，无需额外传感器或特权状态。
- **真实世界验证**：在真实机器人上成功解决复杂任务，证明了方法的实际可行性。

## 8. 不足与局限

- **算力资源不透明**：未报告计算开销，无法比较与其他方法的效率。
- **实验细节缺失**：未提供完整的任务列表、数据集、消融实验和统计结果，可能影响可重复性。
- **依赖光流质量**：光流提取可能受纹理、光照、遮挡等因素影响，在极端条件下可能失效。
- **LLM 生成局限性**：自动生成的解析奖励函数可能包含错误或低效的假设，需要离线校正（但校正依赖少量演示，可能仍存在偏差）。
- **应用限制**：仅适用于可提取光流的任务（如操作场景），对纯接触、软体机器人等场景可能不适用。
- **泛化边界未测试**：未评估到完全不同的任务领域（如导航、移动操作）的泛化能力。

（完）
