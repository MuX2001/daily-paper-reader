import {t} from './i18n/messages';
import {repositoryLinks} from './repository';

const steps = [
 ['快速扫读','从收件箱选一篇，先读一句话总览，再用约 30 秒扫过背景、做法、实验和局限。'],
 ['分流','值得细读就按 s 加入待精读，其余按 x 归档，直到扫完这一批。'],
 ['深挖与入库','按 c 边读边提问，也可以复制精读包交给外部模型。要留底时导出 Markdown，或按导出偏好发送到 Obsidian。'],
];
const shortcuts = [
 ['j / k','下一篇 / 上一篇'],['s','加入或移出待精读'],['x','归档或恢复'],['o','打开原文 PDF'],
 ['c','打开或收起 AI 问答'],['/','聚焦搜索框'],['Esc','关闭问答栏或当前弹窗'],
];
const notes = [
 ['云端同步','在工作台设置中登录同一账户，待精读、归档状态和已保存的个人笔记会跨设备同步。'],
 ['问答与精读包','AI 问答从浏览器连接你配置的模型 API。复制精读包无需 API Key；把提示词、论文上下文和对应版本的 PDF 一起交给外部模型即可。'],
 ['界面语言与摘要语言','中 / EN 切换界面和默认提示词。每日论文总结按 SUMMARY_LANG 生成并缓存；切换界面语言时，已有总结保留生成时的语言。'],
 ['历史阅读库','从侧栏的历史阅读库可打开旧版 Docsify 日报。'],
];
export function Guide({openSettings}:{openSettings:()=>void}){
 const repo=repositoryLinks();
 return <section className="guide-canvas" aria-label={t('使用指南')}>
   <section><h2>{t('3 分钟每日分诊')}</h2><ol>{steps.map(([name,body])=><li key={name}><strong>{t(name)}</strong><p>{t(body)}</p></li>)}</ol></section>
   <section><h2>{t('键盘快捷键速查')}</h2><dl className="guide-keys">{shortcuts.map(([keys,label])=><div key={keys}><dt>{keys.split(' / ').map(k=><kbd key={k}>{k}</kbd>)}</dt><dd>{t(label)}</dd></div>)}</dl></section>
   <section><h2>{t('配置与常见问题')}</h2><dl>{notes.map(([name,body])=><div key={name}><dt>{t(name)}</dt><dd>{t(body)}</dd></div>)}</dl></section>
   <section className="guide-actions"><button onClick={openSettings}>{t('打开工作台设置')}</button><a href={repo.issues} target="_blank" rel="noopener noreferrer">{t('提交问题与建议')} ↗</a><a href={repo.url} target="_blank" rel="noopener noreferrer">{t('访问 GitHub 仓库')} ↗</a></section>
 </section>;
}
