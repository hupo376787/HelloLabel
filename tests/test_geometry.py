import unittest

import cv2
import numpy as np

from ai.geometry import box_to_shape, mask_to_shape


class GeometryTests(unittest.TestCase):
    def setUp(self):
        self.mask = np.zeros((200, 300), dtype=np.uint8)
        cv2.ellipse(self.mask, (150, 90), (60, 30), 25, 0, 360, 1, -1)

    def test_polygon(self):
        shape = mask_to_shape(self.mask, "polygon")
        self.assertEqual(shape["shape_type"], "polygon")
        self.assertGreaterEqual(len(shape["points"]), 3)

    def test_rectangle(self):
        shape = mask_to_shape(self.mask, "rectangle")
        self.assertEqual(shape["shape_type"], "rectangle")
        self.assertEqual(len(shape["points"]), 2)

    def test_oriented_rectangle(self):
        shape = mask_to_shape(self.mask, "oriented_rectangle")
        self.assertEqual(shape["shape_type"], "oriented_rectangle")
        self.assertEqual(len(shape["points"]), 4)

    def test_minimum_enclosing_circle(self):
        shape = mask_to_shape(self.mask, "circle")
        self.assertEqual(shape["shape_type"], "circle")
        self.assertEqual(len(shape["points"]), 2)
        (cx, cy), (rx, ry) = shape["points"]
        self.assertGreater(((rx-cx)**2 + (ry-cy)**2) ** 0.5, 0)

    def test_box_contract(self):
        shape = box_to_shape([1.2, 2.3, 101.4, 202.5])
        self.assertEqual(shape, {
            "shape_type": "rectangle",
            "points": [[1.2, 2.3], [101.4, 202.5]],
        })


if __name__ == "__main__":
    unittest.main()
