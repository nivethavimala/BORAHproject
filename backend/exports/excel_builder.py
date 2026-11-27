import io
import subprocess
import sys
from typing import Any, Dict, List, Sequence


def _ensure_openpyxl() -> Any:
    try:
        from openpyxl import Workbook
        from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
        from openpyxl.utils import get_column_letter

        return Workbook, Alignment, Border, Font, PatternFill, Side, get_column_letter
    except ImportError:
        import time

        for _ in range(15):
            time.sleep(1)
            try:
                from openpyxl import Workbook
                from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
                from openpyxl.utils import get_column_letter

                return Workbook, Alignment, Border, Font, PatternFill, Side, get_column_letter
            except ImportError:
                pass

        subprocess.run(
            [sys.executable, '-m', 'pip', 'install', '--root-user-action=ignore', '--no-cache-dir', '-q', 'openpyxl'],
            check=True,
        )
        from openpyxl import Workbook
        from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
        from openpyxl.utils import get_column_letter

        return Workbook, Alignment, Border, Font, PatternFill, Side, get_column_letter


def build_excel_workbook(
    report_title: str,
    subtitle: str,
    user_name: str,
    sheets: List[Dict[str, Any]],
) -> bytes:
    """
    Each sheet dict:
      {
        "name": str (<=31 chars),
        "headers": list[str],
        "rows": list[list[Any]],
        "summary_items": optional list[tuple[str, Any]],
        "empty_text": optional str
      }
    """
    Workbook, Alignment, Border, Font, PatternFill, Side, get_column_letter = _ensure_openpyxl()
    wb = Workbook()
    first = True

    header_fill = PatternFill(start_color='3B5D50', end_color='3B5D50', fill_type='solid')
    header_font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
    title_font = Font(name='Calibri', size=14, bold=True, color='1E293B')
    sub_font = Font(name='Calibri', size=10, italic=True, color='475569')
    summary_fill = PatternFill(start_color='F3EFE6', end_color='F3EFE6', fill_type='solid')
    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1'),
    )

    for sheet_spec in sheets:
        sheet_name = (sheet_spec.get('name') or 'Sheet1')[:31]
        ws = wb.active if first else wb.create_sheet(title=sheet_name)
        ws.title = sheet_name
        first = False

        ws['A1'] = f'BORAH — {report_title}'
        ws['A1'].font = title_font
        ws['A2'] = f'{subtitle} | User: {user_name}'
        ws['A2'].font = sub_font

        row_idx = 4
        summary_items: Sequence[tuple[str, Any]] = sheet_spec.get('summary_items') or []
        if summary_items:
            for label, val in summary_items:
                c1 = ws.cell(row=row_idx, column=1, value=str(label))
                c2 = ws.cell(row=row_idx, column=2, value=val)
                c1.font = Font(name='Calibri', size=10, bold=True, color='334155')
                c2.font = Font(name='Calibri', size=10, color='0F172A')
                c1.fill = summary_fill
                c2.fill = summary_fill
                c1.border = thin_border
                c2.border = thin_border
                row_idx += 1
            row_idx += 1

        headers: List[str] = sheet_spec.get('headers') or []
        rows: List[List[Any]] = sheet_spec.get('rows') or []

        for col_i, h in enumerate(headers, start=1):
            cell = ws.cell(row=row_idx, column=col_i, value=h)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)
            cell.border = thin_border
        ws.row_dimensions[row_idx].height = 22
        row_idx += 1

        if not rows:
            empty_msg = sheet_spec.get('empty_text') or 'No records found for the selected criteria.'
            c = ws.cell(row=row_idx, column=1, value=empty_msg)
            c.font = Font(name='Calibri', size=10, italic=True, color='64748B')
        else:
            for r in rows:
                for col_i, val in enumerate(r, start=1):
                    cell = ws.cell(row=row_idx, column=col_i, value=val)
                    cell.font = Font(name='Calibri', size=10, color='1E293B')
                    cell.alignment = Alignment(vertical='top', wrap_text=True)
                    cell.border = thin_border
                row_idx += 1

        # Auto-adjust column widths cleanly
        for col_i in range(1, max(len(headers), 2) + 1):
            col_letter = get_column_letter(col_i)
            max_len = 12
            for cell in ws[col_letter]:
                if cell.row <= 2:
                    continue
                val_str = str(cell.value or '')
                longest_line = max((len(line) for line in val_str.splitlines()), default=0)
                if longest_line > max_len:
                    max_len = longest_line
            ws.column_dimensions[col_letter].width = min(max_len + 4, 48)

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
