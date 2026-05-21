import { Commit, AntiPatternResult } from '../types.js';
import { detectFatController } from './fat-controller.js';
import { detectSupernova } from './supernova.js';
import { detectGodClass } from './god-class.js';
import { detectShotgunSurgery } from './shotgun-surgery.js';
import { detectDivergentChange } from './divergent-change.js';
import { detectBlobArchitecture } from './blob-architecture.js';
import { detectAnemicDomainModel } from './anemic-domain-model.js';
import { detectServiceLocator } from './service-locator.js';
import { detectSpaghettiCode } from './spaghetti-code.js';
import { detectLavaFlow } from './lava-flow.js';
import { detectGoldenHammer } from './golden-hammer.js';
import { detectSingletonAbuse } from './singleton-abuse.js';
import { detectFeatureEnvy } from './feature-envy.js';
import { detectRefusedBequest } from './refused-bequest.js';
import { detectParallelInheritance } from './parallel-inheritance.js';
import { detectObjectCesspool } from './object-cesspool.js';
import { detectMassiveComponent } from './massive-component.js';
import { detectPropDrilling } from './prop-drilling.js';
import { detectGlobalStateAbuse } from './global-state-abuse.js';
import { detectCallbackHell } from './callback-hell.js';
import { detectHardcodedSecrets } from './hardcoded-secrets.js';
import { detectBrokenAuth } from './broken-auth.js';
import { detectTrustingClientInput } from './trusting-client-input.js';
import { detectCyclicDependencies } from './cyclic-dependencies.js';

export function detectAntiPatterns(commits: Commit[], repoPath: string = process.cwd()): AntiPatternResult[] {
  return [
    detectFatController(commits),
    detectSupernova(commits),
    detectGodClass(commits),
    detectShotgunSurgery(commits),
    detectDivergentChange(commits),
    detectBlobArchitecture(commits, repoPath),
    detectAnemicDomainModel(commits, repoPath),
    detectServiceLocator(commits, repoPath),
    detectSpaghettiCode(commits, repoPath),
    detectLavaFlow(commits, repoPath),
    detectGoldenHammer(commits, repoPath),
    detectSingletonAbuse(commits, repoPath),
    detectFeatureEnvy(commits, repoPath),
    detectRefusedBequest(commits, repoPath),
    detectParallelInheritance(commits),
    detectObjectCesspool(commits, repoPath),
    detectMassiveComponent(commits, repoPath),
    detectPropDrilling(commits, repoPath),
    detectGlobalStateAbuse(commits, repoPath),
    detectCallbackHell(commits, repoPath),
    detectHardcodedSecrets(commits, repoPath),
    detectBrokenAuth(commits, repoPath),
    detectTrustingClientInput(commits, repoPath),
    detectCyclicDependencies(commits, repoPath),
  ];
}

export { detectFatController } from './fat-controller.js';
export { detectSupernova } from './supernova.js';
export { detectGodClass } from './god-class.js';
export { detectShotgunSurgery } from './shotgun-surgery.js';
export { detectDivergentChange } from './divergent-change.js';
export { detectBlobArchitecture } from './blob-architecture.js';
export { detectAnemicDomainModel } from './anemic-domain-model.js';
export { detectServiceLocator } from './service-locator.js';
export { detectSpaghettiCode } from './spaghetti-code.js';
export { detectLavaFlow } from './lava-flow.js';
export { detectGoldenHammer } from './golden-hammer.js';
export { detectSingletonAbuse } from './singleton-abuse.js';
export { detectFeatureEnvy } from './feature-envy.js';
export { detectRefusedBequest } from './refused-bequest.js';
export { detectParallelInheritance } from './parallel-inheritance.js';
export { detectObjectCesspool } from './object-cesspool.js';
export { detectMassiveComponent } from './massive-component.js';
export { detectPropDrilling } from './prop-drilling.js';
export { detectGlobalStateAbuse } from './global-state-abuse.js';
export { detectCallbackHell } from './callback-hell.js';
export { detectHardcodedSecrets } from './hardcoded-secrets.js';
export { detectBrokenAuth } from './broken-auth.js';
export { detectTrustingClientInput } from './trusting-client-input.js';
export { detectCyclicDependencies } from './cyclic-dependencies.js';
