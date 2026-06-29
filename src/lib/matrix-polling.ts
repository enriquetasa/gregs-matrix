export function shouldPollMatrix(input: {
  ready: boolean;
  authorized: boolean;
  busy: boolean;
  activeDragId: string | null;
}): boolean {
  return (
    input.ready &&
    input.authorized &&
    !input.busy &&
    input.activeDragId === null
  );
}
