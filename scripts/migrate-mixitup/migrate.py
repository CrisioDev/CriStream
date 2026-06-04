#!/usr/bin/env python3
"""
Migrate Mix It Up data to StreamGuard. Phase 1 only.

Phase 1 = trivially mappable rows (commands with pure ChatActions, timers,
new channel-point rewards without action-config, watchMinutes per user).
Phase 2 (sound-action migration for CPRs) is a separate workflow.

Usage:
  python migrate.py --summary
  python migrate.py --sql > migration.sql
"""

import sqlite3, json, sys, argparse, re, os, uuid

MIU_DB = r'C:\Users\Crisio\AppData\Local\MixItUp\Settings\e54ac75b-44c7-4bfe-91bc-cb6c37d0093a.db3'
MIU_SETTINGS = r'C:\Users\Crisio\AppData\Local\MixItUp\Settings\e54ac75b-44c7-4bfe-91bc-cb6c37d0093a.miu3'

# TheCrisio channel in StreamGuard prod
CHANNEL_ID = 'a81526d0-6828-4479-9f7b-16ad63f6bb7c'

# Snapshot of existing prod data (captured 2026-06-04 via psql). Comparison is
# done case-insensitive on the Mix It Up side. Re-run the inventory query and
# update these if prod has drifted before applying.
EXISTING_COMMAND_TRIGGERS = {
    'discord', 'skateboard', 'pimmelchen', 'lootbox', 'leckeier', 'fotze',
    'pimml', 'werbung', 'pimmel', 'pimmelnator', 'kofi', 'pimmel?', 'goonen',
}
EXISTING_TIMER_NAMES = {'trinken', 'essen'}
EXISTING_REWARD_TITLES = {
    'namensgenerator', 'nur-emote-chat', 'test reward', 'item verwenden',
    'rollen', 'hallo zehen', 'interaktion', 'gesangsmodus', 'anvisieren bitte',
    'helm aufsetzen!', 'oder ihren arzt', 'quak', 'horror sound im raum',
    'nya', 'wenn ich du wär.', 'f für springen', 'was für saft?',
    'in kaltes wasser tunken', 'auf tabsi!', 'fail', 'dejavu',
    'ich will doch nur einmal in meinem leben...', 'was geht aab?',
    'hello its...', 'weg mit der brille', 'quellkartoffeln',
    'fragen sie ihren atepoker', 'mneeee!', 'yeaa boi', 'dumb ways to die',
    'aaaaaaaahhh', 'kein fluchen', 'catwoman', 'country toads',
    'irl-wortverbot', 'raid-anführer', 'stuhlverbot', 'rückwärts, rückwärts',
    '(cursed) chloe voice', 'typische neyt begrüßung', 'crazy secret test',
    'emotional damage', 'schön in die futterlucke', 'feuerball',
    'can you feel it', 'lügen darf man nicht sagen!', 'dumm',
    'was ist denn hier los?', 'haltung annehmen!', 'dirt man',
    'emotional damage rindy', 'lets go', 'crisio-roulette',
}

# Mix It Up variable → StreamGuard variable. Order matters: more specific first.
VAR_MAP = [
    (re.compile(r'\$arg(\d+)text\b', re.IGNORECASE), lambda m: f'$({m.group(1)})'),
    (re.compile(r'\$arg(\d+)\b', re.IGNORECASE), lambda m: f'$({m.group(1)})'),
    (re.compile(r'\$randomnumber\((\d+),(\d+)\)', re.IGNORECASE), lambda m: f'$(random.{m.group(2)})'),
    (re.compile(r'\$username\b', re.IGNORECASE), lambda m: '$(user)'),
    (re.compile(r'\$targetusername\b', re.IGNORECASE), lambda m: '$(touser)'),
    (re.compile(r'\$argtotal\b', re.IGNORECASE), lambda m: '$(query)'),
    (re.compile(r'\$alluserarg1text\b', re.IGNORECASE), lambda m: '$(query)'),
    (re.compile(r'\$gamename\b', re.IGNORECASE), lambda m: '$(game)'),
    (re.compile(r'\$streamtitle\b', re.IGNORECASE), lambda m: '$(title)'),
    (re.compile(r'\$viewercount\b', re.IGNORECASE), lambda m: '$(viewers)'),
    (re.compile(r'\$followcount\b', re.IGNORECASE), lambda m: '$(followers)'),
    (re.compile(r'\$datetime\b', re.IGNORECASE), lambda m: '$(date) $(time)'),
    (re.compile(r'\$user\b', re.IGNORECASE), lambda m: '$(user)'),
]


def translate(text):
    if not text:
        return text
    for pat, repl in VAR_MAP:
        text = pat.sub(repl, text)
    return text


def sql_str(s):
    if s is None:
        return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"


def sql_arr(items):
    return 'ARRAY[' + ','.join(sql_str(i) for i in items) + ']::text[]'


