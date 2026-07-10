---
title: Stable Planning through Aligned Representations in Model-Based Reinforcement Learning
title_zh: 基于模型的强化学习中通过对齐表示实现稳定规划
authors: "Misagh Soltani, Forest Agostinelli"
date: 2025-09-16
pdf: "https://openreview.net/pdf?id=wdBqDf3BZs"
tags: ["query:world-model"]
score: 8.0
evidence: 基于离散世界模型和启发式函数的规划方法
tldr: 针对离散世界模型在规划时对状态变换（如噪声）缺乏不变性导致失败的问题，提出通过对齐表示来增强世界模型和启发式函数的鲁棒性，从而无需重新训练即可处理变换后的状态。实验表明该方法在稀疏奖励长时域任务中显著提升了规划成功率。
source: ICLR-2026-Public
selection_source: conference_retrieval
motivation: 离散世界模型在规划时对噪声等状态变换敏感，需重新训练。
method: 训练世界模型时引入表示对齐机制，使模型对状态变换不变，同时保持规划能力。
result: 在稀疏奖励长时域任务中，规划成功率大幅提升，且无需重新训练。
conclusion: 表示对齐是实现稳定世界模型规划的关键技术。
---

## Abstract
Integrating planning with reinforcement learning (RL) significantly improves problem-solving capabilities for sequential decision-making problems, particularly in sparse-reward, long-horizon tasks. Recently, it has been shown that discrete world models can be trained such that no model degradation occurs over thousands of time steps and states can be re-identified during planning. As a result, a heuristic function can be trained with data generated from the world model, and the learned world model and heuristic function can be used with planning to solve problems. However, this approach fails to solve problems with state transformations to which the world model and heuristic function should be invariant (i.e., noise), without re-training the world model and heuristic function. In this work, we introduce Stable Planning through Aligned Representations (SPAR), an efficient framework that trains a discrete world model and heuristic function in a clean Markov decision process (MDP) and trains an alignment network to map transformed states to their discrete latent state in the clean MDP. When solving problems, we exploit the underlying discrete latent representation and round the output of the alignment network in hopes that it matches the clean latent state exactly. As a result, adapting to transformations only requires training the adaptation network while the world model and heuristic function remain fixed. We then demonstrate its effectiveness on Rubik's Cube domain, and compare it with applying a similar approach to a world model with continuous latent representations. SPAR successfully solves over 90% of problems with 17 different visual transformations and real-world images. This adaptation process requires no additional world model or heuristic function re-training, and reduces re-training time by at least 95%.

---

## 论文详细总结（自动生成）

# 论文详细中文总结

## 1. 核心问题与整体含义（研究动机和背景）
- **核心问题**：在基于模型的强化学习中，离散世界模型（discrete world model）被用于规划，但这类模型对状态变换（如噪声、光照变化、视角变化等）缺乏不变性。当测试时遇到经过变换的状态（如添加噪声的输入），世界模型和基于它的启发式函数（heuristic function）会失效，必须重新训练。
- **研究动机**：现实场景中，状态变换广泛存在（例如机器人感知中的视觉扰动），而重新训练世界模型成本高昂。作者希望在不重新训练世界模型和启发式函数的前提下，使规划系统能够适应各种状态变换，实现稳定规划。
- **整体含义**：提出一种高效的框架 SPAR（Stable Planning through Aligned Representations），通过训练对齐网络（alignment network）将变换后的状态映射到干净的离散潜在表示，从而保持世界模型和启发式函数的规划能力，显著提升鲁棒性和适应性。

## 2. 方法论
- **核心思想**：在干净的马尔可夫决策过程（MDP）中训练离散世界模型和启发式函数，然后额外训练一个对齐网络，将经过变换（如噪声）的状态映射回干净MDP的离散潜在状态。规划时，利用对齐网络的输出经取整（rounding）操作，使其精确匹配干净潜在状态，从而直接利用已有的世界模型和启发式函数进行规划。
- **关键技术细节**：
  - **离散世界模型**：使用类似 DreamerV2 等离散潜在变量模型，在干净的MDP（如原始魔方环境）中训练，能够长期稳定地预测状态并支持重识别（re-identification）。
  - **启发式函数**：基于世界模型生成的数据训练，用于引导规划（如 MCTS）。
  - **对齐网络**：一个编码器，输入变换后的状态（如加噪声的像素图像），输出一个连续向量，再通过取整（rounding）操作离散化为最近的离散潜码。训练目标是最小化对齐网络输出的离散潜码与干净MDP中对应状态的真实离散潜码之间的差异（例如交叉熵损失）。
  - **流程**：训练阶段分为三步：① 在干净MDP上训练离散世界模型和启发式函数；② 固定它们，训练对齐网络；③ 测试时，将对齐网络应用于变换后的状态，取整后输入世界模型和规划器。
