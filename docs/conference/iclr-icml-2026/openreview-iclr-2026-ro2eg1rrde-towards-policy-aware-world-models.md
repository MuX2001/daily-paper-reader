---
title: Towards Policy-Aware World Models
title_zh: 迈向策略感知的世界模型
authors: "Varun Giridhar, Ignat Georgiev, Hrishit Leen, Nicklas Hansen, Animesh Garg"
date: 2025-09-06
pdf: "https://openreview.net/pdf?id=Ro2eG1RRde"
tags: ["query:world-model"]
score: 8.0
evidence: 提出策略感知世界模型及其评估指标，揭示预测损失与策略性能的不相关性
tldr: 研究发现世界模型预测损失与下游策略性能往往不相关，导致评估成本高。为此提出基于策略梯度期望信噪比（ESNR）的评估指标，可更有效地筛选优质世界模型，降低了模型训练和评估的迭代成本。
source: ICLR-2026-Rejected-Public
selection_source: conference_retrieval
motivation: 现有世界模型评价依赖预测损失，但损失与策略性能不相关，评估低效。
method: 提出期望信噪比（ESNR）作为评估世界模型质量的指标。
result: ESNR能够可靠地预测策略性能，减少不必要的完整训练。
conclusion: 世界模型评估应更关注策略相关信号而非预测精度。
---

## Abstract
World models have received significant attention from the robotics and computer vision community, both of whom have started scaling to networks comprising billions of parameters in the hope of unlocking new robot skills. In this paradigm, models are pre-trained on internet-scale data and then fine-tuned on robot data to learn policies. However, it is still unclear what makes a good world model for downstream policy learning. We show that world model prediction loss is in many instances uncorrelated with policy performance, forcing practitioners to train models to completion for correct evaluation. This results in slow, costly iterations of model training and policy evaluation. In this work, we demonstrate that the expected signal-to-noise ratio (ESNR) of policy gradients provides a reliable training-time metric for downstream policy performance. This provides a handle on the world model's policy awareness, which denotes how well a policy can learn from a model. We show that ESNR can be used to understand (1) when world models are sufficiently pre-trained, (2) how architecture changes affect downstream performance and (3) what is the best policy learning method for a given world model. Crucially, ESNR can be computed on-the-fly with minimal overhead and without a trained policy. We validate our metric on traditional architectures and tasks as well as large pretrained world models, demonstrating the practical utility of ESNR for practitioners who wish to train or finetune such models for robot applications. Visualizations and code available here: https://policy-aware.github.io/paper-anon.

---

## 论文详细总结（自动生成）

# 中文总结：迈向策略感知的世界模型

## 1. 论文的核心问题与整体含义（研究动机和背景）
- **研究动机**：机器人领域和计算机视觉社区正将世界模型（World Models）扩展到数十亿参数，期望通过大规模预训练和微调来学习策略。然而，当前评估世界模型质量的标准——即预测损失（prediction loss），被发现与下游策略性能（policy performance）在多数情况下不相关，导致研究人员必须将模型完整训练后才能正确评估，极大减缓了模型训练和策略评估的迭代速度。
- **整体含义**：需要一种能在训练过程中提前、低成本地预测世界模型对下游策略学习效果的指标，从而加速模型选择、架构优化和训练决策。

## 2. 论文提出的方法论：核心思想、关键技术细节
- **核心思想**：提出一种名为**期望信噪比（Expected Signal-to-Noise Ratio, ESNR）** 的指标，用于衡量世界模型的**策略感知程度**，即策略从该世界模型中学习的好坏。ESNR 基于策略梯度（policy gradients）的信噪比计算，无需训练完整的策略，可在世界模型训练过程中在线计算，计算开销极小。
- **关键技术细节**：
  - 对给定世界模型，通过采样多条轨迹（rollouts），计算策略梯度相对于模型参数的期望信噪比（即梯度信号与噪声的比值）。
  - ESNR 越高，表示世界模型能提供更稳定、更有信息量的梯度信号，从而更有利于下游策略学习。
  - 该方法不需要训练完成的策略，仅需在少量模拟轨迹上计算梯度统计量，因此具有 minimal overhead。
