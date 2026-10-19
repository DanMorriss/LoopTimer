import { AlarmEvent } from '../../timer/alarm-schedule';
import { FADE_IN, FADE_OUT, SOUNDS, VOLUME } from './alarm-sounds';

/** Plenty for beeps (the highest note is under 1 kHz) while keeping the file small: 8 KB a second. */
export const TRACK_SAMPLE_RATE = 8000;

/** The longest track made at once: 45 minutes, about 22 MB. */
export const MAX_TRACK_MS = 45 * 60 * 1000;

// Like the Web Audio alarms, one that's up to this late still plays, at the very start
const LATE_LIMIT_MS = 1000;

const HEADER_BYTES = 44;

/**
 * The alarms as a WAV file: silence, with each beep where it falls, starting at `from`
 * (ms since the epoch). Played on an <audio> element it keeps going with an iPhone's
 * screen locked, which Web Audio doesn't. The same notes as AlarmService, as triangle
 * waves with the same fades, in 8-bit mono.
 *
 * Returns null when there's nothing to play.
 */
export function alarmTrack(
    events: readonly AlarmEvent[],
    from: number,
    sampleRate = TRACK_SAMPLE_RATE
): Uint8Array | null {
    const notes = events
        .filter((event) => event.at >= from - LATE_LIMIT_MS && event.at - from < MAX_TRACK_MS)
        .flatMap((event) =>
            SOUNDS[event.kind].map((note) => ({
                ...note,
                start: Math.max(0, event.at - from) / 1000 + note.offset,
            }))
        );
    if (notes.length === 0) {
        return null;
    }

    // To the end of the last note, and a moment more
    const seconds = Math.max(...notes.map((note) => note.start + note.length)) + 0.25;
    const sampleCount = Math.ceil(seconds * sampleRate);
    const wav = new Uint8Array(HEADER_BYTES + sampleCount);
    writeHeader(new DataView(wav.buffer), sampleCount, sampleRate);
    // 8-bit WAV is unsigned, with silence at 128. Each note is added in place, straight into
    // the file, rather than mixed in a buffer of its own: a long track is mostly silence.
    const samples = wav.subarray(HEADER_BYTES).fill(128);
    for (const note of notes) {
        const first = Math.floor(note.start * sampleRate);
        const last = Math.min(sampleCount, Math.ceil((note.start + note.length) * sampleRate));
        for (let i = first; i < last; i++) {
            const t = i / sampleRate - note.start;
            const value =
                samples[i] + 127 * triangle(note.frequency * t) * envelope(t, note.length);
            samples[i] = Math.round(Math.max(0, Math.min(255, value)));
        }
    }
    return wav;
}

/** `seconds` of silence as a WAV file, in the same format as the alarm track. */
export function silentTrack(seconds: number, sampleRate = TRACK_SAMPLE_RATE): Uint8Array {
    const sampleCount = Math.ceil(seconds * sampleRate);
    const wav = new Uint8Array(HEADER_BYTES + sampleCount);
    writeHeader(new DataView(wav.buffer), sampleCount, sampleRate);
    wav.subarray(HEADER_BYTES).fill(128);
    return wav;
}

/** A triangle wave, -1 to 1, at `cycles` cycles in. */
function triangle(cycles: number): number {
    return 2 * Math.abs(2 * (cycles - Math.floor(cycles + 0.5))) - 1;
}

/** The note's volume `t` seconds in: a quick fade in, steady, then a quick fade out. */
function envelope(t: number, length: number): number {
    if (t < FADE_IN) {
        return (VOLUME * t) / FADE_IN;
    }
    if (t > length - FADE_OUT) {
        return (VOLUME * Math.max(0, length - t)) / FADE_OUT;
    }
    return VOLUME;
}

function writeHeader(view: DataView, sampleCount: number, sampleRate: number) {
    const text = (offset: number, value: string) =>
        [...value].forEach((char, i) => view.setUint8(offset + i, char.codePointAt(0)!));
    text(0, 'RIFF');
    view.setUint32(4, HEADER_BYTES - 8 + sampleCount, true);
    text(8, 'WAVE');
    text(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate, true); // bytes a second: one byte a sample
    view.setUint16(32, 1, true); // bytes a sample
    view.setUint16(34, 8, true); // bits a sample
    text(36, 'data');
    view.setUint32(40, sampleCount, true);
}
