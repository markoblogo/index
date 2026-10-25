"""Local-only fixed-design renderer. Preflight never synthesizes or renders."""
import argparse
import hashlib
import html
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
from datetime import date


def digest(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def run(args, **kwargs):
    return subprocess.run([str(x) for x in args], check=True, capture_output=True, **kwargs)


def probe(config, path):
    return json.loads(run([config['ffprobe'], '-v', 'error', '-show_streams', '-show_format', '-of', 'json', path]).stdout)


def preflight(config):
    root = Path(config['workRoot']).resolve()
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    if shutil.disk_usage(root).free < 4 * 1024**3:
        raise ValueError('video_scratch_needs_4_gib')
    handoff = Path(config['handoffRoot']).resolve()
    if root == handoff or root.is_relative_to(handoff):
        raise ValueError('work_root_cannot_overwrite_template')
    manifest = json.loads((handoff / 'manifest.json').read_text())
    for item in manifest['files']:
        p = (handoff / item['path']).resolve()
        if not p.is_relative_to(handoff) or not p.is_file() or p.stat().st_size != item['bytes'] or digest(p) != item['sha256']:
            raise ValueError('handoff_integrity_failed')
    model = Path(config['modelRoot']).resolve()
    model_manifest = json.loads(Path(config['modelManifest']).read_text())
    if model_manifest['revision'] != '3cadd1ee6394adea1bd021217a0e650ede09a323':
        raise ValueError('voice_model_revision_changed')
    for item in model_manifest['files']:
        p = (model / item['file']).resolve()
        if not p.is_relative_to(model) or not p.is_file() or digest(p) != item['sha256']:
            raise ValueError('voice_model_integrity_failed')
    for key in ['node', 'hyperframesCli', 'chrome', 'ffmpeg', 'ffprobe']:
        if not Path(config[key]).is_file():
            raise ValueError('runtime_missing_' + key)
    package = json.loads((Path(config['hyperframesCli']).parent.parent / 'package.json').read_text())
    if package['version'] != '0.8.185':
        raise ValueError('renderer_revision_changed')
    run([config['ffmpeg'], '-version'])
    run([config['ffprobe'], '-version'])
    return {'status': 'preflight_passed', 'templateSha256': digest(handoff / 'manifest.json'),
            'voiceRevision': model_manifest['revision'] + '/M1/en/12/1.03',
            'modelLicense': 'BigScience Open RAIL-M', 'rendererLicense': package.get('license'),
            'rendered': False, 'speechGenerated': False}


def period_text(period):
    a, b = date.fromisoformat(period['start']), date.fromisoformat(period['end'])
    return b.strftime('%d %b %Y') if a == b else a.strftime('%d %b') + ' - ' + b.strftime('%d %b %Y')


def number(value):
    return f'{value:,.3f}'.rstrip('0').rstrip('.')


def scene_html(scene, part, index, count, report_end):
    esc = lambda value: html.escape(str(value), quote=True)
    hero = scene['hero']
    if len(scene['rows']) > 2:
        raise ValueError('split_scene_with_more_than_two_rows')
    heading = scene['headlineEn']
    if len(heading) > 42:
        raise ValueError('headline_exceeds_fixed_design')
    words = heading.upper().split()
    split = min(range(1, len(words)), key=lambda n: abs(len(' '.join(words[:n])) - len(' '.join(words[n:])))) if len(words) > 1 else 1
    heading = esc(' '.join(words[:split])) + '<br>' + esc(' '.join(words[split:]))
    rows = scene['rows']
    chart = ''
    if rows:
        chart = '<div class="chart"><div class="chartlabel">COMPARABLE LEVELS</div>'
        values = [row['value'] for row in rows]
        lo, hi = min([0] + values), max([0] + values)
        span = hi - lo or 1
        for row in rows:
            label = row['english']['headline']
            if len(label) > 22:
                raise ValueError('row_label_exceeds_fixed_design')
            if scene['kind'] == 'bars':
                left = (min(0, row['value']) - lo) / span * 100
                width = abs(row['value']) / span * 100
                chart += f'<div class="barline"><span>{esc(label)}</span><div class="bartrack" style="position:relative"><div class="bar {"orange" if row["value"] < 0 else ""}" style="position:absolute;left:{left:.6f}%;width:{width:.6f}%"></div></div><span class="barvalue">{esc(number(row["value"]))}</span></div>'
            else:
                chart += f'<div class="barline"><span>{esc(label)}</span><span>{esc(row["unit"])}</span><span class="barvalue">{esc(number(row["value"]))}</span></div>'
        chart += '</div>'
    return '<div class="paper"></div><div class="rail" data-layout-ignore></div>' + \
        '<div class="header"><img class="logo" src="assets/brand/logo.png" alt="SPIKE BROKERS"><div class="date">' + date.fromisoformat(report_end).strftime('%d %b<br>%Y').upper() + '</div></div>' + \
        f'<div class="rule"></div><div class="kicker">{esc(part.upper())} / UKRAINE</div><h1>{heading}</h1><div class="page" data-layout-ignore>S P I K E</div>' + \
        f'<div class="metric"><div class="number">{esc(number(hero["value"]))}</div><div class="unit">{esc(hero["unit"])} · {esc(hero["basis"])}</div></div>' + \
        f'<div class="period">{esc(period_text(hero["period"]))}</div>{chart}<div class="takeaway">{esc(scene["takeawayEn"])}</div>' + \
        f'<div class="foot"><span>SPIKE Brokers · Weekly draft</span><span>{index + 1} / {count}</span></div>'


def composition_html(sid, css, duration, body):
    return f'<template><style>{css}</style><div id="root" data-composition-id="{sid}" data-width="1080" data-height="1920"><div id="{sid}-clip" class="clip" data-start="0" data-duration="{duration}" data-track-index="0"><div id="content">{body}</div></div></div><script>const tl=gsap.timeline({{paused:true}});tl.from(".rule",{{scaleX:0,duration:.28}},0);tl.from("h1,.metric,.period,.takeaway",{{y:14,opacity:0,duration:.28,stagger:.03}},.1);tl.from(".bar",{{scaleX:0,duration:.8}},.4);tl.to({{}},{{duration:{duration}}},0);window.__timelines["{sid}"]=tl;</script></template>'


def render(config, job):
    if os.environ.get('SSI_VIDEO_ENABLE_RENDER') != '1':
        raise ValueError('render_requires_authorized_worker')
    checked = preflight(config)
    packet = job['packet']
    if packet['templateSha256'] != checked['templateSha256']:
        raise ValueError('server_template_revision_mismatch')
    work = Path(config['workRoot']) / packet['packetSha256']
    work.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.environ.update(HF_HUB_OFFLINE='1', HF_HOME=str(work / 'hf'), XDG_CACHE_HOME=str(work / 'cache'),
                      SUPERTONIC_CACHE_DIR=str(work / 'voice-cache'))
    import numpy as np
    import soundfile as sf
    import onnxruntime as ort
    ort.disable_telemetry_events()
    from supertonic import TTS
    tts = TTS(model='supertonic-3', model_dir=Path(config['modelRoot']), auto_download=False, intra_op_num_threads=4, inter_op_num_threads=1)
    style = tts.get_voice_style('M1')
    artifacts = []
    for part in packet['parts']:
        root = work / part['id']
        (root / 'compositions').mkdir(parents=True, exist_ok=True)
        baseline = Path(config['handoffRoot']) / 'approved-template' / 'renderer-baselines' / part['id']
        for source in (baseline / 'assets').rglob('*'):
            if source.is_file() and source.suffix.lower() not in ['.wav', '.mp3', '.m4a', '.mp4']:
                dest = root / 'assets' / source.relative_to(baseline / 'assets')
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, dest)
        content = json.loads((baseline / 'CONTENT.json').read_text())
        source_html = (baseline / 'compositions' / (content['scenes'][0]['id'] + '.html')).read_text()
        css = re.search(r'<style>(.*?)</style>', source_html, re.S).group(1)
        clips, voices, cues = [], [], []
        cursor = 0.0
        for i, scene in enumerate(part['scenes']):
            if not re.fullmatch(r'[a-z][a-z0-9-]*', scene['id']):
                raise ValueError('unsafe_scene_id')
            wav = root / ('voice-' + scene['id'] + '.wav')
            seed = int(hashlib.sha256((packet['packetSha256'] + scene['narrationEn']).encode()).hexdigest()[:8], 16)
            np.random.seed(seed)
            audio, _ = tts.synthesize(text=scene['narrationEn'], voice_style=style, lang='en', total_steps=12, speed=1.03, max_chunk_length=250, silence_duration=.12, verbose=False)
            tts.save_audio(audio, str(wav))
            samples, sr = sf.read(wav)
            seconds = len(samples) / sr
            if seconds <= 0:
                raise ValueError('empty_voice')
            run([config['ffmpeg'], '-v', 'error', '-i', wav, '-f', 'null', '-'])
            duration = math.ceil(max(7.6, .3 + seconds + 2, 1.2 + 2) * 30) / 30
            cues.append({'id': scene['id'], 'start': cursor, 'duration': duration, 'voiceStart': cursor + .3, 'voiceEnd': cursor + .3 + seconds, 'settledAt': cursor + 1.2, 'narration': scene['narrationEn'], 'audioSha256': digest(wav)})
            voices.append((wav, cursor + .3))
            sid = scene['id']
            body = scene_html(scene, part['id'], i, len(part['scenes']), packet['period']['end'])
            markup = composition_html(sid, css, duration, body)
            (root / 'compositions' / (sid + '.html')).write_text(markup)
            clips.append(f'<div id="{sid}" class="clip" data-composition-id="{sid}" data-composition-src="compositions/{sid}.html" data-start="{cursor}" data-duration="{duration}" data-track-index="{i}" data-width="1080" data-height="1920"></div>')
            cursor += duration
        master = root / 'voice-master.wav'
        command = [config['ffmpeg'], '-v', 'error', '-y']
        for wav, _ in voices:
            command += ['-i', wav]
        filters = [f'[{i}:a]adelay={round(offset * 1000)}:all=1[a{i}]' for i, (_, offset) in enumerate(voices)]
        filters.append(''.join(f'[a{i}]' for i in range(len(voices))) + f'amix=inputs={len(voices)}:normalize=0,apad,atrim=duration={cursor}[mix]')
        command += ['-filter_complex', ';'.join(filters), '-map', '[mix]', '-ar', '48000', '-ac', '1', master]
        run(command)
        (root / 'index.html').write_text(f'<!doctype html><html lang="en"><head><meta charset="utf-8"><script src="assets/gsap.min.js"></script><style>html,body{{margin:0;width:1080px;height:1920px;overflow:hidden}}#root,.clip{{position:absolute;inset:0}}</style></head><body><div id="root" data-composition-id="main" data-width="1080" data-height="1920" data-fps="30" data-duration="{cursor}">{"".join(clips)}<audio id="voice-master" class="clip" src="voice-master.wav" data-start="0" data-duration="{cursor}" data-track-index="20"></audio></div><script>const tl=gsap.timeline({{paused:true}});tl.to({{}},{{duration:{cursor}}});window.__timelines.main=tl;</script></body></html>')
        env = dict(os.environ, TMPDIR=str(work), PRODUCER_HEADLESS_SHELL_PATH=config['chrome'], DO_NOT_TRACK='1')
        times = ','.join(str(round(cue['start'] + 1.3, 3)) for cue in cues)
        check = run([config['node'], config['hyperframesCli'], 'check', str(root), '--json', '--strict', '--at', times], env=env)
        (root / 'layout-check.json').write_bytes(check.stdout)
        picture = root / 'picture.mp4'
        run([config['node'], config['hyperframesCli'], 'render', str(root), '--workers', '1', '--format', 'mp4', '--fps', '30', '--crf', '23', '--output', picture], env=env)
        final = root / 'draft.mp4'
        run([config['ffmpeg'], '-v', 'error', '-y', '-i', picture, '-i', master, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', '-shortest', final])
        run([config['ffmpeg'], '-v', 'error', '-i', final, '-f', 'null', '-'])
        meta = probe(config, final)
        video = next(s for s in meta['streams'] if s['codec_type'] == 'video')
        audio = next(s for s in meta['streams'] if s['codec_type'] == 'audio')
        if video['width'] != 1080 or video['height'] != 1920 or video['codec_name'] != 'h264' or video['r_frame_rate'] != '30/1' or audio['codec_name'] != 'aac' or final.stat().st_size > 3900000:
            raise ValueError('encoded_video_contract_failed')
        actual_duration = float(meta['format']['duration'])
        if any(actual_duration < c['voiceEnd'] + 2 - .001 or c['start'] + c['duration'] < c['settledAt'] + 2 - .001 for c in cues):
            raise ValueError('two_second_hold_failed')
        levels = run([config['ffmpeg'], '-hide_banner', '-i', final, '-af', 'loudnorm=I=-16:TP=-1.5:print_format=json', '-f', 'null', '-']).stderr.decode()
        loudness = json.loads(levels[levels.rfind('{'):levels.rfind('}') + 1])
        if not -17.5 <= float(loudness['input_i']) <= -14.5 or float(loudness['input_tp']) > -1:
            raise ValueError('encoded_voice_level_failed')
        (root / 'cues.json').write_text(json.dumps(cues, indent=2))
        (root / 'encoded-qa.json').write_text(json.dumps({'probe': meta, 'loudness': loudness, 'listening': 'not_assessed', 'music': False, 'sfx': False}, indent=2))
        artifacts.append({'part': part['id'], 'artifactId': str(final), 'sha256': digest(final), 'packetSha256': packet['packetSha256'], 'snapshotSha256': packet['snapshotSha256'],
                          'narrationSha256': hashlib.sha256(json.dumps([s['narrationEn'] for s in part['scenes']], separators=(',', ':'), ensure_ascii=False).encode()).hexdigest(),
                          'voiceRevision': checked['voiceRevision'], 'bytes': final.stat().st_size, 'width': 1080, 'height': 1920, 'fps': 30, 'codec': 'h264', 'audioCodec': 'aac',
                          'qa': {key: True for key in ['decode', 'layout', 'claims', 'audio', 'timing', 'voiceOnly']}})
    ready = {'snapshotSha256': packet['snapshotSha256'], 'packetSha256': packet['packetSha256'], 'templateSha256': packet['templateSha256'], 'assets': artifacts}
    temp = work / 'ready-set.tmp'
    with temp.open('w') as stream:
        json.dump(ready, stream, ensure_ascii=False); stream.flush(); os.fsync(stream.fileno())
    temp.replace(work / 'ready-set.json')
    print(json.dumps({'status': 'ready', 'readySetPath': str(work / 'ready-set.json')}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', required=True)
    parser.add_argument('--preflight', action='store_true')
    parser.add_argument('--job')
    args = parser.parse_args()
    os.umask(0o077)
    cfg = json.loads(Path(args.config).read_text())
    if args.preflight:
        print(json.dumps(preflight(cfg)))
    elif args.job:
        render(cfg, json.loads(Path(args.job).read_text()))
    else:
        parser.error('choose --preflight or --job')
