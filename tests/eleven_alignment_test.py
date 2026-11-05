import importlib.util,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('prepare_audio',Path(__file__).resolve().parents[1]/'scripts/prepare-lula-audio.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class AlignmentTest(unittest.TestCase):
 def test_real_times_preserved(self):
  cues=m.cues_from_alignment({'characters':list('Oi. Sim!'),'character_start_times_seconds':[0,.1,.2,.3,.4,.5,.6,.7],'character_end_times_seconds':[.1,.2,.3,.4,.5,.6,.7,.8]})
  self.assertEqual(cues,[{'start':0.,'end':.3,'text':'Oi.'},{'start':.3,'end':.8,'text':'Sim!'}])
 def test_missing_alignment_rejected(self):
  with self.assertRaises(ValueError):m.cues_from_alignment({'characters':['A'],'character_start_times_seconds':[],'character_end_times_seconds':[]})
