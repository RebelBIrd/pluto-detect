export interface PlutoNode {
  value: string;
  line: number;
  endLine: number;
}


export interface MissingKeyInfo {
  file: string;
  key: string;
  begion: Position;
  end: Position;
}
export interface Position {
  line: number;
  column: number;
}
