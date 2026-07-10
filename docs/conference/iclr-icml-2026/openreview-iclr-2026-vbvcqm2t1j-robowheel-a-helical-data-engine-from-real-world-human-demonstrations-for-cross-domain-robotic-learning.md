---
title: "ROBOWHEEL: A HELICAL DATA ENGINE FROM REAL-WORLD HUMAN DEMONSTRATIONS FOR CROSS-DOMAIN ROBOTIC LEARNING"
title_zh: 机器人轮：从真实世界人类演示中提取螺旋数据引擎实现跨域机器人学习
authors: "Yuhong Zhang, Zihan Gao, Shengpeng Li, Ling-Hao Chen, Kaisheng Liu, Runqing Cheng, Xiao Lin, Junjia Liu, Zhuoheng Li, Jingyi Feng, Ziyan He, Jintian Lin, Zheyan Huang, Zhifang Liu, Haoqian Wang"
date: 2025-09-02
pdf: "https://openreview.net/pdf?id=VBVCqm2t1J"
tags: ["query:robot-learn"]
score: 9.0
evidence: 基于Isaac Sim的仿真增强框架，结合多样化域随机化
tldr: 论文针对跨形态机器人学习中数据稀缺的问题，提出ROBOWHEEL数据引擎，从真实世界手物交互视频重建高精度轨迹，并通过强化学习优化器保证物理合理性，再通过Isaac Sim仿真增强实现领域随机化与跨本体迁移。实验表明该方法能有效生成可执行动作并提升泛化能力，为机器人学习提供大规模数据来源。
source: ICLR-2026-Public
selection_source: conference_retrieval
motivation: 跨形态机器人学习受限于大规模真实数据的收集成本，需要从头获取标注数据。
method: 提出螺旋数据引擎，从RGB视频重建手物交互轨迹，使用RL优化器调整姿态，并利用Isaac Sim进行仿真增强和域随机化，将轨迹重定向到不同形态的机器人。
result: 在多种机器人平台（机械臂、灵巧手、人形机器人）上成功生成可执行动作和轨迹，并提升泛化能力。
conclusion: 该数据引擎可有效扩大机器人学习的规模，降低数据收集成本，有助于实现从人类演示到机器人的技能迁移。
---

## Abstract
We introduce robowheel, a helical data engine that converts in-the-wild human hand–object interaction (HOI) videos into training-ready supervision for cross-morphology robotic learning. From monocular RGB/RGB-D inputs, we perform high-precision HOI reconstruction and enforce physical plausibility via a reinforcement learning optimizer that refines hand–object relative poses under contact and penetration constraints. The reconstructed, contact-rich trajectories are then retargetted to cross-domain embodiments, robot arms with simple end-effectors, dexterous hands, and humanoids, yielding executable actions and rollouts. To scale coverage, we build a simulation-augmented framework on Isaac Sim with diverse domain randomization (body variants, trajectories, object replacement, background changes, hand motion mirroring), which expands observations and labels while preserving contact semantics. This process forms an end-to-end pipeline from video → reconstruction → retargeting → augmentation → data acquisition, closing the loop for iterative policy improvement. Across vision-language-action and imitation-learning settings, \nbname-generated data provides reliable supervision and consistently improves task performance over baselines, enabling direct use of Internet HOI videos (hand-only or upper-body) as labels for scenario-specific training. We further assemble a large-scale multimodal dataset combining multi-camera captures, monocular videos, and public HOI corpora, and demonstrate transfer on dexterous-hand and humanoid platforms.

---

## 论文详细总结（自动生成）

# ROBOWHEEL 论文详细总结

## 1. 论文的核心问题与整体含义

- **研究动机**：跨形态机器人学习（如机械臂、灵巧手、人形机器人）面临大规模真实数据收集成本高昂的瓶颈，现有数据集往往需要从头标注或依赖特定硬件采集，难以利用互联网上海量的手物交互视频。
- **整体含义**：提出一种“螺旋数据引擎”ROBOWHEEL，从野外单目RGB/RGB-D视频中自动重建手物交互轨迹，并通过仿真增强与领域随机化，生成可执行且物理合理的跨形态机器人训练数据，从而降低数据获取成本，推动机器人学习规模化发展。

## 2. 论文提出的方法论

