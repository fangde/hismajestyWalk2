import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

# Load the 7 padded frames
frames_rgba = []
for i in range(7):
    img = cv2.imread(f'assets/sprites/king_walk_padded_{i}.png', cv2.IMREAD_UNCHANGED)
    frames_rgba.append(img)

# Target preview dimensions: 600 x 600 canvas
canvas_w, canvas_h = 600, 600
scale = 4.0 # 4x upscale for crisp, large display

fps = 8 # 8 frames per second (125ms per frame)
video_writer = cv2.VideoWriter('king_animation_only.mp4', cv2.VideoWriter_fourcc(*'avc1'), 30.0, (canvas_w, canvas_h))

gif_frames = []

# Generate 3 full loop cycles (21 animation steps)
num_loops = 4
total_steps = 7 * num_loops

# Background style: warm museum Egyptian limestone parchment
bg_base = np.zeros((canvas_h, canvas_w, 3), dtype=np.uint8)
for y in range(canvas_h):
    # subtle radial vignette
    ratio = y / canvas_h
    col = np.array([215 - ratio * 20, 230 - ratio * 15, 242 - ratio * 10], dtype=np.float32)
    bg_base[y, :] = col.astype(np.uint8)

# Add subtle papyrus grid line for grounding
ground_y = 480
cv2.line(bg_base, (40, ground_y), (canvas_w - 40, ground_y), (160, 140, 120), 2)
cv2.line(bg_base, (40, ground_y + 4), (canvas_w - 40, ground_y + 4), (180, 160, 140), 1)

for step in range(total_steps):
    frame_idx = step % 7
    sprite = frames_rgba[frame_idx]
    
    # 4x upscale using Lanczos for clean edges
    h, w = sprite.shape[:2]
    sprite_large = cv2.resize(sprite, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_LANCZOS4)
    sh, sw = sprite_large.shape[:2]
    
    # Position: centered horizontally, feet anchored to ground_y
    draw_x = (canvas_w - sw) // 2
    draw_y = ground_y - sh
    
    # Create canvas
    frame_canvas = bg_base.copy()
    
    # Contact shadow
    shadow_w = int(sw * 0.42)
    shadow_h = 14
    cv2.ellipse(frame_canvas, (canvas_w // 2 + 10, ground_y), (shadow_w, shadow_h), 0, 0, 360, (170, 150, 130), -1)
    
    # Alpha blend sprite
    alpha = (sprite_large[:, :, 3].astype(float) / 255.0)[:, :, None]
    bgr = sprite_large[:, :, :3].astype(float)
    
    roi = frame_canvas[draw_y:draw_y+sh, draw_x:draw_x+sw].astype(float)
    blended = bgr * alpha + roi * (1.0 - alpha)
    frame_canvas[draw_y:draw_y+sh, draw_x:draw_x+sw] = blended.astype(np.uint8)
    
    # Add Frame indicator & Info overlay
    info_text = f"KING WALK CYCLE - FRAME {frame_idx + 1} / 7"
    cv2.putText(frame_canvas, info_text, (canvas_w // 2 - 160, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (60, 40, 30), 2, cv2.LINE_AA)
    
    status_text = "Standard Pharaonic Stride | Ground Anchored"
    cv2.putText(frame_canvas, status_text, (canvas_w // 2 - 170, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (120, 100, 80), 1, cv2.LINE_AA)
    
    # Ground label
    cv2.putText(frame_canvas, "Sandstone Baseline", (50, ground_y - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (140, 120, 100), 1, cv2.LINE_AA)
    
    # Write to 30fps video (hold each frame for ~4 frames = ~133ms)
    for _ in range(4):
        video_writer.write(frame_canvas)
        
    if step < 7:
        # Convert to PIL for animated GIF (only 1 loop needed for gif)
        rgb_frame = cv2.cvtColor(frame_canvas, cv2.COLOR_BGR2RGB)
        gif_frames.append(Image.fromarray(rgb_frame))

video_writer.release()

# Save animated GIF
gif_frames[0].save(
    'king_walk_showcase.gif',
    save_all=True,
    append_images=gif_frames[1:],
    duration=130, # 130ms per frame
    loop=0
)

print("king_animation_only.mp4 and king_walk_showcase.gif generated successfully!")
