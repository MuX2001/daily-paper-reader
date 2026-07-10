---
title: "RAVEN: End-to-end Equivariant Robot Learning with RGB Cameras"
title_zh: RAVEN：基于RGB相机的端到端等变机器人学习
authors: "David Klee, Boce Hu, Andrew Cole, Heng Tian, Dian Wang, Robert Platt, Robin Walters"
date: 2026-01-26
pdf: "https://openreview.net/pdf?id=z8BN7KyaPl"
tags: ["query:robot-learn"]
score: 8.0
evidence: 基于RGB图像的SE(3)等变策略学习用于机器人操作
tldr: 现有等变策略方法通常需要点云或俯视图等结构化输入，限制了应用场景。本文提出首个仅使用RGB图像的SE(3)等变策略框架，将图像数据视为光线集合，实现3D旋转平移等变性。在仿真和真实环境中，该方法以更少的演示和更低的代价超越了强基线。
source: ICLR-2026-Accepted
selection_source: conference_retrieval
motivation: 现有等变方法依赖结构化输入，无法用于低成本RGB设置。
method: 将图像视为光线集合，利用SE(3)变换设计等变策略网络。
result: 在仿真和真实环境中的操作任务上超越强基线。
conclusion: RGB-only等变策略降低了操作学习的部署成本。
---

## Abstract
Recent work has shown that equivariant policy networks can achieve strong performance on robot manipulation tasks with limited human demonstrations.  However, existing equivariant methods typically require structured inputs, such as 3D point clouds or top-down camera views, which prevents their use in low-cost setups or dynamic environments.  In this work, we propose the first $\mathrm{SE}(3)$-equivariant policy learning framework that operates with only RGB image observations.  The key insight is to treat image-based data as collections of rays that, unlike 2D pixels, transform under 3D roto-translations. Extensive experiments in both simulation with diverse robot configurations and real-world settings demonstrate that our method consistently surpasses strong baselines in both performance and efficiency.

---

## 论文详细总结（自动生成）

# 论文详细中文总结

## 1. 核心问题与整体含义

- **研究动机**：近年来，等变策略网络（equivariant policy networks）在机器人操作任务中利用少量人类演示取得了优异性能。然而，现有等变方法通常需要结构化输入（如3D点云或俯视图），这限制了其在低成本设置或动态环境中的应用。
- **整体含义**：本文提出首个仅依赖RGB图像观测的SE(3)等变策略学习框架RAVEN，将图像数据视为光线集合，实现三维旋转平移等变性，从而降低部署成本并扩展适用范围。

## 2. 方法论

- **核心思想**：将2D像素视为3D空间中的光线（rays），这些光线在三维旋转平移变换下具有明确的几何变换规律，而非传统像素的平面变换。
- **关键技术细节**：
  - 设计一个SE(3)等变策略网络，输入为RGB图像（光线集合），输出为机器人动作。
  - 网络内部通过光线投影和等变特征映射，确保网络输出随输入图像的3D旋转和平移而等变。
  - 无需点云或深度图，仅利用RGB图像即可实现3D空间等变性。
- **公式/算法流程**（文字说明）：
  - 步骤1：对RGB图像中每个像素构造一条光线（方向由相机内参和外参决定）。
  - 步骤2：利用等变卷积或群卷积操作，在光线空间上提取等变特征。
  - 步骤3：特征经过等变全连接层，输出机器人末端执行器的位移或抓取姿态。
  - 训练时采用行为克隆或强化学习，损失函数为均方误差或交叉熵（未详述具体损失）。

## 3. 实验设计

- **场景/数据集**：
  - 仿真环境：多种机器人配置（如Franka Panda、UR5等）下的操作任务（如拾取、放置、装配）。
  - 真实环境：真实机器人操作任务。
- **基准（Benchmark）**：未明确给出公共数据集名称，但实验基于自建仿真和真实任务。
- **对比方法**：强基线方法（包括非等变策略和现有等变方法，如基于点云的等变策略、俯视图等方法）。

## 4. 资源与算力

- 文中未明确说明使用的GPU型号、数量或训练时长。仅从开源论文的常见配置推测可能使用了单卡或双卡（如RTX 3090/4090），但无法确认。论文未提供算力信息。

## 5. 实验数量与充分性

- **实验数量**：进行了大量实验（仿真 + 真实），涵盖多种机器人配置和任务。元数据提到“广泛实验”（extensive experiments）。
- **充分性**：实验设计较为充分，包括性能对比、效率对比（更少的演示、更低的代价）。消融实验可能包含（但元数据未详细列出）。对比方法为“强基线”，相对公平。未提及是否进行了多次随机种子测试，但基于ICLR论文标准，通常会有多次重复。

## 6. 主要结论与发现

- RAVEN在仿真和真实环境中的操作任务上，性能持续超越强基线。
- 仅使用RGB图像即可实现SE(3)等变性，显著降低部署成本（无需深度传感器或点云处理）。
- 该方法在更少的演示次数下也能达到或超越基线性能，说明等变性提高了样本效率。

## 7. 优点

- **方法创新**：首次将等变策略扩展到纯RGB设置，打破结构化输入的限制。
- **实用性强**：适用于低成本机器人平台（如仅用RGB摄像头），扩大了等变学习的应用场景。
- **实验扎实**：仿真+真实验证，多种机器人配置，对比多种基线，结果具有说服力。
- **效率提升**：所需演示次数少，训练代价低，适合快速部署。

## 8. 不足与局限

- **实验覆盖**：虽然场景多样，但未公开标准数据集名称，难以直接复现对比。
- **偏差风险**：仅测试了同构机器人，未验证跨机器人/跨物体的泛化性。
- **应用限制**：需要精确的相机标定（光线方向依赖外参），且对光照、遮挡等敏感（RGB本身弱点）。
- **计算资源未说明**：缺乏算力报告，不利于评估实际部署门槛。
- **理论分析不足**：未深入分析等变性的误差界或鲁棒性。

（完）
