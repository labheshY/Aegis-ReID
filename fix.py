import os
import site
import sys

# Find your active site-packages path
site_packages_dir = site.getsitepackages()[0]
dist_info_dir = os.path.join(site_packages_dir, "onnxruntime-1.23.0.dist-info")

# Create a fake metadata directory that tells pip "onnxruntime" is installed
os.makedirs(dist_info_dir, exist_ok=True)
metadata_file = os.path.join(dist_info_dir, "METADATA")

with open(metadata_file, "w") as f:
    f.write("Metadata-Version: 2.1\n")
    f.write("Name: onnxruntime\n")
    f.write("Version: 1.23.0\n")

print("Success! Ultralytics will now believe onnxruntime is natively installed.")
