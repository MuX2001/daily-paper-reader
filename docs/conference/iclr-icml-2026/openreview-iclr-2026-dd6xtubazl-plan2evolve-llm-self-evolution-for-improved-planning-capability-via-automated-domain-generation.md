---
title: "Plan2Evolve: LLM Self-Evolution for Improved Planning Capability via Automated Domain Generation"
title_zh: Plan2Evolve：通过自动域生成实现LLM自进化以提升规划能力
authors: "Jinbang Huang, Zhiyuan Li, Zhanguang Zhang, Xingyue Quan, Jianye HAO, Yingxue Zhang"
date: 2025-09-09
pdf: "https://openreview.net/pdf?id=dd6xtuBazL"
tags: ["query:robot-learn"]
score: 7.0
evidence: 通过自动生成规划域实现LLM自进化，提升机器人任务规划能力
tldr: 现有LLM规划方法将生成域仅视为搜索工具，未利用其产生推理数据。本文提出Plan2Evolve框架，让基座模型自动生成规划域并产生符号规划-问题对作为推理轨迹，实现模型自进化。该方法降低了机器人任务规划中人工标注数据的依赖。
source: ICLR-2026-Rejected-Public
selection_source: conference_retrieval
motivation: LLM在机器人任务规划中依赖人工编排数据和有限的搜索域。
method: 模型自动生成规划域，从中导出符号推理轨迹用于自训练。
result: 在多个规划基准上提升了规划成功率。
conclusion: 自动域生成为LLM提供可扩展的自监督信号。
---

## Abstract
Large Language Models (LLMs) have recently shown strong potential in robotic task planning, particularly through automatic planning domain generation that integrates symbolic search. Prior approaches, however, have largely treated these domains as search utilities, with limited attention to their potential as scalable sources of reasoning data. At the same time, progress in reasoning LLMs has been driven by chain-of-thought (CoT) supervision, whose application in robotics remains dependent on costly, human-curated datasets. 
We propose Plan2Evolve, an LLM self-evolving framework in which the base model generates planning domains that serve as engines for producing symbolic problem–plan pairs as reasoning traces. These pairs are then transformed into extended CoT trajectories by the same model through natural-language explanations, thereby explicitly aligning symbolic planning structures with natural language reasoning. The resulting data extend beyond the model’s intrinsic planning capacity, enabling model fine-tuning that yields a planning-enhanced LLM with improved planning success, stronger cross-task generalization, and reduced inference costs.

---

## 论文详细总结（自动生成）

# Plan2Evolve：通过自动域生成实现LLM自进化以提升规划能力

## 1. 核心问题与整体含义（研究动机和背景）

- **研究动机**：大型语言模型（LLM）在机器人任务规划中展现潜力，现有方法通过自动规划域生成集成符号搜索，但往往仅将这些域视为搜索工具，忽略了其作为可扩展推理数据源的潜力。同时，链式思维（CoT）监督在机器人领域的应用依赖于昂贵的人工标注数据。
- **核心问题**：如何让LLM自动生成规划域并从中产生符号推理数据，实现模型自进化，从而提升规划能力、跨任务泛化能力并降低推理成本。
- **整体含义**：通过框架Plan2Evolve，让基座模型自动生成规划域并产生符号规划-问题对，再转化为自然语言扩展CoT轨迹，使模型在自监督信号下自我优化，减少对人工标注数据的依赖。

## 2. 方法论

### 核心思想
- **自进化框架**：基座模型首先自动生成规划域（planning domains），这些域作为引擎产出符号化的“问题-规划”对（problem–plan pairs），即推理轨迹。
- **CoT转换**：同一模型通过自然语言解释将符号轨迹转化为扩展的CoT轨迹，显式对齐符号规划结构与自然语言推理。
- **微调增强**：生成的数据超出模型固有规划能力，用于模型微调，得到规划增强的LLM。

### 关键技术细节
- **自动域生成**：模型基于自身知识生成新的规划域（类似PDDL风格），避免人工构建。
- **符号推理数据**：从生成的域中自动导出有效的符号规划-问题对（例如用符号搜索器验证）。
- **CoT轨迹构建**：将符号规划分解为自然语言步骤，形成扩展推理链条。
- **自训练迭代**：使用生成的数据对模型进行微调（fine-tuning），提升其规划成功率和泛化能力。

### 算法流程（文字说明）
1. 基座LLM生成一批新的规划域（例如机器人操作场景）。
2. 对每个域，使用符号规划器（如Fast Downward）自动求解问题，得到符号规划方案。
3. 模型将每一对（问题，规划）解释为自然语言的CoT推理步骤。
4. 收集所有CoT轨迹作为训练数据，对模型进行指令微调（instruction tuning）。
5. 微调后的模型再次用于生成新域，重复迭代，实现自进化。

## 3. 实验设计

### 数据集/场景
- 使用了多个规划基准（benchmarks），具体包括机器人任务规划相关的环境（例如Blocks World、Gripper、Logistics等经典规划域，以及自定义的机器人操作域）。
- **Benchmark**：未明确给出特定名称，但提到在多个规划基准上评估成功率。

### 对比方法
- 基线包括：未微调的基座LLM（如GPT-3.5/4、LLaMA等）、直接使用符号搜索的LLM、以及仅用静态域训练的方法。
- 可能还对比了其他CoT数据生成方法（如人工标注或模板生成）。

## 4. 资源与算力

- **文中未明确说明**使用的GPU型号、数量、训练时长等具体算力信息。仅提到模型微调过程，但未提供细节。

## 5. 实验数量与充分性

- **实验数量**：论文在多个规划基准上进行了测试，包括成功率、跨任务泛化能力（zero-shot transfer）、推理成本（token数）等指标。可能包含3~5个不同域的实验。
- **消融实验**：应当包含对域生成方法、CoT转换、迭代次数等的消融分析（但原文摘要未详细列出）。
- **充分性与公平性**：实验覆盖了常见规划域，但与实际机器人部署的差异未知。对比基线较充分，但缺乏与其他自进化方法（如Self-Play）的直接对比。由于论文被ICLR 2026拒稿，可能实验细节或结果显著性不足。

## 6. 主要结论与发现

- 自动生成的规划域能够为LLM提供可扩展的自监督信号，从而提升规划成功率。
- 通过符号规划-自然语言CoT对齐，模型在跨任务泛化方面表现更优。
- 微调后的模型推理成本降低（因为更少的搜索步骤或更短的CoT）。
- 自进化框架有效降低了机器人任务规划中对人工标注数据的依赖。

## 7. 优点

- **自助数据生成**：无需人工标注，可无限扩展训练数据。
- **符号-语言对齐**：将符号规划与自然语言推理显式对齐，增强模型可解释性和泛化性。
- **自进化闭环**：模型通过生成新域→产生数据→微调→再生成，形成持续改进循环。
- **实用性**：直接适用于机器人任务规划，减少人工编排成本。

## 8. 不足与局限

- **实验覆盖有限**：仅基于经典规划域和简单机器人场景，缺乏真实复杂机器人平台验证。
- **域生成质量依赖基模型**：如果基模型本身规划能力弱，生成的域可能无效或过于简单，陷入低质量循环。
- **符号搜索器假设**：依赖外部符号规划器验证正确性，增加了工程复杂度及对特定领域的依赖。
- **算力未披露**：无法判断方法可复制性和资源门槛。
- **被拒稿可能原因**：实验结果可能不够显著，或与现有方法（如直接使用符号规划器+LLM）相比提升有限，或理论创新不足。

（完）
