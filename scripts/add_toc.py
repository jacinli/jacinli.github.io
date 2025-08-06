#!/usr/bin/env python3
import pathlib
import argparse
import sys

TOC_HEADER = "# 目录"
TOC_MARKER = "[[toc]]"


def add_toc(lines):
    """
    在文件开头添加 TOC_HEADER, 空行, TOC_MARKER, 空行
    如果已经存在 "# 目录"，则跳过
    返回新的行列表和是否添加标志
    """
    for i, line in enumerate(lines):
        if line.strip():
            if line.strip() == TOC_HEADER:
                return lines, False
            break
    header = [TOC_HEADER + "\n", "\n", TOC_MARKER + "\n", "\n"]
    return header + lines, True


def shift_headers(lines):
    """
    将所有一级、二级、三级等标题增加一级
    忽略代码块内部内容（``` fence）
    但跳过 TOC_HEADER 本身，不对它进行提升
    返回新的行列表和修改标志
    """
    in_code = False
    changed = False
    new_lines = []
    for line in lines:
        stripped = line.lstrip()
        # 检测代码块围栏
        if stripped.startswith("```"):
            in_code = not in_code
            new_lines.append(line)
            continue
        # 仅在非代码块且以 '#' 开头且不是目录标题时提升级别
        if not in_code and stripped.startswith("#") and stripped.strip() != TOC_HEADER:
            prefix = line[:len(line) - len(stripped)]
            hashes, rest = (stripped.split(" ", 1) if " " in stripped else (stripped, ""))
            new_hashes = "#" + hashes
            # 保留原有缩进和内容
            new_line = prefix + new_hashes + (" " + rest if rest else "")
            # 确保末尾换行
            if not new_line.endswith("\n"):
                new_line += "\n"
            new_lines.append(new_line)
            changed = True
        else:
            new_lines.append(line)
    return new_lines, changed


def process_file(path: pathlib.Path, dry_run: bool=False) -> bool:
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        print(f"[WARN] Skipping non-utf8 file: {path}")
        return False
    lines = text.splitlines(keepends=True)

    lines, toc_added = add_toc(lines)
    lines, headers_changed = shift_headers(lines)

    if toc_added or headers_changed:
        if dry_run:
            print(f"[DRY RUN] Would update: {path}")
        else:
            path.write_text(''.join(lines), encoding="utf-8")
            print(f"[UPDATED] {path} (TOC added: {toc_added}, headers shifted: {headers_changed})")
        return True
    return False


def main():
    parser = argparse.ArgumentParser(
        description="在所有 Markdown 文件开头插入目录并提升所有标题级别"
    )
    parser.add_argument(
        "--dry-run", "-n",
        action="store_true",
        help="仅显示将做的操作，不写入文件"
    )
    parser.add_argument(
        "--root", "-r",
        type=pathlib.Path,
        default=pathlib.Path(__file__).parent.parent / "docs" / "articles",
        help="根目录，递归查找 .md 文件（默认项目根的 docs/articles 目录)"
    )
    args = parser.parse_args()

    if not args.root.exists():
        print(f"ERROR: 根目录不存在: {args.root}", file=sys.stderr)
        sys.exit(1)

    md_files = list(args.root.rglob("*.md"))
    if not md_files:
        print(f"未在 {args.root} 下找到任何 .md 文件")
        return

    total = 0
    modified = 0
    for fp in md_files:
        total += 1
        if process_file(fp, dry_run=args.dry_run):
            modified += 1

    print(
        f"\n处理 {total} 个文件，更新 {modified} 个文件" +
        (" (dry run)" if args.dry_run else "")
    )


if __name__ == "__main__":
    main()
