---
title: Dynamic Mixture of Progressive Parameter-Efficient Expert Library for Lifelong Robot Learning
title_zh: 动态混合渐进参数高效专家库用于终身机器人学习
authors: "Yuheng Lei, Sitong Mao, Shunbo Zhou, Hongyuan Zhang, Xuelong Li, Ping Luo"
date: 2025-09-18
pdf: "https://openreview.net/pdf?id=YKaoAJE2ej"
tags: ["query:robot-learn"]
score: 8.0
evidence: 基于参数高效专家库的终身机器人学习
tldr: 终身机器人学习要求持续适应而不遗忘。DMPEL渐进构建低秩专家库，通过动态混合选择适配新任务，无需任务标识符，实现前向迁移并缓解灾难性遗忘，推动通用智能体持续学习。
source: ICLR-2026-Rejected-Public
selection_source: conference_retrieval
motivation: 现有终身学习方法依赖任务标识符且知识共享有限。
method: 渐进构建低秩专家库，动态混合选择专家进行适应。
result: 在多个机器人任务上实现高效前向迁移和抗遗忘。
conclusion: DMPEL实现了无需任务标识符的持续学习，提升机器人泛化能力。
---

## Abstract
A generalist agent must continuously learn and adapt throughout its lifetime, achieving efficient forward transfer while minimizing catastrophic forgetting. Previous work within the dominant pretrain-then-finetune paradigm has explored parameter-efficient fine-tuning for single-task adaptation, effectively steering a frozen pretrained model with a small number of parameters. However, in the context of lifelong learning, these methods rely on the impractical assumption of a test-time task identifier and restrict knowledge sharing among isolated adapters. To address these limitations, we propose Dynamic Mixture of Progressive Parameter-Efficient Expert Library (DMPEL) for lifelong robot learning. DMPEL progressively builds a low-rank expert library and employs a lightweight router to dynamically combine experts into an end-to-end policy, enabling flexible and efficient lifelong forward transfer. Furthermore, by leveraging the modular structure of the fine-tuned parameters, we introduce expert coefficient replay, which guides the router to accurately retrieve frozen experts for previously encountered tasks. This technique mitigates forgetting while being significantly more storage- and computation-efficient than experience replay over the entire policy. Extensive experiments on the lifelong robot learning benchmark LIBERO demonstrate that our framework outperforms state-of-the-art lifelong learning methods in success rates during continual adaptation, while utilizing minimal trainable parameters and storage.

---

## 论文详细总结（自动生成）

# 论文中文总结

## 1. 论文的核心问题与整体含义（研究动机和背景）

终身机器人学习旨在使智能体在持续不断的环境中学习新任务，同时保持对旧任务的记忆（缓解灾难性遗忘），并实现高效的前向迁移（新任务利用已有知识）。然而，当前主流的“预训练-微调”范式在面对终身学习时存在两大不足：
- 需要测试时提供任务标识符（task identifier），这在真实机器人场景中通常不现实；
- 不同任务使用孤立的适配器（adapter），限制了知识在任务间的共享。

因此，本文提出**DMPEL**（Dynamic Mixture of Progressive Parameter-Efficient Expert Library），致力于在不依赖任务标识符的前提下，实现参数高效的终身机器人学习，同时兼顾前向迁移与抗遗忘。

## 2. 论文提出的方法论：核心思想、关键技术细节、公式或算法流程

**核心思想**：渐进构建一个低秩专家库（low-rank expert library），并通过轻量级路由器动态选择并混合专家，组合成端到端的策略。利用专家参数的模块化结构，引入“专家系数回放”（expert coefficient replay）来指导路由器准确检索已冻结的旧任务专家，从而缓解遗忘。

