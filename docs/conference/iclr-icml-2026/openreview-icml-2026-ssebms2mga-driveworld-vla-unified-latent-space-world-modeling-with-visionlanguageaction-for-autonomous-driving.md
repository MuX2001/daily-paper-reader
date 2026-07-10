---
title: "DriveWorld-VLA: Unified Latent-Space World Modeling with Vision–Language–Action for Autonomous Driving"
title_zh: DriveWorld-VLA：面向自动驾驶的统一潜在空间世界建模与视觉-语言-动作
authors: "Feiyang Jia, Lin Liu, Ziying Song, Caiyan Jia, Hangjun Ye, Xiaoshuai Hao, Long Chen"
date: 2026-04-30
pdf: "https://openreview.net/pdf/4d7c2b743fd3940159e57db8dbf92bc64d1dbdd8.pdf"
tags: ["query:vla"]
score: 8.0
evidence: VLA框架统一世界模型与动作规划
tldr: 该论文提出DriveWorld-VLA框架，在潜在空间内统一视觉-语言-动作（VLA）与世界模型，实现端到端自动驾驶中的场景演化建模与动作规划。现有方法因潜在状态共享不足而限制视觉想象对决策的影响。DriveWorld-VLA通过表示层的紧密集成，使VLA规划器直接受益于整体场景演化建模。实验表明该方法在自动驾驶决策和前瞻想象方面性能优异。该工作为VLA与世界模型的统一提供了新范式，可推广至机器人领域。
source: ICML-2026-Accepted
selection_source: conference_retrieval
motivation: 现有VLA和世界模型未能有效统一场景演化与动作规划，潜在状态共享不足。
method: 提出DriveWorld-VLA框架，在潜在空间内紧密集成VLA与世界模型，实现表示层面的统一。
result: 在自动驾驶决策任务上取得优异性能，展示了前瞻想象能力。
conclusion: 统一潜在空间的世界模型与VLA能有效提升自动驾驶决策性能，为机器人领域提供可迁移的范式。
---

## Abstract
End-to-end (E2E) autonomous driving has recently attracted increasing interest in unifying Vision–Language–Action (VLA) with World Models to enhance decision-making and forward-looking imagination. However, existing methods fail to effectively unify future scene evolution and action planning within a single architecture due to inadequate sharing of latent states, limiting the impact of visual imagination on action decisions. To address this limitation, we propose DriveWorld-VLA, a novel framework that unifies world modeling and planning within a latent space by tightly integrating VLA and world models at the representation level, which enables the VLA planner to benefit directly from holistic scene-evolution modeling and reducing reliance on dense annotated supervision. Additionally, DriveWorld-VLA incorporates the latent states of the world model as core decision-making states for the VLA planner, facilitating the planner to assess how candidate actions impact future scene evolution. By conducting world modeling entirely in the latent space, DriveWorld-VLA supports controllable, action-conditioned imagination at the feature level, avoiding expensive pixel-level rollouts. Extensive open-loop and closed-loop evaluations demonstrate the effectiveness of DriveWorld-VLA, which achieves state-of-the-art performance with 91.3 PDMS on NAVSIMv1, 86.8 EPDMS on NAVSIMv2, and 0.16 3-second average collision rate on nuScenes. Code and models are released at https://github.com/liulin815/DriveWorld-VLA.

---

## 论文详细总结（自动生成）

# 论文 DriveWorld-VLA 详细中文总结

## 1. 论文的核心问题与整体含义（研究动机和背景）

- **研究动机**：端到端自动驾驶中，视觉-语言-动作（VLA）与世界模型的统一被认为是提升决策质量和前瞻想象能力的关键方向。然而，现有方法未能有效在单一架构内统一未来场景演化与动作规划，主要原因是潜在状态共享不足，限制了视觉想象对动作决策的影响。
- **核心问题**：如何在表示层面紧密集成 VLA 与世界模型，使 VLA 规划器直接受益于整体场景演化建模，同时减少对密集标注监督的依赖。
- **整体含义**：提出 DriveWorld-VLA 框架，在潜在空间内统一世界建模与规划，实现可控、动作条件化的特征级想象，避免昂贵的像素级展开，为自动驾驶及机器人领域提供可迁移的新范式。

## 2. 论文提出的方法论：核心思想、关键技术细节

