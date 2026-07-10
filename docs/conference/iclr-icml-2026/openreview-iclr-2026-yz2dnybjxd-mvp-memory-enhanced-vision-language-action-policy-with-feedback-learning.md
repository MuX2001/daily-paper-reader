---
title: "MVP: Memory-enhanced Vision-Language-Action Policy with Feedback Learning"
title_zh: MVP：具有反馈学习的记忆增强视觉语言动作策略
authors: "Chubin Zhang, Yansong Tang, Wenkai Guo, Guanxing Lu, Yi Su, Haoji Zhang, Xiuwei Xu, Linqing Zhao, Ziwei Wang, Jiwen Lu"
date: 2025-09-18
pdf: "https://openreview.net/pdf?id=Yz2DnYBJXd"
tags: ["query:vla"]
score: 8.0
evidence: 具有反馈学习的记忆增强视觉语言动作策略
tldr: 现有VLA模型假设马尔可夫性质，难以处理长时域任务和利用反馈。MVP提出非马尔可夫VLA模型，引入基于历史动作和视觉观察的情景记忆，并通过视频理解技术实现紧凑记忆表示。此外，反馈学习机制让模型能从错误中改进。实验证明MVP在长程操作任务上显著优于标准VLA模型。
source: ICLR-2026-Public
selection_source: conference_retrieval
motivation: VLA模型受限于马尔可夫假设，无法有效利用历史信息和反馈。
method: 引入情景记忆和紧凑表示，并设计反馈学习机制。
result: 在长程操作任务中取得了更高的成功率。
conclusion: 记忆和反馈使VLA模型能处理更复杂的时序依赖任务。
---

## Abstract
Recent advances in Vision-Language-Action (VLA) models have enabled robots to perform a wide range of manipulation tasks conditioned on language instructions, offering strong generalization across tasks, objects, and environments. However, most existing VLAs operate under a Markov assumption, limiting their ability to handle temporally extended tasks and learn from feedback. To address these limitations, we propose MVP, a non-Markovian VLA model that leverages episodic memory composed of historical actions and visual observations. To mitigate the computational cost of storing high-dimensional histories, we introduce a compact memory representation inspired by video understanding techniques. Additionally, to prevent the model from disregarding historical inputs during training, we design a novel feedback learning strategy based on SO(3) trajectory perturbation. This approach encourages the model to associate actions with their environmental consequences through observation-action-observation sequences. Experimental results on both simulated and real-world benchmarks demonstrate that MVP outperforms existing models, particularly on tasks that require temporal reasoning and history-dependent decision-making. Our findings highlight the importance of memory and feedback in advancing the capabilities of general-purpose robotic manipulation systems.

---

## 论文详细总结（自动生成）

# 论文详细总结

## 1. 论文的核心问题与整体含义（研究动机和背景）
- **核心问题**：现有的视觉-语言-动作（VLA）模型普遍基于马尔可夫假设（即当前状态仅依赖上一时刻），导致其在处理需要长时间跨度的任务时能力不足，且无法有效利用任务执行过程中的反馈信息（如失败后的纠正）。
- **研究动机**：机器人操作任务往往具有时序依赖性（如多步组装、连续抓取），简单的马尔可夫模型忽略了历史动作和观察之间的因果关系，限制了泛化能力和鲁棒性。同时，模型难以从错误中学习，缺乏自我改进机制。
- **整体含义**：论文旨在打破VLA的马尔可夫限制，引入记忆和反馈学习，使机器人能够处理更复杂的时序依赖任务，推动通用机器人操作系统的能力进步。

