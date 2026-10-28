import type { ReportFile } from '@atp/core';

/** Browser download of a Blob under the given filename. */
export function download({ blob, filename }: ReportFile) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Whether this device can hand a file to the share sheet (WhatsApp, email…). */
export function canShareFiles(): boolean {
  if (typeof navigator.canShare !== 'function') return false;
  try {
    return navigator.canShare({
      files: [new File([''], 'probe.pdf', { type: 'application/pdf' })],
    });
  } catch {
    return false;
  }
}

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/** Share targets (WhatsApp, Gmail) need an exact MIME type; derive it from the extension. */
const mimeFor = (file: ReportFile) =>
  MIME[file.filename.split('.').pop()?.toLowerCase() ?? ''] ??
  (file.blob.type || 'application/octet-stream');

/**
 * F-23: share through the device share sheet, else download.
 * Returns 'shared' | 'downloaded' | 'cancelled'.
 */
export async function shareOrDownload(
  file: ReportFile,
  title: string,
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const f = new File([file.blob], file.filename, { type: mimeFor(file) });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [f] })) {
    try {
      await navigator.share({ files: [f], title });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  download(file);
  return 'downloaded';
}
