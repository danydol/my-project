declare module 'glob-promise' {
  import { IOptions } from 'glob';
  function glob(pattern: string, options?: IOptions): Promise<string[]>;
  export = glob;
} 