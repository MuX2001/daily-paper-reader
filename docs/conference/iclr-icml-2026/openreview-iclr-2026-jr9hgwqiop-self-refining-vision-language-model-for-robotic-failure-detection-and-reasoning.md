---
title: Self-Refining Vision Language Model for Robotic Failure Detection and Reasoning
title_zh: 面向机器人故障检测与推理的自精炼视觉语言模型
authors: "Carl Qi, Xiaojie Wang, Silong Yong, Stephen Sheng, Huitan Mao, sriram srinivasan, Manikantan Nambi, Amy Zhang, Yesh Dattatreya"
date: 2026-01-26
pdf: "https://openreview.net/pdf?id=jr9hGWQioP"
tags: ["query:robot-learn"]
score: 7.0
evidence: 自精炼VLM用于机器人故障检测与推理
tldr: 该论文针对机器人故障推理通常依赖封闭集分类或大量人工标注的局限，提出ARMOR：自适应轮次多任务模型，将故障检测与推理建模为多任务自精炼过程。模型迭代预测检测结果和自然语言推理，在训练中使用异构监督信号。实验表明ARMOR能检测细微故障并给出合理解释，降低对标注的依赖。该工作提升了机器人系统的可靠性和可解释性。
source: ICLR-2026-Accepted
selection_source: conference_retrieval
motivation: 现有方法依赖于封闭集分类或大量标注，难以处理细微故障。
method: 提出ARMOR多任务自精炼模型，迭代输出检测与自然语言推理。
result: 在故障检测任务上取得优异性能，且生成合理的语言解释。
conclusion: 自精炼VLM能有效提升机器人故障检测与推理的鲁棒性和可解释性。
---

## Abstract
Reasoning about failures is crucial for building reliable and trustworthy robotic systems. Prior approaches either treat failure reasoning as a closed-set classification problem or assume access to ample human annotations. Failures in the real world are typically subtle, combinatorial, and difficult to enumerate, whereas rich reasoning labels are expensive to acquire. We address this problem by introducing ARMOR: Adaptive Round-based Multi-task mOdel for Robotic failure detection and reasoning. We formulate detection and reasoning as a multi-task self-refinement process, where the model iteratively predicts detection outcomes and natural language reasoning conditioned on past outputs. During training, ARMOR learns from heterogeneous supervision - large-scale sparse binary labels and small-scale rich reasoning annotations - optimized via a combination of offline and online imitation learning. At inference time, ARMOR generates multiple refinement trajectories and selects the most confident prediction via a self-certainty metric. 
Experiments across diverse environments show that ARMOR achieves state-of-the-art performance by improving over the previous approaches by up to 30\% on failure detection rate and up to 100\% in reasoning measured through LLM fuzzy match score, demonstrating robustness to heterogeneous supervision and open-ended reasoning beyond predefined failure modes. We provide dditional visualizations on our website: https://sites.google.com/utexas.edu/armor.

---

## 论文详细总结（自动生成）

好的，以下是根据您提供的论文信息生成的结构化、中文总结。

---

# 论文详细中文总结

## 1. 核心问题与整体含义（研究动机和背景）
- **问题**：机器人系统在实际运行中常发生故障（failure），而现有故障推理方法存在两大局限：
    1. 多数方法将故障推理视为**封闭集分类**（closed-set classification），仅能识别预先定义的故障类型，无法处理真实世界中细微、组合、难以枚举的故障。
    2. 依赖**大量人工标注**的丰富推理标签，获取成本高昂，难以规模化。
- **动机**：亟需一种能同时检测细微故障并进行合理解释、且减少对密集人工标注依赖的方法，以提升机器人系统的可靠性和可解释性。

## 2. 方法论：ARMOR（Adaptive Round-based Multi-task mOdel for Robotic failure detection and reasoning）
- **核心思想**：将故障检测与推理建模为**多任务自精炼过程**（multi-task self-refinement），模型迭代地预测检测结果和自然语言推理，利用自身先前输出进行条件生成，逐步提升检测和解释质量。
- **关键技术细节**：
    - **多任务学习**：同时完成两个任务——故障检测（二分类或细粒度分类）和故障推理（生成自然语言解释）。
    - **迭代自精炼**：模型在多个“轮次”（round）中依次输出检测结果和推理，每轮的输出作为下一轮的条件（conditioned on past outputs）。通过这种自循环，模型可以修正初始错误，生成更一致的解释。
    - **异构监督训练**：结合两类训练信号——**大规模稀疏二元标签**（仅指示故障与否）和**小规模丰富推理标注**（包含详细的语言解释）。训练采用**离线模仿学习**（offline imitation learning）与**在线模仿学习**（online imitation learning）的组合策略。
    - **推理阶段选择策略**：生成多条精炼轨迹（refinement trajectories），利用**自置信度指标**（self-certainty metric）选择最可靠的预测结果作为最终输出。
