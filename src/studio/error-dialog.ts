export function showDecodeErrorDialog(fileName: string): void {
  const backdrop = document.createElement('div');
  backdrop.className = 'popup-backdrop';

  const dialog = document.createElement('div');
  dialog.className = 'popup';
  dialog.id = 'decode-error-dialog';

  const escapedFileName = escapeHtml(fileName);

  dialog.innerHTML = `
    <div>
      <h3>Unable to Load Media</h3>
      <p>Failed to decode <strong>${escapedFileName}</strong>. The file may be corrupted, in an unsupported format, or not a valid media file.</p>
      <button type="button" class="action-button primary" id="decode-error-ok">OK</button>
    </div>
  `;

  const close = (): void => {
    backdrop.remove();
    dialog.remove();
  };

  dialog.querySelector('#decode-error-ok')?.addEventListener('click', close);
  backdrop.addEventListener('click', close);

  document.body.appendChild(backdrop);
  document.body.appendChild(dialog);
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
