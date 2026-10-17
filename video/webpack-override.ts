import path from 'node:path';
import type { WebpackOverrideFn } from '@remotion/bundler';
import { enableTailwind } from '@remotion/tailwind';

// Tailwind for the site's styles, and a single React: the site's components
// would otherwise load frontend/node_modules' own.
export const webpackOverride: WebpackOverrideFn = config => {
  const withTailwind = enableTailwind(config);
  return {
    ...withTailwind,
    resolve: {
      ...withTailwind.resolve,
      alias: {
        ...(withTailwind.resolve?.alias as Record<string, string> | undefined),
        react: path.resolve('node_modules/react'),
        'react-dom': path.resolve('node_modules/react-dom'),
      },
      // The site's own packages (router, icons, charts), one copy for both
      modules: [...(withTailwind.resolve?.modules ?? ['node_modules']), path.resolve('../frontend/node_modules')],
    },
  };
};
