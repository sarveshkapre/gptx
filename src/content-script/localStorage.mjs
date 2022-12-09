import LocalStorageCache from 'localstorage-cache'

export const storageCache = new LocalStorageCache(2 * 1024, 'LRU') //
