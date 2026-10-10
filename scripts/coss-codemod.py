"""COSS pilot codemod — Phase 5/7 mechanical renames.

Usage:
  python3 scripts/coss-codemod.py --check   # report only, no writes
  python3 scripts/coss-codemod.py --apply   # rewrite files in place

Scope: apps/system/src + packages/drive/src (override with paths).
NOT a test. Delete after the pilot gate passes (Phase 8).

Rules are identifier-only swaps verified safe against the dual export
maps of @dg/ui and @dg/ui-coss (see Phase 5 report). Structural
Content->Popup/Panel restructures, toast, Item*, FieldGroup,
TableWrapper, InputGroupButton, AlertDialogAction and Select `items`
are WARNINGS for hand work in Phase 7 — never auto-edited.
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DEFAULT_ROOTS = [REPO / "apps/system/src", REPO / "packages/drive/src"]

# (pattern, replacement) applied in order. \b guards keep local names
# like SelectedItem, Items, SliderRow, CardList untouched.
IMPORT_RULES: list[tuple[str, str]] = [
    # Specific file moves first, then the generic prefix switch.
    ('@dg/ui/components/button-group', '@dg/ui-coss/components/group'),
    ('@dg/ui/components/dropdown-menu', '@dg/ui-coss/components/menu'),
    ('@dg/ui/components/hover-card', '@dg/ui-coss/components/preview-card'),
    ('@dg/ui/components/input-otp', '@dg/ui-coss/components/otp-field'),
    ('@dg/ui/', '@dg/ui-coss/'),
]

# Identifier rules fire only when the file switched the corresponding
# source module (old or new path) in the same run — this keeps batches
# scoped: a batch-1 file that also uses DialogContent keeps its dialog
# import (and identifiers) untouched until the dialog batch.
IDENT_RULE_MODULES: list[tuple[str, set[str]]] = [
    (r"\bDropdownMenu", {"components/dropdown-menu", "components/menu"}),
    (r"\bAlertDialogCancel\b", {"components/alert-dialog"}),
    (r"\bContextMenuContent\b", {"components/context-menu"}),
    (r"\bComboboxContent\b", {"components/combobox"}),
    (r"\bHoverCard", {"components/hover-card", "components/preview-card"}),
    (r"\bInputOTP", {"components/input-otp", "components/otp-field"}),
]

IDENT_RULES: list[tuple[str, str]] = [
    # DropdownMenu* -> Menu* (new package aliases the old names, but
    # per Q5 we do not rely on aliases). Longest names first.
    (r"\bDropdownMenuSubContent\b", "MenuSubPopup"),
    (r"\bDropdownMenuSubTrigger\b", "MenuSubTrigger"),
    (r"\bDropdownMenuCheckboxItem\b", "MenuCheckboxItem"),
    (r"\bDropdownMenuRadioGroup\b", "MenuRadioGroup"),
    (r"\bDropdownMenuRadioItem\b", "MenuRadioItem"),
    (r"\bDropdownMenuSeparator\b", "MenuSeparator"),
    (r"\bDropdownMenuContent\b", "MenuPopup"),
    (r"\bDropdownMenuTrigger\b", "MenuTrigger"),
    (r"\bDropdownMenuGroup\b", "MenuGroup"),
    (r"\bDropdownMenuLabel\b", "MenuGroupLabel"),
    (r"\bDropdownMenuItem\b", "MenuItem"),
    (r"\bDropdownMenuPortal\b", "MenuPortal"),
    (r"\bDropdownMenuShortcut\b", "MenuShortcut"),
    (r"\bDropdownMenuSub\b", "MenuSub"),
    (r"\bDropdownMenu\b", "Menu"),
    # Same-structure swaps (composition verified against both packages).
    (r"\bAlertDialogCancel\b", "AlertDialogClose"),
    (r"\bContextMenuContent\b", "ContextMenuPopup"),
    (r"\bComboboxContent\b", "ComboboxPopup"),
    # Zero-hit safety net (PLAN checklist). Warned if ever found.
    (r"\bHoverCardContent\b", "PreviewCardPopup"),
    (r"\bHoverCardTrigger\b", "PreviewCardTrigger"),
    (r"\bHoverCard\b", "PreviewCard"),
    (r"\bInputOTPSlot\b", "OTPFieldInput"),
    (r"\bInputOTPSeparator\b", "OTPFieldSeparator"),
    (r"\bInputOTP\b", "OTPField"),
]

# (regex, message) — hand work in Phase 7, never auto-edited.
WARN_RULES: list[tuple[str, str]] = [
    (r"\bAlertDialogAction\b", "AlertDialogAction->Close needs review: old Action is a plain Button (no auto-close), new Close closes. Check onClick flow."),
    (r"\bFieldGroup\b", "FieldGroup has no COSS export: map to Fieldset/plain div per site."),
    (r"\bTableWrapper\b", "TableWrapper has no COSS export: map to Card/plain div per site."),
    (r"\bInputGroupButton\b", "InputGroupButton has no COSS export: map to Button in InputGroupAddon per site."),
    (r"<Item[\s/>]|\bItem(Actions?|Content|Description|Footer|Group|Header|Icon|Media|Separator|Title)\b", "Item* has no COSS equivalent: rewrite to Group per site (ItemAction(s)/ItemIcon/ItemContent/ItemTitle)."),
    (r"<Select(?![A-Za-z])", "Select without items= prop needs hand-added items array (SSR) + alignItemWithTrigger review."),
    (r"\basChild\b", "asChild found: convert to render={<.../>} by hand (0 hits expected)."),
    (r"\bAccordion\b.*type=|\bToggleGroup\b.*type=", "Accordion/ToggleGroup type= prop needs multiple={} + array defaultValue conversion."),
    (r"\bSlider\b", "Slider usage: verify value={[]} array + onValueChange number[] (multi-thumb)."),
]

PROTECTED = ("routeTree.gen.ts", "convex/_generated")
SKIP_IMPORTS = ("@dg/ui/components/sonner", 'from "sonner"', "components/color-picker")


@dataclass
class Result:
    path: Path
    edits: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    skipped: str = ""


def in_scope(mod: str, scope: set[str] | None) -> bool:
    """mod is the subpath after @dg/ui/ (e.g. components/button)."""
    if scope is None:
        return True
    return any(mod == tok or mod.endswith("/" + tok) for tok in scope)


def rewrite_import_line(line: str, scope: set[str] | None) -> tuple[str, str]:
    """Rewrite one @dg/ui import path if in scope. Returns (line, edit-note)."""
    m = re.search(r"@dg/ui/([^\"']+)", line)
    if not m:
        return line, ""
    mod = m.group(1)
    if not in_scope(mod, scope):
        return line, ""
    new = "@dg/ui/" + mod
    for pat, rep in IMPORT_RULES:
        if pat in new:
            new = new.replace(pat, rep)
            return line.replace(m.group(0), new), f"import {pat} -> {rep}"
    return line, ""


def process(
    text: str, apply: bool, scope: set[str] | None = None
) -> tuple[str, list[str], list[str], str]:
    edits: list[str] = []
    warnings: list[str] = []
    for imp in SKIP_IMPORTS:
        if imp in text:
            return text, [], [], f"skip: protected import ({imp}) — hand work Phase 7.6/8"
    lines = text.split("\n")
    switched: set[str] = set()
    for i, line in enumerate(lines):
        if "@dg/ui/" not in line:
            continue
        new_line, note = rewrite_import_line(line, scope)
        if new_line != line:
            m = re.search(r"@dg/ui/([^\"']+)", line)
            if m:
                switched.add(m.group(1))
            lines[i] = new_line
            edits.append(note)
    out = "\n".join(lines)
    for pat, rep in IDENT_RULES:
        mods = next((m for p, m in IDENT_RULE_MODULES if re.match(p, pat[2:])), None)
        if mods is not None and not (switched & mods):
            continue
        out, n = re.subn(pat, rep, out)
        if n:
            edits.append(f"{pat} -> {rep} x{n}")
    for pat, msg in WARN_RULES:
        if re.search(pat, out):
            warnings.append(msg)
    return out, edits, warnings, ""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="report only (default)")
    ap.add_argument("--apply", action="store_true", help="rewrite files in place")
    ap.add_argument(
        "--components",
        default="",
        help="comma-separated module scope (e.g. button,badge,lib/utils); "
        "only matching @dg/ui import lines are switched",
    )
    ap.add_argument("roots", nargs="*", default=[str(r) for r in DEFAULT_ROOTS])
    args = ap.parse_args()
    apply = args.apply and not args.check
    scope = set(args.components.split(",")) if args.components else None
    if args.apply and args.check:
        print("pick one of --check / --apply", file=sys.stderr)
        return 2

    results: list[Result] = []
    for root in args.roots:
        for path in sorted(Path(root).rglob("*")):
            if not path.is_file() or path.suffix not in (".tsx", ".ts"):
                continue
            if "routeTree.gen.ts" in str(path) or "convex/_generated" in str(path):
                continue
            text = path.read_text()
            out, edits, warnings, skipped = process(text, apply, scope)
            if edits or warnings or skipped:
                results.append(Result(path, edits, warnings, skipped))
            if apply and edits and out != text:
                path.write_text(out)

    n_edits = sum(len(r.edits) for r in results)
    n_warn = sum(len(r.warnings) for r in results)
    for r in results:
        rel = r.path.relative_to(REPO) if r.path.is_relative_to(REPO) else r.path
        if r.skipped:
            print(f"SKIP {rel}: {r.skipped}")
            continue
        print(f"{'APPLY' if apply else 'WOULD'} {rel}")
        for e in r.edits:
            print(f"    edit: {e}")
        for w in r.warnings:
            print(f"    warn: {w}")
    print(f"--- {len(results)} files touched, {n_edits} edit rules hit, {n_warn} warnings ---")
    print("mode:", "APPLY" if apply else "CHECK (no writes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