- **公式/算法说明**：无显式公式，但本质是学习一个映射函数 \( f_{\theta}(s') \rightarrow z_{\text{clean}} \)，其中 \( s' \) 是变换后的状态，\( z_{\text{clean}} \) 是干净MDP的离散潜码，损失为 \( \mathcal{L} = -\log p(z_{\text{clean}} | f_{\theta}(s')) \)。

## 3. 实验设计
- **数据集/场景**：使用 **Rubik's Cube（魔方）** 作为测试域，这是一个经典的稀疏奖励、长时域任务。作者模拟了 17 种不同的视觉变换（包括噪声、颜色变化、遮挡、旋转、模糊等），以及使用真实世界的魔方图像（通过摄像头拍摄）。
- **Benchmark**：基准方法是直接在变换后的状态上使用原始世界模型和启发式函数进行规划（即不做适应），以及使用连续潜在表示的对齐方法（类似 SimCLR-like 的对比学习）进行对比。
- **对比方法**：SPAR（离散对齐） vs. 无对齐（baseline） vs. 连续对齐（continuous alignment）。此外，还对比了从零开始重新训练世界模型所需的时间。
- **评价指标**：规划成功率（solve rate），即能在给定步数内还原魔方的比例。

## 4. 资源与算力
- **未明确说明**：论文中未提及具体的 GPU 型号、数量、训练时长等信息。仅提到 SPAR 的适应过程（仅训练对齐网络）相比重新训练世界模型减少了 **至少 95%** 的再训练时间。这说明算力需求很低，但具体数值缺失。

## 5. 实验数量与充分性
- **实验组数**：在 17 种不同类型的视觉变换下测试，每次变换下各运行多次规划实验（具体次数未明确），且包含真实世界图像测试。此外，还对比了连续潜在表示的方法，以及无适应的基线。
- **消融实验**：未明确列出独立的消融实验，但通过对比离散 vs. 连续对齐，间接体现了离散取整操作的重要性。
- **充分性与客观性**：实验覆盖了多种变换类型和真实场景，结果清晰显示 SPAR 在大多数变换下解决率 >90%，而基线几乎为0%。但仅基于魔方域，缺乏其他领域（如机器人控制、游戏）的验证，模型泛化能力有待证明。

## 6. 主要结论与发现
- SPAR 成功解决超过 **90%** 的带有 17 种不同视觉变换的魔方问题，以及真实世界图像问题。
- 适应过程仅需训练对齐网络，无需重新训练世界模型或启发式函数，再训练时间减少 **至少 95%**。
- 离散潜在表示的对齐方法优于连续潜在表示的对齐方法，因为离散取整操作能精确匹配干净潜码，而连续表示容易受噪声干扰导致累积误差。
- 表示对齐是实现稳定世界模型规划的关键技术。

## 7. 优点
- **高效性**：只需训练轻量级对齐网络，大量节省算力和时间。
- **鲁棒性**：对多种视觉变换和真实世界图像均表现稳定。
- **简洁性**：利用离散潜码的取整操作，无需复杂的生成模型或对抗训练。
- **通用潜力**：方法不依赖于特定域，仅需要离散世界模型和启发式函数，可推广到其他基于模型规划的任务。

## 8. 不足与局限
- **实验域单一**：仅在魔方域上验证，魔方状态空间虽大但结构明确，现实中更复杂的连续控制或部分可观测环境可能不同。
- **变换类型有限**：虽然测试了17种，但未涵盖对抗性扰动、极端环境变化等，对齐网络可能对未见过变换失效。
- **依赖离散世界模型**：若原始MDP本身难以学习有效离散表示，本方法可能不适用。
- **未分析对齐网络失败场景**：例如当变换极大破坏状态信息时，对齐网络输出可能偏离真实潜码，导致取整错误。
- **计算资源信息缺失**：缺乏 GPU 型号、训练时间等详细报告，不利于复现和成本估算。

（完）
