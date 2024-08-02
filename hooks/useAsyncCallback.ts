import {type DependencyList, useCallback, useState} from 'react';

export function useAsyncCallback<Args extends unknown[], ResolvedType>(
  callback: (...args: Args) => Promise<ResolvedType>,
  deps: DependencyList,
): [boolean, (...args: Args) => Promise<ResolvedType>] {
  const [isLoading, setIsLoading] = useState(false);
  const _callback = useCallback(
    async (...args: Args) => {
      setIsLoading(true);
      try {
        return await callback(...args);
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...deps],
  );

  return [isLoading, _callback];
}
