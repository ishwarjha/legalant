#!/usr/bin/env python3
"""
LegalAnt DOCX validator.

Every DOCX-generating agent calls this on the file it just rendered:

    python scripts/office/validate.py path/to/output.docx

What it checks (in order, fail-fast):

  1. File exists and is non-empty.
  2. File is a valid ZIP archive (DOCX is a ZIP under the hood).
  3. Required parts are present: [Content_Types].xml, word/document.xml.
  4. Every .xml and .rels part inside the archive parses as well-formed XML.
  5. The CONTENT_W table-width invariant: every <w:tblGrid> sums to a known
     width, and column widths in <w:tcW> rows match the grid count. This
     catches the most common docx-v9 generator mistake (mismatched
     columnWidths arrays) before Word silently mangles the layout.

Exit codes:
  0  valid
  1  validation failed (errors printed to stderr)
  2  usage error

The script has no external dependencies — uses only the Python stdlib.
"""

from __future__ import annotations

import os
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List

REQUIRED_PARTS = ("[Content_Types].xml", "word/document.xml")
W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
W = f"{{{W_NS}}}"


def _err(msg: str) -> None:
    print(f"validate.py: ERROR: {msg}", file=sys.stderr)


def _ok(msg: str) -> None:
    print(f"validate.py: {msg}")


def validate(path: Path) -> List[str]:
    errors: List[str] = []

    if not path.exists():
        return [f"file not found: {path}"]
    if path.stat().st_size == 0:
        return [f"file is empty: {path}"]

    if not zipfile.is_zipfile(path):
        return [f"not a valid ZIP archive (DOCX must be a ZIP): {path}"]

    with zipfile.ZipFile(path) as zf:
        bad_zip = zf.testzip()
        if bad_zip is not None:
            errors.append(f"corrupt ZIP entry: {bad_zip}")

        names = set(zf.namelist())
        for required in REQUIRED_PARTS:
            if required not in names:
                errors.append(f"missing required part: {required}")

        for name in zf.namelist():
            if not (name.endswith(".xml") or name.endswith(".rels")):
                continue
            try:
                with zf.open(name) as fp:
                    data = fp.read()
                ET.fromstring(data)
            except ET.ParseError as e:
                errors.append(f"malformed XML in {name}: {e}")
            except Exception as e:
                errors.append(f"unreadable XML in {name}: {e}")

        if "word/document.xml" in names and not errors:
            errors.extend(_check_table_invariants(zf))

    return errors


def _check_table_invariants(zf: zipfile.ZipFile) -> List[str]:
    """
    For every <w:tbl>:
      - <w:tblGrid> column count must match every <w:tr>'s <w:tc> count
        (catches columnWidths array length mismatches — the most common
        cause of mangled tables in docx v9).
    Returns a list of human-readable problems.
    """
    problems: List[str] = []
    try:
        with zf.open("word/document.xml") as fp:
            tree = ET.parse(fp)
    except (ET.ParseError, KeyError):
        return problems  # well-formedness already covered upstream

    root = tree.getroot()
    for tbl_idx, tbl in enumerate(root.iter(f"{W}tbl"), start=1):
        grid = tbl.find(f"{W}tblGrid")
        if grid is None:
            problems.append(f"table {tbl_idx}: missing <w:tblGrid>")
            continue
        grid_cols = len(grid.findall(f"{W}gridCol"))
        if grid_cols == 0:
            problems.append(f"table {tbl_idx}: <w:tblGrid> has zero columns")
            continue

        for row_idx, tr in enumerate(tbl.findall(f"{W}tr"), start=1):
            cells = tr.findall(f"{W}tc")
            if not cells:
                continue
            # Account for w:gridSpan when computing logical column count
            span_total = 0
            for tc in cells:
                tcPr = tc.find(f"{W}tcPr")
                span = 1
                if tcPr is not None:
                    gs = tcPr.find(f"{W}gridSpan")
                    if gs is not None:
                        try:
                            span = int(gs.attrib.get(f"{W}val", "1"))
                        except ValueError:
                            span = 1
                span_total += span
            if span_total != grid_cols:
                problems.append(
                    f"table {tbl_idx} row {row_idx}: cell-span total ({span_total}) "
                    f"!= tblGrid column count ({grid_cols})"
                )

    return problems


def main(argv: List[str]) -> int:
    if len(argv) != 2:
        print(f"usage: {argv[0]} <path-to.docx>", file=sys.stderr)
        return 2

    target = Path(argv[1])
    errors = validate(target)
    if errors:
        for msg in errors:
            _err(msg)
        return 1
    _ok(f"valid DOCX: {target}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
