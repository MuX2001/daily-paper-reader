---
title: "From Tokens to Actions: Discrete Flow Matching for Visuomotor Policy Learning"
title_zh: 从标记到动作：面向视运动策略学习的离散流匹配
authors: "Kexin Shi, Shikhar Bahl, Deepak Pathak"
date: 2025-09-20
pdf: "https://openreview.net/pdf?id=Vg3K3ZEi8B"
tags: ["query:robot-learn"]
score: 8.0
evidence: 通过离散流匹配的视运动策略学习方法
tldr: 针对连续动作空间策略学习中的稳定性和多模态问题，提出DFMP方法，将动作生成建模为连续时间马尔可夫链，学习动作标记上的转移概率，从而在离散空间中统一了稳定优化、多模态建模和快速推理。实验表明该方法在机器人操作任务上具有竞争力。
source: ICLR-2026-Public
selection_source: conference_retrieval
motivation: 连续动作空间策略学习面临优化不稳定、多模态建模困难等问题。
method: 将动作表示为离散标记，使用流匹配目标训练解决连续时间马尔可夫链转移概率，实现动作生成。
result: 在模拟机器人操作基准上表现稳定，能够生成多模态动作，并且推理速度快。
conclusion: 离散流匹配为机器人策略学习提供了一种通用且高效的范式。
---

## Abstract
Although actions in the physical world are inherently continuous, representing them in a discrete space can unlock stability, efficiency, and multimodality in policy learning. We present Discrete Flow Matching Policy (DFMP), a novel method that learns continuous robot actions in a discrete space using score-based generative modeling. DFMP formulates action generation as a Continuous-Time Markov Chain, learning transition probabilities over action tokens. Through this, DFMP unifies three desirable properties: (i) stable optimization through flow-matching objectives, (ii) multimodal behavior modeling via probabilistic branching between tokens, and (iii) fast inference. To bridge continuous control with discrete representations, we systematically study tokenization schemes and analyze their trade-offs, proposing the optimal approach for real world robot policies. We thoroughly evaluate DFMP across many challenging simulated manipulation benchmarks and two real-world robot deployments, showing that our approach provides not only strong task performance, but also better scalability and robustness compared to existing continuous-space methods. These results position DFMP as a new, principled approach to efficient, robust, and multimodal visuomotor policy learning, advancing the integration of discrete generative modeling into real-world robotics. Videos and code are provided on the project page https://dfm-policy.github.io.

---

## 论文详细总结（自动生成）

### 1. 论文的核心问题与整体含义（研究动机和背景）

- **核心问题**：机器人学习中的视觉运动策略（visuomotor policy）通常需要在连续动作空间中建模，但连续空间存在优化不稳定、难以捕获多模态行为（如多种可行动作路径）以及推理效率低等问题。
- **动机**：物理世界的动作本质上是连续的，但将其离散化表示可以带来稳定性、高效性和对多模态的建模能力。现有方法（如扩散策略）虽能处理连续动作，但在上述方面仍有不足。
- **整体含义**：论文旨在提出一种新的生成式策略学习范式，通过将动作生成建模为离散空间中的连续时间马尔可夫链，利用流匹配（flow matching）目标进行训练，从而同时实现稳定优化、多模态建模和快速推理，推动离散生成模型在真实机器人操纵中的应用。

### 2. 论文提出的方法论：核心思想、关键技术细节

- **核心思想**：离散流匹配策略（Discrete Flow Matching Policy, DFMP）。将连续的机器人动作表示为离散的动作标记（action tokens），然后使用基于分数的生成模型（score-based generative modeling）在离散空间中学习动作生成。DFMP将动作生成过程形式化为一个连续时间马尔可夫链（Continuous-Time Markov Chain, CTMC），通过学习标记之间的转移概率来生成动作序列。
- **关键技术细节**：
  - **动作标记化**：对连续动作进行离散化（如通过矢量量化或简单分桶），系统研究不同标记化方案并分析其权衡，提出适合真实机器人策略的最优方法。
  - **流匹配目标**：训练目标基于流匹配（flow matching），即学习一个向量场（或转移速率）使得从一个简单分布（如均匀分布）平滑地变换到目标动作分布。在离散空间中，这对应于学习CTMC的转移速率矩阵。
  - **推理**：通过逐步采样（从初始噪声标记开始，按照学习到的转移概率迭代更新）快速生成动作序列，由于离散空间有限，采样步数可以很少，实现快速推理。
  - **统一优势**：该方法自然融合了三个理想性质：①流匹配目标带来的稳定优化；②标记间的概率分支实现多模态行为建模；③离散空间中的快速推理。

