'use client';
import createWebStorage from 'redux-persist/lib/storage/createWebStorage';

const createNoopStorage = () => {
  return {
    getItem(_key) {
      return Promise.resolve(null);
    },
    setItem(_key, value) {
      return Promise.resolve(value);
    },
    removeItem(_key) {
      return Promise.resolve();
    },
  };
};

// Function to check if localStorage is available and working
const isLocalStorageAvailable = () => {
  try {
    const testKey = '__test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

// Create appropriate storage based on environment and availability
const storage =
  typeof window !== 'undefined' && isLocalStorageAvailable()
    ? createWebStorage('local')
    : createNoopStorage();

export default storage;