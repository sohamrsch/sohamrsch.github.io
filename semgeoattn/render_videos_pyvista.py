"""
Render rotating videos of PLY models using PyVista (better vertex color support).

Requirements:
    pip install pyvista imageio[ffmpeg] numpy

Usage:
    python render_videos_pyvista.py
"""

import pyvista as pv
import numpy as np
import os
from pathlib import Path

# Configuration
INPUT_DIR = "assets/models"
OUTPUT_DIR = "assets/videos"
VIDEO_WIDTH = 640
VIDEO_HEIGHT = 480
FPS = 30
DURATION_SECONDS = 6
TOTAL_FRAMES = FPS * DURATION_SECONDS


def render_model_video(ply_path, output_path):
    """Render a rotating video of a PLY model."""

    # Load the PLY file
    mesh = pv.read(ply_path)

    # Check for colors
    has_colors = 'RGB' in mesh.array_names or 'RGBA' in mesh.array_names or mesh.n_arrays > 0

    # Create plotter (off-screen rendering)
    plotter = pv.Plotter(off_screen=True, window_size=[VIDEO_WIDTH, VIDEO_HEIGHT])
    plotter.set_background([0.1, 0.1, 0.15])  # Dark blue-gray

    # Add mesh with colors
    if 'RGB' in mesh.array_names:
        # Normalize RGB if needed
        rgb = mesh['RGB']
        if rgb.max() > 1:
            rgb = rgb / 255.0
        plotter.add_mesh(mesh, scalars=rgb, rgb=True, smooth_shading=True)
    elif 'RGBA' in mesh.array_names:
        rgba = mesh['RGBA']
        if rgba.max() > 1:
            rgba = rgba / 255.0
        plotter.add_mesh(mesh, scalars=rgba[:, :3], rgb=True, smooth_shading=True)
    elif mesh.n_arrays > 0:
        # Use first available scalar array (might be saliency values)
        scalar_name = mesh.array_names[0]
        plotter.add_mesh(mesh, scalars=scalar_name, cmap='jet', smooth_shading=True)
    else:
        # No colors, use default
        plotter.add_mesh(mesh, color='lightblue', smooth_shading=True)

    # Add lighting
    plotter.add_light(pv.Light(position=(5, 5, 5), intensity=0.8))
    plotter.add_light(pv.Light(position=(-5, -5, 5), intensity=0.4))

    # Center camera on mesh
    plotter.reset_camera()
    plotter.camera.zoom(1.3)

    # Open movie file
    plotter.open_movie(output_path, framerate=FPS, quality=8)

    # Render rotating frames
    print(f"  Rendering {TOTAL_FRAMES} frames...")
    angle_step = 360 / TOTAL_FRAMES

    for i in range(TOTAL_FRAMES):
        # Rotate camera around the model
        plotter.camera.azimuth = i * angle_step

        # Write frame
        plotter.write_frame()

        # Progress
        if (i + 1) % 30 == 0:
            print(f"    Frame {i + 1}/{TOTAL_FRAMES}")

    # Close movie
    plotter.close()
    print(f"  Saved: {output_path}")


def main():
    """Process all PLY files."""

    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Find PLY files
    ply_files = list(Path(INPUT_DIR).glob("*.ply"))

    if not ply_files:
        print(f"No PLY files found in {INPUT_DIR}")
        return

    print(f"Found {len(ply_files)} PLY files")
    print("-" * 50)

    # Enable off-screen rendering (only needed on Linux)
    # pv.start_xvfb()  # Commented out - not needed on Windows

    for ply_path in sorted(ply_files):
        model_name = ply_path.stem
        output_path = os.path.join(OUTPUT_DIR, f"{model_name}.mp4")

        print(f"\nProcessing: {model_name}")

        try:
            render_model_video(str(ply_path), output_path)
        except Exception as e:
            print(f"  ERROR: {e}")
            import traceback
            traceback.print_exc()

    print("\n" + "=" * 50)
    print("Done! Videos saved to:", OUTPUT_DIR)


if __name__ == "__main__":
    main()
