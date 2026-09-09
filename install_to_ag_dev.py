#!/usr/bin/env python3
import os
import zipfile
import json
import shutil
import time
import glob

version = json.load(open("/mnt/dev_ai_core/workspace/Dev/Tools/hygient-antigravity-autoaccept/package.json"))["version"]
vsix_path = "/mnt/dev_ai_core/workspace/Dev/Tools/hygient-antigravity-autoaccept/antigravity-auto-accept.vsix"
ext_base = "/home/frappe/.antigravity-ide-server/extensions"
dest_dir = os.path.join(ext_base, f"hygient.hygient-antigravity-autoaccept-{version}-universal")
extensions_json_path = os.path.join(ext_base, "extensions.json")
obsolete_json_path = os.path.join(ext_base, ".obsolete")

print(f"[ag-dev] Cleaning old extensions in {ext_base}...")
for old_dir in glob.glob(os.path.join(ext_base, "hygient.hygient-antigravity-autoaccept-*")):
    print(f"  Removing: {old_dir}")
    shutil.rmtree(old_dir, ignore_errors=True)

print(f"[ag-dev] Installing v{version} to {dest_dir}...")
os.makedirs(dest_dir, exist_ok=True)

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

ext_entry = {
    "identifier": {
        "id": "hygient.hygient-antigravity-autoaccept"
    },
    "version": version,
    "location": {
        "$mid": 1,
        "path": dest_dir,
        "scheme": "file"
    },
    "relativeLocation": f"hygient.hygient-antigravity-autoaccept-{version}-universal",
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
    try:
        with open(extensions_json_path, "r") as f:
            extensions = json.load(f)
    except Exception:
        extensions = []
extensions = [e for e in extensions if e.get("identifier", {}).get("id") != "hygient.hygient-antigravity-autoaccept"]
extensions.append(ext_entry)

with open(extensions_json_path, "w") as f:
    json.dump(extensions, f, indent=2)

if os.path.exists(obsolete_json_path):
    try:
        with open(obsolete_json_path, "r") as f:
            obsolete = json.load(f)
        keys = [k for k in obsolete if "hygient.hygient-antigravity-autoaccept" in k]
        for k in keys:
            del obsolete[k]
        with open(obsolete_json_path, "w") as f:
            json.dump(obsolete, f)
    except Exception:
        pass

# Fix permissions
shutil.chown(dest_dir, user="frappe", group="frappe")
for root, dirs, files in os.walk(dest_dir):
    for d in dirs:
        shutil.chown(os.path.join(root, d), user="frappe", group="frappe")
    for f in files:
        shutil.chown(os.path.join(root, f), user="frappe", group="frappe")
shutil.chown(extensions_json_path, user="frappe", group="frappe")

print("ag-dev update complete!")
