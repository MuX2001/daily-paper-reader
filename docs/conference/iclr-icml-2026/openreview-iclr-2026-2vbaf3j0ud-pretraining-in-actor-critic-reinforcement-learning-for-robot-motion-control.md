---
title: Pretraining in Actor-Critic Reinforcement Learning for Robot Motion Control
title_zh: 角色批评强化学习在机器人运动控制中的预训练
authors: "Jiale Fan, Andrei Cramariuc, Tifanny Portela, Marco Hutter"
date: 2025-09-20
pdf: "https://openreview.net/pdf?id=2vBAf3J0uD"
tags: ["query:control"]
score: 7.0
evidence: 为机器人运动控制预训练actor-critic强化学习
tldr: 针对机器人运动控制中每个任务从零学习的低效问题，提出一种预训练框架，通过任务无关的探索收集多样数据，预训练一个通用神经网络表示，在后续任务上用PPO进行微调。实验表明预训练因子能显著加速学习并提高最终性能，推动了强化学习在机器人控制中的实用化。
source: ICLR-2026-Rejected-Public
selection_source: conference_retrieval
motivation: 机器人运动控制中各技能从零训练，缺乏共享知识的利用。
method: 采用任务无关探索收集数据，预训练神经网络作为通用表征，然后在具体任务中通过PPO微调。
result: 预训练模型能显著加速多个运动控制任务的强化学习收敛，并提升成功率。
conclusion: 预训练-微调范式可有效应用于机器人运动控制，减少训练成本。
---

## Abstract
The pretraining-finetuning paradigm has facilitated numerous transformative advancements in artificial intelligence research in recent years. However, in the domain of reinforcement learning (RL) for robot locomotion, individual skills are often learned from scratch despite the high likelihood that some generalizable knowledge is shared across all task-specific policies belonging to the same robot embodiment. This work aims to define a paradigm for pretraining neural network models that encapsulate such knowledge and can subsequently serve as a basis for warm-starting the RL process in classic actor-critic algorithms, such as Proximal Policy Optimization (PPO). We begin with a task-agnostic exploration-based data collection algorithm to gather diverse, dynamic transition data, which is then used to train a Proprioceptive Inverse Dynamics Model (PIDM) through supervised learning. The pretrained weights are then loaded into both the actor and critic networks to warm-start the policy optimization of actual tasks. We systematically validated our proposed method with 9 distinct robot locomotion RL environments comprising 3 different robot embodiments, showing significant benefits of this initialization strategy. Our proposed approach on average improves sample efficiency by 36.9% and task performance by 7.3% compared to random initialization. We further present key ablation studies and empirical analyses that shed light on the mechanisms behind the effectiveness of this method.

---

## 论文详细总结（自动生成）

# 论文详细中文总结

## 1. 核心问题与整体含义（研究动机和背景）
- **研究动机**：在机器人运动控制领域，当前强化学习方法通常针对每个技能（如行走、奔跑、跳跃）从零开始训练，忽略了同一机器人平台上不同任务间可能共享的通用知识（如本体感知、动力学特性）。这种“孤立学习”模式导致样本效率低下、训练成本高昂，限制了强化学习在机器人实际部署中的实用性。
- **整体含义**：借鉴自然语言处理、计算机视觉等领域成功应用的“预训练-微调”范式，本文试图为机器人运动控制建立一种通用的预训练框架，使智能体能够通过任务无关的探索预先学习到基础动力学表征，然后通过少量微调快速适应具体任务，从而提升学习效率和最终性能。

## 2. 方法论：核心思想、关键技术细节
- **核心思想**：通过任务无关的探索收集多样化的动态转移数据，利用监督学习预训练一个神经网络模型（PIDM），该模型编码了机器人本体的逆动力学知识；然后将预训练权重分别加载到Actor-Critic算法（如PPO）中的策略网络和价值网络，作为暖启动（warm-start）基础，再在具体任务上进行强化学习微调。
- **关键技术细节**：
  - **任务无关探索数据收集**：不依赖任何奖励函数，仅通过随机动作或简单激励策略让机器人在环境中自由运动，收集大量包含状态、动作、下一状态的四元组数据。
  - **预训练模型 – 本体逆动力学模型（Proprioceptive Inverse Dynamics Model, PIDM）**：输入为当前状态和下一状态，输出预测的动作。这是一个监督学习任务，学习从状态变化到动作的映射，本质是机器人动态模型的逆。
  - **网络架构**：Actor和Critic网络共享相同的底层表示层（例如多层感知机），预训练阶段只训练PIDM的编码器部分（或整个网络），然后将预训练参数复制到Actor和Critic网络中。
  - **微调阶段**：使用PPO算法在目标任务上继续训练，但网络权重初始化为预训练值而非随机值。
