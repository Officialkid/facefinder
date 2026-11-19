FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    g++ \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY image-sorter/backend/requirements.txt /app/image-sorter/backend/requirements.txt
RUN python -m pip install --upgrade pip && pip install -r /app/image-sorter/backend/requirements.txt

# Pre-download ArcFace, Facenet512, and SSD detector weights into the container image for zero cold-start downloads
ENV TF_USE_LEGACY_KERAS=1
RUN python -c "import numpy as np; from deepface import DeepFace; DeepFace.build_model('ArcFace'); DeepFace.build_model('Facenet512'); DeepFace.extract_faces(img_path=np.zeros((112,112,3), dtype=np.uint8), detector_backend='ssd', enforce_detection=False)" || true

COPY image-sorter/backend /app/image-sorter/backend

WORKDIR /app/image-sorter/backend

EXPOSE 8080

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1"]