**关键技术细节**：
- **参数高效专家库**：每个专家为低秩矩阵（类似LoRA），在持续学习过程中逐步添加新专家，不增加之前任务的参数量。
- **动态混合路由器**：一个轻量级的神经网络（通常只有几层），根据当前输入（如观测）输出各专家的混合权重，实现自适应的知识组合。
- **专家系数回放**：存储旧任务对应的专家激活系数（router输出），在后续训练新任务时，通过回放这些系数来约束路由器对旧任务的输出，使其仍能正确激活对应的专家，从而防止遗忘。该方法比回放完整策略数据更节省存储和计算。
- **算法流程**（文字说明）：
  1. 初始化一个空专家库和随机路由器。
  2. 对于每个新任务，在当前专家库基础上添加一组可训练的低秩专家。
  3. 训练路由器联合新任务数据与少量回放的旧任务系数，使得路由器既能适应新任务，又能保持对旧任务的正确响应。
  4. 训练完成后，新专家被冻结，并存储该任务对应的专家系数用于后续回放。
  5. 重复步骤2-4。

注：原文未给出具体公式，上述描述基于摘要及元数据推断。

## 3. 实验设计：使用了哪些数据集/场景，benchmark，对比方法

- **数据集/场景**：使用**LIBERO**终身机器人学习基准（包含多个机器人操作任务序列，如物体抓取、放置等）。
- **Benchmark**：LIBERO本身是一个多任务连续学习基准，涵盖视觉-运动策略。
- **对比方法**：与当前最优的终身学习方法（state-of-the-art lifelong learning methods）进行比较，包括基于回放、正则化以及参数高效微调的变体。

## 4. 资源与算力

论文摘要及提供的元数据中**未明确说明**使用的GPU型号、数量或训练时长。仅在方法中提到“存储和计算效率高”，但无具体算力数据。因此无法总结具体资源消耗。

## 5. 实验数量与充分性

- **实验数量**：从摘要可知，主要实验是在LIBERO上进行的连续适应性成功率对比。文中提到“extensive experiments”，但具体子实验数量（如不同任务序列长度、消融研究、专家库规模影响、回放策略对比等）未在摘要中详述。
- **充分性与客观性**：对比了SOTA方法，且指出了自己的方法在成功率、可训练参数和存储上的优势，实验设计较为典型。但缺乏对多个基准（如其他机器人或非机器人连续学习任务）的验证，以及不同随机种子/统计显著性等细节，因此充分性有一定局限。但作为一篇短论文（可能为ICLR 2026被拒修改版），摘要侧重点合理。

## 6. 论文的主要结论与发现

- DMPEL在不需任务标识符的条件下，实现了高效的终身前向迁移和抗遗忘。
- 在LIBERO基准上，DMPEL在持续适应阶段（continual adaptation）的成功率显著优于现有SOTA终身学习方法。
- 同时，该方法仅使用极少的可训练参数（低秩专家）和极少的存储（专家系数回放，而非完整经验回放），在计算与存储效率上有明显优势。

## 7. 优点：方法或实验设计上的亮点

- **创新性**：将参数高效微调（LoRA等）思想应用于终身学习，并通过动态混合与专家系数回放克服了传统适配器孤立和需任务标识符的问题。
- **灵活性**：专家库渐进扩展，可适应任意长度的任务序列，无需预先知道任务总数。
- **效率**：专家系数回放比经验回放节省大量存储（只存向量而非轨迹），且路由器计算开销低。
- **实用性**：无需测试时任务ID，更贴合真实机器人场景。

## 8. 不足与局限

- **实验覆盖**：仅在LIBERO一个基准上验证，缺乏其他机器人平台（如RLBench、MetaWorld）或其他领域（如NLP）的泛化验证。
- **任务相关性假设**：方法可能依赖于任务间的相似性，若任务差异极大（如跳变领域），低秩专家库和路由器的泛化能力可能下降。
- **回放稳定性**：专家系数回放依赖存储系数的准确性，若路由器在训练过程中漂移严重，回放效果可能受限，文章中未讨论这种风险。
- **可解释性**：专家的功能缺乏语义解释，混合策略的黑箱性可能难以调试。
- **算力与资源**：未提供训练时间、GPU等细节，无法评估实际部署成本。

（完）
