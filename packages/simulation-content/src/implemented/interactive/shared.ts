import type {
  AssetManifest,
  NarrationCueDefinition,
  SimulationModuleRecord,
  SimulationNarrationManifest,
} from '@xr-school/simulation-schema';
import { withPackagedNarration } from '../narrationAssets.js';

type CommonModuleFields =
  | 'applicableBoards'
  | 'evidenceConfidenceLevel'
  | 'releaseMaturity'
  | 'publicationStatus'
  | 'evidenceMaturity'
  | 'targetFrameRateFps'
  | 'minQuestStorageGb'
  | 'status';

export type ReleasedInteractiveModuleInput = Omit<
  SimulationModuleRecord,
  CommonModuleFields
>;

export function releasedInteractiveModule(
  input: ReleasedInteractiveModuleInput,
): SimulationModuleRecord {
  return {
    ...input,
    applicableBoards: ['cbse', 'icse'],
    evidenceConfidenceLevel: 'expertDesigned',
    releaseMaturity: 'internalQA',
    publicationStatus: 'released',
    evidenceMaturity: 'internalQA',
    targetFrameRateFps: 72,
    minQuestStorageGb: 1,
    status: 'released',
  };
}

export function captionedNarration(
  slug: string,
  cues: readonly NarrationCueDefinition[],
): SimulationNarrationManifest {
  return {
    id: `narration-${slug}`,
    cues: cues.map(cue => withPackagedNarration({
      ...cue,
      caption: cue.text,
    })),
    fallback: 'browserTts',
  };
}

interface GeneratedEnvironmentMetadata {
  browserSha256: string;
  browserByteSize: number;
  questSha256: string;
  questByteSize: number;
}

const GENERATED_ENVIRONMENT_METADATA: Record<
  string,
  GeneratedEnvironmentMetadata
> = {
  '3d6dab260c2695634e6160ce91724f91dbd8fe22e184786f60a247b4561ea92d': {
    browserSha256:
      '08e307dffe80a1b33dbbb2ddcc587536966544c9fb926e760cced1ce489082ab',
    browserByteSize: 164092,
    questSha256:
      'a96605bb6c9e91807481365aaa88b59ab52c115e69e1e350deb9c399e5597b67',
    questByteSize: 40646,
  },
  'e095c37072c713d778e8a9c80088ec017439947e7aaecafb5c614844aab591ee': {
    browserSha256:
      '3a3c0a5c96abcacd2441cf9202b508ddca66a8235a5fceb986cf45e1ea9f07dd',
    browserByteSize: 159090,
    questSha256:
      '987c8a89fa76dd63a8cd522946265a3a7f317235f3f7d8fee485c7421ac48cd0',
    questByteSize: 40124,
  },
  'd3620b5d71eaac1b41343c004fbb8705838cca1965e3562fc1605be6625ba53c': {
    browserSha256:
      '344347a08cac60da70ea9754d1eaf5599ff27899ab56cd6661f7fd7fccebbe27',
    browserByteSize: 189362,
    questSha256:
      'de939ffa51d52e9b2f5a6d65e1b4682891823feb61a9bd58b851f1f3a4121f5d',
    questByteSize: 46420,
  },
};

const FALLBACK_SHA256 =
  'af395668289458c1e8e8059bdfec962229ed2bc77c0589d40d912443e57e5b3d';
const FALLBACK_BYTE_SIZE = 471;

export function contributedEnvironmentAssets(input: {
  slug: string;
  sourcePath: string;
  sourceSha256: string;
}): AssetManifest {
  const generated = GENERATED_ENVIRONMENT_METADATA[input.sourceSha256];
  if (!generated) {
    throw new Error(`Unknown interactive environment source ${input.sourceSha256}`);
  }
  const source = `GitHub PR #8 at 621dfb61: ${input.sourcePath}; SHA-256 ${input.sourceSha256}`;
  const author =
    'Aditya Kumar Pandey (PR #8 contributor); external generator metadata unavailable';
  const license =
    'Contribution accepted under repository terms; upstream generation license undocumented';
  return {
    id: `assets-${input.slug}`,
    assets: [
      {
        id: `${input.slug}-environment-browser`,
        url: `/simulations/${input.slug}/environment-browser.webp`,
        kind: 'environment',
        source,
        license,
        author,
        width: 1774,
        height: 887,
        channels: ['rgb'],
        compression: 'WebP quality 82',
        sha256: generated.browserSha256,
        byteSize: generated.browserByteSize,
        fallbackAssetId: `${input.slug}-environment-fallback`,
      },
      {
        id: `${input.slug}-environment-quest`,
        url: `/simulations/${input.slug}/environment-quest.webp`,
        kind: 'environment',
        source,
        license,
        author,
        width: 1024,
        height: 512,
        channels: ['rgb'],
        compression: 'WebP quality 72',
        sha256: generated.questSha256,
        byteSize: generated.questByteSize,
        fallbackAssetId: `${input.slug}-environment-fallback`,
      },
      {
        id: `${input.slug}-environment-fallback`,
        url: `/simulations/${input.slug}/environment-fallback.svg`,
        kind: 'environment',
        source: 'Repository-authored deterministic gradient fallback',
        license: 'XR School project asset',
        author: 'XR School',
        width: 1024,
        height: 512,
        channels: ['rgb'],
        compression: 'SVG',
        sha256: FALLBACK_SHA256,
        byteSize: FALLBACK_BYTE_SIZE,
      },
    ],
  };
}

export const PR8_CONTRIBUTOR = 'Aditya Kumar Pandey';
