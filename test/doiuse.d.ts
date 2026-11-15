declare module 'doiuse' {
  import type { PluginCreator } from 'postcss';
  const doiuse: PluginCreator<{ browsers: string[]; onFeatureUsage?: (usage: any) => void }>;
  export default doiuse;
}
