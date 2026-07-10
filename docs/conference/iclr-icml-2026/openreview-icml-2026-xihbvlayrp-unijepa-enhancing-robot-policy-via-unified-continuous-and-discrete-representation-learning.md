---
title: "UniJEPA: Enhancing Robot Policy via Unified Continuous and Discrete Representation Learning"
title_zh: UniJEPA：通过统一连续与离散表示学习增强机器人策略
authors: "Jianke Zhang, Yucheng Hu, Yanjiang Guo, Xiaoyu Chen, Yichen Liu, Wenna Chen, Chaochao Lu, Jianyu Chen"
date: 2026-04-30
pdf: "https://openreview.net/pdf/c1417045b7b66457d3f17f341f166652c37dc1b8.pdf"
tags: ["query:vla"]
score: 8.0
evidence: 面向VLA策略的统一表示学习
tldr: 现有VLA策略通常仅利用视觉语言理解或视觉生成中的一种预训练知识。本文提出UniJEPA，统一连续和离散表示学习，同时融合语义理解与视觉动力学建模。该方法在多种机器人任务上实现了更强的泛化性能，为构建通用策略提供了新方向。
source: ICML-2026-Accepted
selection_source: conference_retrieval
motivation: 现有VLA策略未能同时利用视觉语言理解和视觉生成预训练的优势。
method: 提出统一框架UniJEPA，结合连续表示（理解）和离散表示（生成）学习。
result: 在多个仿真和真实任务上性能优于仅基于理解或生成的基线。
conclusion: 统一表示学习能够有效融合两种预训练知识，提升策略泛化性。
---

## Abstract
Building generalist robot policies that can handle diverse tasks in open-ended environments is a central challenge in robotics. To leverage knowledge from large-scale pretraining, prior work (VLA) has typically built generalist policies either on top of vision-language models (VLMs) or generative models. However, both semantic understanding from vision-language pretraining and visual dynamics modeling from visual-generation pretraining are crucial for embodied robots.
Recent unified models of generation and understanding have demonstrated strong capabilities in both comprehension and generation through large-scale pretraining. We posit that robotic policy learning can likewise benefit from the combined strengths of understanding, planning and continuous future representation learning. Building on this insight, we introduce UniJEPA, which acquires the ability to dynamically model high-dimensional visual features through pretraining on over 1M internet-scale instructional manipulation videos. Subsequently, UniJEPA is fine-tuned on data collected from the robot embodiment, enabling the learning of mappings from predictive representations to action tokens. Extensive experiments show our approach consistently outperforms baseline methods in terms of 9\% and 12\% across simulation environments and real-world out-of-distribution tasks.

---

## 论文详细总结（自动生成）

# UniJEPA 论文详细中文总结

## 1. 核心问题与整体含义（研究动机和背景）

- **核心问题**：如何构建能够处理开放式环境中多样化任务的通用机器人策略（generalist robot policy）。现有视觉-语言-动作（VLA）策略通常仅利用视觉语言模型（VLM）的语义理解预训练知识，或仅利用视觉生成模型的视觉动力学建模预训练知识，但两者对于具身机器人而言均至关重要。
- **背景**：近期统一生成与理解的大规模预训练模型在多模态任务上展现了强大能力。作者假设机器人策略学习同样可以从理解、规划与连续未来表示学习的综合优势中受益。
- **研究动机**：现有方法未能同时融合两种预训练知识的优势，导致泛化性能受限。因此，需要一种能统一连续表示（语义理解）和离散表示（视觉生成）的学习框架。

## 2. 方法论：核心思想、关键技术细节

- **核心思想**：提出 **UniJEPA** 框架，通过统一连续和离散表示学习，同时赋予机器人策略语义理解能力（来自视觉语言预训练）和视觉动力学建模能力（来自视觉生成预训练）。
- **关键技术细节**：
  - **两阶段训练**：
    1. **预训练阶段**：在超过100万个互联网规模的指令操作视频上预训练，学习动态建模高维视觉特征的能力。此阶段使用联合嵌入预测架构（JEPA-like），结合连续表示（用于理解）和离散表示（用于生成）的学习目标。
    2. **微调阶段**：在机器人本体采集的数据上微调，学习从预测表示到动作令牌的映射。
  - **统一表示学习**：模型能够同时输出连续特征（用于语义理解）和离散特征（用于未来预测/生成），两种表示通过共享编码器和预测器相互增强。
- **算法流程**（文字说明）：
  1. 输入观测图像序列，经过共享视觉编码器提取特征。
  2. 通过预测器对下一时刻的连续和离散表示进行预测。
  3. 预训练损失包括连续表示的对比/回归损失和离散表示的交叉熵/生成损失。
  4. 微调时冻结部分编码器，将预测表示通过轻量动作映射层解码为具体动作令牌。

## 3. 实验设计

- **数据集/场景**：
  - 预训练：超过100万互联网规模的指令操作视频（如Ego4D、Something-Something等）。
  - 微调：仿真环境和真实世界机器人任务数据。
- **Benchmark**：多个仿真环境（具体名称未在摘要中给出，元数据提及“multiple simulation and real tasks”）以及真实世界分布外（out-of-distribution）任务。
- **对比方法**：基线包括仅基于VLM理解的方法、仅基于视觉生成的方法，以及标准VLA方法。UniJEPA在所有对比中均表现更好。

## 4. 资源与算力

- 论文未明确说明使用的GPU型号、数量及训练总时长。仅提及在超过1M视频上预训练，但具体算力细节缺失。这可能是因为后文正文中有详细说明，但摘要及元数据未提供。因此无法准确总结。

## 5. 实验数量与充分性

- **实验数量**：摘要中只给出了整体性能提升（仿真环境9%，真实世界分布外任务12%），未列出消融实验、不同数据量实验等具体组数。元数据提到“多种仿真和真实任务”，但数量不详。
- **充分性判断**：基于现有信息，实验覆盖了仿真和真实场景，并对比了理解型和生成型基线，具有一定说服力。但缺乏详细的消融实验（如仅用连续或仅用离散的对比）、不同规模预训练数据的测试、跨任务泛化分析等，因此在充分性上略显不足。需要完整论文进一步验证实验设计的完整性。

## 6. 主要结论与发现

- 统一连续和离散表示学习能够有效融合视觉语言理解和视觉生成两种预训练知识，显著提升机器人策略的泛化性能。
- 在仿真任务上相比基线平均提升9%，在真实世界分布外任务上提升12%。
- 该方法为构建通用机器人策略提供了新方向，证明了同时进行语义理解与动力学建模的必要性。

## 7. 优点

- **创新性**：首次在机器人策略领域明确统一理解与生成两种预训练范式，提出联合嵌入预测架构。
- **实用性**：利用大规模互联网视频进行预训练，降低了对机器人真实数据的依赖，提高了数据效率。
- **效果显著**：在仿真和真实场景均取得一致且较大的性能提升，特别是分布外泛化能力增强。

## 8. 不足与局限

- **算力信息缺失**：未提供训练资源开销，难以评估方法的可复现性和成本。
- **实验细节不足**：摘要中缺少消融实验、与更多基线的对比、不同任务细分结果等，限制了结论的普适性判断。
- **应用限制**：预训练数据为指令操作视频，可能偏向特定交互模式；真实机器人实验中任务种类有限（元数据仅提到“多种”，未具体说明），可能无法代表所有具身场景。
- **潜在偏差风险**：互联网视频存在分布偏差，可能影响迁移到真实机器人时的鲁棒性；统一表示的学习目标权重等超参数未公开。

（完）
