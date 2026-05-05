from __future__ import annotations

import base64
from pathlib import Path
from typing import Optional

import cv2


def build_preview_data_url(image_path: str, max_width: int = 420) -> Optional[str]:
    image = cv2.imread(image_path)
    if image is None:
        return None

    h, w = image.shape[:2]
    if w > max_width:
        scale = max_width / float(w)
        resized = cv2.resize(image, (max_width, int(h * scale)), interpolation=cv2.INTER_AREA)
    else:
        resized = image

    ok, encoded = cv2.imencode(".jpg", resized, [int(cv2.IMWRITE_JPEG_QUALITY), 78])
    if not ok:
        return None

    b64 = base64.b64encode(encoded.tobytes()).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"


def file_name(path: str) -> str:
    return Path(path).name
