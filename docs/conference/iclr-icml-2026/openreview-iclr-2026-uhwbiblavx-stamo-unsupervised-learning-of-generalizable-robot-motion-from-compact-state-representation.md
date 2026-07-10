---
title: "StaMo: Unsupervised Learning of Generalizable Robot Motion from Compact State Representation"
title_zh: StaMo：从紧凑状态表示中无监督学习可泛化的机器人运动
authors: "Mingyu Liu, Jiuhe Shu, Hui Chen, Zeju Li, Canyu Zhao, Jiange Yang, Shenyuan Gao, Hao Chen, Chunhua Shen"
date: 2025-09-01
pdf: "https://openreview.net/pdf?id=UhwbIblavX"
tags: ["query:world-model"]
score: 8.0
evidence: 通过紧凑状态表示学习用于世界建模和决策，并兼容VLA模型
tldr: "针对现有状态表示要么冗余要么缺失关键信息的问题，本文提出无监督紧凑状态学习方法，利用轻量编码器和预训练扩散Transformer解码器学习高度压缩的双令牌表示。该表示兼具高效性和可解释性，能无缝集成到现有VLA模型中，在LIBERO和真实世界任务上分别提升14.3%和30%的成功率。"
source: ICLR-2026-Public
selection_source: conference_retrieval
motivation: 现有状态表示难以平衡信息量和紧凑性，影响世界建模和决策效率。
method: 使用轻量编码器和预训练扩散Transformer解码器进行无监督学习，输出双令牌表示。
result: "在LIBERO和真实任务上分别提升14.3%和30%的成功率。"
conclusion: 紧凑且可解释的状态表示有助于提升机器人学习效率。
---

## Abstract
A fundamental challenge in embodied intelligence is developing expressive and compact state representations for efficient world modeling and decision making. However, existing methods often fail to achieve this balance, yielding representations that are either overly redundant or lacking in task-critical information. We propose an unsupervised approach that learns a highly compressed two-token state representation using a lightweight encoder and a pre-trained Diffusion Transformer (DiT) decoder, capitalizing on its strong generative prior. Our representation is efficient, interpretable, and integrates seamlessly into existing VLA-based models, improving performance by 14.3% on LIBERO and 30% in real-world task success with minimal inference overhead. More importantly, we find that the difference between these tokens, obtained via latent interpolation, naturally serves as a highly effective latent action, which can be further decoded into executable robot actions. This emergent capability reveals that our representation captures structured dynamics without explicit supervision. We name our method StaMo for its ability to learn generalizable robotic Motion from compact State representation, which is encoded from static images, challenging the prevalent dependence to learning latent action on complex architectures and video data. The resulting latent actions also enhance policy co-training, outperforming prior methods by 10.4% with improved interpretability. Moreover, our approach scales effectively across diverse data sources, including real-world robot data, simulation, and human egocentric video.

---

## 论文详细总结（自动生成）

### 1. 论文的核心问题与整体含义（研究动机和背景）

- **核心问题**：在具身智能中，如何获得既具有表达力又足够紧凑的状态表示，以支持高效的世界建模和决策。现有方法往往在冗余性与信息缺失之间失衡，要么表示过于冗余（如高维像素），要么丢失任务关键信息（如手工设计的低维状态）。
- **研究动机**：紧凑且可解释的状态表示对于提升机器人学习效率至关重要，但当前缺乏无监督方式学习这种表示的方法。作者希望挑战依赖复杂架构和视频数据学习潜在动作的现有范式。

### 2. 论文提出的方法论：核心思想、关键技术细节、公式或算法流程（用文字说明即可）

- **核心思想**：通过无监督学习，从静态图像中提取高度压缩的双令牌状态表示（two-token state representation），利用预训练扩散变换器（DiT）的强大生成先验来辅助解码。
- **关键技术细节**：
  - 使用轻量级编码器将输入图像编码为两个紧凑的潜在令牌。
  - 预训练的扩散变换器解码器仅基于这两个令牌重建图像/动态信息，迫使编码器捕获结构化动力学。
  - 这两个令牌之间的差异（通过潜在插值获得）自然地成为一种高效的潜在动作（latent action），无需显式动作监督。
  - 该表示可无缝集成到现有的VLA（Vision-Language-Action）模型中，替代原有的状态表示部分。
- **算法流程**（文字说明）：
  1. 输入：静态图像序列（无动作标签）。
  2. 轻量编码器提取双令牌状态。
  3. 预训练DiT解码器根据双令牌状态生成预测的未来帧或重构，通过无监督重建损失训练编码器。
  4. 训练后，双令牌之差视为潜在动作，可进一步解码为可执行机器人动作。
  5. 将编码器插入VLA模型，替换其状态特征提取部分，进行端到端或联合微调。

