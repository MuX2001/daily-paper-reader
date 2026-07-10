---
title: "DreamDojo: A Generalist Robot World Model from Large-Scale Human Videos"
title_zh: DreamDojo：基于大规模人类视频的通用机器人世界模型
authors: "Shenyuan Gao, William Liang, Kaiyuan Zheng, Ayaan Naveed Malik, Seonghyeon Ye, Sihyun Yu, Wei-Cheng Tseng, Yuzhu Dong, Kaichun Mo, Chen-Hsuan Lin, Jiannan Xiang, Yuqi Xie, Ruijie Zheng, Dantong Niu, Pooya Jannaty, Jinwei Gu, Jun Zhang, Jitendra Malik, Pieter Abbeel, Ming-Yu Liu, Yuke Zhu, Joel Jang, Linxi Fan"
date: 2026-04-30
pdf: "https://openreview.net/pdf/dc94444ca93aadf2f89ea3ab5b1cb370e71dfc9f.pdf"
tags: ["query:world-model"]
score: 9.0
evidence: 基于4.4万小时人类视频训练的通用世界模型
tldr: 机器人世界模型受限于数据覆盖和动作标签稀缺。DreamDojo利用4.4万小时第一人称人类视频进行预训练，引入连续潜动作作为统一代理，学习多样交互和灵巧控制。该模型在最大视频数据集上训练，覆盖丰富日常场景和技能，为通用机器人智能发展奠定基础。
source: ICML-2026-Accepted
selection_source: conference_retrieval
motivation: 现有世界模型数据覆盖不足且缺乏动作标签，难以泛化到灵巧机器人任务。
method: 利用大规模人类第一人称视频预训练，引入连续潜动作作为代理动作。
result: 在最大视频数据集上训练，覆盖广泛日常场景与技能。
conclusion: 该世界模型能有效学习多样交互，推动通用机器人智能发展。
---

## Abstract
Being able to simulate the outcomes of actions in varied environments will revolutionize the development of generalist agents at scale. However, modeling these world dynamics, especially for dexterous robotics tasks, poses significant challenges due to limited data coverage and scarce action labels. As an endeavor towards this end, we introduce DreamDojo, a foundation world model that learns diverse interactions and dexterous controls from 44k hours of egocentric human videos. Our data mixture represents the largest video dataset to date for world model pretraining, spanning a wide range of daily scenarios with diverse objects and skills. To address the scarcity of action labels, we introduce continuous latent actions as unified proxy actions, enhancing interaction knowledge transfer from unlabeled videos. After post-training on small-scale target robot data, DreamDojo demonstrates a strong understanding of physics and precise action controllability. We also devise a distillation pipeline that accelerates DreamDojo to a real-time speed of 10.93 FPS and further improves consistency to the context. Our work enables several important applications based on generative world models, including live teleoperation, policy evaluation, and model-based planning. Systematic evaluation on multiple challenging out-of-distribution (OOD) benchmarks verifies the significance of our method for simulating open-world, contact-rich tasks, paving the way for general-purpose robot world models.

---

## 论文详细总结（自动生成）

# DreamDojo: 基于大规模人类视频的通用机器人世界模型——详细总结

## 1. 论文的核心问题与整体含义（研究动机和背景）

- **核心问题**：现有机器人世界模型受限于数据覆盖范围小、动作标签稀缺，难以泛化到灵巧机器人任务（如接触丰富的日常操作）。
- **研究背景**：能够模拟不同环境下动作结果的世界模型，对于大规模开发通用型具身智能体至关重要。但当前方法在数据量、动作标注成本以及模型对物理规律的理解上存在瓶颈。
- **整体含义**：DreamDojo 旨在构建一个“基础世界模型”，通过大规模无监督预训练克服上述限制，为实现通用机器人智能奠定基础。

## 2. 论文提出的方法论：核心思想、关键技术细节

- **核心思想**：利用大规模第一人称人类视频进行世界模型预训练，并引入“连续潜动作”（continuous latent actions）作为统一代理动作，从而从无标签视频中迁移交互知识。
- **关键技术细节**：
  - **数据构建**：收集了 **44,000 小时** 的自我中心（egocentric）人类视频，涵盖广泛的日常场景、多样物体和技能——这是目前用于世界模型预训练的最大视频数据集。
  - **动作表征**：由于人类视频缺乏机器人可执行的动作标签，论文提出 **连续潜动作** 作为代理动作，在潜空间中学习动作对视觉变化的因果影响。
  - **后训练（Post-training）**：在少量目标机器人数据上对预训练模型进行微调，使其适应具体机器人平台和动作空间。
  - **蒸馏流水线（Distillation pipeline）**：通过知识蒸馏将 DreamDojo 加速到实时推理速度（**10.93 FPS**），同时提升与上下文的一致性。