- **算法流程（文字说明）**：
    1. 输入机器人感知数据（如状态、图像等）。
    2. 初始轮：模型输出第一个检测结果（有/无故障）。
    3. 自精炼循环：基于前一检测结果和已有信息，模型输出自然语言推理（为什么是/不是故障）；然后再次输出更新后的检测结果，如此重复若干轮。
    4. 生成多条轨迹后，计算每条轨迹的自置信度，选取最高置信度的轨迹作为最终检测与解释。

## 3. 实验设计
- **数据集/场景**：论文在多类不同的机器人环境（diverse environments）中进行实验，但具体环境名称未在摘要中明确提及。从题目和动机推断可能涵盖仿真和真实场景的多种故障（如操作失败、感知错误等）。
- **Benchmark**：比较方法包括之前的机器人故障检测与推理方法（具体名称未给出），但性能对比明确给出了两个指标：
    - **故障检测率**（Failure Detection Rate）
    - **推理质量**：使用**LLM模糊匹配分数**（LLM fuzzy match score）衡量生成的自然语言解释与标准解释的相似度。
- **对比方法**：文中提到“previous approaches”，但未列出具体基线名称。

## 4. 资源与算力
- **文中未明确说明**：摘要及元数据未提及所用GPU型号、数量、训练时长等算力信息。这一点在资源层面存在信息缺失。

## 5. 实验数量与充分性
- **实验数量**：仅从摘要可知进行了一组跨环境（diverse environments）的对比实验，以及基于消融研究（通过组合离线/在线模仿学习、多任务自精炼等设计）可以推断有相关消融实验，但具体数量未披露。
- **充分性与公平性**：
    - 优点：在多个不同环境中测试，且指出了相对于之前方法的大幅提升（检测率提升30%，推理分数提升100%），结果有显著性。
    - 不足：缺乏基线模型的具体名称和配置，也未提供统计显著性检验或误差线。实验覆盖的故障类型和环境多样性尚需完整论文补充。

## 6. 主要结论与发现
- ARMOR在故障检测率和推理质量上均达到**最优性能**（state-of-the-art），相比之前方法：
    - 故障检测率提升高达**30%**。
    - 推理质量（基于LLM模糊匹配）提升高达**100%**。
- 证明了对**异构监督信号**的鲁棒性：仅利用少量丰富推理标注和大规模稀疏标签即可有效学习。
- 能够进行**开放集推理**（open-ended reasoning），不局限于预定义的故障模式。

## 7. 优点
- **创新性**：首次将自精炼（self-refinement）机制引入机器人故障检测与推理，使模型能通过迭代自我修正提升性能。
- **标注效率**：利用异构监督（稀疏+丰富），显著降低对大量精细标注的依赖，更具现实可行性。
- **可解释性**：输出自然语言推理，增强机器人故障的可解释性，有利于人机协作和调试。
- **稳健性**：通过多轨迹选择和自置信度指标，提升预测的稳健性。

## 8. 不足与局限
- **实验细节不透明**：未给出具体环境、数据集大小、基线方法名称，导致难以复现和独立验证。
- **算力信息缺失**：无法评估训练成本与资源需求。
- **潜在偏差风险**：
    - 推理质量评估采用LLM模糊匹配，可能受LLM自身偏好影响。
    - 异构监督中稀疏标签与丰富标签的比例、分布可能影响泛化，论文未说明。
- **应用限制**：
    - 自精炼过程可能增加推理时延，对实时性要求高的机器人系统可能不友好。
    - 开放集推理虽然灵活，但可能产生不准确或荒谬的解释，缺乏安全保证。
- **对比公平性**：未说明是否控制计算量、模型参数量等因素，对比可能不绝对公平。

---

（完）
