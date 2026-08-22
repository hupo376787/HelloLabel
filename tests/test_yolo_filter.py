import unittest
from pathlib import Path

import numpy as np

from ai.model_manager import ModelManager


class _Tensor:
    def __init__(self, data):
        self._data = np.asarray(data)

    def detach(self):
        return self

    def cpu(self):
        return self

    def numpy(self):
        return self._data


class _Boxes:
    def __init__(self):
        self.xyxy = _Tensor([[1, 2, 11, 12], [20, 22, 40, 42]])
        self.cls = _Tensor([0, 1])
        self.conf = _Tensor([0.9, 0.8])


class _Result:
    names = {0: "dog", 1: "cat"}
    boxes = _Boxes()
    masks = None


class _Model:
    def predict(self, **_kwargs):
        return [_Result()]


class YoloClassFilterTests(unittest.TestCase):
    def setUp(self):
        self.manager = ModelManager(Path("."), {"models": {}})
        self.manager.decode_image = lambda _image_bytes: (
            np.zeros((64, 64, 3), dtype=np.uint8),
            np.zeros((64, 64, 3), dtype=np.uint8),
        )
        self.manager._get_yolo = lambda _model_id: _Model()

    def test_blank_text_keeps_all_yolo11_classes(self):
        out = self.manager.predict_yolo(
            "yolo11-detect", b"fake", [], 0.25, 0.5, "rectangle"
        )
        self.assertEqual([x["label"] for x in out], ["dog", "cat"])

    def test_text_filters_yolo11_classes_case_insensitively(self):
        out = self.manager.predict_yolo(
            "yolo11-detect", b"fake", ["DOG"], 0.25, 0.5, "rectangle"
        )
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["label"], "dog")


if __name__ == "__main__":
    unittest.main()
