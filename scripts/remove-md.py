#!/usr/bin/env python3
import pathlib
import argparse
import sys

def strip_frontmatter(text: str) -> (str, bool):
    """
    如果开头有以 --- 开始并在之后出现另一个 --- 的 frontmatter，
    删除它并返回修改后的文本和是否有修改。
    """
    if not text.startswith("---"):
        return text, False
    # 找第二个 --- 的位置（应该是在新行独立一行）
    parts = text.split("\n")
    # 第一行是 '---', 找下一个单独的 '---'
    for idx in range(1, len(parts)):
        if parts[idx].strip() == "---":
            # 删除从 line 0 到 idx（包含），剩下的重新拼接
            new_lines = parts[idx+1 :]
            # 如果下一行是空行，可以保留，避免首行粘连
            new_text = "\n".join(new_lines).lstrip("\n")
            # Preserve trailing newline if original had it
            if text.endswith("\n") and not new_text.endswith("\n"):
                new_text += "\n"
            return new_text, True
    return text, False  # 没找到闭合的 ---，不动

def process_file(path: pathlib.Path, dry_run: bool=False) -> bool:
    try:
        orig = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        print(f"[WARN] Skipping non-utf8 file: {path}")
        return False
    new, changed = strip_frontmatter(orig)
    if changed:
        if dry_run:
            print(f"[DRY RUN] Would strip frontmatter from: {path}")
        else:
            path.write_text(new, encoding="utf-8")
            print(f"[UPDATED] Stripped frontmatter from: {path}")
    return changed

def main():
    parser = argparse.ArgumentParser(description="Strip leading YAML frontmatter from markdown files in docs/articles")
    parser.add_argument("--dry-run", "-n", action="store_true", help="Don't write changes, just show what would be done")
    parser.add_argument("--root", "-r", type=pathlib.Path, default=pathlib.Path(__file__).parent.parent / "docs" / "articles", help="Root directory to traverse")
    args = parser.parse_args()

    if not args.root.exists():
        print(f"ERROR: root path does not exist: {args.root}", file=sys.stderr)
        sys.exit(1)

    md_files = list(args.root.rglob("*.md"))
    if not md_files:
        print(f"No markdown files found under {args.root}")
        return

    total = 0
    modified = 0
    for fp in md_files:
        total += 1
        if process_file(fp, dry_run=args.dry_run):
            modified += 1

    print(f"\nProcessed {total} files, modified {modified} files{' (dry run)' if args.dry_run else ''}.")

if __name__ == "__main__":
    main()