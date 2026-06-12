import { describe, expect, test, beforeEach, afterEach } from '@jest/globals';

const { showDecodeErrorDialog } = await import('@/studio/error-dialog');

describe('showDecodeErrorDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('should show dialog with filename and OK button', () => {
    showDecodeErrorDialog('broken.mp4');

    const dialog = document.getElementById('decode-error-dialog');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain('broken.mp4');
    expect(document.getElementById('decode-error-ok')).not.toBeNull();
    expect(document.querySelector('.popup-backdrop')).not.toBeNull();
  });

  test('should escape HTML in filename', () => {
    showDecodeErrorDialog('<script>alert(1)</script>.mp4');

    const dialog = document.getElementById('decode-error-dialog');
    expect(dialog?.innerHTML).not.toContain('<script>');
    expect(dialog?.textContent).toContain('<script>alert(1)</script>.mp4');
  });

  test('should close dialog when OK is clicked', () => {
    showDecodeErrorDialog('broken.mp4');

    const okButton = document.getElementById('decode-error-ok') as HTMLButtonElement;
    okButton.click();

    expect(document.getElementById('decode-error-dialog')).toBeNull();
    expect(document.querySelector('.popup-backdrop')).toBeNull();
  });
});
