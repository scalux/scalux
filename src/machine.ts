import {
  MetaTree,
  MetaTreeNode,
  NestedToPathObject,
  pathTree,
  TreeOf,
} from "./trees";

type PathPrefixes<
  S extends string,
  Acc extends string = "",
  Out extends string = never
> = S extends `${infer Head}/${infer Tail}`
  ? Acc extends ""
    ? PathPrefixes<Tail, Head, Out | Head>
    : PathPrefixes<Tail, `${Acc}/${Head}`, Out | `${Acc}/${Head}`>
  : Out | (Acc extends "" ? S : `${Acc}/${S}`);

type PathSuffixes<S extends string> = S extends `${infer _}/${infer Rest}`
  ? Rest | PathSuffixes<Rest>
  : never;

type PathPrefixUnion<U extends string> = U extends any
  ? PathPrefixes<U>
  : never;

type PathSuffixUnion<U extends string> = U extends any
  ? PathSuffixes<U>
  : never;

type ExtractSuffix<
  Path extends string,
  Prefix extends string
> = Path extends `${Prefix}/${infer Suffix}` ? Suffix : never;

type GetSuffixes<Paths extends string, Prefix extends string> = {
  [P in Paths]: ExtractSuffix<P, Prefix>;
}[Paths];

type ExtractAllPrefixSegments<
  S extends string,
  Base extends string = ""
> = S extends `${infer Head}/${infer Tail}`
  ?
      | (Base extends "" ? Head : `${Base}/${Head}`)
      | ExtractAllPrefixSegments<
          Tail,
          Base extends "" ? Head : `${Base}/${Head}`
        >
  : never;

type AllPossibleStrictPrefixes<Paths extends string> = {
  [P in Paths]: ExtractAllPrefixSegments<P>;
}[Paths];

type IsSubset<A, B> = A extends B ? true : false;

type ReplaceablePrefixes<
  Paths extends string, // All possible mode paths
  CurrentP extends string, // The current prefix we are transitioning from
  ActualCurrentSuffixes extends string = GetSuffixes<Paths, CurrentP>, // Suffixes for the current prefix
  // Use strict prefixes as candidates for replacement targets
  CandidatePrefixPool extends string = AllPossibleStrictPrefixes<Paths>
> = {
  [CandidateP in CandidatePrefixPool]: CandidateP extends CurrentP // Don't transition to self
    ? never
    : GetSuffixes<Paths, CandidateP> extends infer CandidateSuffixes // Get suffixes for candidate
    ? [CandidateSuffixes] extends [never] // If candidate has no defined suffixes in Paths, skip
      ? never
      : IsSubset<ActualCurrentSuffixes, CandidateSuffixes> extends true // Check if current suffixes are subset of candidate suffixes
      ? CandidateP // Valid target prefix
      : never
    : never;
}[CandidatePrefixPool]; // Filter out never results

type ExtractPrefixForSuffix<
  Path extends string,
  Suffix extends string
> = Path extends `${infer Prefix}/${Suffix}` ? Prefix : never;

type GetPrefixesForSuffix<Paths extends string, Suffix extends string> = {
  [P in Paths]: ExtractPrefixForSuffix<P, Suffix>;
}[Paths];

type DoesPathExistForAllPrefixes<
  PrefixUnion extends string,
  Suffix extends string,
  AllPaths extends string
> = false extends {
  [P in PrefixUnion]: `${P}/${Suffix}` extends AllPaths ? true : false;
}[PrefixUnion]
  ? false
  : true;

type CandidateSuffixPool<Paths extends string> = GetSuffixes<
  Paths,
  AllPossibleStrictPrefixes<Paths>
>;

type ReplaceableSuffixes<
  Paths extends string, // All possible mode paths
  CurrentS extends string, // The current suffix we are transitioning from
  PrefixesOfCurrent extends string = GetPrefixesForSuffix<Paths, CurrentS>, // Prefixes where CurrentS exists
  PoolOfCandidates extends string = CandidateSuffixPool<Paths> // All potential target suffixes
