"""Validate deep-read configuration without dependencies or model calls."""
import json
import os
from pathlib import Path
from urllib.parse import urlsplit

CHOICES=('configured','deepseek-flash','deepseek-v4-pro')

def resolve_config(env):
    choice=env.get('DEEP_READ_MODEL_CHOICE','configured') or 'configured'
    if choice not in CHOICES:
        raise ValueError('不支持的精读模型选项')
    dedicated_key=env.get('DEEP_READ_API_KEY','').strip()
    legacy_key=env.get('DEEPSEEK_API_KEY','').strip()
    legacy_endpoint=env.get('DEEPSEEK_BASE_URL','').strip() or 'https://api.deepseek.com'
    endpoint=env.get('DEEP_READ_BASE_URL','').strip() or legacy_endpoint
    model=env.get('DEEP_READ_MODEL','').strip() or env.get('DEEPSEEK_MODEL','').strip()
    key=dedicated_key or legacy_key
    if not key:
        raise ValueError('GitHub Actions 没有可用模型密钥。请打开仓库 Settings → Secrets and variables → Actions → New repository secret，Name 填 DEEPSEEK_API_KEY，Secret 填 DeepSeek 密钥，然后点 Add secret。已有 DEEP_READ_API_KEY 也可以使用；网页聊天密钥不会自动传到 Actions。')
    if not dedicated_key and endpoint.rstrip('/').removesuffix('/v1')!=legacy_endpoint.rstrip('/').removesuffix('/v1'):
        raise ValueError('精读端点与原 DeepSeek 端点不同，不能向新服务转发旧密钥。请配置对应服务的 DEEP_READ_API_KEY。')
    if choice!='configured':
        if urlsplit(endpoint).hostname!='api.deepseek.com':
            raise ValueError('Flash/Pro 预设仅用于 DeepSeek 官方端点；当前云端端点属于其他服务，请选择“云端已配置模型”。')
        model=choice
    elif not model and urlsplit(endpoint).hostname=='api.deepseek.com':
        model='deepseek-flash'
    if not model:
        raise ValueError('自定义服务缺少 DEEP_READ_MODEL，请在仓库 Secrets/Variables 设置完整模型 ID。')
    parsed=urlsplit(endpoint)
    if parsed.scheme!='https' or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError('精读模型端点必须是无凭据和查询参数的 HTTPS 地址')
    return key,model,endpoint

def generation_options(model, endpoint):
    options = {'max_tokens': 16000, 'temperature': 0.2}
    if urlsplit(endpoint).hostname == 'api.deepseek.com':
        if model == 'deepseek-flash':
            options['thinking'] = {'type': 'disabled'}
        elif model == 'deepseek-v4-pro':
            options.update(max_tokens=64000, thinking={'type': 'enabled'})
    return options


def preflight(env):
    try:
        _,model,endpoint=resolve_config(env)
        print('精读模型配置检查通过：'+model)
        return model,endpoint
    except ValueError as exc:
        message=str(exc)
        root=Path(env['RUNNER_TEMP'])/'deep-read-output'
        root.mkdir(parents=True,exist_ok=True)
        (root/'status.json').write_text(json.dumps({'status':'failed','stage':'configuration','request_id':env.get('REQUEST_ID'),'paper_id':env.get('PAPER_ID'),'error':message},ensure_ascii=False),encoding='utf-8')
        if env.get('GITHUB_STEP_SUMMARY'):
            with open(env['GITHUB_STEP_SUMMARY'],'a',encoding='utf-8') as handle:
                handle.write('## 精读尚未调用模型\n\n'+message+'\n')
        raise

if __name__=='__main__':
    preflight(os.environ)
