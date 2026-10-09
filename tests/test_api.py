"""Offline integration tests. They never contact Microsoft or imply live synthesis."""
import asyncio
import http.client
import json
import threading
import unittest
from http.server import ThreadingHTTPServer
from unittest.mock import patch

import aiohttp
from api import tts


class QuietHandler(tts.handler):
    def log_message(self, *args):
        pass


class APITests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.port = cls.server.server_address[1]

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def request(self, body=None, method="POST", content_type="application/json"):
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=3)
        payload = json.dumps(body) if not isinstance(body, bytes) else body
        connection.request(method, "/api/tts", payload if method == "POST" else None,
                           {"Content-Type": content_type})
        response = connection.getresponse()
        result = response.status, dict(response.getheaders()), response.read()
        connection.close()
        return result

    def test_invalid_input_never_calls_upstream(self):
        cases = [None, [], {"text": " "}, {"text": 123}, {"text": "x" * 1201},
                 {"text": "Hi", "voice": "unknown"}, {"text": "Hi", "rate": 51},
                 {"text": "Hi", "rate": True}, {"text": "Hi", "pitch": "0"},
                 {"text": "Hi", "pitch": -51}, b'{"text":']
        with patch.object(tts, "synthesize") as upstream:
            for body in cases:
                with self.subTest(body=str(body)[:50]):
                    self.assertEqual(self.request(body)[0], 400)
            upstream.assert_not_called()

    def test_body_and_content_type_limits(self):
        self.assertEqual(self.request(b"x" * 32001)[0], 413)
        self.assertEqual(self.request({"text":"Hi"}, content_type="text/plain")[0], 415)

    def test_download_returns_exact_bytes_for_each_voice(self):
        # A fixture verifies transport and content headers, not speech quality.
        fixture = b"\xff\xfb" + b"audio-fixture" * 100
        async def fake(*args):
            return fixture
        with patch.object(tts, "synthesize", side_effect=fake) as upstream:
            for voice in tts.VOICES:
                status, headers, data = self.request({"text":" Hello & goodbye. ", "voice":voice, "rate":-25,"pitch":10})
                self.assertEqual(status, 200)
                self.assertEqual(headers["Content-Type"], "audio/mpeg")
                self.assertEqual(headers["Cache-Control"], "no-store")
                self.assertIn(".mp3", headers["Content-Disposition"])
                self.assertEqual(int(headers["Content-Length"]), len(fixture))
                self.assertEqual(data, fixture)
                self.assertEqual(upstream.call_args.args, ("Hello & goodbye.", voice, -25, 10))

    def test_upstream_failures_are_json_not_fake_mp3(self):
        for exc, expected in [(TimeoutError(), 504), (aiohttp.ClientConnectionError(), 503),
                              (tts.NoAudioReceived("empty"), 502), (OverflowError(), 413)]:
            async def fake(*args):
                raise exc
            with self.subTest(error=type(exc).__name__), patch.object(tts, "synthesize", side_effect=fake):
                status, headers, body = self.request({"text":"Hi"})
                self.assertEqual(status, expected)
                self.assertIn("application/json", headers["Content-Type"])
                self.assertTrue(json.loads(body)["error"])
                self.assertNotIn("Content-Disposition", headers)

    def test_overall_timeout_is_enforced(self):
        async def slow(*args):
            await asyncio.sleep(1)
        with patch.object(tts, "TIMEOUT", 0.01), patch.object(tts, "synthesize", side_effect=slow):
            self.assertEqual(self.request({"text":"Hi"})[0], 504)

    def test_readiness_is_explicit(self):
        status, _, body = self.request(method="GET")
        result = json.loads(body)
        self.assertEqual(status, 200)
        self.assertEqual(result["voices"], list(tts.VOICES))
        self.assertEqual(result["maxCharactersPerRequest"], 1200)


if __name__ == "__main__":
    unittest.main()
