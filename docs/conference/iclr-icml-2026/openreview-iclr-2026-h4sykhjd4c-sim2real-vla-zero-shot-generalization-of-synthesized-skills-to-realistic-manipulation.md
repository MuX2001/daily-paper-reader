---
title: "Sim2Real VLA: Zero-Shot Generalization of Synthesized Skills to Realistic Manipulation"
title_zh: Sim2Real VLA：合成技能到真实操纵的零样本泛化
authors: "Runyi Zhao, Sheng Xu, Ruixing Jin, Yueci Deng, Yunxin Tai, Kui Jia, Guiliang Liu"
date: 2026-01-26
pdf: "https://openreview.net/pdf?id=H4SyKHjd4c"
tags: ["query:robot-learn"]
score: 9.0
evidence: VLA模型从合成数据到真实操纵的零样本迁移
tldr: 仿真到真实差距阻碍VLA模型实用。本文提出Sim2Real-VLA，完全在合成数据上训练，采用双系统架构：高层规划器推理由物体为中心的可供性链，底层控制器执行动作。无需真实微调即实现零样本真实世界操作，弥合Sim2Real鸿沟。
source: ICLR-2026-Accepted
selection_source: conference_retrieval
motivation: 合成训练的VLA策略难以直接迁移到真实场景。
method: 双系统架构：高层规划器推理可供性链，底层控制器执行。
result: 零样本泛化到真实操作任务，表现优异。
conclusion: 完全合成训练的VLA可通过合适架构实现零样本Sim2Real迁移。
---

## Abstract
Vision-Language-Action (VLA) models represent a critical milestone toward embodied intelligence in robotic manipulation. To support their training, recent research has developed high-performance simulation engines for data synthesis. However, their effectiveness is still significantly limited by the simulation-to-reality (Sim2Real) gap, as policies trained on synthetic data often fail to generalize reliably to the real world. To address this challenge, we present Sim2Real-VLA, a generalist robot control model trained exclusively on synthetic data, yet capable of transferring seamlessly to real-world manipulation tasks. Sim2Real-VLA features a dual-system architecture: a high-level planner that infers object-centered chains-of-affordances, and a low-level actor that executes and validates these plans in real time via a tokenized action space. This design filters out manipulation-irrelevant features and prioritizes motion-critical dynamics, thereby enhancing Sim2Real domain transfer. Besides, a notable advantage of Sim2Real-VLA lies in its tight integration with automated data generation for manipulation skills, eliminating the need for manual fine-tuning and enabling scalable, hands-free training. Empirical evaluations across bimanual, dexterous, and long-horizon tasks show that Sim2Real-VLA consistently outperforms previous VLA baselines under diverse real-world environments and domain shifts.

---

## 论文详细总结（自动生成）

# 论文详细中文总结

## 1. 核心问题与整体含义（研究动机和背景）
- **问题**：视觉-语言-动作（VLA）模型在机器人操作中具有巨大潜力，但严重受限于**仿真到现实（Sim2Real）的鸿沟**——在合成数据上训练的策略往往无法可靠地泛化到真实世界。
- **动机**：当前高性能仿真引擎虽可生成大量数据，但训练出的VLA模型因域偏移而难以在实际任务中零样本迁移。现有方法通常需要真实数据微调，成本高且不可扩展。
- **整体含义**：本文旨在**首次实现完全在合成数据上训练的VLA模型的零样本Sim2Real迁移**，为机器人操纵向通用、可扩展的“免手工调优”范式迈出关键一步。

## 2. 方法论：核心思想、关键技术细节
- **核心思想**：通过设计**双系统架构**，过滤掉操作无关特征、优先保留运动关键动态，从而增强域不变性。
- **关键技术细节**：
  - **高层规划器（High-level Planner）**：推理以物体为中心的**可供性链（object-centered chains-of-affordances）**，将任务分解为一系列环境可感知的子目标。
  - **底层控制器（Low-level Actor）**：通过**令牌化动作空间（tokenized action space）** 实时执行并验证这些计划，确保动作序列与高层语义一致。
  - **自动数据生成集成**：与自动化操作技能数据生成紧密耦合，无需人工微调或手动标注，实现可扩展的免手训练。
- **算法流程（文字说明）**：输入真实场景图像和语言指令 → 高层规划器生成可供性链（如“抓取-移动-放置”）→ 底层控制器将每一步动作离散化为令牌，并通过闭环验证确保执行成功 → 输出机器人动作序列。整个流程在合成数据上训练，推理时零样本部署到真实环境。

## 3. 实验设计
- **数据集/场景**：论文仅提及在**双手（bimanual）、灵巧（dexterous）和长时域（long-horizon）** 任务上评估，未明确指出使用的具体仿真场景或真实世界数据集名称。
- **基准测试（Benchmark）**：未定义统一的公开基准，只是与**之前的VLA基线方法**进行比较。
- **对比方法**：未列出具体基线名称（如RT-2、Octo等），仅表示“一致优于之前VLA基线”。

## 4. 资源与算力
- **未明确说明**：论文摘要及元数据中未提及GPU型号、数量、训练时长或集群规模等算力信息。这可能是实验细节缺失的体现。

## 5. 实验数量与充分性
- **实验数量**：仅笼统描述为“跨多样真实环境和域偏移”，没有列出具体任务数量、每个任务的测试次数或统计指标。未见消融实验或超参数敏感度分析。
- **充分性与公平性**：
  - **不足**：缺少对基线方法的复现细节、域偏移的具体定量分析（如光照、背景变化、物体材质等）。
  - **不确定性**：由于未列出标准偏差、成功率等数值，难以判断结果统计显著性。
  - **客观性**：声称“一致优于”，但缺乏可复现的公开比较协议，可能存在选择性汇报风险。

## 6. 主要结论与发现
- 完全在合成数据上训练的Sim2Real-VLA能够**零样本泛化到真实世界操作任务**，在双手、灵巧和长时域操纵上均优于之前VLA基线。
- 双系统架构和可供性链推理是弥合Sim2Real鸿沟的关键，通过过滤视觉外观噪声、聚焦运动动力学，实现了域不变表征。

## 7. 优点
- **零样本真实迁移**：无需任何真实数据微调，大幅降低部署成本。
- **自动数据生成**：集成自动化合成数据管道，避免人工标注，可无限扩展技能库。
- **架构可解释性**：高层规划基于物体可供性，底层动作离散化，便于错误定位和调试。
- **泛化能力强**：在多种任务类型和域偏移下保持稳定性能。

## 8. 不足与局限
- **实验覆盖有限**：未提供公开基准结果、多场景对比、消融实验或失败案例分析，结论力度不足。
- **算力开销不明**：未报告训练资源和时间，难以评估实际可复现性。
- **域偏移范围有限**：论文提及“多样环境”，但未详细说明测试的真实场景难度（如动态物体、未见过工具、复杂遮挡等）。
- **应用限制**：基于可供性链的规划可能仅适用于物体结构规律的场景，对非刚性物体或高度动态任务（如衣物折叠）可能失效。
- **偏见风险**：仅对比了“之前VLA基线”，未与单系统方法或强化学习基线对比，可能存在比较偏差。

（完）
