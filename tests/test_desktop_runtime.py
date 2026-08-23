import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from ai.model_manager import ModelManager
from desktop.desktop_ai_installer import READY_MARKER, python_executable, requirements_without_sam3


class DesktopRuntimeTests(unittest.TestCase):
    def test_requirements_filter_keeps_ai_packages_but_skips_sam3(self):
        with tempfile.TemporaryDirectory() as td:
            req = Path(td) / "requirements-ai.txt"
            req.write_text("# test\nultralytics-opencv-headless>=8.3\nsam3==0.1.4\nRF-SAM-2==1.0.3\n", encoding="utf-8")
            self.assertEqual(
                requirements_without_sam3(req),
                ["ultralytics-opencv-headless>=8.3", "RF-SAM-2==1.0.3"],
            )

    def test_model_paths_use_desktop_model_directory(self):
        with tempfile.TemporaryDirectory() as td:
            model_dir = Path(td) / "models"
            with patch.dict(os.environ, {"HELLOLABEL_MODEL_DIR": str(model_dir)}):
                manager = ModelManager(Path(td) / "app", {"models": {}}, model_dir=model_dir)
                self.assertEqual(manager._resolve_path("models/sam.pth"), model_dir / "sam.pth")
                self.assertEqual(manager._resolve_path("yolo11n.pt"), model_dir / "yolo11n.pt")

    def test_ready_marker_name_is_stable(self):
        self.assertEqual(READY_MARKER, ".hellolabel-ai-ready.json")

    def test_workflow_is_tag_only(self):
        workflow = Path(__file__).resolve().parents[1] / ".github" / "workflows" / "desktop-build.yml"
        text = workflow.read_text(encoding="utf-8")
        self.assertIn('tags:\n      - "v*"', text)
        self.assertNotIn("workflow_dispatch", text)
        self.assertNotIn("pull_request:", text)


if __name__ == "__main__":
    unittest.main()
