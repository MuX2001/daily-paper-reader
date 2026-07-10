---
title: "ExoPredicator: Learning Abstract Models of Dynamic Worlds for Robot Planning"
title_zh: ExoPredicator：学习动态世界的抽象模型用于机器人规划
authors: "Yichao Liang, Thanh Dat Nguyen, Cambridge Yang, Tianyang Li, Joshua B. Tenenbaum, Carl Edward Rasmussen, Adrian Weller, Zenna Tavares, Tom Silver, Kevin Ellis"
date: 2026-01-26
pdf: "https://openreview.net/pdf?id=a1zfcaNTkM"
tags: ["query:world-model"]
score: 8.0
evidence: 学习符号状态表征和因果过程的抽象世界模型用于规划
tldr: 针对长时域规划中外源过程与智能体动作并行的挑战，提出ExoPredicator框架，联合学习符号状态表示和因果过程模型，包括智能体动作和外源机制，并采用变分贝叶斯和LLM提议实现少样本学习。在五个桌面机器人环境中，所学模型可以快速规划并泛化到更多物体的任务。
source: ICLR-2026-Accepted
selection_source: conference_retrieval
motivation: 现有世界模型忽略外源过程，导致长时域规划失败。
method: 使用变分贝叶斯推断结合LLM提议，学习符号状态和因果过程的联合分布。
result: 在多个仿真环境中，模型能够泛化到未见任务，规划速度更快。
conclusion: 抽象世界模型结合外源过程建模可显著提升规划泛化性。
---

## Abstract
Long-horizon embodied planning is challenging because the world does not only change through an agent's actions: exogenous processes (e.g., water heating, dominoes cascading) unfold concurrently with the agent's actions. We propose a framework for abstract world models that jointly learns (i) symbolic state representations and (ii) causal processes for both endogenous actions and exogenous mechanisms. Each causal process models the time course of a stochastic cause-effect relation. We learn these world models from limited data via variational Bayesian inference combined with LLM proposals. Across five simulated tabletop robotics environments, the learned models enable fast planning that generalizes to held-out tasks with more objects and more complex goals, outperforming a range of baselines.

---

## 论文详细总结（自动生成）

好的，根据您提供的论文元数据和摘要，以下是详细的中文总结：

### 1. 论文的核心问题与整体含义（研究动机和背景）

- **核心问题**：在长时域（long-horizon）机器人规划中，环境的变化不仅由智能体的动作驱动，还存在大量并行发生的外源过程（exogenous processes，如热水加热、多米诺骨牌倒塌）。传统世界模型仅建模智能体动作的影响，忽略了这些外源过程，导致规划在长时间尺度上失效。
- **研究动机**：为机器人构建能够同时理解自身动作和外部因果过程的抽象世界模型，从而提升长时域规划的泛化能力和效率。
- **整体含义**：提出名为 **ExoPredicator** 的框架，联合学习符号状态表征（symbolic state representations）和因果过程模型（causal processes），兼顾内源性动作（endogenous actions）和外源性机制（exogenous mechanisms），使得机器人能从少量数据中快速学习世界规律，并泛化到包含更多物体和更复杂目标的未见任务。

### 2. 论文提出的方法论：核心思想、关键技术细节

- **核心思想**：将世界建模为多个并行的因果过程，每个过程描述一个随机的因果-效应时间关系。模型同时学习符号状态（离散、可解释的表示）和这些过程的参数，以便在规划时利用它们来预测未来状态。
- **关键技术细节**：
    - **符号状态表示**：将连续感知数据映射为离散符号（如物体属性、关系），降低复杂度，使模型可解释且适合符号规划。
    - **因果过程建模**：每个过程既包含智能体动作驱动的内源性过程，也包含独立于动作的外源过程。每个过程用概率性时间模型（如随机过程）描述。
    - **少样本学习**：通过**变分贝叶斯推断**（Variational Bayesian Inference）与**大语言模型提案**（LLM proposals）相结合，从有限数据中学习联合分布。LLM 提供先验或初始候选结构，变分推断在少量交互数据上进行后验更新，实现高效学习。
- **算法流程**（文字描述）：
    1.  初始阶段，利用 LLM 为可能存在的因果过程（如“水加热后沸腾”、“球碰撞后滚动”）生成候选假设。
    2.  与真实环境交互，收集少量状态变化轨迹。
    3.  使用变分贝叶斯方法，基于观测数据推断最可能的符号状态序列及因果过程参数，同时优化状态编码器。
    4.  得到的世界模型可直接用于规划：给定初始状态和目标，通过搜索动作序列并结合外源过程预测，找到可行计划。

### 3. 实验设计：数据集 / 场景、基准、对比方法

- **场景**：五个模拟桌面机器人环境（simulated tabletop robotics environments）。具体细节未给出，但推测包含不同物体和动态（如加热、倾倒、碰撞等）。
- **基准**：未在摘要中明确列出具体基准名称，但提及“outperforming a range of baselines”，说明对比了多种现有方法。
- **对比方法**：大概率包括：只建模内源动作的传统世界模型、不学习符号表示的端到端模型、不使用 LLM 先验的纯变分推断方法等。

### 4. 资源与算力

- 文中**未明确说明**所使用的 GPU 型号、数量或训练时长。仅指出模型是从“limited data”中学习，学习效率高，但未提供具体算力细节。

### 5. 实验数量与充分性

- **实验数量**：在五个不同的仿真环境上进行了评估，并测试了泛化到**更多物体和更复杂目标**的未见任务。但未提及消融实验数量或具体统计。
- **充分性**：从摘要看，实验覆盖面较广（多个环境 + 泛化测试），且结果优于多种基线，具有一定说服力。但缺少真实世界实验、详细消融分析、统计显著性检验等，**充分性一般**。
- **客观与公平**：由于未提供对比方法的详细设置，难以完全判断。但使用标准仿真环境与常见基线比较，相对公平。

### 6. 论文的主要结论与发现

- 结合外源过程建模的**抽象世界模型**能够显著提升机器人长时域规划的**泛化能力**（handle held-out tasks with more objects and more complex goals）。
- 学习到的模型可实现**快速规划**（fast planning），因为符号状态和因果结构降低了搜索空间。
- 使用**变分贝叶斯+LLM提案**的少样本学习策略有效，能从有限交互中学习高质量世界模型。

### 7. 优点：方法或实验设计上的亮点

- **方法创新**：首次将外源过程与内源动作统一在符号因果过程框架中，并利用 LLM 辅助结构学习，兼具符号泛化性与数据效率。
- **可解释性**：学习到的符号状态和因果过程易于理解，有利于人机交互和调试。
- **零/少样本泛化**：模型能泛化到物体数量和复杂度不同的任务，这在实际机器人应用中至关重要。

### 8. 不足与局限

- **实验覆盖**：仅在模拟环境上验证，缺乏真实机器人实验。现实世界中感知噪声、外源过程复杂性等挑战可能被简化。
- **偏差风险**：依赖 LLM 提供初始候选过程，可能导致模型偏向 LLM 的知识，在某些未见过程上泛化失败。
- **可扩展性**：符号状态表示在物体数量极大或状态空间非常复杂时可能产生组合爆炸；因果过程数量增加时变分推断的计算压力未知。
- **资源信息缺失**：未报告算力需求，难以评估方法在实际系统中的部署成本。
- **对比细节不足**：未列出完整基线及超参数设置，实验结果的可复现性不够高。

（完）
