#!/usr/bin/env python3
"""
Deploy hygient-antigravity-autoaccept directly to ag-dev container on SJC:
- /home/frappe/.antigravity-ide-server/extensions
- /home/frappe/.antigravity-server/extensions
Sets ownership to frappe:frappe and updates extensions.json.
"""

import os
import sys
import json
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
pkg = json.load(open(os.path.join(SCRIPT_DIR, "package.json")))
version = pkg["version"]
publisher = pkg.get("publisher", "zerodiscount")
ext_name = pkg.get("name", "antigravity-auto-accept")
ext_id = f"{publisher}.{ext_name}"
vsix_path = os.path.join(SCRIPT_DIR, "antigravity-auto-accept.vsix")

if not os.path.exists(vsix_path):
    print(f"Error: {vsix_path} not found.")
    sys.exit(1)

# Check if running locally inside ag-dev
is_local = os.path.exists("/home/frappe/.antigravity-ide-server") or os.path.exists("/home/frappe/.antigravity-server")

remote_script = """
import os
import zipfile
import json
import shutil
import glob
import time

version = "{{VERSION}}"
publisher = "{{PUBLISHER}}"
ext_name = "{{EXT_NAME}}"
ext_id = f"{publisher}.{ext_name}"
vsix_path = "/tmp/antigravity-auto-accept.vsix"

servers = [
    "/home/frappe/.antigravity-ide-server",
    "/home/frappe/.antigravity-server",
]

for srv in servers:
    ext_base = os.path.join(srv, "extensions")
    if not os.path.exists(ext_base):
        continue

    print(f"[ag-dev] Processing {ext_base}...")

    # Remove old versions
    for pat in ["*autoaccept-*", "*auto-accept-*", f"{ext_id}-*"]:
        for old_dir in glob.glob(os.path.join(ext_base, pat)):
            print(f"  Removing: {old_dir}")
            shutil.rmtree(old_dir, ignore_errors=True)

    dest_dir = os.path.join(ext_base, f"{ext_id}-{version}-universal")
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

    # Also symlink hygient identifier so both work
    hy_link = os.path.join(ext_base, f"hygient.hygient-antigravity-autoaccept-{version}-universal")
    if os.path.exists(hy_link) or os.path.islink(hy_link):
        try: os.unlink(hy_link)
        except: shutil.rmtree(hy_link, ignore_errors=True)
    os.symlink(dest_dir, hy_link)

    # Update extensions.json
    extensions_json_path = os.path.join(ext_base, "extensions.json")
    extensions = []
    if os.path.exists(extensions_json_path):
        try:
            with open(extensions_json_path, "r") as f:
                extensions = json.load(f)
        except Exception:
            extensions = []
    extensions = [e for e in extensions if "autoaccept" not in e.get("identifier", {}).get("id", "").lower() and "auto-accept" not in e.get("identifier", {}).get("id", "").lower()]

    ext_entry = {
        "identifier": {
            "id": ext_id
        },
        "version": version,
        "location": {
            "$mid": 1,
            "path": dest_dir,
            "scheme": "file"
        },
        "relativeLocation": f"{ext_id}-{version}-universal",
        "metadata": {
            "installedTimestamp": int(time.time() * 1000),
            "pinned": False,
            "source": "custom",
            "publisherId": publisher,
            "publisherDisplayName": "ZeroDiscount",
            "targetPlatform": "universal",
            "updated": False,
            "private": True,
            "isPreReleaseVersion": False,
            "hasPreReleaseVersion": False
        }
    }
    extensions.append(ext_entry)

    with open(extensions_json_path, "w") as f:
        json.dump(extensions, f, indent=2)

    # Clean .obsolete
    obsolete_json_path = os.path.join(ext_base, ".obsolete")
    if os.path.exists(obsolete_json_path):
        try:
            with open(obsolete_json_path, "r") as f:
                obsolete = json.load(f)
            keys = [k for k in obsolete if "autoaccept" in k.lower() or "auto-accept" in k.lower()]
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
        settings.pop("autoAcceptAgent.checkForUpdates", None)
        settings.pop("autoAcceptAgent.autoUpdate", None)
        settings.pop("autoAcceptAgent.updateServerUrl", None)
        with open(settings_path, "w") as f:
            json.dump(settings, f, indent=4)

os.system("chown -R frappe:frappe /home/frappe/.antigravity-ide-server /home/frappe/.antigravity-server 2>/dev/null")
print(f"[ag-dev] Successfully installed v{version} on ag-dev!")
"""

if is_local:
    # Run directly locally
    code = remote_script.replace("{{VERSION}}", version).replace("{{PUBLISHER}}", publisher).replace("{{EXT_NAME}}", ext_name)
    exec(code)
else:
    # Remote execution into sjc ag-dev container
    print(f"[ag-dev] Streaming v{version} VSIX to sjc ag-dev container...")
    cmd_transfer = f"cat '{vsix_path}' | ssh -T sjc \"sudo lxc exec ag-dev -- tee /tmp/antigravity-auto-accept.vsix > /dev/null\" ; echo EXIT_CODE=$?"
    res = subprocess.run(cmd_transfer, shell=True, text=True, capture_output=True)
    if res.returncode != 0 or "EXIT_CODE=0" not in res.stdout:
        print(f"Transfer failed: {res.stderr}\n{res.stdout}")
        sys.exit(1)

    print(f"[ag-dev] Executing installer inside ag-dev container...")
    code = remote_script.replace("{{VERSION}}", version).replace("{{PUBLISHER}}", publisher).replace("{{EXT_NAME}}", ext_name)
    p = subprocess.Popen(
        ['ssh', '-T', 'sjc', 'sudo lxc exec ag-dev -- python3 -'],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    stdout, stderr = p.communicate(input=code)
    print(stdout)
    if p.returncode != 0:
        print(f"Installation failed: {stderr}")
        sys.exit(1)

print("[ag-dev] Successfully deployed to ag-dev container!")
