import csv
import io
from typing import Any, List


def build_csv_bytes(headers: List[str], rows: List[List[Any]], empty_note: str | None = None) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(headers)
    if rows:
        for r in rows:
            writer.writerow(['' if v is None else v for v in r])
    elif empty_note:
        writer.writerow([empty_note])
    return buf.getvalue().encode('utf-8-sig')