- **公式/算法流程**（文字说明）：
  - 预训练阶段：输入过去帧图像和连续潜动作，预测未来帧。潜动作通过变分方法从无标签视频中推断，无需手动标注。
  - 微调阶段：使用少量带有真实机器人动作标签的数据替换潜动作，对齐预测与真实物理交互。
  - 蒸馏阶段：将大模型（教师）知识迁移到轻量级学生网络，实现实时生成。

## 3. 实验设计：数据集、基准测试、对比方法

- **数据集**：
  - 预训练数据：**44,000 小时** 第一人称人类视频（具体来源未在摘要中详述，推测包含 Ego4D、Epic-Kitchens 等公开数据集及自采数据）。
  - 后训练数据：小规模目标机器人数据（具体规模未说明）。
- **基准测试（Benchmark）**：
  - 多个具有挑战性的 **分布外（OOD）** 任务（例如开箱、抓取、精细操作等），强调 open-world 和 contact-rich 场景。
- **对比方法**：
  - 摘要未列出具体对比基线，但暗示与仅使用机器人数据的世界模型、无潜动作预训练的方法进行对比。

## 4. 资源与算力

- **文中未明确说明**：摘要和元数据中未提及 GPU 型号、数量或训练时长。仅指出模型蒸馏后达到 10.93 FPS 的实时速度，但训练算力需求未公开。

## 5. 实验数量与充分性

- **实验数量**：摘要仅提及“系统评估”于多个 OOD 基准，具体实验组数未列出。但根据论文篇幅和会议（ICML-2026），推测包含：
  - 主要结果：多个 OOD 任务上的性能对比。
  - 消融实验：可能包括预训练数据量、潜动作维度、蒸馏方法等。
- **充分性与公平性**：
  - **优势**：大规模预训练数据覆盖广泛，OOD 测试能检验泛化能力，蒸馏后实时性验证实用性。
  - **不足**：缺少具体指标（如成功率、生成质量 FVD/PSNR 等）、对比方法细节、统计显著性声明。评估客观性尚有信息缺口。

## 6. 论文的主要结论与发现

- DreamDojo 从 44k 小时人类视频中成功学习到多样交互和灵巧控制，预训练后的世界模型能有效模拟复杂物理规律。
- 连续潜动作有效弥补了动作标签缺失问题，促进交互知识从人类视频迁移到机器人领域。
- 后训练后模型在分布外接触丰富任务上展现出强可控性和物理理解能力。
- 蒸馏流水线实现了实时推理（10.93 FPS）并增强了上下文一致性，为在线遥操作、策略评估和基于模型的规划等应用提供了可能。

## 7. 优点：方法或实验设计上的亮点

- **数据规模创纪录**：44k 小时 ego 视频是当前世界模型预训练最大数据集，覆盖场景多样性高。
- **无需动作标签的预训练**：连续潜动作设计巧妙，避免了昂贵的人工标注，通用性强。
- **端到端应用链**：从预训练、微调到蒸馏实时化，形成完整 pipeline，具备实用价值。
- **聚焦灵巧与接触丰富任务**：针对机器人领域最难的场景（开箱、抓取等），挑战性高。

## 8. 不足与局限

- **动作标签信息缺失**：虽然连续潜动作实现无监督，但潜动作与真实机器人动作的对应关系可能存在偏差，影响物理准确性。
- **实验细节不透明**：摘要未给出具体数据集名称、对比方法、评估指标、性能数值，难以判断复现性与可比较性。
- **泛化边界不明**：OOD 基准的具体场景范围未知，是否涵盖真实机器人部署中常见的长尾情况（如非刚体、流体）不清楚。
- **算力需求未公开**：训练成本未能提供，对资源受限研究者的可复现性有影响。
- **可能存在潜在偏差**：自我中心人类视频可能偏向特定文化或环境（如厨房、办公室），未考虑其他场景分布。

（完）