> = {
  [CandidateS in PoolOfCandidates]: CandidateS extends CurrentS // Don't transition to self
    ? never
    : [CandidateS] extends [never] // Skip if candidate is empty/invalid
    ? never
    : // Check if PrefixesOfCurrent is never (meaning CurrentS might be a root node or invalid)
    [PrefixesOfCurrent] extends [never]
    ? never // Cannot determine compatibility if CurrentS has no associated prefixes
    : DoesPathExistForAllPrefixes<
        // Check if candidate suffix exists under all relevant prefixes
        PrefixesOfCurrent,
        CandidateS,
        Paths
      > extends true
    ? CandidateS // Valid target suffix
    : never;
}[PoolOfCandidates]; // Filter out never results

type ModeOptionsConfig<
  Node extends MetaTreeNode<string, ReadonlyArray<string>>
> = Record<string, ReadonlyArray<Node>>;

export const Machine = <
  ModesTree extends TreeOf<null>, // Input must be a tree ending in null leaves
  // Infer all possible full path strings from the ModesTree
  Mode extends keyof NestedToPathObject<ModesTree> & string
>(
  modes: ModesTree
) => {
  /** Helper to generate the tree with full paths as leaf values. */
  const modesTree = pathTree(modes, "/");

  const buildRuntimeMetaTree = (node: any, path: string = ""): any => {
    // Check if it's a non-null object that isn't explicitly marked as a leaf (null)
    if (node !== null && typeof node === "object") {
      const childrenKeys = Object.keys(node);
      // Create the node object with metadata
      const result: any = {
        $path: path,
        // Store children keys as a simple array at runtime
        $opts: childrenKeys,
      };
      // Recursively build children
      childrenKeys.forEach((key) => {
        result[key] = buildRuntimeMetaTree(
          node[key],
          path ? `${path}/${key}` : key
        );
      });
      return result;
    } else {
      // Leaf node representation at runtime
      return { $path: path, value: node };
    }
  };

  const runtimeMetaTree = buildRuntimeMetaTree(modes);

  const buildMkModeOptionsFn = <
    OptionsBuilder extends ModeOptionsConfig<
      MetaTreeNode<string, ReadonlyArray<string>>
    >
  >(
    builder: (tree: MetaTree<ModesTree>) => OptionsBuilder
  ) => {
    const config = builder(
      runtimeMetaTree as MetaTree<ModesTree>
    ) as OptionsBuilder;

    type PathsOf<K extends keyof OptionsBuilder> =
      OptionsBuilder[K] extends ReadonlyArray<
        MetaTreeNode<infer P extends string, any>
      >
        ? P
        : never;

    type ValueOf<K extends keyof OptionsBuilder> =
      OptionsBuilder[K] extends ReadonlyArray<
        MetaTreeNode<any, infer Opts extends readonly string[]>
      >
        ? Opts[number]
        : never;

    type Selectors = {
      [K in keyof OptionsBuilder]: (
        mode: Mode
      ) => Exclude<Mode, `${PathsOf<K>}/${string}`> extends never
        ? ValueOf<K>
        : ValueOf<K> | undefined;
    };

    const selectors = {} as Selectors;

    for (const key in config) {
      const nodes = config[key]!;

      selectors[key] = ((mode: Mode) => {
        for (const node of nodes) {
          const base = node.$path;
          const prefix = base === "" ? "" : base + "/";
          if (!mode.startsWith(prefix)) continue;

          const rest = mode.slice(prefix.length);
          const segment = rest.split("/")[0];
          if (node.$opts.includes(segment)) {
            return segment as any;
          }
        }
        return undefined as any;
      }) as Selectors[typeof key];
    }

    return selectors;
  };

  return {
    modesTree: modesTree,

    macroModes: <Prefix extends PathPrefixUnion<Mode>>(prefix: Prefix) => ({
      match: (mode: Mode): boolean => mode.startsWith(prefix),
      next: (
        nextPrefix: ReplaceablePrefixes<Mode, Prefix>,
        currentMode: Mode
      ) => currentMode.replace(prefix, nextPrefix) as Mode,
    }),

    subModes: <Suffix extends PathSuffixUnion<Mode>>(suffix: Suffix) => ({
      match: (mode: Mode) => mode.endsWith(suffix),
      next: (
        nextSuffix: ReplaceableSuffixes<Mode, Suffix>,
        currentMode: Mode
      ) => currentMode.replace(suffix, nextSuffix) as Mode,
    }),
    mkModeOptions: buildMkModeOptionsFn,
  };
};
