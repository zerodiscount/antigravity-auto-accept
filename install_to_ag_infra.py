#!/usr/bin/env python3
import os
import zipfile
import json
import shutil
import time
import glob

version = json.load(open("/mnt/dev_ai_core/workspace/Dev/Tools/hygient-antigravity-autoaccept/package.json"))["version"]
vsix_path = "/home/antigravity/Workspace/Dev/Tools/hygient-antigravity-autoaccept/antigravity-auto-accept.vsix"

# 1. Local ag-infra deployment
servers = [
    "/home/antigravity/.antigravity-ide-server",
    "/home/antigravity/.antigravity-server",
]

for srv in servers:
    ext_base = os.path.join(srv, "extensions")
    if not os.path.exists(ext_base):
        continue
    
    dest_dir = os.path.join(ext_base, f"hygient.hygient-antigravity-autoaccept-{version}-universal")
    extensions_json_path = os.path.join(ext_base, "extensions.json")
    obsolete_json_path = os.path.join(ext_base, ".obsolete")

    print(f"[ag-infra] Cleaning old extensions in {ext_base}...")
    for old_dir in glob.glob(os.path.join(ext_base, "hygient.hygient-antigravity-autoaccept-*")):
        print(f"  Removing: {old_dir}")
        shutil.rmtree(old_dir, ignore_errors=True)

    print(f"[ag-infra] Installing v{version} to {dest_dir}...")
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

    # Update extensions.json
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

    # Clean .obsolete
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

    # Update machine settings
    settings_path = os.path.join(srv, "data", "Machine", "settings.json")
    if os.path.exists(os.path.dirname(settings_path)):
        settings = {}
        if os.path.exists(settings_path):
            try:
                with open(settings_path, "r") as f:
                    settings = json.load(f)
            except Exception:
                settings = {}
        settings["autoAcceptAgent.checkForUpdates"] = False
        settings["autoAcceptAgent.autoUpdate"] = False
        with open(settings_path, "w") as f:
            json.dump(settings, f, indent=4)

print("Local ag-infra update complete!")
