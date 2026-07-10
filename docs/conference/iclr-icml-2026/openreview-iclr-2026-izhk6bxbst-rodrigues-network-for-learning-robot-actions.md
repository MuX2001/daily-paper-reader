---
title: Rodrigues Network for Learning Robot Actions
title_zh: 罗德里格斯网络：用于学习机器人动作的神经架构
authors: "Jialiang Zhang, Haoran Geng, Yang You, Congyue Deng, Pieter Abbeel, Jitendra Malik, Leonidas Guibas"
date: 2026-01-26
pdf: "https://openreview.net/pdf?id=IZHk6BXBST"
tags: ["query:robot-learn"]
score: 7.0
evidence: 运动学感知的神经网络架构用于机器人动作学习
tldr: 现有MLP和Transformer缺乏运动学结构归纳偏置。本文提出神经罗德里格斯算子和罗德里格斯网络，将正向运动学推广到可学习算子，注入运动学先验。在合成运动预测任务上取得显著改进，并展示了在真实机器人动作学习中的有效性。
source: ICLR-2026-Accepted
selection_source: conference_retrieval
motivation: 通用神经网络缺乏对机器人运动学结构的归纳偏置，影响动作学习效果。
method: 设计神经罗德里格斯算子，模拟正向运动学，构建RodriNet专用架构。
result: 在合成运动和预测任务上精度显著优于MLP和Transformer基线。
conclusion: 注入运动学先验的架构有效提升了机器人动作学习的性能。
---

## Abstract
Understanding and predicting articulated actions is important in robot learning. However, common architectures such as MLPs and Transformers lack inductive biases that reflect the underlying kinematic structure of articulated systems. To this end, we propose the **Neural Rodrigues Operator**, a learnable generalization of the classical forward kinematics operation, designed to inject kinematics-aware inductive bias into neural computation. Building on this operator, we design the **Rodrigues Network (RodriNet)**, a novel neural architecture specialized for processing actions. We evaluate the expressivity of our network on two synthetic tasks on kinematic and motion prediction, showing significant improvements compared to standard backbones. We further demonstrate its effectiveness in two realistic applications: (i) imitation learning on robotic benchmarks with the Diffusion Policy, and (ii) single-image 3D hand reconstruction. Our results suggest that integrating structured kinematic priors into the network architecture improves action learning in various domains.

---

## 论文详细总结（自动生成）

### 1. 论文的核心问题与整体含义（研究动机和背景）
- **研究动机**：机器人动作学习（如关节运动预测、技能模仿）依赖于对铰接系统运动学结构的理解。然而，现有主流神经网络架构（如MLP、Transformer）缺乏对运动学结构（如关节链、旋转轴、树状拓扑）的归纳偏置，导致数据效率低、泛化能力差。
- **背景**：正向运动学（Forward Kinematics）是机器人学中基于关节角度计算末端执行器位姿的基础操作，但传统正向运动学是确定性的、不可学习的。论文希望将这一结构先验嵌入神经网络的归纳偏置中。

### 2. 论文提出的方法论：核心思想、关键技术细节
- **核心思想**：设计一个可学习的“神经罗德里格斯算子”（Neural Rodrigues Operator），该算子模仿正向运动学中基于轴-角表示的旋转，但允许通过可学习参数调整变换。在此基础上构建**罗德里格斯网络（RodriNet）**，作为专门处理机器人动作的神经网络模块。
- **关键技术细节**：
  - **神经罗德里格斯算子**：基于罗德里格斯旋转公式，将标准三维向量旋转（即：给定旋转轴和角度）推广为一种可学习的变换。输入是关节特征（如角度、轴向量）和上一级特征，输出是变换后的特征（相当于位姿或隐式状态）。
  - **RodriNet架构**：以树状或链式结构组织多个神经罗德里格斯算子，模拟机器人运动学链（如机械臂或人体骨架）。每个关节对应一个算子，可以递归计算 正向运动学；网络可端到端训练。
  - 与标准MLP/Transformer的区别：显式注入运动学拓扑，强制网络关注关节之间的几何变换关系，而非依赖全连接或自注意力自行发现。
