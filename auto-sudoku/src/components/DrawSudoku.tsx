import { useRef, useCallback, useState, useEffect } from "react";
import { PuzzleBox } from "../augmentedReality/imageProcessing/extractBoxes";
import Processor from "../augmentedReality/Processor";
import { Point } from "../augmentedReality/imageProcessing/getLargestConnectedComponent";
const processor = new Processor();

function calculateCanvasPath(vertices: Point[]) {

  const pointsToDraw = 60;
  const pointsPerVertex = pointsToDraw / vertices.length;
  var waypoints = [];
  for (var i = 1; i < vertices.length; i++) {
    var pt0 = vertices[i - 1];
    var pt1 = vertices[i];
    var dx = pt1.x - pt0.x;
    var dy = pt1.y - pt0.y;
    for (var j = 0; j <= pointsPerVertex; j++) {
      var x = pt0.x + dx * j / pointsPerVertex;
      var y = pt0.y + dy * j / pointsPerVertex;
      waypoints.push({
        x: x,
        y: y
      });
    }
  }
  return (waypoints);
}

function animate(index: number, points: Point[], context: CanvasRenderingContext2D, callback: () => void) {
  if (index < points.length - 1) {
    requestAnimationFrame(() => animate(index, points, context, callback));
  } else {
    callback();
  }
  context.beginPath();
  context.moveTo(points[index - 1].x, points[index - 1].y);
  context.lineTo(points[index].x, points[index].y);
  context.stroke();
  index++;
}

function getDigits(puzzleBoxes: PuzzleBox[]): (number | null)[][] {
  let rows: (number | null)[][] = [];
  for (let rowIndex = 0; rowIndex < 9; rowIndex++) {
    let row: (number | null)[] = [];
    for (let colIndex = 0; colIndex < 9; colIndex++) {
      const detectedDigit = puzzleBoxes.find(pb => pb.y === rowIndex && pb.x == colIndex);
      row.push(detectedDigit?.contents || null);
    }
    rows.push(row);
  }
  return rows;
}

function DrawSudoku({ image, onReadyToSolve }: { image: string, onReadyToSolve: (boxes: (number | null)[][]) => void }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [puzzleBoxes, setPuzzleBoxes] = useState<PuzzleBox[]>([]);
  const [imageDims, setImageDims] = useState<{ w: number, h: number }>();
  const [sudokuFound, setSudokuFound] = useState(false);

  const processImage = useCallback(async () => {
    if (imageRef.current) {
      (await processor.processFrame(imageRef.current))!;
      if (processor.boxes) {
        setPuzzleBoxes(processor.boxes);
      }
    }
  }, [imageRef.current]);

  useEffect(() => {
    if (imageRef.current) {
      setImageDims({ w: imageRef.current!.width, h: imageRef.current!.height })
    }
  }, [imageRef.current]);


  useEffect(() => {
    const context = canvasRef?.current?.getContext('2d');
    if (context && imageDims) {

      context.putImageData(processor.thresholded!.toImageData(), 0, 0);

      context.strokeStyle = "rgba(0,200,0,0.5)";
      context.lineWidth = 3;
      if (processor.corners) {
        const points: Point[] = [];
        const {
          topLeft,
          topRight,
          bottomLeft,
          bottomRight,
        } = processor.corners;
        points.push(topLeft);
        points.push(topRight);
        points.push(bottomRight);
        points.push(bottomLeft);
        points.push(topLeft);

        window.requestAnimationFrame(() => animate(1, calculateCanvasPath(points), context, () => {
          if (puzzleBoxes.length > 0) {
            setSudokuFound(true);
            setTimeout(() => onReadyToSolve(getDigits(puzzleBoxes)), 1000);
          }
        }));
        if (processor.gridLines) {

          processor.gridLines.forEach((line) => {
            const points: Point[] = [];
            points.push(line.p1);
            points.push(line.p2);
            window.requestAnimationFrame(() => animate(1, calculateCanvasPath(points), context, () => { }));
          });
        }
      }
    }
  }, [puzzleBoxes, imageDims]);


  return <div className='flex-1 flex flex-col'>
    <div>{!sudokuFound ? 'Analysing image...' : 'Sudoku found'}</div>
    {image &&
      <div className='flex-1 flex items-center justify-center'>
        <div className={`relative flex items-center justify-center transition duration-1000 ${sudokuFound ? 'opacity-0' : ''}`}>
          <img
            ref={imageRef}
            src={image}
            onLoad={processImage} />
          {imageDims && <canvas
            height={imageDims!.h}
            width={imageDims!.w}
            ref={canvasRef}
            className={`absolute top-0 left-0`}></canvas>}
        </div>
      </div>
    }
  </div>;
}

export default DrawSudoku;