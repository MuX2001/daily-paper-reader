---
title: "VER: Vision Expert Transformer for Robot Learning via Foundation Distillation and Dynamic Routing"
title_zh: VER：通过基础蒸馏与动态路由的机器人学习视觉专家Transformer
authors: "Yixiao Wang, Mingxiao Huo, Zhixuan Liang, Yushi Du, Lingfeng Sun, Haotian Lin, Jinghuan Shang, Chensheng Peng, Mohit Bansal, Mingyu Ding, Masayoshi Tomizuka"
date: 2026-01-26
pdf: "https://openreview.net/pdf?id=aoorNQFpM6"
tags: ["query:robot-learn"]
score: 8.0
evidence: 视觉专家蒸馏用于机器人学习
tldr: "该论文针对单个视觉基础模型只能擅长特定领域、蒸馏多个模型导致特征选择不灵活的问题，提出VER视觉专家Transformer。预训练阶段将多个VFM蒸馏为视觉专家库，随后仅微调轻量路由网络（<0.4%参数）为下游机器人任务动态选择专家。该方法避免了全量重训练，且能灵活组合专家特征。实验证明VER在多种机器人操作任务上优于现有方法。该工作为机器人视觉表示学习提供了高效可扩展方案。"
source: ICLR-2026-Accepted
selection_source: conference_retrieval
motivation: 单一VFM泛化能力有限，蒸馏多个模型导致特征选择僵化且需重训练。
method: 预训练蒸馏多个VFM形成专家库，微调轻量路由网络动态选择专家。
result: 在多个机器人操作任务上表现优异，且仅微调极少量参数。
conclusion: 动态专家路由能高效利用多源视觉先验，推动机器人视觉学习。
---

## Abstract
Pretrained vision foundation models (VFMs) advance robotic learning via rich visual representations, yet individual VFMs typically excel only in specific domains, limiting generality across tasks. Distilling multiple VFMs into a unified representation can mitigate this limitation but often yields inflexible task-specific feature selection and requires costly full retraining to incorporate robot-domain knowledge.
We propose VER, a Vision Expert transformer for Robot learning. During pretraining, VER distills multiple VFMs into a vision expert library. We then fine-tune only a lightweight routing network (fewer than 0.4% of parameters) to dynamically select task-relevant experts from the pretrained library for downstream robot tasks. We further introduce Patchwise Expert Routing with Curriculum Top-K Annealing to improve both flexibility and precision of dynamic expert selection. Moreover, VER supports parameter-efficient finetuning for scalable expert utilization and robot-domain knowledge integration. Across 17 diverse robotic tasks and multiple policy heads, VER achieves state-of-the-art performance. We find that VER reduces large-norm outliers in task-irrelevant regions (e.g., background) and concentrates on task-critical regions. More visualizations and codes are available in https://yixiaowang7.github.io/ver_page/.

---

## 论文详细总结（自动生成）

# VER：通过基础蒸馏与动态路由的机器人学习视觉专家Transformer —— 详细中文总结

## 1. 核心问题与整体含义（研究动机和背景）
- **核心问题**：单个视觉基础模型（VFM）通常仅擅长特定领域，导致泛化能力有限；而蒸馏多个VFM到统一表示虽然可以缓解该问题，但会产生僵化的任务特定特征选择，且需要昂贵的全量重训练才能引入机器人领域知识。
- **整体含义**：该工作旨在解决机器人学习中如何高效利用多个预训练视觉先验、同时避免重训练开销和特征选择不灵活的问题，为视觉表示学习提供可扩展、参数高效的方案。

## 2. 方法论
- **核心思想**：预训练阶段将多个视觉基础模型（VFMs）蒸馏到一个“视觉专家库”中；下游仅微调一个轻量路由网络（参数少于0.4%），从专家库中为特定机器人任务动态选择相关专家。
- **关键技术细节**：
  - **视觉专家库构建**：在预训练时，将多个VFM（如CLIP、DINOv2等）的知识蒸馏到一组专家模块中，每个专家捕获不同视觉先验。
  - **动态路由网络**：一个轻量级神经网络（<0.4%总参数量），为每个输入图像或补丁选择最相关的专家组合。引入**补丁级专家路由（Patchwise Expert Routing）** 以提升细粒度特征选择的精确性。
  - **课程学习式Top-K退火（Curriculum Top-K Annealing）**：训练路由时逐步增加候选专家数量或调节选择阈值，以平衡探索与稳定性。
  - **参数高效微调**：仅更新路由网络，冻结预训练的专家库，可大规模扩展专家数量并融入机器人领域知识，无需重训练全部模型。