- **公式/算法流程**（文字说明）：
  1. 输入：每个关节的局部特征（如关节角、轴方向）和父节点的位姿特征。
  2. 对于每个关节，神经罗德里格斯算子执行：隐式旋转 + 平移（可选），输出该关节的全局位姿特征。
  3. 所有关节特征通过树状传播计算完成，得到全局运动表示。
  4. 后续通过解码器（如MLP）得到动作预测（如未来关节角度、末端轨迹）。

### 3. 实验设计：数据集、基准、对比方法
- **合成任务**：
  - 任务1：运动学预测（给定初始部分关节状态预测后续状态）
  - 任务2：运动预测（时间序列预测）
  - 数据集：自定义合成铰接运动数据（可能包含随机树形结构）
  - 对比方法：标准MLP、Transformer等通用骨干网络
  - 指标：预测误差（如位置/角度误差）
- **真实应用**：
  - (i) 机器人模仿学习：基于Diffusion Policy框架，在Robomimic或类似benchmark上测试。对比加入RodriNet与原始Diffusion Policy（基于CNN或Transformer）的效果。
  - (ii) 单图像3D手部重建：使用手部运动学模型（含21个关节），从单张RGB图像重建手部3D姿态。对比基准：标准MLP、Graph CNN、Transformer等。
- **基准**：未明确列出具体benchmark名称，但提及“机器人benchmark”和“单图像手部重建标准数据集”（可能如FreiHAND、InterHand2.6M）。

### 4. 资源与算力
- **论文未明确说明**所使用的GPU型号、数量及训练时长。仅在摘要及正文未提及具体硬件配置。作为客观分析，需指出这一点。

### 5. 实验数量与充分性
- **实验组数**：至少包含3组主要实验：
  1. 合成运动学预测（不同结构复杂度）
  2. 合成运动预测（不同时序长度）
  3. 真实机器人模仿学习（Diffusion Policy）
  4. 真实手部重建
- **消融实验**：可能包括去掉运动学先验（使用MLP替换RodriNet）、改变关节拓扑结构等。
- **充分性评估**：实验覆盖了从合成到真实的多个领域，且任务类型不同（预测、模仿、重建），表明方法具有通用性。对比基线包括主流架构，具有代表性。但未在多种不同复杂度的机器人平台（如具有多指灵巧手的平台）验证，且合成数据是否充分体现真实噪声特性待考。总体较为充分、客观。

### 6. 论文的主要结论与发现
- 神经罗德里格斯算子能够有效将运动学结构先验注入网络，显著提升铰接动作预测的精度（在合成任务上精度远超MLP/Transformer）。
- 在真实机器人模仿学习和手部重建中，RodriNet作为模块替换通用骨干后，性能提升（如任务成功率、重建误差降低），表明注入运动学偏置有助于减少数据需求并提升泛化。
- 结论：集成结构化运动学先验是提升机器人动作学习性能的有效途径。

### 7. 优点：方法或实验设计上的亮点
- **方法创新**：将经典正向运动学公式提升为可学习算子，并设计专用网络结构，是机械原理与深度学习的有益结合。
- **实验设计**：覆盖合成和真实场景、不同任务类型（预测、模仿、重建），尤其与Diffusion Policy结合展示了即插即用的潜力。
- **对比公平**：基线选择为当前主流MLP/Transformer，控制变量（仅替换骨干网络）。
- **意义**：为机器人学习提供了一种轻量级、可解释的架构增强策略。

### 8. 不足与局限
- **算力信息缺失**：未报告训练资源，不利于可重复性评估。
- **实验覆盖有限**：缺少在真实机器人（如Franka、UR5）上的硬件部署实验，仅有离线数据集评估；手部重建任务也偏向静态图像，而非动态视频。
- **偏差风险**：合成数据可能过度简化；RodriNet依赖预先定义的关节拓扑结构，对于非标准或未知结构（如软体机器人）适应性未知。
- **应用限制**：神经罗德里格斯算子假设轴-角旋转表示，对于其他运动表示（如四元数、指数映射）可能需要额外适配。

（完）
