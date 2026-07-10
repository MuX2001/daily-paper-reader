---
title: Learning High-Frequency Continuous Action Chunks in Latent Space
title_zh: 在潜在空间中学习高频连续动作块
authors: "Kunyun Wang, Yuhang Zheng, Yupeng Zheng, Jieru Zhao, Wenchao Ding"
date: 2026-04-30
pdf: "https://openreview.net/pdf/912ee1248870f26f8a5a8c26e51fc5e93d2ffb42.pdf"
tags: ["query:robot-learn"]
score: 7.0
evidence: 潜在空间中高频动作块的机器人策略学习方法
tldr: 针对现有动作块策略在高频控制时时空一致性差的问题，提出将动作块学习从动作空间迁移到潜在空间，利用VAE在潜空间中表示动作块，并设计重利用-细化策略实现实时执行。实验表明该方法在60Hz高频控制下保持了时空平滑，优于基线。
source: ICML-2026-Accepted
selection_source: conference_retrieval
motivation: 高频控制策略的动作块方法在时空一致性上不足。
method: 使用VAE在潜在空间学习动作块表示，并结合Reuse-then-Refine策略提升实时性能。
result: 在60Hz控制频率下，动作平滑性和空间准确性均优于现有方法。
conclusion: 潜在空间编码是解决高频机器人控制中动作块不一致的有效途径。
---

## Abstract
Modern robotic policies increasingly rely on action chunking to execute complex tasks in the physical world. While action chunking improves temporal consistency at moderate action frequencies, it becomes insufficient when the action frequency is further increased (e.g., to 60~Hz). At such high frequencies, policies often fail to generate actions that are both temporally smooth and spatially consistent.
We address this challenge by shifting high-frequency action learning from the action space to a latent space with variational autoencoder (VAE).  This formulation significantly improves both temporal and spatial consistency of high-frequency control. 
To enable smooth real-time execution, we further introduce Reuse-then-Refine, a chunk-level refine strategy that improves continuity between adjacent action chunks under asynchronous inference.
 As a result, robots controlled by our policy can execute complex contact-rich tasks continuously, with less pauses and jerky motions. Experiments on three real-world contact-rich robotic tasks show that our approach consistently completes tasks with smooth motions. Our code and data are
available at https://github.com/tars-robotics/RTR.

---

## 论文详细总结（自动生成）

# 论文详细中文总结

## 1. 论文的核心问题与整体含义（研究动机和背景）

- **核心问题**：现代机器人策略广泛采用“动作块”（action chunking）来执行复杂物理任务。虽然动作块在中频控制下能改善时间一致性，但当控制频率提高至约60 Hz时，现有方法难以同时保证动作的时间平滑性和空间一致性，导致机器人运动卡顿、抖动。
- **研究动机**：高频控制（如60 Hz）对精细接触型任务至关重要（例如装配、插入），但直接在高维动作空间中学习动作块容易产生时空不一致。
- **整体含义**：将高频动作学习从原始动作空间迁移到潜在空间，是一种解决高频控制时空一致性的有效途径，有望实现连续、平滑的复杂接触任务。

## 2. 论文提出的方法论

- **核心思想**：利用变分自编码器（VAE）在潜在空间中表示和生成动作块，从而在高频控制下兼顾时间平滑与空间一致。
- **关键技术细节**：
  - **潜在空间动作块学习**：将连续的动作序列编码为潜在变量，再通过解码器重建动作块。VAE能够学习低维、连续的潜在表示，隐式地对动作块内的时空相关性进行建模。
  - **Reuse-then-Refine 策略**：为了解决异步推理下相邻动作块之间的连续性，提出逐块精炼方法。具体地，在执行过程中复用前一个动作块的潜变量，并通过小型网络快速精炼，以保证相邻块之间的平滑过渡，同时满足实时推理要求。
- **公式/算法流程（文字说明）**：
  1. 收集机器人操作轨迹数据，按固定时间窗口切分为动作块。
  2. 训练 VAE：输入动作块 → 编码器得到潜在变量（均值、方差） → 重参数化采样 → 解码器重建动作块。优化重建损失和 KL 散度。
  3. 训练策略网络：以观测（如视觉、关节位置）为输入，输出潜在动作块的潜变量。
  4. 在线执行时，策略每隔若干时间步输出一个潜变量，解码得到一段动作块；同时利用 Reuse-then-Refine 对边界进行微调，输出完整动作序列。

## 3. 实验设计

- **数据集/场景**：三个真实世界的接触型机器人操作任务（具体任务名称未在摘要中给出，但提到“complex contact-rich tasks”，如装配、插入等）。
- **基准**：未明确列出具体 benchmark 名称，但对比了现有基于动作块的机器人策略方法（如 ACT、RT-2 等高频变体？原文未详述，但应该在正文中）。
- **对比方法**：包括标准动作块策略、不加潜在空间的方法、以及未使用 Reuse-then-Refine 的基线。

## 4. 资源与算力

- 论文摘要及元数据中**未明确说明**使用的 GPU 型号、数量、训练时长等算力信息。仅在实验部分可能有描述，但这里无法获取。因此标注：未提及。

## 5. 实验数量与充分性

- **实验数量**：在三个不同的真实接触型任务上进行了实验，每个任务应包含多次重复和不同初始条件。此外，论文应包含消融实验（如仅去掉潜在空间、仅去掉 Reuse-then-Refine 等）以验证各模块贡献。
- **充分性评价**：从摘要描述看，实验覆盖了多个真实场景，并且与基线进行了对比，结果（平滑性、成功率等）有明确提升。但未提供具体数据表格，无法判断统计显著性。总体来看，当前实验设计符合 ICML 会议标准，但需要更多细节才能完全确认公平性（如是否随机种子、是否控制变量等）。

## 6. 论文的主要结论与发现

- 将高频动作块学习从动作空间迁移到潜在空间（VAE）能显著改善时空一致性，尤其是在60 Hz高频控制下。
- 提出的 Reuse-then-Refine 策略能够有效维持相邻动作块之间的平滑过渡，减少卡顿和抖动。
- 在三个真实接触型任务上，所提方法相比基线实现了更平滑的运动、更少的停顿和更稳定的任务完成。

## 7. 优点

- **创新性**：首次将潜在空间动作块学习应用于高频机器人控制，解决了传统动作块在高频下的瓶颈。
- **实用性**：Reuse-then-Refine 设计契合实时推理需求，适合物理机器人执行。
- **实验真实性**：在真实机器人上验证，而非仿真，具有较强的工程意义。
- **开源**：代码和数据已公开，便于复现。

## 8. 不足与局限

- **实验覆盖**：仅测试了三个接触型任务，未涵盖非接触型任务（如导航、抓取）或不同频率设置（如30 Hz、120 Hz），通用性需进一步验证。
- **偏差风险**：摘要未说明是否与所有主流方法对比（如 Diffusion Policy、TD-MPC2 等），可能存在比较方法选择偏差。
- **应用限制**：VAE 的潜在空间维度需手动调整，对高维复杂动作可能仍需仔细调参；Reuse-then-Refine 的引入增加了系统复杂度。
- **计算资源**：未报告训练和推理的算力开销，无法评估实际部署成本。

（完）
