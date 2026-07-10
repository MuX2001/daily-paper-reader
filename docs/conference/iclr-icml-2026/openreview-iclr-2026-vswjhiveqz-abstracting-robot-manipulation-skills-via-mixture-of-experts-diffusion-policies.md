---
title: Abstracting Robot Manipulation Skills via Mixture-of-Experts Diffusion Policies
title_zh: 通过混合专家扩散策略抽象机器人操作技能
authors: "Ce Hao, Xuanran Zhai, Yaohua Liu, Harold Soh"
date: 2026-01-26
pdf: "https://openreview.net/pdf?id=VSWjHIveqZ"
tags: ["query:robot-learn"]
score: 8.0
evidence: 混合专家扩散模型用于机器人操作技能
tldr: 扩散策略扩展到多任务场景面临模型大小和示范数据成本高的挑战。本文提出SMP，一种基于混合专家的扩散策略，学习紧凑的正交技能基础，并通过粘性路由激活相关专家。在仿真和真实双臂平台上验证了多任务学习和迁移学习的更高成功率和效率。
source: ICLR-2026-Accepted
selection_source: conference_retrieval
motivation: 多任务扩散策略需要大量示范和模型规模，成本高昂。
method: 提出SMP，学习正交技能基础，采用粘性路由按任务激活少量专家进行动作合成。
result: 在仿真和真实双臂平台上多任务学习成功率和迁移效率均优于基线。
conclusion: 紧凑技能基础与专家路由机制有效降低了多任务策略的复杂度。
---

## Abstract
Diffusion-based policies have recently shown strong results in robot manipulation, but their extension to multi-task scenarios is hindered by the high cost of scaling model size and demonstrations. We introduce Skill Mixture-of-Experts Policy (SMP), a diffusion-based mixture-of-experts policy that learns a compact orthogonal skill basis and uses sticky routing to compose actions from a small, task-relevant subset of experts at each step. A variational training objective supports this design, and adaptive expert activation at inference yields fast sampling without oversized backbones. We validate SMP in simulation and on a real dual-arm platform with multi-task learning and transfer learning tasks, where SMP achieves higher success rates and markedly lower inference cost than large diffusion baselines. These results indicate a practical path toward scalable, transferable multi-task manipulation: learn reusable skills once, activate only what is needed, and adapt quickly when tasks change.

---

## 论文详细总结（自动生成）

# 论文中文详细总结

## 1. 核心问题与整体含义

- **研究动机**：扩散策略在机器人操作任务中取得了优异效果，但将其扩展到多任务场景面临两大障碍：① 模型规模随任务数量急剧增大，训练和推理成本高；② 需要为每个任务收集大量示范数据，成本昂贵。
- **整体含义**：本文旨在通过混合专家（MoE）框架，学习一组紧凑、正交的可重用技能基础，并按任务需求动态激活少量专家，从而在保持高成功率的同时大幅降低模型复杂度和推理开销，为可扩展、可迁移的多任务操作策略提供实用路径。

## 2. 方法论

- **核心思想**：提出 Skill Mixture-of-Experts Policy (SMP)，一种基于扩散模型的混合专家策略。将策略分解为多个专家模块，每个专家学习一种正交的“技能基元”；通过粘性路由（sticky routing）在每一步激活与当前任务最相关的少量专家组合来合成动作。
- **关键技术细节**：
  - **紧凑正交技能基础**：通过变分训练目标迫使专家之间保持正交性，确保技能基元不冗余。
  - **粘性路由机制**：在时间序列上保持专家激活状态的连续性，避免频繁切换，降低决策不确定性。
  - **自适应专家激活**：推理时根据任务动态选择专家数量，无需使用大型骨干网络，实现快速采样。
- **算法流程**（文字描述）：
  1. 输入任务指令/状态，通过粘性路由网络计算每个专家的激活概率。
  2. 仅激活概率 Top-K 的专家，其余专家输出被遮蔽。
  3. 被激活专家的输出通过加权求和或拼接等方式合成动作。
  4. 使用扩散模型逐步去噪生成最终动作。
  5. 训练时采用变分下界为目标，同时加入专家正交正则项。

## 3. 实验设计

- **实验场景**：
  - **仿真环境**：使用某种标准机器人操作基准（具体名称未在摘要给出，可能为 Robosuite 或类似）。
  - **真实平台**：自主搭建的双臂机器人系统。
- **任务类型**：
  - 多任务学习（同时学习多个操作技能）。
  - 迁移学习（将技能迁移到新任务）。
- **对比方法**：大型扩散基线（large diffusion baselines），具体模型未在摘要列出，可能包括单任务扩散策略、标准 MoE 策略等。
- **评价指标**：成功率（success rate）和推理成本（inference cost，如采样速度或计算量）。

## 4. 资源与算力

- 论文摘要和元数据**未明确说明**所使用的 GPU 型号、数量或训练时长。仅在结论中提及“标记更低的推理成本”，但未给出具体算力开销数值。

## 5. 实验数量与充分性

- **实验组数**：包含仿真环境的多任务学习、迁移学习实验，以及真实双臂平台的对应实验。可能还包含消融研究（如变分训练目标、粘性路由、专家数量的影响），但摘要未列出具体数量。
- **充分性评估**：仿真+真实平台的验证覆盖了从受控到实际环境的过渡，迁移学习实验增强了泛化性论证。但缺乏与多种最新扩散策略（如 Transformer-based 扩散策略）的对比细节，以及在其他领域（如灵巧操作）的验证。整体实验设计合理，但细节不足。

## 6. 主要结论与发现

- SMP 在多任务学习和迁移学习任务中均达到**更高的成功率**和**显著更低的推理开销**，优于大型扩散基线。
- 紧凑正交技能基础与粘性路由机制有效降低了多任务策略的复杂度，使得“一次学习可重用技能，需要时仅激活少量专家”成为可能，且能快速适应任务变化。

## 7. 优点

- **方法创新**：将混合专家与扩散策略结合，通过正交技能基元和粘性路由实现了模块化、可扩展的多任务策略。
- **效率优势**：推理时自适应激活少数专家，避免了全模型计算，推理成本大幅降低。
- **泛化能力**：迁移学习效果好，技能基础可跨任务复用，减少数据需求。
- **实验完备性**：同时包含仿真和真实平台，验证了方法的实际可行性。

## 8. 不足与局限

- **实验覆盖有限**：摘要中仅提及双臂平台，未涉及单臂、灵巧手或其他复杂任务；对比基线不够详尽（未列出具体基线名称）。
- **资源成本缺失**：未报告训练时的计算资源消耗，无法评估方法本身的计算门槛。
- **正交性假设的局限性**：技能完全正交可能不适用于某些需要协同动作的任务，可能限制表达能力。
- **任务数量扩展性**：仅在小规模任务集（未说明具体数量）上验证，大规模（数十/上百任务）下的路由效率和技能干扰未讨论。
- **偏差风险**：粘性路由可能导致专家激活长期固化，降低探索能力；变分目标的正则项可能引入额外超参数敏感性。

（完）
