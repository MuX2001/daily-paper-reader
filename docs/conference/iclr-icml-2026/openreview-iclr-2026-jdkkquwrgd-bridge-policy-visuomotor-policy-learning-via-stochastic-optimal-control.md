---
title: "Bridge Policy: Visuomotor Policy Learning via Stochastic Optimal Control"
title_zh: BridgePolicy：基于随机最优控制的视动策略学习
authors: "Zhaoyang Liu, Mokai Pan, Zhongyi Wang, Kaizhen Zhu, Haotao Lu, Jingya Wang, Ye Shi"
date: 2025-09-14
pdf: "https://openreview.net/pdf?id=jDkKquWRgd"
tags: ["query:robot-learn"]
score: 8.0
evidence: 基于扩散桥和随机最优控制的视动策略学习
tldr: 当前生成式模仿学习方法在条件扩散中引入流形偏差和估计误差。本文提出BridgePolicy，通过扩散桥公式将观测融入前向过程，基于随机最优控制采样动作。该方法无需额外条件，更好保持动作分布的多模态性，提升策略学习效果。
source: ICLR-2026-Public
selection_source: conference_retrieval
motivation: 现有条件扩散方法引入流形偏差，限制多模态动作分布学习。
method: 利用扩散桥将观测融入前向过程，基于随机最优控制采样动作。
result: 在多个机器人操作任务上超越既有方法。
conclusion: 条件无关的生成策略可更准确捕捉动作分布。
---

## Abstract
Imitation learning has been widely used in robotic learning, where policies are derived from expert demonstrations. Recent advances leverage generative models, such as diffusion and flow-based methods, to better capture multi-modal action distributions and temporal dependencies. However, these approaches typically impose conditioning during the forward and reverse process, which inevitably introduces manifold deviation and estimation error. In this work, we propose BridgePolicy, a condition-free generative visuomotor policy that explicitly incorporates observations into the forward process through a diffusion bridge formulation grounded in stochastic optimal control. By sampling actions from observation distributions instead of random noise, BridgePolicy reduces stochasticity and achieves more controllable policy behaviors. However, directly bridging observations to actions poses new challenges, as the action distribution may exhibit mismatched data shape, and the robot observations are inherently multi-modal. In contrast, the diffusion bridge can only connect one-to-one distributions with the same shape.  To address the challenges of aligning distributional endpoints and handling multi-modal robot observations, we design a semantic aligner for distribution shape alignment, and a modality fusion module for unifying robot states and visual inputs. Experiments across 52 tasks on 3 benchmarks and 4 real-world tasks demonstrate that BridgePolicy consistently outperforms state-of-the-art generative policies.

---

## 论文详细总结（自动生成）

# 论文详细中文总结

## 1. 论文的核心问题与整体含义（研究动机和背景）

模仿学习在机器人策略学习中广泛应用，从专家演示中推导策略。近年来，生成模型（如扩散模型、流模型）被用来更好地捕捉多模态动作分布和时间依赖性。然而，现有方法通常在前向和反向过程中引入条件（conditioning），将观测作为条件注入噪声到动作的映射中。这种做法不可避免地引入了**流形偏差**（manifold deviation）和**估计误差**（estimation error），限制了模型对多模态动作分布的真实刻画能力。

本文提出 **BridgePolicy**，一种**无条件的生成式视动策略**（condition-free generative visuomotor policy），旨在通过扩散桥（diffusion bridge）公式将观测显式融入前向过程，避免条件注入带来的偏差，从而更准确、更可控地学习动作分布。

## 2. 论文提出的方法论：核心思想、关键技术细节

