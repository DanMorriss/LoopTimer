import { canDoWith } from './exercise';

describe('canDoWith', () => {
    it('needs every piece of equipment an exercise lists', () => {
        const backSquat = { equipment: ['barbell', 'rack'] } as const;

        expect(canDoWith(backSquat, ['barbell', 'rack', 'bench'])).toBe(true);
        expect(canDoWith(backSquat, ['barbell'])).toBe(false);
    });

    it('takes any one of a choice', () => {
        const gobletSquat = { equipment: [['dumbbells', 'kettlebell']] } as const;

        expect(canDoWith(gobletSquat, ['kettlebell'])).toBe(true);
        expect(canDoWith(gobletSquat, ['dumbbells'])).toBe(true);
        expect(canDoWith(gobletSquat, ['barbell'])).toBe(false);
    });

    it('can always do an exercise that needs nothing', () => {
        expect(canDoWith({ equipment: ['none'] }, [])).toBe(true);
    });
});
