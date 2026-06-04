#!/usr/bin/env python3
"""
Phase 2: migrate Mix It Up channel-point-reward sound actions into
StreamGuard. For each CPR with a SoundActionModel (or RandomActionModel
wrapping SoundActions), upload the file(s) into StreamGuard's uploads
volume and populate `ChannelPointReward.actionConfig`.

Outputs three artifacts under --out-dir:
  - sounds.tar       : staged sound files renamed to <uuid><ext>
  - phase2.sql       : UPDATE statements per CPR (match by title)
  - plan.json        : human-readable summary

Apply on VM:
  cat sounds.tar | ssh crisio@vm 'docker cp - streamguard-app-1:/app/uploads/<channelId>/sounds/'
  scp phase2.sql crisio@vm:/tmp/ && ssh crisio@vm 'cd ~/streamguard && \\
    docker compose exec -T postgres psql -U streamguard -d streamguard -v ON_ERROR_STOP=1 < /tmp/phase2.sql'
"""

import sqlite3, json, os, uuid, argparse, tarfile, io
from pathlib import Path

MIU_DB = r'C:\Users\Crisio\AppData\Local\MixItUp\Settings\e54ac75b-44c7-4bfe-91bc-cb6c37d0093a.db3'
CHANNEL_ID = 'a81526d0-6828-4479-9f7b-16ad63f6bb7c'


def sql_str(s):
    return "'" + str(s).replace("'", "''") + "'"


def collect_sounds(actions):
    """Walk Mix It Up actions, produce a list of 'sound groups' in execution
    order. Each group is either a single sound dict {path, volume} or a random
    pick {random: [{path, volume}, ...]}. Other action types are ignored."""
    groups = []
    for a in actions:
        if not isinstance(a, dict):
            continue
        t = a.get('$type', '').split(',')[0].split('.')[-1]
        if t == 'SoundActionModel':
            fp = a.get('FilePath', '')
            if fp:
                groups.append({'path': fp, 'volume': int(a.get('VolumeScale', 100))})
        elif t == 'RandomActionModel':
            sub = collect_sounds(a.get('Actions', []))
            paths = [g for g in sub if 'path' in g]
            if paths:
                groups.append({'random': paths})
    return groups


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out-dir', required=True)
    args = ap.parse_args()
    out = Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(MIU_DB)
    c = conn.cursor()
    c.execute("SELECT Data FROM Commands WHERE TypeID=7")

    cprs = []
    for (data,) in c.fetchall():
        d = json.loads(data)
        groups = collect_sounds(d.get('Actions', []))
        if not groups:
            continue
        cprs.append({'title': d.get('Name'), 'groups': groups})

    # Assign one UUID per unique local file
    unique_files = {}
    for cpr in cprs:
        for g in cpr['groups']:
            if 'path' in g:
                paths = [g['path']]
            else:
                paths = [s['path'] for s in g['random']]
            for p in paths:
                if p not in unique_files:
                    ext = os.path.splitext(p)[1].lower()
                    unique_files[p] = {
                        'uuid': str(uuid.uuid4()),
                        'ext': ext,
                        'url': None,
                    }
                    unique_files[p]['url'] = (
                        f"/uploads/{CHANNEL_ID}/sounds/"
                        f"{unique_files[p]['uuid']}{unique_files[p]['ext']}"
                    )

    # Stage tar with renamed files. The tar root is the sounds/ directory
    # so `docker cp - container:/app/uploads/<cid>/sounds/` extracts directly.
    tar_path = out / 'sounds.tar'
    with tarfile.open(tar_path, 'w') as tar:
        for src, info in unique_files.items():
            tar.add(src, arcname=f"{info['uuid']}{info['ext']}")
    print(f'Wrote {tar_path} ({tar_path.stat().st_size / 1024 / 1024:.2f} MB, {len(unique_files)} files)')

    # Build the SQL — one UPDATE per CPR
    sql_lines = [
        '-- Mix It Up → StreamGuard Phase 2: CPR sound action chains',
        f'-- Channel: TheCrisio ({CHANNEL_ID})',
        'BEGIN;',
        '',
    ]
    skipped_titles = []
    for cpr in cprs:
        # Build actionConfig: each group becomes one sound action.
        # For 'random' groups we join URLs with '\n' — pickRandomSound() splits
        # on \n,. Volume of the first sub-action is used.
        action_config = []
        for g in cpr['groups']:
            if 'path' in g:
                url = unique_files[g['path']]['url']
                action_config.append({
                    'type': 'sound',
                    'soundFileUrl': url,
                    'volume': g['volume'],
                })
            else:
                urls = [unique_files[s['path']]['url'] for s in g['random']]
                volume = g['random'][0]['volume'] if g['random'] else 100
                action_config.append({
                    'type': 'sound',
                    'soundFileUrl': '\n'.join(urls),
                    'volume': volume,
                })
        ac_json = json.dumps(action_config, ensure_ascii=False)
        # Match by title case-insensitive, scoped to channel
        sql_lines.append(
            f'UPDATE "ChannelPointReward" SET "actionConfig" = '
            f'{sql_str(ac_json)}::jsonb, "updatedAt" = NOW() '
            f'WHERE "channelId" = {sql_str(CHANNEL_ID)} '
            f'AND LOWER("rewardTitle") = LOWER({sql_str(cpr["title"])});'
        )
    sql_lines.append('')
    sql_lines.append('COMMIT;')
    sql_path = out / 'phase2.sql'
    sql_path.write_text('\n'.join(sql_lines), encoding='utf-8')
    print(f'Wrote {sql_path}')

    # Plan
    plan = {
        'channel_id': CHANNEL_ID,
        'cpr_count': len(cprs),
        'unique_sound_files': len(unique_files),
        'cprs': [
            {
                'title': c['title'],
                'sound_count': sum(1 if 'path' in g else len(g['random']) for g in c['groups']),
                'has_random': any('random' in g for g in c['groups']),
            }
            for c in cprs
        ],
        'files': [
            {'src': src, 'url': info['url']}
            for src, info in unique_files.items()
        ],
    }
    (out / 'plan.json').write_text(json.dumps(plan, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f"Wrote {out / 'plan.json'}")
    print()
    print(f'Phase 2 plan: {len(cprs)} CPRs to enrich, {len(unique_files)} sound files staged')


if __name__ == '__main__':
    main()
