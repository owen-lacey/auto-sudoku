import { CpModel, CpSolver, CpSolverStatus, type IntVar } from 'cpsat-js';

let solverPromise: Promise<CpSolver> | null = null;
const getSolver = () => (solverPromise ??= CpSolver.create());

export async function solveSudoku(
  grid: (number | null)[][],
): Promise<number[][]> {
  const solver = await getSolver();
  const model = new CpModel('sudoku');

  const cells: IntVar[][] = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => {
      const given = grid[r][c];
      return given != null
        ? model.newConstant(given)
        : model.newIntVar(1, 9, `c_${r}_${c}`);
    }),
  );

  for (let i = 0; i < 9; i++) {
    model.addAllDifferent(cells[i]);
    model.addAllDifferent(cells.map((row) => row[i]));
  }
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const box: IntVar[] = [];
      for (let r = br * 3; r < br * 3 + 3; r++) {
        for (let c = bc * 3; c < bc * 3 + 3; c++) {
          box.push(cells[r][c]);
        }
      }
      model.addAllDifferent(box);
    }
  }

  const result = solver.solve(model);
  if (
    result.status !== CpSolverStatus.OPTIMAL &&
    result.status !== CpSolverStatus.FEASIBLE
  ) {
    throw new Error(`No solution (status=${CpSolverStatus[result.status]})`);
  }
  return cells.map((row) => row.map((v) => result.value(v)));
}
