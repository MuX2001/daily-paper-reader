# 日报 · 2026-10-04

- 最近生成时间：2026-10-04 22:52:17 UTC
- 今日累计更新：1 次
- 今日累计推荐总数：25
- 精读区：12
- 速读区：13

## 今日简报（AI）
今日扫读 25 篇机器人学习论文，精读 12 篇、速读 13 篇，Vision-Language-Action（VLA）模型是绝对主线。

最值得看的是两篇 9.0 分工作：RecastVLA 用自适应策略状态把"过去交互"接入"未来控制"，SLIP-VLA 则把扩散式多步推理压成单步隐空间想象，两者都在解决 VLA 的实时性与时序建模瓶颈；速读中的联邦子空间策略蒸馏、触觉交互的物体中心表征、流匹配因果动作分词也值得顺带一读。

普通读者建议先挑 RecastVLA 或 SLIP-VLA 其中一篇读摘要与方法图，重点看它们如何把"多步/多模态"变"单步/轻量"，这大概率是下一阶段具身智能落地的关键取舍。

## 精读区
1. [RecastVLA: From Past Interaction to Future Control with Adaptive Policy States](/202610/04/2609.32155v1-recastvla-from-past-interaction-to-future-control-with-adaptive-policy-states) （9.0/10）
2. [SLIP-VLA: Single-Step Latent Imagination for Policy Learning in Vision-Language-Action Models](/202610/04/2609.33575v1-slip-vla-single-step-latent-imagination-for-policy-learning-in-vision-language-action-models) （9.0/10）
3. [Alignment-Guided Flow Transformer for Efficient Vision-Language-Action Policy Learning](/202610/04/2609.34467v1-alignment-guided-flow-transformer-for-efficient-vision-language-action-policy-learning) （9.0/10）
4. [Scouting the Dynamics Gap: Test-Time Policy Adaptation via Action-Outcome Feedback](/202610/04/2609.36107v1-scouting-the-dynamics-gap-test-time-policy-adaptation-via-action-outcome-feedback) （9.0/10）
5. [Trajectory-Level Mode Guidance for Controllable Diffusion-Based Multi-Robot Motion Planning](/202610/04/2609.36530v1-trajectory-level-mode-guidance-for-controllable-diffusion-based-multi-robot-motion-planning) （9.0/10）
6. [AeroManip-VLA: Scalable Vision-Language-Action Learning for Aerial Manipulation with RL-Generated Demonstrations](/202610/04/2609.36915v1-aeromanip-vla-scalable-vision-language-action-learning-for-aerial-manipulation-with-rl-generated-demonstrations) （9.0/10）
7. [Urgent Actions Go First: Urgency-Aware Denoising for Real-Time VLA Control](/202610/04/2609.37772v1-urgent-actions-go-first-urgency-aware-denoising-for-real-time-vla-control) （9.0/10）
8. [WorldLine: Action-Driven Visual Simulation for Robotic Manipulation](/202610/04/2609.38059v1-worldline-action-driven-visual-simulation-for-robotic-manipulation) （9.0/10）
9. [Rho: A Foundation for Efficiently Adaptable VLA Models](/202610/04/2609.38164v1-rho-a-foundation-for-efficiently-adaptable-vla-models) （9.0/10）
10. [Magic-W0: A Structured World-Action Foundation Model for Physical Intelligence](/202610/04/2609.39870v1-magic-w0-a-structured-world-action-foundation-model-for-physical-intelligence) （9.0/10）
11. [CF-JEPA: Improving Robustness of JEPA World Models via Controllability Factorization](/202610/04/2610.00727v1-cf-jepa-improving-robustness-of-jepa-world-models-via-controllability-factorization) （9.0/10）
12. [eRLT: Efficient VLA Reinforcement Learning via Action-Relevant Token Routing](/202610/04/2610.00913v1-erlt-efficient-vla-reinforcement-learning-via-action-relevant-token-routing) （9.0/10）

## 速读区
1. [Federated Subspace Guided Vision-Language-Action Policy Distillation for Non-IID Multi-Robot Manipulation](/202610/04/2609.32239v1-federated-subspace-guided-vision-language-action-policy-distillation-for-non-iid-multi-robot-manipulation) （8.0/10）
2. [Learning with Object-centric Representations of Tactile Interactive Perception for Robot Manipulation](/202610/04/2609.33235v1-learning-with-object-centric-representations-of-tactile-interactive-perception-for-robot-manipulation) （8.0/10）
3. [Rethinking Causal Action Tokenization with Conditional Annealing in Flow Matching](/202610/04/2609.35469v1-rethinking-causal-action-tokenization-with-conditional-annealing-in-flow-matching) （8.0/10）
4. [Staircase Policy: Streaming Inference for World-Action Models with Large Action Chunks](/202610/04/2609.36471v1-staircase-policy-streaming-inference-for-world-action-models-with-large-action-chunks) （8.0/10）
5. [PreferenceFlow: Test-Time Guidance of Flow-Matching Robot Policies from Human Interventions](/202610/04/2609.36872v1-preferenceflow-test-time-guidance-of-flow-matching-robot-policies-from-human-interventions) （8.0/10）
6. [Optimal Actuator Design across Ranks and Control Horizons](/202610/04/2609.37081v1-optimal-actuator-design-across-ranks-and-control-horizons) （8.0/10）
7. [RoboHarn-Evo: Evolving Hierarchical Physical Knowledge for Self-Improving Robotic Manipulation](/202610/04/2609.37583v2-roboharn-evo-evolving-hierarchical-physical-knowledge-for-self-improving-robotic-manipulation) （8.0/10）
8. [CogWAM: Aligning Semantic Cognition with World Action Modeling via Event-Driven Interfaces](/202610/04/2609.37721v1-cogwam-aligning-semantic-cognition-with-world-action-modeling-via-event-driven-interfaces) （8.0/10）
9. [MVG-WAM: Multiple View Geometry-Aware World-Action Modeling for Robotic Manipulation](/202610/04/2609.37793v1-mvg-wam-multiple-view-geometry-aware-world-action-modeling-for-robotic-manipulation) （8.0/10）
10. [Control and Estimation Co-Design via Envelope-Theorem Gradients](/202610/04/2609.36090v1-control-and-estimation-co-design-via-envelope-theorem-gradients) （7.0/10）
11. [Simple Agentic Memory for Generalist Robot Policies](/202610/04/2609.36595v1-simple-agentic-memory-for-generalist-robot-policies) （7.0/10）
12. [Forward-Invariant Policy Classes for Safe Reinforcement Learning in Multicopter Control](/202610/04/2609.38655v1-forward-invariant-policy-classes-for-safe-reinforcement-learning-in-multicopter-control) （7.0/10）
13. [Robot Learning on Discrete Surfaces: Theory and Applications](/202610/04/2610.01910v1-robot-learning-on-discrete-surfaces-theory-and-applications) （7.0/10）

---
使用键盘方向键可在日报/论文之间快速切换。
