import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/preact';
import { ManualSetup } from '../src/manual-setup';

afterEach(cleanup);
const field = (name: string) => document.querySelector(`[name=${name}]`) as HTMLInputElement;
const type = (name: string, value: string) => fireEvent.input(field(name), { target: { value } });

describe('ManualSetup', () => {
  it('submits a normalized config', () => {
    const onSubmit = vi.fn();
    render(<ManualSetup onSubmit={onSubmit} />);
    type('address', ' 192.168.1.10:2283/ ');
    type('key', ' K ');
    fireEvent.submit(document.querySelector('form')!);
    expect(onSubmit).toHaveBeenCalledWith({ baseUrl: 'http://192.168.1.10:2283', apiKey: 'K' });
  });

  it('asks for both values instead of submitting an incomplete form', () => {
    const onSubmit = vi.fn();
    const { getByText } = render(<ManualSetup onSubmit={onSubmit} />);
    type('address', 'h:1');
    fireEvent.submit(document.querySelector('form')!);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(getByText(/wpisz adres/i)).toBeTruthy();
  });

  it('moves between fields and the button with up and down', () => {
    render(<ManualSetup onSubmit={vi.fn()} />);
    expect(document.activeElement).toBe(field('address'));
    fireEvent.keyDown(window, { keyCode: 40 });
    expect(document.activeElement).toBe(field('key'));
    fireEvent.keyDown(window, { keyCode: 40 });
    expect(document.activeElement?.tagName).toBe('BUTTON');
    fireEvent.keyDown(window, { keyCode: 38 });
    expect(document.activeElement).toBe(field('key'));
  });

  it('lets Enter through to the focused field so the TV keyboard can open', () => {
    render(<ManualSetup onSubmit={vi.fn()} />);
    const ev = new KeyboardEvent('keydown', { keyCode: 13, bubbles: true, cancelable: true });
    window.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
  });

  it('calls onCancel on Back when provided', () => {
    const onCancel = vi.fn();
    render(<ManualSetup onSubmit={vi.fn()} onCancel={onCancel} />);
    fireEvent.keyDown(window, { keyCode: 10009 });
    expect(onCancel).toHaveBeenCalled();
  });
});