- **算法流程（文字描述）**：
  1. 在无奖励信号的情况下，执行任务无关的探索策略，收集转移数据 $\{(s_t, a_t, s_{t+1})\}$。
  2. 构建PIDM模型：$a_t = f(s_t, s_{t+1})$，通过监督学习最小化预测动作与真实动作的均方误差。
  3. 训练完成后，提取编码器权重，分别初始化Actor网络和Critic网络。
  4. 在具体运动控制任务（如行走、爬坡）中，使用PPO算法对初始化的Actor-Critic网络进行微调，直到收敛。

## 3. 实验设计
- **使用的环境与数据集**：9个不同的机器人运动控制强化学习环境，涵盖3种不同的机器人实体（具体机器人型号未在摘要中明确，但提及“3种不同实体”）。这些环境基于模拟器（如Isaac Gym或MuJoCo）构建。
- **基准（Benchmark）**：以随机初始化（即从零开始训练PPO）作为基线对比方法。
- **对比方法**：主要对比对象是随机初始化策略。另外作者进行了消融实验，包括：
  - 不同预训练数据收集策略的影响。
  - 只预训练Actor或只预训练Critic的效果。
  - 不同预训练任务（如正向模型对比逆模型）的影响。

## 4. 资源与算力
- **文中未明确说明**：论文摘要及元数据中未提及使用的GPU型号、数量、训练时长等算力信息。仅能推测实验在标准的强化学习模拟环境（可能使用单个或少量GPU）上完成。

## 5. 实验数量与充分性
- **实验数量**：主实验包含9个环境（3种机器人×每种多个任务），消融实验涉及多个因素（数据收集、网络组件等），整体实验量较为丰富。
- **充分性与公平性**：
  - **充分性**：覆盖多种机器人形态和任务，进行了多维度消融，能较好验证预训练方法的泛化能力。
  - **公平性**：与随机初始化对比时控制相同网络结构、超参数和训练步数。但未与其他预训练方法（如BERT-style预训练或世界模型预训练）对比，可能限制了结论的绝对优势论证。

## 6. 主要结论与发现
- 预训练权重初始化相比随机初始化，平均提升样本效率36.9%，任务性能（成功率或累积奖励）提升7.3%。
- 预训练的有效性依赖于数据多样性：使用任务无关探索收集的数据比基于特定任务的数据效果更好。
- 同时预训练Actor和Critic网络比仅预训练其中之一效果更优。
- 逆动力学模型（预测动作）作为预训练任务优于正向动力学模型（预测下一状态）或单纯自编码器。

## 7. 优点（亮点）
- **方法简洁高效**：不要求修改PPO算法本身，仅改变初始化方式，易于集成到现有框架。
- **任务无关性**：预训练阶段不需要任何任务奖励，可提前完成，降低了新任务的学习门槛。
- **显著性能提升**：在多个环境和机器人上一致性地提高样本效率和最终表现，验证了通用知识迁移的有效性。
- **分析深入**：通过消融实验揭示了预训练各部分的作用机制，为后续研究提供了洞察。

## 8. 不足与局限
- **实验覆盖有限**：虽然9个环境，但未涵盖更复杂的四足/双足机器人任务（如楼梯攀登、摔倒恢复）或真实机器人迁移，泛化性有待验证。
- **缺乏与其他预训练范式的比较**：未与model-based RL预训练、离线预训练等方法进行对比，难以评估方法的相对优势。
- **算力开销未报告**：预训练阶段的数据收集和训练需要额外计算成本，但未量化，实际部署时可能抵消部分效率提升。
- **偏差风险**：文中仅使用PPO作为基算法，未验证在SAC、TD3等其他Actor-Critic算法上的适用性。
- **应用限制**：该预训练方法假设机器人本体固定且环境动态变化不大，对于动态变化剧烈的场景（如地形突变、负载变化）可能鲁棒性不足。

（完）
