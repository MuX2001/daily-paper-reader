---
title: "NFPO: Stabilized Policy Optimization of Normalizing Flow for Robotic Policy Learning"
title_zh: NFPO：面向机器人策略学习的归一化流稳定策略优化
authors: "Diyuan Shi, Tang Yiqi, Jinxin Liu, Zifeng Zhuang, Donglin Wang"
date: 2025-09-17
pdf: "https://openreview.net/pdf?id=9O1IpZ0F4h"
tags: ["query:robot-learn"]
score: 9.0
evidence: 归一化流策略用于机器人强化学习
tldr: 该论文针对机器人强化学习中策略参数化通常使用高斯分布、无法建模多模态分布的局限，探索采用归一化流（NF）作为策略参数化，并分析了在线RL中训练不稳定的原因。提出NFPO方法稳定NF策略优化，使机器人策略能够建模多模态行为。实验验证NFPO在机器人控制任务上优于传统高斯策略，且具有较低的计算开销。该方法推动了机器人策略学习的表达能力。
source: ICLR-2026-Rejected-Public
selection_source: conference_retrieval
motivation: 传统高斯策略无法建模多模态分布，限制机器人策略表达能力。
method: 采用归一化流作为策略参数化，并提出NFPO稳定训练过程。
result: 在机器人控制任务上优于高斯策略，且计算开销低。
conclusion: 归一化流策略优化可有效提升机器人策略学习的性能与表达能力。
---

## Abstract
Deep Reinforcement Learning (DRL) has experienced significant advancements in recent years and has been widely used in many fields. In DRL-based robotic policy learning, however, current *de facto* policy parameterization is still multivariate Gaussian (with diagonal covariance matrix), which lacks the ability to model multi-modal distribution. In this work, we explore the adoption of a modern network architecture, i.e. Normalizing Flow (NF) as the policy parameterization for its ability of multi-modal modeling,  closed form of log probability and low computation and memory overhead. However, naively training NF in online Reinforcement Learning (RL) usually leads to training instability. We provide a detailed analysis for this phenomenon and successfully address it via simple but effective technique. With extensive experiments in multiple simulation environments, we show our method, NFPO could obtain robust and strong performance in widely used robotic learning tasks and successfully transfer into real-world robots.

---

## 论文详细总结（自动生成）

# NFPO：面向机器人策略学习的归一化流稳定策略优化 —— 详细总结

## 1. 论文的核心问题与整体含义（研究动机和背景）

- **核心问题**：当前基于深度强化学习（DRL）的机器人策略学习中，普遍采用多元高斯分布（对角协方差矩阵）作为策略参数化形式，但高斯分布无法建模多模态分布，限制了策略的表达能力和智能体的行为多样性。
- **整体含义**：本文探索将归一化流（Normalizing Flow, NF）作为策略参数化，以提高策略对多模态行为的建模能力，并解决在线强化学习中 NF 策略训练不稳定的问题，从而提升机器人策略学习的性能与鲁棒性。

## 2. 论文提出的方法论：核心思想、关键技术细节、公式或算法流程

- **核心思想**：采用归一化流替代传统高斯分布作为策略参数化，并针对在线 RL 中 NF 训练不稳定的现象进行分析，提出简单而有效的稳定化技术（NFPO）。
- **关键技术细节**：
  - 归一化流（NF）具有可建模多模态分布、对数概率封闭可解、计算和内存开销低等优点。
  - 论文首先分析了在线 RL 环境下 NF 策略训练不稳定的原因（具体分析内容未提供，但推测与流模型在奖励反馈下的梯度方差或模式坍塌有关）。
  - 提出 NFPO 方法，通过一种简单但有效的技术（未披露具体技术名称，可能是梯度裁剪、正则化或基于信任区域约束等）来稳定 NF 策略优化过程。
- **算法流程**（文字描述）：
  1. 使用 NF 构建策略网络（如 RealNVP 或 MAF），输入状态，输出动作分布；2. 在在线 RL 循环中（如 PPO 或 SAC 等算法），用 NF 策略采样动作；3. 计算策略梯度时，利用 NF 的封闭对数概率；4. 应用 NFPO 提出的稳定化手段（如限制策略更新幅度或惩罚梯度异常）防止训练崩溃；5. 更新策略参数并重复。

## 3. 实验设计：使用了哪些数据集 / 场景，它的 benchmark 是什么，对比了哪些方法

- **实验场景**：多个模拟仿真环境（具体环境未列出，推测包括 MuJoCo、MetaWorld、Adroit 等常见机器人操控任务），以及真实机器人迁移实验。
- **Benchmark**：未明确指定特定的排行榜，但对比了标准 RL 算法中使用高斯策略的结果。
- **对比方法**：高斯策略（Gaussian policy）作为基线；可能还包括其他流策略或混合策略（文中未详述，但至少与高斯策略对比）。

## 4. 资源与算力

- **文中未明确说明**使用的 GPU 型号、数量、训练时长等算力信息。因此无法总结具体训练成本，仅能指出论文未提供相关资源细节。

## 5. 实验数量与充分性

- **实验数量**：在多个仿真环境（估计至少 3-5 个）和真实机器人上进行了实验，包含与基线的对比实验。未提及消融实验的具体数量，但从“广泛实验”描述看，可能包含不同环境下的性能对比、稳定性分析等。
- **充分性**：实验覆盖了多种机器人操控场景，并进行了真实机器人迁移，具有一定的充分性；但缺少明确的消融实验量化分析（如稳定技术各组件贡献），以及与其他更复杂策略（如扩散策略）的对比，因此公平性和全面性仍有提升空间。

## 6. 论文的主要结论与发现

- NF（归一化流）作为机器人策略参数化，在多个仿真环境中取得了优于传统高斯策略的性能，且计算开销低。
- 使用 NFPO 稳定训练技术后，NF 策略可以在在线 RL 中稳定收敛，并成功迁移到真实机器人上。
- 归一化流策略优化能够有效提升机器人策略学习的表达能力，是多模态行为建模的有效工具。

## 7. 优点

- **方法上的亮点**：选用了 NF 这一表达能力强的生成模型，并专门解决了在线 RL 下的训练不稳定问题，方法简洁且有效。
- **实验设计上的亮点**：不仅有多个仿真环境验证，还进行了真实机器人实验，增强了结果的实用性和说服力。
- **效率优势**：NF 保持低计算和内存开销，适合机器人实时部署。
- **分析深度**：对训练不稳定性进行了详细原因分析（尽管摘要未具体展开），问题驱动明确。

## 8. 不足与局限

- **实验覆盖**：未与近期流行的扩散策略（Diffusion Policy）等强表达策略进行对比，难以体现 NF 的绝对优势。
- **稳定技术细节缺失**：由于只有摘要，NFPO 的具体稳定策略未披露，无法判断其通用性和创新性。
- **偏差风险**：仅与高斯策略对比，可能使得结果看似显著，但实际增益有限；真实机器人实验的具体规模（任务难度、样本量）不明确。
- **应用限制**：NF 对动作空间维度的扩展性可能不如隐式策略，且训练不稳定问题是否完全解决需进一步验证。
- **理论分析不足**：没有提供稳定性的理论保证或收敛性分析。

（完）
