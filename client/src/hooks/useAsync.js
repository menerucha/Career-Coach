import { useCallback, useEffect, useRef, useState } from 'react';

/** Load data when deps change; ignores stale responses. Returns { data, error, loading, reload, setData }. */
export function useFetch(fn, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: enabled });
  const seq = useRef(0), fnRef = useRef(fn); fnRef.current = fn;
  const load = useCallback(async () => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try { const data = await fnRef.current(); if (id === seq.current) setState({ data, error: null, loading: false }); }
    catch (error) { if (id === seq.current) setState((s) => ({ ...s, error, loading: false })); }
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (enabled) load(); return () => { seq.current++; }; }, [enabled, ...deps]);
  return { ...state, reload: load, setData: (updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })) };
}

/** Run an async action on demand (form submit etc.). Returns { run, loading, error, data, reset }. */
export function useAction(fn) {
  const [state, setState] = useState({ data: null, error: null, loading: false });
  const fnRef = useRef(fn); fnRef.current = fn;
  const run = useCallback(async (...args) => {
    setState({ data: null, error: null, loading: true });
    try { const data = await fnRef.current(...args); setState({ data, error: null, loading: false }); return data; }
    catch (error) { setState({ data: null, error, loading: false }); return null; }
  }, []);
  return { ...state, run, reset: () => setState({ data: null, error: null, loading: false }) };
}
