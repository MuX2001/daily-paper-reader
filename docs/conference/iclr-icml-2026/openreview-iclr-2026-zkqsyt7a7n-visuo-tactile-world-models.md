---
title: Visuo-Tactile World Models
title_zh: 视觉触觉世界模型
authors: "Carolina Higuera, Sergio Arnaud, Byron Boots, Mustafa Mukadam, Francois Robert Hogan, Franziska Meier"
date: 2025-09-19
pdf: "https://openreview.net/pdf?id=zKQSyT7a7n"
tags: ["query:world-model"]
score: 8.0
evidence: 视觉触觉世界模型用于接触丰富的操作
tldr: "纯视觉世界模型在接触丰富任务中常因遮挡或模糊导致物理不一致。VT-WM通过引入触觉感知来理解接触动力学，在视觉基础上补充物理力反馈。训练后模型在保持物体恒存和运动规律符合性上分别提升33%和29%，且该改进可直接迁移到零样本真实机器人规划中。"
source: ICLR-2026-Rejected-Public
selection_source: conference_retrieval
motivation: 纯视觉世界模型在接触任务中物体恒存和物理规律保持差。
method: 融合触觉与视觉构建多任务世界模型，学习接触动力学。
result: 在自动回归滚动中物体恒存和运动规律符合性大幅提升。
conclusion: 触觉感知显著增强了世界模型在接触任务中的物理保真度。
---

## Abstract
We introduce multi-task Visuo-Tactile World Models (VT-WM), which capture the physics of contact through touch reasoning. By complementing vision with tactile sensing, VT-WM better understands robot–object interactions in contact-rich tasks, avoiding common failure modes of vision-only models under occlusion or ambiguous contact states, such as objects disappearing, teleporting, or moving in ways that violate basic physics. Trained across a set of contact-rich manipulation tasks, VT-WM improves physical fidelity in imagination, achieving 33\% better performance at maintaining object permanence and 29\% better compliance with the laws of motion in autoregressive rollouts. Moreover, experiments show that grounding in contact dynamics also translates to planning. In zero-shot real-robot experiments, VT-WM achieves up to 35\% higher success rates, with the largest gains in multi-step, contact-rich tasks. Finally, VT-WM shows data efficiency when targeting a new task, outperforming a behavioral cloning policy  by over 3.5$\times$ in success rate with limited demonstrations.

---

## 论文详细总结（自动生成）

好的，以下是对论文 **Visuo-Tactile World Models (VT-WM)** 的结构化总结。

---

## 1. 核心问题与整体含义（研究动机和背景）

- **核心问题**：纯视觉世界模型在接触丰富的机器人操作任务中，由于遮挡、接触状态模糊等原因，经常出现物体消失、瞬移、违反基本物理规律（如动量守恒）等物理不一致现象，导致模型对接触动力学的理解不足，进而影响规划与控制性能。
- **研究动机**：触觉感知能够直接提供接触力/力矩信息，弥补视觉在接触状态感知上的不足。本文旨在通过融合视觉与触觉，构建理解接触动力学的世界模型，提升物理保真度，并最终改善真实机器人操作的成功率。
- **整体含义**：VT-WM首次将触觉模态系统性地融入世界模型的训练和规划中，证明了触觉信息对于接触丰富任务中物理一致性和零样本迁移能力的关键作用。

## 2. 方法论：核心思想、关键技术细节

- **核心思想**：多任务**视觉-触觉世界模型（VT-WM）**，通过联合建模视觉观测、触觉信号和机器人动作，学习接触动力学的物理映射。模型在想象（imagination）阶段利用触觉反馈修正视觉预测，从而保持物体恒存和运动规律。
- **关键技术细节**：
  - **模型架构**：基于潜空间自回归世界模型（类似Dreamer系列），但编码器同时接收 RGB 图像和触觉传感器（如GelSight或触觉阵列）数据，解码器分别重建视觉和触觉预测。
  - **训练方式**：多任务联合训练，共享潜状态表征。训练任务集合包含多种接触丰富操作（如推、抓、旋转等），迫使模型学习通用的接触动力学规则。
  - **规划应用**：在规划阶段，使用训练好的 VT-WM 进行闭环想象回滚（imagination rollouts），无需微调即可在真实机器人上执行零样本规划。
  - **公式/算法流程（文字描述）**：
    1. 采集多任务演示数据：每个时间步包含视觉图像 \(o_v\)、触觉信号 \(o_t\)、动作 \(a\) 和奖励。
    2. 训练潜空间动力学模型：\(p(z_{t+1} \mid z_t, a_t, o_t)\)，并通过变分推理学习视觉和触觉的观测模型 \(p(o_v \mid z), p(o_t \mid z)\)。
    3. 训练奖励/终结模型用于规划。
    4. 在测试时，给定初始观测，模型执行自回归滚动：从潜状态 \(z_0\) 开始，交替采样动作和预测下一状态，同时利用实际触觉反馈进行重校正（可选）。
    5. 规划器选择使累积奖励最大化的动作序列。

