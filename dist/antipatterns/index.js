import { detectFatController } from './fat-controller.js';
import { detectSupernova } from './supernova.js';
import { detectGodClass } from './god-class.js';
import { detectShotgunSurgery } from './shotgun-surgery.js';
import { detectDivergentChange } from './divergent-change.js';
export function detectAntiPatterns(commits) {
    const results = [];
    results.push(detectFatController(commits));
    results.push(detectSupernova(commits));
    results.push(detectGodClass(commits));
    results.push(detectShotgunSurgery(commits));
    results.push(detectDivergentChange(commits));
    return results;
}
export { detectFatController } from './fat-controller.js';
export { detectSupernova } from './supernova.js';
export { detectGodClass } from './god-class.js';
export { detectShotgunSurgery } from './shotgun-surgery.js';
export { detectDivergentChange } from './divergent-change.js';
//# sourceMappingURL=index.js.map