#!/usr/bin/env python3
import pathlib
import json

ROOT = pathlib.Path(__file__).parent.parent / "docs" / "articles"

def make_entry(dir_path: pathlib.Path):
    children = []
    for md in sorted(dir_path.glob("*.md")):
        name = md.stem  # filename without .md
        # Optionally you could prettify name, e.g., remove date prefix:
        display = name
        # remove leading date like 2025-03-28- if present
        if display[:10].count("-") >= 2 and display[0:4].isdigit():
            # crude strip: take after first dash after date
            parts = display.split("-", 3)
            if len(parts) == 4:
                display = parts[3]
        children.append({
            "text": display,
            "link": f"/articles/{dir_path.name}/{md.name}",
        })
    entry = {
        "text": dir_path.name,
        "link": f"/articles/{dir_path.name}/",
    }
    if children:
        entry["children"] = children
    return entry

def build():
    result = []
    if not ROOT.exists():
        print(f"ERROR: {ROOT} does not exist.")
        return
    for sub in sorted(ROOT.iterdir()):
        if sub.is_dir():
            result.append(make_entry(sub))
    return {"/articles/": result}

def main():
    structure = build()
    print(json.dumps(structure, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()