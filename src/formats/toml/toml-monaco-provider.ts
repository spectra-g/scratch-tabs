export const registerTomlProvider = (monaco: any): void => {
  if (!monaco?.languages) {
    return;
  }

  const languageId = "toml";
  const isRegistered = monaco.languages
    .getLanguages?.()
    ?.some((lang: { id?: string }) => lang.id === languageId);

  if (!isRegistered && typeof monaco.languages.register === "function") {
    monaco.languages.register({ id: languageId });
  }
};