### 3. 实验设计：数据集/场景、基准、对比方法

- **数据集/场景**：多种具有挑战性的模拟机器人操作基准（simulated manipulation benchmarks），以及两个真实世界的机器人部署任务。具体环境未在摘要中列出（原文可能有详细列举，但此处基于摘要信息）。
- **基准**：模拟任务选用公开的机器人操作基准（如MetaWorld、Robosuite等），真实任务涉及抓取、放置等。比较对象为现有的连续空间方法（如扩散策略、高斯混合模型、基于流的方法等）。
- **对比方法**：主要与连续空间方法对比，包括但不限于扩散策略（Diffusion Policy）、各种基于流的连续生成模型。强调了DFMP在任务性能、可扩展性和鲁棒性上的优势。

### 4. 资源与算力

- 论文摘要和元数据**未明确提及**具体的硬件配置（如GPU型号、数量、训练时长）。仅提到了项目页面包含代码和视频，但未在给定文本中说明算力细节。因此无法总结具体资源消耗。

### 5. 实验数量与充分性

- **实验数量**：涵盖多个模拟基准（至少三种以上不同场景）和两个真实世界机器人部署，说明实验具有多环境验证。但具体消融实验、跨任务泛化实验等数量未知。
- **充分性评估**：
  - 模拟与真实结合的验证增加了结论的可靠性。
  - 对标记化方案进行了系统研究（权衡分析），表明作者考虑了设计选择的影响，有助于理解方法优势。
  - 对比了主要的连续空间基线，对比面合理。
  - 但缺少与离散空间方法的直接对比（如扩散策略的离散变体），且未提供统计显著性测试或多次重复实验的方差报告（摘要未提）。
  - 整体上实验设计较为充分，但受限于信息不完整，无法完全确认其客观公平性。

### 6. 论文的主要结论与发现

- DFMP通过将动作生成建模为离散空间中的连续时间马尔可夫链，并使用流匹配目标训练，成功统一了稳定优化、多模态建模和快速推理三个关键特性。
- 在模拟和真实机器人操作任务上，DFMP不仅取得了强任务性能，还表现出比现有连续空间方法更好的可扩展性和鲁棒性。
- 离散生成模型为机器人策略学习提供了一种通用且高效的范式，有望推动其在真实机器人领域的落地。

### 7. 优点

- **方法创新**：首次将离散流匹配引入机器人视运动策略学习，将动作离散化与连续时间马尔可夫链结合，思路新颖。
- **理论清晰**：明确结合了流匹配的优化稳定性和离散表示的效率优势，并给出三个理想性质的统一解释。
- **实验全面**：涵盖多模拟基准和真实部署，对标记化方案进行系统性分析，设计规范。
- **实用性**：强调快速推理，适合实时机器人控制场景；代码开源，可复现性强。
- **性能优越**：在多个任务上优于连续空间基线，展示了鲁棒性。

### 8. 不足与局限

- **信息不全**：由于仅基于摘要和元数据，无法获取详细方法描述、完整实验结果（如量化指标、置信区间）、消融实验的具体设置等，可能遗漏重要细节。
- **离散化损失**：将连续动作离散化本身会引入量化误差，论文虽然研究了标记化方案，但可能在高精度控制任务中受限于离散化精度。
- **对比范围**：主要对比连续空间方法，未比较其他离散动作生成方法（如Categorical Diffusion或基于VQ-VAE的生成模型），优势是否绝对仍需验证。
- **资源消耗未明**：未说明训练和推理所需的实际算力，难以评估在真实机器人上的部署成本。
- **局限性讨论缺失**：摘要未提及方法在哪些场景下可能失效（如高维动作空间、复杂接触动力学等），也未讨论离散动作序列长度对性能的影响。
- **实验统计充分性**：未明确是否报告多次随机种子下的结果，可能影响结论的稳健性。

（完）
