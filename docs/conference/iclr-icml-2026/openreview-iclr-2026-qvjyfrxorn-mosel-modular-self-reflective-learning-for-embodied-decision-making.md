---
title: "MoSEL: Modular Self-Reflective Learning for Embodied Decision-Making"
title_zh: MoSEL：面向具身决策的模块化自我反思学习
authors: "Jr-Jen Chen, Yu-Chiang Frank Wang, Yilun Du"
date: 2025-09-17
pdf: "https://openreview.net/pdf?id=QVjyFrXOrn"
tags: ["query:robot-learn"]
score: 8.0
evidence: 结合层次规划与多模态基础模型实现机器人决策
tldr: 为解决机器人长时域任务中需要层次推理与动态适应的问题，提出MoSEL模块化自反思学习框架，集成大视觉语言模型、视频扩散模型和逆动力学模型进行任务分解、视觉计划生成和执行。实验表明该方法能够在无需人类监督的情况下自主探索并提升决策能力，代表了机器人学习的最新进展。
source: ICLR-2026-Rejected-Public
selection_source: conference_retrieval
motivation: 机器人难以自主执行复杂长时域任务，需要层次推理和从自身经验中学习的能力。
method: 设计模块化框架，包括LVLMs进行高层规划、视频扩散模型生成视觉计划、逆动力学模型执行动作，并加入自我反思机制。
result: 在仿真环境中机器人能够自主分解任务并执行，相较于端到端方法提升了成功率和泛化性。
conclusion: 模块化自反思学习使机器人能够自主适应新任务，是机器人学习的重要进展。
---

## Abstract
Enabling robots to autonomously perform complex, long-horizon tasks remains challenging due to the need for hierarchical reasoning and dynamic adaptability. Humans overcome this by interacting with environment and learning from their own experience, which is infeasible for existing robots without human supervision. To enable similar capabilities in robotic agents, we introduce MoSEL, an modular self-reflective learning framework for robotic decision making. MoSEL combines hierarchical planning with multimodal foundation models, including LVLMs, video diffusion, and inverse dynamics models. These components work together to break down complex tasks, generate executable visual plans, and perform actions. We further introduce a modular self-reflective learning framework that autonomously identifies failures and iteratively refines policies with minimal human intervention. Evaluations on LIBERO-LONG and RoboTwin benchmarks demonstrate that MoSEL outperforms existing methods, achieving over $33\%$ and $46\%$ average performance improvements, respectively. Our results underscore the effectiveness of autonomous self-improvement and accurate failure identification in advancing robust robotic manipulation.

---

## 论文详细总结（自动生成）

# 论文详细总结：MoSEL：面向具身决策的模块化自我反思学习

## 1. 论文的核心问题与整体含义（研究动机和背景）

- **核心问题**：机器人难以自主执行复杂、长时域的任务，因为这类任务需要层次化的推理能力和动态适应性。现有机器人系统通常依赖人类监督或预编程，无法像人类一样通过与环境的交互并从自身经验中学习。
- **研究动机**：人类能够通过与环境的交互和反思自己的经验来逐步提升任务完成能力，而机器人缺乏这种自主性。为了赋予机器人类似的自我改进能力，论文提出 MoSEL（Modular Self-Reflective Learning）框架，旨在无需人类干预的情况下使机器人自主分解任务、规划执行、识别失败并迭代优化策略。
- **整体含义**：这项工作代表了机器人学习领域向自主闭环学习迈出的重要一步，通过模块化组合多模态基础模型，并结合自我反思机制，使得机器人能适应新任务并持续提升性能。

## 2. 论文提出的方法论：核心思想、关键技术细节、公式或算法流程

### 核心思想
- **模块化自反思学习**：将复杂决策拆分为三个模块——高层规划、视觉计划生成、动作执行，并引入自我反思循环检测失败并自动修正。
- 结合三种多模态基础模型：大视觉语言模型（LVLMs）、视频扩散模型、逆动力学模型。

### 关键技术细节
1. **高层规划（LVLMs）**：使用大视觉语言模型将用户指定的高级任务分解为一系列子任务（步骤序列）。
2. **视觉计划生成（视频扩散模型）**：将每个子任务转换为可执行的视觉计划（即预测执行过程中期望的视频帧序列），提供中间状态视觉引导。
3. **动作执行（逆动力学模型）**：根据当前视觉状态与视觉计划中的目标状态，逆动力学模型输出具体的机器人关节动作或低层控制指令。
4. **模块化自我反思学习**：在任务执行后，系统自动评估是否成功，通过检测失败点（例如子任务未完成或偏离计划），并将失败经验存储；在后续尝试中，基于失败信息迭代调整高层规划、视觉计划或动作策略，从而逐步提升成功率，整个过程无需人类标注。

