import { alarmTrack, MAX_TRACK_MS, silentTrack, TRACK_SAMPLE_RATE } from './alarm-track';

const HEADER = 44;

/** The samples, as distance from silence (128). */
function loudness(wav: Uint8Array, fromSecond: number, toSecond: number): number {
    const from = HEADER + Math.floor(fromSecond * TRACK_SAMPLE_RATE);
    const to = HEADER + Math.floor(toSecond * TRACK_SAMPLE_RATE);
    let loudest = 0;
    for (let i = from; i < to; i++) {
        loudest = Math.max(loudest, Math.abs(wav[i] - 128));
    }
    return loudest;
}

describe('alarmTrack', () => {
    const NOW = 1_000_000;

    it('is an 8-bit mono WAV file', () => {
        const wav = alarmTrack([{ kind: 'rest', at: NOW }], NOW)!;
        const view = new DataView(wav.buffer);
        const text = (offset: number) => String.fromCharCode(...wav.subarray(offset, offset + 4));

        expect(text(0)).toBe('RIFF');
        expect(text(8)).toBe('WAVE');
        expect(text(12)).toBe('fmt ');
        expect(view.getUint16(20, true)).toBe(1); // PCM
        expect(view.getUint16(22, true)).toBe(1); // mono
        expect(view.getUint32(24, true)).toBe(TRACK_SAMPLE_RATE);
        expect(view.getUint16(34, true)).toBe(8);
        expect(text(36)).toBe('data');
        expect(view.getUint32(40, true)).toBe(wav.length - HEADER);
        expect(view.getUint32(4, true)).toBe(wav.length - 8);
    });

    it('puts each beep where it falls, with silence between', () => {
        // Work in 2s, rest in 5s
        const wav = alarmTrack(
            [
                { kind: 'work', at: NOW + 2000 },
                { kind: 'rest', at: NOW + 5000 },
            ],
            NOW
        )!;

        expect(loudness(wav, 0, 1.99)).toBe(0);
        expect(loudness(wav, 2, 2.15)).toBeGreaterThan(30);
        expect(loudness(wav, 2.45, 4.99)).toBe(0);
        expect(loudness(wav, 5, 5.5)).toBeGreaterThan(30);
        // Ends a moment after the last note
        expect((wav.length - HEADER) / TRACK_SAMPLE_RATE).toBeCloseTo(5.75, 1);
    });

    it('fades each note in and out, so it starts and ends silent', () => {
        const wav = alarmTrack([{ kind: 'rest', at: NOW }], NOW)!;

        expect(Math.abs(wav[HEADER] - 128)).toBeLessThanOrEqual(1);
        expect(loudness(wav, 0.4999, 0.5)).toBeLessThanOrEqual(2);
    });

    it('plays a beep that is just due straight away, and leaves out older ones', () => {
        const wav = alarmTrack(
            [
                { kind: 'finish', at: NOW - 5000 },
                { kind: 'work', at: NOW - 500 },
            ],
            NOW
        )!;

        expect(loudness(wav, 0, 0.15)).toBeGreaterThan(30);
        expect((wav.length - HEADER) / TRACK_SAMPLE_RATE).toBeLessThan(1);
    });

    it('stops at the longest track it makes', () => {
        const wav = alarmTrack(
            [
                { kind: 'work', at: NOW + 1000 },
                { kind: 'work', at: NOW + MAX_TRACK_MS + 1000 },
            ],
            NOW
        )!;

        expect((wav.length - HEADER) / TRACK_SAMPLE_RATE).toBeLessThan(2);
    });

    it('has nothing to play with no alarms to come', () => {
        expect(alarmTrack([], NOW)).toBeNull();
        expect(alarmTrack([{ kind: 'work', at: NOW - 60_000 }], NOW)).toBeNull();
    });

    it('makes silence in the same format', () => {
        const wav = silentTrack(0.5);

        expect(wav.length).toBe(HEADER + TRACK_SAMPLE_RATE / 2);
        expect(loudness(wav, 0, 0.5)).toBe(0);
    });
});
