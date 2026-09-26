import asyncio
import json
import urllib.request
import subprocess
import time
import os
import sys
import base64
import cv2
import numpy as np
import websockets

HTTP_PORT = 8092
CDP_PORT = 9225

async def record_gameplay():
    print("=== Step 1: Starting local web server ===")
    server_proc = subprocess.Popen(
        ["python3", "-m", "http.server", str(HTTP_PORT)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    time.sleep(1)

    print("=== Step 2: Launching Chrome with CDP ===")
    chrome_path = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    chrome_proc = subprocess.Popen([
        chrome_path,
        "--headless=new",
        f"--remote-debugging-port={CDP_PORT}",
        "--window-size=1280,720",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--autoplay-policy=no-user-gesture-required",
        f"http://localhost:{HTTP_PORT}"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)

    try:
        # Find page target
        req = urllib.request.urlopen(f"http://localhost:{CDP_PORT}/json")
        targets = json.loads(req.read().decode())
        page_target = next(t for t in targets if t.get("type") == "page")
        ws_url = page_target["webSocketDebuggerUrl"]
        print(f"Connected to page target: {page_target.get('title')}")

        async with websockets.connect(ws_url, max_size=20 * 1024 * 1024) as ws:
            msg_id = 1

            async def send_cmd(method, params=None):
                nonlocal msg_id
                cmd = {"id": msg_id, "method": method, "params": params or {}}
                msg_id += 1
                await ws.send(json.dumps(cmd))
                return cmd["id"]

            async def eval_js(expression):
                cid = await send_cmd("Runtime.evaluate", {"expression": expression, "returnByValue": True})
                while True:
                    res = json.loads(await ws.recv())
                    if res.get("id") == cid:
                        return res.get("result", {}).get("result", {}).get("value")

            # Enable Page and Runtime
            await send_cmd("Page.enable")
            await send_cmd("Runtime.enable")

            print("Waiting for game assets to load...")
            for _ in range(30):
                loaded = await eval_js("window.gameAssets && window.gameAssets.getProgress() === 1.0")
                if loaded:
                    print("Game assets loaded successfully!")
                    break
                await asyncio.sleep(0.5)

            # Click start button to enter the palace
            print("Entering the Imperial Palace...")
            await eval_js("""
                const startBtn = document.getElementById('btn-start-game');
                if (startBtn) startBtn.click();
            """)
            await asyncio.sleep(1.0)

            # Setup video writer
            video_file = "his_majesty_gameplay.mp4"
            fourcc = cv2.VideoWriter_fourcc(*'avc1')
            fps = 30.0
            video_writer = cv2.VideoWriter(video_file, fourcc, fps, (1280, 720))

            if not video_writer.isOpened():
                print("Falling back to mp4v codec...")
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                video_writer = cv2.VideoWriter(video_file, fourcc, fps, (1280, 720))

            # Start Screencast
            print("Starting screencast recording...")
            await send_cmd("Page.startScreencast", {
                "format": "jpeg",
                "quality": 85,
                "maxWidth": 1280,
                "maxHeight": 720,
                "everyNthFrame": 1
            })

            frame_count = 0
            start_time = time.time()
            duration = 18.0 # record 18 seconds of varied gameplay

            # Gameplay actions timeline (seconds -> JS code to run)
            actions = [
                # Start walking right
                (1.0, "window.gameInput.keys['ArrowRight'] = true;"),
                # Spacebar blessing on kneeling subjects
                (4.0, "window.gameKing.triggerBlessing(window.gameParticles, window.gameWorld);"),
                # Continue walking
                (5.5, "window.gameInput.keys['ArrowRight'] = true;"),
                # Another divine blessing
                (7.5, "window.gameKing.triggerBlessing(window.gameParticles, window.gameWorld);"),
                # Toggle Avatar style to Royal Portrait
                (9.0, """
                    window.gameKing.switchAvatarStyle();
                    const btn = document.getElementById('btn-toggle-avatar');
                    if (btn) btn.innerText = '👑 Style: Royal Portrait';
                """),
                # Sound the Sistrum of submission
                (11.0, """
                    window.gameWorld.subjects.forEach(s => {
                        s.state = 'prostrating';
                        s.showSpeech('Prostrate before Pharaoh! 𓊽', 2.0, '#fde047');
                    });
                """),
                # Swift sprint walk forward
                (12.5, "window.gameInput.keys['ShiftLeft'] = true; window.gameInput.keys['ArrowRight'] = true;"),
                # Another grand blessing
                (15.0, "window.gameKing.triggerBlessing(window.gameParticles, window.gameWorld);"),
                # Release keys
                (17.0, "window.gameInput.keys['ShiftLeft'] = false; window.gameInput.keys['ArrowRight'] = false;")
            ]
            action_idx = 0

            # Save sample screenshots at key moments
            saved_screenshots = {
                "walk_and_kneel": False,
                "divine_blessing": False,
                "royal_portrait": False
            }

            while time.time() - start_time < duration:
                elapsed = time.time() - start_time

                # Check action timeline
                if action_idx < len(actions) and elapsed >= actions[action_idx][0]:
                    await eval_js(actions[action_idx][1])
                    action_idx += 1

                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=0.1)
                    data = json.loads(msg)
                    if data.get("method") == "Page.screencastFrame":
                        session_id = data["params"]["sessionId"]
                        frame_b64 = data["params"]["data"]

                        # Acknowledge frame
                        await send_cmd("Page.screencastFrameAck", {"sessionId": session_id})

                        # Decode frame
                        img_bytes = base64.b64decode(frame_b64)
                        nparr = np.frombuffer(img_bytes, np.uint8)
                        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                        if frame is not None:
                            if frame.shape[:2] != (720, 1280):
                                frame = cv2.resize(frame, (1280, 720))

                            video_writer.write(frame)
                            frame_count += 1

                            # Save screenshots
                            if elapsed > 3.0 and not saved_screenshots["walk_and_kneel"]:
                                cv2.imwrite("screenshot_walk_and_kneel.jpg", frame)
                                saved_screenshots["walk_and_kneel"] = True
                                print("Saved screenshot: screenshot_walk_and_kneel.jpg")

                            if elapsed > 4.5 and not saved_screenshots["divine_blessing"]:
                                cv2.imwrite("screenshot_divine_blessing.jpg", frame)
                                saved_screenshots["divine_blessing"] = True
                                print("Saved screenshot: screenshot_divine_blessing.jpg")

                            if elapsed > 10.0 and not saved_screenshots["royal_portrait"]:
                                cv2.imwrite("screenshot_royal_portrait.jpg", frame)
                                saved_screenshots["royal_portrait"] = True
                                print("Saved screenshot: screenshot_royal_portrait.jpg")

                except asyncio.TimeoutError:
                    pass

            await send_cmd("Page.stopScreencast")
            video_writer.release()
            print(f"Recording complete! Total frames: {frame_count}, saved to: {video_file}")

    finally:
        chrome_proc.terminate()
        server_proc.terminate()
        print("Servers stopped.")

if __name__ == "__main__":
    asyncio.run(record_gameplay())
