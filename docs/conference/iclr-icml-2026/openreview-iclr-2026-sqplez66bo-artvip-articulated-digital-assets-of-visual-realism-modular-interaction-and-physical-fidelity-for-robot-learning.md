---
title: "ArtVIP: Articulated Digital Assets of Visual Realism, Modular Interaction, and Physical Fidelity for Robot Learning"
title_zh: ArtVIP：面向机器人学习的视觉真实、模块化交互与物理保真的铰接数字资产
authors: "Zhao Jin, Zhengping Che, Tao Li, Zhen Zhao, Kun Wu, Yuheng Zhang, Yinuo Zhao, Zehui Liu, Qiang Zhang, Xiaozhu Ju, Jing Tian, Yousong Xue, Jian Tang"
date: 2026-01-26
pdf: "https://openreview.net/pdf?id=SqPLEZ66BO"
tags: ["query:robot-learn"]
score: 7.0
evidence: 高质量铰接数字资产用于仿真到现实迁移
tldr: 机器人学习依赖仿真，但现有铰接物体数据集视觉真实感和物理保真度不足，阻碍sim-to-real迁移。本文提出ArtVIP，由专业建模师制作的高质量数字孪生铰接物体及室内场景数据集，统一标准确保视觉和物理真实性。该数据集为训练精细操作模型提供了关键资源。
source: ICLR-2026-Accepted
selection_source: conference_retrieval
motivation: 现有仿真数据集视觉和物理保真度低，限制了sim-to-real迁移效果。
method: 构建ArtVIP数据集，包含由专业3D建模师制作的高质量铰接物体和场景资产。
result: 数据集在视觉质量和物理仿真准确度上显著优于现有开源数据集。
conclusion: 高质量数字资产是弥合sim-to-real差距的重要基础设施。
---

## Abstract
Robot learning increasingly relies on simulation to advance complex abilities such as dexterous manipulation and precise interaction, necessitating high-quality digital assets to bridge the sim-to-real gap. However, existing open-source articulated-object datasets for simulation are limited by insufficient visual realism and low physical fidelity, which hinders their utility for training models to master robotic tasks in the real world. To address these challenges, we introduce ArtVIP, a comprehensive open-source dataset comprising high-quality digital-twin articulated objects, accompanied by indoor-scene assets. Crafted by professional 3D modelers adhering to unified standards, ArtVIP ensures visual realism through precise geometric meshes and high-resolution textures, while physical fidelity is achieved via fine-tuned dynamic parameters. Meanwhile, the dataset pioneers embedded modular interaction behaviors within assets and pixel-level affordance annotations. Feature-map visualization and optical motion capture are employed to quantitatively demonstrate ArtVIP’s visual and physical fidelity, and its applicability is validated through imitation learning and reinforcement learning experiments. Provided in USD format with detailed production guidelines, ArtVIP is fully open-source, benefiting the research community and advancing robot learning research.

---

## 论文详细总结（自动生成）

# 论文详细中文总结

## 1. 核心问题与整体含义（研究动机和背景）

- 机器人学习日益依赖仿真环境来发展复杂操作能力（如灵巧操控、精细交互），但仿真到现实（sim-to-real）的迁移需要高质量的数字资产作为桥梁。
- 目前开源铰接物体数据集在视觉真实感（几何网格精度、纹理分辨率）和物理保真度（动力学参数准确性）两方面均存在严重不足，限制了机器人从仿真训练中获得的技能向真实世界的泛化能力。
- 本文提出 **ArtVIP** 数据集，旨在通过专业建模师制作的高质量数字孪生铰接物体及室内场景资产，统一标准确保视觉与物理真实性，为机器人学习提供关键基础设施。

## 2. 方法论：核心思想、关键技术细节

- **核心思想**：构建一个全面的、高质量的铰接数字资产数据集，包含：
  - 由专业3D建模师遵循统一标准制作的数字孪生铰接物体。
  - 配套室内场景资产。
- **关键技术细节**：
  - **视觉真实感**：通过精确的几何网格和高分辨率纹理实现。
  - **物理保真度**：通过微调动力学参数（如关节摩擦力、阻尼、刚度等）达到。
  - **模块化交互行为**：数据集首创性地在资产内嵌了模块化的交互行为定义，便于机器人快速获取物体功能知识。
  - **像素级可通行性标注（affordance annotations）**：为每个物体提供像素级的功能区域标注，支持视觉推理任务。
  - **格式与规范**：数据集以 USD（Universal Scene Description）格式发布，并附有详细的制作指南，确保可复用性和扩展性。

## 3. 实验设计

- 由于全文未公开，仅从摘要可知：
  - **使用的数据集/场景**：ArtVIP 自身的高质量铰接物体和室内场景资产；实验中可能用到其他开源数据集（如 ShapeNet、PartNet-Mobility 等）作为对比基准。
  - **Benchmark**：未明确，但文中提及通过特征图可视化（Feature-map visualization）和光学运动捕捉（optical motion capture）定量展示视觉与物理保真度；通过模仿学习和强化学习实验验证数据集的适用性。
  - **对比方法**：文中未列出具体对比方法名称，但暗示与现有开源数据集（视觉和物理保真度较低）进行对比。

## 4. 资源与算力

- 摘要及元数据中 **未明确说明** 使用的 GPU 型号、数量、训练时长等算力细节。
- 仅提到制作过程由专业建模师完成，未涉及大规模计算资源消耗。因此，无法总结具体算力信息。

## 5. 实验数量与充分性

- **实验数量**：文中仅提到进行了特征图可视化、光学运动捕捉验证，以及模仿学习和强化学习实验。具体实验组数、消融实验等细节未提供。
- **充分性与客观性**：由于缺乏全文细节，难以评估实验的充分性。但从元数据得分（7.0）和会议接收（ICLR-2026）推测，实验设计应较为严谨，且包含定量对比。但未提供消融实验、基准方法对比的具体数量，可能略显单薄。

## 6. 主要结论与发现

- ArtVIP 数据集在视觉质量（几何精度与纹理分辨率）和物理仿真准确度（动力学参数）上显著优于现有的开源数据集。
- 该数据集能够有效支持机器人学习中的模仿学习和强化学习任务，有助于弥合 sim-to-real 差距。
- 开源格式（USD）和详细制作指南有利于研究社区广泛使用和进一步扩展。

## 7. 优点

- **高质量资产**：由专业建模师统一制作，视觉真实感和物理保真度高，解决了现有数据集的两大短板。
- **创新性**：首次在铰接物体资产中嵌入模块化交互行为，并提供像素级可通行性标注，增强了资产的功能语义信息。
- **标准化与可用性**：采用 USD 格式并附制作指南，易于集成到主流仿真平台（如 Isaac Sim、PyBullet 等），促进社区共建。
- **定量验证**：使用特征图可视化和光学运动捕捉等多种手段定量验证数据集的视觉与物理质量，方法科学。

## 8. 不足与局限

- **实验细节缺失**：全文未公开，无法评估消融实验、跨场景泛化测试以及与其他方法的严格对比（如基线方法的数量、性能指标）。
- **规模未知**：未说明数据集包含的具体物体数量和场景数量，可能限制了泛化能力的评估。
- **算力消耗未被报告**：训练机器人策略所需的计算资源未知，不利于复现和资源预算。
- **应用局限**：数据集主要面向精细操作仿真，可能不适用于其他类型任务（如导航、抓取非铰接物体）。
- **偏差风险**：资产由专业建模师制作，风格可能与真实世界存在系统性偏差（如纹理、关节运动范围等），需进一步测试 sim-to-real 迁移的实际效果。

（完）
