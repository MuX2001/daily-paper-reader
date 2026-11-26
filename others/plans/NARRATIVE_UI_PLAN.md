# 工作台减法与叙事总结验收

## 已实施的界面调整

1. 保留灰底、白卡与墨绿主色。标题、三个统计胶囊同排，删掉口号和独立统计大条；主区按实际剩余高度分配列表与预览。
2. 移除侧栏/移动端重复的首页、教程、反馈横排。反馈功能收进快捷键帮助，不占常用导航；遵循用户本次明确要求覆盖旧入口位置约定。
3. 删掉右栏重复核心亮点；旧数据里与列表简介完全相同的delta不再重复显示，原始摘要始终保留。旧版总结继续生效，未把实验文案替换到日报。
4. 列表和预览原本共用states[paper_key]，未证实云端状态分叉；统一StarButton组件及SVG实心/空心状态、aria-pressed，保持原有保存/版本冲突/刷新机制。归档统一用盒子图标。
5. 预览标题上方整合来源、日期、分数；顶部加入归档/恢复、复制精读包、Markdown导出。复制沿用用户保存的单篇提示词及当前笔记，不触发模型调用。反馈区收紧。
6. 标题仅在展示时清理双连字符与中英文间距，不改变论文ID、原标题、引用数据。批次下拉限制展示长度并保留完整title提示。

## 叙事总结

- 新增minmax_narrative.py/prompt，使用card_hook、context_and_problem、core_approach、results_and_reality_check、tags五字段。正文以450–650为软目标，允许因真实资料多少而浮动；超过硬安全上限或结构错误拒绝，不截断句子、不凑字。
- 方法输入补入连续原文段落，避免把编码器限制套到解码器等错误；来源、版本校验与全文下载器不变。缓存包含实际请求、schema、模型、参数及提示词；不同风格隔离，重读缓存不付费。
- 浏览器和Markdown支持三段叙事，并保留classic回退；列表只显示hook，右栏不再复读。默认每日仍classic，显式--style narrative才启用，等待用户确认三篇内容。
- 用户已明确要求使用Flash。样本测试固定deepseek-flash并开启high思考，不因结构错误自动切到Pro。曾误启动一轮Pro，用户纠正时已结束；不采用其结果。
- DeepSeek JSON Output采用json_object；思考模式温度无效，max_tokens含思考，因此未机械照搬temperature=0.45/max_tokens=1600。实际篇幅由写作目标控制，结构由Python验证；这不保证语义永远正确。
- 参考：https://api-docs.deepseek.com/guides/thinking_mode/ 和 https://api-docs.deepseek.com/quick_start/pricing/

## 验收边界

真实生成仅针对既有三篇样本。失败输出和中间结果留在workspace/runs/daily-paper-reader，先在独立review页面展示新旧内容及原始JSON，不修改用户的每日论文、阅读状态或摘要。用户确认后才替换工作台数据和每日默认。

界面验证：636项Python测试/107子测试、33项TS单测、14组生产构建浏览器检查通过。浏览器覆盖收藏两端互相更新/刷新、预览归档/恢复、复制使用已保存提示词、下载包含摘要与草稿、三段字段映射、标题排版、移动端无横向溢出。收藏云端接口使用mock，未据此宣称真实Supabase项目重新联调。实际5174页面首卡y约159px，旧布局约370px；已保存桌面与移动端截图。

当前是dev验收，没有修改main、Pages配置或发布首页/News公告。

## 最终样本

Flash直接草稿仍有篇幅偏长/格式不完整的问题，故验收流程明确拆为原文生成草稿，再对已通过的草稿做一次Flash编辑。编辑不再抓原文、不加新数字，正文在450–650字符内；失败即停止，保留草稿/报告，不无界重试、不替换用户阅读数据。脚本check_minmax_narrative_live.py与edit_narrative_samples.py分别负责两步；每日默认尚未采用此流程。

最终三篇都来自Flash，编辑后正文长度为564/575/546字符。最终编辑工作流45348802454成功，三次调用分别41.79/28.70/34.33秒，合计25415 tokens（含思考）。此前Flash与误选Pro实验另有消耗，该数不是全部实验账单。缓存与原始结果位于workspace/runs/daily-paper-reader/narrative-edited-flash。

本地独立验收页：http://127.0.0.1:5174/summary-review/ ，包含完整新旧文案、原始JSON与下载。浏览器逐篇验证JSON未被页面改写，移动端无横向溢出。该页是独立生成产物，生产构建清空输出目录后可用scripts/render_narrative_review.py按--input/--output重新生成。

一次性引用旧Actions artifact的步骤已清理；固定Flash的通用测试工作流保存drafts与review，未保留过期run-id依赖。