def extract_chat_only(actions):
    """Return (concatenated_chat, ok) where ok=True iff every action is a
    ChatActionModel with non-empty text. Multiple chat actions are joined with
    ' | ' as a visible separator so the streamer can clean them up later."""
    chat_texts = []
    for a in actions:
        if not isinstance(a, dict):
            return '', False
        t = a.get('$type', '').split(',')[0].split('.')[-1]
        if t != 'ChatActionModel':
            return '', False
        ct = a.get('ChatText', '')
        if ct:
            chat_texts.append(ct)
    if not chat_texts:
        return '', False
    return ' | '.join(chat_texts), True


def plan_commands(c):
    inserts, skip_existing, skip_unmappable = [], [], []
    c.execute("SELECT Data FROM Commands WHERE TypeID=1")
    for (data,) in c.fetchall():
        d = json.loads(data)
        triggers = d.get('Triggers') or []
        if not triggers:
            continue
        primary = triggers[0].lower()
        if primary in EXISTING_COMMAND_TRIGGERS:
            skip_existing.append({'trigger': primary})
            continue
        text, ok = extract_chat_only(d.get('Actions', []))
        if not ok:
            action_types = [a.get('$type', '').split(',')[0].split('.')[-1] for a in d.get('Actions', []) if isinstance(a, dict)]
            skip_unmappable.append({'trigger': primary, 'actions': action_types})
            continue
        aliases = [t.lower() for t in triggers[1:]]
        dropped_aliases = [a for a in aliases if a in EXISTING_COMMAND_TRIGGERS]
        aliases = [a for a in aliases if a not in EXISTING_COMMAND_TRIGGERS]
        entry = {
            'trigger': primary,
            'aliases': aliases,
            'response': translate(text),
            'enabled': bool(d.get('IsEnabled')),
        }
        if dropped_aliases:
            entry['dropped_aliases_conflict'] = dropped_aliases
        inserts.append(entry)
    return {'insert': inserts, 'skip_existing': skip_existing, 'skip_unmappable': skip_unmappable}


def plan_timers(c, settings):
    interval = int(settings.get('TimerCommandsInterval', 15))
    min_msgs = int(settings.get('TimerCommandsMinimumMessages', 5))
    inserts, skip_existing, skip_unmappable = [], [], []
    c.execute("SELECT Data FROM Commands WHERE TypeID=3")
    for (data,) in c.fetchall():
        d = json.loads(data)
        name = d.get('Name') or ''
        if name.lower() in EXISTING_TIMER_NAMES:
            skip_existing.append({'name': name})
            continue
        text, ok = extract_chat_only(d.get('Actions', []))
        if not ok:
            skip_unmappable.append({'name': name})
            continue
        inserts.append({
            'name': name,
            'message': translate(text),
            'enabled': bool(d.get('IsEnabled')),
            'intervalMinutes': interval,
            'minChatLines': min_msgs,
        })
    return {'insert': inserts, 'skip_existing': skip_existing, 'skip_unmappable': skip_unmappable}


def plan_rewards(c):
    """Insert only CPRs whose title is not already in StreamGuard. Phase 1
    creates the row with an empty actionConfig — Phase 2 will populate the
    sound action chain."""
    inserts, skip_existing = [], []
    c.execute("SELECT Data FROM Commands WHERE TypeID=7")
    for (data,) in c.fetchall():
        d = json.loads(data)
        title = d.get('Name') or ''
        if title.lower() in EXISTING_REWARD_TITLES:
            skip_existing.append({'title': title})
            continue
        inserts.append({
            'title': title,
            'rewardId': d.get('ChannelPointRewardID') or '',
            'enabled': bool(d.get('IsEnabled')),
        })
    return {'insert': inserts, 'skip_existing': skip_existing}


def plan_watchminutes(c):
    """Upsert ChannelUser rows with watchMinutes from Mix It Up. For existing
    rows in StreamGuard we ADD the imported minutes; for new rows we create.

    Mix It Up keeps separate rows when a user's Twitch login changes — same
    TwitchID, different TwitchUsername. We aggregate to one row per TwitchID
    (sum minutes, prefer the longer/more-recent username)."""
    agg = {}
    c.execute("SELECT TwitchID, TwitchUsername, Data FROM Users WHERE TwitchID IS NOT NULL")
    for tid, tname, data in c.fetchall():
        d = json.loads(data)
        mins = int(d.get('OnlineViewingMinutes') or 0)
        if mins <= 0:
            continue
        key = str(tid)
        existing = agg.get(key)
        if existing:
            existing['addWatchMinutes'] += mins
            # Keep the name with the higher watchMinutes — proxy for "most recent"
            if mins > existing['_dominant_mins']:
                existing['displayName'] = tname or key
                existing['_dominant_mins'] = mins
        else:
            agg[key] = {
                'twitchUserId': key,
                'displayName': tname or key,
                'addWatchMinutes': mins,
                '_dominant_mins': mins,
            }
    rows = []
    for v in agg.values():
        v.pop('_dominant_mins', None)
        rows.append(v)
    return {'insert_or_add': rows}