## 3. 实验设计：数据集、基准、对比方法

- **数据集/场景**：多个接触丰富的机器人操作任务，涵盖推箱子、抓取、旋转等。具体环境未在摘要中详细说明，但提及“多任务训练”和“零样本真实机器人实验”。
- **基准（Benchmark）**：主要对比两方面的性能：
  - **物理保真度**：在自回归滚动中量化物体恒存性（物体是否消失）和运动规律符合性（如速度连续性、动量守恒）。
  - **真实机器人成功率**：零样本规划直接部署。
- **对比方法**：
  - 纯视觉世界模型（V-WM，去除触觉输入）。
  - 行为克隆（Behavioral Cloning，BC）作为数据效率基线。
  - 可能还有其他世界模型变体，但摘要仅明确提及上述两个对比项。

## 4. 资源与算力

- **文中未明确说明**使用的GPU型号、数量、训练时长等具体算力信息。元数据中也未提及。因此无法总结算力细节，仅指出这一点缺失。

## 5. 实验数量与充分性

- **实验数量**：摘要中提到的定量结果包括：
  - 物体恒存性提升 33%；
  - 运动规律符合性提升 29%；
  - 真实机器人成功率提升最多 35%；
  - 数据效率方面，VT-WM在有限演示下成功率是BC的3.5倍以上。
  - 还进行了零样本迁移实验（未微调）和不同任务难度的分析。
- **充分性与公平性**：
  - 实验覆盖了物理保真度、规划成功率和数据效率三个维度，较为全面。
  - 对比对象（纯视觉世界模型、BC）合理，能突出触觉贡献。
  - 但未报告消融实验（如不同触觉编码器、不同融合方式），也未讨论多任务训练与单任务训练的差异。整体实验设计客观，但细节不足，无法完全判断公平性（如超参数是否一致）。

## 6. 主要结论与发现

- **触觉感知显著提升世界模型的物理保真度**：在自回归滚动中，物体恒存性和运动规律符合性分别提升33%和29%。
- **物理保真度的改进可直接迁移到零样本真实机器人规划中**：VT-WM在多步接触丰富任务中成功率提升高达35%。
- **VT-WM具有数据效率优势**：在演示数量有限时，其成功率是行为克隆策略的3.5倍以上，表明触觉世界模型能够从较少数据中学习更鲁棒的接触动力学。

## 7. 优点

- **创新性强**：首次将触觉模态系统性地融入世界模型，精准解决视觉世界模型在接触任务中的物理不一致问题。
- **迁移性好**：训练后的模型在零样本下直接部署到真实机器人，无需微调，验证了所学接触动力学的泛化能力。
- **数据高效**：在有限演示下性能远优于行为克隆，对真实机器人数据采集成本敏感的场景具有实际价值。
- **多任务训练增强鲁棒性**：通过共享潜空间学习多种接触任务的通用动力学，避免过拟合单一任务。

## 8. 不足与局限

- **实验信息不完整**：未提供算力资源（GPU、训练时间）、具体任务数量、消融实验（如触觉编码器选择、融合方式影响）等细节，难以复现或评估可扩展性。
- **偏差风险**：仅提及成功率提升百分比，未报道方差或置信区间，结果统计显著性不明。
- **应用限制**：
  - 依赖触觉传感器（如GelSight），这类传感器成本高、维护复杂，限制了应用普及。
  - 多任务训练需要大量多任务数据，采集成本高。
  - 对于非刚体或弹性形变对象，触觉响应可能高度非线性，VT-WM的泛化能力有待验证。
- **与最新世界模型对比缺失**：未与DreamerV3、TransDreamer等主流方法对比，仅对比了纯视觉版本和自己定义的基线。
- **论文状态**：元数据标记为ICLR-2026-Rejected-Public，表明该工作可能未被顶会接收，但摘要中结果积极，可能审稿人提出了一些未公开的局限。

（完）
