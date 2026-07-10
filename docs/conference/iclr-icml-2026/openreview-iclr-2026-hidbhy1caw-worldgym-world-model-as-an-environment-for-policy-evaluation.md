---
title: "WorldGym: World Model as An Environment for Policy Evaluation"
title_zh: WorldGym：作为策略评估环境的世界模型
authors: "Julian Hector Quevedo, Ansh Kumar Sharma, Yixiang Sun, Varad Suryavanshi, Percy Liang, Sherry Yang"
date: 2026-01-26
pdf: "https://openreview.net/pdf?id=hidBHy1CAw"
tags: ["query:world-model"]
score: 9.0
evidence: 世界模型作为策略评估的代理环境
tldr: 评估机器人策略通常依赖昂贵真实测试或手工仿真器。本文提出WorldGym，将条件视频生成模型作为世界模型，对VLA策略进行蒙特卡洛评估，并使用视觉语言模型提供奖励。实验表明，世界模型中的成功率与真实环境高度相关，且能保持策略排名，为低成本策略评估提供新范式。
source: ICLR-2026-Accepted
selection_source: conference_retrieval
motivation: 真实世界策略评估成本高，手工仿真器泛化性有限，亟需高保真代理环境。
method: 构建自回归动作条件视频生成世界模型，通过蒙特卡洛采样和VLM奖励进行策略评估。
result: 世界模型评估的成功率与真实世界成功率高度相关，且能正确排序策略。
conclusion: 世界模型可作为有效的策略评估替代环境，降低对真实测试的依赖。
---

## Abstract
Evaluating robot control policies is difficult: real-world testing is costly, and handcrafted simulators require manual effort to improve in realism and generality. We propose a world-model-based policy evaluation environment (WorldGym), an autoregressive, action-conditioned video generation model which serves as a proxy to real world environments. Policies are evaluated via Monte Carlo rollouts in the world model, with a vision-language model providing rewards. We evaluate a set of VLA-based real-robot policies in the world model using only initial frames from real robots, and show that policy success rates within the world model highly correlate with real-world success rates. Moreoever, we show that WorldGym is able to preserve relative policy rankings across different policy versions, sizes, and training checkpoints. Due to requiring only a single start frame as input, the world model further enables efficient evaluation of robot policies' generalization ability on novel tasks and environments. We find that modern VLA-based robot policies still struggle to distinguish object shapes and can become distracted by adversarial facades of objects. While generating highly realistic object interaction remains challenging, WorldGym faithfully emulates robot motions and offers a practical starting point for safe and reproducible policy evaluation before deployment.

---

## 论文详细总结（自动生成）

# WorldGym: 作为策略评估环境的世界模型 —— 论文详细总结

## 1. 论文的核心问题与整体含义（研究动机和背景）

- **核心问题**：机器人控制策略的评估面临两难困境——真实世界的测试成本高昂且难以大规模重复；而手工设计的仿真器需要大量人工努力才能提升逼真度和泛化能力，无法快速适配新任务或新环境。
- **整体含义**：提出一种基于**世界模型**的策略评估框架（WorldGym），将自回归、动作条件的视频生成模型作为真实世界的代理环境，从而使策略评估变得低成本、安全且可重复。该框架有望替代昂贵的真实测试和僵化的手工仿真器，为机器人策略的快速迭代提供新范式。

## 2. 论文提出的方法论：核心思想、关键技术细节

- **核心思想**：利用条件视频生成模型构建一个“世界模型”，该模型以机器人的初始帧和动作序列为条件，生成后续的视频帧。策略在此世界模型中进行**蒙特卡洛 rollout**（即多次模拟执行），并使用**视觉语言模型（VLM）**自动提供奖励信号（例如判断任务是否成功）。
- **关键技术细节**：
  - **世界模型结构**：自回归的、动作条件的视频生成模型。输入为当前帧和机器人动作，输出下一帧，逐帧生成完整轨迹。
  - **策略评估流程**：对于待评估的策略，给定真实世界的一个起始帧，策略在每一时间步输出动作，世界模型根据当前帧和动作生成下一帧，重复直到任务结束。多次采样（蒙特卡洛）得到平均成功率。
  - **奖励函数**：由预训练的视觉语言模型（VLM）根据生成视频判断任务是否成功（如“物体是否被抓起”），无需人工标注或手工设计奖励。
  - **仅需单张起始帧**：世界模型不需要完整的状态信息，仅需初始图像即可开始评估，因此适合新任务或新环境的零样本泛化评估。

