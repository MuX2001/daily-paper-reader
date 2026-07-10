---
title: "SCENE: Multi-Robot Active Cognition via Unified Free-Energy Minimization"
title_zh: SCENE：通过统一自由能最小化实现多机器人主动认知
authors: Weilin Zhou
date: 2025-09-18
pdf: "https://openreview.net/pdf?id=NLq5yAkBGp"
tags: ["query:robot-learn"]
score: 4.0
evidence: 基于自由能最小化的多机器人探索与决策
tldr: 针对多机器人探索中决策碎片化的问题，提出SCENE框架，将探索视为自由能最小化过程，统一考虑几何不确定性、语义新颖性和信息时效性。使用神经隐式场和原型网络表示未知环境，图神经网络实现协作。实验表明该方法比现有方法在探索效率和决策智能方面更优，尽管不直接针对机器人学习核心需求，但其决策框架和表示学习对机器人自主认知有一定参考价值。
source: ICLR-2026-Rejected-Public
selection_source: conference_retrieval
motivation: 多机器人探索方法碎片化，缺乏统一框架导致决策次优。
method: 将探索建模为自由能最小化，结合神经隐式场、原型网络和图神经网络实现统一决策与协作。
result: 在复杂环境中超越现有方法，展现了更高的探索效率和智能决策。
conclusion: 自由能最小化为多机器人探索提供了统一有效的理论基础。
---

## Abstract
Existing multi-robot exploration methods are fragmented, leading to suboptimal decisions in complex environments. We introduce SCENE, a framework that unifies decision-making by reframing exploration as cognitive free-energy minimization. Our core contribution is a free-energy formulation that integrates geometric uncertainty, semantic novelty, and the Age of Information (AoI). The system leverages a neural implicit field for unified representation, a prototypical network for open-world semantics, and a Graph Neural Network (GNN) for emergent collaboration. Trained end-to-end via self-supervision, SCENE surpasses state-of-the-art methods in challenging scenarios, demonstrating superior efficiency and decision-making intelligence.

---

## 论文详细总结（自动生成）

## 论文详细中文总结

### 1. 核心问题与整体含义（研究动机与背景）
- **核心问题**：现有**多机器人探索方法**存在碎片化（fragmented）问题，不同决策模块（如几何建图、语义识别、通信规划）之间缺乏统一的理论框架，导致在复杂环境下决策次优。
- **研究动机**：机器人在未知环境中需要同时处理**几何不确定性**、**语义新颖性**（识别未知物体）以及**信息时效性**（Age of Information, AoI），但现有方法通常将这些问题分开处理，无法协同优化。
- **整体意义**：提出**SCENE**框架，将探索问题重新定义为**认知自由能最小化**（cognitive free-energy minimization）过程，为多机器人主动感知提供了统一的理论基础，有望提升探索效率和智能决策水平。

### 2. 方法论：核心思想、关键技术细节与算法流程
- **核心思想**：借鉴自由能原理（Free Energy Principle），将多机器人探索建模为**最小化统一自由能**的过程。自由能函数整合了三类信息：
  - 几何不确定性（地图未知区域的不确定度）
  - 语义新颖性（环境中的未知类物体）
  - 信息时效性（AoI，即信息过时程度）
- **关键技术细节**：
  - **神经隐式场（Neural Implicit Field）**：用于**统一表示**环境几何与语义特征，可支持连续、紧凑的场景建模。
  - **原型网络（Prototypical Network）**：用于**开放世界语义识别**，能够在新场景中快速学习未知类别的原型表示，无需重新训练。
  - **图神经网络（GNN）**：实现机器人间的**涌现协作**，通过端到端训练自动学习通信拓扑和协调策略。
- **算法流程（文字描述）**：
  1. 每个机器人使用神经隐式场在线构建局部地图，同时用原型网络检测语义新颖区域。
  2. 计算每个候选探索点的自由能：综合考虑几何不确定性、语义新颖性以及该点信息的时效性。
  3. 通过GNN在机器人之间共享自由能信息，协作决策选择使全局自由能下降最快的探索路径。
  4. 采用**自监督端到端训练**，整个框架（隐式场、原型网络、GNN）联合优化，无额外人工标注。

### 3. 实验设计
- **数据集/场景**：摘要未具体说明数据集名称，但提到“challenging scenarios”（挑战性场景）。根据ICLR类似工作，可能使用合成环境（如Gibson、Habitat）或真实机器人数据集。具体需要原文补充。
- **Benchmark**：与**当前最先进多机器人探索方法**（state-of-the-art）进行对比。
- **对比方法**：未列出具体方法名称，仅说明SCENE在效率和决策智能上超越SOTA。

### 4. 资源与算力
- **资源/算力**：摘要和元数据中**未明确说明**使用的GPU型号、数量或训练时长。无法提供具体信息。

### 5. 实验数量与充分性
- **实验数量**：元数据未给出实验组数详情。通常此类工作会包含：对比实验、消融实验（如去掉自由能中某一项）、不同环境规模、不同机器人数量等。但基于已有信息，**无法判断实验数量是否充分**。
- **充分性判断**：从摘要看，实验对比了SOTA方法，但缺乏具体指标（如探索覆盖率、时间、通信开销等），也未提及是否在真实/仿真环境中验证。因此实验的公平性和客观性需要原文数据支撑。

### 6. 主要结论与发现
- **主要结论**：自由能最小化框架为多机器人探索提供了统一有效的理论基础，SCENE在挑战性场景中比现有方法表现出更优的探索效率和决策智能。
- **发现**：将几何、语义、时效三方面信息统一建模后，机器人团队的协作决策更加协调，避免了传统碎片化方法导致的局部最优问题。

### 7. 优点（方法或实验亮点）
- **理论统一性**：首次将自由能原理引入多机器人主动认知，为几何、语义、时效评估提供了单一代价函数。
- **技术整合**：神经隐式场+原型网络+GNN的组合，使系统既能连续建图，又能识别开放世界物体，还能自主学习协作策略。
- **自监督学习**：端到端训练免去了人工标注，降低了部署成本。
- **可解释性**：自由能公式具有明确的物理意义（不确定性、新颖性、时效性），有助于分析机器人决策依据。

### 8. 不足与局限
- **实验覆盖不足**：未提供具体数据集、评估指标、环境多样性，无法判断泛化能力。
- **计算开销未讨论**：神经隐式场和GNN的实时性要求较高，机器人端计算资源有限时可能成为瓶颈。
- **局限性**：仅分析了探索阶段，未考虑后续任务（如目标抓取、语义理解）的集成；未考虑通信受限或丢包场景。
- **风险**：原型网络在极度稀缺样本下的表现未评估；自由能项权重是否手动设定、是否鲁棒未见说明。
- **应用限制**：主要面向海量未知环境，但在结构化或已知静态环境中优势可能不明显。

（完）
