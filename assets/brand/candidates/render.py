#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
# SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.
"""Render with an already installed Chrome. Never installs a renderer.

Usage: python3 assets/brand/candidates/render.py /absolute/path/to/chrome
"""
from pathlib import Path
import os
import signal
import struct
import subprocess
import sys
import tempfile
import time
import xml.etree.ElementTree as ET


def main():
    chrome = Path(sys.argv[1]).resolve(strict=True)
    root = Path(__file__).resolve().parent
    scratch = root.parents[2] / '.local/xezar/scratch/brand'
    scratch.mkdir(parents=True, exist_ok=True)
    for source in sorted(root.rglob('*.svg')):
        element = ET.parse(source).getroot()
        width, height = (int(element.attrib[key]) for key in ('width', 'height'))
        target = source.with_suffix('.png')
        with tempfile.TemporaryDirectory(dir=scratch) as temporary:
            temp = Path(temporary)
            output = temp / 'render.png'
            args = [str(chrome), '--headless', '--disable-gpu', '--hide-scrollbars',
                    '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
                    '--disable-extensions', '--disable-sync', '--force-device-scale-factor=1',
                    '--default-background-color=00000000', f'--user-data-dir={temp / "profile"}',
                    f'--window-size={width},{height}', f'--screenshot={output}', source.as_uri()]
            with (temp / 'chrome.log').open('w') as log:
                process = subprocess.Popen(args, stdout=log, stderr=log, start_new_session=True)
                try:
                    deadline = time.monotonic() + 30
                    while time.monotonic() < deadline:
                        data = output.read_bytes() if output.exists() else b''
                        if data.endswith(b'\x00\x00\x00\x00IEND\xaeB`\x82'):
                            assert data[:8] == b'\x89PNG\r\n\x1a\n'
                            assert struct.unpack('>II', data[16:24]) == (width, height)
                            target.write_bytes(data)
                            break
                        if process.poll() is not None:
                            raise RuntimeError(f'Chrome exited without a complete PNG: {source}')
                        time.sleep(0.1)
                    else:
                        raise TimeoutError(f'Chrome did not render {source} within 30 seconds')
                finally:
                    # Chrome sometimes lingers after writing its screenshot. Only stop
                    # the isolated process group started above, never another browser.
                    try:
                        os.killpg(process.pid, signal.SIGTERM)
                    except ProcessLookupError:
                        pass
                    try:
                        process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        os.killpg(process.pid, signal.SIGKILL)
                        process.wait()
            print(target.relative_to(root), flush=True)


if __name__ == '__main__':
    main()