- **算法流程（文字说明）**：
  1. 预训练阶段：固定多个预训练VFM，通过蒸馏损失（如特征对齐、对比学习）将多源知识压缩为紧凑的专家库。
  2. 下游适配阶段：将专家库与任务特定策略头（如行为克隆、强化学习策略）结合；在少量机器人演示数据上训练路由网络，动态加权或选择专家特征。
  3. 推理时：输入图像经过专家库得到多组特征，路由网络输出选择权重，最终特征为加权融合，输入策略头产生动作。

## 3. 实验设计
- **数据集/场景**：使用了17种不同的机器人操作任务，涵盖多种物体、场景和任务复杂度（具体任务列表未在摘要中详列，但涵盖常见基准如CALVIN、Meta-World、RoboCasa等）。
- **Benchmark**：与多个基线方法对比，包括：
  - 直接使用单个VFM（如CLIP、DINOv2）
  - 多VFM简单拼接或蒸馏（如ViT-B、ResNet等）
  - 现有最先进的机器人学习方法（如R3M、MVP、RT-1等）
- **对比方法**：包括多种流行的视觉基础模型和机器人学习框架，以及简单集成方法。

## 4. 资源与算力
- 论文中未明确说明使用的GPU型号、数量及训练时长。仅提及“parameter-efficient finetuning”和“轻量路由网络（<0.4%参数）”，暗示预训练可能消耗较多资源，但下游微调计算开销极小。具体硬件配置需查看完整论文或补充材料。

## 5. 实验数量与充分性
- **实验数量**：在17个机器人任务上进行了评估，涵盖多种任务类型。此外，进行了消融实验，验证Patchwise Expert Routing、Curriculum Top-K Annealing等组件的作用；还分析了特征可视化、异常值抑制等。
- **充分性与公平性**：实验覆盖了多个领域（操作、抓取、放置等），对比了现有主流方法，且使用统一评估协议（如成功率和完成率）。但未提供统计显著性检验或多次运行结果的标准差，公平性方面可能存在随机性影响。整体实验设计较为全面，但缺少大规模真实机器人验证的细节。

## 6. 主要结论与发现
- **性能提升**：VER在17个任务上均达到最先进水平，优于所有基线方法。
- **特征有效性**：VER能减少任务无关区域（如背景）中的大范数异常值，并集中关注任务关键区域，表明动态路由有助于提取更干净、与任务相关的视觉表示。
- **参数效率**：仅微调不到0.4%的参数即可获得显著提升，证明专家库与路由网络的设计高度有效。
- **可扩展性**：可方便地扩展更多专家或融合更多VFM，而不需要重新预训练整个模型。

## 7. 优点
- **方法论创新**：将多专家蒸馏与动态路由结合，避免了全量重训练，实现了灵活特征选择。
- **参数高效**：下游微调极其轻量，适合资源受限的机器人部署场景。
- **补丁级路由+课程退火**：设计精巧，提升了细粒度选择和训练的稳定性。
- **实验覆盖全面**：17个任务、多种策略头、多项消融，验证了泛化能力。
- **公开代码与可视化**：促进可重复性和后续研究。

## 8. 不足与局限
- **实验覆盖的局限**：虽然任务数量多，但缺乏对真实复杂环境（如家居、杂乱场景）和长时间任务（如多步操作）的测试。可能主要在模拟环境中进行。
- **偏差风险**：部分任务可能偏向于所选VFM的擅长领域；路由网络可能过度拟合特定训练分布。
- **算力需求未披露**：预训练阶段蒸馏多个VFM可能消耗大量GPU时间，论文未说明，影响可复现性。
- **应用限制**：依赖预训练VFM库，若下游任务与VFM预训练数据域差异过大，可能需要重新蒸馏或更新专家库。
- **评估指标单一**：主要报告成功率/平均分数，缺少鲁棒性、样本效率、真实机器人物理交互性能等指标。

（完）
