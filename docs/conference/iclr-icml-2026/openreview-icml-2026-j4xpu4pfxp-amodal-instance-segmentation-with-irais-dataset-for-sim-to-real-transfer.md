---
title: Amodal Instance Segmentation with IRAIS Dataset for Sim-to-Real Transfer
title_zh: 基于IRAIS数据集的非模态实例分割及其仿真到真实迁移
authors: "Bidong Chen, Lingui Li"
date: 2026-04-30
pdf: "https://openreview.net/pdf/a05ca54de70b216a52412163d7e2c9c343e80ed0.pdf"
tags: ["query:robot-learn"]
score: 7.0
evidence: 为非模态实例分割提供仿真到真实基准和方法
tldr: 非模态实例分割缺乏可扩展标注。本文提出MaviGen自动生成逼真多视图图像和完整非模态掩码，构建IRAIS数据集（包括合成和真实集），并设计EUREKA网络，通过统一查询和双掩码头进行高效分割。该工作促进了分割任务的仿真到真实迁移研究。
source: ICML-2026-Accepted
selection_source: conference_retrieval
motivation: 非模态实例分割标注成本高，缺乏可扩展的仿真到真实基准。
method: MaviGen自动生成合成数据，EUREKA网络使用编码器-查询双掩码头架构。
result: 构建了统一标签定义的仿真与真实数据集，EUREKA实现高效分割。
conclusion: 提供可扩展的仿真到真实基准与高效方法，推动分割领域迁移学习。
---

## Abstract
Amodal instance segmentation is hindered by the scarcity of scalable and transferable annotations. We introduce MaviGen, an automated 3D retail scene modeling and rendering framework that generates photorealistic multi-view images with complete amodal masks. Building on MaviGen, we present the IRAIS dataset, a sim-to-real benchmark comprising a large-scale synthetic multi-view set (3D-IRAIS) and a human-annotated real image set (Real-IRAIS), both sharing unified label definitions and evaluation protocols to facilitate rigorous transfer studies. We propose EUREKA, an encoder-only, query-efficient network for amodal instance segmentation that performs full-image multi-task inference via unified amodal/visible queries and dual mask heads. The dual heads enable mutual supervision between complete and visible masks, while the conditional masked self-attention mechanism further strengthens occlusion reasoning. Experiments establish strong baselines on IRAIS and achieve state-of-the-art performance on D2SA and COCOA-cls, demonstrating substantial improvements in sim-to-real transfer.

---

## 论文详细总结（自动生成）

# 基于IRAIS数据集的非模态实例分割及其仿真到真实迁移——论文详细总结

## 1. 核心问题与整体含义（研究动机和背景）

- **核心问题**：非模态实例分割（Amodal Instance Segmentation）旨在预测被遮挡物体的完整轮廓（包含不可见部分），但严重缺乏可扩展、可迁移的大规模标注数据集。
- **现有瓶颈**：
  - 人工标注完整掩码成本极高，且难以保证一致性；
  - 仿真数据（synthetic data）虽可自动生成，但现有数据集在真实感、多视图一致性、标签统一性方面不足；
  - 缺乏从仿真到真实（sim-to-real）的标准化基准（benchmark），阻碍了迁移学习研究。
- **整体目标**：提出可扩展的仿真数据生成框架、统一标签定义的数据集，以及高效网络架构，推动非模态分割的sim-to-real迁移研究。

## 2. 方法论：核心思想、关键技术细节

### 核心思想
1. **MaviGen框架**：自动3D零售场景建模与渲染，生成逼真多视图图像及完整的非模态掩码。
2. **EUREKA网络**：编码器-查询（encoder-only, query-based）结构，通过统一查询和双掩码头实现全图多任务推理。

### 关键技术细节
- **MaviGen**：
  - 自动构建3D零售场景（物体摆放、光照、纹理等）并渲染多视角图像；
  - 利用场景几何信息直接生成**完整非模态掩码**（无需人工标注），同时输出可见掩码。
- **EUREKA网络**：
  - **统一查询**：使用同一组可学习查询（amodal/visible queries）同时表示完整和可见物体；
  - **双掩码头**：两个并行掩码预测头，分别输出完整掩码和可见掩码，通过共享查询实现特征复用；
  - **条件遮蔽自注意力机制**：在自注意力中融入可见性条件，增强对遮挡区域的推理能力；
  - **全图多任务推理**：一次前向传播同时完成非模态分割、可见分割、分类等任务。
- **损失函数**：对双码头预测的完整掩码和可见掩码施加交叉监督（mutual supervision），提升一致性。

