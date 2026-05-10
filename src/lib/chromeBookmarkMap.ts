const MAP_KEY = "arcalist_chrome_map";

// Map shape: { [chromeFolderId]: arcalistBoardId }
type BookmarkMap = Record<string, string>;

export async function getBookmarkMap(): Promise<BookmarkMap> {
  try {
    const result = await chrome.storage.local.get(MAP_KEY);
    return (result[MAP_KEY] as BookmarkMap) ?? {};
  } catch {
    return {};
  }
}

export async function setBookmarkMap(map: BookmarkMap): Promise<void> {
  try {
    await chrome.storage.local.set({ [MAP_KEY]: map });
  } catch {
    // ignore
  }
}

export async function addMapping(
  chromeFolderId: string,
  arcalistBoardId: string,
): Promise<void> {
  const map = await getBookmarkMap();
  map[chromeFolderId] = arcalistBoardId;
  await setBookmarkMap(map);
}

export async function removeMapping(chromeFolderId: string): Promise<void> {
  const map = await getBookmarkMap();
  delete map[chromeFolderId];
  await setBookmarkMap(map);
}
