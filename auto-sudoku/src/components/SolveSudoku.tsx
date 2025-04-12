import { useCallback, useState } from "react";

function SolveSudoku({ existingDigits }: { existingDigits: (number | null)[][] }) {
  const [solvedDigits, setSolvedDigits] = useState<number[][] | null>(null);

  const solveSudoku = async () => {
    const body = JSON.stringify(existingDigits);
    const response = await fetch(import.meta.env.VITE_APP_SOLVE_ENDPOINT, { method: 'post', body: body });
    const result = await response.json() as number[][];
    setSolvedDigits(result);
  }

  const onSolveClicked = useCallback(() => {
    solveSudoku()
  }, [existingDigits])

  const rows: any[][] = [];
  for (let colIndex = 0; colIndex < 9; colIndex++) {
    const tds = [];
    for (let rowIndex = 0; rowIndex < 9; rowIndex++) {
      let digit = existingDigits[colIndex][rowIndex];
      let td = <></>;
      const classes = {
        solved: `border transition duration-500 border-white text-green-500 w-[42px] h-[42px] nth-[3n]:border-r-4`,
        empty: `border transition duration-500 opacity-0 w-[42px] h-[42px] nth-[3n]:border-r-4`,
        existing: `border w-[42px] h-[42px] nth-[3n]:border-r-4`,
      }
      if (!digit) {
        const delay = 25 * (rowIndex + colIndex);
        if (!!solvedDigits) {
          digit = solvedDigits[colIndex][rowIndex];
          td = <td style={{ transitionDelay: `${delay}ms` }} className={classes.solved} key={rowIndex}>{digit}</td>;
        } else {
          td = <td style={{ transitionDelay: `${delay}ms` }} className={classes.empty} key={rowIndex}></td>;
        }
      } else {
        td = <td className={classes.existing} key={rowIndex}>{digit}</td>;
      }
      tds.push(td);
    }
    rows.push(tds);
  }
  return <div className='flex-1 flex flex-col'>
    <div className="flex-1 flex items-center justify-center">
      <table className={`border border-t-4 border-l-4 transition duration-1000`}>
        <tbody>{rows.map((r, i) => <tr className='nth-[3n]:border-b-4' key={i}>{r}</tr>)}</tbody>
      </table>
    </div>
    <div>
      <button className={`w-100 transition duration-1000`} onClick={onSolveClicked}>Solve</button>
    </div>
  </div>;
}

export default SolveSudoku;