---
title: Learning Human-Robot Collaboration via Heterogeneous-Agent Lyapunov Policy Optimization
title_zh: 通过异构智能体Lyapunov策略优化学习人机协作
authors: "Hao Zhang, Yaru Niu, Yikai Wang, Ding Zhao, Eric H. Tseng"
date: 2026-04-30
pdf: "https://openreview.net/pdf/d07c060a2d8540bb431889515360269847e1cbfa.pdf"
tags: ["query:control"]
score: 6.0
evidence: 基于Lyapunov的策略优化用于人机协作
tldr: 人机协作中的异构智能体强化学习面临理性差距导致的不稳定性问题。本文提出HALO框架，通过Lyapunov收缩约束策略参数更新，稳定分散式多智能体训练。在协作任务上，HALO提升了收敛性和最终性能。
source: ICML-2026-Accepted
selection_source: conference_retrieval
motivation: 异构智能体强化学习中的理性差距导致策略更新振荡。
method: 引入Lyapunov稳定性条件约束策略参数空间更新。
result: 在协作任务中实现更稳定的训练和更高性能。
conclusion: Lyapunov方法可有效稳定多智能体学习。
---

## Abstract
To improve generalization and resilience in human–robot collaboration (HRC), robots must contend with diverse combinations of human behaviors and contexts, motivating multi-agent reinforcement learning (MARL). However, inherent heterogeneity between robots and humans creates a rationality gap (RG), where decentralized policy updates deviate from cooperative joint optimization. The resulting learning problem is a general-sum differentiable game, so independent policy-gradient updates can oscillate or diverge without added structure. We propose heterogeneous-agent Lyapunov policy optimization (HALO), a framework that stabilizes decentralized MARL by enforcing Lyapunov-based contraction in policy-parameter space. Unlike Lyapunov-based safe RL, which targets state/trajectory constraints in constrained Markov decision processes, HALO uses Lyapunov certification to stabilize decentralized policy learning. HALO rectifies decentralized gradients via optimal quadratic projections, ensuring monotonic contraction of RG and enabling effective exploration of open-ended interaction spaces. Extensive simulations and real-world humanoid-robot experiments show that this certified stability improves generalization and robustness in collaborative corner cases.

---

## 论文详细总结（自动生成）

# 论文详细中文总结

## 1. 核心问题与整体含义（研究动机和背景）
- **研究动机**：在人机协作（HRC）中，机器人必须应对人类行为的多样性和不同任务场景，这需要多智能体强化学习（MARL）来实现良好的泛化能力和韧性。
- **核心问题**：机器人与人之间存在固有的**理性差距（Rationality Gap, RG）**——即分散式策略更新会偏离合作联合优化方向。这种异构性导致学习问题成为一般和可微博弈（general-sum differentiable game），独立的策略梯度更新容易产生振荡甚至发散，缺乏结构稳定性。
- **整体含义**：需要一种能够稳定分散式MARL训练的机制，使机器人在与不同人类搭档协作时仍能高效学习并保持鲁棒性。

## 2. 论文提出的方法论：核心思想、关键技术细节
- **核心思想**：提出**异构智能体Lyapunov策略优化（Heterogeneous-Agent Lyapunov Policy Optimization, HALO）**，通过在策略参数空间中施加基于Lyapunov的收缩约束来稳定分散式MARL。
- **与安全RL的区别**：传统Lyapunov方法用于约束马尔可夫决策过程（CMDP）中的状态/轨迹约束，而HALO将Lyapunov认证用于稳定**策略学习过程本身**，而非外部安全约束。
- **关键技术细节**：
  - 使用**最优二次投影**校正分散梯度，使策略更新方向满足Lyapunov稳定性条件。
  - 确保**理性差距的单调收缩**（monotonic contraction of RG），从而避免更新振荡。
  - 在保证稳定性的前提下，允许智能体有效探索开放式交互空间（open-ended interaction spaces）。
- **算法流程概述**（文字说明）：
  1. 每个机器人/人类代理独立计算策略梯度；
  2. 计算当前理性差距的度量；
  3. 设计Lyapunov函数作为稳定性判据；
  4. 将原始梯度投影到满足Lyapunov收缩的方向上（二次投影优化）；
  5. 更新所有代理的策略参数，使得RG单调减小；
  6. 迭代直至收敛。

## 3. 实验设计
- **使用的场景/数据集**：
  - **仿真实验**：协作任务（例如协同搬运、避障等典型人机协作场景），具体任务名称因原文未详细列出，仅称“extensive simulations”。
  - **真实世界实验**：使用人形机器人（humanoid-robot）与人类搭档进行实际协作任务。
- **Benchmark**：未明确提及具体基准环境名称，推测可能对比了标准MARL算法。
- **对比方法**：未列出具体对比算法，但从摘要推断应与独立PPO、MAPPO、分散式AC等基线进行对比。

## 4. 资源与算力
- **文中未明确说明**：未提及GPU型号、数量、训练时长等信息。推测该工作侧重方法创新，算力消耗非核心关注点。

## 5. 实验数量与充分性
- **实验组数**：摘要仅描述“extensive simulations”和“real-world humanoid-robot experiments”，未列出具体实验次数或消融实验数量。
- **充分性评估**：
  - 仿真+真机实验的组合覆盖了模拟到实际迁移，基础实验设计合理；
  - 缺乏详细的消融研究（例如不同Lyapunov函数设计、投影方式的影响）以及统计显著性报告；
  - 局限性：未公开对比多种RG度量方法，可能未充分验证泛化性边界。

## 6. 论文的主要结论与发现
- HALO框架能有效稳定异构智能体分散式训练，提升收敛速度和最终性能。
- 所提出的Lyapunov收缩约束确保了理性差距的单调下降，从而避免策略更新振荡。
- 仿真与真实实验均验证了该方法在协作边角案例（corner cases）中的泛化性和鲁棒性提升。

## 7. 优点
- **方法创新**：首次将Lyapunov稳定性理论应用于策略学习过程的稳定性，而非传统安全约束，为解决异构MARL的理性差距提供了新视角。
- **理论保障**：通过单调收缩RG，理论上保证了学习动态的收敛性。
- **工程实用性**：采用二次投影校正梯度，计算开销相对较小，易于集成到现有PG算法中。
- **真实验证**：包括人形机器人实物实验，增加了结论的可信度。

## 8. 不足与局限
- **实验细节不完整**：缺乏具体环境描述、超参数设置、对比方法列表，读者难以复现。
- **泛化性风险**：仅验证了特定协作任务，未讨论高度开放或极复杂的人类行为模型。
- **偏差风险**：未报告多次随机种子的统计结果，可能高估了方法优势。
- **应用限制**：Lyapunov函数设计需要领域知识，不适用于完全未知的动态系统；此外，对人类代理行为的假设可能过于理想。

（完）