def emit_sql(plans):
    out = []
    out.append('-- Mix It Up → StreamGuard Phase 1 migration')
    out.append(f'-- Channel: TheCrisio ({CHANNEL_ID})')
    out.append('BEGIN;')
    out.append('')

    # Commands
    out.append('-- Commands ({})'.format(len(plans['commands']['insert'])))
    for cmd in plans['commands']['insert']:
        out.append(
            f"INSERT INTO \"Command\" (id, trigger, response, \"cooldownSeconds\", "
            f"\"perUserCooldown\", \"userLevel\", enabled, \"useCount\", aliases, "
            f"chain, \"channelId\", \"createdAt\", \"updatedAt\") VALUES ("
            f"gen_random_uuid(), {sql_str(cmd['trigger'])}, {sql_str(cmd['response'])}, "
            f"5, false, 'everyone', {str(cmd['enabled']).lower()}, 0, "
            f"{sql_arr(cmd['aliases'])}, ARRAY[]::text[], "
            f"{sql_str(CHANNEL_ID)}, NOW(), NOW());"
        )
    out.append('')

    # Timers
    out.append('-- Timers ({})'.format(len(plans['timers']['insert'])))
    for t in plans['timers']['insert']:
        out.append(
            f"INSERT INTO \"Timer\" (id, name, message, \"intervalMinutes\", "
            f"\"minChatLines\", enabled, \"twitchEnabled\", \"discordEnabled\", "
            f"\"channelId\", \"createdAt\", \"updatedAt\") VALUES ("
            f"gen_random_uuid(), {sql_str(t['name'])}, {sql_str(t['message'])}, "
            f"{t['intervalMinutes']}, {t['minChatLines']}, "
            f"{str(t['enabled']).lower()}, true, true, "
            f"{sql_str(CHANNEL_ID)}, NOW(), NOW());"
        )
    out.append('')

    # Channel Point Rewards
    out.append('-- Channel Point Rewards ({})'.format(len(plans['rewards']['insert'])))
    for r in plans['rewards']['insert']:
        out.append(
            f"INSERT INTO \"ChannelPointReward\" (id, \"rewardId\", \"rewardTitle\", "
            f"enabled, \"actionConfig\", cost, prompt, \"isUserInputRequired\", "
            f"\"backgroundColor\", \"channelId\", \"createdAt\", \"updatedAt\") VALUES ("
            f"gen_random_uuid(), {sql_str(r['rewardId'])}, {sql_str(r['title'])}, "
            f"{str(r['enabled']).lower()}, '[]'::jsonb, 100, '', false, "
            f"'#9147FF', {sql_str(CHANNEL_ID)}, NOW(), NOW());"
        )
    out.append('')

    # ChannelUser watchMinutes — bulk upsert
    rows = plans['watchminutes']['insert_or_add']
    out.append(f'-- ChannelUser watchMinutes ({len(rows)} rows)')
    BATCH = 500
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i+BATCH]
        values = []
        for r in chunk:
            values.append(
                f"(gen_random_uuid(), {sql_str(r['twitchUserId'])}, {sql_str(r['displayName'])}, "
                f"0, 0, {r['addWatchMinutes']}, NOW(), {sql_str(CHANNEL_ID)})"
            )
        out.append(
            'INSERT INTO "ChannelUser" '
            '(id, "twitchUserId", "displayName", points, "pointsExp", "watchMinutes", "lastSeen", "channelId") '
            'VALUES\n  ' + ',\n  '.join(values) + '\n'
            'ON CONFLICT ("channelId", "twitchUserId") DO UPDATE SET '
            '"watchMinutes" = "ChannelUser"."watchMinutes" + EXCLUDED."watchMinutes";'
        )
        out.append('')

    out.append('COMMIT;')
    return '\n'.join(out)


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--summary', action='store_true', help='Print plan summary as JSON')
    g.add_argument('--sql', action='store_true', help='Print SQL to stdout')
    args = ap.parse_args()

    conn = sqlite3.connect(MIU_DB)
    c = conn.cursor()
    with open(MIU_SETTINGS, encoding='utf-8') as f:
        settings = json.load(f)

    plans = {
        'commands': plan_commands(c),
        'timers': plan_timers(c, settings),
        'rewards': plan_rewards(c),
        'watchminutes': plan_watchminutes(c),
    }

    if args.summary:
        summary = {
            'commands': {
                'insert': len(plans['commands']['insert']),
                'skip_existing': len(plans['commands']['skip_existing']),
                'skip_unmappable': len(plans['commands']['skip_unmappable']),
                'details': plans['commands'],
            },
            'timers': {
                'insert': len(plans['timers']['insert']),
                'skip_existing': len(plans['timers']['skip_existing']),
                'skip_unmappable': len(plans['timers']['skip_unmappable']),
                'details': plans['timers'],
            },
            'rewards': {
                'insert': len(plans['rewards']['insert']),
                'skip_existing': len(plans['rewards']['skip_existing']),
                'details': plans['rewards'],
            },
            'watchminutes': {
                'rows': len(plans['watchminutes']['insert_or_add']),
            },
        }
        print(json.dumps(summary, indent=2, ensure_ascii=False))
    elif args.sql:
        print(emit_sql(plans))


if __name__ == '__main__':
    main()