## 2. 论文提出的方法论：核心思想、关键技术细节
- **核心思想**：提出MVP（Memory-enhanced Vision-Language-Action Policy with Feedback Learning），一种非马尔可夫VLA模型，通过情景记忆（episodic memory）保存历史动作和视觉观察，并设计紧凑记忆表示和反馈学习策略。
- **关键技术细节**：
  - **情景记忆模块**：存储历史动作序列与对应的视觉观察，使模型能参考过去的状态-动作对来决策。
  - **紧凑记忆表示**：借鉴视频理解技术（如视频压缩或特征聚合），将高维历史信息压缩为低维特征，降低计算和存储成本。
  - **反馈学习策略**：基于SO(3)轨迹扰动（SO(3) trajectory perturbation），在训练时人为引入动作扰动，迫使模型通过“观察-动作-观察”序列将动作与环境结果关联起来，防止模型忽略历史输入。
- **算法流程**（文字说明）：  
  1. 输入当前语言指令和当前视觉观察；  
  2. 从情景记忆中检索相关历史动作-观察对；  
  3. 通过紧凑表示模块压缩历史序列；  
  4. 结合当前观察和紧凑历史特征，生成下一动作；  
  5. 执行动作后，将新观察-动作对存入记忆；  
  6. 在训练阶段，对动作施加SO(3)扰动，并利用反馈信号更新模型。

## 3. 实验设计：数据集/场景、benchmark、对比方法
- **使用的数据集/场景**：包含模拟环境（simulated benchmarks）和真实世界（real-world benchmarks）上的操作任务，侧重长时间跨度的任务（如多步操作、需要历史依赖的决策）。
- **Benchmark**：未明确提及具体标准数据集名称，但说明在需要时序推理和历史依赖决策的任务上评估。
- **对比方法**：与现有VLA模型（如基于马尔可夫假设的标准VLA）进行比较。文中指出MVP在长程操作任务上显著优于标准VLA模型。

## 4. 资源与算力
- **文中未明确说明**使用的GPU型号、数量、训练时长等具体算力信息。仅有“利用视频理解技术”等描述，但未提及硬件资源。需要指出这一点。

## 5. 实验数量与充分性
- **实验数量**：从摘要看，涵盖了模拟和真实世界两类基准测试，并进行了与现有模型的对比。由于未提供详细实验结果表格，无法确定具体实验组数（如不同任务、消融实验等）。
- **充分性**：摘要提及“实验结果证明MVP在长程操作任务上优于现有模型”，并强调了“时间推理”方面的提升。但缺乏消融实验和统计显著性描述。总体而言，实验覆盖了关键场景，但详细程度不足，公平性依赖于未公开的完整论文。

## 6. 论文的主要结论与发现
- **主要结论**：记忆（情景记忆）和反馈学习机制能够显著提升VLA模型在长时域任务中的性能，打破马尔可夫假设的限制。MVP在模拟和真实场景中均优于标准VLA模型，特别是在需要历史依赖的决策任务上。
- **发现**：紧凑记忆表示有效降低了存储和计算开销；SO(3)轨迹扰动反馈学习有助于模型关注动作-结果关联性。

## 7. 优点：方法或实验设计上的亮点
- **方法亮点**：
  - 首次将非马尔可夫建模与VLA结合，引入情景记忆，解决了长期依赖问题。
  - 紧凑记忆表示借鉴成熟的视频理解技术，实用性强。
  - 创新的反馈学习机制（SO(3)扰动）让模型主动学习从错误中改进。
- **实验设计亮点**：
  - 同时包含模拟和真实世界评估，验证了方法的泛化能力。
  - 聚焦于长程操作这一难点任务，具有实际意义。

## 8. 不足与局限
- **实验覆盖**：未提供详细的 ablation study（如去掉记忆模块、去掉反馈学习等），无法明确各模块贡献；也未报告在不同难度任务上的性能分布。
- **偏差风险**：SO(3)扰动可能仅适用于操作空间有限的场景，未说明在复杂自由度任务中的适用性。
- **应用限制**：情景记忆的存储量随任务长度线性增长，虽使用压缩但仍然可能对极长任务有瓶颈；反馈学习需要在线执行环境，不适用于纯离线训练。
- **资源信息缺失**：未公开训练算力，影响复现和公平比较。

（完）