- **核心思想**：构建一个闭环数据引擎，将互联网视频数据转化为机器人可用的监督信号，并通过迭代策略改进形成螺旋上升的循环。
- **关键技术细节**：
  - **高精度HOI重建**：从单目RGB/RGB-D输入重建手与物体的相对位姿。
  - **物理合理性优化**：利用强化学习（RL）优化器，在接触约束和穿透惩罚下调整手-物体相对姿态，确保轨迹物理可执行。
  - **跨形态重定向**：将重建的、富含接触的轨迹重定向到不同形态的机器人本体（机械臂+简单末端执行器、灵巧手、人形机器人），生成可执行动作序列与 rollout。
  - **仿真增强框架**：基于Isaac Sim构建，引入多样化域随机化（身体变体、轨迹扰动、物体替换、背景变化、手部运动镜像），在保持接触语义的同时扩展观测与标签。
- **端到端流水线**：视频 → 重建 → 重定向 → 增强 → 数据获取，形成闭环，支持迭代策略改进。
- **无公式化说明**：文中未给出具体数学公式，但强调RL优化器与域随机化策略的重要性。

## 3. 实验设计

- **使用数据集**：论文声称组装了一个大规模多模态数据集，包含多相机捕获、单目视频以及公开HOI语料库。具体数据集名称未明确列出。
- **基准（Benchmark）**：未明确指定统一基准，但实验涉及视觉-语言-动作（VLA）和模仿学习（Imitation Learning）两种设置。
- **对比方法**：未明确指出对比基线名称，仅提及“相对于基线方法，ROBOWHEEL生成的数据持续提升任务性能”。

## 4. 资源与算力

- **文中未明确说明**：未提及使用的GPU型号、数量、训练时长等算力信息。仅提及使用Isaac Sim进行仿真增强，但未提供硬件配置。

## 5. 实验数量与充分性

- **实验数量**：论文提及在多种机器人平台（机械臂、灵巧手、人形机器人）上测试，并在VLA和模仿学习设置下评估。但未给出具体实验组数（如消融实验、不同域随机化策略对比等）。
- **充分性评估**：
  - **优点**：覆盖了多种形态的机器人，验证了跨域迁移能力；使用了多模态数据集，具有现实代表性。
  - **不足**：缺乏与现有数据生成方法（如基于仿真合成或手动标注）的定量对比；未提供详细消融实验（如RL优化器、域随机化各成分的贡献）；实验结果以定性描述为主，缺乏统计显著性检验。

## 6. 论文的主要结论与发现

- ROBOWHEEL数据引擎能有效将互联网HOI视频转换为跨形态机器人的可执行轨迹。
- 基于该方法生成的数据，在VLA和模仿学习任务上持续优于基线方法。
- 实现了从人类演示到不同机器人形态的技能迁移，尤其在灵巧手和人形机器人平台上展示出潜力。
- 该螺旋引擎可闭环迭代改进策略，为大规模机器人学习提供可持续的数据来源。

## 7. 优点

- **数据来源广泛**：直接利用互联网上的单目HOI视频，极大降低了数据采集成本。
- **跨形态适配**：通过重定向支持机械臂、灵巧手、人形机器人等多种本体。
- **物理合理性保证**：引入RL优化器处理接触和穿透约束，提高轨迹的可执行性。
- **仿真增强与域随机化**：基于Isaac Sim构建的框架，在不破坏接触语义的前提下扩展数据多样性，有助于提升泛化能力。
- **闭环设计**：支持策略更新后的数据再生成，形成持续改进的螺旋上升结构。

## 8. 不足与局限

- **实验透明性不足**：未提供与经典数据生成方法的直接对比（如基于动捕、仿真随机采样），难以评判绝对优势。
- **算力与效率未报告**：缺少时间、显存等消耗，难以评估实际部署成本。
- **消融分析缺失**：未量化RL优化器、域随机化各组件对最终性能的贡献。
- **偏差风险**：依赖互联网视频中的常见手物交互，可能无法覆盖长尾场景或罕见物体；单目重建精度受限于RGB-D质量及姿态估计误差。
- **应用限制**：重定向至人形机器人时，可能因人体与机器人运动学差异导致动作失真；仿真增强的真实度受限于Isaac Sim物理引擎精度。

（完）
