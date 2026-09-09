#!/usr/bin/env python3
import os
import zipfile
import json
import shutil
import time

vsix_path = "/home/antigravity/Workspace/Dev/Tools/hygient-antigravity-autoaccept/hygient-antigravity-autoaccept-1.2.0.vsix"
servers = [
    "/home/antigravity/.antigravity-ide-server",
    "/home/antigravity/.antigravity-server",
]

for srv in servers:
    ext_base = os.path.join(srv, "extensions")
    if not os.path.exists(ext_base):
        continue
    
    dest_dir = os.path.join(ext_base, "hygient.hygient-antigravity-autoaccept-1.2.0-universal")
    old_dest_dir = os.path.join(ext_base, "hygient.hygient-antigravity-autoaccept-1.0.0-universal")
    extensions_json_path = os.path.join(ext_base, "extensions.json")
    obsolete_json_path = os.path.join(ext_base, ".obsolete")

    print(f"Installing to {dest_dir}...")

    # 1. Clean existing
    if os.path.exists(old_dest_dir):
        shutil.rmtree(old_dest_dir)
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
        "version": "1.2.0",
        "location": {
            "$mid": 1,
            "path": dest_dir,
            "scheme": "file"
        },
        "relativeLocation": "hygient.hygient-antigravity-autoaccept-1.2.0-universal",
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

    # 4. Clean .obsolete
    if os.path.exists(obsolete_json_path):
        try:
            with open(obsolete_json_path, "r") as f:
                obsolete = json.load(f)
            obsolete.pop("hygient.hygient-antigravity-autoaccept-1.0.0-universal", None)
            obsolete.pop("hygient.hygient-antigravity-autoaccept-1.2.0-universal", None)
            with open(obsolete_json_path, "w") as f:
                json.dump(obsolete, f)
        except Exception as e:
            print(f"Notice: .obsolete cleanup: {e}")

    # 5. Ensure Machine settings.json has auto-approval flags
    settings_path = os.path.join(srv, "data", "Machine", "settings.json")
    if os.path.exists(os.path.dirname(settings_path)):
        settings = {}
        if os.path.exists(settings_path):
            try:
                with open(settings_path, "r") as f:
                    settings = json.load(f)
            except Exception:
                settings = {}
        settings["chat.tools.global.autoApprove"] = True
        settings["chat.tools.edits.autoApprove"] = True
        settings["chat.tools.terminal.enableAutoApprove"] = True
        settings["chat.tools.terminal.autoApprove"] = True
        settings["chat.tools.run_command.autoApprove"] = True
        settings["chat.tools.default_api:run_command.autoApprove"] = True
        settings["chat.tools.write_to_file.autoApprove"] = True
        settings["chat.tools.replace_file_content.autoApprove"] = True
        settings["chat.tools.multi_replace_file_content.autoApprove"] = True
        settings["chat.agent.autoApprove"] = True
        with open(settings_path, "w") as f:
            json.dump(settings, f, indent=4)
        print(f"Updated Machine settings at {settings_path}")

print("Successfully deployed Hygient AutoAccept v1.2.0 locally in ag-infra!")