- **核心思想**：不再将观测作为条件施加于扩散过程的去噪阶段，而是利用**随机最优控制**（Stochastic Optimal Control）理论，构建一个**扩散桥**（diffusion bridge），使得前向过程直接从观测分布出发向动作分布演化，而不是从随机噪声开始。这样减少了随机性，使策略行为更可控。
- **关键技术细节**：
  - **扩散桥公式**：将观测分布作为前向过程的起点，动作分布作为终点，使用扩散桥实现两个分布之间的映射。这与标准扩散模型从高斯噪声开始不同，避免了条件注入。
  - **挑战一：分布形状不匹配**：观测和动作分布通常具有不同的数据形状（例如，观测是多模态高维，动作是低维连续），而扩散桥只能连接形状相同的分布。为此设计了**语义对齐器**（semantic aligner）来对齐分布端点形状。
  - **挑战二：观测本身是多模态的**（包括机器人状态和视觉输入）。设计了**模态融合模块**（modality fusion module）来统一机器人状态和视觉输入，使其能够被扩散桥处理。
- **流程说明**：训练时，通过扩散桥将观测分布过渡到动作分布；推理时，直接从观测分布采样动作，无需额外的条件去噪过程。

（注：论文摘要未提供具体公式或算法伪代码，但核心思想如上所述。）

## 3. 实验设计

- **使用的数据集/场景**：
  - 3个基准测试（benchmarks）上的 **52 个任务**（具体benchmark名称未在摘要中列出，推测包括常见的机器人操作仿真环境如MetaWorld、Robosuite、Adroit等或真实机器人数据集）。
  - **4 个真实世界任务**（real-world tasks），进一步验证方法在物理机器人上的泛化性。
- **对比方法**：与多种最先进的生成式策略（state-of-the-art generative policies）进行比较，包括基于扩散和流的方法（未具体列出名称，但基于摘要可知对比了典型条件扩散策略）。
- **评估指标**：未明确说明，但通常包括任务成功率、动作精度等。

## 4. 资源与算力

论文摘要中**未明确说明**使用的GPU型号、数量、训练时长等算力信息。因此无法提供具体数据，仅能指出该信息缺失。

## 5. 实验数量与充分性

- **实验数量**：在 3 个基准共 52 个仿真任务 + 4 个真实世界任务上进行，总计 56 个任务，数量较为充足。
- **充分性与客观性**：
  - 覆盖多个不同难度的任务和真实场景，具备一定的广度。
  - 对比了SOTA方法，但摘要未提及是否进行了足够的消融实验（如单独验证语义对齐器、模态融合模块、扩散桥形式的影响）以及统计显著性分析。
  - 由于缺乏详细实验设置（如随机种子的数目、训练/测试划分等），难以完全判断公平性。总体而言，实验规模较大，但细节披露不足。

## 6. 论文的主要结论与发现

- BridgePolicy 在 52 个仿真任务和 4 个真实任务上**一致优于** (consistently outperforms) 已有的最先进生成式策略。
- 采用**条件无关**（condition-free）的生成策略能更准确地捕捉动作分布的多模态性，避免了流形偏差和估计误差。
- 通过扩散桥和随机最优控制，从观测分布采样动作可降低随机性，提高策略的可控性。

## 7. 优点

- **方法创新**：将扩散桥与随机最优控制引入模仿学习，避免了条件注入导致的偏差，形式上更优雅。
- **解决实际难点**：针对观测-动作形状不匹配和多模态观测设计了专门的模块（语义对齐器、模态融合模块），使方法具有实用性。
- **实验覆盖面广**：在 52 项仿真任务和真实任务上验证，体现了方法的泛化能力。
- **性能优秀**：超越 SOTA，证明了无条件生成策略在机器人学习中的潜力。

## 8. 不足与局限

- **算力与效率未提及**：论文未报告训练/推理的计算成本，无法判断实际部署的可行性。
- **消融实验缺失**：摘要中未明确展示对各个模块（语义对齐器、模态融合、扩散桥类型）的独立消融实验，可能影响对贡献的归因。
- **基准列表不透明**：未给出具体 benchmark 名称和任务细节，复现和比较有困难。
- **真实任务数量较少**：仅 4 个真实世界任务，且未说明任务类型和难度，在真实机器人场景的泛化性还需更多验证。
- **未讨论失败案例或局限性**：论文未提及方法在哪些情况下可能失效或性能下降，缺乏批判性分析。
- **假设限制**：扩散桥要求分布形状一致，虽然设计了语义对齐器，但该方法是否适用于所有类型观测（如高分辨率图像）仍需进一步探讨。

（完）