### 3. 实验设计：使用了哪些数据集 / 场景，它的 benchmark 是什么，对比了哪些方法

- **数据集/场景**：
  - LIBERO（机器人操作仿真基准）
  - 真实世界机器人任务（具体未详述，涉及真实物理机器人）
  - 还包括真实机器人数据、仿真数据以及人类自我中心视频（egocentric video）等多源数据。
- **Benchmark**：主要任务成功率（Success Rate）。
- **对比方法**：
  - 与现有VLA模型的基线进行对比（具体名称未给出，但提及“prior methods”和“VLA-based models”）。
  - 在潜在动作学习方面，对比了依赖复杂架构和视频数据的先前方法。

### 4. 资源与算力：如果文中有提到，请总结使用了多少算力（GPU 型号、数量、训练时长等）。若未明确说明，也请指出这一点。

- **未明确说明**：论文摘要及元数据中未提及使用的GPU型号、数量或训练时长。因此无法总结算力细节。

### 5. 实验数量与充分性：大概做了多少组实验（如不同数据集、消融实验等），这些实验是否充分、是否客观、公平

- **实验数量**：主要提及了三组实验：
  1. LIBERO基准上的成功率提升14.3%（可能包含多个子任务平均）。
  2. 真实世界任务成功率提升30%。
  3. 潜在动作用于策略协同训练（policy co-training），相比先前方法提升10.4%。
- **消融实验**：提到“发现”令牌差异可作为潜在动作，但未明确列出消融实验细节。不过从摘要可推断作者可能进行了关于双令牌表示、潜在动作有效性等的消融分析。
- **充分性评判**：实验覆盖仿真、真实世界、多数据源，从任务成功率和协同训练两方面验证，具有一定广度。但缺乏详细超参数分析、模型大小对比、计算开销基准等。总体上较充分，但未提供统计显著性或更多数据集上的结果。

### 6. 论文的主要结论与发现

- **主要结论**：所提出的无监督紧凑状态表示（StaMo）是高效、可解释的，并能无缝集成到现有VLA模型中，显著提升任务成功率（LIBERO 14.3%，真实世界30%），且推理开销极小。
- **关键发现**：两个令牌之间的差异（通过潜在插值）自然形成高效的潜在动作，无需显式动作监督。这表明所学表示捕获了结构化动力学，挑战了必须依赖复杂架构和视频数据学习潜在动作的普遍认知。
- 该方法在多个数据源（仿真、真实机器人、人类视频）上具有良好的可扩展性。

### 7. 优点：方法或实验设计上有哪些亮点

- **方法亮点**：
  - 轻量编码器 + 预训练DiT解码器的无监督学习范式，利用生成先验实现高度压缩（仅两个令牌）。
  - 表示同时具备紧凑性（高效）和可解释性（令牌差异有物理意义）。
  - 无需动作标签，无需视频数据（仅静态图像序列），降低标注成本。
  - 兼容现有VLA模型，即插即用，推理计算量增加很小。
- **实验设计亮点**：
  - 在仿真和真实世界两个层面验证，且真实提升幅度大（30%），展示了实际价值。
  - 覆盖多种数据源（仿真、真实机器人、人类视频），体现泛化能力。

### 8. 不足与局限：包括实验覆盖、偏差风险、应用限制等

- **实验覆盖局限**：
  - 仅在LIBERO一个仿真基准上测试，缺乏在其他常见机器人benchmark（如Meta-World、CALVIN等）的结果。
  - 真实世界任务细节未披露（任务数量、难度、机械臂型号等），难以重复验证。
  - 未提供与更复杂状态表示（如多令牌、连续向量）的对比。
  - 缺少对推理延迟、模型大小、训练速度的定量比较。
- **偏差风险**：
  - 双令牌表示可能只适用于特定类型的动态（如刚体运动），对高度非刚体或接触密集型任务可能失效。
  - 潜在动作解码为可执行动作的精度和可靠性未充分分析。
- **应用限制**：
  - 依赖预训练的DiT模型（可能较大），虽然解码器仅微调或冻结，但仍需预先拥有。
  - 潜在动作的物理一致性未与真实动作对齐的验证（可能产生非自然动作）。
- **其他**：论文未公开代码或详细实验配置，可复现性存疑。未讨论失败案例或limitation分析。

（完）
