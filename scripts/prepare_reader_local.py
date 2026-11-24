"""Expose only loopback Supabase public configuration in a local reader build."""
import argparse
import base64
import json
from pathlib import Path
from urllib.parse import urlsplit


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--connection',type=Path,required=True,help='Private local Supabase status JSON')
    parser.add_argument('--build',type=Path,required=True,help='Existing build outside the source checkout')
    args=parser.parse_args()
    root=Path(__file__).resolve().parents[1];build=args.build.resolve()
    if build==root or root in build.parents or not (build/'index.html').is_file():
        raise ValueError('Use an existing external local build directory')
    data=json.loads(args.connection.read_text());url=data['API_URL'];key=data['ANON_KEY']
    parsed=urlsplit(url)
    if parsed.hostname not in ('127.0.0.1','localhost','::1') or parsed.scheme not in ('http','https') or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in ('','/'):
        raise ValueError('Local connection must use a loopback origin')
    if not key.startswith('sb_publishable_'):
        payload=key.split('.')[1]
        if json.loads(base64.urlsafe_b64decode(payload+'='*(-len(payload)%4)))['role']!='anon':
            raise ValueError('Only public anon/publishable keys may be exported')
    (build/'local-reader-config.json').write_text(json.dumps({'url':url,'key':key})+'\n')
    print('Prepared local public connection; no service key exported')


if __name__=='__main__':main()
