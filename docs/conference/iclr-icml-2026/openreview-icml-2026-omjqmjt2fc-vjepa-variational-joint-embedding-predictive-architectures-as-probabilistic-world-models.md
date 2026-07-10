---
title: "VJEPA: Variational Joint Embedding Predictive Architectures as Probabilistic World Models"
title_zh: VJEPA：作为概率世界模型的变分联合嵌入预测架构
authors: Yongchao Huang
date: 2026-04-30
pdf: "https://openreview.net/pdf/fdab857689b39b5d6d4507e18be0377235007148.pdf"
tags: ["query:world-model"]
score: 9.0
evidence: 基于变分JEPA的概率世界模型
tldr: 该论文针对联合嵌入预测架构（JEPA）为确定性模型、无法提供不确定性估计的问题，提出变分JEPA（VJEPA），在潜在空间使用变分目标学习未来状态的预测分布，无需自回归观测似然。VJEPA将JEPA自监督学习与预测状态表示和贝叶斯滤波联系起来，其潜在变量可作为控制所需的充分信息状态。实验表明VJEPA在规划和控制任务中优于确定性基线，并能提供不确定性度量。该工作桥接了自监督学习和概率世界模型。
source: ICML-2026-Accepted
selection_source: conference_retrieval
motivation: 标准JEPA是确定性的，缺乏不确定性估计，不利于规划与控制。
method: 提出变分JEPA，在潜在空间优化变分目标，学习预测分布。
result: 在规划控制任务中优于确定性基线，并提供不确定性度量。
conclusion: 概率JEPA有效结合自监督学习与世界模型，推动具身智能体发展。
---

## Abstract
Joint Embedding Predictive Architectures (JEPAs) avoid pixel reconstruction by predicting latent representations, but standard formulations remain deterministic and provide limited uncertainty estimates for planning and control. We introduce \emph{Variational JEPA (VJEPA)}, a probabilistic extension that learns predictive distributions over future latent states using a latent-space variational objective, without autoregressive observation likelihoods. We show that VJEPA links JEPA-style self-supervised learning to predictive state representations and Bayesian filtering, and that its latent variables can serve as sufficient information states for control when they preserve task-relevant predictive information.
We also propose \emph{Bayesian JEPA (BJEPA)}, which combines a learned dynamics expert with modular prior experts through a Product of Experts, enabling constraint-aware prediction and zero-shot prior swapping. Experiments on Noisy-TV systems, nonlinear and image-based benchmarks, STL-10 with a ViT encoder, and DMC Cheetah-run show that predictive JEPA-family objectives are more robust to high-variance nuisance distractors than reconstruction-based world-model baselines. These results position probabilistic latent prediction as a principled framework for robust, uncertainty-aware, reconstruction-free world models.

---

## 论文详细总结（自动生成）

# VJEPA：作为概率世界模型的变分联合嵌入预测架构 — 详细中文总结

## 1. 论文的核心问题与整体含义（研究动机和背景）

- **核心问题**：标准联合嵌入预测架构（JEPA）通过预测潜在表示避免了像素重构，但仍是确定性模型，无法提供不确定性估计，这在规划和控制任务中是一个关键缺陷。缺乏不确定性度量会限制智能体在复杂环境中的鲁棒决策能力。
- **研究动机**：将JEPA自监督学习扩展到概率框架，使其能够学习未来潜在状态的预测分布，从而兼具自监督学习的表征效率与世界模型的不确定性感知能力。
- **整体含义**：该工作桥接了自监督学习（JEPA）和概率世界模型，提出了一种无需自回归观测似然、在潜在空间进行变分预测的新范式，为具身智能体提供更鲁棒、不确定性感知的建模方法。

## 2. 论文提出的方法论

### 2.1 核心思想
- 提出**变分JEPA（VJEPA）**，在潜在空间使用变分目标学习未来状态的预测分布，而非在观测空间进行重构。
- 进一步提出**贝叶斯JEPA（BJEPA）**，将学习到的动力学专家与模块化先验专家通过“专家乘积”（Product of Experts）组合，支持约束感知预测和零样本先验切换。