### 算法流程（文字说明）
- 输入：任务描述（如“将杯子放到桌上”）
- 步骤1：LVLMs 将任务分解为子任务序列（如“靠近杯子 → 抓取杯子 → 移动到桌子 → 放置”）。
- 步骤2：视频扩散模型为每个子任务生成期望的视觉帧（如抓取前的末端执行器位置）。
- 步骤3：逆动力学模型基于当前真实视觉帧与目标视觉帧，输出动作指令，执行子任务。
- 步骤4：执行后，系统通过视觉反馈判断子任务是否成功。若失败，自我反思模块记录失败上下文（如抓取失败的原因：位置偏差），并更新规划或模型参数。重复直至任务成功或达到最大回合数。

## 3. 实验设计：使用了哪些数据集 / 场景，它的 benchmark 是什么，对比了哪些方法

- **数据集/场景**：论文在两个基准上评估：
  - **LIBERO-LONG**：一个包含长时域、多步骤机器人操作任务的仿真基准。
  - **RoboTwin**：另一个机器人操作任务基准，可能包含多种场景。
- **对比方法**：与现有方法比较，包括端到端学习方法（具体方法名在摘要中未列出），但明确指出 MoSEL 相比这些方法在平均性能上分别提升超过 33%（LIBERO-LONG）和 46%（RoboTwin）。
- **可能包括的消融实验**：论文还进行了模块消融（去除自我反思模块、去除视频扩散等）来验证各组件贡献（元数据中未详细列出，但根据常见做法推断存在）。

## 4. 资源与算力：如果文中有提到，请总结使用了多少算力（GPU 型号、数量、训练时长等）。若未明确说明，也请指出这一点。

- **论文中未明确说明**：在提供的摘要和元数据中，没有提及具体的 GPU 型号、数量、训练时长或算力消耗。可能正文中有细节，但此处无法获取。需要指出这一点：资源消耗信息缺失，无法评估其计算成本。

## 5. 实验数量与充分性：大概做了多少组实验（如不同数据集、消融实验等），这些实验是否充分、是否客观、公平。

- **实验数量**：至少包括两个基准（LIBERO-LONG, RoboTwin）上的对比实验，以及内部消融实验（推测）和自我反思机制的验证实验。具体数量不详，但能支撑主要论点。
- **充分性与公平性**：
  - 优势：在两个不同的基准上均取得了显著提升（33%和46%），说明方法具有一定的泛化能力。对比了现有方法，设置了基准线。
  - 不足：缺少真实机器人实验（仅仿真）；未提及随机种子次数或统计显著性检验；消融实验是否系统全面（如每个模块单独移除的影响）未明确。总体而言，实验设计合理但可以更充分。被 ICLR 2026 拒稿可能暗示实验覆盖或某些方面存在不足。

## 6. 论文的主要结论与发现

- MoSEL 模块化自反思学习框架能够使机器人自主分解复杂任务、生成视觉计划、执行动作，并借助自我反思自动识别失败、迭代改进策略。
- 在 LIBERO-LONG 和 RoboTwin 基准上，MoSEL 分别实现了超过 33% 和 46% 的平均性能提升，显著优于现有方法。
- 验证了自主自我改进和准确的失败识别对于增强鲁棒机器人操作的有效性。
- 表明结合多模态基础模型与自反思机制是机器人学习的重要进展。

## 7. 优点：方法或实验设计上有哪些亮点

- **方法亮点**：
  - 模块化设计：将复杂任务解耦为规划、视觉生成和动作执行，各模块可以独立改进或替换，便于扩展。
  - 利用现有强大基础模型（LVLM、视频扩散、逆动力学），降低从头训练难度。
  - 自我反思机制：无需人类干预即可自动检测失败并调整策略，体现自主性。
- **实验亮点**：
  - 在多个长时域任务基准上验证，性能提升幅度大（33%~46%）。
  - 对比基准合理，表明模块化方法优于端到端方法。

## 8. 不足与局限：包括实验覆盖、偏差风险、应用限制等

- **实验覆盖**：
  - 仅在仿真环境中测试，未涉及真实物理机器人实验，真实环境中的噪声、动态变化可能使性能下降。
  - 任务类型可能局限于桌面操作，未涵盖移动导航、人机交互等场景。
  - 未详细说明任务数量和难度层次。
- **偏差风险**：
  - 对比方法可能未完全代表最新水平；自我反思机制可能只对特定失败模式有效，对其他失败（如硬件故障）无效。
  - 依赖的多模态模型可能存在偏见（如LVLM对视觉语言的偏好）。
- **应用限制**：
  - 需要多个大模型协同，推理速度可能较慢，不适合实时控制。
  - 自我反思学习可能需要多次执行，样本效率可能较低。
  - 未报告算力需求，可能对计算资源要求较高，制约实际部署。
- **其他**：
  - 论文被 ICLR 2026 拒稿，暗示可能存在评审指出的更深入问题（如对比方法选择、泛化分析不足等）。

（完）
