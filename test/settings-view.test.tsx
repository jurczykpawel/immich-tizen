import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { SettingsView } from '../src/settings-view';

afterEach(() => { cleanup(); vi.useRealTimers(); });

const base = { intervalSec: 8, motion: false, onMotion: vi.fn(), server: '192.168.1.10:2283', onInterval: vi.fn(), onManual: vi.fn(), onReset: vi.fn(), onBack: vi.fn() };
const rows = () => Array.from(document.querySelectorAll('[data-row]'));
const focusedRow = () => document.querySelector('[data-row].focused')?.getAttribute('data-row');
const key = (keyCode: number) => fireEvent.keyDown(window, { keyCode });

describe('SettingsView', () => {
  it('lists the interval, the server and the actions', () => {
    render(<SettingsView {...base} onPair={vi.fn()} />);
    expect(rows().map((r) => r.getAttribute('data-row'))).toEqual(['interval', 'motion', 'pair', 'manual', 'reset']);
    expect(screen.getByText('8 s')).toBeTruthy();
    expect(screen.getByText(/192\.168\.1\.10:2283/)).toBeTruthy();
  });

  it('omits the phone pairing row when pairing is not available', () => {
    render(<SettingsView {...base} />);
    expect(rows().map((r) => r.getAttribute('data-row'))).toEqual(['interval', 'motion', 'manual', 'reset']);
  });

  it('moves focus with up and down and keeps it inside the list', () => {
    render(<SettingsView {...base} onPair={vi.fn()} />);
    expect(focusedRow()).toBe('interval');
    key(40); key(40); key(40);
    expect(focusedRow()).toBe('manual');
    key(38); key(38); key(38); key(38);
    expect(focusedRow()).toBe('interval');
  });

  it('changes the interval with left and right', () => {
    const onInterval = vi.fn();
    render(<SettingsView {...base} onInterval={onInterval} />);
    key(39);
    expect(onInterval).toHaveBeenLastCalledWith(15);
    key(37);
    expect(onInterval).toHaveBeenLastCalledWith(5);
  });

  it('does not change the interval from another row', () => {
    const onInterval = vi.fn();
    render(<SettingsView {...base} onInterval={onInterval} />);
    key(40); key(39);
    expect(onInterval).not.toHaveBeenCalled();
  });

  it('runs the focused action on OK', () => {
    const onPair = vi.fn(), onManual = vi.fn();
    render(<SettingsView {...base} onPair={onPair} onManual={onManual} />);
    key(40); key(40); key(13);
    expect(onPair).toHaveBeenCalled();
    key(40); key(13);
    expect(onManual).toHaveBeenCalled();
  });

  it('asks for a second OK before clearing the connection, and forgets the request after a while', () => {
    vi.useFakeTimers();
    const onReset = vi.fn();
    render(<SettingsView {...base} onReset={onReset} />);
    key(40); key(40); key(40);
    key(13);
    expect(onReset).not.toHaveBeenCalled();
    expect(screen.getByText(/ponownie/i)).toBeTruthy();
    key(13);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('cancels the clearing request when time passes or focus moves', () => {
    vi.useFakeTimers();
    const onReset = vi.fn();
    render(<SettingsView {...base} onReset={onReset} />);
    key(40); key(40); key(40); key(13);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByText(/ponownie/i)).toBeNull();
    key(13);
    expect(onReset).not.toHaveBeenCalled();
  });

  it('shows the photo motion switch and toggles it with OK or the side arrows', () => {
    const onMotion = vi.fn();
    render(<SettingsView {...base} onMotion={onMotion} />);
    expect(screen.getByText('Wyłączony')).toBeTruthy();
    key(40); key(13);
    expect(onMotion).toHaveBeenLastCalledWith(true);
    key(39);
    expect(onMotion).toHaveBeenCalledTimes(2);
  });

  it('shows the motion switch as on', () => {
    render(<SettingsView {...base} motion />);
    expect(screen.getByText('Włączony')).toBeTruthy();
  });

  it('goes back on the Back key', () => {
    const onBack = vi.fn();
    render(<SettingsView {...base} onBack={onBack} />);
    key(10009);
    expect(onBack).toHaveBeenCalled();
  });
});
