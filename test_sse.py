#!/usr/bin/env python3
"""SSE接続をテストするスクリプト"""
import requests
import sys
import time

def test_sse():
    print("SSE接続を開始...")
    try:
        response = requests.get('http://localhost:8000/stream', stream=True, timeout=30)
        print(f"接続成功: {response.status_code}")

        for line in response.iter_lines():
            if line:
                decoded_line = line.decode('utf-8')
                print(f"受信: {decoded_line}")
                sys.stdout.flush()

    except KeyboardInterrupt:
        print("\n接続を終了します")
    except Exception as e:
        print(f"エラー: {e}")

if __name__ == "__main__":
    test_sse()
