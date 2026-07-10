---
title: Delta-Triplane Transformers as Occupancy World Models
title_zh: 三角洲平面Transformer作为占用世界模型
authors: "Haoran Xu, Peixi Peng, Guang Tan, Yiqian Chang, Yisen Zhao, Yonghong Tian"
date: 2025-09-18
pdf: "https://openreview.net/pdf?id=0klioDjSVM"
tags: ["query:world-model"]
score: 7.0
evidence: 用于自动驾驶运动规划的占用世界模型
tldr: 现有占用世界模型预测完整未来状态，计算量大。本文提出Delta-Triplane Transformers，通过时变三平面表示聚焦占用变化建模，在紧凑3D潜空间中利用变化稀疏性，实现更高精度和更轻架构。预训练三平面表示后提取多尺度特征，应用于自动驾驶运动规划。
source: ICLR-2026-Rejected-Public
selection_source: conference_retrieval
motivation: 完整占用预测冗余且计算昂贵，需要高效变化建模。
method: 使用时变三平面表示，仅建模占用变化而非完整状态。
result: 在自动驾驶场景中精度更高且模型更轻量。
conclusion: 变化建模策略有效提升占用世界模型效率与准确性。
---

## Abstract
Occupancy World Models (OWMs) aim to predict future scenes via 3D voxelized representations of the environment to support intelligent motion planning. Existing approaches typically generate full future occupancy states from VAE-style latent encodings. In contrast, we propose Delta-Triplane Transformers (DTT), a novel 4D OWM for autonomous driving. DTT adopts temporal triplane as the occupancy representation, and focuses on modeling changes in occupancy rather than dealing with full states. The core insight is that changes in the compact 3D latent space are naturally sparser and easier to model, enabling higher accuracy with a lighter-weight architecture. We first pretrain a triplane representation model that encodes 3D occupancy compactly, and then extract multi-scale motion features from historical data and iteratively predict future triplane deltas. These deltas are combined with past states to decode future occupancy and ego-motion trajectories. Extensive experiments show that DTT achieves a state-of-the-art mean IoU of 30.85, reduces mean absolute planning error to 1.0 meter, and runs in real time at 26 FPS on an RTX 4090. Demo videos and code are provided in the supplementary material.

---

## 论文详细总结（自动生成）

### 1. 论文的核心问题与整体含义（研究动机和背景）

- **研究动机**：现有占用世界模型（Occupancy World Models, OWMs）通过3D体素化表示预测未来场景，但通常需要预测完整的未来占用状态，计算开销大且存在冗余。核心挑战在于如何在保持高精度的同时降低模型复杂度与计算成本。
- **整体含义**：本文提出一种新型4D占用世界模型——Delta-Triplane Transformers（DTT），将占用预测聚焦于“变化”而非完整状态，利用3D潜在空间中占用变化的稀疏性，实现更轻量、更高效的自动驾驶运动规划。

### 2. 论文提出的方法论：核心思想、关键技术细节、公式或算法流程

- **核心思想**：采用时变三平面（temporal triplane）作为占用表示，仅建模占用的变化（delta）而非完整未来状态。变化在紧凑的3D潜在空间中天然稀疏，易于建模。
- **关键技术细节**：
  - 首先预训练一个三平面表示模型，将3D占用紧凑地编码为三平面特征。
  - 从历史数据中提取多尺度运动特征，并迭代预测未来的三平面变化（delta）。
  - 将预测的delta与过去状态结合，解码出未来占用和自车运动轨迹。
  - 整体架构基于Transformer，利用变化建模降低参数量和计算量。
- **算法流程（文字说明）**：
  1. 输入历史3D占用序列 → 预训练的三平面编码器 → 得到历史三平面表示。
  2. 多尺度运动特征提取器 → 编码时序运动模式。
  3. 迭代的Transformer预测模块 → 输出未来的三平面变化delta。
  4. 将delta累加到当前状态 → 得到未来三平面表示 → 解码为未来占用体素。
  5. 同时解码出自车运动轨迹（规划误差）。

### 3. 实验设计：使用了哪些数据集 / 场景， benchmark，对比了哪些方法

- **数据集与场景**：论文仅提及“自动驾驶场景”，未明确指定具体数据集名称（例如nuScenes、Waymo等）。从元数据推测可能使用自动驾驶领域标准数据集，但摘要未详述。
- **Benchmark**：使用平均交并比（mean IoU）评估占用预测精度（达到30.85），平均绝对规划误差（mean absolute planning error）评估运动规划（降至1.0米）。
- **对比方法**：未在摘要中列出具体对比基线，但声称达到了“state-of-the-art”的mean IoU和更低的规划误差。可能对比了其他占用世界模型（如VAE-style全状态预测方法）。

### 4. 资源与算力

- **明确说明**：论文提到模型在RTX 4090上以26 FPS实时运行。但未说明训练所需的GPU数量、型号或训练时长。**算力细节缺失**。

### 5. 实验数量与充分性

- **实验数量**：摘要仅报告了最终性能指标，未提及消融实验、不同数据集的对比或超参数研究。结论主要基于单一指标和单一场景（自动驾驶规划），实验数量有限。
- **充分性**：实验设计不够充分——缺少对变化建模有效性、三平面表示选择、迭代预测步数等消融分析，也未在不同数据集或不同噪声条件下验证鲁棒性。公开数据不完整，难以判断公平性。

### 6. 论文的主要结论与发现

- 通过将完整状态预测转为变化建模，模型在更轻量的架构下获得了更高的占用预测精度（mean IoU 30.85）和更低的规划误差（1.0米）。
- 实时性达到26 FPS，满足自动驾驶实际部署需求。
- 变化建模策略是提升占用世界模型效率与准确性的有效途径。

### 7. 优点：方法或实验设计上的亮点

- **方法创新**：首次提出“Delta-Triplane”概念，将变化建模引入占用世界模型，利用稀疏性降低复杂度。
- **表示效率**：三平面表示相比全3D体素大大压缩了潜在空间维度，同时保留几何信息。
- **实时性能**：在消费级GPU（RTX 4090）上达到实时帧率，具有实际部署潜力。
- **规划与感知联合**：模型同时输出未来占用和自车轨迹，端到端支持运动规划。

### 8. 不足与局限

- **实验覆盖不全**：未在多个公开数据集上验证（如nuScenes、Waymo Open Dataset等），仅凭一个mean IoU值难以证明SOTA地位。
- **缺乏消融与分析**：没有隔离变化建模与其他组件的贡献，也没有讨论变化稀疏性的量化分析。
- **评估指标单一**：仅使用IoU和规划误差，缺乏对长时序预测稳定性、异常场景泛化能力的评估。
- **风险与偏差**：可能只在特定环境（如城市道路）上有效，未测试极端天气、传感器噪声等不利条件；代码和补充材料虽提供，但未进行第三方复现验证。
- **算力报告不足**：训练成本未知，难以评估可复现性和经济可行性。
- **被拒因素**：作为ICLR-2026被拒论文，可能审稿人认为上述局限是主要原因。

（完）
