---
title: Unified Latent Steering and Residual Refinement for Online Improvement of Diffusion Policy Models
title_zh: 统一潜在引导与残差精炼：扩散策略模型的在线改进
authors: "Zhengbang Zhu, Ziyan Li, Xiu Yuan, Hanbo Zhang, Yuxiao Liu, Chongjie Zhang, Yong Yu, Weinan Zhang, Minghuan Liu"
date: 2025-09-18
pdf: "https://openreview.net/pdf?id=DbBD2aT1OG"
tags: ["query:robot-learn"]
score: 7.0
evidence: 扩散策略模型的在线改进方法
tldr: 模仿学习策略面对分布偏移和新型场景时鲁棒性不足，直接微调样本效率低且计算昂贵。本文提出USR框架，结合潜在引导器和残差精炼模块，在不全面微调模型参数的情况下在线改进扩散策略。在多个操作基准上显著提升策略成功率和泛化能力，计算开销小。
source: ICLR-2026-Rejected-Public
selection_source: conference_retrieval
motivation: 模仿学习策略面对新场景鲁棒性不足，直接微调样本效率低且计算昂贵。
method: 提出USR框架，包含潜在引导器和残差精炼模块，在不全面微调模型参数的情况下在线改进策略。
result: 在多个操作基准上显著提升策略成功率和泛化能力，计算开销小。
conclusion: 潜在引导与残差精炼结合为在线策略适应提供了高效方案。
---

## Abstract
Imitation learning has driven major advances in robotic manipulation by exploiting large and diverse demonstrations, yet policies trained purely by imitation remain brittle under distribution shift and novel scenarios, making online improvement essential. 
Directly finetuning the parameters of modern large policies is prohibitively sample inefficient and computationally expensive,
while recent finetuning-free adaptation methods either fail to exploit the multimodal distributions learned by pretrained policies or remain confined to the coverage of demonstrations.
We propose USR, a Unified framework for latent Steering and residual Refinement that enables efficient online improvement of diffusion policy models. A lightweight actor jointly outputs latent noise to steer the diffusion process toward promising modes and residual corrections to adapt beyond the diffusion policy's support, combining stable mode selection with flexible refinement. This unified design stabilizes training and fully leverages both components. Experiments on standard benchmarks and our MultiModalBench demonstrate USR's state-of-the-art performance. Furthermore, we validate its real-world applicability by improving a Vision-Language-Action (VLA) model on a physical robot, setting a new paradigm for sample-efficient adaptation of diffusion-based policies.

---

## 论文详细总结（自动生成）

# 论文总结：统一潜在引导与残差精炼：扩散策略模型的在线改进

## 1. 核心问题与整体含义（研究动机和背景）
- **核心问题**：纯模仿学习训练的机器人操作策略在面对分布偏移（distribution shift）和新型场景时鲁棒性不足，亟需在线改进以提升泛化能力。
- **现有方法局限**：
  - 直接微调现代大规模策略的完整参数存在样本效率低下、计算开销巨大的问题。
  - 现有免微调适应方法无法有效利用预训练策略所学习的多模态分布，或受限于演示数据的覆盖范围。
- **研究目标**：提出一种高效、轻量的在线改进框架，使扩散策略模型能够在无需全面微调的情况下适应新场景，同时充分利用预训练策略的多模态能力并超越其支持域。

## 2. 方法论：核心思想、关键技术细节
- **框架名称**：USR（Unified latent Steering and residual Refinement）
- **核心思想**：结合**潜在引导（latent Steering）** 和**残差精炼（residual Refinement）** 两个互补模块，由同一轻量级演员（actor）联合输出，实现稳定模式选择与灵活精炼的统一。
- **关键技术细节**：
  - **潜在引导器**：输出潜在噪声（latent noise），用于引导扩散过程朝向有前景的模式（promising modes）生成动作。
  - **残差精炼模块**：输出残差修正（residual corrections），用于在扩散策略原有支持域之外进行适应和调整。
  - **统一设计**：两个模块共享一个轻量级演员网络，联合优化，稳定训练过程，并充分利用两者优势。
