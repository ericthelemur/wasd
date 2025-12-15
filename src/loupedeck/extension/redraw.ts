import clone from 'clone';

import { Graphic } from '../../types/schemas/loupedeck';
import { loupedeck } from './index.extension';

let currentGraphics: (Graphic | null)[] = [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

export function redrawIfNecessary(index: number, newGraphic: Graphic | null) {
    const oldGraphic = currentGraphics[index];
    loupedeck.log.info("Redrawing", index, newGraphic);
    if (!newGraphic && !oldGraphic) {  // If equal don't do anything (likely only covers null === null case)
    } else if (!newGraphic || !oldGraphic || newGraphic.text != oldGraphic.text || newGraphic.colour != oldGraphic.colour || newGraphic.bg != oldGraphic.bg || newGraphic.imgType != oldGraphic.imgType || newGraphic.img != oldGraphic.img) {
        loupedeck.log.info("Redrawing, different");
        loupedeck.currentBuffers[index] = null;
        currentGraphics[index] = clone(newGraphic);
        loupedeck.drawKey(index, newGraphic).catch(e => loupedeck.log.error("Error drawing key", e));;   // If difference in any field, redraw
    }
}