## 3. 实验设计：数据集 / 场景、 benchmark、对比方法

- **实验场景**：基于真实机器人操作任务，评估一系列**VLA（Vision-Language-Action）策略**（视觉-语言-动作大模型策略）在世界模型中的表现。
- **使用的数据**：未在摘要中明确指定具体数据集名称，但推测使用了真实机器人采集的初始帧作为评估种子。
- **Benchmark**：以真实世界中策略的成功率作为黄金标准，比较世界模型评估的成功率与真实成功率的相关性。
- **对比方法**：论文未明显列出其他基线方法，主要对比了**不同版本、不同大小、不同训练检查点**的多个VLA策略的排名一致性。此外还测试了策略在**新任务和新环境**上的泛化能力（例如物体形状变化、对抗性外观干扰）。

## 4. 资源与算力

- 元数据及摘要中**未明确说明**训练世界模型或评估策略所使用的GPU型号、数量、训练时长等具体算力信息。仅能推断实验涉及视频生成模型和VLM，通常需要高算力（如A100或V100），但无法给出确切数字。

## 5. 实验数量与充分性

- **实验数量**：根据摘要描述，实验覆盖了：
  - 多组策略版本（不同架构大小、不同训练步数）的成功率对比；
  - 泛化能力测试（新任务、新环境、物体形状变化、对抗性外观）；
  - 世界模型评估与真实世界成功率的相关性分析；
  - 策略排名保持性验证。
- **充分性与客观性**：
  - **正面**：评估指标直接对比真实世界，公平性较好；蒙特卡洛采样降低了随机性影响；使用VLM自动奖励，避免人工偏差。
  - **局限**：摘要未报告具体实验次数、置信区间、统计显著性等细节，无法判定是否进行了充分的消融实验（如不同VLM奖励函数、不同视频生成模型架构）。另外，仅在单一类型任务（机器人操作）上验证，泛化到其他领域（如人机交互、自动驾驶）尚未证明。

## 6. 论文的主要结论与发现

- **主要结论**：
  - WorldGym评估的策略成功率与**真实世界成功率呈高度相关**，表明世界模型可以作为有效的代理评估环境。
  - WorldGym能够**保持不同策略间的相对排名**（包括不同版本、大小、训练检查点），这对于模型选择和迭代具有重要意义。
  - 现代VLA策略**仍然难以区分物体形状**，并**容易受到对抗性外观（adversarial facades）干扰**，揭示了当前策略的脆弱性。
  - 尽管生成高度逼真的物体交互仍然具有挑战性，WorldGym能够**忠实模拟机器人自身的运动**，为安全且可重复的策略评估提供了实用起点。

## 7. 优点：方法或实验设计上的亮点

- **低成本**：仅需单张起始帧，无需大量真实测试数据，大幅降低评估成本。
- **自动化奖励**：利用VLM提供奖励，无需手工设计或人工标签。
- **泛化评估能力**：可直接用于新任务、新环境，无需重新训练仿真器。
- **排名保持**：验证了世界模型能正确排序策略，这在模型选择中至关重要。
- **安全可重复**：完全在虚拟环境中进行，避免真实机器人损毁或危险，且实验可复现。
- **诊断能力**：通过世界模型暴露了VLA策略对物体形状和外观的敏感性，有助于定向改进。

## 8. 不足与局限

- **物体交互逼真度不足**：世界模型在生成物体动态变化（如抓取、移动）方面仍有挑战，可能影响评估准确性。
- **实验覆盖有限**：未公开其他机器人任务（如导航、操控多种材质）或不同域（如双手机器人）的验证，外部有效性存疑。
- **算力资源未报告**：缺少训练与推理成本信息，不利于他人复现或判断可行性。
- **偏差风险**：世界模型可能继承训练数据的分布偏差，导致评估结果偏向于常见场景，对长尾或罕见情况可能失效。
- **VLM奖励的可靠性**：VLM对成功与否的判断可能存在误判（特别是对于遮拦或模糊场景），影响评估信度。
- **缺乏与经典仿真器的对比**：未与MuJoCo、Isaac Gym等传统仿真器在保真度、成本、泛化性上进行定量比较。

（完）