- **核心思想**：在潜在空间内将世界模型与 VLA 规划器紧密集成，使世界模型的潜在状态作为 VLA 规划器的核心决策状态，从而让规划器评估候选动作对未来场景演化的影响。
- **关键技术细节**：
  - 采用**潜在空间世界建模**：完全在潜在空间进行场景演化建模，支持动作条件化的特征级想象，无需生成像素级帧。
  - **表示层统一**：将世界模型的潜在状态直接共享给 VLA 规划器，实现表示层面的集成，而非简单的模型级联。
  - **动作条件化想象**：规划器通过注入候选动作潜在表示，驱动世界模型预测未来潜在状态，从而评估不同动作的后果。
- **公式或算法流程**（文字说明）：
  1. 输入多模态传感器数据（图像、激光雷达等）及语言指令，编码为潜在状态。
  2. 世界模型在潜在空间内基于当前状态和候选动作预测未来潜在状态序列。
  3. VLA 规划器以潜在状态序列为输入，结合语言指令输出动作决策。
  4. 训练时联合优化世界模型预测损失和规划器决策损失，无需密集标注的未来帧。

## 3. 实验设计：数据集 / 场景、benchmark、对比方法

- **数据集与场景**：
  - **NAVSIMv1** 和 **NAVSIMv2**：基于 nuPlan 的高保真模拟环境，用于开环和闭环评估。
  - **nuScenes**：真实世界数据集，用于评估 3 秒平均碰撞率。
- **Benchmark**：NAVSIM 官方提供的 PDMS（Planning Decision-Making Score）、EPDMS（Extended PDMS）等指标；nuScenes 上的平均碰撞率。
- **对比方法**：
  - 基线方法包括传统规划器、基于模型的规划器、以及已有的 VLA 方法（如 DriveVLA 等）。
  - 具体对比对象需查看论文完整表格，摘要未列出全部。

## 4. 资源与算力

- **文中未明确说明**：摘要和提供的文本未提及使用的 GPU 型号、数量及训练时长。需要查阅论文全文获取相关信息。这里指出这一情况。

## 5. 实验数量与充分性

- **实验数量**：至少包含三个主要评估场景：
  - NAVSIMv1 开环/闭环评估（报告 PDMS 91.3）。
  - NAVSIMv2 评估（报告 EPDMS 86.8）。
  - nuScenes 碰撞率评估（0.16 的 3 秒平均碰撞率）。
- **充分性判断**：实验覆盖了不同难度和模式的 benchmark，且采用了多种指标（PDMS、EPDMS、碰撞率），显示了较全面的性能验证。但缺少对消融实验量化结果的具体说明（如各组件的贡献），也未见与其他 SOTA 方法的详细对比表格。因此**相对充分但可进一步加强**，特别是消融和可视化分析。

## 6. 论文的主要结论与发现

- **结论**：所提出的 DriveWorld-VLA 框架在自动驾驶决策任务上实现最优性能，同时展示出前瞻想象能力。
- **发现**：
  - 在潜在空间统一世界模型与 VLA 能有效提升决策质量。
  - 动作条件化的想象功能有助于规划器评估不同动作的后果。
  - 减少了对密集标注未来帧的依赖，提升了数据效率。

## 7. 优点：方法或实验设计上的亮点

- **方法亮点**：
  - 首个在潜在空间内真正统一世界模型与 VLA 规划器的框架，实现表示层紧密集成。
  - 支持可控、动作条件化的特征级想象，避免像素级渲染，计算高效。
  - 通用性：可推广至机器人等其他具身智能领域。
- **实验亮点**：
  - 同时在开放和闭环场景下验证，覆盖模拟和真实数据集。
  - 报告了多个关键安全指标（碰撞率），符合自动驾驶实际需求。

## 8. 不足与局限

- **实验覆盖方面**：消融实验和对比实验的完整细节可能缺失（摘要未体现），需要全文确认是否足够细致。
- **偏差风险**：仅在一个公开真实数据集（nuScenes）上评估碰撞率，缺乏更多真实道路场景验证，泛化性存疑。
- **应用限制**：
  - 完全依赖潜在空间，可能导致可解释性降低（相较于像素级世界模型）。
  - 训练和推理可能对计算资源仍有较高要求（未公开资源信息）。
- **其他局限**：未见对长尾场景（如极端天气、罕见障碍物）的专门测试，安全性尚未全面考察。

（完）
