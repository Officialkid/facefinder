from __future__ import annotations

from fastapi.testclient import TestClient

import app.api.routes as routes
from app.main import app
from app.schemas import FaceFinderException


client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get('/health')
    assert response.status_code == 200

    payload = response.json()
    assert payload['status'] == 'ok'
    assert payload['service'] == 'FaceFinder'
    assert 'deepface_ready' in payload


def test_process_missing_reference_image() -> None:
    response = client.post('/process', data={'dataset_link': 'https://example.com/images'})
    assert response.status_code == 422


def test_process_success_with_mock(monkeypatch) -> None:
    def fake_process(*args, **kwargs):
        return {
            'request_id': 'req_test',
            'message': 'Processing complete.',
            'threshold': 0.85,
            'matches_found': 1,
            'matches': [
                {
                    'image_id': 'match_1.jpg',
                    'source_url': 'https://example.com/match_1.jpg',
                    'confidence': 0.93,
                    'matched_face_count': 1,
                    'preview_base64': None,
                }
            ],
        }

    monkeypatch.setattr(routes.processor, 'process', fake_process)

    response = client.post(
        '/process',
        files={'reference_image': ('reference.jpg', b'fake-image-data', 'image/jpeg')},
        data={'dataset_link': 'https://example.com/gallery'},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload['matches_found'] == 1
    assert payload['matches'][0]['source_url'] == 'https://example.com/match_1.jpg'


def test_process_invalid_dataset_link_error(monkeypatch) -> None:
    def fake_process(*args, **kwargs):
        raise FaceFinderException(
            error_code='INVALID_DATASET_LINK',
            message='Dataset link must start with http:// or https://.',
            status_code=400,
        )

    monkeypatch.setattr(routes.processor, 'process', fake_process)

    response = client.post(
        '/process',
        files={'reference_image': ('reference.jpg', b'fake-image-data', 'image/jpeg')},
        data={'dataset_link': 'ftp://example.com/bad'},
    )

    assert response.status_code == 400
    payload = response.json()
    assert payload['error_code'] == 'INVALID_DATASET_LINK'


def test_process_empty_dataset_error(monkeypatch) -> None:
    def fake_process(*args, **kwargs):
        raise FaceFinderException(
            error_code='EMPTY_DATASET',
            message='No valid images were found in the dataset link.',
            status_code=400,
        )

    monkeypatch.setattr(routes.processor, 'process', fake_process)

    response = client.post(
        '/process',
        files={'reference_image': ('reference.jpg', b'fake-image-data', 'image/jpeg')},
        data={'dataset_link': 'https://example.com/empty'},
    )

    assert response.status_code == 400
    payload = response.json()
    assert payload['error_code'] == 'EMPTY_DATASET'


def test_process_no_matches_response(monkeypatch) -> None:
    def fake_process(*args, **kwargs):
        return {
            'request_id': 'req_nomatch',
            'message': 'No matching faces found above threshold.',
            'threshold': 0.85,
            'matches_found': 0,
            'matches': [],
        }

    monkeypatch.setattr(routes.processor, 'process', fake_process)

    response = client.post(
        '/process',
        files={'reference_image': ('reference.jpg', b'fake-image-data', 'image/jpeg')},
        data={'dataset_link': 'https://example.com/gallery'},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload['matches_found'] == 0
