import { useState, useEffect, useCallback } from 'react';

function parseStored(item) {
  if (item === null) return null;
  try {
    const parsed = JSON.parse(item);
    // If parsing produced a string "true" / "false" (rare), coerce:
    if (parsed === 'true') return true;
    if (parsed === 'false') return false;
    return parsed;
  } catch {
    // If value isn't valid JSON, handle simple "true"/"false" strings or return raw
    if (item === 'true') return true;
    if (item === 'false') return false;
    return item;
  }
}

export function useLocalStorage(key, defaultValue) {
  // Move readDefault inside useCallback to make it stable
  const readDefault = useCallback(() => 
    (typeof defaultValue === 'function' ? defaultValue() : defaultValue), 
    [defaultValue]
  );

  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) return readDefault();
      const parsed = parseStored(item);
      return parsed === null ? readDefault() : parsed;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return readDefault();
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, value]);

  // Sync across tabs
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key !== key) return;
      try {
        if (e.newValue === null) {
          setValue(readDefault());
        } else {
          setValue(parseStored(e.newValue));
        }
      } catch (err) {
        console.error(`Error parsing storage event for key "${key}":`, err);
      }
    };
    
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key, readDefault]);

  // Setter that supports functional updater and writes to localStorage immediately
  const setLocalStorage = (val) => {
    try {
      setValue((prev) => {
        const newValue = typeof val === 'function' ? val(prev) : val;
        try {
          window.localStorage.setItem(key, JSON.stringify(newValue));
        } catch (err) {
          console.error(`Error setting localStorage key "${key}":`, err);
        }
        return newValue;
      });
    } catch (error) {
      console.error(`Error updating state for localStorage key "${key}":`, error);
    }
  };

  return [value, setLocalStorage];
}