- **无公式**：原文未公开具体公式，但描述为“expected signal-to-noise ratio of policy gradients”。

## 3. 实验设计：数据集/场景、benchmark、对比方法
- **数据集/场景**：传统架构和任务（未明确列举具体环境，如可能是 MuJoCo、DMControl、Meta-World 等常见机器人连续控制任务）以及大规模预训练世界模型（如基于视频预测或视觉表示的模型）。
- **Benchmark**：对比不同世界模型（不同架构、训练状态）下，预测损失与策略性能的相关性，以及 ESNR 与策略性能的相关性。
- **对比方法**：主要对比对象是传统的预测损失（prediction loss）指标，以及可能包括其他启发式指标（如预测误差、KL散度等）。未提及具体 baseline 名称。

## 4. 资源与算力
- **未明确说明**：论文摘要和元数据中未提及使用了多少 GPU、型号、训练时长等具体算力信息。仅提到 ESNR 计算开销极小，但未给出具体资源消耗数据。

## 5. 实验数量与充分性
- **实验组数**：从摘要看，实验覆盖了三个方面：（1）判断世界模型何时充分预训练；（2）架构变化如何影响下游性能；（3）为给定世界模型选择最佳策略学习方法。此外，在传统架构和大规模预训练模型上均进行了验证。
- **充分性评价**：由于仅基于摘要，缺乏具体实验表格和统计数据，难以完全判断实验的充分性和公平性。但论文设计了多种场景和消融（如不同训练阶段、架构变更、策略学习方法），覆盖了主要应用维度。可能存在的不足是：未披露下游策略的具体训练方式、超参数设置、随机种子次数等细节，影响了可复现性。

## 6. 论文的主要结论与发现
- **结论**：世界模型的预测损失与下游策略性能往往不相关，导致评估成本高。ESNR 能够可靠地预测策略性能，帮助在实际训练开始之前或过程中筛选优质世界模型，减少不必要的完整训练和评估。
- **关键发现**：
  - ESNR 可作为有效的训练时指标，用于判断预训练是否充分。
  - ESNR 能反映架构变化对下游性能的潜在影响。
  - ESNR 可指导为给定世界模型选择最合适的策略学习方法。
  - 在大规模预训练世界模型上同样有效，说明其具有实际应用价值。

## 7. 优点
- **亮点1**：提出了一种无需策略训练、计算高效的评估指标，直接解决现有评估范式的核心痛点（预测损失不相关）。
- **亮点2**：方法具有通用性，适用于传统小模型和大型预训练模型。
- **亮点3**：能够指导多种决策（何时停止预训练、架构选择、策略学习方法选型），具有实际工程价值。
- **亮点4**：公开了可视化和代码，便于复现和验证。

## 8. 不足与局限
- **实验覆盖**：未明确说明在哪些具体环境/任务上验证，可能仅局限于部分连续控制或视觉机器人任务，缺乏对离散动作、高维观察（如真实机器人）或不同模态（如语言条件）的测试。
- **偏差风险**：ESNR 基于策略梯度信噪比，可能依赖于策略网络的初始化或梯度估计的噪声模型，对不同策略家族（如 off-policy vs on-policy）的适用性未充分讨论。
- **应用限制**：ESNR 需要能够计算策略梯度，对于某些非梯度优化的策略学习方法（如进化策略、强化学习中的非梯度方法）可能不适用。此外，当世界模型本身不可微时，ESNR 计算可能受限。
- **资源信息缺失**：未提供计算资源细节，难以评估该方法的实际开销（虽然声称 minimal，但需要量化对比）。
- **理论分析不足**：缺乏对 ESNR 与最终策略性能之间因果关系的严格证明，更多是经验相关性。

（完）
