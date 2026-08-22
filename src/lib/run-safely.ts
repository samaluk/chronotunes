/**
 * Runs an awaited operation, converting thrown errors into an optional error
 * handler and returning whether the operation succeeded.
 *
 * Owning the try/catch here keeps component scopes free of try/catch around
 * awaits, which would otherwise opt them out of React Compiler optimization
 * (react-doctor/react-hooks-js todo findings).
 */
export const runSafely = async (
  run: () => Promise<unknown>,
  onError?: (error: unknown) => void,
): Promise<boolean> => {
  try {
    await run();
    return true;
  } catch (error) {
    if (onError) {
      onError(error);
    }
    return false;
  }
};

/**
 * Runs an awaited operation under a loading flag whose reset is guaranteed by
 * a finally block, so the flag can never get stuck on failure.
 */
export const runWithLoading = async (
  setLoading: (loading: boolean) => void,
  run: () => Promise<unknown>,
  onError?: (error: unknown) => void,
): Promise<boolean> => {
  setLoading(true);
  try {
    await run();
    return true;
  } catch (error) {
    if (onError) {
      onError(error);
    }
    return false;
  } finally {
    setLoading(false);
  }
};

/**
 * Runs a mutation under a loading flag and logs failures with a contextual
 * label. The standard wrapper for fire-and-report mutation handlers.
 */
export const runTrackedMutation = async (args: {
  errorLabel: string;
  mutation: () => Promise<unknown>;
  setLoading: (loading: boolean) => void;
}): Promise<boolean> =>
  runWithLoading(args.setLoading, args.mutation, (error: unknown) => {
    console.error(args.errorLabel, error);
  });