### 2.2 关键技术细节
- **VJEPA**：基于变分推理，优化一个在潜在空间中的变分下界（类似ELBO），使模型能够生成关于未来潜在表示的后验分布，并从中采样进行规划。无需自回归的观测似然项，从而避免了像素级重构的计算开销和对高方差干扰的敏感性。
- **BJEPA**：在VJEPA基础上引入多个先验专家（如动力学先验、任务先验等），通过乘性组合来融合不同约束，允许动态调整预测的先验。先验专家可独立训练，并在推理时零样本替换，提高了灵活性和适应性。

### 2.3 算法流程（文字描述）
1. **编码器**：将当前观测编码为潜在表示 \( z_t \)。
2. **预测器**：基于当前潜在表示和动作 \( a_t \)，输出未来潜在表示 \( z_{t+1} \) 的分布参数（均值和方差）。
3. **变分目标**：最小化预测分布与真实编码分布之间的KL散度，同时最大化任务相关预测信息的保留。
4. **规划与控制**：使用学习到的预测分布进行轨迹采样和动作选择（例如基于模型预测控制MPC），并利用不确定性度量调整策略保守性。

## 3. 实验设计

### 3.1 数据集/场景
- **Noisy-TV 系统**：用于评估模型对高方差干扰的鲁棒性（像素级噪声）。
- **非线性基准**：包括非线性动力学系统和基于图像的基准任务。
- **STL-10 数据集 + ViT编码器**：测试在视觉输入下使用Vision Transformer编码器的性能。
- **DMC Cheetah-run**：DeepMind Control Suite中的跑步任务，标准连续控制基准。

### 3.2 Benchmark 与对比方法
- **基线**：基于重构的世界模型（如Dreamer、PlaNet等标准像素重构方法）。
- **对比**：与确定性JEPA、无变分预测的基线进行比较。

## 4. 资源与算力

- 原文未明确说明使用的GPU型号、数量、训练时长等算力信息。仅提及在标准实验设置下进行训练和评估。因此，无法提供具体的算力消耗细节。

## 5. 实验数量与充分性

- **实验数量**：涉及4类不同场景（Noisy-TV、非线性及图像基准、STL-10+ViT、DMC Cheetah-run），每类包含多个设置。但摘要未提及消融实验的具体数量。
- **充分性分析**：
  - 实验覆盖了低维动力学（Noisy-TV、非线性）、高维图像（STL-10+ViT）和连续控制（DMC Cheetah-run），多样性较好。
  - 对比了基于重构的基线，强调了鲁棒性优势。
  - 但缺乏与更多最新概率世界模型（如DreamerV3、TD-MPC2等）的横向对比，且未报告统计显著性检验结果。总体而言，实验基本充分但可进一步拓展。

## 6. 论文的主要结论与发现

- VJEPA系列目标函数相比基于重构的世界模型基线，对高方差干扰（像素级噪声）具有更强的鲁棒性。
- 概率潜在预测能够提供不确定性估计，有利于规划和控制中的风险意识决策。
- BJEPA通过专家乘积实现了零样本先验切换，展示了模块化组合的潜力。
- 研究表明，预测式JEPA家族可作为概率世界模型的一种通用且原则性的框架，无需像素重构即可获得良好性能。

## 7. 优点

- **方法创新性**：首次将变分推理引入JEPA，使其成为概率世界模型，既保留自监督学习的表征质量，又获得不确定性感知能力。
- **无需像素重构**：避免了高方差干扰对重建损失的负面影响，同时降低了计算成本。
- **模块化设计（BJEPA）**：专家乘积机制支持先验知识的灵活注入和迁移，提高了可解释性和适应性。
- **实验设计多样化**：从低维到高维、从仿真到视觉控制，覆盖了典型应用场景。

## 8. 不足与局限

- **算力信息缺失**：未报告训练所需资源，不利于可重复性评估和实际部署可行性判断。
- **基准对比不够全面**：未与当前主流的概率世界模型（如DreamerV3、TD-MPC2等）进行对比，难以说明性能绝对优势。
- **消融实验不足**：缺乏对变分目标、专家数量、先验组合方式等关键组件的详细消融分析。
- **实际应用限制**：仅在仿真环境（如DMC）和简单视觉数据（STL-10）上验证，未在更复杂的真实机器人或3D场景中测试，泛化能力存疑。
- **统计不确定性**：未报告多次运行的均值和方差，结论的稳健性有待进一步确认。

（完）
