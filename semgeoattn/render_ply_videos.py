"""
Render rotating videos of PLY models with vertex colors (saliency maps).

Requirements:
    pip install open3d opencv-python numpy

Usage:
    python render_ply_videos.py
"""

import open3d as o3d
import numpy as np
import cv2
import os
from pathlib import Path

# Configuration
INPUT_DIR = "assets/models"
OUTPUT_DIR = "assets/videos"
VIDEO_WIDTH = 640
VIDEO_HEIGHT = 480
FPS = 30
DURATION_SECONDS = 6  # Full rotation duration
TOTAL_FRAMES = FPS * DURATION_SECONDS
BACKGROUND_COLOR = [0.1, 0.1, 0.15]  # Dark blue-gray background


def load_ply_with_colors(filepath):
    """Load PLY file and return mesh or point cloud with colors."""
    # Try loading as mesh first
    mesh = o3d.io.read_triangle_mesh(filepath)

    if mesh.has_vertex_colors() and len(mesh.triangles) > 0:
        mesh.compute_vertex_normals()
        return mesh, "mesh"

    # If no mesh, try as point cloud
    pcd = o3d.io.read_point_cloud(filepath)
    if pcd.has_colors():
        return pcd, "pointcloud"

    # Fallback: return mesh even without colors
    if len(mesh.triangles) > 0:
        mesh.compute_vertex_normals()
        # Add default gray color
        mesh.paint_uniform_color([0.7, 0.7, 0.7])
        return mesh, "mesh"

    return pcd, "pointcloud"


def center_and_scale(geometry):
    """Center geometry at origin and scale to fit view."""
    # Get bounding box
    bbox = geometry.get_axis_aligned_bounding_box()
    center = bbox.get_center()

    # Center the geometry
    geometry.translate(-center)

    # Scale to fit in unit sphere
    extent = bbox.get_extent()
    max_extent = max(extent)
    if max_extent > 0:
        geometry.scale(1.8 / max_extent, center=[0, 0, 0])

    return geometry


def render_rotating_video(geometry, geo_type, output_path, model_name):
    """Render a rotating video of the geometry."""

    # Create visualizer
    vis = o3d.visualization.Visualizer()
    vis.create_window(width=VIDEO_WIDTH, height=VIDEO_HEIGHT, visible=False)

    # Add geometry
    vis.add_geometry(geometry)

    # Set render options
    render_option = vis.get_render_option()
    render_option.background_color = np.array(BACKGROUND_COLOR)
    render_option.point_size = 3.0
    render_option.light_on = True

    # Get view control
    view_ctrl = vis.get_view_control()

    # Set initial camera position
    view_ctrl.set_zoom(0.7)
    view_ctrl.set_front([0, 0, -1])
    view_ctrl.set_up([0, 1, 0])

    # Setup video writer
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    video_writer = cv2.VideoWriter(output_path, fourcc, FPS, (VIDEO_WIDTH, VIDEO_HEIGHT))

    print(f"  Rendering {TOTAL_FRAMES} frames...")

    # Render frames with rotation
    for i in range(TOTAL_FRAMES):
        # Rotate camera around the object
        angle_per_frame = 360.0 / TOTAL_FRAMES
        view_ctrl.rotate(angle_per_frame * 3.0, 0)  # Horizontal rotation

        # Update and render
        vis.poll_events()
        vis.update_renderer()

        # Capture frame
        image = vis.capture_screen_float_buffer(do_render=True)
        image = np.asarray(image)
        image = (image * 255).astype(np.uint8)
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

        video_writer.write(image)

        # Progress indicator
        if (i + 1) % 30 == 0:
            print(f"    Frame {i + 1}/{TOTAL_FRAMES}")

    video_writer.release()
    vis.destroy_window()
    print(f"  Saved: {output_path}")


def main():
    """Process all PLY files and create rotating videos."""

    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Find all PLY files
    ply_files = list(Path(INPUT_DIR).glob("*.ply"))

    if not ply_files:
        print(f"No PLY files found in {INPUT_DIR}")
        return

    print(f"Found {len(ply_files)} PLY files")
    print("-" * 50)

    for ply_path in sorted(ply_files):
        model_name = ply_path.stem  # e.g., "cat_gt" or "cat_pred"
        output_path = os.path.join(OUTPUT_DIR, f"{model_name}.mp4")

        print(f"\nProcessing: {model_name}")

        try:
            # Load geometry
            geometry, geo_type = load_ply_with_colors(str(ply_path))
            print(f"  Loaded as: {geo_type}")

            # Check if has colors
            if geo_type == "mesh":
                has_colors = geometry.has_vertex_colors()
            else:
                has_colors = geometry.has_colors()
            print(f"  Has colors: {has_colors}")

            # Center and scale
            geometry = center_and_scale(geometry)

            # Render video
            render_rotating_video(geometry, geo_type, output_path, model_name)

        except Exception as e:
            print(f"  ERROR: {e}")
            continue

    print("\n" + "=" * 50)
    print("Done! Videos saved to:", OUTPUT_DIR)
    print("\nTo use in the webpage, update the HTML to reference these videos.")


if __name__ == "__main__":
    main()
