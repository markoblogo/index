"""Synthetic HTML checks only: no report generation, speech, or MP4 rendering."""
import unittest
import json
import tempfile
from pathlib import Path
from render import scene_html, period_text, composition_html, loudnorm_second_pass_filter, cached_part_asset, digest


class RenderContract(unittest.TestCase):
    def setUp(self):
        self.scene = {'headlineEn': 'Corn at port', 'takeawayEn': 'Compare delivery bases.',
                      'hero': {'value': 160, 'unit': 'USD/t', 'basis': 'CPT Odesa',
                               'period': {'start': '2026-10-30', 'end': '2026-10-30'}},
                      'rows': [], 'kind': 'none'}

    def test_fixed_design_escapes_copy_and_uses_observation_date(self):
        self.scene['takeawayEn'] = '<script>bad</script>'
        result = scene_html(self.scene, 'grains', 0, 1, '2026-10-30')
        self.assertIn('160', result)
        self.assertIn('CPT Odesa', result)
        self.assertIn('&lt;script&gt;', result)
        self.assertNotIn('<script>bad', result)
        self.assertIn('2026', result)
        self.assertIn('30', period_text(self.scene['hero']['period']))

    def test_signed_bars_keep_nonnegative_width(self):
        row = {**self.scene['hero'], 'value': -5, 'english': {'headline': 'Weekly move'}}
        self.scene.update(rows=[row], kind='bars')
        result = scene_html(self.scene, 'grains', 0, 1, '2026-10-30')
        self.assertIn('width:100.000000%', result)
        self.assertNotIn('width:-', result)

    def test_timeline_visible_clip_has_stable_editable_identity(self):
        markup = composition_html('corn', '', 8, '<p>Synthetic</p>')
        self.assertIn('id="corn-clip" class="clip"', markup)
        self.assertIn('window.__timelines["corn"]', markup)

    def test_no_chart_scene_skips_empty_bar_animation_and_scopes_selectors(self):
        markup = composition_html('corn', '', 8, '<h1>Synthetic</h1>')
        self.assertIn('scope.querySelectorAll', markup)
        self.assertIn('if(bars.length)tl.from(bars', markup)
        self.assertNotIn('tl.from(".bar"', markup)
        self.assertIn('prefers-reduced-motion: reduce', markup)

    def test_excess_rows_and_long_labels_block_instead_of_overflowing(self):
        row = {**self.scene['hero'], 'english': {'headline': 'x' * 23}}
        self.scene.update(rows=[row], kind='rows')
        with self.assertRaisesRegex(ValueError, 'row_label'):
            scene_html(self.scene, 'grains', 0, 1, '2026-10-30')
        self.scene['rows'] = [row] * 3
        with self.assertRaisesRegex(ValueError, 'more_than_two'):
            scene_html(self.scene, 'grains', 0, 1, '2026-10-30')

    def test_two_pass_voice_filter_keeps_aac_peak_headroom_and_rejects_silence(self):
        measured = {'input_i': '-25.31', 'input_tp': '-5.49', 'input_lra': '11.50', 'input_thresh': '-35.82', 'target_offset': '1.04'}
        result = loudnorm_second_pass_filter(measured)
        self.assertIn('TP=-2.5', result)
        self.assertIn('measured_I=-25.31', result)
        self.assertIn('offset=1.04', result)
        measured['input_i'] = '-inf'
        with self.assertRaisesRegex(ValueError, 'not_finite'):
            loudnorm_second_pass_filter(measured)

    def test_resume_requires_same_packet_voice_revision_file_hash_and_all_qa(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder) / 'grains'; root.mkdir()
            file = root / 'draft.mp4'; file.write_bytes(b'synthetic fixture, not a real MP4')
            packet = {'packetSha256': 'p', 'snapshotSha256': 's'}
            asset = {'part': 'grains', 'artifactId': str(file), 'bytes': file.stat().st_size, 'sha256': digest(file), **packet,
                     'voiceRevision': 'voice', 'width': 1080, 'height': 1920, 'fps': 30, 'codec': 'h264', 'audioCodec': 'aac',
                     'qa': {key: True for key in ['decode', 'layout', 'claims', 'audio', 'timing', 'voiceOnly']}}
            (root / 'part-ready.json').write_text(json.dumps({'version': 1, 'asset': asset}))
            self.assertIsNotNone(cached_part_asset(root, packet, 'voice'))
            self.assertIsNone(cached_part_asset(root, packet, 'other-voice'))
            self.assertIsNone(cached_part_asset(root, {**packet, 'packetSha256': 'changed'}, 'voice'))
            file.write_bytes(b'changed')
            self.assertIsNone(cached_part_asset(root, packet, 'voice'))


if __name__ == '__main__':
    unittest.main()
