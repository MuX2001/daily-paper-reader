from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from obsidian_sync import managed_note,merge_note

class ObsidianSyncTests(unittest.TestCase):
    def test_user_notes_preserved(self):
        old=managed_note('Old generated text\n','\n\n## 我的笔记\n\nUser notes [[Project]]')
        new=managed_note('New generated text\n')
        merged=merge_note(old,new)
        self.assertIn('New generated text',merged)
        self.assertIn('User notes [[Project]]',merged)
        self.assertNotIn('Old generated text',merged)
    def test_edits_to_generated_text_are_not_overwritten(self):
        old=managed_note('Generated\n').replace('Generated\n','Edited\n')
        with self.assertRaises(ValueError):merge_note(old,managed_note('New\n'))
        with self.assertRaises(ValueError):merge_note('Unmanaged user note',managed_note('New\n'))
