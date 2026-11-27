import io
import subprocess
import sys
from typing import Any, Dict, List, Sequence


def _ensure_reportlab() -> Any:
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import mm
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

        return colors, A4, landscape, ParagraphStyle, getSampleStyleSheet, mm, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    except ImportError:
        import time

        for _ in range(15):
            time.sleep(1)
            try:
                from reportlab.lib import colors
                from reportlab.lib.pagesizes import A4, landscape
                from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
                from reportlab.lib.units import mm
                from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

                return colors, A4, landscape, ParagraphStyle, getSampleStyleSheet, mm, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
            except ImportError:
                pass

        subprocess.run(
            [sys.executable, '-m', 'pip', 'install', '--root-user-action=ignore', '--no-cache-dir', '-q', 'reportlab', 'pillow'],
            check=True,
        )
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import mm
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

        return colors, A4, landscape, ParagraphStyle, getSampleStyleSheet, mm, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


class _NumberedCanvas:
    pass


def _page_footer(canvas_obj: Any, doc: Any) -> None:
    from reportlab.lib import colors
    from reportlab.lib.units import mm

    canvas_obj.saveState()
    width, _ = doc.pagesize
    canvas_obj.setFont('Helvetica', 8)
    canvas_obj.setFillColor(colors.HexColor('#64748B'))
    canvas_obj.drawString(16 * mm, 10 * mm, 'BORAH — Personal Activity, Productivity & Life Management Platform')
    canvas_obj.drawRightString(width - 16 * mm, 10 * mm, f'Page {doc.page}')
    canvas_obj.restoreState()


def build_pdf_report(
    title: str,
    subtitle: str,
    user_name: str,
    summary_items: Sequence[tuple[str, str]],
    sections: List[Dict[str, Any]],
    landscape_mode: bool = False,
) -> bytes:
    """
    sections item shape:
      {
        "heading": str,
        "headers": list[str],
        "rows": list[list[str]],
        "col_widths": optional list[float] (fractional weights),
        "empty_text": optional str
      }
    """
    (
        colors,
        A4,
        landscape,
        ParagraphStyle,
        getSampleStyleSheet,
        mm,
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    ) = _ensure_reportlab()

    buf = io.BytesIO()
    page_size = landscape(A4) if landscape_mode else A4
    doc = SimpleDocTemplate(
        buf,
        pagesize=page_size,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=18 * mm,
        title=title,
        author='BORAH Workspace',
    )

    styles = getSampleStyleSheet()
    brand_style = ParagraphStyle(
        'BorahBrand',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=colors.HexColor('#5F8D7B'),
        spaceAfter=2,
    )
    title_style = ParagraphStyle(
        'BorahTitle',
        parent=styles['Title'],
        fontName='Helvetica-Bold',
        fontSize=17,
        leading=21,
        textColor=colors.HexColor('#1E293B'),
        alignment=0,
        spaceAfter=3,
    )
    meta_style = ParagraphStyle(
        'BorahMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=colors.HexColor('#475569'),
        spaceAfter=8,
    )
    sec_heading_style = ParagraphStyle(
        'BorahSecHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#334155'),
        spaceBefore=8,
        spaceAfter=4,
    )
    cell_style = ParagraphStyle(
        'BorahCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.3,
        leading=11,
        textColor=colors.HexColor('#1E293B'),
    )
    hdr_style = ParagraphStyle(
        'BorahHdr',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
    )
    empty_style = ParagraphStyle(
        'BorahEmpty',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        textColor=colors.HexColor('#64748B'),
        spaceBefore=4,
        spaceAfter=8,
    )

    usable_width = page_size[0] - 32 * mm
    story: List[Any] = [
        Paragraph('BORAH WORKSPACE REPORT', brand_style),
        Paragraph(_esc(title), title_style),
        Paragraph(_esc(f'{subtitle}  |  Prepared for: {user_name}'), meta_style),
    ]

    if summary_items:
        cols = min(4, len(summary_items))
        sum_rows = []
        row_buf = []
        for label, val in summary_items:
            row_buf.append(Paragraph(f'<font size="7.5" color="#64748B">{_esc(label)}</font><br/><b>{_esc(val)}</b>', cell_style))
            if len(row_buf) == cols:
                sum_rows.append(row_buf)
                row_buf = []
        if row_buf:
            while len(row_buf) < cols:
                row_buf.append(Paragraph('', cell_style))
            sum_rows.append(row_buf)

        sum_tbl = Table(sum_rows, colWidths=[usable_width / cols] * cols)
        sum_tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8F6F1')),
            ('BOX', (0, 0), (-1, -1), 0.6, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(sum_tbl)
        story.append(Spacer(1, 8))

    for sec in sections:
        heading = sec.get('heading')
        if heading:
            story.append(Paragraph(_esc(heading), sec_heading_style))
        headers: List[str] = sec.get('headers') or []
        rows: List[List[str]] = sec.get('rows') or []
        if not rows:
            story.append(Paragraph(_esc(sec.get('empty_text') or 'No records found for the selected criteria.'), empty_style))
            continue

        weights = sec.get('weights')
        if weights and len(weights) == len(headers):
            total_w = sum(weights) or 1
            col_widths = [(w / total_w) * usable_width for w in weights]
        else:
            col_widths = [usable_width / max(1, len(headers))] * len(headers)

        table_data = [[Paragraph(_esc(h), hdr_style) for h in headers]]
        for r in rows:
            table_data.append([Paragraph(_esc(str(cell or '—')), cell_style) for cell in r])

        tbl = Table(table_data, colWidths=col_widths, repeatRows=1)
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3B5D50')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#FAF8F4')]),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.35, colors.HexColor('#E2E8F0')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(tbl)
        story.append(Spacer(1, 8))

    doc.build(story, onFirstPage=_page_footer, onLaterPages=_page_footer)
    return buf.getvalue()


def _esc(text: str) -> str:
    return (
        (text or '')
        .replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
        .replace('\n', '<br/>')
    )
