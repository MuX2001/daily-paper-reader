---
title: Learning Task-Sufficient World Models by Synergizing Agentic Exploration and Structured Modeling
title_zh: 通过智能体探索与结构化建模协同学习任务充分的世模型
authors: "Fan Feng, Yujia Zheng, Minghao Fu, Yongqiang Chen, Guangyi Chen, Kevin Patrick Murphy, Biwei Huang, Kun Zhang"
date: 2026-04-30
pdf: "https://openreview.net/pdf/84fe713ced5e3b1712af85e159aa04032261cb68.pdf"
tags: ["query:world-model"]
score: 9.0
evidence: 通过智能体探索和结构化建模学习任务充分的世模型
tldr: 现有世界模型通常使用高维潜在空间，保留与控制无关的信息。本文提出一种智能体与世界模型的闭环协同方法：智能体主动探索环境，结构化的世界模型学习从交互数据中提炼任务充分的表示。实验表明，该方法在多个决策任务上实现了更高的采样效率和泛化能力。
source: ICML-2026-Accepted
selection_source: conference_retrieval
motivation: 现有世界模型潜在空间冗余，包含控制无关因子，限制泛化。
method: 智能体主动探测环境，结构化世界模型从交互数据蒸馏任务充分表示。
result: 在多个决策任务中实现更高采样效率和泛化能力。
conclusion: 闭环协同能够学习更有效的世界模型。
---

## Abstract
Learning and planning in imagination using world models provides an effective paradigm for training agents for decision-making. However, existing approaches often rely on high-dimensional latent spaces or generic visual embeddings that retain many factors irrelevant to control, limiting efficiency and generalization across tasks.  To this end, we study how agents can learn world models with representations that are task-specific, minimal, and sufficient for decision making. We achieve this via a closed-loop synergy between the agent and the world model, in which structured world-model learning distills task-sufficient representations from informative interaction data. On the agent side, agents perform active probing of the environment to collect informative trajectories that expose task-relevant latent factors, guided by an adaptive curriculum. On the world-model side, we learn structured representations over observations to distill compact, task-sufficient latent states from the collected interaction data. This synergy enables the recovery of task-sufficient latent representations that capture all control-relevant factors empirically. Leveraging these representations, the resulting policies achieve improved sample efficiency generalization, including generalization across skills, object–skill compositions, and previously unseen tasks on standard continuous control and robotic manipulation benchmarks.

---

## 论文详细总结（自动生成）

# 论文详细中文总结

## 1. 论文的核心问题与整体含义（研究动机和背景）

- **研究动机**：现有基于世界模型的决策框架通常使用高维潜在空间或通用视觉嵌入进行想象训练，但这类表示保留了大量与控制无关的冗余因子，限制了采样效率和跨任务泛化能力。
- **核心问题**：如何让智能体学习到**任务充分**（task-sufficient）的世界模型表示，即最小化、只包含控制相关因子且足以支撑决策的潜在状态表示。
- **整体含义**：提出一种智能体与世界模型之间的**闭环协同机制**，通过智能体主动探索环境获取信息丰富的轨迹，结构化的世界模型从中蒸馏出任务充分的表示，从而提升决策的样本效率和泛化性能。

## 2. 论文提出的方法论：核心思想、关键技术细节

- **核心思想**：构建智能体（Agent）与结构化世界模型（Structured World Model）的闭环协同：智能体负责主动探测环境，世界模型负责从交互数据中提取任务充分的表示；两者相互促进，形成良性循环。
- **关键技术细节**：
  - **智能体侧（Agent-side）**：采用**自适应课程学习**（adaptive curriculum）驱动智能体主动探索环境，收集能够暴露任务相关潜在因子的信息丰富轨迹。智能体不是随机探索，而是有目标地选取能激发世界模型学习关键变量的经验。
  - **世界模型侧（World-model side）**：学习**结构化表示**（structured representations），在观测之上进行蒸馏，得到紧凑、任务充分的潜在状态。该表示仅保留与控制相关的因子，舍弃无关变量。
  - **闭环协同机制**：智能体探索收集的数据用于训练世界模型；世界模型学到的表示又指导智能体更高效地探索目标相关区域，两者交替迭代直至收敛。没有显式给出公式或算法伪代码，但核心是强化学习框架下的交互优化过程。

## 3. 实验设计：使用的数据集/场景、基准测试、对比方法

- **使用的场景/数据集**：标准连续控制任务（Continuous Control）和机器人操作基准（Robotic Manipulation benchmarks）。
- **基准测试**：未明确列出具体环境名称，但涵盖多种技能组合和对象-技能组合的泛化测试，包括**跨技能泛化**、**对象-技能组合泛化**以及**从未见过的任务**。
- **对比方法**：未列出具体对比算法名称，但提及与现有依赖高维潜在空间或通用视觉嵌入的方法进行比较，表明其改进主要体现在效率和泛化上。

## 4. 资源与算力

- **文中未明确说明**：论文元数据和摘要中均未提及所使用的GPU型号、数量、训练时长等具体算力信息。无法对此进行总结。

## 5. 实验数量与充分性

- **实验数量**：未给出具体实验组数，但从描述看涵盖了多种任务类型（技能泛化、组合泛化、零样本泛化），且包含与baseline的对比。
- **充分性评估**：实验设计覆盖了多种泛化场景，较为充分；但缺少具体数值结果和统计显著性分析，无法完全判断公平性。对比方法没有明确指出，可能存在选择偏差。总体而言，实验框架合理，但细节不足（受限于提取信息有限）。

## 6. 论文的主要结论与发现

- 通过智能体与结构化世界模型的闭环协同，能够学习到**任务充分的潜在表示**，经验上捕捉了所有控制相关因子。
- 基于该表示训练的策略实现了**更高的样本效率**和**更强的泛化能力**，包括跨技能、对象-技能组合以及全新任务的泛化。
- 验证了主动探索与结构化建模相互促进的有效性。

## 7. 优点：方法或实验设计上的亮点

- **方法亮点**：
  - 提出**闭环协同**概念，将探索和表示学习一体化，而非分离优化。
  - 智能体采用自适应课程学习，使探索更具目标性。
  - 世界模型学习结构化表示，实现任务充分性，减少冗余。
- **实验亮点**：
  - 评估了多个维度的泛化（技能、组合、零样本），全面展示方法优势。
  - 使用标准连续控制和机器人操作任务，具有代表性。

## 8. 不足与局限

- **实验细节缺失**：未能提供具体数值结果、环境名称、基线算法、超参数设置等，导致复现和公平性判断困难（可能因提取信息有限，但原文也可能不够详尽）。
- **消融实验**：未提及是否单独分析智能体探索模块和世界模型表示模块各自的贡献，缺乏消融分析。
- **应用限制**：方法依赖自适应课程学习，可能对复杂环境的课程设计敏感；结构化表示的学习假设潜在变量可分离，在实际高维观测（如真实图像）中可能面临挑战。
- **资源未报告**：缺少算力信息，不利于评估计算成本。

（完）
