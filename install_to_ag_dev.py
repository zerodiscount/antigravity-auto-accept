#!/usr/bin/env python3
import os
import zipfile
import json
import shutil
import time

vsix_path = "/mnt/dev_ai_core/workspace/Dev/Tools/hygient-antigravity-autoaccept/hygient-antigravity-autoaccept-1.1.0.vsix"
dest_dir = "/home/frappe/.antigravity-ide-server/extensions/hygient.hygient-antigravity-autoaccept-1.1.0-universal"
extensions_json_path = "/home/frappe/.antigravity-ide-server/extensions/extensions.json"
obsolete_json_path = "/home/frappe/.antigravity-ide-server/extensions/.obsolete"

print(f"Installing from {vsix_path} to {dest_dir}...")

# 1. Clean existing
if os.path.exists(dest_dir):
    shutil.rmtree(dest_dir)
os.makedirs(dest_dir, exist_ok=True)

# 2. Extract vsix
with zipfile.ZipFile(vsix_path, "r") as z:
    for member in z.infolist():
        if member.filename.startswith("extension/"):
            rel_path = member.filename[len("extension/"):]
            if not rel_path:
                continue
            target = os.path.join(dest_dir, rel_path)
            if member.is_dir():
                os.makedirs(target, exist_ok=True)
            else:
                os.makedirs(os.path.dirname(target), exist_ok=True)
                with open(target, "wb") as f:
                    f.write(z.read(member))
        elif member.filename == "extension.vsixmanifest":
            with open(os.path.join(dest_dir, ".vsixmanifest"), "wb") as f:
                f.write(z.read(member))

# 3. Update extensions.json
ext_entry = {
    "identifier": {
        "id": "hygient.hygient-antigravity-autoaccept"
    },
    "version": "1.1.0",
    "location": {
        "$mid": 1,
        "path": dest_dir,
        "scheme": "file"
    },
    "relativeLocation": "hygient.hygient-antigravity-autoaccept-1.1.0-universal",
    "metadata": {
        "installedTimestamp": int(time.time() * 1000),
        "pinned": False,
        "source": "custom",
        "publisherId": "hygient-internal",
        "publisherDisplayName": "Hygient",
        "targetPlatform": "universal",
        "updated": False,
        "private": True,
        "isPreReleaseVersion": False,
        "hasPreReleaseVersion": False
    }
}

extensions = []
if os.path.exists(extensions_json_path):
    with open(extensions_json_path, "r") as f:
        extensions = json.load(f)
extensions = [e for e in extensions if e.get("identifier", {}).get("id") != "hygient.hygient-antigravity-autoaccept"]
extensions.append(ext_entry)

with open(extensions_json_path, "w") as f:
    json.dump(extensions, f, indent=2)

# 4. Clean .obsolete
if os.path.exists(obsolete_json_path):
    try:
        with open(obsolete_json_path, "r") as f:
            obsolete = json.load(f)
        obsolete.pop("hygient.hygient-antigravity-autoaccept-1.0.0-universal", None)
        obsolete.pop("hygient.hygient-antigravity-autoaccept-1.1.0-universal", None)
        with open(obsolete_json_path, "w") as f:
            json.dump(obsolete, f)
    except Exception as e:
        print(f"Notice: .obsolete cleanup: {e}")

# 5. Fix permissions
shutil.chown(dest_dir, user="frappe", group="frappe")
for root, dirs, files in os.walk(dest_dir):
    for d in dirs:
        shutil.chown(os.path.join(root, d), user="frappe", group="frappe")
    for f in files:
        shutil.chown(os.path.join(root, f), user="frappe", group="frappe")
shutil.chown(extensions_json_path, user="frappe", group="frappe")

print("Successfully installed Hygient AutoAccept v1.1.0 on ag-dev!")
