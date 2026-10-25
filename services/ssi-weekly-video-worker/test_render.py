"""Synthetic HTML checks only: no report generation, speech, or MP4 rendering."""
import unittest
from render import scene_html, period_text, composition_html


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

    def test_excess_rows_and_long_labels_block_instead_of_overflowing(self):
        row = {**self.scene['hero'], 'english': {'headline': 'x' * 23}}
        self.scene.update(rows=[row], kind='rows')
        with self.assertRaisesRegex(ValueError, 'row_label'):
            scene_html(self.scene, 'grains', 0, 1, '2026-10-30')
        self.scene['rows'] = [row] * 3
        with self.assertRaisesRegex(ValueError, 'more_than_two'):
            scene_html(self.scene, 'grains', 0, 1, '2026-10-30')


if __name__ == '__main__':
    unittest.main()
