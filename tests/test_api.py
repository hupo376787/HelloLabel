import io
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from PIL import Image

import web_api


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(web_api.app)

    @staticmethod
    def png_bytes() -> bytes:
        buf = io.BytesIO()
        Image.new("RGB", (64, 48), (12, 34, 56)).save(buf, format="PNG")
        return buf.getvalue()

    def test_health(self):
        r = self.client.get("/api/health")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["app"], "HelloLabel")


    def test_windows_ai_installer_uses_visible_cmd_console(self):
        with patch.object(web_api.sys, "platform", "win32"), patch.object(
            web_api.subprocess, "Popen"
        ) as popen:
            web_api._launch_source_ai_installer()
            args, kwargs = popen.call_args
            self.assertEqual(args[0][1:3], ["/d", "/k"])
            self.assertIn("install_ai.bat", args[0][3])
            self.assertIn("timeout /t 3", args[0][3])
            self.assertEqual(kwargs["cwd"], web_api.Path(web_api.__file__).resolve().parent)

    def test_install_ai_endpoint_uses_parent_launcher_handoff(self):
        with patch.dict(web_api.os.environ, {"HELLOLABEL_LAUNCHER": "bat"}, clear=False), patch.object(
            web_api, "_launch_source_ai_installer"
        ) as launcher, patch.object(web_api, "_exit_process_after_response"):
            r = self.client.post("/api/system/install-ai")
            self.assertEqual(r.status_code, 200)
            self.assertTrue(r.json()["handoff"])
            launcher.assert_not_called()

    def test_preview_and_ai_image_token_cache(self):
        r = self.client.post(
            "/api/preview",
            files={"file": ("sample.png", self.png_bytes(), "image/png")},
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.headers["x-image-width"], "64")
        self.assertEqual(r.headers["x-image-height"], "48")
        token = r.headers.get("x-ai-image-token")
        self.assertEqual(len(token), 64)
        self.assertEqual(web_api._cached_ai_image(token), self.png_bytes())

    def test_expired_ai_token_is_410(self):
        r = self.client.post(
            "/api/ai/sam",
            data={
                "model": "sam2",
                "image_token": "missing-token",
                "points": "[[10,10]]",
                "point_labels": "[1]",
                "box": "null",
                "output_shape": "polygon",
            },
        )
        self.assertEqual(r.status_code, 410)


if __name__ == "__main__":
    unittest.main()