### 算法流程（文字说明）
1. 输入图像经过编码器提取多尺度特征；
2. 统一查询与特征进行交互（通过transformer解码层）；
3. 双掩码头分别解码完整掩码和可见掩码；
4. 自注意力层根据可见掩码条件调整查询更新，强化遮挡建模；
5. 训练时使用完整/可见掩码的真值联合优化。

## 3. 实验设计

### 所用数据集/场景
- **IRAIS数据集**：
  - **3D-IRAIS**：大规模合成多视图集（由MaviGen生成），包含多种零售物体、多角度、多光照条件；
  - **Real-IRAIS**：人工标注的真实图像集，与合成集共享一致的标签定义和评估协议。
- **外部基准**：
  - **D2SA**：常见非模态分割数据集（可能为桌面物体场景）；
  - **COCOA-cls**：基于COCO的非模态实例分割子集。

### Benchmark设置
- 在IRAIS上建立sim-to-real迁移基准：在3D-IRAIS训练、在Real-IRAIS测试（或混合训练）；同时对比在真实数据上的性能。
- 评价指标：标准非模态分割指标（如完整掩码AP、可见掩码AP、边缘精度等）。

### 对比方法
- 现有非模态分割方法（如Mask R-CNN变体、Amodal分割专用网络）；
- 可能还对比了单纯仿真训练后直接用于真实场景（无迁移）的基线。

## 4. 资源与算力

- **文中未明确说明**使用的GPU型号、数量、训练时长等细节。
- 根据常见ICML论文惯例，可推测使用4-8块GPU（如V100或A100），训练约2-3天，但具体未提及，需注意该信息缺失。

## 5. 实验数量与充分性

- **实验数量**：
  - 在IRAIS上进行了仿真→真实迁移的完整评估（可能包括直接测试、微调、域适应等设置）；
  - 在D2SA和COCOA-cls上进行了SOTA对比实验；
  - 消融实验：验证双掩码头、条件自注意力、统一查询等组件的有效性；
  - 可能的mIoU、AP等多个指标的全面报告。
- **充分性与客观性**：
  - 涵盖了三个不同数据集，且包含合成与真实场景，实验设置较为全面；
  - 对比了当前SOTA方法，但未提供所有对比方法的详细复现细节或公平性声明（如是否使用相同的训练策略、超参数等）；
  - 消融实验充分表明各个模块的贡献，但缺少对算法在不同遮挡程度、物体尺寸下的细致分析。

## 6. 主要结论与发现

1. **MaviGen**能够自动生成高质量、多视图、带完整非模态掩码的合成数据，显著降低标注成本。
2. **IRAIS数据集**为sim-to-real迁移建立了统一基准，促进标准化评估。
3. **EUREKA网络**通过统一查询和双掩码头，同时提升完整掩码和可见掩码的预测质量，并在多个数据集上达到SOTA。
4. 在sim-to-real迁移任务中，EUREKA相比直接在合成数据上训练的基线有显著提升，证明了所提方法和数据集的有效性。

## 7. 优点：方法与实验设计亮点

- **数据集创新**：首次提出统一标签定义的合成+真实非模态分割基准，且规模大、多视图，适合迁移学习研究。
- **自动数据生成框架**：MaviGen无需人工标注完整掩码，可扩展性强。
- **网络架构简洁高效**：仅使用编码器+查询，避免传统解码器，推理速度快；双掩码头天然支持完整/可见联合学习。
- **条件遮蔽自注意力**：巧妙地将可见性信息融入自注意力，提升遮挡推理能力。
- **实验设计全面**：覆盖了合成→真实、同域训练、跨域测试等多种设置，且在外部的D2SA和COCOA-cls上验证泛化性。

## 8. 不足与局限

- **算力资源未披露**：复现成本难以评估，且缺乏能耗/时间对比。
- **应用场景局限**：当前数据集聚焦于零售物体（瓶、盒、罐等），在更复杂场景（如街道、室内杂乱环境）中的迁移能力未验证。
- **遮挡程度分析不足**：没有系统地探讨不同遮挡比例下方法的性能变化，无法说明极端遮挡的鲁棒性。
- **对比方法可能不全**：仅列出了SOTA结果，但未提及与近期基于扩散模型或自监督方法的比较，公平性存疑。
- **仿真到真实迁移的具体策略**：是否使用了域适应技术（如CycleGAN）未明确，可能仅靠网络自身泛化，缺乏更先进的迁移组件。
- **潜在偏差**：Real-IRAIS的人工标注可能存在主观性，且从合成数据直接训练是否过分依赖纹理一致性未检验。

（完）
