// Shared by the reader bundle and the classic scripts on the archive page.
(function (root) {
  const DEFAULT_REPOSITORY = 'MuX2001/daily-paper-reader';
  const REPO_URL = 'https://github.com/' + DEFAULT_REPOSITORY;
  const ISSUES_URL = REPO_URL + '/issues/new';
  function links(value) {
    if (value === undefined) {
      try { value = root.localStorage?.getItem('dpr.github.repository'); } catch { /* Private browsing */ }
    }
    const candidate = typeof value === 'string' ? value.trim() : '';
    const valid = /^[a-z\d](?:[a-z\d-]{0,38})\/[\w.-]+$/i.test(candidate) && !/\/(?:\.|\.\.)$/.test(candidate);
    const repository = valid ? candidate : DEFAULT_REPOSITORY;
    const url = valid ? 'https://github.com/' + repository : REPO_URL;
    return {repository, url, issues: valid ? url + '/issues/new' : ISSUES_URL};
  }
  root.DPRRepository = Object.freeze({DEFAULT_REPOSITORY, REPO_URL, ISSUES_URL, links});
  if (typeof module === 'object' && module.exports) module.exports = root.DPRRepository;
})(globalThis);
