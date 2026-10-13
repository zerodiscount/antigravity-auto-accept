#!/usr/bin/env python3
"""
Deploy hygient-antigravity-autoaccept directly to CLE workstation desktop paths:
- /home/nsang/.antigravity/extensions
- /home/nsang/.antigravity-ide/extensions
Sets ownership to nsang:nsang and updates extensions.json.
"""

import os
import sys
import json
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
pkg = json.load(open(os.path.join(SCRIPT_DIR, "package.json")))
version = pkg["version"]
vsix_path = os.path.join(SCRIPT_DIR, "antigravity-auto-accept.vsix")

if not os.path.exists(vsix_path):
    print(f"Error: {vsix_path} not found.")
    sys.exit(1)

print(f"[cle] Streaming v{version} VSIX to CLE workstation...")

cmd_transfer = f"cat '{vsix_path}' | ssh -T -n cle \"sudo tee /tmp/antigravity-auto-accept.vsix > /dev/null\" ; echo EXIT_CODE=$?"
res = subprocess.run(cmd_transfer, shell=True, text=True, capture_output=True)
if res.returncode != 0:
    print(f"Transfer failed: {res.stderr}")
    sys.exit(1)

remote_script = """
import os
import zipfile
import json
import shutil
import glob

version = "{{VERSION}}"
vsix_path = "/tmp/antigravity-auto-accept.vsix"

targets = [
    "/home/nsang/.antigravity/extensions",
    "/home/nsang/.antigravity-ide/extensions",
]

for ext_base in targets:
    if not os.path.exists(ext_base):
        continue

    print(f"[cle] Processing {ext_base}...")

    # Remove old versions
    for pat in ["*autoaccept-*", "*auto-accept-*"]:
        for old_dir in glob.glob(os.path.join(ext_base, pat)):
            print(f"  Removing: {old_dir}")
            shutil.rmtree(old_dir, ignore_errors=True)

    dest_dir = os.path.join(ext_base, f"hygient.hygient-antigravity-autoaccept-{version}-universal")
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

    # Also symlink zerodiscount identifier so both IDs work
    zd_link = os.path.join(ext_base, f"zerodiscount.antigravity-auto-accept-{version}-universal")
    if os.path.exists(zd_link) or os.path.islink(zd_link):
        try: os.unlink(zd_link)
        except: shutil.rmtree(zd_link, ignore_errors=True)
    os.symlink(dest_dir, zd_link)

    # Update extensions.json
    extensions_json_path = os.path.join(ext_base, "extensions.json")
    if os.path.exists(extensions_json_path):
        try:
            with open(extensions_json_path, "r") as f:
                extensions = json.load(f)

            filtered = []
            for e in extensions:
                eid = e.get("identifier", {}).get("id", "").lower()
                if "autoaccept" not in eid and "auto-accept" not in eid:
                    filtered.append(e)

            filtered.append({
                "identifier": {"id": "hygient.hygient-antigravity-autoaccept"},
                "version": version,
                "location": {"$mid": 1, "path": dest_dir, "scheme": "file"},
                "relativeLocation": os.path.basename(dest_dir)
            })

            with open(extensions_json_path, "w") as f:
                json.dump(filtered, f, indent=2)
            print(f"[cle] Updated extensions.json in {ext_base}")
        except Exception as e:
            print(f"[cle] Error updating extensions.json in {ext_base}: {e}")

os.system("chown -R nsang:nsang /home/nsang/.antigravity /home/nsang/.antigravity-ide")
print("[cle] Complete! Deployed v" + version + " to CLE workstation.")
"""

# Stream remote script to CLE and execute
p = subprocess.Popen(
    ['ssh', '-T', 'cle', 'sudo python3 -'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)
stdout, stderr = p.communicate(input=remote_script.replace('{{VERSION}}', version))
print(stdout)
if p.returncode != 0:
    print(f"Installation failed: {stderr}")
    sys.exit(1)

print("[cle] Successfully deployed to CLE workstation!")
