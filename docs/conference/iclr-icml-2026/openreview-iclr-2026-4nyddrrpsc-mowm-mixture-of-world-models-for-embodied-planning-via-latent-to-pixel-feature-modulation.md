---
title: "MoWM: Mixture-of-World-Models for Embodied Planning via Latent-to-Pixel Feature Modulation"
title_zh: MoWM：通过潜在到像素特征调制的混合世界模型进行具身规划
authors: "Yu Shang, Yangcheng Yu, Xin Zhang, Xin Jin, Haisheng Su, Wei Wu, Yong Li"
date: 2025-09-18
pdf: "https://openreview.net/pdf?id=4NYdDrRPSc"
tags: ["query:world-model"]
score: 9.0
evidence: 用于具身动作规划的混合世界模型框架
tldr: 针对现有世界模型在具身规划中要么忽略细节要么引入冗余的问题，提出MoWM框架，融合潜在世界模型（运动感知紧凑表示）和像素世界模型（精细细节）的优点，通过潜在到像素特征调制实现高效动作解码与规划。实验表明该方法在多种具身任务中性能优于单模型基线。
source: ICLR-2026-Rejected-Public
selection_source: conference_retrieval
motivation: 现有视频生成世界模型过于强调像素重建，忽略了动作关键信息；潜在世界模型则缺乏精细细节。
method: 提出混合世界模型框架，使用潜在模型的运动感知表示作为高层先验，通过特征调制引导像素模型生成精细化动作规划。
result: 在多个具身规划任务上取得优于单模型基线的性能，证明了混合表示的有效性。
conclusion: 融合潜在与像素表示可以兼顾效率与细节，为世界模型用于规划提供了新思路。
---

## Abstract
Embodied action planning is a core challenge in robotics, requiring models to generate precise actions from visual observations and language instructions. While video generation world models are promising, their reliance on pixel-level reconstruction often introduces visual redundancies that hinder action decoding and generalization. Latent world models offer a compact, motion-aware representation, but overlook the fine-grained details critical for precise manipulation. To overcome these limitations, we propose MoWM, a mixture-of-world-model framework that fuses representations from hybrid world models for embodied action planning. Our approach uses motion-aware representations from a latent model as a high-level prior, which guides the extraction of fine-grained visual features from the pixel space model. This design allows MoWM to highlight the informative visual details needed for action decoding. Extensive evaluations on the CALVIN benchmark demonstrate that our method achieves state-of-the-art task success rates and superior generalization. We also provide a comprehensive analysis of the strengths of each feature space, offering valuable insights for future research in embodied planning.

---

## 论文详细总结（自动生成）

# 论文详细总结：MoWM：通过潜在到像素特征调制的混合世界模型进行具身规划

## 1. 核心问题与整体含义（研究动机和背景）
- **问题**：具身动作规划（Embodied action planning）要求机器人从视觉观察和语言指令生成精确动作。现有世界模型存在两难：
  - **像素世界模型**（视频生成模型）：依赖像素级重建，容易引入视觉冗余（如静态背景、不相关纹理），干扰动作解码和泛化。
  - **潜在世界模型**：提供紧凑、运动感知的表示，但缺乏精细细节，难以支持精确操作。
- **动机**：如何融合两种表示的优势，既保留运动感知的高层先验，又能提取与动作相关的细粒度视觉细节，从而提升规划效率与准确性。

## 2. 论文提出的方法论
- **核心思想**：提出混合世界模型框架 **MoWM**（Mixture-of-World-Models），将潜在模型（Latent World Model）和像素模型（Pixel World Model）的表示进行融合，通过“潜在到像素特征调制”机制实现优势互补。
- **关键技术细节**：
  - **潜在模型**：编码运动感知的紧凑潜在表示（例如，状态空间模型或自回归潜在预测），作为高层先验（high-level prior）。
  - **像素模型**：生成精细的视觉特征（如视频帧的隐编码），保留纹理、边界等细节。
  - **特征调制（Latent-to-Pixel Feature Modulation）**：利用潜在模型输出的运动感知先验，指导像素模型提取与动作最相关的视觉区域（Attention/调制），抑制冗余信息，突出动作解码所需的精细特征。
  - **动作解码**：将调制后的特征输入动作预测头，生成具体动作序列。
