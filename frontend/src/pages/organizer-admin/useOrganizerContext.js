import { useEffect, useState } from 'react';
import { api } from './adminApi.js';

export function useOrganizerContext() {
  const [context, setContext] = useState({
    events: [],
    loading: true,
    error: '',
  });
  useEffect(() => {
    api('/api/v1/organizer/context')
      .then((data) => setContext({ ...data, loading: false, error: '' }))
      .catch((error) =>
        setContext({ events: [], loading: false, error: error.message }),
      );
  }, []);
  return context;
}
