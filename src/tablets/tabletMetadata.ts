export interface TabletMetadata {
  id: string;
  label: string;
  keywords: string[];
}

export const tabletMetadata: TabletMetadata[] = [
  { id: 'base64', label: 'Base64', keywords: ['base64', 'encode', 'decode', 'encoding', 'binary'] },
  { id: 'calculator', label: 'Calculator', keywords: ['calculator', 'math', 'arithmetic', 'compute', 'calculate'] },
  { id: 'clipboard', label: 'Clipboard', keywords: ['clipboard', 'copy', 'paste', 'history', 'snippets'] },
  { id: 'converter', label: 'Converter', keywords: ['convert', 'encode', 'decode', 'hash', 'transform', 'format'] },
  { id: 'tempemail', label: 'Temp Email', keywords: ['email', 'temporary', 'disposable', 'mail', 'inbox'] },
  { id: 'ipdetails', label: 'IP Details', keywords: ['ip', 'address', 'location', 'network', 'geolocation'] },
  { id: 'jsonmapper', label: 'JSON Mapper', keywords: ['json', 'mapper', 'transform', 'mapping', 'data'] },
  { id: 'jwt', label: 'JWT', keywords: ['jwt', 'token', 'json web token', 'authentication', 'decode'] },
  { id: 'password', label: 'Password Generator', keywords: ['password', 'generator', 'secure', 'random', 'crypto'] },
  { id: 'pomodoro', label: 'Pomodoro Timer', keywords: ['pomodoro', 'timer', 'productivity', 'focus', 'time'] },
  { id: 'promptmanager', label: 'Prompt Manager', keywords: ['prompt', 'manager', 'ai', 'templates', 'snippets'] },
  { id: 'regex', label: 'Regex Tester', keywords: ['regex', 'regexp', 'pattern', 'match', 'test', 'validate', 'expression'] },
  { id: 'restclient', label: 'REST Client', keywords: ['rest', 'api', 'http', 'client', 'request', 'curl'] },
  // { id: 'runcode', label: 'Run Code', keywords: ['code', 'run', 'execute', 'programming', 'language'] },
  { id: 'shapesnap', label: 'Shape Snap', keywords: ['draw', 'diagram', 'shapes', 'sketch', 'flowchart', 'whiteboard'] },
  { id: 'usergen', label: 'User Generator', keywords: ['user', 'generator', 'random', 'profile', 'data'] },
  { id: 'uuid', label: 'UUID Generator', keywords: ['uuid', 'guid', 'identifier', 'unique', 'generate'] },
  { id: 'vault', label: 'Vault', keywords: ['vault', 'secure', 'store', 'password', 'credentials', 'secrets'] }
]; 