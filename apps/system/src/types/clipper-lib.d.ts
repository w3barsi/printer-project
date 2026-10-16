declare module "clipper-lib" {
  export type ClipperPoint = { X: number; Y: number };
  export type ClipperPath = ClipperPoint[];
  export type ClipperPaths = ClipperPath[];

  export interface PolyNode {
    Childs(): PolyNode[];
    ChildCount(): number;
    Contour(): ClipperPath;
    IsHoleNode(): boolean;
  }

  export interface PolyTree extends PolyNode {
    Clear(): void;
  }

  export interface Clipper {
    StrictlySimple: boolean;
    AddPath(path: ClipperPath, polyType: number, closed: boolean): void;
    AddPaths(paths: ClipperPaths, polyType: number, closed: boolean): void;
    Execute(
      clipType: number,
      solution: ClipperPaths,
      subjFillType: number,
      clipFillType: number,
    ): boolean;
    Execute(
      clipType: number,
      solution: PolyTree,
      subjFillType: number,
      clipFillType: number,
    ): boolean;
  }

  export interface ClipperOffset {
    ArcTolerance: number;
    MiterLimit: number;
    AddPath(path: ClipperPath, joinType: number, endType: number): void;
    AddPaths(paths: ClipperPaths, joinType: number, endType: number): void;
    Execute(solution: ClipperPaths, delta: number): void;
  }

  const ClipperLib: {
    Clipper: {
      new (initOptions?: number): Clipper;
      /** Fixes orientation (outers positive, holes negative) and resolves overlaps. */
      SimplifyPolygons(paths: ClipperPaths, fillType?: number): ClipperPaths;
    };
    ClipperOffset: { new (miterLimit?: number, arcTolerance?: number): ClipperOffset };
    PolyTree: { new (): PolyTree };
    ClipType: {
      ctIntersection: number;
      ctUnion: number;
      ctDifference: number;
      ctXor: number;
    };
    PolyType: { ptSubject: number; ptClip: number };
    PolyFillType: {
      pftEvenOdd: number;
      pftNonZero: number;
      pftPositive: number;
      pftNegative: number;
    };
    JoinType: { jtSquare: number; jtRound: number; jtMiter: number };
    EndType: {
      etClosedPolygon: number;
      etClosedLine: number;
      etOpenSquare: number;
      etOpenRound: number;
      etOpenButt: number;
    };
  };

  export default ClipperLib;
}