- **算法流程（文字说明）**：
  1. 给定当前状态和预训练的扩散策略模型。
  2. 轻量级演员网络同时产生两个输出：一个潜在噪声向量（用于修改扩散采样的初始噪声）和一个残差向量（用于修正扩散模型生成的原始动作）。
  3. 扩散模型在潜在噪声引导下采样初始动作，再叠加残差修正得到最终动作。
  4. 通过与环境的交互（在线）收集反馈，使用强化学习或在线模仿学习目标更新演员网络，而预训练扩散模型参数保持冻结。
- **关键优势**：无需全面微调模型参数，计算开销小，样本效率高。

## 3. 实验设计
- **数据集/场景**：
  - 标准操作基准（standard benchmarks）：具体名称未在摘要中详细列出，但涵盖常见机器人操作任务。
  - **MultiModalBench**：作者提出的新基准，专门设计用于评估在多模态分布下的策略适应能力。
  - 真实机器人实验：在一台实体机器人上改进视觉-语言-动作（VLA）模型，验证实际应用可行性。
- **对比方法**：
  - 文中提到与“近期免微调适应方法”对比，但未具体列出方法名称（如可能包括扩散策略、DP、IDQL 等，需参考全文）。
  - 与直接微调整个策略的基线对比。
- **评估指标**：任务成功率、泛化能力、计算开销等。

## 4. 资源与算力
- **文中未明确说明**使用的 GPU 型号、数量、训练时长等具体算力信息。摘要和元数据中未提及相关细节。
- **推测**：由于方法强调计算开销小，可能使用单块或少量 GPU，但缺乏确切数据。

## 5. 实验数量与充分性
- **实验数量**：
  - 至少包含三类实验：标准基准、MultiModalBench、真实机器人实验。
  - 消融实验：文中提到“This unified design stabilizes training and fully leverages both components”，暗示可能进行了分离组件的消融，但具体消融实验数量未详述。
- **充分性与公平性**：
  - 实验覆盖了仿真和真实场景，且包含作者提出的新基准（MultiModalBench），设计较为全面。
  - 对比基线包括了免微调方法和微调方法，设置相对公平。
  - 不足之处：未列出标准基准的具体任务、实验重复次数、统计显著性等细节，可能影响对实验充分性的完整评估。由于论文被 ICLR 2026 拒稿，审稿人中可能存在对实验分析的进一步要求。

## 6. 主要结论与发现
- USR 框架在多个操作基准上显著提升了策略成功率和泛化能力，计算开销远小于全面微调。
- 在真实机器人上改进 VLA 模型时，验证了方法的实际可用性，树立了扩散策略样本高效适应的新范式。
- 潜在引导与残差精炼的联合设计比单独使用其中任一组件效果更好，且训练更稳定。

## 7. 优点
- **方法创新**：首次将潜在引导和残差精炼统一在一个轻量级框架中，兼顾模式选择与域外适应。
- **高效性**：无需更新预训练扩散模型参数，仅训练小规模演员网络，计算和样本成本低。
- **实验完整度**：包含仿真基准、自建多模态基准、真实机器人验证，覆盖从实验室到实际场景的迁移。
- **应用前景**：适用于大规模预训练策略（如 VLA）的在线适应，具有实用价值。

## 8. 不足与局限
- **实验覆盖率有限**：标准基准的具体任务未在摘要中列举，可能仅覆盖少数常见操作任务，缺乏大规模多样化场景验证。
- **偏差风险**：提出的 MultiModalBench 可能偏向于本身方法的设计优势，需第三方独立验证。
- **应用限制**：方法依赖在线交互和奖励/反馈信号，在无法获得快速环境反馈的领域（如长时域任务）可能受限。
- **算力信息缺失**：未披露训练资源，难以评判实际部署成本。
- **公开复现性**：论文状态为 ICLR 2026 Rejected，可能代码未公开，限制后续验证。
- **理论分析不足**：方法的收敛性、最优性等理论性质需要进一步分析。

（完）