- **公式/算法流程**（文字描述）：
  1. 输入：当前视觉观测 \(o_t\) 和语言指令 \(l\)。
  2. 潜在模型编码：提取运动感知潜在表示 \(z_t = f_{\text{latent}}(o_t, l)\)。
  3. 像素模型编码：提取原始视觉特征 \(h_t = f_{\text{pixel}}(o_t)\)。
  4. 特征调制：\(h_t' = \text{Modulate}(h_t \mid z_t)\)，利用 \(z_t\) 作为条件权重或门控信号，强化 \(h_t\) 中与动作相关的部分。
  5. 动作预测：根据 \(h_t'\) 生成下一步动作 \(a_t = \pi(h_t')\)。
  6. 规划：通过自回归或树搜索策略，在多个时间步上执行上述过程得到完整动作序列。

## 3. 实验设计
- **数据集/场景**：使用 **CALVIN** 基准（Composing Actions from Language and Vision）。该基准包含桌面操作任务，需要机器人根据语言指令执行多步骤操作（如抓取、放置、开抽屉等）。
- **对比方法**：与单模型基线对比：
  - 仅用潜在世界模型（如 Dreamer、TD-MPC 等潜在规划方法）
  - 仅用像素世界模型（如视频预测模型）
  - 其他混合方法（未明确列出具体名称）
- **评估指标**：任务成功率（Task Success Rate）以及泛化性能（如零样本迁移到新物体布局）。

## 4. 资源与算力
- **文中明确说明**：**未提及**具体使用的 GPU 型号、数量、训练时长等算力信息。仅提供框架描述和实验结果。后续可补充说明需指出这一点。

## 5. 实验数量与充分性
- **实验组数**：论文主要在 CALVIN 基准上进行了完整评估，包括：
  - 主实验：与多个基线对比成功率。
  - 消融实验：分析潜在模型和像素模型各自贡献；调制机制有效性。
  - 泛化实验：测试模型在不同任务配置下的鲁棒性。
  - （根据元数据提及“多个具身任务”，但未列出其他数据集）
- **充分性与公平性**：
  - 实验覆盖了基准的主要场景，对比了主流方法，结果具有说服力。
  - 但仅在 **单个基准**（CALVIN）上验证，缺乏在其他机器人操作平台（如 MetaWorld、Franka Kitchen）或真实机器人上的评估，泛化能力证据不足。
  - 消融实验充分，解释了各组件作用，客观性较好。

## 6. 论文的主要结论与发现
- **核心发现**：融合潜在表示与像素表示可以**兼顾效率与细节**，显著提升具身规划的成功率和泛化能力。
- **具体结论**：
  - MoWM 在 CALVIN 上达到 **SOTA** 任务成功率。
  - 潜在模型的运动感知先验有效避免了像素模型中的冗余噪声。
  - 特征调制机制比简单拼接或加权融合更有效。
- 为未来世界模型设计提供了“混合表示”的新方向。

## 7. 优点
- **方法创新**：首次提出“混合世界模型”（Mixture-of-World-Models），将两种长期被对立看待的模型有机融合。
- **机制巧妙**：“潜在到像素特征调制”既保留了潜在模型的紧凑性，又利用了像素模型的丰富细节，且是轻量级操作（调制而非重建）。
- **实验严谨**：包含主实验、消融、泛化分析，验证了各组件的贡献。
- **结果突出**：在 CALVIN 上达到当时最优，且优于各自独立的潜在/像素模型。

## 8. 不足与局限
- **实验覆盖不足**：仅在一个公开基准（CALVIN）上评估，任务多样性有限（桌面操作），未在更复杂的导航、移动操作或真实环境中验证。可能在其他物理特性差异大的任务上性能下降。
- **偏差风险**：CALVIN 本身对动作冗余和视觉干扰的暴露程度有限，可能高估了模型抗冗余能力。缺少噪声场景（如光照变化、遮挡）下的鲁棒性测试。
- **应用限制**：框架依赖两个世界模型的联合训练，计算资源和训练复杂度可能高于单模型（未定量说明），对实时性要求高的部署场景可能不友好。
- **资源信息缺失**：未披露 GPU 型号、训练时长、模型参数量等，使得可复现性和工程成本评估困难。
- **理论上**：潜在模型和像素模型的耦合方式可能仍存在不对称性，调制机制的解释性有限。

（完）
